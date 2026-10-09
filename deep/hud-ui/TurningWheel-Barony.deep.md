# TurningWheel-Barony (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp | Licence: BSD-2 | C++ | symbol createHPMPBars / createEnemyBar / createXPBar

## 1. Mechanism

- Bars are built once per player. `createHPMPBars` builds the HP and MP frames (fade layer, progress layer, end caps, value text). `createEnemyBar` builds one floating enemy bar (base layer, damage-ghost layer, progress layer). `createXPBar` builds the XP bar with a per-player colour sprite.
- Per frame, `Player::HUD_t::processHUD` (12507-12755) creates any missing frame (minimap, timer, XP, HP/MP, enemy bar frames, status queue and others, 12683-12734), then calls `updateXPBar`, `updateHPBar`, `updateMPBar` (12740-12742; the three call lines are too short to receipt), culls expired enemy entries (`cullExpiredHPBars`, not read) and calls `updateEnemyBar2` for each remaining one (12747-12753).
- `updateHPBar` (33482-33831) sets the background width from max HP: while `MAXHP` is below `hpmpbarMaxWidthAmount` the width multiplier is a base percent plus a step per whole interval of max HP past a start value (integer division). Defaults at lines 108-112 are 160, interval 5, start 20, base 30, step 2.5; the JSON loader overrides them (from line 26157). Its inputs are `stats.MAXHP`, `stats.HP`, and those values.
- HP foreground: a loss snaps the bar down and starts a flash (33559-33568). A gain eases toward the setpoint by 1/20 of the gap per tick, scaled to a 144 fps reference, and snaps when within 1 point (33577-33595). A second "faded" layer is the damage ghost: after a loss it holds for 30 ticks since `animateTicks`, then eases down by 1/20 of the gap at the same 144 fps scale (33614-33628); a gain pulls it up to the foreground.
- Enemy bars are added when an entity takes damage (`updateEnemyBar`, called from damage sites in entity.cpp, actmonster.cpp and others). Each entry tracks its enemy uid, HP and a fade state.
- `updateEnemyBar2` keeps a bar visible while it is live. Expiry (32649-32680) needs: animating this frame, not shown on the HUD frame, not already expired, `animator.setpoint <= 0`, and the quick-fade delay elapsed (default `TICKS_PER_SECOND / 2`, `interface.cpp` 163). Then, if the local player (or any live local splitscreen player) is within `shortDistanceHPBarFadeDistance * 16` world units (default 1.0 tile, line 164) of the bar, the entry expires. Expired bars fade their opacity down by 10 per tick at a 60 fps reference (32695), then the entry is culled by `cullExpiredHPBars` (not read). The meaning of `animator.setpoint` was not traced. If the enemy entity no longer exists, the bar's `enemy_hp` is set to 0 (32618-32621). Bar width also scales with the enemy's max HP through a breakpoint table (32727-32747, defaults 0.5 at 10 HP up to 1.0 at 1000 HP), which the sketch omits.
- Only the local player shows its HUD: `processHUD` disables the frames when paused, `nohud`, or not a local player (12631-12636), and `updateEnemyBar2` returns for a non-local player (32595). Output: frame positions, sizes and opacity. No sim state changes.

## 2. Key functions

| Name | Absolute VPS path | Lines | What it does |
|---|---|---|---|
| createHPMPBars | /mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp | 717-867 | Builds HP and MP bar frames once: fade, progress, end caps, value text |
| createEnemyBar | /mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp | 4283-4381 | Builds a floating enemy bar with a damage-ghost layer, opacity 0 at start |
| createXPBar | /mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp | 4421-4557 | Builds the XP bar; body sprite chosen by player index |
| Player::HUD_t::processHUD | /mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp | 12507-12755 | Per-frame order: create missing frames, update XP, HP, MP, then enemy bars |
| Player::HUD_t::updateHPBar | /mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp | 33482-33831 | HP width from max HP, foreground ease, damage flash, damage ghost (opened to line 33660; the rest, the ghost opacity fade on death and the MP-style tail, not read) |
| Player::HUD_t::updateEnemyBar2 | /mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp | 32583-33096 | Per-enemy position, fade and expiry by distance (opened to line ~32760; the rest not read) |
| Player::HUD_t::updateXPBar | /mnt/frankendom-donors/TurningWheel-Barony/src/ui/GameUI.cpp | 31290-31727 | XP setpoint is `min(100, EXP)` (line 31376); show/hide fade; level and class text (opened to ~31380; the rest not read) |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bar width shrinks for high max HP: base multiplier plus a step per interval past a start value | Base percent 30, step 2.5, interval 5, start value 20, full-width threshold 160 (defaults at lines 108-112, overridden by the JSON loader) (theirs) |
| Loss snaps down and flashes; gain eases by 1/N of the gap per tick | Ease divisor 20 (theirs); 144 fps reference (theirs) |
| Snap when within 1 point of setpoint | 1 point (theirs) |
| Fade by a fixed decrement per tick, scaled to frame rate, clamped at 0 | Decrement 10 at a 60 fps reference (theirs) |
| Expire when the local player is within a distance and a delay has passed | Quick-fade delay default `TICKS_PER_SECOND / 2` (key quick_fade_delay_ticks, `interface.cpp` 163) and distance default 1.0 tile x 16 (line 164) (theirs) |

## 4. TypeScript sketch

Lift: the logic is lifted from the path above (BSD-2 permits it). The sketch keeps the structure and names, not the original lines.

simplified: the faded damage-ghost layer (hold 30 ticks, then ease down) is omitted, the donor's snap-down when the foreground is above the setpoint without a fresh loss (33609-33612) is omitted, the compact-width variants of the config values are collapsed to one set, and the expiry test (delay, distance, splitscreen loop) is not included; only the fade-out step is.

```ts
// Licence: BSD-2
// Lifted from TurningWheel-Barony, src/ui/GameUI.cpp: updateHPBar (width multiplier, ease) and updateEnemyBar2 (fade).

interface HpBarState { foreground: number; previousSetpoint: number; flashTicks: number | null; }

// Width multiplier; the interval count uses integer division, as in the source.
function barWidthMultiplier(maxHp: number, basePct: number, stepPct: number, threshold: number, start: number, maxWidth: number): number {
  let multiplier = 1.0;
  if (maxHp < maxWidth) {
    multiplier = basePct / 100;
    multiplier += (stepPct / 100) * Math.floor(Math.max(0, maxHp - start) / threshold);
  }
  return multiplier;
}

// Loss snaps down and flashes; gain eases toward the setpoint and snaps when close.
function updateHpForeground(state: HpBarState, hp: number, tickNow: number, fpsScale144: number): void {
  if (hp < state.previousSetpoint) {
    state.foreground = hp;
    state.flashTicks = tickNow;
  } else if (state.foreground < hp) {
    const gap = Math.max(0, hp - state.foreground);
    state.foreground = Math.min(hp, state.foreground + fpsScale144 * (gap / 20));
    if (Math.abs(hp - state.foreground) <= 1) state.foreground = hp;
  }
  state.previousSetpoint = hp;
}

// Opacity for an expired bar: drop by a fixed amount per tick, clamped at 0.
function fadeOpacity(current: number, expired: boolean, fpsScale60: number): number {
  if (!expired) return 100;
  return Math.max(0, current - 10 * fpsScale60);
}
```

## 5. Lands in

- Frankendom: TARGET `src/fight/hud.ts` (HP bar, damage ghost, number text), today: `src/hud.ts` (moving); the damage flash pairs with hit impact (`src/fight/`, row 10).
- Parity checklist row 14 (HUD). Row 10 (hit impact/hitstop) for the damage flash.
- Reuse tag: adapt
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The donor's enemy bar is fed by `updateEnemyBar` calls at damage sites in the simulation files (entity.cpp, actmonster.cpp, actarrow.cpp and others; whether a remote client gets them over the network was not traced), and the ghost layer is local animation. Frankendom must draw only the server-sent HP, with no predicted damage on the bar.
- The foreground HP bar snaps down on a loss, and the damage ghost layer eases down after 30 ticks (33614-33628), so the number never leads the server value on a loss. On a gain the foreground eases up and the displayed bar can lag the server HP. Frankendom must decide whether that is acceptable.
- Enemy bars are keyed by entity uid and expire by camera distance. A 1v1 duel has one enemy and a fixed camera; keep the duel path simple and drop the per-enemy list.
- The enemy bar sets HP to 0 when its entity is missing (32618-32621), a purely local rule. Under server-verified kills, the HP shown at 0 must come from the server's death event.
- Width scaling uses max HP and the config values above. Frankendom values come from its own catalogue data (zones as data), not these constants.
- The HUD is client-side display only and does not touch the sim, which fits the one-engine ruling; with MAX_ATTACKERS = 3 the Frankendom enemy list is at most three bars.
