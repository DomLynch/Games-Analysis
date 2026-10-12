# WarEmu-WarEmu (gods-legends-favour, cell 3)

Donor: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/Managers/WorldMgr.cs` (`GenerateRenownCount` 627-641, `GenerateRenown` 643-656), with `WorldServer/World/Objects/Group.cs` (`AddRenown` 308-327), `WorldServer/World/Objects/Player.cs` (`SetDeath` 470-484, renown 605-636), `Common/Database/World/Levels/Renown_Info.cs` | Licence: unclear as a repo: `Renown_Info.cs` and `Player.cs` carry GNU GPL v2 or later headers; `WorldMgr.cs` and `Group.cs` (the award code) have no licence header; no LICENSE file in the repo root. Treated as restricted: clean-room, shape only | C# | symbol `WorldMgr.GenerateRenown`, `Player.AddRenown`, `Group.AddRenown`

Checked: read in full `WorldMgr.cs` 627-656, `Group.cs` 286-327, `Player.cs` 466-484 and 603-636, `Renown_Info.cs` (header and fields 29-45), `Unit.cs` 671 and 676-686, `InventoryHandlers.cs` 80-100, `ItemsInterface.cs` 690-700, `WorldConfigs.cs` 50 (grep), `LootsMgr.cs` 132 (grep line), `Realm.cs` 36-44 (grep), `CharacterHandlers.cs` 96-97. Candidates opened: 8. Not read: the threshold rows themselves (the renown table is loaded from the database; no rows in the repo), the distance units behind `GetDistance`, the quest kill event, the XP body after the in-range count in `Group.AddXp` (only its count loop was read), the GM commands, the renown packet. Confidence: high on the award formula, group split and the rank-up code path; medium on whether the stored total is meant to reset on rank-up (that depends on the threshold table, which is not in this repo). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- Trigger: a player's death (`Player.SetDeath`, Player.cs 470). The death packet sets the auto-resurrect timer to 600 seconds (472). If the killer is a player, `WorldMgr.GenerateRenown` runs (478-479). Player kills only; creature kills are not read to give renown.
- `GenerateRenown` (WorldMgr 643-656): if the killer or victim is missing, or they are the same player, it returns (645-646). A killer with no group gets the full count (648-650). A killer in a group hands the award to `Group.AddRenown` (654).
- Award size, `GenerateRenownCount` (627-641): `RP = victimRank x 4 + victimLevel x 6` (632-635). If `RenownRate` is above 0 the count is multiplied by it (637-638); the config default is 1 (WorldConfigs.cs 50). A self-kill or missing victim gives 0 (629-630).
- Group split, `Group.AddRenown` (308-327): first count the members who are the killer or within distance 100 (310-318). Then each of those members gets `GenerateRenownCount(member, victim) / activePlayers` (320-325, 324). Integer division rounds down, and the remainder is lost.
- Standing and rank, `Player.AddRenown` (616-625): if stored total + gain is above the current rank's threshold (618), `RenownUp(stored + gain - threshold)` runs (619). Otherwise the gain is added to the stored total and sent (622-623).
- `RenownUp` (626-634): loads the next rank's threshold row (628). If there is no next row (top rank) it returns (629-630), and the gain is dropped. Otherwise it sets the next rank (632) and calls `AddRenown` with the carried remainder (633).
- The stored total is never reset on rank-up (only written at 622, and set to 0 at character creation in CharacterHandlers.cs 96). Example by hand, not run: threshold 1000, stored 990, gain 50. The rank-up passes 40 on, and the new rank shows 990 + 40 = 1030, not 40. This is a defect if thresholds are per rank (see section 6).

## 2. Key functions

- `GenerateRenownCount`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/Managers/WorldMgr.cs` 627-641.
- `GenerateRenown`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/Managers/WorldMgr.cs` 643-656.
- `Group.AddRenown`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Group.cs` 308-327 (same in-range count as `Group.AddXp` at 287-300).
- `Player.AddRenown` and `RenownUp`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Player.cs` 616-634.
- `Player.SetDeath`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Player.cs` 470-484.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Kill award scales with victim tier and level | 4 per victim rank and 6 per victim level (theirs, WorldMgr 635). Example by hand: rank 10, level 40 gives 40 + 240 = 280 |
| Global award multiplier | Rate 1 (theirs, WorldConfigs 50); applied only when above 0 (WorldMgr 637) |
| Party share: in-range count, integer division | Range 100 (theirs, Group 314; unit not read); divisor = in-range count including the killer (Group 310-318) |
| Rank-up when the total passes a per-rank threshold | Threshold is a database column per rank (theirs, Renown_Info 42); values not in the repo |
| Top rank drops further gains | No next row returns (theirs, Player 629-630) |
| Death: timed auto-resurrect | 600 seconds (theirs, Player 472) |
| Loot gate by renown relative to corpse level | MinRenown must not exceed (corpse level + 4) x 2 (theirs, LootsMgr 132). Example by hand: corpse level 30 gives a cap of 68 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the award formula, the group division by the in-range count (which the caller passes in, the range test is left out), and the rank-up loop with the donor's strict "above threshold" test. It drops the database rows, the distance check, the quest kill event, the packets, the GM commands, the loot and item gates, and the config read (the rate is a parameter). It changes one thing on purpose: on rank-up the progress is reset to the overshoot, where the donor keeps the old total and adds the overshoot on top. At the top rank the sketch stops the gain and drops the excess, as the donor does; the donor freezes the stored total at the threshold, which gives the same visible result. The file is checked on the VPS with `tsc --noEmit --strict --target es2020` (exit 0).

```ts
// Licence: unclear in the donor (GPL-2.0-or-later on two files, no header on the renown code files, no repo LICENSE). Clean-room: re-expressed from the mechanism, not translated.
interface Standing { rank: number; progress: number }   // rank 0..need.length; need.length is the top rank

// Kill award for a player kill: scales with the victim's rank and level. rate is the server config (default 1).
function killAward(victimRank: number, victimLevel: number, rate: number): number {
  return (victimRank * 4 + victimLevel * 6) * rate;
}

// Group share: every in-range member (killer included) gets the award divided by the in-range count, rounded down.
function groupShare(award: number, inRangeCount: number): number {
  return Math.floor(award / inRangeCount);
}

// need[r] = points to leave rank r (data, one row per rank). Donor rule: rank up when progress is strictly above need.
// fix: the donor keeps the old total on rank-up and adds the overshoot on top, which double-counts. Here the
// progress is reset to the overshoot. At the top rank gains stop and the excess is dropped, as in the donor.
function addStanding(s: Standing, gain: number, need: number[]): Standing {
  let rank = s.rank;
  let progress = s.progress + gain;
  while (rank < need.length && progress > need[rank]) {
    progress -= need[rank];
    rank += 1;
  }
  if (rank >= need.length) return { rank: need.length, progress: 0 };
  return { rank, progress };
}

export {};
```

Best transferable idea: a kill pays a standing award that scales with the victim's rank and level, is split across in-range party members by integer division, and ranks up on per-rank thresholds with the overshoot carried, so favour is earned by kills and shared by a party.

Decision (proposed): adapt - take the award formula shape, the in-range party split and the rank thresholds as the favour ledger on a kill; reject the donor's carry arithmetic (it double-counts) and fix it by resetting progress to the overshoot; drop the donor's numbers (4, 6, range 100) and make them data.

Acceptance: a solo kill of a rank-10, level-40 player gives the killer 280 standing; the same kill in a party of three, all in range, gives each 93 (280 / 3, rounded down); with a threshold of 1000, standing 990 and a gain of 50, the player ranks up and shows 40 progress, not 1030; at the top rank the gain stops and nothing carries. A server test asserts each number.

Reuse tag: rewrite-from-idea (restricted: unclear licence, clean-room only)
Brief rule served: GL-FOCUS 1 (favour gained by kill and split by the party) and 5 (boons at favour thresholds, ranks not random); the award is server-side on a server-verified kill; the rank rows are data.

## 5. Lands in

- TARGET `src/fight/standing.ts` (new module: the kill award and the rank ledger, server side, on the one character ledger). Parity-checklist row 18 (loot roll and XP award).
- The kill award runs after the server verifies the kill (row 18 award step); the party split uses the same in-range rule as the shared XP share.
- Data: award constants, the party range and the rank threshold rows are zone or catalogue data. The respawn timer (600 s in the donor) is a death-rule value for row 17, not a constant in this module.

## 6. Gaps and risks

- Licence unclear: clean-room only. The sketch is a re-expression, not a copy.
- Defect 1 (kept idea, fixed): rank-up does not reset the stored total (Player.cs 618-633). If thresholds are per rank, a 990 + 50 gain against a 1000 threshold shows 1030 at the new rank, where 40 is right. If the thresholds are cumulative, the donor's arithmetic is still off, because the gain is not added before the rank-up. Either way, the sketch resets progress to the overshoot. Check the threshold table semantics before porting numbers; the table is not in this repo.
- Defect 2 (kept idea, fixed): the item use gate compares the player's `Rank` with the item's `MinRenown` (InventoryHandlers.cs 93). `Rank` is the unit's class tier set from faction (Unit.cs 671, 684), not renown. The other gate (ItemsInterface.cs 696) compares `Renown`, which is correct. Fix: one gate, on renown.
- Remainder loss: the integer division drops the remainder of each party share (for example 280 split three ways loses 1 point). State the rounding rule in the spec; the sketch rounds down on purpose.
- The party range (100) is a distance in donor units that were not read. Frankendom must choose its own range in the zone data, and the in-range count must be computed on the server, not from client positions.
- Frankendom rulings: the award is server-verified and one ledger. Kill credit by top damage contributor (the HeroPoints idea in cell 2) is a different rule; do not mix the two without a ruling.
- Realm bonus columns exist (Realm.cs 41-42, strings "0") with no use found in WorldServer (grep). Not read further.
- The donor has no creature-kill renown; if Frankendom wants standing from NPC kills, that is a new rule, not this mechanism.
