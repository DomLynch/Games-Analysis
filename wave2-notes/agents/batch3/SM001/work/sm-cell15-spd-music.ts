// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Track = { asset: string; chance: number };

// One pass: keep each track with its own chance. May return an empty list.
export function rollPass(tracks: Track[], rand: () => number): string[] {
  const queue: string[] = [];
  for (const t of tracks) {
    if (rand() < t.chance) queue.push(t.asset);
  }
  return queue;
}

// Re-roll until at least one track is queued. If the rolls keep missing, fall back to the
// highest-chance track so the chain never ends silently. Returns [] only when no track can play.
export function nextQueue(tracks: Track[], rand: () => number, shuffle: boolean, maxRolls = 50): string[] {
  if (!tracks.some(t => t.chance > 0)) return [];
  let queue: string[] = [];
  for (let r = 0; r < maxRolls && queue.length === 0; r++) {
    queue = rollPass(tracks, rand);
  }
  if (queue.length === 0) {
    queue = [tracks.reduce((a, b) => (b.chance > a.chance ? b : a)).asset];
  }
  if (shuffle) {
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = queue[i];
      queue[i] = queue[j];
      queue[j] = tmp;
    }
  }
  return queue;
}

// Client music bed. The fade runs on frame time (seconds) and calls back when it reaches zero.
// The next track starts at full volume; there is no overlap (the donor's transition is a dip, not a crossfade).
export class MusicBed {
  private volume = 1;
  private fadeLeft = 0;
  private fadeTotal = 0;
  private onFadeDone: (() => void) | null = null;

  fadeOut(seconds: number, then: () => void): void {
    this.fadeTotal = Math.max(seconds, 1e-6);
    this.fadeLeft = this.fadeTotal;
    this.onFadeDone = then;
  }

  // dt is frame time in seconds; returns the gain to apply this frame.
  update(dt: number): number {
    if (this.fadeLeft > 0) {
      this.fadeLeft = Math.max(0, this.fadeLeft - dt);
      if (this.fadeLeft === 0) {
        const cb = this.onFadeDone;
        this.onFadeDone = null;
        if (cb) cb();
      }
    }
    return this.gain();
  }

  gain(): number {
    return this.fadeLeft > 0 ? this.volume * (this.fadeLeft / this.fadeTotal) : this.volume;
  }
}

// Per-hit pitch jitter over the donor's call-site range (0.87 to 1.15), scaled by the weapon's own pitch.
export function hitPitch(rand: () => number, weaponPitch = 1): number {
  const lo = 0.87;
  const hi = 1.15;
  return weaponPitch * (lo + rand() * (hi - lo));
}

// Combat cues play only when the fight is in view for either side.
export function combatCueAudible(attackerInView: boolean, victimInView: boolean): boolean {
  return attackerInView || victimInView;
}

// Low-health cue on one damage event: none, a warning, or a critical cue.
export type LowHealthCue = { kind: "none" | "warn" | "critical"; volume: number };

export function lowHealthCue(damage: number, healthBefore: number, healthAfter: number, maxHealth: number): LowHealthCue {
  if (healthAfter <= 0 || healthBefore <= 0 || maxHealth <= 0) return { kind: "none", volume: 0 };
  const shareOfCurrent = damage / healthBefore;
  const shareLeft = healthAfter / maxHealth;
  let intensity = (0.25 * shareOfCurrent * shareOfCurrent) / shareLeft;
  if (intensity < 0.05) return { kind: "none", volume: 0 };
  intensity = Math.min(1 / 3, intensity);
  if (intensity >= 1 / 6) return { kind: "critical", volume: 1 / 3 + intensity * 2 };
  return { kind: "warn", volume: 1 / 3 + intensity * 4 };
}

export {};
