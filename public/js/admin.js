/* Admin panel. Parol: .env dagi ADMIN_PASSWORD */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = $('#main');
  var TOKEN = null;
  var LANG = 'uz';
  try { TOKEN = sessionStorage.getItem('adm'); } catch (e) { /* ignore */ }
  try { LANG = localStorage.getItem('adminLang') || 'uz'; } catch (e) { /* ignore */ }
  if (!['uz', 'ru', 'en'].includes(LANG)) LANG = 'uz';
  document.documentElement.lang = LANG;

  var TRANSLATIONS = {
    ru: {
      "Boshqaruv":"Панель управления","Reyslar":"Рейсы","Jadvallar":"Расписания","Avtobuslar":"Автобусы","Shaharlar":"Города","Buyurtmalar":"Заказы","Chipta tekshirish":"Проверка билета","Sotuv":"Продажа","Hisobot":"Отчёты",
      "Parol":"Пароль","Kirish":"Войти","Chiqish":"Выйти","Saytni ochish":"Открыть сайт","Til / Язык / Language":"Язык","Sessiya tugadi, qaytadan kiring":"Сеанс истёк. Войдите снова","Parol noto'g'ri":"Неверный пароль","Xatolik":"Ошибка",
      "Kelgusi reyslar":"Предстоящие рейсы","Faol chiptalar":"Активные билеты","Tushum":"Выручка","Foydalanuvchilar":"Пользователи","Qaytarilgan chiptalar":"Возвращённые билеты","Arxivdagi reyslar":"Рейсы в архиве","Tez boshlash":"Быстрый старт","Yo'nalish":"Маршрут","Jo'nash":"Отправление","Yetib borish":"Прибытие","O'rinlar":"Места","Summa":"Сумма","To'lov usuli":"Способ оплаты","Holat":"Статус","Sana":"Дата","Telefon":"Телефон",
      "Faol reyslar":"Активные рейсы","Tarix / arxiv":"История / архив","Reyslar tarixi va arxiv":"История рейсов и архив","+ Yagona reys qo'shish":"+ Добавить рейс","Qayerdan":"Откуда","Qayerga":"Куда","Davomiyligi (daq.)":"Длительность (мин.)","Narx (so'm)":"Цена (сум)","Peron":"Платформа","Qo'shish":"Добавить","Saqlash":"Сохранить","O'chirish":"Удалить","Bekor qilish":"Отменить","O'rinlarni ko'rish":"Посмотреть места","Yo'lovchilarni ko'chirish":"Пересадить пассажиров","Yo'lovchilarni boshqa reysga ko'chirish":"Пересадка пассажиров на другой рейс","Yangi reys":"Новый рейс","Ko'chirish":"Пересадить","Eski andoza yo'q":"Старых шаблонов нет","Eski takroriy andozalar":"Старые повторяющиеся шаблоны","Andozani o'chirish":"Удалить шаблон","Reysni arxivga olish":"Архивировать рейс","Reys vaqti":"Время рейса","Sabab":"Причина","Bloklangan":"Заблокировано","Bo'sh":"Свободно","Sotilgan":"Продано","O'rin":"Место","Yo'lovchi":"Пассажир","Ayol":"Женщина","Erkak":"Мужчина","Chipta":"Билет","To'lov kutilmoqda":"Ожидается оплата","Blokni olib tashlash":"Снять блокировку","Bloklash (saytda band bo'ladi)":"Заблокировать (будет занято на сайте)","Kassada sotildi":"Продано в кассе","Reys topilmadi":"Рейс не найден","Chipta topilmadi":"Билет не найден","To'langan":"Оплачено","Kutilmoqda":"Ожидает оплаты","Muddati tugagan":"Срок истёк","Qaytarilgan":"Возвращён","Kassada to‘lanadi":"Оплата в кассе","Naqd pul":"Наличные","Bank kartasi":"Банковская карта","Naqd pul olindi":"Наличные получены","Buyurtmalar hali yo'q":"Заказов пока нет","Mijozdan":"Получены ли от клиента наличные","naqd pulni oldingizmi? Tasdiqlangandan so'ng chiptalar faol bo'ladi.":"? После подтверждения билеты будут активированы.","Chipta tekshirish":"Проверка билета","Chipta raqami":"Номер билета","Tekshirish":"Проверить","Yangi avtobus":"Новый автобус","Nomi":"Название","Davlat raqami":"Госномер","Model":"Модель","O'rinlar soni":"Количество мест","Qulayliklar (vergul bilan)":"Удобства (через запятую)","O'zbekcha":"Узбекский","Ruscha":"Русский","Inglizcha":"Английский","Davlat kodi":"Код страны","Hammasi":"Все","Jins":"Пол","Erkak":"Мужчина","Ayol":"Женщина","Mijozni reysga joylashtirish":"Посадить пассажира на рейс","Mijoz ismi":"Имя пассажира","To'lov usuli":"Способ оплаты","Naqd":"Наличные","Karta":"Карта","To'lov olindi":"Оплата получена","Chiptani rasmiylashtirish":"Оформить билет","Buyurtma":"Заказ","Chipta raqami":"Номер билета","Daromad hisoboti":"Отчёт о доходах","Boshlanish sanasi":"Дата начала","Tugash sanasi":"Дата окончания","Hisobotni ko'rish":"Показать отчёт","Excelga yuklab olish (CSV)":"Скачать для Excel (CSV)","Chop etish":"Печать","Jami tushum":"Общая выручка","Reyslar soni":"Количество рейсов","Borib-qaytish":"Поездки туда-обратно","Yo'lovchilar soni":"Количество пассажиров","Bandlik reytingi":"Рейтинг загрузки","Eng ko'p band":"Наибольшая загрузка","Eng kam band":"Наименьшая загрузка","Avtobus bo'yicha batafsil":"Подробно по автобусу","Avtobusni tanlang":"Выберите автобус","Borish":"Туда","Qaytish":"Обратно","Yo'lovchi / jami o'rin":"Пассажиры / всего мест","Bo'sh o'rin":"Свободные места","Bandlik":"Загрузка","Kassa tushumi":"Выручка наличными","Karta tushumi":"Выручка картой","To'lovlar":"Платежи","Mos reys yo'q":"Подходящих рейсов нет",      "Karta to'lovi DEMO rejimida: hisobotda tasdiqlangan karta buyurtmalari haqiqiy tushum bo'lmasligi mumkin.":"Оплата картой работает в ДЕМО-режиме: подтверждённые карточные заказы в отчёте могут не быть реальной выручкой.","Reys tanlang":"Выберите рейс","O'rin tanlang":"Выберите место","Telefon raqami":"Номер телефона","Yo'lovchi ismi":"Имя пассажира","To'lov turi":"Способ оплаты","Xaridor to'lovni amalga oshirganini tasdiqlang. Karta to'lovi hozir DEMO, pul haqiqiy yechilmaydi.":"Подтвердите, что клиент оплатил. Оплата картой сейчас в ДЕМО-режиме, реальные средства не списываются.","Rasmiylashtirish":"Оформить","Qabul qilindi":"Принято","To'lov turi":"Способ оплаты","Jadval":"Расписание","Hammasi":"Все","Reysga yozish":"Оформить пассажира","Qidirish":"Поиск","Reys sanasi":"Дата рейса","Yo'nalishlar":"Маршруты","O'rta bandlik":"Средняя загрузка","Safarlar":"Рейсы","Batafsil":"Подробнее","Ortga":"Назад","Mijoz":"Клиент","Narx":"Цена","Xalqaro":"Международный","Yopish":"Закрыть","Kassa":"Касса","Biriktirilmagan":"Не сопоставлен","Borish reysi":"Рейс туда","Qaytish reysi":"Обратный рейс","To'langan buyurtmalar bo'yicha hisob":"Расчёт по оплаченным заказам","Sana oralig'ida reys topilmadi":"В выбранном диапазоне рейсов нет","Sana noto'g'ri":"Неверная дата","Sana / jo‘nash":"Дата / отправление","Yo‘nalish turi":"Тип рейса","Yo‘lovchi / jami o‘rin":"Пассажиры / всего мест","Bo‘sh o‘rin":"Свободные места"
    },
    en: {
      "Boshqaruv":"Dashboard","Reyslar":"Trips","Jadvallar":"Schedules","Avtobuslar":"Buses","Shaharlar":"Cities","Buyurtmalar":"Orders","Chipta tekshirish":"Ticket validation","Sotuv":"Sales","Hisobot":"Reports",
      "Parol":"Password","Kirish":"Sign in","Chiqish":"Sign out","Saytni ochish":"Open website","Til / Язык / Language":"Language","Sessiya tugadi, qaytadan kiring":"Session expired. Sign in again","Parol noto'g'ri":"Incorrect password","Xatolik":"Error",
      "Kelgusi reyslar":"Upcoming trips","Faol chiptalar":"Active tickets","Tushum":"Revenue","Foydalanuvchilar":"Users","Qaytarilgan chiptalar":"Returned tickets","Arxivdagi reyslar":"Archived trips","Tez boshlash":"Quick start","Yo'nalish":"Route","Jo'nash":"Departure","Yetib borish":"Arrival","O'rinlar":"Seats","Summa":"Amount","To'lov usuli":"Payment method","Holat":"Status","Sana":"Date","Telefon":"Phone",
      "Faol reyslar":"Active trips","Tarix / arxiv":"History / archive","Reyslar tarixi va arxiv":"Trip history and archive","+ Yagona reys qo'shish":"+ Add a trip","Qayerdan":"From","Qayerga":"To","Davomiyligi (daq.)":"Duration (min.)","Narx (so'm)":"Price (UZS)","Peron":"Platform","Qo'shish":"Add","Saqlash":"Save","O'chirish":"Delete","Bekor qilish":"Cancel","O'rinlarni ko'rish":"View seats","Yo'lovchilarni ko'chirish":"Move passengers","Yo'lovchilarni boshqa reysga ko'chirish":"Move passengers to another trip","Yangi reys":"New trip","Ko'chirish":"Move","Eski andoza yo'q":"No old templates","Eski takroriy andozalar":"Old recurring templates","Andozani o'chirish":"Delete template","Reysni arxivga olish":"Archive trip","Reys vaqti":"Trip time","Sabab":"Reason","Bloklangan":"Blocked","Bo'sh":"Available","Sotilgan":"Sold","O'rin":"Seat","Yo'lovchi":"Passenger","Ayol":"Female","Erkak":"Male","Chipta":"Ticket","To'lov kutilmoqda":"Payment pending","Blokni olib tashlash":"Remove block","Bloklash (saytda band bo'ladi)":"Block (unavailable online)","Kassada sotildi":"Sold at cashier","Reys topilmadi":"Trip not found","Chipta topilmadi":"Ticket not found","To'langan":"Paid","Kutilmoqda":"Pending","Muddati tugagan":"Expired","Qaytarilgan":"Refunded","Kassada to‘lanadi":"Pay at cashier","Naqd pul":"Cash","Bank kartasi":"Bank card","Naqd pul olindi":"Cash received","Buyurtmalar hali yo'q":"No orders yet","Chipta raqami":"Ticket number","Tekshirish":"Validate","Yangi avtobus":"New bus","Nomi":"Name","Davlat raqami":"License plate","Model":"Model","O'rinlar soni":"Seat count","Qulayliklar (vergul bilan)":"Amenities (comma-separated)","O'zbekcha":"Uzbek","Ruscha":"Russian","Inglizcha":"English","Davlat kodi":"Country code","Jins":"Gender","Mijozni reysga joylashtirish":"Assign passenger to trip","Mijoz ismi":"Passenger name","To'lov usuli":"Payment method","Naqd":"Cash","Karta":"Card","To'lov olindi":"Payment received","Chiptani rasmiylashtirish":"Issue ticket","Daromad hisoboti":"Revenue report","Boshlanish sanasi":"Start date","Tugash sanasi":"End date","Hisobotni ko'rish":"Show report","Excelga yuklab olish (CSV)":"Download for Excel (CSV)","Chop etish":"Print","Jami tushum":"Total revenue","Reyslar soni":"Trip count","Borib-qaytish":"Round trips","Yo'lovchilar soni":"Passengers","Bandlik reytingi":"Occupancy ranking","Eng ko'p band":"Highest occupancy","Eng kam band":"Lowest occupancy","Avtobus bo'yicha batafsil":"Bus details","Avtobusni tanlang":"Select a bus","Borish":"Outbound","Qaytish":"Return","Yo'lovchi / jami o'rin":"Passengers / total seats","Bo'sh o'rin":"Available seats","Bandlik":"Occupancy","Kassa tushumi":"Cash revenue","Karta tushumi":"Card revenue","To'lovlar":"Payments","Mos reys yo'q":"No matching trips",      "Karta to'lovi DEMO rejimida: hisobotda tasdiqlangan karta buyurtmalari haqiqiy tushum bo'lmasligi mumkin.":"Card payments are in DEMO mode: confirmed card orders in this report may not represent actual revenue.","Reys tanlang":"Select a trip","O'rin tanlang":"Select a seat","Telefon raqami":"Phone number","Yo'lovchi ismi":"Passenger name","To'lov turi":"Payment method","Xaridor to'lovni amalga oshirganini tasdiqlang. Karta to'lovi hozir DEMO, pul haqiqiy yechilmaydi.":"Confirm that the customer has paid. Card payments are currently in DEMO mode; no real charge is made.","Rasmiylashtirish":"Issue ticket","Qabul qilindi":"Recorded","Jadval":"Schedule","Reysga yozish":"Assign passenger","Qidirish":"Search","Reys sanasi":"Trip date","Yo'nalishlar":"Routes","O'rta bandlik":"Average occupancy","Safarlar":"Trips","Batafsil":"Details","Ortga":"Back","Mijoz":"Customer","Narx":"Price","Xalqaro":"International","Yopish":"Close","Kassa":"Cashier","Biriktirilmagan":"Unmatched","Borish reysi":"Outbound trip","Qaytish reysi":"Return trip","To'langan buyurtmalar bo'yicha hisob":"Based on paid orders","Sana oralig'ida reys topilmadi":"No trips in this date range","Sana noto'g'ri":"Invalid date","Sana / jo‘nash":"Date / departure","Yo‘nalish turi":"Trip direction","Yo‘lovchi / jami o‘rin":"Passengers / total seats","Bo‘sh o‘rin":"Available seats"
    }
  };
  TRANSLATIONS.ru['1) "Avtobuslar" va "Shaharlar" bo\'limlarini to\'ldiring. 2) "Reyslar" bo\'limida jo\'nash sanasi va vaqtini kiritib, har bir reysni qo\'lda qo\'shing. 3) "Jadvallar" da bugungi va ertangi reyslarni ko\'ring. 4) Kassada sotilgan o\'rinlarni bloklab qo\'ying.'] =
    '1) Заполните разделы «Автобусы» и «Города». 2) В разделе «Рейсы» добавьте каждый рейс с датой и временем отправления. 3) В «Расписаниях» просматривайте рейсы на сегодня и завтра. 4) Отмечайте проданные в кассе места.';
  TRANSLATIONS.en['1) "Avtobuslar" va "Shaharlar" bo\'limlarini to\'ldiring. 2) "Reyslar" bo\'limida jo\'nash sanasi va vaqtini kiritib, har bir reysni qo\'lda qo\'shing. 3) "Jadvallar" da bugungi va ertangi reyslarni ko\'ring. 4) Kassada sotilgan o\'rinlarni bloklab qo\'ying.'] =
    '1) Complete the Buses and Cities sections. 2) Add each trip manually with its departure date and time in Trips. 3) View today’s and tomorrow’s departures in Schedules. 4) Mark seats sold at the cashier.';
  TRANSLATIONS.ru['Yuklanmoqda…'] = 'Загрузка…';
  TRANSLATIONS.en['Yuklanmoqda…'] = 'Loading…';
  TRANSLATIONS.ru['Sana / jo‘nash'] = 'Дата / отправление';
  TRANSLATIONS.en['Sana / jo‘nash'] = 'Date / departure';
  TRANSLATIONS.ru['Yo‘nalish turi'] = 'Тип рейса';
  TRANSLATIONS.en['Yo‘nalish turi'] = 'Trip direction';
  TRANSLATIONS.ru['Qabul qilindi'] = 'Принято';
  TRANSLATIONS.en['Qabul qilindi'] = 'Recorded';
  TRANSLATIONS.ru['Mijozdan naqd pulni oldingizmi? Tasdiqlansa chipta faollashadi.'] =
    'Получили наличные от клиента? После подтверждения билет будет активирован.';
  TRANSLATIONS.en['Mijozdan naqd pulni oldingizmi? Tasdiqlansa chipta faollashadi.'] =
    'Have you received the cash from the customer? Confirming will activate the ticket.';
  TRANSLATIONS.ru['Karta/terminal to‘lovi haqiqatan tasdiqlandimi? Hozirgi saytdagi karta to‘lovi DEMO, pul haqiqiy yechilmaydi.'] =
    'Оплата картой/терминалом подтверждена? Оплата картой на сайте пока в ДЕМО-режиме, реальные средства не списываются.';
  TRANSLATIONS.en['Karta/terminal to‘lovi haqiqatan tasdiqlandimi? Hozirgi saytdagi karta to‘lovi DEMO, pul haqiqiy yechilmaydi.'] =
    'Has the card/terminal payment been confirmed? Website card payment is currently a DEMO; no real charge is made.';
  TRANSLATIONS.ru['Karta/terminal to‘lovi terminalda haqiqatan tasdiqlandimi? Saytdagi karta to‘lovi DEMO, pul haqiqiy yechilmaydi.'] =
    'Оплата картой/терминалом подтверждена? Оплата картой на сайте пока в ДЕМО-режиме, реальные средства не списываются.';
  TRANSLATIONS.en['Karta/terminal to‘lovi terminalda haqiqatan tasdiqlandimi? Saytdagi karta to‘lovi DEMO, pul haqiqiy yechilmaydi.'] =
    'Has the card/terminal payment been confirmed? Website card payment is currently a DEMO; no real charge is made.';
  [
    ['Avtobus', 'Bus', 'Автобус'],
    ['Bo‘limlar', 'Sections', 'Разделы'],
    ['Hammasi', 'All', 'Все'],
    ['Sana bo‘yicha', 'By date', 'По дате'],
    ['Faol', 'Active', 'Активный'],
    ['Bajarilgan', 'Completed', 'Завершён'],
    ['Arxivlangan', 'Archived', 'В архиве'],
    ['Bekor qilingan', 'Cancelled', 'Отменён'],
    ['Jo‘nab ketdi', 'Departed', 'Отправился'],
    ['Sana/vaqt', 'Date/time', 'Дата/время'],
    ['Raqam', 'Plate', 'Номер'],
    ['Qulayliklar', 'Amenities', 'Удобства'],
    ['Davlat', 'Country', 'Страна'],
    ['Yangi shahar', 'New city', 'Новый город'],
    ['+ Reys qo‘shish', '+ Add a trip', '+ Добавить рейс'],
    ['Kunlik reyslar jadvali', 'Daily trip schedule', 'Расписание рейсов на день'],
    ['Ertangi kunga tayyorlangan avtobuslar', 'Buses scheduled for tomorrow', 'Автобусы на завтра'],
    ['Bugungi avtobuslar', 'Today’s buses', 'Автобусы на сегодня'],
    ['Tayyor', 'Scheduled', 'Подготовлен'],
    ['avtobus', 'bus', 'автобус'],
    ['avtobuslar', 'buses', 'автобусов'],
    ['Bu kunga qo‘lda kiritilgan reys yo‘q', 'No manually added trips for this date', 'На эту дату вручную добавленных рейсов нет'],
    ['Eski andoza yo‘q', 'No old templates', 'Старых шаблонов нет'],
    ['Reyslar topilmadi', 'No trips found', 'Рейсы не найдены'],
    ['Bu eski andozalar reys yaratmaydi. Kerak bo‘lmasa butunlay o‘chirishingiz mumkin.',
      'These old templates do not create trips. Delete them if they are no longer needed.',
      'Эти старые шаблоны не создают рейсы. Удалите их, если они больше не нужны.'],
    ['Bo‘sh eski andoza reyslari ko‘rsatilmaydi. Qo‘lda kiritilgan va chiptasi bor reyslar ro‘yxatda qoladi.',
      'Empty trips from old templates are hidden. Manually entered trips and trips with tickets remain listed.',
      'Пустые рейсы из старых шаблонов скрыты. В списке остаются вручную добавленные рейсы и рейсы с билетами.'],
    ['Davlat kodi UZ bo‘lmasa, reys "Xalqaro" hisoblanadi va yo‘lovchidan pasport so‘raladi.',
      'If the country code is not UZ, the trip is international and passengers must provide a passport.',
      'Если код страны не UZ, рейс считается международным, и пассажиру нужно указать паспорт.'],
    ['QR-kod ostidagi 10 xonali chipta raqamini kiriting (yoki QR skaner matnini qo‘ying).',
      'Enter the 10-digit ticket number below the QR code (or paste the QR scanner text).',
      'Введите 10-значный номер билета под QR-кодом (или вставьте текст сканера QR-кода).'],
    ['Avval reys tanlang', 'Select a trip first', 'Сначала выберите рейс'],
    ['Tanlang', 'Select', 'Выберите'],
    ['Pasport (AA1234567)', 'Passport (AA1234567)', 'Паспорт (AA1234567)'],
    ['Tug‘ilgan sana', 'Date of birth', 'Дата рождения'],
    ['Chipta narxi', 'Ticket price', 'Цена билета'],
    ['Xizmat haqi', 'Service fee', 'Сервисный сбор'],
    ['Jami', 'Total', 'Итого'],
    ['o‘rtacha bandlik', 'average occupancy', 'средняя загрузка'],
    ['Karta to‘lovi DEMO rejimida: haqiqiy pul yechilmaydi. Karta tanlanganda terminalda haqiqiy to‘lov olinganini alohida tasdiqlang.',
      'Card payments are in DEMO mode: no real money is charged. If you select card, confirm that payment was actually received at the terminal.',
      'Оплата картой работает в ДЕМО-режиме: реальные деньги не списываются. При выборе карты подтвердите оплату на терминале.'],
    ['Yo‘lovchilar soni', 'Passengers', 'Количество пассажиров'],
    ['Eng ko‘p band', 'Highest occupancy', 'Наибольшая загрузка'],
    ['Eng kam band', 'Lowest occupancy', 'Наименьшая загрузка'],
    ['Avtobus bo‘yicha batafsil', 'Bus details', 'Подробно по автобусу'],
    ['To‘langan buyurtmalar bo‘yicha hisob. Reyslar bir xil avtobusda, teskari yo‘nalishda va borish reysi yetib kelgandan keyin jo‘nasa, borib-qaytish sifatida bog‘lanadi.',
      'Based on paid orders. Trips are paired as a round trip when the same bus departs in the reverse direction after the outbound trip arrives.',
      'Расчёт по оплаченным заказам. Рейсы объединяются в поездку туда-обратно, если тот же автобус отправляется в обратном направлении после прибытия.'],
    ['Karta to‘lovi DEMO rejimida: hisobotda tasdiqlangan karta buyurtmalari haqiqiy tushum bo‘lmasligi mumkin.',
      'Card payments are in DEMO mode: confirmed card orders in this report may not represent actual revenue.',
      'Оплата картой работает в ДЕМО-режиме: подтверждённые карточные заказы в отчёте могут не быть реальной выручкой.'],
    ['Mahalliy shaharlar', 'Domestic cities', 'Города Узбекистана'],
    ['Xalqaro shaharlar', 'International cities', 'Международные города'],
    ['Barcha shaharlar', 'All cities', 'Все города'],
    ['Xalqaro shahar nomi va davlat kodini kiriting (masalan, KZ). Keyin xalqaro qatnovni “Reyslar” bo‘limida yarating.',
      'Enter the international city and country code (for example, KZ). Then create its trip in the Trips section.',
      'Укажите международный город и код страны (например, KZ). Затем создайте рейс в разделе «Рейсы».'],
    ['Xalqaro reys qo‘shish', 'Add international trip', 'Добавить международный рейс'],
    ['Chipta tekshirish: QR skanerlang yoki ID/10 xonali chipta raqamini kiriting.',
      'Scan the QR code or enter the ticket ID/10-digit ticket number.',
      'Отсканируйте QR-код или введите ID/10-значный номер билета.'],
    ['QR kodi yoki chipta ID si', 'QR code or ticket ID', 'QR-код или ID билета'],
    ['Band qilingan vaqt', 'Reserved at', 'Время бронирования'],
    ['Yo‘nalish', 'Route', 'Маршрут'],
    ['Jo‘nash vaqti', 'Departure time', 'Время отправления'],
    ['Kelish vaqti', 'Arrival time', 'Время прибытия'],
    ['Chipta ID', 'Ticket ID', 'ID билета'],
    ['To‘lov holati', 'Payment status', 'Статус оплаты'],
    ['Kassada naqd pul olindi, to‘lovni tasdiqlaysizmi?', 'Cash received at the cashier. Confirm the payment?', 'Наличные получены в кассе. Подтвердить оплату?'],
    ['Naqd to‘lov tasdiqlandi, chipta faollashtirildi', 'Cash payment confirmed and ticket activated', 'Оплата наличными подтверждена, билет активирован'],
    ['To‘lov tasdiqlandi', 'Payment confirmed', 'Оплата подтверждена'],
    ['Chipta faol', 'Ticket is valid', 'Билет действителен'],
    ['Chipta faol emas', 'Ticket is not valid', 'Билет недействителен'],
    ['Yangi jo‘nash sanasi va vaqti (YYYY-MM-DDTHH:MM):', 'New departure date and time (YYYY-MM-DDTHH:MM):', 'Новые дата и время отправления (YYYY-MM-DDTHH:MM):'],
    ['Reys yangi sana/vaqtga ko‘chirildi, yo‘lovchilarga bildirishnoma yuborildi', 'Trip rescheduled; passengers have been notified', 'Рейс перенесён; пассажиры уведомлены'],
    ['Avtobus chiptasi', 'Bus ticket', 'Автобусный билет'],
    ['Chiptani chop etish', 'Print ticket', 'Распечатать билет'],
    ['Chipta raqami', 'Ticket number', 'Номер билета'],
    ['Chipta ID si yoki raqami noto‘g‘ri', 'Invalid ticket ID or number', 'Неверный ID или номер билета'],
    ['Buyurtmalarni telefon, ism/familiya yoki chipta raqami orqali qidiring.',
      'Search orders by phone, first/last name, or ticket number.',
      'Ищите заказы по телефону, имени/фамилии или номеру билета.'],
    ['Telefon, ism/familiya yoki chipta raqami', 'Phone, name, or ticket number', 'Телефон, имя или номер билета'],
    ['Qidirish', 'Search', 'Поиск'],
    ['Tozalash', 'Clear', 'Очистить'],
    ['Buyurtmalar', 'Orders', 'Заказы'],
    ['Buyurtma topilmadi', 'No orders found', 'Заказы не найдены'],
    ['Buyurtma ma’lumotlari', 'Order details', 'Данные заказа'],
    ['Chiptalarni ko‘rish', 'View tickets', 'Посмотреть билеты'],
    ['Chiptalar', 'Tickets', 'Билеты'],
    ['Chipta summasi', 'Ticket amount', 'Сумма за билет'],
    ['To‘lov usuli', 'Payment method', 'Способ оплаты'],
    ['To‘lov holati', 'Payment status', 'Статус оплаты'],
    ['Chipta QR kodi', 'Ticket QR code', 'QR-код билета'],
    ['QR skaner uchun maydonni faollashtirish', 'Activate scanner input', 'Активировать поле сканера'],
    ['QR skaner ulang va chiptani skanerlang yoki ID/raqamni qo‘lda kiriting.',
      'Connect a QR scanner and scan a ticket, or enter its ID/number manually.',
      'Подключите QR-сканер и отсканируйте билет или введите ID/номер вручную.'],
    ['Kamera bilan QR skanerlash', 'Scan QR with camera', 'Сканировать QR камерой'],
    ['Kamerani o‘chirish', 'Stop camera', 'Выключить камеру'],
    ['Kamera tanlang', 'Select camera', 'Выберите камеру'],
    ['Kameraga ruxsat berilmadi. Brauzer sozlamalarida kameraga ruxsat bering.',
      'Camera access was denied. Allow camera access in your browser settings.',
      'Нет доступа к камере. Разрешите доступ в настройках браузера.'],
    ['Kamera topilmadi', 'No camera found', 'Камера не найдена'],
    ['Kamera ishga tushmadi', 'Could not start camera', 'Не удалось запустить камеру'],
    ['Bu brauzer kameradan QR o‘qishni qo‘llamaydi. ID yoki chipta raqamini kiriting.',
      'This browser cannot scan QR codes from a camera. Enter the ticket ID or number.',
      'Этот браузер не поддерживает сканирование QR камерой. Введите ID или номер билета.'],
    ['QR kodni kameraga ko‘rsating', 'Point the camera at the QR code', 'Наведите камеру на QR-код'],
    ['QR kodi o‘qildi', 'QR code scanned', 'QR-код отсканирован'],
    ['Chipta chop etish', 'Print ticket', 'Распечатать билет'],
    ['Yo‘lovchi reysga kechikkan bo‘lsa, jo‘nashdan 24 soat ichida bog‘lanishi kerak.',
      'If a passenger misses the bus, they must contact support within 24 hours of departure.',
      'Если пассажир опоздал на рейс, он должен связаться с поддержкой в течение 24 часов после отправления.'],
    ['Yo‘lovchilar ro‘yxatini ko‘rish', 'View passenger list', 'Посмотреть список пассажиров'],
    ['Yo‘lovchilar', 'Passengers', 'Пассажиры'],
    ['Ism familiya', 'Full name', 'Фамилия и имя'],
    ['Yo‘lovchilar topilmadi', 'No passengers found', 'Пассажиры не найдены'],
    ['Yo‘lovchi ma’lumotlari yuklanmadi', 'Could not load passenger details', 'Не удалось загрузить данные пассажиров'],
    ['reys', 'trips', 'рейсов'], ['borib-qaytish', 'round trips', 'поездок туда-обратно'], ['yo‘lovchi', 'passengers', 'пассажиров']
  ].forEach(function (item) {
    TRANSLATIONS.en[item[0]] = item[1];
    TRANSLATIONS.ru[item[0]] = item[2];
  });
  var NORMALIZED_TRANSLATIONS = { en: {}, ru: {} };
  ['en', 'ru'].forEach(function (lang) {
    Object.keys(TRANSLATIONS[lang]).forEach(function (key) {
      NORMALIZED_TRANSLATIONS[lang][key.replace(/[‘’`]/g, "'")] = TRANSLATIONS[lang][key];
    });
  });
  function tr(value) {
    var dictionary = TRANSLATIONS[LANG];
    if (!dictionary) return value;
    return dictionary[value] || NORMALIZED_TRANSLATIONS[LANG][value.replace(/[‘’`]/g, "'")] || value;
  }
  var sourceText = new WeakMap(), sourceAttributes = new WeakMap();
  function localize(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), node;
    while ((node = walker.nextNode())) {
      var value = node.nodeValue, trimmed = value.trim(), original = sourceText.get(node);
      if (original === undefined) { original = trimmed; sourceText.set(node, original); }
      if (trimmed) node.nodeValue = value.replace(trimmed, tr(original));
    }
    root.querySelectorAll('[placeholder], [title], [aria-label]').forEach(function (el) {
      var originals = sourceAttributes.get(el);
      if (!originals) { originals = {}; sourceAttributes.set(el, originals); }
      ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
        var value = el.getAttribute(attr);
        if (value) {
          if (originals[attr] === undefined) originals[attr] = value;
          el.setAttribute(attr, tr(originals[attr]));
        }
      });
    });
  }
  function setLanguage(lang) {
    LANG = ['uz', 'ru', 'en'].includes(lang) ? lang : 'uz';
    document.documentElement.lang = LANG;
    try { localStorage.setItem('adminLang', LANG); } catch (e) { /* ignore */ }
    document.querySelectorAll('[data-admin-lang]').forEach(function (select) { select.value = LANG; });
    localize($('#shell'));
    localize($('#login'));
    if (!$('#shell').hidden && TOKEN) {
      localize(main);
      refreshDynamicLabels(main);
    }
  }
  document.querySelectorAll('[data-admin-lang]').forEach(function (select) {
    select.value = LANG;
    select.addEventListener('change', function () { setLanguage(select.value); });
  });
  localize($('#login'));

  var ERR = {
    bad_credentials: "Parol noto'g'ri", unauthorized: 'Sessiya tugadi, qaytadan kiring', too_many_tries: "Urinishlar ko'p, 5 daqiqadan keyin urinib ko'ring",
    in_use: "Bu yozuv ishlatilmoqda, o'chirib bo'lmaydi", bad_time: "Vaqt noto'g'ri", same_city: 'Shaharlar bir xil', seat_taken: "O'rinda yo'lovchi bor",
    ticket_not_found: 'Chipta topilmadi', bad_ticket_id: 'Chipta ID si yoki raqami noto‘g‘ri', cash_cutoff: 'Jo‘nashga bir soatdan kam qolganda naqd buyurtma qabul qilinmaydi', bad_name: "Nom kiriting", bad_price: "Narx noto'g'ri", bad_duration: "Davomiylik noto'g'ri", bad_seats: "O'rinlar soni noto'g'ri",
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
    bad_trip: 'Reysni tanlang', bad_fio: 'Yo‘lovchi ismini to‘g‘ri kiriting', bad_gender: 'Jinsni tanlang',
    bad_phone: 'Telefon raqamini to‘g‘ri kiriting', bad_payment_method: 'To‘lov usulini tanlang',
    bad_date: 'Sana oralig‘i noto‘g‘ri', bad_passport: 'Pasport ma’lumotini to‘g‘ri kiriting',
    bad_birth: 'Tug‘ilgan sanani to‘g‘ri kiriting'
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
  function fail(e) { toast(tr(ERR[e.code] || ("Xatolik: " + (e.code || e.message))), 'err'); }

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
    }).catch(function (err) { $('#le').textContent = tr(ERR[err.code] || 'Xatolik'); });
  });
  $('#out').addEventListener('click', showLogin);

  /* ---------- bo'limlar ---------- */
  var TABS = [['dash', 'Boshqaruv'], ['trips', 'Reyslar'], ['sched', 'Jadvallar'], ['buses', 'Avtobuslar'], ['cities', 'Shaharlar'], ['orders', 'Buyurtmalar'], ['sales', 'Sotuv'], ['reports', 'Hisobot'], ['check', 'Chipta tekshirish']];
  var cache = { cities: [], buses: [] };
  var cur = 'dash';
  var stopActiveCamera = function () {};
  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(function (t) { return '<button type="button" data-tab="' + t[0] + '"' + (t[0] === cur ? ' aria-current="page"' : '') + '>' + tr(t[1]) + '</button>'; }).join('');
  }
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });

  function start() {
    $('#login').hidden = true; $('#shell').hidden = false;
    localize($('#shell'));
    Promise.all([api('GET', '/cities'), api('GET', '/buses')]).then(function (r) { cache.cities = r[0]; cache.buses = r[1]; go(cur); }).catch(fail);
  }
  function go(tab) {
    stopActiveCamera();
    cur = tab; renderTabs();
    main.innerHTML = '<div class="spin"></div>';
    ({ dash: dash, trips: trips, sched: sched, buses: buses, cities: cities, orders: orders, sales: sales, reports: reports, check: check })[tab]()
      .then(function () { localize(main); }).catch(fail);
  }

  var cityOpts = function (sel) { return cache.cities.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c['name_' + LANG] || c.name_uz) + (c.country !== 'UZ' ? ' (' + esc(c.country) + ')' : '') + '</option>'; }).join(''); };
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
  var tripDate = '', tripArchive = false, tripFormOpen = false;
  function trips() {
    var query = new URLSearchParams();
    if (tripDate) query.set('date', tripDate);
    if (tripArchive) query.set('archive', '1');
    return api('GET', '/trips' + (query.toString() ? '?' + query : '')).then(function (list) {
      main.innerHTML = '<h1>' + (tripArchive ? 'Reyslar tarixi va arxiv' : 'Reyslar') + '</h1>' +
        '<div class="row" style="margin-bottom:12px"><button class="btn ' + (!tripArchive ? 'btn-lime' : 'btn-ghost') + ' sm" id="activeTrips" type="button">Faol reyslar</button><button class="btn ' + (tripArchive ? 'btn-lime' : 'btn-ghost') + ' sm" id="archivedTrips" type="button">Tarix / arxiv</button></div>' +
        (!tripArchive ? '<details class="card"' + (tripFormOpen ? ' open' : '') + '><summary style="font-weight:800;cursor:pointer">+ Yagona reys qo\'shish</summary><form id="nt" class="stack" style="margin-top:14px"><div class="row">' +
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
          return '<tr data-id="' + t.id + '"><td><b>' + esc(t.departAt) + '</b>' + (t.noticeReason ? '<div class="hint">Sabab: ' + esc(t.noticeReason) + '</div>' : '') + '</td><td>' + esc(cityName(t.from)) + ' → ' + esc(cityName(t.to)) + '</td><td>' + esc(t.bus.name) + '</td>' +
            '<td>' + (active ? '<input class="inp s" style="width:120px" type="number" step="1000" min="1000" data-f="price" value="' + t.price + '">' : money(t.price)) + '</td>' +
            '<td>' + (active ? '<input class="inp s" style="width:70px" data-f="platform" maxlength="10" value="' + esc(t.platform) + '">' : esc(t.platform || '—')) + '</td>' +
            '<td>' + t.free + ' / ' + t.total + (t.bookedCount ? '<div class="hint">' + t.bookedCount + ' chipta</div>' : '') + '</td><td><span class="pill ' + (active ? 'ok' : 'cancel') + '">' + state + '</span></td>' +
            '<td style="white-space:nowrap">' +
            (t.bookedCount ? '<button class="btn btn-ghost xs" data-a="move">Yo\'lovchilarni ko\'chirish</button> ' : '') +
            (active ? '<button class="btn btn-ghost xs" data-a="seats">O\'rinlar</button> <button class="btn btn-ghost xs" data-a="save">Saqlash</button> <button class="btn btn-ghost xs" data-a="reschedule">Reysni ko‘chirish</button> <button class="btn btn-ghost xs" data-a="cancel">Bekor qilish</button> <button class="btn btn-danger xs" data-a="delete">O\'chirish</button>' : '') +
            '</td></tr>';
        }).join('') : '<tr><td colspan="8" class="muted">Reyslar topilmadi</td></tr>') + '</tbody></table></div><div id="seatpanel"></div>';

      $('#activeTrips').addEventListener('click', function () { tripArchive = false; tripDate = ''; go('trips'); });
      $('#archivedTrips').addEventListener('click', function () { tripArchive = true; tripDate = ''; go('trips'); });
      $('#fd').addEventListener('change', function (e) { tripDate = e.target.value; go('trips'); });
      $('#fc').addEventListener('click', function () { tripDate = ''; go('trips'); });
      if (!tripArchive) $('#nt').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, v = {};
        ['from_id', 'to_id', 'depart_at', 'duration_min', 'price', 'bus_id', 'platform'].forEach(function (k) { v[k] = f[k].value; });
      api('POST', '/trips', v).then(function () { tripFormOpen = false; toast("Reys qo'shildi", 'ok'); go('trips'); }).catch(fail);
      });
      main.querySelector('tbody').addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        var row = b.closest('tr'), id = row.dataset.id;
        if (b.dataset.a === 'seats') { openSeats(id); return; }
        if (b.dataset.a === 'move') { openMoves(id); return; }
        if (b.dataset.a === 'reschedule') {
          var newTime = prompt(tr("Yangi jo‘nash sanasi va vaqti (YYYY-MM-DDTHH:MM):"), row.querySelector('td b').textContent.replace(' ', 'T'));
          if (!newTime) return;
          var reason = prompt("Yo'lovchilarga ko'rsatiladigan sabab:", '');
          if (!reason) return;
          api('PUT', '/trips/' + id + '/reschedule', { depart_at: newTime, reason: reason }).then(function () {
            toast(tr("Reys yangi sana/vaqtga ko'chirildi, yo'lovchilarga bildirishnoma yuborildi"), 'ok'); go('trips');
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
        var price = row.querySelector('[data-f=price]').value, plat = row.querySelector('[data-f=platform]').value;
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
      localize($('#seatpanel'));
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
      $('#seatpanel').innerHTML = '<div class="card"><h2 style="margin-bottom:6px">' + esc(cityName(d.trip.from)) + ' → ' + esc(cityName(d.trip.to)) + ', ' + esc(d.trip.departAt) + '</h2>' +
        '<p class="muted" style="margin-top:0">Bo\'sh o\'rinni bosing: kassada sotildi deb bloklanadi. Bloklangan o\'rinni bossangiz, blok olinadi. Ko\'k/pushti: sotilgan.</p>' +
        '<div class="seatgrid"><div class="bus" style="max-width:300px"><div class="stack" style="gap:10px">' + grid + '</div></div><div id="seatinfo" class="stack"><p class="muted">O\'rin tanlang.</p></div></div></div>';
      localize($('#seatpanel'));
      $('#seatpanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      // onclick (addEventListener emas): oyna qayta ochilganda eski tinglovchilar to'planib qolmasin
      $('#seatpanel').onclick = function (e) {
        var b = e.target.closest('[data-no]'); if (!b) return;
        var s = d.seats[+b.dataset.no - 1], info = $('#seatinfo');
        document.querySelectorAll('.aseat.on').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
        if (s.status === 'taken') {
          info.innerHTML = '<h2>' + s.no + '-o\'rin: sotilgan</h2><div class="sum-row"><span class="muted">Yo\'lovchi</span><b>' + esc(s.fio) + '</b></div><div class="sum-row"><span class="muted">Jins</span><b>' + (s.gender === 'f' ? 'Ayol' : 'Erkak') + '</b></div><div class="sum-row"><span class="muted">Telefon</span><b>' + esc(s.phone) + '</b></div><div class="sum-row"><span class="muted">Chipta</span><b>' + esc(s.number) + '</b></div>' + (s.pending ? '<div class="note warn">To\'lov kutilmoqda</div>' : '');
          localize(info);
        } else if (s.status === 'blocked') {
          info.innerHTML = '<h2>' + s.no + '-o\'rin: bloklangan</h2><p class="muted">Sabab: ' + esc(s.reason) + '</p><button class="btn btn-danger sm" id="ub">Blokni olib tashlash</button>';
          localize(info);
          $('#ub').addEventListener('click', function () { api('DELETE', '/trips/' + id + '/block/' + s.no).then(function () { toast("Blok olib tashlandi", 'ok'); openSeats(id); }).catch(fail); });
        } else {
          info.innerHTML = '<h2>' + s.no + '-o\'rin: bo\'sh</h2>' + fld('Sabab', '<input class="inp s" id="br" value="kassa" maxlength="60">') + '<button class="btn sm" id="bb">Bloklash (saytda band bo\'ladi)</button>';
          localize(info);
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
        var busCount = LANG === 'uz' ? list.length + ' ta avtobus' :
          list.length + ' ' + tr(list.length === 1 ? 'avtobus' : 'avtobuslar');
        return '<section><h2>' + title + ' <span class="muted">(' + esc(date) + ', ' + busCount + ')</span></h2>' +
          '<div class="card scroll"><table class="tbl"><thead><tr><th>Jo\'nash</th><th>Yo\'nalish</th><th>Avtobus</th><th>Bo\'sh o\'rin</th><th>Narx</th><th>Peron</th><th>Holat</th></tr></thead><tbody>' +
          (list.length ? list.map(function (t) {
            var departed = t.departAt <= localNow;
            return '<tr><td><b>' + esc(t.departAt.slice(11, 16)) + '</b></td><td>' + esc(cityName(t.from)) + ' → ' + esc(cityName(t.to)) + '</td><td>' + esc(t.bus.name) + '</td>' +
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
          return '<tr data-id="' + s.id + '"><td>' + esc(s['f_' + LANG] || s.f_uz) + ' → ' + esc(s['c_' + LANG] || s.c_uz) + '</td><td>' + esc(s.depart_time) + '</td><td>' + esc(s.bus_name) + '</td>' +
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
  var cityScope = 'all';
  function cities() {
    return api('GET', '/cities').then(function (list) {
      cache.cities = list;
      main.innerHTML = '<h1>Shaharlar</h1>' +
        '<form id="nc" class="card stack"><h2>Yangi shahar</h2><div class="row">' + fld("O'zbekcha", '<input class="inp s" name="name_uz" required maxlength="60">') + fld('Ruscha', '<input class="inp s" name="name_ru" maxlength="60">') +
        fld('Inglizcha', '<input class="inp s" name="name_en" maxlength="60">') + fld('Davlat kodi', '<input class="inp s" name="country" value="UZ" maxlength="2" style="text-transform:uppercase">') +
        '<button class="btn sm btn-lime" type="submit">Qo\'shish</button></div><p class="hint" style="margin:0">Davlat kodi UZ bo\'lmasa, reys "Xalqaro" hisoblanadi va yo\'lovchidan pasport so\'raladi.</p></form>' +
        '<p class="hint"><span>Xalqaro shahar nomi va davlat kodini kiriting (masalan, KZ). Keyin xalqaro qatnovni “Reyslar” bo‘limida yarating.</span> ' +
        '<button class="btn btn-ghost xs" type="button" id="addInternationalTrip">Xalqaro reys qo‘shish</button></p>' +
        '<div class="row city-scopes" role="group">' +
        '<button class="btn btn-ghost sm" type="button" data-city-scope="all">Barcha shaharlar</button>' +
        '<button class="btn btn-ghost sm" type="button" data-city-scope="local">Mahalliy shaharlar</button>' +
        '<button class="btn btn-ghost sm" type="button" data-city-scope="international">Xalqaro shaharlar</button></div>' +
        '<div id="cityRows" class="card scroll"></div>';
      function renderCityRows() {
        var visible = list.filter(function (city) {
          return cityScope === 'all' || (cityScope === 'local' ? city.country === 'UZ' : city.country !== 'UZ');
        });
        $('#cityRows').innerHTML = '<table class="tbl"><thead><tr><th>#</th><th>O\'zbekcha</th><th>Ruscha</th><th>Inglizcha</th><th>Davlat</th><th></th></tr></thead><tbody>' +
          (visible.length ? visible.map(function (c) {
            return '<tr data-id="' + c.id + '"><td>' + c.id + '</td><td>' + esc(c.name_uz) + '</td><td>' + esc(c.name_ru) + '</td><td>' + esc(c.name_en) + '</td><td>' + esc(c.country) + '</td><td><button class="btn btn-danger xs">O\'chirish</button></td></tr>';
          }).join('') : '<tr><td colspan="6" class="muted">Shaharlar topilmadi</td></tr>') + '</tbody></table>';
        localize($('#cityRows'));
      }
      renderCityRows();
      main.querySelectorAll('[data-city-scope]').forEach(function (button) {
        button.classList.toggle('btn-lime', button.dataset.cityScope === cityScope);
        button.addEventListener('click', function () {
          cityScope = button.dataset.cityScope;
          var countryInput = $('#nc').elements.country;
          if (cityScope === 'international' && countryInput.value.toUpperCase() === 'UZ') countryInput.value = 'KZ';
          if (cityScope === 'local') countryInput.value = 'UZ';
          main.querySelectorAll('[data-city-scope]').forEach(function (item) {
            item.classList.toggle('btn-lime', item.dataset.cityScope === cityScope);
          });
          renderCityRows();
        });
      });
      $('#addInternationalTrip').addEventListener('click', function () { tripFormOpen = true; go('trips'); });
      $('#nc').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, v = {};
        ['name_uz', 'name_ru', 'name_en', 'country'].forEach(function (k) { v[k] = f[k].value; });
        api('POST', '/cities', v).then(function () { toast("Shahar qo'shildi", 'ok'); go('cities'); }).catch(fail);
      });
      $('#cityRows').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b || !confirm("Shahar o'chirilsinmi?")) return;
        api('DELETE', '/cities/' + b.closest('tr').dataset.id).then(function () { go('cities'); }).catch(fail);
      });
    });
  }

  /* ---------- kassada mijozni reysga joylashtirish ---------- */
  var saleTripId = '';
  var salesTripList = [];
  function sales() {
    return Promise.all([api('GET', '/trips'), api('GET', '/sales-config')]).then(function (results) {
      var list = results[0], saleConfig = results[1];
      list = list.filter(function (trip) { return trip.status === 'active'; });
      salesTripList = list;
      main.innerHTML = '<h1>Mijozni reysga joylashtirish</h1>' +
        (saleConfig.demoCardPayments ? '<div class="note warn">Karta to‘lovi DEMO rejimida: haqiqiy pul yechilmaydi. Karta tanlanganda terminalda haqiqiy to‘lov olinganini alohida tasdiqlang.</div>' : '') +
        '<form id="saleForm" class="card stack"><div class="row">' +
        fld('Reys tanlang', '<select class="inp s" name="tripId" required><option value="">Reys tanlang</option>' +
          list.map(function (trip) {
            return '<option value="' + trip.id + '"' + (String(trip.id) === String(saleTripId) ? ' selected' : '') + '>' +
              esc(trip.from[LANG] || trip.from.uz) + ' → ' + esc(trip.to[LANG] || trip.to.uz) + ' · ' + esc(trip.departAt) +
              ' · ' + esc(trip.bus.name) + ' · ' + money(trip.price) + '</option>';
          }).join('') + '</select>') +
        '<div id="saleAmount" class="note" hidden></div>' +
        fld('O‘rin tanlang', '<select class="inp s" name="seat" required disabled><option value="">Avval reys tanlang</option></select>') +
        fld('Yo‘lovchi ismi', '<input class="inp s" name="fio" required maxlength="60">') +
        fld('Telefon raqami', '<input class="inp s" name="phone" required autocomplete="tel" placeholder="+998901234567">') +
        fld('Jins', '<select class="inp s" name="gender" required><option value="">Tanlang</option><option value="m">Erkak</option><option value="f">Ayol</option></select>') +
        fld('To‘lov turi', '<select class="inp s" name="paymentMethod" required><option value="cash">Naqd</option><option value="card">Karta</option></select>') +
        '<div id="intlFields" class="row" hidden>' +
        fld('Pasport (AA1234567)', '<input class="inp s" name="passport" maxlength="9">') +
        fld('Tug‘ilgan sana', '<input class="inp s" type="date" name="birth">') + '</div>' +
        '</div><button class="btn btn-lime sm" type="submit">Chiptani rasmiylashtirish</button></form><div id="saleResult" aria-live="polite"></div>';
      var form = $('#saleForm');
      var seatSelect = form.elements.seat;
      function updateAmount() {
        var trip = list.find(function (item) { return String(item.id) === form.elements.tripId.value; });
        var amountBox = $('#saleAmount');
        if (!trip) { amountBox.hidden = true; return; }
        var amount = trip.price, fee = Math.round(amount * saleConfig.feePercent / 100);
        amountBox.hidden = false;
        amountBox.innerHTML = '<span>Chipta narxi</span>: ' + esc(money(amount)) + ' · ' +
          '<span>Xizmat haqi</span>: ' + esc(money(fee)) + ' · <span>Jami</span>: ' + esc(money(amount + fee));
        localize(amountBox);
      }
      form.elements.tripId.addEventListener('change', function () {
        saleTripId = form.elements.tripId.value;
        updateAmount();
        seatSelect.disabled = true;
        seatSelect.innerHTML = '<option value="">Yuklanmoqda…</option>';
        if (!saleTripId) { seatSelect.innerHTML = '<option value="">Avval reys tanlang</option>'; return; }
        api('GET', '/trips/' + saleTripId + '/seats').then(function (data) {
          $('#intlFields').hidden = !data.trip.foreign;
          var free = data.seats.filter(function (seat) { return seat.status === 'free'; });
          seatSelect.innerHTML = '<option value="">O‘rin tanlang</option>' + free.map(function (seat) {
            return '<option value="' + seat.no + '">' + seat.no + '</option>';
          }).join('');
          seatSelect.disabled = free.length === 0;
          if (!free.length) seatSelect.innerHTML = '<option value="">Bo‘sh o‘rin yo‘q</option>';
        }).catch(fail);
      });
      if (saleTripId) form.elements.tripId.dispatchEvent(new Event('change'));
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var method = form.elements.paymentMethod.value;
        var confirmation = method === 'cash'
          ? 'Mijozdan naqd pulni oldingizmi? Tasdiqlansa chipta faollashadi.'
          : (saleConfig.demoCardPayments
            ? 'Karta/terminal to‘lovi terminalda haqiqatan tasdiqlandimi? Saytdagi karta to‘lovi DEMO, pul haqiqiy yechilmaydi.'
            : 'Karta/terminal to‘lovi haqiqatan tasdiqlandimi? Tasdiqlansa chipta faollashadi.');
        if (!confirm(tr(confirmation))) return;
        var submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        api('POST', '/trips/' + form.elements.tripId.value + '/sales', {
          seat: form.elements.seat.value, fio: form.elements.fio.value, phone: form.elements.phone.value,
          gender: form.elements.gender.value, paymentMethod: form.elements.paymentMethod.value,
          passport: form.elements.passport.value, birth: form.elements.birth.value
        }).then(function (result) {
          var trip = list.find(function (item) { return String(item.id) === form.elements.tripId.value; });
          $('#saleResult').innerHTML = '<article class="cash-ticket-print card"><div><h2>Avtobus chiptasi</h2>' +
            '<p><b>Chipta ID:</b> ' + esc(result.ticketId) + '</p><p><b>Chipta raqami:</b> ' + esc(result.ticketNumber) + '</p>' +
            '<p><b>Yo‘lovchi:</b> ' + esc(result.fio) + '</p><p><b>Telefon:</b> ' + esc(result.phone) + '</p>' +
            '<p><b>Yo‘nalish:</b> ' + esc(cityName(trip.from)) + ' → ' + esc(cityName(trip.to)) + '</p>' +
            '<p><b>Jo‘nash:</b> ' + esc(trip.departAt) + '</p><p><b>O‘rin:</b> ' + result.seat + '</p>' +
            '<p><b>To‘lov usuli:</b> ' + tr(result.paymentMethod === 'cash' ? 'Naqd pul' : 'Bank kartasi') + '</p>' +
            '<p><b>Band qilingan vaqt:</b> ' + esc(result.bookedAt) + '</p><p><b>Summa:</b> ' + money(result.total) + '</p>' +
            '<p><b>Buyurtma:</b> ' + esc(result.orderId) + '</p></div><img src="/api/tickets/' +
            encodeURIComponent(result.ticketId) + '/qr.svg" alt="Chipta QR kodi" width="180" height="180">' +
            '<button class="btn btn-lime sm no-print" id="printCashTicket" type="button">Chiptani chop etish</button></article>';
          form.elements.fio.value = '';
          form.elements.phone.value = '';
          toast('Chipta rasmiylashtirildi', 'ok');
          localize($('#saleResult'));
          $('#printCashTicket').addEventListener('click', function () {
            document.body.classList.add('cash-ticket-printing');
            window.addEventListener('afterprint', function () { document.body.classList.remove('cash-ticket-printing'); }, { once: true });
            window.print();
          });
          form.elements.tripId.dispatchEvent(new Event('change'));
          submit.disabled = false;
        }).catch(function (error) { submit.disabled = false; fail(error); });
      });
    });
  }

  /* ---------- avtobuslar va reyslar hisoboti ---------- */
  var reportData = null;
  var reportFrom = '', reportTo = '', reportBus = '';
  var cityName = function (city) { return city[LANG] || city.uz; };
  function cityLabel(city) {
    var uz = city.uz || city.name_uz || '';
    return '<span data-city-label data-city-uz="' + esc(uz) + '" data-city-ru="' +
      esc(city.ru || city.name_ru || uz) + '" data-city-en="' + esc(city.en || city.name_en || uz) + '">' +
      esc(cityName(city)) + '</span>';
  }
  function refreshDynamicLabels(root) {
    if (!root) return;
    root.querySelectorAll('[data-city-label]').forEach(function (element) {
      element.textContent = element.getAttribute('data-city-' + LANG) || element.getAttribute('data-city-uz') || '';
    });
    var tripSelect = $('select[name="tripId"]', root);
    if (!tripSelect || !salesTripList) return;
    Array.from(tripSelect.options).forEach(function (option) {
      var trip = salesTripList.find(function (item) { return String(item.id) === option.value; });
      if (trip) option.textContent = cityName(trip.from) + ' → ' + cityName(trip.to) + ' · ' +
        trip.departAt + ' · ' + trip.bus.name + ' · ' + money(trip.price);
    });
  }
  function reportTripRows(bus) {
    return bus.trips.map(function (trip) {
      return '<tr><td>' + esc(trip.departAt) + '</td><td><span>' + (trip.isReturn ? 'Qaytish' : 'Borish') + '</span>' + (trip.pairedTripId ? ' · #' + trip.pairedTripId : '') +
        '</td><td>' + cityLabel(trip.from) + ' → ' + cityLabel(trip.to) + '</td>' +
        '<td><button class="report-passenger-count" type="button" data-report-passengers="' + trip.id +
        '" aria-expanded="false" title="Yo‘lovchilar ro‘yxatini ko‘rish">' + trip.passengers + ' / ' + trip.totalSeats + '</button></td><td>' + trip.freeSeats + '</td><td>' + trip.occupancy + '%</td>' +
        '<td>' + money(trip.revenue) + '</td><td>' + money(trip.cashRevenue) + '</td><td>' + money(trip.cardRevenue) + '</td></tr>' +
        '<tr class="report-passengers" hidden><td colspan="9"><div class="report-passenger-panel"></div></td></tr>';
    }).join('');
  }
  function renderReports(data) {
    reportData = data;
    var visibleBuses = reportBus ? data.buses.filter(function (bus) { return String(bus.id) === reportBus; }) : data.buses;
    var totals = visibleBuses.reduce(function (sum, bus) {
      sum.trips += bus.tripCount;
      sum.roundTrips += bus.roundTrips;
      sum.passengers += bus.passengers;
      sum.revenue += bus.revenue;
      return sum;
    }, { trips: 0, roundTrips: 0, passengers: 0, revenue: 0 });
    var busCards = visibleBuses.map(function (bus) {
      return '<details class="card bus-report"><summary><b>' + esc(bus.name) + '</b>' +
        (bus.model ? ' · ' + esc(bus.model) : '') + (bus.plate ? ' · ' + esc(bus.plate) : '') +
        ' <span class="muted">· ' + bus.tripCount + ' <span>reys</span> · ' + bus.roundTrips + ' <span>borib-qaytish</span> · ' +
        bus.averageOccupancy + '% <span>o‘rtacha bandlik</span> · ' +
        bus.passengers + ' <span>yo‘lovchi</span> · ' + money(bus.revenue) + '</span></summary>' +
        '<div class="scroll"><table class="tbl"><thead><tr><th>Sana / jo‘nash</th><th>Yo‘nalish turi</th><th>Yo‘nalish</th>' +
        '<th>Yo‘lovchi / jami o‘rin</th><th>Bo‘sh o‘rin</th><th>Bandlik</th><th>Tushum</th><th>Kassa tushumi</th><th>Karta tushumi</th></tr></thead><tbody>' +
        (bus.trips.length ? reportTripRows(bus) : '<tr><td colspan="9" class="muted">Reyslar topilmadi</td></tr>') +
        '</tbody></table></div></details>';
    }).join('');
    main.innerHTML = '<h1>Daromad hisoboti</h1>' +
      (data.demoCardPayments ? '<div class="note warn no-print">Karta to‘lovi DEMO rejimida: hisobotda tasdiqlangan karta buyurtmalari haqiqiy tushum bo‘lmasligi mumkin.</div>' : '') +
      '<form id="reportFilters" class="card row no-print">' +
      fld('Boshlanish sanasi', '<input class="inp s" type="date" name="from" value="' + esc(reportFrom) + '">') +
      fld('Tugash sanasi', '<input class="inp s" type="date" name="to" value="' + esc(reportTo) + '">') +
      fld('Avtobus', '<select class="inp s" name="bus"><option value="">Hammasi</option>' + data.buses.map(function (bus) {
        return '<option value="' + bus.id + '"' + (String(bus.id) === reportBus ? ' selected' : '') + '>' +
          esc(bus.name) + (bus.plate ? ' · ' + esc(bus.plate) : '') + '</option>';
      }).join('') + '</select>') +
      '<button class="btn btn-lime sm" type="submit">Hisobotni ko‘rish</button>' +
      '<button class="btn btn-ghost sm" id="reportCsv" type="button">Excelga yuklab olish (CSV)</button>' +
      '<button class="btn btn-ghost sm" type="button" onclick="window.print()">Chop etish</button></form>' +
      '<p class="hint">To‘langan buyurtmalar bo‘yicha hisob. Reyslar bir xil avtobusda, teskari yo‘nalishda va borish reysi yetib kelgandan keyin jo‘nasa, borib-qaytish sifatida bog‘lanadi.</p>' +
      '<div class="stats"><div class="stat"><span>Jami tushum</span><b style="font-size:22px">' + money(totals.revenue) + '</b></div>' +
      '<div class="stat"><span>Reyslar soni</span><b>' + totals.trips + '</b></div>' +
      '<div class="stat"><span>Borib-qaytish</span><b>' + totals.roundTrips + '</b></div>' +
      '<div class="stat"><span>Yo‘lovchilar soni</span><b>' + totals.passengers + '</b></div></div>' +
      '<h2>Avtobus bo‘yicha batafsil</h2>' +
      (busCards || '<div class="card muted">Sana oralig‘ida reys topilmadi</div>');
    localize(main);
    $('#reportFilters').addEventListener('submit', function (event) {
      event.preventDefault();
      reportFrom = event.target.elements.from.value;
      reportTo = event.target.elements.to.value;
      reportBus = event.target.elements.bus.value;
      reports();
    });
    $('#reportCsv').addEventListener('click', exportReport);
  }
  main.addEventListener('click', function (event) {
    var button = event.target.closest('[data-report-passengers]');
    if (!button || !main.contains(button)) return;
    var detailsRow = button.closest('tr').nextElementSibling;
    var panel = detailsRow && detailsRow.querySelector('.report-passenger-panel');
    if (!panel) return;
    if (button.getAttribute('aria-expanded') === 'true') {
      button.setAttribute('aria-expanded', 'false');
      detailsRow.hidden = true;
      return;
    }
    button.setAttribute('aria-expanded', 'true');
    detailsRow.hidden = false;
    if (button.dataset.loaded === 'true') return;
    button.disabled = true;
    panel.textContent = tr('Yuklanmoqda…');
    api('GET', '/reports/trips/' + encodeURIComponent(button.dataset.reportPassengers) + '/passengers')
      .then(function (result) {
        button.dataset.loaded = 'true';
        panel.innerHTML = result.passengers.length
          ? '<h3>' + tr('Yo‘lovchilar') + '</h3><div class="scroll"><table class="tbl"><thead><tr><th>' +
            tr('O‘rin') + '</th><th>' + tr('Ism familiya') + '</th><th>' + tr('Telefon') + '</th><th>' +
            tr('Jins') + '</th></tr></thead><tbody>' + result.passengers.map(function (passenger) {
              return '<tr><td>' + passenger.seat + '</td><td>' + esc(passenger.fio) + '</td><td>' +
                esc(passenger.phone) + '</td><td>' + tr(passenger.gender === 'f' ? 'Ayol' : 'Erkak') + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<p class="muted">' + tr('Yo‘lovchilar topilmadi') + '</p>';
        button.disabled = false;
      }).catch(function (error) {
        panel.textContent = tr('Yo‘lovchi ma’lumotlari yuklanmadi');
        button.setAttribute('aria-expanded', 'false');
        detailsRow.hidden = true;
        button.disabled = false;
        fail(error);
      });
  });
  function reports() {
    var query = new URLSearchParams();
    if (reportFrom) query.set('from', reportFrom);
    if (reportTo) query.set('to', reportTo);
    return api('GET', '/reports/buses' + (query.toString() ? '?' + query : '')).then(renderReports);
  }
  function exportReport() {
    if (!reportData) return;
    var buses = reportBus ? reportData.buses.filter(function (bus) { return String(bus.id) === reportBus; }) : reportData.buses;
    var rows = [[tr('Avtobus'), tr('Davlat raqami'), tr('Sana / jo‘nash'), tr('Yo‘nalish turi'), tr('Yo‘nalish'),
      tr('Yo‘lovchilar'), tr('Jami o‘rin'), tr('Bo‘sh o‘rin'), tr('Bandlik %'), tr('Tushum'), tr('Naqd tushum'), tr('Karta tushumi')]];
    buses.forEach(function (bus) {
      bus.trips.forEach(function (trip) {
        rows.push([bus.name, bus.plate || '', trip.departAt, trip.isReturn ? 'Qaytish' : 'Borish',
          cityName(trip.from) + ' → ' + cityName(trip.to), trip.passengers, trip.totalSeats, trip.freeSeats,
          trip.occupancy, trip.revenue, trip.cashRevenue, trip.cardRevenue]);
      });
    });
    var csv = '\uFEFF' + rows.map(function (row) {
      return row.map(function (value) {
        var text = String(value == null ? '' : value);
        if (/^[=+\-@]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      }).join(';');
    }).join('\r\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = 'avtobus-hisoboti.csv';
    link.style.position = 'fixed';
    link.style.left = '-10000px';
    document.body.appendChild(link);
    link.click();
    setTimeout(function () { link.remove(); URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- buyurtmalar ---------- */
  function printAdminTicket(card) {
    var host = document.createElement('div');
    host.id = 'adminPrintHost';
    host.innerHTML = card.outerHTML;
    host.querySelectorAll('.no-print').forEach(function (element) { element.remove(); });
    document.body.appendChild(host);
    var images = Array.from(host.querySelectorAll('img'));
    Promise.all(images.map(function (image) {
      if (image.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    })).then(function () {
      document.body.classList.add('admin-ticket-printing');
      var cleanup = function () {
        document.body.classList.remove('admin-ticket-printing');
        host.remove();
      };
      window.addEventListener('afterprint', cleanup, { once: true });
      window.print();
    });
  }

  var STATUS = { paid: ["To'langan", 'ok'], pending: ['Kutilmoqda', 'low'], expired: ['Muddati tugagan', ''], returned: ['Qaytarilgan', 'cancel'] };
  function orders() {
    main.innerHTML = '<h1>Buyurtmalar</h1><p class="muted">' +
      tr('Buyurtmalarni telefon, ism/familiya yoki chipta raqami orqali qidiring.') +
      '</p><form id="orderSearch" class="row card stack"><input class="inp s" id="orderQuery" autocomplete="off" placeholder="' +
      esc(tr('Telefon, ism/familiya yoki chipta raqami')) + '"><button class="btn btn-lime sm" type="submit">' +
      tr('Qidirish') + '</button><button class="btn btn-ghost sm" id="orderClear" type="button">' + tr('Tozalash') +
      '</button></form><div id="orderGroups" aria-live="polite"></div>';
    var list = [];
    function renderOrders() {
      var groups = new Map();
      list.forEach(function (order) {
        var key = String(order.trip_id);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(order);
      });
      $('#orderGroups').innerHTML = groups.size ? Array.from(groups.entries()).map(function (entry, groupIndex) {
        var tripOrders = entry[1], first = tripOrders[0];
        var route = (first['f_' + LANG] || first.f_uz) + ' → ' + (first['c_' + LANG] || first.c_uz);
        return '<details class="order-trip-group"' + (groupIndex === 0 ? ' open' : '') + '><summary><b>' +
          esc(route) + '</b><span>' + esc(first.depart_at) + ' · ' + tripOrders.length + ' ' + tr('Buyurtmalar') +
          '</span></summary><div class="card scroll"><table class="tbl"><thead><tr><th>' + tr('Sana') +
          '</th><th>' + tr('Chipta raqami') + '</th><th>' + tr('O‘rinlar') + '</th><th>' + tr('Telefon') +
          '</th><th>' + tr('Summa') + '</th><th>' + tr('To‘lov usuli') + '</th><th>' + tr('Holat') +
          '</th><th></th></tr></thead><tbody>' + tripOrders.map(function (o) {
            var st = o.status === 'pending' && o.payment_method === 'cash'
              ? ['Kassada to‘lanadi', 'low'] : (STATUS[o.status] || [o.status, '']);
            var method = tr(o.payment_method === 'cash' ? 'Naqd pul' : 'Bank kartasi');
            var action = o.status === 'pending' && o.payment_method === 'cash'
              ? '<button class="btn btn-lime xs" data-cash-paid="' + esc(o.id) + '">' + tr('Naqd pul olindi') + '</button>'
              : '';
            return '<tr><td>' + esc(o.created_at) + '</td><td>' + esc(o.ticket_numbers || '—') + '</td><td>' +
              esc(o.seats || '—') + '</td><td>' + esc(o.phone) + '</td><td>' + money(o.total) + '</td><td>' +
              method + '</td><td><span class="pill ' + st[1] + '">' + tr(st[0]) + '</span></td><td>' +
              '<button class="btn btn-ghost xs" data-order-view="' + esc(o.id) + '">' + tr('Chiptalarni ko‘rish') +
              '</button> ' + action + '</td></tr><tr class="order-detail-row" data-order-detail="' + esc(o.id) +
              '" hidden><td colspan="8"></td></tr>';
          }).join('') + '</tbody></table></div></details>';
      }).join('') : '<div class="card muted">' + tr('Buyurtma topilmadi') + '</div>';
      localize($('#orderGroups'));
    }
    function loadOrders(search) {
      return api('GET', '/orders' + (search ? '?q=' + encodeURIComponent(search) : '')).then(function (ordersList) {
        list = ordersList;
        renderOrders();
      });
    }
    $('#orderSearch').addEventListener('submit', function (event) {
      event.preventDefault();
      loadOrders($('#orderQuery').value.trim()).catch(fail);
    });
    $('#orderClear').addEventListener('click', function () {
      $('#orderQuery').value = '';
      loadOrders('').catch(fail);
    });
    $('#orderGroups').addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.orderView) {
        var detailRow = Array.from($('#orderGroups').querySelectorAll('[data-order-detail]')).find(function (row) {
          return row.dataset.orderDetail === button.dataset.orderView;
        });
        if (!detailRow.hidden) { detailRow.hidden = true; return; }
        button.disabled = true;
        api('GET', '/orders/' + encodeURIComponent(button.dataset.orderView)).then(function (order) {
          detailRow.querySelector('td').innerHTML = '<div class="order-ticket-list"><h3>' +
            tr('Buyurtma ma’lumotlari') + ' · ' + esc(order.phone) + '</h3>' + order.tickets.map(function (ticket) {
              return '<article class="order-ticket-card ticket-scan-result"><div class="order-ticket-info">' +
                '<h3>' + tr('Chipta') + ' ' + esc(ticket.number) + '</h3><div class="ticket-scan-grid">' +
                '<div><span>Chipta ID</span><b>' + esc(ticket.id) + '</b></div>' +
                '<div><span>Yo‘lovchi</span><b>' + esc(ticket.fio) + '</b></div>' +
                '<div><span>Telefon</span><b>' + esc(ticket.phone) + '</b></div>' +
                '<div><span>O‘rin</span><b>' + ticket.seat + '</b></div>' +
                '<div><span>Yo‘nalish</span><b>' + esc((ticket.from[LANG] || ticket.from.uz) +
                  ' → ' + (ticket.to[LANG] || ticket.to.uz)) + '</b></div>' +
                '<div><span>Jo‘nash vaqti</span><b>' + esc(ticket.departAt) + '</b></div>' +
                '<div><span>To‘lov usuli</span><b>' +
                  tr(ticket.paymentMethod === 'cash' ? 'Naqd pul' : 'Bank kartasi') + '</b></div>' +
                '<div><span>To‘lov holati</span><b>' + tr(ticket.status === 'active' ? 'To‘langan' :
                  ticket.status === 'pending' ? 'Kutilmoqda' : ticket.status) + '</b></div>' +
                '<div><span>Summa</span><b>' + money(ticket.price) + '</b></div></div></div>' +
                '<img class="order-ticket-qr" src="/api/tickets/' + encodeURIComponent(ticket.id) +
                  '/qr.svg" alt="' + tr('Chipta QR kodi') + '">' +
                '<button class="btn btn-ghost sm no-print" type="button" data-print-ticket>' +
                tr('Chipta chop etish') + '</button></article>';
            }).join('') + '</div>';
          detailRow.hidden = false;
          button.disabled = false;
          localize(detailRow);
        }).catch(function (error) {
          button.disabled = false;
          fail(error);
        });
        return;
      }
      if (button.hasAttribute('data-print-ticket')) {
        printAdminTicket(button.closest('.order-ticket-card'));
        return;
      }
      if (button.dataset.cashPaid) {
        var cashOrder = list.find(function (item) { return item.id === button.dataset.cashPaid; });
        if (!cashOrder || !confirm("Mijozdan " + money(cashOrder.total) + " naqd pulni oldingizmi? Tasdiqlangandan so'ng chiptalar faol bo'ladi.")) return;
        button.disabled = true;
        api('POST', '/orders/' + encodeURIComponent(button.dataset.cashPaid) + '/cash/confirm').then(function () {
          toast("Naqd to'lov tasdiqlandi, chiptalar faollashtirildi", 'ok');
          return loadOrders($('#orderQuery').value.trim());
        }).catch(function (error) {
          button.disabled = false;
          fail(error);
        });
      }
    });
    return loadOrders('');
  }

  /* ---------- chipta tekshirish (nazoratchi) ---------- */
  function check() {
    main.innerHTML = '<h1>Chipta tekshirish</h1><form id="cf" class="card stack" style="max-width:760px"><p class="muted" style="margin:0">' +
      tr('QR skaner ulang va chiptani skanerlang yoki ID/raqamni qo‘lda kiriting.') + '</p>' +
      fld('QR kodi yoki chipta ID si', '<input class="inp" id="cn" autocomplete="off" autocapitalize="off" spellcheck="false" autofocus placeholder="TICKET:… yoki 10 xonali raqam">') +
      '<div class="row"><button class="btn btn-ghost sm" id="activateScanner" type="button">' +
      tr('QR skaner uchun maydonni faollashtirish') + '</button>' +
      '<button class="btn btn-lime" type="submit">Tekshirish</button>' +
      '<button class="btn btn-ghost" id="startCamera" type="button">' + tr('Kamera bilan QR skanerlash') + '</button>' +
      '<button class="btn btn-ghost" id="stopCamera" type="button" disabled>' + tr('Kamerani o‘chirish') +
      '</button><label class="field camera-select" for="cameraSelect">' + tr('Kamera tanlang') +
      '<select class="inp s" id="cameraSelect" hidden></select></label></div></form>' +
      '<section class="card camera-panel" id="cameraPanel" hidden><video id="cameraPreview" playsinline muted></video>' +
      '<p id="cameraStatus" class="muted" role="status"></p></section><div id="cr" aria-live="polite"></div>';
    var cameraControls = null;
    function stopCamera() {
      if (cameraControls) cameraControls.stop();
      cameraControls = null;
      var startButton = $('#startCamera'), stopButton = $('#stopCamera');
      if (startButton) startButton.disabled = false;
      if (stopButton) stopButton.disabled = true;
    }
    stopActiveCamera = stopCamera;
    function scanTicket(identifier) {
      return api('GET', '/ticket/' + encodeURIComponent(identifier)).then(function (ticket) {
        var method = tr(ticket.paymentMethod === 'cash' ? 'Naqd pul' : 'Bank kartasi');
        var state = ticket.valid ? tr('Chipta faol') : ticket.cashPending ? tr('Kassada to‘lanadi') :
          ticket.orderStatus === 'paid' && ticket.status === 'returned' ? tr('Qaytarilgan') : tr('Chipta faol emas');
        $('#cr').innerHTML = '<div class="card ticket-scan-result' + (ticket.valid ? ' ticket-scan-valid' : ' ticket-scan-pending') + '">' +
          '<h2>' + esc(state) + '</h2><div class="ticket-scan-grid">' +
          '<div><span>Chipta ID</span><b>' + esc(ticket.id) + '</b></div>' +
          '<div><span>Chipta raqami</span><b>' + esc(ticket.number) + '</b></div>' +
          '<div><span>Yo‘lovchi</span><b>' + esc(ticket.fio) + '</b></div>' +
          '<div><span>Telefon raqami</span><b>' + esc(ticket.phone) + '</b></div>' +
          '<div><span>Yo‘nalish</span><b>' + esc(ticket.route) + '</b></div>' +
          '<div><span>Band qilingan vaqt</span><b>' + esc(ticket.bookedAt) + '</b></div>' +
          '<div><span>Jo‘nash vaqti</span><b>' + esc(ticket.departAt) + '</b></div>' +
          '<div><span>Kelish vaqti</span><b>' + esc(ticket.arriveAt) + '</b></div>' +
          '<div><span>O‘rin</span><b>' + ticket.seat + '</b></div>' +
          '<div><span>To‘lov usuli</span><b>' + esc(method) + '</b></div>' +
          '<div><span>To‘lov holati</span><b>' + esc(ticket.paymentMethod === 'cash' && ticket.orderStatus === 'pending' ? tr('Kutilmoqda') : ticket.orderStatus === 'paid' ? tr('To‘lov tasdiqlandi') : tr('Chipta faol emas')) + '</b></div>' +
          '<div><span>Chipta summasi</span><b>' + money(ticket.price) + '</b></div></div>' +
          '<img class="order-ticket-qr" src="/api/tickets/' + encodeURIComponent(ticket.id) +
            '/qr.svg" alt="' + tr('Chipta QR kodi') + '">' +
          '<button class="btn btn-ghost sm no-print" type="button" data-print-ticket>' + tr('Chipta chop etish') + '</button>' +
          (ticket.cashPending ? '<button class="btn btn-lime sm no-print" type="button" data-scan-confirm="' + esc(ticket.orderId) + '">Naqd pul olindi</button>' : '') +
          '</div>';
        localize($('#cr'));
      });
    }
    $('#cf').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = normalizeTicketInput($('#cn').value);
      if (!n) return;
      scanTicket(n).catch(function (err) {
        $('#cr').innerHTML = '<div class="note warn" style="margin-top:6px"><b>' + esc(tr(ERR[err.code] || 'Xatolik')) + '</b></div>';
      });
    });
    function normalizeTicketInput(value) {
      var input = String(value || '').trim();
      if (/^https?:\/\//i.test(input)) {
        try {
          var pathMatch = new URL(input).pathname.match(/\/ticket\/([^/]+)\/?$/i);
          if (pathMatch) input = decodeURIComponent(pathMatch[1]);
        } catch (error) { /* Unrecognized scanner text remains available for lookup. */ }
      }
      return input.replace(/^TICKET:/i, '').trim();
    }
    async function startCamera() {
      stopCamera();
      var scanner = window.ZXingBrowser;
      var status = $('#cameraStatus');
      $('#cameraPanel').hidden = false;
      if (!scanner || !scanner.BrowserQRCodeReader) {
        status.textContent = tr('Bu brauzer kameradan QR o‘qishni qo‘llamaydi. ID yoki chipta raqamini kiriting.');
        return;
      }
      $('#startCamera').disabled = true;
      status.textContent = tr('QR kodni kameraga ko‘rsating');
      try {
        var devices = await scanner.BrowserCodeReader.listVideoInputDevices();
        if (!devices.length) throw new DOMException('No camera found', 'NotFoundError');
        var select = $('#cameraSelect');
        select.innerHTML = devices.map(function (device, index) {
          return '<option value="' + esc(device.deviceId) + '">' +
            esc(device.label || (tr('Kamera tanlang') + ' ' + (index + 1))) + '</option>';
        }).join('');
        select.hidden = devices.length < 2;
        if (select.hidden) select.value = devices[0].deviceId;
        var reader = new scanner.BrowserQRCodeReader();
        var video = $('#cameraPreview');
        cameraControls = await reader.decodeFromVideoDevice(select.value || undefined, video,
          function (result, error, controls) {
            if (controls) cameraControls = controls;
            if (!result) return;
            var input = $('#cn');
            input.value = result.getText();
            stopCamera();
            $('#cameraStatus').textContent = tr('QR kodi o‘qildi');
            $('#cf').requestSubmit();
          });
        $('#stopCamera').disabled = false;
        status.textContent = tr('QR kodni kameraga ko‘rsating');
      } catch (error) {
        stopCamera();
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          status.textContent = tr('Kameraga ruxsat berilmadi. Brauzer sozlamalarida kameraga ruxsat bering.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          status.textContent = tr('Kamera topilmadi');
        } else if (error.name === 'NotSupportedError' || !navigator.mediaDevices) {
          status.textContent = tr('Bu brauzer kameradan QR o‘qishni qo‘llamaydi. ID yoki chipta raqamini kiriting.');
        } else {
          status.textContent = tr('Kamera ishga tushmadi') + ': ' + (error.message || error.name);
          console.error('QR camera scan failed', error);
        }
      }
    }
    $('#startCamera').addEventListener('click', startCamera);
    $('#stopCamera').addEventListener('click', function () {
      stopCamera();
      $('#cameraStatus').textContent = '';
    });
    $('#cameraSelect').addEventListener('change', startCamera);
    $('#activateScanner').addEventListener('click', function () { $('#cn').focus(); });
    $('#cn').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        $('#cf').requestSubmit();
      }
    });
    $('#cn').addEventListener('paste', function () {
      setTimeout(function () { if ($('#cn').value.trim()) $('#cf').requestSubmit(); }, 0);
    });
    setTimeout(function () { $('#cn').focus(); }, 0);
    $('#cr').addEventListener('click', function (event) {
      var button = event.target.closest('[data-scan-confirm]');
      var printButton = event.target.closest('[data-print-ticket]');
      if (printButton) {
        printAdminTicket(printButton.closest('.ticket-scan-result'));
        return;
      }
      if (!button || !confirm(tr('Kassada naqd pul olindi, to‘lovni tasdiqlaysizmi?'))) return;
      button.disabled = true;
      api('POST', '/orders/' + encodeURIComponent(button.dataset.scanConfirm) + '/cash/confirm')
        .then(function () {
          toast(tr('Naqd to‘lov tasdiqlandi, chipta faollashtirildi'), 'ok');
          return scanTicket(normalizeTicketInput($('#cn').value));
        }).catch(function (error) {
          button.disabled = false;
          fail(error);
        });
    });
    return Promise.resolve();
  }

  if (TOKEN) { api('GET', '/stats').then(start).catch(showLogin); } else showLogin();
})();
