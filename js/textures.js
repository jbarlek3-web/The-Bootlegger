'use strict';
/* The Bootlegger — procedural textures.
 * All environment art is generated once at boot on offscreen canvases:
 * cobblestone roads, pavers, brick facades, roofs, water, posters, signs.
 * No asset files — the whole look ships in code. */

(function () {
  const TS = B.TILE;
  B.TEX = { tile: {}, facade: {}, posters: [] };

  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function shade(hex, f) {   // lighten (f>0) / darken (f<0) a #rrggbb colour
    const n = parseInt(hex.slice(1), 16);
    const ch = s => B.clamp(Math.round(((n >> s) & 255) * (1 + f)), 0, 255);
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
  }
  B.shade = shade;

  /* ---------------- tile textures (2-3 seeded variants each) ---------------- */
  function makeVariants(count, painter) {
    const out = [];
    for (let v = 0; v < count; v++) {
      const c = cv(TS, TS), ctx = c.getContext('2d');
      painter(ctx, B.mulberry32(9000 + v * 131));
      out.push(c);
    }
    return out;
  }

  function cobbles(ctx, rng, base, grout) {
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, TS, TS);
    const rows = 4, cols = 4;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (TS / cols / 2);
      for (let c = -1; c < cols; c++) {
        const x = c * (TS / cols) + off + 1, y = r * (TS / rows) + 1;
        const w = TS / cols - 2, h = TS / rows - 2;
        const tint = (rng() - 0.5) * 0.22;
        ctx.fillStyle = shade(base, tint);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, 2); else ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.07)';           // top light catch
        ctx.fillRect(x + 1, y + 1, w - 2, 1.5);
      }
    }
  }

  B.buildTextures = function () {
    const T = B.T;

    B.TEX.tile[T.ROAD] = makeVariants(3, (ctx, rng) => cobbles(ctx, rng, '#4a443b', '#2a2620'));
    B.TEX.tile[T.DIRT] = makeVariants(2, (ctx, rng) => {
      ctx.fillStyle = '#6a5638'; ctx.fillRect(0, 0, TS, TS);
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = shade('#6a5638', (rng() - 0.5) * 0.3);
        ctx.fillRect(rng() * TS, rng() * TS, 2 + rng() * 3, 1.5);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.14)';                    // wheel ruts
      ctx.fillRect(6, 0, 3, TS); ctx.fillRect(TS - 9, 0, 3, TS);
    });

    B.TEX.tile[T.WALK] = makeVariants(3, (ctx, rng) => {
      ctx.fillStyle = '#5b554a'; ctx.fillRect(0, 0, TS, TS);
      ctx.strokeStyle = 'rgba(35,30,24,0.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, TS - 1, TS - 1);
      for (let i = 0; i < 16; i++) {                          // speckle
        ctx.fillStyle = 'rgba(0,0,0,' + (0.04 + rng() * 0.06) + ')';
        ctx.fillRect(rng() * TS, rng() * TS, 1.5, 1.5);
      }
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(rng() * TS, rng() * TS, 2, 1);
      }
      if (rng() < 0.25) {                                     // occasional short crack
        ctx.strokeStyle = 'rgba(30,26,20,0.3)';
        const x = rng() * TS;
        ctx.beginPath(); ctx.moveTo(x, rng() * 10);
        ctx.lineTo(x + (rng() - 0.5) * 8, 10 + rng() * 16); ctx.stroke();
      }
    });

    B.TEX.tile[T.GRASS] = makeVariants(3, (ctx, rng) => {
      ctx.fillStyle = '#32402a'; ctx.fillRect(0, 0, TS, TS);
      for (let i = 0; i < 34; i++) {
        ctx.fillStyle = shade('#32402a', (rng() - 0.4) * 0.35);
        ctx.fillRect(rng() * TS, rng() * TS, 1.5, 2.5 + rng() * 2);
      }
    });
    B.TEX.tile[T.PARK] = makeVariants(3, (ctx, rng) => {
      ctx.fillStyle = '#374c30'; ctx.fillRect(0, 0, TS, TS);
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = shade('#374c30', (rng() - 0.4) * 0.3);
        ctx.fillRect(rng() * TS, rng() * TS, 1.5, 2.5);
      }
    });

    B.TEX.tile[T.WATER] = makeVariants(2, (ctx, rng) => {
      const g = ctx.createLinearGradient(0, 0, 0, TS);
      g.addColorStop(0, '#243f57'); g.addColorStop(1, '#1e364b');
      ctx.fillStyle = g; ctx.fillRect(0, 0, TS, TS);
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      for (let i = 0; i < 3; i++) ctx.fillRect(rng() * TS, rng() * TS, 8 + rng() * 10, 1.5);
    });

    B.TEX.tile[T.PIER] = makeVariants(2, (ctx, rng) => {
      ctx.fillStyle = '#5d4c31'; ctx.fillRect(0, 0, TS, TS);
      for (let p = 0; p < 4; p++) {
        ctx.fillStyle = shade('#71603f', (rng() - 0.5) * 0.25);
        ctx.fillRect(0, p * 8 + 1, TS, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(rng() * TS, p * 8 + 3, 2, 2);           // nail heads
      }
    });

    B.TEX.tile[T.FARM] = makeVariants(2, (ctx, rng) => {
      ctx.fillStyle = '#6f5a37'; ctx.fillRect(0, 0, TS, TS);
      for (let r = 0; r < 4; r++) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, r * 8 + 4, TS, 3);
        ctx.fillStyle = 'rgba(120,160,80,' + (0.12 + rng() * 0.15) + ')';
        ctx.fillRect(2, r * 8 + 1, TS - 4, 2);
      }
    });

    /* facade brick sheets, one per building colour, built lazily */
    B.TEX.brickFor = function (color) {
      if (B.TEX.facade[color]) return B.TEX.facade[color];
      const c = cv(64, TS), ctx = c.getContext('2d');
      const rng = B.mulberry32(1000 + (parseInt(color.slice(1), 16) % 977));
      ctx.fillStyle = shade(color, -0.12); ctx.fillRect(0, 0, 64, TS);
      const bh = 5;
      for (let r = 0; r < Math.ceil(TS / bh); r++) {
        const off = (r % 2) * 6;
        for (let x = -6; x < 64; x += 12) {
          ctx.fillStyle = shade(color, (rng() - 0.45) * 0.28);
          ctx.fillRect(x + off + 0.5, r * bh + 0.5, 11, bh - 1);
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, 64, 2);
      B.TEX.facade[color] = c;
      return c;
    };

    /* the Blind Tiger's bar room — painted once, shown atop the management panel */
    B.TEX.tigerInterior = (function () {
      const w2 = 808, h2 = 190, c = cv(w2, h2), g = c.getContext('2d');
      const rng = B.mulberry32(1929);
      // red velvet wall with paneling
      const grad = g.createLinearGradient(0, 0, 0, h2);
      grad.addColorStop(0, '#3a1216'); grad.addColorStop(1, '#24090c');
      g.fillStyle = grad; g.fillRect(0, 0, w2, h2);
      g.strokeStyle = 'rgba(120,40,45,0.5)'; g.lineWidth = 2;
      for (let x = 30; x < w2; x += 90) g.strokeRect(x, 14, 66, 74);
      // back bar: shelves of bottles
      g.fillStyle = '#2a1a10';
      g.fillRect(180, 20, 450, 92);
      g.strokeStyle = '#171008'; g.lineWidth = 3;
      g.strokeRect(180, 20, 450, 92);
      for (const sy of [50, 82]) {
        g.fillStyle = '#3f2a16'; g.fillRect(186, sy, 438, 5);
        for (let x = 196; x < 610; x += 18) {
          const bh2 = 16 + rng() * 8;
          g.fillStyle = ['#7c4a1e', '#3c5a34', '#7c2a26', '#c8a44a', '#3a4a6a'][Math.floor(rng() * 5)];
          g.fillRect(x, sy - bh2, 8, bh2);
          g.fillStyle = 'rgba(255,255,255,0.25)';
          g.fillRect(x + 1.5, sy - bh2 + 2, 2, bh2 - 4);
          g.fillStyle = '#241a10';
          g.fillRect(x + 2, sy - bh2 - 3, 4, 4);
        }
      }
      // neon sign over the bar
      g.font = 'bold 26px Georgia'; g.textAlign = 'center';
      g.fillStyle = 'rgba(255,80,120,0.35)';
      for (let k = 6; k > 0; k--) g.fillText('THE BLIND TIGER', w2 / 2 + 3, 40, 400);
      g.fillStyle = '#ff9ab8';
      g.fillText('THE BLIND TIGER', w2 / 2 + 3, 40, 400);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.font = 'bold 25px Georgia';
      g.fillText('THE BLIND TIGER', w2 / 2 + 3, 39.5, 396);
      // bar counter
      const bg2 = g.createLinearGradient(0, 118, 0, 150);
      bg2.addColorStop(0, '#5a3a1c'); bg2.addColorStop(1, '#341f0e');
      g.fillStyle = bg2; g.fillRect(120, 118, 570, 34);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(120, 118, 570, 4);
      g.fillStyle = '#241505'; g.fillRect(120, 150, 570, 8);
      // stools
      for (let x = 170; x < 660; x += 90) {
        g.fillStyle = '#6a1f22';
        g.beginPath(); g.ellipse(x, 168, 20, 7, 0, 0, 7); g.fill();
        g.fillStyle = '#1c1208';
        g.fillRect(x - 3, 172, 6, 16);
      }
      // hanging lamps with warm pools
      for (const lx of [230, 404, 578]) {
        g.strokeStyle = '#0f0a06'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, 12); g.stroke();
        g.fillStyle = '#2a2014';
        g.beginPath(); g.moveTo(lx - 12, 20); g.lineTo(lx + 12, 20); g.lineTo(lx + 6, 10); g.lineTo(lx - 6, 10);
        g.closePath(); g.fill();
        const lg = g.createRadialGradient(lx, 24, 2, lx, 24, 60);
        lg.addColorStop(0, 'rgba(255,205,120,0.5)'); lg.addColorStop(1, 'rgba(255,205,120,0)');
        g.fillStyle = lg;
        g.beginPath(); g.arc(lx, 24, 60, 0, 7); g.fill();
        g.fillStyle = '#ffe6a8';
        g.beginPath(); g.arc(lx, 22, 3.4, 0, 7); g.fill();
      }
      // vignette
      const vg = g.createRadialGradient(w2 / 2, h2 / 2, h2 / 2, w2 / 2, h2 / 2, w2 / 1.4);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = vg; g.fillRect(0, 0, w2, h2);
      return c.toDataURL();
    })();

    /* tattered street posters, in the reference's style */
    const posterSpecs = [
      { lines: ['PROHIBITION'], sub: 'IS THE LAW', tone: '#cfc0a2' },
      { lines: ['VOTE DRY'], sub: 'TEMPERANCE LEAGUE', tone: '#c9b795' },
      { lines: ['WANTED'], sub: 'RUM RUNNERS · REWARD', tone: '#d4c6a8' },
      { lines: ['OLD CROW', 'WHISKEY'], sub: 'banned 1920', tone: '#bfae8e' },
    ];
    B.TEX.posters = posterSpecs.map((p, i) => {
      const w = 46, h = 58, c = cv(w, h), ctx = c.getContext('2d');
      const rng = B.mulberry32(300 + i * 17);
      ctx.fillStyle = p.tone;
      // torn outline
      ctx.beginPath(); ctx.moveTo(2, 2);
      for (let x = 2; x < w - 2; x += 6) ctx.lineTo(x, 1 + rng() * 3);
      ctx.lineTo(w - 2, 2);
      for (let y = 2; y < h - 2; y += 7) ctx.lineTo(w - 1 - rng() * 3, y);
      ctx.lineTo(w - 4, h - 2);
      for (let x = w - 2; x > 2; x -= 6) ctx.lineTo(x, h - 1 - rng() * 4);
      for (let y = h - 2; y > 2; y -= 7) ctx.lineTo(1 + rng() * 3, y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b241a';
      ctx.textAlign = 'center';
      ctx.font = 'bold 9px Georgia';
      p.lines.forEach((ln, k) => ctx.fillText(ln, w / 2, 20 + k * 11));
      ctx.font = '6px Georgia';
      ctx.fillText(p.sub, w / 2, h - 14);
      ctx.strokeStyle = 'rgba(43,36,26,0.6)';
      ctx.strokeRect(5.5, 7.5, w - 11, h - 15);
      // weathering
      for (let k = 0; k < 12; k++) {
        ctx.fillStyle = 'rgba(60,48,30,' + (0.04 + rng() * 0.1) + ')';
        ctx.fillRect(rng() * w, rng() * h, 3 + rng() * 6, 2 + rng() * 4);
      }
      return c;
    });
  };
})();
