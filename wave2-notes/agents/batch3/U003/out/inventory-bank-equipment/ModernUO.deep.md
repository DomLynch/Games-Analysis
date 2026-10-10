# ModernUO (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` (with `Server/Items/Item.cs`, `Server/Mobiles/Mobile.cs`, `Server/Items/Containers.cs`, `UOContent/Misc/StaminaSystem.cs`, `UOContent/Mobiles/Townfolk/Banker.cs`) | Licence: GPL-3.0 (`/mnt/frankendom-donors/ModernUO/LICENSE`: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007") | C# | symbol `Container.CheckHold` (with `Container.TryDropItem`, `Item.UpdateTotal`, `StaminaSystem.GetStamLoss`)

Checked: Read in full or in the relevant span: `Server/Items/Container.cs` 139-152 (MaxWeight, MaxItems defaults), 177-179 (global caps), 224-290 (CheckHold; the body is 230-281, 224 and 227 are thin overloads), 321-364 (own totals and override of UpdateTotal), 372-393 (UpdateTotals), 394-445 (OnStackAttempt, TryDropItem); `Server/Items/Item.cs` 2251 (CanEquip), 3333-3370 (UpdateTotal climb), 3440-3456 (AddItem totals), 3556-3570 (RemoveItem totals); `Server/Mobiles/Mobile.cs` 1044, 1703 (BodyWeight), 3993-4030 (carry totals), 7677-7690 (CheckEquip), 7800-7820 (EquipItem); `Server/Items/Containers.cs` 8-30 (BankBox), 60-112 (BankBox CheckHold and GetTotal); `UOContent/Misc/StaminaSystem.cs` 40-50 (config defaults), 286-350 (movement stamina), 410-445 (step loss, IsOverloaded); `UOContent/Mobiles/PlayerMobile.cs` 232 (MaxWeight), 1620-1640 (overload message); `UOContent/Mobiles/Townfolk/Banker.cs` 31-40 and 67-110 (balance); `UOContent/Items/Armor/BaseArmor.cs` 1050-1075 (CanEquip, partial). Not read: `Item.StackWith` (the stacking rule itself), `CheckConflictingLayer` (which layers conflict), the `OnEquip` hooks, `AccountGold` class, Banker gold/cheque removal, BankBox Open/Close beyond the lines above, the `Mobile.AddItem` path beyond the totals line at 6726, and the rest of `Container.cs` after 445. Caller check: I read the movement caller (`EventSink_Movement`, 293-313) and the overload message caller (`PlayerMobile.OnSubItemAdded`, 1624-1634); I did not read the other `CheckHold` overrides. Confidence: high on the weight and item totals, the hold check and the step-loss formula; medium on equipment (single-slot gate and the EquipItem order only); not read the stacking detail. Camera: not applicable.

Best transferable idea: keep one cached total per container, adjusted by deltas on add and remove and climbed up the parent chain, so a single hold check against each enclosing container's item and weight caps decides whether an item fits, with a virtual container (bank) hiding its contents from the carrier's totals.
Decision (proposed): adapt - the one-ledger shape (incremental totals, one hold check up the chain, stack before new slot) fits Frankendom's one ledger, but a carry-weight drag is an RPG/MMO choice, so the weight cap and the step drain become zone data defaulting to off until Dom asks for them.
Acceptance: a server test fills a backpack to its item or stone cap, asserts the next add is refused with the reason "full-items" or "full-weight" and the ledger totals do not change, and asserts a carrier 10 stones over the allowance loses 5 stamina per walking step and 10 when running.

## 1. Mechanism

- Cached totals, not recounts. Every container keeps `_totalGold`, `_totalItems` and `_totalWeight` (`Container.cs` 321-330). On AddItem the parent gets the child's gold, item count (plus one) and weight (total plus pile weight) as deltas (`Item.cs` 3450-3454). On RemoveItem the same deltas are subtracted (3564-3568). A changed item weight (545), item ID (641) or amount (757, the `Amount` setter) sends a delta for the change only. The delta climbs one step at a time: `Item.UpdateTotal` forwards to the parent item, or to the mobile, or to the held-by item (3335-3350), skipping virtual items (3337). `Container.UpdateTotal` updates its own cache for non-virtual senders (334-348) and then calls the base to climb (360).
- The carrier. A mobile keeps `m_TotalWeight` the same way (`Mobile.cs` 4002-4030): a virtual sender is ignored (4004), a weight delta changes the total (4026) and then calls `OnWeightChange` (4028). `UpdateTotals` is a full recount (4034-4070); I did not check its callers, so I do not know how often it runs.
- Hold check, the one place a capacity decision is made. `Container.CheckHold` (230-281; 224 and 227 are thin overloads) first refuses a decoration container (`IsDecoContainer`, 234-242), then checks the item count against `MaxItems` (checked only when `checkItems` is true, 244-250) and the weight against `MaxWeight` (257-263), then recurses into the enclosing container (270-274). So an item is refused if any enclosing container is full, not only the one it is dropped into. Game masters skip the checks (232). The count added is the dropped item's `TotalItems` plus one (247) and the weight is its `TotalWeight` plus `PileWeight` (257), so dropping a full container counts everything inside it.
- Drop order, `Container.TryDropItem` (426-445). First it tries to stack onto an existing non-container item (434-435): a weight-only hold check (`checkItems` false), then `StackWith`. Otherwise it runs the full hold check with the item count and drops the item into a new slot (441-443). Containers are never stacked into.
- Caps. Global defaults are 125 items (`Container.cs` 177) and 400 stones (179). A nested container whose parent has a zero cap inherits zero (141). The bank box has no weight cap (`Containers.cs` 23) and is a virtual item (25), so its contents never reach the carrier's totals (3337, 4004, 3564). Its gold total comes from the account when account gold is enabled (105-110).
- Carry limit for players. `PlayerMobile.MaxWeight` is `(Core.ML && Race == Race.Human ? 100 : 40) + (int)(3.5 * Str)` (`PlayerMobile.cs` 232). The base body weight is 11 stones (`Mobile.cs` 1703). A message shows the current and maximum weight when an item lands in the backpack (`PlayerMobile.cs` 1624-1634).
- Overweight drain, `StaminaSystem` (293-313 and 410-445). Overweight is body weight plus carried weight minus (carry limit plus a 4-stone allowance). Each walking step loses `5 + overweight / 25` stamina (config defaults 47-49, the formula at 418). Mounted divides by 3 (422) and running doubles (427); but the divide-by-3 sits in `GetStamLoss`, and with `EnableMountStamina` on (default true, line 51) a mounted player is sent to `ProcessMountMovement` (305-307) instead, so the mounted branch of this formula is mostly unused in the default config. If stamina is at or below zero after that loss, the step is blocked with message 500109 (337-343). `IsOverloaded` (433-440) is the same test used for display.
- Equip order, `Mobile.EquipItem` (7800-7817). The item's own `CanEquip` is tested first (its layer must be valid and empty, `Item.cs` 2251). Then `CheckEquip` checks conflicting layers against every worn item (7677-7689, 7681). Then the mobile and item `OnEquip` hooks and the caster hook run, and finally `AddItem`. `BaseArmor.CanEquip` (1055-1075) adds race, ethic and gender checks for players below GM.
- Bank balance, `Banker.GetBalance` (67-110). The balance starts from account gold when enabled (75), then adds gold in the bank box (91) and cheques, and is clamped to the int range (109).
- Tick: none. All updates are event-driven (add, remove, weight change, movement). The movement check runs once per step.

## 2. Key functions

- `Container.CheckHold`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 230-281 (item cap 244-250, weight cap 257-263, recursion 270-274).
- `Container.TryDropItem`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 426-445 (stack step 434-435, new slot 441-443).
- `Container.UpdateTotal` and `Item.UpdateTotal`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Container.cs` 332-361 and `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Item.cs` 3335-3350.
- Add and remove totals: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Item.cs` 3450-3454 (add), 3564-3568 (remove).
- `Mobile.UpdateTotal`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 4002-4030.
- `Mobile.EquipItem` and `CheckEquip`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 7677-7689 and 7800-7817.
- `StaminaSystem.EventSink_Movement` and `ProcessPlayerMovement`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/StaminaSystem.cs` 293-350.
- `StaminaSystem.GetStamLoss`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/StaminaSystem.cs` 410-430. `IsOverloaded` 433-440.
- `Banker.GetBalance`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/Townfolk/Banker.cs` 67-110.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cached totals adjusted by add/remove deltas and climbed up the chain | None (mechanism) |
| One hold check that recurses up every enclosing container | Item cap 125 and weight cap 400 stones as defaults (`Container.cs` 177, 179); a zero cap means no limit (257) |
| Stack first, then new slot | None (mechanism, `Container.cs` 434-443) |
| Virtual container hides contents from the carrier | Bank box has no weight cap (`Containers.cs` 23) and is virtual (25) |
| Carry limit from strength | `40 + 3.5 x Str`, or `100 + 3.5 x Str` for ML humans (`PlayerMobile.cs` 232); body weight 11 (`Mobile.cs` 1703) |
| Overweight step drain | Allowance 4 stones (`StaminaSystem.cs` 48); drain divisor 25 stones (47); base loss 5 stamina (49); mounted divide by 3 (422); running double (427) |
| Blocked when fatigued by weight | Message 500109 (`StaminaSystem.cs` 337-343), no number |

Two numbers worth noting. At strength 100 (non-ML) the carry limit is 390 stones, so the overweight test starts once body weight (11) plus carried weight passes 394, that is carried weight above 383. The backpack's own 400-stone cap is a separate limit and both apply. The drain formula uses integer division, so a 24-stone overweight adds nothing beyond the base loss.

## 4. TypeScript sketch

simplified: the sketch merges the donor's two steps (own cache, then climb) into one `propagate` call, and skips the donor's virtual-child early return at AddItem (virtual children never reach the climb in the donor). A dropped container counts its contents (`totalItems + 1`, `totalWeight + ownWeight`) as in the donor (247, 257). The bank box still has the global 125-item cap even though its weight cap is 0; the sketch takes both caps as parameters. It keeps the two order rules that matter: stack before new slot, and the hold check that recurses up every enclosing container with the item-count check only on the new-slot path. It omits: GameMaster bypass, `StackWith` detail (not read), the `IsDecoContainer` branch, `UpdateTotals` recount, the conflicting-layer rules, the OnEquip hooks, the stamina block when fatigued (500109, applied only when overweight is above zero) and the separate walk block (500110), the mount-stamina path (`ProcessMountMovement`, where the default config sends mounted players), and the account-gold path. The step-loss formula uses the donor's integer division and mounted and running modifiers in donor order.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface ItemLike {
  id: string;
  weight: number;          // stones per unit
  amount: number;          // stack size
  stackKey?: string;       // same key = may stack (donor uses StackWith)
}

export type HoldResult = "ok" | "full-items" | "full-weight";

export class Container {
  readonly children: (ItemLike | Container)[] = [];
  totalWeight = 0;         // cached; updated by deltas, never recomputed on add
  totalItems = 0;
  ownWeight = 0;           // this container's own pile weight (donor PileWeight), added when the container itself is dropped

  constructor(
    public maxWeight: number,        // 0 = no limit
    public maxItems: number,         // 0 = no limit
    public parent: Container | null = null,
    public virtual = false,          // virtual (bank-like) containers hide contents from the carrier
  ) {}

  // Apply a delta to this container, then climb to the enclosing container unless this one is virtual.
  propagate(dWeight: number, dItems: number): void {
    this.totalWeight += dWeight;
    this.totalItems += dItems;
    if (!this.virtual && this.parent !== null) this.parent.propagate(dWeight, dItems);
  }

  // Check this container, then every enclosing container (donor CheckHold recursion).
  checkHold(weight: number, count: number, checkItems: boolean): HoldResult {
    if (checkItems && this.maxItems !== 0 && this.totalItems + count > this.maxItems) return "full-items";
    if (this.maxWeight !== 0 && this.totalWeight + weight > this.maxWeight) return "full-weight";
    return this.parent !== null ? this.parent.checkHold(weight, count, checkItems) : "ok";
  }

  // Stack onto an existing non-container with the same key first; otherwise take a new slot.
  tryDrop(item: ItemLike | Container): HoldResult {
    // A dropped container counts its contents: donor uses TotalItems + 1 and TotalWeight + PileWeight (247, 257).
    const w = item instanceof Container ? item.totalWeight + item.ownWeight : item.weight * item.amount;
    const count = item instanceof Container ? item.totalItems + 1 : 1;
    if (!(item instanceof Container) && item.stackKey !== undefined) {
      for (const c of this.children) {
        if (!(c instanceof Container) && c.stackKey === item.stackKey) {
          const hold = this.checkHold(w, 0, false);
          if (hold !== "ok") return hold;
          c.amount += item.amount;
          this.propagate(w, 0);
          return "ok";
        }
      }
    }
    const hold = this.checkHold(w, count, true);
    if (hold !== "ok") return hold;
    this.children.push(item);
    this.propagate(w, count);
    return "ok";
  }
}

// Carry limit from strength. Donor: (human in ML ? 100 : 40) + (int)(3.5 x Str).
export function maxCarry(str: number, ml: boolean, human: boolean): number {
  return (ml && human ? 100 : 40) + Math.trunc(3.5 * str);
}

// Stamina lost per step when carrying past the allowance. Walking pays the base; running doubles; mounted divides by 3
// (donor GetStamLoss; in the default config mounted players take a different path, ProcessMountMovement, not modelled).
export function overweightStepLoss(
  bodyWeight: number, carried: number, maxWeight: number, allowance: number,
  perLoss: number, baseLoss: number, running: boolean, mounted: boolean,
): number {
  const over = bodyWeight + carried - (maxWeight + allowance);
  if (over <= 0) return 0;
  let loss = baseLoss + Math.trunc(over / perLoss);
  if (mounted) loss = Math.trunc(loss / 3);
  if (running) loss *= 2;
  return loss;
}

// Equip: a layer takes one item and an invalid layer takes none. Conflicting-layer rules were not read.
export function canEquip(occupied: Set<string>, layer: string): boolean {
  return layer !== "invalid" && !occupied.has(layer);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ModernUO-inventory-bank-equipment.ts`, exit 0 (no output).

## 5. Lands in

- TARGET `origins/inventory/pack.ts` (new; the one ledger for carried items, the hold check and the stack-first drop). Parity-checklist row 15 (gear dressing) is the nearest row for equip-slot gating; the carry-weight and the item cap do not sit in any row, so they are a gap to raise with Lead (see section 6). Only the equip gate maps to row 15.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only).
- Brief rule served: one ledger (every carried change goes through one delta path and one hold check); zones as data (caps are data, defaults off).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- Row 15 is about gear dressing, not inventory. The carry cap and the item cap have no parity row; propose a sub-line of row 15 or of row 20 (catalogue as runtime source) to Lead rather than inventing a row.
- Frankendom has one character per ledger. The cached totals are a good fit, but Frankendom must recount on load and test the cache against a recount, because the donor keeps a separate full-recount path (`UpdateTotals`) and a stale cache would be silent.
- The virtual-container rule (bank contents do not count) is useful only if Frankendom has a bank. If it does, the bank contents must still count toward the account's ledger, and the test must show that.
- Carry weight and overweight drain are an RPG/MMO design choice. For a fast browser fighting game they are a distraction; keep them as zone data defaulting to off, not as engine behaviour.
- The stamina drain uses stamina as the cost. Frankendom's stamina rules (guard, dodge) live in the duel step (checklist row 3); a walking drain must not change duel timing. Do not port the movement hook into the duel.
- Equipment: the single-slot gate is simple and transfers. The conflicting-layer rules (`CheckConflictingLayer`) and the race, ethic and gender checks (`BaseArmor.CanEquip`) were not read in full and do not transfer as they are UO-specific.
- The donor's `BankBox` has a hack that lets gold and cheques bypass the hold check (`Containers.cs` 95-97, comment "This is a horrible hack."). Do not copy it; if Frankendom needs currency as items, give it its own rule.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Container.CheckHold body is 230-281, not 224-276 (224/227 are thin overloads); item/weight/recursion sub-cites 244-250, 257-263, 270-274 are right. Item.cs 757 is the Amount setter, not 'item ID' (641 is ItemID, 545 is Weight). Mounted /3 at StaminaSystem 422 only applies on the ProcessPlayerMovement path; with EnableMountStamina default true a mounted player goes to ProcessMountMovement (305-307), so the divide-by-3 acceptance branch is mostly dead - not stated. Sketch checkHold counts +1 item and item.weight*amount only; donor uses item.TotalItems+1 and item.TotalWeight+PileWeight (247, 257) so dropping a full container counts its contents.

**Missed:** CheckHold IsDecoContainer refusal (234-242) mentioned only in sketch omissions; BankBox.DefaultMaxWeight 0 but MaxItems still 125 via GlobalMaxItems (bank has item cap); OnSubItemAdded weight message uses condition curWeight>maxWeight without allowance (PlayerMobile 1631); stamina block at 335 applies only when overweight>0; CannotWalkWhenFatigued (322-327) uses message 500110 separate from 500109.
