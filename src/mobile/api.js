const API = import.meta.env.VITE_API_URL || '/api';

export async function api(path, opt = {}) {
  const token = localStorage.getItem('token');
  let res;
  try {
    res = await fetch(API + path, {
      ...opt,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...opt.headers,
      },
    });
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Check your connection and try again.'), { status: 0 });
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  }

  return data;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const money = (n) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(n) || 0);

export const shortMoney = (n) => (n >= 1000 ? '₱' + (n / 1000).toFixed(1).replace('.0', '') + 'k' : '₱' + Math.round(n));
