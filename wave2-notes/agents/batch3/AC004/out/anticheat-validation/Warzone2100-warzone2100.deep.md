# Warzone2100-warzone2100 (anticheat-validation, cell 2)

Donor: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` | Licence: GPL-2.0-or-later (netplay.cpp header: "either version 2 of the License, or (at your option) any later version"; README SPDX GPL-2.0-or-later; COPYING is the GPL v2 text) | C++ | symbol `NETprocessSystemMessage` (case `NET_SEND_TO_PLAYER`) with `NETaddSessionBanBadIP`

Checked: The hint file `lib/netplay/netlobby.cpp` is the lobby-service join check (read in part: connect-check request 1555-1640, checkJoinRequest 1735-1800). It is not the message gate. The mechanism is in `lib/netplay/netplay.cpp`: `NETkickSenderOfInvalidMessage` (2345-2363), `NETprocessSystemMessage` with the relayed-message gate (2367-2521, read in full), the strike ledger `NETaddSessionBanBadIP` (3527-3560), `quickRejectConnection` (3563-3590), `NETrejectTempSocketClient` (3626-3640), the join-time triggers (3919-3984, 4088-4147, 4612-4616) and the accept-time reject (5185-5210). Also read: `lib/netplay/netpermissions.cpp` ban list (120-160, `MAX_BANS` in netpermissions.h 37) and `src/multiint.cpp` `kickPlayer` (3893-3915). Callers: `quickRejectConnection` has one caller (5197). `NETaddSessionBanBadIP` is reached from the sites listed in section 1 and from `NETrejectTempSocketClient` with `sessionBan` set. Not read: `NETdecryptSecuredNetMessage` (the secured envelope), the body of `NETFilterMessageWhileSwappingPlayer` (2162, only the call site), the other cases of `NETprocessSystemMessage`, `lib/netplay/sync_debug.cpp` (desync detection), and the lobby hash-request handler (`src/main.cpp`). Confidence: high for the relayed-message gate and the strike ledger; medium for the per-IP pending counter (read at 1758, 3572, 3615, 5207; not run). camera_scope: not a camera cell.

## 1. Mechanism

- Non-host clients do not talk to each other directly. Each message between players goes through the host inside a `NET_SEND_TO_PLAYER` envelope with a sender field and a receiver field (comment at netplay.cpp 2269). So the host is the only place that can check who said what.
- The host's gate, in order, for one envelope from one connection:
  1. The nested message must decode. If it does not, the sender is kicked and banned (2400, which calls `NETkickSenderOfInvalidMessage` at 2345-2363; that kick passes `true` for the ban at 2362). If only the envelope fails to end cleanly, the packet is dropped with a log line and no kick (2403-2407).
  2. Slot range: sender and receiver must be valid slots, or the receiver is the broadcast value (2408-2410). Failure drops the packet.
  3. Identity: on the host the sender field must equal the connection's own player index (2422). Otherwise the packet goes to the `else` branch, which logs "Report this" and drops it (2520). A connection cannot speak as another slot.
  4. Access table (2425-2453), three groups:
     - Only the host may send these types (sender must be the host): NET_OPTIONS, NET_FIREUP, NET_KICK, NET_PLAYER_LEAVING, NET_PLAYER_DROPPED, NET_REJECTED, NET_GAME_FLAGS, NET_PLAYER_JOINED, NET_PLAYER_INFO, NET_FILE_PAYLOAD, NET_PLAYER_SWAP_INDEX, NET_HOST_CONFIG (2425-2437).
     - These must be addressed to the host (receiver must be the host): NET_HOST_DROPPED, NET_FILE_REQUESTED, NET_READY_REQUEST, NET_TEAMREQUEST, NET_COLOURREQUEST, NET_POSITIONREQUEST, NET_FACTIONREQUEST, NET_FILE_CANCELLED, NET_DATA_CHECK, NET_JOIN, NET_PLAYERNAME_CHANGEREQUEST, NET_PLAYER_SWAP_INDEX_ACK (2438-2450).
     - These must involve the host on one side: NET_PLAYER_SLOTTYPE_REQUEST and NET_DATA_CHECK2 (2451-2453).
     - A violation logs the sender, and if the connection still exists, sends a host notice and calls `kickPlayer(sender, "Invalid command attempted", ERROR_INVALID, true)` (2456-2463). The `true` is the ban flag.
  5. A swap filter drops messages while a player index swap is pending (2468-2472, function at 2162; body not read).
  6. `NET_SHARE_GAME_QUEUE` is accepted only as a broadcast (2474-2477).
  7. Text types (NET_TEXTMSG, NET_SPECTEXTMSG, NET_AITEXTMSG) from a sender without `hostChatPermissions` pass only if addressed to the host (2480-2492). Otherwise they are dropped.
  8. Forward: re-encode the envelope with sender and receiver, send to the receiver (or to all), and insert a copy in the host's own queue (2497-2510).
- The strike ledger (IP level, the "flag pipeline"):
  - Triggers that call `NETaddSessionBanBadIP`: an old client that sends the "list" probe (3919-3924); a wrong game version (3983-3984); an invalid lobby connect-check request (4088-4094); traffic on a temp socket before it reaches a connect state (4612-4616); and rejected connections with `sessionBan` set (`NETrejectTempSocketClient`, 3638). Two sites use a 4-second ban (3699, 4282). Default expiry is 1800 s (3527).
  - Rule (3527-3556): if the IP is already in the ledger and still inside its window, `attempts` goes up by one (capped at the size_t maximum). If the window has passed, `attempts` restarts at 1. The window becomes the later of the old expiry and now plus the expiry (3549).
  - At exactly 100 attempts (3551) the IP is written to the permanent list as "BAD_USER" (3554). The permanent list is `IPlist`, capped at `MAX_BANS` = 1024; the oldest entry is dropped when the cap is passed (`netpermissions.cpp` 155-160).
  - Accept time (5197): `quickRejectConnection` closes a new socket at once if the IP is inside an active ban window (in that case it calls `NETaddSessionBanBadIP` again, which counts as a strike), or if the IP already has more than one pending temp socket (3572, no strike). Otherwise the pending count goes up (5207).
  - Connect time (4140-4147): after the identity arrives, the permanent list is checked with `onBanList` when no connect permission applies. A kicked player who tries to rejoin is refused with ERROR_KICKED.
- Manual kick and ban: `kickPlayer` in `src/multiint.cpp` (3894) sends NET_KICK with the reason and type, notifies the activity log, adds the IP to the ban list if `banPlayer` is set (3913), then calls `NETplayerKicked`.
- Lobby connect check (netlobby.cpp 1576-1592, only partly read): the request must carry the lobby token of the hosted game (1580) and a challenge of 32 to 88 characters (1586). Otherwise it is an InvalidRequest, which earns a strike at 4094. The response is built from the game id, player name and player identity (1598), and hash requests are handled only for a trusted lobby address (1614-1617). The hash handler itself was not read.

## 2. Key functions

- `NETprocessSystemMessage`, case `NET_SEND_TO_PLAYER`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` 2388-2521. The relayed-message gate: decode, slot range, identity, access table, broadcast rule, chat rule, forward.
- `NETkickSenderOfInvalidMessage`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` 2345-2363. Kick and ban for a corrupt message; log only when the sender is the host or has no connection.
- `NETaddSessionBanBadIP`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` 3527-3560. The strike ledger and the 100-attempt promotion.
- `quickRejectConnection`: `/mnt/frankendom-donors/Warzone2100-warzone2100/lib/netplay/netplay.cpp` 3563-3590. Accept-time reject by ban window or pending count.
- `kickPlayer` (host): `/mnt/frankendom-donors/Warzone2100-warzone2100/src/multiint.cpp` 3894-3915. Kick plus optional IP ban.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (value as read) |
|---|---|
| Message must come from the connection that owns the slot | Rule (netplay.cpp 2422) |
| Access table: who may send or be addressed | Three groups, listed in section 1 (2425-2453) |
| Kick and ban on an access violation | Immediate permanent IP ban (2463, flag true) |
| Strike window for a bad connection attempt | 1800 s default (3527); 4 s for two sites (3699, 4282) |
| Window extends on each strike | later of old expiry and now + window (3549) |
| Promote to permanent ban at a count | exactly 100 attempts (3551) |
| Permanent ban list size | MAX_BANS 1024, oldest dropped (netpermissions.h 37; cpp 157-160) |
| Temp bad-IP cache size | 512 entries (netplay.cpp 324) |
| Pending sockets per IP before a quick reject | more than 1 (3572) |
| Lobby challenge length | 32 to 88 characters (netlobby.cpp 1586) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the gate (decode, slot range, identity, access table, broadcast rule, chat rule) and for the ledger (count or restart inside the window, extend the window, promote at 100, cap at 1024 with the oldest dropped). It omits: the secured envelope (not read); the index-swap filter; the host notice text and the activity log; the connect-permission path (`netPermissionsCheck_Connect`), which the sketch replaces with a plain permanent-list check; the pending-socket counter (the sketch's `allowConnect` covers the ban-window reject only); and the loopback exemption. The donor's two outcomes (kick-and-ban and drop) are kept as separate results. Numbers are the donor's values.

```ts
// Licence: GPL-2.0-or-later (donor Warzone 2100). Clean-room sketch of the shape only, written from the described mechanism, not a translation.
export {};

type MsgType = "kick" | "options" | "join" | "teamRequest" | "chatAll" | "shareQueue";
// Which side of the envelope must be the host (cf. netplay.cpp access groups, 2425-2453).
type Need = "senderIsHost" | "receiverIsHost" | "hostOnEitherSide" | "none";

const ACCESS: Record<MsgType, Need> = {
  kick: "senderIsHost",
  options: "senderIsHost",
  join: "receiverIsHost",
  teamRequest: "receiverIsHost",
  chatAll: "none",
  shareQueue: "none",
};

const BROADCAST = -1;
interface Envelope { sender: number; receiver: number; type: MsgType; decoded: boolean; chatAllowed: boolean }

type Action =
  | { do: "accept" }
  | { do: "drop"; why: string }                 // log, no kick
  | { do: "kick-and-ban"; why: string };        // kick, then permanent IP ban

// Order follows the donor: envelope decode, slot range, sender identity, access table,
// broadcast-only rule, chat permission. Nothing is forwarded on a drop or a kick.
function gate(env: Envelope, connIndex: number, hostIndex: number, slots: number): Action {
  if (!env.decoded) return { do: "kick-and-ban", why: "corrupt nested message" };
  if (env.sender < 0 || env.sender >= slots) return { do: "drop", why: "bad sender slot" };
  if (env.receiver !== BROADCAST && (env.receiver < 0 || env.receiver >= slots)) return { do: "drop", why: "bad receiver slot" };
  if (env.sender !== connIndex) return { do: "drop", why: "sender is not this connection" };

  const need = ACCESS[env.type];
  const senderIsHost = env.sender === hostIndex;
  const receiverIsHost = env.receiver === hostIndex;
  const lacks =
    (need === "senderIsHost" && !senderIsHost) ||
    (need === "receiverIsHost" && !receiverIsHost) ||
    (need === "hostOnEitherSide" && !senderIsHost && !receiverIsHost);
  if (lacks) return { do: "kick-and-ban", why: "lacked the required access level" };

  if (env.type === "shareQueue" && env.receiver !== BROADCAST) return { do: "drop", why: "queue share must be broadcast" };
  if (env.type === "chatAll" && !env.chatAllowed && env.receiver !== hostIndex) return { do: "drop", why: "chat not permitted" };
  return { do: "accept" };
}

// IP strike ledger: short bans for probes and bad versions, expiring, escalating to a permanent list.
interface Strike { attempts: number; expiresAt: number }
const DEFAULT_EXPIRY_MS = 1800000; // cf. NETaddSessionBanBadIP default 1800 s
const PERMANENT_AT = 100;          // cf. attempts == 100
const MAX_BANS = 1024;             // cf. MAX_BANS 1024 (netpermissions.h)

function strike(ledger: Map<string, Strike>, permanent: string[], ip: string, now: number, expiry: number = DEFAULT_EXPIRY_MS): void {
  const cur = ledger.get(ip);
  if (cur === undefined) {
    ledger.set(ip, { attempts: 1, expiresAt: now + expiry });
    return;
  }
  cur.attempts = now < cur.expiresAt ? cur.attempts + 1 : 1;   // inside the window: count up; after it: restart
  cur.expiresAt = Math.max(now + expiry, cur.expiresAt);        // every strike extends the window
  if (cur.attempts === PERMANENT_AT) {
    permanent.push(ip);
    if (permanent.length > MAX_BANS) permanent.shift();         // drop the oldest
  }
}

// Join-time check: a banned IP is refused, and the refusal is itself a strike (cf. quickRejectConnection).
function allowConnect(ledger: Map<string, Strike>, permanent: string[], ip: string, now: number): boolean {
  if (permanent.includes(ip)) return false;
  const cur = ledger.get(ip);
  if (cur !== undefined && now < cur.expiresAt) {
    strike(ledger, permanent, ip, now);
    return false;
  }
  return true;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ac004-warzone-message-gate.ts) exits 0.

## 5. Lands in

- TARGET `src/fight/intake.ts` (the same gate as cell 1: every client message passes it before the fight engine sees it). The access table and the sender check go in the gate; the strike ledger sits beside it in the same module, because it is the only consumer. If Lead wants the ledger in its own module, that is a separate decision and is not made here.
- Parity-checklist row 5 (controls/input). The addendum puts input intake here. Row 17 (death and respawn) is not a fit for a kick or ban. Row 19 (fight record and replay) does not fit. No row of 1-22 covers an access table, so row 5 is the closest.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only)
- Brief rule served: server-verified kills and one engine (clients may only send intent; a message that claims a server verdict is refused); licence rule 7 (GPL, shape only)

Decision (proposed): adapt. Take the access table, the sender-equals-connection rule and the strike ledger shape (window, extension, promotion at a count, capped list). Change two things: key strikes by account or session first, with IP as a secondary signal, because an IP ban hits everyone behind shared NAT (the donor is IP-only); and do not copy the broadcast-to-all relay, because Frankendom's server sends state, not relayed peer messages.
Acceptance: a server test sends a client `kill` or `loot-grant` message (a server-only verdict) and the connection is closed and the account marked for review, with the world unchanged; a client message with another character's id is refused with no state change; 100 refused connects inside the window from one key add a permanent entry, and a single bad-version probe gives a 30-minute refusal and nothing more.

## 6. Gaps and risks

- The donor's kick-and-ban is immediate and permanent for an access violation. That is harsh for a bug in a client build. Frankendom should log first, ban only on repeat, and keep the immediate kick for server-only verdicts, since those cannot come from a real client.
- IP-only bans: the donor keys every strike and ban on the IP text. Frankendom has accounts and sessions; key the ledger there, and treat IP as an extra signal, not the key.
- The donor's drop-vs-kick split is inconsistent: a corrupt nested message kicks and bans, but a corrupt envelope only logs (2400-2406). Frankendom must pick one rule and test both cases.
- One ledger: the donor writes strikes to a log, to a 512-entry cache and to a permanent list. Frankendom should keep one ledger row per strike and derive the rest from it.
- MAX_ATTACKERS = 3 is not part of this mechanism. The donor's relay carries chat and game messages, not many-on-one target rules; hate and target selection stay in the engine.
- Pit as client: the gate is server code. Pit inputs use the same gate; no client change.
- The lobby connect check and the hash-request path were only partly read. Do not rely on the donor's lobby flow for Frankendom's browser client, which has no file-hash step.
- GPL-2.0-or-later: clean-room only. The sketch was written from the mechanism, not translated.
