# ValveSoftware-halflife (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/ammohistory.cpp | Licence: Valve SDK licence (proprietary, read-only) | C++ | symbol HistoryResource::AddToHistory / DrawAmmoHistory

## 1. Mechanism

- A small pickup feed in the bottom-right corner of the HUD. It shows recent ammo pickups, weapon pickups and item pickups, each as a sprite (and a count for ammo), stacked upward from the bottom.
- Input: an event passed in by the caller (call sites found by grep at `ammo.cpp` 516, 527, 538; their bodies were not read), giving a type (ammo, weapon, item), an id or sprite name, and a count. Zero-count ammo events are dropped.
- Storage: a fixed array of 12 slots (`MAX_HISTORY`, `ammohistory.h` 98) written in order with a cursor. When the next row would go above the top of the screen or the array is full, the cursor wraps to slot 0 and overwrites older entries. Each entry carries an expiry time set to now plus the draw time, re-read from the `hud_drawhistory_time` cvar on every add (default 5, line 36). In the item overload the cursor is advanced before the sprite-name lookup, so an unknown name consumes a slot without filling it (lines 77-83).
- Each draw pass: for each live slot the expiry is clamped to now plus the draw time, an expired entry is cleared (and `CheckClearHistory` resets the cursor to 0 once every slot is empty), otherwise it is drawn by type. A row's y position comes from its slot index, not its age (lines 132, 159, 177).
- Fade: brightness = (expiry minus now) times 80, clamped to 255. The last few seconds fade out.
- Weapon rows turn red when the weapon has no ammo (153-154). A weapon whose data has not arrived stops the whole draw pass for that frame (`return 1`, line 148, not a skip). An ammo row whose sprite is not loaded still draws its number (134-141); an item row with id 0 is skipped (168-169).
- Output: sprite draws and number draws only. No state change to the game.

## 2. Key functions

- `HistoryResource::AddToHistory` (ammo overload), `/mnt/frankendom-donors/ValveSoftware-halflife/cl_dll/ammohistory.cpp`, lines 46-64. Writes an ammo entry, wraps the cursor, sets expiry.
- `HistoryResource::AddToHistory` (item overload), same file, lines 66-91. Looks up the sprite by name; drops unknown names.
- `HistoryResource::CheckClearHistory`, same file, lines 94-103. Resets the cursor when every slot is empty.
- `HistoryResource::DrawAmmoHistory`, same file, lines 108-188. Expiry clamp, fade, per-type draw, stacked positions.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed ring of feed slots that wraps when the next row would leave the screen | Gap = history gap + 5 (line 31), pick height = 32 + 2 x history gap (32), max height = screen height - 100 (33), 12 slots (theirs) |
| Expiry timestamp, clamped on each draw, cleared when past | Draw time default 5 seconds, then the `hud_drawhistory_time` cvar (lines 36, 58) (theirs) |
| Brightness fade from remaining time: (expiry minus now) times a rate, clamped | Rate 80 and cap 255 (lines 128-129) (theirs) |
| Colour by state: normal, or red when empty | Yellowish and reddish palette values (theirs) |

## 4. TypeScript sketch

simplified: the donor keeps a separate history gap value and per-type sprite lookups, draws each row at a y set by its slot index, uses two clocks (the add/clamp uses the HUD time, the expiry test the draw call's time; the sketch uses one `now`), and its item overload advances the cursor before the name lookup (a dropped item still burns a slot); sprite drawing, weapon-missing early return and the red state are omitted.

```ts
// Licence: Valve SDK licence (proprietary, read-only) - clean-room sketch, no lines translated
// Clean-room: a pickup feed of fixed slots with wrap, expiry, and a fade from remaining time. Written from the mechanism only.
type Entry = { kind: 'ammo' | 'weapon' | 'item'; id: number; count: number; expiresAt: number } | null;

const SLOTS = 12; // donor MAX_HISTORY
const slots: Entry[] = new Array(SLOTS).fill(null);
let cursor = 0;

// Where the next row would sit, measured in rows from the bottom.
function rowFits(row: number, rowGap: number, pickHeight: number, maxHeight: number): boolean {
  return rowGap * row + pickHeight <= maxHeight;
}

// Add an entry, wrapping the cursor when the next row would leave the screen.
function addEntry(e: Entry, now: number, drawTime: number, rowGap: number, pickHeight: number, maxHeight: number): void {
  if (!e) return;
  if (!rowFits(cursor, rowGap, pickHeight, maxHeight) || cursor >= SLOTS) cursor = 0;
  slots[cursor++] = { ...e, expiresAt: now + drawTime } as Entry;
}

// Each draw pass: clamp expiry, clear finished entries, and return brightness per live row.
function drawPass(now: number, drawTime: number): { row: number; kind: string; brightness: number }[] {
  const out: { row: number; kind: string; brightness: number }[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const s = slots[i];
    if (!s) continue;
    s.expiresAt = Math.min(s.expiresAt, now + drawTime);
    if (s.expiresAt <= now) { slots[i] = null; continue; }
    const brightness = Math.min(255, Math.floor((s.expiresAt - now) * 80));
    out.push({ row: i, kind: s.kind, brightness });
  }
  if (slots.every((x) => x === null)) cursor = 0;
  return out;
}
```

## 5. Lands in

- Frankendom target: `src/fight/hud.ts` (the pickup feed), today: `src/hud.ts` (moving). Parity checklist row 14 (HUD) for the draw; row 18 (loot roll and XP award) for the source event, which the server sends from the one ledger.
- Reuse tag: rewrite-from-idea (Valve SDK licence, read-only: mechanism only, nothing lifted).
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor overwrites slot 0 on wrap even if it is still live, and an unknown item name burns a slot. Frankendom must decide whether a live entry can be overwritten and must not burn slots on dropped events.
- A weapon event whose data has not arrived stops the whole pass for that frame. Frankendom should skip the row, not the pass.
- The feed shows whatever count its caller passes (the message handler bodies were not read). Under Frankendom's one-ledger ruling, the count comes from the server ledger and the HUD only shows it.
- Expiry uses the client clock. Frankendom must not use the feed's timing for any fight or loot decision.
- Licence is proprietary; the sketch is written from the mechanism only and must stay that way.
