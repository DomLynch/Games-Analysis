# diasurgical-DevilutionX (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` (with `Source/items.cpp`, `Source/control/control_panel.cpp`, `Source/spells.cpp`, `Source/tables/playerdat.cpp`, data in `assets/txtdata/classes/*/attributes.tsv` and `assets/txtdata/Experience.tsv`) | Licence: Sustainable Use License 1.0 (LICENSE.md: "You may use or modify the software only for your own internal business purposes or for non-commercial or personal use."; restricted, not OSI) | C++ | symbols `NextPlrLevel`, `Player::_addExperience`, `CalcPlrLifeMana`, `CalcSelfItems`

Checked: read in full: `NextPlrLevel` (player.cpp 2386-2424), `_addExperience` (2430-2467), `AddPlrMonstExper` (2469-2483), `CalcStatDiff` (2376-2384), `calculateBaseLife/Mana` (2000-2009), `ModifyPlrStr/Mag/Dex/Vit` (3308-3372; the end of `ModifyPlrVit` after 3372 not read), `CalcPlrLifeMana` (items.cpp 2635-2653), `CalcSelfItems` (500-548), `CalcPlrPrimaryStats` (2515-2534), `CalcPlrDamageMod` (2549-2597), `CalcPlrResistances` (2605-2633), `CapStatPointsToAdd` and the spend click path (control_panel.cpp 159-164, 283-298, 690-744), `getThresholdForLevel` and the XP loader (tables/playerdat.cpp 36-58, 89-156), `readDecimal` (data/value_reader.hpp 71-78), `GetManaAmount` (spells.cpp 103-142). Data read: all six class `attributes.tsv` files; `Experience.tsv` (50 rows, read in full). Callers: `NextPlrLevel` has two callers: `_addExperience` (player.cpp 2463) and a network message handler (msg.cpp 2519, seen by grep only). `addExperience(e, lvl)` callers other than `AddPlrMonstExper` were not checked. NOT read: `ConsumeSpell` (spells.cpp 144 on), `IsItemValid`, `CalcPlrBlockFlag`, the monster XP values. Hand-computed numbers (from the TSV rows, not run) are marked. Confidence: high on the code paths and the data; medium on the wider monster XP model (not read). camera_scope: n/a.

## 1. Mechanism

Level and budget (event-driven, no tick):

- XP enters through `_addExperience(experience, levelDelta)` (player.cpp 2430). `levelDelta` is monster level minus hero level (player.h 839-841). Order of steps: (a) only the local hero is changed, and dead heroes are skipped (2432-2433); (b) at max level, return (2435-2437); (c) the amount is scaled by the level gap: `experience * (1 + levelDelta / 10.0)`, floored at 0 (2440); (d) in multiplayer only, the gain is capped to the smaller of (next threshold / 20) and (200 x current level) (2443-2447); (e) the gain is capped so the running total never passes the max-level threshold (2451-2454); (f) while the level is below max and the total is at or above the threshold of the current level, `NextPlrLevel` runs (2461-2464); (g) a level message is sent (2466).
- The XP total is cumulative and never reset (player.cpp 2338 sets it to 0 only at creation). The threshold for level L is row L of `Experience.tsv` (`getThresholdForLevel`, playerdat.cpp 50-53).
- `NextPlrLevel` (2386-2424), in order: (1) level plus one, clamped to max (`setCharacterLevel`, player.cpp 1985-1988); (2) `CalcPlrInv` rebuilds item bonuses and the derived pools (2390); (3) the unspent-point budget: `CalcStatDiff` is the sum over the four attributes of (max minus base) (the headroom, 2376-2384). If the headroom is under 5, unspent points are set to the headroom (2392-2393); otherwise five are added (2395); (4) max life rises by the class per-level value and current life is set to max (2397-2402); (5) max mana rises by the class per-level value, and current mana is set to max unless the NoMana item flag is set (2408-2416).

Attribute spend (player-initiated):

- The click targets are set up only when unspent is above zero (control_panel.cpp 692-693) and only for attributes below their class cap (696-697), so a capped attribute cannot be clicked. A single click spends one point (726); the "spend all" path spends `CapStatPointsToAdd` = the smaller of unspent and (max minus base) (159-163, 728). Unspent is reduced locally (732) and the change is sent as a command (731).
- `ModifyPlrVit` clamps the change to [minus base, max minus base] (player.cpp 3361), updates the stat and base (3363-3364), then adds the class life-per-vitality times the change to max life, base life, current life and the base (3366-3372). `ModifyPlrMag` does the same for mana with the class mana-per-magic (3322-3337), and skips current mana when NoMana is set. `ModifyPlrStr` and `ModifyPlrDex` clamp the same way and call `CalcPlrInv` (3308-3320; 3346-3357).

Derived pools:

- Creation: `calculateBaseLife` = adjLife + lvlLife x level + chrLife x base vitality (player.cpp 2000-2003); `calculateBaseMana` = adjMana + lvlMana x level + chrMana x base magic (2006-2009). These set the starting values (2328-2336). After that, the base pools change only by the incremental steps above (level-up and spend). The formula is used again only to validate a save (pack.cpp 609-610, grep).
- Item part and clamps (`CalcPlrLifeMana`, items.cpp 2635-2653): the item vitality total is multiplied by the class item-life value and shifted right by 6 (2638); the same for magic and mana (2641). Max life = clamp(item part + max base, 1 HP, 2000 HP) in fixed point (2644); current life = min(item part + current base, max) (2645). Max mana = clamp(item part + max base, 0, 2000 HP) (2651). Fixed point: values are read with `parseFixed6` (value_reader.hpp 76), so 64 units make one point (the `<< 6` shifts).

Requirements and primary stats:

- `CalcSelfItems` (items.cpp 500-548): the base plus the identified item bonuses is computed per stat (519-521). Each equipped item whose strength, magic or dexterity requirement is not met loses its stat bonuses (531-545). The loop repeats until nothing changes (547), because removing one item's bonus can break another item's requirement.
- `CalcPlrPrimaryStats` (items.cpp 2515-2534): the displayed stat is the item part plus the base, clamped to 0..750 (2530-2533). Rage spell flags add or subtract fixed amounts per level (2519-2528).

## 2. Key functions

- `NextPlrLevel`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 2386-2424.
- `Player::_addExperience`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 2430-2467 (level-gap scale 2440; multiplayer cap 2443-2447; level loop 2461-2464).
- `AddPlrMonstExper`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 2469-2483 (kill XP divided by the number of players in the mask, integer division at 2479; applied only to the local hero, 2480-2481).
- `CalcStatDiff`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 2376-2384 (the headroom).
- `CapStatPointsToAdd`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/control/control_panel.cpp` 159-164.
- `CalcPlrLifeMana`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/items.cpp` 2635-2653.
- `CalcSelfItems`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/items.cpp` 500-548.
- `GetManaAmount` (spell cost): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/spells.cpp` 103-142.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A fixed budget per level, capped by how much room each attribute has left | 5 points per level (player.cpp 2395); the "under 5" branch (2392-2393) |
| A grant of per-level max life and mana, with a full refill on level-up | Per-class lvlLife and lvlMana (data: attributes.tsv) |
| Stat-linked pool growth at spend time | Per-class chrLife and chrMana per point (data) |
| XP that grows with the level gap | +10% per level of gap (player.cpp 2440; the divisor 10.0 is the donor's) |
| Multiplayer XP cap | threshold / 20 and 200 x level (player.cpp 2446); applies only in multiplayer (2443) |
| Cumulative XP thresholds, one per level, loaded from a table | 50 rows (Experience.tsv); thresholds listed in the table below |
| Fixed-point stat math | 64 units per point (value_reader.hpp 76; `<< 6` in items.cpp 2639, 2644) |
| Requirement check that re-runs until stable | Requirement loop (items.cpp 547) |
| Spell cost: base minus level adjust, times class efficiency, floored | sManaAdj per spell; class manaCost factor per class (spells.cpp 111-139) |

Experience table (data, `assets/txtdata/Experience.tsv`, 50 rows; cumulative thresholds): level 1 to 2 needs 2000; 2 to 3 needs 4620; 10 to 11 needs 83419; 20 to 21 needs 1366227; 30 to 31 needs 20066900; 40 to 41 needs 210720231; 49 to 50 needs 1310707109; the max-level cap is 1583495809. The ratio from one threshold to the next falls from about 2.31 (level 1) to about 1.21 (level 49), by hand from the rows.

Class attributes (data, `assets/txtdata/classes/<class>/attributes.tsv`), with the hand-computed starting values at level 1 (not run; the TSV numbers are fixed-point decimals):

| class | base Str/Mag/Dex/Vit | class max Str/Mag/Dex/Vit | adjLife, lvlLife, chrLife | adjMana, lvlMana, chrMana | start life | start mana | start headroom |
|---|---|---|---|---|---|---|---|
| Warrior | 30/10/20/25 | 250/50/60/100 | 18, 2, 2 | -1, 1, 1 | 70 | 10 | 375 |
| Rogue | 20/15/30/20 | 55/70/250/80 | 23, 2, 1 | 5.5, 2, 1 | 45 | 22.5 | 370 |
| Sorcerer | 15/35/15/20 | 45/250/85/80 | 9, 1, 1 | -2, 2, 2 | 30 | 70 | 375 |
| Monk | 25/15/25/20 | 150/80/150/80 | 23, 2, 1 | 5.5, 2, 1 | 45 | 22.5 | 375 |
| Bard | 20/20/25/20 | 120/120/120/100 | 23, 2, 1 | 3, 2, 1.5 | 45 | 35 | 375 |
| Barbarian | 40/0/20/25 | 255/0/55/150 | 18, 2, 2 | 0, 0, 1 | 70 | 0 | 375 |

The start life is adjLife + lvlLife x 1 + chrLife x baseVit; the start mana is adjMana + lvlMana x 1 + chrMana x baseMag; headroom is the sum of (class max minus base) over the four attributes. Per-level values for the grant: life += lvlLife, mana += lvlMana. Over a full run to level 50, the budget is 49 x 5 = 245 points, which is less than every class's start headroom (370 to 375), so the headroom branch is never reached in a normal run (hand-computed, not simulated).

### Stat table (character-stats-skills; donor-defined fields)

| name | what it does | formula | number ranges | caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Strength / Magic / Dexterity / Vitality | four primary attributes (enum order Str, Mag, Dex, Vit) | displayed = item part + base, clamped 0..750 | base start from class (data); class max (data, see table) | hard: class max on base (3310, 3324, 3348, 3361); 750 on displayed (2530-2533) | player.h:61-65; items.cpp:2530; player.cpp:3310-3361 |
| Unspent stat points | points to spend | +5 per level; if headroom is under 5, set to headroom | start 0 (not read) | none stated | player.cpp:2392-2395 |
| Headroom | how many points can still go into attributes | sum of (max minus base) over the four attributes | 370 to 375 at start (hand-computed) | n/a | player.cpp:2376-2384 |
| Spend (one click) | one point into one attribute | base += 1; unspent -= 1 | 1 | click targets only below class cap | control_panel.cpp:726, 732, 692-697 |
| Spend (all) | every unspent point into one attribute | min(unspent, max minus base) | up to headroom | class cap | control_panel.cpp:159-163, 728 |
| Max life (base) | life from level and vitality | adjLife + lvlLife x level + chrLife x baseVit (creation); then += lvlLife on level-up and += chrLife per vit point on spend | start 30 to 70 (hand-computed) | item part plus base clamped 1..2000 HP (64..128000 units) | player.cpp:2000-2003, 2397-2402, 3367-3372; items.cpp:2644 |
| Max mana (base) | mana from level and magic | adjMana + lvlMana x level + chrMana x baseMag (creation); then += lvlMana on level-up and += chrMana per magic point on spend | start 0 to 70 (hand-computed) | clamped 0..2000 HP (items.cpp:2651) | player.cpp:2006-2009, 2408-2411, 3329-3337; items.cpp:2651 |
| Item life bonus | life from item vitality | (item vitality x itmLife) >> 6, in fixed point | class data (itmLife 1 to 2.5) | none in this step | items.cpp:2638-2639 |
| Item mana bonus | mana from item magic | (item magic x itmMana) >> 6, in fixed point | class data (itmMana 1 to 2) | none in this step | items.cpp:2641-2642 |
| Current life | hit points now | min(item part + current base, max) | 0..max | max | items.cpp:2645 |
| Current mana | mana now | min(item part + current base, max) | 0..max | max | items.cpp:2652 |
| Level-up refill | life and mana restored at level | life = max; mana = max unless NoMana | n/a | n/a | player.cpp:2400, 2413-2414 |
| Level | 1..max | +1 per threshold reached | 1..50 (table size) | max = table size (50 rows) | player.cpp:2386-2388, 1985-1993 |
| Experience (cumulative) | XP total | += scaled gain, capped at max-level threshold | 0..1583495809 | cap at max-level threshold | player.cpp:2430-2454 |
| Level-gap scale | XP scaled by monster level minus hero level | gain = amount x (1 + gap / 10), floor 0 | x0 at gap -10 or less; x2 at gap +10 | none | player.cpp:2440 |
| Multiplayer XP cap | stops power-levelling in multiplayer | min(threshold / 20, 200 x level) | varies | multiplayer only | player.cpp:2443-2447 |
| Shared kill XP | kill XP split among players in the kill mask | exp / number of players (integer) | n/a | n/a | player.cpp:2479-2481 |
| Threshold lookup | XP needed to leave current level | row (level minus one), table index clamp | 2000 at level 1 | table size | playerdat.cpp:50-53 |
| Base damage (unarmed) | damage with no weapon | 1..1; 1..3 with shield; Monk: max(1, level/2) .. level | level-dependent for Monk | n/a | items.cpp:2497-2508 |
| Damage modifier | per-class damage bonus | e.g. Rogue: level x (str + dex) / 200; default: level x str / 100 | engine constants (divisors 75 to 300) | n/a | items.cpp:2549-2597 |
| Iron Skin | armour bonus for a class flag | armour += level / 4 | 0..12 at level 50 (hand-computed) | n/a | items.cpp:2600-2602 |
| Natural resistance | element resist for a class flag | each of magic, fire, lightning += level | 1..50 | clamp to MaxResistance (value not read) | items.cpp:2611-2615, 2630-2632 |
| Spell level | per-spell level | adjust = max(spell level minus 1, 0) | 1..15 (MaxSpellLevel) | 15 | player.h:41; spells.cpp:111 |
| Spell mana cost | mana per cast | base minus adjust; Healing: base + 2 x level minus adjust; Resurrect: adjust = sl x (base/8); floor at zero; x class manaCost / 64; floor at sMinMana | per spell (data, not read) | minimum sMinMana | spells.cpp:103-142 |
| Skill points / skill tree | no separate skill tree in the parts read; spells use spell levels (row above) | n/a | n/a | n/a | not searched beyond the stats path |
| Luck | (not present: the attribute enum is Str, Mag, Dex, Vit) | n/a | n/a | n/a | player.h:61-65 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (XP scale and caps, then the level loop; level-up budget, then life and mana refill; per-attribute spend with its cap, then the pool change). It changes the fixed-point storage (64 units per point) to plain numbers, leaves out the item-bonus part of the pools (`CalcPlrLifeMana`), the separate current-base fields, the NoMana item flag beyond one boolean, the rage spell modifiers, the network commands, and the multiplayer flag beyond one boolean. It changes the donor's two-branch budget rule (replace under 5, else add 5) to one cap, `unspent = min(unspent + 5, headroom)`; this is the defect fix listed in section 6.

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted: non-commercial use only). Clean-room sketch of the mechanism shape only; not a translation of the donor lines.
type AttrKey = "str" | "mag" | "dex" | "vit";

interface Attr {
  base: number; // points spent so far (the donor's _pBase* fields)
  max: number;  // class cap for this attribute
}

interface ClassData {
  lvlLife: number;  // max life gained per level (data)
  lvlMana: number;  // max mana gained per level (data)
  chrLife: number;  // max life per point of Vitality (data)
  chrMana: number;  // max mana per point of Magic (data)
}

interface Hero {
  level: number;
  xp: number;        // cumulative experience, never reset
  unspent: number;   // stat points waiting to be spent
  attrs: Record<AttrKey, Attr>;
  hpMaxBase: number;
  hpMax: number;
  hp: number;
  manaMaxBase: number;
  manaMax: number;
  mana: number;
  noMana: boolean;   // item flag that stops mana refill
}

const MAX_LEVEL = 50;
const POINTS_PER_LEVEL = 5;        // engine constant (donor player.cpp:2395)
const MP_XP_DIVISOR = 20;          // multiplayer cap: a twentieth of the next threshold
const MP_XP_PER_LEVEL = 200;       // multiplayer cap: 200 x current level

// Points that can still be spent: sum of (max - base) over the four attributes.
export function headroom(h: Hero): number {
  let total = 0;
  for (const key of Object.keys(h.attrs) as AttrKey[]) {
    total += h.attrs[key].max - h.attrs[key].base;
  }
  return total;
}

// Level up by one. Budget: 5 points, capped so unspent never exceeds the headroom left to spend into.
export function levelUp(h: Hero, cls: ClassData): void {
  h.level = Math.min(h.level + 1, MAX_LEVEL);
  const room = headroom(h);
  h.unspent = Math.min(h.unspent + POINTS_PER_LEVEL, room);

  h.hpMaxBase += cls.lvlLife;
  h.hpMax = h.hpMaxBase;
  h.hp = h.hpMax;                  // level-up refills current life

  h.manaMaxBase += cls.lvlMana;
  h.manaMax = h.manaMaxBase;
  if (!h.noMana) {
    h.mana = h.manaMax;            // refill unless the NoMana flag is set
  }
}

// One kill's XP. levelGap = monster level minus hero level. Only the local hero's ledger is touched.
export function awardXp(
  h: Hero,
  cls: ClassData,
  amount: number,
  thresholds: number[],          // cumulative XP at which each level ends (data table)
  levelGap: number,
  multiplayer: boolean,
  maxXp: number,
): void {
  let gain = Math.max(0, Math.floor(amount * (1 + levelGap / 10))); // +10% per level above you, 0 floor
  if (multiplayer) {
    const nextThreshold = thresholds[h.level - 1];
    gain = Math.min(gain, Math.floor(nextThreshold / MP_XP_DIVISOR), MP_XP_PER_LEVEL * h.level);
  }
  gain = Math.min(gain, maxXp - h.xp);
  h.xp += gain;

  while (h.level < MAX_LEVEL && h.xp >= thresholds[h.level - 1]) {
    levelUp(h, cls);
  }
}

// Spend points on one attribute. Capped by the unspent budget and by the attribute's own headroom.
export function spend(h: Hero, cls: ClassData, key: AttrKey, want: number): number {
  const a = h.attrs[key];
  const n = Math.max(0, Math.min(want, h.unspent, a.max - a.base));
  a.base += n;
  h.unspent -= n;

  if (key === "vit") {
    const d = n * cls.chrLife;     // Vitality adds life immediately, to max, base and current
    h.hpMaxBase += d;
    h.hpMax += d;
    h.hp += d;
  } else if (key === "mag") {
    const d = n * cls.chrMana;     // Magic adds mana immediately, to max, base and current unless noMana
    h.manaMaxBase += d;
    h.manaMax += d;
    if (!h.noMana) {
      h.mana += d;
    }
  }
  return n;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/SK009-dvx-levelup-budget.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/hero-stats.ts` (new; hero level, budget and derived pools, owned by the engine and read by clients). Parity-checklist row 21 (catalogue fields: the per-class and per-level values are catalogue data). The XP award itself belongs to row 18 (loot roll and XP award), so the XP function above lands in the same module but is checked against row 18.
- today: not read (the Frankendom repo was not opened in this pass).
Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, non-commercial only; clean-room shape only, no code)
Brief rule served: 1 (one engine owns level, budget and pools; clients display); parity row 21

Best transferable idea: A level-up grants a fixed budget of points and a class-set max life and mana increment that refill the pools, and each stat spend is capped by that attribute's own room below its class maximum.
Decision (proposed): adapt — keep the budget per level, the per-attribute cap and the class per-level pool growth as data; cap the unspent budget at the headroom in one rule (the donor's two branches differ), and move the XP award to the server (the donor awards it locally and applies remote levels without a check).
Acceptance: a hero reaching a new level sees five new stat points, max life and mana rise and refill, and a stat spend above the class max is refused; a server test asserts that XP for a monster ten levels above is twice the base amount before the cap, and that a client cannot raise a stat past its class max.

## 6. Gaps and risks

- Restricted licence (Sustainable Use License 1.0): use is limited to internal business or non-commercial or personal use, and the notices must stay. Clean-room shape only; nothing is copied. The sketch is written from the mechanism.
- Defect: the +5 branch has no cap at the headroom (player.cpp 2395). Unspent points can then exceed what the attributes can still take, so some points can never be spent (phantom points). The under-5 branch (2392-2393) does cap, but in a different way (it replaces the count). The phantom case needs start headroom under 5 x (new level minus 1), which is 245 at level 50; with these tables the lowest start headroom is 370, so it cannot occur (hand-computed). It matters only for a table with smaller class maxima. Fix: one rule for both sides, `unspent = min(unspent + 5, headroom)`; the sketch uses it.
- Defect: the comment at player.cpp 2444-2445 splits the multiplayer cap into "level 1-5" and "level 6-50", but the code takes the minimum of both at every level (2446). Fix: make the comment match the code, or split by level if that was the intent (not stated in the donor).
- Defect: XP is applied only to the local hero (2432), with no check on the server, and a remote level message calls `NextPlrLevel` without a budget check (msg.cpp 2519, read by grep). Fix: the server awards XP and levels, the client only displays. This is the gap with Frankendom's rulings (server-verified kills, one ledger).
- Defect: the stat spend deducts unspent points on the client before the engine clamps the change (control_panel.cpp 732; player.cpp 3310). The buttons hide at the cap, so the UI is safe, but the budget is not checked by a second party. Fix: the engine validates and deducts only what it accepts.
- Defect (latent): `getThresholdForLevel` clamps the index to the table size (playerdat.cpp 53), not size minus one. It is not reached, because `setCharacterLevel` caps the level at the table size (player.cpp 1987). Fix: clamp to size minus one.
- Design note: max life and mana are incremental state, and the base formula is only a save validator (pack.cpp 609). Fix for Frankendom: derive the pools from one function on every change, so the formula is the single source.
- Not wired here: Luck (not in the attribute enum). Skill trees are not in this code; spells use levels with a max of 15 (player.h 41).
- Spell costs: only the cost formula was read. `ConsumeSpell` (spells.cpp 144 on) was not read, so the spend path and any refund are unknown.
- Class per-level values, XP thresholds and class maxima are data files, not code constants. The Frankendom catalogue should carry the same fields (row 21). The 5-points-per-level and the multiplayer cap constants are engine constants in the donor.
- Equipment requirements (`CalcSelfItems`) depend on `IsItemValid` (items.cpp 529), which was not read.

