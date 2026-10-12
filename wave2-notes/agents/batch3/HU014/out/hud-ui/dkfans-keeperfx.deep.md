# dkfans-keeperfx (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/frontmenu_ingame_evnt.c` (draw) with the timer in `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_creature.c` and the hit sites in `thing_stats.c` and `creature_states.c` | Licence: GPL-2.0-or-later (LICENSE: GNU GPL version 2; source headers: "either version 2 of the License, or (at your option) any later version"; clean-room only) | C | symbol `draw_battle_head` (with `health_bar_turns`)

Checked: read `draw_battle_head` (frontmenu_ingame_evnt.c 212-251: icon, flash, health bar, XP flower), the two battle-list loops that call it (262-281 and 326-344; loops at 273 and 336, calls at 279 and 342), the three hit sites that set the timer (`apply_health_to_thing_and_display_health` thing_stats.c 963-968; `apply_damage_to_thing_and_display_health` thing_creature.c 6231-6244; `remove_health_from_thing_and_display_health` creature_states.c 4280-4285), the countdown inside `update_creature` (thing_creature.c 6498 head, 6643-6644), the dispatch table (thing_list.c 74) and `update_thing` / `update_things` heads (thing_list.c 3399, 1359), `MESSAGE_BATTLERS_COUNT` (creature_battle.h 31), `gui_blink_rate` default and cfg assignment (gui_draw.c 51; config_keeperfx.c 646), and the GPL header. Callers checked: `draw_battle_head` is called from the two battle-list loops only (279, 342). The caller of `update_things` and the game turn rate were NOT read (my grep did not find it). `apply_health_to_thing` was read only from its return (955-962 region); its gate above 955 was not read. Candidates opened: frontmenu_ingame_evnt.c, thing_stats.c, thing_creature.c, creature_states.c, thing_list.c, gui_draw.c, config_keeperfx.c, creature_battle.h (8 files). The hinted file `config/fxdata/lua/bindings/gui.lua` is the WRONG file: it is a 181-line Lua type-stub for objective-box calls (DisplayObjective, QuickObjective and similar), not HUD code. Not read: `frontmenu_ingame_tabs.c` 1487 (another health-bar draw, grep only), `frontmenu_ingame_map.c` (minimap, grep only), `power_hand.c` (hover and pick, grep only), the battle-list builder, the "over" highlight logic. Confidence: high on the timer rules and the bar formula (read end to end, receipted); medium on the real-time rate of the countdown (turn rate not read). `camera_scope` not applicable.

Best transferable idea: a target's health frame is shown only for a fixed short hold after any real change to its health (damage, heal or drain), each new change restarts the hold rather than stacking it, and the frame blinks while the hold runs, so a quiet enemy shows no frame at all.

Decision (proposed): adapt — keep the restart-not-stack hold and the blink as the Frankendom enemy target frame rule; fix the integer floor (a living enemy always shows at least 1 px) and make the flash colour say which way health moved (the donor uses the owner's player colour for every event). Why: in a many-on-one fight the frame must show only the enemies that were just touched, and the timer does that on the client; the health value shown comes from the server state, so the frame stays client-only and adds no server rule.
Acceptance: in a fight with three enemies, only the enemies hit, healed or drained in the last 8 ticks show a health frame; a damage flash is red and a heal flash is green; a living enemy never shows an empty bar; a second hit restarts the 8-tick count; a client test asserts the frame clears 8 ticks after the last event with no new event.

## 1. Mechanism

- Three event sites set the same timer to 8 (`health_bar_turns`), but only when the event really changed health:
  - heal (thing_stats.c 963-968): the timer is set only if `apply_health_to_thing` returns true (965-966). That function sets health to at most max health and returns true after doing so (955-962 read).
  - damage (thing_creature.c 6231-6244): the timer is set only if the damage dealt is above zero (6240-6241).
  - drain (creature_states.c 4280-4285): only if health is not negative and the delta is above zero (4282); the delta is then subtracted (4283) and the timer set (4284).
- Countdown: `update_creature` (thing_creature.c 6498) decrements the timer by one each time it runs, never below zero (6643-6644). `update_creature` is in the per-type table (thing_list.c 74), dispatched by `update_thing` (3399), which is called at thing_list.c 1097 and 1344; `update_things` (1359) has a creatures zone (1370). The full call chain and how often it runs per game turn were not read.
- Draw (`draw_battle_head`, frontmenu_ingame_evnt.c 212): the battle-list loops call it once per battler (273-279 friendly, 336-342 enemy). The creature's icon is drawn in its owner's flash colour when the timer is above zero and `(get_gameturn() % (2 * gui_blink_rate)) >= gui_blink_rate` (227); otherwise in plain colour (229-231). So with rate 1 the icon flashes on alternate turns while the hold runs.
- Health bar (243): a 16 x 6 unit black box, then a 2-unit-tall fill whose width is `((12 * health)/max_health)` (integer division, floored), scaled by units per pixel. Health is clamped to zero first (238-239) and max is at least 1.
- XP flower: drawn after the bar from the creature's experience level (read; after the bar).
- Scale: `units_per_px` comes from the panel width (the panel is the target frame), so the head grows with the panel, not the screen.
- Blink rate: default 1 turn (gui_draw.c 51), set from the cfg file (config_keeperfx.c 646; the upper clamp at 160 was read in the same block).

Numbers: hold 8 countdown steps; blink period 2 x rate, lit on the second half; bar 12 units; 8 battle slots per visible battle with 7 drawn (creature_battle.h 31; loop bound 273, 336).

## 2. Key functions

- `draw_battle_head`: `/mnt/frankendom-donors/dkfans-keeperfx/src/frontmenu_ingame_evnt.c` 212-251. Icon flash, health bar, XP flower.
- `apply_health_to_thing_and_display_health`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` 963-968. Heal sets the hold.
- `apply_damage_to_thing_and_display_health`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_creature.c` 6231-6244. Damage sets the hold.
- `remove_health_from_thing_and_display_health`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_states.c` 4280-4285. Drain sets the hold.
- `update_creature`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_creature.c` 6498 onward; the countdown at 6643-6644.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Show a frame for a fixed hold after a real change; restart, do not stack | 8 countdown steps (thing_stats.c 966; thing_creature.c 6241; creature_states.c 4284) |
| Blink while the hold runs, in the second half of each period | period 2 x blink rate; default rate 1 (gui_draw.c 51; frontmenu_ingame_evnt.c 227) |
| Health bar as a fraction of a fixed width | 12 units in a 16-unit box (frontmenu_ingame_evnt.c 243) |
| Battle strip with a fixed number of heads | 8 slots per battle, 7 drawn per side (creature_battle.h 31; 273, 336) |

Defects (keep the idea, fix the defect):
- Integer floor on the bar: `((12 * health)/max_health)` (243) gives 0 when health is below max/12 but still above zero, so a living enemy can show an empty bar. Fix: a live enemy keeps at least 1 px (the sketch does this).
- One flash for every event: the icon flashes in the owner's player colour (227) whether the health went down, up or was drained, so the player cannot tell which way it moved. Fix: flash colour by event (red damage, green heal, purple drain). The sketch does this.
- 7 of 8 battle slots drawn (273, 336). The reason is not read; it may reserve a slot. Fix: name the reserved slot in the code, or draw all 8.

## 4. TypeScript sketch

simplified: keeps the donor's three rules (a real change restarts the hold, every update counts it down, the flash runs in the second half of the blink period) and the bar formula. It fixes the floor (1 px while alive) and the flash colour (by event). It omits: the icon, the XP flower, the owner colour, the battle list and its loops, the "over" highlight, the drain's negative-health check (the caller passes `changed` for it), and the real time base (the donor counts once per creature update, the sketch counts whatever ticks the caller passes).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Frame { hold: number; }       // turns left to show the health frame
type EventKind = "damage" | "heal" | "drain";

const HOLD_TICKS = 8;                   // data: donor health_bar_turns = 8 per event
const BLINK_RATE = 1;                   // data: donor gui_blink_rate (cfg value; default 1)
const BAR_WIDTH_PX = 12;                // data: donor bar fill is 12 px at reference scale

// An event that really changed health restarts the hold; it does not add to it.
function onEvent(f: Frame, changed: boolean): Frame {
  return changed ? { hold: HOLD_TICKS } : f;
}

// Every creature update counts the hold down by one, never below zero.
function tick(f: Frame): Frame {
  return f.hold > 0 ? { hold: f.hold - 1 } : f;
}

// The frame flashes while the hold is running and the turn is in the second half of each blink period.
function flashOn(f: Frame, turn: number): boolean {
  return f.hold > 0 && turn % (2 * BLINK_RATE) >= BLINK_RATE;
}

// fix: the donor's integer floor can draw an empty bar for a living creature; a live creature keeps at least 1 px.
function barPx(health: number, maxHealth: number): number {
  const max = Math.max(1, maxHealth);
  const hp = Math.max(0, health);
  if (hp === 0) return 0;
  return Math.max(1, Math.floor((BAR_WIDTH_PX * hp) / max));
}

// fix: the donor flashes every event in the owner's colour; here the flash colour says which way health moved.
function flashColour(kind: EventKind): string {
  if (kind === "damage") return "red";
  if (kind === "heal") return "green";
  return "purple";
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/HU014-keeper-frame.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/target-frame.ts` (new, client HUD: per-enemy hold timer, blink and bar width; reads health from the server state and never changes it).
- Parity-checklist row 14 (HUD: target frame and panels).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: rule 1 (one engine; the frame is client-only and reads server health); hud-ui fold-ins: target frame, readability (a frame per touched enemy, not a bar per enemy)

## 6. Gaps and risks

- The timer runs in game turns inside the creature update. Frankendom counts server ticks; the hold of 8 must be re-expressed in ticks or milliseconds, and the donor's turn rate was not read.
- Many-on-one: the battle strip shows one head per battler, up to 7 per side. Frankendom's cap is MAX_ATTACKERS = 3, so a head per attacker fits; the donor has no roster cap of three.
- The hold is client display state. Health shown comes from the server; the frame must never decide a kill or a hit.
- Readability at 375 wide: the donor scales the whole head to the panel width (units per pixel from the panel). A 12-unit bar at phone width may be only a few pixels; the acceptance test must check it at 375 px.
- Death and respawn presentation: the frame is not read to the end of life (a dead creature's head is not checked for a death state). Not read.
- The hinted file (gui.lua) is a Lua type-stub for objective boxes; no HUD logic in it.
- Other fold-ins not read: minimap (`frontmenu_ingame_map.c`, grep only), the second health-bar draw in `frontmenu_ingame_tabs.c` 1487 (grep only), hover and pick (`power_hand.c`, grep only), touch UX (none found by a quick grep of the frontend files; not read in full).
- Lock-on and input buffer: not in this donor's HUD code; the pick logic is in `power_hand.c` (not read).
- String tables and localisation: `lang/` has 28 entries including the campaigns folder and `gtext_*.po` files; the message text comes from `gtext_***.dat` in the chosen language (per the comments near the top of gui.lua). Entries not counted; grammar not read.
- Where seen: idle animation vocabulary and boss intro were not read in this donor.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: rule 1 (one engine; the frame is client-only and reads server health); hud-ui fold-ins: target frame, readability (a frame per touched enemy, not a bar per enemy)
