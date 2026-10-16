import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../../src/api';
import ConfirmModal from '../../../src/components/ConfirmModal';
import ErrorBanner from '../../../src/components/ErrorBanner';
import { Trash } from '../../../src/components/icons';
import MonthPicker from '../../../src/components/MonthPicker';
import { Button, Card, Empty, H2, Loading, Notice, Page, Sub, ui } from '../../../src/components/ui';
import { money, MONTHS } from '../../../src/format';
import { useSession } from '../../../src/session';
import { colors, fonts } from '../../../src/theme';
import { useRemote } from '../../../src/useRemote';
import { validateMonth } from '../../../src/validation';

export default function YearScreen() {
  const year = Number(useLocalSearchParams().year);
  const { selectedDate } = useSession();
  const months = useRemote(() => api(`/years/${year}/months`).then((d) => (d.months || [])
    .map((m) => ({ id: m.id, m: Number(m.month_number), earn: Number(m.total_earnings) || 0, count: Number(m.transaction_count) || 0 }))
    .sort((a, b) => a.m - b.m)), [year]);
  const [monthInput, setMonthInput] = useState('');
  const [msg, setMsg] = useState({ ok: true, text: '' });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  async function addMonth() {
    const problem = validateMonth(monthInput);
    if (problem) return setMsg({ ok: false, text: problem });
    if (busy) return undefined;
    setBusy(true);
    try {
      await api(`/years/${year}/months`, { method: 'POST', body: { month: Number(monthInput) } });
      setMonthInput('');
      setMsg({ ok: true, text: 'Month added successfully.' });
      months.reload();
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
      await api('/months/' + del.id, { method: 'DELETE' });
      setDel(null);
      setMsg({ ok: true, text: '' });
      months.reload();
    } catch (x) {
      setDel({ ...del, busy: false, error: x.message });
    }
  }

  const list = months.data || [];
  return (
    <Page refreshing={months.refreshing} onRefresh={months.refresh}>
      {months.error && <ErrorBanner message={months.error.message} onRetry={months.reload} />}
      <Card style={{ gap: 8 }}>
        <H2>Add a month</H2>
        <Sub>Only months you add will appear below.</Sub>
        <View style={[ui.row, { marginTop: 8 }]}>
          <MonthPicker value={monthInput} onChange={(v) => { setMonthInput(v); setMsg({ ok: true, text: '' }); }} style={{ flex: 1, marginTop: 0 }} />
          <Button small title="Add month" onPress={addMonth} disabled={busy} />
        </View>
        <Notice ok={msg.ok} text={msg.text} />
      </Card>
      {months.loading ? <Loading /> : (
        <View style={{ gap: 14 }}>
          {list.map((mo) => {
            const label = `${MONTHS[mo.m - 1]} ${year}`;
            return (
              <Pressable key={mo.id} accessibilityRole="button" style={s.month} onPress={() => router.push(`/month/${mo.id}?year=${year}`)}>
                <Text style={s.title}>{label}</Text>
                <Text style={s.cap}>TOTAL EARNINGS</Text>
                <Text style={s.earn}>{money(mo.earn)}</Text>
                <View style={s.foot}>
                  <Text style={s.count}>{mo.count} transactions</Text>
                  <Text style={s.open}>Open calendar</Text>
                </View>
                {!selectedDate && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${label}`} style={s.trash} hitSlop={6} onPress={() => setDel({ id: mo.id, label })}>
                    <Trash />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
          {!list.length && !months.error && <Empty text="No months yet. Add one to begin." />}
        </View>
      )}
      <ConfirmModal
        visible={!!del}
        kind="month"
        subject={{ label: del?.label }}
        busy={!!del?.busy}
        error={del?.error}
        onConfirm={confirmDelete}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}

const s = StyleSheet.create({
  month: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 18 },
  title: { marginBottom: 18, fontSize: 16, fontFamily: fonts.sansBold, color: colors.ink },
  cap: { fontSize: 10, color: colors.muted, fontFamily: fonts.sans },
  earn: { fontSize: 20, fontFamily: fonts.sansBold, color: colors.ink, marginTop: 4, marginBottom: 16 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 11 },
  count: { fontSize: 12, color: colors.muted, fontFamily: fonts.sans },
  open: { fontSize: 12, color: '#1762bb', fontFamily: fonts.sansBold },
  trash: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
});
