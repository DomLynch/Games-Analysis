# jynew-jynew (quests-dialogue, cell 2)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/GameEventManager.cs`, `Scripts/GameSave/GameRuntimeData.cs`, `Scripts/GameMaps/LevelMaster.cs`, `Scripts/LuaCore/Jyx2LuaBridge.cs` with the Lua event scripts `Mods/JYX2/Lua/ka*.lua` | Licence: restricted (root `LICENSE`, line 8: "The use of any resources or code of this project is not permitted unless authorized by the public statement of this project."; `COMMUNITY_LICENSE_FOR_JYX2/README.md` line 6 says the community folders are covered by their own agreement and override the MIT licence) | C# (Unity, with Lua) | symbol `ModifyEvent`, `Add3EventNum`, `GameRuntimeData.ModifyEvent`, `GetModifiedEvent`, `RefreshGameEvents`

Checked: Read in full or in the cited ranges: `GameEventManager.cs` 139-186 (dispatch: Blueprint graph first, else Lua file `ka{0}`); `MODRootConfig.cs` 29; `GameRuntimeData.cs` 133-137 (KeyValues, EventCounter) and 614-660 (trigger slot store, counters, map picture); `LevelMaster.cs` 556-590 (RefreshGameEvents, called at 182 on level setup); `Jyx2LuaBridge.cs` 1644-1722 (absolute ModifyEvent, including the non-current-scene branch at 1695), 1789-1870 (relative Add3EventNum, and the counter branch for other scenes), 2340-2352 (GetEventCount), 59-75 and 1995-2002 (Talk, TalkAsync), 667-685 (flags); Lua `ka82.lua` 13 and 18, `ka1001.lua` 7, `ka47.lua`. Counted: 1019 `ka*.lua` event scripts; 24 are a bare `do return end;` stub ("parked"), counted by stripping whitespace in the shell. Not read: `GameEvent.MarkChest` (`GameEvent.cs` 178), `GetCustomerFlagPrefix`, the function behind `Judge14BooksPlaced`, the save writer `SaveToFile` (278-297), the Blueprint event path (`Jyx2ResourceHelper.LoadEventGraph`), `Jyx2Coroutine.lua`. Candidates for the quests topic: `GameEventManager.cs`, `GameRuntimeData.cs`, `LevelMaster.cs`, `Jyx2LuaBridge.cs`, `StoryEngine.cs` (106 lines; only the outline read: DisplayPopInfo, DoLoadGame, no quest logic). Confidence: moderate-high on the state ledger (read end to end); moderate on dialogue (Talk read only as signatures and one awaited wrapper). No objective list or reward table found in the code read; rewards are Lua calls (AddItem, AddExp) not read in detail.

Best transferable idea: Give each interactable one step pointer and one counter in a single flat ledger; scripts move the pointer (absolute or relative) and count separately, and the trigger reloads its pointer from the ledger when its zone loads.
Decision (proposed): adapt - take the step-pointer-plus-ledger shape for zone quest steps (no Lua, steps are zone data); split absolute from relative writes and counters from steps, and make a keep-write to a trigger in another zone read the stored value instead of clearing it.
Acceptance: In a zone a quest NPC moves from step 1 to step 2 only when the server ledger says the count reached the zone's required number; a server test asserts that a keep-write from another zone leaves the stored slot unchanged and that a count never moves a step pointer.

## 1. Mechanism

Every map trigger has three event slots: interactive (talk/inspect), use-item, and enter. Each slot holds an event id, and the id names the script to run (`GameEventManager.ExecuteJyx2Event`, 139). Dispatch order: if a Blueprint event graph exists for the name it runs (176), otherwise it runs the Lua file built from the pattern `ka{0}` (183; pattern at `MODRootConfig.cs` 29). A script ends by rewriting slot ids, so the next time the player uses the trigger a different script runs. That rewrite is the quest step.

Writes come in two forms, and the donor keeps them apart by the scene argument:

- Absolute, `ModifyEvent(scene, event, canPass, changeTo, interactive, useItem, enter, pic...)` (`Jyx2LuaBridge.cs` 1644). The value -2 means keep, -1 means none, anything else is the new id. For the current scene, -2 reads the stored slot (the trigger's own current values). For another scene, -2 is turned into -1 (1695), so "keep" clears the slot. The result is written to the ledger (1710), and then the triggers are refreshed (`LevelMaster.RefreshGameEvents`, `LevelMaster.cs` 556, called at 182 on level setup and after each write). If the interactive slot ends at -1, the chest-mark path runs (1719).
- Relative, `Add3EventNum(scene, event, v1, v2, v3)` (1789). Only when the scene is -2 (the current scene, 1816) does it change slots: -2 keeps, a value of 0 or more adds to the stored id (1823), -1 sets none, and the result is written (1846). For any explicit scene the same call instead increments counters (`AddEventCount`, 1855). So one function name means "move the pointer" or "count", depending on the scene argument.

The ledger: `GameRuntimeData` keeps `KeyValues` (a string dictionary, comment: main key-value data, 133) and `EventCounter` (137) in the same object. A trigger slot is stored as text under the key `evt_<scene>_<event>` as `interactive_useItem_enter` (`GameRuntimeData.cs` 616-617); reading splits on underscore (`LevelMaster.cs` 572-576), so every load of a zone writes the saved slots back into each trigger. Counters are keyed by scene, event and slot kind (`AddEventCount` 630, `GetEventCount` 640, read from Lua at `Jyx2LuaBridge.cs` 2349). Plain flags use the same dictionary through `jyx2_SetFlag` (667), with a prefix (not read).

Dialogue: `Talk` (71) shows one line and calls back; `TalkAsync` (1995) waits until the line finishes. Scripts are straight-line Lua, so a branch is a Lua `goto` on the result of a battle or a choice (`ka82.lua` 13: `if TryBattle(12) == true then goto label0 end;`). Dialogue choices are therefore written as code, not as a tree data structure.

Example from the scripts: `ka82.lua` 18 calls `ModifyEvent(-2, 12, 0, 0, -1, -1, -1, ...)` after a win, which clears the three slots of event 12, so the trigger does nothing on the next visit. The puzzle in `ka1001.lua` 7 calls `Add3EventNum(82,999,1,0,0)` once per placed book, which counts into scene 82, event 999 (the code's comment says it counts correctly placed books); the book check (`Judge14BooksPlaced`, not read) reads the count.

## 2. Key functions

- `ExecuteJyx2Event` and its dispatch: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/GameEventManager.cs` 139-186.
- `GameRuntimeData.ModifyEvent`, `GetModifiedEvent`, `AddEventCount`, `GetEventCount`, `SetMapPic`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/GameRuntimeData.cs` 614-660.
- `RefreshGameEvents`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/LevelMaster.cs` 556-590.
- `ModifyEvent` (absolute) and `Add3EventNum` (relative): `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/LuaCore/Jyx2LuaBridge.cs` 1644-1722 and 1789-1870.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Three slots per trigger, one per interaction kind | Slot order: interactive, use-item, enter (theirs, `GameEventManager.cs` 83, 111, 120) |
| Sentinel for "keep the stored value" | -2 (theirs, `Jyx2LuaBridge.cs` 1644 callers; 1816-1823) |
| Sentinel for "no event" | -1 (theirs, 1695, 1719) |
| Relative step: add to the stored id | Adds only for values of 0 or more (theirs, 1823); puzzle step of 1 (theirs, `ka1001.lua` 7) |
| Counter kept apart from the pointer | Counter kinds 0, 1, 2 for the three slots (theirs, 1855, 1860, 1865) |
| Required count gates a step | 14 books (theirs, comment and script name in `ka1001.lua`; the threshold function not read) |
| Ledger text per slot | Underscore-joined `interactive_useItem_enter` (theirs, `GameRuntimeData.cs` 617) |
| Script per event id, stub when parked | `ka{0}` pattern (theirs, `MODRootConfig.cs` 29); 24 stubs of 1019 (counted) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's three slots per trigger, the -2 keep and -1 none sentinels, the ledger text format and the reload from the ledger, and the split between a step (pointer move) and a count. It omits the Blueprint path, the chest mark, the map picture state, the flags, the Lua runtime, dialogue, the save format and the scene-argument switch (the donor's one function with two meanings is replaced by two functions). It changes the donor on purpose in one place: a keep-write for a trigger in another scene reads the stored value instead of clearing it (donor 1695 turns -2 into -1 there).

```ts
// Donor licence: restricted (root LICENSE: use of code or resources not permitted unless authorized). Clean-room: written from the described mechanism only, not translated.
const NONE = -1; // no event in this slot
const KEEP = -2; // keep the stored value

interface Slots {
  interactive: number;
  useItem: number;
  enter: number;
}

// One flat key-value ledger holds trigger slots, counters and flags, as in the donor's runtime data.
class Ledger {
  private kv = new Map<string, string>();
  private counts = new Map<string, number>();

  // Slots are stored as text "interactive_useItem_enter" under "evt_<scene>_<trigger>".
  getSlots(scene: number, trigger: number, defaults: Slots): Slots {
    const raw = this.kv.get(`evt_${scene}_${trigger}`);
    if (raw === undefined) return { ...defaults };
    const [i, u, e] = raw.split("_").map((s) => Number(s));
    return { interactive: i, useItem: u, enter: e };
  }

  // Absolute write: KEEP keeps the stored value, NONE clears it, anything else sets it.
  setSlots(scene: number, trigger: number, defaults: Slots, next: Partial<Slots>): Slots {
    const cur = this.getSlots(scene, trigger, defaults);
    const pick = (v: number | undefined, old: number): number =>
      v === undefined || v === KEEP ? old : v;
    const out: Slots = {
      interactive: pick(next.interactive, cur.interactive),
      useItem: pick(next.useItem, cur.useItem),
      enter: pick(next.enter, cur.enter),
    };
    this.kv.set(`evt_${scene}_${trigger}`, `${out.interactive}_${out.useItem}_${out.enter}`);
    return out;
  }

  // Relative step: a value >= 0 adds to the stored id (0 is a no-op), NONE sets none, KEEP leaves it.
  stepSlots(scene: number, trigger: number, defaults: Slots, steps: Partial<Slots>): Slots {
    const cur = this.getSlots(scene, trigger, defaults);
    const step = (v: number | undefined, old: number): number => {
      if (v === undefined || v === KEEP) return old;
      if (v === NONE) return NONE;
      return old + v;
    };
    const out: Slots = {
      interactive: step(steps.interactive, cur.interactive),
      useItem: step(steps.useItem, cur.useItem),
      enter: step(steps.enter, cur.enter),
    };
    this.kv.set(`evt_${scene}_${trigger}`, `${out.interactive}_${out.useItem}_${out.enter}`);
    return out;
  }

  // Counters are separate from slot steps, so a count never moves a pointer.
  addCount(scene: number, trigger: number, kind: number, n: number): number {
    const k = `${scene}_${trigger}_${kind}`;
    const v = (this.counts.get(k) ?? 0) + n;
    this.counts.set(k, v);
    return v;
  }

  getCount(scene: number, trigger: number, kind: number): number {
    return this.counts.get(`${scene}_${trigger}_${kind}`) ?? 0;
  }
}

export { Ledger, NONE, KEEP };
export type { Slots };
```

Typecheck: `tsc 5.6.3 --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/QD016-slots-jynew.ts`).

## 5. Lands in

- TARGET `origins/server/quest-state.ts` (new): the one-ledger step pointer per zone trigger and the counters that gate steps; the server writes it, the client only reads the step to show the right prompt. Parity-checklist row 18 (one ledger; quest rewards and XP land in the same ledger). Row 18 covers the rewards side only; no checklist row covers quest state, so this cites 18 as the one-ledger row.
- Reuse tag: rewrite-from-idea (restricted licence; clean-room only; shape only)
- Brief rule served: 1 (one ledger, zones as data; the server decides the step)

## 6. Gaps and risks

- Licence is restricted: the root LICENSE forbids use of code or resources without authorization, and the community folders have their own agreement. Shape only, no code, no assets.
- One function with two meanings (donor `Add3EventNum`): with scene -2 it moves a pointer, with an explicit scene it counts. Fix in the sketch: two functions. Frankendom must not allow a single call to switch meaning on a parameter.
- Keep-write for another zone clears the slot (donor 1695). Fix in the sketch: read the stored value. A zone's trigger state must not be erased by a write from another zone.
- The donor refreshes triggers after every write (1710, LevelMaster 182 and 556). Frankendom has one server ledger; the client should re-read the step, not hold a copy.
- Required counts (14 books) live in script code. Frankendom wants them as zone data: the required count is a number on the step, not a constant in a script.
- Stale state: slots reload from text on zone load, so a malformed value breaks the trigger (the donor logs and continues; `LevelMaster.cs` 585 logs the parse error). Frankendom: validate on read and fail the test, do not default silently.
- No objective list or reward table is in the code read; rewards go through Lua (AddItem, AddExp), not read in detail. The reward path is row 18's business.
- Dialogue is written as Lua straight-line code with awaited lines (`TalkAsync` 1995) and branch by goto. Frankendom has no Lua runtime in the fight; any dialogue tree must be zone data, not code, so this part is rejected.
- Parked scripts: 24 of 1019 event files are a bare stub. Frankendom should keep an unused step as a data row with a null action, not an empty script file.
- Save format (`SaveToFile` 278, not read) is needed to confirm the ledger is in the archive; until then the one-ledger claim is about the in-memory dictionary.

Reuse tag: rewrite-from-idea (restricted licence; clean-room only; shape only)
Brief rule served: 1 (one ledger, zones as data; the server decides the step)
