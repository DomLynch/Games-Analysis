# 0ad-0ad (modding-authoring-tools, cell 2)

Donor: `/mnt/frankendom-donors/0ad-0ad/source/ps/TemplateLoader.cpp` (layer loading) with `/mnt/frankendom-donors/0ad-0ad/source/simulation2/system/ParamNode.cpp` (`CParamNode::ApplyLayer`), plus `source/ps/Mod.cpp`, `source/ps/ModIo.cpp`, `source/ps/ModInstaller.cpp`, `source/tools/entity/checkrefs.py`, `source/tools/xmlvalidator/validate_grammar.py`; data example `binaries/data/mods/public/simulation/templates/template_unit_siege_tower.xml` | Licence: GPL-2.0-or-later for the code (source headers: "either version 2 of the License, or (at your option) any later version"); `LICENSE.txt` says `binaries/data/` is "GPL version 2 (or later)" and `binaries/data/mods/*/art` and `audio` are CC-BY-SA 3.0 | C++, Python, template XML | symbol `CParamNode::ApplyLayer`

Checked: camera_scope not applicable. Read in full: TemplateLoader.cpp 28-100 (layer load, loop guard, lookup order), ParamNode.cpp 60-250 (`ApplyLayer`, every op; `LoadXML` wrappers 43-59 by grep only), Mod.cpp 140-172 and 284-346 (enable and dependency check), ModIo.cpp 470-500 and 529-600 (verify before install), ModInstaller.cpp 53-136 (install), checkrefs.py 58-125 and 618-660, validate_grammar.py 123-181. Read in part: TemplateLoader.cpp 100-116 (the editor listing filter, lines 96-97 and 115-116 by grep only), ModIo.cpp 139 and 790-850 (signature parse, only in part), Mod.cpp 347-377 (version compare, read by grep). Not read: the mixins and special/filter templates, `ps/XML/RelaxNG.cpp`, the mod.io HTTP layer, the public key source (ModIo.cpp 139 reads it, its origin not followed), the `OsPath` normalisation used for folder names. Counts are grep counts (not read per file): 191 entries at the top of `templates/`, 111 template files use `op="mul"`, 124 use `replace=""`. Confidence: high on the layer and op semantics (read end to end); high on the one-pass dependency check; medium on the mod.io pipeline (caller order read, key source not followed).

Best transferable idea: A content file is a layer over a named parent: it changes only the keys it writes, with `mul`, `add` and `mul_round` operations on the inherited number, so a variant of a stock unit is three or four lines of data and the stock stays the one source of truth.

Decision (proposed): adapt - take the layer-over-parent rule with `op` modifiers for legend and zone variants (a zone boss is a layer over a stock legend that multiplies two numbers); adapt the number type (donor: fixed-point strings for lockstep, Frankendom is server-verified, so use integer basis points and a single rounding rule); reject the publish-to-players signed mod download for now (Dom only until beta), keep its verify-then-install order as the design to copy if user packs ever ship.

Acceptance: a server test loads a legend layer with parent `legend_base` (Health 155) and `Health op="mul_round" 1.2` and asserts Health is 186, and that the same layer with `op="mul"` gives the plain unrounded product (the sketch's `mul` does not round; only `mul_round` does, so a Health layer meant to stay whole uses `mul_round`); a layer whose parent chain loops, or whose parent is missing, fails the load with the file name, and the fight shows the stock legend (no partial variant reaches a player).

## 1. Mechanism

- A template file is a layer. Its root element may name `parent="..."` (TemplateLoader.cpp 75-78). The parent file is loaded and applied first; then this file's children are applied over the result, so values in this file override the parent (TemplateLoader.cpp 81-82; ParamNode.cpp 43-47).
- The file lookup order is `special/filter/<name>.xml`, then `mixins/`, then the templates root (TemplateLoader.cpp 64-68). A `foo|bar` name loads `bar` as the parent of `foo` (TemplateLoader.cpp 50-55).
- Loop guard: depth above 100 logs "Probable infinite inheritance loop" and fails the load (TemplateLoader.cpp 41-43).
- Each child element is one of these, decided by its attributes (ParamNode.cpp 98-200):
  1. `disable`: erases the inherited child and stops (98-101).
  2. `replace`: erases the inherited child, then applies this one as new (103-106).
  3. `merge`: applies only if the child already exists in the parent (114).
  4. `op="add"`, `op="mul"`, `op="mul_round"`: the new value is the inherited number plus, times, or times-then-rounded-to-nearest the layer's number (187-200).
  5. `datatype="tokens"`: the layer text is a space-separated list. A plain token is added if the inherited list lacks it; a token with a leading `-` is removed; removing an absent token is a logged warning (150-170).
  6. Anything else: a plain value replaces the inherited value (the `!hasSetValue` path).
  Attributes on the element become children named with an `@` prefix (ApplyLayer, last block).
- Numbers are fixed-point (`fixed::FromString`, ParamNode.cpp 189; a TODO at 187 says other data types are not handled).
- Mod enable: `EnableMods` builds the enabled list (public and mod are added if missing), runs `CheckForIncompatibleMods` once, and erases the incompatible mods from the list (Mod.cpp 152-170). A dependency is `name` followed by one of `<=`, `>=`, `=`, `<`, `>` and a version (Mod.cpp 325-338). An enabled mod that is not in the available list is marked incompatible (Mod.cpp 299); a dependency that is missing or fails its version test marks the mod that declared it (Mod.cpp 336-337)
- Signed downloads (mod.io path): the file size must equal the listed size, then the MD5 must match (transfer check only), then a BLAKE2b hash of the streamed file is verified against a detached Ed25519 signature with the trusted key in `m_pk` (where that key comes from was not followed) (ModIo.cpp 531-536, 547-556, 561-575). Install runs only after this passes (ModIo.cpp 477, 490). The installer takes the folder name from `name` in `mod.json` (ModInstaller.cpp 98-102).
- Schema validation: each template type has a RelaxNG grammar; the highest-priority mod that has it is used; a failing file is logged with its path (validate_grammar.py 150-174; assertValid at 171).
- Reference check: `checkrefs.py` builds a parent-to-dependency table from the files and reports any dependency that is missing, with the files that refer to it (checkrefs.py 618-646). Its unused-file check is marked as noisy (63).
- Tick: none. Layers are read at load. The one per-frame use is the resulting state, which the simulation reads.

## 2. Key functions

- `CTemplateLoader::LoadTemplateFile` (TemplateLoader.cpp 32-85): the lookup, the `foo|bar` split, the parent load, the layer apply.
- `CParamNode::ApplyLayer` (ParamNode.cpp 70-245): every op, in the order it runs: special attributes first (79-106), tokens (115-180), numeric op (186-202), the plain-value fallback (208), then children recursively (218-), then `@attributes` (233-).
- `ModIo::VerifyDownloadedFile` (ModIo.cpp 529-580): size, MD5, then signature.
- `CModInstaller::Install` (ModInstaller.cpp 53-136): temp copy, mount, read `mod.json`, take the name, move into place, write `mod.json`.
- `Mod::EnableMods` (Mod.cpp 147-172) and `Mod::CheckForIncompatibleMods` (Mod.cpp 284-344).
- `CheckRefs::check_deps` (checkrefs.py 618-646).

## 3. Numbers vs mechanism

| Mechanism | Formula or rule | Number or constant | file:line |
|---|---|---|---|
| Layer apply order | parent value first, then this file's values override | depth-first, parent before child | TemplateLoader.cpp 75-82 |
| Inheritance guard | depth > 100 is an error | 100 | TemplateLoader.cpp 41-43 |
| Lookup order | special/filter, then mixins, then root | 3 locations | TemplateLoader.cpp 64-68 |
| Add | new = old + layer value | +, fixed-point | ParamNode.cpp 194 |
| Multiply | new = old x layer value | x, fixed-point | ParamNode.cpp 197 |
| Multiply and round | new = round_to_nearest(old x layer value) | integer result | ParamNode.cpp 200 |
| Remove a token | token starting with `-` is removed from the working list | prefix `-` | ParamNode.cpp 150-158 |
| Add a token | added only if the inherited list lacks it | membership test on the inherited list | ParamNode.cpp 171-172 |
| Walk speed example | layer multiplies the inherited speed | x 0.7 | template_unit_siege_tower.xml 100 |
| Dependency operators | five comparisons on dotted versions | 5 operators | Mod.cpp 325-338 |
| Signature | detached Ed25519 over the BLAKE2b hash of the file (hash length is the libsodium maximum, BYTES_MAX) | BYTES_MAX | ModIo.cpp 565-575 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: parent first, then the layer's ops in file order, and the same five op kinds (disable, set, add, mul, mul_round) plus tokens. It uses plain numbers where the donor uses fixed-point strings, so it does not reproduce the donor's rounding exactly; mul_round uses Math.round (tie rule not read). It omits the `foo|bar` split, the `replace` and `merge` and `filtered` flags, the `@attribute` children, the lookup order, the editor-listing filter, and the donor's exact handling of an absent number (ToFixed of an empty node, not read). Fixes: bare dependency names are checked for presence (the donor skips them, Mod.cpp 328-329), and the enabled set is re-checked until stable (the donor checks once, Mod.cpp 167-170). The strict number parse follows our ruling and is not the donor's.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// One operation written in a layer file (a template that names a parent).
type Op =
  | { kind: "disable"; key: string }
  | { kind: "set"; key: string; value: number }
  | { kind: "add"; key: string; value: number }
  | { kind: "mul"; key: string; value: number }
  | { kind: "mul_round"; key: string; value: number }
  | { kind: "tokens"; key: string; text: string };

interface Layer {
  parent?: string;
  ops: Op[];
}

// Numbers and token lists side by side, as one node of inherited values.
type State = Record<string, number | string[]>;

// "a b -c": add b if inherited list lacks it; remove c if present (donor: ParamNode.cpp 150-170).
function applyTokens(list: string[], text: string, warn: (m: string) => void): string[] {
  const out = [...list];
  const inherited = [...list];
  for (const t of text.split(/\s+/).filter((x) => x.length > 0)) {
    if (t.startsWith("-")) {
      const i = out.indexOf(t.slice(1));
      if (i >= 0) out.splice(i, 1);
      else warn(`could not remove "${t.slice(1)}": not present`);
    } else if (!inherited.includes(t)) {
      out.push(t);
    }
  }
  return out;
}

function applyOp(state: State, op: Op, warn: (m: string) => void): void {
  switch (op.kind) {
    case "disable":
      delete state[op.key];
      return;
    case "set":
      state[op.key] = op.value;
      return;
    case "tokens": {
      const raw = state[op.key];
      const old = Array.isArray(raw) ? raw : [];
      state[op.key] = applyTokens(old, op.text, warn);
      return;
    }
    default: {
      const raw = state[op.key];
      const old = typeof raw === "number" ? raw : 0; // donor reads ToFixed() of the node; empty case not read
      if (op.kind === "add") state[op.key] = old + op.value;
      else if (op.kind === "mul") state[op.key] = old * op.value;
      else state[op.key] = Math.round(old * op.value); // mul_round; tie rule of ToInt_RoundToNearest not read
    }
  }
}

// Parent first, then this layer's ops in file order (donor: TemplateLoader.cpp 75-82).
// Depth above 100 stops the walk (donor: TemplateLoader.cpp 41-43).
function resolve(name: string, layers: Map<string, Layer>, warn: (m: string) => void, depth = 0): State {
  if (depth > 100) throw new Error(`inheritance loop at ${name}`);
  const layer = layers.get(name);
  if (layer === undefined) throw new Error(`missing template ${name}`);
  const state: State = layer.parent !== undefined ? resolve(layer.parent, layers, warn, depth + 1) : {};
  for (const op of layer.ops) applyOp(state, op, warn);
  return state;
}

// Frankendom side: a bad number in a server row is a load error, not 0.
function parseNumberStrict(token: string, where: string): number {
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(token)) {
    throw new Error(`${where}: not a number "${token}"`);
  }
  return Number(token);
}

// Mod dependency check. Each dependency is "name", or "name<op>version" with op in <=, >=, =, <, >.
interface ModInfo {
  version: string;
  deps: string[];
}

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function depHolds(dep: string, versions: Map<string, string>): boolean {
  const m = /^(.*?)(<=|>=|=|<|>)(.+)$/.exec(dep);
  // Fix: a bare name is checked for presence. The donor's loop skips it (Mod.cpp 328-329).
  if (m === null) return versions.has(dep);
  const name = m[1];
  const op = m[2];
  const req = m[3];
  const have = versions.get(name);
  if (have === undefined) return false;
  const c = cmpVersion(have, req);
  switch (op) {
    case "<=":
      return c <= 0;
    case ">=":
      return c >= 0;
    case "=":
      return c === 0;
    case "<":
      return c < 0;
    default:
      return c > 0;
  }
}

// Fix: repeat until stable, so a mod whose dependency was removed is removed too.
// The donor checks once against the table built before any removal (Mod.cpp 167-170, 303).
function enableMods(requested: string[], available: Map<string, ModInfo>): { enabled: string[]; dropped: string[] } {
  const dropped: string[] = [];
  let enabled = requested.filter((m) => {
    if (available.has(m)) return true;
    dropped.push(m);
    return false;
  });
  for (;;) {
    const versions = new Map(enabled.map((m) => [m, available.get(m)!.version] as [string, string]));
    const bad = enabled.filter((m) => !available.get(m)!.deps.every((d) => depHolds(d, versions)));
    if (bad.length === 0) return { enabled, dropped };
    dropped.push(...bad);
    enabled = enabled.filter((m) => !bad.includes(m));
  }
}
```

## 5. Lands in

- TARGET `origins/catalogue/layers.ts` (new, proposed; the Frankendom repo was not opened for this note): the load-time resolver that turns a legend or zone layer (`parent` plus `op` rows) into one frozen catalogue entry on the server. Parity-checklist row 20 (catalogue as runtime source).
- today: (not read) the Frankendom legend and zone loaders.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime (a variant is a layer, never a copied file); server-verified (the strict number parse and the bounded inheritance depth in section 4)

## 6. Gaps and risks

- Numbers are fixed-point in the donor (ParamNode.cpp 187-200), which suits lockstep play. Frankendom is server-verified, so the server and the client must agree on one number type. Recommend integer basis points with one rounding rule, decided before any legend variant is written.
- Mod dependency defect: a dependency written without an operator is never tested (Mod.cpp 325-329). Fix: check presence (in the sketch).
- Mod dependency defect (verified over ssh): `CheckForIncompatibleMods` pushes the mod once per failing dependency (Mod.cpp 337), so a mod with two bad dependencies is listed twice, and `EnableMods` then runs `erase(find(...))` for each entry (Mod.cpp 169-170); the second `find` returns end(), which is undefined behaviour. Fix: de-duplicate the list (the sketch's `bad` filter is one entry per mod).
- Mod dependency defect: the check runs once, so a mod whose own dependency was removed stays enabled (Mod.cpp 167-170). Fix: repeat until stable (in the sketch).
- Folder name from `mod.json` is used without a check in `Install` (ModInstaller.cpp 102). Whether `OsPath` normalises `..` was not read. Frankendom must not use a name from an authored file as a path.
- The donor's `op` on an absent key uses `ToFixed()` of an empty node (ParamNode.cpp 188); the result for an absent key was not read. Frankendom must make a missing base an error, not a zero.
- `replace` and `disable` remove inherited children with no warning (ParamNode.cpp 100, 105). A layer that disables a stat silently changes the legend. Frankendom should log every removal in the load report.
- Strategy's MD asks who may publish, licence of user content, and how Neverwinter Foundry or Ryzom Ring stage user content. This donor has a signed download path (ModIo.cpp 477-490, 561-575) but no authoring publish or rating flow in the files read. Do not present it as evidence for those.
- The signed-download design (size, then hash, then Ed25519 signature, then install) only protects against tampering in transit and by the host. It does not check that the content is safe to run. The donor's content is data, so the risk is lower; a Frankendom pack must stay data-only, with no script field.
- The mod.io key and the signature parse (ModIo.cpp 790-850) were read only in part.
- Frankendom's one-ledger rule: a layer must never write a count or a grant directly. Stat multipliers are fine as layers; a reward row goes through the ledger.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mod.cpp: note says a missing mod or failed version test marks 'the dependent mod' incompatible (299, 336-337); line 299 marks the enabled mod that is not in the available list (not a dependent), only 337 marks the dependent. Counts 191/111/124 are grep counts, match. Everything else matches (ApplyLayer ops 98-200, tokens 134-178, loop guard depth>100 at 41, lookup order 64-68, EnableMods 147-173, siege tower WalkSpeed mul 0.7 at line 100, BYTES_MAX 565, md5 543-556, ModInstaller 102).
Missed: "Acceptance wording risk: 'Health equals the rounded product of base and 1.2' with op=""mul"" - the sketch's mul is NOT rounded (only mul_round rounds). A correct build of the sketch passes only if base*1.2 is whole (e.g. 100). Specify mul_round or integer basis points. MISSED donor bug: CheckForIncompatibleMods (Mod.cpp 337) can push the same mod twice (two failing deps), then EnableMods 169-170 does erase(find(...)) twice; the second find returns end() = undefined behaviour. Also dep lines with 'name' only skip (noted)."

Fixed 2026-10-12 (Sonnet fixer): Acceptance now uses mul_round on a whole base (155 -> 186) and says plain mul is unrounded, matching the sketch; Mod.cpp 299 vs 336-337 wording corrected; added the verified double-push/double-erase bug (Mod.cpp 337, 169-170). Sketch unchanged.
