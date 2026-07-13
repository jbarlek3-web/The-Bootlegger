# Smoke tests

Headless-browser tests that drive the real game end-to-end with Playwright:

- `smoke.js` — boot, movement, missions 1–3, panels, suspicion, pressure clocks,
  rumor engine, save/load, debug overlay
- `smoke2.js` — missions 4–8 (all resolution paths that can be scripted:
  persuasion, bribery, leverage, reputation), the Route 9 checkpoint encounter,
  a side quest, and thug combat

## Run

```
npm i -g playwright http-server        # once; also: npx playwright install chromium
http-server -p 8321 -s &               # serve the repo root
node tests/smoke.js && node tests/smoke2.js
```

Environment overrides:

- `CHROMIUM_PATH` — explicit Chromium binary (defaults to Playwright's own download)
- `GAME_URL` — where the game is served (defaults to `http://127.0.0.1:8321/index.html`)

Each script prints PASS/FAIL per check, saves a screenshot next to itself, and
exits nonzero on any failure.
