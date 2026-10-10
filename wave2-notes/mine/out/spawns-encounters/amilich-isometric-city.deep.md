# amilich-isometric-city (spawns-encounters, cell 4)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/components/game/vehicleSystems.ts` | Licence: MIT (LICENSE: "MIT License, Copyright (c) 2025 amilich"; code may be adapted with the notice) | TypeScript | symbol `spawnCrimeIncidents`

Checked: `spawnCrimeIncidents` read 505-573 in full; `updateCrimeIncidents` read 575-598 in full; dispatch cap at 682 and responder timing at 742 seen by line only (the response loop 676-810 was read only in part). Not read: `spawnPedestrian`, the boat, train and aircraft spawners, the rest of `spawnRandomCar`. Confidence: high on the spawn rule and the lifetime; medium on responders. Depth: full for the spawner, thin for the response side. Note: an earlier reader filed this cell PARTIAL because the donor has no enemy that fights back; that is the wrong test, the director itself is a real, self-contained mechanism.

Best transferable idea: scale how much can go wrong with how much there is to lose (population), and scale how likely it is with how weak the local protection is, using one capped, timer-gated director.

## 1. Mechanism

- A director, not a spawn list. It runs once per frame with the frame delta (`CanvasIsometricGrid.tsx` 2424) and does nothing until its timer expires (510-513).
- Timer: `timer -= delta x speedMultiplier` (510), where the multiplier is 1, 2 or 3 for the three game speeds (509). When it passes zero it is re-armed to 3 + random(0..2) seconds (513), so attempts come every 3 to 5 game-seconds.
- Eligible places: every grid tile that holds a real building with people or jobs in it (the loop ends at 530, where each eligible tile is stored with its police coverage value). The loop visits the whole grid each attempt.
- Chance gate: average police coverage over all eligible tiles picks a base chance: under 20 gives 0.4, under 40 gives 0.25, under 60 gives 0.15, otherwise 0.08 (537-538).
- Cap: at most `max(2, floor(population / 500))` incidents may exist at once (541). If the live count has reached the cap the attempt ends (543).
- Roll: one attempt spawns 1 incident, or 2 with probability 0.3 (545). For each, stop if the cap is reached (548), then give up with probability `1 - baseChance` (549).
- Placement: from the eligible tiles keep each with probability `max(0.1, 1 - coverage/100)` (554), so weakly protected tiles are chosen far more often than well protected ones, but never less than 1 in 10. A random survivor is the target (560); tiles already holding an incident are skipped.
- Type and lifetime: the incident type is drawn by weight and gets a per-type duration, default 20 s (`incidentData.ts` 523, 653). `updateCrimeIncidents` counts each one down by `delta x speedMultiplier` (586) and deletes it at zero; an incident that a responder has claimed does not count down (584).
- Responders: dispatch is capped per check at `max(3, min(6, stations x 2))` (682); the nearest unit resolves an incident after 5 seconds on scene (fire trucks 8) (742).

## 2. Key functions

- `spawnCrimeIncidents`: `src/components/game/vehicleSystems.ts` 505-573. Timer gate, coverage-scaled chance, population cap, weighted placement.
- `updateCrimeIncidents`: same file 575-598. Lifetime countdown, paused while claimed.
- Dispatch / response: same file 676-810 (read in part). Cap per check (682), on-scene time (742).
- `getRandomCrimeType`, `getCrimeDuration`: `src/components/game/incidentData.ts` 521-530, 652-654.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Timer-gated director: do nothing until a random 3-5 s timer expires, then re-arm | 3 + random(0..2) s (theirs, 513); speed multipliers 1/2/3 |
| Cap scales with how much there is to lose | population / 500, floor 2 (theirs, 541) |
| Chance steps down with the average strength of local protection | 0.4 / 0.25 / 0.15 / 0.08 at coverage 20 / 40 / 60 (theirs, 538) |
| Placement weighted toward weakly protected places, with a floor so no place is safe | weight `max(0.1, 1 - coverage/100)` (theirs, 554) |
| Occasional double spawn | 30% chance of 2 (theirs, 545) |
| Incident lifetime per type; paused while a responder is on it | default 20 s (theirs, incidentData 653) |

## 4. TypeScript sketch

simplified: the grid scan is replaced by a plain list of zone cells with a protection value; no building filter, no speed multiplier, no incident types, no responders. The caller owns the clock and the random source so the step is testable.

```ts
// Licence: MIT (donor). Own code written from the described mechanism.
interface Cell { id: string; protection: number } // 0..100
interface Incident { cellId: string; remaining: number }

export interface DirectorConfig {
  cap: (population: number) => number;   // donor: max(2, floor(pop/500))
  chanceByCoverage: (avg: number) => number; // donor: 0.4/.25/.15/.08
  floorWeight: number;                    // donor: 0.1
  doubleChance: number;                   // donor: 0.3
  lifetimeS: number;                      // donor: 20 default
}

export const defaultConfig: DirectorConfig = {
  cap: (p) => Math.max(2, Math.floor(p / 500)),
  chanceByCoverage: (a) => (a < 20 ? 0.4 : a < 40 ? 0.25 : a < 60 ? 0.15 : 0.08),
  floorWeight: 0.1,
  doubleChance: 0.3,
  lifetimeS: 20,
};

export function directorAttempt(
  cells: Cell[], live: Map<string, Incident>, population: number,
  cfg: DirectorConfig, rnd: () => number,
): Incident[] {
  if (cells.length === 0) return [];
  const cap = cfg.cap(population);
  if (live.size >= cap) return [];
  const avg = cells.reduce((s, c) => s + c.protection, 0) / cells.length;
  const base = cfg.chanceByCoverage(avg);
  const made: Incident[] = [];
  const n = rnd() < cfg.doubleChance ? 2 : 1;
  for (let i = 0; i < n; i++) {
    if (live.size + made.length >= cap) break;
    if (rnd() > base) continue;
    const pool = cells.filter(
      (c) => !live.has(c.id) && !made.some((m) => m.cellId === c.id) &&
        rnd() < Math.max(cfg.floorWeight, 1 - c.protection / 100),
    );
    if (pool.length === 0) continue;
    made.push({ cellId: pool[Math.floor(rnd() * pool.length)].id, remaining: cfg.lifetimeS });
  }
  return made;
}
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (engine-side spawns; Lead's ruling) with the numbers as zone data fields in the zone schema: per-zone `cap` rule, `chance` steps by guard/defence strength, placement `floorWeight`, `doubleChance`, `lifetimeS`, `attemptEveryS`. Row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). Here the "population" is the number of players in the zone and "protection" is guard or fort strength; the donor's grace-timer half is not in this file. today: not checked.
- Reuse tag: adapt-ok (MIT; the rule is small enough to write fresh)
- Brief rule served: 4 (zones are data on one runtime), 5 (many-on-one: the cap bounds live threats); rules 7-9 n/a

## 6. Gaps and risks

- The incident is a map marker, not an enemy; nothing in this donor attacks. Frankendom needs the spawned thing to be a real engine entity with its own AI and server-verified kills (the one-ledger rule).
- The grid scan visits every tile on every attempt. Fine for a city sim on one client; a zone with thousands of cells on a server needs the eligible list kept incrementally.
- Average coverage over all eligible tiles steers the chance, which hides a badly guarded corner behind a well guarded centre; the placement weight (554) partly corrects it. Decide whether Frankendom wants a per-zone or per-cell chance.
- The cap scales with population (here: players). With MAX_ATTACKERS = 3 the cap needs a second ceiling per target, since many incidents on one target would break the ruling.
- Randomness is `Math.random()`. Frankendom's server needs a seeded source for replays (row 19).
- Response and resolution (676-810) were read only in part; do not cite the 5 s and 8 s resolve times beyond the lines named.
