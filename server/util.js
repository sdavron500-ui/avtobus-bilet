const crypto = require('crypto');

const rid = (bytes = 8) => crypto.randomBytes(bytes).toString('hex');

function hashPw(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}

function checkPw(pw, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const x = crypto.scryptSync(pw, salt, 64);
  const y = Buffer.from(h, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Toshkent vaqti, "YYYY-MM-DD HH:MM"
function nowLocal() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 16);
}

function toDate(local) {
  return new Date(local.replace(' ', 'T') + ':00Z');
}

function fromDate(d) {
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

function addMinutes(local, min) {
  return fromDate(new Date(toDate(local).getTime() + min * 60000));
}

function diffMinutes(a, b) {
  return Math.round((toDate(b) - toDate(a)) / 60000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function normPhone(p) {
  const digits = String(p || '').replace(/\D/g, '');
  if (digits.length === 9) return '+998' + digits;
  if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
  return null;
}

function luhn(num) {
  const s = String(num).replace(/\s+/g, '');
  if (!/^\d{16}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    let d = +s[s.length - 1 - i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function validExpiry(exp) {
  const m = String(exp || '').match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return false;
  const mm = +m[1], yy = 2000 + +m[2];
  if (mm < 1 || mm > 12) return false;
  const now = new Date();
  return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

function ticketNumber() {
  let s = '';
  while (s.length < 10) s += crypto.randomInt(0, 10);
  return s;
}

// Joy raqamidan o'rindiq joylashuvi (2 + yo'lak + 2)
function seatPos(no) {
  return { row: Math.ceil(no / 4), col: (no - 1) % 4 };
}

class HttpError extends Error {
  constructor(status, code, extra) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

module.exports = {
  rid, hashPw, checkPw, nowLocal, toDate, fromDate, addMinutes, diffMinutes, addDays,
  normPhone, luhn, validExpiry, ticketNumber, seatPos, HttpError
};
