// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Section = "main" | "unsolved" | "solved";

interface JournalEntry {
  textId: number;   // string-table key of the journal line
  section: Section;
  group: number;    // 0 = ungrouped; a solved line supersedes its group
  time: number;     // game seconds when the line last changed
  chapter: number;
}

class Journal {
  entries: JournalEntry[] = [];
  constructor(private now: () => number, private chapter: () => number) {}

  find(textId: number): JournalEntry | undefined {
    return this.entries.find((e) => e.textId === textId);
  }

  // Returns true if the journal changed.
  add(textId: number, section: Section, group: number): boolean {
    const existing = this.find(textId);
    if (existing) {
      // same section again: no-op, no feedback
      if (existing.section === section) return false;
      if (section === "solved" && group !== 0) {
        // supersede: drop the whole group, and this line too (the fix: the donor leaves
        // an old line behind when its group differs from the new group)
        this.entries = this.entries.filter((e) => e.group !== group && e.textId !== textId);
      } else {
        existing.section = section;
        existing.group = group;
        existing.chapter = this.chapter();
        existing.time = this.now();
        return true;
      }
    }
    this.entries.push({ textId, section, group, time: this.now(), chapter: this.chapter() });
    return true;
  }
}

// NPC dialogue: states are tried in authored priority order; the first whose condition holds wins.
interface DialogState {
  id: number;
  condition?: (ctx: unknown) => boolean; // no condition = never picked (as in the donor)
}

function firstState(states: DialogState[], ctx: unknown): number {
  for (const s of states) {
    if (s.condition && s.condition(ctx)) return s.id;
  }
  return -1;
}

// Random line: pick uniformly among the states that pass (the fix: the donor starts at a random
// index and takes the next passing state, which favours states that follow a run of failing ones).
function randomState(states: DialogState[], ctx: unknown, rand: (n: number) => number): number {
  const ok = states.filter((s) => s.condition && s.condition(ctx));
  return ok.length ? ok[rand(ok.length)].id : -1;
}

export {};
