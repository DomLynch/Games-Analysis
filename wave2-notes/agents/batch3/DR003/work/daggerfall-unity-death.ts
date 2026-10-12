// Licence: MIT (donor). Adapted sketch of the mechanism: a staged death beat and a corpse with take-one loot.
// Times are in seconds. The camera height is the local height used by the donor (units).

export interface DeathBeatCfg {
  fallSpeed: number;     // donor 2.5 units per second
  fadeS: number;         // donor FadeDuration 2 s
  returnAfterS: number;  // donor TimeBeforeReset 3 s
}

export interface DeathBeat {
  startedAt: number;
  startY: number;
  targetY: number;       // donor: height - height * 1.25, i.e. -0.25 of the controller height
  camY: number;
  locked: boolean;       // movement and input locked while the beat runs
  returned: boolean;     // true once the game should return to the title
}

export function beginDeath(now: number, camY: number, controllerHeight: number): DeathBeat {
  const targetY = controllerHeight - controllerHeight * 1.25;
  return { startedAt: now, startY: camY, targetY, camY, locked: true, returned: false };
}

// One frame. dt is the frame delta in seconds, so the fall is frame-rate independent.
// Fix: the camera is clamped to targetY. The donor subtracts without a clamp and can pass the target by one step.
export function tickDeath(b: DeathBeat, now: number, dt: number, cfg: DeathBeatCfg): { beat: DeathBeat; fade: number } {
  const camY = Math.max(b.targetY, b.camY - cfg.fallSpeed * dt);
  const fade = Math.min(1, (now - b.startedAt) / cfg.fadeS);
  const returned = b.returned || now - b.startedAt > cfg.returnAfterS;
  return { beat: { ...b, camY, returned }, fade };
}

// Corpse loot. Donor: TransferAll moves every item to the corpse container (take-all).
// Fix (Frankendom take-one): the looter takes one unit of one stack per action; the rest stays on the corpse.
export interface LootItem {
  id: string;
  qty: number;
}

export interface Corpse {
  items: LootItem[];
}

export function takeOne(c: Corpse, index: number): { taken: LootItem | null; corpse: Corpse } {
  const item = c.items[index];
  if (!item) return { taken: null, corpse: c };
  const rest = c.items.slice();
  if (item.qty > 1) rest[index] = { id: item.id, qty: item.qty - 1 };
  else rest.splice(index, 1);
  return { taken: { id: item.id, qty: 1 }, corpse: { items: rest } };
}

export {};
