# open-duelyst-duelyst (coach-manager-mode, cell 3)

Donor: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/actions/drawStartingHandAction.coffee` (plus `replaceCardFromHandAction.coffee`, `app/sdk/cards/deck.coffee`, `app/sdk/validators/validatorReplaceCardFromHand.coffee`, `app/sdk/validators/validatorExecuteExplicitAction.coffee`, `app/sdk/player.coffee`, `app/sdk/actions/drawCardAction.coffee`) | Licence: CC0 1.0 Universal (LICENSE line 3: "CC0 1.0 Universal"); code only, card and profile art not checked | CoffeeScript | symbol `DrawStartingHandAction`

Checked: Read in full: `app/sdk/actions/drawStartingHandAction.coffee` (100 lines), `app/sdk/actions/replaceCardFromHandAction.coffee` (69), `app/sdk/validators/validatorReplaceCardFromHand.coffee` (23), `app/sdk/cards/deck.coffee` (322-346), `app/sdk/player.coffee` (513-516). Read in part: `app/sdk/validators/validatorExecuteExplicitAction.coffee` (26-56; the top 25 lines not read), `app/sdk/actions/drawCardAction.coffee` (20-65; lines 1-19 not read), `app/sdk/player.coffee` (215-265, mana only), `app/sdk/gameSession.coffee` (455, validator registration only). Grep only: `app/common/config.js` (constants), `hurtingDamageAction.coffee` (line 11 and its header comment). Not read: the server AI (`server/ai/starter_ai.js`, `server/ai/phase_ii_ai.js`, grep hits only), the mulligan UI, the replay engine's handling of mulligan data, and the tutorial static agent (`app/sdk/agents/staticAgent.coffee`, read, but it is a scripted tutorial opponent, not a coach). Confidence: high on the opening redraw and the swap budget (read end to end, server validator confirmed as registered); medium on the empty-deck hurt (draw action read in part, damage amount by grep). camera_scope not applicable.

Best transferable idea: a small counted redraw budget in two windows: up to two offered options can be rerolled once before the first turn, and one swap is allowed per turn in the fight, with the replaced option going back to the pool and no same-base-id swap when another option exists.
Decision (proposed): adapt - Frankendom has no hand or draw pile, so the shape moves to pre-fight loadout offers (the coach rerolls up to two of five offered techniques once before the bout) and one reroll per window during the bout; the rerolled option returns to a reserve pool. Defects fixed in the sketch: duplicate slots are refused, and an empty pool is refused.
Acceptance: a server test shows five offered techniques before the bout; a two-slot reroll is accepted once, a three-slot reroll is refused, and a second opening reroll is refused; in the bout one swap per window is accepted and a second in the same window is refused; the swapped-in option never shares a base id with the swapped-out one when another option exists.

## 1. Mechanism

- Opening redraw (before turn one, once per player). `DrawStartingHandAction` does work only when all of these hold: the game is new (validator 30-31 for the action type; action 41), the player has not drawn a starting hand yet (action 33; validator 32), and the index list has 1 to 2 entries (action 41; validator 35). The picks are computed only on the authoritative server (action 36); every copy then applies the stored card data to the deck and hand (78-88).
- Order of operations for the opening redraw: (a) the outgoing cards are read from the hand by index and their card data is stored (50-52); (b) the pool is the draw pile (56); if the pool is smaller than the number of outgoing cards, the outgoing cards are added to the pool but the stored outgoing list is then emptied (60-63), so the guard at line 78 fails and no card is swapped (a silent no-op, see section 6); (c) for each index in order, one card is picked from the pool: the top card when decks are not randomised (69-70), otherwise a random one from the session RNG (72); the picked card leaves the pool (76); (d) the outgoing cards go back to the deck (80-82); (e) the new cards are applied to the hand (85-88).
- Mid-fight swap (`ReplaceCardFromHandAction`). Validation (`validatorReplaceCardFromHand`): a forced replace is not counted (14); the hand index must hold a card (18-19); the swap is refused when `getCanReplaceCardThisTurn` is false (20). That check (`deck.coffee` 334-343) refuses if a cannot-replace modifier is present (335), and otherwise allows the swap while the count is below the limit (1 plus any modifier change, 338-342) and the draw pile is not empty (343).
- Swap execution: the counter increments for each non-forced replace (24-26). On the authoritative server with a non-empty pile, the replaced card is read from the hand (30). The candidate scan takes the top of the pile when decks are not randomised (41-42), otherwise a random index (44); a candidate is accepted only if it is a different card and has a different base id (48-50); when no candidate qualifies the top card is used (55). The replaced card goes back to the deck (61), then the new card is added to the hand (64).
- Reset: when the current player's turn ends, the swap counter goes back to 0 (`player.coffee` 513-516).
- Empty-deck hurt (secondary, fatigue analogue). A draw that finds no card from an empty deck deals `HurtingDamageAction` to the player's general, with `damageAmount` 2 (`hurtingDamageAction.coffee` 11), unless the draw is a burn (`drawCardAction.coffee` 33). Whether the draw counts as "from an empty deck" requires randomised decks (49). Deterministic draws index the top of the pile (27).

## 2. Key functions

- `DrawStartingHandAction._execute`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/actions/drawStartingHandAction.coffee` 30-88.
- Opening redraw validator: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/validators/validatorExecuteExplicitAction.coffee` 30-37.
- `ReplaceCardFromHandAction._execute`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/actions/replaceCardFromHandAction.coffee` 19-64.
- `Deck.getCanReplaceCardThisTurn`: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/cards/deck.coffee` 334-343.
- Swap validator, registered in the game session: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/validators/validatorReplaceCardFromHand.coffee` 8-21; `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/gameSession.coffee` 455.
- Counter reset: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/player.coffee` 513-516.
- Empty-deck draw: `/mnt/frankendom-donors/open-duelyst-duelyst/app/sdk/actions/drawCardAction.coffee` 24-42, 48-49.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Opening reroll: limited slots, once per player, fight start only | 2 slots (theirs, config.js:303 `CONFIG.STARTING_HAND_REPLACE_COUNT = 2`); opening hand of 5 (theirs, config.js:301) |
| Mid-fight swap: a per-turn allowance plus a modifier change | 1 per turn (theirs, config.js:372 `CONFIG.MAX_REPLACE_PER_TURN = 1`); modifier change adds to it (theirs, deck.coffee:341) |
| Replaced option returns to the pool, pool must not be empty | None (rule shape, replaceCardFromHandAction.coffee:61; deck.coffee:343) |
| Swap avoids the same base id when another option exists, else the top | Base-id test (theirs, replaceCardFromHandAction.coffee:50); fallback to top (theirs, 55) |
| Empty-pool hurt | 2 damage (theirs, hurtingDamageAction.coffee:11) |
| Deterministic vs random pick | Top of pile when not randomised (theirs, drawStartingHandAction.coffee:69-70; replaceCardFromHandAction.coffee:41-42); session RNG otherwise (theirs, 72) |

## 4. TypeScript sketch

simplified: the sketch models the two windows as one budget. It keeps the slot count limit, the once-per-fight opening flag, the per-window swap counter, the pool, the return of the replaced option to the pool, the same-base-id preference and the top-of-pool fallback. It omits the donor's short-pool branch (drawStartingHandAction.coffee:60-63, which ends as a silent no-op; the sketch refuses with a reason instead), the card-data and replay records, the modifiers that change the allowance, the cannot-replace modifier, the forced replace, the burn draw, the empty-deck damage, and the authoritative-server split. The fix over the donor: duplicate slots are refused in the opening redraw (the donor's validator counts slots and does not reject repeats).

```ts
// Licence: CC0 1.0 Universal (donor LICENSE). Clean-room sketch written from the mechanism, not a translation.
// clean-room
export interface Option {
  id: number;
  baseId: string; // donor getBaseCardId(): the same card in a different copy shares a base id
}

export interface Hand {
  offers: Option[];      // what the coach currently sees, one per slot
  reserve: Option[];     // the pool a swap draws from; the top is the last element
  swapsThisWindow: number;
  pregameUsed: boolean;  // the once-per-fight opening redraw has been spent
}

export const PREGAME_MAX = 2; // donor STARTING_HAND_REPLACE_COUNT
export const WINDOW_MAX = 1;  // donor MAX_REPLACE_PER_TURN

export type Outcome = { ok: true; hand: Hand } | { ok: false; reason: string };

// pick(n) returns an index in [0, n). A seeded RNG in Frankendom; (n) => n - 1 is the donor's
// deterministic "take from the top" mode.
function swapSlots(
  h: Hand,
  slots: readonly number[],
  pick: (n: number) => number,
  avoidSameBase: boolean,
): Hand {
  const offers = [...h.offers];
  const reserve = [...h.reserve];
  for (const slot of slots) {
    const old = offers[slot];
    const candidates = reserve
      .map((_, i) => i)
      .filter((i) => !avoidSameBase || reserve[i].baseId !== old.baseId);
    // Donor: no candidate with a different base id means "default to top of the pool".
    const at =
      candidates.length > 0 ? candidates[pick(candidates.length)] : reserve.length - 1;
    const incoming = reserve[at];
    reserve.splice(at, 1);
    reserve.push(old); // the replaced option goes back into the pool
    offers[slot] = incoming;
  }
  return { ...h, offers, reserve };
}

// Opening redraw: once per fight, up to PREGAME_MAX distinct slots, no base-id rule (donor mulligan).
export function pregameRedraw(h: Hand, slots: readonly number[], pick: (n: number) => number): Outcome {
  if (h.pregameUsed) {
    return { ok: false, reason: 'opening redraw already used' };
  }
  if (slots.length > PREGAME_MAX) {
    return { ok: false, reason: `at most ${PREGAME_MAX} slots` };
  }
  if (new Set(slots).size !== slots.length) {
    // The donor's validator counts the slots but does not reject repeats. This is the fix.
    return { ok: false, reason: 'duplicate slot' };
  }
  if (h.reserve.length < slots.length) {
    return { ok: false, reason: 'not enough options in the pool' };
  }
  return { ok: true, hand: { ...swapSlots(h, slots, pick, false), pregameUsed: true } };
}

// Mid-fight swap: WINDOW_MAX per window, never from an empty pool, and never to the same base id
// when another option exists (donor ReplaceCardFromHandAction).
export function windowSwap(h: Hand, slot: number, pick: (n: number) => number): Outcome {
  if (h.swapsThisWindow >= WINDOW_MAX) {
    return { ok: false, reason: 'out of swaps this window' };
  }
  if (h.reserve.length === 0) {
    return { ok: false, reason: 'pool empty' };
  }
  return { ok: true, hand: { ...swapSlots(h, [slot], pick, true), swapsThisWindow: h.swapsThisWindow + 1 } };
}

// Called when the coach's own window opens (donor: the counter resets at the owner's end of turn).
export function openWindow(h: Hand): Hand {
  return { ...h, swapsThisWindow: 0 };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/redraw.ts` (new engine module): the opening reroll and the per-window swap for pre-fight loadout offers. The server owns the pool and the picks; the client sends the slot numbers.
- Parity-checklist row 5 (controls and input): the reroll and the swap are coach input, checked and counted on the server before the offers change.
- Reuse tag: rewrite-from-idea (CC0; the donor code could be used, the sketch is clean-room)
- Brief rule served: 1 (one engine: the offers and the budget are engine state); 2 (server-verified: the server draws the picks)

## 6. Gaps and risks

- Defect 1 (read, not executed): duplicate indices in the opening redraw. The validator checks the count only (validatorExecuteExplicitAction.coffee:35), and the action loops over every index (drawStartingHandAction.coffee:50-52 and 67-75). So a repeated index would store the same outgoing card twice (returned to the deck at 80-82) and the second draw would overwrite the first new card in that slot. fix: reject repeats and out-of-range slots in the validator (the sketch refuses repeats).
- Defect 2 (read, not executed): the empty-deck hurt is skipped in deterministic mode. `getIsDrawFromEmptyDeck` requires randomised decks (drawCardAction.coffee:49). In deterministic mode an empty pile gives index -1 (27), no card is drawn and no damage is dealt. fix: test for an empty pile directly (`drawPile.length === 0`). I did not confirm whether the gate is intended for replays or tests.
- Defect 3 (read, not executed): short-pool opening redraw is a silent no-op. When the pool is smaller than the outgoing list, the outgoing cards are pushed into the pool but line 63 empties `mulliganedHandCardsData`, so the apply guard at line 78 is false and nothing changes, yet the player is already marked as having drawn (line 34). Fix: refuse with a reason (the sketch does) or draw from the combined pool and keep the outgoing list.
- Replay: the donor stores full card data for the opening redraw because drawing it again would fail in a replay (drawStartingHandAction.coffee:48). Frankendom's replays (parity row 19) must store the rolled picks, not only the seed.
- Fatigue rule (empty-deck hurt, 2 per empty draw): Frankendom has no draw pile, so this does not transfer unless a technique pool can run out. Reject for now.
- AI behaviour when the coach is absent was not covered: `server/ai/starter_ai.js` and `server/ai/phase_ii_ai.js` call `getCanReplaceCardThisTurn` (grep hits only), and the tutorial static agent is a scripted opponent (`app/sdk/agents/staticAgent.coffee`), not a default-tactics coach. Not read for default tactics.
- Related, not the focus of this note: the mana pool is the donor's per-turn command budget (player.coffee 233-255, maximum capped at `CONFIG.MAX_MANA` 9, config.js:296), read for shape only.

Reuse tag: rewrite-from-idea (CC0; clean-room sketch)
Brief rule served: 1 (one engine), 2 (server-verified picks)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: (1) Short-pool case misdescribed: note says donor 'adds outgoing cards to the pool' (60-63) and sketch/gaps say Frankendom must pick a rule. Real: line 63 also sets mulliganedHandCardsData.length=0, so line 78 guard fails and NO card is swapped (silent no-op redraw, newHandCardsData picked but never applied). (2) Validator count check is validatorExecuteExplicitAction.coffee:34 not 35 (minor). All other cites (41, 50-52, 56, 69-76, 80-88, 24-26, 41-55, 61, 64, deck 334-343, player 513-516, config 296/301/303/372, HurtingDamage 2, drawCard 33/27/49, CC0) verified.
Missed: Short-pool redraw becomes a silent no-op (drawStartingHandAction.coffee:60-63 + 78) - a real donor defect the note framed as a refill.

Fixed 2026-10-12 (Sonnet fixer): short-pool branch re-described as a silent no-op (verified drawStartingHandAction.coffee 60-63 and 78) and added as Defect 3; removed the claim that it refills. Checker's validator line 34 not accepted: the count check is line 35 (34 is the invalidate call), as the note says. No sketch change (it already refuses).
