/* Headless smoke test for The Bootlegger — drives the real game in Chromium. */
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
  await page.waitForTimeout(600);

  check('boot: no JS errors', errors.length === 0, errors.join(' | '));
  check('boot: title visible', await page.locator('#title-screen').isVisible());

  // ---- new game ----
  await page.click('#btn-new');
  await page.waitForTimeout(300);
  check('newgame: intro flash shown', await page.locator('#flash-overlay').isVisible());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const mode = await page.evaluate(() => B.mode);
  check('newgame: mode=play after flash', mode === 'play', 'mode=' + mode);
  check('newgame: mission=welcome', await page.evaluate(() => B.state.mission) === 'welcome');

  // ---- movement ----
  const p0 = await page.evaluate(() => ({ x: B.player.x, y: B.player.y }));
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  const p1 = await page.evaluate(() => ({ x: B.player.x, y: B.player.y }));
  check('movement: player walked east', p1.x > p0.x + 0.5, JSON.stringify([p0, p1]));

  // ---- mission 1: talk to Enzo, then Sal ----
  await page.evaluate(() => { const e = B.npcById('enzo'); B.player.x = e.x + 1; B.player.y = e.y; });
  await page.waitForTimeout(100);
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  check('enzo: dialogue opened', await page.locator('#dialogue').isVisible());
  await page.keyboard.press('1');
  await page.waitForTimeout(150);
  check('enzo: flag set', await page.evaluate(() => !!B.state.flags.talkedEnzo));

  await page.evaluate(() => { B.player.x = 30.5; B.player.y = 67.8; });  // HQ door
  await page.waitForTimeout(100);
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  check('sal: dialogue opened', await page.locator('#dialogue').isVisible());
  await page.keyboard.press('1');
  await page.waitForTimeout(250);
  check('m1 complete', await page.evaluate(() => B.state.completed.includes('welcome')));
  await page.keyboard.press('Enter'); // outro flash
  await page.waitForTimeout(150);

  // ---- mission 2: first run ----
  await page.keyboard.press('e');    // Sal again → handout
  await page.waitForTimeout(150);
  await page.keyboard.press('1');    // "Consider it done."
  await page.waitForTimeout(150);
  check('m2 started', await page.evaluate(() => B.state.mission === 'firstrun'));
  check('m2: password known', await page.evaluate(() => B.state.speakeasy.known));

  // get in the truck
  await page.evaluate(() => { B.player.x = B.truck.x + 1; B.player.y = B.truck.y; });
  await page.waitForTimeout(100);
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  check('m2: in truck', await page.evaluate(() => B.player.inTruck));
  check('m2: stage advanced to load', await page.evaluate(() => B.state.stage) === 1);

  // drive to pier 7 door and load
  await page.evaluate(() => { B.truck.x = 97.5; B.truck.y = 68.5; B.player.x = 97.5; B.player.y = 68.5; });
  await page.waitForTimeout(150);
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  check('m2: crates loaded', await page.evaluate(() => B.state.truck.crates) === 4);

  // deliver at the alley door
  await page.evaluate(() => { B.truck.x = 52.5; B.truck.y = 63.5; B.player.x = 52.5; B.player.y = 63.5; });
  await page.waitForTimeout(150);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  check('m2: delivered to stock', await page.evaluate(() => B.state.speakeasy.stock) === 4);
  check('m2 complete', await page.evaluate(() => B.state.completed.includes('firstrun')));
  await page.keyboard.press('Enter'); // outro flash
  await page.waitForTimeout(150);

  // ---- mission 3: opening night (time skip through 3 AM settle) ----
  await page.evaluate(() => { B.startMission('openingnight'); });
  await page.waitForTimeout(200);
  const stage3 = await page.evaluate(() => ({ m: B.state.mission, st: B.state.stage }));
  check('m3: stock stage auto-passed', stage3.st === 1, JSON.stringify(stage3));
  await page.evaluate(() => { B.player.inTruck = false; B.advanceTime(24 * 60); });
  await page.waitForTimeout(300);
  const night = await page.evaluate(() => B.state.speakeasy.lastNight);
  check('m3: night settled', !!night, JSON.stringify(night));
  const m3done = await page.evaluate(() => B.state.completed.includes('openingnight') || (B.state.speakeasy.lastNight && B.state.speakeasy.lastNight.raided));
  check('m3 complete (or raided — random)', m3done);
  // dismiss any queued flashes
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); }

  // ---- panels ----
  for (const [key, name] of [['j', 'journal'], ['m', 'map'], ['h', 'help']]) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
    check('panel ' + name + ' opens', await page.locator('#bigpanel').isVisible());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
  }

  // ---- speakeasy panel via cafe door ----
  await page.evaluate(() => { B.player.x = 46.5; B.player.y = 68.8; });
  await page.keyboard.press('e');
  await page.waitForTimeout(150);
  check('tiger panel opens', await page.locator('#bp-title').textContent() === 'The Blind Tiger');
  await page.keyboard.press('Escape');

  // ---- suspicion / pursuit machinery ----
  await page.evaluate(() => {
    B.state.truck.crates = 4; B.player.inTruck = true;
    const c = B.npcById('cop2'); B.truck.x = c.x + 2; B.truck.y = c.y; B.player.x = B.truck.x; B.player.y = B.truck.y;
  });
  await page.waitForTimeout(1200);
  const susp = await page.evaluate(() => B.suspicion);
  check('law: suspicion builds near cop', susp > 0, 'suspicion=' + susp);

  // ---- pressure clocks tick ----
  const clocks = await page.evaluate(() => {
    B.state.heat = 60; B.state.speakeasy.openForBusiness = true;
    for (let i = 0; i < 5; i++) B.newDay();
    return B.state.clocks;
  });
  check('clocks: fed rises with heat', clocks.fed >= 4, JSON.stringify(clocks));
  check('clocks: obanion advances', clocks.obanion >= 5, JSON.stringify(clocks));
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(80); }

  // ---- rumor engine ----
  const rumor = await page.evaluate(() => B.streetRumor());
  check('rumor: street rumor generated', typeof rumor === 'string' && rumor.length > 10, rumor);

  // ---- save / load round trip ----
  await page.evaluate(() => B.saveGame());
  const cashBefore = await page.evaluate(() => B.state.cash);
  await page.evaluate(() => { B.state.cash = 99999; });
  const loaded = await page.evaluate(() => B.loadGame());
  const cashAfter = await page.evaluate(() => B.state.cash);
  check('save/load round trip', loaded && cashAfter === cashBefore, cashBefore + ' vs ' + cashAfter);

  // ---- debug overlay ----
  await page.keyboard.press('F2');
  await page.waitForTimeout(100);
  check('debug overlay toggles', await page.evaluate(() => B.debugOn === true));

  check('end: no JS errors accumulated', errors.length === 0, errors.slice(0, 3).join(' | '));

  await page.screenshot({ path: __dirname + '/smoke.png' });
  await browser.close();

  console.log(fails.length ? '\n' + fails.length + ' FAILURES' : '\nALL GREEN');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
