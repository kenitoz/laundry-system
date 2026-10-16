// Mobile (Android) app — ported from the claude.ai/design "Laundry Shop v3" prototype
// and wired to the Flask API. The landing mini-game, swipe carousels, magnifier and
// save animation use the Web Animations API directly on refs, as in the prototype.
import { Component, createRef, Fragment } from 'react';
import { api, money, shortMoney, todayISO } from './api';
import './mobile.css';

const LOGO = '/bubblebee-logo.jpg';
const MN = Array.from({ length: 12 }, (_, i) => new Date(2020, i).toLocaleString('en', { month: 'long' }));
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEARS = [['shirt', '#ffd436', 'Yellow T-shirt'], ['shorts', '#1762c5', 'Blue shorts'], ['sock', '#e86a5a', 'Coral socks'], ['shirt', '#3bb38a', 'Green T-shirt'], ['shorts', '#9b7be0', 'Purple shorts'], ['sock', '#ffffff', 'White socks']];
const CYC = ['all', 'unpaid', 'paid'];
const LBL = { all: "Today's All Customers", paid: 'Paid Customers', unpaid: 'Unpaid Customers' };
const EASE = 'transform .38s cubic-bezier(.22,.8,.24,1)';
const HITS_TO_BREAK = 6;
const CRACK1 = 'M64 14 L56 32 L65 40 L53 57 M56 32 L44 28 M65 40 L77 45';
const CRACK2 = 'M20 68 L34 61 L31 49 L44 43 M34 61 L41 72 L37 86 M31 49 L19 43 M53 57 L59 70 L72 75 M44 43 L53 57';
const STROKE = { stroke: 'rgba(9,39,94,.35)', strokeWidth: 1.5, strokeLinejoin: 'round' };
const EMPTY_SF = { newUsername: '', currentPassword: '', newPassword: '', confirmPassword: '' };

const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const fmtDate = (sd, month = 'short') => new Date(sd + 'T12:00:00').toLocaleDateString('en-PH', { month, day: 'numeric', year: 'numeric' });
const toTx = (r) => ({ id: r.id, name: r.customer_name, total: Number(r.total_amount) || 0, paid: Number(r.amount_paid) || 0, time: r.transaction_time || '' });
const onEnter = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } };

function Wear({ type, color, size }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      {type === 'shirt' && <path d="M17 6l-11 6 4 10 5-2v22h18V20l5 2 4-10-11-6c-1 3.5-3.6 5-7 5s-6-1.5-7-5z" fill={color} {...STROKE} />}
      {type === 'shorts' && <><path d="M10 8h28l3 32H28l-4-16-4 16H7z" fill={color} {...STROKE} /><path d="M10 14h28" {...STROKE} /></>}
      {type === 'sock' && <><path d="M18 4h12v22l8 8c3 3 1 9-4 9h-6c-4 0-6-2-8-5l-4-6c-1-2 2-3 2-5z" fill={color} {...STROKE} /><path d="M18 10h12" {...STROKE} /></>}
    </svg>
  );
}

function Crack({ d }) {
  return (
    <svg viewBox="0 0 100 100" className="m-crack">
      <path d={d} fill="none" stroke="rgba(9,39,94,.45)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Trash() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

function Brand({ size, nameSize }) {
  return (
    <div className="m-land-brand">
      <img src={LOGO} alt="Bubblebee Laundry Shop" className="m-logo" width={size} height={size} />
      <div><b style={nameSize ? { fontSize: nameSize } : undefined}>Bubblebee</b><small>Laundry Shop</small></div>
    </div>
  );
}

export default class MobileApp extends Component {
  constructor(props) {
    super(props);
    const token = localStorage.getItem('token');
    this.state = {
      landing: !token, entering: false, drum: [], tossed: 0, wi: 0, soap: false, hits: 0, broken: false, exploding: false,
      auth: !!token, username: localStorage.getItem('username') || '',
      lf: { username: '', password: '' }, showPw: false, loginErr: '', loginBusy: false,
      page: 'dash', selectedDate: token ? localStorage.getItem('selectedDate') || '' : '',
      years: [], yearMonths: {}, cal: null, dayTx: [], dayDate: '', loadErr: '',
      yearInput: new Date().getFullYear(), setupMsg: '', setupOk: true, monthInput: '', yearMsg: '', yearOk: true,
      tab: 'all', payIn: {}, payErr: {},
      af: { name: '', total: '', paid: '' }, addMsg: '', addOk: true, adding: false,
      sf: EMPTY_SF, vis: {}, setErr: '',
      modal: null, modalBusy: false, zoomTx: null, savingAnim: false, savingName: '',
      chOpen: false, chSide: 'right', chTop: 380,
    };
  }

  rootRef = createRef(); scrollRef = createRef(); listRef = createRef();
  vpRef = createRef(); trackRef = createRef(); labelRef = createRef();
  landRef = createRef(); loginRef = createRef(); machineRef = createRef(); glassRef = createRef(); drumRef = createRef(); flyRef = createRef();
  powderRef = createRef(); bubbleRef = createRef(); wearVp = createRef(); wearTrack = createRef();
  saveBackRef = createRef(); saveMachRef = createRef(); saveDrumRef = createRef();
  zoomBackRef = createRef(); zoomLensRef = createRef(); chRef = createRef();
  nId = 100;

  // ---------- lifecycle & data ----------
  componentDidMount() {
    this.afterRender();
    if (this.state.auth) this.boot();
  }

  componentDidUpdate(_, prev) {
    this.afterRender();
    const s = this.state;
    if (s.auth && !prev.auth) this.boot();
    if (!s.auth) return;
    if (s.selectedDate !== prev.selectedDate) {
      if (s.selectedDate) localStorage.setItem('selectedDate', s.selectedDate);
      else localStorage.removeItem('selectedDate');
      this.loadDateContext();
    }
    if (s.page !== prev.page) this.loadPage();
  }

  componentWillUnmount() {
    this.dead = true;
    clearTimeout(this._sp); clearInterval(this._bi); clearInterval(this._smk); clearTimeout(this._bt);
  }

  afterRender() {
    this.fitHeight(); this.ensureSpin(); this.ensureWash(); this.ensureSmoke();
    const color = this.state.auth ? '#09275e' : '#123d86';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    if (meta.content !== color) meta.content = color;
  }

  fail = (x) => {
    if (this.dead) return;
    if (x.status === 401) return this.signOut();
    this.setState({ loadErr: x.message });
  };

  boot() {
    api('/account').then((d) => {
      const username = d.account?.username || '';
      localStorage.setItem('username', username);
      this.setState({ username });
    }).catch(this.fail);
    this.loadYears();
    this.loadDateContext();
    this.loadPage();
  }

  loadYears = () => api('/years').then((d) => this.setState({ years: (d.years || []).map((r) => Number(r.year)), loadErr: '' })).catch(this.fail);

  loadYear = (y) => api(`/years/${y}/months`).then((d) => this.setState((st) => ({
    loadErr: '',
    yearMonths: { ...st.yearMonths, [y]: (d.months || []).map((m) => ({ id: m.id, year: y, m: Number(m.month_number), earn: Number(m.total_earnings) || 0, count: Number(m.transaction_count) || 0 })) },
  }))).catch(this.fail);

  loadMonth = (id) => api(`/months/${id}/calendar`).then((d) => this.setState({ cal: { id, year: Number(d.year), m: Number(d.month), days: d.days || {} }, loadErr: '' })).catch(this.fail);

  loadDay = (date) => api('/transactions/date/' + date).then((d) => {
    if (this.state.selectedDate !== date) return;
    this.setState({ dayTx: (d.transactions || []).map(toTx).reverse(), dayDate: date, loadErr: '' });
  }).catch(this.fail);

  loadDateContext() {
    const sd = this.state.selectedDate;
    if (!sd) return this.setState({ dayTx: [], dayDate: '' });
    this.loadDay(sd);
    this.loadYear(Number(sd.slice(0, 4)));
  }

  loadPage() {
    const p = this.state.page;
    if (p.startsWith('year')) this.loadYear(Number(p.slice(4)));
    else if (p.startsWith('month')) this.loadMonth(Number(p.slice(5)));
    else if (p === 'dash' && !this.state.selectedDate) this.loadYears();
  }

  // ---------- customer list carousel ----------
  ci() { return Math.max(0, CYC.indexOf(this.state.tab)); }
  pos(pct, dx, animate) {
    const t = this.trackRef.current, l = this.labelRef.current, vp = this.vpRef.current;
    const r = l && vp && vp.offsetWidth ? l.offsetWidth / vp.offsetWidth : 1;
    [[t, dx], [l, dx * r]].forEach(([el, d]) => { if (!el) return; el.style.transition = animate ? EASE : 'none'; el.style.transform = 'translateX(calc(' + pct + '% + ' + d + 'px))'; });
  }
  step(dir, dx = 0) {
    if (!this.trackRef.current) return this.setState({ tab: CYC[(this.ci() + dir + 3) % 3] });
    if (!dir) return this.pos(-100, 0, true);
    this.setState({ tab: CYC[(this.ci() + dir + 3) % 3] }, () => {
      this.pos(dir > 0 ? 0 : -200, dx, false);
      void this.trackRef.current.offsetWidth;
      this.pos(-100, 0, true);
    });
  }
  goTo(k) { const d = (CYC.indexOf(k) - this.ci() + 3) % 3; if (d) this.step(d === 1 ? 1 : -1); }
  fitHeight() {
    const vp = this.vpRef.current, t = this.trackRef.current; if (!vp || !t) return;
    const p = t.querySelectorAll(':scope > section')[1]; if (p) vp.style.height = p.offsetHeight + 'px';
  }
  onPD = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('input,button,select,textarea')) return;
    this.drag = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, active: false, lx: e.clientX, lt: performance.now(), v: 0 };
  };
  onPM = (e) => {
    const d = this.drag, vp = this.vpRef.current;
    if (!d || d.id !== e.pointerId || !vp) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) { this.drag = null; return; }
      d.active = true; vp.setPointerCapture(e.pointerId); vp.style.cursor = 'grabbing';
    }
    d.dx = dx;
    const now = performance.now(); d.v = (e.clientX - d.lx) / Math.max(1, now - d.lt); d.lx = e.clientX; d.lt = now;
    this.pos(-100, dx, false);
    e.preventDefault();
  };
  onPU = (e) => {
    const d = this.drag; this.drag = null;
    if (!d || !d.active) return;
    const vp = this.vpRef.current; vp.style.cursor = ''; this._justDragged = Date.now();
    if (vp.hasPointerCapture && vp.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId);
    const w = vp.offsetWidth;
    if (d.dx < -w * 0.2 || d.v < -0.5) this.step(1, d.dx);
    else if (d.dx > w * 0.2 || d.v > 0.5) this.step(-1, d.dx);
    else this.step(0);
  };
  onKey = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); this.step(1); }
  };
  jumpTo(k) {
    const vp = this.vpRef.current;
    if (k !== this.state.tab) {
      if (vp) vp.style.transition = 'none';
      this.goTo(k);
      requestAnimationFrame(() => { this.fitHeight(); this.scrollToList(); requestAnimationFrame(() => { if (vp) vp.style.transition = ''; }); });
    } else this.scrollToList();
  }
  scrollToList() {
    const sc = this.scrollRef.current, el = this.listRef.current;
    if (sc && el) {
      sc.scrollTo({ top: sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12, behavior: 'smooth' });
      if (el.animate) el.animate([{ boxShadow: '0 0 0 0 rgba(23,98,197,0)' }, { boxShadow: '0 0 0 4px rgba(23,98,197,.25)', offset: 0.4 }, { boxShadow: '0 4px 12px rgba(39,67,108,.03)' }], { duration: 900, delay: 250 });
    }
  }

  // ---------- landing mini-game ----------
  ensureSpin() {
    const el = this.drumRef.current;
    if (el && this._spinEl !== el && el.animate) { this._spinEl = el; this.spin = el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 2800, iterations: Infinity }); }
  }
  fly(src, onDone) {
    const layer = this.flyRef.current, glass = this.glassRef.current;
    if (!layer || !glass || !src) return;
    const lr = layer.getBoundingClientRect(), br = src.getBoundingClientRect(), gr = glass.getBoundingClientRect();
    const S = 52, el = src.cloneNode(true);
    el.setAttribute('width', S); el.setAttribute('height', S);
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0', filter: 'drop-shadow(0 8px 8px rgba(5,25,68,.35))' });
    layer.appendChild(el);
    const x0 = br.left - lr.left + br.width / 2 - S / 2, y0 = br.top - lr.top + br.height / 2 - S / 2;
    const x1 = gr.left - lr.left + gr.width / 2 - S / 2, y1 = gr.top - lr.top + gr.height / 2 - S / 2;
    const cx = (x0 + x1) / 2 + (Math.random() - 0.5) * 70, cy = Math.min(y0, y1) - 60 - Math.random() * 40;
    const rot = (Math.random() < 0.5 ? -1 : 1) * (280 + Math.random() * 300), kf = [];
    for (let i = 0; i <= 18; i++) { const t = i / 18, u = 1 - t; kf.push({ transform: 'translate(' + (u * u * x0 + 2 * u * t * cx + t * t * x1) + 'px,' + (u * u * y0 + 2 * u * t * cy + t * t * y1) + 'px) rotate(' + rot * t + 'deg) scale(' + (1 - 0.7 * Math.pow(t, 3)) + ')', opacity: t > 0.85 ? (1 - t) / 0.15 : 1 }); }
    el.animate(kf, { duration: 760, easing: 'cubic-bezier(.35,.1,.55,1)', fill: 'forwards' }).onfinish = () => { el.remove(); if (onDone) onDone(); };
  }
  shake(k = 1) {
    const m = this.machineRef.current; if (!m || !m.animate) return;
    const a = 3 * k, r = 0.8 * k;
    m.animate([{ transform: 'none' }, { transform: 'translateX(' + -a + 'px) rotate(' + -r + 'deg)' }, { transform: 'translateX(' + a + 'px) rotate(' + r + 'deg)' }, { transform: 'translateX(' + -a * 0.6 + 'px) rotate(' + -r * 0.5 + 'deg)' }, { transform: 'translateX(' + a * 0.4 + 'px)' }, { transform: 'none' }], { duration: 300 + 80 * k });
  }
  stage() { const s = this.state; return s.broken || s.exploding ? 4 : Math.min(3, Math.floor(s.hits / HITS_TO_BREAK * 4)); }
  geo() {
    const layer = this.flyRef.current, m = this.machineRef.current; if (!layer || !m) return null;
    const lr = layer.getBoundingClientRect(), r = m.getBoundingClientRect();
    return { layer, lr, mr: { x: r.left - lr.left, y: r.top - lr.top, w: r.width, h: r.height } };
  }
  part(layer, css, frames, opts) {
    const e = document.createElement('span');
    Object.assign(e.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' }, css);
    layer.appendChild(e); e.animate(frames, opts).onfinish = () => e.remove(); return e;
  }
  traj(x0, y0, dx, vy, g, rot, fade, s0 = 1, s1 = 1) {
    const f = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; f.push({ transform: 'translate(' + (x0 + dx * t) + 'px,' + (y0 + vy * t + g * t * t) + 'px) rotate(' + rot * t + 'deg) scale(' + (s0 + (s1 - s0) * t) + ')', opacity: t < fade ? 1 : 1 - (t - fade) / (1 - fade) }); }
    return f;
  }
  sparks(n, ox, oy) {
    const g = this.geo(); if (!g) return;
    const { layer, mr } = g;
    const x0 = ox ?? mr.x + mr.w * (0.15 + Math.random() * 0.7), y0 = oy ?? mr.y + mr.h * (0.1 + Math.random() * 0.6);
    const cols = ['#ffd436', '#fff3a0', '#f59e3b', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.1 + Math.random() * 0.8), R = 40 + Math.random() * 70, sz = 3 + Math.random() * 4;
      this.part(layer, { width: sz + 'px', height: sz + 'px', borderRadius: '50%', background: cols[i % 4], boxShadow: '0 0 6px 1px rgba(255,212,54,.9)' },
        this.traj(x0, y0, Math.cos(a) * R, Math.sin(a) * R * 1.6, R * 1.5, 0, 0.5), { duration: 480 + Math.random() * 260, easing: 'linear' });
    }
  }
  dropParts(k) {
    const g = this.geo(); if (!g) return;
    const { layer, lr, mr } = g;
    for (let i = 0; i < k; i++) {
      const screw = Math.random() < 0.6, w = screw ? 9 : 14, hh = 9;
      const x = mr.x + (Math.random() < 0.5 ? 6 + Math.random() * 30 : mr.w - 40 + Math.random() * 30), y = mr.y + 14 + Math.random() * (mr.h * 0.6);
      const floor = lr.height - 26 - hh, dx = (Math.random() - 0.5) * 90, r = (Math.random() - 0.5) * 720;
      const T = (xx, yy, rr) => 'translate(' + xx + 'px,' + yy + 'px) rotate(' + rr + 'deg)';
      this.part(layer, screw ? { width: w + 'px', height: hh + 'px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #e9eef5, #9aa7ba)', border: '1.5px solid #71809a' } : { width: w + 'px', height: hh + 'px', borderRadius: '2px', background: '#fff', border: '1.5px solid #d8dfeb' },
        [{ transform: T(x, y, 0), opacity: 1, easing: 'cubic-bezier(.5,0,1,1)' }, { transform: T(x + dx * 0.7, floor, r * 0.7), opacity: 1, offset: 0.55, easing: 'ease-out' }, { transform: T(x + dx * 0.85, floor - 16, r * 0.85), opacity: 1, offset: 0.68, easing: 'ease-in' }, { transform: T(x + dx, floor, r), opacity: 1, offset: 0.8 }, { transform: T(x + dx, floor, r), opacity: 0 }],
        { duration: 1500 + Math.random() * 300 });
    }
  }
  smoke(layer, x, y, size, dur, drift, rise, alpha) {
    const o = -size / 2;
    this.part(layer, { width: size + 'px', height: size + 'px', borderRadius: '50%', background: 'rgba(96,113,142,' + alpha + ')', filter: 'blur(1.5px)' },
      [{ transform: 'translate(' + (x + o) + 'px,' + (y + o) + 'px) scale(.4)', opacity: 0 }, { transform: 'translate(' + (x + o + drift * 0.2) + 'px,' + (y + o - rise * 0.2) + 'px) scale(.8)', opacity: 1, offset: 0.2 }, { transform: 'translate(' + (x + o + drift) + 'px,' + (y + o - rise) + 'px) scale(1.6)', opacity: 0 }],
      { duration: dur, easing: 'ease-out' });
  }
  ensureSmoke() {
    const s = this.state, on = s.landing && !s.auth && !s.entering && this.stage() === 3;
    if (on && !this._smk) this._smk = setInterval(() => { const g = this.geo(); if (g) this.smoke(g.layer, g.mr.x + g.mr.w * (0.15 + Math.random() * 0.7), g.mr.y + 6, 16 + Math.random() * 16, 1600 + Math.random() * 800, (Math.random() - 0.5) * 40, 60 + Math.random() * 50, 0.45); }, 260);
    else if (!on && this._smk) { clearInterval(this._smk); this._smk = null; }
  }
  hit() {
    const s = this.state; if (this._entering || s.broken || s.exploding) return;
    const hits = s.hits + 1;
    if (hits >= HITS_TO_BREAK) { this.setState({ hits, exploding: true }, () => this.explode()); return; }
    const stg = Math.min(3, Math.floor(hits / HITS_TO_BREAK * 4));
    this.setState({ hits });
    this.shake(1.2 + stg * 0.7);
    this.sparks(6 + stg * 5);
    if (stg >= 1) this.dropParts(stg);
  }
  explode() {
    const m = this.machineRef.current; if (!m) return;
    const jit = []; for (let i = 0; i <= 10; i++) { const k = 1 + i * 0.5; jit.push({ transform: i === 10 ? 'scale(1.06)' : 'translate(' + (Math.random() - 0.5) * 4 * k + 'px,' + (Math.random() - 0.5) * 3 * k + 'px) rotate(' + (Math.random() - 0.5) * 1.6 * k + 'deg)' }); }
    this.sparks(10);
    m.animate(jit, { duration: 650, easing: 'linear' }).onfinish = () => {
      if (this._entering) return;
      const g = this.geo(); if (!g) return;
      const { layer, mr } = g, mcx = mr.x + mr.w / 2, mcy = mr.y + mr.h / 2, pcy = mr.y + mr.h - 108;
      const clothes = this.drumRef.current ? [...this.drumRef.current.querySelectorAll('svg')].map((sv) => ({ sv, r: sv.getBoundingClientRect() })) : [];
      this.setState({ broken: true });
      this.part(layer, { width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle, #fff 0 40%, rgba(255,212,54,.85) 60%, rgba(255,212,54,0) 70%)' },
        [{ transform: 'translate(' + (mcx - 30) + 'px,' + (mcy - 30) + 'px) scale(.2)', opacity: 1 }, { transform: 'translate(' + (mcx - 30) + 'px,' + (mcy - 30) + 'px) scale(5.5)', opacity: 0 }], { duration: 480, easing: 'ease-out' });
      const cols = 3, rows = 4, cw = mr.w / cols, ch = mr.h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = mr.x + c * cw, y = mr.y + r * ch, ccx = x + cw / 2, ccy = y + ch / 2, port = Math.hypot(ccx - mcx, ccy - pcy) < 78;
        const j = (a, b) => (a + Math.random() * (b - a)).toFixed(0) + '%';
        this.part(layer, { width: cw + 6 + 'px', height: ch + 6 + 'px', background: port ? 'radial-gradient(circle at 30% 30%, #e3eefc, #b9d0ef)' : '#fff', boxShadow: 'inset 0 0 0 3px ' + (port ? '#fff' : '#e6eaf1'), clipPath: 'polygon(' + j(0, 18) + ' ' + j(0, 14) + ', ' + j(82, 100) + ' ' + j(0, 20) + ', ' + j(86, 100) + ' ' + j(78, 100) + ', ' + j(40, 62) + ' ' + j(88, 100) + ', ' + j(0, 14) + ' ' + j(76, 100) + ')' },
          this.traj(x - 3, y - 3, (ccx - mcx) * (2.4 + Math.random() * 2) + (Math.random() - 0.5) * 60, -(150 + Math.random() * 170) + (ccy - mcy) * 0.8, 560 + Math.random() * 200, (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 420), 0.55), { duration: 1300 + Math.random() * 400, easing: 'linear' });
      }
      const disp = this.part(layer, { width: '96px', height: '24px', borderRadius: '6px', background: '#09275e', color: '#ff8a7a', font: '700 11px DM Sans, sans-serif', letterSpacing: '.08em', display: 'grid', placeItems: 'center' },
        this.traj(mr.x + 14, mr.y + 12, -110, -260, 620, -380, 0.6), { duration: 1500, easing: 'linear' });
      disp.textContent = 'ERR';
      this.part(layer, { width: '26px', height: '26px', borderRadius: '50%', border: '3px solid #d8dfeb', background: '#f3f7ff', boxSizing: 'border-box' },
        this.traj(mr.x + mr.w - 80, mr.y + 12, 120, -300, 640, 720, 0.6), { duration: 1500, easing: 'linear' });
      clothes.forEach(({ sv, r }) => {
        const lr = layer.getBoundingClientRect(), el = sv.cloneNode(true), x = r.left - lr.left, y = r.top - lr.top;
        el.setAttribute('width', r.width); el.setAttribute('height', r.height);
        Object.assign(el.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' }); layer.appendChild(el);
        el.animate(this.traj(x, y, (Math.random() - 0.5) * 260, -(220 + Math.random() * 160), 640, (Math.random() - 0.5) * 900, 0.6, 1, 1.3), { duration: 1500 + Math.random() * 300, easing: 'linear' }).onfinish = () => el.remove();
      });
      for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, R = 40 + Math.random() * 70; this.smoke(layer, mcx, mcy, 40 + Math.random() * 34, 1400 + Math.random() * 700, Math.cos(a) * R, Math.sin(a) * R + 30, 0.6); }
      this.sparks(26, mcx, mcy);
      const kb = this.part(layer, { left: mcx + 'px', top: mcy + 'px', font: "700 36px 'Playfair Display', serif", color: '#ffd436', textShadow: '3px 3px 0 #09275e', whiteSpace: 'nowrap', zIndex: '3' },
        [{ transform: 'translate(-50%,-50%) rotate(-8deg) scale(0)', opacity: 1 }, { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1.25)', opacity: 1, offset: 0.22 }, { transform: 'translate(-50%,-50%) rotate(-6deg) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-60%) rotate(-6deg) scale(1.08)', opacity: 0 }], { duration: 1150, easing: 'ease-out' });
      kb.textContent = 'KABOOM!';
      clearTimeout(this._bt);
      this._bt = setTimeout(() => this.setState({ exploding: false }), 1350);
    };
  }
  burst() { if (!this.spin || !this.spin.updatePlaybackRate) return; this.spin.updatePlaybackRate(4); clearTimeout(this._sp); this._sp = setTimeout(() => this.spin && this.spin.updatePlaybackRate(this.washing() ? 1.8 : 1), 900); }
  tossWear = () => {
    if (this._entering || this.state.broken || this.state.exploding) return;
    const t = this.wearTrack.current, slot = t && t.querySelector('[data-slot="0"]'), src = slot && slot.querySelector('svg'); if (!src) return;
    const W = WEARS[this.state.wi];
    this.fly(src, () => {
      if (this._entering || this.state.broken || this.state.exploding) return;
      this.setState((s) => ({ drum: [...s.drum, { type: W[0], color: W[1], id: 'd' + (++this.nId), a: Math.random() * Math.PI * 2, r: 10 + Math.random() * 36, rot: Math.random() * 360 }].slice(-10), tossed: s.tossed + 1 }));
      this.burst();
      this.hit();
    });
    if (slot.animate) slot.animate([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, delay: 140, easing: 'ease-out', fill: 'backwards' });
  };
  onPowder = () => {
    if (this._entering || this.state.broken || this.state.exploding) return;
    const b = this.powderRef.current, src = b && b.querySelector('svg'); if (!src) return;
    this.fly(src, () => { this.setState({ soap: true }); this.puff(); this.burst(); this.shake(); });
  };
  bubble(layer, x, y, size, rise, drift, dur) {
    const b = document.createElement('span');
    Object.assign(b.style, { position: 'absolute', left: x - size / 2 + 'px', top: y - size / 2 + 'px', width: size + 'px', height: size + 'px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.85)', background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.95) 0 14%, rgba(255,255,255,.2) 38%, rgba(167,199,251,.18) 100%)', pointerEvents: 'none' });
    layer.appendChild(b);
    b.animate([{ transform: 'translate(0,0) scale(.3)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0.9, offset: 0.8 }, { transform: 'translate(' + drift + 'px,' + -rise + 'px) scale(1)', opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.3,.6,.4,1)' }).onfinish = () => b.remove();
  }
  puff() {
    const g = this.bubbleRef.current; if (!g) return;
    const w = g.offsetWidth, hgt = g.offsetHeight;
    for (let i = 0; i < 16; i++) {
      const d = document.createElement('span'), a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 40, sz = 3 + Math.random() * 5;
      Object.assign(d.style, { position: 'absolute', left: w / 2 + 'px', top: hgt / 2 + 'px', width: sz + 'px', height: sz + 'px', borderRadius: '50%', background: '#fff' });
      g.appendChild(d);
      d.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * r + 'px,' + Math.sin(a) * r + 'px)', opacity: 0 }], { duration: 600 + Math.random() * 300, easing: 'ease-out' }).onfinish = () => d.remove();
    }
  }
  washing() { const s = this.state; return s.landing && !s.auth && !s.entering && !s.broken && !s.exploding && s.soap && s.drum.length > 0; }
  ensureWash() {
    const on = this.washing();
    if (on && !this._bi) {
      this._bi = setInterval(() => this.bubbleTick(), 170);
      if (this.spin && this.spin.updatePlaybackRate) this.spin.updatePlaybackRate(1.8);
    } else if (!on && this._bi) { clearInterval(this._bi); this._bi = null; if (this.spin && this.spin.updatePlaybackRate) this.spin.updatePlaybackRate(1); }
  }
  bubbleTick() {
    const g = this.bubbleRef.current, layer = this.flyRef.current, m = this.machineRef.current;
    if (!g || !layer || !m) return;
    const w = g.offsetWidth, hh = g.offsetHeight;
    for (let i = 0; i < 2; i++) this.bubble(g, w * (0.15 + Math.random() * 0.7), hh * (0.6 + Math.random() * 0.32), 6 + Math.random() * 14, 30 + Math.random() * 50, (Math.random() - 0.5) * 20, 1400 + Math.random() * 1000);
    if (Math.random() < 0.6) {
      const lr = layer.getBoundingClientRect(), mr = m.getBoundingClientRect(), side = Math.random();
      const x = side < 0.5 ? mr.left - lr.left + Math.random() * mr.width : (side < 0.75 ? mr.left - lr.left + 6 : mr.right - lr.left - 6);
      const y = side < 0.5 ? mr.top - lr.top + 10 : mr.top - lr.top + 40 + Math.random() * (mr.height - 80);
      this.bubble(layer, x, y, 8 + Math.random() * 16, 60 + Math.random() * 80, (side < 0.5 ? 0 : side < 0.75 ? -1 : 1) * (10 + Math.random() * 30) + (Math.random() - 0.5) * 20, 1800 + Math.random() * 1200);
    }
  }
  wPos(pct, dx, animate) { const t = this.wearTrack.current; if (!t) return; t.style.transition = animate ? EASE : 'none'; t.style.transform = 'translateX(calc(' + pct + '% + ' + dx + 'px))'; }
  wStep(dir, dx = 0) {
    const n = WEARS.length;
    if (!dir) return this.wPos(-100, 0, true);
    this.setState((s) => ({ wi: (s.wi + dir + n) % n }), () => { this.wPos(dir > 0 ? 0 : -200, dx, false); void (this.wearTrack.current && this.wearTrack.current.offsetWidth); this.wPos(-100, 0, true); });
  }
  onWPD = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; this.wd = { x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, active: false, lx: e.clientX, lt: performance.now(), v: 0 }; };
  onWPM = (e) => {
    const d = this.wd, vp = this.wearVp.current; if (!d || d.id !== e.pointerId || !vp) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.active) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; if (Math.abs(dy) >= Math.abs(dx)) { this.wd = null; return; } d.active = true; vp.setPointerCapture(e.pointerId); vp.style.cursor = 'grabbing'; }
    d.dx = dx; const now = performance.now(); d.v = (e.clientX - d.lx) / Math.max(1, now - d.lt); d.lx = e.clientX; d.lt = now;
    this.wPos(-100, dx, false); e.preventDefault();
  };
  onWPU = (e) => {
    const d = this.wd; this.wd = null; if (!d) return;
    const vp = this.wearVp.current; if (!vp) return; vp.style.cursor = '';
    if (!d.active) return this.tossWear();
    if (vp.hasPointerCapture && vp.hasPointerCapture(e.pointerId)) vp.releasePointerCapture(e.pointerId);
    const w = vp.offsetWidth;
    if (d.dx < -w * 0.2 || d.v < -0.5) this.wStep(1, d.dx); else if (d.dx > w * 0.2 || d.v > 0.5) this.wStep(-1, d.dx); else this.wStep(0);
  };
  onWPC = () => { this.wd = null; const vp = this.wearVp.current; if (vp) vp.style.cursor = ''; this.wStep(0); };
  onWKey = (e) => {
    if (this._entering) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); this.wStep(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.wStep(1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.tossWear(); }
  };
  toLogin = () => {
    if (this._entering) return;
    this._entering = true;
    clearTimeout(this._bt);
    const land = this.landRef.current;
    if (land) land.style.pointerEvents = 'none';
    const wasBroken = this.state.broken || this.state.exploding;
    if (wasBroken) this.setState({ entering: true, broken: false, exploding: false, hits: 0, drum: [], soap: false, tossed: 0 }, () => this.rebuild(() => this.suckIn()));
    else this.setState({ entering: true }, () => this.suckIn());
  };
  rebuild(done) {
    const g = this.geo(), m = this.machineRef.current;
    if (!g || !m || !m.animate) return done();
    const { layer, lr, mr } = g, cols = ['#ffd436', '#ffffff', '#a7c7fb', '#dcecff'];
    for (let i = 0; i < 46; i++) {
      const sz = 3 + Math.random() * 5, a = Math.random() * Math.PI * 2, R = 140 + Math.random() * 120;
      const tx = mr.x + 10 + Math.random() * (mr.w - 20), ty = mr.y + 10 + Math.random() * (mr.h - 20);
      const sx = Math.max(-20, Math.min(lr.width + 20, tx + Math.cos(a) * R)), sy = ty + Math.sin(a) * R;
      this.part(layer, { width: sz + 'px', height: sz + 'px', borderRadius: '50%', background: cols[i % 4], boxShadow: '0 0 8px 2px rgba(255,212,54,.55)' },
        [{ transform: 'translate(' + sx + 'px,' + sy + 'px) scale(.4)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(1)', opacity: 1, offset: 0.85 }, { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(0)', opacity: 0 }],
        { duration: 760 + Math.random() * 220, delay: Math.random() * 160, easing: 'cubic-bezier(.4,0,.2,1)' });
    }
    const cx = mr.x + mr.w / 2 - 40, cy = mr.y + mr.h / 2 - 40;
    m.animate([{ opacity: 0, transform: 'scale(.35)', filter: 'blur(6px) brightness(1.8)' }, { opacity: 1, transform: 'scale(1.06)', filter: 'blur(0) brightness(1.3)', offset: 0.7 }, { opacity: 1, transform: 'none', filter: 'none' }],
      { duration: 560, delay: 520, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'backwards' }).onfinish = () => {
      this.part(layer, { width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #ffd436' },
        [{ transform: 'translate(' + cx + 'px,' + cy + 'px) scale(.6)', opacity: 1 }, { transform: 'translate(' + cx + 'px,' + cy + 'px) scale(3.4)', opacity: 0 }], { duration: 520, easing: 'ease-out' });
      setTimeout(done, 220);
    };
  }
  suckIn() {
    const land = this.landRef.current, glass = this.glassRef.current, m = this.machineRef.current, layer = this.flyRef.current;
    const finish = () => this.setState({ landing: false, entering: false }, () => { this._entering = false; const l = this.loginRef.current; if (l && l.animate) l.animate([{ opacity: 0, transform: 'scale(1.08)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 460, easing: 'cubic-bezier(.22,.8,.24,1)' }); });
    if (!land || !glass || !m || !layer || !land.animate) return finish();
    if (this.spin && this.spin.updatePlaybackRate) { clearTimeout(this._sp); this.spin.updatePlaybackRate(9); }
    const lr = layer.getBoundingClientRect(), gr = glass.getBoundingClientRect();
    const gx = gr.left + gr.width / 2, gy = gr.top + gr.height / 2, lx = gx - lr.left, ly = gy - lr.top;
    const wrap = m.parentElement;
    [...land.children].filter((el) => el !== wrap && el !== layer).forEach((el, i) => {
      const r = el.getBoundingClientRect(), dx = gx - (r.left + r.width / 2), dy = gy - (r.top + r.height / 2), sp = (i % 2 ? -1 : 1) * (200 + i * 40);
      el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx * 0.12 + 'px,' + dy * 0.12 + 'px) rotate(' + sp * 0.06 + 'deg) scale(1.03)', opacity: 1, offset: 0.25 }, { transform: 'translate(' + dx * 0.6 + 'px,' + dy * 0.6 + 'px) rotate(' + sp * 0.5 + 'deg) scale(.45)', opacity: 1, offset: 0.7 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + sp + 'deg) scale(0)', opacity: 0 }],
        { duration: 1000, delay: 80 + i * 70, easing: 'cubic-bezier(.55,0,.85,.5)', fill: 'forwards' });
    });
    for (let i = 0; i < 34; i++) {
      const a0 = Math.random() * Math.PI * 2, R0 = 110 + Math.random() * 110, sz = 6 + Math.random() * 14, turn = Math.PI * (1.4 + Math.random()), kf = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12, a = a0 + turn * t, r = R0 * (1 - t); kf.push({ transform: 'translate(' + (lx + Math.cos(a) * r - sz / 2) + 'px,' + (ly + Math.sin(a) * r - sz / 2) + 'px) scale(' + (1 - 0.8 * t) + ')', opacity: t < 0.15 ? t / 0.15 : t > 0.9 ? (1 - t) * 10 : 0.95 }); }
      this.part(layer, { width: sz + 'px', height: sz + 'px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.9)', background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,.95) 0 14%, rgba(255,255,255,.2) 38%, rgba(167,199,251,.18) 100%)' }, kf,
        { duration: 900 + Math.random() * 400, delay: Math.random() * 700, easing: 'cubic-bezier(.5,0,.9,.6)' });
    }
    const g2 = this.bubbleRef.current;
    if (g2) for (let i = 0; i < 14; i++) setTimeout(() => this.bubble(g2, g2.offsetWidth * (0.15 + Math.random() * 0.7), g2.offsetHeight * (0.4 + Math.random() * 0.5), 6 + Math.random() * 12, 30 + Math.random() * 40, (Math.random() - 0.5) * 30, 900 + Math.random() * 500), i * 60);
    land.animate([{ transform: 'none' }, { transform: 'translateX(-1.5px)' }, { transform: 'translateX(1.5px)' }, { transform: 'none' }], { duration: 140, iterations: 9, delay: 300 });
    setTimeout(() => {
      const mr = m.getBoundingClientRect();
      m.style.transformOrigin = (gx - mr.left) + 'px ' + (gy - mr.top) + 'px';
      m.animate([{ transform: 'none' }, { transform: 'scale(1.15) rotate(-4deg)', offset: 0.3 }, { transform: 'scale(9) rotate(-18deg)' }], { duration: 700, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'forwards' });
      land.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 760, fill: 'forwards' }).onfinish = finish;
    }, 1300);
  }

  // ---------- overlays ----------
  runSaveAnim() {
    const back = this.saveBackRef.current, m = this.saveMachRef.current, d = this.saveDrumRef.current;
    const done = () => this.setState({ savingAnim: false, addMsg: 'Transaction saved to the selected date.', addOk: true });
    if (!back || !m || !back.animate) return done();
    back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: 'both' });
    m.animate([{ transform: 'scale(.3) translateY(30px)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'both' });
    if (d) d.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(900deg)' }], { duration: 1300, delay: 300, easing: 'cubic-bezier(.4,0,.3,1)' });
    m.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-2px) rotate(-.6deg)' }, { transform: 'translateX(2px) rotate(.6deg)' }, { transform: 'translateX(0)' }], { duration: 160, delay: 500, iterations: 6 });
    setTimeout(() => {
      const a = m.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.25 }, { transform: 'scale(0) rotate(-20deg)', opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.55,0,.8,.4)', fill: 'forwards' });
      back.animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 520, fill: 'forwards' });
      a.onfinish = done;
    }, 1650);
  }
  zoomIn(t, rowEl) {
    if (this._zooming || Date.now() - (this._justDragged || 0) < 350) return;
    this._zooming = true;
    const r = rowEl.getBoundingClientRect();
    this._zoomFrom = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this.setState({ zoomTx: t }, () => {
      const back = this.zoomBackRef.current, lens = this.zoomLensRef.current;
      if (!back || !lens || !lens.animate) { this._zooming = false; return; }
      const lr = lens.getBoundingClientRect(), dx = this._zoomFrom.x - (lr.left + lr.width / 2), dy = this._zoomFrom.y - (lr.top + lr.height / 2);
      this._zoomD = { dx, dy };
      back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'both' });
      lens.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(0,0) scale(1.05)', opacity: 1, offset: 0.75 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'both' }).onfinish = () => { this._zooming = false; };
    });
  }
  zoomOut = () => {
    if (this._zooming) return;
    const back = this.zoomBackRef.current, lens = this.zoomLensRef.current, d = this._zoomD || { dx: 0, dy: 0 };
    if (!back || !lens || !lens.animate) return this.setState({ zoomTx: null });
    this._zooming = true;
    back.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    lens.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + d.dx + 'px,' + d.dy + 'px) scale(.12)', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).onfinish = () => { this._zooming = false; this.setState({ zoomTx: null }); };
  };
  zoomProps(t) {
    return { 'aria-label': 'Magnify ' + t.name, tabIndex: 0, onClick: (e) => this.zoomIn(t, e.currentTarget), onKeyDown: onEnter((e) => this.zoomIn(t, e.currentTarget)) };
  }

  // Draggable "change records" bubble on the settings page.
  chPD = (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; const el = this.chRef.current; if (!el) return; el.setPointerCapture(e.pointerId); const r = el.getBoundingClientRect(), pr = el.parentElement.getBoundingClientRect(); this.chD = { x: e.clientX, y: e.clientY, ox: r.left - pr.left, oy: r.top - pr.top, pw: pr.width, ph: pr.height, moved: false }; el.style.transition = 'transform .2s'; el.style.transform = 'scale(1.08)'; };
  chPM = (e) => { const d = this.chD, el = this.chRef.current; if (!d || !el) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!d.moved && Math.hypot(dx, dy) < 6) return; d.moved = true; if (this.state.chOpen) this.setState({ chOpen: false }); el.style.cursor = 'grabbing'; el.style.left = Math.max(4, Math.min(d.pw - 62, d.ox + dx)) + 'px'; d.cy = Math.max(60, Math.min(d.ph - 140, d.oy + dy)); el.style.top = d.cy + 'px'; d.cx = d.ox + dx + 29; };
  chPU = (e) => {
    const d = this.chD, el = this.chRef.current; this.chD = null; if (!d || !el) return;
    el.style.cursor = ''; el.style.transform = ''; el.style.transition = '';
    if (el.hasPointerCapture && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (!d.moved) return this.setState((s) => ({ chOpen: !s.chOpen }));
    const side = d.cx < d.pw / 2 ? 'left' : 'right';
    el.style.left = this.chLeft(side); el.style.top = d.cy + 'px';
    this.setState({ chSide: side, chTop: d.cy });
  };
  chLeft(side) { return side === 'left' ? '-6px' : 'calc(100% - 52px)'; }

  // ---------- actions ----------
  signOut() {
    localStorage.removeItem('token'); localStorage.removeItem('username'); localStorage.removeItem('selectedDate');
    this._entering = false; this._spinEl = null;
    this.setState({ landing: true, entering: false, broken: false, exploding: false, hits: 0, drum: [], soap: false, tossed: 0, auth: false, username: '', selectedDate: '', page: 'dash', modal: null, modalBusy: false, zoomTx: null, chOpen: false, lf: { username: '', password: '' }, loginErr: '', sf: EMPTY_SF, vis: {}, setErr: '', years: [], yearMonths: {}, cal: null, dayTx: [], dayDate: '', loadErr: '' });
  }

  onLogin = async (e) => {
    e.preventDefault();
    const s = this.state, username = s.lf.username.trim();
    if (!username || !s.lf.password) return this.setState({ loginErr: 'Username and password are required.' });
    this.setState({ loginBusy: true });
    try {
      const d = await api('/login', { method: 'POST', body: JSON.stringify({ username, password: s.lf.password }) });
      localStorage.setItem('token', d.token);
      localStorage.setItem('username', d.username || username);
      localStorage.removeItem('selectedDate');
      this.setState({ auth: true, loginBusy: false, loginErr: '', username: d.username || username, page: 'dash', selectedDate: '', lf: { username: '', password: '' } });
    } catch (x) {
      this.setState({ loginBusy: false, loginErr: x.message });
    }
  };

  go = (page) => this.setState({ page, modal: null });

  addYear = async () => {
    const y = Number(this.state.yearInput);
    if (!(y >= 2000 && y <= 2100)) return this.setState({ setupMsg: 'Year must be between 2000 and 2100.', setupOk: false });
    try {
      await api('/years', { method: 'POST', body: JSON.stringify({ year: y }) });
      this.setState({ setupMsg: `${y} is ready for transactions.`, setupOk: true });
      this.loadYears();
    } catch (x) {
      if (x.status === 401) return this.signOut();
      this.setState({ setupMsg: x.message, setupOk: false });
    }
  };

  addMonth = async (year) => {
    const m = Number(this.state.monthInput);
    if (!m) return this.setState({ yearMsg: 'Select a month first.', yearOk: false });
    try {
      await api(`/years/${year}/months`, { method: 'POST', body: JSON.stringify({ month: m }) });
      this.setState({ monthInput: '', yearMsg: 'Month added successfully.', yearOk: true });
      this.loadYear(year);
    } catch (x) {
      if (x.status === 401) return this.signOut();
      this.setState({ yearMsg: x.message, yearOk: false });
    }
  };

  recordPayment = async (r, amt) => {
    if (!(amt > 0)) return this.setState((st) => ({ payErr: { ...st.payErr, [r.id]: 'Enter a payment amount greater than ₱0.00.' } }));
    if (amt > r.out) return;
    try {
      await api('/transactions/' + r.id, { method: 'PATCH', body: JSON.stringify({ status: 'PARTIALLY PAID', amount_paid: r.paid + amt }) });
      this.setState((st) => ({ dayTx: st.dayTx.map((t) => (t.id === r.id ? { ...t, paid: t.paid + amt } : t)), payIn: { ...st.payIn, [r.id]: '0' }, payErr: { ...st.payErr, [r.id]: '' } }));
    } catch (x) {
      if (x.status === 401) return this.signOut();
      this.setState((st) => ({ payErr: { ...st.payErr, [r.id]: x.message } }));
    }
  };

  onSaveTx = async () => {
    const s = this.state;
    if (s.savingAnim || s.adding) return;
    const name = s.af.name.trim(), total = Number(s.af.total), paid = Number(s.af.paid);
    const bad = (m) => this.setState({ addMsg: m, addOk: false });
    if (!name) return bad('Customer name is required.');
    if (!(total >= 0.01)) return bad('Total amount must be at least ₱0.01.');
    if (s.af.paid === '' || !(paid >= 0)) return bad('Amount paid is required.');
    if (paid > total) return bad('Amount paid cannot exceed the total amount.');
    this.setState({ adding: true, addMsg: '' });
    try {
      await api('/transactions', { method: 'POST', body: JSON.stringify({ customer_name: name, total_amount: total, amount_paid: paid, transaction_date: s.selectedDate }) });
      this.setState({ adding: false, af: { name: '', total: '', paid: '' }, savingAnim: true, savingName: name.toUpperCase() }, () => this.runSaveAnim());
      this.loadDay(s.selectedDate);
      this.loadYear(Number(s.selectedDate.slice(0, 4)));
    } catch (x) {
      if (x.status === 401) return this.signOut();
      this.setState({ adding: false });
      bad(x.message);
    }
  };

  onSaveSettings = () => {
    const sf = this.state.sf, err = (m) => this.setState({ setErr: m });
    const uReq = !!sf.newUsername.trim(), pReq = !!(sf.newPassword || sf.confirmPassword);
    if (!uReq && !pReq) return err('Enter a new username or complete the password fields before saving.');
    if (uReq && !/^[A-Za-z0-9_]{3,32}$/.test(sf.newUsername.trim())) return err('Username must be 3-32 characters using only letters, numbers, or underscores.');
    if (!sf.currentPassword) return err('Enter your current password to change account credentials.');
    if (pReq && (!sf.newPassword || !sf.confirmPassword)) return err('Complete all password fields before saving.');
    if (pReq && sf.newPassword !== sf.confirmPassword) return err('New passwords do not match.');
    this.setState({ modal: { kind: 'cred' } });
  };

  confirmModal = async () => {
    const m = this.state.modal, sd = this.state.selectedDate;
    if (!m || this.state.modalBusy) return;
    if (m.kind === 'signout') return this.signOut();
    this.setState({ modalBusy: true });
    try {
      if (m.kind === 'cred') {
        const sf = this.state.sf;
        await api('/account', { method: 'PUT', body: JSON.stringify({ new_username: sf.newUsername.trim(), current_password: sf.currentPassword, new_password: sf.newPassword, confirm_password: sf.confirmPassword }) });
        return this.signOut();
      }
      if (m.kind === 'year') {
        await api('/years/' + m.id, { method: 'DELETE' });
        this.setState((st) => ({ modal: null, modalBusy: false, page: 'dash', selectedDate: sd.startsWith(m.id + '-') ? '' : st.selectedDate }));
        this.loadYears();
      } else {
        await api('/months/' + m.id, { method: 'DELETE' });
        this.setState({ modal: null, modalBusy: false, yearMsg: '' });
        this.loadYear(m.year);
      }
    } catch (x) {
      if (x.status === 401) return this.signOut();
      if (m.kind === 'cred') this.setState({ modal: null, modalBusy: false, setErr: x.message });
      else this.setState({ modalBusy: false, modal: { ...m, error: x.message } });
    }
  };

  // ---------- render ----------
  renderLanding() {
    const s = this.state, stg = this.stage();
    const tossedLabel = stg === 3 ? 'ERR · HOT' : stg === 2 ? 'ERR · E07' : s.soap && s.drum.length ? 'WASHING' : s.tossed + (s.tossed === 1 ? ' ITEM' : ' ITEMS') + (s.soap ? ' + SOAP' : '');
    const hint = s.entering ? 'Hold on — here we go!' : s.broken || s.exploding ? 'No more laundry today — tap to sign in.' : stg === 3 ? "It's smoking! Careful with those T-shirts…" : stg === 2 ? "Uh oh — it's making weird noises." : stg === 1 ? 'Hmm… that T-shirt hit hard.' : s.soap && s.drum.length ? 'Washing… keep tossing for a bigger load.' : s.drum.length ? 'Now toss in some powder.' : s.soap ? 'Soap is in — add some clothes.' : 'Swipe to pick a piece, tap to toss it in.';
    const W = WEARS[s.wi];
    return (
      <div ref={this.landRef} className="m-land">
        <Brand size={46} />
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="m-kicker">DAILY TRANSACTION MANAGEMENT</p>
          <h1>Toss it in. <em>We'll keep count.</em></h1>
        </div>
        <div className="m-machine-wrap" style={{ transform: `rotate(${stg === 3 ? -3 : stg === 2 ? -1 : 0}deg)` }}>
          <div ref={this.machineRef} className="m-machine" style={{ visibility: s.broken ? 'hidden' : 'visible' }}>
            <div className="m-panel-row">
              <div className="m-display" style={{ color: stg >= 2 ? '#ff8a7a' : '#ffd436' }}><span>WASH</span><span>{tossedLabel}</span></div>
              <span className="m-knob" style={{ transform: `rotate(${stg >= 3 ? 80 : stg >= 2 ? 35 : 0}deg)` }}><span /></span>
              <span className="m-bolt" />
              {stg < 1 ? <span className="m-bolt" /> : stg < 4 ? <span className="m-bolt off" /> : null}
            </div>
            <div className="m-door" style={{ transform: stg === 3 ? 'rotate(-6deg) translate(-3px,3px)' : 'none' }}>
              <div ref={this.glassRef} className="m-glass">
                <div ref={this.drumRef} className="m-fill">
                  {s.drum.map((d) => (
                    <div key={d.id} style={{ position: 'absolute', width: 34, height: 34, left: `calc(50% + ${Math.cos(d.a) * d.r - 17}px)`, top: `calc(50% + ${Math.sin(d.a) * d.r - 17}px)`, transform: `rotate(${d.rot}deg)` }}>
                      <Wear type={d.type} color={d.color} size={34} />
                    </div>
                  ))}
                </div>
                <div className="m-water" />
                {s.soap && <div className="m-foam" />}
                {stg >= 1 && <Crack d={CRACK1} />}
                {stg >= 2 && <Crack d={CRACK2} />}
                <div ref={this.bubbleRef} className="m-fill" style={{ pointerEvents: 'none' }} />
                <div className="m-shine" />
              </div>
            </div>
          </div>
        </div>
        <p className="m-hint">{hint}</p>
        <div className="m-toys">
          <button ref={this.powderRef} type="button" onClick={this.onPowder} aria-label="Toss laundry powder into the machine" className="m-tile m-powder">
            <svg viewBox="0 0 48 48" width="52" height="52"><path d="M10 15h28v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#fff" stroke="rgba(9,39,94,.35)" strokeWidth="1.5" /><path d="M10 15l4-8h20l4 8z" fill="#ffd436" {...STROKE} /><rect x="14" y="22" width="20" height="14" rx="2" fill="#1762c5" /><circle cx="20" cy="27" r="2.5" fill="#fff" /><circle cx="27" cy="31" r="3.2" fill="#fff" opacity=".85" /><circle cx="29" cy="25" r="1.6" fill="#fff" opacity=".8" /></svg>
            <span>{s.soap ? 'MORE SOAP' : 'POWDER'}</span>
          </button>
          <div className="m-tile m-wear">
            <div ref={this.wearVp} tabIndex={0} role="button" aria-label={W[2] + ' — tap to toss, swipe to change'} onPointerDown={this.onWPD} onPointerMove={this.onWPM} onPointerUp={this.onWPU} onPointerCancel={this.onWPC} onKeyDown={this.onWKey} className="m-swipe-vp">
              <div ref={this.wearTrack} className="m-track">
                {[-1, 0, 1].map((o) => { const X = WEARS[(s.wi + o + WEARS.length) % WEARS.length]; return <div key={o} data-slot={o} className="m-wear-slot"><Wear type={X[0]} color={X[1]} size={80} /></div>; })}
              </div>
            </div>
            <span className="m-wear-name">{W[2]}</span>
            <div className="m-dots">{WEARS.map((_, i) => <span key={i} style={{ width: i === s.wi ? 14 : 5, background: i === s.wi ? '#ffd436' : 'rgba(255,255,255,.35)' }} />)}</div>
          </div>
        </div>
        <button type="button" className="m-cta" onClick={this.toLogin}>Tap to Sign In</button>
        <div ref={this.flyRef} className="m-fly" />
      </div>
    );
  }

  renderLogin() {
    const s = this.state, setLf = (k) => (e) => this.setState({ lf: { ...s.lf, [k]: e.target.value }, loginErr: '' });
    return (
      <div ref={this.loginRef} className="m-login">
        <section className="m-login-hero">
          <Brand size={64} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="m-kicker">DAILY TRANSACTION MANAGEMENT</p>
            <h1>Fresh records.<br /><em>Clear days.</em></h1>
            <span>Keep every wash, payment, and customer neatly in one place.</span>
          </div>
        </section>
        <form className="m-login-form" onSubmit={this.onLogin} autoComplete="off">
          {s.loginErr && <div className="m-error" role="alert" style={{ marginBottom: 4 }}>{s.loginErr}</div>}
          <label className="m-label">Username or email<input className="m-input" value={s.lf.username} onChange={setLf('username')} placeholder="username" autoComplete="off" autoCapitalize="none" /></label>
          <label className="m-label">Password
            <div className="m-secret">
              <input className="m-input" type={s.showPw ? 'text' : 'password'} value={s.lf.password} onChange={setLf('password')} placeholder="password" autoComplete="current-password" />
              <button type="button" className="m-toggle" onClick={() => this.setState({ showPw: !s.showPw })}>{s.showPw ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <button type="submit" className="m-btn" style={{ width: '100%', marginTop: 28 }} disabled={s.loginBusy}>{s.loginBusy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    );
  }

  renderSetup() {
    const s = this.state;
    return (
      <div className="m-page">
        <div className="m-card" style={{ gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 20, borderBottom: '1px solid #e6eaf1' }}>
            <h2>Add a transaction year</h2>
            <span className="m-sub">Create a year before selecting its months and daily records.</span>
            <div className="m-row" style={{ marginTop: 4 }}>
              <input className="m-input" type="number" inputMode="numeric" min="2000" max="2100" value={s.yearInput} onChange={(e) => this.setState({ yearInput: e.target.value, setupMsg: '' })} />
              <button type="button" className="m-btn sm" onClick={this.addYear}>Add year</button>
            </div>
            {s.setupMsg && <div className={s.setupOk ? 'm-ok' : 'm-error'}>{s.setupMsg}</div>}
          </div>
          <div className="m-years">
            {[...s.years].sort((a, b) => b - a).map((y) => (
              <div key={y} role="button" tabIndex={0} className="m-year m-click" onClick={() => this.go('year' + y)} onKeyDown={onEnter(() => this.go('year' + y))}>
                <span>YEAR</span>
                <strong>{y}</strong>
                <small>Select month</small>
                <button type="button" className="m-trash" aria-label={`Delete year ${y}`} onClick={(e) => { e.stopPropagation(); this.setState({ modal: { kind: 'year', id: y, label: String(y) } }); }}><Trash /></button>
              </div>
            ))}
          </div>
          {!s.years.length && <div className="m-empty">No transaction years yet. Add your first year above.</div>}
        </div>
      </div>
    );
  }

  renderYear(year) {
    const s = this.state, sd = s.selectedDate, list = s.yearMonths[year];
    const months = (list || []).slice().sort((a, b) => a.m - b.m);
    return (
      <div className="m-page">
        <div className="m-card" style={{ gap: 8 }}>
          <h2>Add a month</h2>
          <span className="m-sub">Only months you add will appear below.</span>
          <div className="m-row" style={{ marginTop: 8 }}>
            <select className="m-input" value={s.monthInput} onChange={(e) => this.setState({ monthInput: e.target.value, yearMsg: '' })}>
              <option value="">Select month</option>
              {MN.map((label, i) => <option key={label} value={String(i + 1)}>{label}</option>)}
            </select>
            <button type="button" className="m-btn sm" onClick={() => this.addMonth(year)}>Add month</button>
          </div>
          {s.yearMsg && <div className={s.yearOk ? 'm-ok' : 'm-error'} style={{ marginTop: 4 }}>{s.yearMsg}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {months.map((mo) => {
            const label = `${MN[mo.m - 1]} ${mo.year}`;
            return (
              <div key={mo.id} role="button" tabIndex={0} className="m-month m-click" onClick={() => this.go('month' + mo.id)} onKeyDown={onEnter(() => this.go('month' + mo.id))}>
                <b>{label}</b>
                <small>Total earnings</small>
                <strong>{money(mo.earn)}</strong>
                <div className="m-month-foot"><span style={{ color: '#71809a' }}>{mo.count} transactions</span><span style={{ color: '#1762bb', fontWeight: 600 }}>Open calendar</span></div>
                {!sd && <button type="button" className="m-trash" aria-label={`Delete ${label}`} onClick={(e) => { e.stopPropagation(); this.setState({ modal: { kind: 'month', id: mo.id, year: mo.year, label } }); }}><Trash /></button>}
              </div>
            );
          })}
          {list && !months.length && <div className="m-empty">No months yet. Add one to begin.</div>}
          {!list && <div className="m-empty">Loading months…</div>}
        </div>
      </div>
    );
  }

  renderMonth(id) {
    const cal = this.state.cal;
    if (!cal || cal.id !== id) return <div className="m-page"><div className="m-empty">Loading calendar…</div></div>;
    const today = todayISO(), pad = new Date(cal.year, cal.m - 1, 1).getDay(), days = new Date(cal.year, cal.m, 0).getDate();
    const cells = Array.from({ length: pad }, () => null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);
    return (
      <div className="m-page" style={{ paddingLeft: 14, paddingRight: 14 }}>
        <h2 style={{ color: '#09275e', fontSize: 19, fontWeight: 700, padding: '0 4px' }}>Select a date · {MN[cal.m - 1]} {cal.year}</h2>
        <section className="m-cal">
          <div className="m-cal-head">{WEEKDAYS.map((w) => <b key={w}>{w}</b>)}</div>
          <div className="m-cal-grid">
            {cells.map((d, i) => {
              if (!d) return <button key={i} type="button" className="m-cell" disabled style={{ background: '#fff' }} />;
              const date = ymd(cal.year, cal.m, d), info = cal.days[String(d)], isToday = date === today;
              return (
                <button key={i} type="button" className="m-cell" style={{ background: isToday ? '#eaf2ff' : '#fff' }} onClick={() => this.setState({ selectedDate: date, page: 'dash', tab: 'all', payIn: {}, payErr: {} })}>
                  <b style={{ color: isToday ? '#1762c5' : '#17233b' }}>{d}</b>
                  <strong>{info ? shortMoney(Number(info.total_paid) || 0) : ''}</strong>
                  <small>{info ? `${info.count} tx` : 'No tx'}</small>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  renderDash(rows) {
    const s = this.state;
    const sum = (k) => rows.reduce((a, t) => a + t[k], 0);
    const stats = [
      { label: "Today's transactions", value: rows.length, icon: '▤', k: 'all' },
      { label: "Today's total amount", value: money(sum('total')), icon: '₱', k: 'all' },
      { label: 'Total paid', value: money(sum('paid')), icon: '✓', k: 'paid' },
      { label: 'Total unpaid', value: money(sum('out')), icon: '◷', k: 'unpaid' },
    ];
    const lists = { all: rows, paid: rows.filter((r) => r.out <= 0), unpaid: rows.filter((r) => r.out > 0) };
    const ci = this.ci();
    const slots = [-1, 0, 1].map((o) => CYC[(ci + o + 3) % 3]);
    return (
      <div className="m-page">
        <div className="m-stats">
          {stats.map((x) => (
            <button key={x.label} type="button" className="m-stat" aria-label={'Show ' + LBL[x.k]} onClick={() => this.jumpTo(x.k)}>
              <div className="m-stat-top"><p>{x.label}</p><span className="m-stat-icon">{x.icon}</span></div>
              <strong>{x.value}</strong>
            </button>
          ))}
        </div>
        <article ref={this.listRef} className="m-card flat m-list">
          <div role="tablist" className="m-tabs">
            <div ref={this.labelRef} className="m-track">
              {slots.map((k, i) => <div key={i} className="m-slot"><h2 role="tab" aria-selected={i === 1}>{LBL[k]}</h2></div>)}
            </div>
          </div>
          <div ref={this.vpRef} tabIndex={0} aria-label="Customer lists — swipe or use arrow keys" onPointerDown={this.onPD} onPointerMove={this.onPM} onPointerUp={this.onPU} onPointerCancel={this.onPU} onKeyDown={this.onKey} className="m-lists-vp">
            <div ref={this.trackRef} className="m-track">
              {slots.map((k, i) => {
                const list = lists[k];
                return (
                  <section key={i} aria-hidden={i !== 1}>
                    {k !== 'unpaid' && list.length > 0 && (
                      <table className="m-table">
                        <thead><tr><th>Customer Name</th><th className="r">{k === 'paid' ? 'Amount Paid' : 'Total Amount'}</th></tr></thead>
                        <tbody>{list.map((r) => <tr key={r.id} {...this.zoomProps(r)}><td><strong>{r.name}</strong></td><td className="r">{money(k === 'paid' ? r.paid : r.total)}</td></tr>)}</tbody>
                      </table>
                    )}
                    {k === 'unpaid' && list.map((r) => {
                      const raw = s.payIn[r.id] ?? '0', amt = Number(raw), err = s.payErr[r.id] || '', off = !!err || !(amt > 0);
                      return (
                        <div key={r.id} className="m-unpaid">
                          <div className="m-unpaid-top"><strong>{r.name}</strong><span>of {money(r.total)}</span></div>
                          <div className="m-unpaid-grid">
                            <label className="m-cap">Amount paid
                              <input className="m-input" type="number" inputMode="decimal" min="0" step=".01" value={raw} style={{ borderColor: err ? '#b3372f' : '#d8dfeb' }}
                                onChange={(e) => { const v = e.target.value, a = Number(v); this.setState((st) => ({ payIn: { ...st.payIn, [r.id]: v }, payErr: { ...st.payErr, [r.id]: a > r.out ? `Payment amount cannot exceed remaining balance of ${money(r.out)}.` : '' } })); }} />
                            </label>
                            <div className="m-remaining"><span className="m-cap">Remaining</span><b>{money(Math.max(0, r.out - (Number.isFinite(amt) ? amt : 0)))}</b></div>
                          </div>
                          {err && <small className="m-pay-err">{err}</small>}
                          <button type="button" className="m-pay" disabled={off} onClick={() => this.recordPayment(r, amt)}>Record payment</button>
                        </div>
                      );
                    })}
                    {!list.length && <div className="m-empty" style={{ padding: 35 }}>No customers in this view right now.</div>}
                  </section>
                );
              })}
            </div>
          </div>
          <div className="m-tabdots">
            {['paid', 'all', 'unpaid'].map((k) => <button key={k} type="button" aria-label={LBL[k]} onClick={() => this.goTo(k)} style={{ width: s.tab === k ? 18 : 6, background: s.tab === k ? '#123d86' : '#c9d6ea' }} />)}
          </div>
        </article>
      </div>
    );
  }

  renderAdd() {
    const s = this.state, setAf = (k) => (e) => this.setState({ af: { ...s.af, [k]: e.target.value }, addMsg: '' });
    return (
      <div className="m-page">
        <div className="m-card" style={{ borderRadius: 14, boxShadow: '0 4px 12px rgba(39,67,108,.03)' }}>
          <h2>Transaction details</h2>
          <label className="m-label">Customer name<input className="m-input" value={s.af.name} onChange={setAf('name')} placeholder="e.g. Juan Dela Cruz" /></label>
          <label className="m-label">Total amount<input className="m-input" type="number" min=".01" step=".01" inputMode="decimal" value={s.af.total} onChange={setAf('total')} /></label>
          <label className="m-label">Amount paid<input className="m-input" type="number" min="0" step=".01" inputMode="decimal" value={s.af.paid} onChange={setAf('paid')} /></label>
          <label className="m-label">Transaction date<input className="m-input" type="date" value={s.selectedDate} disabled /></label>
          <button type="button" className="m-btn" style={{ marginTop: 32, padding: '14px 18px' }} onClick={this.onSaveTx} disabled={s.adding}>✓ Add Customer</button>
          {s.addMsg && <div className={s.addOk ? 'm-ok' : 'm-error'} style={{ marginTop: 12 }}>{s.addMsg}</div>}
        </div>
      </div>
    );
  }

  renderDaily(rows) {
    const sum = (k) => rows.reduce((a, t) => a + t[k], 0), m0 = (n) => money(n).replace('.00', '');
    return (
      <div className="m-page">
        <div className="m-daily">
          <div><p>DAILY EARNINGS</p><strong>{money(sum('paid'))}</strong></div>
          <div style={{ textAlign: 'right' }}><p>TRANSACTIONS</p><b>{rows.length}</b></div>
          <div style={{ gridColumn: '1 / -1' }}><p>TOTAL AMOUNT</p><b>{money(sum('total'))}</b></div>
        </div>
        <article className="m-card flat">
          <h2 style={{ margin: '0 0 8px' }}>Customers</h2>
          <table className="m-dtable">
            <thead><tr><th>Customer name</th><th className="r">Total</th><th className="r">Paid</th><th className="r">Balance</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} {...this.zoomProps(t)}>
                  <td><b>{t.name}</b><small>{t.time}</small></td>
                  <td className="r">{m0(t.total)}</td>
                  <td className="r">{m0(t.paid)}</td>
                  <td className="r" style={{ fontWeight: t.out ? 600 : 400 }}>{m0(t.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="m-empty" style={{ padding: 35 }}>No transactions recorded.</div>}
        </article>
      </div>
    );
  }

  renderSettings() {
    const s = this.state, sf = s.sf, setSF = (k) => (e) => this.setState({ sf: { ...sf, [k]: e.target.value }, setErr: '' });
    const fields = [['currentPassword', 'Current password', 'current'], ['newPassword', 'New password', 'next'], ['confirmPassword', 'Confirm new password', 'confirm']];
    return (
      <div className="m-page" style={{ gap: 18 }}>
        {s.setErr && <div role="alert" className="m-error" style={{ padding: '11px 13px', borderRadius: 8, fontSize: 13 }}>{s.setErr}</div>}
        <section className="m-card flat m-settings" style={{ padding: 20, borderRadius: 14 }}>
          <h2>Username</h2>
          <span className="hint">Use a unique username to identify your account.</span>
          <label className="m-label">Current username<input className="m-input" value={s.username} disabled /></label>
          <label className="m-label">New username<input className="m-input" value={sf.newUsername} onChange={setSF('newUsername')} placeholder="Enter new username" autoCapitalize="none" autoComplete="off" /></label>
          <h2 className="split">Change password</h2>
          <span className="hint">Use a strong password you do not reuse elsewhere.</span>
          {fields.map(([k, label, vk]) => (
            <label key={k} className="m-label">{label}
              <div className="m-secret">
                <input className="m-input" type={s.vis[vk] ? 'text' : 'password'} value={sf[k]} onChange={setSF(k)} autoComplete="new-password" />
                <button type="button" className="m-toggle" onClick={() => this.setState((st) => ({ vis: { ...st.vis, [vk]: !st.vis[vk] } }))}>{s.vis[vk] ? 'Hide' : 'Show'}</button>
              </div>
            </label>
          ))}
          <button type="button" className="m-btn sm" style={{ width: '100%', marginTop: 22, padding: '12px 18px' }} onClick={this.onSaveSettings}>Save changes</button>
        </section>
      </div>
    );
  }

  renderChanger() {
    const s = this.state, sd = s.selectedDate, open = s.chOpen, close = () => this.setState({ chOpen: false });
    const yr = sd ? Number(sd.slice(0, 4)) : null;
    const mo = sd ? (s.yearMonths[yr] || []).find((m) => m.m === Number(sd.slice(5, 7))) : null;
    const H = this.rootRef.current?.offsetHeight || 844;
    const panelTop = Math.max(64, Math.min(s.chTop - 60, H - 324));
    const item = (key, icon, title, sub, onClick, danger) => (
      <button key={key} type="button" className={'m-ch-item' + (danger ? ' danger' : '')} onClick={onClick}>
        <span className="m-ch-icon">{icon}</span>
        <span className="m-ch-text"><b>{title}</b><small>{sub}</small></span>
        <span className="m-ch-arrow">›</span>
      </button>
    );
    return (
      <>
        <div className="m-ch-back" onClick={close} style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
        <div className="m-ch-panel" style={{ top: panelTop, transformOrigin: (s.chSide === 'left' ? '0px ' : '100% ') + (s.chTop - panelTop + 29) + 'px', transform: `scale(${open ? 1 : 0.2})`, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}>
          <div className="m-ch-title"><b>Change records</b><span>{sd ? fmtDate(sd) : 'No date'}</span></div>
          {item('y', 'Y', 'Change year', yr ? 'Current: ' + yr : 'Pick a transaction year', () => this.setState({ chOpen: false, selectedDate: '', page: 'dash', modal: null }))}
          {item('m', 'M', 'Change month', yr ? 'Months in ' + yr : 'Pick a year first', () => this.setState({ chOpen: false, page: yr ? 'year' + yr : 'dash' }))}
          {item('d', 'D', 'Change date', mo ? MN[mo.m - 1] + ' ' + mo.year + ' calendar' : 'Pick a month first', () => this.setState({ chOpen: false, page: mo ? 'month' + mo.id : yr ? 'year' + yr : 'dash' }))}
          {item('o', <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>, 'Sign out', 'End your current session on this device.', () => this.setState({ chOpen: false, modal: { kind: 'signout' } }), true)}
        </div>
        <div ref={this.chRef} role="button" tabIndex={0} aria-label="Change year, month, date, or sign out" aria-expanded={open}
          onPointerDown={this.chPD} onPointerMove={this.chPM} onPointerUp={this.chPU} onPointerCancel={this.chPU}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.setState({ chOpen: !open }); } if (e.key === 'Escape') close(); }}
          className="m-ch-fab" style={{ left: this.chLeft(s.chSide), top: s.chTop }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
          <span className="m-ch-badge">4</span>
        </div>
      </>
    );
  }

  renderZoom() {
    const t = this.state.zoomTx, b = Math.max(0, t.total - t.paid), st = b <= 0 ? 'PAID' : t.paid > 0 ? 'PARTIALLY PAID' : 'UNPAID';
    const tag = st === 'PAID' ? ['#e7f7ec', '#187443'] : st === 'UNPAID' ? ['#ffebe9', '#b33a32'] : ['#fff4d6', '#a87100'];
    return (
      <div ref={this.zoomBackRef} onClick={this.zoomOut} className="m-overlay m-zoom">
        <div ref={this.zoomLensRef} role="dialog" aria-label={t.name + ' details'} className="m-lens">
          <span aria-hidden="true" className="m-lens-handle" />
          <div className="m-lens-glass">
            <span aria-hidden="true" className="m-lens-shine" />
            <span className="m-lens-time">{t.time}</span>
            <b className="m-lens-name">{t.name}</b>
            <span className="m-lens-tag" style={{ background: tag[0], color: tag[1] }}>{st}</span>
            <div className="m-lens-nums">
              <div><span>TOTAL</span><b style={{ color: '#17233b' }}>{money(t.total)}</b></div>
              <div><span>PAID</span><b style={{ color: '#187443' }}>{money(t.paid)}</b></div>
              <div><span>BALANCE</span><b style={{ color: b ? '#b3372f' : '#17233b' }}>{money(b)}</b></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderSaving() {
    return (
      <div ref={this.saveBackRef} aria-live="polite" aria-label="Saving customer" className="m-overlay m-saving">
        <div ref={this.saveMachRef} className="m-mini">
          <div className="m-panel-row" style={{ gap: 6 }}>
            <div className="m-display">{this.state.savingName}</div>
            <span className="m-knob"><span /></span>
          </div>
          <div className="m-door">
            <div className="m-glass">
              <div ref={this.saveDrumRef} className="m-fill">
                <span style={{ position: 'absolute', left: '18%', top: '20%' }}><Wear type="shirt" color="#ffd436" size={34} /></span>
                <span style={{ position: 'absolute', right: '16%', bottom: '22%', transform: 'rotate(140deg)' }}><Wear type="shorts" color="#1762c5" size={30} /></span>
              </div>
              <div className="m-water" />
              <div className="m-shine" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderModal() {
    const m = this.state.modal, busy = this.state.modalBusy;
    let v;
    if (m.kind === 'year' || m.kind === 'month') v = { kicker: true, title: `Are you sure you want to delete ${m.label}?`, body: 'Warning: This action cannot be undone. All associated customer records, daily transactions, and financial data for this timeframe will be permanently removed.', confirm: busy ? 'Deleting…' : 'Delete', bg: '#b3372f', icon: '!', iconBg: '#fff0df', iconFg: '#b3372f', left: true };
    else if (m.kind === 'signout') v = { title: 'Sign Out of Bubblebee Laundry Shop?', body: 'Are you sure you want to log out? Any unsaved changes in active transaction drafts may be lost.', confirm: 'Yes, Sign Out', bg: '#123d86', icon: '↪', iconBg: '#fff4d6', iconFg: '#a87100' };
    else v = { title: 'Confirm Credential Update', body: 'Are you sure you want to update your login credentials? You will need to use these new credentials for future logins.', confirm: busy ? 'Saving…' : 'Yes, Save Changes', bg: '#123d86', icon: '!', iconBg: '#fff4d6', iconFg: '#a87100' };
    const close = () => !busy && this.setState({ modal: null });
    return (
      <div onClick={close} className="m-overlay m-modal-back">
        <section role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="m-modal" style={{ textAlign: v.left ? 'left' : 'center' }}>
          <div className="m-modal-icon" style={{ margin: v.left ? 0 : '0 auto', background: v.iconBg, color: v.iconFg }}>{v.icon}</div>
          {v.kicker && <p className="kick">PERMANENT DELETION</p>}
          <h2>{v.title}</h2>
          <p className="body">{v.body}</p>
          {m.error && <div className="m-error" style={{ marginTop: 12 }}>{m.error}</div>}
          <div className="m-modal-actions">
            <button type="button" onClick={this.confirmModal} disabled={busy} style={{ border: '1px solid ' + v.bg, background: v.bg, color: '#fff' }}>{v.confirm}</button>
            <button type="button" className="m-cancel" onClick={close} disabled={busy}>Cancel</button>
          </div>
        </section>
      </div>
    );
  }

  render() {
    const s = this.state, sd = s.selectedDate, page = s.page;
    const isYear = s.auth && page.startsWith('year'), isMonth = s.auth && page.startsWith('month');
    const onboarded = s.auth && !!sd;
    const statusBg = s.auth ? '#09275e' : '#123d86';
    const rows = s.dayDate === sd ? s.dayTx.map((t) => ({ ...t, out: Math.max(0, t.total - t.paid) })) : [];
    const goBack = () => {
      if (isMonth) { const id = Number(page.slice(5)), y = s.cal && s.cal.id === id ? s.cal.year : null; this.go(y ? 'year' + y : 'dash'); }
      else this.go('dash');
    };
    const nav = [['dash', 'Dashboard', '▦'], ['add', 'Add Customer', '♙'], ['date', 'Daily', '◷'], ['settings', 'Settings', '⚙']];

    // Keyed per view so React never reuses one view's DOM (and its finished
    // fill:'forwards' animations) for the next one.
    let body = null, view = page;
    if (!s.auth) view = s.landing ? 'landing' : 'login';
    else if (!sd && page === 'dash') view = 'setup';
    if (!s.auth) body = s.landing ? this.renderLanding() : this.renderLogin();
    else if (page === 'settings') body = this.renderSettings();
    else if (isYear) body = this.renderYear(Number(page.slice(4)));
    else if (isMonth) body = this.renderMonth(Number(page.slice(5)));
    else if (!sd) body = this.renderSetup();
    else if (page === 'dash') body = this.renderDash(rows);
    else if (page === 'add') body = this.renderAdd();
    else if (page === 'date') body = this.renderDaily(rows);

    return (
      <div ref={this.rootRef} className="m-app">
        <div className="m-safe-top" style={{ background: statusBg }} />
        {s.auth && (
          <div className="m-topbar">
            {(isYear || isMonth) && <button type="button" className="m-back" aria-label="Back" onClick={goBack}>←</button>}
            <img src={LOGO} alt="Bubblebee Laundry Shop" className="m-logo" width="40" height="40" />
            <div className="m-brand"><b>Bubblebee</b><small>Laundry Shop</small></div>
            {sd && <span className="m-datechip">{fmtDate(sd)}</span>}
          </div>
        )}
        <div ref={this.scrollRef} className="m-scroll">
          {s.auth && s.loadErr && <div className="m-error" role="alert" style={{ margin: '16px 18px 0' }}>{s.loadErr}</div>}
          <Fragment key={view}>{body}</Fragment>
        </div>
        {onboarded && !isYear && !isMonth && (
          <div className="m-nav" role="navigation">
            {nav.map(([k, label, icon]) => (
              <button key={k} type="button" onClick={() => this.setState({ page: k, modal: null, addMsg: '', setErr: '', zoomTx: null })} style={{ background: page === k ? '#2456a0' : 'transparent', color: page === k ? '#fff' : '#c5d8f4' }}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
        )}
        {s.auth && page === 'settings' && this.renderChanger()}
        {s.zoomTx && (page === 'date' || page === 'dash') && this.renderZoom()}
        {s.savingAnim && this.renderSaving()}
        {s.modal && this.renderModal()}
      </div>
    );
  }
}
