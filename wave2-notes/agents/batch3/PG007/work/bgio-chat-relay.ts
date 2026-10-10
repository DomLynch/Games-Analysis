// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type PlayerID = string;

interface Seat {
  name?: string;
  credentials?: string;   // set when a player claims the seat; absent for an unclaimed seat
}

interface ChatMessage {
  id: string;
  sender: PlayerID;       // a claim made in the message body; the credential decides whether it holds
  payload: unknown;
}

type Outcome = { ok: true } | { ok: false; error: "unauthorized" };

interface Match {
  seats: Record<PlayerID, Seat>;
  listeners: Set<(msg: ChatMessage) => void>; // one fan-out list per match, spectators included
}

// authEnabled: the server has an auth object (donor: this.auth is set).
// Credentials are required only when some seat holds one (donor: shouldAuthenticate).
function relayChat(match: Match, msg: ChatMessage, credentials: string | undefined, authEnabled: boolean): Outcome {
  if (authEnabled) {
    // A multiplayer client with no playerID (a spectator) sends no string sender, so it is refused.
    if (typeof msg.sender !== "string") return { ok: false, error: "unauthorized" };
    const usesCredentials = Object.values(match.seats).some((s) => !!s.credentials);
    if (usesCredentials) {
      const seat = match.seats[msg.sender];
      const ok = !!credentials && !!seat && !!seat.credentials && credentials === seat.credentials;
      if (!ok) return { ok: false, error: "unauthorized" };
    }
  }
  // No storage write: the message is only fanned out.
  for (const send of match.listeners) send(msg);
  return { ok: true };
}

// Client side: an in-memory, append-only list; nothing is replayed on reconnect.
class ChatClient {
  chatMessages: ChatMessage[] = [];

  receive(msg: ChatMessage): void {
    this.chatMessages = [...this.chatMessages, msg];
  }
}

export {};
