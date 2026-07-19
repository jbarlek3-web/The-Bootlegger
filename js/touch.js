'use strict';
/* The Bootlegger — mobile support: stage scaling, virtual joystick, touch buttons.
 * Pointer Events throughout, so the same code serves fingers, mice, and tests.
 * The touch UI appears on touch-capable devices, or with ?touch=1 for testing. */

(function () {
  const $ = id => document.getElementById(id);

  /* ---------- stage scaling: fit the 1280x720 stage to any screen ---------- */
  function fitStage() {
    const wrap = $('game-wrap');
    const s = Math.min(window.innerWidth / B.VIEW_W, window.innerHeight / B.VIEW_H);
    wrap.style.transform = 'scale(' + s + ')';
    wrap.style.left = Math.max(0, (window.innerWidth - B.VIEW_W * s) / 2) + 'px';
    wrap.style.top = Math.max(0, (window.innerHeight - B.VIEW_H * s) / 2) + 'px';
  }
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', () => setTimeout(fitStage, 120));

  /* ---------- touch detection ---------- */
  B.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 ||
    /[?&]touch=1/.test(location.search);

  const fakeKey = key => ({ key, preventDefault() {} });

  B.initTouch = function () {
    fitStage();
    if (!B.isTouch) return;
    $('touch-ui').classList.remove('hidden');

    /* joystick: any pointer in the lower-left zone drives movement */
    const zone = $('joy-zone'), base = $('joy-base'), knob = $('joy-knob');
    let joyId = null, cx = 0, cy = 0;
    const RADIUS = 48;

    function setKnob(dx, dy) {
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    }
    function joyMove(e) {
      if (e.pointerId !== joyId) return;
      // work in stage coordinates: divide by the current scale
      const scale = zone.getBoundingClientRect().width / zone.offsetWidth || 1;
      let dx = (e.clientX - cx) / scale, dy = (e.clientY - cy) / scale;
      const len = Math.hypot(dx, dy);
      if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
      setKnob(dx, dy);
      const mag = Math.min(1, Math.hypot(dx, dy) / RADIUS);
      if (mag < 0.22) { B.touchAxis = null; return; }
      const a = Math.atan2(dy, dx);
      B.touchAxis = { dx: Math.cos(a) * mag, dy: Math.sin(a) * mag };
    }
    zone.addEventListener('pointerdown', e => {
      joyId = e.pointerId;
      cx = e.clientX; cy = e.clientY;
      // snap the base to where the thumb landed (within the zone)
      const zr = zone.getBoundingClientRect();
      const scale = zr.width / zone.offsetWidth || 1;
      base.style.left = B.clamp((e.clientX - zr.left) / scale - 60, 10, zone.offsetWidth - 130) + 'px';
      base.style.bottom = B.clamp(zone.offsetHeight - (e.clientY - zr.top) / scale - 60, 10, zone.offsetHeight - 130) + 'px';
      zone.setPointerCapture(e.pointerId);
      joyMove(e);
      e.preventDefault();
    });
    zone.addEventListener('pointermove', joyMove);
    const joyEnd = e => {
      if (e.pointerId !== joyId) return;
      joyId = null;
      B.touchAxis = null;
      setKnob(0, 0);
    };
    zone.addEventListener('pointerup', joyEnd);
    zone.addEventListener('pointercancel', joyEnd);

    /* action buttons route through the same key handling as the keyboard */
    const press = key => e => { e.preventDefault(); B.emit('keydown', fakeKey(key)); };
    $('tb-act').addEventListener('pointerdown', press('e'));
    $('tb-punch').addEventListener('pointerdown', press(' '));
    document.querySelectorAll('#touch-menu .tbtn').forEach(b =>
      b.addEventListener('pointerdown', press(b.dataset.k)));

    /* overlays: tap anywhere to dismiss a flash; panels close from the footer */
    $('flash-overlay').addEventListener('pointerdown', () => {
      if (B.mode === 'flash') B.dismissFlash();
    });
    const foot = $('bp-foot');
    foot.textContent = '✕ Close';
    foot.style.cursor = 'pointer';
    foot.style.pointerEvents = 'auto';
    foot.addEventListener('pointerdown', () => B.closePanel());

    /* no long-press context menus over the game */
    window.addEventListener('contextmenu', e => e.preventDefault());
  };
})();
