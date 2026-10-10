// Licence: MIT (donor). Clean-room sketch of the mechanism; not a line-by-line translation.
// clean-room
export interface PhysicalHit {
  landed: boolean;        // the swing connected (enemies roll to hit; the roll itself is not in this sketch)
  hpBefore: number;       // target health before the hit
  damage: number;         // damage already rolled by the caller
  targetKind: 'creature' | 'human' | 'citizen';
  bloodKind: number;      // creature blood clip index from the catalogue; ignored for non-creatures
  feetX: number;
  feetY: number;
  feetZ: number;
  halfHeight: number;     // target bounding-box half height
  biasX: number;          // small horizontal nudge toward the attacker, supplied by the caller
  biasZ: number;
}

export interface HitTuning {
  topOfHeadUnits: number; // engine constant: the player's top-of-head height
  heightFrac: number;     // share of top-of-head used as the hit height (0.60 in donor)
  clipCount: number;      // number of blood clips (3 in donor)
  clipFps: number;        // clip playback rate (12 in donor)
}

export interface VfxSpawn { clip: number; x: number; y: number; z: number; lifeS: number; }

export interface HitOutcome {
  health: number;         // health after the hit
  lethal: boolean;        // health reached exactly 0 on this hit
  vfx: VfxSpawn | null;   // blood clip, only when the hit landed
  playClank: boolean;     // metal-on-body cue, when the target is still alive
}

export function resolvePhysicalHit(hit: PhysicalHit, tune: HitTuning, framesOf: (clip: number) => number): HitOutcome {
  const health = hit.landed ? Math.max(hit.hpBefore - hit.damage, 0) : hit.hpBefore;
  const lethal = health === 0;

  let vfx: VfxSpawn | null = null;
  if (hit.landed) {
    // Non-creatures always use clip 0; creatures use their own clip, which must be in range.
    const clip = hit.targetKind === 'creature' && hit.bloodKind >= 0 && hit.bloodKind < tune.clipCount ? hit.bloodKind : 0;
    const h = Math.min(tune.topOfHeadUnits * tune.heightFrac, hit.halfHeight);
    vfx = {
      clip,
      x: hit.feetX + hit.biasX,
      y: hit.feetY + h,
      z: hit.feetZ + hit.biasZ,
      lifeS: framesOf(clip) / tune.clipFps, // one-shot: lives exactly as long as its clip
    };
  }
  return { health, lethal, vfx, playClank: !lethal };
}

export interface LiveVfx { spawn: VfxSpawn; ageS: number; }

// Called once per frame with the frame delta; a one-shot is removed when its clip has played out.
export function tickVfx(live: LiveVfx[], dtS: number): LiveVfx[] {
  const next: LiveVfx[] = [];
  for (const v of live) {
    const ageS = v.ageS + dtS;
    if (ageS < v.spawn.lifeS) {
      next.push({ spawn: v.spawn, ageS });
    }
  }
  return next;
}

export {};
