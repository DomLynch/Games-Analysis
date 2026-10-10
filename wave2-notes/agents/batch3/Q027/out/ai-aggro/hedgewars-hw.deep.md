# hedgewars-hw (ai-aggro, cell 1)

Donor: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uAIMisc.pas` (with `uAI.pas`) | Licence: GPL version 2 (copyleft; header of uAI.pas and uAIMisc.pas says "version 2 of the License", no "or later" clause; COPYING is GPL v2) | Pascal | symbols `FillTargets`, `RealRateExplosion`, `Walk` (candidate loop), `Think`

Checked: Read in full `FillTargets` (uAIMisc.pas 127-201), `RealRateExplosion` (587-696, all branches for hedgehogs; the trajectory helper `TraceFall` at 471-520 is NOT read, so the fall-damage inputs are "(not read)"), the constants (uAIMisc.pas 32, 106-108), the candidate loop in `Walk` (uAI.pas 133-165), and the selection tail of `Think` (uAI.pas 487-603, lines 547-572 read). Other candidates opened: `uAIAmmoTests.pas` (grep only: the friendlyfactor uses at 1410 and 2050; the ammo tests that produce each per-shot rate are NOT read), `uAIActions.pas` and `uAI2.pas` (not read), and the Rust port `rust/lib-hwengine-future/src/ai_state/attack_tests.rs` (grep only, lines 28-55; not read). Confidence: high on the rating rule and selection as written; medium on completeness because the ammo tests and the movement search (`Walk`, uAI.pas 309-485, beyond the candidate loop) are not read. The initial value of `BestActions.Score` before a Think is not read. camera_scope: n/a (ai-aggro).

Best transferable idea: score every candidate action by summing per-target values, where ally hits subtract value scaled by a weight that depends on how many allies and enemies are still alive, then keep the best candidate only if it beats the current one by a margin.
Decision (proposed): adapt - the rating shape (enemy value positive, ally harm weighted by living-count ratio, kill bonus, margin before switching) is the reusable part for choosing an attack or AoE option in a many-on-one fight; the artillery trajectory tracing and the per-weapon ammo tests do not fit a fast duel and are rejected.
Acceptance: if an area action exists in src/fight/ai-target.ts, a server test with one AI fighter, two living enemies and one living ally inside the blast asserts that the action rates negative and is not chosen, and that with the ally removed the same action is chosen; a kill-shot outranks an equal-damage non-kill shot.

## 1. Mechanism

- The target list is rebuilt once per AI think by `FillTargets` (uAIMisc.pas 127-201). It takes living hedgehogs (not the thinking one, team not gone, health above damage taken, lines 140-146), graves with zero health, live explosives, and mines with damage under 35. Each entry gets a `Score`: a hedgehog of the attacker's clan gets `Damage - Health` (169), an enemy hedgehog gets `Health - Damage` (174). The same-clan test at 167 also decides whether the loop increments the ally count `f` or the enemy count `e`.
- Friendly weight (199-200): `friendlyfactor` is a percent. If enemies outnumber allies (`e > f`) it is `300 + (e - f) * 30`. Otherwise it is `max(30, 300 - f * 80 div max(1,e))`. So a hit on an ally costs 3x when enemies are ahead, and falls toward 0.3x when allies outnumber enemies, never below 30 percent. The donor gives no comment on intent.
- Candidate aim points (uAI.pas 133-148): `Walk` loops over target entries with `Score >= 0`, which are the enemy-side entries, and for each usable ammo calls the ammo test. Each test returns one rate.
- Rating one shot, `RealRateExplosion` (587-696): first the attacker's own position is appended as an ally entry with `Score := -ThinkingHH^.Health` (606-607) when `afIgnoreMe` is off. For each live entry the damage is `dmg = dmgMod * min((dmgBase - dist) div 2, r)` where `dmgBase = r + Radius div 2` (624-626), applied only when the Manhattan distance is under `dmgBase`.
  - Enemy hedgehog, not killed: `rate += dmg * 1024` (676).
  - Enemy hedgehog, killed (`dmg + fall >= Score`, 660): `rate += KillScore * 1024 + dmg` (670), then a follow-on explosion of radius 61 is rated when the fall is small (`dX < 0.035`, 664-668) and added only if its absolute value is above 2000.
  - Ally hedgehog, not killed: `rate -= dmg * friendlyfactor div 100 * 1024` (677). Ally killed: `rate -= KillScore * friendlyfactor div 100 * 1024` (671).
  - Drowning (negative fall damage, branch at 656-658) is scored separately with `Score div 10` terms; the branch is read but its input from `TraceFall` is not.
  - If some entry was skipped (`matters` false, 620) and the total is not positive, the shot returns `BadTurn` (692-693).
- Selection in `Walk` (uAI.pas 150-151): a candidate must be above `BadTurn` and above the current best. Once the current best is non-negative, a challenger must exceed it by `(BotLevel - 1) * 2048`. While the best is negative, any higher challenger replaces it.
- `Think` (uAI.pas 487-603) runs once per AI turn on the AI thread (`SDL_SemPost(ThreadSem)` at 602). If the best score is below -1023 (547), it falls back to a tardis action or a skip with score 250 (563, 572). This is a per-turn decision, not a per-frame loop; there is no fixed tick in this function.

## 2. Key functions

- `FillTargets`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uAIMisc.pas` 127-201 (builds Targets, Score, f, e, friendlyfactor).
- `RealRateExplosion`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uAIMisc.pas` 587-696 (rates one blast; recursive for kills).
- `Walk` candidate loop: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uAI.pas` 133-165 (per-target, per-ammo rating and best-action comparison). Walk body 309-485 otherwise (not read).
- `Think`: `/mnt/frankendom-donors/hedgewars-hw/hedgewars/uAI.pas` 487-603 (sets dmgMod at 494, runs Walk, gives up at 547).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (points unless noted) |
|---|---|
| Enemy value is damage (or a kill), positive | 1 point of damage = 1024 rate units (676); kill bonus 200 (`KillScore`, uAIMisc.pas 106) |
| Ally harm is damage times a living-count weight | `friendlyfactor` default 300 percent (108); +30 per enemy above allies (199); `max(30, 300 - allies*80/enemies)` when allies lead (200) |
| Kill bonus is also weighted for allies | `KillScore * friendlyfactor div 100` (671) |
| Damage falls off with distance, halved, capped at radius | `dmgBase = r + Radius div 2` (624); `min((dmgBase - dist) div 2, r)` (626); `dmgMod` = 0.01 * cDamageModifier * cDamagePercent (uAI.pas 494; the two source constants are not read) |
| Switch to a new best only with a margin when best is non-negative | `(BotLevel - 1) * 2048` (uAI.pas 151) |
| Floor on ally weight | 30 percent (200) |
| Unusable candidate | `BadTurn = Low(LongInt) div 4` (32) |
| Give-up threshold | best below -1023 (uAI.pas 547) |
| Target cap | 255 entries (151) |

## 4. TypeScript sketch

simplified: the sketch keeps only the rating rule (enemy and ally marks, kill bonus, count-weighted friendly factor) and the margin-based pick. It omits the falling-target trace (`fallDmg`), the drowning terms, the follow-on explosion after a kill, explosive, mine and grave kinds, the self entry (the caller must add the attacker as an ally mark), the skipped-entry rule (`hadSkips`), the Pascal `Byte` wrap of BotLevel, and the give-up threshold. `pickBest` starts from the first non-bad candidate, not from the donor's initial `BestActions.Score` (not read), so the first-round behaviour may differ. Constants are the donor values read at the receipts. The sketch is clean-room (GPL-2 donor).

```ts
// Licence of donor: GPL version 2 (copyleft). Clean-room: written from the described rule, not translated.
const UNIT = 1024;            // rate units per point of damage
const KILL_SCORE = 200;       // flat bonus per kill, in points
const BAD_TURN = -536870912;  // no-go value

interface Mark {
  side: "ally" | "enemy";
  hp: number;   // remaining health before this action
  dmg: number;  // damage this action would deal to it (0 if none)
}

// Weight of a hit on an ally, in percent. allies and enemies are living counts, excluding the actor.
function friendlyFactor(allies: number, enemies: number): number {
  if (enemies > allies) return 300 + (enemies - allies) * 30;
  return Math.max(30, 300 - Math.floor((allies * 80) / Math.max(1, enemies)));
}

// Rate one aim point: enemy hits add value, ally hits subtract value scaled by the factor.
function rateAim(marks: Mark[], allies: number, enemies: number): number {
  const ff = friendlyFactor(allies, enemies);
  let rate = 0;
  for (const m of marks) {
    if (m.dmg <= 0) continue;
    const killed = m.dmg >= m.hp;
    if (m.side === "enemy") {
      rate += killed ? KILL_SCORE * UNIT + m.dmg : m.dmg * UNIT;
    } else {
      rate -= killed
        ? Math.floor((KILL_SCORE * ff) / 100) * UNIT
        : Math.floor((m.dmg * ff) / 100) * UNIT;
    }
  }
  return rate;
}

// Keep the best candidate. Once the best is non-negative, a challenger must beat it by a margin set by bot level.
function pickBest<T extends { rate: number }>(cands: T[], botLevel: number): T | null {
  let best: T | null = null;
  for (const c of cands) {
    if (c.rate <= BAD_TURN) continue;
    if (best === null) { best = c; continue; }
    if (c.rate > best.rate && (best.rate < 0 || c.rate > best.rate + (botLevel - 1) * 2048)) best = c;
  }
  return best;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 /tmp/q027-hedgewars-hw.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/ai-target.ts` (new module: the AI brain's rating of an aim or area option; the engine owns it, not the Pit client). Parity-checklist row 2 (AI brain).
- Reuse tag: rewrite-from-idea (GPL-2; clean-room only)
- Brief rule served: 1 (one engine: target choice lives in the engine, not a client); rules 7-9 n/a

## 6. Gaps and risks

- The donor rates artillery shots over a landscape. A fast duel has no projectile path, so `TraceFall`, the per-weapon ammo tests and the walk search do not transfer. Only the rating and the margin rule are candidates.
- The friendly weight rises when enemies outnumber allies and falls toward 0.3x when allies lead. Frankendom must decide whether it wants that direction before it adopts the numbers; the donor gives no reason. With MAX_ATTACKERS = 3 the counts stay small, so the 30 and 80 slopes produce few steps; the numbers are a starting point for data fields, not a ruling.
- The margin `(BotLevel - 1) * 2048` makes higher bot levels require a bigger lead to switch, which is the opposite of what a reader might expect. Keep it as data and test it, do not copy the reading.
- The donor evaluates on the AI's own thread and the game client. Frankendom's ruling is server-verified outcomes, so the rating must run in the engine so that the chosen action can be replayed and checked.
- Kill follow-ups (the radius-61 sub-explosion) are a physics effect with no duel counterpart; leave them out.
- Two constants (`cDamageModifier`, `cDamagePercent`) and the ammo-test inputs are not read. Mark them as unknown when this becomes a data field.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine; many-on-one target choice in the engine); rules 7-9 n/a
