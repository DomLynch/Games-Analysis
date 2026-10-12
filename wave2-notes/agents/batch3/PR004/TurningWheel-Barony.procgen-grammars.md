# TurningWheel-Barony (procgen-grammars, feel, cell PR004)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony` | Licence: BSD-2-Clause for the open source code (LICENSE.txt line 3). The game's level content is not in this box and the README says a purchased copy is needed to play. | C++ | topic `procgen-grammars`

Checked: read `src/maps.cpp` `generateDungeon` (1197-1330: seeds, shop, minotaur and secret-exit rolls; 1376-1440 and 1868-1900: the room loop and the opening slots; 1960-2130: treasure, shop, special and pool draws and the no-fit path; 3862-3920: the location budget; 3920-4060: exit and shrine quadrant rule; 4530-4610 and 4700-4810: per-location roll; 7775: gold formula). Read `monsterCurve` (291-596). Read `game.hpp:387` (region length) and the name list files by line count. Listing only: `lang/en.txt` (6,695 non-empty lines, not entry-counted). Not read: the level map files (not in the box), the sub-room map code past 2130, decoration tables past 4610. Confidence: high on the opening slots, the per-location roll and the monster curve (read line by line). Medium on the no-fit path (the branch after 2130 was not read).

Half read: server (the generator is in the same program; the client half of the program was not read). Data pack: absent from this box, so level layouts and room files are not known.

## 1. What the player sees and feels

- Each floor opens in the same place: the entrance hall, every time. The second room is always the treasure room unless a secret exit is in play, in which case the secret floor comes first and the treasure room moves to slot three.
- About half the floors after floor 1 are shops (a coin flip, with Underworld, Hell and fortress floors excluded), and a shop always sits in slot two. A special room can appear in slot four. Everything else is a pool of rooms that can repeat on the same floor.
- Walking the floor you meet clusters of loot and decoration with a few monsters. On a shallow floor (depth 10 or less, no custom traps) almost every decorated slot is dressed; deeper floors leave about a third of the slots empty.
- A seed fixes the floor layout. The monster share still moves with the number of connected players: with one player you meet fewer monsters per room than with three or four.
- Monster types follow a region table: the Mines are mostly rats and skeletons (four buckets each of ten), with a spider and a troll from floor 2 on. The Citadel's largest share is goatmen (four of fifteen), then incubi (three).

## 2. Why it works / is striking

- Readable silhouette or beat at 375 wide: not judged (no presentation code read, and no phone build of this donor). The idea transfers as a route, not as a picture.
- One signature behaviour: a floor always starts at a known entry and always has its reward room in a known slot. A player can learn the shape of a floor from its order.
- One signature sound or effect: none in the generator (client not read).
- Could be made ours at 20-30 per cent resemblance: fixed opening slots, a repeat-allowed room pool that drops a type only when it does not fit, a per-location roll whose monster share scales with the party size, and a per-region monster table.

## 3. The rule behind it

Seeding. A floor takes a seed. `mapseed` is set at line 1296 and `map_server_rng` is seeded from it at line 1298 (map_rng is seeded beside it). The human stat roll for NPCs (line 4787) uses the server stream, so that roll does not share the map stream.

Slots. `c` runs from 0 to width x height (line 1876-1877), so the loop is bounded by map area, not by room count. Slot 0 is the entrance hall (line 1895-1897) and is removed from the pool (line 1900). Slot 1 is the secret floor when a secret exit is set; otherwise slot 1 is the treasure room (line 1969). Slot 2 is the shop when shoplevel is set (line 1999). Slot 3 is the treasure room when the secret exit is set (line 1969). Slot 4 is the special room if the pool is not empty (line 2006). Any other slot draws from the pool with `map_rng.rand() % numlevels` (line 2042).

Pool rule. Success never removes a room type from the pool (the only `possiblerooms[...] = false` writes are at 1900 for the entrance, at 2127 for a regular room with no free location, and at 2099 and 2116 for the treasure and special pools on no-fit). A type is dropped only when no free location exists for it. Rooms can therefore repeat on one floor.

Shop, minotaur and secret exit. Shop: a 1 in 2 roll when depth is above 1 and the floor is not Underworld, Hell or a fortress (line 1308). Minotaur: 1 in 2 on floors whose depth mod 5 is 2 or 3 under floor 25, or 2 or 4 above it (lines 1327-1330). Floor 25 matches neither branch; whether that is intended is not clear. Secret exit: floor 2 is always the Mines secret (line 1413), floor 3 is 1 in 2, floors 7 and 8 the Swamp secret, floors 11 and 13 the Labyrinth secret, 16 and 18 the Ruins secret, 28 the Caves secret, 33 the Citadel secret, and floor 23 a special exit named baphoexit with minotaurs turned off (lines 1413-1440).

Location budget. A floor asks for `30 + rand % 10` locations, capped by free locations (line 3884). Maps with a generation range in their flags use `min + rand % (max - min)` instead (3877-3880).

Per-location roll (default branch). Half the locations take the normal branch (line 4706: `rand % 2 || nodecoration`). The other half are decorated: a decoration is placed when `rand % 4 == 0`, or always on depths 10 and below without custom traps (line 4804). Hell is excluded. In the normal branch, a divisor is read from the connected player count (lines 4717-4735: 1 player gives 4, 2 give 3, 3 or 4 give 2, default 2). The roll `rand % divisor` is non-zero for loot and zero for a monster (4739). Loot: 1 in 10 is gold, the rest are items (line 4743). Monster: 1 in 10 at depth above 1 is an NPC (line 4767); above depth 15, three in four NPCs are automatons, else human (line 4774); otherwise a monster sprite is placed (line 4793). The forced-spawn path (lines 4535-4610) repeats the same NPC and loot split for maps that set generation ranges.

Gold pile formula: `10 + rand % 100 + depth` (line 7775; context of that call was not read).

Monster curve. `monsterCurve(level)` (line 291) picks a type from the region by a roll on the map stream. Mines: 10 buckets, 4 rats, 4 skeletons, and at 8 and 9 a spider and a troll from depth 2 (306-340). Citadel: 15 buckets, incubus 3, goatman 4, crystal golem 2, vampire 2, shadow 1, automaton 1, cockatrice 2 (552-580). Swamp, Ruins and Underworld have 10 buckets each (343, 394, 422); Labyrinth and Hell have 20 each (361, 441); Caves has 15 per sub-branch (480). Fortress uses four buckets (dryad, myconid, gremlin, small moth) (583). The fallback is a skeleton (595). A custom curve file can replace the table (line 1301, `readFromFile(mapseed)`). The call site that asks for a curve monster is at line 7866 (not read in full).

Daedalus shrine. On a minotaur floor, the shrine goes into the quadrant opposite the exit, in a fixed order per exit quadrant (quadrant order sets at 3995-4007; quadrant mapping at 4019-4039, checked by hand).

Numbers table (designer data fields; donor values are BSD-2 code and may be adapted with the notice):

| Name | Donor value | Unit |
|---|---|---|
| floor location budget | 30 to 39 | locations per floor |
| normal share | 1 in 2 | fraction |
| decoration share, depth above 10 | 1 in 4 | fraction of decorated half |
| decoration share, depth 10 or less | 1 in 1 (no custom traps) | fraction |
| monster divisor by players | 1:4, 2:3, 3-4:2, default 2 | divisor |
| gold share of loot | 1 in 10 | fraction |
| gold pile | 10 to 109, plus depth | gold |
| NPC share of monster slots | 1 in 10 above depth 1 | fraction |
| automaton share above depth 15 | 3 in 4 | fraction |
| minotaur floor roll | 1 in 2 on region floors | fraction |
| region length | 5 floors | floors |

Walk density (computed from the rule, not run). At a 35-location floor: monsters about 4.4 with one player, 5.8 with two, 8.8 with three or four. Loot piles about 13.1, 11.7, 8.8. Decorations about 4.4 deeper or 17.5 on shallow floors (independent of players). Empty slots about 13.1 deeper, none shallow. Monsters per floor is the number the player feels; the rest is the bulk.

## 4. TypeScript sketch

simplified: the sketch keeps the opening slots, the repeat-allowed pool with drop-on-no-fit, the per-location split, the player-count divisor, the gold share, the budget and the gold formula. It omits tile placement and door matching, the exit and shrine quadrant rule, map-file forced spawns (the generation-range flags), the nodecoration flag, the Hell and fortress exceptions, the NPC and automaton choice, and the region monster curve (data only, in the table above).

```ts
// Licence: BSD-2-Clause (donor code). Clean-room sketch of the rule; no donor lines copied.
// clean-room
export {};

export type Slot = 'start' | 'secret' | 'treasure' | 'shop' | 'special' | 'pool';
export interface FloorOpts { secretExit: boolean; shopLevel: boolean; hasSpecial: boolean; }

// Fixed opening slots, then the pool. Slot 0 is always the entrance.
export function slotFor(c: number, o: FloorOpts): Slot {
  if (c === 0) return 'start';
  if (c === 1 && o.secretExit) return 'secret';
  if (c === (o.secretExit ? 3 : 1)) return 'treasure';
  if (c === 2 && o.shopLevel) return 'shop';
  if (c === 4 && o.hasSpecial) return 'special';
  return 'pool';
}

// Pool draw WITH repeats: a type stays eligible after it places. Only a type with no free spot is dropped.
export function drawPool(live: boolean[], rand: () => number): number {
  const idx: number[] = [];
  live.forEach((ok, i) => { if (ok) idx.push(i); });
  if (idx.length === 0) return -1;
  return idx[Math.floor(rand() * idx.length)];
}
export function dropType(live: boolean[], i: number): void { live[i] = false; }

export interface LocationCfg {
  normalShare: number;                 // donor: 1 in 2 locations take the normal branch
  balance: Record<number, number>;     // players -> divisor: 1->4, 2->3, 3->2, 4->2
  balanceDefault: number;              // donor default: 2
  goldShare: number;                   // donor: 1 in 10 loot piles is gold
  decorChance: number;                 // donor: 1 in 4 deeper; 1 on shallow floors without custom traps
}
export type LocKind = 'monster' | 'loot' | 'gold' | 'decor' | 'empty';

export function rollLocation(cfg: LocationCfg, players: number, rand: () => number): LocKind {
  if (rand() >= cfg.normalShare) {
    return rand() < cfg.decorChance ? 'decor' : 'empty';
  }
  const b = cfg.balance[players] ?? cfg.balanceDefault;
  if (Math.floor(rand() * b) !== 0) {  // (b-1)/b of normal locations are loot
    return rand() < cfg.goldShare ? 'gold' : 'loot';
  }
  return 'monster';                    // 1/b of normal locations are monsters
}

// Location budget per floor (donor: 30 + roll % 10, capped by free locations).
export function locationBudget(free: number, rand: () => number): number {
  return Math.min(30 + Math.floor(rand() * 10), free);
}

// Gold pile: 10 + roll % 100 + depth (donor formula).
export function goldPile(depth: number, rand: () => number): number {
  return 10 + Math.floor(rand() * 100) + depth;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`: row 23 (zone population). The per-location roll, the location budget, the player-count divisor and the region monster table are population data: spawn caps and the share of monsters to loot belong to row 23. Party size scales the population share, not the number of simultaneous attackers; the engine still admits three (MAX_ATTACKERS = 3).
- The opening slots and the pool are zone layout. No parity row covers layout (1-22 or 23). Flagged for Lead.
- The Daedalus shrine rule (boss placed in the quadrant opposite the exit) is boss staging. No parity row. Flagged for Lead.
- FOR FRANKENDOM, 700 zones as data: each zone carries a slot list (entry first, reward second, vendor, special), a location budget, a per-party-size divisor, a gold pile formula and a region table of the 100 Pit characters with weights. A region table like the Mines entry (rats and skeletons at weight 4 each, a spider and a troll behind a depth gate) is a data row, not code.
- Keep: a known entry and a known reward slot on every zone, so the route is learnable; the pool that repeats and drops a type only when it does not fit; server-only rolls on their own stream from the presentation rolls; the gold formula with depth.
- Change: the location picker scans the whole grid for each pick (3920-3945), which is O(width x height) per pick; precompute the free list. The loop bound is area (line 1876-1877), not rooms; cap the placed count as well. Floor 25 matches neither minotaur branch (1327-1330); say in data whether that is intended. Rooms repeat on one floor with no cap; decide if a zone should draw without repeats.

Reuse tag: adapt-idea (BSD-2-Clause; code not copied, notice needed if copied later)
Brief rule served: 23 (zone population) for the location roll and region table; layout and shrine have no row

Best transferable idea: fix the opening slots of every zone (entry first, reward second), then let the rest of the zone draw from a pool, with the monster share of each room scaled by the party size.

## 6. Look test (Dom, 5 minutes on a phone)

- Floor strip at 375 wide: one seed, two party sizes (one player and three). Each floor is a row of about 35 dots coloured monster, loot, gold, decoration or empty. Dom judges whether three players feel crowded (expect about 9 monsters against 4 for one player) and whether the entrance and reward at the start of each row read as a route.
- Slot order card: a 5-slot route (entry, treasure, shop, special, pool) on a phone card, shown for three floors. Dom judges whether the fixed start makes the zone easier to read.

## 7. Licence and IP

Code: BSD-2-Clause (LICENSE.txt line 3). Code may be adapted with the notice. This note writes a clean-room sketch; no donor lines are copied. Level layouts and room files are not in the box and the README says the game content is bought separately, so no content is used. Name lists (npc and player names, 105 and 371 and 366 lines) were not copied.

## 8. Gaps

- Not read: the level map files (not in this box); the sub-room code past 2130 (shop, treasure and special sub-maps); the regular-room no-fit branch after 2130; the decoration table past 4610; the call site of `monsterCurve` at 7866 in full; the gold setup around 7775; `gameplayCustomManager` hooks; the client half of the program.
- Not run: the walk-density numbers are computed from the rule, not from a generated floor.
- Idle, death, respawn and loot ceremony presentation: not read in the generator.
- Readability at 375 wide: not applicable to this donor (PC sprite game); not judged.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: Verified: seeding 1296-1298; shop roll 1308-1313 (note: rand consumed before the depth check); minotaur 1327-1330 (floor 25 matches neither branch, true); secret exits 1413-1441 incl. floor 23 baphoexit with minotaurs off (1437-1441); slot rules 1895-1900, 1969, 1999, 2006, 2042; pool drops only at 1900, 2099, 2116, 2127; location budget 3884 and range form 3877-3879; normal branch 4706, balance 4717-4734, loot/monster split 4739, gold 1/10 4743, NPC 1/10 and depth>1 4767, automaton 3/4 above 15 4774, human stat 4787 on server rng, decoration 4804 (Hell excluded), gold formula 7775, monsterCurve Mines (4 rat/4 skeleton/spider/troll depth>=2) and Citadel buckets (incubus 3, goatman 4, golem 2, vampire 2, shadow 1, automaton 1, cockatrice 2), fortress 4 buckets, fallback skeleton 595, LENGTH_OF_LEVEL_REGION 5, BSD-2 LICENSE.txt. Walk-density arithmetic checks out (35 x 0.5 x 1/4 = 4.4 etc.). No Acceptance line, only Look test; nothing in it can fail a correct build. Minor: sketch slotFor ignores that the treasure slot only applies when treasureRoomLevel exists (1969).
Missed: Loot and monster placement are gated by map.lootexcludelocations / monsterexcludelocations (4741, 4760), so a rolled slot can silently produce nothing; also on no-fit the slot is retried (--c; continue at 2106/2119) rather than skipped. Neither is in the note.
