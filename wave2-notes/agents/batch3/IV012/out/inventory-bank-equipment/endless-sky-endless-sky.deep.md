# endless-sky-endless-sky (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/endless-sky-endless-sky/source/CargoHold.cpp` | Licence: GPL-3.0 (`license.txt` line 2: "Version 3, 29 June 2007"; source headers "Endless Sky is free software ... GNU General Public License") | C++ | symbols `CargoHold::Transfer`, `CargoHold::TransferAll`, `PlayerInfo::PoolCargo`, `PlayerInfo::DistributeCargo`

Checked: Read in full: `CargoHold.h` (1-132, class and comments); `CargoHold.cpp` 30-54 (outfit ordering), 159-206 (size, free, used), 393-430 (`Transfer` for commodities and outfits), 431-457 (`Transfer` for missions, the clamp), 478-565 (`TransferAll`, `Add`, `Remove`); `PlayerInfo.cpp` 1694-1712 (`UpdateCargoCapacities`), 2110-2153 (`PoolCargo`, `DistributeCargo`); `Ship.cpp` 2490-2512 (auto-plunder), 3940-3962 (fighter bay return); `Preferences.h` 125-130 (the priority enum); one data line from `data/coalition/coalition ships.txt`. Callers of `TransferAll` checked: `PlayerInfo.cpp` 1940, 2122, 2139, 2146, 2151; `Ship.cpp` 2505, 3955. Callers of `DistributeCargo`: `PlanetPanel.cpp:450` (the call was seen, not the screen code that uses the returned hold). Not read: `TransferPassengers` body (458-476), `Load`/`Save`, `Value`, `IllegalCargoFine`, the sale of any leftover, bunks logic beyond the setters, the data files for outfit masses (only one ship line read). The pilot-pause unit (`pilotError`) was not read. Confidence: high on the transfer rule and the pool and distribute order; high on the priority order inside `TransferAll`. Camera: not applicable.

## 1. Mechanism

Pool and distribute, with a remainder rule. A landed player pools all cargo from the ships in port into one hold with no cap. On takeoff the pool is handed back to the ships in a priority order, and anything that does not fit stays in the pool. No move destroys cargo.

Order of steps:
1. The move rule (`CargoHold::Transfer`, 393-430). For a commodity: remove up to `amount` from the source (402), ask the destination to take that many (`to.Add`, 403), then put the part that did not fit back into the source (404). The outfit version is the same (423). `Add` clamps to what fits: commodities to whole tons of free space (515), outfits to whole units that fit the precise free mass (531). The destination returns the count it took, so the caller learns the real amount.
2. The priority order (`CargoHold::TransferAll`, 481-505). Passengers first, but only if asked (484). Then mission cargo (492). Then outfits, heaviest first (498; sort at 44). Then commodities in map order (501). The header comment (480) lists mission, outfits and commodities only, and does not mention passengers.
3. Landing (`PlayerInfo::PoolCargo`, 2110-2124). Only while landed. The player's hold is set to unlimited (2118). Every ship in port that is not parked moves its cargo into it with `TransferAll` (2122). Then `UpdateCargoCapacities` sets the hold's size to the sum of "cargo space" over the ships in port that are not parked (1694-1710, the per-ship read at 1703) and sets the bunks the same way.
4. Takeoff (`PlayerInfo::DistributeCargo`, 2128-2153). (a) The flagship's bunks are set (2131). (b) The flagship takes cargo by preference: passengers only (2135); cargo without passengers, or both (2139), or nothing (preference none). (c) Each escort in port that is not parked, not disabled and not the flagship takes what it can, all kinds (2146). (d) Whatever is left goes to the flagship with no preference (2151). The leftover is returned (2153). The header says leftover "will not fit it must be sold off" (CargoHold.h 37-38); what the caller does with it was not read.
5. Plunder (`Ship.cpp` 2504-2508). On auto-plunder the taker takes the victim's commodities that fit, with no passengers (2505), then sets `pilotError = 120` (2508). The comment on 2507 says "Pause for two seconds"; the unit of `pilotError` was not read.
6. Fighter return (`Ship.cpp` 3954-3955). A fighter that docks with cargo moves it into the carrier if the carrier has free space.

## 2. Key functions

- `CargoHold::Transfer` (commodity and outfit): `/mnt/frankendom-donors/endless-sky-endless-sky/source/CargoHold.cpp` 393-430. Remove, add what fits, return the rest to the source.
- `CargoHold::TransferAll`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/CargoHold.cpp` 481-505. The priority order.
- `CargoHold::Add`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/CargoHold.cpp` 508-537. Clamp to free space; outfits by precise mass.
- `PlayerInfo::PoolCargo`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/PlayerInfo.cpp` 2110-2124. Landed pool.
- `PlayerInfo::UpdateCargoCapacities`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/PlayerInfo.cpp` 1694-1712. Pool size from the ships in port.
- `PlayerInfo::DistributeCargo`: `/mnt/frankendom-donors/endless-sky-endless-sky/source/PlayerInfo.cpp` 2128-2154. Takeoff distribution.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Move up to N, take what fits, put the rest back in the source (never lose) | None (the rule). Theirs (402-404, 423). |
| Capacity with a sentinel for unlimited | -1 (CargoHold.h:123). Theirs. |
| Heaviest first when space is short (first-fit decreasing shape) | Sort key is mass (44), applied at 498. Theirs. |
| Pool is uncapped while it fills, then capped to the sum of the holds | -1 at 2118; sum of "cargo space" at 1703. Theirs. |
| Flagship priority: none, passengers, cargo, both | Enum at Preferences.h:125-130 (values NONE, PASSENGERS, CARGO, BOTH). Theirs. |
| Ship cargo space is per-ship data | Example: "cargo space" 94 in `data/coalition/coalition ships.txt` line 31; other lines in the same file read as 372 and 688 (grep, not receipts). Data. |
| Pilot pause after plunder | `pilotError = 120` (2508); unit not read. Theirs. |

## 4. TypeScript sketch

simplified: the sketch keeps the move rule (take what fits, put the rest back), the priority order, the uncapped pool, and the takeoff order (flagship by preference, escorts, leftover to the flagship). It differs in four places. (a) One exact free-tons rule is used for every kind; the donor uses whole tons for commodities (515) and precise mass for outfits (531). (b) Commodities are sorted by key, as the donor's map order, but passengers and missions are plain keys with a kind, not separate maps. (c) The pool's size is set from the ships passed in, as `UpdateCargoCapacities` does, without the donor's bunk counts. (d) Omitted: bunks and crew, the illegal-cargo fines, the sale of the leftover, the plunder path, the fighter bay, and the zero-ton mission entries kept in the map (478-496).

```ts
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
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/IV012-endless-sky-pool-sketch.ts): exit 0.

## 5. Lands in

- TARGET `origins/inventory/pool.ts` (proposed path; not checked against the Frankendom repo): one ledger, several holds (bank, bag, equipment as capped views). Moves take what fits and return the rest to the source. Takeoff or leave-town distributes by a fixed priority. Parity-checklist row 18 (loot roll and XP award): the take-what-fits rule is the loot pickup.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one ledger: a move moves entries between views of one ledger; a remainder is never lost); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- One character, one ledger. The donor has a hold per ship, each with its own cap, and moves cargo between them. Frankendom's rule is one ledger, so a bag or bank must be a capped view of the same entries, not a separate store with its own totals. Copying the per-ship holds would break that rule.
- Not atomic across holds. Each move is partial (what fits). For loot that is the right presentation ("took 3 of 5, 2 stay"), but the server must record the taken count and the remainder in one write, and the donor does not show that.
- Auto-plunder takes what fits with no choice (2505). Frankendom's loot presentation needs a decision on whether the player picks, and the rest stays with the corpse or the chest.
- Priority order is a design choice in the donor (passengers when flagged, then missions, then outfits heaviest first, then commodities by name). Frankendom needs its own order as data (for example quest items first, then heavy gear). The donor's comment (480) and code (484) differ on passengers; do not copy the comment.
- The leftover at takeoff is returned to the caller (2153) and the header says it must be sold (CargoHold.h 37-38). Frankendom has no sale in this path; the leftover needs a rule (stay in the bank, mail, or drop).
- The donor's "pilot pause" is a unit-less 120 (2508). Frankendom should set any pause as a data field in seconds or ticks, with the unit stated.
- Data: cargo space and outfit masses are in faction data files (one line read: 94 tons, `coalition ships.txt` line 31). Frankendom's bag sizes should be data fields, not copies.
- Phone layout: no UI in these functions. The loot panel and the bank screen are not read.
- No defect was found in the read code. Not run.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one ledger: a move moves entries between views of one ledger; a remainder is never lost); rules 7-9 n/a

Best transferable idea: a bank or bag move takes what fits and returns the rest to the source, and a takeoff-style distribution hands a pool back to the carriers in a fixed priority order, so nothing is lost when space runs out.

Decision (proposed): adapt - keep the take-what-fits move, the remainder kept in the source, the uncapped pool while filling, and a fixed priority order (as data); do not copy the per-ship holds, which conflict with one ledger.
Acceptance: a server test asserts that moving 50 units into a bag with room for 10 moves 10, leaves 40 in the bank ledger, and keeps the total at 50; that a takeoff-style distribution fills the flagship view by preference before escorts; and that a loot take of 5 into 3 free slots records 3 taken and 2 left in one write; on a 375 px phone the loot card reads "took 3 of 5, 2 stay".
