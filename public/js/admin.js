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
    bad_city: 'Shaharni tanlang', bad_bus: 'Avtobusni tanlang', bad_seat: "O'rin noto'g'ri",
    bad_reason: 'Bekor qilish yoki ko‘chirish sababini kamida 3 ta belgi bilan kiriting',
    trip_not_found: 'Reys topilmadi', trip_not_active: 'Bu reys faol emas',
    trip_has_tickets: "Chiptasi bor reysni o'chirib bo'lmaydi. Avval sabab bilan bekor qiling yoki yo'lovchilarni boshqa reysga ko'chiring.",
    trip_time_exists: 'Shu jadvalda bu vaqtda boshqa reys bor',
    route_mismatch: "Faqat ayni yo'nalishdagi reysga ko'chirish mumkin",
    nothing_to_move: "Ko'chirish mumkin bo'lgan faol chipta yo'q",
    not_enough_seats: "Tanlangan avtobusda barcha yo'lovchilar uchun bo'sh o'rin yetarli emas",
    order_not_found: 'Buyurtma topilmadi',
    cash_payment_required: "Bu buyurtma naqd to'lov emas",
    payment_method_mismatch: "To'lov usuli buyurtmaga mos emas",
    payment_method_locked: "Karta to'lovi boshlangan, naqd usulni tanlab bo'lmaydi",
    bad_trip: 'Reysni tanlang'
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
        '<div class="stat"><span>Qaytarilgan chiptalar</span><b>' + s.returned + '</b></div>' +
        '<div class="stat"><span>Arxivdagi reyslar</span><b>' + s.archivedTrips + '</b></div></div>' +
        '<div class="card"><h2>Tez boshlash</h2><p class="muted">1) "Avtobuslar" va "Shaharlar" bo\'limlarini to\'ldiring. 2) "Reyslar" bo\'limida jo\'nash sanasi va vaqtini kiritib, har bir reysni qo\'lda qo\'shing. 3) "Jadvallar" da bugungi va ertangi reyslarni ko\'ring. 4) Kassada sotilgan o\'rinlarni bloklab qo\'ying.</p></div>';
    });
  }

  /* ---------- reyslar ---------- */
  var tripDate = '', tripArchive = false;
  function trips() {
    var query = new URLSearchParams();
    if (tripDate) query.set('date', tripDate);
    if (tripArchive) query.set('archive', '1');
    return api('GET', '/trips' + (query.toString() ? '?' + query : '')).then(function (list) {
      main.innerHTML = '<h1>' + (tripArchive ? 'Reyslar tarixi va arxiv' : 'Reyslar') + '</h1>' +
        '<div class="row" style="margin-bottom:12px"><button class="btn ' + (!tripArchive ? 'btn-lime' : 'btn-ghost') + ' sm" id="activeTrips" type="button">Faol reyslar</button><button class="btn ' + (tripArchive ? 'btn-lime' : 'btn-ghost') + ' sm" id="archivedTrips" type="button">Tarix / arxiv</button></div>' +
        (!tripArchive ? '<details class="card"><summary style="font-weight:800;cursor:pointer">+ Yagona reys qo\'shish</summary><form id="nt" class="stack" style="margin-top:14px"><div class="row">' +
        fld('Qayerdan', '<select class="inp s" name="from_id">' + cityOpts() + '</select>') + fld('Qayerga', '<select class="inp s" name="to_id">' + cityOpts(cache.cities[1] && cache.cities[1].id) + '</select>') +
        fld('Jo\'nash', '<input class="inp s" type="datetime-local" name="depart_at" required>') + fld('Davomiyligi (daq.)', '<input class="inp s" type="number" name="duration_min" min="10" value="240">') +
        fld('Narx (so\'m)', '<input class="inp s" type="number" name="price" min="1000" step="1000" value="100000">') + fld('Avtobus', '<select class="inp s" name="bus_id">' + busOpts() + '</select>') +
        fld('Peron', '<input class="inp s" name="platform" maxlength="10">') + '<button class="btn sm btn-lime" type="submit">Qo\'shish</button></div><p class="hint">Peron — avtobus jo\'naydigan bekat/platforma raqami (masalan, 3); bo\'lmasa bo\'sh qoldiring.</p></form></details>' : '') +
        '<div class="row"><div class="field" style="max-width:220px"><label>Sana bo\'yicha</label><input class="inp s" type="date" id="fd" value="' + esc(tripDate) + '"></div>' +
        '<button class="btn btn-ghost sm" id="fc" type="button">Hammasi</button></div>' +
        '<div class="card scroll"><table class="tbl"><thead><tr><th>Jo\'nash</th><th>Yo\'nalish</th><th>Avtobus</th><th>Narx</th><th>Peron</th><th>Bo\'sh</th><th>Holat</th><th></th></tr></thead><tbody>' +
        (list.length ? list.map(function (t) {
          var active = t.status === 'active' && !tripArchive;
          var state = t.status === 'cancelled' ? 'Bekor qilingan' : t.status === 'archived' ? 'Arxivlangan' : (t.status === 'active' ? (tripArchive ? 'Bajarilgan' : 'Faol') : t.status);
          return '<tr data-id="' + t.id + '"><td><b>' + esc(t.departAt) + '</b>' + (t.noticeReason ? '<div class="hint">Sabab: ' + esc(t.noticeReason) + '</div>' : '') + '</td><td>' + esc(t.from.uz) + ' → ' + esc(t.to.uz) + '</td><td>' + esc(t.bus.name) + '</td>' +
            '<td>' + (active ? '<input class="inp s" style="width:120px" type="number" step="1000" min="1000" data-f="price" value="' + t.price + '">' : money(t.price)) + '</td>' +
            '<td>' + (active ? '<input class="inp s" style="width:70px" data-f="platform" maxlength="10" value="' + esc(t.platform) + '">' : esc(t.platform || '—')) + '</td>' +
            '<td>' + t.free + ' / ' + t.total + (t.bookedCount ? '<div class="hint">' + t.bookedCount + ' chipta</div>' : '') + '</td><td><span class="pill ' + (active ? 'ok' : 'cancel') + '">' + state + '</span></td>' +
            '<td style="white-space:nowrap">' +
            (t.bookedCount ? '<button class="btn btn-ghost xs" data-a="move">Yo\'lovchilarni ko\'chirish</button> ' : '') +
            (active ? '<button class="btn btn-ghost xs" data-a="seats">O\'rinlar</button> <button class="btn btn-ghost xs" data-a="save">Saqlash</button> <button class="btn btn-ghost xs" data-a="reschedule">Sana/vaqt</button> <button class="btn btn-ghost xs" data-a="cancel">Bekor qilish</button> <button class="btn btn-danger xs" data-a="delete">O\'chirish</button>' : '') +
            '</td></tr>';
        }).join('') : '<tr><td colspan="8" class="muted">Reyslar topilmadi</td></tr>') + '</tbody></table></div><div id="seatpanel"></div>';

      $('#activeTrips').addEventListener('click', function () { tripArchive = false; tripDate = ''; go('trips'); });
      $('#archivedTrips').addEventListener('click', function () { tripArchive = true; tripDate = ''; go('trips'); });
      $('#fd').addEventListener('change', function (e) { tripDate = e.target.value; go('trips'); });
      $('#fc').addEventListener('click', function () { tripDate = ''; go('trips'); });
      if (!tripArchive) $('#nt').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, v = {};
        ['from_id', 'to_id', 'depart_at', 'duration_min', 'price', 'bus_id', 'platform'].forEach(function (k) { v[k] = f[k].value; });
        api('POST', '/trips', v).then(function () { toast("Reys qo'shildi", 'ok'); go('trips'); }).catch(fail);
      });
      main.querySelector('tbody').addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        var tr = b.closest('tr'), id = tr.dataset.id;
        if (b.dataset.a === 'seats') { openSeats(id); return; }
        if (b.dataset.a === 'move') { openMoves(id); return; }
        if (b.dataset.a === 'reschedule') {
          var newTime = prompt("Yangi jo'nash sanasi va vaqti (YYYY-MM-DDTHH:MM):", tr.querySelector('td b').textContent.replace(' ', 'T'));
          if (!newTime) return;
          var reason = prompt("Yo'lovchilarga ko'rsatiladigan sabab:", '');
          if (!reason) return;
          api('PUT', '/trips/' + id + '/reschedule', { depart_at: newTime, reason: reason }).then(function () {
            toast("Reys vaqti o'zgartirildi, yo'lovchilarga bildirishnoma yuborildi", 'ok'); go('trips');
          }).catch(fail);
          return;
        }
        if (b.dataset.a === 'cancel') {
          if (!confirm("Reysni bekor qilasizmi? Chiptalar bekor holatga o'tadi, sabab va aloqa raqami yo'lovchilarga ko'rsatiladi. Pulni qaytarish alohida hal qilinadi.")) return;
          var cancelReason = prompt("Bekor qilish sababi (yo'lovchilarga ko'rsatiladi):", '');
          if (!cancelReason) return;
          api('POST', '/trips/' + id + '/cancel', { reason: cancelReason }).then(function () {
            toast("Reys bekor qilindi, yo'lovchilarga xabar yuborildi", 'ok'); go('trips');
          }).catch(fail);
          return;
        }
        if (b.dataset.a === 'delete') {
          if (!confirm("Reysni arxivlaysizmi? U mijozlarga ko'rinmaydi. Chiptasi bor reys uchun avval bekor qilish yoki yo'lovchilarni ko'chirish kerak.")) return;
          api('DELETE', '/trips/' + id).then(function () { toast('Reys arxivga olindi', 'ok'); go('trips'); }).catch(fail);
          return;
        }
        var price = tr.querySelector('[data-f=price]').value, plat = tr.querySelector('[data-f=platform]').value;
        api('PUT', '/trips/' + id, { price: price, platform: plat }).then(function () { toast('Saqlandi', 'ok'); go('trips'); }).catch(fail);
      });
    });
  }

  function openMoves(id) {
    api('GET', '/trips/' + id + '/move-options').then(function (data) {
      var ordersHtml = data.orders.map(function (o) {
        var available = data.trips.filter(function (t) { return t.free >= o.ticket_count; });
        return '<div class="card" data-order="' + esc(o.id) + '"><b>' + esc(o.passengers) + '</b><div class="hint">' + o.ticket_count + ' ta chipta · ' + esc(o.phone) + '</div>' +
          (available.length ? '<div class="row">' + fld('Yangi reys', '<select class="inp s" data-target>' + available.map(function (t) {
            return '<option value="' + t.id + '">' + esc(t.departAt) + ' · ' + esc(t.bus.name) + ' · ' + t.free + ' bo\'sh o\'rin · ' + money(t.price) + '</option>';
          }).join('') + '</select>') + '<button class="btn btn-lime sm" type="button" data-move-order>Ko\'chirish</button></div>' :
            '<p class="hint">Ayni yo\'nalishda barcha yo\'lovchilar sig\'adigan boshqa reys topilmadi.</p>') + '</div>';
      }).join('');
      $('#seatpanel').innerHTML = '<div class="card stack"><h2>Yo\'lovchilarni boshqa reysga ko\'chirish</h2><p class="hint">Faqat ayni yo\'nalishdagi reyslar ko\'rsatiladi. Narx farqini yo\'lovchi bilan alohida kelishing; tizim pul olmaydi yoki qaytarmaydi.</p>' +
        (data.orders.length ? ordersHtml : '<p class="muted">Ko\'chirish uchun faol chiptalar topilmadi.</p>') + '</div>';
      $('#seatpanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#seatpanel').onclick = function (e) {
        var button = e.target.closest('[data-move-order]');
        if (!button) return;
        var card = button.closest('[data-order]');
        button.disabled = true;
        api('POST', '/orders/' + encodeURIComponent(card.dataset.order) + '/move', { toTripId: card.querySelector('[data-target]').value })
          .then(function (result) {
            toast(result.moved + " ta chipta yangi reysga ko'chirildi. Narx farqini alohida kelishing.", 'ok');
            openMoves(id);
          }).catch(function (err) { fail(err); button.disabled = false; });
      };
    }).catch(fail);
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
    var today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tashkent' }).format(new Date());
    var tomorrowDate = new Date(today + 'T00:00:00Z');
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    var tomorrow = tomorrowDate.toISOString().slice(0, 10);
    var localNow = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(new Date());
    var tripsFor = function (date) { return api('GET', '/trips?date=' + date + '&manual=1'); };
    return Promise.all([tripsFor(tomorrow), tripsFor(today), api('GET', '/schedules')]).then(function (results) {
      var tomorrowTrips = results[0], todayTrips = results[1], oldSchedules = results[2];
      var renderDay = function (title, date, list) {
        return '<section><h2>' + title + ' <span class="muted">(' + esc(date) + ', ' + list.length + ' ta avtobus)</span></h2>' +
          '<div class="card scroll"><table class="tbl"><thead><tr><th>Jo\'nash</th><th>Yo\'nalish</th><th>Avtobus</th><th>Bo\'sh o\'rin</th><th>Narx</th><th>Peron</th><th>Holat</th></tr></thead><tbody>' +
          (list.length ? list.map(function (t) {
            var departed = t.departAt <= localNow;
            return '<tr><td><b>' + esc(t.departAt.slice(11, 16)) + '</b></td><td>' + esc(t.from.uz) + ' → ' + esc(t.to.uz) + '</td><td>' + esc(t.bus.name) + '</td>' +
              '<td>' + t.free + ' / ' + t.total + '</td><td>' + money(t.price) + '</td><td>' + esc(t.platform || '—') + '</td>' +
              '<td><span class="pill ' + (departed ? 'cancel' : 'ok') + '">' + (departed ? 'Jo\'nab ketdi' : 'Tayyor') + '</span></td></tr>';
          }).join('') : '<tr><td colspan="7" class="muted">Bu kunga qo\'lda kiritilgan reys yo\'q</td></tr>') +
          '</tbody></table></div></section>';
      };
      main.innerHTML = '<h1>Kunlik reyslar jadvali</h1>' +
        '<p class="muted">Bo\'sh eski andoza reyslari ko\'rsatilmaydi. Qo\'lda kiritilgan va chiptasi bor reyslar ro\'yxatda qoladi.</p>' +
        '<button class="btn btn-lime sm" id="addDailyTrip" type="button">+ Reys qo\'shish</button>' +
        renderDay('Ertangi kunga tayyorlangan avtobuslar', tomorrow, tomorrowTrips) +
        renderDay('Bugungi avtobuslar', today, todayTrips) +
        '<details class="card" style="margin-top:18px"><summary style="font-weight:800;cursor:pointer">Eski takroriy andozalar (' + oldSchedules.length + ')</summary>' +
        '<p class="hint">Bu eski andozalar reys yaratmaydi. Kerak bo\'lmasa butunlay o\'chirishingiz mumkin.</p>' +
        '<div class="scroll"><table class="tbl"><thead><tr><th>Yo\'nalish</th><th>Vaqt</th><th>Avtobus</th><th></th></tr></thead><tbody>' +
        (oldSchedules.length ? oldSchedules.map(function (s) {
          return '<tr data-id="' + s.id + '"><td>' + esc(s.f_uz) + ' → ' + esc(s.c_uz) + '</td><td>' + esc(s.depart_time) + '</td><td>' + esc(s.bus_name) + '</td>' +
            '<td><button class="btn btn-danger xs" data-delete="1">Andozani o\'chirish</button></td></tr>';
        }).join('') : '<tr><td colspan="4" class="muted">Eski andoza yo\'q</td></tr>') +
        '</tbody></table></div></details>';
      $('#addDailyTrip').addEventListener('click', function () { go('trips'); });
      main.querySelector('details tbody').addEventListener('click', function (e) {
        var b = e.target.closest('[data-delete]'); if (!b) return;
        var id = b.closest('tr').dataset.id;
        if (!confirm("Andozani o'chirasizmi? Unga bog'langan chiptasiz eski reyslar o'chadi; chiptali reyslar saqlanadi.")) return;
        api('DELETE', '/schedules/' + id).then(function (result) {
          toast(result.preservedTrips ? "Andoza o'chirildi. Chiptali reyslar saqlandi." : "Andoza va bo'sh reyslari o'chirildi.", 'ok');
          go('sched');
        }).catch(fail);
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
      main.innerHTML = '<h1>Buyurtmalar</h1><div class="card scroll"><table class="tbl"><thead><tr><th>Sana</th><th>Yo\'nalish</th><th>Jo\'nash</th><th>O\'rinlar</th><th>Telefon</th><th>Summa</th><th>To\'lov usuli</th><th>Holat</th><th></th></tr></thead><tbody>' +
        (list.length ? list.map(function (o) {
          var st = o.status === 'pending' && o.payment_method === 'cash' ? ['Kassada to‘lanadi', 'low'] : (STATUS[o.status] || [o.status, '']);
          var method = o.payment_method === 'cash' ? 'Naqd pul' : 'Bank kartasi';
          var action = o.status === 'pending' && o.payment_method === 'cash'
            ? '<button class="btn btn-lime xs" data-cash-paid="' + esc(o.id) + '">Naqd pul olindi</button>'
            : '';
          return '<tr><td>' + esc(o.created_at) + '</td><td>' + esc(o.f_uz) + ' → ' + esc(o.c_uz) + '</td><td>' + esc(o.depart_at) + '</td><td>' + esc(o.seats) + '</td><td>' + esc(o.phone) + '</td><td>' + money(o.total) + '</td><td>' + method + '</td><td><span class="pill ' + st[1] + '">' + st[0] + '</span></td><td>' + action + '</td></tr>';
        }).join('') : '<tr><td colspan="9" class="muted">Buyurtmalar hali yo\'q</td></tr>') + '</tbody></table></div>';
      main.querySelector('tbody').addEventListener('click', function (e) {
        var button = e.target.closest('[data-cash-paid]');
        if (!button) return;
        var order = list.find(function (item) { return item.id === button.dataset.cashPaid; });
        if (!order || !confirm("Mijozdan " + money(order.total) + " naqd pulni oldingizmi? Tasdiqlangandan so'ng chiptalar faol bo'ladi.")) return;
        button.disabled = true;
        api('POST', '/orders/' + encodeURIComponent(button.dataset.cashPaid) + '/cash/confirm').then(function () {
          toast("Naqd to'lov tasdiqlandi, chiptalar faollashtirildi", 'ok');
          go('orders');
        }).catch(function (err) {
          button.disabled = false;
          fail(err);
        });
      });
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
