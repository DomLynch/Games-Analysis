# OpenRA-OpenRA (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/Squad.cs` | Licence: GPL-3 | C# | symbol `Squad.IsTargetValid / FuzzyStateMachine` | opened this pass: `IsTargetValid` 98-120, constructor 46-70, `SetActorToTarget` 80-93, `Update` 72-76; states in `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/States/GroundStates.cs` (idle 81-119, attack-move 121-196, attack 198-253, flee 255-270), `ShouldFlee` in `States/StateBase.cs` 83-104, and the fuzzy rules in `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/AttackOrFleeFuzzy.cs` (`CanAttack` 167-183).

## 1. Mechanism

- A squad (a group of bot units) keeps one target and runs a small state machine (`FuzzyStateMachine`, a `StateMachine`, Squad.cs line 30) over ground states: idle, attack-move, attack and flee. `Squad.Update` (72-76) runs the machine each bot tick when the squad has at least one unit. Inputs each tick: the squad's units, the target actor (with an optional offset to a position near it), the enemies in a circle around the target, and the fuzzy rules over own health, enemy health, relative attack power and relative speed. Output: orders queued to the squad (attack-move, stop, flee to a building).
- `IsTargetValid` (98-120) is the gate every state calls first: the target must be in the world, alive, not a husk, and valid for at least one unit. If it is still valid, the target's location is refreshed by searching again around the target actor (`SquadManager.FindEnemies`); if the enemy has moved out of reach, the target becomes invalid. `SetActorToTarget` (80-93) sets the target to the actor, or to a position offset from the actor's centre.
- Idle (`GroundUnitsIdleState`, 81-119): if the target is invalid, elect a new leader and pick the closest enemy as the new target; if there is none, stay idle. Then scan a circle around the target (`IdleScanRadius`, 10 cells, SquadManagerBotModule.cs 82) for enemies. No enemies: return. Enemies found: `AttackOrFleeFuzzy.CanAttack` decides; yes queues an attack-move to the target and enters the attack-move state, no enters the flee state.
- Attack-move (121-196): if the target is invalid, find the closest enemy; if there is none, flee. Tracks the leader's position and the target; the no-progress watchdog is here (see below). If the units have spread out, it stops the leader and sends the stragglers to the leader's cell; otherwise it scans (`AttackScanRadius`, 12 cells) around the leader for a closer enemy and, if one is found, enters the attack state, else keeps the attack-move order to the target. Then `ShouldFlee` is checked.
- Attack (198-253): same target refresh, same watchdog, then every unit that is not busy attacking gets an attack-move order to the target; then `ShouldFlee`.
- Watchdog (attack-move 158-165, attack 235-242): if the leader's cell and the target have not changed for 63 world ticks (the comment says 2.5 s), drop back to idle. This stops a squad that cannot path to its target from running pathfinding every tick.
- `ShouldFlee` (StateBase.cs 83-104): never flee if an own building is within `DangerScanRadius` (10 cells); otherwise gather preferred enemy units with attack ability within that radius and apply the flee predicate, which for ground squads is `!CanAttack`.
- Flee (255-270): calls `GoToRandomOwnBuilding` (helper in StateBase, body not read; by name it sends the units to an own building), enters idle, and unregisters the squad on deactivate.
- `CanAttack` (167-183): feeds four inputs (own health %, enemy health %, relative attack power, relative speed) to a fuzzy engine and attacks when the crisp output is below 30. The rule text is in static arrays from line 23; only the first rule was read, the rest is (not read).

## 2. Key functions

- `Squad.IsTargetValid`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/Squad.cs` 98-120. Gate: actor in world, alive, not a husk, some unit can target it. Refreshes the target position through `SquadManager.FindEnemies`.
- `Squad` constructor and state setup: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/Squad.cs` 46-70. Picks the starting state from the squad type (ground idle, air idle, protection idle).
- `Squad.SetActorToTarget`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/Squad.cs` 80-93. Target = the actor, or a position with an offset from the actor's centre.
- `GroundUnitsIdleState.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/States/GroundStates.cs` 85-116. Target check, circle scan, fuzzy attack-or-flee.
- `GroundUnitsAttackMoveState.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/States/GroundStates.cs` 129-193. Target refresh, watchdog, regroup, close-range scan.
- `GroundUnitsAttackState.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/States/GroundStates.cs` 206-250. Target refresh, the 63-tick no-progress watchdog back to idle, attack orders, flee check.
- `StateBase.ShouldFlee`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/States/StateBase.cs` 83-104. Danger scan with the own-building exemption.
- `AttackOrFleeFuzzy.CanAttack`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/BotModules/Squads/AttackOrFleeFuzzy.cs` 167-183 (the decision entry point; rule text in static arrays from line 23, not read in full).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hierarchical target lock: keep the target while it is valid; re-acquire the closest when it is not | Validity rules (in world, alive, not husk) (theirs) |
| Scan radius around the target for the local fight, then decide | `IdleScanRadius` 10, `AttackScanRadius` 12, `DangerScanRadius` 10 cells (theirs, SquadManagerBotModule.cs 82-88) |
| Fuzzy decision on own health, enemy health, relative power and speed | Attack when output < 30 (theirs, AttackOrFleeFuzzy.cs 182); membership labels and rule text (theirs) |
| Watchdog: if no progress for N ticks, reset to idle | 63 world ticks (theirs, about 2.5 s) |
| Never flee when home is near | Own building within the danger radius (theirs) |
| Target offset from the enemy's centre, so the squad can stand off | Offset as a world vector (theirs, data) |

## 4. TypeScript sketch

simplified: the air and protection states, leader election, regrouping of spread-out units, the attack-move to attack switch by close-range scan, per-unit busy checks and the real fuzzy engine are omitted; the flee state only sets a mode (the donor walks to a random own building, then goes idle); `ShouldFlee`'s danger scan is reduced to two booleans.
```ts
// Licence: GPL-3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Mode = 'idle' | 'attackMove' | 'attack' | 'flee';

interface Foe { id: number; alive: boolean; x: number; y: number; }
interface Squad { target: Foe | null; mode: Mode; lastProgressTick: number; leaderPos: string; lastTargetId: number | null; }

// Target gate: a target is kept only while it is alive and some unit can still reach it.
function targetValid(s: Squad, anyUnitCanReach: boolean): boolean {
  return s.target !== null && s.target.alive && anyUnitCanReach;
}

// Idle: pick a target if needed, scan around it, then decide attack or flee.
function idleTick(s: Squad, now: number, enemiesNear: Foe[], nearest: Foe | null, reach: boolean,
                  canAttack: (foes: Foe[]) => boolean): void {
  if (!targetValid(s, reach)) {
    s.target = nearest;
    if (s.target === null) return;
  }
  if (enemiesNear.length === 0) return;
  s.mode = canAttack(enemiesNear) ? 'attackMove' : 'flee';
  s.lastProgressTick = now;
}

// Attack-move and attack share the target refresh and the watchdog; both end with the flee check.
function activeTick(s: Squad, now: number, leaderPos: string, watchdog: number, nearest: Foe | null, reach: boolean,
                    shouldFlee: boolean): void {
  if (!targetValid(s, reach)) {
    s.target = nearest;
    if (s.target === null) { s.mode = 'flee'; return; }
  }
  if (leaderPos !== s.leaderPos) { s.leaderPos = leaderPos; s.lastProgressTick = now; }
  const targetId = s.target ? s.target.id : null;
  if (targetId !== s.lastTargetId) { s.lastTargetId = targetId; s.lastProgressTick = now; }
  if (now > s.lastProgressTick + watchdog) { s.mode = 'idle'; return; }
  if (shouldFlee) s.mode = 'flee';
}
```

## 5. Lands in

- TARGET `src/fight/world.ts` (exists today with the threat list, `AGGRO_M`, `SIGHT_M`, `MAX_ATTACKERS` 3 and the unseen give-up clock `GIVE_UP_UNSEEN_S`), checklist row 4 (fight loop: aggro, chase, leash). The lock-and-reacquire shape and the no-progress reset already exist there as the unseen clock; this donor adds only the "never flee when home is near" exemption and the idea of an explicit stuck rule.
- TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), checklist row 2 (AI brain), for any attack-or-flee choice per creature profile.
- Reuse tag: adapt
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3: clean-room only.
- MAX_ATTACKERS = 3: a squad shares one target and attacks with all units. Frankendom caps engaged attackers on one player at three, so a squad-style "everyone attacks the lock" is wrong; the rest hold at the ring.
- One engine: this is a map-scale squad with pathing and attack-move orders. The squad idea maps to a creature group in a zone, but the order model does not; do not add a second control layer beside `src/fight/ai.ts`.
- The fuzzy rules are a text rule set evaluated by a library. Frankendom's rule "no hidden number" argues for an explicit table in the catalogue (row 21 AI knobs), readable by the player, not a fuzzy engine.
- Server-verified kills: the 63-tick watchdog and the target refresh depend on world ticks and a reachability query. The server must run the same stuck-target rule on its own tick; Frankendom needs its own stuck-target number, not 63.
- Zones as data: scan and danger radii (10, 12, 10 cells) belong in zone or catalogue data, not code.
