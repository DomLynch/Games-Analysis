# exult-exult (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/exult-exult/combat.cc` | Licence: GPL-2 | C++ | symbol `Combat_schedule.attack_target/find_foe/now_what`

Checked: At 1190. Verified: `attack_target` 1190-1396, `now_what` 1554-1725, `find_foe` 688-785, `back_off` 804-856, `Need_new_opponent` 1520-1532, all read in full.

## 1. Mechanism

- Each NPC carries a combat schedule. `Combat_schedule::now_what()` (1554-1725) runs on every NPC tick. Its states are initial, approach, strike, fire and wait-return. It begins in the initial state, which does nothing except the distance check, so usecode can set an opponent first (1556-1566).
- Initial state: if the NPC is more than 50 tiles from the camera actor it goes dormant; otherwise it moves to approach and starts a 200 ms timer (1559-1565). A sleeping NPC re-checks after one second (1567-1570). A fleeing NPC runs away; a monster that cannot die switches to nearest-attack mode; a party member that has fled more than twice and is out of combat resumes following the avatar (1572-1584).
- `Need_new_opponent` (1520-1532) clears the target when it is dead, off screen, or invisible (1-in-4 roll unless the NPC can see invisible).
- Approach uses a dexterity bar. While `dex_points` is below `dex_to_attack`, each tick adds the NPC's dexterity and the NPC waits. Once the bar is full, it first tries invisibility (`rand() % 300 < intelligence`) or summon (`rand() % 600 < intelligence`); each use spends `dex_to_attack`. If neither fires it calls `start_strike()`. Where the bar is reset on a plain strike is in `start_strike` (not read).
- Strike (1610-1637): the state is set back to approach first, the NPC returns to its ready frame, and it calls `attack_target`; after a successful strike on a non-actor target the target is cleared, so objects are struck once. Fire state (1638-1678) does the same for ranged weapons or a spell, with a delay that grows with the spell script length. Wait-return (1679-1683) only adds dexterity to the bar after a returning weapon.
- Giving up (1687-1724): after more than 5 failures a party member walks back to the avatar and follows; an off-screen NPC goes dormant; a good-aligned one returns to its normal schedule; others wander a few tiles.
- `find_foe` (688-785): it drops opponents that died (or sleep, when the NPC is the avatar), refills the list from nearby candidates when empty (a practice target wins for duels), then picks one by attack mode: weakest, strongest, nearest, protect (attackers of the protected), random, berserk (coin flip between random and nearest), defend (nearest above half health, otherwise weakest), flank (one that an ally attacks). The pick is removed from the list.
- `attack_target` returns false if the attacker is dead, or the effective range is below the distance (reach comes from the weapon, or from the monster's reach when unarmed, 1213-1233), or ammo is needed and missing. It consumes ammo or charges (a depleted readied weapon makes the NPC ready a new one or wait for a returning weapon, 1278-1326). The attack value is the attacker's combat stat, +3 if the weapon is lucky, +3 if the ammo is lucky, plus 2 times a bias (the difficulty, positive when the target is in the party and negative when the attacker is, 1331-1336); ranged attacks add 6, then subtract the distance for poor thrown weapons or half the distance for good thrown weapons (1337-1346). Ranged attacks spawn a projectile carrying that value and resolve later (1351-1360). Melee either autohits (weapon or ammo flag; god mode forces autohit for party attackers and none against the party) or calls `target->try_to_hit(attacker, attval)`, which is the single hit roll (not read). A hit plays a sound, blows up an explosive weapon instead, or calls `target->attacked`, then `back_off` for actors that were affected (1368-1392).
- Inputs: attacker, target or tile, weapon shape. Output: a boolean "struck", and an effect on the target.

## 2. Key functions

- `Combat_schedule::now_what`: `combat.cc` 1554-1725. Per-tick state machine, dexterity bar, invisibility and summon rolls.
- `Combat_schedule::attack_target`: `combat.cc` 1190-1396. Reach, ammo, attack value, autohit, hit roll, projectile.
- `Combat_schedule::find_foe`: `combat.cc` 688-785. Target search by attack mode (read in full).
- `Combat_schedule::back_off`: `combat.cc` 804-856. Step away to hold weapon range. Contains an x/y mix-up (`npc_tile.tx - attacker_tile.ty`); do not copy it.
- `Need_new_opponent`: `combat.cc` 1520-1532. Target validity check.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Dexterity bar as a per-tick cooldown: accrue each tick, spend when full | Accrual equals NPC dexterity; spend equals `dex_to_attack` (theirs, from NPC data) |
| Per-tick random gate on an ability, odds from intelligence | `rand()%300` invisibility and `rand()%600` summon odds (theirs) |
| Attack value = skill + lucky bonus + party bias, ranged bonus, distance penalty for thrown weapons only | +3 lucky (weapon and ammo each), +6 ranged, bias 2 times difficulty (theirs, 1333-1339) |
| One hit roll against the target's defence | `try_to_hit` body (not read) |
| Dormancy beyond a radius | 50 tiles (theirs, 1559) |
| Re-check after a fixed idle wait | 200 ms and 1000 ms timers (theirs, 1564, 1568); give up after 5 failures (1687) |

## 4. TypeScript sketch

simplified: the sketch covers only the approach branch (bar accrual, ability roll, strike), target validity, the attack value and the back-off test. It omits the initial and sleeping states, fleeing, the strike and fire states, the `failures` give-up path, ammo use, projectiles and the off-screen test in `Need_new_opponent`. The sketch rolls one ability roll; the donor rolls invisibility first (odds 1 in 300 scaled by intelligence), then summon (1 in 600), only if the NPC can use them. The bar is checked before the strike, accrued otherwise, as in the donor.

```ts
// Licence: GPL-2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Npc {
  dexPoints: number;
  dexPerTick: number;
  dexToAttack: number;
  hasTarget: boolean;
}

// Approach: accrue a bar each tick; when full, either spend it on an ability or strike.
function approachTick(n: Npc, abilityRoll: () => number, abilityOdds: number): 'wait' | 'ability' | 'strike' {
  if (!n.hasTarget) return 'wait';
  if (n.dexPoints >= n.dexToAttack) {
    if (abilityRoll() < abilityOdds) {
      n.dexPoints -= n.dexToAttack;
      return 'ability';
    }
    return 'strike';
  }
  n.dexPoints += n.dexPerTick;
  return 'wait';
}

// Target validity: a target that is dead, or unseen on a one-in-four roll, is dropped.
function needNewTarget(alive: boolean, seen: boolean, roll: () => number): boolean {
  if (!alive) return true;
  return !seen && roll() < 0.25;
}

// Attack value for a swing: skill, lucky bonus and a party bias; ranged adds a flat bonus, and thrown weapons also lose range.
function attackValue(
  skill: number, lucky: number, bias: number, ranged: boolean,
  thrown: 'none' | 'poor' | 'good', dist: number,
): number {
  const base = skill + lucky + 2 * bias;
  if (!ranged) return base;
  const penalty = thrown === 'poor' ? dist : thrown === 'good' ? Math.floor(dist / 2) : 0;
  return base + 6 - penalty;
}

// Step away from an attacker that is closer than the weapon's range.
function backOffNeeded(attackerDistance: number, weaponRange: number): boolean {
  return attackerDistance < weaponRange;
}
```

## 5. Lands in

- TARGET `src/fight/world.ts`, parity-checklist row 4 (fight loop: aggro, chase, leash). The dexterity bar is a pacing idea for creature strikes. Row 4 is origins' own copy today (K2b / K2c delete), so creature-side cadence lives there until it moves; `src/fight/world.ts` owns the Zone 1 loop and `MAX_ATTACKERS` (line 22, checked in worktree `frankendom-backend`, commit 46e670530).
- today: `src/fight/world.ts` and `src/fight/world-combat.ts`.
- Reuse tag: adapt
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2: clean-room only. The sketch is written from the described mechanism and is not a line-for-line translation.
- The strike cadence is per NPC tick (a timer-queue delay in game frames). Frankendom's Zone 1 loop is a fixed 1/60 accumulator in `src/fight/world-combat.ts`, so any bar must be counted in those ticks and replayed by the server verifier.
- The melee hit roll is in `try_to_hit` (not read). Frankendom's hit roll is in `src/fight/duel.ts (today: src/duel.ts, moving)`; do not take a roll from this file.
- Frankendom caps attackers at three (`MAX_ATTACKERS = 3` in `src/fight/world.ts`). This file has no comparable cap (it picks one foe per NPC); do not add one from here.
- `find_foe` picks one target by an attack mode (weakest, nearest, flank and so on). Frankendom's targeting is aggro and threat (`Threat` in `src/fight/world.ts`); the modes are not a fit, only a list of ideas.
- Dormancy and the invisibility and summon rules belong to a single-player world. Zone 1 keeps creatures in the world, so they do not port as-is.
