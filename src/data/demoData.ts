/**
 * src/data/demoData.js
 *
 * ÚNICA fonte de dados fixos do projeto.
 * Nenhuma tela importa este arquivo diretamente — quem lê daqui são o
 * store (src/store/Orders) e os controllers (src/controller/*).
 *
 * Quando a API entrar no ar, basta trocar o corpo das funções do controller/store
 * por chamadas HTTP e apagar este arquivo.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const minutesAgo = (n) => Date.now() - n * MINUTE;
const hoursAgo = (n) => Date.now() - n * HOUR;
const daysAgo = (n) => Date.now() - n * DAY;

export const RESTAURANT = {
  name: 'Fogo & Fumaça',
  address: 'Rua das Churrasqueiras, 123 - Centro, Santo Ângelo - RS',
  phone: '(55) 99999-9999',
  hours: 'Terça a Domingo - 18h às 23h30',
  averagePrepMinutes: '30',
  delivery: true,
  takeaway: true,
  payments: { pix: true, cash: true, credit: true, debit: true },
  system: { sound: true, darkMode: false },
};

export const PRODUCTS = [
  { id: '1', name: 'Picanha na brasa', description: 'Carne bovina acompanhada de arroz, farofa e vinagrete.', category: 'Carnes', price: '54,90', active: true, highlight: true },
  { id: '2', name: 'Costela fogo lento', description: 'Macia, defumada por 8 horas com molho barbecue rústico.', category: 'Carnes', price: '48,00', active: true, highlight: false },
  { id: '3', name: 'Burger brasa', description: 'Pão brioche, blend de 180g, queijo prato e cebola caramelizada.', category: 'Lanches', price: '32,00', active: true, highlight: false },
  { id: '4', name: 'Burger duplo', description: 'Pão brioche, 2 blends de 150g, queijo prato e bacon.', category: 'Lanches', price: '36,00', active: false, highlight: false },
  { id: '5', name: 'Chopp artesanal 500ml', description: 'Chopp pilsen gelado da torneira.', category: 'Bebidas', price: '15,00', active: true, highlight: false },
  { id: '6', name: 'Pudim de leite', description: 'Pudim tradicional com calda de caramelo.', category: 'Sobremesas', price: '15,00', active: true, highlight: false },
];

export const CATEGORIES = [
  { id: 'c1', name: 'Entradas', description: 'Petiscos e porções para começar', active: true },
  { id: 'c2', name: 'Carnes', description: 'Cortes nobres e acompanhamentos', active: true },
  { id: 'c3', name: 'Lanches', description: 'Blends artesanais feitos na chapa', active: true },
  { id: 'c4', name: 'Bebidas', description: 'Sucos, refrigerantes e cervejas', active: true },
  { id: 'c5', name: 'Sobremesas', description: 'Doces, pudins e sorvetes', active: false },
];

export const TABLES = [
  { id: '1', number: '01', status: 'Livre', waiter: null },
  { id: '2', number: '02', status: 'Ocupada', waiter: 'Lucas Silva' },
  { id: '3', number: '03', status: 'Aguardando pagamento', waiter: 'Camila Santos' },
  { id: '4', number: '04', status: 'Reservada', waiter: null },
  { id: '6', number: '06', status: 'Ocupada', waiter: 'Lucas Silva' },
];

export const STAFF = [
  { id: '1', name: 'Juliano Grass', role: 'Administrador', cpf: '000.111.222-33', phone: '(55) 99999-9999', login: 'juliano.admin', active: true },
  { id: '2', name: 'Camila Santos', role: 'Gerente', cpf: '111.222.333-44', phone: '(55) 98888-8888', login: 'camila.ger', active: true },
  { id: '3', name: 'Lucas Silva', role: 'Garçom', cpf: '222.333.444-55', phone: '(55) 97777-7777', login: 'lucas.g', active: true },
  { id: '4', name: 'Augusto Lima', role: 'Cozinheiro', cpf: '333.444.555-66', phone: '(55) 96666-6666', login: 'augusto.c', active: true },
  { id: '5', name: 'Marina Souza', role: 'Caixa', cpf: '444.555.666-77', phone: '(55) 95555-5555', login: 'marina.cx', active: false },
];

/** Chamados abertos pelas mesas (botão de chamar garçom / pedir a conta). */
export const CALLS = [
  { id: 'ch1', table: '06', reason: 'Solicitou atendimento', createdAt: minutesAgo(1) },
  { id: 'ch2', table: '03', reason: 'Pediu a conta', createdAt: minutesAgo(4) },
];

/**
 * Pedidos. `itemList` guarda o dado real (nome, quantidade e preço unitário);
 * os textos e totais exibidos nas telas são calculados no store.
 */
export const ORDERS = [
  {
    id: '184', type: 'Local', customer: 'Mesa 06', table: '06', attendant: 'Lucas Silva', ownerId: 1, ownerEmail: 'lucas@gmail.com',
    payment: 'Pix', status: 'Recebido',
    itemList: [
      { name: 'Picanha na brasa', qty: 2, price: 54.9 },
      { name: 'Pão de alho', qty: 1, price: 12.0 },
    ],
    createdAt: minutesAgo(6),
  },
  {
    id: 'D-218', type: 'Delivery', customer: 'Marina Souza', table: null, attendant: 'Camila Santos',
    payment: 'Cartão de crédito', status: 'Recebido',
    itemList: [
      { name: 'Burger brasa', qty: 2, price: 32.0 },
      { name: 'Refrigerante', qty: 1, price: 8.0 },
    ],
    createdAt: minutesAgo(32),
  },
  {
    id: '187', type: 'Local', customer: 'Mesa 02', table: '02', attendant: 'Lucas Silva',
    payment: 'Dinheiro', status: 'Em preparo',
    itemList: [
      { name: 'Burger brasa', qty: 1, price: 32.0 },
      { name: 'Batata frita', qty: 1, price: 18.0 },
    ],
    createdAt: minutesAgo(11), startedAt: minutesAgo(5),
  },
  {
    id: 'D-217', type: 'Delivery', customer: 'Rafael Lima', table: null, attendant: 'Camila Santos',
    payment: 'Pix', status: 'Pronto',
    itemList: [
      { name: 'Costela fogo lento', qty: 1, price: 48.0 },
      { name: 'Arroz biro-biro', qty: 2, price: 16.0 },
    ],
    createdAt: minutesAgo(8), startedAt: minutesAgo(6), readyAt: minutesAgo(2),
  },
  {
    id: '183', type: 'Local', customer: 'Mesa 04', table: '04', attendant: 'Lucas Silva',
    payment: 'Cartão de débito', status: 'Entregue',
    itemList: [
      { name: 'Picanha na brasa', qty: 2, price: 54.9 },
      { name: 'Chopp artesanal 500ml', qty: 3, price: 15.0 },
    ],
    createdAt: hoursAgo(3), startedAt: hoursAgo(3), readyAt: hoursAgo(2), closedAt: hoursAgo(2),
  },
  {
    id: '182', type: 'Retirada', customer: 'Bruno Kessler', table: null, attendant: 'Marina Souza',
    payment: 'Pix', status: 'Entregue',
    itemList: [
      { name: 'Burger brasa', qty: 1, price: 32.0 },
      { name: 'Pudim de leite', qty: 1, price: 15.0 },
    ],
    createdAt: hoursAgo(5), startedAt: hoursAgo(5), readyAt: hoursAgo(4), closedAt: hoursAgo(4),
  },
  {
    id: '181', type: 'Local', customer: 'Mesa 01', table: '01', attendant: 'Camila Santos',
    payment: 'Pix', status: 'Cancelado',
    itemList: [{ name: 'Costela fogo lento', qty: 1, price: 48.0 }],
    createdAt: hoursAgo(6), closedAt: hoursAgo(6),
  },
  {
    id: '175', type: 'Delivery', customer: 'Ana Prestes', table: null, attendant: 'Camila Santos',
    payment: 'Cartão de crédito', status: 'Entregue',
    itemList: [
      { name: 'Costela fogo lento', qty: 2, price: 48.0 },
      { name: 'Refrigerante', qty: 2, price: 8.0 },
    ],
    createdAt: daysAgo(1), startedAt: daysAgo(1), readyAt: daysAgo(1), closedAt: daysAgo(1),
  },
  {
    id: '168', type: 'Local', customer: 'Mesa 03', table: '03', attendant: 'Lucas Silva',
    payment: 'Dinheiro', status: 'Entregue',
    itemList: [
      { name: 'Picanha na brasa', qty: 3, price: 54.9 },
      { name: 'Chopp artesanal 500ml', qty: 6, price: 15.0 },
      { name: 'Pudim de leite', qty: 1, price: 15.0 },
    ],
    createdAt: daysAgo(3), startedAt: daysAgo(3), readyAt: daysAgo(3), closedAt: daysAgo(3),
  },
  {
    id: '152', type: 'Retirada', customer: 'Diego Fontoura', table: null, attendant: 'Marina Souza',
    payment: 'Pix', status: 'Entregue',
    itemList: [{ name: 'Burger brasa', qty: 4, price: 32.0 }],
    createdAt: daysAgo(12), startedAt: daysAgo(12), readyAt: daysAgo(12), closedAt: daysAgo(12),
  },
];
export type DemoProduct = typeof PRODUCTS[number];
export type DemoCategory = typeof CATEGORIES[number];
export type DemoTable = typeof TABLES[number];
export type DemoStaff = typeof STAFF[number];
