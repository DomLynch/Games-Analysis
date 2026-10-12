# TrinityCore-TrinityCore (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Reputation/ReputationMgr.cpp` (with `src/server/game/Entities/Player/Player.cpp` for death and durability) | Licence: GPL-2.0-or-later (`ReputationMgr.cpp` file header: "either version 2 of the License, or (at your option) any later version"; the repo `COPYING` is GPL version 2) | C++ | symbol `ReputationMgr::SetReputation`

Checked: Read in full: `ReputationRankThresholds` and rank lookup (ReputationMgr.cpp 36-86), `GetMinReputation` and `GetMaxReputation` (142-186), `SetReputation` with spillover (428-514), `SetOneFactionReputation` (515-622), the paragon cap and paragon test (160-167 and 238-250, the paragon test read as one function). From Player.cpp: `ResurrectPlayer` opening (4269-4300), `KillPlayer` opening (4355-4380), `DurabilityLossAll` (4466-4490), and the fall-death durability call (660-667). Not read: `ReputationMgr.h`, the renown level helpers (GetRenownLevel and its threshold), `ApplyForceReaction` body (308), `CalculateCorpseReclaimDelay`, the corpse-run body after KillPlayer's opening, the DB loader for spillover templates (`sObjectMgr->GetRepSpilloverTemplate` source not located; the data table is not named here). Callers: `SetReputation` has many callers in the server; I checked only the function bodies, not each caller. Confidence: high on the standing ladder, gain rate, clamp, sister spill and paragon overflow; medium on the spillover order when a DB template is present, because I read the branch structure but not the loader. camera_scope: not applicable.

## 1. Mechanism

- Standing is one integer per faction in a per-player map. Ranks come from a sorted list of thresholds: -42000, -6000, -3000, 0, 3000, 9000, 21000, 42000 (values at ReputationMgr.cpp 40-54, named as Hated, Hostile, Unfriendly, Neutral, Friendly, Honored, Revered, Exalted). Rank is the count of thresholds the standing has reached, minus one (ReputationToRankHelper, 66-74). The cap constant is 42000 (58). A friendship table from the data (DB2) overrides the list when one exists (76-85).
- Change order in `SetReputation` (428-514): (a) if a spillover template exists in the database, it overrides the data and each named faction gets `int32(standing * rate)` (444), but only while the player's rank in that faction is at or below the template's rank (that check comes just before 444; I read the branch, not the exact line); (b) otherwise the default path: the standing becomes a float (452), a parent-faction modifier is applied (458), and then either the parent gets the change directly (if its own bar is shown) or the change goes to sister factions with `int32(spill * mod)` (482), skipping any sister above its spill rank cap (480) and skipping zero spill on incremental changes (483); (c) then the faction itself is updated, with a paragon redirect when the change is a positive incremental gain on a paragon faction (496-498).
- `SetOneFactionReputation` (515-622), the place where numbers change: for an incremental change or a renown faction, the gain is `floor(standing * world gain rate + 0.5)` and is added to the old standing (533-537). Then clamp to max (538-539), with the lower clamp following it via GetMinReputation (142-147). Crossing into hostile or below sets the at-war flag (549). Rank counters update for non-friendship factions. The reputation change is the new standing minus the old one (565) and is passed to the player's reputation hook.
- Paragon overflow (`GetMaxReputation`, 160-166): for a paragon faction the cap is `reputation + step - reputation % step - 1` (163), with one more step added while the reward quest status is none (165-166). So the bar always stops just short of the next reward boundary.
- Death (Player.cpp): `KillPlayer` puts the body in the corpse state and sets a six-minute timer before repop at a graveyard (4371-4372). `ResurrectPlayer(restore_percent, applySickness)` (4269) clears the ghost aura and sets the player alive, then restores health by the given percent. Durability: `DurabilityLossAll(percent, inventory)` (4466) walks the equipment slots and optionally the bags; the fall-to-death branch calls it with the death durability rate (665).
- Decay: `ReputationMgr.cpp` has no decay function (grep for decay in the file: none).
- Tick: none. All changes are events; there is no per-frame loop in this file.

## 2. Key functions

- `ReputationMgr::SetReputation`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Reputation/ReputationMgr.cpp` 428-514 (read). Spill at 441-489, the faction update at 491-504.
- `ReputationMgr::SetOneFactionReputation`: same file, 515-622 (read). Gain at 533-537, clamp at 538-541, at-war at 549, change at 565.
- `ReputationToRankHelper` and `ReputationToRank`: same file, 62-86 (read).
- `GetMinReputation` / `GetMaxReputation`: same file, 142-186 (read).
- `KillPlayer`, `ResurrectPlayer`, `DurabilityLossAll`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Player/Player.cpp` 4269, 4355-4380, 4466-4490 (read in part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ladder: rank = how many thresholds the standing has reached, minus one | Thresholds -42000, -6000, -3000, 0, 3000, 9000, 21000, 42000 (theirs, 40-54) |
| Clamp to a band | Cap 42000 (theirs, 58); min is the first threshold, max is the last (147, 185) |
| Gain scaled by a world rate, rounded half up | Rate from the world setting (theirs, 534) |
| Sister spill: a fraction of the change to related factions | Parent mod and sister mod from the faction data (theirs, 458, 482) |
| Skip spill above a rank cap | Cap rank from the faction data (theirs, 480) |
| Paragon overflow: cap just below the next reward boundary | Step from the paragon data; extra step if the reward quest is untaken (theirs, 163-166) |
| Death timer before the graveyard repop | 6 minutes (theirs, 4372) |
| Durability loss on death or fall, percent over slots | Rate from the world setting (theirs, 665) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order of a change: spill to sisters first from the raw input, then the faction itself, with the gain rate and clamp applied inside the per-faction step for every faction touched (spill targets too), the sister rank cap, the two-stage spill modifier, and the paragon cap used as that faction's clamp. It omits: the database spillover override and its rank check, the friendship table, the at-war flag, the paragon redirect to the paragon faction, the renown branch, the rank counters, the parent-bar direct case, and the quest-status check in the paragon cap (the sketch takes it as a boolean). Fix applied in the sketch: the spill is truncated to whole points per change in the donor, so a small gain loses its share; the sketch carries the fraction in `spillCarry`.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Numbers marked "donor" are the donor's values (ReputationMgr.cpp 40-54, 58).

export {};

const STAND_MIN = -42000; // donor: lowest threshold
const STAND_CAP = 42000;  // donor: Reputation_Cap
const RANK_STARTS = [-42000, -6000, -3000, 0, 3000, 9000, 21000, 42000]; // donor thresholds, sorted

interface Standing { value: number; spillCarry: number; } // spillCarry = fraction owed to sisters
interface Paragon { step: number; rewardTaken: boolean; }
interface Faction {
  id: string; parent?: string; sisters: string[];
  parentMod: number;   // donor ParentFactionMod[1]: applied once to the raw change
  sisterMod: number;   // donor ParentFactionMod[0]: applied per target
  spillRankCap: number; // donor ParentFactionCap[0]: a target above this rank is skipped
  gainRate: number; standing: Standing; paragon?: Paragon;
}

// Rank = how many thresholds the standing has reached, minus one (-1 if below the first).
export function rankOf(value: number): number {
  let rank = -1;
  for (const t of RANK_STARTS) {
    if (value >= t) rank++;
    else break;
  }
  return rank;
}

// Paragon overflow: the cap is the next boundary minus one, plus one more step while the reward quest is untaken
// (donor: ReputationMgr.cpp 163-166). Non-paragon factions use the fixed cap.
export function paragonCap(value: number, step: number, rewardTaken: boolean): number {
  let cap = value + step - (value % step) - 1;
  if (!rewardTaken) cap += step;
  return cap;
}

function maxFor(f: Faction): number {
  return f.paragon === undefined ? STAND_CAP : paragonCap(f.standing.value, f.paragon.step, f.paragon.rewardTaken);
}

// Donor SetOneFactionReputation: the world gain rate (round half up) and the clamp are applied HERE, to every faction
// that is changed, spill targets included.
function setOne(f: Faction, amount: number, incremental: boolean): number {
  const before = f.standing.value;
  const target = incremental ? before + Math.floor(amount * f.gainRate + 0.5) : amount;
  f.standing.value = Math.min(maxFor(f), Math.max(STAND_MIN, target));
  return f.standing.value - before;
}

// Donor SetReputation order: spill FIRST from the raw input (not gain-rated, not clamped), then the faction itself.
// Fix (donor defect): the donor truncates spill to int, so small gains lose their share. Here the fraction is carried.
export function applyStanding(f: Faction, amount: number, incremental: boolean, world: Map<string, Faction>): number {
  if (f.parent !== undefined && f.parentMod !== 0) {
    const owed = amount * f.parentMod + f.standing.spillCarry;
    const whole = Math.trunc(owed);
    f.standing.spillCarry = owed - whole;
    for (const sid of f.sisters) {
      const s = world.get(sid);
      if (s === undefined || s === f) continue;
      if (rankOf(s.standing.value) > s.spillRankCap) continue; // donor: skip a sister above its rank cap
      const share = Math.trunc(whole * s.sisterMod);
      if (share !== 0 || !incremental) setOne(s, share, incremental);
    }
  }
  return setOne(f, amount, incremental);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 gl004-standing-trinitycore.ts` on the VPS (copy at /tmp/gl004-standing-trinitycore.ts): exit 0.

Defects in the donor, each with the fix (the idea is kept):
- D1, small spill is lost: ReputationMgr.cpp 444 and 482 use `int32(...)` so a fractional share is cut to whole points on every change, and 483 then drops zero spill. A one-point gain with a 0.5 spill rate spills nothing. fix: carry the fraction per faction (`spillCarry` in the sketch).
- D2, gains and losses round differently at half points: 534 uses `floor(x + 0.5)`, which rounds -2.5 to -2 but 2.5 to 3. A loss is therefore rounded toward zero at halves. fix: round half away from zero for both, or document the asymmetry as intended. Small effect; recorded, not in the sketch.
- D3, minor: the database-template branch has its own rank check (the player's rank in the target against the template rank, line 441) but not the sister ParentFactionCap check at 480, so the two paths cap differently. Not a bug as such; if Frankendom keeps both paths, use one rank-cap rule. Not in the sketch.

## 5. Lands in

- TARGET `src/fight/favour.ts` (new module, shared with the Daggerfall note): the standing ladder, clamp, sister spill with carry and paragon overflow as server-side rows. The kill award goes through the server ledger, not the client.
- Parity-checklist row 18 (loot roll and XP award). The brief hint for this group is row 13, but the mechanism is a standing award per kill, so row 18 fits better; the donor's death timer and durability rules are row 17, not used here.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only; sketch written from the mechanism)
- Brief rule served: rules 1-2 (one ledger: standing is a row in the one ledger; the server applies every change); GL focus items 1, 12 (paragon as a reward row), 14 (faction standing and sister spill as a pantheon or realm ladder).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not translated.
- The donor's rank ladder is tied to WoW-style factions in data. Frankendom's pantheon or realm standing is data rows; the thresholds are catalogue or zone data.
- The spill and gain rates come from the faction data. Frankendom must pick one rate source per row and test the case where a spill is fractional (D1).
- The paragon overflow means the standing can grow past the cap while quests are untaken. Frankendom's ledger must enforce the cap on the server, not in the client bar.
- Spill to sisters happens without a fight check. In Frankendom, a standing change from a kill is server-verified (kills are server-verified); spill must run in the same server transaction as the kill, not as a second request.
- Death in the donor is a six-minute timer before repop, with a corpse run and reclaim delay (CalculateCorpseReclaimDelay not read). Frankendom's death and respawn rows (17) are not covered by this note; only the timer number is recorded.
- Also found: the donor's spill is computed before the main update from the raw input (not gain-rated), uses a two-stage modifier (ParentFactionMod[1] once, then ParentFactionMod[0] per sister) and skips sisters above ParentFactionCap (480); each spill target then gets the world gain rate applied again inside SetOneFactionReputation (534). The sketch now follows this.
- Durability loss on death is a world-setting rate. Frankendom needs it as an engine constant, not a per-zone number, unless a zone rule says otherwise.
- No curse, blessing, shapeshift, summon, oath, relic or mount code was read in this donor (see the GL table below), so most of items 2, 4 to 9, 11 and 12 are not covered.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later). Brief rule served: rules 1-2 and GL focus items 1, 3, 10 (partly), 12 (partly), 14.

Best transferable idea: a faction standing row whose tiers come from a sorted threshold list, whose gains spill to related factions by a fraction that is carried between changes, and whose top tier keeps paying out in steps past the cap.
Decision (proposed): adapt - the ladder, the spill-with-carry shape and the paragon overflow fit Frankendom's pantheon standing and realm pride; the donor's WoW factions, its database spillover override and its integer spill are replaced by catalogue rows and a server-side carry, with D1 fixed in the sketch.
Acceptance: a server test (source faction has a parent, parentMod 0.5, sister sisterMod 1, gainRate 1) applies four gains of one point and sees the sister gain exactly one point after the second change (carry) and two in total after the fourth, never a double count; a paragon faction driven through applyStanding past 42000 stops at the donor formula (value + step - value % step - 1, plus one step while the reward is untaken) while a non-paragon faction stops at 42000; a kill's standing change and its sister spill land in one ledger transaction.

GL table (gods-legends-favour, items from GL-FOCUS.md; "not read" where I opened no code for it):

| # | name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour per faction (standing) | standing per faction, rank from thresholds, clamp to the band | rank = thresholds reached minus one; gain = floor(d * rate + 0.5) | -42000..42000; thresholds -42000, -6000, -3000, 0, 3000, 9000, 21000, 42000 | incremental change from events; sister spill; crossing hostile sets at-war | none (no decay function in ReputationMgr.cpp) | ReputationMgr.cpp 40-58, 66-74, 534-541, 549, 565; spill 441-489 |
| 2 | Blessings and curses | not read in this donor (timed buffs are spell data; not searched) | n/a | n/a | n/a | n/a | not read |
| 3 | Patron choice and switching | at-war flag set below hostile, cleared on rising; forced reaction exists (ApplyForceReaction, 308, body not read); no switch or apostasy found in the file | at-war when rank <= hostile | rank -1..7 | crossing hostile | none | ReputationMgr.cpp 549-554 (at-war), 308 (forced reaction) |
| 4 | Divine domains as tags | not read | n/a | n/a | n/a | n/a | not read |
| 5 | Boons at favour thresholds | rank is computed from the thresholds; the rank gates at-war and forced reaction here; boon rows not read | rank from thresholds | rank -1..7 | rank crossing | none | ReputationMgr.cpp 62-86 |
| 6 | Legend signature powers | not read | n/a | n/a | n/a | n/a | not read |
| 7 | Shapeshifting | not read | n/a | n/a | n/a | n/a | not read |
| 8 | Avatars and summons | not read | n/a | n/a | n/a | n/a | not read |
| 9 | Fate, luck, oaths | not read | n/a | n/a | n/a | n/a | not read |
| 10 | Underworld and death rules | 6 minute timer to repop at a graveyard; resurrection with restore percent and optional sickness; durability loss on fall death (equipment, optionally inventory); corpse reclaim delay not read | timer = 6 * MINUTE * IN_MILLISECONDS | 6 minutes | death event; resurrection event | none | Player.cpp 4371-4372, 4269, 4466, 665 |
| 11 | Divine mounts | not read | n/a | n/a | n/a | n/a | not read |
| 12 | Relics and artifacts | paragon overflow gives a reward step past the cap (a repeatable reward row, not a unique item); unique item ownership not read | paragon cap = value + step - value % step - 1, +step if reward untaken | step from paragon data | every paragon step earned | none | ReputationMgr.cpp 160-166 |
| 13 | Temples and shrines | not read (taxi and flight-path data in PlayerTaxi.cpp not read) | n/a | n/a | n/a | n/a | not read |
| 14 | Pantheon factions and realm pride | parent and sister factions with team lists; spill from a faction to its sisters with a mod and a rank cap; database spill override | spill = int32(spill * mod), skipped above cap | mods and caps from faction data | any change to a member faction | none | ReputationMgr.cpp 441-489 |


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: (1) Sketch header claims it keeps donor order 'gain rate, then clamp, then spill'. Real order (ReputationMgr.cpp 428-513): sister/parent spill FIRST using the RAW input standing (452-486, int32(spill*mod) at 482), then the faction itself (491-506) where the gain rate and clamp are applied inside SetOneFactionReputation (534-541). The sketch spills from the already-rated, already-clamped after-before delta and spills only if f.parent is set. Mechanism section 1(b)/(c) states the correct order, so note contradicts itself. (2) Sketch clamps every faction to 42000 in applyStanding, so the paragon overflow it advertises (donor GetMaxReputation 160-166 replaces the cap for paragon factions) cannot occur through applyStanding; paragonCap is an unused standalone function. Acceptance line 2 (paragon cap just above 42000) passes only by calling paragonCap directly. (3) D3 overstated: DB-template branch does check the player's rank vs template rank at 441, which is its own cap; it just lacks the sister ParentFactionCap check at 480. (4) Table row 3 says 'rank 0..8' while rows 1/5 say -1..7 (8 thresholds give -1..7). Verified OK: thresholds and Reputation_Cap 42000 (36-58), rank helper 66-74, floor(x+0.5) at 534 (D2 correct), GetMin/GetMax 142-186 incl. paragon formula 163-166, at-war 549, KillPlayer 6-minute timer 4372, ResurrectPlayer 4269, DurabilityLossAll 4466, fall durability 665, int32 truncation at 444/482 and zero-skip at 483 (D1 correct), licence header GPL v2-or-later. Acceptance 1 (four 1-point gains, 0.5 spill, sister gains 1 after second change) passes with the sketch if the test sets parent; Acceptance 3 (single transaction) is a design rule, not testable against donor.
Missed: Donor (ReputationMgr.cpp 480) skips spill to sisters whose rank is above ParentFactionCap, and the sketch drops this (admitted). Not noted: spill uses a two-stage modifier (ParentFactionMod[1] to parent level, then ParentFactionMod[0] per sister) and the spill is computed before the main faction update and is NOT scaled by the gain rate first; also SetOneFactionReputation applies the world gain rate to each spill target again.

Fixed 2026-10-12 (Sonnet fixer): verified spill-first order (ReputationMgr.cpp 428-512) and gain rate inside SetOneFactionReputation (534); rewrote the sketch so spill runs first from the raw input, rate and clamp apply per faction, sister rank cap and two-stage mod are in, and the paragon cap is a live clamp (paragonCap is no longer unused); acceptance 1 and 2 now match the sketch; D3 softened; rank range in table row 3 fixed to -1..7. Retypechecked on the VPS.
