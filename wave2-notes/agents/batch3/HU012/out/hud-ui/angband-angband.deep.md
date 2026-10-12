# angband-angband (hud-ui, cell 2)

Donor: `/mnt/frankendom-donors/angband-angband/src/ui-display.c` (bar, lines 365-470 and 828), with `src/target.c` 56-95 (look text), `src/player-calcs.c` 2470-2474 and 2656, `src/player-attack.c` 746-748, `src/project.c` 984-989, `src/ui-target.c` 539-541 | Licence: dual, "either a) the GNU General Public License ... version 2, or b) the 'Angband licence'" (header of `ui-display.c` lines 8-17; the Angband licence permits copying for educational, research and not-for-profit purposes) | C | symbol `prt_health_aux` (bar) and `monster_health_attr` (colour)

Checked: `ui-display.c` 365-470 read in full (colour, bar text, unknown state); `ui-display.c` 828 read; `target.c` 56-95 read in full (look text); `player-calcs.c` 2470-2474 and 2656 read; the three `health_track` call sites read (`player-attack.c` 746-748, `project.c` 984-989, `ui-target.c` 539-541); `mon-util.c` 1155-1170 read (fear, not the bar). Other calls to `PR_HEALTH` (`mon-util.c` 422, 443, 1210, 1272; `mon-timed.c` 221; `mon-move.c` 1866) and `health_track(..., NULL)` (`mon-make.c` 342, 630) were found by grep only, not read. Not read: `ui-target.c` 1264 onward (`target_set_interactive`), the lock-on and auto-target path, the input buffer (`ui-input.c`), the minimap sub-window (`ui-display.c` 1944-2270; grep only). Confidence: high on the bar and the look text (both read in full, thresholds agree); medium on exactly when the bar is cleared (the `NULL` calls are grep-only). `camera_scope`: not a camera cell.

## 1. Mechanism

- One monster is "tracked" at a time: `player->upkeep->health_who`. Tracking is set when the player hits a visible monster in melee (`player-attack.c` 746-748), when a projection affects a visible monster (`project.c` 984-989), and when the player targets or looks at a monster (`ui-target.c` 539-541). `health_track` (`player-calcs.c` 2470-2474) stores the monster and sets the `PR_HEALTH` redraw flag.
- The redraw flag maps to the event `EVENT_MONSTERHEALTH` (`player-calcs.c` 2656), and the sidebar entry `{ prt_health, 12, EVENT_MONSTERHEALTH }` (`ui-display.c` 828) redraws a 12-cell strip. The redraw is event-driven, not per frame.
- Order of steps in `prt_health_aux` (`ui-display.c` 425-458):
  (a) No tracked monster: erase the 12 cells and stop (431-434).
  (b) Colour from `monster_health_attr` (first, see below).
  (c) If the monster is out of sight, hallucinating, or `hp < 0`: write the box `[----------]` in white and stop (438-442). No number is leaked for an unseen target.
  (d) Otherwise: `pct = 100 * hp / maxhp` in integer arithmetic (445); `len = 1` if `pct < 10`, `pct/10 + 1` if `pct < 90`, else 10 (448). Write the box `[----------]` in white, then overwrite cells 1 to `len` with stars in the health colour (451-454).
- Colour (`monster_health_attr`, `ui-display.c` 365-423): default red (383). Then the bands replace it in order: `pct >= 10` light red (389), `>= 25` orange (392), `>= 60` yellow (395), `>= 100` light green (398). Then status tests run as separate `if`s with no `else`, so the last one that is true wins: fear violet (401), disenchanted, commanded, confused, stunned, asleep blue (416), held blue (419). Net priority: held > asleep > stunned > confused > commanded > disenchanted > fear > health band. A monster that is asleep shows blue whatever its hp.
- Look text (`target.c` 56-85): the same `perc` (73), bands at 60, 25 and 10 (75-83). Full hp gives "unhurt" (68-70). Then status words are appended in a fixed order: asleep, held, disenchanted, confused, afraid, stunned, slowed, hasted (87-94).

## 2. Key functions

- `monster_health_attr`: `ui-display.c` 365-423. Colour rules as above; unknown state at 374-378.
- `prt_health_aux`: `ui-display.c` 425-458. Bar text: box at 442 and 451, star count at 448, star fill at 454.
- `prt_health`: `ui-display.c` 470-473 (calls `prt_health_aux`). Registered at 828.
- `health_track`: `player-calcs.c` 2470-2474. Event mapping at 2656.
- `look_mon_desc`: `target.c` 56-95. Wound phrases 68-83, status words 87-94.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Health as a short bar of cells, first cell always lit for any living target | 10 cells inside a 12-cell box (`ui-display.c` 451-454, 470-473); 1 star below 10 percent (448) |
| Star count from percent | 10 percent per star from 10 to 89 (`pct/10 + 1`, 448); top bucket 90 to 100 is 11 points wide (the donor's own uneven bucket) |
| Health colour bands | 10, 25, 60, 100 percent (389, 392, 395, 398); default red below 10 (383) |
| Unknown target | White `[----------]` (442, 451); "unhurt"/"almost dead" text for the look command (70, 83) |
| Status overrides colour | Blue for asleep and held (416, 419); violet for fear (401). Status is a colour, not a tag. |
| Look-text bands | 60 "somewhat wounded" (76), 25 "wounded" (79), 10 "badly wounded" (81), below that "almost dead" (83) |
| Living vs non-living wording | One flag `living` switches each phrase (70-83): "undamaged", "damaged", "destroyed" |

## 4. TypeScript sketch

simplified: the sketch keeps the 10-cell bar, the unknown box for an unseen target, and the health band thresholds. It changes three things on purpose (see the defect list in section 6): the star count is `ceil(pct/10)` with a floor of 1, so each star covers exactly ten percent points; the health colour is never replaced by a status colour (status goes to `statusTags`, which the sketch carries but does not draw); and a `maxhp <= 0` guard returns the unknown state instead of dividing by zero. It omits the look text, the event wiring, the `health_track` call sites, the arena and death cases (`hp < 0` is handled only as unknown), the colour names and the terminal drawing.

```ts
// Licence: GPL-2 or the Angband licence (donor; dual). CLEAN-ROOM: written from the described mechanism, not a translation.
// Target frame health bar: one tracked enemy, 10 cells, unknown state when out of sight,
// health colour kept separate from status (status goes to tags, not to the colour).

export type Tone = "dark" | "unknown" | "red" | "lightRed" | "orange" | "yellow" | "lightGreen";

export interface Tracked {
  visible: boolean;
  hp: number;
  maxhp: number;
  statusTags: string[]; // e.g. "asleep", "held", "afraid": shown as text, never recolours the bar
}

export interface BarView {
  stars: number;   // 0..cells
  tone: Tone;
  box: string;     // the cells as text, for a terminal or an accessible label
}

// Fix: ceil(pct / 10) with a floor of 1, so every star covers exactly ten percent points.
// (Donor: pct < 10 -> 1, pct < 90 -> pct / 10 + 1, else 10. Its top bucket is 11 points wide.)
export function starCount(pct: number, cells: number): number {
  return Math.max(1, Math.min(cells, Math.ceil(pct / 10)));
}

// Health band (donor thresholds 10, 25, 60, 100 from the same integer percent).
export function healthTone(t: Tracked): Tone {
  if (!t.visible || t.hp < 0 || t.maxhp <= 0) return "unknown"; // fix: guard the divide
  const pct = Math.floor((100 * t.hp) / t.maxhp);
  if (pct >= 100) return "lightGreen";
  if (pct >= 60) return "yellow";
  if (pct >= 25) return "orange";
  if (pct >= 10) return "lightRed";
  return "red";
}

// One redraw of the frame. Unseen targets never reveal a stale value: the box is all dashes.
export function targetBar(t: Tracked | null, cells = 10): BarView {
  if (!t) return { stars: 0, tone: "dark" as Tone, box: "" };
  const tone = healthTone(t);
  if (tone === "unknown") {
    return { stars: 0, tone, box: "[" + "-".repeat(cells) + "]" };
  }
  const pct = Math.floor((100 * t.hp) / t.maxhp);
  const stars = starCount(pct, cells);
  return { stars, tone, box: "[" + "*".repeat(stars) + "-".repeat(cells - stars) + "]" };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 angband-health-bar.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/client/hud/target-frame.ts` (new file; client only). Parity-checklist row 14 (HUD). The frame reads the tracked enemy's hp from the server snapshot (server-verified kills stay in the engine); it never writes.
- Reuse tag: rewrite-from-idea (dual GPL-2 / Angband licence, treated as restricted and clean-room; the sketch is written from the mechanism)
- Brief rule served: client-only HUD; one engine (the frame reads the engine's tracked target); server verifies the kill (the bar only shows what the server sent)

Best transferable idea: a target frame that shows a 10-cell health bar for the current target, goes to an all-dash box when the target is out of sight (no stale number), and keeps health colour separate from status words.
Decision (proposed): adapt — keep the 10-cell bar, the unknown box for an unseen target, and the status-as-tags rule; change the star buckets to ceil(pct/10) and guard maxhp. Why: the bar is a read-only HUD on engine state and fits row 14 and the one-engine rule; the donor tracks only one monster, which does not match MAX_ATTACKERS = 3 (see gaps), so the frame must take a list of up to three attackers from the engine's hate list.
Acceptance: in a duel the target frame shows 10 cells for a full-health enemy and drops one cell per 10 percent of max hp; when the enemy steps out of sight the frame shows "[----------]" in the unknown colour, not a stale bar; a sleeping enemy keeps its health colour and gains an "asleep" tag. A test asserts `targetBar({visible:false,...}).box === "[----------]"` and `starCount(10, 10) === 1`.

## 6. Gaps and risks

- One tracked monster versus three attackers. The donor shows one bar (`health_who`). Frankendom's MAX_ATTACKERS = 3 and the many-on-one rule need up to three bars, ordered by the engine's hate list (target selection lives in the engine). The frame must take a list from the engine, not track on its own.
- Who is tracked is a client guess in the donor: tracking is set by melee, projections, and the look command (`player-attack.c` 748, `project.c` 989, `ui-target.c` 541). Frankendom should take the tracked target from the engine's duel state, so the HUD and the fight agree.
- Defect 1, the star buckets are uneven: 1 star for 0-9, `pct/10 + 1` for 10-89, and 10 stars for 90-100 (`ui-display.c` 448). The top bucket is 11 points wide. fix: `ceil(pct/10)` with a floor of 1 (sketch).
- Defect 2, status overrides the health colour (`ui-display.c` 401-419). A held or asleep enemy at 10 percent looks healthy-blue, and the player cannot read its hp. fix: keep the health colour, put status in tags (sketch `statusTags`).
- Defect 3, `100 * hp / maxhp` divides by `maxhp` with no guard (`ui-display.c` 386, `target.c` 73). Whether `maxhp` can be 0 was not read. fix: guard `maxhp > 0` (sketch).
- Defect 4, the two status lists disagree. The bar colour covers fear, disenchanted, commanded, confused, stunned, asleep, held (401-419). The look text covers sleep, held, disenchanted, confused, afraid, stunned, slowed, hasted (87-94). The look text has slow and haste; the bar has commanded and no slow or haste. fix: one status list in the engine, used by both.
- The bar is for hp only. It does not show the enemy's guard or stamina (parity row 3), so it does not replace the stance cue.
- Readability at 375 wide: 12 cells at the sidebar's text size is a small target; the frame should use the same cell count but a larger size on phone (not measured).
- Lock-on forgiveness and the input buffer (fold-in topics) were not read here; see the Checked line.

String table fold-in (`src/target.c` and `lib/gamedata`): the look-text wording is C string literals, not a table. It has 5 wound phrase pairs (unhurt/undamaged, somewhat wounded/damaged, wounded/damaged, badly wounded/damaged, almost dead/almost destroyed: 10 strings) chosen by one `living` flag (`target.c` 70-83), and 8 status suffixes appended with ", " in fixed order (87-94). The grammar is flat: no plurals, no genders, no placeholders; the subject is not in the string, so the frame puts the name in front. The text does not sit in `lib/gamedata` (grep of `lib` and `src` for the phrases found only `src/ui-display.c` and `src/target.c`). `lib/gamedata` holds the data files (for example `monster.txt`, `pain.txt`, `ui_entry.txt`, 53,527 lines across its `.txt` files). No locale layer was found for these HUD strings (not exhaustive).

Reuse tag: rewrite-from-idea (dual GPL-2 / Angband licence)
Brief rule served: client-only HUD; row 14; one engine (the tracked target comes from the engine)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- All claims verified (monster_health_attr bands, prt_health_aux, look_mon_desc, health_track, licence).
- Missed: look text also tests monster_is_destroyed for living/undead wording; player-attack.c 1186 is a second health_track call site not listed.
