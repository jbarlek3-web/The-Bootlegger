/* Mobile playability test — landscape phone viewport, joystick + touch buttons. */
const { chromium } = require('playwright');
const fails = [];
function check(name, cond, extra) {
  if (cond) console.log('  PASS ' + name);
  else { console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); fails.push(name); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto((process.env.GAME_URL || 'http://127.0.0.1:8321/index.html') + '?touch=1');
  await page.waitForTimeout(700);
  await page.evaluate(() => localStorage.clear());

  // stage scaled to fit the phone
  const wrapBox = await page.locator('#game-wrap').boundingBox();
  check('stage fits viewport', wrapBox.width <= 845 && wrapBox.height <= 391,
    JSON.stringify(wrapBox));
  await page.screenshot({ path: __dirname + '/mob-title.png' });

  await page.tap('#btn-new');
  await page.waitForTimeout(300);
  check('flash shown', await page.locator('#flash-overlay').isVisible());
  await page.tap('#flash-overlay');                      // tap to dismiss
  await page.waitForTimeout(200);
  check('tap dismissed flash', await page.evaluate(() => B.mode === 'play'));
  check('touch UI visible', await page.locator('#touch-ui').isVisible());

  // joystick drag (pointer events; drive with mouse for determinism)
  const p0 = await page.evaluate(() => B.player.x);
  const zone = await page.locator('#joy-zone').boundingBox();
  const sx = zone.x + zone.width * 0.4, sy = zone.y + zone.height * 0.6;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 70, sy, { steps: 5 });
  await page.waitForTimeout(600);
  const axis = await page.evaluate(() => B.touchAxis);
  await page.mouse.up();
  await page.waitForTimeout(120);
  const p1 = await page.evaluate(() => B.player.x);
  check('joystick sets axis', axis && axis.dx > 0.5, JSON.stringify(axis));
  check('joystick moved player east', p1 > p0 + 0.4, p0 + ' -> ' + p1);
  check('axis clears on release', await page.evaluate(() => !B.touchAxis));

  // USE button talks to Enzo
  await page.evaluate(() => { const e = B.npcById('enzo'); B.player.x = e.x + 1; B.player.y = e.y; });
  await page.waitForTimeout(150);
  await page.tap('#tb-act');
  await page.waitForTimeout(200);
  check('USE opened dialogue', await page.locator('#dialogue').isVisible());
  await page.tap('#dlg-options li');                     // tap first option
  await page.waitForTimeout(150);
  check('tapping option worked', await page.evaluate(() => !!B.state.flags.talkedEnzo));

  // menu buttons + panel close by tap
  await page.tap('#touch-menu .tbtn[data-k="j"]');
  await page.waitForTimeout(200);
  check('JRNL opened panel', await page.locator('#bigpanel').isVisible());
  await page.tap('#bp-foot');
  await page.waitForTimeout(150);
  check('footer tap closed panel', await page.evaluate(() => B.mode === 'play'));

  await page.screenshot({ path: __dirname + '/mob-play.png' });

  // portrait still playable (scaled down further)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const wb2 = await page.locator('#game-wrap').boundingBox();
  check('portrait rescales', wb2.width <= 391, JSON.stringify(wb2));
  await page.screenshot({ path: __dirname + '/mob-portrait.png' });

  check('no JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILURES' : '\nALL GREEN');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
