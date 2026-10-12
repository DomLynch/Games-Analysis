// Licence: MIT (donor 2004Scape-Server, Lost City). clean-room sketch written from the described mechanism, not a translation of the donor lines.
type ChatMode = 'on' | 'friends' | 'off';

interface SocialState {
  muted_until: number | null;      // epoch ms; null = not muted
  socialUsedThisTick: boolean;     // one social action per server tick
  publicChat: ChatMode;
  privateChat: ChatMode;
  friends: Set<string>;
  ignores: Set<string>;
}

const TICK_MS = 600;               // server tick
const MAX_INPUT = 100;             // chars accepted from the client
const MAX_OUTPUT = 80;             // chars kept after the clamp
const LIST_CAP = 100;              // friends and ignores, each

type ChatResult = { ok: true; text: string } | { ok: false; reason: 'rate' | 'length' | 'muted' };

// Gate one public or private chat line. Order: tick gate, length, mute; the slot is taken only on success.
function acceptChat(p: SocialState, raw: string, nowMs: number): ChatResult {
  if (p.socialUsedThisTick) return { ok: false, reason: 'rate' };
  if (raw.length > MAX_INPUT) return { ok: false, reason: 'length' };
  if (p.muted_until !== null && p.muted_until > nowMs) return { ok: false, reason: 'muted' };
  p.socialUsedThisTick = true;
  return { ok: true, text: raw.slice(0, MAX_OUTPUT) };
}

// Called once per tick for every player (donor: per-player reset in the cycle).
function endTick(p: SocialState): void {
  p.socialUsedThisTick = false;
}

// Online-status visibility. Mirrors isVisibleTo: staff see all, an ignore hides, OFF hides, FRIENDS shows to friends only.
function canSeeStatus(viewer: string, other: SocialState, viewerIsStaff: boolean): boolean {
  if (viewerIsStaff) return true;
  if (other.ignores.has(viewer)) return false;
  if (other.privateChat === 'off') return false;
  if (other.privateChat === 'friends') return other.friends.has(viewer);
  return true;
}

// Fix to the donor: its private-message send path checks no ignore list, so ignore and OFF are checked here before forwarding.
function canDeliverPrivate(sender: string, target: SocialState): boolean {
  if (target.ignores.has(sender)) return false;
  return target.privateChat !== 'off';
}

// Capped add to a friend or ignore list (donor: 100 each).
function addCapped(list: Set<string>, name: string): boolean {
  if (list.size >= LIST_CAP) return false;
  list.add(name);
  return true;
}

export {};
