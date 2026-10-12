# Facepunch-garrysmod (modding-authoring-tools, cell 34)

Donor: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/` (`gamemodes/sandbox/gamemode/player_extension.lua`, `lua/includes/modules/duplicator.lua`, `lua/includes/modules/scripted_ents.lua`, `gamemodes/sandbox/entities/weapons/gmod_tool/stools/duplicator/arming.lua`, `gamemodes/sandbox/sandbox.txt`) | Licence: none declared (no LICENSE file in the repo; README.md and CONTRIBUTING.md name no licence; README.md says binaries are not public and are derived from the Source SDK) | Lua | symbol `CheckLimit` / `GenericDuplicatorFunction`

Checked: read in full: `player_extension.lua` (1-184), `arming.lua` (1-130), `duplicator.lua` 326-358, 474-512, 666-720, 797-830, 949-965, `scripted_ents.lua` 66-84, `stools/duplicator.lua` 86-147. Read in part: `balloon.lua` 77, 134-140, 165 (the enclosing functions not read), `commands.lua` 780-796 and 875 (one line), `sandbox.txt` 1-140 plus the default lines for the rest (found by grep). Candidate files opened: 9. Not read: `duplicator.lua` 1-325, 360-473, 513-665, 721-796, 831-948, 966-1048; the bodies of the registered maker functions except `MakeBalloon` (balloon.lua 134-136). Confidence: high for the quota (CheckLimit, AddCount, GetCount read end to end) and for the paste gap (both paths read); medium for claims about other stools. `camera_scope` not applicable.

Best transferable idea: one owner-keyed quota per content type, read from a tunable cap (negative = unlimited, missing = deny), checked before the build and again inside the constructor, with dead rows pruned on read and a default-deny allow-list gating what may be pasted.
Decision (proposed): adapt - take the per-owner quota and the two-point check for player-placed housing pieces and guild-hall furniture rows; change the donor's default-allow (every scripted entity may be pasted unless it opts out) to default-deny, and send paste through the same cap, which the donor's paste path skips.
Acceptance: a server test places one piece past the cap and gets a refusal with the ledger unchanged; pasting a layout that holds one non-whitelisted row, or one row over the cap, is refused as a whole; removing a piece frees one slot on the next frame.

## 1. Mechanism

- Store. Each player has a list of created entities per content type. `AddCount` puts the entity under the owner id (`player_extension.lua` 110-116). The count is the number of live entries; dead ones are dropped when counted (85-88). A removal callback on the entity (122-127) schedules a recount, batched to the next frame by a zero-delay timer (62).
- Cap. The cap is the convar `sbox_max<type>`, read on every check (16). A negative value means unlimited (25). A missing convar reads as 0, which blocks every placement, because `count > c - 1` is then always true (16, 27): this fails closed.
- Check order in `CheckLimit` (11-34): (a) single-player bypass (14); (b) read cap (16) and count (17); (c) the hook `PlayerCheckLimit` runs and a non-nil return wins (19-23); (d) unlimited test (25); (e) refuse when `count > cap - 1` (27-30). A refusal sends the client a limit-hit message, at most once per engine tick per type (153-160).
- Two checks per object. The tool checks before building (`balloon.lua` 77). The constructor `MakeBalloon` checks again (136), and the owner is recorded after creation (165).
- Client view. The count is mirrored to the client as a network int (100) and read there for the HUD (70).
- Paste path. The duplicator stool calls `duplicator.Paste` (stools/duplicator.lua 120). Paste creates each entity through `CreateEntityFromTable` (duplicator.lua 668; the loop at 816-820 and protected call at 819). A class registered with `RegisterEntityClass` is on the allow-list (392) and uses its own maker (718). Any other class falls to `GenericDuplicatorFunction` (689), which does, in order: allow-list test (478); for a non-admin, the class must be `Spawnable` and not `AdminOnly` (486-489); then `ents.Create` (493), `Spawn`, `Activate`. The generic maker does no cap check and no `AddCount`. Constraints are capped per player at paste (732-733).
- Allow-list default. Every scripted entity is put on the allow-list when registered unless it sets `DisableDuplicator` (`scripted_ents.lua` 77-79).
- Arming a dupe from a file (`arming.lua` 66-111): chunk size limit 60000 bytes (2, 77); one arm per second per client (91-92); decompress limit 5242880 bytes (96); top-level type checks only (103-108); server hook `CanArmDupe` may refuse (70); result stored on the player as `CurrentDupe` (111).
- Spawn command for a SENT (`commands.lua` 790, then `player.lua` 101-103): the gamemode is asked first, and the `sents` cap is checked there. The count is added after creation by `PlayerSpawnedSENT` (player.lua 172-174), which the spawn command calls (commands.lua 875). The paste path does not call it.

## 2. Key functions

- `CheckLimit`: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/sandbox/gamemode/player_extension.lua` 11-34.
- `GetCount` and `AddCount`: same file, 67-104 and 106-131.
- Tool-side and constructor-side checks: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/sandbox/entities/weapons/gmod_tool/stools/balloon.lua` 77 and 134-136.
- Allow-list: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/lua/includes/modules/duplicator.lua` 330-357.
- Generic maker: same file, 476-509. Class dispatch: 668-720.
- Arm receive: `/mnt/frankendom-donors/Facepunch-garrysmod/garrysmod/gamemodes/sandbox/entities/weapons/gmod_tool/stools/duplicator/arming.lua` 66-111.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (default values from `sandbox.txt`, tab-delimited so not receipted; help text is receipted) |
|---|---|
| Owner-keyed count against a cap; -1 unlimited; missing cap = 0 (deny) | props 200 (line 58), ragdolls 10 (67), vehicles 4 (76), effects 200 (85), balloons 100 (94), cameras 10 (103), npcs 10 (112), SENTs ("entities") 100 (121), dynamite 10 (130), lamps 3 (139), lights 5 (148), wheels 50 (157), thrusters 50 (166), hoverballs 50 (175), buttons 50 (184), emitters 20 (193), constraints 2000 (202), rope constraints 1000 (211) |
| Recount batched to next frame | timer delay 0 s, one repetition (`player_extension.lua` 62) |
| Limit-hit notice | once per engine tick per type (156) |
| Dupe arm limits | 60000 bytes per chunk (`arming.lua` 2); 5242880 bytes decompressed (96); one arm per 1 s (91) |
| Paste gate | none for generic SENTs; constraints capped by a per-player count (`duplicator.lua` 732-733) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the cap test (missing cap = 0, cap < 0 = unlimited, refuse at count > cap - 1) and the owner-keyed store. It omits the `PlayerCheckLimit` hook, the single-player bypass, the batched recount timer, the client count mirror, the per-tick limit-hit throttle and the on-remove callback (replaced by prune-on-read). `canPasteLayout` is the fix for the donor's paste path, not donor code; it is all-or-nothing for a pasted layout. Entities are plain rows.

```ts
// Licence: none declared in the donor (clean-room). Sketch written from the described mechanism, not a translation of donor lines.
type Owner = string;

interface Placed {
  id: string;
  alive: boolean; // stands in for IsValid(ent) and not marked for deletion
}

interface Ledger {
  caps: Map<string, number>;                 // per content type; -1 = unlimited; missing = 0 (deny)
  placed: Map<Owner, Map<string, Placed[]>>; // owner -> content type -> placed rows
  allowRows: Set<string>;                    // default-deny whitelist for pasted rows
}

function capFor(l: Ledger, type: string): number {
  return l.caps.get(type) ?? 0; // fail closed: a missing cap blocks everything
}

// Prunes dead rows on read, then counts the live ones.
function countOf(l: Ledger, owner: Owner, type: string): number {
  const byType = l.placed.get(owner);
  const rows = byType?.get(type) ?? [];
  const live = rows.filter((p) => p.alive);
  if (byType !== undefined) byType.set(type, live);
  return live.length;
}

// cap < 0 is unlimited; otherwise a new row is refused when count > cap - 1.
function mayPlace(l: Ledger, owner: Owner, type: string): boolean {
  const cap = capFor(l, type);
  if (cap < 0) return true;
  const count = countOf(l, owner, type);
  if (count > cap - 1) return false;
  return true;
}

function recordPlaced(l: Ledger, owner: Owner, type: string, p: Placed): void {
  let byType = l.placed.get(owner);
  if (byType === undefined) {
    byType = new Map<string, Placed[]>();
    l.placed.set(owner, byType);
  }
  const rows = byType.get(type) ?? [];
  rows.push(p);
  byType.set(type, rows);
}

// Single door for one placement: whitelist, cap, then build, then record.
function placeOne(
  l: Ledger,
  owner: Owner,
  type: string,
  rowClass: string,
  make: () => Placed | null,
): Placed | null {
  if (!l.allowRows.has(rowClass)) return null;
  if (!mayPlace(l, owner, type)) return null;
  const p = make();
  if (p === null) return null;
  recordPlaced(l, owner, type, p);
  return p;
}

// Paste is all-or-nothing: one non-whitelisted row or one over-cap type refuses the whole layout.
function canPasteLayout(l: Ledger, owner: Owner, rows: { type: string; rowClass: string }[]): boolean {
  const extra = new Map<string, number>();
  for (const r of rows) {
    if (!l.allowRows.has(r.rowClass)) return false;
    extra.set(r.type, (extra.get(r.type) ?? 0) + 1);
  }
  for (const [type, n] of extra) {
    const cap = capFor(l, type);
    if (cap < 0) continue;
    if (countOf(l, owner, type) + n > cap) return false;
  }
  return true;
}

export {};
```

## 5. Lands in

- TARGET `origins/server/content-quota.ts` (new module, proposed; not checked against the Frankendom repo). One place that answers "how many of this type may this owner hold" for placement, furniture rows and paste.
- Parity row 20 (catalogue as runtime source). The hint was row 23, but row 23 is zone spawn caps and population; this mechanism caps player-owned rows, so row 23 does not fit.
- Reuse tag: rewrite-from-idea (no licence declared; clean-room only).
- Brief rule served: one ledger (one door per row, paste included); caps held as data rows, not constants in the function.

## 6. Gaps and risks

- No licence is declared. Clean-room only: take the shape (quota, two checks, default-deny allow-list), never the lines.
- Defect D1, cap bypass on paste: a generic SENT pasted from a dupe is neither capped nor counted (`duplicator.lua` 476-509; the only cap check on paste is for constraints, 732-733). fix: call `CheckLimit` before `ents.Create` and `AddCount` after `Spawn` in the generic maker. The sketch's `canPasteLayout` shows the shape.
- Defect D2, default-allow: every scripted entity is pasteable unless it opts out (`scripted_ents.lua` 77-79). fix: default-deny; a row class is added to the allow-list by hand.
- Defect D3, registered path skips the spawn-rights test: `Spawnable` and `AdminOnly` are checked only in the generic maker (486-489). Registered makers (718) are called with no such test here. Whether each registered maker checks its own cap or rights was not read for all of them (`MakeBalloon` checks the cap, 136). fix: run allow-list, cap and spawn-rights in `CreateEntityFromTable` before any maker is called.
- Defect D4, arm checks only the top level: `arming.lua` 103-108 checks the types of the top-level fields; entity rows, classes and count are not checked until paste. fix: validate each row (class on the allow-list, numeric fields in range, a row-count cap) at arm time.
- The count is server-owned in Lua, but the donor mirrors it to the client only for display (100). Frankendom's server must own the count; the client number is cosmetic.
- Not verified: the engine's own entity limits; any content publishing or rating flow (the Workshop dupe dialog in `stools/duplicator.lua` 196-263 was not read); a non-developer path to add a zone (not in this donor). The spawn list `garrysmod/settings/spawnlist_default` was not read.
