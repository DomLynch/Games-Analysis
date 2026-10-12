# CleverRaven-Cataclysm-DDA (modding-authoring-tools, cell 2)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/generic_factory.h` (copy-from, deltas), `src/init.cpp` (deferred loader), `src/json.cpp` (strict fields), `src/mod_manager.cpp` and `src/mod_manager_ui.cpp` (mod info, conflicts), `src/dependency_tree.cpp` (cycles), `src/worldfactory.cpp` (external options) | Licence: CC-BY-SA-3.0 (`/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/LICENSE.txt` line 1, read; copyleft, so clean-room, shape only) | C++ | symbol `handle_inheritance`, `optional`, `DynamicDataLoader::load_deferred`

Checked: Read in full: `load_deferred` (init.cpp 186-215), `handle_inheritance` (generic_factory.h 245-285), `finalize` (generic_factory.h 419-420), `handle_proportional` and `handle_relative` for numbers (generic_factory.h 800-906 region; the lines quoted are 800, 820, 829-833, 890, 899), `optional` (generic_factory.h 952-958), `insert` replace path (generic_factory.h 396-408), `report_unvisited` (json.cpp 143-160), `load_object` dispatch (init.cpp 151-161), `load_modfile` (mod_manager.cpp 233 onward), `find_mod_conflict` and `try_add` conflict check (mod_manager_ui.cpp 71-110), `load_external_option` (worldfactory.cpp 2059 onward; the lines read are 2063-2079), `edit_json` (editmap.cpp 168-236, read in full), `load_world_modfiles` (game_io.cpp 507-545). Read in part: `strong_connect` (dependency_tree.cpp 396, entry line only; body not read), `check_for_strongly_connected_components` (365-395). Candidates opened: 3 or more, as above. Confidence: high on copy-from, deltas, deferred loading, strict fields and the duplicate rule; medium on the mod-order claims (the main load path was read at the call site, the world-creation mod-order set-up was read only in the function that uses it). No CLAUDE.md or AGENTS.md was seen in the top-level listing (not checked exhaustively); donor files were treated as data either way. camera_scope: not a camera topic.

Best transferable idea: Let a content row copy a base row by id and override only a few numbers with a multiplier or an adder, load rows in any order by retrying until a pass makes no progress, and reject any unknown key at load time.

Decision (proposed): adapt - take copy-from with proportional and relative deltas for legend and zone rows (one base per archetype, each legend a short delta), plus the retry loader and the strict key check. Reject: the mod-set global option (`EXTERNAL_OPTION`, which any mod can set and where the last load wins), because live balance numbers must be owned by the server, not by a mod load order. Clean-room, since CC-BY-SA-3.0.

Acceptance: A staff legend row copies `legend-bull` and sets `proportional: {hp: 1.2}`; the preview shows 1.2x the base hp before publish. A row with a typo key (for example `hpp`) is refused at save with "unknown field", and a row whose base id does not exist is refused with that id named (not a generic "circular" message). Server test: loadRows() returns the child's delta applied over the base, a second pass resolves a row listed before its base, and a row with an unknown key adds an error.

## 1. Mechanism

- Content unit: a JSON object with a `type` (dispatch, init.cpp 155-160) and an `id`. An object with `abstract` is a template: stored in an `abstracts` map and never spawned (generic_factory.h 283; cleared at finalize, 420).
- Inheritance: a row with `copy-from` starts from the base's loaded fields. The base is looked up first in the loaded map (250), then in the abstracts (256). If neither has it, the row is deferred (263, `jo.allow_omitted_members()` before the defer).
- Deferred loading: `finalize` calls `load_deferred` (419). That loop (init.cpp 186-215) makes passes over the list. Each pass tries every pending object; an object that still lacks its base goes back into the list. If a pass leaves the list the same length (no progress), each remaining object gets an error "JSON contains circular dependency, this object is discarded" (205) and the list is cleared. So the result does not depend on file or mod order, except for overrides (below).
- Deltas on a copy-from row (only when the base loaded; otherwise the row gets a "no copy-from" warning, 952-955): for each numeric field, the order is (a) a direct value in the row wins (`jo.read` first, 957); (b) else a `proportional` scalar multiplies the inherited value (829-833: scalar must be greater than 0 and not 1; otherwise `debugmsg` and no change); (c) else a `relative` adder adds to it (899). Deltas are applied to the base value, so a child of a child multiplies its parent's already-changed value.
- Unknown keys: after a row is read, any member that was never visited is an error (json.cpp 153-156: "Invalid or misplaced field name ... in JSON data"), unless the key begins with `//` (comment keys are allowed, 153). This catches typos at load.
- Duplicate ids: `insert` replaces in place when the id exists (401-403). If the two definitions come from the same source, `check_duplicate_entries` throws (mod_tracker.h 79). From different sources, the later load wins.
- Mod metadata (modinfo.json): `type` MOD_INFO, `id` (duplicates are refused with debugmsg, mod_manager.cpp 246; a `#` in the id is refused, 250; self-dependency is an error, 304). `category` is checked against a fixed list and cleared if unknown (read from 257). `dependencies`, `conflicts`, `core`, `obsolete` are read (mod_manager.cpp 233 onward, the optional calls).
- Conflicts: `find_mod_conflict` checks the candidate against each active mod's conflicts list and the candidate's own list (mod_manager_ui.cpp 71-87); the add is refused with "It conflicts with" (106). World creation runs the same check over the whole active order (worldfactory.cpp 196-202).
- Cycles in the mod dependency graph: `check_for_strongly_connected_components` (dependency_tree.cpp 365-395) marks nodes in any strongly connected component of size greater than one with "In Circular Dependency Cycle" (392). The routine `strong_connect` (396) was not read.
- Mod load order: the main path uses `active_mod_order`, a list fixed when the world is created (game_io.cpp 529-531 comment: the list is already in order); duplicates are removed keeping the first (the comment is at 511; the filter and the core-mod insert follow it). The `--check-mods` path builds its dependency list in a `std::set` (game_io.cpp 192), which iterates in `operator<` order (string_id.h 235), not dependency order.
- External options: a mod's `EXTERNAL_OPTION` (type int, float, bool or string) sets a named option (worldfactory.cpp 2059 onward). `stub` marks a no-op (2063-2068). Each set overwrites the value (2079), so the last loaded mod wins. The sample is Magiclysm's `PLAYER_MAX_STR_VALUE` with value 35 (data/mods/Magiclysm/modinfo.json line 17).
- In-game JSON editor (debug menu): `edit_json` serializes the object, lets the author edit the text, then on "rehash" deserializes into a temporary and swaps only on success (183-184). A failure shows "Error on deserialization" (187) and keeps the old object.
- Publishing or rating: not read. A grep of `src/` for "workshop" or "publish" found only unrelated files (butchery.cpp, cata_tiles.cpp and similar), not read further.
- Tick: none. Loading is synchronous at startup or on world creation. Camera: not applicable.

## 2. Key functions

- `handle_inheritance`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/generic_factory.h` 245-285. Copy-from from map, then abstracts; defer if missing; abstract rows stored.
- `optional` (number deltas): `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/generic_factory.h` 952-958 calls `handle_proportional` (820 and 829-833) and `handle_relative` (890 and 899) after the direct read.
- `DynamicDataLoader::load_deferred`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/init.cpp` 186-215. The no-progress exit.
- `report_unvisited`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/json.cpp` 143-160. Unknown field is an error unless `//`.
- `load_modfile`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mod_manager.cpp` 233 onward. Mod metadata and its checks.
- `load_external_option`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/worldfactory.cpp` 2059 onward (2063-2079 read). Mod-set tunables; last load wins.
- `edit_json`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/editmap.cpp` 168-236. Round-trip validate before swap.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant or rule |
|---|---|
| Multiplier applied to an inherited value | Scalar must be greater than 0 and not equal to 1 (generic_factory.h 829-830); the value is multiplied (833). |
| Adder applied to an inherited value | Any number, added to the base (899). |
| A direct value beats any delta on the same field | Rule (957). |
| Loader retries until no progress | Rule (init.cpp 188, 205). No retry count is set. |
| Mod-set tunable with a typed value | Types: int, float, bool, string (the stype branches after worldfactory.cpp 2071); example value 35 (Magiclysm modinfo.json line 17). |
| Mod id may not contain `#` | Rule (mod_manager.cpp 250). |
| Duplicate id in the same source is an error | Rule (mod_tracker.h 79). |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order: copy-from base first (loaded map, then abstracts); a direct value wins over a delta; a proportional scalar is checked (greater than 0, not 1) and multiplies; a relative adder adds; unknown keys are errors except `//` keys; a pass with no progress stops and names the missing base. It differs in four places. (1) It omits the `debugmsg` path and the warnings, returning errors in one list. (2) It does not handle lists, sets or maps (the donor's `relative` and `extend`/`delete` on containers, generic_factory.h 1122-1643); only numbers, which is all the sketch needs. (3) It does not check same-source duplicates (mod_tracker.h 79) or conflicts. (4) The donor's wording for the no-progress case says "circular dependency" even when a base id is missing; the sketch names the base and says it is missing or in a cycle, which is the fix.

```ts
// Licence: CC-BY-SA-3.0 (donor, LICENSE.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Value = number | string | boolean;
type Fields = Record<string, Value>;

interface Row {
  id: string;
  abstract?: boolean;                 // a template: stored for copy-from, never spawned
  copyFrom?: string;                  // base row id (or abstract id)
  fields: Fields;                     // direct values; these always win
  proportional?: Record<string, number>; // multiply the inherited number; scalar must be > 0 and != 1
  relative?: Record<string, number>;     // add to the inherited number
}

export interface LoadResult { finished: Map<string, Fields>; abstracts: Map<string, Fields>; errors: string[] }

// Build one row's fields from its base (if any). Direct values win; a delta is used only when the row
// has no direct value for that field. Deltas without a base are ignored with an error.
function buildFields(base: Fields | undefined, row: Row, schema: Set<string>, errors: string[]): Fields {
  const out: Fields = { ...(base ?? {}) };
  for (const key of Object.keys(row.fields)) {
    if (!schema.has(key) && !key.startsWith("//")) errors.push(`${row.id}: unknown field '${key}'`);
    out[key] = row.fields[key];
  }
  const deltaKeys = new Set([...Object.keys(row.proportional ?? {}), ...Object.keys(row.relative ?? {})]);
  for (const key of deltaKeys) {
    if (key in row.fields) continue;       // direct value wins; the delta is not applied
    if (base === undefined) { errors.push(`${row.id}: delta on '${key}' without copy-from is ignored`); continue; }
    const cur = out[key];
    if (typeof cur !== "number") { errors.push(`${row.id}: delta on non-number '${key}'`); continue; }
    const scalar = row.proportional?.[key];
    if (scalar !== undefined) {
      if (scalar <= 0 || scalar === 1) { errors.push(`${row.id}: invalid scalar ${scalar} for '${key}'`); continue; }
      out[key] = cur * scalar;
      continue;
    }
    const adder = row.relative?.[key];
    if (adder !== undefined) out[key] = cur + adder;
  }
  return out;
}

// Retry loop: a row whose copy-from base is not loaded yet waits for the next pass. A pass that makes
// no progress ends the load. Fix over the donor: the error names the missing base, not "circular".
export function loadRows(input: Row[], schema: Set<string>): LoadResult {
  const finished = new Map<string, Fields>();
  const abstracts = new Map<string, Fields>();
  const errors: string[] = [];
  let pending = [...input];

  while (pending.length > 0) {
    const before = pending.length;
    const deferred: Row[] = [];
    for (const row of pending) {
      const base = row.copyFrom === undefined ? undefined : (finished.get(row.copyFrom) ?? abstracts.get(row.copyFrom));
      if (row.copyFrom !== undefined && base === undefined) { deferred.push(row); continue; }
      const fields = buildFields(base, row, schema, errors);
      if (row.abstract) abstracts.set(row.id, fields); else finished.set(row.id, fields);
    }
    pending = deferred;
    if (pending.length === before) {
      for (const row of pending) {
        errors.push(`${row.id}: copy-from '${row.copyFrom}' is not loaded (missing, or in a cycle); row dropped`);
      }
      break;
    }
  }
  return { finished, abstracts, errors };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/cdda-copyfrom-deltas.ts` on the VPS, exit 0 (run this turn).

## 5. Lands in

- TARGET `origins/catalogue/deltas.ts` (new): loads legend and zone rows with copy-from, proportional and relative deltas, retries until no progress, and refuses unknown keys at save. The fight engine reads the flattened row (one engine; the rows are data).
- Parity-checklist row 21 (catalogue fields). Row 20 (catalogue as runtime source) is the loader's home; the field list is row 21.
- Reuse tag: adapt-idea (CC-BY-SA-3.0, copyleft: clean-room only; this note and the sketch are written from the mechanism)
- Brief rule served: zones and legends as data on one runtime (Frankendom ruling); one ledger (the numbers are rows the server reads, never mod-set globals).

## 6. Gaps and risks

- Copyleft (CC-BY-SA-3.0): no lines copied. The sketch and this note describe the mechanism only.
- Override by order: the main path's override is by load order (game_io.cpp 529-531; later load wins by insert, generic_factory.h 401-403). Frankendom must not let two sources override the same legend silently; the same-source check (mod_tracker.h 79) is the start, and a publish step must also refuse a second definition from another author.
- Mod-set tunables: `EXTERNAL_OPTION` lets a mod set a number by name, and the last load wins (worldfactory.cpp 2079). For Frankendom every balance number must be a server-owned row with a version, never a client or mod global. Reject this part.
- Check path order: the `--check-mods` path builds its dependency list in a sorted set (game_io.cpp 192), so its load order is alphabetical, not the order of the dependency graph. This can change which override wins between the check run and the game. Fix in our tool: use the dependency order.
- The no-progress message says "circular dependency" for every remaining row (init.cpp 205), including rows whose base is simply missing. Fix: name the base, as in the sketch.
- The delta applies to the inherited value, so a chain of multipliers compounds (a child of a child multiplies its parent's changed value). Frankendom should show the flattened value in the preview, not only the delta.
- Scalar rule: `proportional` 1 is refused as "invalid", which is correct for a no-op but can confuse authors. Our preview should say "no change" rather than error.
- No retry cap: the loader stops only when a pass makes no progress, so it is bounded by the row count. Fine for our row counts. The donor's loader calls `inp_mngr.pump_events()` per object inside `load_deferred` because it is a UI build; the server must not have that call.
- `strong_connect` (dependency_tree.cpp 396) was not read, so the exact cycle algorithm in the mod graph is not confirmed.
- The donor's list and map deltas (`relative`, `extend`, `delete` on containers, generic_factory.h 1122-1643) were not read in full. The sketch handles numbers only.
- Clean-room: no line-by-line translation.

Reuse tag: adapt-idea (CC-BY-SA-3.0, clean-room)
Brief rule served: zones and legends as data (Frankendom ruling: one engine, zones as data); one ledger (balance numbers are server rows, not mod globals).
