# levy-street-world-of-claudecraft (instancing-dungeons, cell 19)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` | Licence: MIT | TypeScript | symbol `enterDungeon / instanceKeyFor / leaveDungeon` | input line 356 verified: `enterDungeon` at 356 (closes near 715), `instanceKeyFor` at 106 (closes at 118), `leaveDungeon` at 789 (closes at 870). The input's line 356 matches `enterDungeon`. Supporting: `claimInstance` 951-1037, `freeInstance` 1042-1082, `updateInstances` 1484-1537; origin math in `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/data.ts` 1107-1118.

## 1. Mechanism

- Each dungeon has a fixed number of instance slots (24 per dungeon, `INSTANCE_SLOT_COUNT` in `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/data.ts` 1094, pre-allocated empty slots). Every slot sits at a fixed world origin (x from the dungeon's index band, 99,400 + 900 + 600 x index, with an overflow band for index 7 and up; z = -1250 + slot x 500; data.ts 1107-1118). A slot is either free (no key) or claimed by one key: `party:<id>` or `solo:char:<durable id>`.
- Entry (`enterDungeon`, 356-714): reject a dead player who has not released a ghost (376); reject raid rules that do not match the party type (380-390); reject special-door seals, the Ignivar combat and gate rules, raid lockouts, heroic locks and a conflicting reset cooldown (391-615). Compute the key with `instanceKeyFor` (106-118, called at 404): a party key if in a party, else a durable character key (so a relog or character swap rejoins the same claimed slot), else the entity key (`solo:<entity id>` when no durable id is supplied).
- Slot choice: an existing claim for this key always wins, whatever the current difficulty selection (481-486); a player rejoining a claim of another difficulty is told how to reset (625-662). Otherwise take the first free slot for this dungeon (`partyKey === null`, 646; the Ignivar chain prefers the slot of its previous room, 638-645). If none, refuse with "All instances of <name> are busy" (647-650). Claiming (`claimInstance`, 951-1037) sets the key and difficulty, clears the per-claim sets, spawns that dungeon's mobs (each with a level rolled by the sim's rng between the template's min and max, then difficulty-tuned, 969-992), NPCs and objects at the slot origin plus authored offsets, and creates the exit object.
- Placement (672-687): any gather session is cancelled, the player is moved to the slot origin plus the dungeon's entry offset on the ground, with facing reset and any target and auto-attack cleared. `emptyFor` is reset to zero, the entrant is added to the claim's entered-by set, the player leaves any arena queue (696), and a released ghost resurrects at the entrance (705). A party smaller than the suggested size gets a warning log (664-671).
- Occupancy and cleanup (`updateInstances`, 1484-1537, run when the tick count is a multiple of 20, so once per second, 1485): a slot with any player entity inside its claim footprint (`instanceClaimContains`, a box of half-width 120 in x and 250 in z around the origin, dungeons.ts 241-253, plus a wider circle clipped to the slot's z band for the one Nythraxis boss arena, 257-282) is kept (empty counter zero). An empty claimed slot counts up once per second. When the counter reaches the empty timeout (300 s, `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/types.ts` 258), or the longer 15 min (`INSTANCE_CLEARED_EMPTY_TIMEOUT`, dungeons.ts 104) if the slot has a cleared-by record, `freeInstance` (1042-1082) drops its mobs, NPCs, objects and exit, clears targets and reset locks, and sets the slot back to free. The Ignivar raid rooms are occupied, graced and freed as a family (1504-1533).
- Exit (`leaveDungeon`, 789-870): finds the dungeon from the player's x position (`dungeonAt`, 797), refuses while a sealed boss arena is engaged (799-807), and otherwise detaches the player from the dungeon and sets them down at its outside door, seated on the standing surface, with the door's facing and the target cleared (843-868). In the Ignivar raid rooms the exit is different: while the room's boss fight is live no exit works (the leaver gets a notice and stays), and the rooms past the Halls route the exit back one room through `enterDungeon` with the backtrack option instead of outside; only the lift and the Halls set the player down in the open world (`dungeons.ts` 808-842).
- Tick: entry and exit on command (the walk-in door trigger calls `enterDungeon`, 347-352); occupancy every 20 server ticks (once per second).

## 2. Key functions

- `instanceKeyFor`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 106-118. Party key, else durable character key, else entity key.
- `enterDungeon`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 356-714. Gates, key, slot choice, claim, placement.
- `claimInstance`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 951-1037. Sets the key and spawns the slot's content at its origin.
- `freeInstance`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 1042-1082. Drops the slot's content and clears its claim.
- `updateInstances`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 1484-1537. Once-per-second occupancy and empty-timeout free.
- `leaveDungeon`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 789-870. Finds the dungeon from the player's x position (`dungeonAt`), then sets them down at its outside door (Ignivar rooms may route back one room instead).
- `instanceOrigin`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/data.ts` 1116-1118. Slot origin: fixed x per dungeon, z = -1250 + slot x 500.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed slot pool per dungeon; a slot is free or claimed by one key | 24 slots per dungeon (theirs, data.ts line 1094) |
| Key by party, else by durable character id (survives relog) | Key prefix strings party:, solo:char:, solo: (theirs, dungeons.ts lines 108, 117) |
| Reuse the key's slot, else first free, else refuse | Refusal text (theirs, line 648) |
| Empty counter once per second; free at a timeout, longer if cleared | 300 s empty timeout (theirs, types.ts line 258); 900 s cleared timeout (theirs, dungeons.ts line 104) |
| Origin grid: fixed spacing per slot and per dungeon band | z base -1250, slot step 500 (data.ts line 1117), x step 600 per dungeon from a base of 99,400 + 900 (lines 1100, 1113) (theirs) |
| Footprint half-width used by other systems for reach | 120 units in x, 250 in z (theirs, dungeons.ts lines 241 and 253) |

## 4. TypeScript sketch

simplified: the sketch keeps `instanceKeyFor` (without the context object), the reuse-then-first-free slot choice, and the once-per-second occupancy tick. It omits all the entry gates (death, raid, lockouts, resets, Ignivar chain), difficulty, the claim (spawns with rolled levels, exit object), the placement and entrant bookkeeping, the dev-replacement and Ignivar slot preferences, the family-wide Ignivar occupancy and free, and `leaveDungeon`. `cleared` is a boolean where the donor tests whether a cleared-by record is non-empty (or a family member's). `tickOccupancy` also resets `cleared` when it frees the slot, as `freeInstance` does, but not the other fields it clears.

```ts
// Licence: MIT (donor). Logic lifted in TypeScript from src/sim/instances/dungeons.ts (instanceKeyFor, enterDungeon slot choice, updateInstances); no imports.
interface Slot { dungeonId: string; slot: number; key: string | null; emptyFor: number; cleared: boolean; }

// Key: party if grouped, else the durable character, else the entity.
function instanceKeyFor(partyId: string | null, durableId: string | null, entityId: number): string {
  if (partyId) return `party:${partyId}`;
  return durableId ? `solo:char:${durableId}` : `solo:${entityId}`;
}

// Reuse the key's slot; else claim the first free slot of this dungeon; else refuse.
function chooseSlot(slots: Slot[], dungeonId: string, key: string): Slot | null {
  const mine = slots.find(s => s.dungeonId === dungeonId && s.key === key);
  if (mine) return mine;
  const free = slots.find(s => s.dungeonId === dungeonId && s.key === null);
  return free ?? null;
}

// Once per second: an empty claimed slot counts up; it is freed at the timeout.
function tickOccupancy(s: Slot, occupied: boolean, emptyTimeout: number, clearedTimeout: number): boolean {
  if (s.key === null) return false;
  if (occupied) { s.emptyFor = 0; return false; }
  s.emptyFor += 1;
  const limit = s.cleared ? clearedTimeout : emptyTimeout;
  if (s.emptyFor >= limit) { s.key = null; s.emptyFor = 0; s.cleared = false; return true; }
  return false;
}
```

## 5. Lands in

- Frankendom target: NEW `origins/zones/instances.ts` (does not exist today): a pool of zone-copy slots keyed by a durable character or party key, with a claim, a reuse rule and an empty timeout, sitting beside `origins/zones/loader.ts` (the one place a zone's data package is read, "instances are created and destroyed on demand" in `docs/specs/zone-runtime.md`) and fed by `origins/presence/interest.ts` (layers with `softCap` 80, `hardCap` 100, `maxLayers` 8, `emptyLayerMs` 5 minutes; `World.join` assigns by friend or fullest layer under the cap). Duels already are server-authoritative instances ("Duels stay their own server-authoritative instances, as today", `docs/specs/origins/one-shard.md` §3). Files on the VPS snapshot /root/work-k7 (not main); headers and `interest.ts` read only.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: instancing and zone copies (`docs/specs/zone-runtime.md`; one-shard §3 and §5), brief rule 10.
- Reuse tag: adapt
- Brief rule served: 10 (zone copies with soft cap and seeding); rules 7-9 n/a

## 6. Gaps and risks

- MIT: logic lifted in the sketch with its path; the licence notice stays with the source.
- The durable character key is the donor's answer to relog and character swap (comments 109-115). It matches Frankendom's one-character-per-account and one-ledger rules; the server must hold the key, not the client. The key is `solo:<entity id>` when no durable id exists, which Frankendom must never allow (server-verified).
- Slot content is spawned at claim time from the dungeon's spawn list, with a level rolled from the sim's rng (971). Frankendom must seed that roll from the server and record it, so a reclaim is reproducible (rule 10), and the monster count per target obeys MAX_ATTACKERS = 3.
- The donor's raid lockouts (daily 24 h, weekly 7 d), reset cooldown (5 minutes), difficulty claims and the boss-kill grace are product rules. They are not part of the slot mechanism and should not be copied with the slot pool.
- Occupancy is a position test against each claim's footprint, once per second (1492-1503). Frankendom's Pit must not be freed on a missed position update; occupancy should come from the server's roster.
- The donor's world is a large open map with many slots at fixed offsets along one coordinate plane (the slot z grid). The Pit is one instance; the 24-slot pool is a cap that Frankendom must choose, not copy.
- `enterDungeon` is 359 lines (356-714), mostly gates for raid and Ignivar logic that do not apply to Frankendom. Only the key, slot choice, claim, placement and timeout were described; gate bodies at 414-615 were skimmed, and helpers such as `ignivarRaidClaimsForKey`, `detachFromDungeon` (876-) and the reset path (1084-) were not read.
- Pit is a client only; zones are data (the slot's contents come from the dungeon's spawn list).
