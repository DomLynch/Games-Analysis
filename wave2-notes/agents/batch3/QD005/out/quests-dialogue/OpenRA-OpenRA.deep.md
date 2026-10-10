# OpenRA-OpenRA (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/MissionObjectives.cs` (objective state, win and lose; lines 20-200 read), driven by the mission script `/mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua` (whole file read, 105 lines) | Licence: GPL-3.0 (COPYING line 2: "Version 3, 29 June 2007"; clean-room only, shape only) | C# plus Lua | symbols `MissionObjectives`, `MissionObjectiveProperties`, `soviet01.lua` `WorldLoaded` and `Tick`

Checked: The hint file was the right file for the mission side (soviet01.lua). The engine side is `MissionObjectives.cs` (read 10-200; the rest, 200 onward, was not read and is about forced defeat and co-op edge cases). Callers checked: `MarkCompleted` and `MarkFailed` are called from the Lua binding (`MissionObjectiveProperties.cs` 65, 78) and from the built-in conquest and strategic victory conditions (`ConquestVictoryConditions.cs` 61-98, `StrategicVictoryConditions.cs` 88-144), so the trait is the single writer for both script and built-in victory. Tick driver: `LuaScript` (`LuaScript.cs` 49-51) calls `Context.Tick()`, which calls the Lua global `Tick` once per call (`ScriptContext.cs` 228, 296-304); the donor's world tick rate is not read. Not read: `InitObjectives` (called at `soviet01.lua` 75, defined elsewhere), the `Reinforcements` and `Paradrop` implementations, the map's actor list (`map.yaml`), and the remainder of `OnAllRemovedFromWorld` after 300. Confidence high for the objective state machine and for the order of the Tick check; medium for what the script does on each event, because the actor-level effects are in the engine (not read). Depth full for the mechanism as written in the donor.

Best transferable idea: One trait owns objective state, transitions are one-way and idempotent (a repeat completion is a no-op), a win needs every required objective completed, and scripts only ever call that writer, so a per-tick check and a one-shot world event cannot double-count.
Decision (proposed): adapt - keep the one writer, the one-way idempotent states and the required gate; replace the per-tick poll with event-driven checks, and make the completion/failure terminal (the donor lets a completed objective be marked failed).
Acceptance: A server test asserts that completing an objective twice gives one win and no second event, that a failed required objective ends that player's run, and that a completed objective cannot later become failed; in the client the quest log shows the objective once as Completed.

## 1. Mechanism

- Objectives are a list on the player. `Add` appends a new objective with state Incomplete, announces it and returns its index (`MissionObjectives.cs` 115-125, 34). Lua's `AddPrimaryObjective` (`utils.lua` 20-24) announces the text, then calls `AddObjective` with `required = true` (`MissionObjectiveProperties.cs` 35-46).
- `MarkCompleted` (127-144): returns at once if the index is out of range or the state is not Incomplete (129-130), so a repeat call does nothing. It sets Completed (132), notifies the objective listeners, and only for a required objective checks whether every required objective is now Completed (136-137). If so it calls the won hook (139-142) and then the game-over check (142).
- `MarkFailed` (146-162): returns only for an out-of-range index or an objective already Failed (148), so a Completed objective CAN become Failed (the donor's own doc at `MissionObjectiveProperties.cs` 69-72 says so). It sets Failed (151); for a required objective it calls the lost hook (155-158) and the game-over check (160).
- Game over (164-175): checked after a win or a loss. It is over when every player is NonCombatant, or already has a win state, or has no objectives (166). Then the world ends after `GameOverDelay` = 1500 ms (52, 169-173).
- Win and lose hooks: in a solo game the player's win state is set (198); in co-op the win waits until every ally has completed its own objectives (179-195). Early game over (`EarlyGameOver`, 49) forces the enemies to lose (192-193).
- Script wiring, `soviet01.lua`, in order:
  (a) `WorldLoaded` (70-99): cache the players (71-73); `InitObjectives(USSR)` (75, not read); add `raze-village` as the primary objective (77); arm the airfield watch (79-81) that marks it failed when all three airfields leave the world; bridge trigger (83); spawn the paratroop power proxy (85); a 2-second delay before the yak insertion (86); the paratrooper anchors (87); the panic attack on damage to the hay house (88); and the two pillbox-barrel kills that kill their pillboxes (89-98).
  (b) `Tick` (101-105), every tick: if France has no required units AND Germany has no required units (102), mark the objective completed (103).
  (c) Paratroopers (42-57): the death of any of three anchors (StartJeep 43, Church 48, ParaHut 53) calls the same drop handler. Each anchor dies once, so the drop happens at most three times.
  (d) Panic (59-68): on the first damage to the hay house, if the latch `HouseDamaged` is not set, three French units are reinforced at the civilian spawn and told to move and panic (60-66); the latch is set true after the check (67), so the next hit does nothing.
  (e) Yak insertion (12-22): three yaks are created at the entry point, moved to the start jeep, and told to return to one of three airfields.
- Tick cost: `HasNoRequiredUnits` (`PlayerExtensions.cs` 19-24) scans every `MustBeDestroyed` actor in the world for each call; `Tick` makes two such calls per tick (102).

## 2. Key functions

- `MissionObjectives.MarkCompleted`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/MissionObjectives.cs` 127-144. One-way, idempotent, required gate.
- `MissionObjectives.MarkFailed`: same file, 146-162. Only Failed is idempotent; a Completed objective can become Failed.
- `MissionObjectives.CheckIfGameIsOver`: same file, 164-175. Game over after a delay.
- `MissionObjectives.Add`: same file, 115-125.
- `MissionObjectiveProperties` (the Lua binding): `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Scripting/Properties/MissionObjectiveProperties.cs` 35-126.
- `soviet01.lua` event wiring and Tick: `/mnt/frankendom-donors/OpenRA-OpenRA/mods/ra/maps/soviet-01/soviet01.lua` 42-105.
- `TriggerGlobal.OnAllRemovedFromWorld`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Scripting/Global/TriggerGlobal.cs` 266-300. Fires when a watched group reaches zero, and a member that re-enters re-arms it.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One-way objective state, repeat completion is a no-op | Three states Incomplete / Completed / Failed (theirs, `MissionObjectives.cs` 20) |
| Win when every required objective is completed | No number; the required flag per objective (theirs, 137) |
| Game over after a short delay | 1500 ms (theirs, 52) |
| Latch a world effect to once | Latch variable `HouseDamaged` (theirs, `soviet01.lua` 60, 67) |
| Delayed follow-up after load | 2 s (theirs, `soviet01.lua` 86, `DateTime.Seconds(2)`) |
| Anchor group drops reinforcements on any death | 3 anchors (theirs, `soviet01.lua` 43, 48, 53) |
| Airfield group fails the objective when all leave | 3 airfields (theirs, `soviet01.lua` 10) |
| Completion poll | Every tick (theirs, `soviet01.lua` 101-103; tick rate not read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's one writer, the one-way idempotent states, the required gate that returns "won" only on the completion that finishes the required set, the latch, the group watch and the per-tick poll. It changes three things on purpose: (a) a completed objective cannot become failed (the donor allows it at 148), so the terminal states are one-way; (b) the poll is a function the caller can call on an event as well as each tick, and the sketch's `pollCompletion` does not scan the world itself; (c) the group watch takes a set of ids, not actor objects. It omits the co-op win, the early game over, the game-over delay, the announcements and the trigger registry.

```ts
// Licence: GPL-3.0 (donor OpenRA). Clean-room sketch of the shape only, written from the described mechanism, not a translation.
export type ObjectiveState = "incomplete" | "completed" | "failed";

export interface Objective {
  id: number;
  required: boolean;
  state: ObjectiveState;
}

export class Objectives {
  private list: Objective[] = [];

  add(required: boolean): number {
    const id = this.list.length;
    this.list.push({ id, required, state: "incomplete" });
    return id;
  }

  // One-way and idempotent: a repeat call from a per-tick poll is a no-op.
  // Returns "won" only when this completion makes every required objective completed.
  complete(id: number): "won" | "none" {
    const o = this.list[id];
    if (o === undefined || o.state !== "incomplete") return "none";
    o.state = "completed";
    const allRequiredDone = this.list.filter(x => x.required).every(x => x.state === "completed");
    return o.required && allRequiredDone ? "won" : "none";
  }

  // A failed required objective loses. The donor also lets a completed objective be marked failed; this sketch does not.
  fail(id: number): "lost" | "none" {
    const o = this.list[id];
    if (o === undefined || o.state !== "incomplete") return "none";
    o.state = "failed";
    return o.required ? "lost" : "none";
  }
}

// A world event that must act once (donor: HouseDamaged latch in soviet01.lua, set after the first hit).
export class Latch {
  private fired = false;

  fire(effect: () => void): boolean {
    if (this.fired) return false;
    this.fired = true;
    effect();
    return true;
  }
}

// Fires once when every watched id has left the world; a watched id that comes back re-arms the watch.
export class GroupWatch {
  private watched: Set<number>;
  private live: Set<number>;

  constructor(ids: number[], private onEmpty: () => void) {
    this.watched = new Set(ids);
    this.live = new Set(ids);
  }

  removed(id: number): void {
    if (!this.live.delete(id)) return;
    if (this.live.size === 0) this.onEmpty();
  }

  readded(id: number): void {
    if (this.watched.has(id)) this.live.add(id);
  }
}

// Poll-style completion: call each tick or on an event; the idempotent complete() makes repeats harmless.
export function pollCompletion(obj: Objectives, id: number, enemyRequiredAlive: number[]): "won" | "none" {
  if (enemyRequiredAlive.some(n => n > 0)) return "none";
  return obj.complete(id);
}
```

## 5. Lands in

- TARGET `origins/quests/objectives.ts` (proposed path, not checked against the repo): the one writer of objective state on the server, with `complete` and `fail` as the only transitions, and zone-data triggers (anchor groups, latches, watch groups) that can only call those two functions. Parity-checklist row 18 (loot roll and XP award): an objective completion is the step that grants the reward, so the reward write must come from the same one-time transition.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (objective states and the win are written once, server side); zones as data (triggers and groups are zone data, not per-map script).

## 6. Gaps and risks

- The script and the engine disagree on who counts. `Germany` is `NonCombatant: True` (`map.yaml` 32), and the engine's enemy cache excludes NonCombatant players (`MissionObjectives.cs` 112), yet `Tick` waits for Germany's required units to be gone (`soviet01.lua` 102). This may be intended; the point for Frankendom is that "which players must be cleared" should be one data field per objective, not an implicit rule.
- Per-tick scan. `HasNoRequiredUnits` walks every `MustBeDestroyed` actor (`PlayerExtensions.cs` 22-23), and `Tick` calls it twice per tick (`soviet01.lua` 102). Fix: check on the death of a required actor, or every N ticks; the sketch's `pollCompletion` takes the counts from the caller, so the caller decides the cadence.
- Possible instant completion. If an enemy has no `MustBeDestroyed` actors when the poll starts, the first `Tick` completes the objective (`soviet01.lua` 102-103). The map's actor list was not read, so this is a risk, not a verified bug. Fix: a zone must assert that each required player has at least one required actor at load.
- Complete-then-fail is allowed by the donor (`MissionObjectives.cs` 148; doc at `MissionObjectiveProperties.cs` 69-72). This changes the outcome after a win was already recorded. Fix: terminal states, as in the sketch.
- The group watch re-arms when a member re-enters (`TriggerGlobal.cs` 266-300, re-add path after 300 not fully read). The callback can fire again; the donor's `MarkFailed` is idempotent for Failed, so the harm is only a repeated call. Fix: latch the watch once it has fired.
- Latches and drops are per-map Lua. Frankendom should carry the anchors, the latch and the group as zone data with a fixed set of verbs, not as script code.
- String table: the RA Lua locale `mods/ra/fluent/lua.ftl` has 463 lines, of which 286 contain " = " (Fluent `key = text` lines). The keys read are `objective-failed` (line 2), `objective-completed` (3), `new-primary-objective` (8), `new-secondary-objective` (9) and `raze-village` (351). The rest was not counted. The map's own `map.ftl` has one key (`briefing`).
- Co-op rules (`Cooperative`, `EarlyGameOver`) are for multiplayer coop missions; Frankendom's duel and zone runs are single-winner, so only the single-player branch (198) transfers.
