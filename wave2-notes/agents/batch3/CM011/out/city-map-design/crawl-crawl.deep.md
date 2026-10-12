# crawl-crawl (city-map-design, cell 2)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dgn-overview.cc` | Licence: GPL-2.0-or-later (LICENSE lines 7-8: "either version 2 of the License, or (at your option) any later version") | C++ | symbol `seen_notable_thing`

Checked: `seen_notable_thing` (dgn-overview.cc 104) read with its callers show.cc 204-205 and terrain.cc 1373-1374 (read) and a third at map-knowledge.cc 578 (confirmed on the VPS: it runs after `update_terrain_knowledge` when map knowledge is refreshed for a cell, gated by `is_notable_terrain`). `move_notable_thing` (130-155), `unnotice_feature` (719-724), `_unnotice_shop` (694-698), `_seen_staircase` (793), `_seen_shop` (808-810), `_get_shops` (591-650), the '$' key (770-771) and the map typedefs (57-60) read. Ordering: level_id (level-id.h 77-79) and level_pos (121-124) read. Callers seen by grep only: terrain.cc 1183, 1590-1603, 1391; shopping.cc 1626; mon-util.cc 1036 (checked on the VPS: a monster-mimic reveal path calls `unnotice_feature` then resets the grid to floor). Placement half: dungeon.cc 5794-5797, 5881-5887 and 6571-6584 read; the keeper-name and stock fill of `make_spec_shop` (6579 onward) and the loop that calls `_vault_grid` were not read. Confidence: high on the landmark registry (every function on its path was read); medium on how far it covers "services placed one at a time" (only the placement call was read). The sketch was typechecked on the VPS with `--strict --target es2020` after `export {}` was appended; the block below omits that line. camera_scope: n/a (not a camera cell).

Best transferable idea: a per-zone "services seen so far" list: record a service the first time its cell is seen, move the record when its feature moves, forget it when the service is destroyed, and list the seen ones grouped by zone with a key that jumps to the nearest one.

Decision (proposed): adapt - Frankendom has no town hub yet, but the same registry gives the zone minimap and a services list that fills in as the player walks, with no pre-revealed town; use one typed map with a kind field instead of one map per kind, and fix the defects in section 6.

Acceptance: a player who walks into a zone sees a Services list that holds only the inns and smiths they have already seen; when a smith is destroyed it leaves the list and the minimap at once, and the jump key walks to the nearest one still listed.

## 1. Mechanism

- Entry. `seen_notable_thing(feature, pos)` runs only for notable terrain. It is called on sight from show.cc 204-205 and from map-knowledge.cc 578 (map knowledge refresh) (`if (is_notable_terrain(feat))`, then `seen_notable_thing(feat, gp);`) and when terrain changes into a cell the player can see (terrain.cc 1373-1374). It is an event, not a per-tick loop.
- Gate. Nothing is recorded unless `player_in_connected_branch()` is true (107). The code comment there says "Don't record in temporary terrain", and `_seen_altar` (798-801) says it cannot record in the Abyss or Pandemonium. `player_in_connected_branch()` itself was not read.
- Dispatch order (first match wins): an altar (has a god) is recorded by `_seen_altar`; a branch entrance other than Hell goes to `_seen_staircase`, which records the level in that branch's set only if the branch has not yet been entered (793); `DNGN_ENTER_SHOP` goes to `_seen_shop` (810); a gate goes to `_seen_portal`; the zot statue sets a one-time milestone flag.
- Storage. One `std::map` per kind, keyed by `level_pos` (57 is the shop map). `level_pos` orders by level first, then by cell (121-124). `level_id` orders by branch, then depth (77-79). A shop record stores the shop type at the cell (810), so re-seeing overwrites it with the current type.
- Move. `move_notable_thing(orig, dest)` returns false if `orig` is not notable terrain (137). Otherwise it copies the shop, altar, portal and portal-note records to `dest` (144 is the shop copy; the others are the same pattern). If `orig` is not a branch entrance it then calls `unnotice_feature(orig)` (154-155). Branch entrances are not forgotten because the level they sit on has not changed.
- Forget. `unnotice_feature(pos)` clears the portal, altar, shop and stair records for that cell (719-724). `_unnotice_shop` also removes the shop from the stash tracker and the shopping list and erases the shop record (694-698). Callers: terrain.cc 1391 (a permanent terrain change, which calls unnotice whenever the new feature is not unseen, whether or not the player can see the cell), shopping.cc 1626 (`destroy_shop_at`, which calls unnotice before it erases the shop from `env.shop`).
- List. `_get_shops` walks the shop map in key order. Each level gets one label (light grey if the player has visited it, dark grey if not), then one short label per shop on it. The wrap test (618) runs only when a new level starts: if the column counter is past 62 (610), the list starts a new line. Shops on the same level never wrap on their own.
- Jump. The '$' key (770-771) runs `StashTrack.search_stashes("shop")` when the shop map is non-empty, and shows a message when it is empty. The search itself was not read. '_' (759-768) sends the '_' key and calls `do_interlevel_travel` when an altar has been seen.

## 2. Key functions

- `seen_notable_thing`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dgn-overview.cc` 104-128: the dispatch above (receipts 104, 107).
- `_seen_shop`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dgn-overview.cc` 808-810 (receipt 810).
- `move_notable_thing`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dgn-overview.cc` 130-155 (receipts 144, 154, 155).
- `unnotice_feature` and `_unnotice_shop`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dgn-overview.cc` 694-724 (receipts 698, 723).
- `_get_shops`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dgn-overview.cc` 591-650 (receipts 605, 610, 618).
- Placement of a vault shop cell: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dungeon.cc` 5881-5887 (`_vault_grid` calls `_vault_grid_mapspec` for a replacing mapspec), 5794-5797 (a shop mapspec calls `make_spec_shop` and then sets the grid to `DNGN_ENTER_SHOP`), 6571 and 6584 (`make_spec_shop` does not set the grid; it creates `env.shop[where]`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Record a landmark the first time its cell is seen; overwrite on re-see | Only notable terrain qualifies (show.cc 204) |
| Key the records by (level, cell); iterate in key order | level_id order: branch, then depth (level-id.h 79) |
| Move the record with the feature; forget the old cell unless it is a branch entrance | Branch entrances excluded from forget (154) |
| Forget on destruction, from every map at once | Also clears stash-tracker and shopping-list entries (694-698) |
| Group the list by zone; wrap a new line only at a zone boundary | List width 79 - 17 = 62 characters (610); wrap check at a new level (618) |
| Cap per zone | "at most 5 shops per level" (605): a comment, not enforced in the list code |
| Jump key to the seen kind | '$' runs a stash search for "shop" (771); the search was not read |

## 4. TypeScript sketch

simplified: the sketch keeps the record-on-sight, move, forget and grouped-list shape for one kind of record, and uses one typed map where the donor has one map per kind. It omits the dispatch (altars, branch-entrance sets, portals, zot statue), the connected-branch gate, the branch-entered check, the copy of portal notes, the stash-tracker and shopping-list side effects, the 62-column wrap, the '$' jump, and the level annotations. The list orders by (y, x) inside a zone; the donor's order is `level_pos` order, and `coord_def` ordering was not read. `move` copies one record, where the donor copies four maps.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ServiceKind = 'shop' | 'altar' | 'portal' | 'stair';

interface Zone { branch: string; depth: number; }
interface Cell { zone: Zone; x: number; y: number; }
interface Landmark { kind: ServiceKind; label: string; }
interface Entry { cell: Cell; lm: Landmark; }

function sameZone(a: Zone, b: Zone): boolean {
  return a.branch === b.branch && a.depth === b.depth;
}

function zoneLess(a: Zone, b: Zone): boolean {
  return a.branch < b.branch || (a.branch === b.branch && a.depth < b.depth);
}

function cellKey(c: Cell): string {
  return `${c.zone.branch}:${c.zone.depth}:${c.x},${c.y}`;
}

class LandmarkIndex {
  private seen = new Map<string, Entry>();

  // Called when a cell comes into view. Non-landmark cells are not recorded.
  see(cell: Cell, lm: Landmark | null): void {
    if (lm === null) return;
    this.seen.set(cellKey(cell), { cell, lm }); // re-seeing overwrites with the current label
  }

  // Called when a landmark moves: the record is copied to the new cell, then the old cell is forgotten.
  move(from: Cell, to: Cell): boolean {
    const hit = this.seen.get(cellKey(from));
    if (!hit) return false;
    this.seen.set(cellKey(to), { cell: to, lm: hit.lm });
    this.forget(from);
    return true;
  }

  // Called when a landmark is destroyed or replaced by something else.
  forget(cell: Cell): void {
    this.seen.delete(cellKey(cell));
  }

  // Seen landmarks of one kind: zones in sorted order, cells in (y, x) order inside a zone.
  list(kind: ServiceKind): Array<{ zone: Zone; items: Entry[] }> {
    const rows = [...this.seen.values()]
      .filter((e) => e.lm.kind === kind)
      .sort((a, b) => {
        if (!sameZone(a.cell.zone, b.cell.zone)) {
          return zoneLess(a.cell.zone, b.cell.zone) ? -1 : 1;
        }
        return a.cell.y - b.cell.y || a.cell.x - b.cell.x;
      });
    const groups: Array<{ zone: Zone; items: Entry[] }> = [];
    for (const e of rows) {
      const last = groups[groups.length - 1];
      if (last !== undefined && sameZone(last.zone, e.cell.zone)) {
        last.items.push(e);
      } else {
        groups.push({ zone: e.cell.zone, items: [e] });
      }
    }
    return groups;
  }
}
```

## 5. Lands in

- TARGET `origins/client/landmark-index.ts` (new client module for the zone minimap and map; proposed path, not checked against the Frankendom repo). The index is client state only.
- Parity-checklist row 14 (HUD: minimap and map). Not a fight row: the registry does not decide any hit.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine; zones as data, so landmarks come from zone data); the HUD is client-only per the rulings; rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch was written from the described mechanism and is not a line-by-line translation.
- Fog rule (not a kill rule): the registry is only honest if the server sends a service when its cell is in view. Otherwise a client can read unseen services from the payload. The Frankendom rulings do not say whether the server withholds unseen services, so this needs a decision before the module is built.
- Defects, with the fix for each (the idea is kept):
  1. dgn-overview.cc 810 dereferences `shop_at(pos)->type` with no null check. I did not verify whether `shop_at` can return null at that call. Fix: skip the record when there is no shop at the cell.
  2. dgn-overview.cc 618: the wrap test runs only when a new level starts, so one level with many shops overflows the 62-column width. Fix: wrap per entry.
  3. dgn-overview.cc 605: the "at most 5 shops per level" limit is a comment and is not enforced in the list code. Fix: make the cap a zone data field, checked at placement.
  4. Stale records. The donor clears a record on a permanent terrain change (terrain.cc 1391, whatever the player can see) and on destruction (shopping.cc 1626). The other terrain-change path at terrain.cc 1362-1376 calls `seen_notable_thing` for the new feature but does not call `unnotice_feature` for the old one in the lines I read (the function's name and its callers were not read). Fix: give each record a last-seen tick, and have the UI treat a record as stale until its cell is seen again.
- Placement half (not fully read): the donor places shops from vault grid cells (dungeon.cc 5794-5797, one spec per cell). The keeper name, stock fill and greed multiplier (6579 onward) were not read. For Frankendom the shape to take is "one zone cell, one service, its own spec", which is zone data; the spec contents are not checked here.
- Not read: `StashTrack.search_stashes` (the '$' jump's target), the shopping list, and the callers at mon-util.cc 1036 and map-knowledge.cc 578.
- Town and city: the donor has no town hub, road or building grammar, and no landmark drawing. tilesdl.cc 1237 places the minimap in a layout slot; the minimap drawing was not read. Per-level annotation text (auto-updated when a tracked feature count changes) was seen but is not written up here.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
MINOR.
- Header said `seen_notable_thing` has 'two live callers'; a third exists at map-knowledge.cc 578.
- `unnotice_feature` callers also include mon-util.cc 1036 (was listed as unread).
- Placement half (dungeon.cc 5794-5797, 6571-6584) verified correct; nothing major missed.

Fixed 2026-10-12: caller counts corrected in the Checked line and the Entry bullet; mon-util.cc 1036 described.
