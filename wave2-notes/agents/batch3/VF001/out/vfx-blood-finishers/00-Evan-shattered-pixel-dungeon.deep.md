# 00-Evan-shattered-pixel-dungeon (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/sprites/CharSprite.java` | Licence: GPL-3.0-or-later (file headers: "version 3 of the License, or (at your option) any later version"; `LICENSE.txt` is the GPL v3 text) | Java | symbol `bloodBurstA`

Checked: Read the blood path end to end: `Char.attack` (overload at `actors/Char.java` 372) around the hit, through the blood call at 558; `CharSprite.bloodBurstA` 347-353, `blood()` 355-357, `flash()` 359-362, flash reset 583-585; `effects/Splash.java` 36-77 and 121-135; `SPD-classes/.../noosa/particles/PixelParticle.java` 40-68; `SPD-classes/.../utils/PointF.java` 146-156. Also read the decal path the cell hinted at: `effects/Wound.java` (whole file, 98 lines), its callers `actors/mobs/Mob.java` 840-880 and `levels/traps/GrippingTrap.java` 40-62, `effects/Surprise.java` 32-80 (contrast only), `effects/Effects.java` 25-80, and `effects/particles/BloodParticle.java` 30-89 (not on the path that burst uses). Confidence high for the burst count, spread and wound fade. Not read: `Char.attack` lines 372-469 (the accuracy and pre-damage steps), `Emitter.burst`/`start` internals, the base particle integration (velocity then position order is assumed, not read), `surprisedBy()`, and the bodies of the other `bloodBurstA` callers (`DeathMark.java` 197 and 216, `Combo.java` 413, `WarpBeacon.java` 128: seen by grep only). camera_scope: n/a (not a camera cell).

Best transferable idea: Scale the spray of blood particles with the square root of the damage share of max HP, cap it, and aim it from attacker to defender, so a big hit reads bigger without a per-hit special effect.
Decision (proposed): adapt - take the count rule and the attacker-to-defender spray, but drive it from the server-accepted hit event and keep the red wound decal for special openers only, because Frankendom's kills and damage are server-verified and the donor fires this from the attack routine itself.
Acceptance: A hit that does 40% of max HP shows 5 blood particles leaving the defender away from the attacker, on the Pit and zone clients; a 0-damage hit shows none; a Preparation-style opener shows the red wound decal for 1 s, shrinking from 2x to 1x width while it fades.

## 1. Mechanism

- Order of operations inside `Char.attack` (the 4-argument overload): the defender's `defenseProc` returns the effective damage (483); if that is not negative, the damage-reduction step (`dr`), the vulnerable multiplier and `attackProc` run (486-498); then `enemy.damage( effectiveDamage, this )` (512). After that the code runs the Brute and Preparation kill branches (517-555), which can kill the defender outright. The blood call is at 557-560: if the defender has a sprite, it calls `bloodBurstA( sprite.center(), effectiveDamage )` then `flash()`. This runs after the damage line and is not behind an `isAlive()` check in the code I read, so a killing hit also sprays blood.
- `bloodBurstA` (347-353): only when the defender sprite is `visible`. Particle count `n = min(9 * sqrt(damage / maxHP), 9)` truncated to int. It calls `Splash.at( centre, direction, cone pi/2, blood(), n )`. The direction is the angle from the attacker's sprite centre to the defender's centre (`PointF.angle`, atan2 of the difference). `blood()` returns `0xFFBB0000` and is a virtual method, so a sprite can override the colour.
- `Splash.at` (60-77) sets the emitter position, reuses one factory per colour, and calls `emitter.burst( fact, n )` (76). Each particle (127-134) is a `PixelParticle.Shrinking` of size 4 with lifespan 0.5 to 1.0 s (131), speed 40 to 80 in a random angle inside `dir +/- cone/2` (132), and acceleration (0, +100) (133).
- `Shrinking` (61-67) sets size to `size * left / lifespan` on each update, so every spark shrinks to nothing over its life.
- Hit flash on the defender: `flash()` sets the colour to white (`ra = ba = ga = 1f`, 360) and starts a timer at `FLASH_INTERVAL` (361). The sprite update counts it down with `Game.elapsed` and resets the colour at zero (583-585). The constant `FLASH_INTERVAL` is declared at line 74 with value 0.05 s (the value follows a tab on that line).
- Wound decal (separate from the blood): `Wound.hit( Char )` places a red decal on the target sprite's centre (`reset(Visual)`, 53-59, `point( v.center(this) )` at 56). It lives 1 s (`TIME_TO_FADE`, 34, set at 50, 58). Each frame it subtracts `Game.elapsed` (65); when it reaches zero it is killed. Otherwise `p = time / 1`, `alpha = sqrt(p)`, `scale.x = 1 + p` (68-70). It is tinted with `hardlight(1, 0, 0)` (40). It is recycled from the parent group and brought to front (79-84).
- Who calls `Wound.hit` (grep: three call sites, all read): `Mob.defenseProc` at 862-863, in the surprise branch, when the attacking character holds a `Preparation` buff, the mob gets a wound decal instead of the `Surprise` exclamation mark (that `else` branch is `Surprise.hit`). And `GrippingTrap.activate` at 54 (on a character in the trap) and 56 (on an empty cell, `Wound.hit( pos )`). So the wound decal is not the donor's normal hit mark.
- Tick: none of this has its own loop. The particles and the wound decal are advanced by the sprite and emitter update with `Game.elapsed`, which is variable-step (not a fixed step). The burst itself is synchronous, one call per hit.

## 2. Key functions

- `Char.attack` (4-argument overload), `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/actors/Char.java` 372-560: the hit pipeline; the blood call is at 557-560.
- `CharSprite.bloodBurstA`, `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/sprites/CharSprite.java` 347-353: count rule and direction.
- `CharSprite.flash`, same file, 359-362; reset at 583-585.
- `Splash.at` (dir and cone overload) and `SplashFactory.emit`, `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/effects/Splash.java` 60-77 and 127-134: spark speed, life, size, gravity.
- `Shrinking.update`, `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/SPD-classes/src/main/java/com/watabou/noosa/particles/PixelParticle.java` 61-67.
- `Wound` (whole class), `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/effects/Wound.java` 32-97: the decal fade.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Particle count grows with sqrt of damage share, capped | Cap 9 and the sqrt rule (theirs, CharSprite.java 350). Divides by max HP (`ch.HT`), not current HP. |
| Spray from attacker to defender, centred on that direction | Cone pi/2 (theirs, CharSprite.java 351) |
| Spark speed, life, size, gravity | Speed 40 to 80, life 0.5 to 1.0 s, size 4, gravity +100 (theirs, Splash.java 131-133). Units are the engine's (not read). |
| Spark shrinks with remaining life | size x left / lifespan (theirs, PixelParticle.java 65) |
| Flash on hit | 0.05 s (theirs, CharSprite.java 74 and 361); colour white (360) |
| Wound decal: fade over a set time, alpha sqrt, stretch horizontally | 1 s (theirs, Wound.java 34); stretch `scale.x = 1 + p` (70); red `hardlight(1,0,0)` (40) |
| Blood colour | 0xFFBB0000 (theirs, CharSprite.java 356), overridable per sprite |
| Zero damage gives no blood | The formula gives 0 for 0 damage. For negative damage Java's sqrt gives NaN and `(int)` gives 0 (Java semantics, not tested). |

Worked numbers from the formula (computed by hand, not run): 40% of max HP gives 9 x sqrt(0.4) = 5.69, so 5 particles; half of max HP gives 6; full max HP gives 9 (the cap).

## 4. TypeScript sketch

simplified: the sketch keeps the count rule (with an explicit zero guard instead of the Java NaN path), the attacker-to-defender cone, the spark speed, life, size and gravity, the shrink, the wound decal fade and the flash timer. It omits: `Emitter` scheduling and recycling; `BloodParticle` (not on this path); the Preparation and surprise trigger for the wound; the `visible` check; the per-colour factory cache; `blood()` overrides; and the armour, vulnerable and attack-proc steps before the hit. It keeps the donor's order (count from post-armour damage, sparks spawned at the defender centre). The step order (velocity, then position) is my assumption, not read in the donor.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Vec2 { x: number; y: number; }

// One resolved hit. The engine supplies damage after armour and multipliers, as the donor does.
export interface HitFx {
  damage: number;   // post-armour, post-multiplier damage actually applied
  maxHp: number;    // defender MAX HP (the donor divides by max HP, not current HP)
  from: Vec2;       // attacker centre
  to: Vec2;         // defender centre (blood is emitted here)
}

// Tunable values. Donor values shown in the comments.
export interface HitFxTune {
  bloodCap: number;     // donor 9
  spreadRad: number;    // donor pi/2 (full cone width)
  flashSec: number;     // donor 0.05
  woundSec: number;     // donor 1
}

export const DONOR_TUNE: HitFxTune = { bloodCap: 9, spreadRad: Math.PI / 2, flashSec: 0.05, woundSec: 1 };

export interface Spark { x: number; y: number; vx: number; vy: number; life: number; lifeMax: number; size: number; }

// Particle count grows with the square root of the damage share and is capped.
export function bloodCount(damage: number, maxHp: number, t: HitFxTune): number {
  if (damage <= 0 || maxHp <= 0) return 0;
  return Math.floor(Math.min(t.bloodCap * Math.sqrt(damage / maxHp), t.bloodCap));
}

// Spray away from the attacker: direction attacker -> defender, cone centred on it.
export function spawnBlood(fx: HitFx, t: HitFxTune, rand: () => number = Math.random): Spark[] {
  const n = bloodCount(fx.damage, fx.maxHp, t);
  const dir = Math.atan2(fx.to.y - fx.from.y, fx.to.x - fx.from.x);
  const out: Spark[] = [];
  for (let i = 0; i < n; i++) {
    const a = dir + (rand() - 0.5) * t.spreadRad;
    const speed = 40 + rand() * 40;
    const life = 0.5 + rand() * 0.5;
    out.push({ x: fx.to.x, y: fx.to.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
               life, lifeMax: life, size: 4 });
  }
  return out;
}

// Per-frame step: gravity-like pull on y, size shrinks with remaining life. Returns false when spent.
export function stepSpark(s: Spark, dt: number): boolean {
  s.life -= dt;
  if (s.life <= 0) return false;
  s.vy += 100 * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.size = 4 * (s.life / s.lifeMax);
  return true;
}

// Wound decal: alpha = sqrt(p) and horizontal stretch 1 + p, where p falls from 1 to 0 over woundSec.
export function woundFrame(ageSec: number, t: HitFxTune): { alpha: number; scaleX: number } | null {
  const left = t.woundSec - ageSec;
  if (left <= 0) return null;
  const p = left / t.woundSec;
  return { alpha: Math.sqrt(p), scaleX: 1 + p };
}

// Hit flash on the defender: white tint for flashSec, counted down per frame.
export function stepFlash(flashLeft: number, dt: number): number {
  return flashLeft > 0 ? Math.max(0, flashLeft - dt) : 0;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/VF001-hitfx-blood.ts` (block plus `export {};`), exit 0.

## 5. Lands in

- TARGET `src/fight/hitfx.ts` (new client-only presentation module): reads the hit the engine has already accepted and draws sparks, the flash and the wound decal. It never changes health. Parity-checklist row 8 (blood / wounds / decals).
- today: no blood or wound effect in `src/fight/` (not read in this pass; the Frankendom side is taken from the brief).
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only, shape and the count rule, no translated lines)
- Brief rule served: server-verified kills (the client shows the hit the server accepted and never decides damage); camera/HUD/sound client-only

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism. The donor numbers (9, pi/2, 40 to 80, 0.5 to 1.0 s, 1 s) are used only as starting defaults and should be re-tuned for our scale.
- The donor passes its own client-side `effectiveDamage` into the burst. Frankendom must take the damage from the server's accepted hit event. A hit the server rejects must produce no blood, and a server-side kill must still give the burst.
- The donor's wound decal is not its normal hit mark. It appears only for a Preparation-boosted sneak hit on a mob, and for a gripping trap. Using it as the generic hit mark would clutter a many-on-one fight. Keep it for special openers only.
- No cross-hit budget was seen in the path I read. With MAX_ATTACKERS = 3, three hits in one frame give three bursts of up to 9 particles each. That is small, but Frankendom should set a per-frame spark budget as data, not rely on the count.
- Blood colour is a per-sprite method in the donor (`blood()`). Frankendom should treat colour as creature data, not zone data.
- Java NaN handling for negative damage (the donor's implicit zero) is not something Frankendom should copy: the sketch guards it explicitly, and a heal is never a spray.
- Not read: `Char.attack` 372-469, `Emitter` internals, the base particle integration order, `surprisedBy()`, and the bodies of the other burst callers (`DeathMark`, `Combo`, `WarpBeacon`). The velocity-then-position order in the sketch is an assumption.
