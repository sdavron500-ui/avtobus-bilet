// Chipta xarid qilish oqimi: bosh sahifa, qidiruv, o'rinlar, yo'lovchilar, to'lov, chipta
import {
  S, SS, LS, esc, t, api, errMsg, toast, modal, route, view, go, cityName, money, timeOf, dateOf, fmtDay,
  fmtWeekday, fmtDur, todayLocal, addDays, countdown, icon, pageHead, bindPhone, phoneDigits, phoneShow, showErr
} from './core.js';

const NAME_RE = /^[\p{L}][\p{L}\s'’`.-]{1,59}$/u;
const routeName = (trip) => `${esc(cityName(trip.from))} → ${esc(cityName(trip.to))}`;
const q$ = (sel, root = document) => root.querySelector(sel);

/* ================= Bosh sahifa ================= */
function cityOptions(scope, selected) {
  const list = scope === 'local' ? S.cities.filter((c) => c.country === 'UZ') : S.cities;
  return list.map((c) => `<option value="${c.id}"${c.id === selected ? ' selected' : ''}>${esc(cityName(c))}</option>`).join('');
}
const findCity = (uz) => (S.cities.find((c) => c.uz === uz) || {}).id;

route(/^\/$/, async () => {
  const popular = await api('GET', '/popular');
  let scope = SS.get('scope') || 'local';
  const last = SS.get('last') || {};
  const today = todayLocal();
  let from = last.from || findCity('Toshkent');
  let to = last.to || findCity('Samarqand');

  view(`
  <section class="hero"><div class="wrap">
    <h1>${esc(t('home.title'))}</h1>
    <p>${esc(t('home.sub'))}</p>
  </div></section>
  <div class="wrap">
    <form class="sbox" id="sf" novalidate>
      <div class="seg" role="group" aria-label="${esc(t('home.scope'))}">
        <button type="button" data-scope="local" aria-pressed="${scope === 'local'}">${esc(t('home.local'))}</button>
        <button type="button" data-scope="foreign" aria-pressed="${scope === 'foreign'}">${esc(t('home.foreign'))}</button>
      </div>
      <div class="srow">
        <div class="field"><label for="from">${esc(t('home.from'))}</label><select class="inp" id="from" name="from"></select></div>
        <button type="button" class="swap" id="swap" aria-label="${esc(t('home.swap'))}">${icon.swap}</button>
        <div class="field"><label for="to">${esc(t('home.to'))}</label><select class="inp" id="to" name="to"></select></div>
        <div class="field"><label for="date">${esc(t('home.date'))}</label><input class="inp" type="date" id="date" name="date" min="${today}" value="${today}"></div>
        <button class="btn btn-lime" type="submit">${esc(t('home.search'))}</button>
      </div>
      <div class="all-trips-entry">
        <span>${esc(t('all_trips.teaser'))}</span>
        <a class="btn btn-ghost sm" href="#/all-trips">${esc(t('all_trips.title'))}</a>
      </div>
      <div class="err" id="sferr" role="alert"></div>
    </form>

    <section class="sec">
      <div class="sec-h"><h2>${esc(t('home.popular'))}</h2></div>
      ${popular.length ? `<div class="pop">${popular.slice(0, 8).map((p) => `
        <a class="pcard" href="#/search?from=${p.from.id}&to=${p.to.id}&date=${dateOf(p.departAt)}&scope=${p.foreign ? 'foreign' : 'local'}">
          <div class="r">${esc(cityName(p.from))} <span>→</span> ${esc(cityName(p.to))}</div>
          <div class="m"><span>${esc(fmtDay(p.departAt))}, ${timeOf(p.departAt)}</span><span>${esc(fmtDur(p.duration))}</span></div>
          <div class="m"><span>${esc(t('home.left', { n: p.free }))}</span></div>
          <div class="p">${esc(t('from_price', { p: money(p.price) }))}</div>
        </a>`).join('')}</div>` : `<div class="empty"><h3>${esc(t('home.no_trips'))}</h3></div>`}
    </section>

    <section class="sec feat">
      <div><b>${esc(t('feat.1.t'))}</b><span class="muted">${esc(t('feat.1.d'))}</span></div>
      <div><b>${esc(t('feat.2.t'))}</b><span class="muted">${esc(t('feat.2.d'))}</span></div>
      <div><b>${esc(t('feat.3.t'))}</b><span class="muted">${esc(t('feat.3.d'))}</span></div>
      <div><b>${esc(t('feat.4.t'))}</b><span class="muted">${esc(t('feat.4.d'))}</span></div>
    </section>
  </div>`);

  const f = q$('#sf'), selFrom = q$('#from'), selTo = q$('#to'), dateEl = q$('#date');
  const fill = () => {
    const available = scope === 'local' ? S.cities.filter((c) => c.country === 'UZ') : S.cities;
    if (!available.some((c) => c.id === from)) {
      from = (available.find((c) => c.uz === 'Toshkent') || available[0] || {}).id;
    }
    if (!available.some((c) => c.id === to) || to === from) {
      const preferredTo = scope === 'foreign'
        ? available.find((c) => c.country !== 'UZ' && c.id !== from)
        : available.find((c) => c.uz === 'Samarqand' && c.id !== from);
      to = preferredTo?.id ?? available.find((c) => c.id !== from)?.id;
    }
    selFrom.innerHTML = cityOptions(scope, from);
    selTo.innerHTML = cityOptions(scope, to);
    if (from !== undefined) selFrom.value = String(from);
    if (to !== undefined) selTo.value = String(to);
  };
  fill();
  selFrom.addEventListener('change', () => { from = +selFrom.value; });
  selTo.addEventListener('change', () => { to = +selTo.value; });
  f.addEventListener('click', (e) => {
    const sc = e.target.closest('[data-scope]');
    if (sc) {
      scope = sc.dataset.scope; SS.set('scope', scope);
      f.querySelectorAll('[data-scope]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scope === scope)));
      if (scope === 'foreign') { to = (S.cities.find((c) => c.country !== 'UZ') || {}).id; }
      fill();
    }
    const ch = e.target.closest('[data-d]');
    if (ch) dateEl.value = addDays(today, +ch.dataset.d);
    if (e.target.closest('#swap')) { [from, to] = [to, from]; fill(); }
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    from = Number(selFrom.value);
    to = Number(selTo.value);
    if (from === to) { q$('#sferr').textContent = t('err.same_city'); return; }
    if (!S.cities.some((c) => c.id === from) || !S.cities.some((c) => c.id === to)) {
      q$('#sferr').textContent = t('err.server_error');
      return;
    }
    const date = dateEl.value || today;
    if (date < today) { q$('#sferr').textContent = t('err.past_date'); return; }
    SS.set('last', { from, to });
    go(`/search?from=${from}&to=${to}&date=${date}&scope=${scope}`);
  });
});

/* ================= Qidiruv natijalari ================= */
route(/^\/search$/, async (_, qs) => {
  const today = todayLocal();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(qs.date || '') ? qs.date : today;
  const params = new URLSearchParams();
  if (qs.from) params.set('from', qs.from);
  if (qs.to) params.set('to', qs.to);
  params.set('date', date);
  if (qs.scope) params.set('scope', qs.scope);
  const trips = await api('GET', '/trips?' + params);
  const fromC = S.cities.find((c) => c.id === +qs.from), toC = S.cities.find((c) => c.id === +qs.to);
  const title = fromC && toC ? `${cityName(fromC)} → ${cityName(toC)}` : `${t('search.title')} · ${fmtDay(date)}`;
  const mkUrl = (d) => `#/search?from=${qs.from || ''}&to=${qs.to || ''}&date=${d}&scope=${qs.scope || 'local'}`;
  const days = Array.from({ length: 10 }, (_, i) => addDays(today, i));
  if (!days.includes(date)) days.unshift(date);
  let sort = 'time';

  view(`<div class="wrap page">
    ${pageHead(title, '#/')}
    <div class="days" role="group" aria-label="${esc(t('home.date'))}">
      ${days.map((d) => `<a class="day" href="${mkUrl(d)}" aria-pressed="${d === date}" style="text-decoration:none"><small>${esc(fmtWeekday(d))}</small><b>${esc(fmtDay(d, { month: 'short' }))}</b></a>`).join('')}
    </div>
    ${trips.length ? `<div class="seg" role="group" aria-label="${esc(t('search.sort'))}" style="margin-bottom:14px">
      <button type="button" data-sort="time" aria-pressed="true">${esc(t('search.by_time'))}</button>
      <button type="button" data-sort="price" aria-pressed="false">${esc(t('search.by_price'))}</button>
      <button type="button" data-sort="free" aria-pressed="false">${esc(t('search.by_free'))}</button>
    </div>` : ''}
    <div class="stack" id="list"></div>
  </div>`);

  const list = q$('#list');
  const draw = () => {
    if (!trips.length) {
      list.innerHTML = `<div class="empty">${icon.bus}<h3>${esc(t('search.none'))}</h3><p>${esc(t('search.none_hint'))}</p>
        <a class="btn" href="${mkUrl(addDays(date, 1))}">${esc(t('search.next_day'))}</a></div>`;
      return;
    }
    const arr = [...trips].sort((a, b) => sort === 'price' ? a.price - b.price : sort === 'free' ? b.free - a.free : a.departAt.localeCompare(b.departAt));
    list.innerHTML = arr.map((p) => {
      const cls = p.free === 0 ? 'no' : p.free <= 5 ? 'low' : 'ok';
      return `<article class="trip">
        <div>
          <div class="tl"><span class="t">${timeOf(p.departAt)}</span><span class="line">${esc(fmtDur(p.duration))}<i></i></span><span class="t">${timeOf(p.arriveAt)}</span></div>
          <div class="meta">${esc(fmtDay(p.departAt))}${dateOf(p.arriveAt) !== dateOf(p.departAt) ? ' → ' + esc(fmtDay(p.arriveAt)) : ''}</div>
        </div>
        <div>
          <div class="rt">${routeName(p)}</div>
          <div class="meta">${esc(p.bus.model || p.bus.name)}${p.platform ? ' · ' + esc(t('platform')) + ' ' + esc(p.platform) : ''}</div>
          ${p.bus.amenities.length ? `<div class="tags" style="margin-top:6px">${p.bus.amenities.map((a) => `<span class="pill">${esc(a)}</span>`).join('')}</div>` : ''}
        </div>
        <div><span class="pill ${cls}">${esc(p.free ? t('home.left', { n: p.free }) : t('search.sold_out'))}</span>
          <div class="meta" style="margin-top:6px">${esc(t('seats_total', { n: p.total }))}</div></div>
        <div class="go" style="text-align:right"><div class="price">${esc(money(p.price))}</div>
          <a class="btn btn-lime sm" ${p.free ? `href="#/trip/${p.id}"` : 'aria-disabled="true"'} style="margin-top:8px">${esc(t('search.choose'))}</a></div>
      </article>`;
    }).join('');
  };
  draw();
  q$('.seg') && q$('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sort]');
    if (!b) return;
    sort = b.dataset.sort;
    document.querySelectorAll('[data-sort]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  });
});

/* ================= Barcha reyslar tablosi ================= */
route(/^\/all-trips$/, async (_, qs, isCurrent) => {
  const savedScope = SS.get('scope') || 'local';
  const scope = ['local', 'foreign'].includes(qs.scope) ? qs.scope
    : ['local', 'foreign'].includes(savedScope) ? savedScope : 'local';
  const trips = [];
  let offset = 0;
  let page;
  do {
    page = await api('GET', `/trips?scope=${scope}&offset=${offset}`);
    trips.push(...page);
    offset += page.length;
    if (!isCurrent()) return;
  } while (page.length === 100);

  const months = new Map();
  for (const trip of trips) {
    const date = dateOf(trip.departAt);
    const month = date.slice(0, 7);
    if (!months.has(month)) months.set(month, new Map());
    const days = months.get(month);
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(trip);
  }

  const renderTrip = (trip) => `<tr>
    <td><b>${timeOf(trip.departAt)}</b><small>${esc(t('all_trips.arrival'))}: ${timeOf(trip.arriveAt)}</small></td>
    <td><strong>${routeName(trip)}</strong></td>
    <td>${esc(trip.bus.model || trip.bus.name)}</td>
    <td>${trip.free} / ${trip.total}</td>
    <td><b>${esc(money(trip.price))}</b></td>
    <td><a class="btn btn-lime sm" ${trip.free ? `href="#/trip/${trip.id}"` : 'aria-disabled="true"'}>${esc(t('search.choose'))}</a></td>
  </tr>`;

  view(`<div class="wrap page">
    ${pageHead(t('all_trips.title'), '#/')}
    <div class="all-trips-head">
      <p class="muted">${esc(t('all_trips.teaser'))}</p>
      <div class="seg" role="group" aria-label="${esc(t('home.scope'))}">
        <a class="all-trips-scope" href="#/all-trips?scope=local" aria-current="${scope === 'local' ? 'page' : 'false'}">${esc(t('home.local'))}</a>
        <a class="all-trips-scope" href="#/all-trips?scope=foreign" aria-current="${scope === 'foreign' ? 'page' : 'false'}">${esc(t('home.foreign'))}</a>
      </div>
    </div>
    ${trips.length ? `<p class="all-trips-total">${esc(t('all_trips.total', { n: trips.length }))}</p>
      ${[...months].map(([month, days]) => {
        const monthCount = [...days.values()].reduce((count, dayTrips) => count + dayTrips.length, 0);
        const monthName = t('mon.' + Number(month.slice(5)));
        return `<section class="board-month">
          <h2>${esc(t('all_trips.month', { month: monthName, year: month.slice(0, 4) }))}<span>${esc(t('all_trips.count', { n: monthCount }))}</span></h2>
          ${[...days].map(([date, dayTrips]) => `<section class="board-day" aria-labelledby="day-${date}">
            <h3 id="day-${date}">${esc(fmtWeekday(date + ' 00:00'))}, ${esc(fmtDay(date + ' 00:00'))}<span>${esc(t('all_trips.count', { n: dayTrips.length }))}</span></h3>
            <div class="board-scroll"><table class="board-table">
              <thead><tr><th>${esc(t('all_trips.departure'))}</th><th>${esc(t('all_trips.route'))}</th><th>${esc(t('all_trips.bus'))}</th><th>${esc(t('all_trips.seats'))}</th><th>${esc(t('all_trips.price'))}</th><th></th></tr></thead>
              <tbody>${dayTrips.map(renderTrip).join('')}</tbody>
            </table></div>
          </section>`).join('')}
        </section>`;
      }).join('')}` : `<div class="empty"><h3>${esc(t('all_trips.none'))}</h3><p>${esc(t('all_trips.none_hint'))}</p></div>`}
  </div>`);
  SS.set('scope', scope);
});

/* ================= O'rin tanlash ================= */
function seatMapHtml(seats, selected) {
  const rows = {};
  seats.forEach((s) => { (rows[s.row] = rows[s.row] || []).push(s); });
  const btn = (s) => {
    if (!s) return '<span style="width:50px"></span>';
    const sel = selected.includes(s.no);
    let cls = '', dis = false, label = t('seat.free'), mark = '';
    if (s.status === 'taken') {
      cls = s.gender === 'f' ? 'tf' : 'tm'; dis = true;
      label = s.gender === 'f' ? t('seat.female') : t('seat.male');
      mark = `<sup aria-hidden="true">${s.gender === 'f' ? '♀' : '♂'}</sup>`;
    } else if (s.status !== 'free') { cls = 'off'; dis = true; label = t('seat.busy'); }
    if (sel) { cls = 'sel'; label = t('seat.selected'); }
    return `<button type="button" class="seat ${cls}" data-no="${s.no}" ${dis ? 'disabled' : ''} aria-pressed="${sel}" aria-label="${esc(t('seat.n', { n: s.no }))}: ${esc(label)}">${s.no}${mark}</button>`;
  };
  return Object.keys(rows).map((r) => {
    const x = rows[r];
    return `<div class="brow"><div class="pair">${btn(x[0])}${btn(x[1])}</div><div class="pair">${btn(x[2])}${btn(x[3])}</div></div>`;
  }).join('');
}

route(/^\/trip\/(\d+)$/, async ([id]) => {
  const saved = SS.get('hold:' + id);
  const { trip, seats } = await api('GET', `/trips/${id}?hold=${saved ? saved.token : ''}`);
  const max = S.config.maxSeats || 5;
  let selected = ((saved && saved.seats) || []).filter((n) => seats[n - 1] && seats[n - 1].status === 'free');

  view(`<div class="wrap page">
    ${pageHead(t('seat.title'), '#/search?from=' + trip.from.id + '&to=' + trip.to.id + '&date=' + dateOf(trip.departAt) + '&scope=' + (trip.foreign ? 'foreign' : 'local'))}
    <div class="two">
      <div class="card busbox">
        <div class="legend" aria-hidden="true">
          <span><i style="background:#fff;border-color:var(--ok)"></i>${esc(t('seat.free'))}</span>
          <span><i style="background:var(--lime);border-color:var(--brand)"></i>${esc(t('seat.selected'))}</span>
          <span><i style="background:var(--male);border-color:var(--male-b)"></i>${esc(t('seat.male'))}</span>
          <span><i style="background:var(--fem);border-color:var(--fem-b)"></i>${esc(t('seat.female'))}</span>
          <span><i style="background:#E2E6E4;border-color:#C3CCC7"></i>${esc(t('seat.busy'))}</span>
        </div>
        <div class="bus"><div class="bus-f"><span>${esc(t('seat.door'))}</span><span class="wheel" aria-hidden="true">${icon.wheel}</span></div><div id="map" style="display:flex;flex-direction:column;gap:10px"></div></div>
      </div>
      <aside class="card sticky" aria-live="polite">
        <div class="stack">
          <div><div class="lbl">${esc(t('trip'))}</div><div style="font-weight:800;font-size:19px">${routeName(trip)}</div></div>
          <div class="sum-row"><span class="muted">${esc(t('departure'))}</span><b>${esc(fmtDay(trip.departAt))}, ${timeOf(trip.departAt)}</b></div>
          <div class="sum-row"><span class="muted">${esc(t('arrival'))}</span><b>${esc(fmtDay(trip.arriveAt))}, ${timeOf(trip.arriveAt)}</b></div>
          ${trip.platform ? `<div class="sum-row"><span class="muted">${esc(t('platform'))}</span><b>${esc(trip.platform)}</b></div>` : ''}
          <div class="sum-row"><span class="muted">${esc(t('bus'))}</span><b>${esc(trip.bus.model || trip.bus.name)}</b></div>
          <div class="sum-row"><span class="muted">${esc(t('price_per_seat'))}</span><b>${esc(money(trip.price))}</b></div>
          <div><div class="lbl">${esc(t('seat.you_selected'))}</div><div class="tags" id="chosen" style="margin-top:6px"></div></div>
          <div class="sum-row"><span>${esc(t('total'))}</span><span class="sum-total" id="total"></span></div>
          <button class="btn btn-lime block" id="go" type="button">${esc(t('continue'))}</button>
          <div class="hint">${esc(t('seat.max', { n: max }))} ${esc(t('seat.hold_note', { min: S.config.holdMinutes || 10 }))}</div>
        </div>
      </aside>
    </div>
  </div>`);

  const map = q$('#map');
  const update = () => {
    map.innerHTML = seatMapHtml(seats, selected);
    q$('#chosen').innerHTML = selected.length ? selected.map((n) => `<span class="tag">${n}</span>`).join('') : `<span class="muted">${esc(t('seat.none'))}</span>`;
    q$('#total').textContent = money(selected.length * trip.price);
    q$('#go').disabled = !selected.length;
  };
  update();
  map.addEventListener('click', (e) => {
    const b = e.target.closest('[data-no]');
    if (!b) return;
    const n = +b.dataset.no;
    if (selected.includes(n)) selected = selected.filter((x) => x !== n);
    else if (selected.length >= max) { toast(t('seat.max', { n: max }), 'err'); return; }
    else selected = [...selected, n].sort((a, b2) => a - b2);
    update();
    const nb = q$(`[data-no="${n}"]`); if (nb) nb.focus();
  });
  q$('#go').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const h = await api('POST', '/holds', { tripId: trip.id, seats: selected, holdToken: saved ? saved.token : undefined });
      SS.set('hold:' + id, { token: h.holdToken, seats: h.seats, expiresAt: h.expiresAt });
      go('/checkout/' + id);
    } catch (err) {
      toast(errMsg(err), 'err');
      if (err.code === 'seat_taken') go('/trip/' + id);
      else e.target.disabled = false;
    }
  });
});

/* ================= Yo'lovchilar ma'lumoti ================= */
route(/^\/checkout\/(\d+)$/, async ([id]) => {
  const hold = SS.get('hold:' + id);
  if (!hold || hold.expiresAt < Date.now()) { toast(t('err.hold_expired'), 'err'); go('/trip/' + id); return; }
  const { trip } = await api('GET', `/trips/${id}?hold=${hold.token}`);
  const today = todayLocal();
  const u = S.user;
  const phoneInit = phoneDigits((u && u.phone) || LS.get('phone', ''));

  const pBlock = (seat, i) => `
    <div class="card pass" data-seat="${seat}">
      <h3>${esc(t('co.passenger', { n: i + 1 }))} <span class="tag">${esc(t('seat.n', { n: seat }))}</span></h3>
      <div class="field"><label for="fio${i}">${esc(t('co.fio'))}</label>
        <input class="inp" id="fio${i}" name="fio${i}" autocomplete="${i === 0 ? 'name' : 'off'}" value="${i === 0 && u ? esc(u.name) : ''}" placeholder="${esc(t('co.fio_ph'))}">
        <div class="hint">${esc(t('co.fio_hint'))}</div><div class="err" data-err="fio${i}" role="alert"></div></div>
      <div class="field"><span class="lbl" id="gl${i}">${esc(t('co.gender'))}</span>
        <div class="radio" role="radiogroup" aria-labelledby="gl${i}">
          <label><input type="radio" name="g${i}" value="m"><span>♂ ${esc(t('co.male'))}</span></label>
          <label><input type="radio" name="g${i}" value="f"><span>♀ ${esc(t('co.female'))}</span></label>
        </div><div class="err" data-err="g${i}" role="alert"></div></div>
      ${trip.foreign ? `<div class="grid2">
        <div class="field"><label for="pp${i}">${esc(t('co.passport'))}</label><input class="inp" id="pp${i}" name="pp${i}" placeholder="AA1234567" maxlength="9" autocapitalize="characters"><div class="err" data-err="pp${i}" role="alert"></div></div>
        <div class="field"><label for="bd${i}">${esc(t('co.birth'))}</label><input class="inp" type="date" id="bd${i}" name="bd${i}" max="${today}"><div class="err" data-err="bd${i}" role="alert"></div></div>
      </div>` : ''}
    </div>`;

  view(`<div class="wrap page">
    ${pageHead(t('co.title'), '#/trip/' + id)}
    <form class="two" id="cf" novalidate>
      <div class="stack">
        ${hold.seats.map(pBlock).join('')}
        <div class="card stack">
          <div class="field"><label for="phone">${esc(t('co.phone'))}</label>
            <div class="inpgrp"><span>+998</span><input class="inp" id="phone" name="phone" inputmode="tel" autocomplete="tel-national" placeholder="90 123 45 67" value="${esc(phoneInit.replace(/^(\d{2})(\d{3})(\d{2})(\d{2}).*/, '$1 $2 $3 $4'))}"></div>
            <div class="hint">${esc(t('co.phone_hint'))}</div><div class="err" data-err="phone" role="alert"></div></div>
          <div class="note warn"><b>${esc(t('attention'))}</b> ${esc(t('co.warning'))}</div>
          <label class="check"><input type="checkbox" name="agree"><span>${esc(t('co.agree'))}</span></label>
          <div class="err" data-err="agree" role="alert"></div>
        </div>
      </div>
      <aside class="card sticky"><div class="stack">
        <div class="timer" aria-live="off">${esc(t('co.time_left'))}: <span id="cd"></span></div>
        <div><div class="lbl">${esc(t('trip'))}</div><div style="font-weight:800;font-size:19px">${routeName(trip)}</div></div>
        <div class="sum-row"><span class="muted">${esc(t('departure'))}</span><b>${esc(fmtDay(trip.departAt))}, ${timeOf(trip.departAt)}</b></div>
        <div class="sum-row"><span class="muted">${esc(t('seats'))}</span><b>${hold.seats.join(', ')}</b></div>
        <div class="sum-row"><span class="muted">${esc(t('total'))}</span><span class="sum-total">${esc(money(trip.price * hold.seats.length))}</span></div>
        <div class="hint">${esc(t('co.fee_note', { p: S.config.feePercent }))}</div>
        <button class="btn btn-lime block" type="submit">${esc(t('co.to_payment'))}</button>
      </div></aside>
    </form>
  </div>`);

  const f = q$('#cf');
  bindPhone(q$('#phone'));
  countdown(q$('#cd'), hold.expiresAt, () => { toast(t('err.hold_expired'), 'err'); go('/trip/' + id); });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    let ok = true;
    const passengers = [];
    hold.seats.forEach((seat, i) => {
      const fio = f['fio' + i].value.trim().replace(/\s+/g, ' ');
      const g = f.querySelector(`[name="g${i}"]:checked`);
      const bad = (name, msg) => { showErr(f, name, msg); if (msg) ok = false; };
      bad('fio' + i, NAME_RE.test(fio) ? '' : t('err.bad_fio'));
      bad('g' + i, g ? '' : t('err.bad_gender'));
      const p = { seat, fio, gender: g ? g.value : '' };
      if (trip.foreign) {
        const pp = f['pp' + i].value.trim().toUpperCase();
        const bd = f['bd' + i].value;
        bad('pp' + i, /^[A-Z]{2}\d{7}$/.test(pp) ? '' : t('err.bad_passport'));
        bad('bd' + i, bd && bd <= today ? '' : t('err.bad_birth'));
        p.passport = pp; p.birth = bd;
      }
      passengers.push(p);
    });
    const phone = phoneDigits(f.phone.value);
    showErr(f, 'phone', phone.length === 9 ? '' : t('err.bad_phone')); if (phone.length !== 9) ok = false;
    showErr(f, 'agree', f.agree.checked ? '' : t('err.need_agree')); if (!f.agree.checked) ok = false;
    if (!ok) { const first = f.querySelector('.bad, [data-err]:not(:empty)'); if (first && first.scrollIntoView) first.scrollIntoView({ block: 'center' }); return; }
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      const order = await api('POST', '/orders', { tripId: trip.id, holdToken: hold.token, phone, passengers });
      LS.set('phone', phone);
      SS.del('hold:' + id);
      go('/pay/' + order.id);
    } catch (err) {
      toast(errMsg(err), 'err');
      btn.disabled = false;
      if (err.code === 'hold_expired' || err.code === 'seat_taken') go('/trip/' + id);
    }
  });
});

/* ================= To'lov ================= */
route(/^\/pay\/([a-f0-9]+)$/, async ([id]) => {
  const order = await api('GET', '/orders/' + id);
  if (order.status === 'paid') { go('/done/' + id); return; }
  if (order.status !== 'pending') {
    view(`<div class="wrap page"><div class="empty">${icon.bus}<h3>${esc(t('pay.expired'))}</h3><p>${esc(t('err.hold_expired'))}</p><a class="btn" href="#/trip/${order.trip.id}">${esc(t('pay.choose_again'))}</a></div></div>`);
    return;
  }
  const trip = order.trip;
  let method = order.paymentMethod === 'cash' ? 'cash' : 'card';
  view(`<div class="wrap page">
    ${pageHead(t('pay.title'), '')}
    <div class="two">
      <div class="card stack" id="payBox">
        ${S.config.demo ? `<div class="demo" id="cardDemo" ${method === 'cash' ? 'hidden' : ''}>${esc(t('pay.demo'))}</div>` : ''}
        <div>
          <div class="lbl">${esc(t('pay.method'))}</div>
          <div class="seg" id="paymentMethods" role="group" aria-label="${esc(t('pay.method'))}" ${order.paymentStarted ? 'hidden' : ''}>
            <button type="button" data-method="card" aria-pressed="${method === 'card'}">${esc(t('pay.card_method'))}</button>
            <button type="button" data-method="cash" aria-pressed="${method === 'cash'}">${esc(t('pay.cash_method'))}</button>
          </div>
        </div>
        <form class="stack" id="cardForm" novalidate ${method === 'cash' || order.paymentStarted ? 'hidden' : ''}>
          <h2 style="font-size:20px">${esc(t('pay.card'))}</h2>
          <div class="field"><label for="cn">${esc(t('pay.card_number'))}</label>
            <input class="inp" id="cn" name="number" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19">
            <div class="err" data-err="number" role="alert"></div></div>
          <div class="field" style="max-width:200px"><label for="ce">${esc(t('pay.expiry'))}</label>
            <input class="inp" id="ce" name="expiry" inputmode="numeric" autocomplete="cc-exp" placeholder="${esc(t('pay.expiry_ph'))}" maxlength="5">
            <div class="err" data-err="expiry" role="alert"></div></div>
          <button class="btn btn-lime block" type="submit">${esc(t('pay.pay'))} ${esc(money(order.total))}</button>
        </form>
        <form class="stack" id="smsForm" novalidate ${order.paymentStarted ? '' : 'hidden'}>
          <h2 style="font-size:20px">${esc(t('pay.confirm'))}</h2>
          <p class="muted" style="margin:0">${esc(t('pay.sms_sent', { phone: phoneShow(order.phone) }))}</p>
          ${S.config.demo ? `<div class="demo">${esc(t('pay.demo_code'))}</div>` : ''}
          <div class="field"><label for="sc">${esc(t('pay.code'))}</label>
            <input class="inp" id="sc" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">
            <div class="err" data-err="code" role="alert"></div></div>
          <button class="btn btn-lime block" type="submit">${esc(t('pay.confirm_btn'))}</button>
        </form>
        <div class="stack" id="cashBox" ${method === 'cash' ? '' : 'hidden'}>
          <h2 style="font-size:20px">${esc(t('pay.cash_title'))}</h2>
          <p class="muted" style="margin:0">${esc(t('pay.cash_hint'))}</p>
          ${method === 'cash' ? `<div class="note warn"><b>${esc(t('pay.cash_pending'))}</b>
            <div>${esc(t('pay.cash_order', { id: order.id }))}</div>
            <div>${esc(t('pay.cash_seats', { seats: order.tickets.map((ticket) => ticket.seat).join(', ') }))}</div>
            <div>${esc(t('pay.cash_amount', { amount: money(order.total) }))}</div>
          </div>` : ''}
          ${method === 'cash' ? `<p class="hint" style="margin:0">${esc(t('pay.cash_expiry', { min: S.config.holdMinutes || 10 }))}</p>` : ''}
          ${method !== 'cash' ? `<button class="btn btn-lime block" id="chooseCash" type="button">${esc(t('pay.cash_choose'))}</button>` : ''}
        </div>
      </div>
      <aside class="card sticky"><div class="stack">
        <div class="timer">${esc(t('co.time_left'))}: <span id="cd"></span></div>
        <div><div class="lbl">${esc(t('trip'))}</div><div style="font-weight:800;font-size:19px">${routeName(trip)}</div></div>
        <div class="sum-row"><span class="muted">${esc(t('departure'))}</span><b>${esc(fmtDay(trip.departAt))}, ${timeOf(trip.departAt)}</b></div>
        <div class="sum-row"><span class="muted">${esc(t('co.passengers'))}</span><b>${order.tickets.map((x) => esc(x.fio) + ' (' + x.seat + ')').join(', ')}</b></div>
        <div class="sum-row"><span class="muted">${esc(t('pay.tickets'))}</span><b>${esc(money(order.amount))}</b></div>
        <div class="sum-row"><span class="muted">${esc(t('pay.fee'))}</span><b>${esc(money(order.fee))}</b></div>
        <div class="sum-row"><span>${esc(t('pay.total'))}</span><span class="sum-total">${esc(money(order.total))}</span></div>
      </div></aside>
    </div>
  </div>`);

  countdown(q$('#cd'), order.expiresAt, () => { toast(t('err.hold_expired'), 'err'); go('/trip/' + trip.id); });
  const cf = q$('#cardForm'), sf = q$('#smsForm');
  const cashBox = q$('#cashBox');
  q$('#paymentMethods').addEventListener('click', (e) => {
    const b = e.target.closest('[data-method]');
    if (!b) return;
    method = b.dataset.method;
    q$('#paymentMethods').querySelectorAll('[data-method]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button === b));
    });
    cf.hidden = method !== 'card';
    cashBox.hidden = method !== 'cash';
    const demoNotice = q$('#cardDemo');
    if (demoNotice) demoNotice.hidden = method !== 'card';
  });
  const cashButton = q$('#chooseCash');
  if (cashButton) cashButton.addEventListener('click', async () => {
    cashButton.disabled = true;
    try {
      await api('POST', `/orders/${id}/cash`);
      go('/pay/' + id);
    } catch (err) {
      toast(errMsg(err), 'err');
      cashButton.disabled = false;
    }
  });
  cf.number.addEventListener('input', () => { cf.number.value = cf.number.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); });
  cf.expiry.addEventListener('input', (e) => {
    let d = cf.expiry.value.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
    else if (d.length === 2 && e.inputType !== 'deleteContentBackward') d += '/';
    cf.expiry.value = d;
  });
  cf.addEventListener('submit', async (e) => {
    e.preventDefault();
    showErr(cf, 'number', ''); showErr(cf, 'expiry', '');
    const btn = cf.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await api('POST', `/orders/${id}/pay`, { number: cf.number.value, expiry: cf.expiry.value });
      q$('#paymentMethods').hidden = true;
      cf.hidden = true; sf.hidden = false; sf.code.focus();
    } catch (err) {
      const field = err.code === 'bad_expiry' ? 'expiry' : 'number';
      if (err.code === 'bad_card' || err.code === 'bad_expiry') showErr(cf, field, errMsg(err));
      else toast(errMsg(err), 'err');
      btn.disabled = false;
    }
  });
  sf.addEventListener('submit', async (e) => {
    e.preventDefault();
    showErr(sf, 'code', '');
    const btn = sf.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await api('POST', `/orders/${id}/confirm`, { code: sf.code.value.trim() });
      go('/done/' + id);
    } catch (err) {
      showErr(sf, 'code', errMsg(err));
      btn.disabled = false;
    }
  });
});

/* ================= Muvaffaqiyat ================= */
route(/^\/done\/([a-f0-9]+)$/, async ([id]) => {
  const o = await api('GET', '/orders/' + id);
  if (o.status !== 'paid' && o.status !== 'returned') { go('/pay/' + id); return; }
  view(`<div class="wrap page"><div class="narrow stack">
    <div class="card center">
      <div class="ok-mark">${icon.check}</div>
      <h1 style="font-size:26px">${esc(t('done.title'))}</h1>
      <p class="muted">${esc(t('done.sub'))}</p>
      <div class="sum-row"><span class="muted">${esc(t('trip'))}</span><b>${routeName(o.trip)}</b></div>
      <div class="sum-row"><span class="muted">${esc(t('departure'))}</span><b>${esc(fmtDay(o.trip.departAt))}, ${timeOf(o.trip.departAt)}</b></div>
      <div class="sum-row"><span class="muted">${esc(t('done.paid'))}</span><b>${esc(money(o.total))}</b></div>
    </div>
    ${o.tickets.map((k) => `<a class="tcard" href="#/ticket/${k.id}"><div><div class="rt">${esc(k.fio)}</div><div class="meta">${esc(t('seat.n', { n: k.seat }))} · № ${esc(k.number)}</div></div>${icon.chev}</a>`).join('')}
    <a class="btn block" href="#/tickets">${esc(t('done.my'))}</a>
    <a class="btn btn-ghost block" href="#/">${esc(t('to_home'))}</a>
  </div></div>`);
});

/* ================= Chipta ================= */
function ticketCard(k) {
  const past = k.status === 'active' && k.departAt <= new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 16);
  const st = k.status === 'cancelled' ? 'cancelled' : k.status === 'returned' ? 'returned' : past ? 'past' : 'active';
  const phone = String(k.contactPhone || '').replace(/[^\d+]/g, '');
  return `<article class="tk" aria-label="${esc(t('ticket.title'))}">
    <div class="tk-main">
      <span class="tk-st ${st}">${esc(t('ticket.st.' + st))}</span>
      ${k.noticeReason ? `<div class="note${k.status === 'cancelled' ? ' warn' : ''}" style="margin:10px 0">
        <b>${esc(t(k.status === 'cancelled' ? 'ticket.cancelled_notice' : 'ticket.changed_notice'))}</b>
        <div>${esc(k.noticeReason)}</div>
        ${k.contactPhone ? `<a class="link" href="tel:${esc(phone)}">${esc(t('ticket.contact'))}: ${esc(k.contactPhone)}</a>` : ''}
      </div>` : ''}
      <div class="rt">${esc(cityName(k.from))} → ${esc(cityName(k.to))}</div>
      <div class="tk-grid">
        <div><span>${esc(t('departure'))}</span><b>${esc(fmtDay(k.departAt))}, ${timeOf(k.departAt)}</b></div>
        <div><span>${esc(t('arrival'))}</span><b>${esc(fmtDay(k.arriveAt))}, ${timeOf(k.arriveAt)}</b></div>
        <div><span>${esc(t('platform'))}</span><b>${esc(k.platform || '—')}</b></div>
        <div><span>${esc(t('ticket.passenger'))}</span><b>${esc(k.fio)}</b></div>
        <div><span>${esc(t('ticket.seat'))}</span><b>${k.seat}</b></div>
        <div><span>${esc(t('ticket.number'))}</span><b>${esc(k.number)}</b></div>
        <div><span>${esc(t('bus'))}</span><b>${esc(k.bus.model || k.bus.name)}</b></div>
        <div><span>${esc(t('ticket.price'))}</span><b>${esc(money(k.price))}</b></div>
        <div><span>${esc(t('ticket.bought'))}</span><b>${esc(fmtDay(k.boughtAt))}</b></div>
      </div>
    </div>
    <div class="tk-qr">
      ${k.status === 'active' ? `<img src="/api/tickets/${esc(k.id)}/qr.svg" alt="QR" width="170" height="170">` : ''}
      <div class="hint">${esc(t('ticket.qr_note'))}</div>
    </div>
  </article>`;
}

route(/^\/ticket\/([a-f0-9]+)$/, async ([id]) => {
  const k = await api('GET', '/tickets/' + id);
  let activeInOrder = 1;
  try {
    const o = await api('GET', '/orders/' + k.orderId);
    activeInOrder = o.tickets.filter((x) => x.status === 'active').length;
  } catch { /* ignore */ }
  view(`<div class="wrap page"><div class="narrow" style="max-width:820px">
    ${pageHead(t('ticket.title'), '#/tickets')}
    ${ticketCard(k)}
    <div class="noprint" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
      <button class="btn" id="pdf" type="button">${esc(t('ticket.pdf'))}</button>
      ${k.canReturn ? `<button class="btn btn-danger" id="ret" type="button">${esc(t('ticket.return'))}</button>` : ''}
    </div>
    ${k.status === 'active' && !k.canReturn ? `<p class="hint noprint">${esc(t('ticket.return_closed', { min: S.config.returnBeforeMin }))}</p>` : ''}
    <p class="hint noprint">${esc(t('ticket.return_rule', { min: S.config.returnBeforeMin }))}</p>
  </div></div>`);
  q$('#pdf').addEventListener('click', () => { toast(t('ticket.pdf_hint')); setTimeout(() => window.print(), 400); });
  const ret = q$('#ret');
  if (ret) ret.addEventListener('click', () => {
    const doReturn = (all) => async (b) => {
      b.disabled = true;
      try {
        const r = await api('POST', all ? `/orders/${k.orderId}/return` : `/tickets/${k.id}/return`);
        toast(t('ticket.returned_ok', { n: r.returned, sum: money(r.refund) }), 'ok');
        go('/tickets?tab=returned');
      } catch (err) { toast(errMsg(err), 'err'); b.disabled = false; return false; }
    };
    const actions = [{ label: t('cancel'), kind: 'btn-ghost' }, { label: t('ticket.return_this'), kind: 'btn-danger', onClick: doReturn(false) }];
    if (activeInOrder > 1) actions.push({ label: t('ticket.return_all', { n: activeInOrder }), kind: 'btn-danger', onClick: doReturn(true) });
    modal({ title: t('ticket.return_title'), html: `<p>${esc(t('ticket.return_msg'))}</p>`, actions });
  });
});

route(/^\/tickets$/, async (_, qs) => {
  const tab = ['active', 'history', 'returned', 'cancelled'].includes(qs.tab) ? qs.tab : 'active';
  const items = await api('GET', '/tickets?status=' + tab);
  const tabs = ['active', 'history', 'returned', 'cancelled'].map((x) => `<a class="day" style="text-decoration:none;min-width:auto;padding:8px 18px" href="#/tickets?tab=${x}" aria-pressed="${x === tab}"><b>${esc(t('tickets.' + x))}</b></a>`).join('');
  view(`<div class="wrap page"><div style="max-width:820px;margin:0 auto">
    ${pageHead(t('nav.tickets'), '')}
    <div class="days" role="navigation" aria-label="${esc(t('nav.tickets'))}">${tabs}</div>
    ${!S.user ? `<div class="note" style="margin-bottom:14px">${esc(t('tickets.guest_note'))} <a class="link" href="#/login">${esc(t('auth.login'))}</a> · <a class="link" href="#/restore">${esc(t('profile.restore'))}</a></div>` : ''}
    <div class="stack">${items.length ? items.map((k) => `
      <a class="tcard" href="#/ticket/${k.id}">
        <div><div class="rt">${k.status === 'cancelled' ? `<span class="tk-st cancelled">${esc(t('ticket.st.cancelled'))}</span> ` : ''}${esc(cityName(k.from))} → ${esc(cityName(k.to))}</div>
          <div class="meta">${esc(fmtDay(k.departAt))}, ${timeOf(k.departAt)} · ${esc(t('seat.n', { n: k.seat }))} · ${esc(k.fio)}</div></div>${icon.chev}
      </a>`).join('') : `<div class="empty">${icon.bus}<h3>${esc(t('tickets.' + tab + '_none'))}</h3><p>${esc(t('tickets.' + tab + '_hint'))}</p>${tab === 'active' ? `<a class="btn" href="#/">${esc(t('home.search'))}</a>` : ''}</div>`}
    </div>
  </div></div>`);
});
