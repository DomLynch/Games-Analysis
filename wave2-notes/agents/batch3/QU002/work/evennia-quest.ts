// Licence: BSD-3-Clause (donor, evennia LICENSE.txt). Shape adapted from the quest-step model described in the donor; written fresh, not a line-by-line translation.

type QuestStatus = "started" | "completed" | "abandoned" | "failed";

// A step is a data row: one check and where it leads. The donor writes each step as a method.
type StepCheck =
  | { kind: "has_tag"; tag: string }
  | { kind: "counter_at_least"; counter: string; min: number }
  | { kind: "event"; name: string };

interface StepRow {
  step: string;
  check: StepCheck;
  next: string | null; // null = complete the quest
}

interface QuestDef {
  key: string;
  startStep: string;
  steps: StepRow[];
  cleanupCounters: string[]; // donor cleanup() is defined but never called; here it runs on every end
}

interface QuestState {
  key: string;
  step: string;
  status: QuestStatus;
}

interface World {
  hasTag(tag: string): boolean;
  counter(name: string): number;
  clearCounter(name: string): void;
}

function satisfied(check: StepCheck, world: World, event: string | undefined): boolean {
  switch (check.kind) {
    case "has_tag":
      return world.hasTag(check.tag);
    case "counter_at_least":
      return world.counter(check.counter) >= check.min;
    case "event":
      return event === check.name;
  }
}

function finish(def: QuestDef, q: QuestState, world: World, status: QuestStatus): void {
  q.status = status;
  for (const name of def.cleanupCounters) world.clearCounter(name);
}

// Advance as far as the rows allow. Order follows the donor: check the current step, move on, and only then re-check.
// Fix: nothing moves on a quest that is not started (donor progress() has no status check, quests.py 179).
// The event applies to the first step it is offered to only (donor test: progress(complete_quest_B=True) then progress()).
function progress(def: QuestDef, q: QuestState, world: World, event?: string): void {
  let pending = event;
  for (let guard = 0; guard <= def.steps.length && q.status === "started"; guard++) {
    const row = def.steps.find(r => r.step === q.step);
    if (!row || !satisfied(row.check, world, pending)) return;
    pending = undefined;
    if (row.next === null) {
      finish(def, q, world, "completed");
      return;
    }
    q.step = row.next;
  }
}

// Add or resume. A finished or abandoned record is returned as it is (the donor reloads the saved status the same way).
function addQuest(def: QuestDef, quests: Map<string, QuestState>): QuestState {
  const existing = quests.get(def.key);
  if (existing) return existing;
  const fresh: QuestState = { key: def.key, step: def.startStep, status: "started" };
  quests.set(def.key, fresh);
  return fresh;
}

// Remove: abandon a started quest. Fix: an unknown key returns false instead of reading a missing quest (donor quests.py 327-328).
function removeQuest(def: QuestDef, quests: Map<string, QuestState>, world: World): boolean {
  const q = quests.get(def.key);
  if (!q) return false;
  if (q.status === "started") finish(def, q, world, "abandoned");
  return true;
}

export {};
