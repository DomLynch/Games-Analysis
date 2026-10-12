# OpenRA-OpenRA (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Cargo.cs` | Licence: GNU GPL version 3 (Cargo.cs header "either version 3 of"; `COPYING` line 2 "Version 3, 29 June 2007"; copyleft) | C# | symbol `Cargo` (`ReserveSpace`, `Load`, `HasSpace`)

Checked: Read in full: `Traits/Cargo.cs` (504 lines). Read: `Traits/Passenger.cs` 20-40, 110-125, 180-225 (reserve, unreserve, removed-from-world, the CanEnter pre-check); `Activities/RideTransport.cs` 25-90 (the enter activity: reserve at start, re-check and load on arrival, release on exit). Grep (scoped to `OpenRA.Mods.Common`): every caller of `ReserveSpace`, `UnreserveSpace`, `Load(`, `HasSpace(`, `CanLoad(`; the scripted callers were read at `ParatroopersPower.cs` 205-221, `TransportProperties.cs` 36-48, `ReinforcementsGlobal.cs` 132-144. Confidence: high on the budget, the reservation path, the commit and the cancel. Not read: `UnloadCargo` activity (where the unload delays and the LoadRange cell search are used; only the values are read), `Aircraft` landing and takeoff, the rest of `Passenger.cs`, the `WAngle` unit (512 read as given), the game tick rate (delays are "ticks"). The licence is GPL-3.0 (copyleft), so this is clean-room. camera_scope: n/a.

Best transferable idea: Hold capacity for an incoming item when the walk starts, commit it on arrival after a re-check, and give the hold back on cancel, so two actors cannot both book the last of a limited container.

Decision (proposed): adapt - take the reserve-at-engage, re-check-and-commit on arrival, release-on-cancel budget; fix the two donor defects in the sketch (the lock tests a weight sum instead of a reservation count, and the load does not enforce the cap); reject the aircraft landing and takeoff and the cell search (no aircraft in Frankendom, no moving containers).
Acceptance: A server test asserts that a second hero engaging a chest whose pack room is held by a first hero's engage is refused; cancelling the first hero's walk returns the room (the second can then engage); a scripted grant that would exceed the pack cap is refused by the ledger, and a zero-weight reservation still holds the pack lock until it is committed or cancelled.

## 1. Mechanism

- Capacity: each transport has `MaxWeight` (default 0, `Cargo.cs` 28). A passenger has `Weight` (default 1, `Passenger.cs` 30). `HasSpace(w)` is `totalWeight + reservedWeight + w <= MaxWeight` (`Cargo.cs` 336). So a hold counts against the same budget as a loaded passenger.
- Reserve at engage (not at arrival). `Passenger.Reserve` first drops any old reservation (`Passenger.cs` 193), then calls `Cargo.ReserveSpace` (194). `ReserveSpace` (`Cargo.cs` 262-279) returns true at once for an existing hold; otherwise it refuses when `HasSpace` fails (268). On success it grants the loading condition, adds the actor to `reserves` (274), adds the weight to `reservedWeight` (275), and locks the transport for pickup (276). `RideTransport.TryStartEnter` (`RideTransport.cs` 32-50) makes this call when the walk starts, and cancels the enter if the reserve is refused (40-43).
- Lock while held. `LockForPickup` (`Cargo.cs` 295-312) returns if already locked, otherwise sets the state to locked, cancels the transport's current activity, lands an aircraft if needed, and queues a wait until the state is free. So a carrier with a pending passenger holds still.
- Re-check and commit on arrival. The enter completes at the end of a frame (`RideTransport.cs` 58-60). It checks `enterCargo.CanLoad(self)` (70), which is true for a held passenger without a new space check (`Cargo.cs` 259). Then `Load` (76). `Load` (`Cargo.cs` 379-411) adds the passenger to `cargo`, adds the weight to `totalWeight` (383), and if the passenger held a reservation, moves its weight out of `reservedWeight` (386), removes the reservation, and releases the lock. The actor is removed from the world at the same frame end (`RideTransport.cs` 77).
- Release on cancel. `RideTransport.OnLastRun` (81-84) and `Cancel` (86-90) call `passenger.Unreserve` (`RideTransport.cs` 83, 88). That calls `Cargo.UnreserveSpace` (`Cargo.cs` 281-292): it takes the weight back from `reservedWeight` (286), removes the hold, and releases the lock. A passenger removed from the world also unreserves (`Passenger.cs` 201).
- Lock release. `ReleaseLock` (`Cargo.cs` 314-326) returns while `reservedWeight != 0` (316). Otherwise it sets the state to free and queues a wait of `AfterLoadDelay` ticks (321; value 8, line 56).
- Unload is last in, first out (`Cargo.cs` 341-343: `cargo[^1]`). Unload delays are configured as `BeforeUnloadDelay` 8 (59), `AfterUnloadDelay` 25 (62), `BetweenUnloadDelay` 0 (65). Their use is in `UnloadCargo` (not read).
- Death. With `EjectOnDeath` off (default, 40), every passenger is killed with the attacker (`Cargo.cs` 443-444). With it on, each passenger is set down on the carrier's cell if enterable, otherwise killed (416-439).

## 2. Key functions

- `ReserveSpace` and `UnreserveSpace`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Cargo.cs` 262-292. The budget hold and its release.
- `HasSpace` and `CanLoad`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Cargo.cs` 259 and 336.
- `Load`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Cargo.cs` 379-411. The commit (no cap check of its own).
- `ReleaseLock` and `LockForPickup`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Cargo.cs` 295-326.
- Caller order: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Activities/RideTransport.cs` 32-90 and `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Passenger.cs` 188-210.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Budget = loaded + held + incoming <= cap | `MaxWeight` default 0 (theirs: `Cargo.cs` 28), passenger weight default 1 (theirs: `Passenger.cs` 30) |
| Hold at engage, commit on arrival with a re-check, release on cancel | None (a rule) |
| Carrier waits while a hold is open | Delay after last load 8 ticks (theirs: `Cargo.cs` 56 and 321) |
| Load and unload pacing | Before-unload 8 (59), after-unload 25 (62), between-unload 0 (65) ticks |
| Ejection on death or sale | `EjectOnDeath` false (40), `EjectOnSell` true (37) |
| Cell search for a free drop tile | `LoadRange` 5 cells (50) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's budget (loaded + held + incoming against the cap), reserve and unreserve, the commit on arrival, the last-in-first-out unload and the lock predicate. It fixes two defects: the cap is checked inside `load` as well (the donor's `Load` trusts its callers, and four callers outside the ride path skip the check), and the lock tests the number of holds rather than their weight sum (the donor's `ReleaseLock` tests `reservedWeight != 0`, so a zero-weight hold does not hold the lock). It omits the aircraft landing and takeoff, the loading and unloading conditions, the delays in ticks, the facing set on unload, the ejection on death and on sale, the cell search (`LoadRange`) and the carrier's activity cancel. Checked on the VPS: `tsc --noEmit --strict --target es2020` exit 0; a node run of 7 cases (a second hold refused while the first is open, the room back after a cancel, a load over the cap refused, a zero-weight hold keeps the lock, last in first out): all as expected.

```ts
interface Passenger { id: string; weight: number; }

interface Cargo {
  maxWeight: number;                       // donor: MaxWeight (per transport)
  loaded: Passenger[];                     // loaded order; unload is last in, first out
  reserved: Map<string, number>;           // id -> reserved weight (not yet loaded)
}

const totalWeight = (c: Cargo): number => c.loaded.reduce((s, p) => s + p.weight, 0);
const reservedWeight = (c: Cargo): number => [...c.reserved.values()].reduce((s, w) => s + w, 0);

// Donor HasSpace: loaded + reserved + incoming <= max.
function hasSpace(c: Cargo, weight: number): boolean {
  return totalWeight(c) + reservedWeight(c) + weight <= c.maxWeight;
}

// Donor ReserveSpace: a repeat reserve by the same passenger succeeds; otherwise the room must exist.
function reserve(c: Cargo, id: string, weight: number): boolean {
  if (c.reserved.has(id)) return true;
  if (!hasSpace(c, weight)) return false;
  c.reserved.set(id, weight);
  return true;
}

// Donor UnreserveSpace: the cancel path gives the room back.
function unreserve(c: Cargo, id: string): void {
  c.reserved.delete(id);
}

// Donor Load: commit a reserved passenger. Donor Load() does not check the cap itself (its callers do);
// this sketch checks it here, so a scripted or paradrop load cannot overfill.
function load(c: Cargo, id: string, weight: number): boolean {
  const held = c.reserved.get(id);
  if (held === undefined && !hasSpace(c, weight)) return false;
  c.reserved.delete(id);
  c.loaded.push({ id, weight: held ?? weight });
  return true;
}

// Donor ReleaseLock tests the weight sum (reservedWeight != 0). This tests the reservation count instead,
// so a zero-weight reservation still holds the lock.
function locked(c: Cargo): boolean {
  return c.reserved.size > 0;
}

// Donor Unload: last in, first out.
function unloadLast(c: Cargo): Passenger | null {
  return c.loaded.pop() ?? null;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/OpenRA-cargo.ts), exit 0. Local copy: /private/tmp/p2/wave2-haiku/batch3/IV005/work/OpenRA-cargo.ts.

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed: the pack hold for a loot pickup sits with the loot ledger; the Frankendom repo was not read for this cell, so the path is a proposal).
- Parity-checklist row 18 (loot roll and XP award), sub-line for the pack: reserve at engage, commit on arrival.
- Reuse tag: rewrite-from-idea (GPL-3.0, copyleft: clean-room, shape only)
- Brief rule served: 1 (one ledger: the hold is server state inside the engine, and the commit is one validated step); rules 7-9 n/a

## 6. Gaps and risks

- Defect 1, lock predicate (`Cargo.cs` 316): `ReleaseLock` tests the weight sum, so a zero-weight hold does not keep the carrier locked, and a release can run while a hold is still open. Read from the code; I did not run a zero-weight case in the donor build. Fix: count the holds (sketch `locked`). The node test of the sketch confirms the fixed predicate holds the lock.
- Defect 2, cap on load (`Cargo.cs` 379-383; callers Traits/SupportPowers/ParatroopersPower.cs 219, Scripting/Properties/TransportProperties.cs 47, Scripting/Global/ReinforcementsGlobal.cs 142 and Traits/World/CrateSpawner.cs 164): the commit does not check the cap, and the four callers bypass the check, so they can overfill. Also seen: `UnreserveSpace` returns early when the carrier is dead (`self.IsDead`, Cargo.cs 283), so a hold on a dead carrier is never released. Fix: check inside the commit (sketch `load`). Frankendom's rule (one ledger) needs one check point.
- Gap, no expiry: the donor holds the room until a cancel or a removal from the world (`Passenger.cs` 201). A walk that stalls forever holds the room forever. Frankendom needs a time-out on the hold (not in the donor). The donor's cancel path (`RideTransport.cs` 81-90) covers cancel and removal; I did not read what happens when a passenger dies mid-walk beyond the removal hook.
- Reject: the carrier lock (`LockForPickup`, 295-312) stops the carrier's own activity so it waits. A chest or a corpse does not move, so only the hold is needed.
- Reject: aircraft landing and takeoff (`Cargo.cs` 304-308, 322-323). Frankendom has no aircraft.
- Reject for now: the cell search for a free drop tile (`LoadRange`, 50), which belongs to the donor's unload activity (not read). Loot drop placement is a zone-data question, not this rule.
- Presentation (client only): the delays (8, 25 and 0 ticks) are timing beats for animation. Frankendom's server commit is instant, and the client may pause for the same beats, but the server must not wait for them.
- Stacking: none. Passengers are discrete actors, not quantities. Bank: none. Gold and equipment are not modelled in this donor. Those parts of the topic are NONE for OpenRA.
- The idea is the same as Frankendom's engage-then-commit on a server-verified action: the hold is the engage state, and the arrival check is the commit.

Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Confirmed: four callers of Cargo.Load skip the cap check, not three; the fourth is Traits/World/CrateSpawner.cs:164. Paths are now given in full for ParatroopersPower, TransportProperties, ReinforcementsGlobal.
- Missed: Cargo.UnreserveSpace returns early when self.IsDead (Cargo.cs 283), so a hold on a dead carrier is never released.
Fixed 2026-10-12: caller count three -> four with full paths (sketch text and Defect 2), added the UnreserveSpace dead-carrier early return.
