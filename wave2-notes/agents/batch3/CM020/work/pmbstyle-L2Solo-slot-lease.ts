// Licence: Apache-2.0 (donor LICENSE). Adapted shape, rewritten here; not a line-by-line copy.
// Fix applied: the donor evicts the oldest bucket even when its leases are still live.

interface Pt { x: number; y: number; }
interface Owner { token: symbol; until: number; }
interface Bucket { points: Pt[]; owners: (Owner | null)[]; }
interface Lease { key: string; index: number; token: symbol; }
interface Attacker { id: number; lease: Lease | null; }

const MAX_BUCKETS = 256;
const LEASE_MS = 30_000;
const buckets = new Map<string, Bucket>();

function isLive(owner: Owner | null | undefined, now: number): boolean {
  return (owner?.until ?? 0) > now;
}

function release(a: Attacker): void {
  const lease = a.lease;
  if (!lease) return;
  const bucket = buckets.get(lease.key);
  if (bucket && bucket.owners[lease.index]?.token === lease.token) bucket.owners[lease.index] = null;
  a.lease = null;
}

// Make room for one new bucket: drop the oldest bucket with no live lease.
// If every bucket still has a live lease, refuse rather than hand out held slots again.
function makeRoomFor(now: number): boolean {
  if (buckets.size < MAX_BUCKETS) return true;
  for (const [key, bucket] of buckets) {
    if (!bucket.owners.some((o) => isLive(o, now))) {
      buckets.delete(key);
      return true;
    }
  }
  return false;
}

// Claim one ring point for one attacker. A lease is refreshed on every call and lapses after LEASE_MS.
function reserve(a: Attacker, key: string, makeRing: () => Pt[], now: number): Pt | null {
  if (a.lease && a.lease.key !== key) release(a);
  let bucket = buckets.get(key);
  if (!bucket) {
    if (!makeRoomFor(now)) return null;
    bucket = { points: makeRing(), owners: [] };
    buckets.set(key, bucket);
  }
  const lease = a.lease;
  if (lease && bucket.owners[lease.index]?.token === lease.token) {
    (bucket.owners[lease.index] as Owner).until = now + LEASE_MS;
    return bucket.points[lease.index] ?? null;
  }
  const n = bucket.points.length;
  for (let step = 0; step < n; step++) {
    const index = (Math.abs(a.id) + step) % n;
    if (isLive(bucket.owners[index], now)) continue;
    const token = Symbol('attack-slot');
    bucket.owners[index] = { token, until: now + LEASE_MS };
    a.lease = { key, index, token };
    return bucket.points[index] ?? null;
  }
  return null;
}

export {};
