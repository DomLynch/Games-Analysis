// Licence: GPL-2.0 (donor AzerothCore, LICENSE "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"). Clean-room sketch of the mechanism; no donor lines copied.
// Target (proposed): src/fight/quest.ts. Kill credit, timed quests and the giver marker run on the server tick.

export {};

// Status values follow the donor's meanings (NONE, COMPLETE, INCOMPLETE, FAILED, REWARDED).
enum QStatus { None = 0, Complete = 1, Incomplete = 3, Failed = 5, Rewarded = 6 }

// Giver marker values, highest wins (donor DIALOG_STATUS_INCOMPLETE = 5, DIALOG_STATUS_REWARD = 10).
enum Marker { None = 0, Incomplete = 5, Reward = 10 }

interface QuestRow {                // one quest_template row (zone data)
  id: number;
  npcTargets: number[];             // per objective: creature entry (0 = none)
  npcNeeds: number[];               // per objective: count
  timedMs: number;                  // 0 = untimed
  repeatable: boolean;
  boundItems: number[];             // item ids destroyed on fail or abandon
}

interface QuestStatusData {
  status: QStatus;
  counts: number[];                 // progress per objective
  timerMs: number;                  // remaining time when timed
}

interface Player {
  quests: Map<number, QuestStatusData>; // the quest log
  rewarded: Set<number>;
  timed: Set<number>;                   // at most one timed quest is allowed at a time
  bagItems: Map<number, number>;        // item id -> count (destroyed by fail/abandon)
}

export function canTake(q: QuestRow, pl: Player): boolean {
  if (pl.rewarded.has(q.id) && !q.repeatable) return false;
  if (pl.quests.has(q.id)) return false;
  if (q.timedMs > 0 && pl.timed.size > 0) return false; // SatisfyQuestTimed: only one timed quest at a time
  return true;
}

// Accept. A timed quest taken from a player giver inherits the giver's remaining time (shared timed quest).
export function accept(q: QuestRow, pl: Player, giverRemainingMs: number | null): void {
  const timerMs = q.timedMs > 0 ? (giverRemainingMs ?? q.timedMs) : 0;
  pl.quests.set(q.id, { status: QStatus.Incomplete, counts: q.npcTargets.map(() => 0), timerMs });
  if (q.timedMs > 0) pl.timed.add(q.id);
}

// Kill credit: for each incomplete quest, the first matching objective gains one, capped at its need.
// A creature counts for one objective per quest (the donor's comment says so).
export function killCredit(pl: Player, defs: Map<number, QuestRow>, entry: number): void {
  for (const [id, st] of pl.quests) {
    if (st.status !== QStatus.Incomplete) continue;
    const q = defs.get(id);
    if (q === undefined) continue;
    for (let j = 0; j < q.npcTargets.length; j++) {
      if (q.npcTargets[j] !== entry) continue;
      if (st.counts[j] < q.npcNeeds[j]) st.counts[j] += 1; // cap at the need
      if (canComplete(q, st)) complete(pl, q.id);
      break;
    }
  }
}

// Every counted objective has its need; a timed quest must still have time left.
export function canComplete(q: QuestRow, st: QuestStatusData): boolean {
  if (st.status !== QStatus.Incomplete) return false;
  for (let j = 0; j < q.npcTargets.length; j++) {
    if (q.npcTargets[j] !== 0 && q.npcNeeds[j] !== 0 && st.counts[j] < q.npcNeeds[j]) return false;
  }
  if (q.timedMs > 0 && st.timerMs === 0) return false;
  return true;
}

export function complete(pl: Player, id: number): void {
  const st = pl.quests.get(id);
  if (st === undefined) return;
  st.status = QStatus.Complete; // the reward is still waiting; the player must return to the giver
}

// Timed quests: the server tick subtracts elapsed time; at or below zero the quest fails.
export function tick(pl: Player, defs: Map<number, QuestRow>, elapsedMs: number): void {
  for (const id of [...pl.timed]) {
    const st = pl.quests.get(id);
    if (st === undefined) continue;
    if (st.timerMs <= elapsedMs) {
      fail(pl, defs, id);
    } else {
      st.timerMs -= elapsedMs;
    }
  }
}

// Failing an incomplete quest removes it from the timed set and destroys its bound items.
export function fail(pl: Player, defs: Map<number, QuestRow>, id: number): void {
  const st = pl.quests.get(id);
  if (st === undefined || st.status !== QStatus.Incomplete) return;
  st.status = QStatus.Failed;
  st.timerMs = 0;
  pl.timed.delete(id);
  const q = defs.get(id);
  if (q !== undefined) destroyBound(pl, q);
}

export function abandon(pl: Player, defs: Map<number, QuestRow>, id: number): void {
  const q = defs.get(id);
  if (q !== undefined) destroyBound(pl, q);
  pl.quests.delete(id);
  pl.timed.delete(id);
}

function destroyBound(pl: Player, q: QuestRow): void {
  for (const item of q.boundItems) pl.bagItems.delete(item);
}

// Reward: the quest leaves the log and is recorded as rewarded (XP and money are not modelled).
export function reward(pl: Player, id: number): boolean {
  const st = pl.quests.get(id);
  if (st === undefined || st.status !== QStatus.Complete) return false;
  pl.quests.delete(id);
  pl.rewarded.add(id);
  return true;
}

// Giver marker: the highest value over the quests this giver turns in.
export function marker(pl: Player, giverQuests: number[]): Marker {
  let result = Marker.None;
  for (const id of giverQuests) {
    const st = pl.quests.get(id);
    let m = Marker.None;
    if (st !== undefined && st.status === QStatus.Complete) m = Marker.Reward;
    else if (st !== undefined && st.status === QStatus.Incomplete) m = Marker.Incomplete;
    if (m > result) result = m;
  }
  return result;
}

// NPC presence window (game event): inside [start, end) and in the first `lengthMin` minutes of each `occurMin` cycle.
export function eventActive(nowS: number, startS: number, endS: number, occurMin: number, lengthMin: number): boolean {
  if (!(startS < nowS && nowS < endS)) return false;
  return (nowS - startS) % (occurMin * 60) < lengthMin * 60;
}
