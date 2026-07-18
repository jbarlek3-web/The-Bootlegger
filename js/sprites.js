'use strict';
/* The Bootlegger — pre-rendered character & vehicle sprites.
 * Everyone is drawn in the reference style: heavy dark outline, fedora or
 * cloche, long overcoat, pinstripe trousers. Each archetype gets a small
 * walk-cycle strip rendered once at boot; frames flip for facing. */

(function () {
  const SCALE = 3;                 // supersample for crisp outlines
  const W = 26, H = 36;            // logical sprite size in px
  const OUT = '#17120c';           // ink outline

  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* draw one frame. pose: -1 left leg forward, 0 standing, 1 right leg forward */
  function drawFigure(ctx, o, pose) {
    const g = ctx;
    g.save();
    g.translate(W / 2, 0);
    g.lineJoin = 'round';
    g.lineWidth = 1.6;
    g.strokeStyle = OUT;
    const bob = pose === 0 ? 0 : 0.6;

    /* legs (hidden under skirt for dress archetypes) */
    if (!o.dress) {
      const spread = pose * 3.2;
      for (const s of [-1, 1]) {
        const lx = s * 2.6 + (s === -1 ? -spread : spread) * 0.5;
        g.fillStyle = o.trousers;
        g.beginPath();
        g.roundRect(lx - 2.2, 21 + bob, 4.4, 11, 1.5);
        g.fill(); g.stroke();
        // pinstripes
        g.strokeStyle = 'rgba(200,200,210,0.35)';
        g.lineWidth = 0.5;
        g.beginPath(); g.moveTo(lx, 22 + bob); g.lineTo(lx, 31 + bob); g.stroke();
        g.lineWidth = 1.6; g.strokeStyle = OUT;
        // shoe
        g.fillStyle = o.shoe;
        g.beginPath();
        g.ellipse(lx + s * 0.6, 33.4 + bob, 3, 1.8, 0, 0, 7);
        g.fill(); g.stroke();
      }
    }

    /* coat / dress body */
    g.fillStyle = o.coat;
    g.beginPath();
    if (o.dress) {
      g.moveTo(-4.5, 12); g.quadraticCurveTo(-8, 24, -6.5, 32);
      g.lineTo(6.5, 32); g.quadraticCurveTo(8, 24, 4.5, 12);
      g.quadraticCurveTo(0, 9.5, -4.5, 12);
    } else {
      const sway = pose * 1.4;
      g.moveTo(-6, 13);
      g.quadraticCurveTo(-7.5 - sway, 20, -6 - sway, 27 + bob);
      g.lineTo(6 + sway, 27 + bob);
      g.quadraticCurveTo(7.5 + sway, 20, 6, 13);
      g.quadraticCurveTo(0, 10, -6, 13);
    }
    g.fill(); g.stroke();

    /* coat opening: vest + tie (suit archetypes only) */
    if (!o.dress) {
      g.fillStyle = o.vest;
      g.beginPath();
      g.moveTo(-2.4, 13); g.lineTo(2.4, 13); g.lineTo(1.6, 24); g.lineTo(-1.6, 24);
      g.closePath(); g.fill();
      g.fillStyle = '#e9e2d2';                                // collar
      g.beginPath(); g.moveTo(-2.4, 13); g.lineTo(0, 15.5); g.lineTo(2.4, 13);
      g.closePath(); g.fill();
      g.fillStyle = o.tie;
      g.fillRect(-0.9, 14.5, 1.8, 7);
      // buttons
      g.fillStyle = 'rgba(230,220,190,0.8)';
      [17, 20, 23].forEach(y => g.fillRect(3.2, y, 1.1, 1.1));
    } else {
      g.fillStyle = 'rgba(255,255,255,0.18)';                 // dress trim
      g.fillRect(-4, 14, 8, 1.2);
    }

    /* lapels */
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(-2.4, 13); g.lineTo(-4.6, 17); g.stroke();
    g.beginPath(); g.moveTo(2.4, 13); g.lineTo(4.6, 17); g.stroke();
    g.lineWidth = 1.6; g.strokeStyle = OUT;

    /* arms */
    const swing = pose * 2.4;
    for (const s of [-1, 1]) {
      g.fillStyle = o.coat;
      g.beginPath();
      g.roundRect(s * 6 - 1.7 + (s === 1 ? swing : -swing) * 0.3, 13.5, 3.4, 10.5, 2);
      g.fill(); g.stroke();
      g.fillStyle = o.skin;                                   // hand
      g.beginPath(); g.arc(s * 6 - 0 + (s === 1 ? swing : -swing) * 0.3, 25, 1.5, 0, 7);
      g.fill();
    }

    /* head */
    g.fillStyle = o.skin;
    g.beginPath(); g.arc(0, 8, 4.6, 0, 7);
    g.fill(); g.stroke();
    // stern brow + shadow
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(-3, 6.2, 6, 1);
    g.fillStyle = OUT;
    g.fillRect(-2.4, 7.4, 1.3, 1);
    g.fillRect(1.1, 7.4, 1.3, 1);

    /* hat */
    if (o.cap === 'flat') {                                   // thug flat cap
      g.fillStyle = o.hat;
      g.beginPath(); g.ellipse(0, 4.6, 5.4, 2.6, 0, Math.PI, 0);
      g.fill(); g.stroke();
      g.fillRect(-5.2, 4, 10.4, 1.6);
    } else if (o.cap === 'cloche') {                          // ladies' cloche
      g.fillStyle = o.hat;
      g.beginPath(); g.arc(0, 5.6, 5, Math.PI * 0.95, Math.PI * 2.05);
      g.quadraticCurveTo(5.4, 8.6, 4.4, 9.2);
      g.lineTo(-4.4, 9.2); g.quadraticCurveTo(-5.4, 8.6, -5, 5.6);
      g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(-4.5, 7.6, 9, 1);
    } else if (o.cap === 'police') {                          // peaked cap
      g.fillStyle = o.hat;
      g.beginPath(); g.ellipse(0, 4.4, 5.6, 2.8, 0, 0, 7);
      g.fill(); g.stroke();
      g.fillStyle = '#111';
      g.beginPath(); g.ellipse(0, 6.2, 4.6, 1.4, 0, 0, Math.PI);
      g.fill();
      g.fillStyle = '#d8c15a';                                // cap badge
      g.fillRect(-0.8, 3.2, 1.6, 1.6);
    } else {                                                  // fedora
      g.fillStyle = o.hat;
      g.beginPath(); g.ellipse(0, 4.8, 6.4, 2.4, 0, 0, 7);    // brim
      g.fill(); g.stroke();
      g.beginPath();
      g.moveTo(-4, 4.8);
      g.quadraticCurveTo(-4.6, -0.6, 0, -0.8);
      g.quadraticCurveTo(4.6, -0.6, 4, 4.8);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.45)';                       // band
      g.fillRect(-4.2, 3, 8.4, 1.6);
    }

    /* badge for cops */
    if (o.badge) {
      g.fillStyle = '#d8c15a';
      g.beginPath(); g.arc(-2.6, 16, 1.2, 0, 7); g.fill();
    }
    g.restore();
  }

  function makeStrip(opts) {
    const frames = [0, -1, 0, 1];               // idle, step L, pass, step R
    const c = cv(W * SCALE * frames.length, H * SCALE);
    const ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE);
    frames.forEach((pose, i) => {
      ctx.save();
      ctx.translate(i * W, 0);
      drawFigure(ctx, opts, pose);
      ctx.restore();
    });
    return c;
  }

  /* archetype key -> sprite strip */
  const cache = {};
  B.spriteFor = function (n) {
    const female = { rosa: 1, mrsk: 1, vivian: 1, prudence: 1 }[n.id] ||
      (n.kind === 'ped' && /Flapper|Shop girl|Housewife/.test(n.name || ''));
    const opts = {
      coat: n.coat || '#4a3a2a',
      hat: n.hat || (n.kind === 'cop' ? '#1d2a4a' : '#33291c'),
      skin: n.color || '#c8b48a',
      trousers: n.trousers || '#2c2a30',
      vest: n.vest || B.shade(n.coat || '#4a3a2a', -0.3),
      tie: '#1c1a20',
      shoe: '#241a10',
      dress: !!female,
      cap: n.kind === 'cop' ? 'police' : n.kind === 'thug' ? 'flat' : female ? 'cloche' : 'fedora',
      badge: n.kind === 'cop',
    };
    const key = JSON.stringify(opts);
    if (!cache[key]) cache[key] = makeStrip(opts);
    return cache[key];
  };

  /* draw a person at screen px,py (feet anchor), with walk phase + facing flip */
  B.drawSprite = function (ctx, n, px, py) {
    const strip = B.spriteFor(n);
    const moving = (B.frame - (n._lastMove || -99)) < 4;
    const seq = [1, 0, 3, 0];              // stepL, pass, stepR, pass
    const f = moving ? seq[Math.floor((n.walk || 0) * 3) % 4] : 0;
    const flip = Math.cos(n.facing || 0) < -0.05;
    ctx.save();
    ctx.translate(px, py);
    // contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 9, 9, 3.4, 0, 0, 7); ctx.fill();
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(strip, f * W * SCALE, 0, W * SCALE, H * SCALE, -W / 2 - 1, -H + 10, W + 2, H + 2);
    ctx.restore();
  };

  /* ---------------- the truck ---------------- */
  B.buildTruckSprite = function () {
    const L = 56, Wd = 30;
    const c = cv(L * SCALE, Wd * SCALE), g = c.getContext('2d');
    g.scale(SCALE, SCALE);
    g.lineJoin = 'round'; g.lineWidth = 1.4; g.strokeStyle = OUT;
    // bed (rear, left side of sprite) — wood slats under a tarp
    g.fillStyle = '#4c3a22';
    g.beginPath(); g.roundRect(2, 3, 30, Wd - 6, 2); g.fill(); g.stroke();
    g.fillStyle = '#6b5433';
    g.beginPath(); g.roundRect(4, 5, 26, Wd - 10, 2); g.fill();
    for (let x = 8; x < 30; x += 5) {                        // slats
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, 5); g.lineTo(x, Wd - 5); g.stroke();
    }
    g.lineWidth = 1.4; g.strokeStyle = OUT;
    // tarp over half the bed
    g.fillStyle = '#5d6653';
    g.beginPath(); g.roundRect(4, 5, 14, Wd - 10, 3); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.moveTo(8, 5); g.lineTo(8, Wd - 5); g.moveTo(13, 5); g.lineTo(13, Wd - 5); g.stroke();
    g.strokeStyle = OUT;
    // cab
    g.fillStyle = '#54422a';
    g.beginPath(); g.roundRect(32, 4, 12, Wd - 8, 2); g.fill(); g.stroke();
    g.fillStyle = '#2e3d46';                                 // roof glass hint
    g.beginPath(); g.roundRect(33.5, 6, 9, Wd - 12, 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath(); g.roundRect(34.5, 7, 3, Wd - 14, 1.5); g.fill();
    // hood
    g.fillStyle = '#5c4a2e';
    g.beginPath(); g.roundRect(44, 6, 9, Wd - 12, 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(46, 7, 1.4, Wd - 14); g.fillRect(49, 7, 1.4, Wd - 14);   // vents
    // radiator + headlamps
    g.fillStyle = '#8b8b83';
    g.fillRect(53, 8, 2, Wd - 16);
    g.fillStyle = '#ffe9a8';
    g.beginPath(); g.arc(53.6, 7, 1.6, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.arc(53.6, Wd - 7, 1.6, 0, 7); g.fill(); g.stroke();
    // fenders + wheels
    g.fillStyle = '#141210';
    [[6, 2.6], [26, 2.6], [46, 2.6]].forEach(([x]) => {
      g.beginPath(); g.roundRect(x - 4, -0.5, 9, 4, 2); g.fill();
      g.beginPath(); g.roundRect(x - 4, Wd - 3.5, 9, 4, 2); g.fill();
    });
    B.TEX.truck = c;
    B.TEX.truckSize = [L, Wd];
    makeSedan();
  };

  /* the prowl car — a black-and-navy sedan */
  function makeSedan() {
    const L = 46, Wd = 24;
    const c = cv(L * SCALE, Wd * SCALE), g = c.getContext('2d');
    g.scale(SCALE, SCALE);
    g.lineJoin = 'round'; g.lineWidth = 1.4; g.strokeStyle = OUT;
    g.fillStyle = '#1d2438';
    g.beginPath(); g.roundRect(2, 3, L - 6, Wd - 6, 4); g.fill(); g.stroke();
    g.fillStyle = '#12161f';                              // cabin roof
    g.beginPath(); g.roundRect(12, 5.5, 18, Wd - 11, 3); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.beginPath(); g.roundRect(14, 7, 5, Wd - 14, 2); g.fill();
    g.fillStyle = '#e8e2d2';
    g.font = 'bold 5px Georgia'; g.textAlign = 'center';
    g.save(); g.translate(21, Wd / 2); g.rotate(0); g.fillText('POLICE', 0, 1.8); g.restore();
    g.fillStyle = '#5c6470';                              // radiator
    g.fillRect(L - 5, 7, 2, Wd - 14);
    g.fillStyle = '#ffe9a8';
    g.beginPath(); g.arc(L - 4.4, 6, 1.5, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.arc(L - 4.4, Wd - 6, 1.5, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#0c0a08';
    [[8], [34]].forEach(([x]) => {
      g.beginPath(); g.roundRect(x - 4, -0.2, 8.5, 3.6, 1.8); g.fill();
      g.beginPath(); g.roundRect(x - 4, Wd - 3.4, 8.5, 3.6, 1.8); g.fill();
    });
    B.TEX.police = c;
    B.TEX.policeSize = [L, Wd];
  }

  B.drawSedan = function (ctx, px, py, facing) {
    const [L, Wd] = B.TEX.policeSize;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(facing);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 2, L / 2, Wd / 2, 0, 0, 7); ctx.fill();
    ctx.drawImage(B.TEX.police, -L / 2, -Wd / 2, L, Wd);
    if (B.darkness() > 0.15) {
      ctx.fillStyle = 'rgba(255,230,160,0.14)';
      ctx.beginPath();
      ctx.moveTo(L / 2 - 2, -Wd / 2 + 5);
      ctx.lineTo(L / 2 + 40, -Wd / 2 - 5);
      ctx.lineTo(L / 2 + 40, Wd / 2 + 5);
      ctx.lineTo(L / 2 - 2, Wd / 2 - 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  B.drawTruck = function (ctx, px, py, facing) {
    const [L, Wd] = B.TEX.truckSize;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(facing);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 2, L / 2, Wd / 2, 0, 0, 7); ctx.fill();
    ctx.drawImage(B.TEX.truck, -L / 2, -Wd / 2, L, Wd);
    if (B.darkness() > 0.15) {                               // headlamp glow cones
      ctx.fillStyle = 'rgba(255,225,150,0.16)';
      ctx.beginPath();
      ctx.moveTo(L / 2 - 2, -Wd / 2 + 6);
      ctx.lineTo(L / 2 + 46, -Wd / 2 - 6);
      ctx.lineTo(L / 2 + 46, Wd / 2 + 6);
      ctx.lineTo(L / 2 - 2, Wd / 2 - 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };
})();
