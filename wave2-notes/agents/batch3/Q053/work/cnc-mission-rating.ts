// Licence: GPL-3.0 with Electronic Arts additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface MissionLedger {
  ownedNow: number;        // player's objects still owned at the end ("leadership" count)
  lost: number;            // player's units plus buildings lost
  harvested: number;       // credits harvested by the player
  initialCredits: number;  // starting credits
  creditsLeft: number;     // credits held at the end
  missionIndex: number;    // scenario number, used as the multiplier base (data)
}

// 8.8 fixed-point helpers, same arithmetic as the donor's active routines.
const ratioFixed = (base: number, card: number): number => (base ? Math.floor((card * 256) / base) : 0xffff);
const fixedToCard = (base: number, fixed: number): number => {
  const v = base * fixed + 0x80;
  return v >= 0x1000000 ? 0xffff : v >>> 8;
};

export function missionScore(l: MissionLedger): number {
  // Survival share: owned / (owned + lost), as a 0-100 value. The zero guard is on the count.
  const owned = Math.max(1, l.ownedNow);
  const leadership = Math.min(fixedToCard(100, ratioFixed(owned + l.lost, owned)), 100);

  // Retention share: (credits left + 1) / (harvested + initial + 1), as a 0-100 value.
  let g = ratioFixed(l.harvested + l.initialCredits + 1, l.creditsLeft + 1);
  if (g === 0) g = 1;
  const efficiency = Math.min(fixedToCard(100, g), 100);

  // Weighted sum over a base of 46 (4600 / 100), floor of 1, then the mission multiplier.
  let total = Math.floor((leadership * 40 + 4600 + efficiency * 14) / 100);
  if (total === 0) total += 1;
  return total * (l.missionIndex + 1);
}

export interface Entry { name: string; score: number; level: number; }

// Keeps a descending table of fixed length. Only a total above the last place is recorded.
// (The donor's guard at SCORE.CPP 901-902 is inverted as read; this sketch uses the intent.)
export function recordScore(table: Entry[], total: number, level: number, name: string): Entry[] {
  const last = table.length - 1;
  if (!(total > table[last].score)) return table;
  let index = table.findIndex(e => total > e.score);
  if (index < 0) index = last;
  table.splice(index, 0, { name, score: total, level });
  table.pop();
  return table;
}

export {};
