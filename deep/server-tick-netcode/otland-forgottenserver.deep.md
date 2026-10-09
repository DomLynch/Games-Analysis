# otland-forgottenserver (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/protocolgame.cpp` | Licence: GPL-2 | C++ | symbol `ProtocolGame::parsePacket / clientLogin`

Checked: At 503 and 65. Verified: `parsePacket` opens at 503 and ends at 807 (read in full); `clientLogin` (a free function) opens at 65 and ends at 108; `ProtocolGame::login` 154-261 and the wait-list helpers 29-63 also read.

## 1. Mechanism

- Network intake: `ProtocolGame::parsePacket` (503-807) takes one message from a connection. It returns at once if packets are not accepted, the game is shutting down, or the message is empty (505-507).
- Reads the opcode byte (509). With no player bound yet, only the disconnect opcode (0x0F) acts (511-517). If the player is removed or dead, 0x0F disconnects and 0x14 (logout) passes through; everything else is dropped (520-529).
- Gameplay opcodes do not act inline. Simple ones enqueue a task on the game dispatcher (`g_dispatcher.addTask`) capturing the player id; the game thread resolves the player by id when the task runs. Only the four turn opcodes (0x6F-0x72) carry an expiration (`DISPATCHER_TASK_EXPIRATION` = 2000 ms, tasks.h 10), so a late turn is dropped; moves (0x65-0x6D) have no expiration. Opcodes with a payload call a `parseXxx(msg)` helper (auto-walk 0x64, use item, attack 0xA1, say, and so on); the helpers' bodies were not read. Any unlisted opcode copies the message and queues `parsePlayerNetworkMessage` (795-801). Ping opcodes (0x1D, 0x1E) queue ping-back and ping tasks. A message that overruns its buffer disconnects the client (804-806).
- Login capacity: `clientLogin` (65-108) decides whether a connecting player can enter. It returns 0 (let in) for players with the always-login flag or GM accounts (67-69), or when the cap is 0 or there is no waiting list and the server is below its player cap (71-74). Otherwise it purges expired wait entries (76-85), finds the client's place in the list, and admits it when `playersOnline + slot <= maxPlayers` (91-94). An existing entry otherwise gets its timeout extended and its slot returned (97-98). A new premium player is inserted at the end of the priority block, a standard player is appended (101-107). Retry hint is 5, 10, 20, 60 or 120 s by slot (45-57); the entry timeout is that plus 15 s (59-63).
- `ProtocolGame::login` (154-261), dispatcher thread: before `clientLogin` it checks the character loads, name-lock, server closing or closed, one-character-per-account (if configured) and account bans (165-204). If `clientLogin` returns a slot, it sends a waiting-list message with the retry time and disconnects (206-216). Only then does it load the player fully and place it in the world (219-231) and set `acceptPackets` (239).
- Inputs: a message from the socket; the player record; the capacity config. Outputs: queued dispatcher tasks; a login slot (0 means admitted).
- Tick: per received message, plus the dispatcher's own step.

## 2. Key functions

- `ProtocolGame::parsePacket`: `protocolgame.cpp` 503-807 (read in full). Opcode gate, dead-player gate, enqueue or helper call per opcode, overrun check.
- `clientLogin`: `protocolgame.cpp` 65-108. Capacity gate and wait-list slot.
- `ProtocolGame::login`: `protocolgame.cpp` 154-261 (read in full). Pre-checks, calls `clientLogin` (206) with a half-built player, then loads and places the player.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Decode on the network side; act on the game thread through a queue keyed by an id | Dispatcher queue (theirs); task expiration 2000 ms (tasks.h 10) |
| Gate by state before dispatch: unbound, dead and removed accept only a fixed set of opcodes | Opcodes 0x0F, 0x14 (theirs, protocol) |
| Expire a time-sensitive action when it is late | Expiration on turn tasks only (theirs, 579-593) |
| Capacity gate with a timed wait list and priority lane | Retry hint 5/10/20/60/120 s by slot, timeout = hint + 15 s (theirs, 45-63); premium priority (theirs); player cap from config |

## 4. TypeScript sketch

simplified: the opcode table is collapsed to disconnect, logout and everything else; the per-opcode parse helpers, the overrun disconnect, the unlisted-opcode fallback and the slot arithmetic (existing wait entries, timeout extension, retry hint by slot) are omitted. Only turn tasks expire in the donor; the sketch's `expiresAt` is optional for that reason. The admit function returns a simple slot number.

```ts
// Licence: GPL-2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Msg = { op: number; playerId: number | null; dead: boolean; removed: boolean; };
type Task = { playerId: number; run: () => void; expiresAt?: number; };

const DISCONNECT = 0x0f;
const LOGOUT = 0x14;

// Network side: gate by state, then enqueue; the game side resolves the player by id.
function intake(m: Msg, queue: Task[], enqueue: (t: Task) => void): 'dropped' | 'queued' | 'disconnect' {
  if (m.playerId === null) return m.op === DISCONNECT ? 'disconnect' : 'dropped';
  if (m.removed || m.dead) {
    if (m.op === DISCONNECT) return 'disconnect';
    if (m.op !== LOGOUT) return 'dropped';
  }
  enqueue({ playerId: m.playerId, run: () => {} });
  return 'queued';
}

// Expired tasks are dropped rather than applied late.
function runDue(queue: Task[], now: number): void {
  for (const t of queue.splice(0)) {
    if (t.expiresAt !== undefined && now > t.expiresAt) continue;
    t.run();
  }
}

// Capacity gate: admit when there is room and nobody is waiting; otherwise take a wait slot.
function admit(online: number, cap: number, waiting: number, priority: boolean): { admitted: boolean; slot: number } {
  if (cap === 0 || (waiting === 0 && online < cap)) return { admitted: true, slot: 0 };
  return { admitted: false, slot: priority ? 1 : waiting + 1 };
}
```

## 5. Lands in

- TARGET `src/fight/intake.ts` (new): decode-gate-enqueue for client intents, with a state gate (unbound, dead, removed accept only a fixed set) and a per-intent expiry. Parity-checklist row 5 (controls / input, via the engine facade, K2c) and row 18 (post-K item 3: server intake).
- today: client input is built in `src/input.ts`; the only server-side intake is `src/net/verify-duel.ts` (replays uploaded records). A decode-gate-enqueue intake module does not exist. (read in worktree `frankendom-combat-p3`, commit 6adcab27e).
- Reuse tag: rewrite-from-idea
- Brief rule served: 2 (engage is a state change; kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2: clean-room only.
- A capacity queue and priority lane are a public-server concern. Frankendom's zones as data on one server would only need one if a zone copy has a hard cap.
- Expiring late actions is right for a game with a fixed tick, but it is a sim rule: Frankendom's server must decide late-input handling inside the one engine, not drop it at intake, or the server and the Pit client disagree about the same fight.
- Opcodes here are the Tibia protocol. Frankendom's intents are its own format. Only the gate and the queue shape transfer; the donor's per-opcode helper bodies (which hold the actual validation) were not read.
- The one-character-per-account and ban checks (185-204) are an account-ledger concern for the one-ledger ruling, not an intake rule.
