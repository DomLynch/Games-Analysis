# Economy presets, one page for Dom

**Nothing is built.** No code, no data file, no test and no server change exists. This is a design proposal from the 61 donor-game notes. Every number is a starting guess and needs measuring. Full detail: `economy-brainstorm-v2.md`.

## The idea in one paragraph
One ledger holds all the money. Every coin that moves goes through one door that writes a reason, so nothing can appear or vanish. The server sets every price; the phone only shows a preview. Each shop feature is a switch that can be on or off, and each zone picks a preset in its own data. The Pit stays frozen.

## The presets

**Flat (tutorial, first zone, safe fallback).** Fixed prices, an unlimited shop, nothing to haggle over. You earn, you buy, you sell back at a fixed loss (selling returns about 60 percent of a thing's value). It feels calm and predictable, like a plain shop in a first level. No price drift, no market, no trading, no inflation controller.

**Standard Zones (the proposed default).** Each shop's prices rise when it runs low and ease when it is full. Each zone has its own slowly drifting price level, so a trip between zones can feel different. Shops restock only when you next open them. You can buy back something you sold by mistake at exactly what you got. Repair costs are a steady coin sink. The inflation controller only warns a human. It feels like a living world, but you only deal with shops. No player trade, no market.

**Open Market (only if you approve player trade and a market).** Standard plus a trade window between two players, listings and auctions with automatic bidding, and a small tax that goes to the zone. It feels like a real economy where players set prices. This one exists only on paper until you say yes (see question 1).

**Iron (hardcore season or optional world).** Steeper repair costs, a lower earning cap, crafts that cost more to cancel, and a pile of coins above a limit that slowly shrinks. It feels tight and punishing: every coin counts and hoarding does not pay. Meant for a season, not the base game.

**Festival (a short event you add on top).** A zone's collected taxes pay for a temporary shop discount. It feels like a town celebration. It only works where taxes go to the zone treasury, so it needs that setting (the Open Market preset suits it best; with Standard the treasury is small).

## The six questions
1. Do you want player-to-player trade and a player market or auction, or shops only for now? (Earlier decisions said not yet. Both stay off unless you say yes.)
2. Should taxes be burned, or go to a zone treasury that pays for festivals?
3. Should the slowly shrinking coin pile (wallet cap) be in the normal game, or only in the Iron season?
4. Should the inflation controller change shop prices by itself, or only alert a person?
5. Do you want duel wagers outside the Pit? (They would need the trade window.)
6. Is one currency a firm rule, even for a future paid currency, or could a second kind of money live in the same ledger?

## Status
Proposal only. The checker's corrections are applied in v2; nothing has been run except a few arithmetic checks.
