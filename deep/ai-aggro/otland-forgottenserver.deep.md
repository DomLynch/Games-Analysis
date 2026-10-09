# otland-forgottenserver (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/otland-forgottenserver/src/monster.cpp` | Licence: GPL-2 | C++ | symbol `Monster::searchTarget / Monster::selectTarget` at 498 (verified: `searchTarget` opens at 498; `selectTarget` at 669; the helper `isTarget` at 656).

## 1. Mechanism

- `Monster::searchTarget(type)` (498-576) builds a result list from `targetList` (503-509): each creature that is not the current follow target, passes `isTarget`, and, for every search type except random, that the monster can attack from its position (`canUseAttack`).
- NEAREST (512-549): picks the closest result by Manhattan distance (|dx| + |dy|; the first of equal distance wins). If the result list is empty it scans the whole target list (including the current follow creature) for the nearest creature that passes `isTarget`. If the chosen target is accepted by `selectTarget`, it returns true; otherwise it falls to the last-resort loop.
- DEFAULT, ATTACKRANGE and RANDOM (551-566): if the result list is not empty, pick one uniformly at random and return whatever `selectTarget` says, with no further fallback (557-558). If the list is empty, ATTACKRANGE returns false; DEFAULT and RANDOM fall to the last-resort loop.
- Last resort (569-575): walk the target list in order and return true for the first creature (other than the current follow target) that `selectTarget` accepts; otherwise false.
- `isTarget` (656-667): not removed, attackable, not in a protection zone, visible to this monster (`canSeeCreature`), and on the same floor.
- `selectTarget` (669-698): refuses a creature that fails `isTarget` or is not in this monster's target list. A hostile monster or a summon sets it as the attacked creature if `canAttackCreature` allows (hostile monsters also schedule a check-attack task on the dispatcher), otherwise clears the attacked creature. Then, if the monster is already following it or `canFollowCreature` allows, it sets follow and returns true; if it cannot follow, it returns false even when it just set an attack target.
- Inputs: the monster, its target list, positions and floors. Outputs: the attacked creature and follow creature. Tick: called from the monster's think step, not a fixed-step loop (the caller was not read).

## 2. Key functions

- `Monster::searchTarget`: `monster.cpp` 498-576. Candidate list, the type-based pick, the last-resort loop.
- `Monster::isTarget`: `monster.cpp` 656-667. Validity gate.
- `Monster::selectTarget`: `monster.cpp` 669-698. Accepts a candidate: attacks, and follows.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Filter candidates by validity, then pick nearest, random, or first-valid | Search type enum (theirs) |
| Distance metric: Manhattan (|dx| + |dy|) | Metric choice (theirs) |
| Same floor only | Floor equality (theirs) |
| Protection zone excludes targets | Zone rule (theirs, data) |
| Hostile attack on accept, follow when able; accept only when follow works | Dispatcher task (theirs) |

## 4. TypeScript sketch

simplified: the zone, visibility and floor checks are one boolean on the candidate; `canUseAttack`, `canAttackCreature` and `canFollowCreature` are passed in as booleans; the ATTACKRANGE and DEFAULT search types are omitted (the sketch's `random` is the donor RANDOM, which skips the `canUseAttack` filter; DEFAULT would pick at random from the filtered list, with the last-resort loop when it is empty), as are the dispatcher task, the summon case in `selectTarget` (the donor attacks when hostile or a summon; the sketch only when hostile) and the target-list membership check in `selectTarget`; the follow-creature skip in the result list and the last-resort loop, and the nearest fallback over the whole target list, are kept.
```ts
// Licence: GPL-2 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pos { x: number; y: number; z: number; }
interface Target { id: number; pos: Pos; valid: boolean; canAttackFromHere: boolean; canAttack: boolean; canFollow: boolean; }
interface Monster { pos: Pos; hostile: boolean; attacked: number | null; following: number | null; }

const manhattan = (a: Pos, b: Pos): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Accept a target: set attack when hostile and able (else clear it), then follow if able. True only when following works.
function selectTarget(m: Monster, t: Target): boolean {
  if (!t.valid) return false;
  if (m.hostile) m.attacked = t.canAttack ? t.id : null;
  if (m.following === t.id || t.canFollow) { m.following = t.id; return true; }
  return false;
}

function searchTarget(m: Monster, list: Target[], kind: 'nearest' | 'random', rnd: () => number): boolean {
  const results = list.filter((t) => m.following !== t.id && t.valid && (kind === 'random' || t.canAttackFromHere));
  if (kind === 'nearest') {
    const pool = results.length > 0 ? results : list.filter((t) => t.valid);
    let best: Target | null = null;
    for (const t of pool) if (best === null || manhattan(t.pos, m.pos) < manhattan(best.pos, m.pos)) best = t;
    if (best !== null && selectTarget(m, best)) return true;
  } else if (results.length > 0) {
    return selectTarget(m, results[Math.floor(rnd() * results.length)]);
  }
  for (const t of list) if (m.following !== t.id && selectTarget(m, t)) return true; // last resort: first acceptable
  return false;
}
```

## 5. Lands in

- TARGET `src/fight/world.ts` (exists today: the creature chooses the player with the most threat, nearest on a tie, within `AGGRO_M` 9 m / `ENGAGE_M` 4 m), checklist row 4 (fight loop: aggro, chase, leash). The validity gate and the ordered fallback are the new shape; compare with the existing choose-by-threat step before adding anything.
- TARGET `src/fight/ai.ts` (today: `src/ai.ts`, moving), checklist row 2 (AI brain): the pick-by-type step is a candidate for choosing which opponent the brain targets when several are in reach.
- Reuse tag: rewrite-from-idea
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2: clean-room only.
- MAX_ATTACKERS = 3: the donor has no per-target cap, so every monster can pick the same player. Frankendom's choice must respect the cap of three engaged on one player (the rest hold at `HOLD_M`).
- Server-verified kills: the random pick uses `uniform_random`; Frankendom's server must use the seeded stream so the choice can be replayed. The donor's choice also ignores threat; Frankendom's threat list (world.ts) should come first and this pick is only the tie-break or the no-threat case.
- Zones as data: the donor picks by Manhattan distance on tiles and by floor. Zone 1 is metres on a free plane (`src/fight/world.ts` uses Euclidean rings); do not swap in tile distance. Protection zones are data in the donor; Frankendom's safe-town rule is a server-set `Fighter.pvp` flag, set from zone data.
- Follow-or-attack is a server dispatcher pattern. Frankendom's Zone 1 loop has no dispatcher; the pick stays inside `src/fight/world.ts` on the 60 Hz tick.
