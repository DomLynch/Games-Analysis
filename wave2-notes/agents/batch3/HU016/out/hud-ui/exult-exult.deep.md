# exult-exult (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/exult-exult/gumps/Face_stats.cc` (plus `actors.cc` hit flash, `exult.cc` loop) | Licence: GPL-2.0-or-later (per the Face_stats.cc header: "either version 2 of the License, or (at your option) any later version"; the COPYING file is the GPLv2 text) | C++ | symbol `Face_stats` / `Stat_bar` / `Portrait_button`

Checked: Hint file `exultmenu.cc` is the title/main menu (`create_main_menu`, `show_mods_menu`), not the HUD; not used. Real HUD read: `gumps/Face_stats.cc` 74-158 (Stat_bar, read in full), 164-348 (Portrait_button: ctor 197-216, update 248-281, paint 282-340, badge 342-348), 441-549 (create_buttons, read to the layout branches and the party slots), 696-734 (mode cycle and config), `actors.cc` 2640-2656 (Clear_hit), 2762-2849 (apply_damage), 2912-2964 (reduce_health read to the flash; the function runs to 3116, and the final health store after 2956 is (not read)), `exult.cc` 1329-1525 (Handle_events; read 1329-1373 and 1436-1443), `gumps/Gump_manager.cc` 822-826. Confidence high on the portrait bars, the status outline and the hit flash; medium on the layout-mode edge (mode 4) because I read the branch chain, not a run. (not read): Gump_button base class, `paint_outline`, `get_effective_prop`, `hud_part_rect`, the left/right split arithmetic for mode 3. Other hud-ui sub-topics in this donor, honest status: no in-game minimap or world map gump exists (minimap code is an editor/cheat export: `gamemap.cc` 1668-1740 seen by grep only, not read); touch UX is `touchui.cc` (67 lines, text input only, read) plus the Android layer `android/lib/src/TouchUI_Android.cc` (not read); lock-on is only `paused_combat_select` (called from Face_stats.cc:231, not read). Camera_scope: not applicable (HUD, not a camera). String table read (fold-in): see section 1 end.

## 1. Mechanism

- One portrait frame per party member, built by `Portrait_button` (a 40 x 35 head shape). Under each head are two bars drawn on the head's lower edge: an HP bar (red) and a mana bar (blue). HP bar fill is `(val * 32) / max`, where `val` is the current health and `max` is the `strength` property (the max-HP stat). The fill is clamped to 32 px and drawn only when it is above 0. The bar is 3 px tall. The mana bar uses `magic` as its maximum and exists only when `magic > 0`. The donor decides this when the frame is built (201), not on every frame.
- Status feedback on the head, in priority order (first match wins): hit flash, charmed, paralyzed, protected, cursed, poisoned. Each draws a coloured outline on the head shape (293-300).
- Badges: a row of small icons, each one 6 px right of the previous (the i-th sits at `i * 6 - 8`, y 11). Order: asleep, poisoned, charmed, hungry, protected, cursed, paralyzed, freezing. "Hungry" shows only when food level is 9 or below and food use is not disabled in the cheat settings (212, 325).
- Hit flash, the whole path: `Actor::apply_damage` (2762) works out damage from strength and weapon, then armour reduces it. If no damage gets through, the outline still flashes and the actor fights back (2838-2844). Otherwise `Actor::reduce_health` (2912) runs. Order inside it: god-mode returns 0 (2921); a monster that cannot die or is immune returns 0; a vulnerable type doubles `delta` (2940-2941); `val` is clamped so health never goes below -50 (2947-2950). Then, for the main actor only, a big hit flashes the screen instead of the outline: `delta >= maxhp / 3`, or `oldhp < maxhp / 4`, or lightning (2955-2958). Every other case sets `hit = true` and queues a clear event 200 ms later (2961-2964). The clear event sets `hit = false` (2653).
- Layout: `Face_stats` is a singleton gump with five stored modes (`mode` 0-4). `create_buttons` (475-500) places the group at the bottom-left (mode 0), centred (mode 1), bottom-right (mode 2), or in two vertical columns, four on each side of the game window (mode 3). Mode 4 has no branch in the chain (482 is the last test), so it lays out like mode 0. `AdvanceState` cycles `mode %= 5` (703); the chosen mode is saved to `config/gameplay/facestats` (726-731).
- Refresh: the main loop calls `update_gumps()` every pass through `Handle_events`, unless `main_actor_dont_move()` is true (1436-1442). `Face_stats::update_gump` (418) updates each portrait. `Stat_bar::update_widget` (151-156) marks a region dirty only when `val` or `max_val` changed, so the bar costs nothing when unchanged.
- Double-click: a bar opens the stats gump (116-118). A portrait opens the bar (if clicked on it), else in paused combat selects the target, else opens the inventory (223-235).
- Clock: `Game::get_ticks()` is SDL milliseconds, set once per loop pass (exult.cc 1365, 1373). So "200" is 200 ms of real time.
- String table (fold-in): `data/exultmsg.txt` holds 904 keyed lines (`0x<hex>:<text>`) with 903 distinct keys (one key appears twice), numeric range 0x500 to 0xB1A, not contiguous, 174 comment lines and 59 blank lines. Translations: German 580 keyed entries, Spanish 136, French 75. The file has no placeholders and no escapes; the grammar is flat key:text. Numbers and plurals are assembled in code: the congratulation line is built from several keyed parts, and the code shows only the years and months that are not zero (`game.cc` 350-365, the code path, not the strings).

## 2. Key functions

- `Stat_bar::paint`: `/mnt/frankendom-donors/exult-exult/gumps/Face_stats.cc` 125-145 (fill width, clamp to 32, fill 3 px tall).
- `Portrait_button::paint`: `/mnt/frankendom-donors/exult-exult/gumps/Face_stats.cc` 282-340 (outline priority at 293-300, bars at 309-312, badge order 316-338).
- `Portrait_button` constructor: `/mnt/frankendom-donors/exult-exult/gumps/Face_stats.cc` 197-216 (bar positions and the mana-bar decision at 199-202, flags and hunger read at 205-212).
- `Face_stats::create_buttons`: `/mnt/frankendom-donors/exult-exult/gumps/Face_stats.cc` 441-549 (layout branches 475-500).
- `Actor::reduce_health`: `/mnt/frankendom-donors/exult-exult/actors.cc` 2912-2964 (read; floor, screen-flash test, outline flash; the function continues to 3116).
- `Clear_hit::handle_event`: `/mnt/frankendom-donors/exult-exult/actors.cc` 2640-2656 (the timed clear).
- Game loop: `/mnt/frankendom-donors/exult-exult/exult.cc` 1329-1525 (read 1329-1373 and 1436-1443).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bar fill = current / max x bar width, clamped, drawn only when above 0 | Bar width 32 px and height 3 px (theirs, Face_stats.cc 128-132, 143) |
| Max for the HP bar is a separate stat (not the current value) | HP max = `strength` property; mana max = `magic` (theirs, 199-202) |
| Mana bar shown only for characters who have a mana pool | Condition `magic > 0` at build time (theirs, 201) |
| Status outline by priority, first match wins | Order: hit, charmed, paralyzed, protected, cursed, poisoned (theirs, 293-300) |
| Hit flash is a timed clear | 200 ms (theirs, actors.cc 2964) |
| Big-hit / low-HP screen flash for the player only | delta >= max/3 or old HP < max/4; integer division (theirs, actors.cc 2956) |
| Health floor for a dead-but-alive frame | -50 (theirs, actors.cc 2947) |
| Hunger badge threshold | Food level <= 9 (theirs, Face_stats.cc 212) |
| Badge row spacing | 6 px per badge, starting at -8 (theirs, 344) |
| Layout modes cycle and persist | 5 stored modes, `mode %= 5` (theirs, 703) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's bar arithmetic, the outline priority order, the badge order and the main-actor screen-flash test. It omits the dirty-rectangle redraw, the head shape and paperdoll lookup, the five layout modes and the left/right split, the god-mode early return and the monster immunity/vulnerability rules, the -50 health floor (it lives in reduce_health), the mana-bar decision at frame build (the sketch reads `maxMana` on every call), the no-damage branch, and the palette flash itself. It changes one thing on purpose: `onHit` keeps the latest flash end, because the donor queues one clear event per hit and the first event can end a later hit's flash early (see section 6).

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const BAR_WIDTH_PX = 32;
const HIT_FLASH_MS = 200;
const HUNGRY_AT_OR_BELOW = 9;
const BADGE_STEP_PX = 6;
const BADGE_X0_PX = -8;

interface PartyFrame {
  health: number;
  maxHealth: number;      // donor: the "strength" property is the max HP
  mana: number;
  maxMana: number;        // donor: the "magic" property; the mana bar exists only when > 0
  hitUntilMs: number;     // outline flash ends at this time (ms, same clock as the game ticks)
  foodLevel: number;
  flags: {
    asleep: boolean; poisoned: boolean; charmed: boolean; protected: boolean;
    cursed: boolean; paralyzed: boolean; freezing: boolean;
  };
}

type Outline = "hit" | "charmed" | "paralyzed" | "protected" | "cursed" | "poisoned";

// Bar fill in whole pixels, truncating division as in the donor. A zero or negative fill draws nothing.
function barFillPx(value: number, max: number): number {
  const w = Math.trunc((value * BAR_WIDTH_PX) / (max > 0 ? max : 1));
  return Math.min(BAR_WIDTH_PX, w);
}

// First match wins. Donor order: hit, charmed, paralyzed, protected, cursed, poisoned.
function outlineFor(f: PartyFrame, nowMs: number): Outline | null {
  if (nowMs < f.hitUntilMs) return "hit";
  if (f.flags.charmed) return "charmed";
  if (f.flags.paralyzed) return "paralyzed";
  if (f.flags.protected) return "protected";
  if (f.flags.cursed) return "cursed";
  if (f.flags.poisoned) return "poisoned";
  return null;
}

// Badges in a row; the i-th badge sits at i * 6 - 8 px.
function badgesFor(f: PartyFrame, hungryEnabled: boolean): { name: string; x: number }[] {
  const names: string[] = [];
  if (f.flags.asleep) names.push("asleep");
  if (f.flags.poisoned) names.push("poisoned");
  if (f.flags.charmed) names.push("charmed");
  if (hungryEnabled && f.foodLevel <= HUNGRY_AT_OR_BELOW) names.push("hungry");
  if (f.flags.protected) names.push("protected");
  if (f.flags.cursed) names.push("cursed");
  if (f.flags.paralyzed) names.push("paralyzed");
  if (f.flags.freezing) names.push("freezing");
  return names.map((name, i) => ({ name, x: i * BADGE_STEP_PX + BADGE_X0_PX }));
}

// Donor queues one clear event per hit, so an earlier event can end a later hit's flash early.
// Here the flash always runs HIT_FLASH_MS past the latest hit.
function onHit(f: PartyFrame, nowMs: number): void {
  f.hitUntilMs = Math.max(f.hitUntilMs, nowMs + HIT_FLASH_MS);
}

// Main actor only: a big hit (delta >= max/3) or low HP (old HP < max/4) or lightning flashes the screen, not the outline.
function screenFlashFor(oldHp: number, delta: number, maxHp: number, lightning: boolean): boolean {
  return delta >= Math.trunc(maxHp / 3) || oldHp < Math.trunc(maxHp / 4) || lightning;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run on /tmp/exult-hud.ts).

## 5. Lands in

- TARGET `src/fight/hud.ts` (new client view model: party and target frames read from engine state; the HUD writes nothing). Parity-checklist row 14 (HUD).
- today: not checked (Frankendom HUD files not opened for this note).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: client-only HUD reads engine state and never writes it; server-verified kills and one ledger (the flash is driven by the engine's hit event, not by client-side damage).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and was not translated line by line.
- Defect (flash cut short): the donor queues one `Clear_hit` per hit (2841-2842, 2963-2964) and each clear sets `hit = false` outright (2653). A second hit 100 ms after the first ends the flash at 200 ms, not 300 ms. fix: keep the latest end time, `hitUntil = max(hitUntil, now + 200)` (in the sketch).
- Quirk (mode 4): the layout cycle has a fifth stored mode that has no branch in `create_buttons`, so it looks the same as mode 0 while still costing one press. fix: drop it from the cycle, or give it its own layout. (Read from the branch chain; not run.)
- Quirk (mana bar): the mana bar is decided when the frame is built (201). A character who gains mana later gets the bar only when the buttons are rebuilt (`UpdateButtons`). fix: build the mana bar from the state every frame.
- Frankendom rulings: HP max here is a per-character stat that is read from the actor; in Frankendom max HP must be an explicit engine field (one ledger). The flash must be driven by the server's hit event with its time, never by a client guess at damage.
- Target frames: this donor shows the party, not enemies. There is no hate list or target frame for many attackers in this file (not read elsewhere). With MAX_ATTACKERS = 3, the enemy frame still needs its own source.
- Readability at 375 px: a 32 px x 3 px bar under a 40 px head is small on a phone. Check it at 375 wide before adopting the size. The outline colours are the only status cue that does not depend on a badge.
- Clock: the 200 ms is real time from SDL (exult.cc 1365). The Frankendom flash should use the same wall clock, not the fight tick, or it will drift when the tick is slow.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: client-only HUD reads engine state and never writes it; server-verified kills and one ledger.

Best transferable idea: a party or target frame whose HP bar is current over max scaled to a fixed pixel width, with one status outline chosen by fixed priority and a 200 ms hit flash that always runs to the latest hit.
Decision (proposed): adapt — take the bar scaling, the outline priority and the timed hit flash; fix the overlapping-hit defect and do not port the five layout modes (one layout for Frankendom; a side-panel layout can come later).
Acceptance: at 375 px wide in a 3-on-1 fight, each party frame shows a 32 px red HP bar that empties as HP falls, and a red outline lasts 200 ms after a hit; a server test asserts that hit events at t=0 and t=100 keep the client's hit state true at t=299 and false at t=300.
