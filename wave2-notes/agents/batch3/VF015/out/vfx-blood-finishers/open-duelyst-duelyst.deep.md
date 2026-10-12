# open-duelyst-duelyst (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/app/view/layers/game/GameLayer.js` (with `app/data/fx.js`, `app/view/nodes/fx/FXSprite.js`, `app/common/utils/utils_engine.js`, `app/view/actions/Shake.js`, `app/common/config.js`) | Licence: CC0-1.0 (`package.json` line 3 `"license": "CC0-1.0"`; `COPYING` is CC0 1.0 Universal; the files read carry no separate licence header) | JavaScript (Cocos2d-JS) | symbol `GameLayer._showActionSpecialFX` (for the screen effects) and `GameLayer._getActionFXData` (for the FX lists)

Checked: Read in full: `app/view/actions/Shake.js` (71 lines).  Read in part: `app/view/layers/game/GameLayer.js` 3375-3450 (sequence and delays for game, target and die FX), 3919-3990 (FX list by root action), 4249-4311 (high-damage focus and shake), `app/data/fx.js` 1-30 and 200-250 (the first Factions block: UnitDamagedFX, UnitDiedFX), the other data hits by grep (6592, 8691, 8706), `app/view/nodes/fx/FXSprite.js` 335-372 (delays) and 380-430 (timings), `app/common/utils/utils_engine.js` 590-626, `app/common/config.js` (the lines in the receipts). Candidates opened: `app/view/fx/FX.js` (the hint: a render post-process manager with blur, bloom and radial-blur setters, not the death or hit mechanism; only its method list was read), `app/view/nodes/fx/FXChainSprite.js` (grep of impactAtEnd only), `app/view/layers/game/GameLayer.js` (the real mechanism). Depth: thin, because the target-side reaction (`_showActionForTarget`, GameLayer 3841), the node factory (`NodeFactory.createFX`) and the default of `impactAtEnd` in `FXSprite.js` were not read. Confidence: high on the timing lines quoted; moderate on the whole choreography. Not read: how the die animation length is looked up for each card (`getAnimResource().death`), how the lists from data are merged (`DATA.dataForIdentifiersWithFilter`), the radial-blur values, and what the shake amplitude's units are. Camera_scope: not a camera topic; the shake is applied to the FX layer, not the game camera.

Best transferable idea: a hit's reaction waits for its effect's impact time (the donor delays the target by the game effect's impact delay), and a high-damage hit gets a short focus and shake window clamped to the time the action stays on screen.

Decision (proposed): adapt - keep the rule that the hurt and death reaction starts at the effect's impact time while the damage is already applied on the server tick; keep the high-damage focus and shake as client presentation keyed by the server's damage amount (threshold 7); do not copy the Cocos sequencer, and fix the focus-out clamp (defect D1) before use.
Acceptance: a test (or a Pit or world check at 375 wide) shows the hurt pose starting when the hit effect reaches its impact frame (impact delay after the swing), while the server's HP change lands on the tick that resolved the hit; a hit of 7 or more damage shows the focus and shake for 0.35 s with the shake starting after min(0.1, focus-in x 0.5) seconds, and nothing else changes.

## 1. Mechanism

- Each action gets up to three effect lists, built by `_getActionFXData` (GameLayer 3919-3990): the GameFX list (the world-space effect, at the centre of the pattern), the TargetFX list (on the target unit) and the SourceFX list. The lists come from the root action type. An attack adds UnitAttackedFX on the game channel, and UnitPrimaryAttackedFX too when the attack is explicit (not implicit); on the target channel an attack adds UnitDamagedFX (the attack branch of `_getActionFXData`; exact lines not receipted). Damage and kill actions add UnitDamagedFX on the target channel. A die action adds UnitDiedFX on the game channel, but not when the target is a tile (3981-3984). A heal adds UnitHealedFX on the target channel. The lists are merged with the source and target card's own FX resource names (`_.union`), then modifier effects are added.
- Timing of a normal action (GameLayer 3398-3426): the game FX is built (3398) and its sprites report their delays (3406). `impactDelay` is the max over those sprites (3408). The target reaction is at `actionDelay + impactDelay` (3418). Target FX are scheduled at that time, or at the sequence's max if the action is sequenced as one (around 3422-3430; the exact lines of that ternary were not receipted).
- The impact delay of one effect sprite (FXSprite.js 361-369): it is zero, unless the sprite has `impactAtEnd`; then it is the sprite's base duration (366-367). The default of `impactAtEnd` in FXSprite.js was not read; FXBoidSprite sets it true and FXChainSprite sets it false (grep).
- The show delay of an effect (FXSprite.js 349-355) is the base duration plus the impact FX's show delay. `getDelaysFromFXSprites` (utils_engine.js 597-624) takes the max over the sprites of life duration, show delay and impact delay.
- Show delay for the action's visuals (GameLayer 3441-3445): a die action with a death animation waits for that animation's length (3442). A spawn or remove action waits `CONFIG.ACTION_DELAY` = 0.5 s (3445). Anything else waits the max of the target FX delays. A later step takes the max over the sequence (not read in full).
- High-damage special FX (`_showActionSpecialFX`, GameLayer 4249-4311): an attack or damage-as-attack whose total damage is at least `CONFIG.HIGH_DAMAGE` (7) sets a screen focus and a shake (4262-4263; config 894). A high-cost entity spawn has its own set (4274). The focus is: in 0.1 s, delay 0, out 0.25 s (config 896-900). The window is `safeDuration = max(nextActionDelay - targetReactionDelay, total)` (4287). The in and delay phases are scaled to that window (4294-4295), and the out phase is scaled by `total/total` (4296), which is the defect in D1. The focus runs on the scene from `targetReactionDelay` (not receipted). The shake is 0.35 s, strength 20.0 (config 902-903), and runs on the FX layer at `targetReactionDelay + min(0.1, focusIn x 0.5)` (4308), with the origin `cc.p(0, 0)` (4311).
- The shake itself (Shake.js 28-36): at time 1.0 it sets the node back to its origin (29-30). Before that, each update sets it to origin plus a random value in plus or minus strength, scaled by (1 - time), so the amplitude falls linearly to zero (32-33). The origin defaults to (0, 0) (22).
- Data (fx.js 215-244): an early block of the Factions table (the faction key was not read) has UnitDamagedFX (line 215) and UnitDiedFX (line 236). Both use the same pair of blood explosions (`BloodExplosionBig`, `BloodExplosionMedium`, lines 216 and 237) and a Decal layer of four blood-ground sprites (`fxBloodGround` to `fxBloodGround4`), offset y -45 (the rule for picking from the array was not read). The same keys appear again later (UnitDamagedFX at 6592; UnitDiedFX at 8691 and 8706, where 8706 is an empty list). How later blocks merge with these was not read.
- Tick: the sequence runs on the client with Cocos actions (cc.sequence and cc.delayTime), so the timing is in seconds from the action start. The step size of the game simulation that produces the actions was not read.

## 2. Key functions

- `GameLayer._getActionFXData`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/view/layers/game/GameLayer.js` 3919-3990 (lists by root action; the death branch at 3981-3984).
- The sequence and reaction timing in the action loop: `/mnt/frankendom-donors/open-duelyst-duelyst/app/view/layers/game/GameLayer.js` 3398-3445.
- `GameLayer._showActionSpecialFX`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/view/layers/game/GameLayer.js` 4249-4311 (focus window, shake at 4308-4311).
- `FXSprite` delays: `/mnt/frankendom-donors/open-duelyst-duelyst/app/view/nodes/fx/FXSprite.js` 349-369.
- `UtilsEngine.getDelaysFromFXSprites`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/common/utils/utils_engine.js` 597-624.
- `Shake`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/view/actions/Shake.js` 9-69.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| The reaction waits for the effect's impact: start plus the impact delay of the sprite that lands at its end | Impact delay = effect base duration, only for `impactAtEnd` sprites (FXSprite.js 366-367); other sprites add 0 |
| Several effects on one action: take the max of their delays, so the slowest one sets the time | Max over sprites (utils_engine.js 616; GameLayer 3408) |
| Event-to-effect table: root action type and channel pick the FX list | UnitDamagedFX, UnitDiedFX, UnitAttackedFX, UnitPrimaryAttackedFX, UnitHealedFX (GameLayer 3919-3990); blood pair and decal in fx.js 216-223 |
| Die show waits for the death animation, spawn waits a fixed short delay | Spawn and remove: 0.5 s (config 497; GameLayer 3445); die: animation length (3442) |
| Focus window clamped to the time until the next action | `CONFIG.HIGH_DAMAGE` = 7; in 0.1 s; delay 0; out 0.25 s (config 894-900); shake 0.35 s, strength 20.0 (config 902-903) |
| Shake: random offset whose amplitude falls linearly over the duration, then returns to origin | Origin (0, 0) by default (Shake.js 22), strength and duration are per call (GameLayer 4311) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (game FX impact delay, then the reaction time; the high-damage window clamped by the next action; the shake offset from the reaction time plus the lead). It omits the Cocos sequencer and the node creation, the card-specific FX lists and the modifier FX, the radial blur, the die animation lookup, the high-cost branch, the source FX, and the seeded RNG (the donor uses Math.random). It changes one thing on purpose: the out phase of the focus is scaled like the in and delay phases (fix D1). It also changes the shake copy so reverse and clone keep the origin and strength (fix D2).

```ts
// clean-room sketch: a hit's visual reaction waits for its effect's impact time; a high-damage hit adds a focus
// and a shake window clamped to the time the action stays on screen. Donor licence: CC0-1.0 (public domain
// dedication). Written from the described mechanism, not a line-by-line translation.

export interface FxSprite {
  baseDuration: number;  // seconds (donor FXSprite.getBaseDuration, not read in full)
  impactAtEnd: boolean;  // true: the effect lands at the end of its duration (donor FXSprite.js:366-367)
}

// Donor utils_engine.js:597-624 takes the max over the effect sprites; only impactAtEnd sprites delay.
export function impactDelayOf(fx: FxSprite[]): number {
  let d = 0;
  for (const f of fx) if (f.impactAtEnd) d = Math.max(d, f.baseDuration);
  return d;
}

// Donor GameLayer.js:3418: the target reacts at action start plus the impact delay of the game effect.
export function reactionTime(actionStart: number, gameFx: FxSprite[]): number {
  return actionStart + impactDelayOf(gameFx);
}

export interface FocusSpec {
  inDur: number;        // donor CONFIG.HIGH_DAMAGE_SCREEN_FOCUS_IN_DURATION = 0.1
  delay: number;        // donor CONFIG.HIGH_DAMAGE_SCREEN_FOCUS_DELAY = 0.0
  outDur: number;       // donor CONFIG.HIGH_DAMAGE_SCREEN_FOCUS_OUT_DURATION = 0.25
  shakeDur: number;     // donor CONFIG.HIGH_DAMAGE_SCREEN_SHAKE_DURATION = 0.35
  shakeStrength: number; // donor CONFIG.HIGH_DAMAGE_SCREEN_SHAKE_STRENGTH = 20.0
}

export interface FocusWindow {
  inDur: number;
  delay: number;
  outDur: number;
  shakeAt: number;
  shakeDur: number;
  shakeStrength: number;
}

// Donor GameLayer.js:4287-4308: the window is clamped to the time until the next action (nextActionDelay).
export function focusWindow(
  spec: FocusSpec,
  nextActionDelay: number,
  reactionAt: number,
): FocusWindow {
  const total = spec.inDur + spec.delay + spec.outDur;
  const safe = Math.max(nextActionDelay - reactionAt, total);
  return {
    inDur: Math.min(spec.inDur, (spec.inDur / total) * safe),
    delay: Math.min(spec.delay, (spec.delay / total) * safe),
    // FIX: donor line 4296 scales the out phase by total/total (=1), so the clamp never shrinks it
    outDur: Math.min(spec.outDur, (spec.outDur / total) * safe),
    shakeAt: reactionAt + Math.min(0.1, spec.inDur * 0.5), // donor GameLayer.js:4308
    shakeDur: spec.shakeDur,
    shakeStrength: spec.shakeStrength,
  };
}

export interface Shaker {
  origin: { x: number; y: number };
  strength: number;
  duration: number;
}

// Donor Shake.js:28-36: at t = 1 the node returns to its origin; before that the offset is random with an
// amplitude that falls linearly to zero (the (1 - time) factor).
export function shakeOffset(s: Shaker, t01: number, rnd: () => number): { x: number; y: number } {
  if (t01 >= 1) return { x: s.origin.x, y: s.origin.y };
  const amp = s.strength * (1 - t01);
  return {
    x: s.origin.x + (rnd() * 2 - 1) * amp,
    y: s.origin.y + (rnd() * 2 - 1) * amp,
  };
}

// FIX: donor Shake.reverse() (Shake.js:49) and clone() (Shake.js:52-56) drop the origin and, for clone, the strength.
export function copyShaker(s: Shaker): Shaker {
  return { origin: { ...s.origin }, strength: s.strength, duration: s.duration };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/VF015_duelyst_impact_timing.ts`).

## 5. Lands in

- TARGET `src/fight/hit-impact.ts` (new module): the client-side reaction timing and the high-damage focus and shake window. The damage is applied by the server on the tick that resolves the hit; this module only decides when the hurt and death reaction and the focus start.
- Parity-checklist row 10 (hit impact and hitstop). The death staging belongs to row 17; the die show delay (GameLayer 3441-3442) is noted there, not built here.
- Reuse tag: rewrite-from-idea (CC0-1.0; the code may be adapted, the sketch is written from the mechanism)
- Brief rule served: 1 (one engine: the damage is the server's; the timing and the shake are client presentation); rules 7-9 n/a

## 6. Gaps and risks

- Presentation only: in this donor the reaction timing is part of the client sequencer. In Frankendom it must stay client-only. The server resolves the hit on a tick; the client may show the hurt later by the impact delay, but the HP change and the kill are never delayed.
- Defect D1, the focus out clamp: GameLayer.js 4296 computes the out phase as `sfDurationTotal / sfDurationTotal * safeDuration`, which is `safeDuration`, while the in and delay phases use their own duration over the total (4294-4295). The clamp never shrinks the out phase today, because `safeDuration` is at least the total (4287). So the value is correct for the current constants and wrong as a rule. fix: scale the out phase like the others (sketch `focusWindow`). Same result today.
- Defect D2, the shake copy: `reverse()` returns a shake with no origin (Shake.js 49, so it falls back to (0, 0) at 22), and `clone()` calls `initWithDuration` with no strength (54), so its offsets become NaN. fix: keep origin and strength on copy (sketch `copyShaker`).
- Shake origin: GameLayer passes `cc.p(0, 0)` (4311). That is correct only if the FX layer's base position is (0, 0), which was not read. If the layer is placed elsewhere, the shake returns the layer to the wrong place. Frankendom must return the shake to the layer's own stored origin.
- Randomness: the shake uses `Math.random()` per update (Shake.js 32-33), so the look is not repeatable and it changes with the frame rate (more updates means more jitter steps). Client-only, so acceptable; do not feed it into anything that is replayed.
- Impact delay for plain sprites: the donor's default for `impactAtEnd` (FXSprite.js) was not read. If a plain death burst has the default false, its impact delay is 0 and the reaction starts at action start. Check the default before copying the rule.
- Death and finisher staging: the donor's die show waits for the death animation's length (GameLayer 3441-3442). That is a per-creature data value; Frankendom's equivalent is the creature's clip length (row 7), which should come from the catalogue, not a constant.
- Card and faction data: the FX lists are data (fx.js), keyed by faction and card resource names. That shape transfers: effect lists per event type in the catalogue (row 21), not in the engine.
- Hint file: `app/view/fx/FX.js` (the hint) is a render post-process manager (blur, bloom, radial blur). It is not the death or hit mechanism and it is a render helper for Frankendom's camera or post-processing, which is outside this cell.
