# ACEmulator-ACE (housing-player-built-spaces, cell 3)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/HouseManager.cs` | Licence: AGPL-3.0 (LICENSE file, "GNU AFFERO GENERAL PUBLIC LICENSE, Version 3, 19 November 2007") | C# | symbol `HouseManager.Tick` (with `ProcessRent`, `HandleRentPaid`, `HandleEviction`)

Checked: Read end to end for the upkeep and eviction cycle: `Managers/HouseManager.cs` 327-346 (Tick), 364-386 (ProcessRent), 387-426 (HandleRentPaid), 440-545 (both HandleEviction overloads), 559-575 (IsRentPaid), 577-616 (HasRequirements), 618-632 (GetHouseData), 845-925 (PayRent, the admin path); `WorldObjects/House.cs` 179-214 (interval, period start, due date), 293-325 (HasPermission), 418-428 (ClearPermissions), 682-694 (hook budget); `Entity/PlayerHouse.cs` 1-39 (queue entry and order); `WorldObjects/Hook.cs` 165-170 and 209-213 (hook budget use and return); `WorldObjects/Player_Inventory.cs` 896-910 and 1100-1118 (hook limit checks); `WorldObjects/SlumLord.cs` 127-132 (rent item list); `ACE.Common/Performance/RateLimiter.cs` 14 (constructor only; body not read); caller `Managers/WorldManager.cs` 413 (the call line only; the loop body around it not read); admin callers `Command/Handlers/AdminCommands.cs` 1360 and 1371. NOT read: the player's own payment path (items placed into the slumlord), `BuildRentQueue` and its restart call, the purchase flow, chests and storage code, vendors, instancing or dungeon links, the `PlayerManager.FindByGuid` body, `ClearInventory`. Confidence: high on the upkeep cycle; medium on the eviction item loss (see defect 2). camera_scope: not a camera cell.

## 1. Mechanism

- Upkeep is a due-time queue. Each owned house is one `PlayerHouse` entry keyed by `RentDue`, a UTC time built from the player's `HouseRentTimestamp` (`Entity/PlayerHouse.cs` 26). The queue is a sorted set; ties are broken by house guid (`PlayerHouse.cs` 31-33; the queue declaration and its "sorted by RentDue times" comment are `HouseManager.cs` 35-37).
- Period arithmetic. `GetRentTimestamp` gives the start of the current period: `purchase + interval x floor((now - purchase) / interval)` (`House.cs` 184-200, elapsed time at 190). `GetRentDue` adds one interval (`House.cs` 205-214, due at 213). Interval = 30 days (`House.cs` 179). Apartments use three intervals, 90 days (`House.cs` 195 and 211).
- Ticker. `HouseManager.Tick` is called once per world-manager pass (`WorldManager.cs` 413). It is rate limited to one event per minute by `new RateLimiter(1, TimeSpan.FromMinutes(1))` (`HouseManager.cs` 47; the constructor is `RateLimiter.cs` 14). It then drains every entry whose due time has passed: `while (currentTime > nextEntry.RentDue)` (343), and each entry is removed before it is processed (345), its house count is decremented (346), and it is handed to `ProcessRent` (348).
- Decision at due time. `ProcessRent` loads the current house, then `IsRentPaid` (372) and `HasRequirements` are checked. Paid-or-exempt goes to `HandleRentPaid` (377): `if (isInActiveOrDisabled || (isPaid && hasRequirements))` (376). Anything else goes to `HandleEviction` (379). Exempt means `HouseStatus <= InActive` (`GetHouseData` sets `MaintenanceFree` for InActive, `HouseManager.cs` 618-632).
- Paid rule: every rent item must have `Paid >= Num` (`IsRentPaid`, 565). Rent items are the create list `DestinationType.HouseRent` on the slumlord (`SlumLord.cs` 129-131). The paid count is read from the slumlord's items (`SetPaidItems(house.SlumLord)`, `HouseManager.cs` 623), so payment is items placed in the slumlord inventory; the player-side placement code was not read.
- Requirement rule: when `house_purchase_requirements` is on, the owner's allegiance rank must be at least `mansion_min_rank` or the slumlord's `AllegianceMinLevel` (`HasRequirements`, 577-616, rank gate at 607).
- Paid path (`HandleRentPaid`, 387-426): if the player record is missing it returns (390-394); if the computed next due is not after the stored last payment it returns (401-405); otherwise it stores the next due (407), clears the slumlord inventory if the house is Active (414-417), and re-adds the house to the queue (425).
- Eviction (`HandleEviction`, 448-554; offline notice 519-535, online notice and `onlinePlayer.RemoveDeed()` at 544-545, so the deed is also taken from an online owner): clears the slumlord inventory (452). If the server setting `house_rent_enabled` is off, it only pushes the due date and re-queues (456-466). Otherwise it clears the owner, monarch and owner name, `ClearPermissions()` (475), relinks, switches the slumlord off, puts the house back on the available list (497), clears the player's house id and due date, and `ClearRestrictions()` (511). An offline owner is flagged `HouseEvicted` to see the notice at login (534). An online owner gets the chat line "...reverted due to non-payment of the maintenance costs. All items stored in the house have been lost." (544).
- Permissions, for context: `HasPermission` (293-325) first gives full permission to any character on the owner's account (account-wide access, 301-304), before the guest checks; `ClearPermissions` (431) ends with `OpenToEveryone = true`; the `Tick` clock `currentTime` is re-read inside the loop (355). `HasPermission` also lets a monarch in the guest list in, lets a guest in, and separates storage access; `OpenToEveryone` admits everyone (324). Eviction removes guests through `ClearPermissions` (418-429). A guest whose player record cannot be found is logged (426) and skipped, so it stays on the list.
- Trophy and display budget: each house has `HouseMaxHooksUsable` (default 25, `House.cs` 682; -1 means unlimited, `Player_Inventory.cs` 901). Placing an item on a hook uses one (`Hook.cs` 169), removing it returns one (212). The check runs only when the `house_hook_limit` property is on (`Player_Inventory.cs` 898), and a full budget refuses the placement (901-905).
- Admin path: `PayRent(house)` and `PayAllRent()` create the rent payment items on the server and put them in the slumlord (`HouseManager.cs` 845-909, 911-931), reached only from admin commands (`AdminCommands.cs` 1360, 1371). So a server-created payment bypasses the player's wallet.
- Tick cost: one queue entry per owned house; due checks are O(due entries) per minute.

## 2. Key functions

- `HouseManager.Tick`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/HouseManager.cs` 327-346. Rate-limited drain of the due queue.
- `HouseManager.ProcessRent` and `HandleRentPaid`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/HouseManager.cs` 364-426. Settle at due time; paid path and its early returns.
- `HouseManager.HandleEviction` (house overload): `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/HouseManager.cs` 448-516 and the online and offline notice at 519-546.
- `HouseManager.IsRentPaid` and `HasRequirements`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/Managers/HouseManager.cs` 559-616.
- `House.GetRentDue` / `GetRentTimestamp`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/House.cs` 184-214.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Due-time queue, drained in order, each entry removed before it is settled | Tick at most once per minute (`HouseManager.cs` 47) |
| Period start = purchase + interval x whole periods; due = period start + interval | Interval 30 days (`House.cs` 179); apartments x3 (195, 211) |
| Paid = every rent item at or above its count | Counts come from the slumlord create list (`SlumLord.cs` 129); no numbers in code |
| Exempt (InActive) skips rent and requirements | Status threshold `<= InActive` (`HouseManager.cs` 372-376) |
| Requirement gate: rank >= minimum | `mansion_min_rank` property or slumlord value (607) |
| Hook budget: a placement uses one, a removal returns one, refused at zero | Default 25, -1 unlimited (`House.cs` 682; `Player_Inventory.cs` 901) |
| No grace period: unpaid at the due time means eviction | None (`HouseManager.cs` 376 to 378, no delay) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (drain the due queue, remove before settle, exempt or paid-and-meets-requirements is paid, next due from the purchase time, evict otherwise) and the period arithmetic. It adds a grace window for unpaid rent (our addition, marked in the code; the donor has none), clamps the elapsed time at zero (the donor subtracts unsigned times, so a purchase in the future wraps), always re-queues on the paid and grace paths (this removes the donor's silent drop, defect 1), and uses one `now` per tick where the donor re-reads the clock in the loop. It omits the player's payment path, the slumlord inventory, the eviction side effects (owner, permissions, restrictions, notices), the rent-disabled setting, and the multihouse branch.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface RentItem { required: number; paid: number; }
interface Tenancy {
  houseId: number;
  purchaseAt: number;      // seconds
  dueAt: number;           // seconds; the queue sorts by this, then by houseId
  rent: RentItem[];        // upkeep owed this period
  meetsRank: boolean;      // requirements checked at the due time
}
type Outcome = 'paid' | 'grace' | 'evict';

const INTERVAL_S = 30 * 24 * 3600; // donor RentInterval, 30 days

// Start of the current period, then one interval after it: the next due time.
export function nextDue(purchaseAt: number, now: number, intervalS: number = INTERVAL_S): number {
  const offset = Math.max(0, now - purchaseAt); // fix: clamp so a future purchase time cannot wrap
  const periods = Math.floor(offset / intervalS);
  return purchaseAt + intervalS * periods + intervalS;
}

// Exempt (free) houses are always paid. Otherwise rent and requirements must both hold.
// Unpaid rent gets a grace window (our addition, not in the donor, which evicts at the due time).
export function settle(t: Tenancy, exempt: boolean, now: number, graceS: number): Outcome {
  const rentPaid = t.rent.every(r => r.paid >= r.required);
  if (exempt || (rentPaid && t.meetsRank)) return 'paid';
  if (!rentPaid && now < t.dueAt + graceS) return 'grace';
  return 'evict';
}

export class UpkeepQueue {
  private queue: Tenancy[] = [];
  private lastRun = -Infinity;

  constructor(private readonly tickMs = 60000) {} // donor: RateLimiter(1, 1 minute)

  add(t: Tenancy): void {
    this.queue.push(t);
    this.queue.sort((a, b) => a.dueAt - b.dueAt || a.houseId - b.houseId);
  }

  // Runs at most once per tickMs. Drains every entry whose due time has passed.
  // Each entry leaves the queue before it is settled; paid and grace entries go back in.
  // No early return drops an entry: every path re-queues or evicts (fixes the donor's silent drop).
  tick(now: number, exempt: (houseId: number) => boolean, graceS: number): { houseId: number; outcome: Outcome }[] {
    if (now - this.lastRun < this.tickMs) return [];
    this.lastRun = now;
    const out: { houseId: number; outcome: Outcome }[] = [];
    while (this.queue.length > 0 && now > this.queue[0].dueAt) {
      const t = this.queue.shift()!;
      const outcome = settle(t, exempt(t.houseId), now, graceS);
      out.push({ houseId: t.houseId, outcome });
      if (outcome === 'paid') {
        t.dueAt = nextDue(t.purchaseAt, now);
        this.add(t);
      } else if (outcome === 'grace') {
        t.dueAt = t.dueAt + graceS; // check again when the grace window ends
        this.add(t);
      }
      // 'evict': the caller runs eviction (owner cleared, permissions cleared, house released).
    }
    return out;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/hs003-ace-upkeep-queue.ts`, copy of `work/ace-upkeep-queue.ts`). The local tsc is not installed on the Mac, so the Mac hook could not check it.

## 5. Lands in

- TARGET `origins/server/house-upkeep.ts` (proposed path, not checked against the Frankendom repo): a server due-queue over plot rows; the paid check reads the one ledger; the eviction is one server command that writes ledger rows.
- Parity-checklist row: 23 (zone population, per the task hint). The addendum has no housing row; the lead should confirm this is the right row.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room, shape only)
- Brief rule served: one ledger (rent is a ledger settle, not an inbox of items); server-verified (the due check and eviction run on the server). Rules 7-9 n/a.

## 6. Gaps and risks

- Defect 1 (silent drop): `Tick` removes the entry (`HouseManager.cs` 345) and then `HandleRentPaid` returns without re-queuing in two cases: the player record is missing (390-394) and the computed next due is not after the stored payment (401-405). The house then stays owned but is never charged again and never evicted, until the queue is rebuilt (`BuildRentQueue` and its restart call were not read). fix: every path re-queues, or evicts and logs; the sketch does this.
- Defect 2 (text vs code): the eviction notice says "All items stored in the house have been lost" (`HouseManager.cs` 544, repeated at `Player_House.cs` 609). The eviction code as read clears the slumlord inventory (452), permissions (475), restrictions (511) and the owner (see 448-516), but `HouseManager.cs` contains no Destroy call, and a search of the Source tree for house-item clearing names (DestroyHouse, ClearHouseItems, RemoveHouseItems, ClearHouse) found nothing. Whether the items are removed by some other path was not read. fix: decide the rule (Dom), then make the notice and the code agree; for Frankendom, list the items and write one ledger row per item before any removal, never a silent loss.
- Defect 3 (log placeholder): the paid-path log at `HouseManager.cs` 422 is an interpolated string `$"...({0})..."`, so it prints a literal 0 instead of the player name. fix: use a format string or `{playerHouse.PlayerName}`.
- Defect 4 (lookup failure evicts): `HasRequirements` returns false when `FindByGuid` finds no player (`HouseManager.cs` 592-595), and `ProcessRent` evicts when requirements fail (376). The lookup is only reached when `house_purchase_requirements` is on and the slumlord has an `AllegianceMinLevel` (580-587), otherwise `HasRequirements` returns true early. When it is reached, a failed lookup starts an eviction, and a null player would then throw a NullReferenceException inside `HandleEviction` (player is dereferenced at 454-459 and 501 with no null check) after the owner is already cleared and the house put on the available list (471-497), so the outcome is a half eviction, not a clean one. The `FindByGuid` body was not read, so the cause of a null is unknown. fix: a lookup failure is "retry at the next tick", never an eviction.
- Timing: the ticker runs at most once a minute (`HouseManager.cs` 47). A rent that falls due waits up to a minute; the donor accepts this and so can Frankendom. No grace period exists in the donor: the first missed period evicts at the due time (376 then 448-516). The grace window in the sketch is our addition and needs Dom's ruling.
- Rent is also a server-created payment in the admin path (`HouseManager.cs` 845-909; `AdminCommands.cs` 1360, 1371). That path creates currency-free items and must not exist in Frankendom's ledger; only an admin grant row may.
- Permissions gap: eviction removes guests whose player record is found (`House.cs` 418-429); a guest with no record stays on the list. The donor has no rule for who may keep items when a guest leaves, and no notice to guests.
- Cost formulas: no numbers are in code. Rent and purchase costs are create-list rows in the world data (`SlumLord.cs` 129). Frankendom should keep them as zone data rows, not constants.
- Not read: the player payment path, `BuildRentQueue`, the purchase flow, chest and storage code, vendors, instancing and dungeon links. Storage, vendors and instancing are therefore not covered by this note.

Best transferable idea: keep every owned plot in a due-time queue, settle each entry once when it falls due (paid, grace or evict), and always re-queue a paid or graced entry so no owner silently drops out.

Decision (proposed): adapt - take the due queue, settle-at-due, and the hook budget as a display cap, but charge upkeep from the one ledger (no slumlord inbox, no server-made payments), add a grace window for unpaid rent (ruling needed), and never remove storage without a ledger row per item.
Acceptance: a server test shows an unpaid plot enters grace at its due time, is evicted only after the grace window, a paid plot gets its next due date and is re-queued, a lookup failure does not evict, and no item is removed without a ledger row listing it first.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Defect 4 was partial: HasRequirements only reaches the FindByGuid null branch when house_purchase_requirements is on and the slumlord has AllegianceMinLevel; a null player then NREs inside HandleEviction (459/501) after the owner is cleared and the house put on the available list (471-497), a half eviction not a clean one.
- HandleEviction runs to 554; the 448-516/519-546 split omitted onlinePlayer.RemoveDeed() at 545.
- Missed: account-wide owner permission (House.cs 301-304); ClearPermissions ends with OpenToEveryone = true (431); HandleEviction never null-checks the player (454); Tick re-reads currentTime per loop (355).

Fixed 2026-10-12: Defect 4 rewritten, eviction line ranges and RemoveDeed added, permission and clock quirks added to the Mechanism. Sketch unchanged, no typecheck needed.
