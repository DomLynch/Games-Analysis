// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
export {};

type Delivery = 'everyone' | 'staff-only';

// expiresMs: 0 = no mute, -1 = permanent, otherwise an epoch-ms expiry (donor convention, Player.java 2120-2128).
interface MuteRow { expiresMs: number; shadow: boolean; }

interface ChatSender {
  staff: boolean;
  tutorial: boolean;
  babyMode: boolean;
  mute: MuteRow | null;
}

const MIN_WORD_LEN = 3;

// Word list loader: lowercase, drop words shorter than 3, longest first (donor MessageFilter 44 and 95-98).
export function prepareWords(words: string[]): string[] {
  return words
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= MIN_WORD_LEN)
    .sort((a, b) => b.length - a.length);
}

// Length-preserving leet normaliser, so an index found in the normalised text is valid in the original text.
// Donor de1337 (MessageFilter 364-391) also maps y, l, j, v, z, 6, 9 and more; those are left out here (see section 6).
const LEET: Array<[string, string]> = [
  ['13', ' b'], ['ph', ' f'], ['vv', 'w '], ['3', 'e'], ['7', 't'], ['4', 'a'], ['@', 'a'],
  ['0', 'o'], ['5', 's'], ['1', 'i'], ['9', 'g'], ['6', 'g'],
];

function normalise(s: string): string {
  let out = s.toLowerCase();
  for (const [from, to] of LEET) out = out.split(from).join(to); // literal replace, no regex
  return out;
}

function mask(text: string, start: number, len: number): string {
  return text.slice(0, start) + '*'.repeat(len) + text.slice(start + len);
}

export interface FilterResult { text: string; hits: string[]; failed: boolean; }

// Pipeline: goodwords shielded first, then literal badwords, then the leet pass, then goodwords restored.
// Fail closed: any error returns a neutral placeholder instead of the raw text.
export function filterText(raw: string, bad: string[], good: string[]): FilterResult {
  try {
    const hits: string[] = [];
    let msg = raw;

    // 1. Goodwords (whitelist): mask in place and remember the original text by index.
    const saved = new Map<number, string>();
    for (const g of good) {
      let i = msg.toLowerCase().indexOf(g);
      while (i !== -1) {
        saved.set(i, msg.slice(i, i + g.length));
        msg = mask(msg, i, g.length);
        i = msg.toLowerCase().indexOf(g);
      }
    }

    // 2. Badwords, literal match, longest first. Each hit is masked with the same number of stars.
    for (const b of bad) {
      let i = msg.toLowerCase().indexOf(b);
      while (i !== -1) {
        hits.push('badword:' + b);
        msg = mask(msg, i, b.length);
        i = msg.toLowerCase().indexOf(b);
      }
    }

    // 3. Leet pass: normalise both sides, mask hits in the original text.
    for (const b of bad) {
      const nb = normalise(b);
      let i = normalise(msg).indexOf(nb);
      while (i !== -1) {
        hits.push('leet:' + b);
        msg = mask(msg, i, b.length);
        i = normalise(msg).indexOf(nb);
      }
    }

    // 4. Restore goodwords at their saved indices (masks kept every length, so the indices still line up).
    for (const [i, original] of saved) {
      msg = msg.slice(0, i) + original + msg.slice(i + original.length);
    }
    return { text: msg, hits, failed: false };
  } catch {
    return { text: '[filtered]', hits: ['error'], failed: true };
  }
}

function isMuted(mute: MuteRow | null, nowMs: number): boolean {
  if (!mute || mute.expiresMs === 0) return false;
  if (mute.expiresMs === -1) return true;
  return mute.expiresMs > nowMs;
}

export interface ChatRoute {
  delivery: Delivery;
  text: string;
  notice: string | null;   // sent back to the sender only, and only for a visible (non-shadow) mute
  logged: boolean;         // restricted chat is never written to the chat log
}

// Gate order: mute and tutorial/baby-mode first; restricted text skips the filter (as in donor ChatHandler 34-38)
// and goes to staff only; ordinary text is filtered and goes to everyone.
export function routeChat(sender: ChatSender, raw: string, bad: string[], good: string[], nowMs: number): ChatRoute {
  const muted = isMuted(sender.mute, nowMs);
  const restricted = (muted || sender.tutorial || sender.babyMode) && !sender.staff;

  let notice: string | null = null;
  if (muted && sender.mute && !sender.mute.shadow) {
    notice = sender.mute.expiresMs === -1 ? 'You have been permanently muted.' : 'You have been temporarily muted.';
  }

  if (restricted) {
    return { delivery: 'staff-only', text: raw, notice, logged: false };
  }
  const filtered = filterText(raw, bad, good);
  return { delivery: 'everyone', text: filtered.text, notice, logged: true };
}
