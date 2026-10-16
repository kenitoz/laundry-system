export const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2020, i).toLocaleString('en', { month: 'long' }));

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export const money = (n) => peso.format(Number(n) || 0);

export const shortMoney = (n) => (n >= 1000 ? '₱' + (n / 1000).toFixed(1).replace('.0', '') + 'k' : '₱' + Math.round(n));

export const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const todayISO = (now = new Date()) => ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());

// Noon avoids the date shifting across midnight in any time zone.
export const fmtDate = (iso, month = 'short') =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-PH', { month, day: 'numeric', year: 'numeric' });

// Calendar cells for a month: leading nulls up to the 1st's weekday (Sunday first),
// the day numbers, then nulls to complete the last week.
export function buildCalendar(year, month) {
  const cells = Array(new Date(year, month - 1, 1).getDay()).fill(null);
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}
