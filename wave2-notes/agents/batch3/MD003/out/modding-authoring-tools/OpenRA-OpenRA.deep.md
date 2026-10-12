# OpenRA-OpenRA (modding-authoring-tools, cell 3)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/MiniYaml.cs` (merge and inheritance, lines 408-700), with `OpenRA.Game/Exts.cs` (duplicate-key helper, 414-463), `OpenRA.Game/Scripting/ScriptContext.cs` (Lua user-script sandbox), `OpenRA.Mods.Common/UtilityCommands/CheckYaml.cs` (content lint), `OpenRA.Mods.Common/Traits/World/EditorActorLayer.cs` (in-game map editor layer), `OpenRA.Game/Map/MapPreview.cs` (map classes) | Licence: GPL-3.0 (`COPYING` is GPL v3; source headers say "either version 3 of the License, or (at your option) any later version") | C# and YAML | symbol `MiniYaml.Merge`

Checked: camera_scope not applicable. Read in full: MiniYaml.cs 404-600 and 597-700 (merge, inherits, removals, layer merge, load); Exts.cs 414-463 (duplicate-key helper); ScriptContext.cs 115-240 (sandbox setup and limits). Read in part: CheckYaml.cs 21-140 (checks and the map loop), EditorActorLayer.cs (method list and 157-160, 239-290, 468-475 only), MapPreview.cs 31-42. Not read: the body of `EditorActorLayer` binning (the `BinSize` field at line 32 is named, its use was not read), the Lua runtime class `MemoryConstrainedLuaRuntime` (not in this repo: grep found it only as a use in ScriptContext.cs), the instruction-cap enforcement (grep for `MaxUserScriptInstructions` over `.cs` and `.lua` found only the declaration at 125 and the global set at 191; the enforcement point was not found), the order in which `Load` gets its file list, and the map package reader. Confidence: high on the YAML merge and removal rules (read end to end, with the conflict helper); high on the sandbox allowlist; medium on the editor (method list only).

Best transferable idea: A mod unit is a short row that says which base it inherits, changes only the keys it names, and removes a named key with a minus prefix, with a missing parent, a repeated parent, a self-inherit, or a removal that matches nothing all failing the load with the file and line.

Decision (proposed): adapt - take the inherits-and-minus-removal format for our legend and zone rows, because it is the cheapest way for Dom or a designer to write "this boss is the base legend with two changes"; keep the donor's errors (a removal with no match, a repeated parent, a self-inherit, a missing parent); add what the donor lacks, a warning when a patch overwrites a stat value; a layer must never write a reward count (the one-ledger rule); reject the Lua scripting sandbox for player or designer content (our rows stay data-only; no script field).

Acceptance: a server test loads a base legend row set, then a legend row with `Inherits: legend_base` and `-Ability@bleed` (each ability is its own key, e.g. `Ability@bleed: bleed`, because a `-Key` removes every row with that key and ignores the value, MiniYaml.cs 491-492, and same-key rows in one set merge into one) and asserts the ability rows equal the base rows without the bleed row; a row that inherits the same parent twice, or removes a key the parent lacks, fails the load and the error names the file and line (the sketch's `loc` field carries `file:line`); a top-level `-legend_base` row removes the whole base block from the result.

## 1. Mechanism

- Each top-level entry is a named block (a unit, a building, a map rule). Blocks come from all data files in order, and map rules are appended last (MiniYaml.cs 684-695).
- Per file, a row is either a plain key, an `Inherits: Parent` or `Inherits@name: Parent` link, or a `-Key` removal (MiniYaml.cs 470-493).
- Layer merge (files in order, then map rules): a row whose key is new is appended. A row whose key already exists merges into the earlier row, child rows merged recursively; the exception is a `-Key` removal that sits between them, in which case the new row is appended so the earlier row applies, is removed, and the new row applies (MiniYaml.cs 597-651; the removal rule is at 633; the in-place merge at 646). Removal rows are kept in the list for resolution.
- Within a single file, rows with the same key are merged first (MiniYaml.cs 507-531). A duplicate that survives into one set is an error, and the helper names every key that is repeated (Exts.cs 414-463). The conflict check treats `-Key` rows as weak, so a removal then a re-add in one file is not a duplicate (MiniYaml.cs 533-565; the comment at 553).
- Resolution per entry (MiniYaml.cs 421-434; the loop starts at 423): the entry starts with its own name in the inherited set, so a self-inherit is an error (426). Each `Inherits` copies the parent's resolved rows into the entry, in order, merging same-key rows (MiniYaml.cs 470-489; 437-458). The same parent cannot be inherited twice in one tree (483). A `-Key` removes every earlier row with that key; zero matches is an error (489-493).
- Load order: the data files list is passed in (MiniYaml.cs 684-695). The order was not read.
- Sandbox for Lua user scripts: the script runtime is created; then every global not in an allowlist is set to null (ScriptContext.cs 161-172). The allowlist is ipairs, next, pairs, pcall, select, tonumber, tostring, type, unpack, xpcall, math, string, table (163-169, the list as written). `math.random` and `math.randomseed` are nulled because random is "not desync safe" (174-183). Memory cap 50 MB for user scripts, applied after system functions are registered (122; 215). An instruction cap of 1,000,000 per map-function call is declared (125) and passed to scripts as a global (191); its enforcement point was not found.
- Lint: `--check-yaml` loads the mod and the maps, reports missing types and unknown fields as errors, and runs custom rule passes (CheckYaml.cs 66-75, 107-125). With `TREAT_WARNINGS_AS_ERRORS=true`, warnings are errors (66).
- In-game editor: an actor layer keeps a list of placed previews, with spatial lookups by cell and by screen box, and saves them back as MiniYaml rows (EditorActorLayer.cs 32; 157; 239-290; 468). Moving an actor is remove then add (288-290).
- Map classes: Unknown, System, User, Remote, Generated (MapPreview.cs 35-42; User at 39).
- Tick: none in the merge. Merge and resolution run at load. The script context looks up a Lua `Tick` global once, in its constructor (ScriptContext.cs 228), and calls it from `Tick()` (296-304). That call path was read only as far as line 304; the rest of `Tick()` was not read.

## 2. Key functions

- `MiniYaml.Merge` (408-434): per-entry merge, per-entry resolution, then top-level resolution.
- `MiniYaml.ResolveInherits` (459-505): the link, the copy-in, the removal.
- `MiniYaml.MergeIntoResolved` (437-458): same-key merge into the resolved list.
- `MiniYaml.MergeSelfPartial` (507-531) and `MiniYaml.WeakResolveRemovals` (533-565): same-file merge and the weak conflict check.
- `MiniYaml.MergePartial` (597-651): the layer merge with the closer-removal rule.
- `MiniYaml.Load` (684-697): files then map rules.
- `ScriptContext` constructor (141-240, read to 240): allowlist, math nulls, limits, system globals.
- `CheckYaml.Run` (62-140): the lint pass over rules, sequences and maps.

## 3. Numbers vs mechanism

| Mechanism | Rule or formula | Number or constant | file:line |
|---|---|---|---|
| Parent link | a parent may be linked once per tree; a second link is an error | 1 per parent per tree | MiniYaml.cs 470-483 |
| Self link | the entry starts with its own name as inherited | 1 (its own name) | MiniYaml.cs 426 |
| Removal | `-Key` removes all earlier rows of that key; zero matches is an error | all matches; error at 0 | MiniYaml.cs 489-493 |
| Layer removal then re-add | a new row after a removal is appended, not merged | rule at closer-removal test | MiniYaml.cs 633-646 |
| Same-key merge | the new row merges into the earlier one, children merged recursively | in place | MiniYaml.cs 646 |
| Map rules | appended after every data file | last | MiniYaml.cs 695 |
| Script memory cap | user scripts | 50 MB (52,428,800 bytes) | ScriptContext.cs 122, 215 |
| Script instruction cap | per map-function call; declared, enforcement not found | 1,000,000 | ScriptContext.cs 125, 191 |
| Script globals | allowlist: 10 base functions and 3 libraries (math, string, table) | 13 names | ScriptContext.cs 163-169 |
| Editor bin | the layer's bin size field | 250 (use not read) | EditorActorLayer.cs 32 |
| Map classes | enum values | 5 values, User = 2 | MapPreview.cs 35-42 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor rule set: a same-key row in a later layer merges into the earlier one unless a removal of that key sits between them (then it is appended); resolution follows the parent link and applies removals in order; a repeated parent, a self-inherit, a missing parent and a removal with no match are errors. It omits the conflict-log duplicate check (Exts.cs 414-463), the `Inherits@name` suffix (treated as a plain link here), the map-rules append in Load (684-695), the string pool and the comments. It reorders nothing else. Errors now carry a `loc` (file:line) string that the loader fills in from the source file; the sketch does not parse files. Top-level whole-block removal (donor 431-433) is not coded; see Also found.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// One YAML-like row: a key, an optional value, and child rows.
interface Node {
  key: string;
  value?: string;
  children: Node[];
  loc?: string; // "file:line", carried into every error message (donor prints n.Location)
}

type Tree = Map<string, Node[]>;

const isRemoval = (n: Node): boolean => n.key.startsWith("-");

function lastIndexOfKey(nodes: Node[], key: string): number {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i].key === key) return i;
  }
  return -1;
}

// Merge two row lists from different files. A row with a new key is appended. A row whose key
// already exists merges into the earlier row, unless a "-key" removal sits after that earlier row;
// then the new row is appended, so the earlier row applies, is removed, and the new row applies.
// Removal rows are kept for resolution (donor: MiniYaml.cs MergePartial 597-651).
function mergeLayer(existing: Node[], override: Node[]): Node[] {
  const ret: Node[] = [];
  for (const n of [...existing, ...override]) {
    if (isRemoval(n)) {
      ret.push(n);
      continue;
    }
    const prev = lastIndexOfKey(ret, n.key);
    const removal = lastIndexOfKey(ret, "-" + n.key);
    if (prev === -1 || removal > prev) {
      ret.push(n);
      continue;
    }
    const old = ret[prev];
    ret[prev] = { key: n.key, value: n.value ?? old.value, children: mergeLayer(old.children, n.children) };
  }
  return ret;
}

// Put one already-resolved row into the resolved list (donor: MergeIntoResolved 437-458).
function mergeInto(resolved: Node[], n: Node, tree: Tree, inherited: Set<string>): void {
  const idx = resolved.findIndex((r) => r.key === n.key);
  if (idx === -1) {
    resolved.push({ ...n, children: resolveNodes(n.children, tree, new Set(inherited)) });
    return;
  }
  const old = resolved[idx];
  const children = resolveNodes(mergeLayer(old.children, n.children), tree, new Set(inherited));
  resolved[idx] = { key: n.key, value: n.value ?? old.value, children };
}

// Resolve parent links and removals for one list of rows (donor: ResolveInherits 459-505).
// A parent may be linked once per tree; a missing parent, a repeated parent, or a removal with
// nothing to remove is an error (the donor throws on each of these).
const at = (n: Node): string => n.loc ?? "unknown";

function resolveNodes(nodes: Node[], tree: Tree, inherited: Set<string>): Node[] {
  const resolved: Node[] = [];
  for (const n of nodes) {
    if (n.key === "Inherits" || n.key.startsWith("Inherits@")) {
      const parentName = n.value ?? "";
      const parent = tree.get(parentName);
      if (parent === undefined) throw new Error(`${at(n)}: Parent type ${parentName} not found`);
      if (inherited.has(parentName)) throw new Error(`${at(n)}: Parent type ${parentName} was already inherited`);
      inherited.add(parentName);
      for (const r of resolveNodes(parent, tree, new Set(inherited))) mergeInto(resolved, r, tree, inherited);
    } else if (isRemoval(n)) {
      const removed = n.key.slice(1);
      const kept = resolved.filter((r) => r.key !== removed);
      if (kept.length === resolved.length) throw new Error(`${at(n)}: There are no elements with key ${removed} to remove`);
      resolved.splice(0, resolved.length, ...kept);
    } else {
      mergeInto(resolved, n, tree, inherited);
    }
  }
  return resolved;
}

// Resolve every top-level entry. Each entry starts with its own name in the inherited set,
// so an entry that inherits itself is an error (donor: MiniYaml.cs 426-428).
function resolveAll(tree: Tree): Map<string, Node[]> {
  const out = new Map<string, Node[]>();
  for (const [name, nodes] of tree) {
    out.set(name, resolveNodes(nodes, tree, new Set([name])));
  }
  return out;
}
```

## 5. Lands in

- TARGET `origins/catalogue/merge.ts` (new, proposed; the Frankendom repo was not opened for this note): the server-side load step that resolves legend and zone rows (Inherits, minus removals, same-key merge) into the frozen catalogue, with a file-and-line error on any failure. Parity-checklist row 20 (catalogue as runtime source).
- today: (not read) the Frankendom legend and zone loaders.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (a variant is a row that inherits, never a copied block); server-verified (every failure stops the load)

## 6. Gaps and risks

- Also found: the donor also resolves top-level removals (MiniYaml.cs 431-433), so `-LegendName` at the top level removes a whole base block from the final result; useful for a zone row that drops a base legend. Not in the sketch.
- The donor's error text names the file and line through `n.Location` (MiniYaml.cs 474, 483, 493). The sketch now carries `loc` into each error; Frankendom's loader must fill it, because a designer will fix a row from the message.
- The `Inherits` rule copies a parent's whole block, so a change to the base legend changes every child that did not override it. That is the point of the format, but a stat change to a base legend will move every zone variant. Frankendom needs a test that lists the children of a base before a base change ships.
- Same-key merge is recursive and silent for values: a later file that writes a value for an existing key replaces it (`n.value ?? old.value`, the sketch; donor MergePartial returns the override's value when present, MiniYaml.cs 594). The donor does not warn. Frankendom must warn when a patch overwrites a stat.
- Lua sandbox: an allowlist with nulls for every other global, and no `math.random` (ScriptContext.cs 161-180). The idea is good, but scripting is out for our rows (data-only). Reject for now.
- The instruction cap (125) and memory cap (122) are declared but their enforcement is not in this repo. Do not cite the cap as a tested limit.
- The editor writes MiniYaml back (EditorActorLayer.cs 468). Frankendom has no in-game map editor; the designer path is the row file and the lint (CheckYaml). If a phone-side editor ever exists, it must write rows through the same merge and lint, not a side file.
- CheckYaml loads every map and mod in one run (CheckYaml.cs 107-125). That is the CI shape we want for legend and zone rows: one command loads everything and fails on the first bad row. The exact checks beyond missing types, unknown fields and map load were not read (rules passes not read).
- The `Inherits@name` link (MiniYaml.cs 470) allows several named parents. The sketch treats it as a plain link. Frankendom should allow one parent first; add named parents only with a test.
- No publishing, rating or upload code was found in `OpenRA.Game` or `OpenRA.Mods.Common` (grep for `upload` empty). Strategy's MD questions on who may publish and on rating are not answered by this donor.
- Licence: GPL-3.0; clean-room only. The sketch is written from the described rules.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified: Merge 408-435 (self-name in inherited 426, top-level removals 431-433), MergeIntoResolved 437-458, ResolveInherits 459-501 (errors 474/483/493, Location in messages), MergeSelfPartial 507-531, weak removal 533-565, layer MergePartial closer-removal 633-646, value override 594, Load 684-697 (map rules appended last), Lua allowlist 163-169 (13 names), math.random/randomseed nulled, 50 MB at 122/215, 1,000,000 at 125/191, MapClassification User=2, BinSize 250 at 32, GPL v3. Acceptance flaw: 'Inherits: legend_base and -Ability: bleed ... ability list equals base list without bleed'. In OpenRA a '-Key' removes every row with that KEY and the value is ignored (MiniYaml.cs 491-492); same-key rows in one set are merged into one (MergeSelfPartial 519-527), so a list of repeated 'Ability: x' rows cannot exist. A correct build removes the whole Ability row, not only 'bleed', so this test would fail or be meaningless; the row format needs 'Ability' as a parent with child rows (remove the child key) or a distinct key per ability. The sketch also drops file-and-line from errors although Acceptance demands the error name file and line (disclosed in section 4 but the sketch cannot meet its own Acceptance). Minor: 'Inherits@name' shared mutable Set in sketch is equivalent. 
Missed: Top-level whole-block removal (431-433) only appears in the key-functions list, not as a rule for Frankendom (-LegendName removes a base block).

Fixed 2026-10-12 (Sonnet fixer): verified '-Key' removes by key only (MiniYaml.cs 486-493); acceptance rewritten to use one key per ability (`-Ability@bleed`) so a correct build passes; sketch errors now carry file:line via a loc field so the acceptance on file and line is satisfiable; top-level whole-block removal added as Also found. Retypechecked.
