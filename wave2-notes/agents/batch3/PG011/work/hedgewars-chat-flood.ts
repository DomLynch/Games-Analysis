// Licence: GPL-2.0 (donor, version 2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Verdict = "pass" | "warn" | "kick";

interface Limit {
  absorb: number;                        // messages after a checked one that are neither counted nor checked
  shortSec: number; shortMax: number;    // warn at shortMax entries in shortSec; kick at shortMax + 1
  longSec: number; longMax: number;      // warn at longMax entries in longSec; kick at longMax + 1
}

interface Entry { at: number; absorb: number; }  // newest first
interface Bucket { entries: Entry[]; }

function check(b: Bucket, lim: Limit, now: number): Verdict {
  const head = b.entries[0];
  if (head !== undefined && head.absorb > 0) {   // inside an absorb run: count down, no check
    head.absorb -= 1;
    return "pass";
  }
  const recent = b.entries.filter(e => now - e.at <= lim.longSec);
  const l2 = recent.length;
  const l1 = recent.filter(e => now - e.at <= lim.shortSec).length;
  b.entries = [{ at: now, absorb: lim.absorb }, ...recent];
  if (l2 >= lim.longMax + 1 || l1 >= lim.shortMax + 1) return "kick";
  if (l2 >= lim.longMax || l1 >= lim.shortMax) return "warn";
  return "pass";
}

// Frankendom order: check first, then relay. A kicked message is never relayed.
function onChat(b: Bucket, lim: Limit, now: number, relay: () => void, warn: () => void, kick: () => void): void {
  const v = check(b, lim, now);
  if (v === "kick") { kick(); return; }
  if (v === "warn") warn();
  relay();
}

const chatLimit: Limit = { absorb: 3, shortSec: 10, shortMax: 2, longSec: 30, longMax: 3 };

export {}
