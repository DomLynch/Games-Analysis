# OpenXcom-OpenXcom (city-map-design, cell 20)

Donor: /mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp | Licence: GPL-3 | C++ | symbol BattlescapeGenerator::generateMap (input line 2008 verified: `generateMap`; it ends at 2338)

## 1. Mechanism

- Builds a battle map from a script of commands, one command at a time, in order (`generateMap`, 2008-2338). It is run once at mission start, not per tick. It first sets the ambient sound, creates a dummy block, resets the map (`init(true)`) and loads the terrain's data sets (2010-2033).
- Input: the map script (a list of commands), the terrain's map-block sets, the mission type, and the mission's random generator.
- Each command has: an optional label (a number to refer to; only a label above 0 must be unique, so label 0 may repeat and shares one result slot, 2049-2053), a list of conditionals (positive means run only if that labelled command succeeded; negative means run only if it failed; a label that does not exist yet throws, 2057-2082), a chance of running (`RNG::percent`, 2085), and a count of executions (2091).
- A command that is skipped by its conditionals or by its chance roll is not run; its result was recorded as false before the checks (2053), so later commands see it as failed. Each run records success or failure under its label; later commands read those results. How a run sets the result depends on the command type: add-block, fill-area and check-block set it true if any attempt succeeds (`|| success`, 2102, 2186, and the loop at 2196 stops once true), add-line overwrites it with the latest attempt's result (2106), dig-tunnel is always true (2177), add-craft and add-UFO set true when placed (2130, 2171), remove takes the helper's result (2229), and resize sets none (2231-2254).
- Placement: a block command picks a block from the terrain set (`getNextBlock`), then `selectPosition` (2542-2600) lists every anchor cell inside the allowed rectangles (or the whole map when there are none) where the block's footprint, in 10-tile cells, is entirely unoccupied, and picks one uniformly (`RNG::generate`); there is no retry loop. `addBlock` (2717-2759) places it, marks its south and east edges for drilling and loads its tiles. A line command (`addLine`, 2648-2708) picks a random row or column through `selectPosition` and retries up to about 20 times until nothing in the way is a non-matching block, then lays road blocks across it, turning an existing perpendicular road into a crossing (2692-2706); direction both draws a vertical line and, if that works, a horizontal one. Other commands add a craft or UFO (`addCraft` 2609-2640), carve tunnels, fill areas, check that blocks exist, remove blocks, or resize (an error after blocks were added, or on a base-defence map, 2231-2239).
- A mission-type check runs before the script: a base-defence mission first builds its fixed base layout (`generateBaseMap`, 2344-2421, called at line 2041: one block per finished facility tile, plus storage-space and inventory tile bookkeeping), and then the script loop still runs on top of it (line 2045 onward); the fixed layout does not replace the script.
- After the loop: if any cell is still unfilled, generation throws "Map failed to fully generate" (2262-2265); then nodes are loaded, UFO and craft maps are loaded and their cells marked, level-0 tiles with no floor get a scorched-earth tile (2325-2335), and node links are attached (2337).
- Output: tile data on the battle map, nodes, craft and UFO placement; objectives and the placement of the player, aliens and civilians are not in this function (those steps, if any, run after it and were not read).

## 2. Key functions

- `BattlescapeGenerator::generateMap`, `/mnt/frankendom-donors/OpenXcom-OpenXcom/src/Battlescape/BattlescapeGenerator.cpp`, lines 2008-2338. The script loop: labels, conditionals, chance, attempts, the per-command switch, and the post-loop load steps.
- `BattlescapeGenerator::addBlock`, same file, lines 2717-2759. Places one block at a position if its cells are free, marks drilling edges, loads its tiles. Its free-cell check loops `yd != ySize` (2724), so the last row of a block taller than one cell is not checked (a donor off-by-one, read from the code, not run).
- `BattlescapeGenerator::selectPosition`, same file, lines 2542-2600. Enumerates every free anchor in the allowed rectangles that fits a block of the given size and picks one uniformly.
- `BattlescapeGenerator::addLine`, same file, lines 2648-2708. Draws a road line along the map, retrying the position up to about 20 times; makes crossings where roads meet.
- `BattlescapeGenerator::generateBaseMap`, same file, lines 2344-2421. Fixed base-defence layout from the base's finished facilities.
- `BattlescapeGenerator::addCraft`, same file, lines 2609-2640. Places a craft or UFO footprint and fills its cells with blocks.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Script of labelled commands with conditionals on earlier results | Sign convention for success or failure (theirs, line 2063) |
| Chance and attempt count per command | Per-command values from the mission data (theirs) |
| Uniform choice among all free anchors inside the allowed rectangles (no retry) | Block sizes from the terrain set, in 10-tile cells (theirs, line 2551) |
| Fixed layout for one mission type | Mission type string STR_BASE_DEFENSE (theirs, lines 2039 and 2232) |

## 4. TypeScript sketch

simplified: the sketch treats every command as one abstract `place` callback and ORs the attempts, whereas the donor's result rule depends on the command type (add-line keeps only the last attempt, dig-tunnel is always true, fill-area loops until a block does not fit). It throws on a repeated label for any label, where the donor only checks labels above 0. It omits the block pick (`getNextBlock`), `selectPosition`'s enumeration of free anchors, the drilling map, the base-defence pre-pass, the post-loop failure check for unfilled cells, node and craft loading, and resize. Order matches the donor: label check, result slot set false, conditionals, chance roll, attempts.

```ts
// Licence: GPL-3 - clean-room sketch, no lines translated
// Clean-room: an ordered script of placement commands, each gated by earlier results, a chance roll, and attempts.
type Cmd = { label: number; conditionals: number[]; chance: number; attempts: number; place: (rng: () => number) => boolean };

// Run the script in order. A positive conditional needs that label to have succeeded; a negative one needs it to have failed.
function runScript(cmds: Cmd[], rng: () => number): Map<number, boolean> {
  const result = new Map<number, boolean>();
  for (const c of cmds) {
    if (c.label > 0 && result.has(c.label)) throw new Error('two commands share a label');
    let ok = false;
    result.set(c.label, false);
    const gated = c.conditionals.every((k) => {
      const seen = result.get(Math.abs(k));
      if (seen === undefined) throw new Error('conditional names an unknown label');
      return k > 0 ? seen : !seen;
    });
    if (!gated) continue;
    if (rng() * 100 >= c.chance) continue;
    for (let i = 0; i < c.attempts; i++) {
      ok = c.place(rng) || ok;
    }
    result.set(c.label, ok);
  }
  return result;
}
```

## 5. Lands in

- Frankendom target: `origins/world/generate.ts` already builds zones from a template and a seed (landmarks placed at (u, v) in 0..1 with a jitter, passages between them; `origins/world/README.md`). This donor's conditional block script would be an optional layout layer on top: NEW `origins/world/layout-script.ts` (does not exist today) that fills the `layout` and `passages` groups of a zone before `resolve.ts` validates them. Files read on the VPS snapshot /root/work-k7 (not main); headers and the README only.
- Parity-checklist row: none of rows 1 to 22 (zone data is outside the fight rows). Feature-map section: zones as data, brief rules 4 and 10 (`docs/specs/zone-runtime.md`). The Pit is a client of one engine, so a script-built arena is a candidate shape for a Pit-style instance zone only if Lead wants one.
- Reuse tag: rewrite-from-idea (GPL-3, clean-room sketch only).
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

## 6. Gaps and risks

- The script's random source is the mission's generator (`RNG`, 2085, 2596). Frankendom zone copies need an explicit seed per copy (rule 10), or two copies drift; `generate.ts` already uses a seeded `prng` and never `Math.random`.
- A label that is never set makes the conditional error out (2073-2076). Frankendom must validate the script on load and fail in tests, as `generate.ts` does for generated zones.
- Chance rolls and placement draw from the same generator, so changing one command changes the rest of the map. Frankendom should give each command its own stream if it wants stable zones.
- The donor places objects and players after the map; Frankendom's spawn rules (rule 5, many-on-one; MAX_ATTACKERS = 3 caps attackers on one target) need their own step, not a map command.
- The off-by-one in `addBlock`'s occupancy check (2724) and the unchecked return of `selectPosition` inside `addLine` (2677, with `roadX` uninitialised) are donor bugs read from the code; do not port the shape without tests.
- Layout is decided on the server's seed in Frankendom (server-verified); a client-generated layout must never be trusted.
- Nothing here touches fight state or kill authority.
- Not read: `drillModules` and `removeBlocks`, `MapScript` and `MapBlock`, `loadMAP`, and the code that calls `generateMap`.
