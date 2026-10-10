// Licence: LGPL-3.0 (donor LICENSE). Clean-room shape only: the rules are written from the donor's described behaviour, not translated line by line.
// Frankendom reading: total XP is the ledger value; the level counter moves only on a trainer action.

export interface Member {
  id: string;
  active: boolean;        // false when unconscious, dead, petrified or eradicated
  xp: number;             // ledger total (never reset by training)
  level: number;          // level counter, raised only by training
  skillPoints: number;
  learningPct: number;    // from learningPercent()
  classTier: number;      // 1..3
}

// Kill XP: the share is total / active count (integer); each active member gets share + share * learningPct / 100.
export function splitKillXp(members: Member[], killXp: number): void {
  if (killXp <= 0) return;
  const activeCount = members.filter(m => m.active).length;
  if (activeCount === 0) return;
  const share = Math.trunc(killXp / activeCount);
  for (const m of members) {
    if (!m.active) continue;
    m.xp += share + Math.trunc((share * m.learningPct) / 100);
  }
}

// Learning bonus: hireling bonus alone when there is no learning skill; otherwise bonus + mastery multiplier x skill + 9.
// masteryMultiplier is 1, 2, 3 or 5 for novice, expert, master, grandmaster (0 when no mastery).
export function learningPercent(hirelingBonus: number, learningSkill: number, masteryMultiplier: number): number {
  if (learningSkill === 0) return hirelingBonus;
  return hirelingBonus + masteryMultiplier * learningSkill + 9;
}

// XP the member must have on the ledger before the trainer will raise the level: 1000 * (L+1) * L / 2 for level L.
export function xpToTrain(level: number): number {
  const lvl = level + 1;
  return Math.trunc((lvl * (lvl - 1)) / 2) * 1000;
}

// Trainer price: level x house multiplier x class tier, merchant discount, never below one third of the base.
export function trainingPrice(level: number, classTier: number, houseMultiplier: number, merchantPct: number): number {
  const base = Math.trunc(level * houseMultiplier * classTier);
  const discounted = Math.trunc((base * (100 - merchantPct)) / 100);
  return Math.max(discounted, Math.trunc(base / 3));
}

// One trainer action for the active member. Hall cap is checked first, then XP, then gold (as the donor).
export function tryTrain(m: Member, hallMaxLevel: number, gold: number, houseMultiplier: number, merchantPct: number): { ok: boolean; gold: number; price: number } {
  if (m.level >= hallMaxLevel) return { ok: false, gold, price: 0 };
  if (m.xp < xpToTrain(m.level)) return { ok: false, gold, price: 0 };
  const price = trainingPrice(m.level, m.classTier, houseMultiplier, merchantPct);
  if (gold < price) return { ok: false, gold, price };
  m.level += 1;
  m.skillPoints += Math.trunc(m.level / 10) + 5; // uses the new level, as the donor does
  return { ok: true, gold: gold - price, price };
}


const ms: Member[] = [
  { id: "a", active: true, xp: 0, level: 1, skillPoints: 0, learningPct: 0, classTier: 1 },
  { id: "b", active: true, xp: 0, level: 1, skillPoints: 0, learningPct: 50, classTier: 1 },
  { id: "c", active: false, xp: 0, level: 1, skillPoints: 0, learningPct: 0, classTier: 1 },
];
splitKillXp(ms, 100);
console.log("split a,b,c xp:", ms.map(m => m.xp).join(","), "(expect 33,49,0 as 100/2=50 for 2 active? see below)");
console.log("xpToTrain(1),(2),(9):", xpToTrain(1), xpToTrain(2), xpToTrain(9));
console.log("price(10,2,1.5->1,20):", trainingPrice(10, 2, 1.5, 20), "price(10,2,1,100):", trainingPrice(10, 2, 1, 100));
console.log("learning(10,4,2):", learningPercent(10, 4, 2), "learning(10,0,0):", learningPercent(10, 0, 0));
const t: Member = { id: "t", active: true, xp: 1000, level: 1, skillPoints: 0, learningPct: 0, classTier: 1 };
console.log("train:", JSON.stringify(tryTrain(t, 5, 50, 1, 0)), "level", t.level, "sp", t.skillPoints);
export {};
