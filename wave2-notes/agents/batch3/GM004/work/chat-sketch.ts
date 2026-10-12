// Licence of donor: MIT (FPtje-DarkRP, LICENSE.txt). Clean-room sketch of the mechanism, not a line-by-line port.
export {};

type Channel = "say" | "ooc" | "whisper" | "yell" | "me" | "pm" | "radio" | "group";
type Group = "local" | "global" | "private" | "radio" | "group";

interface Player {
  id: number;
  name: string;
  x: number; y: number; z: number; // feet position, world units
  eyeZ: number;                    // eye height above the feet
  muteUntil: number;               // Infinity = until unmuted; 0 or past = not muted
  ignores: Set<number>;            // listener-side ignore list (player ids)
}

// Data: cooldown per GROUP, not per typed command. Fixes the donor's "/", "a", "ooc" bypass.
const GROUP_COOLDOWN_S: Record<Group, number> = {
  local: 0.5, global: 1.5, private: 1.5, radio: 1.5, group: 1.5,
};

// Data: listen range per channel in world units; 0 = not range-limited.
const CHANNEL: Record<Channel, { group: Group; range: number }> = {
  say:     { group: "local",   range: 250 },
  whisper: { group: "local",   range: 90 },
  yell:    { group: "local",   range: 550 },
  me:      { group: "local",   range: 250 },
  ooc:     { group: "global",  range: 0 },
  pm:      { group: "private", range: 0 },
  radio:   { group: "radio",   range: 0 },
  group:   { group: "group",   range: 0 },
};

// Cooldown gate. A refused attempt does not restart the timer (as in the donor).
export class ChatGate {
  private last = new Map<string, number>();

  allow(p: Player, channel: Channel, now: number): boolean {
    const group = CHANNEL[channel].group;
    const key = String(p.id) + ":" + group;
    const prev = this.last.get(key);
    if (prev !== undefined && now - prev < GROUP_COOLDOWN_S[group]) return false;
    this.last.set(key, now);
    return true;
  }
}

// One function decides who hears a message. The client preview calls this same function.
export function recipients(speaker: Player, channel: Channel, all: Player[], now: number): Player[] {
  if (speaker.muteUntil > now) return [];
  const range = CHANNEL[channel].range;
  const r2 = range * range;
  const sx = speaker.x;
  const sy = speaker.y;
  const sz = speaker.z + speaker.eyeZ; // eye point on both sides
  return all.filter((p) => {
    if (p.id === speaker.id) return true;
    if (p.ignores.has(speaker.id)) return false;
    if (range === 0) return true;
    const dx = p.x - sx;
    const dy = p.y - sy;
    const dz = (p.z + p.eyeZ) - sz;
    return dx * dx + dy * dy + dz * dz <= r2;
  });
}

export type Target =
  | { ok: true; player: Player }
  | { ok: false; reason: "empty" | "none" | "ambiguous"; count: number };

// Exact id or name first; a partial name must match exactly one player, otherwise refuse.
export function resolveTarget(query: string, all: Player[]): Target {
  const q = query.trim().toLowerCase();
  if (q === "") return { ok: false, reason: "empty", count: 0 };
  const exact = all.filter((p) => String(p.id) === q || p.name.toLowerCase() === q);
  const hits = exact.length > 0 ? exact : all.filter((p) => p.name.toLowerCase().includes(q));
  if (hits.length === 0) return { ok: false, reason: "none", count: 0 };
  if (hits.length > 1) return { ok: false, reason: "ambiguous", count: hits.length };
  return { ok: true, player: hits[0] };
}

// Mute with a stored expiry (no timer to clear). Checks every target before writing any.
export function muteAll(targets: Player[], seconds: number, now: number, canMute: (p: Player) => boolean): boolean {
  if (!targets.every(canMute)) return false;
  const until = seconds === 0 ? Infinity : now + seconds;
  for (const p of targets) p.muteUntil = Math.max(p.muteUntil, until); // never shorten an existing mute
  return true;
}
