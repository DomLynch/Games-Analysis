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
export {};
