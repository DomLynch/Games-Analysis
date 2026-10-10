# freeciv-freeciv (ai-aggro, cell 3)

Donor: `/mnt/frankendom-donors/freeciv-freeciv/ai/default/daiunit.c` | Licence: GPL-2.0-or-later (file header read: "either version 2, or (at your option) any later version", daiunit.c line 5; COPYING line 2 "Version 2, June 1991") | C | symbol `find_something_to_kill` (with `kill_desire`)

Checked: Read the target-choice path: `kill_desire` (341-357, with its comment from 300-340), `find_something_to_kill` setup (1214-1275), the city-target block (1490-1560), the unit-target block (1600-1672), `military_amortize` (`ai/default/daitools.c` 117-131), `amortize` (`server/advisors/advtools.c` 29-37), constants (`advtools.h` 19, `advbuilding.h` 20-21), `ai_fuzzy` (`ai/difficulty.c` 339-347) and the level table (143-155). Hint file `ai/default/daiparadrop.c` was not the place: its function list (61, 196, 309, 380) is paratrooper drop-tile choice, so it is not the target choice. Not read: the ferry, beachhead and path branches of `find_something_to_kill` (about 1276-1490 and 1560-1600 in outline only), the occupy and reinforcement helpers beyond what the want formula uses, `daimilitary.c` callers (grep only), and the normal and hard fuzzy values (after line 155). Confidence high on the unit-target score and its order of steps. camera_scope not applicable (AI topic).

## 1. Mechanism

- The AI scores each candidate target with one number, "want", and picks the best. The unit-target path (1600-1672) runs per visible enemy unit. It skips: units it cannot see when the handicap applies (1626), non-hostile units when it is building (not attacking), units it cannot attack, and any unit that is not the main defender of its tile (1641-1642). It skips units it cannot path to (`pf_map_position`).
- Per candidate: `vulnerability = unit_def_rating_squared(punit, aunit)` (1652) and `benefit = unit_build_shield_cost_base(aunit)` (the prize: the victim's build cost). `move_time = pos.turn` (turns to reach it). If `10 < move_time` the want is 0 (1656-1658). Otherwise:
  - `want = kill_desire(benefit, attack, bcost, vulnerability, 1)` (1660). `attack` is the attacker's squared attack rating (1614). `bcost` is the attacker's build cost (the loss we risk).
  - `want -= move_time * SHIELD_WEIGHTING` (1663): a per-turn travel penalty (17).
  - `want -= 2 * move_time * TRADE_WEIGHTING` when the attack would make citizens unhappy (1666; unhappy flag set earlier).
- Then `want = military_amortize(pplayer, homecity, want, MAX(1, move_time), bcost_bal)` (1668). `military_amortize` returns 0 for a value of 0 or less (`daitools.c` 125), otherwise `amortize(value, delay + build_time)` (129), where build time = build cost / city shield output, at least the average production.
- `amortize` multiplies by `(1 - 1/MORT)^delay`, with MORT 24 (`advtools.c` 35, `advtools.h` 19): a per-turn discount of 1/24 compounded over the delay.
- Pick. `if (want > best && ai_fuzzy(pplayer, TRUE))` (1670) takes the candidate. `ai_fuzzy` returns the opposite of the decision with probability `fuzzy/1000` (`difficulty.c` 344). Easy has fuzzy 300, novice and restricted 400, away 0 (`difficulty.c` 143-155, read). The fuzzy roll is made only when the candidate beats the best so far.
- `kill_desire` (341-348): `desire = (benefit * attack - loss * vuln) * victim_count * SHIELD_WEIGHTING / (attack + vuln * victim_count)`. Attack and vulnerability come squared. The denominator saturates: as the victim count grows, the value tends toward `(benefit*attack - loss*vuln) * SHIELD_WEIGHTING / vuln`. Worth taking only when the prize times our attack beats our loss times their defence.
- No attacking power, no target: `if (attack_value == 0) return 0` (1275).
- City targets (1490-1560) use the same formula with a city's defender as the prize, an invasion-reserve bonus, a 1 + victim count, and two special cases: a zero want when nothing can be attacked or occupied (1533), and `bcost * SHIELD_WEIGHTING` when occupiers are needed. Not used here.

## 2. Key functions

- `kill_desire`: `/mnt/frankendom-donors/freeciv-freeciv/ai/default/daiunit.c` 341-348. The expected-trade score with a saturating denominator. Read in full (comment 300-340 read).
- `find_something_to_kill`, unit-target block: `/mnt/frankendom-donors/freeciv-freeciv/ai/default/daiunit.c` 1600-1672 (candidate filters, the want, the time penalty, amortize, fuzzy pick). Read in full.
- `find_something_to_kill`, city block: `/mnt/frankendom-donors/freeciv-freeciv/ai/default/daiunit.c` 1490-1560 (city want). Read in full up to the fuzzy pick at 1593.
- `military_amortize`: `/mnt/frankendom-donors/freeciv-freeciv/ai/default/daitools.c` 117-131. Read in full.
- `amortize`: `/mnt/frankendom-donors/freeciv-freeciv/server/advisors/advtools.c` 29-37. Read in full.
- `ai_fuzzy`: `/mnt/frankendom-donors/freeciv-freeciv/ai/difficulty.c` 339-347. Read in full.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Expected trade: (prize x our power - our loss x their defence), saturating in the number of victims | Power and defence squared (theirs, daiunit.c 1614, 1652); victims 1 for a single unit (theirs, 1660) |
| Travel penalty per turn, subtracted from the trade | 17 per turn (theirs, daiunit.c 1663; advbuilding.h 20) |
| Hard cutoff when too far | 10 turns (theirs, daiunit.c 1656) |
| Discount by delay, compounding | Interest constant MORT 24, discount 1/24 per turn (theirs, advtools.h 19; advtools.c 35) |
| Build time as part of the delay | Build cost over city shield output, at least average production (theirs, daitools.c 117-129) |
| Noise per difficulty: a candidate that beats the best is accepted with probability 1 - fuzzy/1000 | Fuzzy 300 easy, 400 novice and restricted, 0 away (theirs, difficulty.c 154 and read lines 143-155) |
| Unhappiness penalty (not used here) | TRADE_WEIGHTING 18, times 2 per turn (theirs, advbuilding.h 21; daiunit.c 1542, 1666) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's unit-target score in the donor's order (power guard, cutoff, trade, travel penalty, zero check, amortize with build delay, fuzzy accept only when the candidate beats the best). It omits: the city block and its special cases, the ferry and path logic (the foe's `turns` is given), the handicap and visibility filters, the main-defender-per-tile filter (each foe is a single victim here), the unhappiness penalty, the homecity shield output (the build delay uses `buildRate` for the attacker), and the donor's `victim_count` beyond the constant 1. It keeps `SHIELD_WEIGHTING` and `MORT` as donor values, but these are score weights, not Frankendom units.

```ts
// Licence: GPL-2.0-or-later (freeciv ai/default/daiunit.c header: "either version 2, or (at your option) any later version"; COPYING: Version 2). Clean-room shape written from the mechanism; not a line-by-line translation.
const SHIELD_WEIGHTING = 17;   // donor weight: score per turn of delay, and the scale of kill desire
const MORT = 24;               // donor interest constant: discount per turn is 1 - 1/MORT
const MAX_TURNS = 10;          // donor cutoff: a target more than 10 turns away scores 0

interface Me {
  power: number;               // attack rating (squared inside the score, as in the donor)
  cost: number;                // what we risk losing (donor bcost)
  buildRate: number;           // production per turn, used for the build-time delay
  fuzzy: number;               // per-mille chance a decision is flipped (donor ai_common.fuzzy)
}

interface Foe {
  defense: number;             // defence rating (squared inside the score)
  prize: number;               // attractiveness of the target (donor benefit)
  turns: number;               // turns needed to reach it
}

// Expected trade for one attacker against one victim, scaled by a saturating denominator.
function killDesire(benefit: number, attack: number, loss: number, vuln: number, victims: number): number {
  const den = attack + vuln * victims;
  if (den <= 0) return 0;
  return ((benefit * attack - loss * vuln) * victims * SHIELD_WEIGHTING) / den;
}

function amortize(value: number, delay: number): number {
  return value * Math.pow(1 - 1 / MORT, delay);
}

function wantFor(me: Me, foe: Foe): number {
  if (foe.turns > MAX_TURNS) return 0;
  let want = killDesire(foe.prize, me.power * me.power, me.cost, foe.defense * foe.defense, 1);
  want -= foe.turns * SHIELD_WEIGHTING;                    // time penalty per turn of travel
  if (want <= 0) return 0;                                 // donor military_amortize returns 0 for value <= 0
  const buildTurns = Math.trunc(me.cost / Math.max(1, me.buildRate));
  return amortize(want, Math.max(1, foe.turns) + buildTurns);
}

// Donor ai_fuzzy(TRUE): accepted unless the roll falls under the fuzzy per-mille value.
function fuzzyAccept(fuzzy: number, rand: () => number): boolean {
  return rand() * 1000 >= fuzzy;
}

// Pick the best foe. Each candidate is only taken when it beats the best so far and passes the fuzzy roll.
function pickTarget(me: Me, foes: Foe[], rand: () => number): { foe: Foe | null; want: number } {
  if (me.power <= 0) return { foe: null, want: 0 };        // donor: no attacking power, no target
  let best = 0;
  let bestFoe: Foe | null = null;
  for (const f of foes) {
    const w = wantFor(me, f);
    if (w > best && fuzzyAccept(me.fuzzy, rand)) {
      best = w;
      bestFoe = f;
    }
  }
  return { foe: bestFoe, want: best };
}
```

## 5. Lands in

- TARGET `src/fight/ai.ts` (engine AI choice of which enemy to attack: one score per candidate, best wins, difficulty noise). Parity-checklist row 2 (AI brain).
- Related: the fuzzy roll is a per-difficulty field and must be seeded on the server so the fight record (row 19) can replay it. Not a target of its own.
- today: not checked (this reader had no Frankendom checkout; only donor code was in reach).
- Reuse tag: adapt-allowed (GPL-2.0-or-later: clean-room; shape only)
- Brief rule served: 1 (one engine: the choice lives in one module); rules 7-9 n/a

Best transferable idea: score each enemy as expected trade minus travel time, discounted by delay and capped at a maximum reach, and let difficulty flip a choice only when it beats the best so far.

Decision (proposed): adapt - take the scoring shape (expected trade over a saturating denominator, a per-turn travel penalty, a reach cutoff and the fuzz roll on the running best) with Frankendom units; reject the victim-count multiplier as donor-shaped (a Frankendom fight has one player per target, and the crowd cap is MAX_ATTACKERS = 3, an engine rule), and reject the city, ferry and occupy branches (no Frankendom equivalent).
Acceptance: a server test with one attacker and two players, one 3 turns away with lower defence and one 12 turns away, asserts the 3-turn player is picked and the 12-turn one is never picked; and over 1000 seeded picks with fuzzy 300 the pick differs from the zero-fuzz pick about 30% of the time, within 5 points.

## 6. Gaps and risks

- Turns vs ticks: the donor's cutoff (10), travel penalty (17 per turn) and discount (1/24 per turn) are turn-based. Frankendom must re-unit them in ticks or seconds and keep them as engine constants or zone data; do not copy the numbers as if they were milliseconds.
- Build time has no Frankendom analogue. Drop it, or use the respawn time from zone data (row 23) if a foe's replacement timing matters.
- Noise on the server: the fuzzy roll changes outcomes. It must use a seeded server RNG and be written to the fight record (row 19), or it breaks server-verified kills.
- No attacker cap: the donor's score can send every attacker at the same target. Frankendom's MAX_ATTACKERS = 3 must spread attacks in the engine (it is not a score term here).
- One ledger: the donor's weights are static and keep no ledger; nothing to port there.
- Not read: the ferry, beachhead and path branches of `find_something_to_kill` in outline only; city occupy helpers beyond the want formula; `daimilitary.c` callers (grep only); normal and hard fuzzy values; the paratrooper file `daiparadrop.c` beyond its function list.
