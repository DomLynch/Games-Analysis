# CleverRaven-Cataclysm-DDA (quests-dialogue, cell 1)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mission.cpp` | Licence: CC-BY-SA 3.0 Unported (LICENSE.txt line 1: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0 Unported License") | C++ | symbol `mission::is_complete`

Checked: Read the mission lifecycle end to end: `mission_type::create` (mission.cpp 46 onward), `mission::assign` (391-421), `mission::fail` (423), `mission::step_complete` (446), `mission::wrap_up` (467, read to its end), `mission::is_complete` (566-732), `mission::process` (850-861), `mission::process_all` (189-217), `mission::on_talk_with_npc` (366-378), `mission::on_creature_death` (246-327); the reward and report-back path `talk_function::mission_success` (npctalk_funcs.cpp 124-146), `talk_function::mission_failure` (148-), `talk_function::mission_reward` (190-200), `f_finish_mission` (npctalk.cpp 6119-); the debt model `npc_trading::calc_npc_owes_you` (npctrade.cpp 264-282) and `npc::max_willing_to_owe` (npc.cpp 2266-2289); the turn loop `game::do_turn` (do_turn.cpp 524-561). Callers checked: `wrap_up` has three (process at mission.cpp 858-859, f_finish_mission at npctalk.cpp 6140, mission_success at npctalk_funcs.cpp 145); `process_all` has one (do_turn.cpp 561). Confidence: high for the lifecycle, the goal predicates and the reward path. Not read: `npc_trading::cash_to_favor` (the value-to-opinion conversion), the dialogue topic selector (only its condition and effect functions were read), the bodies of `mission::reserve_new` and `has_deadline`, and the `mission_end` effect parser. camera_scope: not applicable.

Best transferable idea: a quest is a data record with one goal kind, a status (yet_to_start, in_progress, success, failure), a deadline, and a completion predicate per goal kind, and a quest given by an NPC is paid only when the player reports back to that NPC.

Decision (proposed): adapt - keep the state machine, the per-goal predicate table, the report-back gate and the reward as a ledger credit; reject the NPC-owes debt ceiling and the client-side inventory polling, because Frankendom's one-ledger and server-verified rulings forbid both.

Acceptance: a server test where a giver quest whose objective is met stays pending and pays 0 until the player reports to the giver; the report then credits the one ledger once with the quest value; a second report credits nothing; a quest past its deadline ends as failure with no credit.

## 1. Mechanism

- A quest is a `mission` made from a `mission_type` data record. `mission_type::create` (mission.cpp 46) copies the record's value, npc id and kill goal into the new mission and evaluates the record's deadline (52-68). The status starts as `yet_to_start` (mission.h 267-271).
- Accept: `mission::assign` (391) gives the mission to the player. While the status is still `yet_to_start` it does three things in this order: for kill-type goals it stores the kill count at accept plus the goal number as the reach value (407-409); it re-evaluates the deadline from the type, so the deadline runs from accept, or sets it to `turn_zero` when the type has none (412-417); it calls the type's start hook and sets `in_progress` (418-419).
- Each game turn: `game::do_turn` advances the turn counter (do_turn.cpp 540) and later calls `mission::process_all` (561). `process_all` calls `process()` on every world mission (189-217; it skips the call only for a FIND_ITEM mission whose item is absent from a pre-scan). `process()` (850-861) does nothing unless the mission is in progress. Then: if it has a deadline and the turn is past it, it calls `fail()` (856-857); otherwise, if the mission has no giver and `is_complete` is true, it calls `wrap_up()` (858-859). A mission with a giver is never wrapped up by the tick.
- Goal predicates, `is_complete` (566): a successful mission is always complete (569-570). Go-to and go-to-type check the player's overmap tile. Find-item counts matching items within 5 tiles and in the inventory (609-651). Step goals (talk, assassinate, kill one, kill several, nemesis, computer toggle) are complete when `step >= 1` (682-688). Kill-type goal: the kill tracker count is at least the reach value (691). Recruit, find-NPC and condition goals are checked separately; the condition goal runs the type's dialogue condition (not read).
- Progress events: `on_talk_with_npc` (366) sets step 1 when the talked-to NPC is the goal's target and step is 0 (372-373). `on_creature_death` (246) advances monster-tagged missions: a kill-one mission gets `step_complete(1)`; a kill-several mission counts down (see section 3). When an NPC dies, a live assassinate mission gets step 1, and any mission whose giver dies is failed (308-324).
- `step_complete` (446) stores the step and, for the goals that report back (find item, kill, talk and others, 455-459), moves the mission target to the giver's position. This sends the player back to the giver.
- Report-back and reward, the part that matters for a giver quest. The dialogue condition `mission_complete` calls `is_complete` on the selected mission (condition.cpp 1434-1438). The effect `mission_success` (npctalk_funcs.cpp 124-146) converts the value into an opinion change (132), adds opinion and faction power, and then calls `wrap_up()` (145). `mission_reward` (190-200) adds the mission value to the NPC's owed balance (198-199) and runs a "Reward" trade (200). The owed balance is capped on the way in by `calc_npc_owes_you` (npctrade.cpp 264-282): a new balance above both the current owed amount and `max_willing_to_owe` is clamped to the larger of the two (277-278).
- `wrap_up` (467): sets `success` (477), applies the type's item effects (FIND_ITEM consumes the items; FIND_ANY_ITEM removes the mission items; FIND_MONSTER clears the tag), clears the deadline to the completion turn (561), and runs the type's end hook. `fail` (423) sets `failure` (425), clears the deadline to now (431) and runs the type's fail hook. The fail dialogue (`mission_failure`, npctalk_funcs.cpp 148-) lowers trust and value and raises anger.

## 2. Key functions

- `mission::assign`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mission.cpp` 391-421. Sets the accept-time baseline, the deadline and `in_progress`.
- `mission::process`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mission.cpp` 850-861. Deadline fail, then auto wrap-up only with no giver.
- `mission::is_complete`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mission.cpp` 566-732. One predicate per goal kind; reads the live player and kill tracker.
- `mission::wrap_up`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/mission.cpp` 467 onward. Success, item effects, deadline cleared, end hook.
- `talk_function::mission_success`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npctalk_funcs.cpp` 124-146. The report-back effect; calls `wrap_up`.
- `talk_function::mission_reward`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npctalk_funcs.cpp` 190-200. Adds the mission value to the owed balance, then a trade.
- `npc_trading::calc_npc_owes_you`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/npctrade.cpp` 264-282. Clamps a rising debt to the ceiling.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Quest status: yet_to_start -> in_progress -> success or failure; failure and success both stamp the completion turn | None (the states are fixed by the engine, mission.h 267-271) |
| Objective baseline at accept: the kill target is the kill count at accept plus the goal number, so earlier kills do not count | Goal number from the record (`monster_kill_goal`, default -1 at missiondef.cpp 194) |
| Deadline from accept time; zero means no deadline | Record deadline, duration or variable (missiondef.cpp 189); evaluated at accept (mission.cpp 412-417) |
| Kill-several countdown: a counter starts at the record value, each mission-tagged spawn adds 1 (map.cpp 10221-10222 for the kill-several goal; mission.h 351-352), and a death completes the step when the counter is 0 before it is decremented (mission.cpp 289). With N tagged spawns the counter is N-1 after spawning, so the N-th tagged death completes it | Sentinel -1 (missiondef.cpp 194); the decrement-after-test order is the donor's convention |
| Reward value: a mandatory integer on the record, copied to the mission at create (mission.cpp 55), read at report-back (npctalk_funcs.cpp 198) | Value per record (theirs, required in JSON, missiondef.cpp 132) |
| Debt ceiling for an NPC owing the player: base plus per point of trust, value, fear and altruism, minus anger (npc.cpp 2266-2289) | Base 10000 (theirs, npc.cpp 2277); trust 10000 per point (theirs, npc.cpp 2272). Not for Frankendom: see section 6 |
| Game turn: one increment per `do_turn` call, then the mission tick | One turn per `do_turn` (do_turn.cpp 540, 561) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: accept sets the kill baseline and the deadline; the tick checks the deadline before the no-giver auto wrap-up; a giver quest pays only through `reportTo`. It omits the find-item and go-to distance checks (the sketch uses an exact place id instead of a distance of 1), the kill-several countdown, the death events (NPC death, assassinate), the type-specific item consumption in `wrap_up`, the dialogue condition layer, the opinion and faction effects, `cash_to_favor`, the owed-balance ceiling, and the follow-up mission. It adds a guard so a quest pays once; the donor `wrap_up` has no guard of its own.

```ts
// Licence: CC-BY-SA 3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Status = "yet_to_start" | "in_progress" | "success" | "failure";

type Goal =
  | { kind: "killCount"; species: string; need: number }   // kill count is compared against a baseline set at accept
  | { kind: "talkToNpc"; npcId: string }                   // complete after the player talks to this NPC once
  | { kind: "reachPlace"; placeId: string };               // complete while the player stands on the place

interface Quest {
  id: string;
  playerId: string;
  status: Status;
  goal: Goal;
  giverId: string | null;      // null = no giver: completes by its objective alone
  value: number;               // reward, from quest data
  durationTicks: number;       // 0 = no deadline
  deadlineTick: number;        // set at accept
  killReach: number;           // absolute kill count to reach (accept baseline + need)
  step: number;                // 0 = not yet, 1 = talked
}

interface World {
  now(): number;               // game tick counter
  killsOf(species: string): number; // cumulative kill tracker
  placeOfPlayer(): string;
}

interface Ledger {
  credit(playerId: string, amount: number, ref: string): void;
}

function accept(q: Quest, w: World): void {
  if (q.status !== "yet_to_start") return;
  if (q.goal.kind === "killCount") {
    q.killReach = w.killsOf(q.goal.species) + q.goal.need;
  }
  q.deadlineTick = q.durationTicks !== 0 ? w.now() + q.durationTicks : 0;
  q.status = "in_progress";
}

function isComplete(q: Quest, w: World): boolean {
  if (q.status === "success") return true;
  switch (q.goal.kind) {
    case "killCount":
      return w.killsOf(q.goal.species) >= q.killReach;
    case "talkToNpc":
      return q.step >= 1;
    case "reachPlace":
      return w.placeOfPlayer() === q.goal.placeId;
  }
}

function fail(q: Quest): void {
  q.status = "failure";
}

function wrapUp(q: Quest, ledger: Ledger): void {
  // Our guard: pay once. The donor wrap_up has no guard of its own.
  if (q.status === "success" || q.status === "failure") return;
  q.status = "success";
  ledger.credit(q.playerId, q.value, "quest:" + q.id);
}

// Once per game tick, for every quest the player holds.
function tick(q: Quest, w: World, ledger: Ledger): void {
  if (q.status !== "in_progress") return;
  if (q.deadlineTick !== 0 && w.now() > q.deadlineTick) {
    fail(q);
  } else if (q.giverId === null && isComplete(q, w)) {
    wrapUp(q, ledger);
  }
}

// Talking to an NPC: a talkToNpc objective completes its step.
function onTalk(q: Quest, npcId: string): void {
  if (q.goal.kind === "talkToNpc" && npcId === q.goal.npcId && q.step === 0) {
    q.step = 1;
  }
}

// Report back to the giver. Returns true if the reward was paid now.
function reportTo(q: Quest, npcId: string, w: World, ledger: Ledger): boolean {
  if (q.giverId !== npcId || !isComplete(q, w)) return false;
  wrapUp(q, ledger);
  return true;
}
```

## 5. Lands in

- TARGET `origins/server/quests.ts` (new module, proposed; the Frankendom file layout was not checked here): the server-side quest record, accept, the per-turn tick, objective events, the report-back gate and the reward credit. The reward leg is the one that lands in the ledger.
- Parity-checklist row 18 (loot roll and XP award): the reward credit is the award leg. The per-turn tick is the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" under row 18 / post-K item 3.
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room only)
- Brief rule served: zones as data (the quest record is data with its deadline, goal and value); one ledger (reward is one credit, once); server-verified (completion is decided from server state only)

## 6. Gaps and risks

- CC-BY-SA 3.0 is copyleft: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Completion in the donor reads the live player: `is_complete` checks the avatar's inventory and the items visible within 5 tiles (mission.cpp 609-651). Frankendom is server-verified, so the server must decide objective state from its own records. Do not port the visibility check.
- The donor models a reward as a debt the NPC owes: a ceiling built from trust, value, fear and altruism, minus anger (npc.cpp 2266-2289), and the balance can be refused or clamped (npctrade.cpp 277-278). Frankendom's one-ledger rule means a reward is a single credit, not a negotiable debt. Do not port the ceiling constants.
- The donor `wrap_up` has no guard against a second call; the dialogue path relies on the selected mission leaving the active list (not read). Pay-once must be a server test, not a hope.
- The donor reuses the deadline field to store the completion turn (mission.h 313). Frankendom should keep completion time in its own field, so a deadline check cannot be confused with a finished quest.
- The kill-several countdown uses a -1 sentinel and a test-then-decrement order (mission.cpp 289). The shape is clear, but Frankendom should count kills with an explicit per-quest baseline and test N spawns against N deaths.
- Zone data: the donor's place predicates are C++ functions (`mission_place::near_town` and similar, mission.h), not data. Frankendom zones should express these as zone data fields instead.
- The dialogue layer is JSON with C++ condition functions and effect functions (data/json/npcs/godco/godco_missions.json shows the record shape). The one-engine rule means quest state for dialogue gates should be read from the server, never from a client copy.
- `cash_to_favor` (the donor's opinion conversion) was not read. Do not port its effect until it is read.
