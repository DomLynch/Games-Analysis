// Licence: MIT (donor: boardgame.io). The Alea step and Mash seeding are the donor's inlined copy of seedrandom's Alea (MIT-style notice by David Bau). Re-expressed as pure functions; not a line-by-line port.
const TWO_POW_MINUS_32 = 2.3283064365386963e-10;

// Plain data: four numbers, safe to keep in the game state (the donor keeps it under plugins.random.data).
interface RngState { c: number; s0: number; s1: number; s2: number }

// Mash: string to a fraction in [0, 1). Keeps its own counter, as the donor's closure does.
function makeMash(): (data: string | number) => number {
  let n = 0xefc8249d;
  return (data: string | number): number => {
    const str = data.toString();
    for (let i = 0; i < str.length; i++) {
      n += str.charCodeAt(i);
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000;
    }
    return (n >>> 0) * TWO_POW_MINUS_32;
  };
}

// Seed the three words from the seed text, in the donor's order (Alea constructor).
function seedState(seed: string | number): RngState {
  const mash = makeMash();
  const s0a = mash(' ');
  const s1a = mash(' ');
  const s2a = mash(' ');
  let s0 = s0a - mash(seed);
  if (s0 < 0) s0 += 1;
  let s1 = s1a - mash(seed);
  if (s1 < 0) s1 += 1;
  let s2 = s2a - mash(seed);
  if (s2 < 0) s2 += 1;
  return { c: 1, s0, s1, s2 };
}

// One step, pure: returns the output in [0, 1) and the next state. The input state is not changed.
function step(st: RngState): { out: number; next: RngState } {
  const t = 2091639 * st.s0 + st.c * TWO_POW_MINUS_32;
  const c = Math.trunc(t);
  const out = t - c;
  return { out, next: { c, s0: st.s1, s1: st.s2, s2: out } };
}

// Game-facing draws. Each returns the value and the state after it, so a move stays a pure function of its inputs.
function die(st: RngState, sides: number): { value: number; st: RngState } {
  const r = step(st);
  return { value: Math.floor(r.out * sides) + 1, st: r.next };
}

// Pick from what is left, move the last item into the hole: one draw per item (donor Shuffle).
function shuffle<T>(st: RngState, deck: T[]): { deck: T[]; st: RngState } {
  const clone = [...deck];
  const out: T[] = [];
  let cur = st;
  let remaining = clone.length;
  while (remaining > 0) {
    const r = step(cur);
    cur = r.next;
    const idx = Math.trunc(remaining * r.out);
    out.push(clone[idx]);
    clone[idx] = clone[--remaining];
  }
  return { deck: out, st: cur };
}

// The rng state is redacted from every player view (donor: the random plugin's playerView returns undefined).
interface FightState { hp: number[]; rng: RngState }
function playerView(s: FightState): { hp: number[] } {
  return { hp: s.hp };
}

// Donor NoClient rule: a move that drew randomness is not shown on the client; the client keeps its old state and waits for the server.
function clientApply<S>(old: S, result: { state: S; usedRandom: boolean }): S {
  return result.usedRandom ? old : result.state;
}
