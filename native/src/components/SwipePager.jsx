import { useLayoutEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DOT_ORDER, stepTab, TAB_LABELS } from '../tabs';
import { colors, fonts } from '../theme';

const SLIDE = { duration: 380, easing: Easing.bezier(0.22, 0.8, 0.24, 1) };

// Circular three-page carousel for the dashboard lists (web: step()/onPU()).
// A swipe past 20% of the width, or faster than 0.5 px/ms, moves one page.
export default function SwipePager({ tab, onChange, renderPage }) {
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState({});
  const x = useSharedValue(0);
  const busy = useRef(false);
  const timer = useRef(null);

  // The new tab's content is already centred, so snap back before paint.
  useLayoutEffect(() => {
    x.value = 0;
    busy.current = false;
    return () => clearTimeout(timer.current);
  }, [tab, x]);

  const settle = (dir) => {
    if (!dir) { x.value = withTiming(0, SLIDE); return; }
    busy.current = true;
    x.value = withTiming(-dir * width, SLIDE);
    timer.current = setTimeout(() => onChange(stepTab(tab, dir)), SLIDE.duration);
  };

  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-8, 8],
    failOffsetY: [-8, 8],
    onUpdate: (e) => { if (!busy.current) x.value = e.translationX; },
    onDeactivate: (e) => {
      if (busy.current) return;
      const { translationX: dx, velocityX: v } = e;
      if (dx < -width * 0.2 || v < -500) settle(1);
      else if (dx > width * 0.2 || v > 500) settle(-1);
      else settle(0);
    },
  });

  const track = useAnimatedStyle(() => ({ transform: [{ translateX: -width + x.value }] }));
  const slots = [stepTab(tab, -1), tab, stepTab(tab, 1)];

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View
          style={[s.viewport, heights[tab] ? { height: heights[tab] } : null]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[s.track, { width: width * 3 }, track]}>
            {slots.map((k, i) => (
              <View
                key={i}
                style={{ width }}
                importantForAccessibility={i === 1 ? 'auto' : 'no-hide-descendants'}
                accessibilityElementsHidden={i !== 1}
                onLayout={(e) => { const h = e.nativeEvent.layout.height; setHeights((m) => (m[k] === h ? m : { ...m, [k]: h })); }}
              >
                <Text style={s.label} accessibilityRole="header">{TAB_LABELS[k]}</Text>
                {renderPage(k)}
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={s.dots}>
        {DOT_ORDER.map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={TAB_LABELS[k]}
            accessibilityState={{ selected: k === tab }}
            hitSlop={10}
            onPress={() => { if (k !== tab) onChange(k); }}
            style={[s.dot, { width: k === tab ? 18 : 6, backgroundColor: k === tab ? colors.blue : '#c9d6ea' }]}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  viewport: { overflow: 'hidden' },
  track: { flexDirection: 'row', alignItems: 'flex-start' },
  label: { color: colors.navy, fontSize: 19, fontFamily: fonts.sansBold, marginBottom: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 14 },
  dot: { height: 6, borderRadius: 99 },
});
