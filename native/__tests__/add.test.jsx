import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { callsTo, mockBackend, signedIn } from './helpers/backend';

const base = {
  'GET /transactions/date/2026-01-05': [200, { transactions: [], summary: {} }],
  'GET /years/2026/months': [200, { months: [] }],
  'POST /transactions': [201, { message: 'Transaction saved.' }],
};

async function openAdd(routes = base) {
  await signedIn({ selectedDate: '2026-01-05' });
  mockBackend(routes);
  await renderRouter('./app', { initialUrl: '/add' });
  await screen.findByLabelText('Customer name');
}

async function fill(name, total, paid) {
  await fireEvent.changeText(screen.getByLabelText('Customer name'), name);
  await fireEvent.changeText(screen.getByLabelText('Total amount'), total);
  await fireEvent.changeText(screen.getByLabelText('Amount paid'), paid);
}
const submit = () => fireEvent.press(screen.getByRole('button', { name: '✓ Add Customer' }));

test('a blank name is rejected without calling the API', async () => {
  await openAdd();
  await fill('', '100', '0');
  await submit();
  expect(screen.getByText('Customer name is required.')).toBeTruthy();
  expect(callsTo('POST /transactions')).toHaveLength(0);
});

test('paid above total is rejected', async () => {
  await openAdd();
  await fill('Ana', '250', '300');
  await submit();
  expect(screen.getByText('Amount paid cannot exceed the total amount.')).toBeTruthy();
});

test('a comma decimal is sent as a number', async () => {
  await openAdd();
  await fill('Ana', '250,5', '0');
  await submit();
  await waitFor(() => expect(callsTo('POST /transactions')).toHaveLength(1));
  expect(JSON.parse(callsTo('POST /transactions')[0][1].body)).toEqual({
    customer_name: 'Ana', total_amount: 250.5, amount_paid: 0, transaction_date: '2026-01-05',
  });
});

test('a double tap saves once', async () => {
  let release;
  await openAdd({ ...base, 'POST /transactions': () => new Promise((r) => { release = () => r([201, {}]); }) });
  await fill('Ana', '100', '100');
  await submit();
  await submit();
  release();
  await waitFor(() => expect(screen.getByLabelText('Customer name').props.value).toBe(''));
  expect(callsTo('POST /transactions')).toHaveLength(1);
});

test('the success message appears after the save animation', async () => {
  await openAdd();
  await fill('Ana', '100', '100');
  await submit();
  expect(await screen.findByText('Transaction saved to the selected date.', {}, { timeout: 4000 })).toBeTruthy();
});

test('returning to the dashboard shows the new customer', async () => {
  let saved = false;
  const row = { id: 9, customer_name: 'Ana', total_amount: 100, amount_paid: 100, remaining_balance: 0, status: 'PAID', transaction_time: '9:00 AM' };
  await signedIn({ selectedDate: '2026-01-05' });
  mockBackend({
    ...base,
    'GET /transactions/date/2026-01-05': () => [200, { transactions: saved ? [row] : [], summary: {} }],
    'POST /transactions': () => { saved = true; return [201, {}]; },
  });
  await renderRouter('./app', { initialUrl: '/dashboard' });
  await screen.findAllByText('No customers in this view right now.');
  await fireEvent.press(screen.getByRole('button', { name: /Add Customer/ }));
  await fill('Ana', '100', '100');
  await submit();
  await waitFor(() => expect(saved).toBe(true));
  await fireEvent.press(screen.getByRole('button', { name: /Dashboard/ }));
  expect(await screen.findByText('Ana')).toBeTruthy();
});
