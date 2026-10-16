import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../../src/api';
import ConfirmModal from '../../../src/components/ConfirmModal';
import ErrorBanner from '../../../src/components/ErrorBanner';
import { Trash } from '../../../src/components/icons';
import Magnifier from '../../../src/components/Magnifier';
import { Empty, H2, Loading, Page } from '../../../src/components/ui';
import { fmtDate, money } from '../../../src/format';
import { useSession } from '../../../src/session';
import { colors, fonts } from '../../../src/theme';
import { useDay } from '../../../src/useDay';

const short = (n) => money(n).replace('.00', '');

export default function Daily() {
  const { selectedDate } = useSession();
  const day = useDay(selectedDate);
  const [zoom, setZoom] = useState(null);
  const [del, setDel] = useState(null);
  const deleting = useRef(false);

  const rows = day.rows;
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);

  async function confirmDelete() {
    if (deleting.current) return;
    deleting.current = true;
    setDel((d) => ({ ...d, busy: true, error: '' }));
    try {
      await api('/transactions/' + del.id, { method: 'DELETE' });
      day.removeRow(del.id);
      setDel(null);
    } catch (x) {
      setDel((d) => ({ ...d, busy: false, error: x.message }));
    } finally {
      deleting.current = false;
    }
  }

  return (
    <Page refreshing={day.refreshing} onRefresh={day.refresh}>
      {day.error && <ErrorBanner message={day.error.message} onRetry={day.reload} />}
      <View style={s.summary}>
        <View style={{ flex: 1 }}>
          <Text style={s.cap}>DAILY EARNINGS</Text>
          <Text style={s.big}>{money(sum('paid'))}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.cap}>TRANSACTIONS</Text>
          <Text style={s.mid}>{rows.length}</Text>
        </View>
        <View style={{ width: '100%' }}>
          <Text style={s.cap}>TOTAL AMOUNT</Text>
          <Text style={s.mid}>{money(sum('total'))}</Text>
        </View>
      </View>
      <View style={s.card}>
        <H2 style={{ marginBottom: 8 }}>Customers</H2>
        <View style={s.tr}>
          <Text style={[s.th, s.nameCol]}>Customer name</Text>
          <Text style={[s.th, s.num]}>Total</Text>
          <Text style={[s.th, s.num]}>Paid</Text>
          <Text style={[s.th, s.num]}>Balance</Text>
          <View style={s.trashCol} />
        </View>
        {day.loading ? <Loading /> : rows.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={`Magnify ${t.name}`}
            onPress={(e) => setZoom({ tx: t, origin: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY } })}
            style={({ pressed }) => [s.tr, pressed && { backgroundColor: '#f0f6ff' }]}
          >
            <View style={s.nameCol}>
              <Text style={s.name}>{t.name}</Text>
              <Text style={s.time}>{t.time}</Text>
            </View>
            <Text style={[s.td, s.num]}>{short(t.total)}</Text>
            <Text style={[s.td, s.num]}>{short(t.paid)}</Text>
            <Text style={[s.td, s.num, { fontFamily: t.out ? fonts.sansBold : fonts.sans }]}>{short(t.out)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${t.name}'s transaction`}
              hitSlop={6}
              style={s.trashCol}
              onPress={() => setDel({ id: t.id, name: t.name, total: t.total, time: t.time })}
            >
              <Trash />
            </Pressable>
          </Pressable>
        ))}
        {!day.loading && !rows.length && !day.error && <Empty text="No transactions recorded." />}
      </View>
      <Magnifier tx={zoom?.tx} origin={zoom?.origin} onClose={() => setZoom(null)} />
      <ConfirmModal
        visible={!!del}
        kind="tx"
        subject={del ? { ...del, date: fmtDate(selectedDate, 'long') } : {}}
        busy={!!del?.busy}
        error={del?.error}
        onConfirm={() => { confirmDelete(); }}
        onCancel={() => setDel(null)}
      />
    </Page>
  );
}

const s = StyleSheet.create({
  summary: { backgroundColor: colors.blue, borderRadius: 12, padding: 17, flexDirection: 'row', flexWrap: 'wrap', rowGap: 17 },
  cap: { fontSize: 10, color: '#afc8ef', fontFamily: fonts.sansBold },
  big: { fontSize: 25, color: '#fff', fontFamily: fonts.sansBold },
  mid: { fontSize: 18, color: '#fff', fontFamily: fonts.sansBold },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16 },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#edf0f5', paddingVertical: 12, paddingHorizontal: 4 },
  th: { fontSize: 10, color: '#8090a6', fontFamily: fonts.sansBold },
  nameCol: { flex: 1.6, paddingRight: 4 },
  num: { flex: 1, textAlign: 'right' },
  trashCol: { width: 36, alignItems: 'flex-end', justifyContent: 'center' },
  name: { fontSize: 12, fontFamily: fonts.sansBold, color: colors.ink },
  time: { fontSize: 10, color: '#8591a4', fontFamily: fonts.sans },
  td: { fontSize: 12, fontFamily: fonts.sans, color: colors.ink },
});
