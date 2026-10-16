import { render, screen } from '@testing-library/react-native';

import Index from '../app/index';

test('renders the placeholder start screen', async () => {
  await render(<Index />);
  expect(screen.getByText('Bubblebee')).toBeTruthy();
});
