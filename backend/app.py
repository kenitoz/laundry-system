import logging
import os
import re
import sqlite3
from datetime import date, datetime
from decimal import Decimal
from functools import wraps

import jwt
import mysql.connector
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)
CORS(app)
SECRET = os.getenv('JWT_SECRET', 'change-this-development-secret')
DB_NAME = os.getenv('DB_NAME', 'bubblebee_laundry')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')
SQLITE_PATH = os.path.join(os.path.dirname(__file__), 'laundry.db')
ENGINE = 'mysql'


def mysql_cfg(use_database=True):
    cfg = dict(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', '3306')),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        autocommit=True,
    )
    if use_database:
        cfg['database'] = DB_NAME
    return cfg


def sqlite_conn():
    cn = sqlite3.connect(SQLITE_PATH)
    cn.row_factory = sqlite3.Row
    cn.execute('PRAGMA foreign_keys = ON')
    return cn


def ensure_transaction_columns():
    if ENGINE == 'sqlite':
        cn = sqlite_conn()
        c = cursor(cn)
        c.execute('PRAGMA table_info(transactions)')
        columns = [row[1] for row in c.fetchall()]
        if 'planned_payment_date' not in columns:
            c.execute('ALTER TABLE transactions ADD COLUMN planned_payment_date TEXT')
            cn.commit()
        close(cn, c)
    else:
        cn = db()
        c = cursor(cn)
        c.execute('SHOW COLUMNS FROM transactions LIKE %s', ('planned_payment_date',))
        if c.fetchone() is None:
            c.execute('ALTER TABLE transactions ADD COLUMN planned_payment_date DATE NULL')
            cn.commit()
        close(cn, c)


def db(use_database=True):
    if ENGINE == 'sqlite':
        return sqlite_conn()
    return mysql.connector.connect(**mysql_cfg(use_database))


def cursor(cn):
    if ENGINE == 'sqlite':
        return cn.cursor()
    return cn.cursor(dictionary=True)


def close(cn, c=None):
    if c is not None:
        c.close()
    cn.close()


def rows_as_dicts(result):
    if ENGINE == 'sqlite':
        return [dict(r) for r in result]
    return result


def one_as_dict(row):
    if row is None:
        return None
    return dict(row) if ENGINE == 'sqlite' else row


def last_id(c, cn):
    if ENGINE == 'sqlite':
        return c.lastrowid
    return c.lastrowid


def exec_sql(c, sql, params=()):
    if ENGINE == 'sqlite':
        sql = (
            sql.replace('%s', '?')
            .replace('INSERT IGNORE', 'INSERT OR IGNORE')
            .replace('CURDATE()', "date('now','localtime')")
            .replace('CURTIME()', "time('now','localtime')")
        )
    c.execute(sql, params)


def seed_admin(c, cn):
    hashed = generate_password_hash(ADMIN_PASSWORD, method='pbkdf2:sha256')
    if ENGINE == 'sqlite':
        c.execute('SELECT COUNT(*) FROM users')
        if c.fetchone()[0] == 0:
            c.execute('INSERT INTO users(username, email, password_hash) VALUES(?, ?, ?)', ('admin', 'admin', hashed))
        cn.commit()
    else:
        c.execute('SELECT COUNT(*) AS total FROM users')
        if c.fetchone()['total'] == 0:
            c.execute('INSERT INTO users(username, email, password_hash) VALUES(%s, %s, %s)', ('admin', 'admin', hashed))


def ensure_user_auth_version():
    cn = db()
    c = cursor(cn)
    if ENGINE == 'sqlite':
        c.execute('PRAGMA table_info(users)')
        columns = [row[1] for row in c.fetchall()]
        if 'auth_version' not in columns:
            c.execute('ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 1')
            cn.commit()
    else:
        c.execute('SHOW COLUMNS FROM users LIKE %s', ('auth_version',))
        if c.fetchone() is None:
            c.execute('ALTER TABLE users ADD COLUMN auth_version INT NOT NULL DEFAULT 1')
            cn.commit()
    close(cn, c)


def init_sqlite():
    cn = sqlite_conn()
    c = cursor(cn)
    c.executescript(
        '''
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            auth_version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS years(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year INTEGER NOT NULL UNIQUE,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS months(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year_id INTEGER NOT NULL,
            month_number INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(year_id, month_number),
            FOREIGN KEY(year_id) REFERENCES years(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS transactions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            transaction_date TEXT NOT NULL,
            transaction_time TEXT NOT NULL,
            total_amount REAL NOT NULL,
            amount_paid REAL NOT NULL,
            remaining_balance REAL NOT NULL,
            status TEXT NOT NULL,
            planned_payment_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(month_id) REFERENCES months(id)
        );
        CREATE INDEX IF NOT EXISTS idx_transaction_date ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_transaction_month ON transactions(month_id);
        '''
    )
    seed_admin(c, cn)
    ensure_user_auth_version()
    ensure_transaction_columns()
    close(cn, c)


def init_mysql():
    cn = mysql.connector.connect(**mysql_cfg(False))
    c = cursor(cn)
    c.execute(f'CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4')
    c.execute(f'USE `{DB_NAME}`')
    c.execute(
        '''CREATE TABLE IF NOT EXISTS users(
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(80) NOT NULL UNIQUE,
            email VARCHAR(160) UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            auth_version INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'''
    )
    c.execute(
        '''CREATE TABLE IF NOT EXISTS years(
            id INT AUTO_INCREMENT PRIMARY KEY,
            year SMALLINT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'''
    )
    c.execute(
        '''CREATE TABLE IF NOT EXISTS months(
            id INT AUTO_INCREMENT PRIMARY KEY,
            year_id INT NOT NULL,
            month_number TINYINT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_year_month(year_id, month_number),
            FOREIGN KEY(year_id) REFERENCES years(id) ON DELETE CASCADE)'''
    )
    c.execute(
        '''CREATE TABLE IF NOT EXISTS transactions(
            id INT AUTO_INCREMENT PRIMARY KEY,
            month_id INT NOT NULL,
            customer_name VARCHAR(160) NOT NULL,
            transaction_date DATE NOT NULL,
            transaction_time TIME NOT NULL,
            total_amount DECIMAL(12,2) NOT NULL,
            amount_paid DECIMAL(12,2) NOT NULL,
            remaining_balance DECIMAL(12,2) NOT NULL,
            status ENUM('PAID','UNPAID','PARTIALLY PAID') NOT NULL,
            planned_payment_date DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(month_id) REFERENCES months(id),
            INDEX idx_transaction_date(transaction_date),
            INDEX idx_transaction_month(month_id))'''
    )
    seed_admin(c, cn)
    ensure_user_auth_version()
    ensure_transaction_columns()
    close(cn, c)


def init_db():
    global ENGINE
    try:
        init_mysql()
        ENGINE = 'mysql'
        print('Using MySQL database', DB_NAME)
    except mysql.connector.Error as e:
        ENGINE = 'sqlite'
        init_sqlite()
        print('MySQL unavailable (%s). Using local SQLite file laundry.db' % e)


def out(x):
    def c(v):
        if isinstance(v, Decimal):
            return float(v)
        if isinstance(v, (date, datetime)):
            return v.isoformat()
        return v

    if isinstance(x, list):
        return jsonify([{k: c(v) for k, v in r.items()} for r in x])
    return jsonify({
        k: c(v) if not isinstance(v, list) else [{a: c(b) for a, b in z.items()} for z in v]
        for k, v in x.items()
    })


def auth(f):
    @wraps(f)
    def w(*a, **k):
        try:
            claims = jwt.decode(
                request.headers.get('Authorization', '').replace('Bearer ', ''),
                SECRET,
                algorithms=['HS256'],
            )
            cn = db()
            c = cursor(cn)
            exec_sql(c, 'SELECT auth_version FROM users WHERE id=%s', (claims['user_id'],))
            user = one_as_dict(c.fetchone())
            close(cn, c)
            if not user or int(user['auth_version'] or 1) != int(claims.get('auth_version', 0)):
                return jsonify(error='Session expired. Please sign in again.'), 401
        except Exception:
            return jsonify(error='Authentication required.'), 401
        return f(*a, **k)
    return w


def month_name(n):
    return date(2020, int(n), 1).strftime('%B')


@app.get('/api/health')
def health():
    return jsonify(ok=True, engine=ENGINE)


@app.post('/api/login')
def login():
    body = request.get_json() or {}
    username = (body.get('username') or '').strip()
    password = body.get('password') or ''
    try:
        cn = db()
        c = cursor(cn)
        exec_sql(c, 'SELECT * FROM users WHERE username=%s', (username,))
        user = one_as_dict(c.fetchone())
        close(cn, c)
    except Exception:
        return jsonify(error='Database is not available.'), 503
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify(error='Invalid username or password.'), 401
    return jsonify(
        token=jwt.encode({'user_id': user['id'], 'auth_version': int(user.get('auth_version') or 1)}, SECRET, algorithm='HS256'),
        username=user['username'],
    )


@app.get('/api/account')
@auth
def account():
    try:
        claims = jwt.decode(
            request.headers.get('Authorization', '').replace('Bearer ', ''),
            SECRET,
            algorithms=['HS256'],
        )
        cn = db()
        c = cursor(cn)
        exec_sql(c, 'SELECT id, username, email FROM users WHERE id=%s', (claims['user_id'],))
        user = one_as_dict(c.fetchone())
        close(cn, c)
    except Exception:
        return jsonify(error='Database is not available.'), 503
    if not user:
        return jsonify(error='Account not found.'), 404
    return jsonify(account=user)


@app.put('/api/account')
@auth
def update_account():
    body = request.get_json() or {}
    new_username = (body.get('new_username') or '').strip()
    current_password = body.get('current_password') or ''
    new_password = body.get('new_password') or ''
    confirm_password = body.get('confirm_password') or ''
    password_change_requested = bool(new_password or confirm_password)

    if not new_username and not password_change_requested:
        return jsonify(error='Enter a new username or complete the password fields.'), 400
    if new_username and not re.fullmatch(r'[A-Za-z0-9_]{3,32}', new_username):
        return jsonify(error='Username must be 3-32 characters using only letters, numbers, or underscores.'), 400
    if not current_password:
        return jsonify(error='Enter your current password to change account credentials.'), 400
    if password_change_requested:
        if not new_password or not confirm_password:
            return jsonify(error='Complete all password fields.'), 400
        if new_password != confirm_password:
            return jsonify(error='New passwords do not match.'), 400

    try:
        claims = jwt.decode(
            request.headers.get('Authorization', '').replace('Bearer ', ''),
            SECRET,
            algorithms=['HS256'],
        )
        cn = db()
        c = cursor(cn)
        exec_sql(c, 'SELECT * FROM users WHERE id=%s', (claims['user_id'],))
        user = one_as_dict(c.fetchone())
        if not user:
            close(cn, c)
            return jsonify(error='Account not found.'), 404
        if not check_password_hash(user['password_hash'], current_password):
            close(cn, c)
            return jsonify(error='Current password is incorrect.'), 400

        updates = []
        params = []
        if new_username:
            updates.append('username=%s')
            params.append(new_username)
        if new_password:
            updates.append('password_hash=%s')
            params.append(generate_password_hash(new_password, method='pbkdf2:sha256'))
        updates.append('auth_version=auth_version+1')
        params.append(user['id'])
        exec_sql(c, f"UPDATE users SET {', '.join(updates)} WHERE id=%s", tuple(params))
        cn.commit()
        close(cn, c)
    except Exception as e:
        if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
            return jsonify(error='That username is already in use.'), 409
        return jsonify(error='Unable to update account.'), 500

    return jsonify(message='Account updated successfully.', username=new_username or user['username'])


@app.get('/api/years')
@auth
def years():
    cn = db()
    c = cursor(cn)
    exec_sql(c, 'SELECT year FROM years ORDER BY year')
    r = rows_as_dicts(c.fetchall())
    close(cn, c)
    return out({'years': r})


@app.post('/api/years')
@auth
def newyear():
    try:
        y = int((request.get_json() or {})['year'])
        assert 2000 <= y <= 2100
    except Exception:
        return jsonify(error='Enter a valid year between 2000 and 2100.'), 400
    cn = db()
    c = cursor(cn)
    try:
        exec_sql(c, 'INSERT INTO years(year) VALUES(%s)', (y,))
        cn.commit()
    except Exception as e:
        if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
            return jsonify(error='That year already exists.'), 409
        raise
    finally:
        close(cn, c)
    return jsonify(message='Year added.'), 201


@app.get('/api/years/<int:y>/months')
@auth
def months(y):
    cn = db()
    c = cursor(cn)
    if ENGINE == 'sqlite':
        exec_sql(
            c,
            '''SELECT m.id, m.month_number,
                      COALESCE(SUM(t.amount_paid), 0) total_earnings,
                      COUNT(t.id) transaction_count
               FROM months m
               JOIN years y ON y.id = m.year_id
               LEFT JOIN transactions t ON t.month_id = m.id
               WHERE y.year = %s
               GROUP BY m.id
               ORDER BY m.month_number''',
            (y,),
        )
        r = rows_as_dicts(c.fetchall())
        for row in r:
            row['name'] = month_name(row['month_number'])
    else:
        exec_sql(
            c,
            '''SELECT m.id, m.month_number,
                      MONTHNAME(STR_TO_DATE(m.month_number, '%m')) name,
                      COALESCE(SUM(t.amount_paid), 0) total_earnings,
                      COUNT(t.id) transaction_count
               FROM months m
               JOIN years y ON y.id = m.year_id
               LEFT JOIN transactions t ON t.month_id = m.id
               WHERE y.year = %s
               GROUP BY m.id
               ORDER BY m.month_number''',
            (y,),
        )
        r = rows_as_dicts(c.fetchall())
    close(cn, c)
    return out({'months': r})


@app.post('/api/years/<int:y>/months')
@auth
def newmonth(y):
    m = (request.get_json() or {}).get('month')
    if not isinstance(m, int) or not 1 <= m <= 12:
        return jsonify(error='Select a valid month.'), 400
    cn = db()
    c = cursor(cn)
    exec_sql(c, 'SELECT id FROM years WHERE year=%s', (y,))
    row = one_as_dict(c.fetchone())
    if not row:
        close(cn, c)
        return jsonify(error='Year not found.'), 404
    year_id = row['id']
    try:
        exec_sql(c, 'INSERT INTO months(year_id, month_number) VALUES(%s, %s)', (year_id, m))
        cn.commit()
    except Exception as e:
        if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
            return jsonify(error='That month already exists for this year.'), 409
        raise
    finally:
        close(cn, c)
    return jsonify(message='Month added.'), 201


@app.delete('/api/years/<int:y>')
@auth
def delete_year(y):
    cn = db()
    c = cursor(cn)
    try:
        exec_sql(c, 'SELECT id FROM years WHERE year=%s', (y,))
        year_row = one_as_dict(c.fetchone())
        if not year_row:
            return jsonify(error='Year not found.'), 404

        exec_sql(c, '''DELETE FROM transactions WHERE month_id IN (
                         SELECT id FROM months WHERE year_id=%s
                       )''', (year_row['id'],))
        exec_sql(c, 'DELETE FROM months WHERE year_id=%s', (year_row['id'],))
        exec_sql(c, 'DELETE FROM years WHERE id=%s', (year_row['id'],))
        cn.commit()
    finally:
        close(cn, c)
    return jsonify(message='Year deleted.')


@app.delete('/api/months/<int:i>')
@auth
def delete_month(i):
    cn = db()
    c = cursor(cn)
    try:
        exec_sql(c, 'SELECT id FROM months WHERE id=%s', (i,))
        month_row = one_as_dict(c.fetchone())
        if not month_row:
            return jsonify(error='Month not found.'), 404

        exec_sql(c, 'DELETE FROM transactions WHERE month_id=%s', (i,))
        exec_sql(c, 'DELETE FROM months WHERE id=%s', (i,))
        cn.commit()
    finally:
        close(cn, c)
    return jsonify(message='Month deleted.')


@app.get('/api/months/<int:i>/calendar')
@auth
def calendar(i):
    cn = db()
    c = cursor(cn)
    exec_sql(
        c,
        '''SELECT m.month_number month, y.year
           FROM months m JOIN years y ON y.id = m.year_id WHERE m.id = %s''',
        (i,),
    )
    r = one_as_dict(c.fetchone())
    if not r:
        close(cn, c)
        return jsonify(error='Month not found.'), 404
    r['name'] = month_name(r['month'])
    if ENGINE == 'sqlite':
        exec_sql(
            c,
            '''SELECT CAST(strftime('%d', transaction_date) AS INTEGER) day,
                      SUM(amount_paid) total_paid, COUNT(*) count
               FROM transactions WHERE month_id = %s
               GROUP BY day''',
            (i,),
        )
    else:
        exec_sql(
            c,
            '''SELECT DAY(transaction_date) day, SUM(amount_paid) total_paid, COUNT(*) count
               FROM transactions WHERE month_id = %s
               GROUP BY DAY(transaction_date)''',
            (i,),
        )
    r['days'] = {str(x['day']): x for x in rows_as_dicts(c.fetchall())}
    close(cn, c)
    return out(r)


def format_time(value):
    if value is None:
        return ''
    if hasattr(value, 'strftime') and not isinstance(value, date):
        try:
            return value.strftime('%I:%M %p').lstrip('0')
        except Exception:
            pass
    text = str(value)
    try:
        parsed = datetime.strptime(text[:8], '%H:%M:%S')
        return parsed.strftime('%I:%M %p').lstrip('0')
    except ValueError:
        return text


@app.get('/api/transactions/date/<string:d>')
@auth
def bydate(d):
    cn = db()
    c = cursor(cn)
    exec_sql(
        c,
        '''SELECT id, customer_name, total_amount, amount_paid, remaining_balance, status, planned_payment_date, transaction_time
           FROM transactions WHERE transaction_date = %s
           ORDER BY transaction_time DESC''',
        (d,),
    )
    t = rows_as_dicts(c.fetchall())
    for row in t:
        row['transaction_time'] = format_time(row['transaction_time'])
    exec_sql(
        c,
        '''SELECT COUNT(*) count,
                  COALESCE(SUM(total_amount), 0) total_amount,
                  COALESCE(SUM(amount_paid), 0) total_paid,
                  COALESCE(SUM(remaining_balance), 0) total_unpaid
           FROM transactions WHERE transaction_date = %s''',
        (d,),
    )
    s = one_as_dict(c.fetchone())
    close(cn, c)
    return out({'transactions': t, 'summary': s})


@app.post('/api/transactions')
@auth
def transaction():
    b = request.get_json() or {}
    try:
        n = b['customer_name'].strip()
        total = Decimal(str(b['total_amount']))
        paid = Decimal(str(b['amount_paid']))
        d = datetime.strptime(b['transaction_date'], '%Y-%m-%d').date()
        planned = (b.get('planned_payment_date') or '').strip() or None
        assert n and total > 0 and 0 <= paid <= total
    except Exception:
        return jsonify(error='Provide a name, valid amounts, and an amount paid no greater than total.'), 400
    cn = db()
    c = cursor(cn)
    exec_sql(c, 'INSERT IGNORE INTO years(year) VALUES(%s)', (d.year,))
    exec_sql(c, 'SELECT id FROM years WHERE year=%s', (d.year,))
    y = one_as_dict(c.fetchone())['id']
    exec_sql(c, 'INSERT IGNORE INTO months(year_id, month_number) VALUES(%s, %s)', (y, d.month))
    exec_sql(c, 'SELECT id FROM months WHERE year_id=%s AND month_number=%s', (y, d.month))
    m = one_as_dict(c.fetchone())['id']
    s = 'PAID' if paid >= total else ('PARTIALLY PAID' if paid else 'UNPAID')
    exec_sql(
        c,
        '''INSERT INTO transactions(
               month_id, customer_name, transaction_date, transaction_time,
               total_amount, amount_paid, remaining_balance, status, planned_payment_date)
           VALUES(%s, %s, %s, CURTIME(), %s, %s, %s, %s, %s)''',
        (m, n, d.isoformat(), float(total), float(paid), float(total - paid), s, planned),
    )
    cn.commit()
    close(cn, c)
    return jsonify(message='Transaction saved.'), 201


@app.patch('/api/transactions/<int:id>')
@auth
def update_transaction(id):
    payload = request.get_json() or {}
    status = (payload.get('status') or '').strip().upper()
    if status not in {'PAID', 'UNPAID', 'PARTIALLY PAID'}:
        return jsonify(error='Choose a valid status.'), 400

    cn = db()
    c = cursor(cn)
    exec_sql(c, 'SELECT total_amount, amount_paid, remaining_balance FROM transactions WHERE id=%s', (id,))
    row = one_as_dict(c.fetchone())
    if row is None:
        close(cn, c)
        return jsonify(error='Transaction not found.'), 404

    total = Decimal(str(row['total_amount']))
    if status == 'PAID':
        paid = total
    elif status == 'UNPAID':
        paid = Decimal('0')
    else:
        paid = min(max(Decimal(str(payload.get('amount_paid', row['amount_paid']))), Decimal('0')), total)

    remaining = max(total - paid, Decimal('0'))
    if paid >= total:
        status = 'PAID'
    elif paid:
        status = 'PARTIALLY PAID'
    else:
        status = 'UNPAID'
    planned = payload.get('planned_payment_date') or None
    if status == 'PAID':
        planned = None
    exec_sql(
        c,
        'UPDATE transactions SET amount_paid=%s, remaining_balance=%s, status=%s, planned_payment_date=%s WHERE id=%s',
        (float(paid), float(remaining), status, planned, id),
    )
    cn.commit()
    close(cn, c)
    return jsonify(message='Transaction updated.')


@app.delete('/api/transactions/<int:id>')
@auth
def delete_transaction(id):
    cn = db()
    c = cursor(cn)
    try:
        exec_sql(c, 'SELECT id FROM transactions WHERE id=%s', (id,))
        if not one_as_dict(c.fetchone()):
            return jsonify(error='Transaction not found.'), 404

        exec_sql(c, 'DELETE FROM transactions WHERE id=%s', (id,))
        cn.commit()
    finally:
        close(cn, c)
    return jsonify(message='Transaction deleted.')


@app.get('/api/dashboard')
@auth
def dashboard():
    selected_date = request.args.get('date')
    if selected_date:
        try:
            datetime.strptime(selected_date, '%Y-%m-%d')
        except ValueError:
            return jsonify(error='Use a valid date in YYYY-MM-DD format.'), 400
    else:
        selected_date = date.today().isoformat()

    cn = db()
    c = cursor(cn)
    exec_sql(
        c,
        '''SELECT COUNT(*) transactions,
                  COALESCE(SUM(total_amount), 0) total_amount,
                  COALESCE(SUM(amount_paid), 0) total_paid,
                  COALESCE(SUM(remaining_balance), 0) total_unpaid
           FROM transactions WHERE transaction_date = %s''',
        (selected_date,),
    )
    r = one_as_dict(c.fetchone())
    exec_sql(
        c,
        '''SELECT id, customer_name, total_amount, amount_paid, remaining_balance, status, planned_payment_date, transaction_date
           FROM transactions WHERE transaction_date = %s ORDER BY transaction_time DESC LIMIT 5''',
        (selected_date,),
    )
    r['recent'] = rows_as_dicts(c.fetchall())
    close(cn, c)
    return out(r)


class _PointToFrontend(logging.Filter):
    """Swap Werkzeug's API URL banner for the frontend URL users should open."""

    def filter(self, record):
        if 'Running on' in record.getMessage():
            record.msg = ' * API ready on :5000 (no pages here). Open the app at the [web] "Local:" URL Vite prints.'
            record.args = ()
        return True


if __name__ == '__main__':
    logging.getLogger('werkzeug').addFilter(_PointToFrontend())
    init_db()
    app.run(debug=True, host='127.0.0.1', port=5000)
