// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Status = "yet_to_start" | "in_progress" | "success" | "failure";

type Goal =
  | { kind: "killCount"; species: string; need: number }   // kill count is compared against a baseline set at accept
  | { kind: "talkToNpc"; npcId: string }                   // complete after the player talks to this NPC once
  | { kind: "reachPlace"; placeId: string };               // complete while the player stands on the place

interface Quest {
  id: string;
  playerId: string;
  status: Status;
  goal: Goal;
  giverId: string | null;      // null = no giver: completes by its objective alone
  value: number;               // reward, from quest data
  durationTicks: number;       // 0 = no deadline
  deadlineTick: number;        // set at accept
  killReach: number;           // absolute kill count to reach (accept baseline + need)
  step: number;                // 0 = not yet, 1 = talked
}

interface World {
  now(): number;               // game tick counter
  killsOf(species: string): number; // cumulative kill tracker
  placeOfPlayer(): string;
}

interface Ledger {
  credit(playerId: string, amount: number, ref: string): void;
}

function accept(q: Quest, w: World): void {
  if (q.status !== "yet_to_start") return;
  if (q.goal.kind === "killCount") {
    q.killReach = w.killsOf(q.goal.species) + q.goal.need;
  }
  q.deadlineTick = q.durationTicks !== 0 ? w.now() + q.durationTicks : 0;
  q.status = "in_progress";
}

function isComplete(q: Quest, w: World): boolean {
  if (q.status === "success") return true;
  switch (q.goal.kind) {
    case "killCount":
      return w.killsOf(q.goal.species) >= q.killReach;
    case "talkToNpc":
      return q.step >= 1;
    case "reachPlace":
      return w.placeOfPlayer() === q.goal.placeId;
  }
}

function fail(q: Quest): void {
  q.status = "failure";
}

function wrapUp(q: Quest, ledger: Ledger): void {
  // Our guard: pay once. The donor wrap_up has no guard of its own.
  if (q.status === "success" || q.status === "failure") return;
  q.status = "success";
  ledger.credit(q.playerId, q.value, "quest:" + q.id);
}

// Once per game tick, for every quest the player holds.
function tick(q: Quest, w: World, ledger: Ledger): void {
  if (q.status !== "in_progress") return;
  if (q.deadlineTick !== 0 && w.now() > q.deadlineTick) {
    fail(q);
  } else if (q.giverId === null && isComplete(q, w)) {
    wrapUp(q, ledger);
  }
}

// Talking to an NPC: a talkToNpc objective completes its step.
function onTalk(q: Quest, npcId: string): void {
  if (q.goal.kind === "talkToNpc" && npcId === q.goal.npcId && q.step === 0) {
    q.step = 1;
  }
}

// Report back to the giver. Returns true if the reward was paid now.
function reportTo(q: Quest, npcId: string, w: World, ledger: Ledger): boolean {
  if (q.giverId !== npcId || !isComplete(q, w)) return false;
  wrapUp(q, ledger);
  return true;
}

export {};
