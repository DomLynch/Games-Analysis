# nkzw-tech-athena-crisis (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/Mask.tsx` | Licence: MIT (`LICENSE.md` line 3, "The MIT License (MIT)", titled "Source Code License"; art and assets not checked) | TypeScript/React | symbol `Mask`

Checked: the hint file `hera/ui/ErrorOverlay.tsx` is an error dialog, not a HUD; read lines 1-60, not used. The touch and target mechanism is `hera/Mask.tsx` (281 lines, read in full) with the press hook `ui/hooks/usePress.tsx` (53 lines, read in full). Also read: `hera/GameMap.tsx` 2162-2185 (which mask is mounted in play; the `expand` flag), `hera/Unit.tsx` 209-232 (health bar), `athena/map/Configuration.tsx` line 40 (`MaxHealth`), `i18n/AvailableLanguages.tsx`, `i18n/Common.ts`, `hera/i18n/translateMessage.tsx` 1-20. Callers: `Mask` is mounted once in play (GameMap 2172, with `expand={!editor}` at 2177); `MaskWithSubtiles` only when decorators are being edited (2162-2163). Not read: the `use-long-press` library (not in the donor; version pinned at `ui/package.json` 27, `^3.3.0`), so its movement-cancel and click semantics are assumed from the option names (see section 4). Not read: `hera/Radius.tsx` (the `locked` flag), the `_enter` and `_select` handlers, `hera/__tests__/GameMap.test.tsx`. Confidence: high on what `Mask.tsx` computes and in what order. Medium on the final result of the overlap pass for chains of three or more expanded tiles, because I did not run it (section 6).

## 1. Mechanism

- Press and tap (`usePress.tsx` 11-51, used by `Mask` 147-159). A press starts a 380 ms long-press timer (36). If the timer fires, the flag `hasLongPress` is set (27) and `onLongPress` runs; the click that follows a long press is then suppressed (44-45). A short press calls `onPress` (45), which selects the tile under the pointer (`Mask` 150-158). The flag is cleared on start and on cancel (34-35). The `Mask` passes its tile size as `cancelOnMovement` (148), so a moving press cancels the long press. A long press opens the field info card at the touch origin (136-144).
- Target grace (`Mask.tsx` 36-93, `getOffsets`). Each tile gets four grace values (up, right, down, left, in px) and a priority, from the first rule that matches, in this order: a move or attack radius tile (not the attack type) gets 4 px, Low (51-53); a tile with a message gets 1 px, High (55-57); an attackable tile gets 6 px, High (59-61); an own tall unfinished building gets 12 px up when nothing of the viewer's sits above it and 6 px otherwise, plus 6 px on the sides, Low (63-77); an own or selected unit gets 6 px, High (79-86). Anything else gets none (92).
- No-overlap pass (`Mask.tsx` 197-226). For each tile, four checks: the left neighbour's right grace with this tile's left (202-206), the up neighbour's down with this tile's up (208-212), the top-left corner's right with this tile's left (214-218), and the top-right corner's left with this tile's right (220-224). When both sides of a shared edge or corner have grace, both are set to zero. So a grace area never overlaps another grace area. It can extend only into a neighbour that has no grace facing it. The donor comment at 196 says the pass mutates earlier entries, and calls that acceptable.
- Layout (`Mask.tsx` 239-255). Each tile is an absolutely positioned div, enlarged by its grace on each side and shifted by the same amount (246-253). Its z-index is the layer base plus its priority (252), so High grace sits above Low.
- Drag-release (`Mask.tsx` 161-184). While the finger moves, the tile under it is found with `document.elementFromPoint` (164) and entered with type `move` (166), and each new tile is appended to a path (167-169). On touch end (175-184), if the path holds at least two tiles (176), the last tile is selected only if the radius is not locked and the tile is in the radius fields or attackable (178-179). The path is cleared (183) either way.
- Health bar (`Unit.tsx` 211-232). The bar is drawn only when 0 < health < 100 (220). Its colour is red below one third of max, yellow below two thirds, otherwise green (227). Its width is the health as a percentage (228), and its opacity is 0 when the caller's `hide` flag is set (224).

## 2. Key functions

- `getOffsets`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/Mask.tsx` 36-93 (grace and priority per tile; read in full).
- `Mask` (component): same file, 110-273 (press wiring 147-159; touch 161-184; overlap pass 186-226; layout 228-257).
- `usePress`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/ui/hooks/usePress.tsx` 11-51 (read in full).
- `Health`: `/mnt/frankendom-donors/nkzw-tech-athena-crisis/hera/Unit.tsx` 211-232.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-target forgiveness grown by state, not by a fixed radius | Attackable 6 px (60), own unit 6 px (85), radius 4 px (52), message 1 px (56), own unfinished building 12 px up and 6 px on the sides (75) |
| Forgiveness never overlaps another target's forgiveness | Rule is structural (202-224), no constant |
| Layer by priority so the important target wins a tap in an overlap | High 2, Low 1, None 0 (15-19, 252) |
| Press versus long press with click suppression | 380 ms (36) |
| Drag-release commits only after a real drag | Minimum 2 tiles in the path (176) |
| Health bar shown only while damaged | Hidden at 0 and at max; max 100 (`athena/map/Configuration.tsx` 40) |
| Health colour bands | One third and two thirds of max (227) |

String table fold-in: this donor's translation data is not in the box. `i18n/Common.ts` (line 1) re-exports `./Entities.ts`, and `Entities.ts` is not present, so no entry count is possible. What is present: 12 locales (`i18n/AvailableLanguages.tsx` 2-13, from English to Ukrainian). The source side uses Facebook's `fbt` for text. Grep counts across the donor (occurrences, .ts and .tsx, not receipts): 234 `fbt(` calls, 512 `<fbt` elements, 156 `<fbt:param>`, 64 `<fbt:plural>`, 5 `<fbt:enum>`. Grammar is the fbt one: parameters are named, plurals and enums choose the variant from the parameter, and `translateMessage.tsx` 14-19 tries the translated message and falls back to the original if the translation throws (a dropped parameter makes `fbt` throw, per the comment at 11-12).

## 4. TypeScript sketch

simplified: the sketch keeps the donor's rule order for grace (radius, message, attackable, own building, own unit) and the press, long-press and drag-release logic. It drops the radius-only branch (section 6, defect 1) because it can never run. It replaces the in-place overlap pass with a pure pass that reads the original grace of every tile and cuts both sides wherever two expansions meet. That is order-independent and cuts corners the donor's sequential pass may keep. It drops the DOM, the `document.elementFromPoint` lookup, the click event types, the editor mask, and the health bar. The long-press movement rule is an assumption, marked in the code, because the library was not read.

```ts
// clean-room: written from the described mechanism (per-target grace areas by state,
// no-overlap pass, priority layers, press versus long press, drag-release commit).
// Donor licence MIT (source code); no line is translated.

export enum Priority { None = 0, Low = 1, High = 2 }

export interface Grace { up: number; right: number; down: number; left: number; priority: Priority; }
export const NO_GRACE: Grace = { up: 0, right: 0, down: 0, left: 0, priority: Priority.None };

// Facts about one tile (data). radius = inside a move or attack radius that is not the attack type.
export interface TileFacts {
  radius: boolean;
  message: boolean;
  attackable: boolean;
  ownUnit: boolean;               // own unit, or the selected unit
  ownBuildingUnderConstruction: boolean;
  buildingSpaceAboveFree: boolean; // no own building and no own unit above
}

// Grace in px by what the tile holds (donor values, kept as data).
export const GRACE_PX = { radius: 4, message: 1, attackable: 6, unit: 6, buildingUp: 12, buildingSide: 6 };

export function graceFor(t: TileFacts): Grace {
  if (t.radius) return { up: GRACE_PX.radius, right: GRACE_PX.radius, down: GRACE_PX.radius, left: GRACE_PX.radius, priority: Priority.Low };
  if (t.message) return { up: 1, right: 1, down: 1, left: 1, priority: Priority.High };
  if (t.attackable) return { up: GRACE_PX.attackable, right: GRACE_PX.attackable, down: GRACE_PX.attackable, left: GRACE_PX.attackable, priority: Priority.High };
  if (t.ownBuildingUnderConstruction) {
    const up = t.buildingSpaceAboveFree ? GRACE_PX.buildingUp : GRACE_PX.buildingSide;
    return { up, right: GRACE_PX.buildingSide, down: GRACE_PX.buildingSide, left: GRACE_PX.buildingSide, priority: Priority.Low };
  }
  if (t.ownUnit) return { up: GRACE_PX.unit, right: GRACE_PX.unit, down: GRACE_PX.unit, left: GRACE_PX.unit, priority: Priority.High };
  return NO_GRACE;
}

type Side = 'up' | 'right' | 'down' | 'left';
// [dx, dy, side of this tile, side of the other tile]: edge and corner neighbours.
const NEIGHBOURS: Array<[number, number, Side, Side]> = [
  [-1, 0, 'left', 'right'],
  [0, -1, 'up', 'down'],
  [-1, -1, 'left', 'right'],
  [1, -1, 'right', 'left'],
];

// No-overlap pass. Reads the original grace of every tile, then cuts both sides wherever two
// expansions meet. Pure: no tile is written through another tile's array.
export function resolveGrace(tiles: ReadonlyMap<string, Grace>): Map<string, Grace> {
  const out = new Map<string, Grace>();
  for (const [key, g] of tiles) out.set(key, { ...g });
  for (const [key, g] of tiles) {
    const [x, y] = key.split(',').map(Number);
    for (const [dx, dy, mine, theirs] of NEIGHBOURS) {
      const otherKey = `${x + dx},${y + dy}`;
      const other = tiles.get(otherKey);
      if (other && g[mine] > 0 && other[theirs] > 0) {
        out.get(key)![mine] = 0;
        out.get(otherKey)![theirs] = 0;
      }
    }
  }
  return out;
}

export const LONG_PRESS_MS = 380;   // donor: usePress threshold
export const DRAG_MIN_TILES = 2;    // donor: lastVectors.length >= 2

// Press: a short press selects; a long press fires once and suppresses the click that follows.
export class PressTracker {
  private longFired = false;
  start(): void { this.longFired = false; }
  cancel(): void { this.longFired = false; }
  onLongPress(open: () => void): void { this.longFired = true; open(); }
  onClick(select: () => void): void { if (!this.longFired) select(); }
}

// Assumed: a long press is cancelled when the pointer moves more than one tile. The donor passes
// the tile size to the library option; the library's exact rule was not read.
export function longPressCancelled(movedPx: number, tilePx: number): boolean {
  return movedPx > tilePx;
}

// Drag-release: the finger's path of tiles. Commit only after a drag over at least two tiles, and
// only onto a tile the caller accepts (radius or attackable, not locked).
export class DragPath {
  private path: string[] = [];
  enter(tileKey: string): void {
    if (this.path[this.path.length - 1] !== tileKey) this.path.push(tileKey);
  }
  release(canCommit: (tileKey: string) => boolean): string | null {
    const path = this.path;
    this.path = [];
    if (path.length < DRAG_MIN_TILES) return null;
    const last = path[path.length - 1];
    return canCommit(last) ? last : null;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 athena-touch-targets.ts` on the VPS (/tmp), exit 0.

## 5. Lands in

- TARGET `src/fight/touch-targets.ts` (new, pure: grace by target state, the no-overlap pass, press and long-press, drag-release). The fight view reads it; the engine validates the target.
- Parity-checklist row 5 (controls/input). The hint named row 14, but the mechanism is input forgiveness, not a HUD element. The HUD side of this donor (the health bar, section 1) is row 14 and is a secondary point below.
- Reuse tag: rewrite-from-idea (MIT source; adapted in shape, clean-room sketch).

## 6. Gaps and risks

- MIT: adaptation is allowed. The sketch is a clean-room shape, not a copy. Art and assets were not checked.
- Defect 1, fixed (removed) in the sketch: lines 88-90 return 1 px for a radius tile, but line 51 has already returned 4 px for every tile where `hasRadius` is true, and `hasRadius` is a `const` (49), so 88-90 can never run. Effect: radius tiles always get 4 px. fix: delete the dead branch, or make one rule decide.
- Defect 2, fixed in the sketch: the pass writes into earlier tuples in place (the neighbour writes at 203, 209, 215 and 221) while a changed tile may already hold a copy (slices at 204, 210, 216 and 222). Whether a write reaches the output then depends on order. The comment at 196 accepts this. Not run. fix: a pure pass (`resolveGrace`), which reads the original values.
- Corner rule as read: the top-left corner check (214) tests `offsets[3]` after the left-edge check (202-205) may already have zeroed it. So a top-left corner expansion can survive when its shared edge was cut. The top-right check (220) tests `offsets[1]`, which no earlier check zeroes. Whether the surviving corner gives visible overlap in the game was not tested. The sketch cuts every touching pair.
- `use-long-press` (library, `^3.3.0`): the movement-cancel rule behind `cancelOnMovement` and the click interplay were not read. The sketch's `longPressCancelled` is an assumption. Verify against the library before porting.
- Frankendom ruling "server-verified kills": the chosen target is a proposal. The server must check it is an attackable enemy in range and reject anything else. The grace areas must never decide a hit on the client.
- Frankendom ruling "MAX_ATTACKERS = 3": with three attackers around the hero, each gets 6 px of grace and the no-overlap rule keeps the three claims separate, which is the property we need. The donor has no cap on the number of targets, so the cap comes from our rule.
- Px values are tile-unit px at the donor's tile size. The 375-wide phone target must be sized in screen px at that width; the donor does not show that conversion.
- Secondary (health frame, row 14): `Unit.tsx` 220-228 shows the bar only while damaged and in three colour bands. This matches the hide-at-full rule in the keeperrl note (cell 2). Two donors agreeing is a weak signal, not a decision.
- Not read: `hera/Radius.tsx` (the `locked` semantics), `_enter` and `_select` in `GameMap.tsx`, and the GameMap test file. The "move" entry type is passed through unread.

Best transferable idea: give each attackable target a small grace area sized by its state, cut wherever two grace areas meet, commit a drag-release only onto a valid target after a real drag, and let a long press open info and suppress the click after it.

Decision (proposed): adapt — keep the state-sized grace with the no-overlap rule, the press and long-press split and the drag-release commit, with the dead branch removed and the pass made pure; reject the per-tile DOM grid and the tile-unit px offsets, since the client proposes a target and a 3D view needs a screen-space hit radius.
Acceptance: On a 375-wide phone a tap within 6 px outside an enemy's sprite attacks that enemy; a unit test on `resolveGrace` asserts two adjacent enemies' grace areas never overlap; a 380 ms hold opens the unit card and the release does not also select; a drag over at least two tiles that releases on an attackable enemy attacks it, and a release on an empty tile does nothing.

Reuse tag: rewrite-from-idea (MIT source; shape adapted, clean-room sketch)

Brief rule served: parity row 5 (controls/input, touch targets); section 6 rulings (server-verified kills, MAX_ATTACKERS = 3).
