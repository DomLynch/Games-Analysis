# Gap check, topic MD (modding, data packs) - date 2026-10-12 - Frankendom repo commit 8d6ae33a9

## Summary for Dom
1. 9 donor notes (MD001 x3, MD002 x3, MD003 x3), all Decision "adapt". Split into 15 ideas below.
2. Counts: ADD 9, REUSE 3, SKIP 3.
3. Top additions: (a) one row-layer rule for legend and zone rows (inherit a base, change a few keys, remove a key; 7 donor ideas merge into this one); (b) a publish gate for packs (ownership, version, name/case clash, missing required rows, named refusal reasons); (c) a staged-pack order resolver (requires with version range) for event packs, later.
4. Frankendom has no row inheritance and no pack publish path at all today. It has strong single-bundle validation (strict keys, duplicate ids, missing ids, per-row mob checks) and a three-layer merge for zone numbers.
5. The "Lands in" paths from the donor notes were not found by my grep, so every "lands in" below is my pick of the real nearest file.

## What the repo has today (checked)
- Zone numbers already layer: world, then region, then zone, by deep merge (origins/world/resolve.ts:19 `merge`, :138 `resolveZone`); a zone template has `base` plus `vary` ranges (origins/world/generate.ts:36 `generateZone`). Zones only; legend and mob rows do not.
- Content bundle load is strict: unknown field, unknown kind, unknown id are errors (origins/contracts/core.ts:4,14; registry.ts:31 `loadContent`); duplicate id refused (registry.ts:46); missing cross-references refused (registry.ts:73 `crossCheck`). Any problem fails the whole bundle.
- Mob rows: `validateMobRow`, `validateRows` with `dup-id` (origins/mobs/row.ts:71,111-114); `populateZone` uses only rows that pass (docs/specs/origins/mobs.md:802). Defaults are one table (row.ts:49).
- Legends are code, text only (src/legends.ts); the 600-row list is a CSV (docs/specs/origins/legends-500.csv), not a loaded catalogue.
- Not found anywhere: `inherits`, `copyFrom`, `parents`, a publish/stage endpoint, a pack version, a pack dependency list, a staff row editor, a save-time dry run.
- Ids are already lowercase only (origins/contracts/ids.ts:7,81), so a case-only name clash cannot occur inside ids; it can only occur in pack or file names.

## Table
| Donor note (group) | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| OpenRA-OpenRA (MD003) | Row names a parent, edits keys, minus removes | Zone layer merge only (resolve.ts:19) | No parent field on legend/mob rows; no key removal; no loop/self/missing-parent errors | ADD [MD003] (the main row-layer build; items 2, 4, 6, 9, 11 merge here) | New origins/contracts/row-layers.ts (proposed path not found); call it from origins/mobs/row.ts and the legend loader |
| 0ad-0ad (MD003) | Layer over parent with mul/add/round ops | Nothing for rows | Number ops on inherited values; integer basis points + one rounding rule | ADD [MD003], merged into OpenRA row | Same row-layers.ts; ops table beside it |
| 0ad-0ad (MD003) | Signed mod download to players | Nothing | Donor note itself rejects it until beta | SKIP: Dom-only publish until beta | none |
| endless-sky (MD003) | Ordered add/remove/overwrite patch over stock rows | Nothing | Patch file over stock zone/legend rows; non-number must fail with file and line | ADD [MD003], merged into OpenRA row | row-layers.ts (patch = a layer with add/remove) |
| endless-sky (MD003) | Drop only the bad variant, log lost weight | Rows that fail validation are skipped by populateZone (mobs.md:802); bundle load fails whole by design (registry.ts:31) | Only the logged lost weight is missing; whole-bundle failure for content is the right default | REUSE: `validateRows` + `populateZone` eligibility | origins/mobs/populate.ts (add the log line only) |
| CleverRaven-Cataclysm-DDA (MD002) | Copy base row, proportional/relative deltas | Nothing | Same as the OpenRA row; also named error for a missing base id (not "circular") | ADD [MD002], merged into OpenRA row | row-layers.ts |
| CleverRaven-Cataclysm-DDA (MD002) | Reject unknown keys at load | Done: core.ts:4,14 `unknown-field`; registry.ts `unknown-kind` | None for contract kinds; confirm mob rows and legend rows use the same reader | REUSE: contracts/core.ts reader | origins/contracts/core.ts |
| CleverRaven-Cataclysm-DDA (MD002) | Retry loader for any file order | Registry loads all records, then cross-checks (registry.ts:73), so order does not matter | Not needed for flat bundles; layers need only a topological order | SKIP: bundle load is already order-free | none |
| evennia-evennia (MD002) | Parent chain merge, loop check, flattened preview | Nothing | Chain flatten and loop error; preview of flattened stats | ADD [MD002], merged into OpenRA row | row-layers.ts (`flatten`) |
| evennia-evennia (MD002) | One validator for preview and save | Validators return a Result with no write: `loadContent`, `validateRows` | Only the staff save endpoint and read-only base rows are missing; the validator itself exists | REUSE: `validateRows`/`loadContent` as the dry run | origins/server/handlers.ts (when a save handler is built) |
| openmw (MD001) | Type, then row, then instance layers, with detach | Zone-level layering (resolve.ts:19); mob behaviour defaults one table (row.ts:49) | Per-type defaults and a spawn-level detach for behaviour | ADD [MD001], merged into OpenRA row (null/minus = detach) | row-layers.ts; behaviour read in origins/mobs/populate.ts |
| wesnoth-wesnoth (MD001) | Publish gate: owner, version, name, case, reasons | Nothing; only duplicate-id inside a bundle (registry.ts:46) | Whole publish path: ownership role, strict version increase, name/file check, case-collision check, named refusal codes, live catalogue unchanged on refusal | ADD [MD001] | New origins/server/publish-pack.ts (proposed path not found); nearest existing is origins/server/handlers.ts |
| wesnoth-wesnoth (MD001) | Name-and-hash delta between versions | Nothing | Needed only when players download packs | SKIP: Dom-only publish, no pack download yet | none |
| luanti-org-luanti (MD001) | Refuse missing required rows or name clashes | Missing ids inside one bundle: registry.ts:73 `crossCheck` `unknown-id`; duplicate id: registry.ts:46 | Across packs: a pack that needs an absent pack, a duplicate pack name, cycles | ADD [MD001], merged with the publish gate (same file) | publish-pack.ts; reuse `crossCheck` for the in-pack part |
| flareteam-flare-engine (MD002) | Priority-ordered packs, versioned `requires` | Nothing | Staged event/season pack order resolver, version range, requirement-first order | ADD [MD002], low priority (after the publish gate) | publish-pack.ts or origins/server/pack-resolve.ts |

## For the later checker pass
ADD groups to verify: MD003 (row layers), MD002 (copy-from/flatten merged), MD001 (openmw layers, publish gate, dependency refusal), MD002 (staged order). Three real builds in total: row-layers, publish gate, pack order.
