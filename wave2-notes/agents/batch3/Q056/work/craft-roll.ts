interface CraftRecipe {
  bankPerCraft: number;                              // donor GenerateItemNeedExp (per recipe)
  costItem: string;
  outputs: { itemId: string; costCount: number }[];  // donor GenerateItems "id,count|id,count"
}

interface RoleCraftState {
  iq: number;
  bank: number;                                      // donor ExpForMakeItem
  stock: Map<string, number>;                        // item id -> count held
}

const BANK_CAP = 9999999;                            // donor GameConst.MAX_EXP

// Once per won battle per role, with the XP that role earned in the battle.
function creditCraftBank(role: RoleCraftState, battleXp: number): void {
  const share = Math.floor((battleXp * 8) / 10);
  role.bank = Math.min(BANK_CAP, Math.max(0, role.bank + share));
}

// One craft attempt for one role. Returns the output id and how many were added, or null.
function tryCraft(
  role: RoleCraftState,
  r: CraftRecipe,
  rand01: () => number,
): { itemId: string; added: number } | null {
  if (r.outputs.length === 0) return null;
  const threshold = (7 - Math.floor(role.iq / 15)) * r.bankPerCraft;
  if (role.bank < threshold) return null;

  const pick = r.outputs[Math.floor(rand01() * r.outputs.length)];
  const held = role.stock.get(r.costItem) ?? 0;
  if (held < pick.costCount) return null;            // sketch change: donor checks candidate count

  const owned = role.stock.get(pick.itemId) ?? 0;
  const added = owned > 0 ? 1 : 1 + Math.floor(rand01() * 3);   // 1..3 on first copy, 1 on repeat
  role.stock.set(pick.itemId, owned + added);

  const left = held - pick.costCount;
  if (left > 0) role.stock.set(r.costItem, left);
  else role.stock.delete(r.costItem);

  role.bank = 0;
  return { itemId: pick.itemId, added };
}
