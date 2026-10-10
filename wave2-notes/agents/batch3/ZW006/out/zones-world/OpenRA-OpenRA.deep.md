# OpenRA-OpenRA (zones-world, cell 2)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/ActorSpawnManager.cs` | Licence: GPL-3.0 or later (file header: "either version 3 of the License, or (at your option) any later version"; COPYING is GPL v3) | C# | symbol `ActorSpawnManager.Tick`

Checked: Read `ActorSpawnManager.cs` in full (150 lines), `ActorSpawner.cs` in full, `CrateSpawner.cs` in full (221 lines), `MapCreeps.cs` lines 12-60, `Crate.cs` 250-272, `Util.cs` 228-236, `Map.cs` 195 and 1283-1295 plus the `SetBounds` lines from grep, `mods/d2k/rules/world.yaml` 134-144, `mods/d2k/rules/campaign-rules.yaml` 39-46, `OpenRA.Mods.D2k/Traits/Sandworm.cs` 41-58 and 128-150. Callers: `DecreaseActorCount` has one caller (Sandworm, grep over `*.cs`). Not read: the body of `MapCreeps.Created` (line 60 onward, which sets `Enabled`), `MersenneTwister`, the rest of `Sandworm.cs`, `Map.DistanceToEdge`, and the spawn rules of the other d2k maps (pasty-mesa, shellmap, mount-idaho, oasis-conquest were seen only in grep). Confidence: high on the director loop and its order of gates; medium on "only Sandworm decrements" (grep found one caller, but I did not check every mod's YAML). Camera: not a camera cell. Zones-world cell; the parity row is 23 (zone population).

## 1. Mechanism

A world-level director that keeps the number of spawned actors between a minimum and a maximum. It spawns on a randomised timer, picks a spawn point from a set of typed spawner actors, and refills to the minimum in one burst when it is below it.

Setup: `Created` copies `enabled` from `MapCreeps` (80). `TraitEnabled` sets `initialDelay` from config and resets `spawnCountdown` to 0 (86-87).

Order of steps in `ITick.Tick` (90-121):
- (a) Return if the trait is disabled or not enabled (92-93).
- (b) Initial delay: `if (--initialDelay > 0)` returns (95-96). The counter keeps going below zero after it expires, so this gate matters only before the first spawn.
- (c) Maximum gate: return if `Maximum < 1` or `actorsPresent >= Maximum` (98-99).
- (d) Countdown gate: `if (--spawnCountdown > 0 && actorsPresent >= Minimum)` returns (101-102). While the count is below the minimum, the countdown is ignored and the director spawns every tick.
- (e) Pick a spawn point: a random `ActorSpawner` whose type set overlaps the manager's types, or whose set is empty (104; filter 136-143). If there is none, return (106-107). The countdown is not reset, so the next tick tries again.
- (f) Reset the countdown to a random value from `SpawnInterval` (109). With one value it is that value. With two, `Util.RandomInRange` calls `random.Next(range[0], range[1])` (`Util.cs` 228-236).
- (g) Burst (111-120): spawn one actor at the point, pick a new point, and repeat while `actorsPresent < Minimum` (120). Nothing in the loop checks `Maximum`, so a minimum above the maximum overshoots.
- (h) `SpawnActor` (123-134): the actor name is picked uniformly from the `Actors` list (125). Creation is queued to frame end (125-129). `actorsPresent` goes up at once (131). Owner is the player named `Creeps` by default (41, 127).

Removal: `DecreaseActorCount` (145-148) is the only way the count goes down. The one caller seen is the Sandworm's `Disposing` hook (`Sandworm.cs` 141-147, call at 146, with a `disposed` flag checked at 143 and set at 147 that stops a second call). `world.yaml` names only `sandworm` as the spawned actor (135), and the d2k map rules shown by grep set only Minimum and Maximum. Any other spawned type that does not call this hook would keep its slot forever.

d2k data: `world.yaml` 134-136 sets `Actors: sandworm` and `InitialDelay: 9000`. `campaign-rules.yaml` 39-42 sets `Minimum: 0`, `Maximum: 1` (line 41) and `InitialDelay: 5000` (42). I did not trace which of the two wins for a given game (merge order not read).

Also read, not sketched:
- `CrateSpawner` (a second population rule, same donor). A fixed timer (`ticks = info.SpawnInterval`, 119-121). Each firing spawns `max(0, Minimum - crates)` plus one more while `crates < Maximum` and `Maximum > Minimum` (123-124). The crate count goes up and down with each crate entering and leaving the world (`Crate.cs` 258 and 268). A drop cell is a random map cell (178), tried up to 100 times (174-176), accepted only on a ground or water terrain set (182) and with no actor on it (186). Crate kind is a weighted draw with `Next(sum)` (198) and a `<=` test (204), which gives the first entry one extra value out of the range. If `Next(n)` returns 0 to n-1, as usual, the first of two equal shares gets 11 of 20 values, not 10.
- Map bounds: `Map.Bounds` is a rectangle (195). `SetBounds` makes it from the top-left and bottom-right tiles plus one (1135-1139, grep). `ChooseRandomCell` samples inside it and retries until the sample has a cell (1283-1295). I did not look for map streaming and saw none in the files I read.

## 2. Key functions

- `ActorSpawnManager.Tick`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/ActorSpawnManager.cs` 90-121. Full gate order above.
- `GetRandomSpawnPoint`: same file, 136-143. Type filter at 139.
- `SpawnActor`: same file, 123-134. Count goes up at 131.
- `DecreaseActorCount`: same file, 145-148. Only count decrement.
- Sandworm disposal hook (the one caller): `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.D2k/Traits/Sandworm.cs` 141-147.
- Spawn point trait: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/ActorSpawner.cs` (type set only; no logic).
- `CrateSpawner.Tick` / `SpawnCrate` / `ChooseDropCell`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/CrateSpawner.cs` 114-193.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Spawn only while below the maximum, counting live actors | Maximum default 4 (ActorSpawnManager.cs 27, theirs). d2k campaign sets 1 (campaign-rules.yaml 41). |
| Countdown gate, ignored below the minimum | Minimum default 0 (ActorSpawnManager.cs 24, theirs). |
| Initial delay before the first spawn | Default 0 (ActorSpawnManager.cs 30, theirs). d2k sets 9000 (world.yaml 136) and 5000 (campaign-rules.yaml 42). |
| Randomised interval, fixed or in a range | Default 6000 ticks (ActorSpawnManager.cs 34, theirs). |
| Burst to the minimum in one tick | None (the loop). |
| Crate refill: to minimum, plus one while below maximum | CrateSpawner: minimum 1, maximum 255, interval 4500, water chance 20 (CrateSpawner.cs 46, 49, 52, 64, theirs). d2k sets maximum 2 and interval 1500 (world.yaml 137-143). |

## 4. TypeScript sketch

simplified: keeps the donor's gate order (initial delay, maximum, countdown, point pick, countdown reset, burst to minimum), the type filter, the uniform pick from the spawn table, and the count bump at spawn time. Omits: the `IsTraitDisabled` and `enabled` checks, the owner, the frame-end creation (the sketch calls `spawnAt` at once), the `Util.RandomInRange` helper (the sketch uses its own `rand`), and the disposal guard. Reorders: nothing. It does not clamp the maximum either, to match the donor.

```ts
// Licence: GPL-3.0-or-later (donor, OpenRA). Clean-room sketch written from the described mechanism, not a translation.
interface SpawnPoint { x: number; y: number; types: string[]; }

interface SpawnDirectorConfig {
  minimum: number;              // zone data, count
  maximum: number;              // zone data, count
  initialDelay: number;         // zone data, ticks
  spawnInterval: [number] | [number, number]; // zone data, ticks: fixed, or a range
  spawnTable: string[];         // zone data: picked uniformly
  types: string[];              // zone data: which spawn points this director uses
}

class SpawnDirector {
  private initialDelay: number;
  private countdown = 0;
  private present = 0;

  constructor(
    private cfg: SpawnDirectorConfig,
    private points: SpawnPoint[],
    private rand: () => number,   // 0 <= r < 1
    private spawnAt: (name: string, p: SpawnPoint) => void,
  ) {
    this.initialDelay = cfg.initialDelay;
  }

  // Donor order: initial delay, maximum gate, countdown gate, pick point, reset countdown, burst to minimum.
  tick(): void {
    if (--this.initialDelay > 0) return;
    if (this.cfg.maximum < 1 || this.present >= this.cfg.maximum) return;
    if (--this.countdown > 0 && this.present >= this.cfg.minimum) return;

    let point = this.pickPoint();
    if (point === undefined) return; // countdown is not reset, so the next tick tries again

    this.countdown = this.randomInterval();
    do {
      this.spawn(point);
      point = this.pickPoint() as SpawnPoint; // list is unchanged within this tick, so defined
    } while (this.present < this.cfg.minimum);
  }

  // Called by whatever removes a spawned actor. In the donor only one actor type calls it.
  onRemoved(): void {
    this.present--;
  }

  private spawn(p: SpawnPoint): void {
    const name = this.cfg.spawnTable[Math.floor(this.rand() * this.cfg.spawnTable.length)];
    this.present++; // counted now; the actor is created later in the donor (frame end)
    this.spawnAt(name, p);
  }

  private pickPoint(): SpawnPoint | undefined {
    const eligible = this.points.filter(
      (p) => this.cfg.types.some((t) => p.types.includes(t)) || p.types.length === 0,
    );
    if (eligible.length === 0) return undefined;
    return eligible[Math.floor(this.rand() * eligible.length)];
  }

  private randomInterval(): number {
    const r = this.cfg.spawnInterval;
    if (r.length === 1) return r[0];
    return r[0] + Math.floor(this.rand() * (r[1] - r[0])); // upper bound exclusive, as donor Next(min, max) is assumed to be
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/zw006_or_spawn.ts), exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts`, parity-checklist row 23 (zone population: spawn caps, respawn). The donor's director is a population cap with an interval refill and a burst to the minimum. It has no despawn and no grace timer.
- today: not checked. This pass had no access to the Frankendom repo, so I do not know what exists at the target path.
- Reuse tag: adaptable (GPL-3.0-or-later: clean-room, shape only; the sketch was written fresh from the mechanism)
- Brief rule served: zones as data (minimum, maximum, delay, interval, spawn table and types are zone fields); one ledger (the live count must come from the server roster, not from a separate counter)

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room and shape only. The sketch was written from the mechanism, not from the lines.
- Manual counter drift. The count goes down only through a hook, so any removal path that skips it keeps the slot forever. Frankendom should count live server entities per zone instead, so that a kill, a leash or a despawn lowers the count with no extra call.
- No despawn. Row 23's "despawn on empty with a grace timer" is not in this donor. The donor has cap, interval, refill and burst only. Do not cite this file as the source of the grace timer.
- The maximum is not clamped in the burst. If the minimum is above the maximum, the donor overshoots. Frankendom zone loading should reject that combination.
- Retry without rate limit. With no eligible spawn point, the director tries again every tick (the countdown is not reset). A zone with bad spawn data would fail silently. Frankendom should log a zone-data error.
- Ticks, not seconds. The donor counts game ticks. Frankendom's server tick is fixed-step, so the interval should be stored in ticks.
- Crate weighted pick (read, not sketched): `n <= cumulativeShares` at CrateSpawner.cs 204, with `n` from `Next(sum)` at 198, gives the first share one extra value. This matters for loot tables (loot-drops topic), so a Frankendom loot picker should use `<` and a test that counts the frequencies.

Best transferable idea: Keep a zone's live population between a minimum and a maximum by spawning on a randomised interval from typed spawn points, and refilling to the minimum in one burst when it is below.
Decision (proposed): adapt. Take the cap, interval, typed spawn points and minimum burst as zone data for `origins/server/world-spawns.ts`, but count the live server roster instead of keeping a hook-driven counter, because the donor's counter drifts when any removal path skips the hook.
Acceptance: A server test in a zone with maximum 4 and a 600-tick interval kills all 4 creatures and asserts exactly one spawn per interval until the minimum is back, and that the live count never exceeds the maximum; a second test removes one creature by leash and by kill and asserts the count drops by one each time with no extra call.

Reuse tag: adaptable (GPL-3.0-or-later: clean-room, shape only)
Brief rule served: zones as data (minimum, maximum, delay, interval, spawn table and types are zone fields); one ledger (the live count comes from the server roster)

## Checker findings

- Verdict: CLEAN
- Corrected: nothing to correct
- Missed: CrateSpawner has InitialSpawnDelay (default 0; the d2k world.yaml sets 1500; the constructor seeds the timer from it, CrateSpawner.cs near 55), so the note's 'fixed timer ticks = info.SpawnInterval' omits the initial delay; the d2k world.yaml also sets crate WaterChance 0 and a ValidGround list
