// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Frame { hold: number; }       // turns left to show the health frame
type EventKind = "damage" | "heal" | "drain";

const HOLD_TICKS = 8;                   // data: donor health_bar_turns = 8 per event
const BLINK_RATE = 1;                   // data: donor gui_blink_rate (cfg value; default 1)
const BAR_WIDTH_PX = 12;                // data: donor bar fill is 12 px at reference scale

// An event that really changed health restarts the hold; it does not add to it.
function onEvent(f: Frame, changed: boolean): Frame {
  return changed ? { hold: HOLD_TICKS } : f;
}

// Every creature update counts the hold down by one, never below zero.
function tick(f: Frame): Frame {
  return f.hold > 0 ? { hold: f.hold - 1 } : f;
}

// The frame flashes while the hold is running and the turn is in the second half of each blink period.
function flashOn(f: Frame, turn: number): boolean {
  return f.hold > 0 && turn % (2 * BLINK_RATE) >= BLINK_RATE;
}

// fix: the donor's integer floor can draw an empty bar for a living creature; a live creature keeps at least 1 px.
function barPx(health: number, maxHealth: number): number {
  const max = Math.max(1, maxHealth);
  const hp = Math.max(0, health);
  if (hp === 0) return 0;
  return Math.max(1, Math.floor((BAR_WIDTH_PX * hp) / max));
}

// fix: the donor flashes every event in the owner's colour; here the flash colour says which way health moved.
function flashColour(kind: EventKind): string {
  if (kind === "damage") return "red";
  if (kind === "heal") return "green";
  return "purple";
}
