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
  const isLand = t => t !== T.WATER;

  /* door facing: which neighbor tile is the building wall */
  function doorDir(d) {
    if (d._dir) return d._dir;
    if (B.tileAt(d.x, d.y - 1) === T.BUILDING) d._dir = 0;            // building north
    else if (B.tileAt(d.x + 1, d.y) === T.BUILDING) d._dir = 1;       // east
    else if (B.tileAt(d.x, d.y + 1) === T.BUILDING) d._dir = 2;       // south
    else if (B.tileAt(d.x - 1, d.y) === T.BUILDING) d._dir = 3;       // west
    else d._dir = 0;
    return d._dir;
  }

  const AWNING = [['#7a2222', '#d8c9a4'], ['#2f4a3c', '#d8c9a4'], ['#3a3f5c', '#cbb98e']];

  B.renderWorld = function (ctx, cam) {
    const ts = B.TILE;
    const x0 = Math.max(0, Math.floor(cam.x)), y0 = Math.max(0, Math.floor(cam.y));
    const x1 = Math.min(W, Math.ceil(cam.x + B.VIEW_W / ts)), y1 = Math.min(H, Math.ceil(cam.y + B.VIEW_H / ts));

    for (let j = y0; j < y1; j++) {
      for (let i = x0; i < x1; i++) {
        const t = tile(i, j);
        const px = Math.round((i - cam.x) * ts), py = Math.round((j - cam.y) * ts);
        ctx.drawImage(B.TEX[t][B.texVariant(i, j)], px, py);

        if (t === T.WATER) {
          // shoreline against land + drifting glints
          ctx.fillStyle = 'rgba(190,215,220,0.22)';
          if (isLand(B.tileAt(i - 1, j))) ctx.fillRect(px, py, 3, ts);
          if (isLand(B.tileAt(i + 1, j))) ctx.fillRect(px + ts - 3, py, 3, ts);
          if (isLand(B.tileAt(i, j - 1))) ctx.fillRect(px, py, ts, 3);
          if (isLand(B.tileAt(i, j + 1))) ctx.fillRect(px, py + ts - 3, ts, 3);
          if ((i * 7 + j * 13 + (B.frame >> 5)) % 11 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(px + 6, py + 14, 14, 2);
          }
        } else if (t === T.WALK) {
          // granite curb where the sidewalk meets the roadway
          if (B.tileAt(i, j + 1) === T.ROAD) {
            ctx.fillStyle = 'rgba(220,210,185,0.28)'; ctx.fillRect(px, py + ts - 3, ts, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(px, py + ts - 1, ts, 1);
          }
          if (B.tileAt(i, j - 1) === T.ROAD) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py, ts, 2);
          }
          if (B.tileAt(i + 1, j) === T.ROAD) {
            ctx.fillStyle = 'rgba(220,210,185,0.28)'; ctx.fillRect(px + ts - 3, py, 2, ts);
            ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(px + ts - 1, py, 1, ts);
          }
          if (B.tileAt(i - 1, j) === T.ROAD) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px, py, 2, ts);
          }
        }
      }
    }

    /* road center dashes */
    ctx.fillStyle = 'rgba(220,210,180,0.13)';
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      if (tile(i, j) !== T.ROAD) continue;
      const vC = i > 0 && tile(i - 1, j) === T.ROAD && i < W - 1 && tile(i + 1, j) === T.ROAD;
      const hC = j > 0 && tile(i, j - 1) === T.ROAD && j < H - 1 && tile(i, j + 1) === T.ROAD;
      if (vC && hC && j % 2 === 0 && i % 2 === 0) ctx.fillRect((i - cam.x) * ts + 14, (j - cam.y) * ts + 14, 4, 4);
    }

    /* buildings — drop shadow first, then baked roof */
    const px = B.player ? B.player.x : 0, py = B.player ? B.player.y : 0;
    const dark = B.darkness();
    ctx.fillStyle = 'rgba(10,8,5,0.32)';
    for (const b of B.buildings) {
      if (b.x + b.w < cam.x - 1 || b.x > cam.x + B.VIEW_W / ts + 1) continue;
      if (b.y + b.h < cam.y - 1 || b.y > cam.y + B.VIEW_H / ts + 1) continue;
      ctx.fillRect((b.x - cam.x) * ts + 6, (b.y - cam.y) * ts + 8, b.w * ts, b.h * ts);
    }
    let bi = 0;
    for (const b of B.buildings) {
      bi++;
      if (b.x + b.w < cam.x - 1 || b.x > cam.x + B.VIEW_W / ts + 1) continue;
      if (b.y + b.h < cam.y - 1 || b.y > cam.y + B.VIEW_H / ts + 1) continue;
      if (!b._tex) B.bakeBuilding(b, bi);
      const bx = Math.round((b.x - cam.x) * ts), by = Math.round((b.y - cam.y) * ts);
      ctx.drawImage(b._tex, bx, by);
      // lit skylights after dark
      if (dark > 0.25 && b._panes) {
        ctx.fillStyle = 'rgba(255,196,110,' + (0.5 * dark) + ')';
        for (const p of b._panes) if (p.lit) ctx.fillRect(bx + p.x - 7, by + p.y - 6, 14, 12);
      }
      // label plaque when named or close
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (b.named || B.dist(px, py, cx, cy) < 9) {
        ctx.font = (b.named ? 'bold 13px' : '11px') + ' Georgia';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(b.name).width;
        const lx = bx + b.w * ts / 2, ly = by + b.h * ts / 2;
        ctx.fillStyle = 'rgba(16,12,8,' + (b.named ? 0.72 : 0.5) + ')';
        ctx.fillRect(lx - tw / 2 - 7, ly - 9, tw + 14, 19);
        if (b.named) {
          ctx.strokeStyle = 'rgba(201,162,39,0.65)'; ctx.lineWidth = 1;
          ctx.strokeRect(lx - tw / 2 - 7.5, ly - 9.5, tw + 15, 20);
        }
        ctx.fillStyle = b.named ? '#e8d9a0' : 'rgba(232,220,192,0.8)';
        ctx.fillText(b.name, lx, ly + 5);
      }
    }

    /* doors: recessed entry + striped awning on the facade side */
    let di = 0;
    for (const d of B.doors) {
      di++;
      const dx = (d.x - cam.x) * ts, dy = (d.y - cam.y) * ts;
      if (dx < -ts * 2 || dy < -ts * 2 || dx > B.VIEW_W + ts || dy > B.VIEW_H + ts) continue;
      const dir = doorDir(d);
      ctx.save();
      ctx.translate(dx + ts / 2, dy + ts / 2);
      ctx.rotate(dir * Math.PI / 2);
      // stone step
      ctx.fillStyle = 'rgba(210,200,175,0.30)';
      ctx.fillRect(-9, -ts / 2 + 9, 18, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-9, -ts / 2 + 12, 18, 1.5);
      // paneled wood door set into the wall
      ctx.fillStyle = '#221709';
      ctx.fillRect(-8, -ts / 2 - 6, 16, 15);
      ctx.fillStyle = '#392812';
      ctx.fillRect(-6.5, -ts / 2 - 4.5, 13, 12);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
      ctx.strokeRect(-4.5, -ts / 2 - 2.5, 4, 8); ctx.strokeRect(0.5, -ts / 2 - 2.5, 4, 8);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(4, -ts / 2 + 1, 2, 2);
      // striped awning over the entry
      const [ca, cb] = AWNING[di % AWNING.length];
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k % 2 ? cb : ca;
        ctx.fillRect(-11 + k * 4.4, -ts / 2 + 4, 4.4, 7);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(-11, -ts / 2 + 10, 22, 2.2);           // scalloped shadow line
      ctx.restore();
      // lantern beside the named doors after dark (feeds the bloom pass)
      if (dark > 0.25) {
        const a = [[12, -4], [4, 12], [-12, 4], [-4, -12]][dir];
        ctx.fillStyle = 'rgba(255,210,120,' + (0.85 * dark) + ')';
        ctx.beginPath(); ctx.arc(dx + ts / 2 + a[0], dy + ts / 2 + a[1], 2.4, 0, 7); ctx.fill();
      }
    }

    /* decor */
    for (const d of B.decor) {
      const dx = (d.x - cam.x) * ts, dy = (d.y - cam.y) * ts;
      if (dx < -ts * 2 || dy < -ts * 2 || dx > B.VIEW_W + ts || dy > B.VIEW_H + ts) continue;
      if (d.type === 'tree') {
        const v = ((d.x * 13 + d.y * 7) | 0) % 4;
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(dx + 19, dy + 20, 13, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#3a2c1a';
        ctx.fillRect(dx + 14, dy + 15, 5, 10);
        ctx.drawImage(B.SPRITES.tree[v], dx - 6, dy - 10);
      } else if (d.type === 'lamp') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(dx + 20, dy + 30, 8, 3, 0, 0, 7); ctx.fill();
        ctx.drawImage(B.SPRITES.lamp, dx + 8, dy - 2);
        if (dark > 0.2) {                 // hot glass core for the bloom pass
          ctx.fillStyle = 'rgba(255,222,140,0.95)';
          ctx.fillRect(dx + 13.5, dy + 7, 5, 5);
        }
      } else if (d.type === 'bench') {
        ctx.drawImage(B.SPRITES.bench, dx, dy + 4);
      } else if (d.type === 'crate') {
        ctx.drawImage(B.SPRITES.crate, dx + 2, dy + 2);
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
