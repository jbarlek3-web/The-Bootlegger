'use strict';
/* The Bootlegger — the people of Harbor City: named NPCs, dialogue trees,
 * side quests, and door/location interactions. */

(function () {
  const say = B.say;
  const st = () => B.state;

  B.truckNear = (x, y, r) => !st().truck.stolen && B.dist(B.truck.x, B.truck.y, x, y) < (r || 3.5);
  B.doorById = id => B.doors.find(d => d.id === id);

  /* ================= spawn the cast ================= */
  B.spawnNamedNPCs = function () {
    const N = B.addNPC;
    N({ id: 'enzo', name: 'Enzo Moretti', x: 32.5, y: 68.5, coat: '#3a3f52', hat: '#22262f', leash: 3 });
    N({ id: 'rosa', name: 'Rosa DeLuca', x: 61.5, y: 38.7, coat: '#7a2d4a', hat: '#54203a', leash: 3 });
    N({ id: 'mickey', name: 'Mickey the Hack', x: 70.0, y: 58.7, coat: '#4c4a38', leash: 2 });
    N({ id: 'walt', name: 'Walt Whitaker', x: 78.5, y: 35.0, coat: '#55585e', leash: 4 });
    N({ id: 'callahan', name: 'Fr. Callahan', x: 30.5, y: 85.0, coat: '#23201c', hat: '#141210', leash: 3 });
    N({ id: 'lombardi', name: 'Doc Lombardi', x: 45.5, y: 50.0, coat: '#3d5545', leash: 3 });
    N({ id: 'mrsk', name: 'Mrs. Kowalski', x: 16.5, y: 86.0, coat: '#5a4a5e', hat: '#443648', leash: 3 });
    N({ id: 'charlie', name: 'Charlie Doyle', x: 94.5, y: 83.0, coat: '#3e4a3a', leash: 5 });
    N({ id: 'vivian', name: 'Vivian Ashworth', x: 65.5, y: 38.7, coat: '#7c6a3c', hat: '#8c7a4a', leash: 3 });
    N({ id: 'judge', name: 'Judge Hargrove', x: 80.5, y: 54.0, coat: '#2c2c34', leash: 2 });
    N({ id: 'deacon', name: 'Deacon O\'Banion', x: 14.5, y: 36.5, coat: '#3d4a3d', leash: 3 });
    N({ id: 'prudence', name: 'Sister Prudence', x: 60.5, y: 57.7, coat: '#6e6a60', hat: '#565248', leash: 4 });
    N({ id: 'hollis', name: 'Farmer Hollis', x: 89.0, y: 7.5, coat: '#6d5b35', leash: 3 });
    N({ id: 'frankie', name: 'Frankie the Fence', x: 14.5, y: 65.5, coat: '#463a50', leash: 2 });
    // O'Banion muscle — dormant until the Rivals mission comes to blows
    N({ id: 'lefty', name: 'Lefty', kind: 'thug', x: 12.5, y: 37.5, coat: '#443c34', hp: 55, hidden: true, speed: 2.9 });
    N({ id: 'knuckles', name: 'Knuckles', kind: 'thug', x: 16.5, y: 37.5, coat: '#3c4434', hp: 55, hidden: true, speed: 2.7 });
    // pier rats — Charlie's stolen crate
    N({ id: 'rat1', name: 'Pier Rat', kind: 'thug', x: 107.5, y: 75.5, coat: '#4a4438', hp: 40, hidden: true, speed: 2.8 });
    N({ id: 'rat2', name: 'Pier Rat', kind: 'thug', x: 109.5, y: 76.0, coat: '#4a4438', hp: 40, hidden: true, speed: 2.8 });
  };

  /* ================= dialogue trees ================= */
  B.dialogues = {};

  /* ---------- Enzo — your cousin, your ropes-shower ---------- */
  B.dialogues.enzo = function () {
    const s = st();
    const root = say('Enzo Moretti', '', []);
    if (!s.flags.talkedEnzo) {
      root.text = '"There he is! Cousin, welcome to the family business — imports, exports, ' +
        'refreshments. Rule one: the truck is your life. Rule two: the law can\'t search what it ' +
        'can\'t catch. Rule three: Sal does the thinking.\n\nGo on in. Sal\'s waiting on you."';
      root.options = [
        { label: 'Thanks, Enzo. I\'ll head in.', effect: () => { s.flags.talkedEnzo = true; } },
      ];
      return root;
    }
    root.text = '"How you holding up, kid?"';
    root.options = [
      {
        label: 'Any advice?',
        next: () => say('Enzo Moretti',
          '"Plenty. Cops get suspicious when they see a loaded truck — that bar fills up, you run. ' +
          'Night is your friend on a run; so is a paid-off beat cop. Keep the Tiger stocked and priced ' +
          'fair, hire a doorman before the heat climbs, and if a fed ever waves you down on Route 9 — ' +
          'well, there\'s more than one road out of the north country."',
          [B.back('Good to know.', null)]),
      },
      {
        label: 'How do I make extra money around here?',
        next: () => say('Enzo Moretti',
          '"The Tiger pays every night it\'s open and wet — that\'s the real engine. Crates are for sale ' +
          'at Pier 7 if you show up with the truck and cash. Frankie in the alley by the tenements always ' +
          'has an angle. Charlie at the union hall can use a strong back. And do right by the neighborhood — ' +
          'full pews and warm suppers buy more silence than dollars do."',
          [B.back('Got it.', null)]),
      },
      { label: 'See you around.' },
    ];
    return root;
  };

  /* ---------- Sal — the boss (reached through the HQ door) ---------- */
  B.dialogues.sal = function () {
    const s = st();
    const root = say('Salvatore Moretti', '', []);
    const next = B.nextStory();

    /* mission handout / progress lines */
    if (B.missionActive('welcome')) {
      root.text = '"So you\'re Enzo\'s cousin. Good hands, he says. We\'ll see.\n\n' +
        'This is an importing business. What we import, the Eighteenth Amendment made ' +
        'interesting. You\'ll run the truck, and you\'ll help run the Tiger — the little ' +
        'social club behind the Café Roma. Do both well and you\'ll matter. Do them badly ' +
        'and you\'ll be back on the docks.\n\nFirst lesson tomorrow. Actually — no. Now."';
      root.options = [{
        label: 'I\'m ready to work.',
        effect: () => { s.flags.metSal = true; B.addCash(20); },
      }];
      return root;
    }

    if (!B.missionActive() && next) {
      const handouts = {
        firstrun: ['"The truck\'s parked out front on the avenue. Take it to Pier 7 — Charlie\'s crew set aside ' +
          'four cases of the good Canadian. Bring them to the alley door behind the Café Roma. ' +
          'Don\'t dawdle near the prowl car, don\'t open the crates, don\'t get pinched."',
          'Take the first run to Pier 7.'],
        openingnight: ['"Cellar\'s wet, so let\'s pour. Go to the Tiger — front door of the Roma, tell them ' +
          '\'swordfish.\' Set a fair price and keep her open tonight. I want a full room and a fuller till by 3 AM."',
          'Open the Tiger tonight.'],
        beatcop: ['"Officer Brady walks the downtown beat like a clock with a badge. A clock you can wind. ' +
          'Find him on his rounds and put him on the payroll — forty ought to do it, or sweet talk if ' +
          'you\'ve made a name. A friendly beat makes for quiet deliveries."',
          'Put Officer Brady on the payroll.'],
        canadian: ['"Big order came down. Eight cases of Montreal rye sitting in the border warehouse up Route 9. ' +
          'Go at night. Watch yourself on the highway — the Bureau put a checkpoint past the tree line. ' +
          'Bribe them, fool them, or find another road. Farm folk know the back ways, if you\'ve made friends."',
          'Run the Canadian shipment down Route 9.'],
        highplaces: ['"Judge Hargrove signs the warrants that padlock joints like ours. I\'d rather he signed ' +
          'golf scorecards. Whitaker at the Herald collects dirt like other men collect stamps — get me ' +
          'something with the judge\'s name on it, then go introduce yourself at City Hall."',
          'Get leverage on Judge Hargrove.'],
        rivals: ['"We got a problem. O\'Banion\'s crew grabbed our truck off Fifth with a delivery still in it. ' +
          'It\'s sitting behind his garage on the north side. Get it back. Talk if talking works — Deacon ' +
          'understands arithmetic — but come home with the truck either way."',
          'Recover the truck from O\'Banion\'s garage.'],
        bignight: ['"Now the big table. Alderman Kessler\'s people want somewhere discreet to celebrate the ' +
          'primary. That somewhere is the Tiger, tomorrow night. I want ten cases in the cellar, music, and ' +
          'not a whisper of heat — under thirty, capisce? Come tell me when the house is ready, and we\'ll ' +
          'send word to His Honor\'s boys."',
          'Prepare the Tiger for the Alderman\'s party.'],
      };
      const h = handouts[next];
      root.text = h[0];
      root.options = [
        { label: 'Consider it done.', effect: () => B.startMission(next) },
        { label: 'I need a minute first.' },
      ];
      return root;
    }

    if (B.missionActive('bignight')) {
      const ready = s.speakeasy.stock >= 8 && s.speakeasy.musician && s.heat < 30;
      root.text = ready
        ? '"Cellar\'s full, Feeney\'s warming up, and the precinct\'s bored. That\'s what I like to hear. ' +
          'Say the word and the Alderman\'s people come tonight."'
        : '"Not yet. I need ten cases — eight at the least — music on the floor, and the heat under thirty. ' +
          'Come back when the house is ready."';
      root.options = ready
        ? [{ label: 'Send word. We\'re ready tonight.', effect: () => { s.flags.partyNight = true; B.toast('Tonight\'s the night. Be open, be stocked, be calm.'); } },
           { label: 'One more day.' }]
        : [{ label: 'I\'m on it.' }];
      // fall through to common options below
    } else if (B.missionActive()) {
      root.text = '"You\'ve got a job. Why are you standing in my office?"';
      root.options = [{ label: 'Just leaving.' }];
    } else {
      root.text = s.perks.made
        ? '"My capo. The Tiger\'s the best room in the city and the trucks run like the New York Central. ' +
          'Keep the cellar wet and the heat cold. The rest of this town will come to us."'
        : '"Keep the shelves stocked and your nose clean, kid."';
      root.options = [];
    }

    root.options.push(
      {
        label: 'I could use a bed. (Sleep until evening)',
        cond: () => B.hour() >= 5 && B.hour() < 18,
        effect: () => { B.sleepUntil(20); B.toast('You sleep in the back room. It\'s 8 PM.'); },
      },
      {
        label: 'Long night. (Sleep until morning)',
        cond: () => B.hour() >= 18 || B.hour() < 5,
        effect: () => { B.sleepUntil(8); B.toast('You sleep like the dead. It\'s 8 AM.'); },
      },
      { label: 'That\'s all, boss.' },
    );
    return root;
  };

  /* ---------- Officer Brady ---------- */
  B.dialogues.brady = function () {
    const s = st();
    if (s.flags.bradyPaid) {
      return say('Officer Brady',
        '"Lovely evening for a drive, wouldn\'t you say? I never see a thing on Tuesdays. ' +
        'Or most days, come to it."',
        [
          {
            label: () => 'Slip him a little extra to cool things down. ($25, −10 heat)',
            cond: () => s.heat > 5 && s.day > (s.flags.bradyExtraDay || 0),
            effect: () => { if (B.pay(25)) { B.addHeat(-10); s.flags.bradyExtraDay = s.day + 2; } },
          },
          { label: 'Stay warm out here, Officer.' },
        ]);
    }
    return say('Officer Brady',
      '"Move along, citizen. Unless..." He looks you up and down. "You\'re one of Moretti\'s new ' +
      'boys, aren\'t you? Bold, walking up to a man of the law."',
      [
        {
          label: 'The outfit would like you to have a little something each week. ($40)',
          cond: () => B.missionActive('beatcop'),
          effect: () => {
            if (B.pay(40)) {
              s.flags.bradyPaid = true;
              B.addRep(4);
              B.openDialogue(say('Officer Brady',
                '"Well now." The bills vanish into a glove. "A man\'s got a family to feed, and the city ' +
                'pays in nickels and sermons. Tell Sal his trucks have never looked so law-abiding."'));
            }
          },
        },
        {
          label: 'People say Moretti takes care of his friends. All his friends. (Persuade — needs REP 12)',
          cond: () => B.missionActive('beatcop') && !s.flags.bradyPaid,
          effect: () => {
            if (s.rep >= 12) {
              s.flags.bradyPaid = true;
              B.openDialogue(say('Officer Brady',
                '"Aye, I\'ve heard your name around. Fine. First month\'s a courtesy — after that, ' +
                'the envelope finds me every payday, understood?"'));
            } else {
              B.addHeat(3);
              B.openDialogue(say('Officer Brady',
                '"I don\'t know you from Adam, son. Come back when your name means something — ' +
                'or your wallet does." He taps his nightstick, unfriendly-like.'));
            }
          },
        },
        { label: 'Just admiring the uniform, Officer.' },
      ]);
  };

  /* ---------- Rosa DeLuca — jazz singer ---------- */
  B.dialogues.rosa = function () {
    const s = st();
    if (s.flags.rosaSings) {
      return say('Rosa DeLuca',
        '"The Tiger\'s the only room in town where I sing what I like. Don\'t let them close us, hm?"');
    }
    if (s.side.rosa === 1) {
      return say('Rosa DeLuca', '"Stay close, would you? The alley behind the Roma, and no detours."');
    }
    return say('Rosa DeLuca',
      '"I sing at the Ambassador — tea-dance numbers, all very lawful, all very dull. I hear there\'s ' +
      'a room behind the Café Roma where a girl could sing something with blood in it."',
      [
        {
          label: 'Sing for us. I\'ll walk you there myself, tonight.',
          cond: () => s.speakeasy.known && (B.hour() >= 18 || B.hour() < 3) && !s.side.rosa,
          effect: () => {
            s.side.rosa = 1;
            const rosa = B.npcById('rosa');
            rosa.follow = true; rosa.wanderFrom = null; rosa.leash = 99;
            B.toast('Escort Rosa to the alley door of the Café Roma.');
          },
        },
        {
          label: 'Come by after dark. I\'ll walk you over — the streets aren\'t kind at night.',
          cond: () => s.speakeasy.known && !(B.hour() >= 18 || B.hour() < 3) && !s.side.rosa,
          next: () => say('Rosa DeLuca', '"After dark, then. Find me here."'),
        },
        { label: 'Maybe someday, Miss DeLuca.' },
      ]);
  };

  /* ---------- Mickey the cab driver ---------- */
  B.dialogues.mickey = function () {
    const s = st();
    return say('Mickey the Hack',
      '"Cab, mister? No? Then you\'re here for what every wise fella\'s here for — what Mickey knows. ' +
      'And Mickey knows where every flatfoot in this precinct eats his lunch."',
      [
        {
          label: 'Sell me the routes. ($30 — police appear on your map)',
          cond: () => !s.perks.patrolMap,
          effect: () => {
            if (B.pay(30)) {
              s.perks.patrolMap = true;
              B.toast('Mickey\'s knowledge: patrols now show on your map.', 'money');
            }
          },
        },
        {
          label: () => 'What\'s the word tonight, Mickey? ($' + B.TUNE.rumors.mickeyPrice + ' — the straight dope)',
          effect: () => {
            if (!B.pay(B.TUNE.rumors.mickeyPrice)) return;
            const C = B.TUNE.clocks;
            const lines = [];
            lines.push(s.clocks.fed >= C.fedMax || s.flags.fedSweep
              ? 'The Bureau sweeps the east side TONIGHT. Go dark or go home.'
              : s.clocks.fed >= C.fedWarnAt
                ? 'Bureau men are in town and filing paper. Keep the heat down or they\'ll come with axes in ' + (C.fedMax - s.clocks.fed) + ' hot day' + (C.fedMax - s.clocks.fed === 1 ? '' : 's') + '.'
                : 'The feds are dozing. For now.');
            lines.push((s.clocks.obanion >= C.obanionHijackAt && !s.flags.truce && !s.completed.includes('rivals'))
              ? 'O\'Banion crews are jumping east-side wagons at night. Until that\'s settled, count your crates twice.'
              : (s.clocks.obanion >= C.obanionWarnAt && !s.flags.truce && !s.completed.includes('rivals'))
                ? 'North-side scouts have been mapping your delivery routes. Trouble\'s coming if nobody answers it.'
                : 'The north side is quiet.');
            if (s.speakeasy.openForBusiness) lines.push('Tonight\'s raid odds at the Tiger, the way Mickey figures it: about ' + B.raidChance().toFixed(0) + ' in a hundred.');
            if (s.flags.picketTonight) lines.push('And the Temperance League pickets your alley tonight. Half your crowd will balk.');
            lines.push('The Route 9 checkpoint never moves, whatever the barflies tell you. The farm track east of it does not appear on Bureau maps.');
            B.openDialogue(say('Mickey the Hack', '"' + lines.join(' ') + '"', [{ label: 'Worth every nickel, Mickey.' }]));
          },
        },
        {
          label: 'Anything else worth knowing?',
          next: () => say('Mickey the Hack',
            '"Route 9\'s got a Bureau checkpoint past the tree line — has since spring. But the Hollis ' +
            'farm track runs down the east side of the valley, and no fed\'s ever been curious about ' +
            'turnips. You didn\'t hear it from me."',
            [{ label: 'Noted.', effect: () => { s.flags.knowTrack = true; } }]),
        },
        { label: 'Keep the meter running, Mickey.' },
      ]);
  };

  /* ---------- Walt Whitaker — reporter ---------- */
  B.dialogues.walt = function () {
    const s = st();
    if (s.side.walt === 'done' && !s.flags.dossier && B.missionActive('highplaces')) {
      return say('Walt Whitaker',
        '"For the fella who handed me the O\'Banion story? On the house." He passes you a fat envelope. ' +
        '"Hargrove, the Shoreline Trust, and a parcel of harbor land the city bought at four times its worth. ' +
        'Careful — paper like that burns fingers."',
        [{ label: 'The Herald\'s a fine paper, Walt.', effect: () => { s.flags.dossier = true; B.toast('You have the dossier on Judge Hargrove.'); } }]);
    }
    if (B.missionActive('highplaces') && !s.flags.dossier) {
      return say('Walt Whitaker',
        '"Hargrove? Sure, I keep a file. Every reporter in town keeps a file on Hargrove. Question is ' +
        'what a man gets for opening it. I like money. I like stories more."',
        [
          { label: 'Eighty dollars says you like money best. ($80)', effect: () => { if (B.pay(80)) { s.flags.dossier = true; B.toast('You have the dossier on Judge Hargrove.'); } } },
          {
            label: 'What kind of story?',
            cond: () => !s.side.walt,
            next: () => waltStoryNode(),
          },
          { label: 'I\'ll think it over.' },
        ]);
    }
    if (s.side.walt === 1) {
      return say('Walt Whitaker', '"O\'Banion\'s garage, after ten. Eyes open, notebook closed. Bring me something I can print."');
    }
    if (s.side.walt === 2) {
      return say('Walt Whitaker', '"Well? What did you see out there?"',
        [{
          label: 'Beer barrels by the dozen, loaded after midnight. No mechanics in sight.',
          effect: () => {
            s.side.walt = 'done';
            st().allies.walt = true;
            B.addCommunity(2);
            B.openDialogue(say('Walt Whitaker',
              '"\'MIDNIGHT MECHANICS.\' Page one, above the fold. You\'ve got ink in your veins, friend — ' +
              'and a friend at the Herald. Whatever you need from the morgue files, ask."'));
          },
        }]);
    }
    if (!s.side.walt) {
      return say('Walt Whitaker',
        '"Whitaker, Herald-Tribune. Crime desk, which in this town is the only desk. ' +
        'Buy a paper — or better, make some news."',
        [
          { label: 'What kind of news?', next: () => waltStoryNode() },
          { label: 'Just passing, Mr. Whitaker.' },
        ]);
    }
    return say('Walt Whitaker', '"Read the Herald. Half of it\'s even true."');

    function waltStoryNode() {
      return say('Walt Whitaker',
        '"The O\'Banion mob runs beer through that \'garage\' on the north side and half the city knows it, ' +
        'but knowing ain\'t witnessing. Get eyes on the place after ten some night. Come tell me what loads ' +
        'up when honest men are asleep."',
        [
          { label: 'I\'ll take a walk up north some night.', effect: () => { s.side.walt = 1; B.toast('New lead: watch O\'Banion\'s garage after 10 PM.'); } },
          { label: 'Spying on O\'Banion sounds like a short career.' },
        ]);
    }
  };

  /* ---------- Father Callahan ---------- */
  B.dialogues.callahan = function () {
    const s = st();
    const root = say('Fr. Callahan',
      s.allies.callahan
        ? '"Ah, our benefactor. The roof no longer leaks on the choir, thanks be to God and — well. Thanks be."'
        : '"Good day, my son. St. Michael\'s keeps her doors open to everyone in the parish — dockmen, ' +
          'widows, even young men in nice suits who drive quickly."',
      []);
    root.options = [
      {
        label: 'The parish should have wine for the sacrament. Take a case — call it Communion supply. (1 truck crate nearby)',
        cond: () => !s.allies.callahan && st().truck.crates > 0 && B.truckNear(29, 84),
        effect: () => {
          st().truck.crates--;
          s.allies.callahan = true;
          B.addCommunity(4);
          B.addHeat(-5);
          B.openDialogue(say('Fr. Callahan',
            '"Sacramental use is, I\'m told, entirely legal." A dry smile. "The Church remembers her friends. ' +
            'Come by when your conscience is heavy — the confessional is always open to you."'));
        },
      },
      {
        label: 'How\'s the parish holding up?',
        next: () => say('Fr. Callahan',
          '"Thin collections, full pews. The Kowalski widow can\'t make rent again, and half the men on this ' +
          'block owe wages to a boss who owes them right back. Look after your neighbors, son. God counts that ' +
          'ledger too."',
          [B.back('I\'ll keep it in mind, Father.', null)]),
      },
      { label: 'Good day, Father.' },
    ];
    return root;
  };

  /* ---------- Doc Lombardi — pharmacist ---------- */
  B.dialogues.lombardi = function () {
    const s = st();
    if (s.side.lombardi === 'done') {
      return say('Doc Lombardi',
        '"My \'prescriptions\' are the toast of three neighborhoods. Whiskey cures more when the paperwork\'s ' +
        'in order — and paperwork, my friend, is my gift to you."');
    }
    if (s.side.lombardi === 1) {
      return say('Doc Lombardi', '"Three cases, at my back step, in the truck. Medicine waits for no man."');
    }
    return say('Doc Lombardi',
      '"You know the beautiful thing about the Volstead Act? Section 6. Whiskey by prescription — perfectly ' +
      'legal, chronically undersupplied. I have the pads, the licenses, and a waiting room full of the ' +
      'suddenly ill. What I lack is inventory."',
      [
        {
          label: 'Three cases, delivered quiet. And we\'re partners?',
          effect: () => { s.side.lombardi = 1; B.toast('Deliver 3 crates (in the truck) to Lombardi\'s Pharmacy.'); },
        },
        { label: 'I\'ll stick to my own racket, Doc.' },
      ]);
  };

  /* ---------- Mrs. Kowalski ---------- */
  B.dialogues.mrsk = function () {
    const s = st();
    if (s.flags.mrsKAlly) {
      return say('Mrs. Kowalski',
        '"My boys watch this whole street from the windows, you know. A prowl car so much as slows down ' +
        'near your café, you\'ll hear of it before the driver does."');
    }
    return say('Mrs. Kowalski',
      '"Rent day Friday and Mr. Grieves raised it again — third time since my Stanislaw passed. Eleven ' +
      'years at the ropewalk, that man gave this city, and it can\'t leave his widow a roof."',
      [
        {
          label: 'The rent\'s handled, Mrs. Kowalski. All of it. ($50)',
          effect: () => {
            if (B.pay(50)) {
              s.flags.mrsKAlly = true;
              B.addCommunity(8);
              B.openDialogue(say('Mrs. Kowalski',
                '"You— oh, sit down, let me look at you. Your mother raised you right, whoever she is. ' +
                'This street doesn\'t forget, young man. We see everything from these windows — and now ' +
                'we see it for you."'));
            }
          },
        },
        {
          label: 'Maybe Mr. Grieves needs a talking-to about arithmetic. (Persuade — needs REP 10)',
          effect: () => {
            if (s.rep >= 10) {
              s.flags.mrsKAlly = true;
              B.addCommunity(6);
              B.addHeat(3);
              B.openDialogue(say('Mrs. Kowalski',
                '"Grieves came by white as a boiled sheet and said the rent\'s \'corrected.\' I won\'t ask. ' +
                'The saints won\'t ask either. You\'re a good boy — and these windows of mine see everything ' +
                'on this street, understand? Everything. Now they see it for you."'));
            } else {
              B.openDialogue(say('Mrs. Kowalski',
                '"Grieves laughed you off, didn\'t he. He only fears men with names. Come back when yours ' +
                'carries, or bring fifty dollars — that carries too."'));
            }
          },
        },
        { label: 'Hard times, ma\'am. I\'m sorry.' },
      ]);
  };

  /* ---------- Charlie Doyle — dockworker ---------- */
  B.dialogues.charlie = function () {
    const s = st();
    const root = say('Charlie Doyle', '', []);
    if (s.side.charlie === 'done') {
      root.text = '"Union takes care of its friends. Your crates come off the pile first, and the tally man ' +
        'counts generous — eight dollars a case, for you."';
    } else if (s.side.charlie === 1) {
      root.text = '"Those two rats are still squatting on the far pier with our crate. South pier, after your ' +
        'own business is done. Mind the knuckles on the big one."';
    } else {
      root.text = '"Moretti\'s new man, eh? Docks know everything, friend. Right now they know two freelance ' +
        'rats lifted a union crate off the manifest and are sitting on the south pier like they own it. ' +
        'Bad for order. Bad for everybody\'s arrangement."';
      root.options.push({
        label: 'I\'ll go remind them whose pier it is.',
        effect: () => {
          s.side.charlie = 1;
          ['rat1', 'rat2'].forEach(id => { const n = B.npcById(id); n.hidden = false; n.hostile = true; });
          B.toast('Deal with the pier rats on the south pier. (Space to swing)');
        },
      });
    }
    root.options.push(
      {
        label: 'Any work going tonight? (Night shift: +$12, a little heat)',
        cond: () => B.isNight() && s.day > (s.flags.nightShiftDay || 0),
        effect: () => {
          s.flags.nightShiftDay = s.day;
          B.state.minutes += 120;
          B.addCash(12);
          B.addHeat(1);
          B.toast('Two hours hauling unmarked crates. No questions asked, none answered.');
        },
      },
      { label: 'Solidarity, Charlie.' },
    );
    return root;
  };

  /* ---------- Vivian Ashworth — socialite ---------- */
  B.dialogues.vivian = function () {
    const s = st();
    if (s.side.vivian === 'done') {
      return say('Vivian Ashworth',
        '"Darling. My set has decided your little Tiger is the only endurable room in this city. ' +
        'Do keep it that way — we\'re dreadful when bored."');
    }
    if (s.side.vivian === 2) {
      return say('Vivian Ashworth',
        '"The champagne arrived and the party was a triumph — the Van Pelt girl danced on the Bechstein. ' +
        'You have taste, for a criminal."',
        [{
          label: 'The Tiger keeps a table for you and your friends, Miss Ashworth.',
          effect: () => {
            s.side.vivian = 'done';
            s.speakeasy.premium = true;
            B.addCash(60);
            B.addCommunity(3);
            B.toast('The society crowd now drinks at the Tiger. (Patrons up)', 'money');
          },
        }]);
    }
    if (s.side.vivian === 1) {
      return say('Vivian Ashworth', '"Two cases of champagne, the Ambassador\'s service entrance, before the party. Chop chop."');
    }
    return say('Vivian Ashworth',
      '"You\'re Moretti\'s new runner — oh, don\'t look shocked, everyone amusing is a criminal now. ' +
      'I\'m giving a party Saturday and the caterer has developed morals. I require champagne. ' +
      'Real champagne, not that Jersey vinegar."',
      [
        {
          label: 'Two cases of the real thing, delivered to the hotel. Done.',
          effect: () => { s.side.vivian = 1; B.toast('Get 2 champagne crates (Frankie sells them) and deliver to the Grand Hotel by truck.'); },
        },
        { label: 'I\'m in whiskey, not bubbles, ma\'am.' },
      ]);
  };

  /* ---------- Judge Hargrove ---------- */
  B.dialogues.judge = function () {
    const s = st();
    if (s.flags.judgeAlly) {
      return say('Judge Hargrove',
        '"I recall no prior acquaintance, young man." He does not meet your eye. "Warrants against ' +
        'establishments on the, ah, eastern blocks do seem to founder on procedure lately."',
        [
          {
            label: 'The monthly consideration, Your Honor. ($60, −20 heat)',
            cond: () => s.day >= (s.payoffDay || 0) + 7 && s.heat > 0,
            effect: () => { if (B.pay(60)) { B.addHeat(-20); s.payoffDay = s.day; } },
          },
          { label: 'Nothing at all, Your Honor.' },
        ]);
    }
    if (B.missionActive('highplaces') && s.flags.dossier) {
      return say('Judge Hargrove',
        '"Do I know you?" His clerk hovers. You mention, idly, the Shoreline Trust — and the harbor parcel. ' +
        'The clerk is dismissed. "...Speak carefully, young man. What is it you people want?"',
        [{
          label: 'Nothing but your disinterest, Your Honor. Warrants get lost. Papers stay lost. Everyone golfs on Sunday.',
          effect: () => {
            s.flags.judgeAlly = true;
            B.openDialogue(say('Judge Hargrove',
              '"...The bench has always believed in judicial restraint." He straightens his robe with great ' +
              'dignity for a man who has just been purchased. "Good day. Do not visit my chambers again."'));
          },
        }]);
    }
    return say('Judge Hargrove',
      '"The docket is full and the city is drowning in vice, young man. If you\'ve business with the court, ' +
      'see the clerk. If not — good day."');
  };

  /* ---------- Deacon O'Banion ---------- */
  B.dialogues.deacon = function () {
    const s = st();
    if (s.flags.truce) {
      return say('Deacon O\'Banion',
        '"North side\'s ours, east side\'s yours, and the river keeps her own counsel. A tidy arrangement. ' +
        'Give my regards to Salvatore — from a respectful distance."');
    }
    if (B.missionActive('rivals') && !s.flags.truckBack) {
      return say('Deacon O\'Banion',
        '"Well, well. Moretti sends a boy for his lost truck." He wipes his hands on a rag that\'s never ' +
        'touched an engine. "It\'s parked out back, safe as church. Consider it... impounded. North side ' +
        'tolls, you understand."',
        [
          {
            label: 'Sal proposes arithmetic: $120, the truck, and a border at the park. Everyone earns. ($120)',
            effect: () => {
              if (B.pay(120)) {
                s.flags.truce = true;
                B.returnTruck();
                B.openDialogue(say('Deacon O\'Banion',
                  '"Now that\'s a man who can count." He tosses you the crank handle. "A border at the park, ' +
                  'then. Mind you stay your side of it — sentiment\'s bad for business."'));
              }
            },
          },
          {
            label: 'The Herald\'s crime desk has a story about midnight barrels at a certain garage. $60 buys my truck AND their silence. ($60)',
            cond: () => st().allies.walt || st().side.walt === 2 || st().side.walt === 'done',
            effect: () => {
              if (B.pay(60)) {
                st().flags.truce = true;
                B.returnTruck();
                B.openDialogue(say('Deacon O\'Banion',
                  'His jaw works for a moment. "Whitaker\'s a rat and you\'re the rat\'s friend. Fine — sixty, ' +
                  'the truck, and a border at the park. But hear me: ink dries. Memories don\'t." He tosses you ' +
                  'the crank handle with more force than strictly necessary.'));
              }
            },
          },
          {
            label: 'Count our crews, Deacon. Then count yours. The truck rolls home free. (Needs REP 20)',
            cond: () => st().rep >= 20,
            effect: () => {
              st().flags.truce = true;
              B.returnTruck();
              B.addRep(3);
              B.openDialogue(say('Deacon O\'Banion',
                'He looks past you, out the window, doing the arithmetic he\'s famous for. It doesn\'t favor him. ' +
                '"...The park, then. Border at the park." A muscle ticks in his cheek. "Tell Moretti the north ' +
                'side remembers manners, even when the east side has none."'));
            },
          },
          {
            label: 'The toll\'s waived. Collect your boys from the pavement after.',
            effect: () => {
              ['lefty', 'knuckles'].forEach(id => { const n = B.npcById(id); n.hidden = false; n.hostile = true; });
              B.addHeat(4);
              B.openDialogue(say('Deacon O\'Banion',
                '"Hard way it is." He steps back into the office and shuts the door. Lefty and Knuckles ' +
                'come off the fenders, rolling their shoulders.'));
            },
          },
          { label: 'I\'ll return with an answer.' },
        ]);
    }
    return say('Deacon O\'Banion',
      '"You\'re east-side. This is the north side. Geography\'s a simple science — walk it off, sonny."');
  };

  /* ---------- Sister Prudence — temperance ---------- */
  B.dialogues.prudence = function () {
    const s = st();
    if (s.flags.prudencePlacated) {
      return say('Sister Prudence',
        '"The Mercy Mission fed forty families this week, thanks to certain anonymous donations. ' +
        'The Lord works through crooked timber, Mr. — whoever you are. See that He keeps working."');
    }
    return say('Sister Prudence',
      '"DEMON RUM!" She fixes you with a glare that could strip paint. "I know your kind, sir — soft hands, ' +
      'quick car, the devil\'s deliveryman! This league marches until every den in this ward is a reading room!"',
      [
        {
          label: 'The Mercy Mission does fine work, Sister. Perhaps it needs a benefactor. ($25)',
          effect: () => {
            if (B.pay(25)) {
              s.flags.prudencePlacated = true;
              s.flags.picketTonight = false;
              B.addCommunity(5);
              B.openDialogue(say('Sister Prudence',
                '"...Forty families eat on twenty-five dollars." The glare wavers into something complicated. ' +
                '"I shall pray for your soul with particular energy. And perhaps... march on the west ward ' +
                'a while, where the need is greater."'));
            }
          },
        },
        {
          label: 'Reading rooms don\'t tip, Sister.',
          effect: () => {
            B.addCommunity(-3);
            B.openDialogue(say('Sister Prudence',
              '"MOCKERY! Note him well, ladies — note his face!" You have made an energetic enemy. ' +
              'Expect the league outside your establishment.'));
          },
        },
        { label: 'Ma\'am. (Tip your hat and retreat)' },
      ]);
  };

  /* ---------- Farmer Hollis ---------- */
  B.dialogues.hollis = function () {
    const s = st();
    if (s.perks.still) {
      return say('Farmer Hollis',
        '"Corn\'s coming in beautiful. The other corn, too." He nods at the barn. "Crates are six dollars ' +
        'when you come by with the truck — barn door, four a day, and nobody up here counts."');
    }
    return say('Farmer Hollis',
      '"City fella. Lost?" He leans on the fence. "Or shopping? Because a man with a copper kettle, good corn, ' +
      'and a hundred dollars of pipe could supply a thirsty city his whole life, checkpoint or no checkpoint. ' +
      'I\'ve got the kettle and the corn."',
      [
        {
          label: 'A hundred dollars for the pipe, and we\'re partners. ($100)',
          effect: () => {
            if (B.pay(100)) {
              s.perks.still = true;
              B.toast('Hollis\'s still is running: cheap crates at the farm, 4/day.', 'money');
            }
          },
        },
        {
          label: 'How do you get anything past the Route 9 checkpoint?',
          next: () => say('Farmer Hollis',
            '"Checkpoint\'s on the highway. My track down the east side ain\'t on any map the Bureau reads — ' +
            'runs from my gate straight down to the city road. Turnip wagons only, far as they know."',
            [{ label: 'Turnip wagons. Got it.', effect: () => { s.flags.knowTrack = true; } }]),
        },
        { label: 'Just admiring the country air.' },
      ]);
  };

  /* ---------- Frankie the Fence ---------- */
  B.dialogues.frankie = function () {
    const s = st();
    const root = say('Frankie the Fence',
      '"Frankie buys, Frankie sells, Frankie forgets — that last one\'s free. What are we doing today?"', []);
    root.options = [
      {
        label: () => 'Buy a crate of whiskey, no questions. ($14 — into the truck)',
        cond: () => B.truckNear(14.5, 65.5, 6) && st().truck.crates + st().truck.champagne < st().truck.cap,
        effect: () => {
          if (B.pay(B.TUNE.economy.crateFence)) { st().truck.crates++; B.toast('A crate goes in the truck. Frankie forgets it existed.'); }
          B.openDialogue(B.dialogues.frankie());
        },
      },
      {
        label: () => 'Buy champagne — the real French. ($20 — into the truck)',
        cond: () => B.truckNear(14.5, 65.5, 6) && st().truck.crates + st().truck.champagne < st().truck.cap,
        effect: () => {
          if (B.pay(B.TUNE.economy.champagne)) { st().truck.champagne++; B.toast('Genuine Reims, says the label. The label may be lying.'); }
          B.openDialogue(B.dialogues.frankie());
        },
      },
      {
        label: () => 'Sell a whiskey crate from the truck. (+$9)',
        cond: () => B.truckNear(14.5, 65.5, 6) && st().truck.crates > 0,
        effect: () => {
          st().truck.crates--; B.addCash(B.TUNE.economy.fenceBuysAt);
          B.openDialogue(B.dialogues.frankie());
        },
      },
      {
        label: 'Got any work?',
        cond: () => !s.flags.hotGoods && s.day > (s.flags.hotGoodsDay || 0),
        next: () => say('Frankie the Fence',
          '"Matter of fact. A parcel needs to reach the Grand Hotel\'s service desk — watches, if anyone asks. ' +
          'Nobody will ask. Forty dollars on delivery, and Frankie\'s undying forgetfulness."',
          [
            { label: 'Give me the parcel.', effect: () => { s.flags.hotGoods = true; B.toast('Deliver Frankie\'s parcel to the Grand Hotel door.'); } },
            { label: 'Too warm for me, Frankie.' },
          ]),
      },
      { label: 'Later, Frankie.' },
    ];
    return root;
  };

  /* ---------- generic pedestrians ---------- */

  /* Tier-1 information: free, plentiful, and right about 3 times in 5.
   * Each rumor states a fact about the live world — or its opposite. */
  B.streetRumor = function () {
    const s = st();
    const truthful = Math.random() < B.TUNE.rumors.streetAccuracy;
    const facts = [
      {
        t: () => s.clocks.fed >= B.TUNE.clocks.fedWarnAt,
        yes: '"Federal men in town, I heard. Gray suits at the precinct all week."',
        no: '"The Bureau\'s pulled back east, they say. Too busy with New York to mind us."',
      },
      {
        t: () => s.clocks.obanion >= B.TUNE.clocks.obanionWarnAt && !s.flags.truce && !s.completed.includes('rivals'),
        yes: '"North-side toughs have been eyeing the east blocks. Counting trucks, my brother says."',
        no: '"O\'Banion\'s crowd keeps to their side of the park lately. Peaceful, almost."',
      },
      {
        t: () => s.heat >= 30,
        yes: '"Cops are thick as flies this week. Somebody\'s been sloppy."',
        no: '"Quietest week the precinct\'s had all year, my cousin the desk clerk says."',
      },
      {
        t: () => s.flags.picketTonight,
        yes: '"The Temperance League\'s marching on the east side tonight, banners and all."',
        no: '"Sister Prudence took her banners to the west ward this week."',
      },
      {
        t: () => true,   // the checkpoint is always there — but rumor may deny it
        yes: '"Don\'t drive Route 9 after dark, friend. The Bureau\'s got lanterns across the road past the tree line."',
        no: '"They say the Route 9 checkpoint packed up Tuesday. Highway\'s clear to the border."',
      },
    ];
    const f = facts[Math.floor(Math.random() * facts.length)];
    const isTrue = f.t();
    return truthful === isTrue ? f.yes : f.no;   // truthful report of a true fact, or a false denial, etc.
  };

  B.pedDialogue = function (n) {
    const line = n.lines[Math.floor(Math.random() * n.lines.length)];
    return say(n.name, line, [
      {
        label: 'Ask what\'s the word around town. (Street rumor — right 3 times in 5)',
        next: () => say(n.name, B.streetRumor(), [{ label: 'Much obliged.' }]),
      },
      { label: 'Tip your hat and move on.' },
    ]);
  };

  /* ================= doors / locations ================= */
  B.returnTruck = function () {
    st().truck.stolen = false;
    B.truck.x = 12.5; B.truck.y = 41.5;    // parked on the road outside the garage
    st().flags.truckBack = true;
    B.toast('The truck is yours again — parked on the avenue outside the garage.');
  };

  B.doorAction = function (id) {
    const s = st();
    switch (id) {

      case 'hq':
        return B.openDialogue(B.dialogues.sal());

      case 'cafe':
        if (!s.speakeasy.known) {
          return B.toast('A café. The coffee is thin and the tables mostly empty. Odd, the crowd it draws after dark.');
        }
        return B.openSpeakeasyPanel();

      case 'tigerback': {
        if (!s.speakeasy.known) return B.toast('A steel door in the alley. No handle, no sign. Someone inside is listening.');
        const load = s.truck.crates;
        if (load > 0 && B.truckNear(51, 63)) {
          s.speakeasy.stock += load;
          s.stats.cratesMoved += load;
          s.truck.crates = 0;
          B.toast(load + ' crate' + (load > 1 ? 's' : '') + ' down the cellar chute. Stock: ' + s.speakeasy.stock, 'money');
          B.emit('deliverTiger', load);
          return;
        }
        return B.openSpeakeasyPanel();
      }

      case 'pier7': {
        if (B.missionActive('firstrun') && !s.flags.m2loaded) {
          if (!B.truckNear(97, 67)) return B.toast('Charlie\'s crew wave you off — "Bring the truck around first, pal."');
          s.truck.crates = Math.min(s.truck.cap, s.truck.crates + 4);
          s.flags.m2loaded = true;
          B.emit('loadCargo');
          return B.toast('Four cases of Canadian, under a tarp of salted cod. Now: the alley behind the Café Roma.');
        }
        if (!s.speakeasy.known) return B.toast('Longshoremen eye you without warmth. You have no business here. Yet.');
        if (!B.truckNear(97, 67)) return B.toast('"No truck, no crates," the tally man shrugs.');
        if (s.truck.crates + s.truck.champagne >= s.truck.cap) return B.toast('The truck is full.');
        const price = s.perks.docksDiscount ? B.TUNE.economy.cratePierUnion : B.TUNE.economy.cratePier;
        if (!B.pay(price)) return;
        s.truck.crates++;
        B.emit('loadCargo');
        return B.toast('One crate aboard ($' + price + '). Truck: ' + (s.truck.crates + s.truck.champagne) + '/' + s.truck.cap);
      }

      case 'border': {
        if (B.missionActive('canadian') && !s.flags.m5delivered) {
          if (!B.isNight() && !B.isDusk()) return B.toast('The warehouse is shuttered. The Montreal men only work after dark.');
          if (!B.truckNear(54, 5, 4)) return B.toast('A voice through the boards: "No truck, no rye. Come back heavy."');
          if (s.truck.crates >= 8) return B.toast('The rye is already loaded. Get it to the Tiger.');
          s.truck.crates = 8;
          s.flags.m5loaded = true;
          B.emit('loadCargo');
          return B.toast('Eight cases of Montreal rye. The highway checkpoint is lit up to the south. Choose your road.');
        }
        if (s.perks.connection) {
          if (!B.isNight() && !B.isDusk()) return B.toast('Shuttered until dark.');
          if (!B.truckNear(54, 5, 4)) return B.toast('"Come back with the truck."');
          if (s.truck.crates + s.truck.champagne >= s.truck.cap) return B.toast('The truck is full.');
          if (!B.pay(B.TUNE.economy.crateBorder)) return;
          s.truck.crates++;
          return B.toast('Montreal\'s finest, $7 the case. Truck: ' + (s.truck.crates + s.truck.champagne) + '/' + s.truck.cap);
        }
        return B.toast('A border warehouse, officially full of shingles. Unofficially — not your business yet.');
      }

      case 'farm': {
        if (!s.perks.still) return B.toast('A tidy farm. Somewhere behind the barn, something is quietly boiling.');
        const today = s.flags.farmDay === s.day ? (s.flags.farmCount || 0) : 0;
        if (today >= 4) return B.toast('Hollis shakes his head — "Still\'s run dry till tomorrow."');
        if (!B.truckNear(89, 6, 4)) return B.toast('"Bring the truck up to the gate," Hollis calls.');
        if (s.truck.crates + s.truck.champagne >= s.truck.cap) return B.toast('The truck is full.');
        if (!B.pay(B.TUNE.economy.crateFarm)) return;
        s.flags.farmDay = s.day; s.flags.farmCount = today + 1;
        s.truck.crates++;
        return B.toast('Corn whiskey, barn-fresh ($6). ' + (3 - today) + ' more today.');
      }

      case 'church': {
        if (s.allies.callahan && s.heat > 0 && s.confessedDay !== s.day) {
          s.confessedDay = s.day;
          B.addHeat(-10);
          return B.toast('Twenty minutes in the confessional. Father Callahan suggests a rosary and a quieter month.');
        }
        return B.toast('Candles, incense, and the patient quiet of St. Michael\'s.');
      }

      case 'precinct':
        return B.openDialogue(say('Desk Sergeant',
          '"State your business." The desk sergeant doesn\'t look up. Behind him, a wall of wanted posters ' +
          'and one sad, confiscated still.',
          [
            {
              label: 'The Policemen\'s Benevolent Fund could use a donation. ($40 — might cool things down)',
              cond: () => s.heat >= 10,
              effect: () => {
                if (!B.pay(40)) return;
                if (Math.random() < 0.75) { B.addHeat(-15); B.toast('The sergeant\'s pen hovers, then moves to other paperwork.', 'money'); }
                else { B.addHeat(8); B.toast('"Attempted bribery of an officer." He writes it down. Wonderful.', 'bad'); }
              },
            },
            { label: 'Wrong building. My mistake.' },
          ]));

      case 'cityhall':
        return B.toast('Marble, echoes, and clerks. Judge Hargrove takes the air on the south steps most days.');

      case 'hotel': {
        if (s.flags.hotGoods) {
          s.flags.hotGoods = false;
          s.flags.hotGoodsDay = s.day + 2;
          B.addCash(40);
          B.addHeat(4);
          return B.toast('The service desk takes Frankie\'s parcel without a flicker. $40, no questions.');
        }
        if (s.side.vivian === 1 && s.truck.champagne >= 2 && B.truckNear(63, 37)) {
          s.truck.champagne -= 2;
          s.side.vivian = 2;
          B.emit('deliverChampagne');
          return B.toast('Two cases up the service lift. Find Miss Ashworth to collect.');
        }
        return B.toast('The Ambassador\'s lobby glitters. A porter materializes to ask, silently, whether you\'re lost.');
      }

      case 'pharmacy': {
        if (s.side.lombardi === 1 && s.truck.crates >= 3 && B.truckNear(44, 49)) {
          s.truck.crates -= 3;
          s.side.lombardi = 'done';
          s.allies.lombardi = true;
          B.addCash(50);
          B.addCommunity(3);
          B.addHeat(-5);
          return B.toast('Three cases become "medicinal stock." $50, and Lombardi\'s paperwork now shelters the Tiger.', 'money');
        }
        return B.toast('Cough syrups, liver pills, and a long line of citizens with prescriptions for "nerve tonic."');
      }

      case 'union':
        return B.toast('Roll calls and cigarette smoke. Charlie Doyle handles the outfit\'s business here.');

      case 'garage':
        return B.openDialogue(B.dialogues.deacon());

      case 'tenements':
        return B.toast('Laundry lines and cooking smells. Mrs. Kowalski holds court on the stoop.');
    }
  };
})();
