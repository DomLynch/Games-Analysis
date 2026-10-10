# freeorion-freeorion (progression, cell 10)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/Empire/ResearchQueue.cpp` (allocator 21-80, Update 137-335), `Empire/Empire.cpp` (CheckResearchProgress 2262-2378, UpdateResearchQueue 2997-3001), `universe/Tech.cpp` (PerTurnCost 395-396) | Licence: GPL-2.0-or-later (`default/COPYING` lines 109-112: "either version 2 ... or (at your option) any later version"; README.md:148 says "GPL v2"; the .cpp files carry no per-file header). Content (tech text, scripts) is CC-BY-SA 3.0 and was not used. | C++ | symbol `SetTechQueueElementSpending` (allocator), `Empire::CheckResearchProgress` (progress and auto-fill)

Checked: Read end to end: the queue allocator (`ResearchQueue.cpp` 1-136), `ResearchQueue::Update` including its turn-estimate simulator (137-335, read to the end), `Empire::CheckResearchProgress` (2262-2378), the call order in `Empire::UpdateResourcePools` / `UpdateResearchQueue` (2933-2942, 2997-3001) and the caller `ServerApp.cpp` 4500-4516, and `Tech::PerTurnCost` / `ResearchCost` / `ResearchTime` (365-405). Not read: `Empire::SanitizeResearchQueue` (called at 2266, body not read); the research pool (`m_research_pool.Update`, not read); `Effects.cpp` 3714-3716 (`SetTechResearchProgress`, grep line only). The list hint `_empire_statistics.py` was not opened (a statistics helper; not the research mechanism). Confidence: high on the allocation rule and the completion rule; the sketch matches the donor order. `camera_scope` n/a (not a camera cell).

## 1. Mechanism

Per turn, on the server, the order is: pool update, then queue allocation, then progress.

(a) Allocation. `UpdateResearchQueue` passes the pool total and the progress map to `ResearchQueue::Update` (Empire.cpp 3001). `SetTechQueueElementSpending` walks the queue in its order (ResearchQueue.cpp 21-80). A paused item, or one that is not researchable this turn (prerequisites not met), gets 0 (75). A researchable item needs `cost - progress x cost` (58) and may take at most `cost / max(1, min_turns)` per turn (59). The smaller of the two is its request (60). While the running total plus the request fits under `RPs - EPSILON`, the item gets the full request (63-64). The first item that does not fit takes the rest of the pool (68), and every later item gets 0. So the queue is strict priority order with one partial item at the boundary.

(b) Projection. `ResearchQueue::Update` then runs a dynamic-programming simulation over up to 500 turns (`TOO_MANY_TURNS`, 165) that uses the same per-turn cap and unlocks dependent items when prerequisites finish. It writes `turns_left` for display (set at ResearchQueue.cpp:299; the allocation does not use it). Min turns are floored at 1 (210).

(c) Progress. Later in the same server turn, `ServerApp` calls `CheckResearchProgress` (ServerApp.cpp 4512). For every item with `allocated_rp > 0`, progress is stored as a fraction: `progress += allocated / max(EPSILON, cost)` (Empire.cpp 2287). The item is finished when `cost - EPSILON <= progress x cost` (2289), and it is removed from the queue. It is granted at the start of the next turn (ServerApp.cpp 4513-4514).

(d) Leftover auto-fill. The pool minus the queue's spend is `rp_left_to_spend` (2296). The auto-fill list is every researchable, unqueued, unfinished, unpaused tech (2313-2331). Each gets `remaining = cost x (1 - progress)` (2339). The list is stable-sorted ascending by `remaining` (2342), so the cheapest-to-finish goes first and ties keep the tech-manager map order. For each item while `rp_left > EPSILON` (2348): the step is the minimum of the fraction left, the per-turn cap as a fraction (`PerTurnCost / cost`, 2358-2362) and `rp_left / cost` (2363). The progress and the spend are updated (2369-2377).

Tick: one fixed turn. No real-time or frame loop is involved. Progress is a fraction, so the same numbers work for any cost.

## 2. Key functions

- `SetTechQueueElementSpending`: `/mnt/frankendom-donors/freeorion-freeorion/Empire/ResearchQueue.cpp` 21-80. Priority order, per-turn cap, one partial item.
- `ResearchQueue::Update`: `/mnt/frankendom-donors/freeorion-freeorion/Empire/ResearchQueue.cpp` 137-335. Allocation call at 156, then the DP projection for `turns_left`.
- `Empire::CheckResearchProgress`: `/mnt/frankendom-donors/freeorion-freeorion/Empire/Empire.cpp` 2262-2378. Queue progress (2275-2293), then leftover auto-fill (2296-2378).
- `Tech::PerTurnCost`: `/mnt/frankendom-donors/freeorion-freeorion/universe/Tech.cpp` 395-396. Per-turn cap = cost / max(1, time).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Points per tick go to queued items in priority order; each item takes at most cost / min_turns per tick; the first item that does not fit takes the rest | `EPSILON = 0.01` tolerance (theirs, ResearchQueue.cpp:15) |
| Progress stored as a fraction; finished when within EPSILON of the cost | Same EPSILON (theirs, Empire.cpp:2289) |
| Leftover points auto-fill cheapest-remaining-cost first, each limited by the same cap | Sort order and stable ties (theirs, Empire.cpp:2342) |
| Min turns floored at 1 | `std::max(1, time)` (theirs, ResearchQueue.cpp:210) |
| Projection horizon | `TOO_MANY_TURNS = 500` (theirs, ResearchQueue.cpp:165); display only |
| Cheap-and-fast game rule forces cost 1 and time 1 | `RULE_CHEAP_AND_FAST_TECH_RESEARCH` (theirs, universe/Tech.cpp:371) |

Per-tech cost and min turns are script data in the donor (not copied; content is CC-BY-SA 3.0).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: queue allocation in priority order with the per-turn cap and one partial item; progress applied from the allocation; then the leftover auto-fill, cheapest remaining first, with the same cap. It merges the donor's two steps (allocator in `ResearchQueue.cpp`, progress in `Empire.cpp`) into one function. It omits: the turn-estimate simulator (`turns_left`), `SanitizeResearchQueue`, the research pool, the paused-item rule beyond a skip, the per-empire cost lookup (`ResearchCost` with its source object), and the `ALL_EMPIRES` fallback cost. The sketch takes cost and min turns as plain numbers.

```ts
// clean-room: written from the described mechanism (GPL-2.0-or-later donor), not a translation of the donor lines.
// Per-turn research pacing: a queue spends a pool of points in priority order, each item capped per turn,
// then leftover points auto-fill the cheapest researchable items that are not queued.
interface Item {
  name: string;
  cost: number;        // total points to finish (>0)
  minTurns: number;    // minimum turns to finish; the per-turn cap is cost / max(1, minTurns)
  progress: number;    // fraction 0..1 done
  researchable: boolean;
  paused: boolean;
}

const EPS = 0.01;      // tolerance for "finished" and "enough left"

interface TurnResult { spent: Map<string, number>; finished: string[]; }

// One turn. queue = ordered list of names the player wants; items = the whole catalogue.
function runTurn(points: number, queue: string[], items: Map<string, Item>): TurnResult {
  const spent = new Map<string, number>();
  const finished: string[] = [];
  let left = points;

  // 1) queue, in order. Full allocation while it fits; the first item that does not fit takes the rest.
  let queueSpent = 0;
  for (const name of queue) {
    const it = items.get(name);
    if (!it || it.paused || !it.researchable) continue;
    const need = it.cost - it.progress * it.cost;
    const cap = it.cost / Math.max(1, it.minTurns);
    const want = Math.min(need, cap);
    let give = 0;
    if (queueSpent + want <= left - EPS) give = want;
    else if (queueSpent < left - EPS) give = left - queueSpent;
    if (give > 0) {
      spent.set(name, give);
      queueSpent += give;
    }
  }
  // apply queue progress; an item finishes when progress reaches cost (within EPS)
  for (const [name, give] of spent) {
    const it = items.get(name)!;
    it.progress += give / Math.max(EPS, it.cost);
    if (it.cost - EPS <= it.progress * it.cost) finished.push(name);
  }
  left -= queueSpent;

  // 2) leftover auto-fill: researchable, not queued, not done; cheapest remaining cost first (stable on ties).
  const queued = new Set(queue);
  const candidates: Array<[number, string]> = [];
  for (const [name, it] of items) {
    if (queued.has(name) || !it.researchable || it.paused || it.progress >= 1) continue;
    candidates.push([it.cost * (1 - it.progress), name]);
  }
  candidates.sort((a, b) => a[0] - b[0]);
  for (const [, name] of candidates) {
    if (left <= EPS) break;
    const it = items.get(name)!;
    const capFrac = (it.cost / Math.max(1, it.minTurns)) / it.cost;   // per-turn fraction cap
    const inc = Math.min(1 - it.progress, capFrac, left / it.cost);
    it.progress += inc;
    left -= inc * it.cost;
    spent.set(name, (spent.get(name) ?? 0) + inc * it.cost);
    if (it.cost - EPS <= it.progress * it.cost) finished.push(name);
  }
  return { spent, finished };
}

export {};
```

## 5. Lands in

- TARGET `origins/server/progression-queue.ts` (new; server-side timed training queue on the one ledger, for slow progression such as skills or perks, not for the fight loop). Parity-checklist row 18 (XP award and progression) is the nearest row; progression has no row of its own in the 1-22 list.
- today: Frankendom's current skill or perk unlock code was not read (not checked).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one ledger, server decides the spend); zones as data for the per-item cost and min turns.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Time base: the donor pays once per turn. Frankendom has a server tick; the per-turn cap must be restated per tick, and the tick rate becomes a data constant. Do not use wall-clock time in the ledger.
- Not a fight mechanism. Points spent per tick do not change the duel. Keep it out of `src/fight/`; using it in combat would add a second clock to the duel.
- Ledger safety: the donor writes progress as a float fraction. Frankendom should use integer points and integer tick counts so partial spends cannot drift or double-credit.
- Finishing rule: the donor treats "within EPSILON of cost" as finished, which hides rounding. Use exact integers instead of a tolerance.
- Priority is by queue order only, with no fairness. For a shared economy (not in scope here) this would starve later items.
- The auto-fill is cheapest-first and can be surprising to a player. Frankendom should make it an explicit opt-in per character.

Best transferable idea: pace a long unlock with a per-tick spend cap (cost / minimum ticks) and let spare points flow down a priority queue and then auto-fill the cheapest remaining item, so no point is wasted.

Decision (proposed): adapt — the per-tick cap and the leftover cascade suit a slow, server-side skill or perk training queue; they do not belong in the duel, and the float progress must become integer points on the server ledger.
Acceptance: a server test with 10 points per tick and a skill costing 100 with min 5 ticks gives the first queued skill 10 points (cap 20, partial) and the second queued skill 0 that tick; with the queue empty, the spare points auto-fill the cheapest remaining researchable skill, capped at 20 per tick.
