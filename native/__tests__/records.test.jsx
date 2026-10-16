import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { callsTo, mockBackend, signedIn } from './helpers/backend';

const months2026 = [200, { months: [{ id: 1, month_number: 1, total_earnings: 1100, transaction_count: 2 }] }];
const calendar = [200, { year: 2026, month: 1, name: 'January', days: { 5: { total_paid: 1200, count: 3 } } }];
const base = {
  'GET /years': [200, { years: [{ year: 2025 }, { year: 2026 }] }],
  'GET /years/2026/months': months2026,
  'GET /months/1/calendar': calendar,
  'GET /transactions/date/2026-01-05': [200, { transactions: [], summary: {} }],
};

test('setup lists years newest first', async () => {
  await signedIn();
  mockBackend(base);
  await renderRouter('./app', { initialUrl: '/setup' });
  await screen.findByText('2026');
  const years = screen.getAllByText(/^20\d\d$/).map((n) => n.props.children);
  expect(years).toEqual(['2026', '2025']);
});

test('an out-of-range year is rejected without calling the API', async () => {
  await signedIn();
  mockBackend(base);
  await renderRouter('./app', { initialUrl: '/setup' });
  const input = await screen.findByLabelText('Year');
  await fireEvent.changeText(input, '1999');
  await fireEvent.press(screen.getByRole('button', { name: 'Add year' }));
  expect(screen.getByText('Year must be between 2000 and 2100.')).toBeTruthy();
  expect(callsTo('POST /years')).toHaveLength(0);
});

test('a duplicate year shows the API message', async () => {
  await signedIn();
  mockBackend({ ...base, 'POST /years': [409, { error: 'That year already exists.' }] });
  await renderRouter('./app', { initialUrl: '/setup' });
  await fireEvent.changeText(await screen.findByLabelText('Year'), '2026');
  await fireEvent.press(screen.getByRole('button', { name: 'Add year' }));
  expect(await screen.findByText('That year already exists.')).toBeTruthy();
});

test('tapping a calendar day picks it and opens the dashboard', async () => {
  await signedIn();
  mockBackend(base);
  const view = await renderRouter('./app', { initialUrl: '/month/1?year=2026' });
  expect(await screen.findByText('₱1.2k')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('January 5, 2026'));
  await waitFor(() => expect(view.getPathname()).toBe('/dashboard'));
  expect(await AsyncStorage.getItem('selectedDate')).toBe('2026-01-05');
});

test('month delete buttons are hidden once a date is picked', async () => {
  await signedIn({ selectedDate: '' });
  mockBackend(base);
  const view = await renderRouter('./app', { initialUrl: '/year/2026' });
  expect(await screen.findByLabelText('Delete January 2026')).toBeTruthy();
  await view.unmount();

  await signedIn({ selectedDate: '2026-01-05' });
  await renderRouter('./app', { initialUrl: '/year/2026' });
  await screen.findByText('January 2026');
  expect(screen.queryByLabelText('Delete January 2026')).toBeNull();
});
