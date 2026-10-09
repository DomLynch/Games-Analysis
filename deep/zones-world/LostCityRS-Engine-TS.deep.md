# LostCityRS-Engine-TS (zones-world, cell 7)

Donor: /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts | Licence: MIT | TypeScript | symbol Zone.enter / leave / computeShared

Symbol check (opened, 2026-10-09 correction pass): enter 78-87, leave 89-99, computeShared 101-122 land on the named methods. Also opened: reset 221-225, writePartialEncloses 198-203, writePartialFollows 208-219, addObj 302-326, removeObj 358-375, queueEvent 576-584, clearQueuedEvents 593-601, enclosed 553-559, follows 565-571, writeFullFollows 157-189 (read, not described in detail).

## 1. Mechanism
- A Zone is an 8 by 8 tile square on one level: constructor (60-68) unpacks a packed coordinate index and sets x and z to the tile coordinate shifted right by 3. Per-zone state: doubly linked lists of players and NPCs, singly linked lists of locs and objs, four counters, a Set of ZoneEvent for the tick, a Map from entity to its queued events, and a nullable shared byte array (45-58).
- enter(entity) (78-87): a Player is appended to the player list, the count rises, and the level's zone grid is flagged for this zone (World.gameMap.getZoneGrid(level).flag(x, z), line 82). It is flagged on every player entry, not only the first. An Npc is appended to the NPC list and counted. Anything else is ignored.
- leave(entity) (89-99): entity.unlink2() first (90), then the count drops. When the player count hits 0 the zone is unflagged (93-95). An NPC just decrements its count.
- Events: each loc or obj change goes through queueEvent (576-584), which adds a ZoneEvent to the zone's set and to the entity's own list. A ZoneEvent has a type ENCLOSED or FOLLOWS and a receiver64 (-1n or Obj.NO_RECEIVER for everyone). ENCLOSED is the packed shared kind, FOLLOWS is sent as a plain message per player; the type decides, not the receiver (e.g. addObj queues an ObjAdd as ENCLOSED when the receiver is NO_RECEIVER or the obj is a static RESPAWN, and as FOLLOWS to one receiver otherwise, 321-325; revealObj queues an ENCLOSED ObjReveal that still carries the original receiver, 346).
- computeShared() (101-122): allocates a packet, walks enclosed() (553-559, ENCLOSED events only), looks up the zone encoder for each message and calls encoder.enclose into the buffer; events with no encoder are skipped (105-108). If nothing was written the buffer is released and shared is left as it was (112-115, it is not set to null here); otherwise the bytes are copied into a Uint8Array stored as shared (117-121). The caller that runs it once per tick was not read.
- Delivery: writePartialEncloses (198-203) sends the shared blob inside UpdateZonePartialEnclosed if one exists; writePartialFollows (208-219) writes a PartialFollows header then each FOLLOWS event whose receiver is everyone or this player; writeFullFollows (157-189) resets the client's zone and replays current objs and locs (skipping things that already changed this tick). Who calls them was not read.
- reset() (221-225) clears shared, the event set and the entity event map at end of cycle (caller not read).
- Object cap: OBJS = (SIZE << 1) + 1 = 129 where SIZE = 64 (36-38). addObj (302-326) when totalObjs >= 129 removes the first DESPAWN-lifecycle obj it finds (305-313) before adding. clearQueuedEvents (593-601) removes a dropped entity's queued events so clients never see them.
- Inputs: entity, loc/obj changes, map and projectile animations (397-403). Outputs: occupancy flags, one shared packet per zone per tick, per-player follow messages.

## 2. Key functions
- Zone.enter | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts | 78-87 | appends a player or NPC; flags the zone on every player entry.
- Zone.leave | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts | 89-99 | unlinks; unflags when the last player leaves.
- Zone.computeShared | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts | 101-122 | encodes all ENCLOSED zone events into one packet.
- Zone.writePartialFollows | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts | 208-219 | per-player FOLLOWS events, filtered by receiver.
- Zone.addObj | /mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts | 302-326 | per-zone obj cap with eviction; picks ENCLOSED or FOLLOWS by receiver.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Per-zone entity lists with counts; occupancy flag set on every player entry, cleared when the last player leaves | 8 tiles per zone side, shift of 3 (theirs, lines 63-64) |
| One shared event packet per zone per tick for ENCLOSED events; per-player FOLLOWS events | SIZE 64, LOCS 256, OBJS 129 (theirs, lines 36-38; LOCS is declared but not read in the opened ranges) |
| Cap on ground objects per zone, evict an old despawning one | Protocol encoders and message classes (theirs) |

## 4. TypeScript sketch
simplified: no levels, locs, objs or lifecycle rules; no per-entity event map or clearQueuedEvents; no packet encoders (strings stand in for bytes); no writeFullFollows replay; no obj cap or eviction; in the donor computeShared leaves the old shared value when nothing was written, and the sketch does the same.
```ts
// Licence: MIT (LostCityRS-Engine-TS). Lift permitted; re-expression of Zone.ts 78-122, 198-225.
interface Ent { id: number; isPlayer: boolean; }
type EventKind = 'enclosed' | 'follows';
interface ZoneEvent { kind: EventKind; receiver: number | null; payload: string; }

class Zone {
  private players: Ent[] = [];
  private npcs: Ent[] = [];
  private events: ZoneEvent[] = [];
  private shared: string | null = null;

  constructor(
    public readonly x: number,
    public readonly z: number,
    private readonly onOccupied: (x: number, z: number, on: boolean) => void,
  ) {}

  enter(e: Ent): void {
    if (e.isPlayer) {
      this.players.push(e);
      this.onOccupied(this.x, this.z, true); // flagged on every player entry
    } else {
      this.npcs.push(e);
    }
  }

  leave(e: Ent): void {
    const list = e.isPlayer ? this.players : this.npcs;
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
    if (e.isPlayer && this.players.length === 0) this.onOccupied(this.x, this.z, false);
  }

  queue(ev: ZoneEvent): void { this.events.push(ev); }

  // Once per tick: pack every 'enclosed' event (whatever its receiver) into one shared blob.
  computeShared(): void {
    const parts = this.events.filter((ev) => ev.kind === 'enclosed').map((ev) => ev.payload);
    if (parts.length > 0) this.shared = parts.join('|');
  }

  // Per player: the shared blob, then this player's own 'follows' events (null receiver = everyone).
  writeFor(playerId: number, send: (payload: string) => void): void {
    if (this.shared) send(this.shared);
    for (const ev of this.events) {
      if (ev.kind === 'follows' && (ev.receiver === null || ev.receiver === playerId)) send(ev.payload);
    }
  }

  // End of cycle.
  reset(): void { this.shared = null; this.events.length = 0; }
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/world/zone-interest.ts (new, name set by Lead): per-zone occupancy and one shared event batch per tick, driven by the server tick (post-K item 3). Fight events from src/fight (today: `zone1.ts` / `open-fight.ts`, own copy) are the payloads.
- Parity-checklist row: 4 (fight loop events to page) and 18 (post-K item 3, server tick; kills and rewards stay server-verified).
- Reuse tag: adapt (MIT; the occupancy and shared-batch shape are reusable, the protocol is not).
- Brief rule served: (category default, not per-cell) 4 (zones are data); rules 7-9 n/a

## 6. Gaps and risks
- Zone size is 8 tiles here; in Frankendom zone size is data (zones as data) and needs Lead's value. Not a Frankendom number.
- One ledger: the shared batch is a broadcast of already-decided events; it must never carry authority. Kills and rewards come from the server ledger only (server-verified kills).
- Occupancy flag feeds a world grid (ZoneGrid.flag/unflag, defined outside this file, not read). Frankendom needs a server equivalent so empty zones are not ticked.
- Pit as client: the Pit would receive the same event batches as any zone client; nothing in this donor file covers a duel-sized zone.
- MAX_ATTACKERS = 3 is not here; this file has no combat or target rules.
- Binary protocol, ZoneEvent classes and the call sites of computeShared, reset and the write methods were not read.
