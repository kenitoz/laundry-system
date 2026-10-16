import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { setAuthToken } from './api';

const SessionContext = createContext(null);
const EMPTY = { token: null, username: '', selectedDate: '' };

export function SessionProvider({ children }) {
  const [state, setState] = useState({ ...EMPTY, ready: false });

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      const [[, username], [, selectedDate]] = await AsyncStorage.multiGet(['username', 'selectedDate']);
      setAuthToken(token);
      if (active) setState({ ready: true, token, username: username || '', selectedDate: (token && selectedDate) || '' });
    })();
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (token, username) => {
    setAuthToken(token);
    await SecureStore.setItemAsync('token', token);
    await AsyncStorage.setItem('username', username);
    await AsyncStorage.removeItem('selectedDate');
    setState((s) => ({ ...s, token, username, selectedDate: '' }));
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setState((s) => ({ ...s, ...EMPTY }));
    await SecureStore.deleteItemAsync('token');
    await AsyncStorage.multiRemove(['username', 'selectedDate']);
  }, []);

  const selectDate = useCallback(async (iso) => {
    setState((s) => ({ ...s, selectedDate: iso }));
    if (iso) await AsyncStorage.setItem('selectedDate', iso);
    else await AsyncStorage.removeItem('selectedDate');
  }, []);

  const setUsername = useCallback(async (username) => {
    setState((s) => ({ ...s, username }));
    await AsyncStorage.setItem('username', username);
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut, selectDate, setUsername }), [state, signIn, signOut, selectDate, setUsername]);
  return createElement(SessionContext.Provider, { value }, children);
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
