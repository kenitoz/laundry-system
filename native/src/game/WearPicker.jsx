import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import Wear from '../components/Wear';
import { fonts } from '../theme';
import { WEARS } from './useWasherGame';

const SLIDE = { duration: 380, easing: Easing.bezier(0.22, 0.8, 0.24, 1) };

// Clothes carousel: swipe to change, tap to toss (web onWPD/onWPM/onWPU).
export default function WearPicker({ index, onToss, onPrev, onNext }) {
  const width = useRef(0);
  const x = useSharedValue(0);
  const pop = useSharedValue(1);
  const timer = useRef(null);
  const W = WEARS[index];

  useEffect(() => { x.value = 0; }, [index, x]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const step = (dir) => {
    x.value = withTiming(-dir * width.current, SLIDE);
    timer.current = setTimeout(() => (dir > 0 ? onNext() : onPrev()), SLIDE.duration);
  };
  const toss = () => {
    onToss();
    pop.value = 0.2;
    pop.value = withTiming(1, { duration: 380 });
  };

  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-8, 8],
    failOffsetY: [-8, 8],
    onUpdate: (e) => { x.value = e.translationX; },
    onDeactivate: (e) => {
      const w = width.current;
      if (e.translationX < -w * 0.2 || e.velocityX < -500) step(1);
      else if (e.translationX > w * 0.2 || e.velocityX > 500) step(-1);
      else x.value = withTiming(0, SLIDE);
    },
  });

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: pop.value }], opacity: Math.min(1, pop.value * 1.4) }));

  return (
    <View style={s.tile} onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}>
      <GestureDetector gesture={pan}>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={`${W[2]} — tap to toss, swipe to change`}
          accessibilityActions={[{ name: 'activate' }, { name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const a = e.nativeEvent.actionName;
            if (a === 'activate') toss();
            else if (a === 'increment') onNext();
            else if (a === 'decrement') onPrev();
          }}
          onPress={toss}
          style={s.viewport}
        >
          <Animated.View style={[s.slot, slide]}>
            <Wear type={W[0]} color={W[1]} size={80} />
          </Animated.View>
        </Pressable>
      </GestureDetector>
      <Text style={s.name}>{W[2]}</Text>
      <View style={s.dots}>
        {WEARS.map((_, i) => <View key={i} style={[s.dot, { width: i === index ? 14 : 5, backgroundColor: i === index ? '#ffd436' : 'rgba(255,255,255,.35)' }]} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.18)', backgroundColor: 'rgba(255,255,255,.08)', paddingTop: 8, paddingBottom: 10, alignItems: 'center', gap: 6 },
  viewport: { width: '100%', height: 92, overflow: 'hidden' },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  name: { color: '#fff', fontSize: 12, fontFamily: fonts.sansBold },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { height: 5, borderRadius: 99 },
});
