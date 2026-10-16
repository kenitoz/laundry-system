import { forwardRef, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import Wear from '../components/Wear';
import { colors, fonts } from '../theme';

// Fixed geometry (matches the web): the door's centre inside the machine box.
export const MACHINE_WIDTH = 232;
export const DOOR_CENTER = { x: 116, y: 140 };
export const GLASS_SIZE = 144;

const CRACK1 = 'M64 14 L56 32 L65 40 L53 57 M56 32 L44 28 M65 40 L77 45';
const CRACK2 = 'M20 68 L34 61 L31 49 L44 43 M34 61 L41 72 L37 86 M31 49 L19 43 M53 57 L59 70 L72 75 M44 43 L53 57';

function Crack({ d }) {
  return (
    <Svg viewBox="0 0 100 100" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={d} fill="none" stroke="rgba(9,39,94,.45)" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={d} fill="none" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// The washer drawing. `spinRate` scales drum speed; bump `shake.key` to rattle it.
const Machine = forwardRef(function Machine({ stage, display, soap, drum, hidden, spinRate, shake, glassChildren, animatedStyle }, ref) {
  const rot = useSharedValue(0);
  const jx = useSharedValue(0);
  const jr = useSharedValue(0);

  useEffect(() => {
    const from = rot.value % 360;
    rot.value = from;
    rot.value = withRepeat(withTiming(from + 360, { duration: 2800 / spinRate, easing: Easing.linear }), -1, false);
  }, [spinRate, rot]);

  useEffect(() => {
    if (!shake?.key) return;
    const k = shake.k ?? 1, a = 3 * k, r = 0.8 * k, d = (300 + 80 * k) / 5;
    jx.value = withSequence(withTiming(-a, { duration: d }), withTiming(a, { duration: d }), withTiming(-a * 0.6, { duration: d }), withTiming(a * 0.4, { duration: d }), withTiming(0, { duration: d }));
    jr.value = withSequence(withTiming(-r, { duration: d }), withTiming(r, { duration: d }), withTiming(-r * 0.5, { duration: d }), withTiming(0, { duration: d * 2 }));
  }, [shake, jx, jr]);

  const drumStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: jx.value }, { rotate: `${jr.value}deg` }] }));

  return (
    <Animated.View ref={ref} style={[s.machine, { opacity: hidden ? 0 : 1 }, shakeStyle, animatedStyle]}>
      <View style={s.row}>
        <View style={s.display}>
          <Text style={[s.displayText, { color: stage >= 2 ? '#ff8a7a' : colors.yellow }]}>WASH</Text>
          <Text style={[s.displayText, { color: stage >= 2 ? '#ff8a7a' : colors.yellow }]}>{display}</Text>
        </View>
        <View style={[s.knob, { transform: [{ rotate: `${stage >= 3 ? 80 : stage >= 2 ? 35 : 0}deg` }] }]}><View style={s.knobDot} /></View>
        <View style={s.bolt} />
        {stage < 1 ? <View style={s.bolt} /> : stage < 4 ? <View style={[s.bolt, s.boltOff]} /> : null}
      </View>
      <View style={[s.door, stage === 3 && { transform: [{ rotate: '-6deg' }, { translateX: -3 }, { translateY: 3 }] }]}>
        <View style={s.glass}>
          <Animated.View style={[StyleSheet.absoluteFill, drumStyle]}>
            {drum.map((d) => (
              <View key={d.id} style={[s.item, { marginLeft: Math.cos(d.angle) * d.radius - 17, marginTop: Math.sin(d.angle) * d.radius - 17, transform: [{ rotate: `${d.rotation}deg` }] }]}>
                <Wear type={d.type} color={d.color} size={34} />
              </View>
            ))}
          </Animated.View>
          <View style={s.water} />
          {soap && <View style={s.foam} />}
          {stage >= 1 && <Crack d={CRACK1} />}
          {stage >= 2 && <Crack d={CRACK2} />}
          {glassChildren}
          <View style={s.shine} />
        </View>
      </View>
    </Animated.View>
  );
});

export default Machine;

const s = StyleSheet.create({
  machine: { width: MACHINE_WIDTH, backgroundColor: '#fff', borderRadius: 22, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, alignItems: 'center', gap: 14, elevation: 14, shadowColor: '#051944', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 24 } },
  row: { width: '100%', height: 26, flexDirection: 'row', alignItems: 'center', gap: 8 },
  display: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.navy, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  displayText: { fontSize: 11, fontFamily: fonts.sansBold, letterSpacing: 0.9 },
  knob: { width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: colors.field, backgroundColor: '#f3f7ff', alignItems: 'center', justifyContent: 'center' },
  knobDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand },
  bolt: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  boltOff: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c9d2df' },
  door: { width: 176, height: 176, borderRadius: 88, backgroundColor: colors.line, padding: 12 },
  glass: { width: GLASS_SIZE + 8, height: GLASS_SIZE + 8, borderRadius: 76, overflow: 'hidden', backgroundColor: '#cfe0f7', borderWidth: 4, borderColor: '#fff' },
  item: { position: 'absolute', left: '50%', top: '50%', width: 34, height: 34 },
  water: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', backgroundColor: 'rgba(23,98,197,.28)' },
  foam: { position: 'absolute', left: '-6%', right: '-6%', bottom: '30%', height: '16%', borderRadius: 99, backgroundColor: 'rgba(255,255,255,.7)' },
  shine: { position: 'absolute', top: '14%', left: '18%', width: '30%', height: '16%', borderRadius: 99, backgroundColor: 'rgba(255,255,255,.55)', transform: [{ rotate: '-30deg' }] },
});
