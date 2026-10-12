// Licence: GPL-3.0 (donor LICENSE, version 3). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

const DAY = 60 * 60 * 24; // in-game seconds

type ReportKind =
  | { t: "death"; victim: number; killer?: number }
  | { t: "theft"; thief: number; site?: number };

interface Report { id: number; kind: ReportKind; atTime: number; }

// How long a report is remembered, in in-game seconds: murder 15 days, other death 5, theft 1.5.
function rememberFor(r: Report): number {
  if (r.kind.t === "death") return r.kind.killer !== undefined ? DAY * 15 : DAY * 5;
  return DAY * 1.5;
}

// Keep a report only while its age is under its memory length.
function pruneReports(reports: Report[], now: number): Report[] {
  return reports.filter(r => Math.max(now - r.atTime, 0) < rememberFor(r));
}

interface Witness { id: number; x: number; y: number; z: number; present: boolean; inbox: number[]; known: Set<number>; }
interface Pos { x: number; y: number; z: number; }

function distSq(a: Pos, b: Pos): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

// Push one shared report id to every present witness inside the radius (squared-distance test).
function deliverReport(reportId: number, at: Pos, radius: number, witnesses: Witness[]): number {
  const r2 = radius * radius;
  let delivered = 0;
  for (const w of witnesses) {
    if (w.present && distSq(w, at) < r2) {
      w.inbox.push(reportId);
      delivered += 1;
    }
  }
  return delivered;
}

const RESPONSE_WINDOW = 60 * 5; // in-game seconds a witness will still speak about a report

// A witness reads its inbox once: a known report is skipped; a fresh one is marked known and may be spoken.
function handleInbox(w: Witness, reports: Map<number, Report>, now: number): string[] {
  const said: string[] = [];
  for (const id of w.inbox) {
    if (w.known.has(id)) continue;
    const r = reports.get(id);
    if (!r) continue;
    w.known.add(id);
    if (now - r.atTime < RESPONSE_WINDOW) said.push(r.kind.t === "death" ? "witness_death" : "witness_theft");
  }
  w.inbox = [];
  return said;
}

// Lazy replenish of resource chunks: a fixed slice of chunks per tick, round robin, clamped to [0, 1].
const REPLENISH_TIME = 60 * 60;   // seconds for a full refill (donor constant)
const REPLENISH_PER_TICK = 8192;  // chunks touched per tick (donor constant)

function replenishTick(chunks: number[], tick: number, worldChunks: number, dt: number): void {
  const amount = worldChunks * dt * (1 / REPLENISH_TIME / REPLENISH_PER_TICK);
  const groups = Math.floor(chunks.length / REPLENISH_PER_TICK) + 1;
  const start = (tick % groups) * REPLENISH_PER_TICK;
  const end = Math.min(start + REPLENISH_PER_TICK, chunks.length);
  for (let i = start; i < end; i++) {
    chunks[i] = Math.min(1, Math.max(0, chunks[i] + amount));
  }
}
export {};
