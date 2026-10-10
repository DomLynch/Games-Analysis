# swgemu-Core3 (progression, cell 10)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/player/PlayerObjectImplementation.cpp` | Licence: AGPL-3.0 (per-file header says "See file COPYING"; COPYING read at the repo root: GNU Affero GPL v3) | C++ | symbol `PlayerObjectImplementation::addExperience`

Checked: `PlayerObjectImplementation::addExperience` 728-785 (read in full). `PlayerManagerImplementation::awardExperience` 2601 (read to its return). `SkillManager::updateXpLimits` 788 (read in full). `SkillManager::awardSkill` 326 and `SkillManager::canLearnSkill` 838 (read). `SkillManager::surrenderSkill` 500 (read to the point-refund at 587). camera_scope not applicable. Confidence: high for the XP ledger, the cap rebuild and the purchase path; medium for the cap-missing-key edge case (see section 6). Not read: `VectorMap` (not in the donor, so what `get` returns for a missing key is unknown); the client file `datatables/skill/xp_limits.iff` (not in the donor, so the runtime default caps are unverified). Callers: I read the award wrapper (2630), the two SkillManager callers (370, 833); the Lua entry `LuaCreatureObject::awardExperience` was seen only by grep (1026-1032); I did not read the remaining call sites seen by grep (around 25).

## 1. Mechanism

- One function writes every XP change: `addExperience`. It keeps one ledger per XP type (`experienceList`). Order of steps as the code runs: (a) a zero gain returns at once (near the top of the function, not line-cited); (b) if the type already exists and the new total is 0 or below, the type is removed entirely and the call returns 0 (744-748), except `jedi_general`, which may go negative to a floor of -10000000 (750-751); (c) the cap: `prestige_` types are uncapped (760-761), otherwise the cap-list entry is used, otherwise 2000 (762-763); (d) the total is clamped to the cap (765-767); (e) the stored total is set, and the return value is the gain actually added (784); when the total was clamped, that value is set at 767 as `xpCap - (xp - valueToAdd)`, i.e. cap minus the old total.
- Award path (`PlayerManagerImplementation::awardExperience`, 2601): when `applyModifiers` is true (2624-2633), the raw amount is multiplied by the species modifier (only when the amount is positive), the buff multiplier (food `xp_increase` percent, not during a crafting session, 2617-2618), the local multiplier passed by the caller, and the global multiplier, then truncated to an int (2630); when `applyModifiers` is false the raw amount is added unscaled (the Lua entry passes false and a local multiplier of 1.0, LuaCreatureObject.cpp 1026-1034). Species modifier is `(100 + bonus) / 100` for the species and XP type, falling back to the species' `all` entry, and to 1.0 when unset (7102-7111). The award calls `addExperience` (2630). A cap-hit message (`prose_hit_xp_cap`) is sent only from this wrapper, when `sendSystemMessage` is set, the award is positive and the type is now at its cap (2651).
- Cap table, rebuilt by `SkillManager::updateXpLimits` (788): clear the cap list; for each owned skill box with a non-zero cap, put or raise the cap for its XP type to the max (811); then add the default caps loaded from the client file (822, loaded at 202-222) for any type not yet present; then, for each ledger entry above its cap, call `addExperience` with a negative delta to clamp it down (831-833). Callers seen: the load path (`CreatureObjectImplementation.cpp` 2476), and after a learn and a surrender (the calls at 403, 620 and 754 are in SkillManager).
- Purchase, `SkillManager::awardSkill` (326): recursively awards required skills if asked; `canLearnSkill` (838) checks: not already owned (not line-cited), prerequisites via `fulfillsSkillPrerequisites` (species, required skills, jedi state, force-power gate), XP of the box's type at least `xpCost` (858, skipped when `noXpRequired`), and skill points at least `pointsRequired`. Then points are withdrawn (364), XP is withdrawn through `addExperience` with the negative cost (370), and the skill and its modifiers are added.
- Surrender, `SkillManager::surrenderSkill` (500): refused if another owned skill requires this one; removes the skill and its modifiers; refunds the skill points (587). It does not refund XP: `addExperience` is called in SkillManager only at 370 (purchase debit) and 833 (cap clamp), by grep of the file.
- Tick: none. Event-driven. Each kill, craft, heal or dance calls `awardExperience` synchronously. No per-frame loop.

## 2. Key functions

- `addExperience`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/player/PlayerObjectImplementation.cpp` 728-785. Ledger write, drop rule, cap clamp, return actual gain.
- `awardExperience`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/player/PlayerManagerImplementation.cpp` 2601. Multiplier chain, then `addExperience`, then messages.
- `getSpeciesXpModifier`: same file, 7102-7112. Per-species, per-type bonus with `all` fallback.
- `SkillManager::updateXpLimits`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/skill/SkillManager.cpp` 788-836. Cap rebuild and clamp.
- `SkillManager::canLearnSkill` / `awardSkill` / `surrenderSkill`: same file, 838, 326, 500. Purchase gate, purchase debit, surrender refund.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One ledger per type; add, then clamp to a cap; return only the gain actually added | Default cap 2000 for a type with no cap entry (762-763); `prestige_` types uncapped (760-761) |
| Cap per type = max over the owned unlocks, defaults fill gaps | Per-box `xpCap` values come from the skill box data; the SQL dump row for `combat_general` is 170000 (`sql/datatables.sql` 5178). That dump is not referenced in `src` (grep); the runtime defaults come from the client file, which is not in the donor |
| Scale an award by multipliers, then truncate | Species bonus table with `all` fallback (7102-7111); food buff `xp_increase` percent (2618); local multiplier 0.1 on combat XP (2182); global multiplier (its source not read) |
| Type drops to zero when it reaches 0 or below | `jedi_general` exception with floor -10000000 (750-751) |
| Spend currency on a purchase, points then XP, then add the unlock | Points cost `pointsRequired`; XP cost `xpCost` per box (364, 370) |
| Surrender refunds points only | Refund at 587; no XP refund (SkillManager calls only at 370 and 833) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (zero check, drop rule, cap, clamp, return gain; points then XP then unlock on purchase; points refunded on surrender; clamp on cap rebuild). It omits: the species, buff and global multipliers as separate terms (they are passed in as one product, and `null` stands for the donor's `applyModifiers = false` raw path); the jedi_general floor and exception; the cap-hit message and the client delta message; the `noXpRequired` bypass; the prerequisite species, jedi and force gates; recursive award of required skills; the surrender dependency check; and the species fallback. Where the donor's behaviour for a type missing from the cap list depends on `VectorMap` (not read), the sketch uses the 2000 default in the clamp. That is a choice, not the donor's behaviour.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type XpLedger = Map<string, number>;

interface Unlock { xpType: string; xpCap: number; } // one per owned skill box; xpCap 0 means the box sets no cap

interface SkillBox {
  name: string;
  xpType: string;
  xpCost: number;          // XP spent to learn
  pointsRequired: number;  // skill points spent to learn, refunded on surrender
  requires: string[];      // prerequisite box names
}

interface Character {
  skills: Set<string>;
  points: number;
  xp: XpLedger;
}

interface Multipliers { species: number; buff: number; local: number; global: number; }

const DEFAULT_CAP = 2000; // used when no owned box and no default table entry names the type

// Cap table is rebuilt from the owned boxes (max cap per type), then defaults fill the gaps.
function rebuildCaps(owned: Unlock[], defaults: Map<string, number>): Map<string, number> {
  const caps = new Map<string, number>();
  for (const u of owned) {
    if (u.xpCap === 0) continue;
    caps.set(u.xpType, Math.max(caps.get(u.xpType) ?? 0, u.xpCap));
  }
  for (const [t, v] of defaults) if (!caps.has(t)) caps.set(t, v);
  return caps;
}

function capOf(caps: Map<string, number>, xpType: string): number {
  if (xpType.startsWith("prestige_")) return Infinity;
  return caps.get(xpType) ?? DEFAULT_CAP;
}

// One ledger write. Returns the amount actually added after the cap (can be negative if already above a lowered cap).
function addExperience(ledger: XpLedger, caps: Map<string, number>, xpType: string, gain: number): number {
  if (gain === 0) return 0;
  const before = ledger.get(xpType) ?? 0;
  let total = before + gain;
  if (ledger.has(xpType) && total <= 0 && xpType !== "jedi_general") {
    ledger.delete(xpType); // a type that reaches zero or below is dropped entirely
    return 0;
  }
  const cap = capOf(caps, xpType);
  if (total > cap) total = cap;
  ledger.set(xpType, total);
  return total - before;
}

// Award: with modifiers, the raw amount is scaled by species, buff, local and global multipliers, then truncated, then capped.
function awardExperience(ledger: XpLedger, caps: Map<string, number>, xpType: string, amount: number, m: Multipliers | null): number {
  // m === null is the donor's applyModifiers=false path: the raw amount is added.
  const scaled = m === null ? Math.trunc(amount) : Math.trunc(amount * m.species * m.buff * m.local * m.global);
  return addExperience(ledger, caps, xpType, scaled);
}

function canLearn(box: SkillBox, ch: Character): boolean {
  if (ch.skills.has(box.name)) return false;
  if (!box.requires.every((r) => ch.skills.has(r))) return false;
  if ((ch.xp.get(box.xpType) ?? 0) < box.xpCost) return false;
  return ch.points >= box.pointsRequired;
}

// Learn: points spent first, then XP, then the box is added. Caller rebuilds caps afterwards.
function learn(box: SkillBox, ch: Character, caps: Map<string, number>): boolean {
  if (!canLearn(box, ch)) return false;
  ch.points -= box.pointsRequired;
  addExperience(ch.xp, caps, box.xpType, -box.xpCost);
  ch.skills.add(box.name);
  return true;
}

// Surrender: points come back, XP does not.
function surrender(box: SkillBox, ch: Character): boolean {
  if (!ch.skills.has(box.name)) return true;
  ch.skills.delete(box.name);
  ch.points += box.pointsRequired;
  return true;
}

// After any learn or surrender: lower caps clamp existing XP (a clamp can only reduce a type to its new cap).
function clampToCaps(ledger: XpLedger, caps: Map<string, number>): void {
  for (const [t, v] of ledger) {
    const c = capOf(caps, t);
    if (v > c) addExperience(ledger, caps, t, c - v);
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/xp-ledger.ts` (new): the server-side XP ledger, cap rebuild from unlocks, and the purchase debit. Parity row 18 (loot roll and XP award; the sub-line for award is the one place XP changes). The clamp rides row 18 too. Row 23 does not apply.
- today: not read in this pass (no Frankendom code was opened for this cell).
- Reuse tag: rewrite-from-idea (AGPL-3.0: clean-room, shape only; no line-by-line translation)
- Brief rule served: one ledger (one character, one ledger); server-verified kills (XP is awarded only from a server-verified kill)

## 6. Gaps and risks

- AGPL-3.0 is copyleft: the sketch is written from the described mechanism, not translated.
- The donor does not restrict callers. `LuaCreatureObject::awardExperience` (LuaCreatureObject.cpp 1026-1032) passes any type and amount to `awardExperience`. Frankendom must allow XP only from a server-verified kill, so this entry point has no counterpart.
- Removing an unlock silently clamps XP to the new, lower cap (833). That is a state change on respec. Frankendom must decide it on purpose and test it; do not let it happen as a side effect.
- Open question, not verified: whether a type with XP but no owned-box cap and no default entry is wiped on rebuild. The clamp calls `xpTypeCapList->get(xpType)` directly, and the missing-key return of `VectorMap` is not in the donor. Do not port the wipe behaviour until tested.
- The donor does not refund XP on surrender (only the points come back, 587). Whether that is deliberate is not read. Frankendom should choose and test one rule.
- Multipliers (species, buff, local, global) stack multiplicatively. Frankendom should keep each as zone data or a fixed engine constant with a default, not as literals in the award function.
- The default caps and the skill XP costs are content data. The donor's SQL dump is not the runtime source of the defaults. Do not copy the numbers as authoritative.
- The jedi floor of -10000000 is game-specific. Reject unless a Frankendom rule needs negative XP.

Best transferable idea: keep one XP ledger per track, cap each track by what the player has unlocked, and clamp (not delete) when an unlock is removed.

Decision (proposed): adapt. Take the one-ledger add-then-clamp, the return-actual-gain rule and the purchase order (points, then XP, then unlock); make caps come from the unlock tree as data, not a 2000 default; reject the Lua-callable award path, because kills must be server-verified.
Acceptance: a server test: a track capped at 2000 with 1800 XP, awarding 500, stores 2000 and reports 200; removing the unlock that gave a cap of 3000 clamps the track to 2000 and sends the client an XP-change update (the clamp calls `addExperience` with the notify flag, SkillManager.cpp 833; the cap-hit text is sent only for a positive award, 2651).

Reuse tag: rewrite-from-idea (AGPL-3.0, clean-room). Brief rule served: one ledger; server-verified kills.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** addExperience 728-785 verified line by line (zero return, drop at <=0 except jedi_general, -10M floor 750-751, prestige_ INT_MAX 760-761, default 2000 762-763, clamp and valueToAdd 766-769, return 784), updateXpLimits 788-836 (put/raise 810-814, defaults 822-823, clamp 831-833), canLearnSkill 838-870, awardSkill 326-375 (364 points, 370 XP), speciesModifier 7102-7111, local multiplier 0.1 at 2182, surrender refund 587, SQL combat_general 170000, AGPL. Errors: (1) Acceptance says removing the unlock clamps the track and 'sends the client a cap-hit message'; the clamp at SkillManager 833 only calls addExperience with notifyClient=true (a delta message). The cap-hit text (prose_hit_xp_cap) is sent only from PlayerManager awardExperience 2651-2655 for a positive award, so the acceptance line is not supported. (2) awardExperience multiplies only when applyModifiers is true (2624-2633); with applyModifiers=false the raw amount is added. Note states the multiplier chain unconditionally (the Lua path passes applyModifiers=false and localMultiplier 1.0 at LuaCreatureObject 1032). Cap-hit check line is 2651 (note: 2652).

**Missed:** applyModifiers=false bypass (Lua awards skip species/buff/global multipliers); GainXP/notify paths; cap-hit message depends on hasCappedExperience (2651).
