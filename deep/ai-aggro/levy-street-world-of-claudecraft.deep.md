# levy-street-world-of-claudecraft (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/mob/social_aggro.ts` | Licence: MIT | TypeScript | symbol `rallyFleeingAllies / socialPullSameTemplate` at 25 (verified: `rallyFleeingAllies` opens at 25; `socialPullSameTemplate` at 68). The whole file (89 lines) was read.

## 1. Mechanism

- Two pure entity-state mutations, both draw no random numbers, so the shared draw order is unchanged.
- `rallyFleeingAllies` (25-52): called each tick while a cowardly mob flees at low HP (the file header says so; the caller was not read). It scans a small radius (`FLEE_HELP_RADIUS` = 5) through the spatial grid for same-family idle hostile mobs (not the mob itself, not owned, not dead, not quest-gated against this target); the family comes from the `MOBS` template table, and a mob with no family returns 0 at once (27). Each one found becomes chasing the fleer's attacker, is put in combat, gets its leash anchor at its current position, and gets 1 threat on the attacker. Returns the number pulled. The caller turns the fleer back on the first non-zero return.
- `socialPullSameTemplate` (68-89): called on a fresh aggro (per its comment; the caller was not read). Pulls idle hostile neighbours of the same template (not just the same family) within the family's social radius (default 5, mudfin 8), with the same state changes and threat of 1, but without the quest-gate check. Gated by the caller's social flag per its comment; authored dungeon packs engage through `mob/dungeon_pack_aggro.ts` regardless (not read).
- Inputs: the mob, the target, the spatial grid, template and family tables. Outputs: mutated `aiState`, `aggroTargetId`, `inCombat`, `leashAnchor` and threat on the pulled mobs. The pull always adds 1 threat via `addThreat` (body not read), so it is additive on a mob that already has some.
- Tick: per call (the flee tick and the aggro event), not a fixed step.

## 2. Key functions

- `rallyFleeingAllies`: `social_aggro.ts` 25-52. Fleer pulls a local same-family cluster on contact, then turns back.
- `socialPullSameTemplate`: `social_aggro.ts` 68-89. Fresh aggro pulls same-template neighbours in radius.
- `FLEE_HELP_RADIUS`: `social_aggro.ts` 20. Constant: the rally radius of 5 for a fleeing mob (a constant, not a function).
- `SOCIAL_PULL_RADIUS`: `social_aggro.ts` 58-61. Table: per-family social radius, default 5, mudfin 8.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pull neighbours within a radius when one member is engaged | Default radius 5 (theirs, `DEFAULT_SOCIAL_PULL_RADIUS` line 58) |
| Per-family radius override | Mudfin 8 (theirs, data, `SOCIAL_PULL_RADIUS` 59-61; added because murlocs chain-aggroed a whole pond) |
| Stop a flee on first contact, so a flee pulls one cluster, not a chain | Rally radius 5 (theirs) |
| Each pulled entity gets its own leash anchor and a threat of 1 | Threat 1 (theirs) |
| Quest-gate: a gated neighbour never joins a rally against a player it cannot fight | Quest-gate check (theirs) |

## 4. TypeScript sketch

simplified: the spatial-grid radius query becomes a scan of all mobs; the family comes from a field instead of the template table; the quest-gate check and the `inCombat` flag are omitted; `addThreat` is a plain map increment; the social-flag gate and the caller's flee loop are not sketched.
```ts
// Licence: MIT (donor). Sketch written from the described mechanism; lifting the real lines is permitted (social_aggro.ts 25-89).
interface Mob { id: number; x: number; y: number; family: string; template: string; state: 'idle' | 'chase' | 'flee'; target: number | null; threat: Map<number, number>; anchor: { x: number; y: number } | null; hostile: boolean; owned: boolean; dead: boolean; }

const near = (a: Mob, b: Mob, r: number): boolean => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < r * r;

// Pull one idle same-family neighbour onto the target.
function pull(m: Mob, target: number): void {
  m.state = 'chase';
  m.target = target;
  m.anchor = { x: m.x, y: m.y };
  m.threat.set(target, (m.threat.get(target) ?? 0) + 1);
}

// Flee rally: returns the number pulled; the caller ends the flee on the first non-zero result.
function rally(mob: Mob, target: number, all: Mob[], radius: number): number {
  let n = 0;
  for (const m of all) {
    if (m === mob || m.dead || !m.hostile || m.owned || m.state !== 'idle') continue;
    if (m.family !== mob.family || !near(m, mob, radius)) continue;
    pull(m, target);
    n++;
  }
  return n;
}

// Fresh aggro: pull same-template idle neighbours within the family's social radius.
function socialPull(mob: Mob, target: number, all: Mob[], radius: number): void {
  for (const m of all) {
    if (m === mob || m.dead || !m.hostile || m.owned || m.state !== 'idle') continue;
    if (m.template !== mob.template || !near(m, mob, radius)) continue;
    pull(m, target);
  }
}
```

## 5. Lands in

- TARGET `src/fight/world.ts` (exists today with `AGGRO_M` 9, `SIGHT_M` 14, `MAX_ATTACKERS` 3, `HOLD_M`, the threat list; it has no pack pull), checklist row 4 (fight loop: aggro, chase, leash). Pack pull on aggro and the one-cluster stop on flee are the new shape; the radius table by family is zone or catalogue data (row 21).
- Reuse tag: adapt
- Brief rule served: 5 (many-on-one: hate list and target selection in the engine); rules 7-9 n/a

## 6. Gaps and risks

- MAX_ATTACKERS = 3: a social pull that sets every neighbour to chase is safe only because world.ts then lets at most three fight and holds the rest at `HOLD_M`; the pull must seed threat only, not bypass the engage cap or the hold ring.
- Server-verified kills: the donor draws no random numbers, which suits a replay; Frankendom's pull must also be a pure function of the verified tick state, run on the server.
- Zones as data: the family radius table (5, mudfin 8) and the family tags are data per zone or per creature row in the catalogue (row 21). The creature roster lives in `src/roster.ts` and `src/moves.ts` (moving into `src/fight/`); do not invent family tags in code.
- A flee that ends on first contact only matters if Frankendom creatures flee; world.ts has a leash-return, not a flee-at-low-HP step, so the rally half has no hook until a creature profile can flee (the Brogue and Quake-style flee thresholds would come first).
- The quest-gate check is a donor-world rule (a Broodmother egg beside a fleeing widow); it does not apply to Frankendom.
