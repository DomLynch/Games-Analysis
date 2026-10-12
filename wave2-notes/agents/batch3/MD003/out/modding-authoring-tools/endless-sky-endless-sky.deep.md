# endless-sky-endless-sky (modding-authoring-tools, cell 1)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/PluginManager.cpp` (with Plugin.cpp, GameData.cpp, UniverseObjects.cpp, DataFile.cpp, Fleet.cpp, Government.cpp, Planet.cpp, PlayerInfo.cpp, and `utils/check_content_style.py` + `utils/contentStyle.json`) | Licence: GPL-3.0-or-later (`license.txt` is GPL v3; source headers say "version 3 of the License, or (at your option) any later version"; `copyright` file says GPL-3+) | C++ and Python | symbol `PluginManager::Load`

Checked: camera_scope not applicable. Read in full: PluginManager.cpp, Plugin.cpp, PluginManager.h, DataFile.cpp (240 lines), Fleet.cpp 145-180, Government.cpp 155-265 (override block), Planet.cpp 66-135 (165-175 only around line 171), UniverseObjects.cpp 40-68 and 224-340 (to 340 only). Read in part: DataNode.cpp 121-150 and 330-368; GameData.cpp 95-135 and 920-950; PlayerInfo.cpp 4650-4662 and 5366-5380; check_content_style.py 1-40, 185-300, 341-526 (copyright body 220-250); contentStyle.json 1-40 and 118-171. Not read: `UniverseObjects::LoadFile` (per-class dispatch), the rest of Set.h, Mission and MissionAction, the copyright regex list beyond the holder and notice text, `tests/`. Locator searches (grep on the VPS): `requires`/`conflicts` used only in Plugin.cpp and PluginManager.cpp; no `lua`, `javascript`, `dlopen` in `source/` except OS window code; no in-game editor or builder (grep `editor|builder` empty); `upload|publish|rating` hits were unrelated (not read). Confidence: high on the plugin loader, the row format and the override rules (read end to end); medium on final load precedence, which is inferred from the override sets and the load loop, and the loop contradicts its own comment (see 6).

Best transferable idea: Content packs are rows applied in a fixed source order with explicit `add`, `remove` and overwrite keywords, and a bad variant is dropped alone (its lost weight logged) instead of disabling the whole fleet.

Decision (proposed): adapt - take the add/remove patch rule and the drop-only-the-bad-variant rule for our row catalogue, so a zone or legend patch extends a stock list without copying it; reject the player-facing plugin folder for now (Dom only until beta, per the MD addendum) and reject the lenient number parse (a bad number in a server row must fail the load, not become 0).

Acceptance: a server test loads the stock zone rows plus one patch file containing `add spawn ...` and `remove legend ...`, and asserts the result equals stock with the patch applied; a patch with a non-number fails the load and names the file and line; a fleet with one invalid variant loads with that variant dropped and the lost weight written to the log.

## 1. Mechanism

- A plugin is a folder (or a `.zip`) in the player's plugins folder. It holds `plugin.txt` (metadata) and any of `data/`, `images/`, `sounds/`, `shaders/` (PluginManager.cpp 187-188; GameData.cpp 929-945). Nothing in a plugin runs as code. The donor has no scripting engine (see Checked), so the row format is the whole plugin API.
- Enable state: a `state` list in `plugins.txt` (global, then local) is read at start (PluginManager.cpp 154-160). Preferences flips a pending flag (217), and the change applies at the next start (PluginManager.h 46). Only enabled plugin folders go into the load sources (GameData.cpp 115-116).
- Load order (the order of steps as the code runs):
  1. Stock resources are the first source (GameData.cpp 925).
  2. Then global plugin folders, then global zips; then user plugin folders, then user zips (GameData.cpp 924-950).
  3. `UniverseObjects::Load` walks the sources in list order (UniverseObjects.cpp 51). Each source's `data/` tree is listed and sorted by path string (Files.cpp 343). Every file is then loaded in that order (UniverseObjects.cpp 66).
- Row format: `DataFile` turns indentation into a tree. A stack of parent nodes (DataFile.cpp 105) is popped until the parent is shallower than the new line (160). Quoted tokens use `"` or a backtick. An unclosed quote and mixed whitespace are warnings, not failures (207, 238). `#` starts a comment.
- Patch rows inside each class loader (Government, Planet): a child row is `add <key> <value>` (append), `remove <key>` (clear the key), `remove <key> <value>` (drop one value), or a plain `<key> <value>`. A plain row for a key in the class's overwrite set clears the old list at the first plain row for that key in the node, then removes the key from the set, so later rows in the same node append (Planet.cpp 69, 96, 171; Government.cpp 160, 182, 261). Other plain keys always append.
- Plugin metadata: `plugin.txt` may declare game version, `requires`, `optional`, `conflicts`, tags, authors, version, about text (PluginManager.cpp 67-109). A plugin is refused only if its own `required` and `conflicts` lists overlap (PluginManager.cpp 126; Plugin.cpp 62-69, 81-88). Two plugins with the same plugin name (the folder name unless `plugin.txt` sets `name`): the first loaded wins, the second is skipped (PluginManager.cpp 112-122).
- Reference check after load: `CheckReferences` warns that an undefined object "is referred to, but not fully defined" (UniverseObjects.cpp 229). For some classes it also names the placeholder so a save can write it (244). The game keeps running.
- Fleet variant prune: invalid variants are erased; the log reports the count and the weight lost (UniverseObjects.cpp 283-284; Fleet.cpp 170, 176). A fleet is invalid if any of its variants is invalid (Fleet.cpp 158-161); the load prunes first (UniverseObjects.cpp 283) and only then checks validity (284), warning only if the fleet is still invalid after the prune.
- Bad numbers: a non-numeric value is logged and read as 0 (DataNode.cpp 127, 142).
- Runtime gate: the condition `installed plugin: NAME` is true only if that plugin is valid and enabled (PlayerInfo.cpp 4657-4659). A save lists the installed, enabled plugins "for debugging" (PlayerInfo.cpp 5372-5376).
- Offline checker: `utils/check_content_style.py` runs over `data/**` (contentStyle.json 2). It checks LF endings and a trailing blank line; a copyright header (the first lines must match the holder pattern, then the GPL notice block must match exactly; otherwise error at line 1, check_content_style.py 248); tab indentation with at most one level deeper per child (contentStyle.json 4-5; check_content_style.py 293, 297); and regex style rules (double spaces, non-ASCII characters, comment spacing). Default mode only reports; `--auto-correct` is opt-in (check_content_style.py 109-110).
- Tick: none. This is an authoring and load-time mechanism. Nothing runs per frame.

## 2. Key functions

- `PluginManager::Load` (PluginManager.cpp 53-150): reads `plugin.txt`, applies the name and duplicate rules, refuses self-contradictory dependencies, copies the metadata into the `Plugin`.
- `GameData::LoadSources` (GameData.cpp 924-950): builds the source list in the fixed order above; only enabled plugins are added to `sources` (GameData.cpp 115-116).
- `UniverseObjects::Load` (UniverseObjects.cpp 40-73): the loop over sources, then over files, one `LoadFile` per data file.
- `UniverseObjects::CheckReferences` (UniverseObjects.cpp 224-340; read to 340): names and warns for undefined objects; prunes invalid fleet variants (283-284).
- `DataFile::LoadData` (DataFile.cpp 100-240): the indentation parser.
- `Government` and `Planet` loaders: the override blocks (Government.cpp 155-265; Planet.cpp 66-175).
- `Fleet::RemoveInvalidVariants` (Fleet.cpp 167-178) and `Fleet::IsValid` (Fleet.cpp 145-163).

## 3. Numbers vs mechanism

| Mechanism | Rule or formula | Number or constant | file:line |
|---|---|---|---|
| Planet overwrite set | first plain row for a listed key clears it; the key then leaves the set | 5 keys: attributes, description, spaceport, port, landscape | Planet.cpp 69, 96, 171 |
| Government overwrite set | same rule | 1 key: raid | Government.cpp 160, 182, 261 |
| Patch keywords | add = append; remove key = clear; remove key value = drop that value | 2 keywords (add, remove); `<key> clear` is the deprecated form of remove key | Planet.cpp 74-75, 91-93 |
| Row indent step | a child is at most 1 level deeper than its parent | max step 1 | contentStyle.json 5; check_content_style.py 293 |
| Source order | stock, global folders, global zips, user folders, user zips | 5 stages | GameData.cpp 924-950 |
| Within-source order | files sorted by path string, each file loaded in turn | sort, no weights | Files.cpp 343; UniverseObjects.cpp 66 |
| Duplicate plugin | first loaded wins | 1 winner per name | PluginManager.cpp 117-122 |
| Fleet validity | invalid if any variant is invalid (checked after the prune, so only a fleet left with no usable variant warns) | any-of | Fleet.cpp 158-161; UniverseObjects.cpp 283-284 |
| Fleet prune | keep valid variants; lost weight = total weight - kept weight | formula; logged | Fleet.cpp 167-177 |
| Bad number | logged; value 0 | 0 | DataNode.cpp 127, 142 |
| Installed-plugin condition | true iff plugin is valid and enabled | boolean | PlayerInfo.cpp 4658-4659 |
| Copyright header | holder line pattern, then the exact GPL notice block; else error at line 1 | notice block from contentStyle.json (not counted) | check_content_style.py 220-248; contentStyle.json 9 |
| Auto-correct | off by default; opt-in | off | check_content_style.py 109-110 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: rows applied in file order, overwrite keys cleared once per entry, and the variant prune with its lost-weight figure. It omits the `clear` alias, the port/spaceport cross-erase (Planet.cpp 115-116), the per-class overwrite lists beyond one set, the save and trace printing, and the donor's exact `remove <key> <value>` duplicate handling (not read). It differs from the donor in one place on purpose: `parseNumberStrict` throws on a bad number instead of returning 0, which is our ruling (the donor returns 0 with a warning, DataNode.cpp 127, 142).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// One authored line in a content file: a plain row, an "add" row, or a "remove" row.
type Row = { op: "set" | "add" | "remove"; key: string; values: string[] };

// One catalogue entry (a planet, a government, a fleet) as the loader currently holds it.
interface Entry {
  fields: Map<string, string[]>;
}

function pushValues(e: Entry, key: string, values: string[]): void {
  const cur = e.fields.get(key) ?? [];
  e.fields.set(key, [...cur, ...values]);
}

// Apply one content file's rows to an existing entry. Overwrite keys are cleared by the
// FIRST plain row for that key in this file; after that they append (the donor drops the
// key from its local overwrite set). "add" always appends; "remove" with no values clears
// the key, "remove" with values drops those values only.
function applyRows(e: Entry, rows: Row[], overwriteKeys: Set<string>): void {
  const pending = new Set(overwriteKeys);
  for (const r of rows) {
    if (r.op === "add") {
      pushValues(e, r.key, r.values);
      continue;
    }
    if (r.op === "remove") {
      if (r.values.length === 0) {
        e.fields.delete(r.key);
      } else {
        const cur = e.fields.get(r.key) ?? [];
        e.fields.set(r.key, cur.filter((v) => !r.values.includes(v)));
      }
      continue;
    }
    if (pending.has(r.key)) {
      e.fields.delete(r.key);
      pending.delete(r.key);
    }
    pushValues(e, r.key, r.values);
  }
}

// A fleet keeps its valid variants. Invalid variants are dropped and the lost weight is
// reported, instead of disabling the whole fleet (donor: Fleet.cpp 167-178).
interface Variant {
  weight: number;
  valid: boolean;
}

function pruneVariants(variants: Variant[]): { kept: Variant[]; dropped: number; lostWeight: number } {
  const kept = variants.filter((v) => v.valid);
  const total = variants.reduce((s, v) => s + v.weight, 0);
  const keptWeight = kept.reduce((s, v) => s + v.weight, 0);
  return { kept, dropped: variants.length - kept.length, lostWeight: total - keptWeight };
}

// A name that is referenced but never defined is reported and the load goes on (donor:
// UniverseObjects.cpp 229 warns; the placeholder is named so saves can still write it).
function unresolvedNames(referenced: string[], defined: Set<string>): string[] {
  return [...new Set(referenced)].filter((n) => !defined.has(n));
}

// Frankendom side: a bad number in a server-loaded row is a load error, not 0.
// (Donor: DataNode.cpp 137-143 logs and returns 0.)
function parseNumberStrict(token: string, where: string): number {
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(token)) {
    throw new Error(`${where}: not a number "${token}"`);
  }
  return Number(token);
}
```

## 5. Lands in

- TARGET `origins/catalogue/patch-rows.ts` (new, proposed; no file of this name exists today, the Frankendom repo was not opened for this note): the row patch step that runs when zone and legend rows are loaded on the server, before the catalogue is frozen. Parity-checklist row 20 (catalogue as runtime source).
- today: (not read) the catalogue loader in the Frankendom repo.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (authoring is rows only, never code); server-verified (the strict number parse in section 4)

## 6. Gaps and risks

- Declared dependencies are not enforced. `requires`, `optional` and `conflicts` are parsed and shown in the description (PluginManager.cpp 86-102; Plugin.cpp 128-152), and the only checks are on the plugin's own lists: `required` against `conflicts` and `optional` against `conflicts` refuse the plugin (Plugin.cpp 62-69, 81-88), while `optional` against `required` only warns (48-58). Grep over `source/` found no code that checks them against the installed set. Frankendom must enforce any dependency it declares, on the server, before the row load.
- Lenient parsing is the wrong default for us. The donor logs a bad number and uses 0 (DataNode.cpp 127, 142). A server row with a wrong number must fail the load. The sketch does this; the donor does not.
- Load precedence is inferred. The comment at UniverseObjects.cpp 53-54 says folders near the start of the path override folders later in it. The loop as written loads sources in order (51, 66), with stock first (GameData.cpp 925), so a later plugin's rows apply after stock. The override sets only make sense if later data is applied last. `LoadFile` was not read, so this is not verified per class. Do not copy the comment; test our precedence on purpose.
- File naming decides order. Files are sorted by path (Files.cpp 343). A patch file's name decides whether it applies before or after another. Frankendom should not rely on names: use an explicit `order` key or a manifest list.
- The overwrite rule is per node and per load: the first plain row clears a listed key, so two patch files that both replace `attributes` on one planet leave the second file's values. Frankendom needs a test for two patches on one entry.
- No player-facing publishing, rating, or in-game builder exists in the donor (grep empty). Strategy's MD asks for an in-browser row editor with schema validation, a preview without release, and a who-may-publish rule. None of that is in this donor; it is not evidence for it.
- Licence of user content: the donor enforces a copyright header on every data file (contentStyle.json 9; check_content_style.py 248). That transfers as "every authored row file names its author and licence". It is a report, not a fix, and it runs on demand, not on upload.
- Sandboxing: the donor's plugins cannot run code, because the format is data only. Our rows must keep that: no expression fields, no eval, no templating that runs code.
- Fleet prune changes spawn odds. The donor logs the lost weight but still loads the fleet without it. Our prune must log the lost weight and refuse the patch if the stock pool would lose all its variants.
- Frankendom's rule on the one ledger means a patch can never write an item count directly. Any grant or removal goes through the ledger, not through the patch.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Fleet prune order is backwards. Note (sec 1 and table): 'A fleet is invalid if any variant is invalid, which is checked before the prune'. Real: UniverseObjects.cpp 283 calls RemoveInvalidVariants() first, then 284 checks IsValid() (warns only if still invalid), so validity is checked AFTER the prune. Everything else sampled held: PluginManager.cpp 53-150 (metadata 67-109, dupe 112-123, deps 126), Save/IsPlugin/Toggle 154-218, GameData 109-116 and 922-945 order, Files.cpp 343 sort, UniverseObjects 51-66, Plugin.cpp 45-97 (required-vs-conflict and optional-vs-conflict refuse, optional-vs-required warns), Planet.cpp 69/96/171 and port/spaceport cross-erase 109-117, Government.cpp 160/182/261, DataNode.cpp 127/142, Fleet.cpp 145-178, PlayerInfo 4657-4659 and 5372-5376, contentStyle.json 2/4-5/9, check_content_style.py 109-110/248/293, GPL header text. Note's own precedence caveat (comment vs loop) is real.
Missed: Planet.cpp 109-118: overwriting port or spaceport also erases the other from the overwrite set (note mentions it only in the omit list, fine). Government.cpp 186-257: 'remove <key>' on an unsupported key prints 'Cannot remove the given key' (line 257), i.e. remove is per-key whitelisted, not generic as the TS sketch's remove implies. Planet/Government clear via 'clear' value (Planet 93) is mentioned.

Also found: `remove <key>` is whitelisted per key in the donor (Government.cpp 186-257; any other key prints a trace 'Cannot "remove" the given key', line 257), not generic as the sketch's `remove` implies; our port should reject a remove on a key it does not list.

Fixed 2026-10-12 (Sonnet fixer): corrected the prune order (prune first at UniverseObjects.cpp 283, validity check after at 284) in section 1 and the table; added the per-key remove whitelist as an Also found line. Verified both against the donor. Sketch left as is (remove-any-key is a deliberate simplification, now flagged).
