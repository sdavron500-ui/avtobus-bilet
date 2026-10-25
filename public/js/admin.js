/* Admin panel (faqat o'zbekcha). Parol: .env dagi ADMIN_PASSWORD */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = $('#main');
  var TOKEN = null;
  try { TOKEN = sessionStorage.getItem('adm'); } catch (e) { /* ignore */ }

  var ERR = {
    bad_credentials: "Parol noto'g'ri", unauthorized: 'Sessiya tugadi, qaytadan kiring', too_many_tries: "Urinishlar ko'p, 5 daqiqadan keyin urinib ko'ring",
    in_use: "Bu yozuv ishlatilmoqda, o'chirib bo'lmaydi", bad_time: "Vaqt noto'g'ri", same_city: 'Shaharlar bir xil', seat_taken: "O'rinda yo'lovchi bor",
    ticket_not_found: 'Chipta topilmadi', bad_name: 'Nom kiriting', bad_price: "Narx noto'g'ri", bad_duration: "Davomiylik noto'g'ri", bad_seats: "O'rinlar soni noto'g'ri",
    bad_city: 'Shaharni tanlang', bad_bus: 'Avtobusni tanlang', bad_seat: "O'rin noto'g'ri"
  };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg, kind) {
    var el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg;
    $('#toasts').appendChild(el); setTimeout(function () { el.remove(); }, 3500);
  }
  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm"; };

  function api(method, url, body) {
    var headers = { 'content-type': 'application/json' };
    if (TOKEN) headers['x-admin'] = TOKEN;
    return fetch('/api/admin' + url, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          if (res.status === 401 && url !== '/login') { showLogin(); }
          var e = new Error(data.error || 'server_error'); e.code = data.error; throw e;
        }
        return data;
      }); });
  }
  function fail(e) { toast(ERR[e.code] || ("Xatolik: " + (e.code || e.message)), 'err'); }

  /* ---------- kirish ---------- */
  function showLogin() {
    TOKEN = null; try { sessionStorage.removeItem('adm'); } catch (e) { /* ignore */ }
    $('#shell').hidden = true; $('#login').hidden = false;
  }
  $('#lf').addEventListener('submit', function (e) {
    e.preventDefault();
    api('POST', '/login', { password: $('#ap').value }).then(function (r) {
      TOKEN = r.token; try { sessionStorage.setItem('adm', TOKEN); } catch (x) { /* ignore */ }
      $('#ap').value = ''; $('#le').textContent = ''; start();
    }).catch(function (err) { $('#le').textContent = ERR[err.code] || 'Xatolik'; });
  });
  $('#out').addEventListener('click', showLogin);

  /* ---------- bo'limlar ---------- */
  var TABS = [['dash', 'Boshqaruv'], ['trips', 'Reyslar'], ['sched', 'Jadvallar'], ['buses', 'Avtobuslar'], ['cities', 'Shaharlar'], ['orders', 'Buyurtmalar'], ['check', 'Chipta tekshirish']];
  var cache = { cities: [], buses: [] };
  var cur = 'dash';
  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(function (t) { return '<button type="button" data-tab="' + t[0] + '"' + (t[0] === cur ? ' aria-current="page"' : '') + '>' + t[1] + '</button>'; }).join('');
  }
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });

  function start() {
    $('#login').hidden = true; $('#shell').hidden = false;
    Promise.all([api('GET', '/cities'), api('GET', '/buses')]).then(function (r) { cache.cities = r[0]; cache.buses = r[1]; go(cur); }).catch(fail);
  }
  function go(tab) {
    cur = tab; renderTabs();
    main.innerHTML = '<div class="spin"></div>';
    ({ dash: dash, trips: trips, sched: sched, buses: buses, cities: cities, orders: orders, check: check })[tab]().catch(fail);
  }

  var cityOpts = function (sel) { return cache.cities.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name_uz) + (c.country !== 'UZ' ? ' (' + esc(c.country) + ')' : '') + '</option>'; }).join(''); };
  var busOpts = function (sel) { return cache.buses.map(function (b) { return '<option value="' + b.id + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.name) + ' (' + b.seats + ')</option>'; }).join(''); };
  var fld = function (label, html) { return '<div class="field"><label>' + label + '</label>' + html + '</div>'; };

  /* ---------- boshqaruv ---------- */
  function dash() {
    return api('GET', '/stats').then(function (s) {
      main.innerHTML = '<h1>Boshqaruv</h1><div class="stats">' +
        '<div class="stat"><span>Kelgusi reyslar</span><b>' + s.upcomingTrips + '</b></div>' +
        '<div class="stat"><span>Faol chiptalar</span><b>' + s.activeTickets + '</b></div>' +
        '<div class="stat"><span>Tushum</span><b style="font-size:22px">' + money(s.revenue) + '</b></div>' +
        '<div class="stat"><span>Foydalanuvchilar</span><b>' + s.users + '</b></div>' +
        '<div class="stat"><span>Qaytarilgan chiptalar</span><b>' + s.returned + '</b></div></div>' +
        '<div class="card"><h2>Tez boshlash</h2><p class="muted">1) "Avtobuslar" va "Shaharlar" bo\'limlarini to\'ldiring. 2) "Jadvallar" da har kuni takrorlanadigan reyslarni kiriting, tizim 3 hafta oldindan reys yaratib boradi. 3) "Reyslar" da kassada sotilgan o\'rinlarni bloklab qo\'ying, shunda saytda band ko\'rinadi.</p></div>';
    });
  }

  /* ---------- reyslar ---------- */
  var tripDate = '';
  function trips() {
    return api('GET', '/trips' + (tripDate ? '?date=' + tripDate : '')).then(function (list) {
      main.innerHTML = '<h1>Reyslar</h1>' +
        '<details class="card"><summary style="font-weight:800;cursor:pointer">+ Yagona reys qo\'shish</summary><form id="nt" class="stack" style="margin-top:14px"><div class="row">' +
        fld('Qayerdan', '<select class="inp s" name="from_id">' + cityOpts() + '</select>') + fld('Qayerga', '<select class="inp s" name="to_id">' + cityOpts(cache.cities[1] && cache.cities[1].id) + '</select>') +
        fld('Jo\'nash', '<input class="inp s" type="datetime-local" name="depart_at" required>') + fld('Davomiyligi (daq.)', '<input class="inp s" type="number" name="duration_min" min="10" value="240">') +
        fld('Narx (so\'m)', '<input class="inp s" type="number" name="price" min="1000" step="1000" value="100000">') + fld('Avtobus', '<select class="inp s" name="bus_id">' + busOpts() + '</select>') +
        fld('Peron', '<input class="inp s" name="platform" maxlength="10">') + '<button class="btn sm btn-lime" type="submit">Qo\'shish</button></div></form></details>' +
        '<div class="row"><div class="field" style="max-width:220px"><label>Sana bo\'yicha</label><input class="inp s" type="date" id="fd" value="' + esc(tripDate) + '"></div>' +
        '<button class="btn btn-ghost sm" id="fc" type="button">Hammasi</button></div>' +
        '<div class="card scroll"><table class="tbl"><thead><tr><th>Jo\'nash</th><th>Yo\'nalish</th><th>Avtobus</th><th>Narx</th><th>Peron</th><th>Bo\'sh</th><th>Holat</th><th></th></tr></thead><tbody>' +
        (list.length ? list.map(function (t) {
          return '<tr data-id="' + t.id + '"><td><b>' + esc(t.departAt) + '</b></td><td>' + esc(t.from.uz) + ' → ' + esc(t.to.uz) + '</td><td>' + esc(t.bus.name) + '</td>' +
            '<td><input class="inp s" style="width:120px" type="number" step="1000" min="1000" data-f="price" value="' + t.price + '"></td>' +
            '<td><input class="inp s" style="width:70px" data-f="platform" maxlength="10" value="' + esc(t.platform) + '"></td>' +
            '<td>' + t.free + ' / ' + t.total + '</td><td><span class="pill ' + (t.status === 'active' ? 'ok' : 'cancel') + '">' + (t.status === 'active' ? 'Faol' : 'Bekor') + '</span></td>' +
            '<td style="white-space:nowrap"><button class="btn btn-ghost xs" data-a="seats">O\'rinlar</button> <button class="btn btn-ghost xs" data-a="save">Saqlash</button> <button class="btn btn-ghost xs" data-a="toggle" data-s="' + t.status + '">' + (t.status === 'active' ? 'Bekor qilish' : 'Qayta yoqish') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="8" class="muted">Reyslar topilmadi</td></tr>') + '</tbody></table></div><div id="seatpanel"></div>';

      $('#fd').addEventListener('change', function (e) { tripDate = e.target.value; go('trips'); });
      $('#fc').addEventListener('click', function () { tripDate = ''; go('trips'); });
      $('#nt').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, v = {};
        ['from_id', 'to_id', 'depart_at', 'duration_min', 'price', 'bus_id', 'platform'].forEach(function (k) { v[k] = f[k].value; });
        api('POST', '/trips', v).then(function () { toast("Reys qo'shildi", 'ok'); go('trips'); }).catch(fail);
      });
      main.querySelector('tbody').addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        var tr = b.closest('tr'), id = tr.dataset.id;
        if (b.dataset.a === 'seats') { openSeats(id); return; }
        var price = tr.querySelector('[data-f=price]').value, plat = tr.querySelector('[data-f=platform]').value;
        var status = b.dataset.a === 'toggle' ? (b.dataset.s === 'active' ? 'cancelled' : 'active') : (b.dataset.s || 'active');
        if (b.dataset.a === 'save') status = tr.querySelector('[data-a=toggle]').dataset.s;
        api('PUT', '/trips/' + id, { price: price, platform: plat, status: status }).then(function () { toast('Saqlandi', 'ok'); go('trips'); }).catch(fail);
      });
    });
  }

  function openSeats(id) {
    api('GET', '/trips/' + id + '/seats').then(function (d) {
      var rows = {};
      d.seats.forEach(function (s) { (rows[s.row] = rows[s.row] || []).push(s); });
      var btn = function (s) {
        if (!s) return '<span style="width:46px"></span>';
        var cls = s.status === 'taken' ? (s.gender === 'f' ? 'tf' : 'tm') : s.status === 'blocked' ? 'bl' : '';
        return '<button type="button" class="aseat ' + cls + '" data-no="' + s.no + '" aria-label="O\'rin ' + s.no + '">' + s.no + '</button>';
      };
      var grid = Object.keys(rows).map(function (r) { var x = rows[r]; return '<div class="brow"><div class="pair">' + btn(x[0]) + btn(x[1]) + '</div><div class="pair">' + btn(x[2]) + btn(x[3]) + '</div></div>'; }).join('');
      $('#seatpanel').innerHTML = '<div class="card"><h2 style="margin-bottom:6px">' + esc(d.trip.from.uz) + ' → ' + esc(d.trip.to.uz) + ', ' + esc(d.trip.departAt) + '</h2>' +
        '<p class="muted" style="margin-top:0">Bo\'sh o\'rinni bosing: kassada sotildi deb bloklanadi. Bloklangan o\'rinni bossangiz, blok olinadi. Ko\'k/pushti: sotilgan.</p>' +
        '<div class="seatgrid"><div class="bus" style="max-width:300px"><div class="stack" style="gap:10px">' + grid + '</div></div><div id="seatinfo" class="stack"><p class="muted">O\'rin tanlang.</p></div></div></div>';
      $('#seatpanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      // onclick (addEventListener emas): oyna qayta ochilganda eski tinglovchilar to'planib qolmasin
      $('#seatpanel').onclick = function (e) {
        var b = e.target.closest('[data-no]'); if (!b) return;
        var s = d.seats[+b.dataset.no - 1], info = $('#seatinfo');
        document.querySelectorAll('.aseat.on').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
        if (s.status === 'taken') {
          info.innerHTML = '<h2>' + s.no + '-o\'rin: sotilgan</h2><div class="sum-row"><span class="muted">Yo\'lovchi</span><b>' + esc(s.fio) + '</b></div><div class="sum-row"><span class="muted">Jins</span><b>' + (s.gender === 'f' ? 'Ayol' : 'Erkak') + '</b></div><div class="sum-row"><span class="muted">Telefon</span><b>' + esc(s.phone) + '</b></div><div class="sum-row"><span class="muted">Chipta</span><b>' + esc(s.number) + '</b></div>' + (s.pending ? '<div class="note warn">To\'lov kutilmoqda</div>' : '');
        } else if (s.status === 'blocked') {
          info.innerHTML = '<h2>' + s.no + '-o\'rin: bloklangan</h2><p class="muted">Sabab: ' + esc(s.reason) + '</p><button class="btn btn-danger sm" id="ub">Blokni olib tashlash</button>';
          $('#ub').addEventListener('click', function () { api('DELETE', '/trips/' + id + '/block/' + s.no).then(function () { toast("Blok olib tashlandi", 'ok'); openSeats(id); }).catch(fail); });
        } else {
          info.innerHTML = '<h2>' + s.no + '-o\'rin: bo\'sh</h2>' + fld('Sabab', '<input class="inp s" id="br" value="kassa" maxlength="60">') + '<button class="btn sm" id="bb">Bloklash (saytda band bo\'ladi)</button>';
          $('#bb').addEventListener('click', function () { api('POST', '/trips/' + id + '/block', { seat: s.no, reason: $('#br').value }).then(function () { toast('Bloklandi', 'ok'); openSeats(id); }).catch(fail); });
        }
      };
    }).catch(fail);
  }

  /* ---------- jadvallar ---------- */
  function sched() {
    return api('GET', '/schedules').then(function (list) {
      main.innerHTML = '<h1>Jadvallar (har kuni takrorlanadi)</h1>' +
        '<form id="ns" class="card stack"><h2>Yangi jadval</h2><div class="row">' +
        fld('Qayerdan', '<select class="inp s" name="from_id">' + cityOpts() + '</select>') + fld('Qayerga', '<select class="inp s" name="to_id">' + cityOpts(cache.cities[1] && cache.cities[1].id) + '</select>') +
        fld('Jo\'nash vaqti', '<input class="inp s" type="time" name="depart_time" value="08:00" required>') + fld('Davomiyligi (daq.)', '<input class="inp s" type="number" name="duration_min" min="10" value="240">') +
        fld('Narx (so\'m)', '<input class="inp s" type="number" name="price" min="1000" step="1000" value="100000">') + fld('Avtobus', '<select class="inp s" name="bus_id">' + busOpts() + '</select>') +
        fld('Peron', '<input class="inp s" name="platform" maxlength="10">') + '<button class="btn sm btn-lime" type="submit">Qo\'shish</button></div></form>' +
        '<div class="card scroll"><table class="tbl"><thead><tr><th>Yo\'nalish</th><th>Vaqt</th><th>Davomiyligi</th><th>Narx</th><th>Avtobus</th><th>Peron</th><th>Holat</th><th></th></tr></thead><tbody>' +
        list.map(function (s) {
          return '<tr data-id="' + s.id + '"><td>' + esc(s.f_uz) + ' → ' + esc(s.c_uz) + '</td><td><b>' + esc(s.depart_time) + '</b></td><td>' + s.duration_min + ' daq.</td><td>' + money(s.price) + '</td><td>' + esc(s.bus_name) + '</td><td>' + esc(s.platform) + '</td>' +
            '<td><span class="pill ' + (s.active ? 'ok' : 'cancel') + '">' + (s.active ? 'Faol' : "O'chirilgan") + '</span></td><td><button class="btn btn-ghost xs" data-act="' + (s.active ? 0 : 1) + '">' + (s.active ? "O'chirish" : 'Yoqish') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>';
      $('#ns').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, v = {};
        ['from_id', 'to_id', 'depart_time', 'duration_min', 'price', 'bus_id', 'platform'].forEach(function (k) { v[k] = f[k].value; });
        api('POST', '/schedules', v).then(function () { toast("Jadval qo'shildi, reyslar yaratildi", 'ok'); go('sched'); }).catch(fail);
      });
      main.querySelector('tbody').addEventListener('click', function (e) {
        var b = e.target.closest('[data-act]'); if (!b) return;
        api('PUT', '/schedules/' + b.closest('tr').dataset.id + '/active', { active: b.dataset.act === '1' }).then(function () { go('sched'); }).catch(fail);
      });
    });
  }

  /* ---------- avtobuslar ---------- */
  function buses() {
    return api('GET', '/buses').then(function (list) {
      cache.buses = list;
      main.innerHTML = '<h1>Avtobuslar</h1>' +
        '<form id="nb" class="card stack"><h2>Yangi avtobus</h2><div class="row">' + fld('Nomi', '<input class="inp s" name="name" required maxlength="60">') + fld('Davlat raqami', '<input class="inp s" name="plate" maxlength="20">') +
        fld('Model', '<input class="inp s" name="model" maxlength="60">') + fld("O'rinlar soni", '<input class="inp s" type="number" name="seats" min="4" max="60" value="40">') +
        fld('Qulayliklar (vergul bilan)', '<input class="inp s" name="amenities" placeholder="AC,USB,WiFi" maxlength="100">') + '<button class="btn sm btn-lime" type="submit">Qo\'shish</button></div></form>' +
        '<div class="card scroll"><table class="tbl"><thead><tr><th>Nomi</th><th>Raqam</th><th>Model</th><th>O\'rin</th><th>Qulayliklar</th><th></th></tr></thead><tbody>' +
        list.map(function (b) {
          return '<tr data-id="' + b.id + '"><td><input class="inp s" data-f="name" value="' + esc(b.name) + '"></td><td><input class="inp s" data-f="plate" value="' + esc(b.plate) + '"></td><td><input class="inp s" data-f="model" value="' + esc(b.model) + '"></td>' +
            '<td><input class="inp s" style="width:80px" type="number" min="4" max="60" data-f="seats" value="' + b.seats + '"></td><td><input class="inp s" data-f="amenities" value="' + esc(b.amenities) + '"></td>' +
            '<td style="white-space:nowrap"><button class="btn btn-ghost xs" data-a="save">Saqlash</button> <button class="btn btn-danger xs" data-a="del">O\'chirish</button></td></tr>';
        }).join('') + '</tbody></table></div>';
      $('#nb').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, v = {};
        ['name', 'plate', 'model', 'seats', 'amenities'].forEach(function (k) { v[k] = f[k].value; });
        api('POST', '/buses', v).then(function () { toast("Avtobus qo'shildi", 'ok'); go('buses'); }).catch(fail);
      });
      main.querySelector('tbody').addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        var tr = b.closest('tr'), id = tr.dataset.id;
        if (b.dataset.a === 'del') { if (!confirm("Avtobus o'chirilsinmi?")) return; api('DELETE', '/buses/' + id).then(function () { go('buses'); }).catch(fail); return; }
        var v = {}; tr.querySelectorAll('[data-f]').forEach(function (i) { v[i.dataset.f] = i.value; });
        api('PUT', '/buses/' + id, v).then(function () { toast('Saqlandi', 'ok'); }).catch(fail);
      });
    });
  }

  /* ---------- shaharlar ---------- */
  function cities() {
    return api('GET', '/cities').then(function (list) {
      cache.cities = list;
      main.innerHTML = '<h1>Shaharlar</h1>' +
        '<form id="nc" class="card stack"><h2>Yangi shahar</h2><div class="row">' + fld("O'zbekcha", '<input class="inp s" name="name_uz" required maxlength="60">') + fld('Ruscha', '<input class="inp s" name="name_ru" maxlength="60">') +
        fld('Inglizcha', '<input class="inp s" name="name_en" maxlength="60">') + fld('Davlat kodi', '<input class="inp s" name="country" value="UZ" maxlength="2" style="text-transform:uppercase">') +
        '<button class="btn sm btn-lime" type="submit">Qo\'shish</button></div><p class="hint" style="margin:0">Davlat kodi UZ bo\'lmasa, reys "Xalqaro" hisoblanadi va yo\'lovchidan pasport so\'raladi.</p></form>' +
        '<div class="card scroll"><table class="tbl"><thead><tr><th>#</th><th>O\'zbekcha</th><th>Ruscha</th><th>Inglizcha</th><th>Davlat</th><th></th></tr></thead><tbody>' +
        list.map(function (c) { return '<tr data-id="' + c.id + '"><td>' + c.id + '</td><td>' + esc(c.name_uz) + '</td><td>' + esc(c.name_ru) + '</td><td>' + esc(c.name_en) + '</td><td>' + esc(c.country) + '</td><td><button class="btn btn-danger xs">O\'chirish</button></td></tr>'; }).join('') + '</tbody></table></div>';
      $('#nc').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, v = {};
        ['name_uz', 'name_ru', 'name_en', 'country'].forEach(function (k) { v[k] = f[k].value; });
        api('POST', '/cities', v).then(function () { toast("Shahar qo'shildi", 'ok'); go('cities'); }).catch(fail);
      });
      main.querySelector('tbody').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b || !confirm("Shahar o'chirilsinmi?")) return;
        api('DELETE', '/cities/' + b.closest('tr').dataset.id).then(function () { go('cities'); }).catch(fail);
      });
    });
  }

  /* ---------- buyurtmalar ---------- */
  var STATUS = { paid: ["To'langan", 'ok'], pending: ['Kutilmoqda', 'low'], expired: ['Muddati tugagan', ''], returned: ['Qaytarilgan', 'cancel'] };
  function orders() {
    return api('GET', '/orders').then(function (list) {
      main.innerHTML = '<h1>Buyurtmalar</h1><div class="card scroll"><table class="tbl"><thead><tr><th>Sana</th><th>Yo\'nalish</th><th>Jo\'nash</th><th>O\'rinlar</th><th>Telefon</th><th>Summa</th><th>Holat</th></tr></thead><tbody>' +
        (list.length ? list.map(function (o) {
          var st = STATUS[o.status] || [o.status, ''];
          return '<tr><td>' + esc(o.created_at) + '</td><td>' + esc(o.f_uz) + ' → ' + esc(o.c_uz) + '</td><td>' + esc(o.depart_at) + '</td><td>' + esc(o.seats) + '</td><td>' + esc(o.phone) + '</td><td>' + money(o.total) + '</td><td><span class="pill ' + st[1] + '">' + st[0] + '</span></td></tr>';
        }).join('') : '<tr><td colspan="7" class="muted">Buyurtmalar hali yo\'q</td></tr>') + '</tbody></table></div>';
    });
  }

  /* ---------- chipta tekshirish (nazoratchi) ---------- */
  function check() {
    main.innerHTML = '<h1>Chipta tekshirish</h1><form id="cf" class="card stack" style="max-width:520px"><p class="muted" style="margin:0">QR-kod ostidagi 10 xonali chipta raqamini kiriting (yoki QR skaner matnini qo\'ying).</p>' +
      fld('Chipta raqami', '<input class="inp" id="cn" inputmode="numeric" autofocus placeholder="0123456789">') + '<button class="btn btn-lime" type="submit">Tekshirish</button><div id="cr"></div></form>';
    $('#cf').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('#cn').value.trim();
      if (!n) return;
      api('GET', '/ticket/' + encodeURIComponent(n)).then(function (t) {
        $('#cr').innerHTML = '<div class="note' + (t.valid ? '' : ' warn') + '" style="margin-top:6px"><b>' + (t.valid ? 'YAROQLI' : (t.status === 'returned' ? 'QAYTARILGAN, yaroqsiz' : 'Yaroqsiz (' + esc(t.status) + ')')) + '</b><br>' +
          esc(t.fio) + ', ' + t.seat + '-o\'rin<br>' + esc(t.route) + ', ' + esc(t.departAt) + '<br>' + esc(t.phone) + '</div>';
      }).catch(function (err) { $('#cr').innerHTML = '<div class="note warn" style="margin-top:6px"><b>' + (ERR[err.code] || 'Xatolik') + '</b></div>'; });
    });
    return Promise.resolve();
  }

  if (TOKEN) { api('GET', '/stats').then(start).catch(showLogin); } else showLogin();
})();
