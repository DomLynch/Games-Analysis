# flutter-team-archive-pinball (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/plunger/plunger.dart` | Licence: MIT (`LICENSE`: "Copyright (c) 2021 Very Good Ventures"; permissive, code may be adapted) | Dart (Flutter + Flame) | symbol `_PlungerSpriteAnimationGroupComponent.onNewState`

Checked: Read in full: the plunger clip group (plunger.dart 87-139), `plunger_state.dart`, `plunger_cubit.dart`, the pulling, releasing and key-controlling behaviours, the animatronic loop (`lib/game/behaviors/animatronic_looping_behavior.dart`) with its two zone call sites, the dash and sparky clip setup, and `packages/pinball_flame/lib/src/sprite_animation.dart` (all 113 lines). Not read: Flame's `SpriteAnimationTicker`, `SpriteAnimationGroupComponent`, `SpriteAnimation.reversed()` and `TimerComponent` (the Flame package is not on the VPS), so frame advance, hold-on-last-frame and timer repeat are "(not read)". Donor has no skeleton, skinning, blending, IK, ragdoll or attachment code (grep for ragdoll/skeleton/skinning/inverse kinematic/attachment point found none in `.dart`). Confidence: high on the order of operations of the plunger group; moderate on the animatronic cycle length (depends on Flame timer defaults, not read). Depth: thin. camera_scope: n/a.

Best transferable idea: Drive one shared clip set from a phase state: restart the clip only when a phase is entered, and play a release as the pull clip run backwards, so one asset covers both directions.
Decision (proposed): adapt - the phase-edge reset and the reverse-play are cheap and remove a second asset for hero and creature poses, but the phase must come from engine state the server sends, never from local input as the donor's cubit does.
Acceptance: In a duel test, when the hero enters block from idle the block clip's frame index starts at 0; leaving block plays the same clip's frames in reverse; a second block input while already blocking does not restart the clip (the frame index sequence keeps counting).

## 1. Mechanism

- The plunger is a three-phase object: `releasing` (the start state), `pulling` (key down), and `autoPulling` (the plunger reached its lower joint limit). `isPulling` is true for both pulling phases; `isReleasing` only for releasing (plunger_state.dart 12-14). The cubit emits the phases (plunger_cubit.dart 6, 8, 12). Key down calls `pulled()` and key up calls `released()` (plunger_key_controlling_behavior.dart 25-28). The physics behaviour sets the phase to `released()` when the prismatic joint translation reaches its lower limit (plunger_pulling_behavior.dart 43-48).
- One strip, one clip. `pullAnimation` is a single flip-book sequence: 20 cells per row, 1 row, but `amount` and `amountPerRow` are both `20 * 1 ~/ 2 = 10`, so the clip uses the first 10 cells (plunger.dart 121-130). Step time is 1/24 s, so the pull is 10 / 24 = 0.417 s. `loop: false`.
- Phase to clip map (plunger.dart 132-136): `releasing` uses `pullAnimation.reversed()` (play the same 10 frames backwards); `pulling` and `autoPulling` both use `pullAnimation` forward.
- Phase edge reset (plunger.dart 97-106): on each new state, `startedReleasing` is "new state is releasing and the old one was not" (99); `startedPulling` is "new state is a pull and the old one was not" (100). Only then does the ticker reset (101-102). Then `current = state` (105). So `pulling -> autoPulling` does not restart the clip, and `releasing -> releasing` does not either.
- Initial state: `current` is taken from the cubit state in `onLoad` (138), which starts at `releasing` (cubit line 6).
- Idle replay (animatronic): a one-shot clip (`loop: false`) plays once while the owner's `playing` flag is true. `AnimatronicLoopingBehavior` is a timer with period = cooldown (line 7). On tick it sets `playing = true` (23). On the clip's completion it resets the ticker, sets `playing = false` (12-14) and restarts the timer, so the next play waits the cooldown again. Zone numbers: dash clip 13 x 6 = 78 frames at 1/24 s = 3.25 s, cooldown 11 s in `flutter_forest` (flutter_forest.dart 56); sparky clip 9 x 7 - 1 = 62 frames = 2.58 s, cooldown 8 s in `sparky_scorch` (sparky_scorch.dart 38). If the timer fires once per start (Flame default, not read), one cycle is cooldown + clip length: 14.25 s for dash, 10.58 s for sparky.
- Ticker driver (`SpriteAnimationController`, sprite_animation.dart 44-70): `notifyListeners` computes `dt` from the wall clock and calls `animationTicker.update(dt)`. The clock is `DateTime.now().millisecond`, which is the millisecond field only (66), so `dt = max(0, (now - last) / 1000)` (67) is wrong across a second boundary (negative, clamped to 0 for that frame) and for any gap over one second; on the first call `last` is 0 so `dt` is the current millisecond field divided by 1000, not zero. Callers: `selected_character.dart` (forward then repeat, step 1/12) and `bonus_animation.dart` (forward once, `loop: false`, step 1/12). Plunger does not use this controller; it is an ordinary Flame component.

## 2. Key functions

- `_PlungerSpriteAnimationGroupComponent.onNewState`: `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/plunger/plunger.dart` 97-106 (edge detection, ticker reset, switch clip).
- `_PlungerSpriteAnimationGroupComponent.onLoad`: same file 109-139 (strip maths, phase-to-clip map, initial state).
- `PlungerStateX` (`isPulling`, `isReleasing`, `isAutoPulling`): `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_components/lib/src/components/plunger/cubit/plunger_state.dart` 3-16.
- `AnimatronicLoopingBehavior`: `/mnt/frankendom-donors/flutter-team-archive-pinball/lib/game/behaviors/animatronic_looping_behavior.dart` 3-24 (the idle replay loop).
- `SpriteAnimationController.notifyListeners`: `/mnt/frankendom-donors/flutter-team-archive-pinball/packages/pinball_flame/lib/src/sprite_animation.dart` 62-70 (wall-clock dt, see the bug in section 6).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One clip shared by two directions: release plays it reversed | 10 frames used (plunger.dart 124-125), reversed flag (133) |
| Clip restarts only on entering a phase | Edge test, no restart within the pull phases (99-102) |
| Clip time = frames x step | 1/24 s per frame (plunger.dart 126; dash 37; sparky 41) |
| Idle replay: wait, play once, wait again | Cooldown 11 s (flutter_forest.dart 56), 8 s (sparky_scorch.dart 38); clip 78 frames dash (dash_animatronic.dart 35), 62 frames sparky (sparky_animatronic.dart 39) |
| Phase start at the resting state | `releasing` (plunger_cubit.dart 6) |

## 4. TypeScript sketch

simplified: keeps the donor's edge-only reset, the reverse play for release, and the cooldown-play-cooldown loop. It takes `dt` from the caller (fixing the donor's wall-clock bug), holds no Flame or Bloc types (the cubit becomes a plain `setPhase` call), omits the physics that moves the plunger and the joint-limit auto-pull trigger, and assumes the clip holds its last frame at the end (Flame's behaviour, not read). Clip length and step time are arguments, not constants.

```ts
// Licence: MIT (donor LICENSE, Very Good Ventures 2021). Adapted shape, written from the mechanism.
type ActorPhase = 'releasing' | 'pulling' | 'autoPulling';

interface StripClip {
  frames: number;    // frames in the shared strip (10 for the donor's plunger pull)
  stepTime: number;  // seconds per frame (1 / 24 in the donor)
}

const isPulling = (p: ActorPhase): boolean => p === 'pulling' || p === 'autoPulling';

class PhaseClipPlayer {
  private phase: ActorPhase = 'releasing';
  private elapsed = 0;

  constructor(private readonly clip: StripClip) {}

  // Mirrors onNewState: the clip restarts only on a phase edge, so pulling -> autoPulling keeps running.
  setPhase(next: ActorPhase): void {
    const startedReleasing = next === 'releasing' && this.phase !== 'releasing';
    const startedPulling = isPulling(next) && !isPulling(this.phase);
    this.phase = next;
    if (startedReleasing || startedPulling) this.elapsed = 0;
  }

  // Frame index for this instant. Release plays the same strip backwards.
  frame(dt: number): number {
    this.elapsed += dt;
    const step = Math.min(this.clip.frames - 1, Math.floor(this.elapsed / this.clip.stepTime));
    return this.phase === 'releasing' ? this.clip.frames - 1 - step : step;
  }
}

// Idle replay for a one-shot clip: wait, play once, wait again.
class IdleReplay {
  private wait: number;
  private playing = false;
  private elapsed = 0;

  constructor(private readonly cooldown: number, private readonly clip: StripClip) {
    this.wait = cooldown;
  }

  // Returns true while the clip is playing.
  update(dt: number): boolean {
    if (!this.playing) {
      this.wait -= dt;
      if (this.wait > 0) return false;
      this.playing = true;
      this.elapsed = 0;
      return true;
    }
    this.elapsed += dt;
    if (this.elapsed < this.clip.frames * this.clip.stepTime) return true;
    this.playing = false; // onComplete: stop, then restart the cooldown
    this.wait = this.cooldown;
    return false;
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/actor-clips.ts` (new, pure): maps the engine's actor phase (guard, block, attack windows from the engine state) to a clip and a frame index; the client only renders the frame. Parity-checklist row 6 (hero actor/animation). Creature idle replay for zone creatures would be row 7.
- today: the Frankendom hero animation code was not read in this pass.
- Reuse tag: adapt (MIT: adapted shape only, the sketch is a rewrite)
- Brief rule served: 1 (one engine; the client renders engine state and holds no fight truth)

## 6. Gaps and risks

- The donor is a 2D flip-book (one sprite strip per clip). Frankendom's hero and creatures are 3D rigs. What transfers is the phase-to-clip map, the edge-only restart and the reverse play. Reversing a skeletal clip is only safe if the clip has no baked root motion or blended extras; that is not checked here and must be tested on the actual rig.
- The donor drives phase from input (keys, a cubit) and from physics (joint limit). Frankendom's fight state is owned by the engine and server-verified, so the phase must come from the engine state the client receives, never from a local key. Engage is a state change; the clip follows it, the clip never decides it.
- Idle replay is client-only timing. The server must not read it, and a zone's cooldown is zone data (flutter forest 11 s, sparky 8 s). Frankendom should keep it out of the fight record and out of any server tick.
- Do not copy the donor's clock. `SpriteAnimationController` derives dt from the millisecond field of the wall clock (sprite_animation.dart 66-67), which is wrong across a second boundary and gives a wrong first frame. Use the Frankendom client frame loop's dt instead (that loop was not read in this pass).
- Not read: Flame's `SpriteAnimationTicker` (hold-on-last-frame, update), `SpriteAnimationGroupComponent`, `reversed()` (assumed to return the frames in reverse order, by name only), `TimerComponent` defaults (repeat, autostart). The cycle length in section 1 depends on the timer defaults.
- The donor has no skeleton, skinning, blend tree, IK, ragdoll, hit-reaction or attachment-point code (grep in `.dart`). So this cell proves a clip state machine only, not rig mechanics.
