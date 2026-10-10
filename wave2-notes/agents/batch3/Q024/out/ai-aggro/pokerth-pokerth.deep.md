# pokerth-pokerth (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/pokerth-pokerth/src/engine/local_engine/aiengine4.cpp` | Licence: AGPL-3.0-or-later (aiengine4.h lines 6-8: "either version 3 of the License, or (at your option) any later version"; COPYING is AGPL v3) | C++ | symbols `AiEngine4::decide`, `decidePostflop`, `decidePreflop`, `decideShortStack`, `AiEngine4::winningChance` (caller: `LocalPlayer` in localplayer.cpp 1190-1236)

Checked: Opened aiengine4.h (1-120, whole file); aiengine4.cpp (1-449, whole file); localplayer.cpp 944-962 (personality draws) and 1190-1236 (opponent model and call site). Confidence: high on the decision order, thresholds, personality multipliers and the opponent-model gating, all read in code. Not read: `EquityCalculator::equity` (equitycalculator.cpp), so how the equity sample is drawn is not described here; `HoleCardsRange` parsing; `Tools::GetRand`; `LocalPlayer::evaluation`, which books chips. This is a poker decision engine, not a fighting game; the cell is about aggression and target choice, and the mechanism transfers as a stance rule, not as poker code. Camera: not applicable (ai-aggro cell). Scope: not camera.

## 1. Mechanism

- Entry (aiengine4.cpp 439-449). No opponents still in the hand means call (444). Preflop goes to `decidePreflop` (446), otherwise `decidePostflop` (448). Stacks at 12 big blinds or less go to push-or-fold (306).
- Post-flop, when the engine can check for free (381-395): it compares its equity with a reference share, `fairShare = 1 / (opponents + 1)` (378). Equity above `fairShare * 1.5 / looseness` means bet. The bet is 0.75 of the pot if equity is above `fairShare * 2.2`, else 0.55, both times `aggression` (381-386). Below that, with two opponents or fewer and the engine last to act, it bluffs at 18 times `bluffRate` percent (390-393). Otherwise it checks (395).
- Post-flop, facing a bet (398-434). Pot odds are `toCall / (pot + toCall)` (measure, 150). The engine calls when `equity >= potOdds + margin` (415). The margin is 0.03, or 0 on the river (402). An observed aggressive opponent lowers the margin (409-412): shift = `(aggressionPercent - 40) / 1000`, clamped to plus or minus 0.03, and the margin is floored at minus 0.02. When the call passes and `equity > fairShare * 1.9` with fewer than three raises this round, the engine raises 0.7 of the pot times `aggression` (416-421); otherwise it calls (422). If the call fails: one opponent, last to act, equity above 0.25, and a roll within 12 times `bluffRate` percent makes a 0.6-pot semi-bluff (428-432). Otherwise it folds (434).
- Equity itself (`winningChance`, 184-234). The equity is estimated against the remaining opponents, each drawn from one range chosen by their observed entering rate (VPIP below 18, 30 and 45 pick among four ranges from tight to loose; no data uses pot size, 196-207). The sample counts and the name suggest a Monte Carlo estimate, but the sampler was not read (inferred). Samples per street: 6000 before the flop, 8000 on the flop, 6000 on the turn, 4000 on the river (215-227). The sampler is not read.
- Preflop (304-359). Opening range by seat: the fewer players behind, the wider (openingRangeIndex 163-176). Looseness above 1.10 widens it one step, below 0.90 narrows it. The raise size is `(3 + limpers) * bigBlind * aggression` (316). Facing a raise: 3-bet with `inPosition ? 3 : 4` times the high bet times `aggression` (339-340), or call if the price is at most `12 * looseness` big blinds (350). A single opponent in position sometimes gets a 3x raise bluff at `6 * bluffRate` percent (354-355).
- Personality (localplayer.cpp 949-961, 1227-1230). Per player at seating: `myDude` is drawn 3 to 5 and `myDude4` is the mean of four draws in 0 to 14 minus 7. Then `looseness = 1 + myDude4 / 40`, `aggression = 1 + (myDude - 4) / 8`, `bluffRate = 1 + myDude4 / 30`. The comment at 1223-1225 says these are a moderate EV shift, not a threshold surcharge.
- Opponent model (localplayer.cpp 1197-1221). VPIP is averaged over opponents with at least 12 hands. Aggression is averaged over opponents with at least 15 post-flop actions. Opponents who folded are skipped. Values of -1 mean "no data" and the engine falls back to defaults.

## 2. Key functions

- `AiEngine4::decide`: `aiengine4.cpp` 439-449. Split by street; zero opponents calls.
- `decidePostflop`: aiengine4.cpp 370-435. The stance rule in section 1.
- `decidePreflop`: aiengine4.cpp 304-359. Ranges, 3-bet, call-the-raise, bluff.
- `decideShortStack`: aiengine4.cpp 285-302. Push-or-fold at 12 big blinds or less.
- `AiEngine4::winningChance`: aiengine4.cpp 184-234. Sample count by street; equity against a range.
- Caller: `LocalPlayer` builds `AiSituation` and `AiPersonality` and calls `AiEngine4::decide` (localplayer.cpp 1197-1232, personality at 1227-1230). Only this caller was checked: `grep` in the donor src found no other call of `AiEngine4::decide`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Compare the estimated win chance with a fair share of the pot, 1 over (opponents + 1) | Fair share formula (theirs, 378) |
| Press when clearly ahead of the fair share, scaled by temperament | Bet threshold 1.5 over looseness (theirs, 381); bet size 0.75 above 2.2 fair, else 0.55 (theirs, 383-384) |
| Hold or call when the win chance covers the cost, with a small margin | Margin 0.03 before the river, 0 on it (theirs, 402); floor -0.02 (theirs, 412) |
| The margin moves with the foe's observed aggression, capped | Shift (aggression - 40) / 1000, cap plus or minus 0.03 (theirs, 409-410) |
| Escalations capped inside one exchange | Cap 3 (theirs, 418) |
| Occasional bluffs only against few foes, in position | Bluff 18, 12, 6 percent, scaled by bluffRate (theirs, 390, 429, 354) |
| Temperament as multipliers around 1.0, drawn once per seat | Looseness 1 + d/40, aggression 1 + (d-4)/8, bluffRate 1 + d/30 (theirs, localplayer.cpp 1228-1230) |
| Opponent model needs enough observations | 12 hands for entry rate, 15 actions for aggression (theirs, localplayer.cpp 1210, 1215) |
| Sampling budget per decision | 6000 / 8000 / 6000 / 4000 samples (theirs, 216-225) |

## 4. TypeScript sketch

simplified: the sketch covers the post-flop stance rule only (free-to-wait branch, then the facing-a-cost branch), with the fair share, margin, aggression shift, escalation cap and bluff gates. It omits the preflop charts, the short-stack push-or-fold, the equity sampler (the caller supplies `equity`), the opponent-model averaging, the raise and bet amounts in chips (it returns a fraction of the stake), the big-blind bluff, the chip booking, and the minimum-raise rule. Order matches the donor (free-to-wait first, then cost). The donor's bet and raise amounts come from `minimumRaise` and `bigBlind`; the sketch does not.

```ts
// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Persona { looseness: number; aggression: number; bluffRate: number; } // each about 1.0

interface Spot {
  equity: number;          // 0..1, estimated chance to win the exchange against all remaining foes
  foes: number;            // remaining hostiles
  costRatio: number;       // cost of joining / (stake + cost): the "pot odds" analogue
  foeAggression: number;   // observed attack share 0..100, or -1 if unknown
  freeToWait: boolean;     // waiting costs nothing
  inPosition: boolean;     // we act last among the foes
  escalations: number;     // pushes already made in this exchange
  finalRound: boolean;
}

type Act = "press" | "hold" | "wait" | "back-off";
interface Stance { act: Act; size: number; } // size: fraction of the stake

function decideStance(s: Spot, p: Persona, roll: () => number): Stance {
  const fair = 1 / (s.foes + 1);                       // share due to us if all were equal

  if (s.freeToWait) {
    if (s.equity > (fair * 1.5) / p.looseness) {
      const size = (s.equity > fair * 2.2 ? 0.75 : 0.55) * p.aggression;
      return { act: "press", size };
    }
    if (s.foes <= 2 && s.inPosition && roll() <= 0.18 * p.bluffRate) return { act: "press", size: 0.5 };
    return { act: "wait", size: 0 };
  }

  let margin = s.finalRound ? 0 : 0.03;
  if (s.foeAggression >= 0) {
    const shift = Math.max(-0.03, Math.min(0.03, (s.foeAggression - 40) / 1000));
    margin = Math.max(-0.02, margin - shift);          // aggressive foes bluff more: call a little cheaper
  }

  if (s.equity >= s.costRatio + margin) {
    if (s.equity > fair * 1.9 && s.escalations < 3) return { act: "press", size: 0.7 * p.aggression };
    return { act: "hold", size: 0 };
  }

  if (s.foes === 1 && s.inPosition && s.equity > 0.25 && roll() <= 0.12 * p.bluffRate) {
    return { act: "press", size: 0.6 };
  }
  return { act: "back-off", size: 0 };
}

export {};
```

## 5. Lands in

- TARGET `src/fight/ai-stance.ts` (new module, engine AI brain): the press, hold, wait or back-off choice for one creature against all the foes it can see. Parity-checklist row 2 (AI brain). Proposed, not in the donor: count attackers up to MAX_ATTACKERS = 3 in the fair share, 1 / (attackers + 1).
- today: no stance module in src/fight/ (not checked against the current tree).
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: the engine decides the stance, the client only plays it); rules 7-9 n/a

## 6. Gaps and risks

- AGPL-3.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- The equity number is the whole mechanism; the donor computes it with `EquityCalculator::equity` (not read), and the sample counts suggest a Monte Carlo estimate (inferred). A per-tick Monte Carlo is not affordable on a server tick with many creatures (row 18 / post-K item 3 sub-line: server tick: fixed step, input intake, per-tick NPC budget). Frankendom needs a cheap estimate (for example, from hit chance and stamina the engine already holds), and the thresholds must be re-tuned to that estimate; the constants above are not portable as they are.
- Randomness. The bluff rolls use the table RNG, one roll per decision. Frankendom's server must draw these from the seeded fight RNG so fight records (row 19) replay the same stance.
- Temperament. The multipliers are drawn per seat at random, which means two identical creatures can behave differently. Frankendom's catalogue is the source of temperament (zones as data), so the draw belongs in data, not in the engine.
- Pot odds have no direct fight analogue. The sketch's `costRatio` stands for "cost of joining as a share of the exchange", which Frankendom must define (for example, expected damage taken over stake) and test. Do not port the poker pot numbers.
- Opponent aggression as a margin shift is capped at plus or minus 0.03: a deliberate small effect. Frankendom's rulings want the hero's ledger to be the only ledger, so this shift must not change damage or kills, only the stance.
- No monster-vs-monster stance. The engine is one bot against several. The MAX_ATTACKERS = 3 ruling makes the fair-share reference shrink as the group grows, which is the mechanism's intent.
- The preflop charts and the short-stack mode have no fight analogue and are not claimed.

Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only)
Brief rule served: 1 (one engine: the stance decision lives in the engine); rules 7-9 n/a

Best transferable idea: Decide a fight stance by comparing the estimated chance to win the exchange with a fair share of it (1 over foes plus one), press when clearly ahead, hold when it covers the cost, back off otherwise, and scale all of it by per-creature temperament multipliers near 1.0.
Decision (proposed): adapt — the stance rule fits many-on-one fights, but the donor's equity is a costly per-decision sample, so Frankendom needs a cheap estimate, re-tuned thresholds and temperament in catalogue data.
Acceptance: A player sees a creature hold back when outnumbered and press only when clearly ahead; a server test asserts the same fight state gives the same stance on replay from the seeded RNG, and a higher aggression value presses more often over a fixed set of states.
