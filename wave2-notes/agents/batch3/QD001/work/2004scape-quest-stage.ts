// Licence: MIT (donor LICENSE, copyright 2023-2025 Lost City). clean-room sketch of the mechanism shape; names and numbers are ours.
// clean-room
interface QuestDef {
  id: string;
  complete: number;                         // stage value that means finished (donor: ^cook_complete = 2)
  points: number;                           // quest points when finished (donor: ^cook_questpoints = 1)
  xp: { skill: string; amount: number };    // reward; donor amount 3000 in its own stat_advance unit (not read)
}

interface Player {
  stage: Map<string, number>;               // one persisted number per quest
  items: Map<string, number>;
  xp: Map<string, number>;
  queue: { delay: number; run: () => void }[];
}

function startQuest(p: Player, q: QuestDef): void {
  p.stage.set(q.id, 1);
}

// Pull check: the objective is read from inventory when the player talks to the NPC.
function hasItems(p: Player, need: Record<string, number>): boolean {
  return Object.entries(need).every(([item, n]) => (p.items.get(item) ?? 0) >= n);
}

// Finish: take the items now, then queue the stage write and the reward for the queue pass.
function finishQuest(p: Player, q: QuestDef, need: Record<string, number>): boolean {
  if (!hasItems(p, need)) return false;
  for (const [item, n] of Object.entries(need)) p.items.set(item, (p.items.get(item) ?? 0) - n);
  p.queue.push({
    delay: 0,
    run: () => {
      p.stage.set(q.id, q.complete);
      p.xp.set(q.xp.skill, (p.xp.get(q.xp.skill) ?? 0) + q.xp.amount);
    },
  });
  return true;
}

// Derived, not incremented: recount from every stage on each call, so a repeat call gives the same total.
function questPoints(p: Player, quests: QuestDef[]): number {
  let total = 0;
  for (const q of quests) if ((p.stage.get(q.id) ?? 0) >= q.complete) total += q.points;
  return total;
}

// One queue pass per tick: read the delay, then decrement; run when the value read was 0 or less.
function processQueue(p: Player): void {
  const pending = p.queue;
  p.queue = [];
  for (const job of pending) {
    const before = job.delay;
    job.delay -= 1;
    if (before <= 0) job.run();
    else p.queue.push(job);
  }
}

// Logout or removal drops every pending job.
function cleanup(p: Player): void {
  p.queue = [];
}

export { startQuest, finishQuest, questPoints, processQueue, cleanup };
