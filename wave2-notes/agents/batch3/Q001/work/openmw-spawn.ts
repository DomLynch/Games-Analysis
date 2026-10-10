// Licence: GPL v3 (donor LICENSE). Clean-room sketch from the described mechanism, not a translation.
// clean-room
// rng contract: roll0to99() in [0,100); rollDice(n) in [0,n), and 0 when n <= 0 (donor rollDice returns 0 for max <= 0).
interface Rng { roll0to99(): number; rollDice(n: number): number; }

interface LevEntry { id: string; level: number; sub?: LevList; }
interface LevList { chanceNone: number; allLevels: boolean; entries: LevEntry[]; } // zone data: chanceNone 0..99, entries carry levels

// Levelled pick (donor: levelledlist.cpp 18-80). Returns an id, or null for nothing.
export function pickLevelled(list: LevList, playerLevel: number, rng: Rng): string | null {
  if (rng.roll0to99() < list.chanceNone) return null;
  let highest = 0;
  for (const e of list.entries) if (e.level > highest && e.level <= playerLevel) highest = e.level;
  const candidates = list.entries.filter((e) => playerLevel >= e.level && (list.allLevels || e.level === highest));
  if (candidates.length === 0) return null;
  const chosen = candidates[rng.rollDice(candidates.length)];
  if (chosen.sub) return pickLevelled(chosen.sub, playerLevel, rng); // nested list: same level, its own chanceNone
  return chosen.id;
}

// Donor: World::spawnRandomCreature (worldimp.cpp 3610-3611). Count is in [1, iNumberCreatures].
export function spawnCount(iNumberCreatures: number, rng: Rng): number {
  return 1 + rng.rollDice(iNumberCreatures);
}

// Donor: WaitDialog::startWaiting (waitdialog.cpp 204-224). Decided once, when the rest starts. Returns hours until interrupt, or null.
export function restInterruptAt(hoursToWait: number, sleepingOutdoors: boolean, hasSleepList: boolean,
  fSleepRandMod: number, fSleepRestMod: number, rng: Rng): number | null {
  if (!sleepingOutdoors || !hasSleepList) return null;
  const x = rng.rollDice(hoursToWait);
  if (!(x < fSleepRandMod * hoursToWait)) return null;
  const remaining = Math.trunc(fSleepRestMod * hoursToWait);
  if (remaining === 0) return null;
  return hoursToWait - remaining;
}

// Donor: CellStore::respawn time gate (cellstore.cpp 1229-1231). Hours since the last run compared with 24 * 30 * months.
export function cellRespawnDue(nowHours: number, lastRunHours: number, monthsToRespawn: number): boolean {
  return nowHours - lastRunHours > 24 * 30 * monthsToRespawn;
}
export {};
