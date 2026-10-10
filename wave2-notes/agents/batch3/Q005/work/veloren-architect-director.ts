// Licence of donor: GPL-3.0. Clean-room sketch written from the described mechanism, not a translation of the donor lines.

interface Ticket {
  kind: string;    // population type, e.g. "guard"
  diedAt: number;  // in-game seconds at death (refill tickets are backdated so they are due at once)
}

interface Director {
  wanted: Map<string, number>;   // cap per kind (zone data in Frankendom)
  counted: Map<string, number>;  // living NPCs plus tickets still waiting; a death keeps its slot
  queue: Ticket[];               // index 0 is next; deaths are appended at the back
  now: number;                   // in-game seconds
  random: () => number;          // returns 0 <= x < 1
}

const RUN_EVERY_TICKS = 32;
const RESPAWN_DELAY_S = 86400;                 // one in-game day
const FALLBACK_AFTER_S = 5 * RESPAWN_DELAY_S;  // after this age the ticket spawns anywhere

// A death does not change the ledger. The slot stays counted until its ticket is spawned or dropped.
function onDeath(d: Director, kind: string, now: number): void {
  d.queue.push({ kind, diedAt: now });
}

function runDirector(
  d: Director,
  tick: number,
  spawnAt: (t: Ticket) => boolean,     // preferred place; presence gating happens inside
  spawnAnywhere: (t: Ticket) => void,  // last resort after FALLBACK_AFTER_S
): void {
  if (tick % RUN_EVERY_TICKS !== 0) return;

  let budget = 1 + Math.floor(d.random() * 19);  // 1..19 per run

  // Refill: each kind below its cap gets backdated tickets at the front; the whole deficit is added to this run's budget.
  const refill: Ticket[] = [];
  for (const [kind, want] of d.wanted) {
    const have = d.counted.get(kind) ?? 0;
    const deficit = want - have;
    if (deficit <= 0) continue;
    for (let i = 0; i < deficit; i++) {
      refill.push({ kind, diedAt: d.now - RESPAWN_DELAY_S });
    }
    d.counted.set(kind, want);
    budget += deficit;
  }
  d.queue = [...refill, ...d.queue];

  // Drain: drop over-cap tickets, stop at the first ticket that is not due, spawn the rest.
  const failed: Ticket[] = [];
  while (budget > 0 && d.queue.length > 0) {
    const t = d.queue.shift() as Ticket;
    const have = d.counted.get(t.kind) ?? 0;
    if (have > (d.wanted.get(t.kind) ?? 0)) {
      d.counted.set(t.kind, have - 1);
      continue;
    }
    if (t.diedAt + RESPAWN_DELAY_S > d.now) {
      d.queue.unshift(t);
      break;
    }
    let ok = spawnAt(t);
    if (!ok && d.now - t.diedAt > FALLBACK_AFTER_S) {
      spawnAnywhere(t);
      ok = true;
    }
    if (ok) budget -= 1;
    else failed.push(t);
  }
  d.queue = [...failed, ...d.queue];  // failed tickets keep their order at the front
}
