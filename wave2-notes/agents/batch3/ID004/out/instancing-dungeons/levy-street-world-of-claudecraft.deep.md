# levy-street-world-of-claudecraft (instancing-dungeons, cell 19)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` | Licence: MIT (LICENSE line 1: "MIT License", Copyright (c) 2026 Levy Street) | TypeScript | symbol `updateInstances` (with `claimInstance`, `freeInstance`, `enterDungeon`, `leaveDungeon`)

Checked: Read in full: `updateInstances` (dungeons.ts 1484-1538), `claimInstance` (951-1041), `freeInstance` (1042-1108), the instance footprint (241-281), `instanceKeyFor` (106-118), `updateDoorTriggers` (329-355), `leaveDungeon` (789-873), `detachFromDungeon` (901-926), `instance_slot.ts` (whole file), `instance_combat_hold.ts` (whole file), and the claim branch of `enterDungeon` (486-500 and 640-690). Read in part: `resetDungeonInstances` (1109-1200 and 1240-1272; 1200-1239 not read), `enterDungeon` raid and Ignivar branches (not read in detail). The sim call site is sim.ts 6126 only (tick phase order not read). Confidence: high on the five-man claim lifecycle (claim, pool, reaper, free, door walk-in); medium on the reset path. camera_scope not applicable.

Best transferable idea: Give each zone a fixed pool of pre-built claim slots, own a slot by a durable party or character key, and free a slot only after its footprint has been empty for a timeout that is longer when the boss is dead.
Decision (proposed): adapt — row 23 needs exactly this despawn-on-empty with a grace timer; the footprint and timeouts become zone data and the owner key is the server character id, so a relog rejoins the same claim.
Acceptance: a server test asserts the claim is still held at 299 s empty and freed at 300 s, is held to 900 s when the boss is dead, a relogged member rejoins the same claim, and a 25th concurrent party gets a 'busy' result.

## 1. Mechanism

- Pool. Each dungeon gets `INSTANCE_SLOT_COUNT` = 24 empty slot records when the Sim is built (data.ts 1094; the comment at data.ts 1090-1093 says they are pre-allocated in the Sim constructor). A slot is free when `partyKey` is null (instance_slot.ts; dungeons.ts 1068 sets it back to null).
- Owner key. `instanceKeyFor` (106-118): a party gives `party:<id>`; a solo player gives `solo:char:<durable id>` when the server supplies one, else `solo:<entity id>`. The durable form is there so a logout or relog lands in the same claim.
- Entry (`enterDungeon`). The order is: (a) find the claim this key already owns (486) and use it, even when the pool is full; (b) otherwise take the first slot with no owner (646); (c) if there is none, error "busy" (648). `claimInstance` (951-1033) then sets `partyKey`, `emptyFor = 0`, clears the per-claim sets, spawns mobs and NPCs and objects, and adds an exit entity. The player is placed at the origin plus the dungeon's entry offset (676), and `emptyFor` is set to 0 again (687).
- Occupancy (`updateInstances`, runs once a second). Sim tick: `this.updateInstances();` (sim.ts 6126). The body runs only when `tickCount % 20` is 0 (1485). For each claimed slot, the claim is occupied if any player entity stands inside its footprint box (x within 120, z within 250; 241 and 253). If occupied, `emptyFor = 0` (1514). If not, `emptyFor += 1` (1516), and the timeout is the cleared timeout (900 s) when the final boss is dead (`clearedBy` is non-empty, 1521-1525), else 300 s (types.ts 258). When `emptyFor` reaches the timeout, `freeInstance` runs (1526-1532).
- Free (`freeInstance`, 1042-1075). It drops every mob, NPC, object and the exit entity, clears the reset locks that point at this claim, sets `partyKey` to null, and resets every per-claim field. The slot record stays in the pool for reuse. Nothing is respawned inside a live claim in this file: a re-claim after a free is the only way the content comes back (dungeons.ts has no respawn call, from grep; the spawn path was not read).
- Exit (`leaveDungeon`). A player within 2.0 of the exit entity is walked out (`DOOR_TRIGGER_RADIUS`, 81; trigger at 335). `leaveDungeon` puts the player at the outside of the door, clears their target and auto-attack, and removes them from every hate table of the claim (`scrubInstanceThreat`, 908). The walk-in to a door is the same radius test at 349, which calls `enterDungeon`.
- Reset. `resetDungeonInstances` (1109) frees the caller's claims and claims them again at the other difficulty. It sets `resetAvailableAt = time + 300` on the new claim and a per-owner reset lock (1245-1256). The rest of this path was read only in part.

## 2. Key functions

- `updateInstances`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 1484-1538. The once-a-second reaper: occupancy, empty counter, cleared versus normal timeout, free.
- `claimInstance`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 951-1041. Sets the owner key and spawns the claim's entities.
- `freeInstance`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 1042-1075. Despawns, then clears the slot.
- `enterDungeon` claim branch: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 486 and 640-690. Existing claim first, then first free slot, then busy.
- `instanceKeyFor`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 106-118. The owner key.
- `leaveDungeon` and `detachFromDungeon`: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/dungeons.ts` 789-873 and 901-926. Exit placement and hate scrub.
- `instance_combat_hold.ts` (related, not core): `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/instances/instance_combat_hold.ts` 1-36. Inside a claimed slot, aggro is slot-scoped (it does not leash home), and a pinned mob holds 10 s (`PIN_PHASE_SECONDS`, 36) before it phases through the blocking geometry.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed pool of claim slots per zone; claim = first unowned slot; rejoin by owner key before taking a slot | 24 slots per dungeon (data.ts 1094) |
| Owner key: party id, else durable character id, else entity id | `party:` and `solo:char:` prefixes (dungeons.ts 108, 117) |
| Occupancy: a claim counts as occupied while any player is inside its footprint box | Half width 120 (dungeons.ts 241); half depth literal 250 (253) |
| Reaper once a second; empty counter goes up by one per pass and resets when occupied | Pass every 20 sim ticks (dungeons.ts 1485); 20 ticks per second (types.ts 32) |
| Free after the empty timeout; longer grace when the final boss is dead | 300 s (types.ts 258); 900 s = 15 min (dungeons.ts 104) |
| Door or exit walk-in is a radius test; the walk-in calls the same enter path | 2.0 yards (dungeons.ts 81) |
| Entry sets the empty counter to zero, and the entry offset is per zone | Entry offset (0, -2) for hollow crypt (content/dungeons.ts 1552); party size 5 (content/dungeons.ts 1557) |
| Reset cooldown after a manual reset | 300 s (uses INSTANCE_EMPTY_TIMEOUT, dungeons.ts 1256) |

## 4. TypeScript sketch

simplified: the sketch keeps the pool, the owner key, the entry order (existing claim first, then first free slot, then busy), the once-a-second reaper with the cleared timeout, the free, and the door radius. It omits difficulty, the reset cooldown and per-owner reset locks, the Ignivar and raid families (a linked group that frees together), the Nythraxis wide footprint, the exit-portal walk-in, the hate scrub on leave, the heroic lockout checks, and the loot and corpse rules. It replaces the donor's `clearedBy` set with a boolean and takes spawn and despawn as callbacks instead of creating entities. It uses `TICK_RATE` where the donor has the literal 20 (the defect fix). The x origin drops the donor's base offset and spaces zones 600 apart as a placeholder.

```ts
// Licence: MIT (donor, Levy Street 2026). Shape adapted; written fresh for Frankendom, not a line copy.
type Vec2 = { x: number; z: number };

const TICK_RATE = 20;                 // sim ticks per second (donor types.ts:32)
const SLOT_COUNT = 24;                // claim slots per zone (donor data.ts:1094); zone data in Frankendom
const FOOTPRINT_HALF_W = 120;         // claim footprint x half-width (donor dungeons.ts:241); zone data here
const FOOTPRINT_HALF_D = 250;         // claim footprint z half-depth (donor dungeons.ts:253); zone data here
const EMPTY_TIMEOUT_S = 300;          // empty claim frees after 5 min (donor types.ts:258)
const CLEARED_EMPTY_TIMEOUT_S = 900;  // empty claim whose boss is dead idles 15 min (donor dungeons.ts:104)
const DOOR_RADIUS = 2.0;              // walk-in radius for doors and exits (donor dungeons.ts:81)

interface Claim {
  zone: string;
  slot: number;
  origin: Vec2;
  key: string | null;       // owner: 'party:<id>' or 'solo:char:<durableId>'
  cleared: boolean;         // final boss dead: longer idle grace
  emptyFor: number;         // whole seconds with nobody inside the footprint
  mobIds: number[];
  exitId: number | null;
}

interface Player { id: number; key: string; pos: Vec2; }

type EnterResult = { ok: true; claim: Claim; fresh: boolean } | { ok: false; reason: 'busy' };

function makePool(zones: string[]): Claim[] {
  const pool: Claim[] = [];
  zones.forEach((zone, zoneIndex) => {
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      pool.push({
        zone,
        slot,
        origin: { x: zoneIndex * 600, z: -1250 + slot * 500 },
        key: null,
        cleared: false,
        emptyFor: 0,
        mobIds: [],
        exitId: null,
      });
    }
  });
  return pool;
}

// Footprint test: the claim is 'occupied' only while someone stands inside its box.
function inFootprint(c: Claim, pos: Vec2): boolean {
  return Math.abs(pos.x - c.origin.x) < FOOTPRINT_HALF_W && Math.abs(pos.z - c.origin.z) < FOOTPRINT_HALF_D;
}

// Entry: an existing claim for this key always wins (rejoin, even when the pool is full).
// Otherwise take the first unowned slot in the zone; if none, the zone is busy.
function enterZone(pool: Claim[], zone: string, key: string, spawn: (c: Claim) => void): EnterResult {
  let claim = pool.find((c) => c.zone === zone && c.key === key);
  let fresh = false;
  if (!claim) {
    const free = pool.find((c) => c.zone === zone && c.key === null);
    if (!free) return { ok: false, reason: 'busy' };
    free.key = key;
    free.cleared = false;
    free.mobIds = [];
    free.exitId = null;
    spawn(free); // creates the claim's mobs and its exit portal
    claim = free;
    fresh = true;
  }
  claim.emptyFor = 0;
  return { ok: true, claim, fresh };
}

// Reaper: does work once a second (every TICK_RATE ticks); call it from the sim tick.
function reapEmpty(
  pool: Claim[],
  players: Player[],
  tick: number,
  free: (c: Claim) => void,
): void {
  if (tick % TICK_RATE !== 0) return;
  for (const c of pool) {
    if (c.key === null) continue;
    if (players.some((p) => inFootprint(c, p.pos))) {
      c.emptyFor = 0;
      continue;
    }
    c.emptyFor += 1;
    const limit = c.cleared ? CLEARED_EMPTY_TIMEOUT_S : EMPTY_TIMEOUT_S;
    if (c.emptyFor >= limit) free(c);
  }
}

// Free: despawn everything the claim owns, then return the slot to the pool.
function freeClaim(c: Claim, despawn: (id: number) => void): void {
  for (const id of c.mobIds) despawn(id);
  if (c.exitId !== null) despawn(c.exitId);
  c.key = null;
  c.cleared = false;
  c.emptyFor = 0;
  c.mobIds = [];
  c.exitId = null;
}

// Door walk-in: within DOOR_RADIUS of the door, enter the zone under the player's key.
function doorWalkIn(pool: Claim[], zone: string, door: Vec2, p: Player, spawn: (c: Claim) => void): EnterResult | null {
  if (Math.hypot(p.pos.x - door.x, p.pos.z - door.z) >= DOOR_RADIUS) return null;
  return enterZone(pool, zone, p.key, spawn);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (named by the addendum as the zone-population engine logic; not read in this pass). Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty with a grace timer). The claim pool and the reaper sit with it; the pool size, footprint, empty timeout and cleared grace are zone data fields. The reaper's once-a-second timing is the server-tick concern (post-K item 3), not a separate row.
- today: `origins/server/world-spawns.ts` (not read).
- Reuse tag: adapt-allowed (MIT, Levy Street 2026: code may be adapted with the notice kept; this sketch is a rewrite of the shape)
- Brief rule served: row 23 zone population (claim pool, empty timeout with grace); rule 1 one engine (claim state lives in the engine, zones as data).

## 6. Gaps and risks

- Defect 1: the reaper's once-a-second check is the literal `20` (dungeons.ts 1485) while the constant `TICK_RATE` exists (types.ts 32). The comment "once a second" stops being true if the tick rate changes. Fix: use `TICK_RATE` (the sketch does).
- Defect 2: the footprint depth is a literal `250` (dungeons.ts 253) and the wide Nythraxis footprint is a special case by dungeon id (`instanceClaimContains`, 257-281). Fix: footprint bounds as zone data, with no id checks in the engine.
- Limit 3: the 300 s and 900 s timeouts are global constants, so one zone cannot choose its grace. Fix: `emptyTimeout` and `clearedTimeout` as zone data fields.
- Ruling: kills are server-verified, so `cleared` must be set by the server when the boss dies, never by the client.
- Ruling: one character, one ledger. The donor keeps reset locks and per-claim `clearedBy` sets; Frankendom keeps lockouts in the one ledger, not on the claim slot.
- Durable key: the donor keys solo runners on the durable character id so a relog rejoins (dungeons.ts 112-117). Frankendom should key the claim on the server character id from the start.
- Pool exhaustion gives a "busy" error (648). Pool size is per zone data in Frankendom; the reaper is O(claims x players) per second, which is small at 24 slots but must fit the per-tick NPC budget (post-K item 3).
- Not read: the reset body (dungeons.ts 1200-1239), the enter raid and Ignivar branches (400-440, 500-600, 716-788), and the spawn path that creates mobs. Whether a dead mob inside a live claim comes back is therefore not established here.
- Related but not core: the slot-scoped hate and the 10 s pinned-mob phase (instance_combat_hold.ts 36) belong to the combat topic. Adopting the claim lifecycle does not require them.
