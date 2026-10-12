# Open-RSC-Core-Framework (gods-legends-favour, cell 1)

Donor: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/event/rsc/impl/PrayerDrainEvent.java` (with `Prayers.java`, `PrayerHandler.java`, `Prayer.java` plugin, `conf/server/defs/PrayerDef.xml`) | Licence: AGPL-3.0 (LICENSE file header: "GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007") | Java | symbol `PrayerDrainEvent.run`

Checked: read `PrayerDrainEvent.java` (full), `Prayers.java` (full), `PrayerHandler.java` (full), `Prayer.java` plugin (full), `Player.java` 1633-1668 and 2080-2092, `Skills.java` 106-125 and 343-356, `GameTickEvent.java` 13-40 (partial), `PrayerDef.xml` (all 14 drain rates and level requirements, via grep of those lines), `Inventory.java` 485 (one condition line). Candidates opened: 8 (also `Formulae.java` 190-204 and `CombatFormula.java` 317, signature only). Not read: the scheduler's repeat rule (so "every tick" is an inference from the 1-tick delay), the login method that starts the drain event (only the 2086-2088 lines), the combat use of prayer multipliers, what object id 200 is. Confidence: high on the drain formula, activation order and reset; medium on tick cadence. camera_scope: n/a (not a camera cell).

## 1. Mechanism

- The unit is a prayer-points pool. It holds `level x 120` points (the donor's favour resource). Each prayer is a toggle with a drain rate and a level requirement. While any toggle is on, a per-tick event takes points from the pool. When the pool runs out, every toggle is switched off.
- Start: in the logged-in setter, the pool is set to current prayer level x 120 and the drain event is added, but only when `!LACKS_PRAYERS` (Player.java 2085-2089; the enclosing method name was not read). Any later `setLevel` or `normalize` on the prayer skill also sets the pool to level x 120 (Skills.java 120, 352).
- Order of steps in one drain run (PrayerDrainEvent.java 21-62): (a) stop if the player was removed (22-25); (b) sum the drain rates of all active prayers, ids 0 to 13 (32-37); (c) if the sum is 0, return (39); (d) `pointDrain = ceil(sum x 120 / (300 x (1 + (bonus - 1) / 32)))` (41), where `bonus` is the equipment prayer bonus floored at 1 (Player.java 1635-1637), not the pool; (e) if the pool is greater than `pointDrain`, subtract it (45-48) and lower the displayed prayer level to `ceil(pool / 120)` only if that is below the current level (50-54); that `setLevel` (line 53) goes through Skills.setLevel, which writes the pool as `level x 120` (Skills.java 118-121), so each time the level drops the pool is snapped UP to the level boundary (a refund of 0 to 3 points per level at a drain of 4) - a donor quirk: keep the pool as the truth and derive the level from it; (f) otherwise set the pool to 0, reset every prayer (58), send "You have run out of prayer points. Return to a church to recharge" (59), and set the displayed prayer level to 0 (60).
- Activation (PrayerHandler.java 100-114): refused if the max prayer level is below the prayer's requirement (104-107) or the current level is 0 (109-112). Otherwise `activatePrayer` (16-66) first switches off the other prayers in the same tier, then sets this one on (65). Tiers are three slots of three ranks each: thick / rock / steel skin (defence), burst / superhuman / ultimate (strength), clarity / improved / incredible reflexes (attack). Switching is free: no points are paid on the switch itself.
- Refill (Prayer.java plugin 15-31): command "recharge at". Target = max prayer level, plus 2 if the object id is 200. If the level is already at target, the pool is set to target x 120 (22-23). If not, the displayed level is set to target (28-29), which sets the pool through Skills.java 120.
- Shrine variants (Prayer.java 28-42): object id 625 at y 3573 (the Yanille chaos altar) is a trapdoor that teleports the player after the recharge (a punishing shrine); when the current level is above the max (for example after a +2 shrine) the message 'You recharge' and the sound play but nothing changes (28-33). Cadence: the event is built with a 1-tick delay argument (PrayerDrainEvent.java 16, GameTickEvent.java 34). Whether it repeats each tick is from the scheduler, which I did not read.

## 2. Key functions

- `PrayerDrainEvent.run`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/event/rsc/impl/PrayerDrainEvent.java` 21-62. Drain sum, rounded-up drain, pool subtract or reset.
- `PrayerHandler.process` and `activatePrayer`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/rsc/handlers/PrayerHandler.java` 16-66 (tier switch-off), 74-118 (gates, activate, deactivate).
- `Player.getPrayerPoints`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Player.java` 1635-1638. Returns the equipment prayer bonus, floored at 1.
- `Prayer` recharge plugin: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/plugins/com/openrsc/server/plugins/authentic/skills/prayer/Prayer.java` 15-31.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-tick drain = sum of active rates x 0.4, divided by a gear divisor, rounded up | 120 and 300 (theirs, PrayerDrainEvent.java 41); divisor 1 + (bonus - 1)/32 (theirs, line 41); the ceil is theirs (line 41) |
| Pool = displayed level x 120; displayed level = ceil(pool / 120) | 120 points per level (theirs, Skills.java 120; PrayerDrainEvent.java 50) |
| Toggle cost is a rate, not a lump sum | Drain rates 5, 10, 15, 30, 60 (theirs, PrayerDef.xml lines 4, 22, 40, 58 for 15, 30, 5, 60; rapid heal and protect items 10 are read, not receipted) |
| Level gate on each toggle | Requirements 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40 (theirs, PrayerDef.xml 3 for 1; 81 for 40; the rest read) |
| Empty pool switches everything off | Threshold 0 (mechanism, PrayerDrainEvent.java 45, 58) |
| Recharge target | Max level + 2 for object id 200, else + 0 (theirs, Prayer.java 20) |

Derived by hand, not measured: at gear bonus 1, a rate-15 toggle drains 6 per tick (15 x 0.4), so a level-1 pool (120 points) lasts about 20 ticks. At gear bonus 32 the divisor is 1.96875, so the same toggle is 3.05 per tick on average, but the donor rounds up and takes 4 each tick. That is an overcharge of about 31 percent.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (sum the active rates, apply the gear divisor, take the drain, then either subtract or reset to zero with all toggles off). It changes two things on purpose: the per-tick ceil becomes a carried fraction (the defect fix below), and the gear value is a named `gearDivisor` parameter instead of a method called `getPrayerPoints`. It omits the donor's displayed-level write-back (it returns the level to the caller instead), the chat message, the duel and world-without-prayers gates (`LACKS_PRAYERS`), the RAPID_RESTORE and RAPID_HEAL TODOs, the protect-items and paralyze effects, and the shrine rule (the recharge takes `bonusLevels` as a parameter, so the object id is not read). The file is checked on the VPS with `tsc --noEmit --strict --target es2020` (exit 0).

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Blessing = { id: string; group: string; levelReq: number; drainRate: number };

interface FavourPool {
  points: number;          // current favour points
  maxLevel: number;        // favour skill level, 1..99
  active: Set<string>;     // blessing ids that are switched on
  debt: number;            // fractional drain carried to the next tick
}

const POINTS_PER_LEVEL = 120;
const DRAIN_SCALE = 0.4;   // 120 / 300 in the donor drain formula

// Switch a blessing on: level gate, empty-pool gate, then turn off every blessing in the same tier group.
function activate(pool: FavourPool, b: Blessing, catalogue: Map<string, Blessing>): boolean {
  if (pool.maxLevel < b.levelReq) return false;
  if (pool.points <= 0) return false;
  for (const id of [...pool.active]) {
    const other = catalogue.get(id);
    if (other && other.group === b.group) pool.active.delete(id);
  }
  pool.active.add(b.id);
  return true;
}

// One call per game tick. gearDivisor is the worn favour bonus (>= 1), not the current pool.
// Returns the displayed favour level and whether the pool ran dry this tick.
function tick(pool: FavourPool, catalogue: Map<string, Blessing>, gearDivisor: number): { level: number; dry: boolean } {
  let total = 0;
  for (const id of pool.active) total += catalogue.get(id)?.drainRate ?? 0;
  if (total === 0) return { level: Math.ceil(pool.points / POINTS_PER_LEVEL), dry: false };

  const perTick = (total * DRAIN_SCALE) / (1 + (gearDivisor - 1) / 32);
  pool.debt += perTick;                       // fix: carry the fraction instead of rounding up every tick
  const take = Math.floor(pool.debt);
  pool.debt -= take;

  if (pool.points > take) {
    pool.points -= take;
    return { level: Math.ceil(pool.points / POINTS_PER_LEVEL), dry: false };
  }
  pool.points = 0;
  pool.active.clear();                        // dry pool: every blessing goes off
  pool.debt = 0;
  return { level: 0, dry: true };
}

// Shrine or temple recharge: full pool, plus a shrine-specific bonus of levels (0 for a plain altar).
function recharge(pool: FavourPool, bonusLevels: number): void {
  pool.points = (pool.maxLevel + bonusLevels) * POINTS_PER_LEVEL;
  pool.debt = 0;
}

export {};
```

Best transferable idea: a favour pool that drains by the sum of the active blessing rates every tick, switches every blessing off at zero, and refills at a shrine with a bonus, so a blessing is a running cost rather than a free buff.

Decision (proposed): adapt - keep the drain-pool and one-of-N tier idea, not the prayer names or the numbers; the fraction carry fixes the donor's per-tick round-up. Reject the donor's per-tick ceil.

Acceptance: a server test with one 15-rate blessing and a gear divisor of 32 runs 1000 ticks and removes about 3047 favour points (exact 3047.6; the donor drains 4 a tick, about 4000 minus the 0 to 3 point refunds it gives back at each level boundary); when the pool reaches 0 the blessing is off in the next snapshot and the client shows the "favour spent" message; a shrine refill sets the pool to (max + 2) x 120.

## 5. Lands in

- TARGET `src/fight/blessings.ts` (new module, engine-side favour pool; the server ticks it, the client reads it). Parity-checklist row 13 (specials). The drain runs inside the server tick (post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget").
- Current state of `src/fight/` was not checked by this reader.
- Data: the blessing list, group, level requirement and drain rate are zone or catalogue rows, not constants in the engine.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism; the 120 and 300 are the donor's tuning and become our own data fields.
- Defect 1 (kept idea, fixed): the donor rounds the per-tick drain up (PrayerDrainEvent.java 41), so any active toggle drains at least 1 point a tick and the gear bonus is over-charged. Fix: carry the fraction (the sketch does this).
- Defect 2 (kept idea, fixed): `getPrayerPoints()` (Player.java 1635-1637) returns the equipment bonus, not the pool. The name misleads. Fix: call it `gearBonus` in the port.
- Donor gap: RAPID_RESTORE and RAPID_HEAL have TODOs and no effect (PrayerHandler.java 56-57, 70). Frankendom should not copy them as live blessings until they have an effect.
- Donor gap: PARALYZE_MONSTER and PROTECT_FROM_MISSILES have no effect code in the activation switch (PrayerHandler.java 59-60). Their effects were not read elsewhere.
- Frankendom rulings: the pool must be server-owned and ticked by the server, never by the client (kills and favour are server-verified). It is one ledger row on the character, not a second wallet. Pit rule: the Pit is a client (row 22), so the pool and blessings do not run there unless Lead rules otherwise.
- Not read: the combat use of prayer multipliers (`CombatFormula.addPrayers`, call sites 224, 254, 283, seen by grep only). A gear bonus used as a divisor and as a combat multiplier is a second use that must stay separate.

Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
Brief rule served: GL-FOCUS 1 and 2; "new god or legend = data rows only, no code" (the blessing list is rows).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Step (e) said the pool is only subtracted; setLevel(PRAYER, level) at line 53 calls Skills.setLevel which writes prayerStatePoints = level*120 (Skills 118-121), snapping the pool up to the level boundary (0-3 point refund per level at drain 4); the 'donor removes 4000' acceptance figure was slightly overstated.
- Login drain event is only created when !LACKS_PRAYERS (Player 2085-2089), not unconditionally.
- Missed: chaos altar object 625 at y 3573 is a teleporting trapdoor; recharge above max level changes nothing (Prayer.java 28-42).

Fixed 2026-10-12: step (e) and start line corrected, acceptance figure reworded, shrine variants added. Sketch unchanged (it already omits LACKS_PRAYERS and the displayed-level write-back), no typecheck needed.
