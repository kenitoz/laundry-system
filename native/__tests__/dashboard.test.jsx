import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { callsTo, mockBackend, signedIn } from './helpers/backend';

const day = (transactions) => [200, { transactions, summary: {} }];
// The API returns newest first.
const ana = { id: 1, customer_name: 'Ana', total_amount: 1000, amount_paid: 100, remaining_balance: 900, status: 'PARTIALLY PAID', transaction_time: '2:54 PM' };
const ben = { id: 2, customer_name: 'Ben', total_amount: 200, amount_paid: 200, remaining_balance: 0, status: 'PAID', transaction_time: '1:10 PM' };
const routes = (tx = [ana, ben], extra = {}) => ({
  'GET /transactions/date/2026-01-05': day(tx),
  'GET /years/2026/months': [200, { months: [] }],
  ...extra,
});

async function openDashboard(r) {
  await signedIn({ selectedDate: '2026-01-05' });
  mockBackend(r);
  await renderRouter('./app', { initialUrl: '/dashboard' });
  await screen.findByText('₱1,200.00');
}

const openUnpaid = () => fireEvent.press(screen.getByLabelText('Unpaid Customers'));

test('stat cards total the day', async () => {
  await openDashboard(routes());
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByText('₱300.00')).toBeTruthy();
  expect(screen.getAllByText('₱900.00').length).toBeGreaterThan(0);
});

test('tapping Total unpaid switches to the unpaid list', async () => {
  await openDashboard(routes());
  await fireEvent.press(screen.getByLabelText("Show Unpaid Customers"));
  expect(screen.getByLabelText('Unpaid Customers').props.accessibilityState.selected).toBe(true);
});

test('overpaying shows the limit and disables Record payment', async () => {
  await openDashboard(routes());
  await openUnpaid();
  await fireEvent.changeText(screen.getByLabelText('Amount paid for Ana'), '950');
  expect(screen.getByText('Payment amount cannot exceed remaining balance of ₱900.00.')).toBeTruthy();
  expect(screen.getByLabelText('Record payment for Ana').props.accessibilityState.disabled).toBe(true);
});

test('a double tap on Record payment sends one payment', async () => {
  let release;
  const patch = () => new Promise((resolve) => { release = () => resolve([200, { message: 'Transaction updated.' }]); });
  await openDashboard(routes([ana, ben], { 'PATCH /transactions/1': patch }));
  await openUnpaid();
  await fireEvent.changeText(screen.getByLabelText('Amount paid for Ana'), '50');
  const button = screen.getByLabelText('Record payment for Ana');
  await fireEvent.press(button);
  await fireEvent.press(button); // second tap while the first request is still pending
  release();
  await waitFor(() => expect(screen.getByLabelText('Amount paid for Ana').props.value).toBe('0'));
  expect(callsTo('PATCH /transactions/1')).toHaveLength(1);
  expect(JSON.parse(callsTo('PATCH /transactions/1')[0][1].body)).toEqual({ status: 'PARTIALLY PAID', amount_paid: 150 });
});

test('non-numeric input keeps the balance and the button disabled', async () => {
  await openDashboard(routes());
  await openUnpaid();
  await fireEvent.changeText(screen.getByLabelText('Amount paid for Ana'), 'abc');
  expect(screen.getByLabelText('Remaining for Ana').props.children).toBe('₱900.00');
  expect(screen.getByLabelText('Record payment for Ana').props.accessibilityState.disabled).toBe(true);
});

test('an empty day shows the empty state', async () => {
  await signedIn({ selectedDate: '2026-01-05' });
  mockBackend(routes([]));
  await renderRouter('./app', { initialUrl: '/dashboard' });
  expect(await screen.findByText('No customers in this view right now.')).toBeTruthy();
});
