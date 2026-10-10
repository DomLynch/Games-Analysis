# SWG-Source-swg-main (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/ScanScript.pl` | Licence: none stated in the donor; the donor's restricted note says "proprietary, no licence" (clean-room only) | Perl | symbol: (none, whole-file script; two routines described by role)

Checked: read the whole donor file, lines 1-144, end to end, plus the restricted note. Confirmed the game source submodules (src, dsrc, serverdata) are empty in this copy, so the runtime that consumes these dialogue lines is not in the donor (not read). Confidence high on the check's steps and order; medium on how the game uses the lines (not read). Candidates opened: `tools/ScanScript.pl` (the mechanism), `utils/build_quest_crc_string_tables.py` and `tools/buildQuestCrcStringTables.pl` (quest-name hash tables, a different job: quest identifiers, not dialogue), `build.xml` (grep lines only, build targets, not read in full). The "range" regex claim was run on the VPS with my own test string, not donor text. camera_scope: not applicable.

## 1. Mechanism

- A conversation script names every line it may speak as a reference into a string table. A reference is either one line id, or a prefix plus an inclusive numbered range (prefix 1 through prefix N). A ranged reference means the game may pick any one variant; the picking is not in the donor (not read).
- Pass 1, parse the script (single pass, lines 92-122): each declaration that binds a variable to a table file is recorded (94). Each reference line is matched (96). The reference is keyed to its table as the line is read (101), so a declaration must come earlier in the file. A ranged reference adds every prefix+number in the inclusive range (103-115). A single reference adds its one id (116-120).
- Print the required list per table (126-134).
- Pass 2, check each table (138-141, routine 30-78): look the table up in version control (42), dump the ids the table holds through an external Windows tool (55-60), build the set of held ids (58), then for each required id that is not held, print it as missing (62-72). If nothing is missing, print "None missing" (74).
- The check only reports. A missing id prints a line and the run carries on. The only exit paths are the usage message (25, 84) and a failed version-control open (42).
- It is a command-line content check run by hand. It is not part of any frame or server loop.

## 2. Key functions

- Parser loop: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/ScanScript.pl` 92-122 (variable-to-table map 94, reference match 96, keyed required set 101, ranged branch 103-115, single branch 116-120).
- Per-table check routine: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/ScanScript.pl` 30-78 (lookup 42, held ids 55-60, diff 62-72, print 74).
- Driver: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/ScanScript.pl` 138-141.
- Usage guard: `/mnt/frankendom-donors/SWG-Source-swg-main/tools/ScanScript.pl` 23-28 and 84.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor-specific or donor bug |
|---|---|
| Expand a ranged reference into explicit ids, inclusive at both ends (the loop runs while the number is at most the end, line 109) | The range bounds are matched as ONE digit each (103). Confirmed on the VPS with a Perl test: a bound of 12 is read as 2. So the donor mis-expands ranges of 10 or more. Do not copy. |
| Required ids minus held ids, per table (62-72) | Tables are found in version control (42) and read with an external Windows tool (55) |
| Report missing ids (74) | Missing is printed, never a failing status |
| One reference, one id (118-119) | A text substitution strips a closing paren, a format artefact of the script syntax |

No game constants in this file. The only number that matters is the range, which is inclusive at both ends.

## 4. TypeScript sketch

simplified: the sketch keeps the three steps (expand ranges into explicit ids, diff against what the table holds, fail on any gap). It omits parsing the script text, the version-control lookup, the external tool, the variable-to-table map and its declaration-order rule, the quoting of ids, and the per-table "not found" message. It takes range bounds as numbers, so it does not carry the one-digit limit (line 103). An absent table counts as holding nothing. It fails by throwing, where the donor only prints.

```ts
// Licence: restricted (donor is proprietary, no licence). Clean-room sketch written from the described mechanism, not a translation of the donor.
// clean-room
// A dialogue reference is either one line id, or a prefix with an inclusive numbered range (prefix1..prefixN).
type LineRef =
  | { kind: "single"; tag: string }
  | { kind: "range"; prefix: string; from: number; to: number };

interface DialogueRef {
  stringFile: string; // the string table that must hold the lines
  ref: LineRef;
}

// Step 1: expand every reference into the explicit set of line ids each table must contain.
function requiredLines(refs: DialogueRef[]): Map<string, Set<string>> {
  const required = new Map<string, Set<string>>();
  for (const r of refs) {
    let ids = required.get(r.stringFile);
    if (!ids) {
      ids = new Set<string>();
      required.set(r.stringFile, ids);
    }
    if (r.ref.kind === "single") {
      ids.add(r.ref.tag);
    } else {
      // Bounds are plain numbers here, so 10 and up expand correctly.
      for (let n = r.ref.from; n <= r.ref.to; n++) ids.add(`${r.ref.prefix}${n}`);
    }
  }
  return required;
}

// Step 2: diff required ids against the ids a table really holds. A table that is absent counts as empty.
function missingLines(
  required: Map<string, Set<string>>,
  tables: Map<string, Set<string>>,
): Map<string, string[]> {
  const report = new Map<string, string[]>();
  for (const [file, ids] of required) {
    const have = tables.get(file) ?? new Set<string>();
    const missing = [...ids].filter((id) => !have.has(id));
    report.set(file, missing);
  }
  return report;
}

// Step 3: the caller decides what to do with the report. Here: fail when anything is missing.
function assertDialogueComplete(report: Map<string, string[]>): void {
  const problems: string[] = [];
  for (const [file, missing] of report) {
    if (missing.length > 0) problems.push(`${file}: ${missing.join(", ")}`);
  }
  if (problems.length > 0) throw new Error(`missing dialogue lines\n${problems.join("\n")}`);
}

export {};
```

## 5. Lands in

- TARGET `origins/content/dialogue-refs.ts` (proposed new module; the path was not checked against the Frankendom tree). It runs as a server test over zone data, so the line references live in zone data (zones as data) and there is no second dialogue runtime. Parity-checklist row 20 (catalogue as runtime source): every line a zone's NPCs can speak must resolve in the locale table before the zone ships.
- Dialogue text is client text, so this guards content. It decides no kill, quest outcome or loot; server-verified kills are unaffected.
- Reuse tag: rewrite-from-idea (restricted; clean-room only)
- Brief rule served: zones as data; one engine (the check is a test over zone data, not a second dialogue system)

## 6. Gaps and risks

- Licence: none stated, and the donor's restricted note says proprietary. Clean-room only. The sketch uses no donor code, constants or identifiers; the note names none.
- This is a content lint, not a dialogue runtime. The runtime is not in this copy (src, dsrc and serverdata are empty submodules). Whether the game picks a random variant from a range is inferred from the reference form only (not read).
- Donor bug to avoid: one-digit range bounds (line 103), confirmed on the VPS. Ranges of 10 or more would expand wrong in the donor.
- Declaration order: a reference read before its table's declaration is keyed to an undefined table name (lines 94 and 101, one pass; not run). Frankendom's version should collect declarations in a first pass.
- The donor only prints. Frankendom's version must fail the server test (see acceptance).
- Quest state gating (what a quest state changes) is not in this donor (not read), so this note does not cover it.

Best transferable idea: before a zone ships, expand each ranged bark or dialogue reference into explicit line ids and fail the test if any id is missing from the locale table.
Decision (proposed): adapt — take the expand-and-diff check as a zone-data test; reject the version-control lookup and the Windows tooling, which do not fit Frankendom.
Acceptance: a server test loads every zone's NPC line sets; a reference "bark_guard_1..4" with bark_guard_4 missing from the locale table fails the test and names bark_guard_4.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** None found. ScanScript.pl lines 23-28 usage, 30-78 testfile (p4 fstat 42, WordCountTool 55-60, diff 62-72, None missing 74), 84 usage guard, 92-122 parser (94 declaration, 96 reference, 101 keying, 103 range regex with (\d)+ capturing only the last digit so 12 -> 2, 109 inclusive loop, 118 paren strip), 126-134 print, 138-141 driver all match. _RESTRICTED-NOTE.txt text matches the licence line; src/dsrc empty. Sketch is honest about not carrying the one-digit bug.

**Missed:** Minor: testfile converts dots in the table name to slashes before the p4 lookup (38), and the reference is 'prefix' + rand(a,b) in the script syntax, which the note summarises as a range.
