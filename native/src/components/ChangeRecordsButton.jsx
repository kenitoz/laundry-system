import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { fmtDate, MONTHS } from '../format';
import { colors, fonts } from '../theme';
import { CalendarIcon, SignOutIcon } from './icons';

const FAB = 58;
const SPRING = { damping: 14, stiffness: 160 };

// Draggable calendar bubble on Settings (web: chPD/chPM/chPU). Tap opens the panel,
// drag moves it; on release it snaps to the nearer side edge.
export default function ChangeRecordsButton({ selectedDate, months, onYear, onMonth, onDate, onSignOut }) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [side, setSide] = useState('right');
  const [top, setTop] = useState(380);
  const [open, setOpen] = useState(false);
  const x = useSharedValue(0), y = useSharedValue(top), lift = useSharedValue(1), panel = useSharedValue(0);

  const leftFor = (s) => (s === 'left' ? -6 : box.width - 52);
  useEffect(() => { if (box.width) x.value = withSpring(leftFor(side), SPRING); }, [box.width, side]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { panel.value = withTiming(open ? 1 : 0, { duration: open ? 320 : 200 }); }, [open, panel]);

  const clampTop = (v) => Math.max(60, Math.min(box.height - 140, v));
  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 6,
    onActivate: () => { setOpen(false); lift.value = withTiming(1.08, { duration: 150 }); },
    onUpdate: (e) => {
      x.value = Math.max(4, Math.min(box.width - FAB - 4, leftFor(side) + e.translationX));
      y.value = clampTop(top + e.translationY);
    },
    onDeactivate: () => {
      lift.value = withTiming(1, { duration: 150 });
      const next = x.value + FAB / 2 < box.width / 2 ? 'left' : 'right';
      x.value = withSpring(leftFor(next), SPRING);
      setSide(next);
      setTop(y.value);
    },
  });

  const fab = useAnimatedStyle(() => ({ left: x.value, top: y.value, transform: [{ scale: lift.value }] }));
  const panelTop = Math.max(64, Math.min(top - 60, box.height - 324));
  const panelStyle = useAnimatedStyle(() => ({ opacity: panel.value, transform: [{ scale: 0.2 + 0.8 * panel.value }] }));

  const yr = selectedDate ? Number(selectedDate.slice(0, 4)) : null;
  const mo = selectedDate ? (months || []).find((m) => m.m === Number(selectedDate.slice(5, 7))) : null;
  const act = (fn) => () => { setOpen(false); fn({ yr, mo }); };
  const items = [
    ['Y', 'Change year', yr ? 'Current: ' + yr : 'Pick a transaction year', onYear],
    ['M', 'Change month', yr ? 'Months in ' + yr : 'Pick a year first', onMonth],
    ['D', 'Change date', mo ? `${MONTHS[mo.m - 1]} ${yr} calendar` : 'Pick a month first', onDate],
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={(e) => setBox(e.nativeEvent.layout)}>
      {open && <Pressable style={s.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />}
      {open && (
        <Animated.View style={[s.panel, { top: panelTop, transformOrigin: `${side === 'left' ? '0%' : '100%'} ${top - panelTop + 29}px` }, panelStyle]}>
          <View style={s.head}>
            <Text style={s.headTitle}>Change records</Text>
            <Text style={s.headDate}>{selectedDate ? fmtDate(selectedDate) : 'No date'}</Text>
          </View>
          {items.map(([icon, title, sub, fn]) => (
            <Pressable key={title} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} style={({ pressed }) => [s.item, pressed && s.itemOn]} onPress={act(fn)}>
              <Text style={s.icon}>{icon}</Text>
              <View style={{ flex: 1 }}><Text style={s.title}>{title}</Text><Text style={s.sub}>{sub}</Text></View>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out. End your current session on this device." style={({ pressed }) => [s.item, pressed && s.dangerOn]} onPress={act(onSignOut)}>
            <View style={[s.icon, s.dangerIcon]}><SignOutIcon /></View>
            <View style={{ flex: 1 }}><Text style={s.title}>Sign out</Text><Text style={s.sub}>End your current session on this device.</Text></View>
            <Text style={[s.arrow, { color: colors.danger }]}>›</Text>
          </Pressable>
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={[s.fab, fab]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change year, month, date, or sign out"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
            style={s.fabInner}
          >
            <CalendarIcon />
            <Text style={s.badge}>4</Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,39,94,.3)' },
  panel: { position: 'absolute', left: 14, right: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, gap: 10, elevation: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  headTitle: { fontSize: 16, color: colors.navy, fontFamily: fonts.sansBold },
  headDate: { fontSize: 12, color: colors.muted, fontFamily: fonts.sans },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  itemOn: { borderColor: '#a7c7fb', backgroundColor: '#f7faff' },
  dangerOn: { borderColor: '#f3c3be', backgroundColor: '#fff7f6' },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.softBlue, color: '#1762bb', textAlign: 'center', textAlignVertical: 'center', lineHeight: 36, fontFamily: fonts.sansBold, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  dangerIcon: { backgroundColor: '#fff0ef' },
  title: { fontSize: 14, color: colors.ink, fontFamily: fonts.sansBold },
  sub: { fontSize: 12, color: colors.muted, fontFamily: fonts.sans },
  arrow: { color: colors.brand, fontSize: 18 },
  fab: { position: 'absolute', width: FAB, height: FAB },
  fabInner: { flex: 1, borderRadius: FAB / 2, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', elevation: 10 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.yellow, color: colors.navy, fontSize: 10, fontFamily: fonts.sansBold, textAlign: 'center', lineHeight: 16, borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
});
