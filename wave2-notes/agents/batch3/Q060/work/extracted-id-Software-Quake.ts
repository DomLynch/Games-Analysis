// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Stock { shells: number; nails: number; rockets: number; cells: number; }

interface Player {
  stock: Stock;
  weapon: string | null;
  quadLeft: number;   // seconds of quad left
  ringLeft: number;   // seconds of ring left
}

type DropKind = "quad" | "ring" | "backpack";

interface Drop {
  id: number;
  kind: DropKind;
  expiresAt: number;        // server clock, seconds
  stock: Stock | null;      // backpack only
  weapon: string | null;    // backpack only: the weapon held at death
}

const BACKPACK_LIFETIME_S = 120;                                          // donor: nextthink = time + 120
const CAP: Stock = { shells: 100, nails: 200, rockets: 100, cells: 100 }; // donor: bound_other_ammo

let nextId = 1;

// Death: a buff drop keeps the time it had left; the ammo and the held weapon go into one backpack.
function onDeath(p: Player, now: number, quadDrops: boolean, ringDrops: boolean): Drop[] {
  const out: Drop[] = [];
  if (quadDrops && p.quadLeft > 0) {
    out.push({ id: nextId++, kind: "quad", expiresAt: now + p.quadLeft, stock: null, weapon: null });
  }
  if (ringDrops && p.ringLeft > 0) {
    out.push({ id: nextId++, kind: "ring", expiresAt: now + p.ringLeft, stock: null, weapon: null });
  }
  p.quadLeft = 0;
  p.ringLeft = 0;
  const total = p.stock.shells + p.stock.nails + p.stock.rockets + p.stock.cells;
  if (total > 0) {
    out.push({ id: nextId++, kind: "backpack", expiresAt: now + BACKPACK_LIFETIME_S, stock: { ...p.stock }, weapon: p.weapon });
    p.stock = { shells: 0, nails: 0, rockets: 0, cells: 0 }; // sketch moves the ammo; the donor copies it
  }
  return out;
}

// Pickup: add the backpack's ammo, then clamp each type to its cap (the donor adds, then clamps).
function pickUpBackpack(d: Drop, taker: Player): number[] {
  if (d.kind !== "backpack" || d.stock === null) return [];
  const s = d.stock;
  taker.stock = {
    shells: Math.min(CAP.shells, taker.stock.shells + s.shells),
    nails: Math.min(CAP.nails, taker.stock.nails + s.nails),
    rockets: Math.min(CAP.rockets, taker.stock.rockets + s.rockets),
    cells: Math.min(CAP.cells, taker.stock.cells + s.cells),
  };
  return [s.shells, s.nails, s.rockets, s.cells];
}

// Timer: drops past their expiry are removed.
function expire(drops: Drop[], now: number): Drop[] {
  return drops.filter((d) => d.expiresAt > now);
}

export {};
