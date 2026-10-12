// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pos { x: number; y: number; z: number; }

// A hub is data: an id, a name and a temple position (read from the map file in the donor).
interface Hub { id: number; name: string; temple: Pos; }

class HubRegistry {
  private hubs = new Map<number, Hub>();
  set(h: Hub): void { this.hubs.set(h.id, h); } // a later record with the same id replaces the earlier one
  get(id: number): Hub | undefined { return this.hubs.get(id); }
}

interface Account { hubId: number; loginPos: Pos; }

const isZero = (p: Pos): boolean => p.x === 0 && p.y === 0 && p.z === 0;

// Login: refuse when the hub is missing; a zero stored login position becomes the hub temple.
export function resolveLogin(reg: HubRegistry, acc: Account):
  { ok: true; spawn: Pos; hub: Hub } | { ok: false; reason: string } {
  const hub = reg.get(acc.hubId);
  if (hub === undefined) return { ok: false, reason: "hub missing" };
  if (isZero(acc.loginPos)) acc.loginPos = { ...hub.temple };
  return { ok: true, spawn: { ...acc.loginPos }, hub };
}

// Death: the login position is set to the temple first. With skill loss on, the client re-login
// places the player (not read here); with it off, the respawn is immediate and skill loss is armed.
export function onDeath(acc: Account, hub: Hub, skillLoss: boolean):
  { immediateRespawn: boolean; armSkillLoss: boolean } {
  acc.loginPos = { ...hub.temple };
  return skillLoss
    ? { immediateRespawn: false, armSkillLoss: false }
    : { immediateRespawn: true, armSkillLoss: true };
}

// A floor tile is removed under creatures: players go to the hub temple, other creatures are removed.
export function onFloorRemoved(creatures: { id: number; isPlayer: boolean }[], hub: Hub):
  { teleport: number[]; remove: number[] } {
  const teleport: number[] = [];
  const remove: number[] = [];
  for (const c of creatures) {
    if (c.isPlayer) teleport.push(c.id);
    else remove.push(c.id);
  }
  return { teleport, remove };
}

export {};
