# dkfans-keeperfx (coach-manager-mode, cell 2)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_groups.c` (with `creature_states.c`, `thing_creature.c`, `thing_stats.c`, `creature_states_hero.h`, `lvl_script_commands.c`, `levels/lostlvls/map00020.txt`) | Licence: GPL-2.0-or-later (LICENSE file: GNU GPL version 2; `creature_groups.c` header lines 13-16: "either version 2 of the License, or (at your option) any later version") | C | symbol `get_best_creature_to_lead_group`

Checked: Read: the party structs (`creature_groups.h` 30-104), the leader choice (`creature_groups.c` 286-446), removal and re-election (447-458), leader change (594-607), party add and member storage (545-571), the obedience entry (631-692), the spawn of a party (855-900), the follow state (`creature_states.c` 2206-2342), the tick call site (`thing_creature.c` 2540-2612), the score table (`thing_creature.c` 6331-6382) and the kind score (`thing_stats.c` 347-354). One real data line (`levels/lostlvls/map00020.txt:97`) and the script command table. Confidence high on leader choice, the follow order of checks and the defect at 335. Not read: `internal_update_leader_index_in_group` (135-160), `internal_remove_member_from_group_chain` (160-206), `add_creature_to_group` (461-499), `leader_find_positions_for_followers` body (709-855), the MatchWorkRoom job lookup, `creature_is_being_dropped`, and what `creature_control_get_from_thing` returns for an invalid thing. `camera_scope` does not apply. Clean-room only (GPL).

## 1. Mechanism

- A party is a chained group. Members link through `next_in_group` / `prev_in_group`, and each follower stores its leader index (`group_leader_idx`). A party's member list and the follower position array hold at most `GROUP_MEMBERS_COUNT` = 30 (`creature_groups.h:30`; `creature_control.h:373`). The level script keeps up to `CREATURE_PARTYS_COUNT` = 256 parties (`lvl_script.h:35`).
- Party composition is data. A level script line gives a party name, a creature, an exp level (1 to 10), carried gold, an objective, and a countdown: `ADD_TO_PARTY(ONE,WIZARD,5,1200,ATTACK_ENEMIES,0)` (`levels/lostlvls/map00020.txt:97`). The command is in the table at `lvl_script_commands.c:6960`, and `ATTACK_ENEMIES` maps to the objective enum at `lvl_script_commands.c:184`. The member is stored with exp level minus one (`creature_groups.c:563`) and the countdown (566).
- Objectives are an enum: AttackRooms 1, AttackEnemies 3, DefendParty 8, and later defend objectives (`creature_states_hero.h:34-45`). "Defend party" is the defensive role.
- Spawning a party (`script_process_new_party`, 855-): each member is created with its objective, target player, and a first-action time `countdown` turns after now (876-877). The leader is chosen as members arrive: a non-defender replaces a defending leader (890-891); when both or neither defend, the stronger one leads (higher exp, then higher score) (898); a defender joins as a follower under a non-defending leader (the else branch at the end of that block).
- Leader choice, run on a removal and by the spawn code (`get_best_creature_to_lead_group`, 356-446). First a digger class is computed for the group (308-347): 2 if there is a digger that is not defending, 1 if the digger defends, 0 if none. Then each member is a candidate: a non-defender needs class below 2 or to be a digger (390); a defender needs class below 1 or to be a digger (420). A candidate's score is `get_creature_thing_score` (386). A non-defender overwrites a defending best. Otherwise a candidate wins if its exp is at least the best's and either its score is higher or its exp is higher.
- Removal (447-458): remove the member. If the group still has more than one creature, run leader choice on the group and make the result leader if it differs (456-457; the change is applied at 601-605).
- Obedience, once per creature tick (`thing_creature.c:2608-2611`): a non-leader member calls `process_obey_leader` (631). In order: leader invalid, so reset the follower to its start state (633-637, message at 635); leader player-controlled, so the follower is set to the follow state (644-648); otherwise by the leader's current state's `follow_behavior` (set per state in config): FollowLeader sets the follow state (658); MatchWorkRoom sends the follower to the leader's work room (663-677, job lookup not read); JoinCombatOrFollow (678-) does this: if the leader is in a fight and the follower is not, a deployed-door enemy starts door combat and any other enemy does nothing; otherwise the follower takes the follow state (683-).
- Follow state (`creature_follow_leader`, 2206-2342), checks in order: leader invalid, so start state (2210); leader is itself, so start state (2217); mad, so leave the group (2225); custody differs from the leader's, so leave (2233); no free trail position, so leave if the leader is picked up, else start state (2239-); more than 12 consecutive fails, so leave (2257); within 16 turns of a failure, wait (2264); stamp the attempt turn (2268). Then a speed tier by distance to the trail slot: above 12 units, speed = max(2 x leader speed, 5/4 of follower speed), capped (2274-2288); above 6, a faster step (2289-2308); 2 or less, normal speed, facing the leader at zero distance (2309-); between 2 and 6, 9/8 of leader speed or leader plus one (the else branch after 2309; line numbers not given). A failed move counts as a fail only when the leader cannot be reached directly (2281 and 2301 are two of the tier checks; the other tiers repeat it); success resets the count to zero (2342).
- Score: a kind's score is the sum of max health, defense, dexterity, armour and strength at a level (`thing_stats.c:347-354`). At start (`thing_creature.c:6331-6366`) the top-level score of every model is the max; each (model, level) score is `200 x score / max`, clamped to 8 bits (6360), with zero set to 1 (6361-6363). `get_creature_thing_score` reads that table (6371-6382). Levels run 0 to 9 (`CREATURE_MAX_LEVEL` = 10, `thing_stats.h:29`).

## 2. Key functions

- `get_best_creature_to_lead_group`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_groups.c` 356-446 (candidate filters 390 and 420; score 386; overwrite rules 399-439 read).
- `creatures_group_has_special_digger_to_lead`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_groups.c` 308-347 (the defect is at 335).
- `remove_creature_from_group`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_groups.c` 447-458.
- `make_group_member_leader`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_groups.c` 594-607.
- `add_member_to_party` and `delete_member_from_party`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_groups.c` 545-571 and 572-590.
- `script_process_new_party`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_groups.c` 855-920 (spawn countdown 876-877; leader rules 886-912).
- `process_obey_leader`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_groups.c` 631-692.
- `creature_follow_leader`: `/mnt/frankendom-donors/dkfans-keeperfx/src/creature_states.c` 2206-2342.
- Tick call site: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_creature.c` 2608-2611 (inside `process_creature_state`, 2540-).
- Score table: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_creature.c` 6331-6382; kind score `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` 347-354.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Leader is the best of a group by a ranked rule: role class, then level, then score | Role classes 0/1/2 (`creature_groups.c` 308-347); score normalised to 200 (`thing_creature.c` 6360) |
| Re-run leader choice whenever a member leaves | none (`creature_groups.c` 456-457) |
| Followers reset to idle when the leader is gone | none (`creature_groups.c` 635-637; `creature_states.c` 2210-2212) |
| Drop a follower after 12 consecutive catch-up failures; retry gate 16 turns after a failure | 12 fails (`creature_states.c` 2257); 16 turns (2264) |
| Follow speed tiers by distance | Distance thresholds 12, 6 and 2 units (2274, 2289, 2309); speed factors 2x, 5/4, 9/8 |
| Party size | 30 members (`creature_groups.h:30`) |
| Level cap | 10 levels, 0 to 9 (`thing_stats.h:29`) |
| Score scale | 200 max; 8-bit clamp (6360) |

## 4. TypeScript sketch

simplified: the sketch keeps the leader choice (role class, defenders last, exp, then score), the removal re-election, the obedience switch, the invalid-leader reset, the 12-fail drop with the 16-turn gate, and the controlled-leader and join-combat rules. It omits: the speed tiers and the move itself (passed in as a callback), the mad and custody removals, the no-free-position case, the work-room matching (treated as keep), the spawn countdown, the door-combat action (returned as a label), the trail-slot queue, and the score table build. It fixes one donor defect: the digger class is the maximum over the group (`creature_groups.c:335` takes the last member visited), and it uses the same level-cap constant everywhere.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

type Objective = 'attack' | 'defend';
type Behaviour = 'none' | 'followLeader' | 'matchWorkRoom' | 'joinCombatOrFollow';

interface Unit {
  id: number;
  objective: Objective;
  isDigger: boolean;
  expLevel: number;   // 0..9 (donor CREATURE_MAX_LEVEL = 10)
  score: number;      // normalised score, 1..200 (donor scales to 200 and clamps to 8 bits)
  inBattle: boolean;
  fails: number;      // consecutive failed follow moves
  sinceTurn: number;  // turn of the last follow attempt
}

const FAIL_LIMIT = 12;   // donor: more than 12 consecutive fails drops the follower
const RETRY_TURNS = 16;  // donor: after a fail, wait 16 turns before the next attempt

// Role class of a group: 2 = a digger that is not defending, 1 = a digger that defends, 0 = none.
function diggerClass(u: Unit): number {
  if (!u.isDigger) return 0;
  return u.objective === 'defend' ? 1 : 2;
}

// Donor fix: the class is the MAXIMUM over the group (the donor returns the last member visited).
function groupDiggerClass(group: Unit[]): number {
  return group.reduce((best, u) => Math.max(best, diggerClass(u)), 0);
}

// Leader choice after a removal or at spawn: role class first, defenders last, then exp, then score.
function chooseLeader(group: Unit[]): Unit | undefined {
  const cls = groupDiggerClass(group);
  let best: Unit | undefined;
  for (const u of group) {
    const eligible = u.objective === 'defend' ? (cls < 1 || u.isDigger) : (cls < 2 || u.isDigger);
    if (!eligible) continue;
    const bestIsDefender = best !== undefined && best.objective === 'defend';
    if (u.objective !== 'defend' && bestIsDefender) { best = u; continue; }
    if (u.objective === 'defend' && best !== undefined && !bestIsDefender) continue;
    const bestExp = best?.expLevel ?? 0;
    const bestScore = best?.score ?? 0;
    if (bestExp <= u.expLevel && (u.score > bestScore || u.expLevel > bestExp)) best = u;
  }
  return best;
}

// Follower decision for the leader's current behaviour. 'reset' = the coach is absent: fall back to the idle state.
type ObeyResult = 'follow' | 'doorCombat' | 'keep' | 'reset';
function obey(leader: Unit | undefined, f: Unit, lb: Behaviour, leaderControlledByPlayer: boolean, enemyIsDoor: boolean): ObeyResult {
  if (!leader) return 'reset';
  if (leaderControlledByPlayer) return 'follow';
  switch (lb) {
    case 'followLeader':
      return 'follow';
    case 'joinCombatOrFollow':
      if (leader.inBattle && !f.inBattle) return enemyIsDoor ? 'doorCombat' : 'keep';
      return 'follow';
    default:
      return 'keep';
  }
}

// One follow tick for a non-leader. 'drop' removes the follower from the group.
type FollowResult = 'reset' | 'drop' | 'wait' | 'moved' | 'failed';
function followTick(
  f: Unit,
  leader: Unit | undefined,
  turn: number,
  attempt: () => boolean,
  cannotReachLeader: boolean,
): FollowResult {
  if (!leader) return 'reset';
  if (leader.id === f.id) return 'reset';
  if (f.fails > FAIL_LIMIT) return 'drop';
  if (f.fails > 0 && f.sinceTurn + RETRY_TURNS > turn) return 'wait';
  f.sinceTurn = turn;
  if (!attempt()) {
    if (cannotReachLeader) f.fails++;
    return 'failed';
  }
  f.fails = 0;
  return 'moved';
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/CO002-dkfans-party-chain.ts`): exit 0.

## 5. Lands in

- TARGET `src/fight/party.ts` (new module, engine state): the attacker group's leader choice, the follower obedience switch, and the leash drop-out, all run by the engine, not the client.
- Parity-checklist row 4 (fight loop: aggro, chase, leash). The follow and drop-out is the leash; the leader choice is part of the same fight loop. The server tick sub-line ("server tick: fixed step, input intake, per-tick NPC budget") applies to where `followTick` runs; the donor counts game turns, not a per-tick budget.
- Parity hint 19 (fight record) is not used here: no record of who led or who dropped was seen in this path (not searched beyond it).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: leader choice and leash are engine state); rule 8 (named target file and parity row).

## 6. Gaps and risks

- The donor's ranking is domain-specific: a "digger" role (tunnellers and imps) and job-room matching are not Frankendom concepts. Keep the shape (a preferred-role flag, defenders last, then level, then score); drop the job rooms.
- Score normalisation uses the maximum over all models at the top level (`thing_creature.c:6338`). Frankendom's catalogue (parity row 21) would need the same global maximum or a fixed scale. A fixed scale is safer across zones.
- MAX_ATTACKERS = 3 leaves very little to re-elect. With three attackers the re-election picks between two survivors; Lead should decide whether a leader change should cost a turn.
- Pre-fight planning: the donor's planning surface is the per-member objective and the countdown, written in a level script (data). That fits "zones as data": a zone can list party members with an objective, level and countdown. The countdown is turns before a member acts (`thing_creature.c` not read beyond `creature_groups.c:876-877`).
- Mid-fight coach commands: the only live control in this path is the player-controlled leader (`creature_groups.c:644-648`), which forces followers to stay in follow. No cost, cooldown or per-fight limit was found in this path.
- Defect 1: `creature_groups.c:335` assigns the class for each member, so the last member visited wins. A group of a defending digger and a non-digger returns class 0 when the non-digger is visited last, which lets non-digger defenders lead (the defender filter at 420 is relaxed). Fix: maximum (done in the sketch).
- Defect 2: the party-id guard at `creature_groups.c:547` and `:574` reads `(party_id < 0) && (party_id >= CREATURE_PARTYS_COUNT)`, which can never be true, so a bad party id indexes past the table. Fix: `||`. Not in the sketch (no party table in Frankendom).
- Defect 3: the score init checks `i != 31` (`thing_creature.c:6361`) where the first loop checks `model_count -1` (6339). They agree only if the roster has 32 models (not checked). Fix: `model_count - 1` in both (not in the sketch).
- Not read, so not claimed: the spawn-side branch in full (908-920), `creature_is_being_dropped`, the MatchWorkRoom job lookup, and the `wait_to_turn` use in the state machine.
- Wage pressure (`creature_states.c` 5235-5264, `annoy_got_wage` in `config_creature.h`) is a separate mood mechanic. Only its signature was read; it is not part of this cell.
- The GPL licence: clean-room only. Nothing from the donor is copied; the sketch is written from the described rules.

Best transferable idea: leader succession by a ranked rule (preferred role, then defenders last, then level, then score) on every removal, with followers falling back to idle when the leader is gone and dropping out after 12 failed catch-ups.

Decision (proposed): adapt - take the ranked succession, the idle fallback and the leash drop-out; drop the digger and job-room concepts, and fix the donor's last-wins role class and the party guard. Frankendom's attacker group needs an engine-owned leader and a leash, not a copy of the dungeon roles.
Acceptance: In a 3-attacker server test, when the leader dies the next leader is the highest-level survivor (ties broken by score); when a follower has 13 consecutive failed catch-up moves while the leader is unreachable, it leaves the group on its next tick and goes idle; one successful move resets its fail count to zero.

## 7. Coach table (coach-manager-mode rows)

Rows for the coach topic. "(not read)" = not opened in this pass; nothing is claimed for those rows.

| name | what | formula | ranges | file:line |
|---|---|---|---|---|
| Pre-fight planning and instructions | level script defines each party member: creature, exp level, carried gold, objective, countdown | exp stored as level minus one; first action at turn + countdown | exp levels 1 to 10; 30 members; 256 parties | lvl_script_commands.c:6960; creature_groups.c:545-571, 876-877; creature_groups.h:30; lvl_script.h:35; levels/lostlvls/map00020.txt:97 |
| Stance / target priority | objective per member (AttackRooms 1, AttackEnemies 3, DefendParty 8, ... DefendRooms 11) plus a target player | enum | 0 to 11 | creature_states_hero.h:34-45 |
| Mid-fight coach command | a player-controlled leader holds all followers in the follow state; no per-command set was found | forced follow | on or off | creature_groups.c:644-648 |
| Command cost / cooldown / limit per fight | none found in the read path | n/a | n/a | creature_groups.c:644-648 |
| Command lag | followers act on their own creature tick; a failed catch-up waits 16 turns | retry after 16 turns | 16 turns | creature_states.c:2264 |
| Fighter stat sheet | creature score = max health + defense + dexterity + armour + strength at a level, scaled to 200 and clamped to 8 bits | 200 x score / max | 1 to 200 | thing_stats.c:347-354; thing_creature.c:6360, 6371-6382 |
| Training schedules and growth | creature_states_train.c exists (603 lines); not read | | | creature_states_train.c (not read) |
| Fatigue / injury / recovery | not read for the party path; wage mood only (annoy_got_wage) | | | config_creature.h:337; creature_states.c:5235-5264 (signature only) |
| Scouting / information limits | (not read) | | | |
| Hiring / contracts / upkeep | TeamHire, TeamFire and TeamCost strings exist; no GUI code using them found in the src .c files searched; wages via annoy_got_wage | | | config_strings.h:156-158; config_creature.h:337 |
| Matchmaking from coach view | (not read) | | | |
| Post-fight report / replay | (not read) | | | |
| AI behaviour when the coach is absent (default tactics) | leader invalid: follower resets to idle; leader re-chosen by rank on removal; follower dropped after more than 12 failed catch-ups | rank: role class, then level, then score | 12 fails | creature_groups.c:633-637, 447-458; creature_states.c:2210, 2257 |
