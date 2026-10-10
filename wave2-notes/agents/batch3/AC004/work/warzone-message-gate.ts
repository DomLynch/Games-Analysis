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
