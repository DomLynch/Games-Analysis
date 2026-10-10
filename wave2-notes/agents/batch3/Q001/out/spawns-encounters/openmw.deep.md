# openmw (spawns-encounters, cell 3)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/levelledlist.cpp` (level-gated pick, read in full), with `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/worldimp.cpp` (`World::spawnRandomCreature` 3606-3623), `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/waitdialog.cpp` (rest interrupt 189-224, 262-275), `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/cellstore.cpp` (cell respawn 1223-1290) and `/mnt/frankendom-donors/openmw/apps/openmw/mwclass/creature.cpp` (creature respawn 801-834) | Licence: GPL v3 (LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", line 2 "Version 3, 29 June 2007"); clean-room, shape only | C++ | symbol `MWMechanics::getLevelledItem`

Checked: Read in full: `levelledlist.cpp` 1-81; `worldimp.cpp` 3599-3624; `cellstore.cpp` 1219-1290; `timestamp.cpp` 90-111 (the difference operator); `creature.cpp` 779-835. Read in part: `worldimp.cpp` 1315-1322 (the head of `safePlaceObject`; its placement body was not read); `waitdialog.cpp` 189-224 and 262-275 (the per-hour check that compares `mInterruptAt` with elapsed hours was not read). Callers of `getLevelledItem` (grep): `worldimp.cpp` 3615 (random spawn, read), `containerstore.cpp` 774, `mwclass/creaturelevlist.cpp` 113, `mwscript/containerextensions.cpp` 68, `mwlua/types/levelledlist.cpp` 161 (item and container uses, not read). Respawn is called from `scene.cpp` 496-497 with a flag (not read beyond that). Values of the game settings (iNumberCreatures, fSleepRandMod, fSleepRestMod, fCorpseRespawnDelay, fCorpseClearDelay, iMonthsToRespawn) come from game data, not from this code, and were not read. Confidence: high for the levelled pick, the spawn count and the respawn gates; medium for the rest interrupt, since the timing check was not read. camera_scope: n/a.

Best transferable idea: a level-gated encounter table: take the highest tier at or below the player's level, pick one entry uniformly (or every entry at or below the level, for an all-levels list), roll a none-chance first, recurse into nested tables at the same level, and draw the spawn count as one plus a die roll.

Decision (proposed): adapt - keep the levelled table (none-chance, top tier at or below player level, all-levels flag, nested tables at the same level) and the count rule as zone data that feeds groups capped at MAX_ATTACKERS = 3; reject the rest-interrupt and the monthly cell respawn clock, since they depend on Morrowind's sleep rules and game-time months that Frankendom does not model.
Acceptance: a server test with a zone list of entries at levels 1, 3 and 5 with a none-chance of 20: for a level-4 player, over 10,000 seeded picks the none rate is 20 percent plus or minus 1 point, only level-3 entries appear unless the all-levels flag is set, and group counts stay between 1 and 3.

## 1. Mechanism

The encounter pick is one function, `getLevelledItem` (levelledlist.cpp 18-80). It is called with a list, a creature flag, the random generator and an optional level; with no level it reads the player's level (26-31). Steps, in order:

(1) None-chance: `roll0to99(prng) < mChanceNone` returns nothing (33-34). The roll is a percent of the whole pick.

(2) Top tier: `highestLevel` is the largest entry level that is at or below the player's level (37-42). Entries are only eligible when their level is at or below the player's level (51).

(3) Candidate set: for an ordinary list, the candidates are the entries whose level equals `highestLevel`. For an all-levels list (45-47), the candidates are every entry at or below the player's level (51). The flag bit differs for creature lists and item lists; the code overwrites the item bit for creatures (45-47).

(4) Uniform pick: `candidates[rollDice(size)]` (56). `rollDice(n)` returns a value in [0, n).

(5) Missing record: if the chosen id is not in the store, the pick is logged and dropped with no reroll (59-64).

(6) Nested lists: if the pick is another item or creature list, the function recurses with the same level and the same generator (66-79). A nested list has its own none-chance.

Spawn count and placement (`World::spawnRandomCreature`, worldimp.cpp 3606-3623). The count is `1 + rollDice(iNumberCreatures)` (3610-3611), so 1 to iNumberCreatures inclusive. Each of those picks from the list at the player's level (3615). An empty pick is skipped (3616-3617). Each creature is placed with `safePlaceObject` at distance 220 from the player with direction 0 (3621); the function tries fallback directions (1322), and its placement body was not read.

Rest interrupt (waitdialog.cpp 189-224). When the player sleeps outdoors in a region that has a sleep list (204-210), a die is rolled over the hours to wait (213). If the roll is below `fSleepRandMod` times the hours (216), the interrupt hour is `hoursToWait - int(fSleepRestMod * hoursToWait)` (220-223), and the region's sleep list is stored as the interrupt list (224). When the interrupt fires, a message is shown and `spawnRandomCreature` runs with that list, then waiting stops (262-272 for the per-hour advance and the callback). The per-hour check that fires the callback was not read.

Respawn timing, cell level (cellstore.cpp 1223-1290). The cell respawn runs only when the cell is loaded (1225). It runs when the time since the last run is more than 24 x 30 x `iMonthsToRespawn` hours (1228-1229); the time difference is in hours (timestamp.cpp 90-109: days times 24 plus the hour difference, 109). It stamps the time (1231), resets containers that have custom data (1232-1240), then creatures and NPCs with custom data are cleared of corpses and respawned (1244-1251), then creature lists (1257-1266), then moved references (1269-1288).

Respawn timing, creature level (creature.cpp 801-834). A creature is left alone while it is alive with a count above zero (804), or until its death animation finishes (807). The delay is the clear delay for a count of zero, else the smaller of the respawn and clear delays (816). The reset happens only when the reference has the Respawn flag and time of death plus delay is at or before now (818-819). The reset re-enables the count, re-adds scripts, clears container scripts and custom data, and moves the object back to its origin position (820-834).

## 2. Key functions

- `getLevelledItem`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/levelledlist.cpp` 18-80 (whole function).
- `World::spawnRandomCreature`: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/worldimp.cpp` 3606-3623.
- `WaitDialog::startWaiting`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/waitdialog.cpp` 189-224; `WaitDialog::onWaitingInterrupted`: 271-274.
- `CellStore::respawn`: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/cellstore.cpp` 1223-1290.
- `Creature::respawn`: `/mnt/frankendom-donors/openmw/apps/openmw/mwclass/creature.cpp` 801-834.
- `TimeStamp` difference: `/mnt/frankendom-donors/openmw/apps/openmw/mwworld/timestamp.cpp` 90-110.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| None-chance roll on 0-99 before any pick | `mChanceNone` per list, a data value in the file (theirs, levelled list record; read at 33) |
| Top tier at or below the level, uniform among that tier | No constants; comparison only (theirs, 40, 51) |
| All-levels mode: every entry at or below the level | Flag bit, swapped for creatures (theirs, 45-47) |
| Nested tables recurse at the same level | No constants (theirs, 76, 78) |
| Spawn count = 1 + one die over N | N = `iNumberCreatures` (theirs, GMST; value not read; 3610-3611) |
| Spawn distance 220 | 220.f (theirs, 3621; units not verified) |
| Rest interrupt: one die over hours against a fraction, fired at a fixed hour | `fSleepRandMod`, `fSleepRestMod` (theirs, GMSTs; values not read; 213-223) |
| Cell respawn gate: months times 24 times 30 hours | `iMonthsToRespawn` (theirs, GMST; value not read; 1228-1229) |
| Creature clear and respawn delays | `fCorpseClearDelay`, `fCorpseRespawnDelay` (theirs, GMSTs; values not read; 816) |

## 4. TypeScript sketch

simplified: the sketch covers the levelled pick (levelledlist.cpp 33-79), the spawn count (worldimp.cpp 3610-3611), the rest-interrupt decision (waitdialog.cpp 204-223) and the cell respawn time gate (cellstore.cpp 1229). It omits placement (`safePlaceObject`), the missing-record skip, the per-hour interrupt check, the creature respawn (creature.cpp 801-834), the item-versus-creature flag swap (kept as one flag), and the cell's per-object loops. The donor's rollDice returns 0 for max 0 and the sketch's contract says the same. Nothing is reordered: the none-chance comes first, as in the donor.

```ts
// Licence: GPL v3 (donor LICENSE). Clean-room sketch from the described mechanism, not a translation.
// clean-room
// rng contract: roll0to99() in [0,100); rollDice(n) in [0,n), and 0 when n <= 0 (donor rollDice returns 0 for max <= 0).
interface Rng { roll0to99(): number; rollDice(n: number): number; }

interface LevEntry { id: string; level: number; sub?: LevList; }
interface LevList { chanceNone: number; allLevels: boolean; entries: LevEntry[]; } // zone data: chanceNone 0..99, entries carry levels

// Levelled pick (donor: levelledlist.cpp 18-80). Returns an id, or null for nothing.
export function pickLevelled(list: LevList, playerLevel: number, rng: Rng): string | null {
  if (rng.roll0to99() < list.chanceNone) return null;
  let highest = 0;
  for (const e of list.entries) if (e.level > highest && e.level <= playerLevel) highest = e.level;
  const candidates = list.entries.filter((e) => playerLevel >= e.level && (list.allLevels || e.level === highest));
  if (candidates.length === 0) return null;
  const chosen = candidates[rng.rollDice(candidates.length)];
  if (chosen.sub) return pickLevelled(chosen.sub, playerLevel, rng); // nested list: same level, its own chanceNone
  return chosen.id;
}

// Donor: World::spawnRandomCreature (worldimp.cpp 3610-3611). Count is in [1, iNumberCreatures].
export function spawnCount(iNumberCreatures: number, rng: Rng): number {
  return 1 + rng.rollDice(iNumberCreatures);
}

// Donor: WaitDialog::startWaiting (waitdialog.cpp 204-224). Decided once, when the rest starts. Returns hours until interrupt, or null.
export function restInterruptAt(hoursToWait: number, sleepingOutdoors: boolean, hasSleepList: boolean,
  fSleepRandMod: number, fSleepRestMod: number, rng: Rng): number | null {
  if (!sleepingOutdoors || !hasSleepList) return null;
  const x = rng.rollDice(hoursToWait);
  if (!(x < fSleepRandMod * hoursToWait)) return null;
  const remaining = Math.trunc(fSleepRestMod * hoursToWait);
  if (remaining === 0) return null;
  return hoursToWait - remaining;
}

// Donor: CellStore::respawn time gate (cellstore.cpp 1229-1231). Hours since the last run compared with 24 * 30 * months.
export function cellRespawnDue(nowHours: number, lastRunHours: number, monthsToRespawn: number): boolean {
  return nowHours - lastRunHours > 24 * 30 * monthsToRespawn;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone encounter table and spawn count on the server; the pick runs server-side and feeds the zone's spawn points). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn).
- today: not checked in this pass (the Frankendom repo was not opened); the target is a proposal.
- Reuse tag: rewrite-from-idea (GPL v3; clean-room, shape only)
- Brief rule served: 1 (one engine, zones as data); row 23 spawn caps

## 6. Gaps and risks

- GPL v3: clean-room only. The sketch is written from the mechanism; do not translate the C++.
- Zones as data: the none-chance, the entries and their levels, and the all-levels flag belong in zone data, and the flag must be a per-list value, not a global switch.
- Server-verified: the donor reads the player's level from the local player object (levelledlist.cpp 26-31) and has no server-side check on it. Frankendom's level must come from the server's character record, and the pick must run on the server.
- One ledger: the spawn count (1 + die) has no cap in the donor. Frankendom's ruling is MAX_ATTACKERS = 3, so the count must be clamped in the spawn path and tested.
- A missing record is dropped with no reroll (levelledlist.cpp 59-64). Frankendom should validate the zone's tables when they load, so a bad id cannot silently shrink an encounter.
- The rest interrupt depends on sleep outdoors, a region sleep list and Morrowind game-time hours. Frankendom has no sleep rule in its rulings; reject it unless a rest system is added.
- The cell respawn is a monthly clock checked when the cell loads (1229). Frankendom's respawn must be on the server tick with an explicit timer per zone, and the donor's death-time respawn (creature.cpp 818-819) is the shape to copy, not the monthly gate.
- The item and creature flag swap (levelledlist.cpp 44-47) is a file-format quirk. Do not copy it; store one flag per list in zone data.
- The placement distance 220 has no units confirmed, and the placement fallback body (worldimp.cpp 1322 onward) was not read.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** Cell respawn gating is wrong: note says the whole cell respawn runs only when time since last run exceeds 24*30*iMonthsToRespawn, then containers, creatures/NPCs, lists, moved refs. In cellstore.cpp 1229-1239 the monthly gate wraps ONLY the container reset; the creature (1245-1252), NPC (1253-1260), creature-list (1261-1266) and moved-ref (1267-1289) loops run on every respawn() call, and are paced by each creature's own delay (creature.cpp 815-819). The sketch's cellRespawnDue and the 'monthly cell clock' framing therefore describe the container clock only. Everything about the levelled pick is right: levelledlist.cpp 33-34, 37-42, 45-47, 51, 56, 59-64, 66-79; spawnRandomCreature 3610-3621 (1+rollDice, 220.f); waitdialog 204-224 and 262-274; Creature::respawn 804/807/816/818-819; timestamp 90-110; fallbackDirections at worldimp 1322; GPL-3.0.

**Missed:** Non-monthly per-creature respawn path (see above) is the one Frankendom would actually copy; the note's recommendation to copy creature.cpp 818-819 still stands.
