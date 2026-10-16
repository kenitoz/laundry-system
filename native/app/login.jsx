import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../src/api';
import Brand from '../src/components/Brand';
import { useSession } from '../src/session';
import { colors, fonts } from '../src/theme';

export default function Login() {
  const { token, selectedDate, signIn } = useSession();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pwRef = useRef(null);

  if (token && !busy) return <Redirect href={selectedDate ? '/dashboard' : '/setup'} />;

  const update = (key) => (value) => { setForm((f) => ({ ...f, [key]: value })); setError(''); };

  async function submit() {
    const username = form.username.trim();
    if (!username || !form.password) return setError('Username and password are required.');
    if (busy) return undefined;
    setBusy(true);
    try {
      const d = await api('/login', { method: 'POST', body: { username, password: form.password } });
      await signIn(d.token, d.username || username);
      router.replace('/setup');
    } catch (x) {
      setError(x.message);
      setBusy(false);
    }
    return undefined;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.blue }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[s.hero, { paddingTop: insets.top + 22 }]}>
          <Brand size={64} nameSize={25} gap={14} subColor="#dcecff" />
          <View style={{ gap: 14 }}>
            <Text style={s.kicker}>DAILY TRANSACTION MANAGEMENT</Text>
            <Text style={s.h1}>Fresh records.{'\n'}<Text style={s.em}>Clear days.</Text></Text>
            <Text style={s.lede}>Keep every wash, payment, and customer neatly in one place.</Text>
          </View>
        </View>
        <View style={[s.form, { paddingBottom: 38 + insets.bottom }]}>
          {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}
          <Text style={s.label}>Username or email</Text>
          <TextInput
            accessibilityLabel="Username or email"
            style={s.input}
            value={form.username}
            onChangeText={update('username')}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => pwRef.current?.focus()}
          />
          <Text style={s.label}>Password</Text>
          <View style={s.secret}>
            <TextInput
              ref={pwRef}
              accessibilityLabel="Password"
              style={[s.input, { flex: 1, marginTop: 0 }]}
              value={form.password}
              onChangeText={update('password')}
              placeholder="password"
              secureTextEntry={!showPw}
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            <Pressable onPress={() => setShowPw((v) => !v)} accessibilityRole="button" style={s.toggle}>
              <Text style={s.toggleText}>{showPw ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={submit}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            style={[s.btn, busy && { opacity: 0.6 }]}
          >
            <Text style={s.btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 28, paddingBottom: 34, gap: 36 },
  kicker: { fontSize: 10, fontFamily: fonts.sansBold, letterSpacing: 1.3, color: '#dcecff' },
  h1: { fontSize: 42, lineHeight: 48, fontFamily: fonts.display, color: '#fff', letterSpacing: -1 },
  em: { fontFamily: fonts.displayItalic, color: colors.yellow },
  lede: { color: '#e9f3ff', lineHeight: 24, fontSize: 15, fontFamily: fonts.sans },
  form: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 28, paddingTop: 30 },
  error: { color: '#b33a32', backgroundColor: colors.errBg, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 6, fontSize: 12, fontFamily: fonts.sans, marginBottom: 4 },
  label: { marginTop: 15, fontSize: 12, fontFamily: fonts.sansBold, color: colors.navy },
  input: { marginTop: 7, padding: 11, borderWidth: 1, borderColor: colors.field, borderRadius: 8, backgroundColor: '#fff', fontSize: 16, fontFamily: fonts.sans, color: colors.ink },
  secret: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  toggle: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  toggleText: { color: colors.muted, fontSize: 12, fontFamily: fonts.sansBold },
  btn: { marginTop: 28, borderRadius: 10, backgroundColor: colors.blue, paddingVertical: 15, alignItems: 'center', elevation: 3 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: fonts.sansBold },
});
