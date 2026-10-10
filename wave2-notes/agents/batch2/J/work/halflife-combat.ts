type HitGroup = 'generic' | 'head' | 'chest' | 'stomach' | 'arm' | 'leg';
type DamageKind = 'bullet' | 'blast' | 'fall' | 'drown' | 'club';

interface GroupMultipliers { head: number; chest: number; stomach: number; arm: number; leg: number; }

interface Defender {
  health: number;
  armour: number;
  sizeVolume: number; // width*depth*height of the hit box
  groups: GroupMultipliers;
  alive: boolean;
}

interface Hit { target: Defender; amount: number; kinds: Set<DamageKind>; }

interface Tuning {
  armourRatio: number;   // share of a hit that bypasses armour (0.2)
  armourBonus: number;   // health points saved per armour point (0.5 => armour point worth 2)
  blastArmourMult: number; // extra armour cost multiplier for blasts in multiplayer
  forceRefVolume: number; // volume at which force scale is 1
  forceCap: number;
  forceScale: number;
}

function groupMultiplier(g: HitGroup, m: GroupMultipliers): number {
  return g === 'generic' ? 1 : m[g];
}

// batch: one volley (e.g. shotgun pellets) sums per target and is delivered once.
class Volley {
  private cur: Hit | null = null;
  private done: Hit[] = [];
  add(target: Defender, rawDamage: number, group: HitGroup, kind: DamageKind): void {
    const dmg = rawDamage * groupMultiplier(group, target.groups);
    if (this.cur === null || this.cur.target !== target) {
      if (this.cur !== null) this.done.push(this.cur);
      this.cur = { target, amount: 0, kinds: new Set() };
    }
    this.cur.amount += dmg;
    this.cur.kinds.add(kind);
  }
  flush(): Hit[] {
    if (this.cur !== null) this.done.push(this.cur);
    this.cur = null;
    const out = this.done;
    this.done = [];
    return out;
  }
}

function knockback(damage: number, t: Tuning, v: Defender): number {
  const f = damage * (t.forceRefVolume / v.sizeVolume) * t.forceScale;
  return Math.min(f, t.forceCap);
}

interface HitOutcome { healthLoss: number; armourSpent: number; push: number; killed: boolean; heavy: boolean; }

function resolve(hit: Hit, t: Tuning, multiplayer: boolean): HitOutcome {
  const v = hit.target;
  if (!v.alive) return { healthLoss: 0, armourSpent: 0, push: 0, killed: false, heavy: false };
  let dmg = hit.amount;
  let armourSpent = 0;
  const skipsArmour = hit.kinds.has('fall') || hit.kinds.has('drown');
  if (v.armour > 0 && !skipsArmour) {
    let bonus = t.armourBonus;
    if (hit.kinds.has('blast') && multiplayer) bonus *= t.blastArmourMult;
    const passthrough = dmg * t.armourRatio;
    let cost = (dmg - passthrough) * bonus;
    if (cost > v.armour) {
      cost = v.armour;
      const absorbed = cost / bonus;
      dmg = dmg - absorbed;
      v.armour = 0;
    } else {
      v.armour -= cost;
      dmg = passthrough;
    }
    armourSpent = cost;
  }
  const take = Math.trunc(dmg); // players: integer before the shared health step
  const push = knockback(take, t, v);
  v.health -= take;
  const killed = v.health <= 0;
  if (killed) v.alive = false;
  return { healthLoss: take, armourSpent, push, killed, heavy: take >= 20 };
}

// blast: linear falloff to zero at radius, needs line of sight
function blastDamage(base: number, radius: number, distance: number, lineOfSight: boolean): number {
  if (!lineOfSight) return 0;
  const falloff = radius > 0 ? base / radius : 1;
  return Math.max(0, base - distance * falloff);
}

export { Volley, resolve, blastDamage, Defender, Tuning };
export {}
