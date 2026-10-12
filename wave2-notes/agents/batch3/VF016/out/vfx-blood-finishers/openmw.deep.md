# openmw (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/windowmanagerimp.cpp` (trigger, 2364-2375) with `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/screenfader.cpp` (fader and fade step) | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007") | C++ | symbol `WindowManager::activateHitOverlay`

Checked: The hint file `combat.cpp` has no blood or finisher visual. Its only blood reference is a comment (759-760) on the hit position. I grep'd `apps` and `components` for "blood": no code spawns a blood effect in this donor (the other hits are the Bloodmoon expansion name, the creature/NPC blood-type field and the ini importer). The real screen effect is the player hit flash: read end to end in its trigger (npc.cpp 679-782, read in part), the window-manager call (windowmanagerimp.cpp 2364-2375) and the fader (screenfader.cpp 1-216, read in full; the MyGUI widget setup 85-115 read in part). Of the 6 `activateHitOverlay` call sites in the grep, I read 3 (npc.cpp 782, character.cpp 2259, actors.cpp 1043); the other 3 (activespells.cpp 407, worldimp.cpp 2423 and 2457) were seen in grep only, not read. Not read: whether godmode suppresses `Npc::onHit` before line 779. Confidence high on the flash mechanism, medium on the godmode question. camera_scope: not a camera cell.

Best transferable idea: A landed hit restarts a full-screen flash that fades linearly to clear over 0.5 s, and a per-tick damage effect does not restart a flash that is still running.
Decision (proposed): adapt — keep the restart-on-hit and skip-on-tick rule, trigger it from the server-confirmed hit with a hit-or-tick tag, and expose the peak alpha as data because a fixed 100 percent can hide the target at 375 wide.
Acceptance: In a duel the player's screen flashes on the frame a server-confirmed hit arrives; a second confirmed hit within 0.5 s restarts it; a burn tick while it runs does not; the overlay alpha 0.25 s after a hit is 0.5 at any frame rate.

## 1. Mechanism

- A hit on an NPC reaches `Npc::onHit` with a map of damages by stat. The loop (738-762 in part) subtracts each stat; for `health` it sets `hasHealthDamage` (748) and subtracts the damage from current health.
- After the voice roll (the `hit` line, read in part around 768-776), line 779 checks `hasHealthDamage && healthDamage > 0.0f`. If the victim is the player (781), line 782 calls `activateHitOverlay()` with the default `interrupt = true`. So the flash fires only on health loss, not fatigue or magicka loss.
- Order inside `WindowManager::activateHitOverlay(bool interrupt)` (2364-2375): (a) if the GUI setting `hit fader` is off, return (2366-2367); (b) if `interrupt` is false and the fader queue is not empty, return (2369-2370), so a flash already in progress is not restarted; (c) `clearQueue()` (2372), which drops any running fade; (d) `fadeTo(100, 0.0f)` (2373): with time 0 and no delay, `ScreenFader::queue` sets the alpha to 1.0 at once and does not queue an op (171-176); (e) `fadeTo(0, 0.5f)` (2374): queues a 0.5 s fade to alpha 0.
- Per frame: `ScreenFader::onFrameStart(dt)` (118-124) starts the front op once (`start()` sets the remaining time to target time plus delay and records the start alpha) and calls `update(dt)`. `FadeOp::update` (screenfader.cpp 35-77): if the remaining time is 0 or less, it sets the target alpha and finishes; while the remaining time is above the target time it only counts down (the delay phase); otherwise it moves alpha by `dt / targetTime * (start - target)` (63) and clamps at the target (64-66). The remaining time drops by dt each frame (76). `finish()` makes `notifyOperationFinished` pop the front op (204-207).
- Alpha reaches the widget through `applyAlpha` (`1 - (1 - alpha) * factor`, factor 1 by default). Tick: the fader is driven by the GUI frame event with the real frame time dt, so the fade is frame-rate independent (variable step).
- Other callers: fall damage (character.cpp 2259, read, inside the `if (!godmode)` block that starts at 2251) and drowning ticks (actors.cpp 1043, read, `interrupt = false`, so each drown tick is skipped while a flash runs; once the 0.5 s fade ends, the next tick starts a new flash). The other three call sites (activespells.cpp 407, worldimp.cpp 2423 and 2457) were not read.

## 2. Key functions

- `WindowManager::activateHitOverlay`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/windowmanagerimp.cpp` 2364-2375. The trigger: setting gate, interrupt rule, clear, instant peak, 0.5 s fade.
- `ScreenFader::queue` (zero-time branch): `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/screenfader.cpp` 171-178. Zero time and zero delay sets the alpha at once (171-176); otherwise the op is pushed (178).
- `ScreenFader::onFrameStart` and `FadeOp::update`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/screenfader.cpp` 35-77 (update) and 118-124 (driver). The linear fade step is at 63 and the clamp at 64-66.
- `Npc::onHit`, hit trigger (inside it): `/mnt/frankendom-donors/openmw/apps/openmw/mwclass/npc.cpp` 738-782 (in part): `hasHealthDamage`, then the player check and the call at 779-782.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A screen flash that restarts on each landed hit (interrupt) but is skipped for a per-tick effect while it runs | The `interrupt` flag: default true for hits (npc.cpp 782, character.cpp 2259), false for drowning (actors.cpp 1043); the three other call sites (activespells.cpp 407, worldimp.cpp 2423, 2457) were not read |
| Instant peak, then linear fade back to clear | Peak 100 percent (windowmanagerimp.cpp 2373); fade time 0.5 s (2374), both theirs, engine constants |
| Frame-rate independent fade (dt over total time, clamped at the target) | Fade step `dt / targetTime` (screenfader.cpp 63); no tuning constant |
| Only health loss flashes the screen | Health only: the call is gated on `hasHealthDamage` (npc.cpp 779); the fatigue and magicka branches (about 745-762) set no flag, so they do not flash |
| Player-only | `ptr == MWMechanics::getPlayer()` (npc.cpp 781) |
| Setting toggle | `hit fader = true` (files/settings-default.cfg 221, theirs default; key read at components/settings/categories/gui.hpp 33) |
| Texture | `bm_player_hit_01.dds` (windowmanagerimp.cpp 492), fallback `player_hit_01.dds` with a crop 0.2 / 0.25 / 0.6 / 0.5 (497-498) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the interrupt check first, then the instant peak, then a linear dt fade clamped at zero. It omits the setting toggle, the widget and texture crop, the optional delay argument and the general queue of several fade ops (the donor queue can hold more than one op; this sketch holds one), the factor scaling, and the callers (npc onHit, fall, drowning). The example at the end is a usage check, not part of the donor.

```ts
// Licence: GPL-3.0 (donor, openmw). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export class HitFlash {
  private alpha = 0;        // overlay opacity, 0 = clear, 1 = full flash
  private fadeLeft = 0;     // seconds left in the fade; 0 = idle
  private readonly fadeTime: number;

  constructor(fadeTime = 0.5) {
    this.fadeTime = fadeTime;
  }

  // interrupt = true: a landed hit restarts the flash at once.
  // interrupt = false: a damage-over-time tick does nothing while a flash is still running.
  trigger(interrupt: boolean): void {
    if (!interrupt && this.fadeLeft > 0) return;
    this.alpha = 1;                 // instant peak, no fade-in
    this.fadeLeft = this.fadeTime;  // then a linear fade to clear
  }

  // dt = seconds since the last frame; called once per rendered frame.
  update(dt: number): number {
    if (this.fadeLeft > 0) {
      this.fadeLeft = Math.max(0, this.fadeLeft - dt);
      this.alpha = this.fadeTime > 0 ? this.fadeLeft / this.fadeTime : 0;
    }
    return this.alpha;
  }
}

// Example: a landed hit, then 0.2 s later a second hit that restarts the flash.
const f = new HitFlash(0.5);
f.trigger(true);
f.update(0.2);
f.trigger(true);
export const alphaAfterRestart = f.update(0.1);
```

## 5. Lands in

- TARGET `src/fight/hit-feedback.ts` (new, client-only reader of the engine's hit event; not an engine module). Parity-checklist row 10 (hit impact/hitstop). The flash is a client effect, so it sits with the HUD and camera, not in the duel step.
- Trigger rule for Frankendom: the flash starts from the server-confirmed hit event (kills and hits are server-verified), never from the local swing. A rejected or blocked hit must not flash.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, the client only reads the event); rule 7-9 n/a
- Decision (proposed): adapt. The idea is the restart-on-hit rule plus the skip-on-tick rule, which keeps a burn or poison tick from strobing the screen. Frankendom adds a tag on the hit event (hit vs tick) that the donor does not have, and makes the peak alpha a data field (see section 6).
- Acceptance: In a duel the player's screen flashes on the frame a confirmed hit arrives; a second confirmed hit within 0.5 s restarts the flash; a burn tick while the flash runs does not restart it; at a test frame of 0.25 s after a hit the overlay alpha is 0.5, at any frame rate.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- The donor flashes on health loss from any NPC hit, with no check of whether the blow was blocked, parried or missed (`successful` in `onHit` was not read). Frankendom's guard and parry (row 3) need their own feedback, not this flash.
- Godmode: whether `Npc::onHit` is reached while godmode is on was not read. Frankendom must decide the order and test it, not copy the donor's.
- Readability at 375 wide: a 100 percent peak can hide the target for 0.5 s. The donor fixes the peak at 100 percent. Frankendom should put the peak alpha and the fade time in zone or engine data with a lower default, and check it in the phone stills (visual-pr-stills).
- Frankendom needs one flash, not a queue; the donor's queue is more general than needed.
- The donor's texture is a DDS image with a fallback crop. Frankendom would use a CSS overlay; none of the texture transfers.
- Defects: none found in the code I read (the fade clamps at the target and the queue pops on finish). The idea is kept as it is.
- Where else seen: death presentation. `hitStateToDeathState` (character.cpp 108; cases 113-120 read) maps a knockdown or knockout hit state to a death knockdown or knockout state (118, 120), and it is called at 880 (caller context not read). The clip names are at 202-205 (`deathknockdown`). Fall damage that costs more health than acrobatics times fatigue term sets a knockdown (2263, 2266). These are read in part, not sketched; they belong to row 17 (death) and are out of this note.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine, client-only feedback); 10 (hit impact) per the cell hint
