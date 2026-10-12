// Licence: GNU GPL version 3 (donor, copyleft). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Vital { hp: number; max: number; armed: boolean; canBeArmed: boolean; }

type Outcome = "alive" | "downed" | "dead";

// A lethal hit: while protection is armed the hero is Downed at 1 HP, not dead.
// Once protection is spent (or never existed), the next lethal hit kills.
function onLethal(v: Vital): Outcome {
  if (v.hp > 0) return "alive";
  if (v.armed) {
    v.armed = false;
    v.hp = 1;
    return "downed";
  }
  return "dead";
}

const HELP_RANGE = 5.0;        // world units, squared-distance check
const HELP_WINDUP_S = 0.5;     // donor durations tuple, first field
const HELP_ACTION_S = 4.0;     // donor durations tuple, second field
const HELP_RECOVERY_S = 0.5;   // donor durations tuple, third field
const HELPER_MOVE_FACTOR = 0.1;

// Only a downed hero (protection spent, body can have it) can be helped, and only in range.
function canHelp(target: Vital, distance: number): boolean {
  return distance <= HELP_RANGE && target.canBeArmed && !target.armed;
}

// Assumes the help event fires after the action phase (the donor stage check was not read).
// The helped hero is re-armed at 1 HP; nothing caps how often this repeats.
function completeHelp(target: Vital): void {
  if (target.canBeArmed) target.armed = true;
}

// Respawn at a waypoint: full HP and protection re-armed for bodies that can have it.
function respawn(v: Vital): void {
  v.hp = v.max;
  v.armed = v.canBeArmed;
}

interface Item { id: string; durabilityLost: number; maxDurability: number; }
interface Tracked { t: number; count: number; }

const UNEQUIP_WINDOW_S = 60;

// On death (not a safe area): every equipped item takes one step; a bag item takes a step
// only while its definition is tracked as recently unequipped with count > 0.
function durabilityOnDeath(
  equipped: Item[],
  bag: Item[],
  recent: Map<string, Tracked>,
  now: number,
  protectedArea: boolean,
): void {
  if (protectedArea) return;
  for (const it of equipped) {
    if (it.durabilityLost < it.maxDurability) it.durabilityLost += 1;
  }
  for (const [id, e] of recent) {
    if (!(now - e.t < UNEQUIP_WINDOW_S && e.count > 0)) recent.delete(id);
  }
  for (const it of bag) {
    const e = recent.get(it.id);
    if (e && e.count > 0 && it.durabilityLost < it.maxDurability) {
      e.count -= 1;
      it.durabilityLost += 1;
    }
  }
}

export {};
