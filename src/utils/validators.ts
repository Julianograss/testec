/**
 * src/utils/validators.js
 *
 * Validação e máscara de preço, telefone e CPF, usadas nos formulários
 * do admin (produto, equipe). Mantidas fora do componente para poderem
 * ser testadas isoladamente e reaproveitadas noutras telas.
 */

/* ==========================================
   PREÇO
========================================== */
// Mantém apenas dígitos e uma vírgula decimal enquanto o usuário digita.
export const sanitizePriceInput = (value) => {
  const cleaned = value.replace(/[^0-9,]/g, '');
  const [intPart, ...rest] = cleaned.split(',');
  return rest.length ? `${intPart},${rest.join('').slice(0, 2)}` : intPart;
};

export const parsePrice = (value) => Number(String(value).replace(/\./g, '').replace(',', '.')) || 0;

export const isValidPrice = (value) => {
  const trimmed = String(value).trim();
  return /^\d+(,\d{1,2})?$/.test(trimmed) && parsePrice(trimmed) > 0;
};

/* ==========================================
   TELEFONE — (00) 00000-0000 ou (00) 0000-0000
========================================== */
export const formatPhoneInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const isValidPhone = (value) => {
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
};

/* ==========================================
   CPF — 000.000.000-00, com dígito verificador
========================================== */
export const formatCpfInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const cpfCheckDigit = (base) => {
  let sum = 0;
  let weight = base.length + 1;
  for (const digit of base) {
    sum += Number(digit) * weight;
    weight -= 1;
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
};

export const isValidCpf = (value) => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false; // rejeita 000.000.000-00 etc.
  const firstCheck = cpfCheckDigit(digits.slice(0, 9));
  const secondCheck = cpfCheckDigit(digits.slice(0, 9) + firstCheck);
  return digits === digits.slice(0, 9) + String(firstCheck) + String(secondCheck);
};

/* ==========================================
   MESAS
========================================== */
export const isTableNumberTaken = (tables, number, excludeId) =>
  tables.some(table => table.number.trim() === number.trim() && table.id !== excludeId);