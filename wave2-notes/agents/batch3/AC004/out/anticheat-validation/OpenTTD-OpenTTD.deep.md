# OpenTTD-OpenTTD (anticheat-validation, cell 1)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_server.cpp` | Licence: GPL-2.0 (src headers say "version 2"; COPYING.md is GPL v2 with an exception for some 3rd-party modules) | C++ | symbol `ServerNetworkGameSocketHandler::ReceiveClientCommand`

Checked: `ReceiveClientCommand` (network_server.cpp 1107-1189) read in full. Also read: `ReceiveCommand` and `UnpackNetworkCommand` (network_command.cpp 375-389, 508-512), `DistributeQueue` and `DistributeCommandPacket` (302-355), `NetworkSendCommand` (208-235), `NetworkExecuteLocalCommandQueue` (257-286), `NetworkReplaceCommandClientId` and the sanitising helpers (436-499), `NetworkDistributeCommands` and its one caller in `network.cpp` (1262-1290), `Command::Execute` and `InternalPost` (command_func.h 326-339, 400-465), and the `command.cpp` helpers (`IsValidCommand`, `InternalExecutePrepTest`, `InternalExecuteValidateTestAndPrepExec`, `InternalExecuteProcessResult`, the sanity assert, 100-106, 270-365). Callers: `DistributeQueue` is reached only through `NetworkDistributeCommands`, and that only from `network.cpp` 1273 (the one caller I found). `ReceiveClientCommand` caller not traced. Confidence: high for the input gate, the per-client budget and the test-then-commit order. Not read: `SendError` (what the connection does after an error), `Command::PostFromNet`, `CheckCompanyHasMoney`, and the state-hash checks that would catch a cross-machine desync (not read). Frame cadence with `frame_freq` 0 is from the arithmetic at network.cpp 1267-1280, not run.

## 1. Mechanism

- The server is the only place a client command is accepted. Each client sends a packet; the server checks it, stamps who sent it, and queues it. Clients never run their own command locally: `NetworkSendCommand` on a client only sends the packet to the server (network_command.cpp 231-234, comment at 233).
- Inbound order, for one packet (network_server.cpp `ReceiveClientCommand`):
  1. Queue cap: if the client's incoming queue already holds `max_commands_in_queue` entries, answer `TooManyCommands` and stop (1115-1116).
  2. Decode (`ReceiveCommand`, network_command.cpp 375-389): unknown command id refused (379); single-player-only command refused (380); callback index checked (385). String arguments are sanitised on the way in (`SanitizeCmdStrings`, 468-471): control codes are kept only on the client and only for commands flagged `StrCtrl`; otherwise bad characters become `?`.
  3. Server-only verbs: a command flagged `Server` from a client that is not the server gets a kick (1133-1136).
  4. Spectator check: a non-spectator command with an invalid company gets a kick (1138-1141).
  5. Identity: unless it is the new-company action, the packet's company must equal the session's bound company, or the client is kicked with `CompanyMismatch` (1148-1153).
  6. Allow-list add/remove only for clients who are still joined (block after 1162, partly read).
  7. Sender stamp: a command flagged `ClientID` has its ClientID arguments overwritten with this session's client id (1187, and the rewrite at network_command.cpp 436-446). A client cannot name someone else as the sender.
  8. Enqueue (1189).
- Distribution, once per tick window: `NetworkDistributeCommands` runs when the frame counter reaches its max (network.cpp 1267-1273). It drains the server's own queue first and then each client's queue. `DistributeQueue` gives each queue a budget `to_go`: `commands_per_frame` for a client (network_command.cpp 333), and for the server the larger of that and `commands_per_frame_server` (336). Each command is checked against the pause gate (343), then the budget is spent (349, `if (--to_go < 0) break;`). Commands left over stay queued for the next window.
- Each distributed command gets `frame = _frame_counter_max + 1` (`DistributeCommandPacket`, 302-320) and is pushed to every connected client and to the server's own execution queue. Every machine then runs the queue entry when its frame counter reaches that frame (267). So all machines run the same commands in the same order at the same frame. That is the lockstep part, and Frankendom does not want it (see section 6).
- Execution on each machine, for one command (`Command::Execute`, command_func.h 400-465, reached through `InternalPost` at 326-339):
  - Bounds first: a tile outside the map is refused before anything else (329).
  - Company gate (`InternalExecutePrepTest`, command.cpp 270-290): a command from an invalid company is refused unless it is a spectator or deity command (278).
  - Test run: the command's proc is run without the execute flag (422). If the test fails, or money is short, the command stops here (`InternalExecuteValidateTestAndPrepExec`).
  - Networked and not from the network: the command is sent to the server and not executed (436).
  - Real run: the proc runs again with the execute flag (448). For commands not flagged `NoTest`, the test and the real run must give the same cost and the same failed flag; this is an assert (command.cpp 362).
  - Every executed command writes a desync log line (command.cpp 261).
- The server's own commands are delayed by one tick so the server does not act one tick ahead of clients (network_command.cpp 221-224).

## 2. Key functions

- `ServerNetworkGameSocketHandler::ReceiveClientCommand`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_server.cpp` 1107-1189. The inbound gate: cap, decode, server-only kick, spectator kick, identity check, sender stamp, enqueue.
- `DistributeQueue`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_command.cpp` 327-355. Per-queue budget, pause gate, leftovers stay queued.
- `NetworkGameSocketHandler::ReceiveCommand`: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/network/network_command.cpp` 375-389. Decode checks: id range, offline-only, callback index, string sanitising.
- `Command::Execute` (test, then validate, then execute, then sanity assert): `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/command_func.h` 400-465.
- `InternalPost` (bounds before execute): `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/command_func.h` 326-339.
- `InternalExecutePrepTest` (company gate) and the sanity assert: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/command.cpp` 270-290 and 362.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (default from the `def` line) |
|---|---|
| Per-client incoming cap: refuse new input when the backlog is full | `max_commands_in_queue` = 16 (network_settings.ini def line 88; var line 85) |
| Per-client budget per window: execute at most N queued commands, keep the rest queued in order | `commands_per_frame` = 2 (def line 70; var line 67) |
| Server's own budget per window | `commands_per_frame_server` = 16 (def line 79; var line 76), used as the max with the client budget |
| Window length | `frame_freq` (def line 61 = 0). By the arithmetic at network.cpp 1267-1280 the window is every tick when it is 0 (not run) |
| Server delays its own input by one tick for fairness | 1 tick (network_command.cpp 221-224) |
| Invalid command id, offline-only, bad callback: refuse | Rules, no constant |
| Dry run first, real run second, must agree | Rule (command.cpp 362 assert) |

Note: the setting defaults above come from the `def` lines of network_settings.ini. The receipts quote only the `var` lines, because the `def` lines are too short to quote (line 70 is `def      = 2`).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the input gate (backlog cap, then decode, then server-only, then identity stamp and enqueue) and for execution (bounds, then dry run, then commit). It omits: the company and allow-list paths; the kick and disconnect behaviour (the donor kicks or sends an error; the sketch only returns a reason); the string sanitising; the pause gate; the frame-counter cadence (the sketch drains once per call, the donor drains once per frame window); the one-tick delay for the server's own commands; the desync log; and the donor's assert that the real run matches the dry run (the sketch does not re-run the dry run after the commit). The donor overwrites the sender id on the packet; the sketch also rejects a packet whose `actor` does not match the session, which the donor does with a company-mismatch kick. Budgets are the donor's defaults (2 per client, 16 for the server, cap 16).

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ac004-openttd-intake-gate.ts) exits 0.

## 5. Lands in

- TARGET `src/fight/intake.ts` (new module, the one gate between a socket and the fight engine). Stage 1 is the admit function, stage 2 and 3 are the execute path the engine already needs, stage 4 is the drain.
- Parity-checklist row 5 (controls/input). The addendum puts input intake here. None of rows 1-22 is a better fit: row 18 is loot roll and XP award, and its server-tick sub-line ("server tick: fixed step, input intake, per-tick NPC budget") is where the drain budget belongs. Row 19 (fight record and replay) does not fit validation.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only)
- Brief rule served: server-verified kills and one engine (the gate sits in front of the engine, so the client only ever sends intent); licence rule 7 (GPL, shape only)

Decision (proposed): adapt. Take the gate and the budget: overwrite the actor with the session's bound character, refuse server-only verbs from clients, dry-run before commit, and drain a fixed per-client budget from a capped FIFO backlog. Reject the lockstep distribution (every client re-runs the same command list at the same frame), because Frankendom's server sends state and kills are server-verified; copying it would make the client part of the verdict.
Acceptance: a server test sends one fight packet with `actor` set to another character's id and gets refused with nothing changed in the world; five `engage` packets in one tick run only two, the other three run next tick in order; the seventeenth queued packet is refused with "backlog full". A normal player sees no change; a spamming client loses the extra inputs and never has them replayed late.

## 6. Gaps and risks

- Lockstep is the donor's core. Every machine re-runs the same commands at the same frame, which only works if the simulation is deterministic everywhere. Frankendom's ruling is server-verified kills, so the client must never run the verdict. Take the gate and the budget; leave the distribution step out.
- The donor's kick policy (kick on server-only verbs or company mismatch) is a product decision. The donor's `SendError` body was not read, so what the connection does after `TooManyCommands` is unknown here. Frankendom must choose refuse-and-continue or refuse-and-drop and test it.
- One ledger: the donor's refusals are console lines and an error to the client. Frankendom should write one ledger row per refused command, not a second log. The donor's flag or ban pipeline was not read (not in these files).
- MAX_ATTACKERS = 3 is not in the donor. The gate caps input rate per client, not the number of attackers on one target. Hate and target selection stay in the engine.
- The donor's desync check is "test run equals real run" plus a log line. The cross-machine state checks were not read. Frankendom does not need them, because only the server runs the verdict; keep the local dry run.
- Pit as client: the gate is server code. A Pit client sends the same packets through the same gate; nothing changes on the client.
- Frame cadence: with the default `frame_freq` of 0 the drain runs every tick by the arithmetic, not run. Frankendom's drain belongs to the server tick (row 18 sub-line), so use its tick, not this one.
- Budgets (2 per client, 16 for the server, cap 16) are donor defaults for a multiplayer transport game. Frankendom should carry them as engine constants with a test, not as zone data.
- GPL-2.0: clean-room only. The sketch is written from the mechanism and was not translated line by line.
