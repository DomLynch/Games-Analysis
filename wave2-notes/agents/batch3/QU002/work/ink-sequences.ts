// Licence: MIT (donor, inkjs, LICENSE.md "MIT License"). Shape adapted from the sequence and choice logic described in the donor; written fresh, not a line-by-line translation.

// Sequence flags, same bit values as the donor's SequenceType.
const STOPPING = 1;
const CYCLE = 2;
const SHUFFLE = 4;
const ONCE = 8;
// The six combinations the donor's parser accepts (InkParser 2880-2890).
const ACCEPTED_FLAGS: number[] = [STOPPING, CYCLE, SHUFFLE, ONCE, SHUFFLE | STOPPING, SHUFFLE | ONCE];

// Same generator step as the donor (Park-Miller: multiply by 48271, modulo 2^31 - 1).
class Prng {
  private s: number;
  constructor(seed: number) {
    let x = Math.trunc(seed) % 2147483647;
    if (x <= 0) x += 2147483646;
    this.s = x;
  }
  next(): number {
    this.s = (this.s * 48271) % 2147483647;
    return this.s;
  }
}

// Fix: the donor sums character codes of the path, so anagram paths collide. FNV-1a 32-bit instead.
function hashPath(path: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// Fix: the donor adds (path hash + loop index + story seed), so different triples can sum to the same seed.
// Mix each part by multiply and xor instead, and keep the result in the generator's range.
function shuffleSeed(pathHash: number, loopIndex: number, playerSeed: number): number {
  const mixed = (pathHash ^ Math.imul(loopIndex + 1, 0x9e3779b1) ^ Math.imul(playerSeed, 0x85ebca6b)) >>> 0;
  return (mixed % 2147483646) + 1;
}

// Draw without replacement: the slot-th pick of a permutation of `count` items, one pool per loop.
function shuffledSlot(count: number, slot: number, pathHash: number, loopIndex: number, playerSeed: number): number {
  const rng = new Prng(shuffleSeed(pathHash, loopIndex, playerSeed));
  const pool: number[] = [];
  for (let i = 0; i < count; i++) pool.push(i);
  let picked = 0;
  for (let i = 0; i <= slot; i++) {
    const chosen = rng.next() % pool.length;
    picked = pool[chosen];
    pool.splice(chosen, 1);
  }
  return picked;
}

// Branch to show. `visits` = times this sequence was entered (counted at its start only).
// `playerSeed` is required: the donor defaults to a clock-derived seed (StoryState 443-444).
function branchFor(flags: number, visits: number, n: number, pathStr: string, playerSeed: number): number {
  if (!ACCEPTED_FLAGS.includes(flags)) throw new Error("sequence type combination not supported");
  const once = (flags & ONCE) !== 0;
  const cycle = (flags & CYCLE) !== 0;
  const stopping = (flags & STOPPING) !== 0;
  const shuffle = (flags & SHUFFLE) !== 0;

  // Index before any shuffle: clamp for stopping or once, modulo for cycle, raw count for pure shuffle.
  let seqCount: number;
  if (stopping || once) {
    const branches = once ? n + 1 : n; // once adds an empty last branch
    seqCount = Math.min(visits, branches - 1);
  } else if (cycle) {
    seqCount = visits % n;
  } else {
    seqCount = visits;
  }
  if (!shuffle) return seqCount;

  // Shuffle: the stopping or once endpoint is fixed; everything before it is shuffled.
  const fixedEnd = stopping ? n - 1 : n;
  if ((stopping || once) && seqCount === fixedEnd) return seqCount;
  const count = stopping ? n - 1 : n;
  const pathHash = hashPath(pathStr);
  const loopIndex = Math.floor(seqCount / count);
  const slot = seqCount % count;
  return shuffledSlot(count, slot, pathHash, loopIndex, playerSeed);
}

// Choice gate, evaluated when the flow reaches the choice point (not when the player clicks).
interface ChoiceGate {
  hasCondition: boolean;
  condition: boolean;
  onceOnly: boolean;       // default true in the donor; false = sticky choice
  targetVisits: number;    // visits to the choice's target container so far
}

function choiceVisible(g: ChoiceGate): boolean {
  if (g.hasCondition && !g.condition) return false;
  if (g.onceOnly && g.targetVisits > 0) return false;
  return true;
}

// Turn clock: advances only when the player picks a path (not on automatic fall-through).
// Returns -1 when the container has never been entered, as the donor does.
function turnsSince(currentTurn: number, lastTurnEntered: number | undefined): number {
  return lastTurnEntered === undefined ? -1 : currentTurn - lastTurnEntered;
}

export {};
