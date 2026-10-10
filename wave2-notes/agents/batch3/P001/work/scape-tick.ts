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
