# kcopelandmgmt-Shadowbane (gods-legends-favour, cell 3)

Donor: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/Shrine.java` (with `engine/objects/Boon.java`, `engine/net/client/handlers/MerchantMsgHandler.java`, `engine/workthreads/HourlyJobThread.java`, `engine/gameManager/BuildingManager.java`, `engine/net/client/handlers/ObjectActionMsgHandler.java`) | Licence: MIT (repo LICENSE: "MIT License", permission grant at line 11; README "released under an MIT license"); Java source headers say "Magicbane Emulator Project 2013 - 2022" | Java | symbol `Shrine.addFavor` / `Shrine.takeFavor` / `MerchantMsgHandler.requestBoon`

Checked: Read `Shrine.java` 24-130 and 130-203 (race and class gate in `canTakeFavor`, 44-203), 204-310 (`decay`, `addFavor`, `takeFavor`), 311-317 (ordering and rank); getters at 319-353 not read. Read `Boon.java` (whole file, 59 lines) and `dbBoonHandler.java` 25-53. Read `MerchantMsgHandler.java` 96-215 (hermit blessing and `requestBoon`). Read `ObjectActionMsgHandler.java` 355-392 (offering). Read `HourlyJobThread.java` 36-69 (`decayShrines`), 186-215 (run loop start), 240-266 (the decay trigger). Read `BuildingManager.java` 170-232 (`lootBuilding`). Read `Enum.java` 1492-1504 (ShrineType header only) and 1541-1552 (accessors). Callers checked: `decay` (one call, HourlyJobThread.java:69), `takeFavor` (one, MerchantMsgHandler.java:184), `canTakeFavor` (one, 181), `addFavor` (one, ObjectActionMsgHandler.java:377). `lootBuilding` callers: not fully checked. Not read: `PowersManager.applyPower` (the last argument's unit is unknown, so `trains` is "(not read)"), the `MINE_LATE_WINDOW` constant value, the full ShrineType list, the rest of `HourlyJobThread.run`. Candidates opened: `Shrine.java`, `Boon.java`, `MerchantMsgHandler.java`, `HourlyJobThread.java`, `BuildingManager.java`, `ObjectActionMsgHandler.java`, `Enum.java`. Confidence: high for the offering, pool, claim and rank rules (read end to end); high for the decay trigger; medium on the power's unit. camera_scope: not a camera cell.

Best transferable idea: A shrine is a city-owned place with a favour pool that members fill by offering boon items, ranked by pool size so the top shrines decay daily and the rank sets a claimed power's strength, and each claim spends one favour.
Decision (proposed): adapt - take the offering-to-pool, rank-scaled claim and daily decay of top ranks as shrine zone rows and one favour ledger row; reject the guild-only and city-owner loot as-is, since Frankendom has no guilds that own cities; fix the donor's unguarded debit and its truncating decay in the sketch.
Acceptance: A server test: an item with a boon amount of 10 and count 2 adds 20 favour to a shrine of its type and is removed from the player's bag; a rank-0 claim gives a 40-count power, rank 1 gives 30, rank 2 gives 20, and a claim on an empty shrine is refused with the favour unchanged; a pool of 1 decays to 1 (rounded), not 0.

## 1. Mechanism

- A shrine is a building with one favour pool (`private Integer favors`, Shrine.java:29), stored per building (`shrinesByBuildingUUID`). Shrine types are an enum with a blueprint id, a power token and a race-or-class flag (Enum.java:1492; `getPowerToken` at 1545). Only one shrine of a given type can exist in a city: the placement code loops over the city's buildings (PlaceAssetMsgHandler.java:928-955) and refuses with the text "shrine of that type exists" (955).
- Patron gate, `canTakeFavor` (Shrine.java:44-203): a race shrine is for one race ID set (`if (shrine.shrineType.isRace())` at 46; e.g. Aelfborn at 50); a class shrine is for one promotion-class ID (switch at 110). A character can claim only the shrine that matches its race or its class. No switching path was found.
- Offering, `addFavor` (Shrine.java:249-290), in order: refuse null owner or item (250-257); the item must be owned by the owner (262); its item base must have a boon list (`Boon.GetBoonsForItemBase`, cached per item base from `static_item_boons`, dbBoonHandler.java:34); the list entry for this shrine type gives `amount`; `amount = boon.getAmount() * boonItem.getNumOfItems()` (278); the DB write runs first (updateFavors) and then `favors += amount` (286), and the item is deleted from the owner's bag. A case-33 branch of the object-action handler calls it (ObjectActionMsgHandler.java:355-387); a shrine building with rank -1 is refused there (line 368).
- Rank, `getRank` (Shrine.java:315-317): index in the type's list sorted by `compareTo` (312), which orders by favour descending. Rank 0 is the shrine with the most favour.
- Decay, `decay` (Shrine.java:229-246): if the pool is 0, return (231); otherwise the new pool is `(int)(favors - favors * .10f)` (234), floored at 0. The job calls `decayShrines`, which decays only ranks 0 and 1 (HourlyJobThread.java:58), and only when the hour equals `MINE_LATE_WINDOW` (259). The comment says "midnight every day" (257). So the decay runs once a day, at the hour the constant names (the constant's value is not read).
- Claim, `requestBoon` (MerchantMsgHandler.java:145-206), in order: the NPC's guild must be the player's guild (150); the shrine building must be a shrine with rank not -1 (161); the pool must be non-zero (169, error 172); the player must not already have this shrine's power effect (176, error 199); the race or class gate (181); `takeFavor` (184), which debits one favour (Shrine.java:294-307, `newAmount = favors - 1` at 300); then the rank (194) with the R8 rule: for a tree at rank 8 any non-first shrine counts as index 1 (196-198); then `trains = 40 - rank * 10`, floored at 0 (199-201); then `PowersManager.applyPower(... shrinePower.getToken(), trains, false)` (204-205). A guild message and a visual pulse follow (not line-cited).
- Loot, `lootBuilding` (BuildingManager.java:175-232): reads the pool (198), refuses at 0 (popup 166), makes an item of base 1705032 with quantity equal to the pool (210-218), and zeroes the pool (221). Callers of `lootBuilding` were not checked.
- Hermit path, `requestHermitBlessing` (MerchantMsgHandler.java:99-141): guild leader only, city owned, TOL rank 7, realm claimable (129) and not ruled (134), then `applyPower` for the hermit's power at count 40 (141). This is a separate boon path with no pool.

## 2. Key functions

- `Shrine.canTakeFavor`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/Shrine.java` 44-203 (race and class gate).
- `Shrine.decay`: Shrine.java 229-246 (10 percent off, floor 0).
- `Shrine.addFavor`: Shrine.java 249-290 (offering, boon amount times count, item consumed).
- `Shrine.takeFavor`: Shrine.java 294-309 (debit one favour; no floor check here).
- `Shrine.getRank`: Shrine.java 315-317 (index in the favour-sorted list).
- `MerchantMsgHandler.requestBoon`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/net/client/handlers/MerchantMsgHandler.java` 145-206 (claim, rank scaling, power).
- `HourlyJobThread.decayShrines`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/workthreads/HourlyJobThread.java` 36-69 and the trigger at 257-260.
- `BuildingManager.lootBuilding`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/BuildingManager.java` 175-232.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Offer an item: pool += table amount x count; item consumed | Amount per item per shrine type: `static_item_boons.amount` (data table; the query is at dbBoonHandler.java:34; no rows in src/, grep found only the query) |
| Claim costs one unit of the pool | 1 (Shrine.java:300) |
| Rank by pool order; strength falls with rank | `40 - rank * 10`, floor 0 (MerchantMsgHandler.java:199-201); the unit of `trains` is not read |
| Rank-8 tree cap on non-first shrines | index 1 (MerchantMsgHandler.java:196-198) |
| Decay: keep 90 percent of the pool, once a day, top two ranks only | 0.90 (Shrine.java:234 uses `.10f` off); ranks 0 and 1 (HourlyJobThread.java:58); daily hour `MINE_LATE_WINDOW` (259) |
| Loot payout | Item base 1705032 (BuildingManager.java:210), quantity = pool |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's offering rule (table amount times count, item consumed), the one-favour claim, the rank-scaled strength with the R8 cap, and the top-two daily decay. It fixes two things: the empty check is moved to the same place as the debit (the donor checks outside its lock at MerchantMsgHandler.java:169, and `takeFavor` has no floor at Shrine.java:300), and decay rounds to the nearest favour (the donor truncates with an int cast at Shrine.java:234). It omits: the database writes, the chat messages, the power application (the sketch returns `trains` and the caller applies it), the visual effect pulses, the guild ownership and the rank -1 check (passed in as a flag), the race and class gate (passed in as `gateOk`), the hermit path, the loot path, and the daily scheduler (the caller runs `decay` for the top two ranks once a day).

```ts
// Licence: MIT (donor LICENSE, permission grant). Written in our own words from the described mechanism; the donor's shape is kept.
interface BoonRow { shrineType: string; itemBaseId: number; amount: number; }
interface Shrine { type: string; favours: number; }
interface Offering { itemBaseId: number; count: number; owned: boolean; }

const DECAY_KEEP = 0.9;   // donor: decay keeps 90 percent (Shrine.decay, 10 percent off per call)

// Offering: the boon table decides how much favour an item adds; the item is used up.
function offer(s: Shrine, item: Offering, table: BoonRow[]): number {
  if (!item.owned) return 0;
  const row = table.find(b => b.itemBaseId === item.itemBaseId && b.shrineType === s.type);
  if (!row) return 0;                       // not a boon item for this shrine
  const add = row.amount * item.count;     // donor: boon.getAmount() * numOfItems
  s.favours += add;
  return add;
}

// Rank: 0 is the shrine with the most favour in its type (donor: sorted by favour, index).
function rankOf(s: Shrine, sameType: Shrine[]): number {
  return sameType.slice().sort((a, b) => b.favours - a.favours).indexOf(s);
}

// Claim: one favour buys a power whose strength is set by rank: 40 minus 10 per rank, floor 0.
// Fix: the empty check sits with the debit. The donor checks outside its lock and the debit has no floor.
function claimBoon(
  s: Shrine,
  rank: number,
  r8Tree: boolean,
  ctx: { guildMember: boolean; gateOk: boolean; hasBoon: boolean },
): { ok: boolean; trains: number; reason: string } {
  if (!ctx.guildMember) return { ok: false, trains: 0, reason: "guild" };
  if (ctx.hasBoon) return { ok: false, trains: 0, reason: "already" };
  if (!ctx.gateOk) return { ok: false, trains: 0, reason: "gate" };
  if (s.favours <= 0) return { ok: false, trains: 0, reason: "empty" };
  s.favours -= 1;
  let r = Math.max(0, rank);
  if (r8Tree && r !== 0) r = 1;            // donor: an R8 tree treats every non-first shrine as index 1
  const trains = Math.max(0, 40 - r * 10); // donor: trains = 40 - rank * 10, floored at 0
  return { ok: true, trains: trains, reason: "" };
}

// Decay (called by the job for the top two ranks). Fix: round to nearest; the donor truncates with an int cast,
// so a pool of 1 falls to 0 and a pool of 5 falls to 4 (a 20 percent drop).
function decay(s: Shrine): void {
  if (s.favours === 0) return;
  s.favours = Math.max(0, Math.round(s.favours * DECAY_KEEP));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended, exit 0.

## 5. Lands in

- TARGET `src/fight/boons.ts` (new module: a favour pool per shrine row, the offering rule from the boon table, and the claim that applies a timed power row on the CC/effect ladder). Parity-checklist row 13 (specials).
- today: none in Frankendom.
- Reuse tag: adapt-from-MIT (code may be adapted under MIT; written in our own words here)
- Brief rule served: one ledger (the pool is one ledger row, debited only by the server); zones as data (shrines are zone rows, boon amounts are catalogue rows); rule numbers in the focus brief n/a

## 6. Gaps and risks

- MIT: the code may be adapted. The sketch is in our own words, and the donor's shape is kept. The licence name is stated exactly as read.
- Defect: the empty check is outside the lock (MerchantMsgHandler.java:169) and `takeFavor` has no floor (Shrine.java:300). Two claims at a pool of 1 can both pass and leave -1 (not run). Fix: the check sits with the debit (sketch `claimBoon`).
- Defect: decay truncates (Shrine.java:234). A pool of 1 decays to 0, and a pool of 5 to 4. Fix: round to nearest (sketch `decay`).
- Ambiguity: the comment says "a day" and "midnight" (HourlyJobThread.java:257), and the trigger is the hour equal to `MINE_LATE_WINDOW` (259). The constant's value was not read, so the real hour is "(not read)".
- Unit gap: the claim's power strength is a count passed to `PowersManager.applyPower` (MerchantMsgHandler.java:204). Its unit (uses, seconds, or stacks) was not read. Frankendom must define the unit before using `40 - 10 * rank`.
- Patron choice is fixed by race or class, with no switching path found (Shrine.java:44-203). Frankendom's patron-switch rule (conversion cost, apostasy) has no donor source here.
- The claim is guild-only and the pool belongs to a city (MerchantMsgHandler.java:150; ObjectActionMsgHandler). Frankendom has one character and one ledger, so the owner should be a zone or a character, not a guild.
- Loot converts the whole pool to one item at once (BuildingManager.java:198-221). Frankendom should keep the pool as the favour ledger row and not convert it to a stack item by default.
- Rank order is recomputed from the pool on each call (sort in `getShrinesCopy`, Enum.java:1549-1552). With many shrines this is a sort per claim, not a cached rank.

## GL table (gods-legends-favour, focus rows 1-14)

| # | Name | Effect | Formula | Number ranges | Gain/loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour as a resource (shrine pool) | Pool filled by offering boon items; spent one at a time on claims; emptied by loot | pool += boon amount x item count; pool -= 1 per claim; pool = 0 on loot | Amount per item from `static_item_boons` (data, not in src); claim 1 | Gain: offering (Shrine.java:278, 286; ObjectActionMsgHandler.java:377). Loss: claim (Shrine.java:300; MerchantMsgHandler.java:184). Loss: loot (BuildingManager.java:198-221) | 10 percent off, once a day, ranks 0 and 1 (Shrine.java:234; HourlyJobThread.java:58, 259) | Shrine.java:249-310 |
| 2 | Blessings and curses as timed rows | A claim applies the shrine's power token; one per player at a time | `PowersManager.applyPower(... trains)` | trains = 40 - 10 x rank, floor 0 (MerchantMsgHandler.java:199-204); unit not read | Start: claim. End: not read | not read | MerchantMsgHandler.java:176, 204. Curses: "curse" appears in 0 files |
| 3 | Patron choice and switching | Fixed by race or class; no switching found | Gate: race IDs or promotion-class IDs | Race IDs 2000-2029 and class IDs 2504-2526 (Shrine.java:50, 110-203) | No conversion cost or apostasy found ("patron": 0 files) | - | Shrine.java:44-203 |
| 4 | Divine domains as tags | Shrine type is the tag; each type has a power token | Power token per type | One type per race or class (Enum.java:1492) | - | - | Enum.java:1492, 1545 |
| 5 | Boons at favour thresholds | Strength by rank, not by favour threshold | trains = 40 - rank x 10, floor 0 | 40, 30, 20, 10, 0 by rank; R8 non-first = index 1 | Changes when the pool order changes | - | MerchantMsgHandler.java:194-201; Shrine.java:312, 316 |
| 6 | Legend signature powers | Shrine powers per type (power tokens); list not read | - | - | - | - | Enum.java:1545 (pointer) |
| 7 | Shapeshifting | Not read ("transform": 7 files) | - | - | - | - | none read |
| 8 | Avatars or summons under limits | None found in the read code ("summon" not searched) | - | - | - | - | none found |
| 9 | Fate, luck, oaths | None: "oath": 0 files, "luck": 0, "fate": 0 | - | - | - | - | none found |
| 10 | Underworld and death rules | Not read ("corpse": 18 files; "resurrect": 2) | - | - | - | - | none read |
| 11 | Mounts as rewards | Not searched | - | - | - | - | none read |
| 12 | Relics | None: "relic": 0 files | - | - | - | - | none found |
| 13 | Temples and shrines | A shrine is a city building with a pool; one per type; cannot be transferred, abandoned or destroyed | Pool per building | One per shrine type per city (city loop at PlaceAssetMsgHandler.java:928-955) | Offer (ObjectActionMsgHandler.java:377); claim (MerchantMsgHandler.java:184) | Daily decay (HourlyJobThread.java:259) | Shrine.java:24-29; TransferAssetMsgHandler.java:56-57; AbandonAssetMsgHandler.java:79-80; DestroyBuildingHandler.java:74-75 |
| 14 | Pantheon factions and realm pride | Not the favour pool. Realm claims are checked (realm claimable and ruled: MerchantMsgHandler.java:129, 134); "nation" appears in 40 files (not read) | - | - | - | - | MerchantMsgHandler.java:129-134 |

Titles: "title" appears in 9 files (not read). Grep counts above come from one `grep -rliw` pass over src/ on the VPS; they are pointers, not reads.

Reuse tag: adapt-from-MIT (code may be adapted under MIT; written in our own words here)
Brief rule served: one ledger (the pool is one ledger row, debited only by the server); zones as data (shrines are zone rows, boon amounts are catalogue rows); rule numbers in the focus brief n/a
