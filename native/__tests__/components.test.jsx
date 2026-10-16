import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import ConfirmModal from '../src/components/ConfirmModal';
import ErrorBanner from '../src/components/ErrorBanner';
import Magnifier from '../src/components/Magnifier';
import SaveAnimation from '../src/components/SaveAnimation';
import SwipePager from '../src/components/SwipePager';

const tx = { name: 'Ana', total: 120, time: '1:23 PM', date: 'January 1, 2026' };

test('ConfirmModal tx kind names the customer, amount and time', async () => {
  await render(<ConfirmModal visible kind="tx" subject={tx} onConfirm={() => {}} onCancel={() => {}} />);
  expect(screen.getByText("Delete Ana's transaction?")).toBeTruthy();
  const body = screen.getByText(/This removes the/);
  expect(body.props.children).toContain('₱120.00');
  expect(body.props.children).toContain('1:23 PM');
  expect(screen.getByText('PERMANENT DELETION')).toBeTruthy();
});

test('ConfirmModal ignores confirm presses while busy', async () => {
  const onConfirm = jest.fn();
  await render(<ConfirmModal visible busy kind="tx" subject={tx} onConfirm={onConfirm} onCancel={() => {}} />);
  await fireEvent.press(screen.getByText('Deleting…'));
  expect(onConfirm).not.toHaveBeenCalled();
});

test('ConfirmModal sign-out and credential copy match the web', async () => {
  const view = await render(<ConfirmModal visible kind="signout" onConfirm={() => {}} onCancel={() => {}} />);
  expect(screen.getByText('Yes, Sign Out')).toBeTruthy();
  expect(screen.getByText('Sign Out of Bubblebee Laundry Shop?')).toBeTruthy();
  await view.rerender(<ConfirmModal visible kind="cred" error="Current password is incorrect." onConfirm={() => {}} onCancel={() => {}} />);
  expect(screen.getByText('Yes, Save Changes')).toBeTruthy();
  expect(screen.getByText('Current password is incorrect.')).toBeTruthy();
});

test('ConfirmModal year kind shows the label', async () => {
  await render(<ConfirmModal visible kind="year" subject={{ label: '2026' }} onConfirm={() => {}} onCancel={() => {}} />);
  expect(screen.getByText('Are you sure you want to delete 2026?')).toBeTruthy();
});

test('ErrorBanner shows Retry only with a handler', async () => {
  const view = await render(<ErrorBanner message="Can't reach the server. Check your connection." />);
  expect(screen.queryByText('Retry')).toBeNull();
  const onRetry = jest.fn();
  await view.rerender(<ErrorBanner message="x" onRetry={onRetry} />);
  await fireEvent.press(screen.getByText('Retry'));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('Magnifier shows status and balance', async () => {
  await render(<Magnifier tx={{ name: 'Ana', time: '2:54 PM', total: 1000, paid: 100 }} origin={{ x: 10, y: 10 }} onClose={() => {}} />);
  expect(screen.getByText('PARTIALLY PAID')).toBeTruthy();
  expect(screen.getByText('₱900.00')).toBeTruthy();
});

test('SaveAnimation calls onDone once after about 2.1 seconds', async () => {
  jest.useFakeTimers();
  const onDone = jest.fn();
  await render(<SaveAnimation visible name="ANA" onDone={onDone} />);
  jest.advanceTimersByTime(2000);
  expect(onDone).not.toHaveBeenCalled();
  jest.advanceTimersByTime(300);
  expect(onDone).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

test('SwipePager dots jump to a list', async () => {
  const onChange = jest.fn();
  await render(
    <GestureHandlerRootView>
      <SwipePager tab="all" onChange={onChange} renderPage={(t) => <Text>{'page-' + t}</Text>} />
    </GestureHandlerRootView>,
  );
  expect(screen.getAllByText("Today's All Customers").length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByLabelText('Paid Customers'));
  expect(onChange).toHaveBeenCalledWith('paid');
});
