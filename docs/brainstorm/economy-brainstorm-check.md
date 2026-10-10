# Check of economy-brainstorm.md against economy-digest.md and the deep notes

Checker: independent pass. Read: the brainstorm (370 lines), the digest (678 lines), and the deep notes by grep (all 61 under `/private/tmp/p2/wave2-haiku/batch3/*/out/economy-trade/`, 855 KB) plus full reads of the TrinityCore, flare-engine, Widelands, ModernUO and azerothcore notes. Also read the real parity checklist `.../scratch-2026-10-09-51f654/engine-parity-checklist.md` (22 rows), which the brainstorm said it could not see. Arithmetic re-run in Python. The brainstorm file was not edited.

Verdict scale: OK / minor / wrong.

## Overall

- The mechanisms, donors, ET/V/U batch ids and licence tags are accurate. All 16 gems cite the right donor, the right folder id and the right class (header class: copyleft = C, permissive = P, restricted = R). No invented mechanism found.
- Two attribution errors (G8 TrinityCore, G4 flare-engine) and one wording error (G13).
- Numbers: no restricted/GPL/AGPL/Valve/Sustainable-Use/BSL constant was copied, and no constant shares a meaning with a donor constant. But the sentence "I found no coincidence with any donor number" is not strictly true (section 3). Soften it.
- Real defects in the brainstorm's own design: the inflation-guard sign is wrong, the T3 sell spot value cannot be reproduced, the quote-lock "sink absorbs the difference" breaks conservation, the fuzz sketch injects its fault after the operation commits, and the default preset E1 turns on player trade against the ACE digest decision.
- Everything else is minor.

## 1. The 16 top gems

| Gem | Verdict | Notes |
|---|---|---|
| G1 one settle door | OK | OpenRCT2 ET005 (settle, typed reason, execute-time recheck), pokemonAutoChess ET015, server-survival ET018 (booking, refund reversal), SpacetimeDB ET009 [R] (audit pair, check-all-then-write) all match the digest. The listed bypasses (loan, cheats, town sales, scribble) are in the digest. |
| G2 server prices from stock row | OK | EQEmu, OpenDAoC, Barony [P], angband, evennia [P]. Barony "charged for failed match" and EQEmu "charged 5, got 1" are in the digest. `quoteId` is the brainstorm's own proposal, not a donor claim. |
| G3 one price function with cap | OK | OpenMW (cap only in trade window), Barony and OpenEnroth clamps, OpenTESArena [P] flat rate. Arithmetic re-run: g^3 = 2.097, 1/g^2 = 0.6104, round trip at v=1000 gives buy 1280, sell 610. Fine. |
| G4 buy-back, fresh flag | minor | Shattered PD ET001 and flare-engine ET012 are right. But "flare-engine applied the buy ratio twice -> the buy-back price is stored" mixes two defects. The double ratio is on the vendor BUY price (225 vs 150). The buy-back defect in the note is different: the buy-back price follows an optional "old sell ratio", and at sell 0.25 / old 0.5 a buy-back costs twice the payout. Fix text: cite the second one. The proposed fix (store the paid price on the row) is still good. |
| G5 stock price plus rationing | OK | 2004Scape [P] (unit unresolved, inert surplus, hidden 60 default) and Veloren (BUG-log clamp) match. Arithmetic: target 24, stock 12 -> stepBp 250, mult 13000. Correct. |
| G6 lazy one-step restock | OK | ModernUO ET003 and U004 match, including "persist ceiling in the ledger" (U004) and the sentinel defect. The 3/4 unsold threshold differs from the donor's half rule (own number, fine). |
| G7 zone index | OK | Daggerfall [P] (client roll, per-region bank) and 0 A.D. (one shared index, Math.round) match. The brainstorm's deterministic pull replaces Daggerfall's chance-based step; that is a design choice, not a claim. |
| G8 two-accept trade | wrong (one clause) | ACE (AGPL), TrinityCore, gawric all right, and the ACE "real clear also empties offers" is the digest checker's finding. WRONG: "TrinityCore ... omitted the money check on one path". The donor checks gold at TradeHandler 271 and 281 (HasEnoughMoney) and at the gold unaccept sites 276-304. It was the NOTE'S SKETCH that omitted the money check (digest checker, point 2). Delete that clause. The kept-accept-after-item-check-failure defect is correct. Also: ACE's digest decision is "do not build a player trade window yet" (see E1 below). |
| G9 conserved swap, claim rows | OK | LostCityRS [P] (EXPIRED row, two calls) and Widelands (batch starts only when both reserved) match. |
| G10 escrow auction | minor | azerothcore, rathena, swgemu, Showdown, AAEmu all match; the swgemu overpay (checker confirmed) and the rathena off-map refund drop are right. Omitted: the digest verdict for swgemu is "reject" (no market slot yet), with "adopt proxy rule and leaderPaid refund if a market is approved". State that this is conditional. The "proxy hold = bidder's max" differs from swgemu (leader debits only the rise); own design, say so. ln2/ln1.035 = 20.1 and 3 x 22 = 66 verified. |
| G11 fee at listing | OK | l2dn [P], forgottenserver, otclient [P] (2% vs 1%, up vs down, cap 1,000,000 vs 100,000), AAEmu. Arithmetic: 0.52/8 = 0.065; 650 x 0.35/3 = 75.8 -> 76; 2,147,483,647 x 650/10000 = 139,586,437.06 -> 139,586,438. Note the worked price 2,147,483,647 is above the proposed `maxAmount` 10^9, so the real engine would refuse it; say "bound check only". |
| G12 gross/net/burn | OK | BAR matches (overflow pass mints, no sender check). |
| G13 bounded integer math | minor | DOLSharp, ModernUO sell-side int, AAEmu int cast all match. Wording: "gave a buyer price 20.9 million too low" is inaccurate. The note says the wrapped buyer price is 89,050,328 for a 110,000,000 listing (expected 132,000,000 with the fee), so it is 42.9 million below the correct price; the 20.9 million is the faucet (seller credited 110,000,000 minus buyer paid 89,050,328). The defect table row ("20.9 million short of the seller's credit") is correct; fix G13. |
| G14 craft payment | OK | keeperrl, C&C, freeorion, OpenRA, freeciv match. Arithmetic: 900/150 = 6; cancel at tick 60: loss ceil(360 x 1667/10000) = 61, refund 540 + 299 = 839; rush 540 x 2.12 = 1144.8 -> 1145. All correct. |
| G15 discount truth | OK | Valve [R] rules match. Shape only is respected. |
| G16 faucet cap, sink table, guard | wrong (controller sign) | The donors are right (OpenRCT2 table, hedgewars cap, autochess negative cap, server-survival ramp, isometric lag, crawl step-down). Arithmetic for 1.6 x H = 6221 and multiplier 0.8998 at 7000 is correct. WRONG: the controller `clamp(round((0.86 - r) x -4000), -140, +140)` has the wrong sign. r = sinks/faucets. When r is low (0.70, too much money), (0.86-0.70) x -4000 = -640, clamped to -140, so buyBp falls and prices get cheaper, which makes inflation worse. It must be `(0.86 - r) x +4000`: low r raises buyBp. Fix this in G16, P11 and X2. |

## 2. Defect -> fix rows

I compared all 59 rows to the digest and checked the 15 below against the notes.

| Row | Verdict | Notes |
|---|---|---|
| Shattered PD | OK | Five gold writes, no server check: in digest. |
| 0 A.D. | OK | One index, two calls, Math.round: in digest. |
| DOLSharp | OK | 32-bit fee, merchant pool. |
| EQEmu | OK | Coin before room check (14261 vs 14298), non-stackable x5. |
| ModernUO ET003/U004 | OK | `?? 0` sentinel, int sell side, restart reset, two gold sources. |
| OpenXcom | OK | Divide by zero, factor 2 unexplained. |
| Barony | OK | Packet fields, no return, zero-floor overdraft. |
| Valve | OK | Rounding erases sale, rental double meaning, empty cache shows 0 (digest excerpt is cut at that point but the text is there). |
| Fallout 2 CE [R] | OK | Doubled cost, no upper clamp, companion trades skip value check. |
| azerothcore | minor | Digest gap list is empty; the row honestly says "(none read in the excerpt)". The "defect" is a design remark. Acceptable, but label as "no defect". |
| SpacetimeDB [R] | OK | No retry guard, uncapped grant. |
| Endless Sky | OK | 390 / 991 at cost 1000. |
| flare-engine | OK | 150 vs 225, window-dependent price. (G4 is the problem, not this row.) |
| Widelands | minor | "accept does not check who is accepting" is stated as fact. The note says whether the accept path calls the recipient check is in `cmd_trade_action.cc`, which was not read. Mark it "unverified". |
| TrinityCore | OK | Accept kept after item-check failure; saves not one transaction. |

Other observations on the table:
- OpenTTD's "defect" ("curve has no use without timed content") and claudecraft's ("reason order is load-bearing") are not defects, they are cautions. Minor labelling.
- 59 rows for 60 distinct donors. gawric (server sends no expiry; client and server clocks race) has no row; it appears only in G8. Add one.
- Class tags in the table all match the digest headers.

## 3. Numeric collision check

Method: grepped every constant of the brainstorm (word-bounded) over all 61 deep notes, then read the context of each hit. About 95 percent of hits are source line numbers (for example 1800 and 1667 in otclient, 610 in OpenRCT2, 6597 in crawl, 1100 in flare-engine). Hits that are values:

| Mine | Where | Donor value | Judgement |
|---|---|---|---|
| `cancelLossBp` 1667 | fheroes2 [C] rate table: 1667 and 3334 | rates 5000/3 and 10000/3 | Coincidence of arithmetic (mine is 1/6). Different quantity. |
| `rushBp` slope 12000 | rathena [C]: auction fee 12000 zeny per hour | fee | Coincidence; different unit and meaning. |
| `sellCapBp` 7000, `perSourceCapBp` and taper floor 3000, N7 `freshVendorBp` 7000 | BAR [C] tax 0.3 (receiver +70) | tax rate | Complement of the same round number; the use is different. |
| guard low band 0.80, `stockMultMin` 8000, `faucetBpBounds` low 8000 | Veloren [C]: each step keeps 0.8 | smoothing | Coincidence. |
| `ceilDownWhenUnsoldBp` 7500 | OpenMW [C] 75 percent cap | cap | Coincidence; different parameter. |
| E3 `cancelLossBp` 2500 | OpenRA [C] cash choice 2500, fheroes2 2500 | start cash, rate | Coincidence. |
| festival `discountBp` 1200 | DOLSharp [C]: buyer pays 1200 (20 percent fee on 1000) | money value | Coincidence. |
| N15 "25 percent of wallet" | CDDA [C]: 25 percent weight | weight | Coincidence. |
| `sweepTicks` 90 | AAEmu [C]: 90 percent seller share | share | Coincidence. |
| guard gain 4000, N4 tail 4000, `stepBp` example 250 | Daggerfall [P]: bounds 250..4000 | index bounds | Permissive donor; coincidence. |
| 350 (`minRaiseBp`) | swgemu worked price 350 [C]; Barony +350 tome tier [P] | worked example | Coincidence. |

No hit shares a mechanism or meaning with the donor constant. No copying found. Required change: replace "I found no coincidence with any donor number" with "no donor constant is reused with the same meaning; round-number coincidences are listed". Section 8 also lists "1200 (20 percent fee)" among donor numbers and then uses 1200 bp without remark, so the coincidences are visible in its own text. The 2^31 / 2^32 / 2^53 values are integer limits (OK).

Also confirmed: the digest list in section 8 omits some donor numbers (azerothcore deposit tiers 12/24/48 h, AAEmu 1/2/3/4 percent for 6/12/24/48 h). Mine are 8-hour blocks, max 24 h, 76 bp: not equal.

## 4. Presets and overlay

| Item | Verdict | Notes |
|---|---|---|
| E0 Flat | OK | 9331 = 2.4 x 3888 verified. Fixed prices, no market, no trade. Consistent with ledger, server verification, zones as data. |
| E1 Standard (default) | wrong | `trade.enabled: true` as the default. The ACE digest decision is "do not build a player trade window yet", and the digest swgemu verdict is "no market slot". Question 1 asks about the market only. Set `trade.enabled` false in E1 (or add trade to question 1). |
| E2 Open Market | minor | `playerSalesRestock: true` contradicts ModernUO's "player sales do not refill stock" (declared as an option, fine) but adds an arbitrage path that T10 does not list explicitly. Add it to the T10 grid. |
| E3 Iron | minor | `saleTaxBp 900` does nothing because E3 inherits market off. `wallet.softCapC` / `decayBpPerHour` have no part (P-number) and the reason `decay_wallet` is not in the closed enum in P12. 4666 = 1.2 x H and 38880 = 20 x S verified. |
| E4 Festival overlay | minor | "On top of any preset" is false: funding comes from `pool:zone`, and the pool only receives tax when `fees.destination = "zonePool"` (E2). Under E0, E1, E3 the pool is empty and the discount cannot run. State the precondition. Also: "stays under the trade-skill maximum so the floor `buy >= v` still holds" is a non sequitur. With idx 7800 and stock 8000, the natural buy multiplier is 0.78 x 0.8 x 1.28 = 0.80 v, so `buy >= v` holds only because of the explicit clamp, not because of the discount size. |
| Field naming | minor | P04 `restockDelayS` vs E1 `restock.delayS`; G12 `gift.freeAllowanceC` vs P06 `fees.giftFreeC`; E0/E1 put `price.mode` at top level but P03 puts `price.mode` on each vendor line. Pick one path. |
| ONE ledger | OK | Wallet, escrow, hold, pool, sink are accounts of one ledger; sum of accounts is the supply. Claim rows are not in the P01 account list (see fuzz below). |
| Server-verified | OK | Client imports pure price and fee modules for previews only. |
| Zones as data | OK | Per-zone `economy` block and index. |
| Pit frozen | OK with one tension | Test #15 (no economy hook reachable from Pit) keeps the freeze. But the parity checklist row 18 says the Pit loot moves to server rewards in the post-K server-tick work. If Pit rewards ever credit coin, they would pass through `settle`. Word the test as "no economy hook reachable from Pit code, except the row 18 reward path once the Pit moves to server rewards". |
| P15 quote lock | wrong | "the sink absorbs the difference" cannot work. A sink account only receives; if it pays out, supply is minted and the conservation test fails. A price lock needs a named source (the zone pool or a `quote_subsidy` faucet row counted in `minted`), or drop the lock to "buyer may cancel and re-quote". |
| P12 reason enum | minor | "Closed" enum lacks gift transfer, decay_wallet, wager stake, wager rake, seal, quote subsidy. Fuzz OPS include `gift` and `wager`. Add them. |
| N1 SEAL | minor | "total == minted - 0" is meaningless; it should be `sum(all accounts, sinks included) == genesis + minted`. |

## 5. Conservation fuzz sketch

The idea and invariants are sound: conservation every step, no negative balances, items owned once, rows explain every change, replay equality, mutation testing. Corrections needed:

1. Fault injection is in the wrong place. `faultAfterRandomStep(w)` runs after `tryOp` has returned, so the operation has already committed; nothing is rolled back, and `r.faulted` is never set. The fault must be injected inside the transaction through the store's hook (T7 says so; the sketch contradicts it). Set `r.faulted` from the hook.
2. `minted += r.mintedFaucetC` trusts the system under test. A bug that mints under a non-faucet reason would not be seen. Compute `minted` independently: sum of row deltas with reason in {kill_loot, quest, start_grant, admin_adjust} from the audit log, and separately assert that no other reason has a net positive total.
3. "A refusal changes nothing" conflicts with lazy settle-on-read (N11, G6): a refused buy that first triggers the lazy restock or index step mutates state, so `hashAll` differs. Either hash only the ledger and item accounts (excluding lazy catch-up state), or state that catch-up is idempotent and excluded.
4. A refused request that stores its `requestId` outcome (P12 dedupe) also changes the hash. Exclude the dedupe table or say refusals are not recorded.
5. `total(w)` lists wallets, escrow, holds and pools. Claim rows (G9, N12) and any pending quote subsidy are not in P01's account list. Add them, and add claims to the item-ownership check.
6. `admin_adjust` mints or burns and has no place in the sketch. Either exclude it from OPS or count it in `minted`.
7. Variants (a) concurrency, (b) bigint oracle, (c) mutation test are good; keep them. Concurrency matters most for the double-click and restart cases.

Verdict: sound after items 1 to 6.

T3 spot value: "v = 4375, idx 11600, stock 13000, disc 900 -> buy 7685, sell 2910". The buy (4375 x 1.28 x 1.16 x 1.3 x 0.91 = 7684.77 -> 7685) reproduces. The sell does not: 4375 x 0.6104 = 2670.5; with index 1.16 it is 3097.8 (then capped at 0.7 v = 3062); with stock 1.3 it is 3471; none gives 2910 (ratio 1.0897 to the base sell). The sell modifier stack is not defined (P02 lists only the order). Define it, or remove the sell figure.

## 6. The 17 proposed parity rows

The real checklist exists and has 22 rows; the names the brainstorm took from HANDOFF match it. Row 23 is not in the checklist (it comes from the zones brief). Column "digest gap" says whether a digest gap or decision statement supports the row.

| # | Proposed | Verdict | Support |
|---|---|---|---|
| 1 | Wallet and ledger | OK | Digest: one-ledger gap on about 20 donors. |
| 2 | Vendor and price function | OK | EQEmu, OpenMW, Barony and others. |
| 3 | Sinks and fees | OK | l2dn, otclient, AAEmu, forgottenserver. |
| 4 | Faucet budget and inflation guard | minor | Digest has faucet caps (hedgewars, OpenRCT2), but freeciv says "no inflation control in this code; must come from elsewhere". The guard is the brainstorm's own idea, not a digest gap. |
| 5 | Player trade | minor | ACE: "Frankendom has no player-to-player trade today ... do not build a player trade window yet". Mark as deferred / pending Dom question. |
| 6 | Market and auction | minor | swgemu: reject, no slot. Mark conditional on approval. |
| 7 | Craft payment | OK | freeciv, C&C, keeperrl, freeorion. |
| 8 | Item instance state through trade | OK | forgottenserver (charges and upgrades lost). Row 15 gear dressing is visual (confirmed in the checklist). |
| 9 | Row 18 extension | OK | OpenTESArena: loot must credit the one counter. Note row 18 is owned by the post-K server-tick work (checklist note names EQEmu zone tick and rathena map server). |
| 10 | Row 17 extension (death cost) | minor | Row 17 is "by design (open-world respawn)". The cost rule is the brainstorm's idea, not a digest gap. Say "new row" rather than "extension". |
| 11 | Row 19 extension (replay of ledger) | minor | Inferred only; digest gives no statement. Row 19 is partial and also post-K. |
| 12 | Rows 20/21 fields | OK | Digest: price 0 rejected at load (OpenXcom), stackMax clamp (EQEmu), origin (OpenDAoC), fields match the row 21 style list. |
| 13 | Row 14 HUD | minor | Inferred (no digest gap). Fine as a UI row. |
| 14 | Row 5 controls | minor | Inferred. Hold-to-confirm and accept arming are brainstorm ideas. |
| 15 | Row 22 Pit test | minor | Row 22 is "by design"; the test is a guard rail, see section 4 tension with row 18. |
| 16 | Row 23 sibling | minor | Row 23 is a proposal from the zones brief, not in the checklist file. Label it. |
| 17 | Row 4/13 stamina is not currency | minor | The digest OpenBOR gap supports the content. Stamina belongs to row 3 (guard/parry/roll/stamina/stance), and specials are row 13. Cite row 3 (and 13). |

Rows 1, 2, 3, 7, 8, 9, 12 are digest-supported. Rows 4, 10, 11, 13 to 16 are inferred and should stay labelled "inferred" (the brainstorm already says so in section 6). Rows 5 and 6 contradict the current digest decisions unless Dom approves a player market; mark them conditional.

## 7. Corrected list (what to change in the brainstorm)

Wrong (fix before use):
1. G8: delete "and omitted the money check on one path" for TrinityCore (the donor checks gold; the note's sketch omitted it).
2. G16 / P11 / X2: flip the controller sign to `clamp(round((0.86 - r) x +4000), -140, +140)`.
3. P15 / N2: "the sink absorbs the difference" breaks conservation. Name a source account counted in `minted`, or drop the price lock.
4. T3: the sell spot value 2910 cannot be reproduced. Define the sell modifier stack and recompute, or drop it.
5. E1: set `trade.enabled` false by default (ACE: no trade window yet), or add trade to question 1.

Minor:
6. G4: replace the flare-engine "buy ratio applied twice" link with the old-sell-ratio buy-back drift (buy-back can cost twice the payout).
7. G13: the buyer price is 42.9 million below the correct price; 20.9 million is the faucet against the seller's credit.
8. G10: record that swgemu's digest verdict is "reject" until a market is approved; "proxy hold = max" is the brainstorm's own variant.
9. G11: the 2,147,483,647 worked example exceeds `maxAmount` 10^9; label it a bound test.
10. Section 8 and section 0: replace "no coincidence with any donor number" by the actual statement: no donor constant is reused with the same meaning; list the round-number coincidences from section 3 above (1667, 12000, 3000/7000, 0.80/8000, 7500, 2500, 1200, 350, 25 percent, 90).
11. E4: state that the overlay needs `fees.destination = "zonePool"` and a funded pool; remove the false "buy >= v still holds" reasoning (it is the clamp).
12. E3: drop `saleTaxBp 900` or turn the market on; add a part and a reason code for wallet decay.
13. P12: add reasons for gift transfer, decay_wallet, wager stake, wager rake, seal, quote subsidy. Fix N1's formula.
14. Field names: unify `restockDelayS`/`restock.delayS`, `gift.freeAllowanceC`/`fees.giftFreeC`, per-line vs top-level `price.mode`.
15. Fuzz sketch: apply items 1 to 6 of section 5 (fault inside the transaction, independent `minted`, lazy catch-up and dedupe excluded from the refusal hash, claims in the totals, `admin_adjust`).
16. Defect table: add a gawric row (no server expiry in the packet, clock race); mark Widelands "accept check" as unverified; relabel OpenTTD and claudecraft rows as cautions.
17. Section 6: the checklist file is readable (22 rows, matches); cite row 3 for the stamina item; mark rows 5 and 6 conditional; mark rows 4, 10, 11, 13-16 as inferred; note row 23 is not in the checklist; add the row 18 reward-path exception to the Pit-isolation test.
