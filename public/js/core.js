// Umumiy yordamchilar: holat, tarjima, API, router, modal, toast
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } }
};
const SS = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* private mode */ } }
};
export { LS, SS };

export const S = { lang: 'uz', dict: {}, config: {}, cities: [], user: null };
export const app = () => document.getElementById('app');

/* ---------- xavfsiz matn ---------- */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- tarjima ---------- */
export async function loadLang(lang) {
  if (!['uz', 'ru', 'en'].includes(lang)) lang = 'uz';
  const res = await fetch(`/i18n/${lang}.json`);
  S.dict = await res.json();
  S.lang = lang;
  LS.set('lang', lang);
  document.documentElement.lang = lang;
}
export const has = (key) => Object.prototype.hasOwnProperty.call(S.dict, key);
export function t(key, vars) {
  let s = has(key) ? S.dict[key] : key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return s;
}
export function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.title = (S.config.brand || 'Marshrut') + ': ' + t('meta.title');
}
export const cityName = (c) => (c ? c[S.lang] || c.uz : '');

/* ---------- formatlash ---------- */
export const money = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + t('currency');
export const timeOf = (local) => String(local).slice(11, 16);
export const dateOf = (local) => String(local).slice(0, 10);
function dateObj(local) { const [y, m, d] = String(local).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
// Oy va hafta kunlari tarjima faylidan olinadi (brauzerdagi Intl ma'lumotlariga bog'liq emas)
export function fmtDay(local, opts) {
  const d = dateObj(local);
  const m = d.getUTCMonth() + 1;
  const name = opts && opts.month === 'short' ? t('mons.' + m) : t('mon.' + m);
  return d.getUTCDate() + ' ' + name;
}
export const fmtWeekday = (local) => t('wd.' + dateObj(local).getUTCDay());
export function fmtDur(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return (h ? h + ' ' + t('hour') + ' ' : '') + (m ? m + ' ' + t('min') : '').trim();
}
export function todayLocal() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 10);
}
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

/* ---------- API ---------- */
export function guestKey() {
  let g = LS.get('guest');
  if (!g) { g = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); LS.set('guest', g); }
  return g;
}
export async function api(method, url, body) {
  const headers = { 'content-type': 'application/json', 'x-guest': guestKey() };
  const tok = LS.get('token');
  if (tok) headers.authorization = 'Bearer ' + tok;
  let res;
  try {
    res = await fetch('/api' + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    const e = new Error('network'); e.code = 'network'; throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || 'server_error');
    e.code = data.error || 'server_error'; e.status = res.status; e.data = data;
    if (res.status === 401 && tok && url !== '/auth/login') { LS.del('token'); S.user = null; renderHeader(); }
    throw e;
  }
  return data;
}
export const errMsg = (e) => (e && has('err.' + e.code) ? t('err.' + e.code) : t('err.server_error'));

/* ---------- toast va modal ---------- */
export function toast(msg, kind = '') {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

export function modal({ title, html = '', actions = [] }) {
  const prev = document.activeElement;
  const ov = document.createElement('div');
  ov.className = 'ov';
  ov.innerHTML = `<div class="md" role="dialog" aria-modal="true" aria-labelledby="mdt"><h3 id="mdt">${esc(title)}</h3><div>${html}</div><div class="acts"></div></div>`;
  const acts = ov.querySelector('.acts');
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  actions.forEach((a) => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.kind || 'btn-ghost');
    b.textContent = a.label;
    b.addEventListener('click', async () => {
      if (a.onClick) { const keep = await a.onClick(b, ov); if (keep === false) return; }
      close();
    });
    acts.appendChild(b);
  });
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
  const first = acts.querySelector('button') || ov.querySelector('button, input');
  if (first) first.focus();
  return { close, el: ov };
}

/* ---------- taymerlar (sahifa almashganda tozalanadi) ---------- */
let timers = [];
export function every(fn, ms) { const id = setInterval(fn, ms); timers.push(id); return id; }
export function clearTimers() { timers.forEach(clearInterval); timers = []; }

export function countdown(el, expiresAt, onExpire) {
  let done = false;
  const tick = () => {
    const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
    el.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
    el.parentElement && el.parentElement.classList.toggle('late', left < 60);
    if (!left && !done) { done = true; onExpire(); }
  };
  tick();
  every(tick, 1000);
}

/* ---------- router ---------- */
const routes = [];
export function route(re, fn, nav) { routes.push({ re, fn, nav }); }
export const go = (hash) => { if (location.hash === '#' + hash) render(); else location.hash = hash; };

export function view(html) { app().innerHTML = html; }
export function loading() { view('<div class="spin" role="status" aria-label="..."></div>'); }

let renderSeq = 0;
export async function render() {
  const seq = ++renderSeq;
  const hash = location.hash.slice(1) || '/';
  const [path, qs] = hash.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  clearTimers();
  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    markNav(r.nav);
    loading();
    try {
      await r.fn(m.slice(1), q, () => seq === renderSeq);
    } catch (e) {
      if (seq !== renderSeq) return;
      view(`<div class="wrap page"><div class="empty"><h3>${esc(t('err.title'))}</h3><p>${esc(errMsg(e))}</p><a class="btn" href="#/">${esc(t('to_home'))}</a></div></div>`);
    }
    if (seq === renderSeq) { window.scrollTo(0, 0); app().focus({ preventScroll: true }); }
    return;
  }
  markNav('');
  view(`<div class="wrap page"><div class="empty"><h3>404</h3><p>${esc(t('err.not_found'))}</p><a class="btn" href="#/">${esc(t('to_home'))}</a></div></div>`);
}

function markNav(name) {
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === name));
}

/* ---------- sarlavha (login/avatar) ---------- */
export function renderHeader() {
  const login = document.getElementById('loginBtn');
  const av = document.getElementById('avatarBtn');
  if (S.user) {
    login.hidden = true; av.hidden = false;
    av.textContent = (S.user.name || S.user.email || '?').trim().charAt(0).toUpperCase();
  } else { login.hidden = false; av.hidden = true; }
}

/* ---------- kichik UI yordamchilari ---------- */
export const icon = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  swap: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v14M7 18l-3-3M7 18l3-3M17 20V6M17 6l-3 3M17 6l3 3"/></svg>',
  check: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bus: '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="3"/><path d="M3 11h18"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/></svg>',
  wheel: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.2"/><path d="M12 14.2V21M3.3 10.5l6.5 1M20.7 10.5l-6.5 1"/></svg>',
  bell: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>'
};
export const pageHead = (title, backHref) =>
  `<div class="page-h">${backHref ? `<a class="back" href="${backHref}" aria-label="${esc(t('back'))}">${icon.back}</a>` : ''}<h1>${esc(title)}</h1></div>`;

// Telefon: "90 123 45 67" ko'rinishida kiritish
export function bindPhone(input) {
  input.addEventListener('input', () => {
    let d = input.value.replace(/\D/g, '');
    if (d.startsWith('998')) d = d.slice(3);
    d = d.slice(0, 9);
    const p = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
    input.value = p.join(' ');
  });
}
export const phoneDigits = (v) => String(v || '').replace(/\D/g, '').replace(/^998/, '');
export const phoneShow = (p) => { const d = phoneDigits(p); return '+998 ' + [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' '); };

export function showErr(form, name, msg) {
  const inp = form.querySelector(`[name="${name}"]`);
  const holder = form.querySelector(`[data-err="${name}"]`);
  if (inp) inp.classList.toggle('bad', !!msg);
  if (holder) holder.textContent = msg || '';
}
