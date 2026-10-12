# AAEmu-AAEmu (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/CharacterCombat.cs` (plus `Models/Game/Units/Unit.cs`, `Models/Game/Skills/Effects/RecoverExpEffect.cs`, `Core/Managers/ExperienceManager.cs`) | Licence: mixed as read. `LICENSE.GPL` is the GPL-3.0 text; the README licensing section names the GNU LGPL-3.0; `LICENSE.MIT` is an MIT text (Rain0Ash, 2019). Classed copyleft: clean-room shape only | C# | symbol `ComputeDeathWaitTime`, `GetExpLoss`, `RecoverExpEffect`

Checked: Read in full: `ComputeDeathWaitTime` (CharacterCombat.cs 181-203), the wait table and reset constant (31-32), `GetExpLoss` (ExperienceManager.cs 206-214). Read in part: `DoDie` (CharacterCombat.cs 61-92), the death path in Unit.cs (458-476, 510-520), `RecoverExpEffect` (lines 36, 56-66, 69-78; lines 1-35 not read). Callers: `ComputeDeathWaitTime` has one caller read (CharacterCombat.cs 64); no repo-wide caller search was run. Not read: the config values `MinimumExpLossLevel` and `ExpLossRateAtDeath`, `GetExpForLevel`, `DeadCount` writers (none found in AAEmu.Game), the client wait display, the NPC spawner respawn logic beyond `RespawnTime`. Confidence: high on the escalation table, reset window and XP loss formula; medium on the priest search path (start of `RecoverExpEffect` not read). camera_scope: n/a.

## 1. Mechanism

- Death order in `DoDie` (CharacterCombat.cs 61-68): the respawn wait is computed first (`ComputeDeathWaitTime()` at 64, comment says it runs before the death packet), then durability loss is set (66-68).
- Respawn wait (`ComputeDeathWaitTime`, 185-203): if the last death was at least 5 minutes ago (`DeathCountResetMinutes`, 32), the streak resets to 0 (187-191). The index is `min(streak, 8)` into `[15, 30, 60, 90, 120, 150, 180, 210, 240]` seconds (31, 193-194). So deaths 1-9 in a streak wait 15, 30, 60, 90, 120, 150, 180, 210, 240 s, and every death after the ninth waits 240 s. The wait is stored as `RezWaitDuration = waitSeconds * 1000` (196), `DeadTime` is set (197), the streak increments (199) and the last death time is set (200).
- XP loss (CharacterCombat.cs 70-92): only in the default world and below max level (70). At or above `MinimumExpLossLevel` (72), `LastExpLoss = GetExpLoss(Level, ExpLossRateAtDeath)` (74), capped to the XP earned in this level (75-77). `RecoverableExp = round(LastExpLoss * 0.80)` (78). Below that level the death is a free resurrect (81-85). At max level or outside the default world, `LastExpLoss` is set to 0 (88-90) but `RecoverableExp` is left untouched (a stale value from an earlier death can survive).
- `GetExpLoss` (ExperienceManager.cs 206-213): `floor((XP for level+1 - XP for level) * rate)`. At max level it returns 0 (208-209). So the loss is a fraction of the current level's XP span and cannot take the character down a level.
- Respawn: the death packet uses `RezWaitDuration` for characters (Unit.cs 467); NPCs use their spawner's `RespawnTime` (474).
- Recovery (RecoverExpEffect.cs): the labor check (37-41) runs only when the data flag `NeedLaborPower` is set, and the priest check (54-69, a priest NPC within 10 units via `GetAround<Npc>`) only when `NeedPriest` is set; `NeedMoney` is an empty stub. The labor cost is `level` up to 50, then `50 + (level - 50) * 20` (36). The labor spend (71) and `AddExp(RecoverableExp)` (74) run unconditionally once the checks pass (even if the flags are off), then `RecoverableExp` and `LastExpLoss` are cleared (75-76).
- Tick: none. Death and recover are events. The wait is a countdown the server sends to the client (not read).

## 2. Key functions

- `DoDie` and XP loss: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/CharacterCombat.cs` 61-92.
- `ComputeDeathWaitTime`: same file, 181-203 (table 31, reset 32).
- `GetExpLoss`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/ExperienceManager.cs` 206-214.
- Death path timers: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Units/Unit.cs` 458-476 and 510-520.
- Priest recover: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Effects/RecoverExpEffect.cs` 36-78.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Respawn wait steps up with each death in a streak, capped at a table end | `[15, 30, 60, 90, 120, 150, 180, 210, 240]` s (theirs, CharacterCombat.cs 31); index cap = table length - 1 (193) |
| Streak resets after a quiet window | 5 minutes (theirs, CharacterCombat.cs 32) |
| XP lost at death is a fraction of the current level's XP span, capped to XP earned this level | `floor(span * ExpLossRateAtDeath)` (ExperienceManager.cs 213); cap at 77 |
| Share of the loss a priest returns | 0.80 (theirs, CharacterCombat.cs 78) |
| Recovery labor cost by level | level up to 50, then +20 per level (theirs, RecoverExpEffect.cs 36) |
| Free resurrect under a minimum level | `MinimumExpLossLevel` (config, not read; CharacterCombat.cs 72) |

Defects found in the donor (keep the idea, fix each):
1. The streak is not saved. `_consecutiveDeathCount` and `_lastDeathTime` are private fields (CharacterCombat.cs 33-34) and no other code in AAEmu.Game reads or writes them. A relog or server restart resets the streak to 15 s. The database already has `dead_count` and `dead_time` columns (Character.cs 2705 writes `dead_count`; Unit.cs 517 sets `DeadTime` on death, so `dead_time` is written) but the streak does not read them. fix: restore the streak and last death time from those columns on load, and write them on death.
2. `DeadCount` is never incremented in AAEmu.Game (declared at CharacterCounters.cs 10; the only other references are the load and save in Character.cs). fix: increment it in the death path, or drop the column.
3. `RezPenaltyDuration` is declared and saved (Character.cs 105; save at 2709) but no assignment was found in AAEmu.Game. The rez penalty tier is effectively unused. fix: wire it to the escalation, or remove it.

## 4. TypeScript sketch

simplified: the sketch follows the donor order for one death: the wait is computed first, then the XP loss and the recoverable share. It omits durability loss, PvP honor, the client packets, the priest proximity and labor-power spend, the free resurrect packet and the max-level and default-world checks (kept only as the level cap). The donor's `DeathWaitTimesSeconds` and reset window are kept. Defect 1 is fixed: the streak and last death time live in a state object the caller persists, instead of in memory.

```ts
// Licence: LGPL-3.0 per the donor README (copyleft: shape only). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Death escalation: the respawn wait steps up with each death inside a 5-minute window and resets after a quiet 5 minutes.
// Experience lost at death is capped to the XP earned in the current level and 80 percent can be recovered from a priest.

const DEATH_WAIT_S = [15, 30, 60, 90, 120, 150, 180, 210, 240];   // data: wait table, seconds
const RESET_WINDOW_MS = 5 * 60_000;                               // data: quiet time that resets the count
const RECOVER_SHARE = 0.8;                                        // data: share of the loss a priest returns

// Persisted with the character: the donor keeps these two fields only in memory (defect, fixed here).
interface DeathState {
  consecutive: number;   // deaths in the current streak
  lastDeath: number;     // epoch ms of the last death, 0 = none
  lostXp: number;        // XP lost at the last death, recoverable
  recoverable: number;   // XP a priest can give back
}

// Called in the death path before the death packet is sent.
function waitSeconds(s: DeathState, now: number): number {
  if (s.lastDeath !== 0 && now - s.lastDeath >= RESET_WINDOW_MS) s.consecutive = 0;
  const idx = Math.min(s.consecutive, DEATH_WAIT_S.length - 1);
  const wait = DEATH_WAIT_S[idx];
  s.consecutive += 1;
  s.lastDeath = now;
  return wait;
}

// XP loss: the current level's XP span times the configured rate, floored, capped to XP earned this level.
// No loss at max level.
function xpLoss(level: number, maxLevel: number, expAt: (lvl: number) => number, rate: number, earnedThisLevel: number): number {
  if (level >= maxLevel) return 0;
  const span = expAt(level + 1) - expAt(level);
  return Math.min(Math.floor(span * rate), earnedThisLevel);
}

// Recovery cost in labor: equal to the level up to 50, then 20 per level above it.
function laborCost(level: number): number {
  return level <= 50 ? level : 50 + (level - 50) * 20;
}

function recoverableFrom(lost: number): number {
  return Math.round(lost * RECOVER_SHARE);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (typescript 7.0.2), exit 0, no output.

Best transferable idea: a death streak raises the respawn wait along a fixed table and resets after a quiet window, with the death XP loss capped to the current level so a death never de-levels the character.
Decision (proposed): adapt — take the escalating wait table and the level-capped XP loss with an 80 percent priest return, store the streak on the one character ledger (fix the in-memory defect), and drop the unused rez-penalty column until it is wired.
Acceptance: server test: deaths 1-4 inside 5 minutes give waits of 15, 30, 60 and 90 s; after a relog the fifth death still waits 120 s; a death at max level loses 0 XP; a death at the current level's floor loses no XP below the level start.

## 5. Lands in

- TARGET `src/fight/death.ts` (new, engine death step, server side). Parity-checklist row 17 (death/respawn). The streak and the XP loss are server ledger rows.
- today: none (Frankendom has no death streak yet).
- Reuse tag: rewrite-from-idea (LGPL/GPL, MIT file present; clean-room only)
- Brief rule served: 1 (one engine, one ledger: streak and loss are written server-side), GL focus items 1 and 10 (death-penalty tiers and the priest return).

## 6. Gaps and risks

- Copyleft: clean-room only. The sketch is written from the described mechanism. The licence is mixed on paper (GPL text, LGPL in the README, an MIT file); the shape is the only thing taken.
- The config values (`ExpLossRateAtDeath`, `MinimumExpLossLevel`) were not read, so the real rates are unknown.
- Frankendom kills are server-verified, so the wait and loss run on the server. The client shows the countdown only.
- The priest recovery costs labor power, which Frankendom does not have. A Frankendom equivalent (a shrine offering or a cooldown) is a design question for the Strategy lane.
- The wait table is per character streak, not per zone. Zone rules (safe zone, Pit) need their own rows; the Pit is client-only and does not own death state.

## 7. GL focus table (gods-legends-favour, items 1-14)

| # | Item | Name | Effect | Formula | Number ranges | Gain / loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|---|
| 1 | Favour / piety | priest blessing recovers XP | the recover-exp skill gives back 80 percent of the death loss | recoverable = round(loss * 0.8); labor = level or 50 + (level-50)*20 | 0.80; labor 1-50 then +20 per level | loss: death; gain: recover | none (the loss clears on recover) | CharacterCombat.cs 78; RecoverExpEffect.cs 36, 74-76; SkillsEnum.cs 9 |
| 2 | Blessings / curses as timed rows | Blessing skill | the "Blessing" skill id is the priest recover-exp skill, not a buff | - | - | - | - | SkillsEnum.cs 9; CSStartInteractionPacket.cs 44 |
| 3 | Patron choice and switching | none found | no patron or oath system found | - | - | - | - | none |
| 4 | Divine domains / aspects | none | no domain tags found | - | - | - | - | none |
| 5 | Boons at favour thresholds | none | no rank-gated boons found | - | - | - | - | none |
| 6 | Legend signature powers | not read | not opened | - | - | - | - | (not read) |
| 7 | Shapeshifting | none | no shapeshift hits in searched file set | - | - | - | - | none |
| 8 | Avatars / summons | none found | summon and pet classes not read | - | - | - | - | (not read) |
| 9 | Fate, luck, oaths | none | no luck stat or oath found | - | - | - | - | none |
| 10 | Underworld / death | escalation, XP loss, priest return | wait 15-240 s by streak; XP loss = span * rate capped to level; recover 80 percent | see section 1 | 15-240 s; 0.80; labor by level | death: streak, loss; recover: XP back | streak resets after 5 min quiet; loss clears on recover | CharacterCombat.cs 31-32, 61-92, 181-203; ExperienceManager.cs 206-214; RecoverExpEffect.cs 36-78; Unit.cs 467, 474, 517 |
| 11 | Mounts | not read | - | - | - | - | - | (not read) |
| 12 | Relics | none | no relic hits | - | - | - | - | none |
| 13 | Temples / shrines | priest NPC | a priest NPC in range is the recover point; zone rows not read | - | range check (62-66) | - | - | RecoverExpEffect.cs 56-66 |
| 14 | Pantheon factions, realm pride | faction relation model | SystemFaction.cs (88 lines) and FactionRelation.cs (11 lines: Id, Id2, State, ExpTime) exist; the logic was not read | - | - | - | - | FactionRelation.cs 7-10 (names only) |

Best transferable idea (table): row 10 (escalation plus capped loss plus a priest return) is the mechanism worth keeping; the faction relation model (row 14) has an expiry time field that was not read and may be worth a second look.
Brief rule served: 1, 17 (death and respawn), GL focus items 1 and 10.

Missed mechanism (added by fixer): durability loss on death is gated on `MinimumExpLossLevel` (CharacterCombat.cs 66-68), the same level threshold as the XP loss.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- RecoverExpEffect: the labor check and the priest range check are each conditional on the data flags NeedLaborPower / NeedPriest (priest radius 10 via GetAround<Npc>); the labor spend and AddExp run unconditionally. Note had presented priest-in-range and labor spend as always on.
- Max-level branch sets LastExpLoss = 0 but leaves RecoverableExp untouched (note said loss 0 only).
- Missed: Unit.cs 517 sets DeadTime on death; durability loss gated on MinimumExpLossLevel (CharacterCombat 66-68).

Fixed 2026-10-12: rewrote the recovery bullet (flags, radius 10, unconditional spend), the max-level sentence and the dead_time remark; added the durability-gate line. No sketch code changed (the sketch already omits the priest and labor checks).
