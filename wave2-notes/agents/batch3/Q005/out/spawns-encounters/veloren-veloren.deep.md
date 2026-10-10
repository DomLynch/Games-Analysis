# veloren-veloren (spawns-encounters, cell 5)

Donor: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/architect.rs` | Licence: GPL-3.0 (LICENSE file, GNU General Public License version 3) | Rust | symbol `architect_tick`

Checked: Symbol `architect_tick` at architect.rs 55 (read in full, with the rest of the file: lines 1-615 across five reads). Read in full too: `rtsim/src/data/architect.rs` (158 lines), the wanted-count function `wanted_population` in `rtsim/src/generate/mod.rs` 26-82 and its call at 156, the tick function in `rtsim/src/lib.rs` 314-335, the cleanup rule `rtsim/src/rule/cleanup.rs` 1-80, and the chunk load/unload hooks `server/src/rtsim/mod.rs` 200-240. Partly read: `server/src/rtsim/tick.rs` 470-535 (the system header and the call to `rtsim.state.tick`). Not read: `rtsim/src/rule/migrate.rs` beyond the grep excerpt at 189-200 (the recount on load); the scheduler that decides how often the `rtsim::tick` system runs (I assume once per server tick, not read); the wall-clock rate of in-game time. Confidence: high on the ledger, the queue, the budget and the order of operations (all read); medium on the real-time pacing (not read).

Best transferable idea: a zone director keeps one count per kind of living NPCs plus NPCs still waiting to respawn, puts each death in a FIFO of tickets, and replaces a death only after a delay, with a per-run budget, a drop when the kind is over cap, and placement only where no player is present.
Decision (proposed): adapt. Why: the ledger-plus-ticket shape is what zone population needs, but Veloren's caps come from world generation, its delay is in in-game days, and its monster placement ignores loaded areas (TODO), so each of those has to change for Frankendom.
Acceptance: a server test in a zone with cap 6 and respawn 90 s asserts that after all 6 die with no player inside the zone radius, none are alive at once, the first replacement appears no earlier than 90 s after its death, no replacement appears within the radius of a standing player, and living plus waiting never exceeds 6.

## 1. Mechanism

- Two data structures. `Architect.deaths` is a queue of `Death` tickets (body, role, faction, time), serialised with the world (data/architect.rs 137). `Architect.population` is a per-kind ledger that counts living NPCs plus tickets waiting to respawn (data/architect.rs 91-126, with `wanted_population` as the target per kind).
- A real death only adds a ticket at the back of the queue (`on_death`, architect.rs 45-53 calls data/architect.rs 149-157, `push_back`). The ledger is not changed by the death. The dead actor is later removed from the world by the cleanup rule (cleanup.rs 33-45), which does not touch the ledger.
- The director is `architect_tick`. It runs only when the rtsim tick counter is a multiple of 32 (architect.rs 27, 56). The tick counter goes up by one on each rtsim tick call (rtsim/src/lib.rs 326).
- Step 1, budget: `count_to_spawn` starts at a random value from 1 to 19 (architect.rs 65).
- Step 2, refill: for each kind whose ledger count is below its wanted count (architect.rs 71), it pushes `deficit` backdated tickets onto the front of the queue, each dated one in-game day back so that it is due at once (209, 215, 217). It increments the ledger by one for each ticket (215) and adds the whole deficit to the budget (220).
- Step 3, drain, while budget is above zero and tickets remain (227):
  - If the kind is over its cap, drop the ticket and decrement the ledger (229-232). The budget is not spent.
  - If the ticket is not yet one in-game day old, put it back at the front and stop the run (237-240).
  - Otherwise call `spawn_npc` (242). Success spends one unit of budget (243). Failure keeps the ticket in a list (245).
- Step 4: failed tickets go back to the front of the queue in their original order (249-251).
- `spawn_npc` places the replacement, in this order:
  1. If the ticket has a faction that still exists: pick a random site of that faction that is not loaded (432). If none, the call fails. There is no fallback to other placement in this call.
  2. Civilised, no faction: `spawn_profession`. Pirate captains go to pirate-hideout plots at sites with no captain already (captain check in the closure, 373-420). Other civilians go to house plots at sites that are not loaded (345, `spawn_at_plot`, 329-372). A random pair is chosen.
  3. Wild birds: a random site that is not loaded and whose site kind matches the species (495, filter 462-516).
  4. Monsters: up to 30 random chunks (553) that pass a species filter (518-550: per species, for example cold, hot and dry, high altitude, humid, or not underwater; fish and crustaceans underwater; dragons and some flyers anywhere). There is no loaded-chunk check here (TODO at 560).
  5. If still not placed and the ticket is older than 5 in-game days (586): civilians try `spawn_profession` again and then `spawn_anywhere`; wild and monster tickets go straight to `spawn_anywhere`. `spawn_anywhere` tries 30 random non-underwater chunks (321, 307), then one unconditional try (326). Once this fallback runs, `spawn_npc` returns true whatever happened.
- Startup: the wanted counts are computed at world generation (generate/mod.rs 156). On load, the ledger is rebuilt by counting the NPCs in the world (migrate.rs 189-200, read only in the grep excerpt). The ticket queue is persisted and the ledger is not (data/architect.rs 137, 140-141).

## 2. Key functions

- `architect_tick`: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/architect.rs` 55-252. Budget, refill, drain, re-queue.
- `spawn_npc`: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/architect.rs` 421-615. Placement order and the five-day fallback (586-605).
- `spawn_anywhere`: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/architect.rs` 289-327. Thirty tries, then one unconditional try.
- `spawn_at_plot`: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/architect.rs` 329-372. Random plot in an unloaded site.
- `Population::on_death` / `on_spawn`: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/data/architect.rs` 113-123 (saturating decrement and increment).
- `wanted_population`: `/mnt/frankendom-donors/veloren-veloren/rtsim/src/generate/mod.rs` 26-82. Targets per kind, derived from plots, hideouts, chunk count and fixed counts.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ledger counts living plus waiting per kind; a death keeps its slot | None (the rule) |
| Refill: deficit becomes tickets due at once, and the whole deficit is spent this run | Refill tickets dated back one in-game day (theirs, architect.rs 209) |
| Per-run budget: random 1 to 19 plus deficits | `random_range(1..20)` (theirs, architect.rs 65) |
| Director runs every 32 rtsim ticks | `ARCHITECT_TICK_SKIP` = 32 (theirs, architect.rs 27) |
| A ticket may be replaced only after one in-game day | `MIN_SPAWN_DELAY` = 60 x 60 x 24 = 86400 in-game seconds (theirs, architect.rs 29; one day is 3600 x 24 in `TIME_FACTOR`, common/src/resources.rs 16) |
| After 5 in-game days, a ticket may spawn anywhere | `MIN_SPAWN_DELAY * 5.0` (theirs, architect.rs 586) |
| Placement attempts | `RESPAWN_ATTEMPTS` = 30 (theirs, architect.rs 32) |
| Cap per settlement | Guards = plots / 4; adventurers = plots / 5; others = remainder; merchants = plots / 6 + 1 (theirs, generate/mod.rs 37-45) |
| Cap per pirate hideout | 1 captain and 10 pirates (theirs, generate/mod.rs 57-58) |
| Cap for wild birds | chunks / 2^16 rounded up, then / 8 rounded up for each of 8 kinds (theirs, generate/mod.rs 62-64) |
| Cap for other monsters | chunks / 2^13 clamped to 5..1000 (theirs, generate/mod.rs 78) |
| Presence gate | Site is "loaded" when its loaded-chunk count is above zero (theirs, data/site.rs 69; server/src/rtsim/mod.rs 212). Applied to civilians and birds only |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (refill tickets first, then the budget loop: drop over-cap tickets, stop at the first ticket that is not due, spawn, re-queue failures). It omits the faction-first and profession-specific placement (all inside `spawnAt`), the 30-try chunk search, biome filters, the migration recount, the per-kind death-time decay and the ECS tick driver. It also makes the refill spend the whole deficit in one run, as the donor does, which Frankendom should cap. Constants are in-game seconds.

```ts
// Licence of donor: GPL-3.0. Clean-room sketch written from the described mechanism, not a translation of the donor lines.

interface Ticket {
  kind: string;    // population type, e.g. "guard"
  diedAt: number;  // in-game seconds at death (refill tickets are backdated so they are due at once)
}

interface Director {
  wanted: Map<string, number>;   // cap per kind (zone data in Frankendom)
  counted: Map<string, number>;  // living NPCs plus tickets still waiting; a death keeps its slot
  queue: Ticket[];               // index 0 is next; deaths are appended at the back
  now: number;                   // in-game seconds
  random: () => number;          // returns 0 <= x < 1
}

const RUN_EVERY_TICKS = 32;
const RESPAWN_DELAY_S = 86400;                 // one in-game day
const FALLBACK_AFTER_S = 5 * RESPAWN_DELAY_S;  // after this age the ticket spawns anywhere

// A death does not change the ledger. The slot stays counted until its ticket is spawned or dropped.
function onDeath(d: Director, kind: string, now: number): void {
  d.queue.push({ kind, diedAt: now });
}

function runDirector(
  d: Director,
  tick: number,
  spawnAt: (t: Ticket) => boolean,     // preferred place; presence gating happens inside
  spawnAnywhere: (t: Ticket) => void,  // last resort after FALLBACK_AFTER_S
): void {
  if (tick % RUN_EVERY_TICKS !== 0) return;

  let budget = 1 + Math.floor(d.random() * 19);  // 1..19 per run

  // Refill: each kind below its cap gets backdated tickets at the front; the whole deficit is added to this run's budget.
  const refill: Ticket[] = [];
  for (const [kind, want] of d.wanted) {
    const have = d.counted.get(kind) ?? 0;
    const deficit = want - have;
    if (deficit <= 0) continue;
    for (let i = 0; i < deficit; i++) {
      refill.push({ kind, diedAt: d.now - RESPAWN_DELAY_S });
    }
    d.counted.set(kind, want);
    budget += deficit;
  }
  d.queue = [...refill, ...d.queue];

  // Drain: drop over-cap tickets, stop at the first ticket that is not due, spawn the rest.
  const failed: Ticket[] = [];
  while (budget > 0 && d.queue.length > 0) {
    const t = d.queue.shift() as Ticket;
    const have = d.counted.get(t.kind) ?? 0;
    if (have > (d.wanted.get(t.kind) ?? 0)) {
      d.counted.set(t.kind, have - 1);
      continue;
    }
    if (t.diedAt + RESPAWN_DELAY_S > d.now) {
      d.queue.unshift(t);
      break;
    }
    let ok = spawnAt(t);
    if (!ok && d.now - t.diedAt > FALLBACK_AFTER_S) {
      spawnAnywhere(t);
      ok = true;
    }
    if (ok) budget -= 1;
    else failed.push(t);
  }
  d.queue = [...failed, ...d.queue];  // failed tickets keep their order at the front
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the director, ledger and ticket queue; numbers come from zone data).
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The per-run budget is the "per-tick NPC budget" sub-line under server tick (row 18 / post-K item 3); it is not a separate row.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: zones as data (caps and delays per zone) and one ledger (one count per kind, updated in one place); row 23 spawn caps and respawn.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and was checked against the donor by reading, not by copying.
- Caps are derived from world generation (plots, hideouts, chunk count), not authored per zone. For Frankendom, keep only the shape: cap per kind as a zone data field. Do not port the formulas.
- Placement is not presence-gated everywhere. The monster branch and `spawn_anywhere` ignore loaded chunks (TODOs at architect.rs 304 and 560). A Frankendom respawn must never land in a zone area where a player stands, for every kind.
- Despawn with a grace timer (row 23) is not in the donor. The cleanup rule removes dead NPC actors (cleanup.rs 33-45) and nothing removes a live NPC when a zone empties. The grace timer must be designed fresh and tested. Do not claim this part is covered by the donor.
- A large deficit is spent in one run because the whole deficit is added to the budget (architect.rs 220). A zone that resets with many missing mobs would spawn them in one burst. Frankendom should cap spawns per run (as an engine constant) and let the rest wait.
- Delays are in in-game time (a day at 3600 x 24 units) and the real-time pacing was not read. Frankendom's respawn and grace values should be real seconds as zone data, not in-game days.
- Ordering: the queue is FIFO by death time, but a ticket that cannot be placed goes to the failed list and the loop moves on to the next ticket. A faction ticket with no free site is retried every run until the five-day fallback (architect.rs 432, 586). It does not block other tickets, but it does hold a slot in the ledger for up to five in-game days. Frankendom needs one explicit rule for this.
- Server-verified kills: the director changes the ledger on the death event. Frankendom must make the death server-verified before the ledger changes (one ledger, server-verified kills).
