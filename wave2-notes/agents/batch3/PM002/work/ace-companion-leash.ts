// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Companion {
  moving: boolean;        // currently walking to the owner
  nextSlowTickS: number;  // server time of the next 1 s check
  despawned: boolean;
}

const TICK_S = 0.2;          // donor monsterTickInterval (Monster_Tick.cs:10)
const SLOW_TICK_S = 1.0;     // donor slowTickSeconds (Pet.cs:197)
const FOLLOW_START_M = 2.0;  // donor MinDistance (Pet.cs:228): start when farther, stop at this
const DESPAWN_M = 192.0;     // donor MaxDistance (Pet.cs:229)

interface CompanionStep { despawn: boolean; startFollow: boolean; }

// Called every TICK_S. The 1 s check runs only when its time is due.
// distM is the cylinder distance to the owner in metres (donor GetCylinderDistance).
function companionTick(c: Companion, nowS: number, ownerPresent: boolean, distM: number): CompanionStep {
  const none: CompanionStep = { despawn: false, startFollow: false };
  if (c.despawned || nowS < c.nextSlowTickS) return none;
  c.nextSlowTickS += SLOW_TICK_S;

  if (!ownerPresent || distM > DESPAWN_M) {
    c.despawned = true;
    return { despawn: true, startFollow: false }; // return here: the donor does not return after its despawn call
  }
  if (!c.moving && distM > FOLLOW_START_M) {
    c.moving = true;
    return { despawn: false, startFollow: true };
  }
  return none;
}

// Owner arrived or the move ended: the companion stands again (donor OnMoveComplete).
function onMoveComplete(c: Companion): void {
  c.moving = false;
}

// Spawn point: in front of the owner, far enough that the two body radii and the follow distance do not overlap.
function spawnDistance(ownerRadiusM: number, petRadiusM: number): number {
  return ownerRadiusM + petRadiusM + FOLLOW_START_M;
}
export {}
