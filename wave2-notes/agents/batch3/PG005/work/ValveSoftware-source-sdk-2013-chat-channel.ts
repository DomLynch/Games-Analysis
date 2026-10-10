// Licence: Valve Source SDK 2013 (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Channel = "all" | "team";
type Ignore = "none" | "team" | "all";

interface Player {
  id: number;
  teamId: string;       // "" means no team id
  alive: boolean;
  canSpeak: boolean;
  ignore: Ignore;       // what this listener has chosen to ignore
  muted: Set<number>;   // per-listener voice-mute list of speaker ids
}

// true = team-id rule (same non-empty team id); false = no teammates at all (base multiplay rule)
const TEAM_RULES = true;
const CHAT_CAP = 127;

// Clean-up first: cut at the first CR, LF or ESC, cap the length; nothing left means nothing to send.
function sanitize(raw: string): string | null {
  const cut = raw.search(/[\r\n\x1b]/);
  const t = (cut >= 0 ? raw.slice(0, cut) : raw).slice(0, CHAT_CAP);
  return t.length > 0 ? t : null;
}

function relation(a: Player, b: Player): "teammate" | "other" {
  if (!TEAM_RULES) return "other";
  return a.teamId !== "" && a.teamId === b.teamId ? "teammate" : "other";
}

// Listener-side filter: the ignore mode first, then a dead speaker is not heard by a living listener.
function canHearAndRead(listener: Player, speaker: Player): boolean {
  if (listener.ignore === "all") return false;
  if (listener.ignore === "team" && relation(listener, speaker) !== "teammate") return false;
  if (!speaker.alive && listener.alive) return false;
  return true;
}

// Returns the ids that receive the message. The sender gets an echo whenever the message is sent.
function say(speaker: Player, channel: Channel, raw: string, players: Player[]): number[] {
  const msg = sanitize(raw);
  if (msg === null) return [];
  if (!speaker.canSpeak) return [];
  const got: number[] = [];
  for (const l of players) {
    if (l.id === speaker.id) continue;
    if (channel === "team" && relation(l, speaker) !== "teammate") continue;
    if (!canHearAndRead(l, speaker)) continue;
    if (l.muted.has(speaker.id)) continue;
    got.push(l.id);
  }
  got.push(speaker.id);
  return got;
}

export {};
