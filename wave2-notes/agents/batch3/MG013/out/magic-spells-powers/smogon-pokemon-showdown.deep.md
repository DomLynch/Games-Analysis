# smogon-pokemon-showdown (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/smogon-pokemon-showdown/data/conditions.ts` (sleep 47-82, confusion 162-197) with `sim/pokemon.ts` (trySetStatus 1669-1670, setStatus 1699-1731), `data/moves.ts` (move rows), `data/rulesets.ts` (Sleep Clause Mod 1379-1396), `sim/battle-actions.ts` (damage 1705, confusion self-hit 1843-1847), `sim/battle.ts` (randomizer 2397), `sim/prng.ts` (random 88-101) | Licence: MIT (`/mnt/frankendom-donors/smogon-pokemon-showdown/LICENSE` line 1 "The MIT License (MIT)"; code may be adapted) | TypeScript | symbol `Pokemon.trySetStatus` / `Pokemon.setStatus`

Checked: read conditions.ts 47-82 (sleep) and 162-197 (confusion) in full; pokemon.ts setStatus body 1669-1735 (the status-slot write, the SetStatus event and the start hook); rulesets.ts 1379-1395 (Sleep Clause Mod body; the 1417 stadium variant not read in full); battle-actions.ts 1700-1717 (base damage) and 1837-1850 (confusion damage); battle.ts 2395-2400 (randomizer); prng.ts 86-102 (random range). Move rows: opened moves.ts around 706-726 (Attract), 9220-9232 (Hypnosis), 19467-19476 (Thunderbolt); for those I read the fields, not the full callbacks. Not read: the Attract condition body past onStart, the "cant" message path, sleepUsable moves, the other four major statuses, Sleep Clause's stadium variant, Hypnosis accuracy effects beyond the row, PP use in the move-selection flow, the 'SetStatus' event for other abilities. Depth: thin. Confidence: high for the sleep and confusion countdowns, the one-status rule and the damage chain; medium for Sleep Clause (the rule body read; its interaction with the stadium variant not). camera_scope: not a camera cell.

Best transferable idea: A status is one row with a countdown held in the target's state, one major status per mon is enforced by re-passing the current status, and a PvP rule row (Sleep Clause) gates a sleep when a foe on the same side is already asleep.
Decision (proposed): adapt - take the countdown-per-status shape, the one-major-status rule and the Sleep Clause gate; take none of the Pokemon names, species, move or item data (the MIT licence covers this code, not the game's characters or data). Why: Frankendom's crowd control and mind effects need one status slot per fighter and a PvP limit on sleeping an opponent's side; this gives both with no new engine.
Acceptance: server test: a second sleep on a fighter who already has one is refused; with Sleep Clause on, a sleep from one side is refused while a living same-side fighter is asleep from the other side; a sleeping fighter loses 1 to 3 action attempts (start time 2 to 4, minus the waking attempt, which acts the same turn it wakes); a confused fighter's self-hit uses the same damage chain as a hit and is at least 1.

## 1. Mechanism

- Moves are rows. `data/moves.ts` holds one object per move keyed by id, with fields seen: `num`, `accuracy`, `basePower` (or a `basePowerCallback` function), `category` (Physical, Special, Status), `name`, `pp`, `priority`, `flags` (protect, mirror, metronome, reflectable, bypasssub), `status` (a major status id), `volatileStatus` (a volatile id), `secondary` (`chance` and a `status`), `target`, `type`. Receipt: moves.ts 9225 `name: "Hypnosis",`. Hypnosis row: accuracy 60, status 'slp', pp 20, flags reflectable (read at 9222-9229). Thunderbolt row: basePower 90, pp 15, secondary status 'par' at 10 percent (read at 19470-19476 and the secondary block). The numbers are read but not receipted, because the lines are under 15 characters.
- Statuses are rows with code hooks. `data/conditions.ts` has one object per status with `onStart`, `onBeforeMove`, `onEnd` functions and a countdown kept in `effectState`.
- Sleep (conditions.ts 47-82): onStart sets `startTime = random(2, 5)` (59) and `time = startTime`. onBeforeMove decrements `time` (71; the Early Bird ability decrements one more, 68-70, so it shortens sleep) and when `time <= 0` (72) cures the status through cureStatus and returns WITHOUT blocking (72-75), so the waking attempt acts. Otherwise the move is lost (`cant`) unless the move is flagged sleepUsable.
- Confusion (conditions.ts 162-197): a volatile. onStart sets `time = random(min, 6)` (174), with min 2, or 3 for Axe Kick. onBeforeMove decrements `time`; at zero the volatile is removed. Otherwise a `randomChance(33, 100)` roll (187) decides a self-hit, and the self-hit damage is `getConfusionDamage(pokemon, 40)` (191), a fixed base power of 40.
- One major status at a time: `trySetStatus` passes `this.status || status` (pokemon.ts 1670), so a mon that already has a status re-sends its own status id. `setStatus` then returns false at the same-id check (1699). The status slot is written at 1731, after the SetStatus event (1724) passes; a rule can veto the event by returning false.
- Sleep Clause Mod (rulesets.ts 1379-1396): on SetStatus for slp, if the source is not an ally of the target, the rule scans the target's side. If a living same-side mon is asleep and that mon's sleep source is not an ally of it (1394), the new sleep is refused, with the message "Sleep Clause Mod activated." (1395); the text at 1385 ("Sleep Clause Mod: Limit one foe put to sleep") is only the rule announcement in onBegin. A sleep whose source is an ally of the target returns early (1388-1390).
- Damage (battle-actions.ts 1705): `baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50)`, then modifiers, crit, then the randomizer (battle.ts 2395-2397, function `randomizer`): `tr(tr(baseDamage * (100 - this.random(16))) / 100)`. Since random(16) is an integer in [0, 16), the factor is 85 to 100 percent. Self-hit confusion damage (1843-1847): the same chain plus 2, truncated to 16 bits (1846, `let damage = tr(baseDamage, 16)`), then the randomizer (1847), then `Math.max(1, damage)` (read at about 1848-1850; not receipted).
- random(m, n) (prng.ts 88, 101) returns an integer in [m, n), so `random(2, 5)` gives 2, 3 or 4, and `random(min, 6)` gives min to 5.

### MG table (rows read)

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Hypnosis | Status move: sleep the target | sleep if the status slot is empty and immunity passes | accuracy 60 (row); PP 20 (row) | PP 20 (per use) | priority 0 (no cast time) | one major status; Sleep Clause Mod if on | moves.ts 9220-9229; rulesets.ts 1379-1396 |
| Sleep (status) | cannot act; wakes after a countdown | countdown = random(2, 5) on start (2, 3 or 4); -1 per move attempt; at 0 wake and act | 1, 2 or 3 lost attempts, then the waking attempt acts | - | per move attempt | one major status | conditions.ts 59, 71, 72 |
| Confusion (volatile) | 33 percent self-hit per turn while confused | countdown = random(min, 6); self-hit = confusion damage with BP 40 | min 2 (3 for Axe Kick); start time 2 to 5, so 1 to 4 attempts with a self-hit roll, then the volatile is removed and the move proceeds | - | per move attempt | one volatile per kind (not read) | conditions.ts 174, 187, 191; battle-actions.ts 1843-1847 |
| Damage chain | base damage for every damaging move | int chain: (2L/5+2) x BP x A / D / 50, then random 85-100 percent | BP as row; L, A, D from the mon | - | - | min 1 on self-hit | battle-actions.ts 1705, 1843-1847; battle.ts 2397 |

### Strategy coverage, items (a) to (i)

- (a) casting model: no cast time and no channel; moves go by priority (the priority field, default 0). Interrupt rules (hit, move, stun) were not read beyond the sleep and confusion checks. Stance and stamina: not present.
- (b) targeting: `target` field (for example "normal" on Thunderbolt and Hypnosis). Reflect (`reflectable` flag) and mirror (`mirror` flag) are flags on the row; the logic was not read.
- (c) status ladder: one major status per mon (pokemon.ts 1670, 1699). Sleep Clause is a per-side limit on sleeping an opponent's side (rulesets 1394). No general diminishing-returns ladder was found in the code read; not searched exhaustively.
- (d) mind effects: Attract (moves.ts 706-726) sets a volatile with a gender check (not the full logic). Hypnosis is the only sleep row read. No resist roll for sleep was found in the code read.
- (e) summons: not read.
- (f) dragons: none found in the code read.
- (g) schools and resistances: type field on rows (Psychic, Electric); the type chart was not read.
- (h) acquisition and (i) economy: not present in the code read (learnsets and items not opened).

Resource pools: PP per move (pp field), not per character. Health is hp per mon.

## 2. Key functions

- `conditions.slp` (sleep): `/mnt/frankendom-donors/smogon-pokemon-showdown/data/conditions.ts` 47-82 (59, 71, 72).
- `conditions.confusion`: same file, 162-197 (174, 187, 191).
- `Pokemon.trySetStatus` and `Pokemon.setStatus`: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/pokemon.ts` 1669-1735 (1670, 1699, 1724, 1731).
- Sleep Clause Mod: `/mnt/frankendom-donors/smogon-pokemon-showdown/data/rulesets.ts` 1379-1396 (1385 announcement, 1388 ally exemption, 1394 refusal check, 1395 message).
- Damage chain and self-hit: `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle-actions.ts` 1705, 1843-1847; randomizer `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/battle.ts` 2397; random range `/mnt/frankendom-donors/smogon-pokemon-showdown/sim/prng.ts` 88, 101.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Countdown in turns or attempts, random in a range | sleep random(2, 5) (conditions.ts 59); confusion random(min, 6) with min 2 or 3 (174) |
| Self-hit roll per turn | 33 in 100 (187) |
| Self-hit power and damage | base power 40 (191); plus 2 (1843); random factor 85-100 (battle.ts 2397) |
| Random range is half-open | random(m, n) in [m, n) (prng.ts 88, 101) |
| One status slot | re-send current status (pokemon.ts 1670) |
| Sleep Clause per side | refuse if a same-side mon sleeps from a foe (rulesets 1394) |

Donor comment versus code: conditions.ts line 58 reads "// 1-3 turns" above `random(2, 5)` (line 59), which gives a start time of 2, 3 or 4 under the half-open rule (prng.ts 88). Each attempt decrements first and the attempt that reaches 0 wakes and acts (72-75), so the lost attempts are 1 to 3: the comment is correct, not stale. Our sketch states the lost-attempt range in the data.

## 4. TypeScript sketch

simplified: the sketch keeps the sleep countdown, the one-status slot, the Sleep Clause gate (same-side sleep from a foe refused), the self-hit damage chain and the confusion countdown with its 33-in-100 roll. It keeps only sleep as a major status, omits the other five statuses, the SetStatus event hooks other than Sleep Clause, the immunity checks, abilities that change counts, the sleepUsable flag, the 'cant' message, the 16-bit truncation the donor applies to self-hit damage (battle-actions.ts 1846), and the stadium Sleep Clause variant.

```ts
// Licence: MIT (donor LICENSE). Clean-room sketch written from the described rules; no species, move or item data is used.
type Major = "none" | "sleep";
type Side = "A" | "B";

interface Mon {
  side: Side;
  hp: number;
  major: Major;
  sleepSourceSide: Side | null;  // which side put this mon to sleep
  sleepLeft: number;             // donor effectState.time: decremented on each move attempt; the attempt that takes it to 0 or less wakes the mon AND proceeds
  confusionLeft: number;         // donor volatile time: same shape (the attempt that takes it to 0 removes the volatile and proceeds); 0 = not confused
}

interface Rules {
  sleepClause: boolean;
}

// roll(min, max) returns an integer in [min, max), like the donor's random(m, n).
type Roll = (min: number, max: number) => number;

// simplified: the donor has six major statuses; this sketch keeps only sleep. It omits the SetStatus event hooks other than
// Sleep Clause, the immunity checks, abilities that change counts, the sleepUsable move flag and the 'cant' message.
// Sleep Clause here refuses a sleep on a side that already has a living mon asleep from the other side.
function trySleep(target: Mon, source: Mon, team: Mon[], rules: Rules, roll: Roll): boolean {
  if (target.hp <= 0 || target.major !== "none") return false; // one major status at a time
  if (rules.sleepClause && source.side !== target.side) {
    const foeAsleep = team.some(
      (m) => m.side === target.side && m.hp > 0 && m.major === "sleep" && m.sleepSourceSide !== m.side,
    );
    if (foeAsleep) return false;
  }
  target.major = "sleep";
  target.sleepSourceSide = source.side;
  target.sleepLeft = roll(2, 5); // [2, 5): startTime 2, 3 or 4, i.e. 1, 2 or 3 lost attempts, then the waking attempt acts
  return true;
}

// One move attempt by a sleeping mon: count down; at zero the mon wakes and the move GOES THROUGH (donor onBeforeMove cures the status and returns without blocking); otherwise the attempt is lost.
// "wakes" = acts this attempt; "asleep" = attempt lost; "awake" = was not asleep. earlyBird models the donor's extra decrement.
function sleepAttempt(m: Mon, earlyBird = false): "wakes" | "asleep" | "awake" {
  if (m.major !== "sleep") return "awake";
  if (earlyBird) m.sleepLeft -= 1;
  m.sleepLeft -= 1;
  if (m.sleepLeft <= 0) {
    m.major = "none";
    m.sleepSourceSide = null;
    return "wakes";
  }
  return "asleep";
}

// Self-hit damage: integer chain, plus 2, then a random factor of 85 to 100 percent; minimum 1.
// randomFactor is an integer in [0, 16), as the donor's random(16).
function selfHitDamage(level: number, atk: number, def: number, basePower: number, randomFactor: number): number {
  const tr = Math.trunc;
  const base = tr(tr(tr(tr((2 * level) / 5 + 2) * basePower * atk) / def) / 50) + 2;
  const scaled = tr(tr(base * (100 - randomFactor)) / 100);
  return Math.max(1, scaled);
}

// Confusion: count down per move attempt; while confused, a 33 in 100 roll hits the mon itself.
function confusedAttempt(m: Mon, percentRoll: number, hitDamage: number): number {
  if (m.confusionLeft <= 0) return 0;
  m.confusionLeft -= 1;
  if (m.confusionLeft <= 0) return 0;
  if (percentRoll >= 33) return 0;
  return hitDamage;
}

export {};
```

Typecheck: copied to `/tmp/mg013-showdown-status-ladder.ts` on the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020` (exit 0).

## 5. Lands in

- TARGET `src/fight/status.ts` (proposed new module; not checked against the Frankendom repo): one major status slot per fighter, countdowns in attempts, the PvP Sleep Clause gate on the server. Parity-checklist row 13 (specials). The hint was row 22 (Pit-only), which does not fit a world status system.
- Reuse tag: adapt-idea (MIT: code may be adapted; the Pokemon game data and names are not taken)
- Brief rule served: 1 (one engine: one status function); 3 (guard, stamina and stagger in the duel step, not here)

## 6. Gaps and risks

- The MIT licence covers this code. It does not cover the Pokemon characters, species, moves or names, which belong to other rights holders. Frankendom takes the rules and our own numbers only; no species, move or learnset data is imported.
- The donor's countdown is in move attempts, not seconds. At phone speed a 2-4 attempt sleep is a few seconds, and a 33 percent self-hit each turn is likely too punishing in a fast fight. These are our numbers to tune; the donor does not give a per-second value.
- Sleep Clause is a rule row (rulesets.ts 1379). Frankendom must decide where it applies: open-world PvP, the Pit, or both (ruling 1).
- The donor's Sleep Clause scans the target's side (1394) and exempts a sleep whose source is an ally of the target (the early return at 1388-1390). Check that exemption for our party and summon cases before use.
- Donor comment at conditions.ts 58 ("1-3 turns") is correct: start time 2 to 4, minus the waking attempt, gives 1 to 3 lost attempts. The sleep wake-turn rule (the waking mon acts that turn) and the Early Bird double decrement (68-70) are the real tuning surface.
- The donor truncates self-hit damage to 16 bits (battle-actions.ts 1846). Not reproduced; our damage values are far below that range.

## 7. As-data shape (pass 2)

- Donor tables: `data/moves.ts` (one object per move, keyed by id, about 21,000 lines), `data/conditions.ts` (one object per status or volatile, with functions), `data/rulesets.ts` (one object per rule).
- Move row fields (name: type): `num: int`; `accuracy: int or true`; `basePower: int` (or `basePowerCallback: function`); `category: "Physical" | "Special" | "Status"`; `name: string`; `pp: int`; `priority: int`; `flags: { name: 1 }` (protect, mirror, metronome, reflectable, bypasssub, and more); `status?: major status id`; `volatileStatus?: volatile id`; `secondary?: { chance: int; status: id }`; `target: string`; `type: string`; `zMove?: object`; `contestType: string`.
- Status row fields (name: type): `name: string`; `effectType: "Status"`; `onStart(target, source, effect)` (sets the countdown in `effectState`); `onBeforeMove(pokemon, target, move)` (counts down and blocks the move); `onEnd`. Countdown lives in the status state, not in the row.
- A new move is one row: yes, for a plain damage or status move using the existing fields. No, when the move needs a new hook (a callback such as basePowerCallback, or a new condition with functions). A new status is not a row: it needs functions (onStart, onBeforeMove), so it is code.

## 8. Provenance and history

- Repo: smogon-pokemon-showdown. Licence file: `/mnt/frankendom-donors/smogon-pokemon-showdown/LICENSE` (MIT, line 1 "The MIT License (MIT)").
- No history available: the donor copy has no `.git` (checked). No changelog was opened.
- Comments that record a change or a fix in the code read: sim/battle-actions.ts 1872 "FIXME: Change to species.name when champions comes" (not in this topic; not read further). conditions.ts 58 "// 1-3 turns" is correct (see section 3).

## 9. Rulings for Dom

1. Sleep Clause (one foe asleep per side at a time): on in open PvP and the Pit, or only in the Pit? Recommendation: on in open PvP.
2. Confirm the rule: we take the status rules only and no Pokemon names, species, moves or learnsets; the rules are our own rows. Recommendation: confirm.
3. Self-hit chance for confusion (donor 33 percent per turn): use the donor's 33 or tune it per zone as data? Recommendation: tune per zone, default lower than 33 for phone fights.

Reuse tag: adapt-idea (MIT; the Pokemon game data is not taken)
Brief rule served: 1 (one engine: one status function)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: WRONG (main claim).
- Sleep duration claim false: startTime random(2,5) = 2,3,4, but the attempt that takes time to 0 cures the status and returns without blocking (conditions.ts 72-75), so lost attempts are 1 to 3. The "// 1-3 turns" comment is correct, not stale. The sketch's sleepAttempt returned "wakes" without saying the move goes through.
- Confusion has the same shape: 1 to 4 self-hit rolls, not 2-5 attempts.
- Sleep Clause refusal check is at rulesets.ts 1394 (note said 1393); 1385 is the onBegin announcement, the refusal message is "Sleep Clause Mod activated." (1395); randomizer function starts at battle.ts 2395.
- Missed: wake-turn rule (waking mon acts that turn) and Early Bird double decrement (conditions.ts 68-70); Sleep Clause early return for ally source (1388-1390).

Fixed 2026-10-12: Acceptance, mechanism, MG table, donor-comment paragraph, gaps and history (comment is correct, 1-3 lost attempts); sketch comments and sleepAttempt (earlyBird flag, "wakes" = acts) also in work/showdown-status-ladder.ts; Sleep Clause line cites (1394/1395, ally exemption 1388-1390).
