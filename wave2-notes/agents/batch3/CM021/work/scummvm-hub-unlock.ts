// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface HubDestination {
  id: string;        // e.g. "secret-red"
  target: string;    // level or zone id to warp to
  unlockAt: number;  // collectible count that reveals this destination (zone data)
}

interface HubLedger {  // server-side state; the client never writes it
  collected: number;
  unlocked: Set<string>;
}

// Called once per server-verified pickup. Returns the destinations that unlock on THIS pickup, each exactly once.
function recordPickup(ledger: HubLedger, dests: HubDestination[]): HubDestination[] {
  ledger.collected += 1;
  const fresh: HubDestination[] = [];
  for (const d of dests) {
    if (ledger.collected >= d.unlockAt && !ledger.unlocked.has(d.id)) {
      ledger.unlocked.add(d.id);  // latch: the announce and the unlock happen once
      fresh.push(d);
    }
  }
  return fresh;
}

// The hub may draw and warp to a destination only if the server has latched it.
function canWarp(ledger: HubLedger, d: HubDestination): boolean {
  return ledger.unlocked.has(d.id);
}

const hubDests: HubDestination[] = [
  { id: "secret-red", target: "MAP30", unlockAt: 7 },
  { id: "secret-green", target: "MAP30", unlockAt: 14 },
  { id: "secret-blue", target: "MAP30", unlockAt: 21 },
];
const ledger: HubLedger = { collected: 0, unlocked: new Set<string>() };
for (let n = 0; n < 8; n++) recordPickup(ledger, hubDests);
// After 8 pickups only the red destination is latched, and it cannot re-announce.
const again = recordPickup(ledger, hubDests);
console.log(again.length, canWarp(ledger, hubDests[0]), canWarp(ledger, hubDests[1]));
