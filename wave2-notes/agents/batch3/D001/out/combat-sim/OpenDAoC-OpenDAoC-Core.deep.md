# OpenDAoC-OpenDAoC-Core (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameSiegeWeapon.cs` (aim, arm, fire and the action-delay timer), with the type overrides in `GameServer/gameobjects/SiegeWeapon/gamesiegecatapult.cs` (splash), `gamesiegeballista.cs`, `gamesiegetrebuchet.cs` and `GameSiegeRam.cs`; damage helper `GameServer/gameutils/Util.cs` | Licence: GPL-3.0 (repo `LICENSE`, "Version 3, 29 June 2007"). The siege files read carry no per-file header, except `gamesiegetrebuchet.cs` whose header says "either version 2 ... or (at your option) any later version" | C# | symbol `GameSiegeWeapon.Fire` / `DoDamage` / `CalcDamageToTarget`

Checked: read in full: `GameSiegeWeapon.Fire` (390-423), `GetActionDelay` (519-534), `PreAction` (567-576), `Arm` (302-316), `Aimed`/`Armed` (372-386), the `SiegeTimer.OnTick` state machine (781-807), the state enum (47-53), the decay threshold (165-173), and `CanUse` (about 536-560, partly read). Read the aim gate (255-300). Catapult: `ActionDelay`, ranges and radius (14-50), `SelectTargets` (97-131), `DoDamage` (140-186), `CalcDamageToTarget` (189-196). Ballista: 36-47, 91-147. Trebuchet: 27-64. Ram: 14-60 and 84-116, 117-165, 185-235. `Util.Random` (17-32). `GameDoor.TakeDamage` (130-139) and `GameLiving.TakeDamage` (1293-1362) for the door health path. Callers: `DoDamage` is reached from `MakeDelayedDamage` (425-428, called by the impact timer at 418) and from `SiegeTimer.OnTick` (797-798). The caller of `Fire()` (the command or packet handler) was not read. Not read: `SelectTargets` body for players (the `WorldMgr.GetPlayersCloseToSpot` helper), the ram's aim loop head (about 80-92), the cauldron (spell-based, `gamesiegecauldron.cs`), keep-guard damage, and the banner effect's `Effectiveness` property. camera_scope: not applicable. Confidence: high on fire timing, the type multipliers and the splash rule; medium on whether the `SiegeTimer` Fire case is ever reached (the callers of the timer were not read).

## 1. Mechanism

A siege piece is a state machine with two flags, Armed and Aimed. Fire needs both (`Ready` = Armed + Aimed, GameSiegeWeapon.cs 52, 393). The loop is aim, arm, fire, re-arm.

Order of operations for one shot:
- Aim (player command): refused if the piece is busy (timer alive or moving), if there is no target, if the target is not allowed or not in view, or if the target is out of min or max range (279-290). It clears Aimed (290), sets the ground point to the target, sets the action to Aiming, and starts the action timer with `GetActionDelay(Aiming)` (575). When the timer fires, `Aimed()` sets the Aimed flag (375). Aim is 5000 ms for all four types (catapult 22, ballista 39, trebuchet 42, ram 22).
- Arm: `Arm` clears Armed, sets the action to Arming, and reads the arming delay (309). A manual arm then calls `PreAction`, which starts the timer with that delay (575). An auto arm returns the delay to the timer, which reschedules itself (806; the ECS timer's return-value convention was not read). When it fires, Armed is set (384). Arming is 10000 ms for ballista, catapult and ram, and 15000 ms for trebuchet (catapult 23, ballista 40, trebuchet 43). The ram's arming slot is replaced by a reload formula that depends on the number of riders (GameSiegeRam.cs 193, 201).
- Fire (390-423): refused unless the state is Ready (393). The ground range is checked against the min and max (407, then the max check). Impact is scheduled after `GetActionDelay(Fire)` (418), which is the fire base delay plus the distance to the ground point, in ms (521-522). The fire animation is broadcast. Then `Arm(false)` clears Armed (422), so Aimed stays but the piece must reload before the next shot.
- Impact: `DoDamage` runs at the scheduled time, not at the fire command. Target selection is at impact (catapult: `SelectTargets()` at 147). Each hit is `CalcDamageToTarget(target) + Util.Random(50)` (catapult 153, ballista 101). `Util.Random(max)` returns `_random.Next(0, max + 1)`, so the spread is 0 to 50 inclusive (Util.cs 21).
- Auto re-arm: after the timer's action, `SiegeTimer.OnTick` calls `Arm(true)` if Armed is not set (805-806). So a piece that is not armed keeps re-arming.
- Action delays are scaled by a banner effect: `delay * (1 - 0.06 * Effectiveness)` (526-530). The scale applies to aim and arm, and to fire only when there is no valid ground target. A fire with a valid ground target returns early at 521-522, so the banner does not scale that delay.
- Decay: `CanUse` refuses when `Health <= DecayedHp` (546), and `DecayedHp = 3 * (MaxHealth / 10)` (165-167), which is 30 percent of max health. The decay tick removes `DecayDeductHp = MaxHealth / 10` (171-173; applied at line 726).

Type overrides (the damage table):

| Piece | Aim / arm / fire base (ms) | Base damage | Min / max range (units) | Splash | Multiplier by target |
|---|---|---|---|---|---|
| Ballista | 5000 / 10000 / 0 | 75 | 50 / 4000 | none: single `TargetObject` | siege, player or NPC: x3; else x1 (137-138) |
| Catapult (field) | 5000 / 10000 / 0 | 100 | 1000 / 3000 | 150 around ground point | player or NPC: x2; else x1 (192-193) |
| Trebuchet | 5000 / 15000 / 1000 | 100 | 2000 / 5000 | 150 (inherits catapult DoDamage) | keep door or relic door: x3; else x1 (59-60) |
| Ram | 5000 / reload formula / 1100 | level-based (100, 125, 150, 200 for levels 0-3) | not set in the ram constructor (14-30 read) | none: one door | keep or relic door only; damage = base + (base/2) x riders (208), no spread |

Catapult splash (97-131, 147-186): every player (101), keep door (113) and NPC (125) inside the radius of the ground point is collected at impact. Each gets the same type multiplier and spread. Players and NPCs take x2 (catapult); doors take x1.

Ram passengers and reload: passenger cap is 2, 6, 8, 12 for levels 0-3, else `Level * 3` (36-51). Reload (arming) is `10000 + (Level + 1) * 2000 - 10000 * riders / cap` ms (201), so it is shorter with more riders. Ram base damage is 100, 125, 150, 200 for levels 0-3 (220-232). A new ram aim is refused when two other rams already aim at the same target (MAX_RAMS_ATTACKING_TARGET = 2, lines 30 and 93; the loop that counts them, about 80-92, was not read in full).

Worked arithmetic (from the donor constants, not a donor test): a ballista hits a player 1000 units away. Fire completes after 0 + 1000 ms, so one second after the fire command. Damage is 75 x 3 = 225 plus 0 to 50, so 225 to 275. A catapult shot at 2000 units lands after 2000 ms. A trebuchet shot at 3000 units lands after 1000 + 3000 = 4000 ms. A level 0 ram with 2 riders does 100 + 50 x 2 = 200 to a door, with no spread.

## 2. Key functions

- `GameSiegeWeapon.Fire`: `GameSiegeWeapon.cs` 390-423 (state check, range, scheduled impact, re-arm).
- `GameSiegeWeapon.GetActionDelay`: `GameSiegeWeapon.cs` 519-534 (fire = base + distance, banner scaling).
- `GameSiegeWeapon.PreAction` and `Arm`: `GameSiegeWeapon.cs` 567-576 and 302-316.
- `SiegeTimer.OnTick`: `GameSiegeWeapon.cs` 781-807 (action completes, then auto re-arm).
- `GameSiegeCatapult.DoDamage` and `SelectTargets`: `gamesiegecatapult.cs` 97-186. `CalcDamageToTarget` 189-196.
- `GameSiegeBallista.DoDamage` and `CalcDamageToTarget`: `gamesiegeballista.cs` 91-141.
- `GameSiegeTrebuchet.CalcDamageToTarget`: `gamesiegetrebuchet.cs` 56-63.
- `GameSiegeRam.DoDamage`, `CalcDamageToTarget`, `BaseDamage`, `GetReloadDelay`: `GameSiegeRam.cs` 117-165, 205-209, 211-235, 197-203.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two-flag gate (Armed and Aimed) before a shot | Aim 5000 ms; arm 10000 or 15000 ms (theirs, the action tables above) |
| Delay grows with distance to the ground point | 1 ms per unit added to the fire base (theirs, GameSiegeWeapon.cs 522) |
| Minimum and maximum range per piece | 50/4000 (ballista), 1000/3000 (catapult), 2000/5000 (trebuchet) (theirs) |
| Target-class multiplier table | x3 siege/player/NPC (ballista, 137-138); x2 player/NPC (catapult, 192-193); x3 door (trebuchet, 59-60) |
| Spread added to every hit, inclusive | 0 to 50 (theirs, catapult 153, ballista 101; Util.cs 21) |
| Splash radius around a ground point | 150 (theirs, catapult 30; trebuchet 50) |
| Decay threshold | 30 percent of max health (theirs, GameSiegeWeapon.cs 167) |
| Banner speed-up | 6 percent per effectiveness point (theirs, 530) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: aim range gate, aim timer, arm timer, fire gate (armed and aimed, ground range), impact after the fire base plus the distance, re-arm, then target selection at impact with the type multiplier and the inclusive 0 to 50 spread. It omits: the `IsAllowedToAttack`, in-view and line-of-sight checks; the Owner-null attacker rules; the ram (rider scaling and reload formula); the banner delay scaling; the decay and repair states; the snap of the ground point to the target object in `Fire()`; the animations and messages; the XP bookkeeping in `TakeDamage`. Two places differ from the donor: the sketch fixes the single target by the id chosen at aim time for ballista-type pieces, while the donor reads `TargetObject` at impact (the two differ if the target changes between aim and impact, which the sketch does not model); and the sketch skips dead targets, which the donor's catapult `SelectTargets` does not show in the lines read. The splash uses a plain distance to the ground point; the donor uses `WorldMgr` helpers whose bodies were not read.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// Times in ms. Distance in world units; the donor adds distance to the fire delay as milliseconds.
type TargetKind = "player" | "npc" | "siege" | "door" | "other";

interface Spec {
  aimMs: number;          // time to turn onto a target
  armMs: number;          // time to reload after a shot
  fireBaseMs: number;     // fire delay before distance is added
  baseDamage: number;
  minRange: number;       // units; a shot closer than this is refused
  maxRange: number;       // units; a shot further than this is refused
  splashRadius: number;   // 0 = single target (uses the aimed target)
  multiplier: (k: TargetKind) => number;
}

// Donor values as read (GameServer/gameobjects/SiegeWeapon/*.cs). Multipliers are the CalcDamageToTarget overrides.
const BALLISTA: Spec = {
  aimMs: 5000, armMs: 10000, fireBaseMs: 0, baseDamage: 75, minRange: 50, maxRange: 4000, splashRadius: 0,
  multiplier: (k) => (k === "siege" || k === "player" || k === "npc" ? 3 : 1),
};
const CATAPULT: Spec = {
  aimMs: 5000, armMs: 10000, fireBaseMs: 0, baseDamage: 100, minRange: 1000, maxRange: 3000, splashRadius: 150,
  multiplier: (k) => (k === "player" || k === "npc" ? 2 : 1),
};
const TREBUCHET: Spec = {
  aimMs: 5000, armMs: 15000, fireBaseMs: 1000, baseDamage: 100, minRange: 2000, maxRange: 5000, splashRadius: 150,
  multiplier: (k) => (k === "door" ? 3 : 1),
};

interface Living { id: number; kind: TargetKind; x: number; y: number; hp: number; }
interface Pending { at: number; ground: { x: number; y: number }; }

class Emplacement {
  private aimedAt = -1;   // -1 = not aiming
  private armedAt = -1;   // -1 = not reloading
  aimed = false;
  armed = false;
  private pending: Pending | null = null;
  private aimTargetId = -1;
  constructor(private spec: Spec, private pos: { x: number; y: number }) {}

  private dist(p: { x: number; y: number }): number {
    return Math.hypot(p.x - this.pos.x, p.y - this.pos.y);
  }

  // Donor Aim(): refused outside min/max range; the aim completes after aimMs.
  aim(target: Living, now: number): boolean {
    const d = this.dist(target);
    if (d < this.spec.minRange || d > this.spec.maxRange) return false;
    this.aimed = false;
    this.aimTargetId = target.id;
    this.aimedAt = now + this.spec.aimMs;
    return true;
  }

  // Donor Fire(): needs armed AND aimed; the hit lands after fireBaseMs + distance; then the piece re-arms.
  fire(ground: { x: number; y: number }, now: number): boolean {
    if (!(this.armed && this.aimed)) return false;
    const d = this.dist(ground);
    if (d < this.spec.minRange || d > this.spec.maxRange) return false;
    this.pending = { at: now + this.spec.fireBaseMs + d, ground };
    this.armed = false;
    this.armedAt = now + this.spec.armMs;
    return true;
  }

  // Called every tick with the server clock.
  tick(now: number, targets: Living[], randInclusive: (lo: number, hi: number) => number): { id: number; damage: number }[] {
    const out: { id: number; damage: number }[] = [];
    if (this.aimedAt >= 0 && now >= this.aimedAt) { this.aimed = true; this.aimedAt = -1; }
    if (this.armedAt >= 0 && now >= this.armedAt) { this.armed = true; this.armedAt = -1; }
    if (this.pending && now >= this.pending.at) {
      const { ground } = this.pending;
      this.pending = null;
      // Donor DoDamage(): targets are chosen at impact, not at fire.
      for (const t of targets) {
        // Single-target pieces (ballista) hit the aimed target; splash pieces hit everything in the radius of the ground point.
        const inSplash = this.spec.splashRadius > 0
          ? Math.hypot(t.x - ground.x, t.y - ground.y) <= this.spec.splashRadius
          : t.id === this.aimTargetId;
        if (!inSplash || t.hp <= 0) continue;
        // Donor: CalcDamageToTarget + Util.Random(50); Util.Random(max) is inclusive of max.
        out.push({ id: t.id, damage: this.spec.baseDamage * this.spec.multiplier(t.kind) + randInclusive(0, 50) });
      }
    }
    return out;
  }
}
```

## 5. Lands in

- TARGET `src/fight/emplacement.ts` (new, proposed): a fixed siege piece as a fight actor the engine owns; its shots are server-timed and its damage uses the duel step. Parity-checklist row 1 (duel step / sim).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine (the piece is an engine actor, the client only shows the aim and the countdown); zones as data (ranges, radius and the multiplier table as zone or catalogue fields); server-verified kills (impact and damage are resolved on the server at impact time)

Best transferable idea: a fixed emplacement that needs two server-timed states (aimed and armed) before a shot, lands after a delay that grows with distance, and multiplies damage by the class of target it hits.

Decision (proposed): adapt - take the aim, arm and fire-after-distance gate and the per-class multiplier table as data for one emplacement type; reject the ram's rider scaling and the unlimited splash (a piece that hits several targets is more attackers, and Frankendom's MAX_ATTACKERS = 3 rule covers attackers in the fight, so a splash must be bounded and counted).

Acceptance: a ballista-type emplacement at 1000 units from its target can be aimed only after 5 s and armed only after 10 s; a fire command lands 1 s later; a player hit takes 225 to 275 (75 x 3 plus a server-side spread of 0 to 50); a shot inside 50 units is refused; the server test asserts the timing and the damage range.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- The donor's spread is `Util.Random(50)`, inclusive, from a shared `System.Random`. Frankendom must make the spread a server RNG draw that the replay can reproduce (row 19 fight record), not a client-side or unseeded value.
- The donor delays the fire by distance in milliseconds, one per unit. Frankendom should express this as a fixed ms-per-unit ratio in data, and test it at the boundary of the range.
- The donor does not check the aimed target is still alive at impact (ballista: only `IsAllowedToAttack`). Frankendom must re-check that the target is alive and in range when the shot lands.
- The catapult splash hits every player, keep door and NPC in the radius that `IsAllowedToAttack` allows (the filters at 101-127). Frankendom's bound on a splash must come from MAX_ATTACKERS = 3, so a splash cannot add a fourth attacker.
- The ram's damage grows with riders and its reload shrinks with riders. That makes a crowd of riders a multiplier, which is a many-on-one exploit shape. Not adopted.
- Possible double subtraction (not run): `GameDoor.TakeDamage` calls `base.TakeDamage` (GameDoor.cs 133), which reaches `GameLiving.TakeDamage` and its `Health -= damageAmount + criticalAmount` (GameLiving.cs 1362). It then subtracts the same amount again for a player source (GameDoor.cs 139). This reads as a double subtraction for player-sourced hits on a non-keep door. Not confirmed by a test. Keep doors (`GameKeepDoor.cs` 140-146) do not repeat the subtraction in the lines read. The one-ledger rule means Frankendom should not copy this path.
- The keep guards are NPCs, so a catapult splash also hits them at x2 (the NPC rule, gamesiegecatapult.cs 192-193). Keep-guard damage handling was not read.
- Not read: the `SelectTargets` player helper body; whether the `SiegeTimer` Fire case is reached (its only caller path to `DoDamage` at 797-798 was not traced); the cauldron; the banner effect's `Effectiveness`.
- Pit as client: siege pieces are world-zone objects. The Pit has none.
