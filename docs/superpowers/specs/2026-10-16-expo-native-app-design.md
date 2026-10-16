# Bubblebee Laundry — Expo native Android app

Date: 2026-10-16
Status: Draft for review
Branch: `feat/android-v3`

## 1. Goal

Ship a native Android app for Bubblebee Laundry Shop, built with Expo / React Native and installed on the owner's phone as an EAS development build. It is a native port of the existing v3 mobile web UI (`src/mobile/`) with full feature and visual parity, including the landing washing-machine game, and it uses the existing Flask API, hosted on Vercel with data in Aiven MySQL.

### Success criteria

1. The development-build APK, built with EAS, installs on the owner's Android phone.
2. The owner signs in with the same account as the web app and sees the same data.
3. Everything the v3 mobile web app does works in the native app against the hosted API:
   - login;
   - the year, month and calendar flow, including adding and deleting years and months;
   - the dashboard stats and the swipeable Paid / All / Unpaid lists;
   - recording payments;
   - adding customers, with the save animation;
   - the Daily list, with delete-transaction and the magnifier;
   - settings: the username/password change and the change-records button;
   - the landing game, including the explosion and the suck-in transition.
4. The automated tests in §8 pass.
5. The on-device checklist in §8 passes on the owner's phone.

### Decisions already made

| Topic | Decision |
|---|---|
| Approach | Real React Native rewrite (not a WebView wrapper). Skia only if the particle layer stutters on device. |
| Backend | Hosted: Flask on Vercel (`api/index.py`, already on the branch) + new database `bubblebee_laundry` inside the owner's existing Aiven MySQL service (the free plan allows one service per organization). |
| Scope of v1 | Full parity with v3 mobile web, including the landing game and all effects. |
| Builds | EAS Build in the cloud. Development builds for day-to-day work. |
| Location | `native/` folder in this repo. |
| Language | JavaScript, matching the rest of the repo. |

### Assumptions (owner may correct)

- The web app (desktop and mobile web) stays unchanged and keeps working.
- During development the phone loads the JS bundle from the PC with `npx expo start --dev-client --tunnel`, so no Windows admin or port-forward setup is needed.
- App name **Bubblebee Laundry**, Android package `com.kenitoz.bubblebee`, icon and splash from `public/bubblebee-logo.jpg` on `#123d86`.
- The phone's local date is the shop's date (the phone is set to Philippine time).

### Out of scope for v1

- Offline use, local caching of data, push notifications.
- iOS builds (Expo makes them possible later; not configured or tested now).
- Publishing to Google Play (a `production` profile is prepared but not used).
- Any change to the web UI.

## 2. Architecture

```
Android phone (Expo dev build)
  └─ native/  (Expo Router screens + components)
        └─ src/api.js ──HTTPS──▶ Vercel  /api/*  ──▶ api/index.py ──▶ backend/app.py (Flask)
                                                                         └─▶ Aiven MySQL (db: bubblebee_laundry)
```

- The native app uses the same REST endpoints as `src/mobile/MobileApp.jsx`. The app adds no new endpoints.
- The only backend change is that `/api/health` reports database connectivity (§6).

## 3. Project structure

```
native/
  app/                          Expo Router (file = screen)
    _layout.jsx                 root: font loading, GestureHandlerRootView, SafeAreaProvider, SessionProvider, StatusBar
    index.jsx                   landing game (initial route when signed out)
    login.jsx
    (app)/_layout.jsx           auth guard (redirect to / when no token); blue top bar: back arrow on year/month, logo, date chip
    (app)/setup.jsx             years list + add year
    (app)/year/[year].jsx       months of a year + add month
    (app)/month/[id].jsx        calendar
    (app)/(tabs)/_layout.jsx    bottom tab bar: Dashboard · Add Customer · Daily · Settings
    (app)/(tabs)/dashboard.jsx
    (app)/(tabs)/add.jsx
    (app)/(tabs)/daily.jsx
    (app)/(tabs)/settings.jsx
  src/
    api.js                      fetch wrapper (§6)
    session.js                  SessionProvider + useSession(): token, username, selectedDate
    theme.js                    colors, fonts, radii, shadows copied from src/mobile/mobile.css
    format.js                   money(), shortMoney(), fmtDate(), todayISO(), calendar grid builder
    validation.js               add-customer, payment, year, settings validation (same messages as web)
    components/
      Wear.jsx                  shirt / shorts / sock SVG
      Trash.jsx, icons.jsx
      ConfirmModal.jsx          delete year / month / transaction, sign out, credential update
      Magnifier.jsx             transaction details lens, grows from the tapped row
      SaveAnimation.jsx         mini washer overlay after adding a customer
      ChangeRecordsButton.jsx   draggable bubble + panel (Settings only)
      SwipePager.jsx            3-page horizontal pager with dots (dashboard lists)
      ErrorBanner.jsx           message + Retry
    game/
      useWasherGame.js          pure game state and rules (§5)
      Machine.jsx               washer drawing: display, knob, bolts, door, water, foam, cracks, spinning drum
      WearPicker.jsx            clothes carousel (tap = toss, swipe = change)
      PowderButton.jsx
      ParticleLayer.jsx         renders all short-lived effects (§5)
      effects.js                factories for effect descriptors: fly, spark, bubble, smoke, screw, panel, label
  assets/                       icon, adaptive icon, splash
  app.json                      name, slug, android.package, icon, splash, plugins
  eas.json                      build profiles (§7)
  .env.example                  EXPO_PUBLIC_API_URL=
  __tests__/ or *.test.js       Jest tests (§8)
```

The root `vercel.json` already excludes paths outside the API function, and `native/` is not part of the Vite build.

## 4. Screens and behavior

Navigation rules (identical to the web version):

- Signed out: `index` (landing game), then **Tap to Sign In**, then `login`.
- Signed in with no selected date: `setup`, then `year/[year]`, then `month/[id]`. Tapping a day stores the selected date and opens `(tabs)/dashboard`.
- The bottom tabs are visible only when a date is selected, and never on the year or month screens.
- The token, username and selected date persist across app restarts. Reopening the app goes straight to the tabs when a date is selected.
- Android's hardware back button follows the router stack. On the year screen it goes to setup; on month it goes to that month's year.

| Screen | Behavior |
|---|---|
| Login | Username + password (hidden by default, Show/Hide toggle). The keyboard "Go" key submits. Errors come from the API in a red banner. Login clears any previously selected date, as the web does. |
| Setup | Add year (2000–2100, validated). Year cards newest first. The trash button on each card opens a delete confirmation. Empty state: "No transaction years yet. Add your first year above." |
| Year | Add month (picker of 12 months). Month cards show total earnings and transaction count, sorted by month. The month trash button only shows when no date is selected. |
| Month | 7-column calendar with Sunday first. Today is highlighted. Each day shows paid total (`₱1.2k` style) and `N tx` / `No tx`. Tapping a day selects it. |
| Dashboard | Four stat cards (transactions, total amount, total paid, total unpaid). Tapping a card jumps to its list and scrolls to it. Below: a circular `SwipePager`, as on web. It opens on All; swiping left goes All → Unpaid → Paid → All, and swiping right goes the other way. The dots are shown in the order Paid · All · Unpaid, and tapping a dot jumps to that list. Paid and All are tables (tap a row for the magnifier). Unpaid rows have an amount input (numeric keyboard), a live "Remaining", and **Record payment**, disabled when the amount is 0 or invalid. The overpayment error appears under the input. |
| Add Customer | Name, total (≥ 0.01), paid (≥ 0, ≤ total), and the selected date shown read-only. On success: `SaveAnimation`, then "Transaction saved to the selected date." Validation messages match web. |
| Daily | Summary card (daily earnings, transactions, total amount). The table is sorted by time ascending. Tapping a row opens the magnifier. The trash per row opens "Delete [name]'s transaction?" with amount, time and date. |
| Settings | Current username (read-only), new username, current / new / confirm password with Show toggles. Validation is the same as web. The confirm dialog leads to `PUT /account`, then sign out. The `ChangeRecordsButton` offers change year / month / date and sign out. |

Shared interaction details:

- **Pull-to-refresh** on setup, year, month, dashboard and daily.
- The **status bar** is `#123d86` when signed out and `#09275e` when signed in, with light content.
- After add, pay or delete, the screen updates immediately. The app then reloads that day's transactions and that year's months so totals match the server.
- While loading, a spinner replaces the content. Empty-state texts match the web version.

## 5. Landing game

### State and rules: `useWasherGame`

A pure reducer with no rendering, so it can be unit tested.

- State: `drum` (list of `{type, color, angle, radius, rotation}`, max 10, oldest dropped), `tossed`, `soap`, `hits`, `broken`, `exploding`, `entering`, `wearIndex`.
- `HITS_TO_BREAK = 6`. `stage = broken || exploding ? 4 : min(3, floor(hits / 6 * 4))`.
- Display text, in priority order:
  1. `ERR · HOT` at stage 3;
  2. `ERR · E07` at stage 2;
  3. `WASHING` when soap is in and the drum is not empty;
  4. otherwise `N ITEM(S)`, followed by ` + SOAP` if soap is in.
- The hint text table is copied verbatim from `MobileApp.renderLanding`.
- `washing = soap && drum.length > 0 && !broken && !exploding && !entering`.
- Actions:
  - `toss(wear)`: adds to the drum, increments `tossed`, then calls `hit()`.
  - `hit()`: increments `hits`; at hit 6 it sets `exploding`.
  - `addSoap`, `nextWear`, `prevWear`.
  - `finishExplosion`: sets `broken`.
  - `startEnter` / `finishEnter`.
  - `rebuild`: resets hits, drum, soap and tossed.
- Tosses and soap are ignored while `exploding`, `broken` or `entering`.

### Drawing

- **`Machine`** is drawn from Views and SVG:
  - a display, knob and bolts that turn dashed from stage 1;
  - the door, which tilts at stage 3;
  - glass with water, foam (when soap is in), crack 1 (stage ≥ 1) and crack 2 (stage ≥ 2);
  - the drum, a Reanimated rotation that loops every 2.8 s. Its speed is ×1.8 while washing, ×4 for 0.9 s after each toss, and ×9 during suck-in.
- The machine shakes on each hit, harder at higher stages. The wrapper tilts -1° at stage 2 and -3° at stage 3.
- **`WearPicker`**: 6 clothes (yellow T-shirt, blue shorts, coral socks, green T-shirt, purple shorts, white socks), a horizontal pan gesture with a 20% distance or 0.5 px/ms velocity threshold, tap to toss, and dots.
- **`PowderButton`**: the label reads `POWDER`, or `MORE SOAP` once soap is in.

### Effects: `ParticleLayer` + `effects.js`

The web version animates DOM nodes it creates and removes. Here, each effect is a **descriptor** stored in a list: `{id, kind, from, path params, duration, delay, style}`. `ParticleLayer` renders one `Animated.View` (or SVG) per descriptor. The view is driven by a Reanimated shared value from 0 to 1, and its position, rotation, scale and opacity are computed from the same formulas as the web code. When the animation finishes, the descriptor is removed. Limits: at most 150 live effects; when full, the oldest are dropped.

| Effect | Used by | Path |
|---|---|---|
| fly | toss, powder | quadratic Bézier from the source to the door center, spinning 280–580°, shrinking near the end, 760 ms |
| spark | each hit, explosion | ballistic arc, yellow/white glow, 480–740 ms |
| screw / plate | hit at stage ≥ 1 | falls to the floor, one bounce, fades, 1.5–1.8 s |
| bubble | washing tick (every 170 ms), suck-in | rises and drifts, fades, 1.4–2.4 s |
| smoke | stage 3 (every 260 ms), explosion | rises, grows, fades |
| panel | explosion | 3×4 jagged machine pieces thrown outward with gravity and spin |
| label | explosion | "ERR" display and knob flung off; "KABOOM!" pops and fades |
| ring / dot | rebuild | glowing dots converge on the machine, then a yellow ring pulse |

Sequences:

- **Explosion:** a 650 ms escalating jitter, then a flash. The machine is hidden and replaced by panels, flung clothes, smoke, 26 sparks and "KABOOM!". After 1.35 s, `finishExplosion`.
- **Tap to Sign In:**
  1. If the machine is broken, `rebuild` runs first: 46 converging dots, then the machine pops back.
  2. Suck-in: 34 spiralling bubbles. Every landing element except the machine shrinks, spins into the door center and fades. The screen shakes. After 1.3 s the machine zooms ×9 into the door and the screen fades.
  3. The router replaces the screen with `login`, which fades in from a blur-like scale.
- **Reduced motion:** if the system "remove animations" setting is on, effects are skipped, and Tap to Sign In goes straight to login.
- **Accessibility:** the powder button, wear picker and sign-in button have labels. The wear picker supports the screen reader's increment/decrement actions. The game never blocks reaching login.

## 6. API client, errors and the backend change

`src/api.js`:

- Base URL: `process.env.EXPO_PUBLIC_API_URL`, for example `https://<app>.vercel.app/api`. It is set per EAS profile, and in `native/.env` for local development.
- Sends `Authorization: Bearer <token>` when signed in, plus `Content-Type: application/json`.
- 15 s timeout via `AbortController`.
- Errors:

| Situation | Result |
|---|---|
| Network failure or timeout | `Error("Can't reach the server. Check your connection.")` with `status: 0`. Screens show `ErrorBanner` with **Retry**. |
| HTTP 401 | Clear the session and redirect to the landing screen, as on web. |
| Other non-2xx | `Error(data.error || 'Request failed')` with `status`. It is shown inline where the action happened (form banner, modal error, under the payment input). |

`src/session.js`: the token goes in `expo-secure-store`. The username and selected date go in `@react-native-async-storage/async-storage`. `signOut()` clears all three.

Backend change, the only one: `GET /api/health` also opens a database connection and runs `SELECT 1`. It returns `{ok, engine, database: "ok" | "<error message>"}`, with HTTP 503 when the database is unreachable. It needs no authentication and exposes no credentials.

## 7. Builds and development workflow

`native/eas.json`:

| Profile | Purpose | Output |
|---|---|---|
| `development` | `developmentClient: true`, internal distribution | APK, installed once; JS loads from `expo start --dev-client --tunnel` |
| `preview` | standalone, internal distribution | APK that runs without the PC |
| `production` | prepared for a possible Google Play release; not used in v1 | AAB |

Each profile sets `EXPO_PUBLIC_API_URL`.

Owner steps that can't be automated:

1. Create or log in to an Expo account: `npx eas login`.
2. Aiven: use the existing MySQL service, with `DB_NAME=bubblebee_laundry`. Run `python app.py` once locally with the Aiven credentials to create the tables and the admin account.
3. Vercel: import the repo and set the environment variables (`DB_*`, `JWT_SECRET`, optional `APP_UTC_OFFSET`). The production site deploys from `main`; development can point the app at the branch's preview URL.
4. Install the development APK from the EAS build link on the phone, allowing installs from that source.

Order of work: hosted API live and `/api/health` reporting the database OK; then the `native/` scaffold, EAS config and first dev build; then shell and session; then screens; then the landing game; then polish and the device checklist.

## 8. Testing

Automated tests use Jest with the `jest-expo` preset, in `native/`:

- `useWasherGame`:
  - stage thresholds;
  - explosion exactly at hit 6;
  - drum capped at 10, oldest dropped;
  - actions ignored while exploding, broken or entering;
  - display and hint texts at each state;
  - rebuild resets.
- `format.js`:
  - `money()` in PHP format;
  - `shortMoney()` (`₱950`, `₱1.2k`, `₱2k`);
  - the calendar grid (leading blanks, padding to a multiple of 7, correct days for February in a leap year).
- `validation.js`: every add-customer, payment, year and settings message, matching the web text.
- `api.js` with a mocked `fetch`:
  - the token header;
  - a timeout gives `status: 0`;
  - a 401 triggers sign-out;
  - error message passthrough.

Screen tests use React Native Testing Library:

- a login error is shown;
- add-customer validation blocks submission;
- the delete-transaction confirmation calls the API and removes the row;
- the tabs are hidden until a date is selected.

Backend tests use the Flask test client:

- `/api/health` returns 200 with `database: "ok"` against SQLite;
- it returns 503 when the database connection fails (simulated).

The on-device checklist on the owner's Android phone covers:

- install and launch of the dev build;
- login against the hosted API;
- the full year → month → day flow;
- swipe lists and dot taps;
- record payment;
- add customer with the save animation;
- delete a transaction;
- the magnifier;
- dragging and snapping the change-records button;
- the Android back button on every screen;
- the keyboard not covering inputs;
- the landing game end to end (toss, soap, stages 1–3 smoke, explosion, rebuild, suck-in) at a steady frame rate;
- reduced-motion mode;
- airplane mode shows the Retry banner;
- reopening the app restores the session.

## 9. Risks

| Risk | Mitigation |
|---|---|
| The particle layer drops frames on a low-end phone | 150-effect cap; animation work stays on the UI thread through Reanimated; fall back to Skia for `ParticleLayer` only. |
| Vercel cold start plus Aiven latency makes the first request slow | 15 s timeout, spinner, Retry; the health check confirms the setup. |
| `--tunnel` is slow or blocked on the owner's network | Fall back to LAN using the existing `phone:setup` port forward for port 8081. |
| The shared Aiven free service runs out of storage or connections | This app's data is small; each request opens and closes its connection; monitor in the Aiven console. |
