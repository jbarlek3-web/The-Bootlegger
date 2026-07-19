'use strict';
/* The Bootlegger — UI: HUD, toasts, panels, journal, city map, minimap, flashes */

(function () {
  const $ = id => document.getElementById(id);

  /* ---------- toasts ---------- */
  B.toast = function (msg, cls) {
    if (!msg) return;
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), 4100);
  };

  /* ---------- flash overlay (big narrative beats) ---------- */
  let flashQueue = [];
  B.flash = function (headline, text) {
    flashQueue.push({ headline, text });
    showFlash();
  };
  function showFlash() {
    if (B.mode === 'flash' || !flashQueue.length) return;
    const f = flashQueue.shift();
    B.mode = 'flash';
    $('flash-text').innerHTML = '<span class="headline">' + f.headline + '</span>' +
      f.text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    $('flash-overlay').classList.remove('hidden');
  }
  B.dismissFlash = function () {
    $('flash-overlay').classList.add('hidden');
    B.mode = 'play';
    showFlash();   // next in queue, if any
  };

  /* ---------- generic big panel ---------- */
  B.openPanel = function (title, html, wire) {
    B.mode = 'panel';
    $('bp-title').textContent = title;
    $('bp-body').innerHTML = html;
    $('bigpanel').classList.remove('hidden');
    if (wire) wire($('bp-body'));
  };
  B.closePanel = function () {
    $('bigpanel').classList.add('hidden');
    if (B.mode === 'panel') B.mode = 'play';
  };

  /* ---------- HUD refresh ---------- */
  B.refreshHUD = function () {
    const s = B.state;
    $('st-cash').textContent = B.fmt$(s.cash);
    const wx = s.weather === 'rain' ? ' · RAIN' : s.weather === 'fog' ? ' · FOG' : '';
    $('st-day').textContent = 'Day ' + s.day + ' · ' + B.timeStr(s.minutes) + wx;
    // heat as wanted stars, like the reference HUD mockups
    const stars = Math.min(5, Math.round(s.heat / 20));
    $('st-heat').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    $('st-heat').title = 'Police attention: ' + Math.round(s.heat) + ' / 100';
    $('st-heat').style.color = s.heat >= 50 ? '#ff7a5a' : '#e0b13a';
    $('st-rep').textContent = 'REP ' + s.rep;
    $('st-comm').textContent = 'COMMUNITY ' + s.community;
    $('st-stock').querySelector('b').textContent = s.speakeasy.stock;
    $('hp-fill').style.width = s.hp + '%';
    $('objective').textContent = B.currentObjective();

    const sw = $('suspicion-wrap');
    if (B.suspicion > 1 || B.pursuit) {
      sw.classList.remove('hidden');
      $('suspicion-bar').style.width = (B.pursuit ? 100 : B.suspicion) + '%';
      $('suspicion-bar').style.background = B.pursuit ? '#e33' : '#a33';
      sw.querySelector('span').textContent = B.pursuit ? 'PURSUIT — LOSE THEM!' : 'SUSPICION';
    } else sw.classList.add('hidden');
  };

  B.setHint = t => { $('hint').textContent = t || ''; };

  /* ---------- journal (J) ---------- */
  B.openJournal = function () {
    const s = B.state;
    const m = s.mission ? B.MISSIONS[s.mission] : null;

    const sideLines = [];
    const sideName = {
      lombardi: 'Medicinal Purposes (Doc Lombardi)', walt: 'Ink & Influence (Walt Whitaker)',
      charlie: 'Union Dues (Charlie Doyle)', rosa: 'A Voice for the Tiger (Rosa DeLuca)',
      vivian: 'Party Favors (Vivian Ashworth)',
    };
    for (const [k, v] of Object.entries(s.side)) {
      if (!sideName[k]) continue;
      sideLines.push('<tr><td>' + sideName[k] + '</td><td class="' + (v === 'done' ? 'good' : 'dim') + '">' +
        (v === 'done' ? 'settled' : 'in hand') + '</td></tr>');
    }

    const allies = [];
    if (s.flags.bradyPaid) allies.push('Officer Brady (payroll)');
    if (s.flags.judgeAlly) allies.push('Judge Hargrove (bought)');
    if (s.allies.callahan) allies.push('Fr. Callahan (confession cools heat)');
    if (s.allies.lombardi) allies.push('Doc Lombardi (paperwork shelters the Tiger)');
    if (s.allies.walt) allies.push('Walt Whitaker (friend at the Herald)');
    if (s.flags.mrsKAlly) allies.push('Mrs. Kowalski (eyes on the street)');
    if (s.flags.rosaSings) allies.push('Rosa DeLuca (headliner)');
    if (s.flags.truce) allies.push('O\'Banion truce (north side stays north)');
    if (s.perks.still) allies.push('Hollis Farm still (cheap corn whiskey)');
    if (s.perks.connection) allies.push('The Canadian pipeline (cheap rye after dark)');
    if (s.perks.docksDiscount) allies.push('Union tally man (crates $8 at Pier 7)');
    if (s.perks.patrolMap) allies.push('Mickey\'s knowledge (patrols on the map)');
    if (s.perks.made) allies.push('MADE MAN — the Tiger pays a capo\'s margin');

    const C = B.TUNE.clocks;
    const ticks = (n, max) => '●'.repeat(Math.min(n, max)) + '○'.repeat(Math.max(0, max - n));
    const obanionSettled = s.completed.includes('rivals') || s.flags.truce;
    const pressure = [];
    if (s.speakeasy.openForBusiness) {
      pressure.push('<tr><td>The O\'Banion push</td><td>' + (obanionSettled ? '<span class="good">settled</span>' :
        '<span class="' + (s.clocks.obanion >= C.obanionHijackAt ? 'bad' : 'dim') + '">' + ticks(s.clocks.obanion, C.obanionMax) +
        (s.clocks.obanion >= C.obanionHijackAt ? ' — hijacking your wagons' : s.clocks.obanion >= C.obanionWarnAt ? ' — scouting your routes' : ' — watching, for now') + '</span>') + '</td></tr>');
      pressure.push('<tr><td>Bureau attention</td><td><span class="' + (s.clocks.fed >= C.fedWarnAt ? 'bad' : 'dim') + '">' +
        ticks(s.clocks.fed, C.fedMax) + (s.flags.fedSweep ? ' — SWEEP TONIGHT' : s.clocks.fed >= C.fedWarnAt ? ' — agents in town' :
        s.clocks.fed > 0 ? ' — filing reports' : ' — dormant') + '</span> <span class="dim">(rises with heat ≥ ' + C.fedHeatRise + ', falls when you lay low)</span></td></tr>');
    }

    B.openPanel('Pocket Notebook', `
      <h3>Current Job</h3>
      <p>${m ? '<b>' + m.title + '</b> — ' + m.stages[s.stage].obj : B.currentObjective()}</p>
      ${pressure.length ? '<h3>Pressure</h3><table>' + pressure.join('') + '</table>' : ''}
      <h3>Jobs Done</h3>
      <p class="dim">${s.completed.length ? s.completed.map(id => B.MISSIONS[id].title).join(' · ') : 'None yet.'}</p>
      <h3>Side Dealings</h3>
      ${sideLines.length ? '<table>' + sideLines.join('') + '</table>' : '<p class="dim">Nothing on the side. Talk to people — everyone in this city wants something.</p>'}
      <h3>Friends &amp; Arrangements</h3>
      ${allies.length ? '<p>' + allies.join('<br>') + '</p>' : '<p class="dim">You are alone in this city, so far.</p>'}
      <h3>The Numbers</h3>
      <table>
        <tr><td>Runs made</td><td>${s.stats.runs}</td><td>Crates moved</td><td>${s.stats.cratesMoved}</td></tr>
        <tr><td>Nights open</td><td>${s.stats.nightsOpen}</td><td>Times pinched</td><td>${s.stats.timesBusted}</td></tr>
        <tr><td>Truck cargo</td><td>${s.truck.crates} whiskey, ${s.truck.champagne} champagne</td>
            <td>Tiger lifetime take</td><td>$${s.speakeasy.lifetime}</td></tr>
      </table>
    `);
  };

  /* ---------- help (H) ---------- */
  B.openHelp = function () {
    B.openPanel('How Things Work in Harbor City', `
      <h3>Getting Around</h3>
      <p><b>WASD / Arrows</b> move · <b>E</b> talk, enter doors, get in/out of the truck · <b>Space</b> throw a punch ·
      <b>T</b> wait one hour · <b>J</b> notebook · <b>M</b> city map · <b>H</b> this card · <b>Esc</b> menu / close · <b>F2</b> debug overlay</p>
      <h3>The Racket</h3>
      <p>Crates of liquor move by <b>truck</b>: buy or collect them (Pier 7, the border, the farm, Frankie),
      then unload at the <b>alley door behind the Café Roma</b>. Stock feeds <b>The Blind Tiger</b>, which pays out
      every night it is open and wet, 9 PM to 3 AM. Manage price and staff at the Tiger's door.</p>
      <h3>The Law</h3>
      <p>Cops who see a loaded truck get <b>suspicious</b> — the bar fills, then they chase. Night runs are safer.
      <b>HEAT</b> is the city's attention: it rises with sloppy work and falls with time, bribes, allies, and good deeds.
      High heat brings <b>raids</b> to the Tiger. If you're pinched: fines, confiscation, a night in the tank.</p>
      <h3>The People</h3>
      <p>Everyone from the docks to City Hall wants something. Reporters trade in stories, priests in kindness,
      judges in discretion, widows in rent money. <b>REP</b> opens doors with the outfit; <b>COMMUNITY</b> fills
      the Tiger and buys silence — neighbors who like you don't point out your truck to the law. Talk to everyone — twice.</p>
      <h3>Word on the Street</h3>
      <p>Information comes in grades. Street rumors are free and right about three times in five.
      Mickey the Hack sells the straight dope for a nickel — Bureau movements, north-side trouble, tonight's raid odds.
      Check the <b>Pressure</b> section of your notebook (J): the O'Banion push and the Bureau's attention both advance
      whether you act or not. High heat summons a federal sweep; an unanswered north side bleeds your stock.</p>
      <h3>Time</h3>
      <p>One real second is two Harbor City minutes. Sleep at Sal's office (the HQ door) to skip ahead.
      The Tiger settles its books at 3 AM. Heat cools each morning.</p>
    `);
  };

  /* ---------- city map (M) ---------- */
  B.openMap = function () {
    B.openPanel('Harbor City', '<canvas class="mapcanvas" id="bigmap" width="720" height="576"></canvas>' +
      '<p class="dim" style="text-align:center">You are the red dot. Gold marks are people and places of note.' +
      (B.state.perks.patrolMap ? ' Blue dots are police (Mickey\'s knowledge).' : '') + '</p>');
    const cv = document.getElementById('bigmap');
    const ctx = cv.getContext('2d');
    const sx = cv.width / B.MAP_W, sy = cv.height / B.MAP_H;
    drawMapBase(ctx, sx, sy);
    // named places
    ctx.font = '10px Georgia'; ctx.textAlign = 'center';
    for (const b of B.buildings) {
      if (!b.named) continue;
      ctx.fillStyle = '#e8d9a0';
      ctx.fillText(b.name, (b.x + b.w / 2) * sx, (b.y + b.h / 2) * sy);
    }
    if (B.state.perks.patrolMap) {
      ctx.fillStyle = '#6a9aff';
      for (const n of B.npcs) {
        if ((n.kind === 'cop' || n.kind === 'patrolcar') && !n.hidden) {
          ctx.beginPath(); ctx.arc(n.x * sx, n.y * sy, 3, 0, 7); ctx.fill();
        }
      }
    }
    ctx.fillStyle = '#d8b24a';
    ctx.beginPath(); ctx.arc(B.truck.x * sx, B.truck.y * sy, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff5544';
    ctx.beginPath(); ctx.arc(B.player.x * sx, B.player.y * sy, 4, 0, 7); ctx.fill();
  };

  const MAP_COLORS = {
    [B.T.GRASS]: '#31402a', [B.T.ROAD]: '#57534b', [B.T.WALK]: '#6e6659',
    [B.T.BUILDING]: '#453626', [B.T.WATER]: '#1e3448', [B.T.DIRT]: '#5c4a30',
    [B.T.PIER]: '#6a5638', [B.T.FARM]: '#5e4d2f', [B.T.PARK]: '#37502e',
  };
  function drawMapBase(ctx, sx, sy) {
    for (let y = 0; y < B.MAP_H; y++) for (let x = 0; x < B.MAP_W; x++) {
      ctx.fillStyle = MAP_COLORS[B.tileAt(x, y)];
      ctx.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
    }
  }

  /* ---------- pause menu (Esc) ---------- */
  B.openMenu = function () {
    B.openPanel('Harbor City — Paused', `
      <p class="dim">Day ${B.state.day}, ${B.timeStr(B.state.minutes)} · ${B.fmt$(B.state.cash)} in pocket</p>
      <p>
        <button data-m="resume">Back to the street</button>
        <button data-m="save">Save game</button>
        <button data-m="load">Load save</button>
        <button data-m="new">Start over</button>
      </p>
      <p class="dim">The game also saves itself every morning at 8 AM.</p>
    `, body => {
      body.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
        const m = btn.dataset.m;
        if (m === 'resume') B.closePanel();
        if (m === 'save') { B.saveGame(); B.closePanel(); }
        if (m === 'load') { if (B.loadGame()) B.closePanel(); else B.toast('No save found.', 'bad'); }
        if (m === 'new') { if (confirm('Abandon this life and start clean in 1920?')) { B.wipeSave(); location.reload(); } }
      }));
    });
  };

  /* ---------- minimap ---------- */
  let mmBase = null;
  B.initMinimap = function () {
    mmBase = document.createElement('canvas');
    mmBase.width = 180; mmBase.height = 144;
    const ctx = mmBase.getContext('2d');
    drawMapBase(ctx, 180 / B.MAP_W, 144 / B.MAP_H);
  };

  B.renderMinimap = function () {
    const cv = document.getElementById('minimap');
    const ctx = cv.getContext('2d');
    if (!mmBase) return;
    ctx.drawImage(mmBase, 0, 0);
    const sx = 180 / B.MAP_W, sy = 144 / B.MAP_H;
    // objective marker
    const target = B.objectiveTarget();
    if (target) {
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(target.x * sx, target.y * sy, 4 + (B.frame % 40) / 14, 0, 7); ctx.stroke();
    }
    if (B.state.perks.patrolMap) {
      ctx.fillStyle = '#6a9aff';
      for (const n of B.npcs) {
        if ((n.kind === 'cop' || n.kind === 'patrolcar') && !n.hidden) {
          ctx.fillRect(n.x * sx - 1, n.y * sy - 1, 2.5, 2.5);
        }
      }
    }
    ctx.fillStyle = '#d8b24a';
    ctx.fillRect(B.truck.x * sx - 1.5, B.truck.y * sy - 1.5, 3, 3);
    ctx.fillStyle = '#ff5544';
    ctx.beginPath(); ctx.arc(B.player.x * sx, B.player.y * sy, 2.5, 0, 7); ctx.fill();
    // compass rose, bottom-left corner
    ctx.save();
    ctx.translate(16, 128);
    ctx.fillStyle = 'rgba(20,16,10,0.75)';
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b58f2e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.stroke();
    ctx.fillStyle = '#e0c46a';
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(2.6, 0); ctx.lineTo(-2.6, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a7448';
    ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(2.6, 0); ctx.lineTo(-2.6, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0c46a';
    ctx.font = 'bold 7px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('N', 0, -14);
    ctx.restore();
  };

  /* where should the player be heading right now? (for the minimap ring) */
  B.objectiveTarget = function () {
    const s = B.state;
    if (!s.mission) return B.nextStory() ? { x: 30.5, y: 67.5 } : null;   // Sal's door
    const stg = s.stage;
    switch (s.mission) {
      case 'welcome': return stg === 0 ? { x: 32.5, y: 68.5 } : { x: 30.5, y: 67.5 };
      case 'firstrun': return stg === 0 ? { x: B.truck.x, y: B.truck.y } : stg === 1 ? { x: 97.5, y: 67.5 } : { x: 51.5, y: 63.5 };
      case 'openingnight': return stg === 0 ? { x: 51.5, y: 63.5 } : { x: 46.5, y: 68.5 };
      case 'beatcop': { const b = B.npcById('brady'); return { x: b.x, y: b.y }; }
      case 'canadian': return stg === 0 ? { x: 54.5, y: 5.5 } : { x: 51.5, y: 63.5 };
      case 'highplaces': return stg === 0 ? { x: 78.5, y: 35.5 } : { x: 80.5, y: 54.5 };
      case 'rivals': return { x: 14.5, y: 35.5 };
      case 'bignight': return stg === 0 ? { x: 30.5, y: 67.5 } : { x: 46.5, y: 68.5 };
    }
    return null;
  };
})();
