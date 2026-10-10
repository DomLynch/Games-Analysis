// Licence: donor is GPL-2 or "Angband licence" (dual). clean-room sketch of the pattern, not a translation of the donor lines.
type CheatSwitch = 'live' | 'room' | 'xtra' | 'hear';
type Taint = 'wizard' | 'debug' | 'borg';
type EndKind = 'death' | 'retire' | 'interrupt';

interface RunLedger {
  cheats: Set<CheatSwitch>;   // cheat switches the player has on right now
  shadows: Set<CheatSwitch>;  // sticky twin of each switch: set when a switch is turned on, cleared only at birth
  taints: Set<Taint>;         // sticky marks, each set by a one-time confirmation
  totalWinner: boolean;
}

function newRun(): RunLedger {
  return { cheats: new Set(), shadows: new Set(), taints: new Set(), totalWinner: false };
}

// One setter for every route (menu, key, load). Turning a switch on also sets its shadow in the same write.
// Turning it off clears only the switch, never the shadow.
function setCheat(run: RunLedger, sw: CheatSwitch, on: boolean): void {
  if (on) {
    run.cheats.add(sw);
    run.shadows.add(sw);
  } else {
    run.cheats.delete(sw);
  }
}

// A one-time confirmation marks the run. Declining marks nothing.
function confirmTaint(run: RunLedger, taint: Taint, confirmed: boolean): boolean {
  if (!confirmed) return false;
  run.taints.add(taint);
  return true;
}

// Gate at record time only. Play is never blocked by this function.
// Order of checks follows the donor: any shadow, then wizard/debug, then borg, then interrupt/retire.
function mayRecordScore(run: RunLedger, end: EndKind): { recorded: boolean; reason: string } {
  if (run.shadows.size > 0) return { recorded: false, reason: 'cheaters are not scored' };
  if (run.taints.has('wizard') || run.taints.has('debug')) return { recorded: false, reason: 'wizards are not scored' };
  if (run.taints.has('borg')) return { recorded: false, reason: 'bots are not scored' };
  if (!run.totalWinner && end === 'interrupt') return { recorded: false, reason: 'interrupted' };
  if (!run.totalWinner && end === 'retire') return { recorded: false, reason: 'retired' };
  return { recorded: true, reason: 'recorded' };
}

export {};
