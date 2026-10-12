# kcopelandmgmt-Shadowbane (reputation-factions-crime-justice, cell 1)

Donor: `/mnt/frankendom-donors/kcopelandmgmt-Shadowbane/src/engine/gameManager/BuildingManager.java` (IsPlayerHostile, 439-495), with `src/engine/mobileAI/MobAI.java` (GuardCanAggro, 1211-1272) | Licence: MIT (LICENSE line 9 "MIT License", read; code may be adapted) | Java | symbol `IsPlayerHostile` / `GuardCanAggro`

Checked: Read in full: BuildingManager.IsPlayerHostile (430-495), MobAI.GuardCanAggro (1211-1272), MobAI.CheckForPlayerGuardAggro (1161-1209), MobAI.GuardCaptainLogic (1032-1050), City.onEnter (981-1028), City.onExit (1031-1072), CombatManager.AttackTarget (102-150; its caller at line 98 read), SimulationManager pulse (35, 190-207). Callers: GuardCanAggro has two callers (MobAI 1043 and 1198), both read. IsPlayerHostile callers: only City.java 372 read; VendorDialogMsg.java 121 and City.java 426 not read. Not read: isLocationWithinSiegeBounds, Guild.getGuild (Guild.java 352), the death/respawn path for outlaws, the second caller of AttackTarget (CombatManager 1299), the SQL view behind the 1 hr / 24 hr kill windows. Confidence: high on the hostility and outlaw code paths; medium on the outlaw lifecycle (no read of death). camera_scope: not a camera cell.

## 1. Mechanism

Three linked rules. All are server-side and keyed to a place (a city, with its bounds).

(a) Hostility to a building's owner (IsPlayerHostile, BuildingManager.java 439-495). Order: same nation (not errant) or same guild is never hostile (448-449). Normal mode (`reverseKOS` false, line 451): hostile if an active individual entry lists the player (453-455), or an active guild entry lists the player's guild (460-463), or a nation entry lists the player's nation with friend type NATION (465-466). Otherwise not hostile. Reverse-KOS mode (line 472 onward): the list is an exemption. An active individual entry exempts (474-475), an active guild entry exempts (479-482), a nation entry exempts only if active and of type NATION (484-485). Otherwise hostile (489). A guild-less player in reverse mode falls through to the same hostile result (the errant branch is a TODO at 468 and 487), and a guild-less player in normal mode falls through to not hostile (495).

(b) Outlaw flag per city (City.java 58; CombatManager.java 147-148). When a player attacks (AttackTarget, CombatManager 102; entered from the attack message at 98), and the player stands in a city whose nation differs from theirs, the player's id is appended to that city's `cityOutlaws` list once (147-148). Clearing is by a periodic pulse, not by the exit event, and it is a bounds test, not a diff against an in-zone set. SimulationManager runs `city.onEnter()` for every city every CITY_PULSE = 2000 ms (SimulationManager 35, 204, 207). onEnter scans players inside the ZONE extent (City.java 989; the ZONE extent value 875 is in Enum.java 2310) and adds each one to the city memory only if they are inside siege bounds (1005-1018). onExit (1031) takes the in-zone set as a parameter but never reads it; it walks the memory only. A remembered player still inside siege bounds is skipped (1045). A remembered player now outside siege bounds is removed from memory (1067) and from `cityOutlaws` (1069-1070). Net effect: an outlaw who was remembered stays flagged while inside siege bounds and loses the flag on the first pulse after leaving them, up to about 2 s later. Leak: AttackTarget flags anyone standing in the city area (the ZONE extent), but only players who were inside siege bounds are ever put in memory. A player flagged while outside siege bounds is never in memory, so the pulse never clears that flag. onExit also calls `PlayerCharacter.getFromCache` and uses the result with no null check (1043-1045), so a cached-out player would throw.

(c) Guard aggro gate (MobAI.GuardCanAggro, 1211-1272). Order: same nation as the guard, never (1215). The city's outlaw list gives aggro (1219 for guard minions through their owner's building; 1222 otherwise). Then the `reverseKOS` flag of the city's tree-of-life building decides (1228, `getTOL().reverseKOS`). Reverse mode: the list exempts. An active individual entry (1233-1234), a guild match (1238-1239) or a nation match (1243-1244) returns no aggro; with no listed entry, aggro (1246). The gate does not look at the entry type: every Condemned row is tested as a player, as a guild and as a nation (`Guild.getGuild(entry.guildUID) == target.getGuild()`, and `== target.getGuild().getNation()`). See defect 1. Normal mode: the list grants aggro. An active individual (1255-1256), a guild match (1260-1261) or a nation match (1265-1266) returns aggro; otherwise no aggro (1272). An exception returns no aggro.

Callers. CheckForPlayerGuardAggro (1161) runs the gate for each player in the mob's aggro map (1198), after dropping null or dead players and skipping players it cannot see (1193). GuardCaptainLogic (1032) runs that scan when the guard has no target (1036), takes the top hate-table target (1038), and re-applies the gate before setting it (1043). So a guard captain can take a hate target only if the gate allows it.

Murder counts (secondary, partly not read). PvpRecord.write() (src/engine/db/archive/PvpRecord.java 308-309) advances the attacker's kill counter and the victim's death counter in the warehouse (`CharacterRecord.advanceKillCounter`). The 1 hr, 24 hr and total kill windows come from SQL columns HOURLYKILLS, DAILYKILLS and KILLCOUNT (PvpRecord.java 150-171); the query is not in this repo (not read). The donor has no bounty and no jail code in this tree.

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
| Outlaw flag set on a hostile act inside a place owned by another faction; cleared on a periodic pulse by a bounds test on the remembered players (donor leaks flags set outside the bounds; the fix clears by diff) | Pulse 2000 ms (SimulationManager 35); ZONE extent 875 (Enum.java 2310; the value line is 10 characters, so the receipt is the enum header at 2307, the same precedent as the Quake note) |
| Guard gate order: same faction never, outlaw always, then the list decides | None (order of checks) |
| Clear on leave: no timer per player, a diff against the last pulse | None |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (same faction first, then outlaw flag, then the KOS list) and the pulse-diff clear, which also fixes the donor leak (the donor only clears players it remembered inside siege bounds; the sketch clears any flagged player who is not inside now). It leaves out the siege-bounds membership rule, the errant (guild-less) TODO branches, the NATION friend-type check, the guild-of-nation comparison, and the timer itself (the caller runs `zonePulse` every `ZONE_PULSE_MS`). It applies the `active` bit and the entry kind, which the donor does not do in GuardCanAggro (defect 1 below).

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

// Pulse: remember who is inside; anyone flagged but no longer inside loses the flag.
function zonePulse(zone: ZoneRules, insideNow: Set<number>): void {
  for (const id of insideNow) zone.memory.add(id);
  for (const id of [...zone.memory]) {
    if (insideNow.has(id)) continue;
    zone.memory.delete(id);
  }
  // fix: donor clears only remembered players; also clear flags set outside the bounds
  for (const id of [...zone.outlaws]) {
    if (!insideNow.has(id)) zone.outlaws.delete(id);
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

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/rf002-shadowbane-hostility.ts), exit 0 (re-run after the 2026-10-12 pulse fix).

## 5. Lands in

- TARGET `src/fight/hostility.ts` (new): one place for the zone outlaw flag and the KOS list, read by the guard aggro gate. The flag is written by the engine on a hostile act and cleared by the zone presence pulse.
- Parity-checklist row 2 (AI brain): the guard aggro gate and the captain's hate-target re-check.
- Zone spawns and guard counts (row 23) are not in this note.
- Reuse tag: adapt-from-idea (MIT: code may be adapted; this sketch is written from the shape, not translated)
- Brief rule served: 1 (one engine: hostility and the outlaw flag are decided in the engine, not the client); rules 7-9 n/a

Best transferable idea: Scope the wanted flag to a place: set it on a hostile act inside a rival zone, clear it by diffing who is inside on a short pulse, and have guards check the flag before any KOS list.
Decision (proposed): adapt — keep the place-scoped flag and the membership-diff clear, but replace the nation/guild/player triple with one faction id on the character, and fix the three defects below; the flag must live in the server (one ledger, server-verified), with the zone radius as zone data.
Acceptance: a server test where a player who swings at anything inside a rival-faction zone is flagged, the zone's guards aggro within one tick, the flag clears within one pulse (2 s) after the player leaves the zone bounds (including a flag set at the edge, outside the inner bounds), a deactivated guild entry no longer draws guards, and a player-type row never matches a guild-less target.

## 6. Gaps and risks

- Defect 1 (keep the idea, fix the check; bigger than first written): GuardCanAggro ignores entry type and `isActive` for guild and nation matches (MobAI 1238-1244 in reverse mode, 1260-1266 in normal mode), while IsPlayerHostile checks both (BuildingManager 462, 466, 481, 485). Every row is tested as player, guild and nation. A deactivated guild or nation entry still draws guards, and a nation row ignores its friend type. `Guild.getGuild(0)` returns the errant guild (Guild.java 354-355), so a player row with guildUID 0 matches every guild-less target: in normal mode all errant players draw guards, in reverse mode all of them are exempt. fix: one `matches()` that checks the entry kind and requires `active`, with a test for a player row and a guild-less target.
- Defect 2 (keep the idea, fix the null): the attack path reads `playerCharacter.getGuild().getNation()` with no null check (CombatManager 147). An attacker with no guild would throw there (reachability not read). fix: treat no guild as no nation and skip the flag.
- Defect 4 (keep the idea, fix the clear): the pulse clears only players remembered inside siege bounds, so a flag set outside them never clears (City 1005-1018, 1067-1071); and onExit has no null check on the cached player (1043-1045). fix: clear by diff against who is inside now, skip missing players.
- Defect 3 (keep the idea, fix the data structure): `cityOutlaws` is an ArrayList with contains and remove (City.java 58, 1069-1070), so each check is linear. fix: a Set.
- Timing: the flag clears on the next 2 s pulse, not on the exit event. A zone-leave event would be exact; the pulse is acceptable for a flag that only gates guards, but a client display would lag by up to one pulse.
- Defect-like TODO: the donor never implements the errant (guild-less) KOS case (BuildingManager 468, 487). Frankendom has to decide that case itself.
- Dead config: the City `reverseKOS` DB load is commented out (City.java 163-164), so the city's own flag is always false; guards read the tree-of-life building's flag instead.
- Not in this donor: bounties, jail, karma and fame. Murder counts exist only as warehouse counters and windowed SQL (not read), not as a gate.
- Frankendom rulings: "zones as data" means the reverse-KOS flag and the zone radius become zone fields. The donor keeps the 2000 ms pulse and the 875 extent as engine or enum constants; the radius is the one a designer would tune per zone.
- Outlaw lifecycle not read: whether the flag clears on death, on a guard kill or on logout. Do not port those rules until read.
- MAX_ATTACKERS = 3 is not in this donor. The guard captain picks by hate table (MobAI 1038), so a guard pack can exceed three attackers; the engine must cap it.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) 'Cleared by a membership diff' (sec 3 table, best idea, sketch zonePulse, decision) does not match the donor: City.onExit (1031-1072) takes currentMemory as a parameter but never reads it; it drops memory entries whose location fails isLocationWithinSiegeBounds (1045), not entries absent from the current in-zone set. Sec 1(b) describes the bounds test correctly, but the sketch implements a different (diff) rule. 2) Consequence not noted: AttackTarget (CombatManager 145-148) flags anyone in the ZONE city area, but onEnter only adds players to _playerMemory when inside siege bounds (1005-1018) and onExit only clears memory members (1067-1071), so an outlaw flagged outside siege bounds is never cleared by the pulse (leak). Also onExit dereferences PlayerCharacter.getFromCache without a null check (1043-1045). 3) PvpRecord is at src/engine/db/archive/PvpRecord.java; counters are at 308-309 (note says 306-308) - minor. All other sampled lines matched: IsPlayerHostile 439-495 incl. 448-449, 453-466, 472-489, 495; GuardCanAggro 1211-1272 incl. 1215, 1219/1222, 1228, 1233-1266; CheckForPlayerGuardAggro 1161-1209; GuardCaptainLogic 1032-1050; CombatManager 147-148; CITY_PULSE=2000 (SimulationManager 35, 204, 207); ZONE(875) Enum 2310; Condemned 20-22; reverseKOS=false City 88; cityOutlaws ArrayList City 58; MIT licence.
Missed: MobAI.java 1238-1244 and 1260-1266: GuardCanAggro does not look at entry type at all. Every Condemned row is tested as player, guild and nation: Guild.getGuild(entry.guildUID) == target.getGuild() (and == nation). Guild.getGuild(0) returns the errant guild (Guild.java 354-355), so a player-type row (guildUID 0) matches every guild-less (errant) target: in normal mode it makes all errant players aggro-able, in reverse mode it exempts all of them. It also ignores friendType for nation rows, and ignores isActive for guild/nation (note found only the isActive part). This is a bigger defect than the 'defect 1' in the note and the sketch's matches() hides it. Also City.java 164: reverseKOS DB load is commented out, so City.reverseKOS is always false (the guard reads the TOL building's flag instead).

Fixed 2026-10-12 (Sonnet fixer): verified all three errors and the missed defect on the donor. Corrected clear rule (bounds test on remembered players, not a diff); added the leak for flags set outside siege bounds and the missing null check; PvpRecord path and lines (308-309); guard reads the TOL building reverseKOS; City reverseKOS load is commented out (163-164); rewrote defect 1 (entry type ignored, errant-guild match via Guild.getGuild(0)); sketch zonePulse now also clears flags set outside the bounds; acceptance lines extended.
