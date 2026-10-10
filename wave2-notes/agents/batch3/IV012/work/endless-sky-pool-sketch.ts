// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Kind = 'passenger' | 'mission' | 'outfit' | 'commodity';
type Pref = 'none' | 'passengers' | 'cargo' | 'both';

// size in tons; -1 = unlimited (the donor's sentinel). counts: key -> units held.
interface Hold { size: number; counts: Map<string, number>; }
// tons per unit and kind per key.
interface Catalogue { tons: Map<string, number>; kind: Map<string, Kind>; }

const ORDER: Record<Kind, number> = { passenger: 0, mission: 1, outfit: 2, commodity: 3 };

function usedTons(h: Hold, cat: Catalogue): number {
  let t = 0;
  for (const [key, n] of h.counts) t += n * (cat.tons.get(key) ?? 0);
  return t;
}

function freeTons(h: Hold, cat: Catalogue): number {
  return h.size < 0 ? Infinity : h.size - usedTons(h, cat);
}

// Move up to amount units of key from src to dst. Whatever does not fit goes back into src,
// so a partial move never destroys cargo. Returns the units that actually moved.
function transfer(src: Hold, dst: Hold, key: string, amount: number, cat: Catalogue): number {
  if (amount <= 0) return 0;
  const have = src.counts.get(key) ?? 0;
  const removed = Math.min(amount, have);
  if (removed === 0) return 0;
  src.counts.set(key, have - removed);
  const w = cat.tons.get(key) ?? 0;
  let fits = removed;
  if (dst.size >= 0 && w > 0) fits = Math.max(0, Math.min(removed, Math.floor(freeTons(dst, cat) / w)));
  dst.counts.set(key, (dst.counts.get(key) ?? 0) + fits);
  src.counts.set(key, (src.counts.get(key) ?? 0) + (removed - fits));
  return fits;
}

// Priority order (donor's TransferAll): passengers if kept, then mission cargo, then outfits heaviest first,
// then commodities in key order.
function transferAll(src: Hold, dst: Hold, cat: Catalogue, keep: (k: Kind) => boolean): void {
  const kindOf = (k: string): Kind => cat.kind.get(k) ?? 'commodity';
  const keys = [...src.counts.keys()].filter(k => (src.counts.get(k) ?? 0) > 0 && keep(kindOf(k)));
  keys.sort((a, b) => {
    const ka = kindOf(a);
    const kb = kindOf(b);
    if (ORDER[ka] !== ORDER[kb]) return ORDER[ka] - ORDER[kb];
    if (ka === 'outfit') return (cat.tons.get(b) ?? 0) - (cat.tons.get(a) ?? 0);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  for (const k of keys) transfer(src, dst, k, src.counts.get(k) ?? 0, cat);
}

// Landed: every ship that is here pours its cargo into one pool. The pool is uncapped while it fills,
// then takes the total of the ships' sizes.
function poolCargo(pool: Hold, ships: Hold[], cat: Catalogue): void {
  pool.size = -1;
  for (const s of ships) transferAll(s, pool, cat, () => true);
  pool.size = ships.reduce((sum, s) => sum + s.size, 0);
}

// Takeoff: the flagship first, by preference (none, passengers only, cargo without passengers, or both);
// then each escort in order; then whatever is left goes to the flagship. Returns what is left in the pool.
function distribute(pool: Hold, flagship: Hold, escorts: Hold[], pref: Pref, cat: Catalogue): Hold {
  if (pref === 'passengers') transferAll(pool, flagship, cat, k => k === 'passenger');
  else if (pref === 'cargo') transferAll(pool, flagship, cat, k => k !== 'passenger');
  else if (pref === 'both') transferAll(pool, flagship, cat, () => true);
  for (const e of escorts) transferAll(pool, e, cat, () => true);
  transferAll(pool, flagship, cat, () => true);
  return pool;
}

export {};
