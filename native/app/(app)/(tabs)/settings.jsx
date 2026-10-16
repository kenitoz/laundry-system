import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../../src/api';
import ChangeRecordsButton from '../../../src/components/ChangeRecordsButton';
import ConfirmModal from '../../../src/components/ConfirmModal';
import { Button, Card, Field, Label, Page } from '../../../src/components/ui';
import { useSession } from '../../../src/session';
import { colors, fonts } from '../../../src/theme';
import { useRemote } from '../../../src/useRemote';
import { validateCredentials } from '../../../src/validation';

const EMPTY = { newUsername: '', currentPassword: '', newPassword: '', confirmPassword: '' };
const SECRETS = [['currentPassword', 'Current password', 'current'], ['newPassword', 'New password', 'next'], ['confirmPassword', 'Confirm new password', 'confirm']];

export default function Settings() {
  const { selectedDate, selectDate, signOut, username } = useSession();
  const account = useRemote(() => api('/account').then((d) => d.account?.username || ''), []);
  const year = selectedDate ? selectedDate.slice(0, 4) : '';
  const months = useRemote(() => (year
    ? api(`/years/${year}/months`).then((d) => (d.months || []).map((m) => ({ id: m.id, m: Number(m.month_number) })))
    : Promise.resolve([])), [year]);
  const [form, setForm] = useState(EMPTY);
  const [vis, setVis] = useState({});
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const set = (key) => (value) => { setForm((f) => ({ ...f, [key]: value })); setError(''); };

  const leave = async () => {
    await signOut();
    router.replace('/');
  };

  async function confirm() {
    if (modal.kind === 'signout') return leave();
    if (modal.busy) return undefined;
    setModal({ ...modal, busy: true });
    try {
      await api('/account', {
        method: 'PUT',
        body: { new_username: form.newUsername.trim(), current_password: form.currentPassword, new_password: form.newPassword, confirm_password: form.confirmPassword },
      });
      return leave();
    } catch (x) {
      setModal(null);
      setError(x.message);
    }
    return undefined;
  }

  function save() {
    const problem = validateCredentials(form);
    if (problem) return setError(problem);
    setModal({ kind: 'cred' });
    return undefined;
  }

  return (
    <View style={{ flex: 1 }}>
      <Page style={{ gap: 18 }}>
        {!!error && <Text style={s.alert} accessibilityRole="alert">{error}</Text>}
        <Card style={{ borderRadius: 14 }}>
          <Text style={s.h2}>Username</Text>
          <Text style={s.hint}>Use a unique username to identify your account.</Text>
          <Label>Current username</Label>
          <Field accessibilityLabel="Current username" value={account.data ?? username} editable={false} />
          <Label>New username</Label>
          <Field accessibilityLabel="New username" value={form.newUsername} onChangeText={set('newUsername')} placeholder="Enter new username" autoCapitalize="none" autoCorrect={false} />
          <Text style={[s.h2, s.split]}>Change password</Text>
          <Text style={s.hint}>Use a strong password you do not reuse elsewhere.</Text>
          {SECRETS.map(([key, label, v]) => (
            <View key={key}>
              <Label>{label}</Label>
              <View style={s.secret}>
                <Field accessibilityLabel={label} style={{ flex: 1, marginTop: 0 }} value={form[key]} onChangeText={set(key)} secureTextEntry={!vis[v]} autoCapitalize="none" />
                <Pressable accessibilityRole="button" accessibilityLabel={`${vis[v] ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onPress={() => setVis((m) => ({ ...m, [v]: !m[v] }))} style={s.toggle}>
                  <Text style={s.toggleText}>{vis[v] ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Button small title="Save changes" onPress={save} style={{ marginTop: 22 }} />
        </Card>
      </Page>
      <ChangeRecordsButton
        selectedDate={selectedDate}
        months={months.data}
        onYear={async () => { await selectDate(''); router.replace('/setup'); }}
        onMonth={({ yr }) => router.push(yr ? `/year/${yr}` : '/setup')}
        onDate={({ yr, mo }) => router.push(mo ? `/month/${mo.id}?year=${yr}` : yr ? `/year/${yr}` : '/setup')}
        onSignOut={() => setModal({ kind: 'signout' })}
      />
      <ConfirmModal visible={!!modal} kind={modal?.kind} busy={!!modal?.busy} onConfirm={() => { confirm(); }} onCancel={() => setModal(null)} />
    </View>
  );
}

const s = StyleSheet.create({
  alert: { paddingVertical: 11, paddingHorizontal: 13, borderRadius: 8, fontSize: 13, color: '#b33a32', backgroundColor: colors.errBg, fontFamily: fonts.sans, overflow: 'hidden' },
  h2: { marginBottom: 5, color: colors.navy, fontSize: 19, fontFamily: fonts.sansBold },
  split: { marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.line },
  hint: { color: colors.muted, fontSize: 13, fontFamily: fonts.sans },
  secret: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  toggle: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  toggleText: { color: colors.muted, fontSize: 12, fontFamily: fonts.sansBold },
});
