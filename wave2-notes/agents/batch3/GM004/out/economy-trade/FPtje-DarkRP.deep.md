# FPtje-DarkRP (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/money/sv_money.lua` (cheque write 189-258) with `/mnt/frankendom-donors/FPtje-DarkRP/entities/entities/darkrp_cheque/init.lua` (redeem, tear-up, merge, void) | Licence: MIT (repo `LICENSE.txt`, Copyright (c) 2014 Falco Peijnenburg) | Lua (GMod gamemode) | symbol `CreateCheque`, `ENT:Use`

Checked: economy cell, not camera. Read in full: `money/sv_money.lua` lines 1-300 (wallet, payday, give, drop, cheque, set-money), `darkrp_cheque/init.lua` (147, full), `doorsystem/sv_doors.lua` 79, 130-240 and 340-470, `doorsystem/sh_doors.lua` 45-75, `base/sv_purchasing.lua` 1-226, `base/sv_data.lua` 450-470, `base/sv_gamemode_functions.lua` 18-30, `jobs/sv_jobs.lua` 195-210. Config values read by grep at the cited lines only. Not read: `sv_money.lua` 300-403, `sv_doors.lua` 1-78, 240-340, 470-592, the co-owner grant path (keys system), the cheque cap release path (`customEntityLimitReached` bookkeeping), addons. Confidence high on the cheque and give order of operations; high on the numbers; medium on whether co-owning is free (no charge found in doorsystem, grant path not read).

Best transferable idea: an escrow instrument with a debit at write, a credit only to the bound recipient at redeem, and a refund to the writer at tear-up, where every removal path (damage, orphan, disconnect, failed settle) must also post a refund row so total value is conserved.
Decision (proposed): adapt. Why: the escrow shape is what a duel wager and a player-to-player give need, and the donor's money rows are clear; but the donor loses money on four paths, so we keep the debit/credit/refund rows, add the missing refund rows, and do not keep the money as a prop (money is a ledger row, the prop is presentation only).
Acceptance: a server test writes a 200-unit instrument to a duelist, then (a) the recipient disconnects, (b) the instrument takes damage, (c) the writer tears it up; in each case wallets plus open instruments stay at the starting total, and the recipient's wallet moves by exactly 200 only on redeem.

## 1. Mechanism

- Write (`sv_money.lua` 189-258). Refused if the amount is 1 or less (203-205), if the writer cannot afford it (208-212), or if the writer already has the cap of cheques (214-218; cap `maxCheques` = 5). The wallet is debited only when both writer and recipient are valid (222-224). A physical `darkrp_cheque` entity spawns 1 s later (228) at the writer's aim point (85 units ahead, 236-240). The recipient is bound to the entity (246) and the amount is capped at 2147483647 (248).
- Settle gap (230-233). If the recipient has gone by the 1 s spawn, the code notifies the writer and returns. The debit at 223 is not undone. Money is lost on this path.
- Redeem (`darkrp_cheque/init.lua` 24-51). A `canDarkRPUse` hook may veto (25-29). If the user is the bound recipient, the amount is credited and the cheque removed (35-40). If the user is someone else, only the details are shown and nothing moves (41-43). If the writer tears it up, the amount is refunded to the writer and the cheque removed (44-48). If the recipient is gone and the user is not the writer, the cheque is removed with no refund (49).
- Merge (53-65). Two cheques with the same writer and the same recipient combine when they touch, by summing the amounts (64).
- Destruction (67-76). Any damage outside fall, vehicle, drown, radiation and physgun removes the cheque. No money row is written (the handler sets USED and calls Remove).
- Disconnect (78-82). Writer or recipient leaving removes the cheque. No money row is written.
- Give, the one-way player transfer (`sv_money.lua` 56-116). The giver's eye trace is captured at command time (70), with a range check of 22500 squared units (72) and an affordability check (82). A 1.2 s timer (90) then re-checks affordability (96), re-traces the eye target (101-102), and pays whoever is there (106) after a second range check that silently returns on failure (104).
- Sinks and sources (secondary; numbers in section 3): money piles despawn after 600 s (47-49); wallet tax is a linear rate from 1% to 5% between 2x and 200x starting money every 600 s (`sv_doors.lua` 198-233), off by default (`config.lua` 167); property tax is 10 per owned door plus a random -5..5 every 270 s (79, 172-173), off by default (`config.lua` 135), and unpaid taxes unown every taxable door (188); selling a door refunds 66.6% of the current door cost, rounded (373, 459).

## 2. Key functions

- `CreateCheque`: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/money/sv_money.lua` 189-258 (debit 222-224, settle 228-255).
- `GiveMoney`: `sv_money.lua` 56-116 (capture 70, settle timer 90-113, pay 106).
- `DropMoney`: `sv_money.lua` 119-185 (debit at 161, pile spawn in the 1 s timer at 164).
- `ENT:Use`, `ENT:StartTouch`, `ENT:OnTakeDamage`, `ENT:onPlayerDisconnected`: `/mnt/frankendom-donors/FPtje-DarkRP/entities/entities/darkrp_cheque/init.lua` 24-51, 53-65, 67-76, 78-82.
- `meta:addMoney`: `sv_money.lua` 5-15 (the one wallet write door in the money module; it does not clamp).
- Door sale and purchase: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/doorsystem/sv_doors.lua` 354-375 (toggle sell), 387-420 (buy), 427-470 (sell all).
- Ownership test: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/doorsystem/sh_doors.lua` 56-61.
- Payday and salary: `sv_money.lua` 22-39; `base/sv_data.lua` 456-461; `jobs/sv_jobs.lua` 199 (timer).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (file:line) |
|---|---|
| Escrow debit at write | Debit only if both sides are valid (`sv_money.lua` 222-223). Cheque minimum: amount must exceed 1 (203). |
| Per-writer cap on open instruments | `maxCheques` = 5 (`config.lua` 220; `sv_money.lua` 195, 214). |
| Settle delay before the instrument exists | 1 s (`sv_money.lua` 228). |
| Physical placement distance | 85 units ahead of the aim (236-237). |
| Give range | 22500 squared = 150 units (`sv_money.lua` 72). |
| Give settle delay | 1.2 s (`sv_money.lua` 90). |
| Sell refund | floor(cost x 0.666 + 0.5) (`sv_doors.lua` 373, 459). |
| Door cost | `doorcost` 30 (`config.lua` 206); a configured 0 becomes 30 (`sv_gamemode_functions.lua` 22). |
| Wallet tax band | min 1%, max 5% (`config.lua` 294, 296); band from 2x to 200x `startingmoney` (`sv_doors.lua` 216-217, 237); starting money 500 (`config.lua` 286), so the band is 1000 to 100000 units; interval 600 s (`config.lua` 298; `sv_doors.lua` 198). Off by default (`config.lua` 167). |
| Property tax | 10 per owned door (`sv_doors.lua` 172) plus random -5..5 (173), every 270 s (79). Off by default (`config.lua` 135). |
| Pile despawn | 600 s (`config.lua` 250; `sv_money.lua` 47-49). Pile cap 20 (`config.lua` 222). |
| Payday | `normalsalary` 45 (`config.lua` 254; `sv_data.lua` 460), `paydelay` 160 s (`config.lua` 258; `sv_jobs.lua` 199). |
| Shipment spam wait | 3 s (`config.lua` 280; `sv_purchasing.lua` 115). |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's core order (debit and open in one step at write, credit only to the bound recipient at redeem, refund to the writer at tear-up) and makes three changes on purpose. Every removal path (damage, orphan, disconnect, failed settle) now posts a refund row, so value is conserved; the 1 s spawn delay and the physical entity are dropped (the instrument lives in the ledger; the prop would be presentation only); and the merge rule is dropped. It omits the `canDarkRPUse` hook, the notification text, the custom-entity counter (the cap is a plain count of open instruments), the give command, the wallet-changed hook, the admin set-money path, and the physical placement.

```ts
// Licence of donor: MIT (FPtje-DarkRP, LICENSE.txt). Clean-room sketch of the mechanism, not a line-by-line port.
export {};

// One ledger. Every money move is a row. Only write/redeem/tearUp/void exist; each one conserves total value,
// so every path that used to make money vanish now refunds or pays.
interface Row { kind: "debit" | "credit" | "refund"; who: number; amount: number; ref: string; }

interface Cheque {
  id: string;
  writer: number;
  recipient: number;
  amount: number;
  state: "open" | "redeemed" | "torn" | "voided";
}

// Data: minimum amount and per-player cap (donor: amount must be > 1; maxCheques = 5).
const MIN_CHEQUE = 2;
const MAX_OPEN_PER_WRITER = 5;

export class Ledger {
  private wallet = new Map<number, number>();
  private cheques = new Map<string, Cheque>();
  readonly rows: Row[] = [];
  private nextId = 1;

  constructor(initial: Array<[number, number]>) {
    for (const [who, amount] of initial) this.wallet.set(who, amount);
  }

  private move(who: number, delta: number, kind: Row["kind"], ref: string): void {
    const cur = this.wallet.get(who) ?? 0;
    this.wallet.set(who, cur + delta);
    this.rows.push({ kind, who, amount: delta, ref });
  }

  private openCount(writer: number): number {
    let n = 0;
    for (const c of this.cheques.values()) if (c.writer === writer && c.state === "open") n++;
    return n;
  }

  // Write: debit and open the instrument in one step, refused if the writer cannot pay or the recipient is offline.
  write(writer: number, recipient: number, amount: number, recipientOnline: boolean): string | null {
    if (amount < MIN_CHEQUE || !recipientOnline) return null;
    if ((this.wallet.get(writer) ?? 0) < amount) return null;
    if (this.openCount(writer) >= MAX_OPEN_PER_WRITER) return null;
    const id = "C" + String(this.nextId++);
    this.move(writer, -amount, "debit", id);
    this.cheques.set(id, { id, writer, recipient, amount, state: "open" });
    return id;
  }

  // Redeem: only the bound recipient is credited.
  redeem(id: string, who: number): boolean {
    const c = this.cheques.get(id);
    if (!c || c.state !== "open" || who !== c.recipient) return false;
    c.state = "redeemed";
    this.move(who, c.amount, "credit", id);
    return true;
  }

  // Tear up: only the writer gets the amount back.
  tearUp(id: string, who: number): boolean {
    const c = this.cheques.get(id);
    if (!c || c.state !== "open" || who !== c.writer) return false;
    c.state = "torn";
    this.move(c.writer, c.amount, "refund", id);
    return true;
  }

  // Void (damage, orphan, disconnect): every removal path settles to the writer. Nothing vanishes.
  void(id: string): boolean {
    const c = this.cheques.get(id);
    if (!c || c.state !== "open") return false;
    c.state = "voided";
    this.move(c.writer, c.amount, "refund", id);
    return true;
  }

  // Conservation check: wallets plus open instruments. Must not change across any call above.
  totalValue(): number {
    let sum = 0;
    for (const v of this.wallet.values()) sum += v;
    for (const c of this.cheques.values()) if (c.state === "open") sum += c.amount;
    return sum;
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/gm004-economy-sketch.ts`): exit 0.

## 5. Lands in

- TARGET `origins/server/ledger.ts` (new, the one money ledger and escrow instrument; `settle()` is the only door, per the Strategy TR rule). Duel wager escrow and any player-to-player give go through the same rows.
- Parity row 18 (loot roll and XP award: the money side of a settle, the reward that is credited to the one ledger).
- Reuse tag: adapt (MIT: code may be adapted; this sketch is written from the mechanism).
- Brief rule served: one ledger, settle() is the only door (no side table, no prop as store of value); server-verified (the recipient check happens on the server at redeem).

## 6. Gaps and risks

- Defect, failed settle loses money. The writer is debited at write (`sv_money.lua` 222-223); if the recipient has gone by the 1 s settle, the function notifies and returns (230-233) with no refund. Fix: settle or refund in that branch (the sketch debits and opens in one step and refuses before debit when the recipient is offline).
- Defect, damage destroys money. Any non-physics damage removes the cheque with no money row (`darkrp_cheque/init.lua` 67-76). Fix: void refunds the writer (`void` in the sketch).
- Defect, orphan and disconnect destroy money. Orphan use removes with no refund (49); writer or recipient leaving removes with no refund (78-81). Fix: the same void path.
- Defect, the give pays whoever is aimed at after 1.2 s. The first target is captured at 70 but never compared to the settle-time target (101-106); the silent return at 104 gives the giver no notice. Fix: bind the recipient id at command time, refuse the settle if the target differs, and notify both sides.
- Defect, sell refunds use the current price. Sell-back reads the cost hook when the door is sold (`sv_doors.lua` 373, 459), so a later price change re-prices old doors, and 0.666 is hard-coded. Fix: store the price paid on the ownership row and refund that share.
- Defect, co-owners get the sell refund. `isKeysOwnedBy` counts co-owners (`sh_doors.lua` 60). The toggle sell (354) and sell-all (441) therefore refund co-owned doors (373, 459) to a player who may never have paid. In `sv_doors.lua` the only addMoney calls are 185, 228, 375, 414 and 466, so no charge for becoming a co-owner was found here (grant path not read). Fix: refund only the share the player paid; a co-owner who paid nothing gets 0.
- Defect, shipment price is computed twice and not re-checked at charge. The check uses one getPrice call (`sv_purchasing.lua` 142, 144) and the charge uses another (175), then debits (216) with no second affordability test; `addMoney` does not clamp (`sv_money.lua` 5-15), so a price that rises between the calls can drive the wallet negative. Fix: one price call, check and debit in one step.
- Defect, a configured door cost of 0 becomes 30 (`sv_gamemode_functions.lua` 22). A free door cannot be configured. Fix: allow 0 explicitly.
- Defect, property tax jitter. The bill is `price * numowned + math.random(-5, 5)` (`sv_doors.lua` 173), so the charge is not reproducible from the ledger. Fix: a seeded or zero jitter, stored on the charge row.
- Second write door for money. The admin set-money path writes the variable directly (`sv_money.lua` 278-279) and does not go through addMoney. Fix: route it through the ledger as an admin row.
- Gap, no two-step trade window and no barter in this donor. Give is one-way and time-delayed; there is no both-confirm step. Trade mechanics belong to the TR cell (not this one).
- Gap, wallet and property taxes are off by default (`config.lua` 135, 167). The mechanism is real and read, but a live server must turn it on on purpose.
