# levy-street-world-of-claudecraft (progression, cell 10)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/combat/damage.ts` | Licence: MIT (LICENSE: "MIT License", Copyright (c) 2026 Levy Street; package.json "license": "MIT") | TypeScript | symbol `grantXp`

Checked: The hint file `src/sim/progression/xp.ts` (100 lines, read in full) holds only rested-XP accrual and the cosmetic prestige command; its own header says the grant core lives in `combat/damage.ts`. Read in full: `grantXp` and `accrueLifetimeXp` (damage.ts 1916-1994), the kill-award block (damage.ts 1736-1782 and 1853-1865), the curve and mob-XP helpers (types.ts 9157-9160, 9198-9256, 9532-9578), `GROUP_XP_BONUS` (data.ts 787). Callers: `grantXp` is reached by the kill block (with `fromKill: true`) and, by grep, from quests (`quests/quest_commands.ts` 484), gathering (917), crafting (1259), delves (`delves/runs.ts` 896) and world quests (603), all through the `sim.ts` 7404 wrapper without the kill flag; I opened only the quest and gathering call lines, not the others. Not read: `worldPvpRewardAmount` (damage.ts 1924), `recalcPlayerStats`, `computeCharacterModifiers`, `isKillParticipant` (range test, `PARTY_XP_RANGE` = 80 at types.ts 9178), and the accumulator that drives `tick()`. Confidence: high.

## 1. Mechanism

- Curve: a flat table of XP to go from level L to L+1 for levels 1..20 (400, 900, ... 23200; types.ts 9157-9160), looked up by `xpForLevel`, which clamps to the last entry (9198-9200). Level cap 20.
- Kill award (damage.ts 1736-1865): base XP of a mob is `45 + 5 x mobLevel`. Level difference then scales it: a mob at or above the player's level pays `base x (1 + 0.05 x min(diff, 4))`, i.e. up to +20%; a mob below pays `base x (1 - gap / zeroDiff)`, falling linearly to 0 at `zeroDiff` levels below (grey), where `zeroDiff` is 5 (levels 1-7), 6 (8-9), 7 (10-15), 8 (16+) (types.ts 9561-9578). That anti-farm scaling is computed once per member against that member's own level.
- Party share (damage.ts 1748-1779, 1859-1862): eligible members are party members whose body or corpse is close enough to the kill; if none, the killer alone. Each member gets `round(mobXp x eliteMult x groupBonus / eligibleCount)`. `eliteMult` is 2 for elite mobs times the template's own `xpMult` (a puzzle object can be 0). `groupBonus` is the table `[1, 1, 1.166, 1.3, 1.43]` indexed by headcount, clamped to the table end (data.ts 787). The index is headcount minus 1, so a group of 2 gets 1x total, a group of 3 gets 1.166x split three ways (each member about 39% of a solo kill), a group of 5 gets 1.43x (about 29% each).
- Grant order inside `grantXp` (damage.ts 1916-1969): (1) ignore if the player is gone or amount <= 0; (2) PvP reward scaling (not read); (3) rested bonus: only for kill XP, only under the cap, bonus = `min(floor(restedPool), amount)`, pool reduced by the bonus, so the award is at most doubled while the pool lasts (1929-1933); (4) `accrueLifetimeXp` always adds to a monotonic lifetime counter, even at the cap, clamped at 2^53 (1939, 1977-1994); (5) a counter stat; (6) an `xp` event for the client; (7) at cap, return (bar frozen, 1948); (8) otherwise add to the bar and loop `while level < cap and bar >= xpForLevel(level)`: subtract, level++, re-bake modifiers and stats, full heal and full resource, emit level-up, refresh abilities, sync pet level (1950-1965); (9) if the loop reached the cap, zero the bar since the lifetime counter has it (1968).
- Post-cap: a table of cumulative lifetime XP per "virtual level" up to 200: levels 1..20 reuse the real table; each virtual level past 20 costs 10% more than the last (types.ts 9214-9235). `virtualLevel` is a binary search. It is cosmetic; at cap each award emits virtual-level-up events for any levels crossed (damage.ts 1987-1991).
- Prestige (types.ts 9538-9557, xp.ts 77-99): cost per rank is one full cap bar (23,200). `maxPrestigeRank = floor((lifetimeXp - xpToReach(20)) / 23200)`. The command succeeds only at cap and when `prestigeRank < maxPrestigeRank`; it resets the bar and adds one rank, leaving level, gear and talents alone. So rank is a pure function of XP earned, and a spammed command cannot inflate it.
- Rested XP (xp.ts 20-71): a pool that fills only while standing inside an inn and out of combat, 5% of the current level's cost per 8 game-hours with 60 sim seconds per game hour (so 480 s for 5%), capped at 1.5 levels, no accrual at cap. Called every tick for each player (sim.ts 5999) with the constant step `DT`.
- Tick: `TICK_RATE = 20`, `DT = 1/20` (types.ts 32-33); a comment in gathering.ts says the loop is the 20 Hz `tick()`. The accumulator that drives `tick()` was not read. Rested accrual is deterministic per tick (paced by DT, not the wall clock, per its own comment). `grantXp` itself is event-driven, not per tick.

## 2. Key functions

- `grantXp`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/combat/damage.ts` 1916-1969. The single place XP, levels and lifetime XP change.
- `accrueLifetimeXp`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/combat/damage.ts` 1977-1994. Monotonic counter plus virtual-level events.
- Kill-award block (inside the death handler): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/combat/damage.ts` 1736-1865. Party eligibility, elite factor, group bonus, per-member call.
- `mobXpValue` and `zeroDiff`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/types.ts` 9561-9578.
- `maxPrestigeRank` / `canPrestige`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/types.ts` 9541-9551; the command `prestige`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/progression/xp.ts` 77-99.
- `updateRested`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/progression/xp.ts` 56-71, called at sim.ts 5999.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Table-driven XP to next level, clamped at the end; carry-over level-up loop | The 20 values 400 ... 23200 (theirs, types.ts 9158-9159); cap 20 (theirs, 9174) |
| Kill XP = base(mobLevel) x level-difference factor, linear fade to zero | base 45 + 5 per level (theirs, 9570); +5% per level up to 4 (9573); grey band 5/6/7/8 (9562-9565) |
| Share = total x elite x group bonus / headcount | Group table 1, 1, 1.166, 1.3, 1.43 (theirs, data.ts 787); elite x2 (theirs, damage.ts 1742) |
| Rested pool: kill XP doubles from a pool that fills while idle in a safe place | 5%, 8 hours, 60 s per hour, cap 1.5 levels (theirs, xp.ts 21-24) |
| Lifetime counter independent of the level bar; virtual levels past the cap by geometric cost | Growth 1.1 (theirs, types.ts 9214); 200 virtual levels |
| Prestige rank capped by XP earned, not by commands | Cost = one cap bar, 23,200 (theirs, types.ts 9538) |

## 4. TypeScript sketch

simplified: the sketch keeps the curve, the mob-XP formula, the party share, the grant order (rested bonus, lifetime counter, bar, level-up loop, cap clamp), prestige gating and the rested tick. It omits the PvP scaling, stat re-bake and heal on level-up (a comment marks the spot), events, deeds, party eligibility (the caller passes the headcount), the virtual-level table, and the in-inn test. Constants are the donor's values as defaults; Frankendom should read them from data.

```ts
// Licence: MIT (donor). adapted shape; written fresh, formulas follow the donor.
interface Progress { level: number; xp: number; lifetimeXp: number; restedXp: number; prestige: number }

const XP_TABLE = [400, 900, 1400, 2100, 2800, 3600, 4500, 5400, 6500, 7600, 8800, 10100, 11400, 12900, 14400, 16000, 17700, 19400, 21300, 23200];
const MAX_LEVEL = 20;
const GROUP_XP_BONUS = [1, 1, 1.166, 1.3, 1.43];
const PRESTIGE_XP_PER_RANK = XP_TABLE[MAX_LEVEL - 1];
const xpForLevel = (level: number): number => XP_TABLE[Math.min(level - 1, XP_TABLE.length - 1)];

// cumulative lifetime XP needed to reach `level` (1..MAX_LEVEL)
function xpToReach(level: number): number {
  let t = 0;
  for (let l = 1; l < level; l++) t += XP_TABLE[l - 1];
  return t;
}

function zeroDiff(pl: number): number { return pl <= 7 ? 5 : pl <= 9 ? 6 : pl <= 15 ? 7 : 8; }

// Kill XP by level difference: bonus up to +20% for higher mobs, linear fade to 0 below the grey band.
function mobXp(mobLevel: number, playerLevel: number): number {
  const base = 45 + 5 * mobLevel;
  const diff = mobLevel - playerLevel;
  if (diff >= 0) return Math.round(base * (1 + 0.05 * Math.min(diff, 4)));
  const zd = zeroDiff(playerLevel);
  if (-diff >= zd) return 0;
  return Math.round(base * (1 - -diff / zd));
}

// Per-member kill award: shared among eligible members, group bonus by headcount, elite multiplier.
function killShare(mobLevel: number, memberLevel: number, eliteMult: number, eligible: number): number {
  const bonus = GROUP_XP_BONUS[Math.min(eligible, GROUP_XP_BONUS.length) - 1];
  return Math.round((mobXp(mobLevel, memberLevel) * eliteMult * bonus) / eligible);
}

// One award. Order: rested doubling (kills only, under cap) -> lifetime counter -> bar -> level-up loop.
function grantXp(p: Progress, amount: number, fromKill: boolean): number {
  if (amount <= 0) return 0;
  if (fromKill && p.level < MAX_LEVEL && p.restedXp > 0) {
    const bonus = Math.min(Math.floor(p.restedXp), amount);
    p.restedXp -= bonus;
    amount += bonus;
  }
  p.lifetimeXp += amount;               // always, even at the cap
  if (p.level >= MAX_LEVEL) return amount;
  p.xp += amount;
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level)) {
    p.xp -= xpForLevel(p.level);
    p.level++;                           // caller: recompute stats, refill hp here
  }
  if (p.level >= MAX_LEVEL) p.xp = 0;   // leftover lives on in lifetimeXp
  return amount;
}

// Prestige is a pure function of XP earned past the cap, so a spammed command cannot inflate it.
const maxPrestige = (lifetime: number): number => {
  const earned = lifetime - xpToReach(MAX_LEVEL);
  return earned <= 0 ? 0 : Math.floor(earned / PRESTIGE_XP_PER_RANK);
};
const canPrestige = (p: Progress): boolean => p.level >= MAX_LEVEL && p.prestige < maxPrestige(p.lifetimeXp);

// Rested pool accrues per tick while idle in a safe place: 5% of a level per 8 game-hours, cap 1.5 levels.
function tickRested(p: Progress, resting: boolean, dt: number): void {
  if (p.level >= MAX_LEVEL) return;
  const cap = 1.5 * xpForLevel(p.level);
  if (p.restedXp >= cap) { p.restedXp = cap; return; }
  if (!resting) return;
  p.restedXp = Math.min(cap, p.restedXp + (0.05 * xpForLevel(p.level)) / (8 * 60) * dt);
}

```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new module, the engine's single XP and level step, called by the kill resolution; all numbers from the catalogue). Parity-checklist row 18 (loot roll and XP award). Curve table and multipliers are catalogue fields (rows 20-21).
- today: not mapped to a current file in this pass (not read).
- Reuse tag: adapt (MIT; code may be adapted, keep the copyright notice)
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

Best transferable idea: keep a lifetime XP counter that always accrues, separate from the level bar, so the cap never wastes XP and prestige/virtual levels become pure functions of it.

## 6. Gaps and risks

- Mirror of Frankendom's one-ledger rule: the donor routes every XP source (kills, quests, gathering, crafting, delves, world quests) through one `grantXp`, with one boolean (`fromKill`) for the rested bonus. Adopt that shape; the donor does not keep a ledger of awards, only counters, so a record or replay of awards must be added.
- Server-verified kills: the award runs inside the death handler, so XP follows a verified kill only if Frankendom's kill verification sits before this call. The donor does not show how a hacked client is stopped from reporting kills (not read).
- Party share assumes a party and range test (`isKillParticipant`, not read). Frankendom's many-vs-one fights give XP to one player; keep the headcount parameter at 1 and use the group bonus only for the future.
- Flat per-level table with a 20-level cap is MMO-paced (hours per level). Frankendom's fast duels need a much shorter curve; only the shape (table, clamp, carry-over) transfers, not the numbers.
- Rested XP needs a "resting place" concept (inns). Frankendom zones as data would need a `rest` flag on a zone area; if none, drop this part.
- Level-up here runs a full stat re-bake and heal mid-loop. In Frankendom that must happen in the engine, not the client, and must not fire during a duel step.
- The sketch's rested rate divides by `8 * 60`; the donor's constants are named; use data fields.
