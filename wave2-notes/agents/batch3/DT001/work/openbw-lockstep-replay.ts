// Licence: donor licence unclear (no LICENSE or COPYING file in the donor folder) -> restricted; clean-room shape only.
const STREAMS = 8;             // named RNG streams (fix: donor shares one LCG state for every draw site)
const LATENCY = 2;             // input delay in ticks
const CHECK_EVERY = 32;        // checkpoint interval in ticks
const MAX_BUFFER = 1024 * 4 * LATENCY; // per-client input buffer cap in bytes

interface Unit { id: number; x: number; y: number; hp: number; hidden: boolean; }
interface Action { owner: number; size: number; dx: number; }
interface Checkpoint { tick: number; value: number; }
interface SimState {
  tick: number;
  units: Unit[];
  rng: Uint32Array;
  draws: Int32Array;
  pending: Map<number, Action[]>;
  successful: number;
  checkpoints: Checkpoint[];
}
interface Fight { seed: number; endTick: number; actions: Map<number, Action[]>; checkpoints: Checkpoint[]; }

function lcgNext(s: number): number {
  return (Math.imul(s, 22695477) + 1) >>> 0;
}

// Draw from one named stream: the state advances once per call; the 15-bit output is scaled into [from, to].
function draw(st: SimState, stream: number, from: number, to: number): number {
  const next = lcgNext(st.rng[stream]);
  st.rng[stream] = next;
  st.draws[stream]++;
  const out = (next >>> 16) & 0x7fff;
  return from + Math.floor((out * (to - from + 1)) / 32768);
}

// FNV-1a over 32-bit words (shape of the donor's insync hash).
function fnv(words: number[]): number {
  let h = 2166136261;
  for (const w of words) {
    h = Math.imul((h ^ (w | 0)) >>> 0, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Hash every unit, hidden or not, in id order, plus every stream state and the action count.
// Fix: the donor walks only the visible units list.
function stateHash(st: SimState): number {
  const words: number[] = [st.successful];
  for (const s of st.rng) words.push(s);
  for (const u of [...st.units].sort((a, b) => a.id - b.id)) {
    words.push(u.id, u.hp, u.x, u.y, u.hidden ? 1 : 0);
  }
  return fnv(words);
}

// Accept a client's action for LATENCY ticks ahead, or reject it when the client buffer is full.
function acceptAction(st: SimState, clientTick: number, a: Action, buffered: number): boolean {
  if (buffered + a.size >= MAX_BUFFER) return false;
  const at = clientTick + LATENCY;
  const list = st.pending.get(at) ?? [];
  list.push(a);
  st.pending.set(at, list);
  return true;
}

// One fixed tick: apply due actions in owner order, do the work, advance, and checkpoint on the interval.
function tick(st: SimState): void {
  const due = [...(st.pending.get(st.tick) ?? [])].sort((a, b) => a.owner - b.owner);
  st.pending.delete(st.tick);
  for (const a of due) {
    const u = st.units.find((x) => x.id === a.owner);
    if (u !== undefined) {
      u.x = (u.x + a.dx) | 0;
      st.successful++;
    }
  }
  st.units.sort((a, b) => a.id - b.id);
  for (const u of st.units) {
    if (u.hp > 0 && draw(st, 0, 0, 3) === 0) u.y++;
  }
  st.tick++;
  if (st.tick % CHECK_EVERY === 0) st.checkpoints.push({ tick: st.tick, value: stateHash(st) });
}

function makeState(seed: number, units: Unit[]): SimState {
  const rng = new Uint32Array(STREAMS);
  for (let i = 0; i < STREAMS; i++) {
    rng[i] = ((seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0) || 1;
  }
  return { tick: 0, units, rng, draws: new Int32Array(STREAMS), pending: new Map(), successful: 0, checkpoints: [] };
}

// Replay: rebuild from the seed, re-run the recorded actions, and name the first recorded checkpoint that differs.
function firstDivergence(fight: Fight, make: (seed: number) => SimState): number | null {
  const st = make(fight.seed);
  st.pending = new Map(fight.actions);
  while (st.tick < fight.endTick) tick(st);
  for (let i = 0; i < fight.checkpoints.length; i++) {
    const want = fight.checkpoints[i];
    const got = st.checkpoints[i];
    if (got === undefined || got.tick !== want.tick || got.value !== want.value) return want.tick;
  }
  return null;
}

export {};
