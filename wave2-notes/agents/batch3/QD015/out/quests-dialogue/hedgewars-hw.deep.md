# hedgewars-hw (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/SimpleMission.lua` | Licence: GPL-2.0 (as read: repo `COPYING` is GNU GPL version 2, June 1991; `SimpleMission.lua` and the Teamwork mission carry no licence header of their own) | Lua | symbol `SimpleMission` (goal checks: `_G.sm.checkGoal`, `_G.sm.checkGoals`, `_G.sm.checkNonGoals`, `_G.sm.checkWinOrFail`)

Checked: `SimpleMission.lua` 1-262 read (header and parameter docs 1-199, setup 229-262); 293-467 (goal dispatch, goals, non-goals) read in full; 470-561 (regular victory, check-and-decide, win, lose) read in full; 563-746 (engine hooks, team fix-up, result) read in full; 891-897 read. Not read: `makeStats` 260-283, `criticalGearFailText` 284-292, `onGameStart` 768-890 (mines, ammo, text). `Scripts/Tracker.lua` 1-30 and 118-150 read (gear value store). `Missions/Scenario/User_Mission_-_Teamwork.lua` read in full (113 lines). `Missions/Scenario/Big_Armory.lua` 1-13 read (data call). `Scripts/Locale.lua` read in full; the locale tables were grepped, not parsed (`Locale/cs.lua` has about 2,990 lines, one key per line). `Scripts/Animate.lua` read in part (20-150, 276-444) and the driver in `Missions/Campaign/A_Space_Adventure/desert01.lua` 220-227 read. Callers: `lose` and `win` are called only from `checkWinOrFail` (509, 511, 513); `checkRegularVictory` only from the turn hooks (723, 732); `customGoals` appears only in `SimpleMission.lua` in this box (no shipped mission uses it). Not read: the engine's end-of-game path (what happens after `EndGame` and `onGameResult`). Confidence: high on the goal and win/lose order as written; medium on the effect of the win/lose defects, which depends on the engine.

Best transferable idea: a mission is a list of goals (each met, not yet, or impossible, with its own fail text) plus non-goals that lose at once, checked on a chosen cadence from facts the engine events record per unit.

Decision (proposed): adapt - take the goal list as data, the three-way result, the non-goal list and the check cadence; keep the author's fail text; drop the Lua-only parts (the pairs order and the shared ended flag) and write facts from the server kill record into the one ledger.

Acceptance: a server test sets an objective list of one single-hit goal (a boss takes one blow of 40 or more) and one non-goal (an escort dies); the duel stays open until the blow lands, a dead escort ends it with the author's text, and a goal failure shows the author's text, not an empty reason.

## 1. Mechanism

- A mission is data: a table with `customGoals` (all must be met to win), `customNonGoals` (any one loses) and `customGoalCheck` (`"instant"`, `"turnStart"` or `"turnEnd"`). If goals or non-goals are given and no check mode is set, it defaults to `"instant"` (`SimpleMission.lua` 239-240). Each goal is a table with a `type`, its own parameters and an optional `failText` (32-197 document the types).
- Each goal check returns one of three results: `true` (met), `false` (not yet), or `"fail"` with a text (impossible from now on). Examples read: destroy returns the destroyed fact (295); collect returns `"fail"` when an enemy takes the crate or the crate is destroyed uncollected (297-321); turns compares the turn counter (323); damage compares the largest single blow with the threshold (372) and counts a destroyed gear as success unless `canDestroy == false` (375, 382-383); inZone and distance goals check the gear's destroyed flag first (327-329, 340-342).
- Facts are written by engine events into a per-gear table. `onGearAdd` sets the defaults for water skips, max damage, drowned and destroyed (571-583). `onGearDelete` records a crate's collector when the destroy message is set (593-596) and marks the gear destroyed (610). `onGearDamage` keeps the largest single blow (613-616). Reads and writes go through `getGearValue` and `setGearValue` in `Tracker.lua` (120-125, 128-139).
- Order inside each decision (`checkWinOrFail`, 502-515): first the non-goals; any non-goal that returns true loses with its own text (506, 509). Then the goals (`checkGoals`, 434-452): they are walked in table order and the first goal that is `false` or `"fail"` ends the walk and is returned (438-445). A `"fail"` loses (510-511); a `true` from every goal wins (512-513). If there are no goals, `checkGoals` returns nil and nothing is decided here (449-450).
- Cadence: the decision runs once per `onGameTick20` call in `"instant"` mode (892-893), at the start of each turn in `"turnStart"` (722-724), and at the end of each turn in `"turnEnd"` (731-733). The turn counter goes up at each end of turn, before the turnEnd check (729).
- Win and lose are one-shot: both are guarded by `gameEnded` (518, 538). A win writes the `Won` variable, sends the stats and ends the game (517-535). A loss picks the first living non-player team as the winner (549-557), sends the stats and ends the game (537-561).
- Team names in goals are fixed up after the engine renames a team on collision (668-679). Goal gears are found by their id, stored at setup (709).
- The Teamwork mission (`User_Mission_-_Teamwork.lua`) does not use the framework. It is a hand-written mission with two small rules. Losing either player hog sets both hogs' health to zero, once, behind a `GameOver` latch (96-99). Destroying a crate with the destroy message adds 5000 ms to the turn timer and shows "+5 seconds!" (90-93). The win writes the `Won` variable in the result hook (105-106).

## 2. Key functions

- `SimpleMission` (setup): `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/SimpleMission.lua` 229-262, default cadence 239-240.
- `_G.sm.checkGoal` (one goal, all types): same file, 293-427.
- `_G.sm.checkGoals` (ordered walk, first unmet goal decides): same file, 434-452.
- `_G.sm.checkNonGoals` (any non-goal loses): same file, 457-467.
- `_G.sm.checkRegularVictory` (all enemy teams defeated, player teams alive; sets the ended flag): same file, 470-499.
- `_G.sm.checkWinOrFail` (non-goals, then goals, then win or lose): same file, 502-515.
- `_G.sm.win` and `_G.sm.lose` (one-shot end): same file, 517-561.
- Engine event hooks for facts: `onGearAdd` 571-583, `onGearDelete` 592-611, `onGearDamage` 613-618, turn hooks 719-735, tick hook 891-895.
- Per-gear value store: `/mnt/frankendom-donors/hedgewars-hw/share/hedgewars/Data/Scripts/Tracker.lua` 11, 26-27, 120-125, 128-139, 142-148.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Three-way goal result: met, not yet, impossible with a reason | The `"fail"` tag and the text (theirs, `checkGoal` 293-427) |
| Non-goals checked first; any one loses | None (theirs, 457-467) |
| Goals walked in order; first unmet goal decides | Walk order is table order (theirs, 436) |
| Check cadence as data: instant, turn start, turn end | Default `"instant"` (theirs, 240; checks 722, 731, 892) |
| Turn counter, +1 at each turn end | +1 (theirs, 729) |
| Damage goal: largest single blow reaches N | Default N = 1 (theirs, 370) |
| Destroyed counts as success for a damage goal unless it is forbidden | `canDestroy == false` forbids it (theirs, 375) |
| Collector recorded when a crate is taken | Destroy message bit (theirs, 90 in Teamwork; 593 in SimpleMission) |
| Turn-timer bonus per crate (Teamwork only) | 5000 ms (theirs, Teamwork 91) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: non-goals first, then goals in list order, with the first unmet goal deciding and a failed goal losing. It fixes the lost fail text by keeping the author's text, then the reason the check gives. It omits the per-gear fact store and the engine hooks that write facts, the stats text, the win and lose side effects (Won variable, end-of-game call), the team-name fix-up, the regular-victory check and the default goal. It replaces the donor's `pairs` walk with an ordered array. The damage goal is written from the donor's branch order (destroyed counts as success unless forbidden).

```ts
// Licence: GPL-2.0 (donor, Hedgewars repo COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Verdict = { kind: "met" } | { kind: "pending" } | { kind: "failed"; reason: string };

interface Goal {
  id: string;
  failText?: string;      // the mission author's text, shown first if this goal fails
  check: () => Verdict;
}

interface NonGoal {
  id: string;
  failText?: string;
  check: () => boolean;   // true = the player loses
}

type Outcome = { kind: "win" } | { kind: "lose"; reason: string } | { kind: "open" };

// Non-goals first (any one loses). Then goals in list order: the first goal that is not met decides.
function evaluate(goals: Goal[], nonGoals: NonGoal[], defaultFail: string): Outcome {
  for (const n of nonGoals) {
    if (n.check()) return { kind: "lose", reason: n.failText ?? defaultFail };
  }
  for (const g of goals) {
    const v = g.check();
    if (v.kind === "met") continue;
    // fix: keep the author's text, then the reason the check gives (the donor drops both)
    if (v.kind === "failed") return { kind: "lose", reason: g.failText ?? v.reason };
    return { kind: "open" }; // pending: stop here and check again later
  }
  return goals.length > 0 ? { kind: "win" } : { kind: "open" };
}

// Facts an engine event writes once per event (not per frame).
interface GearFacts {
  destroyed: boolean;
  maxHit: number; // largest single blow the gear has taken
}

// Example goal: the gear must take one blow of at least `min`. If it is destroyed first,
// the goal still counts as met unless canDestroy is false (the donor's default).
function singleHitGoal(id: string, facts: GearFacts, min: number, canDestroy: boolean, failText?: string): Goal {
  return {
    id,
    failText,
    check: (): Verdict => {
      if (facts.maxHit >= min) return { kind: "met" };
      if (facts.destroyed) {
        return canDestroy
          ? { kind: "met" }
          : { kind: "failed", reason: "destroyed before it took the required hit" };
      }
      return { kind: "pending" };
    },
  };
}

// Turn counter goal: met once `turns` turn-ends have been counted.
function turnsGoal(id: string, counter: { turns: number }, turns: number): Goal {
  return {
    id,
    check: (): Verdict => (counter.turns >= turns ? { kind: "met" } : { kind: "pending" }),
  };
}
```

## 5. Lands in

- TARGET `origins/quests/objectives.ts` (proposed new module; no Frankendom file was read for this note). It holds a quest's objective list as data and returns win, lose or open from the one ledger. Engine checks stay in `src/fight/` where they read kill facts; the objective module only reads them.
- Parity row: no row in 1-23 covers objectives. Row 17 (death and respawn) is the nearest, because the objectives read the destroyed fact that a kill writes. Lead should decide whether objectives need their own row.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (facts go to the one ledger, not a Lua table beside it); zones as data (objective lists are data per zone)

## 6. Gaps and risks

- Fail text lost (as read): `checkGoals` takes the goal's own text or `customFailText` (437, 443), and `customFailText` is not defined anywhere in `Scripts/` (grep: its only use is line 443). The goal's default text returned by `checkGoal` (437, for example the crate text at 318) is never used. `checkWinOrFail` passes `goalText` (511) instead of `goalFailText` (507), and `goalText` is also not defined in `Scripts/`. So a goal that fails sends nil as the reason. Fix: keep the author's text, then the check's reason (sketch).
- Win and lose latched in turn modes with custom goals (as read): `checkRegularVictory` sets `gameEnded` when all enemy teams are defeated and the player's teams are alive (497), but does not call `win` (its only callers are the turn hooks, 723 and 732). `win` and `lose` both do nothing once `gameEnded` is set (518, 538). So after an enemy wipe in a turn mode, a goal result cannot win or lose the mission in that call (`checkWinOrFail` 509-513), and in every later call, because nothing clears the flag. Also, `onGameResult` writes `Won` only when `customGoals` is nil (738), so with custom goals the engine's result path would report a failed mission. The engine's end-of-game behaviour was not read, so the user-visible effect is not confirmed. Fix: decide win or lose in one place; never set the ended flag from a check.
- Regular defeat not implemented (as read): the header says the mission always fails when the player's hogs and allies are defeated (line 121). `lose` is called only from `checkWinOrFail` (509, 511), and `checkRegularVictory` only sets the win side. Confirm in the engine before relying on it.
- Table order: `pairs` over the goal list (436, 459) has no guaranteed order in Lua, so which failing goal is reported first is incidental. Fix: an ordered array, as in the sketch.
- Writes scan every stored gear: `setGearValue` (130-135) and `increaseGearValue` (143-147) loop over all entries, while `getGearValue` reads the entry directly (121-122). Event-rate only, not per frame. Fix: index directly.
- Deleted gears keep their facts in SimpleMission missions: `trackDeletion` (26-27) is called only by the multiplayer modes in this box (grep), not by `SimpleMission`. Minor memory growth.
- Against Frankendom's rulings: a kill is server-verified, so the `destroyed` fact must come from the server's kill record, never from a client event. Turn-start and turn-end cadence are turn modes; Frankendom's duel is real time, so objectives run on the fixed server tick (row 17 for the fact; the tick itself is row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- No rewards here: the mechanism writes the `Won` variable and the stats only. The Teamwork crate bonus (+5000 ms to the turn timer) is a turn-timer rule, not XP or loot; Frankendom's reward path is row 18 and is not covered by this note.
- Dialogue and parked scripts: this note has no dialogue tree. The only dialogue line in the Teamwork mission is a think bubble (87). A second mechanism for parked scripts exists in `Scripts/Animate.lua`: a step queue where a wait adds ticks to a counter (142), the counter drops once per tick (134), the step list parks while it is non-zero (341-343), and events are not checked while a cinematic runs (driver `desert01.lua` 222 and 226). It has three defects as read: `AnimMove` ends when X or Y matches exactly, not both (189); `AddNewEvent` tests the last event's type instead of the candidate's (382); `RemoveEvent` adjusts the scan index in the branch that is only reached when the event was not found (393-398). It is not written up here and needs its own cell.
- GPL-2.0: clean-room only. The sketch is written from the described order of operations, not translated from the donor.
