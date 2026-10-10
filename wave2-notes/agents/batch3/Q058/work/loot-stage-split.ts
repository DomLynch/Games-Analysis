// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Bucket = "safe" | "atRisk" | "carried" | "discard";
type Where = "start" | "exit" | "other" | "none";

interface Drop {
  id: string;
  owner: "none" | "player" | "enemy";  // a unit holding the item
  primed: boolean;                     // live fuse: never recovered
  recoverable: boolean;                // item rules allow recovery
  researched: boolean;                 // false: unresearched find, always taken home
  isBody: boolean;                     // the drop is a unit body
  bodyIsEnemyOrDead: boolean;          // enemy body, or a dead soldier
  where: Where;                        // floor marker under the drop at stage end
}

interface Outcome { aborted: boolean; survivors: number; objectivesDone: boolean; }

// Stage end. Hostiles still alive = protocol 2 (position decides); none left = protocol 1.
function classifyStageEnd(drops: Drop[], hostilesAlive: number): Map<string, Bucket> {
  const out = new Map<string, Bucket>();
  for (const d of drops) {
    if (d.owner === "player") { out.set(d.id, "carried"); continue; }   // held by a soldier: always moves on
    if (d.owner === "enemy" || d.primed || !d.recoverable) { out.set(d.id, "discard"); continue; }
    if (hostilesAlive === 0) {
      out.set(d.id, d.bodyIsEnemyOrDead || !d.researched ? "safe" : "carried");
      continue;
    }
    if (d.where === "none") { out.set(d.id, "discard"); continue; }
    if (d.where === "start") { out.set(d.id, "safe"); continue; }
    if (d.where === "exit") {
      out.set(d.id, d.isBody && d.bodyIsEnemyOrDead ? "atRisk" : "carried");
      continue;
    }
    out.set(d.id, "atRisk");
  }
  return out;
}

// Debrief. Safe drops come home if anyone lived. At-risk drops come home only on a clean finish.
function recoverAtDebrief(buckets: Map<string, Bucket>, o: Outcome): string[] {
  if (o.survivors === 0) return [];
  const home: string[] = [];
  for (const [id, b] of buckets) {
    if (b === "safe") home.push(id);
    else if (b === "atRisk" && !o.aborted) home.push(id);
  }
  return home;
}

export {};
