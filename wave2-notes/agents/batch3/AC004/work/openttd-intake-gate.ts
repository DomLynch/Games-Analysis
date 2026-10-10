// Licence: GPL-2.0 (donor OpenTTD). Clean-room sketch of the shape only, written from the described mechanism, not a translation.
export {};

type Kind = "engage" | "guard" | "stance" | "forceKill";

interface RawCmd { kind: string; target: number; x: number; y: number; actor?: number }
interface Cmd { kind: Kind; actor: number; target: number; x: number; y: number }

type Reject =
  | "backlog full"
  | "unknown kind"
  | "server-only kind from client"
  | "actor mismatch"
  | "target outside arena"
  | "dry run refused";

interface Session { id: number; isServer: boolean; boundActor: number; backlog: Cmd[] }

interface World {
  arenaW: number;
  arenaH: number;
  hp: Map<number, number>;
  pos: Map<number, { x: number; y: number }>;
  engaged: Map<number, number>;
}

const KINDS: ReadonlySet<string> = new Set<string>(["engage", "guard", "stance", "forceKill"]);
const SERVER_ONLY: ReadonlySet<string> = new Set<string>(["forceKill"]);
const BACKLOG_MAX = 16;          // cf. network.max_commands_in_queue (default 16)
const PER_CLIENT_PER_DRAIN = 2;  // cf. network.commands_per_frame (default 2)
const SERVER_PER_DRAIN = 16;     // cf. network.commands_per_frame_server (default 16)

// Stage 1 (on receive): cap, decode, identity. The actor is always the session's bound actor.
function admit(s: Session, raw: RawCmd): Reject | null {
  if (s.backlog.length >= BACKLOG_MAX) return "backlog full";
  if (!KINDS.has(raw.kind)) return "unknown kind";
  const kind = raw.kind as Kind;
  if (SERVER_ONLY.has(kind) && !s.isServer) return "server-only kind from client";
  if (raw.actor !== undefined && raw.actor !== s.boundActor) return "actor mismatch";
  s.backlog.push({ kind, actor: s.boundActor, target: raw.target, x: raw.x, y: raw.y });
  return null;
}

// Stage 2 (test run, no mutation): the same checks decide whether the command may commit.
function dryRun(w: World, c: Cmd): Reject | null {
  if (!w.hp.has(c.target) || (w.hp.get(c.target) as number) <= 0) return "dry run refused";
  if (c.kind === "engage" && c.target === c.actor) return "dry run refused";
  return null;
}

// Stage 3 (execute): bounds, then test, then commit. Refusal leaves the world untouched.
function execute(w: World, c: Cmd): Reject | null {
  if (c.x < 0 || c.y < 0 || c.x >= w.arenaW || c.y >= w.arenaH) return "target outside arena";
  const verdict = dryRun(w, c);
  if (verdict !== null) return verdict;
  if (c.kind === "engage") w.engaged.set(c.actor, c.target); // engage is a state change
  return null;
}

// Stage 4 (once per drain): each session gets a budget; leftovers stay queued in arrival order.
function drain(w: World, sessions: Session[]): Reject[] {
  const rejects: Reject[] = [];
  for (const s of sessions) {
    let budget = s.isServer ? Math.max(PER_CLIENT_PER_DRAIN, SERVER_PER_DRAIN) : PER_CLIENT_PER_DRAIN;
    while (s.backlog.length > 0 && budget > 0) {
      const c = s.backlog.shift() as Cmd;
      budget -= 1;
      const r = execute(w, c);
      if (r !== null) rejects.push(r);
    }
  }
  return rejects;
}
