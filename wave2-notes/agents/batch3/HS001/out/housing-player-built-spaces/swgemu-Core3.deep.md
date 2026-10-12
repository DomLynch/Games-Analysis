# swgemu-Core3 (housing-player-built-spaces, cell 2)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/structure/events/StructureMaintenanceTask.cpp` (with `.../objects/structure/StructureObjectImplementation.cpp`, `.../objects/player/PlayerObjectImplementation.cpp`, `.../managers/structure/StructureManager.cpp`, `.../objects/structure/components/StructureContainerComponent.cpp`, and the house templates under `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/bin/scripts/object/building/player/`) | Licence: AGPL-3.0 (`/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/COPYING`: GNU AFFERO GENERAL PUBLIC LICENSE, Version 3, 19 November 2007) | C++ | symbol `StructureMaintenanceTask::run` / `StructureObjectImplementation::updateStructureStatus`

Checked: Read in full: StructureMaintenanceTask.cpp (1-283). StructureObjectImplementation.cpp: rate and schedule functions (297-362, 363-464), condition and status (522-705), base rates and permission lists (790-904). PlayerObjectImplementation.cpp lots (3152-3168). StructureManager.cpp placement lot check (440-470). PlaceStructureSessionImplementation.cpp construction time (55-75). StructureContainerComponent.cpp (all 46 lines). Lot and rate values from three house templates (grep, plus two lines read). Not read: notifyInsertToZone (153-226, only its call at 194 seen in grep), city property tax (PayPropertyTaxTask), StructureManager::destroyStructure, the structure terminal menus, RevokePaidAccessTask.h, BuildingObjectImplementation lot logic (1062), and the callers of updateStructureStatus beyond the ones in the read code. Confidence: high on the upkeep pool, decay and destroy path, and the permission lists; medium on lots (the sum and the check, not the deed UI); no container storage cap was found in the structure container code (only permission checks). Trophy: searched objects/building only, no hits. Instancing: not read (buildings are world objects in the donor's code, not checked as instances). Licence class: AGPL-3.0, so clean-room, shape only. camera_scope not used.

## 1. Mechanism

- Upkeep is a pool. Each structure has `surplusMaintenance`, a credit balance. Its per-hour cost is `getMaintenanceRate()`: the template's base rate (`baseMaintenanceRate`, read by `getBaseMaintenanceRate`, 790-797) times 0.8 if the structure has `maintenanceReduced` (324-325), then truncated to an integer (326-328).
- Charging is continuous. `updateStructureStatus` (522-590) computes `timeDiff` from the stored `lastMaintenanceTime` (543), so the charge is `rate / 3600 * seconds` (544) and it is taken off the pool (578). The timestamp moves only when something was due (553-556). This is delta-time accrual: the result does not depend on how often the function runs.
- Negative pool is decay. When the pool is below zero the difference is written as condition damage (585-589). Condition percent is `(maxCond - damage) * 100 / maxCond`, plus 1, clamped to 0-100 (633-662). `isDecayed` means percent is 0 (629-631).
- Daily check (`StructureMaintenanceTask::run`, 22-143). It first refuses a structure whose owner has no credit object or name (45-53), and reschedules if the pool is already positive (59-65). It brings the status up to date (71). Then it computes one week: `7*24*rate - surplus` (74), adds the city tax on buildings (77-80), and adds the debt (82-85). If that is positive and the owner's bank covers it (88), it pays from the bank into the pool (91), mails the owner, and schedules the next check from the surplus (104). Otherwise it starts the decay path (106-141).
- Decay path. Not yet decayed: mail the owner and check again in a day (108, 114-121). Decayed: a building is condemned, not removed, while its backlog is within the allowance (123-135). `shouldBuildingBeDestroyed` (268-283) allows backlog `30 days * rate` (`getDelayDestroyHours` = 720 h, 808-810). A decayed non-building is destroyed at once (137-139), through `StructureManager::destroyStructure` (158).
- Next check time (`scheduleMaintenanceExpirationEvent`, 363-437). Time to exhaust the pool at the rate (415), capped at one day with a random 12-24 hour spread (424-425). An empty pool on boot is scheduled 600 s plus a random hour from config (422). The debt-to-time path is the same formula as the charge.
- Lots (placement budget). Each player has `maximumLots` = 10 (PlayerObject.idl 387, block not checked). `getLotsRemaining` subtracts each owned structure's lot size from that (3152-3167). Placement is refused when the deed's lot count is not available (452-459 in StructureManager.cpp). Construction takes 3000 ms per lot (PlaceStructureSessionImplementation.cpp 69).
- Lot and rate values (templates): large house 5 lots and 50 per hour (rate line 46 receipted; the lot line is short); small house 2 lots and 16 per hour (rate line 46 receipted). A medium Tatooine house is 2 lots and 34 per hour (grep only). Across the 38 player-house templates the grep shows rates of 0, 10, 16, 34, 50 and 100 per hour; the mapping from house to rate was not checked one by one.
- Permissions. Each structure holds named lists: ADMIN, ENTRY, VENDOR, HOPPER, BAN (`isOnPermissionList`, 886-904). Each entry is a player id or a guild id (901, 897-900). A privileged player passes every list except BAN (889-893). ADMIN also passes the ENTRY, VENDOR and HOPPER checks (834-837, 872-874). The ban check returns false for a god-mode player (853-854). Containers: vendor move needs a public structure and VENDOR or admin (17-19); owners and admins pass the general container check (29-31).

## 2. Key functions

- `StructureMaintenanceTask::run`: `.../objects/structure/events/StructureMaintenanceTask.cpp` 22-143 (daily check; pay or decay).
- `StructureMaintenanceTask::shouldBuildingBeDestroyed`: same file, 268-283.
- `StructureMaintenanceTask::destroyStructureWithReason`: same file, 145-160.
- `StructureObjectImplementation::updateStructureStatus`: `.../objects/structure/StructureObjectImplementation.cpp` 522-590 (charge over elapsed time; pool to condition).
- `getDecayPercentage` / `isDecayed`: same file, 629-662.
- `payMaintenance`: same file, 664-704 (cash first or bank first; splits across both).
- `scheduleMaintenanceExpirationEvent`: same file, 363-437; `scheduleMaintenanceTask`: 439-463.
- `getMaintenanceRate`: same file, 317-329.
- Permission lists: `isOnAdminList` 812-827, `isOnEntryList` 829-848, `isOnBanList` 850-865, `isOnHopperList` 867-884, `isOnPermissionList` 886-904.
- Lots: `PlayerObjectImplementation::getLotsRemaining` (3152-3168); `StructureManager` placement check (452-459); `PlaceStructureSessionImplementation` (69).
- Container permissions: `StructureContainerComponent::checkContainerPermission` (12-46).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A balance drained by rate times elapsed time; the negative balance is the debt | Per-hour rate from the template (50 large, 16 small, 34 medium); reduced multiplier 0.8 (SOI 325, receipt not written: the line is 13 characters) |
| Truncation to integer after the multiplier | `(int)rate` (SOI 328); the comment says "Round to nearest int" (see defect 1) |
| Weekly prepay = 168 hours of rate, plus the debt | 7 * 24 hours (SMT 74) |
| Check once a day, or sooner when the pool runs out | 24 * 60 * 60 s (SMT 108); random 12-24 h spread (SOI 425) |
| Boot spread for an empty pool | 600 s plus random under 3600 s, from config key `Core3.StructureObject.MaintenanceBootDelay` (SOI 422) |
| Condemn, then remove after a backlog allowance | 30 days of rate (SOI 809; SMT 275-278) |
| Lots as a budget per player | `maximumLots` 10 (PlayerObject.idl 387); lot counts per template (5 large, 2 small) |
| Construction time per lot | 3000 ms per lot (PlaceStructureSessionImplementation.cpp 69) |
| Permission tiers by name | ADMIN, ENTRY, VENDOR, HOPPER, BAN (SOI 817-873) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: accrue the pool from elapsed time, take the week from the bank if the pool is low, otherwise warn, condemn or destroy. It fixes the decay percent: damage is capped at the maximum, so zero condition reads 0 (donor reads 1 there; defect 1). It takes the rate as given, so the 0.8 reduction is applied to the rate by the caller without truncation (defect 2 is fixed by the caller, not in the sketch). It omits: city property tax, the cash-first payment order, mails, the random spreads and boot delay (the caller schedules), the rapid-decay debug flag, and the lot budget and permission lists. The `export {};` line used for the check is not shown.

```ts
// Licence: AGPL-3.0 (donor, COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Plot {
  rate: number;          // credits per hour (donor: base rate, times 0.8 when reduced, truncated)
  pool: number;          // maintenance credits; negative = owed, which is also the decay debt
  maxCondition: number;  // decay scale; 0 means the plot cannot decay
  bank: number;          // owner's bank credits
  lastAccrueS: number;   // seconds, updated on each accrue
  isBuilding: boolean;
}

const DELAY_DESTROY_HOURS = 30 * 24; // donor getDelayDestroyHours

// Delta-time accrual: the same result however often it runs.
function accrue(p: Plot, nowS: number): void {
  const due = (p.rate / 3600) * (nowS - p.lastAccrueS);
  p.lastAccrueS = nowS;
  p.pool -= due;
}

// Fixed: damage is capped at max, so zero condition reads 0 (donor adds 1 and reads 1 at zero).
function percentCondition(p: Plot): number {
  if (p.maxCondition <= 0) return 100;
  const damage = Math.min(Math.max(0, -p.pool), p.maxCondition);
  return Math.floor(((p.maxCondition - damage) * 100) / p.maxCondition);
}

type Outcome = "paid" | "warned" | "condemned" | "destroyed";

// Daily check (donor: StructureMaintenanceTask::run). One outcome per run.
function dailyCheck(p: Plot, nowS: number): Outcome {
  accrue(p, nowS);
  const oneWeek = 7 * 24 * p.rate - p.pool; // donor: 168 h of rate, less the surplus
  if (oneWeek > 0 && p.bank >= oneWeek) {
    p.bank -= oneWeek;
    p.pool += oneWeek;
    return "paid";
  }
  if (percentCondition(p) > 0) return "warned"; // not decayed: warn and check again tomorrow
  if (p.isBuilding && p.pool + DELAY_DESTROY_HOURS * p.rate > 0) return "condemned";
  return "destroyed";
}
```

## 5. Lands in

- TARGET `origins/housing/plots.ts` (new): the plot row carries `pool`, `rate` and `lastAccrueS`; the daily check and the accrual run from the server, and the destroy path deletes the row. Gold comes from the owner's one ledger; the donor's separate bank is not copied.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Only the zone-as-data part fits row 23 (the lot budget per zone, the rate per template). The upkeep pool itself has no row in the list of 1-23: a gap to raise with Lead.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: zones as data (rate, lots and template values are data); one ledger (the pool is one row); server-verified (charge and decay run on the server clock)

Best transferable idea: Upkeep is a per-plot balance that drains at a rate in real elapsed time; the debt past zero is shown as decay, and a building is condemned for a set backlog before it is removed, so a lapsed owner always has a warning stage.
Decision (proposed): adapt - keep the pool as the ledger row, decay as its debt, and condemn-then-remove for plots; take gold from the one ledger instead of a bank; fix the truncation and the rounding in the sketch and the rate.
Acceptance: A server test with an empty pool and enough gold shows the pool back above zero after one charge of 168 hours of rate, and the gold down by the same amount; with no gold, a plot shows decay from the first day it is in debt, is marked condemned until its debt passes 30 days of rate, then the row is deleted; a plot at full damage reads 0 percent; a reduced 16-per-hour plot charges 12.8 per hour, not 12.

## 6. Gaps and risks

- Defect 1 (donor): decay percent is computed as `(max - damage) * 100 / max` and then `+1` (643-646). At full damage it reads 1, not 0. Because the division truncates in integer maths, the `isDecayed` test (`== 0`) only becomes true once damage is about 1 percent above the maximum. Whether `setConditionDamage` clamps damage at the maximum was not read (not read). Fix: cap damage at max and floor the result (sketch section 4).
- Defect 2 (donor): the reduced rate is truncated to an integer after the 0.8 multiplier (324-328), but the comment says "Round to nearest int". A 16-per-hour plot becomes 12 per hour, a 25 percent reduction, and a 34-per-hour plot becomes 27, about 21 percent. Fix: keep the rate as a float, or round it, and make the multiplier a data field (sketch takes the rate as given).
- No grace before removal for a non-building (137-139): a decayed non-building structure is destroyed in the same run. A building gets the 30-day backlog. Frankendom should use the zone grace timer (row 23) for every plot kind, not only buildings.
- The weekly bank payment is all or nothing: the daily check pays only when the bank covers the whole week (88), and otherwise goes to the decay path without a partial payment. Keep that rule: a partial payment would hide the debt.
- Lots are a per-player budget, not a per-zone cap. Frankendom's zones-as-data rule would put the cap on the zone row instead. The donor shows the summing shape only.
- City property tax (SOI 558-569) adds to the charge for buildings in a city. Not read beyond that: PayPropertyTaxTask is not read. Frankendom has no tax model; drop it.
- Container storage: `StructureContainerComponent` (12-46) gates access by permission only. No container capacity cap was found in this file or in the lot code; storage size is not a structure-level cap in this donor (as read).
- Permissions run in the structure's own lists (ADMIN, ENTRY, VENDOR, HOPPER, BAN) per player or guild. Frankendom's rulings (friends list, guild) fit the shape; a named tier per action is the useful part. The privileged bypass (889-893) would be a staff-only rule in Frankendom.
- Instancing and the phone placement UI: not read.
- Trophy display: not found in objects/building (grep). Not searched elsewhere in the donor.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: zones as data; one ledger; server-verified
