# ModernUO (instancing-dungeons, cell 19)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Doom/GauntletSpawner.cs` | Licence: GPL-3.0 (repo `/mnt/frankendom-donors/ModernUO/LICENSE`, GNU GPL version 3; `GauntletSpawner.cs` has no licence header of its own) | C# | symbol `GauntletSpawner`

Checked: Read in full: `GauntletSpawner.cs` 66-82, 108-192, 279-358, 379-406, 409-428; `GenGauntlet.cs` 52-60 and 84-163 (ring built at 96-110, spawner created at 136-163); `GauntletRegion.cs` (all, 32 lines); `Server/Regions/Region.cs` 515-534 and 590-610; `Distribution/Data/regions.json` 3564-3573. A grep of `UOContent/Engines/Doom/` finds the `Creatures` list touched only by `Creatures.Add` (357), the top-up loop (388), `ClearCreatures()` in `Stop` (187) and in `RemoveAllCreatures` (312), and `Deserialize`; no code removes a single dead mob from the list. Not read: `ClearCreatures()` and `ClearTraps()` bodies (likely generated), `Key.RandomValue()`, the trap classes, the server `Timer.StartTimer` internals, `GauntletRegion.OnEnter`/`OnExit` (empty, read), the `LeverPuzzle` folder. Second mechanism in the same category, `Engines/CannedEvil/ChampionSpawn.cs` with `CannedEvilTimer.cs`, was read in part but not written as a note (one note per cell). Camera: not applicable. Confidence: high on the per-second flow and the population formula; medium on the ring-reset path (traced by reading, not run).

Best transferable idea: a room's population is set by how many players are in the zone (ceil of players over a group size, floored at 1), topped up once a second, and a room opens only when the previous room's mobs are all dead.
Decision (proposed): adapt — take the population formula and the gate-on-clear shape; change the rules to Frankendom's: presence-gated, despawn on empty with a grace timer (row 23), and kills from the server ledger, not the object's `Deleted` flag.
Acceptance: Server test: with 0 players in the zone the population is 0 after the grace timer; with 1-5 players it is 1, with 6 it is 2 (ceil(n/5)); when every listed creature is a server-verified kill the room completes and the next opens; a second full loop resets every room to closed before room 1 reopens.

## 1. Mechanism

- A `GauntletSpawner` is one room of a ring of six (sp1 to sp6, `GenGauntlet.cs` 96-108). Only one room is `InProgress` at a time: `sp1.State = InProgress` (110) starts the ring.
- Entering `InProgress` (the `State` setter calls `Update`, 108-158): lock the room's door with a fresh random key (123-127), create the room region (151, 182), then `FullSpawn` (153-155), then start a 1-second timer that calls `Slice` (158). Any other state stops the room: `ClearCreatures`, `ClearTraps`, destroy the region, cancel the timer (185-192).
- `FullSpawn` (315-334): delete all listed creatures (317, `RemoveAllCreatures`, 305-312), compute the target count (319), spawn that many, then rebuild traps (326-333).
- Target count `ComputeSpawnCount` (279-302): find the region named "Doom Gauntlet" above the room (289, `GetRegion` walks parents, `Server/Regions/Region.cs` 525-533). Count online clients inside it (293, `GetPlayerCount`, `Region.cs` 601). If that is zero, count the room's own region (297-299). Target = `max(ceil(count / 5), 1)` (302).
- `Slice`, every second (379-406): return unless `InProgress` (381). Recompute the target (386). Spawn only while the list is shorter than the target (388-391). A dead creature stays in the list, so it counts against the target until the room is reopened. If `HasCompleted` (393): the room becomes `Completed` (395), which stops it (185-192). If the next room is `Completed`, reset the ring first (399-401). Then open the next room (404).
- `HasCompleted` (66-82): an empty list is never complete (70-73). Otherwise every listed mob must have `Deleted` set (75-81).
- Reset (`RecurseReset`, 366-376): if this room is not `InSequence`, set it to `InSequence` and recurse to the next room. The recursion stops at the first room already `InSequence`. The ring of six therefore resets as a whole when it wraps.
- Creatures spawn at the spawner's point: `mob.MoveToWorld(GetWorldLocation(), Map)` (356; `GetWorldLocation` is inherited and not read). Traps are `area / 100` (213-215), placed by 10 random tries each (not read in detail).

## 2. Key functions

- `GauntletSpawner.ComputeSpawnCount`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Doom/GauntletSpawner.cs` 279-302. The population formula and the parent-region lookup.
- `GauntletSpawner.Update`: same file 108-158. State change: door lock, region, full spawn, 1-second timer.
- `GauntletSpawner.Slice`: same file 379-406. The per-second top-up, the completion check, the ring hand-off.
- `GauntletSpawner.HasCompleted`: same file 66-82. Completion means every listed mob is deleted.
- `GauntletSpawner.RecurseReset`: same file 366-376. Walks the ring back to `InSequence`.
- The ring itself: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Doom/GenGauntlet.cs` 96-110 (six rooms, each with spawner point, door, room bounds, and the monster type name).
- The parent region: `/mnt/frankendom-donors/ModernUO/Distribution/Data/regions.json` 3565-3570 (`DungeonRegion` named "Doom Gauntlet").

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Target = ceil(players / group size), floor 1 | Group size 5 (theirs, `GauntletSpawner.cs` 18); floor 1 (theirs, 302) |
| Top-up only, every second, never removes an entry | Interval 1.0 s (theirs, 158); entries removed only on room reopen (`FullSpawn`, 317) |
| Room completes when every listed mob is deleted; empty is not complete | Completion test is the object's `Deleted` flag (theirs, 79); empty list is not complete (70) |
| Next room opens on clear; if the next is already complete, reset the ring first | Six rooms in a ring (theirs, `GenGauntlet.cs` 96-108) |
| Trap count = room area / 100 | Divisor 100 (theirs, `GauntletSpawner.cs` 215) |
| Door locked with a fresh random key while in progress | Key from `Key.RandomValue()` (theirs, 127) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: state change, then on `inProgress` a full spawn, then the per-second `slice` with top-up, completion check, and hand-off (reset the ring first if the next room is complete, then open the next). It omits traps, the door and key, the region create and destroy, the timer itself (the caller runs `slice`), the deleted-next check, the parent-region lookup (the sketch takes a player-count function), the spawn-point position, serialization, and the donor's `ClearCreatures` versus `RemoveAllCreatures` split (the sketch clears the list in both paths).

```ts
// Licence: GPL-3.0 (donor, ModernUO). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type RoomState = "inSequence" | "inProgress" | "completed";

interface Mob {
  deleted: boolean;
}

interface RoomConfig {
  playersPerSpawn: number; // donor: PlayersPerSpawn = 5 (zone data in Frankendom)
  minSpawnCount: number; // donor: floor of 1 (engine constant)
}

// One room of a ring of rooms. Players in the dungeon set the population; a room opens only after its predecessor clears.
class Room {
  state: RoomState = "inSequence";
  creatures: Mob[] = [];
  next: Room | null = null;

  constructor(
    private readonly cfg: RoomConfig,
    private readonly playersInDungeon: () => number,
    private readonly spawnOne: () => Mob | null,
  ) {}

  // donor ComputeSpawnCount: ceil(players / PlayersPerSpawn), never below the floor
  computeSpawnCount(): number {
    return Math.max(Math.ceil(this.playersInDungeon() / this.cfg.playersPerSpawn), this.cfg.minSpawnCount);
  }

  // donor HasCompleted: empty list is never complete; otherwise every listed creature must be deleted
  hasCompleted(): boolean {
    if (this.creatures.length === 0) return false;
    return this.creatures.every((m) => m.deleted);
  }

  // donor State setter: a change runs Update, which spawns in full when InProgress and stops otherwise
  setState(s: RoomState): void {
    if (this.state === s) return;
    this.state = s;
    if (s === "inProgress") {
      this.fullSpawn();
    } else {
      this.stop();
    }
  }

  // donor FullSpawn (traps omitted): drop the old population, then spawn to the current target
  fullSpawn(): void {
    this.creatures = [];
    const n = this.computeSpawnCount();
    for (let i = 0; i < n; i++) this.spawnCreature();
  }

  private spawnCreature(): void {
    const m = this.spawnOne();
    if (m !== null) this.creatures.push(m);
  }

  // donor Stop: forget the population and the region (traps omitted); the timer is not modelled here
  stop(): void {
    this.creatures = [];
  }

  // called once per second while InProgress (donor Slice)
  slice(): void {
    if (this.state !== "inProgress") return;

    // top up only: entries already in the list (including dead ones) count against the target
    const n = this.computeSpawnCount();
    for (let i = this.creatures.length; i < n; i++) this.spawnCreature();

    if (this.hasCompleted()) {
      this.setState("completed");
      const nx = this.next;
      if (nx !== null) {
        if (nx.state === "completed") this.recurseReset();
        nx.setState("inProgress");
      }
    }
  }

  // donor RecurseReset: walk the ring back to InSequence, stopping at the first room already InSequence
  recurseReset(): void {
    if (this.state !== "inSequence") {
      this.setState("inSequence");
      this.next?.recurseReset();
    }
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population, engine logic): population target = `max(ceil(players in zone / 5), 1)`, a top-up on the server tick, despawn on empty after a grace timer, and one room of a zone chain open at a time. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine (the spawn count is engine logic; the zone supplies the numbers); zones as data; server-verified kills (the completion test must read the server's kill record, not the object flag)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- Frankendom rule (row 23): the donor never despawns on empty. Population only goes up in `Slice` (388-391) and only resets on a room reopen (`FullSpawn`, 317-324). A grep of `UOContent/Engines/Doom/` for grace, despawn, linger and decay finds nothing. Frankendom needs despawn on empty with a grace timer, and that is new work.
- Presence: the donor does not gate a room on presence. A room whose parent count is zero still holds one creature (the floor, 302), and the room opens whenever the previous room clears. Frankendom must not spawn into an empty zone.
- Kill signal: the donor treats a `Deleted` mob as a kill (79). Frankendom's rule is server-verified kills. Completion must read the server's kill ledger, and a GM or cleanup delete must not count as a kill.
- Attackers: the group size of 5 scales the zone's population, not the number of attackers on one player. MAX_ATTACKERS = 3 must remain the cap on simultaneous attackers in `src/fight`; population scaling must not raise it.
- Orphan risk: `Stop` (187) calls `ClearCreatures()` and does not call `RemoveAllCreatures`. `ClearCreatures` has no body in the repo source (likely generated; not read), so I cannot confirm whether it deletes. A reset of a room that still has live creatures could leave them in the world. I did not trace whether the ring can reach that state. Frankendom must delete or hand off on any reset.
- Hard-coded: the region name "Doom Gauntlet" (289) and all positions and bounds (`GenGauntlet.cs` 96-101) are literals. Frankendom keeps them as zone data keyed by zone id.
- Spawn point: all creatures of a room appear at the spawner's point (356). Frankendom would need a spawn area per zone to avoid stacking.
- Not read: `ClearCreatures`/`ClearTraps` bodies, `Key.RandomValue`, `BaseTrap` subclasses, the server `Timer` internals, `LeverPuzzle`. The ChampionSpawn engine (`Engines/CannedEvil/ChampionSpawn.cs`, `CannedEvilTimer.cs`) has a second instancing pattern (region-entry activation, a 15-address proximity gate, a daily rotation, a 5-minute death eject). It was read in part and is not written up here; it is a candidate for a second cell note.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one engine, zones as data, server-verified kills (Frankendom rulings); parity row 23 zone population


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** All claims hold: PlayersPerSpawn=5 (18), HasCompleted 66-82 (empty never complete 70-73, Deleted test 79), State setter -> Update 108-158 (door key 123-127, CreateRegion 151, FullSpawn 153-155, 1 s timer 158), Stop 185-192 (ClearCreatures 187), ComputeTrapCount area/100 (215), ComputeSpawnCount 279-302 (Region.GetRegion walk 289 -> Region.cs 525-533, GetPlayerCount 601, fallback 297-299, ceil/floor 302), FullSpawn 315-334, Spawn 356-357, RecurseReset 366-376, Slice 379-406 order (top-up, HasCompleted, reset-if-next-completed, open next), GenGauntlet ring 96-110, regions.json 3565-3570 'Doom Gauntlet', trap 10 tries (254). Sketch order matches donor.

**Missed:** Door.Link also locked/re-keyed (131-141); sp6 has no door (0,0) - trivial
