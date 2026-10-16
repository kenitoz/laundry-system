import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import { signedIn } from './helpers/backend';

const tossOnce = async () => {
  await fireEvent(screen.getByLabelText(/tap to toss, swipe to change$/), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  await act(async () => { jest.advanceTimersByTime(800); });
};

beforeEach(async () => {
  await signedIn({ token: null });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('the landing screen starts with the first hint', async () => {
  await renderRouter('./app', { initialUrl: '/' });
  expect(await screen.findByText('Swipe to pick a piece, tap to toss it in.')).toBeTruthy();
  expect(screen.getByText('Yellow T-shirt')).toBeTruthy();
});

test('powder lands in the machine', async () => {
  await renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('POWDER');
  jest.useFakeTimers();
  await fireEvent.press(screen.getByLabelText('Toss laundry powder into the machine'));
  await act(async () => { jest.advanceTimersByTime(800); });
  expect(screen.getByText('MORE SOAP')).toBeTruthy();
  expect(screen.getByText('Soap is in — add some clothes.')).toBeTruthy();
});

test('six tosses break the machine', async () => {
  await renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('POWDER');
  jest.useFakeTimers();
  for (let i = 0; i < 6; i++) await tossOnce();
  await act(async () => { jest.advanceTimersByTime(3000); });
  expect(screen.getByText('No more laundry today — tap to sign in.')).toBeTruthy();
});

test('with reduced motion, Tap to Sign In goes straight to login', async () => {
  AccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);
  const view = await renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('POWDER');
  await fireEvent.press(screen.getByRole('button', { name: 'Tap to Sign In' }));
  await waitFor(() => expect(view.getPathname()).toBe('/login'));
});

test('leaving mid-animation cancels the pending steps', async () => {
  const errors = jest.spyOn(console, 'error');
  const replace = jest.spyOn(router, 'replace');
  const view = await renderRouter('./app', { initialUrl: '/' });
  await screen.findByText('POWDER');
  jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  for (let i = 0; i < 6; i++) await tossOnce(); // explosion under way
  await fireEvent.press(screen.getByRole('button', { name: 'Tap to Sign In' })); // rebuild + suck-in scheduled
  await view.unmount();
  await act(async () => { jest.advanceTimersByTime(6000); });
  expect(replace).not.toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
});
