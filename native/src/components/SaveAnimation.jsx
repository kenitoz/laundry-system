import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { colors, fonts } from '../theme';
import Wear from './Wear';

// Timings from the web runSaveAnim(): pop in, spin + shake, shrink away at 1650 ms.
export const SAVE_ANIMATION_MS = 2130;

export default function SaveAnimation({ visible, name, onDone }) {
  const back = useSharedValue(0);
  const pop = useSharedValue(0);
  const spin = useSharedValue(0);
  const shake = useSharedValue(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!visible) return undefined;
    back.value = withSequence(withTiming(1, { duration: 220 }), withDelay(1690, withTiming(0, { duration: 220 })));
    pop.value = withSequence(
      withTiming(1, { duration: 460, easing: Easing.bezier(0.3, 1.4, 0.5, 1) }),
      withDelay(1190, withTiming(0, { duration: 480, easing: Easing.bezier(0.55, 0, 0.8, 0.4) })),
    );
    spin.value = 0;
    spin.value = withDelay(300, withTiming(900, { duration: 1300, easing: Easing.bezier(0.4, 0, 0.3, 1) }));
    shake.value = withDelay(500, withRepeat(withSequence(withTiming(-2, { duration: 40 }), withTiming(2, { duration: 80 }), withTiming(0, { duration: 40 })), 6));
    const t = setTimeout(() => doneRef.current(), SAVE_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [visible, back, pop, spin, shake]);

  const backStyle = useAnimatedStyle(() => ({ opacity: back.value }));
  const machine = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.5),
    transform: [{ translateX: shake.value }, { scale: 0.3 + 0.7 * pop.value }],
  }));
  const drum = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  if (!visible) return null;
  return (
    <Modal transparent visible statusBarTranslucent>
      <Animated.View style={[s.back, backStyle]} accessibilityLiveRegion="polite" accessibilityLabel="Saving customer">
        <Animated.View style={[s.machine, machine]}>
          <View style={s.row}>
            <Text style={s.display} numberOfLines={1}>{name}</Text>
            <View style={s.knob}><View style={s.knobDot} /></View>
          </View>
          <View style={s.door}>
            <View style={s.glass}>
              <Animated.View style={[StyleSheet.absoluteFill, drum]}>
                <View style={{ position: 'absolute', left: '18%', top: '20%' }}><Wear type="shirt" color="#ffd436" size={34} /></View>
                <View style={{ position: 'absolute', right: '16%', bottom: '22%', transform: [{ rotate: '140deg' }] }}><Wear type="shorts" color="#1762c5" size={30} /></View>
              </Animated.View>
              <View style={s.water} />
              <View style={s.shine} />
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,39,94,.46)' },
  machine: { width: 160, backgroundColor: '#fff', borderRadius: 18, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 16, alignItems: 'center', gap: 10, elevation: 10 },
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 6 },
  display: { flex: 1, backgroundColor: colors.navy, color: colors.yellow, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontFamily: fonts.sansBold, letterSpacing: 0.8, overflow: 'hidden' },
  knob: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.field, backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
  knobDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand },
  door: { width: 116, height: 116, borderRadius: 58, backgroundColor: colors.line, padding: 8 },
  glass: { flex: 1, borderRadius: 50, overflow: 'hidden', backgroundColor: '#cfe0f7', borderWidth: 3, borderColor: '#fff' },
  water: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', backgroundColor: 'rgba(23,98,197,.28)' },
  shine: { position: 'absolute', top: '14%', left: '18%', width: '30%', height: '16%', borderRadius: 99, backgroundColor: 'rgba(255,255,255,.55)', transform: [{ rotate: '-30deg' }] },
});
