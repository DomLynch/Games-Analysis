// Licence: GPL-3.0 (donor, LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Realm = "A" | "B" | "C" | "none";
type RelicKind = "strength" | "magic";

interface Relic {
  id: number;
  kind: RelicKind;
  originalRealm: Realm;
  realm: Realm;                 // realm of the pad it sits on; "none" while carried or on the ground
  mountedOn: number | null;     // pad id, null when carried or on the ground
  carrierId: number | null;
  x: number;
  y: number;
  droppedAtMs: number | null;   // set when it lands on the ground: the return clock starts here
  returnPadId: number;          // the pad it goes back to
}

interface Pad { id: number; realm: Realm; relicIds: number[]; }

const RETURN_MS = 1200000;      // donor: Relic_Return_Time = 20 * 60 seconds (GameRelic.cs ReturnRelicInterval)
const OWNING_BONUS = 0.10;      // donor: relic_owning_bonus = 10 percent per captured enemy relic
const PICKUP_ENEMIES = 16;      // donor: relic_players_required_on_pad = 16
const PAD_MAX = 3;              // donor: MountRelic refuses at 3 relics on a pad

// Bonus: 1.0 unless your own original relic of this kind is mounted; then +10% per captured enemy relic.
function relicBonus(realm: Realm, kind: RelicKind, relics: Relic[]): number {
  let modifier = 1.0;
  let owningSelf = false;
  for (const r of relics) {
    if (r.realm !== realm || r.kind !== kind || r.mountedOn === null) continue;
    if (r.realm === r.originalRealm) owningSelf = true;
    else modifier += OWNING_BONUS;
  }
  return owningSelf ? modifier : 1.0;
}

// Pickup: a relic on an enemy pad needs enough enemies on the pad, and your realm must already hold
// its own original of the same kind on a pad. Your own original is always allowed (donor shrine rule).
function canPickup(realm: Realm, relic: Relic, relics: Relic[], enemiesNearPad: number): boolean {
  if (relic.carrierId !== null) return false;
  if (relic.mountedOn !== null && relic.realm === realm) return false;   // owned by your realm
  if (relic.mountedOn !== null && enemiesNearPad < PICKUP_ENEMIES) return false;
  if (relic.originalRealm === realm) return true;
  return relics.some(r => r.realm === realm && r.originalRealm === realm && r.kind === relic.kind && r.mountedOn !== null);
}

// Carrier loses the relic (death, quit, linkdeath, dropped item). It lands where the carrier stands.
function onCarrierLost(relic: Relic, x: number, y: number, nowMs: number): void {
  relic.carrierId = null;
  relic.realm = "none";
  relic.x = x;
  relic.y = y;
  relic.droppedAtMs = nowMs;
}

// Fix to the donor's stealth handler: drop the relic only when the carrier becomes stealthed.
function onStealthChanged(relic: Relic, nowStealthed: boolean, x: number, y: number, nowMs: number): void {
  if (relic.carrierId === null || !nowStealthed) return;
  onCarrierLost(relic, x, y, nowMs);
}

// Poll step (the donor polls every 4000 ms): a ground relic returns to its pad when the clock runs out.
function returnTick(relic: Relic, nowMs: number, pads: Map<number, Pad>): void {
  if (relic.mountedOn !== null || relic.carrierId !== null || relic.droppedAtMs === null) return;
  if (nowMs - relic.droppedAtMs < RETURN_MS) return;
  const pad = pads.get(relic.returnPadId);
  if (!pad || pad.relicIds.length >= PAD_MAX) return;   // stays on the ground; the donor logs an error here
  pad.relicIds.push(relic.id);
  relic.mountedOn = pad.id;
  relic.realm = pad.realm;
  relic.droppedAtMs = null;
}

export {};
