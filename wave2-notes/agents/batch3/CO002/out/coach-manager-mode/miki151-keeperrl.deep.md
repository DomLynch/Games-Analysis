# miki151-keeperrl (coach-manager-mode, cell 1)

Donor: `/mnt/frankendom-donors/miki151-keeperrl/` (read: `team_order.h`, `team_order.cpp`, `collective_teams.h`, `collective_teams.cpp`, `minion_controller.cpp`, `monster_ai.cpp`, `village_control.cpp`, `village_behaviour.cpp`, `data_free/game_config/enemies.txt`, `data_free/game_config/translations/english.txt`) | Licence: GPL-2.0-or-later (LICENSE file: GNU GPL version 2; file headers read in `collective_teams.h` 5-7: "either version 2 of the License, or (at your option) any later version") | C++ | symbol `CollectiveTeams::setTeamOrder`

Checked: Read: the team order enum, the team store (create, remove, cancel, leader, setTeamOrder), the player toggle, the fighter chase switch and the attack-move chase gate, the follow-leader rule, the village attack launch, the retreat rule and the update loop. Confidence high on the order slot, the chase switch, the follow switch and the retreat threshold. Not read: the bodies of `shouldAIChase` / `shouldAIAttack`, `getLastSeenMove`, the callers of `WarlordBehaviour`, the callers of `setLeader` (not searched), and the walk-home task chain's own code. `camera_scope` does not apply (coach mode). Licence is GPL, so this is clean-room: shape only.

## 1. Mechanism

- A team is a list of creatures. The first creature is the leader (`collective_teams.cpp:45`). A team is created from a list (`create`, `collective_teams.cpp:80-84`), and removing the last creature cancels it (`collective_teams.cpp:15-19`).
- Two team orders exist: STAND_GROUND (UI text "Stop": members stand in place and do not follow the leader) and FLEE (UI text "Don't chase": members do not move toward enemies, only fight adjacent ones). The UI texts are in `english.txt:267` and `english.txt:649`. Note that FLEE does not move a creature away. It only stops chasing (`monster_ai.cpp:844-846`). The real pull-out is a separate task (see step 6).
- Orders are one exclusive slot. `setTeamOrder(id, order, true)` inserts the order and erases every conflicting order (`collective_teams.cpp:93-97`). `conflict` is "two different orders" (`team_order.cpp:32-34`). With two orders this means at most one is on.
- The player toggles an order by reading its state and writing the flipped state (`minion_controller.cpp:102-104`). No cost, cooldown or per-fight limit appears in this path (none read elsewhere).
- Each creature's AI picks the first move that is not NoMove, in this order: equip, fighter (`getFighterMove`), steed or rider, follow team leader, priority task, the rest (`monster_ai.cpp:1088-1096`). The first-good-move template is at `monster_ai.cpp:1073-1082`.
- Chase switch: `getFighterMove` checks the creature's active team. If the team has FLEE or STAND_GROUND, the fighter runs with `chase = false` (`monster_ai.cpp:841-848`). Otherwise `chase = true`.
- Fighter with chase off: an adjacent enemy is attacked (`monster_ai.cpp:663`). A non-adjacent enemy is not approached: the move toward it sits inside the `chase` gate (`monster_ai.cpp:639`), which is skipped. At distance 2 only the choke-point move is still considered (659), and otherwise the function ends in NoMove. (The `else return NoMove` at 654 belongs to the chase branch only, when moveTowards fails.)
- Follow switch: the leader never follows (`monster_ai.cpp:889` path, `creature != leader`). A non-leader in a team with STAND_GROUND waits (`monster_ai.cpp:887`, wait at 899). Otherwise it steps toward the leader when more than one tile away (`monster_ai.cpp:892-894`) and waits when within one tile (896).
- Village attacks (`village_control.cpp:185-216`): the attackers become a team (199). If the attack behaviour is non-chasing (only the steal-resource behaviour, `village_behaviour.cpp:34-39`), the team starts with FLEE (200-201). The team is activated and the launch size is recorded (216).
- Retreat, checked every update (`village_control.cpp:310-329`): for each team not yet cancelled, count members that are not polymorphed. If the count is below `(attackSize + 1) / 2` (integer division, so ceil of half), or exactly one member is left and it is seriously wounded (316), every member gets a walk-home task chain (318-321), the team gets FLEE (323), and the team is marked cancelled (326).
- Pruning, in `update()` (`village_control.cpp:413-438`): first `considerCancellingAttack()` (424), then a loop over teams that cancels a team when any member has no task (431-436). In the donor the loop body ends with `return;` at line 437, so the function returns after the first team. Whenever at least one team exists, the rest of `update()` is skipped: the DEMON_DEN block (440-447) and the attack launch (448-456). See Gaps.
- Attack launch rate: `updateFreq = 0.1` (439) gates the attack check (448). The probability is `getAttackProbability / updateFreq` (451), so the net chance per update is the behaviour value, as long as that value is at most 0.1 (above that the second roll saturates at 1; not analysed further). The behaviour value is the maximum over triggers, each checked to lie in 0..1 (`village_behaviour.cpp:243-249`).

## 2. Key functions

- `CollectiveTeams::setTeamOrder`: `/mnt/frankendom-donors/miki151-keeperrl/collective_teams.cpp` 91-100. Single writer of orders. Insert, then erase conflicting orders.
- `CollectiveTeams::hasTeamOrder`: `/mnt/frankendom-donors/miki151-keeperrl/collective_teams.cpp` 86-89 (used by the AI at monster_ai.cpp 844 and 887; the warlord at 1118 reads a separate set passed in, not this call).
- `conflict`: `/mnt/frankendom-donors/miki151-keeperrl/team_order.cpp` 32-34.
- `ByCollective::getFighterMove`: `/mnt/frankendom-donors/miki151-keeperrl/monster_ai.cpp` 833-848 (active team lookup 833-839, chase switch 841-848).
- `ByCollective::followTeamLeader`: `/mnt/frankendom-donors/miki151-keeperrl/monster_ai.cpp` 884-899.
- `ByCollective::getMove` order list: `/mnt/frankendom-donors/miki151-keeperrl/monster_ai.cpp` 1085-1096.
- `Fighter::getMove(bool chase)` and `Fighter::getAttackMove`: `/mnt/frankendom-donors/miki151-keeperrl/monster_ai.cpp` 384-386 and 619-665 (not all branches read; the chase gate is at 639, the adjacent attack at 662-663).
- `WarlordBehaviour::getMove`: `/mnt/frankendom-donors/miki151-keeperrl/monster_ai.cpp` 1116-1123 (reads STAND_GROUND at 1118; caller not read).
- `VillageControl::launchAttack`: `/mnt/frankendom-donors/miki151-keeperrl/village_control.cpp` 185-216 (team creation 199, FLEE for non-chasing 200-201, launch size 216).
- `VillageControl::considerCancellingAttack`: `/mnt/frankendom-donors/miki151-keeperrl/village_control.cpp` 310-329 (retreat rule 316, FLEE 323, walk-home 318-321).
- `VillageControl::update`: `/mnt/frankendom-donors/miki151-keeperrl/village_control.cpp` 413-456 (team prune with early return 431-437; attack launch 448-456).
- `VillageBehaviour::getAttackProbability`: `/mnt/frankendom-donors/miki151-keeperrl/village_behaviour.cpp` 243-249.
- Player team command: `/mnt/frankendom-donors/miki151-keeperrl/player_control.cpp` 2500-2507 (`commandTeam`: push the leader's controller, activate, free members from tasks).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One exclusive order slot per team; setting one clears the other | Two orders only (`team_order.h:5-8`) |
| Chase off when the team holds an order; attack adjacent only | none (boolean switch, `monster_ai.cpp:844-848`) |
| Followers wait when the team is in stand mode; step toward leader when more than one tile away | distance threshold 1 tile (`monster_ai.cpp:892`) |
| Pull out when the group falls below ceil(launch size / 2), or one wounded member is left | ceil half, computed `(n + 1) / 2` (`village_control.cpp:316`) |
| Attack chance per update = behaviour value | updateFreq 0.1 (`village_control.cpp:439`) |
| Minimum attackers before a village attacks | minTeamSize per village block, e.g. 10 (`enemies.txt:469`), 4 (`enemies.txt:114`) |
| Duel chance | 1.0 in one block (`enemies.txt:467`) |

## 4. TypeScript sketch

simplified: the sketch keeps the exclusive order slot, the chase switch, the follow switch, the adjacent-only attack and the retreat threshold. It omits: formation moves, spell and panic moves, the last-seen move, the chase freeze, weapon swap, choke-point and circular-blast moves, the steed and rider moves, the task fallbacks, the walk-home task chain, the cancelledAttacks set and the enemy event message, the same-level check, and the template ordering of moves (the caller is one list, not modelled). It reorders nothing except the tick: retreat is checked on every team before pruning, as in the donor, and the donor's early `return;` (village_control.cpp:437) is removed so every team is checked (the donor defect).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

type Order = 'hold' | 'disengage';

interface Member {
  id: number;
  polymorphed: boolean;
  seriouslyWounded: boolean;
  hasTask: boolean;
}

type Step = 'follow' | 'wait' | 'none';
type Engage = 'attack' | 'chase' | 'none';

class Team {
  members: Member[]; // members[0] is the leader
  orders = new Set<Order>();
  attackSize: number; // member count when the attack launched
  cancelled = false;

  constructor(members: Member[]) {
    if (members.length === 0) throw new Error('a team needs a member');
    this.members = members;
    this.attackSize = members.length;
  }

  get leader(): Member {
    return this.members[0];
  }

  // Exclusive slot: turning one order on clears the other.
  setOrder(order: Order, on: boolean): void {
    if (on) {
      this.orders.clear();
      this.orders.add(order);
    } else {
      this.orders.delete(order);
    }
  }

  // Player toggle: flip the order, same exclusivity rule.
  toggleOrder(order: Order): void {
    this.setOrder(order, !this.orders.has(order));
  }

  hasOrder(order: Order): boolean {
    return this.orders.has(order);
  }

  // Retreat rule: fewer than ceil(attackSize / 2) non-polymorphed members left,
  // or exactly one such member left and it is seriously wounded.
  shouldRetreat(): boolean {
    const live = this.members.filter(m => !m.polymorphed);
    const floor = Math.floor((this.attackSize + 1) / 2);
    return live.length < floor || (live.length === 1 && live[0].seriouslyWounded);
  }
}

// Follow rule for one creature. A 'hold' team waits; the leader never follows.
function followStep(team: Team | undefined, me: Member, distToLeader: number): Step {
  if (!team || team.leader.id === me.id) return 'none';
  if (team.hasOrder('hold')) return 'wait';
  return distToLeader > 1 ? 'follow' : 'wait';
}

// Chase is off while the active team holds either order.
function mayChase(team: Team | undefined): boolean {
  return !team || (!team.hasOrder('hold') && !team.hasOrder('disengage'));
}

// Adjacent enemies are always attacked; chasing needs mayChase.
function engage(distToEnemy: number, chase: boolean): Engage {
  if (distToEnemy === 1) return 'attack';
  return chase ? 'chase' : 'none';
}

// Per-update pass: retreat check on every team first, then prune teams with a member that has no task.
// Fix for donor defect: every team is checked; there is no early return.
function tickTeams(teams: Team[]): Team[] {
  for (const t of teams) {
    if (!t.cancelled && t.shouldRetreat()) {
      t.cancelled = true;
      t.setOrder('disengage', true);
    }
  }
  return teams.filter(t => t.members.every(m => m.hasTask));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/CO002-miki151-team-orders.ts`): exit 0.

## 5. Lands in

- TARGET `src/fight/team-orders.ts` (new module, engine state): one exclusive order slot per group, read by the fight step to gate chase and follow, plus the retreat threshold checked in the engine tick.
- Parity-checklist row 4 (fight loop: aggro, chase, leash). Row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget" applies to where `tickTeams` runs; the donor has no per-tick budget here.
- Parity hint 19 (fight record): an order log is not in the code read; this is not searched further (not read).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the orders are engine state that the AI reads each move, not client state); rule 8 (named target file and parity row).

## 6. Gaps and risks

- Name: the donor's FLEE is "Don't chase" in the UI and does not move anyone. Frankendom should not call it flee. The sketch uses `disengage` for the retreat and `hold` for stand, both still only stop movement toward enemies or leader.
- Server: orders must be server state, set by a validated client command and applied at the creature's next duel step. The donor has no lag model: the order applies on the creature's next AI move. Frankendom must choose the tick at which an order takes effect and test it.
- Coach commands in the donor have no cost, cooldown or limit per fight (`minion_controller.cpp:100-104`). If Frankendom wants a coach budget, it is a new rule, not a copy.
- Pre-fight planning: no pre-fight order screen was found in the code read. Orders are set in the middle of play through the team command (`player_control.cpp:2500-2507`).
- Retreat threshold under MAX_ATTACKERS = 3: floor((3 + 1) / 2) = 2, so a three-member team retreats when one member is left. For a pair the count rule only fires at zero members (floor(3 / 2) = 1); only the seriously-wounded clause can fire while one member is left. Lead must pick the floor for a cap of 3 explicitly.
- Donor defect: `village_control.cpp:437` `return;` sits inside the team loop, so `update()` returns after the first team whenever any team exists. The DEMON_DEN block (440-447) and the attack launch (448-456) are skipped on those ticks, and only the first team is pruned. Fix: no early return, every team checked (done in the sketch). Whether the donor intended this is not known; it was read, not run.
- Donor quirk: `attackSizes` counts polymorphed members at launch, while the retreat count drops them (`village_control.cpp:216`, `:316`). Not relevant to Frankendom (no polymorph), noted for completeness.
- Walk-home on retreat is a task chain (transfer to home, then walk to a territory tile, `village_control.cpp:318-321`). Frankendom's equivalent is a server-side leash or disengage state. Not read beyond the call.
- The GPL licence: clean-room only. Nothing from the donor is copied; the sketch is written from the described rules.

Best transferable idea: one exclusive per-group order slot (hold or disengage) that the AI reads on every move, plus an automatic pull-out when the group falls below half its launch size.

Decision (proposed): adapt - take the exclusive order slot, the chase and follow switches and the retreat threshold; do not take the FLEE name or the early-return loop. Frankendom's many-on-one is server state, so the order is engine state and the threshold is a rule in src/fight.
Acceptance: In a 3-vs-1 server test, after `hold` is set the two followers issue no move toward the leader while more than one tile away, and attack only when adjacent to the enemy; when one attacker is left out of three, the retreat order is set once and the remaining attacker stops chasing in the same tick, asserted by the test.

## 7. Coach table (coach-manager-mode rows)

Rows for the coach topic. "(not read)" = not opened in this pass; nothing is claimed for those rows.

| name | what | formula | ranges | file:line |
|---|---|---|---|---|
| Pre-fight stance (team order) | STAND_GROUND ("Stop") or FLEE ("Don't chase") set on a team | setOrder(on): clear all, then add; toggle = flip | 2 orders, one active slot | team_order.h:5-8; collective_teams.cpp:91-100; minion_controller.cpp:100-104 |
| Target priority / tactics orders | no target-priority setting found; the chase flag is the only per-team tactic | chase = not (hold or disengage) | boolean | monster_ai.cpp:841-848 |
| Mid-fight coach command | flips a team order while the leader is controlled | flip stored flag | applies at next AI move, per team | minion_controller.cpp:100-104 |
| Command cost / cooldown / limit per fight | none found in the read path | n/a | n/a | minion_controller.cpp:100-104 |
| Command lag | order read when each creature takes its next AI move; no timer seen | read per move | per move | monster_ai.cpp:1088 |
| Fighter stat sheet | (not read) | | | |
| Training schedule and growth | progress per call = 0.012 x efficiency x training-speed effect; cap from furniture (cap data not read) | increase = 0.012 * efficiency * speed | per call; frequency not read | collective.cpp:1585-1586 |
| Fatigue / injury / recovery | (not read in the combat path) | | | |
| Scouting / information limits | (not read) | | | |
| Hiring / contracts / upkeep | recruits listed from an ally or enemy by RecruitmentInfo; a recruitment-cost helper is commented out | count of available recruits | not read further | immigrant_info.h:48-53; immigrant_info.cpp:136; collective.cpp:254-260 |
| Matchmaking from coach view | village attack needs fighters not in a team, not insane, not movement-restricted, and at least minTeamSize; attack chance per update = behaviour value | fighters >= minTeamSize and Random.chance(value) | minTeamSize 3 to 10 in read blocks; duelChance 1.0 | village_control.cpp:380-392, 448-456; enemies.txt:305, 469, 467 |
| Post-fight report / replay | retreat records an event on the enemy collective; a battle summary resets when a team is commanded | event on retreat | n/a | village_control.cpp:325; player_control.cpp:2508 |
| AI behaviour when the coach is absent (default tactics) | no active team: fighter chases; non-chasing village attacks start with FLEE; team retreats when members fall below ceil(n/2) | (n + 1) / 2 integer | n = launch size | monster_ai.cpp:848; village_control.cpp:200-201, 316 |
