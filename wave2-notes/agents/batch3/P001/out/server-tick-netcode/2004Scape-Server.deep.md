# 2004Scape-Server (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` (`cycle` 369-545; scheduling 362 and 532-537) with `src/engine/entity/NetworkPlayer.ts` (`decodeIn` 55-75) and `src/network/game/client/codec/ClientProtCategory.ts` | Licence: MIT (`/mnt/frankendom-donors/2004Scape-Server/LICENSE` lines 1 and 3: "MIT License", "Copyright (c) 2023-2025 Lost City") | TypeScript | symbol `cycle`

Checked: Confidence high on the fixed-step loop, the phase order, the timing arithmetic and the input budgets (each read in full at its lines). High on the absence of a per-tick NPC budget in `processNpcs` (714-725, read in full), but `Npc.turn` was read only at 110-150, so a budget inside `turn` after that point is not ruled out. The list hint `src/network/game/server/codec/rs244/ServerProt244.ts` is an opcode table (packet ids and sizes, read 1-25 of 87); it is not the tick. Not read: the bodies of `processLogins`, `processZones`, `processInfo`, `processCleanup`, the output encoders behind `encodeOut`, the socket layers (`client.read`), and `ScriptRunner`. Candidates opened: World.ts, NetworkPlayer.ts, ClientProtCategory.ts, ServerProt244.ts, LICENSE.

## 1. Mechanism

- Tick length: 600 ms (World.ts 120). `start()` sets `nextTick = now + 600` once (362), then calls `cycle()` (363).
- One `cycle()` runs the phases in a fixed order every tick (World.ts 369-444): `processWorld` (world script queue, delayed objs, NPC hunt, 377), `processClientsIn` (player input decode and pathing, 384), `processNpcEventQueue` (spawn and despawn triggers, 387), `processNpcs` (every NPC's `turn()`, 396), `processPlayers` (queues, timers, interactions, energy, 407), `processLogouts` (timeouts, 410), `processLogins` (413), `processZones` (419), `processInfo` (426), `processClientsOut` (per player updates then `encodeOut`, 437), `processCleanup` (444).
- Timing: at the top of the cycle, `drift = max(0, start - nextTick)` (372). At the end, `currentTick++` (532), `nextTick += tickRate` (533), and then the next call is `setTimeout(..., max(0, tickRate - (Date.now() - start) - drift))` (537). The grid is `nextTick`, which advances by exactly one tick per cycle. The sleep subtracts both this cycle's elapsed time and its lateness. As I read the arithmetic (derived, not run): with no overrun the sleep is 600 minus elapsed time, so each start comes 600 ms after the last and any offset from the grid is kept. The drift term only shortens a sleep when a cycle starts more than one full tick behind `nextTick`. Small timer lateness is not corrected back to the grid.
- Overrun: if elapsed plus drift is at least 600, the sleep is 0 and the next cycle starts at once. The code does not skip ticks and does not run two cycles in one callback. Each cycle is one tick of game time, and `nextTick` keeps advancing by 600.
- Input intake, once per tick per connected player (World.ts 644 calls `decodeIn`). `NetworkPlayer.decodeIn` (55-75) resets the three counters and loops `read()` while `userLimit < USER_EVENT.limit`, `clientLimit < CLIENT_EVENT.limit` and `restrictedLimit < RESTRICTED_EVENT.limit` (69). The limits are 20 client events, 5 user events and 2 restricted events per tick (ClientProtCategory.ts 5, 6, 8). The comment at ClientProtCategory.ts 10 says what happens to the rest: decoding "picks up where it left off on the next tick".
- Counting: an accepted user event adds to `userLimit` (139-140). A restricted event adds to `restrictedLimit`. Everything else adds to `clientLimit` (144). So a user event whose handler returns false spends client budget, not user budget (the `else` at 144 catches it). This is a quirk of the donor.
- Frame guard: a declared packet length above 1600 closes the socket (119).
- Liveness: `lastConnected` is set on every `decodeIn` call while the client is connected (63); `lastResponse` is set only when bytes were read (75). Timeouts are counted in ticks: 100 ticks without a response (about 60 s) forces logout (World.ts 786, constant 128); 50 ticks without a connection (about 30 s) requests an idle logout (127, and the `else if` below 786).
- NPCs: `processNpcs` (714-725) calls `npc.turn()` for every NPC in the list, every tick, with no budget check around the call (716-718). `processWorld` also runs `npc.huntAll()` for each active NPC that has observers (608 onward), which is a separate loop.

## 2. Key functions

- `cycle`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 369-545. Phases 377-444; grid 532-537; drift 372.
- `start` tick scheduling: same file, 321-365 (first `nextTick` at 362).
- `processWorld`: same file, 561-627 (world queue, delayed objs, NPC hunt loop at 608).
- `processClientsIn`: same file, 629-695 (per player `decodeIn` at 644, path and input tracking after it).
- `processNpcs`: same file, 714-725 (NPC loop 716, `turn()` 718).
- `processLogouts`: same file, 781-800 (timeouts 786 and the `else if` after it; read to 800).
- `processClientsOut`: same file, 1105-1146 (per player output, `encodeOut`).
- `decodeIn` and `read`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/NetworkPlayer.ts` 55-160 (read in full).
- Budgets: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/codec/ClientProtCategory.ts` 1-12 (CLIENT 20, USER 5, RESTRICTED 2).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed grid: next tick advances by one tick; sleep subtracts elapsed time and lateness | 600 ms (World.ts 120) |
| One phase list, same order every tick (input before NPCs before players before output) | Phase names and order (377-444) |
| Per-tick input budget per category; stop at the first category that is full; rest waits for next tick | 20 client, 5 user, 2 restricted (ClientProtCategory.ts 5, 6, 8) |
| Timeouts counted in ticks, not in wall time | 50 ticks idle request (World.ts 127); 100 ticks forced logout (128, 786) |
| Oversized packet closes the connection | 1600 bytes (NetworkPlayer.ts 119) |
| NPC update per tick with no budget | None (processNpcs 714-725) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (input intake, then timeouts, then the phase list, then the grid sleep) and the donor's counting rule. It omits: the outbound encoders and the logins, zones, info and cleanup phases (represented by an injected phase list), the world script queue and NPC hunt, the socket and byte-level reads (the inbox is already whole packets), the bytes-based `lastResponse` (the sketch sets it when at least one packet was handled), the oversize-frame close, and the logout states beyond two flags. The sketch adds no NPC budget; the donor has none.

```ts
// Licence: MIT (donor, Lost City 2023-2025). Adaptable; this sketch is still written from the described mechanism.
type Cat = "client" | "user" | "restricted";
const LIMIT: Record<Cat, number> = { client: 20, user: 5, restricted: 2 }; // packets decoded per tick
const TICKRATE = 600;             // ms per tick
const TIMEOUT_NO_CONNECTION = 50; // ticks (30 s)
const TIMEOUT_NO_RESPONSE = 100;  // ticks (60 s)

interface Pkt { cat: Cat; accepted: boolean; }
interface Conn {
  inbox: Pkt[];
  lastConnected: number;
  lastResponse: number;
  requestIdle: boolean;
  loggingOut: boolean;
}

// Input intake for one connection, once per tick. Stops as soon as any category is at its limit;
// the rest stays in the inbox for the next tick.
function intake(conn: Conn, handle: (p: Pkt) => void, tick: number): void {
  const count: Record<Cat, number> = { client: 0, user: 0, restricted: 0 };
  let i = 0;
  while (i < conn.inbox.length && count.user < LIMIT.user && count.client < LIMIT.client && count.restricted < LIMIT.restricted) {
    const p = conn.inbox[i++];
    handle(p);
    // Donor counting order kept: an accepted user packet counts as user; restricted counts as restricted;
    // anything else (including a rejected user packet) counts as client.
    if (p.accepted && p.cat === "user") count.user++;
    else if (p.cat === "restricted") count.restricted++;
    else count.client++;
  }
  if (i > 0) conn.lastResponse = tick;
  conn.lastConnected = tick;
  conn.inbox.splice(0, i);
}

// Timeouts, checked once per tick: forced logout after 100 ticks without a response,
// idle logout request after 50 ticks without a connection.
function checkTimeouts(conn: Conn, tick: number): void {
  if (tick - conn.lastResponse >= TIMEOUT_NO_RESPONSE) conn.loggingOut = true;
  else if (tick - conn.lastConnected >= TIMEOUT_NO_CONNECTION) conn.requestIdle = true;
}

// NPCs: every NPC, every tick. There is no per-tick budget in the donor.
function npcPhase(npcs: { turn(): void }[]): void {
  for (const npc of npcs) npc.turn();
}

// Fixed-grid scheduler with the donor's arithmetic: nextTick advances by exactly one tick,
// and the sleep subtracts both this cycle's elapsed time and its lateness.
class Scheduler {
  private nextTick: number;
  tick = 0;

  constructor(
    private now: () => number,
    private sleep: (ms: number, fn: () => void) => void,
    private phases: (() => void)[],
  ) {
    this.nextTick = now() + TICKRATE;
  }

  start(): void {
    this.cycle();
  }

  private cycle(): void {
    const start = this.now();
    const drift = Math.max(0, start - this.nextTick);
    for (const phase of this.phases) phase(); // fixed phase order, every tick
    const elapsed = this.now() - start;
    this.tick++;
    this.nextTick += TICKRATE;
    this.sleep(Math.max(0, TICKRATE - elapsed - drift), () => this.cycle());
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (new module, the fixed-step loop that drives the duel step and the input intake budget). The sub-line to fill is "server tick: fixed step, input intake, per-tick NPC budget"; the NPC budget is new work, not a donor pattern.
- Parity-checklist row 18 (loot roll and XP award; server tick sub-line, post-K item 3). Intake is row 5 in the checklist but is named here as part of the server tick sub-line, not as a second row.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, but this note is shape only)
- Brief rule served: server-verified kills (the tick is the server's clock, and the fight step runs inside it) and one engine (one phase list drives every entity class)

## 6. Gaps and risks

- MIT: the code may be adapted. This note still writes the sketch from the mechanism and does not copy lines, to keep the record clean.
- The donor has no per-tick NPC budget (processNpcs 714-725 runs every NPC each tick). The checklist sub-line asks for one. Frankendom needs to design it; the donor's input budget (ClientProtCategory.ts) is the pattern to reuse, not the NPC loop.
- The donor's counting rule spends client budget on a rejected user event (NetworkPlayer.ts 139-144). Frankendom should count accepted and rejected events by their real category and test that a rejected attack cannot be used to starve other inputs.
- The donor's budgets (20 client, 5 user, 2 restricted per tick) are RS2 numbers. Frankendom's numbers for an engage or a guard press must be set from measured fight traffic and stored as data, not copied.
- Timeouts are counted in ticks (World.ts 127-128, 786). Frankendom's duel timers (engage, guard window) should use the same tick counter so that replay (row 19) is exact.
- Overrun behaviour: the donor runs the next cycle at once and does not skip ticks (World.ts 537). Small timer lateness is not corrected back to the grid (see Section 1), so a phase offset persists. Frankendom needs explicit tests for both: no skipped duel step, and a stated rule for offset.
- The phase order puts NPC turns before player processing (World.ts 396 before 407). Server-verified kills must be decided in one fixed place in the order; the sketch does not claim where the kill sits, because the donor's combat is not in this cell.
- Not read, so not claimed: the bodies of `processLogins`, `processZones`, `processInfo` and `processCleanup`; the output encoders; the socket reads; `Npc.turn` beyond line 150.
- Best transferable idea: one fixed-step loop with a drift-corrected sleep and an input intake that stops at a per-category tick budget and leaves the rest for the next tick.
