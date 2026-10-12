# 2004Scape-Server (netcode-session-integrity, cell 1)

Donor: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/NetworkPlayer.ts` | Licence: MIT (`LICENSE` line 1: "MIT License", line 3: "Copyright (c) 2023-2025 Lost City") | TypeScript | symbol `NetworkPlayer.decodeIn`

Checked: opened in full `NetworkPlayer.ts` 55-150, `ClientProtCategory.ts` 1-15, `IncomingMessage.ts`, `OpLocHandler.ts` 1-62, `IfButtonHandler.ts` 1-40, `ClientProtBase.ts` 1-13, `BuildArea.ts` 78-92, `Player.ts` 508-545 and 1985-1991. Opened `World.ts` at 120-128, 377-452 (phase calls), 496-540 (tick scheduling), 629-694 (client-in), 736-800 (players, logouts), 851-945 (login attach, reconnect), 1906-1936 (login reply), 2212-2224 (login request). Opened `LoginServer.ts` 112-120, 120-456 (login, reconnect, hop timer), 457-515 (logout and autosave). Callers: `decodeIn` has one caller (`World.ts` 644, checked by grep over `src`). Not read: the walk and path code the engine runs after a valid op (`World.ts` 646-674 only; `pathToTarget` not read), `PlayerLoading.load`, the friend and hiscore threads, the `rs225` codec (only its opcode table was grepped), and the client side of the reconnect. Confidence high for the input budget and op checks (read end to end); medium for the reconnect flow (server side read, client side not read).

Best transferable idea: Give every client request a class with a per-tick cap, charge a rejected request to its own class, and validate each op against the server's current scene state before any effect.
Decision (proposed): adapt — the per-tick cap by class and the server-side op check fit the server-verified kills ruling; the donor's bucket bug and unmeasured numbers are fixed, and the 52-tile window becomes zone data.
Acceptance: A server test sends 50 fight-action messages in one tick: only 5 are handled, the rest wait for the next tick, a rejected action uses one of the 5 slots, and an action on a tile outside the fighter's scene window leaves the fighter's state unchanged.

## 1. Mechanism

Two parts. Part A is the per-tick input intake and its checks. Part B is login, session resume and the logout timers.

**Part A, input intake (the one to use).**
- Each world tick (600 ms, `World.ts` 120) runs phases in this order: `processWorld` (377), `processClientsIn` (384), NPC event queue and NPCs (387, 396), `processPlayers` (407), `processLogouts` (410), `processLogins` (413), zones (419), info (426), `processClientsOut` (437), cleanup (444). Input is decoded inside `processClientsIn`, once per connected player (`World.ts` 644).
- `decodeIn` (`NetworkPlayer.ts` 55-80) resets three counters (64-66) and reads packets while all three are under their limit (69). Limits: CLIENT_EVENT 20, USER_EVENT 5, RESTRICTED_EVENT 2 per tick (`ClientProtCategory.ts` 5-8).
- Each packet (`read`, 84-150): the opcode is read; an unknown opcode closes the socket (99-104); the length is fixed, one-byte or two-byte, and a two-byte length above 1600 closes the socket (109-122). The decoder is looked up (133). If one exists, the message is decoded and its handler returns true or false (136-137).
- Counting (139-145): a USER_EVENT the handler accepted adds to the user budget. A RESTRICTED_EVENT adds to the restricted budget. Everything else, including a USER_EVENT the handler rejected, adds to the client budget. A packet with no decoder skips the counting block altogether and is not counted.
- When a budget is used up the loop stops and the rest of the bytes wait in the socket buffer for the next tick (the comment at `ClientProtCategory.ts` 10).
- Validation in the handlers, which is the server authority:
  - `OpLocHandler.handle` (`OpLocHandler.ts` 12-60): refuse while `player.delayed` (15-18); refuse if x or z is outside the build-area origin plus or minus 52 (20-28); refuse if `World.getLoc(x, z, level, locId)` finds no loc (30-35); refuse if the loc type has no op at index `op - 1` (37-42). Only then does it clear the pending action, call `setInteraction(Interaction.ENGINE, loc, mode)` (57-58) and set `opcalled` (59). The handler does not check distance to the loc; the engine's walk does that work (not read).
  - The origin is set by `BuildArea.rebuildNormal` to the player's own position when the scene is rebuilt (`BuildArea.ts` 88-89), so the window is the area around the player at the last rebuild.
  - `IfButtonHandler.handle` (`IfButtonHandler.ts` 13-38): refuse if the component id is unknown or not visible (17-19). Visible means its root is one of the open roots: modal main, modal chat, modal side, a tab, or the tutorial modal (`Player.ts` 1989-1990). A visible button sets `lastCom` (21); if it is one of the script's resume buttons and the active script is paused on a button, the script resumes (23-26); otherwise the component's trigger script runs (28-32).

**Part B, login, session resume and timers (login server and world).**
- The login server is a WebSocket server in its own module, reached from the world through a login thread (`LoginServer.ts` 147-149). It refuses a second request for the same name while one is in flight (171-179, response 8).
- Per attempt for an existing account: it counts `login` rows for this account and IP in the last 5000 ms (230-238). Three or more is refused with response 8 (240-249). The login row is written at 253-263, before the password is checked (266). So a wrong-password attempt also counts toward the limit (as read). A comment at 251 says concurrent logins by IP are not handled.
- Reconnect (`World.ts` 2222-2223 sets `reconnecting` when the client's login opcode is 18). `LoginServer` takes the reconnect branch only if the account is logged in on this same world (`reconnecting && account.logged_in === nodeId`, 304). It still checks the password first (266). It then sends the save only if the client did not already have one (320-338).
- Hop timer (353-376): if the account logged out on a different world within 45 s and the staff level is below 2, refuse with response 6 (rate limited, hop timer).
- In the world, a reconnecting login with a live player of the same name swaps the new socket into the old `Player` object: the old socket is closed (875), `other.client = player.client` (879), and `onReconnect()` re-sends the client state (885; `Player.ts` 511-545 clears and rebuilds the build area at 530-532).
- Idle and timeout (`processLogouts`, `World.ts` 781-793): no response for 100 ticks (60 s) forces a logout (`TIMEOUT_NO_RESPONSE`, 128); no connection for 50 ticks (30 s) requests an idle logout (`TIMEOUT_NO_CONNECTION`, 127).
- Saves: logout and autosave write the save only if it verifies and `wouldResetSaveFile` is false (`LoginServer.ts` 461, 506). That check refuses a save whose playtime tick count is lower than the one on disk (133).

## 2. Key functions

- `NetworkPlayer.decodeIn`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/NetworkPlayer.ts` 55-80. Reset counters, read loop bounded by three budgets, bytes accounting.
- `NetworkPlayer.read`: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/NetworkPlayer.ts` 84-150. Opcode, length, decoder, handler, counting.
- Budget table: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/codec/ClientProtCategory.ts` 1-15.
- `OpLocHandler.handle`: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/handler/OpLocHandler.ts` 11-61. The op validation chain.
- `IfButtonHandler.handle`: `/mnt/frankendom-donors/2004Scape-Server/src/network/game/client/handler/IfButtonHandler.ts` 12-39.
- `World.processClientsIn` (decode call at 644) and `World.processLogouts` (781-793): `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts`.
- `World` reconnect swap: `/mnt/frankendom-donors/2004Scape-Server/src/engine/World.ts` 867-896.
- `LoginServer` player_login: `/mnt/frankendom-donors/2004Scape-Server/src/server/login/LoginServer.ts` 167-456.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-tick input budget by message class, read in order, rest waits for the next tick | User 5, client 20, restricted 2 per tick (`ClientProtCategory.ts` 5-8). The donor's own comment says these were not measured (`ClientProtCategory.ts` 2). |
| Stop decoding when any budget is used up | Loop condition (`NetworkPlayer.ts` 69). |
| Validate an op against the scene window, the loc on that tile and the op slot, before any effect | Window plus or minus 52 tiles around the origin (`OpLocHandler.ts` 20-21). Hardcoded in the donor. |
| Accept a button only if its component is open | Five roots: modal main, modal chat, modal side, tab, tutorial modal (`Player.ts` 1989-1990). |
| Tick length | 600 ms (`World.ts` 120). |
| Idle logout | 50 ticks, 30 s (`World.ts` 127). |
| Forced logout | 100 ticks, 60 s (`World.ts` 128). |
| Login rate window | 3 login rows per account and IP in 5000 ms (`LoginServer.ts` 236-240). |
| Hop timer | 45 s, staff level below 2 (`LoginServer.ts` 362-367). |
| Reconnect swap | No number; a rule: same world, same password, live player present (`LoginServer.ts` 304; `World.ts` 867). |

## 4. TypeScript sketch

simplified: keeps the donor order (budget check, then handler, then count). One deliberate change: every message is charged to its own class before it is handled, so a rejected user message spends a user slot (the donor charges it to the client budget, `NetworkPlayer.ts` 139-145). Unbound opcodes are charged too (the donor does not count them). Omitted: byte-level reading and length prefixes, the 1600-byte close, the unknown-opcode close, the `delayed` busy check that the donor runs first, the path and interaction the engine starts after a valid op, the resume-button script branch, and the login and reconnect code. The 52-tile window is kept as a constant; in Frankendom it should be a zone field.

```ts
// Licence: MIT (2004Scape-Server, Lost City). Clean-room sketch written from the described mechanism.
type InputClass = 'user' | 'client' | 'restricted';

// Per-tick budgets. Donor values: user 5, client 20, restricted 2.
const TICK_BUDGET: Record<InputClass, number> = { user: 5, client: 20, restricted: 2 };

interface Inbound {
  cls: InputClass;
  bound: boolean;      // false = no decoder registered for this opcode
  handle(): boolean;   // false = the server rejected the request
}

// Handle at most TICK_BUDGET messages per class this tick. Leftover messages stay queued for the next tick.
// Every message spends budget in its own class, rejected or not.
function drainInputs(queue: Inbound[]): { handled: number; rejected: number } {
  const used: Record<InputClass, number> = { user: 0, client: 0, restricted: 0 };
  const underBudget = (): boolean =>
    (Object.keys(TICK_BUDGET) as InputClass[]).every((c) => used[c] < TICK_BUDGET[c]);
  let handled = 0;
  let rejected = 0;

  while (queue.length > 0 && underBudget()) {
    const msg = queue.shift() as Inbound;
    used[msg.cls] += 1; // spend the budget before handling, so a rejected message still counts
    if (!msg.bound) continue;
    if (msg.handle()) handled += 1;
    else rejected += 1;
  }
  return { handled, rejected };
}

interface LocOp { x: number; z: number; locId: number; op: number; }
interface LocDef { ops: ReadonlyArray<string | null>; }
interface SceneView {
  originX: number; // set when the client's build area is (re)sent
  originZ: number;
  locAt(x: number, z: number, locId: number): LocDef | undefined;
}

const SCENE_HALF_WINDOW = 52; // donor hardcodes 52 (the loaded build area is 104 tiles wide)

type OpCheck = { ok: true; def: LocDef } | { ok: false; reason: string };

// Checks in donor order: scene window, then the loc exists on that tile, then the op slot exists.
function checkLocOp(req: LocOp, scene: SceneView): OpCheck {
  const inWindow =
    req.x >= scene.originX - SCENE_HALF_WINDOW && req.x <= scene.originX + SCENE_HALF_WINDOW &&
    req.z >= scene.originZ - SCENE_HALF_WINDOW && req.z <= scene.originZ + SCENE_HALF_WINDOW;
  if (!inWindow) return { ok: false, reason: 'outside scene window' };

  const def = scene.locAt(req.x, req.z, req.locId);
  if (def === undefined) return { ok: false, reason: 'no such loc on tile' };

  if (!def.ops[req.op - 1]) return { ok: false, reason: 'loc has no such op' };
  return { ok: true, def };
}

// Button clicks are accepted only for a component under an open root (modal, chat, side, tab or tutorial).
function buttonAllowed(componentRoot: number | undefined, openRoots: ReadonlySet<number>): boolean {
  return componentRoot !== undefined && openRoots.has(componentRoot);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended in a copy, exit 0 (run on 2004Scape-Server-intake sketch in `NW003/work/`).

## 5. Lands in

- TARGET `src/fight/intake.ts` (new module): the one place the server decides whether a client fight request is handled this tick. Parity-checklist row 5 (controls/input). The tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (post-K item 3) names the tick loop; calling this module from that loop is a proposal, not something the donor shows.
- today: (not read: the Frankendom repo was not opened in this pass).
- Reuse tag: rewrite-from-idea (MIT: code may be adapted; the sketch above is clean-room from the mechanism)
- Brief rule served: 1 (the server validates every client request against its own state); rules 7-9 n/a

## 6. Gaps and risks

- The donor's budgets are a 2004 RS2 guess (`ClientProtCategory.ts` 2-4 says so). Five user inputs per tick at 600 ms is a number to measure against a real fast duel, not a rule to copy. Frankendom should hold it as a data field.
- A rejected request spends a budget slot in the sketch but not in the donor. Pick one rule and test it. The donor's own rule is the one that caused the bucket bug described below.
- The donor's op check does not test distance from the player to the loc (`OpLocHandler.ts` 20-35 checks the window, not the reach). The walk does the rest. Frankendom's engage is a state change, so the reach check must be explicit on the server, not left to a walk.
- The donor's window is a hardcoded 52. Frankendom zones are data, so the window must be a zone field, not a constant.
- The button check is a UI-state check (`Player.ts` 1989-1990). Pit and zone clients must send intent only; the server's visibility check stays authoritative.
- Session resume swaps the socket into the existing player object (`World.ts` 879). That keeps the fight state, but it also means a reconnect can resume a stale state if the old player's state was not written out. Frankendom's one ledger must decide what a resume restores.
- The login server's reconnect branch has no return after its failure path (`LoginServer.ts` 325-334), so a bad save sends response 7 and then response 2 with the same save bytes. Not to copy.

## 7. PASS2 extras

- **As-data shape.** The donor's tables are code rows, not data files.
  - Opcode table: rows are constructor calls `ClientProtN(index, id, length)` (`ClientProtBase.ts` 6-12; example row `ClientProt244.ts` 14: `ANTICHEAT_OPLOGIC1 = new ClientProt244(60, 47, 4)`). Row fields: index: number, id: number, length: number (negative length means a variable-size prefix, `NetworkPlayer.ts` 109-118).
  - Budget table: rows `ClientProtCategory(id: number, limit: count)`, three rows (`ClientProtCategory.ts` 5-8).
  - Login tables read by column name only (schema file not read): `account` (username, password, banned_until, muted_until, logged_in, logout_time, logged_out, staffmodlevel, members), `account_login` (account_id, profile, logged_in, login_time, logged_out, logout_time), `login` (uuid, account_id, world, timestamp, uid, ip), `session` (uuid, account_id, profile, world, timestamp, uid, ip) (`LoginServer.ts` 253-263, 304-316, 436-443, 471-491).
  - A new packet category is one row: yes (one constructor line plus the category set on the message model). A new op check is one row: no (it is code, one function per op family in `OpLocHandler.ts`).
  - Anticheat: `ANTICHEAT_OPLOGIC1..9` and `ANTICHEAT_CYCLELOGIC1..6` are declared in `ClientProt244.ts` and `ClientProt225.ts` with lengths, and models exist (`AnticheatOpLogic.ts`, `AnticheatCycleLogic.ts`), but no decoder or handler is bound to them: grep of both repository files for `ANTICHEAT`, `AnticheatOpLogic` and `AnticheatCycleLogic` returns nothing (grep result, not a receipt).
- **Provenance.** Repo 2004Scape-Server (Lost City). Licence MIT (LICENSE lines 1 and 3). Paths and lines for every claim are in section 2 and the receipts file (58 receipts, verifier passed 58 of 58).
- **What they patched later.** No history available (the donor has no `.git` directory). Comments only: `todo: concurrent logins by ip` (`LoginServer.ts` 251); `todo: validate all options` (`OpObjHandler.ts` 38); `testing reconnection behavior` (`ClientCheatHandler.ts` 369); `// rate limited (hop timer)` (368). A grep of `src` for exploit, dupe and cheat found no exploit history entries. Donor history gap: no record of what was exploited and when.
- **Rulings for Dom.**
  1. Should fight input have a per-tick cap, and is 5 user actions per tick the starting number? Recommendation: yes, 5 to start, then measure against the real duel tick.
  2. Should a rejected action spend the cap? Recommendation: yes; the donor's bucket bug (`NetworkPlayer.ts` 139-145) is the reason to decide it now.
  3. Should a reconnect within 60 s resume the live fight state (donor's swap, `World.ts` 867-896)? Recommendation: yes, because the donor's no-response timeout is 60 s and the swap keeps the fight; the hop timer (45 s) is not needed while Frankendom runs one runtime.
- **Core slice.** This feeds parity row 5 (intake) and the row 18 sub-line (server tick) in the first Core slice: one server-side check per fight request and one per-tick cap.
