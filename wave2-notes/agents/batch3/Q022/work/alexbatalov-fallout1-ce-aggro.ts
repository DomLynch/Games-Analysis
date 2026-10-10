// Licence: Sustainable Use License 1.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Unit {
  id: number;
  team: number;
  alive: boolean;
  x: number;
  y: number;
  threat: number;            // donor combatai_rating: melee damage + armour class
  whoHitMe: Unit | null;
  fleeing: boolean;
  hurtFlags: number;         // blind / crippled bits
  hp: number;
}

interface Packet {           // per-AI packet; the donor reads these numbers from data/ai.txt
  maxDist: number;
  minHp: number;
  hurtTooMuch: number;
}

const ATTACKER_CAP = 3;       // donor combatai.cc 550: one shared count across the three attacker slots
const VISIBLE_MULT = 5;       // donor combatai.cc 1586
const HIDDEN_COMBAT_MULT = 2; // donor combatai.cc 1602

const dist = (a: Unit, b: Unit): number => Math.hypot(a.x - b.x, a.y - b.y);

function sortedByDistance(me: Unit, all: Unit[]): Unit[] {
  return all.filter((u) => u !== me).sort((p, q) => dist(me, p) - dist(me, q));
}

// Retaliation: the victim switches to the attacker only when the attacker rates strictly higher (donor 1571).
function maybeRetaliate(victim: Unit, attacker: Unit): void {
  const cur = victim.whoHitMe;
  const curRating = cur !== null && cur.alive ? cur.threat : 0;
  if (attacker.threat > curRating) victim.whoHitMe = attacker;
}

// Perception range: visible = perception x 5; hidden = perception x 2 in combat, else perception (donor 1585-1613).
function perceives(me: Unit, other: Unit, visible: boolean, inCombat: boolean, perception: number): boolean {
  const range = visible ? perception * VISIBLE_MULT : perception * (inCombat ? HIDDEN_COMBAT_MULT : 1);
  return dist(me, other) <= range;
}

// Donor ai_find_attackers (526-589): a2 = living unit hitting me, a3 = enemy hitting an ally,
// a4 = living enemy whose target is an ally. One count of three across all slots.
function findAttackers(me: Unit, sorted: Unit[]): [Unit | null, Unit | null, Unit | null] {
  let a2: Unit | null = null;
  let a3: Unit | null = null;
  let a4: Unit | null = null;
  let found = 0;
  for (let i = 0; found < ATTACKER_CAP && i < sorted.length; i++) {
    const c = sorted[i];
    if (a2 === null && c.alive && c.whoHitMe === me) { a2 = c; found++; }
    if (a3 === null && c.team === me.team) {
      const w = c.whoHitMe;
      if (w !== null && w !== me && w.team !== me.team && w.alive) { a3 = w; found++; }
    }
    if (a4 === null && c.team !== me.team && c.alive) {
      const w = c.whoHitMe;
      if (w !== null && w.team === me.team) { a4 = c; found++; }
    }
  }
  return [a2, a3, a4];
}

// Donor ai_danger_source (592-623): living attacker wins outright; else four slots, nearest first, first one in perception.
export function dangerSource(me: Unit, all: Unit[], perc: (o: Unit) => boolean): Unit | null {
  const hit = me.whoHitMe;
  let slot0: Unit | null = null;
  if (hit !== null && hit !== me) {
    if (hit.alive) return hit;
    if (hit.team !== me.team) {
      slot0 = sortedByDistance(me, all).find((u) => u.alive && u.team === hit.team) ?? null;
    }
  }
  const [a2, a3, a4] = findAttackers(me, sortedByDistance(me, all));
  const slots = [slot0, a2, a3, a4].filter((u): u is Unit => u !== null);
  slots.sort((p, q) => dist(me, p) - dist(me, q));
  for (const s of slots) if (perc(s)) return s;
  return null;
}

export type Act = { kind: "run" } | { kind: "attack"; target: Unit } | { kind: "idle" };

// Donor combat_ai (1191-1240), decision part: flee gate first, then the passed target or the danger source.
export function decide(me: Unit, pk: Packet, passedTarget: Unit | null, all: Unit[], perc: (o: Unit) => boolean): Act {
  if (me.fleeing || (me.hurtFlags & pk.hurtTooMuch) !== 0 || me.hp < pk.minHp) return { kind: "run" };
  const target = passedTarget ?? dangerSource(me, all, perc);
  if (target === null) return { kind: "idle" };
  return { kind: "attack", target };
}

// Donor ai_run_away (400-448): flee only when the player is inside max_dist; otherwise disengage.
export function fleeOrDisengage(distToPlayer: number, pk: Packet): "flee" | "disengage" {
  return distToPlayer < pk.maxDist ? "flee" : "disengage";
}

export {};
