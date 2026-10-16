import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import Wear from '../components/Wear';
import { PowderIcon } from '../components/icons';
import { fonts } from '../theme';
import { frameAt } from './effects';

const easingFor = (e) => {
  if (Array.isArray(e)) return Easing.bezier(...e);
  if (e === 'easeOut') return Easing.out(Easing.quad);
  return Easing.linear;
};

function Content({ content }) {
  if (!content) return null;
  if (content.wear) return <Wear type={content.wear[0]} color={content.wear[1]} size={content.size ?? 52} />;
  if (content.powder) return <PowderIcon size={52} />;
  return (
    <View style={s.center}>
      <Text style={{ color: content.color, fontSize: content.size, fontFamily: content.display ? 'PlayfairDisplay_700Bold' : fonts.sansBold, textShadowColor: content.display ? '#09275e' : undefined, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0.1 }}>
        {content.text}
      </Text>
    </View>
  );
}

const Particle = memo(function Particle({ effect, onDone }) {
  const p = useSharedValue(0);
  const { frames } = effect;

  useEffect(() => {
    p.value = withDelay(effect.delay, withTiming(1, { duration: effect.duration, easing: easingFor(effect.easing) }));
    const t = setTimeout(() => onDone(effect.id), effect.delay + effect.duration + 32);
    return () => clearTimeout(t);
  }, [effect, onDone, p]);

  const style = useAnimatedStyle(() => {
    const f = frameAt({ frames }, p.value);
    return { opacity: f.opacity, transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });

  return (
    <Animated.View pointerEvents="none" style={[s.particle, effect.style, style]}>
      <Content content={effect.content} />
    </Animated.View>
  );
});

// Renders every live effect; each removes itself through onDone when finished.
export default function ParticleLayer({ effects, onDone, style }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {effects.map((e) => <Particle key={e.id} effect={e} onDone={onDone} />)}
    </View>
  );
}

const s = StyleSheet.create({
  particle: { position: 'absolute', left: 0, top: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
