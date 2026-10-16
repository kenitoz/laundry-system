import { renderRouter, screen } from 'expo-router/testing-library';

import { signedIn } from './helpers/backend';

test('signed-out users see the start screen', async () => {
  await signedIn({ token: null });
  await renderRouter('./app', { initialUrl: '/' });
  expect(await screen.findByText('Tap to Sign In')).toBeTruthy();
});
