// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch written from the described mechanism, not a translation of the donor.

// Off-screen cue volume by distance vs perception (donor: full volume on screen; falloff beyond the viewport).
// Full scale = 1.0. Donor: 0x7FFF full, falls by 2/3 over [P, 2P], floor 1/3 (0x2AAA) from 2P on.
const FULL = 1.0;
const FLOOR = 1 / 3;
const FALLOFF = FULL - FLOOR;

function cueVolume(distance: number, radius: number, onScreen: boolean): number {
  if (onScreen || distance <= radius) return FULL;
  if (distance < 2 * radius) return FULL - (FALLOFF * (distance - radius)) / radius;
  return FLOOR;
}

interface Cue {
  id: string;
  priority: number; // higher wins a voice
  volume: number;
  stop: () => void;
}

// Donor: a fixed pool of 4 voices, refuse when full, no priority, no stealing.
// Fix: when full, steal the lowest-priority live cue if the new one outranks it.
class CuePool {
  private live: Cue[] = [];

  constructor(private readonly cap: number = 4) {}

  // Claim at play time, not at schedule time (donor claims when the animation is queued).
  request(cue: Cue): boolean {
    if (this.live.length < this.cap) {
      this.live.push(cue);
      return true;
    }
    let low = 0;
    for (let i = 1; i < this.live.length; i++) {
      if (this.live[i].priority < this.live[low].priority) low = i;
    }
    if (this.live[low].priority >= cue.priority) return false;
    this.live[low].stop();
    this.live.splice(low, 1);
    this.live.push(cue);
    return true;
  }

  release(id: string): void {
    this.live = this.live.filter((c) => c.id !== id);
  }

  count(): number {
    return this.live.length;
  }
}

// Donor weapon cue name: "W" + effect + weapon sound id + hit mode + material + "XX" + "1".
// Material comes from the target only for a hit; explosions and no-target use X.
type Material = "metal" | "wood" | "stone" | "flesh" | "none";
const MATERIAL_CODE: Record<Material, string> = { metal: "M", wood: "W", stone: "S", flesh: "F", none: "X" };

function hitCueId(effect: "A" | "H", weaponSoundId: string, hitMode: 1 | 2, target: Material): string {
  const material: Material = effect === "H" ? target : "none";
  return `W${effect}${weaponSoundId}${hitMode}${MATERIAL_CODE[material]}XX1`;
}

// Demo: four voices are busy with ambient cues, a player hit (priority 9) still plays.
const pool = new CuePool(4);
for (let i = 0; i < 4; i++) {
  pool.request({ id: `amb${i}`, priority: 1, volume: cueVolume(10, 8, false), stop: () => {} });
}
const playerHit = pool.request({ id: "hero-hit", priority: 9, volume: FULL, stop: () => {} });
const name = hitCueId("H", "1", 1, "metal");
const cnt = pool.count();

export { playerHit, name, cnt, cueVolume };
export {};
