// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

// Channel bits: one bit per squelchable channel type, bit = 1 << type (donor ChatMessageType.ToMask).
const SQUELCHABLE_BITS: number[] = [2, 3, 6, 7, 12, 16, 17, 18, 19, 21, 22, 23, 24, 25];
const ALL_CHANNELS = 0xffffffff;
const COMBINED = SQUELCHABLE_BITS.reduce((m, b) => (m | (1 << b)) >>> 0, 0);

// Add: a full set of squelchable channels collapses to ALL_CHANNELS (donor SquelchMask.Add, SquelchMask.cs 30-41).
function addMask(a: number, b: number): number {
  if (a === ALL_CHANNELS || b === ALL_CHANNELS) return ALL_CHANNELS;
  const r = (a | b) >>> 0;
  return r === COMBINED ? ALL_CHANNELS : r;
}

// Remove: clearing from ALL_CHANNELS first expands it to COMBINED (donor SquelchMask.Remove, SquelchMask.cs 43-59).
function removeMask(a: number, b: number): number {
  if (b === ALL_CHANNELS) return 0;
  const base = a === ALL_CHANNELS ? COMBINED : a;
  const r = (base & ~b) >>> 0;
  return r === COMBINED ? ALL_CHANNELS : r;
}

// hasAll: every bit of `need` is set (donor SquelchInfo.Filters[0].HasFlag).
function hasAll(mask: number, need: number): boolean {
  return ((mask & need) >>> 0) === need;
}

// One recipient's squelch set: account names squelched on every channel, per-character masks, and a global mask.
interface SquelchSet {
  accounts: Set<string>;
  characters: Map<string, number>;   // key: character id, value: channel mask
  global: number;
}

interface Speaker { id: string; account: string; isPlayer?: boolean; } // isPlayer defaults true; donor only checks account/character squelches for Player sources

// Contains: is this speaker squelched by this recipient on this channel? channel = null means "all channels".
// Non-squelchable channels are never squelched (donor SquelchDB.Contains line 126).
export function isSquelched(set: SquelchSet, speaker: Speaker, channelBit: number | null, squelchable: Set<number>): boolean {
  const need = channelBit === null ? ALL_CHANNELS : (1 << channelBit) >>> 0;
  if (channelBit !== null && !squelchable.has(channelBit)) return false;
  if (speaker.isPlayer !== false) {
    if (set.accounts.has(speaker.account)) return true;               // account squelch covers every channel
    const perChar = set.characters.get(speaker.id);
    if (perChar !== undefined && hasAll(perChar, need)) return true;
  }
  return set.global !== 0 && hasAll(set.global, need);
}

// Delivery fan-out: only recipients who have not squelched the speaker receive the line.
export function fanOut<R extends { id: string; set: SquelchSet }>(
  recipients: R[], speaker: Speaker, channelBit: number | null, squelchable: Set<number>,
): R[] {
  return recipients.filter((r) => !isSquelched(r.set, speaker, channelBit, squelchable));
}

// Gag: a timer on the player record. Only heartbeats count down, so time offline does not burn the gag.
export interface Gag { remainingS: number; }

export function gagTick(gag: Gag | null, heartbeatS: number): Gag | null {
  if (gag === null) return null;
  const left = gag.remainingS - heartbeatS;
  return left <= 0 ? null : { remainingS: left };
}

// Gate order for a speak action: gag first (so a gagged speaker gets no echo), then squelch at delivery.
export function canSpeak(gag: Gag | null): boolean {
  return gag === null;
}
