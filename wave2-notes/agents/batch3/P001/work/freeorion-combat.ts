// Licence: GPL-2.0 (donor, default/COPYING line 9). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rand = () => number;

interface Unit {
  id: number;
  side: number;
  structure: number;
  shield: number;     // flat reduction per shot (donor: the shield meter's current value)
  armed: boolean;
  shots: number[];    // power of each shot this bout; one entry per shot, each with its own target roll
  isStatic: boolean;  // static emplacements act first (donor: planets)
}

interface Attack { attacker: number; target: number; power: number; shield: number; damage: number; }
interface Bout { attacks: Attack[]; culled: number[]; }

function shuffle<T>(xs: T[], rand: Rand): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// One bout. The attacker list is a snapshot taken at bout start, shuffled, static units first.
// Damage lands at once, so later shots in the bout see the lower structure.
// The target pool excludes units culled at an earlier bout only; a unit killed earlier in
// this bout can still be shot and can still fire until the bout-end cull.
function runBout(units: Map<number, Unit>, culledBefore: Set<number>, rand: Rand): Bout {
  const bout: Bout = { attacks: [], culled: [] };
  const live = [...units.values()].filter(u => !culledBefore.has(u.id));
  const shuffled = shuffle(live, rand);
  const order = [...shuffled.filter(u => u.isStatic), ...shuffled.filter(u => !u.isStatic)];

  for (const attacker of order) {
    if (!attacker.armed) continue;
    for (const power of attacker.shots) {
      const pool = live.filter(t => t.side !== attacker.side && !culledBefore.has(t.id));
      if (pool.length === 0) break;
      const target = pool[Math.floor(rand() * pool.length)];
      const damage = Math.max(0, power - target.shield);
      if (damage > 0) target.structure -= damage;
      bout.attacks.push({ attacker: attacker.id, target: target.id, power, shield: target.shield, damage });
    }
  }

  for (const u of live) if (u.structure <= 0) bout.culled.push(u.id);
  return bout;
}

// Whole combat: up to `rounds` bouts (donor default 4), stopping early when no side can hit the other.
function resolve(units: Map<number, Unit>, rounds: number, rand: Rand): Bout[] {
  const culled = new Set<number>();
  const log: Bout[] = [];
  for (let b = 1; b <= rounds; b++) {
    const live = [...units.values()].filter(u => !culled.has(u.id));
    const canHit = live.some(a => a.armed && a.shots.length > 0 && live.some(t => t.side !== a.side));
    if (!canHit) break;
    const bout = runBout(units, culled, rand);
    for (const id of bout.culled) culled.add(id);
    log.push(bout);
  }
  return log;
}

export {};
