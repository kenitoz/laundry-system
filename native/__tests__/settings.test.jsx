import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { callsTo, mockBackend, signedIn } from './helpers/backend';

const routes = (extra = {}) => ({
  'GET /account': [200, { account: { username: 'admin' } }],
  'GET /years/2026/months': [200, { months: [] }],
  'GET /transactions/date/2026-03-02': [200, { transactions: [], summary: {} }],
  'GET /years': [200, { years: [{ year: 2026 }] }],
  ...extra,
});

async function openSettings(extra) {
  await signedIn({ selectedDate: '2026-03-02' });
  mockBackend(routes(extra));
  const view = await renderRouter('./app', { initialUrl: '/settings' });
  await screen.findByDisplayValue('admin');
  return view;
}
const type = (label, value) => fireEvent.changeText(screen.getByLabelText(label), value);
const save = () => fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

test('mismatched new passwords are caught before saving', async () => {
  await openSettings();
  await type('Current password', 'x');
  await type('New password', 'a');
  await type('Confirm new password', 'b');
  await save();
  expect(screen.getByText('New passwords do not match.')).toBeTruthy();
  expect(callsTo('PUT /account')).toHaveLength(0);
});

test('a confirmed credential change saves once and signs out', async () => {
  const view = await openSettings({ 'PUT /account': [200, { username: 'shop_admin' }] });
  await type('New username', 'shop_admin');
  await type('Current password', 'pw');
  await save();
  await fireEvent.press(screen.getByRole('button', { name: 'Yes, Save Changes' }));
  await waitFor(() => expect(view.getPathname()).toBe('/'));
  expect(callsTo('PUT /account')).toHaveLength(1);
  expect(JSON.parse(callsTo('PUT /account')[0][1].body)).toEqual({ new_username: 'shop_admin', current_password: 'pw', new_password: '', confirm_password: '' });
});

test('a wrong current password is shown as an alert', async () => {
  await openSettings({ 'PUT /account': [400, { error: 'Current password is incorrect.' }] });
  await type('New username', 'shop_admin');
  await type('Current password', 'bad');
  await save();
  await fireEvent.press(screen.getByRole('button', { name: 'Yes, Save Changes' }));
  expect(await screen.findByText('Current password is incorrect.')).toBeTruthy();
});

test('change date falls back to the year when its month is gone', async () => {
  const view = await openSettings();
  await fireEvent.press(screen.getByLabelText('Change year, month, date, or sign out'));
  expect(await screen.findByText('Pick a month first')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /^Change date\./ }));
  await waitFor(() => expect(view.getPathname()).toBe('/year/2026'));
});

test('change year clears the picked date', async () => {
  const view = await openSettings();
  await fireEvent.press(screen.getByLabelText('Change year, month, date, or sign out'));
  await fireEvent.press(await screen.findByRole('button', { name: /^Change year\./ }));
  await waitFor(() => expect(view.getPathname()).toBe('/setup'));
});

test('sign out asks first, then returns to the start', async () => {
  const view = await openSettings();
  await fireEvent.press(screen.getByLabelText('Change year, month, date, or sign out'));
  await fireEvent.press(await screen.findByRole('button', { name: /^Sign out\./ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Yes, Sign Out' }));
  await waitFor(() => expect(view.getPathname()).toBe('/'));
});
