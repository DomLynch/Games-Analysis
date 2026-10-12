# ax-grymyr-l2dn-server (instancing-dungeons, cell 19)

Donor: /mnt/frankendom-donors/ax-grymyr-l2dn-server | Licence: MIT (LICENSE.txt line 1 "MIT License", line 3 "Copyright (c) 2024-2025 Grymyr, L2Dn Server Project") | C# | symbol Instance (L2Dn.GameServer.Model/Model/InstanceZones/Instance.cs) with InstanceTemplate and InstanceManager
Checked: camera_scope not applicable (not a camera cell). Opened in full: Instance.cs 58-300, 741-870, 1192-1289; setDuration 776-815; destroy 823-851; finishInstance 989-1008; onDeath/doRevive 1018-1049; onInstanceChange and onPlayerLogout 1056-1146; cleanUp 1254-1266. Opened in part: Instance.cs 923-988 (setReenterTime, header and DB write only). InstanceTemplate.cs 35-37, 66-104, 110-129, 258-284, 312-393, 399-425, 540-720 (calculateReenterTime, group entry, conditions). InstanceManager.cs 120-140, 249-270, 343-445, 459-491, 547-563 (partial for restore at 459-490). Also WorldObject.cs 625-645, EnterWorldPacket.cs 86-104, ConditionReenter.cs 22, OlympiadStadium.cs 30-40, AdminInstance.cs 152, Config.General.cs 264-266, DataPack/instances/*.xml time and reenter lines (grep), xsd/instance.xsd 8-14. Callers (grep over the whole tree): createInstance has 3 callers (AdminInstance, OlympiadStadium, Duel); Instance.setDuration has 2 (constructor, finishInstance); finishInstance has 0 callers in this tree; getEnterGroup and validateConditions have 0 callers; isAllowed has 2 (AdminInstance:152 and getPlayerInstance). Not read: spawnDoors, spawn-group functions (Instance.cs 350-575), removeNpcs body, ConditionGroup validation, restoreInstanceTimes beyond its first lines, Duel.cs and the Olympiad script flow beyond OlympiadStadium.cs:35. Confidence: high on the lifecycle order and on defects D1, D2, D4, D5 (read line by line); medium-high on D3 (read, not run). Nothing was executed.
Best transferable idea: An instance world is a small state machine (created, timed, empty-grace, destroyed) whose timers are zone data, with warnings at fixed checkpoints and a grace window before an empty zone is torn down.
Decision (proposed): adapt - keep the lifecycle and the five data timers (duration, empty grace, eject after death, warning checkpoints, max worlds), run them on the server as a tick-driven state machine, and fix donor defects D1 to D5 in the sketch; reject the donor's wall-clock ThreadPool timers and the unapplied reenter lock, which are not in our rulings for now.
Acceptance: Server test: a 120-second zone with warnings at 60 s and 30 s sends each warning once at its checkpoint, destroys at 120 s and ejects anyone still inside; a zone with a 10-second empty grace whose last player leaves at 30 s is destroyed at 40 s unless someone re-enters first.

## 1. Mechanism
One instance world, in the order the code runs it:
1. Create. InstanceManager.createInstance takes the next free id (wrapping counter that skips ids in use) and calls the Instance constructor (InstanceManager.cs:343-345, 414-425). The constructor clones the spawn templates, registers the world (Instance.cs:73), sets the duration (76), spawns doors and default NPCs (78-87), and fires an OnInstanceCreated event for scripts.
2. Membership. Players enter and leave through WorldObject.setInstance: leave the old world, set the new one, enter the new one (WorldObject.cs:636, 642). The world's onInstanceChange then calls addPlayer or removePlayer (Instance.cs:1063, 1086). Separately, a per-world allowed set of player ids is kept (addAllowed and isAllowed, Instance.cs:199-215). In this tree only the admin path and the restore path read it (AdminInstance.cs:152, InstanceManager.cs:390-404).
3. Timer and warnings. setDuration sets end = now + duration (Instance.cs:799) and schedules cleanUp five minutes before the end, or one minute before it for durations of five minutes or less (807-814). cleanUp (1254-1265) sends a five-minute notice and reschedules itself in five minutes, or, when at most one minute is left, sends a one-minute notice and schedules destroy one minute later (1256-1264).
4. Empty. addPlayer cancels a pending empty-destroy task (241-246). removePlayer, when the last player leaves, destroys at once if the duration or the empty window is zero (259-262); otherwise it is meant to schedule destroy after the empty window, but the condition is inverted (263-266, defect D2).
5. Death. onDeath arms an eject timer if the template ejects after death (1020-1034). doRevive cancels it (1044-1048). When the timer fires and the player is still dead, ejectPlayer teleports them to the exit location (1030-1032, 857-870).
6. Exit location. ORIGIN is stored at enter and consumed at exit (Instance.cs:1066-1070; InstanceTemplate.cs:368-378). FIXED takes the first location, RANDOM a random one, TOWN the nearest town or karma respawn (InstanceTemplate.cs:349-391).
7. Logout and login. onPlayerLogout removes the player and stores the world id in the INSTANCE_RESTORE variable (Instance.cs:1119-1122), or, without restore, moves the character to the exit location invisibly (1124-1136). At login the world is restored only if the stored id matches a world the player is allowed in, and the variable is then removed (EnterWorldPacket.cs:91-99).
8. Destroy. Cancel the cleanup, empty-destroy and eject tasks (823-841), notify scripts, eject every remaining player (741-743, 846), remove doors and NPCs (847-848), unregister the world (850).
9. Reenter. finishInstance writes a per-character reenter time only when the template type is ON_FINISH (Instance.cs:1003-1005). ConditionReenter passes when no time is stored (ConditionReenter.cs:22), because InstanceManager.getInstanceTime returns DateTime.MinValue in that case (InstanceManager.cs:551-553). It also deletes an expired entry on read (556-560).
10. Entry group. InstanceTemplate.getEnterGroup picks the group type from a mask built from the entry conditions (party, command channel, solo), then lists the members who may enter (InstanceTemplate.cs:611-693). It has no caller in this tree (defect D5).

## 2. Key functions
- Instance constructor (Instance.cs:58-94): create, register, duration, spawns.
- setDuration (Instance.cs:776-815): end time and the cleanup ladder.
- cleanUp (Instance.cs:1254-1265): warning ladder with 5 and 1 minute steps.
- removePlayer / addPlayer (Instance.cs:239-268): empty-destroy grace, cancelled on re-entry.
- destroy (Instance.cs:823-851): full teardown.
- onDeath / doRevive (Instance.cs:1018-1049): eject-after-death timer.
- onInstanceChange (Instance.cs:1056-1094): enter and leave hook from WorldObject.setInstance.
- InstanceManager.createInstance / register / unregister (InstanceManager.cs:343-345, 431-444).
- InstanceTemplate.getEnterGroupType (InstanceTemplate.cs:611-651) and getEnterGroup (658-693): entry group.

## 3. Numbers vs mechanism
- Duration: minutes, from the time block (InstanceManager.cs:138). FinalEmperialTomb 120 (DataPack/instances/FinalEmperialTomb.xml:3), SanctumOfLilith 120, MonsterArena 21 (MonsterArena.xml:4), GoldbergsRoom 20 (GoldbergsRoom.xml:3). Schema: positive integer (xsd/instance.xsd:10).
- Warnings: five minutes and one minute before the end (Instance.cs:807-814, 1256-1264). Fixed in code, not data.
- Empty window: minutes from the time block (InstanceManager.cs:139). FinalEmperialTomb 30 (xml:3), SanctumOfLilith 10 (xml:3), 0 in most others. As written the code does not use it to shorten a zone (D2).
- Eject after death: default 1 minute (Config.General.cs:266, EjectDeadPlayerTime), template default (InstanceTemplate.cs:37), per-template override (InstanceManager.cs:140).
- Finish delay: default 5 minutes (Config.General.cs:264, DefaultFinishTime; read by grep only).
- Group mask: the player bit when min is 1 (InstanceTemplate.cs:268-271); the party bit when max is in 2 to partySize, or min is at most partySize and max is above it (273-277, partySize from Config.Character.ALT_PARTY_MAX_MEMBERS); the command-channel bit when max is above 7 (280-282).
- Max worlds: 80 for Petram (ResidenceOfKingPetram.xml:2). How the cap is enforced: not read.
- Olympiad arena XML has no time block (grep: DataPack/instances/Olympiad/*.xml), so its duration stays at zero (InstanceTemplate.cs:35, setter ignores zero at 100). See D3.

## 4. TypeScript sketch
simplified: omits doors, NPC spawn groups, group-size and level conditions, buffs, exp rates, the DB reenter write and the player-to-world map. Time is a parameter, not a wall-clock timer, and the function returns events instead of sending packets. The warning ladder is checked against the remaining time each tick (fixes D1). The empty grace is applied only when it ends before the natural end (fixes D2). Zero duration is rejected and "no timer" is null (fixes D3).
```ts
// Clean-room shape of an instance-world lifecycle (rules re-expressed in our own words; MIT donor, shape only here).
export type ExitKind = 'origin' | 'fixed' | 'random' | 'town';

export interface InstanceZoneData {
  durationS: number | null;   // null = no timer. 0 is rejected (donor treats 0 as "destroy at once")
  emptyGraceS: number;        // < 0 = never destroyed while empty; 0 = destroyed at once when empty
  ejectDeadS: number;         // 0 = dead players are not ejected
  warnAtS: number[];          // warning checkpoints before the end, e.g. [300, 60]
  exit: ExitKind;
}

export interface World {
  id: number;
  data: InstanceZoneData;
  endAt: number | null;       // ms epoch; null = no timer
  emptySince: number | null;  // set when the last player leaves
  allowed: Set<number>;       // player ids allowed to re-enter (per-party state)
  players: Set<number>;
  deadSince: Map<number, number>;
  warned: Set<number>;
  destroyed: boolean;
}

export type WorldEvent =
  | { kind: 'warn'; secondsLeft: number }
  | { kind: 'eject'; playerId: number }
  | { kind: 'destroy' };

export function newWorld(id: number, data: InstanceZoneData, allowed: number[], now: number): World {
  if (data.durationS !== null && data.durationS <= 0) {
    throw new Error('durationS must be null (no timer) or > 0');
  }
  return {
    id,
    data,
    endAt: data.durationS === null ? null : now + data.durationS * 1000,
    emptySince: null,
    allowed: new Set(allowed),
    players: new Set<number>(),
    deadSince: new Map<number, number>(),
    warned: new Set<number>(),
    destroyed: false,
  };
}

export function onEnter(w: World, playerId: number): void {
  w.players.add(playerId);
  w.emptySince = null;                       // re-entry cancels the empty grace
}

export function onLeave(w: World, playerId: number, now: number): void {
  w.players.delete(playerId);
  w.deadSince.delete(playerId);
  if (w.players.size === 0 && w.data.emptyGraceS >= 0) {
    w.emptySince = now;
  }
}

export function onDeath(w: World, playerId: number, now: number): void {
  if (w.data.ejectDeadS > 0) w.deadSince.set(playerId, now);
}

export function onRevive(w: World, playerId: number): void {
  w.deadSince.delete(playerId);
}

// Called on each server tick (or on each state change in tests). Pure: returns the events to send.
export function tick(w: World, now: number): WorldEvent[] {
  if (w.destroyed) return [];
  const events: WorldEvent[] = [];

  // 1. Warnings fire once each, when the remaining time reaches the checkpoint (not on a re-scheduled step).
  if (w.endAt !== null) {
    const remainingS = (w.endAt - now) / 1000;
    for (const s of w.data.warnAtS) {
      if (!w.warned.has(s) && remainingS <= s) {
        w.warned.add(s);
        events.push({ kind: 'warn', secondsLeft: s });
      }
    }
  }

  // 2. Dead players past their grace are ejected.
  if (w.data.ejectDeadS > 0) {
    for (const [pid, t] of [...w.deadSince.entries()]) {
      if (now - t >= w.data.ejectDeadS * 1000 && w.players.has(pid)) {
        w.players.delete(pid);
        w.deadSince.delete(pid);
        events.push({ kind: 'eject', playerId: pid });
      }
    }
  }

  // 3. Empty grace: destroy early only if the grace ends before the natural end.
  let destroyAt: number | null = w.endAt;
  if (w.players.size === 0 && w.emptySince !== null && w.data.emptyGraceS >= 0) {
    const graceEnd = w.emptySince + w.data.emptyGraceS * 1000;
    if (w.endAt === null || graceEnd < w.endAt) {
      destroyAt = destroyAt === null ? graceEnd : Math.min(destroyAt, graceEnd);
    }
  }

  // 4. Destroy at the chosen time: eject everyone still inside, then remove.
  if (destroyAt !== null && now >= destroyAt) {
    for (const pid of w.players) events.push({ kind: 'eject', playerId: pid });
    w.players.clear();
    w.destroyed = true;
    events.push({ kind: 'destroy' });
  }
  return events;
}

export {};
```
Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ID002-l2dn-instance-lifecycle.ts), exit 0.

## 5. Lands in
Target: origins/server/world-spawns.ts. Parity row: 23 (zone population: despawn on empty with a grace timer; the grace seconds is a zone data field). The donor's timers are wall-clock ThreadPool schedules, not a fixed-step loop; our tick() is the per-tick form, so the server tick sub-line (fixed step, input intake, per-tick NPC budget) applies to where tick() is called, and the donor shows no per-tick budget (not read).

## 6. Gaps and risks
- One engine: the donor's Instance object holds NPCs, doors and players on the game server, which is the shape we want, but the enter and leave hook is a client-facing packet path. Ours must drive membership from the server's own state.
- Zones as data: durationS, emptyGraceS, ejectDeadS, warnAtS and maxWorlds are zone data. The 5 and 1 minute checkpoints are the donor's engine rule; in ours they are data too (warnAtS).
- Server-verified kills: not in this donor's instance code. The eject check reads the player's own dead flag when the timer fires (Instance.cs:1030-1031), which the server must own.
- One ledger: not touched by this code.
- Pit as client: the donor's lifecycle is server-side in shape, but the warnings are sent as packets from the world. In ours, warnings are server events the client only shows.
- MAX_ATTACKERS = 3: no link in this donor. Its group max is set by conditions (GroupMax 100 in Petram, ResidenceOfKingPetram.xml:19), which is not our ruling.
- Defect D1 (warning ladder overshoots): with durations above five minutes, the final step is reached at the end time (remaining is about zero, which is at most one minute), so the one-minute notice arrives at the end, and destroy runs one minute after the end (Instance.cs:813, 1256-1264; read, not run). Fix: warn when remaining reaches each checkpoint, and destroy at the end, as the sketch does (step 1 and step 4).
- Defect D2 (empty window inverted): removePlayer schedules the empty destroy only when remaining time is below the window (Instance.cs:263). Real zones have windows of 30 min (FinalEmperialTomb.xml:3) and 10 min (SanctumOfLilith.xml:3), so for a 120-minute zone the window never shortens its life (read: a zone empty at minute 10 has 110 minutes left, so no task is scheduled). Fix: schedule only when the window ends before the natural end (sketch step 3).
- Defect D3 (zero duration destroys at creation): the template keeps duration zero when there is no time block (InstanceTemplate.cs:35, setter ignores zero at 100). The constructor passes that zero to setDuration (Instance.cs:76), which destroys the world at once (800-802). The Olympiad arena XMLs have no time block, so OlympiadStadium.cs:35 would receive a destroyed world (read, not run). The same file treats zero duration as "destroy when empty" (259), so the two readings conflict. Fix: null means no timer, zero is rejected (the sketch's newWorld).
- Defect D4 (ON_ENTER reenter never applied): InstanceManager parses the type (InstanceManager.cs:252), but Instance applies a reenter time only for ON_FINISH (Instance.cs:1003), and finishInstance has no caller in this tree. ResidenceOfKingPetram.xml:28 and MonsterArena.xml:24 use ON_ENTER, so their reenter limit is never written. Fix: write the reenter time when the player enters for ON_ENTER.
- Defect D5 (nearest-group loop unreachable): getEnterGroupType returns the whole mask whenever it is non-zero (InstanceTemplate.cs:633-636), so the loop that picks the nearest single group (641-647) never runs. With a multi-bit mask that excludes the player's own group, the returned value matches no branch in getEnterGroup (672-680), and the player enters alone. No caller in this tree, so latent. Fix: return the first single-bit group the mask allows, in enum order.
- Low: the eject task store (Instance.cs:1028) overwrites an earlier pending task for the same player without cancelling it. A dead player cannot die again before reviving, so the risk is low.
- Unknown: the party entry path (getEnterGroup plus validateConditions) has no caller in this tree. The donor shows the data and the grouping rules, not a working entry flow.
- Randomness: the RANDOM exit uses the global Rnd (InstanceTemplate.cs:357). Server replay needs a seeded RNG per world.

Reuse tag: MIT, so code may be adapted with the copyright notice kept. This note adapts the shape only; the sketch is written from the rules and copies no donor code.
Brief rule served: addendum "find the DATA tables first" (time, reenter and condition blocks of the instance XML, read); "keep the idea, fix the defect" (D1 to D5, each with a fix); section 5 row 23 (despawn on empty with a grace timer).
