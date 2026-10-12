# AAEmu-AAEmu (housing-player-built-spaces, cell 3)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/HousingManager.cs` (with `.../AAEmu.Game/Models/Game/Housing/House.cs`, `.../AAEmu.Game/Models/Game/Configurations.cs`, `.../AAEmu.Game/Models/Tasks/Housing/HousingTaxTask.cs`, `.../AAEmu.Game/Models/Game/Housing/HousingPermission.cs`, `.../AAEmu.Game/Models/Game/World/GameObject.cs`) | Licence: LGPL-3.0 per README ("GNU Lesser General Public License ... either version 3"); the repo also ships `LICENSE.GPL` (GPLv3 text) and `LICENSE.MIT` (MIT, "Copyright (c) 2019 Rain0Ash"); no per-file header states which applies, so the licence of this code is unclear: clean-room, shape only | C# | symbol `HousingManager.CheckHousingTaxes` / `CalculateBuildingTaxInfo` / `House.AllowedToInteract`

Checked: Read in full: HousingTaxTask.cs (11 lines), HousingPermission.cs (9), Configurations.cs (grep line 83 read), HousingManager.cs CheckHousingTaxes (1481-1507), CalculateBuildingTaxInfo (726-769), UpdateTaxInfo (775-820), PayWeeklyTax (822-826), HouseTaxInfo (421-455, the due and week logic 426-445), Demolish (640-693), SetUntouchable and SetRemovalDebuff (324-383), Build (474-594 in part: the payment and create path, 474-575 and 588-594), House.cs TaxDueDate (143), Permission setter (135-138), AllowedToInteract (374-395), GameObject.cs AllowedToInteract (204-207). Scheduling read at 196-203. Load-time protection fallback seen by grep only (HousingManager.cs 179-188). Not read: ReturnHouseItemsToOwner (881 on), SetForSale, BuyHouse (1165-1355), DecorateHouse, MailForTax, the callers of PayWeeklyTax and of AllowedToInteract, and the packets. Confidence: high on the tax clock, heavy-tax arithmetic and demolition; high on the permission switch semantics (C# rule; not run); medium on Build. Storage: grep for "storage", "warehouse", "vault" and "capacity" in the Housing folder and HousingManager returned no hits, so no house storage cap was found in these files. Trophy: not searched beyond the Housing folder (no hits there). Licence class: LGPL (copyleft).

## 1. Mechanism

- Protection clock. Each house has `ProtectionEndDate` (the paid-through date). A new house gets one paid period from placement: `DateTime.UtcNow.AddDays(DaysForTaxPayment)` (HousingManager.cs 588). The period is config (`DaysForTaxPayment`, default 7, Configurations.cs 83). Paying a week adds the same period to that date (824).
- Tax-due window. `TaxDueDate` is `ProtectionEndDate` minus 7 days (House.cs 143). So the warning comes 7 days before lapse, whatever the config says (see defect 2).
- Scan. `HousingTaxTask` (Models/Tasks/Housing) calls `CheckHousingTaxes` (HousingTaxTask.cs 9). The task is scheduled 30 s after start and repeats every 10 s (HousingManager.cs 199-200). `CheckHousingTaxes` (1481-1507) collects every owned house whose protection end has passed (1492), calls `UpdateTaxInfo` on every house (1494), then demolishes the collected ones (1496-1499). A re-entry guard (`_isCheckingTaxTiming`, 1483-1485) skips overlapping scans.
- Per-house state on each scan (`UpdateTaxInfo`, 775-820). Lapsed: untouchable buff removed and removal debuff applied (781-782), tax mails deleted (790). Due but not lapsed: a tax mail is created or updated (793-813). Untouchable is held while the house is not lapsed (`SetUntouchable`, 324-350: a permanent buff, which the donor comment says is removed only on failed payment or hand demolition, 331).
- Tax amount (`CalculateBuildingTaxInfo`, 726-769). It returns false at once (735-736) when the account owns no houses, before the new house is counted, leaving the total at 0; `Build` ignores the return (`out _`, 492), so an account's first house is charged no tax, deposit or certificates (defect 6). Otherwise it counts the account's houses by heavy and normal (739-745), adds the house being bought if it is new (748-754). Heavy multiplier: `min(heavyCount, 10) * 0.5` (757), but only when there are at least three heavy houses and the template is heavy (759-760). Weekly tax = template tax times multiplier, rounded up (762). A new house adds a deposit of twice the base tax (765-766).
- Payment for a new house. Tax certificates when the feature is on: one certificate per 10000 of tax, rounded up, bound certificates first (494-533, 501). Otherwise gold (538-543).
- Demolition. Lapsed houses lose their owner, co-owner, account and sale state (668-673), the owner's items are returned (666), the permission becomes Public (674), the faction becomes Monstrosity (679), and the house is queued for removal (686). A voluntary demolish sets protection to one second in the past (662) and then runs the same path.
- Permission setter (`House.cs` 135-138): a template flagged `AlwaysPublic` forces the permission to Public.
- Who may use a house (`House.AllowedToInteract`, 374-395). Always-public templates skip the switch (376-377). Otherwise a switch on the plot's `Permission` (380): Private = owner character, or any character on the owner's account (383-386). Family, guarded: the player must have a family and the owner must be a member of it (387-388). Guild, guarded: the player must be in an expedition and the owner must be a member (389-390). Public and default: base answer (391-393), which is `true` in `GameObject` (204-206).

## 2. Key functions

- `CheckHousingTaxes`: `.../AAEmu.Game/Core/Managers/HousingManager.cs` 1481-1507 (scan, state update, demolish).
- `UpdateTaxInfo`: same file, 775-820 (lapsed or due state, mails, buffs).
- `CalculateBuildingTaxInfo`: same file, 726-769 (heavy multiplier and weekly amount).
- `PayWeeklyTax`: same file, 822-826 (adds the period to the paid-through date).
- `Demolish`: same file, 640-693 (owner cleared, items returned, permission Public, removal queued).
- `SetUntouchable` / `SetRemovalDebuff`: same file, 324-383.
- `Build` (house creation, payment): same file, 474-594 (in part).
- `House.AllowedToInteract`: `.../AAEmu.Game/Models/Game/Housing/House.cs` 374-395.
- `GameObject.AllowedToInteract`: `.../AAEmu.Game/Models/Game/World/GameObject.cs` 204-207 (returns true).
- Permission enum: `.../AAEmu.Game/Models/Game/Housing/HousingPermission.cs` 3-9 (Private 0, Guild 1, Public 2, Family 3).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Paid-through date: one period per payment, lapse when it passes | 7 days default (Configurations.cs 83; the house is placed with one period, HousingManager.cs 588) |
| Warning before lapse | 7 days hard-coded in `TaxDueDate` (House.cs 143) |
| Scan cadence | Start after 30 s, every 10 s (HousingManager.cs 200) |
| Multiplier that grows with the owner's count, capped | Threshold three heavy houses (759); cap ten (HousingManager.cs 54); step 0.5 per house (757) |
| Deposit = twice base tax on a new house | 2 (766) |
| Certificate unit for item payments | 10000 per certificate, rounded up (501) |
| Demolish: expire protection one second in the past | 1 s (662) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's paid-through clock, the lapse scan and the heavy multiplier. It fixes three defects: the permission switch falls through (every permission has an explicit answer), the payment starts from the later of the paid-through date and now, and the warning window takes its length as an input from the same config as the paid period. It fixes the build order (check, consume, then charge). It omits: the tax mails, the untouchable and removal buffs, faction changes, the items returned by mail, the sale and buy flows, the deposit, the certificate payment, the re-entry guard and the position check (the donor's TODO, defect 4, is not fixed in code here). The `export {};` line used for the check is not shown.

```ts
// Licence: LGPL-3.0 per README; the repo also ships LICENSE.GPL and LICENSE.MIT, so the licence of this file is unclear. clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Permission = "Private" | "Guild" | "Public" | "Family";

interface Plot {
  ownerAccountId: number;     // 0 = no owner
  ownerFamilyId: number;      // 0 = none
  ownerExpeditionId: number;  // 0 = none
  permission: Permission;
  paidThroughMs: number;      // donor ProtectionEndDate
  heavy: boolean;             // template HeavyTax
}

interface Viewer { accountId: number; familyId: number; expeditionId: number; }

// Fixed: every permission has an explicit answer. The donor's guarded cases fall through to Public.
function canUse(p: Plot, v: Viewer): boolean {
  switch (p.permission) {
    case "Private":
      return p.ownerAccountId !== 0 && v.accountId === p.ownerAccountId;
    case "Family":
      return v.familyId > 0 && v.familyId === p.ownerFamilyId;
    case "Guild":
      return v.expeditionId > 0 && v.expeditionId === p.ownerExpeditionId;
    case "Public":
      return true;
    default:
      return false;
  }
}

type TaxState = "paid" | "tax-due" | "lapsed";

// warnBeforeMs comes from the same config as the paid period (donor hard-codes 7 days).
function taxState(p: Plot, nowMs: number, warnBeforeMs: number): TaxState {
  if (nowMs >= p.paidThroughMs) return "lapsed";
  if (nowMs >= p.paidThroughMs - warnBeforeMs) return "tax-due";
  return "paid";
}

// Fixed: a payment starts from the later of the paid-through date and now.
function payPeriod(p: Plot, nowMs: number, periodMs: number): void {
  p.paidThroughMs = Math.max(p.paidThroughMs, nowMs) + periodMs;
}

const MAX_HEAVY_COUNTED = 10;

// heavyOwned includes the plot being bought (donor CalculateBuildingTaxInfo adds it).
function weeklyTax(baseTax: number, heavyOwned: number, isHeavy: boolean): number {
  const multiplier = isHeavy && heavyOwned >= 3 ? Math.min(heavyOwned, MAX_HEAVY_COUNTED) * 0.5 : 1;
  return Math.ceil(baseTax * multiplier);
}

function demolish(p: Plot, nowMs: number): void {
  p.paidThroughMs = nowMs - 1000; // donor: AddSeconds(-1)
  p.ownerAccountId = 0;
  p.ownerFamilyId = 0;
  p.ownerExpeditionId = 0;
  p.permission = "Public";
}

// Runs every 10 seconds (donor: scheduled after 30 s, repeating every 10 s).
function taxScan(plots: Plot[], nowMs: number): Plot[] {
  const lapsed = plots.filter((p) => p.ownerAccountId !== 0 && nowMs >= p.paidThroughMs);
  lapsed.forEach((p) => demolish(p, nowMs));
  return lapsed;
}

interface Account { gold: number; }

// Fixed order: check money and the design, then consume the design, then charge.
// The donor charges first and consumes second, so a failed consume loses the gold.
function buildHouse(acct: Account, cost: number, designInBag: boolean, consumeDesign: () => boolean): boolean {
  if (!designInBag || acct.gold < cost) return false;
  if (!consumeDesign()) return false;
  acct.gold -= cost;
  return true;
}
```

## 5. Lands in

- TARGET `origins/housing/plots.ts` (new): the plot row holds `paidThroughMs` and the owner; `taxScan` runs on the server every 10 s and demolishes lapsed plots; `payPeriod` runs on a server action; `canUse` is the one place the permission is decided. Gold goes to the one ledger.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Only the zone-as-data part fits (template tax, heavy flag, paid period from config). The paid-through clock is an upkeep ledger with no row in the list of 1-23: a gap to raise with Lead.
- Reuse tag: rewrite-from-idea (LGPL-3.0 per README, with MIT and GPL texts also in the repo; licence unclear: clean-room only)
- Brief rule served: zones as data (template values, paid period from config); server-verified state (scan and demolition on the server clock); one ledger (one paid-through date per plot, one gold path)

Best transferable idea: Each plot holds a paid-through date that a payment extends and a server scan retires, with a warning window before lapse and a protection state that ends at the lapse, so the owner always sees the due date.
Decision (proposed): adapt - keep the paid-through clock, the warning window and the lapse scan; take the heavy-plot multiplier as data (cap and step in zone data); fix the permission fall-through, the fixed seven-day warning, the payment base date and the build order (sketch section 4).
Acceptance: Server test: a Family-permission plot refuses a player with no family (the donor admits them); a plot 6 days from lapse shows tax-due when the warning window is 7 days from config; a payment inside the 10 s window after lapse restarts from now, not from the past; with three heavy plots the next weekly tax is 1.5 times base, rounded up; a build with a missing design charges no gold; a first house on an account is charged its base tax and deposit (the donor charges nothing).

## 6. Gaps and risks

- Defect 1 (donor, high): the permission switch falls through. A Family-permission house with a player who has no family does not match the guarded case, so the switch takes `default`, which returns the base answer `true` (House.cs 387, 391-393; GameObject.cs 204-206). The same happens for a Guild-permission house and a player with no expedition (389, 391-393). Only players who have a family or expedition, but are not in the owner's, are refused. Not run; the reading follows the C# rule that a guard that fails sends the switch to `default`. Fix: explicit answer for every permission (sketch `canUse`).
- Defect 2 (donor): the tax-due date is `ProtectionEndDate` minus 7 days (House.cs 143) while the paid period is config (Configurations.cs 83). Change the config and the warning does not move. Fix: take the window from the same config (sketch `taxState`).
- Defect 3 (donor, latent): `PayWeeklyTax` adds the period to the stored date even when that date has already passed (HousingManager.cs 824). The 10 s scan demolishes a lapsed house quickly, so the window is small, but the rule is wrong. Fix: start from the later of the stored date and now (sketch `payPeriod`). The callers of `PayWeeklyTax` were not read, so the reach of the payment path is unknown.
- Defect 4 (donor): `Build` does not check the position against anything: the TODO says "validate house by range" (477) and the client sends the position (posX, posY, posZ, 474-475). Frankendom's rule is server-verified placement, so this is a gap, not a fixed point. Fix: check the position on the server before the charge (not in the sketch).
- Defect 5 (donor): gold is charged before the design is consumed (543, then 546-549). If the consume fails, the gold is kept and the function returns. The TODO at 479 ("minus moneyAmount") shows the order was known. Fix: check, consume, then charge (sketch `buildHouse`).
- Defect 6 (donor, high): the first-house charge is zero. `CalculateBuildingTaxInfo` returns false at 735-736 when `GetByAccountId` finds no houses (68-74), before counting the new house or computing the total; `Build` (492) never reads the bool. So an account's first house pays 0 tax and 0 deposit, and the deposit rule and the acceptance numbers below only apply from the second house. Fix: count the new house first and charge its base tax and deposit (the sketch's `weeklyTax` already counts it in `heavyOwned`; the deposit is not in the sketch).
- Load-time fallback (grep only, HousingManager.cs 179-188): a stored protection date equal to the placement date is replaced with placement plus 14 days. Not read in full; a migration rule, not a design rule.
- Demolition on lapse is not a grace period: the house is queued in the same scan that finds it lapsed (1492-1498). Frankendom's zone population has a grace timer (row 23) and should reuse it before a plot is removed.
- House storage: no storage cap for a house was found in the Housing folder or HousingManager (grep for storage, warehouse, vault, capacity). Not searched outside those files.
- Instancing: houses are loaded per world instance (HousingManager.cs 130, read as the signature only). The donor keys houses by world, not by player instance.
- Trophy display, phone placement UI: not found or not read.
- The heavy multiplier counts the account's houses (739-745), so one account with many plots pays more per plot. Frankendom has one character per ledger; the count would be per character.

Reuse tag: rewrite-from-idea (LGPL-3.0 per README; licence unclear: clean-room only)
Brief rule served: zones as data; server-verified state; one ledger


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Every cited line checked holds (CheckHousingTaxes 1481-1507; UpdateTaxInfo 775-820; CalculateBuildingTaxInfo 726-769 incl. heavy multiplier 757-760, deposit 766; PayWeeklyTax 824; Demolish 640-693 incl. -1s at 662; scan 30s/10s at 200; MaxHeavyTaxCounted=10 at line 54; DaysForTaxPayment=7 Configurations.cs 83; TaxDueDate -7 days House.cs 143; AllowedToInteract 374-395 with the `case X when` fall-through to default; GameObject 204-207 returns true; Build order gold 543 then design consume 546; certificates 494-533). LGPL README text matches; LICENSE.GPL and LICENSE.MIT present. Small gaps only: (1) note does not mention House.cs 138: Permission setter forces Public when template.AlwaysPublic. (2) Note says 'a new house adds a deposit' and acceptance test relies on weekly tax math, but see MISSED for a path where the whole charge is 0.
Missed: SIGNIFICANT MISSED DEFECT: CalculateBuildingTaxInfo returns false at HousingManager.cs 735-736 when the account owns no houses (GetByAccountId returns 0, lines 68-74), BEFORE counting the new house or computing totalTaxToPay (which is left at 0 from line 728). Build (line 492) ignores the bool return (`out _` everywhere), so an account's FIRST house costs 0 tax and 0 deposit (and 0 certificates). MailForTax.cs 49 and HousingManager 399/426 do check or ignore it similarly. The note's tax model and acceptance test assume the deposit and base tax always apply; Frankendom must not copy the early return.

Fixed 2026-10-12 (Sonnet fixer): added the verified first-house zero-charge defect (HousingManager.cs 735-736 early return, ignored at 492), the AlwaysPublic setter rule (House.cs 138), and an acceptance line for the first house. Sketch unchanged.
