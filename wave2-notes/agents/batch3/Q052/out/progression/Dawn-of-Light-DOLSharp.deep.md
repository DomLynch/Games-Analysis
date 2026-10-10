# Dawn-of-Light-DOLSharp (progression, cell 10)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverrules/AbstractServerRules.cs` (`OnNPCKilled`, with `gameobjects/GamePlayer.cs` `GainExperience` and level code, `gameobjects/GameLiving.cs` tables, `serverproperty/ServerProperties.cs` defaults) | Licence: GPL-2.0 (repo LICENSE is the GNU GPL version 2 text; per-file headers and `gplheader.txt` not read) -> copyleft, clean-room only | C# | symbol `AbstractServerRules.OnNPCKilled`

Checked: Read in full: `OnNPCKilled` (AbstractServerRules.cs 1042-1326; the realm and bounty block 1128-1179 read but not detailed), `GetExperienceForLiving` (604-646, table and formula), `GamePlayer.GainExperience` override (4864-4998), `GetExperienceNeededForLevel` and the XP-to-level table (4664-4725, 4775-4830), `GameLiving` XP value and grey-con table (1314, 1362, 1474-1526, 1547-1560), base `GainExperience` (4514-4516), tuning defaults (ServerProperties.cs 835-860, 1944), and `GameTrainer.cs` 154-162. `GameNPC.IsWorthReward` (GameNPC.cs 3896-3938) was read in the checker pass. Callers: I read only the NPC-kill caller (1324); grep found other `GainExperience` callers (player-kill paths 1454 and 1665, `OnLivingKilled` and `OnPlayerKilled`, not read; GM and `/level` commands; guild XP; death XP loss at GamePlayer.cs 1631-1634), so the claims below about the whole pipeline hold for these callers only where I say so. Not read: `OnLivingKilled` (player-kill XP, 1335-1465), `ZoneBonus.GetXPBonus`, the body of `OnLevelSecondStage` (5238-5245 partly), the outpost-bonus constants (1287-1303 read, not checked against defaults), `Lord.ExceedXPCapAmount` (grep only). Confidence: high on the kill split, caps, camp counter and GainExperience order; medium on the level-up path (one `Level++` site read; no other level-raising site was searched for).

Best transferable idea: Split a kill's XP by damage share, cap each award at a percent of the monster's level value, and give a camp bonus that decays with repeat kills of the same spawn and resets after a quiet period; then grant the XP through one function that applies rates to the base only and keeps the XP at or above the level floor.

Decision (proposed): adapt - the damage-share split, the cap and the timed camp bonus fit Frankendom's server-verified kills (the server holds the damage ledger and computes the award once), but the camp counter must step once per kill, not once per gainer as in the donor (line 1257 runs inside the per-gainer loop, so a four-person kill drains it four times); the grouped full-value rule (line 1189) is rejected unless designed on purpose, because it can pay each grouped member a full NPC value regardless of damage share.
Acceptance: A server test kills one NPC with four in-range group members who each dealt damage, and asserts that the NPC's camp counter drops by exactly one 0.05 step and that each member's award equals base + camp + 12.5% x 4 with base capped at 125% of that member's table value.

## 1. Mechanism

- Gate: if the NPC is not worth reward (`IsWorthReward`, GameNPC.cs 3896-3938), the function only tells the damage dealers "no experience" and returns before any award (1054-1063). The NPC is not worth reward when: it was charmed recently (3900), its brain is a controlled (pet) brain (3902), it has no XP gainers (3906), any gainer that is a player has PrivLevel above 1 (a GM; 3914), or ANY gainer (a player, or a pet or other living) is grey con to the NPC (`IsObjectGreyCon`; 3918 for a player gainer, 3928 for any other living). So one grey-con attacker zeroes the kill for everyone.
- First pass over the damage ledger (`XPGainers`): total damage is summed; only active players within `MAX_EXPFORKILL_DISTANCE` (16384 units, WorldMgr.cs 59) count as in range (1078). Each group gets a count of its in-range members (1087-1090). `isGroupInRange` is true if any grouped in-range player other than the killer is present (1085). The highest-level grouped in-range player is recorded, and that player's con to the NPC is computed once before the loop (1106-1108).
- NPC values: `ExperienceValue` (= the monster XP table for the NPC's level, GameLiving.cs 1314), realm points, bounty points, and an exceed-cap multiplier (1100-1103).
- Second pass, once per gainer (loop 1111-1326; the camp-bonus decay sits inside this loop): necromancer pets are credited to their owner (1116-1121); out-of-range or inactive gainers are skipped (1123); the damage share is `damage / totalDamage` (1127). Realm and bounty points are paid in this loop (1128-1179, not detailed here).
- Base XP (1181-1189): a gainer who is not in a counted group gets `floor(NPC value x damage share)`. A gainer in a counted group gets the full NPC value (1189).
- Cap (1200-1242): `expCap` = monster XP value for the player's level x 125% (`XP_Cap_Percent`, default 125; 1200-1204). If the player is in a group and another grouped member is in range, the group cap percent applies (1206-1209). Challenge code (1230-1233): if the highest grouped player cons below the NPC (`highestConValue < 0`), the cap is replaced by the monster XP value for the level implied by that con. The cap is multiplied by the exceed-cap multiplier (1239), and `xpReward` is clamped to it (1241-1242).
- Camp bonus (1246-1271): `fullCampBonus` = `MAX_CAMP_BONUS` (0.55 default). If the NPC's spawn tick is more than 1800000 ms ago, the percent is 0.55 and the NPC's camp counter is set to 0.95 (1249-1252). Otherwise the percent is 0.55 x the counter, and the counter drops by 0.05 while it is at least 0.05 (1256-1257). Dungeon kills get x1.20, tested on the killer's zone (`killer.CurrentZone.IsDungeon`, 1262-1264). The percent is set to 0 below 0.01 and capped at 0.55 (1265-1269). `campBonus` = `floor(xpReward x percent)` (1270). The counter therefore decays per gainer, not per kill.
- Outpost bonus (1281-1303): within 16000 units of a keep, the owning guild gets 20% and the owning realm gets 10% (the realm case only on GST_Normal servers), plus a keep-wide 5% or 3% experience bonus, all of `xpReward / 100` times the percent (1283-1302).
- Group bonus (1305-1311): `groupExp` = `floor(0.125 x xpReward x members in range)` for a grouped gainer (1310).
- Sum and death (1318-1321): `xpReward += campBonus + groupExp + outpostXP` (1318); a dead gainer gets 25% (1320-1321).
- Award (1324): `GainExperience(NPC, xpReward, campBonus, groupExp, outpostXP, sendMessage, allowMultiply=true, notify=true)`.
- Grant (`GamePlayer.GainExperience`, 4864-4998): (a) refuse if `GainXP` is off (4866). (b) If `allowMultiply`: subtract the group, camp and outpost parts so only the base is multiplied (4873-4875); the zone bonus is granted separately with rate applied (4878-4887); the base is multiplied by `RvR_XP_RATE` in RvR zones or `XP_RATE` elsewhere (4890-4894); the ToA XP-points percent is added (4896-4900); the hard cap is `GetExperienceForLiving(Level) x 500%` (`XP_HardCap_Percent` default 500; 4902-4906); the parts subtracted in (b) are added back after the cap (4907-4909). (c) Champion XP (4914). (d) Catacomb classes below level 20 that can use slash level get x1.5 unless `ALLOW_CATA_SLASH_LEVEL` is set (4924-4935). (e) Base event fires (4938). (f) Floor (4940-4950): on a second stage hero the floor is `1 + XP-to-current-level + (XP-to-next-level - XP-to-current-level) / 2`; otherwise the floor is XP-to-current-level; a gain that would leave XP below the floor is raised so XP lands on the floor (this is how a death loss is capped). (g) `Experience += expTotal` (4976). (h) Level step (4978-4996): only for a gain that is zero or more; at level 5+ without class advancement no level is raised (4981-4987); at levels 40 to 49 with XP at the second-stage floor, the hero enters second stage (4989-4992); otherwise, if XP reaches XP-to-next-level, `Level++` runs once (4994-4996).
- Level table (GamePlayer.cs 4711-4725): XP to reach level n is `XPForLevel[n-1]`: 50 for level 2, 250 for level 3, ..., 169999999950 for level 50, with a sentinel 999999999950 above the cap (4679-4699, table 4711-4765). `MaxLevel` is 50 (4673).
- Grey con (GameLiving.cs 1474-1560): `NoXPForLevel[source level]` gives the highest target level that is grey to a source of that level (e.g. 6 at source level 10, 13 at 20, 35 at 50); above the table the test is a con of -3 or lower (1553-1558). This test is used for aggro and targeting (StandardMobBrain.cs 734) and, through `IsObjectGreyCon` at GameNPC.cs 3918 and 3928 inside `IsWorthReward`, by the XP path: the kill gate (1054) refuses all XP when any gainer is grey to the NPC.
- Caller behaviour seen: a trainer calls `GainExperience(Other, 0)` with the comment "//levelup" (GameTrainer.cs 154), so a zero-XP call is the trigger for a level step that was missed; the free-level XP for a trainer is the XP difference between the next two levels (GameTrainer.cs 160-162), granted through the two-argument overload, which does not multiply (GameLiving.cs 4538-4541).

## 2. Key functions

- `AbstractServerRules.OnNPCKilled`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverrules/AbstractServerRules.cs` 1042-1326. Damage ledger to XP, RP and BP awards.
- `AbstractServerRules.GetExperienceForLiving`: same file, 604-646. Monster XP per level: table lookup for levels inside the table (609-610); beyond the table, the formula (612-646) with constants chosen by level band: level 35 and up: k1 = 20, increment 0.2, base 35; 20 to 34: k1 = 15, increment 0.3334, base 20; 10 to 19: k1 = 10, increment 0.5, base 10; below 10: k1 = 0, increment 1, base 0; value = 2^(k1 + (level - base) x increment) x 5 (621-646, read).
- `GamePlayer.GainExperience` (override): `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GamePlayer.cs` 4864-4998. Rates, hard cap, floor, store, one-step level-up.
- `GamePlayer.GetExperienceNeededForLevel`, `GetExperienceAmountForLevel`, `XPForLevel`: same file, 4679-4699 and 4711-4765.
- `ExperienceForCurrentLevelSecondStage` and `LevelPermill`: same file, 4804-4806 and 4818-4823.
- `GameLiving.NoXPForLevel` and `IsObjectGreyCon`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameobjects/GameLiving.cs` 1474-1560.
- `GameLiving.XPForLiving` (monster table), `ExperienceValue`, base `GainExperience`: same file, 1362, 1314, 4514-4541.
- Tuning: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverproperty/ServerProperties.cs` 835-872 (rates) and 1944 (camp).
- `WorldMgr.MAX_EXPFORKILL_DISTANCE`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/WorldMgr.cs` 59.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage-share split of the NPC's XP, in range only | NPC value from the monster table (GameLiving.cs 1314); range 16384 units (WorldMgr.cs 59) |
| Grouped gainers get the full NPC value (donor rule, flagged in section 6) | Group bonus 0.125 per in-range member x base (AbstractServerRules.cs 1310) |
| Per-kill cap: percent of the monster XP value for the gainer's level | 125% solo (1200-1204, default 125 at ServerProperties.cs 835); 125% in a group (1209, default at 841) |
| Challenge cap: cap from the con-equivalent level when the top grouped member cons below the NPC | Con threshold below 0 (1230); the cap uses the level from con (1233) |
| Camp counter: decays per repeat kill, resets after a quiet window | Full bonus 0.55 (ServerProperties.cs 1944); window 1800000 ms (1249); counter 0.95 reset (1252); decay 0.05 (1257); floor 0.05 (1257) |
| Context multiplier on the camp bonus | Dungeon x1.20 (1263-1264); clamp 0.01 floor and 0.55 ceiling (1265-1269) |
| Dead gainer gets a quarter | 25% (1320-1321) |
| Rate multiplier on base only; hard cap after; extras added after | XP rate 1.0 default (ServerProperties.cs 859); hard cap 500% (4902; default 853) |
| XP never falls below the current level's start (second-stage midpoint at 40+) | Floor = XP to reach the level (4940-4950); second-stage midpoint formula (4806) |
| One level step per gain call; zero-XP call as the trigger | Level cap 50 (4673); XP table (4711-4765) |
| Grey con by source level; any grey gainer zeroes the kill (`IsWorthReward`, GameNPC.cs 3918, 3928) | NoXPForLevel table, 51 entries (1474-1526); 6 at level 10, 13 at level 20, 35 at level 50 |
| Monster XP per level | Table 1362 for levels below its length, formula 2^(k1 + (level - base) x inc) x 5 above it (AbstractServerRules.cs 621-646) |

## 4. TypeScript sketch

simplified: keeps the donor's order (worth-reward gate with the grey-con, staff, controlled and charmed tests, damage share or full value for grouped gainers, cap, challenge cap, camp per gainer, group bonus, dead quarter; then rates, hard cap, extras after the cap, floor, store, one-step level-up) but omits realm points, bounty points, the outpost bonus, the exceed-cap multiplier, the pet-to-owner mapping, the champion XP, the catacomb x1.5, the zone bonus, the ToA XP-points percent, the GainExperience event (so the donor's pre-floor event value is not modelled) and the class-advancement path beyond the level-5 gate; the monster XP table and the con-to-level conversion are passed in as functions instead of being reproduced; the 51-entry XP-to-level table is copied from the donor; the camp counter steps once per gainer, as the donor does, which section 6 rejects. The gate takes the grey-con test as a per-gainer flag (`greyToNpc`) computed by the caller from the donor's `NoXPForLevel` table; the xp-reward and cap level for a non-player gainer derive from that living's level (1200), which the sketch's `Gainer.level` stands for.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const MAX_LEVEL = 50;

// XP needed to reach level n is XP_TO_LEVEL[n - 1]. Index MAX_LEVEL is the sentinel above the cap.
const XP_TO_LEVEL: number[] = [0, 50, 250, 850, 2300, 6350, 15950, 37950, 88950, 203950, 459950, 839950, 1399950, 2199950, 3399950, 5199950, 7899950, 11799950, 17499950, 25899950, 38199950, 54699950, 76999950, 106999950, 146999950, 199999950, 269999950, 359999950, 479999950, 639999950, 849999950, 1119999950, 1469999950, 1929999950, 2529999950, 3319999950, 4299999950, 5499999950, 6899999950, 8599999950, 12899999950, 20699999950, 29999999950, 40799999950, 53999999950, 69599999950, 88499999950, 110999999950, 137999999950, 169999999950, 999999999950];

const CAMP_FULL = 0.55; // max camp bonus (server property default)
const CAMP_WINDOW_MS = 1800000; // a respawn older than this gets the full camp bonus
const XP_CAP_PCT = 125; // per-kill cap, percent of the monster XP value for the player's level
const GROUP_CAP_PCT = 125;
const GROUP_STEP = 0.125; // group bonus per in-range group member, times the base XP

interface Gainer {
  id: number;
  level: number;
  alive: boolean;
  groupId: number | null;
  damage: number;
  inRange: boolean;
  staff: boolean;     // donor: a player with PrivLevel above 1 zeroes the kill
  greyToNpc: boolean; // donor IsObjectGreyCon: the NPC is grey to this gainer (any gainer, player or pet)
}

interface Npc {
  charmedRecently: boolean; // donor: charmed within the no-XP timeout
  controlled: boolean;      // donor: the brain is a controlled (pet) brain
  xpValue: number;
  spawnTimeMs: number;
  nowMs: number;
  campBonus: number; // starts at 1, decays per gainer
  inDungeon: boolean;
}

interface Player {
  id: number;
  xp: number;
  level: number;
  advanced: boolean; // class advancement done (gate at level 5)
  secondStage: boolean;
}

function xpToReach(level: number): number {
  if (level > MAX_LEVEL) return XP_TO_LEVEL[MAX_LEVEL];
  if (level <= 0) return XP_TO_LEVEL[0];
  return XP_TO_LEVEL[level - 1];
}

// donor IsWorthReward: no XP and no award if charmed recently, controlled, nobody hit it, or any gainer is staff or grey con.
function isWorthReward(npc: Npc, gainers: Gainer[]): boolean {
  if (npc.charmedRecently || npc.controlled) return false;
  if (gainers.length === 0) return false;
  return !gainers.some((g) => g.staff || g.greyToNpc);
}

function campPercent(npc: Npc): number {
  let pct: number;
  if (npc.nowMs - npc.spawnTimeMs > CAMP_WINDOW_MS) {
    pct = CAMP_FULL;
    npc.campBonus = 0.95;
  } else {
    pct = CAMP_FULL * npc.campBonus;
    if (npc.campBonus >= 0.05) npc.campBonus -= 0.05;
  }
  if (npc.inDungeon) pct *= 1.2;
  if (pct < 0.01) return 0;
  if (pct > CAMP_FULL) return CAMP_FULL;
  return pct;
}

// Per-kill split. Grouped gainers take the full NPC value; solo gainers take their damage share.
// Returns the XP each gainer is owed before rates (rates are applied when the XP is granted).
function splitKill(
  npc: Npc,
  gainers: Gainer[],
  killerId: number,
  highest: { level: number; con: number } | undefined,
  livingXp: (level: number) => number,
  levelFromCon: (level: number, con: number) => number,
): Map<number, number> {
  if (!isWorthReward(npc, gainers)) return new Map<number, number>();
  const inRange = gainers.filter((g) => g.inRange);
  const totalDamage = gainers.reduce((t, g) => t + g.damage, 0);
  const groupSize = new Map<number, number>();
  for (const g of inRange) {
    if (g.groupId !== null) groupSize.set(g.groupId, (groupSize.get(g.groupId) ?? 0) + 1);
  }
  const groupInRange = inRange.some((g) => g.groupId !== null && g.id !== killerId);
  const awards = new Map<number, number>();

  for (const g of gainers) {
    if (!g.inRange) continue;
    const grouped = g.groupId !== null && groupSize.has(g.groupId);
    let base = grouped ? npc.xpValue : Math.floor(npc.xpValue * (g.damage / totalDamage));

    let cap = livingXp(g.level) * (grouped && groupInRange ? GROUP_CAP_PCT : XP_CAP_PCT) / 100;
    if (highest !== undefined && highest.con < 0) cap = livingXp(levelFromCon(g.level, highest.con)); // challenge code replaces the cap
    base = Math.min(base, Math.floor(cap));

    const camp = Math.floor(base * campPercent(npc)); // decays once per gainer, as in the donor loop
    const group = grouped ? Math.floor(GROUP_STEP * base * (groupSize.get(g.groupId as number) ?? 0)) : 0;
    let total = base + camp + group;
    if (!g.alive) total = Math.floor(total * 0.25);
    if (total > 0) awards.set(g.id, total);
  }
  return awards;
}

// Grants XP to a player. Rates apply to the base only; extras are added after the hard cap.
function grantXp(p: Player, base: number, extras: number, allowMultiply: boolean, xpRate: number, hardCapPct: number, livingXp: (level: number) => number): number {
  let amount = base;
  if (allowMultiply) {
    amount = Math.floor(amount * xpRate);
    const hardCap = Math.floor(livingXp(p.level) * hardCapPct / 100);
    if (amount > hardCap) amount = hardCap;
  }
  amount += extras;

  const floor = p.secondStage
    ? 1 + xpToReach(p.level) + Math.floor((xpToReach(p.level + 1) - xpToReach(p.level)) / 2)
    : xpToReach(p.level);
  if (p.xp + amount < floor) amount = floor - p.xp; // a loss never takes XP below the floor

  p.xp += amount;
  if (amount >= 0) {
    const secondFloor = 1 + xpToReach(p.level) + Math.floor((xpToReach(p.level + 1) - xpToReach(p.level)) / 2);
    if (p.level >= 5 && !p.advanced) {
      // blocked until class advancement; XP is still stored
    } else if (p.level >= 40 && p.level < MAX_LEVEL && !p.secondStage && p.xp >= secondFloor) {
      p.secondStage = true;
    } else if (p.level < MAX_LEVEL && p.xp >= xpToReach(p.level + 1)) {
      p.level += 1; // one step per call; a zero-XP call catches up one more level
    }
  }
  return amount;
}
```

## 5. Lands in

- TARGET `src/fight/xp-award.ts` (new module: the kill split and the grant, one ledger; the Pit and zones are clients). Parity-checklist row 18 (loot roll and XP award), sub-line: the XP award is computed once, server side, from the verified damage ledger, and the camp counter is stored on the NPC instance.
- Zone data: the dungeon camp multiplier (1.20) is per zone, so it belongs in zone data; the other numbers are engine constants.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (one award per gainer per kill, computed once) and server-verified kills (the server holds the damage ledger; the client never sends an award).

## 6. Gaps and risks

- Licence GPL-2.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- The camp counter decays once per gainer (line 1257 inside the loop from 1111). A four-person kill therefore drains the counter four times. Frankendom should step it once per kill and test that.
- Grouped gainers get the full NPC value (line 1189), not their damage share. With the group bonus (1310) a group can be paid more than the NPC is worth, up to the 125% cap plus 12.5% per member. Frankendom must choose this on purpose; the default in the sketch follows the donor.
- Server-verified: the donor trusts the in-process damage map (`XPGainers`). Frankendom must build the damage ledger from server-verified hits and award once; the award must not depend on any client report.
- Zones as data: the 125% cap, the 0.55 camp bonus, the 0.05 decay and the 1800000 ms window are server properties in the donor (ServerProperties.cs); Frankendom makes them engine constants, and only the dungeon multiplier is zone data.
- One level per gain call: the donor raises at most one level per call (line 4994-4996), and its own trainer uses a zero-XP call to catch up (GameTrainer.cs 154). Frankendom should compute all level-ups from one XP write, not rely on repeated calls.
- The floor (4940-4950) makes a loss stop at the current level's start. That is a rule to keep, but it is applied after the event in the donor, so any listener sees the pre-floor value. Frankendom's ledger should write the floored amount only.
- Not read: `OnLivingKilled` (player kills, 1335-1465), `ZoneBonus.GetXPBonus`, the outpost constants against their defaults, the death XP setter, and `OnLevelSecondStage` in full. The player-kill rules may differ from what is written here.
- MAX_ATTACKERS = 3 has no direct counterpart here; the damage ledger here is unbounded, so Frankendom's cap on attackers must be applied before the split.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Verified most of OnNPCKilled 1042-1326, GainExperience 4864-5000, caps 125/125/500 and 0.55 camp (ServerProperties 835/841/853/1944), camp 1800000/0.95/0.05, dungeon x1.2, group 0.125, dead 25%, level table 4711-4764 (sketch array identical to donor), NoXPForLevel values 6/13/35, MAX_EXPFORKILL_DISTANCE 16384, GetExperienceForLiving 604-646 constants, GPL-2. Errors: (1) FALSE claim: 'Grey con ... used for aggro and targeting (GameNPC.cs 3918, 3928). The XP path read above does not use it.' Lines 3918/3928 are inside GameNPC.IsWorthReward (3896-3938), which OnNPCKilled calls as its first gate (1054): the kill gives NO XP and no loot if ANY xp gainer (player or pet/living) is grey con to the NPC (IsObjectGreyCon), or a gainer has PrivLevel>1, or the NPC is a controlled brain, or XPGainers is empty. The note lists IsWorthReward as 'not read' and describes the gate as only 'charmed recently'. The sketch has no gate at all. (2) Prose says XP to reach level 50 is '169999950'; real value is 169999999950 (sketch table is right). (3) Dungeon multiplier uses killer.CurrentZone.IsDungeon (1262), the killer's zone, not stated.

**Missed:** IsWorthReward gate (any grey-con gainer zeroes the whole kill, GM-attacked kills pay nothing, charmed pets worth nothing) - this is the simplest and most important anti-abuse rule in the file and is absent from the sketch. Also xpReward/level cap derive from living.Level for non-player gainers (1200).
