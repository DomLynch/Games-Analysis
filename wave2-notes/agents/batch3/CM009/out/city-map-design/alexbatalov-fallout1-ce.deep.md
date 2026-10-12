# alexbatalov-fallout1-ce (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc` | Licence: Sustainable Use License 1.0 (LICENSE.md: internal business or non-commercial use only; source-available, not OSI; restricted) | C++ | symbol `UpdVisualArea`

Checked: The list's hint file `src/int/support/intextra.cc` is the wrong file (it only registers the town-map script call at 2604-2606). The real mechanism is in `src/game/worldmap.cc`: `UpdVisualArea` (2307-2436, read in full), `UpdateTownStatus` (2790, read to its end before `InCity`), `InCity` (2855), `block_map` (2938, key viewport lines), `DrawTownLabels` (3017), `DrawTMAPsels` (3636, key lines), and the tables `city_location` (370), `ElevXgvar` (402), `TownHotSpots` (601). Automap read in part: `src/game/automap.cc` `draw_top_down_map` (377) and `decode_map_data` (951). Not read: the `town_map` body after 3200, the `world_move_step` body, `obj_process_seen`, the Scout perk definition, and the caller that updates the walker's position. Confidence: high on the reveal and gating; medium on what the name "Elev" means (the table holds per-hub section flags); low on the automap tile-index mapping (see section 6). Parity hint 23 used as given.

## 1. Mechanism

- The world map is a grid of 50 by 50 unit cells. `InCity` maps a position to a hub by dividing by 50 (2861). Twelve hubs sit on fixed cells (`city_location`, 370). The fog state of each cell is kept in a 31 by 29 array (`WorldGrid`, 873). Cell values: 0 unseen, 1 seen nearby, 2 walked.
- Reveal, called from the travel loop (1559), which runs the reveal once every third pass (`travel_line_cycle` set to 2 at 1556 and decremented; the pass rate of the loop was not read). Order inside the reveal: (a) the walker's cell becomes 2 (2382); (b) the square around the walker is set to 1 unless it is already 2 (3x3 at 2408-2424; 5x5 when the Scout perk is held, 2384-2385); (c) if the walker's column is at or left of `OceanSeeXTable[row]` (2432), every cell in that row left of the threshold becomes 2. A walked cell is never reset, so 2 means "stood on", not "here now".
- Hub discovery (`UpdateTownStatus`, 2790; the flag loop runs from city 1, 2796, because hub 0 is Vault 13 which is driven by game time instead, see the last bullet of this section). When a hub's world flag equals 1 (2809): its own grid cell becomes 1 if it was 0 (2810), and its first-visit bit is set (2814). The first-visit bits are the only gate for hub labels (`DrawTownLabels`, 3020-3023) and for fast travel (1181-1183, target = the hub's cell centre at 50 times column plus 25).
- Sections, the hub entrances: each hub has up to 7 section flags from the `ElevXgvar` table (402). Each section's known flag is copied from its world flag (2798-2803). Section buttons are drawn only where the flag is set (3653). Each section has an x, y marker and a map index and file name (`TownHotSpotEntry`, 87; sample row at 603). The draw loop stops at the first entry whose x or y is zero (DrawTMAPsels, read; line not quoted).
- Hub state swap: when a world flag is set, the Cathedral's section list is replaced by a special hub's list (`GVAR_MASTER_BLOWN`, 3641); the Military Base is swapped the same way with `GVAR_VATS_BLOWN` (read, line not quoted).
- Drawing: `block_map` draws a 9 by 10 cell window (2950, 2954) offset by the sub-cell position (x % 50, y % 50). Unseen cells (0, case at 2956) are filled with `colorTable[0]`; seen cells (1, case at 2963) are blended dark over the map. Walked cells (2) have no case in either switch (switches at 2955 and 2981; cases 0 and 1 only, checked by grep), so they show the map at full brightness.
- Automap (a separate in-map minimap): `decode_map_data` clears a byte buffer, then for each seen object writes a 2-bit content type (wall 1, scenery 2, other 0) into four tiles per byte (974-976). `draw_top_down_map` draws an object only if it is seen (407); critter dots are drawn only with the scanner flag (read).

## 2. Key functions

- `UpdVisualArea`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/worldmap.cc` 2307-2436. Walker cell, 3x3 or 5x5 reveal with edge clamps, ocean rule.
- `UpdateTownStatus`: same file, from 2790. Hub flags to grid cell and first-visit bit; section flags from `ElevXgvar`; special-hub flags.
- `InCity`: same file, from 2855. Position to hub by 50-unit cell.
- `DrawTownLabels`: same file, from 3017. Labels only for first-visited hubs.
- `DrawTMAPsels`: same file, from 3636. Section buttons only for known sections; cathedral swap.
- `block_map`: same file, from 2938. Viewport draw of the fog grid.
- `decode_map_data` and `draw_top_down_map`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/automap.cc` 951 and 377 (part).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Walked cell marked, square around it marked seen, walked never reset | Cell size 50 units (2373, 2861); normal radius 1 (3 offsets, 2408); Scout radius 2 (5 offsets, 2384-2385) |
| Edge clamp inside the reveal | Reveal clamps at column 28 (2397, 2420) and row 30 (2388, 2411). Array is 31 by 29 (873). Reset loop clears 29 rows (884). Defect: the bounds disagree (row 29 can be written but the reset clears only rows 0-28). |
| Ocean rule: per-row column threshold | 30 rows (219); rule at 2432 |
| Reveal cadence inside the travel loop | Every third pass (1555-1556) |
| Hub shown and discovered on world flag | Flag must equal 1 (2809) |
| Section known on world flag | Flag non-zero (2803); up to 7 per hub (402, 2797) |
| Hubs on a grid | 12 hub cells (370) |
| Section markers | 15 hubs by 7 sections (601); x, y pixel and map index per section (87, 603) |
| Fast travel gate | First-visit bit (1181); target at cell centre (1183) |
| Automap packing | 2 bits per tile, 4 tiles per byte (974-976); grid header 100 (`map_defs.h` 8) |

## 4. TypeScript sketch

simplified: the sketch keeps the walker cell mark, the 3x3 or 5x5 seen square with walked cells never reset, the edge clamp, the ocean rule, the hub and section flag gates, the first-visit gate for fast travel and labels, and the hub centre target. It omits the Cathedral and Military Base swaps, the travel-line trail, the automap packing, all drawing, and saving the flags. It changes the donor's bounds: one COLS and ROWS constant replaces the mismatched 28, 29, 30 and 31 values. The donor's global ocean table is passed in as a parameter. Radius uses a plain argument where the donor uses the Scout perk check.

```ts
// Licence: Sustainable Use License 1.0 (donor, restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const CELL = 50;      // world units per grid cell (donor: 50)
const COLS = 28;      // one constant for width (fix: donor array is 29 wide, reveal clamps at 28)
const ROWS = 30;      // one constant for height (fix: donor array is 31 tall, reveal clamps at 30)
const SEEN_NEAR = 1;  // revealed by walking nearby
const WALKED = 2;     // stood on at least once; never reset to SEEN_NEAR

interface Section { name: string; x: number; y: number; mapIdx: number; mapFile: string; knownVar: number; known: boolean; }
interface Hub { name: string; col: number; row: number; gateVar: number; sections: Section[]; firstVisit: boolean; }

class FogGrid {
  readonly cells: Uint8Array;
  constructor(readonly oceanEdge: number[], readonly cols: number = COLS, readonly rows: number = ROWS) {
    this.cells = new Uint8Array(cols * rows);
  }
  at(col: number, row: number): number {
    return this.cells[row * this.cols + col];
  }
  // A walker marks its own cell WALKED and every cell in a square around it SEEN_NEAR,
  // except cells already WALKED. Scout widens the square from radius 1 to radius 2.
  reveal(x: number, y: number, scout: boolean): void {
    const col = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    this.cells[row * this.cols + col] = WALKED;
    const r = scout ? 2 : 1;
    for (let dr = -r; dr <= r; dr++) {
      for (let dc = -r; dc <= r; dc++) {
        const c = col + dc;
        const rr = row + dr;
        if (c < 0 || rr < 0 || c >= this.cols || rr >= this.rows) continue; // edge clamp
        const i = rr * this.cols + c;
        if (this.cells[i] !== WALKED) this.cells[i] = SEEN_NEAR;
      }
    }
    // Ocean rule: cells left of this row's edge column are treated as walked.
    if (col <= this.oceanEdge[row]) {
      for (let c = 0; c < this.oceanEdge[row]; c++) this.cells[row * this.cols + c] = WALKED;
    }
  }
}

// Gate hubs and sections from world flags. A hub is shown when its gate flag is exactly 1;
// each section is known when its flag is non-zero; the first section is forced known with its hub.
// Hub 0 (Vault 13) is skipped by the flag loop, as in the donor (loop starts at 1); it is time-gated below.
function syncFromFlags(hubs: Hub[], flags: number[], grid: FogGrid, gameDays: number): void {
  const vault = hubs[0];
  if (vault) {
    // Donor: after 10 game days (game_time / 864000 ticks) vault sections 1-3 unlock.
    vault.sections.forEach((s, i) => { if (i === 0) s.known = true; else if (i <= 3) s.known = gameDays >= 10; });
  }
  for (const hub of hubs.slice(1)) {
    for (const s of hub.sections) {
      if (s.knownVar === 0) break;
      s.known = flags[s.knownVar] !== 0;
    }
    if (flags[hub.gateVar] === 1) {
      if (grid.at(hub.col, hub.row) === 0) grid.cells[hub.row * grid.cols + hub.col] = SEEN_NEAR;
      hub.firstVisit = true;
      if (hub.sections.length > 0) hub.sections[0].known = true;
    }
  }
}

// Map a world position to the hub whose cell contains it (cell = floor(position / CELL)).
function hubAt(hubs: Hub[], x: number, y: number): Hub | undefined {
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  return hubs.find((h) => h.col === col && h.row === row);
}

// Fast travel is allowed only to hubs visited at least once; the target is the hub's cell centre.
function travelTarget(hub: Hub): { x: number; y: number } | null {
  if (!hub.firstVisit) return null;
  return { x: CELL * hub.col + CELL / 2, y: CELL * hub.row + CELL / 2 };
}

// Labels and section buttons appear only for discovered hubs and known sections.
function labelVisible(hub: Hub): boolean { return hub.firstVisit; }
function visibleSections(hub: Hub): Section[] { return hub.sections.filter((s) => s.known); }

export {};
```

## 5. Lands in

- TARGET `origins/world/hub-map.ts` (new, proposed path): the fog grid, the hub and section flag gates, and the fast-travel gate. The fog is client-only (HUD); the hub and section flags are world state on the one ledger.
- Parity row 23 (zone population): hub and section markers are zone data. If the fog is split out, it belongs under row 14 (HUD).
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: clean-room, shape only)
- Brief rule served: zones as data (hub cells and section markers are per-zone tables); one ledger (gates read world flags, never client state).

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 allows internal business or non-commercial use only and restricts distribution (LICENSE.md, line 15). The sketch is written from the mechanism; no donor line is copied. Dom to rule whether shape-only reuse of a restricted-licence donor is acceptable.
- Defect, bounds: the array is declared 31 by 29 (873), the reset loop clears 29 rows (884), and the reveal clamps at column 28 (2397, 2420) and row 30 (2388, 2411). The reveal clamp makes the grid 28 wide (columns 0-27), so the unused 29th column is not itself a defect; the real inconsistency is that row 29 can be written by the reveal (row < 30) but the reset loop (884) clears only rows 0-28. Fix: one COLS and ROWS constant used by reset and reveal (done in the sketch).
- Defect, reveal cadence: the reveal depends on a counter decremented in the travel loop (1555-1556). In Frankendom the reveal should run on the server tick (or a fixed client step), not on a travel-loop counter. Fix: tie the reveal to a fixed step and make the cadence data.
- Fog is one-way: a walked cell (2) stays walked and is never reset. Keep it as the design; add a separate "you are here" marker if the HUD needs one (not in the donor).
- Automap tile index: packing uses tile mod 200 and tile div 200 (972-976), while the grid header says 100 (`map_defs.h` 8). Not resolved (tile layout not read). Do not port the automap packing until the index is confirmed.
- Frankendom rulings: the fog and labels are client-only. Hub flags and fast travel must be checked on the server (server-verified). The donor checks everything in one process with no server.
- A world grid with several zones is a new concept for Frankendom (zones are separate). The grid is per world, so it would need a zone-to-cell map before this shape fits.
- The Scout perk and the ocean table are per-player or per-map data (not read in full).

Best transferable idea: a walked/seen fog grid where walking reveals a square around the walker, and hubs and their sections appear only after the matching world flags are set.

Decision (proposed): adapt — take the grid reveal and the flag-gated hub and section shape, written from scratch, with the bounds defect fixed by one constant; reject the client-side flags as authority, since the flags must live on the server.
Acceptance: walking a test player across a zone reveals a 3x3 square of fog cells (5x5 with a scout test perk), walked cells stay revealed, a hub label appears only after its first visit, and a server test refuses fast travel to a hub that was never visited.

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room, shape only)
Brief rule served: zones as data; one ledger (flags on the server, fog as HUD)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Sketch syncFromFlags looped from hub 0; the donor loop starts at city=1 (2796) because hub 0 (Vault 13) is time-gated.
- 'Column 28 never revealed' is not a defect (clamp makes a 28-wide grid); the real inconsistency is row 29 writable (clamp row < 30) but not cleared by the 29-row reset loop (884).
- Missed: Vault 13 sections 1-3 unlock when game_time()/864000 is non-zero, i.e. 10 days (2819-2829); three derived special hubs 12 Cathedral-blown, 13 Military-blown, 14 Brotherhood set from section flags (2831-2851).

Fixed 2026-10-12: sketch loop now starts at hub 1 with the Vault 13 time gate added (gameDays param); bounds defect re-described; added a Time and derived gates line below.
Time and derived gates (UpdateTownStatus 2819-2851): Vault 13 (hub 0) section 0 is always known and sections 1-3 become known once game_time()/864000 is non-zero (10 days); special hub 12 is shown when GVAR_MASTER_BLOWN is set or Cathedral section 0 or 1 is known; special hub 13 when GVAR_VATS_BLOWN is set or any of Military Base sections 0-4 is known; special hub 14 when Brotherhood section 1, 2, 3 or 4 is known.
