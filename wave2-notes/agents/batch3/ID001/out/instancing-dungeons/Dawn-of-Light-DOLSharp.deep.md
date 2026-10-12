# Dawn-of-Light-DOLSharp (instancing-dungeons, cell 2)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Instance/BaseInstance.cs` | Licence: GPL-2.0-or-later (per BaseInstance.cs header lines 4-7: version 2 "or (at your option) any later version"; repo LICENSE is GPL v2 text) | C# | symbol `BaseInstance`, with `WorldMgr.CreateInstance` / `WorldMgr.RemoveInstance` and `AdventureWingJumpPoint`

Checked: Read in full: BaseInstance.cs (1-538), Instance.cs (20-186), WorldMgr.cs instance create and remove (1703-1893), RegionInstance.cs (20-130). Read in part: AdventureWingInstance.cs (30-110, 160-217; 111-159 not read), AdventureWingJumpPoint.cs (60-175; 1-59 and 176+ not read), Region.cs (412-425, only the NumPlayers property; m_numPlayer maintenance not read), TaskDungeonMission.cs (566-572; the UpdateInstanceLevel caller not read). Searched the whole donor: no `typeof(RegionInstance)` or `new RegionInstance` exists in this snapshot; `DestroyWhenEmpty`, `BeginAutoClosureCountdown` and `GetInstanceLevel` have only the callers listed in the notes (AdventureWingInstance, Instance.cs, the GM command, TaskDungeonMission). Confidence high on the create, enter, leave, timer and removal order (read end to end); medium on the owner hand-over details (not fully read). camera_scope: n/a (not a camera cell).

Best transferable idea: Give each dungeon run its own server-only instance id while every client keeps asking for the shared skin zone, and close the run through one presence ledger plus a grace timer that an entering player cancels and an empty leave re-arms.
Decision (proposed): adapt - the shape fits zones-as-data and server-verified kills (a party gets its own zone ids and its own enemies; the world keeps its skin ids); the donor's counters, re-arm gap and creation defects are fixed in the sketch; no code is taken (GPL-2.0-or-later, clean-room only).
Acceptance: Server test: two groups enter the same dungeon skin and get different instance ids and zone ids; an enemy killed in group A is still alive in group B; when group A's last member leaves with no enemy alive, the instance is gone from the registry on the next tick and resolveZone returns undefined for its skin zones.

## 1. Mechanism

- Create (WorldMgr.cs 1726-1866). A request names a skin (the region id the client sees) and an instance type. With no requested id, it searches upward from 1000 for a free region id (1785-1794) and builds the instance inside a frozen region table (1782-1820). Then it looks up the zone list for the skin (1827-1836), gives each zone a free zone id (1843-1860) registered as "<name> (Instance)", and calls `instance.Start()` (1864).
- Start (BaseInstance.cs 64-73). Starts the region manager, arms a 10-minute auto-close countdown (67), and maps skin zone ids to instance zones (68-72).
- Enter (BaseInstance.cs 202-213). Increments the player count (205) and stops the auto-close timer (207-212). RegionInstance also adds the player to its list (RegionInstance.cs 61-67).
- Leave (BaseInstance.cs 218-229). Decrements the count (221). If the count is below 1 and DestroyWhenEmpty is set, it calls `WorldMgr.RemoveInstance(this)` (224-227). RegionInstance removes the player from its list after the base call (73-78). AdventureWingInstance overrides leave (176-215): see the owner rules below.
- Owner rules (AdventureWingInstance.cs 176-215 and AdventureWingJumpPoint.cs 60-175). On the last leave it records the group or solo player as owner (179-189). If others are still in, it calls UpdateInstanceOwner (195-198), which (102-106) sets the owner to the group leader of a member still inside. If empty, it arms the destroy countdown when enemies are still alive (201-208), otherwise removes the instance now (211-213). At entry, a group or leader reuses its instance (60-72), or a solo player reuses their own (78-87). If that instance has another skin and is occupied, entry is refused (98-103). If it has another skin and is empty, it is removed (104-109). Otherwise a new instance is created for the owner (118-129), its DB objects are loaded (137), a loot generator is registered for its id (147), and other empty instances of the same owner are removed (151-175).
- Close timers (BaseInstance.cs 288-403). The auto-close timer is armed by `BeginAutoClosureCountdown` (295-306). On tick, if clients are still in the region it warns and keeps running (357-363); if not, it stops and removes the instance (366-370). `BeginDelayCloseCountdown` turns DestroyWhenEmpty off and arms a delayed timer (312-331); when it fires it turns DestroyWhenEmpty back on (399-400), which removes an empty instance at once (141-145).
- Persistence flag (BaseInstance.cs 152-182). Persistent sets DestroyWhenEmpty off and stops both timers; clearing it sets DestroyWhenEmpty on.
- Remove (WorldMgr.cs 1873-1893). Drops the region from the table (1877), drops its zones (1880-1887), then calls `OnCollapse` (1889). OnCollapse (BaseInstance.cs 260-281) stops both timers, removes event handlers owned by the instance (276), clears the skin-zone map (278) and areas (280).
- Skin mapping (BaseInstance.cs 414-436 and 480-486). Clients always ask for the skin zone; the instance maps that to its own zone before area lookup.
- Loading an instance from the DB (Instance.cs 69-146). A row with class "entrance" sets the entrance position with the instance's region id (91-96). Other rows create an object by class name (105-110), place it in the instance region (119), optionally load an NPC template (123-137), and add it to the world (139).
- Tick: the instance lifecycle is driven by GameTimer callbacks (the auto-close and delayed-close timers), not by a per-tick loop in this read. The donor's own comment says all instances use one time manager for now (WorldMgr.cs 1747-1753). Whether that timer runs on a fixed step is (not read).

## 2. Key functions

- `WorldMgr.CreateInstance` (overload with requestedID): `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/WorldMgr.cs` 1726-1866.
- `WorldMgr.RemoveInstance`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/WorldMgr.cs` 1873-1893.
- `BaseInstance.Start`, `OnPlayerEnterInstance`, `OnPlayerLeaveInstance`, `OnCollapse`, `BeginAutoClosureCountdown`, `BeginDelayCloseCountdown`, `AutoCloseRegionTimer.OnTick`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Instance/BaseInstance.cs` 64-73, 202-229, 260-281, 295-306, 312-331, 349-372.
- `AdventureWingInstance.OnPlayerLeaveInstance`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Instance/AdventureWingInstance.cs` 176-215.
- Entry routing and owner rules: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/serverrules/AdventureWingJumpPoint.cs` 60-175.
- `Instance.LoadFromDatabase`, `Instance.GetInstanceLevel`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/world/Instance/Instance.cs` 69-146 and 157-184.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Skin id shared by the open world; server-only instance id from a free-slot search | Search starts at 1000 (WorldMgr.cs 1716) |
| Presence ledger (count of players inside) gating destroy-on-empty | Count is a bare int (BaseInstance.cs 192), not a set |
| Grace timer armed at creation, cancelled on enter, re-armed on empty leave (adventure wing) | Creation countdown 10 minutes, hard-coded (BaseInstance.cs 67); empty countdown = ServerProperties.ADVENTUREWING_TIME_TO_DESTROY (AdventureWingInstance.cs 206; the config value was not read) |
| Minutes to milliseconds for timers | minutes * 60000 (BaseInstance.cs 304, 330) |
| Respawn off for an instance's mobs | RespawnInterval = -1 (AdventureWingInstance.cs 168) |
| One owned instance per leader; refuse entry while occupied | Rule as coded (AdventureWingJumpPoint.cs 91-113) |
| Level estimate for an instance | +7 per player on a base of 100: `level *= ((100 + 7 * count) / 100)` (Instance.cs 182); the comment at 172-174 calls it "Guess work for now" |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (create with a 10-minute-style creation grace, enter cancels the grace, leave re-arms it when enemies live, timer removal when empty, party entry rules from AdventureWingJumpPoint). It omits zone area and object loading, the owner hand-over when a player leaves (AdventureWingInstance.cs 195-198), the loot generator, the persistent flag and delayed close, the respawn switch, the entrance position, the level helper, and the removal of other empty instances the same owner had (AdventureWingJumpPoint.cs 151-175). It changes three donor defects: the player count is a Set (BaseInstance.cs 205, 221), a leave for a player not inside is ignored, and zone ids come from a counter instead of a free-id scan (WorldMgr.cs 1843-1857). Locks are not modelled (single-threaded), and aliveEnemies is maintained by the caller.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface ZoneCfg {
  createGraceS: number;   // empty-from-creation grace before the instance may close (zone data)
  emptyGraceS: number;    // grace after the last player leaves while enemies are still alive (zone data)
}

interface Instance {
  id: number;                    // server-unique instance id (the donor's region id)
  skinId: number;                // the look clients request, shared with the open world
  ownerKey: string | null;       // group leader or solo player who owns it
  players: Set<string>;          // ledger of player ids inside (a Set, not a bare counter)
  aliveEnemies: number;          // maintained by the caller each tick
  destroyWhenEmpty: boolean;
  closeDueAt: number | null;     // ms timestamp of the armed grace timer, or null
  zoneMap: Map<number, number>;  // skin zone id -> this instance's own zone id
}

export class InstanceRegistry {
  private nextId = 1000;        // donor starts the instance id search at 1000
  private nextZone = 0;         // donor scans for a free zone id; this sketch just counts up
  private byId = new Map<number, Instance>();

  create(skinId: number, ownerKey: string, skinZoneIds: number[], cfg: ZoneCfg, now: number): Instance {
    let id = this.nextId;
    while (this.byId.has(id)) id++;
    this.nextId = id + 1;
    const zoneMap = new Map<number, number>();
    for (const skinZone of skinZoneIds) zoneMap.set(skinZone, this.nextZone++);
    const inst: Instance = {
      id, skinId, ownerKey, players: new Set<string>(), aliveEnemies: 0,
      destroyWhenEmpty: true, closeDueAt: now + cfg.createGraceS * 1000, zoneMap,
    };
    this.byId.set(id, inst);
    return inst;
  }

  // Party entry: rejoin the owner's instance if it is the same skin; refuse if the owner's other instance is occupied; else replace the empty one.
  enterParty(skinId: number, leaderKey: string, skinZoneIds: number[], cfg: ZoneCfg, now: number): Instance | "busy" {
    const mine = [...this.byId.values()].find(i => i.ownerKey === leaderKey);
    if (mine && mine.skinId === skinId) return mine;
    if (mine) {
      if (mine.players.size > 0) return "busy";
      this.remove(mine);
    }
    return this.create(skinId, leaderKey, skinZoneIds, cfg, now);
  }

  enter(inst: Instance, playerId: string): void {
    inst.players.add(playerId);
    inst.closeDueAt = null;                       // a player inside cancels the grace timer
  }

  leave(inst: Instance, playerId: string, now: number, cfg: ZoneCfg): void {
    if (!inst.players.delete(playerId)) return;   // leave for a player who never entered is ignored
    if (inst.players.size > 0 || !inst.destroyWhenEmpty) return;
    if (inst.aliveEnemies === 0) { this.remove(inst); return; }
    inst.closeDueAt = now + cfg.emptyGraceS * 1000; // enemies still alive: re-arm the grace timer
  }

  // Call once per fixed server tick.
  tick(now: number): void {
    for (const inst of [...this.byId.values()]) {
      if (inst.closeDueAt !== null && now >= inst.closeDueAt && inst.players.size === 0) this.remove(inst);
    }
  }

  // Clients always ask for the skin zone; the server maps it to the instance's zone.
  resolveZone(inst: Instance, skinZoneId: number): number | undefined {
    return inst.zoneMap.get(skinZoneId);
  }

  private remove(inst: Instance): void {
    this.byId.delete(inst.id);
    inst.zoneMap.clear();
    inst.players.clear();
    inst.closeDueAt = null;
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/server/instances.ts` (new): the instance registry and its lifecycle, owned by the zone runtime (one engine; a dungeon run is a region of the same runtime, not a second server). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer; the instance close is the grace-timer half of row 23). Numbers live in zone data (see the JSON sidecar).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 23 (zone population: despawn on empty with a grace timer); one engine and zones as data

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism. Nothing in the sketch is a line-by-line translation.
- Defects found in the donor, each with its fix in the sketch:
  1. Player count is a bare int incremented on enter and decremented on leave with no per-player check (BaseInstance.cs 205, 221). A double leave drives it below zero and corrupts later checks. fix: a Set of player ids; a leave for a player not inside is ignored (sketch `leave`).
  2. RegionInstance keeps a second, unguarded List of players, changed from the enter and leave handlers (RegionInstance.cs 64, 77). fix: one ledger (the Set above); if the server ever ticks instances on more than one thread, guard it with a lock or keep all instance state on the tick.
  3. Two player counts exist: BaseInstance.m_playersInInstance (BaseInstance.cs 192) and Region.NumPlayers (Region.cs 417-419, backed by m_numPlayer, which was not read). Entry and leave logic reads both (BaseInstance.cs 224; AdventureWingInstance.cs 179; AdventureWingJumpPoint.cs 98, 159). They are not tied together in what was read. fix: one ledger; derive every count from it (the sketch has no second count).
  4. RegionInstance sets DestroyWhenEmpty to false in its constructor (RegionInstance.cs 88). Base leave only removes when DestroyWhenEmpty is set (BaseInstance.cs 224), and the RegionInstance base does not re-arm a close timer when it empties. A bare RegionInstance that was entered and left would then stay until restart. The one live subclass, AdventureWingInstance, is not affected: its leave override (AdventureWingInstance.cs 176-215) either starts the auto-closure countdown or removes the instance at once. No bare RegionInstance creator exists in this donor, so the defect is a trap for new subclasses, not a bug in a running server. fix: re-arm the grace timer on every last leave, as the sketch does (`leave`).
  5. Creation registers the region before checking zone data (WorldMgr.cs 1811 before 1827-1836). If the skin has no zone list, it returns null (1834-1836) and the region stays in the table with no timer. fix: validate the zone list before registering, or remove the region on that path.
  6. The region data is read with an indexer (WorldMgr.cs 1738), which throws for a missing key before the null check at 1740. fix: TryGetValue, then the null path.
  7. The 10-minute creation grace is a literal (BaseInstance.cs 67), while the owner grace is a server property (AdventureWingInstance.cs 206). fix: both are zone data fields on the instance template.
  8. Instance.cs 123 casts `obj` to GameNPC before the null test, so a non-NPC class with a template id throws. fix: test the type with a safe `as` check before using it.
  9. GetInstanceLevel (Instance.cs 180-182) divides the level sum by the player count. With zero players this is 0/0 (NaN), and Math.Max returns NaN when either argument is NaN, so the result is NaN. The only caller in this donor casts it to byte (TaskDungeonMission.cs 570). fix: return 1 when there are no players, before the division.
- Every instance uses the same time manager (WorldMgr.cs 1753), by the donor's own comment (1747-1751). Frankendom's server tick is one fixed-step loop (row 18 / post-K item 3 sub-line "server tick: fixed step, input intake, per-tick NPC budget"). Instance ticks must run inside that loop, not on separate timers. The sketch's `tick(now)` is called once per fixed step.
- The AutoClose tick does not stop while clients are inside (BaseInstance.cs 357-363), so a dungeon with a stuck player keeps a timer alive. fix: the sketch clears the due time on enter and checks presence on every tick, so no timer is left running for an occupied instance.
- Owner hand-over and loot ownership: the donor binds the loot generator to the instance id (AdventureWingJumpPoint.cs 147). Frankendom's one ledger and server-verified kills need the kill and loot ledger keyed by the instance id, not by the owner, so a party's loot cannot leak to the next run. Not built here.
- Not read, so not claimed: the exact `GameTimer` repeat behaviour, the ServerProperties default for the empty-grace minutes, and what `UpdateInstanceOwner` does past line 110.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Gap 4 was misleading: it implied a RegionInstance would stay until restart with nothing to re-arm a timer. AdventureWingInstance (extends RegionInstance) overrides OnPlayerLeaveInstance (AdventureWingInstance.cs 176-215) and either calls BeginAutoClosureCountdown or WorldMgr.RemoveInstance. Confirmed in the donor; only a bare RegionInstance is exposed. Reworded.
- Everything else verified (CreateInstance, RemoveInstance, counters, timers, NaN level with zero players). Missed: none found.

Fixed 2026-10-12: gap 4 reworded to name the AdventureWingInstance re-arm path and limit the defect to bare RegionInstance subclasses.
