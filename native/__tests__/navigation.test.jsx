import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { mockBackend, signedIn } from './helpers/backend';

const routes = {
  'GET /years': [200, { years: [] }],
  'GET /account': [200, { account: { username: 'admin' } }],
  'GET /transactions/date/2026-01-01': [200, { transactions: [], summary: {} }],
  'GET /years/2026/months': [200, { months: [] }],
};

test('a wrong password shows the API error on the login screen', async () => {
  await signedIn({ token: null });
  mockBackend({ ...routes, 'POST /login': [401, { error: 'Invalid username or password.' }] });
  await renderRouter('./app', { initialUrl: '/login' });
  await fireEvent.changeText(await screen.findByLabelText('Username or email'), 'admin');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'nope');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('Invalid username or password.')).toBeTruthy();
});

test('signing in without a picked date lands on setup', async () => {
  await signedIn({ token: null });
  mockBackend({ ...routes, 'POST /login': [200, { token: 'abc', username: 'admin' }] });
  const view = await renderRouter('./app', { initialUrl: '/login' });
  await fireEvent.changeText(await screen.findByLabelText('Username or email'), 'admin');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'secret');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(view.getPathname()).toBe('/setup'));
});

test('the tabs are not reachable until a date is picked', async () => {
  await signedIn({ selectedDate: '' });
  mockBackend(routes);
  const view = await renderRouter('./app', { initialUrl: '/dashboard' });
  await waitFor(() => expect(view.getPathname()).toBe('/setup'));
});

test('a signed-in user with a picked date skips the landing screen', async () => {
  await signedIn({ selectedDate: '2026-01-01' });
  mockBackend(routes);
  const view = await renderRouter('./app', { initialUrl: '/' });
  await waitFor(() => expect(view.getPathname()).toBe('/dashboard'));
});

test('signed-out users are sent to the landing screen', async () => {
  await signedIn({ token: null });
  mockBackend(routes);
  const view = await renderRouter('./app', { initialUrl: '/setup' });
  await waitFor(() => expect(view.getPathname()).toBe('/'));
});
