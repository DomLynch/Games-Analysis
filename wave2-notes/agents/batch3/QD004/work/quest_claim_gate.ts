// Licence: GPL-3.0 (ModernUO). Clean-room sketch of the shape only; not a translation of the donor.
interface Objective {
  needed: number;
  slain: number;
  endTick: number | null; // timed objectives only
  expired: boolean;
  accepts: (type: string) => boolean;
  inArea: (x: number, y: number) => boolean;
}

interface QuestDef {
  id: string;
  restartTicks: number;
  placeRewards: (playerId: string) => boolean; // all-or-nothing: place every reward or none
}

interface Instance {
  def: QuestDef;
  playerId: string;
  objectives: Objective[];
  claimable: boolean;
  failed: boolean;
  removed: boolean;
  nextAvailableTick: number; // restart cooldown, set at the claim gate
}

const done = (o: Objective): boolean => o.slain >= o.needed;

// One kill counts at most once per quest instance; a failed area check falls through to the next objective.
function creditKill(inst: Instance, type: string, x: number, y: number): boolean {
  for (const o of inst.objectives) {
    if (o.expired || !o.accepts(type)) continue;
    if (!o.inArea(x, y)) continue;
    o.slain += 1;
    return true;
  }
  return false;
}

// Phase 1 checks every veto with no effect. Phase 2 runs only after all vetoes passed.
function advanceToClaimable(inst: Instance, nowTick: number, vetoes: Array<() => boolean>): boolean {
  if (inst.removed || inst.claimable || inst.failed) return false;
  if (!inst.objectives.every(done)) return false;
  for (const veto of vetoes) {
    if (!veto()) return false;
  }
  inst.claimable = true;
  inst.nextAvailableTick = nowTick + inst.def.restartTicks;
  return true;
}

// The reward write either places everything or changes nothing; the stage only moves after it succeeds.
function collectReward(inst: Instance): 'ok' | 'reward-refused' | 'not-claimable' {
  if (!inst.claimable || inst.removed) return 'not-claimable';
  if (!inst.def.placeRewards(inst.playerId)) return 'reward-refused';
  inst.removed = true;
  return 'ok';
}

// Expiry check. The donor runs this every 5 s of wall time; here it runs on the server tick.
function slice(inst: Instance, nowTick: number): void {
  if (inst.claimable || inst.removed) return;
  let anyFail = false;
  let anyLeft = false;
  for (const o of inst.objectives) {
    if (o.expired) continue;
    if (o.endTick !== null && o.endTick <= nowTick) {
      o.expired = true;
      anyFail = true;
    } else {
      anyLeft = true;
    }
  }
  if (anyFail || !anyLeft) inst.failed = true;
}

const inst: Instance = {
  def: { id: 'north-gate-wolves', restartTicks: 300, placeRewards: () => true },
  playerId: 'p1',
  objectives: [
    { needed: 2, slain: 0, endTick: null, expired: false, accepts: t => t === 'wolf', inArea: (x, y) => x < 100 && y < 100 }
  ],
  claimable: false,
  failed: false,
  removed: false,
  nextAvailableTick: 0
};
creditKill(inst, 'wolf', 10, 10);
creditKill(inst, 'wolf', 10, 10);
const claimed = advanceToClaimable(inst, 1000, []);
const paid = collectReward(inst);
slice(inst, 1001);
export {};
