import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../src/api';
import ConfirmModal from '../../src/components/ConfirmModal';
import ErrorBanner from '../../src/components/ErrorBanner';
import { Trash } from '../../src/components/icons';
import { Button, Card, Empty, Field, H2, Loading, Notice, Page, Sub, ui } from '../../src/components/ui';
import { useRemote } from '../../src/useRemote';
import { useSession } from '../../src/session';
import { colors, fonts } from '../../src/theme';
import { validateYear } from '../../src/validation';

export default function Setup() {
  const { selectedDate, selectDate } = useSession();
  const years = useRemote(() => api('/years').then((d) => (d.years || []).map((r) => Number(r.year))), []);
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const [msg, setMsg] = useState({ ok: true, text: '' });
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  async function addYear() {
    const problem = validateYear(yearInput);
    if (problem) return setMsg({ ok: false, text: problem });
    if (busy) return undefined;
    setBusy(true);
    try {
      await api('/years', { method: 'POST', body: { year: Number(yearInput) } });
      setMsg({ ok: true, text: `${Number(yearInput)} is ready for transactions.` });
      years.reload();
    } catch (x) {
      setMsg({ ok: false, text: x.message });
    } finally {
      setBusy(false);
    }
    return undefined;
  }

  async function confirmDelete() {
    if (del.busy) return;
    setDel({ ...del, busy: true, error: '' });
    try {
      await api('/years/' + del.year, { method: 'DELETE' });
      if (selectedDate.startsWith(del.year + '-')) await selectDate('');
      setDel(null);
      years.reload();
    } catch (x) {
      setDel({ ...del, busy: false, error: x.message });
    }
  }

  const list = [...(years.data || [])].sort((a, b) => b - a);
  return (
    <Page refreshing={years.refreshing} onRefresh={years.refresh}>
      {years.error && <ErrorBanner message={years.error.message} onRetry={years.reload} />}
      <Card style={{ gap: 20 }}>
        <View style={s.addBlock}>
          <H2>Add a transaction year</H2>
          <Sub>Create a year before selecting its months and daily records.</Sub>
          <View style={[ui.row, { marginTop: 4 }]}>
            <Field
              accessibilityLabel="Year"
              style={{ flex: 1, marginTop: 0 }}
              keyboardType="number-pad"
              maxLength={4}
              value={yearInput}
              onChangeText={(v) => { setYearInput(v); setMsg({ ok: true, text: '' }); }}
              onSubmitEditing={addYear}
            />
            <Button small title="Add year" onPress={addYear} disabled={busy} />
          </View>
          <Notice ok={msg.ok} text={msg.text} />
        </View>
        {years.loading ? <Loading /> : (
          <View style={s.grid}>
            {list.map((y) => (
              <Pressable key={y} accessibilityRole="button" accessibilityLabel={`Year ${y}, select month`} style={s.year} onPress={() => router.push(`/year/${y}`)}>
                <Text style={s.cap}>YEAR</Text>
                <Text style={s.yearNum}>{String(y)}</Text>
                <Text style={s.cap}>Select month</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete year ${y}`} style={s.trash} hitSlop={6} onPress={() => setDel({ year: y })}>
                  <Trash />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
        {!years.loading && !list.length && !years.error && <Empty text="No transaction years yet. Add your first year above." />}
      </Card>
      <ConfirmModal
        visible={!!del}
        kind="year"
        subject={{ label: String(del?.year) }}
        busy={!!del?.busy}
        error={del?.error}
        onConfirm={confirmDelete}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}

const s = StyleSheet.create({
  addBlock: { gap: 8, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  year: { width: '47%', flexGrow: 1, minHeight: 140, padding: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'space-between' },
  cap: { color: colors.muted, fontSize: 11, letterSpacing: 0.9, fontFamily: fonts.sans },
  yearNum: { fontSize: 32, color: colors.navy, fontFamily: fonts.sansBold },
  trash: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});
