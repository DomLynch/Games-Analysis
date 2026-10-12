# crawl-crawl (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc` (with player.cc, player-stats.cc, fight.cc, exercise.cc, defines.h) | Licence: GPL-2.0-or-later (top-level `/mnt/frankendom-donors/crawl-crawl/LICENSE`: "either version 2 of the License, or (at your option) any later version"; the file lists MIT, BSD, Apache and CC0 exceptions for named files and for most tiles) | C++ | symbol `_train_skills` (XP-pool split), with `exercise`, `reset_training`, `skill_exp_needed`, `get_real_hp`, `get_real_mp`, `player_regen`, `player_mp_regen`, `stat_modify_damage`

Checked: Read in full: skills.cc `reset_training` (775-858), `exercise` (860-878), `_level_up_check` (884-899), `train_skills` (1049-1098), `_train_skills` (1100-1243 incl. phase 1 and phase 2), `_train` (1618-1700 region; the target-cap helpers were read only as far as `_skill_points_for_target`), cost tables and thresholds (161-200, 2618-2660), `_scale_array` (596-630), `_cmp_rest` (581-584), `_init_queue` (466-480), `init_training` (661-677). Read in part: player.cc gain_exp (2905-2975, the pool feed only), get_real_hp (4412-4467), get_real_mp (4469-~4502, cut before the end), player_regen (1432-1460), player_mp_regen (1475-1495); player-stats.cc 276-300; fight.cc 1759-1780; exercise.cc 145-230. Not read: the generated species aptitude table (built from util/species-gen, not in the tree), the exp_needed XP table (player.cc 3910 onward), the skill() level reader, rest of get_real_mp, the armour-encumbrance penalties (player.cc ~6431-6447, comments only seen), and all callers of exercise() beyond the exercise.cc wrappers (no full grep). Confidence: high on the skill-training mechanism (read end to end); medium on the stat formulas (bodies read, callees such as wearing_jewellery and chei_stat_boost not read). Camera: not applicable.

## 1. Mechanism

Two linked halves. Use decides the weights; XP pays for the points.

(a) Use sets the weights. Every practice event calls `exercise(skill, degree)` (skills.cc:860). At skill level 27 it returns at once (862). Otherwise it pushes the skill onto the back of `exercises` only when the skill is trained (870-872), and always onto `exercises_all` (875). Each push pops the front, so both queues keep a fixed length of EXERCISE_QUEUE_SIZE = 100 (defines.h:145; asserted at skills.cc:479).

(b) `reset_training()` (775) turns the queue into percent weights, and only in auto-training mode (800). Each event in `exercises` adds the skill's train value (1 normal, 2 focus) (806). The `exercises_all` count is folded in with a max (818, 825). A focus skill whose weight is under 20, including 0, gets `5 * (5 - w/4)` added (838-842; a skill with no recent use gets +25). The array is then scaled to total 100 (848; `_scale_array` 596-630). In manual mode the weight is just the train setting (the first loop of reset_training).

(c) XP pays for points. `gain_exp` (player.cc:2905) adds the gained XP to total experience (for character level) and adds `10 * skill_xp` to the skill pool `you.exp_available` (player.cc:2968), then calls `train_skills` (player.cc:2970; `skill_xp` itself was not read). `train_skills` (1049) takes the point cost of the current cost level (`calc_skill_cost`, 169: 1 at cost level 1, 265 from cost level 24 to 27) and passes at most the XP up to the next cost level into `_train_skills` (1080-1083). The cost level moves with total XP (`calc_skill_cost_level`, 642; thresholds `skill_cost_needed` = XP table x 13, 161-163; 27 levels, 166).

(d) `_train_skills` (1100) splits that pool across the skills in two phases.
- Phase 1: each trained skill's share is `training% * pool / 100` (1128). If any one share is below the point cost, phase 1 is skipped (1129-1134) and the rest of the code uses the raw weights. Otherwise the skills are visited in shuffled order (1148). Each one buys while its share covers the cost (1155); the bought XP leaves both the share and the pool (1157). The unspent part of the share stays in the pool.
- Phase 2: while the pool covers the cost, pick a skill by weighted random choice over the leftover shares (1184). If there are none, or phase 1 was skipped, pick by the training weights. Buy from the rest of the pool. The chosen skill's share is zeroed.

(e) One purchase (`_train`, 1618): points = min(2650, budget) / cost, so one raise spends at most 10 x 265 XP (1638-1639). The cost comes from the current cost level (1624). A skill whose points reach the level-27 threshold is set to training 0 and disabled (887-895).

(f) Points to levels: total points to reach level L are `25*L*(L+1)`, plus half of the same term for L minus each breakpoint 9, 18 and 26 that is below L (2625-2651). That total is multiplied by `2^(-apt/4)` (2620-2623, 2653-2657). So the global cost of a point depends on total XP, and the points needed per skill depend on its own aptitude.

Frankendom reading: one XP pool, a 100-event recent-use queue that says which skill the XP goes to, and a global cost that rises with total XP. The donor is random in phase 2 (see section 6).

## 2. Key functions

- `reset_training` (use queue to weights): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc` 775-858.
- `exercise` (practice event, queue push): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc` 860-878.
- `train_skills` (cost level window): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc` 1049-1098.
- `_train_skills` (phase 1 and phase 2 split of one pool): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc` 1100-1243.
- `_train` (one purchase, spend cap): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc` 1618-1700 region.
- `_scale_array` and `_cmp_rest` (scale to 100 with rounding): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc` 581-630.
- `_get_skill_cost_for` / `skill_exp_needed` (points to level): `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/skills.cc` 2625-2657.

## 3. Numbers vs mechanism

Reusable algorithm vs game-specific constants:

| Reusable algorithm | Game-specific constants |
|---|---|
| One XP pool, split by a percent weight per skill, phase 1 by share then phase 2 by weighted draw | Phase 1 skip when one share is below one point's cost (skills.cc:1134) |
| Weights come from the last N practice events, focus counts double and gets a floor | Queue of 100 (defines.h:145); focus train value 2 (806); focus floor when under 20 (838-841) |
| Global cost per point that rises with total XP | 27-step table 1..265 (skills.cc:171); level steps at XP table x 13 (163) |
| Per-skill points to level: quadratic with breakpoints, scaled by aptitude | 25*L*(L+1), breakpoints 9/18/26 (2627, 2634, 2645); factor 2^(-apt/4) (2622) |
| Cap per purchase | 10 x 265 = 2650 XP (1638; MAX_SPENDING_LIMIT 265 at skills.cc:52) |
| Hard cap | Level 27 (defines.h:143; skills.cc:862 and 887) |

Stat and skill table (SK-FOCUS format: name | what it does | formula | number ranges | caps | file:line). Values are from the code as read; "computed" means worked out by hand from the formula, not run.

| Name | What it does | Formula | Number ranges | Caps | file:line |
|---|---|---|---|---|---|
| Strength (melee multiplier) | Scales damage for weapons that use strength | `max(1.0, 75 + 2.5*str) / 100` (computed: str 0 = 0.75x, 10 = 1.00x, 20 = 1.25x, 30 = 1.50x, -30 = 0.01x) | str about -30 to 30 in the formula; no upper limit in this function | floor 0.01x from the max(1.0, ...) term | fight.cc:1759-1769 (comments 1761-1764, line 1768) |
| Dexterity (melee multiplier) | Same formula for weapons that use dex instead (the comment names short and long blades and ranged weapons) | same formula with dex | same | same floor | fight.cc:1759-1769; the choice is weapon_uses_strength (not read) |
| Strength / Intelligence / Dexterity modifier | Adds bonuses to the stat from gear, form, mutations and divine stamina | Ego of that stat gives +3 per armour piece (player-stats.cc:288); each ring of that stat adds the wearing_jewellery count (291; whether it sums enchantments is not read); artefacts, form and mutations added (not read in full) | not read | none in these functions | player-stats.cc:276-300 |
| Max HP | Sets maximum hit points from level, Fighting and species | `(XL*11/2 + 8 + perm_adj + XL*(5*Fighting)/70 + (3*Fighting+1)/2)` (the donor reads skill(FIGHTING, 5) and skill(FIGHTING, 3): the skill level at scale 5 and scale 3, so the terms are XL*5F/70 and (3F+1)/2), then `* (10 + species HP mod) / 10`, plus 4 per flat-HP mutation, then robust and frail percentages (computed: XL 1 with Fighting 0 gives 13 before species; XL 27 with Fighting 0 gives 156 before species) | XL 1 to 27 (level table); species mod not read | min 1 | player.cc:4416-4427 (4423-4424) |
| Max MP | Sets maximum magic points from level and the two casting skills | `min(XL,23) + highest + min(8, min(highest, XL))/2`, where highest = max(Spellcasting, Invocations/2), then high-magic / low-magic percent, then species MP mod, then mp_max_adj, then 9 per ring of magical power (computed: XL 27 with Spellcasting 10 and Invocations 0 gives 37 before species and items) | XL term stops at 23 | XL term capped at 23 (player.cc:4480); the stepdown line is commented out | player.cc:4469-4500 |
| HP regen | Points of regeneration per turn; the unit is set by the caller (not read) | `20 + max_hp/6`, plus item pips; zero if sick or regeneration is inhibited; Trog's Hand adds 100 (computed: max HP 156 gives 46) | max HP 1 and up | none seen | player.cc:1432-1460 (1437, 1453) |
| MP regen | Points of mana regeneration | `7 + max_mp/2`; doubled with the mana regeneration mutation; +40 per amulet of mana regeneration (computed: max MP 37 gives 25) | not read beyond these terms | none seen | player.cc:1475-1495 (1480, 1489-1490) |
| Stamina, poise, stun pools | Not found | grep of player.cc, player-stats.cc and skills.cc found only "divine stamina" (a buff), no stamina or poise pool | n/a | n/a | not found |
| Luck | Not found as a player stat | no player luck stat found; a MUT_LUCKY mutation exists (mutation-data.h:265), its effect not read | n/a | n/a | mutation-data.h:265 |
| Skill cost per point | Price of one skill point at the current cost level | table `1,2,3,4,5,7,8,9,13,22,37,48,73,98,125,145,170,190,212,225,240,255,260,265,265,265,265` for levels 1..27 | 1 to 265 | table ends at level 27 (265) | skills.cc:169-171 (table starts at 171) |
| Cost level | Global step that raises the price of points with total XP | 27 steps, each at `skill_cost_needed(L) = exp_needed(L,1) * 13` total XP | steps 1..27; XP table not read | cap 27 | skills.cc:161-166, 642-660 |
| Skill points to reach level L | Total points for a level | `25*L*(L+1)` plus half of `25*(L-b)*(L-b+1)` for each breakpoint b in {9,18,26} below L, times `2^(-apt/4)` (computed at apt 0: L1 50, L9 2250, L10 2775, L18 9675, L19 10900, L26 22275, L27 24325) | L 1 to 27 | cap 27 | skills.cc:2620-2657; table 2625-2651 |
| Aptitude | Per-skill, per-species cost multiplier on points | factor `2^(-apt/4)`: apt 0 = x1, apt 4 = x0.5, apt -4 = x2; species table generated at build (not read) | not read | none seen | skills.cc:2620-2623, 2659-2686 |
| Skill level cap | Highest level | 27 | 0 to 27 | hard cap 27 | defines.h:143; skills.cc:862, 887 |
| Practice queue | Recent-use history that sets weights | 100 events; weight per event 1 normal, 2 focus | queue of 100 | fixed length | defines.h:145; skills.cc:479, 806, 872-875 |
| Focus floor | Lifts a focus skill with little recent use | if a focus skill has weight w in [0, 20): w + 5*(5 - w/4) (w = 0 gives 25) (computed: raw result 21 to 28 before scaling to 100; the comment's "20%" is not a guaranteed share) | w 0 to 19 | none | skills.cc:838-841 |
| Weapon-practice chance | Chance one melee hit trains the weapon | `x_chance_in_y(damage, 20)`, so weapon damage/20 | damage property not read | none | exercise.cc:193 (also 180-196) |
| Weapon-delay practice degree | Practice points per training event for a slow weapon | `1 + round(2*(mindelay - skill)/mindelay)`: skill 0 gives 3, skill at mindelay gives 1 (computed) | 1 to 3 | none | exercise.cc:145-158 |
| Dodge practice | Trains dodging when attacked | `one_chance_in(6)` per attack | 1 in 6 | none | exercise.cc:216-219 |
| Armour practice | Trains armour when hit | coin flip, then `random_range(1, 2)` | 1 to 2 points | none | exercise.cc:223-227 |
| Fighting practice (when hit) | Trains Fighting when hit | coin flip (after the armour flip), then 1 point | 1 point | none | exercise.cc:228 |
| Weapon damage by skill | Scales damage by weapon skill | `damage * (2500 + sklvl') / 2500`, with sklvl' = `maybe_random2(sklvl + 1, random)` where sklvl = skill at scale 100: a random 0..sklvl per hit when `random` is set (fight.cc:1777), not the flat skill (scale semantics of skill() not read, so the per-level step is not computed) | level 0 to 27 | level cap 27 | fight.cc:1774-1780 |
| Armour encumbrance | Penalties for worn body armour and shield | comment text only (not read) | not read | not read | player.cc ~6431-6447 |

Not read in this pass (outside the skill and stat mechanisms): block, parry, roll and dodge windows, damage types vs armour, crit, hit location, bleeding, armour per slot, crowd control, carry weight. These need a second pass if Strategy wants them.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: phase 1 by share (shuffled), a whole-share skip rule, phase 2 by weighted draw, a 27-level stop, and the 10 x 265 spend cap per purchase. It omits training targets, manuals, crosstraining, distributed-training and innate-caster modes, the second queue (exercises_all), the Gnoll path, the cost-level loop (the caller passes the pool up to the next level), and the donor's empty-queue fallback (reset_training 829-834: when no skill was exercised recently every trained skill gets its train setting, 1 or 2, as weight; the queue helper here returns zeros). It also changes one donor defect: the +1 rounding goes to the largest remainders, not the smallest (section 6).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const MAX_LEVEL = 27;            // skills stop at 27
const SPEND_CAP = 10 * 265;      // one raise spends at most this much XP
const COST_BY_COST_LEVEL = [1, 2, 3, 4, 5, 7, 8, 9, 13, 22, 37, 48, 73, 98, 125,
  145, 170, 190, 212, 225, 240, 255, 260, 265, 265, 265, 265];   // cost level 1..27

interface Skill {
  id: string;
  points: number;                // skill points banked
  train: 0 | 1 | 2;              // 0 off, 1 normal, 2 focus
  weight: number;                // training share, percent, from the practice queue
  apt: number;                   // aptitude; 0 = neutral, higher = cheaper
}

// Total XP threshold to reach level lev (not the cost of one step).
function thresholdXp(lev: number, apt: number): number {
  const modulo = (l: number) => 25 * l * (l + 1);
  let t = modulo(lev);
  for (const bp of [9, 18, 26]) {
    if (lev <= bp) break;
    t += modulo(lev - bp) / 2;
  }
  return Math.floor(t * Math.pow(2, -apt / 4));
}

interface Rng {
  shuffle<T>(a: T[]): T[];
  weighted(w: number[]): number;  // index, or -1 when all weights are zero
}

// Splits one XP pool across skills. Phase 1 gives each trained skill its weight
// share of the pool (random order); phase 2 spends what is left by weighted draw.
// Returns points gained per skill id and mutates skill.points / skill.train.
// simplified: the caller passes only the XP up to the next cost level (donor train_skills).
// Omitted: training targets, manuals, crosstraining, distributed-training and innate-caster modes,
// and the second practice queue (exercises_all). The donor's point-spend also has a target cap; here none.
function spendPool(pool: number, costLevel: number, skills: Skill[], rng: Rng): Map<string, number> {
  const cost = COST_BY_COST_LEVEL[costLevel - 1];
  const gained = new Map<string, number>();
  let left = pool;

  // Buys as many points as the budget allows (capped at SPEND_CAP per raise). Returns XP spent.
  const bump = (s: Skill, budget: number): number => {
    const n = Math.floor(Math.min(SPEND_CAP, budget) / cost);
    if (n <= 0) return 0;
    s.points += n;
    gained.set(s.id, (gained.get(s.id) ?? 0) + n);
    if (s.points >= thresholdXp(MAX_LEVEL, s.apt)) s.train = 0;   // stop at 27
    return n * cost;
  };
  const live = (s: Skill) => s.train !== 0 && s.weight > 0;

  const shares = new Map<Skill, number>();
  let skipPhase1 = false;
  for (const s of skills) {
    if (!live(s)) continue;
    const x = Math.floor((s.weight * pool) / 100);
    if (x < cost) { skipPhase1 = true; break; }   // donor: one short share skips phase 1 entirely
    shares.set(s, x);
  }

  if (!skipPhase1) {
    for (const s of rng.shuffle([...shares.keys()])) {
      let budget = shares.get(s) ?? 0;
      while (budget >= cost && live(s)) {
        const spent = bump(s, budget);
        if (spent === 0) break;
        budget -= spent;
        left -= spent;
      }
      shares.set(s, budget);     // unspent share stays in play for phase 2
    }
  }

  // Phase 2: weighted draw over leftover shares; if none, over training weights.
  while (left >= cost) {
    const live2 = skills.filter(live);
    const leftWeights = skipPhase1 ? [] : live2.map(s => shares.get(s) ?? 0);
    let s: Skill | undefined = undefined;
    if (!skipPhase1) {
      const idx = rng.weighted(leftWeights);
      if (idx >= 0) s = live2[idx];
    }
    if (!s) {
      const idx = rng.weighted(skills.map(x => (live(x) ? x.weight : 0)));
      s = idx >= 0 ? skills[idx] : undefined;
    }
    if (!s) break;
    const spent = bump(s, left);
    if (spent === 0) break;
    left -= spent;
    shares.set(s, 0);
  }
  return gained;
}

// Practice queue -> training weights. Each event adds its train value (1 normal, 2 focus).
// A focus skill under 20 gets 5 * (5 - w/4) added (donor reset_training). Then scale to 100
// so the weights sum to exactly 100. Donor _scale_array (skills.cc 629) gives the +1 to the
// SMALLEST remainders first (ascending sort); this sketch fixes that: LARGEST remainders first.
// simplified: the second queue (exercises_all, max with the first) is omitted.
function weightsFromQueue(queue: { id: string; train: 1 | 2 }[], ids: string[], focus: Set<string>): Map<string, number> {
  const raw = new Map<string, number>(ids.map(id => [id, 0]));
  for (const e of queue) raw.set(e.id, (raw.get(e.id) ?? 0) + e.train);
  for (const id of focus) {
    const w = raw.get(id) ?? 0;
    if (w < 20) raw.set(id, w + 5 * (5 - Math.floor(w / 4)));
  }
  const total = [...raw.values()].reduce((a, b) => a + b, 0);
  const out = new Map<string, number>(ids.map(id => [id, 0]));
  if (total === 0) return out;
  const rests: [string, number][] = [];
  let sum = 0;
  for (const [id, v] of raw) {
    if (v <= 0) continue;
    out.set(id, Math.floor((v * 100) / total));
    sum += Math.floor((v * 100) / total);
    rests.push([id, (v * 100) % total]);
  }
  rests.sort((a, b) => b[1] - a[1]);
  for (const [id] of rests) { if (sum >= 100) break; out.set(id, (out.get(id) ?? 0) + 1); sum++; }
  return out;
}
```

Best transferable idea: a fixed 100-event recent-use queue sets each skill's share of one XP pool, so what the player does decides where the XP goes, under one global cost curve.
Decision (proposed): adapt — keep the queue-to-weights split and the global cost ladder; change the phase-2 random draw to a seeded server pick and fix the rounding order, because server-verified kills need a replayable result.
Acceptance: a server test with a fixed queue of 75 sword and 25 dodge events and a 1,000 XP award at a fixed 10 XP per point gives sword 75 points and dodge 25 points (within one point), and the same seed repeats the same split.

## 5. Lands in

- TARGET `src/fight/skills.ts` (new module, proposed): the use queue, the weight function and the XP split; the fight step only reports the events. Stats and derived numbers (HP, MP, regen, strength and dexterity multipliers) would sit beside it in `src/fight/stats.ts` (proposed, not read for the Frankendom side).
- Parity-checklist row 21 (catalogue fields): the cost ladder, cap 27, queue length 100, spend cap and aptitude factor are catalogue fields, not per-zone data.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one ledger: one XP pool, numbers as data fields); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not a translation.
- Defect, rounding order: `_cmp_rest` (skills.cc:581-584) sorts ascending and `_scale_array` (629, then the loop) adds the +1 to the smallest remainders first. The textbook rule gives it to the largest. Keep the idea, fix: sort descending (the sketch does). Effect is at most one point of weight per skill.
- Phase 2 is a random draw (`random_choose_weighted`, 1184). Frankendom's kills and XP are server-verified and need a replayable record (parity row 19 is the fight record). Fix: take a seeded server pick, not the client RNG.
- Phase 1 skip rule: one share below the point cost drops phase 1 for every skill and falls back to raw weights (1129-1134). It is a design choice, not a bug, but it is a discontinuity: a small change in the pool can flip the mechanism. Test it with a fixture around the threshold.
- The focus floor comment (the "20%" claim) does not match the arithmetic: the raw weight is lifted to 21-28, and the share after scaling depends on the other skills. Fix: state the floor as a share after scaling, in the catalogue.
- Callers: the exercise.cc wrappers were read (145-230). The full list of exercise() callers across the tree was not enumerated, so "every practice event" is only true for the wrappers read.
- Skill points are the currency and the level is derived from them; the level reader (`skill()`) was not read, so the exact level-from-points mapping is not confirmed.
- One ledger: the donor's pool is one XP number; Frankendom must keep the same ledger for kill XP (row 18) and the skill pool, with a test that the sum matches.
- Magic and mental stats: this donor has Spellcasting and Invocations feeding max MP (player.cc:4480-4500). Frankendom's mana and focus are a separate pool; the donor's MP term is a useful shape (level term plus the best casting skill) but the numbers are DCSS's.
- Stamina, poise and luck: not present in the donor (section 3). Do not claim them as DCSS mechanisms.

Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Max HP formula used the wrong skill scaling: real player.cc:4423-4424 is XL*skill(FIGHTING,5)/70 + (skill(FIGHTING,3)+1)/2. Confirmed on the donor. Worked values used Fighting 0 and still hold.
- Focus floor applies to any focus skill with weight under 20 including 0 (skills.cc:838-842, +25); the table and sketch said (0,20) and w>0. Confirmed on the donor.
- Missed: reset_training empty-queue fallback (829-834) was only in the sketch caveat; apply_weapon_skill uses maybe_random2(sklvl+1) (fight.cc:1777), a random per-hit factor. Confirmed.

Fixed 2026-10-12: corrected the Max HP formula and file:line; focus floor now covers weight 0 in the mechanism, table and sketch (work/crawl-skill-pool.ts updated, typechecked); stated the empty-queue fallback and the per-hit random weapon-skill factor.
