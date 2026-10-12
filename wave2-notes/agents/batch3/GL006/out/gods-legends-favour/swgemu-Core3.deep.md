# swgemu-Core3 (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/faction/FactionManager.cpp` (plus `objects/player/PlayerObjectImplementation.cpp`, `objects/tangible/terminal/components/HQMenuComponent.cpp`, `managers/player/PlayerManagerImplementation.cpp`; data `MMOCoreORB/bin/scripts/managers/faction_manager.lua`) | Licence: GNU AGPL v3 (COPYING file, read: "GNU AFFERO GENERAL PUBLIC LICENSE"); copyleft, clean-room shape only | C++ with Lua data | symbol `FactionManager::awardFactionStanding`, `PlayerObjectImplementation::increaseFactionStanding`

Checked: Read in full: `awardFactionStanding` (FactionManager.cpp 91-150), `awardPvpFactionPoints` (238-256), `getFactionPointsCap` (287-292), the whole relation table `faction_manager.lua` (1-82; 69 faction rows at lines 13-81). Read in part: `increaseFactionStanding` (PlayerObjectImplementation.cpp 2154-2208), `giveCoaBonus` (2210-2232), `decreaseFactionStanding` (2262-2280 and the cap lines 2306-2312 from grep), the second award path near FactionManager.cpp 160-236 (space factions, not fully read). Callers: `increaseFactionStanding` called from FactionManager.cpp 129, 211, 246, 251 and SuiManager.cpp 430, 433 (grep, not all read). `setFactionRank`: CreatureObjectImplementation.cpp 2071; the only setter read is the admin SetFaction command (SetFactionCommand.h 141, 157). Rank advancement from points was NOT located in what I read. Rank cost values live in `datatables/faction/rank.iff`, a binary IFF datatable; the cost values were not read. Confidence: high on the standing rules and caps; medium on what a rank does beyond gating; the rank-up path is open. camera_scope: n/a.

## 1. Mechanism

- Standing is a number per faction, kept in a list on the player object. Non-PvP factions are clamped to [-5000, 5000] (increase cap 5000 at PlayerObjectImplementation.cpp 2174; decrease floor -5000 at 2274). The two PvP factions, `rebel` and `imperial`, get a cap from `isPvpFaction` (`FactionStandingList.h` 104-106): the player's OWN PvP faction is capped at the rank cap (2181); the other PvP faction is capped at 1000 (2183).
- Rank cap: `max(1000, rankCost * 20)` (FactionManager.cpp 291). A rank index past the table returns -1 (288-289), which is a defect (see section 3).
- Kill of a faction NPC (`awardFactionStanding`, 91-150):
  1. `gain = level * adjustFactor` (105); `lose = gain * 2` (106). The adjust factor is a data row (faction_manager.lua).
  2. Each enemy faction in the row gains `gain` (114-129), unless the enemy is PvP and the victim is not a GCW faction (117-118), and unless the enemy row is not player-allowed (126-127).
  3. The victim's own faction loses `lose` (132).
  4. Each ally in the row loses `lose` (135-150), skipping PvP allies (138-140) and non-player-allowed rows (147-148).
- Clamp order on a gain (2154-2183): add the amount, then `min(cap, current + amount)`, with the cap chosen by faction. On a loss (2262-2280): `max(-5000, current - amount)`, then the PvP caps are applied again.
- PvP kill (`awardPvpFactionPoints`, 238-256): killer side +30 to its own faction (246), killer side -45 to the other faction (247), and the killed player also loses 45 of the other faction (249, 254 for the mirror case).
- COA bonus (`giveCoaBonus`, 2210-2232): when the player's own faction is the winning faction (2204), 10 percent of the gain is added on top of the current standing (2216-2222), capped by the rank cap (2224). `int bonus = amount * 0.1f` truncates, and a bonus under 1 is dropped (2216-2218).
- Rank-gated services: HQ terminal menu needs faction rank 4 (HQMenuComponent.cpp 90, 211) and rank above 7 for one action (183).
- Luck: the `force_luck` skill mod adds `cashCredits * luck / 20` to credit rewards (PlayerManagerImplementation.cpp 4237-4240). Integer division.
- Tick: none. Kills and mission rewards are events. The donor has no faction loop.

## 2. Key functions

- `awardFactionStanding`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/managers/faction/FactionManager.cpp` 91-150.
- `awardPvpFactionPoints`: same file, 238-256.
- `getFactionPointsCap`: same file, 287-292.
- `increaseFactionStanding`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/player/PlayerObjectImplementation.cpp` 2154-2208.
- `giveCoaBonus`: same file, 2210-2232.
- `decreaseFactionStanding`: same file, 2262-2312 (read 2262-2280).
- Relation data: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/bin/scripts/managers/faction_manager.lua` 1-82.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Kill gives standing to rivals, takes it from the victim and its allies, in a data table | gain = level * adjust; loss = 2 * gain (theirs, FactionManager.cpp 105-106) |
| Standing is clamped to a range; the player's own PvP faction has a rank-based cap | -5000 to 5000 (theirs, 2174, 2274); other PvP cap 1000 (theirs, 2183); rank cap max(1000, cost*20) (theirs, FactionManager.cpp 291) |
| PvP kills move both sides | +30 / -45 (theirs, FactionManager.cpp 246-247) |
| Winning side gets a 10 percent bonus on top of standing | 0.1 (theirs, PlayerObjectImplementation.cpp 2216) |
| Rank gates services | 4 (theirs, HQMenuComponent.cpp 90); 7 (theirs, 183) |
| Luck feeds income by a divisor | 20 (theirs, PlayerManagerImplementation.cpp 4240) |
| Relation table per faction: enemies, allies, adjust factor, player-allowed flag | 69 rows (theirs, faction_manager.lua 13-81) |

Defects found in the donor (keep the idea, fix each):
1. COA bonus truncation: `int bonus = amount * 0.1f;` (2216) turns any gain under 10 into zero, so small gains never earn the bonus. fix: keep the bonus as a float (round only for display).
2. A gain can lower a standing that is already above a cap: `newAmount = Math::min(1000.f, newAmount)` (2183) with `newAmount = current + amount` drops a standing that was earned in the own faction (above 1000) when the player switches or is capped. fix: `next = max(current, min(cap, current + amount))`, so a gain never lowers a value.
3. Invalid rank returns -1 (FactionManager.cpp 288-289). `Math::min(-1, x)` (2181, 2224) then sets standing to -1. fix: treat an out-of-range rank as rank 0 (cap 1000).
4. Luck uses integer division (4240): it rounds down, and tiny credit rewards get no bonus. Design choice, left as is.

## 4. TypeScript sketch

simplified: the sketch follows the donor order for one kill (gain, enemy raises with the PvP rule, victim lowered by twice the gain, allies lowered with the PvP skip). It omits the space-faction award path, the COA winner check (the bonus is a separate function here), the player-allowed flag on the victim row beyond the early return, the rank-up path, the -1 invalid-rank case (rank cost is passed in), messages, and the per-faction PvP cap of the decrease path. Defects 1 and 2 are fixed in the sketch; the 10 percent bonus stays fractional.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Faction standing per faction: a kill raises enemy factions, lowers the victim's faction by twice that, and lowers allies.
// PvP factions (rebel, imperial) are capped by the player's own rank; other PvP factions are capped at 1000.

const STANDING_MIN = -5000;   // data: floor for any faction
const STANDING_MAX = 5000;    // data: cap for non-PvP factions
const PVP_OTHER_CAP = 1000;   // data: cap for the PvP faction the player does not belong to
const PVP = new Set(["rebel", "imperial"]);

interface FactionRow {
  name: string;
  playerAllowed: boolean;
  enemies: string[];
  allies: string[];
  adjust: number;   // per-kill multiplier (data row)
}

type Standing = Map<string, number>;

interface Ctx {
  table: Map<string, FactionRow>;
  standing: Standing;
  ownFaction: string | null;   // the player's PvP faction, if any
  rankCost: number;            // cost of the player's current faction rank (data table, not read)
}

// Rank cap for the player's own PvP faction: max(1000, rank cost * 20).
function rankCap(rankCost: number): number {
  return Math.max(1000, rankCost * 20);
}

function capFor(ctx: Ctx, faction: string): number {
  if (!PVP.has(faction)) return STANDING_MAX;
  return faction === ctx.ownFaction ? rankCap(ctx.rankCost) : PVP_OTHER_CAP;
}

// Gains are clamped to the cap, but a gain never lowers a standing that is already above the cap.
// Fix to the donor: the donor writes min(cap, current + amount), which drops an over-cap value on a zero gain.
function raise(ctx: Ctx, faction: string, amount: number): void {
  const cur = ctx.standing.get(faction) ?? 0;
  const next = Math.max(cur, Math.min(capFor(ctx, faction), cur + amount));
  ctx.standing.set(faction, next);
}

function lower(ctx: Ctx, faction: string, amount: number): void {
  const cur = ctx.standing.get(faction) ?? 0;
  ctx.standing.set(faction, Math.max(STANDING_MIN, cur - amount));
}

// One NPC kill of faction `victim` at `level`.
function awardKill(ctx: Ctx, victim: string, level: number): void {
  const row = ctx.table.get(victim);
  if (!row || !row.playerAllowed) return;

  const gain = level * row.adjust;
  const lose = gain * 2;
  const victimIsPvp = PVP.has(victim);

  for (const e of row.enemies) {
    if (PVP.has(e) && !victimIsPvp) continue;   // PvP standing only moves from PvP kills
    const er = ctx.table.get(e);
    if (!er || !er.playerAllowed) continue;
    raise(ctx, e, gain);
  }

  lower(ctx, victim, lose);

  for (const a of row.allies) {
    if (PVP.has(a)) continue;
    const ar = ctx.table.get(a);
    if (!ar || !ar.playerAllowed) continue;
    lower(ctx, a, lose);
  }
}

// Cries-style bonus: 10 percent of a gain, on top of the faction that is winning.
// Fix to the donor: the donor truncates the bonus to an int, so gains under 10 give nothing.
// Here the bonus stays fractional; the display rounds it.
function coaBonus(ctx: Ctx, faction: string, amount: number): void {
  const bonus = amount * 0.1;
  if (bonus <= 0) return;
  raise(ctx, faction, bonus);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (typescript 7.0.2), exit 0, no output.

Best transferable idea: each kill moves a small set of rival and allied standings by a data-driven amount (rival up by the level, own and allies down by twice that), with the top end set by the player's rank, so a pantheon is a standing row and rank is a cap, not a lottery.
Decision (proposed): adapt — take the relation-table kill rule and the rank cap, but store the standings as ledger rows for each god, use the Frankendom kill events (server-verified), and fix the three defects in section 3. Reject the GCW-only PvP rule as written; keep the idea that PvP standing moves only on PvP kills.
Acceptance: server test: killing one level-10 NPC of pantheon A (adjust 1.0), with rival B and ally C, gives B +10, A -20 and C -20; a standing already above its cap is not lowered by a zero gain; a 10-point gain earns the 1-point COA bonus rather than none.

## 5. Lands in

- TARGET `src/fight/favour.ts` (new, engine award step; relation rows and caps as data). Parity-checklist row 18 (loot roll and XP award). The award is written server-side on the one ledger.
- today: none (Frankendom has no standing ledger yet).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, one ledger), 17-18 (award on a server-verified kill), GL focus items 1, 3, 5, 14.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the described mechanism.
- Rank-up from points is not located. The donor shows rank as a cap and a gate, and an admin command sets it; a Frankendom version needs its own rule for how a god's rank rises.
- The rank cost table (rank.iff) was not read, so the cap values (cost * 20) are formula only, not numbers.
- Pantheon rows: the donor's relation table is data (69 rows), which fits "a new god = data rows, no code", but the table itself is GCW and creature-type driven. Frankendom needs its own rows and a legends-rule review of every name.
- Frankendom has no PvP faction cap by rank yet; the rank cap would be a new rule in the engine.
- The relation table is per creature faction, not per zone. Zone data can override the adjust factor if a zone needs it.

## 7. GL focus table (gods-legends-favour, items 1-14)

| # | Item | Name | Effect | Formula | Number ranges | Gain / loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|---|
| 1 | Favour / piety | Faction standing per faction | standing row per faction; kill gives or takes | gain = level * adjust; loss = 2 * gain | range -5000 to 5000; PvP other cap 1000; rank cap max(1000, cost*20) | gain: rival factions on kill; loss: victim faction, allies; PvP kill +30/-45 | none found | FactionManager.cpp 105-106, 117, 129, 132, 138, 150, 246-247; PlayerObjectImplementation.cpp 2174, 2183, 2274 |
| 2 | Blessings / curses as timed rows | none found | no timed faction buff found in what was read | - | - | - | - | none (not established; buff path not read) |
| 3 | Patron choice and switching | none | no conversion cost, apostasy penalty or god anger found; a change of faction path was not read | - | - | - | - | none (not read: faction change path) |
| 4 | Divine domains / aspects | faction tags | the faction row carries the flags playerAllowed, enemies, allies, adjust | - | adjust 0.0 (fs_villager, sith_shadow) to 1.0 | - | - | faction_manager.lua 35, 70 |
| 5 | Boons at favour thresholds | rank-gated access | rank 4 gates the HQ menu, 7 gates one action | rank index gate | 4; 7 | rank rises | none | HQMenuComponent.cpp 90, 183, 211 |
| 6 | Legend signature powers | none | not in the faction code read | - | - | - | - | (not read) |
| 7 | Shapeshifting | none | no shapeshift in what was searched | - | - | - | - | none |
| 8 | Avatars / summons | pet deed | PetDeedImplementation.cpp matched "faction" (not read) | - | - | - | - | (not read) |
| 9 | Fate, luck, oaths | force_luck | cash reward multiplied by luck / 20 | cash += cash * luck / 20 | divisor 20 | reward event | none | PlayerManagerImplementation.cpp 4237-4240 |
| 10 | Underworld / death | corpse loot and clone | corpse loot commands found (LootPlayerCorpseCommand.h); clone and respawn rules not read | - | - | - | - | (not read) |
| 11 | Mounts | not read | - | - | - | - | - | (not read) |
| 12 | Relics | none | grep found only transaction log hits | - | - | - | - | none |
| 13 | Temples / shrines | Force Shrine name | a location is named "Force Shrine" from coordinates; service and offering not read | - | - | - | - | PlayerManagerImplementation.cpp 1698 |
| 14 | Pantheon factions, realm pride | standing, rank, HQ | faction rows, PvP factions, rank caps and HQ gate (rows 1 and 5) | see row 1 | see row 1 | see row 1 | none | FactionManager.cpp 91-150, 287-291; faction_manager.lua 13-81 |

Best transferable idea (table): row 1 (the kill relation table with rank caps) is the mechanism worth keeping; the blessing, patron and rank-up rows are not established.
Brief rule served: 1, 17-18, GL focus items 1, 5, 14.
