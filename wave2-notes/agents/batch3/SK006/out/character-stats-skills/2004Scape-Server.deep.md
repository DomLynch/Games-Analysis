# 2004Scape-Server (character-stats-skills, cell 3)

Donor: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/combat.rs2` (with `player/player_combat_stat.rs2`, `player/player_combat.rs2`, `player/player_melee.rs2`, `npc/npc_combat_melee.rs2`, `npc/npc_combat.rs2`, and `skill_prayer/scripts/prayer.rs2`) | Licence: MIT ("Copyright (c) 2023-2025 Lost City", LICENSE file) | RuneScript (CS2-style) with TypeScript engine ops | symbols `combat_effective_stat`, `combat_stat`, `combat_maxhit`, `player_npc_hit_roll`, `[timer,prayer_drain]`

Checked: Read in full: `combat.rs2` 1-60 and 86-170 (effective level, max hit, roll, style bonuses, XP per damage); `player_combat_stat.rs2` 1-130 (effective levels, style adds, magic defence mix, attack rolls, max hit) and the prayer multiplier procs 210-226; `player_combat.rs2` 1-58 (player hit check and defence picks); `player_melee.rs2` 1-30 (hit gate, damage roll, XP call); `npc_combat_melee.rs2` 1-30; `npc_combat.rs2` 76-100 and 266-285; `prayer.rs2` 1-80 and 160-200 (drain timer and points floor); `prayers.enum` 1-30 (drain values, partly); `changestat.rs2` line 1; engine ops `NumberOps.ts` 25-38 and 123-126, `Numbers.ts` 7-9. Callers: the cached combat stats are recomputed by the `changestat` trigger (changestat.rs2:1), prayer on and off (prayer.rs2), appearance (appearance.rs2 119, 142) and attack style change (player_attackstyles.rs2 86). Confidence high on the combat formulas and the integer rules (engine ops read); high on the prayer drain arithmetic (simulated with the donor steps); medium on the `calc()` wrapper, which is compiled by an external RuneScript compiler not in the repo (assumed integer, like CS2). Not read: the weapon style and speed tables (`configs/combat.dbtable`, melee and ranged configs), the equipment bonus loader (`equip_get_bonuses`), `poison.rs2`, `player_magic.rs2` and spell files, the NPC ranged and magic bodies (grep only), the second copy of `player_combat_stat` (106-256) beyond the prayer and check lines, the end of `prayer.rs2` beyond line 180, the XP table. camera_scope: not applicable.

Best transferable idea: One hit model fed by stats: effective level = level x max(100, prayer%) / 100, plus a style bonus, times (gear bonus + 64) gives a roll; max hit = (strength roll + 320) / 640; a hit lands when a random draw up to the attack roll beats a random draw up to the defence roll; damage is a random draw up to the max hit, capped at the target's hit points.
Decision (proposed): adapt - the chain is short, integer and checkable, and it gives the duel and the many-on-one fight one roll path; Frankendom rolls it on the server with a recorded seed, clamps every roll at 0 and keeps the numbers as catalogue fields.
Acceptance: A server test asserts that a level 99 accurate attacker with gear bonus 0 has max hit 11 and with gear bonus 100 has max hit 28; that clarity (105) turns level 99 into effective 103; that equal attack and defence rolls land about 50% over 100,000 seeded swings; and that a swing's damage never exceeds the target's remaining hit points.

## 1. Mechanism

- Refresh (when the derived combat stats are rebuilt): the proc `player_combat_stat` reads the equipment bonuses, prayer flags, the stat levels and the weapon style, then computes effective levels (`combat_effective_stat`, combat.rs2:4-5) and rolls. It runs on any stat change (changestat.rs2:1), prayer on or off, appearance change and attack style change. The result is stored in per-player varps (`%com_*`), which the defender-side roll also reads.
- Effective levels, order as in the code (player_combat_stat.rs2):
  (a) prayer multiplier first: `effective = scale(max(100, prayer%), 100, level)` = trunc(level x pct / 100) (combat.rs2:5; attack 62, strength 63, defence 64). Prayer percent is 100 or the multiplier from the prayer flags (procs at 210-226: 105, 110 or 115 per stat).
  (b) then the melee style: +8 on every melee effective level (70-72), plus the style add from `combat_get_damagestyle_bonuses` (accurate +3 attack; aggressive +3 strength; defensive +3 defence; controlled +1 each; combat.rs2:52-55).
  (c) magic: effective magic is level + 8 + 1 with no prayer (74); magic defence is computed BEFORE the +8 from a 7:3 mix, `trunc((7 x magic + 3 x defence) / 10)` (66), then +8 (75). So the mix uses the defence value without its style add.
- Rolls: `roll = calc(effective x (bonus + 64))` (combat.rs2:11-12; per type in pcs 82-91). The bonus is the equipment value for that type (not read).
- Max hit: `calc((strength roll + 320) / 640)` (combat.rs2:7-8; player max hit at pcs 98 from the melee strength roll).
- Hit check (player attacks NPC): `randominc(attack roll) > randominc(defence roll)` (player_combat.rs2:30). The NPC side uses the same comparison (npc_combat.rs2:85; npc_combat_melee.rs2:30). `randominc(n)` is an integer 0..n inclusive (NumberOps.ts:36-38).
- Damage (player melee): on a hit, `damage = randominc(min(max hit, max_dealt))` (player_melee.rs2:28), then capped at the NPC's hit points (`damage_capped`), then XP on the capped damage (30).
- NPC side: NPC effective levels add 9 (a controlled style of 1 plus 8; npc_combat_melee.rs2:6 and 18), the NPC max hit uses the same effective-to-roll-to-max-hit chain (npc_combat_melee.rs2:8), and NPC melee gives the player no XP.
- XP per damage (combat.rs2:86-166): base = damage x 10 (87). Accurate: attack gets 4 x base (145), so the value passed to `stat_advance` is 40 per damage, which the engine adds straight to the stat (`addXp`, `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Player.ts` 1732; whether that is ten times displayed XP was not read in this donor); aggressive and defensive do the same for strength and defence; controlled gives 1.33 each to attack, strength and defence; hit points get 1.33 x base on every style (166). Magic normal gives magic 2 x base (160).
- Prayer drain (prayer.rs2:163-178): each active prayer adds a drain value (prayers.enum: 1, 2, 3, 6 or 12). Every timer (settimer 5, prayer.rs2:33), the counter becomes `5 x (sum of active values) + counter` (164). If the counter reaches `max(resistance, 60)` (171), points taken = counter / resistance, the counter drops by resistance x points (172-173), and `stat_sub(prayer, points)` runs (174). At zero points, all prayers deactivate (175-178).
- Tick: the prayer timer is a 5-tick timer (33). The rest of the combat code runs in the player and NPC turn scripts; no fixed-step loop was read.

## 2. Key functions

- `combat_effective_stat`, `combat_stat`, `combat_maxhit`: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/combat.rs2` 4-12.
- Style add table: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/combat.rs2` 49-60.
- Player effective levels, rolls and max hit: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/player/player_combat_stat.rs2` 33-99.
- Player hit check and melee damage: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/player/player_combat.rs2` 25-31 and `player_melee.rs2` 20-30.
- NPC melee chain: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/npc/npc_combat_melee.rs2` 1-30.
- Prayer drain: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_prayer/scripts/prayer.rs2` 163-178.

## 3. Numbers vs mechanism (stat and skill table, SK focus)

| Stat or skill | What it does | Formula | Number ranges (typical) | Caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Effective attack, strength, defence | Level after prayer, before style | trunc(level x max(100, prayer%) / 100) | level 1..99; 100% to 115% (105, 110, 115 per prayer); level 99 with clarity = 103 (hand computed) | floor 100% (no drop below level) | combat.rs2:4-5; player_combat_stat.rs2:62-64; 210-226 |
| Style add | Melee style on top of +8 | +8 on all melee; accurate +3 attack; aggressive +3 strength; defensive +3 defence; controlled +1 each | +8 to +11 | none | player_combat_stat.rs2:70-72; combat.rs2:52-55 |
| Effective magic | Magic attack level | level + 8 + 1 (no prayer) | level + 9 | none | player_combat_stat.rs2:65, 74 |
| Magic defence | Defence against magic | trunc((7 x magic + 3 x defence) / 10) + 8, mix taken before the +8 | 8 above the mix | none | player_combat_stat.rs2:66, 75 |
| Attack, defence and strength roll | Roll per type | effective x (equipment bonus + 64) | bonus not read; with effective 110 and bonus 0: 7040 | none (clamp at 0 advised, section 6) | combat.rs2:11-12; player_combat_stat.rs2:82-91, 93-94 |
| Max hit | Top of the damage range | trunc((strength roll + 320) / 640) | level 99 accurate, bonus 0: 11; bonus 100: 28; bonus 50: 20 (hand computed) | none | combat.rs2:7-8; player_combat_stat.rs2:98 |
| Hit chance | Attack roll against defence roll | P(hit) = sum over a of min(a, D+1) / ((A+1)(D+1)) for integer draws 0..A and 0..D | equal rolls: 0.50 (0.4545 at 10 v 10); A = 2D: 0.75; A = D/2: about 0.25 (hand computed, 0.2488 at 100 v 200) | none | player_combat.rs2:30; npc_combat.rs2:85; npc_combat_melee.rs2:30 |
| Damage | Hit size | randominc(min(max hit, max_dealt)), then min with target hit points | 0..max hit (uniform) | cap at max_dealt and target HP | player_melee.rs2:28 |
| XP per damage | Stat XP per hit (main stat) | accurate, aggressive, defensive: 4 per damage (x10 base, scale 400/100); magic normal: 2 per damage | 4.0, 2.0 | none | combat.rs2:145, 160 |
| XP per damage, controlled and HP | Split style and hit points | controlled: 1.33 each to attack, strength, defence; HP 1.33 on every style | 1.33 | none | combat.rs2:166 |
| NPC effective level | NPC side effective | level + 9 (controlled style 1 + 8); no prayer | level + 9 | none | npc_combat_melee.rs2:5-6, 17-18 |
| Prayer drain value | Points per 5-tick step while on | clarity 3; rapid restore 1; steelskin 12; rock skin 6 | 1, 2, 3, 6, 12 | none | prayers.enum:6, 7, 10, 13 |
| Prayer drain step | Points taken | counter = 5 x sum + counter; points = trunc(counter / resistance) when counter >= max(resistance, 60) | sum 3: 1 point per 20 ticks; sum 6: 1 per 10 ticks; sum 12: 1 per 5 ticks; sum 15: 10 points in 40 ticks (simulated) | floor 0 | prayer.rs2:163-174 |
| Prayer points pool | Mental/focus pool | stat(prayer) current; zero deactivates all prayers | level-based (not read) | floor 0 | prayer.rs2:175-178 |
| Integer rule | How every number above rounds | divide and scale truncate; randominc is 0..n | n/a | n/a | NumberOps.ts:28, 33, 38, 125; Numbers.ts:8 |
| Magic and social skills, weapon speed and range, poison, equipment bonus values | Other stats | not read in this cell | not read | not read | (not read: configs, poison.rs2, player_magic.rs2) |

## 4. TypeScript sketch

simplified: keeps the donor order (prayer-scaled level, then the melee style add, then the roll x (bonus + 64), then the max hit, then the two draws, then damage capped at HP) and the constants (100, 8, the style adds, 64, 320, 640, 4.0 and 1.33 XP, and the drain values). It takes one attack bonus (the chosen damage type) instead of the stab, slash and crush table, and omits the ranged and magic paths, the magic defence mix, the garlic and silverlight damage modifiers, the NPC +9 side, the attack-delay gate, the XP rate multiplier, the stat-change refresh, and the prayer points floor that deactivates all prayers. It clamps every roll at 0 (the donor does not clamp, section 6) and uses one clamped drain resistance for both the threshold and the division (the donor divides by the raw value).

```ts
// Licence: MIT (donor, 2004Scape-Server LICENSE). Adapted from the mechanism; written as a fresh function, not a line-by-line translation.
// Integer rules as in the donor: scale and divide truncate toward zero; randominc(n) is an integer 0..n inclusive.

export type MeleeStyle = 'accurate' | 'aggressive' | 'defensive' | 'controlled';

export interface Levels { attack: number; strength: number; defence: number; }
export interface PrayerPct { attack: number; strength: number; defence: number; } // 100..115, donor check_*_prayer
export interface GearBonus { attack: number; strength: number; defence: number; } // equipment data, may be negative

// Donor combat_effective_stat: scale(max(100, prayer), 100, level) = trunc(level * pct / 100).
export function effectiveLevel(level: number, prayerPct: number): number {
  return Math.trunc((level * Math.max(100, prayerPct)) / 100);
}

// Donor style bonuses: +8 for every melee style, plus 3 (accurate, aggressive, defensive) or 1 each (controlled).
function styleAdd(style: MeleeStyle): { attack: number; strength: number; defence: number } {
  switch (style) {
    case 'accurate': return { attack: 8 + 3, strength: 8, defence: 8 };
    case 'aggressive': return { attack: 8, strength: 8 + 3, defence: 8 };
    case 'defensive': return { attack: 8, strength: 8, defence: 8 + 3 };
    case 'controlled': return { attack: 8 + 1, strength: 8 + 1, defence: 8 + 1 };
  }
}

// Donor combat_stat: roll = effective x (bonus + 64). Rolls are clamped at 0 here; the donor does not clamp.
export function rolls(levels: Levels, prayer: PrayerPct, style: MeleeStyle, gear: GearBonus) {
  const add = styleAdd(style);
  const effAttack = effectiveLevel(levels.attack, prayer.attack) + add.attack;
  const effStrength = effectiveLevel(levels.strength, prayer.strength) + add.strength;
  const effDefence = effectiveLevel(levels.defence, prayer.defence) + add.defence;
  return {
    attackRoll: Math.max(0, effAttack * (gear.attack + 64)),
    defenceRoll: Math.max(0, effDefence * (gear.defence + 64)),
    strengthRoll: Math.max(0, effStrength * (gear.strength + 64)),
  };
}

// Donor combat_maxhit: trunc((strengthRoll + 320) / 640), i.e. about 0.5 + roll / 640 rounded down.
export function maxHit(strengthRoll: number): number {
  return Math.trunc((strengthRoll + 320) / 640);
}

// Donor randominc(n): integer 0..n inclusive. The hit lands when the attack draw beats the defence draw.
export function randomInc(n: number, rand: () => number): number {
  return Math.trunc(rand() * (n + 1));
}

export function landsHit(attackRoll: number, defenceRoll: number, rand: () => number): boolean {
  return randomInc(attackRoll, rand) > randomInc(defenceRoll, rand);
}

// Damage is uniform 0..maxHit, then capped at the target's remaining hit points (donor player_melee).
export function damageRoll(maxhit: number, targetHp: number, rand: () => number): number {
  return Math.min(randomInc(maxhit, rand), targetHp);
}

// XP per damage in tenths (donor: base = damage x 10; accurate scale(400,100) = x4; controlled and HP scale(133,100) = x1.33).
export function xpTenths(damage: number, style: MeleeStyle, skill: 'attack' | 'strength' | 'defence' | 'hitpoints'): number {
  const base = damage * 10;
  const hpPart = Math.trunc((133 * base) / 100);
  if (skill === 'hitpoints') return hpPart;
  if (style === 'controlled') return Math.trunc((133 * base) / 100);
  const main: Record<Exclude<MeleeStyle, 'controlled'>, 'attack' | 'strength' | 'defence'> = {
    accurate: 'attack', aggressive: 'strength', defensive: 'defence',
  };
  return main[style] === skill ? Math.trunc((400 * base) / 100) : 0;
}

// Prayer drain values per active prayer (donor prayers.enum, drain effect per 5-tick timer).
export const PRAYER_DRAIN: Record<string, number> = {
  rapidrestore: 1, rapidheal: 2, protectitems: 2,
  thickskin: 3, strengthburst: 3, clarity: 3,
  rockskin: 6, superhumanstrength: 6, improvedreflexes: 6,
  steelskin: 12, ultimatestrength: 12, incrediblereflexes: 12,
  protectfrommagic: 12, protectfrommissiles: 12, protectfrommelee: 12,
};

export interface DrainState { counter: number; points: number; }

// One 5-tick timer step (donor [timer,prayer_drain]). resistance = 60 + 2 x equipment drain bonus (donor comment).
// Fix: the donor divides by the raw resistance but tests against max(resistance, 60); both use the clamped value here.
export function prayerDrainStep(state: DrainState, activePrayers: string[], resistance: number): DrainState {
  const r = Math.max(resistance, 60);
  const sum = activePrayers.reduce((acc, p) => acc + (PRAYER_DRAIN[p] ?? 0), 0);
  let counter = sum * 5 + Math.max(state.counter, 0);
  let points = state.points;
  if (counter >= r) {
    const reduce = Math.trunc(counter / r);
    counter -= r * reduce;
    points = Math.max(points - reduce, 0);
  }
  return { counter, points };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hitroll.ts` (new module): effective levels, rolls, max hit, hit check and damage for melee, with the Pit and zones as clients. Parity-checklist row 1 (duel step / sim). The style adds, the 64 and 320/640 constants and the prayer multipliers become catalogue fields (row 21 data), not literals.
- Reuse tag: adapt (MIT: code may be adapted; this note keeps the chain and writes a fresh function)
- Brief rule served: 1 (one engine, one roll path for duels and many-on-one); rules 7-9 n/a

## 6. Gaps and risks

- Defect 1 (prayer drain divisor): `prayer.rs2` 171 tests `max(resistance, 60)`, but 172-173 divide and subtract with the raw resistance. If resistance is ever below 1 (equipment drain bonus, source not read), the division gives 0 or a negative count and the drain stalls or reverses while the counter keeps growing. Fix: one clamped value for both (the sketch does this).
- Defect 2 (timer comment): `prayer.rs2` 31 says the first timer is 10 ticks, and the code at 33 sets 5. Fix: pick one and test it; the sketch assumes the 5-tick step.
- Risk (negative rolls): `randominc` of a negative number is not clamped (NumberOps.ts:36-38). A defence roll below 0 (gear bonus below -64; equipment data not read) makes a hit near-certain. Fix: clamp each roll at 0 (the sketch does), and test a zero defence roll against a zero attack roll.
- Risk (hit-check shape): the hit check uses two independent draws, so a high defence roll cannot make a hit impossible, only less likely (P(hit) about 0.25 at A = D/2). If Frankendom wants a floor or ceiling on hit chance, add it as a data field and test it; the donor has neither.
- Cached derived stats: the `%com_*` varps are rebuilt on stat change, prayer toggle, appearance and style change (changestat.rs2:1; prayer.rs2; appearance.rs2 119, 142; player_attackstyles.rs2 86). A new path that changes a bonus without one of these triggers leaves the roll stale. Frankendom computes the derived stats in the one ledger on every change and does not expose them as varps.
- XP is given on the capped damage (player_melee.rs2:30), so overkill gives no XP. Keep that rule; the NPC side gives no XP at all.
- Frankendom rulings: the draws run on the server with a seed recorded in the fight record (checklist row 19); the Pit and zones show the rolls only as HUD (row 14); MAX_ATTACKERS = 3 caps how many NPCs roll against one player, which the donor does not model (each NPC rolls its own draws against the same defence roll).
- Not covered: magic damage, poison, weapon speed and range data, and equipment bonus values (not read in this cell; see the table row).
