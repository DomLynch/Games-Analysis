# alexbatalov-fallout1-ce (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/alexbatalov-fallout1-ce/src | Licence: Sustainable Use License 1.0 (LICENSE.md, read: use and derivative works only for internal business or non-commercial/personal use; distribution free of charge for non-commercial purposes; treated as restricted: clean-room, shape only, no code copied) | C++ | symbol gDialogGo / gDialogProcessChoice
Checked: opened game/gdialog.cc (60-90, 127, 595-600, 714-737, 992-1060, 1116-1142, 1244-1300 partly, 1382, 1395-1426, 1427-1503, 2101-2150); game/game.cc (918-950); game/game_vars.h (1-14, 147-160, 415-436, 620-629); game/scripts.cc (876-892, 1025-1032 partly); int/support/intextra.cc (3096-3106); int/intlib.cc (762-790 and a grep); int/dialog.cc (406-440, 526-532 and the function list). The cell hint (int/intlib.cc) is the WRONG file for the working dialogue: its say-start bridge calls int/dialog.cc dialogGo, which is a stub (see section 1). camera_scope: n/a. Confidence: medium-high on the option/choice/end protocol (read end to end); medium on the blocking input loop (gDialogProcess input and redraw, 1300-1394, not read in full). Not read: gDialogProcessUpdate, the review screen body, what text the fallback option shows, the .int script bodies that set the global vars (the donor has no script or .msg data files: a find over the donor found none), reputation and karma.

## 1. Mechanism
The working talk path is game/gdialog.cc, not int/intlib.cc. Scripts start a talk in one of two ways: a deferred request flag (scripts.cc:1030 sets SCRIPT_REQUEST_DIALOG; scripts.cc:883-885 consumes it and calls gdialog_enter), or a say call that ends in op_gsay_end (intextra.cc:3100-3103), which calls gDialogGo. The say-start path (intlib.cc:894) calls int/dialog.cc dialogGo, which is a stub that returns -1 with "TODO: Incomplete." (dialog.cc:526-529). So the script-level say-start bridge does not run a talk in this donor.

A talk is a loop of nodes. Each node is a script procedure that offers options by calling gDialogOption (gdAddOption stores message list id, message id and reaction, gdialog.cc:1000-1019, 1046-1050). When the script's say-end calls gDialogGo (gdialog.cc:1116), gDialogGo adds a default neutral option if the node offered none (1125-1127), then calls gDialogProcess, which runs its input loop until the talk ends (the loop breaks at 1382). The option list is cleared after the loop (1137).

Order of operations for one pick (gDialogProcessChoice, gdialog.cc:1427-1503):
1. Write the chosen line to the review log (1448).
2. Map the option's reaction tag (GOOD 49, NEUTRAL 50, BAD 51) to -1, 0, 1 (1456-1458, enum at 84-86).
3. Redraw the reply and option windows and highlight the choice (1480 is preceded by the redraw calls).
4. Call talk_to_critter_reacts(v1) (1480): it adds 50 to the value (2110) and only plays head or fidget animations. Nothing in that function writes game state.
5. Clear the option list (1482).
6. If the re-entry level is below 2, run the option's procedure (1484-1486). That procedure is the next node: it calls gDialogOption again to refill the list.
7. If the list is still empty, return -1 (1492). The caller's loop breaks on -1 (1382), which ends the talk. Otherwise redraw the options and wait again.

gDialogOption takes the procedure as a name (const char* proc, 1046), and the donor comment says the name is "silently ignored" (1043, 1057); the option's proc slot is set to 0 (1048). The int form gDialogOptionProc (1068) takes a proc number; its body was not read.

Global state is a flat int ledger. game_vars.h is an enum of named slots (GameGlobalVar, 6-625; for example GVAR_SAUL_QUEST at 151 and GVAR_TRISH_QUEST_1 at 417, with quest step counters 417-436). Access is game_get_global_var (game.cc:922-929) and game_set_global_var (game.cc:933-941), both range-checked against num_game_global_vars. Values are loaded from a GAME_GLOBAL_VARS section (game.cc:948). Get returns 0 on an out-of-range slot and set returns -1 (game.cc:924-929, 935-940).

## 2. Key functions
- gDialogGo: gdialog.cc:1116-1142 (fallback option, process, clear).
- gDialogProcess: gdialog.cc:1260-1402 (re-entry counter at 1268 and 1402; input loop at 1270-1394, read in part).
- gDialogProcessChoice: gdialog.cc:1427-1503 (the protocol above).
- gdAddOption / gDialogOption: gdialog.cc:1000-1019 and 1046-1050.
- talk_to_critter_reacts: gdialog.cc:2101-2150 (cosmetic only).
- game_get_global_var / game_set_global_var: game.cc:922-941.

Callers: gDialogGo is called from op_gsay_end (intextra.cc:3103) and gDialogSayMessage (gdialog.cc:1251). gdialog_enter is called from the deferred request (scripts.cc:885). I read these call sites; I did not read every caller of game_set_global_var (the worldmap and option code use it too, and only worldmap.cc lines were grepped).

## 3. Numbers vs mechanism
- DIALOG_OPTION_ENTRIES_CAPACITY = 30 (gdialog.cc:64). When full, gdAddOption returns -1 with a debug print and the option is dropped (1002-1004).
- Re-entry guard: a chosen option's procedure runs only while the re-entry level is below 2 (1484). The counter is incremented at 1268 and decremented at 1402.
- Reaction tags: GOOD 49, NEUTRAL 50, BAD 51 (84-86). The choice maps them to -1, 0, 1 (1456-1458). talk_to_critter_reacts adds 50 back (2110), so the mapping is a round trip. The default fallback option uses 50, neutral (1127).
- Ledger: the slot count is loaded from the file, not fixed in code (game.cc:948).
- Defect (keep the idea, fix the defect): the donor marks a known buffer underread when the choice index is -1 (keyboard 0), gdialog.cc:1429-1444; it falls back to a zeroed dummy option (1444). fix: never pass -1 into the choice path; reject the index at input and show an explicit "no option" state.
- Defect: gDialogOption ignores the proc name (1043, 1048). fix: reference the next node by a data id that is checked at load time.
- Defect: ledger get and set report errors in different ways (game.cc:924-929 returns 0, 935-940 returns -1). fix: one error type for both (throw or a typed result).

## 4. TypeScript sketch
simplified: the sketch keeps the donor order (review log, then mood, then clear the list, then run the chosen node, then end if nothing was offered) and the fallback "leave" option. It omits the donor's blocking loop and nested dialogue (the proc is run once and its options are collected, not re-entered), the re-entry guard at level 2 (not modelled), the redraw and highlight, the fallback option's real message ids (-1, -1), the -1 dummy path, and the ledger's save/load section. The capacity 30 is the donor value (gdialog.cc:64). The ledger is a clean-room shape of the flat-array idea with range-checked get and set that both throw.

```ts
export type Reaction = 'good' | 'neutral' | 'bad';

export type AddOption = (text: string, reaction: Reaction, next?: Node) => void;
export type Node = (add: AddOption) => void; // a node proc: offers options for this step

export interface Option {
  text: string;
  reaction: Reaction;
  next?: Node;
}

export interface TalkEnv {
  choose(texts: string[]): number; // player input; index into the list
  mood(reaction: Reaction): void;  // NPC head/mood only; must not change game state
  review(text: string): void;      // log of chosen lines
}

const MAX_OPTIONS = 30; // donor: gdialog.cc:64 DIALOG_OPTION_ENTRIES_CAPACITY

function collect(node: Node): Option[] {
  const out: Option[] = [];
  node((text, reaction, next) => {
    if (out.length < MAX_OPTIONS) {
      out.push({ text, reaction, next });
    }
  });
  return out;
}

// Runs one talk. Order per step: choose, log, mood, clear the list, run the chosen node, end if nothing was offered.
export function talk(start: Node, env: TalkEnv): void {
  let options = collect(start);
  for (;;) {
    if (options.length === 0) {
      // gDialogGo fallback: a neutral "leave" option when the node offered nothing.
      options = [{ text: '(leave)', reaction: 'neutral' }];
    }
    const picked = options[env.choose(options.map((o) => o.text))];
    env.review(picked.text);
    env.mood(picked.reaction);
    options = [];
    if (picked.next !== undefined) {
      options = collect(picked.next);
    }
    if (options.length === 0) {
      return; // no next options: the talk ends
    }
  }
}

// Named integer ledger: slots are an enum-like index; get and set are range-checked.
export class Ledger {
  private readonly slots: number[];

  constructor(slotCount: number) {
    this.slots = new Array<number>(slotCount).fill(0);
  }

  get(slot: number): number {
    if (slot < 0 || slot >= this.slots.length) {
      throw new RangeError(`ledger slot ${slot} out of range`); // fix: donor returns 0 here, -1 on set
    }
    return this.slots[slot];
  }

  set(slot: number, value: number): void {
    if (slot < 0 || slot >= this.slots.length) {
      throw new RangeError(`ledger slot ${slot} out of range`);
    }
    this.slots[slot] = value;
  }
}
```

Typecheck: VPS, `npx -p typescript tsc --noEmit --strict --target es2020` on the file with `export {}`: exit 0.

## 5. Lands in
Target: origins/dialogue/talk-nodes.ts (new module, proposed). Parity row 20 (catalogue as runtime source): the node graph and option text are data read by the engine at runtime. Quest rewards are not in this module: they go through parity row 18 (loot roll and XP award).

## 6. Gaps and risks
- The donor's talk is a blocking loop that sits inside the script call (gDialogGo). A browser client and a server cannot block like that. Frankendom needs the current node id stored server-side and each pick sent as a verified message; the client only draws options.
- Named procedures are silently ignored in the donor (1043). Frankendom must reference nodes by data id, checked at load time, never by a name that fails silently.
- Reaction tags are cosmetic here (talk_to_critter_reacts writes no state). Keep them client-only. If a reaction should change standing, that must be an explicit ledger write, not a side effect of the tag.
- The flat global-var ledger fits the one-ledger ruling as named slots, but Fallout's are per save and the donor has no ownership: Frankendom slots must be per character and written only by the server.
- Errors: get and set report failure differently (game.cc:924-929, 935-940). The one ledger needs one error model.
- Quest state is not visible in this donor: the quest step counters (game_vars.h:417-436) are read and written by scripts whose bodies are not in the repo. Quest logic (what sets which step, what the reward is) is (not read).
- Licence: the Sustainable Use License limits use to internal or non-commercial purposes. Clean-room shape only; this note copies no code. Any commercial use of the idea needs a fresh design, not a port.
- The int-level say bridge is a stub (int/dialog.cc:526-529), so the script say opcodes in this donor do not run a talk. Do not use int/dialog.cc as a reference for dialogue flow.

Reuse tag: adapt (shape of the node protocol and the named ledger; clean-room under a restricted licence; no code copied).
Brief rule served: judge the idea (a node that offers options and an empty list that ends the talk is real and checkable); confidence stated in Checked; defects kept with a fix line; sections 5-6 against the Frankendom rulings (server-verified choices, one ledger, zones as data).

Best transferable idea: A dialogue node is a function that offers options, a pick runs the chosen node, and an empty option list ends the talk, with reaction tags kept as cosmetic mood only.
Decision (proposed): adapt - the node protocol maps well onto zone-data NPC talks, but the blocking loop becomes a server-held node id with verified picks, and reaction tags stay out of the ledger.
Acceptance: an NPC with three nodes: picking "Tell me more" shows that node's options; picking "Leave" ends the talk; a node that offers nothing ends the talk on the server; a 31st option is rejected with an error to the author (not silently dropped); a reaction tag changes only the NPC mood field, never a ledger slot.
