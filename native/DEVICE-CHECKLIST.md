# On-device checklist (Android)

Run this on the owner's phone with the development build (`npx expo start --dev-client --tunnel`) against the hosted API. Tick each item; anything that fails becomes a fix task.

- [ ] The development build installs and launches.
- [ ] Login works against the hosted API (wrong password shows "Invalid username or password.").
- [ ] Full year → month → day flow: add a year, add a month, open the calendar, pick a day.
- [ ] Dashboard lists swipe left/right (All → Unpaid → Paid) and the dots jump between lists.
- [ ] Record payment updates Remaining and the stat cards.
- [ ] Add Customer plays the save animation, then shows "Transaction saved to the selected date."
- [ ] Delete a transaction from Daily (confirm dialog, row disappears, totals update).
- [ ] Tapping a row opens the magnifier; tapping outside closes it.
- [ ] The change-records bubble on Settings drags, snaps to the left/right edge and opens its panel.
- [ ] The Android back button behaves sensibly on every screen.
- [ ] The keyboard never covers the field being typed in.
- [ ] Landing game end to end: toss clothes, add powder (bubbles), stages 1–3 (cracks, smoke), explosion, rebuild, suck-in to login, at a steady frame rate.
- [ ] With Settings → Accessibility → Remove animations on, Tap to Sign In goes straight to login.
- [ ] In airplane mode, screens show "Can't reach the server. Check your connection." with Retry.
- [ ] Closing and reopening the app restores the session and the picked date.
