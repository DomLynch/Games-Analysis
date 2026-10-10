# luanti-org-luanti (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/luanti-org-luanti/src/server/blockmodifier.cpp` | Licence: LGPL-2.1-or-later (per-file SPDX line 2 of blockmodifier.cpp; LICENSE.txt 114-122 "License of Luanti source code", GNU Lesser General Public License; textures are under other licences, not relevant here) | C++ (with Lua ABM registration) | symbol `ABMHandler::apply`

Checked: Symbol `ABMHandler::apply` at blockmodifier.cpp 133-261 (read in full). The pass gate and loop: serverenvironment.cpp 1005-1058 (read in full). Also read: blockmodifier.cpp 17-131 (ABMWithState constructor, ABMHandler constructor, countObjects), blockmodifier.h 21-53 (ABM interface), numeric.h 418-440 (IntervalLimiter), defaultsettings.cpp 498-499, settingtypes.txt 2350-2354, s_env.cpp 84-89, 227-240, 419-450, games/devtest/mods/testabms/chances.lua 19-55 (test values only). camera_scope: not applicable. Callers: `ABMHandler` is constructed in one place (serverenvironment.cpp 1014, with use_timers = true), so the timer and catch-up behaviour below is the behaviour of that single call. Not read: the Lua spawn rules themselves (none are in this donor: `grep active_object_count` over builtin/ and games/ returns nothing), the LBM path (LoadingBlockModifier, read only as a header name), and the mapblock object storage behind getActiveSize. Confidence: high on the pass order and the per-node roll; medium on the MYMAX int truncation (read from the macro and the int declarations; not run).

## 1. Mechanism

- A pass runs on a fixed cadence, not per frame. `ServerEnvironment` keeps an `IntervalLimiter`: each step adds the frame dtime to an accumulator and runs the pass once the accumulator reaches `abm_interval` (serverenvironment.cpp 1005; numeric.h 431-434). It subtracts one interval and returns true, so a long frame gives one pass, not a catch-up loop.
- Order inside one pass (serverenvironment.cpp 1005-1058):
  (a) shuffle the ABM list (1010); (b) build `ABMHandler` with the pass interval and timers on (1014).
  (c) inside the handler (blockmodifier.cpp 39-100): each ABM's timer adds the pass interval (54); if the timer is still below the ABM's own `interval`, skip it (55-56); otherwise subtract one `interval` (57, not a reset, so the remainder carries), mark it due (58), and register it for each trigger content id (94-100). The chance is set from the ABM (60), then divided by the interval ratio when catch-up is on (66-75); that ratio is 1 here.
  (d) shuffle the active blocks (1025) and loop over them (1030). For each block: set its timestamp (1038), run `apply` (1041), then stop the whole pass if the elapsed time exceeds `abm_interval * 1000 * abm_time_budget` ms (1029, 1043-1049).
- Inside `apply` (133-261): skip the block if its content cache has no ABM content (141-152). Count objects: this block's active objects, and the 3x3x3 neighbourhood with unloaded neighbours extrapolated (159; countObjects 110-131). Then visit every node in the block (165-167). For a node whose content has due ABMs: skip if its Y is outside the ABM's band (190); roll `myrand() % chance` and skip unless it is 0 (193), so each matching node has a 1/chance chance per run (check neighbours 199-236, skipped in the sketch); call `trigger` with the node, and with the two object counts (242-244). The trigger's 3-argument form is an empty virtual in the base class (blockmodifier.h 50), so the work is the 5-argument call.
- Phase: at registration each ABM's timer starts at a random integer in a window of about +-0.51 times its interval, clamped to +-60 s (blockmodifier.cpp 17-26; the float `MYMAX` result is stored in an int, so the fraction is dropped). For a 10 s ABM the start phase is an integer from -5 to 5 (reading; not run).
- Tick: no per-frame loop for ABMs. The pass is the tick; it does not run on frames that do not reach the accumulator.

## 2. Key functions

- `ABMHandler::apply`: `/mnt/frankendom-donors/luanti-org-luanti/src/server/blockmodifier.cpp` 133-261. The per-block scan: content cache, density count, the per-node Y band, the 1/chance roll, the trigger call.
- `ABMHandler::ABMHandler`: same file 39-102. Per-ABM timer with one-interval subtraction; chance kept; content id map.
- `ABMHandler::countObjects`: same file 110-131. Block count and 3x3x3 neighbourhood with extrapolation (129).
- `ServerEnvironment` ABM pass: `/mnt/frankendom-donors/luanti-org-luanti/src/serverenvironment.cpp` 1005-1058. Cadence gate, two shuffles, handler build, time budget break.
- `IntervalLimiter::step`: `/mnt/frankendom-donors/luanti-org-luanti/src/util/numeric.h` 429-436. Accumulator gate, one interval removed per true return.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed pass cadence from an accumulator, one pass per call | `abm_interval` default 1.0 s (defaultsettings.cpp 498, theirs); setting range 0.1-30 (settingtypes.txt 2350) |
| Per-ABM timer, due when it reaches its own interval, one interval removed | Lua `interval` default 10 s (s_env.cpp 227, theirs); devtest examples use 10 (chances.lua 22, 48; test values only) |
| Per-pass compute budget, checked after each block | `abm_time_budget` default 0.2 (defaultsettings.cpp 499, theirs), so 200 ms per pass at the default 1.0 s pass (budget formula 1029) |
| Chance roll 1 in N per matching node per run | Lua `chance` default 50 (s_env.cpp 230, theirs); devtest examples chance 5 and 20 (chances.lua 23, 49; test values) |
| Y band per rule | Lua `min_y` default INT16_MIN and `max_y` default INT16_MAX (s_env.cpp 236-240, theirs) |
| Density signal: block count plus 3x3x3 neighbourhood, unloaded parts extrapolated | 27-block neighbourhood (blockmodifier.cpp 128, theirs) |
| Catch-up divisor for a long-unattended block | `catch_up` default true (s_env.cpp 233, theirs), but it divides by 1 at this call site (see section 6) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (ABM timers, shuffles, per-block density count, per-node Y band and 1/chance roll, time budget after each block), and omits the content-id cache, the required and without-neighbour checks, the node-changed break, the orphan check, the object recount after an ABM adds objects, the simple catch-up (a no-op at this call site), and the LBM path. It also uses one object number per block for both counts; the donor uses active objects for the block and all stored objects for the neighbourhood. The initial phase is a plain random integer in the donor's window, and the centre block is always present in the donor so the divisor is at least 1; the sketch guards that case instead.

```ts
// Licence: LGPL-2.1-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Abm {
  triggers: Set<string>;       // node contents this ABM watches
  interval: number;            // seconds between runs (donor default 10)
  chance: number;              // 1 in N per matching node per run
  minY: number;
  maxY: number;
  timer: number;               // seconds; starts with a random phase offset
  run(y: number, objectsInBlock: number, objectsWider: number): void;
}

interface Cell { content: string; y: number; }

interface Block {
  cells: Cell[];
  objectCount: number;                  // objects in this block
  neighbourObjects: (number | null)[];  // 27 entries (3x3x3 incl. centre); null = not loaded
}

// Random start phase so ABMs registered together do not all fire on the same pass.
function initTimer(interval: number, rnd: () => number): number {
  const itv = Math.max(0.001, interval);
  const lo = Math.trunc(Math.max(-0.51 * itv, -60));
  const hi = Math.trunc(Math.min(0.51 * itv, 60));
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

function shuffle<T>(xs: T[], rnd: () => number): void {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
}

// Density signal handed to every trigger: this block, and the 3x3x3 neighbourhood with unloaded parts extrapolated.
function countObjects(b: Block): [number, number] {
  let wider = 0;
  let unknown = 0;
  for (const n of b.neighbourObjects) {
    if (n === null) unknown++;
    else wider += n;
  }
  const known = b.neighbourObjects.length - unknown;
  if (known > 0) wider += Math.floor((unknown * wider) / known);
  return [b.objectCount, wider];
}

// One pass. Called when the pass accumulator reaches passInterval (donor: abm_interval, default 1.0 s).
function abmPass(abms: Abm[], blocks: Block[], passInterval: number, budgetRatio: number,
                 rnd: () => number, nowMs: () => number): void {
  // each ABM adds one pass to its timer; it is due when the timer reaches its interval, and one interval is removed
  const due: Abm[] = [];
  for (const a of abms) {
    a.timer += passInterval;
    if (a.timer < a.interval) continue;
    a.timer -= a.interval;
    due.push(a);
  }
  shuffle(due, rnd);
  shuffle(blocks, rnd);

  const budgetMs = passInterval * 1000 * budgetRatio;
  const start = nowMs();
  for (const b of blocks) {
    const [inBlock, wider] = countObjects(b);
    for (const cell of b.cells) {
      for (const a of due) {
        if (!a.triggers.has(cell.content)) continue;
        if (cell.y < a.minY || cell.y > a.maxY) continue;
        if (Math.floor(rnd() * a.chance) !== 0) continue; // 1 in chance per matching node per run
        a.run(cell.y, inBlock, wider);
      }
    }
    if (nowMs() - start > budgetMs) break; // time budget spent: remaining blocks wait for the next pass
  }
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population engine logic; the rule numbers are zone data). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The per-pass time budget is the server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3), not a separate row.
- Reuse tag: rewrite-from-idea (LGPL-2.1-or-later; clean-room shape only, no line-by-line translation)
- Brief rule served: 1 (the server runs the pass; clients do not choose spawns); zones as data for the rule numbers.
Best transferable idea: run spawn rules on a fixed server pass with per-rule timers, shuffled order, a density count handed to each rule, and a time budget that defers the rest of the zones to the next pass.
Decision (proposed): adapt — take the pass cadence, per-rule timer and the time budget, which give Frankendom a per-tick NPC budget; adapt the density count to cap spawns per zone; reject the 1-in-N roll per matching anchor as the spawn rate, since it makes density scale with the number of anchors, and reject the no-op catch-up.
Acceptance: a server test: a zone rule with interval 10 s runs at most once per 10 s of server time; with a 200 ms budget, a pass over N zones stops early and the unvisited zones run on the next pass; the rule receives the zone's count and its neighbourhood count so it can refuse a spawn over the cap.

## 6. Gaps and risks

- The donor ships no spawn rule (games/devtest ABMs only swap test nodes). Its only signal is the count pair handed to a rule (serverenvironment.cpp 1014 sends counts to the trigger via s_env.cpp 447-448), and nothing in builtin/ or games/ reads it. A cap must be written by Frankendom; the donor gives only the density number.
- Per-node chance roll (blockmodifier.cpp 193): the spawn rate multiplies with the number of matching nodes in a block. Frankendom's zones need explicit caps and anchors, so the roll should be per anchor or per zone, not per node.
- Catch-up is a no-op here. The Lua `catch_up` flag defaults to true (s_env.cpp 233), and the divisor `actual_interval / trigger_interval` (blockmodifier.cpp 67) is 1 because timers are on at the one call site (58). Do not copy this as a feature.
- Timer remainder (blockmodifier.cpp 57) is subtracted once per run, not reset. An ABM whose interval is shorter than the pass interval runs once per pass and its timer grows without bound (reading of 54-58 against the 1.0 s pass; not run). Frankendom should clamp the pass interval to at most the shortest rule interval, or reset on run.
- The time budget (serverenvironment.cpp 1029, 1045-1049) is checked only after a whole block, and the order is re-shuffled each pass, so fairness is in expectation, not per zone. Fine for a tick budget; say so in the parity note.
- Donor is C++ engine code with Lua callbacks; Frankendom's rules must stay in the one engine (TypeScript). The shape transfers, the code does not.
- Licence is LGPL-2.1-or-later: clean-room shape only. The sketch is written from the described mechanism.
