# openmw (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/mechanicsmanagerimp.cpp` (with `apps/openmw/mwmechanics/creaturestats.cpp` and `apps/openmw/mwgui/tradewindow.cpp`) | Licence: GPL-3.0 (repo LICENSE is "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; the lines read in these files show no per-file licence header) | C++ | symbols `MechanicsManager::getBarterOffer`, `MechanicsManager::getDerivedDisposition`, `CreatureStats::getFatigueTerm`, `TradeWindow::updateOffer`

Checked: Read in full: mechanicsmanagerimp.cpp 470-590 (`getDerivedDisposition` 475-561 and `getBarterOffer` 563-590); creaturestats.cpp 36-52; tradewindow.cpp 600-645 (`updateOffer`, the caller that applies the 75 percent cap). Callers of `getBarterOffer`: found by grep; the call lines are seen only in grep output (enchanting.cpp:300, trainingwindow.cpp:121 and 174, spellcreationdialog.cpp:727, merchantrepair.cpp:83, tradewindow.cpp:626 and 637, travelwindow.cpp:83, spellbuyingwindow.cpp:59), and the enclosing functions of all callers except tradewindow.cpp are not read. Not read: `NpcStats::getBaseDisposition` body (npcstats.cpp:34, grep only), `getEffectiveValue` (the base price source), the Lua caller (servicesoffered.hpp), and the GMST values for the fatigue and disposition terms (game data, not in the donor). The assignment of buy and sell sides to `playerBorrowed` and `merchantBorrowed` in tradewindow.cpp is inferred from the cap comments at 624 and 635, not from the item-model code. Confidence: high for the offer formula and its order of steps; high for the 75 percent cap; medium for the side assignment.

Best transferable idea: one offer formula for every vendor service, built from one difference between the player's side and the seller's side, which gives a buy price and a sell price that cannot make a buy-then-sell round trip profitable once the 75 percent window cap is applied.
Decision (proposed): adapt - keep one server-side offer function for all shop services, with a buy term and a sell term from the same difference, the minimum offer of 1, and the 75 percent window cap built in (not left to the window). Reject the fatigue and luck terms for Frankendom (a random or tiredness-driven price is not server-checkable without a new record), and keep standing only as a zone-data term.
Acceptance: a server test over every zone shop item asserts that the buy price is at least 75 percent of base, that the sell price is at most 75 percent of base, that a buy then sell round trip at the same standing never gains gold, and that no offer is below 1 gold.

## 1. Mechanism

- Entry (mechanicsmanagerimp.cpp 563-568). `getBarterOffer(ptr, basePrice, buying)` returns the base price unchanged when the base is zero or the seller is a creature (567-568). Otherwise it continues.
- Standing (577). `clampedDisposition = getDerivedDisposition(ptr)`. That function starts from the NPC's base disposition plus its crime modifier (478); adds a race bonus when the races match (488-489); adds a personality term (491-494); adds a faction term from the player's faction ranks and reactions (496-540); subtracts a bounty term (544); adds a disease term, a weapon-drawn term and the Charm magnitude (545-556); and clamps the result to 0-100 by default (558-559).
- Terms (578-583). For the player: `a` = mercantile skill capped at 100; `b` = 0.1 times luck, capped at 10; `c` = 0.2 times personality, capped at 10. For the seller: `d`, `e`, `f` are the same three, computed from the seller.
- Sides (584-585). `pcTerm = (standing - 50 + a + b + c) * player fatigue term`; `npcTerm = (d + e + f) * seller fatigue term`. The fatigue term is `fFatigueBase - fFatigueMult * (1 - normalised)`, where `normalised` is current over max fatigue, and is 1 when the max is 0 (creaturestats.cpp 39-52).
- Offer (586-589). `buyTerm = 0.01 * (100 - 0.5 * (pcTerm - npcTerm))`, and `sellTerm = 0.01 * (50 - 0.5 * (npcTerm - pcTerm))`. Both come from the same difference, so the two terms move in opposite directions as the player gets better standing. The offer is `int(basePrice * (buying ? buyTerm : sellTerm))`, and the function returns at least 1.
- Window cap (tradewindow.cpp 615-638). `updateOffer` asks for the buy price with `buying = true` (626) and the sell price with `buying = false` (637). For the buy side, the price is at least `cap = max(1, 0.75 * base)` (623-627). For the sell side, when the seller is an NPC, the price is at most `cap` (635-638). The donor's own comment says the cap exists "to avoid exploits connected to buying and selling the same item" (615).
- Who uses it. The same function prices enchanting (enchanting.cpp:300), training (trainingwindow.cpp:121, 174), spell creation (spellcreationdialog.cpp:727), merchant repair (merchantrepair.cpp:83), the trade window (tradewindow.cpp:626, 637), travel (travelwindow.cpp:83) and spell buying (spellbuyingwindow.cpp:59). The window cap is applied in the trade window (tradewindow.cpp 615-638); as far as the call lines show, the other services use the raw offer, but their enclosing code was not read.

## 2. Key functions

- `MechanicsManager::getBarterOffer`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/mechanicsmanagerimp.cpp` 563-590. The whole offer formula.
- `MechanicsManager::getDerivedDisposition`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/mechanicsmanagerimp.cpp` 475-561. The standing input.
- `CreatureStats::getFatigueTerm`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/creaturestats.cpp` 39-52. The shared fatigue multiplier on both sides.
- `TradeWindow::updateOffer`: `/mnt/frankendom-donors/openmw/apps/openmw/mwgui/tradewindow.cpp` 608-645. The window cap, applied per item.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Standing is clamped to 0-100 | clamp at mechanicsmanagerimp.cpp:558-559 |
| Standing pivot 50: at standing 50 the standing term adds nothing | 50 at 584 (also 50 at 586-587 for the base) |
| Skill term capped at 100 (both sides) | 100 at 578, 581 |
| Luck term 0.1 per point, capped at 10 (both sides) | 579, 582 |
| Personality term 0.2 per point, capped at 10 (both sides) | 580, 583 |
| Spread slope 0.5 on the side difference | 586-587 |
| Buy base 100 (term 1.0 at parity), sell base 50 (term 0.5 at parity) | 586-587 |
| Minimum offer 1 | 589 |
| Window cap 75 percent of base, both directions | tradewindow.cpp:624, 635 (0.75f) |
| Fatigue term from game settings (values not in donor) | creaturestats.cpp:49-52 |

Worked shape (from the formula, not a measured case; fatigue terms taken as 1 and the skill, luck and personality terms as 0): with equal sides the buy term is 1.0 and the sell term is 0.5. If standing is 100 and the seller's side is 0 (so the difference is 50), the buy term falls to 0.75 and the sell term rises to 0.75. So a 50-point standing lead moves each price by a quarter of base.

## 4. TypeScript sketch

simplified: the sketch takes the standing as an input clamped to 0-100, so the donor's disposition sources (478-561) are not reproduced. It keeps the order of steps: zero and base checks, the three capped terms for each side, the fatigue multipliers, the two terms built from one difference, truncation, the minimum of 1. The window cap is a separate function because the donor applies it in the trade window only (tradewindow.cpp 615-638). Omitted: the creature-seller bypass (mechanicsmanagerimp.cpp 567-568; the sketch has only the zero-base case), the game-settings fatigue constants (creaturestats.cpp 49-52; the sketch takes the term as an input), the race, personality, faction, bounty, disease, weapon and Charm terms, and the NPC-only test on the window sell cap.

```ts
// Licence: GPL-3.0 (donor; repo LICENSE is GNU GPL Version 3, 29 June 2007). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Trader {
  skill: number;        // trade skill; the formula caps it at 100
  luck: number;         // attribute value
  personality: number;  // attribute value
  fatigueTerm: number;  // multiplier from current fatigue (game settings give its shape)
}

// Buy or sell offer for one item. `standing` is the seller's view of the buyer, 0..100 (clamped here).
// One formula serves buying and selling: the two terms are built from the same difference.
function barterOffer(basePrice: number, buying: boolean, standing: number,
                     player: Trader, seller: Trader): number {
  if (basePrice === 0) return basePrice;
  const s = Math.min(100, Math.max(0, standing));
  const a = Math.min(player.skill, 100);
  const b = Math.min(0.1 * player.luck, 10);
  const c = Math.min(0.2 * player.personality, 10);
  const d = Math.min(seller.skill, 100);
  const e = Math.min(0.1 * seller.luck, 10);
  const f = Math.min(0.2 * seller.personality, 10);
  const pcTerm = (s - 50 + a + b + c) * player.fatigueTerm;
  const npcTerm = (d + e + f) * seller.fatigueTerm;
  const buyTerm = 0.01 * (100 - 0.5 * (pcTerm - npcTerm));   // 1.0 when the two sides match
  const sellTerm = 0.01 * (50 - 0.5 * (npcTerm - pcTerm));   // 0.5 when the two sides match
  const offer = Math.trunc(basePrice * (buying ? buyTerm : sellTerm));
  return Math.max(1, offer);
}

// The trade window's own cap: the player never buys below 75% of base, and an NPC never pays above 75% of base.
function windowPrice(basePrice: number, buying: boolean, offer: number): number {
  const cap = Math.max(1, Math.trunc(0.75 * basePrice));
  return buying ? Math.max(cap, offer) : Math.min(cap, offer);
}

export {};
```

Checked by tsc: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/server/shop-pricing.ts` (new, proposed). It is one offer function for every vendor service, with the window cap moved into the server. No `src/fight/` file fits, since prices are not fight logic.
- Parity-checklist row 21 (catalogue fields). The base price is a catalogue field on each item, and the offer is computed from it. No row covers the offer formula itself, so say plainly that none of rows 1-23 fits the formula, and a new economy row would be needed.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one engine (one offer function for training, enchanting, repair, travel and shops, as the donor does, rather than one price code per service); server-verified (the offer and the cap run on the server, so the client cannot set a price).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch follows the order of steps, not the lines.
- The donor's price is computed on the client. The mechanics manager runs inside the single-player engine, so nothing checks the offer. Frankendom must compute and check the offer on the server.
- The 75 percent cap is applied only in the trade window (tradewindow.cpp 615-638). The other services call `getBarterOffer` directly (for example travelwindow.cpp:83), so a buy-then-sell loop through a different service can bypass it. Frankendom must put the cap inside the one function.
- The fatigue and luck terms make a price depend on state that the server would have to store and check (fatigue is a live stat; luck is a rolled attribute). Drop them unless they become recorded fields.
- The standing term (disposition) depends on faction ranks, bounty and disease (mechanicsmanagerimp.cpp 496-556). Frankendom should keep one standing number per zone as zone data and not copy the whole chain.
- Equal sides give a buy term of 1.0 and a sell term of 0.5. The spread of 50 percent at parity is a design choice Frankendom should make on purpose; it is not a neutral default.
- The `int` truncation (588) and the minimum of 1 (589) apply to every service. The 1-gold floor means a near-zero item still sells for 1 gold, which is a sink-and-faucet detail for the one ledger.
- Not read: `getBaseDisposition`, `getEffectiveValue`, the Lua caller, and the GMST values. The side assignment in the trade window is inferred from the cap comments.
