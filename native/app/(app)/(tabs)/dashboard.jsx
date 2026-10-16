import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../../../src/api';
import ErrorBanner from '../../../src/components/ErrorBanner';
import Magnifier from '../../../src/components/Magnifier';
import SwipePager from '../../../src/components/SwipePager';
import { Empty, Loading, Page } from '../../../src/components/ui';
import { money } from '../../../src/format';
import { useSession } from '../../../src/session';
import { TAB_LABELS } from '../../../src/tabs';
import { colors, fonts } from '../../../src/theme';
import { useDay } from '../../../src/useDay';
import { paymentState } from '../../../src/validation';

export default function Dashboard() {
  const { selectedDate } = useSession();
  const day = useDay(selectedDate);
  const [tab, setTab] = useState('all');
  const [payIn, setPayIn] = useState({});
  const [payErr, setPayErr] = useState({});
  const [zoom, setZoom] = useState(null);
  const inFlight = useRef(new Set());
  const scrollRef = useRef(null);
  const listY = useRef(0);

  const rows = day.rows;
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const stats = [
    { label: "Today's transactions", value: String(rows.length), icon: '▤', k: 'all' },
    { label: "Today's total amount", value: money(sum('total')), icon: '₱', k: 'all' },
    { label: 'Total paid', value: money(sum('paid')), icon: '✓', k: 'paid' },
    { label: 'Total unpaid', value: money(sum('out')), icon: '◷', k: 'unpaid' },
  ];
  const lists = { all: rows, paid: rows.filter((r) => r.out <= 0), unpaid: rows.filter((r) => r.out > 0) };

  const jumpTo = (k) => {
    setTab(k);
    scrollRef.current?.scrollTo({ y: Math.max(0, listY.current - 12), animated: true });
  };

  async function record(r) {
    const st = paymentState(payIn[r.id] ?? '0', r.out);
    if (!st.canRecord || inFlight.current.has(r.id)) return;
    inFlight.current.add(r.id);
    try {
      await api('/transactions/' + r.id, { method: 'PATCH', body: { status: 'PARTIALLY PAID', amount_paid: r.paid + st.amount } });
      setPayIn((m) => ({ ...m, [r.id]: '0' }));
      setPayErr((m) => ({ ...m, [r.id]: '' }));
      day.patchRow(r.id, { paid: r.paid + st.amount });
    } catch (x) {
      setPayErr((m) => ({ ...m, [r.id]: x.message }));
    } finally {
      inFlight.current.delete(r.id);
    }
  }

  const magnify = (r) => (e) => setZoom({ tx: r, origin: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY } });

  const renderTable = (k) => (
    <View>
      <View style={s.tr}>
        <Text style={s.th}>CUSTOMER NAME</Text>
        <Text style={[s.th, s.r]}>{k === 'paid' ? 'AMOUNT PAID' : 'TOTAL AMOUNT'}</Text>
      </View>
      {lists[k].map((r) => (
        <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Magnify ${r.name}`} onPress={magnify(r)} style={({ pressed }) => [s.tr, pressed && s.pressed]}>
          <Text style={s.name}>{r.name}</Text>
          <Text style={[s.td, s.r]}>{money(k === 'paid' ? r.paid : r.total)}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderUnpaid = () => lists.unpaid.map((r) => {
    const raw = payIn[r.id] ?? '0';
    const st = paymentState(raw, r.out);
    const err = st.error || payErr[r.id] || '';
    return (
      <View key={r.id} style={s.unpaid}>
        <View style={s.unpaidTop}>
          <Text style={s.unpaidName}>{r.name}</Text>
          <Text style={s.of}>of {money(r.total)}</Text>
        </View>
        <View style={s.unpaidGrid}>
          <View style={{ flex: 1 }}>
            <Text style={s.cap}>AMOUNT PAID</Text>
            <TextInput
              accessibilityLabel={`Amount paid for ${r.name}`}
              keyboardType="decimal-pad"
              value={raw}
              selectTextOnFocus
              onChangeText={(v) => { setPayIn((m) => ({ ...m, [r.id]: v })); setPayErr((m) => ({ ...m, [r.id]: '' })); }}
              style={[s.input, { borderColor: err ? colors.danger : colors.field }]}
            />
          </View>
          <View style={{ flex: 1, paddingBottom: 8 }}>
            <Text style={s.cap}>REMAINING</Text>
            <Text style={s.remaining} accessibilityLabel={`Remaining for ${r.name}`}>{money(st.remainingAfter)}</Text>
          </View>
        </View>
        {!!err && <Text style={s.payErr}>{err}</Text>}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Record payment for ${r.name}`}
          accessibilityState={{ disabled: !st.canRecord }}
          onPress={() => { record(r); }}
          style={[s.pay, !st.canRecord && { opacity: 0.5 }]}
        >
          <Text style={s.payText}>Record payment</Text>
        </Pressable>
      </View>
    );
  });

  return (
    <Page scrollRef={scrollRef} refreshing={day.refreshing} onRefresh={day.refresh}>
      {day.error && <ErrorBanner message={day.error.message} onRetry={day.reload} />}
      <View style={s.stats}>
        {stats.map((x) => (
          <Pressable key={x.label} accessibilityRole="button" accessibilityLabel={'Show ' + TAB_LABELS[x.k]} onPress={() => jumpTo(x.k)} style={({ pressed }) => [s.stat, pressed && { transform: [{ scale: 0.97 }] }]}>
            <View style={s.statTop}>
              <Text style={s.statLabel}>{x.label.toUpperCase()}</Text>
              <Text style={s.statIcon}>{x.icon}</Text>
            </View>
            <Text style={s.statValue}>{x.value}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.card} onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}>
        {day.loading ? <Loading /> : (
          <SwipePager
            tab={tab}
            onChange={setTab}
            renderPage={(k) => (lists[k].length ? (k === 'unpaid' ? renderUnpaid() : renderTable(k)) : <Empty text="No customers in this view right now." />)}
          />
        )}
      </View>
      <Magnifier tx={zoom?.tx} origin={zoom?.origin} onClose={() => setZoom(null)} />
    </Page>
  );
}

const s = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', flexGrow: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  statLabel: { flex: 1, fontSize: 9, color: '#7788a1', letterSpacing: 0.8, fontFamily: fonts.sansBold },
  statIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.softBlue, color: '#1762bb', textAlign: 'center', textAlignVertical: 'center', lineHeight: 28, fontFamily: fonts.sansBold, overflow: 'hidden' },
  statValue: { fontSize: 16, marginTop: 10, fontFamily: fonts.sansBold, color: colors.ink },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16 },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 12, paddingHorizontal: 6 },
  pressed: { backgroundColor: '#f0f6ff' },
  th: { flex: 1, fontSize: 11, letterSpacing: 0.9, color: colors.label, fontFamily: fonts.sansBold },
  r: { textAlign: 'right' },
  name: { flex: 1, fontSize: 13, fontFamily: fonts.sansBold, color: colors.ink },
  td: { flex: 1, fontSize: 13, fontFamily: fonts.sans, color: colors.ink },
  unpaid: { gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  unpaidTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  unpaidName: { fontSize: 15, fontFamily: fonts.sansBold, color: colors.ink, flexShrink: 1 },
  of: { fontSize: 12, color: colors.muted, fontFamily: fonts.sans },
  unpaidGrid: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  cap: { fontSize: 11, letterSpacing: 0.9, color: colors.label, fontFamily: fonts.sansBold },
  input: { marginTop: 6, padding: 10, borderWidth: 1, borderRadius: 8, backgroundColor: '#fff', fontSize: 16, fontFamily: fonts.sans, color: colors.ink },
  remaining: { marginTop: 4, fontSize: 16, fontFamily: fonts.sansBold, color: colors.ink },
  payErr: { color: colors.danger, fontSize: 11, lineHeight: 15, fontFamily: fonts.sans },
  pay: { borderRadius: 8, backgroundColor: colors.blue, paddingVertical: 11, alignItems: 'center' },
  payText: { color: '#fff', fontFamily: fonts.sansBold },
});
