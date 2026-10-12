# tmewett-BrogueCE (city-map-design, cell 20)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Architect.c` (hub budget in `addMachines` 1732-1775; one-machine placement in `buildAMachine` 984-1530; candidate rules in `cellIsFeatureCandidate` 492-588), with `/mnt/frankendom-donors/tmewett-BrogueCE/src/variants/GlobalsBrogue.c` (budget constants 1026-1029 and the blueprint data row 183-190), `GlobalsRapidBrogue.c` and `GlobalsBulletBrogue.c` (other variants' constants), and `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/RogueMain.c` 292 (reset) | Licence: AGPL-3.0-or-later (`/mnt/frankendom-donors/tmewett-BrogueCE/LICENSE.txt` is AGPL v3; `Architect.c` header: "either version 3 of the License, or (at your option) any later version") | C | symbol `addMachines` (Architect.c 1732), `buildAMachine` (984)

Checked: Read `addMachines` at Architect.c 1732-1775 in full. Read `buildAMachine` at 984-1530: blueprint pick 1041-1071; room-gate location 1080-1099; area-machine location and its 10-try loop 1146-1205; the point of no return and the distance percentiles 1222-1272; the alternative-feature choice 1291-1319; the feature loop 1327-1530. Read `blueprintQualifies` 455-469 and `cellIsFeatureCandidate` 492-588 in full. Read the blueprint row for "Mixed item library" (GlobalsBrogue.c 183-190) and the budget constants of all three variants (by grep, with the values quoted). Confidence: high on the hub budget (read end to end; the cadence was checked by arithmetic, see below) and on the one-at-a-time feature placement (read end to end to line 1530). Moderate on the machine's own fallback path. camera_scope: not applicable.
Not read: `buildAMachine` 1531-1731 (monster and horde spawns, the success path and the abort path that restores the level); `addTileToMachineInteriorAndIterate` (400-430); `runAutogenerators` body (1780-1855); the rest of the blueprint catalog (only the "Mixed item library" row was read). The cadence arithmetic below was checked by running the donor's formula on the Mac with Node (no donor file touched); it is not a run of the donor.

## 1. Mechanism

- Budget (per level, `addMachines`, 1757-1774). A running count of placed reward rooms is kept in `rogue.rewardRoomsGenerated` (reset at a new game, RogueMain.c 292; incremented per placed room, 1772). Each level:
  (a) Forced rooms: while the level is at or below `deepestLevelForMachines`, add one pending room as long as `(rewardRoomsGenerated + pending) * multiplier + offset < depth * increase` (1758-1761). With the Brogue variant (multiplier 4, offset 2, increase 1) this fires at depths 3, 7, 11, ... (no extra rolls): a room is owed when the placed count is still below the depth line.
  (b) Extra rooms: a percent roll with `40` if depth is at or below `maxLevelForBonusMachines` and no rooms exist yet, else `15`; further rolls use `max(15, 15 * increase)` percent; the loop stops on the first failed roll or at 100 (1763-1767).
  (c) Placement: up to 50 tries per pending room (1769-1774). Each try calls `buildAMachine(-1, -1, -1, BP_REWARD, ...)`, which picks a blueprint and a location itself. A failed room is not counted, so the owed count is still there on the next level (see the debt note in section 6).
- One machine (`buildAMachine`, 984): (1) pick a blueprint by weighted draw over the entries that qualify: depth inside the entry's depth range, and the required flags present (1041-1071; `blueprintQualifies` 455-469). The weight is the entry's frequency. (2) Find a location. A room machine picks a gate site whose interior size (choke map) is inside the blueprint's room-size range, at random among up to 50 such sites (1080-1099). An area machine picks a random floor cell, grows a distance field from it, and takes a random target size in the room-size range (1171), with up to 10 location tries (locationFailsafe, 1146-1205). (3) At the point of no return the level is copied (1222). The interior is marked as machine cells (1228 onward). (4) Distance percentiles from the origin are computed over the interior: the 25th and 75th percentiles (1271-1272). (5) Each alternative group (MF_ALTERNATIVE, MF_ALTERNATIVE_2) keeps exactly one random member and drops the rest (1291-1319).
- Features, one at a time (1327-1530). For each feature in order: a distance window (near-origin features take distance up to the 25th percentile, 1337-1338; far-from-origin features take distance from the 75th percentile up); a view mask if required. Then `instanceCount` is a random draw from the feature's range (1393). For each instance: pick one candidate at random (1413), remove it from the candidate map so it cannot be picked again (1431), place the decoration (DF) first and then the terrain, checking for a level disconnection when the terrain blocks passage (1436-1451). On success, clear the square of side `2 * personalSpace - 1` around the placed cell from the candidate map and mark it occupied (1397, 1462), and count the instance (1478). Items are then created and placed (1482 onward).
- Candidate rules (`cellIsFeatureCandidate`, 492-588): reject a cell that is in a hallway when the feature forbids hallways (MF_NOT_IN_HALLWAY, 507); reject the level perimeter when the feature forbids it (MF_NOT_ON_LEVEL_PERIMETER, 513); a build-at-origin feature is only the origin cell (520); a room's origin cell is never a candidate (522); a cell already occupied by an earlier feature's personal space is rejected (527); a view-of-origin test; the distance window (554); walls are candidates only when the feature builds in walls and the wall touches the interior (MF_BUILD_IN_WALLS branch, 558); a feature can instead be placed anywhere on the level (MF_BUILD_ANYWHERE_ON_LEVEL, 577).
- Example row (data, GlobalsBrogue.c 183-190): "Mixed item library -- can check one item out at a time", depth 1-12, room size 30-50, frequency 30, six feature rows. The rows are: carpet everywhere; a door built at the origin; one wand altar (instance range 1-1); one altar row for a weapon, armour or wand (3-3); one altar row for a staff, ring or charm (2-3); statues built into the walls (2-3). Each altar row has personal space 2 (the 9th column), so no two altars can touch.

## 2. Key functions

- `addMachines`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Architect.c` 1732-1775 (forced count, extra rolls, placement tries).
- `buildAMachine`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Architect.c` 984-1530 (read to 1530): blueprint pick, location, distance percentiles, alternatives, feature loop.
- `cellIsFeatureCandidate`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Architect.c` 492-588.
- `blueprintQualifies`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Architect.c` 455-469.
- Budget constants: `/mnt/frankendom-donors/tmewett-BrogueCE/src/variants/GlobalsBrogue.c` 1026-1029; `GlobalsRapidBrogue.c` 1030-1032; `GlobalsBulletBrogue.c` 1040-1042.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Owed count: placed plus pending must keep up with depth (a linear budget with an offset) | Multiplier 4, offset 2, increase 1 (theirs, GlobalsBrogue.c 1026-1028). Rapid variant: multiplier 2, offset 0, increase 3 (theirs, GlobalsRapidBrogue.c 1030, 1032). Bullet variant: multiplier 1, increase 3 (theirs, GlobalsBulletBrogue.c 1040, 1042). The same code gives different cadences; the cadence is data. |
| Forced cadence result (arithmetic, not a run): forced at depths 3, 7, 11 with no extra rolls | Derived from multiplier 4 and offset 2 |
| Extra rolls: 40% on the shallowest levels while none exist, then 15% per roll | Bonus depth 2 (theirs, GlobalsBrogue.c 1029); 40 and 15 (theirs, Architect.c 1763) |
| Retry budget per owed room | 50 tries (theirs, Architect.c 1769); 10 blueprint tries (failsafe in `buildAMachine`) |
| Pick a blueprint by frequency among qualifying ones | Frequency 30 for the library row (theirs, GlobalsBrogue.c 184) |
| Distance window from the origin | 25th and 75th percentiles (theirs, Architect.c 1271-1272) |
| Instance count from a range | Library altar row 1-1, 3-3, 2-3 (theirs, GlobalsBrogue.c 187-189) |
| Personal space around a placed feature | Personal space 2 gives a 3 x 3 clear square (theirs, GlobalsBrogue.c 187 column 9; Architect.c 1462) |

## 4. TypeScript sketch

simplified: the sketch keeps the owed-count rule, the extra rolls, and the one-at-a-time placement with personal space. It computes the candidate map once for the whole hub, where the donor recomputes it for each feature (so the donor's distance windows and view masks are dropped). It omits blueprints and their weights, the gate and area location search, the level backup and restore, the alternative groups, terrain and DF placement, the blocking check, the items and monsters, and the success and abort path. The demo prints a schedule and a placement count; the first line of the demo runs the owed-count rule with extra rolls on.

```ts
// Licence: AGPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface BudgetCfg { multiplier: number; offset: number; increase: number; deepestLevel: number; bonusMaxLevel: number; }
interface BudgetState { built: number; }  // hubs actually placed so far; a failed attempt does not count

// How many hub attempts this zone level gets. A deficit from earlier levels carries forward,
// because `built` only counts hubs that were placed.
function hubsToAttempt(depth: number, s: BudgetState, cfg: BudgetCfg, rnd: () => number): number {
  let pending = 0;
  if (depth <= cfg.deepestLevel) {
    while ((s.built + pending) * cfg.multiplier + cfg.offset < depth * cfg.increase) pending++;
  }
  // Extra hubs: a 40% first roll on the shallowest levels while none exist yet, else 15%, then 15% per extra roll.
  let pct = depth <= cfg.bonusMaxLevel && s.built + pending === 0 ? 0.4 : 0.15;
  while (rnd() < Math.max(pct, 0.15 * cfg.increase) && pending < 100) {
    pending++;
    pct = 0.15;
  }
  return pending;
}

interface Cell { x: number; y: number; }
interface Feature { minCount: number; maxCount: number; personalSpace: number; }

const cellKey = (x: number, y: number): string => `${x},${y}`;

// Place features one at a time. Each instance takes one random candidate, never retries it,
// then removes the square of side (2 * personalSpace - 1) around it from the candidates.
function placeOneAtATime(candidates: Map<string, Cell>, occupied: Set<string>, feats: Feature[], rnd: () => number): Cell[] {
  const placed: Cell[] = [];
  for (const f of feats) {
    const count = f.minCount + Math.floor(rnd() * (f.maxCount - f.minCount + 1));
    let done = 0;
    while (done < count && candidates.size > 0) {
      const keys = [...candidates.keys()];
      const pick = candidates.get(keys[Math.floor(rnd() * keys.length)]) as Cell;
      candidates.delete(cellKey(pick.x, pick.y));
      placed.push(pick);
      done++;
      const r = f.personalSpace - 1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          const k = cellKey(pick.x + dx, pick.y + dy);
          candidates.delete(k);
          occupied.add(k);
        }
      }
    }
  }
  return placed;
}

// Demo: Park-Miller generator, so the run is repeatable.
let seed = 7;
const rnd = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const cfg: BudgetCfg = { multiplier: 4, offset: 2, increase: 1, deepestLevel: 26, bonusMaxLevel: 2 };
const state: BudgetState = { built: 0 };
const schedule: number[] = [];
for (let depth = 1; depth <= 12; depth++) {
  const n = hubsToAttempt(depth, state, cfg, rnd);
  schedule.push(n);
  state.built += n; // assumes every attempt succeeds
}
console.log("attempts per depth:", schedule.join(" "));

const cands = new Map<string, Cell>();
for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) cands.set(cellKey(x, y), { x, y });
const placed = placeOneAtATime(cands, new Set<string>(), [
  { minCount: 1, maxCount: 1, personalSpace: 2 },
  { minCount: 2, maxCount: 3, personalSpace: 2 },
], rnd);
console.log("placed:", placed.length);
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (after `scp` to /tmp) with `export {};` appended: exit 0 (run on 2026-10-12).
Cadence check: the forced rule alone, run with the donor's formula and no extra rolls, gives owed rooms at depths 3, 7 and 11 in depths 1-12 (run on the Mac with Node; arithmetic check, not a donor run).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the server's zone population engine; the hub budget and the one-at-a-time placement are engine logic, the cadence numbers are zone data). The file is named in the addendum for row 23; no Frankendom file was read for this note.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The owed-count budget is a population cap with a catch-up rule, which is the row's job. The server tick is not involved in this mechanism.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data (cadence multiplier, offset and increase are zone data fields); one ledger (`built` is the server's count, not a client value); rules 7-9 n/a

Best transferable idea: keep a server-side count of placed hub services and owe one more whenever the count falls below a depth-based line, so a missed hub is owed again on the next zone instead of being lost, and place each service one at a time with a personal-space clear so services never crowd each other.

Decision (proposed): adapt — keep the owed-count budget (with its debt carry) and the one-at-a-time placement with personal space; move the cadence numbers into zone data per zone tier; reject the donor's random extra rolls as the only source of hubs (keep them only as an optional bonus, off by default on Frankendom's first tier); fix the item-reroll failsafe (section 6).
Acceptance: a seeded server test with extra rolls off asserts that hubs are owed on zone tiers 3, 7 and 11 in the first 12 tiers; a test that forces one attempt to fail asserts that the hub is owed again on the next tier; a placed hub never has two services closer than the personal-space rule allows.

## 6. Gaps and risks

- AGPL-3.0-or-later: clean-room only. The sketch is written from the described mechanism.
- The owed count counts only placed rooms (`rogue.rewardRoomsGenerated` is incremented per success, 1772). A room that fails all 50 tries is not counted, so the owed count is still there next level. That is the intended debt carry, and Frankendom should keep it. It also means that if placement keeps failing, the owed count rises with depth and every later tier tries all of them (up to 50 tries each, 1769); the donor has no cap on how many hubs one tier may attempt (the 100 cap at 1764 only limits the extra rolls). Frankendom needs a cap on attempts per tier.
- Defect (item reroll, Architect.c 1505-1518): the reroll loop for a generated item runs up to 1000 times (`failsafe = 1000`, 1505). When the limit is reached it breaks out (1513) and keeps the last item, even though that item may still be cursed or a duplicate (the loop's own reject test, 1506-1510). The donor then records it as the machine's item (1518). Fix: after the loop, test the same reject conditions again, and fail the instance (or the whole hub) if they still hold. Not measured: how often 1000 rerolls fail.
- The donor's `addMachines` and `buildAMachine` are one-shot per level; the cadence depends on `rogue.depthLevel`. Frankendom zones are data on one runtime, so the tier index must come from zone data, not from a global depth.
- The donor has no minimap and no signage in this file. The library's statues are built into walls (GlobalsBrogue.c 190 row, MF_BUILD_IN_WALLS): that is a landmark-in-wall rule and could be used for zone landmarks. Not checked beyond that row.
- The variants (Rapid, Bullet) change the cadence through the same code. Frankendom should not copy one variant's numbers as the default; the numbers are data.
- Not read: the success and abort path after the features (1531-1731); if the hub is aborted after some features were placed, the donor restores the level from the backup taken at 1222, and the restore code was not read.
