// Licence: LGPL-3.0 / GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Snap {
  hp: number; maxHp: number; mp: number; maxMp: number;
  x: number; y: number; z: number;
  objId: number;
  sentAt: number;                 // ms, when this snapshot was last claimed for sending
}

type Pose = Omit<Snap, "sentAt">;

interface Member { id: number; online: boolean; pose: () => Pose; }

const RESYNC_MS = 5000;   // send again after this long even if nothing changed
const POS_EPS = 0.01;     // position tolerance, units

function same(a: Snap, b: Snap): boolean {
  return a.hp === b.hp && a.maxHp === b.maxHp && a.mp === b.mp && a.maxMp === b.maxMp &&
    Math.abs(a.x - b.x) < POS_EPS && Math.abs(a.y - b.y) < POS_EPS && Math.abs(a.z - b.z) < POS_EPS &&
    a.objId === b.objId;
}

// Recipient-and-source cache. Returns true when the source's snapshot must be sent to this recipient now,
// and records it. Same as the donor: send on change, or when the last send is older than RESYNC_MS.
function claim(cache: Map<string, Snap>, key: string, next: Snap): boolean {
  const prev = cache.get(key);
  if (prev !== undefined && same(prev, next) && next.sentAt - prev.sentAt < RESYNC_MS) return false;
  cache.set(key, next);
  return true;
}

function push(batches: Map<number, Snap[]>, recipient: number, snap: Snap): void {
  const list = batches.get(recipient);
  if (list !== undefined) list.push(snap);
  else batches.set(recipient, [snap]);
}

// One pass per team per tick. Online members only; pairs that share a region are skipped
// (the normal broadcast covers them); upper-triangle walk; one batch per recipient.
function syncTeam(members: Member[], cache: Map<string, Snap>, now: number,
                  sameRegion: (a: number, b: number) => boolean,
                  send: (recipient: number, batch: Snap[]) => void): void {
  const online = members.filter(m => m.online);
  if (online.length <= 1) return;
  const batches = new Map<number, Snap[]>();
  for (let i = 0; i < online.length; i++) {
    for (let j = i + 1; j < online.length; j++) {
      const a = online[i];
      const b = online[j];
      if (sameRegion(a.id, b.id)) continue;
      const sa: Snap = { ...a.pose(), sentAt: now };
      const sb: Snap = { ...b.pose(), sentAt: now };
      if (claim(cache, `${a.id}:${b.id}`, sb)) push(batches, a.id, sb);
      if (claim(cache, `${b.id}:${a.id}`, sa)) push(batches, b.id, sa);
    }
  }
  for (const [recipient, batch] of batches) send(recipient, batch);
}

export {};
