# alexbatalov-fallout2-ce (economy-trade, cell 11)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` | Licence: Sustainable Use License 1.0 (LICENSE.md line 1; line 15 allows use only for internal business or non-commercial/personal use, free distribution only) | C++ | symbol `_barter_compute_value`, `_barter_attempt_transaction`

Checked: Read in full: `_barter_compute_value` (inventory.cc 4673-4703), `_barter_attempt_transaction` (4706-4762), `reactionTranslateValue` (reaction.cc 18-33), `reactionGetValue` (reaction.cc 42-51), `itemGetTotalCaps` (item.cc 3153-3173), `objectGetCost` (item.cc 864-914), `partyGetBestSkillValue` (party_member.cc 1182-1196, the loop and the return). Read in part: `inventoryOpenTrade` (inventory.cc 5031-5140: base modifier, mood switch, input loop, M and T keys; the rest of the window code not read). Not read: `skillGetValue`, `critterGetStat`, `miscItemTurnOff` (its side effect is in the Geiger counter check, section 6), the context of the one mood setter (critter.cc 1299). Callers, checked by grep over src/: `_barter_compute_value` has three call sites (4744 in the accept check; 5008 and 5012 for the on-screen price); `_barter_attempt_transaction` has one call site (5133, the M key). Confidence: high on the price formula and the accept order; medium on the mood value, because the script side that writes mood was not read. Hint file was INFERRED; the real code is inventory.cc, found by grep on "barter". This donor is a separate code base from the Fallout 1 donor (same licence family, different formula): see the Fallout 1 note.

## 1. Mechanism

- Price (non-companion case): `_barter_compute_value` takes `cost` = total cost of the NPC-side table (`_btable`, 4679) and `caps` = the currency in it (4680). The uncapped cost is `cost - caps` (4681). The multiplier is `(_barter_mod + 100 - perkBonus) * 0.01` (4694), where `perkBonus` is 25 when the dude is the player and has Master Trader (4683-4688). If the multiplier is below 0 it is set to 0.0099999998 (4696-4699). The balanced cost is `(160 + npcBarter) / (160 + partyBarter) * (uncapped * 2.0)` (4695): a ratio of the NPC's barter skill to the best barter skill in the active party (4690-4691), with a 160 offset on both sides, applied to the doubled uncapped cost. The result is `(int)(multiplier * balanced + caps)` (4701): currency is added at face value, truncated to an integer.
- Mood nudge: `inventoryOpenTrade` sets `_barter_mod = barterMod` once (5035), reads the NPC's mood (5091-5092) and maps it to a modifier: BAD +25, NEUTRAL 0, GOOD -15 (5094-5101). On every pass of the input loop, `_barter_mod = barterMod + modifier` (5124). A BAD NPC therefore raises the price and a GOOD NPC lowers it.
- Mood level: `reactionTranslateValue` gives GOOD above 10, NEUTRAL above -10, and BAD otherwise (reaction.cc 20-31; the four branches at 24-31 all return BAD, so the chain has no effect beyond the first two tests). The mood value itself is read from script local 0 by `reactionGetValue` (reaction.cc 46-50) and set by `reactionSetValue` (13). The only engine setter found is `reactionSetValue(a1, -3)` at critter.cc 1299 (grep over src/; context not read). Scripts may also write local 0 (not checked).
- Companion case: when the speaker is a party member (`gGameDialogSpeakerIsPartyMember`, 4675), the "price" is the carry weight of the NPC-side table (4676). The display shows a weight label for this case (5003-5010; label text not read).
- Accept: `_barter_attempt_transaction` runs these checks in order. (a) The player's carry capacity must hold the incoming goods, for every trade (4710-4711; refusal message 31 at 4713). (b) If the speaker is a companion, the NPC's carry capacity must hold the player's offer (4720-4722; message 32 at 4724), and the value is not compared. (c) Otherwise: an empty offer is refused (4732-4733). A queued offer is refused unless it is a Geiger counter that `miscItemTurnOff` can switch off (4735-4739). The offer's total cost must be at least the computed price (4742-4746; message 28 at 4751). (d) On success, the NPC's goods move to the player (4759) and the offer moves to the NPC (4760).
- The M key runs the accept check (5131-5133); the T key moves both tables back to their owners (5126-5128) and ends the trade.
- Tick: none. The loop calls `sharedFpsLimiter.mark()` and reads input; the price is recomputed on each redraw (5008, 5012). Not a tick-driven economy.

## 2. Key functions

- `_barter_compute_value`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` 4673-4703. Price in whole currency: companion weight case, multiplier, skill ratio, caps at face value.
- `_barter_attempt_transaction`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` 4706-4762. Carry checks, companion branch, offer checks, two-way move.
- `inventoryOpenTrade`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/inventory.cc` 5031-5140 (partly read). Mood to modifier, input loop, M and T keys.
- `reactionTranslateValue`, `reactionGetValue`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/reaction.cc` 18-33 and 42-51. Mood level from the stored value.
- `itemGetTotalCaps`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 3153-3173. Currency is the quantity of the money prototype, summed through containers.
- `objectGetCost`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 864-914. Cost of the table, with ammo, containers and worn or held items.
- `partyGetBestSkillValue`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/party_member.cc` 1182-1196. Best value of a skill among visible party critters.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Price = uncapped cost x multiplier + currency at face value | Currency at face value (itemGetTotalCaps, item.cc 3162-3163) |
| Multiplier = 1 + modifiers (percent-style) | 100 base; Master Trader 25 (theirs, 4686); mood +25 / 0 / -15 (theirs, 5095, 5098, 5101) |
| Skill ratio with offset: (a + k) / (b + k) | k = 160 on both sides (theirs, 4695); reference skill = party best (theirs, 4690) |
| Doubled uncapped cost | x 2.0 (theirs, 4695); no comment in the donor says why |
| Floor on a negative multiplier | 0.0099999998 (theirs, 4698) |
| Mood score to three levels | Thresholds 10 and -10 (theirs, reaction.cc 20, 22) |
| Accept: offer cost >= price, all-or-nothing | Refusal message 28 (theirs, 4751) |
| Carry-weight checks | Message 31 and 32 (theirs, 4713, 4724) |

Compared with the Fallout 1 donor: F1 adds the buyer's and seller's barter skills to a modifier (integer division, clamped 10..300, no ratio); F2 multiplies, uses a skill ratio, has no upper clamp (only a floor), and uses the party's best barter skill.

## 4. TypeScript sketch

simplified: keeps the donor order for the price (multiplier with perk and mood, floor only when negative, skill ratio on the doubled uncapped cost, currency at face value, truncation) and for the accept (carry check on incoming goods first for every trade; then the companion weight branch, or the value branch with empty, queued and price checks). It omits the Geiger counter side effect (the donor turns the item off inside the check; the sketch takes `releasable` as an input), the mood score (the level is an input), the skill functions, the item moves, the window, and the M and T keys.

```ts
// Licence: Sustainable Use License 1.0 (donor, alexbatalov-fallout2-ce). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

// 0 bad, 1 neutral, 2 good. The mood nudge is added to the script barter modifier; BAD raises the price.
type Mood = 0 | 1 | 2;
const MOOD_MOD: Record<Mood, number> = { 0: 25, 1: 0, 2: -15 };

interface PriceInput {
  goodsCost: number;      // total cost of the NPC-side table, currency included
  goodsCaps: number;      // currency in that table; billed at face value
  npcBarter: number;      // NPC barter skill
  partyBestBarter: number; // best barter skill among the active party (the player's side)
  scriptMod: number;      // base modifier set by the dialogue script
  masterTrader: boolean;  // perk: lowers the multiplier by 25 points
  mood: Mood;
}

// Non-companion price in whole currency units.
function barterPriceF2(p: PriceInput): number {
  const perk = p.masterTrader ? 25 : 0;
  let mult = (p.scriptMod + MOOD_MOD[p.mood] + 100 - perk) * 0.01;
  if (mult < 0) mult = 0.0099999998; // floor only when the multiplier went negative
  const uncapped = p.goodsCost - p.goodsCaps;
  // Skill ratio with a 160 offset, applied to the doubled uncapped cost. The factor 2 is in the donor; no comment says why.
  const balanced = ((160 + p.npcBarter) / (160 + p.partyBestBarter)) * (uncapped * 2.0);
  return Math.trunc(mult * balanced + p.goodsCaps);
}

interface Offer {
  stacks: number;          // item stacks on the player's side
  queued: boolean;         // item is queued for use elsewhere
  releasable: boolean;     // true only when the queued item can be switched off (donor: a Geiger counter, turn-off succeeded)
  cost: number;            // total cost of the player's offer
  weight: number;          // total weight of the player's offer
}

type Result = "ok" | "too-heavy-for-player" | "too-heavy-for-npc" | "bad-offer";

interface TradeInput {
  companion: boolean;      // speaker is a party member: weight swap, no value check (donor branch)
  goodsWeight: number;     // weight of the NPC-side table
  playerCarryLeft: number; // player carry capacity minus current weight
  npcCarryLeft: number;
  price: number;           // barterPriceF2 result for the non-companion case
  offer: Offer;
}

// Donor order: the player's carry check comes first for every trade; then the companion or value branch.
function tryTradeF2(t: TradeInput): Result {
  if (t.goodsWeight > t.playerCarryLeft) return "too-heavy-for-player";
  if (t.companion) {
    return t.offer.weight > t.npcCarryLeft ? "too-heavy-for-npc" : "ok";
  }
  if (t.offer.stacks === 0) return "bad-offer";
  if (t.offer.queued && !t.offer.releasable) return "bad-offer";
  if (t.price > t.offer.cost) return "bad-offer";
  return "ok";
}

const p: PriceInput = { goodsCost: 100, goodsCaps: 0, npcBarter: 60, partyBestBarter: 100, scriptMod: 0, masterTrader: false, mood: 1 };
const price = barterPriceF2(p);
console.log(price, tryTradeF2({ companion: false, goodsWeight: 5, playerCarryLeft: 50, npcCarryLeft: 50, price, offer: { stacks: 1, queued: false, releasable: false, cost: 168, weight: 2 } }));
```

## 5. Lands in

- TARGET `src/economy/barter.ts` (proposed new module; the brief's paths are `src/fight/` and `origins/` only, and none of them is a trade module, so Lead to confirm). The same server-side pure price and accept as the Fallout 1 note; this donor adds the ratio form.
- Parity-checklist row 21 (catalogue fields). The price starts from the cost of the items on the NPC side (item.cc objectGetCost, 864-914, which calls itemGetCost per item; itemGetCost not read) and from the NPC's and party's skills. Row 18 does not fit a price. No row covers trade itself, so row 21 is the closest fit, not an exact one.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room only, shape only)
- Brief rule served: 1 (one ledger, server-verified: price and accept are pure functions the server runs); zones as data (k, the floor and the mood nudges are data fields)

## 6. Gaps and risks

- Licence: Sustainable Use License 1.0 limits use to internal business or non-commercial/personal purposes and free distribution. Restricted: clean-room, shape only.
- Doubled cost: at equal skills and no modifiers the code prices non-currency goods at 2 x their catalogue cost (4695 with the multiplier of 1.0 from 4694). That may be intended; Frankendom must set its own base and state it as a data field, not inherit the factor 2.0.
- No upper clamp on the multiplier: only the floor at 0.0099999998 (4696-4699). Very high modifiers are unbounded. Frankendom should clamp, as the Fallout 1 donor does (10..300).
- Companion trades skip the value check entirely (4720-4729): the goods move for a carry-weight fit only. Frankendom has no party trade in this sense; if it adds one, the server must still check value unless the trade is a designed gift.
- Free gift: an empty NPC-side table gives a price of 0 (cost 0, caps 0), so any non-empty offer is accepted. The same gap as the Fallout 1 donor; Frankendom must require both sides to be non-empty, or test the free gift on purpose.
- Side effect in a check: the Geiger counter path calls `miscItemTurnOff` inside the validation (4736). Frankendom's validation must stay pure, and the switch-off must be a separate, logged action.
- Dead branch: the T-key exit test `modifier <= -30` (5126) can never be true with the values 25, 0 and -15 (5094-5101). Do not copy it.
- Mood is script state (script local 0, reaction.cc 46) with one engine setter found (critter.cc 1299; context not read). Frankendom has no script locals; the server must own the NPC mood as a record field and recompute it.
- Rounding: the result is an `(int)` cast, which truncates (4701). The server and client must round the same way; otherwise the displayed price and the accepted price can differ by one.
- Not read: the rest of `inventoryOpenTrade` (5140 onward), the messages 28-32 text, `skillGetValue`, `critterGetStat`, and the context of critter.cc 1299.

Best transferable idea: a price can be a skill ratio with an offset, (npc + 160) / (party + 160), applied to the cost and multiplied by a bounded modifier, so the price stays smooth and positive without a large clamp, with currency billed at face value.
Decision (proposed): adapt - take the ratio form and the face-value currency for shop and player trades on the server; add the clamp the donor lacks, drop the doubled cost unless tested, drop the companion no-value trade, and make the mood a server record field.
Acceptance: a server test asserts that with NPC barter 60, party best 100, uncapped goods 100 and a neutral NPC the price is 169 (169 = trunc(1.0 x 220/260 x 200)); an offer of 168 is refused and an offer of 169 is accepted; with a GOOD NPC (-15) the price is 143 (143 = trunc(0.85 x 169.23)).

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room only)
Brief rule served: 1 (one ledger, server-verified); zones as data (k, floor, mood nudges)
