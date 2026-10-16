import {
  displayText, DRUM_MAX, hintText, HITS_TO_BREAK, initialWasherState, isWashing, stage, washerReducer, WEARS,
} from '../src/game/useWasherGame';

const toss = (s, n = 1) => {
  for (let i = 0; i < n; i++) s = washerReducer(s, { type: 'toss', wear: WEARS[0], placement: { angle: i, radius: 10, rotation: 0 }, id: 'd' + s.tossed });
  return s;
};

test('constants match the web game', () => {
  expect(HITS_TO_BREAK).toBe(6);
  expect(DRUM_MAX).toBe(10);
  expect(WEARS.map((w) => w[2])).toEqual(['Yellow T-shirt', 'Blue shorts', 'Coral socks', 'Green T-shirt', 'Purple shorts', 'White socks']);
});

test('damage stages climb with each hit and the 6th toss explodes', () => {
  const stages = [0, 1, 2, 3, 4, 5].map((n) => stage(toss(initialWasherState, n)));
  expect(stages).toEqual([0, 0, 1, 2, 2, 3]);
  const six = toss(initialWasherState, 6);
  expect(six.exploding).toBe(true);
  expect(stage(six)).toBe(4);
});

test('the drum keeps the 10 newest items', () => {
  let s = { ...initialWasherState };
  for (let i = 0; i < 11; i++) {
    s = washerReducer({ ...s, hits: 0 }, { type: 'toss', wear: WEARS[i % 6], placement: { angle: 0, radius: 0, rotation: 0 }, id: 'd' + i });
  }
  expect(s.drum).toHaveLength(10);
  expect(s.drum[0].id).toBe('d1');
});

test('tosses and soap are ignored while exploding, broken or entering', () => {
  const exploding = toss(initialWasherState, 6);
  expect(washerReducer(exploding, { type: 'toss', wear: WEARS[0], placement: {}, id: 'x' })).toBe(exploding);
  expect(washerReducer(exploding, { type: 'soap' })).toBe(exploding);
  const entering = washerReducer(initialWasherState, { type: 'startEnter' });
  expect(washerReducer(entering, { type: 'soap' })).toBe(entering);
});

test('display text follows the machine state', () => {
  let s = initialWasherState;
  expect(displayText(s)).toBe('0 ITEMS');
  s = washerReducer(s, { type: 'soap' });
  expect(displayText(s)).toBe('0 ITEMS + SOAP');
  s = toss(s);
  expect(displayText(s)).toBe('WASHING');
  expect(isWashing(s)).toBe(true);
  expect(displayText(toss(initialWasherState))).toBe('1 ITEM');
  expect(displayText(toss(initialWasherState, 3))).toBe('ERR · E07');
  expect(displayText(toss(initialWasherState, 5))).toBe('ERR · HOT');
});

test('hints guide the player', () => {
  expect(hintText(initialWasherState)).toBe('Swipe to pick a piece, tap to toss it in.');
  expect(hintText(washerReducer(initialWasherState, { type: 'soap' }))).toBe('Soap is in — add some clothes.');
  expect(hintText(toss(initialWasherState, 2))).toBe('Hmm… that T-shirt hit hard.');
  const broken = washerReducer(toss(initialWasherState, 6), { type: 'finishExplosion' });
  expect(broken.broken).toBe(true);
  expect(hintText(broken)).toBe('No more laundry today — tap to sign in.');
  expect(hintText(washerReducer(broken, { type: 'startEnter' }))).toBe('Hold on — here we go!');
});

test('rebuild resets the machine', () => {
  const broken = washerReducer(toss(washerReducer(initialWasherState, { type: 'soap' }), 6), { type: 'finishExplosion' });
  const fresh = washerReducer(broken, { type: 'rebuild' });
  expect(fresh).toMatchObject({ hits: 0, drum: [], soap: false, tossed: 0, broken: false, exploding: false });
});

test('the wear picker wraps around', () => {
  expect(washerReducer(initialWasherState, { type: 'prevWear' }).wi).toBe(5);
  expect(washerReducer({ ...initialWasherState, wi: 5 }, { type: 'nextWear' }).wi).toBe(0);
});
