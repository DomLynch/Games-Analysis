# keldaanCommunity-pokemonAutoChess (economy-trade, cell 1)

Donor: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/shop.ts` | Licence: GPL-3.0 (repo `LICENSE`, GNU GPL v3, read) | TypeScript | symbol `getSellPrice`, `getBuyPrice`, `computeIncome`

Checked: Read in full: `getSellPrice` (shop.ts 94-163), `getBuyPrice` (165-186), `releasePokemon` (293-320), `assignShop` (337-377), `getRandomPokemonFromPool` (546-606). Read the callers: `OnBuyPokemonCommand` (game-commands.ts 159-214), `OnSellPokemonCommand` (956-1005, partial to the sell core), `OnShopRerollCommand` (1034-1057), `OnLevelUpCommand` (1081-1097), `computeIncome` (1417-1450), called from `stopFightingPhase` (1896, call at 1930). Also `Player.addMoney` (player.ts 294-308), `utils/number.ts`, `config/game/shop.ts`, `config/game/pools.ts`, `experience-manager.ts` 50-53. Confidence: high on the buy, sell, reroll and round-income arithmetic (read end to end). Not read: the streak computation, `EvolutionManager.tryEvolve`, `canSell`, the `totalMoneyEarned` line after 2076, `pickup.ts` money theft, the rest of the town minigame. Camera scope: not applicable.

Best transferable idea: One gold value per player that every buy, sell, reroll and round award goes through, sold copies return to a finite pool, and interest and streak income use plain min() caps.
Decision (proposed): adapt — Frankendom needs one ledger and server-verified buys, and this shows the arithmetic and pool conservation, but the shop-round cadence and the per-rarity star price table do not fit fast duels or zones as data; take the shape, not the table.
Acceptance: a server test where a player with 23 gold and streak 7 gets 12 at round end (interest 2 + streak 5 + flat 5), a bot gets 0, and selling a 3-star unit returns 9 copies to the pool, all through the one ledger function.

## 1. Mechanism

- One gold value per player: `player.money` (uint16 schema field, starts at 5 outside dev mode, player.ts 117). Money moves through the buy, sell, reroll and level-up commands and through round income. Buy, reroll and level-up check the balance on the server before they debit; sell and income only credit. Other direct writes exist (section 6).
- Faucet, round income: `computeIncome` runs once per round from `stopFightingPhase`, after `stageLevel += 1` (game-commands.ts 1930). For each living human player (bots get nothing, 1420): interest = `min(maxInterest, floor(money / 10))` unless the Blood Money rule is on (1432-1436); `maxInterest = 5 + gimmighoul coins - amulet coins`. Streak bonus `min(5, streak)` only when the round is not PvE (1440). Flat 5 (1442). 5 per Red Scale item (1443). Credited with `addMoney(income, true)` (1444), which counts it as total money earned.
- Sinks: buy costs `RarityCost[rarity]` (1 common ... 20 legendary, shop.ts 20-30). Buy needs `money >= cost` and bench space or an evolution (game-commands 183-187), then debits (190). Reroll costs 1 unless a free roll is held (1038-1044). Level-up costs 4 gold and gives 4 XP (experience-manager.ts 51; game-commands 1091-1094).
- Sell refund (`getSellPrice`): a duo unit is `ceil(cost x stars / 2)` (checked before the 1-star case, 150-151). A 1-star unit is the rarity cost (155). A 2-star or 3-star unit is `ceil(cost x 3^(stars-1) x 0.75)` (157-158), so a common pays 1, 3 and 7. Free-market rule: 0 (101-102, 169). During the fight phase a unit that is not on the bench cannot be sold (game-commands 970).
- Supply, the copy pool: each rarity has a finite pool of copies per maximum star level (`PoolSize`, pools.ts 4-14; common `[1, 18, 27]`). A shop draw removes one copy (`pool.splice(index, 1)`, shop.ts 601). A sell returns 1, 3 or 9 copies by stars, halved with `ceil` for a duo (296-301, `releasePokemon`). A reroll or a full refresh first releases the six current picks back to the pool (`assignShop`, 338), then draws six new ones.
- Order for a sell (server): alive check; unit on the player's board; not blocked by the fight phase; `releasePokemon` returns the copies to the pool; `getSellPrice` gives the refund; `addMoney(sellPrice, false)`; items on the unit go to the player's item list (game-commands 963-985).
- Order for a buy (server): slot is filled and not the default; cost from `getBuyPrice`; affordability and bench space checked (187); money debited (190); unit placed on the bench; slot cleared (or the Unown shop is reassigned).

## 2. Key functions

- `getSellPrice`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/shop.ts` 94-163. Rarity and star table; duo first; 3x per star and 0.75 rounding up.
- `getBuyPrice`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/shop.ts` 165-186. The rarity cost, with the free-market rule.
- `releasePokemon`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/shop.ts` 293-320. Copies back to the regional or global pool by stars.
- `getRandomPokemonFromPool`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/shop.ts` 546-606. Filters the pool, picks one, and removes that copy (601).
- `OnBuyPokemonCommand.execute`, `OnSellPokemonCommand.execute`, `OnShopRerollCommand.execute`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 159-214, 956-1005, 1034-1057. The three money paths.
- `computeIncome`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/rooms/commands/game-commands.ts` 1417-1450. The round income formula.
- `Player.addMoney`: `/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/models/colyseus-models/player.ts` 294-308. The credit path. Ghost-opponent gains are dropped (299-300). It also triggers money-based evolution for each board unit (304-307).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Interest is `floor(gold / 10)`, capped | Divisor 10 and cap 5 (theirs, game-commands 1432 and 1435); cap moves with two item counts |
| Streak bonus is capped | Cap 5 (theirs, game-commands 1440; `max` is `Math.min`, utils/number.ts 8) |
| Flat round income plus per-item add-on | Flat 5 (theirs, 1442); 5 per Red Scale (1443) |
| Buy and reroll debit only after the balance check | Costs from the rarity table (theirs, shop.ts 20-30); reroll 1 (theirs, 1038); level-up 4 (theirs, experience-manager.ts 51) |
| Sell refund grows by a fixed factor per star, rounded up | Factor 3 per star and 0.75 (theirs, shop.ts 158) |
| Copies return to a pool on sell and are drawn out on shop | Copies 1 / 3 / 9 by stars (theirs, shop.ts 296); pool sizes (theirs, pools.ts 5) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for sell (duo test first, then 1-star, then the star factor), income (interest cap, streak cap, flat, add-on), buy (balance and bench check, then debit), reroll (free-roll test, then debit) and pool moves (sell returns copies; a draw removes one). It omits the Pokemon-specific sell exceptions (egg, ditto, Eevee, uniques, legendaries, hatch, rare candy, Mothim), the free-market rule, regional pools and alt forms, the evolution trigger inside `addMoney`, the ghost-opponent gate, the Unown shop, and the reroll's release-then-redraw loop (the sketch only checks the cost). The bench check is passed in as a boolean.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Stars = 1 | 2 | 3;

export interface UnitPrice {
  rarityCost: number;   // base price per rarity tier (data)
  stars: Stars;
  duo: boolean;         // paired unit: half price, half pool return
}

// Sell refund. Donor order: duo test first, then 1-star base, then x3 per star up, x0.75, rounded up.
export function sellRefund(u: UnitPrice): number {
  if (u.duo) return Math.ceil((u.rarityCost * u.stars) / 2);
  if (u.stars === 1) return u.rarityCost;
  return Math.ceil(u.rarityCost * Math.pow(3, u.stars - 1) * 0.75);
}

// Copies returned to the shop pool on sell: 1 / 3 / 9 by stars; a duo returns ceil(half).
export function poolReturn(stars: Stars, duo: boolean): number {
  const n = stars >= 3 ? 9 : stars === 2 ? 3 : 1;
  return duo ? Math.ceil(n / 2) : n;
}

export interface RoundIncomeInput {
  gold: number;
  streak: number;
  isPve: boolean;
  alive: boolean;
  isBot: boolean;
  bloodMoney: boolean;   // rule that switches interest off
  gimmighoulCoins: number;
  amuletCoins: number;
  redScales: number;
}

// Round income at the end of a fight. Interest is gold/10 floored, capped at maxInterest.
// The donor's max(x)(v) is Math.min(x, v), so the caps are real caps.
export function roundIncome(i: RoundIncomeInput): number {
  if (!i.alive || i.isBot) return 0;
  const maxInterest = 5 + i.gimmighoulCoins - i.amuletCoins;
  let income = 0;
  if (!i.bloodMoney) income += Math.min(maxInterest, Math.floor(i.gold / 10));
  if (!i.isPve) income += Math.min(5, i.streak);
  income += 5;
  income += i.redScales * 5;
  return income;
}

// Ledger: one gold number per player. Every debit or credit goes through these methods.
export class Ledger {
  gold: number;
  readonly pool: Map<string, number> = new Map();

  constructor(startGold: number) {
    this.gold = startGold;
  }

  // A shop draw takes one copy out of the pool.
  drawFromPool(unit: string): void {
    this.pool.set(unit, (this.pool.get(unit) ?? 0) - 1);
  }

  // Buy: affordability and bench space are checked, then gold is debited. The pool was already drawn.
  tryBuy(cost: number, hasBenchSpace: boolean): boolean {
    if (this.gold < cost || !hasBenchSpace) return false;
    this.gold -= cost;
    return true;
  }

  // Sell: the unit leaves the board, copies go back to the pool, gold is credited.
  sell(unit: string, u: UnitPrice): number {
    this.pool.set(unit, (this.pool.get(unit) ?? 0) + poolReturn(u.stars, u.duo));
    const refund = sellRefund(u);
    this.gold += refund;
    return refund;
  }

  // Reroll: cost 1, or free while free rolls remain. The shop's picks go back to the pool first.
  tryReroll(freeRolls: number): boolean {
    const cost = freeRolls > 0 ? 0 : 1;
    if (this.gold < cost) return false;
    this.gold -= cost;
    return true;
  }
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ET015-pac-economy-ledger.ts) exits 0.

## 5. Lands in

- TARGET `origins/server/economy.ts` (new, the one ledger: every gold change goes through it). Parity-checklist row 18 (loot roll and XP award), sub-line: round-end award and sell refund. This is the closest row, not a clean fit: row 18 covers awards, and the shop copy pool has no row of its own (row 23 is zone spawn caps, not shop supply). Row 21 (catalogue fields) would take the price table and pool sizes as catalogue fields.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: one ledger (economy); server-verified purchases (the buy, sell and reroll checks run on the server, game-room.ts 382, 500, 526 dispatch them).

## 6. Gaps and risks

- One ledger is not enforced by the donor. Money changes in five commands through `addMoney` or directly, and also outside them: town item sales write `player.money += ItemSellPricesAtTown[item]` directly (game-commands 2076), which skips `addMoney`'s evolution trigger and ghost-opponent check. The scribble payout also writes money directly (scribbles.ts 95), and sets it to 1 for a shiny egg (85). Frankendom must route every credit and debit through one function, and test that none writes the field directly.
- Interest cap can go negative. `maxInterest = 5 + gimmighoul - amulet` (1432). With enough amulet coins the cap is below 0, so `Math.min(maxInterest, ...)` is negative and the round would charge gold. Whether the uint8 schema field wraps or clamps this was not tested. Frankendom must clamp at 0 and test it.
- The round award is computed once, at the end of a fight, in one server call (1896-1930). Frankendom's fast duels have no shop round, so only the award shape transfers. The per-round cadence does not.
- Pool supply is a real conservation rule (copies leave on draw and return on sell or release), but it only holds if every path that drops a unit calls release. Not checked here: `canSell` and the other drop paths (for example, a unit that dies or is removed by an item).
- Sell refund grows to 9 times the base for a 3-star unit (`3^2 x 0.75`, shop.ts 158). Whether a merged unit can pay out more than it cost is a design question for Frankendom's economy; this was not measured.
- Money-based evolution runs inside `addMoney` (player.ts 304-307) for every credit, so a credit can trigger a board change. Frankendom should keep evolution out of the ledger and call it from the caller.
- The donor is GPL-3.0. Clean-room, shape only.
