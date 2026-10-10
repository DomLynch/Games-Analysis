# scummvm-scummvm (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/dm/champion.cpp` (with `group.cpp`, `dm.cpp`, `dm.h`, `champion.h`, `dungeonman.cpp`, `dungeonman.h`, `/mnt/frankendom-donors/scummvm-scummvm/common/util.h`) | Licence: GPL version 3 or any later version (`engines/dm/champion.cpp` header lines 9-10; the header also names ScummVM as GPL-licensed code; COPYING not read) | C++ | symbol `GroupMan::getChampionDamage`

Checked: The list's hint file (`champion.cpp`) is the right home for the pending-damage pipeline; the creature attack that feeds it is in `group.cpp`. Read in full: `champion.cpp` 757-844 (addPendingDamageAndWounds_getDamage), 845-884 (getWoundDefense), 887-900 (getStatisticAdjustedAttack), 1077-1088 (getDamagedChampionCount), 1107-1125 (getDexterity, isLucky), 1399-1486 (applyAndDrawPendingDamageAndWounds); `group.cpp` 1665-1712 (the dodge, wound, attack and damage steps and the poison call); `dm.cpp` 250-252 (getScaledProduct), 404-410 and 440-465 (the game loop around the apply call); `dungeonman.cpp` 1774-1779 (getArmourDefense); `common/util.h` 69 (CLIP argument order). Not read: `group.cpp` 1650-1664 (function header locals), `championKill`, `wakeUp`, `getMaximumLoad`, `getSkillLevel`, `setFlag`/`clearFlag`, `championPoison` body, the rest of the `DMEngine::gameloop` loop body. Callers of `addPendingDamageAndWounds_getDamage` and `getDamagedChampionCount` were found by grep (`champion.cpp` 750 and 1132, `eventman.cpp` 1026-1028, `group.cpp` 1698, `projexpl.cpp` 203, `movesens.cpp` 333, `timeline.cpp` 406, `projexpl.cpp` 334 and 546); only `group.cpp` 1698 was read in context. Confidence high on the creature-to-champion chain and the apply pass; medium on the non-normal attack types (read the switch, not each helper). Camera: not applicable. Depth is thin because the helpers listed above were not read.

## 1. Mechanism

- A creature swing on one champion is resolved in `GroupMan::getChampionDamage` (group.cpp 1650-1712) and then handed to the champion pipeline. Order of steps as the code runs:
  - (a) Dodge gate (group.cpp 1665-1669). Let `doubledMapDifficulty` be map difficulty times two (1666). If the party is asleep, the swing lands. Otherwise it lands when `getDexterity(champ) < rand(32) + creature dex + doubled difficulty - 16`, or when `!rand(4)` (a 1-in-4 roll), and then only if `isLucky(champ, 60)` is false (1669). `getDexterity` (champion.cpp 1107-1113) is `rand(8) + dex`, reduced by carried load and halved for sleep, then passed through `CLIP(1 + rand(8), dex >> 1, 100 - rand(8))`. `CLIP` takes the value first (util.h 69), so the result is at least the half-dexterity floor; the `1 + rand(8)` term only matters when that floor is below 9.
  - (b) `isLucky(champ, percentage)` (champion.cpp 1116-1124). With probability one half and `rand(100) > percentage`, it returns true and does not touch luck (1117). Otherwise it rolls `rand(luck) > percentage` (1121), returns that, and moves the Luck stat by minus 2 on a lucky result and plus 2 otherwise, clipped to its min and max. So a 60 percent threshold dodges roughly 19.5 percent of the time on the first branch, plus a luck-based chance.
  - (c) Wound area (group.cpp 1671-1681). `woundTest = rand(65536)`. If `woundTest & 0x0070` (seven of eight values), the low nibble is compared with the creature's packed probability nibbles, stepping one nibble at a time, and the index picks a mask from `{32, 16, 8, 4}` (1651, 1679). Otherwise `allowedWound = woundTest & 0x0001` (1681), which the donor comment names ready hand or action hand.
  - (d) Attack value (group.cpp 1683-1698). `attack = rand(16) + creature attack + doubled difficulty - 2 x parry level`. If `attack <= 1`: a coin flip returns zero (no damage), else `attack = rand(4) + 2` (1684-1688). Then the shaping rolls: halve, add `rand(attack) + rand(4)`, add `rand(attack)`, quarter, add `rand(4) + 1`, and on a coin flip subtract `rand((attack >> 1) + 1) - 1` (1691-1696).
  - (e) Hand-off (group.cpp 1698). `addPendingDamageAndWounds_getDamage(champ, attack, allowedWound, creature attack type)`. If the damage is nonzero, a champion-damaged sound is queued and, with the creature's poison attack and a coin flip, the poison attack is scaled by vitality and sent to `championPoison` when above zero (1699-1712, read in part).
- The champion pipeline, `addPendingDamageAndWounds_getDamage` (champion.cpp 757-842):
  - Returns 0 if `attack <= 0` or the champion has no health (758-762).
  - Non-normal attack types only (765; `kDMAttackTypeNormal` is 0, champion.h 340): the wound defence is the average of `getWoundDefense` over the allowed wound slots (766-775). Per type: psychic scales by `115 - wisdom` and skips the later scaling; magic subtracts the spell-shield defence after an antimagic adjustment and skips scaling; fire applies an antifire adjustment and subtracts the fire-shield defence; self halves the defence. Otherwise (default) the attack is scaled: `attack = (attack * (130 - defence)) >> 6` (810, via `getScaledProduct`, dm.cpp 251). If that is zero or less, return 0 (821-822).
  - Vitality threshold: `adjusted = getStatisticAdjustedAttack(vitality, rand(128) + 10)` (824). In `getStatisticAdjustedAttack` (887-900), `factor = 170 - stat`; if `factor < 16` the result is `attack >> 3`, else `(attack * factor) >> 7`.
  - Wound roll: if `attack > adjusted` (825), a do-loop sets `1 << rand(8)` masked by the allowed wounds into the pending wound mask, then doubles `adjusted` and repeats while `attack > adjusted` and `adjusted` is nonzero (833-835). So each doubling of the threshold gives one more chance at a wound bit.
  - If the party is asleep, `wakeUp()` runs (838-839). The pending damage is then added: `_championPendingDamage += attack` (841), and the attack is returned.
  - Normal attacks (type 0) skip the whole block: no wound defence, no vitality threshold, no wounds, no scaling. The raw attack goes straight into the pending damage.
- Wound defence per slot, `getWoundDefense` (845-884). A factor table `{5, 5, 4, 6, 3, 1}` (846) weights the armour-shield contributions (855-861). Then `rand((vitality >> 3) + 1)`, halved for sharp defence (865-867), plus action defence, shield defence, the party shield defence and the armour shield term (869). For body slots, the armour defence is added (870-874). A wounded slot loses `8 + rand(4)` (879). Sleep halves it (881). Result: `CLIP(defence >> 1, 0, 100)` (884). Armour defence is the `_defense` field of the armour info (`DungeonMan::getArmourDefense`, dungeonman.cpp 1774-1779); it is scaled by `getScaledProduct(defense, 3, sharp + 4)` only when sharp defence is requested (1776-1777).
- Area attacks, `getDamagedChampionCount` (1077-1088). `randomMax = (attack >> 3) + 1` (1078). Each champion index from the first to the party count gets `addPending(MAX(1, attack - randomMax + rand(2 x randomMax)))` (1078-1085), so each champion rolls about attack plus or minus attack/8. The function returns how many champions took a nonzero amount.
- Apply pass, `applyAndDrawPendingDamageAndWounds` (1399-1486). For each champion: the pending wound mask is set on the champion first (1406-1407), then the pending damage is cleared; if it was zero, skip (1410-1412); if health is zero, skip (1414-1416). Health drops by the pending damage (1420). Health zero or below calls `championKill` (1422-1423). Otherwise the health is stored, the statistics and wound flags are marked for redraw, the damage number is drawn, and a hide-damage timeline event is set or moved to `_gameTime + 5` (1472, 1477).
- Timing. The apply pass is called once per pass of `DMEngine::gameloop`'s `while (true)` loop (dm.cpp 407, 459). `_gameTime++` follows at 463 (after a dead-party check at 460-461). Damage from every source in the pass is summed first and applied at that point. The rest of the loop body (timeline and input handling before line 459) was not read.

## 2. Key functions

- `GroupMan::getChampionDamage`: `/mnt/frankendom-donors/scummvm-scummvm/engines/dm/group.cpp` 1650-1712. Read from 1665 to 1712; the header locals 1650-1664 were not read.
- `ChampionMan::addPendingDamageAndWounds_getDamage`: `/mnt/frankendom-donors/scummvm-scummvm/engines/dm/champion.cpp` 757-842. Read in full.
- `ChampionMan::getWoundDefense`: `champion.cpp` 845-884. Read in full.
- `ChampionMan::getStatisticAdjustedAttack`: `champion.cpp` 887-900. Read in full.
- `ChampionMan::getDamagedChampionCount`: `champion.cpp` 1077-1088. Read in full.
- `ChampionMan::getDexterity` and `isLucky`: `champion.cpp` 1107-1125. Read in full.
- `ChampionMan::applyAndDrawPendingDamageAndWounds`: `champion.cpp` 1399-1486. Read in full (drawing code skimmed).
- Game loop call site: `dm.cpp` 404-465 (partial).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One swing value from one roll plus attack and difficulty, minus twice parry | `rand(16) + attack + 2 x difficulty - 2 x parry` (theirs, group.cpp 1683) |
| Weak swing becomes a coin flip to nothing, else a floor of 2 to 5 | `rand(2)` then `rand(4) + 2` (theirs, group.cpp 1684-1688) |
| Dodge gate: a dexterity roll that the creature beats, or a 1-in-4 roll, then a luck escape | `rand(32) + creature dex + 2 x difficulty - 16` (theirs, group.cpp 1669); luck percentage 60 (theirs, 1669) |
| Defence multiplies the attack (more defence, less damage) | `attack x (130 - defence) >> 6` (theirs, champion.cpp 810; getScaledProduct, dm.cpp 251) |
| Wound defence: random vitality term plus gear, minus 8 plus rand(4) if wounded, clipped 0..100 | `rand((vit >> 3) + 1)`, `8 + rand(4)`, `CLIP(x >> 1, 0, 100)` (theirs, champion.cpp 865, 879, 884) |
| Vitality threshold, one wound roll per doubling | `rand(128) + 10` (theirs, champion.cpp 824); `1 << rand(8)` masked (834-835) |
| Stat scaling: factor 170 minus stat | `170 - stat`, below 16 gives `>> 3`, else `x factor >> 7` (theirs, champion.cpp 888-900) |
| Area spread about attack/8 | `randomMax = (attack >> 3) + 1` (theirs, champion.cpp 1078) |
| Pending ledger applied once per pass, hide event 5 ticks later | `_gameTime + 5` (theirs, champion.cpp 1472) |

## 4. TypeScript sketch

simplified: the sketch keeps the order of the creature chain (dodge, wound area, attack shaping, hand-off) and of the apply pass, but it takes the defence average and the dexterity value as inputs, so their random draws happen in a different order from the donor (the donor computes them inside the call). It omits the psychic, magic, fire and self scaling branches (it applies the default scaling only), the sharp-defence halving, the armour-shield and body-armour terms of the wound defence, `wakeUp`, `championKill` and the drawing code, the debug god-mode flag, poison, and the sound and timeline calls. It adds a clamp of the wound nibble walk to index 3, which the donor loop does not have, and treats zero or less health as dead where the donor tests only zero. The donor's normal attack type skips the defence and wound path; the sketch keeps that bypass (`ATTACK_NORMAL`). The random source is a parameter, so a seeded run replays.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
export type Rng = (n: number) => number; // integer in [0, n)

export const ATTACK_NORMAL = 0;          // normal attacks skip defence, vitality and wounds
export const WOUND_MASKS = [0x20, 0x10, 0x08, 0x04]; // indexed by probability step (donor table)

export interface Champion {
  vitality: number;        // current stat
  health: number;
  wounds: number;          // bit mask of wounds already applied
  pendingDamage: number;   // summed over the pass
  pendingWounds: number;   // bit mask collected over the pass
}

// Creature swing value after the dodge gate (shape of GroupMan::getChampionDamage).
export function creatureSwing(creatureAttack: number, difficulty: number, parry: number, rng: Rng): number {
  let attack = rng(16) + creatureAttack + difficulty * 2 - parry * 2;
  if (attack <= 1) {
    if (rng(2)) return 0;
    attack = rng(4) + 2;
  }
  attack = attack >> 1;
  attack += rng(attack) + rng(4);
  attack += rng(attack);
  attack = attack >> 2;
  attack += rng(4) + 1;
  if (rng(2)) attack -= rng((attack >> 1) + 1) - 1;
  return attack;
}

// Dodge gate: a sleeping party always takes the swing; otherwise it lands if the
// dexterity roll fails or a 1-in-4 roll fires, unless the champion dodges by luck.
export function swingLands(
  dexHalf: number, creatureDex: number, difficulty: number, sleeping: boolean,
  isLucky: () => boolean, rng: Rng,
): boolean {
  if (sleeping) return true;
  const beatsDex = dexHalf < rng(32) + creatureDex + difficulty * 2 - 16;
  return (beatsDex || rng(4) === 0) && !isLucky();
}

// Wound area: 7 in 8 draws use the creature's packed probability nibbles; the rest give a hand wound.
export function woundMask(woundTest: number, packedProbs: number): number {
  if (woundTest & 0x0070) {
    const t = woundTest & 0x000f;
    let p = packedProbs;
    let i = 0;
    while (t > (p & 0x000f) && i < 3) { p = p >> 4; i++; }
    return WOUND_MASKS[i];
  }
  return woundTest & 0x0001;
}

// Vitality-style scaling: factor = 170 - stat; very high stats give a tiny value.
export function statAdjusted(attack: number, stat: number): number {
  const factor = 170 - stat;
  if (factor < 16) return attack >> 3;
  return Math.floor((attack * factor) / 128);
}

// Pending damage for one champion (shape of addPendingDamageAndWounds_getDamage).
export function addPending(
  c: Champion, attack: number, allowedWounds: number, attackType: number, defence: number, rng: Rng,
): number {
  if (attack <= 0 || c.health <= 0) return 0;
  if (attackType !== ATTACK_NORMAL) {
    attack = Math.floor((attack * (130 - defence)) / 64);
    if (attack <= 0) return 0;
    let adjusted = statAdjusted(rng(128) + 10, c.vitality);
    if (attack > adjusted) {
      do {
        c.pendingWounds |= (1 << rng(8)) & allowedWounds;
        adjusted = adjusted << 1;
      } while (attack > adjusted && adjusted !== 0);
    }
  }
  c.pendingDamage += attack;
  return attack;
}

// Defence of one wound slot: random vitality term plus gear, minus a penalty when already wounded.
export function woundDefence(
  vitality: number, actionDefence: number, shieldDefence: number, armourDefence: number,
  wounded: boolean, rng: Rng,
): number {
  let d = rng((vitality >> 3) + 1) + actionDefence + shieldDefence + armourDefence;
  if (wounded) d -= 8 + rng(4);
  return Math.min(Math.max(d >> 1, 0), 100);
}

// Area attack: each champion rolls attack +/- about attack/8, never below 1.
export function splashPerChampion(attack: number, rng: Rng): number {
  const m = (attack >> 3) + 1;
  return Math.max(1, attack - m + rng(2 * m));
}

// End-of-pass apply: wounds are kept first, then health drops; zero or less is a kill,
// otherwise a hide-damage event is due five ticks later.
export function applyPass(c: Champion, now: number): { killed: boolean; hideAt: number | null } {
  c.wounds |= c.pendingWounds;
  const dmg = c.pendingDamage;
  c.pendingWounds = 0;
  c.pendingDamage = 0;
  if (!dmg || c.health <= 0) return { killed: false, hideAt: null };
  c.health -= dmg;
  if (c.health <= 0) return { killed: true, hideAt: null };
  return { killed: false, hideAt: now + 5 };
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (the one place health changes: the pending ledger, applied once per server tick; the defence scaling; the area spread for splash effects). Parity-checklist row 1 (duel step / sim). The end-of-pass apply is server-tick work and is not claimed by this note.
- today: `src/combat.ts` (moving).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: sum every hit a target takes in a tick into one pending ledger, decide the kill once at the end of the pass, and scale raw attack by a defence multiplier rather than subtracting it.
Decision (proposed): adapt — adopt the pending-ledger apply pass and the defence-multiplier shape (fits one ledger and server-verified kills); reject the per-body-part wound flags (Frankendom's wounds are cosmetic, row 8) and the normal-type bypass that skips armour, since our one-rule damage path should not have a silent exemption; if a damage type needs to bypass defence, it becomes an explicit data field.
Acceptance: a server test lands two creature swings on one champion inside one tick; health drops once at the end of the tick by the sum, the kill is decided at that apply, and the client shows one damage number for that champion for the tick.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line was translated.
- The donor's creature damage depends on which creature attack type is set. A `normal` type skips defence, vitality and wounds (champion.cpp 765 and the block to 841). Whether real creature data uses that type a lot was not checked; the note describes only what the code does.
- The donor's pending wound mask is set before the pending damage is checked (1406-1407), so a wound can apply on a pass with no damage. Frankendom must decide whether wounds need damage.
- The dexterity term is an accident of argument order: `CLIP(1 + rand(8), dex >> 1, 100 - rand(8))` (champion.cpp 1113, util.h 69) returns the half-dexterity floor for most stats. Do not port the random term as a design; if we want a dexterity spread, make it an explicit roll.
- Wound nibble order: `dungeonman.h` 321 says Head 15-12, Legs 11-8, Torso 7-4, Feet 3-0; the loop reads the low nibble first and `{32, 16, 8, 4}` maps index 0 to the feet mask (group.cpp 1651). The comment and the mask order were not reconciled; the sketch uses the mask order as coded.
- The 130 - defence scaling caps reduction at about half (defence 100 gives x 30/64), and defence 0 gives x 130/64 (about double). Frankendom's MAX_ATTACKERS = 3 means three creature swings can stack on one champion in one tick, so the ledger's total matters for balance; any cap is a zone-data number, not an engine rule.
- Frankendom has one engine and server-verified kills; the donor's kill decision is in the apply pass (1422-1423) and its random source is the game RNG. The sketch takes the RNG as a parameter so a seeded fight replays.
- The donor's hide-damage event is client feedback (drawing and timeline). Keep it in the client; the engine only records the ledger.

