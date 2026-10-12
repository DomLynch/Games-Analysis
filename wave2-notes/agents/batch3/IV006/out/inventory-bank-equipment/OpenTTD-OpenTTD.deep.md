# OpenTTD-OpenTTD (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/OpenTTD-OpenTTD/src/cargopacket.cpp (with cargopacket.h, economy.cpp) | Licence: GNU GPL v2 as read (cargopacket.cpp header: "version 2"; COPYING.md: "GNU General Public License") | C++ | symbol VehicleCargoList::Stage, VehicleCargoList::Unload, CargoPacket::Merge, VehicleCargoList::Append

Checked: opened cargopacket.cpp 116-130, 218-300, 426-520, 646-700, 855-891; cargopacket.h 67, 258-300; economy.cpp 1274-1284, 1700-1712, 1772-1782. Grepped the donor src/ for inventory/backpack/loot (no hits) and slot/stack (hits in GUI, newgrf and widget files, which I did not open). No equipment slots or bank exist in this donor. Not read: cargopacket.cpp 520-545 (tail of Stage), ChooseAction callers beyond Stage, CargoTransfer/CargoDelivery/CargoLoad action classes, GetLoadAmount, any network sync path. Confidence moderate: the stacking and staged-move mechanism is real and read; the item-slot part of the topic is absent from this donor. Camera: not a camera topic.

Best transferable idea: Plan the whole move first as per-designation counts (keep, drop, move, take), then commit it in capped steps that merge only identical-provenance stacks under a hard cap.
Decision (proposed): adapt — keep the plan-then-commit shape with a per-step budget and a stack cap; drop the tycoon next-hop routing and the money feeder share, because Frankendom inventory has no next station and one ledger rules out a side payment.
Acceptance: a server test moves 300 stackable items into a bag whose stack cap is 255 and gets stacks of 255 and 45 in order; a move the server rejects leaves source and destination unchanged.

## 1. Mechanism
A vehicle holds a list of CargoPacket records, each with a count, a source, a first station and a transit-period count. Two packets merge only when those fields match and the combined count stays at or under MAX_COUNT (65535). At a stop, VehicleCargoList::Stage() gives every packet one designation: Keep (order is no-unload, or the next hop is on the route ahead), Deliver (no valid next hop, the station accepts the cargo, and it did not start here), Transfer (the next hop is another station), and Load is the default for cargo the station will hand over. Stage() stores a count per designation and orders the list so each designation is one consecutive run. Unload() then removes Transfer packets from the front, up to a per-call budget (max_move). Deliveries run only after the transfer count is zero and budget remains. Loading is two-phase: the station reserves cargo as Load, and a later call moves up to max_move of the reserved amount from Load to Keep.

## 2. Key functions
- CargoPacket::Merge (cargopacket.cpp:116-119): adds the other packet's count and deletes it.
- AreMergable (cargopacket.h:263-268): packets merge only with the same source_xy, transit periods, first station and source.
- VehicleCargoList::Append (cargopacket.cpp:261-283): scans packets from the back, calls TryMerge, and pushes if nothing merged or the scanned sum reached the designation count.
- VehicleCargoList::Stage (cargopacket.cpp:455-520 read; 520-545 not read): zeroes Transfer, Deliver and Keep counts, then walks the packets and sets a designation per packet through ChooseAction (cargopacket.cpp:426-438) and the force flags for unload type.
- VehicleCargoList::Unload (cargopacket.cpp:646-660): Transfer first, capped by max_move (lines 649-651); Deliver only if Transfer is zero and moved < max_move (line 656 runs the delivery).
- VehicleCargoList::ShiftCargo (cargopacket.cpp:296-306): removes packets from the front while action.MaxMove() > 0 and the action returns true.
- StationCargoList::Load (cargopacket.cpp:855-863): if the vehicle already holds Load-reserved packets, it reassigns min(reserved, max_move) to Keep and decrements reserved_count; otherwise it shifts cargo from the station with CargoLoad.
- Callers in economy.cpp: Stage at 1279 when the vehicle has no orders or its current order is not no-unload; Unload at 1709 with amount_unloaded as the budget; Load at 1779 with cap_left, which is capped by GetLoadAmount(v) when gradual loading is on (1777). Callers checked: Stage and Unload each have one call site in economy.cpp; Load has one call site in economy.cpp.

## 3. Numbers vs mechanism
- MAX_COUNT = UINT16_MAX = 65535 per packet (cargopacket.h:67). A merge is refused if the sum would exceed it (cargopacket.cpp:232).
- max_move: the per-call move budget. Unload uses it as min(transfer count, max_move) (line 650). Load caps the reserved move the same way (line 857). The value comes from the caller; the caller uses remaining capacity and, with gradual loading, GetLoadAmount (not read).
- There is no time constant in this path: the budget is a count per call, and the caller decides how often to call.

## 4. TypeScript sketch
simplified: Omits Append's bounded reverse search (the donor stops once the scanned sum reaches the designation count) and merges only packets with the same designation, where the donor uses designation ranges. Omits feeder share, payment, the CargoTransfer/CargoDelivery/CargoLoad actions and the station side of Load (reserved_count). Stage takes a decide callback instead of ChooseAction and sorts with Array.sort instead of donor chunking. commitLoad moves whole packets only; the donor splits a packet to fit max_move. Unload keeps the donor's order: transfers before deliveries.

```ts
type Designation = "transfer" | "deliver" | "keep" | "load";

interface Packet {
  count: number;
  origin: string;      // donor: source_xy + source
  firstStop: string;   // donor: first_station
  ageTicks: number;    // donor: periods_in_transit
  d: Designation;
}

const MAX_COUNT = 65535; // donor: UINT16_MAX

function rank(d: Designation): number {
  return d === "transfer" ? 0 : d === "deliver" ? 1 : d === "keep" ? 2 : 3;
}

function mergeable(a: Packet, b: Packet): boolean {
  return a.d === b.d && a.origin === b.origin && a.firstStop === b.firstStop && a.ageTicks === b.ageTicks;
}

// Append: merge into the nearest mergeable packet while the stack stays under the cap, else push.
function append(list: Packet[], cp: Packet): void {
  for (let i = list.length - 1; i >= 0; i--) {
    const icp = list[i];
    if (mergeable(icp, cp) && icp.count + cp.count <= MAX_COUNT) {
      icp.count += cp.count;
      return;
    }
  }
  list.push({ ...cp });
}

// Stage: decide a designation per packet, group packets into consecutive chunks, count each chunk.
function stage(list: Packet[], decide: (p: Packet) => Designation): Record<Designation, number> {
  const counts: Record<Designation, number> = { transfer: 0, deliver: 0, keep: 0, load: 0 };
  for (const p of list) {
    p.d = decide(p);
    counts[p.d] += p.count;
  }
  list.sort((a, b) => rank(a.d) - rank(b.d)); // stable sort keeps arrival order inside a chunk
  return counts;
}

// Take up to budget units of one designation from the front of the list.
function takeFront(list: Packet[], want: Designation, budget: number): number {
  let moved = 0;
  while (list.length > 0 && moved < budget && list[0].d === want) {
    const head = list[0];
    const n = Math.min(head.count, budget - moved);
    head.count -= n;
    moved += n;
    if (head.count === 0) list.shift();
  }
  return moved;
}

// Unload: transfers first; deliveries only when no transfers remain and budget is left.
function unload(list: Packet[], counts: Record<Designation, number>, budget: number): number {
  let moved = 0;
  if (counts.transfer > 0) {
    moved = takeFront(list, "transfer", budget);
    counts.transfer -= moved;
  }
  if (counts.transfer === 0 && counts.deliver > 0 && moved < budget) {
    const delivered = takeFront(list, "deliver", budget - moved);
    counts.deliver -= delivered;
    moved += delivered;
  }
  return moved;
}

// Commit reserved load: whole packets only (donor splits a packet to fit the budget).
function commitLoad(list: Packet[], counts: Record<Designation, number>, budget: number): number {
  let moved = 0;
  for (const p of list) {
    if (p.d !== "load" || moved + p.count > budget) break;
    p.d = "keep";
    moved += p.count;
  }
  counts.load -= moved;
  counts.keep += moved;
  return moved;
}

export {};
```

Typecheck: copied to the VPS /tmp and run `npx -p typescript tsc --noEmit --strict --target es2020` there: passed with no errors.

## 5. Lands in
Target: origins/server/inventory-stacks.ts (proposed new module; no such file exists in our repo as far as I read, and I did not read the repo). Parity row 18 (loot roll and XP award): the stack-and-move step of loot pickup and bag handling. Row 15 (gear dressing) is not the target; this is inventory, not appearance.

## 6. Gaps and risks
- One ledger: the donor's feeder share and CargoPayment are money side-effects of a move. Frankendom has one ledger, so the commit must write one ledger entry per move, and no feeder-style split.
- Server-verified: this donor is single-process. Whether OpenTTD's network sync uses this path is not read. In Frankendom, the server must compute the staged plan and commit it as one transaction, so a client never applies a half move.
- Atomic: the donor moves partial amounts per call (max_move). A Frankendom move must be all or nothing. The commit step above moves whole packets only, which fits; a partial move needs the server to reject the whole move, not clip it.
- Next-hop routing (Transfer, Keep, Deliver by station) has no Frankendom counterpart. Map it to bag, bank and drop targets, or drop it.
- Stack cap 65535 is a cargo number. Frankendom needs a stack cap per item type, which is zone or item data, not an engine constant.
- MAX_ATTACKERS = 3 does not apply to inventory.
- Equipment slots and a bank are absent from this donor. Those parts of the topic need another donor.

Reuse tag: reuse-first: this is a merge-cap and staged-move shape, not a fight mechanism; no Frankendom module yet does stacking, so no prior PR to reuse was checked (not searched in our repo).
Brief rule served: rules 1-4 and the anti-strictness rules (judged the idea; read the real code; receipts verified; sketch typechecked; unread parts marked).
