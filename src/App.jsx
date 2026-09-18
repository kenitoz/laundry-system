import { useEffect, useRef, useState } from 'react';
import './App.css';
import './dashboard.css';
import './brand.css';

const API = import.meta.env.VITE_API_URL || '/api';
const money = (n) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(n) || 0);

const names = Array.from({ length: 12 }, (_, i) =>
  new Date(2020, i).toLocaleString('en', { month: 'long' })
);

async function api(path, opt = {}) {
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
    throw new Error('Cannot reach the server. Start Flask with python app.py in the backend folder.');
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function Logo({ compact = false }) {
  return <img className={compact ? 'brand-logo compact' : 'brand-logo'} src="/bubblebee-logo.jpg" alt="Bubblebee Laundry Shop" />;
}
function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="trash-icon" focusable="false">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="sidebar-icon" focusable="false">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .8v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.8l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.8-3H4a1.8 1.8 0 0 1 0-3h.2a1.8 1.8 0 0 0 .8-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.8V2.5a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .8l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .8 3h.2a1.8 1.8 0 0 1 0 3h-.2a1.8 1.8 0 0 0-.8 3Z" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.7 6a11.6 11.6 0 0 1-3.1 3.4M6.2 6.2C3.8 7.6 2.6 10 2.3 10.5 3.5 12.5 7 16 12 16c.8 0 1.6-.1 2.3-.3" />
        </>
      ) : (
        <>
          <path d="M2.3 10.5C3.5 8.5 7 5 12 5s8.5 3.5 9.7 5.5C20.5 12.5 17 16 12 16s-8.5-3.5-9.7-5.5Z" />
          <circle cx="12" cy="10.5" r="2.5" />
        </>
      )}
    </svg>
  );
}

function DeleteModal({ target, busy, onCancel, onConfirm }) {
  if (!target) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
        <div className="warning-icon">!</div>
        <p className="modal-kicker">PERMANENT DELETION</p>
        <h2 id="delete-title">Are you sure you want to delete {target.label}?</h2>
        <p className="modal-warning">Warning: This action cannot be undone. All associated customer records, daily transactions, and financial data for this timeframe will be permanently removed.</p>
        {target.error && <p className="modal-error">{target.error}</p>}
        <div className="modal-actions">
          <button type="button" className="cancel-button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="delete-button" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
        </div>
      </section>
    </div>
  );
}

function SignOutModal({ open, onCancel, onConfirm }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const modal = modalRef.current;
    const focusable = modal?.querySelectorAll('button:not([disabled])') || [];
    focusable[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      if (event.key !== 'Tab' || focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop signout-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        ref={modalRef}
        className="signout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-title"
        aria-describedby="signout-description"
      >
        <div className="signout-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
            <path d="m13 16 4-4-4-4M8 12h9" />
          </svg>
        </div>
        <h2 id="signout-title">Sign Out of Bubblebee Laundry Shop?</h2>
        <p id="signout-description">Are you sure you want to log out? Any unsaved changes in active transaction drafts may be lost.</p>
        <div className="signout-actions">
          <button type="button" className="signout-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="signout-confirm" onClick={onConfirm}>Yes, Sign Out</button>
        </div>
      </section>
    </div>
  );
}

function CredentialUpdateModal({ open, onCancel, onConfirm, busy }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop credential-update-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="credential-update-modal" role="dialog" aria-modal="true" aria-labelledby="credential-update-title" aria-describedby="credential-update-description">
        <div className="credential-update-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h2 id="credential-update-title">Confirm Credential Update</h2>
        <p id="credential-update-description">Are you sure you want to update your login credentials? You will need to use these new credentials for future logins.</p>
        <div className="credential-update-actions">
          <button type="button" className="credential-update-cancel" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="credential-update-confirm" onClick={onConfirm} disabled={busy}>{busy ? 'Saving...' : 'Yes, Save Changes'}</button>
        </div>
      </section>
    </div>
  );
}

function Head({ pre, title, sub }) {
  return (
    <header>
      <p>{pre}</p>
      <h1>{title}</h1>
      <span>{sub || 'Keep your laundry shop records clear and organized.'}</span>
    </header>
  );
}

function Stat({ title, value, icon = '₱' }) {
  return (
    <article className="stat">
      <span>{icon}</span>
      <p>{title}</p>
      <strong>{value}</strong>
    </article>
  );
}

function Login({ done }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e) {
    e.preventDefault();
    try {
      const d = await api('/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      localStorage.setItem('token', d.token);
      done({ username: d.username || form.username });
    } catch (x) {
      setError(x.message);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <section className="login-brand-panel">
          <div className="login-brand-lockup">
            <Logo />
            <div>
              <b>Bubblebee</b>
              <small>Laundry Shop</small>
            </div>
          </div>
          <div className="intro">
            <p>DAILY TRANSACTION MANAGEMENT</p>
            <h1>Fresh records.<br /><em>Clear days.</em></h1>
            <span>Keep every wash, payment, and customer neatly in one place.</span>
          </div>
          <small className="login-brand-footer">Trusted laundry records, beautifully organized.</small>
        </section>

        <form className="login-form" aria-label="Sign in" autoComplete="off" onSubmit={submit}>
          {error && <div className="error">{error}</div>}

          <label>
            Username or email
            <input
              name="username"
              autoComplete="off"
              placeholder="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>

          <label>
            Password
            <div className="password-control">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.7 6a11.6 11.6 0 0 1-3.1 3.4M6.2 6.2C3.8 7.6 2.6 10 2.3 10.5 3.5 12.5 7 16 12 16c.8 0 1.6-.1 2.3-.3" />
                    </>
                  ) : (
                    <>
                      <path d="M2.3 10.5C3.5 8.5 7 5 12 5s8.5 3.5 9.7 5.5C20.5 12.5 17 16 12 16s-8.5-3.5-9.7-5.5Z" />
                      <circle cx="12" cy="10.5" r="2.5" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </label>

          <button className="login-submit">Sign in <span aria-hidden="true">→</span></button>
        </form>
      </div>
    </div>
  );
}

function SettingsPasswordField({ label, value, onChange, visible, onToggle }) {
  return (
    <label>
      {label}
      <div className="settings-secret-control">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="settings-password-toggle"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggle}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
    </label>
  );
}

function Settings({ onSignOut, onCredentialsChanged }) {
  const [account, setAccount] = useState({ username: '' });
  const [form, setForm] = useState({ newUsername: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visibility, setVisibility] = useState({ current: false, next: false, confirm: false });
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [credentialUpdateOpen, setCredentialUpdateOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api('/account')
      .then((data) => {
        if (active) setAccount(data.account);
      })
      .catch((x) => {
        if (active) setError(x.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    setError('');
    setSuccess('');
    const usernameRequested = Boolean(form.newUsername.trim());
    const passwordRequested = Boolean(form.newPassword || form.confirmPassword);
    if (!usernameRequested && !passwordRequested) {
      setError('Enter a new username or complete the password fields before saving.');
      return false;
    }
    if (usernameRequested && !/^[A-Za-z0-9_]{3,32}$/.test(form.newUsername.trim())) {
      setError('Username must be 3-32 characters using only letters, numbers, or underscores.');
      return false;
    }
    if (!form.currentPassword) {
      setError('Enter your current password to change account credentials.');
      return false;
    }
    if (passwordRequested && (!form.newPassword || !form.confirmPassword)) {
      setError('Complete all password fields before saving.');
      return false;
    }
    if (passwordRequested && form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return false;
    }
    return true;
  };

  async function confirmUpdate() {
    setBusy(true);
    try {
      const data = await api('/account', {
        method: 'PUT',
        body: JSON.stringify({
          new_username: usernameRequested ? form.newUsername.trim() : '',
          current_password: form.currentPassword,
          new_password: form.newPassword,
          confirm_password: form.confirmPassword,
        }),
      });
      setAccount((current) => ({ ...current, username: data.username }));
      setForm({ newUsername: '', currentPassword: '', newPassword: '', confirmPassword: '' });
      setVisibility({ current: false, next: false, confirm: false });
      setCredentialUpdateOpen(false);
      onCredentialsChanged(data.username);
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (validateForm()) setCredentialUpdateOpen(true);
  }

  return (
    <div className="settings-view">
      <section className="settings-page">
        <header className="settings-header">
          <p>ACCOUNT</p>
          <h1>Account settings</h1>
          <span>Manage the credentials used to access your laundry records.</span>
        </header>

        {success && <div className="settings-toast" role="status">{success}</div>}
        {error && <div className="settings-error" role="alert">{error}</div>}

        <form className="settings-form" onSubmit={submit} autoComplete="off">
          <section className="settings-section">
            <div className="settings-section-heading">
              <h2>Username</h2>
              <span>Use a unique username to identify your account.</span>
            </div>
            <label>
              Current username
              <input value={account.username} readOnly disabled />
            </label>
            <label>
              New username
              <input
                autoComplete="off"
                placeholder="Enter new username"
                value={form.newUsername}
                onChange={(e) => updateField('newUsername', e.target.value)}
              />
            </label>
            <div className="settings-inline-action">
              <button type="submit" className="settings-save" disabled={busy}>Save changes</button>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-heading">
              <h2>Change password</h2>
              <span>Use a strong password you do not reuse elsewhere.</span>
            </div>
            <SettingsPasswordField label="Current password" value={form.currentPassword} onChange={(e) => updateField('currentPassword', e.target.value)} visible={visibility.current} onToggle={() => setVisibility((current) => ({ ...current, current: !current.current }))} />
            <SettingsPasswordField label="New password" value={form.newPassword} onChange={(e) => updateField('newPassword', e.target.value)} visible={visibility.next} onToggle={() => setVisibility((current) => ({ ...current, next: !current.next }))} />
            <SettingsPasswordField label="Confirm new password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} visible={visibility.confirm} onToggle={() => setVisibility((current) => ({ ...current, confirm: !current.confirm }))} />
          </section>

        </form>

        <section className="settings-account-actions">
          <div>
            <p>ACCOUNT ACTIONS</p>
            <h2>Sign out</h2>
            <span>End your current session on this device.</span>
          </div>
          <button type="button" className="settings-signout" onClick={() => setSignOutOpen(true)}>Sign out</button>
        </section>
      </section>
      <CredentialUpdateModal open={credentialUpdateOpen} onCancel={() => setCredentialUpdateOpen(false)} onConfirm={confirmUpdate} busy={busy} />
      <SignOutModal open={signOutOpen} onCancel={() => setSignOutOpen(false)} onConfirm={onSignOut} />
    </div>
  );
}

function Side({ page, setPage, selectedDate }) {
  return (
    <aside>
      <div className="brand">
        <Logo />
        <b>
          Bubblebee<small>Laundry Shop</small>
        </b>
      </div>

      <nav>
        <button className={page === 'dash' ? 'on' : ''} onClick={() => setPage('dash')}>
          ▦ <span>Dashboard</span>
        </button>
        <button className={page === 'add' ? 'on' : ''} onClick={() => setPage('add')}>
          ♙ <span>Add Customer</span>
        </button>
        <button className={page === 'date' + selectedDate ? 'on' : ''} onClick={() => setPage('date' + selectedDate)}>
          ◷ <span>Daily Transactions</span>
        </button>
        <button className={`settings-nav ${page === 'settings' ? 'on' : ''}`} onClick={() => setPage('settings')}>
          <GearIcon /> <span>Settings</span>
        </button>
      </nav>

    </aside>
  );
}

function SetupView({ years, add, open, requestDelete }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      await add(year);
      setMsg(`${year} is ready for transactions.`);
    } catch (x) {
      setMsg(x.message);
    }
  }

  return (
    <section className="flow-card onboarding-shell">
      <Head
        pre="GET STARTED"
        title={<>Select a <em>transaction year.</em></>}
        sub="Choose an existing year or add one to begin organizing your laundry records."
      />

      <section className="setup-view">
        <div className="setup-add">
          <h2>Add a transaction year</h2>
          <span>Create a year before selecting its months and daily records.</span>
          <form className="inline" onSubmit={submit}>
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
            <button type="submit" className="primary-action">Add year</button>
          </form>
          {msg && <div className="notice">{msg}</div>}
        </div>

        <div className="setup-years">
          {years.map((item) => (
            <article
              className="year-card"
              key={item.year}
              role="button"
              tabIndex="0"
              onClick={() => open('year' + item.year)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  open('year' + item.year);
                }
              }}
            >
              <span>YEAR</span>
              <strong>{item.year}</strong>
              <div className="year-card-footer">
                <small>Select month</small>
                <button type="button" className="icon-delete card-delete" aria-label={`Delete year ${item.year}`} title={`Delete year ${item.year}`} onClick={(event) => { event.stopPropagation(); requestDelete({ kind: 'year', id: item.year, label: String(item.year) }); }}><TrashIcon /></button>
              </div>
            </article>
          ))}
          {!years.length && <div className="empty">No transaction years yet. Add your first year above.</div>}
        </div>
      </section>
    </section>
  );
}

function Dash({ data, refresh, currentUser }) {
  const [activeTab, setActiveTab] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [paymentInputs, setPaymentInputs] = useState({});
  const [paymentErrors, setPaymentErrors] = useState({});
  const [summary, setSummary] = useState({ totalPaid: 0, totalUnpaid: 0 });

  useEffect(() => {
    const rows = (data?.recent || []).map((row) => {
      const total = Number(row.total_amount || 0);
      const paid = Number(row.amount_paid || 0);
      const outstanding = Math.max(0, total - paid);

      return {
        id: row.id,
        customer_name: row.customer_name,
        total_amount: total,
        amount_paid: paid,
        outstanding_amount: outstanding,
      };
    });
    setCustomers(rows);
    setSummary({
      totalPaid: Number(data?.total_paid || 0),
      totalUnpaid: Number(data?.total_unpaid || 0),
    });
  }, [data]);

  const recordPayment = async (id) => {
    const customer = customers.find((entry) => entry.id === id);
    if (!customer) return;

    const paymentAmount = Number(paymentInputs[id] ?? 0);
    const remainingBalance = Number(customer.outstanding_amount || 0);
    const total = Number(customer.total_amount || 0);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setPaymentErrors((current) => ({ ...current, [id]: 'Enter a payment amount greater than $0.00.' }));
      return;
    }
    if (paymentAmount > remainingBalance) {
      setPaymentErrors((current) => ({
        ...current,
        [id]: `Payment amount cannot exceed remaining balance of ${money(remainingBalance)}.`,
      }));
      return;
    }

    const nextPaid = Number(customer.amount_paid || 0) + paymentAmount;
    const backendStatus = nextPaid >= total ? 'PAID' : nextPaid ? 'PARTIALLY PAID' : 'UNPAID';

    try {
      await api('/transactions/' + id, {
        method: 'PATCH',
        body: JSON.stringify({
          status: backendStatus,
          amount_paid: nextPaid,
        }),
      });
    } catch (x) {
      console.error(x);
      return;
    }

    setCustomers((current) =>
      current.map((customer) => {
        if (customer.id !== id) return customer;

        const nextCustomer = {
          ...customer,
          amount_paid: nextPaid,
          outstanding_amount: Math.max(0, total - nextPaid),
        };

        return nextCustomer;
      })
    );
    setSummary((current) => ({
      totalPaid: current.totalPaid + paymentAmount,
      totalUnpaid: Math.max(0, current.totalUnpaid - paymentAmount),
    }));
    setPaymentInputs((current) => {
      const next = { ...current };
      next[id] = 0;
      return next;
    });
    setPaymentErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    refresh();
  };

  const filteredCustomers = customers.filter((customer) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'paid') return customer.outstanding_amount <= 0;
    return customer.outstanding_amount > 0;
  });

  return (
    <>
      <Head pre="OVERVIEW" title={<>Good day, <em>{currentUser?.username || 'User'}.</em></>} />
      <div className="stats">
        <Stat title="TODAY'S TRANSACTIONS" value={data?.transactions || 0} icon="▤" />
        <Stat title="TODAY'S TOTAL AMOUNT" value={money(data?.total_amount)} />
        <Stat title="TOTAL PAID" value={money(summary.totalPaid)} icon="✓" />
        <Stat title="TOTAL UNPAID" value={money(summary.totalUnpaid)} icon="◷" />
      </div>

      <div className="dashboard-shell">
        <article className="panel customer-panel">
          <div className="customer-tabs" role="tablist" aria-label="Customer dashboard tabs">
            <button
              type="button"
              className={activeTab === 'all' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('all')}
            >
              Today's All Customers
            </button>
            <button
              type="button"
              className={activeTab === 'paid' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('paid')}
            >
              Paid Customers
            </button>
            <button
              type="button"
              className={activeTab === 'unpaid' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('unpaid')}
            >
              Unpaid Customers
            </button>
          </div>

          <div className="customer-table-wrap">
            {filteredCustomers.length ? (
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    {activeTab === 'all' && <th>Total Amount</th>}
                    {activeTab === 'paid' && <th>Amount Paid</th>}
                    {activeTab === 'unpaid' && <><th>Amount Paid</th><th>Remaining Balance</th><th>Action</th></>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <div className="customer-name-cell">
                          <strong>{customer.customer_name}</strong>
                        </div>
                      </td>
                      {activeTab === 'all' && <td>{money(customer.total_amount)}</td>}
                      {activeTab === 'paid' && <td>{money(customer.amount_paid)}</td>}
                      {activeTab === 'unpaid' && <>
                        <td>
                          <input
                            className="payment-input"
                            type="number"
                            min="0"
                            max={customer.outstanding_amount}
                            step=".01"
                            value={paymentInputs[customer.id] ?? 0}
                            onChange={(e) => {
                              const value = e.target.value;
                              const amount = Number(value);
                              setPaymentInputs((current) => ({ ...current, [customer.id]: value }));
                              setPaymentErrors((current) => ({
                                ...current,
                                [customer.id]: amount > customer.outstanding_amount
                                  ? `Payment amount cannot exceed remaining balance of ${money(customer.outstanding_amount)}.`
                                  : '',
                              }));
                            }}
                          />
                          {paymentErrors[customer.id] && <small className="payment-error">{paymentErrors[customer.id]}</small>}
                        </td>
                        <td>{money(Math.max(0, customer.outstanding_amount - Number(paymentInputs[customer.id] ?? 0)))}</td>
                        <td><button className="payment-button" type="button" disabled={Boolean(paymentErrors[customer.id]) || Number(paymentInputs[customer.id] ?? 0) <= 0} onClick={() => recordPayment(customer.id)}>Record payment</button></td>
                      </>}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">No customers in this view right now.</div>
            )}
          </div>
        </article>
      </div>
    </>
  );
}

function YearView({ year, open, refresh, requestDelete, canDelete }) {
  const [data, setData] = useState();
  const [month, setMonth] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let active = true;
    api(`/years/${year}/months`)
      .then((x) => {
        if (active) setData(x);
      })
      .catch(() => {
        if (active) setData({ months: [] });
      });

    return () => {
      active = false;
    };
  }, [year]);

  async function addMonth(e) {
    e.preventDefault();
    try {
      await api(`/years/${year}/months`, {
        method: 'POST',
        body: JSON.stringify({ month: Number(month) }),
      });
      setMsg('Month added successfully.');
      const next = await api(`/years/${year}/months`);
      setData(next);
      refresh();
    } catch (x) {
      setMsg(x.message);
    }
  }

  return (
    <section className="flow-card records-flow-card">
      <Head pre="YEARLY RECORDS" title={<>{year} <em>transactions</em></>} sub={`${year} transactions: Choose a month to view its daily earnings and customers.`} />

      <div className="addmonth">
        <div>
          <h2>Add a month</h2>
          <span>Only months you add will appear below.</span>
        </div>

        <form className="inline" onSubmit={addMonth}>
          <select value={month} onChange={(e) => setMonth(e.target.value)} required>
            <option value="">Select month</option>
            {names.map((n, i) => (
              <option key={n} value={i + 1}>{n}</option>
            ))}
          </select>
          <button type="submit" className="primary-action">Add month</button>
        </form>
      </div>

      {msg && <div className="notice">{msg}</div>}

      <div className="months">
        {data?.months?.map((x) => (
          <article
            className="month"
            key={x.id}
            role="button"
            tabIndex="0"
            onClick={() => open('month' + x.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open('month' + x.id);
              }
            }}
          >
            <b>{x.name} {year}</b>
            <small>Total earnings</small>
            <strong>{money(x.total_earnings)}</strong>
            <footer>
              <span>{x.transaction_count} transactions</span>
              <span>Open calendar</span>
                {canDelete && <button type="button" className="icon-delete" aria-label={`Delete ${x.name} ${year}`} title={`Delete ${x.name} ${year}`} onClick={(event) => { event.stopPropagation(); requestDelete({ kind: 'month', id: x.id, year, label: `${x.name} ${year}`, onDeleted: () => setData((current) => current ? { ...current, months: current.months.filter((month) => month.id !== x.id) } : current) }); }}><TrashIcon /></button>}
            </footer>
          </article>
        ))}
        {data && !data.months?.length && <div className="empty">No months yet. Add one to begin.</div>}
      </div>
    </section>
  );
}

function MonthView({ id, open, selectDate }) {
  const [data, setData] = useState();

  useEffect(() => {
    let active = true;
    api(`/months/${id}/calendar`)
      .then((x) => {
        if (active) setData(x);
      })
      .catch(() => {
        if (active) setData(null);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (!data) return <div className="empty">Loading calendar…</div>;

  const pad = Array(new Date(data.year, data.month - 1, 1).getDay()).fill(null);
  const days = new Date(data.year, data.month, 0).getDate();

  return (
    <>
      <Head pre="MONTHLY CALENDAR" title={<>{data.name} <em>{data.year}</em></>} sub="Select a date to see the detailed customer list." />

      <section className="calendar panel">
        <div className="week">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((x) => <b key={x}>{x}</b>)}
        </div>

        <div className="grid">
          {[...pad, ...Array.from({ length: days }, (_, i) => i + 1)].map((x, i) =>
            x ? (
              <button
                key={i}
                onClick={() => {
                  const selected = `${data.year}-${String(data.month).padStart(2, '0')}-${String(x).padStart(2, '0')}`;
                  selectDate(selected);
                  open('dash');
                }}
              >
                <b>{x}</b>
                <strong>{money(data.days[x]?.total_paid)}</strong>
                <small>{data.days[x]?.count || 'No'} transactions</small>
              </button>
            ) : (
              <div key={i} />
            )
          )}
        </div>
      </section>
    </>
  );
}

function Table({ list }) {
  return (
    <article className="panel table">
      <h2>Customers</h2>
      {list.length ? (
        <table>
          <thead>
            <tr>
              <th>Customer name</th>
              <th>Total amount</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td>
                  <b>{t.customer_name}</b>
                  <small>{t.transaction_time}</small>
                </td>
                <td>{money(t.total_amount)}</td>
                <td>{money(t.amount_paid)}</td>
                <td>{money(t.remaining_balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">No transactions recorded.</div>
      )}
    </article>
  );
}

function DatePage({ date }) {
  const [data, setData] = useState();

  useEffect(() => {
    let active = true;
    api('/transactions/date/' + date)
      .then((x) => {
        if (active) setData(x);
      })
      .catch(() => {
        if (active) setData(null);
      });

    return () => {
      active = false;
    };
  }, [date]);

  if (!data) return <div className="empty">Loading daily details…</div>;

  return (
    <>
      <Head
        pre="DAILY TRANSACTIONS"
        title={new Date(date + 'T12:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
        sub={`${new Date(date + 'T12:00:00').toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} — Keep your laundry shop records clear and organized.`}
      />

      <div className="daily">
        <div>
          <p>DAILY EARNINGS</p>
          <strong>{money(data.summary.total_paid)}</strong>
        </div>
        <div>
          <p>TOTAL AMOUNT</p>
          <b>{money(data.summary.total_amount)}</b>
        </div>
        <div>
          <p>TRANSACTIONS</p>
          <b>{data.summary.count}</b>
        </div>
      </div>

      <Table list={data.transactions} />
    </>
  );
}

function AddTransaction({ refresh, selectedDate }) {
  const today = selectedDate || new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    customer_name: '',
    total_amount: '',
    amount_paid: '',
    transaction_date: today,
  });
  const [msg, setMsg] = useState('');

  const total = Number(form.total_amount) || 0;

  async function submit(e) {
    e.preventDefault();
    try {
      await api('/transactions', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setMsg('Transaction saved to the selected date.');
      setForm({ ...form, customer_name: '', total_amount: '', amount_paid: '' });
      refresh();
    } catch (x) {
      setMsg(x.message);
    }
  }

  return (
    <section className="add-customer-page">
      <Head pre="NEW DAILY RECORD" title={<>Add a <em>customer.</em></>} sub="Record a wash order and payment for the right calendar date." />

      <div className="add">
        <form className="add-customer-form" onSubmit={submit}>
          <h2>Transaction details</h2>

          <label>
            Customer name
            <input
              required
              value={form.customer_name}
              placeholder="e.g. Juan Dela Cruz"
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
          </label>

          <div className="two">
            <label>
              Total amount
              <input
                required
                type="number"
                min=".01"
                step=".01"
                value={form.total_amount}
                onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
              />
            </label>

            <label>
              Amount paid
              <input
                required
                type="number"
                min="0"
                max={total || undefined}
                step=".01"
                value={form.amount_paid}
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
              />
            </label>
          </div>

          <label>
            Transaction date
            <input
              type="date"
              value={form.transaction_date}
              disabled={Boolean(selectedDate)}
              onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
            />
          </label>

          <button className="save-transaction">✓ Save transaction</button>
          {msg && <div className="notice">{msg}</div>}
        </form>
      </div>
    </section>
  );
}

function App() {
  const [auth, setAuth] = useState(!!localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState({ username: localStorage.getItem('username') || 'User' });
  const [page, setPage] = useState('dash');
  const [selectedDate, setSelectedDate] = useState(localStorage.getItem('selectedDate') || '');
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(Boolean(localStorage.getItem('selectedDate')));
  const [years, setYears] = useState([]);
  const [dash, setDash] = useState();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const selectDate = (date) => {
    setSelectedDate(date);
    setIsOnboardingComplete(true);
    localStorage.setItem('selectedDate', date);
  };

  const requestDelete = (target) => {
    if (selectedDate) return;
    setDeleteTarget(target);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api(deleteTarget.kind === 'year' ? `/years/${deleteTarget.id}` : `/months/${deleteTarget.id}`, { method: 'DELETE' });
      const deletedYear = deleteTarget.kind === 'year' ? String(deleteTarget.id) : '';
      const activeYear = selectedDate.slice(0, 4);
      const nextYears = await api('/years');
      setYears(nextYears.years || []);
      deleteTarget.onDeleted?.();
      setDeleteTarget(null);
      if (deleteTarget.kind === 'year' && (page === `year${deletedYear}` || page.startsWith('month') || activeYear === deletedYear)) {
        localStorage.removeItem('selectedDate');
        setSelectedDate('');
        setIsOnboardingComplete(false);
        setPage('dash');
      } else if (deleteTarget.kind === 'month' && page === 'month' + deleteTarget.id) {
        setPage(`year${deleteTarget.year}`);
      }
      await load();
    } catch (x) {
      setDeleteTarget({ ...deleteTarget, error: x.message });
    } finally {
      setDeleteBusy(false);
    }
  };

  const load = async (date = selectedDate) => {
    try {
      const y = await api('/years');
      setYears(y.years || []);
    } catch {
      setAuth(false);
    }

    try {
      const d = await api('/dashboard' + (date ? `?date=${date}` : ''));
      setDash(d);
    } catch {
      setDash(null);
    }
  };

  useEffect(() => {
    if (!auth) return;

    let active = true;
    const run = async () => {
      try {
        const [y, d, account] = await Promise.all([
          api('/years'),
          api('/dashboard' + (selectedDate ? `?date=${selectedDate}` : '')),
          api('/account'),
        ]);
        if (active) {
          setYears(y.years || []);
          setDash(d);
          setCurrentUser({ username: account.account?.username || 'User' });
          localStorage.setItem('username', account.account?.username || 'User');
        }
      } catch {
        if (active) setAuth(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [auth, selectedDate]);

  if (!auth) {
    return <Login done={(session) => { const username = session?.username || 'User'; localStorage.setItem('username', username); setCurrentUser({ username }); localStorage.removeItem('selectedDate'); setSelectedDate(''); setIsOnboardingComplete(false); setPage('dash'); setAuth(true); }} />;
  }

  let content;
  if (page === 'settings') {
    content = <Settings onCredentialsChanged={() => { localStorage.removeItem('token'); localStorage.removeItem('username'); localStorage.removeItem('selectedDate'); setCurrentUser({ username: 'User' }); setSelectedDate(''); setIsOnboardingComplete(false); setPage('dash'); setAuth(false); }} onSignOut={() => { localStorage.removeItem('token'); localStorage.removeItem('username'); localStorage.removeItem('selectedDate'); setCurrentUser({ username: 'User' }); setSelectedDate(''); setIsOnboardingComplete(false); setPage('dash'); setAuth(false); }} />;
  } else if (!selectedDate && page === 'dash') {
    content = <div className="onboarding-viewport"><SetupView years={years} open={setPage} requestDelete={requestDelete} add={async (year) => { await api('/years', { method: 'POST', body: JSON.stringify({ year: Number(year) }) }); await load(); }} /></div>;
  } else if (page === 'dash') {
    content = <Dash data={dash} refresh={load} currentUser={currentUser} />;
  } else if (page === 'add') {
    content = <AddTransaction refresh={load} selectedDate={selectedDate} />;
  } else if (page.startsWith('year')) {
    content = <YearView year={page.slice(4)} open={setPage} refresh={load} requestDelete={requestDelete} canDelete={!selectedDate} />;
  } else if (page.startsWith('month')) {
    content = <MonthView id={page.slice(5)} open={setPage} selectDate={selectDate} />;
  } else {
    content = <DatePage date={page.slice(4)} />;
  }

  return (
    <div className={isOnboardingComplete ? 'app' : 'app onboarding-app'}>
      {isOnboardingComplete && <Side page={page} setPage={setPage} selectedDate={selectedDate} />}
      <main><div className="onboarding-stage">{content}</div></main>
      <DeleteModal target={deleteTarget} busy={deleteBusy} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}

export default App;
