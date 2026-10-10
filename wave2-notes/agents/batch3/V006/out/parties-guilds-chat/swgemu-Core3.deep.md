# swgemu-Core3 (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/group/GroupObjectImplementation.cpp` | Licence: AGPL-3.0 (repo-root `COPYING` and `MMOCoreORB/COPYING` both carry the GNU Affero GPL v3 text; source headers say "See file COPYING") | C++ with ZenIDL (`GroupObject.idl`) | symbol `GroupObjectImplementation::calculateGroupLevel`

Checked: Symbol `calculateGroupLevel` is defined at 562 and closes at 625 (read in full). Callers checked: `addMember` (167), `removeMember` (260), `initializeLeader` (781) and `CreatureObject::setLevel` (652), read as call lines inside their functions, not their full bodies. Consumer chain: `SpawnAreaImplementation::getPlayerSpawnLevel` (404, read in full) and `tryToSpawn` (181; read at 181-245 and 262-330; the random-position block 246-261 was not read). The category also covers guilds and chat; the guild manager and chat room code were NOT read, so this note is about the party level only. Confidence: high on the party-level formula and its recalculation points; medium-high on the spawn consumer. camera_scope: not a camera topic.

Best transferable idea: A party's encounter level is the highest member's level in full plus one fifth of every other player and pet level, rounded once, computed on the server from the member list, so join order does not matter.
Decision (proposed): adapt — the order-independent rule is a small testable way to pick a zone encounter level from a party, but the donor uses it only for spawn difficulty; Frankendom's MAX_ATTACKERS = 3 fights must not get stronger enemies from party size without a ruling, so take the shape for encounter choice only.
Acceptance: a server test shows a party of levels 10, 8 and 6 gets encounter level 13 in every member order, a solo player gets their own level, a player at level 13 meeting a lair of level 40 picks building level 2, and no fight damage or hit number changes with party size.

## 1. Mechanism

- One integer, the party level, is computed from the member list of a group (players and pets; a non-player, non-pet member adds nothing). It is stored on the group object as `groupLevel`, with a second integer `factionPetLevel` (IDL 34-35).
- It is recalculated, not read on demand: on every member add (167), on every member removal (260), when the leader is first set up (781), and when a grouped creature's level changes (652). Not per frame.
- Order of operations inside `calculateGroupLevel` (562-624):
  - (a) reset `highestPlayer = 0` (563), the float accumulator `newLevel = 0` (564), and `factionPetLevel = 0` (565);
  - (b) walk every group member in list order (584). A pet adds `level / 5` to `newLevel` (598-605); a faction pet also adds `level / 5` to `factionPetLevel` (601-602). A player above the highest player so far adds `level - highest + highest / 5` and becomes the new highest (607-609); any other player adds `level / 5` (611);
  - (c) `groupLevel = round(newLevel)` (624).
- Worked by hand: players [10, 8, 6] give 10 + 8/5 + 6/5 = 12.8 before rounding, 13 after (the 8 and the 6 each add a fifth). Players [6, 10] and [10, 6] both reach 11.2 before rounding, so the result does not depend on the order in which the list was built.
- Closed form (derived from the loop, checked by the Python transcription below): the result is `round(H + (sum of other player levels + sum of pet levels) / 5)`, where H is the highest player level. The highest player counts in full; every other player and every pet counts one fifth.
- Python transcription of lines 562-624 (my own script, run on the Mac, not on the donor): 20,000 random groups of 1-6 members, each tested in original and shuffled order plus the closed form; 0 mismatches.
- Consumer: `getPlayerSpawnLevel` (404) returns the group level for a grouped player (415) and `calculatePlayerLevel` for a solo player (428; not read). `tryToSpawn` (181) calls it (278) and sets `difficultyVariable = playerLevel / lairLevel` (301). Lair building level starts at 5 (303) and steps down to 4, 3, 2, 1 as the ratio falls below 1.0, 0.75, 0.5, 0.25 (305-312).
- `tryToSpawn` is driven by player position updates: `notifyPositionUpdate` (23) returns early when no players are in range or the minimum lair spawn interval has not passed (it also returns on server loading or shutdown, world spawns disabled, or an invisible player), otherwise it calls `tryToSpawn(player)` (57).
- A getter variant: `getGroupLevel(false)` returns `groupLevel - factionPetLevel` (IDL 115-119), so the faction pet part can be removed from the displayed level.

## 2. Key functions

- `calculateGroupLevel`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/group/GroupObjectImplementation.cpp` 562-625. The whole party-level rule.
- Legacy block, not live: lines 571-582 are a comment containing an older loop over a fixed 20 members at level 25 with the same highest-plus-fifth rule (the loop header is at 572).
- Recalculation hooks: `addMember` line 167, `removeMember` line 260, `initializeLeader` line 781 (same file); `CreatureObjectImplementation::setLevel` line 652 (`CreatureObjectImplementation.cpp`).
- Consumer: `getPlayerSpawnLevel` 404-432 (`/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/region/SpawnAreaImplementation.cpp`) and its caller `tryToSpawn` 278-312 (same file).
- Getter: `getGroupLevel` in `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/group/GroupObject.idl` 115-119.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Highest member counts in full; every other member adds a fraction of its level | Fraction 1/5 for other players and pets (theirs, 605 and 611; `/ 5.f`) |
| Highest-so-far bookkeeping makes the total independent of order | Term `highest / 5` in the new-maximum branch (608) |
| Faction pets tracked in a second total, subtracted for the API variant | Same 1/5 fraction (602); the total is an `int` (IDL 35), so it truncates on each add |
| Round the float total to an integer once at the end | `round` (624) |
| Encounter difficulty as a ratio of player level to lair level, banded into 1-5 | Bands at 0.25, 0.5, 0.75, 1.0 (305-311); default 5 (303) |
| Solo player uses their own level | `calculatePlayerLevel` (428; not read) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's single loop and the int truncation of the faction total. It omits the legacy comment block, the debug output, the null checks, the ship and pet-control lookups, the NPC case (an NPC member adds nothing in the donor, and the sketch has no NPC member type), the random-position block and the spawn caps and placement that follow `tryToSpawn`. It reorders nothing: the total is rounded once at the end, as in the donor.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Member =
  | { kind: "player"; level: number }
  | { kind: "pet"; level: number; faction: boolean };

interface PartyLevel {
  level: number;            // rounded party level used for encounter difficulty
  factionPetLevel: number;  // integer total; truncated at each add, as the donor stores it as int
}

// Party level: the highest player counts in full; every other player and every pet adds one fifth of its level.
function partyLevel(members: Member[]): PartyLevel {
  let highest = 0;
  let total = 0;      // float accumulator
  let faction = 0;    // int accumulator
  for (const m of members) {
    if (m.kind === "pet") {
      if (m.faction) faction = Math.trunc(faction + m.level / 5);
      total += m.level / 5;
    } else if (m.level > highest) {
      total += m.level - highest + highest / 5;
      highest = m.level;
    } else {
      total += m.level / 5;
    }
  }
  return { level: Math.round(total), factionPetLevel: faction };
}

// Group level as the API returns it: optionally without the faction pet part.
function groupLevelFor(p: PartyLevel, includeFactionPets: boolean): number {
  return includeFactionPets ? p.level : p.level - p.factionPetLevel;
}

// Level used to pick an encounter: a grouped player uses the party level, a solo player uses their own.
function encounterLevel(group: Member[] | null, soloLevel: number): number {
  return group !== null && group.length > 0 ? partyLevel(group).level : soloLevel;
}

// Lair building level from the player-to-lair level ratio (thresholds 0.25, 0.5, 0.75, 1.0; default 5).
function lairBuildingLevel(playerLevel: number, lairLevel: number): number {
  const ratio = playerLevel / lairLevel;
  if (ratio < 0.25) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.75) return 3;
  if (ratio < 1) return 4;
  return 5;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/party_level_tc.ts`).

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (the zone population owner): the encounter level a zone spawn uses, computed on the server from the party's member list. Parity-checklist row 23 (zone population: spawn caps, respawn, despawn; the encounter level is one of its inputs). Frankendom file not opened in this pass.
- today: (not read) the Frankendom spawn file named above.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: zones as data (encounter level is an input, the bands are data), one engine (computed on the server from one member list, never on the client); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Scope: the donor uses the party level only to pick the difficulty of a lair spawn. It does not feed damage, hit chance or fight stats. Frankendom has MAX_ATTACKERS = 3 many-on-one fights; if the party level is used to scale enemy damage, that needs its own ruling. Keep it to encounter choice (zone data) for now.
- Stale state: the donor caches `groupLevel` and recalculates at the hooks listed (167, 260, 781, 652). I read only these four hooks. A level change that bypasses `setLevel` would leave a stale value. Frankendom should compute the party level on demand from the server's member list (one ledger, server-verified), not cache it on the group.
- Faction pets: the donor's int truncation of the faction total (IDL 35, line 602) is a quirk. Frankendom has no pet model in the parity rows, so drop the pet term unless pets are added by ruling.
- Band thresholds (0.25, 0.5, 0.75, 1.0) and the 1/5 fraction are hard-coded in the donor. Frankendom should make them zone data fields (see the JSON sidecar), with the 1/5 fraction an engine rule.
- The solo branch uses `calculatePlayerLevel` (428), which was not read. The spawn caps (197, 236) and random placement (246-261) were not read in full and belong to parity row 23, not to this note.
- Guild and chat code (`GuildManagerImplementation.cpp`, `ChatRoomImplementation.cpp`) in this category was not read. Nothing in this note covers them.
