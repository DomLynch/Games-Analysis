# Open-RSC-Core-Framework (character-stats-skills, cell 1)

Donor: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/util/rsc/Formulae.java` (with `SpellHandler.java`, `ObjectFishingDef.java`, `Player.java`) | Licence: GNU AGPL v3 (LICENSE file, "Version 3, 19 November 2007") | Java | symbols `castSpell`, `failCalculation`, `interp`, `cascadeInterp`

Checked: Read in full: `castSpell` (Formulae 209-229), `failCalculation` (318-323), `interp` (369-373), `cascadeInterp` (383-395), `calcGatheringSuccessfulLegacy` (332-343), `calcProductionSuccessfulLegacy` (349-360), `getCombatLevel` (424-444), `combatExperience` (236-242), `rangedHitExperience` (256-276), `DataConversions.random` (493-495). Callers: `castSpell` has one caller (SpellHandler 230, read as the check only); `cascadeInterp` has one caller (ObjectFishingDef 95); `failCalculation` callers read: LegendsQuestGameObjects 371 and LegendsQuestGujuo 1156. Confidence high on the formulas (hand-checked with example numbers); medium on consumers. Not read: the rest of SpellHandler.process (rune cost on a cast), Player.canCast (the gate that reads `lastSpellCast`), the other fishing caller paths and which spots set `cascade == 1`, the woodcutting consumer. camera_scope: not applicable.

Best transferable idea: One level-gap chance curve for spell fizzles and skill steps (chance rises with the gap between the character's level and the requirement, a gear bonus can guarantee success at a set gap, a failed cast locks out for 20 s), plus a cumulative-outcome table for competing drops.
Decision (proposed): adapt - the curve shape and the cascade table fit a fast fight and loot tables; Frankendom keeps the chance rules as data, names the check for what it returns, and sorts competing outcomes itself (the donor relies on data order).
Acceptance: A server test asserts castChance(gap 0, focus 0) = 0.80, castChance(gap 10, focus 0) = 1.00 and castChance(gap 5, focus 30) = 1.00; a failed cast sets a 20000 ms wait-gate in engine state; a three-outcome table over 10,000 seeded rolls matches its cumulative probabilities within sampling error.

## 1. Mechanism

- Magic (spell fizzle). The caller `spellSuccessCheck` (SpellHandler 230) passes the caster's level for the spell's magic skill and `getMagicPoints()` (gear magic bonus, minimum 1; Player 1642). `castSpell` (Formulae 209-229) runs in this order: (a) `levelDiff = magicLevel - req`; (b) gear guarantee tiers: bonus 30 with gap 5, 25/6, 20/7, 15/8, 10/9 each return a certain cast (212-221); (c) gap below 0 returns a certain fizzle (222-224); (d) gap 10 or more returns a certain cast (225-227); (e) otherwise the cast passes when `random(0, (gap+2)*2) != 0` (228). So success chance = n/(n+1) with n = (gap+2)*2.
- Magic fizzle side effects (SpellHandler 230-236): message "The spell fails! You may try again in 20 seconds", sound "spellfail", `setSpellFail()`, `resetPath()`, return false. `setSpellFail` sets `lastSpellCast = now + 20000` (Player 2902-2904), which pushes the next allowed cast 20 s out.
- Skill checks (`failCalculation`, Formulae 318-323). Same shape: gap below 0 fails; gap 20 or more passes; otherwise passes when `random(0, gap+1) != 0`, i.e. (gap+1)/(gap+2). Note the name: the function returns true on success, and call sites read it as `if (failCalculation(...)) { success }` (LegendsQuestGameObjects 371 and 421, LegendsQuestGujuo 1156).
- Level curve (`interp`, Formulae 369-373). For a chance pair (low, high) out of 256: value = floor(low*(99-L)/98) + floor(high*(L-1)/98) + 1, then value/256 clamped to 0..1. It is a straight line from about low/256 at level 1 to high/256 at level 99 (the +1 shifts both ends by 1/256). Consumers: woodcutting precomputes one rate per level (ObjectWoodcuttingDef 109 reads one tier; the others not read), fishing in independent mode (ObjectFishingDef 106), and a quest plugin (Tourist_Trap_Mechanism 290, 297, args 61/245 and 61/254 from grep).
- Competing outcomes (`cascadeInterp`, Formulae 383-395). For outcome index k with bands sorted highest requiredLevel first: walk the bands; each earlier band the player qualifies for multiplies the running chance by (1 - its chance); at band k return running x its own chance. So the result is P(outcome k is the one produced). The doc comment (378) says order matters.
- Fishing table (ObjectFishingDef 88-108). With `cascade == 1` (90), each species' rate[L] is the running sum of cascadeInterp over the species list (95-96), so a species' stored rate is P(this species or one earlier in the list). With cascade off (106), each species has an independent interp rate. The big-net consumer (Fishing 398-407) rolls each fish's rate against `Math.random()`, one roll per fish (mackerel gets two), which is the independent reading. Rate tables are precomputed for levels 0..142 (ObjectFishingDef 81).
- Reading of the mismatch: the consumer does not check the cascade flag, so it treats whatever table it gets as independent (see section 6).
- Tick: none. These are one-shot checks at action time, not a per-tick loop.

## 2. Key functions

- `castSpell`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/util/rsc/Formulae.java` 209-229 (gear tiers, gap rules, fizzle roll).
- `spellSuccessCheck` (caller): `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/rsc/handlers/SpellHandler.java` 229-236 (only the check and the fail branch read).
- `failCalculation`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/util/rsc/Formulae.java` 318-323.
- `interp`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/util/rsc/Formulae.java` 369-373.
- `cascadeInterp`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/util/rsc/Formulae.java` 383-395.
- Fishing rate table build: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/external/ObjectFishingDef.java` 80-108.

## 3. Numbers vs mechanism (stat and skill table, SK focus)

| Stat or skill | What it does | Formula | Number ranges (typical) | Caps (soft/hard) | file:line |
|---|---|---|---|---|---|
| Spell cast chance (magic) | Fizzle roll on each cast | gap d = caster level - spell req; d<0 fail; d>=10 pass; else n/(n+1), n = 2(d+2) | d=0: 0.800; d=4: 0.923; d=9: 0.957; d>=10: 1.000 | hard 1.000 at d>=10; hard 0 at d<0 | Formulae.java:209-229; SpellHandler.java:230 |
| Gear guarantee tiers (magic bonus) | Gear magic bonus can make a cast certain | bonus>=30 and d>=5, or >=25/d>=6, >=20/d>=7, >=15/d>=8, >=10/d>=9: pass | 5 tiers, bonus 10-30, gap 9-5 | hard 1.000 | Formulae.java:212-221 |
| Magic bonus input | Equipment magic bonus fed to the cast | max(equipment magic, 1) | min 1; max not read | none seen | Player.java:1642 |
| Fizzle lock-out | Wait after a failed cast | lastSpellCast = now + 20000 ms | 20 s | fixed (enforcement check not read) | Player.java:2902-2904; SpellHandler.java:231 |
| Skill check chance (failCalculation) | Pass chance for a skill step | d<0: 0; d>=20: 1; else (d+1)/(d+2) | d=0: 0.500; d=5: 0.857; d=19: 0.952 | hard 1.000 at d>=20 | Formulae.java:318-322; LegendsQuestGameObjects.java:371; LegendsQuestGujuo.java:1156 |
| Level curve (interp) | Per-object success chance by level | floor(low*(99-L)/98) + floor(high*(L-1)/98) + 1, over 256, clamp 0..1 | low 61, high 245 (Tourist_Trap example): L1 0.242, L50 0.598, L99 0.961 (hand computed) | clamp 0..1 | Formulae.java:369-373 |
| Competing outcomes (cascadeInterp) | Chance that outcome k is produced | product over earlier qualifying bands of (1 - p), times p_k | cumulative table: running sum, ends at most 1 | bands must be highest requiredLevel first (doc only) | Formulae.java:383-395; ObjectFishingDef.java:90-96 |
| Fishing rate table | Precomputed rate per level | rate[L], L = 0..142 | maxLevelToCalcFor = 143 | table ends at 142 | ObjectFishingDef.java:81-106 |
| Gathering legacy threshold | Gather success (legacy) | roll 1..128; threshold = clamp(L + bonus + 40 - floor(1.5 x req), 1, 127); pass if roll <= threshold; L < req fails | req 1, L 1, bonus 0: threshold 40 of 128 (31%) | floor 1, cap 127 | Formulae.java:332-342 |
| Production legacy threshold | Craft or cook success (legacy) | roll 1..256; threshold = min(cap, floor(64 + (L-1) x 19200/(stopFail x 98))); L < req fails | at L 1: 64 of 256 (25%); cap 256 or 256 - minFail | cap 256 or 256 - minFail | Formulae.java:349-359 |
| Prayer points pool | Mental resource derived from a stat | prayer points = prayer level x 120 on normalise | 120 (level 1) to 11880 (level 99) | none | Skills.java:351-352 |
| Combat level | Single power rating | melee branch: (att+str + def+hits)/4 + (pray+magic)/8; ranged branch when att+str < 1.5 x range | min 3 (all 1, hits 10); max 123 (hand computed, not run) | none | Formulae.java:424-444 |
| Combat XP per kill | XP for a kill | NPC: combatLevel x 2 + 20; player: combatLevel + 10 | level 3 NPC gives 26 | none | Formulae.java:236-242 |
| Ranged XP per hit | XP per hit (only if enabled for NPC targets) | 16 per damage, divided by 3, rounded by a roll; damage capped to target hits left | 16/3 per damage on average | capped to target hits remaining | Formulae.java:259-276 |
| XP curve | Level from XP | original RSC table; level 2 at 332 (332/4 = 83, the classic figure: inference) | levels 1..99 (array length = limit) | experience cap off by default (config) | constants/Skills.java:38-41, 193, 199; Skills.java:217-218; ServerConfiguration.java:445 |

## 4. TypeScript sketch

simplified: keeps the donor's chance rules and the cascade walk, with three changes. It names the skill check for what it returns (true on success). It sorts the outcome bands itself (the donor relies on data order) and returns 0 when the level is below the outcome's own requirement (the donor leaves that to the caller). It omits the caller and its message, sound and path reset, the rune cost, the per-level precompute (the sketch computes on demand), the independent-roll fishing mode, the mackerel double roll, the `Math.random` consumer, and the 20 s timer enforcement. Donor constants (tiers, 20 s, 20-level skill gap, 10-level cast gap) are kept as they are.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Units: a chance is a number 0..1. Donor rates are integers out of 256.

export interface Band {
  lowRate: number;      // chance at level 1, out of 256 (donor data)
  highRate: number;     // chance at level 99, out of 256 (donor data)
  requiredLevel: number;
}

// Linear chance by level, 1..99 (donor interp).
export function levelChance(low: number, high: number, level: number): number {
  const value = Math.floor((low * (99 - level)) / 98) + Math.floor((high * (level - 1)) / 98) + 1;
  return Math.min(Math.max(value / 256, 0), 1);
}

// Spell survival. levelDiff = caster level minus spell requirement; focusBonus = gear magic bonus.
const GUARANTEE_TIERS: ReadonlyArray<{ bonus: number; gap: number }> = [
  { bonus: 30, gap: 5 },
  { bonus: 25, gap: 6 },
  { bonus: 20, gap: 7 },
  { bonus: 15, gap: 8 },
  { bonus: 10, gap: 9 },
];

export function castChance(levelDiff: number, focusBonus: number): number {
  for (const t of GUARANTEE_TIERS) {
    if (focusBonus >= t.bonus && levelDiff >= t.gap) return 1;
  }
  if (levelDiff < 0) return 0;
  if (levelDiff >= 10) return 1;
  const n = (levelDiff + 2) * 2; // donor: random(0, n) is nonzero in n of n+1 outcomes
  return n / (n + 1);
}

// Skill check (donor failCalculation; the donor returns true on SUCCESS despite its name).
export function skillCheckChance(levelDiff: number): number {
  if (levelDiff < 0) return 0;
  if (levelDiff >= 20) return 1;
  const n = levelDiff + 1;
  return n / (n + 1);
}

// Competing outcomes (e.g. fish species). Chance that outcome `index` is the one produced.
// Higher requiredLevel bands are checked first; each band the player qualifies for must miss before the next.
export function cascadeChance(bands: Band[], level: number, index: number): number {
  const target = bands[index];
  if (level < target.requiredLevel) return 0;
  const ordered = [...bands].sort((a, b) => b.requiredLevel - a.requiredLevel);
  let rate = 1;
  for (const band of ordered) {
    if (band === target) return rate * levelChance(band.lowRate, band.highRate, level);
    if (level >= band.requiredLevel) rate *= 1 - levelChance(band.lowRate, band.highRate, level);
  }
  return 0;
}

// Donor: a failed cast sets lastSpellCast = now + 20000 (a 20 s lock-out).
export const FAIL_LOCK_MS = 20000;

export {};
```

## 5. Lands in

- TARGET `src/fight/skillcheck.ts` (new module): spell fizzle, skill-step chance and competing-outcome picks, all server-side. Parity-checklist row 21 (catalogue fields): the chance pairs, gap rules and lock-out become catalogue fields rather than constants in the function.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only, shape and numbers as data, no lines copied)
- Brief rule served: 1 (one engine, one roll path, server-verified outcomes); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0: clean-room only. Numbers are donor constants that a designer would tune; keep them as data, not as copied code.
- Defect 1 (naming): `failCalculation` returns true on success (Formulae 318-322; call sites 371 and 1156 use it as success). Fix: name the Frankendom check for what it returns (`skillCheckPasses`), as the sketch does.
- Defect 2 (order): `cascadeInterp` needs bands highest requiredLevel first (Formulae 378), but the fishing caller builds `bounds` in data order with no sort (ObjectFishingDef 88-95). Fix: sort in the engine (the sketch does) and test with a shuffled list.
- Defect 3 (mode mismatch): the big-net consumer rolls each species' rate as independent (Fishing 407), while a `cascade == 1` table stores running sums (ObjectFishingDef 95-96). Which spots set `cascade` was not read; a big-net spot with cascade on would have its running-sum rates rolled as if independent. Fix: one flag per table in Frankendom and one consumer per flag.
- Defect 4 (comment): `getMagicPoints` comment says "prayer" but returns the magic bonus (Player 1641-1642). No behaviour change; fix the comment if copied.
- Lock-out enforcement: `setSpellFail` only writes a future timestamp (Player 2902-2903); the check that reads it was not found in the lines read. Frankendom puts the wait-gate in engine state, so the client cannot skip it.
- Luck (secondary, not this note's mechanism): the donor has no luck stat. Its only luck mechanic is a pity counter for one drop (BadLuckMitigation 11, 35-36; NpcDrops 1765-1776; DropTable 146-149; Npc 512). It is a Frankendom loot candidate, not a skill-check idea. Defect: the step table is a `HashMap<Integer,Integer>` read by `entrySet()` with "first key >= kills wins" (BadLuckMitigation 35-36). By reasoning on OpenJDK bucket order (not run: no Java on the VPS PATH), iteration visits keys 2000, 4000, MAX, 2500, 4500, 3000, 5000, 3500. So kills 2001-4000 all get the 4000 step (101) instead of 2, 9, 31 or 101, and kills 4001-5000 get the MAX step (3320) instead of 326 or 1041. Fix: keep the steps in a sorted array and take the first step with kills <= threshold.
- Frankendom rulings: the roll runs on the server and its seed goes into the fight record (checklist row 19); the wait-gate lives in engine state (one ledger); the fizzle text is client-only (HUD, row 14). The check does not touch MAX_ATTACKERS = 3 or targeting.
