# openmw (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/combat.cpp` (aggression rule), `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/actors.cpp` (per-frame engage loop and `Actors::engageCombat`), `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/mechanicsmanagerimp.cpp` (`awarenessCheck`), `/mnt/frankendom-donors/openmw/components/misc/timer.hpp` (engage timer) | Licence: GPL-3.0 (`/mnt/frankendom-donors/openmw/LICENSE`, "Version 3, 29 June 2007"; clean-room, shape only) | C++ | symbols `isAggressive`, `getFightTerm`, `Actors::engageCombat`, `MechanicsManager::awarenessCheck`, `DeviatingPeriodicTimer::update`

Checked: Read in full: `combat.cpp` 540-660 (`getFightTerm`, both biases, `isAggressionCapable`, `isAggressive`); `actors.cpp` 612-800 (`Actors::engageCombat`, to its end at about 800); `actors.cpp` 1535-1650 (the per-frame loop that drives the engage timer and the engage call); `mechanicsmanagerimp.cpp` 1601-1672 (`awarenessCheck`, the whole roll); `components/misc/timer.hpp` (whole file); `actor.hpp` 52-82. The hint file `aisetting.hpp` is only the enum (Hello, Fight, Flee, Alarm); it holds no logic. Callers of `isAggressive`: `actors.cpp` 740 (the engage path, read) and `actors.cpp` 2314, `mechanicsmanagerimp.cpp` 1563, `mwdialogue/filter.cpp` 671 (grep only, not read). The only call site of `engageCombat` in `apps/` and `components/` is `actors.cpp` 1631 (grep, and read). Default GMST values come from `apps/opencs/model/world/defaultgmsts.cpp` (the editor's defaults; the game's own values come from the game data, not read). Not read: `Rng::deviate` body (declaration at `components/misc/rng.hpp` 47 only), `canFight` (`aicombataction.cpp` 378), `isTargetMagicallyHidden`, `startCombat` body, `getDerivedDisposition`, `iWerewolfFightMod` value, the awareness cache (`getAwarenessRoll`). Confidence: high on the aggression threshold and the order of the awareness check; medium on what happens after `startCombat` (not read).

## 1. Mechanism

Two gates decide whether an NPC starts a fight. The first is a threshold; the second is a stealth roll. Both run inside one per-actor loop that is sampled, not run every frame.

(a) Sampling. Each actor owns an engage timer, a `DeviatingPeriodicTimer` with period 1.0 s and deviation 0.25 s (actor.hpp 77-78). Every frame `updateEngageCombatTimer(duration)` counts down (timer.hpp 26-28). When it elapses, the timer redraws its next period as `Rng::deviate(period, deviation)` (timer.hpp 32) and reports Elapsed (33). The per-frame loop calls `engageCombat(actor, other)` for every other actor only on that Elapsed frame (actors.cpp 1620, 1631-1632), and only for actors inside the processing range (`inProcessingRange`, read at 1618) while AI is active.

(b) Pair checks in `Actors::engageCombat` (actors.cpp 615-800). Early exits, in order: actor1 dead or already in combat with actor2 (619); actor2 dead; distance beyond the processing range, compared squared (631). Then the ally rules (645-672; skipped when actor1 has a Calm effect, 645). An ally whose recorded hit attempt was by actor2 makes actor1 start combat at once through `startCombat`, bypassing the awareness roll and the aggression test (660-664); an ally merely in combat with actor2 only sets `aggressive` (669-670), which still goes through the awareness roll. Then the mutual-combat rule (actor2 and an ally of actor2 both in combat with actor1, 679-705), `isTargetMagicallyHidden` and `canFight` (706-710), and the follower rule (715-731), which runs only when the game setting `mFollowersAttackOnSight` is on (715). Only after that comes the aggression test.

(c) Aggression test (actors.cpp 733-741). It runs only when actor2 is the player or a player follower or escort, and actor1 is not itself a player follower: `aggressive = isAggressive(actor1, actor2)` (call at 740; the enclosing test starts at 733). A player follower or escorter is itself an NPC, so this threshold does also decide some NPC-against-NPC pairs (actor1 a non-follower, actor2 a follower of the player); that is why `isAggressive` has an NPC-vs-NPC werewolf branch. Other NPC pairs are decided by the ally, mutual-combat, follower and guard rules only. A Guard rule (744-790) makes guards aggressive toward a creature or werewolf that is already in combat, inside `fAlarmRadius`, when the target's `getFightTerm(actor2, player) >= 100` (creatures) or it is a werewolf (NPCs).

(d) Threshold (combat.cpp 623-647). If actor1 already fights target, return true (625-626). Otherwise return false if actor1 cannot be aggressive (629; immobile, or under a Calm effect, 605-621). Else `fight = getFightTerm(actor, target)` (633). For NPC vs NPC (the player counts as an NPC) with a werewolf target, add `iWerewolfFightMod` (634-644); the target counts as a werewolf if its stats say so, or if it is the player and the global `sPCKnownWerewolf` is set (636-638). Return `fight >= 100` (646).

(e) The term (combat.cpp 556-562, 574, 595). `getFightTerm` = the actor's Fight AI setting (modified value) + `int` of (distance bias + disposition bias). Distance bias = `iFightDistanceBase - fFightDistanceMultiplier * d`, where d is the aggro distance (582, 595; ignores Z when the actor can move on Z, 598-602). Disposition bias = `(50 - disposition) * fFightDispMult` (574). Disposition is the NPC's derived disposition; creatures use a fixed 50 (559). Clamp: where the mechanics manager changes the Fight setting, it is clamped to 0-100 (mechanicsmanagerimp.cpp 669 and 710; the other places that change it were not read).

(f) Stealth roll (mechanicsmanagerimp.cpp 1601-1671). Only after aggression is set and LOS holds (actors.cpp 793-797): `los = getLOS && awarenessCheck(actor2, actor1)`. `x = sneakTerm * distTerm * fatigueTerm + chameleon`, plus 100 if invisible (1639-1641). `sneakTerm` is 0 unless the target is sneaking (1611, and 1627 when sneaking). `distTerm = fSneakDistanceBase + fSneakDistanceMultiplier * distance` (1635). `y = obsTerm * observerFatigue * (fSneakNoViewMult if the observer faces away by more than 90 degrees, else fSneakViewMult)` (1649, 1661-1664), with `obsTerm = obsSneak + 0.2*agility + 0.1*luck - blind`. `target = x - y` (1667). The check passes when `roll0to99 >= target` (1671), or against the cached roll when `useCache` is set (1669). A target that is not sneaking and not invisible has x = chameleon, so with a non-negative observer term the target is at or below 0 and the roll always passes (hand arithmetic from these lines).

(g) Result: if aggressive and the roll passes, `startCombat(actor1, actor2, allies)` (actors.cpp 797-798, not read past the call).

## 2. Key functions

- `getFightTerm`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/combat.cpp` 556-563. The sum of the setting and the two biases, truncated to int.
- `isAggressive`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/combat.cpp` 623-647. Already-in-combat shortcut, capability, werewolf bonus, threshold 100.
- `Actors::engageCombat`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/actors.cpp` 615-800. Early exits, ally and combat-chain rules, the aggression test (740), the guard rule, and the LOS plus awareness gate (793-797).
- Per-frame loop: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/actors.cpp` 1588 (timer update) and 1620-1632 (elapsed check and pair loop).
- `MechanicsManager::awarenessCheck`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/mechanicsmanagerimp.cpp` 1601-1672.
- `DeviatingPeriodicTimer::update`: `/mnt/frankendom-donors/openmw/components/misc/timer.hpp` 20-36.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Aggro is one integer threshold: a base aggression value, plus a distance bias that falls with range, plus a disposition bias, reaching 100 | Threshold 100 (theirs, combat.cpp 646) |
| Distance bias falls linearly with range | Base 20 (default, `iFightDistanceBase`, defaultgmsts.cpp 1922); slope 0.005 per unit (default, `fFightDistanceMultiplier`, defaultgmsts.cpp 1727); distance is in game units |
| Disposition bias is zero at 50 and grows as the NPC likes the player less | Multiplier 0.2 (default, `fFightDispMult`, defaultgmsts.cpp 1726), applied as (50 - disposition) * 0.2 (combat.cpp 574) |
| Creatures have no disposition, so they use 50 | Fixed 50 (theirs, combat.cpp 559) |
| A stealth roll gates the aggression: distance, sneak skill, observer skill, facing | Facing multipliers: 0.5 away (default, defaultgmsts.cpp 1804), 1.5 in view (default, defaultgmsts.cpp 1809); sneak distance base 0.5 and multiplier 0.002 (defaults, defaultgmsts.cpp 1802-1803) |
| Sampled decision: each actor re-checks on a jittered timer, not every frame | Period 1.0 s, deviation 0.25 s (theirs, actor.hpp 77) |
| Processing range gate on both the actor and each pair | Setting clamped to 3584-7168 (theirs, `components/settings/categories/game.hpp` 31); the default value was not read |

Worked check by hand (my arithmetic, not from the donor): a Fight setting of 80, an NPC at distance 0 (bias 20 - 0.005*0 = 20), disposition 50 (bias 0) gives 80 + 20 = 100, which is aggressive before the stealth roll. The same NPC at distance 2000 gives 20 - 10 = 10, so 80 + 10 = 90, not aggressive.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the aggression test (already in combat, capability, threshold, then the stealth roll) and the sampled engage timer. The sketch's `targetIsWerewolf` is the caller's combined test (donor 634-638: an NPC-class target that is a werewolf, or the player with the known-werewolf global set); a creature target never adds the bonus. It omits the ally and combat-chain rules (including the Calm skip and the immediate `startCombat` of a hit ally), the mutual-combat rule, the follower rules, the guard rule, `canFight`, the magic-hidden check, the line-of-sight test, `startCombat`, the awareness cache, the sneak boot-weight term (the sketch takes `sneakTerm` as an input), and the NPC-only disposition lookup beyond the 50 fallback. The Rng is a callback; the donor's `Rng::deviate` body was not read.

```ts
// Licence: GPL-3.0 (donor LICENSE). Clean-room sketch of the mechanism only: a threshold aggression rule, then a stealth awareness roll.
interface Mob {
  isNpc: boolean;
  dispositionToPlayer: number; // 0-100; creatures use a fixed 50
  fight: number;               // aggression setting, 0-100 (donor: AiSetting::Fight, modified value)
  isDead: boolean;
  isMobile: boolean;
  calmed: boolean;
  isWerewolf: boolean;
}

interface AggroConsts {
  distanceBase: number;     // donor GMST iFightDistanceBase
  distanceMult: number;     // donor GMST fFightDistanceMultiplier
  dispMult: number;         // donor GMST fFightDispMult
  werewolfMod: number;      // donor GMST iWerewolfFightMod (value not read)
}

// Aggression term: the setting, plus a distance bias that falls with range, plus a disposition bias.
function fightTerm(actor: Mob, distance: number, c: AggroConsts): number {
  const disposition = actor.isNpc ? actor.dispositionToPlayer : 50;
  const distanceBias = c.distanceBase - c.distanceMult * distance;
  const dispositionBias = (50 - disposition) * c.dispMult;
  return actor.fight + Math.trunc(distanceBias + dispositionBias);
}

// Threshold rule: already fighting counts as aggressive; otherwise the term must reach 100.
// targetIsWerewolf: the target is an NPC-class actor (the player counts) that is a werewolf, or the player with the known-werewolf global set (donor 634-638).
function isAggressive(actor: Mob, targetIsWerewolf: boolean, inCombatWithTarget: boolean, distance: number, c: AggroConsts): boolean {
  if (inCombatWithTarget) return true;
  if (actor.isDead || !actor.isMobile || actor.calmed) return false;
  let term = fightTerm(actor, distance, c);
  if (actor.isNpc && targetIsWerewolf) term += c.werewolfMod;
  return term >= 100;
}

// Periodic engage timer with jitter (donor: DeviatingPeriodicTimer, period 1.0 s, deviation 0.25 s).
interface EngageTimer { timeLeft: number; }
function tickEngageTimer(t: EngageTimer, dtS: number, deviate: (mean: number, dev: number) => number): boolean {
  if (t.timeLeft > 0) { t.timeLeft -= dtS; return false; }
  t.timeLeft = deviate(1.0, 0.25);
  return true; // elapsed: this actor may now test every other actor
}

// Stealth roll. Non-sneaking actors have sneakTerm 0, so only chameleon and invisibility add to x.
interface Stealth { sneaking: boolean; sneakTerm: number; distTermBase: number; distTermMult: number;
  chameleon: number; invisible: boolean; fatigueTerm: number; }
interface Observer { obsTerm: number; fatigueTerm: number; facingAway: boolean; }

function awarenessPasses(s: Stealth, o: Observer, distance: number, roll0to99: number,
                         noViewMult: number, viewMult: number): boolean {
  const distTerm = s.distTermBase + s.distTermMult * distance;
  let x = (s.sneaking ? s.sneakTerm : 0) * distTerm * s.fatigueTerm + s.chameleon;
  if (s.invisible) x += 100;
  const y = o.obsTerm * o.fatigueTerm * (o.facingAway ? noViewMult : viewMult);
  return roll0to99 >= x - y;
}
```

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new module: the aggression threshold, the sampled engage timer and the stealth gate, called from the engine's fight loop; the Pit and zones only read the result). Parity-checklist row 4 (fight loop: aggro, chase, leash).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: many-on-one logic (who starts a fight) lives in the engine; engage is a state change, so the threshold sets the state and the client only shows it.

Best transferable idea: decide aggro as one integer threshold (aggression setting plus a distance bias plus a disposition bias, reaching 100), gated by a single stealth roll, and re-sample it on a jittered 1 s timer instead of every frame.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism; do not port the donor lines.
- The threshold is only used when the target is the player or one of the player's followers or escorters (an NPC, hence the NPC-vs-NPC werewolf branch at combat.cpp 634-644). Other NPC pairs are decided by ally and combat-chain rules and the guard rule (actors.cpp 647-790). Frankendom's many-vs-one rule must not assume one symmetric aggro formula for every pair.
- The engage decision is sampled every 1.0 s +/- 0.25 s per actor, so an NPC can wait up to about one period (1.0 s, plus the deviation if it is read as a bound; `Rng::deviate` body not read) before it starts a fight. Frankendom's fight loop needs an explicit latency choice; a duel may need the check every tick.
- The awareness roll is random (`roll0to99`) and the donor's cached roll is not read. Frankendom's replay and fight record (row 19) must seed or record the roll, or a replay will diverge.
- The donor has no attacker cap. MAX_ATTACKERS = 3 is a Frankendom ruling and must be added on top of the threshold; the donor does not show it.
- Distance constants use game units from the Morrowind data (base 20, slope 0.005). Frankendom must express the range in its own units as zone or character data and not copy the numbers.
- `startCombat` (the state change that follows) and the target-selection rule after it were not read. The donor's answer to "who is the target after aggro" is still open here.
- Fight and disposition here are NPC state the donor keeps per actor; Frankendom's one-ledger rule means the same values must sit in the one character record, not in a second store.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Claim 'NPC against NPC is never decided by this threshold' is false: actors.cpp 735 runs isAggressive when actor2 is a player follower/escorter (an NPC), which is exactly why isAggressive has the NPC-vs-NPC werewolf branch (combat.cpp 634-644). Follower rule (715-731) only runs when Settings mFollowersAttackOnSight (715), not stated. Ally rules (647-672) are skipped if actor1 has a Calm effect (645), and an ally's hit attempt calls startCombat at once, bypassing the awareness roll (660-664), while ally-in-combat only sets aggressive (669-670); note lumps both as 'pull actor1 in'. Werewolf bonus also fires for player when sPCKnownWerewolf global set (636-638). Numbers/line refs otherwise verified (GMST defaults, 1.0/0.25 timer, 3584-7168, 100 threshold).

**Missed:** awarenessCheck returns false at once if observer dead or disabled (1603-1604) and y stays 0 if observer has no base node (1656-1665); engage loop skips the player as engager (1629); disposition clamp in getDerivedDisposition (mechanicsmanagerimp 558-559).
