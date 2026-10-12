// Licence: MIT donor (OTClient). Adaptation allowed by MIT; this sketch is written from the described mechanism.
export type Lane = 'main' | 'secondary';

export interface CueSettings {
  cooldownMs: number;        // per effect id; stamped only when the cue actually plays
  maxDistanceTiles: number;  // cues farther than this are dropped and do not stamp the cooldown
  panTiles: number;          // stereo pan scale in tiles
}

export interface Cue {
  effectId: number;
  lane: Lane;
  volume: number;            // 0..100, resolved by the caller from the source group and sound type
  variants: string[];        // one entry, or a random pool
  pos: { x: number; y: number };
}

export interface Play {
  file: string;
  gain: number;
  pan: number;
  lane: Lane;
  voiceId: number;
  replaces: number | null;   // voice this play pre-empts on its lane (the donor does not do this)
}

export class ServerCueMixer {
  private lastPlayedMs = new Map<number, number>();
  private laneVoice = new Map<Lane, number>();
  private nextVoice = 1;

  constructor(private readonly s: CueSettings, private readonly pick: (n: number) => number) {}

  // Order mirrors the donor: volume gate, cooldown, variant pick, distance gate, then stamp on success.
  handle(nowMs: number, me: { x: number; y: number }, cue: Cue): Play | null {
    if (cue.volume <= 1) return null;

    const last = this.lastPlayedMs.get(cue.effectId);
    if (last !== undefined && nowMs - last < this.s.cooldownMs) return null;

    if (cue.variants.length === 0) return null;
    const file = cue.variants[this.pick(cue.variants.length)];

    const dx = cue.pos.x - me.x;
    const dy = cue.pos.y - me.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > this.s.maxDistanceTiles) return null;

    const mul = Math.min(1, Math.max(0, cue.volume / 100));
    const gain = Math.max(0.001, (1 - d / this.s.maxDistanceTiles) * mul);
    const pan = Math.min(1, Math.max(-1, dx / this.s.panTiles));

    this.lastPlayedMs.set(cue.effectId, nowMs);
    const replaces = this.laneVoice.get(cue.lane) ?? null;
    const voiceId = this.nextVoice++;
    this.laneVoice.set(cue.lane, voiceId);
    return { file, gain, pan, lane: cue.lane, voiceId, replaces };
  }
}

export {};
