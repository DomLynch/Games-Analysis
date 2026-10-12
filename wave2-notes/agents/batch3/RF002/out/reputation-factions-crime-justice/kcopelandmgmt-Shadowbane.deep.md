# kcopelandmgmt-Shadowbane (reputation-factions-crime-justice, cell 1)

Donor: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/BuildingManager.java` (IsPlayerHostile, 439-495), with `src/engine/mobileAI/MobAI.java` (GuardCanAggro, 1211-1272) | Licence: MIT (LICENSE line 9 "MIT License", read; code may be adapted) | Java | symbol `IsPlayerHostile` / `GuardCanAggro`

Checked: Read in full: BuildingManager.IsPlayerHostile (430-495), MobAI.GuardCanAggro (1211-1272), MobAI.CheckForPlayerGuardAggro (1161-1209), MobAI.GuardCaptainLogic (1032-1050), City.onEnter (981-1028), City.onExit (1031-1072), CombatManager.AttackTarget (102-150; its caller at line 98 read), SimulationManager pulse (35, 190-207). Callers: GuardCanAggro has two callers (MobAI 1043 and 1198), both read. IsPlayerHostile callers: only City.java 372 read; VendorDialogMsg.java 121 and City.java 426 not read. Not read: isLocationWithinSiegeBounds, Guild.getGuild (Guild.java 352), the death/respawn path for outlaws, the second caller of AttackTarget (CombatManager 1299), the SQL view behind the 1 hr / 24 hr kill windows. Confidence: high on the hostility and outlaw code paths; medium on the outlaw lifecycle (no read of death). camera_scope: not a camera cell.

## 1. Mechanism

Three linked rules. All are server-side and keyed to a place (a city, with its bounds).

(a) Hostility to a building's owner (IsPlayerHostile, BuildingManager.java 439-495). Order: same nation (not errant) or same guild is never hostile (448-449). Normal mode (`reverseKOS` false, line 451): hostile if an active individual entry lists the player (453-455), or an active guild entry lists the player's guild (460-463), or a nation entry lists the player's nation with friend type NATION (465-466). Otherwise not hostile. Reverse-KOS mode (line 472 onward): the list is an exemption. An active individual entry exempts (474-475), an active guild entry exempts (479-482), a nation entry exempts only if active and of type NATION (484-485). Otherwise hostile (489). A guild-less player in reverse mode falls through to the same hostile result (the errant branch is a TODO at 468 and 487), and a guild-less player in normal mode falls through to not hostile (495).

(b) Outlaw flag per city (City.java 58; CombatManager.java 147-148). When a player attacks (AttackTarget, CombatManager 102; entered from the attack message at 98), and the player stands in a city whose nation differs from theirs, the player's id is appended to that city's `cityOutlaws` list once (147-148). Clearing is by a periodic pulse, not by the exit event. SimulationManager runs `city.onEnter()` for every city every CITY_PULSE = 2000 ms (SimulationManager 35, 204, 207). onEnter scans players inside the ZONE extent (City.java 989; the ZONE extent value 875 is in Enum.java 2310) and adds each one to the city memory only if they are inside siege bounds (1005-1018). onExit (1031) walks the memory. A player still inside siege bounds is skipped (1045). A player who has left is removed from memory (1067) and from `cityOutlaws` (1069-1070). Net effect: an outlaw stays flagged while in the city and loses the flag on the first pulse after leaving, up to about 2 s later.

(c) Guard aggro gate (MobAI.GuardCanAggro, 1211-1272). Order: same nation as the guard, never (1215). The city's outlaw list gives aggro (1219 for guard minions through their owner's building; 1222 otherwise). Then the city's `reverseKOS` flag decides (1228). Reverse mode: the list exempts. An active individual entry (1233-1234), a guild entry (1238-1239) or a nation entry (1243-1244) returns no aggro; with no listed entry, aggro (1246). Normal mode: the list grants aggro. An active individual (1255-1256), a guild entry (1260-1261) or a nation entry (1265-1266) returns aggro; otherwise no aggro (1272). An exception returns no aggro.

Callers. CheckForPlayerGuardAggro (1161) runs the gate for each player in the mob's aggro map (1198), after dropping null or dead players and skipping players it cannot see (1193). GuardCaptainLogic (1032) runs that scan when the guard has no target (1036), takes the top hate-table target (1038), and re-applies the gate before setting it (1043). So a guard captain can take a hate target only if the gate allows it.

Murder counts (secondary, partly not read). PvpRecord.write() (PvpRecord.java 306-308) advances the attacker's kill counter and the victim's death counter in the warehouse (`CharacterRecord.advanceKillCounter`). The 1 hr, 24 hr and total kill windows come from SQL columns HOURLYKILLS, DAILYKILLS and KILLCOUNT (PvpRecord.java 150-171); the query is not in this repo (not read). The donor has no bounty and no jail code in this tree.

Tick: the guard scan is driven by the mob AI loop (call sites at MobAI 919, 1036, 1080); the loop cadence was not read.

## 2. Key functions

- `IsPlayerHostile`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/BuildingManager.java` 439-495. Hostility to one building's owner, with normal and reverse-KOS modes.
- `GuardCanAggro`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/mobileAI/MobAI.java` 1211-1272. The guard aggro gate: same nation, outlaw list, then the KOS list in either mode.
- `CheckForPlayerGuardAggro`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/mobileAI/MobAI.java` 1161-1209. Scans the aggro map and calls the gate per player.
- `GuardCaptainLogic`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/mobileAI/MobAI.java` 1032-1050. Hate-table target, re-checked by the gate.
- `City.onEnter` / `City.onExit`: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/objects/City.java` 981-1072. Presence memory and outlaw clearing.
- `AttackTarget` (outlaw mark at 147-148): `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/CombatManager.java` 102-150.
- Pulse: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/SimulationManager.java` 35, 190-207.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hostility = (same faction is exempt), then a per-place list in normal or reverse mode, entries by kind (player / guild / nation), each with an active bit | Friend-type codes INDIVIDUAL 2, GUILD 4, NATION 5 (Condemned.java 20-22); reverseKOS default false (City.java 88) |
| Outlaw flag set on a hostile act inside a place owned by another faction; cleared by a membership diff on a periodic pulse | Pulse 2000 ms (SimulationManager 35); ZONE extent 875 (Enum.java 2310; the value line is 10 characters, so the receipt is the enum header at 2307, the same precedent as the Quake note) |
| Guard gate order: same faction never, outlaw always, then the list decides | None (order of checks) |
| Clear on leave: no timer per player, a diff against the last pulse | None |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (same faction first, then outlaw flag, then the KOS list) and the pulse-diff clear. It leaves out the siege-bounds membership rule, the errant (guild-less) TODO branches, the NATION friend-type check, the guild-of-nation comparison, and the timer itself (the caller runs `zonePulse` every `ZONE_PULSE_MS`). It applies the `active` bit to every entry kind, which the donor does not do in GuardCanAggro (defect 1 below).

```ts
// Licence: MIT (donor). Clean-room sketch of the shape only: zone outlaw flag, KOS list, guard gate.
type KosKind = "player" | "guild" | "nation";

interface KosEntry {
  kind: KosKind;
  id: number;        // player id, guild id or nation id, by kind
  active: boolean;   // donor checks this only for player entries in the guard gate
}

interface Actor {
  id: number;
  guild: number | null;
  nation: number | null;
}

interface ZoneRules {
  reverseKos: boolean;      // true: guards attack everyone NOT on the list
  kos: KosEntry[];
  outlaws: Set<number>;     // players flagged for hostile acts inside this zone
  memory: Set<number>;      // players the zone saw inside its bounds
}

const ZONE_PULSE_MS = 2000; // donor value; the caller runs zonePulse on this period

function matches(e: KosEntry, t: Actor): boolean {
  if (e.kind === "player") return e.id === t.id;
  if (e.kind === "guild") return t.guild === e.id;
  return t.nation === e.id;
}

// A hostile act inside a zone owned by another nation flags the attacker once.
function markOutlaw(zone: ZoneRules, attacker: Actor, zoneNation: number | null): void {
  if (attacker.nation === null || attacker.nation === zoneNation) return;
  zone.outlaws.add(attacker.id);
}

// Pulse: remember who is inside; anyone remembered but no longer inside loses the flag.
function zonePulse(zone: ZoneRules, insideNow: Set<number>): void {
  for (const id of insideNow) zone.memory.add(id);
  for (const id of [...zone.memory]) {
    if (insideNow.has(id)) continue;
    zone.memory.delete(id);
    zone.outlaws.delete(id);
  }
}

// Guard gate, donor order: same nation never; outlaw yes; otherwise the KOS list decides.
function guardMayAggro(zone: ZoneRules, guardNation: number | null, target: Actor): boolean {
  if (target.nation !== null && target.nation === guardNation) return false;
  if (zone.outlaws.has(target.id)) return true;
  const listed = zone.kos.some((e) => e.active && matches(e, target)); // fix: isActive on every kind
  return zone.reverseKos ? !listed : listed;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/rf002-shadowbane-hostility.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/hostility.ts` (new): one place for the zone outlaw flag and the KOS list, read by the guard aggro gate. The flag is written by the engine on a hostile act and cleared by the zone presence pulse.
- Parity-checklist row 2 (AI brain): the guard aggro gate and the captain's hate-target re-check.
- Zone spawns and guard counts (row 23) are not in this note.
- Reuse tag: adapt-from-idea (MIT: code may be adapted; this sketch is written from the shape, not translated)
- Brief rule served: 1 (one engine: hostility and the outlaw flag are decided in the engine, not the client); rules 7-9 n/a

Best transferable idea: Scope the wanted flag to a place: set it on a hostile act inside a rival zone, clear it by diffing who is inside on a short pulse, and have guards check the flag before any KOS list.
Decision (proposed): adapt — keep the place-scoped flag and the membership-diff clear, but replace the nation/guild/player triple with one faction id on the character, and fix the three defects below; the flag must live in the server (one ledger, server-verified), with the zone radius as zone data.
Acceptance: a server test where a player who swings at anything inside a rival-faction zone is flagged, the zone's guards aggro within one tick, the flag clears within one pulse (2 s) after the player leaves the zone bounds, and a deactivated guild entry no longer draws guards.

## 6. Gaps and risks

- Defect 1 (keep the idea, fix the check): GuardCanAggro ignores `isActive` for guild and nation entries (MobAI 1238-1243 in reverse mode, 1260-1265 in normal mode), while IsPlayerHostile checks it (BuildingManager 462, 466, 481, 485). A deactivated guild or nation entry still draws guards. fix: one `matches()` that requires `active` for every kind, with a test.
- Defect 2 (keep the idea, fix the null): the attack path reads `playerCharacter.getGuild().getNation()` with no null check (CombatManager 147). An attacker with no guild would throw there (reachability not read). fix: treat no guild as no nation and skip the flag.
- Defect 3 (keep the idea, fix the data structure): `cityOutlaws` is an ArrayList with contains and remove (City.java 58, 1069-1070), so each check is linear. fix: a Set.
- Timing: the flag clears on the next 2 s pulse, not on the exit event. A zone-leave event would be exact; the pulse is acceptable for a flag that only gates guards, but a client display would lag by up to one pulse.
- Defect-like TODO: the donor never implements the errant (guild-less) KOS case (BuildingManager 468, 487). Frankendom has to decide that case itself.
- Not in this donor: bounties, jail, karma and fame. Murder counts exist only as warehouse counters and windowed SQL (not read), not as a gate.
- Frankendom rulings: "zones as data" means the reverse-KOS flag and the zone radius become zone fields. The donor keeps the 2000 ms pulse and the 875 extent as engine or enum constants; the radius is the one a designer would tune per zone.
- Outlaw lifecycle not read: whether the flag clears on death, on a guard kill or on logout. Do not port those rules until read.
- MAX_ATTACKERS = 3 is not in this donor. The guard captain picks by hate table (MobAI 1038), so a guard pack can exceed three attackers; the engine must cap it.
