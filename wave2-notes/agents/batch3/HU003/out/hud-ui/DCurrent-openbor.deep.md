# DCurrent-openbor (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/DCurrent-openbor/engine/openbor.c` | Licence: BSD-3-Clause-style text in `engine/LICENSE` (keep the notice, reproduce it in binary documentation, no endorsement; the file has no SPDX name) | C | symbol `bar` (25393), with `update_health` (33162) and `drawstatus` (26912)

Checked: Confidence high for the health bar, its lag and the segment colours. Read in full: `bar` (25393-25476), `update_health` (33162-33305, the drain lines 33289-33295 included), `drawstatus` (26912-26946), `drawenemystatus` (26865-26909), the logic step loop (51500-51610), `predrawstatus` (26585-26800). Read in full: `source/gamelib/translation.c` (227 lines) and `sdl/control.c` touch handler (570-680). Not read: `List_FindByName` (scriptlib/List.c), the body of the lifebar.txt parser between the command table and the end (5740-5810 partly), the consumer of `hide_t`, the boss `hud_popup` loader (17318-17340 seen only in grep). Candidates opened first: `source/openborscript/spawn_hud.c` (the hint file; it only exposes get and set of position and sprite on a script handle, so it is not a HUD mechanism), `openbor.c` (the real HUD), `sdl/control.c` (touch), `source/gamelib/translation.c` (string table). Not a camera cell.

## 1. Mechanism

- The HUD is drawn after the world each frame: `predrawstatus()` (51618) then `drawstatus()` (51622), both inside `if(ingame == 1 && !_pause)`. `predrawstatus` writes names, score, lives, portraits, MP icons and text; `drawstatus` draws the bars.
- The health bar is a lagging ("ghost") bar. The bar is drawn from `energy_state.health_old` (26921), not from `health_current`. Each logic tick, `update_health` moves `health_old` one unit toward `health_current` (33289-33295): up on heal, down on damage. So after a hit the number drops at once and the coloured fill drains down over the next ticks.
- Timing: the logic clock is `_time`. The main loop sets `newtime = _time + interval`, where `interval` comes from `getinterval()` clamped to `game_speed / 4` (50817), and runs `while(_time < newtime)` (51538). Each pass runs the entity updates (`update_ents`, which calls `update_health` per living entity at 34036) and then `++_time` (51604). A long frame is capped at 100 logic ticks of catch-up (51533). `game_speed` defaults to 200 ticks per second (openbor.h 80), commented as the logical clock rate (openbor.h 1931), and can be set from a parsed command (22128). So at the default the ghost drains up to 200 HP per second. This is derived from the constants, not measured.
- Segments: `bar` (25393) clamps the value to the maximum (25417). The segment width is the bar's pixel width (25414), capped at the maximum (25435-25436). Fill length is `value % max` (25472), and a remainder of zero draws a full segment (25473-25475).
- Colour tiers when `colorbars` is on (set to 1 when `lifebar.txt` loads, 5764): first segment `value <= max/4` red (25441-25444), `value <= max/2` yellow (25446-25449), `value <= max` green (25451 onward). Above one segment the colour index is `value / (max + 1) + 3` (25458), and the background behind the fill is the previous colour (25459). The index is capped at 10 (25461-25463).
- Palette names are read from `saves/lifebar.txt` or `data/lifebar.txt` (5734-5738), with a table that maps names such as `color25` to red (5775) and `color100` to green (5777). Colour blue is palette entry 4 (5845).
- Boss and opponent bars: `drawstatus` draws the player's health (26921) and, when there is an opponent not flagged `nolife`, the opponent's health (26924). Both use `health_old`. The MP bar uses `mp_old` the same way (26929). `drawenemystatus` (26865) draws a `hud_popup` entity: name at `name_position`, a portrait at `icon.position` chosen by state (die, then pain, then getting, then default), and a bar at `graph_position` with `health_old`. It is called for each entity that has `hud_popup` (34105).
- Portrait state in `predrawstatus` (26585): die when `health_current <= 0`, pain when `IN_PAIN_HIT`, get when `getting`, otherwise default (read, not receipted).

## 2. Key functions

- `bar` (`openbor.c` 25393-25476): segment, colour and fill. Clamp 25417; segment width 25414 and 25435; tiers 25441-25451; overflow index 25458; fill 25472.
- `update_health` (`openbor.c` 33162-33305): the ghost step, 33289-33295. Called from `update_ents` (33927) at 34036, after the `exists` check.
- Logic loop (`openbor.c` 51507-51610): `getinterval` clamp 50817; `newtime` 51533; `while(_time < newtime)` 51538; `++_time` 51604.
- `drawstatus` (`openbor.c` 26912-26946): player and opponent health bars, MP bar, time box.
- `drawenemystatus` (`openbor.c` 26865-26909): the `hud_popup` entity display.
- `lifebar_colors` (`openbor.c` 5713-5854): palette from `lifebar.txt`, with the name table at 5775-5778 and the palette fill at 5842-5846.
- Touch (`sdl/control.c` 570-680): per-finger loop, see section 6.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Lagging ghost value that steps toward the real value each tick | 1 unit per tick (33289-33295); logic clock 200 per second by default (openbor.h 80) |
| Catch-up cap per frame | 100 logic ticks (51533) |
| Frame interval clamp | game_speed / 4 (50817) |
| Segment size | bar pixel width, capped at HP max (25414, 25435); the bar width comes from the bar's config (not read) |
| First-segment colour tiers | 25% red, 50% yellow, 100% green (25441-25451) |
| Overflow colour per segment | value / (max + 1) + 3 (25458), background = previous colour (25459), cap 10 (25461) |
| Palette names | data file, e.g. `color25` red, `color100` green (5775, 5777) |
| Death and empty bar | health <= 0 switches the portrait to die (26585 block, read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: clamp the value, step the ghost toward the real value, then split the value into a top segment with its fill and colours. It changes three things on purpose. The drain is HP per second and uses frame time, not one unit per logic tick. Segment boundaries are exact (`ceil(v / segment) - 1`) instead of `value / (max + 1)`. The colour tiers use the fraction of the segment, not the bar's pixel width. It omits the ratio-bar branch, vertical bars, the border and shadow lines, the 10-colour cap (the sketch clamps to the overflow list instead), the MP bar, the portrait state and the lifebar.txt parser.

```ts
// Licence of donor: BSD-3-Clause-style text (engine/LICENSE). Sketch written from the described mechanism, not a line translation.
// Client view only: the ghost value is drawn, never written back to health.

interface HpBarData {
  max: number;            // HP max of the entity (per character, data)
  segment: number;        // HP per segment (donor: min(bar pixel width, max); fixed here as its own field)
  drainPerSec: number;    // ghost drain speed in HP per second (donor: 1 HP per logic tick)
  tiers: [string, string, string]; // first segment: low (<=25%), mid (<=50%), high (<=100%)
  empty: string;          // background behind the first segment
  overflow: string[];     // colours for segment 2, 3, 4 ... (last colour repeats)
}

interface HpBarState {
  shown: number;          // the lagging value drawn on the bar
}

interface SegmentView {
  colour: string;         // colour of the top segment
  behind: string;         // colour of the empty part behind the fill
  fill: number;           // 0..1 fill of the top segment
}

// Step the ghost toward the real health at a fixed rate. dtMs is the frame time in milliseconds.
function stepGhost(st: HpBarState, real: number, dtMs: number, d: HpBarData): void {
  const step = (d.drainPerSec * dtMs) / 1000;
  if (st.shown < real) {
    st.shown = Math.min(real, st.shown + step);
  } else if (st.shown > real) {
    st.shown = Math.max(real, st.shown - step);
  }
}

// Split a value into the top segment (k = 0 is the first segment) and its fill and colours.
// Segment k covers (k * segment, (k + 1) * segment]; the boundary is exact at every k.
function segmentFor(value: number, d: HpBarData): SegmentView {
  const v = Math.min(Math.max(value, 0), d.max);
  if (v <= 0) {
    return { colour: d.tiers[0], behind: d.empty, fill: 0 };
  }
  const k = Math.ceil(v / d.segment) - 1;
  const fill = (v - k * d.segment) / d.segment;
  if (k === 0) {
    const f = v / d.segment;
    const tier = f <= 0.25 ? 0 : f <= 0.5 ? 1 : 2;
    return { colour: d.tiers[tier], behind: d.empty, fill };
  }
  const last = d.overflow.length - 1;
  const colour = d.overflow[Math.min(k - 1, last)];
  const behind = k === 1 ? d.tiers[2] : d.overflow[Math.min(k - 2, last)];
  return { colour, behind, fill };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/hu003-openbor-hp-bar.ts`).

## 5. Lands in

TARGET `src/fight/hud-bars.ts` (new client view module; reads health from the engine state and never writes it). Parity-checklist row 14 (HUD).

Best transferable idea: a lagging "ghost" health fill that drains from the old value to the server value at a fixed rate, with each 100-HP overflow segment in its own colour tier.

Decision (proposed): adapt. Keep the ghost and the overflow segments; they are client-only, so the one ledger and server-verified kills are untouched. Change the drain to an HP-per-second data field and the segment edges to exact boundaries.

Acceptance: after a 30-HP hit the number drops at once to the server value and the ghost fill drains over about 0.3 s at 100 HP per second; a 201-HP enemy shows the third-segment colour at 201 (the donor shows it one HP late); a server test asserts that the ghost value never changes health.

Reuse tag: rewrite-from-idea (BSD-3-Clause-style donor; adaptation is allowed, and this sketch is still written from the mechanism)
Brief rule served: 1 (one engine; the HUD is a client of it), and the addendum rule to keep the idea and fix the defect.

## 6. Gaps and risks

- Defect (boundary drift), fix: colour steps use `value / (max + 1)` (25458) but the fill wraps at `value % max` (25472). Colour changes at 202 and 303 instead of 201 and 301, one HP more lag per overflow segment. Fix: the sketch's `ceil(v / segment) - 1`.
- Defect (units coupled to the bar's pixel width), fix: the segment size and the tier thresholds use `max = min(bar pixel width, maxvalue)` (25414, 25435). A 200 px bar on a 500 HP enemy would make 200-HP segments and move the quarter and half tiers. Fix: segment and tiers are HP or fraction data fields; pixel width is only the drawing scale.
- Defect (per-tick drain), fix: the drain is one unit per logic tick (33289-33295), so the feel changes with `game_speed`, which can be set from a parsed command (22128). Fix: `drainPerSec` as data, applied with frame time.
- Frankendom gap: the ghost lives in the entity's `energy_state` in the donor, next to the value the logic reads. Frankendom must keep it in view state only, so the fight step never reads it.
- Frankendom gap: the donor shows one opponent bar and one `hud_popup` entity. The many-on-one case (MAX_ATTACKERS = 3) needs a stack of up to three target frames; the donor has no hate-list display (not read).
- Readability at 375 px: the donor has no per-frame cap on drawn bars or enemy count (not read beyond the calls above).
- Defects in the string table loader (`source/gamelib/translation.c`): the buffer for a string is `malloc(1000)` with no bound check (12). Fix: size it from the source length. Unknown escapes write one backslash and drop the next character (56-57, with the shared increment). Fix: copy the escaped character. A lookup on a cache miss searches the whole list (220), and the one-entry cache (213) helps only repeated calls with the same pointer. Fix: build a map at load (`List_FindByName` not read). Multi-line msgid and msgstr entries are read as separate quoted fragments, each overwriting the id (ob_loadtrans, 80-166, read, not run); the header block therefore adds junk keys. Fix: join continuation lines or keep the header out of the table.
- String table grammar (read, counted with grep on `translation.txt`; no strings quoted here): 176 single-line msgid and msgstr pairs, plus one multi-line header block. The shipped msgstr values are all empty, and an empty msgstr is skipped (202), so the English id shows. About 15 entries end with an ellipsis (submenu or action openers), about 57 end with a colon (labels such as a name followed by a value), and 16 contain printf placeholders with `%%` escapes. Menus use Title Case. Code calls `Tr()` on 158 lines of `openbor.c`.
- Seen, not adopted here (parity row 5 belongs to another note): touch pad. `sdl/control.c` sets up a 13-button array (sdlport.h 31). The d-pad is a ring around the pad centre, between the inner edge of the arrow buttons and 1.5 times their radius (585-586, 598), split into eight sectors by slope thresholds 0.577 and 1.732 (589, 733). Action buttons use squared distance against 1.5 times their radius (581, 668-669). The overlay hide time is set to now plus 5000 ms on every update (678); the consumer of `hide_t` is not read. A similar block at 725-810 (not read in full).
- Seen, not adopted here (parity row 5): input buffer for specials. History entries are checked against `command_time` between presses (46113-46114), default `game_speed / 4` = 50 ticks (openbor.h 83), and each command can override its own window (46129-46136, read, not run).
- Licence: keep the BSD notice if any code is adapted. This note takes the mechanism only.

Reuse tag: rewrite-from-idea (BSD-3-Clause-style; sketch written from the mechanism)
Brief rule served: 1 (one engine; HUD is a client view); idea kept, defects fixed in the sketch (addendum rule, 2026-10-10)
