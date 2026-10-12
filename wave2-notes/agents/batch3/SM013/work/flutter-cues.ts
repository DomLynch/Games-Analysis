// Licence: MIT (donor). Adaptation of the cue policy shape is permitted; this sketch is still written from the described mechanism, not a line-by-line port.
export {};

// One policy per cue. Each kind mirrors one donor class (pinball_audio.dart).
type Policy =
  | { kind: "simple"; volume: number }                              // _SimplePlayAudio
  | { kind: "loopOnce"; volume: number }                            // _SingleLoopAudio: play once, guard
  | { kind: "pool"; volume: number; max: number }                   // _SingleAudioPool: voice cap
  | { kind: "randomAB"; volume: number; max: number; variants: [string, string] } // _RandomABAudio
  | { kind: "throttled"; volume: number; cooldownMs: number };      // _ThrottledAudio

interface Started { cue: string; clip: string; volume: number; atMs: number; }

class CuePlayer {
  private lastPlayed = new Map<string, number>();    // throttle clock per cue
  private active = new Map<string, number>();        // live voices per cue
  private looping = new Set<string>();               // loopOnce guard
  readonly started: Started[] = [];

  constructor(private policies: Record<string, Policy>, private rng: () => number, private now: () => number) {}

  play(cue: string): boolean {
    const p = this.policies[cue];
    if (!p) throw new Error(`unregistered cue ${cue}`);  // donor asserts in debug
    const t = this.now();
    switch (p.kind) {
      case "simple":
        return this.start(cue, cue, p.volume, t);
      case "loopOnce":
        if (this.looping.has(cue)) return false;          // donor: _playing flag, never reset here
        this.looping.add(cue);
        return this.start(cue, cue, p.volume, t);
      case "pool": {
        const live = this.active.get(cue) ?? 0;
        if (live >= p.max) return false;                  // fix: explicit drop-new cap (donor pool behaviour not read)
        return this.start(cue, cue, p.volume, t, true);
      }
      case "randomAB": {
        const live = this.active.get(cue) ?? 0;
        if (live >= p.max) return false;
        const clip = this.rng() < 0.5 ? p.variants[0] : p.variants[1];
        return this.start(cue, clip, p.volume, t, true);
      }
      case "throttled": {
        const last = this.lastPlayed.get(cue);
        if (last !== undefined && !(t - last > p.cooldownMs)) return false;   // donor: strictly greater than duration
        return this.start(cue, cue, p.volume, t);
      }
    }
  }

  // Simple voice bookkeeping: a voice ends when `release` is called.
  release(cue: string): void {
    const n = this.active.get(cue) ?? 0;
    if (n > 0) this.active.set(cue, n - 1);
  }

  private start(cue: string, clip: string, volume: number, t: number, counted = false): boolean {
    this.lastPlayed.set(cue, t);
    if (counted) this.active.set(cue, (this.active.get(cue) ?? 0) + 1);
    this.started.push({ cue, clip, volume, atMs: t });
    return true;
  }
}

const policies: Record<string, Policy> = {
  google: { kind: "simple", volume: 1 },
  rollover: { kind: "simple", volume: 0.3 },
  background: { kind: "loopOnce", volume: 0.6 },
  flipper: { kind: "pool", volume: 1, max: 2 },
  bumper: { kind: "randomAB", volume: 0.6, max: 4, variants: ["bumper_a", "bumper_b"] },
  dino: { kind: "throttled", volume: 1, cooldownMs: 6000 },
};

let clock = 0;
let seed = 3;
const rng = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const player = new CuePlayer(policies, rng, () => clock);

// Self-check: throttle blocks a repeat inside the cooldown, a pool caps at two, A/B alternates clips.
clock = 0;
if (!player.play("dino")) throw new Error("first dino play should pass");
clock = 5000;
if (player.play("dino")) throw new Error("dino repeated inside 6 s");
clock = 6001;
if (!player.play("dino")) throw new Error("dino blocked after 6 s");
if (!player.play("flipper") || !player.play("flipper")) throw new Error("flipper should play twice");
if (player.play("flipper")) throw new Error("flipper exceeded cap of 2");
player.release("flipper");
if (!player.play("flipper")) throw new Error("flipper blocked after release");
if (!player.play("background") || player.play("background")) throw new Error("background should play once");
for (let i = 0; i < 20; i++) { player.play("bumper"); player.release("bumper"); }
const clips = new Set(player.started.filter((s) => s.cue === "bumper").map((s) => s.clip));
if (clips.size !== 2) throw new Error("bumper should use both variants");
