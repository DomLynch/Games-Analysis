# YarnSpinnerTool-YarnSpinner (asset audit, AU060)

Donor: /mnt/frankendom-donors/YarnSpinnerTool-YarnSpinner/
Code licence: MIT (LICENSE.md line 1; csproj PackageLicenseExpression MIT).
Asset licence: none separate. Treated as unclear, class C.
Rights holder: original company (README Credits: Yarn Spinner Pty. Ltd.). Repo files only.
Best class: C.

## Half read
- Read: the compiler / tool half (YarnSpinner.Compiler, the spec, the Tests dialogue scripts).
- Not in the box: the runtime half. README line 26 names "Yarn Spinner for Unity" as a separate official package. No Yarn runtime folder exists under /mnt/frankendom-donors. inkjs is another narrative tool in the box, not in this batch, not read.

## Licence, plainly
- LICENSE.md says MIT for the software. The csproj files say MIT too.
- No licence line covers Documentation/ or Tests/. The logo is credited to Cecile Richard (README line 40) with no licence line. Unclear, so class C.

## Asset inventory (non-code only)
| Group | Path | Count | Class |
|---|---|---|---|
| Dialogue test scripts | Tests/TestCases/*.yarn, Tests/*.yarn | 85 .yarn repo-wide; Tests/ has 123 files | C |
| Logos and sponsor marks (PNG) | Documentation/*.png | 4 | C |
| Syntax diagrams (SVG) | Documentation/railroads/*.svg | 27 | C |
| Language spec (prose) | Documentation/Yarn-Spec.md | 992 lines | C |

No maps, no models, no audio, no fonts, no game data. Filler text in Tests/TestCases/Duplicates/lipsum*.yarn is Lorem Ipsum placeholder.

## Data first
- Line IDs and the string table are built by the compiler, not stored as a CSV. The generator keys lines by a line-ID hashtag and records shadow IDs (YarnSpinner.Compiler/Visitors/StringTableGeneratorVisitor.cs lines 111, 151, 154).
- The spec (Documentation/Yarn-Spec.md) is the rules table: flow control, options, commands, expressions. Read in part.

## Inspiration (category level, class C)
- Dialogue as a plain line-based script with options and commands in one file. Keep the structure, write our own syntax.
- Once-only and visited gates: an NPC branch that changes after first play (Tests/TestCases/Once.yarn). Recreate as a flag on our character ledger.
- Conditional options that show or hide by state, and options that vanish after one use.
- Derived variables that re-evaluate from other state (Tests/TestCases/SmartVariables.yarn line 9).
- Shadow line IDs: one canonical line plus a keyed variant (Tests/TestCases/ShadowLines.yarn line 8). A clean localisation pattern.
- Line groups: first-meeting and later lines chosen by state (Tests/TestCases/LineGroups.yarn).
- Per-rule syntax diagrams (Documentation/railroads/). Model for a writer-facing rules page we draw ourselves.

## Briefs (dialogue mechanisms; this donor has no creatures, items or zones)
Dom's rule applies to every brief: recreate as a clearly distinct original, never a copy.

1. **Remembering greeter** (first-visit line, later-visit line). Keep: a first-time line and a later branch on one node, one stored flag. Change: gate on the duel record, not a plain visit; give the later line its own voice and portrait tint; store the flag on our ledger. Ref: Tests/TestCases/Once.yarn, Tests/TestCases/LineGroups.yarn.
2. **Gated choice list** (options appear only when state allows). Keep: a conditional option that is used once and then vanishes. Change: show a locked row with a short reason and our own lock icon instead of hiding it. Ref: Tests/TestCases/Once.yarn (option lines).
3. **Shadow-keyed variant line**. Keep: a second entry with no text of its own that points at a key. Change: plain keys of our own; no tag syntax copied. Ref: Tests/TestCases/ShadowLines.yarn; StringTableGeneratorVisitor.cs lines 147-151.

## Cross-links
- Stories, factions and lore premises: the dialogue format is the candidate (no lore text is in the donor itself).
- HUD-UI: option rows and locked-option feel are a UI question; no assets in the donor.
- Progression: once-only gates and visit tracking are a memory mechanic for quests and NPC reactions.
- Sound, camera, zones, spawns, loot, VFX, animation: nothing in this donor.

## Not verified
- Runtime (Unity) half: absent from the box.
- Logo pixel sizes, SVG contents, most .yarn test files, the spec beyond lines 1-25, 69-80, 590-600 and the heading list, docs_overrides, .github, .vscode.
- No licence text in any asset file was found beyond the repo LICENSE.md.
