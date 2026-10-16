import { act, render } from '@testing-library/react-native';

import { useRemote } from '../src/useRemote';

let remote;
function Probe({ loader, dep }) {
  remote = useRemote(loader, [dep]);
  return null;
}

test('loads, exposes errors and reloads', async () => {
  const loader = jest.fn().mockRejectedValueOnce(Object.assign(new Error('nope'), { status: 0 })).mockResolvedValue('ok');
  await render(<Probe loader={loader} dep={1} />);
  expect(remote.error.message).toBe('nope');
  expect(remote.loading).toBe(false);
  await act(() => remote.reload());
  expect(remote.data).toBe('ok');
  expect(remote.error).toBeNull();
});

test('ignores a stale result after the deps change', async () => {
  let resolveSlow;
  const slow = jest.fn(() => new Promise((r) => { resolveSlow = r; }));
  const fast = jest.fn().mockResolvedValue('new');
  const view = await render(<Probe loader={slow} dep={1} />);
  await view.rerender(<Probe loader={fast} dep={2} />);
  await act(async () => resolveSlow('old'));
  expect(remote.data).toBe('new');
});

test('mutate updates the data in place', async () => {
  await render(<Probe loader={jest.fn().mockResolvedValue([1, 2])} dep={1} />);
  await act(() => remote.mutate((d) => d.filter((n) => n !== 1)));
  expect(remote.data).toEqual([2]);
});
