# jynew-jynew (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/RoleInstance.cs` | Licence: restricted, as read: `/mnt/frankendom-donors/jynew-jynew/LICENSE` line 8 says the use of any resources or code of the project "is not permitted unless authorized"; `COMMUNITY_LICENSE_FOR_JYX2/README.md` line 6 says its protected folders override the project MIT. Clean-room, shape only. | C# (Unity) | symbol `LianZhiItem` (called from `BattleManager.CalExpGot`)

Checked: opened `LianZhiItem` (RoleInstance.cs 671-716), the win branch and `CalExpGot` (BattleManager.cs 159-166 and 286-380), the random helpers (Tools.cs 27-54 and 108-111), and `AddItem` (GameRuntimeData.cs 544-573). Only one caller of `LianZhiItem` exists in Assets (BattleManager.cs 376). The list hint (INFERRED) pointed nowhere useful. I searched for enemy drop tables (grep for Loot, DropItem, DropRate, drop, loot and reward over Assets C# excluding 3rd-party, Plugins, XLua and TileWorld; over Scripts; over Mods/JYX2 Lua and Configs). There is no kill-drop table. Enemy kills give XP only. Items come from hand-written `AddItem` calls in the Lua event scripts (491 matching lines in Mods/JYX2/Lua, grep count). The only random item roll found is this craft roll, so this STRONG verdict is for a craft-from-study roll, not for kill drops. Confidence: high on the craft roll. Not read: the per-action XP feed in `AIResult.cs` (grep only), the `GetXiulianItem` body, the IQ range, the reset at BattleLoader.cs 293 (grep only). camera_scope: not applicable.

Best transferable idea: a fight's XP fills a per-role bank, and a post-fight roll spends the bank on one uniform recipe pick whose quantity depends on whether the role already owns it (1-3 on first copy, 1 on repeat), with a short cost rejected instead of wiping the stock.
Decision (proposed): adapt — the bank-then-roll shape fits Frankendom's loot roll (row 18) if we want a craft or study loop, but the roll must run on the server with logged inputs and must reject a short cost rather than delete the stack, which is the donor's behaviour.
Acceptance: a server test shows that after a won fight a role whose bank reaches the threshold gets one output (1-3 on first copy, 1 on repeat), the cost is deducted by the output's cost, and a craft that would take stock below zero is rejected with the ledger unchanged.

## 1. Mechanism

- Trigger: only on a won battle. `OnBattleEnd` takes the `Win` branch (164) and calls `CalExpGot` (166). A lost battle never reaches the craft code.
- Step 1, XP share: each living teammate gets `battleData.Exp / alive_teammate.Count` added to `ExpGot` (295-296). The message and level-up loop then run over alive plus dead team-0 roles (289-290).
- Step 2, study bank: a role with an equipped practise item (`GetXiulianItem`, 338-339) adds 8/10 of its `ExpGot` to `ExpForItem` and to `ExpForMakeItem` (342-343), both clamped to `MAX_EXP` (345-346). The bank is credited before the craft check, so one win can craft at once.
- Step 3, craft check (`LianZhiItem`, called at 376 once per role per win): returns early when there is no practise item, no `GenerateItems` list, the cost item is -1, or the save's runtime data does not hold the cost item (673-680). The recipe list is parsed from `"id,count|id,count"` (681-691).
- Gates (693-695): threshold = `(7 - IQ / 15) * GenerateItemNeedExp`, integer division; the bank must reach it, and the cost stock must be at least the number of candidate outputs (`GenerateItemNeedCount >= GenerateItemList.Count`), which is a candidate count, not the cost of the pick.
- Roll (698): one uniform candidate is chosen (inclusive helper, Tools.cs 48-54 and 108-111).
- Count (701-707): if the role already holds that item, add exactly 1; otherwise add `1 + Random.Range(0, 3)`, that is 1, 2 or 3.
- Cost (710): the cost item is reduced by the picked candidate's count. `AddItem` (550-573) removes the stack when it reaches 0, and when it goes below 0 it logs an error and removes the stack (564-571). So a craft short of the picked cost deletes the whole cost stack.
- Reset (711): bank goes to 0. The method then returns a text line.

## 2. Key functions

- `CalExpGot`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameBattle/BattleManager.cs` 286-380 (XP share, level-up, bank credit at 342-346, craft call at 376). Read in full.
- `LianZhiItem`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/RoleInstance.cs` 671-716 (guards, parse, gate at 693-695, pick 698, count 701-707, cost 710, reset 711). Read in full.
- `GetRandomInt` / `GetRandomElementInList` / `GetRandom`: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/Utils/Tools/Tools.cs` 27, 35-46, 48-54, 108-111. The generator is `System.Random` (27), used here on the client side.
- `AddItem` (string): `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/GameRuntimeData.cs` 550-573 (negative branch at 567-571).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Accumulate a fraction of each fight's XP into a bank | 8/10 of `ExpGot` (theirs, BattleManager.cs 343) |
| Bank capped at a large limit | `MAX_EXP` = 9999999 (theirs, GameConst.cs 85) |
| Threshold scales with a stat, here a divisor of 15 and a base of 7 | `(7 - IQ / 15)` (theirs, RoleInstance.cs 693). Factor is x7 for IQ 0-14, x6 for 15-29, and so on down to x1 for 90-104. Factor is 0 for IQ 105-119 and negative from IQ 120 (arithmetic from the code; IQ range not read). |
| Uniform pick from a candidate list, then cost by the picked count | `GetRandomElement` (theirs, RoleInstance.cs 698) |
| First copy yields 1-3, repeat yields 1 (ownership-scaled quantity) | `1 + Random.Range(0, 3)` (theirs, RoleInstance.cs 707); `1` on repeat (703). `Random.Range(int, int)` is max-exclusive in Unity, which gives 0-2 (Unity API behaviour, not read in the donor). |
| Stock below zero is removed | Donor behaviour (GameRuntimeData.cs 567-571). The sketch does not copy it. |

## 4. TypeScript sketch

simplified: follows the donor order (bank threshold, uniform pick, ownership-scaled count, cost removal, bank reset). Two deliberate changes. (1) The stock check uses the picked cost (`held < pick.costCount` returns null), where the donor checks the candidate count and can wipe the stack (RoleInstance.cs 695 and GameRuntimeData.cs 567-571). (2) The pick is made before the stock check, so a refused craft still consumes one random value. The sketch omits the item-table lookups and names, the "cost item not owned" pre-check (covered by `held`), the battle caller and per-role loop, the chat text, the XP feed from per-action `ExpGot` (AIResult.cs, not read), the wugong practise loop, and any IQ clamp (IQ range not read).

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/craft-roll-check.ts` (sketch plus `export {};`): exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, post-fight roll). Parity-checklist row 18 (loot roll and XP award). The bank credit is the XP award half of the same row.
- Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
- Brief rule served: one ledger (the roll and the cost are written once, server-side); licence rule 7 (restricted, clean-room)

## 6. Gaps and risks

- The roll runs on the client in the donor (`System.Random` in Tools.cs 27). Frankendom needs the roll on the server, with its inputs logged, so the result is verified.
- The donor's cost check compares the cost stock to the number of candidates (695) and then wipes the stock on a short cost (GameRuntimeData.cs 567-571). One ledger means a short cost is a rejected craft, not a silent deletion. The sketch does this.
- Only one craft per role per won battle (one call at 376). Frankendom has to decide whether a large bank may chain crafts, and it should write that as a rule, not leave it to the call count.
- The bank is fed from `ExpGot`, which takes the per-battle share (295-296) and also per-action XP (AIResult.cs 166-234, grep only, not read in full). Frankendom must decide which XP events feed the bank.
- The threshold factor goes to zero and then negative as IQ grows (IQ/15 of 7 or more). Frankendom needs a clamp on any stat-scaled threshold.
- Frankendom may not have an IQ-like stat. Adding one is a new data field, not a copy of the donor's constant.
- Clean-room only: restricted licence. The sketch is written from the described mechanism and is not a translation of the C# lines.
- The kill-drop gap stays open. The donor has no drop table for kills; Frankendom's loot-drops need a different source (recipe or table) and this note does not supply one.

Reuse tag: rewrite-from-idea (restricted licence; clean-room only)
Brief rule served: one ledger (roll and cost written once, server-side); licence rule 7
