'use strict';
/* The Bootlegger — core: namespace, constants, state, utilities, events, input */

const B = window.B = {};

/* ---------- constants ---------- */
B.TILE = 32;
B.MAP_W = 120;
B.MAP_H = 96;
B.VIEW_W = 1280;
B.VIEW_H = 720;

B.T = { GRASS: 0, ROAD: 1, WALK: 2, BUILDING: 3, WATER: 4, DIRT: 5, PIER: 6, FARM: 7, PARK: 8 };
B.SOLID = { 3: true, 4: true };

/* ---------- seeded RNG (world layout must be stable) ---------- */
B.mulberry32 = function (seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ---------- helpers ---------- */
B.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
B.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
B.lerp = (a, b, t) => a + (b - a) * t;
B.fmt$ = n => '$' + Math.round(n).toLocaleString('en-US');
B.pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

B.timeStr = function (minutes) {
  let h = Math.floor(minutes / 60) % 24, m = Math.floor(minutes % 60);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
};

B.hour = () => B.state ? (B.state.minutes / 60) % 24 : 12;   // noon on the title screen
B.isNight = () => { const h = B.hour(); return h >= 21 || h < 5; };
B.isDusk = () => { const h = B.hour(); return h >= 18 && h < 21; };
B.isDawn = () => { const h = B.hour(); return h >= 5 && h < 8; };

/* darkness 0..1 for the night overlay */
B.darkness = function () {
  const h = B.hour();
  if (h >= 8 && h < 18) return 0;
  if (h >= 18 && h < 21) return (h - 18) / 3 * 0.72;
  if (h >= 5 && h < 8) return (8 - h) / 3 * 0.72;
  return 0.72;
};

/* ---------- fresh game state ---------- */
B.newState = function () {
  return {
    day: 1,
    minutes: 7 * 60 + 30,
    cash: 25,
    heat: 0,
    rep: 0,
    community: 0,
    hp: 100,
    flags: {},                       // story / dialogue flags
    perks: {},                       // permanent bonuses (patrolMap, docksDiscount, ...)
    allies: {},                      // npc id -> true
    truck: { crates: 0, cap: 8, champagne: 0, stolen: false },
    speakeasy: {
      known: false,                  // learned the password / can enter
      openForBusiness: false,        // after Opening Night
      stock: 0, price: 1.0,
      doorman: false, musician: false, premium: false,
      closedTonight: false, raidedDays: 0,
      lastNight: null, lifetime: 0,
    },
    mission: null, stage: 0, completed: [],
    clocks: { obanion: 0, fed: 0 },  // faction pressure timelines — the world moves if you don't
    side: {},                        // side quest id -> stage number / 'done'
    stats: { runs: 0, cratesMoved: 0, nightsOpen: 0, timesBusted: 0 },
    confessedDay: 0,
    payoffDay: 0,
  };
};

/* ---------- mutation helpers (with toasts) ---------- */
B.addCash = function (n, silent) {
  B.state.cash = Math.max(0, B.state.cash + n);
  if (!silent && n !== 0) B.toast((n > 0 ? '+$' : '−$') + Math.abs(Math.round(n)), n > 0 ? 'money' : 'bad');
};
B.pay = function (n) {          // returns false if can't afford
  if (B.state.cash < n) { B.toast("You don't have the scratch. (" + B.fmt$(n) + " needed)", 'bad'); return false; }
  B.state.cash -= n;
  B.toast('−$' + Math.round(n), 'bad');
  return true;
};
B.addHeat = function (n) {
  B.state.heat = B.clamp(B.state.heat + n, 0, 100);
  if (n >= 3) B.toast('Heat +' + Math.round(n) + ' — the law is paying attention', 'bad');
  if (n <= -3) B.toast('Heat ' + Math.round(n), 'money');
};
B.addRep = function (n) {
  B.state.rep = B.clamp(B.state.rep + n, 0, 100);
  if (n > 0) B.toast('Reputation +' + n + ' with the outfit', 'money');
};
B.addCommunity = function (n) {
  B.state.community = B.clamp(B.state.community + n, -20, 100);
  if (n > 0) B.toast('The neighborhood thinks better of you (+' + n + ')', 'money');
  else if (n < 0) B.toast('The neighborhood sours on you (' + n + ')', 'bad');
};

/* ---------- event bus ---------- */
B.listeners = {};
B.on = function (name, fn) { (B.listeners[name] = B.listeners[name] || []).push(fn); };
B.emit = function (name, data) {
  (B.listeners[name] || []).forEach(fn => fn(data));
  (B.listeners['*'] || []).forEach(fn => fn(name, data));
};

/* ---------- input ---------- */
B.keys = {};
B.mode = 'title';   // title | play | dialogue | panel | flash

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  B.keys[e.key.toLowerCase()] = true;
  B.emit('keydown', e);
});
window.addEventListener('keyup', e => { B.keys[e.key.toLowerCase()] = false; });

B.axis = function () {
  let dx = 0, dy = 0;
  if (B.keys['w'] || B.keys['arrowup']) dy -= 1;
  if (B.keys['s'] || B.keys['arrowdown']) dy += 1;
  if (B.keys['a'] || B.keys['arrowleft']) dx -= 1;
  if (B.keys['d'] || B.keys['arrowright']) dx += 1;
  if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
  return { dx, dy };
};
