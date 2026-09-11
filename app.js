const STATUS_META = {
  delivery: {label:'На заказе', dot:'var(--green)'},
  parking:  {label:'На парковке', dot:'var(--blue)'},
  charging: {label:'Зарядка', dot:'var(--blue)'},
  outside:  {label:'Вне зоны', dot:'var(--amber)'},
  issue:    {label:'Инцидент', dot:'var(--red)'},
  offline:  {label:'Не на связи', dot:'var(--grey)'}
};

let robots = [
  {id:'RVR-014', status:'delivery', battery:71, task:'Заказ #88213 · 0,9 км до клиента',    since:6,  lastSeen:0, posMode:'route', routeIdx:0, wpIndex:1, wpDir:1,  moveTimer:35, orderId:88213},
  {id:'RVR-021', status:'delivery', battery:64, task:'Заказ #88220 · возврат на локацию',    since:18, lastSeen:0, posMode:'route', routeIdx:1, wpIndex:2, wpDir:-1, moveTimer:40, orderId:88220},
  {id:'RVR-032', status:'delivery', battery:58, task:'Заказ #88225 · 1,2 км до клиента',    since:3,  lastSeen:0, posMode:'route', routeIdx:2, wpIndex:2, wpDir:1,  moveTimer:28, orderId:88225},
  {id:'RVR-007', status:'parking',  battery:93, task:'Ожидание заказа',                     since:22, lastSeen:0, posMode:'parkingSlot', slotIndex:0},
  {id:'RVR-011', status:'parking',  battery:88, task:'Ожидание заказа',                     since:14, lastSeen:0, posMode:'parkingSlot', slotIndex:1},
  {id:'RVR-018', status:'parking',  battery:81, task:'Ожидание заказа',                     since:9,  lastSeen:0, posMode:'parkingSlot', slotIndex:2},
  {id:'RVR-026', status:'charging', battery:34, task:'Зарядная станция',                    since:40, lastSeen:0, posMode:'parkingSlot', slotIndex:3},
  {id:'RVR-009', status:'outside',  battery:52, task:'Простой у подъезда, вне парковки',    since:14, lastSeen:0, posMode:'outsideSlot', pinned:true},
  {id:'RVR-041', status:'delivery', battery:76, task:'Заказ #88231 · 0,4 км до клиента',    since:2,  lastSeen:0, posMode:'route', routeIdx:3, wpIndex:1, wpDir:1,  moveTimer:22, orderId:88231},
  {id:'RVR-005', status:'parking',  battery:97, task:'Ожидание заказа',                     since:31, lastSeen:0, posMode:'parkingSlot', slotIndex:4},
  {id:'RVR-038', status:'issue',    battery:41, task:'Остановка: препятствие на маршруте',  since:11, lastSeen:3, posMode:'fixed', fixed:{dx:1050, dy:120}, pinned:true},
  {id:'RVR-044', status:'delivery', battery:69, task:'Заказ #88234 · 1,4 км до клиента',    since:9,  lastSeen:0, posMode:'route', routeIdx:4, wpIndex:2, wpDir:1,  moveTimer:50, orderId:88234},
];

let alerts = [
  {id:1, level:'red',   type:'issue',      robotId:'RVR-038', time:'14:21', ack:false},
  {id:2, level:'amber', type:'outside',    robotId:'RVR-009', time:'14:18', ack:false},
  {id:3, level:'blue',  type:'conversion', time:'13:55', ack:false},
];

function freshAlerts(){
  const now = new Date();
  const t = (offsetMin) => {
    const d = new Date(now.getTime() - offsetMin*60000);
    return d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
  };
  return [
    {id:Date.now()+1, level:'red',   type:'issue',      robotId:'RVR-038', time:t(3),  ack:false},
    {id:Date.now()+2, level:'amber', type:'outside',    robotId:'RVR-009', time:t(6),  ack:false},
    {id:Date.now()+3, level:'blue',  type:'conversion', time:t(29), ack:false},
  ];
}

function buildAlertContent(a){
  if(a.type === 'issue'){
    const r = robots.find(x => x.id === a.robotId);
    return {
      title: `${a.robotId} · остановка на маршруте`,
      desc: r
        ? `Робот не двигается ${r.since} мин, статус «инцидент». Последняя связь ${r.lastSeen===0 ? 'только что' : r.lastSeen+' мин назад'}.`
        : `Робот не двигается, статус «инцидент».`
    };
  }
  if(a.type === 'outside'){
    const r = robots.find(x => x.id === a.robotId);
    return {
      title: `${a.robotId} · вне зоны парковки`,
      desc: r
        ? `Не на заказе, вне разметки ${r.since} мин. Риск штрафа при превышении 20 мин.`
        : `Не на заказе, вне разметки парковки. Риск штрафа при превышении 20 мин.`
    };
  }
  // 'conversion' и любые прочие статичные алерты без привязки к роботу
  return {
    title: 'Конверсия в роботодоставку ниже нормы',
    desc: '18,4% при обычных ~20% за последний час.'
  };
}

const requestedByLavka = 12;
const onShift = robots.length;

function renderMetrics(){
  const delivering = robots.filter(r=>r.status==='delivery').length;
  const slaOk = 96;
  const conversion = 18.4;
  const outsideNow = robots.filter(r=>r.status==='outside').length;
  const openAlerts = alerts.filter(a=>!a.ack).length;

  const metrics = [
    {label:'Роботов на смене', value:`${onShift}/${requestedByLavka}`, note: onShift>=requestedByLavka ? 'план выполнен' : `недобор ${requestedByLavka-onShift}`, cls: onShift>=requestedByLavka?'ok':'warn'},
    {label:'На заказе сейчас', value:delivering, suffix:`из ${onShift}`, note:'загрузка парка', cls:'ok'},
    {label:'Конверсия в робота', value:conversion+'%', note:'норма ~20%', cls: conversion<18?'bad':'warn'},
    {label:'SLA ≤ 30 мин', value:slaOk+'%', note:'за последний час', cls: slaOk>=95?'ok':'warn'},
    {label:'Вне зоны парковки', value:outsideNow, suffix:'робот(ов)', note: outsideNow>0 ? 'риск штрафа' : 'нарушений нет', cls: outsideNow>0?'warn':'ok'},
    {label:'Открытых алертов', value:openAlerts, note: openAlerts>0 ? 'требуют внимания' : 'всё чисто', cls: openAlerts>0?'bad':'ok'},
  ];

  document.getElementById('metricsRow').innerHTML = metrics.map(m=>`
    <div class="metric">
      <div class="metric-label">${m.label}</div>
      <div class="metric-value-row">
        <span class="metric-value num">${m.value}</span>
        ${m.suffix? `<span class="metric-suffix">${m.suffix}</span>`:''}
      </div>
      <div class="metric-note ${m.cls}">${m.note}</div>
    </div>
  `).join('');
}

function batteryColor(b){
  if(b<25) return 'var(--red)';
  if(b<45) return 'var(--amber)';
  return 'var(--green)';
}

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ---------- Real map (Leaflet) ---------- */
function latLngOffset(base, dxEast, dyNorth){
  const lat = base.lat + (dyNorth / 111320);
  const lng = base.lng + (dxEast / (111320 * Math.cos(base.lat * Math.PI/180)));
  return {lat, lng};
}

// Дом 4 (геокодирован) → по скриншотам подпись «4А» стоит на здании севернее и чуть западнее прошлой точки
const LOCATION_CENTER = latLngOffset({lat:55.746010, lng:37.797415}, 0, -42);
const DELIVERY_RADIUS_M = 1500;

// Координаты от пользователя → по фото парковка сдвинута правее и чуть ниже относительно исходной точки
const PARKING_CENTER = latLngOffset({lat:55.745094, lng:37.796863}, 30, -4);
const PARKING_HALF_WIDTH_M = 16;
const PARKING_HALF_HEIGHT_M = 6;

// Сетка парковочных мест внутри прямоугольника — по одному месту на робота, без наложений
const PARKING_SLOTS = [];
[-14,-8,-2,2,8,14].forEach(x => [-3,3].forEach(y => PARKING_SLOTS.push({dx:x, dy:y})));
const OUTSIDE_SLOT = {dx:26, dy:14}; // точка рядом с парковкой, но за её пределами

// Иллюстративные маршруты доставки (ломаные вдоль условной уличной сетки от даркстора).
// Это не точный дорожный граф — координат реальных полигонов улиц у меня нет,
// маршруты откалиброваны так, чтобы визуально не пересекать здания на подложке.
const ROUTES = [
  [{dx:0,dy:0},{dx:0,dy:150},{dx:220,dy:150},{dx:220,dy:380}],
  [{dx:0,dy:0},{dx:180,dy:0},{dx:180,dy:-200},{dx:420,dy:-200}],
  [{dx:0,dy:0},{dx:-150,dy:0},{dx:-150,dy:260},{dx:-380,dy:260}],
  [{dx:0,dy:0},{dx:0,dy:-160},{dx:280,dy:-160},{dx:280,dy:-420}],
  [{dx:0,dy:0},{dx:-200,dy:-100},{dx:-200,dy:-320},{dx:-460,dy:-320}],
];

const SIMULATE_INTERVAL_S = 4; // соответствует setInterval(simulate, 4000)

let shiftOverride = null; // null = реальное время; true/false = демо-переопределение

function isShiftActive(now = new Date()){
  if(shiftOverride !== null) return shiftOverride;
  const start = new Date(now); start.setHours(8,0,0,0);
  const end = new Date(now); end.setHours(23,0,0,0);
  return now >= start && now < end;
}

let map, tileLayer, radiusCircle, parkingZone, darkstoreMarker, markersLayer;

function metersToLatLng(dxEast, dyNorth, center = LOCATION_CENTER){
  const lat = center.lat + (dyNorth / 111320);
  const lng = center.lng + (dxEast / (111320 * Math.cos(center.lat * Math.PI/180)));
  return [lat, lng];
}

function getRobotLatLng(r){
  if(r.posMode === 'parkingSlot'){
    const slot = PARKING_SLOTS[r.slotIndex];
    return metersToLatLng(slot.dx, slot.dy, PARKING_CENTER);
  }
  if(r.posMode === 'outsideSlot'){
    return metersToLatLng(OUTSIDE_SLOT.dx, OUTSIDE_SLOT.dy, PARKING_CENTER);
  }
  if(r.posMode === 'route'){
    const wp = ROUTES[r.routeIdx][r.wpIndex];
    return metersToLatLng(wp.dx, wp.dy, LOCATION_CENTER);
  }
  return metersToLatLng(r.fixed.dx, r.fixed.dy, LOCATION_CENTER);
}

function getTileUrl(){
  return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
}

function initMap(){
  map = L.map('leafletMap', {scrollWheelZoom:false, attributionControl:false}).setView([LOCATION_CENTER.lat, LOCATION_CENTER.lng], 14);

  L.control.attribution({prefix:false}).addTo(map).addAttribution('© OpenStreetMap contributors');

  tileLayer = L.tileLayer(getTileUrl(), { maxZoom: 19 }).addTo(map);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.getElementById('leafletMap').classList.toggle('theme-dark', isDark);

  radiusCircle = L.circle([LOCATION_CENTER.lat, LOCATION_CENTER.lng], {
    radius: DELIVERY_RADIUS_M,
    color: cssVar('--blue'),
    weight: 2,
    dashArray: '6,6',
    fillColor: cssVar('--blue'),
    fillOpacity: 0.05
  }).addTo(map);
  radiusCircle.bindTooltip('Зона доставки роботом · радиус 1,5 км', {direction:'top', className:'rover-tooltip'});

  const parkingCorner1 = metersToLatLng(-PARKING_HALF_WIDTH_M, -PARKING_HALF_HEIGHT_M, PARKING_CENTER);
  const parkingCorner2 = metersToLatLng(PARKING_HALF_WIDTH_M, PARKING_HALF_HEIGHT_M, PARKING_CENTER);
  parkingZone = L.rectangle([parkingCorner1, parkingCorner2], {
    color: cssVar('--green'),
    weight: 2,
    dashArray: '5,4',
    fillColor: cssVar('--green'),
    fillOpacity: 0.15
  }).addTo(map);
  parkingZone.bindTooltip('Роверная парковка (ориентировочно)', {direction:'top', className:'rover-tooltip'});

  darkstoreMarker = L.marker([LOCATION_CENTER.lat, LOCATION_CENTER.lng], {
    icon: L.divIcon({className:'', html:'<div class="darkstore-marker"></div>', iconSize:[16,16], iconAnchor:[8,8]})
  }).addTo(map);
  darkstoreMarker.bindTooltip('<div class="popup-title">Даркстор DS-0412</div><div class="popup-row">Яндекс Лавка · Полимерная ул., 4А</div>', {direction:'top', offset:[0,-10], className:'rover-tooltip'});

  markersLayer = L.layerGroup().addTo(map);
  map.fitBounds(radiusCircle.getBounds(), {padding:[10,10]});
  renderMap();
}

function renderMap(){
  if(!map) return;
  markersLayer.clearLayers();
  robots.forEach(r=>{
    const latlng = getRobotLatLng(r);
    const icon = L.divIcon({
      className:'',
      html:`<div class="rover-marker ${r.status}"></div>`,
      iconSize:[16,16],
      iconAnchor:[8,8]
    });
    const meta = STATUS_META[r.status];
    const marker = L.marker(latlng, {icon}).addTo(markersLayer);
    marker.bindTooltip(`<div class="popup-title">${r.id}</div>
      <div class="popup-row">${meta.label} · заряд ${r.battery}%</div>
      <div class="popup-row">${r.task}</div>
      <div class="popup-row">в статусе ${r.since} мин</div>`,
      {direction:'top', offset:[0,-10], className:'rover-tooltip'});
  });
}

function applyMapTheme(){
  if(!map) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.getElementById('leafletMap').classList.toggle('theme-dark', isDark);
  radiusCircle.setStyle({color:cssVar('--blue'), fillColor:cssVar('--blue')});
  parkingZone.setStyle({color:cssVar('--green'), fillColor:cssVar('--green')});
}

function levelBar(l){ return l==='red' ? 'bar-red' : l==='amber' ? 'bar-amber' : 'bar-blue'; }

function renderAlerts(){
  const open = alerts.filter(a=>!a.ack);
  document.getElementById('alertsCountSub').textContent = `${open.length} активных из ${alerts.length}`;
  const list = document.getElementById('alertsList');
  if(open.length===0){
    list.innerHTML = `<div class="alerts-empty">Открытых алертов нет</div>`;
  } else {
    list.innerHTML = open.map(a=>{
      const content = buildAlertContent(a);
      return `
      <div class="alert">
        <div class="alert-bar ${levelBar(a.level)}"></div>
        <div class="alert-body">
          <div class="alert-top">
            <div class="alert-title">${content.title}</div>
            <div class="alert-time">${a.time}</div>
          </div>
          <div class="alert-desc">${content.desc}</div>
          <div class="alert-actions">
            <button class="btn-ack" onclick="ackAlert(${a.id})">Взять в работу</button>
          </div>
        </div>
      </div>
    `;
    }).join('');
  }
  const pill = document.getElementById('locationStatusPill');
  const text = document.getElementById('locationStatusText');
  const hasRed = open.some(a=>a.level==='red');
  const dot = pill.querySelector('.status-dot');
  if(hasRed){
    dot.className = 'status-dot dot-red';
    text.textContent = `Инцидент — ${open.length} активных алерт(а)`;
  } else if(open.length>0){
    dot.className = 'status-dot dot-amber';
    text.textContent = `Внимание — ${open.length} активных алерт(а)`;
  } else {
    dot.className = 'status-dot dot-green';
    text.textContent = 'В норме';
  }
}

function ackAlert(id){
  const a = alerts.find(x=>x.id===id);
  if(a){ a.ack = true; }
  renderAlerts();
  renderMetrics();
}

let currentFilter = 'all';
function renderTable(){
  const body = document.getElementById('robotTableBody');
  const rows = robots.filter(r=> currentFilter==='all' || r.status===currentFilter || (currentFilter==='parking' && r.status==='charging'));
  body.innerHTML = rows.map(r=>{
    const meta = STATUS_META[r.status];
    return `<tr>
      <td class="rid">${r.id}</td>
      <td><span class="status-chip"><span class="status-dot" style="background:${meta.dot}"></span>${meta.label}</span></td>
      <td>
        <div class="battery-bar-wrap">
          <div class="battery-track"><div class="battery-fill" style="width:${r.battery}%; background:${batteryColor(r.battery)}"></div></div>
          <span class="cell-muted num">${r.battery}%</span>
        </div>
      </td>
      <td>${r.task}</td>
      <td class="cell-muted num">${r.since} мин</td>
      <td class="cell-muted num">${r.lastSeen===0 ? 'сейчас' : r.lastSeen+' мин назад'}</td>
    </tr>`;
  }).join('');
}

document.getElementById('tableFilters').addEventListener('click', e=>{
  const btn = e.target.closest('.filter-btn');
  if(!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderTable();
});

function pad(n){ return String(n).padStart(2,'0'); }

function tick(){
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('ru-RU');

  const countdownEl = document.getElementById('shiftCountdown');
  const labelEl = countdownEl.nextElementSibling;

  if(shiftOverride !== null){
    countdownEl.textContent = 'Демо';
    labelEl.textContent = shiftOverride ? 'смена идёт (демо-режим)' : 'смена окончена (демо-режим)';
    return;
  }

  const todayStart = new Date(now); todayStart.setHours(8,0,0,0);
  const todayEnd   = new Date(now); todayEnd.setHours(23,0,0,0);

  let diffMs, label;
  if (isShiftActive(now)) {
    diffMs = todayEnd - now;
    label = 'до конца смены (23:00)';
  } else if (now < todayStart) {
    diffMs = todayStart - now;
    label = 'до начала смены (08:00)';
  } else {
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    diffMs = tomorrowStart - now;
    label = 'до начала смены (08:00)';
  }

  const totalMin = Math.max(0, Math.floor(diffMs / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  countdownEl.textContent = `${pad(h)}ч ${pad(m)}м`;
  labelEl.textContent = label;
}

/* ---------- Theme toggle ---------- */
function setTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.theme === theme);
  });
}
document.getElementById('themeToggle').addEventListener('click', e=>{
  const btn = e.target.closest('.theme-btn');
  if(!btn) return;
  setTheme(btn.dataset.theme);
  applyMapTheme();
});
// стартуем со светлой темы, либо с системной, если она тёмная
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(prefersDark ? 'dark' : 'light');

function nextFreeSlot(){
  const used = new Set(robots.filter(x => x.posMode === 'parkingSlot').map(x => x.slotIndex));
  for(let i=0; i<PARKING_SLOTS.length; i++){
    if(!used.has(i)) return i;
  }
  return Math.floor(Math.random() * PARKING_SLOTS.length);
}

function sendToParking(r, task){
  r.status = 'parking';
  r.posMode = 'parkingSlot';
  r.slotIndex = nextFreeSlot();
  r.task = task;
  r.since = 0;
  r.pinned = false;
}

function moveRobotAlongRoute(r){
  const route = ROUTES[r.routeIdx];
  r.wpIndex += r.wpDir;

  if(r.wpIndex >= route.length - 1){
    r.wpIndex = route.length - 1;
    r.wpDir = -1; // конечная точка маршрута — разворот на локацию
    r.task = `Заказ #${r.orderId} · возврат на локацию`;
    return;
  }
  if(r.wpIndex <= 0){
    r.wpIndex = 0;
    finishDelivery(r);
    return;
  }
  const remainingSteps = r.wpDir === 1 ? (route.length - 1 - r.wpIndex) : r.wpIndex;
  r.task = r.wpDir === 1
    ? `Заказ #${r.orderId} · ${(remainingSteps * 0.35).toFixed(1)} км до клиента`
    : `Заказ #${r.orderId} · возврат на локацию`;
}

function finishDelivery(r){
  if(r.battery < 45){
    r.status = 'charging';
    r.posMode = 'parkingSlot';
    r.slotIndex = nextFreeSlot();
    r.task = 'Зарядная станция';
    r.since = 0;
  } else {
    sendToParking(r, 'Ожидание заказа');
  }
}

function startDelivery(r){
  r.status = 'delivery';
  r.posMode = 'route';
  r.routeIdx = Math.floor(Math.random() * ROUTES.length);
  r.wpIndex = 0;
  r.wpDir = 1;
  r.moveTimer = 30 + Math.random() * 30;
  r.orderId = 88200 + Math.floor(Math.random() * 999);
  r.since = 0;
  r.slotIndex = undefined;
  // Первая точка маршрута совпадает с координатами даркстора — сразу сдвигаем робота
  // на следующую точку, иначе он визуально перекрывает маркер даркстора на карте.
  moveRobotAlongRoute(r);
}

function startDeliveryDemo(r){
  // как startDelivery, но продвигает робота ещё на шаг дальше — для наглядной демонстрации заказчику
  startDelivery(r);
  moveRobotAlongRoute(r);
}

let shiftWasActive = isShiftActive();
if(!shiftWasActive){
  alerts = []; // если страница открыта вне часов смены — алертов быть не должно
  forceFleetToParking(); // и весь флот сразу единообразно на парковке, а не в разнобой из стартовых данных
}

function forceFleetToParking(){
  // Единый момент перехода — весь флот получает одинаковый статус, текст и обнулённый таймер разом,
  // чтобы в таблице не было расхождений вида «13 мин» у одних и «45 мин» у других.
  robots.forEach(r=>{
    r.status = 'parking';
    r.posMode = 'parkingSlot';
    r.slotIndex = nextFreeSlot();
    r.task = 'Смена окончена · ожидание на парковке';
    r.since = 0;
    r.pinned = false;
  });
}

function activateIncidentRobots(){
  // Алерты при старте смены ссылаются на конкретных роботов — переводим их в
  // соответствующий статус и закрепляем на всю смену, иначе пульсирующий маркер
  // инцидента может исчезнуть раньше, чем сам алерт.
  const issueBot = robots.find(r => r.id === 'RVR-038');
  if(issueBot){
    issueBot.status = 'issue';
    issueBot.posMode = 'fixed';
    issueBot.fixed = {dx:1050, dy:120};
    issueBot.task = 'Остановка: препятствие на маршруте';
    issueBot.since = 11;
    issueBot.lastSeen = 3;
    issueBot.pinned = true;
  }
  const outsideBot = robots.find(r => r.id === 'RVR-009');
  if(outsideBot){
    outsideBot.status = 'outside';
    outsideBot.posMode = 'outsideSlot';
    outsideBot.task = 'Простой у подъезда, вне парковки';
    outsideBot.since = 14;
    outsideBot.lastSeen = 0;
    outsideBot.pinned = true;
  }
}

function handleShiftTransition(activeNow){
  if(activeNow){
    // Смена началась — свежие алерты, роботы под них и пара роботов сразу видимо едут по заказам
    alerts = freshAlerts();
    activateIncidentRobots();
    const demoRobots = robots
      .filter(r => r.status === 'parking' && r.id !== 'RVR-038' && r.id !== 'RVR-009')
      .slice(0, 2);
    demoRobots.forEach(r => startDeliveryDemo(r));
  } else {
    // Смена закончилась — операций нет, весь флот синхронно встаёт на парковку
    alerts = [];
    forceFleetToParking();
  }
  renderAlerts();
  renderTable();
  renderMap();
  renderMetrics();
}

/* ---------- Демо-режим: промотка начала/конца смены по кнопке ---------- */
function updateDemoBadge(){
  const badge = document.getElementById('demoBadge');
  if(badge) badge.style.display = shiftOverride !== null ? 'inline-block' : 'none';
}

function demoSetShift(active){
  shiftOverride = active;
  handleShiftTransition(active);
  shiftWasActive = active;
  updateDemoBadge();
  tick();
}

function demoClearOverride(){
  shiftOverride = null;
  shiftWasActive = isShiftActive();
  updateDemoBadge();
  tick();
}

function simulate(){
  const activeNow = isShiftActive();

  if(activeNow !== shiftWasActive){
    handleShiftTransition(activeNow);
    shiftWasActive = activeNow;
  }

  if(!activeNow){
    // Смена не идёт — флот уже синхронно на парковке (см. forceFleetToParking при переходе),
    // здесь просто тикаем общий таймер «время в статусе»
    robots.forEach(r => r.since += 1);
    renderAlerts();
    renderTable();
    renderMap();
    renderMetrics();
    return;
  }

  robots.forEach(r=>{
    r.since += 1;

    if(r.status === 'delivery'){
      r.battery = Math.max(5, r.battery - (Math.random() < 0.5 ? 1 : 0));
      r.moveTimer -= SIMULATE_INTERVAL_S;
      if(r.moveTimer <= 0){
        moveRobotAlongRoute(r);
        r.moveTimer = 30 + Math.random() * 30;
      }
    } else if(r.status === 'charging'){
      r.battery = Math.min(100, r.battery + 2);
      if(r.battery >= 97){
        sendToParking(r, 'Ожидание заказа');
      }
    } else if(r.status === 'parking'){
      if(Math.random() < 0.04){
        startDelivery(r);
      }
    } else if(r.status === 'outside'){
      r.battery = Math.max(5, r.battery - (Math.random() < 0.5 ? 1 : 0));
      if(!r.pinned && Math.random() < 0.05){
        sendToParking(r, 'Возвращён на парковку оператором');
      }
    } else if(r.status === 'issue'){
      r.lastSeen = Math.min(9, r.lastSeen + 1);
      if(!r.pinned && Math.random() < 0.03){
        sendToParking(r, 'Инцидент устранён · на парковке');
        r.lastSeen = 0;
      }
    }
  });

  renderAlerts();
  renderTable();
  renderMap();
  renderMetrics();
}

renderMetrics();
initMap();
renderAlerts();
renderTable();
updateDemoBadge();
tick();
setInterval(tick, 1000);
setInterval(simulate, 4000);
