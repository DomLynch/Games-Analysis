# ValveSoftware-source-sdk-2013 (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/ai_basenpc.cpp` | Licence: Valve SDK licence (proprietary, read-only) | C++ | symbol `CAI_BaseNPC.ChooseEnemy / UpdateEnemyMemory` | input line 10207 verified: `ChooseEnemy` opens at 10207 and closes at 10349. `UpdateEnemyMemory` is at 5482 (closes at 5508), not 10207 as the input said. `ShouldChooseNewEnemy` is at 10144, `BestEnemy` at 7688-7961 (all four functions opened in full this pass).

## 1. Mechanism

- Each NPC keeps a memory of enemies it has heard of or seen. Each memory entry has a handle to the enemy, the time it was first and last seen, whether it has eluded the NPC, a valid-from time, the enemy's relation (hate, fear, or other), a priority, and reachability. The output of this group of functions is one current enemy (or none) plus the conditions the schedule system reacts to (new enemy, lost enemy, enemy went null).
- Runs in the NPC's think step, not per frame. `ChooseEnemy` (10207-10349) first reads the current enemy and the memory bits. It skips the change entirely, and keeps the current enemy, when the enemy has not gone null and the running schedule is interruptible by neither a new-enemy condition nor (a lost-enemy condition with an eluded enemy); no schedule at all counts as interruptible (10253-10271). This is a commitment rule: an NPC does not change target in the middle of a schedule that does not care.
- If a change is allowed, `ShouldChooseNewEnemy` (10144-10203) returns true when the memory serial number changed, the enemy eluded, the enemy is no longer hated or feared, or the enemy is not valid; or when the NPC currently sees a hated, disliked, nemesis or feared target (condition bits, 10161); or when a dead enemy's give-up timer has expired; or, checked at most every 1.5 s, when the task failed, the enemy was never seen first-hand, or it was last seen more than 10 s ago. It returns false only when none of that holds and the enemy's valid-from time has passed (10192-10196). Then `BestEnemy` (7688-7961) scores the memory.
- `BestEnemy` filters in order: dead, no-target flag, unseen for more than 0.4 s (only when the NPC's ignore-unseen flag is set), relation not hate or fear, last-seen older than the NPC's acceptable-time field, not yet valid, eluded, feared but never seen (unless unforgettable), and not a valid enemy. Reachability then wins over priority: a reachable enemy always replaces an unreachable best, and an unreachable one never replaces a reachable best. Among the same reachability, higher relation priority wins. On equal priority the candidate must be closer than the best by the squared-distance tolerance (`EnemyDistTolerance`, default 0, 100 for the Hunter NPC); the tie is then resolved with seen / visible checks that are evaluated lazily: a farther or equal candidate is rejected if the best is known seen or visible, and is accepted if the best is neither and the candidate is; a closer candidate is accepted if it was seen or is visible, and rejected if it is neither while the best is seen or visible (7819-7951).
- `UpdateEnemyMemory` (5482-5508) writes a sighting into the memory. It sounds a "found" cue if the enemy had eluded, sets a reaction delay only for the NPC's own sightings (0.3 s idle or 0.1 s alert from two console variables, `GetReactionDelay` 5470-5475; zero for reports from others), forces a decision think when another NPC reports a new potential enemy while this one is idle, and when the NPC saw it first-hand, tells its squad.
- Output of a change: forget the old memory bits, set or clear the enemy, set the enemy-dead, enemy-went-null or lost-enemy conditions, vacate the old enemy's strategy slot, fire output events for lost player or lost enemy, and remember the new enemy kind (player or other).
- Tick: think-rate (not per frame).

## 2. Key functions

- `CAI_BaseNPC::ChooseEnemy`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/ai_basenpc.cpp` 10207-10349. Commitment gate, change decision, memory bit bookkeeping, condition and output events.
- `CAI_BaseNPC::ShouldChooseNewEnemy`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/ai_basenpc.cpp` 10144-10203. Re-choose triggers (memory serial, eluded, relation, validity, sight conditions, timers).
- `CAI_BaseNPC::BestEnemy`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/ai_basenpc.cpp` 7688-7961. Scoring: filters, reachability first, priority, distance with tolerance and lazy seen / visible tie-breaks.
- `CAI_BaseNPC::UpdateEnemyMemory`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/ai_basenpc.cpp` 5482-5508. Writes a sighting or a report; squad sharing; decision think for an idle NPC.
- `CAI_BaseNPC::GetReactionDelay`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/ai_basenpc.cpp` 5470-5475. 0.1 s when alert or in combat, else 0.3 s (console variables at lines 205-206).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hate list with first-seen and last-seen times; old sightings expire | Acceptable time seen (per NPC field, theirs) |
| Commitment: keep the target while the current action does not allow a change | Interrupt conditions (theirs, per schedule) |
| Reachable beats unreachable regardless of priority | Rule itself (mechanism) |
| Priority by relation (hate above fear above other) | Priority values (theirs, data per relation) |
| Distance tie-break with tolerance, then seen / visible tie-break | `EnemyDistTolerance` (theirs; 0 default, 100 for the Hunter, ai_basenpc.h 1037, episodic/npc_hunter.cpp 1210) |
| Ignore unseen enemies after a short window, if the NPC opts in | 0.4 s window (theirs, `BestEnemy` line 7727) |
| Periodic forced re-choice | every 1.5 s; unseen over 10 s (theirs, lines 10184-10186) |
| Report from another NPC is not a first-hand sighting: no reaction delay | 0.3 s idle, 0.1 s alert (theirs, console variables) |

## 4. TypeScript sketch

simplified: the three-state seen / visible caching and the lazy evaluation order in the tie-break are collapsed to one `sighted` boolean; the squared-distance comparison is kept; relation checks reduce to a two-value relation; the valid-from time and the feared-never-seen skip are kept; schedule conditions are reduced to booleans; the dead-enemy timer, the 1.5 s forced re-choice, memory bits, events and the squad report are omitted.
```ts
// Licence: Valve SDK licence (proprietary, read-only). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Memory {
  id: number; alive: boolean; eluded: boolean; relation: 'hate' | 'fear' | 'other';
  priority: number; reachable: boolean; distSq: number; sighted: boolean;
  lastSeen: number; firstSeen: number | null; validFrom: number;
}

// Pick a new enemy from the hate list. Reachable beats unreachable; then priority; then distance with a tolerance.
function bestEnemy(list: Memory[], now: number, ignoreUnseenFor: number | null, distTolSq: number): number | null {
  let best: Memory | null = null;
  for (const m of list) {
    if (!m.alive || m.eluded || m.relation === 'other') continue;
    if (ignoreUnseenFor !== null && now - m.lastSeen > ignoreUnseenFor) continue;
    if (m.validFrom > now) continue;
    if (m.relation === 'fear' && m.firstSeen === null) continue;   // feared but never seen
    if (best === null) { best = m; continue; }
    if (best.reachable && !m.reachable) continue;                  // reachable beats unreachable
    if (!best.reachable && m.reachable) { best = m; continue; }
    if (m.priority > best.priority) { best = m; continue; }
    if (m.priority < best.priority) continue;
    const closer = best.distSq - m.distSq > distTolSq;
    if (closer ? (m.sighted || !best.sighted) : (!best.sighted && m.sighted)) best = m;
  }
  return best ? best.id : null;
}

// Commitment gate: keep the target unless the schedule wants a new enemy, or wants a lost one and it eluded, or it went null.
function mayChange(wantsNew: boolean, wantsLost: boolean, eluded: boolean, enemyWentNull: boolean): boolean {
  return enemyWentNull || wantsNew || (wantsLost && eluded);
}
```

## 5. Lands in

- TARGET `src/fight/world.ts` (exists today: per-creature threat list, `GIVE_UP_UNSEEN_S`, the creature picks the player with the most threat and nearest on a tie), checklist row 4 (fight loop: aggro, chase, leash). The new ideas from this donor are the commitment gate (no target change mid-attack) and the distance-tolerance hysteresis on a tie; neither is in world.ts today. If the brain needs them, the AI-side hook is TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), row 2.
- Reuse tag: rewrite-from-idea (licence: clean-room only)
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- Proprietary Valve SDK licence: clean-room only. The sketch above is written from the mechanism and does not reproduce donor lines or names.
- MAX_ATTACKERS = 3: this donor picks one enemy per NPC and does not limit how many NPCs pick the same enemy except through a strategy slot (`VacateStrategySlot`, body not read). Frankendom's cap of three engaged on one player is a separate rule in `src/fight/world.ts`; the hate list only orders who gets the slots.
- Server-verified kills: threat and hysteresis must be computed from verified hits on the server tick (the existing threat list adds damage from events that actually landed); the donor's tie-break reads line-of-sight queries, which the server must either run or replace with a distance rule.
- One engine: the NPC memory is per entity with many schedule-specific conditions. Frankendom's mob has a small fixed set of states in the shared brain; the schedule system is not a Frankendom concept, so the commitment gate applies only to multi-step creature behaviour (specials, windups).
- No hidden numbers: the 0.4 s, 1.5 s, 10 s windows, the reaction delays and the tolerance are tuned constants; Frankendom needs its own as catalogue fields (row 21) with defaults.
- The reachability test is a path query; the server must bound its cost per target choice.
- Reports from other NPCs (squad or a hear-event) spread aggro. Frankendom needs an explicit server-side rule for this (a write to the hate list with the reporter identified) before copying the shape.
