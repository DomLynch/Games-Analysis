# veloren-veloren (pets-mounts-taming, cell 3)

Donor: `/mnt/frankendom-donors/veloren-veloren/server/src/events/inventory_manip.rs` 616-666 (collar tame), with `server/src/pet.rs` 24-117 (`tame_pet_internal`), `common/src/comp/pet.rs` 39-74 (`is_tameable`, `is_mountable`), `common/systems/src/tether.rs` 49-133 (tether pull), `common/src/tether.rs` 1-123 (tether link), and `server/src/cmd.rs` 2321-2324 (tether creation example) | Licence: GPL-3.0 (`LICENSE` line 2: "Version 3, 29 June 2007"; no "or later" wording read in the donor header of the files opened) | Rust | symbol `server/src/events/inventory_manip.rs` collar arm (`ItemKind::Utility { kind: item::Utility::Collar }`)

Checked: Read in full: `server/src/pet.rs` (118 lines), `common/src/comp/pet.rs` (81 lines), `common/systems/src/tether.rs` (136 lines), `common/src/tether.rs` (123 lines). Read in part: `server/src/events/inventory_manip.rs` collar arm 596-676 (the arm itself read; the item-consumption path reads `reinsert` and `Used`, not the other arms); `common/src/mounting.rs` 74-190 (persist and delete paths only; the 516-line file is not read in full); `common/systems/src/mount.rs` (only the system header read; the file is 333 lines and was not read in full). Callers: `tame_pet` is called from `server/src/events/interaction.rs:601` (TamePetEvent handler), `server/src/events/entity_creation.rs:259` and `server/src/events/entity_manipulation.rs:3632`, so there are three further entry points not read. `Tethered` links are created at three sites, all in `server/src/cmd.rs` (2321, 2532, 6468); the command names were not read. Confidence: high on the collar tame and the owned-pet rules (read in full); high on the tether pull formula (read in full); medium on the mounts (only the mass rule and the dismount placement are read). Loyalty and stabling: no loyalty counter was found by grep; `SetPetStayEvent` exists (`server/src/events/interaction.rs:238`) but its body was not read. camera_scope: not applicable.

Best transferable idea: taming needs no roll here: a consumable collar, used next to a wild creature, takes the nearest eligible one within a short radius if the owner is under a fixed pet cap, and the new pet is tuned to stay close and wake less easily.
Decision (proposed): adapt - take the instant, capped, radius-and-nearest tame and the pet tuning as catalogue data; reject the donor's silent code-only eligibility list (move it to data) and do not port the tether spring as a companion leash (it has no damping; see section 6).
Acceptance: a server test asserts: with 3 owned companions a collar use is refused and the collar is kept; with 2 owned and a wild wolf 4.9 tiles away, that wolf becomes owned and the collar is consumed; a non-eligible creature (a dragon) within 5 tiles is never chosen; the owned companion has idle wander 0.25 and aggro range 0.25.

## 1. Mechanism

- Trigger (collar arm, `inventory_manip.rs` 616-666): the item is a Utility Collar. Step 1: count the owner's pets (entities with a `Pet` component and an agent whose alignment is `Owned(owner uid)`, lines 616-622); if the count is at `MAX_PETS` (3, line 616), the use is refused and the collar is put back (`reinsert` stays true). Step 2: among all entities that are alignment `Wild` and `is_tameable(body)`, keep those whose squared distance to the owner is below 5 tiles squared (`< 5.0f32.powi(2)`, line 638; the candidate filter is 642), and take the minimum by distance (line 644; the key is distance squared times 100, cast to int). Step 3: if one was found, emit `TamePetEvent` (650) and do not put the collar back, so the collar is consumed (`Used`, 666). If none was found, the collar is put back (663).
- No roll. The tame itself is the event. The donor has no skill check, no chance, and no timer on this path.
- Eligibility (`common/src/comp/pet.rs` 39-57): a `QuadrupedMedium` is tameable except four species (Catoblepas, Mammoth, Elephant, Hirdrasil; read at 44-50); `QuadrupedLow`, `QuadrupedSmall`, `BirdMedium` and `Crustacean` are tameable (51-54); all other bodies are not (55). The comment above the function (40-42) says only quadrupeds are tameable, so the comment and the code disagree.
- Owned-pet rules (`server/src/pet.rs` 24-117, `tame_pet_internal`): refused if the pet is already owned by a different uid (36-41, a warning); refused if the owner is itself a pet (43-48); refused if the target owns pets (50-60). Otherwise: alignment becomes `Owned(owner uid)` (62); an `Anchor::Entity(owner)` is inserted so the pet does not despawn while its owner is logged in (64-69); a `Pet` component is added (73); a new agent is built from the body, with the trade capability and `TradingBehavior::AcceptFood` (76-81); `idle_wander_factor = 0.25` (83), `aggro_range_multiplier = 0.25` (84), `patrol_origin = None` (85); finally the pet joins the owner's group (89-117).
- Mounts (`common/src/comp/pet.rs` 59-74, `is_mountable`): a rider can mount only if the rider's mass divided by the mount's mass is under 0.7 (65). A humanoid mount accepts only a bird-medium rider (68). Ships are always mountable (69); objects and items never (70-71). The mounting system checks `is_mountable` when it persists a rider (`common/src/mounting.rs` 143). On dismount, the rider is moved to a free safe spot (167-187, read in part).
- Tether (`common/systems/src/tether.rs` 49-133): a follower is pulled toward its leader when the distance between the two attach points exceeds `tether_length`. Pull factor = `max(0, distance - tether_length)` (99). Strength = pull factor times 50000 (100). Impulse = unit direction to the leader times strength times `dt` (104). The follower's velocity changes by impulse over its mass (107); the leader gets the opposite impulse over its own mass (108). Orientation turns toward the pull (110-132). There is no damping term. Tether links are created only at `server/src/cmd.rs` (2321-2324, example `tether_length: 4.0`, read; the other two sites not read).
- Ticks: taming runs in the event handler, once per item use. The tether runs in the `Create` phase of the ECS each tick, scaled by `dt`. The pet agent tuning applies once, when the pet is created.

## 2. Key functions

- Collar arm: `/mnt/frankendom-donors/veloren-veloren/server/src/events/inventory_manip.rs` 616-666.
- `tame_pet_internal` (owned-pet rules, anchor, agent tuning, group): `/mnt/frankendom-donors/veloren-veloren/server/src/pet.rs` 24-117.
- `is_tameable` and `is_mountable`: `/mnt/frankendom-donors/veloren-veloren/common/src/comp/pet.rs` 39-74.
- Tether system `Sys::run` (pull and impulse): `/mnt/frankendom-donors/veloren-veloren/common/systems/src/tether.rs` 34-135.
- Tether link: `/mnt/frankendom-donors/veloren-veloren/common/src/tether.rs` 26-30 (struct `Tethered`), 60-87 (create), 89-108 (persist liveness).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (where) |
|---|---|
| Owned-pet cap | 3 (`MAX_PETS`, inventory_manip.rs:616) |
| Tame radius | 5 tiles, compared as squared distance (638) |
| Nearest selection | minimum of distance squared x 100 (644) |
| Eligibility by body | List in comp/pet.rs 44-55 (four mammoth-class species excluded) |
| Pet tuning | Idle wander 0.25, aggro range 0.25 (pet.rs:83-84) |
| Mount mass rule | rider mass / mount mass < 0.7 (comp/pet.rs:65) |
| Tether pull | max(0, distance - tether_length) (systems/tether.rs:99) |
| Tether stiffness | 50000 x pull factor, times dt (systems/tether.rs:100, 104) |
| Tether example length | 4.0 (cmd.rs:2324) |

Worked (my arithmetic, not run): squared radius is 25; a wolf 4.9 tiles away has squared distance 24.01 and is in range; a wolf at 5.0 tiles is not (25 is not below 25).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (cap first, then nearest eligible within the squared radius, then owned-state change and consumption flag). It replaces the ECS queries with an array, moves the eligibility list to a set of kinds (the donor hard-codes it in a match), and leaves out the owned-by-other and owns-pets refusals, the anchor, the trading behaviour, the group join, the mounting rules and the tether. The donor's integer key (distance squared times 100) is replaced by a plain float comparison.

```ts
// Licence: GPL-3.0 (donor LICENSE file). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Collar tame: no roll. Refuse at the owned-pet cap; otherwise the nearest wild, eligible creature within the radius becomes owned.
const MAX_PETS = 3;
const TAME_RADIUS = 5; // tiles; compared as squared distance, as the donor does

type Alignment = "wild" | "npc" | { owner: number };
interface Creature { id: number; x: number; y: number; kind: string; alignment: Alignment; }

// Eligible kinds are data (the donor hard-codes a match; the donor comment says quadrupeds only, the code also allows birds and crustaceans).
const TAMEABLE_KINDS = new Set<string>(["wolf", "deer", "bird", "crab"]);

interface UseResult { tamed: number | null; collarConsumed: boolean; }

// Use a collar. Refused (collar kept) at the cap or when no candidate is in range.
function useCollar(ownerId: number, ox: number, oy: number, ownedCount: number, world: Creature[]): UseResult {
  if (ownedCount >= MAX_PETS) return { tamed: null, collarConsumed: false };
  let best: Creature | undefined;
  let bestD2 = Infinity;
  for (const c of world) {
    if (c.alignment !== "wild" || !TAMEABLE_KINDS.has(c.kind)) continue;
    const d2 = (c.x - ox) ** 2 + (c.y - oy) ** 2;
    if (d2 < TAME_RADIUS * TAME_RADIUS && d2 < bestD2) { best = c; bestD2 = d2; }
  }
  if (!best) return { tamed: null, collarConsumed: false };
  best.alignment = { owner: ownerId };
  return { tamed: best.id, collarConsumed: true };
}

// Pet tuning applied when a creature becomes owned: stays near its owner and wakes to threats less readily.
interface PetTuning { idleWander: number; aggroRange: number; patrolOrigin: null; }
function petTuning(): PetTuning { return { idleWander: 0.25, aggroRange: 0.25, patrolOrigin: null }; }

const herd: Creature[] = [
  { id: 1, x: 0, y: 0, kind: "wolf", alignment: "wild" },
  { id: 2, x: 4, y: 0, kind: "wolf", alignment: "wild" },
  { id: 3, x: 3, y: 0, kind: "dragon", alignment: "wild" },
];
console.log(useCollar(9, 0, 0, 2, herd).tamed, useCollar(9, 0, 0, 3, herd).collarConsumed, petTuning().aggroRange);
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, PASSED (exit 0), file with `export {}` as the last line (work copy: `/private/tmp/p2/wave2-haiku/batch3/PM001/work/veloren-collar-tame.ts`).

## 5. Lands in

- TARGET `src/fight/tame.ts` (new module: the collar-style tame is a catalogue rule with an owned-pet cap; the eligibility list is catalogue data). Parity-checklist row 21 (catalogue fields: eligibility kinds, owned-pet cap, tame radius and the pet tuning are catalogue fields).
- Today: no tame or collar item in Frankendom (not read in this pass; the target is a proposal).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the cap, radius and eligibility are data; the server applies the tame and records the owner).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Defect 1, comment drift (`comp/pet.rs` 40-42): the comment says only quadrupeds are tameable; the match also allows `BirdMedium` (53) and `Crustacean` (54). Fix: the eligibility list is catalogue data, and the doc says what the data says.
- Defect 2, tether has no damping (`systems/tether.rs` 99-108): the pull is a spring of stiffness 50000 applied as an impulse each frame with no damping. My arithmetic, not run: with a semi-implicit step at 1/60 s, the spring is stable only while omega times dt is below 2, where omega is sqrt(50000 / mass), which means a follower under about 3.5 mass units oscillates or diverges. The donor's masses were not read. Fix (keep the idea): add a damping term on the relative velocity, or clamp the impulse to the distance that would close the gap in one step.
- Defect 3, the leader is pulled too (108): the leader gets the opposite impulse over its own mass, so a light follower can drag a heavy leader and a light leader is moved by a heavy follower. For a companion leash this is a design choice to set explicitly, not a bug. Frankendom's one-ledger and server-verified positions mean a companion must not move the player; fix: pull only the follower in the companion case.
- The tether is a generic link (`common/src/tether.rs`), created only by server command code in the donor (cmd.rs 2321, 2532, 6468). Do not present it as the donor's pet leash.
- Tame is instant (no roll). In Frankendom the tame is a server event like any other; that is a design choice. A cap of 3 is the same number as Frankendom's MAX_ATTACKERS. They are different rules; do not merge them.
- Mounts: the donor's rule is a mass ratio; Frankendom has no mount rule. The dismount placement and the mount system were not read in full.
- Not read: the rest of `mounting.rs` (516 lines), `systems/src/mount.rs` (333 lines), the other `tame_pet` call sites, and `SetPetStayEvent` (`server/src/events/interaction.rs:238`). Stabling is therefore not covered by this note.
- MAX_ATTACKERS = 3 in Frankendom: a companion would count as an attacker in a many-on-one fight. Not designed here; the engine owns that count.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one engine: cap, radius and eligibility are data; the server records the owner)
