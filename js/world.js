'use strict';
/* The Bootlegger — world: Harbor City map, named locations, collision, tile rendering */

(function () {
  const T = B.T, W = B.MAP_W, H = B.MAP_H;

  B.map = new Uint8Array(W * H);
  B.buildings = [];   // {x,y,w,h,name,color,named}
  B.doors = [];       // {x,y,id,label} interaction points (tile coords)
  B.decor = [];       // {x,y,type:'tree'|'lamp'|'bench'|'crate'|'hydrant'}
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
    addDoor(53, 5, 'border', 'Border Warehouse');
    // border door faces the highway: put it on the east wall (tile just inside road)
    B.doors[B.doors.length - 1].x = 54; B.doors[B.doors.length - 1].y = 5;

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
    // park trees + benches
    for (let i = 0; i < 10; i++) B.decor.push({ x: 59 + rng() * 9, y: 61 + rng() * 9, type: 'tree' });
    B.decor.push({ x: 61, y: 65, type: 'bench' }, { x: 66, y: 65, type: 'bench' });
    // rural trees
    for (let i = 0; i < 40; i++) {
      const x = rng() * 110, y = rng() * 19;
      if (B.tileAt(x, y) === T.GRASS) B.decor.push({ x, y, type: 'tree' });
    }
    // lampposts at city intersections
    VX.forEach(x => HY.forEach(y => B.decor.push({ x: x - 0.5, y: y - 0.5, type: 'lamp' })));
    // dock crates
    for (let i = 0; i < 6; i++) B.decor.push({ x: 103 + rng() * 3, y: 60 + rng() * 18, type: 'crate' });

    /* ---------- trigger zones ---------- */
    B.zones.push({ x: 53, y: 15, w: 5, h: 3, id: 'checkpoint' });   // Route 9 federal checkpoint
    B.zones.push({ x: 41, y: 59, w: 12, h: 10, id: 'tigerblock' });

    /* solid decor lookup for trees */
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
  const TILE_COLORS = {
    [T.GRASS]: '#3d5233', [T.ROAD]: '#3b3833', [T.WALK]: '#8c8272',
    [T.BUILDING]: '#5a4632', [T.WATER]: '#27435c', [T.DIRT]: '#6a5638',
    [T.PIER]: '#7d6644', [T.FARM]: '#75603a', [T.PARK]: '#46603a',
  };

  B.renderWorld = function (ctx, cam) {
    const ts = B.TILE;
    const x0 = Math.max(0, Math.floor(cam.x)), y0 = Math.max(0, Math.floor(cam.y));
    const x1 = Math.min(W, Math.ceil(cam.x + B.VIEW_W / ts)), y1 = Math.min(H, Math.ceil(cam.y + B.VIEW_H / ts));

    for (let j = y0; j < y1; j++) {
      for (let i = x0; i < x1; i++) {
        const t = tile(i, j);
        ctx.fillStyle = TILE_COLORS[t];
        const px = (i - cam.x) * ts, py = (j - cam.y) * ts;
        ctx.fillRect(px, py, ts + 1, ts + 1);
        if (t === T.ROAD && (i + j) % 4 === 0) {           // faint cobble seams
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(px, py, ts, 2);
        }
        if (t === T.WATER && (i * 7 + j * 13 + (B.frame >> 5)) % 11 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(px + 6, py + 14, 14, 2);
        }
        if (t === T.FARM && j % 2 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.1)';
          ctx.fillRect(px, py + 12, ts, 3);
        }
      }
    }

    /* road center dashes */
    ctx.fillStyle = 'rgba(220,210,180,0.14)';
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      if (tile(i, j) !== T.ROAD) continue;
      const vC = i > 0 && tile(i - 1, j) === T.ROAD && i < W - 1 && tile(i + 1, j) === T.ROAD;
      const hC = j > 0 && tile(i, j - 1) === T.ROAD && j < H - 1 && tile(i, j + 1) === T.ROAD;
      if (vC && hC && j % 2 === 0 && i % 2 === 0) ctx.fillRect((i - cam.x) * ts + 14, (j - cam.y) * ts + 14, 4, 4);
    }

    /* buildings */
    const px = B.player ? B.player.x : 0, py = B.player ? B.player.y : 0;
    for (const b of B.buildings) {
      if (b.x + b.w < cam.x - 1 || b.x > cam.x + B.VIEW_W / ts + 1) continue;
      if (b.y + b.h < cam.y - 1 || b.y > cam.y + B.VIEW_H / ts + 1) continue;
      const bx = (b.x - cam.x) * ts, by = (b.y - cam.y) * ts;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by, b.w * ts, b.h * ts);
      // roof shading + parapet
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(bx, by, b.w * ts, 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, b.w * ts - 2, b.h * ts - 2);
      // skylight grid on big roofs
      if (b.w >= 6) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let k = 1; k < b.w - 1; k += 2) ctx.fillRect(bx + k * ts + 8, by + ts, 12, 12);
      }
      // label when the player is close
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (b.named || B.dist(px, py, cx, cy) < 9) {
        ctx.font = (b.named ? 'bold 13px' : '11px') + ' Georgia';
        ctx.textAlign = 'center';
        ctx.fillStyle = b.named ? '#e8d9a0' : 'rgba(232,220,192,0.75)';
        ctx.fillText(b.name, bx + b.w * ts / 2, by + b.h * ts / 2 + 4);
      }
    }

    /* doors */
    for (const d of B.doors) {
      const dx = (d.x - cam.x) * ts, dy = (d.y - cam.y) * ts;
      if (dx < -ts || dy < -ts || dx > B.VIEW_W || dy > B.VIEW_H) continue;
      ctx.fillStyle = '#241a10';
      ctx.fillRect(dx + 8, dy + 6, ts - 16, ts - 12);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(dx + ts - 13, dy + ts / 2 - 1, 3, 3);
    }

    /* decor */
    for (const d of B.decor) {
      const dx = (d.x - cam.x) * ts, dy = (d.y - cam.y) * ts;
      if (dx < -ts * 2 || dy < -ts * 2 || dx > B.VIEW_W + ts || dy > B.VIEW_H + ts) continue;
      if (d.type === 'tree') {
        ctx.fillStyle = '#3a2c1a';
        ctx.fillRect(dx + 13, dy + 16, 6, 12);
        ctx.fillStyle = '#2f4a26';
        ctx.beginPath(); ctx.arc(dx + 16, dy + 12, 13, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.arc(dx + 12, dy + 8, 6, 0, 7); ctx.fill();
      } else if (d.type === 'lamp') {
        ctx.fillStyle = '#222';
        ctx.fillRect(dx + 14, dy + 6, 4, 22);
        ctx.fillStyle = B.darkness() > 0.2 ? '#ffd76a' : '#665f3f';
        ctx.beginPath(); ctx.arc(dx + 16, dy + 5, 4, 0, 7); ctx.fill();
      } else if (d.type === 'bench') {
        ctx.fillStyle = '#4a371f';
        ctx.fillRect(dx, dy + 10, 30, 8);
      } else if (d.type === 'crate') {
        ctx.fillStyle = '#7a5c30';
        ctx.fillRect(dx + 4, dy + 4, 20, 20);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeRect(dx + 4, dy + 4, 20, 20);
      }
    }
  };

  /* night overlay + lamp glow */
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
    // glow at the Tiger when open at night
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
