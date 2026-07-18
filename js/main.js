'use strict';
/* The Bootlegger — main: boot, input routing, interaction, camera, game loop */

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const cam = { x: 0, y: 0 };

  /* ================= boot ================= */
  function boot() {
    B.buildTextures();
    B.buildTruckSprite();
    B.buildWorld();
    B.makePlayer();
    B.makeTruck();
    B.spawnNamedNPCs();
    B.spawnPolice();
    B.spawnPedestrians(16);
    B.initMinimap();

    document.getElementById('btn-new').addEventListener('click', newGame);
    const cont = document.getElementById('btn-continue');
    if (B.hasSave()) cont.classList.remove('hidden');
    cont.addEventListener('click', () => {
      if (B.loadGame()) startPlay();
    });

    B.initGlfx(canvas);

    requestAnimationFrame(loop);
  }

  function newGame() {
    B.wipeSave();
    B.state = B.newState();
    startPlay();
    B.startMission('welcome');
    B.flash('JANUARY, 1920',
      'Four months since the country went dry, and Harbor City has never been thirstier.\n\n' +
      'Your cousin Enzo got you on with the Moretti outfit — "imports." The pay beats the ropewalk ' +
      'and the hours beat the docks.\n\nEnzo is waiting outside Moretti Import Co., on the east side.');
  }

  function startPlay() {
    if (!B.state) B.state = B.newState();
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    B.mode = 'play';
  }

  /* ================= interaction (E) ================= */
  function nearestInteraction() {
    const p = B.player;

    if (p.inTruck) return { label: 'E — step out of the truck', act: exitTruck };

    // truck
    if (!B.state.truck.stolen && B.dist(p.x, p.y, B.truck.x, B.truck.y) < 1.8) {
      return { label: 'E — get in the truck', act: enterTruck };
    }
    if (B.state.truck.stolen && B.dist(p.x, p.y, B.truck.x, B.truck.y) < 1.8) {
      return { label: 'The truck is O\'Banion\'s prize for now', act: () => B.toast('Not with Deacon\'s boys watching. Settle it at the garage office.') };
    }

    // named NPCs (not peds, not hostiles mid-brawl)
    let best = null, bestD = 1.7;
    for (const n of B.npcs) {
      if (n.hidden || !n.id || n.kind === 'patrolcar') continue;
      if (n.kind === 'thug' && n.hostile) continue;
      const d = B.dist(p.x, p.y, n.x, n.y);
      if (d < bestD) { best = n; bestD = d; }
    }
    if (best) {
      const talk = () => {
        const dlg = B.dialogues[best.id];
        if (dlg) B.openDialogue(dlg());
        B.emit('talk', best.id);
      };
      return { label: 'E — talk to ' + best.name, act: talk };
    }

    // pedestrians
    for (const n of B.npcs) {
      if (n.hidden || n.kind !== 'ped') continue;
      if (B.dist(p.x, p.y, n.x, n.y) < 1.5) {
        return { label: 'E — talk to the ' + n.name.toLowerCase(), act: () => B.openDialogue(B.pedDialogue(n)) };
      }
    }

    // doors
    for (const d of B.doors) {
      if (B.dist(p.x, p.y, d.x + 0.5, d.y + 0.5) < 1.9) {
        return { label: 'E — ' + d.label, act: () => B.doorAction(d.id) };
      }
    }
    return null;
  }

  function enterTruck() {
    B.player.inTruck = true;
    B.state.flags.droveTruck = true;
    B.emit('enterTruck');
  }
  function exitTruck() {
    const t = B.truck;
    // step out beside the cab, on the first clear side
    for (const [ox, oy] of [[1.1, 0], [-1.1, 0], [0, 1.1], [0, -1.1]]) {
      if (!B.collides(t.x + ox, t.y + oy, B.player.r)) {
        B.player.x = t.x + ox; B.player.y = t.y + oy;
        break;
      }
    }
    B.player.inTruck = false;
  }

  /* while a truck full of liquor sits at a door, interaction should prefer the door */
  function nearestInteractionForTruck() {
    for (const d of B.doors) {
      if (B.dist(B.truck.x, B.truck.y, d.x + 0.5, d.y + 0.5) < 3.2) {
        return { label: 'E — ' + d.label + '  (Q — step out)', act: () => B.doorAction(d.id) };
      }
    }
    return null;
  }

  /* ================= input routing ================= */
  B.on('keydown', e => {
    const k = e.key;

    if (B.mode === 'title') return;

    if (B.mode === 'flash') {
      if (k === 'Enter' || k === ' ' || k === 'Escape') B.dismissFlash();
      return;
    }
    if (B.mode === 'dialogue') { B.dialogueKey(e); return; }
    if (B.mode === 'panel') {
      if (k === 'Escape' || k.toLowerCase() === 'j' || k.toLowerCase() === 'm' || k.toLowerCase() === 'h') B.closePanel();
      return;
    }
    if (B.mode !== 'play') return;

    const lk = k.toLowerCase();
    if (lk === 'e') {
      const it = (B.player.inTruck && nearestInteractionForTruck()) || nearestInteraction();
      if (it) it.act();
    }
    if (lk === 'q' && B.player.inTruck) exitTruck();
    if (k === ' ') B.playerPunch();
    if (lk === 'j') B.openJournal();
    if (lk === 'm') B.openMap();
    if (lk === 'h') B.openHelp();
    if (k === 'Escape') B.openMenu();
    if (e.key === 'F2') { B.debugOn = !B.debugOn; }
    if (lk === 't') {
      if (B.pursuit) B.toast('Not while the law is on your tail!', 'bad');
      else { B.advanceTime(60); B.toast('An hour passes. ' + B.timeStr(B.state.minutes) + '.'); }
    }
  });

  /* ================= game loop ================= */
  let last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    B.frame++;

    if (B.mode === 'title') { renderTitleBackdrop(); return; }
    if (!B.state) return;

    if (B.mode === 'play') {
      B.updatePlayer(dt);
      B.updateNPCs(dt);
      B.updateThugs(dt);
      B.updateLaw(dt);
      B.advanceTime(dt * B.TUNE.time.minPerSec);
      B.updateWorldLogic();
      B.updateMissions();

      const it = (B.player.inTruck && nearestInteractionForTruck()) || nearestInteraction();
      B.setHint(it ? it.label : '');
    }

    // camera follows the player, clamped to the map
    cam.x = B.clamp(B.player.x - B.VIEW_W / B.TILE / 2, 0, B.MAP_W - B.VIEW_W / B.TILE);
    cam.y = B.clamp(B.player.y - B.VIEW_H / B.TILE / 2, 0, B.MAP_H - B.VIEW_H / B.TILE);

    ctx.clearRect(0, 0, B.VIEW_W, B.VIEW_H);
    B.renderWorld(ctx, cam);
    B.renderEntities(ctx, cam);
    B.renderAtmosphere(ctx, cam);

    // WebGL relight + bloom + film pass; 2D overlay is the fallback.
    // F2 debug shows the raw unprocessed frame.
    const glOut = document.getElementById('glout');
    if (B.glfx && B.glfx.ok && !B.debugOn) {
      glOut.classList.remove('hidden');
      const dark = B.darkness();
      B.glfx.render(B.collectLights(cam), 1.04 - dark * 0.82, dark / 0.72);
    } else {
      glOut.classList.add('hidden');
      B.renderLight(ctx, cam);
    }

    B.renderMinimap();
    B.refreshHUD();
    if (B.debugOn) renderDebug(dt);
  }

  /* F2 — state-aware telemetry overlay: numbers scoped to what the game is
   * doing right now, not session-wide averages */
  let fpsAcc = 0, fpsN = 0, fpsShown = 0;
  function renderDebug(dt) {
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) { fpsShown = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    const s = B.state, p = B.player;
    const lines = [
      'FPS ' + fpsShown + '  mode:' + B.mode + (p.inTruck ? ' [truck]' : ' [foot]'),
      'pos ' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + '  tile:' + B.tileAt(p.x, p.y) + '  zone:' + (B.zoneAt(p.x, p.y).join(',') || '-'),
      'day ' + s.day + ' ' + B.timeStr(s.minutes) + '  dark:' + B.darkness().toFixed(2),
      'mission:' + (s.mission || '-') + '/' + s.stage + '  done:' + s.completed.length,
      'cash $' + s.cash + '  heat ' + Math.round(s.heat) + '  rep ' + s.rep + '  comm ' + s.community,
      'suspicion ' + B.suspicion.toFixed(0) + (B.pursuit ? '  PURSUIT ' + B.pursuit.timer.toFixed(1) + 's' : ''),
      'clocks obanion:' + s.clocks.obanion + '/' + B.TUNE.clocks.obanionMax + '  fed:' + s.clocks.fed + '/' + B.TUNE.clocks.fedMax + (s.flags.fedSweep ? ' SWEEP' : ''),
      'tiger stock:' + s.speakeasy.stock + '  forecast:' + B.forecastPatrons() + '  raid:' + B.raidChance().toFixed(1) + '%',
      'truck ' + s.truck.crates + 'w+' + s.truck.champagne + 'c/' + s.truck.cap + (s.truck.stolen ? ' STOLEN' : '') + '  npcs:' + B.npcs.filter(n => !n.hidden).length,
    ];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(8, B.VIEW_H - 20 - lines.length * 16, 460, lines.length * 16 + 12);
    ctx.fillStyle = '#8f8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, 16, B.VIEW_H - 14 - (lines.length - 1 - i) * 16));
    ctx.restore();
  }

  /* slow pan over the city behind the title card */
  function renderTitleBackdrop() {
    B.frame++;
    const t = B.frame / 600;
    cam.x = 30 + Math.sin(t) * 20;
    cam.y = 45 + Math.cos(t * 0.7) * 15;
    ctx.clearRect(0, 0, B.VIEW_W, B.VIEW_H);
    B.renderWorld(ctx, cam);
    B.renderAtmosphere(ctx, cam);
    if (B.glfx && B.glfx.ok) B.glfx.render([], 1.0, 0);
  }

  boot();
})();
