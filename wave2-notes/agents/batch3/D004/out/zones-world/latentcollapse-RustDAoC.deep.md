# latentcollapse-RustDAoC (zones-world, cell 7)

Donor: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-world/src/zones.rs` (`zone_at` 91-105, `world_from_local` 119-128, `zone_id_from_packet` 111-113; table in `caer-world/src/zone_offsets.rs`) | Licence: GPL-3.0-or-later (`Cargo.toml` `[workspace.package] license`; the `LICENSE` file is the GPL v3 text) | Rust | symbol `zone_at`

Checked: Read in full: `caer-world/src/zones.rs` (1-187). Read for context: `caer-world/src/zone_offsets.rs` (1-22, the table format; row existence checked by grep), `caer-world/src/grid.rs` (1-236, the spatial index that uses the same zone-sized cell, read for the related note in section 6), `caer-world/src/world_data.rs` (1-98), the ingest path `caer-world/src/lib.rs` (1488-1506), `caer-render/src/lib.rs` (255-275, the region bounding box), `caer-render/src/terrain.rs` (700-716, the probe), `caer-protocol/src/session.rs` (118-128, the object-removal comment). Not read: the terrain decode (`caer-assets/src/heightmap.rs`, `caer-assets/src/terrain.rs`, the body of `caer-render/src/terrain.rs`), `dungeon_zones.rs` beyond its header, `zone_names.rs`. So the zone frame and zone membership are covered end to end; terrain loading is not. Confidence high on the frame arithmetic (the donor's golden test checks it, lines 144-150); the overlap rule is read but its donor tests cover only two centres (163-175). camera_scope: not a camera cell.

Best transferable idea: Store each zone as one row (id, region, grid offset) and place every entity by adding its zone-local coordinates to the zone's offset times a fixed cell size, so one world frame serves all zones and a zone lookup is O(1).
Decision (proposed): adapt - adopt the frame and the table (zone-local plus cell offset gives the world; O(1) id lookup); adapt the overlap rule into an explicit, tested rule; reject the donor's silent id masking (section 6).
Acceptance: A server test loads the zone table and asserts that zone 0 (Camelot Hills, offset 67/59) with zone-local (12511, 26346) gives world (561375, 509674); that an id of 512 or more resolves to no zone; and that a point inside two overlapping zones resolves to the zone with the nearer centre.

## 1. Mechanism

- One world frame. A zone's grid offset `(ox, oy)` is in cells; the world position of a zone-local point `(lx, ly)` is `(ox * 8192 + lx, oy * 8192 + ly)`, and `z` is absolute (zones.rs 3-8; `world_from_local` 119-126, the add at 122).
- Zone id from a packet. The server writes the low 8 bits in the zone byte; the ninth bit is in flags bit `0x04`, shifted up by 6 (zones.rs 107-112). The ingest path rebuilds the id, then the world position, on each object update (lib.rs 1498-1499). `world_from_local` has no other caller in the donor (grep for the name finds only the ingest and the module's own tests).
- Offset lookup. Zone ids are below 512, so the donor builds a 512-slot table at compile time from the generated rows (zones.rs 22-43, the fill at 37-38). Lookup masks the id with 511 and returns none for an unmapped slot (zones.rs 47-54). An unknown zone falls back to treating the local coordinates as world coordinates (zones.rs 126).
- Zone membership, `zone_at(region, x, y)` (zones.rs 91-105), in this order: walk the zones of the region (the table is sorted by id); a zone holds the point when it lies inside the square `[ox*8192, ox*8192+65536)` by `[oy*8192, oy*8192+65536)` (95); among the zones that hold it, keep the one whose centre `(x0+32768, y0+32768)` has the smallest squared distance, with a strict less-than so the earlier (lower) id wins a tie (98-101); return none in a gap.
- Consumers of `zone_at`: the on-screen zone title (`caer-render/src/main.rs` 1039), three call sites in `rustdaoc.rs` (4193, 4689, 5505; not read in full), and the terrain probe (`caer-render/src/terrain.rs` 708). The bounding box of a region uses the same 65,536 span (`caer-render/src/lib.rs` 268).
- Table. 476 rows of `(zone_id, region_id, offset_x, offset_y)` generated from the server's Zones table (zone_offsets.rs 1-9; zones.rs 136 asserts the count). Offsets are only meaningful within a region (zone_offsets.rs 4-5).

## 2. Key functions

- `zone_at`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-world/src/zones.rs` 91-105. Point to zone, nearest centre among overlaps.
- `world_from_local`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-world/src/zones.rs` 119-128. Zone-local to world, with the unknown-zone fallback.
- `zone_id_from_packet`: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-world/src/zones.rs` 111-113. The ninth id bit from flags.
- `offset_of` and the 512-slot table: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-world/src/zones.rs` 22-54.
- Ingest: `/mnt/frankendom-donors/latentcollapse-RustDAoC/crates/caer-world/src/lib.rs` 1498-1499 (inside `apply_update`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| World = cell offset times cell size, plus local | Cell 8192 world units (theirs, zones.rs 18) |
| Zone local extent (membership square) | 65,536 units, the u16 local range (theirs, zones.rs 95) |
| Nearest-centre tie-break for overlaps | Centre offset 32,768 (half of 65,536) (theirs, zones.rs 98) |
| O(1) id lookup in a fixed table | 512 slots for 9-bit ids (theirs, zones.rs 20-22) |
| Ninth id bit from a flag | Flags bit 0x04, shifted by 6 (theirs, zones.rs 112) |
| Table size, checked by test | 476 zones (theirs, zones.rs 136; zone_offsets.rs 9) |
| Golden check | Zone 0 at offset 67/59 with local (12511, 26346) gives (561375, 509674) (theirs, zones.rs 147-148) |

Arithmetic check: 67 * 8192 + 12511 = 561375, and 59 * 8192 + 26346 = 509674. The donor's test asserts the same.

## 4. TypeScript sketch

simplified: The sketch keeps the frame (zone-local plus cell offset times the cell size), the packet's ninth-bit rule, the rectangle membership and the nearest-centre rule with the lower id winning ties. It differs from the donor in two places, on purpose. (a) The donor fills its table only for ids below 512 (zones.rs 37) and masks lookups with 511 (48), so an id of 512 silently returns zone 0's offset; the sketch throws when the table is built with an out-of-range id and returns undefined for an out-of-range lookup. (b) Rows are kept in id order by sorting the input, which the donor gets from its generated table. It omits the region-scoped unknown-zone fallback path, the generated table, the region bounding box, the terrain probe and the spatial index (grid.rs), which uses the same cell size.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const ZONE_UNIT = 8192;   // world units per grid cell
const ZONE_SPAN = 65536;  // a zone's local extent (u16 local range)
const LUT_SIZE = 512;     // zone ids are 9 bits

interface ZoneRow { id: number; region: number; ox: number; oy: number; } // offsets in grid cells

// Zone id from an entity packet: low byte, plus the 9th bit from flags 0x04.
function zoneIdFromPacket(zoneByte: number, flags: number): number {
  return (zoneByte & 0xff) | ((flags & 0x04) << 6);
}

class ZoneFrame {
  private readonly byId: (ZoneRow | undefined)[] = new Array(LUT_SIZE);
  private readonly rows: ZoneRow[];

  constructor(rows: ZoneRow[]) {
    this.rows = [...rows].sort((a, b) => a.id - b.id);
    for (const r of this.rows) {
      if (!Number.isInteger(r.id) || r.id < 0 || r.id >= LUT_SIZE) {
        throw new Error(`zone id out of range: ${r.id}`);
      }
      this.byId[r.id] = r;
    }
  }

  // Explicit range check: an id >= LUT_SIZE returns undefined, it does not alias onto another zone.
  get(id: number): ZoneRow | undefined {
    if (!Number.isInteger(id) || id < 0 || id >= LUT_SIZE) return undefined;
    return this.byId[id];
  }

  // World position from zone-local coordinates. Unknown zone: local coordinates pass through.
  worldFromLocal(id: number, lx: number, ly: number, z: number): [number, number, number] {
    const r = this.get(id);
    if (!r) return [lx, ly, z];
    return [r.ox * ZONE_UNIT + lx, r.oy * ZONE_UNIT + ly, z];
  }

  // Zone under a world point in one region. Among the zones whose rectangle holds the point,
  // the nearest centre wins; a tie keeps the lower id (rows are sorted by id).
  zoneAt(region: number, x: number, y: number): number | undefined {
    let best: number | undefined;
    let bestD2 = Infinity;
    for (const r of this.rows) {
      if (r.region !== region) continue;
      const x0 = r.ox * ZONE_UNIT;
      const y0 = r.oy * ZONE_UNIT;
      if (x < x0 || x >= x0 + ZONE_SPAN || y < y0 || y >= y0 + ZONE_SPAN) continue;
      const dx = x - (x0 + ZONE_SPAN / 2);
      const dy = y - (y0 + ZONE_SPAN / 2);
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = r.id; }
    }
    return best;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/zones/zone-frame.ts` (zone table as data, one world frame, engine-side; the client reads the same table). Parity-checklist row 23 (zone population). Row 23 covers population; this mechanism is the frame under it, not the spawn logic (section 6).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: zones as data on one runtime; row 23 frame; rule 7 (clean-room, GPL)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is copied.
- Silent aliasing. `offset_of` and `zone_region` mask the id with 511 (zones.rs 48, 59), and the table is built only for ids below 512 (37). So an id of 512 returns zone 0's offset (slot 0). The packet path cannot produce such an id, because the zone id is at most 9 bits (zones.rs 112 and the comment at 20). A direct call can. The donor's unknown-zone test (zones.rs 184-186) uses id 9999, which masks to slot 271; the generated table has no zone 271 (grep of zone_offsets.rs), so the test passes because that slot is empty, not because the lookup rejects out-of-range ids. Frankendom should reject out-of-range ids explicitly.
- Overlap by construction. The membership square is 65,536 units but the offset step is 8192, so two zones overlap when both their x and y offsets differ by fewer than eight cells. The donor's comment says frontier zones overlap (zones.rs 87-88) and resolves them by nearest centre. The donor's tests check only two points, the Camelot Hills and Snowdonia centres (zones.rs 163-172), not a real overlapping pair. Frankendom must test an overlapping pair.
- Region is not checked on the frame. `world_from_local` takes no region (zones.rs 119). It is correct only because zone ids are unique across regions. Frankendom's ids must be unique across regions too, or the frame must carry the region.
- Cost. `zone_at` scans every zone of the region on each call (zones.rs 93), up to 476 rows. The callers I read are the title (main.rs 1039) and the probe (terrain.rs 708); the per-entity ingest path uses `world_from_local`, not `zone_at` (lib.rs 1498-1499). Frankendom must not call `zone_at` per entity inside the server tick (row 18 sub-line "per-tick NPC budget") without an index.
- Population: no logic in the donor. Grep for respawn, despawn, spawn caps and grace timers finds none. `world_data.rs` loads a static dump with stationary spawns (world_data.rs 44). The only removal is the server's ObjectDelete (session.rs 124-127). So row 23 has nothing to copy beyond this frame; the spawn director, caps, respawn and despawn-on-empty must be designed fresh.
- Related, not this cell: `caer-world/src/grid.rs` (uses cell 8192 per lib.rs 301) returns the exact k nearest by widening rings until the k-th distance is inside ring times cell (grid.rs 126). It stops at ring 4096 (grid.rs 142) and returns fewer than k without saying so. That is a candidate for the many-on-one nearest-k selection (MAX_ATTACKERS = 3). It needs its own note under a combat or AI cell; I did not write one here.
- Terrain loading is not covered by this note (section Checked).

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
Brief rule served: zones as data on one runtime (Frankendom ruling); row 23 frame; rule 7 (clean-room, GPL)
