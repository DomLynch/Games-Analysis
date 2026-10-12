# WarEmu-WarEmu (pvp-ranking-seasons-matchmaking, cell 3)

Donor: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/Managers/WorldMgr.cs` (award) with `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Player.cs` (rank-up) | Licence: GNU GPL, version 2 or later, per the header of `Common/Database/World/Levels/Renown_Info.cs` (lines 4-5); no LICENSE or COPYING file in the donor box root (listing checked); WorldMgr.cs head (lines 1-12) has no licence text; other files not checked for headers | C# | symbols `WorldMgr.GenerateRenownCount`, `Player.AddRenown`, `Player.RenownUp`, `Group.AddRenown`

Checked: Opened and read end to end: WorldMgr.cs 556-600 and 615-660 (XP and renown award functions; 601-614 not read), Player.cs 466-484 (kill call site) and 600-640 (renown add and rank-up), Group.cs 287-330 (group XP and renown split), Renown_Info.cs (whole file). Grep only: CharacterHandlers.cs 97, GameData.cs 2832, LootsMgr.cs 132 and InventoryHandlers.cs 88-93 (rank floors on loot and equipment, not opened in full). Searched the C# tree (WorldServer, Common) for matchmaking, Elo, Glicko, rating, ladder, leaderboard, tournament, season, bracket: none found (the only hits are protocol-generated XML and the word "rating" in unrelated text). So this donor has NO matchmaking, no Elo, no seasons and no leaderboards; what it has is a kill-based PvP rank (renown rank) with a rank-up table. Confidence: high on the award and rank-up code (read in full, one defect confirmed by reading the code paths). Medium on the verdict: it is a rank progression, not a ladder. Not read: LobbyServer, Launcher, the database rows for renown_infos (the threshold values), and any caller of GenerateRenown other than Player.cs 479.

## 1. Mechanism

- Trigger: when a player dies to another player (Player.cs 479, inside `SetDeath`, only if the killer is a player), the server calls `WorldMgr.GenerateRenown(killer, victim)`.
- Award (WorldMgr.cs 627-638): zero if killer or victim is null or they are the same player (629). Otherwise `RP = victimRenownRank x 4 + victimLevel x 6` (632-635). The victim's rank and level set the reward, not the killer's. If the config rate is above 0, RP is multiplied by it (638).
- Solo or group (Group.cs 308-326): the killer and any member within a distance of 100 of the killer (314, 322) are counted as `activePlayers`. Each counted member then gets `GenerateRenownCount(member, victim) / activePlayers` (324), an unsigned integer division, so the share is rounded down. The killer is among the counted members (`Plr == Killer`).
- Adding points (Player.cs 616-624): if `stored + gain > CurrentRenown.Renown` (threshold for the current rank), the code calls `RenownUp(stored + gain - threshold)` (618-619). Otherwise it adds the gain to the stored total (622) and sends the update.
- Rank-up (626-633): `CurrentRenown` is loaded for rank+1 (628). If that is null (no such rank) it returns (629-630). Otherwise it sets the rank (`SetRenownLevel`, 611 region) and calls `AddRenown(Rest)` (633).
- Numbers worked from the code: victim rank 3 and level 40 gives 3 x 4 + 40 x 6 = 252 RP before the rate. Three counted players (killer plus two within 100) get floor(252 / 3) = 84 each.

Start: new characters get renown 0 and rank 1 (CharacterHandlers.cs 96-97). Max rank text in the client strings is 100 (GameData.cs 2832-2833; the table itself was not read).

Other rank floors seen (grep only): loot is gated by `MinRank > Level + 4` or `MinRenown > (Level + 4) x 2` (LootsMgr.cs 132); equipment is gated by the player's level and renown rank (InventoryHandlers.cs 88-93). XP gives nothing if the killer is more than 8 levels above the victim (WorldMgr.cs 574-575); the renown award has no such cut-off.

## 2. Key functions

- `WorldMgr.GenerateRenownCount`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/Managers/WorldMgr.cs` 627-640 (read).
- `WorldMgr.GenerateRenown`: same file, next function (read; calls `AddRenown` directly or the group version).
- `Player.SetDeath` renown call: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Player.cs` 466-484 (read).
- `Player.AddRenown` and `Player.RenownUp`: same file 605-633 (read).
- `Group.AddRenown`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Group.cs` 308-326 (read).
- Threshold table: `/mnt/frankendom-donors/WarEmu-WarEmu/Common/Database/World/Levels/Renown_Info.cs` (read; the class maps `Level` to `Renown`, table `renown_infos`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Kill reward scales with the victim's rank and level (rewards hitting the high-rank player more) | 4 per victim rank, 6 per victim level (theirs, WorldMgr.cs 635) |
| Global rate multiplier applied after the formula | RenownRate from config (theirs, WorldMgr.cs 638) |
| Group share: award divided by active members, rounded down | Active distance 100 (theirs, Group.cs 314) |
| Rank-up table: a threshold per rank, overflow carried into the next rank | Thresholds from the renown_infos table (not read: values) |
| Rank starts at 1 with 0 points | 1 and 0 (theirs, CharacterHandlers.cs 97, 96) |
| Max rank | 100 in client text (theirs, GameData.cs 2832); cap behaviour is in the code, see section 6 |
| XP level-gap cut-off (for comparison, not renown) | 8 levels (theirs, WorldMgr.cs 574) |

## 4. TypeScript sketch

simplified: the sketch keeps the victim-scaled award, the rounded-down group share and the rank-up with overflow. It differs from the donor in one place on purpose (the fix for the rank-up defect in section 6): it resets the stored progress when a rank is reached and adds only the overflow, and at the cap it stores nothing instead of nulling the threshold. It omits the distance check (the group share is passed in as a count), the XP side, the same-player and null checks (the caller passes two distinct players), the quest hook and the death timer.

```ts
// Licence: GPL-2.0-or-later (per the Renown_Info.cs header; no licence file in the donor box). clean-room sketch from the described rule, not a translation.
// clean-room
interface Renowner {
  rank: number;     // renown rank, 1 to maxRank
  points: number;   // points inside the current rank
}

const RP_PER_VICTIM_RANK = 4;   // donor: victim renown rank x 4
const RP_PER_VICTIM_LEVEL = 6;  // donor: victim level x 6

// Points for one kill, from the VICTIM's rank and level (the donor scales by victim, not killer).
function renownAward(victimRank: number, victimLevel: number, rate: number): number {
  if (rate <= 0) rate = 1;
  return (victimRank * RP_PER_VICTIM_RANK + victimLevel * RP_PER_VICTIM_LEVEL) * rate;
}

// Group split: each active member gets the award divided by the active count, rounded down.
function groupShare(award: number, activeMembers: number): number {
  return Math.floor(award / Math.max(1, activeMembers));
}

// thresholds[r] = points needed to leave rank r (rank is 1-based; index 0 unused).
// Fix for the donor: the overflow is carried into a reset progress counter, not added to the old one,
// and the cap keeps a valid threshold (the donor sets its threshold to null at the cap).
function addRenown(r: Renowner, gain: number, thresholds: number[], maxRank: number): Renowner {
  let rank = r.rank;
  let points = r.points + gain;
  while (rank < maxRank && points >= thresholds[rank]) {
    points -= thresholds[rank];
    rank += 1;
  }
  if (rank >= maxRank) return { rank: maxRank, points: 0 };  // at the cap, surplus is not stored (explicit)
  return { rank, points };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/pv002-waremu-renown.ts): exit 0, no output.

## 5. Lands in

- TARGET `src/fight/renown.ts` (new module: the kill award, the group share and the rank-up for the PvP career rank). Parity-checklist row 18 (loot roll and XP award): the renown award is the non-loot reward written on the same kill. Frankendom's current career rank code: (not read).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later per header; clean-room, shape only; no donor lines)
- Brief rule served: 1 (one ledger: one server-side award per verified kill; the client only shows the rank bar). Ruling "server-verified kills" applies to the trigger.

## 6. Gaps and risks

- GPL header: clean-room only. The sketch is written from the described rule.
- No matchmaking, Elo, season, leaderboard or tournament in this donor (C# grep). The renown rank is a progression rank earned per kill, so the rank rows must come from another donor for ladders, seasons and matchmaking.
- Defect, confirmed in the code (Player.cs 618-633): on rank-up the stored total is never reset. `RenownUp` passes `stored + gain - threshold` into `AddRenown`, which then adds it to the same stored total, so the old progress is counted again. Example with hypothetical numbers: rank threshold 1000, stored 900, kill gives 200. The overflow is 100, but after rank-up the stored total becomes 900 + 100 = 1000 instead of 100. Fix: reset stored points on rank-up and add only the overflow (sketch `addRenown`).
- Defect, confirmed in the code (Player.cs 626-633): `RenownUp` assigns `CurrentRenown` from the table for rank+1 before checking it, so at the top rank it becomes null and returns. The next `AddRenown` (618) or `SendRenown` (844) dereferences `CurrentRenown`, which is a null-reference risk. Fix: check the table before assigning, and keep the cap threshold.
- Risk, not verified: `activePlayers` is counted only over members that are the killer or within distance 100 (Group.cs 314, 322). If the killer is not in `Members`, the count can be 0 and the unsigned division fails. The code path that could make the killer absent was not read.
- Each group member's share is rounded down (Group.cs 324), so each member loses under 1 point per kill and the fraction is never carried. Fix if Frankendom cares: carry the remainder, the same way as the rating carry in the TrinityCore cell.
- Rewarding by the victim's rank is a farming risk: killing one high-rank player again and again pays the same each time, with no cooldown or diminishing return in this code. Frankendom needs an anti-repeat rule (for example per victim per day) as data.
- No level-gap cut-off on renown. XP has one (8 levels, WorldMgr.cs 574) and renown does not. Decide on purpose.
- The rank table (renown_infos) values were not read, so the thresholds, and the total RP needed to reach rank 100, are unknown.
- The client-facing cap text says rank 100 (GameData.cs 2832). The table and the server cap were not read to confirm 100.

Best transferable idea: pay each kill in rank points scaled by the victim's rank and level, split among nearby group members by rounded-down division, and carry any rank-up overflow into a reset progress counter.
Decision (proposed): adapt - the victim-scaled award and the overflow rank-up give the PvP career rank a reason to hunt strong players; the donor's stored-total defect and null cap are fixed, and an anti-repeat rule is added because the donor has none.
Acceptance: a server test kills the same rank-3 level-40 victim twice and sees 252 points each time (with a repeat rule that lowers the second award), a stored 900 of 1000 plus 200 lands at rank+1 with 100 points, and a rank at the cap stores nothing and raises no error.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later header; clean-room, shape only)
Brief rule served: 1 (one ledger: the server writes the award once per verified kill; the client reads the rank)
