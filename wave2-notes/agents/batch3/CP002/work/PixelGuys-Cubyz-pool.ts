// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

interface PoolStats { total: number; free: number; live: number; }

interface Pool<T> {
  create(): T | undefined;   // undefined when the cap is reached
  destroy(item: T): void;
  stats(): PoolStats;
}

// Fixed-size object pool: create() takes a recycled item or makes a new one; destroy() puts it back.
// total - free is the number of items in use, which is the leak count the donor reports at deinit.
function makePool<T>(make: () => T, reset: (item: T) => void, cap: number): Pool<T> {
  const freeList: T[] = [];
  let totalAllocations = 0;
  let freeAllocations = 0;   // equals freeList.length
  return {
    create(): T | undefined {
      if (totalAllocations - freeAllocations >= cap) return undefined;   // added: cap (donor has none)
      let item: T;
      if (freeList.length > 0) {
        item = freeList.pop() as T;
      } else {
        item = make();
        totalAllocations++;
        freeAllocations++;
      }
      freeAllocations--;
      return item;
    },
    destroy(item: T): void {
      reset(item);
      freeList.push(item);
      freeAllocations++;
    },
    stats(): PoolStats {
      return { total: totalAllocations, free: freeAllocations, live: totalAllocations - freeAllocations };
    },
  };
}

// Usage sketch (not part of the donor): a pool for hit-feedback records (damage numbers, sparks).
const pool = makePool(() => ({ x: 0, y: 0, text: "" }), (r) => { r.x = 0; r.y = 0; r.text = ""; }, 64);
const rec = pool.create();
if (rec) { rec.text = "12"; pool.destroy(rec); }
console.log(pool.stats());

export {};
