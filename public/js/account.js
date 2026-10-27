// Akkaunt, profil, bildirishnomalar, savol-javob, aloqa, chiptalarni tiklash
import {
  S, LS, esc, t, api, errMsg, toast, modal, route, view, go, loadLang, applyStatic, render, renderHeader,
  icon, pageHead, bindPhone, phoneDigits, showErr, fmtDay, money, timeOf, has
} from './core.js';

const q$ = (sel, root = document) => root.querySelector(sel);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function changeLang(lang) {
  await loadLang(lang);
  applyStatic();
  const sel = document.getElementById('langSel');
  if (sel) sel.value = lang;
  if (S.user) { try { S.user = await api('PUT', '/me', { name: S.user.name, phone: S.user.phone, lang }); } catch { /* ignore */ } }
  render();
}

function afterLogin(res) {
  LS.set('token', res.token);
  S.user = res.user;
  renderHeader();
  const next = new URLSearchParams((location.hash.split('?')[1]) || '').get('next');
  go(next && next.startsWith('/') ? next : '/profile');
}

/* ---------- kirish / ro'yxatdan o'tish ---------- */
route(/^\/login$/, async () => {
  view(`<div class="wrap page"><div class="narrow">
    ${pageHead(t('auth.login_title'), '')}
    <form class="card stack" id="f" novalidate>
      <div class="field"><label for="em">${esc(t('auth.email'))}</label><input class="inp" id="em" name="email" type="email" autocomplete="email" inputmode="email"><div class="err" data-err="email" role="alert"></div></div>
      <div class="field"><label for="pw">${esc(t('auth.password'))}</label><input class="inp" id="pw" name="password" type="password" autocomplete="current-password"><div class="err" data-err="password" role="alert"></div></div>
      <a class="link" href="#/forgot">${esc(t('auth.forgot'))}</a>
      <button class="btn btn-lime block" type="submit">${esc(t('auth.login'))}</button>
      <p class="center muted" style="margin:0">${esc(t('auth.no_account'))} <a class="link" href="#/register">${esc(t('auth.register'))}</a></p>
    </form></div></div>`);
  const f = q$('#f');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    showErr(f, 'email', EMAIL_RE.test(f.email.value.trim()) ? '' : t('err.bad_email'));
    showErr(f, 'password', f.password.value ? '' : t('err.short_password'));
    if (!EMAIL_RE.test(f.email.value.trim()) || !f.password.value) return;
    const b = f.querySelector('button[type=submit]'); b.disabled = true;
    try { afterLogin(await api('POST', '/auth/login', { email: f.email.value.trim(), password: f.password.value })); }
    catch (err) { showErr(f, 'password', errMsg(err)); b.disabled = false; }
  });
});

route(/^\/register$/, async () => {
  view(`<div class="wrap page"><div class="narrow">
    ${pageHead(t('auth.register_title'), '')}
    <form class="card stack" id="f" novalidate>
      <div class="field"><label for="em">${esc(t('auth.email'))}</label><input class="inp" id="em" name="email" type="email" autocomplete="email" inputmode="email"><div class="err" data-err="email" role="alert"></div></div>
      <div class="field"><label for="pw">${esc(t('auth.password'))}</label><input class="inp" id="pw" name="password" type="password" autocomplete="new-password"><div class="hint">${esc(t('auth.pw_hint'))}</div><div class="err" data-err="password" role="alert"></div></div>
      <div class="field"><label for="pw2">${esc(t('auth.confirm_password'))}</label><input class="inp" id="pw2" name="password2" type="password" autocomplete="new-password"><div class="err" data-err="password2" role="alert"></div></div>
      <button class="btn btn-lime block" type="submit">${esc(t('auth.register'))}</button>
      <p class="center muted" style="margin:0">${esc(t('auth.has_account'))} <a class="link" href="#/login">${esc(t('auth.login'))}</a></p>
    </form></div></div>`);
  const f = q$('#f');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = f.email.value.trim();
    const e1 = EMAIL_RE.test(em) ? '' : t('err.bad_email');
    const e2 = f.password.value.length >= 6 ? '' : t('err.short_password');
    const e3 = f.password.value === f.password2.value ? '' : t('err.pw_mismatch');
    showErr(f, 'email', e1); showErr(f, 'password', e2); showErr(f, 'password2', e3);
    if (e1 || e2 || e3) return;
    const b = f.querySelector('button[type=submit]'); b.disabled = true;
    try { afterLogin(await api('POST', '/auth/register', { email: em, password: f.password.value, lang: S.lang })); }
    catch (err) { showErr(f, 'email', errMsg(err)); b.disabled = false; }
  });
});

route(/^\/forgot$/, async () => {
  view(`<div class="wrap page"><div class="narrow">
    ${pageHead(t('auth.reset_title'), '#/login')}
    <form class="card stack" id="f1" novalidate>
      <p class="muted" style="margin:0">${esc(t('auth.reset_msg'))}</p>
      <div class="field"><label for="em">${esc(t('auth.email'))}</label><input class="inp" id="em" name="email" type="email" autocomplete="email"><div class="err" data-err="email" role="alert"></div></div>
      <button class="btn btn-lime block" type="submit">${esc(t('auth.send_code'))}</button>
    </form>
    <form class="card stack" id="f2" novalidate hidden>
      <div class="note" id="demoNote" hidden></div>
      <div class="field"><label for="cd">${esc(t('pay.code'))}</label><input class="inp" id="cd" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><div class="err" data-err="code" role="alert"></div></div>
      <div class="field"><label for="np">${esc(t('auth.new_password'))}</label><input class="inp" id="np" name="password" type="password" autocomplete="new-password"><div class="err" data-err="password" role="alert"></div></div>
      <button class="btn btn-lime block" type="submit">${esc(t('auth.reset_btn'))}</button>
    </form></div></div>`);
  const f1 = q$('#f1'), f2 = q$('#f2');
  f1.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = f1.email.value.trim();
    if (!EMAIL_RE.test(em)) { showErr(f1, 'email', t('err.bad_email')); return; }
    const b = f1.querySelector('button'); b.disabled = true;
    try {
      const r = await api('POST', '/auth/forgot', { email: em });
      f1.hidden = true; f2.hidden = false;
      if (r.demoCode) { const n = q$('#demoNote'); n.hidden = false; n.textContent = t('auth.demo_code', { code: r.demoCode }); }
      f2.code.focus();
    } catch (err) { showErr(f1, 'email', errMsg(err)); b.disabled = false; }
  });
  f2.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (f2.password.value.length < 6) { showErr(f2, 'password', t('err.short_password')); return; }
    const b = f2.querySelector('button'); b.disabled = true;
    try {
      await api('POST', '/auth/reset', { email: f1.email.value.trim(), code: f2.code.value.trim(), password: f2.password.value });
      toast(t('auth.reset_ok'), 'ok');
      go('/login');
    } catch (err) { showErr(f2, 'code', errMsg(err)); b.disabled = false; }
  });
});

/* ---------- profil ---------- */
const menuItem = (href, svg, label) => `<a href="${href}">${svg}<span>${esc(label)}</span>${icon.chev}</a>`;
const I = {
  bell: icon.bell,
  restore: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4l3 2"/></svg>',
  faq: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>',
  phone: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>'
};

route(/^\/profile$/, async () => {
  const langSeg = `<div class="seg" role="group" aria-label="${esc(t('profile.language'))}">
    ${['uz', 'ru', 'en'].map((l) => `<button type="button" data-lang="${l}" aria-pressed="${S.lang === l}">${l.toUpperCase()}</button>`).join('')}</div>`;
  const menu = `<div class="card menu">
    ${menuItem('#/notifications', I.bell, t('profile.notifications'))}
    ${menuItem('#/restore', I.restore, t('profile.restore'))}
    ${menuItem('#/faq', I.faq, t('nav.faq'))}
    ${menuItem('#/contacts', I.phone, t('nav.contacts'))}
  </div>`;
  if (!S.user) {
    view(`<div class="wrap page"><div class="narrow stack">
      ${pageHead(t('nav.profile'), '')}
      <div class="card stack center"><h2 style="font-size:21px">${esc(t('profile.guest'))}</h2><p class="muted" style="margin:0">${esc(t('profile.guest_msg'))}</p>
        <a class="btn btn-lime block" href="#/login">${esc(t('auth.login'))}</a><a class="btn btn-ghost block" href="#/register">${esc(t('auth.register'))}</a></div>
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px"><b>${esc(t('profile.language'))}</b>${langSeg}</div>
      ${menu}</div></div>`);
  } else {
    const u = S.user;
    view(`<div class="wrap page"><div class="narrow stack">
      ${pageHead(t('nav.profile'), '')}
      <form class="card stack" id="pf" novalidate>
        <h2 style="font-size:20px">${esc(t('profile.edit'))}</h2>
        <div class="field"><label for="pn">${esc(t('profile.name'))}</label><input class="inp" id="pn" name="name" value="${esc(u.name)}" autocomplete="name" maxlength="60"></div>
        <div class="field"><label for="pp">${esc(t('profile.phone'))}</label><div class="inpgrp"><span>+998</span><input class="inp" id="pp" name="phone" inputmode="tel" autocomplete="tel-national" placeholder="90 123 45 67"></div><div class="err" data-err="phone" role="alert"></div></div>
        <div class="field"><label for="pe">${esc(t('auth.email'))}</label><input class="inp" id="pe" value="${esc(u.email)}" readonly></div>
        <button class="btn btn-lime block" type="submit">${esc(t('save'))}</button>
      </form>
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px"><b>${esc(t('profile.language'))}</b>${langSeg}</div>
      ${menu}
      <button class="btn btn-ghost block" id="out" type="button">${esc(t('profile.logout'))}</button>
      <button class="btn btn-danger block" id="del" type="button">${esc(t('profile.delete'))}</button>
    </div></div>`);
    const pf = q$('#pf');
    bindPhone(pf.phone);
    const d = phoneDigits(u.phone);
    if (d) { pf.phone.value = d.replace(/^(\d{2})(\d{3})(\d{2})(\d{2}).*/, '$1 $2 $3 $4'); }
    pf.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ph = phoneDigits(pf.phone.value);
      if (ph && ph.length !== 9) { showErr(pf, 'phone', t('err.bad_phone')); return; }
      showErr(pf, 'phone', '');
      try {
        S.user = await api('PUT', '/me', { name: pf.name.value, phone: ph ? '+998' + ph : '', lang: S.lang });
        renderHeader(); toast(t('saved'), 'ok');
      } catch (err) { toast(errMsg(err), 'err'); }
    });
    q$('#out').addEventListener('click', async () => {
      try { await api('POST', '/auth/logout'); } catch { /* ignore */ }
      LS.del('token'); S.user = null; renderHeader(); go('/');
    });
    q$('#del').addEventListener('click', () => modal({
      title: t('profile.delete_title'), html: `<p>${esc(t('profile.delete_msg'))}</p>`,
      actions: [{ label: t('cancel') }, {
        label: t('profile.delete'), kind: 'btn-danger',
        onClick: async () => {
          try { await api('DELETE', '/me'); LS.del('token'); S.user = null; renderHeader(); toast(t('profile.deleted'), 'ok'); go('/'); }
          catch (err) { toast(errMsg(err), 'err'); return false; }
        }
      }]
    }));
  }
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => changeLang(b.dataset.lang)));
});

/* ---------- chiptalarni telefon raqami bo'yicha tiklash ---------- */
route(/^\/restore$/, async () => {
  view(`<div class="wrap page"><div class="narrow">
    ${pageHead(t('profile.restore'), '#/profile')}
    <form class="card stack" id="f1" novalidate>
      <p class="muted" style="margin:0">${esc(t('restore.msg'))}</p>
      <div class="field"><label for="ph">${esc(t('profile.phone'))}</label><div class="inpgrp"><span>+998</span><input class="inp" id="ph" name="phone" inputmode="tel" placeholder="90 123 45 67"></div><div class="err" data-err="phone" role="alert"></div></div>
      <button class="btn btn-lime block" type="submit">${esc(t('restore.send'))}</button>
    </form>
    <form class="card stack" id="f2" novalidate hidden>
      <div class="note" id="demoNote" hidden></div>
      <div class="field"><label for="cd">${esc(t('pay.code'))}</label><input class="inp" id="cd" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><div class="err" data-err="code" role="alert"></div></div>
      <button class="btn btn-lime block" type="submit">${esc(t('pay.confirm_btn'))}</button>
    </form>
    <div class="card center stack" id="res" hidden></div>
  </div></div>`);
  const f1 = q$('#f1'), f2 = q$('#f2');
  bindPhone(f1.phone);
  f1.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (phoneDigits(f1.phone.value).length !== 9) { showErr(f1, 'phone', t('err.bad_phone')); return; }
    const b = f1.querySelector('button'); b.disabled = true;
    try {
      const r = await api('POST', '/restore/send', { phone: phoneDigits(f1.phone.value) });
      f1.hidden = true; f2.hidden = false;
      if (r.demoCode) { const n = q$('#demoNote'); n.hidden = false; n.textContent = t('auth.demo_code', { code: r.demoCode }); }
      f2.code.focus();
    } catch (err) { showErr(f1, 'phone', errMsg(err)); b.disabled = false; }
  });
  f2.addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = f2.querySelector('button'); b.disabled = true;
    try {
      const r = await api('POST', '/restore/verify', { phone: phoneDigits(f1.phone.value), code: f2.code.value.trim() });
      f2.hidden = true;
      const box = q$('#res'); box.hidden = false;
      box.innerHTML = r.restored
        ? `<h2 style="font-size:21px">${esc(t('restore.done'))}</h2><p class="muted" style="margin:0">${esc(t('restore.found', { n: r.restored }))}</p><a class="btn btn-lime block" href="#/tickets">${esc(t('done.my'))}</a>`
        : `<h2 style="font-size:21px">${esc(t('restore.none'))}</h2><p class="muted" style="margin:0">${esc(t('restore.none_hint'))}</p><a class="btn block" href="#/restore">${esc(t('retry'))}</a><a class="btn btn-ghost block" href="#/contacts">${esc(t('restore.support'))}</a>`;
    } catch (err) { showErr(f2, 'code', errMsg(err)); b.disabled = false; }
  });
});

/* ---------- bildirishnomalar ---------- */
route(/^\/notifications$/, async () => {
  const list = await api('GET', '/notifications');
  const row = (n) => {
    const parts = n.body.split(' | ');
    if (n.kind === 'returned') {
      return `<div class="notif"><div class="ic ret">${icon.bell}</div><div><b>${esc(t('notif.returned'))}</b><div class="muted">${esc(t('notif.returned_body', { n: parts[0], sum: money(Number(parts[1] || 0)) }))}</div><div class="hint">${esc(fmtDay(n.createdAt))}, ${timeOf(n.createdAt)}</div></div></div>`;
    }
    if (['trip_cancelled', 'trip_rescheduled', 'trip_moved'].includes(n.kind)) {
      const phone = n.body.match(/Aloqa(?:\s+uchun)?\s*:\s*(\+\d[\d\s()-]+)/i);
      const body = phone ? n.body.replace(phone[0], '').trim() : n.body;
      return `<div class="notif"><div class="ic ret">${icon.bell}</div><div><b>${esc(t('notif.' + n.kind))}</b><div class="muted">${esc(body)}</div>
        ${phone ? `<a class="link" href="tel:${esc(phone[1].replace(/[^\d+]/g, ''))}">${esc(t('ticket.contact'))}: ${esc(phone[1].trim())}</a>` : ''}
        <div class="hint">${esc(fmtDay(n.createdAt))}, ${timeOf(n.createdAt)}</div></div></div>`;
    }
    return `<div class="notif"><div class="ic">${icon.bell}</div><div><b>${esc(t('notif.paid'))}</b><div class="muted">${esc(parts.join(' · '))}</div><div class="hint">${esc(fmtDay(n.createdAt))}, ${timeOf(n.createdAt)}</div></div></div>`;
  };
  view(`<div class="wrap page"><div class="narrow" style="max-width:640px">
    ${pageHead(t('profile.notifications'), '')}
    ${list.length ? `<div class="card">${list.map(row).join('')}</div>` : `<div class="empty">${icon.bell}<h3>${esc(t('notif.empty'))}</h3><p>${esc(t('notif.empty_hint'))}</p></div>`}
  </div></div>`);
});

/* ---------- savol-javob, aloqa ---------- */
route(/^\/faq$/, async () => {
  const items = [];
  for (let i = 1; has('faq.' + i + '.q'); i++) {
    items.push(`<details><summary>${esc(t('faq.' + i + '.q'))}</summary><p>${esc(t('faq.' + i + '.a', { min: S.config.returnBeforeMin, fee: S.config.feePercent }))}</p></details>`);
  }
  view(`<div class="wrap page"><div class="narrow" style="max-width:720px">${pageHead(t('nav.faq'), '')}<div class="card acc">${items.join('')}</div></div></div>`);
});

route(/^\/contacts$/, async () => {
  const c = S.config.contact || {};
  const row = (label, val, href) => val ? `<div class="sum-row"><span class="muted">${esc(label)}</span>${href ? `<a class="link" href="${esc(href)}">${esc(val)}</a>` : `<b>${esc(val)}</b>`}</div>` : '';
  const tg = (c.telegram || '').replace(/^@/, '');
  view(`<div class="wrap page"><div class="narrow" style="max-width:560px">${pageHead(t('nav.contacts'), '')}
    <div class="card">
      <p class="muted" style="margin-top:0">${esc(t('contacts.msg', { hours: c.hours }))}</p>
      ${row(t('profile.phone'), c.phone, 'tel:' + String(c.phone || '').replace(/[^\d+]/g, ''))}
      ${row('Telegram', c.telegram, tg ? 'https://t.me/' + tg : '')}
      ${row(t('auth.email'), c.email, c.email ? 'mailto:' + c.email : '')}
      ${row(t('contacts.address'), c.address, '')}
      ${row(t('contacts.hours'), c.hours, '')}
    </div></div></div>`);
});

export { changeLang };
