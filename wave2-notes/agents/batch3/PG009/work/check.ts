// Licence: Sustainable Use License 1.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const MAX_SLOTS = 4;

interface Monster { whoHit: number }          // bit i set = player slot i has hit this monster

function tagMonster(m: Monster, attackerSlot: number): void {
  m.whoHit |= 1 << attackerSlot;
}

function mergeTags(local: Monster, incoming: number): void {
  local.whoHit |= incoming;                    // union of credits received from a sync
}

interface Pawn { slot: number; alive: boolean; level: number; xp: number; }

// Equal share among every tagged slot, then one scaled grant to the local slot.
function awardKill(baseExp: number, monsterLevel: number, whoHit: number,
                   local: Pawn, nextThreshold: number): void {
  let tagged = 0;
  for (let i = 0; i < MAX_SLOTS; i++) {
    if ((whoHit >> i) & 1) tagged++;
  }
  if (tagged === 0) return;
  const share = Math.floor(baseExp / tagged);  // integer share, divisor counts all tagged slots
  if (((whoHit >> local.slot) & 1) === 0) return;
  if (!local.alive) return;                    // as in the donor: a dead tagger stays in the divisor, so its share is lost
  const gap = monsterLevel - local.level;
  let xp = Math.max(0, Math.trunc(share * (1 + gap / 10)));   // 10 percent per level of gap, floor 0
  xp = Math.min(xp, Math.floor(nextThreshold / 20), 200 * local.level); // multiplayer cap
  local.xp += xp;
}
export {};
