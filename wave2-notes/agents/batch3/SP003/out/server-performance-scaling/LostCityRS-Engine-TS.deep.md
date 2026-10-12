# LostCityRS-Engine-TS (server-performance-scaling, cell 1)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/info.ts` and `build.ts`, driven by `src/engine/World.ts` (cycle) | Licence: MIT (LICENSE: "Copyright (c) 2023-2026 Lost City") | TypeScript | symbol `PlayerInfoEncoder.encode` (per-viewer interest set and byte budget)

Checked: Read in full: `World.cycle()` (World.ts 340-512), `processClientsIn` (601), `processInfo` (994-1094), `processClientsOut` (1096-1137), `Zone.computeShared` (101-122), `writePartialEncloses` (198-203), `addObj` (302-327). Read in part: `info.ts` player encoder (1-120, 264-266) and NPC encoder (269-360, 468-470); `build.ts` 48-250 (resize, rebuildPlayers, nearest and zone searches, filterPlayer); `renderer.ts` cache (100-106); `Npc.ts` 150-200, 258-270, 985-1030; `NetworkPlayer.ts` encodeOut, writeInner, updatePlayers, updateNpcs, updateZones. Not read: `Packet` class, `ZoneMap`, `HuntIterator`, `Killed` and death handlers, login-thread save path beyond the postMessage call, the renderer's per-tick cleanup. Confidence: high on the tick order, the budget and the view resize; high on the NPC observer leak (both sides read, not run); medium on the zone-object eviction (read, not run). camera_scope: not applicable (server cell).

Best transferable idea: give each viewer a fixed byte budget per tick and fill it nearest-first, so a crowded zone shrinks that viewer's interest radius instead of overflowing the packet or lagging the tick.
Decision (proposed): adapt — the per-viewer budget and nearest-first fill are the idea; Frankendom's duels have at most MAX_ATTACKERS = 3 attackers, so the 250/255 caps only matter for zones and open-PvP crowds; the donor's view-shrink is kept but must never hide a hit or a kill from a viewer (see section 6).
Acceptance: a server test places 300 NPCs around one viewer and asserts the encoded per-tick info stays within 4997 bytes, the 255 nearest are in the view, a NPC's observer count returns to 0 after the viewer moves away, including after a forced rebuild.

## 1. Mechanism

- The tick is a self-rescheduling `setTimeout` chain, not a `setInterval`. `cycle()` runs, then schedules the next call for `max(0, 600 - cycle time - drift)` ms (World.ts:508), where `drift` is how late this cycle started against the absolute `nextTick` (World.ts:343), and `nextTick` advances by exactly 600 (World.ts:504). The period is 600 ms and the donor marks it DO NOT CHANGE (World.ts:120).
- Order inside one tick (World.ts 355-408): world queue, `processClientsIn` (input decode), NPC event queue, `processNpcs`, `processPlayers`, logouts, logins, `processZones` (loc and obj events, then `computeShared` once per tracked zone), `processInfo` (one mask pass over all players and all NPCs), `processClientsOut` (per viewer: map, player info, NPC info, zones, inventories, stats, AFK zones, then flush), `processCleanup`.
- Per-viewer interest is the core. Each viewer keeps a set of visible player ids and a set of visible NPC ids (`player.build.players`, `build.npcs`) and a `viewDistance` that starts at 15.
  - Rebuild (`rebuildPlayers`, build.ts 99-117): fires when the viewer moved more than the view distance on one axis in one tick, or changed level (info.ts:24, 280). It clears the set, resets `viewDistance` to 15, counts the nearest candidates up to 250, and if 250 are reached it drops `viewDistance` by one.
  - Resize every tick (`resize`, build.ts 72-93): if the viewer already has 250 or more players in view, `viewDistance` drops by one each tick. Otherwise a calm counter runs; after 10 calm ticks it adds one per tick until 15 again.
  - Candidate search: when `viewDistance < 15` the search is nearest-first from the viewer outward (`getNearbyPlayersNearest`, build.ts 166-211); at full distance it walks zones (`getNearbyPlayersZones`, 134-164). Both stop at 250 ids in total.
  - Write: existing entries are updated or removed (`writePlayers`, info.ts 67-93); new entries go through `writeNewPlayers` (info.ts 94-116), which stops (returns) at the first add that does not `fits()`. `fits` counts the bit position plus the bytes already written, and must stay <= 4997 (info.ts:265). The packet buffer is 5000 bytes (info.ts:18).
- NPCs use the same pattern with cap 255 and a fixed view distance of 15 (build.ts:56-57, info.ts 280-360), and each NPC keeps an `observers` count (info.ts:355 up, info.ts:313 down).
- Encode once, fan out: the renderer caches each mask message per entity until its temporary reset (`cache`, renderer.ts 100-106; reset in `cleanup`, rsbuf/index.ts 297-301, the per-tick call site was not read), so an NPC's hit, animation and chat bytes are encoded once and reused for every viewer that sees it. Appearance bytes go through the same cache (renderer.ts:49).
- Send: each message is written with `client.send` as it is produced (NetworkPlayer.ts:226); there is no per-tick frame coalescing at this layer. The shared zone buffer is computed once per tick per tracked zone (`computeShared`, Zone.ts:101-122) and each viewer in that zone gets it (`writePartialEncloses`, Zone.ts:198-203). Private events are filtered per player by `receiver64` (Zone.ts:208-219).
- Hunting is gated by observation: an NPC whose hunt mode is PAUSEHUNT only runs its hunt while `getNpcObservers > 0` (Npc.ts:161; rsbuf/index.ts:294). Hunts also have a per-NPC clock throttle against the hunt rate (Npc.ts 258-264).
- Persistence: autosave every 1500 ticks, which is 15 minutes at 600 ms (World.ts:124-125, 425-428). The autosave copies each player's save and posts it to the login worker (World.ts:1241); the write is handed off, not awaited inside the tick.

## 2. Key functions

- `World.cycle` at `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 340-512: the fixed-step loop with drift and the schedule. Read in full.
- `PlayerInfoEncoder.encode` and `writeNewPlayers` at `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/info.ts` 21-31 and 94-116: the rebuild decision and the budgeted add. Read in part (the bit writers in between were read only where listed).
- `BuildArea.resize` and `rebuildPlayers` at `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/build.ts` 72-117: the shrink and regrow rule. Read in full.
- `BuildArea.getNearbyPlayersNearest` at `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/build.ts` 166-211: nearest-first spiral. Read in full.
- `NpcInfoEncoder.encode` and `build.rebuildNpcs` at `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/network/rsbuf/info.ts` 278-292 and `build.ts` 95-97: the NPC rebuild that does not decrement observers (defect D1 below).
- `Zone.computeShared` at `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` 101-122: the once-per-tick shared zone buffer. Read in full.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Fixed step on an absolute schedule, delay floored at 0 | tick 600 ms (World.ts:120); no tick skipping (World.ts:508) |
| Per-viewer byte budget, stop (not skip) at the first add that does not fit | 4997 bytes of a 5000-byte packet (info.ts:18, 265) |
| Cap on ids in view, nearest first | 250 players (build.ts:55), 255 NPCs (build.ts:56) |
| Shrink view when crowded, regrow after calm | shrink 1 per tick at 250 in view; wait 10 calm ticks (build.ts:54), then +1 per tick to 15 (build.ts:57, 88) |
| Encode each entity's masks once per tick, reuse per viewer | per-prot cache, renderer.ts 100-106 |
| Autosave by tick modulus, handed to a worker | 1500 ticks = 15 min (World.ts:124); postMessage at World.ts:1241 |
| Hunt only while observed | observers count gate (Npc.ts:161) |
| Hard slot caps | 2047 players (World.ts:117), 16383 NPC slots (src/util/Environment.ts:7) |
| Timeout without response | 100 ticks = 60 s (World.ts:132) |
| Profiling hook | per-tick cycle time into a metric (World.ts:481) |

Phone and small Node server: 600 ms tick and a 250/255 interest cap are fine for a server with about 2000 players. For a Frankendom zone with 300 NPCs and a 375-wide client, the cap is far larger than what a phone can draw; the cap that matters is the byte budget on a phone's connection (4997 bytes per 600 ms tick is about 8.3 KB/s of arithmetic; not measured on any phone or link, so it is not a number to copy blindly).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: shrink on a crowded tick, regrow after a calm interval, candidates nearest first, stop at the id cap or the byte budget. It sorts candidates instead of the donor's grid spiral, drops the bit-level packing that `fits()` does, drops the zone-walk fast path, the appearance cache and the NPC type filters. It also fixes donor defect D1: `ObserverCounts.replaceView` decrements the observers of every id that leaves the view before the new view replaces the old one, which the donor does not do on rebuild.

```ts
// Licence: MIT (donor LostCityRS-Engine-TS). Sketch written from the described mechanism, not a translation.
export {};

export interface Candidate { id: number; dist: number; bytes: number; }

export class InterestBudget {
  static readonly PREFERRED_IDS = 250;
  static readonly PREFERRED_VIEW = 15;
  static readonly INTERVAL = 10;
  static readonly MAX_BYTES = 4997;

  viewDistance = InterestBudget.PREFERRED_VIEW;
  private calmTicks = 0;

  // Run once per viewer per tick. Crowded: shrink by one. Calm: wait INTERVAL ticks, then grow by one per tick.
  resize(idsInView: number): void {
    if (idsInView >= InterestBudget.PREFERRED_IDS) {
      if (this.viewDistance > 1) this.viewDistance--;
      this.calmTicks = 0;
      return;
    }
    this.calmTicks++;
    if (this.calmTicks >= InterestBudget.INTERVAL) {
      if (this.viewDistance < InterestBudget.PREFERRED_VIEW) this.viewDistance++;
      else this.calmTicks = 0;
    }
  }

  // Nearest first. Stop (not skip) at the id cap or when the next add would exceed the byte budget.
  select(candidates: Candidate[], idsInView: number, bytesUsed: number): number[] {
    const sorted = [...candidates].sort((a, b) => a.dist - b.dist);
    const picked: number[] = [];
    let bytes = bytesUsed;
    for (const c of sorted) {
      if (c.dist > this.viewDistance) continue;
      if (idsInView + picked.length >= InterestBudget.PREFERRED_IDS) break;
      if (bytes + c.bytes > InterestBudget.MAX_BYTES) break;
      picked.push(c.id);
      bytes += c.bytes;
    }
    return picked;
  }
}

// Fix for the donor leak (build.ts:95-96 clears the set without decrementing observers).
// The view is diffed: every id that leaves decrements before the new view replaces the old one.
export class ObserverCounts {
  private readonly observers = new Map<number, number>();
  private inView = new Set<number>();

  count(id: number): number {
    return this.observers.get(id) ?? 0;
  }

  replaceView(next: Set<number>): void {
    for (const id of this.inView) {
      if (!next.has(id)) this.bump(id, -1);
    }
    for (const id of next) {
      if (!this.inView.has(id)) this.bump(id, 1);
    }
    this.inView = next;
  }

  private bump(id: number, delta: number): void {
    const value = Math.max((this.observers.get(id) ?? 0) + delta, 0);
    if (value === 0) this.observers.delete(id);
    else this.observers.set(id, value);
  }
}

// Donor Npc.ts:161: a PAUSEHUNT npc only runs its hunt while some viewer observes it.
export function mayHunt(observers: ObserverCounts, id: number, pauseWhenUnseen: boolean): boolean {
  return !pauseWhenUnseen || observers.count(id) > 0;
}
```

Typecheck: `tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run this turn). The local Quality Floor hook could not find tsc on the Mac; the VPS run is the check used here.

## 5. Lands in

- TARGET `src/fight/interest.ts` (new module: the per-viewer id budget and the observer counts; the engine owns the sets, the client only draws them).
- Parity-checklist row 18 (server tick), sub-line "server tick: fixed step, input intake, per-tick NPC budget"; post-K item 3. The fixed-step loop and the input-intake order (client in before NPC and player steps, World.ts:355-378) are the part of this note that belongs to that sub-line.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, the sketch above was written clean from the mechanism)
- Brief rule served: rule 1 (one engine, server owns the sets); the view-shrink rule is a server rule, so the client never decides who it sees.

## 6. Gaps and risks

- Frankendom rulings: kills are server-verified and a hit must never be dropped by the byte budget. The donor drops adds that do not fit (writeNewPlayers returns) and the viewer then never learns of that entity this tick. Frankendom must send hit, death and loot events on a path that is not budgeted, and let only presence and mask updates be budgeted.
- One ledger: the observer counts are a second ledger of who sees whom. Frankendom should derive them from the one interest set, not keep a separate counter.
- MAX_ATTACKERS = 3: the 250 and 255 caps are irrelevant to a 1-to-3 duel. The budget matters for zones with many NPCs and open-PvP crowds, which belong to parity row 23 (zone population) as a follow-up, not to this note.
- Defect D1 (observer leak): `NpcInfoEncoder.encode` calls `build.rebuildNpcs()` (info.ts:281), which clears the set (build.ts:95-97) without decrementing the observers of the NPCs in it. The re-add path then increments again (info.ts:355). The rebuild fires on a level change or a move of more than 15 tiles in one tick (NetworkPlayer.ts:291 passes `lastLevel !== level` and the per-tick deltas). Result: an NPC seen during a rebuild keeps observers >= 1 after the viewer leaves, so its PAUSEHUNT hunt never pauses. Fix: `replaceView` (in the sketch) decrements leavers first.
- Defect D2 (zone object eviction): the comment at Zone.ts:589 says the cheapest objs are dropped, but `addObj` (Zone.ts 305-310) removes the first DESPAWN obj in list order and then adds the new one whether or not anything was removed. If a zone is full of RESPAWN objs, the cap of 129 (Zone.ts:38) is exceeded. Fix: pick the cheapest DESPAWN obj explicitly and refuse the add when none is removable.
- Defect D3 (no backpressure): `WSClientSocket.send` (WSClientSocket.ts:20) and `TcpClientSocket.send` (TcpClientSocket.ts:16) write without checking the buffered amount. A slow phone keeps growing the server-side queue. The only guard is the timeout (World.ts:132, 100 ticks). Fix: check buffered bytes once per tick and, above a budget, drop that viewer's presence updates or disconnect it.
- Gap G1 (no shedding on overrun): when a cycle takes longer than 600 ms, the delay is floored at 0 (World.ts:508) and no tick is skipped, so the loop runs back to back and the drift grows. Fix: if drift exceeds a few ticks, reset `nextTick` to now and skip the missed ticks, or cap the per-tick work.
- Gap G2 (work scales with all entities): `processInfo` computes masks for every NPC in `this.npcs` each tick (loop starts World.ts:1053), whether or not any viewer sees it. At 16383 slots that is per-tick work independent of the audience. Not measured. Fix: compute masks only for NPCs with observers > 0, using the observer counts.
- Not read: `Packet`, `ZoneMap`, the hunt iterator, the death handler, the save path inside the login worker. No load test or bot harness was read in this donor, so the 1k and 10k claims are not checked.

Reuse tag: rewrite-from-idea (MIT, adapted shape; sketch written clean)
Brief rule served: rule 1 (one engine, server owns interest); no camera or client rule touched.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- Errors: none found.
- Missed: rsbuf/index.ts:156-160 removePlayer decrements observers for every NPC in the leaver's build set, so the observer-count leak applies to rebuild (level change / jump over 15 tiles), not to logout; the note does not mention this compensating path. The acceptance wording ('after viewer moves away') is consistent.
- Verified OK: World.ts lines, build.ts constants, rebuildPlayers/nearest/zone walk, info.ts, writeNewPlayers, NPC decrement/increment, Zone.ts addObj eviction defect, WSClientSocket.send, MIT licence.
