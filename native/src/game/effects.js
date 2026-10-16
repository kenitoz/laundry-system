// Short-lived landing-game effects as plain data. Each effect is
// { id, frames, duration, delay, easing, style, content? } where frames are
// { x, y, rotate, scale, opacity, o? } keyframes (o = offset 0..1; evenly spaced if
// omitted). The curves are the web MobileApp's (fly, traj, dropParts, smoke, bubble, suckIn).
export const MAX_EFFECTS = 150;

let seq = 0;
const nextId = () => 'fx' + ++seq;
const F = (x, y, scale = 1, opacity = 1, rotate = 0, o) => (o === undefined ? { x, y, rotate, scale, opacity } : { x, y, rotate, scale, opacity, o });

export const addEffects = (list, more, max = MAX_EFFECTS) => [...list, ...more].slice(-max);

const lerp = (a, b, t) => a + (b - a) * t;

export function frameAt(effect, t) {
  const f = effect.frames, n = f.length;
  const at = (i) => (f[i].o ?? i / (n - 1));
  if (t <= at(0)) return pick(f[0]);
  for (let i = 1; i < n; i++) {
    if (t <= at(i)) {
      const k = (t - at(i - 1)) / (at(i) - at(i - 1) || 1);
      const a = f[i - 1], b = f[i];
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), rotate: lerp(a.rotate, b.rotate, k), scale: lerp(a.scale, b.scale, k), opacity: lerp(a.opacity, b.opacity, k) };
    }
  }
  return pick(f[n - 1]);
}
const pick = ({ x, y, rotate, scale, opacity }) => ({ x, y, rotate, scale, opacity });

// Ballistic path: x linear, y with gravity, spin, optional grow, fade after `fade`.
export function traj(x0, y0, dx, vy, g, rot, fade, s0 = 1, s1 = 1) {
  const frames = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    frames.push(F(x0 + dx * t, y0 + vy * t + g * t * t, s0 + (s1 - s0) * t, t < fade ? 1 : 1 - (t - fade) / (1 - fade), rot * t));
  }
  return frames;
}

const SIZE = 52;
export function fly(from, to, rand = Math.random, content) {
  const x0 = from.x - SIZE / 2, y0 = from.y - SIZE / 2, x1 = to.x - SIZE / 2, y1 = to.y - SIZE / 2;
  const cx = (x0 + x1) / 2 + (rand() - 0.5) * 70, cy = Math.min(y0, y1) - 60 - rand() * 40;
  const rot = (rand() < 0.5 ? -1 : 1) * (280 + rand() * 300);
  const frames = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18, u = 1 - t;
    frames.push(F(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1, 1 - 0.7 * t ** 3, t > 0.85 ? (1 - t) / 0.15 : 1, rot * t));
  }
  return { id: nextId(), kind: 'fly', frames, duration: 760, delay: 0, easing: [0.35, 0.1, 0.55, 1], style: { width: SIZE, height: SIZE }, content };
}

const SPARK_COLORS = ['#ffd436', '#fff3a0', '#f59e3b', '#ffffff'];
export function sparks(n, origin, rand = Math.random) {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI * (0.1 + rand() * 0.8), R = 40 + rand() * 70, s = 3 + rand() * 4;
    return {
      id: nextId(), kind: 'spark', frames: traj(origin.x, origin.y, Math.cos(a) * R, Math.sin(a) * R * 1.6, R * 1.5, 0, 0.5),
      duration: 480 + rand() * 260, delay: 0, easing: 'linear',
      style: { width: s, height: s, borderRadius: s / 2, backgroundColor: SPARK_COLORS[i % 4], shadowColor: '#ffd436', shadowOpacity: 0.9, shadowRadius: 4, elevation: 2 },
    };
  });
}

// Screws and plates that fall off the machine, bounce once and fade.
export function parts(k, mr, floorY, rand = Math.random) {
  return Array.from({ length: k }, () => {
    const screw = rand() < 0.6, w = screw ? 9 : 14, h = 9;
    const x = mr.x + (rand() < 0.5 ? 6 + rand() * 30 : mr.w - 40 + rand() * 30), y = mr.y + 14 + rand() * (mr.h * 0.6);
    const floor = floorY - 26 - h, dx = (rand() - 0.5) * 90, r = (rand() - 0.5) * 720;
    return {
      id: nextId(), kind: 'part', duration: 1500 + rand() * 300, delay: 0, easing: 'linear',
      frames: [F(x, y, 1, 1, 0, 0), F(x + dx * 0.7, floor, 1, 1, r * 0.7, 0.55), F(x + dx * 0.85, floor - 16, 1, 1, r * 0.85, 0.68), F(x + dx, floor, 1, 1, r, 0.8), F(x + dx, floor, 1, 0, r, 1)],
      style: screw
        ? { width: w, height: h, borderRadius: h / 2, backgroundColor: '#c3ccd8', borderWidth: 1.5, borderColor: '#71809a' }
        : { width: w, height: h, borderRadius: 2, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d8dfeb' },
    };
  });
}

export function smoke(origin, { size, duration, drift, rise, alpha }) {
  const x = origin.x - size / 2, y = origin.y - size / 2;
  return {
    id: nextId(), kind: 'smoke', duration, delay: 0, easing: 'easeOut',
    frames: [F(x, y, 0.4, 0, 0, 0), F(x + drift * 0.2, y - rise * 0.2, 0.8, 1, 0, 0.2), F(x + drift, y - rise, 1.6, 0, 0, 1)],
    style: { width: size, height: size, borderRadius: size / 2, backgroundColor: `rgba(96,113,142,${alpha})` },
  };
}

const BUBBLE_STYLE = (size) => ({ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.85)', backgroundColor: 'rgba(255,255,255,.25)' });

export function bubble(origin, rand = Math.random, opts = {}) {
  const size = opts.size ?? 6 + rand() * 14, rise = opts.rise ?? 30 + rand() * 50, drift = opts.drift ?? (rand() - 0.5) * 20;
  const x = origin.x - size / 2, y = origin.y - size / 2;
  const at = (t, opacity) => F(x + drift * t, y - rise * t, 0.3 + 0.7 * t, opacity, 0, t);
  return {
    id: nextId(), kind: 'bubble', duration: opts.duration ?? 1400 + rand() * 1000, delay: opts.delay ?? 0, easing: [0.3, 0.6, 0.4, 1],
    frames: [at(0, 0), at(0.15, 1), at(0.8, 0.9), at(1, 0)], style: BUBBLE_STYLE(size),
  };
}

// The machine breaks into a 3×4 grid of pieces flung outward (no clip-path on
// native, so pieces get uneven corners instead of jagged edges).
export function panels(mr, rand = Math.random) {
  const cols = 3, rows = 4, cw = mr.w / cols, ch = mr.h / rows;
  const mcx = mr.x + mr.w / 2, mcy = mr.y + mr.h / 2, pcy = mr.y + mr.h - 108;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = mr.x + c * cw, y = mr.y + r * ch, ccx = x + cw / 2, ccy = y + ch / 2, port = Math.hypot(ccx - mcx, ccy - pcy) < 78;
    const corner = () => 2 + rand() * 14;
    out.push({
      id: nextId(), kind: 'panel', duration: 1300 + rand() * 400, delay: 0, easing: 'linear',
      frames: traj(x - 3, y - 3, (ccx - mcx) * (2.4 + rand() * 2) + (rand() - 0.5) * 60, -(150 + rand() * 170) + (ccy - mcy) * 0.8, 560 + rand() * 200, (rand() < 0.5 ? -1 : 1) * (200 + rand() * 420), 0.55),
      style: {
        width: cw + 6, height: ch + 6, backgroundColor: port ? '#cfe0f7' : '#fff', borderWidth: 3, borderColor: port ? '#fff' : '#e6eaf1',
        borderTopLeftRadius: corner(), borderTopRightRadius: corner(), borderBottomLeftRadius: corner(), borderBottomRightRadius: corner(),
      },
    });
  }
  return out;
}

// Flash, flung "ERR" display and knob, and the KABOOM! word.
export function explosionLabels(mr) {
  const mcx = mr.x + mr.w / 2, mcy = mr.y + mr.h / 2;
  return [
    { id: nextId(), kind: 'flash', duration: 480, delay: 0, easing: 'easeOut', frames: [F(mcx - 30, mcy - 30, 0.2, 1), F(mcx - 30, mcy - 30, 5.5, 0)], style: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,240,180,.95)' } },
    { id: nextId(), kind: 'label', duration: 1500, delay: 0, easing: 'linear', frames: traj(mr.x + 14, mr.y + 12, -110, -260, 620, -380, 0.6), style: { width: 96, height: 24, borderRadius: 6, backgroundColor: '#09275e' }, content: { text: 'ERR', color: '#ff8a7a', size: 11 } },
    { id: nextId(), kind: 'knob', duration: 1500, delay: 0, easing: 'linear', frames: traj(mr.x + mr.w - 80, mr.y + 12, 120, -300, 640, 720, 0.6), style: { width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: '#d8dfeb', backgroundColor: '#f3f7ff' } },
    {
      id: nextId(), kind: 'kaboom', duration: 1150, delay: 0, easing: 'easeOut',
      frames: [F(mcx - 90, mcy - 24, 0, 1, -8, 0), F(mcx - 90, mcy - 24, 1.25, 1, -8, 0.22), F(mcx - 90, mcy - 24, 1, 1, -6, 0.7), F(mcx - 90, mcy - 29, 1.08, 0, -6, 1)],
      style: { width: 180, height: 48 }, content: { text: 'KABOOM!', color: '#ffd436', size: 36, display: true },
    },
  ];
}

const DOT_COLORS = ['#ffd436', '#ffffff', '#a7c7fb', '#dcecff'];
export function rebuildDots(mr, bounds, rand = Math.random) {
  return Array.from({ length: 46 }, (_, i) => {
    const s = 3 + rand() * 5, a = rand() * Math.PI * 2, R = 140 + rand() * 120;
    const tx = mr.x + 10 + rand() * (mr.w - 20), ty = mr.y + 10 + rand() * (mr.h - 20);
    const sx = Math.max(-20, Math.min(bounds.width + 20, tx + Math.cos(a) * R)), sy = ty + Math.sin(a) * R;
    return {
      id: nextId(), kind: 'dot', duration: 760 + rand() * 220, delay: rand() * 160, easing: [0.4, 0, 0.2, 1],
      frames: [F(sx, sy, 0.4, 0, 0, 0), F(lerp(sx, tx, 0.25 / 0.85), lerp(sy, ty, 0.25 / 0.85), lerp(0.4, 1, 0.25 / 0.85), 1, 0, 0.25), F(tx, ty, 1, 1, 0, 0.85), F(tx, ty, 0, 0, 0, 1)],
      style: { width: s, height: s, borderRadius: s / 2, backgroundColor: DOT_COLORS[i % 4], shadowColor: '#ffd436', shadowOpacity: 0.55, shadowRadius: 5 },
    };
  });
}

export const ring = (center) => ({
  id: nextId(), kind: 'ring', duration: 520, delay: 0, easing: 'easeOut',
  frames: [F(center.x - 40, center.y - 40, 0.6, 1), F(center.x - 40, center.y - 40, 3.4, 0)],
  style: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#ffd436' },
});

// Bubbles spiralling into the door during "Tap to Sign In".
export function suckBubbles(center, rand = Math.random) {
  return Array.from({ length: 34 }, () => {
    const a0 = rand() * Math.PI * 2, R0 = 110 + rand() * 110, s = 6 + rand() * 14, turn = Math.PI * (1.4 + rand());
    const frames = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, a = a0 + turn * t, r = R0 * (1 - t);
      frames.push(F(center.x + Math.cos(a) * r - s / 2, center.y + Math.sin(a) * r - s / 2, 1 - 0.8 * t, t < 0.15 ? t / 0.15 : t > 0.9 ? (1 - t) * 10 : 0.95));
    }
    return { id: nextId(), kind: 'bubble', frames, duration: 900 + rand() * 400, delay: rand() * 700, easing: [0.5, 0, 0.9, 0.6], style: BUBBLE_STYLE(s) };
  });
}

// White droplets bursting from the door when powder lands.
export function puff(center, rand = Math.random) {
  return Array.from({ length: 16 }, () => {
    const a = rand() * Math.PI * 2, r = 20 + rand() * 40, s = 3 + rand() * 5;
    return {
      id: nextId(), kind: 'puff', duration: 600 + rand() * 300, delay: 0, easing: 'easeOut',
      frames: [F(center.x, center.y, 1, 1), F(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r, 1, 0)],
      style: { width: s, height: s, borderRadius: s / 2, backgroundColor: '#fff' },
    };
  });
}
