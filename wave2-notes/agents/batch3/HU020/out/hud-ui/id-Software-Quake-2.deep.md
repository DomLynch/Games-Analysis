# id-Software-Quake-2 (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/client/cl_scrn.c` | Licence: GPL-2.0-or-later (cl_scrn.c header: "either version 2 of the License, or (at your option) any later version"; the tree's gnu.txt is GPL v2) | C | symbol `SCR_ExecuteLayoutString`

Checked: Symbol `SCR_ExecuteLayoutString` at cl_scrn.c 941, read 941-1225 in full (all 20 tokens, the `if`/`endif` skip, the loop end). Also read: SCR_DrawField 870-900 (read 880-900 and the signature), SCR_DrawStats 1236-1238, SCR_DrawLayout 1250-1254, G_SetStats p_hud.c 377-528 in full, the status-bar strings g_spawn.c 600-850 (read 600-640, 640-800, 830-850; 800-830 not read), p_view.c 80-92, console.c 495-526 (Con_DrawNotify, partly), q_shared.c 1072-1100 (COM_Parse head only). Callers: `SCR_ExecuteLayoutString` is called at cl_scrn.c 1238 (status bar) and 1254 (cl.layout); no other caller found in client/ by grep. The function that calls `SCR_DrawStats` (cl_scrn.c 1376) was (not read); the callers of `G_SetStats` were (not read), so how often the server writes the stats is not confirmed. Searched for minimap, radar, touch, lock-on and locale across client, game, qcommon, server, ref_gl and ref_soft: no HUD hits. The hint file client/menu.c is the menu system; grepped, not read. Camera scope: not applicable (HUD). Confidence: high on the layout grammar, the colour bands and the dead ammo-flash bit (grep for FLASHES over game, client and qcommon: the server sets only bits 1 and 2, p_view.c 85-89); medium on the alert period, which assumes the server frame advances once per FRAMETIME (game/g_local.h 73 says 0.1; the advance was not read).

Best transferable idea: Describe the HUD as a short list of anchored panels bound to named stats, each with ordered colour bands and a per-frame flash plate, so one table drives every mode and the 375-wide phone layout is data.
Decision (proposed): adapt - keep the data-driven panel table (anchors, stat binds, ordered bands, flash plates) as a client module fed by the engine snapshot; reject sending the layout program from the server, because the HUD is client-only; the donor's dead ammo-flash bit and the digit-truncation defect are fixed in the sketch.
Acceptance: At 375 wide with health 25 the health number flashes green/red; at health 0 it is solid red; with armour 0 the armour panel is absent; a server test asserts the engine snapshot sets the ammo flash bit when ammo drops; a unit test shows a 1234 value in a 3-digit field as 999, not 123.

## 1. Mechanism

- The status bar is a program, not a fixed layout. The server writes it into the configstring CS_STATUSBAR once, when the world entity spawns (g_spawn.c 839-842): `dm_statusbar` if deathmatch is on, else `single_statusbar` (strings at g_spawn.c 648 and 706). The client re-interprets the program every frame it draws the status bar (cl_scrn.c 1238).
- The program is a flat token list with three kinds of token. Cursor tokens set the drawing point: `xl` (x from left), `xr` (x from right: viewW + value, line 972), `xv` (x on a 320-wide canvas centred in the viewport: viewW/2 - 160 + value, line 978), `yt` (y from top), `yb` (y from bottom: viewH + value, line 991), `yv` (centred on a 240-high canvas). Draw tokens draw: `pic <stat>` (image index taken from a stat), `picn`, `num <width> <stat>`, `hnum`/`anum`/`rnum` (health, ammo, armour with colour bands), `string`/`string2`/`cstring`/`cstring2`, `stat_string <stat>` (a configstring whose index is in a stat), and the scoreboard blocks `client` and `ctf`. The one control token is `if <stat> ... endif`.
- Colour bands. Health (cl_scrn.c 1114-1119): value > 25 is green; value > 0 alternates between green and red using `(serverframe>>2) & 1` (line 1117); value <= 0 is red. Ammo (1134-1139): value > 5 is green; value >= 0 alternates the same way; a negative value draws nothing. Armour (1153-1154): value < 1 draws nothing, otherwise green.
- Backing plates. The server sets `STAT_FLASHES` each frame (game/p_view.c 85): bit 1 when blood damage landed (87), bit 2 when armour took damage and the player is not in godmode and not invincible (88-89). The client draws a plate behind health when bit 1 is set (1121), behind armour when bit 2 is set (1159). The ammo plate tests bit 4 (1141). Nothing sets bit 4, so the ammo plate can never show (defect, fixed in the sketch).
- Digit fields. SCR_DrawField (cl_scrn.c 870-900) clamps the width to 5 (line 880), formats the value with `%i` (886), and when the text is longer than the field it draws the first `width` characters (888-893). So a 4-digit value in a 3-digit field loses its low digits (defect, fixed in the sketch). Shorter text is right-aligned (890).
- Conditional blocks. `if N` reads stat N; if it is zero the reader skips tokens until the first `endif` (1208-1217). Blocks cannot nest: the first `endif` ends the skip (defect, the sketch uses a gate per panel instead).
- Pickup toast. On pickup the server sets the item icon and the name configstring and a timer of level.time + 3.0 (g_items.c 780-782). G_SetStats clears both when level.time passes that timer (p_hud.c 440-443). level.time is framenum x FRAMETIME (g_main.c 359).
- Death presentation (deathmatch). G_SetStats sets STAT_LAYOUTS bit 1 when health is <= 0, at intermission, or when the scoreboard is shown (p_hud.c 492-494). SCR_DrawLayout draws cl.layout while that stat is set (cl_scrn.c 1250-1254), so a dead player's HUD is replaced by the scoreboard. The content builder DeathmatchScoreboardMessage (p_hud.c 164) was (not read). Single-player bit 1 is set by the scores or help screen (p_hud.c 501).
- Mode content. The deathmatch program adds frags (`xr -50`, `num 3 14`), a "SPECTATOR MODE" string when stat 17 is set, and a "Chasing" line with stat_string 16 for the chase camera (g_spawn.c 740-800, read). The single-player program has the same health/ammo/armour/timer/help row without frags.

## 2. Key functions

- `SCR_ExecuteLayoutString`: `/mnt/frankendom-donors/id-Software-Quake-2/client/cl_scrn.c` 941-1225. The whole interpreter: cursor tokens, draw tokens, colour bands, `if`/`endif`. Receipts: 941, 972, 978, 991, 1114, 1117, 1134, 1136, 1141, 1214.
- `SCR_DrawField`: `/mnt/frankendom-donors/id-Software-Quake-2/client/cl_scrn.c` 870-900. Digit field, width clamp and overflow. Receipts: 890, 893.
- `SCR_DrawStats` / `SCR_DrawLayout`: `/mnt/frankendom-donors/id-Software-Quake-2/client/cl_scrn.c` 1236-1254. Status bar program (CS_STATUSBAR) and the layout string (cl.layout), gated by STAT_LAYOUTS. Receipt: 1238.
- `G_SetStats`: `/mnt/frankendom-donors/id-Software-Quake-2/game/p_hud.c` 377-528. Writes every stat the program reads. Receipts: 377, 387, 401.
- Flash bits: `/mnt/frankendom-donors/id-Software-Quake-2/game/p_view.c` 85-89. Receipts: 85, 87, 89.
- Program strings: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_spawn.c` 648-800 (single and deathmatch) and 839-842 (which one is sent). Receipts: 648, 706, 839, 840, 842.
- Tokenizer: `/mnt/frankendom-donors/id-Software-Quake-2/game/q_shared.c` 1072-1100 (`COM_Parse`, returns "" and sets the pointer to NULL at the end). Receipts: 1072, 1084.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Anchor a panel to the left, right or centre, and to the top or bottom edge | Canvas 320 wide (cl_scrn.c 978: viewW/2 - 160); `xr` counts from the right (972); `yb` counts from the bottom (991) |
| Ordered colour bands on one value; first band that matches wins; no match hides the panel | Health: > 25 green, > 0 alert, <= 0 red (1114-1119). Ammo: > 5 green, >= 0 alert, < 0 hidden (1134-1139). Armour: < 1 hidden (1154) |
| Alert colour alternates on a bit of the server frame counter | `(serverframe>>2) & 1` (1117): toggles every 4 server frames. FRAMETIME 0.1 (game/g_local.h 73), so about 0.4 s per colour if the server frame advances once per FRAMETIME (assumed, see Checked) |
| Backing plate flashes on a per-tick event bit | Bit 1 health (p_view.c 87), bit 2 armour (89), bit 4 ammo read at 1141 and never set |
| Gate a panel on a stat being non-zero | `if N ... endif` (1208-1217) |
| Number field: right-aligned; overflow keeps the first digits | Width max 5 (880); overflow draws the first `width` characters (893) |
| Timed pickup message | 3.0 s on level.time (g_items.c 782); level.time = framenum x FRAMETIME (g_main.c 359) |
| Notify lines fade after N seconds | con_notifytime default 3 (console.c 315), compared x1000 against cls.realtime (518; cls.realtime not read, the x1000 implies milliseconds) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order of operations for each panel (gate, anchor, first matching band, alert colour, plate, digits) and turns the three number rules into data. It omits the image and configstring lookups (an icon is an index only, nothing is drawn), the item-pickup and timer panels, the frags, spectator and chase lines, the scoreboard blocks (`client`, `ctf`), the DrawHUDString line wrap, the dirty-rectangle bookkeeping and the `pic` range check. Defects fixed in the sketch: the ammo plate bit is set by the engine (`flashBits`), an over-range number clamps to all 9s instead of dropping the low digits (`fieldText`), and a mistyped panel kind is a compile error instead of a silently skipped token. Nested blocks are not supported (the donor's are not nested either). The 320 canvas is kept as the donor's; the sketch does not scale it to a 375-wide phone.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Band = { above: number; colour: 'green' | 'flash' | 'red' }; // first band with value > above wins; no band matched = hidden
type XAnchor = 'left' | 'centre' | 'right';
type YAnchor = 'top' | 'bottom';

interface PanelBase {
  name: string;
  xa: XAnchor; dx: number;   // offset from the anchor, in virtual px
  ya: YAnchor; dy: number;
  stat: string;              // which stat drives the panel
  gateStat?: string;         // panel shows only while this stat is non-zero
}
interface NumberPanel extends PanelBase { kind: 'number'; digits: number; bands: Band[]; flashBit?: number; }
interface IconPanel extends PanelBase { kind: 'icon'; }
type Panel = NumberPanel | IconPanel;

interface Snapshot { stats: Record<string, number>; flashes: number; serverFrame: number; }
type Colour = 'green' | 'red';
type DrawOp =
  | { name: string; x: number; y: number; kind: 'number'; text: string; colour: Colour; plate: boolean }
  | { name: string; x: number; y: number; kind: 'icon'; icon: number };

const VIRTUAL_W = 320; // the status bar is laid out on a 320-wide canvas, centred in the viewport
const FLASH_HEALTH = 1;
const FLASH_ARMOUR = 2;
const FLASH_AMMO = 4;

function anchorX(a: XAnchor, dx: number, viewW: number): number {
  if (a === 'left') return dx;
  if (a === 'right') return viewW + dx;
  return viewW / 2 - VIRTUAL_W / 2 + dx;
}

function anchorY(a: YAnchor, dy: number, viewH: number): number {
  return a === 'top' ? dy : viewH + dy;
}

// Number text in a field `digits` wide. Over-range values clamp to all 9s; they never drop the low digits.
function fieldText(value: number, digits: number): string {
  const max = 10 ** digits - 1;
  if (value > max) return '9'.repeat(digits);
  if (value < -max) return '-' + '9'.repeat(digits - 1);
  return String(value).padStart(digits, ' ');
}

// 'flash' alternates between green and red every 4 server frames.
function resolveColour(band: 'green' | 'flash' | 'red', serverFrame: number): Colour {
  if (band === 'flash') return ((serverFrame >> 2) & 1) === 1 ? 'red' : 'green';
  return band;
}

// Pure: one draw list per frame from the panel data and the snapshot.
function layoutFrame(panels: Panel[], snap: Snapshot, viewW: number, viewH: number): DrawOp[] {
  const ops: DrawOp[] = [];
  for (const p of panels) {
    if (p.gateStat !== undefined && (snap.stats[p.gateStat] ?? 0) === 0) continue;
    const x = anchorX(p.xa, p.dx, viewW);
    const y = anchorY(p.ya, p.dy, viewH);
    const value = snap.stats[p.stat] ?? 0;
    if (p.kind === 'icon') {
      if (value !== 0) ops.push({ name: p.name, x, y, kind: 'icon', icon: value });
      continue;
    }
    const band = p.bands.find(b => value > b.above);
    if (band === undefined) continue;
    ops.push({
      name: p.name, x, y, kind: 'number',
      text: fieldText(value, p.digits),
      colour: resolveColour(band.colour, snap.serverFrame),
      plate: p.flashBit !== undefined && (snap.flashes & p.flashBit) !== 0,
    });
  }
  return ops;
}

// Engine side: flash bits are set per tick. Fix: bit 4 (ammo) is set when the ammo count drops.
function flashBits(hitHealthThisTick: boolean, hitArmourThisTick: boolean, ammoDropped: boolean): number {
  return (hitHealthThisTick ? FLASH_HEALTH : 0) | (hitArmourThisTick ? FLASH_ARMOUR : 0) | (ammoDropped ? FLASH_AMMO : 0);
}

// Data, not code: the single-player status row as three number panels on the bottom-left of the 320 canvas.
const statusRow: Panel[] = [
  {
    name: 'health', kind: 'number', xa: 'left', dx: 0, ya: 'bottom', dy: -24, stat: 'health', digits: 3,
    bands: [{ above: 25, colour: 'green' }, { above: 0, colour: 'flash' }, { above: -Infinity, colour: 'red' }],
    flashBit: FLASH_HEALTH,
  },
  {
    name: 'ammo', kind: 'number', xa: 'left', dx: 100, ya: 'bottom', dy: -24, stat: 'ammo', digits: 3, gateStat: 'ammoIcon',
    bands: [{ above: 5, colour: 'green' }, { above: -1, colour: 'flash' }],
    flashBit: FLASH_AMMO,
  },
  {
    name: 'armour', kind: 'number', xa: 'left', dx: 200, ya: 'bottom', dy: -24, stat: 'armour', digits: 3, gateStat: 'armourIcon',
    bands: [{ above: 0, colour: 'green' }],
    flashBit: FLASH_ARMOUR,
  },
];
```

## 5. Lands in

- TARGET `src/fight/hud-layout.ts` (new client module, data plus a pure `layoutFrame`; the HUD is client-only and reads the engine snapshot, it does not send anything). Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 8 (sections 5 and 6 against the rulings: client-only HUD, one engine snapshot, zones as data)

## 6. Gaps and risks

- Do not send the program from the server. The donor sends a presentation program as a configstring, so the HUD can change per mode without a client release. Frankendom's rulings make the HUD client-only, so keep only the idea: a per-mode table in the client, fed by the engine snapshot.
- The flash plates come from blood and armour damage events on the server (p_view.c 85-89). Frankendom's flashes must come from the server-verified hit event in the duel step, not from a local guess. This is row 14 against row 1.
- The donor's armour plate is suppressed in godmode and invincibility (p_view.c 88). Frankendom needs the same rule for any invulnerable state, or the plate lies.
- Defects in the donor (kept idea, fixed in the sketch): (a) the ammo plate tests bit 4, which nothing sets (cl_scrn.c 1141; fix: set bit 4 when ammo drops, `flashBits`); (b) an over-range number drops its low digits (cl_scrn.c 893; fix: clamp to all 9s, `fieldText`); (c) a mistyped token falls through every branch with no error, and its argument is then read as the next token, so a word argument can be misparsed (the chain in cl_scrn.c 963-1225 has no default branch; fix: typed panel kinds, a compile error); (d) a bad stat index or image index calls ERR_DROP and disconnects the player (cl_scrn.c 1005, 1172; fix: clamp and report, never disconnect).
- The 320 canvas is centred, not scaled: at 375 wide the canvas starts 27.5 px in from each edge (viewW/2 - 160, cl_scrn.c 978) and the panels do not grow with the phone. Fix: scale the canvas to the safe frame for the viewport; not in the sketch.
- The alert period is in server frames, so it depends on the server rate. Frankendom should time it on the client clock or in engine ticks, and test it.
- Deathmatch replaces the whole HUD with the scoreboard on death (p_hud.c 492-494, cl_scrn.c 1250-1254). That is a loss presentation worth keeping in the idea (the HUD gives way to the result), but the scoreboard builder (p_hud.c 164) was not read.
- Coverage fold-ins (hud-ui), from this donor. Minimap and world map: none (grep for minimap and radar, no hits). Touch UX: none (grep for touch hits game triggers and SCR_TouchPics, which is a precache). Input buffer and lock-on: no lock-on. The only buffer is the chat line (client/keys.c 390-427, read by grep only). Accessibility: not searched beyond the hint file. Localisation: there is no locale file; strings are C literals (menu.c grepped, not read). The only string grammar is the layout language: 20 tokens in the reader (cl_scrn.c 963-1208) plus `endif`; three designed tokens are listed in an `#if 0` block but not built (`statpic`, `ifeq`, `ifbit`; g_spawn.c 635-643).
- Where seen: the idle state is a static row of values, with no animation; the pickup toast lasts 3 s (g_items.c 782); a flashing value is the only alert animation (cl_scrn.c 1117); the mode labels "SPECTATOR MODE" and "Chasing" are data strings in the program (g_spawn.c 740-800). Readability at 375: the donor's icons are drawn in a 24 px box (each icon adds a dirty rectangle 23 px from its origin in the pic and picn blocks, read); digit fields are 2 + CHAR_WIDTH x width wide; there are no touch targets.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 8 (sections 5 and 6 against the rulings)
