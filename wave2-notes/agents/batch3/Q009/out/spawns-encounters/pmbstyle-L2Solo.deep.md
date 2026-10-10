# pmbstyle-L2Solo (spawns-encounters, cell 6)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/SpawnNpcs.js` (with `RemoveNpc.js`, `DayNightSpawnManager.js`, `Npc/NpcAggro.js`, `Actor/Generics/NpcDied.js`) | Licence: Apache-2.0 (LICENSE file read: "Apache License Version 2.0, January 2004") | JavaScript (Node, `invoke` loader) | symbol `spawnNpcs`

Checked: `spawnNpcs` is at SpawnNpcs.js 235-275 (whole file read, 301 lines). The kill-to-respawn path is RemoveNpc.js 12-60 (whole file read). Day/night is DayNightSpawnManager.js 34-65 (whole file read). Spawn grace is NpcAggro.js 4 and 77-80. Confidence high for the non-raid path. Not read: the `Npc` class, NpcDecay.js beyond `schedule()`, `RaidBoss/RespawnPolicy` (raid delay), `GameTime.msUntilTransition`, the `DataCache.npcSpawns` loader, and NpcDied.js above line 160. Listed hint file (BackgroundResolver.js) is a bot-simulation resolver, not zone spawns; it was opened and set aside (its bot death-recovery delay is 90000 ms, or 1000 ms for PvP recovery, `resolveDeathRecovery` line 316; not spawn data).

Best transferable idea: a per-death respawn timer per spawn slot, with a jitter band (respawn plus or minus bias seconds), that re-checks a period revision before placing the replacement.

Decision (proposed): adapt - take the death-to-respawn timer with jitter and the 10 s spawn aggro grace; add what the donor lacks, a zone population cap and despawn-on-empty with a grace timer (row 23). The donor has no cap and no idle despawn, so adopting this alone would not satisfy row 23.

Acceptance: a server test spawns one wolf in a zone row with respawn 40 and bias 0, kills it at t=0, and asserts no replacement at 39.9 s and exactly one replacement at 40 s, placed at one of the row's listed points; and a new wolf does not engage a player in range until 10 s have passed.

## 1. Mechanism

- Boot. `spawnNpcs()` (SpawnNpcs.js 235-275) walks every spawn row. A row with no explicit coords places `spawn.total` copies, each at a random point (`randomCoords`, 66-81, which uses the listed coords when present and a polygon otherwise). A row with explicit coords runs the `total` loop around a `coords.forEach` (244-247), so it places `total` copies at EACH listed coord, that is total x coords.length. Periodic rows are also pushed to `periodDefinitions` for later day/night refills.
- Kill. The ordinary kill path calls `World.removeNpc(session, npc)` (NpcDied.js:172). That is the only call site found by grep; the branch above line 160 was not read. `removeNpc` (RemoveNpc.js 12-60) first schedules corpse decay (24), clears quest timers (26), then, when `spawn.respawn > 0` (SpawnNpcs.js 290), computes the delay once (32). The respawn is a `setTimeout` (40-48) that checks `canRespawnDefinition` (42) and calls `this.spawnNpc(this, definition)` (43). Net effect: one replacement per death, not a refill to a count. Rewards run after (52-59), inside their own try block.
- Delay. `respawnDelayMs` (SpawnNpcs.js 292-296): seconds = max(0, respawn); bias = max(0, bias); delay = seconds - bias + random x 2 x bias, in seconds, rounded to ms. With bias 0 the delay is exactly `respawn` seconds. With bias B it is spread over [respawn - B, respawn + B].
- Placement. `spawnNpc` (154-166) refuses an inactive period (155), picks a point (156), and announces the new NPC to nearby sessions (164). It does NOT check whether any player is near the point. The comment at 161-163 says the announce is there so a new mob cannot aggro a player before that player's next movement refresh.
- Period. `normalizePeriod` (53-55) maps `period` to day, night or always. A day/night change (DayNightSpawnManager.js `changeMode`, 34-65): sets the new mode (39), bumps `periodRevision` (40), stops NPCs whose period is now inactive and decays them (42-47), then respawns each active periodic definition that is not present (54-60). A respawn timer for a periodic row is dropped at fire time if the revision differs or the period is inactive (RemoveNpc.js 42). Non-periodic respawns always go ahead (7).
- Grace. `createNpc` calls `NpcAggro.armSpawnGrace` (SpawnNpcs.js 38), which sets `aggroEligibleAt = now + 10000` (NpcAggro.js 79; constant at line 4). The comment at NpcAggro.js 1-3 says this mirrors Lineage 2 global aggro of -10, decremented once per second. The aggro check that reads `aggroEligibleAt` (`canEngage`) was not read.
- Timing. No tick loop. Respawns are one `setTimeout` per death. The day/night clock is `schedule()` (DayNightSpawnManager.js 67-76), which waits `GameTime.msUntilTransition(now)` and then calls `changeMode`. Timing runs on wall-clock timers, not on a fixed server step.
- Absent: no population cap at respawn (the non-raid path checks only the period, RemoveNpc.js 42), no idle despawn for empty zones, no grace before despawn. A grep for "despawn" over `src` finds only quest-NPC paths (`despawnQuestNpc`, SpawnNpcs.js 205-206 and 220, and the quest files). Corpse removal is separate (NpcDecay.js, `schedule()` read only). The one "cap" in the spawn path is `spawn.total`, a fixed per-row count used at boot.

## 2. Key functions

- `spawnNpcs()`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/SpawnNpcs.js` 235-275. Boot placement: total copies per row, times coords when explicit (244-267).
- `spawnNpc()`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/SpawnNpcs.js` 154-166. Period gate (155), random point (156), announce (164).
- `respawnDelayMs()`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/SpawnNpcs.js` 292-296. The jitter formula (295).
- `removeNpc()`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/RemoveNpc.js` 12-60. Death path; respawn timer 31-50.
- `canRespawnDefinition()`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/Generics/RemoveNpc.js` 6-10.
- `changeMode()`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/World/DayNightSpawnManager.js` 34-65. Revision bump, removal, refill.
- `armSpawnGrace()`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Npc/NpcAggro.js` 77-80. Sets the 10 s eligibility time.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Replacement after death: delay = respawn seconds, jittered by plus or minus bias seconds, uniform | `respawn` and `bias` are per-row integers in seconds in the datapack (`data/Npcs/Spawns/*.json`). Rows read: c4_garden_of_beasts.json lines 77-79 show total 1, respawn 40, bias 0. c4_catacomb_of_dark_omen.json line 114 shows respawn 120 (its bias not read). Formula theirs (SpawnNpcs.js 295). |
| Respawn switched off by a zero or missing respawn | `respawn > 0` (SpawnNpcs.js 290) |
| Replacement at a random listed point | Points from the row's `coords` list (SpawnNpcs.js 69); bounds polygon via `random-point-in-shape` otherwise (78-79) |
| Day/night presence swap with a revision counter | `period` enum always, day or night (SpawnNpcs.js 53-55); revision bump (DayNightSpawnManager.js 40) |
| Spawn aggro grace | 10000 ms, `SPAWN_AGGRO_DELAY_MS` (NpcAggro.js 4), an engine constant |
| Fixed per-row count at boot | `total` (integer, per row; SpawnNpcs.js 244). Not a cap: it is never checked again after boot. |

## 4. TypeScript sketch

simplified: the sketch uses a due list polled by `tick(now)` instead of one `setTimeout` per death, so it runs on a fixed step; the donor is wall-clock. It models only the random-points branch of boot (total copies per row), so the explicit-coords multiplication (total at each listed coord) is omitted. It omits the bounds polygon, the raid-boss branch, corpse decay, rewards, quest NPCs, child and minion spawns, the `notifyNearby` packets, and the donor's identity-based refill (one spawn per missing periodic definition object). Order kept: a death schedules one respawn with its delay computed at death; at fire time a periodic respawn is dropped if the revision changed or the period is inactive; a mode change bumps the revision, removes inactive periodic mobs, and refills each active slot to `total`.

```ts
// Donor licence: Apache-2.0 (LICENSE read). Clean-room sketch written from the mechanism read in
// SpawnNpcs.js, RemoveNpc.js, DayNightSpawnManager.js and NpcAggro.js, not a translation.
type Period = 'always' | 'day' | 'night';
type Mode = 'day' | 'night';

interface Point { x: number; y: number; }

interface SpawnSlot {
  total: number;      // copies placed at boot and refilled after a period change
  points: Point[];    // listed points; each copy picks one at random
  respawnS: number;   // seconds from death to replacement (0 = no respawn)
  biasS: number;      // +/- jitter in seconds
  period: Period;
}

interface Mob {
  slot: SpawnSlot;
  at: Point;
  aggroEligibleAt: number;
}

interface DueRespawn { at: number; slot: SpawnSlot; revisionAtDeath: number; }

const SPAWN_AGGRO_DELAY_MS = 10000;

function isActive(period: Period, mode: Mode): boolean {
  return period === 'always' || period === mode;
}

function respawnDelayMs(slot: SpawnSlot, random: () => number): number {
  const seconds = Math.max(0, slot.respawnS);
  const bias = Math.max(0, slot.biasS);
  return Math.round((seconds - bias + random() * bias * 2) * 1000);
}

export class ZoneSpawner {
  private mode: Mode = 'day';
  private revision = 0;
  private mobs: Mob[] = [];
  private due: DueRespawn[] = [];

  constructor(private readonly slots: SpawnSlot[], private readonly random: () => number = Math.random) {}

  boot(now: number): void {
    for (const slot of this.slots) {
      for (let i = 0; i < slot.total; i++) this.spawn(slot, now);
    }
  }

  private spawn(slot: SpawnSlot, now: number): Mob | null {
    if (!isActive(slot.period, this.mode)) return null;
    const pick = slot.points[Math.floor(this.random() * slot.points.length)];
    const mob: Mob = { slot, at: { x: pick.x, y: pick.y }, aggroEligibleAt: now + SPAWN_AGGRO_DELAY_MS };
    this.mobs.push(mob);
    return mob;
  }

  kill(mob: Mob, now: number): void {
    const index = this.mobs.indexOf(mob);
    if (index < 0) return;
    this.mobs.splice(index, 1);
    if (mob.slot.respawnS > 0) {
      this.due.push({ at: now + respawnDelayMs(mob.slot, this.random), slot: mob.slot, revisionAtDeath: this.revision });
    }
  }

  // The donor uses one setTimeout per death; this sketch polls a due list once per server tick.
  tick(now: number): void {
    const ready = this.due.filter((d) => d.at <= now);
    this.due = this.due.filter((d) => d.at > now);
    for (const d of ready) {
      const periodic = d.slot.period !== 'always';
      if (periodic && (d.revisionAtDeath !== this.revision || !isActive(d.slot.period, this.mode))) continue;
      this.spawn(d.slot, now);
    }
  }

  setMode(next: Mode, now: number): void {
    if (next === this.mode) return;
    this.mode = next;
    this.revision += 1;
    this.mobs = this.mobs.filter((m) => m.slot.period === 'always' || isActive(m.slot.period, next));
    for (const slot of this.slots) {
      if (!isActive(slot.period, next)) continue;
      let present = this.mobs.filter((m) => m.slot === slot).length;
      while (present < slot.total) {
        this.spawn(slot, now);
        present += 1;
      }
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the zone-population engine file named in the addendum for row 23; the Frankendom file was not read, so "today" is not stated). Parity row 23 (zone population: spawn caps, respawn, despawn on empty with grace timer). The donor covers the respawn-after-death timer and the spawn grace for row 23; it does NOT cover the cap or the despawn parts.
- Server tick sub-line (addendum): the donor's respawn is event-driven (setTimeout). Frankendom should run these timers on the fixed server step ("server tick: fixed step, input intake, per-tick NPC budget").
- Reuse tag: adapt (Apache-2.0: code may be adapted, keep the NOTICE if any code is copied; the sketch above is clean-room in any case)
- Brief rule served: zones as data on one engine (the numbers respawn, bias, total and period are zone data; the respawn logic is engine code); rules 7-9 n/a

## 6. Gaps and risks

- Row 23 gap: the donor has no population cap and no despawn on empty. `total` is a boot count that is never enforced again, so a row can grow past it only through other paths (quest or child spawns, not read). Frankendom must add the cap and the empty-zone despawn with a grace timer itself.
- No presence check: `spawnNpc` (SpawnNpcs.js 154-166) places a replacement without checking nearby players. The donor only announces it. Frankendom zones need a rule for not spawning in view of a player; the donor does not have one.
- Two meanings of `total`: with explicit coords it means copies per coord (total x coords.length, SpawnNpcs.js 244-247); with random points it means copies per row. A zone-data field needs one meaning.
- Wall-clock timers: one `setTimeout` per death and one for the day/night clock. Under load the respawn drifts from the server step, which breaks any test that expects exact ticks. Use the fixed step instead.
- Day/night is clock-driven (`GameTime` not read). Frankendom would need a clock source for `period` on zones; whether Frankendom wants day/night zones is a Lead call (not read).
- The 10 s spawn grace is read from the constant and its comment. The aggro check that uses `aggroEligibleAt` (`canEngage`, NpcAggro.js) was not read, so "does not engage until 10 s" is the intended meaning, not verified behaviour.
- Raid bosses take a separate path (`RaidBossState`, RespawnPolicy). Not read. Frankendom should not port that path from this donor.
- Bot population (`Bot/Population/PopulationSeedPlanner.js`, a `maxPopulation` hard cap of 1700 default and regional targets) is a separate population cap for bot characters. Only grepped, not read. It is a candidate for a later row 23 check, not part of this note.

Reuse tag: adapt (Apache-2.0; permissive)
Brief rule served: zones as data on one engine; rules 7-9 n/a
