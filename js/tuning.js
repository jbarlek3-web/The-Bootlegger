'use strict';
/* The Bootlegger — tunables.
 *
 * Every number that shapes game feel, economy, or pressure lives here, exposed
 * as one public object rather than buried in the systems that consume it.
 * Tweak, reload, replay — no other file needs to change.
 */

B.TUNE = {
  time: {
    minPerSec: 2,            // game minutes per real second
  },

  player: {
    walkSpeed: 4.6,          // tiles/sec
    truckSpeed: 9.5,
    truckOffroadFactor: 0.45,
    punchDamage: 26,
    punchCooldown: 0.45,
    punchRange: 1.25,
  },

  law: {
    copSight: 5,             // tiles — beat cop notices a loaded truck
    carSight: 6.5,           // tiles — the prowl car sees farther
    suspicionRateDay: 22,    // per second while watched
    suspicionRateNight: 14,  // darkness is a bootlegger's friend
    bradyFactor: 0.65,       // suspicion multiplier once Brady is paid
    communityShield: 0.005,  // per point of community: neighbors don't rat
    suspicionDecay: 18,
    pursuitTime: 22,         // seconds until the law gives up
    escapeDistance: 22,      // tiles — break line of sight this far and you're clear
    copChaseBoost: 1.5,
    carChaseBoost: 1.28,
    baseFine: 40,
    finePerCrate: 8,
  },

  economy: {
    cratePier: 10,           // wholesale at Pier 7
    cratePierUnion: 8,       // with the union tally man onside
    crateFence: 14,          // Frankie, no questions
    crateFarm: 6,            // Hollis's corn, 4/day
    crateBorder: 7,          // Montreal rye, after dark, post-pipeline
    champagne: 20,
    ryeShipment: 8,        // the Canadian Connection order — load and delivery must match
    fenceBuysAt: 9,          // what Frankie pays for a hot crate
    truckCapacity: 8,
  },

  tiger: {
    drinksPerCrate: 20,
    drinksPerPatron: 2,
    wageBartender: 5,
    wageDoorman: 4,
    wageMusician: 6,
    basePatrons: 8,
    repDraw: 0.35,           // patrons per point of outfit rep
    communityDraw: 0.45,     // the neighborhood fills the room
    musicianDraw: 7,
    rosaDraw: 6,
    premiumDraw: 8,
    heatScare: 0.12,         // patrons scared off per point of heat
    priceCurveBase: 1.55,    // demand = max(0.15, base - slope * price)
    priceCurveSlope: 0.42,
    madeManMargin: 1.2,
    raidBase: 2,             // % raid chance floor
    raidPerHeat: 0.45,
  },

  heat: {
    dailyDecay: 3,
    bradyBonusDecay: 2,
    confession: -10,
    deliverySeen: 8,
  },

  clocks: {
    /* Pressure timelines — the world moves if you don't. (Faction-clock pattern.) */
    obanionMax: 8,           // days until the north side owns your supply lines
    obanionWarnAt: 4,
    obanionHijackAt: 6,      // from here on, nightly hijack risk
    obanionHijackChance: 0.35,
    fedMax: 6,               // sustained heat summons the Bureau
    fedWarnAt: 4,
    fedHeatRise: 50,         // heat >= this at dawn ticks the fed clock up
    fedHeatFall: 15,         // heat <= this ticks it down
    fedResetTo: 2,           // where the clock lands after a sweep
  },

  weather: {
    /* daily draw: clear / fog / rain — the reference sheets' three moods */
    rainChance: 0.22,
    fogChance: 0.18,
    rainSightFactor: 0.75,   // cops see less through a downpour
    rainPatronFactor: 0.85,  // a wet night thins the crowd
    rainDrops: 260,          // particles on screen
  },

  traffic: {
    cars: 5,                 // ambient 1920s sedans working the grid
    speed: 5.2,
  },

  rumors: {
    streetAccuracy: 0.6,     // tier-1 word of mouth is right 3 times in 5
    mickeyPrice: 5,          // tier-3: paid, specific, reliable
  },
};
