# FunkinCrew-Funkin (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/PlayState.hx` (health bar update 2766-2776, HUD placement 1987-2008), `/mnt/frankendom-donors/FunkinCrew-Funkin/source/funkin/play/components/HealthIcon.hx` (icon state 324-360, position 267-291) | Licence: Apache 2.0 for the source, as stated in `LICENSE.md` line 3 (only lines 1-5 read; full licence text not read) | Haxe (Flixel) | symbols `updateHealthBar` (PlayState 2766), `updateHealthIcon` (HealthIcon 324)

Checked: Confidence high for the display lag and the icon thresholds. Read in full: `updateHealthBar` (PlayState 2766-2776), the update entry (1031-1037), the health cap (1213-1215), the bar placement (1987-2008), `HealthIcon.update` (229-241), `updatePosition` (267-291), `updateHealthIcon` (324-360), the constants (`Constants.hx` 455-460, 731), `MathUtil.lerp` (104-108), `smoothLerpDecay` (128-132), `smoothLerpPrecision` (141-158), and the deprecated `smoothLerp` (216-229). Not read: `FunkinHitbox.hx` (719 lines, mobile touch hitbox; size only), `PreciseInputManager.hx` (479 lines, input timing; not opened), `TurboButtonHandler.hx` (128 lines; not opened), the icon animation loader (388-460). Camera: not a camera cell. Candidates opened first: `source/funkin/ui/AtlasText.hx` (the hint file: a text atlas renderer; first 30 lines read, it is a rendering helper, not the HUD mechanism), `PlayState.hx`, `HealthIcon.hx`, `MathUtil.hx`, `Constants.hx`, `LICENSE.md`.

## 1. Mechanism

- Health is one float on a 0 to 2 scale (`HEALTH_MAX` 2.0, `HEALTH_STARTING` = max / 2 = 1.0; Constants 455-460). It is capped every update (PlayState 1214-1215) and changed by note events.
- Two values are kept. `health` is the true value. `healthLerp` is the displayed value. Each update, `updateHealthBar()` (called from `update(elapsed)` at 1031-1037) sets `healthLerp = FlxMath.lerp(healthLerp, health, 0.15)` (2774). So each frame the displayed value closes 15 percent of the remaining gap. Bot play sets it straight to the maximum (2770).
- The bar is an `FlxBar` whose value is read from `healthLerp` through `parentVariable` (2006), so the bar lags the true value. Its fill colours are fixed red and green (2008, read via grep). Placement is screen-relative: the bar is centred horizontally and sits at 90 percent of the screen height, or 10 percent when downscroll is on (1995-1998).
- Icon state uses the true value, not the bar. `HealthIcon.updatePosition` (267-291) calls `updateHealthIcon(PlayState.instance.health)` (278) for the player and `updateHealthIcon(MAXIMUM_HEALTH - PlayState.instance.health)` (284) for the opponent, so the opponent's icon is mirrored.
- Thresholds (HealthIcon 91 and 96): winning above 0.8 of max (1.6 on the 0 to 2 scale), losing below 0.2 of max (0.4). The state machine (324-360) is Idle, then ToLosing or ToWinning when a threshold is crossed, then Losing or Winning, then FromLosing or FromWinning back to Idle when the value comes back past the same threshold. The transition animations play in between. There is no separate exit threshold.
- Icon position follows the bar's displayed value: x = bar x + bar width x (remap of displayed value from 0 to 2 onto 100 to 0, times 0.01) minus a 26 px offset (281-288; `POSITION_OFFSET` 123). So the icon rides the fill edge. y is centred on the bar (291).
- Icon bop: while the bop is on, the icon's angle eases to 0 with `MathUtil.smoothLerpPrecision(angle, 0, elapsed, 0.512)` (235). That helper is `lerp(target, base, precision^(deltaTime / duration))` with precision 0.01 (153-157). Its own doc says it equals `smoothLerpDecay` with half-life `-duration / log2(precision)` (141).

## 2. Key functions

- `updateHealthBar` (`PlayState.hx` 2766-2776): the displayed-value chase at 2774; bot play at 2770.
- `update` (`PlayState.hx` 1031-1037): calls `updateHealthBar` once per frame; the cap at 1214-1215.
- Bar placement (`PlayState.hx` 1987-2008): screen-relative position and `parentVariable`.
- `HealthIcon.updatePosition` (`HealthIcon.hx` 267-291): reads the true health for state and the bar's displayed value for position.
- `HealthIcon.updateHealthIcon` (`HealthIcon.hx` 324-360): the state machine, with thresholds at 91 and 96.
- `MathUtil.smoothLerpPrecision` (`MathUtil.hx` 153-158) and `smoothLerpDecay` (128-132): the time-based helpers.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Displayed value chases the true value | 0.15 of the gap per update, no time term (PlayState 2774) |
| Frame-rate effect of that chase | 0.85 per update: 1 percent of the gap is left after about 28 updates, so about 0.47 s at 60 updates per second and 0.94 s at 30 (derived from the formula, not measured) |
| Health range | 0 to 2.0; start at 1.0 (Constants 455-460) |
| Winning icon | above 0.8 of max, i.e. 1.6 (HealthIcon 91) |
| Losing icon | below 0.2 of max, i.e. 0.4 (HealthIcon 96) |
| Icon offset from the fill edge | 26 px (HealthIcon 123) |
| Icon bop settle | duration 0.512 s to reach 1 percent of the gap (Constants 731, passed as duration at HealthIcon 235); the true half-life implied is about 0.077 s (derived) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's two-value idea: a displayed value that chases the true value, and an icon state that reads the true value at fixed thresholds. It changes three things on purpose. The chase uses elapsed time, as `smoothLerpPrecision` does, not a fixed fraction per update. The icon gets an explicit exit band, so a value sitting on a threshold does not toggle the icon. The snap to the target uses an absolute distance, so it also reaches zero. It omits the bot-play snap, the opponent mirror (the caller passes `max - health`), the bar's colours and placement, the bop, the position maths, the transition animations, and the note-event health changes.

```ts
// Licence of donor: Apache 2.0 for the source (LICENSE.md line 3). This sketch is written from the described mechanism, not a translation.
// Client view only: the displayed value and icon state are drawn, never written back to health.

type IconState = "idle" | "winning" | "losing";

interface HealthHudData {
  max: number;           // health maximum (donor: 2.0, data)
  loseAt: number;        // fraction of max below which the losing icon plays (donor: 0.2)
  winAt: number;         // fraction of max above which the winning icon plays (donor: 0.8)
  exitBand: number;      // fraction of max the exit threshold sits away from the entry threshold (proposed, not in donor)
  chaseSeconds: number;  // time for the displayed value to close to within `precision` of the real value
  precision: number;     // residual fraction at chaseSeconds (donor helper default: 0.01)
  snapEpsilon: number;   // absolute snap distance in health units (proposed fix)
}

interface HealthHudState {
  shown: number;         // the displayed (lagging) health
  icon: IconState;
}

// Frame-rate independent chase: the gap to the real value shrinks by precision^(dt / chaseSeconds).
function chaseShown(st: HealthHudState, real: number, dtSec: number, d: HealthHudData): void {
  if (st.shown === real) return;
  const keep = Math.pow(d.precision, dtSec / d.chaseSeconds);
  st.shown = real + (st.shown - real) * keep;
  if (Math.abs(st.shown - real) < d.snapEpsilon) st.shown = real;
}

// Icon state reads the real health, with an exit band so it does not flicker at a threshold.
function stepIcon(st: HealthHudState, real: number, d: HealthHudData): void {
  const lose = d.loseAt * d.max;
  const win = d.winAt * d.max;
  const band = d.exitBand * d.max;
  if (st.icon === "idle") {
    if (real < lose) st.icon = "losing";
    else if (real > win) st.icon = "winning";
  } else if (st.icon === "losing") {
    if (real > lose + band) st.icon = "idle";
  } else {
    if (real < win - band) st.icon = "idle";
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/hu003-funkin-health-chase.ts`).

## 5. Lands in

TARGET `src/fight/hud-bars.ts` (client view module; reads health from the engine state and never writes it). Parity-checklist row 14 (HUD).

Best transferable idea: a health display that chases the true value on elapsed time, while the winning and losing icons read the true value at fixed thresholds with an exit band.

Decision (proposed): adapt. The two-value split (shown versus true) and the icon thresholds fit a client-only HUD under one ledger. Adapt the time base, add the exit band, and fix the snap.

Acceptance: after a 40 percent hit the bar's fill slides down over about 0.5 s whether the game runs at 30 or 60 fps; the losing icon starts when health drops below 20 percent and does not flicker within a 5 percent band around it; a unit test asserts the displayed value after one second agrees at 30 and 60 updates per second within 0.01 of the maximum.

Reuse tag: rewrite-from-idea (Apache 2.0 donor; sketch written from the mechanism, so no notice is carried)
Brief rule served: 14 (HUD, client-only, one ledger); the addendum rule to keep the idea and fix the defects.

## 6. Gaps and risks

- Defect (frame-rate dependence), fix: `healthLerp = FlxMath.lerp(healthLerp, health, 0.15)` (2774) closes a fixed fraction per frame, so the bar takes about twice as long at 30 fps as at 60 fps (derived in section 3). Fix: the time-based chase in the sketch.
- Defect (misnamed constant), fix: `HEALTH_ICON_ANGLE_HALF_LIFE` (Constants 731) is passed as the time to reach 1 percent (HealthIcon 235; MathUtil 141, 157). It is not a half-life: a true half-life of 0.512 s would need a duration of about 3.4 s (derived). Fix: rename to a settle time, or pass a real half-life to `smoothLerpDecay`.
- Defect (snap), fix: the deprecated `smoothLerp` snaps when the gap is under `precision x target` (MathUtil 228). At a target of zero that threshold is zero, so it never snaps. Fix: the absolute snap in the sketch. This helper is marked deprecated (216), so it should not be reused.
- Defect (no exit band), fix: the same threshold decides entry and exit (HealthIcon 334-356); flicker is damped only by the transition animations. Fix: the exit band in the sketch (proposed; the donor has none).
- Frankendom gap (MAX_ATTACKERS = 3): the donor HUD has one player icon and one opponent icon (`iconP1` and `iconP2`, PlayState 1456-1457). It shows one health value. Many-on-one needs one frame per attacker, up to three, with the hate-list order coming from the engine.
- Readability at 375 px: placement is screen-relative (1995-1998), with the downscroll flip, and the bar height is set in the layout, not per device. Not checked on a phone.
- Seen, not read: `FunkinHitbox.hx` (719 lines, the mobile touch hitbox UI) and `PreciseInputManager.hx` (479 lines) and `TurboButtonHandler.hx` (128 lines), which look like input timing. These are candidates for the touch and input-buffer fold-ins and were not opened.
- String table: this donor ships no locale or string table. `assets/` is empty here and the source tree has no locale file (listing read). So there is no grammar to describe in this donor.
- Minimap and world map: not searched in this donor beyond the health and HUD grep. Not claimed either way.

Reuse tag: rewrite-from-idea (Apache 2.0 donor; sketch written from the mechanism)
Brief rule served: 14 (HUD, client view); idea kept, defects fixed in the sketch (addendum rule, 2026-10-10)
