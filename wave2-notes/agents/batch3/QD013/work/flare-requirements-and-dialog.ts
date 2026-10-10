// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Req =
  | { kind: "status"; id: string }
  | { kind: "not_status"; id: string }
  | { kind: "level"; min: number }
  | { kind: "not_level"; max: number };

interface Hero { level: number; }

// One ledger for campaign state: a set of status ids. Setting an id twice changes nothing.
class StatusLedger {
  private ids = new Set<string>();
  setStatus(id: string): boolean {
    if (this.ids.has(id)) return false;
    this.ids.add(id);
    return true;
  }
  unsetStatus(id: string): boolean {
    return this.ids.delete(id);
  }
  has(id: string): boolean {
    return this.ids.has(id);
  }
}

function passes(r: Req, ledger: StatusLedger, hero: Hero): boolean {
  switch (r.kind) {
    case "status": return ledger.has(r.id);
    case "not_status": return !ledger.has(r.id);
    case "level": return hero.level >= r.min;
    case "not_level": return hero.level < r.max;
  }
}

// A requirement list is an AND over its predicates.
function allPass(reqs: Req[], ledger: StatusLedger, hero: Hero): boolean {
  return reqs.every((r) => passes(r, ledger, hero));
}

// A quest is a view over the ledger, not a stored state machine.
interface Quest { name: string; reqs: Req[]; completeStatus?: string; }
type QuestView = "active" | "complete" | "hidden";
function questView(q: Quest, ledger: StatusLedger, hero: Hero): QuestView {
  if (q.completeStatus !== undefined && ledger.has(q.completeStatus)) return "complete";
  return allPass(q.reqs, ledger, hero) ? "active" : "hidden";
}

// Dialogue nodes: the same requirement lists gate what the player can be offered.
interface DialogNode { id: string; group?: string; responseOnly: boolean; reqs: Req[]; }

// Last-defined node first; a group contributes one random pick, placed before the plain nodes.
function availableNodes(
  nodes: DialogNode[], ledger: StatusLedger, hero: Hero, allowResponses: boolean, rng: () => number,
): DialogNode[] {
  const plain: DialogNode[] = [];
  const groups = new Map<string, DialogNode[]>();
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.responseOnly && !allowResponses) continue;
    if (!allPass(n.reqs, ledger, hero)) continue;
    if (n.group === undefined) {
      plain.push(n);
    } else {
      const bucket = groups.get(n.group);
      if (bucket) bucket.push(n); else groups.set(n.group, [n]);
    }
  }
  const picks: DialogNode[] = [];
  for (const key of [...groups.keys()].sort()) {
    const bucket = groups.get(key);
    if (bucket && bucket.length > 0) picks.push(bucket[Math.floor(rng() * bucket.length)]);
  }
  return [...picks.reverse(), ...plain];
}

// Checks.
const ledger = new StatusLedger();
const hero: Hero = { level: 3 };
const boss: Quest = { name: "Bandits", reqs: [{ kind: "level", min: 2 }, { kind: "not_status", id: "bandits_done" }], completeStatus: "bandits_done" };
if (questView(boss, ledger, hero) !== "active") throw new Error("quest should be active");
if (ledger.setStatus("bandits_done") !== true) throw new Error("first set changes");
if (ledger.setStatus("bandits_done") !== false) throw new Error("second set is a no-op");
if (questView(boss, ledger, hero) !== "complete") throw new Error("quest should be complete");

const nodes: DialogNode[] = [
  { id: "greet", responseOnly: false, reqs: [] },
  { id: "bandit_tip", responseOnly: false, reqs: [{ kind: "not_status", id: "bandits_done" }] },
  { id: "thanks", responseOnly: false, reqs: [{ kind: "status", id: "bandits_done" }] },
  { id: "pick_a", group: "rumour", responseOnly: false, reqs: [] },
  { id: "pick_b", group: "rumour", responseOnly: false, reqs: [] },
  { id: "secret", responseOnly: true, reqs: [] },
];
const lowRoll = () => 0;
const ids = availableNodes(nodes, ledger, hero, false, lowRoll).map((n) => n.id);
if (ids.join(",") !== "pick_b,thanks,greet") throw new Error("order: " + ids.join(","));

export {};
