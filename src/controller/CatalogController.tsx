/**
 * src/controller/CatalogController.js
 *
 * Concentra os dados e as regras do cardápio, das mesas, da equipe e das
 * configurações do restaurante. As telas não guardam mais listas fixas —
 * consomem `useCatalog()` — e toda escrita (criar, editar, excluir) passa
 * pela camada de API antes de atualizar o estado local.
 *
 * Padrão de cada ação: chama a API primeiro; só atualiza o estado (e some
 * com o loading) se a chamada der certo. Se falhar, mostra um Alert e o
 * estado local não muda — assim a tela nunca fica "desincronizada" do que
 * foi realmente salvo.
 */
import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { Alert } from '../utils/alert';
import { PRODUCTS, CATEGORIES, TABLES, STAFF, RESTAURANT } from '../data/demoData';
import { productsApi, categoriesApi, tablesApi, staffApi, settingsApi } from '../services/api';
import { isValidPrice, isValidPhone, isValidCpf, isTableNumberTaken } from '../utils/validators';

const CatalogContext = createContext(null);

const clone = (list) => list.map(item => ({ ...item }));

const loadProducts = () => clone(PRODUCTS);
const loadCategories = () => clone(CATEGORIES);
const loadTables = () => clone(TABLES);
const loadStaff = () => clone(STAFF);
const loadSettings = () => ({ ...RESTAURANT, payments: { ...RESTAURANT.payments }, system: { ...RESTAURANT.system } });

export const TABLE_STATUS = ['Livre', 'Ocupada', 'Aguardando pagamento', 'Reservada'];
export const STAFF_ROLES = ['Administrador', 'Gerente', 'Garçom', 'Cozinheiro', 'Caixa'];

const reportApiError = (action, error) =>
  Alert.alert('Não foi possível salvar', error?.message || `Falha ao ${action}. Tente novamente.`);

/* ==========================================
   MONTAGEM DE REGISTROS A PARTIR DO FORMULÁRIO
========================================== */
export const buildProduct = (form, id) => ({
  id: id || String(Date.now()),
  name: form.name.trim(),
  description: form.description.trim() || 'Produto do cardápio',
  category: form.category,
  price: form.price,
  image: form.image || null,
  active: true,
  highlight: false,
});

export const buildCategory = (form, id) => ({
  id: id || `c${Date.now()}`,
  name: form.name.trim(),
  description: form.description.trim() || 'Nova categoria do cardápio',
  active: true,
});

export const buildTable = (form, id) => ({
  id: id || String(Date.now()),
  number: form.number.trim(),
  status: 'Livre',
  waiter: null,
});

export const buildStaff = (form, id) => ({
  id: id || String(Date.now()),
  name: form.name.trim(),
  role: form.role,
  cpf: form.cpf?.trim() || 'Não informado',
  phone: form.phone?.trim() || 'Não informado',
  login: form.name.trim().toLowerCase().replace(/\s+/g, '.'),
  active: true,
});

/* ==========================================
   VALIDAÇÃO DE FORMULÁRIO (usada pelo saveForm da tela)
========================================== */
export function validateCatalogForm(type, form, context) {
  if (type === 'product') {
    if (!form.name.trim() || !form.price.trim()) {
      return 'Informe nome e preço do produto.';
    }
    if (!isValidPrice(form.price)) {
      return 'Informe um preço válido, por exemplo 32,90.';
    }
  }
  if (type === 'category' && !form.name.trim()) {
    return 'Informe o nome da categoria.';
  }
  if (type === 'table') {
    if (!form.number.trim()) return 'Informe o número da mesa.';
    if (isTableNumberTaken(context.tables, form.number, context.editingId)) {
      return `Já existe uma mesa número ${form.number.trim()}.`;
    }
  }
  if (type === 'staff') {
    if (!form.name.trim()) return 'Informe o nome do funcionário.';
    if (form.phone?.trim() && !isValidPhone(form.phone)) {
      return 'Informe um telefone válido, no formato (00) 00000-0000.';
    }
    if (form.cpf?.trim() && !isValidCpf(form.cpf)) {
      return 'Informe um CPF válido.';
    }
  }
  return null;
}

/* ==========================================
   PROVIDER
========================================== */
export const CatalogProvider = ({ children }) => {
  const [products, setProducts] = useState(loadProducts);
  const [rawCategories, setCategories] = useState(loadCategories);
  const [tables, setTables] = useState(loadTables);
  const [staff, setStaff] = useState(loadStaff);
  const [settings, setSettings] = useState(loadSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([productsApi.list(), categoriesApi.list(), tablesApi.list(), staffApi.list(), settingsApi.get()])
      .then(([loadedProducts, loadedCategories, loadedTables, loadedStaff, loadedSettings]) => {
        if (!mounted) return;
        if (Array.isArray(loadedProducts)) setProducts(loadedProducts);
        if (Array.isArray(loadedCategories)) setCategories(loadedCategories);
        if (Array.isArray(loadedTables)) setTables(loadedTables);
        if (Array.isArray(loadedStaff)) setStaff(loadedStaff);
        if (loadedSettings) setSettings(loadedSettings);
      })
      .catch(error => reportApiError('carregar os dados', error));
    return () => { mounted = false; };
  }, []);

  // A contagem de itens por categoria é calculada, não digitada.
  const categories = useMemo(
    () =>
      rawCategories.map(category => ({
        ...category,
        count: products.filter(product => product.category === category.name).length,
      })),
    [rawCategories, products],
  );

  const activeProducts = useMemo(() => products.filter(product => product.active), [products]);
  const activeStaff = useMemo(() => staff.filter(person => person.active), [staff]);

  /* ---------- Produtos ---------- */
  const createProduct = useCallback(async (item) => {
    try {
      const saved = await productsApi.create(item);
      setProducts(current => [...current, saved || item]);
      return true;
    } catch (error) {
      reportApiError('criar o produto', error);
      return false;
    }
  }, []);

  const updateProduct = useCallback(async (id, patch) => {
    try {
      await productsApi.update(id, patch);
      setProducts(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
      return true;
    } catch (error) {
      reportApiError('atualizar o produto', error);
      return false;
    }
  }, []);

  const deleteProduct = useCallback(async (id) => {
    try {
      await productsApi.remove(id);
      setProducts(current => current.filter(item => item.id !== id));
      return true;
    } catch (error) {
      reportApiError('excluir o produto', error);
      return false;
    }
  }, []);

  /* ---------- Categorias ---------- */
  const createCategory = useCallback(async (item) => {
    try {
      const saved = await categoriesApi.create(item);
      setCategories(current => [...current, saved || item]);
      return true;
    } catch (error) {
      reportApiError('criar a categoria', error);
      return false;
    }
  }, []);

  const updateCategory = useCallback(async (id, patch) => {
    try {
      await categoriesApi.update(id, patch);
      setCategories(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
      return true;
    } catch (error) {
      reportApiError('atualizar a categoria', error);
      return false;
    }
  }, []);

  const deleteCategory = useCallback(async (id) => {
    try {
      await categoriesApi.remove(id);
      setCategories(current => current.filter(item => item.id !== id));
      return true;
    } catch (error) {
      reportApiError('excluir a categoria', error);
      return false;
    }
  }, []);

  /* ---------- Mesas ---------- */
  const createTable = useCallback(async (item) => {
    try {
      const saved = await tablesApi.create(item);
      setTables(current => [...current, saved || item]);
      return true;
    } catch (error) {
      reportApiError('criar a mesa', error);
      return false;
    }
  }, []);

  const updateTable = useCallback(async (id, patch) => {
    try {
      await tablesApi.update(id, patch);
      setTables(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
      return true;
    } catch (error) {
      reportApiError('atualizar a mesa', error);
      return false;
    }
  }, []);

  const deleteTable = useCallback(async (id) => {
    try {
      await tablesApi.remove(id);
      setTables(current => current.filter(item => item.id !== id));
      return true;
    } catch (error) {
      reportApiError('excluir a mesa', error);
      return false;
    }
  }, []);

  /* ---------- Equipe ---------- */
  const createStaff = useCallback(async (item) => {
    try {
      const saved = await staffApi.create(item);
      setStaff(current => [...current, saved || item]);
      return true;
    } catch (error) {
      reportApiError('cadastrar o funcionário', error);
      return false;
    }
  }, []);

  const updateStaff = useCallback(async (id, patch) => {
    try {
      await staffApi.update(id, patch);
      setStaff(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
      return true;
    } catch (error) {
      reportApiError('atualizar o funcionário', error);
      return false;
    }
  }, []);

  const deleteStaff = useCallback(async (id) => {
    try {
      await staffApi.remove(id);
      setStaff(current => current.filter(item => item.id !== id));
      return true;
    } catch (error) {
      reportApiError('excluir o funcionário', error);
      return false;
    }
  }, []);

  /* ---------- Configurações ---------- */
  const saveSettings = useCallback(async (next) => {
    setSavingSettings(true);
    try {
      await settingsApi.update(next);
      setSettings(next);
      Alert.alert('Configurações salvas', 'As alterações foram aplicadas com sucesso.');
      return true;
    } catch (error) {
      reportApiError('salvar as configurações', error);
      return false;
    } finally {
      setSavingSettings(false);
    }
  }, []);

  const value = {
    products,
    activeProducts,
    setProducts,
    createProduct,
    updateProduct,
    deleteProduct,

    categories,
    setCategories,
    createCategory,
    updateCategory,
    deleteCategory,

    tables,
    setTables,
    createTable,
    updateTable,
    deleteTable,

    staff,
    activeStaff,
    setStaff,
    createStaff,
    updateStaff,
    deleteStaff,

    settings,
    setSettings,
    saveSettings,
    savingSettings,
    updateSetting: (key, newValue) => setSettings(current => ({ ...current, [key]: newValue })),
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog precisa estar dentro de <CatalogProvider>.');
  }
  return context;
};
