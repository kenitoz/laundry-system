import { buildCalendar, fmtDate, money, MONTHS, shortMoney, todayISO, ymd } from '../src/format';

test('shortMoney abbreviates thousands like the web calendar', () => {
  expect(shortMoney(950)).toBe('₱950');
  expect(shortMoney(1200)).toBe('₱1.2k');
  expect(shortMoney(2000)).toBe('₱2k');
});

test('money formats pesos with two decimals', () => {
  expect(money(1250)).toContain('1,250.00');
  expect(money('abc')).toContain('0.00');
});

test('buildCalendar pads leading blanks and whole weeks', () => {
  const feb26 = buildCalendar(2026, 2); // 1 Feb 2026 is a Sunday
  expect(feb26.length % 7).toBe(0);
  expect(feb26[0]).toBe(1);
  expect(feb26.filter((d) => d !== null)).toHaveLength(28);
  expect(buildCalendar(2028, 2).filter((d) => d !== null)).toHaveLength(29);
  const jan26 = buildCalendar(2026, 1); // 1 Jan 2026 is a Thursday
  expect(jan26.slice(0, 5)).toEqual([null, null, null, null, 1]);
});

test('date helpers use local dates', () => {
  expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  expect(ymd(2026, 3, 9)).toBe('2026-03-09');
  expect(fmtDate('2026-01-01')).toContain('2026');
  expect(fmtDate('2026-01-01', 'long')).toContain('January');
  expect(MONTHS).toHaveLength(12);
  expect(MONTHS[0]).toBe('January');
});
