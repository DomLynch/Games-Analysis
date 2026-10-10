// Licence: GNU GPL v3 or later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface DropEntry {
  itemId: number;
  chance: number;      // percent, 0-100 or more; 100 or more bypasses the no-loot gate
  multiplier: number;  // extra copies: each copy after the first rolls its own chance
  levelOk: boolean;    // result of the donor's level filter for this NPC
}

export interface DropGroupRule {
  dropLimit: number;   // 0 means "scan once" when minDrop is also 0
  minDrop: number;     // guaranteed picks before the gate applies
}

// Entry gate at table level: probability in percent; 0 never fires, 100 always fires.
export function entryFires(probability: number, rand: () => number): boolean {
  const roll = probability >= 0 && probability <= 100 ? rand() * 100 : 0;
  return probability !== 0 && (probability === 100 || roll <= probability);
}

// One drop group. Returns the item ids that dropped, in order.
export function rollDropGroup(entries: DropEntry[], rule: DropGroupRule, rand: () => number): number[] {
  const out: number[] = [];

  // Scan-once mode: each entry rolls on its own, once per copy.
  if (rule.dropLimit === 0 && rule.minDrop === 0) {
    for (const e of entries) {
      if (!e.levelOk) continue;
      for (let j = 0; j < e.multiplier; j++) {
        if (rand() * 100 <= e.chance) out.push(e.itemId);
      }
    }
    return out;
  }

  let limit = rule.dropLimit;
  if (entries.length > 100 && limit === 0) limit = 10;
  if (limit < rule.minDrop) limit = rule.minDrop;

  // Weighted pick: total weight, and the chance that the gate lets a pick through.
  const eligible = entries.filter((e) => e.levelOk);
  if (eligible.length === 0) return out;
  let total = 0;
  let noLootProb = 1;
  let bypass = false;
  for (const e of eligible) {
    total += e.chance;
    if (e.chance >= 100) bypass = true;
    else noLootProb *= (100 - e.chance) / 100;
  }

  let drops = 0;
  for (let i = 0; i < limit; i++) {
    // Guaranteed picks first; after that a pick happens only if the gate passes.
    if (drops < rule.minDrop || bypass || rand() >= noLootProb) {
      let roll = rand() * total;
      for (const e of eligible) {
        if (roll < e.chance) {
          out.push(e.itemId);
          drops++;
          const copies = Math.max(1, e.multiplier);
          for (let k = 1; k < copies; k++) {
            if (rand() * 100 <= e.chance) out.push(e.itemId);
          }
          break;
        }
        roll -= e.chance;
      }
    }
  }
  return out;
}

export {}
