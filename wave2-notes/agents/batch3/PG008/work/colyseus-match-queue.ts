// Licence: MIT (donor). Shape adapted and rewritten from the mechanism; not a line translation.
export interface QueuedPlayer {
  id: string;             // server-issued session id
  rank: number;           // read from the server profile, never from the join message
  partyId?: string;       // read from the server party record, never from the join message
  waitedCycles: number;   // +1 on every cycle spent in the queue
  highPriority: boolean;  // sticky once waitedCycles reaches widenAfter
}

export interface QueueRules {
  groupSize: number;       // players per match (donor default 4)
  widenAfter: number;      // cycles before a player may be forced into a group (donor 10)
  giveUpAfter: number;     // cycles before an incomplete group may be released (donor 15)
  allowIncomplete: boolean;
  rankAbs: number;         // rank gap that is always compatible (donor 10)
  rankRatio: number;       // gap allowed as a multiple of the group average (donor 2)
}

export interface Block { members: QueuedPlayer[]; }     // a solo player or a whole party
export interface MatchGroup { members: QueuedPlayer[]; sum: number; ready: boolean; }

function blockAverage(b: Block): number {
  return b.members.reduce((s, p) => s + p.rank, 0) / b.members.length;
}

function groupAverage(g: MatchGroup): number {
  return g.members.length === 0 ? 0 : g.sum / g.members.length;
}

// Compatibility is tested against the average of the ranks actually in the group.
function compatible(b: Block, g: MatchGroup, r: QueueRules): boolean {
  if (g.members.length === 0) return true;
  const avg = groupAverage(g);
  const gap = Math.abs(blockAverage(b) - avg);
  return gap < r.rankAbs || gap <= r.rankRatio * avg;
}

// A party is one block, so it is never split across groups.
function toBlocks(queue: QueuedPlayer[]): Block[] {
  const byParty = new Map<string, Block>();
  const out: Block[] = [];
  for (const p of queue) {
    if (p.partyId === undefined) { out.push({ members: [p] }); continue; }
    let b = byParty.get(p.partyId);
    if (b === undefined) { b = { members: [] }; byParty.set(p.partyId, b); out.push(b); }
    b.members.push(p);
  }
  return out;
}

// One cycle, called on a fixed step (donor: 1000 ms). The caller removes ready players from the queue.
export function matchCycle(queue: QueuedPlayer[], r: QueueRules): MatchGroup[] {
  for (const p of queue) p.waitedCycles += 1;
  const sorted = toBlocks(queue).sort((a, b) => blockAverage(a) - blockAverage(b));

  const groups: MatchGroup[] = [];
  let cur: MatchGroup = { members: [], sum: 0, ready: false };
  for (const b of sorted) {
    if (b.members.length > r.groupSize) continue; // oversize party waits in the queue
    const forced = b.members.some((p) => p.highPriority);
    const fits = cur.members.length + b.members.length <= r.groupSize;
    if (cur.members.length > 0 && (!fits || (!forced && !compatible(b, cur, r)))) {
      groups.push(cur);
      cur = { members: [], sum: 0, ready: false };
    }
    for (const p of b.members) { cur.members.push(p); cur.sum += p.rank; }
    if (cur.members.length === r.groupSize) {
      cur.ready = true;
      groups.push(cur);
      cur = { members: [], sum: 0, ready: false };
    }
  }
  if (cur.members.length > 0) groups.push(cur);

  // An incomplete group is released only when allowed, one member has waited giveUpAfter cycles,
  // and every member has waited more than one cycle (the donor's "give new players a second pass").
  for (const g of groups) {
    if (g.ready || !r.allowIncomplete) continue;
    const longWaiter = g.members.some((p) => p.waitedCycles >= r.giveUpAfter);
    if (longWaiter && g.members.every((p) => p.waitedCycles > 1)) g.ready = true;
  }

  for (const p of queue) {
    if (p.waitedCycles >= r.widenAfter) p.highPriority = true;
  }
  return groups.filter((g) => g.ready);
}

export {};
