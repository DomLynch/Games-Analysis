# alexbatalov-fallout1-ce (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` | Licence: Sustainable Use License 1.0 (LICENSE.md line 1; line 15 allows use only for internal business or non-commercial/personal use, free distribution only) | C++ | symbol `barter_compute_value`, `barter_attempt_transaction`

Checked: Symbols read in full: `barter_compute_value` (inventry.cc 4236-4257), `barter_attempt_transaction` (4260-4277), `reaction_to_level` (reaction.cc 47-56), `reaction_get` (reaction.cc 71-167, whole function). Read in part: `barter_inventory` loop (inventry.cc 4563-4680: script modifier, reaction switch, M and T keys; the rest of the key handling not read), `item_total_cost` (item.cc 701-729, critter branch after 729 not read), `item_cost` (item.cc 652-698). Not read: `item_caps_total` (item.cc 2594), `item_move_all`, the drawing code. Callers: `barter_compute_value` has two call sites in src/game (inventry.cc 4270 in the accept check and 4545 for the on-screen price; grep over src/game); `barter_inventory` has one caller, gdialog.cc 1305 (grep over src/). Confidence: high on the price formula and the accept rule; medium on reaction_get because the cache reset path was not read. Hint file in the list was INFERRED; the real code is inventry.cc, found by grep on "barter".

## 1. Mechanism

- A barter offer is two tables: the player's offer (`ptable`, the `a3` side) and the NPC's goods (`btable`, the `a4` side). The NPC table is what the player takes; the player table is what the player gives (gdialog.cc 1305 passes `peon_table_obj` and `barterer_table_obj`; inventry.cc 4593-4594 store them as `btable` and `ptable`).
- Price: `barter_compute_value(buyer, seller)` starts a modifier at 100 (inventry.cc 4238). If the buyer is the player and the player has the Master Trader perk, add 25 (4240-4242). Then add the buyer's barter skill, subtract the seller's barter skill, and add the script modifier `barter_mod` (4246-4248). Clamp the modifier to 10..300 (4250). Then price = `100 * (cost - caps) / mod + caps` (4252-4256). Currency (caps) is taken out before the modifier and added back at face value; items are scaled by 100/mod.
- NPC mood feeds `barter_mod`: `barter_inventory` reads the reaction (4619-4620) and sets `modifier` to -25 for BAD, 0 for NEUTRAL, +50 for GOOD (4622-4629). Each pass of the input loop sets `barter_mod = a5 + modifier` (4652), where `a5` is the script base set at 4565.
- Reaction level from score: `reaction_to_level` gives GOOD above 75, NEUTRAL above 25, else BAD (reaction.cc 49-55). `reaction_get` builds the score: start at 50 (90), add 5 per point of Charisma minus 25 (98), add 10 per level of the Presence perk (104), reputation and Cult of Personality terms (108-126), childkiller reputation minus 30 (132-137), then bad-monster +20 (140-145) and good-monster -20 (148-153) terms, then the level is set (160) and returned (166). Setting the level also writes it into the script's local 1 (`reaction_to_level_internal`, 160). Caching: the first call sets the NPC's script local 2 to 1 (92), and later calls return the stored score (82-86). Whether that cache is ever cleared was not read.
- Accept: `barter_attempt_transaction` refuses if the player's offer is empty (4262-4264) or queued (4266-4268). It refuses if the price is above the total cost of the player's offer (4270-4272). Otherwise it moves all NPC goods to the player (4274) and the player's offer to the NPC (4275). It is all-or-nothing and runs when the player presses M (inventry.cc 4659-4662).
- Leave: the T key moves both tables back to their owners (4654-4656). The same branch also tests `modifier <= -30`, which is never true because the switch only yields -25, 0 or +50 (see section 6).
- Tick: not a loop of its own. `barter_inventory` runs an input loop with an FPS limiter (`sharedFpsLimiter.mark()` in the loop); the price is recomputed on each redraw of the trade table (4545). Not a tick-driven economy.

## 2. Key functions

- `barter_compute_value`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 4236-4257. The price formula with skill, perk, script and clamp terms, and caps excluded from the modifier.
- `barter_attempt_transaction`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 4260-4277. The accept check and the two-way move.
- `barter_inventory`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/inventry.cc` 4563-4680 (partly read). Sets the modifier from NPC mood and runs the M and T keys.
- `reaction_get` and `reaction_to_level`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/reaction.cc` 71-167 and 47-56. Mood score and its three levels.
- `item_total_cost` and `item_cost`: `/mnt/frankendom-donors/alexbatalov-fallout1-ce/src/game/item.cc` 701-729 (partly read; the critter branch after 729 not read) and 652-698. Cost is the catalogue cost times quantity; containers and critters add their contents (partly read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Price = base x 100 / modifier, with currency split out at face value | 100 (face value); currency exempt (caps) |
| Modifier = 100 + buyer skill - seller skill + rule terms | Skill enters one-for-one (theirs, 4248) |
| Modifier clamp | 10 and 300 (theirs, 4250) |
| Perk bonus on the buyer side only | +25 Master Trader (theirs, 4242) |
| Mood as a three-level price nudge | -25 BAD, 0 NEUTRAL, +50 GOOD (theirs, 4623-4629) |
| Mood score -> level | Thresholds 25 and 75 (theirs, reaction.cc 49, 51) |
| Mood score terms | Base 50; 5 per Charisma point, minus 25; 10 per Presence level; childkiller -30; monster terms +/-20 (theirs, reaction.cc 90, 98, 104, 137, 145, 153) |
| Accept: offer total must cover the price; all-or-nothing | No constant (the comparison at 4270) |

## 4. TypeScript sketch

simplified: keeps the donor order (perk, skill terms, script and reaction nudge, clamp 10..300, currency split, integer division, then the accept check with the empty and locked refusals). It omits the reaction score (`reaction_get`: the level is an input), the reputation and monster terms, the perk check on the NPC side, the item moves, the M and T keys, the on-screen price, and the donor's `item_total_cost` details (ammo, containers, worn items). It also does not reproduce the donor's allowance for an empty NPC side (see section 6).

```ts
// Licence: Sustainable Use License 1.0 (donor, alexbatalov-fallout1-ce). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// 0 bad, 1 neutral, 2 good (donor enum NPC_REACTION_BAD / NEUTRAL / GOOD).
type ReactionLevel = 0 | 1 | 2;

// Added to the price modifier by the NPC's mood (donor values -25 / 0 / +50).
const REACTION_MOD: Record<ReactionLevel, number> = { 0: -25, 1: 0, 2: 50 };

interface Trader {
  barterSkill: number;   // skill points, added or subtracted in the modifier
  masterTrader: boolean; // perk: +25 to the modifier, applied only when the player is the buyer
}

interface Goods {
  totalCost: number;     // cost of every item in the table, currency included
  currencyValue: number; // the part of totalCost that is currency; never discounted
}

// Price the buyer pays for `goods`. 100 is face value; above 100 means the seller asks more.
function barterPrice(
  buyer: Trader,
  buyerIsPlayer: boolean,
  seller: Trader,
  goods: Goods,
  scriptMod: number,
  reaction: ReactionLevel,
): number {
  let mod = 100;
  if (buyerIsPlayer && buyer.masterTrader) mod += 25;
  mod += buyer.barterSkill - seller.barterSkill + scriptMod + REACTION_MOD[reaction];
  mod = Math.min(300, Math.max(10, mod));
  // Operands are non-negative here, so Math.trunc matches C integer division.
  const items = goods.totalCost - goods.currencyValue;
  return Math.trunc((100 * items) / mod) + goods.currencyValue;
}

interface Offer {
  totalCost: number;
  stacks: number;        // number of item stacks on the offering side
  locked: boolean;       // item queued for use elsewhere
}

// All-or-nothing accept: the offer must be non-empty, unlocked, and cover the price.
function tryBarter(offer: Offer, price: number): "ok" | "refused" {
  if (offer.stacks === 0) return "refused";
  if (offer.locked) return "refused";
  if (price > offer.totalCost) return "refused";
  return "ok";
}

// Example: a neutral NPC (0), equal barter skill 50 on both sides, script mod 0, goods 120 with 20 currency.
const example = barterPrice({ barterSkill: 50, masterTrader: false }, true, { barterSkill: 50, masterTrader: false }, { totalCost: 120, currencyValue: 20 }, 0, 1);
console.log(example, tryBarter({ totalCost: 90, stacks: 1, locked: false }, example));
```

## 5. Lands in

- TARGET `src/economy/barter.ts` (proposed new module; the brief's paths are `src/fight/` and `origins/` only, and none of them is a trade module, so Lead to confirm). It would hold the one price function that the server calls for shop and player trades, and the accept check that writes the ledger.
- Parity-checklist row 21 (catalogue fields). The donor's price comes from the item catalogue cost (item.cc 663, `proto->item.cost`) and the NPC's barter and perk fields. Row 18 (loot roll and XP award) does not fit a price. No row covers "trade" itself, so this is the closest fit, not an exact one.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room only, shape only)
- Brief rule served: 1 (one ledger, server-verified: the price and the accept check are pure functions the server runs); zones as data (the mood nudge and the modifier values are data fields)

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 allows use only for internal business or non-commercial/personal purposes and free distribution. Treat as restricted: clean-room, shape only, no line-by-line translation.
- Dead branch: the T-key exit condition `modifier <= -30` (4654) can never be true, because the switch yields -25, 0 or +50 (4622-4629). Frankendom should not copy the dead test. If a harsher NPC is wanted, add the level in data, not as this comparison.
- Free gifts: `barter_attempt_transaction` refuses an empty player offer (4262-4264) but not an empty NPC side. With no NPC goods the price is 0, so any offer is accepted and the player gives items for nothing. Frankendom must require both sides to be non-empty, or state the free-gift case in a test.
- Integer division truncates. For cheap goods the price can round down to the currency part only. The server must use the same rounding on client and server.
- Caps are exempt from the modifier, but `item_caps_total` (item.cc 2594) was not read, so the donor's exact caps test is unverified (not read).
- The mood term feeds prices directly. That ties price to NPC disposition, which is a design choice; for Frankendom it should be a per-NPC data field, and a server test should show it (see acceptance).
- Reaction state lives in the NPC's script locals, cached after first use. Frankendom has no script locals; the mood must be stored in the NPC record and recomputed by the server, not cached on the client.
- The donor runs the price on the client while the player watches; nothing re-checks the offer on a server. Frankendom must re-run `barterPrice` and `tryBarter` on the server before the ledger changes.
- Not read: the remaining branches of the input loop in `barter_inventory` (4680 onwards), and the on-screen drawing of the price (4545 read only as the call).

Best transferable idea: a shop or trade price is one pure function of base cost, a stat-modifier stack, a clamp, and a currency exemption, and an offer is accepted all-or-nothing when it covers that price.
Decision (proposed): adapt - keep the formula shape and clamp for shop and player trades on the server, but drop the NPC-mood price nudge unless a zone wants it, and fix the empty-side and dead-branch gaps.
Acceptance: a server test asserts that for goods 120 with currency 20, a player with equal skills and a GOOD NPC (+50) pays 86 (86 = 20 + trunc(100 x 100 / 150)); an offer of 85 is refused, an empty offer is refused, and an empty NPC side is refused.

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room only)
Brief rule served: 1 (one ledger, server-verified); zones as data (modifier values)
