# keldaanCommunity-pokemonAutoChess (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/life-bar.ts` | Licence: GPL-3.0 (LICENSE file, header "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; clean-room, shape only) | TypeScript (Phaser 3 Graphics subclass) | symbol `LifeBar` (class; methods `draw`, `setHp`, `setShield`, `setMaxHp`, `setPP`)

Checked: class `LifeBar` at life-bar.ts 7 to the end of the file (read in full: draw, setHp, setShield, setMaxHp, setPP, setMaxPP, setTeam). Callers read: battle-manager.ts 600-640 (field switch that routes hp, shield, pp, maxHP to the bar), board-manager.ts 995-1046 (partial), pokemon-sprite.ts 922-945 (constructor call), pokemon-avatar.ts 200-225 (fixed 100/100 avatar bar). Not read: the other setHp callers (pokemon-avatar.ts 182 and pokemon-sprite.ts 565 and 616 are grep lines only; board-manager.ts 1035 was read within the 995-1046 block), the Phaser tween internals (stacking behaviour is inferred from the code, not from Phaser source), the Team enum values. The list's hint file, preparation-menu-user.tsx, was not opened: it is the pre-game menu, not the in-match bar. Confidence: high on draw order and numbers; medium on the tween-stacking defect. camera_scope: not applicable (HUD cell).

## 1. Mechanism

- One Phaser Graphics object per Pokemon (or per avatar). It draws a health bar and, under it, a PP bar. The bar is shifted left by half its width so the object origin is its centre.
- Draw order inside `draw()` (called on every tween frame, and on construction): a black rounded frame (1 px border, the inner bar is offset by (1,1)); a dark background strip; the hp fill in team colour, green for the ally side and red for the enemy side (the side is chosen by `this.team === (this.flip ? 1 : 0)`); then a light-grey shield strip drawn right after the hp fill; then the hp tick marks, 4 px dark lines drawn on top.
- Frame scale: `totalLife = max(maxHp, hp + shield)`. The bar always fills its 68 px inner width for `totalLife`. When shield pushes hp + shield above maxHp, the whole frame rescales, so the bar never overflows and the ticks compress.
- Ticks: one tick every 25 hp (`hpPerSegment`). Count is `floor((totalLife - 0.1) / 25)`; the -0.1 stops a tick landing on the far end when totalLife is an exact multiple of 25. Tick spacing in px is `(25 / totalLife) * 68`.
- PP bar: a second, 3 px line at y=8 to 9, 0 to 1 of its width, `max(1)(pp / maxPP)` (which is Math.min, so it clamps to 1; see Section 6). Only drawn when `showPP` is true and maxPP > 0.
- Updates: `setHp`, `setShield` and `setPP` each add a Phaser tween on the bar's own field: 150 ms, `Sine.easeOut`, `onUpdate` calls `draw`. The bar is therefore redrawn each frame of the tween, and the displayed value eases to the new one. `setMaxHp` only stores the new max; it does not redraw. `setMaxPP` stores the value.
- Callers: battle-manager.ts routes each changed field to the bar (`setMaxHp` on maxHP; `setHp` on hp; `setShield` on shield, with a boost popup when shield rises; `setPP` on pp, clamped first to maxPP by `max(pokemon.maxPP)`, which is Math.min). The sprite is also scaled from max hp: `2 * sqrt(1 + (maxHP - baseHP) / baseHP)` (battle-manager.ts 616). The scale grows with the square root of the hp ratio: a creature with twice its base hp gets scale 2 * sqrt(2), about 2.83, against a base scale of 2 (1.41 times the base sprite scale).
- Event-driven, not per-frame polling: the bar only changes when the battle stream sends a changed field. The source of that stream was not read.

## 2. Key functions

- `LifeBar.draw`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/life-bar.ts` 58-136 (frame, hp fill, shield strip, ticks, PP bar).
- `LifeBar.setHp` / `setShield` / `setPP`: the same file, 138-176 (each a 150 ms tween with onUpdate draw; setTeam starts at 177).
- Field router: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/battle-manager.ts` 616-634 (maxHP, hp, shield, pp cases). The method that contains this switch starts earlier; the nearest method header above line 616 is at 417 (changeCount), but the switch's enclosing method was not confirmed.
- Constructor from a sprite: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/public/src/game/components/pokemon-sprite.ts` 922-945 (x 0, y 25, team from the pokemon, flip from the sprite).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Fixed-unit ticks: one tick per 25 hp, so the player counts ticks, not px | `hpPerSegment = 25` (theirs, life-bar.ts 67) |
| Frame scale grows to hp + shield when shield overflows max | `Math.max(this.maxHp, this.hp + this.shield)` (theirs, life-bar.ts 76) |
| Bar width | 70 px outer, 68 px inner (theirs, life-bar.ts 59) |
| Value eases to the new state | 150 ms, Sine.easeOut (theirs, life-bar.ts 142, 144) |
| Tick count stops short of the far end | `- 0.1` before dividing (theirs, life-bar.ts 105) |
| Sprite size from max hp | `2 * sqrt(1 + (maxHP - baseHP) / baseHP)` (theirs, battle-manager.ts 616; same formula also at pokemon-sprite.ts 204 and board-manager.ts 1029, not read in detail) |
| Team colour | green `0x76c442` ally, red `0xe76e55` enemy (theirs, life-bar.ts 63-64) |

## 4. TypeScript sketch

simplified: the sketch returns geometry (ratios and tick x positions) and a tween value, not Phaser draw calls. It omits the rounded frame, the background strip, team colours, the PP bar, the boost popups and the sprite-size rule. It uses INNER_WIDTH_PX (68) where the donor writes a literal 68 for the shield strip. It restarts each tween from the value on screen, which the donor does not do (Section 6, defect 2). Geometry is recomputed from engine values each time, so a max change cannot leave the frame stale (defect 3).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const BAR_WIDTH_PX = 70;
export const INNER_WIDTH_PX = BAR_WIDTH_PX - 2;
export const HP_PER_TICK = 25;   // tunable; donor constant
export const TWEEN_MS = 150;     // tunable; donor constant

export interface FrameInput { maxHp: number; hp: number; shield: number; }

export interface FrameGeometry {
  lifeRatio: number;   // hp fill, 0..1 of the frame
  shieldRatio: number; // shield strip, 0..1 of the frame, drawn after the hp fill
  tickXs: number[];    // px x of each hpPerTick tick inside the inner bar
  totalLife: number;   // frame scale: maxHp, or hp + shield when that overflows it
}

// Pure geometry: recomputed from the engine values on every change, so the frame never holds stale state.
export function frameGeometry(f: FrameInput, hpPerTick: number = HP_PER_TICK): FrameGeometry {
  const hp = Math.max(0, f.hp);
  const shield = Math.max(0, f.shield);
  const totalLife = Math.max(f.maxHp, hp + shield);
  const lifeRatio = hp / totalLife;
  const shieldRatio = shield / totalLife;
  const tickPx = (hpPerTick / totalLife) * INNER_WIDTH_PX;
  // The -0.1 keeps a tick off the far end when totalLife is an exact multiple of hpPerTick.
  const count = Math.floor((totalLife - 0.1) / hpPerTick);
  const tickXs: number[] = [];
  for (let i = 1; i <= count; i++) tickXs.push(i * tickPx);
  return { lifeRatio, shieldRatio, tickXs, totalLife };
}

// Ease-out sine over durationMs. Fraction t is clamped to 0..1.
export function tweenedValue(from: number, to: number, elapsedMs: number, durationMs: number = TWEEN_MS): number {
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return from + (to - from) * Math.sin((t * Math.PI) / 2);
}

// One live tween per bar field. A new target restarts from the value on screen now,
// so two quick changes never run in parallel and fight each other.
export class AnimatedValue {
  private from: number;
  private to: number;
  private startMs = 0;
  constructor(initial: number) { this.from = initial; this.to = initial; }
  set(target: number, nowMs: number): void {
    this.from = this.valueAt(nowMs);
    this.to = target;
    this.startMs = nowMs;
  }
  valueAt(nowMs: number): number {
    return tweenedValue(this.from, this.to, nowMs - this.startMs);
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/HU022-pokemonautochess-hpframe.ts): passed, no output.

## 5. Lands in

- TARGET `src/fight/health-frame.ts` (new client view model; the engine owns hp and shield, the frame only renders them). Parity-checklist row 14 (HUD).
- today: not checked in this pass (Frankendom's current HUD code was not read; the target is taken from the rulings and the parity row).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (client view of engine values; the frame reads, never writes); rule 8 (target file and parity row named)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism. Nothing here is a line-by-line port.
- Defect 1 (not a live bug today): the shield strip width is a literal `68` (life-bar.ts 98) where the inner width is the named `innerBarWidth`. Fix: use `INNER_WIDTH_PX` (done in the sketch).
- Defect 2 (live risk): `setHp`, `setShield` and `setPP` each call `scene.tweens.add` on the same object with no kill of an earlier tween (life-bar.ts 139-145, 149-155, 163-169). Two quick hp changes can run two tweens on `hp`. Phaser's behaviour for this was not read. Fix: one live tween per field, restarting from the value on screen (`AnimatedValue` in the sketch).
- Defect 3 (small): `setMaxHp` (life-bar.ts 158-160) stores the value and does not redraw, so a max change only shows at the next hp tween frame. Fix: recompute geometry on every set (the sketch's pure `frameGeometry` does this).
- Naming trap: `max(n)(x)` in app/utils/number.ts returns `Math.min(n, x)` (lines 5-8). life-bar.ts 125 reads like a floor but is a clamp to 1, and battle-manager.ts 634 is a clamp to maxPP. The code is correct; the name is inverted. Fix in our utils: name them `atMost` and `atLeast`.
- Design choice, not a defect: when shield overflows max, the ticks compress and no longer mark the base max. The 25-hp unit is kept in value but not in spacing. Decide whether a shielded hero's frame should keep base-max spacing (cap the scale at maxHp and clip the shield) or rescale as the donor does.
- Frankendom rulings: the frame reads engine hp and shield only, so server-verified values drive it. The hit-impact timing lives in row 10 and the tween here is cosmetic only: a 150 ms ease must never delay a kill or a state change.
- Cost: the donor redraws the whole bar on every tween frame (150 ms per change). No timing was measured in this pass.
- Not read: how the battle stream orders multiple field changes in one tick (so the order of hp, shield and pp updates within one event is unknown).
- Also seen (string table, hud-ui fold-in): the English table is `app/public/dist/client/locales/en/translation.json` (a build output copy; the source is not in src). It has 5,234 leaf entries under 355 top-level keys. Other locales: fr 5,196, de 4,353, es 4,903, it 4,469, pt 5,202, nl 1,938, bg 2,487, zh 5,226, ko 5,232 (so nl and bg fall back to English often). Grammar: i18next nested JSON; 92 placeholder names in `{{name}}` form (159 values use them); 115 values nest another key through `$t(...)`; plurals use only the `_one` and `_other` suffix pairs (9 pairs); HTML escaping is off in the i18n init (i18n.ts), so values are plain text. Quoted nothing.

Best transferable idea: a health frame that draws one tick every fixed unit of hp, scales its full width to hp plus shield when shield overflows max, and eases each change over 150 ms, so the player counts ticks at a glance on a 375 px screen.
Decision (proposed): adapt — keep the tick-per-unit frame and the shield overflow rule for the hero and enemy frames; fix the tween stacking (one live tween per field) and the stale max redraw; keep the tick size in one constant so a boss can use a bigger unit.
Acceptance: at 375 px wide a 100-max enemy frame shows ticks at 25, 50 and 75 hp; a hero at 100/100 with 40 shield shows a 140-unit frame with ticks at 25 to 125 and a light strip after the hp fill; a unit test asserts the frame never exceeds its 68 px inner width and that two quick hp changes end on the second value.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (client view of engine values); rule 8 (named target file and parity row 14)
