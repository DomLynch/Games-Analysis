// Licence: MIT (donor LICENSE.md). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const RATE_LIMIT_S = 0.66; // donor value, Chat.cs line 14
const MAX_LEN = 200;       // placeholder; the donor reads a project setting (ChatMaxMessageLength), value not read

interface Sender { id: string; lastSpokeAt: number | null; }

type Outcome =
  | { kind: "dropped"; reason: "empty" | "rate" }
  | { kind: "sent"; text: string; to: string[] };

// Strip control, zero-width, bidi and line-separator characters, then trim.
function clean(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c <= 0x1f || c === 0x7f) continue;
    if (c >= 0x200b && c <= 0x200f) continue;
    if (c >= 0x202a && c <= 0x202e) continue;
    if (c === 0x2028 || c === 0x2029 || c === 0xfeff) continue;
    out += ch;
  }
  return out.trim();
}

// Host-side intake for one line. routeTo plays the role of the scene event's RecipientFilter
// (zone, party or whisper); blockedBy is the host-side block list the donor does not have.
function intake(
  sender: Sender,
  raw: string,
  now: number,
  members: string[],
  routeTo: (receiver: string) => boolean,
  blockedBy: (receiver: string, senderId: string) => boolean,
): Outcome {
  const cleaned = clean(raw);
  if (cleaned.length === 0) return { kind: "dropped", reason: "empty" }; // checked before the timer

  if (sender.lastSpokeAt !== null && now - sender.lastSpokeAt < RATE_LIMIT_S) {
    return { kind: "dropped", reason: "rate" };
  }
  sender.lastSpokeAt = now; // timer starts only for a line that is accepted

  const text = cleaned.length > MAX_LEN ? cleaned.slice(0, MAX_LEN) : cleaned;
  const to = members.filter(r => routeTo(r) && !blockedBy(r, sender.id));
  return { kind: "sent", text, to };
}

export {};
