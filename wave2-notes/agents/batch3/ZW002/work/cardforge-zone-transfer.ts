// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type ZoneName = "arena" | "downed" | "bank" | "bag" | "out" | "none";

export interface Entity {
  id: number;
  zone: ZoneName;      // "none" = ceased to exist
  isToken: boolean;
  hp: number;
  buffs: number;
}

export interface Snapshot { id: number; zone: ZoneName; hp: number; buffs: number; }

export interface Move {
  entity: Entity;      // the object now in the destination zone
  from: ZoneName;
  to: ZoneName;
  lki: Snapshot;       // state the entity had when it left; leave and death triggers read this
  cause: string;
}

// "keep": let the move go on. "prevent": nothing moves. "handled": a replacement moved the entity itself.
export type Replacement = (m: Move) => "keep" | "prevent" | "handled";

export interface World {
  zones: Record<ZoneName, Set<number>>;
  entities: Map<number, Entity>;
  lastState: Map<number, Snapshot>; // refreshed at checkpoints; read when an entity leaves the arena
  replacements: Replacement[];
  events: Move[];
  onChangesZone: (m: Move) => void; // leave/death triggers run after the move, given the LKI
}

const snap = (e: Entity): Snapshot => ({ id: e.id, zone: e.zone, hp: e.hp, buffs: e.buffs });

// the one transfer path: LKI first, replacements, remove, add, event, triggers last
export function moveEntity(w: World, id: number, to: ZoneName, cause: string): Entity | undefined {
  const e = w.entities.get(id);
  if (!e) return undefined;
  const from = e.zone;

  // a token that has left the arena cannot move again (donor rule 111.8, simplified)
  if (e.isToken && from !== "arena" && from !== "none") return e;

  // last-known information: the checkpoint snapshot when leaving the arena, otherwise a copy now
  let lki: Snapshot = snap(e);
  if (from === "arena") {
    const saved = w.lastState.get(id);
    if (saved !== undefined) lki = saved;
  }

  const m: Move = { entity: e, from, to, lki, cause };
  for (const r of w.replacements) {
    if (r(m) !== "keep") return e;
  }

  // remove from the origin zone
  w.zones[from].delete(id);

  // the entity that enters the new zone is a copy; leaving the arena resets buffs
  const copy: Entity = { ...e, zone: to, buffs: to === "arena" ? e.buffs : 0 };
  w.entities.set(id, copy);
  w.zones[to].add(id);

  const done: Move = { entity: copy, from, to, lki, cause };
  w.events.push(done);   // event after the move
  w.onChangesZone(done); // triggers last, with the LKI
  return copy;
}

// tokens that leave the arena are removed; a leave trigger still sees the LKI
export function ceaseToExist(w: World, id: number, cause: string): void {
  const e = w.entities.get(id);
  if (!e) return;
  const origin = e.zone;
  w.zones[origin].delete(id);
  e.zone = "none";
  if (origin === "arena") {
    const lki = w.lastState.get(id) ?? snap(e);
    w.onChangesZone({ entity: e, from: origin, to: "none", lki, cause });
  }
  w.entities.delete(id);
}

export {};
