# ModernUO (housing-player-built-spaces, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Multis/Houses/BaseHouse.cs` (with `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Multis/DynamicDecay.cs`, `.../Multis/Houses/HousePlacement.cs`, `.../Multis/Houses/HousePlacementTool.cs`) | Licence: GPL-3.0 (LICENSE file: GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007; header "Copyright 2019-2020 ModernUO Development Team") | C# | symbol `BaseHouse.UpdateDecay` / `Decay_OnTick` / `LockDown`

Checked: Read in full: DynamicDecay.cs (57 lines), the decay type, level, tick, refresh, sandbox and storage/lockdown regions of BaseHouse.cs (105-275, 545-680, 677-760, 1290-1320, 2159-2215, 3555-3660, 3700-3735, enums 3880-3910), and the HousePlacementEntry class (HousePlacementTool.cs 283-330) with the table head (495-510). Read in part: HousePlacement.Check (starts line 42; return points and rule comments read, branch bodies not read) and CheckYard (373-410). Not read: HouseFoundation.cs, HouseSign.cs, vendor-rental and barkeeper flows, ContestHouses.cs, HouseDecayPurityTests.cs. Callers: Decay_OnTick is started once from Initialize (1308-1311); CheckDecay is called only from Decay_OnTick and from the deserialise path (3251); I read both. Confidence: high on decay and limits, medium on placement. Camera: not applicable (camera_scope not used). Trophy display: grep for "trophy" in the Multis folder returned no hits (searched, nothing found). Licence class: GPL-3.0, so clean-room, shape only.

## 1. Mechanism

- Who decays (`DecayType`, BaseHouse.cs 110-195). Decay is off when `RestrictDecay` is set, the server flag is off, or `DecayPeriod` is zero (114-116). A house owned by a game master is Ageless (129-131). On AOS, an owner-less house or one whose account is inactive is Condemned (119-121, 149-151). On AOS the newest house on an account is AutoRefresh and never decays (154-180). Before AOS an owner is ManualRefresh (144-146). Only Condemned and ManualRefresh can decay (187-195).
- Two decay paths. On Core.ML the staged path runs: `DynamicDecay.Enabled => Core.ML` (DynamicDecay.cs 22), and the `DecayLevel` getter returns the stored stage (BaseHouse.cs 207-217). Otherwise the legacy percent path runs (`GetOldDecayLevel`, 567-603).
- Staged path, order of steps. Stage order is Ageless, LikeNew, Slightly, Somewhat, Fairly, Greatly, IDOC, Collapsed (enum 3891-3901). `UpdateDecay` (227-275) first resets to Ageless if the house cannot decay (231-236) and remembers it was undecayable (`_wasUndecayable`). When the house becomes decayable again (240-251) that counts as a refresh: `LastRefreshed` is restamped and the staged state reset. If it can, and the stage is Ageless or its scheduled time has passed, it moves exactly one step (253-261). `SetDynamicDecay` gives the new stage a random end time (3716-3728).
- Stage timers, from DynamicDecay.cs 14-19 and the random draw at 31-41: LikeNew is a fixed 1 hour; Slightly, Somewhat, Fairly and Greatly are each a uniform 1 to 2 days; IDOC is 12 to 24 hours. Collapsed has no timer. From a refresh to Collapsed, the total is about 4.5 to 9 days (computed from those constants, not timed).
- Legacy path. `percent` is elapsed time over `DecayPeriod` in per-mille (570). Thresholds (572-602): 5 gives Slightly, 250 Somewhat, 500 Fairly, 750 Greatly, 950 IDOC, 1000 Collapsed (DemolitionPending if the house has rented vendors). `DecayPeriod` defaults to five days (108).
- Tick. One timer runs every minute (`Timer.DelayCall(... 1 min ...)`, 1310). `Decay_OnTick` loops over every house (551-557) and calls `CheckDecay` (627-638). That calls `UpdateDecay`, and if the level is Collapsed it starts `Decay_Sandbox` (633). The sandbox adds a temporary no-housing region on ML (668), kills player vendors and deletes barkeepers (`KillVendors`, 640-657), then deletes the house (672). There is no grace period: the tick that sees Collapsed queues the sandbox as a deferred timer job (`Timer.StartTimer`, 633), so the house is deleted on the next timer run, effectively at once.
- Refresh (`RefreshDecay`, 605-625). Refused for Condemned (607-610). Otherwise it calls `UpdateDecay`, stamps `LastRefreshed` (615), and resets the staged state (619) so the next tick returns the house to LikeNew. It returns whether the house had decayed (624).
- Load-time migration (BaseHouse.cs 3239-3251, in `Deserialize`): when staged decay is on and no stage was saved, the house takes its legacy level (DemolitionPending becomes Collapsed) and then `CheckDecay` runs once, so a house that is already over-age is removed when the server loads it.
- Design rule in the donor (BaseHouse.cs 224-226): decay state advances only from the tick, never from a read, because a getter that writes persisted fields changes every record on every read.
- Storage and lockdown caps (AOS rules). Cap = placement entry value times `BonusStorageScalar` (1.2 on ML, 1.0 otherwise; 280, 686, 698). The entry values come from `HousePlacementEntry.Storage` and `.Lockdowns`, which pick the AOS column when `NewVendorSystem` (= Core.AOS) is set (HousePlacementTool.cs 324-325; BaseHouse.cs 95). The count is secure-container items including nested ones (`TotalItems`, 719) plus one per secure, plus items locked down, plus moving-crate items (701-751). A lockdown costs `1 + item.TotalItems` and needs both the lockdown cap and the storage cap (2193-2194). Pre-AOS uses a flat lockdown count (2195).
- Permissions. `IsOwner` is the owner, a game master, or (AOS) the same account (3559-3561). `IsCoOwner` is the owner, the co-owner list, or (pre-AOS) the same account (3563-3565). `IsFriend` is co-owner or on the friends list (3612). A ban matches the character or any character on the same account (3614-3639); staff are never banned (3616). Lockdown needs `IsCoOwner` and `IsActive` (2161). List caps: friends and bans 50 pre-AOS, 140 AOS (97-98).
- Placement (`HousePlacement.Check`, from line 42). Staff at GameMaster or above place anywhere (63). No-housing regions refuse (76). Per-tile region checks run in the loop. The rule comments (about line 103) list five rules: outer ring clear, no impassable contact, a five-tile yard clear front and back, a flat foundation, no road tiles. `CheckYard` (373) refuses a house within one tile of another (404). Movable items and mobiles under the footprint are queued to move under the sign (237, 256).

## 2. Key functions

- `Decay_OnTick`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Multis/Houses/BaseHouse.cs` 551-557 (loop over all houses, calls CheckDecay). Timer started at 1310.
- `UpdateDecay`: BaseHouse.cs 227-275 (reset when undecayable, one step when due, sign refresh on level change).
- `CheckDecay`: BaseHouse.cs 627-638 (Collapsed starts `Decay_Sandbox`).
- `Decay_Sandbox`: BaseHouse.cs 659-673 (ML no-housing region, kill vendors, delete).
- `RefreshDecay`: BaseHouse.cs 605-625.
- `GetOldDecayLevel`: BaseHouse.cs 567-603 (legacy percent thresholds).
- `DynamicDecay` table and draw: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Multis/DynamicDecay.cs` 10-20 (Register calls) and 31-42 (GetRandomDuration).
- `SetDynamicDecay` / `ResetDynamicDecay`: BaseHouse.cs 3716-3728 and 3710-3714.
- Storage caps: `GetAosMaxSecures` 677-687, `GetAosMaxLockdowns` 689-699, `GetAosCurSecures` 701-752, `CheckAosStorage` 1292-1299, `LockDown` 2159-2205 (caps checked at 2193-2196).
- Permissions: `IsOwner` 3559-3561, `IsCoOwner` 3563-3565, `IsFriend` 3612, `IsBanned` 3614-3639, `HasAccess` 3641 (read to 3660).
- Placement: `HousePlacement.Check` (HousePlacement.cs 42, read in part), `CheckYard` (373-410, read in part), `HousePlacementEntry` (HousePlacementTool.cs 283-330) and the foundation table (495 on).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stage machine: one step per due timer, timers drawn uniformly between min and max | Stage list (enum 3891-3901); Register constants (DynamicDecay.cs 14-19): LikeNew 1 h fixed; Slightly, Somewhat, Fairly, Greatly 1-2 days; IDOC 12-24 h (receipts DD 14, 15, 19; draw DD 41) |
| Percent of one period picks the stage (legacy) | Period 5 days (theirs, BaseHouse.cs 108); thresholds 5, 250, 500, 750, 950, 1000 per mille (570-602; receipt at 587 for 500) |
| Refresh restarts the clock | `LastRefreshed` stamp (615) and `ResetDynamicDecay` (619) |
| One periodic tick over all records | Every 1 minute (1310) |
| Capacity = table value times a scalar | Scalar 1.2 on ML, 1.0 otherwise (280); AOS column chosen by Core.AOS (95, 324-325) |
| Count nested items, one per container | `TotalItems` (719); one per secure (722) |
| Friend and ban list caps | 50 before AOS, 140 on AOS (97-98) |
| Yard spacing around a footprint | Yard of 5 tiles (HousePlacement.cs 26); one-tile proximity rule (404) |
| Storage per foundation | Table values (HousePlacementTool.cs 500-505, e.g. 425/212 classic, 489/244 AOS for the 7x7 two-story row; receipts not written, these are short lines, read only) |

## 4. TypeScript sketch

simplified: the sketch uses one period (5 days) for every stage, with the donor's legacy thresholds (0.5, 25, 50, 75, 95, 100 percent of the period) and a 10 percent jitter that is a Frankendom choice, not a donor value. This fixes the donor defect that the staged path ignores `DecayPeriod` (section 6). It omits: the Ageless and game-master cases, the account-based AutoRefresh and inactive-account Condemned types, the sign text, the vendor and barkeeper kill, the no-housing region, and the legacy path as code. It sets all entry times at refresh, where the donor draws each stage's time on entry. The `export {};` line used for the check is not shown.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Stage = "LikeNew" | "Slightly" | "Somewhat" | "Fairly" | "Greatly" | "IDOC" | "Collapsed";

// One decay period drives every stage. (Donor defect: its staged path ignores DecayPeriod.)
const PERIOD_S = 5 * 24 * 3600;

// Entry points as a fraction of the period: the donor's own legacy percent thresholds
// (0.5%, 25%, 50%, 75%, 95%, 100%).
const ENTRY: ReadonlyArray<readonly [Stage, number]> = [
  ["Slightly", 0.005],
  ["Somewhat", 0.25],
  ["Fairly", 0.5],
  ["Greatly", 0.75],
  ["IDOC", 0.95],
  ["Collapsed", 1.0],
];

// Frankendom default, not a donor value: +/-10% spread so plots do not all lapse together.
const JITTER = 0.1;

interface Plot {
  id: string;
  stage: Stage;
  next: number;        // index into ENTRY of the next entry point to apply
  entryAt: number[];   // absolute seconds for each ENTRY item, non-decreasing
}

// A refresh (owner pays or restores) restarts the clock at LikeNew.
function refresh(p: Plot, nowS: number, rand: () => number): void {
  p.stage = "LikeNew";
  p.next = 0;
  let floor = nowS;
  p.entryAt = ENTRY.map(([, frac]) => {
    const t = nowS + frac * PERIOD_S * (1 + JITTER * (2 * rand() - 1));
    floor = Math.max(floor, t); // never earlier than the entry before it
    return floor;
  });
}

// Runs once per minute over every plot, from the server tick (never from a read).
// Returns true when the plot must be removed this tick (donor: CheckDecay -> Decay_Sandbox).
function decayTick(p: Plot, nowS: number): boolean {
  while (p.next < ENTRY.length && nowS >= p.entryAt[p.next]) {
    p.stage = ENTRY[p.next][0];
    p.next++;
  }
  return p.stage === "Collapsed";
}
```

## 5. Lands in

- TARGET `origins/housing/plots.ts` (new): a plot is a zone row (place, owner, template id). `decayTick` runs from the server tick, once per minute, and removal happens there. The refresh is a server action that charges the owner's one ledger.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Only the zone-as-data part maps to row 23. The upkeep ledger and the staged decay have no row in the list of 1-23: this is a gap to raise with Lead, not a row I can cite.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (plot is a zone row); server-verified state (stage changes only from the server tick); one ledger (caps counted from one place)

Best transferable idea: Plots decay through named stages on a server tick with a timer per stage, and one owner refresh restarts the clock, so the owner sees a visible state change before anything is lost.
Decision (proposed): adapt - keep the staged decay and "refresh restarts the clock"; drop the account-wide auto-refresh (Frankendom has one character per ledger); derive every stage time from one period, as in the sketch.
Acceptance: With the sketch's 10 percent jitter, a server test with no refresh shows the plot not removed before day 4.5 and removed by day 5.5 (the Collapsed entry falls in 4.5 to 5.5 days after the refresh); a refresh at day 2 resets it to LikeNew and it is not removed before day 6.5 and is removed by day 7.5; the client sign (or plot panel) shows the stage name at each step.

## 6. Gaps and risks

- Defect 1 (donor): the staged path (ML) ignores `DecayPeriod`. Its durations are fixed constants in DynamicDecay.cs 14-19 (about 4.5 to 9 days in total), while `DecayPeriod` (five days, BaseHouse.cs 108) is used only on the legacy path (570) and the zero check (114). A house class that overrides `DecayPeriod` therefore keeps the default schedule on ML. Fix: one period drives all stage entries (sketch section 4).
- Defect 2 (donor, latent): removal is queued by the tick that sees Collapsed (a deferred timer, 633) and runs on the next timer pass, with no grace period. Frankendom's zone population already has a grace timer (row 23). Fix: reuse that grace timer before a plot is removed, not a new rule.
- Account-wide AutoRefresh (180): the newest house on an account never decays. This does not fit one character per ledger. Rejected; a plot's own refresh is the only way to keep it.
- Storage and lockdown caps count nested items (719). That is the right shape for a Frankendom storage cap (one place, counted at the server), but the counts are split across three sources (secures, lockdowns, vendor backpacks) and the donor notes the AOS/pre-AOS split. Keep one count for Frankendom.
- Placement is only partly read. The rule list is clear (42-370 return points, 103 comment), but branch bodies and region helpers are not read. The caller of `HousePlacement.Check` (which supplies the centre and the facing) was not read, so whether the server or the client chooses the spot is not confirmed.
- Instancing: not read as code. Houses are placed on the shared map and checked against regions (HousePlacement.cs 42-76), so the donor treats plots as world objects, not instances.
- Trophy display: not found. grep for "trophy" in the Multis folder returned no hits. The legend-trophy case has no donor evidence here.
- Phone-friendly placement UI: not read.
- Table costs and storage values (HousePlacementTool.cs 500-505) are short lines; the numbers are read but have no receipts of their own.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: zones as data; server-verified state; one ledger


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 'There is no grace period: the same tick that sees Collapsed removes the house' - CheckDecay starts Decay_Sandbox via Timer.StartTimer (BaseHouse.cs 633), a deferred timer, so removal is next timer run, not literally same tick (effect still no grace). All else verified.
Missed: ACCEPTANCE WOULD FAIL A CORRECT BUILD: 'a refresh at day 2 resets it to LikeNew and it is not removed before day 7.5'. In the sketch Collapsed entry is at 1.0 x 5 days x (1 +/-10%) = 4.5 to 5.5 days after refresh, so earliest removal after a day-2 refresh is day 6.5 (latest 7.5), not 'not before 7.5'. Test must say 'not before day 6.5' (or fix jitter). First clause (removed by 5.5 days) is OK. Also donor missed: UpdateDecay _wasUndecayable branch (240-251) treats leaving undecayable as a refresh.

Fixed 2026-10-12 (Sonnet fixer): acceptance rewritten with the jitter window (not before day 6.5, removed by day 7.5 after a day-2 refresh; first clause given a day-4.5 floor); the 'same tick' wording corrected to a deferred timer (633). Also found: leaving the undecayable state counts as a refresh (240-251). No sketch change. Not verified: nothing further.
