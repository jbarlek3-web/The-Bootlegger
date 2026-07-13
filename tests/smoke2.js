/* Smoke test 2 — the back half of the story arc + checkpoint encounter. */
const { chromium } = require('playwright');
const fails = [];
function check(name, cond, extra) {
  if (cond) console.log('  PASS ' + name);
  else { console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); fails.push(name); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8321/index.html');
  await page.waitForTimeout(500);
  await page.evaluate(() => { localStorage.clear(); });
  await page.click('#btn-new');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);

  // fast-forward past the first three story jobs
  await page.evaluate(() => {
    B.state.completed = ['welcome', 'firstrun', 'openingnight'];
    B.state.mission = null;
    B.state.speakeasy.known = true;
    B.state.speakeasy.openForBusiness = true;
    B.state.cash = 1000; B.state.rep = 25;
  });

  // ---- M4: beat cop, persuade path (rep >= 12) ----
  await page.evaluate(() => B.startMission('beatcop'));
  await page.evaluate(() => B.openDialogue(B.dialogues.brady()));
  await page.waitForTimeout(150);
  const bradyOpts = await page.evaluate(() => [...document.querySelectorAll('#dlg-options li')].map(li => li.textContent));
  check('m4: bribe + persuade options offered', bradyOpts.length >= 3, JSON.stringify(bradyOpts));
  await page.keyboard.press('2');   // persuade
  await page.waitForTimeout(150);
  await page.keyboard.press('1');   // close his reply
  await page.waitForTimeout(200);
  check('m4 complete via persuasion', await page.evaluate(() => B.state.completed.includes('beatcop')));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);

  // ---- M5: canadian — border load requires night + truck; checkpoint fires ----
  await page.evaluate(() => B.startMission('canadian'));
  await page.evaluate(() => { B.state.minutes = 22 * 60; });   // 10 PM
  await page.evaluate(() => { B.truck.x = 55.5; B.truck.y = 6.5; B.player.x = 55.5; B.player.y = 6.5; B.player.inTruck = true; });
  await page.evaluate(() => B.doorAction('border'));
  check('m5: rye loaded at border', await page.evaluate(() => B.state.truck.crates) === 8);

  // drive into the checkpoint zone
  await page.evaluate(() => { B.truck.x = 55.5; B.truck.y = 16.5; B.player.x = 55.5; B.player.y = 16.5; });
  await page.waitForTimeout(300);
  check('m5: checkpoint dialogue fired', await page.locator('#dialogue').isVisible());
  const agentName = await page.evaluate(() => document.getElementById('dlg-name').textContent);
  check('m5: Agent Doyle speaking', agentName.includes('Doyle'), agentName);
  await page.keyboard.press('1');   // bribe $75
  await page.waitForTimeout(150);
  await page.keyboard.press('1');   // close
  await page.waitForTimeout(150);
  check('m5: bribe cleared the day', await page.evaluate(() => B.state.flags.checkpointClearDay === B.state.day));

  // deliver 8 cases to the alley door
  await page.evaluate(() => { B.truck.x = 52.5; B.truck.y = 63.5; B.player.x = 52.5; B.player.y = 63.5; });
  await page.waitForTimeout(150);
  await page.evaluate(() => B.doorAction('tigerback'));
  await page.waitForTimeout(250);
  check('m5 complete', await page.evaluate(() => B.state.completed.includes('canadian')));
  check('m5: pipeline perk granted', await page.evaluate(() => !!B.state.perks.connection));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);

  // ---- M6: high places — pay Walt, confront Judge ----
  await page.evaluate(() => B.startMission('highplaces'));
  await page.evaluate(() => B.openDialogue(B.dialogues.walt()));
  await page.waitForTimeout(150);
  await page.keyboard.press('1');   // pay $80
  await page.waitForTimeout(150);
  check('m6: dossier acquired', await page.evaluate(() => !!B.state.flags.dossier));
  await page.evaluate(() => B.openDialogue(B.dialogues.judge()));
  await page.waitForTimeout(150);
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  await page.keyboard.press('1');   // close judge's reply
  await page.waitForTimeout(200);
  check('m6 complete, judge bought', await page.evaluate(() => B.state.completed.includes('highplaces') && B.state.flags.judgeAlly));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);

  // ---- M7: rivals — leverage path (Walt sold the dossier, but the REP 20 path is open) ----
  await page.evaluate(() => B.startMission('rivals'));
  await page.waitForTimeout(100);
  check('m7: truck impounded', await page.evaluate(() => B.state.truck.stolen));
  await page.evaluate(() => B.openDialogue(B.dialogues.deacon()));
  await page.waitForTimeout(150);
  const deaconOpts = await page.evaluate(() => [...document.querySelectorAll('#dlg-options li')].map(li => li.textContent));
  check('m7: REP-20 muscle option offered', deaconOpts.some(o => o.includes('Count our crews')), JSON.stringify(deaconOpts));
  const idx = deaconOpts.findIndex(o => o.includes('Count our crews'));
  await page.keyboard.press(String(idx + 1));
  await page.waitForTimeout(150);
  await page.keyboard.press('1');   // close
  await page.waitForTimeout(250);
  check('m7 complete via reputation', await page.evaluate(() => B.state.completed.includes('rivals') && B.state.flags.truce && !B.state.truck.stolen));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);

  // ---- M8: the big night ----
  await page.evaluate(() => {
    B.startMission('bignight');
    B.state.speakeasy.stock = 12;
    B.state.speakeasy.musician = true;
    B.state.heat = 5;
    B.state.rep = 40; B.state.community = 20;
  });
  await page.evaluate(() => B.openDialogue(B.dialogues.sal()));
  await page.waitForTimeout(150);
  const salText = await page.evaluate(() => document.getElementById('dlg-text').textContent);
  check('m8: Sal sees the house is ready', salText.includes('ready tonight') || salText.includes('like to hear'), salText.slice(0, 80));
  await page.keyboard.press('1');   // send word
  await page.waitForTimeout(150);
  check('m8: party night set', await page.evaluate(() => !!B.state.flags.partyNight));
  await page.evaluate(() => { B.player.inTruck = false; B.advanceTime(24 * 60); });
  await page.waitForTimeout(400);
  const fin = await page.evaluate(() => ({ done: B.state.completed.includes('bignight'), made: !!B.state.perks.made, ln: B.state.speakeasy.lastNight }));
  check('m8 complete — MADE MAN', fin.done && fin.made, JSON.stringify(fin));
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(80); }

  // post-game objective line
  const obj = await page.evaluate(() => B.currentObjective());
  check('endgame objective reads free-play', obj.includes('yours'), obj);

  // ---- side quest sanity: Lombardi delivery ----
  await page.evaluate(() => {
    B.state.side.lombardi = 1;
    B.state.truck.crates = 3;
    B.truck.x = 44.5; B.truck.y = 50.5;
    B.doorAction('pharmacy');
  });
  check('side: lombardi delivery pays + allies', await page.evaluate(() => B.state.side.lombardi === 'done' && B.state.allies.lombardi));

  // ---- thug combat: pier rats ----
  await page.evaluate(() => {
    B.closeDialogue(); B.closePanel();
    B.state.side.charlie = 1;
    ['rat1', 'rat2'].forEach(id => { const n = B.npcById(id); n.hidden = false; n.hostile = true; });
    const r = B.npcById('rat1');
    B.player.x = r.x + 0.5; B.player.y = r.y; B.player.inTruck = false;
  });
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(' ');
    await page.waitForTimeout(480);
    await page.evaluate(() => { const r = B.npcById('rat1').hidden ? B.npcById('rat2') : B.npcById('rat1'); if (!r.hidden) { B.player.x = r.x + 0.5; B.player.y = r.y; } });
    const doneFight = await page.evaluate(() => B.npcById('rat1').hidden && B.npcById('rat2').hidden);
    if (doneFight) break;
  }
  check('combat: pier rats beaten, union perk', await page.evaluate(() => B.state.side.charlie === 'done' && B.state.perks.docksDiscount));

  check('no JS errors across arc', errors.length === 0, errors.slice(0, 3).join(' | '));
  await page.screenshot({ path: __dirname + '/smoke2.png' });
  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILURES' : '\nALL GREEN');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
