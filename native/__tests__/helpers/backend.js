import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Fake API: map "METHOD /path" to a [status, body] reply or a function returning one.
export function mockBackend(routes) {
  global.fetch = jest.fn(async (url, opts = {}) => {
    const path = url.replace(process.env.EXPO_PUBLIC_API_URL, '');
    const key = `${opts.method || 'GET'} ${path}`;
    let reply = routes[key];
    if (typeof reply === 'function') reply = await reply(opts.body ? JSON.parse(opts.body) : undefined);
    const [status, body] = reply || [404, { error: `No mock for ${key}` }];
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  });
  return global.fetch;
}

export const callsTo = (key) => global.fetch.mock.calls.filter(([url, opts = {}]) =>
  `${opts.method || 'GET'} ${url.replace(process.env.EXPO_PUBLIC_API_URL, '')}` === key);

export async function signedIn({ token = 't', username = 'admin', selectedDate = '' } = {}) {
  SecureStore.__store.clear();
  await AsyncStorage.clear();
  if (token) SecureStore.__store.set('token', token);
  await AsyncStorage.setItem('username', username);
  if (selectedDate) await AsyncStorage.setItem('selectedDate', selectedDate);
}
