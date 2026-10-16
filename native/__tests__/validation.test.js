import {
  parseAmount, paymentState, validateCredentials, validateMonth, validateTransaction, validateYear,
} from '../src/validation';

test('parseAmount reads phone keyboard input', () => {
  expect(parseAmount('50,5')).toBe(50.5);
  expect(parseAmount(' 12 ')).toBe(12);
  expect(parseAmount('')).toBeNaN();
  expect(parseAmount('.')).toBeNaN();
  expect(parseAmount('abc')).toBeNaN();
});

test('validateTransaction returns the web messages in order', () => {
  expect(validateTransaction({ name: '  ', total: '10', paid: '0' })).toBe('Customer name is required.');
  expect(validateTransaction({ name: 'Ana', total: '0', paid: '0' })).toBe('Total amount must be at least ₱0.01.');
  expect(validateTransaction({ name: 'Ana', total: 'abc', paid: '0' })).toBe('Total amount must be at least ₱0.01.');
  expect(validateTransaction({ name: 'Ana', total: '10', paid: '' })).toBe('Amount paid is required.');
  expect(validateTransaction({ name: 'Ana', total: '10', paid: 'abc' })).toBe('Amount paid is required.');
  expect(validateTransaction({ name: 'Ana', total: '250', paid: '300' })).toBe('Amount paid cannot exceed the total amount.');
  expect(validateTransaction({ name: 'Ana', total: '250,5', paid: '0' })).toBe('');
});

test('year and month validation', () => {
  expect(validateYear('1999')).toBe('Year must be between 2000 and 2100.');
  expect(validateYear('2026')).toBe('');
  expect(validateMonth('')).toBe('Select a month first.');
  expect(validateMonth('3')).toBe('');
});

test('paymentState never yields NaN and blocks overpayment', () => {
  expect(paymentState('', 100)).toEqual({ amount: NaN, remainingAfter: 100, error: '', canRecord: false });
  const over = paymentState('150', 100);
  expect(over.error).toBe('Payment amount cannot exceed remaining balance of ₱100.00.');
  expect(over.canRecord).toBe(false);
  expect(paymentState('50,5', 100)).toMatchObject({ canRecord: true, remainingAfter: 49.5, error: '' });
  expect(paymentState('abc', 100)).toMatchObject({ canRecord: false, remainingAfter: 100 });
  expect(paymentState('0', 100).canRecord).toBe(false);
});

test('validateCredentials matches the web settings rules', () => {
  const base = { newUsername: '', currentPassword: '', newPassword: '', confirmPassword: '' };
  expect(validateCredentials(base)).toBe('Enter a new username or complete the password fields before saving.');
  expect(validateCredentials({ ...base, newUsername: 'a!' })).toBe('Username must be 3-32 characters using only letters, numbers, or underscores.');
  expect(validateCredentials({ ...base, newUsername: 'shop_admin' })).toBe('Enter your current password to change account credentials.');
  expect(validateCredentials({ ...base, currentPassword: 'x', newPassword: 'a' })).toBe('Complete all password fields before saving.');
  expect(validateCredentials({ ...base, currentPassword: 'x', newPassword: 'a', confirmPassword: 'b' })).toBe('New passwords do not match.');
  expect(validateCredentials({ ...base, currentPassword: 'x', newPassword: 'a', confirmPassword: 'a' })).toBe('');
});
