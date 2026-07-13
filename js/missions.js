'use strict';
/* The Bootlegger — missions: story arc, stage engine, world events, the clock */

(function () {
  const st = () => B.state;

  /* ================= story missions ================= */
  B.STORY_ORDER = ['welcome', 'firstrun', 'openingnight', 'beatcop', 'canadian', 'highplaces', 'rivals', 'bignight'];

  B.MISSIONS = {
    welcome: {
      title: 'Welcome to the Family',
      stages: [
        { obj: 'Talk to Enzo outside Moretti Import Co.', done: s => s.flags.talkedEnzo },
        { obj: 'Go inside and meet Sal Moretti.', done: s => s.flags.metSal },
      ],
      reward: { rep: 2 },
      outro: 'You work for Salvatore Moretti now. Sal hands out the jobs — his office door is always open to family.',
    },
    firstrun: {
      title: 'The First Run',
      onStart: s => { s.speakeasy.known = true; B.toast('Sal gives you the password to the Tiger: "swordfish."'); },
      stages: [
        { obj: 'Get into the truck parked on the avenue (walk up, press E).', done: s => s.flags.droveTruck },
        { obj: 'Load the crates at Pier 7 Warehouse (park close, press E at the door).', done: s => s.flags.m2loaded },
        { obj: 'Deliver them to the alley door behind the Café Roma. Mind the police.', done: s => s.flags.m2delivered },
      ],
      reward: { cash: 60, rep: 5 },
      outro: 'Four cases down the chute and nobody the wiser. Sal sends your cut with a nod. It begins.',
    },
    openingnight: {
      title: 'Opening Night',
      onStart: s => { s.speakeasy.openForBusiness = true; },
      stages: [
        { obj: 'Have at least 4 crates in the Tiger\'s cellar (deliver at the alley door).', done: s => s.speakeasy.stock >= 4 },
        { obj: 'Keep the Tiger open through tonight (9 PM–3 AM). Set your price at the front door panel. Sleep at Sal\'s office to pass time.', done: s => s.flags.firstNight },
      ],
      reward: { cash: 40, rep: 5 },
      outro: 'The Tiger roars — quietly, behind a steel door. From tonight on, every open night pays.',
    },
    beatcop: {
      title: 'The Man on the Beat',
      stages: [
        { obj: 'Find Officer Brady walking the downtown blocks and put him on the payroll ($40, or talk your way in).', done: s => s.flags.bradyPaid },
      ],
      reward: { cash: 30, rep: 4 },
      outro: 'Brady\'s beat is now the safest stretch of pavement in the city — for you, anyway.',
    },
    canadian: {
      title: 'The Canadian Connection',
      stages: [
        { obj: 'After dark, take the truck up Route 9 and load the rye at the Border Warehouse.', done: s => s.flags.m5loaded },
        { obj: 'Bring the shipment home to the Tiger. A federal checkpoint watches Route 9 — bribe it, beat it, or find the back way.', done: s => s.flags.m5delivered },
      ],
      reward: { cash: 150, rep: 8 },
      onComplete: s => { s.perks.connection = true; B.toast('The border pipeline is open: cheap rye at the Border Warehouse, after dark.', 'money'); },
      outro: 'Eight cases of Montreal\'s best, and the Bureau none the richer. Sal calls it the finest run of the season.',
    },
    highplaces: {
      title: 'Friends in High Places',
      stages: [
        { obj: 'Get leverage on Judge Hargrove. Walt Whitaker at the Herald-Tribune keeps files on everyone.', done: s => s.flags.dossier },
        { obj: 'Pay the Judge a visit at City Hall.', done: s => s.flags.judgeAlly },
      ],
      reward: { cash: 50, rep: 6 },
      outro: 'His Honor has discovered judicial restraint. Warrants against the Tiger now die in chambers.',
    },
    rivals: {
      title: 'The North Side Problem',
      onStart: s => {
        s.truck.stolen = true;
        B.truck.x = 12.5; B.truck.y = 36.8;
        B.toast('The truck sits behind O\'Banion\'s garage on the north side.');
      },
      stages: [
        { obj: 'Recover the truck from O\'Banion\'s garage. Deacon talks arithmetic — or his boys talk with their hands.', done: s => s.flags.truckBack },
      ],
      reward: { cash: 80, rep: 8 },
      outro: 'The truck is home. Whatever was said or swung on the north side, O\'Banion\'s crew keeps to their own blocks now.',
    },
    bignight: {
      title: 'The Big Night',
      stages: [
        { obj: 'Ready the Tiger: 8+ crates in the cellar, the piano man hired, heat under 30. Then tell Sal.', done: s => s.flags.partyNight || s.flags.partyResult === 'success' },
        { obj: 'Host the Alderman\'s people tonight. Doors open, glasses full, no raids.', done: s => s.flags.partyResult === 'success' },
      ],
      reward: { cash: 250, rep: 15 },
      onComplete: s => {
        s.perks.made = true;
        B.flash('A MADE MAN',
          'The Alderman\'s people drink until dawn and leave singing.\n\nSal pours two glasses of the Montreal ' +
          'rye and slides one across the desk.\n\n"Eight months ago you were nobody. Now the law drinks our ' +
          'liquor, the bench signs our nothing, and the best room in Harbor City runs on your say-so."\n\n' +
          '"Salute, capo. The city\'s thirsty — let\'s keep her that way."\n\n— THE TIGER STAYS OPEN. HARBOR CITY IS YOURS TO RUN. —');
      },
      outro: 'Promoted. The Tiger earns a made man\'s margin now, and Harbor City knows your name.',
    },
  };

  B.missionActive = id => id ? st().mission === id : !!st().mission;
  B.nextStory = () => B.STORY_ORDER.find(id => !st().completed.includes(id));

  B.startMission = function (id) {
    const s = st(), m = B.MISSIONS[id];
    s.mission = id; s.stage = 0;
    if (m.onStart) m.onStart(s);
    B.toast('NEW JOB — ' + m.title);
    B.emit('missionStart', id);
  };

  B.currentObjective = function () {
    const s = st();
    if (!s.mission) {
      const nxt = B.nextStory();
      return nxt ? 'See Sal at Moretti Import Co. for your next job.' : 'Harbor City is yours. Keep the Tiger wet and the law dry.';
    }
    const m = B.MISSIONS[s.mission];
    return m.title + ' — ' + m.stages[s.stage].obj;
  };

  B.updateMissions = function () {
    const s = st();
    if (!s.mission) return;
    const m = B.MISSIONS[s.mission];
    while (s.mission && m.stages[s.stage] && m.stages[s.stage].done(s)) {
      s.stage++;
      if (s.stage >= m.stages.length) {
        s.completed.push(s.mission);
        const done = s.mission;
        s.mission = null; s.stage = 0;
        if (m.reward) {
          if (m.reward.cash) B.addCash(m.reward.cash);
          if (m.reward.rep) B.addRep(m.reward.rep);
        }
        if (m.onComplete) m.onComplete(s);
        B.toast('JOB DONE — ' + m.title, 'money');
        if (m.outro && done !== 'bignight') B.flash(m.title.toUpperCase(), m.outro);
        B.emit('missionComplete', done);
      } else {
        B.toast('Objective: ' + m.stages[s.stage].obj);
      }
    }
  };

  /* ================= event listeners ================= */
  B.on('deliverTiger', load => {
    const s = st();
    if (B.missionActive('firstrun')) s.flags.m2delivered = true;
    // the full order or nothing — the border warehouse refills for free while the job is open
    if (B.missionActive('canadian') && s.flags.m5loaded && load >= B.TUNE.economy.ryeShipment) s.flags.m5delivered = true;
  });

  B.on('nightSettled', ln => {
    const s = st();
    if (B.missionActive('openingnight') && ln.patrons > 0) s.flags.firstNight = true;
  });

  B.on('partyResolved', result => {
    if (result === 'flop') {
      B.toast('The party fizzled — too few patrons, or trouble. Regroup and tell Sal when you\'re ready again.', 'bad');
    }
  });

  B.on('thugDown', id => {
    const s = st();
    if ((id === 'lefty' || id === 'knuckles')) {
      const l = B.npcById('lefty'), k = B.npcById('knuckles');
      if (l.hidden && k.hidden && B.missionActive('rivals') && !s.flags.truckBack) {
        B.addRep(2);
        B.addHeat(6);
        B.returnTruck();
      }
    }
    if (id === 'rat1' || id === 'rat2') {
      const a = B.npcById('rat1'), b = B.npcById('rat2');
      if (a.hidden && b.hidden && s.side.charlie === 1) {
        s.side.charlie = 'done';
        s.perks.docksDiscount = true;
        B.addCash(15);
        B.addCommunity(2);
        B.toast('Union crate recovered. Charlie\'s tally man now counts generous for you: crates $8 at Pier 7.', 'money');
      }
    }
  });

  /* ================= per-frame world logic ================= */
  let inCheckpoint = false;

  B.updateWorldLogic = function () {
    const s = st(), p = B.player;

    /* --- Route 9 federal checkpoint --- */
    const zones = B.zoneAt(p.x, p.y);
    const inZ = zones.includes('checkpoint');
    if (inZ && !inCheckpoint && p.inTruck && (s.truck.crates + s.truck.champagne) > 0 && !B.pursuit) {
      inCheckpoint = true;
      if (s.flags.checkpointClearDay === s.day) {
        B.toast('Agent Doyle waves you through with a look that says the arrangement is remembered.');
      } else {
        B.openCheckpoint();
      }
    }
    if (!inZ) inCheckpoint = false;

    /* --- Walt's stakeout --- */
    if (s.side.walt === 1) {
      const h = B.hour();
      if ((h >= 22 || h < 4) && B.dist(p.x, p.y, 14.5, 31.5) < 9) {
        s.side.walt = 2;
        B.toast('From the shadows you watch barrel after barrel roll into "the garage." No mechanic works these hours. Walt will want to hear this.');
      }
    }

    /* --- Rosa's escort --- */
    if (s.side.rosa === 1) {
      const rosa = B.npcById('rosa');
      if (B.dist(rosa.x, rosa.y, 51.5, 63.5) < 3.5 && B.dist(p.x, p.y, rosa.x, rosa.y) < 5) {
        s.side.rosa = 'done';
        s.flags.rosaSings = true;
        rosa.follow = false;
        rosa.x = 51.5; rosa.y = 65.5;
        rosa.wanderFrom = { x: 51.5, y: 65.5 }; rosa.leash = 2;
        B.addRep(3);
        B.addCommunity(2);
        B.toast('Rosa steps through the steel door, and a minute later the alley hums with her first number. The Tiger has a voice.', 'money');
      }
    }
  };

  B.openCheckpoint = function () {
    const s = st();
    const load = s.truck.crates + s.truck.champagne;
    B.openDialogue(B.say('Agent Doyle — Bureau of Prohibition',
      'Lanterns across the highway. A man in a gray suit raises a gloved hand; two more lean on a Packard ' +
      'with a long gun visible on the seat.\n\n"Evening. Bureau of Prohibition. Step down and open the bed, please."',
      [
        {
          label: 'Offer the Bureau a "road maintenance contribution." ($75)',
          effect: () => {
            if (B.pay(75)) {
              s.flags.checkpointClearDay = s.day;
              B.openDialogue(B.say('Agent Doyle',
                '"...Inspection passed." The bills disappear into a glove, government-issue. "Mind the potholes, ' +
                'citizen. Federal roads are chronically underfunded."'));
            } else {
              B.openDialogue(B.checkpointSearch());
            }
          },
        },
        {
          label: 'Shingles and turnips, Officer. Farm supply run.',
          effect: () => {
            if (load <= 2) {
              s.flags.checkpointClearDay = s.day;
              B.openDialogue(B.say('Agent Doyle',
                'He lifts the tarp, finds sacking and not much else worth a report, and waves you on. ' +
                '"Turnips. Thrilling. Move along."'));
            } else {
              B.openDialogue(B.checkpointSearch());
            }
          },
        },
        {
          label: 'FLOOR IT.',
          effect: () => { B.addHeat(10); B.startPursuit(); },
        },
      ]));
  };

  B.checkpointSearch = function () {
    return B.say('Agent Doyle',
      'The tarp comes up. Agent Doyle looks at eight cases of Montreal rye, then at you, with something ' +
      'close to gratitude — arrests are how a man gets promoted.\n\n"Well now. Step away from the vehicle."',
      [
        { label: 'FLOOR IT!', effect: () => { B.addHeat(12); B.startPursuit(); } },
        { label: 'Surrender.', effect: () => B.busted() },
      ]);
  };

  /* ================= the clock ================= */
  B.advanceTime = function (mins) {
    const s = st();
    let remaining = mins;
    while (remaining > 0) {
      const step = Math.min(remaining, 10);
      const before = s.minutes;
      s.minutes += step;
      remaining -= step;

      // 3:00 AM — the Tiger settles its books
      if (hourCrossed(before, s.minutes, 3)) B.settleNight();
      // 8:00 AM — a new day
      if (hourCrossed(before, s.minutes, 8)) B.newDay();
    }
    while (s.minutes >= 1440) s.minutes -= 1440;
  };

  function hourCrossed(before, after, h) {
    const target = h * 60;
    const b = before % 1440;
    let delta = after - before;
    // distance from `b` forward to target
    let toTarget = target - b;
    if (toTarget <= 0) toTarget += 1440;
    return delta >= toTarget;
  }

  B.newDay = function () {
    const s = st();
    s.day++;
    tickClocks(s);           // the Bureau reacts to yesterday's heat, before it cools
    // heat cools with time; friends make it cool faster
    let decay = B.TUNE.heat.dailyDecay;
    if (s.flags.bradyPaid) decay += B.TUNE.heat.bradyBonusDecay;
    s.heat = Math.max(0, s.heat - decay);
    s.hp = Math.min(100, s.hp + 25);
    // Sister Prudence organizes
    if (!s.flags.prudencePlacated && s.speakeasy.openForBusiness && Math.random() < 0.2) {
      s.flags.picketTonight = true;
      B.toast('Word on the street: the Temperance League plans to picket the Roma\'s alley tonight.', 'bad');
    }
    B.emit('newDay', s.day);
    B.saveGame(true);
  };

  /* ---------- faction pressure clocks: the world moves if you don't ---------- */
  function tickClocks(s) {
    const C = B.TUNE.clocks;

    /* O'Banion expansion — ticks daily once the Tiger is worth muscling in on,
     * until the Rivals job is settled or a truce is bought */
    const obanionSettled = s.completed.includes('rivals') || s.flags.truce;
    if (obanionSettled) {
      s.clocks.obanion = 0;
    } else if (s.speakeasy.openForBusiness && s.clocks.obanion < C.obanionMax) {
      s.clocks.obanion++;
      if (s.clocks.obanion === C.obanionWarnAt) {
        B.toast('O\'Banion cars have been seen idling on the east side, counting your deliveries.', 'bad');
      }
      if (s.clocks.obanion === C.obanionHijackAt) {
        B.flash('THE NORTH SIDE MOVES',
          'Enzo catches you at the door, hat in hand.\n\n"Deacon\'s boys jumped a wagon on Fifth last night. ' +
          'Nobody hurt — this time. They\'re moving on our supply lines, cousin. Every night we leave it ' +
          'unanswered, the cellar gets lighter."\n\nUntil the north side is settled, expect your stock to bleed.');
      }
    }

    /* Federal attention — sustained heat summons the Bureau; laying low sends it home */
    if (s.heat >= C.fedHeatRise) s.clocks.fed = Math.min(C.fedMax, s.clocks.fed + 1);
    else if (s.heat <= C.fedHeatFall) s.clocks.fed = Math.max(0, s.clocks.fed - 1);
    if (s.clocks.fed === C.fedWarnAt) {
      B.toast('Men in gray suits have been asking questions at the precinct. Bureau men.', 'bad');
    }
    if (s.clocks.fed >= C.fedMax && !s.flags.fedSweep) {
      s.flags.fedSweep = true;
      B.toast('Mickey leans out of his cab: "Word is the Bureau sweeps the east side TONIGHT. Were I you, I\'d go dark."', 'bad');
    }
  }

  B.sleepUntil = function (hour) {
    const s = st();
    const now = s.minutes % 1440;
    let target = hour * 60 - now;
    if (target <= 0) target += 1440;
    B.advanceTime(target);
    s.hp = Math.min(100, s.hp + 30);
  };
})();
