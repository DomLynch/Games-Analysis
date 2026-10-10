// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemKind = "key" | "invisibility" | "invulnerability" | "suit" | "quad" | "shotgun" | "axe";
type AmmoKind = "shells" | "nails" | "rockets" | "cells";

interface Kit {
  items: Set<ItemKind>;
  health: number;
  armour: number;
  armourKind: number;
  ammo: Record<AmmoKind, number>;
  weapon: number;
}

interface Player { alive: boolean; kit: Kit; }

// Zone data candidates (the donor hard-codes these; see data_fields in the sidecar).
const CARRY_HEALTH_MIN = 50;
const CARRY_HEALTH_MAX = 100;
const CARRY_SHELLS_MIN = 25;
// Engine constants in the donor.
const EXIT_DEFER_S = 0.1;
const EXIT_WAIT_S = 5;

const NOT_CARRIED: ReadonlySet<ItemKind> = new Set<ItemKind>(["key", "invisibility", "invulnerability", "suit", "quad"]);

const DEFAULT_KIT: Kit = {
  items: new Set<ItemKind>(["shotgun", "axe"]),
  health: 100,
  armour: 0,
  armourKind: 0,
  ammo: { shells: 25, nails: 0, rockets: 0, cells: 0 },
  weapon: 1,
};

function cloneKit(k: Kit): Kit {
  return { ...k, items: new Set(k.items), ammo: { ...k.ammo } };
}

// Called once per player when the zone exit is taken. A dead player carries the default kit.
function snapshotForExit(p: Player): Kit {
  if (!p.alive) return cloneKit(DEFAULT_KIT);
  const items = new Set<ItemKind>([...p.kit.items].filter((i) => !NOT_CARRIED.has(i)));
  return {
    items,
    health: Math.min(CARRY_HEALTH_MAX, Math.max(CARRY_HEALTH_MIN, p.kit.health)),
    armour: p.kit.armour,
    armourKind: p.kit.armourKind,
    ammo: { ...p.kit.ammo, shells: Math.max(CARRY_SHELLS_MIN, p.kit.ammo.shells) },
    weapon: p.kit.weapon,
  };
}

// Called when the player arrives in the next zone. No carry means the default kit.
function arrivalKit(carry: Kit | null): Kit {
  return carry ? cloneKit(carry) : cloneKit(DEFAULT_KIT);
}

interface ExitTrigger { armed: boolean; commitAt: number | null; }

// The exit fires once: the first player touch disarms it and schedules the move.
function onExitTouch(t: ExitTrigger, isPlayer: boolean, now: number): ExitTrigger {
  if (!isPlayer || !t.armed) return t;
  return { armed: false, commitAt: now + EXIT_DEFER_S };
}

// Players sit in intermission; they may leave only after the wait has passed.
function leaveAllowed(now: number, intermissionStart: number): boolean {
  return now >= intermissionStart + EXIT_WAIT_S;
}

export {};
