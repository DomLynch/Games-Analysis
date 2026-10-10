// Licence: GPL-2.0 (donor, LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const CONDITION_ALWAYS = -1; // no gate: always true

interface Cond {
  gate: number;        // index of the enclosing condition (an earlier index), or CONDITION_ALWAYS
  test: () => boolean; // this turn's own check, e.g. "rooms built >= 3"
  on: boolean;         // truth this turn
  latched: boolean;    // has been true at least once; never cleared
  edge: boolean;       // true only on the turn it first became true
}

interface Trigger {
  cond: number;        // gate index, or CONDITION_ALWAYS
  reusable: boolean;   // false = fires once
  done: boolean;
  fire: () => void;    // the one effect path (rewards go through here)
}

interface Outcome {
  cond: number;
  apply: (playerId: number) => void;
}

interface QuestState {
  conds: Cond[];
  triggers: Trigger[];
  outcomes: Outcome[];
  players: { id: number; decided: boolean }[];
}

function isMet(s: QuestState, idx: number): boolean {
  return idx === CONDITION_ALWAYS ? true : s.conds[idx].on;
}

// A gate counts as closed on the turn it first becomes true, so a gated step starts one turn later.
function gateOpen(s: QuestState, idx: number): boolean {
  if (idx === CONDITION_ALWAYS) return true;
  const g = s.conds[idx];
  return g.on && !g.edge;
}

function evalConditions(s: QuestState): void {
  for (let i = 0; i < s.conds.length; i++) {
    const c = s.conds[i];
    if (!gateOpen(s, c.gate)) {
      c.on = false; // gated off: truth cleared; latch and edge are left alone
      continue;
    }
    c.on = c.test();
    if (!c.on || c.latched) {
      c.edge = false;
    } else {
      c.latched = true;
      c.edge = true;
    }
  }
}

function runTriggers(s: QuestState): void {
  for (const t of s.triggers) {
    if (t.done || !isMet(s, t.cond)) continue;
    t.fire();
    if (!t.reusable) t.done = true;
  }
}

function runOutcomes(s: QuestState): void {
  for (const o of s.outcomes) {
    if (!isMet(s, o.cond)) continue;
    for (const p of s.players) {
      if (p.decided) continue;
      o.apply(p.id);
      p.decided = true;
    }
  }
}

// One game turn, fixed order: conditions, then triggers, then outcomes.
export function questTurn(s: QuestState, localUndecided: boolean, runAfterVictory: boolean): void {
  if (!localUndecided && !runAfterVictory) return;
  evalConditions(s);
  runTriggers(s);
  runOutcomes(s);
}

// Example: step 2 is nested under step 1 (gate = 0); its reward fires once.
const s: QuestState = {
  conds: [
    { gate: CONDITION_ALWAYS, test: () => true, on: false, latched: false, edge: false },
    { gate: 0, test: () => true, on: false, latched: false, edge: false },
  ],
  triggers: [{ cond: 1, reusable: false, done: false, fire: () => {} }],
  outcomes: [],
  players: [{ id: 0, decided: false }],
};
questTurn(s, true, false);
