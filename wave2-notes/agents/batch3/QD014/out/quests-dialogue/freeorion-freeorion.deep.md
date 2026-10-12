# freeorion-freeorion (quests-dialogue, cell 12)

Donor: `/mnt/frankendom-donors/freeorion-freeorion/default/scripting/specials/planet/ANCIENT_RUINS.focs.txt` (content) with the engine rule in `/mnt/frankendom-donors/freeorion-freeorion/universe/Universe.cpp` 1936-2030 | Licence: GPL-2.0 for the source (README.md:148); game content scripts are GPL-2.0 and CC-BY-SA-3.0 (default/COPYING:1, 6) | FOCS content script (declarative) on a C++ engine | symbol `ANCIENT_RUINS_SPECIAL` (script) and `Universe::ExecuteEffects` (engine)

Checked: Read in full: `ANCIENT_RUINS.focs.txt` (all 277 lines, including the included monster guard), `ANCIENT_RUINS_DEPLETED.focs.txt` (all), `monster_guard.macros` lines 1-80. Read the engine rule: `Universe.cpp` 1262-1345 (activation evaluation and cache), 1880-1934 (results sorted by priority, then issue order), 1936-2030 (ExecuteEffects with the stacking check), and `Effects.cpp` 275-299 (EffectsGroup::Execute: no activation check of its own). Named values by grep only: `named_values.focs.py` 28 and 30. Dialogue or quest logic: grep for achievement, quest, objective, dialogue, mission found no quest, objective or dialogue system; the "quest" hits were substrings (DESTROYED_ON_CONQUEST in SP_ANCIENT_GUARDIANS.focs.py:50, "requested" in universe_generation/empires.py), and the "mission" hits are AI fleet orders (default/python/AI/AIFleetMission.py, not read). Not read: the function that builds the issue order (`DispatchEffectsGroupScopeEvaluations`), the value of RESEARCH_PER_POP, how the random condition is parsed, the species file SP_ANCIENT_GUARDIANS (grep only), monster_fleets.inf line 194 (grep only). Confidence: high on the stacking and activation mechanics; medium on the reward odds, which assume the issue order is the order the groups appear in the file (not verified); the odds below are worked out by hand from the chances, not run. camera_scope: not applicable.

Best transferable idea: A discovery site holds an ordered list of reward rows that share one claim: each row rolls once, the first row that passes takes the site, a fallback row always answers, and the site is then swapped for a depleted version that has no reward rows (the passive research bonus is identical in both versions, so only the one-time rewards end).
Decision (proposed): adapt - the first-success cascade, the shared claim per site, and the depletion swap fit Frankendom's zones-as-data and one-ledger rules and give a loot table with a built-in "one reward per site" guarantee; adapt it so each roll is a server roll per claimed open, keyed to the player (one character, one ledger), and so the reward rows are zone data with an explicit order. Reject the donor's world-state side effects (ships and buildings created on the map), which have no Frankendom counterpart.
Acceptance: A server test opens an intact zone site once with the gate owned: exactly one reward row (or the explicit "nothing here" row) is written to the ledger, the site reads as depleted, and a second open writes nothing; a separate row with its own roll (the donor's extinct-species roll) can add a second entry only when the zone data says so.

## 1. Mechanism

- Gate. Every reward row and the fallback require the owner to have the excavation tech (`LRN_XENOARCH`). Rows 1-5 and the fallback are gated per row by an activation (`ANCIENT_RUINS.focs.txt:47-50`, `74-77`, `101-105`, `129-132`, `156-159`, `184`).
- Rows, in file order. (1) Dragon tooth ship: roll 0.2 (`48`), creates a ship (`53`). (2) Neutronium synth building: roll 0.25 (`75`), creates a building (`80`). (3) Weapon tech SHP_WEAPON_4_1: roll 0.5 and only if the owner does not have it (`102-103`), grants the tech (`108`). (4) Multispec shield tech: no roll; only if not owned (`130`), grants (`135`). (5) Krill spawn tech: no roll; only if not owned (`157`), grants (`162`). (6) Fallback "empty" sitrep: no roll, always true when the gate holds (`184`).
- The claim (stacking group). Rows 1-6 all carry `stackinggroup = "ANCIENT_RUINS_TECH_UNLOCK"` (`51`, `78`, `106`, `133`, `160`, `185`). In `ExecuteEffects`, each group with a stacking group checks each target planet against a per-group set; a planet already in the set is dropped from that group's targets, and a planet not yet in it is added (`Universe.cpp:1977-1995`). So the first group in dispatch order whose activation passed takes the planet, and later groups in the same stack skip it that turn.
- Activation comes first. Activation is evaluated when the effect list is built (`Universe.cpp:1262-1275`), so a row whose roll fails does not enter the list and does not claim the planet. Identical activation conditions share one evaluation (`1277-1287`, `1339-1341`).
- The extinct-species roll is outside the claim. Its block has no stacking group (`198-204`): roll 0.75, then a nested roll 0.33 for one species, else 0.5 for another, else the third (`205-263`). It can fire on the same turn as a reward row.
- Depletion. The last block (`266-272`) adds `ANCIENT_RUINS_DEPLETED_SPECIAL` and removes `ANCIENT_RUINS_SPECIAL` while the gate holds. The depleted special has no reward rows, only research, and that research effect is the same as the intact special's (ANCIENT_RUINS.focs.txt:36-43: same population times named factor, same stability floor), so depletion does not shrink the research stream: focus research and a stability floor, value plus population times a named factor (`ANCIENT_RUINS_DEPLETED.focs.txt:10-17`).
- Order of operations in one turn, for one ruin with the gate owned. Build the list (activations, rolls, scopes). Sort by priority; within a priority, issue order (`Universe.cpp:1902-1904`, `1951`). Walk the list: the first stacked row that passed takes the planet; the fallback takes it if reached; the extinct roll runs on its own; the depletion block runs last in the file order and swaps the special.
- Tick and timing: not a real-time loop; one effects pass per game turn (not read: the turn loop that calls ExecuteEffects).
- Odds (worked out by hand, not run; assumes issue order = file order). With weapon and multispec not owned: ship 0.20, building 0.20, weapon 0.30, multispec 0.30, fallback 0. With the weapon tech owned (row 3 inactive) and multispec not owned: ship 0.20, building 0.20, multispec 0.60. The donor's odds therefore change with the owner's tech, which is the point of the gate.

## 2. Key functions

- `ANCIENT_RUINS_SPECIAL` effects, `/mnt/frankendom-donors/freeorion-freeorion/default/scripting/specials/planet/ANCIENT_RUINS.focs.txt` 29-273. Rows, claim, extinct roll, depletion.
- Monster guard placed at turn zero, `/mnt/frankendom-donors/freeorion-freeorion/default/scripting/specials/planet/monster_guard.macros` 40-69 (`CHANCE_OF_GUARD_2`, included at `ANCIENT_RUINS.focs.txt:34`). World generation, not part of the excavation.
- Stacking check, `/mnt/frankendom-donors/freeorion-freeorion/universe/Universe.cpp` 1970-1998 (`ExecuteEffects`).
- Activation evaluation and cache, `/mnt/frankendom-donors/freeorion-freeorion/universe/Universe.cpp` 1262-1345.
- Effects execution (no activation of its own), `/mnt/frankendom-donors/freeorion-freeorion/universe/Effects.cpp` 275-299.
- Depleted special, `/mnt/frankendom-donors/freeorion-freeorion/default/scripting/specials/planet/ANCIENT_RUINS_DEPLETED.focs.txt` 1-24.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| First-success cascade: rows tried in order, each with its own roll; the first pass takes the site | Rolls 0.2, 0.25, 0.5 (theirs, ANCIENT_RUINS.focs.txt:48, 75, 102); two rows with no roll (`130`, `157`) |
| Shared claim: rows of one group cannot both pay on the same site in the same pass | Stacking group name (theirs, `51`); claim check (theirs, Universe.cpp:1977-1991) |
| Fallback row: a result is always reported, even when nothing is granted | Fallback row (theirs, `184-194`) |
| Separate roll outside the claim: a second, independent outcome on the same site | Extinct roll 0.75 (theirs, `201`), nested 0.33 and 0.5 (theirs, `205`, `225`) |
| Gate by progression: the site stays inert until the owner has the tech | Tech `LRN_XENOARCH` (theirs, `47-50` and every row) |
| Depletion swap: the site changes state once and loses its reward rows (the passive research stream is unchanged, ANCIENT_RUINS.focs.txt:36-43 vs DEPLETED:10-17) | Depleted special research (theirs, DEPLETED.focs.txt:16-17); research per pop 5 x RESEARCH_PER_POP (theirs, named_values.focs.py:28); stability floor 12 (theirs, named_values.focs.py:30) |
| Turn-zero guard placement: a monster sits on the site from the start | Guard roll 0.7 (theirs, monster_guard.macros:59), ship design SM_GUARD_2 (theirs, monster_guard.macros:57) |

## 4. TypeScript sketch

simplified: The sketch keeps the ordered first-success cascade, the per-site claim, the fallback row, and the depletion swap. It omits the extinct-species roll (a separate roll outside the claim), the depleted special's research, the stability floor, the monster guard, the world-state effects (ships and buildings created on the map), and sitreps. It collapses the donor's per-turn pass over all planets into one call per site, and it evaluates the rows in the order given (the donor's issue order is assumed, not verified).

```ts
// Licence: GPL-2.0 and CC-BY-SA-3.0 (donor default/COPYING; game content scripts are dual-licensed). Clean-room shape written from the mechanism, not a translation of the FOCS.
interface Row {
  id: string;
  chance: number;   // 1 = deterministic
  unlocked: boolean; // a row that does not apply does not claim the site
  grants: string;
}

interface Site {
  state: "intact" | "depleted";
  gateOwned: boolean; // progression gate (donor: the owner must have the excavation tech)
}

// One excavation for one site. Rows are tried in order; the first row whose roll passes claims the site.
// If no row claims it, the fallback "empty" result is reported. The site is depleted either way.
function excavate(site: Site, rows: Row[], rng: () => number): string | null {
  if (site.state !== "intact" || !site.gateOwned) return null;
  let result = "empty";
  for (const r of rows) {
    if (!r.unlocked) continue;
    if (rng() >= r.chance) continue;
    result = r.grants;
    break;
  }
  site.state = "depleted";
  return result;
}

// Example wiring: ship 0.2, building 0.25, weapon tech 0.5 (if not owned), then a sure tech (if not owned), then empty.
const rows: Row[] = [
  { id: "ship", chance: 0.2, unlocked: true, grants: "dragonTooth" },
  { id: "building", chance: 0.25, unlocked: true, grants: "neutronium" },
  { id: "weapon", chance: 0.5, unlocked: true, grants: "weapon4" },
  { id: "shield", chance: 1, unlocked: true, grants: "multispecShield" },
  { id: "krill", chance: 1, unlocked: true, grants: "krillSpawn" },
];

let seed = 11;
const rng = (): number => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

const tally = new Map<string, number>();
for (let i = 0; i < 1000; i++) {
  const site: Site = { state: "intact", gateOwned: true };
  const got = excavate(site, rows, rng);
  if (got !== null) tally.set(got, (tally.get(got) ?? 0) + 1);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file `/tmp/QD014-freeorion-freeorion-excavation.ts`) exited 0. The tally is computed but not printed, so the sketch's outcome frequencies were not run.

## 5. Lands in

- TARGET `origins/server/discovery-site.ts` (new): the zone-site excavation, an ordered reward table per site with one claim and a depletion swap, rolled by the server on each server-verified open, and written through the single ledger.
- Parity-checklist row 18 (loot roll and XP award). The site's rows are the loot table; the fallback is the explicit "nothing here" result. Sub-line (server tick): the server rolls on intake, not in the client.
- Reuse tag: rewrite-from-idea (GPL-2.0 for the source and GPL-2.0 / CC-BY-SA-3.0 for the content; clean-room only, shape only).
- Brief rule served: one ledger (each open is one write); zones as data (the rows, order, gate and depletion are zone fields); server-verified rewards.

## 6. Gaps and risks

- Ownership and scope. The donor's site belongs to the owner's empire and changes the whole world (it creates ships and buildings). Frankendom's ruling is one character, one ledger. The depleted state must be per character (or per zone instance, if the zone says so); the sketch does not decide which.
- Roll frequency. The donor rolls every turn while the gate holds, until depletion removes the site in the same pass. Frankendom should roll once per server-verified open, never on a timer.
- Order dependence. The odds depend on the order of the rows and on which rows are unlocked (the owner's tech). Frankendom's zone data must declare the order explicitly; the donor's order is the file order, which was assumed (issue order not read).
- Latent: the fallback row has an always-true activation and shares the claim (`184-185`). Its position at the end of the file is the only thing keeping it from taking a site before a reward row, if the issue order ever differed. Frankendom's zone schema should reject a fallback row that is not last.
- Second roll outside the claim. The extinct-species roll is not in the stack (`198-204`), so it can fire with a reward row on the same site. This is the donor's intent (a second outcome), but Frankendom must declare it as a separate row with its own claim, or two rewards will land by accident.
- Shared random activations. Identical activation conditions reuse one evaluation per turn (`Universe.cpp:1340-1341`). Frankendom must not share one roll between two reward rows; each row rolls its own.
- No explicit result for the empty case in the donor's ledger; the sitrep is the only feedback (`188`). Frankendom should show an explicit "nothing here" result to the player.
- Monster guards are placed at world generation (`monster_guard.macros:40-69`), not by the excavation. Frankendom's zone spawns (row 23) own that rule; the excavation should not depend on it.
- Not transferable as is: ship and building creation on the map (world effects with no Frankendom counterpart) and the continuous research bonus (an economy effect, not a quest reward).

Reuse tag: rewrite-from-idea (GPL-2.0 / CC-BY-SA-3.0 content; clean-room only, shape only)
Brief rule served: one ledger; zones as data; server-verified rewards (Frankendom rulings)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Error: the depleted special was described as paying 'only a trickle' / 'a smaller trickle after'; the intact special has the identical research effect (ANCIENT_RUINS.focs.txt:36-43), so only the reward rows disappear. Confirmed against the code.
- Missed: intact ruins also pay a continuous research bonus (focus research, stability >= 12) independent of excavation; depletion keeps the passive income, which matters for the depletion-swap idea (a depleted site should keep its passive effect, only the one-time rows end).

Fixed 2026-10-12: replaced the 'trickle' wording in Best idea, section 1 and the section 3 row and section 6 text; added the passive-income point. Sketch unchanged.
