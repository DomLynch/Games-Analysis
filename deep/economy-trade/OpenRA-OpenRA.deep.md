# OpenRA-OpenRA (economy-trade, cell 11)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/PlayerResources.cs | Licence: GPL-3 | C# | symbol PlayerResources.ChangeCash/GiveResources
Ranges opened and confirmed: ChangeCash 114-127, GiveResources 134-152, TakeResources 159-166, GiveCash 168-213, TakeCash 220-244.

## 1. Mechanism
- Donor: OpenRA PlayerResources trait. Each player holds two pools: Cash and Resources (ore-like, capped by ResourceCapacity). A debit through TakeCash spends Resources first, then Cash (line 234 comment). Cash, Resources and ResourceCapacity carry [VerifySync] (lines 100-107); Earned and Spent are plain running totals for stats.
- GiveResources (134) adds to Resources and counts Earned; anything above capacity is discarded and removed from Earned (or added to Spent on a refund).
- TakeResources (159) is an all-or-nothing debit of Resources only.
- TakeCash (220) debits Resources first, then Cash; a debit that takes Resources below zero is carried into Cash. It refuses when Cash plus Resources is short, and can raise a rate-limited low-funds notice.
- GiveCash (168-213) adds with checked arithmetic: on overflow Cash saturates at int.MaxValue; Earned saturates the same way, and a refund subtracts from Spent instead (saturating at int.MinValue).
- ChangeCash (114) is the signed entry point: a positive amount is GiveCash; a negative amount is clamped so the player never goes below zero total, then TakeCash.
- Called on demand by the caller (production and order code; the call sites were not read). No timer.

## 2. Key functions
- PlayerResources.ChangeCash | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/PlayerResources.cs | 114-127 | signed cash change, clamped so funds never go negative.
- PlayerResources.GiveResources | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/PlayerResources.cs | 134-152 | adds resources, drops overflow above capacity and adjusts Earned or Spent.
- PlayerResources.TakeResources | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/PlayerResources.cs | 159-166 | refuses if short, else debits resources and adds to Spent.
- PlayerResources.GiveCash | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/PlayerResources.cs | 168-213 | adds cash with overflow-safe arithmetic, tracks Earned or Spent (refund path).
- PlayerResources.TakeCash | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/Player/PlayerResources.cs | 220-244 | debits resources first, then cash; carries any shortfall into cash.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Two pools: spend the capped pool first, then the cash pool | Starting cash options 2500, 5000, 10000, 20000 with default 5000 (theirs, lobby; PlayerResources.cs:32, 35) |
| Capped storage: overflow discarded, earned count reduced to match | Storage capacity per building (theirs, rules data; only AddStorageCapacity at 246-249 read, values not read) |
| Signed change clamped so funds stay at or above zero | Resource values per type (theirs; not read) |
| Low-funds notice rate-limited | Notification interval 30000 ms (theirs; PlayerResources.cs:55, 224-226 gate) |

## 4. TypeScript sketch
Licence: GPL-3 (OpenRA-OpenRA). Clean-room: written from the mechanism, no donor lines.
simplified: GiveCash is shown as a plain add (no overflow saturation, no refund flag); TakeResources, the low-funds notice and storage capacity changes are omitted. Order inside takeCash follows the donor (refuse, then resources, then carry into cash).
```ts
// Two pools: a capped resource pool (overflow is discarded) and a cash pool.
// Debits spend resources first, then cash. A signed change is clamped so total funds never go below zero.
interface Wallet { cash: number; resources: number; capacity: number; earned: number; spent: number; }

function giveResources(w: Wallet, n: number, refund = false): void {
  w.resources += n;
  if (!refund) w.earned += n; else w.spent -= n;
  if (w.resources > w.capacity) {
    const over = w.resources - w.capacity;
    if (!refund) w.earned -= over; else w.spent += over;
    w.resources = w.capacity;                  // overflow is lost
  }
}

function takeCash(w: Wallet, n: number): boolean {
  if (w.cash + w.resources < n) return false;  // all or nothing
  w.resources -= n;
  w.spent += n;
  if (w.resources < 0) {                       // shortfall comes out of cash
    w.cash += w.resources;
    w.resources = 0;
  }
  return true;
}

function changeCash(w: Wallet, amount: number): number {
  if (amount >= 0) { w.cash += amount; w.earned += amount; return amount; }
  const clamped = Math.max(-(w.cash + w.resources), amount);
  takeCash(w, -clamped);
  return clamped;
}
```

## 5. Lands in
- Frankendom file: origins/contracts/economy.ts (currency and ledger); origins/server/shop-buy.ts for the purchase debit.
- Parity-checklist row: row 18 (loot roll and XP / career award: the server ledger that gold awards must credit) and row 21 (currency and wallet fields are catalogue/contract fields).
- Usable rule: one-character/one-ledger rule (the server ledger is the authority; the client wallet is a view).
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a

## 6. Gaps and risks
- The donor marks Cash, Resources and ResourceCapacity [VerifySync] so lockstep clients detect divergence; how orders reach these calls was not read. Frankendom has no lockstep: it must debit on the server only (server-verified kills, one ledger).
- Two pools (cash and capped resources) do not exist in Frankendom's design. Adopting them needs a Lead decision.
- The clamp in ChangeCash hides a failed debit from the caller (the return value is the clamped amount). Frankendom must surface a refusal.
- TakeResources refuses by itself when short (line 161), so no caller check is needed; the port should keep that refusal inside the debit, not rely on callers.
- GPL-3: mechanism only; the sketch is written from the arithmetic.
