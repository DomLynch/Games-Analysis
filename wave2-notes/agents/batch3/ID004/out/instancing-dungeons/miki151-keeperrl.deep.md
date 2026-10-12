# miki151-keeperrl (instancing-dungeons, cell 19)

Donor: `/mnt/frankendom-donors/miki151-keeperrl/game.cpp` (with `player.cpp`, `model.cpp`, `level.cpp`, `player_control.cpp`, `village_control.cpp`) | Licence: GPL-2.0 (LICENSE line 1-2: "GNU GENERAL PUBLIC LICENSE" / "Version 2, June 1991"; the "or any later version" clause was not read) | C++ | symbol `Game::transferCreature` (with `Player::transferAction`, `Level::getLandingSquare`, `Level::landCreature`)

Checked: Data half read: `data_free/game_config/enemies.txt` (the `behaviour` blocks, 8 `ambushChance` lines). The list's hint file, `level_maker.cpp`, is level generation and is not the mechanism. The mechanism is the travel between site models (each site is a `Model` with its own `Level`s and its own time queue). Read in full: `Game::getCurrentModel` (228-232), `Game::update` (388-411; the clock call is at 404), `Game::updateModel` (427-449), `Game::isVillainActive` (445-448), `Game::tick` villain loop (470-486), `Game::prepareSiteRetirement` (270-322), `Game::initializeModels` (354-376), `Game::transferCreature` and `getTransferPos` (529-549), `Player::transferAction` (844-880), `PlayerControl::considerTransferingLostMinions` (3756-3764), `Level::landCreature` and `projectOnBorders` (313-350), `Level::getClosestLanding` (352-372), `Level::landCreature(vector)` (377-380), `Model::transferCreature` and `canTransferCreature` (388-404), `Model::update` (116-135, partly), `VillageControl::considerVillainAmbush` (219-245, partly). Not read: the ambush placement after line 245, `Rectangle::left/right/width/height` bodies (only the `centered` signature, util.h 276), the distance function `distD`, `Creature::retire`, campaign site generation. Confidence: high on the party transfer, direction landing, leave-behind, frozen clock and retirement cleanup; medium on the ambush (its end is not read). camera_scope not applicable.

Best transferable idea: When a party crosses a zone border, place each member on the border that faces the way they came in, fall back through a fixed widening search, and show one list of members who could not come, which the player confirms or cancels as a whole.
Decision (proposed): adapt — the direction-aware border landing and the one-list leave-behind fit zones as data on one runtime; the separate engine per site does not (rejected as a shape), and the frozen clock needs absolute due-times to fit row 23.
Acceptance: walking east out of zone A puts the party on zone B's west border in the same band; a turned-off member appears once in the leave-behind list; declining the list leaves every member in zone A; a server test asserts an empty zone's respawn timer resolves on re-entry instead of freezing.

## 1. Mechanism

- Zones are separate models. `Game` holds a table of `Model`s, one per site, and `getCurrentModel()` is the model of the first player creature (game.cpp 230). Each model has its own time queue and its own local clock (`Model::getLocalTime`, model.cpp 219).
- Only the current model's clock advances. `Game::update` calls `updateModel(currentModel, localTime[currentId] + timeDiff, endTime)` (404). Other models are touched once, at start-up, and only to catch them up to a small offset (`initialModelUpdate = 2_visible`, game.cpp 352 and 373). So a site the player is not in has its creature queue frozen, and it resumes from its own clock when entered. Collectives are different: each global second the tick calls `col->update(...)` for every collective that `isVillainActive` (main model, or inside campaign influence; 445-448 and 480-483), with `false` for a collective whose model is not the current one. What that flag changes was not read (`Collective::update`, collective.cpp 515). No catch-up from global time is applied to the frozen queues in these lines.
- Party transfer (`Player::transferAction`, player.cpp 844-880):
  (a) the party is the player's team (`getTeam()`, 844); the destination is chosen by the player (845); members already in the destination are skipped (846);
  (b) each remaining member is tested: turned off goes to a `turnedOff` list (851-853); a member who cannot land (`game->canTransferCreature`, 855) or who is sunlight-vulnerable in daylight goes to a `cant` list (855-858);
  (c) if either list is not empty the player sees one prompt per list, and declining returns without moving anyone (861-864: each list has its own prompt, and a declined prompt is a `return` at 862 and 864);
  (d) the rest are moved one by one (867), then `setWasTransfered()` (869) makes `updateModel` return early so the frame stops in the old zone (game.cpp 423, 434-436);
  (e) named collectives in the destination each get an ambush roll on the arrivals, and the first success ends the loop (872-878).
- Moving one creature (`Game::transferCreature`, game.cpp 534-548): it is skipped if it is already there or carries a rider; the model moves it with `extractCreature`, placed by travel direction (`from->position - to->position`, 538); companions and steeds are moved with it, recursively.
- Landing by travel direction (`Model::transferCreature`, model.cpp 388-392; `Level::landCreature`, level.cpp 344-350; `Level::getLandingSquare`, 334-342):
  1. `projectOnBorders(bounds, travelDir)` (322-332) casts a ray from the zone centre in the travel direction and returns the point on the border it hits: a side border (`right - 1` or `left`) if the ray exits through a side, else the top or bottom border (`bottom - 1` or `top`).
  2. The landing square nearest that point is `bestLanding` (334-341).
  3. Fallbacks, in order (345-349): place at `bestLanding`; else at the 10-radius block around it (`Rectangle::centered(Vec2(0, 0), 10)`); else at any landing square for the stair key; else at any landing square of the level.
  4. Each attempt goes through `landCreature(vector, creature)` (377-380), which takes the closest square a creature can enter by a breadth-first search (`getClosestLanding`, 352-372) from the candidate squares in random order.
- Arrival delay: `Model::addCreature` queues a new arrival one visible turn later (model.cpp 165-172, default delay `1_visible` at 166).
- Straggler recall (`PlayerControl::considerTransferingLostMinions`, player_control.cpp 3756-3764): run from the PlayerControl tick (call at 3859, in the same function as the `PROFILE_BLOCK` at 3852). It does nothing unless the game's current model is the controller's model (3757). Any team member in another model who is not stunned is moved back to the controller's model (3759-3763).
- Retirement (`Game::prepareSiteRetirement`, game.cpp 270-322): all non-base models are discarded (272-273); the player's collective is retired; creatures in any non-base model are moved to the main model (311), and creatures that a site's collective owns but that stand in the main model are sent back to that site (313-318); the main model is then prepared for retirement (`prepareForRetirement`, model.cpp 81-90: external enemies dropped, creature info cleared).

## 2. Key functions

- `Game::transferCreature`: `/mnt/frankendom-donors/miki151-keeperrl/game.cpp` 534-548. One creature, with its companions and steeds, from its model to another.
- `Player::transferAction`: `/mnt/frankendom-donors/miki151-keeperrl/player.cpp` 844-880. The party move: filter, leave-behind lists, one confirmation, move, flag the zone switch, ambush check.
- `Level::getLandingSquare` and `projectOnBorders`: `/mnt/frankendom-donors/miki151-keeperrl/level.cpp` 322-342. Border point facing the travel direction, and the landing square nearest it.
- `Level::landCreature` (travel direction): `/mnt/frankendom-donors/miki151-keeperrl/level.cpp` 344-350. The four-step fallback.
- `Game::update` and `Game::updateModel`: `/mnt/frankendom-donors/miki151-keeperrl/game.cpp` 388-411 (clock call at 404) and 427-449. Only the current model's clock advances.
- `Game::prepareSiteRetirement`: `/mnt/frankendom-donors/miki151-keeperrl/game.cpp` 270-322. Retirement cleanup across all site models.
- `PlayerControl::considerTransferingLostMinions`: `/mnt/frankendom-donors/miki151-keeperrl/player_control.cpp` 3756-3764. Straggler recall.
- `VillageControl::considerVillainAmbush`: `/mnt/frankendom-donors/miki151-keeperrl/village_control.cpp` 219-245 (partly read). Arrival ambush with a breadth-first ring at distance 3.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Border point facing the travel direction; the landing square nearest to it | Integer centre and half-extent maths (level.cpp 323, 327-328); rounding is integer division |
| Fallback: exact square, then a block around it, then every landing square | Block radius 10 (level.cpp 347) |
| Arrival waits one turn before acting | 1 visible turn (model.cpp 166) |
| Only the zone the player is in advances its clock; others freeze | Catch-up at start-up of 2 visible turns (game.cpp 352) |
| Leave-behind: list the members who cannot come, one confirmation, decline cancels all | Rules: turned off; cannot land; sunlight-vulnerable by day (player.cpp 851-858) |
| Ambush chance is a per-village data value | `ambushChance` default 0.0 (village_behaviour.h 23); the data half, `data_free/game_config/enemies.txt`, sets it in 8 village behaviours: 0.1 (251, 394, 1387, 1639, 2602) and 0.05 (470, 900, 1349) |
| Ambush ring at distance 3 from the travellers | Distance 3 (village_control.cpp 225, 238) |

## 4. TypeScript sketch

simplified: the sketch keeps the border landing (the projection and the fallback order, with the block radius 10), the party filter, one leave-behind list with one confirmation that cancels the whole move, the zone-switch result, straggler recall, and the frozen clock. It omits the rider and steed rules, the recursion into companions, the arrival delay, the start-up catch-up, the ambush, the retirement cleanup, and the BFS in `getClosestLanding` (the sketch takes the first free candidate, not the nearest reachable one). `dist` is a Chebyshev stand-in for the donor's `distD` (definition not read). The sketch merges the donor's two prompts into one list. Its `isDay` flag stands in for the donor's sunlight state. The donor's global time, which is set for all models, is not in the sketch.

```ts
// Licence: GPL-2.0 (donor). Clean-room: written from the described mechanism, not a translation.
interface Vec2 { x: number; y: number }
interface Rect { left: number; top: number; right: number; bottom: number } // right and bottom exclusive
interface Unit {
  id: number;
  zone: string;
  pos: Vec2;
  turnedOff: boolean;
  sunlightVulnerable: boolean;
  stunned: boolean;
}
interface Zone {
  id: string;
  bounds: Rect;
  localTime: number;          // only the zone the player stands in advances
  landing: Vec2[];            // border squares where arriving units may be placed
  free: (p: Vec2) => boolean; // can a unit stand here
}

const cdiv = (a: number, b: number): number => Math.trunc(a / b); // C++ int division truncates
const LANDING_BLOCK_RADIUS = 10; // donor level.cpp 347, Rectangle::centered(Vec2(0, 0), 10)

// Border point on the side of the zone that faces the direction of travel.
function projectOnBorders(area: Rect, d: Vec2): Vec2 {
  const w = area.right - area.left;
  const h = area.bottom - area.top;
  const cx = cdiv(area.left + area.right, 2);
  const cy = cdiv(area.top + area.bottom, 2);
  if (d.x === 0) return { x: cx, y: d.y > 0 ? area.bottom - 1 : area.top };
  const offY = cdiv(cdiv(d.y * w, 2), Math.abs(d.x));
  if (cy + offY >= area.top && cy + offY < area.bottom)
    return { x: d.x > 0 ? area.right - 1 : area.left, y: cy + offY };
  const offX = cdiv(cdiv(d.x * h, 2), Math.abs(d.y));
  return { x: cx + offX, y: d.y > 0 ? area.bottom - 1 : area.top };
}

const dist = (a: Vec2, b: Vec2): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// Landing square nearest the entry border, then a widening fallback: the radius-10 block around it,
// then every landing square. Returns the first free candidate (donor: closest reachable via BFS).
const key = (p: Vec2): string => `${p.x},${p.y}`;

function pickLanding(zone: Zone, travelDir: Vec2, taken: Set<string>): Vec2 | null {
  if (zone.landing.length === 0) return null; // donor takes landing[0] unchecked (level.cpp 337)
  const ok = (p: Vec2): boolean => zone.free(p) && !taken.has(key(p));
  const entry = projectOnBorders(zone.bounds, travelDir);
  let best = zone.landing[0];
  for (const p of zone.landing) if (dist(p, entry) < dist(best, entry)) best = p;
  const block: Vec2[] = []; // donor: Rectangle::centered(center, radius 10); exact inclusive extent not read
  for (let dy = -LANDING_BLOCK_RADIUS; dy <= LANDING_BLOCK_RADIUS; dy++)
    for (let dx = -LANDING_BLOCK_RADIUS; dx <= LANDING_BLOCK_RADIUS; dx++)
      block.push({ x: best.x + dx, y: best.y + dy });
  for (const candidates of [[best], block, zone.landing]) {
    const hit = candidates.find(ok);
    if (hit) return hit;
  }
  return null;
}

interface TransferResult { moved: Unit[]; left: Unit[]; switchedZone: boolean }

// Move a party from its zones into `dest`. Members already there are skipped; members that
// are turned off, cannot land, or are sunlight-vulnerable by day are left behind after one
// confirmation (declining cancels the whole transfer). Returns null when the player declines.
function transferParty(
  team: Unit[],
  dest: Zone,
  travelDir: Vec2,
  isDay: boolean,
  confirmLeave: (left: Unit[]) => boolean,
): TransferResult | null {
  const left: Unit[] = [];
  const moved: Array<{ unit: Unit; spot: Vec2 }> = [];
  const taken = new Set<string>();
  for (const u of team) {
    if (u.zone === dest.id) continue;
    // Fix: the donor runs its turned-off test and its landing/sunlight test as two plain
    // ifs (player.cpp 851-858), so a turned-off member that also fails the second test is
    // listed twice. Here each member lands in exactly one list.
    const spot = u.turnedOff ? null : pickLanding(dest, travelDir, taken);
    if (u.turnedOff || spot === null || (u.sunlightVulnerable && isDay)) {
      left.push(u);
      continue;
    }
    taken.add(key(spot));
    moved.push({ unit: u, spot });
  }
  if (left.length > 0 && !confirmLeave(left)) return null;
  for (const { unit, spot } of moved) {
    unit.zone = dest.id;
    unit.pos = spot;
  }
  return { moved: moved.map((m) => m.unit), left, switchedZone: moved.length > 0 };
}

// Each tick while the controller's zone is the one the player is in, pull back any
// member who wandered into another zone (stunned members are skipped).
function recallStragglers(team: Unit[], controllerZone: string, currentZone: string, pull: (u: Unit) => void): void {
  if (currentZone !== controllerZone) return;
  for (const u of team) if (u.zone !== currentZone && !u.stunned) pull(u);
}

// Only the current zone's clock advances; the others stay frozen until entered again.
function advanceClock(zones: Map<string, Zone>, currentId: string, dt: number): void {
  const z = zones.get(currentId);
  if (z) z.localTime += dt;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: row 23, spawn caps, respawn, despawn on empty with a grace timer). The border landing and the leave-behind list belong with zone entry; the frozen clock is only safe if respawn and despawn timers are stored as absolute due-times (see section 6). Not read in this pass: the Frankendom file.
- today: `origins/server/world-spawns.ts` (not read).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only, shape only)
- Brief rule served: row 23 zone population; rule 1 one engine (no per-zone engine copy); zones as data (adjacency gives the travel direction).

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, and the donor's one-engine-per-site design is not copied.
- Rulings: one engine. The donor gives each site its own `Model`, time queue and level set. Frankendom keeps zones as data on one runtime; the transferable part is the landing rule and the list, not the per-model engine.
- Server-verified: the donor's prompts are client UI. Frankendom must make the server decide who is left behind, from the same rule, and the client only shows the list.
- Frozen zone clock: a zone the player is not in does not advance its creature queue (collectives in influence still get the once-a-second update, flag `false`; its meaning was not read). Row 23 needs an empty zone to despawn and respawn on time, so the timers must be absolute due-times that resolve on entry (fix: store `dueAt` in the zone's ledger instead of counting local ticks). The donor has no such timers in these lines (not read).
- One ledger: the donor's leave-behind and recall act on creature objects in several places. Frankendom must keep a single record per party member and apply the rule once.
- Defect 1: the turned-off test and the landing/sunlight test are two plain `if`s (player.cpp 851-858). A turned-off member that also fails the second test is listed twice. Fix: one `if` / `else`, as in the sketch.
- Defect 2: `Level::getLandingSquare` takes `landing[0]` with no check (level.cpp 337). If the list can be empty, this reads out of bounds. Fix: return null and let the caller refuse the transfer (the sketch does this). Whether an empty list can occur was not read.
- Defect 3: `projectOnBorders` uses integer division for the centre and the slope (level.cpp 323, 327-328). This moves the entry by at most one square on odd sizes. Fix: none needed for a grid; if zones use fractional coordinates, use floats.
- Risk: `Model::transferCreature` ends in a `CHECK` (model.cpp 391), which aborts when landing fails. The caller checks first (player.cpp 855), so this only fires in a race. Fix: return false and keep the member on the source side.
- Ambush: the ring search uses `attackers[0]` and a radius of 3 (village_control.cpp 225-238). Frankendom's MAX_ATTACKERS = 3 must cap who an ambush can add; the placement after line 245 was not read.
- Not transferable: the sunlight and turned-off states (not in Frankendom's rulings); the steed and rider rules (only if Frankendom adds mounts).

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only, shape only)
Brief rule served: row 23 zone population; rule 1 one engine.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN.
- Errors: none material; sketch merges fallback tiers 3 and 4 into one list and the two prompts into one (disclosed or minor).
- Missed: forceSteeds() call at player.cpp 871 between move and ambush not mentioned.
