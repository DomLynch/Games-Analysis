# pmbstyle-L2Solo (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/States/HuntingState.js` | Licence: Apache-2.0 | JavaScript | symbol `findPreferredMonster / HuntingState.tick` at 98 (verified: `findPreferredMonster` opens at 98 and ends at 203; `tick` is the method at 492 and runs to 901). Opened in full this pass: HuntingState.js 1-210 and 480-902, and on the VPS `BotTargetScorer.js` (169 lines), `BotHuntingVisibility.js` (34) and `BotEncounterReadiness.js` (22), all under `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/`.

## 1. Mechanism

- `findPreferredMonster(session, bot, radius, options)` (98-203) is the target chooser of a bot hunting state. It takes NPCs within a radius and drops, in order: the excluded target, protected raid entities, targets blocked by hot-resource competition, non-huntable NPCs, and dead or non-attackable ones (103-108). It then keeps at most 96 candidates, or 32 when the actor is in the "visible" level-of-detail tier, by nearest distance (`limitTargetCandidates` 86-96, constants at lines 42-43).
- It scores each remaining candidate with `BotTargetScorer.score` over a context (141-168): distance, vertical gap, current-spot match, whether another solo bot has claimed it (`claimedTargetIds` 76-84: the current target of every other living solo hunter), the count of same-clan NPCs in the scan, the matchup against the bot or party (plus a survival check for a solo hunter), retry cooldown, levels, and the combat stats of bot and NPC.
- `BotTargetScorer.score` (lines 37-153) returns ineligible for: dead or not attackable, raid entity, retry cooldown, a failed matchup, level gap above +8 or below -7, vertical gap above 1200, and (for a solo hunter) a power ratio under 0.72. Otherwise the value starts at 1000 and loses distance / 10, 55 per level of gap, 110 more per level above +3, 35 more per level below -7, vertical gap / 4 and up to 500 for a power ratio below 1; it gains 180 for the same hunting spot and loses 140 outside it; it loses 450 if claimed, and 75 per same-clan ally (capped at 4, so more allies make a target less attractive); an incoming threat adds 1000; a blocked direct path loses 300 and a direct path gains 40 (the path flag was not set in the context built here). `BotTargetScorer.rank` (155-159) keeps eligible candidates with a score above 0, highest first.
- Ordering: if `readyOnly`, the ranked list is reordered to put candidates the bot is ready to fight first (readiness: `BotEncounterReadiness.evaluate`, HP needed 0.40 to 0.90 and mana needed 0.20 to 0.70 depending on level gap and the target's health). `HuntingVisibility.select` (BotHuntingVisibility.js 14-32) then checks line of sight on at most 4 candidates per call, in rank order, and returns the first visible one; if it ran out of checks it reports `pending` and resumes at the next candidate on the next call when the bot has moved less than 128 units. With `readyOnly`, a visible but unready first pick is NOT returned: the function returns null, and the readiness is stored on the session (187-193) so the caller can rest and recover. The chosen target's score and reasons are recorded on the session.
- `tick` (492-901) is the bot's hunting-state step, in this order: a pending town trip (493-496); a buff refresh trip (500-518); a restock trip when out of shots (520-524); a player-killer check within 1500 units, which either fights back (if `BotPvpRisk` says so) or flees (526-609); self-defence against a monster that is hitting the bot, with an emergency retreat at low resources (611-645); an emergency retreat during a live fight and voluntary rest when HP is under 35 % (or mana under 20 % for casters) and no fight is in flight (652-686); a spot relocation (691); a hunting-ground safety check for solo hunters that relocates to a better spot (693-720); a pending sweep (722); a 0.5 % per tick chance to go shopping, about ten minutes by the code comment (724-728); then the attack step (731-901).
- Attack step (731-814): with a current target, it first tries to fetch the target as a player (PvP, 733-743); if that fails it fetches an NPC (744). For an NPC it clears the target if it is a protected raid entity or dead (a dead one may trigger a corpse-summon skill and a victory line 20 % of the time); abandons it if the NPC is not aggroed on the bot and not visible; for a solo hunter not yet aggroed, rests if readiness fails; abandons it after 5 stalled ticks with no progress (`targetProgressing`, 5 ticks; the retry cooldown is 15 s); repositions if ranged; and, if another solo bot has claimed the target, switches to an unclaimed alternative found by a second `findPreferredMonster` call (797-807). Without a current target (815-899) it calls `findPreferredMonster` with a 2500-unit radius and, if found, assigns it and starts combat (and says a line 15 % of the time); if none is found it rests when the stored readiness failed, otherwise follows the leader (party companion), asks `DecisionService` for a spot move, and 50 % of the time wanders up to 2500 units from its start point toward a random spot with line of sight.
- Inputs: bot state, nearby NPCs, party state, other bot sessions. Outputs: a chosen target, scores, and a decision log. Tick: per bot tick.

## 2. Key functions

- `findPreferredMonster`: `HuntingState.js` 98-203. Candidate filter, scoring context, ranking, ready-first order, visibility pick.
- `limitTargetCandidates`: `HuntingState.js` 86-96. Nearest 96 (32 when visible tier).
- `claimedTargetIds`: `HuntingState.js` 76-84. Other living solo hunters' current targets.
- `BotTargetScorer.score`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/BotTargetScorer.js` 37-153. Eligibility and the score formula. `BotTargetScorer.rank`: same file 155-159.
- `HuntingVisibility.select`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/BotHuntingVisibility.js` 14-32. Batched line-of-sight pick (4 per call).
- `BotEncounterReadiness.evaluate`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/AI/BotEncounterReadiness.js` 5-20. HP and mana reserve before a voluntary fight.
- `HuntingState.tick`: `HuntingState.js` 492-901. Per-tick decision order (read in full).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Filter, then score each candidate on a context, then rank | Score weights: base 1000, distance / 10, level gap 55, danger 110 above +3, trivial 35 below -7, vertical / 4, spot +180 / -140, claimed -450, ally -75 (cap 4), threat +1000 (theirs, BotTargetScorer.js 82-133) |
| Hard eligibility gates before scoring | Level gap +8 / -7, vertical gap 1200, solo power ratio 0.72 (theirs, lines 1-4) |
| Keep an unready candidate as a fallback signal, prefer ready ones; pick none if the first visible is unready | Ready-first ordering (the rule); HP needed 0.40 to 0.90, mana 0.20 to 0.70 (theirs) |
| Bound the work: nearest N candidates, N line-of-sight checks per tick | 96 / 32 candidates, 4 checks per scan (theirs) |
| Claim flag: a target another hunter holds is penalised | Claimed set from shared session state; -450 (theirs) |
| Give up a target that makes no progress | 5 stalled ticks; 15 s retry cooldown (theirs) |
| Rest when low before the next fight | HP under 0.35, mana under 0.20 (theirs, lines 35-36 and 682) |
| Small random chance per tick to leave for a town trip | About 0.5 % per tick (theirs) |

## 4. TypeScript sketch

simplified: the matchup and survival checks, the raid and cooldown gates, the spot and path terms (kept as optional numbers), the power ratio (kept as a given number), the 96 / 32 candidate cap, the per-clan ally count (passed in), the pending-resume of the line-of-sight batch (the batch is kept but without resume state) and the whole `tick` order beyond its first steps are omitted.
```ts
// Licence: Apache-2.0 (donor). Lift permitted (BotTargetScorer.js 37-159, BotHuntingVisibility.js 14-32); this sketch is a re-expression, not a copy.
interface Cand {
  id: number; dead: boolean; attackable: boolean; levelGap: number; distance: number; verticalGap: number;
  claimed: boolean; allies: number; sameSpot: boolean | null; powerRatio: number | null; incomingThreat: boolean; ready: boolean;
}
interface Scored { c: Cand; eligible: boolean; score: number; }

// Score one candidate. Gates first, then 1000 minus penalties.
function score(c: Cand, solo: boolean): Scored {
  const no = { c, eligible: false, score: -Infinity };
  if (c.dead || !c.attackable) return no;
  if (!c.incomingThreat && (c.levelGap > 8 || c.levelGap < -7)) return no;
  if (c.verticalGap > 1200) return no;
  const ratio = solo ? c.powerRatio : null;
  if (!c.incomingThreat && ratio !== null && ratio < 0.72) return no;
  let v = 1000 - c.distance / 10 - Math.abs(c.levelGap) * 55;
  if (c.levelGap > 3) v -= (c.levelGap - 3) * 110;
  else if (c.levelGap < -7) v -= (Math.abs(c.levelGap) - 7) * 35;
  v -= c.verticalGap / 4;
  if (ratio !== null) v -= Math.max(0, 1 - ratio) * 500;
  if (c.sameSpot !== null) v += c.sameSpot ? 180 : -140;
  if (c.claimed) v -= 450;
  v -= Math.min(4, Math.max(0, c.allies)) * 75;   // more same-clan allies makes a target LESS attractive
  if (c.incomingThreat) v += 1000;
  return { c, eligible: true, score: Math.round(v) };
}

// Rank eligible candidates above zero, best first; with readyOnly, ready ones first. Check at most `checks` for line of sight.
function choose(cands: Cand[], solo: boolean, readyOnly: boolean, canSee: (c: Cand) => boolean, checks = 4): Cand | null {
  const ranked = cands.map((c) => score(c, solo)).filter((s) => s.eligible && s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.c);
  const ordered = readyOnly ? [...ranked.filter((c) => c.ready), ...ranked.filter((c) => !c.ready)] : ranked;
  for (const c of ordered.slice(0, checks)) {
    if (!canSee(c)) continue;
    return readyOnly && !c.ready ? null : c;   // an unready first pick is not returned: the caller rests
  }
  return null;
}
```

## 5. Lands in

- TARGET `src/fight/world.ts` (exists today: a creature chooses among players in reach by threat, nearest on a tie; `AGGRO_M`, `HOLD_M`, `MAX_ATTACKERS` 3), checklist row 4 (fight loop: aggro, chase, leash). This donor is a player-side bot's target chooser, so only two ideas transfer: the bounded work (nearest N, a few sight checks per tick) and the readiness gate before engaging (a creature profile that will not start a fight below a health reserve; catalogue AI knob, row 21).
- TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), checklist row 2 (AI brain): the ready-then-pick order, if a creature profile gains a "recover first" state.
- Reuse tag: adapt
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- Pit is a client and the donor is a bot that plays a player character on a live server; Frankendom has no bot players. Only the chooser shape and the readiness idea transfer.
- MAX_ATTACKERS = 3: the donor's claim penalty (-450) pushes bots onto different monsters, the opposite goal. Frankendom wants several creatures on one player up to a cap of three, with the rest holding at the ring; do not copy the claim rule for creature AI.
- Server-verified kills: the donor mixes `Math.random` (shopping, wandering, speech) into the tick and reads session state of other bots. Frankendom's creature choice must be a pure function of the verified tick state on the seeded stream.
- No hidden numbers: the score weights and readiness bands are tuned constants (about 15 numbers). If a creature ever uses a score, each weight is a catalogue field (row 21), not a code constant.
- One engine / zones as data: ground safety, spots and relocation (`BotHuntingGroundPolicy`, `SpotService`) are zone data in Frankendom; none of that was read beyond its call sites.
- The town trip, buff, restock and sweep steps are economy-side and out of scope here.
