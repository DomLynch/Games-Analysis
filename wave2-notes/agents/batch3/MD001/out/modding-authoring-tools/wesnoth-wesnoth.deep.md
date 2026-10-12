# wesnoth-wesnoth (modding-authoring-tools, cell 34)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/server/campaignd/server.cpp` (publish gate `validate_addon`, with `src/addon/validation.cpp` for names, collisions and update packs) | Licence: GPL-2.0-or-later (validation.cpp header lines 7-10: "version 2 of the License, or ... any later version"; COPYING is GPL v2, "Version 2, June 1991") | C++ and WML | symbol `server::validate_addon`

Checked: Read in full: server.cpp 1261-1500 (validate_addon, the whole publish gate) and 1748-1800 (update-pack expiry and generation). Read validation.cpp 1-200 (name and filename rules, collisions), 266-420 (hash comparison, write_difference, make_updatepack). Read server.cpp 1695-1700 (removelist then addlist applied) from the grep output and 1659-1674 (saved update pack). Grep only: validation.hpp:129 (icon cap), server.cpp 153-172 and 328 (passphrase and strict versions), 1943-1991 (admin passphrase handlers, not read), client.cpp 505-526 (client applies packs, not read). Not read: server.cpp 1500-1747 (upload processing body), 1800-2225, the body of `multi_find_case_conflicts` and `multi_find_illegal_names` (call sites only), validation.cpp 200-265 and 420-551, the in-game editor (src/editor2, not opened), add-on Lua (lua_kernel_base.cpp grep for "sandbox" found only the debug console and a load-mode comment at 1155). Confidence: high on the gate order, the version rule, the collision rule and the update-pack direction; medium on atomicity of the apply (not read). camera_scope: n/a (not a camera topic).

Best transferable idea: Publish a content pack only after an ownership check, a strict version increase, a name and filename check, and a case-collision check, in that order, each failure returning a named reason; and ship later versions as a name-and-hash delta (removelist plus addlist) that the server can regenerate between consecutive versions.

Decision (proposed): adapt - Frankendom adds one rule the donor lacks: a pack name that equals an existing name except for case is refused with NAME_CASE_CLASH (the donor instead treats it as an update of the existing add-on, server.cpp 1288); the gate order and the reason codes fit zone and legend packs published by Dom now and by players later; the per-pack shared passphrase and the forum login are rejected (our rule is Dom-only publish, a server role, not a shared secret); the delta writer is adapted for row-level catalogue patches (row 20).
Acceptance: A server publish test sends a zone pack whose name differs from an existing pack only by case (refused NAME_CASE_CLASH, our added rule), a pack with the same version as the existing one (refused VERSION_NOT_INCREMENTED, donor rule), and a pack with two files that collide in lowercase (refused FILENAME_CASE_CONFLICT, donor rule); each is refused with its reason code and the live catalogue is byte-identical afterwards.

## 1. Mechanism

- Gate order in `validate_addon` (server.cpp 1261 onward). (a) A read-only server refuses (read). (b) The name is matched to an existing add-on by lowercase comparison (1288); a different-case name therefore counts as the same add-on and goes on to the ownership and version checks, it is not refused. (c) A passphrase is required (1305). If there is an existing add-on, the passphrase must match it (1342), or forum login is used when the upload asks for it (read, earlier in the same function). (d) A hidden add-on refuses uploads (1347). (e) Name, title, description, author, address and email are checked against a blocklist (1353). Then the structure checks, in this order: the pack (or, for an update pack, the removelist or addlist) must hold data (1370-1378), the name must be legal (1380), the name must not start with a markup character (1385), a title is needed, the icon must be under the cap (1395), the title must not start with a markup character (1400), the type must be known (1405), the author and version must be present, the version must go up when the add-on exists (1424), a description is needed (1430), an email is needed unless forum login is used (1436). Then the file checks, which cover the full data and also the addlist and removelist of an update pack: illegal filenames (1441), case conflicts (1447). Last, an update pack needs an existing add-on (1454) and the feedback topic is checked (read). Every failure returns a status code and a message.
- Ownership: the passphrase is stored as a salt and a hash (server.cpp 172) and checked with `auth::verify_passphrase` (156). An empty passphrase cannot be set (608).
- Version rule: strict by default (328), so a new version must be greater, and equal is refused (1424). The comparison is `version_info` (dotted numbers with suffix handling), not a string compare; a build must use a numeric dotted compare. The non-strict setting allows equal.
- Name rule: letters and digits, plus `-` and `_` (validation.cpp 45-49 and `return !isalnum(c);` at 49), not empty (58).
- File rule: each file and folder name must pass `addon_filename_legal` (line 89), a wrapper for `filesystem::is_legal_user_file_name` (validation.cpp 66-72). Case collisions in one folder use the lowercase name as key (127-130; folders at 145-147), and the whole pack is checked again on upload (server.cpp 1447).
- Update packs (validation.cpp 325-379). `write_difference` walks the new tree and writes files with no identical entry (same name and same hash) in the old tree (333). `make_updatepack` builds a removelist from old minus new, names only (377), and an addlist from new minus old, with content (379).
- Apply: the server applies the removelist, then the addlist (server.cpp 1695-1700, read via grep). It keeps the delta it was sent as an update pack (1659-1674).
- Generated packs: the server expires update packs when the new version already appears as a `from` (1757) and creates any missing pack between each pair of consecutive versions (1771-1795), logging "Automatically generating update pack for" (1795).

## 2. Key functions

- `server::validate_addon`: `server.cpp` 1261 onward (read to 1500). The publish gate.
- `server::handle_upload`: `server.cpp`, the function right after `validate_addon` (read only its first lines: validation call and the error path, not the body).
- Update-pack expiry and generation: `server.cpp` 1752-1815 (read to 1800).
- `write_difference` / `make_updatepack`: `src/addon/validation.cpp` 325-379.
- `check_case_insensitive_duplicates_internal`: `validation.cpp` 119-166.
- `addon_name_legal`: `validation.cpp` 56-64.

## 3. Numbers vs mechanism

| Reusable rule | Donor value or rule (reference) |
|---|---|
| Name charset | letters, digits, `-`, `_` (validation.cpp 45-49) |
| Icon cap | 500000 bytes (validation.hpp:129; check at server.cpp 1395) |
| Version rule | strict: new must be greater; default on (server.cpp 328, 1424) |
| Ownership | salted hash per add-on; name matched case-insensitively (156, 172, 1288) |
| Update pack | removelist names old-minus-new by name and hash; addlist carries content (validation.cpp 377, 379) |
| Pack retention | expiry by a stored timestamp and by reuse as a `from` (server.cpp 1757; the timestamp value was not read) |

No timers or rates in this gate; the only numbers are the icon cap and the version comparison.

## 4. TypeScript sketch

simplified: keeps the donor's rules: removelist is old minus new by name and hash, addlist is new minus old with content, removal is applied before the addlist, and a case collision is reported once plus each later name. It replaces the donor's nested file and folder tree with a flat map of paths, which drops the folder recursion and the empty-folder case. It adds `sameNameOtherCase` (our rule) and a numeric `versionIncreased` (suffix handling omitted). It omits the passphrase and forum checks, the blocklist, the update-pack retention and the server side generation loop.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface PackFile {
  hash: string;     // content hash; same path + same hash = unchanged
  content: string;
}

// Flat map of path ("dir/sub/file.cfg") to file. The donor uses a nested tree.
export type Pack = Map<string, PackFile>;

export interface UpdatePack {
  removelist: string[];                                        // paths to purge (names only)
  addlist: { path: string; hash: string; content: string }[];  // files to write, with content
}

// Donor: removelist = old files with no identical (name + hash) entry in the new pack;
// addlist = new files with no identical entry in the old pack, carrying content.
export function makeUpdatePack(oldPack: Pack, newPack: Pack): UpdatePack {
  const removelist: string[] = [];
  for (const [path, f] of oldPack) {
    const n = newPack.get(path);
    if (n === undefined || n.hash !== f.hash) removelist.push(path);
  }
  const addlist: UpdatePack["addlist"] = [];
  for (const [path, f] of newPack) {
    const o = oldPack.get(path);
    if (o === undefined || o.hash !== f.hash) addlist.push({ path, hash: f.hash, content: f.content });
  }
  return { removelist, addlist };
}

// Donor order: purge the removelist first, then write the addlist (a changed file is in both).
export function applyUpdatePack(base: Pack, upd: UpdatePack): Pack {
  const out: Pack = new Map(base);
  for (const p of upd.removelist) out.delete(p);
  for (const a of upd.addlist) out.set(a.path, { hash: a.hash, content: a.content });
  return out;
}

// Donor: a name that differs only by case from an earlier name in the same pack is a clash.
// The first name is reported once, then every later clashing name.
export function caseCollisions(paths: string[]): string[] {
  const firstByKey = new Map<string, string>();
  const bad: string[] = [];
  for (const p of paths) {
    const key = p.toLowerCase();
    const first = firstByKey.get(key);
    if (first === undefined) {
      firstByKey.set(key, p);
    } else {
      bad.push(first, p);
    }
  }
  return [...new Set(bad)];
}

export function sameNameOtherCase(existing: string[], name: string): boolean {
  // Frankendom addition (NAME_CASE_CLASH): same name apart from case is a clash, not an update.
  const key = name.toLowerCase();
  return existing.some((e) => e.toLowerCase() === key && e !== name);
}

export function versionIncreased(oldV: string, newV: string, strict = true): boolean {
  // Numeric dotted compare, as the donor's version_info (suffix handling omitted).
  const a = oldV.split(".").map(Number);
  const b = newV.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (y !== x) return y > x;
  }
  return !strict;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/content/publish-gate.ts` (new): the server-side publish gate for zone and legend packs, in donor order, with one reason code per failure. Parity-checklist row 20 (catalogue as runtime source; catalogue fields). Row-level catalogue patches use the same delta shape (`makeUpdatePack`, `applyUpdatePack`) in the same file.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, no donor lines reused)
- Brief rule served: zones as data on one runtime; server-verified publish (the gate runs on our server, never in the client); one ledger (a patch is applied as rows, never as a side store); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later is copyleft in our classes: clean-room only. The sketch is written from the mechanism.
- Fits our server: the donor's gate is server-side, which is what we need. Our version of it runs before any row is written.
- Ownership: a shared passphrase per add-on is the donor's answer. We reject it: Dom-only publish means a server role check, and a shared secret would leak. Replace the passphrase with the account role, not with a new secret.
- No defect found in the collision rule: the donor reports the first name of a clash once (a flag, validation.cpp 131-137) and then each later name. The sketch keeps that with `new Set`.
- Defect 2, not verified: the apply is done on an in-memory copy (`rw_full_pack`, server.cpp 1695-1700), but how the result reaches disk was not read. If that write is not atomic, a crash mid-write could lose the pack. Fix: write a temp file and rename it, as one ledger write (our rows never half-apply).
- Defect 3, noted: `write_difference` drops a new empty folder, because it only adds a folder when a file inside changed (validation.cpp 325-365). The donor's own hash list does handle empty folders (`contains_hashlist`, 292-317). Frankendom rows have no folders, so this does not transfer; flagged so nobody copies the drop.
- Defect 4, noted: the donor's own comment says client-side verification of update packs is a TODO (validation.cpp 368-372). Our server verifies every delta before applying it.
- Not in this donor: rating, reviews and featured ranking. A grep of src for "rating" found only unrelated hits (help, minimap, combat code). No donor evidence for rating.
- In-game editor: src/editor2 was not opened; the map editor is a separate tool, so the non-developer path here is "write WML files and upload a pack", not an in-game row editor.
- Add-on Lua: no add-on sandbox was found by grep (lua_kernel_base.cpp:1155 only restricts loading to text). Not transferable: we do not run user code.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Claims verified: gate order in validate_addon (read-only 1263, case-insensitive name match 1284-1292, passphrase 1305, existing-addon auth 1342, hidden 1347, blacklist 1353, empty pack 1370, name legal 1380, icon 1395, type 1405, version 1424 strict, illegal names 1441, case conflicts 1447, delta needs existing 1453), strict_versions default true (server.cpp 328), name charset (validation.cpp 45-49), icon cap 500000 (validation.hpp:129), case collision first-once logic 119-166, write_difference/make_updatepack 325-380 (removelist = old minus new by name+hash, addlist new minus old with content), removelist applied before addlist (1695-1700), update-pack expiry 1757 and regeneration 1771-1795, TODO comment 368-372, licence GPL v2+. Errors: (1) Gate-order list omits several checks that sit in the same function: markup-char checks on name (1385) and title (1400), description (1430) and email (1436) required; 'title is needed' is listed but the order stated (type, author, version, version-increase) skips description/email. Minor. (2) Version rule uses version_info (semantic compare), not a string compare; note says 'not read' so honest, but the sketch contains no version compare so a builder may use string compare. ACCEPTANCE RISK: acceptance expects a pack whose name differs from an existing pack only by case to be 'refused with its reason code'. In the donor a case-different name is NOT refused: it matches the existing add-on (1288) and is processed as an update of that add-on (then passphrase/ownership/version checks apply). The donor has no reason code for a name-case clash; the note itself describes the lowercase match as ownership lookup. A correct donor-faithful build would fail this test; Frankendom must add an explicit rule and reason code (e.g. NAME_CASE_CLASH) which the Decision does not state.
Missed: Version comparison semantics (version_info with non-numeric suffix handling) and the markup-character guards (is_text_markup_char on name/title first character) are the simpler publish-safety rules the note did not cover. Also the same gate validates removelist/addlist file names (not just full data packs): multi_find_illegal_names/multi_find_case_conflicts take {data, addlist, removelist}.

Fixed 2026-10-12 (Sonnet fixer): the case-different name is not refused by the donor, so the Decision now names an added NAME_CASE_CLASH rule and the acceptance labels which reason is ours and which is the donor's; gate-order list completed (markup guards, description, email, removelist/addlist file checks); version compare stated as numeric and added to the sketch with the name-clash check; sketch typechecked on the VPS. Also found: the file checks run over data, addlist and removelist. Not verified: nothing further.
