# EQEmu (housing-player-built-spaces, cell 1)

Donor: `/mnt/frankendom-donors/EQEmu/zone/guild_mgr.cpp` (bank core), with `zone/client.cpp` 9875-9911 (hall join) and `zone/client_packet.cpp` 7659-7830 (bank packets) | Licence: GPL-3.0-or-later (LICENSE.md is GPL v3; source headers say "version 3 of the License, or (at your option) any later version") | C++ | symbols `ZoneGuildManager`/`GuildBankManager`, `Client::SendToGuildHall`, `Client::Handle_OP_GuildBank`

Checked: read in full: `Client::SendToGuildHall` (client.cpp 9875-9911); `GuildBankManager::Load`, `AddItem`, `Promote`, `SetPermissions`, `DeleteItem` head, `NextFreeBankSlot` (guild_mgr.cpp 692-718, 935-1060, 1153-1190, 1321-1349); bank packet gates and deposit branch (client_packet.cpp 7659-7830); zone-in send (client_packet.cpp 878-879); zone bank creation (zone.cpp 1079-1080); guild-delete guard (guild_base.cpp 546-560); caps and enums (rof2_limits.h 101-102, guild_mgr.h 68-76, ruletypes.h 1104); legacy schema head (utils/sql/svn/1293_guild_bank.sql). Not read: `DataBucket::SetData` and whether bucket expiry removes the stored instance id; `CreateInstance` and what happens when an instance expires; the body of `SendGuildBank` beyond its loop heads; the withdraw path (`AllowedToWithdraw` is commented out in guild_mgr.h); `GetBankerFlag`. Confidence: high on the join rule and the deposit-to-main staging; medium on the empty-slot startup behaviour (inferred from the send loops, not run).

## 1. Mechanism

- A guild hall is one shared zone ("guildhall", zone id 345) that is split into one instance per guild. `SendToGuildHall` (client.cpp 9875-9911) looks up a data-bucket key `guild-hall-instance-<guildId>`. If the stored value is a positive instance id it reuses that instance; otherwise it takes an unused instance id, creates the instance with an expiry, stores the id in the bucket with the same expiry, then assigns the client to the instance and moves them to a fixed spawn point (`MovePC(345, instance_id, -1.00, -1.00, 3.34, 0, 1)`, 9911).
- The hall is the only zone that gets a bank. `Zone::Zone` builds the `GuildBankManager` only when the zone id is the hall (zone.cpp 1079-1080, else null). Every bank packet first checks the zone and refuses with "The Guild Bank is not available in this zone." outside the hall (client_packet.cpp 7666-7667).
- On zone-in the bank is sent to the client (client_packet.cpp 878-879), so the client's bank view is rebuilt from the server map each time it enters the hall.
- Storage has two stages. A member deposits an item from the cursor into the deposit area (40 slots). The new row carries `GuildBankBankerOnly` and the donator name (client_packet.cpp 7810-7818). A banker promotes a deposit row to the main area (200 slots) with `Promote` (guild_mgr.cpp 1008-1028): it finds a free main slot, updates the same DB row to area = main, and resets the deposit slot to an empty entry.
- Before a deposit is accepted the handler refuses the item if it is not droppable, attuned, a non-empty container, has `NoRent == 0`, or is a lore item already in the bank (client_packet.cpp 7788-7794). After the cursor check, the handler tests area fullness (7777) before the item is built.
- Each main-area row has a permission enum (BankerOnly 0, SingleMember 1, PublicIfUsable 2, Public 3). `SetPermissions` writes the enum and, for SingleMember, stores the member name in `who_for` (guild_mgr.cpp 1042-1046). Withdraw checks are not read.
- Full test: `NextFreeBankSlot` returns the first map key whose row has `item_id == 0`, or -1 when there is none (1321-1349). `IsAreaFull` is that -1 test. The client handler checks it before add or promote.
- Deleting a guild is refused while its bank has rows (guild_base.cpp 548-551, `return false` at 565, in the local-delete branch). Bank rows are keyed by guild id in the DB (legacy schema `guild_bank` with `guildid`, `area`, `slot`, `itemid`, `qty`, `donator`, `permissions`, `whofor`; 1293_guild_bank.sql line 1 onward). The bank is therefore not tied to the hall instance, but this is inferred from the key, not from an expiry path that was read.
- Tick: none. The join is a one-shot call from a client action; the bank is event-driven (packet in, map update, DB write, ack).

## 2. Key functions

- `Client::SendToGuildHall`: `/mnt/frankendom-donors/EQEmu/zone/client.cpp` 9875-9911. Reuse-or-create the guild's instance, then move the client.
- `GuildBankManager::Load`: `/mnt/frankendom-donors/EQEmu/zone/guild_mgr.cpp` 692-718. Reads rows ordered by area, slot; renumbers each area from 0 (see defects).
- `GuildBankManager::AddItem`: `/mnt/frankendom-donors/EQEmu/zone/guild_mgr.cpp` 940-990. Inserts the first map entry with `item_id == 0` in the target area, writes the DB row, sends an update.
- `GuildBankManager::Promote`: `/mnt/frankendom-donors/EQEmu/zone/guild_mgr.cpp` 992-1032. Deposit row to main area, same row id.
- `GuildBankManager::SetPermissions`: `/mnt/frankendom-donors/EQEmu/zone/guild_mgr.cpp` 1035-1052.
- `GuildBankManager::NextFreeBankSlot`: `/mnt/frankendom-donors/EQEmu/zone/guild_mgr.cpp` 1321-1349.
- `Client::Handle_OP_GuildBank` deposit branch: `/mnt/frankendom-donors/EQEmu/zone/client_packet.cpp` 7659-7830 (zone gate 7666, deposit 7762-7829).

## 3. Numbers vs mechanism (table)

| Rule | Formula / value | Range or value seen | file:line |
|---|---|---|---|
| Hall instance expiry (seconds) | `GuildHallExpirationDays * 86400` | default 90 days = 7,776,000 s | client.cpp 9883; ruletypes.h 1104 |
| Deposit slots | fixed cap (RoF2 limit) | 40 | rof2_limits.h 102 |
| Main slots | fixed cap (RoF2 limit) | 200 | rof2_limits.h 101 |
| Free slot | first key with `item_id == 0`; full when none | keys scanned 0..cap-1 by map order | guild_mgr.cpp 1331, 1334, 1346 |
| Permission enum | 0 BankerOnly, 1 SingleMember, 2 PublicIfUsable, 3 Public | 4 values | guild_mgr.h 73-76 |
| Deposit default permission | BankerOnly (0) | one value | client_packet.cpp 7818 |
| Deposit refusal | NoDrop false OR attuned OR non-empty container OR NoRent == 0 OR (lore AND already banked) | boolean rules | client_packet.cpp 7788-7794 |
| Hall spawn | zone 345, instance id, (-1, -1, 3.34), heading 0 | fixed | client.cpp 9911 |
| Guild delete guard | refuse when any bank row exists | count > 0 | guild_base.cpp 548-551 |

No numeric price, decay or upkeep formula exists in the code read. Upkeep is only the instance expiry, and the donor does not charge for it in the paths read.

## 4. TypeScript sketch

simplified: keeps the donor's order (free-slot test, insert at the first free slot, banker-only promote that keeps the row id and frees the deposit slot, permission write only to an existing main row) and the reuse-or-create hall join. It omits: the DB writes, the packet sends, the GuildBanker flag, the deposit refusal rules, withdraw checks (not read), stacking, split and merge, augment ids, the load renumbering (guild_mgr.cpp 706-712), and the donor's bucket-based expiry. It adds an explicit expiry check in `joinHall` that the donor does not do (the donor checks only that the stored id is positive, client.cpp 9887-9888). The cap is a constant here, not a client inventory size.
```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Area = 'deposit' | 'main';
type Perm = 'bankerOnly' | 'singleMember' | 'publicIfUsable' | 'public';

const CAP: Record<Area, number> = { deposit: 40, main: 200 };
const HALL_DAYS = 90; // server rule default
let rowSeq = 0;

interface BankRow {
  id: number;
  area: Area;
  slot: number;
  itemId: number; // 0 = empty slot
  qty: number;
  donator: string;
  perm: Perm;
  whoFor: string;
}

function emptyRow(area: Area, slot: number): BankRow {
  return { id: 0, area, slot, itemId: 0, qty: 0, donator: '', perm: 'bankerOnly', whoFor: '' };
}

class GuildBank {
  // Slots keyed by "area:slot". A missing key or an itemId of 0 means the slot is free.
  private slots = new Map<string, BankRow>();

  constructor(readonly guildId: number) {}

  private key(area: Area, slot: number): string {
    return area + ':' + slot;
  }

  // First free slot in an area, or null when that area is full.
  private firstFree(area: Area): number | null {
    for (let s = 0; s < CAP[area]; s++) {
      const row = this.slots.get(this.key(area, s));
      if (!row || row.itemId === 0) return s;
    }
    return null;
  }

  isFull(area: Area): boolean {
    return this.firstFree(area) === null;
  }

  // Any member may deposit; the new row stays banker-only until a banker promotes it.
  deposit(itemId: number, qty: number, donator: string): BankRow | null {
    const slot = this.firstFree('deposit');
    if (slot === null) return null;
    rowSeq += 1;
    const row: BankRow = { id: rowSeq, area: 'deposit', slot, itemId, qty, donator, perm: 'bankerOnly', whoFor: '' };
    this.slots.set(this.key('deposit', slot), row);
    return row;
  }

  // A banker moves a deposit row to the main area. The row keeps its id; the deposit slot is emptied.
  promote(depositSlot: number, isBanker: boolean): number | null {
    if (!isBanker) return null;
    const row = this.slots.get(this.key('deposit', depositSlot));
    if (!row || row.itemId === 0) return null;
    const mainSlot = this.firstFree('main');
    if (mainSlot === null) return null;
    this.slots.set(this.key('deposit', depositSlot), emptyRow('deposit', depositSlot));
    this.slots.set(this.key('main', mainSlot), { ...row, area: 'main', slot: mainSlot });
    return mainSlot;
  }

  // Permission is written to an existing main-area row only. Withdraw rules are not modelled (not read in donor).
  setPermission(mainSlot: number, perm: Perm, member: string): void {
    const row = this.slots.get(this.key('main', mainSlot));
    if (!row) return;
    row.perm = perm;
    row.whoFor = perm === 'singleMember' ? member : '';
  }
}

interface HallInstance {
  instanceId: number;
  expiresAtS: number;
}

const hallByGuild = new Map<number, HallInstance>();

// Join a guild's hall: reuse the stored instance, otherwise create one that lasts HALL_DAYS.
export function joinHall(guildId: number, nowS: number, newInstanceId: () => number): HallInstance {
  const known = hallByGuild.get(guildId);
  if (known && known.expiresAtS > nowS) return known;
  const inst: HallInstance = { instanceId: newInstanceId(), expiresAtS: nowS + HALL_DAYS * 86400 };
  hallByGuild.set(guildId, inst);
  return inst;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/EQEmu-guildhall-bank.ts) exits 0.

## 5. Lands in

- TARGET `origins/server/guild-hall.ts` (new; not in the repo yet). Storage rows and the expiry live under the one ledger, not in a side table. Parity-checklist row 23 is the closest row (zone population: instances, caps, expiry on empty); housing has no row of its own, so Lead should confirm the row or add one.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: zones as data (the hall is a zone row, not a hard-coded id 345); one ledger (bank moves are ledger rows, `settle()` is the only door); row 23 is the nearest parity row.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- Per-guild instance plus expiry in a data bucket (client.cpp 9883-9906) is a side store. Frankendom should derive the hall's upkeep from ledger rows (Strategy HS ruling), not from a bucket with an expiry. Whether the donor's bucket expiry removes the stored id is not read.
- The bank is keyed by guild id, not by instance (SQL key; guild_base.cpp 548-551). In Frankendom, decide whether storage survives a lapsed hall. The donor's answer is "yes, the items stay with the guild", but the expiry path was not read.
- Defect 1, Load ignores the stored slot: guild_mgr.cpp 706 `it.slot = deposit_slot;` and 711 `it.slot = main_slot;` renumber every row from 0 in load order, so a DB slot can disagree with memory until the next write. Fix: key the map by the stored slot.
- Defect 2, empty slots come from side effects: an empty slot exists in the map only after the send loop (746, 801 use `operator[]`) or a promote/delete (1028, 1175) creates it. A new bank with no rows reports full until someone enters the hall. Fix: create the cap's worth of empty slots explicitly at load (as `firstFree` in the sketch treats missing keys as free).
- Defect 3, `operator[]` on the wrong map: `DeleteItem` indexes `deposit_area[slot_id]` before the area test (1175), and `SetPermissions` indexes `main_area[slot_id]` with no existence check (1042). A bad slot id from a client creates a phantom row. Fix: `find`, and return on miss. (Whether the client packet bounds the slot id was not read.)
- Defect 4, the cap is a client version limit (RoF2 limits, rof2_limits.h 101-102) and the server only checks it through the send loops. Fix: store the cap as a server constant.
- Defect 5, hard-coded hall: zone name "guildhall" (client.cpp 9877) and zone id 345 (9911). Fix: a zone row; the hall is data.
- The refusal rules (7788-7794) are the donor's anti-dupe for storage: no-drop, attuned, non-empty container, rent flag, and lore items are not stored. Frankendom's take-one loot and one-ledger rules need the same refusal list, but the trade cell owns the detail.
- Permissions: only BankerOnly is set on new deposits; the donor's withdraw check is not read. Frankendom's permission set (owner, friends, guild) must be checked on the server for every withdraw, not in the client.

Best transferable idea: a guild-owned instance of one hall zone, found again by a stored id and expired by a stored time, with a two-stage deposit-then-promote storage whose slots are capped, permissioned per slot, and refused by a fixed anti-dupe list.

Decision (proposed): adapt - keep the guild-instance join and the deposit-to-main promote, but drive the expiry from ledger upkeep rows and make the cap and the free-slot test server constants. Reject the bucket-based expiry and the client-version cap.
Acceptance: two members of one guild open the hall from a phone and see the same hall instance; a member's deposit shows in the deposit tab as banker-only; a non-banker promote is refused; a 41st deposit is refused with the area-full message; a server test asserts all four.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: zones as data; one ledger; parity row 23 (nearest row)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
