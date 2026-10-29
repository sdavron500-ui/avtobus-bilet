const path = require('path');
const fs = require('fs');

// Oddiy .env o'quvchi (qo'shimcha paket kerak emas)
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Number(v) : d);

module.exports = {
  PORT: num(process.env.PORT, 3000),
  HOST: process.env.HOST || '127.0.0.1',
  BRAND: process.env.BRAND_NAME || 'Marshrut',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  FEE_PERCENT: num(process.env.FEE_PERCENT, 2),
  HOLD_MS: num(process.env.HOLD_MINUTES, 10) * 60 * 1000,
  CASH_HOLD_CUTOFF_MINUTES: num(process.env.CASH_HOLD_CUTOFF_MINUTES, 60),
  RETURN_BEFORE_MIN: num(process.env.RETURN_BEFORE_MIN, 60),
  NO_SHOW_CONTACT_HOURS: num(process.env.NO_SHOW_CONTACT_HOURS, 24),
  MAX_SEATS: num(process.env.MAX_SEATS, 5),
  DEMO: process.env.DEMO !== '0',
  DATA_DIR: path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data')),
  DEMO_CODE: '123456',
  CONTACT_PHONE: process.env.CONTACT_PHONE || '+998 00 000 00 00',
  CONTACT_TELEGRAM: process.env.CONTACT_TELEGRAM || '@username',
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || 'info@example.com',
  CONTACT_HOURS: process.env.CONTACT_HOURS || '8:00-20:00',
  CONTACT_ADDRESS: process.env.CONTACT_ADDRESS || ''
};
