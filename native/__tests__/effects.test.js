import {
  addEffects, bubble, fly, frameAt, MAX_EFFECTS, panels, parts, rebuildDots, smoke, sparks, suckBubbles,
} from '../src/game/effects';

const seeded = (seed = 7) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rect = { x: 50, y: 100, w: 232, h: 300 };

test('addEffects caps the list and drops the oldest', () => {
  const old = Array.from({ length: 149 }, (_, i) => ({ id: 'o' + i }));
  const next = addEffects(old, Array.from({ length: 5 }, (_, i) => ({ id: 'n' + i })));
  expect(MAX_EFFECTS).toBe(150);
  expect(next).toHaveLength(150);
  expect(next[0].id).toBe('o4');
  expect(next.at(-1).id).toBe('n4');
});

test('a flying item starts at the source and lands faded in the door', () => {
  const f = fly({ x: 100, y: 600 }, { x: 200, y: 250 }, seeded());
  expect(frameAt(f, 0)).toMatchObject({ x: 74, y: 574, opacity: 1, scale: 1 });
  const end = frameAt(f, 1);
  expect(end.x).toBeCloseTo(174);
  expect(end.y).toBeCloseTo(224);
  expect(end.opacity).toBeCloseTo(0);
  expect(f.duration).toBe(760);
});

test('frameAt interpolates between keyframes', () => {
  const e = { frames: [{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }, { x: 10, y: 20, rotate: 90, scale: 2, opacity: 0 }] };
  expect(frameAt(e, 0.5)).toEqual({ x: 5, y: 10, rotate: 45, scale: 1.5, opacity: 0.5 });
});

test('explosion and rebuild produce the web counts', () => {
  expect(panels(rect, seeded())).toHaveLength(12);
  expect(rebuildDots(rect, { width: 390, height: 844 }, seeded())).toHaveLength(46);
  expect(suckBubbles({ x: 195, y: 300 }, seeded())).toHaveLength(34);
  expect(sparks(6, { x: 10, y: 10 }, seeded())).toHaveLength(6);
  expect(parts(2, rect, 800, seeded())).toHaveLength(2);
});

test('factories are deterministic for a given random source', () => {
  const noIds = (list) => list.map(({ id, ...rest }) => rest);
  expect(noIds(sparks(3, { x: 1, y: 2 }, seeded(3)))).toEqual(noIds(sparks(3, { x: 1, y: 2 }, seeded(3))));
  expect(smoke({ x: 5, y: 5 }, { size: 20, duration: 1000, drift: 4, rise: 50, alpha: 0.5 }, seeded()).frames).toHaveLength(3);
  expect(bubble({ x: 5, y: 5 }, seeded()).frames.at(-1).opacity).toBe(0);
});

test('every effect has a unique id', () => {
  const all = [...sparks(10, { x: 0, y: 0 }, seeded()), ...panels(rect, seeded())];
  expect(new Set(all.map((e) => e.id)).size).toBe(all.length);
});
