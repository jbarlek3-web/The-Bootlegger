'use strict';
/* The Bootlegger — gfx: pre-baked procedural textures and sprite painters.
 * Everything here is generated once at load into offscreen canvases; the
 * per-frame renderers in world.js / entities.js only blit. */

(function () {
  const T = B.T, TS = B.TILE;
  const VARIANTS = 4;                   // texture variants per tile type

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* pick a stable variant per map cell */
  B.texVariant = (i, j) => ((i * 7 + j * 13) & 1023) % VARIANTS;

  /* ================= tile textures ================= */
  B.TEX = {};                            // T.* -> [canvas, canvas, ...]

  function speckle(g, rng, base, colors, n, r0, r1) {
    g.fillStyle = base; g.fillRect(0, 0, TS, TS);
    for (let k = 0; k < n; k++) {
      g.fillStyle = colors[(rng() * colors.length) | 0];
      const r = r0 + rng() * (r1 - r0);
      g.beginPath(); g.arc(rng() * TS, rng() * TS, r, 0, 7); g.fill();
    }
  }

  function bakeGrass(g, rng, base, dark, light) {
    speckle(g, rng, base, [dark, dark, light], 46, 0.7, 1.8);
    // sparse blade strokes
    g.strokeStyle = light; g.lineWidth = 1; g.globalAlpha = 0.5;
    for (let k = 0; k < 8; k++) {
      const x = rng() * TS, y = rng() * TS;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng() * 2 - 1, y - 3); g.stroke();
    }
    g.globalAlpha = 1;
  }

  function bakeCobbles(g, rng) {
    g.fillStyle = '#3a352d'; g.fillRect(0, 0, TS, TS);   // seam color
    const rows = 4, cols = 4;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (TS / cols / 2);
      for (let c = -1; c < cols; c++) {
        const x = c * (TS / cols) + off, y = r * (TS / rows);
        const v = 0.82 + rng() * 0.36;
        g.fillStyle = 'rgb(' + (76 * v | 0) + ',' + (70 * v | 0) + ',' + (59 * v | 0) + ')';
        g.beginPath();
        g.roundRect(x + 0.8, y + 0.8, TS / cols - 1.6, TS / rows - 1.6, 3);
        g.fill();
        if (rng() < 0.25) {              // worn highlight on some stones
          g.fillStyle = 'rgba(255,240,210,0.04)';
          g.beginPath(); g.roundRect(x + 1, y + 1, TS / cols - 2, 2, 2); g.fill();
        }
      }
    }
  }

  function bakeWalk(g, rng) {
    g.fillStyle = '#918573'; g.fillRect(0, 0, TS, TS);
    // per-slab shading variance (quadrants shift subtly)
    for (const [qx, qy] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
      g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,' + (rng() * 0.05) + ')' : 'rgba(255,244,220,' + (rng() * 0.04) + ')';
      g.fillRect(qx, qy, 16, 16);
    }
    // interior slab seams only — the 32px tile borders stay seamless
    g.strokeStyle = 'rgba(48,42,32,0.30)'; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(16.5, 0); g.lineTo(16.5, TS);
    g.moveTo(0, 16.5); g.lineTo(TS, 16.5);
    g.stroke();
    // wear + cracks
    for (let k = 0; k < 14; k++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,245,220,0.05)';
      g.beginPath(); g.arc(rng() * TS, rng() * TS, 0.6 + rng() * 1.6, 0, 7); g.fill();
    }
    if (rng() < 0.4) {
      g.strokeStyle = 'rgba(30,26,20,0.35)'; g.lineWidth = 1;
      let x = rng() * TS, y = rng() * TS;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { x += rng() * 10 - 5; y += rng() * 10 - 5; g.lineTo(x, y); }
      g.stroke();
    }
  }

  function bakeDirt(g, rng) {
    speckle(g, rng, '#655236', ['#57462d', '#6f5c3d', '#4c3e28'], 40, 0.7, 2.2);
    // wheel ruts
    g.strokeStyle = 'rgba(40,32,20,0.4)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(9, 0); g.lineTo(9 + rng() * 3 - 1, TS); g.stroke();
    g.beginPath(); g.moveTo(23, 0); g.lineTo(23 + rng() * 3 - 1, TS); g.stroke();
    // stones
    for (let k = 0; k < 4; k++) {
      g.fillStyle = 'rgba(120,110,95,0.5)';
      g.beginPath(); g.arc(rng() * TS, rng() * TS, 1 + rng(), 0, 7); g.fill();
    }
  }

  function bakeFarm(g, rng) {
    g.fillStyle = '#6d5936'; g.fillRect(0, 0, TS, TS);
    for (let y = 2; y < TS; y += 8) {
      g.fillStyle = 'rgba(35,26,15,0.45)';
      g.fillRect(0, y, TS, 3);
      g.fillStyle = 'rgba(255,235,190,0.07)';
      g.fillRect(0, y + 3, TS, 1);
    }
    for (let k = 0; k < 10; k++) {
      g.fillStyle = rng() < 0.5 ? '#5c4a2c' : '#7a6540';
      g.beginPath(); g.arc(rng() * TS, rng() * TS, 0.8 + rng(), 0, 7); g.fill();
    }
  }

  function bakePier(g, rng) {
    g.fillStyle = '#453a28'; g.fillRect(0, 0, TS, TS);   // gaps between planks
    for (let y = 0; y < TS; y += 8) {
      const v = 0.78 + rng() * 0.26;
      g.fillStyle = 'rgb(' + (104 * v | 0) + ',' + (90 * v | 0) + ',' + (66 * v | 0) + ')';
      g.fillRect(0, y + 1, TS, 6);
      // grain
      g.strokeStyle = 'rgba(55,44,28,0.30)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, y + 2 + rng() * 4); g.lineTo(TS, y + 2 + rng() * 4); g.stroke();
      // nails at plank ends
      g.fillStyle = 'rgba(30,24,16,0.55)';
      g.fillRect(3, y + 3, 2, 2); g.fillRect(TS - 5, y + 3, 2, 2);
    }
  }

  function bakeWater(g, rng) {
    g.fillStyle = '#1f3a4e'; g.fillRect(0, 0, TS, TS);
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = rng() < 0.6 ? 'rgba(12,26,40,0.30)' : 'rgba(150,190,210,0.09)';
      g.lineWidth = 1 + rng();
      const y = rng() * TS;
      g.beginPath(); g.moveTo(0, y);
      g.quadraticCurveTo(TS / 2, y + rng() * 6 - 3, TS, y);
      g.stroke();
    }
  }

  function bakePark(g, rng) {
    bakeGrass(g, rng, '#42583a', '#37492f', '#50664a');
    if (rng() < 0.5) {                    // clover patch
      g.fillStyle = 'rgba(90,120,70,0.5)';
      g.beginPath(); g.arc(rng() * TS, rng() * TS, 3 + rng() * 3, 0, 7); g.fill();
    }
  }

  B.bakeTiles = function () {
    const bakers = {
      [T.GRASS]: (g, rng) => bakeGrass(g, rng, '#48513a', '#3c4430', '#555f43'),
      [T.PARK]: bakePark,
      [T.ROAD]: bakeCobbles,
      [T.WALK]: bakeWalk,
      [T.DIRT]: bakeDirt,
      [T.FARM]: bakeFarm,
      [T.PIER]: bakePier,
      [T.WATER]: bakeWater,
      [T.BUILDING]: (g, rng) => { g.fillStyle = '#241e16'; g.fillRect(0, 0, TS, TS); },
    };
    for (const t of Object.keys(bakers)) {
      B.TEX[t] = [];
      for (let v = 0; v < VARIANTS; v++) {
        const c = makeCanvas(TS, TS);
        bakers[t](c.getContext('2d'), B.mulberry32(t * 101 + v * 7919 + 3));
        B.TEX[t].push(c);
      }
    }
  };

  /* ================= building roofs ================= */
  /* Baked lazily per building into b._tex (roof + parapet + fixtures).
   * Light from the north-west; drop shadows fall south-east. */
  function shadeColor(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = B.clamp((n >> 16) * f, 0, 255) | 0,
      g = B.clamp(((n >> 8) & 255) * f, 0, 255) | 0,
      b = B.clamp((n & 255) * f, 0, 255) | 0;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  B.bakeBuilding = function (b, seed) {
    const w = b.w * TS, h = b.h * TS;
    const c = makeCanvas(w, h);
    const g = c.getContext('2d');
    const rng = B.mulberry32(1000 + seed * 37);

    // tar-and-gravel roof field
    g.fillStyle = shadeColor(b.color, 0.72);
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < w * h / 38; k++) {
      g.fillStyle = rng() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,240,210,0.045)';
      g.beginPath(); g.arc(rng() * w, rng() * h, 0.6 + rng() * 1.5, 0, 7); g.fill();
    }
    // tar seam lines
    g.strokeStyle = 'rgba(0,0,0,0.09)'; g.lineWidth = 2;
    for (let x = TS * 2.5; x < w - 10; x += TS * 2.5) {
      g.beginPath(); g.moveTo(x, 8); g.lineTo(x, h - 8); g.stroke();
    }

    // brick parapet ring
    const P = 7;
    g.fillStyle = shadeColor(b.color, 1.12);
    g.fillRect(0, 0, w, P); g.fillRect(0, h - P, w, P);
    g.fillRect(0, 0, P, h); g.fillRect(w - P, 0, P, h);
    // brick courses on the parapet
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 8) {
      g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, P); g.stroke();
      g.beginPath(); g.moveTo(x + 4.5, h - P); g.lineTo(x + 4.5, h); g.stroke();
    }
    for (let y = 0; y < h; y += 8) {
      g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(P, y + 0.5); g.stroke();
      g.beginPath(); g.moveTo(w - P, y + 4.5); g.lineTo(w, y + 4.5); g.stroke();
    }
    // NW light / SE shade on the parapet
    g.fillStyle = 'rgba(255,240,205,0.16)';
    g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
    g.fillStyle = 'rgba(0,0,0,0.38)';
    g.fillRect(0, h - 2, w, 2); g.fillRect(w - 2, 0, 2, h);
    // inner shadow where the roof meets the parapet
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(P, P, w - P * 2, 3); g.fillRect(P, P, 3, h - P * 2);

    /* fixtures */
    // chimneys
    const nCh = 1 + (rng() * 2.4 | 0);
    for (let k = 0; k < nCh; k++) {
      const cw = 10 + rng() * 6, chh = 8 + rng() * 5;
      const x = P + 6 + rng() * (w - P * 2 - cw - 12), y = P + 6 + rng() * (h - P * 2 - chh - 12);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(x + 3, y + 3, cw, chh);          // cast shadow
      g.fillStyle = '#6e4636';
      g.fillRect(x, y, cw, chh);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeRect(x + 0.5, y + 0.5, cw - 1, chh - 1);
      g.fillStyle = '#2a1f18'; g.fillRect(x + 2, y + 2, cw - 4, chh - 4);
      g.fillStyle = 'rgba(255,240,205,0.2)'; g.fillRect(x, y, cw, 1.5);
    }
    // skylights on big roofs
    if (b.w >= 6) {
      b._panes = [];
      for (let k = 1; k < b.w - 1; k += 2) {
        const x = k * TS + 6, y = TS + 2;
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 2, y + 2, 16, 14);
        g.fillStyle = '#242a2c'; g.fillRect(x, y, 16, 14);
        g.strokeStyle = 'rgba(190,200,200,0.18)'; g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, 15, 13);
        g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 8, y + 14); g.stroke();
        b._panes.push({ x: x + 8, y: y + 7, lit: rng() < 0.55 });
      }
    }
    // vent
    if (rng() < 0.6) {
      const x = P + 8 + rng() * (w - P * 2 - 24), y = h - P - 18 - rng() * 8;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + 5, y + 6, 5, 0, 7); g.fill();
      g.fillStyle = '#4b463c'; g.beginPath(); g.arc(x + 3, y + 4, 5, 0, 7); g.fill();
      g.fillStyle = '#615a4c'; g.beginPath(); g.arc(x + 3, y + 3, 4, 0, 7); g.fill();
    }
    // water tower on the big commercial roofs
    if (b.w >= 9) {
      const x = w - P - 30, y = P + 10;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.ellipse(x + 16, y + 18, 15, 13, 0, 0, 7); g.fill();
      g.fillStyle = '#5d4526';
      g.beginPath(); g.arc(x + 12, y + 12, 13, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x + 12, y + 12, 13, 0, 7); g.stroke();
      // stave lines + hoops
      g.beginPath(); g.arc(x + 12, y + 12, 9, 0, 7); g.stroke();
      g.beginPath(); g.arc(x + 12, y + 12, 4.5, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,240,205,0.18)';
      g.beginPath(); g.arc(x + 8, y + 8, 4, 0, 7); g.fill();
    }
    b._tex = c;
  };

  /* ================= decor sprites ================= */
  B.SPRITES = {};

  function bakeTree(v) {
    const c = makeCanvas(44, 44), g = c.getContext('2d');
    const rng = B.mulberry32(700 + v * 31);
    // canopy: dark base, mid, NW highlight
    const cx = 22, cy = 18;
    g.fillStyle = '#22301c';
    blob(g, rng, cx + 2, cy + 3, 15);
    g.fillStyle = ['#2f4a26', '#33502b', '#2b4423', '#375231'][v % 4];
    blob(g, rng, cx, cy, 14);
    g.fillStyle = 'rgba(200,225,170,0.14)';
    blob(g, rng, cx - 5, cy - 5, 8);
    return c;
  }
  function blob(g, rng, cx, cy, r) {
    g.beginPath();
    for (let a = 0; a < Math.PI * 2 + 0.2; a += 0.5) {
      const rr = r * (0.82 + rng() * 0.35);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath(); g.fill();
  }

  function bakeLamp() {
    const c = makeCanvas(16, 36), g = c.getContext('2d');
    // base
    g.fillStyle = '#191713';
    g.beginPath(); g.ellipse(8, 33, 5, 2.5, 0, 0, 7); g.fill();
    g.fillRect(6, 28, 4, 5);
    // pole with slight taper
    g.fillStyle = '#23201a';
    g.beginPath(); g.moveTo(6.5, 30); g.lineTo(7.4, 8); g.lineTo(8.6, 8); g.lineTo(9.5, 30); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.15)'; g.fillRect(7, 9, 1, 20);
    // crossarm + finial
    g.fillStyle = '#23201a';
    g.fillRect(4, 7, 8, 2);
    g.beginPath(); g.arc(8, 4.5, 1.6, 0, 7); g.fill();
    // glass housing (tinted per time of day at draw time)
    g.fillStyle = '#4d4838';
    g.beginPath(); g.moveTo(4.5, 8); g.lineTo(11.5, 8); g.lineTo(10, 14); g.lineTo(6, 14); g.closePath(); g.fill();
    return c;
  }

  function bakeBench() {
    const c = makeCanvas(32, 18), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(16, 15, 14, 3, 0, 0, 7); g.fill();
    g.fillStyle = '#1d1813';
    g.fillRect(3, 8, 3, 7); g.fillRect(26, 8, 3, 7);      // cast iron legs
    for (let k = 0; k < 3; k++) {                          // slats
      g.fillStyle = ['#5d472a', '#54402a', '#4d3a22'][k];
      g.fillRect(2, 4 + k * 3.4, 28, 2.6);
      g.fillStyle = 'rgba(255,235,190,0.12)';
      g.fillRect(2, 4 + k * 3.4, 28, 0.8);
    }
    return c;
  }

  function bakeCrate() {
    const c = makeCanvas(26, 26), g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(4, 4, 22, 22);
    g.fillStyle = '#7a5c30';
    g.fillRect(2, 2, 21, 21);
    g.strokeStyle = 'rgba(35,24,12,0.7)'; g.lineWidth = 1.5;
    g.strokeRect(2.7, 2.7, 19.6, 19.6);
    // planks + X brace
    g.beginPath();
    g.moveTo(2, 9); g.lineTo(23, 9); g.moveTo(2, 16); g.lineTo(23, 16);
    g.moveTo(3, 3) ; g.lineTo(22, 22); g.moveTo(22, 3); g.lineTo(3, 22);
    g.stroke();
    g.fillStyle = 'rgba(255,240,205,0.12)'; g.fillRect(2, 2, 21, 1.5);
    // stencil
    g.fillStyle = 'rgba(30,20,10,0.85)';
    g.font = 'bold 7px Georgia'; g.textAlign = 'center';
    g.fillText('XXX', 12.5, 14.5);
    return c;
  }

  B.bakeSprites = function () {
    B.SPRITES.tree = [0, 1, 2, 3].map(bakeTree);
    B.SPRITES.lamp = bakeLamp();
    B.SPRITES.bench = bakeBench();
    B.SPRITES.crate = bakeCrate();
  };

  /* one-time init (DOM not required — offscreen canvases only) */
  B.bakeTiles();
  B.bakeSprites();
})();
