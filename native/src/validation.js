import { money } from './format';

// Android number pads may type a comma as the decimal point.
export function parseAmount(raw) {
  const text = String(raw ?? '').trim().replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(text)) return NaN;
  return Number(text);
}

export function validateYear(value) {
  const y = Number(value);
  return y >= 2000 && y <= 2100 ? '' : 'Year must be between 2000 and 2100.';
}

export const validateMonth = (value) => (Number(value) ? '' : 'Select a month first.');

export function validateTransaction({ name, total, paid }) {
  const t = parseAmount(total), p = parseAmount(paid);
  if (!String(name ?? '').trim()) return 'Customer name is required.';
  if (!(t >= 0.01)) return 'Total amount must be at least ₱0.01.';
  if (!(p >= 0)) return 'Amount paid is required.';
  if (p > t) return 'Amount paid cannot exceed the total amount.';
  return '';
}

export function paymentState(raw, remaining) {
  const amount = parseAmount(raw);
  const valid = Number.isFinite(amount);
  const error = valid && amount > remaining ? `Payment amount cannot exceed remaining balance of ${money(remaining)}.` : '';
  return {
    amount,
    remainingAfter: Math.max(0, remaining - (valid ? amount : 0)),
    error,
    canRecord: valid && amount > 0 && !error,
  };
}

export function validateCredentials({ newUsername, currentPassword, newPassword, confirmPassword }) {
  const uReq = !!newUsername.trim(), pReq = !!(newPassword || confirmPassword);
  if (!uReq && !pReq) return 'Enter a new username or complete the password fields before saving.';
  if (uReq && !/^[A-Za-z0-9_]{3,32}$/.test(newUsername.trim())) return 'Username must be 3-32 characters using only letters, numbers, or underscores.';
  if (!currentPassword) return 'Enter your current password to change account credentials.';
  if (pReq && (!newPassword || !confirmPassword)) return 'Complete all password fields before saving.';
  if (pReq && newPassword !== confirmPassword) return 'New passwords do not match.';
  return '';
}
