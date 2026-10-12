// Licence: MIT (donor). Clean-room sketch of the shape only: zone outlaw flag, KOS list, guard gate.
type KosKind = "player" | "guild" | "nation";

interface KosEntry {
  kind: KosKind;
  id: number;        // player id, guild id or nation id, by kind
  active: boolean;   // donor checks this only for player entries in the guard gate
}

interface Actor {
  id: number;
  guild: number | null;
  nation: number | null;
}

interface ZoneRules {
  reverseKos: boolean;      // true: guards attack everyone NOT on the list
  kos: KosEntry[];
  outlaws: Set<number>;     // players flagged for hostile acts inside this zone
  memory: Set<number>;      // players the zone saw inside its bounds
}

const ZONE_PULSE_MS = 2000; // donor value; the caller runs zonePulse on this period

function matches(e: KosEntry, t: Actor): boolean {
  if (e.kind === "player") return e.id === t.id;
  if (e.kind === "guild") return t.guild === e.id;
  return t.nation === e.id;
}

// A hostile act inside a zone owned by another nation flags the attacker once.
function markOutlaw(zone: ZoneRules, attacker: Actor, zoneNation: number | null): void {
  if (attacker.nation === null || attacker.nation === zoneNation) return;
  zone.outlaws.add(attacker.id);
}

// Pulse: remember who is inside; anyone remembered but no longer inside loses the flag.
function zonePulse(zone: ZoneRules, insideNow: Set<number>): void {
  for (const id of insideNow) zone.memory.add(id);
  for (const id of [...zone.memory]) {
    if (insideNow.has(id)) continue;
    zone.memory.delete(id);
    zone.outlaws.delete(id);
  }
}

// Guard gate, donor order: same nation never; outlaw yes; otherwise the KOS list decides.
function guardMayAggro(zone: ZoneRules, guardNation: number | null, target: Actor): boolean {
  if (target.nation !== null && target.nation === guardNation) return false;
  if (zone.outlaws.has(target.id)) return true;
  const listed = zone.kos.some((e) => e.active && matches(e, target)); // fix: isActive on every kind
  return zone.reverseKos ? !listed : listed;
}

export {};
