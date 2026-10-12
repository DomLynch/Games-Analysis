# wesnoth-wesnoth (modding-authoring-tools, cell 34)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/server/campaignd/server.cpp` (publish gate `validate_addon`, with `src/addon/validation.cpp` for names, collisions and update packs) | Licence: GPL-2.0-or-later (validation.cpp header lines 7-10: "version 2 of the License, or ... any later version"; COPYING is GPL v2, "Version 2, June 1991") | C++ and WML | symbol `server::validate_addon`

Checked: Read in full: server.cpp 1261-1500 (validate_addon, the whole publish gate) and 1748-1800 (update-pack expiry and generation). Read validation.cpp 1-200 (name and filename rules, collisions), 266-420 (hash comparison, write_difference, make_updatepack). Read server.cpp 1695-1700 (removelist then addlist applied) from the grep output and 1659-1674 (saved update pack). Grep only: validation.hpp:129 (icon cap), server.cpp 153-172 and 328 (passphrase and strict versions), 1943-1991 (admin passphrase handlers, not read), client.cpp 505-526 (client applies packs, not read). Not read: server.cpp 1500-1747 (upload processing body), 1800-2225, the body of `multi_find_case_conflicts` and `multi_find_illegal_names` (call sites only), validation.cpp 200-265 and 420-551, the in-game editor (src/editor2, not opened), add-on Lua (lua_kernel_base.cpp grep for "sandbox" found only the debug console and a load-mode comment at 1155). Confidence: high on the gate order, the version rule, the collision rule and the update-pack direction; medium on atomicity of the apply (not read). camera_scope: n/a (not a camera topic).

Best transferable idea: Publish a content pack only after an ownership check, a strict version increase, a name and filename check, and a case-collision check, in that order, each failure returning a named reason; and ship later versions as a name-and-hash delta (removelist plus addlist) that the server can regenerate between consecutive versions.

Decision (proposed): adapt - the gate order and the reason codes fit zone and legend packs published by Dom now and by players later; the per-pack shared passphrase and the forum login are rejected (our rule is Dom-only publish, a server role, not a shared secret); the delta writer is adapted for row-level catalogue patches (row 20).
Acceptance: A server publish test sends a zone pack whose name differs from an existing pack only by case, a pack with the same version, and a pack with two files that collide in lowercase; each is refused with its reason code and the live catalogue is byte-identical afterwards.

## 1. Mechanism

- Gate order in `validate_addon` (server.cpp 1261 onward). (a) A read-only server refuses (read). (b) The name is matched to an existing add-on by lowercase comparison (1288). (c) A passphrase is required (1305). If there is an existing add-on, the passphrase must match it (1342), or forum login is used when the upload asks for it (read, earlier in the same function). (d) A hidden add-on refuses uploads (1347). (e) Name, title, description, author, address and email are checked against a blocklist (1353). Then the structure checks: the pack must hold data (read), the name must be legal (1380), a title is needed, the icon must be under the cap (1395), the type must be known, the author and version must be present, and the version must go up (1424). Then the file checks: illegal filenames in the pack (1441), case conflicts in the pack (1447). Last, an update pack needs an existing add-on (1454) and the feedback topic is checked (read). Every failure returns a status code and a message.
- Ownership: the passphrase is stored as a salt and a hash (server.cpp 172) and checked with `auth::verify_passphrase` (156). An empty passphrase cannot be set (608).
- Version rule: strict by default (328), so a new version must be greater, and equal is refused (1424). The non-strict setting allows equal.
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

simplified: keeps the donor's rules: removelist is old minus new by name and hash, addlist is new minus old with content, removal is applied before the addlist, and a case collision is reported once plus each later name. It replaces the donor's nested file and folder tree with a flat map of paths, which drops the folder recursion and the empty-folder case. It omits the passphrase and forum checks, the blocklist, the version comparison (`version_info`, not read), the update-pack retention and the server side generation loop.

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
