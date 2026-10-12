# alexbatalov-fallout2-ce (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/interface.cc` | Licence: Sustainable Use License 1.0 (`/mnt/frankendom-donors/alexbatalov-fallout2-ce/LICENSE.md`; same licence as the Fallout 1 donor: internal business or non-commercial use only) | C | symbol `indicatorBarRefresh` (with `indicatorBarRender`, `indicatorBarAdd`)

Checked: (verified: chip constants and enum interface.cc 44-77; chip struct and table 79-95 and 196-201; label and colour 2237-2262; refresh from 2302 (qsort at 2342); render from 2393; add 2446-2459; comparator 2376-2387; layout comments 52-56; interface.h 9-10; refresh call sites critter.cc 371, 480, 1157, 1172, each read with its four preceding lines; world-map tab scroll worldmap.cc 4386-4446 and pixel scroll 4838-4850, read). The HP readout `interfaceRenderHitPoints` (interface.cc 877-945) has the same structure as the Fallout 1 roll (cell 2); grep-checked at 877, 936, not re-read line by line, so it is a duplicate and not new evidence. The hint file "INFERRED": there is no HUD file of that name; the chip strip is the panel I read. Candidates opened: `src/interface.cc`, `src/interface.h`, `src/critter.cc` (call sites), `src/worldmap.cc` (tab scroll: a city-list scroll, not a minimap, rejected), `src/automap.cc` (function list only: `AM_ReadEntry` and `WriteAM_Entry` suggest a saved explored map per map and elevation; drawing NOT read). Not read: `src/message.cc` (only through `getmsg` in interface.cc). Touch UX: none found. Lock-on: none; aimed hit-mode choice at `interfaceGetCurrentHitMode` (interface.cc 1015) is not read. Confidence: high on the chip rules and layout (read end to end); medium on the refresh rule (four call sites read; not every path that changes poison or radiation was checked). camera: not applicable to this cell.

## 1. Mechanism

- Status chips. The status bar shows up to six small labelled boxes for five states, in an enum order: ADDICT, SNEAK, LEVEL, POISONED, RADIATED (interface.cc 70-77). Each chip has a title message id and an `isBad` flag (79-95, table 196-201). Bad chips use one colour and good chips another (2246).
- Show rules. A chip shows when its state holds: sneaking (2311); a level-up is available; addicted; poison above 0 (2329, `POISON_INDICATOR_THRESHOLD` 0 at line 50); radiation above 65 (2335, `RADATION_INDICATOR_THRESHOLD` 65 at line 47). Two rules are thresholds on a number, the others are flags.
- Slots and order. Each chip that shows is placed in the first free slot (`indicatorBarAdd`, 2446-2459; array of 6 at line 57). The filled slots are sorted with `qsort` by enum value (2342; comparator from 2376, `<` at 2383). So the display order is fixed by the enum, not by which chip was added first.
- Chain layout. Each box is 130 px wide and 21 px tall (interface.h 9-10), and each box overlaps the one before by a 3 px connector (line 44). The first box is drawn 3 px in so it meets the screen edge (the `connectorWidthCompensation` variable in `indicatorBarRender`, from 2393). The next box goes to `unconnectedWidth - 3 * connections` (2435), with `connections` starting at 2 (2410) and rising by one per box. So box i (i >= 1) starts at x = 130 i - 3 (i + 1): 124, 251, 378, 505 for i = 1 to 4. Five chips span about 635 px.
- Labels. The title comes from the message list through `getmsg` (2244) and is centred in the box (2256). Frames and labels are drawn once when the boxes are initialised (2221-2257), not every frame.
- Refresh. `indicatorBarRefresh` is event-driven. It runs on bar show and hide, on load, and at critter-state events: critter.cc 371 (after a critter-state change; the function name was not read), 480 (after radiation is reset to 0), and 1157 and 1172 (one after a dude-state is cleared and one after it is set, both testing for the sneak state; function names not read). Each run clears the slots, adds the chips that hold, sorts, destroys the old chip window, and creates a new one sized to the chip count (from 2302). If the bar is hidden it destroys the window and returns 0.
- Inputs: the dude's state flags, poison and radiation values, and the bar's visibility. Outputs: a chip window. Tick: none; the chip set changes only on refresh events.

## 2. Key functions

- `indicatorBarRefresh`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/interface.cc` from line 2302. Chooses the chips, sorts, rebuilds the window.
- `indicatorBarRender`: same file, from line 2393. Lays out the chain with connectors.
- `indicatorBarAdd`: same file, lines 2446-2459. First free slot; debug message when full.
- `indicatorBoxCompareByPosition`: same file, from line 2376. Orders by enum value.
- Call sites: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/critter.cc` lines 371, 480, 1157, 1172.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A status chip is shown only while its value is past a threshold | Poison above 0 (theirs, interface.cc 50); radiation above 65 (theirs, interface.cc 47) |
| Chips sit in a fixed order, not in the order they were added | Five chip types in enum order (theirs, interface.cc 70-77) |
| One flag makes a chip bad (red) or good (green) | Bad: ADDICT, POISONED, RADIATED; good: SNEAK, LEVEL (theirs, interface.cc 197-201) |
| Fixed slot array, first free slot wins | Six slots for five types (theirs, interface.cc 57; comment 54-56) |
| Chain of overlapping boxes | 130 px wide, 21 px tall, 3 px connector (theirs, interface.h 9-10; interface.cc 44) |
| Rebuild only on state events | Four call sites (theirs, critter.cc 371, 480, 1157, 1172) |

## 4. TypeScript sketch

simplified: omits the window creation and the blit, the pre-rendered box art and the title drawing, the debug message when the slots are full (the sketch keeps the six-slot cap), the show and hide flags, and the event hooks (the sketch is a pure function of the state, so a caller decides when to run it). Reorders: the donor adds chips in its check order (sneak, level, addict, poison, radiation) and then sorts by enum value; the sketch filters a table that is already in enum order, which gives the same result. The sketch's `stripWidth` is the donor's layout formula, not a measured width.

```ts
// Licence: Sustainable Use License 1.0 (donor LICENSE.md): restricted. CLEAN-ROOM: written from the mechanism, not a translation.
// Status chips: a chip shows only while its state is past a threshold, chips keep a fixed order,
// and each chip is good (green) or bad (red). The strip is rebuilt on state events, not every frame.

export interface PlayerStatus {
  sneaking: boolean;
  levelUpAvailable: boolean;
  addicted: boolean;
  poison: number;
  radiation: number;
}

export interface ChipRule {
  id: string;
  isBad: boolean;                      // red if true, green if false
  show: (s: PlayerStatus) => boolean;
}

export const POISON_SHOW_ABOVE = 0;     // a chip shows when poison is above this
export const RADIATION_SHOW_ABOVE = 65; // a chip shows when radiation is above this
export const SLOT_COUNT = 6;            // the donor's slot array size; five chip types exist

// Table order is the display order (the donor sorts by enum value, which is the same order).
export const CHIP_RULES: ChipRule[] = [
  { id: "addict", isBad: true, show: (s) => s.addicted },
  { id: "sneak", isBad: false, show: (s) => s.sneaking },
  { id: "level", isBad: false, show: (s) => s.levelUpAvailable },
  { id: "poisoned", isBad: true, show: (s) => s.poison > POISON_SHOW_ABOVE },
  { id: "radiated", isBad: true, show: (s) => s.radiation > RADIATION_SHOW_ABOVE },
];

export function visibleChips(s: PlayerStatus): ChipRule[] {
  return CHIP_RULES.filter((rule) => rule.show(s)).slice(0, SLOT_COUNT);
}

// Layout: chips are 130 px wide and each overlaps the one before by a 3 px connector.
// The first chip is drawn at x = 0; chip i >= 1 starts at 130 * i - 3 * (i + 1).
export const CHIP_WIDTH_PX = 130;
export const CONNECTOR_PX = 3;

export function chipX(index: number): number {
  if (index <= 0) {
    return 0;
  }
  return CHIP_WIDTH_PX * index - CONNECTOR_PX * (index + 1);
}

// Width the strip needs for n chips (the right edge of the last chip).
export function stripWidth(n: number): number {
  if (n <= 0) {
    return 0;
  }
  return chipX(n - 1) + CHIP_WIDTH_PX;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/hu011/alexbatalov-fallout2-ce-hud.ts`, exit 0. Check values from the formulas: `stripWidth(2)` = 254 and `stripWidth(5)` = 635.

## 5. Lands in

- TARGET `src/fight/hud-status-chips.ts` (new; proposed path, not checked against any worktree). Client-only: the chips read the engine's status (poison, radiation, sneaking, addicted, level-up) and never set it. Parity-checklist row 14 (HUD).
- The thresholds and the chip list should be data, not constants: Frankendom's effects are data (ruling: zones and content as data), so a new effect adds a row, not code.
- Frankendom's current status UI was not read in this pass (not read).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) one engine, client reads only; rules 7-9 n/a

## 6. Gaps and risks

- Width at phone size: five chips need about 635 px. The donor's own comment says a 640 px screen cannot hold six 130 px boxes (interface.cc 54-56). At 375 px only two full chips fit (254 px); three do not (381 px). Fix: wrap to a second row or stack, never a horizontal scroll.
- Fixed thresholds: poison above 0 and radiation above 65 are the same for every character and every zone. Fix: put them in effect data.
- Refresh only on events: the chips update only when one of the call sites runs. The four call sites were read, but not every path that changes poison or radiation was checked, so a value can change without a refresh. Fix: recompute the chip set from state each frame (cheap) or refresh on every change of a watched value.
- Silent drop when full: a chip that finds no slot is dropped, with only a debug line (2455). Five types fit six slots now, but a sixth type would be lost silently. Fix: assert the count when a new effect is registered.
- Label width: the title is centred with no width check (2256) in a fixed 130 px box, so a long translated title can overflow. Fix: measure the text and clip or wrap it.
- Licence: Sustainable Use License, non-commercial or internal use only. Take the shape only: no frame art, no label text, no palette from the donor.
- Not covered: minimap (automap.cc drawing not read); world map (worldmap.cc only the tab scroll and pixel scroll were read; walking and encounter code not read); touch UX (none found); lock-on (none; aimed hit mode at interface.cc 1015 not read).

Best transferable idea: Show a status chip only while its value is past a threshold, in a fixed order, colour-coded good or bad, and rebuild the strip only when a watched value changes.

Decision (proposed): adapt. Keep the threshold rule, the fixed order and the good or bad flag; drop the 130 px chain (five chips need 635 px and do not fit a 375 px phone) in favour of a wrapping row; make the thresholds and the chip list data.

Acceptance: At 375 px wide, a character with poison and radiation shows both chips in a wrapped row with no horizontal scroll; the POISONED chip is absent at poison 0 and present at poison 1; the RADIATED chip is absent at 65 and present at 66; chips always appear in the order ADDICT, SNEAK, LEVEL, POISONED, RADIATED.
