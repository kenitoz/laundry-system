# Bubblebee Laundry Expo Native App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Android app in `native/` (Expo, React Native, Expo Router, EAS development builds) with full parity with the v3 mobile web UI, talking to the hosted Flask API. Also add a database check to `/api/health`.

**Architecture:** Expo Router screens are thin. Logic lives in pure modules with tests: format, validation, tabs, the game reducer and the effect math. Screens get data through one `api()` client and a `useRemote()` hook. The landing game splits into a pure reducer (`useWasherGame`), pure effect factories with frame math (`effects.js`), and Reanimated renderers.

**Tech Stack:**
- Expo SDK (latest from `create-expo-app@latest`), Expo Router, React Native, JavaScript;
- react-native-reanimated, react-native-gesture-handler, react-native-svg;
- expo-secure-store, @react-native-async-storage/async-storage;
- @expo-google-fonts/dm-sans, @expo-google-fonts/playfair-display;
- EAS Build;
- Jest + jest-expo + @testing-library/react-native + `expo-router/testing-library`;
- Flask + pytest for the backend.

**Spec:** `docs/superpowers/specs/2026-10-16-expo-native-app-design.md`. Read it first; section numbers below refer to it.

**Reference implementation:** `src/mobile/MobileApp.jsx` and `src/mobile/mobile.css` (web v3). Copy text, colors and animation numbers from there whenever the spec says "same as web".

## Global Constraints

- All app code goes in `native/`, in JavaScript (`.js`/`.jsx`). No TypeScript.
- Android package `com.kenitoz.bubblebee`. App name `Bubblebee Laundry`. URL scheme `bubblebee`.
- API base URL comes only from `process.env.EXPO_PUBLIC_API_URL`, e.g. `https://<app>.vercel.app/api`.
- API timeout is 15 000 ms. The network/timeout message is exactly `Can't reach the server. Check your connection.`
- On HTTP 401, clear the session and go to `/` (the landing screen).
- The token goes in `expo-secure-store` under key `token`. `username` and `selectedDate` go in AsyncStorage under those keys.
- Brand colors:
  - `#09275e` navy, `#123d86` blue, `#1762c5` brand, `#ffd436` yellow;
  - `#17233b` ink, `#71809a` muted, `#e6eaf1` line, `#d8dfeb` field border, `#f6f8fb` background;
  - `#b3372f` danger, `#187443` ok, `#e7f7ec` ok background, `#ffebe9` error background.
- Fonts: DM Sans (400/700) for UI, Playfair Display (700 and 700 italic) for brand and headings.
- Status bar: `#123d86` when signed out, `#09275e` when signed in, light content.
- User-facing text must match the web version character for character wherever the spec says "same as web".
- Game constants: `HITS_TO_BREAK = 6`, drum max 10 items, at most 150 live effects.
- Do not change the web app (`src/`, `index.html`) or any existing API route. The only backend change is `/api/health` (Task 1).
- Run every `native` command from `native/`. Run backend tests from `backend/` with `.venv/bin/python -m pytest`.

## Review Focus

1. **Session invalidated mid-use** (password changed on the web, or token rejected): any request returns 401. The app must land on the landing screen once, with the storage cleared, and no redirect loop or red error screen. Pinned in Task 4.
2. **Typed amounts the phone keyboard produces:**
   - `50,5` must read as 50.5;
   - empty input, `.` or `abc` must never show `₱NaN`, and must keep Record payment / Add Customer disabled or show the validation message.
   - Pinned in Task 3 and Task 9.
3. **Double tap on a write action:** pressing Add Customer, Record payment or Delete twice quickly must call the API once. Pinned in Tasks 8, 9 and 10.
4. **The selected date's month or year was deleted elsewhere:** Daily and Dashboard show the empty state, and Change date shows `Pick a month first`. Nothing crashes. Pinned in Tasks 10 and 11.
5. **Leaving the landing screen mid-animation** (app backgrounded, or Tap to Sign In during the explosion): all timers and intervals are cleared on unmount, and there are no state updates after unmount. Pinned in Task 13.

## Owner setup (not code, needed before Task 14)

These are spec §7 steps 1–4. The owner does them; the implementer only reminds and verifies.

1. Aiven: in the existing MySQL service, set `DB_NAME=bubblebee_laundry` in the local `backend/.env` along with the Aiven host, port, user and password. Run `cd backend && .venv/bin/python app.py` once, then stop it.
2. Vercel: import the repo and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and optionally `APP_UTC_OFFSET`. The deployment for `feat/android-v3` gives a preview URL.
3. Verify: `curl https://<preview>.vercel.app/api/health` returns `"database": "ok"` (after Task 1 is deployed).
4. Expo: `npx eas login`.

---

### Task 1: `/api/health` reports database connectivity

**Files:**
- Modify: `backend/app.py:317-319` (`health()`)
- Create: `backend/requirements-dev.txt` (`-r requirements.txt`, `pytest`)
- Create: `backend/tests/test_health.py`

**Interfaces:**
- Produces: `GET /api/health` returns `200 {"ok": true, "engine": ENGINE, "database": "ok"}`, or `503 {"ok": false, "engine": ENGINE, "database": "<error message>"}`. No auth required.

- [ ] **Step 1: Write the failing tests** in `backend/tests/test_health.py`. Import `app` as a module with `sys.path` pointing at `backend/`. Use a `tmp_path` SQLite file: set `A.ENGINE = 'sqlite'`, `A.SQLITE_PATH = str(tmp_path / 't.db')`, then call `A.init_sqlite()`.
  - `test_health_ok_sqlite`: status 200, `json['database'] == 'ok'`, `json['ok'] is True`.
  - `test_health_db_down`: monkeypatch `A.db` to raise `Exception('boom')`. Expect status 503, `json['ok'] is False`, `'boom' in json['database']`.
- [ ] **Step 2: Run them and confirm they fail.** Run `cd backend && .venv/bin/pip install -r requirements-dev.txt && .venv/bin/python -m pytest tests/test_health.py -v`. Expected: `KeyError: 'database'` / an assertion error.
- [ ] **Step 3: Implement `health()`.** Open a connection with `db()`, run `SELECT 1` through `exec_sql`, and close it in `finally`. On any exception, return 503 with `str(e)`.
- [ ] **Step 4: Run the tests and confirm they pass.** Same command. Expected: `2 passed`.
- [ ] **Step 5: Commit:** `git add backend/app.py backend/requirements-dev.txt backend/tests && git commit -m "Report database connectivity in /api/health"`

---

### Task 2: Scaffold `native/` (Expo Router, Jest, EAS)

**Files:**
- Create: `native/` from the template, then edit:
  - `native/package.json`: set `"main": "expo-router/entry"`; add `test` and `lint` scripts and the `jest` config;
  - `native/app.json`;
  - `native/eas.json`;
  - `native/.env.example`;
  - `native/jest.setup.js`;
  - `native/app/_layout.jsx` (placeholder);
  - `native/app/index.jsx` (placeholder);
  - `native/assets/` (icon, adaptive icon, splash from `public/bubblebee-logo.jpg`).
- Test: `native/__tests__/smoke.test.jsx`

**Interfaces:**
- Produces: a working `npx jest` and `npx expo export --platform android` in `native/`. Path alias: none; use relative imports.

- [ ] **Step 1: Create the app.** From the repo root run `npx create-expo-app@latest native --template blank`, then `cd native`, then:
  - `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar react-native-gesture-handler react-native-reanimated react-native-svg expo-secure-store @react-native-async-storage/async-storage expo-font expo-splash-screen @expo-google-fonts/dm-sans @expo-google-fonts/playfair-display expo-dev-client`
  - `npx expo install -- --save-dev jest jest-expo @testing-library/react-native`
  - If the template created its own `.git`, remove that inner `.git`. The folder must be part of this repo.
- [ ] **Step 2: Configure `app.json`:**
  - `name: "Bubblebee Laundry"`, `slug: "bubblebee-laundry"`, `scheme: "bubblebee"`, `userInterfaceStyle: "light"`;
  - `android.package: "com.kenitoz.bubblebee"`;
  - adaptive icon foreground from the logo, background `#123d86`;
  - splash image = logo, background `#123d86`;
  - `plugins: ["expo-router", "expo-secure-store", "expo-font"]`.
- [ ] **Step 3: Configure `eas.json`** with the three profiles from spec §7:
  - `development`: `developmentClient: true`, `distribution: "internal"`, `android.buildType: "apk"`;
  - `preview`: `distribution: "internal"`, `android.buildType: "apk"`;
  - `production`: `android.buildType: "app-bundle"`.
  - Each profile has `env.EXPO_PUBLIC_API_URL`, set to the owner's Vercel URL with the placeholder `https://REPLACE-ME.vercel.app/api` until the owner provides it.
  - `.env.example` contains `EXPO_PUBLIC_API_URL=`.
  - Add `native/.env` to the root `.gitignore`.
- [ ] **Step 4: Configure Jest** in `package.json`:
  - `"jest": { "preset": "jest-expo", "setupFiles": ["./jest.setup.js"] }`;
  - `jest.setup.js` mocks `react-native-reanimated` (`require('react-native-reanimated/mock')`), loads `react-native-gesture-handler/jestSetup`, and mocks AsyncStorage (`@react-native-async-storage/async-storage/jest/async-storage-mock`) and `expo-secure-store` (an in-memory `getItemAsync`/`setItemAsync`/`deleteItemAsync`).
- [ ] **Step 5: Write the smoke test.** `__tests__/smoke.test.jsx` renders `app/index.jsx` (placeholder text `Bubblebee`) with `render` and asserts `getByText('Bubblebee')`.
- [ ] **Step 6: Verify.** `npx jest` gives `1 passed`. `npx expo export --platform android --output-dir /tmp/bb-export` exits 0. Then delete `/tmp/bb-export`.
- [ ] **Step 7: Commit:** `git add native .gitignore && git commit -m "Scaffold Expo app in native/"`

---

### Task 3: Theme, formatting, validation, tab helpers (pure modules)

**Files:**
- Create: `native/src/theme.js`, `native/src/format.js`, `native/src/validation.js`, `native/src/tabs.js`
- Test: `native/__tests__/format.test.js`, `validation.test.js`, `tabs.test.js`

**Interfaces:**
- Produces:
  - `theme.js`:
    - `colors` with keys `navy blue brand yellow ink muted line field bg danger ok okBg errBg` (values from Global Constraints);
    - `fonts = { sans, sansBold, display, displayItalic }`, the `@expo-google-fonts` family names `DMSans_400Regular`, `DMSans_700Bold`, `PlayfairDisplay_700Bold`, `PlayfairDisplay_700Bold_Italic`;
    - `radius`, `shadow.card`.
  - `format.js`:
    - `MONTHS: string[12]`;
    - `money(n) -> string` (`Intl` `en-PH`, PHP);
    - `shortMoney(n) -> string`;
    - `ymd(y, m, d) -> 'YYYY-MM-DD'`;
    - `todayISO(now = new Date()) -> string` (local date);
    - `fmtDate(iso, month = 'short') -> string` (`en-PH`, noon local time to avoid date shift);
    - `buildCalendar(year, month) -> (number|null)[]`.
  - `validation.js`:
    - `parseAmount(raw) -> number` (NaN when invalid; a comma is a decimal point);
    - `validateYear(value) -> string`;
    - `validateMonth(value) -> string`;
    - `validateTransaction({ name, total, paid }) -> string`;
    - `paymentState(raw, remaining) -> { amount, remainingAfter, error, canRecord }`;
    - `validateCredentials({ newUsername, currentPassword, newPassword, confirmPassword }) -> string`.
    - Every validator returns `''` when valid.
  - `tabs.js`:
    - `TAB_CYCLE = ['all', 'unpaid', 'paid']`;
    - `DOT_ORDER = ['paid', 'all', 'unpaid']`;
    - `TAB_LABELS = { all: "Today's All Customers", paid: 'Paid Customers', unpaid: 'Unpaid Customers' }`;
    - `stepTab(tab, dir) -> tab` (`dir` is ±1, wraps around).

- [ ] **Step 1: Write the failing tests:**
  - `shortMoney(950) === '₱950'`, `shortMoney(1200) === '₱1.2k'`, `shortMoney(2000) === '₱2k'`.
  - `money(1250)` contains `1,250.00`.
  - `buildCalendar(2026, 2)`: length % 7 === 0, the first 0 entries are null (Feb 1 2026 is a Sunday), and it contains 28 numbers.
  - `buildCalendar(2028, 2)` contains 29 numbers.
  - `buildCalendar(2026, 1)` starts with 4 nulls.
  - `todayISO(new Date(2026, 0, 5)) === '2026-01-05'`.
  - `parseAmount('50,5') === 50.5`; `parseAmount('')`, `parseAmount('.')` and `parseAmount('abc')` are all NaN.
  - `validateTransaction` returns these exact messages in this order:
    1. `'Customer name is required.'` for a blank or whitespace name;
    2. `'Total amount must be at least ₱0.01.'` for a total of `0` or `abc`;
    3. `'Amount paid is required.'` for paid `''` or `abc`;
    4. `'Amount paid cannot exceed the total amount.'` for 300/250;
    - `''` for a valid input.
  - `validateYear('1999')` is `'Year must be between 2000 and 2100.'`; `validateYear('2026')` is `''`.
  - `validateMonth('')` is `'Select a month first.'`.
  - `paymentState('', 100)` gives `{ canRecord: false, error: '' }`, with `remainingAfter` 100.
  - `paymentState('150', 100).error` is `'Payment amount cannot exceed remaining balance of ₱100.00.'`, and `canRecord` is false.
  - `paymentState('50,5', 100)` gives `canRecord: true`, `remainingAfter: 49.5`.
  - `paymentState('abc', 100)` gives `canRecord: false`, `remainingAfter: 100`.
  - `validateCredentials` returns each of the five web messages from `MobileApp.onSaveSettings`, in its order.
  - `stepTab('all', 1) === 'unpaid'`, `stepTab('paid', 1) === 'all'`, `stepTab('all', -1) === 'paid'`.
- [ ] **Step 2: Run them and confirm they fail.** `npx jest __tests__/format.test.js __tests__/validation.test.js __tests__/tabs.test.js` fails with "Cannot find module".
- [ ] **Step 3: Implement the four modules** with the signatures above. Copy the messages verbatim from `src/mobile/MobileApp.jsx`.
- [ ] **Step 4: Run the tests and confirm they pass.** Same command, all passing.
- [ ] **Step 5: Commit:** `git commit -m "Add theme, formatting, validation and tab helpers"` (stage `native/src` and `native/__tests__`).

---

### Task 4: API client and session

**Files:**
- Create: `native/src/api.js`, `native/src/session.js`, `native/src/useRemote.js`
- Test: `native/__tests__/api.test.js`, `native/__tests__/session.test.jsx`

**Interfaces:**
- Produces:
  - `api.js`:
    - `class ApiError extends Error { status }`;
    - `NETWORK_ERROR` (the exact text from Global Constraints);
    - `API_TIMEOUT_MS = 15000`;
    - `setAuthToken(token | null)`;
    - `onUnauthorized(handler)`, which replaces the single handler;
    - `api(path, { method = 'GET', body } = {}) -> Promise<any>`. `body` is an object, JSON-encoded.
  - `session.js`:
    - `<SessionProvider>`;
    - `useSession() -> { ready, token, username, selectedDate, signIn(token, username), signOut(), selectDate(iso), setUsername(name) }`.
    - `signIn` clears `selectedDate`. `signOut` clears all three keys and calls `setAuthToken(null)`.
    - On mount it loads the stored values, calls `setAuthToken`, then sets `ready = true`.
  - `useRemote.js`: `useRemote(loader, deps) -> { data, error, loading, refreshing, reload(), refresh() }`. `error` is an `ApiError`. `refresh` sets `refreshing` (for pull-to-refresh). Results that arrive after unmount or after the deps change are ignored.

- [ ] **Step 1: Write the failing tests:**
  - `api.test.js`, with mocked global `fetch` and fake timers:
    - the request goes to `process.env.EXPO_PUBLIC_API_URL + path`;
    - `Authorization: Bearer t1` is sent after `setAuthToken('t1')` and not sent after `setAuthToken(null)`;
    - a rejected fetch gives `ApiError(NETWORK_ERROR)` with status 0;
    - a hanging fetch gives the same error after advancing 15000 ms;
    - a 409 `{error: 'That year already exists.'}` gives that message with status 409;
    - a 500 with a non-JSON body gives `'Request failed'`;
    - a 401 calls the `onUnauthorized` handler exactly once and rejects with status 401.
  - `session.test.jsx`:
    - stored values load (`ready` turns true, token restored);
    - `signIn` persists the token in SecureStore and clears `selectedDate`;
    - `signOut` deletes all three keys.
    - **Review Focus 1:** register `onUnauthorized(() => signOut())`, then fire two 401 responses in parallel. `signOut` storage deletes happen and the state ends signed out, without throwing.
- [ ] **Step 2: Run them and confirm they fail.** `npx jest __tests__/api.test.js __tests__/session.test.jsx` fails.
- [ ] **Step 3: Implement.** `api()` uses `AbortController` with a `setTimeout` of `API_TIMEOUT_MS`, cleared in `finally`. Parse JSON in try/catch, falling back to `{}`. Session state lives in React context; the persistence calls are awaited.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Add API client, session store and useRemote hook"`

---

### Task 5: Shared UI components

**Files:**
- Create in `native/src/components/`:
  - `icons.jsx`: `Trash`, `CalendarIcon`, `SignOutIcon`, `PowderIcon`, as react-native-svg, with paths copied from the web;
  - `Wear.jsx`;
  - `ErrorBanner.jsx`;
  - `ConfirmModal.jsx`;
  - `Magnifier.jsx`;
  - `SaveAnimation.jsx`;
  - `SwipePager.jsx`.
- Test: `native/__tests__/components.test.jsx`

**Interfaces:**
- Consumes: `colors`, `fonts` (Task 3); `money`, `fmtDate` (Task 3); `TAB_CYCLE`, `DOT_ORDER`, `TAB_LABELS`, `stepTab` (Task 3).
- Produces:
  - `Wear({ type: 'shirt'|'shorts'|'sock', color, size })`.
  - `ErrorBanner({ message, onRetry? })`, which renders a `Retry` button only when `onRetry` is given.
  - `ConfirmModal({ visible, kind: 'year'|'month'|'tx'|'signout'|'cred', subject, busy, error, onConfirm, onCancel })`:
    - `subject` is `{ label }` for year/month and `{ name, total, time, date }` for tx;
    - the titles, bodies, button text, icons and colors are copied from `MobileApp.renderModal` (including the `tx` kind);
    - the confirm button ignores presses while `busy`.
  - `Magnifier({ tx: { name, time, total, paid } | null, origin: { x, y } | null, onClose })`:
    - status `PAID` / `PARTIALLY PAID` / `UNPAID` with the web's tag colors;
    - grows from `origin` with the web timings (in 480 ms, out 320 ms).
  - `SaveAnimation({ name, visible, onDone })`: total ≈ 2.1 s, matching `runSaveAnim` timings; calls `onDone` once.
  - `SwipePager({ tab, onChange(tab), renderPage(tab) })`:
    - three pages, the circular order from `stepTab`;
    - a pan gesture with a 20% width or 0.5 px/ms threshold;
    - dots in `DOT_ORDER`, where tapping a dot calls `onChange`;
    - the header label slides with the page.

- [ ] **Step 1: Write the failing tests:**
  - The `ConfirmModal` `tx` kind shows `Delete Ana's transaction?` and a body containing `₱120.00` and `1:23 PM`.
  - With `busy`, pressing `Deleting…` does not call `onConfirm`.
  - The `signout` kind shows `Yes, Sign Out`.
  - `ErrorBanner` without `onRetry` has no `Retry`.
  - `Magnifier` with paid 100 / total 1000 shows `PARTIALLY PAID` and `₱900.00`.
  - `SwipePager` with `tab='all'`, pressing the `Paid Customers` dot, calls `onChange('paid')`.
- [ ] **Step 2: Run them and confirm they fail.** `npx jest __tests__/components.test.jsx` fails.
- [ ] **Step 3: Implement** the components, styled from `mobile.css` via `theme.js`. Animations use Reanimated `withTiming`/`withSpring`.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Add shared native components"`

---

### Task 6: App shell, navigation guards, login

**Files:**
- Modify: `native/app/_layout.jsx`, `native/app/index.jsx` (temporary: brand + `Tap to Sign In` button pushing `/login`; the game replaces it in Task 13)
- Create: `native/app/login.jsx`, `native/app/(app)/_layout.jsx`, `native/src/components/TopBar.jsx`, `native/app/(app)/(tabs)/_layout.jsx`, and four placeholder tab screens that render their titles
- Test: `native/__tests__/navigation.test.jsx`

**Interfaces:**
- Consumes: `useSession`, `api`, `onUnauthorized` (Task 4); `ErrorBanner` (Task 5); `colors`, `fonts` (Task 3).
- Produces:
  - Routes: `/`, `/login`, `/setup`, `/year/[year]`, `/month/[id]`, `/dashboard`, `/add`, `/daily`, `/settings`.
  - The root layout:
    - loads fonts and keeps the splash screen up until fonts are loaded and session `ready`;
    - wraps everything in `GestureHandlerRootView`, `SafeAreaProvider` and `SessionProvider`;
    - registers `onUnauthorized(() => { signOut(); router.replace('/') })`;
    - sets the status bar color per Global Constraints.
  - `(app)/_layout` redirects to `/` without a token. `/` and `/login` redirect to `/dashboard` (date set) or `/setup` (no date) when a token exists.
  - `(tabs)/_layout` redirects to `/setup` when `selectedDate` is empty. The tab bar uses navy background, `#2456a0` active, labels `Dashboard`, `Add Customer`, `Daily`, `Settings`, and icons `▦ ♙ ◷ ⚙`.
  - `TopBar({ canBack, onBack, dateChip })`.

- [ ] **Step 1: Write the failing tests** with `renderRouter` from `expo-router/testing-library`, mocking `api`:
  - A login with mocked 401 `{error:'Invalid username or password.'}` shows that text.
  - A successful login (`{token:'t', username:'admin'}`) with no selected date ends on `/setup`.
  - A signed-in session with an empty `selectedDate` that opens `/dashboard` is redirected to `/setup`.
  - A signed-in session with `selectedDate='2026-01-01'` that opens `/` ends on `/dashboard`.
- [ ] **Step 2: Run them and confirm they fail.** `npx jest __tests__/navigation.test.jsx` fails.
- [ ] **Step 3: Implement.** The login form's text and behavior match `MobileApp.renderLogin`. The keyboard `returnKeyType="go"` submits. The button reads `Signing in…` while pending.
- [ ] **Step 4: Run the tests and confirm they pass.** Also run `npx jest` (all green).
- [ ] **Step 5: Commit:** `git commit -m "Add native app shell, guards and login"`

---

### Task 7: Records flow (setup, year, month)

**Files:**
- Create: `native/app/(app)/setup.jsx`, `native/app/(app)/year/[year].jsx`, `native/app/(app)/month/[id].jsx`
- Test: `native/__tests__/records.test.jsx`

**Interfaces:**
- Consumes: `api`, `useRemote` (Task 4); `useSession().selectDate`; `ConfirmModal`, `ErrorBanner`, `Trash` (Task 5); `buildCalendar`, `shortMoney`, `todayISO`, `MONTHS`, `money` (Task 3); `validateYear`, `validateMonth` (Task 3); `TopBar` (Task 6).
- Endpoints:
  - `GET /years` returns `{years:[{year}]}`; `POST /years {year}`; `DELETE /years/:y`;
  - `GET /years/:y/months` returns `{months:[{id, month_number, total_earnings, transaction_count}]}`; `POST /years/:y/months {month}`; `DELETE /months/:id`;
  - `GET /months/:id/calendar` returns `{year, month, days:{ "1": {total_paid, count} }}`.
- Behavior:
  - follows spec §4;
  - the back arrow goes year → setup and month → `/year/<year>`;
  - pull-to-refresh on all three screens;
  - deleting the year of the selected date clears `selectedDate`;
  - the month trash button is hidden when a date is selected.

- [ ] **Step 1: Write the failing tests:**
  - Setup lists the mocked years newest first.
  - Adding `1999` shows `Year must be between 2000 and 2100.` without calling the API.
  - A 409 from `POST /years` shows `That year already exists.`
  - On the month screen, tapping day `5` calls `selectDate('2026-01-05')` and navigates to `/dashboard`.
  - The year screen hides the month trash buttons when `selectedDate` is set.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement** the screens. Copy texts from `renderSetup`, `renderYear` and `renderMonth`. Use the 7-column grid from `buildCalendar`, with today highlighted (`#eaf2ff` background, `#1762c5` day number).
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Add setup, year and month screens"`

---

### Task 8: Dashboard (stats, swipe lists, record payment)

**Files:**
- Create: `native/src/useDay.js`
- Modify: `native/app/(app)/(tabs)/dashboard.jsx`
- Test: `native/__tests__/dashboard.test.jsx`

**Interfaces:**
- Consumes: `SwipePager`, `Magnifier`, `ErrorBanner` (Task 5); `paymentState`, `money`, `TAB_LABELS` (Task 3); `api`, `useRemote` (Task 4).
- Produces: `useDay(date) -> { rows, loading, error, refreshing, refresh(), reload(), patchRow(id, changes), removeRow(id) }`.
  - `rows` are `{ id, name, total, paid, out, time }`, sorted by time ascending. Map `GET /transactions/date/:d` and reverse the API's DESC order, as on web.
  - `patchRow` and `removeRow` update the rows locally, then call `reload()`.
  - Tasks 9 and 10 reuse this hook.
- Payment: `PATCH /transactions/:id {status:'PARTIALLY PAID', amount_paid: paid + amount}`. The in-flight row ignores further presses.

- [ ] **Step 1: Write the failing tests** with rows Ana (total 1000, paid 100) and Ben (total 200, paid 200):
  - Stats show `2`, `₱1,200.00`, `₱300.00`, `₱900.00`.
  - Tapping the `Total unpaid` card switches to `Unpaid Customers`.
  - In the Unpaid list, typing `950` for Ana shows `Payment amount cannot exceed remaining balance of ₱900.00.` and disables Record payment.
  - Typing `50` and pressing Record payment twice quickly calls `PATCH` exactly once, with `amount_paid: 150` (Review Focus 3).
  - Typing `abc` keeps `Remaining ₱900.00` and the button disabled (Review Focus 2).
  - With an empty day (Review Focus 4), each list shows `No customers in this view right now.`
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement** the dashboard. Tapping a stat card selects its tab and scrolls the list into view (`ScrollView` ref + `measureLayout`). Pull-to-refresh uses `refresh()`.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Add native dashboard with swipe lists and payments"`

---

### Task 9: Add Customer with save animation

**Files:**
- Modify: `native/app/(app)/(tabs)/add.jsx`
- Test: `native/__tests__/add.test.jsx`

**Interfaces:**
- Consumes: `validateTransaction` (Task 3); `api` (Task 4); `SaveAnimation` (Task 5); `useSession().selectedDate`.
- Endpoint: `POST /transactions {customer_name, total_amount, amount_paid, transaction_date}`.
- Behavior:
  - the success text is `Transaction saved to the selected date.`, shown after `SaveAnimation.onDone`;
  - the form resets on success;
  - an API error shows inline in the error colors.

- [ ] **Step 1: Write the failing tests:**
  - With an empty name, pressing `✓ Add Customer` shows `Customer name is required.` and makes no API call.
  - A total of `250` with paid `300` shows `Amount paid cannot exceed the total amount.`
  - A valid submit sends `total_amount: 250.5` when the total is typed as `250,5` (Review Focus 2).
  - Pressing twice quickly posts once (Review Focus 3).
  - After `onDone`, the success text is shown.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.** Use numeric keyboards (`decimal-pad`) and the read-only date field. Disable the button while the request is pending.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Add native Add Customer screen"`

---

### Task 10: Daily list with delete and magnifier

**Files:**
- Modify: `native/app/(app)/(tabs)/daily.jsx`
- Test: `native/__tests__/daily.test.jsx`

**Interfaces:**
- Consumes: `useDay` (Task 8); `ConfirmModal`, `Magnifier`, `Trash` (Task 5); `money`, `fmtDate` (Task 3).
- Endpoint: `DELETE /transactions/:id`.
- Behavior:
  - the summary card and table match `renderDaily`;
  - amounts show without `.00`;
  - the bold balance appears when > 0;
  - the trash opens `ConfirmModal kind="tx"` with subject `{ name, total, time, date: fmtDate(selectedDate, 'long') }`;
  - on confirm, `removeRow(id)` runs;
  - an API error stays in the modal.

- [ ] **Step 1: Write the failing tests:**
  - The rows render in time order.
  - Trash on `Accidental Entry` then `Delete` calls `DELETE /transactions/7` once, even when pressed twice (Review Focus 3), and the row disappears.
  - A 404 response keeps the modal open with `Transaction not found.`
  - An empty day shows `No transactions recorded.` (Review Focus 4).
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.** Use `FlatList` with pull-to-refresh. Measure the row position for the `Magnifier` origin.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Add native Daily screen with delete and magnifier"`

---

### Task 11: Settings and change-records button

**Files:**
- Create: `native/src/components/ChangeRecordsButton.jsx`
- Modify: `native/app/(app)/(tabs)/settings.jsx`
- Test: `native/__tests__/settings.test.jsx`

**Interfaces:**
- Consumes: `validateCredentials` (Task 3); `api`, `useSession`, `useRemote` (Task 4); `ConfirmModal` (Task 5).
- Produces: `ChangeRecordsButton({ selectedDate, months, onYear, onMonth, onDate, onSignOut })`.
  - `months` is the result of `GET /years/:y/months` for the selected year.
  - Subtitles:
    - Change year: `Current: <yr>`, or `Pick a transaction year`;
    - Change month: `Months in <yr>`, or `Pick a year first`;
    - Change date: `<Month> <yr> calendar`, or `Pick a month first`.
  - Dragging: a pan with a 6 px slop. It snaps to the left (`-6`) or right (`width - 52`) edge. `top` is clamped between `60` and `height - 140`. A tap toggles the panel. The badge reads `4`.
- Endpoints: `GET /account` returns `{account:{username}}`; `PUT /account {new_username, current_password, new_password, confirm_password}`.
- Actions:
  - Change year: `selectDate('')`, then `/setup`.
  - Change month: `/year/<yr>`.
  - Change date: `/month/<id>`, or the year/setup fallback.
  - Sign out: confirm modal `signout`, then `signOut()` and `/`.
  - Credential update: confirm modal `cred`, then `PUT`, then `signOut()` and `/`. An API error closes the modal and shows `setErr` as on web.

- [ ] **Step 1: Write the failing tests:**
  - New password `a` with confirm `b` (and a current password) shows `New passwords do not match.`
  - A valid change, then `Yes, Save Changes`, calls `PUT /account` once, then sign-out.
  - A 400 `Current password is incorrect.` shows the alert.
  - With `months=[]` and `selectedDate='2026-03-02'`, the change-date subtitle is `Pick a month first` and pressing it goes to `/year/2026` (Review Focus 4).
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.** Use the Gesture Handler `Gesture.Pan()` and `Gesture.Tap()` combined with `Gesture.Exclusive`. Animate with a Reanimated spring. The panel `transformOrigin` is on the button's side.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Add native Settings and change-records button"`

---

### Task 12: Washer game rules and effect math (pure)

**Files:**
- Create: `native/src/game/useWasherGame.js`, `native/src/game/effects.js`
- Test: `native/__tests__/washer.test.js`, `native/__tests__/effects.test.js`

**Interfaces:**
- Produces:
  - `useWasherGame.js`:
    - `HITS_TO_BREAK = 6`, `DRUM_MAX = 10`;
    - `WEARS`, the 6 `[type, color, label]` entries from the web, in order;
    - `initialWasherState`;
    - `washerReducer(state, action)`;
    - `stage(state)`, `displayText(state)`, `hintText(state)`, `isWashing(state)`;
    - `useWasherGame() -> [state, dispatch]`.
    - Action types:
      - `toss {wear, placement:{angle, radius, rotation}}`: adds to the drum (capped, oldest dropped) and increments `tossed`, `hits`; at `HITS_TO_BREAK` it sets `exploding`;
      - `soap`;
      - `nextWear`, `prevWear`;
      - `finishExplosion` (sets `exploding:false, broken:true`);
      - `startEnter`;
      - `rebuild` (resets `hits, drum, soap, tossed, broken, exploding`).
    - `toss` and `soap` are no-ops while `exploding || broken || entering`.
  - `effects.js`:
    - `MAX_EFFECTS = 150`;
    - `addEffects(list, newEffects, max = MAX_EFFECTS) -> list` (drops the oldest);
    - factories that take an injectable `rand = Math.random` and return descriptors `{ id, kind, ...params, duration, delay }`: `fly(from, to, rand)`, `sparks(n, origin, rand)`, `parts(k, machineRect, floorY, rand)`, `bubble(origin, rand)`, `smoke(origin, opts, rand)`, `panels(machineRect, rand)` (12 pieces), `explosionLabels(machineRect)`, `rebuildDots(machineRect, bounds, rand)` (46 dots), `suckBubbles(center, rand)` (34);
    - `frameAt(effect, t) -> { x, y, rotate, scale, opacity }` for `t` in [0,1]. Port the curve math from `MobileApp.fly`, `traj`, `dropParts`, `smoke`, `bubble`, `suckIn`.

- [ ] **Step 1: Write the failing tests:**
  - `stage` is 0, 0, 1, 2, 2, 3 after 0, 1, 2, 3, 4, 5 tosses. The 6th toss sets `exploding`, and `stage` is 4.
  - The 11th toss keeps `drum.length === 10` and the first item is the original 2nd.
  - `toss` while `exploding` leaves the state unchanged.
  - The `displayText` sequence: `0 ITEMS`, then after `soap` `0 ITEMS + SOAP`, then after one toss `WASHING` (soap + non-empty drum). On a fresh state with no soap, one toss gives `1 ITEM`. `ERR · E07` at stage 2, `ERR · HOT` at stage 3.
  - The `hintText` initial value is `Swipe to pick a piece, tap to toss it in.`; when broken it is `No more laundry today — tap to sign in.`
  - `rebuild` resets.
  - `addEffects` with 149 + 5 keeps 150 and drops the 4 oldest.
  - `frameAt(fly(...), 0)` equals the start position; at `t=1` it equals the end, with opacity 0.
  - `panels(...)` returns 12 entries.
  - With seeded `rand`, the factories are deterministic.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run the tests and confirm they pass.**
- [ ] **Step 5: Commit:** `git commit -m "Add washer game rules and effect math"`

---

### Task 13: Landing game screen

**Files:**
- Create: `native/src/game/Machine.jsx`, `WearPicker.jsx`, `PowderButton.jsx`, `ParticleLayer.jsx`
- Modify: `native/app/index.jsx` (replace the placeholder)
- Test: `native/__tests__/landing.test.jsx`

**Interfaces:**
- Consumes: everything from Task 12; `Wear`, `PowderIcon` (Task 5); router.
- Produces:
  - `Machine({ state, hidden, spinRate, onDoorLayout(rect), shakeSignal })`:
    - the drum rotation loops every 2800 ms ÷ `spinRate`;
    - `spinRate` is 1, 1.8 while washing, 4 for 900 ms after a toss, 9 during suck-in.
  - `WearPicker({ index, onToss(rect), onPrev, onNext })`.
  - `PowderButton({ soap, onPress(rect) })`.
  - `ParticleLayer({ effects, onDone(id) })`: each effect runs a shared value 0→1 over `duration` after `delay`, maps it through `frameAt`, and calls `onDone` at the end.
- Screen:
  - all timers and intervals are stored in refs and cleared on unmount;
  - the washing bubble tick runs every 170 ms;
  - stage-3 smoke runs every 260 ms;
  - the explosion runs the 650 ms jitter, then the effects, then `finishExplosion` after 1350 ms;
  - Tap to Sign In runs `rebuild` (if broken), then the suck-in (1300 ms, then the 700 ms zoom), then `router.replace('/login')`;
  - with `AccessibilityInfo.isReduceMotionEnabled()` true, effects are skipped and Tap to Sign In goes straight to `/login`.

- [ ] **Step 1: Write the failing tests**, with fake timers and seeded `Math.random`:
  - The initial hint is shown.
  - Pressing the powder button and then running the timers shows `MORE SOAP`.
  - Six tosses (via the picker's accessibility action `activate`) followed by the timers show `No more laundry today — tap to sign in.`
  - With reduced motion on, `Tap to Sign In` replaces the route with `/login` immediately.
  - Review Focus 5: start the explosion, unmount the screen, and run all timers. No errors, and no "state update on an unmounted component" warnings (spy on `console.error`).
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement** the four components and the screen. The layout matches `renderLanding`: brand, kicker, headline `Toss it in.` + yellow italic `We'll keep count.`, the machine, the hint, then a powder tile and a wear tile in a 96 px + flexible grid, then the yellow `Tap to Sign In` button.
- [ ] **Step 4: Run the tests and confirm they pass.** Also run `npx jest` (all green).
- [ ] **Step 5: Commit:** `git commit -m "Add native landing washer game"`

---

### Task 14: Development build, device checklist, docs

**Files:**
- Modify: `native/eas.json` (the real `EXPO_PUBLIC_API_URL` from the owner), root `README.md` (a "Native Android app" section: owner setup, `npx eas build -p android --profile development`, installing the APK, `npx expo start --dev-client --tunnel`, the `preview` APK)
- Create: `native/DEVICE-CHECKLIST.md` (the on-device checklist from spec §8, verbatim, as checkboxes)

- [ ] **Step 1: Confirm the backend.** The owner setup steps are done, and `curl <EXPO_PUBLIC_API_URL>/health` returns `"database":"ok"`.
- [ ] **Step 2: Run the full test suites:**
  - `cd native && npx jest` (all green);
  - `cd backend && .venv/bin/python -m pytest` (all green);
  - `npx expo export --platform android --output-dir /tmp/bb-export` exits 0 (then delete the folder).
- [ ] **Step 3: Build.** Run `cd native && npx eas build -p android --profile development`. The owner must be logged in. Expected: build finished, with an install URL / QR code.
- [ ] **Step 4: Install and run.** The owner installs the APK. Then run `npx expo start --dev-client --tunnel`; the app opens and loads.
- [ ] **Step 5: Walk through the device checklist** with the owner. Any failure becomes a fix task. If the particle layer drops frames, switch only `ParticleLayer` to `@shopify/react-native-skia` and rebuild (spec §9).
- [ ] **Step 6: Commit:** `git commit -m "Document native app builds and device checklist"`, then push the branch.
