# flareteam-flare-game (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` (function `Entity::takeHit`, with `StatBlock.cpp`, `EngineSettings.cpp`, `UtilsMath.h`, `HazardManager.cpp`). The game repo (`/mnt/frankendom-donors/flareteam-flare-game/`) holds only mod data, art and maps; its combat rules are in `mods/*/engine/combat.txt` and the code is in the sibling engine donor | Licence: GPL-3.0 for the engine (`/mnt/frankendom-donors/flareteam-flare-engine/COPYING`, "Version 3, 29 June 2007"); the game repo's own LICENSE.txt is CC BY-SA 3.0 (data only) | C++ | symbol `Entity::takeHit`

Checked: `Entity::takeHit` is defined at Entity.cpp 319 and read end to end (319-727, the closing `return true;` is at 727). Its helpers were read: `StatBlock::applyResistToDamage` (StatBlock.cpp 1644-1656), `StatBlock::takeDamage` (879-880, the first lines only), `EngineSettings::Combat::load` defaults (348-366) and key parsing (372-409, the keys used here), `resourceRound` (450-452), `percentChanceF` (UtilsMath.h 63-64). Callers: `HazardManager.cpp` 129 (enemies) and 146 (the hero); I read both call sites and the loop around them (107-146). Confidence high on the order of steps and on the default numbers. Not read: how ABS_MIN, ABS_MAX, AVOIDANCE, CRIT and POISE are derived from the primary stats (`StatBlock::get`); `StatBlock::takeDamage` past its first lines (death rewards); `effects.damageShields`; where `triggered_block` is set (PowerManager.cpp 1997 only seen as a write); knockback (EffectManager.cpp 471-472 only the mapping line); the hazard update function that encloses the loop (name and frame driver not read). Searches: grep for takeHit, crit, absorb, avoidance, resist, knockback across the engine src; the game repo has no combat code.

## 1. Mechanism

- One function resolves each hazard hit on one target: `Entity::takeHit(Hazard &h)`, called from `HazardManager.cpp` 129 (enemies) and 146 (hero). A hazard (projectile or area effect) hits a given target once: the loop checks `hazard->hasEntity(e)` (126, 143) and the radius (125) before calling.
- Order of steps (as the code runs):
  (a) Gates, each returns false with no hit: category filter, power filter, target already dead, movement type, walls block AoE, campaign invincibility (354), beacon (366), reflect (before line 389). Entering combat is set here too (join_combat).
  (b) Accuracy and avoidance (from line 389, "if it's a miss, do nothing"). Accuracy is the hazard's copy of the source's ACCURACY stat (PowerManager.cpp 1452), changed by the power's accuracy modifier (multiply, add or absolute). Avoidance is the target's AVOIDANCE stat, unless the power ignores it (400). Raw margin = 100 - (accuracy - avoidance) (403). If the margin is below 0 and the source is not perfect-accuracy, an overhit is rolled with chance |margin| (404). Then the margin is clamped to [min_avoidance, max_avoidance] (405) and a miss is rolled with the clamped value (408).
  (c) Typed damage. For each damage type, roll min..max, apply the power's base-damage modifier to the base-damage slot only, then `applyResistToDamage` (428; resist clamped to [min_resist, max_resist] when non-negative, negative values are weakness and are not clamped; damage x (100 - resist) / 100, StatBlock.cpp 1650-1656).
  (d) Absorb (unless the power has armour penetration): absorb rolled from ABS_MIN..ABS_MAX (434). Expressed as a percent of the hit and held in [min_absorb, max_absorb] percent (or the block limits if the target is in a triggered block) (436-452, the block starts at 436). Absorb rounds up to 1 if it came out 0 (454). Then `dmg = dmg - absorb` (457). If that is 0 or less: dmg = 0, and unless the power ignores zero damage (460), dmg becomes 1 when the relevant cap is under 100 (461-463).
  (e) Crit roll: chance = hazard's crit_chance (copied from the source's CRIT, PowerManager.cpp 1451) with a power modifier, plus a stunned or slowed penalty (475-485). If crit: dmg = dmg x rolled crit percent / 100 (490; default 200, so x2). Else if overhit: dmg = dmg x rolled overhit percent / 100 (497; default 100, so x1). Crit and overhit do not stack: crit wins (the `else if`).
  (f) Miss: if missed, dmg = dmg x rolled miss percent / 100 (503). Default miss percent is 0, so a clean miss deals 0. This applies on top of crit.
  (g) Round with the resource round method, default round (506, EngineSettings.cpp 452 and 364). If dmg is 0 and the power does not ignore zero damage (508-509), show "miss" and return false.
  (h) Apply: `stats.takeDamage(dmg, crit, source)` (532). Shields are drained first (StatBlock.cpp 880), then HP; at 0 the death path runs (rewards, not read past its start).
  (i) After effects if damage > 0 (the block starts after line 532): HP, MP and resource steal (each with a resist roll, from line 542), return damage (from line 588; reflected to the source with the source's own reflect resist), then the remove-effect and post-power chain blocks, then the hit reaction (from line 650).
  (j) Hit reaction, if dmg > 0 and the hit cooldown has ended: poise is rolled (style chance by default: `percentChanceF(POISE)`; hp style: damage / HP max x 100 <= poise; absorb style: absorb / damage x 100 > poise) (686). The entity goes to the hit state unless it is stunned, or poised and not crit (698). Crit always gets through poise (681).
- Tick: no timer of its own. It runs once per hazard per target, when a hazard overlaps a target in the hazard update loop (HazardManager.cpp 107-146). Frame-driven; the frame driver was not read.

## 2. Key functions

- `Entity::takeHit`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` 319-727. The whole pipeline above.
- Accuracy and avoidance block: Entity.cpp 398-408 (overhit before clamp, miss on clamped value).
- Typed damage and absorb block: Entity.cpp 420-463 (resist per type at 428; absorb at 434-457; quirk at 461-463).
- Crit, overhit, miss block: Entity.cpp 475-506.
- Resist helper: `StatBlock::applyResistToDamage`, StatBlock.cpp 1644-1656.
- Mod overrides: `/mnt/frankendom-donors/flareteam-flare-game/mods/empyrean_campaign/engine/combat.txt` (six lines: absorb 0-90, resist 0-90, block 0-100, avoidance 0-99, miss 25-50, overhit 125-150). `mods/fantasycore/engine/combat.txt` contains only comments (defaults stand).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Margin = 100 - (accuracy - avoidance); overhit chance = |margin| when margin < 0; then clamp; miss roll on the clamped value | Clamp 0..100 by default (theirs, EngineSettings.cpp 356-357); mod sets avoidance 0-99 (theirs, empyrean combat.txt line 4) |
| Resist per type: damage x (100 - resist) / 100, clamped, weakness unclamped | Resist clamp 0..100 default (theirs, EngineSettings.cpp 352-353); mod 0-90 (theirs, empyrean combat.txt line 2) |
| Absorb: rolled, held to a percent band of the hit, at least 1 when it rounds to 0 | Absorb band 0..100 default (theirs, EngineSettings.cpp 350-351); mod 0-90 (theirs, empyrean combat.txt line 1) |
| Crit multiplies, overhit multiplies, crit wins over overhit, miss multiplies on top | Crit 200 percent default (theirs, EngineSettings.cpp 360-361); overhit 100 default (theirs, 362-363); overhit 125-150 in empyrean (theirs, combat.txt line 6); miss 0 default (theirs, 358-359); miss 25-50 in empyrean (theirs, combat.txt line 5) |
| Poise: a crit always breaks poise; chance, HP-ratio or absorb-ratio styles | Default style chance (theirs, EngineSettings.cpp 366) |
| Rounding to nearest whole | Round method default (theirs, EngineSettings.cpp 364; roundf at 452) |

Clamp shape: the donor clamps avoidance with `std::min(std::max(...))` (405), so a margin beyond the limits is held at the limit, not discarded.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the damage pipeline: typed damage with resist, absorb, the overhit and miss rolls (overhit margin taken before the clamp, miss roll on the clamped value), then crit or overhit, then miss scaling, rounding, and poise (crit ignores poise). It differs in four ways. (1) RNG order: the sketch draws the typed damage before the avoidance rolls, while the donor draws the miss roll before the damage rolls (same distribution, different order). (2) It omits power accuracy and damage modifiers, armour penetration, avoidance-ignore, perfect accuracy as a power trait (kept only as the source flag), the triggered-block limits, ignore-zero-damage, the crit penalty for stun or slow, shields, steal, return damage, reflect, chain powers, the stun check on reaction, combat text and the camera and rumble. (3) The donor's 1-damage quirk is kept only for the non-block case, as in the donor. (4) Limits are passed in as data (the mod's combat.txt values), not read from a file.

```ts
// Licence: GPL-3.0 (donor engine). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Rng = () => number; // returns 0..1

// Combat limits are data (engine defaults overridden per mod), all in percent.
interface Limits {
  minAbsorb: number; maxAbsorb: number;
  minResist: number; maxResist: number;
  minAvoid: number; maxAvoid: number;
  minCrit: number; maxCrit: number;     // default 200 / 200
  minOver: number; maxOver: number;     // default 100 / 100
  minMiss: number; maxMiss: number;     // default 0 / 0
}

interface Hit {
  accuracy: number;               // attacker accuracy after power modifier
  crit: number;                   // attacker crit chance, percent
  perfect: boolean;               // never misses, never overhits
  dmg: { min: number; max: number }[];  // one range per damage type
}

interface Target {
  avoidance: number;              // percent
  absorbMin: number; absorbMax: number; // percent of the hit, rolled
  resist: number[];               // per damage type; negative = weakness, not clamped
}

const chance = (rnd: Rng, pct: number) => rnd() * 100 < pct;     // donor percentChanceF
const between = (rnd: Rng, a: number, b: number) => (a === b ? a : a + rnd() * (b - a));
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function resolveHit(hit: Hit, t: Target, L: Limits, rnd: Rng) {
  // 1. typed damage, resisted per type before absorb
  let dmg = 0;
  hit.dmg.forEach((d, i) => {
    const raw = between(rnd, d.min, d.max);
    const r0 = t.resist[i] ?? 0;
    const r = r0 >= 0 ? clamp(r0, L.minResist, L.maxResist) : r0;
    dmg += (raw * (100 - r)) / 100;
  });

  // 2. absorb: rolled, then held inside [minAbsorb, maxAbsorb] percent of the hit; at least 1 when it rounds to 0
  if (dmg > 0) {
    let absorb = between(rnd, t.absorbMin, t.absorbMax);
    if (absorb > 0) {
      const pct = (absorb * 100) / dmg;
      if (pct < L.minAbsorb) absorb = (dmg * L.minAbsorb) / 100;
      if (pct > L.maxAbsorb) absorb = (dmg * L.maxAbsorb) / 100;
      if (absorb === 0) absorb = 1;
    }
    dmg -= absorb;
    if (dmg <= 0) {
      dmg = 0;
      if (L.maxAbsorb < 100) dmg = 1; // donor quirk: a capped absorb still lets 1 through
    }
  }

  // 3. avoidance vs accuracy. Overhit uses the raw margin BEFORE clamping; the miss roll uses the clamped value.
  const raw = 100 - (hit.accuracy - t.avoidance);
  const overhit = !hit.perfect && raw < 0 ? chance(rnd, Math.abs(raw)) : false;
  const avoid = clamp(raw, L.minAvoid, L.maxAvoid);
  const missed = !hit.perfect && chance(rnd, avoid);

  // 4. crit OR overhit (crit wins), then a miss scales what is left (miss applies on top of crit)
  const crit = chance(rnd, hit.crit);
  if (crit) dmg = (dmg * between(rnd, L.minCrit, L.maxCrit)) / 100;
  else if (overhit) dmg = (dmg * between(rnd, L.minOver, L.maxOver)) / 100;
  if (missed) dmg = (dmg * between(rnd, L.minMiss, L.maxMiss)) / 100;

  dmg = Math.round(dmg);
  return { dmg, crit, missed, overhit };
}

// Poise: a poised target takes no hit reaction. A crit always gets through.
export function isPoised(style: "chance" | "hp" | "absorb", poise: number, dmg: number, absorb: number, hpMax: number, crit: boolean, rnd: Rng): boolean {
  if (crit) return false;
  if (style === "chance") return chance(rnd, poise);
  if (style === "hp") return hpMax > 0 && (dmg / hpMax) * 100 <= poise;
  return dmg > 0 && (absorb / dmg) * 100 > poise;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file copied to /tmp/flare-combat.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/damage.ts` (the one hit resolver: accuracy vs avoidance, overhit, crit, miss, absorb, resist; server-side, so a kill is verified on the server). Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (GPL-3.0 engine; clean-room only; the game-data CC BY-SA 3.0 is not copied)
- Brief rule served: one engine (one resolver for every hit); zones as data (the combat limits are mod data, as in the donor's combat.txt)

Best transferable idea: resolve each hit in one fixed order, avoidance (with an overhit margin taken before clamping), then per-type resist, absorb, crit or overhit, then miss, and let the mod set every limit as data.

## 6. Gaps and risks

- GPL-3.0 engine: clean-room only; the sketch is written from the mechanism.
- The game repo has no combat code. The donor for this cell is the engine, a sibling donor. Frankendom must not treat the game-data repo as a source of rules; the rules are in the engine.
- The donor's miss default is 0 damage, so an ordinary miss does nothing and the crit default is x2. Frankendom should decide these defaults once, as zone or mod data, and record them in the parity checklist.
- Overhit exists only for a margin below 0 (accuracy above 100 + avoidance). It is a rare, separate path from miss. Frankendom's MAX_ATTACKERS = 3 rule does not change this; no multi-attacker logic is in takeHit.
- The donor applies absorb after resist, and crit after absorb, so armour is not multiplied by crit. Frankendom must pick one order and test it; the donor's order is one reasonable choice.
- The donor evaluates poise only when damage is above 0 (the reaction itself also needs the hit cooldown to have ended). The sketch draws random numbers in a different order from the donor. A seeded test must not depend on draw order.
- Knockback exists in the donor (EffectManager.cpp 471-472 and the effect type) but is not part of takeHit. A vector push has no counterpart in Frankendom's guard and stagger model; do not port it as a physics push.
- Several numbers come from the stat derivation (ABS, AVOIDANCE, CRIT, POISE per primary stat). Those were not read; Frankendom's values must come from its own stat model.
- The donor reads `rand()` through `randBetweenF`, so outcomes are not reproducible across platforms. Frankendom needs a seeded random source on the server.
