# tmewett-BrogueCE (enemy-ai-behaviour, cell 2)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` | Licence: AGPL-3.0-or-later (donor Monsters.c header: "either version 3 of the License, or (at your option) any later version"; LICENSE.txt is the AGPL v3 text) | C | symbol `updateMonsterState`

Checked: Read in full: `updateMonsterState` (Monsters.c 1709-1823), `awarenessDistance` and `awareOfTarget` (1621-1683), `alertMonster` and `wakeUp` (1582-1606), `monstersTurn` from its top to the start of the wandering branch (3320-3527; the wandering branch and the rest of the function not read), `monsterFleesFrom` and `allyFlees` (2947-3017), `fleeingMonsterAwareOfPlayer` and `getSafetyMap` (2363-2393), the corridor rule in `monsterAvoids` (1493-1501), `scentDirection` head (2833-2880). Scent and clock: `updateScent` and `scentDistance` (Time.c 651-675), `currentStealthRange` (686-724), the per-turn block (2229-2372, the clock and map refresh lines), `addScentToCell` (Movement.c 2481-2486), `resetScentTurnNumber` (Time.c 2637-2646), `updateSafetyMap` (Time.c 1608-1700, read to the Dijkstra calls). Data: `creatureType` (Rogue.h 2171-2191) and `monsterCatalog` rows (Globals.c 1025, rows 1040-1100 sampled). Not read: the body of `scentDirection` after its first pass, `monsterBlinkToSafety`, `pathTowardCreature`, `monsterMillAbout`, `monstUseMagic`, the monster loop that calls `monstersTurn`, `decrementMonsterStatus` (the enrage countdown), `rand_range` (the RNG). Candidates opened: Monsters.c, Time.c, Movement.c, Combat.c, Math.c, Globals.c, Rogue.h, CHANGELOG.md, changes/803. Confidence: high on the awareness bands, the numbers and the flee thresholds; medium on the corridor rule (the enrage countdown not read). Verdict STRONG; depth full.

Best transferable idea: one clock stamps the player's trail and sets how stale it is, so a monster's perceived distance is trail age plus distance, and it loses the player on a three-band rule (inside awareness it holds the chase at 97% per tick, beyond three times awareness it drops at once) instead of on a timer.
Decision (proposed): adapt - take the three awareness bands and the 25% notice roll, use the stealth range as the awareness radius, refresh the scent field only for zones with a player inside (cost cap), seed the draws per creature, and add a band to the feared-enemy flee (donor: flee under 3, resume at 3, no gap) while keeping the near-death 25/75 band as it is.
Acceptance: A server test with a seeded RNG: a hunting creature whose perceived distance is inside awareness keeps the chase on 97% of ticks; beyond three times awareness it drops the player on the same tick; a near-death flee creature at 60% HP stays fleeing and recovers to tracking at 75% HP.

## 1. Mechanism

- States (`creatureState` values used in Monsters.c 1709-1823): sleeping, wandering, tracking (scent), fleeing, ally. `updateMonsterState` runs at the start of each monster turn (`monstersTurn`, Monsters.c 3320; it runs it before acting, at the top of the function).
- One clock. `playerTurnEnded` adds 3 to `rogue.scentTurnNumber` per player turn, or 10 while invisible (Time.c 2266-2268). Each turn, `updateScent` stamps every cell in the player's field of view with `clock - scentDistance` if that is fresher than the stored value (Time.c 659-675; Movement.c 2481-2486). `scentDistance` is double units: 2 x the major axis + the minor axis (Time.c 651-656), so a straight step costs 2 and a pure diagonal step costs 3.
- Perceived distance (`awarenessDistance`, 1621-1645): the clock minus the scent stamp under the monster (1632), so the older the trail under the monster, the further away it reads. If the player is in view, the direct scent distance is used when it is smaller (1636). Clamped to 1000; negative becomes 1000.
- Awareness (`awareOfTarget`, 1649-1683): `awareness = stealthRange * 2` (1651), in the same double units. Rules in order:
  - `MONST_ALWAYS_HUNTING`: always aware (1656-1657); `MONST_IMMOBILE` (turrets, totems): aware iff perceived distance is inside awareness (1658-1661). `updateMonsterState` also handles both before the chain: always-hunting goes straight to tracking (1716-1721), immobile goes to tracking or sleeping (1725-1733);
  - beyond `awareness * 3`: not aware (1662);
  - tracking monster: inside `awareness` it stays aware; beyond it, it stays aware with 97% chance per turn (1668);
  - not tracking and the player is not in view: not aware;
  - not tracking, in view, inside `awareness`: notices with 25% chance per turn (1678).
- The stealth range is refreshed each turn (Time.c 2487). It is 14 in light (Time.c 687-688), halved in darkness and again in shadow, plus armour, halved (rounded up) after resting, plus the aggravating status, minus stealth-ring bonuses, and never below 2 unless the player just rested (then 1 is possible); 1 when invisible (Time.c 686-724 read in full).
- State transitions (`updateMonsterState`, the else-if chain, in order):
  - wandering, aware, and in view: tracking (1757-1760; `alertMonster` 1582-1585 sets tracking and the last seen cell);
  - sleeping and aware: `wakeUp` (1587-1606): the monster and its teammates go to tracking, and each normal-mode teammate is set to tracking (non-ally waker only) and `updateMonsterState(teammate)` is called on it, and only SLEEPING or WANDERING teammates get at least 100 ticks (1587-1606);
  - tracking and not aware: wandering, and it heads for the last seen cell by waypoints (1769-1770; `wanderToward` 1699);
  - tracking and the nearest feared enemy is within 3 cells: fleeing (1771-1773);
  - flees-near-death monster at or below 3/4 HP: stays fleeing if it already flees, or starts fleeing at or below 1/4 HP (1775-1781);
  - fleeing, no magical fear, nearest feared enemy at 3 or more: tracking (1785-1788);
  - flees-near-death monster at or above 3/4 HP while fleeing: tracking (1803-1811).
- Fear is distance-based, not HP-based, except the near-death flag. `monsterFleesFrom` (2947-2985): ignores enemies that do not attack it; flees from invulnerable or weapon-immune defenders within 6 (2954); otherwise only within 3 (`dist >= 4` returns false, 2962); maintainers of distance and kamikaze targets are feared; poisoners flee when the target's poison exceeds its HP.
- Hunting step (`monstersTurn`, 3429-3491): a tracking monster casts or blinks first if it can (3436-3445), attacks an adjacent ally when it is not adjacent to the player (3446 onward), then steps up the scent gradient (`scentDirection`, called at 3475). If no neighbour is fresher and the monster is out of view at a local scent maximum, it goes to wandering and heads for the last seen cell (3477-3487).
- Flee step (3492-3526): a fleeing monster steps down its safety map (`nextStep(getSafetyMap(monst), ...)`, 3505). If it cannot move, it attacks an adjacent enemy unless it has magical fear (the "cornered" fight).
- Safety map (`getSafetyMap`, 2371-2393): if the monster can see the player, it uses the shared safety map (refreshed once per turn in Time.c 2369 if a fleeing monster is in view); if it cannot, it keeps a private copy taken the first time it lost sight (2387). So an out-of-view flee runs on a frozen map.
- Corridor rule (`monsterAvoids`, 1493-1501): a monster with `MA_AVOID_CORRIDORS`, in a group (leader or follower), tracking, not enraged at or below half HP, does not step from a cell with fewer than two passable arcs into a cell with two or more. Enrage is set on the defender for 4 turns only when the defender has `MA_AVOID_CORRIDORS` (Combat.c 331-332). The rule also does not apply from a cell with harmful terrain (1500). The changelog line 325 states it as "Cautious monsters now enter corridors if they have been attacked recently and".
- Ally flight (`allyFlees`, 2988-3017): an ally flees when an enemy is within 10 cells and the ally is at or below a third of HP, and it flees near death or its HP fraction is under half the player's.

## 2. Key functions

- `updateMonsterState`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 1709-1823 (state chain 1757-1822).
- `awarenessDistance` and `awareOfTarget`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 1621-1683.
- `wakeUp`, `alertMonster`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 1582-1606.
- `monsterFleesFrom`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 2947-2986.
- `fleeingMonsterAwareOfPlayer` and `getSafetyMap`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 2363-2393.
- `monstersTurn` (hunting 3429-3491, fleeing 3492-3526): `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 3320-3636 (the function runs to 3636; only 3320-3527 read).
- `updateScent`, `scentDistance`, `currentStealthRange`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Time.c` 651-724.
- `playerTurnEnded` clock and map block: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Time.c` 2229-2372 (the clock lines 2266-2268; refresh 2356-2369).
- `addScentToCell`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Movement.c` 2481-2486.
- Corridor rule: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 1493-1500; enrage: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Combat.c` 331-332.
- Data: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Rogue.h` 2171-2191 (`creatureType`), `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Globals.c` 1025-1165 (`monsterCatalog`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One clock stamps the trail; trail age and distance share the clock | Clock +3 per player turn, +10 while invisible (Time.c 2266-2268) |
| Scent distance in double units | 2 x major + minor (Time.c 653) |
| Awareness radius = stealth range, in double units | awareness = stealth x 2 (Monsters.c 1651); stealth 14 in light (Time.c 688) |
| Keep the chase at 97% per tick outside awareness; drop at once beyond 3x | 97 (Monsters.c 1668); 3 (1662) |
| Notice at 25% per tick in view and inside awareness | 25 (Monsters.c 1678) |
| Feared enemy within 3 cells starts a flee; at 3 or more it ends | 3 (Monsters.c 1772, 1786) |
| Near-death flee: enter at 1/4 HP, recover at 3/4 HP | 1/4 (1779), 3/4 (1776, 1807) |
| Cautious group monsters avoid corridors until attacked and at or below half HP | Enrage 4 turns (Combat.c 332); half HP (Monsters.c 1495) |
| Ally flees when near an enemy and low on HP | 10 cells (3000); 33 percent HP (3001) |
| Clock wrap | Subtract 15000 above 20000 (Time.c 2639; threshold at Time.c 2270) |

Derived, not in the donor: with stealth 14 the awareness is 28 double units, which is 14 cells on a straight line and about 9 cells on a pure diagonal (3 per diagonal step). One turn of trail age adds 3 to perceived distance, the same as one diagonal step.

## 4. TypeScript sketch

simplified: the sketch keeps the clock, the scent stamp, the awareness bands and their odds, the flee thresholds with the near-death band, the enrage timer and the corridor test, in donor order. It omits: the discordant and ally branches, the permanent-flee (MODE_PERM_FLEEING) and item-stealing states, magical fear, `wakeUp`'s teammate wake (the sketch only sets the monster; the donor also runs `updateMonsterState` on each teammate), turrets/totems and always-hunting creatures are included as two flags only, `alertMonster`'s last-seen update, the cast, blink and ally-attack steps, the scent step itself (`scentDirection`), the safety map and its Dijkstra, the out-of-view safety-map cache, the wrap at 20000, and the status countdown that ends enrage. It takes the view flag and the closest feared distance as inputs instead of computing them from the map. It uses a passed RNG, not the donor's global `rand_range`.

```ts
// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number;
type State = "sleeping" | "wandering" | "tracking" | "fleeing" | "ally";

interface Mon {
  state: State;
  hp: number;
  maxHp: number;
  flees: boolean;      // flees near death (donor MONST_FLEES_NEAR_DEATH)
  grouped: boolean;    // has a leader or followers
  cautious: boolean;   // avoids corridors when grouped (donor MA_AVOID_CORRIDORS)
  enraged: number;     // turns left after being attacked (cautious monsters only)
  alwaysHunting?: boolean; // donor MONST_ALWAYS_HUNTING: always aware
  immobile?: boolean;      // donor MONST_IMMOBILE (turret/totem): aware iff inside awareness
}

interface World {
  clock: number;         // one clock: scent stamps and perceived distance share it
  stealthRange: number;  // cells; 14 in light in the donor
  invisible: boolean;
}

// Scent distance in double units: a straight step costs 2 per cell, a pure diagonal step costs 3.
function scentDistance(dx: number, dy: number): number {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  return ax > ay ? 2 * ax + ay : ax + 2 * ay;
}

// Once per player turn: the clock advances (3, or 10 while the player is invisible).
function tickClock(w: World): void {
  w.clock += w.invisible ? 10 : 3;
}

// Cells the player can see get a stamp: clock minus distance, keeping the freshest value.
function layScent(scent: number[], cell: number, dist: number, clock: number): void {
  const v = clock - dist;
  if (v > scent[cell]) scent[cell] = v;
}

// Perceived distance to the player from a monster's cell, in double units.
// Trail age and distance are measured on the same clock; direct distance wins if in view.
function perceived(w: World, scentUnderMon: number, directDist: number | null): number {
  let p = w.clock - scentUnderMon;
  if (directDist !== null) p = Math.min(p, directDist);
  if (p < 0) p = 1000;
  return Math.min(p, 1000);
}

// Awareness is 2 x stealth range, in double units. Beyond 3 x that, a monster loses the player.
function aware(m: Mon, w: World, perc: number, inView: boolean, rng: Rng): boolean {
  const awareness = w.stealthRange * 2;
  if (m.alwaysHunting) return true;
  if (m.immobile) return perc <= awareness;
  if (perc > awareness * 3) return false;
  if (m.state === "tracking") return perc > awareness ? rng() * 100 < 97 : true; // 3% per turn to lose
  if (!inView) return false;
  if (perc <= awareness) return rng() * 100 < 25;                                  // 25% per turn to notice
  return false;
}

// Feared enemy within 3 cells starts a flee; near-death fleeing has a band: enter at 25% HP, stay to 75%.
function updateState(m: Mon, awareNow: boolean, inView: boolean, closestFeared: number): void {
  if (m.state === "ally") return;
  if (m.alwaysHunting) { m.state = "tracking"; return; }
  if (m.immobile) { m.state = awareNow ? "tracking" : "sleeping"; return; }
  if (m.state === "sleeping") { if (awareNow) m.state = "tracking"; return; }
  if (m.state === "wandering" && awareNow && inView) { m.state = "tracking"; return; }
  if (m.state === "tracking" && !awareNow) { m.state = "wandering"; return; }
  if (m.state === "tracking" && closestFeared < 3) { m.state = "fleeing"; return; }
  if (m.flees && m.hp <= Math.floor(3 * m.maxHp / 4)) {
    if (m.state === "fleeing" || m.hp <= Math.floor(m.maxHp / 4)) m.state = "fleeing";
    return;
  }
  if (m.state === "fleeing" && closestFeared >= 3) { m.state = "tracking"; return; }
  if (m.state === "fleeing" && m.flees && m.hp >= Math.floor(3 * m.maxHp / 4)) m.state = "tracking";
}

// Being attacked sets the enrage timer, only on cautious monsters (donor: only when the defender has MA_AVOID_CORRIDORS; 4 turns).
function onAttacked(m: Mon): void {
  if (m.cautious) m.enraged = 4;
}

// Grouped, cautious monster tracking the player does not step from open ground into a corridor,
// unless it is enraged and at or below half health.
function corridorBlocked(m: Mon, arcsFrom: number, arcsTo: number): boolean {
  const enragedLow = m.enraged > 0 && m.hp <= Math.floor(m.maxHp / 2);
  return m.cautious && !enragedLow && m.state === "tracking" && m.grouped
    && arcsTo >= 2 && arcsFrom < 2;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp/ai002-brogue-ce-ai.ts) exit 0.

## 5. Lands in

- TARGET `src/fight/aggro.ts` (new engine module: awareness, clock and state for creatures; server-side).
- Parity-checklist row 4 (fight loop: aggro, chase, leash). The corridor rule and ally flight are row 2 sub-lines and are not decided here.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only, shape not code)
- Brief rule served: 4 (aggro and chase are one engine loop; kills stay server-verified); addendum rule 6 (copyleft: shape only).

## 6. Gaps and risks

- Cost on a small server: `updateScent` walks the whole level grid (Time.c 667-674, a loop over DCOLS x DROWS after a field-of-view mask) once per player turn. One map per level, not per monster, so it is shared, but it scales with zone size times the number of zones with a player inside. Frankendom must refresh only zones that have a player, and only the field-of-view cells (dirty flag).
- Per-creature cache: `getSafetyMap` copies the whole safety map into each out-of-view fleeing monster (2387). Many fleeing creatures in one zone means many grid copies. Fix: share one cached map per zone and version it.
- Determinism: `rand_percent` (Math.c 62-64) draws from the global RNG and the 97 and 25 rolls happen per monster per turn in an order that depends on iteration. Server verification needs seeded draws per creature, in a fixed order.
- Donor defect, candidate: fleeing monsters have one threshold for feared enemies (flee at under 3, resume at 3 or more, Monsters.c 1772 and 1786). A monster at distance 2 flees, steps to 3, resumes tracking and steps back to 2. No band exists for this rule, unlike the near-death rule. This is reasoned from the two thresholds, not observed in play. fix: flee below 3, resume at 5 or more (a band of 2).
- Many-on-one: the donor's corridor rule works per group, not per attack slot; the enrage timer is per creature. MAX_ATTACKERS = 3 needs a slot count in the engine, not this rule alone. The donor shows no slot cap (not searched).
- Time base: the clock is game time (3 per player turn). Frankendom should key the clock to server ticks, so a fast client does not shorten awareness.
- Enrage countdown is in the status system (`decrementMonsterStatus`, not read); the sketch assumes one turn per tick.
- Zones as data: the awareness radius comes from the player's stealth (player data), the odds (97, 25, 3) and the flee thresholds are engine constants in the donor. Keep the odds as creature-row fields only if a creature needs a different feel.

## 7. As data

- Yes, the donor has a data table: `monsterCatalog` (Globals.c 1025-1165) is an array of `creatureType` rows (Rogue.h 2171-2191). Row fields (name: type): monsterID: int; monsterName: string; displayChar: glyph; foreColor: colour; maxHP: int; defense: int; accuracy: int; damage: randomRange (lowerBound, upperBound, clumpFactor; Rogue.h 1335-1338); turnsBetweenRegen: int; movementSpeed: int; attackSpeed: int; bloodType: dungeon feature; intrinsicLightType: light; isLarge: bool; DFChance: percent; DFType: dungeon feature; bolts: list of 20; flags: bit set (behaviour, e.g. MONST_FLEES_NEAR_DEATH, MONST_MAINTAINS_DISTANCE); abilityFlags: bit set (e.g. MA_AVOID_CORRIDORS, MA_KAMIKAZE).
- A new X is one row: yes for a new monster kind (the goblin rows at Globals.c 1040-1044 differ only in flags and bolts). The awareness and flee rules are shared code, so a new behaviour needs a flag, not a new function.
- Row flags that express each rule in this note: `flees_near_death` (MONST_FLEES_NEAR_DEATH, row at Globals.c 1074); `keeps_distance` (MONST_MAINTAINS_DISTANCE, Globals.c 1044); `avoids_corridors` (MA_AVOID_CORRIDORS, Rogue.h 2123, rows 1042 and 1044); `always_hunting` (MONST_ALWAYS_HUNTING, flag at Rogue.h 2063, tested at Monsters.c 1716).
- Zone data vs engine: nothing in the awareness code is per zone in the donor; the stealth range is player state. Frankendom keeps the bands and odds as engine constants and puts per-creature feel (flee threshold, corridor flag) on the creature row.

## 8. Provenance and patch history

- Provenance: repo `tmewett-BrogueCE` (Brogue CE), AGPL-3.0-or-later, copyleft: shape only. No CLAUDE.md or AGENTS.md in the parts read.
- Patch history (CHANGELOG.md and changes/):
  - line 322: "to remain hunting as long as they are close enough and can see the player," (a staff change lets hunting monsters keep hunting through transparent terrain; the awareness in-view rule in 1636 is the matching code).
  - line 325: "Cautious monsters now enter corridors if they have been attacked recently and" (the enrage rule; the 50 percent limit is in the code at 1495).
  - line 426: "Discordant wandering monsters no longer target the player with bolts/spells" (the next changelog line adds "from beyond stealth range"; the fix stops discordant wanderers shooting the player from outside stealth range).
  - changes/803-ally-avoid-invulnerable: "Adjusted ally behavor to better avoid invulnerable monsters." (matches the 6-cell rule in monsterFleesFrom, 2954).
  - No history line for the awareness bands or the 25 and 97 odds.

## 9. Rulings for Dom

1. Adopt the three awareness bands (lose at once beyond three times awareness; keep 97 percent per tick inside it; notice 25 percent per tick in view)? Recommendation: yes, with the stealth-style radius per player and the odds on the creature row only if a creature must feel different.
2. Refresh the scent field only for zones with a player inside, and only in view cells? Recommendation: yes; it is the cost cap for many zones.
3. Should grouped cautious creatures avoid chokepoints while tracking (the corridor rule)? Recommendation: yes, as a row flag `avoids_chokepoints`, because it fits the three-attacker cap.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- wakeUp: ticks only for sleeping or wandering teammates; every normal-mode teammate set to tracking and updateMonsterState called. Fixed.
- awareOfTarget order omitted ALWAYS_HUNTING and IMMOBILE branches. Fixed (also in sketch).
- Stealth range 'never below 2' wrong when just rested; aggravating and ring terms omitted. Fixed.
- Enrage only set when defender has MA_AVOID_CORRIDORS. Fixed.
- Changelog line 426: text continues 'from beyond stealth range', so the stealth-range wording was right in substance; clarified (checker read it too narrowly).
- Corridor rule also exempts cells with harmful terrain. Added.
- Missed (added): turret/totem and always-hunting paths; recursive updateMonsterState on teammates.

Fixed 2026-10-12: section 1 (awareness rules, wakeUp, stealth range, enrage, corridor), section 4 sketch (alwaysHunting/immobile flags, enrage note) and work/brogue-ce-ai.ts, section 8 changelog line.
