# OpenRA-OpenRA (character-stats-skills, cell 2)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/` (OpenRA.Mods.Common/Traits/GainsExperience.cs, GivesExperience.cs, ExperienceTrickler.cs, ChangesHealth.cs, Health.cs, Multipliers/*.cs, Armament.cs, Warheads/DamageWarhead.cs, Util.cs; mods/ts/rules/defaults.yaml, gdi-infantry.yaml, mods/ts/weapons/ballisticweapons.yaml, mods/ra/rules/defaults.yaml) | Licence: GPL-3.0-or-later (COPYING is GPL version 3; each file header says "either version 3 of the License, or (at your option) any later version", read in GainsExperience.cs lines 4-7) | C# + YAML rules | symbol `GainsExperience` / `GivesExperience.Killed` / `Health.InflictDamage` / `DamageWarhead.InflictDamage`

Checked: opened and read in full: GainsExperience.cs (172 lines), GivesExperience.cs (79), ExperienceTrickler.cs (62), GainsExperienceMultiplier.cs (34), DamageMultiplier.cs, FirepowerMultiplier.cs, SpeedMultiplier.cs, ChangesHealth.cs (90). Read in part: Health.cs 125-215 (InflictDamage and the modifier loops), DamageWarhead.cs 20-30 and 60-93, Util.cs 196-211, Armament.cs 176-200 and the grep of 328. Read as YAML: mods/ts defaults.yaml 1-70, gdi-infantry.yaml 1-30, ballisticweapons.yaml 1-24, mods/ra defaults.yaml 46-100. Confidence high for the experience path and the damage path; medium for the YAML numbers (read by sed, most value lines are under 15 characters and are not receipted, same as the Quake example). Not read: ReloadDelay multiplier body, LevelUpCrateAction.cs, DevCommands.cs, PlayerExperience, the Armor trait body, Armament's firing loop, and whether FrozenDictionary keeps YAML order. The trickler is not used by any mod (grep over mods/ has no hit). camera_scope: n/a.

## 1. Mechanism

- Experience is a per-actor counter. A rank is reached when the counter passes a threshold. Thresholds are the YAML `Conditions` map: key = percent of own cost, value = the condition granted (GainsExperience.cs 26-29). At creation, the threshold is `key x required`, where required = the unit's Valued cost (default, ExperienceModifier -1) or ExperienceModifier when set (95-97).
- Kill award (GivesExperience.cs 57-77): the victim gives `exp` = its own Valued cost (21-22, 51-52). The victim's own percent modifiers apply first (65). The killer gets `exp` x its own modifiers x ActorExperienceModifier, which defaults to 10000 percent, so x100 (28, 70-72). Only the killing actor gets it (no assists); the player also gets a PlayerExperience share (75-76), default modifier 0 in the base, 1 in the mods (defaults.yaml line 6).
- Grant (GainsExperience.cs 114-139): clamp the counter to 0..top threshold (122), then `while` the counter is past the next threshold, grant that step's condition and level up (124-126). Several levels can come from one award. A level-up notification and sprite fire unless silent (130-136).
- Ranks are conditions: `rank` is a counter condition granted once per threshold (ts: `500: rank`, `1000: rank`; ra: `200/400/800/1600: rank-veteran`). Modifiers are conditional traits that read the counter (`RequiresCondition: rank-veteran`, `rank-veteran == 1`, `rank-veteran >= 4`).
- Modifiers stack multiplicatively: each IDamageModifier / IFirepowerModifier / ISpeedModifier returns a percent (DamageMultiplier.cs 32-34; FirepowerMultiplier.cs 29). Firepower goes into the warhead (Armament.cs 182, 328; DamageWarhead.cs 88). Damage taken goes through the victim's actor-level and player-level damage modifiers in Health.InflictDamage (Health.cs 167-186). A second multiplier source on the attack side is Armament-side firepower modifiers (Armament.cs 182, 328).
- Damage order in a hit (DamageWarhead.cs 88 then Health.cs 167-189): raw warhead Damage x attacker firepower percents x versus-armour percent (versus = product of `Versus[armor type]` for each Armor trait, default 100, DamageWarhead.cs 72-83); then the result is truncated to int; then the victim's damage percents apply only when the damage is positive (167-186): both the actor's damage modifiers and the player-level ones (`damageModifiersPlayer`, 172-184), then a second truncation `(int)appliedDamage` (186); then HP = clamp(HP - damage, 0, max) (189).
- Self-heal trait ChangesHealth (ChangesHealth.cs 60-88): below the threshold percent of max HP and after the damage cooldown, once per Delay ticks, it adds `Step + PercentageStep x max / 100` as a negative damage. Positive damage resets the cooldown (86-87); heals do not.
- Tick: ChangesHealth and ExperienceTrickler are ITick, driven by the actor tick (per game tick). ExperienceTrickler gives `Amount` every `Interval`+1 ticks (the check is `--ticks < 0` and ticks resets to Interval; 20, 26, 55-58); default 50 ticks and 15 raw units. Not used by any mod.

## 2. Key functions

- `GainsExperience.GiveExperience`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GainsExperience.cs` 114-139 (clamp, multi-level loop, condition grant, notification).
- `GainsExperience.Created` (thresholds built): `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GainsExperience.cs` 92-101 (threshold = key x required; iteration at 96-97).
- `GivesExperience.Killed`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GivesExperience.cs` 57-77 (victim percent, killer percent, player share).
- `Util.ApplyPercentageModifiers`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Util.cs` 203-211 (decimal product, int at the end).
- `DamageWarhead.DamageVersus` and `InflictDamage`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Warheads/DamageWarhead.cs` 72-90.
- `Health.InflictDamage` (damage percents, clamp): `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Health.cs` 158-189.
- `ChangesHealth.Tick` and `Damaged`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/ChangesHealth.cs` 60-88.
- `ExperienceTrickler.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/ExperienceTrickler.cs` 47-60.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rank thresholds are a multiple of the unit's own cost, so a costly unit needs the same number of kills as a cheap one | ts: keys 500 and 1000 (two ranks, so 5 and 10 equal-cost kills, since a kill gives victim cost x100). ra: keys 200, 400, 800, 1600 (2, 4, 8, 16 equal-cost kills) (ts defaults.yaml 21-23; ra defaults.yaml 51-55) |
| Kill award = victim cost x 100 (x killer modifiers) | ActorExperienceModifier 10000 (GivesExperience.cs 28) |
| Per-rank multipliers as data rows | ts veteran/elite: firepower 110/130, damage taken 90/75, speed 120/140, reload 90/75 (defaults.yaml 31-42, read as YAML) |
| Elite self-heal after a cooldown | ts ELITE: Step 200, Delay 100, StartIfBelow 100, DamageCooldown 125 (defaults.yaml 55-60) |
| Versus table by armour type | ballistic cannon warhead: none 25, wood 65, light 75, heavy 100, concrete 60 (ballisticweapons.yaml 15-20) |
| Experience trickle | Interval 50 ticks, Amount 15 raw units (ExperienceTrickler.cs 20, 26); unused by mods |

### Stat and skill rows (SK table, donor numbers)

Skills are TABLE-DRIVEN: yes. Ranks are a YAML map on `^GainsExperience` (a shared base block that units inherit). The per-rank effects are conditional trait rows (`FirepowerMultiplier@VETERAN`, `DamageMultiplier@ELITE`, ...). Stats are per-unit YAML rows (Health, Mobile, Armament, Valued, Armor). Freeciv-style numbers are not in OpenRA; the numbers below are OpenRA's.

| name | what it does | formula | number ranges (donor) | caps | file:line |
|---|---|---|---|---|---|
| experience counter | XP the unit has | sum of awards, clamped | 0..top threshold | clamped at top threshold | GainsExperience.cs 122 |
| rank threshold | XP for a rank | key x required (cost) | ts 500, 1000 x cost; ra 200, 400, 800, 1600 x cost | last key is the max | GainsExperience.cs 26-29, 95-97 |
| rank counter | rank number | +1 per threshold, granted as condition | 0..2 (ts), 0..4 (ra) | MaxLevel = Conditions count | GainsExperience.cs 88, 124-126 |
| kill award | XP to killer | victim cost x victim % x killer % x 10000 % | victim cost x100 (a 200-cost victim gives 20000 raw; ts rank 1 is 100000) | none | GivesExperience.cs 51-52, 65, 70-72; GivesExperience.cs 28 |
| player share | XP to owner | cost x PlayerExperienceModifier % | modifier 0 in base, 1 in mods (1 = 1 percent) | none | GivesExperience.cs 75-76; ts defaults.yaml 6 |
| level-up cheat / crate | grant levels | GiveLevels / GiveExperience to next threshold | +1 level | MaxLevel | GainsExperience.cs 105-112, 149-152 |
| trickle | periodic XP | Amount every Interval+1 ticks (`--ticks < 0`) | Amount 15, Interval 50 (defaults) | pausable | ExperienceTrickler.cs 20, 26, 58 |
| firepower % (rank) | damage of each shot | percent multiplier | ts 110 / 130; ra 105 / 110 / 120 / 130 | none | defaults.yaml 31-36 (ts); ra defaults.yaml 72-84 (read as YAML) |
| damage taken % (rank) | damage received | percent multiplier, positive damage only | ts 90 / 75 | 0 = invulnerable (comment) | DamageMultiplier.cs 17, 32-34; Health.cs 167-186 |
| speed % (rank) | move speed | percent multiplier | ts 120 / 140 | none | SpeedMultiplier.cs 29; defaults.yaml 43-49 (read as YAML) |
| reload % (rank) | reload delay | percent multiplier | ts 90 / 75 | none | defaults.yaml 49-54 (read as YAML; trait body not read) |
| versus % | damage by armour type | product of Versus[type] over Armor traits | ballistic cannon 25 to 100 | default 100 when no Versus | DamageWarhead.cs 75-83; ballisticweapons.yaml 15-20 |
| armour type | armour class of a unit | string Type on the Armor trait | e.g. Light (gdi-infantry 113-114) | none | gdi-infantry.yaml 113-114 (read) |
| max HP | hit points | Health HP | E2 HP 15000 (gdi-infantry 17-18, read) | HP clamped 0..MaxHP | Health.cs 189 |
| move speed (base) | move speed base | Mobile Speed | E2 56 (gdi-infantry 19-20, read) | none | gdi-infantry.yaml 19-20 |
| cost (valued) | cost and XP scale | Valued Cost | E2 200, MEDIC 600 (gdi-infantry 11-12, 50-51) | none | gdi-infantry.yaml 11-12 |
| self-heal | HP regen while hurt | Step + PercentageStep x max / 100 per Delay, below StartIfBelow %, after DamageCooldown | ts elite 200 per 100 ticks, below 100 %, cooldown 125 | none | ChangesHealth.cs 22-33, 66-87 |
| magic / mana / spells / schools / resistances / luck / social skills | none in these files | n/a | n/a | n/a | not present (checked the rank, health and warhead files) |

As-data shape: the rank ladder is a YAML map (`Conditions`, FrozenDictionary<int,string>: key = percent of cost, value = condition name) on the `GainsExperience` trait (GainsExperience.cs 29). Other GainsExperience row fields: LevelUpImage (string), LevelUpSequence (string, default "levelup"), LevelUpPalette (string, default "effect"), ExperienceModifier (int, default -1), SuppressLevelupAnimation (bool, default true), LevelUpNotification (string), LevelUpTextNotification (fluent key). GivesExperience row fields: Experience (int, -1), ValidRelationships (flags), ActorExperienceModifier (int, 10000), PlayerExperienceModifier (int, 0). Per-rank modifier rows: Modifier (int percent, default 100) plus the ConditionalTrait `RequiresCondition` (string). Health row fields: Step (int), PercentageStep (int), Delay (int ticks), StartIfBelow (int percent), DamageCooldown (int ticks), DamageTypes (flags). Warhead fields: Damage (int), DamageTypes (flags), Versus (map of armour type to percent). A new unit type is one row: yes (`Inherits@EXPERIENCE: ^GainsExperience`, gdi-infantry.yaml 3). A new rank: no, it is one Conditions line plus one conditional-trait row for each stat that changes at that rank (defaults.yaml 22-56), so about 5 lines, not one row.

Provenance per claim: repo `OpenRA-OpenRA`, licence GPL-3.0-or-later (file headers). Each claim cites the file and line in receipts.tsv (54 OpenRA rows; the file-wide verifier run on all 173 rows passed with 0 failures).

What they patched later: no history available. The donor has no `.git` directory and no changelog in the repo root. grep for FIXME, HACK, TODO and workaround in the files read returned nothing.

Donor defects (keep the idea, fix in the sketch):
- Thresholds are built by iterating the dictionary with no sort (GainsExperience.cs 96-97). The code then assumes ascending order. Fix: sort the keys first (sketch: `buildSteps`).
- `exp` is a field and is reassigned in Killed (GivesExperience.cs 65). A second Killed call would compound the victim modifiers. Fix: use a local (sketch: `killAward`).
- The shared ApplyPercentageModifiers ends with an int cast (Util.cs 210, `return (int)a;`), so a 1-point hit at 50 percent becomes 0. Fix: keep a minimum of 1 damage for any raw hit above 0 (sketch: `warheadDamage` does not yet do this; note it in Section 6).
- The trickler Amount (15) is in raw experience units, while kills give cost x100. A trickler author must scale Amount to the unit cost, and no mod uses it yet. Fix: state Amount as percent of own cost in the rank table.

Best transferable idea: express each rank as a number of equal-cost kills (the threshold is a multiple of the unit's own cost, so one data row sets how many fights a rank takes), with the per-rank multipliers as data rows.
Decision (proposed): adapt - keep the cost-scaled thresholds and the per-rank data rows; rewrite the award to use server-verified kills and Frankendom's one-ledger record, and fix the donor's unsorted thresholds and the int-truncation hit.
Acceptance: a player who gets five kills with an equal-cost unit sees the veteran badge and a rank-up line on the fight record, and a server test asserts that rank 1 is reached at 500 x cost XP, that XP is clamped at the top threshold, and that an elite takes 75 percent of the raw damage.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (kill award: victim cost, then victim percents, then killer percents with the 10000 kill scale; grant: clamp, then grant every step reached; hit: warhead percents including firepower and versus, then one truncation (DamageWarhead/Util.cs 210), then victim percents (actor and player-level) for positive damage only with a second truncation (Health.cs 186), then clamp; heal: below threshold, after cooldown, once per delay). It omits the player XP share, notifications and sprites, the dev command, LevelUpCrateAction, the trickler, Resurrect, the ignoreModifiers flag, the damage-type filter on heal, the AppliedDamage notifications, and the armour-trait filter by shape (versus uses one number). It sorts the thresholds (donor does not), uses a local for the award (donor mutates `exp`), and computes with floats and truncates once per stage, twice per hit (warheadDamage, then victimHp), matching the donor's two truncations (donor uses decimal then int). It does not yet keep a minimum of 1 damage for small hits (donor truncates to 0; see Section 3).

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Target: src/fight/rank.ts (proposed). Parity row 21 (catalogue fields).

export {};

// Percent modifiers multiply a number in turn; the donor truncates once at the end (Util.ApplyPercentageModifiers).
function applyPct(n: number, pcts: number[]): number {
  let a = n;
  for (const p of pcts) {
    a = a * p / 100;
  }
  return Math.trunc(a);
}

// Rank thresholds: key = percent of own cost. Stored XP is in the same units as a kill award (cost x 100).
interface RankStep {
  requiredXp: number;   // key x own cost
  rank: number;         // rank granted when this step is reached (1-based)
}

interface RankState {
  cost: number;         // own Valued cost
  xp: number;           // stored experience
  level: number;        // steps reached
  steps: RankStep[];
}

// Fix: the donor builds the steps by iterating the dictionary with no sort, so it relies on the
// YAML order. This sketch sorts the keys first.
function buildSteps(keys: number[], cost: number): RankStep[] {
  return [...keys].sort((a, b) => a - b).map((k, i) => ({ requiredXp: k * cost, rank: i + 1 }));
}

// Kill award: victim cost, then the victim's own percent modifiers, then the killer's modifiers
// including the kill-XP scale (10000 percent = x100 in the donor). Returns the amount to hand to the killer.
// Fix: the donor reassigns its own field `exp` here; this sketch uses a local so a second call cannot compound.
function killAward(victimCost: number, victimPcts: number[], killerPcts: number[]): number {
  const exp = applyPct(victimCost, victimPcts);
  return applyPct(exp, [...killerPcts, 10000]);
}

// Grant experience. Clamp to the top threshold, then grant every step reached (several levels can
// come from one award). Returns the ranks granted by this call.
function giveXp(e: RankState, amount: number): number[] {
  if (amount < 0) {
    throw new Error("Revoking experience is not implemented.");
  }
  if (e.steps.length === 0) {
    return [];
  }
  const top = e.steps[e.steps.length - 1].requiredXp;
  e.xp = Math.min(Math.max(e.xp + amount, 0), top);
  const granted: number[] = [];
  while (e.level < e.steps.length && e.xp >= e.steps[e.level].requiredXp) {
    granted.push(e.steps[e.level].rank);
    e.level++;
  }
  return granted;
}

// Rank multipliers are data rows (percent). Index 0 = green, 1 = veteran, 2 = elite.
// Values follow the TS mod's defaults, read from the YAML.
interface RankMods {
  firepowerPct: number;
  damagePct: number;     // applied to damage taken
  speedPct: number;
  reloadPct: number;
}

const RANK_MODS: RankMods[] = [
  { firepowerPct: 100, damagePct: 100, speedPct: 100, reloadPct: 100 },
  { firepowerPct: 110, damagePct: 90, speedPct: 120, reloadPct: 90 },
  { firepowerPct: 130, damagePct: 75, speedPct: 140, reloadPct: 75 },
];

// Warhead damage: raw damage x attacker firepower percents x versus-armour percent (one list, one truncation).
function warheadDamage(raw: number, firepowerPcts: number[], versusPct: number): number {
  return applyPct(raw, [...firepowerPcts, versusPct]);
}

// Victim take: the victim's damage percents apply only to positive damage (donor Health.cs 167),
// then HP is clamped to 0..max.
function victimHp(hp: number, maxHp: number, incoming: number, victimPcts: number[]): number {
  const take = incoming > 0 ? applyPct(incoming, victimPcts) : incoming;
  return Math.min(Math.max(hp - take, 0), maxHp);
}

// Self-heal trait: heal while below the threshold, after the damage cooldown, once per delay.
// The heal is a negative damage in the donor, so it does not reset the cooldown (only positive damage does).
interface HealRule {
  stepHp: number;
  percentStep: number;        // percent of max HP per step
  delayTicks: number;
  startIfBelowPct: number;
  damageCooldownTicks: number;
}

interface HealState {
  hp: number;
  maxHp: number;
  ticks: number;
  cooldown: number;
}

function healTick(s: HealState, r: HealRule): void {
  if (s.hp >= r.startIfBelowPct * s.maxHp / 100) {
    return;
  }
  if (s.cooldown > 0) {
    s.cooldown--;
    return;
  }
  s.ticks--;
  if (s.ticks <= 0) {
    s.ticks = r.delayTicks;
    const heal = r.stepHp + r.percentStep * s.maxHp / 100;
    s.hp = Math.min(s.hp + heal, s.maxHp);
  }
}

function onDamaged(s: HealState, r: HealRule, amount: number): void {
  if (amount > 0) {
    s.cooldown = r.damageCooldownTicks;
  }
}

// Usage check (not a test): a 200-cost unit killed by an equal-cost unit, then the victim's firepower.
const steps = buildSteps([500, 1000], 200);
const rs: RankState = { cost: 200, xp: 0, level: 0, steps };
const award = killAward(200, [], []);
const granted = giveXp(rs, award);
void granted;
const shot = warheadDamage(3600, [RANK_MODS[1].firepowerPct], 75);
void shot;
void victimHp(10000, 10000, shot, [RANK_MODS[2].damagePct]);
const hs: HealState = { hp: 5000, maxHp: 10000, ticks: 0, cooldown: 0 };
healTick(hs, { stepHp: 200, percentStep: 0, delayTicks: 100, startIfBelowPct: 100, damageCooldownTicks: 125 });
onDamaged(hs, { stepHp: 200, percentStep: 0, delayTicks: 100, startIfBelowPct: 100, damageCooldownTicks: 125 }, 1);
```

## 5. Lands in

- TARGET `src/fight/rank.ts` (proposed new module). Thresholds and rank modifier rows are catalogue data; the award, the clamp and the multi-level grant are engine logic (one engine, rule 1). Parity-checklist row 21 (catalogue fields). The kill award itself is the row 18 path (loot roll and XP award); this cell lands in row 21 because the rank ladder is the catalogue shape.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape only)
- Brief rule served: 1 (one engine: the award and the rank step live in the engine, the numbers are data); parity row 21.

## 6. Gaps and risks

- Kill credit goes to the actor that made the kill (GivesExperience.cs 67-72). Nothing splits credit across the three attackers (MAX_ATTACKERS = 3). Frankendom must decide the hate-list credit rule and record it in the one ledger.
- Kill XP is granted on the server's Killed event only. Frankendom's kills are server-verified, which fits; the client must not grant rank from its own view.
- Rank modifiers are client-visible rows. A rank that changes firepower or damage must be applied by the server (the one engine), not by the client's copy of the table.
- Integer truncation drops small hits: a 1-point hit at 50 percent becomes 0 (Util.cs 208-210). Frankendom needs a minimum of 1 damage for any raw hit above 0.
- Elite self-heal (ChangesHealth@ELITE) heals every 100 ticks after a 125-tick cooldown. In a three-on-one fight that is strong; it must be a zone or duel data flag, and the duel must not heal if the rules say no. Decide before porting.
- The HP scale in the donor's YAML (E2 HP 15000) is not explained in the files read; do not copy HP numbers until the unit scale is read (not read).
- Rank by kill count means a rank can be earned by killing weak targets. Frankendom's kill rule must weight by the victim's cost (as the donor does) or accept the cheap-kill farming.
- Not read: ReloadDelayMultiplier body, LevelUpCrateAction, DevCommands, PlayerExperience share, the Armor trait body. The FrozenDictionary order question is open until read.

## Reuse tag and rulings for Dom (max 3)

1. Should Frankendom ranks come from equal-cost kills (ts style: 5 kills to veteran, 10 to elite) or from odds in each fight (freeciv style)? Recommendation: kills, server-verified, with the cost-weighted award.
2. Use the ts rank numbers (firepower 110/130, damage taken 90/75, speed 120/140, reload 90/75) or the milder ra numbers? Recommendation: ts for a fast duel, tuned in playtests, as catalogue rows.
3. Should an elite self-heal in a duel? Recommendation: no in a duel; allow it only as a zone data flag.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine); parity row 21 (catalogue fields)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- ExperienceTrickler fires every Interval+1 ticks (`--ticks < 0`, reset to Interval), not every Interval.
- Health.InflictDamage applies two modifier loops (actor damageModifiers and player-level damageModifiersPlayer, 172-184); note listed only the actor's.
- Two truncations per hit (DamageWarhead/Util.cs 210, then Health.cs 186), not one; the sketch code already truncates twice, only its header text said one.
- Missed: Armament-side firepower modifiers and player-level damage modifiers as a second multiplier source; GivesBounty and InfantryExperienceHospitalOverrides not covered.
- Trivia: 'Armor Light at gdi-infantry 113-114' belongs to a different unit (jumpjet, HP 12000); harmless as an example.
- Everything else verified (GainsExperience, GivesExperience, ChangesHealth, YAML numbers, licence, as-data shape, honest no-history).

Fixed 2026-10-12: trickler interval (Interval+1) in mechanism and table; victim modifier text now names both loops; two truncations stated in mechanism and sketch header; added Armament-side firepower modifier mention. TypeScript sketch code unchanged (it already truncates per stage), so no typecheck needed.
