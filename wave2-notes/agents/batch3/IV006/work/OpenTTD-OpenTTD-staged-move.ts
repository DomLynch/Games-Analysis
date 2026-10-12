type Designation = "transfer" | "deliver" | "keep" | "load";

interface Packet {
  count: number;
  origin: string;      // donor: source_xy + source
  firstStop: string;   // donor: first_station
  ageTicks: number;    // donor: periods_in_transit
  d: Designation;
}

const MAX_COUNT = 65535; // donor: UINT16_MAX

function rank(d: Designation): number {
  return d === "transfer" ? 0 : d === "deliver" ? 1 : d === "keep" ? 2 : 3;
}

function mergeable(a: Packet, b: Packet): boolean {
  return a.d === b.d && a.origin === b.origin && a.firstStop === b.firstStop && a.ageTicks === b.ageTicks;
}

// Append: merge into the nearest mergeable packet while the stack stays under the cap, else push.
function append(list: Packet[], cp: Packet): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const icp = list[i];
    if (mergeable(icp, cp) && icp.count + cp.count <= MAX_COUNT) {
      icp.count += cp.count;
      return;
    }
  }
  list.push({ ...cp });
}

// Stage: decide a designation per packet, group packets into consecutive chunks, count each chunk.
function stage(list: Packet[], decide: (p: Packet) => Designation): Record<Designation, number> {
  const counts: Record<Designation, number> = { transfer: 0, deliver: 0, keep: 0, load: 0 };
  for (const p of list) {
    p.d = decide(p);
    counts[p.d] += p.count;
  }
  list.sort((a, b) => rank(a.d) - rank(b.d)); // stable sort keeps arrival order inside a chunk
  return counts;
}

// Take up to budget units of one designation from the front of the list.
function takeFront(list: Packet[], want: Designation, budget: number): number {
  let moved = 0;
  while (list.length > 0 && moved < budget && list[0].d === want) {
    const head = list[0];
    const n = Math.min(head.count, budget - moved);
    head.count -= n;
    moved += n;
    if (head.count === 0) list.shift();
  }
  return moved;
}

// Unload: transfers first; deliveries only when no transfers remain and budget is left.
function unload(list: Packet[], counts: Record<Designation, number>, budget: number): number {
  let moved = 0;
  if (counts.transfer > 0) {
    moved = takeFront(list, "transfer", budget);
    counts.transfer -= moved;
  }
  if (counts.transfer === 0 && counts.deliver > 0 && moved < budget) {
    const delivered = takeFront(list, "deliver", budget - moved);
    counts.deliver -= delivered;
    moved += delivered;
  }
  return moved;
}

// Commit reserved load: whole packets only (donor splits a packet to fit the budget).
function commitLoad(list: Packet[], counts: Record<Designation, number>, budget: number): number {
  let moved = 0;
  for (const p of list) {
    if (p.d !== "load" || moved + p.count > budget) break;
    p.d = "keep";
    moved += p.count;
  }
  counts.load -= moved;
  counts.keep += moved;
  return moved;
}

export {};
