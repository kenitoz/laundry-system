# Bubblebee Laundry Shop

Functional React/Vite frontend, Flask REST API, and MySQL database.

1. Copy `backend/.env.example` to `backend/.env` and set `DB_PASSWORD` to your MySQL root password if you want MySQL. If MySQL is locked or not configured, the API automatically uses a local SQLite file (`backend/laundry.db`) so you can still sign in.
2. Start backend: `cd backend`, `py -m venv .venv`, `.\.venv\Scripts\Activate.ps1`, `pip install -r requirements.txt`, `python app.py`.
   The API creates tables and the **admin** / **admin123** account on startup.
3. Start the app: `npm install`, then `npm run dev`. On Linux/WSL this starts the Flask API (via `backend/.venv/bin/python`) and Vite together; Ctrl+C stops both. On Windows, start the API manually as in step 2 and run `npx vite` in a second terminal.
4. Open `http://127.0.0.1:5173` and sign in with **admin** / **admin123**.

**Open it on an Android phone (WSL on Windows 10):** the phone must be on the same Wi-Fi/LAN as the PC.

1. Run `npm run phone:setup` and click **Yes** on the Windows admin prompt. It forwards port 5180 into WSL, opens it in Windows Firewall for your local network only, and prints the phone URL (e.g. `http://192.168.x.x:5180`). Re-run it after restarting Windows or WSL, because the WSL IP changes.
2. Stop any running `npm run dev`, then run `npm run dev:phone`.
3. Open the printed URL in Chrome on the phone. Undo the setup with `npm run phone:setup -- -Remove`.

Only do this on a network you trust: anyone on it can reach the dev server while it runs.

Optional: run `backend/schema.sql` in MySQL Workbench instead of relying on startup. React calls `/api` through the Vite proxy (set `VITE_API_URL` in a root `.env` to override).

Data structure: `years` → `months` → `transactions`; transaction dates/times and `DECIMAL(12,2)` money fields are the source of dashboard, calendar, and daily totals. `users` stores the hashed admin password.
