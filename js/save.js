'use strict';
/* The Bootlegger — save / load via localStorage */

(function () {
  const KEY = 'bootlegger-save-v1';

  B.saveGame = function (auto) {
    try {
      const blob = {
        state: B.state,
        player: { x: B.player.x, y: B.player.y, inTruck: B.player.inTruck },
        truck: { x: B.truck.x, y: B.truck.y },
        npcs: B.npcs.filter(n => n.id).map(n => ({ id: n.id, x: n.x, y: n.y, hidden: n.hidden, hostile: n.hostile, hp: n.hp, follow: !!n.follow })),
      };
      localStorage.setItem(KEY, JSON.stringify(blob));
      if (!auto) B.toast('Saved. The notebook goes back in the coat pocket.');
    } catch (e) {
      B.toast('Could not save (storage unavailable).', 'bad');
    }
  };

  B.hasSave = function () {
    try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
  };

  B.loadGame = function () {
    let blob;
    try { blob = JSON.parse(localStorage.getItem(KEY)); } catch (e) { return false; }
    if (!blob || !blob.state) return false;

    // merge onto a fresh state so new fields keep their defaults
    B.state = Object.assign(B.newState(), blob.state);
    B.state.flags = blob.state.flags || {};
    B.state.speakeasy = Object.assign(B.newState().speakeasy, blob.state.speakeasy);
    B.state.truck = Object.assign(B.newState().truck, blob.state.truck);

    B.player.x = blob.player.x; B.player.y = blob.player.y;
    B.player.inTruck = !!blob.player.inTruck;
    B.truck.x = blob.truck.x; B.truck.y = blob.truck.y;

    for (const sn of blob.npcs || []) {
      const n = B.npcById(sn.id);
      if (!n) continue;
      n.x = sn.x; n.y = sn.y;
      n.hidden = !!sn.hidden; n.hostile = !!sn.hostile;
      n.hp = sn.hp; n.follow = !!sn.follow;
    }
    // a follower mid-escort resumes cleanly
    const rosa = B.npcById('rosa');
    if (B.state.flags.rosaSings && rosa) { rosa.follow = false; rosa.wanderFrom = { x: 51.5, y: 65.5 }; rosa.leash = 2; }

    B.suspicion = 0; B.pursuit = null;
    B.toast('Welcome back to Harbor City. Day ' + B.state.day + '.');
    return true;
  };

  B.wipeSave = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  };
})();
