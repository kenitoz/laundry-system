import { useEffect, useRef } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { money } from '../format';
import { colors, fonts } from '../theme';

const SIZE = 286;
const TAGS = {
  PAID: ['#e7f7ec', '#187443'],
  UNPAID: ['#ffebe9', '#b33a32'],
  'PARTIALLY PAID': ['#fff4d6', '#a87100'],
};

// Magnifying-glass detail view that grows out of the tapped row (web zoomIn/zoomOut).
export default function Magnifier({ tx, origin, onClose }) {
  const p = useSharedValue(0);
  const closing = useRef(false);
  const timer = useRef(null);
  const { width, height } = Dimensions.get('window');
  const dx = origin ? origin.x - width / 2 : 0;
  const dy = origin ? origin.y - height / 2 : 0;

  useEffect(() => {
    if (!tx) return undefined;
    closing.current = false;
    p.value = 0;
    p.value = withTiming(1, { duration: 480, easing: Easing.bezier(0.3, 1.2, 0.5, 1) });
    return () => clearTimeout(timer.current);
  }, [tx, p]);

  const lens = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 4),
    transform: [{ translateX: (1 - p.value) * dx }, { translateY: (1 - p.value) * dy }, { scale: 0.12 + 0.88 * p.value }],
  }));
  const back = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2) }));

  if (!tx) return null;
  const bal = Math.max(0, tx.total - tx.paid);
  const status = bal <= 0 ? 'PAID' : tx.paid > 0 ? 'PARTIALLY PAID' : 'UNPAID';
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    p.value = withTiming(0, { duration: 320, easing: Easing.bezier(0.5, 0, 0.75, 0) });
    timer.current = setTimeout(onClose, 320);
  };

  return (
    <Modal transparent visible onRequestClose={close} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close details">
        <Animated.View style={[s.back, back]} />
        <View style={s.center} pointerEvents="none">
          <Animated.View style={[s.lens, lens]} accessibilityRole="summary" accessibilityLabel={`${tx.name} details`}>
            <View style={s.handle} />
            <View style={s.glass}>
              <View style={s.shine} />
              <Text style={s.time}>{tx.time}</Text>
              <Text style={s.name} numberOfLines={2}>{tx.name}</Text>
              <Text style={[s.tag, { backgroundColor: TAGS[status][0], color: TAGS[status][1] }]}>{status}</Text>
              <View style={s.nums}>
                <View><Text style={s.cap}>TOTAL</Text><Text style={[s.num, { color: colors.ink }]}>{money(tx.total)}</Text></View>
                <View><Text style={s.cap}>PAID</Text><Text style={[s.num, { color: colors.ok }]}>{money(tx.paid)}</Text></View>
                <View><Text style={s.cap}>BALANCE</Text><Text style={[s.num, { color: bal ? colors.danger : colors.ink }]}>{money(bal)}</Text></View>
              </View>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9,39,94,.42)' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  lens: { width: SIZE, height: SIZE },
  handle: { position: 'absolute', width: 26, height: 92, right: 14, bottom: -76, borderRadius: 13, backgroundColor: colors.navy, transform: [{ rotate: '-45deg' }] },
  glass: {
    flex: 1, borderRadius: SIZE / 2, backgroundColor: '#fff', borderWidth: 12, borderColor: colors.navy, alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 26, overflow: 'hidden', shadowColor: '#051944', shadowOpacity: 0.4, shadowRadius: 25, elevation: 12,
  },
  shine: { position: 'absolute', top: '12%', left: '16%', width: '34%', height: '14%', borderRadius: 99, backgroundColor: 'rgba(167,199,251,.35)', transform: [{ rotate: '-32deg' }] },
  time: { fontSize: 11, color: colors.muted, fontFamily: fonts.sansBold, letterSpacing: 0.6 },
  name: { fontSize: 26, lineHeight: 29, color: colors.navy, fontFamily: fonts.display, textAlign: 'center' },
  tag: { fontSize: 10, fontFamily: fonts.sansBold, letterSpacing: 0.8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, overflow: 'hidden' },
  nums: { flexDirection: 'row', gap: 14, marginTop: 4 },
  cap: { fontSize: 9, color: '#8090a6', fontFamily: fonts.sansBold, letterSpacing: 0.7 },
  num: { fontSize: 15, fontFamily: fonts.sansBold },
});
