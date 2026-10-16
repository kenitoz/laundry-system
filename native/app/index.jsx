import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Brand from '../src/components/Brand';
import {
  addEffects, bubble, explosionLabels, fly, panels, parts, puff, rebuildDots, ring, smoke, sparks, suckBubbles, traj,
} from '../src/game/effects';
import Machine, { DOOR_CENTER, GLASS_SIZE, MACHINE_WIDTH } from '../src/game/Machine';
import ParticleLayer from '../src/game/ParticleLayer';
import PowderButton from '../src/game/PowderButton';
import { displayText, hintText, isWashing, stage, useWasherGame, WEARS } from '../src/game/useWasherGame';
import WearPicker from '../src/game/WearPicker';
import { useSession } from '../src/session';
import { colors, fonts } from '../src/theme';

const R = Math.random;

export default function Index() {
  const { token, selectedDate } = useSession();
  if (token) return <Redirect href={selectedDate ? '/dashboard' : '/setup'} />;
  return <Landing />;
}

// One of the landing blocks that gets sucked into the door on "Tap to Sign In".
function Block({ i, suck, target, onLayout, children }) {
  const box = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [delta, setDelta] = useState({ dx: 0, dy: 0 });
  useEffect(() => {
    const b = box.current;
    setDelta({ dx: target.x - (b.x + b.w / 2), dy: target.y - (b.y + b.h / 2) });
  }, [target.x, target.y]);
  const sp = (i % 2 ? -1 : 1) * (200 + i * 40);
  const start = 80 + i * 70;
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (suck.value - start) / 1000));
    const k = interpolate(t, [0, 0.25, 0.7, 1], [0, 0.12, 0.6, 1]);
    return {
      opacity: t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3,
      transform: [
        { translateX: delta.dx * k }, { translateY: delta.dy * k },
        { rotate: `${interpolate(t, [0, 0.25, 0.7, 1], [0, sp * 0.06, sp * 0.5, sp])}deg` },
        { scale: interpolate(t, [0, 0.25, 0.7, 1], [1, 1.03, 0.45, 0]) },
      ],
    };
  });
  return (
    <Animated.View
      style={style}
      onLayout={(e) => { box.current = e.nativeEvent.layout; setDelta({ dx: target.x - (box.current.x + box.current.width / 2), dy: target.y - (box.current.y + box.current.height / 2) }); onLayout?.(e); }}
    >
      {children}
    </Animated.View>
  );
}

function Landing() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [game, dispatch] = useWasherGame();
  const gameRef = useRef(game);
  gameRef.current = game;
  const [fx, setFx] = useState([]);
  const [glassFx, setGlassFx] = useState([]);
  const [boost, setBoost] = useState(0);
  const [shake, setShake] = useState(null);
  const [machineBox, setMachineBox] = useState({ x: 0, y: 0, w: MACHINE_WIDTH, h: 300 });
  const toys = useRef({ x: 0, y: 0, width: 300, height: 120 });
  const reduce = useRef(false);
  const entering = useRef(false);
  const timers = useRef(new Set());
  const alive = useRef(true);
  const nId = useRef(0);
  const suck = useSharedValue(0), zoom = useSharedValue(0), pop = useSharedValue(1), fade = useSharedValue(1);

  // Every delayed step goes through later() so unmounting cancels it.
  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => { timers.current.delete(id); if (alive.current) fn(); }, ms);
    timers.current.add(id);
  }, []);
  useEffect(() => {
    alive.current = true;
    const live = timers.current;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduce.current = v; }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => { reduce.current = v; });
    return () => {
      alive.current = false;
      live.forEach(clearTimeout);
      live.clear();
      sub?.remove?.();
    };
  }, []);

  const add = useCallback((list) => setFx((f) => addEffects(f, list)), []);
  const addGlass = useCallback((list) => setGlassFx((f) => addEffects(f, list)), []);
  const done = useCallback((id) => setFx((f) => f.filter((e) => e.id !== id)), []);
  const doneGlass = useCallback((id) => setGlassFx((f) => f.filter((e) => e.id !== id)), []);

  const door = { x: machineBox.x + DOOR_CENTER.x, y: machineBox.y + DOOR_CENTER.y };
  const mr = { x: machineBox.x, y: machineBox.y, w: machineBox.w, h: machineBox.h };
  const inMachine = () => ({ x: mr.x + mr.w * (0.15 + R() * 0.7), y: mr.y + mr.h * (0.1 + R() * 0.6) });
  const wearSpot = () => { const t = toys.current; return { x: t.x + 106 + (t.width - 106) / 2, y: t.y + 54 }; };
  const powderSpot = () => { const t = toys.current; return { x: t.x + 48, y: t.y + t.height / 2 }; };
  const blocked = () => { const g = gameRef.current; return g.exploding || g.broken || g.entering || entering.current; };

  const burst = () => {
    setBoost(4);
    later(() => setBoost((b) => (b === 4 ? 0 : b)), 900);
  };

  const explode = () => {
    setShake({ key: Date.now() + R(), k: 4 });
    add(sparks(10, inMachine()));
    later(() => {
      if (entering.current) return;
      const mcx = mr.x + mr.w / 2, mcy = mr.y + mr.h / 2;
      const clothes = gameRef.current.drum.map((d) => ({
        id: `fx-cloth-${d.id}`, kind: 'cloth', duration: 1500 + R() * 300, delay: 0, easing: 'linear', style: { width: 34, height: 34 }, content: { wear: [d.type, d.color], size: 34 },
        frames: traj(door.x + Math.cos(d.angle) * d.radius - 17, door.y + Math.sin(d.angle) * d.radius - 17, (R() - 0.5) * 260, -(220 + R() * 160), 640, (R() - 0.5) * 900, 0.6, 1, 1.3),
      }));
      const puffs = Array.from({ length: 14 }, () => { const a = R() * Math.PI * 2, rr = 40 + R() * 70; return smoke({ x: mcx, y: mcy }, { size: 40 + R() * 34, duration: 1400 + R() * 700, drift: Math.cos(a) * rr, rise: -(Math.sin(a) * rr + 30), alpha: 0.6 }); });
      add([...panels(mr), ...clothes, ...puffs, ...sparks(26, { x: mcx, y: mcy }), ...explosionLabels(mr)]);
      dispatch({ type: 'finishExplosion' });
    }, 650);
  };

  const hitFx = (hits) => {
    if (hits >= 6) return explode();
    const stg = Math.min(3, Math.floor((hits / 6) * 4));
    setShake({ key: Date.now() + R(), k: 1.2 + stg * 0.7 });
    if (reduce.current) return undefined;
    add(sparks(6 + stg * 5, inMachine()));
    if (stg >= 1) add(parts(stg, mr, height));
    return undefined;
  };

  const tossWear = () => {
    if (blocked()) return;
    const W = WEARS[gameRef.current.wi];
    const placement = { angle: R() * Math.PI * 2, radius: 10 + R() * 36, rotation: R() * 360 };
    const id = 'd' + ++nId.current;
    const land = () => {
      if (blocked()) return;
      const hits = gameRef.current.hits + 1;
      dispatch({ type: 'toss', wear: W, placement, id });
      burst();
      hitFx(hits);
    };
    if (reduce.current) return land();
    add([fly(wearSpot(), door, R, { wear: W })]);
    return later(land, 760);
  };

  const onPowder = () => {
    if (blocked()) return;
    const land = () => {
      dispatch({ type: 'soap' });
      if (!reduce.current) addGlass(puff({ x: GLASS_SIZE / 2, y: GLASS_SIZE / 2 }));
      burst();
      setShake({ key: Date.now() + R(), k: 1 });
    };
    if (reduce.current) { land(); return; }
    add([fly(powderSpot(), door, R, { powder: true })]);
    later(land, 760);
  };

  // Bubbles while washing, smoke at stage 3.
  const washing = isWashing(game);
  const stg = stage(game);
  useEffect(() => {
    if (!washing || reduce.current) return undefined;
    const id = setInterval(() => {
      addGlass([0, 1].map(() => bubble({ x: GLASS_SIZE * (0.15 + R() * 0.7), y: GLASS_SIZE * (0.6 + R() * 0.32) }, R)));
      if (R() < 0.6) {
        const side = R();
        const x = side < 0.5 ? mr.x + R() * mr.w : side < 0.75 ? mr.x + 6 : mr.x + mr.w - 6;
        const y = side < 0.5 ? mr.y + 10 : mr.y + 40 + R() * (mr.h - 80);
        add([bubble({ x, y }, R, { size: 8 + R() * 16, rise: 60 + R() * 80, drift: (side < 0.5 ? 0 : side < 0.75 ? -1 : 1) * (10 + R() * 30), duration: 1800 + R() * 1200 })]);
      }
    }, 170);
    return () => clearInterval(id);
  }, [washing, mr.x, mr.y, mr.w, mr.h, add, addGlass]);
  const smoking = stg === 3 && !game.entering;
  useEffect(() => {
    if (!smoking || reduce.current) return undefined;
    const id = setInterval(() => add([smoke({ x: mr.x + mr.w * (0.15 + R() * 0.7), y: mr.y + 6 }, { size: 16 + R() * 16, duration: 1600 + R() * 800, drift: (R() - 0.5) * 40, rise: 60 + R() * 50, alpha: 0.45 })]), 260);
    return () => clearInterval(id);
  }, [smoking, mr.x, mr.y, mr.w, add]);

  const suckIn = () => {
    setBoost(9);
    add(suckBubbles(door, R));
    for (let i = 0; i < 14; i++) later(() => addGlass([bubble({ x: GLASS_SIZE * (0.15 + R() * 0.7), y: GLASS_SIZE * (0.4 + R() * 0.5) }, R, { duration: 900 + R() * 500 })]), i * 60);
    suck.value = withTiming(1500, { duration: 1500, easing: Easing.linear });
    later(() => {
      zoom.value = withTiming(1, { duration: 700, easing: Easing.bezier(0.6, 0, 0.9, 0.4) });
      fade.value = withSequence(withDelay(530, withTiming(0, { duration: 230 })));
      later(() => router.replace('/login'), 760);
    }, 1300);
  };

  const toLogin = () => {
    if (entering.current) return;
    if (reduce.current) { router.push('/login'); return; }
    entering.current = true;
    const g = gameRef.current;
    if (g.broken || g.exploding) {
      dispatch({ type: 'rebuild' });
      dispatch({ type: 'startEnter' });
      add(rebuildDots(mr, { width: 400, height }, R));
      pop.value = 0;
      pop.value = withDelay(520, withTiming(1, { duration: 560, easing: Easing.bezier(0.3, 1.3, 0.5, 1) }));
      later(() => { add([ring(door)]); later(suckIn, 220); }, 1080);
    } else {
      dispatch({ type: 'startEnter' });
      suckIn();
    }
  };

  const machineStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transformOrigin: `${DOOR_CENTER.x}px ${DOOR_CENTER.y}px`,
    transform: [
      { scale: (0.35 + 0.65 * pop.value) * interpolate(zoom.value, [0, 0.3, 1], [1, 1.15, 9]) },
      { rotate: `${interpolate(zoom.value, [0, 0.3, 1], [0, -4, -18])}deg` },
    ],
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const tilt = stg === 3 ? '-3deg' : stg === 2 ? '-1deg' : '0deg';

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: colors.blue }, fadeStyle]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} scrollEnabled={!game.entering}>
        <View style={[s.land, { paddingTop: insets.top + 14, paddingBottom: 26 + insets.bottom }]} pointerEvents={game.entering ? 'none' : 'auto'}>
          <Block i={0} suck={suck} target={door}><Brand size={46} nameSize={22} gap={12} subColor="#dcecff" /></Block>
          <Block i={1} suck={suck} target={door}>
            <View style={{ marginTop: 18, gap: 8 }}>
              <Text style={s.kicker}>DAILY TRANSACTION MANAGEMENT</Text>
              <Text style={s.h1}>Toss it in. <Text style={s.em}>We'll keep count.</Text></Text>
            </View>
          </Block>
          <View style={[s.machineWrap, { transform: [{ rotate: tilt }] }]} onLayout={(e) => { const l = e.nativeEvent.layout; setMachineBox({ x: l.x, y: l.y, w: l.width, h: l.height }); }}>
            <Machine
              stage={stg}
              display={displayText(game)}
              soap={game.soap}
              drum={game.drum}
              hidden={game.broken}
              spinRate={boost || (washing ? 1.8 : 1)}
              shake={shake}
              animatedStyle={machineStyle}
              glassChildren={<ParticleLayer effects={glassFx} onDone={doneGlass} />}
            />
          </View>
          <Block i={2} suck={suck} target={door}><Text style={s.hint}>{hintText(game)}</Text></Block>
          <Block i={3} suck={suck} target={door} onLayout={(e) => { toys.current = e.nativeEvent.layout; }}>
            <View style={s.toys}>
              <PowderButton soap={game.soap} onPress={onPowder} />
              <WearPicker
                index={game.wi}
                onToss={tossWear}
                onNext={() => dispatch({ type: 'nextWear' })}
                onPrev={() => dispatch({ type: 'prevWear' })}
              />
            </View>
          </Block>
          <Block i={4} suck={suck} target={door}>
            <Pressable accessibilityRole="button" onPress={toLogin} style={({ pressed }) => [s.cta, pressed && { backgroundColor: '#ffdf5e' }]}>
              <Text style={s.ctaText}>Tap to Sign In</Text>
            </Pressable>
          </Block>
          <ParticleLayer effects={fx} onDone={done} />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  land: { flexGrow: 1, paddingHorizontal: 22 },
  kicker: { fontSize: 10, fontFamily: fonts.sansBold, letterSpacing: 1.3, color: '#dcecff' },
  h1: { fontSize: 34, lineHeight: 39, fontFamily: fonts.display, letterSpacing: -1, color: '#fff' },
  em: { fontFamily: fonts.displayItalic, color: colors.yellow },
  machineWrap: { alignSelf: 'center', marginTop: 22 },
  hint: { marginTop: 18, marginBottom: 10, textAlign: 'center', color: '#dcecff', fontSize: 13, fontFamily: fonts.sans },
  toys: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  cta: { marginTop: 22, borderRadius: 12, backgroundColor: colors.yellow, paddingVertical: 16, alignItems: 'center', elevation: 8 },
  ctaText: { color: colors.navy, fontSize: 16, fontFamily: fonts.sansBold },
});
