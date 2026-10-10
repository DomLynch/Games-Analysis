# OpenRA-OpenRA (animation-rigs, cell 1)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Render/WithSpriteBody.cs` | Licence: GPL-3.0-or-later (file headers: "either version 3 of ... any later version"; COPYING is GPL v3) | C# | symbol `WithSpriteBody`

Checked: Symbol `WithSpriteBody` (WithSpriteBody.cs 64-151, read in full) and the clip chain it drives. Read in full: WithMoveAnimation.cs 17-85, WithDeathAnimation.cs 19-127, WithAttackAnimation.cs 17-96, WithIdleAnimation.cs 19-63, WithChargeSpriteBody.cs 36-64, AttackCharges.cs 14-77, Animation.cs 19-260 (tick logic 217-236), RenderSprites.cs 85-91, 125-135, 222-236, 255-280, Mobile.cs 186-201 (notify only), int2.cs 77-85. Not read: the Move trait internals, when Armament fires PreparingAttack/Attacking, SpriteEffect (how the death clip plays), `Util.RandomInRange` (inclusive or not), and the key order of `FrozenDictionary` used for DeathTypes. Camera: not a camera cell. Structure check: grep of the .cs tree found 0 files for Skelet, Bone, IK, Ragdoll or Retarget; "blend" hits are GL/alpha code, not clip blending (file names only, not read). Confidence: high on the one-slot clip chain; medium on the move/attack hand-off (read from the callbacks, not run in a game). Depth: full for the clip mechanism.

Best transferable idea: one clip slot per body that every gameplay event writes to (locomotion, attack wind-up, idle, damage tier, death, charge pose), with a one-shot that returns to the current locomotion clip when it ends.
Decision (proposed): adapt - the shape fits a client creature/hero clip layer that reads engine events, but the donor's return-to-idle and move-override gaps must be fixed, and its sprite-frame model is not a rig.
Acceptance: In the Pit, a creature hit into the heavy damage tier plays its heavy hit variant; after a one-shot attack clip a walking creature resumes its walk clip, not idle (client test); a server-verified kill plays one death variant chosen by damage type with the fight-record seed, and replaying the same record shows the same variant.

## 1. Mechanism

- One slot per body. `WithSpriteBody` owns one `Animation` (`DefaultAnimation`, line 86). Every visual state (movement, attack, idle, damage tier, death, charge) asks that one slot for a clip. Nothing blends two clips. The second animation at line 90 only supplies mouse bounds.
- Three request forms. (a) Loop: `PlayRepeating` (lines 105, 133) replaces the clip and restarts at frame 0. (b) One-shot: `PlayCustomAnimation` uses `PlayThen` with a callback (lines 110-114) that calls `CancelCustomAnimation` and then the caller's `after`. `PlayThen` holds the last frame and fires the callback once (Animation.cs 172-181). (c) Scrub: `WithChargeSpriteBody` uses `PlayFetchIndex`, so the frame index is recomputed on every tick from a value (WithChargeSpriteBody.cs 50-51; Animation.cs 225-226).
- Locomotion. `WithMoveAnimation` reacts to `MovementTypeChanged`. The Mobile trait fires it only when the value changes (Mobile.cs 194-198). If the unit is moving and the current clip is not `move`, it plays `move` repeating. If it stopped while the current clip is `move`, it calls `CancelCustomAnimation` (WithMoveAnimation.cs 56-66). Its default valid type is horizontal movement (line 27).
- Attack wind-up. `WithAttackAnimation` starts its clip at `PreparingAttack` or at `Attacking`, depending on `DelayRelativeTo`. If `Delay` is above zero it counts down in `ITick` and plays at zero (lines 81-94).
- Idle. `WithIdleAnimation` counts down a random interval rolled on `SharedRandom` (lines 43, 51, 54). When it reaches zero it plays a random idle sequence chosen with `Game.CosmeticRandom` (line 53) as a one-shot.
- Damage tier. On a damage-state change the body re-normalises its clip with `ReplaceAnim` (WithSpriteBody.cs 136-139). `NormalizeSequence` (RenderSprites.cs 270-280) tries prefixes in the order critical-, damaged-, scratched-, scuffed- (lines 85-91). It takes the first one where the current state is at or above that tier and the clip exists (line 276).
- Death. `WithDeathAnimation.Killed` (lines 74-104): no damage types means `FallbackSequence` if set (85-88). Otherwise the first `DeathTypes` key that matches a damage type is used (96), with a random variant from its list on `SharedRandom` (100). No match means no death clip (97-98). The death clip spawns as a separate `SpriteEffect` at frame end (106-109), so the dead actor does not run it.
- Clock. `RenderSprites` ticks every clip from its `ITick` (lines 222-231, sim tick). `Animation.Tick()` is `Tick(40)` (Animation.cs 217-220). It subtracts 40 from `timeUntilNextFrame` and loops while the counter is at or below zero, adding the frame time each step (229-234). Frame time defaults to 40 ms (line 129). `ReplaceAnim` clamps the counter to the smaller of the new and old frame time (line 160) and keeps the frame index in range (161), so a swap does not stall.
- Charge pose. `AttackCharges` raises `ChargeLevel` by `ChargeRate` per tick while it is charging, lowers it by `DischargeRate` otherwise, clamped to 0..`ChargeLevel` (AttackCharges.cs 20-26, 52, 55, 68). Attacking resets it to 0 (72). The pose frame is `int2.Lerp(0, frames, charge, max+1)` = `frames * charge / (max+1)` with integer division (WithChargeSpriteBody.cs 51; int2.cs 79).
- Known hand-off gap, from reading the callbacks (not run). If a move starts while an attack one-shot plays, `PlayRepeating` replaces the clip and its callback is dropped (Animation.cs 146), so the body stays on `move`. If an attack ends while the unit is still moving, the callback replays the default `idle` (WithSpriteBody.cs 133). The move clip only comes back on the next movement-type change (Mobile.cs 194), so a unit that keeps walking is left on idle.

## 2. Key functions

- `WithSpriteBody` (class, lines 64-151): one slot; `PlayCustomAnimation` 108-115 (one-shot with return callback); `CancelCustomAnimation` 131-134 (back to the default clip); `DamageStateChanged` 136-140 (re-normalise).
- `WithMoveAnimation.UpdateAnimation` (lines 53-67) via `MovementTypeChanged` (69-72); frame-end start (74-78).
- `WithAttackAnimation` (lines 62-94): `PlayAttackAnimation` (62-66); `Attacking` 68-77; `PreparingAttack` 79-88; countdown in `Tick` 90-94.
- `WithIdleAnimation.Tick` (lines 46-56): random interval on `SharedRandom`, random clip on `CosmeticRandom`.
- `WithDeathAnimation.Killed` (lines 74-104): fallback, then death-type match, then random variant.
- `WithChargeSpriteBody.ConfigureAnimation` (lines 47-52) and its `CancelCustomAnimation` override (59-62).
- `Animation.Tick(int)` (lines 223-236), `PlayThen` (165-182), `PlayRepeating` (139-152), `ReplaceAnim` (154-163), `PlayFetchIndex` (190-198).
- `RenderSprites.NormalizeSequence` (lines 270-280) and `DamagePrefixes` (85-91).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One clip slot; a one-shot runs to its last frame, holds it, and fires a callback | Callback here cancels to the default clip, not to locomotion (theirs, WithSpriteBody.cs 110-112) |
| Frame accumulator on a fixed step: subtract the step, loop while the counter is at or below zero | Step 40 per sim tick (theirs, Animation.cs 220); frame time default 40 ms (theirs, 129) |
| Swap a clip without restarting the clock; keep the frame index in range | Clamp to min(new, old) (theirs, 160) |
| Worst damage variant that exists, checked worst first | Four tiers: critical-, damaged-, scratched-, scuffed- (theirs, RenderSprites.cs 87-90); enum values 16, 8, 4, 2 (theirs, TraitsInterfaces.cs 35-39, not all receipted) |
| Death clip from the first matching damage type, random variant | Variant list is catalogue data (theirs, WithDeathAnimation.cs 96-100) |
| Wind-up countdown in ticks before a clip plays | Default Delay 0 (theirs, WithAttackAnimation.cs 27) |
| Idle timer on the sim RNG, idle clip on the cosmetic RNG | Default interval 750 ticks (theirs, WithIdleAnimation.cs 26) |
| Charge meter that rises while charging and falls otherwise, clamped | Charge needed 25; rate 1 up, 1 down (theirs, AttackCharges.cs 20, 23, 26) |
| Scrub a clip with a 0..max value using integer lerp | Divisor max+1 so the top value stays on the last frame (theirs, WithChargeSpriteBody.cs 51) |

## 4. TypeScript sketch

simplified: keeps the donor model (one slot; loop; one-shot with callback; frame-index scrub; 40 ms accumulator; damage-tier prefix lookup; death by first matching damage type on the sim RNG; attack wind-up; idle on a sim-RNG interval with a cosmetic clip choice). It omits sprites, facing, palettes, the DeathSequence palette, the crushed and fallback death paths, the Delay-relative-to-attack switch, Armament wiring, ForceToGround, bounds, and the AttackCharges reset path. It differs on purpose in two places: a finished one-shot returns to the current locomotion clip (the donor returns to the default idle clip), and a locomotion change does not interrupt a running one-shot (the donor's move trait replaces it and drops its callback). It assumes the idle range is inclusive (donor `Util.RandomInRange` not read). `replace()` is the clip swap for a tier change; the sketch does not wire it to `damageVariant`, which the caller must do.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Tier = 0 | 1 | 2 | 3 | 4; // 0 undamaged, 1 light, 2 medium, 3 heavy, 4 critical

const SIM_STEP_MS = 40; // the fixed sim step the clip clock runs on
const DEFAULT_FRAME_MS = 40; // frame time when a clip has none of its own

interface Clip { name: string; frames: number; frameMs?: number; }
type Lookup = (name: string) => Clip | undefined;

// Worst damage variant that exists, else the base clip (worst tier checked first).
const TIER_PREFIXES: [Tier, string][] = [[4, "critical-"], [3, "damaged-"], [2, "scratched-"], [1, "scuffed-"]];
export function damageVariant(base: string, tier: Tier, has: (n: string) => boolean): string {
  for (const [need, prefix] of TIER_PREFIXES) {
    if (tier >= need && has(prefix + base)) return prefix + base;
  }
  return base;
}

// Death clip: first declared key that matches a damage type, then a random variant from its list (sim RNG).
export function deathClip(base: string, damageTypes: string[], table: Map<string, string[]>, simRandom: () => number): string | null {
  for (const [key, variants] of table) {
    if (damageTypes.includes(key)) return base + variants[Math.floor(simRandom() * variants.length)];
  }
  return null; // no matching type: no death clip
}

// Charge-driven pose: frame = lerp(0, frames, charge, maxCharge + 1) with integer division, as in the donor.
export function chargeFrame(frames: number, charge: number, maxCharge: number): number {
  return Math.trunc((frames * charge) / (maxCharge + 1));
}

// One clip slot. Loops by default; a one-shot runs to its last frame, holds it, then returns to the locomotion clip.
export class ClipSlot {
  private clip: Clip | null = null;
  private frame = 0;
  private toNextMs = 0; // accumulator: ms left before the next frame
  private oneShot = false;
  private done: (() => void) | null = null;
  private locomotion = "idle";

  constructor(private lookup: Lookup) {}

  private start(name: string, once: boolean, after: (() => void) | null): void {
    const c = this.lookup(name);
    if (!c) throw new Error(`missing clip ${name}`);
    this.clip = c;
    this.frame = 0;
    this.toNextMs = c.frameMs ?? DEFAULT_FRAME_MS;
    this.oneShot = once;
    this.done = after;
  }

  playLoop(name: string): void { this.start(name, false, null); }

  playOnce(name: string, after?: () => void): void { this.start(name, true, after ?? null); }

  // Locomotion changes do not interrupt a running one-shot; the new state applies when it ends.
  setLocomotion(name: string): void {
    this.locomotion = name;
    if (!this.oneShot) this.playLoop(name);
  }

  // Swap the clip, keep the frame index, and never stall the clock (donor ReplaceAnim behaviour).
  replace(name: string): void {
    const c = this.lookup(name);
    if (!c || !this.clip) return;
    this.clip = c;
    this.frame %= c.frames;
    this.toNextMs = Math.min(c.frameMs ?? DEFAULT_FRAME_MS, this.toNextMs);
  }

  // Call once per sim tick.
  tick(): void {
    if (!this.clip) return;
    this.toNextMs -= SIM_STEP_MS;
    while (this.toNextMs <= 0) {
      if (this.oneShot) {
        this.frame++;
        if (this.frame >= this.clip.frames) {
          this.frame = this.clip.frames - 1;
          const after = this.done;
          this.oneShot = false;
          this.done = null;
          this.playLoop(this.locomotion);
          after?.();
          return;
        }
      } else {
        this.frame = (this.frame + 1) % this.clip.frames;
      }
      this.toNextMs += this.clip.frameMs ?? DEFAULT_FRAME_MS;
    }
  }

  get currentFrame(): number { return this.frame; }
  get currentClip(): string | null { return this.clip?.name ?? null; }
}

// Idle timer: the interval is rolled on the sim RNG (replayable); the chosen idle clip uses a cosmetic RNG.
function rollInterval([lo, hi]: [number, number], rng: () => number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
export class IdleTimer {
  private left: number;
  constructor(
    private interval: [number, number],
    private clips: string[],
    private simRandom: () => number,
    private cosmeticRandom: () => number,
    private slot: ClipSlot,
  ) {
    this.left = rollInterval(interval, simRandom);
  }
  tick(): void {
    if (--this.left > 0) return;
    this.slot.playOnce(this.clips[Math.floor(this.cosmeticRandom() * this.clips.length)]);
    this.left = rollInterval(this.interval, this.simRandom);
  }
}

// Attack clip with a wind-up delay counted in ticks from preparation.
export class AttackCue {
  private left = 0;
  constructor(private clip: string, private delayTicks: number, private slot: ClipSlot) {}
  onPreparing(): void {
    if (this.delayTicks > 0) this.left = this.delayTicks;
    else this.slot.playOnce(this.clip);
  }
  tick(): void {
    if (this.delayTicks > 0 && --this.left === 0) this.slot.playOnce(this.clip);
  }
}
```

## 5. Lands in

- TARGET `origins/client/actor-clips.ts` (proposed path; not located in the Frankendom repo in this pass). Client presentation only: it reads fight events and never writes engine state.
- Parity-checklist row 7 (creature actor/clips). The same slot serves row 6 (hero actor/animation).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, two clients: the clip slot is client-only and reads engine events); rules 7-9 n/a

## 6. Gaps and risks

- The donor's hand-off bug (section 1, last bullet) is the main risk. Frankendom must pick one rule and test it: a one-shot pauses locomotion and returns to the current locomotion clip. The sketch does this; the donor does not.
- Whole-clip swapping only. The donor has no skeleton, skinning, blending, IK, ragdoll, retargeting, or attachment points. A 3D rig's cross-fades and additive layers are NONE in this donor, so they need a different source.
- Clock. The donor advances clips on the 40 ms sim tick, which is fine at 25 fps. Frankendom's client renders faster, so clip time should advance on a render clock for smooth motion, with fight events (hit, kill) still on the sim tick. Mixing these will drift unless it is spelled out.
- RNG split. The donor keeps the timer on the sim RNG and the clip choice on the cosmetic RNG. The death variant uses the sim RNG (WithDeathAnimation.cs 100), so a replay of a fight record can reproduce it. Frankendom must not feed the cosmetic RNG into any value the server verifies.
- Ordering. `FrozenDictionary` key order is not a contract, so the first-matching death type can change between runs. Frankendom's catalogue should hold death rules as an ordered array.
- The charge pose is driven by a sim value (`ChargeLevel`). Frankendom must server-verify that value; the client only maps it to a frame.
- Donor is a 2D sprite RTS. Only the state-to-clip table and the return callback transfer, not the sprite frames.
- Not read: the Move trait's internals and when Armament fires its notifications. Attack timing relative to the actual shot is therefore not confirmed here.
