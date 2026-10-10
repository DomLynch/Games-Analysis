// Licence: public domain (donor LICENSE). clean-room sketch written from the described mechanism, not a translation.
type Band = 'low' | 'mid' | 'high';

// Committed share of one pool decides the band: below 1/3, below 2/3, otherwise.
function firstStrikeBand(committed: number, ownPool: number): Band {
  if (committed < ownPool / 3) return 'low';
  if (committed < (2 * ownPool) / 3) return 'mid';
  return 'high';
}

// Second strike: one cut at half of the enemy pool.
function secondStrikeRepulsed(committed: number, enemyPool: number): boolean {
  return committed < enemyPool / 2;
}

type Ending = 'win' | 'loss' | 'treaty';

// Final test: win above 3/2 of the enemy total (or a crash flag), loss below 2/3, otherwise treaty.
function ending(myTotal: number, enemyTotal: number, crashWin: boolean): Ending {
  if (crashWin || myTotal > Math.floor((3 / 2) * enemyTotal)) return 'win';
  if (myTotal < Math.floor((2 / 3) * enemyTotal)) return 'loss';
  return 'treaty';
}

// Army branch of the first strike. Low: lose the men sent. Mid: lose a third of them and zero the enemy army.
// High: own army cut to a third. Other pools are not touched here.
function armyFirstStrike(mine: number, theirs: number, committed: number): { mine: number; theirs: number; band: Band } {
  const band = firstStrikeBand(committed, mine);
  if (band === 'low') return { mine: mine - committed, theirs, band };
  if (band === 'mid') return { mine: Math.floor(mine - committed / 3), theirs: 0, band };
  return { mine: Math.floor(mine / 3), theirs, band };
}


export {};
