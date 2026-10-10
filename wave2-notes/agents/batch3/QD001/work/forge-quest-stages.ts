// Licence: GNU GPL v3 (donor LICENSE). clean-room sketch of the mechanism shape, not a translation of the donor lines.
// clean-room
type Status = "inactive" | "active" | "complete" | "failed";

// Every event carries the tags of the room the player is in.
type Ev = { room: string[] } & (
  | { kind: "enterPoi" }
  | { kind: "defeat"; winner: boolean; enemyTags: string[] }
  | { kind: "receiveItem"; item: string }
  | { kind: "flag"; name: string; value: number }
  | { kind: "tick" }
);

interface Stage {
  id: number;
  prereqs: number[];                 // stage ids that must be complete before this one starts
  status: Status;
  objective: "fetch" | "defeat" | "enterPoi" | "flag";
  count: number;                     // goal count (donor: count1 for fetch, count3 for the others)
  failAt: number;                    // losses that fail the stage; 0 = never (donor: count4)
  progress: number;
  failures: number;
  roomTags: string[];                // all must be in the room's tags
  items: string[];                   // fetch: item names that count
  wantTags: string[];                // defeat: enemy tags that must all be present
  excludeTags: string[];             // defeat: enemy tags that must be absent
  flagName?: string;
  flagValue?: number;
}

interface Quest { stages: Stage[]; completed: boolean; failed: boolean; }
interface PlayerView { itemCount(name: string): number; }

const subset = (have: string[], want: string[]): boolean => want.every(t => have.includes(t));
const statusOf = (s: Stage): Status => s.status;   // a call, so the check after handle() is not narrowed
const owned = (s: Stage, p: PlayerView): number => s.items.reduce((n, it) => n + p.itemCount(it), 0);

// One event against one active stage.
function handle(s: Stage, e: Ev, p: PlayerView): void {
  if (s.objective === "fetch") {
    // Checked on every event, before the room gate: holding the items is enough.
    if (owned(s, p) >= s.count) { s.status = "complete"; return; }
    if (e.kind === "receiveItem" && s.items.includes(e.item)) {
      s.progress += 1;
      if (s.progress >= s.count) s.status = "complete";
    }
    return;
  }
  if (!subset(e.room, s.roomTags)) return;
  if (s.objective === "defeat") {
    if (e.kind !== "defeat") return;
    if (!subset(e.enemyTags, s.wantTags) || s.excludeTags.some(t => e.enemyTags.includes(t))) return;
    if (e.winner) {
      s.progress += 1;
      if (s.progress >= s.count) s.status = "complete";
    } else if (s.failAt > 0) {
      s.failures += 1;
      if (s.failures >= s.failAt) s.status = "failed";
    }
    return;
  }
  if (s.objective === "enterPoi") {
    if (e.kind !== "enterPoi") return;
    s.progress += 1;
    if (s.progress >= s.count) s.status = "complete";
    return;
  }
  if (e.kind === "flag" && e.name === s.flagName && e.value >= (s.flagValue ?? 0)) s.status = "complete";
}

// Step 1 for a quest: only active stages see the event; the quest is complete when every stage is.
function updateQuest(q: Quest, e: Ev, p: PlayerView): void {
  let done = true;
  for (const s of q.stages) {
    if (s.status === "active") {
      handle(s, e, p);
      done = statusOf(s) === "complete" && done;
    } else if (s.status === "complete") {
      continue;
    } else {
      done = false;
    }
    if (s.status === "failed") q.failed = true;
  }
  q.completed = done;
}

// Step 2, run after every quest has seen the event: start stages whose prerequisites are complete.
function activateNext(q: Quest, p: PlayerView): void {
  for (const s of q.stages) {
    if (s.status !== "inactive") continue;
    const ready = s.prereqs.every(id => q.stages.some(x => x.id === id && x.status === "complete"));
    if (!ready) continue;
    s.status = "active";
    if (s.objective === "fetch") handle(s, { room: [], kind: "tick" }, p);
  }
}

export function dispatch(quests: Quest[], e: Ev, p: PlayerView): void {
  for (const q of quests) updateQuest(q, e, p);
  for (const q of quests) activateNext(q, p);
}

export {};
