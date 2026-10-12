# alexbatalov-fallout2-ce (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/alexbatalov-fallout2-ce/src | Licence: Sustainable Use License 1.0 (LICENSE.md, read; byte-identical to the Fallout 1 CE LICENSE.md: internal business or non-commercial/personal use only; treated as restricted: clean-room, shape only, no code copied) | C++ | symbol gameSetGlobalVar / _gdialogGo / _gdProcessChoice
Checked: opened src/game_dialog.cc (49, 85-87, 1070-1090, 1093-1110, 1166-1190, 1254-1290, 1856-1866, 1986-1996, 2012-2016, 2024-2094, 2888-2936), src/game.cc (984-1032, 1044-1050), src/game_vars.h (1-10, 90-100, 700-703), src/interpreter_extra.cc (3755-3770), src/dialog.cc (220-246, 496-520, plus a grep for run or go functions: none). The cell hint (src/dialog.cc) is the interpreter-level reply store: it keeps option text and a proc number, and has no run loop. The working talk loop is src/game_dialog.cc, which I read at the lines above. camera_scope: n/a. Confidence: medium-high on the option, choice and end protocol (same design as Fallout 1; I read the Fallout 2 copy at the lines listed); medium on the write notice (I read the whole setter). Not read: game_dialog.cc 1270-1400 (the input loop body) and _gdProcessUpdate; the path that starts a talk from a script request (the Fallout 1 equivalent was scripts.cc:883-885; the Fallout 2 one was not traced); lip sync; the data file contents; the config reader used by the notice.

## 1. Mechanism
Talk protocol. The Fallout 2 talk is the same design as Fallout 1 (see that note): a say-end op (interpreter_extra.cc:3763-3766) calls _gdialogGo (game_dialog.cc:1166). _gdialogGo adds a fallback option with message ids -1, -1 and reaction 50 when the node offered none (1174-1177), runs _gdProcess (1184), then clears the option list (1187). _gdProcess counts re-entry (1858, 1864, 2012, 2014) and loops on input. A pick goes to _gdProcessChoice (1992 calls it; a -1 return breaks the loop, 1992-1994). That function maps the option's reaction to -1, 0 or 1 (2051-2060), calls _talk_to_critter_reacts (2075), clears the list (2077), and runs the chosen option's procedure only while the re-entry level is below 2 (2079-2081). If the list is empty after that, it returns -1 and the talk ends.

Option storage. gameDialogAddMessageOption refuses to add past DIALOG_OPTION_ENTRIES_CAPACITY (1254-1258). The proc-name form gameDialogAddMessageOptionWithProcIdentifier takes the procedure as a name and drops it: the donor comment says "silently ignored" (1093, 1107), and the option's proc slot is set to 0 (1098).

Reaction. _talk_to_critter_reacts (2888) adds 50 to the value (2897) and only plays head animations and fidgets; it writes no game state.

Global state with a write notice. game_vars.h is an enum of named slots starting at GVAR_PLAYER_REPUTATION (line 7, the first entry) and includes quest flags such as GVAR_JET_QUEST (92) and GVAR_QUEST_VAULT_CITIZEN (98), ending at line 703. gameGetGlobalVar (984-991) checks the range (986) and returns 0 when out of range. gameSetGlobalVar (995-1020) checks the range (997) and returns -1 when out of range. Between the check and the store, it compares the reputation slot: if the new value differs, it computes the difference from the old value (1003, 1007) and posts a message ("You gained N karma." or "You lost N karma.") to the monitor. Then it stores the new value (1020). The slot array is loaded from a GAME_GLOBAL_VARS section (1029).

## 2. Key functions
- _gdialogGo: game_dialog.cc:1166-1190 (fallback, process, clear).
- _gdProcess: game_dialog.cc:1856-2016 (re-entry counter at 1858-1864 and 2012-2014; input loop read only in part).
- _gdProcessChoice: game_dialog.cc:2024-2094 (choice, reaction map, proc gate, end).
- gameDialogAddMessageOption: game_dialog.cc:1254-1290 (capacity check at 1256).
- _talk_to_critter_reacts: game_dialog.cc:2888-2936 (head transitions and fidget setup only; no state writes).
- gameSetGlobalVar: game.cc:995-1021 (notice then store).

Callers: _gdialogGo is called from _op_gsay_end (interpreter_extra.cc:3766). I did not trace the other callers of _gdialogGo, _gdProcess or gameSetGlobalVar. The reputation slot is read by character_editor.cc (for example 4542 and 5511); I did not read those uses.

## 3. Numbers vs mechanism
- DIALOG_OPTION_ENTRIES_CAPACITY = 30 (game_dialog.cc:49).
- Reaction tags GOOD 49, NEUTRAL 50, BAD 51 (game_dialog.cc:85-87). The choice maps them to -1, 0, 1 (2051-2060); _talk_to_critter_reacts adds 50 back (2897). Fallback option reaction 50 (1177).
- Re-entry gate: procs run while the level is below 2 (2079).
- The notice fires only when the reputation value changes (the diff is computed first, 1007), so an unchanged write is silent. The notice text is produced in the setter, not by the caller.
- Defect (keep the idea, fix the defect): the same FIXME as Fallout 1. When the choice index is -1 (keyboard 0), the code reads a zeroed dummy entry (2026-2039). fix: reject the -1 index at input.
- Defect: the proc name is dropped (1093-1098). fix: reference next nodes by a data id checked at load time.
- Defect: get returns 0 and set returns -1 on an out-of-range slot (986-991 and 997-1000). fix: one error model for both.
- Notice text is hard-coded English and named "karma" while the slot is named REPUTATION. fix: a message id from the catalogue, and one name for the slot.

## 4. TypeScript sketch
simplified: this sketch covers the write-notice part only (the talk loop and node protocol are in the Fallout 1 sketch, the same design). It keeps the donor order (read the old value, check the watcher, notify with old and new values, then store) and the diff rule (notify only on change). It omits the donor's config flag read (the notice is always on here), the 80-byte message buffer, the sfall origin of the notice, and the save and load of the slot array. Watchers are per slot here; the donor has one hard-coded slot.

```ts
export type Notify = (slot: number, oldValue: number, newValue: number) => void;

export class NotifyingLedger {
  private readonly slots: number[];
  private readonly watchers = new Map<number, Notify>();

  constructor(slotCount: number) {
    this.slots = new Array<number>(slotCount).fill(0);
  }

  watch(slot: number, notify: Notify): void {
    this.watchers.set(slot, notify);
  }

  get(slot: number): number {
    this.check(slot);
    return this.slots[slot];
  }

  set(slot: number, value: number): void {
    this.check(slot);
    const oldValue = this.slots[slot];
    const notify = this.watchers.get(slot);
    if (notify !== undefined && value !== oldValue) {
      notify(slot, oldValue, value); // notice reads the old value, then the store happens
    }
    this.slots[slot] = value;
  }

  private check(slot: number): void {
    if (slot < 0 || slot >= this.slots.length) {
      throw new RangeError(`ledger slot ${slot} out of range`); // fix: donor returns 0 on get, -1 on set
    }
  }
}

export const REPUTATION_SLOT = 0;

// Example wiring: the donor shows "You gained N karma." or "You lost N karma." when the reputation slot changes.
export function wireReputationNotice(ledger: NotifyingLedger, feed: (line: string) => void): void {
  ledger.watch(REPUTATION_SLOT, (_slot, oldValue, newValue) => {
    const diff = newValue - oldValue;
    feed(diff > 0 ? `You gained ${diff} karma.` : `You lost ${-diff} karma.`);
  });
}
```

Typecheck: VPS, `npx -p typescript tsc --noEmit --strict --target es2020` on the file with `export {}`: exit 0.

## 5. Lands in
Target: origins/ledger/notify.ts (new module, proposed). Parity row 14 (HUD): the write notice is a message line shown to the player, and the server should send the old and new values with the verified write rather than the client computing them.

## 6. Gaps and risks
- Notices are side effects of a write. In Frankendom the server writes the ledger and sends the notice as a result of the verified write. A client that computes its own notice can show a change the server never made.
- Reputation and karma are the same slot here, and the message says "karma". Frankendom must decide whether standing is one ledger slot with one name.
- The talk protocol has the same gaps as the Fallout 1 note: a blocking loop that cannot exist in a browser, procedure names that are dropped, and a -1 choice path. Those are covered there and are not repeated here.
- Quest flags are named enum slots (for example GVAR_JET_QUEST at line 92). What sets each quest flag is in scripts that are not in this donor (not read). The reward path is not in this donor's dialogue code.
- Licence: the same Sustainable Use License as Fallout 1 (non-commercial or internal use only). Clean-room shape only.
- The interpreter-level reply store in src/dialog.cc (220-239, 508-518) keeps the proc number as an int, but its run path into the talk loop was not traced (not read). Do not treat it as the talk loop.

Reuse tag: adapt (the write-notice shape and the named ledger; clean-room under a restricted licence; no code copied).
Brief rule served: judge the idea (a ledger write that notifies with the old and new value before the store is real and checkable); confidence stated in Checked; defects kept with a fix line; sections 5-6 against the Frankendom rulings (one ledger, server-verified writes, one error model).

Best transferable idea: Every write to a named ledger slot passes the old and new value to that slot's watcher before the store, so the feed notice is derived from the one verified write.
Decision (proposed): adapt - the notify-on-write shape fits the one-ledger ruling, but the notice must come from the server's verified write, and reputation and standing need one slot and one name.
Acceptance: a player's standing changes by +3 from a verified kill-quest turn-in; the HUD line reads "You gained 3 standing." once; a write that leaves the value unchanged shows nothing; a server test asserts the notice is produced from the same write that updates the ledger row.
