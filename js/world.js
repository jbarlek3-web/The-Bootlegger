'use strict';
/* The Bootlegger — world: Harbor City map, named locations, collision, rendering.
 * Rendering draws pre-baked procedural textures (see textures.js): cobbled
 * roads, brick facades with lit windows, roofs, marquee signage, posters. */

(function () {
  const T = B.T, W = B.MAP_W, H = B.MAP_H;

  B.map = new Uint8Array(W * H);
  B.buildings = [];   // {x,y,w,h,name,color,named}
  B.doors = [];       // {x,y,id,label} interaction points (tile coords)
  B.decor = [];       // {x,y,type:'tree'|'lamp'|'bench'|'crate'|'poster'|'vent'}
  B.zones = [];       // {x,y,w,h,id} trigger rectangles

  const tile = (x, y) => B.map[y * W + x];
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) B.map[y * W + x] = t; };
  B.tileAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? T.WATER : tile(x | 0, y | 0);
  B.isSolid = (x, y) => !!B.SOLID[B.tileAt(x, y)];

  function rect(x, y, w, h, t) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, t);
  }

  function addBuilding(x, y, w, h, name, color, named) {
    rect(x, y, w, h, T.BUILDING);
    B.buildings.push({ x, y, w, h, name, color: color || '#5a4632', named: !!named });
  }
  function addDoor(x, y, id, label) { B.doors.push({ x, y, id, label }); }

  /* ================= build the map ================= */
  B.buildWorld = function () {
    const rng = B.mulberry32(1920);

    /* base: rural grass north, city pavement south */
    rect(0, 0, W, H, T.GRASS);
    rect(0, 24, 110, H - 24, T.WALK);

    /* harbor water along the east edge */
    rect(110, 24, W - 110, H - 24, T.WATER);

    /* city road grid */
    const VX = [6, 22, 38, 54, 70, 86, 102];
    const HY = [24, 40, 56, 72, 88];
    VX.forEach(x => rect(x, 24, 3, H - 24, T.ROAD));
    HY.forEach(y => rect(0, y, 110, 3, T.ROAD));

    /* rural roads: the main north highway (checkpointed in M5) and the farm track */
    rect(54, 0, 3, 24, T.DIRT);          // Route 9 — the Canada road
    rect(86, 0, 3, 24, T.DIRT);          // Hollis farm track — the quiet way
    rect(0, 20, 110, 2, T.DIRT);         // rural east-west lane joining both

    /* farmland patches */
    rect(92, 10, 14, 8, T.FARM);
    rect(60, 4, 12, 8, T.FARM);
    rect(20, 6, 16, 10, T.FARM);

    /* piers over the water */
    rect(105, 62, 12, 3, T.PIER);
    rect(105, 74, 12, 3, T.PIER);

    /* Union Square park */
    rect(58, 60, 11, 11, T.PARK);

    /* ---------- named buildings ---------- */
    addBuilding(10, 28, 9, 7, "O'Banion's Garage", '#4a3b3b', true);
    addDoor(14, 35, 'garage', "O'Banion's Garage");

    addBuilding(58, 28, 11, 9, 'Grand Hotel Ambassador', '#6b5a33', true);
    addDoor(63, 37, 'hotel', 'Grand Hotel Ambassador');

    addBuilding(74, 28, 8, 6, 'Herald-Tribune', '#54585e', true);
    addDoor(77, 34, 'herald', 'Herald-Tribune Building');

    addBuilding(42, 44, 6, 5, "Lombardi's Pharmacy", '#3d5545', true);
    addDoor(44, 49, 'pharmacy', "Lombardi's Pharmacy");

    addBuilding(58, 44, 9, 7, 'Police Precinct No. 4', '#3a4a5c', true);
    addDoor(62, 51, 'precinct', 'Police Precinct No. 4');

    addBuilding(74, 44, 11, 9, 'City Hall', '#726a54', true);
    addDoor(79, 53, 'cityhall', 'City Hall');

    addBuilding(26, 60, 9, 7, 'Moretti Import Co.', '#5c4326', true);
    addDoor(30, 67, 'hq', 'Moretti Import Co.');

    addBuilding(42, 60, 9, 8, 'Café Roma', '#6e3d2a', true);
    addDoor(46, 68, 'cafe', 'Café Roma');
    addDoor(51, 63, 'tigerback', 'Alley door — Café Roma');

    addBuilding(94, 60, 8, 7, 'Pier 7 Warehouse', '#4f4a3a', true);
    addDoor(97, 67, 'pier7', 'Pier 7 Warehouse');

    addBuilding(26, 76, 8, 8, "St. Michael's Church", '#7a7468', true);
    addDoor(29, 84, 'church', "St. Michael's Church");

    addBuilding(10, 76, 11, 9, 'Kowalski Tenements', '#5f4a3c', true);
    addDoor(15, 85, 'tenements', 'Kowalski Tenements');

    addBuilding(90, 76, 8, 6, 'Longshoremen Union Hall', '#556047', true);
    addDoor(93, 82, 'union', 'Longshoremen Union Hall');

    addBuilding(47, 2, 7, 6, 'Border Warehouse', '#43503f', true);
    addDoor(54, 5, 'border', 'Border Warehouse');

    addBuilding(90, 4, 6, 5, 'Hollis Farm', '#6d5b35', true);
    addDoor(89, 6, 'farm', 'Hollis Farm');

    /* ---------- generic filler buildings per block ---------- */
    const flavor = ['Rooming House', 'Barber', 'Tailor', 'Grocer', 'Hardware', 'Laundry',
      'Butcher', 'Print Shop', 'Apartments', 'Cobbler', 'Bakery', 'Bank of Harbor City',
      'Cigar Store', 'Millinery', 'Diner', 'Radio Shop', 'Ice House', 'Stables'];
    const colors = ['#5a4632', '#4e4438', '#5c503e', '#544a40', '#605040', '#4a4034'];
    const blocksX = [[9, 21], [25, 37], [41, 53], [57, 69], [73, 85], [89, 101]];
    const blocksY = [[27, 39], [43, 55], [59, 71], [75, 87]];

    const occupied = (x, y, w, h) => {
      for (const b of B.buildings) {
        if (x < b.x + b.w + 1 && x + w + 1 > b.x && y < b.y + b.h + 1 && y + h + 1 > b.y) return true;
      }
      return false;
    };

    for (const [bx0, bx1] of blocksX) for (const [by0, by1] of blocksY) {
      if (bx0 === 57 && by0 === 59) continue;                 // Union Square park
      let tries = 0, placed = 0;
      while (tries++ < 30 && placed < 4) {
        const w = 3 + Math.floor(rng() * 4), h = 3 + Math.floor(rng() * 3);
        const x = bx0 + 1 + Math.floor(rng() * (bx1 - bx0 - w - 1));
        const y = by0 + 1 + Math.floor(rng() * (by1 - by0 - h - 1));
        if (x < bx0 + 1 || y < by0 + 1 || x + w > bx1 || y + h > by1) continue;
        if (occupied(x, y, w, h)) continue;
        addBuilding(x, y, w, h, B.pick(rng, flavor), B.pick(rng, colors), false);
        placed++;
      }
    }

    /* ---------- decor ---------- */
    for (let i = 0; i < 10; i++) B.decor.push({ x: 59 + rng() * 9, y: 61 + rng() * 9, type: 'tree' });
    B.decor.push({ x: 61, y: 65, type: 'bench' }, { x: 66, y: 65, type: 'bench' });
    for (let i = 0; i < 40; i++) {
      const x = rng() * 110, y = rng() * 19;
      if (B.tileAt(x, y) === T.GRASS) B.decor.push({ x, y, type: 'tree' });
    }
    VX.forEach(x => HY.forEach(y => B.decor.push({ x: x - 0.5, y: y - 0.5, type: 'lamp' })));
    for (let i = 0; i < 6; i++) B.decor.push({ x: 103 + rng() * 3, y: 60 + rng() * 18, type: 'crate' });

    /* tattered posters on chosen facades, and steam vents in the alleys */
    B.decor.push(
      { x: 11.2, y: 34.1, type: 'poster', idx: 0 },   // garage — PROHIBITION
      { x: 17.1, y: 34.1, type: 'poster', idx: 2 },   // garage — WANTED
      { x: 12.4, y: 84.1, type: 'poster', idx: 3 },   // tenements — Old Crow
      { x: 18.3, y: 84.1, type: 'poster', idx: 0 },
      { x: 91.2, y: 81.1, type: 'poster', idx: 1 },   // union hall — VOTE DRY
      { x: 65.4, y: 50.1, type: 'poster', idx: 2 },   // precinct — WANTED
      { x: 43.2, y: 67.1, type: 'poster', idx: 0 },   // café roma front
      { x: 75.3, y: 33.1, type: 'poster', idx: 1 },   // herald
    );
    B.decor.push(
      { x: 52.4, y: 64.6, type: 'vent' },             // the Tiger's alley
      { x: 103.5, y: 66.5, type: 'vent' },            // docks
      { x: 21.4, y: 82.5, type: 'vent' },             // tenements alley
    );

    /* ---------- trigger zones ---------- */
    B.zones.push({ x: 53, y: 15, w: 5, h: 3, id: 'checkpoint' });   // Route 9 federal checkpoint
    B.zones.push({ x: 41, y: 59, w: 12, h: 10, id: 'tigerblock' });

    B.treeSolid = B.decor.filter(d => d.type === 'tree');
  };

  B.zoneAt = function (x, y) {
    return B.zones.filter(z => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h).map(z => z.id);
  };

  /* entity vs world collision: circle of radius r (in tiles) at tile coords */
  B.collides = function (x, y, r) {
    for (let j = Math.floor(y - r); j <= Math.floor(y + r); j++) {
      for (let i = Math.floor(x - r); i <= Math.floor(x + r); i++) {
        if (!B.isSolid(i, j)) continue;
        const nx = B.clamp(x, i, i + 1), ny = B.clamp(y, j, j + 1);
        if (B.dist(x, y, nx, ny) < r) return true;
      }
    }
    for (const t of (B.treeSolid || [])) {
      if (B.dist(x, y, t.x + 0.5, t.y + 0.5) < r + 0.35) return true;
    }
    return false;
  };

  /* ================= rendering ================= */

  /* deterministic per-window "is the light on tonight" */
  function windowLit(bx, wx, hour) {
    const h = ((bx * 73 + wx * 131) % 97) / 97;
    return h < 0.55 + (hour >= 23 || hour < 5 ? -0.25 : 0);
  }

  B.renderWorld = function (ctx, cam) {
    const ts = B.TILE;
    const x0 = Math.max(0, Math.floor(cam.x)), y0 = Math.max(0, Math.floor(cam.y));
    const x1 = Math.min(W, Math.ceil(cam.x + B.VIEW_W / ts)), y1 = Math.min(H, Math.ceil(cam.y + B.VIEW_H / ts));
    const dark = B.darkness();

    /* ---- ground ---- */
    for (let j = y0; j < y1; j++) {
      for (let i = x0; i < x1; i++) {
        const t = tile(i, j);
        const px = (i - cam.x) * ts, py = (j - cam.y) * ts;
        if (t === T.BUILDING) { continue; }                  // painted with its building
        const variants = B.TEX.tile[t];
        if (variants) {
          ctx.drawImage(variants[(i * 7 + j * 13) % variants.length], px, py);
        } else {
          ctx.fillStyle = '#444'; ctx.fillRect(px, py, ts, ts);
        }
        if (t === T.WATER && (i * 7 + j * 13 + (B.frame >> 5)) % 11 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.09)';
          ctx.fillRect(px + 6, py + 14, 14, 2);
        }
      }
    }

    /* wet sheen down the middle of night roads */
    if (dark > 0.3) {
      ctx.fillStyle = 'rgba(140,170,220,0.05)';
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
        if (tile(i, j) === T.ROAD && (i + j) % 3 === 0) {
          ctx.fillRect((i - cam.x) * ts + 8, (j - cam.y) * ts + 10, 18, 3);
        }
      }
    }

    /* ---- buildings: roof + brick facade + windows + signage ---- */
    const hour = B.hour();
    const pxp = B.player ? B.player.x : 0, pyp = B.player ? B.player.y : 0;
    for (const b of B.buildings) {
      if (b.x + b.w < cam.x - 1 || b.x > cam.x + B.VIEW_W / ts + 1) continue;
      if (b.y + b.h < cam.y - 2 || b.y > cam.y + B.VIEW_H / ts + 1) continue;
      const bx = (b.x - cam.x) * ts, by = (b.y - cam.y) * ts;
      const bw = b.w * ts, bh = b.h * ts;
      const facH = ts;                                       // bottom row is the street face

      /* roof — dark tar and gravel */
      ctx.fillStyle = B.shade(b.color, -0.58);
      ctx.fillRect(bx, by, bw, bh - facH);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';                    // tar seams
      for (let yy = by + 22; yy < by + bh - facH - 6; yy += 26) ctx.fillRect(bx + 4, yy, bw - 8, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';              // gravel sparkle
      for (let k = 0; k < b.w * (b.h - 1) * 2; k += 2) {
        ctx.fillRect(bx + (k * 37 % bw), by + (k * 53 % Math.max(1, bh - facH)), 2, 2);
      }
      // parapet rim
      ctx.strokeStyle = B.shade(b.color, -0.25);
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + 1.5, by + 1.5, bw - 3, bh - facH - 1);
      // skylights + roof furniture
      if (b.w >= 5 && b.h >= 4) {
        for (let k = 1; k < b.w - 1; k += 2) {
          ctx.fillStyle = 'rgba(20,30,40,0.8)';
          ctx.fillRect(bx + k * ts + 8, by + ts, 14, 14);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
          ctx.strokeRect(bx + k * ts + 8, by + ts, 14, 14);
        }
        // chimney
        ctx.fillStyle = B.shade(b.color, -0.55);
        ctx.fillRect(bx + bw - 18, by + 8, 10, 10);
      }

      /* cornice */
      ctx.fillStyle = B.shade(b.color, 0.18);
      ctx.fillRect(bx, by + bh - facH - 5, bw, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(bx, by + bh - facH, bw, 3);               // drop shadow under cornice

      /* brick facade */
      const brick = B.TEX.brickFor(b.color);
      for (let x = 0; x < bw; x += 64) {
        ctx.drawImage(brick, 0, 0, Math.min(64, bw - x), facH, bx + x, by + bh - facH, Math.min(64, bw - x), facH);
      }

      /* windows along the facade */
      const nWin = Math.max(1, b.w - 1);
      for (let k = 0; k < nWin; k++) {
        const wx = bx + (k + 0.5) * (bw / nWin) - 5;
        const lit = dark > 0.25 && windowLit(b.x + b.y * 7, k, hour);
        ctx.fillStyle = lit ? 'rgba(255,196,110,0.95)' : '#1d2732';
        ctx.fillRect(wx, by + bh - facH + 7, 10, 15);
        ctx.strokeStyle = '#191410'; ctx.lineWidth = 1.5;
        ctx.strokeRect(wx, by + bh - facH + 7, 10, 15);
        ctx.beginPath(); ctx.moveTo(wx, by + bh - facH + 14.5); ctx.lineTo(wx + 10, by + bh - facH + 14.5); ctx.stroke();
        ctx.fillStyle = B.shade(b.color, 0.25);              // sill
        ctx.fillRect(wx - 1, by + bh - facH + 22, 12, 2);
        if (lit) {                                           // spill onto the pavement
          ctx.fillStyle = 'rgba(255,190,100,0.10)';
          ctx.fillRect(wx - 3, by + bh, 16, 10);
        }
      }

      /* outline */
      ctx.strokeStyle = 'rgba(10,8,5,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

      /* signage */
      if (b.named) {
        if (b.name === 'Café Roma') drawMarquee(ctx, bx, by, bw, bh, dark);
        else drawSignboard(ctx, b, bx, by, bw, bh);
        if (b.name === 'Hollis Farm' && B.ART) {         // the KENTUCKY BEST board
          ctx.drawImage(B.ART.sign, bx + bw - B.ART.sign.width - 4, by + bh - facH - B.ART.sign.height + 18);
        }
      } else if (B.dist(pxp, pyp, b.x + b.w / 2, b.y + b.h / 2) < 8) {
        ctx.font = '11px Georgia'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(232,220,192,0.7)';
        ctx.fillText(b.name, bx + bw / 2, by + bh - facH - 10);
      }
    }

    /* ---- doors ---- */
    for (const d of B.doors) {
      const dx = (d.x - cam.x) * ts, dy = (d.y - cam.y) * ts;
      if (dx < -ts * 2 || dy < -ts * 2 || dx > B.VIEW_W + ts || dy > B.VIEW_H + ts) continue;
      // recessed doorway
      ctx.fillStyle = '#0f0b07';
      ctx.fillRect(dx + 6, dy + 2, ts - 12, ts - 8);
      ctx.fillStyle = '#3a2a18';                             // wooden door
      ctx.fillRect(dx + 8, dy + 4, ts - 16, ts - 10);
      ctx.strokeStyle = '#191410'; ctx.lineWidth = 1.5;
      ctx.strokeRect(dx + 8, dy + 4, ts - 16, ts - 10);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(dx + 8, dy + 4, ts - 16, 3);
      ctx.fillStyle = '#c9a227';                             // knob
      ctx.beginPath(); ctx.arc(dx + ts - 12, dy + ts / 2, 1.8, 0, 7); ctx.fill();
      // step
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(dx + 5, dy + ts - 5, ts - 10, 3);
      // the Tiger's alley door gets its telltale red bulb after dark
      if (d.id === 'tigerback' && B.state && B.state.speakeasy.openForBusiness && dark > 0.3) {
        ctx.fillStyle = '#ff4433';
        ctx.beginPath(); ctx.arc(dx + ts / 2, dy + 1, 3, 0, 7); ctx.fill();
      }
    }

    /* ---- decor ---- */
    for (const d of B.decor) {
      const dx = (d.x - cam.x) * ts, dy = (d.y - cam.y) * ts;
      if (dx < -ts * 3 || dy < -ts * 3 || dx > B.VIEW_W + ts * 2 || dy > B.VIEW_H + ts * 2) continue;
      if (d.type === 'tree') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(dx + 16, dy + 27, 11, 4, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a2c1a';
        ctx.fillRect(dx + 13, dy + 14, 6, 14);
        ctx.fillStyle = '#263d1f';
        ctx.beginPath(); ctx.arc(dx + 16, dy + 10, 14, 0, 7); ctx.fill();
        ctx.fillStyle = '#33512a';
        ctx.beginPath(); ctx.arc(dx + 13, dy + 8, 10, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath(); ctx.arc(dx + 11, dy + 5, 5, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(10,8,5,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(dx + 16, dy + 10, 14, 0, 7); ctx.stroke();
      } else if (d.type === 'lamp') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(dx + 16, dy + 29, 6, 2.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#1c1a17';
        ctx.fillRect(dx + 14.5, dy + 4, 3, 25);
        ctx.fillRect(dx + 10, dy + 6, 12, 2);                // crossarm
        ctx.fillStyle = dark > 0.15 ? '#ffd76a' : '#5c563c';
        ctx.beginPath(); ctx.arc(dx + 16, dy + 3.5, 4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#191410'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(dx + 16, dy + 3.5, 4, 0, 7); ctx.stroke();
      } else if (d.type === 'bench') {
        ctx.fillStyle = '#4a371f';
        ctx.fillRect(dx, dy + 10, 30, 7);
        ctx.fillStyle = '#241a10';
        ctx.fillRect(dx + 2, dy + 17, 3, 5); ctx.fillRect(dx + 25, dy + 17, 3, 5);
      } else if (d.type === 'crate') {
        if (B.ART) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.ellipse(dx + 16, dy + 26, 13, 4, 0, 0, 7); ctx.fill();
          ctx.drawImage(B.ART.crate, dx + 3, dy + 2);
        } else {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(dx + 3, dy + 22, 24, 4);
          ctx.fillStyle = '#7a5c30';
          ctx.fillRect(dx + 4, dy + 4, 20, 20);
          ctx.strokeStyle = '#191410'; ctx.lineWidth = 1.5;
          ctx.strokeRect(dx + 4, dy + 4, 20, 20);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(dx + 4, dy + 4); ctx.lineTo(dx + 24, dy + 24);
          ctx.moveTo(dx + 24, dy + 4); ctx.lineTo(dx + 4, dy + 24); ctx.stroke();
        }
      } else if (d.type === 'poster') {
        const p = B.TEX.posters[d.idx % B.TEX.posters.length];
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate((d.idx % 2 ? -1 : 1) * 0.03);
        ctx.drawImage(p, 0, 0, p.width * 0.62, p.height * 0.62);
        ctx.restore();
      }
      // vents render nothing static — their steam lives in renderAtmosphere
    }
  };

  function drawSignboard(ctx, b, bx, by, bw, bh) {
    const label = b.name.toUpperCase();
    ctx.font = 'bold 11px Georgia';
    const tw = Math.min(bw - 10, ctx.measureText(label).width + 14);
    const sx = bx + bw / 2 - tw / 2, sy = by + bh - B.TILE - 3;
    ctx.fillStyle = '#241b10';
    ctx.fillRect(sx, sy - 8, tw, 14);
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 1;
    ctx.strokeRect(sx + 1, sy - 7, tw - 2, 12);
    ctx.fillStyle = '#e0c46a';
    ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, sy + 2, tw - 8);
  }

  function drawMarquee(ctx, bx, by, bw, bh, dark) {
    const sy = by + bh - B.TILE - 6;
    const tw = Math.min(bw - 8, 118);
    const sx = bx + bw / 2 - tw / 2;
    // board
    ctx.fillStyle = '#1c130c';
    ctx.fillRect(sx, sy - 12, tw, 20);
    ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy - 12, tw, 20);
    // bulbs around the rim — bright at night so the bloom pass catches them
    const on = dark > 0.2;
    ctx.fillStyle = on ? '#ffe28a' : '#6b5a33';
    for (let x = sx + 4; x < sx + tw - 2; x += 8) {
      ctx.beginPath(); ctx.arc(x, sy - 10, 1.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x, sy + 6, 1.6, 0, 7); ctx.fill();
    }
    ctx.fillStyle = on ? '#ffdf7e' : '#c9b184';
    ctx.font = 'bold 12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('CAFÉ ROMA', bx + bw / 2, sy + 2);
  }

  /* ---- drifting harbor fog + alley steam, drawn over entities ---- */
  const FOG = [];
  for (let i = 0; i < 9; i++) {
    FOG.push({ seed: i * 977 % 613, sy: (i * 331) % 720, sp: 0.12 + (i % 4) * 0.06, sc: 0.7 + (i % 3) * 0.45 });
  }

  B.renderAtmosphere = function (ctx, cam) {
    const dark = B.darkness();
    const alpha = 0.028 + dark * 0.05;
    ctx.save();
    for (const f of FOG) {
      const x = ((f.seed * 3 + B.frame * f.sp) % (B.VIEW_W + 700)) - 350;
      const y = f.sy + Math.sin((B.frame + f.seed) * 0.004) * 40;
      const rx = 260 * f.sc, ry = 70 * f.sc;
      const g = ctx.createRadialGradient(x, y, 10, x, y, rx);
      g.addColorStop(0, 'rgba(190,200,215,' + alpha + ')');
      g.addColorStop(1, 'rgba(190,200,215,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
    }
    // steam columns from the vents
    const ts = B.TILE;
    for (const d of B.decor) {
      if (d.type !== 'vent') continue;
      const dx = (d.x - cam.x) * ts, dy = (d.y - cam.y) * ts;
      if (dx < -80 || dy < -80 || dx > B.VIEW_W + 80 || dy > B.VIEW_H + 80) continue;
      for (let k = 0; k < 4; k++) {
        const t = ((B.frame * 0.9 + k * 34) % 130);
        const a = (1 - t / 130) * 0.16;
        ctx.fillStyle = 'rgba(210,210,215,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(dx + Math.sin((B.frame + k * 50) * 0.03) * 6, dy - t, 5 + t * 0.14, 0, 7);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  /* 2D lighting overlay — fallback when WebGL2 is unavailable */
  B.renderLight = function (ctx, cam) {
    const dark = B.darkness();
    if (dark <= 0.01) return;
    ctx.fillStyle = 'rgba(8, 10, 30,' + dark + ')';
    ctx.fillRect(0, 0, B.VIEW_W, B.VIEW_H);
    const ts = B.TILE;
    ctx.globalCompositeOperation = 'lighter';
    for (const d of B.decor) {
      if (d.type !== 'lamp') continue;
      const dx = (d.x - cam.x) * ts + 16, dy = (d.y - cam.y) * ts + 5;
      if (dx < -100 || dy < -100 || dx > B.VIEW_W + 100 || dy > B.VIEW_H + 100) continue;
      const g = ctx.createRadialGradient(dx, dy, 4, dx, dy, 90);
      g.addColorStop(0, 'rgba(255,205,100,' + 0.35 * dark + ')');
      g.addColorStop(1, 'rgba(255,205,100,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(dx, dy, 90, 0, 7); ctx.fill();
    }
    if (B.state && B.state.speakeasy.openForBusiness && B.isNight() && !B.state.speakeasy.closedTonight) {
      const dx = (51.5 - cam.x) * ts, dy = (63.5 - cam.y) * ts;
      const g = ctx.createRadialGradient(dx, dy, 4, dx, dy, 70);
      g.addColorStop(0, 'rgba(255,120,80,0.3)');
      g.addColorStop(1, 'rgba(255,120,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(dx, dy, 70, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };
})();
