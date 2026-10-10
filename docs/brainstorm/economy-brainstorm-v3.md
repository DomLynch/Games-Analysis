# Economy and trade brainstorm (idea-mining lead) - v3 (Strategy verdict and reconciliation applied)

## Status after Strategy verdict (2026-10-10)

NOTHING IS BUILT. This file is a design brainstorm; no code, data file, test or server change exists. No shop exists in Frankendom yet.

What changed from v2:
- **Ledger ruling applied:** the ledger is the append-only book of value: currency, loot grants, XP and kill rows, with a closed reason list and `settle` as its only door. Three reasons were added (`kill_record`, `xp_grant`, `loot_grant`). Zone snapshots, transit, social state and moderation records are separate stores; the conservation fuzz therefore stays meaningful.
- **Trade and market: OFF** (Dom's standing word, confirmed by Strategy). Parts ECO-P07 and ECO-P08, gems ECO-G8, ECO-G10 and ECO-G11 (market fees), preset ECO-E2 and idea ECO-N9 are SHELF DESIGNS: off in every preset, not scheduled, not in the default fuzz op set. The vendor-side sinks (repair, gift tax) do not need the market.
- **Reordered (Strategy A3, D2, D6, D8, D10):** FIRST `settle` is the only balance writer plus request-id idempotency (ECO-T12 grep lint, ECO-T16 replay). THEN, only once the first shop exists: the price function property grid (ECO-T3), the conservation fuzz (headline test in section 7), and loot credits coin through `settle` with reason `kill_loot` so expected coin per fight equals the wage (ECO-R9, ECO-N6).
- **Lazy deadlines:** the "one sweep" wording is dropped (ECO-N11); expiry settles on observation with the deadline as effective time (Strategy W7).
- **Shared seeding:** index rolls and stock rolls use the one `weightedPick(table, seed)` scheme with `H(worldSeed, zoneId, eventKind, eventKey)` (Strategy W5).
- **Row 23:** exists per Strategy and is partly live; it is no longer described as absent.
- **Inflation guard:** still marked INFERRED in section 6 (Strategy: no digest support).
- **Name rule:** the never-name restricted donor is removed ("a restricted donor"; "GPL with extra publisher terms").
- **Questions for Dom:** (1) trade and market OFF, confirm when shops arrive; (2) one currency, firm, including any future paid currency (Strategy recommends yes). Others wait.

- **Licence rule (Strategy A6):** [C], [R] and [?] donors are shape only; only [P] donors are adaptable with notice, and nothing from an [?] donor is adaptable until its tag is read in the digest. No tag was changed in v3; per-donor tag disagreements are listed as OPEN O1 to O3 in RECONCILIATION-v3.md.

### ID mapping (v2 label -> v3 id)

| v2 label | v3 id |
|---|---|
| Gems G1 to G16 | ECO-G1 to ECO-G16 |
| Parts P01 to P17 | ECO-P01 to ECO-P17 |
| Presets E0 to E4 | ECO-E0 to ECO-E4 (they were easy to confuse with the E-numbered tests of the zones and parties docs) |
| Novel ideas N1 to N20 | ECO-N1 to ECO-N20 |
| Unit and property tests T1 to T17 | ECO-T1 to ECO-T17; new in v3: ECO-T18, ECO-T19 |
| Conservation-of-currency fuzz (section 7 headline) | ECO-FUZZ |
| Simulation experiments X1 to X5 | ECO-X1 to ECO-X5 |
| Proposed parity rows 1 to 17 (section 6) | ECO-R1 to ECO-R17 (they collided with the numbers of the real checklist rows 1 to 23; "row N" in running text still means the checklist row) |
| Questions 1 to 6 | ECO-Q1 to ECO-Q6 |

---

**NOTHING IS BUILT.** v3 applies the Strategy verdict of 2026-10-10 and RECONCILIATION-v3.md (see the status block). v2 applied the 17 corrections of `economy-brainstorm-check.md` to v1 (v1 is untouched). This file is a design brainstorm from the 61-note digest `/private/tmp/p2/brainstorm/economy-digest.md`. No code, no data file, no test and no server change exists. Every field name, number, formula and test below is a proposal. Nothing here has been run, except a few arithmetic checks (a hand calculator run) used for the worked examples; those are marked "calc".

What I read: all 61 digest entries (best_idea, decision, acceptance, tags, and the gap excerpts). The excerpts are cut at about 700 characters, so several gap lists end mid-sentence; where a defect rests on a cut excerpt I say "(cut)". I did NOT open the deep notes behind the digest (the checker did, and its findings are folded in). In v1 I could not see the parity checklist; the checker read the real one (22 rows, names match HANDOFF). Row 23 (zone population) is not in the older 22-row checklist file; per Strategy it exists and is partly live (Zone 2 population, the ruin camp). Section 6 labels each proposed row as supported, conditional or inferred.

Rulings assumed (and two digest decisions that bind this document: ACE says "do not build a player trade window yet", and swgemu says "reject, no market slot"; so player trade and the market are OFF, Dom's standing word confirmed by Strategy; their parts stay on the shelf as designs only and are off in every default): ONE LEDGER = the append-only book of value (currency, loot grants, XP, kill rows) with a closed reason list and `settle` as its only door; zone snapshots, transit records, social state and moderation records are separate stores (Strategy ruling); server-verified everything; one engine; zones as data; loot/XP parity row 18; catalogue fields row 21 (row 20 = catalogue as runtime source); Pit frozen (row 22).

## 0. How to read licence tags, numbers and citations

- Licence class: **[P]** permissive (MIT, BSD, Apache, Zlib), **[C]** copyleft (GPL, AGPL, CC-BY-SA, BSL, GPL with extra publisher terms), **[R]** restricted or unclear (Valve, Sustainable-Use, BSL-restricted, non-commercial). The class is the digest header class, not my own legal reading.
- **[C] and [R] donors are shape-only.** No constant or code is copied. Every number I give is our own, with a derivation, and was checked against the donor numbers (collision table in section 8; the checker also grepped all 61 deep notes). No donor constant is reused with the same meaning. Round-number coincidences were found; the ones the checker listed were replaced with differently derived values. [P] donors could be adapted with notice, but I still wrote everything fresh.
- Citation form: `Donor [class] ET0xx` where ET0xx / U004 / V0xx is the digest batch folder under `/private/tmp/p2/wave2-haiku/batch3/<batch>/out/economy-trade/<donor>.deep.md`.
- Money is an integer count of **c** (the minor unit; a name for the display coin is a Lead/Dom choice). All percents are integer basis points (bp, 10000 = 100%). Money type on the server is a 64-bit integer (BigInt in TypeScript) with a hard per-amount cap `maxAmount` (see section 3, ECO-P01), never a 32-bit int and never a float.
- **Tuning assumptions (mine, unmeasured, replace by measurement):**
  - server step `T` = 100 ms;
  - a typical fight `fightS` = 20 s;
  - a typical session `sessionS` = 1800 s with 60 percent of it in fights, so 54 fights per session and 108 per hour;
  - **wage `W`** = 36 c per fight at zone tier 1. Derivation: I want one session to pay about 2000 c (the price of a first gear piece), so W = 2000 / 54 = 37, rounded down to 36 so that 54 fights pay exactly 1944 c. Session income `S` = 1944 c; hourly income `H` = 3888 c;
  - bag size 24 slots.
  Every number below is a formula in `W`, `S`, `H`, `T`, `fightS`, so re-deriving after measurement is mechanical.

## 1. Top gems (16)

Each gem: the idea, donor and note, class, what we keep, what we fix, and our own numbers.

**ECO-G1. One door for all money: `settle(account, delta, reason, requestId)`.** OpenRCT2 [C] ET005 (single settle with typed reason, re-check at execute time); pokemonAutoChess [C] ET015 (one gold value, pool conservation); server-survival [P] ET018 (booking function, sale reverses purchase); SpacetimeDB [R] ET009 (audit row pair, check everything then write).
 Keep: every coin change goes through one function that writes a row with a reason, and a refused call writes nothing. Defect -> fix: donors bypass their own door (loans, cheats, town sales, scribble payout write the field directly) -> a static test greps server code for any write to a balance field outside the door, and an exception list that must be empty at release. Our numbers: reasons are a closed enum (section 3, ECO-P12); refused call = state hash unchanged.

**ECO-G2. Server prices from the stock row; the client sends only a slot and a quantity.** EQEmu [C] ET003; OpenDAoC [C] ET004; Barony [P] ET006; angband [C] ET008; evennia [P] ET011.
 Keep: the client names `(vendorId, lineId, qty, quoteId?)`; the server looks the line up and prices it. Defect -> fix: Barony priced from packet fields and charged for a failed match -> price only from the stored line, unknown line = hard refuse with no charge; EQEmu charged five for a non-stackable one -> clamp quantity to `stackMax` from the catalogue (row 21 field) and report the clamp. Our numbers: none beyond the price function (ECO-G3).

**ECO-G3. One pure price function with a spread and an arbitrage cap inside it.** OpenMW [C] ET016 (one offer function, cap inside it); Barony [P] ET006 and OpenEnroth [C] ET004 (clamp buy to at least value, sell to at most value); evennia [P] ET011; OpenTESArena [P] ET006 (flat resale rate).
 Keep: `buy(v)` and `sell(v)` are computed from one function with modifier stack order fixed, so no service can bypass the cap (OpenMW applied the cap only in the trade window). Our numbers (derived): the round trip should lose about half, so buy/sell = g^3 = 2.1, g = 1.28. `price.buyBp` = 12800; `price.sellBp` = 1/g^2 = 6104; `price.sellCapBp` = 8052 (midpoint of `sellBp` and par, (6104 + 10000) / 2: no modifier stack can close more than half the gap between the base sell and the vendor value); `price.tradeSkillBpMax` = 1800 (an optional later skill, off by default). Modifier stacks (defined here, v1 left the sell stack undefined): `buy = max(v, round_up(v x buyBp x zoneIdx x stock x (10000 - discountBp) / 10000^4))`; `sell = min( floor(v x sellBp x zoneIdxSell / 10000^2), floor(v x sellCapBp / 10000), buy - 1 )` with `zoneIdxSell = 10000 + (zoneIdx - 10000) / 2` (the zone index moves sell at half strength, stock does not move sell). Invariant: `buy >= v`, `1 <= sell <= min(floor(v x sellCapBp / 10000), buy - 1)`. Calc: v = 1000 -> buy 1280, sell 610 (round trip loses 670).

**ECO-G4. Buy-back as a zero-margin undo, with a fresh flag.** Shattered Pixel Dungeon [C] ET001; flare-engine [C] ET012 (fresh-sale flag, re-price on old ratio).
 Keep: a sold item can be bought back for exactly what was paid, so selling by mistake is free to undo. Fix: flare-engine's buy-back price follows an optional "old sell ratio", so the price drifts from the payout (with sell 0.25 and old ratio 0.5 a buy-back costs twice what the sale paid) -> the buy-back price is stored on the row at sale time and never recomputed. (The separate flare-engine defect, the vendor buy ratio applied twice, 150 expected vs 225, is in the defect table and is fixed by ECO-G3.) Our numbers: `buyback.slots` = ceil(24 / 4) = 6 (a quarter of a bag, so one clear-out visit fits); `buyback.ttlS` = 45 x fightS = 900 s; the list also clears on leaving the zone.

**ECO-G5. Stock-driven price plus proportional rationing.** 2004Scape [P] ET001; Veloren [C] ET019.
 Keep: scarcity raises the price a fixed step per missing unit; two buyers asking for more than is left each get the same fraction. Fix: 2004Scape's surplus side was inert and its unit was unresolved -> a named unit (bp per unit), the floor and the step set together and pinned by a test; Veloren clamped an overdraft silently with a "BUG" log -> refuse instead. Our numbers: `stepBp = 6000 / target` per missing unit (emptying a line adds 60 percent), surplus step = half of that, `price.stockMultMinBp` 8500 (= 10000 - 12 surplus units x 125 bp: surplus counts only up to half the target), `price.stockMultMaxBp` 16000 (= 10000 + 6000). Calc: target 24, stock 12 -> stepBp 250, mult 13000.

**ECO-G6. Lazy one-step restock with a demand-moved ceiling.** ModernUO [C] ET003 and U004.
 Keep: no timers; on first list-open after the delay, refill once to the ceiling; a sold-out line raises its ceiling, a line with two thirds or more unsold lowers it; however long the shop sat, take one step only. Fix: transient state lost on restart -> ceiling and `lastRestockTick` live in the persisted vendor-state record (not a value-ledger row); the price scalar uses an explicit null, never "0 means none". Our numbers: `restock.delayS` = 240 (12 x fightS); ceiling x3/2 on sold-out, x5/6 when `restock.ceilDownWhenUnsoldBp` = 6667 (two units in three) or more is unsold; `ceilMin` = base, `ceilMax` = 4 x base.

**ECO-G7. Zone price index: daily mean reversion plus impact-and-recovery.** Daggerfall Unity [P] ET010 (daily index step); 0 A.D. [C] ET001 (impact per lot, timed restore).
 Keep: a per-zone price index that drifts and pulls back, and trades that push a rate then recover. Fix: Daggerfall rolled it on the client, 0 A.D. shared one index for the whole market -> index per zone market, rolled on the server with a seed `H(worldSeed, zoneId, eventKind = "index", eventKey = dayNo)` from the shared seed scheme (Strategy W5) so it is replayable; 0 A.D. rounding could mint -> round the payout down. Our numbers: `idx` in bp, bounds 7800..16200; daily step `idx += (10000 - idx) * 1800 / 10000 + noise`, noise uniform in +-170 bp. Impact: each lot traded moves a pair rate 120 bp, recovering 1/9 of the gap per elapsed `sweepTicks` (90) period, applied lazily on read.

**ECO-G8. Two-accept trade with a version counter; any change clears accepts. (SHELF DESIGN, OFF per Dom's standing word and Strategy; ACE's digest decision is "do not build a player trade window yet".)** ACE [C] V002; TrinityCore [C] V010; gawric Unity client [P] ET013 (expiring invite).
 Keep: both accepts must quote the current offer version; any edit bumps the version and clears both accepts; the commit re-checks ownership and room. Fix: TrinityCore kept the accept after an item-check failure (it does check gold, at its HasEnoughMoney sites; it was the deep note's own sketch that omitted the money check, so no donor money-check defect is claimed); ACE's real clear also emptied the offer windows (digest checker found it) -> we choose explicitly: change clears accepts only, keeps offers, and a test pins it; the commit runs all checks, then one transaction. Our numbers: `trade.inviteTtlS` = 24 (1.2 x fightS), the expiry is sent in the packet and the bar reads it (gawric's client and server clocks raced because the packet carried no expiry); `trade.acceptArmTicks` = 15 (button disabled 1.5 s after any change; 600 ms phone reaction x 2.5).

**ECO-G9. Conserved swap: nothing is ever lost, overflow becomes a claim row.** LostCityRS [P] ET003; Widelands [C] ET019 (batch starts only when both sides are reserved).
 Keep: one server transaction moves both offers; every unit ends in a bag or a claim owned by the receiver. Fix: LostCity let floor items expire with no row -> expiry writes an `EXPIRED` row and returns the claim to the owner; content ran the swap as two calls -> one call. Our numbers: `claim.ttlS` = 3600; expiry returns to the original owner.

**ECO-G10. (SHELF DESIGN, OFF; conditional on a market ever being approved: the swgemu digest verdict is "reject, no market slot yet; adopt the proxy rule and the leaderPaid refund if a market is approved".) Escrow inside the auction record; outbid refund in the same transaction; proxy bid.** azerothcore [C] ET008; rathena [C] ET018; swgemu Core3 [C] V005; Showdown [P] ET019 (each bid restarts the window); AAEmu [C] V008 (fee by duration, buy-now ends lot).
 Keep: the bid sits in the lot, so a restart or an offline bidder cannot lose a refund. Fix: rathena dropped refunds when the party was off the map -> refunds are ledger rows, never session events; swgemu refunded the new price, not the leader's own debit (checker confirmed the overpay) -> the hold is recorded on the row and the refund equals that recorded hold; AAEmu had no balance check -> `settle` refuses. Our numbers (our own variant: swgemu debits only the leader's rise, while our proxy hold is the bidder's whole max): `market.minRaiseBp` = 350 (twenty raises double a price: ln2/ln1.035 = 20.1), floor 2 c; anti-snipe `market.antiSnipe.extendToS` = 66 (3 x (fightS + 2 s latency)); proxy hold = the bidder's max.

**ECO-G11. Fee-at-listing that is never refunded, timed states, and one shared fee function.** l2dn server [P] ET008; forgottenserver [C] ET017; otclient [P] ET017; AAEmu [C] V008.
 Keep: listing fee up front, a sale tax on settlement, expiry as a sink with a visible deadline. Fix: otclient's client and server disagreed (rate, rounding direction, cap) -> one shared module imported by server and client for previews; l2dn's fee unit and per-lot-or-per-unit were unclear -> the fee is a bp fraction of the lot total, tested on a stack of 5; DOLSharp overflowed in the fee (see ECO-G13). Our numbers: `fees.saleTaxBp` = 650 (one eighth of the vendor round-trip loss: 0.52 / 8 = 0.065); `fees.depositBp` = 76 per 8-hour block, max 3 blocks (76 = 650 x 0.35 / 3, covering a 35 percent unsold rate over three blocks); tax rounds up, seller proceeds round down. Calc (bound test only; 2,147,483,647 is above `maxAmount` 10^9, so the real engine refuses it at the door and this value only exercises the shared fee module against the bigint oracle): price 2,147,483,647 -> tax 139,586,438 in 64-bit. A value the engine accepts: price 10^9 -> tax 65,000,000, deposit per block 7,600,000. All ECO-G11 and market fees apply only if the market part is approved; the vendor-side sinks (repair, gift tax) do not need it.

**ECO-G12. Gross / net / burn transfer.** Beyond All Reason [C] ET009.
 Keep: sender pays gross, receiver gets net, the difference is a named burn, a cap on the receiver's room. Fix: the overflow pass minted credit with no debit and the transfer did not check the sender -> no overflow pass; sender check first. Our numbers: gift transfer tax `fees.giftTaxBp` = 900 (above `fees.giftFreeC` = one session of income S = 1944 per day), so a free allowance keeps friends' small gifts cost-free.

**ECO-G13. Bounded integer math.** DOLSharp [C] ET002 (32-bit fee wrap: the note's wrapped buyer price is 89,050,328 for a 110,000,000 listing, 42.9 million below the correct 132,000,000 with the fee; the seller was still credited 110,000,000, so the faucet is 20.9 million); ModernUO [C] ET003 (sell side `int` with no guard, buy side guarded); AAEmu (int cast of a long).
 Keep: check price, funds and room before any move. Fix: all fees use `(amount * bp)` in 64-bit with `maxAmount` = 10^9 c, tax and fee computed from the same bounded value on both sides; a boundary fuzz test at 2^31 / 20, 2^31, 2^32, 2^53 (these are the integer limits, not donor constants).

**ECO-G14. Craft payment: reserve, drip, rate cap, refund-before-progress, rush price.** keeperrl [C] ET016 (queue states); a restricted donor [C] ET011 (installments, stall with no debt); freeorion [C] ET013 (rate cap and carry, server decides completion); OpenRA [C] ET004 (pay as built); freeciv [C] ET013 (rush price).
 Keep: queue a craft = a real hold row in the ledger (keeperrl's "debt" was only a claim the other spenders ignored), the hold releases at a capped rate per tick into a sink or the material pool, cancel refunds the unspent hold plus a share of the spent part. Fix: keeperrl let a cheap later item overtake -> strict queue order by default (`craft.fairness` = "fifo" | "any-affordable"); the restricted donor stalled silently -> a stalled craft shows "waiting for c" with the shortfall. Our numbers: per-tick draw = ceil(cost / minTicks); 900 c over 150 ticks = 6 c per tick; cancel loss `craft.cancelLossBp` = 1368 on the spent part (derivation: 6 x the maximum market deposit, 6 x 3 blocks x 76 bp = 1368, so using a craft queue as free storage always costs more than parking the same value in a listing for six times as long); rush multiplier `craft.rush.baseBp` + `craft.rush.slopeBp` x (remaining / total) with base 12800 (= `price.buyBp`: a rush never undercuts the vendor price) and slope 9200 (so rushing from zero progress costs 2.2 times, 12800 + 9200 = 22000). Calc: cancel at tick 60 of a 900 c craft: spent 360, held 540, loss ceil(360 x 1368 / 10000) = 50, refund 540 + 310 = 850, sink 50. Rush at 40 percent progress: multiplier 12800 + 9200 x 0.4 = 16480 bp, remaining 540 x 1.648 = 889.92 -> 890.

**ECO-G15. Discount-truth rules.** Valve source SDK 2013 [R] ET006.
 Keep: a sale shows only if the price is strictly below base after rounding; a bundle shows a discount only if it costs less than the sum of its parts. Fix: rounding erased a 1 percent sale; the rental number meant two things -> every price field has one named unit (charge share). Our numbers: round displayed prices to `roundTo` = 1 c below 200 c, 5 c from 200 c up, and only after the discount test.

**ECO-G16. Faucet cap, sink table and an inflation guard.** OpenRCT2 [C] ET005 (rolling period table); hedgewars [C] ET014 (cap, wasted tick); pokemonAutoChess [C] ET015 (interest cap); server-survival [P] ET018 (upkeep as percent of price with a ramp); isometric-city [P] ET007 (lagged rate so a change does not shock); crawl [C] ET010 (step-down soft cap).
 Keep: each account has a rolling faucet window; payouts above the cap taper rather than stop; a daily controller moves one lever by a bounded step. Fix: autochess's interest cap could go negative -> every cap is `max(0, ...)`; hedgewars charged a cached cost -> price recomputed at the point of payment. Our numbers: `faucet.capC` = 1.6 x H = 6221 c per rolling hour, linear taper from 1.0 at the cap to 0.2 at 2 x cap. Calc: earned 7000 -> multiplier 1 - 0.8 x (7000 - 6221) / 6221 = 0.8998. Controller: `r = sinks24 / faucets24`; dead band 0.805..0.915 (target 0.86 +- 0.055, leaving 14 percent growth for new players); outside it, vendor `price.buyBp` moves `clamp(round((0.86 - r) x +4000), -140, +140)` bp per day inside bounds 11400..14600. **Sign check (v1 had the sign inverted):** r is sinks over faucets, so a LOW r means too much money; the term (0.86 - r) is then positive and `buyBp` RISES (prices go up, more sink). Worked example, calc: r = 0.70 -> (0.86 - 0.70) x 4000 = +640 -> clamped to +140 (prices rise); r = 1.00 -> (0.86 - 1.00) x 4000 = -560 -> clamped to -140 (prices fall); r = 0.86 -> 0; r = 0.80 is just under the band and gives +240 -> +140. The gain 4000 reaches the 140 clamp at 3.5 points from the target (140 / 4000); since the dead band starts 5.5 points away, the controller is effectively a bang-bang of +-140 outside the band; that is intended (bounded, lagged, one lever).

## 2. Defect -> fix table

Rule: a donor defect never rejects the mechanism. Class tag after the donor. "T" ids refer to the experiment plan (section 7).

| Donor [class] ET | Defect (from the digest) | Fix | Test |
|---|---|---|---|
| Shattered PD [C] ET001 | Funds checked only in the client; buy and buy-back spend unchecked; gold written in five places | Server checks; `settle` is the only writer | ECO-T1, ECO-T12 |
| 0 A.D. [C] ET001 | One index for the whole market; payment and payout are two calls with no rollback; `Math.round` can mint | Index per zone market; one transaction; round payouts down | ECO-T4, ECO-T7 |
| 2004Scape [P] ET001 | Scale unit unresolved; surplus side inert; a "60 default" hidden by a floor | Named unit bp; floor and step set together and pinned | ECO-T3 |
| CDDA [C] ET002 | Price computed in the client; debt remembered by the NPC and a bank (three money places) | Server price; one signed balance over one ledger; no NPC debt | ECO-T1, ECO-T12 |
| OpenBOR [P] ET002 | MP spent from HP when short (second pool); payment deferred to animation end | One pool per cost, refuse not fall through; pay at the gate | ECO-T9 |
| DOLSharp [C] ET002 | 32-bit fee wraps; buyer price 20.9 million short of the seller's credit; separate merchant pool | 64-bit; `maxAmount`; pool is a ledger account | ECO-T6 |
| EQEmu [C] ET003 | Coin taken before the bag-room check; non-stackable qty charged but one granted | Room check first, qty clamp, one transaction | ECO-T2 |
| LostCityRS [P] ET003 | Floor items vanish at expiry with no row; swap as two content calls | `EXPIRED` row and return to owner; one call | ECO-T8 |
| ModernUO [C] ET003 / U004 | `?? 0` sentinel means "no price scalar"; sell side `int` unguarded; stock state reset on restart; two gold sources | Explicit null; 64-bit both sides; ceiling persisted; one account | ECO-T3, ECO-T6 |
| OpenDAoC [C] ET004 | Items granted before debit; sell-back creates money from any droppable item | Check then apply; origin flag on items (ECO-N7) | ECO-T2, ECO-T10 |
| OpenEnroth [C] ET004 | Truncation drifts; reputation term has no source | Integer minor units, one rule; reputation field dropped | ECO-T3 |
| OpenRA [C] ET004 | Rollback reads current stock not the amount added; lockstep sync | Server authority; rollback uses recorded amounts | ECO-T7 |
| OpenRCT2 [C] ET005 | Loan, cheats, scripting and guest spends write cash directly | All routed through `settle`; exception list empty at release | ECO-T12 |
| OpenTTD [C] ET005 | (caution, not a defect) the time-decay curve has no use without timed content | Park until timed bounties exist (idea ECO-N4); server ticks | ECO-T14 |
| OpenXcom [C] ET005 | Commit trusts the screen; divide by zero on cost 0; price factor 2 unexplained | Re-check at commit; reject price 0 at catalogue load; no unexplained factors | ECO-T2, ECO-T13 |
| Barony [P] ET006 | Price from packet fields; no return after failed match still charges; zero floor on overdraft | Price from stored line; hard return; overdraft refused | ECO-T1, ECO-T2 |
| Valve SDK 2013 [R] ET006 | Rounding erases a small sale; rental number means two things; market price shows 0 when cache empty | Test sale after rounding; named unit; empty = "no quote" | ECO-T15 |
| OpenTESArena [P] ET006 | Two gold forms (counter and item); price captured at list build; no stock check; equipped item sellable | One counter; reprice at purchase; stock as data; refuse equipped | ECO-T1, ECO-T3, ECO-T11 |
| Fallout 1 CE [R] ET007 | Dead branch (`<= -30` never true); empty NPC side accepted as a free gift | No dead test; require both sides non-empty | ECO-T5 |
| Fallout 2 CE [R] ET007 | Cost doubled by default; no upper clamp; companion trades skip the value check | Own base, stated; clamp both sides; every trade checks value | ECO-T5 |
| isometric-city [P] ET007 | Ledger is client state in localStorage; `addMoney` has no check; trade income dropped | Server ledger; no client mint path | ECO-T1 |
| angband [C] ET008 | Shop money vanishes or appears without a record; faucet switch is global | Shop is a ledger account with sink and source rows; switch is a zone flag | ECO-T4 |
| l2dn server [P] ET008 | Fee unit read 100 as a multiplier; per-unit vs per-lot unclear; buy destroys currency before the item add; registration returns after detaching the stack | bp fraction of lot total; one transaction; rollback restores the stack | ECO-T2, ECO-T6 |
| azerothcore [C] ET008 | no defect read in the digest (design remark only: the deposit formula is hard to explain) | Plain fraction of value x duration | ECO-T6 |
| Beyond All Reason [C] ET009 | Overflow pass credits with no debit; stale stock variable not refreshed | No overflow pass; re-read balance inside the transaction | ECO-T4 |
| SpacetimeDB [R] ET009 | No retry guard (double click pays twice); uncapped starter grant per identity | `requestId` dedupe; grant is a capped data field once per account | ECO-T16 |
| basic-computer-games [P] ET009 | No refusal when savings are short; Java fall-through into the sale | Refuse; table-driven route, no fall-through | ECO-T2 |
| crawl [C] ET010 | Voucher is a second counter; stale price skipped silently | Voucher is a ledger row; stale cart rejected with a message | ECO-T12, ECO-T17 |
| Daggerfall Unity [P] ET010 | Index and prices roll on the client; letters of credit and bank per region (second ledger) | Server seeded roll; one gold | ECO-T4, ECO-T12 |
| a restricted donor [C] ET011 | Two pools (storage then cash); silent stall | One ledger; stall shows shortfall | ECO-T9 |
| Endless Sky [C] ET011 | Oldest-bin buy / newest-bin sell loop: buy 390, sell 991 (cost 1000) | One price function by age; stock and player use the same function | ECO-T10 |
| Evennia [P] ET011 | Buy list build calls with wrong arity; sell path raises before paying; takings unrecorded | Typed interface test; sell is check-then-apply; takings are a sink row | ECO-T2 |
| Exult [C] ET012 | Count and drain use different predicates; zero-cost returns false; no transaction | One predicate; zero-cost craft is allowed and writes no row; one transaction | ECO-T7, ECO-T13 |
| flare-engine [C] ET012 | Global buy ratio applied twice (150 expected, 225 actual); price depends on whether the window is open | Apply each ratio once, price independent of UI | ECO-T3 |
| flare-game [C] ET012 | Band order changes the result; stock re-rolled on every entry | Order-independent rule; restock is a policy with a timer | ECO-T3 |
| freeciv [C] ET013 | Turn-flag gate does not fit real time | Gate is a period in ticks | ECO-T14 |
| freeorion [C] ET013 | Progress written before the gates; bank is a second pool | Gates first; no bank | ECO-T9 |
| hedgewars [C] ET014 | Cost cached from the last selection; paid at placement | Recompute at payment | ECO-T1 |
| gemrb [C] ET014 | Client credits gold even if the move fails; two prices in one engine | Pay on success; one quote function | ECO-T2 |
| fheroes2 [C] ET014 | `Trim` clamps a shortfall to zero silently; remainder lost on division | Fail the transaction; remainder goes to the sink row | ECO-T7, ECO-T4 |
| pokemonAutoChess [C] ET015 | Direct money writes; interest cap can go negative | `settle` only; `max(0, ...)` | ECO-T12 |
| l1j [C] ET015 | Tax skipped at a cap; town books use the template price | Clamp and report; books use the charged price | ECO-T4 |
| claudecraft [P] ET015 | (caution, not a defect) reason order is load-bearing | Pin the order in a test | ECO-T11 |
| lincity-ng [C] ET016 | Receiver not clamped to its maximum; no global check | Clamp; global conservation assertion | ECO-T7 |
| keeperrl [C] ET016 | Debt is not a hold; cheap items overtake; progress not refunded | Real hold; fairness flag; refund rule | ECO-T9 |
| OpenMW [C] ET016 | Cap only in the trade window; price computed on the client | Cap inside the function; server | ECO-T3, ECO-T5 |
| otclient [P] ET017 | Client and server fee differ in rate, rounding and cap | One shared module | ECO-T6 |
| forgottenserver [C] ET017 | Escrow implicit; charges and upgrades lost on the sell path; state/money order differs per path | Explicit escrow account; item instance travels whole; state before money everywhere | ECO-T7, ECO-T11 |
| L2Solo [P] ET017 | Learned multiplier only falls; floor in two places; cap depends on price | Recovery rule (ECO-N10); one constant; cap computed before price | ECO-T3 |
| server-survival [P] ET018 | Auto-repair heals without the upkeep flag | Heal and charge share one flag | ECO-T9 |
| rathena [C] ET018 | Refund lost when party is off the map; trusts the map's debit | Ledger refund by row; server is the only debit | ECO-T7, ECO-T8 |
| scummvm [C] ET018 | Abort leaves a phantom balance; commit trusts the client | Balance derived from ledger; total re-checked at commit | ECO-T2 |
| Showdown [P] ET019 | Bid is any chat line parsing as a number; balance in memory; unbid lot sold to nominator | Structured command; ledger; unbid lot returns to seller | ECO-T7 |
| Veloren [C] ET019 | Silent clamp with a log; stock counted twice | Refuse; surplus formula stated and tested | ECO-T3 |
| Widelands [C] ET019 | Trade guarded by an `assert`; (UNVERIFIED: whether the accept path checks who is accepting is in `cmd_trade_action.cc`, which the note did not read) | Validate at the entry point; every action checks both parties (this part is our rule, not a verified donor defect) | ECO-T5 |
| ACE [C] V002 | Real clear also empties offers; finalize skips a failed removal | Pick one rule and pin it; any failed removal aborts all | ECO-T5 |
| swgemu [C] V005 | Refund is the new price (overpay); offline leader gets no refund | Refund the recorded hold; refund by row | ECO-T7 |
| AAEmu [C] V008 | No balance check; start price never checked on bids; untaxed remainder | `settle` refuses; check start price; remainder is a named sink | ECO-T2, ECO-T4 |
| gawric Unity client [P] ET013 | Server sends no expiry in the invite packet; client and server clocks race | Expiry travels in the packet; the server clock is the only clock | ECO-T14 |
| TrinityCore [C] V010 | Accept kept after item-check failure; saves not one transaction (gold IS checked by the donor) | Every failed check unaccepts; one transaction | ECO-T5, ECO-T7 |

## 3. Composable parts (each switchable, each data-driven)

Every part has `enabled`. A switch off means the part's endpoints refuse with `feature_off` and no ledger row is written. All fields live in a catalogue block `economy` (row 20/21) and per-zone overrides (zones as data). Defaults below belong to the "Standard" preset (section 4). Field paths are nested and unified across all parts and presets: `price.*`, `restock.*`, `buyback.*`, `fees.*`, `trade.*`, `market.*`, `craft.*`, `faucet.*`, `guard.*`, `claim.*`, `wallet.*`, `quote.*`, `repair.*`, `vendor.*`, `index.*`, `eligibility.*`, `wager.*`. Parts ECO-P07 and ECO-P08 are SHELF DESIGNS, OFF in every preset and not scheduled (digest decisions: ACE no trade window yet; swgemu no market slot; Dom's standing word).

**ECO-P01 Ledger core (always on).** `settle(account, delta, reason, requestId)`. Fields: `maxAmount` 1000000000; `currency` "c"; `negativeBalance` false; `startGrantC` 216 (6 x W), `startGrantOncePerAccount` true; `claim.ttlS` 3600. Accounts: player wallets, `escrow:<listingId>`, `hold:<craftId>`, `claim:<claimId>` (item and coin claim rows, ECO-G9 and ECO-N12), `pool:<zoneId>` (public pool), `src:<reason>` (a named SOURCE account for the few reasons allowed to create supply, always counted in `minted`; for example `src:quote_subsidy`), `sink:<reason>` (a named burn account). Wallets, escrow, holds, claims, pools, sources and sinks are all accounts, so the sum of every account is the whole supply and `sum(all accounts, sinks included) == genesis + minted`.

**ECO-P02 Price function.** `price.buyBp` 12800, `price.sellBp` 6104, `price.sellCapBp` 8052, `price.stockMultMinBp` 8500, `price.stockMultMaxBp` 16000, `rounding` {buy: "up", sell: "down", fee: "up"}, `modifierOrder` ["zoneIdx","stock","tradeSkill","festival"] (buy side; the sell side uses only half-strength `zoneIdxSell`, see ECO-G3), a final explicit clamp `buy >= v`, `minPriceC` 1. One module `economy/price.ts` imported by the server and by the client preview.

**ECO-P03 Vendor stock.** Per vendor line: `{item, base, target, ceilMin, ceilMax, priceMode: "fixed"|"stock"}` (optional per-line override of the top-level `price.mode`). `stepBp` computed from target as in ECO-G5 unless overridden. Stock rolls and restock draws use the shared `weightedPick(table, seed)` (Strategy W5; same function as zone spawns and loot packs). Only the vendor sells into stock: player sales do not refill stock by default (`vendor.playerSalesRestock` false), as ModernUO does, so stock stays a designer number; true is allowed for the Open Market preset and adds an arbitrage path that ECO-T10 must include.

**ECO-P04 Restock.** `restock.mode` "lazy-one-step" | "timer" | "off"; `restock.delayS` 240; `restock.ceilUpNum/Den` 3/2; `restock.ceilDownNum/Den` 5/6; `restock.ceilDownWhenUnsoldBp` 6667.

**ECO-P05 Buy-back.** `buyback.slots` 6; `buyback.ttlS` 900; `buyback.priceMode` "paid" (price stored at sale, never recomputed).

**ECO-P06 Tax and fee sinks.** `fees.saleTaxBp` 650; `fees.depositBp` 76; `fees.depositBlockS` 28800; `fees.depositBlocksMax` 3; `fees.giftTaxBp` 900; `fees.giftFreeC` 1944; `fees.destination` "burn" | "zonePool"; `fees.roundUp` true. Sale tax and deposit apply only when `market.mode` is not "off". One module, imported by client for previews.

**ECO-P07 Player-to-player trade (SHELF DESIGN; off in every preset).** `trade.enabled` (default false), `trade.inviteTtlS` 24, `trade.acceptArmTicks` 15, `trade.maxItems` 8, `trade.maxC` 100000, `trade.rangeTiles` 6 (same zone cell), `trade.onChange` "clear-accepts" | "clear-all". Eligibility via ECO-P13.

**ECO-P08 Escrow listing and auction (SHELF DESIGN; off in every preset).** `market.mode` "off" (default) | "listing" | "auction" | "both"; `market.durationBlocks` 1..3; `market.minRaiseBp` 350, `market.minRaiseC` 2; `market.antiSnipe.extendToS` 66; `market.proxyBid` true; `market.buyNow` true; `market.maxActivePerAccount` 12 (= 24 slots / 2).

**ECO-P09 Craft payment.** `craft.payMode` "up-front" | "drip" | "on-complete"; `craft.fairness` "fifo" | "any-affordable"; `craft.cancelLossBp` 1368; `craft.rush.enabled`, `craft.rush.baseBp` 12800, `craft.rush.slopeBp` 9200, `craft.rush.periodTicks` 600; per recipe `minTicks`, `costC`, `inputs[]`. Drip only for crafts of 150 ticks or more (the OpenRA note warns a pause is a trap in a fast fight).

**ECO-P10 Faucet caps.** `faucet.windowS` 3600; `faucet.capC` 6221; `faucet.floorBp` 2000; `faucet.perSourceCapBp` 2857 (= 10000 / 3.5: one source, such as a spawn point or vendor, may supply at most 28.57 percent of the cap, so at least four sources are needed to reach it); `faucet.sameTargetTaper` {afterKills: 7, perKillBp: 800, floorBp: 3200, windowS: 600} (crawl-style step-down shape, our numbers: 7 = fights in 140 s, 800 bp loss per further kill, floor 3200 = 1.6 x the faucet floor 2000, the same 1.6 factor as the cap).

**ECO-P11 Inflation guard.** `guard.mode` "off" | "alert" | "auto"; `guard.targetRatio` 0.86; `guard.deadBand` [0.805, 0.915]; `guard.gain` 4000 (applied as `(targetRatio - r) x gain`, POSITIVE sign: low r raises `price.buyBp`); `guard.stepBpMax` 140; `guard.buyBpBounds` [11400, 14600]; `guard.faucetBpBounds` [8250, 10980] (a second lever on the zone wage; 8250 = 10000 - 12.5 days x 140 bp, 10980 = 10000 + 7 days x 140 bp). Reads ECO-P12 rows only.

**ECO-P12 Audit rows.** Row: `{seq, tick, requestId, account, delta, reasonCode, refType, refId, balanceAfter, pairSeq}`; every transfer writes two rows with `pairSeq`. Reason enum (closed, complete): `kill_loot`, `kill_record`, `xp_grant`, `loot_grant`, `quest`, `start_grant`, `quote_subsidy`, `admin_adjust`, `vendor_buy`, `vendor_sell`, `buyback`, `fee_deposit`, `tax_sale`, `tax_gift`, `gift_transfer`, `trade_swap`, `escrow_hold`, `escrow_release`, `craft_hold`, `craft_spend`, `craft_refund`, `rush`, `repair`, `decay_wallet`, `festival_pool_pay`, `wager_stake`, `wager_rake`, `wager_payout`, `claim_create`, `claim_pay`, `expire_return`, `seal`. Minting reasons (counted in `minted`): `kill_loot`, `quest`, `start_grant`, `quote_subsidy`, and `admin_adjust` when its delta is positive; `admin_adjust` with a negative delta is a burn. `seal` is a zero-delta marker row. v3 adds three reasons for the other value events Strategy puts in the ledger: `kill_record` (a zero-delta event row carrying the killId and the damage shares, like `seal`), `xp_grant` and `loot_grant`. `xp_grant` and `loot_grant` mint in their own asset classes (xp, item) and are conserved separately from coin; "one currency" (question Q6) still means one coin. Daily `SEAL` row stores totals and a checksum (ECO-N1). `requestId` dedupe window = 3 days.

**ECO-P13 Eligibility.** Claudecraft-style ordered refusals: `quest`, `bound`, `locked`, `equipped`, `fresh-vendor` (ECO-N7), `floor` (rarity below the catalogue floor), `unknown-kind` (closed default). Fields in the catalogue (row 21): `tradeFlags`, `rarity`, `stackMax`, `baseValueC`, `sinkClass`, `origin`.

**ECO-P14 Zone index.** `index.enabled`, `index.bounds` [7800, 16200], `index.pullBp` 1800, `index.noiseBp` 170, `index.sweepTicks` 90, `index.impactBpPerLot` 120, `index.recoverDen` 9.

**ECO-P15 Quote and price lock.** `quote.ttlTicks` 120 (0.6 x fightS); the server returns `quoteId` with price; a buy that carries a live quoteId pays the quoted price if the server price moved against the buyer inside the lock. The difference is paid by a NAMED SOURCE account `src:quote_subsidy` (reason `quote_subsidy`), which is MINTED supply and therefore counted in `minted` (a sink only receives and cannot pay out; v1 was wrong to say "the sink absorbs the difference"). The subsidy is bounded per quote by `quote.maxDriftBp` 600 and per account per day by `quote.dailySubsidyCapC` 120 (about 3 x W); it is dropped (lock off, honest re-quote) if that cap is hit. Alternative with no subsidy at all: no lock, the buyer just gets the re-quote and may cancel. An expired quote is re-quoted with a visible message.

**ECO-P16 Repair and upkeep.** `repair.bpOfBuyPerFullWear` 1100 (11 percent: about 9 full repairs equal one purchase), `repair.healRequiresFlag` true, `repair.walletReserve` true (ECO-N16).

**ECO-P17 Wallet soft cap and decay.** `wallet.softCapC` (null = off), `wallet.decayBpPerHour`; decay applies only to the part above the cap and is a sink row with reason `decay_wallet` into `sink:decay_wallet`. Used by ECO-E3 only.

## 4. Presets (4 plus an overlay)

A preset is one JSON overlay merged on the defaults; NO preset enables player trade or the market (they are OFF, Dom's standing word; shelf designs are marked below); switching a preset changes no code. All numbers are our own derived starting values, untested.

**ECO-E0 "Flat" (tutorial, early zone, and the safe fallback).** Fixed prices, no market, no index, no guard. Fields:
```
{ "price": {"mode":"fixed","buyBp":12800,"sellBp":6104},
  "vendor": {"stock":"unlimited"}, "restock": {"mode":"off"},
  "index": {"enabled":false}, "market": {"mode":"off"}, "trade": {"enabled":false},
  "fees": {"destination":"burn","giftTaxBp":0},
  "faucet": {"capC":9331}, "guard": {"mode":"off"},
  "buyback": {"slots":6,"ttlS":900} }
```
`faucet.capC` 9331 = 2.4 x H: a cap that rarely binds.

**ECO-E1 "Standard Zones" (default).** Stock-driven vendors, lazy restock, zone index, buy-back, repair, no player market, NO player trade (both are optional parts pending Dom's approval).
```
{ "price": {"mode":"stock"}, "restock": {"mode":"lazy-one-step","delayS":240},
  "index": {"enabled":true,"pullBp":1800,"noiseBp":170},
  "trade": {"enabled":false},
  "market": {"mode":"off"}, "fees": {"giftTaxBp":900},
  "faucet": {"capC":6221}, "guard": {"mode":"alert"}, "repair": {"bpOfBuyPerFullWear":1100} }
```

**ECO-E2 "Open Market" (SHELF DESIGN: trade and market are OFF, so this is a paper preset only and is not scheduled).** ECO-E1 plus the two-accept trade window, escrow listings and auctions with proxy bids; player sales refill vendor stock (adds an arbitrage path, listed in ECO-T10); tax goes to the zone pool.
```
{ "trade": {"enabled":true,"inviteTtlS":24,"acceptArmTicks":15},
  "market": {"mode":"both","durationBlocks":3,"minRaiseBp":350,"antiSnipe":{"extendToS":66},"proxyBid":true},
  "fees": {"saleTaxBp":650,"depositBp":76,"destination":"zonePool"},
  "vendor": {"playerSalesRestock":true},
  "guard": {"mode":"auto","stepBpMax":140} }
```
The pool-funded events (ECO-N5) need `fees.destination` "zonePool".

**ECO-E3 "Iron" (hardcore sinks).** Steeper repair, a wallet soft cap with decay, a lower faucet cap, craft cancellation costs more. For a season or an optional world.
```
{ "repair": {"bpOfBuyPerFullWear":1600}, "faucet": {"capC":4666,"floorBp":1500},
  "wallet": {"softCapC":38880,"decayBpPerHour":10},
  "craft": {"cancelLossBp":1824,"rush":{"enabled":false}},
  "fees": {"giftTaxBp":1500}, "guard": {"mode":"auto"} }
```
`softCapC` 38880 = 20 x S; `decayBpPerHour` 10 is part ECO-P17: it applies only to the part above the cap, with reason `decay_wallet` into `sink:decay_wallet`. `cancelLossBp` 1824 = 8 x the maximum deposit (8 x 228; ECO-E1 uses 6 x). ECO-E3 inherits market off, so it sets no sale tax (v1 set `saleTaxBp` 900, which would have done nothing).

**ECO-E4 "Festival" overlay (time-boxed; needs a funded zone pool).** Shop discounts funded by the zone pool; the discount is a real price below base (ECO-G15 test), paid from the pool (reason `festival_pool_pay`), so supply is conserved. PRECONDITION: the pool only receives anything when `fees.destination = "zonePool"`; under ECO-E0, ECO-E1 and ECO-E3 (destination "burn") the pool is empty and the festival cannot run, so the overlay carries that setting itself. Its natural host is ECO-E2 (market tax feeds the pool); on ECO-E1 the pool is thin (only gift tax), so expect rare, small festivals.
```
{ "fees": {"destination":"zonePool"},
  "festival": {"discountBp":880,"fundedBy":"pool:zone","capC":"pool balance","startsAtTick":null,"endsAtTick":null} }
```
`discountBp` 880 = 650 + 228 (the sale tax plus the maximum deposit: a festival hands back about one trade's fees). Why `buy >= v` still holds: it is NOT because the discount is small. At the bounds (idx 7800, stock 8500, discount 880) the natural buy multiplier is 1.28 x 0.78 x 0.85 x 0.912 = 0.774, below par, so the explicit final clamp `buy >= v` (ECO-P02) is what keeps it; ECO-T3 includes this corner case. (Consequence: at a low index the festival has no visible effect on that line.)

## 5. Novel ideas (20)

Each says what it combines and how it stays within the rulings.

- **ECO-N1 Daily SEAL row.** At the server day boundary write one row per account class with `sum(wallets)`, `sum(escrow)`, `sum(holds)`, `sum(pools)`, `sum(sinks)`, `minted`, and a checksum chaining the previous seal. A seal that fails `sum(all accounts, sinks included) == genesis + minted` halts the market and raises an alert. (OpenRCT2 rolling table, SpacetimeDB pair rows.)
- **ECO-N2 Price-lock quote.** Quote id with a 12 s lock (ECO-P15), any subsidy paid from the named source `src:quote_subsidy` and counted in `minted`; stale quote gets a fresh quote message, never a silent skip (crawl) and never an old price (Arena).
- **ECO-N3 Dry-run endpoints.** Every economy action has a `dry: true` form that runs the same code, collects the would-be rows, and rolls back. The UI uses it for the "you pay / you get / tax" panel, tests use it as an oracle. (otclient mirrored formula, scummvm balance preview.)
- **ECO-N4 Pool-funded bounties.** A timed bounty or escort pays from `pool:<zone>` using the time-decay curve (OpenTTD shape: flat window, slope, tail); the pool, not a mint, funds it, and a bounty cannot exceed the pool balance. Needed only once timed content exists. Our curve: full for `graceS` = 40 (2 x fightS), then linear to 40 percent at 6 x fightS, then 4000 / (1 + (t - 6 x fightS) / 60) bp tail, never below 600 bp.
- **ECO-N5 Zone treasury and festivals.** Taxes accumulate in `pool:<zone>`; when the pool passes `festival.trigger` = 8 x H the zone runs a discount week funded only by what is in the pool (needs `fees.destination = "zonePool"`, see ECO-E4). A closed loop that returns sink coin to players without minting. (l1j public pool, BAR burn accounting.)
- **ECO-N6 Row 18 value budget.** Loot tables and wage are both derived from one catalogue field `valueBudgetC` per tier, so `E[coin per fight]` equals W by construction; a CI lint computes the expectation over the loot table and fails if it differs from W by more than 3 percent. (afritz1 class gold table, flare-game band table.)
- **ECO-N7 Origin flag on item instances.** `origin` in {drop, craft, vendor, quest}. A vendor-bought item resells at `eligibility.freshVendorBp` = 7812 (10000 / 1.28 = 1 / g, one more spread step) of the usual sell price for its first 3 sales, so shop-to-NPC loops cannot print money; a drop sells at the usual rate. Fixes OpenDAoC's untracked origin. The number: a fresh vendor item resells at 6104 x 0.7812 = 4768 bp of value, so the loop loses another 21.9 percent.
- **ECO-N8 Wear-based resale.** Sell value scales with remaining durability: `sell = base x sellBp x (4000 + 6000 x dur/durMax) / 10000`. One function for vendors and for NPC-appraised player listings. (Endless Sky decay, OpenRA refund by condition.)
- **ECO-N9 Duel wager escrow (not in the Pit).** Two-accept swap (ECO-G8) of equal stakes, held in escrow, 4 percent rake `wager.rakeBp` 400 (reason `wager_rake`) to a sink; stake and payout use `wager_stake` and `wager_payout`; it needs the two-accept swap (ECO-G8), so it is also shelf-only (trade is OFF); the winner is named by the existing server result. Switchable, off in ECO-E0; the Pit stays out (row 22 frozen).
- **ECO-N10 Recovery for any learned multiplier.** L2Solo's one-way ratchet gets a reverse: each unsold expiry moves the item's `listMultBp` down 300; each sale at or above ask moves it up 450 (up faster than down so shortages recover) inside 6500..11000.
- **ECO-N11 Lazy everything, no sweep.** No timers per object. Restock, index, buy-back expiry, claim expiry and (shelf) offer expiry all settle on read with one step, with the deadline as the effective time; a claim or listing past its deadline settles the next time its owner or its zone is observed (Strategy W7: one style, do not mix with sweeps). (ModernUO lazy catch-up.)
- **ECO-N12 Claim rows for all overflow.** A bag-full receive, an outbid refund of an item, or an expired listing becomes a claim row owned by the receiver; the UI shows "waiting for you (3)". (LostCity floor, forgottenserver history, AAEmu mail.)
- **ECO-N13 Proportional rationing at one tick.** The server collects buys on a line inside a window of 3 ticks (`rationWindowTicks`) and, if the sum exceeds stock, gives each the same fraction rounded down, remainder to the earliest by sequence number. (Veloren rationing.)
- **ECO-N14 Static zone-data conservation lint.** For each zone's data, compute declared faucets (wage x cap, loot value budgets) and declared sinks (vendor spread x expected visits, repair, tax) and fail CI if `sink/faucet` is outside [0.55, 1.1] for the zone's preset. A design-time check on "zones as data". (isometric-city monthly formula; OpenRCT2 table.)
- **ECO-N15 Hold-to-confirm and undo.** Phone-first: purchases over 25 percent of the wallet need a 0.6 s hold; vendor sells have the buy-back as undo (ECO-G4); if player trade is approved, trades show the tax-inclusive total and arm the accept button (ECO-P07). (Showdown compensating undo, Shattered buy-back.)
- **ECO-N16 Reserve floor.** Spendable = wallet - reserve, where reserve covers outstanding craft holds and the repair cost of the equipped set at 1 wear. A player cannot spend into a state where gear cannot be repaired. (Showdown reserve floor, keeperrl real hold.)
- **ECO-N17 Same-target taper with a visible meter.** The faucet taper (ECO-P10) shows a small meter "this spawn is tired" so the player moves on instead of grinding; also counters bots. (crawl step-down, Barony status meter.)
- **ECO-N18 Replayable economy.** Ledger rows plus the seeded index rolls rebuild every balance from genesis; a replay test (row 19 sibling) rebuilds from rows and compares with the live state. (SpacetimeDB audit pair, Daggerfall index.)
- **ECO-N19 Credit notes as ledger rows.** A voucher or compensation is an account entry with an expiry reason code, never a second counter. (crawl voucher defect.)
- **ECO-N20 Per-source faucet attribution.** `perSourceCapBp` (ECO-P10) lets Dom see which spawn or quest feeds the most coin, and the guard throttle that source's wage before the whole zone. (OpenRCT2 typed buckets.)

## 6. Gaps in parity rows 1-23 (labelled: supported / conditional / inferred)

The real checklist was read by the checker (`.../scratch-2026-10-09-51f654/engine-parity-checklist.md`, 22 rows; the names below match). Rows: 1 duel step/sim; 2 AI; 3 guard/parry/roll/stamina/stance; 4 fight loop; 5 controls; 6 hero actor; 7 creature actor; 8 blood; 9 finishers; 10 hit impact; 11 camera; 12 sound; 13 specials; 14 HUD; 15 gear dressing (visual); 16 colour grade; 17 death/respawn ("by design, open-world respawn"); 18 loot roll and XP (owned by the post-K server-tick work); 19 fight record/replay (partial, post-K); 20 catalogue as runtime source; 21 catalogue fields; 22 Pit-only ("by design"). **Row 23 (zone population) is not in the checklist file but exists per Strategy (partly live).** No row covers a wallet, a shop, a price or a sink.

Labels: **supported** = a digest gap or decision backs it; **conditional** = contradicts a current digest decision unless Dom approves; **inferred** = my own idea, no digest statement.

Rows Lead should add (proposed):
ECO-R1. **Wallet and ledger** (balance, `settle`, reason enum, request ids, audit rows). SUPPORTED (one-ledger gap on about 20 donors).
ECO-R2. **Vendor and price function** (buy, sell, spread, cap, stock, restock, buy-back). SUPPORTED (EQEmu, OpenMW, Barony and others).
ECO-R3. **Sinks and fees** (tax, deposit, repair, rush, decay), each with a reason code. SUPPORTED (l2dn, otclient, AAEmu, forgottenserver).
ECO-R4. **Faucet budget and inflation guard** (cap, taper, daily controller, SEAL). INFERRED (the digest has faucet caps, but freeciv says inflation control must come from elsewhere; the guard is my own idea).
ECO-R5. **Player trade** (two-accept, version, escrow, invite, claim rows). SHELF (OFF, not scheduled): Dom's standing word; ACE digest decision is "do not build a player trade window yet".
ECO-R6. **Market and auction** (listings, proxy bid, refunds). SHELF (OFF, not scheduled): swgemu digest verdict is "reject, no market slot".
ECO-R7. **Craft payment** (hold, drip, cancel, rush). SUPPORTED (freeciv, a restricted donor, keeperrl, freeorion).
ECO-R8. **Item instance state through trade** (durability, upgrade level, origin, bound/locked); row 15 gear dressing is visual only. SUPPORTED (forgottenserver loses charges and upgrades).
ECO-R9. **Row 18 extension:** loot roll credits coin through `settle` with reason `kill_loot`, and the loot table's expected coin equals wage W (ECO-N6). SUPPORTED (OpenTESArena: loot must credit the one counter). Row 18 belongs to the post-K server-tick work.
ECO-R10. **New row, death cost** (not an extension: row 17 is "by design"): repair and drop rule use `settle` and the repair sink. INFERRED.
ECO-R11. **Row 19 extension:** replay of ledger rows and seeded index rolls (ECO-N18). INFERRED (row 19 is partial and post-K).
ECO-R12. **Rows 20/21 field additions:** `baseValueC`, `stackMax`, `tradeFlags`, `rarity`, `origin`, `sinkClass`, `valueBudgetC`, vendor lines, per-zone `economy` overlay; reject price 0 at load. SUPPORTED (OpenXcom, EQEmu, OpenDAoC).
ECO-R13. **Row 14 HUD:** wallet, tax-inclusive total, quote lock countdown, taper meter (phone width 375). INFERRED.
ECO-R14. **Row 5 controls:** hold-to-confirm and (if trade is approved) the accept-arming delay. INFERRED.
ECO-R15. **Row 22 Pit test:** a test that no economy hook (stake, wager, rake) is reachable from Pit code. INFERRED guard rail. **Exception:** row 18 plans to move Pit loot to server rewards in the post-K server-tick work; if those rewards ever credit coin they pass through `settle`, so the test reads "no economy hook is reachable from Pit code, except the row 18 server reward path once the Pit moves to server rewards".
ECO-R16. **Row 23 sibling:** the zone `economy` block (index, vendor ids, faucet cap, preset) next to the population block. INFERRED; row 23 itself is from the zones brief, not the checklist.
ECO-R17. **Stamina is not currency:** the action costs of specials (OpenBOR gate-then-pay) are stamina, which belongs under **row 3** (guard/parry/roll/stamina/stance) with specials in row 13; make explicit that `settle` is not used for stamina (one pool per cost; refuse instead of falling through). SUPPORTED by the OpenBOR gap; filed under row 3, not rows 4/13.

Summary: supported ECO-R1, ECO-R2, ECO-R3, ECO-R7, ECO-R8, ECO-R9, ECO-R12 (and ECO-R17); shelf ECO-R5, ECO-R6; inferred ECO-R4, ECO-R10, ECO-R11, ECO-R13 to ECO-R16.

## 7. Experiment plan (headless server tests, nothing run)

All tests run against the server module with no client and no browser, a fake clock, a seeded RNG, and an in-memory ledger store with a fault-injection hook. Heavy runs (the fuzz, the 60-day simulation) go to the VPS per Dom's standing rule; the unit tests are cheap enough for the Mac.

**Unit and property tests**

| Id | Test | Pass condition |
|---|---|---|
| ECO-T1 | Client-trust: send a buy with a lying price, lying item fields, a lying client balance | Charged price comes from the stored line; balance unchanged on refuse |
| ECO-T2 | Check-then-apply: full bag, short funds, qty 5 on a non-stackable, stale line, price 0 line | Refusal reason is correct; state hash (all accounts, items, stock) before == after |
| ECO-T3 | Price function property grid over all items x modifiers (index bounds, stock bounds, discount 0..1800, festival at 880) | `buy >= v`, `sell <= min(floor(0.8052 v), buy-1)`, sell >= 1, applying each ratio once; calc spots (stacks defined in ECO-G3): v = 4375, idx 11600, stock 13000, disc 880 -> buy 7702 (4375 x 1.28 x 1.16 x 1.3 x 0.912 = 7701.66 rounded up), sell 2884 (idxSell 10800: 4375 x 0.6104 x 1.08 = 2884.14 rounded down; the cap 3522 and buy - 1 do not bind); clamp corner: idx 7800, stock 8500, disc 880 -> natural 0.774 v, clamped to buy = v |
| ECO-T4 | Sink accounting | Every fee, tax, remainder and rounding difference lands in a named sink row; sum of all accounts (sinks, claims, sources included) == genesis + minted |
| ECO-T5 | Trade rules: change clears accepts; empty side refused; wrong party refused; failed removal aborts | No item or coin moved on any refusal |
| ECO-T6 | Boundary fuzz at 2^31/20, 2^31-1, 2^31, 2^32, 2^53, `maxAmount` | Fee equals big-integer oracle; no wrap |
| ECO-T7 | Fault injection INSIDE the transaction through the store's hook: throw after each step of every transaction (buy, sell, swap, bid, outbid, settle, craft cancel) | After the throw, state == before (rollback) and the conservation assertion holds |
| ECO-T8 | Expiry: listing, claim, buy-back, invite on a fake clock; offline party | Expiry writes an `EXPIRED` or `expire_return` row; item and coin are not lost |
| ECO-T9 | Craft: drip, stall, cancel at several ticks, fifo versus any-affordable, rush | `paid + refund + sink + unpaid == cost` at every tick; no negative balance |
| ECO-T10 | Arbitrage search: buy-sell, sell-buyback, craft-sell, vendor-origin resale, wear resale, player-sales-restock (ECO-E2 only), quote subsidy farming, bots exhaustive up to 3 steps | No sequence of 3 operations yields a net gain at equal state |
| ECO-T11 | Eligibility order and unknown-kind default | Each reason fires in the pinned order |
| ECO-T12 | Static lint: no balance write outside `settle` | Exception list empty |
| ECO-T13 | Catalogue load: price 0, negative, over `maxAmount`, missing field | Load refuses with the field name |
| ECO-T14 | Time-decay bounty and rush period gate on server ticks | Server ticks only |
| ECO-T15 | Discount truth: a 1 percent sale on a 100 c item, a bundle at 900 vs parts 1000 | Sale hidden after rounding; bundle strike only when cheaper |
| ECO-T16 | Idempotency: same `requestId` twice, then 10,000 retries interleaved | One effect only |
| ECO-T17 | Stale quote; and quote lock subsidy | Fresh quote message; no silent skip; subsidy rows come from `src:quote_subsidy` and appear in `minted` |
| ECO-T18 | Damage shares at death (Strategy W3) | Three attackers deal 50, 30, 20; kill resolves once | One `kill_record` row with three shares; XP and loot eligibility sum to exactly 100 percent; no second kill row on replay |
| ECO-T19 | One weighted pick for stock (Strategy W5) | Same seed and same vendor row twice; `none_weight` over 10,000 draws | Identical stock rolls; empty outcome at the stated rate |

**Conservation-of-currency fuzz (ECO-FUZZ, the headline test).** Original sketch, rewritten after the checker; seeds and counts are starting values.

```
// fuzz-conservation.ts  (proposal, not written)
// Accounts counted in the totals: wallets, escrow, holds, CLAIM rows, pools, sources, sinks.
// "stateHash" covers the ledger accounts and item ownership ONLY. It excludes the requestId
// dedupe table and lazy catch-up state (restock/index/expiry sweeps), because a refused
// request may legitimately record its outcome or trigger an idempotent catch-up.
for (seed of seeds(200)) {
  const w = makeWorld({seed, accounts: 50, zones: 4, preset: pick(presets), clock: fake()})
  const genesis = totalAllAccounts(w)      // wallets+escrow+holds+claims+pools+sources+sinks
  for (step = 0; step < 20000; step++) {
    const op = pickWeighted(w.rng, OPS)    // buy, sell, buyback, [trade ops and market ops only in presets that enable them],
                                           // craft queue/cancel/rush, repair, gift, wager (if enabled), kill_loot,
                                           // admin_adjust (+ and -), advance clock, restart server
    const before = stateHash(w)
    w.store.armFault(w.rng, 0.02)          // the fault fires INSIDE the transaction via the store hook,
                                           // at a random write; the store rolls back on throw
    const r = tryOp(w, op)                 // may be hostile: bad ids, huge amounts, wrong party
    if (r.refused || r.faulted) assertEq(stateHash(w), before)   // r.faulted is set by the hook, not guessed
    // minted is computed INDEPENDENTLY of the system under test, from the audit rows:
    const minted = sumDeltas(w.audit, reason in MINT_REASONS)    // kill_loot, quest, start_grant, quote_subsidy, admin_adjust>0
    const burned = sumDeltas(w.audit, reason is admin_adjust with delta<0)
    assert(noOtherReasonHasNetPositiveDelta(w.audit))            // a bug minting under another reason is caught here
    assertEq(totalAllAccounts(w), genesis + minted - burned)     // conservation, every step
    assert(allBalances(w).every(b => b >= 0n))
    assert(everyItemUnitOwnedOnce(w))      // items and claim rows: conserved, no duplicates
    assertRowsExplain(w)                   // every balance change has a row pair
  }
  assertReplayEquals(w)                    // rebuild from rows + seed == live state (ECO-N18)
}
```
Asset classes (v3): the fuzz runs the conservation assertion once per asset class (coin, xp, item); `kill_record` rows are zero-delta; the ledger holds NO zone snapshots, transit, social or moderation records (those are separate stores with their own tests).

Variants: (a) concurrency: run two interleaved op streams over the same line and account (transaction ordering; matters most for double-click and restart cases); (b) differential: an independent bigint oracle re-implements `price` and `fee` and is compared on random inputs; (c) mutation test: seed deliberate bugs (skip a refund row, wrap a fee, clamp silently, mint under a non-faucet reason, fault after commit) and require the fuzz to fail within N steps.

**Simulation experiments (VPS, bots)**

| Id | Experiment | Output for Dom |
|---|---|---|
| ECO-X1 | 60 simulated days, 200 bots with three play styles (grinder, trader, flipper), presets ECO-E0..ECO-E3 | sink/faucet ratio by day, Gini of wealth, median item price index, time to afford first gear piece |
| ECO-X2 | Guard response: inject a 40 percent faucet shock on day 20 (r falls to about 0.86 / 1.4 = 0.61, the controller output is +140 bp per day: prices RISE until r returns to the band 0.805..0.915; the test fails if `buyBp` ever falls during the shock) | days to return into the dead band; maximum markup move per day (<= 140 bp); sign of every daily move |
| ECO-X3 | Exploit hunt: 20 hostile bots search the 3-step arbitrage space with real latency and parallel requests | zero profitable loops |
| ECO-X4 | Market load: 5,000 listings, 200 bidders, proxy bids | transaction p99, refund exactness |
| ECO-X5 | Phone checks (outside this brainstorm): hold-to-confirm, accept arming, quote lock countdown at 375 wide | screenshots for Dom |

## 8. Constant collision check (corrected)

Method: v1 compared against the donor numbers in the digest excerpts; the checker then grepped every constant over all 61 deep notes and read each hit. About 95 percent of hits were source line numbers. **Statement (replaces v1's "no coincidence with any donor number", which was not strictly true): no donor constant is reused with the same meaning. Round-number coincidences exist; the checker listed them, I replaced the ones it named with differently derived values (table below), and I list the ones left.**

| v1 value | Donor coincidence (checker) | v2 value and derivation |
|---|---|---|
| `cancelLossBp` 1667 | fheroes2 rate table 1667/3334 | 1368 = 6 x 3 blocks x 76 bp (6 x the maximum market deposit); ECO-E3 1824 = 8 x 228 |
| rush slope 12000 | rathena auction fee 12000 zeny/hour | base 12800 (= `price.buyBp`), slope 9200 (22000 - 12800: a from-scratch rush costs 2.2x) |
| `sellCapBp` 7000 | BAR tax 0.3 | 8052 = (6104 + 10000) / 2 |
| `freshVendorBp` 7000 | BAR tax 0.3 | 7812 = 10000 / 1.28 |
| `perSourceCapBp` 3000, taper floor 3000 | BAR tax 0.3 | 2857 = 10000 / 3.5; floor 3200 = 1.6 x 2000 |
| guard low band 0.80 | Veloren 0.8 smoothing | band 0.805..0.915 (0.86 +- 0.055) |
| `stockMultMin` 8000 | Veloren 0.8 | 8500 (12 surplus units x 125 bp) |
| `faucetBpBounds` low 8000 | Veloren 0.8 | 8250 (12.5 days x 140 bp); high 10980 (7 days x 140) |
| `ceilDownWhenUnsoldBp` 7500 | OpenMW 75 percent cap | 6667 (two units in three) |
| ECO-E3 `cancelLossBp` 2500 | OpenRA 2500, fheroes2 2500 | 1824 |
| festival `discountBp` 1200 | DOLSharp buyer pays 1200 | 880 = 650 + 228 |

New values (8052, 7812, 2857, 3200, 8500, 8250, 10980, 6667, 1368, 1824, 9200, 880, 805, 915) were grepped over all 61 deep notes: the only hits are source line numbers (for example OpenEnroth 913-915, lincity-ng 805-806, config.js:880), not values.

Left as accepted coincidences (checker judged each a different quantity, permissive donor, or an arithmetic coincidence): ECO-N15 "25 percent of wallet" (CDDA weight); `sweepTicks` 90 (AAEmu 90 percent share); guard gain 4000, ECO-N4 tail 4000 and the `stepBp` example 250 (Daggerfall index bounds 250..4000, permissive); `minRaiseBp` 350 (swgemu worked price 350, Barony +350 tier). Not donor constants: 2^31, 2^32, 2^53 (integer limits). Other values with no collision: W/S/H 36/1944/3888, `buyBp` 12800, `sellBp` 6104, buy-back 6 slots / 900 s, `saleTaxBp` 650, `depositBp` 76 (azerothcore 12/24/48 h tiers and AAEmu 1/2/3/4 percent differ), `giftTaxBp` 900, `extendToS` 66, `inviteTtlS` 24, `restock.delayS` 240, `faucet.capC` 6221, index 7800..16200 / 1800 / 170, repair 1100, start grant 216, quote 120 ticks / 600 bp, guard step 140.
Disclosure: round-number coincidences cannot be fully excluded for any small integer; the check covers the 61 notes only.

## 9. Questions for Dom (at most 6)

ECO-Q1. Trade and market stay OFF (your standing word; Strategy confirms). Please confirm again when the first shop arrives. Parts ECO-P07 and ECO-P08 stay on the shelf and proposed rows ECO-R5 and ECO-R6 are not scheduled.
ECO-Q2. Where should taxes go: burned, or into a zone treasury that pays for festival discounts (ECO-N5, needs `fees.destination = "zonePool"`)?
ECO-Q3. Should a wallet cap with slow decay exist in the default experience, or only in the Iron season (ECO-E3)?
ECO-Q4. Should the inflation guard adjust vendor prices by itself (auto) or only alert a human (alert)?
ECO-Q5. Are duel wagers outside the Pit wanted (ECO-N9), given the Pit stays frozen? (They also need the trade window.)
ECO-Q6. Is one currency a firm rule, including for any future paid currency, or may a second typed asset sit in the same ledger?

*End of brainstorm v2. Nothing is built; every number is a proposal awaiting measurement.*
