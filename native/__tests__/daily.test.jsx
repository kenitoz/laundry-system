import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { callsTo, mockBackend, signedIn } from './helpers/backend';

const kenito = { id: 3, customer_name: 'kenito', total_amount: 1000, amount_paid: 100, remaining_balance: 900, status: 'PARTIALLY PAID', transaction_time: '2:54 PM' };
const oops = { id: 7, customer_name: 'Accidental Entry', total_amount: 120, amount_paid: 0, remaining_balance: 120, status: 'UNPAID', transaction_time: '1:23 PM' };

async function openDaily(extra = {}, tx = [kenito, oops]) {
  let rows = tx;
  await signedIn({ selectedDate: '2026-01-01' });
  mockBackend({
    'GET /transactions/date/2026-01-01': () => [200, { transactions: rows, summary: {} }],
    'GET /years/2026/months': [200, { months: [] }],
    'DELETE /transactions/7': () => { rows = rows.filter((r) => r.id !== 7); return [200, { message: 'Transaction deleted.' }]; },
    ...extra,
  });
  await renderRouter('./app', { initialUrl: '/daily' });
}

test('rows are listed oldest first', async () => {
  await openDaily();
  await screen.findByText('kenito');
  const names = screen.getAllByLabelText(/^Magnify /).map((n) => n.props.accessibilityLabel);
  expect(names).toEqual(['Magnify Accidental Entry', 'Magnify kenito']);
});

test('deleting asks first, then removes the row once even on a double tap', async () => {
  await openDaily();
  await fireEvent.press(await screen.findByLabelText("Delete Accidental Entry's transaction"));
  expect(screen.getByText("Delete Accidental Entry's transaction?")).toBeTruthy();
  const confirm = screen.getByRole('button', { name: 'Delete' });
  await fireEvent.press(confirm);
  await fireEvent.press(confirm);
  await waitFor(() => expect(screen.queryByText('Accidental Entry')).toBeNull());
  expect(callsTo('DELETE /transactions/7')).toHaveLength(1);
  expect(screen.getByText('kenito')).toBeTruthy();
});

test('a failed delete keeps the dialog open with the error', async () => {
  await openDaily({ 'DELETE /transactions/7': [404, { error: 'Transaction not found.' }] });
  await fireEvent.press(await screen.findByLabelText("Delete Accidental Entry's transaction"));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
  expect(await screen.findByText('Transaction not found.')).toBeTruthy();
  expect(screen.getByText("Delete Accidental Entry's transaction?")).toBeTruthy();
});

test('an empty day shows the empty state', async () => {
  await openDaily({}, []);
  expect(await screen.findByText('No transactions recorded.')).toBeTruthy();
});
