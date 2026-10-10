# pmbstyle-L2Solo (spawns-encounters, cell 1)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/SpawnNpcs.js` (with `RemoveNpc.js`, `DayNightSpawnManager.js`, `Generics/NpcDecay.js`, `GameTime.js`) | Licence: Apache-2.0 (repo `LICENSE`, "Apache License Version 2.0, January 2004"; package.json says "SEE LICENSE IN LICENSE") | JavaScript (server) | symbols `spawnNpcs`, `spawnNpc`, `removeNpc`, `changeMode`, `respawnDelayMs`

Checked: The list's hint file `BackgroundResolver.js` is NOT the spawn logic: it is the bot combat and rest resolver (its only death timer is `resolveDeathRecovery` (316: a bot's own 90 s, or 1 s in PvP)). Real mechanism found by grep for spawn/respawn and read end to end: `SpawnNpcs.js` (whole file, 1-301), `RemoveNpc.js` (whole, 1-63), `DayNightSpawnManager.js` (whole, 1-92), `Generics/NpcDecay.js` (whole, 1-252), `GameTime.js` (1-57), `World.js` init (128-152), `SpoilSweep.js` (15, 183-186), `NpcAggro.js` (4, 77-81). Other candidates opened and not used: `PopulationDirector.js` (1-120 of 212; a bot level-histogram director, not NPC spawns). Not read: `RaidBossState.js`, `RaidBoss/RespawnPolicy.js` (raid bosses only), `RaidBossMinionManager`, `npcRewards`, the grid code, `tickLiveActors` (only `armSpawnGrace` read), the spawn data rows (the real respawn, bias and total values were not sampled). Confidence: high on the ordinary NPC row, death, respawn, day/night and corpse paths. Camera: not applicable.

Best transferable idea: a fixed count per spawn row, refilled by a timer started at each death (respawn seconds plus or minus a bias), with the timer dropped if a period revision has changed, and the corpse on its own timer.

Decision (proposed): adapt. Frankendom needs per-row totals and respawn-from-death with jitter plus a stale-timer guard, which this donor has; it has no zone cap, no empty-zone despawn and no presence gate, and its ordinary respawn does not retry, so we take the shape and add those.

Acceptance: Server test: kill 1 of 3 members of a row with respawn 60 s and bias 10 s; a replacement appears between 50 s and 70 s after the death, and if the first spawn call fails the row is full again within 1 s more; switching a day-only row to night with a respawn pending spawns nothing from that old timer.

## 1. Mechanism

- Startup (World.js 128-152): `World.spawnNpcs()` runs before the reaper and the day/night manager start (145, 148, 149). For each row and each spawn entry, the loop runs `spawn.total` times (SpawnNpcs.js 244). A row with explicit coords spawns once per coords entry on each of those passes (246-249), so total x coords-count NPCs; a row with random bounds spawns one per pass (267). Rows with a period are also pushed to `npc.periodDefinitions` (251, 266) for later refill. The mode is set at init (World.js 138).
- Spawn (SpawnNpcs.js 154-166): `spawnNpc` refuses if the row is inactive in the current period (155), picks random coords from the row (156), creates the NPC (`spawnDefinition`, 134-152, which re-checks the period at 135), arms the spawn aggro grace (38, which sets `aggroEligibleAt = now + 10000` ms in NpcAggro.js 77-81), pushes it to `world.npc.spawns` (39), and announces it to sessions within `VISIBILITY_RADIUS` = 6000 (9, 164). No player-presence check happens anywhere on this path.
- Death (RemoveNpc.js 12-53), in this order: (a) the corpse decay is scheduled first with `SpoilSweep.corpseTime` (17, 24); (b) if the row has `respawn > 0` (31; `shouldRespawn` 290), the delay is `respawn` seconds plus or minus `bias` seconds, drawn uniformly, in ms (32; 293-295); the comment at 28-29 says the respawn is measured from the death, not from corpse removal; (c) a plain `setTimeout` (40, no handle kept, no `unref`) fires after the delay, and if `canRespawnDefinition` (6-10) says no, it returns (42), else it calls `this.spawnNpc(this, definition)` (43); a failure is logged once and not retried (45-47); (d) rewards run last, inside a try (52-53). Raid bosses take a different branch (34-38) and are not covered here.
- Day/night (DayNightSpawnManager.js 34-84): one game day is 4 real hours from local midnight (GameTime 1), one game minute is 10 s real time (2), sunrise is game minute 360 (4), and "night" is any game minute below 360 (32). From the constants, night is 1 real hour of each 4-hour cycle and day is 3 hours (computed, not measured). `schedule` sets a timeout to the next transition (67-76; `msUntilTransition` at 73, computed in GameTime 39-44). `changeMode` returns early if the mode is unchanged (37), otherwise bumps `periodRevision` (40), stops every inactive periodic NPC (46), removes them with `decayMany` (47), then spawns one NPC for each periodic definition that is active in the new mode and has no live NPC (presentDefinitions identity check, 51-56), then broadcasts sunrise or sunset. `start` reconciles the mode at boot (78-84).
- Corpse (NpcDecay.js 24-109, 187-243): each corpse gets `corpseDecayAt = now + delay` (32) and a one-shot timer (34). A 1000 ms `setInterval` reaper (3, 221-237) sweeps expired corpses (187-219, test at 197). After 3 failed sweeps (4, 213) a corpse is discarded. Spoiled, sweepable corpses last at least 30000 ms (SpoilSweep.js 15, 185).
- Tick: no fixed-step loop. The respawn is a timeout per death, the corpse is a timeout plus a 1 s interval reaper, and day/night is a timeout chain on the wall clock.

## 2. Key functions

- `spawnNpcs`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/SpawnNpcs.js` 235-275. Fills every row at startup (count loop 244).
- `spawnNpc` and `spawnDefinition`: same file, 154-166 and 134-152. Period gate, coords, creation, grace, grid, announce.
- `respawnDelayMs` and `shouldRespawn`: same file, 289-296. Respawn seconds plus or minus bias, uniform, in ms.
- `removeNpc` (the death handler): `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/RemoveNpc.js` 12-60. Corpse schedule, respawn timer, rewards. `canRespawnDefinition` 6-10.
- `changeMode`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/DayNightSpawnManager.js` 34-65. Revision bump, removal of inactive periodic NPCs, refill of active periodic rows. `schedule` 67-76, `start` 78-84.
- `sweepExpired`, `schedule`, `decay`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/NpcDecay.js` 187-219, 24-48, 50-109.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and data |
|---|---|
| A row holds a fixed count and refills one slot per death | `spawn.total` per row (zone data; the count is the loop bound, SpawnNpcs.js 244) |
| Respawn delay = base +/- uniform jitter, from the death | `spawn.respawn` seconds (zone data; 0 = never, 290) and `spawn.bias` seconds (zone data; default 0, 293-295) |
| A stale respawn timer is dropped after a period flip | `periodRevision` integer, +1 per real mode change (engine, DayNightSpawnManager.js 40) |
| Periodic rows are removed at the flip and refilled at the next | `period` `always` / `day` / `night` per row (zone data; SpawnNpcs.js 63) |
| Corpse leaves on its own clock, independent of respawn | corpse time from the model (not read); spoiled minimum 30000 ms (engine, SpoilSweep.js 15) |
| Reaper sweep interval and retry cap | 1000 ms interval (engine, NpcDecay.js 3); 3 failed sweeps (engine, 4) |
| Day length and sunrise | 4 h day (engine, GameTime.js 1); 10 s per game minute (engine, 2); sunrise at game minute 360 (engine, 4) |
| Spawn aggro grace | 10000 ms (engine, NpcAggro.js 4) |
| Announce radius | 6000 units (engine, SpawnNpcs.js 9) |

## 4. TypeScript sketch

simplified: keeps a count per row instead of NPC objects; drops the corpse timer, the reaper, the grid, the packets, the rewards and the raid-boss path. `fill()` tops a row up to its total in one pass, where the donor spawns one NPC per periodic definition. The 1000 ms retry on a failed spawn is a Frankendom addition: the donor's ordinary respawn only logs the failure (RemoveNpc.js 45-47), while its raid-boss path does retry (SpawnNpcs.js 125-127). The jitter formula has the donor's shape, clamped at zero. The stale-timer rule is applied to periodic rows only, as the donor's `canRespawnDefinition` does. Timers are injected through `Host`, so the file has no clock.

```ts
// Licence: Apache-2.0 (donor LICENSE). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Period = 'always' | 'day' | 'night';
type Mode = 'day' | 'night';

interface SpawnRow {
  id: number;
  total: number;      // members the row keeps alive in the zone (count)
  respawnS: number;   // seconds after a death before a member returns; 0 = never (s)
  biasS: number;      // uniform jitter, +/- seconds (s)
  period: Period;
}

interface Host {
  after(ms: number, fn: () => void): void; // timer
  spawnOne(rowId: number): boolean;        // false = the spawn failed, no member made
  rand(): number;                          // uniform in [0, 1)
}

class ZonePopulation {
  private mode: Mode = 'day';
  private revision = 0;
  private alive = new Map<number, number>();
  private rows = new Map<number, SpawnRow>();

  constructor(rows: SpawnRow[], private host: Host) {
    for (const r of rows) {
      this.rows.set(r.id, r);
      this.alive.set(r.id, 0);
    }
    for (const r of rows) this.fill(r, this.revision);
  }

  private isActive(row: SpawnRow): boolean {
    return row.period === 'always' || row.period === this.mode;
  }

  private count(id: number): number {
    return this.alive.get(id) ?? 0;
  }

  private delayMs(row: SpawnRow): number {
    const seconds = Math.max(0, row.respawnS);
    const bias = Math.max(0, row.biasS);
    return Math.max(0, Math.round((seconds - bias + this.host.rand() * bias * 2) * 1000));
  }

  // Tops a row up to its total. A failed spawn is retried after 1 s (a Frankendom addition;
  // the donor's ordinary respawn only logs the failure).
  private fill(row: SpawnRow, rev: number): void {
    while (this.isActive(row) && this.count(row.id) < row.total) {
      if (!this.host.spawnOne(row.id)) {
        this.host.after(1000, () => {
          if (rev === this.revision) this.fill(row, rev);
        });
        return;
      }
      this.alive.set(row.id, this.count(row.id) + 1);
    }
  }

  onDeath(rowId: number): void {
    const row = this.rows.get(rowId);
    if (!row) throw new Error(`unknown row ${rowId}`);
    this.alive.set(rowId, Math.max(0, this.count(rowId) - 1));
    if (row.respawnS <= 0) return; // respawn 0 = this row never respawns
    const rev = this.revision;
    this.host.after(this.delayMs(row), () => {
      // a periodic row's timer from an older period revision is dropped
      if (row.period !== 'always' && rev !== this.revision) return;
      if (!this.isActive(row)) return;
      this.fill(row, rev);
    });
  }

  // Day/night flip: bump the revision (invalidates pending periodic timers),
  // remove inactive periodic members, then refill every active row.
  flip(next: Mode): { removed: number; spawned: number } {
    if (next === this.mode) return { removed: 0, spawned: 0 };
    this.mode = next;
    this.revision += 1;
    let removed = 0;
    for (const row of this.rows.values()) {
      if (row.period !== 'always' && !this.isActive(row)) {
        removed += this.count(row.id);
        this.alive.set(row.id, 0);
      }
    }
    let spawned = 0;
    for (const row of this.rows.values()) {
      const before = this.count(row.id);
      this.fill(row, this.revision);
      spawned += this.count(row.id) - before;
    }
    return { removed, spawned };
  }

  aliveCount(rowId: number): number {
    return this.count(rowId);
  }
}

// Usage with a fake host, so the file exercises the types.
const pending: Array<() => void> = [];
const zone = new ZonePopulation(
  [
    { id: 1, total: 3, respawnS: 60, biasS: 10, period: 'always' },
    { id: 2, total: 2, respawnS: 120, biasS: 0, period: 'night' },
  ],
  { after: (_ms, fn) => { pending.push(fn); }, spawnOne: () => true, rand: () => 0.5 },
);
zone.onDeath(1);
zone.flip('night');
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {}` appended in the checked copy (`/tmp/pmbstyle-L2Solo-spawn-population.ts`): exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: per-row totals, respawn timers, day/night flip, stale-timer guard). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn). The server tick sub-line does not apply here: the donor uses timeouts and a 1 s reaper, not a tick loop.
- Reuse tag: adapt (Apache-2.0: the code may be adapted; this sketch is written from the mechanism, not copied)
- Brief rule served: zones as data (per-row fields `total`, `respawn`, `bias`, `period` live in zone data); one engine (the timer and the refill are engine logic); Apache-2.0 permits the adapted shape.

## 6. Gaps and risks

- No zone cap and no despawn on empty. Row 23 asks for caps, respawn and despawn on an empty zone with a grace timer. This donor keeps each row at its fixed total forever and refills on each death. It has no zone-wide cap, no empty-zone despawn and no grace timer. Frankendom must write that rule itself.
- No presence gate. `spawnNpc` (SpawnNpcs.js 154-166) never checks for players. A respawn fires after its delay whether or not anyone is near; the player-facing effects on this path are the announce packet to sessions within 6000 units (9, 164) and the 10 s aggro grace (NpcAggro.js 4, 79). Frankendom has to decide whether an empty zone refills.
- The ordinary respawn does not retry. A failed spawn is logged once (RemoveNpc.js 45-47) and the row stays short. Only periodic rows get a backstop, at the next flip. Non-periodic rows get none. The sketch retries after 1 s; a server test must show the row refills.
- The respawn timers are untracked. They are plain `setTimeout` calls with no handle and no `unref` (RemoveNpc.js 40-48), and `World.init` (128-152) rebuilds `npc` but does not clear them. Frankendom's one engine should own them in a wheel or list with cancel.
- Explicit-coords rows multiply. The count loop (SpawnNpcs.js 244) and the coords loop (246) together spawn total x coords-count NPCs. This was read from the code, not checked against any data row. Do not port this shape without a check.
- Clock, not tick. Day and night switch on a wall-clock timeout (DayNightSpawnManager.js 67-76), not on the server tick. Frankendom's server tick should drive the flip so tests can step it.
- Kills and rewards are not decided here. `npcRewards` (RemoveNpc.js 53) ran but was not read; the module does not verify kills. Frankendom's rulings (server-verified kills, one ledger) must come from the engine, not this function.
- Corpse and respawn are separate timers (RemoveNpc.js 28-29, 24, 40), so a respawn can appear while the corpse is still visible. That is the intended shape here; Frankendom's Pit client must not assume a corpse is gone when the replacement appears.
- The one clear rule to take is the stale-timer guard: a respawn timer captures the period revision at death and is dropped if the revision has changed (RemoveNpc.js 33, 42; DayNightSpawnManager.js 40).
