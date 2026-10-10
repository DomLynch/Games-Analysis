// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Times in ms. Distance in world units; the donor adds distance to the fire delay as milliseconds.
type TargetKind = "player" | "npc" | "siege" | "door" | "other";

interface Spec {
  aimMs: number;          // time to turn onto a target
  armMs: number;          // time to reload after a shot
  fireBaseMs: number;     // fire delay before distance is added
  baseDamage: number;
  minRange: number;       // units; a shot closer than this is refused
  maxRange: number;       // units; a shot further than this is refused
  splashRadius: number;   // 0 = single target (uses the aimed target)
  multiplier: (k: TargetKind) => number;
}

// Donor values as read (GameServer/gameobjects/SiegeWeapon/*.cs). Multipliers are the CalcDamageToTarget overrides.
const BALLISTA: Spec = {
  aimMs: 5000, armMs: 10000, fireBaseMs: 0, baseDamage: 75, minRange: 50, maxRange: 4000, splashRadius: 0,
  multiplier: (k) => (k === "siege" || k === "player" || k === "npc" ? 3 : 1),
};
const CATAPULT: Spec = {
  aimMs: 5000, armMs: 10000, fireBaseMs: 0, baseDamage: 100, minRange: 1000, maxRange: 3000, splashRadius: 150,
  multiplier: (k) => (k === "player" || k === "npc" ? 2 : 1),
};
const TREBUCHET: Spec = {
  aimMs: 5000, armMs: 15000, fireBaseMs: 1000, baseDamage: 100, minRange: 2000, maxRange: 5000, splashRadius: 150,
  multiplier: (k) => (k === "door" ? 3 : 1),
};

interface Living { id: number; kind: TargetKind; x: number; y: number; hp: number; }
interface Pending { at: number; ground: { x: number; y: number }; }

class Emplacement {
  private aimedAt = -1;   // -1 = not aiming
  private armedAt = -1;   // -1 = not reloading
  aimed = false;
  armed = false;
  private pending: Pending | null = null;
  private aimTargetId = -1;
  constructor(private spec: Spec, private pos: { x: number; y: number }) {}

  private dist(p: { x: number; y: number }): number {
    return Math.hypot(p.x - this.pos.x, p.y - this.pos.y);
  }

  // Donor Aim(): refused outside min/max range; the aim completes after aimMs.
  aim(target: Living, now: number): boolean {
    const d = this.dist(target);
    if (d < this.spec.minRange || d > this.spec.maxRange) return false;
    this.aimed = false;
    this.aimTargetId = target.id;
    this.aimedAt = now + this.spec.aimMs;
    return true;
  }

  // Donor Fire(): needs armed AND aimed; the hit lands after fireBaseMs + distance; then the piece re-arms.
  fire(ground: { x: number; y: number }, now: number): boolean {
    if (!(this.armed && this.aimed)) return false;
    const d = this.dist(ground);
    if (d < this.spec.minRange || d > this.spec.maxRange) return false;
    this.pending = { at: now + this.spec.fireBaseMs + d, ground };
    this.armed = false;
    this.armedAt = now + this.spec.armMs;
    return true;
  }

  // Called every tick with the server clock.
  tick(now: number, targets: Living[], randInclusive: (lo: number, hi: number) => number): { id: number; damage: number }[] {
    const out: { id: number; damage: number }[] = [];
    if (this.aimedAt >= 0 && now >= this.aimedAt) { this.aimed = true; this.aimedAt = -1; }
    if (this.armedAt >= 0 && now >= this.armedAt) { this.armed = true; this.armedAt = -1; }
    if (this.pending && now >= this.pending.at) {
      const { ground } = this.pending;
      this.pending = null;
      // Donor DoDamage(): targets are chosen at impact, not at fire.
      for (const t of targets) {
        // Single-target pieces (ballista) hit the aimed target; splash pieces hit everything in the radius of the ground point.
        const inSplash = this.spec.splashRadius > 0
          ? Math.hypot(t.x - ground.x, t.y - ground.y) <= this.spec.splashRadius
          : t.id === this.aimTargetId;
        if (!inSplash || t.hp <= 0) continue;
        // Donor: CalcDamageToTarget + Util.Random(50); Util.Random(max) is inclusive of max.
        out.push({ id: t.id, damage: this.spec.baseDamage * this.spec.multiplier(t.kind) + randInclusive(0, 50) });
      }
    }
    return out;
  }
}
export {};
export {};
