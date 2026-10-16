import { DOT_ORDER, stepTab, TAB_CYCLE, TAB_LABELS } from '../src/tabs';

test('stepTab cycles All → Unpaid → Paid like the web carousel', () => {
  expect(TAB_CYCLE).toEqual(['all', 'unpaid', 'paid']);
  expect(stepTab('all', 1)).toBe('unpaid');
  expect(stepTab('paid', 1)).toBe('all');
  expect(stepTab('all', -1)).toBe('paid');
  expect(DOT_ORDER).toEqual(['paid', 'all', 'unpaid']);
  expect(TAB_LABELS.all).toBe("Today's All Customers");
});
