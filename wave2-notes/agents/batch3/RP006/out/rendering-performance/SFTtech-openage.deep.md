# SFTtech-openage (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/SFTtech-openage/libopenage/renderer/font/glyph_atlas.cpp` | Licence: GPL-3.0-or-later (per `copying.md` lines 3-4: GNU GPL Version 3, "or (at your option) any later version", "GPL3+"; file headers say "Copyright 2015-2024/2015-2021 the openage authors") | C++ | symbol `GlyphAtlas::set`

Checked: `glyph_atlas.h` (read in full) and `glyph_atlas.cpp` (read in full, 156 lines): the shelf type (17-37), `bind` and the dirty upload (66-79), `get` and its cache (81-98), `set` (100-145), `update_dirty_area` (147-154). Callers: a repo-wide grep for `GlyphAtlas` finds only its own two files, so the atlas has no caller in this snapshot (the drawing code that binds it is not in the donor). The licence is read from `copying.md`. Confidence: high on the packing and the upload order (read end to end, nothing run); medium that the mechanism is in use anywhere, since it has no caller here. Not read: `font.h` and `Font::load_glyph` (where the glyph bitmap comes from), the `Glyph` struct, `hash_combine`, any test for this file. `camera_scope` not applicable. Note on verdict: this is a small, complete packer rather than a large system; it is STRONG under the addendum's "simple is not weak" rule, and that call is made with that caveat.

## 1. Mechanism

- A single CPU byte buffer (one channel, `width x height`, 1024 x 1024 by default: header line 50) backs one GL texture. Glyphs are packed into it, never moved or freed (no eviction).
- Packing, in order (`set`, cpp 100-145):
  (a) Each glyph is padded by one pixel on the right and the bottom: `required_width = width + 1`, `required_height = height + 1` (101-103).
  (b) The first glyph opens shelf 0 at y = 0, with the height of that glyph's padded box (105-107).
  (c) First fit: scan the shelves in creation order (109). A shelf takes the glyph if the padded height is not more than its height and the remaining width covers the padded width (`check_fits`, cpp 26-31). The glyph's x is the width already used (`reserve`, cpp 33-37), the shelf's remaining width shrinks, and the glyph's rectangle and UV corners are stored (111-120).
  (d) The glyph pixels are copied row by row into the CPU buffer (122-128), and the dirty region grows to include the glyph (129).
  (e) If no shelf fits, a new shelf opens below the last one, but only if the bottom edge stays strictly inside the atlas (136-138), and the call recurses once for that shelf (140). If there is no room, it throws "Not enough space in the atlas" (143-144; a TODO says resizing is not done).
- Cache: a `get(font, codepoint)` looks up an `unordered_map<size_t, Entry>` keyed by a combined hash of the font description and the codepoint (81-98). On a hit the stored entry returns (84-85). On a miss the glyph is loaded from the font and packed (88-90).
- Upload (`bind`, cpp 66-79): nothing is uploaded when a glyph is added. When the texture is bound, if the atlas is dirty, one `glTexSubImage2D` sends the rows from the dirty top to the dirty bottom, full width (71-74), and the dirty region is reset (76-77). Many glyph additions between two binds become one upload. The dirty x range is tracked (150-152) but not used in the upload call.
- The shelf height is fixed when the shelf opens. A later glyph that is taller than the shelf does not fit it and opens a new shelf (check_fits line 27).

## 2. Key functions

- Packing: `/mnt/frankendom-donors/SFTtech-openage/libopenage/renderer/font/glyph_atlas.cpp` 100-145 (`set`), 17-37 (shelf create, fit test, reserve).
- Cache: same file, 81-98 (`get`, `get_cache_key`).
- Upload: same file, 66-79 (`bind`), 147-154 (`update_dirty_area`).
- Declarations: `/mnt/frankendom-donors/SFTtech-openage/libopenage/renderer/font/glyph_atlas.h` 50 (constructor defaults), 120 (`buffer`), 130 (`shelves`), 19 (the algorithm name in the class comment).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Shelf first-fit packing into one texture | Atlas 1024 x 1024 by default (theirs, glyph_atlas.h:50) |
| Padding so filtered sampling does not bleed between glyphs | One pixel right and bottom (theirs, glyph_atlas.cpp:101-103) |
| Shelf height fixed by the first glyph | Shelf height = first glyph height + 1 (theirs, cpp:106) |
| Coalesced dirty upload, once per bind | One sub-image per bind when dirty (theirs, cpp:70-74) |
| Cache by font and codepoint | Hash of font description and codepoint (theirs, cpp:93-96) |
| Fixed size, no eviction | None; throws when full (theirs, cpp:143-144) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: pad by one pixel, first fit over shelves in creation order, open a new shelf below the last one, store the rectangle, grow one dirty rectangle, and return it once per frame. It fixes four donor faults: the new-shelf test is strictly greater (cpp 137), so a shelf that fills the last rows is refused; a glyph wider than the atlas opens empty shelves and then throws a misleading "not enough space" (cpp 136-144), so the sketch rejects it at once; the upload covers full width, though x is tracked (cpp 71-73, 150-152), so the sketch returns the x range too; and the cache key is a hash with no equality check (cpp 93-98), so the sketch keys by an exact string. The sketch omits the pixel buffer and the GL calls (the browser side uploads the returned rectangle with its own texture call), the `Font` loader, the UV conversion (`u0`, `v0`, `u1`, `v1`, cpp 117-120), and the throw path's recovery (the donor has no resize or second page; the sketch throws, and a second atlas page is the planned fix in section 6).

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Shelf {
  y: number;       // top row of the shelf
  height: number;  // height set by the first glyph that opened the shelf (plus padding)
  used: number;    // width already taken on this shelf (plus padding)
}

export class ShelfAtlas {
  private readonly shelves: Shelf[] = [];
  private readonly entries = new Map<string, Rect>();
  private dirty: { x0: number; y0: number; x1: number; y1: number } | null = null;

  constructor(
    readonly width = 1024,
    readonly height = 1024,
    private readonly pad = 1, // one pixel on the right and bottom of each glyph
  ) {}

  // Returns the rectangle for `key`, packing the glyph if it is new. Throws when the atlas is full.
  get(key: string, w: number, h: number): Rect {
    const hit = this.entries.get(key);
    if (hit) return hit;

    const rw = w + this.pad;
    const rh = h + this.pad;
    if (rw > this.width) throw new Error(`glyph ${key} is wider than the atlas`); // fail at once, open no shelf for it

    // first fit: shelves in creation order, the first one with height and width to spare
    let shelf = this.shelves.find((s) => rh <= s.height && this.width - s.used >= rw);
    if (!shelf) {
      const last = this.shelves[this.shelves.length - 1];
      const top = last ? last.y + last.height : 0;
      if (top + rh > this.height) throw new Error("atlas is full"); // the donor tests with a strict > here
      shelf = { y: top, height: rh, used: 0 };
      this.shelves.push(shelf);
    }

    const rect: Rect = { x: shelf.used, y: shelf.y, w, h };
    shelf.used += rw;
    this.entries.set(key, rect);
    this.markDirty(rect);
    return rect;
  }

  // Once per frame, before drawing: the changed rectangle to upload, or null when nothing changed.
  // The caller uploads only these rows (with a row length), not the whole texture.
  takeDirty(): { x0: number; y0: number; x1: number; y1: number } | null {
    const d = this.dirty;
    this.dirty = null;
    return d;
  }

  private markDirty(r: Rect): void {
    const x1 = r.x + r.w;
    const y1 = r.y + r.h;
    if (!this.dirty) {
      this.dirty = { x0: r.x, y0: r.y, x1, y1 };
    } else {
      this.dirty = {
        x0: Math.min(this.dirty.x0, r.x),
        y0: Math.min(this.dirty.y0, r.y),
        x1: Math.max(this.dirty.x1, x1),
        y1: Math.max(this.dirty.y1, y1),
      };
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/hud-atlas.ts` (new; client-only). It packs the small text and icon glyphs the HUD draws, such as damage numbers, nameplates and lock-on labels, into one texture, and uploads only the changed rectangle once per frame. The engine never reads it. Parity-checklist row 14 (HUD).
- The hint row 12 (combat sound cues) does not fit. Row 14 is used.
- Reuse tag: adapt-idea (GPL-3.0-or-later; clean-room, shape only; no lines copied)
- Brief rule served: the licence rule (GPL-3.0-or-later, clean-room, shape only); client-only presentation, the engine untouched.

## 6. Gaps and risks

- Defect 1, memory type: `buffer` is declared `std::unique_ptr<unsigned char>` (glyph_atlas.h:120) and allocated with `new unsigned char[...]` (glyph_atlas.cpp:47). Freeing an array through a scalar `unique_ptr` is undefined behaviour. Fix: `std::unique_ptr<unsigned char[]>`. The sketch keeps no pixel buffer, so this does not arise there.
- Defect 2, off-by-one at the bottom edge: a new shelf needs `height > top + rh` (cpp 137), so a shelf whose bottom lands exactly on the last row is refused. Fix: `>=` (the sketch uses `top + rh > this.height` to refuse).
- Defect 3, upload width: the dirty rows are uploaded at full width (cpp 71-74) although the dirty x range is tracked (cpp 150-152). For a 1024-wide atlas and a few glyphs this copies far more than needed. Fix: upload the rectangle with a row length (the sketch returns x0..x1).
- Defect 4, misleading failure: a glyph wider than the atlas opens an empty shelf on every recursion (cpp 136-140) before the "Not enough space" throw (cpp 144). Fix: reject it first (sketch line).
- Defect 5, cache identity: the key is a `size_t` hash with no equality check (cpp 93-98). A collision would return another glyph's entry. Fix: key by the exact font id and codepoint.
- Defect 6, legacy wrap mode: `GL_CLAMP` (cpp 52-53) is not the modern name; `GL_CLAMP_TO_EDGE` is. Minor.
- Gap, no eviction or second page: the code throws when full (cpp 143-144, TODO). Glyphs are cached per font and codepoint (cpp 93-98), so a HUD that draws only digits and a few fixed names never fills it; a large set of player names in many scripts could. Frankendom needs a second page (a new texture) or a size-limited eviction for unused glyphs; the sketch throws, and the page fix is for the port.
- Trade-off, shelf height: a shelf keeps the height of the glyph that opened it (cpp 106; check_fits 27). A taller glyph later opens a new shelf, and short glyphs can waste the rest of a tall shelf. Acceptable for a HUD font, measure before reuse.
- Not read: `font.h` and `Font::load_glyph`, the `Glyph` struct, and `hash_combine`. The atlas has no caller in this snapshot, so its real update frequency is not known.

Best transferable idea: pack the HUD's small glyphs or icons into a shelf atlas with one pixel of padding, and upload only the changed rectangle once per frame, not one upload per label.
Decision (proposed): adapt — the shelf packer and the one-upload-per-frame rule suit HUD labels that spawn in bursts (damage numbers, nameplates); the donor's full-width upload, off-by-one and unsafe buffer type are fixed in the sketch, and the missing second page is added before the atlas is used in a fight.
Acceptance: in a fight test with 40 damage numbers spawned in one frame, the HUD issues at most one texture upload that frame, and its rectangle covers only the new glyph rows (the test reads the upload count and rectangle, expecting 1 and the dirty box); when the current page is full, a new page opens instead of an exception.

Reuse tag: adapt-idea (GPL-3.0-or-later; clean-room, shape only)
Brief rule served: licence rule (GPL-3.0-or-later, clean-room); client-only presentation, the engine untouched
