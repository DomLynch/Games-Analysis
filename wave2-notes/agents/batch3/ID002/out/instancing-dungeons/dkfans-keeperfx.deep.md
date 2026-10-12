# dkfans-keeperfx (instancing-dungeons, cell 19)

Donor: /mnt/frankendom-donors/dkfans-keeperfx | Licence: GPL-2.0 (LICENSE line 2 "Version 2, June 1991"; copyleft, clean-room, shape only) | C | symbol script_process_new_party (src/creature_groups.c) with good_doing_nothing, good_leave_through_exit_door and good_wait_in_exit_door (src/creature_states_hero.c)
Checked: camera_scope not applicable (not a camera cell). The hint was INFERRED (no hint file). Grep for "instanc" in src gave only comments and unrelated words, so I searched for the real lifecycle by party, gate, exit door, countdown and leave-dungeon. Opened in full: creature_groups.c 545-592 (add and delete member) and 855-943 (party spawn, tunneller party); creature_groups.h (cap and party struct, lines 30-86, by grep and read); creature_states_hero.c 905-1041 (good_doing_nothing), 1068-1096 (exit leave), 1121-1168 (exit-door wait); creature_control.h 214-222; thing_data.h 121-130; config_rules.h 86 (grep); config_rules.c 82-86 (read) and 95 (grep row); creature_states.c 2555-2605 (leave-dungeon); creature_states_train.c 415 (identity idiom, grep line); lvl_script_commands.c 734 and lvl_script_commands_old.c 100 (callers, grep lines); thing_creature.c 6836-6842 (state dispatch). Callers: script_process_new_party has 1 caller in src (lvl_script_commands_old.c:100; the tunneller path at :534 calls it too); add_member_to_party has 1 caller (lvl_script_commands.c:734); good_leave_through_exit_door is reached through the state table (creature_states.c:283). Not read: good_find_best_enemy_dungeon body (creature_states_hero.c 102-130, only its call sites), creature_can_get_to_dungeon_heart (thing_navigate.c:441), how the hero gate object is created (its creation_turn is set elsewhere), script_create_new_creature, the Lua path (lua_api_things.c:214), and whatever else could release a hero stuck in limbo. Confidence: high on the spawn and leader order, the retarget numbers and the stamp type mismatch (type-checked from the declarations); medium on the run-time effect of the stamp mismatch and of countdown 0 (read, not run). Nothing was executed.
Best transferable idea: A raid party enters a hostile zone as a staggered wave, each member with its own countdown, elects one leader by objective then level then score, and re-targets on fixed timers (64, 400, 16 and 200 turns) rather than in one step.
Decision (proposed): adapt - take the staggered-countdown wave, the leader rule and the retarget timers for enemy parties entering a zone (data: the party record and the timers); reject the hero-gate limbo mechanic as not in our rulings; fix defects D1 (bounds guard always false), D2 (8-bit gate stamp) and D3 (countdown 0 never releases) in the sketch.
Acceptance: Server test: a 3-member party with countdowns 0, 30 and 60 turns spawns at once and activates at turns 0, 30 and 60; the highest-level member leads; an out-of-range party id is rejected and writes nothing; a waiting member whose exit gate was replaced by turn 300 is removed, not returned.

## 1. Mechanism
A party is a data record filled by level-script commands (creature_groups.c:545-569): each member has a model, level, carried gold, objective, target player and a countdown in turns (member->countdown = countdown, line 566). Up to 30 members (creature_groups.h:30).
1. Spawn. script_process_new_party (creature_groups.c:855-919) creates each member at the location, copies its objective and target (873-874), and sets two waits from the same countdown: cctrl->wait_to_turn = max(0, countdown + now) (876) and hero.wait_time = now + countdown (877). So members enter one by one, each after its own delay.
2. Leader. The first member is the only member and the leader (880-884). The whole spawn loop runs `copies_num` times (855-858), so a script can spawn N copies of the whole party. Each later member then goes through the leader rule (889-913), compared against `get_best_creature_to_lead_group(grptng)` (the group's best candidate, not simply the current leader): a member without the defend objective replaces a defending best (890-893); if both are defenders, or both are not, the higher level leads, and at a level tie the higher score leads (896-902); otherwise the member joins as a follower (906, 912).
3. Wait and retarget. good_doing_nothing (905-1041): the idle clock is checked first (924-926). While wait_to_turn is in the future the member wanders to a random adjacent slab (929-935). Then: when more than 128 turns have passed since its last job check, it tries its assigned job again (937-945). With a target player set, it measures turns since wait_time (960); after more than 400 it checks the chosen zone is still reachable and clears the target if not (961-970); between 0 and 400 it wanders (972-980); a negative value is logged and reset to zero (981-986). With no target it looks for the best enemy zone every 64 turns (1011-1016); if none is found it falls back to its original objective (1022-1025) and tries again after 16 turns (1026). A broken task waits 200 turns (1039).
4. Exit. good_leave_through_exit_door (1068-1096): the hero's carried gold is zeroed at once on entering the exit (about 1084) and any dragged object is dropped and destroyed (about 1087-1091); the hero is then taken off the map into limbo, its countdown is set from the rule HERODOORWAITTIME (1085), it records the creation turn of the gate it stands on (1086), and it enters CrSt_GoodWaitInExitDoor (1095). good_wait_in_exit_door (1121-1167) counts the countdown down one per call (1133-1135). At zero, if the gate with the recorded creation turn still exists, the hero is pushed back out of that gate (1141-1155). Otherwise its carried gold is zeroed again (1158), any drag object is deleted (1159-1164) and it is killed with no death effect and not as a real death (1165, flags CrDed_NoEffects and CrDed_NotReallyDying).
5. Group leave. make_all_creature_in_group_leave_dungeon (creature_states.c:2576-2587) asks every member of a group to leave by a room of the leave role (2555-2574).

## 2. Key functions
- script_process_new_party (creature_groups.c:855): spawn and leader.
- add_member_to_party / delete_member_from_party (creature_groups.c:545, 572): party record edits; delete shifts the array (586).
- good_doing_nothing (creature_states_hero.c:905): idle, retarget and fallback timers.
- good_leave_through_exit_door (creature_states_hero.c:1068) and good_wait_in_exit_door (1121): exit wait and release.
- make_all_creature_in_group_leave_dungeon (creature_states.c:2576): group exit.

## 3. Numbers vs mechanism
- Party cap: 30 members (creature_groups.h:30); party struct holds 30 members (81-85).
- Member countdown: in turns, from the level script (lvl_script_commands.c:734 passes it as scline->np[5]; the value is set at creature_groups.c:566). No default read.
- Member entry: wait_to_turn = countdown + current turn, clamped at zero (876).
- Leader: level first, then score (898); the defender rule at 890.
- Retarget: look for a zone every 64 turns (1012); attack the chosen zone after 400 turns (961); retry after 16 turns with no target (1026); retry after 200 turns on a broken task (1039).
- Exit wait: HERODOORWAITTIME (config_rules.h:86 field; config_rules.c:95 row: default 100, minimum 0, maximum UINT32_MAX, columns read from the row order, not from a header). Read as the countdown in turns (1085, decremented at 1135).
- Stamp: 8 bits in the creature (creature_control.h:220), 32 bits in the gate thing (thing_data.h:129). See D2.

## 4. TypeScript sketch
simplified: omits the tunneller, the job reuse after 128 turns, the reachability check and the "ready for attack" flag, the Lua path, the hero's gold and drag object, the map push-out, and the room-based group leave. The retarget step returns 'attack' once the wait passes 400 turns (the donor first checks reachability). The exit gate decides at once when the countdown is zero (fixes D3), and keeps the full turn number as the stamp (fixes D2). The leader rule and timers are the donor's numbers. Written from the rules, not translated from the donor.
```ts
// Clean-room shape of a party entering a zone: staggered spawn, leader election, retarget timers, exit-gate check
// (rules re-expressed in our own words; GPL-2.0 donor, shape only; no donor code copied).
export interface Member { kind: string; expLevel: number; score: number; defend: boolean; countdownTurns: number; target: number; }
export interface Party { name: string; members: Member[]; }   // donor caps a party at 30 members
export interface Live {
  id: number; expLevel: number; score: number; defend: boolean; leader: boolean;
  activeAtTurn: number; target: number; objective: string; originalObjective: string;
}

// Leader rule: a non-defending candidate replaces a defending leader; otherwise the higher level, then the higher score, leads.
function candidateLeads(leader: Live, cand: Member): boolean {
  if (!cand.defend && leader.defend) return true;
  if (cand.defend === leader.defend) {
    return cand.expLevel > leader.expLevel || (cand.expLevel === leader.expLevel && cand.score > leader.score);
  }
  return false;   // candidate defends, leader does not: join as follower
}

export function spawnParty(p: Party, nowTurn: number, firstId: number): { live: Live[]; leaderId: number } {
  if (p.members.length > 30) throw new Error('party too big (limit 30)');
  const live: Live[] = [];
  let leaderId = -1;
  p.members.forEach((m, k) => {
    const l: Live = {
      id: firstId + k, expLevel: m.expLevel, score: m.score, defend: m.defend, leader: false,
      activeAtTurn: nowTurn + Math.max(0, m.countdownTurns),   // staggered entry: each member waits its own countdown
      target: m.target, objective: m.kind, originalObjective: m.kind,
    };
    if (live.length === 0) {
      l.leader = true; leaderId = l.id;
    } else {
      const cur = live.find(x => x.id === leaderId)!;
      if (candidateLeads(cur, m)) { cur.leader = false; l.leader = true; leaderId = l.id; }
    }
    live.push(l);
  });
  return { live, leaderId };
}

// Retarget timers (donor numbers): every 64 turns look for an enemy zone; after 400 turns without a target
// the party is allowed to attack; when no target is found the party falls back to its original objective and
// retries after 16 turns; a broken task waits 200 turns.
export interface Retarget { target: number; waitSince: number; lookedAt: number; objective: string; originalObjective: string; retryAt: number; }
export function retargetStep(r: Retarget, nowTurn: number, findEnemyZone: () => number): 'idle' | 'attack' | 'retry' {
  if (nowTurn < r.retryAt) return 'idle';
  if (r.target === -1) {
    if (nowTurn - r.lookedAt > 64) {
      r.lookedAt = nowTurn;
      r.target = findEnemyZone();
    }
    if (r.target === -1) {
      if (r.originalObjective !== '') r.objective = r.originalObjective;
      r.retryAt = nowTurn + 16;
      return 'idle';
    }
  }
  if (nowTurn - r.waitSince > 400) return 'attack';
  return 'idle';
}

// Exit gate: the countdown runs down one step per turn; then the party returns at the same gate only if that gate
// still has the stamp it had when the hero went in. The donor stores the stamp in 8 bits, so the test fails for
// any gate created at turn 256 or later (fix: keep the full turn number). A countdown of 0 decides at once
// (the donor waits forever at 0).
export interface ExitWait { countdown: number; gateStamp: number; }
export function exitGateStep(w: ExitWait, gate: { creationTurn: number } | null): 'waiting' | 'returnAtGate' | 'removed' {
  if (w.countdown > 0) {
    w.countdown -= 1;
    if (w.countdown > 0) return 'waiting';
  }
  if (gate !== null && gate.creationTurn === w.gateStamp) return 'returnAtGate';
  return 'removed';
}

export {};
```
Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ID002-keeperfx-party-entry.ts), exit 0.

## 5. Lands in
Target: origins/server/world-spawns.ts. Parity row: 23 (zone population: a wave of enemies enters with staggered countdowns and despawns when the zone is done; the countdowns and the exit wait are zone data). The donor's timers are per-turn counters, so they sit in the fixed-step server tick (server tick: fixed step, input intake, per-tick NPC budget); no per-tick budget was read.

## 6. Gaps and risks
- One engine: the donor's party logic is in the creature state machine (hero states), which is close to ours. Our party must be the server's engage group, and the leader is a formation role only; no attacker cap was read in this code, so MAX_ATTACKERS = 3 is ours to add.
- Zones as data: the party record (model, level, objective, target, countdown) is zone data; the exit wait (HERODOORWAITTIME) is a rules value, so for us it becomes zone data.
- Server-verified kills: not in this code. The donor's retarget reads live zone state directly, so the server must own the target choice.
- One ledger: the exit path zeroes carried gold unconditionally on entering the exit (good_leave_through_exit_door, about 1084) and again in the removal branch (creature_states_hero.c:1158), and drops or destroys the dragged object on entry, all with no ledger entry. Ours needs a ledger row for any loot a party takes out of a zone.
- Pit as client: not in this donor.
- Defect D1 (bounds guard always false): add_member_to_party and delete_member_from_party test (party_id < 0) && (party_id >= CREATURE_PARTYS_COUNT) (creature_groups.c:547, 574). A value cannot be both, so the guard never fires and an out-of-range id indexes game.script.creature_partys directly (552, 579). Fix: use ||. The script parser may check the id before this call; that was not read.
- Defect D2 (stamp truncated to 8 bits): the stamp is stored in an unsigned char (creature_control.h:220, assigned at creature_states_hero.c:1086 from a 32-bit creation turn, thing_data.h:129). The comparison at 1141 therefore fails for any gate created at turn 256 or later, and the intended return branch (1142-1155) is unreachable for those gates. Read, not run; the intent is taken from the branch structure. Fix: store the full 32-bit turn.
- Defect D3 (countdown 0 never releases): if the rule is 0 (its minimum in the table, config_rules.c:95), good_wait_in_exit_door returns 0 at 1133 every turn and never reaches the release at 1136. Whether anything else releases the hero was not read. Fix: a zero countdown decides at once.
- Party size copies: `script_process_new_party` spawns the whole party `copies_num` times (855-858); the 30-member cap is per copy, so the live count can exceed 30. The sketch spawns one copy.
- Idle vocabulary: while waiting, members wander to random adjacent slabs (creature_states_hero.c:931, 976, 1027). That is the donor's idle animation; we can reuse the idea for zone-entry waits.
- Low: add_member_to_party sets the new member's flags with &= ~TrgF_DISABLED without clearing the slot first (creature_groups.c:560). The slot's old flags carry over. Not traced.
- Unknown: the zone's gate creation (its creation_turn source), the Lua path (lua_api_things.c:214), and creature_can_get_to_dungeon_heart (thing_navigate.c:441) were not read.

Reuse tag: GPL-2.0 (LICENSE). Clean-room: shape and numbers only; the sketch is written from the rules and copies no donor code.
Brief rule served: addendum "find the DATA tables first" (the party record and the rules row HERODOORWAITTIME, read); "keep the idea, fix the defect" (D1 to D3, each with a fix); section 5 row 23 (zone population with staggered entry).

Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR. D1 (&& not ||, creature_groups.c 547/574), D2 (unsigned char stamp vs 32-bit creation_turn), D3 (countdown <= 0 returns 0 forever) all real; timers 128/400/64/16/200, wait_to_turn clamp, HERODOORWAITTIME default 100 min 0, GROUP_MEMBERS_COUNT 30 verified.
- Error (a): carried gold is zeroed unconditionally on entering the exit (good_leave_through_exit_door, thing->creature.gold_carried = 0, before limbo) and the dragged object is dropped and destroyed there; the note said gold is zeroed only in the removal branch. Confirmed.
- Error (b): the leader comparison is against get_best_creature_to_lead_group(grptng), not "the current leader". Confirmed.
- Missed (c): script_process_new_party loops copies_num times (whole party spawned N times). Added.

Fixed 2026-10-12: mechanism steps 2 and 4, ledger-gap line, new copies_num gap. Sketch unchanged (it compares against the running leader, which matches the donor whenever the running leader is the best candidate).
