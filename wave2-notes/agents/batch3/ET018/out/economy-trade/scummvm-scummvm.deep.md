# scummvm-scummvm (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/scummvm-scummvm/engines/ultima/ultima8/gumps/weasel_gump.cpp` | Licence: GNU GPL version 3 or any later version (file header lines 7-10: "either version 3 of the License, or (at your option) any later version"; the top-level COPYING is GPL version 3, 29 June 2007). Clean-room, shape only, no line-by-line translation. | C++ | symbols `WeaselGump::buyItem`, `WeaselGump::completePurchase`, `WeaselGump::abortPurchase`, `WeaselGump::checkClose`

Checked: The list hint (devtools/create_ultima/files/ultima4/conf/vendorScript.xml) is the Ultima IV data file, not the shop implementation. I searched the engines for shop, vendor, buy, price and gold. Candidates opened: engines/ultima/ultima8/gumps/weasel_gump.cpp (180-196, 213-256, 300-420, 420-440, 467-500, 520-552; lines 1-100, 440-466, 500-520 and 552-565 not read); engines/ultima/ultima4/game/script.cpp (the `pay` handler 1010-1039, the `add` handler 1109-1173, the `lose` handler 1175-1193); devtools/create_ultima/files/ultima4/conf/vendorScript.xml (101-115 and 189-199 only); engines/ultima/ultima1 and ultima0 (grep only, no buy logic found). Not read: `GameData::getWeaselDat` (the catalogue parser), `ItemFactory::createItem`, `addItemCru`, the `AdjustValueMax` definition. Callers: `buyItem` is reached from `onButtonClick` (weasel_gump.cpp:316-318); `abortPurchase` from `onButtonClick` (328-330). Confidence: high on the cart flow and the order of operations; medium on the outcome of a sold-out cart, which I read from code only. No tests were run. camera_scope: not applicable (economy topic).

## 1. Mechanism

A shop with a pending cart. The player's balance is kept on a wallet item (shape 0x4ed) as its quality. The gump reads the balance once on open (weasel_gump.cpp:187-189), then runs a local counter, `_credits`, and a local list, `_purchases`, until the player commits or cancels.

- Open: `_credits` is set from the wallet item's quality (187-189). With no wallet item the balance stays 0 and nothing can be bought.
- Browse: the catalogue for the current level is loaded (348; ammo mode uses table 1). Each entry has a cost (488). The on-screen balance and cost are redrawn after each change (482-545).
- Buy: `buyItem` (370-378) adds the shape to the cart and subtracts the cost from `_credits` only if `_curItemCost < _credits`. The check is strict, so a buy never leaves the balance at 0 (371). A refused buy plays a sound and changes nothing (375).
- Checkout: `checkClose` (385-391) goes to confirmation only if the cart is not empty (386-387). Otherwise the gump closes.
- Commit: `completePurchase` (393-406) writes the local `_credits` into the wallet item (398-400), then creates one item per cart entry (401-404). It does not re-check the total against the wallet.
- Abort: `abortPurchase` (467-471) clears the cart (470). It does not give the reserved credits back: nothing writes `_credits` after line 189 except the buy subtraction (373). The state then returns to browsing (244-248).
- Order inside one buy: check (371), then cart push (372), then debit of the local balance (373), then redraw (377). Inside commit: wallet write (400), then item creation (401-404), then state change (405).

Second, different shop style in the same engine (Ultima IV, read in part): the purchase is an XML script. It checks gold against quantity x price (vendorScript.xml:192), then runs `pay` (script.cpp:1010-1039: total = price x quantity at 1025; refuse at 1026; debit at 1032), then runs `add`, which clamps the stack at 99 (script.cpp:1144). The gold goes out before the item is added, so the clamp is after the charge.

## 2. Key functions

- `WeaselGump::buyItem`: `/mnt/frankendom-donors/scummvm-scummvm/engines/ultima/ultima8/gumps/weasel_gump.cpp` 370-378 (strict check at 371, cart at 372, debit at 373, refusal sound at 375).
- `WeaselGump::checkClose`: same file 385-391 (cart non-empty at 386).
- `WeaselGump::completePurchase`: same file 393-406 (wallet write at 400, item creation at 401-404).
- `WeaselGump::abortPurchase`: same file 467-471 (cart cleared at 470; credits not restored).
- `WeaselGump` constructor: same file 103 (credits start at 0) and 185-194 (wallet read at 187-189).
- `updateItemDisplay`: same file 482-545 (cost from the catalogue at 488; owned count from quality at 528 for stacks).
- Ultima IV `Script::pay`: `/mnt/frankendom-donors/scummvm-scummvm/engines/ultima/ultima4/game/script.cpp` 1010-1039.
- Ultima IV `Script::add`: same file 1109-1173 (weapon stack clamp at 1144).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Local pending cart with a live balance preview; nothing is written until confirm | Balance stored as item quality on wallet shape 0x4ed (187-189, 400) |
| Strict affordability check per buy: cost < balance, so the balance stays above zero | Strict `<` (371) |
| Cart commit writes the wallet once and creates one item per entry | One `setQuality` (400), one `createItem` per entry (402) |
| Abort clears the cart (the donor does not restore the balance) | None (470) |
| Stack count held in the item quality | Owned count = quality for non-cru families (528) |
| Catalogue per level, with an ammo table | Level table (348), ammo table index 1 (348) |
| Ultima IV: gold check against quantity x price, then debit, then add with a 99 cap | Cap 99 (script.cpp:1144); the 99 cap comes from the call, the clamp macro was not read |

## 4. TypeScript sketch

simplified: the sketch keeps the cart, the strict per-buy check, the balance preview, and the single wallet write. It differs from the donor in three places. (1) Abort gives back the credits reserved by the cart, which the donor does not do (weasel_gump.cpp:467-471). (2) Commit re-checks the cart total against the wallet in one step; the donor trusts the local `_credits` (400). (3) The wallet is a plain number, not an item quality. It omits the movies and sounds, the level and ammo tables, the owned and purchased counts, the item creation details, and the text widgets. The donor's strict rule is kept.

```ts
// clean-room sketch of the donor's rules (GPL-3.0-or-later donor). Written from the described mechanism, not a translation.
interface Entry {
  shape: number;   // item id bought
  cost: number;    // catalogue cost (weasel.dat, not read)
}

interface Wallet {
  balance: number; // server-owned in Frankendom; the donor keeps it as an item quality
}

class Cart {
  private entries: Entry[] = [];
  private shown: number;

  constructor(private readonly wallet: Wallet) {
    this.shown = wallet.balance;   // read once at open, as the donor does (weasel_gump.cpp:187-189)
  }

  get credits(): number {
    return this.shown;
  }

  // Strict rule from the donor: a buy must leave the balance above zero (weasel_gump.cpp:371).
  add(e: Entry): boolean {
    if (!(e.cost < this.shown)) return false;
    this.entries.push(e);
    this.shown -= e.cost;
    return true;
  }

  // Abort gives the reserved credits back. The donor clears the cart but does not restore the balance.
  abort(): void {
    for (const e of this.entries) this.shown += e.cost;
    this.entries = [];
  }

  // Commit re-checks the whole cart against the wallet in one step, then writes the wallet once.
  commit(): { ok: true; balance: number; items: number[] } | { ok: false } {
    const total = this.entries.reduce((a, e) => a + e.cost, 0);
    if (!(total < this.wallet.balance)) return { ok: false };
    this.wallet.balance -= total;
    const items = this.entries.map((e) => e.shape);
    this.entries = [];
    return { ok: true, balance: this.wallet.balance, items };
  }
}

export {};
```

## 5. Lands in

- TARGET `origins/economy/shop.ts` (proposed new module; Frankendom repo not read, so the path is a proposal). The cart is UI state only; the commit belongs on the server with the one ledger (see `origins/economy/ledger.ts` in the pshenok note).
- Parity-checklist row: 21 (catalogue fields). The cost per shop entry, the stack cap and the level table are catalogue fields. Row 18 (loot roll and XP award) is not a fit: nothing here rolls loot or awards XP.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later, copyleft: clean-room, shape only)
- Brief rule served: one ledger (commit is one ledger write, abort restores the reserved credits); server-verified (the server re-checks the cart total at commit); zones as data (catalogue per shop and level, not hard-coded).

## 6. Gaps and risks

- Abort leaves a phantom balance. The cart reserves credits by lowering `_credits` (373), and abort clears the cart without giving them back (467-471). The wallet is not written on abort, so the saved balance is right, but the screen and the spendable balance stay low until the gump is reopened. Frankendom must derive the cart balance from the server ledger, not from a local counter.
- Commit trusts the client. `completePurchase` writes whatever `_credits` holds into the wallet (400) and creates the items (401-404), with no server check and no check of the total. Frankendom's server must check the total against the balance in the same transaction.
- The strict rule keeps a balance above zero (371). This is a design choice the donor does not state. If Frankendom keeps it, make it a rule with a name and a test, not a `<` in a handler.
- Refusal has no reason. A refused buy plays a sound (375). `kWeaselInsufficientFunds` exists (weasel_gump.h:47) and has a handler (253-256), but nothing in the code sets it, and the author's comment asks how it is reached (254). Frankendom's refusal should return a reason code.
- Balance hidden in an item. The wallet balance is the quality of an item (187-189, 398-400). That is a second ledger, invisible to a stock panel. Frankendom should have one ledger row for balance.
- Charge before the cap. In the Ultima IV shop, the gold is taken (script.cpp:1032) and then the stack is clamped at 99 (1144), so a buy that would go over 99 pays for items it does not get. The pre-check in the XML (vendorScript.xml:192) does not check the cap. The clamp macro was not read, so I state the behaviour from the call only. Frankendom must check the stack cap before the debit.
- Ammo mode is a fixed table index (348). Frankendom's shops should key the catalogue by shop id, which is zone data.
- Not read: the catalogue parser (`GameData::getWeaselDat`), `addItemCru`, the sell path (grep for `sellItem` found nothing), and the `AdjustValueMax` definition.

Best transferable idea: Reserve a purchase in a pending cart with a live balance preview, and commit the whole cart as one server transaction that re-checks the sum against the wallet, while abort gives the reserved credits back.
Decision (proposed): adapt - the pending cart and the single commit fit our one-ledger and catalogue rulings, but the client balance, the wallet-as-item and the trusted commit do not fit server-verified play, so the server must own the balance and re-check the cart total at commit.
Acceptance: a server test buys three catalogue items, aborts, and asserts the wallet and the displayed balance are unchanged; a second test asserts that a commit whose total equals the balance is refused, and that a buy of a stack that would pass 99 is refused before any debit.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room, shape only)
Brief rule served: one ledger, server-verified; zones as data; catalogue fields (row 21)
