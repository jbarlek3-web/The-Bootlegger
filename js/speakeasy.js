'use strict';
/* The Bootlegger — The Blind Tiger: management panel + nightly settlement */

(function () {
  const T = () => B.TUNE.tiger;

  /* demand model: how many patrons show tonight */
  B.forecastPatrons = function () {
    const st = B.state, s = st.speakeasy;
    if (!s.openForBusiness || s.closedTonight || s.raidedDays > 0) return 0;
    const t = T();
    let base = t.basePatrons + st.rep * t.repDraw + Math.max(0, st.community) * t.communityDraw;
    if (s.musician) base += t.musicianDraw;
    if (st.flags.rosaSings) base += t.rosaDraw;
    if (s.premium) base += t.premiumDraw;
    if (st.perks.made) base *= 1.25;
    const priceFactor = Math.max(0.15, t.priceCurveBase - t.priceCurveSlope * s.price);
    let n = base * priceFactor;
    n -= st.heat * t.heatScare;
    if (st.flags.picketTonight) n *= 0.5;
    return Math.max(0, Math.round(n));
  };

  B.raidChance = function () {
    const st = B.state, s = st.speakeasy;
    if (!s.openForBusiness || s.closedTonight || s.raidedDays > 0 || s.stock <= 0) return 0;
    let c = T().raidBase + st.heat * T().raidPerHeat;
    if (s.doorman) c -= 3;
    if (st.flags.bradyPaid) c -= 3;
    if (st.flags.judgeAlly) c -= 5;
    if (st.allies.lombardi) c -= 2;             // "medicinal" paperwork
    if (st.flags.picketTonight) c += 4;         // Prudence brings attention
    return B.clamp(c, 0, 60);
  };

  /* runs once when the clock crosses 3:00 AM */
  B.settleNight = function () {
    const st = B.state, s = st.speakeasy;
    st.flags.partyResult = null;

    if (s.raidedDays > 0) { s.raidedDays--; s.lastNight = { note: 'Padlocked — repairs underway.' }; return; }
    if (!s.openForBusiness) return;

    /* the Bureau sweeps a dark room and finds nothing — going dark on the right night saves you */
    if (st.flags.fedSweep && (s.closedTonight || s.stock <= 0)) {
      st.flags.fedSweep = false;
      st.clocks.fed = B.TUNE.clocks.fedResetTo;
      st.heat = Math.max(0, st.heat - 10);
      s.closedTonight = false;
      s.lastNight = { note: 'Bureau agents kicked in the door of a dark, dry café and left with nothing but splinters.' };
      B.flash('THE SWEEP', 'Axes and flashlights, midnight sharp — and nothing to find but cold coffee and ' +
        'an insulted café owner.\n\nAgent Doyle files a report that reads like an apology. The Bureau\'s ' +
        'enthusiasm for the east side cools considerably.');
      return;
    }

    if (s.closedTonight) { s.lastNight = { note: 'You kept the doors dark tonight.' }; s.closedTonight = false; return; }
    if (s.stock <= 0) { s.lastNight = { note: 'Dry shelves. Dry till. Get a shipment in.' }; return; }

    /* O'Banion pressure: an unanswered north side bleeds your cellar */
    const C = B.TUNE.clocks;
    if (st.clocks.obanion >= C.obanionHijackAt && Math.random() < C.obanionHijackChance) {
      const lost = Math.max(1, Math.round(s.stock * 0.2));
      s.stock -= lost;
      B.toast('O\'Banion\'s boys jumped tonight\'s wagon — ' + lost + ' crate' + (lost > 1 ? 's' : '') + ' gone north. Settle it, or it keeps happening.', 'bad');
    }

    /* raid roll — a busted night earns nothing; a fed sweep doesn't roll, it just comes */
    const roll = st.flags.fedSweep ? -1 : Math.random() * 100;
    if (st.flags.fedSweep) { st.flags.fedSweep = false; st.clocks.fed = C.fedResetTo; }
    if (roll < B.raidChance() || roll < 0) {
      const lost = Math.ceil(s.stock / 2), fine = 100;
      s.stock -= lost;
      st.cash = Math.max(0, st.cash - fine);
      s.raidedDays = 1;
      st.heat = Math.max(0, st.heat - 25);
      s.lastNight = { raided: true, note: 'RAIDED — axes through the bar, ' + lost + ' crates seized, $' + fine + ' in fines.' };
      if (st.flags.mrsKAlly) B.toast('Mrs. Kowalski\'s warning got half the stock into the coal chute in time.', 'money');
      if (st.flags.mrsKAlly) s.stock += Math.floor(lost / 2);
      B.emit('raided');
      B.flash('RAID!', 'Whistles in the alley. Axes at the door.\n\nThe Tiger is padlocked for a night while Sal\'s lawyer works. ' +
        lost + ' crates poured into the gutter and $' + fine + ' in "fines" paid out.');
      return;
    }

    const t = T();
    let patrons = B.forecastPatrons();
    const drinksWanted = patrons * t.drinksPerPatron;
    const drinksAvail = s.stock * t.drinksPerCrate;
    const drinks = Math.min(drinksWanted, drinksAvail);
    patrons = Math.min(patrons, Math.ceil(drinks / t.drinksPerPatron));

    const gross = drinks * s.price;
    let wages = t.wageBartender;
    if (s.doorman) wages += t.wageDoorman;
    if (s.musician) wages += t.wageMusician;
    const cratesUsed = Math.ceil(drinks / t.drinksPerCrate);
    s.stock = Math.max(0, s.stock - cratesUsed);

    let net = gross - wages;
    if (st.perks.made) net = Math.round(net * t.madeManMargin);
    st.cash += Math.max(0, Math.round(net));
    s.lifetime += Math.max(0, Math.round(net));
    st.stats.nightsOpen++;

    // a busy night warms the neighborhood but draws whispers
    if (patrons >= 20) st.heat = B.clamp(st.heat + 2, 0, 100);
    if (st.flags.picketTonight) { st.flags.picketTonight = false; }

    s.lastNight = { patrons, drinks, gross: Math.round(gross), wages, cratesUsed, net: Math.round(net) };
    B.emit('nightSettled', s.lastNight);

    if (st.flags.partyNight) {
      st.flags.partyNight = false;
      const ok = patrons >= 12 && !s.lastNight.raided;
      st.flags.partyResult = ok ? 'success' : 'flop';
      B.emit('partyResolved', st.flags.partyResult);
    }

    B.toast('The Tiger: ' + patrons + ' patrons, net $' + Math.max(0, Math.round(net)) + ' — ledger in the panel.', 'money');
  };

  /* ---------- management panel ---------- */
  B.openSpeakeasyPanel = function () {
    const st = B.state, s = st.speakeasy;
    const ln = s.lastNight;
    const patrons = B.forecastPatrons();
    const raid = B.raidChance().toFixed(0);

    let ledger = '<span class="dim">No nights on the books yet.</span>';
    if (ln) {
      ledger = ln.note ? '<span class="dim">' + ln.note + '</span>' :
        `Patrons <b>${ln.patrons}</b> · Drinks <b>${ln.drinks}</b> · Gross <span class="good">$${ln.gross}</span>` +
        ` · Wages <span class="bad">$${ln.wages}</span> · Stock used <b>${ln.cratesUsed}</b> · Net <span class="good">$${ln.net}</span>`;
    }

    const staffRow = (key, label, wage, hired) =>
      `<tr><td>${label}</td><td class="dim">$${wage}/night</td>
       <td>${hired ? '<span class="good">on the payroll</span>' : '<button data-act="hire-' + key + '">Hire</button>'}</td></tr>`;

    B.openPanel('The Blind Tiger', `
      <img src="assets/sprites/jug.png" alt="" style="height:64px;float:right;margin:-6px 0 6px 12px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6))">
      <p class="dim">Behind the Café Roma. Password at the door is <i>"swordfish."</i></p>
      <h3>Cellar &amp; Bar</h3>
      <table>
        <tr><td>Stock</td><td><b>${s.stock}</b> crates <span class="dim">(20 drinks each — deliveries at the alley door)</span></td></tr>
        <tr><td>Price per drink</td><td><b>$${s.price.toFixed(2)}</b>
          <button data-act="price-down">−25¢</button><button data-act="price-up">+25¢</button></td></tr>
        <tr><td>Tonight</td><td>${s.raidedDays > 0 ? '<span class="bad">Padlocked (raid)</span>' :
          s.closedTonight ? '<span class="bad">Dark tonight</span> <button data-act="reopen">Open tonight</button>' :
          '<span class="good">Open 9 PM – 3 AM</span> <button data-act="close">Go dark tonight</button>'}</td></tr>
      </table>
      <h3>Staff</h3>
      <table>
        <tr><td>Tony (bartender)</td><td class="dim">$5/night</td><td><span class="good">on the payroll</span></td></tr>
        ${staffRow('doorman', 'Doorman ("Bricks" Bruno)', T().wageDoorman, s.doorman)}
        ${staffRow('musician', 'Piano man (Fats Feeney)', T().wageMusician, s.musician)}
        ${st.flags.rosaSings ? '<tr><td>Rosa DeLuca (voice)</td><td class="dim">sings for the room</td><td><span class="good">headlining</span></td></tr>' : ''}
      </table>
      <h3>Tonight's Outlook</h3>
      <table>
        <tr><td>Expected patrons</td><td><b>${patrons}</b></td></tr>
        <tr><td>Raid risk</td><td class="${raid > 15 ? 'bad' : 'dim'}">${raid}%</td></tr>
        ${s.premium ? '<tr><td>Clientele</td><td class="good">Society crowd (Vivian\'s friends)</td></tr>' : ''}
        ${st.flags.picketTonight ? '<tr><td class="bad">Sister Prudence pickets the alley tonight — half the crowd will balk.</td></tr>' : ''}
        ${st.flags.fedSweep ? '<tr><td class="bad">Word is the Bureau sweeps the east side TONIGHT. A dark room has nothing to seize.</td></tr>' : ''}
        ${st.clocks.obanion >= B.TUNE.clocks.obanionHijackAt ? '<tr><td class="bad">O\'Banion crews are hitting wagons — expect stock to bleed until the north side is settled.</td></tr>' : ''}
      </table>
      <h3>Last Night's Ledger</h3>
      <p>${ledger}</p>
      <p class="dim">Lifetime take: $${s.lifetime}</p>
    `, body => {
      body.querySelectorAll('button[data-act]').forEach(btn => btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'price-up') s.price = Math.min(3, s.price + 0.25);
        if (act === 'price-down') s.price = Math.max(0.25, s.price - 0.25);
        if (act === 'close') s.closedTonight = true;
        if (act === 'reopen') s.closedTonight = false;
        if (act === 'hire-doorman') { if (B.pay(15)) { s.doorman = true; B.toast('Bricks Bruno takes the door. Nobody argues with Bricks.'); } }
        if (act === 'hire-musician') { if (B.pay(20)) { s.musician = true; B.toast('Fats Feeney starts tonight. The room already feels warmer.'); } }
        B.emit('speakeasyChanged');
        B.openSpeakeasyPanel();       // re-render
      }));
    });
  };
})();
