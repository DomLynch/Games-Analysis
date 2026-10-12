# flareteam-flare-engine (modding-authoring-tools, cell 3)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/ModManager.cpp` (mod list, file lookup, requirements), `src/ItemManager.cpp` (`LevelScaledValue`, authored scale strings), `src/UtilsParsing.cpp` (`Parse::toFloat`), `src/FileParser.cpp` (error reporting) | Licence: GPL-3.0 (`/mnt/frankendom-donors/flareteam-flare-engine/COPYING`, line 2: "Version 3, 29 June 2007"; copyleft, so clean-room, shape only) | C++ | symbol `ModManager::locate`, `ModManager::applyDepends`, `LevelScaledValue::randomize`

Checked: Read in full: `ModManager::locate` (ModManager.cpp 246-285), `applyDepends` (464-553), `loadMod` settings and gameplay key loops (338-462, the metadata part; the `@ATTR` comment block at 382 is read, not the rest of the attribute list). Read in part: `LevelScaledValue::get`, `randomize`, `clear` (ItemManager.cpp 88-150, 226-240), `LevelScaledValue::parse` (160-220, the scale-type branches only), `Parse::toFloat` (UtilsParsing.cpp 162-167), `FileParser::error` and `errorBuf` (FileParser.cpp 237-258). Candidates opened: ModManager.cpp, ItemManager.cpp, UtilsParsing.cpp, FileParser.cpp, mods/mods.txt, COPYING. Confidence: high on the override-by-list order and on the `applyDepends` nesting (read line by line; not run). Medium on the zero-step effect (the division and `toFloat` read; not run). The donor's `mods/` folder contents other than mods.txt were not read. The donor's CLAUDE.md/AGENTS.md were not opened; donor files were treated as data. camera_scope: not a camera topic.

Best transferable idea: Let a content pack override another by its position in a priority list, resolve a pack's requirements (with a version range) before it, and refuse a pack whose requirement is missing at any position, so an unmet dependency is never enabled silently.

Decision (proposed): adapt - take the priority-ordered pack list, the version-ranged `requires`, and the requirement-first order, staged on the server for event or season packs; the sketch adds the missing check the donor skips. Reject the whole-file override as the way live legend or zone data is replaced (two packs replacing one file lose data silently); live rows are replaced by id, with the same-source duplicate check from the CDDA note, and balance numbers stay server-owned.

Acceptance: A staff event pack lists `requires: core:1.0:2.0`. If `core` is missing from the catalogue, or its version is outside 1.0 to 2.0, the stage step returns an error naming core (server test: `resolvePacks(["event"], ...)` with no core returns an error naming core; with core 3.0 installed it returns an error naming core and its version; the same two cases with event listed first fail the same way, so the first-in-list defect is covered). If core is installed in range, both `resolvePacks(["core","event"], ...)` and `resolvePacks(["event","core"], ...)` return the order core, event with no errors, because the requirement is pulled ahead of the pack that needs it (as the donor does). A second pack that requires `core:2.0:3.0` while core 1.0 is already enabled also returns an error.

## 1. Mechanism

- Mod list: `mods/mods.txt` lists mod folders in order. The file says in its first line: "Mods lower on the list will overwrite data in the entries higher on the list" (mods/mods.txt line 1). The list is the priority order.
- File lookup: `locate` (ModManager.cpp 246-285) walks the list from the last entry (highest priority) down to the first (loop at 257), and in each mod folder checks for the file (259). The first file that exists wins. The result is cached per filename (loc_cache). If no mod has the file, the base data path is used. The override is per file: a whole file in a higher mod replaces the lower file, not a merge of its rows.
- Mod metadata: `loadMod` (338) reads `settings.txt` in each mod path: `description`, `description_locale`, `version`, `requires`, `game`, `engine_version_min` and `engine_version_max`. `requires` is a comma-separated list with optional `:min:max` version bounds (the `@ATTR` comment at 382 documents this). A requirement whose min is above its max has its max raised to equal min (ModManager.cpp 395). The engine_version_min and engine_version_max keys (415, 419) are only parsed; no such correction applies to them. An unknown key is logged with "contains invalid key" (422) and skipped; it is not fatal. `engine/gameplay.txt` gives `enable_playgame`.
- Dependency resolution `applyDepends` (464-553): the game is the last mod's `game` (469). For each mod in order: skip it on a game mismatch or an engine version outside its range; skip it if already enabled; then for each requirement, look in the enabled list (scan at 495) and, if not found, load it from the available folders (499 onward). A requirement with the wrong game, engine or version disables the mod (depends_met false, breaks at 537), but only when the requirement is freshly loaded in the `!found_depend` branch; a requirement already in the enabled list sets found_depend and is never game-, engine- or version-checked. A requirement not found in the folders is also an error (531: "which is required by mod"). A found requirement is pushed to the enabled list and `finished` is set false (the push follows the "requires the" log message); after the loop the enabled list replaces the old one (547), and the function calls itself again if `finished` is false.
- Important: the `if (!found_depend)` block (499) is inside the scan loop (495). If the enabled list is still empty when a mod is checked, the scan body never runs, so that mod's requirements are not checked at all. The first mod in the list is enabled even if its requirement is missing or out of range. This is read, not run.
- Authored numbers: `LevelScaledValue::parse` (ItemManager.cpp 160-220) reads a value as a base and optional scale terms: base:max:step, and per item level, per player level and per primary stat terms, each with a min, max and step. The `get` function (88) returns base + per_item_level x (item_level - 1) + per_player_level x (player level - 1) + the primary-stat terms, then clamps to optional min and max and optionally rounds. `randomize` (125) chooses a value on a grid: step_count = floor((max - base) / step), then base += randBetween(0, step_count) x step (132). The step is parsed with `Parse::toFloat(step_str, 1)` (175). `toFloat` returns the default only when parsing fails (UtilsParsing.cpp 164-165), so a step written as 0 stays 0.
- Defect: with step 0, `randomize` divides by zero (132). A float division by zero gives inf or NaN, and the int cast of that is undefined behaviour. The step branch at 175 has no check (as read). Not run; read only.
- Errors: `FileParser::errorBuf` prefixes every parse error with file name and line number (FileParser.cpp 254). Errors are logged, not thrown.
- Tick: none. Loading is at startup. Camera: not applicable.

## 2. Key functions

- `ModManager::locate`: `/mnt/frankendom-donors/flareteam-flare-engine/src/ModManager.cpp` 246-285. Highest-priority file wins; cached; base fallback.
- `ModManager::applyDepends`: `/mnt/frankendom-donors/flareteam-flare-engine/src/ModManager.cpp` 464-553. Game and engine checks, version-ranged requirements, recursive re-run; the scan-loop defect at 495-499.
- `ModManager::loadMod`: `/mnt/frankendom-donors/flareteam-flare-engine/src/ModManager.cpp` 338-462. Metadata keys; unknown key logged (422).
- `LevelScaledValue::randomize` and `get`: `/mnt/frankendom-donors/flareteam-flare-engine/src/ItemManager.cpp` 125-150 and 88-100. Grid roll and scaled value; zero-step defect at 132.
- `FileParser::errorBuf`: `/mnt/frankendom-donors/flareteam-flare-engine/src/FileParser.cpp` 248-256. File and line prefix.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Priority list: later entry overrides earlier, per file | Rule (mods.txt line 1; ModManager.cpp 257) |
| Requirement version range `min:max`; inverted range corrected to min = max | Rule (loadMod, `requires`, ModManager.cpp 382 and the min/max handling at 395) |
| Engine version range per mod | Rule (`engine_version_min` and `engine_version_max`; the engine check in applyDepends comes after the game check) |
| Scale step default | 1 (ItemManager.cpp 223, 233) |
| Scale step must be above 0 | Not enforced (ItemManager.cpp 132, 175): defect |
| Scaled value formula | base + per_item_level x (item_level - 1) + per_player_level x (player_level - 1) + primary terms (ItemManager.cpp 88-99); the `-1` terms mean level 1 adds nothing |
| Optional clamp and round | `result_min`, `result_max`, `result_round` (ItemManager.cpp 93-99) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's game, engine and version checks, and the requirement-first order. It differs in four places. (1) It takes the game as an argument; the donor uses the last list entry's game (ModManager.cpp 469). (2) It has no fallback mod or fallback game (the donor's `FALLBACK_GAME` and `FALLBACK_MOD` checks at 466-476). (3) It uses a number for the version, not the donor's Version class. (4) It orders requirements by a depth-first visit in one pass, instead of the donor's repeated passes that rebuild the list; the donor also checks a requirement for every scan position, and the sketch checks it once, after the visit, so the first-in-list defect cannot happen. The sketch does not implement `locate`, the file override, or the scale strings.

```ts
// Licence: GPL-3.0 (donor, COPYING). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Req { id: string; min: number; max: number }
interface Pack {
  id: string;
  version: number;          // donor uses a Version class; a number is enough for the sketch
  game: string;
  engineMin: number;
  engineMax: number;
  requires: Req[];
}

export interface PackPlan { order: Pack[]; errors: string[] }

// The list is priority order (a later entry overrides an earlier one), so only the requirement order
// is computed here: each pack's requirements come before it. A missing requirement is an error at
// any position in the list, including the first (the donor skips this check for the first mod).
export function resolvePacks(list: string[], catalogue: Map<string, Pack>, engine: number, game: string): PackPlan {
  const errors: string[] = [];
  const order: Pack[] = [];
  const state = new Map<string, "visiting" | "done">();

  function visit(id: string, needer: string): void {
    const seen = state.get(id);
    if (seen === "done") return;
    if (seen === "visiting") { errors.push(`${id}: requirement cycle`); return; }
    const p = catalogue.get(id);
    if (!p) { errors.push(`${needer} needs ${id}, which is not installed`); return; }
    if (p.game !== game) errors.push(`${id}: game ${p.game} is not ${game}`);
    if (engine < p.engineMin || engine > p.engineMax) errors.push(`${id}: engine ${engine} is outside ${p.engineMin}..${p.engineMax}`);
    state.set(id, "visiting");
    for (const r of p.requires) {
      visit(r.id, id);
      const dep = catalogue.get(r.id);
      if (dep && (dep.version < r.min || dep.version > r.max)) {
        errors.push(`${id}: needs ${r.id} ${r.min}..${r.max}, installed is ${dep.version}`);
      }
    }
    state.set(id, "done");
    order.push(p);
  }

  for (const id of list) visit(id, "list");
  return { order, errors };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/flare-pack-resolve.ts` on the VPS, exit 0 (run this turn).

## 5. Lands in

- TARGET `origins/catalogue/packs.ts` (new): stages event and season content packs on the server, resolves their requirements, and refuses a stage with errors. The fight engine reads only the published rows.
- Parity-checklist row 20 (catalogue as runtime source): packs are a source for catalogue rows; the rows, not the packs, are read at runtime.
- Reuse tag: adapt-idea (GPL-3.0, copyleft: clean-room only; this note and the sketch are written from the mechanism)
- Brief rule served: zones and legends as data on one runtime (Frankendom ruling); one ledger (no pack changes a live balance number except through a published row).

## 6. Gaps and risks

- Copyleft (GPL-3.0): no lines copied. The sketch and this note describe the mechanism only.
- The first-in-list defect (ModManager.cpp 495-499): a mod that is first in the list is enabled without its requirements being checked. Frankendom must check every requirement, and a test must cover a pack listed first with a missing requirement. Fix: the sketch's post-visit check.
- Second defect (ModManager.cpp 495-499): a requirement already in the enabled list is never version-checked, so a pack requiring `core:2.0:3.0` passes when an earlier pack already enabled core 1.0. The sketch checks every requirement's version, and the acceptance covers this case.
- Whole-file override: a higher pack replaces a lower pack's whole file (locate, 257-259). Two packs that both ship the same file lose one silently. For Frankendom, a row-level override by id, with a same-source duplicate error (see the CDDA note, mod_tracker.h 79) and a refusal for two packs that define the same id.
- Zero step: `randomize` divides by the step (ItemManager.cpp 132), and the parser accepts 0 (175; UtilsParsing.cpp 164-165). Fix: the parser rejects a step at or below 0 and reports the file and line through `errorBuf` (FileParser.cpp 248-256).
- Unknown settings keys are logged and skipped (422), but the content parsers are not read in full here, so the behaviour for unknown keys in item and enemy data is not confirmed. Frankendom should reject unknown keys at save (the CDDA rule).
- The `getMax` function is marked "TODO unused?" (ItemManager.cpp 102). Treat it as dead code in the donor; do not port it.
- The scale string is a compact authored format with colons. It is easy to write and hard to validate. Frankendom's row editor should have a field per term, not one string.
- Dependency recursion: `applyDepends` calls itself while `finished` is false (after the loop). Termination was not analysed beyond reading the loop. The sketch uses a single visit with a cycle check.
- Clean-room: no line-by-line translation.

Reuse tag: adapt-idea (GPL-3.0, clean-room)
Brief rule served: zones and legends as data (Frankendom ruling: one engine, zones as data); one ledger (balance numbers are published rows, not pack globals).


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: "Verified OK: locate loop 257 from last mod down, mods.txt line 1, GPL-3.0, requires parsing with min>max -> max=min (ModManager.cpp 395), unknown key log 422, first-in-list defect (scan loop 495, if(!found_depend) 499 inside it), error 531, break 537, mod_list=new_mods 547, step default 1 (ItemManager 223,233), toFloat default only on parse fail, randomize int division by step (132-133), FileParser::errorBuf prefix. Errors: (1) note says the engine-version check 'does the same' min>max correction as requires; engine_version_min/max at ModManager.cpp 415/419 only setFromString, no correction. (2) ACCEPTANCE FAILS ITS OWN SKETCH: Acceptance says resolvePacks([""event"",""core""], ...) returns an error naming core when event is staged before core. The sketch visit() is depth-first and visits core as event's requirement first, pushing order [core, event] with NO error, so the first assertion cannot pass on a correct build of the sketch (the donor likewise auto-enables the dependency before the dependent rather than erroring on order). Either the acceptance or the sketch must change. (3) Note says a requirement with the wrong version disables the mod; in donor this is only checked when the dependency is freshly loaded (the !found_depend branch); see missed."
Missed: A requirement already present in new_mods sets found_depend=true and is never version-, game- or engine-checked (ModManager.cpp 495-499), so a second mod requiring core:2.0:3.0 passes when an earlier mod already enabled core 1.0. Second defect beside the first-in-list one; Frankendom version-range test should cover it.

Fixed 2026-10-12 (Sonnet fixer): verified ModManager.cpp 495-537 and 395/415/419. The acceptance contradicted the sketch (the sketch pulls a requirement ahead of its pack, so `["event","core"]` gives no error, as in the donor); acceptance rewritten to match the sketch and to add missing, out-of-range, first-in-list and already-enabled-wrong-version cases. The engine min/max 'same correction' claim was wrong and is removed. Added the already-enabled-requirement-not-checked defect and the freshly-loaded-only qualifier. Sketch unchanged, so no new typecheck.
