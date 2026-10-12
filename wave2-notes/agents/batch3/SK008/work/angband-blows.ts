// Licence: GPL-2.0 or the Angband licence (donor, dual). clean-room sketch from the described mechanism; the table values are the donor's and are tuning data.
// clean-room
// Energy per blow in hundredths of a turn (100 = one blow per turn).
// Rows: strength band 0..11 (11 = clamp). Columns: dexterity band 0..11.
const BLOWS_TABLE: number[][] = [
  [100, 100, 95, 85, 75, 60, 50, 42, 35, 30, 25, 23],
  [100, 95, 85, 75, 60, 50, 42, 35, 30, 25, 23, 21],
  [95, 85, 75, 60, 50, 42, 35, 30, 26, 23, 21, 20],
  [85, 75, 60, 50, 42, 36, 32, 28, 25, 22, 20, 19],
  [75, 60, 50, 42, 36, 33, 28, 25, 23, 21, 19, 18],
  [60, 50, 42, 36, 33, 30, 27, 24, 22, 21, 19, 17],
  [50, 42, 36, 33, 30, 27, 25, 23, 21, 20, 18, 17],
  [42, 36, 33, 30, 28, 26, 24, 22, 20, 19, 18, 17],
  [36, 33, 30, 28, 26, 24, 22, 21, 20, 19, 17, 16],
  [35, 32, 29, 26, 24, 22, 21, 20, 19, 18, 17, 16],
  [34, 30, 27, 25, 23, 22, 21, 20, 19, 18, 17, 16],
  [33, 29, 26, 24, 22, 21, 20, 19, 18, 17, 16, 15],
];

interface BlowInputs {
  strAdj: number;            // strength stat value from the STR table (3..240), before the class multiplier
  dexBand: number;           // dexterity value from the DEX table (0..11)
  weaponTenthLb: number;     // weapon weight in tenths of a pound; 0 when unarmed
  minWeightTenthLb: number;  // class floor on weapon weight
  strMul: number;            // class strength multiplier
  maxAttacks: number;        // class cap on blows per turn
  extraBlows: number;        // whole bonus blows from gear or timed effects
  minBlows100: number;       // floor in hundredths of a blow (100 = one blow)
}

// Returns blows per turn in hundredths. Pure function of the stat sheet and the weapon.
function blowsPerTurn(i: BlowInputs): number {
  const div = Math.max(i.weaponTenthLb, i.minWeightTenthLb);
  const pRow = Math.min(Math.floor((i.strAdj * i.strMul) / div), 11);
  const dCol = Math.min(i.dexBand, 11);
  const energy = BLOWS_TABLE[pRow][dCol];
  const base = Math.min(Math.floor(10000 / energy), 100 * i.maxAttacks);
  return Math.max(base + 100 * i.extraBlows, i.minBlows100);
}

// Worked case from the tables: warrior-like multiplier 5, max 6, weapon 12 (1.2 lb), floor 30; strAdj 120, dexBand 4.
const example: number = blowsPerTurn({
  strAdj: 120, dexBand: 4, weaponTenthLb: 12, minWeightTenthLb: 30,
  strMul: 5, maxAttacks: 6, extraBlows: 0, minBlows100: 100,
});
export {};
