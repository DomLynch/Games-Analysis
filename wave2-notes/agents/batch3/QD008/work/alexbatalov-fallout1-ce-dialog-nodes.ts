// Sketch: option-list dialogue nodes (node proc refills options; empty list ends talk), reaction tags as cosmetic mood,
// and a named integer ledger with range-checked get/set. Clean-room shape of the Fallout gdialog/game_vars idea.

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

export {};
