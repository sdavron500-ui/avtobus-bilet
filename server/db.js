const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

fs.mkdirSync(cfg.DATA_DIR, { recursive: true });
class Database {
  constructor(file) {
    this.connection = new DatabaseSync(file);
    this.transactionDepth = 0;
  }

  exec(sql) {
    return this.connection.exec(sql);
  }

  prepare(sql) {
    const statement = this.connection.prepare(sql);
    statement.setAllowBareNamedParameters(true);
    return statement;
  }

  pragma(sql) {
    return this.prepare(`PRAGMA ${sql}`).all();
  }

  transaction(callback) {
    return (...args) => {
      const depth = this.transactionDepth;
      const savepoint = `nested_transaction_${depth}`;
      this.exec(depth === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${savepoint}`);
      this.transactionDepth++;
      try {
        const result = callback(...args);
        this.exec(depth === 0 ? 'COMMIT' : `RELEASE SAVEPOINT ${savepoint}`);
        return result;
      } catch (error) {
        this.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO SAVEPOINT ${savepoint}`);
        if (depth > 0) this.exec(`RELEASE SAVEPOINT ${savepoint}`);
        throw error;
      } finally {
        this.transactionDepth--;
      }
    };
  }
}

const db = new Database(path.join(cfg.DATA_DIR, process.env.DB_FILE || 'app.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_uz TEXT NOT NULL, name_ru TEXT NOT NULL, name_en TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UZ'
);
CREATE TABLE IF NOT EXISTS buses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, plate TEXT DEFAULT '', model TEXT DEFAULT '',
  seats INTEGER NOT NULL DEFAULT 40, amenities TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id INTEGER NOT NULL REFERENCES cities(id),
  to_id INTEGER NOT NULL REFERENCES cities(id),
  depart_time TEXT NOT NULL, duration_min INTEGER NOT NULL, price INTEGER NOT NULL,
  bus_id INTEGER NOT NULL REFERENCES buses(id),
  platform TEXT DEFAULT '', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
  from_id INTEGER NOT NULL REFERENCES cities(id),
  to_id INTEGER NOT NULL REFERENCES cities(id),
  depart_at TEXT NOT NULL, arrive_at TEXT NOT NULL, duration_min INTEGER NOT NULL,
  price INTEGER NOT NULL,
  bus_id INTEGER NOT NULL REFERENCES buses(id),
  platform TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(schedule_id, depart_at)
);
CREATE INDEX IF NOT EXISTS idx_trips_search ON trips(from_id, to_id, depart_at);
CREATE INDEX IF NOT EXISTS idx_trips_bus_depart ON trips(bus_id, depart_at);
CREATE TABLE IF NOT EXISTS blocked (
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_no INTEGER NOT NULL, reason TEXT DEFAULT '',
  PRIMARY KEY(trip_id, seat_no)
);
CREATE TABLE IF NOT EXISTS holds (
  token TEXT NOT NULL,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_no INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  PRIMARY KEY(trip_id, seat_no)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL,
  name TEXT DEFAULT '', phone TEXT DEFAULT '', lang TEXT DEFAULT 'uz',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  guest_key TEXT,
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL, fee INTEGER NOT NULL, total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', payment_method TEXT NOT NULL DEFAULT 'card',
  sms_code TEXT, sms_tries INTEGER NOT NULL DEFAULT 0,
  created_ms INTEGER NOT NULL, created_at TEXT NOT NULL, paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_trip_status ON orders(trip_id, status);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  seat_no INTEGER NOT NULL,
  fio TEXT NOT NULL, gender TEXT NOT NULL,
  passport TEXT DEFAULT '', birth TEXT DEFAULT '',
  price INTEGER NOT NULL, number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  returned_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tickets_trip_status ON tickets(trip_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_seat ON tickets(trip_id, seat_no) WHERE status IN ('pending','active');
CREATE TABLE IF NOT EXISTS codes (
  kind TEXT NOT NULL, key TEXT NOT NULL, code TEXT NOT NULL, expires_at INTEGER NOT NULL,
  PRIMARY KEY(kind, key)
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, guest_key TEXT,
  title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
);
`);

const tripColumns = new Set(db.pragma('table_info(trips)').map((column) => column.name));
if (!tripColumns.has('notice_reason')) db.exec("ALTER TABLE trips ADD COLUMN notice_reason TEXT NOT NULL DEFAULT ''");
if (!tripColumns.has('notice_phone')) db.exec("ALTER TABLE trips ADD COLUMN notice_phone TEXT NOT NULL DEFAULT ''");

const orderColumns = new Set(db.pragma('table_info(orders)').map((column) => column.name));
if (!orderColumns.has('payment_method')) {
  db.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'card'");
}

module.exports = { db };
