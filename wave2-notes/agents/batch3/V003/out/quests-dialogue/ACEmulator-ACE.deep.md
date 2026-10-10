# ACEmulator-ACE (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/QuestManager.cs` (read in full, 1-687), with `EmoteManager.cs` (partial, see Checked), `Source/ACE.Database/Models/World/Quest.cs`, `Source/ACE.Server/Managers/PropertyManager.cs` 662 | Licence: AGPL-3.0 (LICENSE header: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3") | C# | symbols `CanSolve`, `GetNextSolveTime`, `Update`, `Stamp`, `SetQuestBits`, `OnTalkDirect`, `GetEmoteSet`

Checked: Read `QuestManager.cs` 1-687 end to end: `CanSolve` (266), `GetNextSolveTime` (334-365), `IsMaxSolves` (281-294), `Update` (172-218), `SetQuestCompletions` (220-264), `Stamp` (484-487), `HandleKillTask` (583-630), `SetQuestBits` (666-685). Read `EmoteManager.cs` (2094 lines) only at 1-140, 618-680 (quest tests), 1262-1282 (stamp), 1460-1600 and 1600-1745 (quest update, emote-set choice, enqueue, branching list), 2018-2080 (OnQuest, OnTalkDirect); the other ~1,900 lines (spells, motions, vendor, etc.) are (not read). Callers read: `CanSolve` from `Chest.cs` 150-158 and `Player_Inventory.cs` 1248-1262 and `EmoteManager.cs` 1482; `OnTalkDirect` from `GameActionTalkDirect.cs` 50. Confidence: high on the cooldown/max-solves gate; medium on the dialogue branching (I read its quest paths, not the whole emote VM). `camera_scope`: not applicable (not a camera cell).

## 1. Mechanism

- A quest is a row in the world catalogue (`Quest`: `MinDelta` = minimum seconds between completions, `MaxSolves` = max completions, -1 unlimited; `Quest.cs` 22-29). A character has at most one registry row per quest name: `LastTimeCompleted` (unix seconds) and `NumTimesCompleted` (a count).
- The gate is `CanSolve(name)` = `GetNextSolveTime(name) == MinValue` (266-279). `GetNextSolveTime` runs in this order:
  1. The quest is not in the world catalogue: return MaxValue, meaning cannot solve (338-340).
  2. The player has no registry row: return MinValue, meaning solve now (342-344).
  3. Max solves: if `MaxSolves > -1` and `NumTimesCompleted >= MaxSolves`, return MaxValue (346-347).
  4. Next solve time = `LastTimeCompleted + MinDelta x quest_mindelta_rate` (default 1.0), except quests whose name starts with "ColoArena", which use the unscaled `MinDelta` (325, 352-355).
  5. If now >= next solve time, return MinValue; otherwise return the remaining time (357-363).
- Writes go through `Update` (172). With no row: create it with `NumTimesCompleted = 1` and `LastTimeCompleted = now`. With a row: if `IsMaxSolves` is true, return silently (196-199); otherwise set `LastTimeCompleted = now` and `NumTimesCompleted++` (204-205). `Update` itself does NOT check the cooldown. `Stamp` (484-487) is just `Update`. So the cooldown is enforced by callers, not by the write.
- Callers and the order they use:
  - Quest-update emote (`UpdateQuest`, EmoteManager 1464-1486): if no row, `Update` and branch on whether the row now exists. If a row exists, `CanSolve` (1482); only if true does it `Stamp`; then it branches QuestSuccess or QuestFailure on `canSolve`.
  - Quest chest (`Chest.cs` 150-158): no row, call `OnQuest` (adds the quest). Row and `CanSolve` true, call `OnQuest`. Otherwise `HandleSolveError` and refuse the activation.
  - Item pickup with a quest stamp (`Player_Inventory.cs` 1254-1262), for generator-owned items or someone else's corpse: `CanSolve` true, mark a solve; otherwise `HandleSolveError` and refuse.
  - Kill-task path (`HandleKillTask`, 583-630): if the row exists, `Stamp` with no cooldown check (608).
- Error messages: `HandleSolveError` (558+) reports "too many times" when `IsMaxSolves`, otherwise "too recently" with the remaining time from `GetNextSolveTime`.
- Dialogue (NPC text). A typed talk line reaches `OnTalkDirect(player, message)` (2047-2049) via `GameActionTalkDirect.cs` 50. It runs an emote set of category `ReceiveTalkDirect` keyed by the message text (the set's `Quest` field equals the message). Quest test emotes (`InqQuest`, `InqMyQuest`, `InqQuestSolves`, the bit tests) do not act on their own: they call `ExecuteEmoteSet(QuestSuccess or QuestFailure, ..., nested: true)` with the same key (e.g. 631-633, 675). Set choice (`GetEmoteSet`, 1512-1553): filter by category and quest name; if RNG is on, draw `rng` in [0,1), keep sets with `Probability > rng`, order by `Probability` ascending, take the first. Execution (`ExecuteEmoteSet`, 1584; `Enqueue`/`DoEnqueue` 1593-1690): a non-nested set is refused while the NPC is busy (1584); each emote may wait its pre-delay; `Nested` counts open chains and a chain that re-enters a branching set with the same quest name past depth 75 aborts with an error log (1607-1617).
- Timing: all times are wall-clock unix seconds read with `Time.GetUnixTime()`. Nothing runs per frame; `CanSolve` is evaluated on demand at the interaction. (The emote delays use the server action chain; the cooldown does not.)
- Bit flags: `SetQuestBits` (666-685) stores bit flags in the same `NumTimesCompleted` integer, read back in `HasQuestBits` (636-649) and written through `SetQuestCompletions` (684). This is the donor's trick for multi-stage dialogue state.

## 2. Key functions

- `CanSolve`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/QuestManager.cs` 266-279. Returns true only when `GetNextSolveTime` is MinValue (273).
- `GetNextSolveTime`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/QuestManager.cs` 334-365. The whole gate: catalogue miss, first-time, max solves, scaled cooldown, remaining time.
- `Update`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/QuestManager.cs` 172-218. First solve creates the row; later solves are refused silently at max, else count and time are advanced.
- `SetQuestCompletions`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/QuestManager.cs` 220-264. Clamps the count to `MaxSolves` when it is set (226); called by `SetQuestBits` (684) and by emote writes (EmoteManager.cs 1231).
- `EmoteManager.GetEmoteSet` and branching: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Managers/EmoteManager.cs` 1512-1553 (set choice), 1584 (busy gate), 1607 (depth guard).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and their source |
|---|---|
| Solve gate = "no record" or ("max not reached" and "now >= last + minDelta x scale") | `MinDelta` per quest from the catalogue (Quest.cs 24); `MaxSolves` per quest (Quest.cs 29), -1 = unlimited (QuestManager.cs 346 uses `> -1`) |
| Global cooldown scale | `quest_mindelta_rate` default 1.0 (PropertyManager.cs 662); applied to all quests except name prefix "ColoArena" (QuestManager.cs 325, 353-355) |
| Unknown quest = cannot solve | MaxValue (QuestManager.cs 340) |
| Silent refusal at max solves | `Update` returns with no error (QuestManager.cs 196-199); the chest and item paths send an error instead (HandleSolveError, 558+) |
| Dialogue branch chance | Probability thresholds in the emote data (EmoteManager.cs 1549): the set with the smallest threshold above the roll wins; no "no set" default beyond null (1553) |
| Loop guard | 75 nested chains on a self-named branching set (EmoteManager.cs 1607) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gate order (catalogue miss, first solve, max solves, scaled cooldown, remaining time) and the donor's write rule (first solve sets count 1; repeats refused silently at max). It omits: the ColoArena cooldown exemption; the NumTimesCompleted bit-field reuse for quest bits; `SetQuestCompletions` admin writes; the `HandleSolveError` messages; the Player/Fellowship/Creature split (`QuestManager` runs on any creature); the emote dialogue branching; and the `(uint)` truncation of the scaled cooldown (replaced by Math.floor). The sketch is clean-room (AGPL-3.0 donor).

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch of the described mechanism (solve cooldown + max solves + bit field), not a translation.
// clean-room
export interface QuestRule {
  minDeltaS: number;      // seconds between solves (zone data)
  maxSolves: number;      // -1 = unlimited (zone data)
}

export interface QuestRecord {
  lastSolvedUnixS: number;
  solves: number;         // count of solves; also used as a bit field by the donor
}

export type SolveCheck =
  | { ok: true }
  | { ok: false; reason: "max-solves" | "cooldown" | "unknown-quest"; remainingS: number };

// Engine constant: global scale on every cooldown (the donor's quest_mindelta_rate, default 1).
const COOLDOWN_SCALE = 1;

export function canSolve(
  rule: QuestRule | undefined,
  rec: QuestRecord | undefined,
  nowUnixS: number,
): SolveCheck {
  if (!rule) return { ok: false, reason: "unknown-quest", remainingS: Number.POSITIVE_INFINITY };
  if (!rec) return { ok: true };                         // never solved: no gate
  if (rule.maxSolves > -1 && rec.solves >= rule.maxSolves)
    return { ok: false, reason: "max-solves", remainingS: Number.POSITIVE_INFINITY };
  const nextAt = rec.lastSolvedUnixS + Math.floor(rule.minDeltaS * COOLDOWN_SCALE);
  if (nowUnixS >= nextAt) return { ok: true };
  return { ok: false, reason: "cooldown", remainingS: nextAt - nowUnixS };
}

// Records a solve. Mirrors the donor's Update(): the first solve writes solves = 1;
// later solves are refused silently once the max is reached.
export function recordSolve(rule: QuestRule, rec: QuestRecord | undefined, nowUnixS: number): QuestRecord {
  if (!rec) return { lastSolvedUnixS: nowUnixS, solves: 1 };
  if (rule.maxSolves > -1 && rec.solves >= rule.maxSolves) return rec;
  return { lastSolvedUnixS: nowUnixS, solves: rec.solves + 1 };
}

// Example: a 1-hour quest with 2 solves allowed.
const rule: QuestRule = { minDeltaS: 3600, maxSolves: 2 };
let rec: QuestRecord | undefined = undefined;
const t0 = 1_000_000;
rec = recordSolve(rule, rec, t0);
const early = canSolve(rule, rec, t0 + 60);       // cooldown, 3540 s left
rec = recordSolve(rule, rec, t0 + 3600);
const capped = canSolve(rule, rec, t0 + 10_000);  // max-solves
void early; void capped;
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

Target: `origins/server/quest-cooldown.ts` (proposed new module; the gate is server-side, not in `src/fight/`). Parity row: 20 (catalogue as runtime source: `MinDelta` and `MaxSolves` are read from the catalogue at each check, not copied into the character); row 21 (catalogue fields) names the two fields. The server tick has no row of its own here; this is an interaction-time check, not a per-tick one.

## 6. Gaps and risks

- One ledger: the donor keeps the quest record on the character row and a separate runtime registry for non-player creatures (QuestManager.cs 135-170, GetQuest and GetOrCreateQuest). Frankendom needs exactly one quest record per character, written only by the server, so the chest, the item pickup and the talk path all read the same row.
- Server-verified: the donor checks `CanSolve` on the server in the interaction handlers (Chest.cs 154, Player_Inventory.cs 1254), but the kill-task path stamps with no cooldown check (QuestManager.cs 608). Frankendom's rule must be "every solve goes through one gate function", with a test for each entry point.
- Zones as data: `MinDelta` and `MaxSolves` belong in zone data per quest, as in the donor's catalogue table. The global `quest_mindelta_rate` is an engine setting, not zone data.
- The donor reuses the same integer as a count and as quest bits, and `SetQuestCompletions` clamps it to `MaxSolves` (QuestManager.cs 226). A bit-flag write on a capped quest can silently change its meaning. Frankendom should use separate fields for solves and flags.
- The donor's own comment on the on-cooldown test says "verify" (EmoteManager.cs 630). The gate itself was read; the dialogue reading of "has quest and on cooldown" is the thing the donor did not confirm.
- Not applicable to the Pit: quests and dialogue are a zone-side concern. The Pit must not read or write quest rows.
- The dialogue VM (test emotes, delays, depth-75 guard) is a second rule engine, which conflicts with "one engine". Do not port it.
- Not read: the rest of `EmoteManager.cs`, `Player_Inventory.cs` outside 1248-1262, `AdminCommands.cs` quest writes beyond the calls listed.

Reuse tag: reuse-first (reads of an AGPL donor; shape only, no port)

Brief rule served: rule 5 (callers checked for CanSolve, OnTalkDirect); rule 2 (≥3 candidate files opened: QuestManager.cs, EmoteManager.cs, Chest.cs, Player_Inventory.cs, Quest.cs); rule 4 (Best transferable idea below); rule 10 (receipts verified).

Best transferable idea: A quest solve is one server-side gate with a per-character record and a catalogue cooldown and max-solves cap, which a zone can declare as data.

Decision (proposed): adapt - take the gate shape (catalogue cooldown and max solves, one record, one gate function) for zone quests and chest/item gates, but drop the bit-field reuse and the emote-branch dialogue engine, which would be a second rule engine against "one engine".
Acceptance: A server test with rule {minDelta 3600 s, maxSolves 2}: first solve succeeds; a solve at +60 s is refused with 3540 s remaining; a solve at +3600 s succeeds; a solve at +10000 s is refused as max-solves; the quest chest reply shows the remaining time, not a silent fail.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** None found. Verified GetNextSolveTime order (334-365), CanSolve 266-279, Update 172-218 (silent return at max, no cooldown check), Stamp 484-487, ColoArena prefix 325, quest_mindelta_rate 1.0 (PropertyManager 662), SetQuestCompletions clamp 226, SetQuestBits 666-685, HandleKillTask Stamp without CanSolve, UpdateQuest 1462-1486, GetEmoteSet 1512-1553, busy gate 1584, depth 75 at 1607, OnTalkDirect 2047, Chest.cs 154, Player_Inventory.cs 1254-1260, GameActionTalkDirect 50, 'verify' comment at EmoteManager 630, AGPL-3 licence. Sketch order matches donor.

**Missed:** Minor: IsMaxSolves returns false for a quest absent from the catalogue, so Update on an unknown quest counts without a cap (donor quirk). GetEmoteSet for ReceiveTalkDirect/HearChat also admits sets with Quest==null (not only key==message).
