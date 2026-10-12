# Gap check TR (trading, barter, shops, economy sinks)

Date 2026-10-12. Frankendom repo commit read: 8d6ae33a9 (read-only). Donor notes: TR001 (EQEmu, ModernUO, TrinityCore), TR002 (ACEmulator-ACE, Open-RSC-Core-Framework, rathena), TR003 (swgemu-Core3, AAEmu). All eight say "adapt". No donor numbers copied; all eight are rewrite-from-idea, clean-room.

## Summary for Dom
- 12 rows: 7 REUSE, 2 ADD, 3 SKIP.
- Player trade is already built as pure rules (origins/contracts/economy.ts) plus SQL settle migrations. Every donor trade idea is already in it: both accept, reset on change, version-bound accept, all-or-nothing settle, capacity check, no-trade flags.
- ADD 1 (TR001, TR002, TR003): the server trade wiring. There is no origins/server/trade.ts and no trade handler in origins/server/handlers.ts. It is designed in docs/specs/origins/trading.md but not wired.
- ADD 2 (TR002 Open-RSC, TR001 Trinity): NPC vendor buy/sell with stock-sensitive price and whole-interval restock. Only the 'upgrade' service exists today (economy.ts:278). Low priority; trading.md already fixes sell-back at most 25%.
- Only two real additions. Coins in a trade, auctions and a charisma price modifier are SKIP: the owner ruled no currency in player trades, auctions are out of scope.

## Table

| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| TR001 ModernUO | Two accepts, edit clears both, one settle | `changeOffer` clears both accepts and bumps version (economy.ts:169-195); `settleTrade` refuses if either side has not accepted, nothing moved on any failure (economy.ts:212-272) | none | REUSE changeOffer / acceptTrade / settleTrade | n/a |
| TR001 EQEmu | Cancel whole trade on lore, no-drop, capacity | `tradeBlock` refuses bound, story-critical, stackable, cash-shop (economy.ts:71-77); one-of-each check `checkOneOfEach` after the move (economy.ts:~268); pack-full refusal (economy.ts:~240) | none (EQEmu per-item partial settle is rejected by our all-or-nothing) | REUSE settleTrade checks | n/a |
| TR001 TrinityCore | Accept names the offer version it saw | `acceptTrade(trade, character, expectedVersion)` returns version-conflict on a stale accept (economy.ts:199-201); trade has `version` field (economy.ts:123) | none | REUSE acceptTrade | n/a |
| TR002 ACEmulator-ACE | Lock on change, capacity check before moving | same as above; pack space checked per recipient in `settleTrade` before commit (economy.ts:~238-245), escrow state is `trade-escrow` location (items.ts:134) | "failed delivery returns to owner": settle is one transaction (supabase migration 202610060003_origins_trade_settle.sql); its rollback internals not read | REUSE settleTrade + migration 0003 | n/a |
| TR002 rathena | Two locks, one commit, range gate | accept flags + reset (above); range gate is the region rule: `trade.region !== CONCORD_EXCHANGE` refused (economy.ts:217), `inTradeArea` zone test (origins/presence/zones.ts:55) | none | REUSE | n/a |
| TR003 swgemu-Core3 | Mutual confirm, edits clear, one trade group id | trade id is carried on each moved piece as a `trade` history entry (economy.ts:~263, items.ts:156); one settle per trade | donor "within 15 units" is replaced by the Exchange zone, which is stricter | REUSE | n/a |
| TR003 AAEmu | Lock then ok; bind-on-pickup refused at add | `changeOffer` refuses untradeable pieces when the offer is written (economy.ts:~180-192, `cooldownIssue` economy.ts:105-112); per-item cooldown escalation (economy.ts:83) goes beyond the donor | none | REUSE | n/a |
| TR001/TR002/TR003 server wiring (ModernUO, EQEmu, Trinity, ACE, rathena, swgemu, AAEmu) | Server module that confirms and settles trades | Pure rules and SQL exist (economy.ts; migrations 202610060003, 202610070003 open_lock, 202610070005 limits, 202610070008 reversal); trading.md section 3 lists the ops (open / change_offer / accept / settle). origins/server/handlers.ts has no trade op | No server entry point calls the pure rules; proposed `origins/server/trade.ts` does not exist | ADD (groups TR001, TR002, TR003; one build, all seven trade notes merge here) | `origins/server/trade.ts` (new, proposed path is sensible: sits beside `handlers.ts`, `consume.ts`, `upgrade.ts`); route registered in `origins/server/handlers.ts` / `server.ts` |
| TR002 Open-RSC (+ TR001 Trinity vendor stock) | Vendor price moves with stock; restock ticks | No NPC buy/sell at all: services are `['upgrade']` only (economy.ts:278); sell-back cap 25% and shop-gear rules are written down (trading.md:323, items.ts:141-143); no stock or restock concept | Merchant service kind, per-vendor base stock, price modifier with floor and clamp, restock tick advancing whole intervals only, price never rounds to 0 | ADD (groups TR002 Open-RSC, TR001 Trinity; merged, one feature) | `origins/contracts/economy.ts` (new service kind, as its comment at :275-276 says), server side `origins/server/vendors.ts` (new, proposed path absent); needs the metals ledger first (upgrade.ts:26 `COIN_NOT_BUILT`) |
| ModernUO, EQEmu, rathena, swgemu, AAEmu (coin legs) | Coin or zeny offered inside a trade | None, by ruling: "No currency changes hands in a player trade" (trading.md:18); barter only | Negative / above-balance / clamp checks have nothing to guard | SKIP: owner ruling 2026-10-07, no currency in player trades | n/a |
| TR001 TrinityCore (auction) | Auction deposit and cut | Nothing | Not wanted | SKIP: auction house is out of scope (GAME_SPEC.md:181); priced market refused (trading.md:47, :58) | n/a |
| TR001 EQEmu (vendor CHA price) | Charisma modifies vendor buy and sell price | Nothing | No charisma stat; sell-back is a fixed cap | SKIP: no stat to hang it on; fixed 25% cap already ruled (trading.md:323) | n/a |

## Could not verify
- Exact line numbers marked "~" in economy.ts are approximate (read once, not each re-counted).
- Internals of the four SQL migrations (rollback behaviour on a failed delivery) were not read.
- Whether trading.md section 3 op list is complete was read from grep hits only.
