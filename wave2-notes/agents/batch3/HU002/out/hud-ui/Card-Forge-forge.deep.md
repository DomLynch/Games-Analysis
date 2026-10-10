# Card-Forge-forge (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/stage/GameHUD.java` (with `stage/MapStage.java`, `character/CharacterSprite.java`, `util/NavArrowActor.java`) | Licence: GPL-3.0 (`/mnt/frankendom-donors/Card-Forge-forge/LICENSE` read: "GNU GENERAL PUBLIC LICENSE", "Version 3, 29 June 2007"; copyleft, clean-room, shape only) | Java (libGDX/Scene2D) | symbol `GameHUD.updateHiddenEnemyChevrons`

Checked: Read in full: `NavArrowActor.java` (76 lines). Read in part: `GameHUD.java` (lines 365, 374-377, 420-432, 440-545, 660-668, 886-910; the arrow code is 440-545 and was read in full); `MapStage.java` (552-572 and 983-991, plus grep hits); `CharacterSprite.java` (212-226, plus grep); `SettingData.java` and `SettingsScene.java` (grep); `HudScene.java` (grep, line 53). Callers: `updateHiddenEnemyChevrons` has one call site (GameHUD line 365, in `draw()`); `updateEnemyCounter` has one call site (GameHUD line 429, inside `enter()`); `enter()` is called from `HudScene.java` line 53 (grep). Greps were over `forge-gui-mobile/src` and `forge-gui/src`. Not read: the touch-to-travel handling on the minimap (GameHUD ~290-345), the world map `MapViewScene`, what calls `CharacterSprite` wake (the trigger for revealing a hidden mob), and the localiser implementation. Confidence: high on arrow placement and gating; medium on the counter staleness (single call site found by grep, not traced through every scene transition). camera_scope: not a camera cell (the arrows are screen-space HUD drawn from the map camera's projection).

## 1. Mechanism

A clear-quest map (a quest where the player must defeat all enemies) can show a ring of arrows around the player's on-screen point. Each arrow points at one enemy that is flagged as hidden (placed hidden by the map data, not by fog of war).

Order of operations per frame. `GameHUD.draw()` (line 363) calls `act(delta)` first, then `updateHiddenEnemyChevrons()` (line 365), then the normal draw. `updateHiddenEnemyChevrons()` (lines 513-535) checks the gate (lines 514-518): the setting `drawChevronsToHiddenEnemiesInClearQuest` is on, the HUD is not hidden, the player is in a map, a clear quest is active, and at least one enemy remains. If any check fails, every arrow is hidden and the function returns. Otherwise it walks `MapStage.enemies` in order, skipping any enemy that is not hidden, has no stage, or has a defeat dialog (line 525). For each remaining enemy it takes the next arrow index (creating arrow actors on demand, lines 476-485) and calls `positionChevron`. After the loop, leftover arrows are hidden.

`positionChevron` (lines 487-511): project the player's centre into screen coordinates with the map camera (line 490), convert to stage coordinates. The direction is the enemy position minus the player position, normalised; if the distance is under 0.01 it defaults to (1, 0) (lines 494-497). A side vector is perpendicular to it. Lane = index / 2 (line 502), spread = sign times lane times 9 (line 503; sign + for even index, - for odd). The arrow sits 18 units from the player along the direction, shifted sideways by the spread (lines 504-505). The arrow's rotation is the direction angle in degrees (line 508).

Enemy counter. `updateEnemyCounter()` (lines 444-468) writes the remaining count into a box at the bottom-right corner (margin 2). `getRemainingEnemyCount()` counts enemies that are on the stage and not defeated (MapStage lines 983-991). It is called once per `enter()` (line 429), not per frame or per kill.

Arrow animation: a compass sprite sheet with 0.4 s frames, looping (`NavArrowActor` line 31); the rotation is set by `navTargetAngle` (line 17, drawn at line 71).

Hidden mobs: a map object property `hidden` sets the mob's hidden flag (MapStage line 557; line 570 sets `mob.hidden` and the Hidden animation). A hidden sprite reveals only if it has a Wake animation (CharacterSprite line 217); the reveal then sets `hidden = false` (line 221). If there is no Wake animation the sprite stays hidden (line 222, `} else return;`).

## 2. Key functions

- `updateHiddenEnemyChevrons()`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/stage/GameHUD.java` 513-535 (gate, enemy walk, arrow index, hide the rest).
- `positionChevron(chevron, enemy, index)`: same file, 487-511 (projection, direction, lane spread, offset 18, angle).
- `getChevronActor(index)`: same file, 476-485 (creates arrow actors on demand, adds them to the HUD stage).
- `updateEnemyCounter()`: same file, 444-468 (remaining count, bottom-right box).
- `getRemainingEnemyCount()`: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/stage/MapStage.java` 983-991.
- Hidden-mob loading: MapStage.java 557 and 570; reveal: `/mnt/frankendom-donors/Card-Forge-forge/forge-gui-mobile/src/forge/adventure/character/CharacterSprite.java` 217-221.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Arrow points from the player's screen point toward each off-screen or hidden foe, one arrow per foe | Offset 18 units from the player (GameHUD line 504) |
| Fan the arrows sideways so several foes do not share a spot | Lane spacing 9 units (line 503); lanes by index / 2 (line 502) |
| Zero-distance default direction | (1, 0) when the distance is under 0.01 (lines 495-496) |
| Arrow frame time | 0.4 s per frame (NavArrowActor line 31) |
| Gate: setting, HUD hidden, in map, clear quest, remaining > 0 | Setting bool (SettingData line 30) |
| Remaining count: on stage and not defeated | Not a number (MapStage line 986) |
| Arrow cap | None: one arrow per hidden enemy, no cap in the donor |

Defect (spread, found while reading): with `lane = index / 2` and `spread = (index % 2 == 0 ? 1 : -1) * lane * 9`, indices 0 and 1 both get lane 0 and spread 0 (line 502-503). Two hidden enemies in the same direction therefore put two arrows on the same spot. Fix: see the sketch (k = ceil(i / 2), sign - for odd i).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gate, the direction and default direction rule, the 18-unit offset and the 9-unit lane spacing, and it fixes the spread so index 0 and 1 do not overlap. It omits the arrow actors and their lifecycle, the camera projection (the sketch takes the player's screen point as an input), the stage-coordinate conversion, the defeat-dialog check (the sketch takes a `defeated` flag), the 0.4 s animation, and the counter box. It adds a `maxArrows` parameter the donor does not have; set it to the number of arrows you want. Frankendom's MAX_ATTACKERS = 3 is about attackers, not arrows; do not reuse that number here without a ruling.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch of the shape of off-screen enemy arrows around the player, written from the described mechanism, not a translation.
// clean-room
interface V2 { x: number; y: number; }
interface Foe { x: number; y: number; hidden: boolean; inStage: boolean; defeated: boolean; }
interface Arrow { x: number; y: number; angleDeg: number; }

const OFFSET_PX = 18; // distance from the player's screen point to the arrow (donor GameHUD.java line 504)
const LANE_PX = 9;    // spread per lane (donor GameHUD.java line 503)

// Gate: the arrows show only for a clear-quest map, with the setting on, the HUD visible, and foes left.
// Mirrors donor GameHUD.java lines 514-518 (setting, HUD hidden, in map, clear quest active, remaining > 0).
function arrowsEnabled(settingOn: boolean, hudHidden: boolean, inMap: boolean, clearQuest: boolean, remaining: number): boolean {
  return settingOn && !hudHidden && inMap && clearQuest && remaining > 0;
}

// Remaining enemies: on the stage and not defeated (donor MapStage.java lines 986-988).
function remainingEnemies(foes: Foe[]): number {
  return foes.filter(f => f.inStage && !f.defeated).length;
}

// One arrow per hidden foe. Arrows sit in a fan around the player's screen point (already projected).
// Donor: lane = index / 2 and spread = sign * lane * 9, which puts index 0 and index 1 both at spread 0.
// Fix in this sketch: k = ceil(i / 2), sign = -1 for odd i, +1 for even i, so the spreads run 0, -9, +9, -18, +18.
function layoutArrows(playerScreen: V2, playerWorld: V2, foes: Foe[], maxArrows: number): Arrow[] {
  const out: Arrow[] = [];
  const hidden = foes.filter(f => f.hidden && f.inStage && !f.defeated);
  for (let i = 0; i < Math.min(hidden.length, maxArrows); i++) {
    let dx = hidden[i].x - playerWorld.x;
    let dy = hidden[i].y - playerWorld.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
    const side = { x: -dy, y: dx };
    const k = Math.ceil(i / 2);
    const sign = i % 2 === 1 ? -1 : 1;
    const spread = sign * k * LANE_PX;
    out.push({
      x: playerScreen.x + dx * OFFSET_PX + side.x * spread,
      y: playerScreen.y + dy * OFFSET_PX + side.y * spread,
      angleDeg: Math.atan2(dy, dx) * 180 / Math.PI,
    });
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/Card-Forge-forge-chevrons.ts`: exit 0.

## 5. Lands in

- TARGET `origins/client/hud/offscreen-arrows.ts` (new client HUD module). The arrows are a view of engine state (which foes are hidden and where they are), so the engine supplies the list and the client draws it. Not in `src/fight`.
- Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 2 (HUD is a client view over engine state); the arrow list is server-supplied only if the foe is in the player's zone.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism.
- Meaning of "hidden": in the donor it is a designer flag on a map mob (MapStage 557, 570), revealed by a Wake animation. Frankendom's ruling is that the engine decides what the player can see. Adapt: define "hidden" as "engaged or in the zone but not in the camera view" from engine state, not as a map flag, and keep the designer flag only as a data field if a zone wants an ambush.
- Defect 1, arrow overlap: indices 0 and 1 get spread 0 (GameHUD 502-503). Fix in the sketch (k = ceil(i / 2), sign by parity).
- Defect 2, stale counter: the counter text is written only in `enter()` (GameHUD line 429, inside `enter()` at line 374). `enter()` runs from `HudScene.java` line 53. No per-kill refresh was found in the donor. Fix: recompute the count from the engine on every defeat event and whenever the foe list changes (Frankendom has one ledger, so the count can be a derived value, not a cached one).
- Defect 3, no cap: one arrow per hidden enemy, unlimited (the donor creates actors on demand). A 10-foe ambush gives 10 arrows around a 375 px hero. Fix: a cap as zone data, and a rule for which arrows to keep (nearest first).
- Readability at 375 wide: the donor ring sits 18 units from the player, so it can overlap the hero sprite on a small screen. Not measured. A phone test is needed.
- Localisation: `forge-gui/res/languages/en-US.properties` has about 3,344 non-comment `key=value` lines (grep count) and 438 lines with `{0}` placeholders (grep count). The counter text is `lblRemainingEnemies=Remaining Enemies: {0}` (line 3522). The same bundle folder has 10 `.properties` locales and 8 `cardnames-*.txt` files. Grammar: plain English values, numbered `{0}` placeholders, and icon tokens in strings such as `[+Dot]` and `[+StrangeKey]` (GameHUD lines 435-440) and `[%80]` size markup (GameHUD lines 417 and 420). Frankendom can reuse the placeholder shape for HUD text.
- The fr-FR file has the same English text for `lblRemainingEnemies` (grep; not a translation check).
- Not read: the minimap touch-to-travel (GameHUD ~290-345), `MapViewScene` (world map), and the wake trigger.

Best transferable idea: a ring of arrows around the hero that points at each foe the player cannot see, fanned so they never stack, shown only in the fight state the player needs.
Decision (proposed): adapt - the arrow ring suits many-on-one fights (foes outside the view or behind a wall, and the queue beyond MAX_ATTACKERS), but the donor's "hidden" is a designer flag, the spread overlaps, and the counter is stale; Frankendom takes the shape with engine-derived visibility, a fixed spread, a cap as data and a count derived from the ledger.
Acceptance: a hero with two foes behind a wall sees two arrows fanned apart around the hero, pointing at them; with the setting off no arrow appears; a test asserts that the first three arrows have distinct positions and that the remaining count drops on each defeat.
