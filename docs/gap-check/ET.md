# Gap check ET (economy and trade: money flows, sinks, one ledger, markets, vendors)
Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 517b32248 (read-only). Donor notes: 57 (ET001 to ET019; ET010 cuteshaun-lineage2-api has only a verdict file, no deep note). Player-to-player trade mechanics are in TR.md and are not repeated here.

## Summary for Dom
1. What exists: one bound currency (metals, bronze as the unit) is fully designed (docs/specs/origins/trading.md section 3) and drafted as SQL (supabase/migrations/202610070007_origins_metal.sql: balance table plus append-only ledger, conservation checked at commit, no transfer reason). Items already have the same shape (origins_item_ledger). Faucets exist as pure rules (Bounty metal with daily cap, loot-table currency) and sinks exist as pure rules (clan switch, notoriety pay-off, arrest fine, smith coin column set to 0).
2. What is missing: nothing is connected. The metal migration is a draft, not applied, and no server handler credits or debits metal. There is no NPC vendor (the only service kind is `upgrade`), no town treasury counter, and no faucet/sink report.
3. Counts by donor note: REUSE 9, ADD 18, SKIP 30. The 18 ADDs collapse to three builds: G1 metal wiring (faucet, typed sink reasons, cap rule), G2 NPC vendor (price, stock, restock, buy/sell-back), G3 zone tax into a town counter.
4. Top 3 additions: (a) G2 NPC vendor as a second service kind: server recomputes price, checks room before charge, one batch for item and metal, sell-back never above Dom's 25 percent; (b) G1 wire the faucets and sinks through the one metal op, with a named reason per flow so Stats can total them, and a defined rule for a balance at its cap; (c) G3 a per-zone tax that credits a town counter in the same transaction as the purchase.
5. Licence note: most donors here are GPL, LGPL, BSL, CC-BY-SA, Valve SDK or Fallout CE's Sustainable Use licence, so clean-room, shape only. MIT, BSD, Apache and Unlicense donors are marked P in the table. This file carries no donor numbers; every price, rate and cap must come from trading.md and Stats.

## What we have today (shared by all rows)
- Currency design: one integer balance in bronze, silver and gold display only, never tradeable, no player-to-player transfer (docs/specs/origins/trading.md:18-21, section 3.2 at :291, option B recommended at :307). Cap `MAX_COIN` 1,000,000,000 (origins/contracts/economy.ts:311).
- Metal ledger SQL: origins_metal and origins_metal_ledger, reasons limited to award, spend, refund (0007:14, :21), conservation trigger (0007:29, :37-38), the `metal` op inside origins_apply with expected_version (0007:107-121). Header says DRAFT, NOT FOR APPLY (0007:3). Nothing in origins/server calls it (grep of origins/server for metal finds only comments in upgrade.ts and errors.ts).
- Item ledger and conservation: origins_item_ledger (0001:136), origins_conserved (0001:259). Idempotency by event id: origins_events (0001:66, pk = already paid).
- Faucets as pure rules: Bounty pays fixed metal under a per-UTC-day cap (origins/encounters/encounters.ts:211-216; amounts and caps at origins/region1/content.ts:276-286); loot table currency range rolled from a seed (encounters.ts:236, :255). The returned `Payout.metal` (encounters.ts:171) is not credited anywhere yet.
- Sinks as pure rules: smith coin column, 0 means materials only (economy.ts:328; balance check at :485; server refuses coin > 0 with 501, origins/server/upgrade.ts:26, :54, :102); clan-to-clan switch 2,000 bronze (origins/patrons/patrons.ts:217); notoriety pay-off per point (origins/feuds/feuds.ts:45, :193); arrest fine (feuds.ts:397). Treasuries and the other flows are tabled in docs/specs/origins/living-world.md section 9 (:447-464) as town counters on the metal ledger.
- Vendors: NPC roles exist as data (smith, healer, fence at origins/region1/content.ts:127-131, listed as town services at :251-253). The `SERVICE_KINDS` list is `['upgrade']` only (economy.ts:278), with a comment that a merchant buy/sell adds a kind (economy.ts:274-275). Dom ruled NPC shops sell base gear for metal and sell-back pays at most 25 percent with a daily cap whose number is OPEN (trading.md:322-323, :718).
- Anti-RMT and caps: trade caps and gates as config rows (0005:107-112), idle and hard expiry (0003:24, 0005:54). Auction house is NOT NOW (GAME_SPEC.md:181).

## Gap table (Lic: P = permissive, C = copyleft/restricted, shape only)
| Donor note | Idea in 8 words | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| ET001 Shattered PD (C) | Sell at base, buy-back list, no round-trip profit | Sell-back cap 25% ruled (trading.md:323); no vendor | No buy-back list | ADD (G2) | new origins/server/vendor.ts |
| ET001 0ad (C) | Each trade moves price; slow timer restores it | None | Optional price motion on buys | ADD (G2, optional knob) | G2 |
| ET001 2004Scape (P) | Price from own stock; per-row timed refill | None; no stock concept | Stock line and refill | ADD (G2) | G2; stock rows as town-service data (content.ts:251) |
| ET002 Cataclysm (C) | Price from skill gap; one signed balance | No barter stat; one balance is 0007:14 | Skill factor has nothing to hang on | SKIP (stat price chain; one balance already REUSEd) | n/a |
| ET002 openbor (P) | Pay from one pool, never kill the caster | Fight stamina is its own system | Not economy; no shop in donor | SKIP | n/a |
| ET002 Dawn of Light (C) | Market fee as a named sink; seller pool | Market is NOT NOW (GAME_SPEC.md:181) | Second pool would break one ledger | SKIP | n/a |
| ET003 EQEmu (C) | Server finds line, recomputes price, one wallet | upgrade.ts derives everything, body names no amount (upgrade.ts:1-12 comment) | Vendor handler; room check before charge | ADD (G2) | G2, pattern of origins/server/upgrade.ts |
| ET003 LostCityRS (P) | One server swap, conserved, one ledger row | settleTrade is all-or-nothing (economy.ts:212); TR.md | Floor overflow not wanted | REUSE | n/a |
| ET003 ModernUO (C) | Stock ceiling follows demand; one lazy restock step | None | Lazy catch-up on shop open | ADD (G2) | G2 |
| ET004 OpenDAoC (C) | Price from shop list; check then apply | Same server-derives pattern (upgrade.ts) | Debit and grant in one batch, not grant then debit | ADD (G2) | G2; origins_apply batch (0007:107) |
| ET004 OpenEnroth (C) | Buy at least value, sell at most value | Sell-back cap only (trading.md:323) | Buy floor rule; skip merchant skill | ADD (G2, clamps only) | G2 |
| ET004 OpenRA (C) | Take-or-fail debit, no partial change | bronze check 0..max aborts overdraft (0007:14); performUpgrade balance check (economy.ts:485) | none for debit | REUSE | n/a |
| ET005 OpenRCT2 (C) | One settle function, typed reason, recheck at execute | One `metal` op, reasons award/spend/refund only (0007:21, :107) | No reason per flow (smith, shop, switch, fine); Stats cannot total sinks | ADD (G1) | extend 0007 reason set or event-id convention |
| ET005 OpenTTD (C) | Delivery pay decays with time | Bounty is flat metal (content.ts:276) | Timed rewards not asked for | SKIP (no timed delivery product) | n/a |
| ET005 OpenXcom (C) | Cart check at add, one write at commit | Metal op takes expected_version (0007:116-120) | Re-check at commit; clamp quantity | ADD (G2) | G2 |
| ET006 Barony (P) | Buy floor and sell cap around catalogue value | None | Floors only; modifier stack no | ADD (G2, clamps) | G2 |
| ET006 Valve SDK (C) | Show a discount only if truly lower | Cash shop ruled narrow (trading.md:500-512) | No sales or bundles exist | SKIP (revisit if cash shop sales start) | n/a |
| ET006 OpenTESArena (P) | Loot gold by place class; resale at fixed rate | Loot table currency range (encounters.ts:236, :255); resale cap 25% ruled | Our cap is stricter than the donor | REUSE (loot range); donor resale rate SKIP | n/a |
| ET007 Fallout 1 CE (C) | Barter price from skill, clamp, face value coin | No barter skill | Needs a stat | SKIP | n/a |
| ET007 Fallout 2 CE (C) | Skill ratio price with offset | Same | Same | SKIP | n/a |
| ET007 isometric-city (P) | Monthly tax and budget settle in one step | Rent and tolls are in living-world (:447-464) | Calendar settlement belongs there | SKIP (here) | n/a |
| ET008 Angband (C) | One pure price function, server recomputes | None | Same as EQEmu; per-unit purse cap not wanted | ADD (G2) | G2 |
| ET008 L2Dn (P) | Listing fee up front, never refunded | No market (trading.md:42-60 barter board has no prices) | Market out of scope | SKIP | n/a |
| ET008 AzerothCore (C) | Auction escrow, deposit, cut | Auction NOT NOW (GAME_SPEC.md:181) | Out of scope | SKIP | n/a |
| ET009 Beyond All Reason (C) | Transfer taxed, difference burned | No transfer reason (0007:21); metal never moves (trading.md:21) | Transfers ruled out | SKIP | n/a |
| ET009 SpacetimeDB (C) | Zero-sum check-all then write, two audit rows | Ledger plus balance with conservation (0007:29-38) | Starting grant not wanted (earned only) | REUSE | n/a |
| ET009 BASIC games (P) | Market as zone data with price bands | Zones are data; no travel trading | No product for it | SKIP | n/a |
| ET010 crawl (C) | Value times per-vendor markup, whole cart check | None | Markup per town as data | ADD (G2) | G2; markup beside prosperity (content.ts:251) |
| ET010 cuteshaun-lineage2-api (P) | Data parsing only, no price formula | n/a | thin note | SKIP | n/a |
| ET010 Daggerfall Unity (P) | Skill and charisma mix; daily region price drift | None | No skill; drift is a later knob | SKIP (keep drift as a later G2 knob) | n/a |
| ET011 CnC Remastered (C) | Pay a build in instalments, refund the paid part | Crafting is out (trading.md R4, :33) | No crafting | SKIP | n/a |
| ET011 Endless Sky (C) | Resale value decays with age | Fixed 25% cap (trading.md:323); no durability on items | Not needed | SKIP | n/a |
| ET011 evennia (P) | Buy markup, buy-back rate, refuse zero value | None | Two-rate model; zero-value refusal | ADD (G2) | G2 |
| ET012 exult (C) | Count first, refuse short, drain in order | performUpgrade spends materials all or nothing, repeated id refused (economy.ts:488-490 comment) | none | REUSE | n/a |
| ET012 flare-engine (C) | Three price ratios; fresh-sale buy-back flag | None | Buy-back and room before settle | ADD (G2) | G2 |
| ET012 flare-game (C) | Stock rolled from band table per visit | Shops sell fixed base gear (trading.md:322) | Rolled stock is a gear faucet | SKIP | n/a |
| ET013 freeciv (C) | Rush-buy price per missing unit | No build queues | None | SKIP | n/a |
| ET013 FreeOrion (C) | Per-tick spend cap per craft | Crafting out | None | SKIP | n/a |
| ET013 gawric L2J client (P) | Invite expires on server clock | Idle expiry 5 min and hard expiry (trading.md:118-122; 0003:24; 0005:54) | Client countdown only | REUSE | n/a |
| ET014 GemRB (C) | One quote function for display and settlement | None | Same function for client preview and server | ADD (G2) | G2; pure function shared like economy.ts |
| ET014 Hedgewars (C) | Energy pool earned by producers | No such mode | None | SKIP | n/a |
| ET014 fheroes2 (C) | Barter rates by building tier | Single currency; no exchange of resources | None | SKIP | n/a |
| ET015 PokemonAutoChess (C) | One gold field; sold copies return to pool | One balance (0007:14); item conservation (0001:259) | none | REUSE | n/a |
| ET015 l1j-en-classic (C) | Price plus tax, tax credited in same transaction | Treasuries are town counters (living-world.md:447-449); none built | No town counter table (origins_metal is per auth.users account, 0007:13) | ADD (G3) | new migration; credit in the vendor batch |
| ET015 levy-street (P) | One eligibility rule, fixed order, closed default | tradeBlock fixed order, one reason per copy (economy.ts:71-77, :97-112) | Unknown category not refused by default (could not verify category enum) | REUSE | economy.ts tradeBlock |
| ET016 lincity-ng (C) | Stock flows between linked shops | None | Not asked for | SKIP | n/a |
| ET016 KeeperRL (C) | Craft cost as debt, refund before progress | Crafting out | None | SKIP | n/a |
| ET016 OpenMW (C) | One barter offer from skills; 75% cap | No barter skill; fixed cap | None | SKIP | n/a |
| ET017 otclient (P) | One fee function for server and preview | No market | Fee not needed | SKIP (shared-function rule goes to G2) | n/a |
| ET017 forgottenserver (C) | Market escrow lifecycle, fee never returned | No market | Out of scope | SKIP | n/a |
| ET017 L2Solo (P) | Seller listing gate, NPC sink at half price | No market; bots are a test harness only (trading.md R3) | Out of scope | SKIP | n/a |
| ET018 server-survival (P) | One booking function; sale reverses purchase | `refund` reason exists (0007:21), one op (0007:107) | none | REUSE | n/a |
| ET018 rathena (C) | Auction bid escrow, outbid refund | Auction NOT NOW | Out of scope | SKIP | n/a |
| ET018 ScummVM (C) | Pending cart; commit as one transaction | None | Cart is UI; server commit is G2 | ADD (G2, client preview only) | G2 |
| ET019 Showdown (P) | Timed sealed-price auction lot | Auction NOT NOW | Out of scope | SKIP | n/a |
| ET019 Veloren (C) | Price rises as stock falls, eases back | None | Stock-based curve | ADD (G2) | G2 |
| ET019 Widelands (C) | Standing trade, launch and finish both sides | Barter only, settle once (TR.md) | Standing trade not wanted | SKIP | n/a |

Counts: REUSE 9, ADD 18, SKIP 30 (total 57).

## Merged additions (one build each)
- **G1 Metal wiring.** Notes: OpenRCT2, with REUSE rows pshenok, SpacetimeDB, OpenRA, PokemonAutoChess that confirm the shape. Build: apply 0007 when Strategy and Lead say GO, then add one writer path that credits Bounty and loot metal inside the same batch and event id as the kill (encounters.ts:211-216, :255). Rules: every flow has a named reason so faucet and sink totals are one query (living-world.md:464); spends re-check the balance inside the batch, never from the client; refunds reverse the original line; no transfer reason; and decide what happens at the cap (the `bronze` check at 0007:14 aborts the whole batch, which would also lose a same-batch item mint, so name the outcome: clamp and tell, or refuse). Lands: new origins/server/metal.ts beside upgrade.ts, plus a migration revision to 0007 if the reason list grows.
- **G2 NPC vendor.** Notes: Shattered PD, 0ad (optional), 2004Scape, EQEmu, ModernUO, OpenDAoC, OpenEnroth, OpenXcom, Barony, Angband, crawl, evennia, flare-engine, GemRB, ScummVM, Veloren. Rules to carry: add `vendor` to SERVICE_KINDS (economy.ts:278); client sends item and count only, server recomputes; one pure quote function shared by preview and settle; buy never below base, sell-back never above the ruled 25 percent so buy-and-sell-back is never a faucet; per-town markup and stock rows as zone data on the town service row; stock refill is lazy on shop open, one step however long it sat; room check before charge; item grant and metal debit in one origins_apply batch with one event id (retry pays once); shop gear keeps provenance `shop` and consumables stay bound (economy.ts:75-76); buy-back list holds the account's own sold pieces at the price paid; daily sell-back cap number is still Stats' (trading.md:323). Lands: new origins/server/vendor.ts (modelled on upgrade.ts) and a pure quote module beside origins/contracts/economy.ts.
- **G3 Zone tax into a town counter.** Note: l1j-en-classic. Rules: the buyer pays price plus the town's tax in one debit; the tax is credited to a town counter in the same batch; a counter is never a player balance and never pays out to a player (living-world.md:74); rate is zone data with server-side bounds. Gap found: origins_metal keys on an auth.users account (0007:13), so a town counter needs its own table and reasons. Lands: new migration after 0007; depends on G1 and G2.

## Could not verify
- That the SQL in 0007 and the `metal` op is sound beyond the lines opened; I read it, not ran it. It is a draft and is not applied.
- Whether `ItemDefinition.category` is a closed enum (so whether levy-street's closed default is already true); only tradeBlock's own lines were read.
- living-world.md sections 7.1 and 7.3 (rent, statues) were not opened; their sink amounts are quoted only through the section 9 table.
- Whether a faucet/sink report query exists in scripts/ (not searched); the Stats lane may own it.
- Donor licence strings come from the notes, not re-checked in the donor repos. ET010 cuteshaun has no deep note (verdict file only).
