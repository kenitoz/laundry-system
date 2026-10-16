import { useReducer } from 'react';

// Rules of the landing mini-game, ported from the web MobileApp (hit/stage/hint logic).
export const HITS_TO_BREAK = 6;
export const DRUM_MAX = 10;
export const WEARS = [
  ['shirt', '#ffd436', 'Yellow T-shirt'],
  ['shorts', '#1762c5', 'Blue shorts'],
  ['sock', '#e86a5a', 'Coral socks'],
  ['shirt', '#3bb38a', 'Green T-shirt'],
  ['shorts', '#9b7be0', 'Purple shorts'],
  ['sock', '#ffffff', 'White socks'],
];

export const initialWasherState = { drum: [], tossed: 0, soap: false, hits: 0, broken: false, exploding: false, entering: false, wi: 0 };

const blocked = (s) => s.exploding || s.broken || s.entering;

export function washerReducer(s, a) {
  switch (a.type) {
    case 'toss': {
      if (blocked(s)) return s;
      const [type, color] = a.wear;
      const hits = s.hits + 1;
      return {
        ...s,
        drum: [...s.drum, { id: a.id, type, color, ...a.placement }].slice(-DRUM_MAX),
        tossed: s.tossed + 1,
        hits,
        exploding: hits >= HITS_TO_BREAK,
      };
    }
    case 'soap':
      return blocked(s) ? s : { ...s, soap: true };
    case 'nextWear':
      return { ...s, wi: (s.wi + 1) % WEARS.length };
    case 'prevWear':
      return { ...s, wi: (s.wi + WEARS.length - 1) % WEARS.length };
    case 'finishExplosion':
      return { ...s, exploding: false, broken: true };
    case 'startEnter':
      return { ...s, entering: true };
    case 'rebuild':
      return { ...s, hits: 0, drum: [], soap: false, tossed: 0, broken: false, exploding: false };
    default:
      return s;
  }
}

export const stage = (s) => (s.broken || s.exploding ? 4 : Math.min(3, Math.floor((s.hits / HITS_TO_BREAK) * 4)));

export const isWashing = (s) => s.soap && s.drum.length > 0 && !s.broken && !s.exploding && !s.entering;

export function displayText(s) {
  const stg = stage(s);
  if (stg === 3) return 'ERR · HOT';
  if (stg === 2) return 'ERR · E07';
  if (s.soap && s.drum.length) return 'WASHING';
  return s.tossed + (s.tossed === 1 ? ' ITEM' : ' ITEMS') + (s.soap ? ' + SOAP' : '');
}

export function hintText(s) {
  const stg = stage(s);
  if (s.entering) return 'Hold on — here we go!';
  if (s.broken || s.exploding) return 'No more laundry today — tap to sign in.';
  if (stg === 3) return "It's smoking! Careful with those T-shirts…";
  if (stg === 2) return "Uh oh — it's making weird noises.";
  if (stg === 1) return 'Hmm… that T-shirt hit hard.';
  if (s.soap && s.drum.length) return 'Washing… keep tossing for a bigger load.';
  if (s.drum.length) return 'Now toss in some powder.';
  if (s.soap) return 'Soap is in — add some clothes.';
  return 'Swipe to pick a piece, tap to toss it in.';
}

export const useWasherGame = () => useReducer(washerReducer, initialWasherState);
