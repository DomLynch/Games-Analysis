# veloren-veloren (hud-ui, cell 16)

Donor: /mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs | Licence: GPL-3 | Rust | symbol Hud::maintain (Hud struct at 1329)

## 1. Mechanism
- Once per client frame, the session calls `Hud::maintain` (caller: /mnt/frankendom-donors/veloren-veloren/voxygen/src/session/mod.rs, ~line 1723) with the client, the camera, the real frame delta `dt`, a `HudInfo` (aiming, first-person, mine tool), and the interactable maps.
- `maintain` first prunes extra map markers the player has wandered away from (100 units past the marker's receive distance), then un-eats a Tab press so tab-complete works, then drops a crafting sprite selection that is out of range or gone.
- If the HUD is hidden (`show.ui` false) it returns only the queued events and does no layout work.
- Otherwise it calls `update_layout`, which builds every widget from current ECS state (the player's health component, floaters, chat, dialogue). It then runs the widget pass with a world-to-screen matrix for world-anchored widgets, and returns a `Vec<Event>` that the session consumes.
- Health pulse (1608-1609): each frame `hp_pulse += dt * 10 / clamp(hp%, 3, 7)`, where hp% is `current / maximum * 100`. So the phase advances about 1.43 rad/s at 7% health or more and about 3.33 rad/s at 3% or less. A zero maximum gives NaN, and `clamp` of NaN stays NaN, which would poison `hp_pulse`.
- Hurt overlay (1610-1617): drawn only when hp < 10% and not dead, with alpha `sin(hp_pulse) * 0.5 + 0.6` (so it exceeds 1 at the peak).
- Floaters age on `dt` and are removed when their timer reaches zero: exp floaters (1817-1821, also a `jump_timer` that counts up), block floaters (1990-1994) and the combo floater (3231-3235, f64). Skill-point floaters were not opened.
- Output: events for the session (UI actions), plus the drawn widget tree. Whether `update_layout` sends anything to the server was not verified; the opened parts do not.

## 2. Key functions
- `Hud::maintain` - /mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs lines 5214-5325. Per-frame entry: prune markers, Tab fix, crafting filter, hidden-UI early return, update_layout, world-space ui.maintain.
- `Hud::update_layout` - /mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs lines 1501-4748 (pulse and hurt overlay at 1606-1618). Builds the widgets from ECS health and state.
- `Hud::new` - /mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs lines 1369-1475 (loads images, fonts, world map layers, hotbar from profile).
- Floater aging - /mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs lines 1817-1822 (exp floaters) and 1990-1995 (block floaters).
- Combo floater aging - /mnt/frankendom-donors/veloren-veloren/voxygen/src/hud/mod.rs lines 3231-3235.
- Caller - /mnt/frankendom-donors/veloren-veloren/voxygen/src/session/mod.rs lines 1715-1735 (builds HudInfo and calls `self.hud.maintain` with the real frame delta; opened).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Frame-driven pulse whose rate scales inversely with a clamped health fraction | Pulse factor 10; clamp window 3 to 7 percent (line 1609) (theirs) |
| Overlay alpha from a sine of the pulse, shown under a low-health threshold | Threshold 10 percent (1610); alpha 0.5 amplitude, 0.6 offset (1611) (theirs) |
| Pruning world-anchored markers by distance from where they were placed | 100 units extra distance (`EXTRA_DISTANCE`, line 5232) (theirs) |
| Hidden-UI early return that still drains the event queue | (none) |
| Timer-decay floaters removed at zero | Timers per floater type (initial values not read) (theirs) |

## 4. TypeScript sketch
Sketch type: clean-room (GPL-3 donor). Written from the mechanism above, no lines translated.

simplified: one function stands in for what the donor spreads across `update_layout` (pulse at 1608, overlay at 1610, floaters at 1817, 1990, 3231), and the pulse is updated even when the UI is off in the sketch only after the early return (the donor also returns before `update_layout` when `show.ui` is false, so the pulse does not advance while hidden); `hpMax <= 0` maps to 0 percent, where the donor gets NaN; marker pruning, Tab fix, crafting-sprite filter and the world-space `ui.maintain` are omitted.

```ts
// Licence: GPL-3 - clean-room sketch, no lines translated
type HudTickInput = { hpCur: number; hpMax: number; isDead: boolean; uiOn: boolean; dtSec: number };
interface HudState { hpPulse: number; hurtAlpha: number; events: string[]; floaterTimers: number[] }

function takeEvents(s: HudState): string[] {
  const out = s.events;
  s.events = [];
  return out;
}

function hudTick(s: HudState, input: HudTickInput): string[] {
  if (!input.uiOn) return takeEvents(s); // hidden UI: only drain queued events
  const hpPct = input.hpMax > 0 ? (input.hpCur / input.hpMax) * 100 : 0;
  // Pulse rate is 10 / clamp(hpPct, 3, 7) per second.
  const divisor = Math.min(7, Math.max(3, hpPct));
  s.hpPulse += (input.dtSec * 10) / divisor;
  const low = hpPct < 10 && !input.isDead;
  s.hurtAlpha = low ? Math.sin(s.hpPulse) * 0.5 + 0.6 : 0;
  // Floaters age on the same clock and drop at zero.
  s.floaterTimers = s.floaterTimers.map((t) => t - input.dtSec).filter((t) => t > 0);
  return takeEvents(s);
}
```

## 5. Lands in
- Frankendom file(s): TARGET `src/fight/hud.ts` (low-health pulse, hurt overlay and floater timers), today: `src/hud.ts` (moving).
- Parity-checklist row: 14 (HUD). Secondary: 10 (hit impact/hitstop) for the floaters.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks
- The donor HUD is a full retained-mode UI (conrod, with its own widget ids, fonts and theming). Adopting its layout would bring a second UI engine. This conflicts with the one-engine ruling. Reuse the pulse and timer maths only.
- Health is read from the local ECS copy (`healths.get(me)`, line 1606). Under Frankendom's server-verified kills ruling the HUD reads the server-verified fight state in `src/fight/`; this pass verifies nothing.
- Nothing in this file covers death or respawn flow, fight record, or the combat feedback loop. Those are separate donor files.
- The Pit is a client (ruling); this HUD pass has no server contract, and its events are local UI actions.
- Not read: the body of the widget pass in `update_layout` (roughly lines 1625-4748, outside the ranges named in section 2) and the rest of `maintain`'s callers. The mechanism above is limited to the parts named in section 2.
