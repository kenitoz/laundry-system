import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { act, render } from '@testing-library/react-native';

import { api, onUnauthorized } from '../src/api';
import { SessionProvider, useSession } from '../src/session';

let session;
function Probe() {
  session = useSession();
  return null;
}
const mount = () => render(<SessionProvider><Probe /></SessionProvider>);

beforeEach(async () => {
  SecureStore.__store.clear();
  await AsyncStorage.clear();
  global.fetch = jest.fn();
});

test('restores the stored session', async () => {
  SecureStore.__store.set('token', 'saved');
  await AsyncStorage.multiSet([['username', 'admin'], ['selectedDate', '2026-01-01']]);
  await mount();
  expect(session.ready).toBe(true);
  expect(session.token).toBe('saved');
  expect(session.username).toBe('admin');
  expect(session.selectedDate).toBe('2026-01-01');
});

test('signIn stores the token and clears the selected date', async () => {
  await AsyncStorage.setItem('selectedDate', '2026-01-01');
  await mount();
  await act(() => session.signIn('t9', 'admin'));
  expect(SecureStore.__store.get('token')).toBe('t9');
  expect(session.selectedDate).toBe('');
  expect(await AsyncStorage.getItem('selectedDate')).toBeNull();
  await act(() => session.selectDate('2026-03-02'));
  expect(await AsyncStorage.getItem('selectedDate')).toBe('2026-03-02');
});

test('signOut clears all stored keys', async () => {
  await mount();
  await act(() => session.signIn('t9', 'admin'));
  await act(() => session.selectDate('2026-03-02'));
  await act(() => session.signOut());
  expect(SecureStore.__store.has('token')).toBe(false);
  expect(await AsyncStorage.getItem('username')).toBeNull();
  expect(await AsyncStorage.getItem('selectedDate')).toBeNull();
  expect(session.token).toBeNull();
});

test('two parallel 401s sign out once cleanly', async () => {
  await mount();
  await act(() => session.signIn('t9', 'admin'));
  onUnauthorized(() => session.signOut());
  fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
  await act(async () => {
    await Promise.allSettled([api('/years'), api('/dashboard')]);
  });
  expect(session.token).toBeNull();
  expect(SecureStore.__store.has('token')).toBe(false);
  // The next request carries no stale token.
  fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  await api('/health');
  expect(fetch.mock.calls.at(-1)[1].headers.Authorization).toBeUndefined();
});
