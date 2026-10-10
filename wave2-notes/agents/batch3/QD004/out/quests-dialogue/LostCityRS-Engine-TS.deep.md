# LostCityRS-Engine-TS (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` (with `src/engine/script/handlers/PlayerOps.ts`, `src/network/game/client/handler/IfButtonHandler.ts`, `src/engine/World.ts`) | Licence: MIT ("MIT License, Copyright (c) 2023-2026 Lost City", LICENSE file; code may be adapted) | TypeScript | symbols `Player.executeScript`, `Player.closeModal`, `Player.processQueue`, `IfButtonHandler.handle`

Checked: The evidence hint (`src/network/game/server/model/MessageGame.ts`) is a message packet wrapper (lines 1-9), not the mechanism. A grep of the whole source for quest, dialogue, objective and stage found no quest content: the word "quest" only matches "request", and `data/` holds only two PEM keys and a wordenc file. The quest state machine, objectives and rewards are not in this repo (not read; the RS2 content scripts are not in the donor). What I did read end to end: the dialogue wait and resume path (PlayerOps.ts 369-426, 832-835; IfButtonHandler.ts 12-41; Player.ts 760-830, 874-930, 1995-2110, 2202-2230), the queue and busy rules, the per-tick order (World.ts 687-709), NPC delay (NpcOps.ts 97-100; Npc.ts 109-120), and the varp/varbit primitives (Player.ts 1750-1810). Candidates opened: MessageGame.ts (hint, wrong), PlayerOps.ts, IfButtonHandler.ts, Player.ts, ScriptState.ts, PlayerQueueRequest.ts, World.ts, NpcOps.ts, Npc.ts. Confidence: high for the dialogue wait and resume (read in full, receipts verified); the quest-state part is only the varbit primitive. Not read: ScriptRunner.execute opcode loop, the client packets for the open-interface messages, the RS2 quest scripts (absent). depth = thin for the whole topic because the donor has the engine half of dialogue only.

## 1. Mechanism

- A dialogue is a script that parks itself. `P_PAUSEBUTTON` (wait for a continue click) and `P_COUNTDIALOG` (wait for a count input) only set the script's execution state to PAUSEBUTTON or COUNTDIALOG and return (PlayerOps.ts 425-426 and 369-371). `executeScript` then stores that script as the player's `activeScript` (Player.ts 2217) and leaves it there. The script does not run again until a click or a close.
- The continue list is built by the script. `IF_ADDRESUMEBUTTON` pushes a component id into `resumeButtons` (PlayerOps.ts 835). A click on a visible component (IfButtonHandler.ts 12-22) is checked against that list first (26). If the id is in the list and the parked script is PAUSEBUTTON, the script resumes by force: `executeScript(activeScript, true, true)` (28). Any other click runs that component's `IF_BUTTON` trigger (31). A continue-id click while the script is COUNTDIALOG takes the same branch as a list hit but has no `else`, so the click is consumed with no resume and no trigger (26-30; read from the code, not run).
- A parked dialogue is busy. `busy()` is true when the player is delayed or any modal is open (Player.ts 821-822). `canAccess()` is `!protect && !busy()` (825-830). Queued scripts wait for `canAccess()` (Player.ts 903-904 for the normal queue; 662-663 for the engine queue).
- Three things end a parked dialogue:
  (a) `closeModal` (Player.ts 760-810) clears the parked script (774-775 comment and check, 777 clears `resumeButtons`) and runs the `IF_CLOSE` trigger for each open interface: main (782), chat (793) and side (804). Clearing happens before the triggers run.
  (b) Opening a new interface drops the parked script with no close trigger: `openMainModal` (2014-2017), `openChatModal` (2050-2053), `openSideModal` (2074-2077) and `openMainSideModal` (2100-2103) each reset it when the execution state is COUNTDIALOG or PAUSEBUTTON. The interface being replaced gets an `IfClose` packet (for example Player.ts 1998 in openMainModal); no IF_CLOSE trigger runs.
  (c) The script finishes or aborts. `executeScript` then clears `activeScript` and `resumeButtons` (2220-2222) and calls `closeModal(false)` when no main modal is open (2224-2226).
- Queues: each player has a normal queue, a weak queue, an engine queue and a set of timers. Queue entries have a type: NORMAL, LONG, ENGINE, WEAK, STRONG, SOFT (PlayerQueueRequest.ts 5-12). A STRONG entry sets `requestModalClose` before the queues run (Player.ts 874-878), so the modal closes first. `closeModal()` with the default argument also clears the weak queue (760-762).
- Queue timing: `processQueue` decrements the delay with a post-decrement and runs the entry only when `canAccess()` and the old value is 0 or less (903-904). Lines 892-896 carry a comment that the donor's LinkList caches the next link, so an entry can run in the same tick; the donor marks this as authentic behaviour (not reproduced here).
- Per-tick order for a player (World.ts 687-709): clear `delayed` when `delayedUntil` has passed (692); resume a SUSPENDED script (695); process the normal queue (701); weak queue; timers; soft timers; engine queue (709); then interactions and movement. A PAUSEBUTTON or COUNTDIALOG script is not resumed by the tick, only by a click.
- Delays: `P_DELAY` sets `delayedUntil = currentTick + 1 + n` (PlayerOps.ts 376-378). The NPC version sets `delayedUntil = currentTick + 1 + n` and parks the NPC in NPC_SUSPENDED (NpcOps.ts 97-100); `Npc.turn` resumes it (Npc.ts 109-116, resume check at 115).
- Quest state (only what is here): values are stored in varps and bit-packed varbits. `setVarBit` masks the new value into its base varp (1794-1808). A value outside the field's mask is replaced by 0 (1803-1804), not clamped. `getVarBit` shifts and masks (1791). A varp with `SCOPE_PERM` is saved only when non-zero (215-222). A transmitted varp is also written to the client (1775-1777).

## 2. Key functions

- `IfButtonHandler.handle`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/game/client/handler/IfButtonHandler.ts` 12-41. The click router: resume-or-trigger.
- `P_PAUSEBUTTON`, `P_COUNTDIALOG`, `IF_ADDRESUMEBUTTON` ops: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/PlayerOps.ts` 369-371, 425-426, 832-835. Park and add-continue.
- `Player.executeScript`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 2202-2230. Where a parked script is stored and where it is dropped on finish.
- `Player.closeModal`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 760-810 (the IF_CLOSE triggers and the drop of the parked script). Read through line 810; the rest of closeModal after 810 was not read.
- `Player.openMainModal`, `openChatModal`, `openSideModal`, `openMainSideModal`: the same file, 1995-2110. Open-interface rules, with the wrong-field resets noted in section 6.
- `Player.processQueues`, `processQueue`, `canAccess`, `busy`: the same file, 821-830 and 874-930.
- `World` player step: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 687-709 (order of the steps per tick).
- Varp and varbit primitives: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Player.ts` 1750-1810 and 215-222.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| A dialogue line parks the script until one of its continue buttons is clicked | Park states PAUSEBUTTON = 3 and COUNTDIALOG = 4 (ScriptState.ts 30-31) |
| Continue list: only ids added this pause resume the script; other ids run their own trigger | No maximum; the list is never cleared on resume (see section 6) |
| Timed wait in ticks | `delayedUntil = tick + 1 + n` for players (PlayerOps.ts 378) and NPCs (NpcOps.ts 99); n comes from the script, so it is content data |
| Queue spent when delay reaches 0; runs only when not protected and not busy | Post-decrement check (Player.ts 903-904); busy = delayed or a modal open (822) |
| Strong queue entries close modals first | Queue type STRONG (PlayerQueueRequest.ts 10); closes before the queue runs (878) |
| Bit-packed quest flags | Varbit masks; out-of-range value becomes 0 (1803-1804) |
| Permanent state saved only if non-zero | `SCOPE_PERM` and `!== 0` (215) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's park, continue-list, close and open rules, but differs in three places on purpose: it replaces the continue list on each new pause (the donor keeps old ids, see section 6), it clears each modal id in the same branch as its flag (the donor sets the wrong field in four branches), and it omits protected access, the packets (`IfClose`), the delay ticks, the queues other than the weak queue, the force flag, and the LinkList quirk. The `closeAll` order (triggers run, then ids and wait cleared) follows the donor's closeModal; the open path drops the wait without a trigger, as openMainModal and openChatModal do.

```ts
// Licence: MIT (LostCityRS-Engine-TS, Lost City 2023-2026). Shape adapted from the donor's wait-for-continue rules; this sketch is written fresh.
type Slot = 'main' | 'chat' | 'side';
type Action =
  | { kind: 'resume'; scriptId: number }
  | { kind: 'trigger'; com: number }
  | { kind: 'ignore' };

class DialogueSlot {
  private open: Record<Slot, number> = { main: -1, chat: -1, side: -1 };
  private waitScriptId: number | null = null;
  private continueButtons = new Set<number>();
  private weakQueue: string[] = [];
  readonly closeRuns: string[] = []; // test hook: which close triggers ran

  // A script shows a line and parks until one of these continue buttons is clicked.
  waitForContinue(scriptId: number, buttons: number[]): void {
    this.waitScriptId = scriptId;
    this.continueButtons = new Set(buttons); // replaced on every new pause
  }

  queueWeak(name: string): void {
    this.weakQueue.push(name);
  }

  // A click on a visible component: a continue button resumes the parked script, anything else is a normal trigger.
  click(com: number, visible: boolean): Action {
    if (!visible) return { kind: 'ignore' };
    if (this.waitScriptId !== null && this.continueButtons.has(com)) {
      const scriptId = this.waitScriptId;
      this.waitScriptId = null;
      return { kind: 'resume', scriptId };
    }
    return { kind: 'trigger', com };
  }

  // Opening a new interface drops a parked wait without running any close trigger.
  openSlot(slot: Slot, com: number): void {
    for (const s of Object.keys(this.open) as Slot[]) {
      if (s !== slot) this.open[s] = -1;
    }
    this.open[slot] = com;
    this.waitScriptId = null;
    this.continueButtons.clear();
  }

  // Closing runs each open interface's close trigger once, clears its id in the same branch, drops the wait and the weak queue.
  closeAll(): void {
    for (const s of Object.keys(this.open) as Slot[]) {
      if (this.open[s] !== -1) {
        this.closeRuns.push(`${s}:${this.open[s]}`);
        this.open[s] = -1;
      }
    }
    this.waitScriptId = null;
    this.continueButtons.clear();
    this.weakQueue = [];
  }
}

const d = new DialogueSlot();
d.openSlot('chat', 1000);
d.waitForContinue(7, [1001, 1002]);
const first = d.click(1001, true);   // resumes script 7
d.waitForContinue(7, [1003]);        // the next pause replaces the continue list
const stale = d.click(1001, true);   // old id no longer resumes
d.closeAll();
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `origins/server/dialogue.ts` (new): the server-side dialogue wait (park, continue list, close and open rules). Not in `src/fight/`: dialogue is not a fight step, so no `src/fight` module fits.
- Parity row: 5 (controls/input). The continue click is input intake, and the rule that a click is checked against the list it was given fits row 5 best. Row 18 (loot roll and XP award) would apply only to quest rewards, which this donor does not show; nothing here covers quest rewards or objectives, so say so when this is cited.
- today: not checked (the Frankendom repo was not read in this pass).
- Reuse tag: adapt (MIT: shape adapted, sketch written fresh; the donor's code is not copied)
- Brief rule served: one engine (the wait is engine state; the client only sends clicks); server-verified (the click is checked on the server against the current wait); rules 7-9 n/a

## 6. Gaps and risks

- The quest half is absent. No quest state machine, objective, trigger or reward code is in this repo. Quest state here is only varps and varbits. Frankendom's one-ledger rule for quest rewards is not supported by anything in this donor; that part needs another donor or our own design.
- Stale continue buttons: `resumeButtons` is cleared only on cleanup (Player.ts 453-455), on modal close (777), on the open paths (2017, 2053, 2077, 2103), and when the script finishes (2222). A resume does not clear it (IfButtonHandler.ts 28), and no opcode clears it mid-script. So an id added for an earlier pause still resumes a later pause. I read every `resumeButtons` reference in `src/` to reach this; I did not run it. Frankendom must tag each continue button with the step id and clear the list at each pause (the sketch does).
- Client-trusted clicks: the router checks only that the component exists, is a button and is visible (IfButtonHandler.ts 15-22). Nothing checks that the component belongs to the current step. Server-verified dialogue needs the step id check on the server.
- Wrong-field clears: `openChatModal` clears `modalChat` in the MAIN branch (2037) and the SIDE branch (2043); `openSideModal` clears `modalChat` in the MAIN branch (2061) and `modalSide` in the CHAT branch (2067). The flags are cleared correctly, so the state bits gate the behaviour. But `closeModal` reads the id fields (Player.ts 782-810), so a stale id could run an IF_CLOSE trigger for an interface that is already closed on a later `closeModal`. That is reasoned from the code, not run.
- An interrupted dialogue gets no close hook when a new interface opens (2014-2017 etc.), but gets one when the interface is closed (782). Frankendom must decide per quest step whether an interrupted talk still counts (the donor's answer is "no hook on open").
- Silent zeroing: `setVarBit` turns an out-of-range value into 0 (1803-1804). A bad stage number becomes stage 0 with no error. Frankendom should reject out-of-range stage writes on the server.
- A transmitted varp is sent to the client (1775-1777). Quest stage must be server state; a transmitted copy is a view only.
- The LinkList speedup quirk (Player.ts 892-896) means queue timing depends on list order. Frankendom should not copy this quirk.
- Not read: `ScriptRunner.execute` (the opcode loop and its limits), the packet classes for open-interface messages, the RS2 quest scripts (not in the repo), the rest of `closeModal` after line 810.

Best transferable idea: a dialogue is a parked script with an explicit continue list. Only the ids it added for the current pause resume it, and opening or closing any interface drops the wait.

Decision (proposed): adapt — Frankendom needs a server-side dialogue wait, but the donor's list is never cleared on resume and clicks are trusted up to visibility. Keep the park, the explicit list, and the drop-on-open rule; add step ids, clear the list each pause, and validate the click on the server.
Acceptance: A test starts a two-step quest talk, the server parks at step 2 with continue id 1003; a click on step 1's id 1001 is rejected and the stage does not advance; opening the shop closes the talk without advancing the quest; a stage write of 9 into a 2-bit field is rejected, not stored as 0.

Reuse tag: adapt (MIT)
Brief rule served: one engine; server-verified (click checked on the server); rules 7-9 n/a
