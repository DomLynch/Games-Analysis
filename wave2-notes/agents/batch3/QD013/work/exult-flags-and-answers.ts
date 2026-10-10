// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const PAGE = 2048;
const MAX_FLAGS = 32768;

// One ledger for world state: one byte per flag, grown in whole pages up to a cap.
class FlagLedger {
  private bits: Uint8Array = new Uint8Array(PAGE);
  constructor(private onSet: (flag: number) => void) {}

  // Read: undefined when the index is outside the store (the caller treats it as 0 and reports it).
  get(i: number): boolean | undefined {
    if (i < 0 || i >= this.bits.length) return undefined;
    return this.bits[i] !== 0;
  }

  // Write: refused at or above the cap; grows the store when needed; journals on the 0 -> 1 edge.
  set(i: number, v: boolean): boolean {
    if (i < 0 || i >= MAX_FLAGS) return false;
    if (i >= this.bits.length) this.grow(i + 1);
    const wasSet = this.bits[i] !== 0;
    this.bits[i] = v ? 1 : 0;
    if (v && !wasSet) this.onSet(i);
    return true;
  }

  private grow(n: number): void {
    const size = Math.min(Math.ceil(n / PAGE) * PAGE, MAX_FLAGS);
    const next = new Uint8Array(size);
    next.set(this.bits);
    this.bits = next;
  }

  // Save: keep whole pages up to the last set flag; never less than one page.
  compact(): Uint8Array {
    let last = -1;
    for (let i = this.bits.length - 1; i >= 0; i--) {
      if (this.bits[i] === 1) { last = i; break; }
    }
    const n = Math.max(PAGE, Math.ceil((last + 1) / PAGE) * PAGE);
    return this.bits.slice(0, n);
  }
}

interface JournalEntry { flag: number; text: string; }

// Journal hook: one entry per flag, only when autonotes are allowed and the flag has text.
function journalOnSet(journal: JournalEntry[], flag: number, text: string | undefined, allowed: boolean): void {
  if (!allowed || !text) return;
  if (journal.some((e) => e.flag === flag)) return;
  journal.push({ flag, text });
}

// Dialogue answers: a list the player picks from, with nested lists kept on a stack.
class AnswerMenu {
  private answers: string[] = [];
  private stack: string[][] = [];

  // Adding an answer that is already listed moves it to the end.
  add(s: string): void {
    this.remove(s);
    this.answers.push(s);
  }

  remove(s: string): void {
    const i = this.answers.indexOf(s);
    if (i >= 0) this.answers.splice(i, 1);
  }

  push(): void {
    this.stack.push(this.answers);
    this.answers = [];
  }

  // Restores the last saved list; does nothing when the stack is empty.
  pop(): boolean {
    const prev = this.stack.pop();
    if (prev === undefined) return false;
    this.answers = prev;
    return true;
  }

  locate(s: string): number {
    return this.answers.indexOf(s);
  }

  get list(): readonly string[] {
    return this.answers;
  }
}

// Pick an answer index from a key (1-9, then a-z) or a click index; -1 means no valid pick yet.
const KEYS = "123456789abcdefghijklmnopqrstuvwxyz";
function pick(menu: AnswerMenu, input: { esc?: boolean; key?: string; click?: number }): number {
  if (input.esc) return menu.locate("bye"); // -1 when there is no "bye" answer; the caller keeps waiting
  if (input.key !== undefined) {
    if (input.key.length !== 1) return -1;
    const d = KEYS.indexOf(input.key);
    return d >= 0 && d < menu.list.length ? d : -1;
  }
  if (input.click !== undefined) return input.click < menu.list.length ? input.click : -1;
  return -1;
}

// Checks: set once journals once; cap and read are guarded; nested menus restore; keys map to indices.
const journal: JournalEntry[] = [];
const ledger = new FlagLedger((f) => journalOnSet(journal, f, "text for flag", true));
ledger.set(3, true);
ledger.set(3, true);
if (journal.length !== 1) throw new Error("journal should have one entry");
if (ledger.set(MAX_FLAGS, true)) throw new Error("cap not enforced");
if (ledger.get(5000) !== undefined && ledger.get(5000) !== false) throw new Error("read");
if (ledger.compact().length !== PAGE) throw new Error("compact");

const menu = new AnswerMenu();
menu.add("Tell me more");
menu.add("bye");
menu.add("Tell me more");                 // moves to the end
if (menu.list.join("|") !== "bye|Tell me more") throw new Error("dedupe");
if (pick(menu, { key: "2" }) !== 1) throw new Error("key pick");
if (pick(menu, { esc: true }) !== 0) throw new Error("esc to bye");
menu.push();
menu.add("Back");
if (menu.list.join("|") !== "Back") throw new Error("push clears");
if (!menu.pop()) throw new Error("pop");
if (menu.list.join("|") !== "bye|Tell me more") throw new Error("pop restores");
if (menu.pop()) throw new Error("pop on empty stack should do nothing");

export {};
