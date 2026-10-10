// Licence: MIT (donor). Clean-room sketch written from the described mechanism.
// clean-room
interface ClipTable {
  count: number;                    // number of clips in the catalogue
  priority(clip: number): number;   // catalogue field; donor default is 5
}

interface ClipSlot {
  clip: number;        // -1 = no clip requested this tick
  delayTicks: number;  // start delay sent with the clip
  needsSend: boolean;  // goes into this tick's output
}

// Accept a clip when the slot is empty or the new clip's priority is equal or higher.
// `locked` is the Player-only protect flag: while set, every request is refused.
function requestClip(slot: ClipSlot, table: ClipTable, clip: number, delayTicks: number, locked: boolean): boolean {
  if (clip >= table.count || locked) return false;
  if (clip === -1 || slot.clip === -1 || table.priority(clip) >= table.priority(slot.clip)) {
    slot.clip = clip;
    slot.delayTicks = delayTicks;
    slot.needsSend = true;
    return true;
  }
  return false;
}

// Run after this tick's output is sent: the slot is empty again at the start of the next tick.
function endOfTick(slot: ClipSlot): void {
  slot.clip = -1;
  slot.delayTicks = -1;
  slot.needsSend = false;
}

export {};
