# clockworklabs-SpacetimeDB (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/server-csharp/Lib.cs` | Licence: Business Source License 1.1 (LICENSE.txt: Licensor Clockwork Laboratories, Inc.; Licensed Work SpacetimeDB 2.12.0; Change Date 2031-10-08, then AGPL-3.0 with a linking exception; production use limited by the Additional Use Grant). Treat as unclear: clean-room, shape only. I did not check whether the demo folder has its own licence file. | C# (SpacetimeDB module) | symbol `SpawnFood`

Checked: `SpawnFood` (511-540), the table/timer declarations (7-9, 72-120), `Init` (126-143), `DestroyEntity` (455-460), `Respawn`/`SpawnPlayerInitialCircle` (199-232) read in full; the Rust twin (`server-rust/src/lib.rs` 540-555 and 137-145) confirms the same constants. `grep` shows `SpawnFood` is referenced only by its own declaration and the timer table; that nothing else (for example a client) can call a scheduled reducer is a SpacetimeDB platform rule I did not read. The platform's scheduler (fixed-rate vs fixed-delay, first-fire time) is NOT read. Confidence: high on the spawn director, which is small; this is a food top-up, not a monster spawner, and it has no despawn or grace timer.

## 1. Mechanism

- One scheduled row drives population: a `spawn_food_timer` row with a repeat interval of 500 ms is inserted once in the module's init reducer (135-138). The platform calls the `SpawnFood` reducer each time it fires. The same init also schedules the movement tick every 50 ms (139-142) and a decay tick every 5 s (131-134); so the world has three independent timers, not one master loop.
- Each wake of `SpawnFood` (511-540): (a) if there are no players at all, return (513-516); (b) read the arena size from a config row (518); (c) count the existing food rows (521); (d) `while count < TARGET`: pick a random mass in [FOOD_MASS_MIN, FOOD_MASS_MAX) (524; the Rust twin uses a half-open range, 551; the C# `Range` semantics are not read), compute a radius from the mass, pick x and y uniformly in [radius, world - radius] so the whole body stays inside (526-527), insert the entity row (528-532) and a marker `food` row (533-536), and bump the local count (537).
- There is no respawn queue and no per-item timer. Respawn is implicit: when food is eaten, `ConsumeEntity` calls `DestroyEntity` (451) which deletes the marker row (457); the next 500 ms wake sees the count below the cap and refills the gap. Worst-case gap before a refill is the interval.
- Players are separate: a dead player calls the `Respawn` reducer himself (199-205) and is placed at a uniformly random point in the arena (218-232). No safe-zone check was found in that function.
- "Idle zone" rule is crude: with zero players the director returns and creates nothing, but it does NOT remove what exists, and there is no grace timer.
- Tick: the movement reducer `MoveAllPlayers` is scheduled every 50 ms (141), i.e. a 20 Hz step for all players in one transaction. Whether the platform fires it at a fixed rate or fixed delay is not read; there is no accumulator in the module code I read (the first 20 lines of `MoveAllPlayers` only).

## 2. Key functions

- `SpawnFood`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/server-csharp/Lib.cs` 510-540. Top-up to cap, skip when empty.
- `Init`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/server-csharp/Lib.cs` 126-143. Schedules the three repeating timers; world size 1000.
- `DestroyEntity`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/server-csharp/Lib.cs` 455-460. Deletes the marker row, which lowers the count the director sees.
- `SpawnPlayerInitialCircle` and `Respawn`: `/mnt/frankendom-donors/clockworklabs-SpacetimeDB/demo/Blackholio/server-csharp/Lib.cs` 199-232. Player placement at a random arena point.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Director wakes on an interval, counts what exists, fills up to a cap | Cap 600 (theirs, 9); interval 500 ms (theirs, 137) |
| Respawn = deleting an object; the director refills the gap | None |
| Do nothing while nobody is in the zone | None |
| Uniform random placement with the body radius as a margin | World 1000 (theirs, 130); mass 2 to 4 (theirs, 7-8) |
| Separate timers for separate jobs (spawn, move, decay) | Movement 50 ms (theirs, 141), decay 5 s (theirs, 133) |

## 4. TypeScript sketch

simplified: the sketch keeps the wake, the empty-zone return, the count, the fill loop and the in-bounds random position. It omits the database tables, the scheduler (the caller owns the timer), the second table that marks food, the real radius function (a placeholder is used), and the entity-vs-circle split. It does NOT add a per-wake spawn limit, a grace timer, per-species caps or safe-spawn checks, none of which the donor has; they are listed in section 6.

```ts
// Licence: BSL-1.1 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ZoneSpawnData {
  cap: number;               // target population (donor: 600 food)
  intervalMs: number;        // how often the director wakes (donor: 500)
  worldSize: number;         // square arena side
  massMin: number;           // spawn size range, min inclusive
  massMax: number;           // max exclusive in the Rust twin
}
interface Spawned { id: number; x: number; y: number; mass: number }
interface ZoneState { population: Spawned[]; playersPresent: number; nextId: number }

const radius = (mass: number): number => Math.sqrt(mass); // placeholder; donor has its own MassToRadius (not read)

// One wake of the spawn director. Pure top-up: no per-type timers, no respawn queue.
function spawnTick(z: ZoneState, d: ZoneSpawnData, rng: () => number): Spawned[] {
  if (z.playersPresent === 0) return [];               // idle zone: do nothing
  const made: Spawned[] = [];
  while (z.population.length < d.cap) {                // fill to the cap in one wake
    const mass = d.massMin + Math.floor(rng() * (d.massMax - d.massMin));
    const r = radius(mass);
    const s: Spawned = {
      id: z.nextId++,
      x: r + rng() * (d.worldSize - 2 * r),           // keep the whole body inside the arena
      y: r + rng() * (d.worldSize - 2 * r),
      mass,
    };
    z.population.push(s);
    made.push(s);
  }
  return made;
}

// Death and consumption just delete rows; the next wake refills. That is the whole respawn rule.
function remove(z: ZoneState, id: number): void {
  z.population = z.population.filter(p => p.id !== id);
}

```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (engine logic for zone population), with `cap`, `intervalMs`, and the size or tier range as zone data fields (`src/fight/` is not the home: the Lead ruling puts zone population in the server file). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with grace timer).
- today: not mapped to a current file in this pass (not read).
- Reuse tag: rewrite-from-idea (BSL-1.1; clean-room only)
- Brief rule served: 4 (zones are data on one runtime); rules 7-9 n/a

Best transferable idea: respawn needs no queue; one interval director counts what the zone holds and tops it up to the cap, so removing an enemy IS the respawn request.

## 6. Gaps and risks

- BSL-1.1: clean-room only; the sketch is written from the described mechanism, shape only.
- No grace timer and no despawn-on-empty. Row 23 asks for both; the donor only pauses spawning when nobody is online. Frankendom must add a timer that despawns after the zone has been empty for `grace s`.
- Whole-gap fill in one wake: after a big kill the zone repopulates instantly at the next wake. For fights that is a spawn burst; Frankendom needs a per-wake cap and a per-spawn respawn delay (zone data `respawn s`) so cleared packs stay cleared long enough to feel earned.
- Respawn delay is the interval, not a per-kill timer, so a hunted area refills at the same rate for all kills. Fine for ambient population, wrong for named elites.
- No spawn chance, no coverage (spread across the zone), no distance-from-player check: spawns can appear on top of the player. Row 23 lists "spawn chance" and "coverage" as zone data; add them.
- Random numbers come from the platform's per-call RNG (`ctx.Rng`, 520). Server-verified fights and a replayable record need a seeded source.
- The three-timers structure (spawn 500 ms, move 50 ms, decay 5 s) conflicts with "one engine": in Frankendom these would be sub-steps of one fixed-step server tick (row 18 / post-K item 3: "server tick: fixed step, input intake, per-tick NPC budget"), not separate schedulers.
