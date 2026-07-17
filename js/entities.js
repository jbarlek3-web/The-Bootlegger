'use strict';
/* The Bootlegger — entities: player, truck, NPCs, pedestrians, police, thugs */

(function () {
  B.npcs = [];        // named + generic, includes cops and thugs
  B.frame = 0;

  /* ---------- base mover ---------- */
  function tryMove(e, dx, dy, dt) {
    const nx = e.x + dx * e.speed * dt, ny = e.y + dy * e.speed * dt;
    if (!B.collides(nx, e.y, e.r)) e.x = nx;
    if (!B.collides(e.x, ny, e.r)) e.y = ny;
    if (dx || dy) { e.facing = Math.atan2(dy, dx); e._anim = (e._anim || 0) + dt * e.speed; }
  }

  /* ---------- player ---------- */
  B.makePlayer = function () {
    B.player = {
      x: 31.5, y: 69.5, r: 0.32, speed: B.TUNE.player.walkSpeed, facing: 0,
      inTruck: false, punchCd: 0,
    };
  };

  /* ---------- truck ---------- */
  B.makeTruck = function () {
    B.truck = { x: 39.5, y: 68.5, r: 0.55, speed: B.TUNE.player.truckSpeed, facing: 0, kind: 'truck' };
  };

  B.updatePlayer = function (dt) {
    const p = B.player;
    p.punchCd = Math.max(0, p.punchCd - dt);
    const { dx, dy } = B.axis();
    if (p.inTruck) {
      const t = B.truck;
      // trucks are slower off the pavement
      const onRoad = [B.T.ROAD, B.T.DIRT, B.T.PIER].includes(B.tileAt(t.x, t.y));
      const sp = t.speed * (onRoad ? 1 : B.TUNE.player.truckOffroadFactor);
      const nx = t.x + dx * sp * dt, ny = t.y + dy * sp * dt;
      if (!B.collides(nx, t.y, t.r)) t.x = nx;
      if (!B.collides(t.x, ny, t.r)) t.y = ny;
      if (dx || dy) t.facing = Math.atan2(dy, dx);
      p.x = t.x; p.y = t.y;
    } else {
      tryMove(p, dx, dy, dt);
    }
  };

  /* ---------- NPC factory ---------- */
  B.addNPC = function (def) {
    const n = Object.assign({
      x: 0, y: 0, r: 0.3, speed: 1.6, facing: 0,
      kind: 'npc',                 // npc | ped | cop | patrolcar | thug | agent
      color: '#c8b48a', coat: '#4a3a2a',
      wanderFrom: null, wanderT: 0,
      waypoints: null, wpIndex: 0,
      hostile: false, hp: 60,
      hidden: false,
      lines: null,
    }, def);
    if (!n.wanderFrom && !n.waypoints) n.wanderFrom = { x: n.x, y: n.y };
    B.npcs.push(n);
    return n;
  };

  B.npcById = id => B.npcs.find(n => n.id === id);

  /* ---------- pedestrians ---------- */
  const PED_NAMES = ['Passer-by', 'Factory hand', 'Shop girl', 'Clerk', 'Newsboy', 'Delivery man',
    'Flapper', 'Salesman', 'Housewife', 'Stevedore', 'Waiter', 'Chauffeur'];
  const PED_LINES = [
    '"Dry, they call it. My foot."',
    '"They say you can still get a drink at half the drugstores in town — for medicinal purposes."',
    '"The Herald says the harbor squad seized two hundred cases Tuesday. Two hundred more got through, I\'d wager."',
    '"Prices at the grocer\'s are up again. A man can\'t win."',
    '"You hear music coming out of the Roma\'s alley some nights. Funny thing for a café."',
    '"My cousin swears the Canadians float it down in coffins. Coffins!"',
    '"Sister Prudence was preaching on the corner again. Poured a whole barrel in the gutter."',
    '"O\'Banion\'s boys have been throwing their weight around the north side."',
    '"They padlocked Muldoon\'s last week. Fella barely got his hat."',
    '"Work at the docks if you want work. Just don\'t ask what\'s in the crates."',
    '"The Alderman drinks champagne at the Ambassador, same as before. Some law."',
    '"A dollar goes further downtown, but so do the questions."',
  ];

  B.spawnPedestrians = function (count) {
    const rng = B.mulberry32(555);
    let placed = 0, guard = 0;
    while (placed < count && guard++ < 500) {
      const x = 8 + rng() * 100, y = 26 + rng() * 66;
      if (B.isSolid(x, y) || B.tileAt(x, y) === B.T.WATER) continue;
      B.addNPC({
        x, y, kind: 'ped',
        name: B.pick(rng, PED_NAMES),
        color: ['#c8b48a', '#b09a78', '#8a7358'][placed % 3],
        coat: ['#4a3a2a', '#37403c', '#4c4c58', '#5a3d3d'][placed % 4],
        lines: PED_LINES,
      });
      placed++;
    }
  };

  /* ---------- cops ---------- */
  B.spawnPolice = function () {
    // Officer Brady — the bribable beat cop (named NPC, defined in npcs.js data but moves here)
    B.addNPC({
      id: 'brady', name: 'Officer Brady', kind: 'cop', speed: 2.2,
      x: 55.5, y: 41.5, color: '#c8b48a', coat: '#26355c',
      waypoints: [[55.5, 41.5], [71.5, 41.5], [71.5, 57.5], [55.5, 57.5]],
    });
    B.addNPC({
      id: 'cop2', name: 'Patrolman', kind: 'cop', speed: 2.2,
      x: 23.5, y: 73.5, color: '#c8b48a', coat: '#26355c',
      waypoints: [[23.5, 73.5], [23.5, 89.5], [55.5, 89.5], [55.5, 73.5]],
    });
    B.addNPC({
      id: 'cop3', name: 'Patrolman', kind: 'cop', speed: 2.2,
      x: 87.5, y: 41.5, color: '#c8b48a', coat: '#26355c',
      waypoints: [[87.5, 41.5], [103.5, 41.5], [103.5, 57.5], [87.5, 57.5]],
    });
    // prowl car — faster, circles downtown, the real danger for a loaded truck
    B.addNPC({
      id: 'prowl', name: 'Police Prowl Car', kind: 'patrolcar', speed: 6.5, r: 0.5,
      x: 71.5, y: 25.5, color: '#26355c', coat: '#26355c',
      waypoints: [[71.5, 25.5], [103.5, 25.5], [103.5, 89.5], [7.5, 89.5], [7.5, 25.5]],
    });
  };

  function followWaypoints(n, dt) {
    const wp = n.waypoints[n.wpIndex];
    const d = B.dist(n.x, n.y, wp[0], wp[1]);
    if (d < 0.4) { n.wpIndex = (n.wpIndex + 1) % n.waypoints.length; return; }
    tryMove(n, (wp[0] - n.x) / d, (wp[1] - n.y) / d, dt);
  }

  function wander(n, dt) {
    n.wanderT -= dt;
    if (n.wanderT <= 0) {
      n.wanderT = 2 + Math.random() * 4;
      const a = Math.random() * Math.PI * 2;
      n.wdx = Math.cos(a); n.wdy = Math.sin(a);
      if (Math.random() < 0.35) { n.wdx = 0; n.wdy = 0; }
    }
    if (!n.wdx && !n.wdy) return;
    // stay near home
    if (n.wanderFrom && B.dist(n.x, n.y, n.wanderFrom.x, n.wanderFrom.y) > (n.leash || 6)) {
      const d = B.dist(n.x, n.y, n.wanderFrom.x, n.wanderFrom.y);
      n.wdx = (n.wanderFrom.x - n.x) / d; n.wdy = (n.wanderFrom.y - n.y) / d;
    }
    tryMove(n, n.wdx * 0.6, n.wdy * 0.6, dt);
  }

  /* ---------- suspicion / pursuit ---------- */
  B.suspicion = 0;         // 0..100, fills when cops see a loaded truck
  B.pursuit = null;        // {timer, by}

  function copSees(cop, range) {
    const p = B.player;
    return B.dist(cop.x, cop.y, p.x, p.y) < range;
  }

  B.updateLaw = function (dt) {
    const st = B.state, p = B.player;
    const carrying = p.inTruck && (st.truck.crates > 0 || st.truck.champagne > 0);

    if (B.pursuit) {
      B.pursuit.timer -= dt;
      const chasers = B.npcs.filter(n => (n.kind === 'cop' || n.kind === 'patrolcar') && !n.hidden);
      let nearest = Infinity;
      for (const c of chasers) {
        const d = B.dist(c.x, c.y, p.x, p.y);
        nearest = Math.min(nearest, d);
        if (d < 26) {
          const boost = c.kind === 'patrolcar' ? B.TUNE.law.carChaseBoost : B.TUNE.law.copChaseBoost; // your car barely outruns the prowl car; on foot you must weave
          const dd = Math.max(d, 0.001);
          const os = c.speed; c.speed = os * boost;
          tryMove(c, (p.x - c.x) / dd, (p.y - c.y) / dd, dt);
          c.speed = os;
          if (d < (p.inTruck ? 1.4 : 0.9)) return B.busted();
        }
      }
      if (B.pursuit.timer <= 0 || nearest > B.TUNE.law.escapeDistance) {
        B.pursuit = null;
        B.suspicion = 0;
        B.toast('You lost them. Heart still pounding.', 'money');
        B.emit('escaped');
      }
      return;
    }

    if (!carrying) { B.suspicion = Math.max(0, B.suspicion - 25 * dt); return; }

    let watched = false;
    for (const c of B.npcs) {
      if (c.kind !== 'cop' && c.kind !== 'patrolcar') continue;
      if (c.hidden) continue;
      if (c.id === 'brady' && st.flags.bradyPaid) continue;    // Brady looks the other way
      if (copSees(c, c.kind === 'patrolcar' ? B.TUNE.law.carSight : B.TUNE.law.copSight)) { watched = true; break; }
    }
    if (watched) {
      let rate = B.isNight() ? B.TUNE.law.suspicionRateNight : B.TUNE.law.suspicionRateDay;
      if (st.flags.bradyPaid) rate *= B.TUNE.law.bradyFactor;
      // a neighborhood that loves you does not point out your truck to the law
      rate *= Math.max(0.5, 1 - Math.max(0, st.community) * B.TUNE.law.communityShield);
      B.suspicion = Math.min(100, B.suspicion + rate * dt);
      if (B.suspicion >= 100) B.startPursuit();
    } else {
      B.suspicion = Math.max(0, B.suspicion - B.TUNE.law.suspicionDecay * dt);
    }
  };

  B.startPursuit = function () {
    if (B.pursuit) return;
    B.pursuit = { timer: B.TUNE.law.pursuitTime };
    B.toast('They made you! Lose the law!', 'bad');
    B.emit('pursuitStart');
  };

  B.busted = function () {
    const st = B.state;
    const crates = st.truck.crates + st.truck.champagne;
    const fine = B.TUNE.law.baseFine + crates * B.TUNE.law.finePerCrate;
    B.pursuit = null; B.suspicion = 0;
    st.truck.crates = 0; st.truck.champagne = 0;
    st.cash = Math.max(0, st.cash - fine);
    st.heat = Math.max(0, st.heat - 20);      // they got their collar; the pressure eases
    st.stats.timesBusted++;
    // haul everyone to the precinct steps
    B.player.inTruck = false;
    B.player.x = 62.5; B.player.y = 52.8;
    B.truck.x = 55.5; B.truck.y = 54.5;
    B.emit('busted');
    B.flash('PINCHED', 'The wagon ride is quiet. Sergeant Kelleher counts ' + crates +
      ' confiscated cases while a clerk relieves you of $' + fine + ' in "processing fees."\n\n' +
      'By dawn a lawyer nobody hired has sprung you. Sal doesn\'t pay for the same mistake twice.');
    B.state.minutes += 6 * 60;
  };

  /* ---------- thug combat ---------- */
  B.updateThugs = function (dt) {
    const p = B.player;
    for (const n of B.npcs) {
      if (n.kind !== 'thug' || n.hidden || !n.hostile) continue;
      const d = B.dist(n.x, n.y, p.x, p.y);
      if (d < 9 && d > 0.85) {
        tryMove(n, (p.x - n.x) / d, (p.y - n.y) / d, dt);
      } else if (d <= 0.85) {
        n.atkCd = (n.atkCd || 0) - dt;
        if (n.atkCd <= 0) {
          n.atkCd = 1.1;
          B.state.hp = Math.max(0, B.state.hp - 9);
          B.toast(n.name + ' clocks you! (−9 HP)', 'bad');
          if (B.state.hp <= 0) B.knockout();
        }
      }
    }
  };

  B.playerPunch = function () {
    const p = B.player;
    if (p.inTruck || p.punchCd > 0) return;
    p.punchCd = B.TUNE.player.punchCooldown;
    for (const n of B.npcs) {
      if (n.kind !== 'thug' || n.hidden || !n.hostile) continue;
      if (B.dist(n.x, n.y, p.x, p.y) < B.TUNE.player.punchRange) {
        n.hp -= B.TUNE.player.punchDamage;
        B.toast('You land one on ' + n.name + '.');
        if (n.hp <= 0) {
          n.hidden = true; n.hostile = false;
          B.toast(n.name + ' goes down and stays down.', 'money');
          B.emit('thugDown', n.id);
        }
        return;
      }
    }
  };

  B.knockout = function () {
    const loss = Math.min(B.state.cash, 30);
    B.state.cash -= loss;
    B.state.hp = 55;
    B.npcs.forEach(n => { if (n.kind === 'thug') { n.hostile = false; } });
    B.player.inTruck = false;
    B.player.x = 29.5; B.player.y = 85.8;    // wake on the church steps
    B.emit('knockout');
    B.flash('LIGHTS OUT', 'You come to on the steps of St. Michael\'s with a split lip and ' +
      (loss ? '$' + loss + ' lighter pockets.' : 'empty pockets.') +
      '\n\nFather Callahan doesn\'t ask questions. He never does.');
    B.state.minutes += 4 * 60;
  };

  /* ---------- per-frame ---------- */
  B.updateNPCs = function (dt) {
    for (const n of B.npcs) {
      if (n.hidden) continue;
      if (n.kind === 'thug') continue;                  // handled in updateThugs
      if (B.pursuit && (n.kind === 'cop' || n.kind === 'patrolcar')) continue;  // chasing
      if (n.follow) {
        const d = B.dist(n.x, n.y, B.player.x, B.player.y);
        if (d > 1.6) tryMove(n, (B.player.x - n.x) / d, (B.player.y - n.y) / d, dt * 1.6);
      }
      else if (n.waypoints) followWaypoints(n, dt);
      else if (n.kind === 'ped' || n.wanderFrom) wander(n, dt);
    }
  };

  /* ---------- rendering ---------- */
  function shade(hex, f) {
    const v = parseInt(hex.slice(1), 16);
    return 'rgb(' + (B.clamp((v >> 16) * f, 0, 255) | 0) + ',' +
      (B.clamp(((v >> 8) & 255) * f, 0, 255) | 0) + ',' + (B.clamp((v & 255) * f, 0, 255) | 0) + ')';
  }

  function drawPerson(ctx, x, y, n) {
    const step = Math.sin((n._anim || 0) * 7);
    const bob = Math.abs(step) * 1.2;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(x, y + 8, 8, 3.6, 0, 0, 7); ctx.fill();
    // feet peeking out mid-stride
    ctx.fillStyle = '#171310';
    ctx.beginPath(); ctx.ellipse(x - 3.5, y + 7 + step * 2, 2.4, 1.6, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 3.5, y + 7 - step * 2, 2.4, 1.6, 0, 0, 7); ctx.fill();
    y -= bob;
    const coat = n.coat || '#4a3a2a';
    // arms swing at the sides
    ctx.fillStyle = shade(coat, 0.8);
    ctx.beginPath(); ctx.arc(x - 8, y + 1 + step * 1.6, 2.8, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8, y + 1 - step * 1.6, 2.8, 0, 7); ctx.fill();
    // overcoat with a darker hem and a lit shoulder
    ctx.fillStyle = shade(coat, 0.72);
    ctx.beginPath(); ctx.arc(x, y + 1.5, 9, 0, 7); ctx.fill();
    ctx.fillStyle = coat;
    ctx.beginPath(); ctx.arc(x, y, 8.6, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,210,0.14)';
    ctx.beginPath(); ctx.arc(x - 3, y - 3, 5, 0, 7); ctx.fill();
    // front seam + buttons
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 7); ctx.stroke();
    if (n.kind === 'cop') {
      ctx.fillStyle = '#d8c15a';
      ctx.fillRect(x - 3, y + 1, 2, 2); ctx.fillRect(x + 1.5, y + 1, 2, 2);
    }
    // head
    ctx.fillStyle = n.color || '#c8b48a';
    ctx.beginPath(); ctx.arc(x, y - 6, 5, 0, 7); ctx.fill();
    // hat: brim, crown, band (peaked cap for cops)
    const hat = n.kind === 'cop' ? '#1d2a4a' : (n.hat || '#33291c');
    ctx.fillStyle = shade(hat, 0.75);
    ctx.beginPath(); ctx.ellipse(x, y - 7.5, 7.4, 3.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = hat;
    ctx.beginPath(); ctx.arc(x, y - 10, 4.4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(x, y - 8.2, 4.4, 1.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,210,0.18)';
    ctx.beginPath(); ctx.arc(x - 1.5, y - 11.2, 1.8, 0, 7); ctx.fill();
    if (n.kind === 'cop') {          // cap badge
      ctx.fillStyle = '#d8c15a';
      ctx.fillRect(x - 1, y - 11.5, 2.4, 2.4);
    }
  }

  /* period vehicles, canonical facing +x. kind: 'car' | 'truck' | 'police' */
  function drawCar(ctx, x, y, facing, body, kind, load) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(facing);
    const dk = shade(body, 0.62), lt = shade(body, 1.28);
    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.roundRect(-23, -11, 50, 24, 6); ctx.fill();
    // tires
    ctx.fillStyle = '#14110d';
    for (const [wx, wy] of [[-15, -13], [-15, 8], [13, -13], [13, 8]]) {
      ctx.beginPath(); ctx.roundRect(wx, wy, 10, 5, 2); ctx.fill();
    }
    // running boards
    ctx.fillStyle = dk;
    ctx.fillRect(-19, -12, 34, 2.5); ctx.fillRect(-19, 9.5, 34, 2.5);
    if (kind === 'truck') {
      // stake bed with planks
      ctx.fillStyle = '#3c2d18';
      ctx.beginPath(); ctx.roundRect(-24, -10.5, 26, 21, 2); ctx.fill();
      ctx.fillStyle = '#57422a';
      ctx.beginPath(); ctx.roundRect(-22.5, -9, 23, 18, 1.5); ctx.fill();
      ctx.strokeStyle = 'rgba(25,17,8,0.7)'; ctx.lineWidth = 1;
      for (let k = -18; k < 0; k += 5) { ctx.beginPath(); ctx.moveTo(k, -9); ctx.lineTo(k, 9); ctx.stroke(); }
      // cargo
      const crates = Math.min(4, Math.ceil((load || 0) / 2));
      for (let k = 0; k < crates; k++) {
        const cx2 = -19 + (k % 2) * 9, cy2 = -7 + ((k / 2) | 0) * 9;
        ctx.fillStyle = '#7a5c30';
        ctx.fillRect(cx2, cy2, 8, 8);
        ctx.strokeStyle = 'rgba(30,20,10,0.7)'; ctx.strokeRect(cx2 + 0.5, cy2 + 0.5, 7, 7);
        ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + 8, cy2 + 8);
        ctx.moveTo(cx2 + 8, cy2); ctx.lineTo(cx2, cy2 + 8); ctx.stroke();
      }
      // cab + hood
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.roundRect(2, -9.5, 12, 19, 2); ctx.fill();
      ctx.fillStyle = lt;
      ctx.fillRect(3.5, -7.5, 8, 15);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.roundRect(13, -7, 10, 14, 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(13.5, -7, 1.5, 14);                     // windshield line
      ctx.fillStyle = shade(body, 0.8);
      for (let k = 15; k < 22; k += 2.6) ctx.fillRect(k, -6, 1.2, 12);  // hood louvres
    } else {
      // enclosed sedan: body shell, sweeping fenders, cabin roof
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.roundRect(-21, -10, 43, 20, 5); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(-21, -10, 43, 20, 5); ctx.stroke();
      ctx.fillStyle = dk;
      ctx.beginPath(); ctx.roundRect(-21, -11, 10, 4, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-21, 7, 10, 4, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(11, -11, 10, 4, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(11, 7, 10, 4, 2); ctx.fill();
      // cabin roof with center crease
      ctx.fillStyle = lt;
      ctx.beginPath(); ctx.roundRect(-8, -8, 16, 16, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      // windshield + rear glass slits
      ctx.fillStyle = '#1c242c';
      ctx.fillRect(8, -6.5, 2, 13); ctx.fillRect(-10, -6, 2, 12);
      // spare tire on the tail
      ctx.fillStyle = '#14110d';
      ctx.beginPath(); ctx.arc(-21, 0, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#2c2620';
      ctx.beginPath(); ctx.arc(-21, 0, 2, 0, 7); ctx.fill();
      // hood louvres
      ctx.fillStyle = shade(body, 0.8);
      for (let k = 12; k < 20; k += 2.6) ctx.fillRect(k, -5, 1.2, 10);
      if (kind === 'police') {
        ctx.fillStyle = '#e8e2d2';
        ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#26355c';
        ctx.font = 'bold 7px Georgia'; ctx.textAlign = 'center';
        ctx.fillText('PD', 0, 2.5);
      }
    }
    // radiator + headlamps (bright at night so the bloom pass catches them)
    ctx.fillStyle = '#2a2620';
    ctx.fillRect(22, -6, 2.5, 12);
    const night = B.darkness() > 0.2;
    ctx.fillStyle = night ? 'rgba(255,238,170,0.95)' : '#b8ad8c';
    ctx.beginPath(); ctx.arc(22, -8, 2.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(22, 8, 2.2, 0, 7); ctx.fill();
    ctx.restore();
  }

  B.renderEntities = function (ctx, cam) {
    const ts = B.TILE;
    const toPx = (x, y) => [(x - cam.x) * ts, (y - cam.y) * ts];

    // truck (still drawn when stolen — it sits behind O'Banion's garage)
    if (B.truck) {
      const [tx, ty] = toPx(B.truck.x, B.truck.y);
      drawCar(ctx, tx, ty, B.truck.facing, '#5c4a26', 'truck', B.state.truck.crates + B.state.truck.champagne);
      const load = B.state.truck.crates + B.state.truck.champagne;
      if (load > 0 && !B.player.inTruck) {
        ctx.fillStyle = '#e8d9a0'; ctx.font = '11px Georgia'; ctx.textAlign = 'center';
        ctx.fillText(load + ' crate' + (load > 1 ? 's' : ''), tx, ty - 20);
      }
    }

    // npcs sorted by y for painter's order
    const list = B.npcs.filter(n => !n.hidden).sort((a, b) => a.y - b.y);
    for (const n of list) {
      const [nx, ny] = toPx(n.x, n.y);
      if (nx < -60 || ny < -60 || nx > B.VIEW_W + 60 || ny > B.VIEW_H + 60) continue;
      if (n.kind === 'patrolcar') { drawCar(ctx, nx, ny, n.facing, '#26355c', 'police'); continue; }
      drawPerson(ctx, nx, ny, n);
      if (n.id && n.name && B.dist(n.x, n.y, B.player.x, B.player.y) < 6 && n.kind !== 'ped') {
        ctx.fillStyle = n.kind === 'thug' && n.hostile ? '#e88' : '#e8d9a0';
        ctx.font = '12px Georgia'; ctx.textAlign = 'center';
        ctx.fillText(n.name, nx, ny - 18);
      }
    }

    // player
    if (!B.player.inTruck) {
      const [px, py] = toPx(B.player.x, B.player.y);
      drawPerson(ctx, px, py, { coat: '#6b2f2a', color: '#d4b98c', hat: '#40342a' });
    }
  };
})();
