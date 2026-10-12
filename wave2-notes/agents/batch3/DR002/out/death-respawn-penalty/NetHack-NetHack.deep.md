# NetHack-NetHack (death-respawn-penalty, cell 1)

Donor: `/mnt/frankendom-donors/NetHack-NetHack/src/bones.c` (with `src/end.c`) | Licence: NetHack General Public License (`dat/license`, 1989 M. Stephenson, based on the GNU GPL; copyleft-style, source must travel with copies) | C | symbol `drop_upon_death` / `can_make_bones` / `savebones`

Checked: Read in full `drop_upon_death` (bones.c 259-300), `can_make_bones` (356-374), `give_to_nearby_mon` (226-254), `getbones` gate (631-647), `set_ghostly_objlist` and `fix_ghostly_obj` (785-818); `savebones` lines 403-520 and 586-612; `done()` life-saving and bones branch (end.c 1084-1097, 1204-1222, 1368) and `savelife` (end.c 707-746). Not read: savebones lines 520-585 and 613-630 (bones file write plumbing), the caller of `getbones`, and what `done()` does with inventory when bones are not made. Confidence: high on the death-pile roll and the depth gate; medium on the file-level persistence. Not read: `pickup.c` 1888 beyond the grep hit.

Best transferable idea: a death leaves a lootable pile only with a chance that depends on depth, so starter zones never carry corpse loot and deeper zones do; the roll is one draw at death, and every item in the pile is rolled separately.

Decision (proposed): adapt — keep the depth-gated pile chance as zone data and drop the drop-everything and the 80% curse, because Frankendom's take-one loot and one ledger do not allow a whole inventory to vanish or to be handed to monsters.
Acceptance: A death in a starter zone leaves no lootable pile; a death in a deep zone leaves one in a seeded-test share of deaths matching the zone's pile chance (server test asserts within 3 points over 10,000 seeded deaths), and the killer can take one item from it.

## 1. Mechanism

- There is no corpse run and no respawn. Death ends the run, except for an amulet of life saving (see step (g)). Frankendom's question is what the death leaves behind, and the donor's answer is a bones pile.
- Step (a), the death call: `done()` in `end.c` first checks life saving (1084). If the amulet is worn, it crumbles, Constitution drops by 1 (1096), and `savelife` sets HP to `min(max, 50 + 10 * (Con / 2))` (710, 719). Otherwise, the bones decision is `bones_ok = (how < GENOCIDED) && can_make_bones()` (1204). The cause of death also picks what is left of the body (1211-1222): panicked or burning leaves no corpse, stoning leaves a statue (1215), turning to green slime leaves a slime.
- Step (b), the gate (`can_make_bones`, bones.c 356-374): bones need `flags.bones` (360); the level must not be a no-bones level and the hero must not be swallowed (364-367); a magic portal blocks bones on non-branch levels (369-373). The depth gate (376-377): bones are refused if `depth <= 0`, or if `rn2(1 + (depth >> 2))` returns 0. So the chance that a death leaves bones is 1 - 1/(1 + floor(depth/4)). Depth 1-3 never; 4-7 one half; 8-11 two thirds; 12-15 three quarters.
- Step (c), `savebones` (403-): if a bones file for this level already exists, it is compressed and the function returns (406-420, read). Otherwise, unique monsters are sent away, named fruits are marked, and every inventory object is flagged `ghostly` (455, `set_ghostly_objlist`).
- Step (d), the drop (`drop_upon_death`, 259-300): the whole inventory is removed (271-274), including worn gear. Each item is cursed with chance 4/5 (`rn2(5)` non-zero, 290-291). Then, if the item is not going to a monster or container, one in eight goes to `give_to_nearby_mon` (296-297); the rest are placed on the death cell (299).
- Step (e), the hand-off (`give_to_nearby_mon`, 226-254): it scans the 3x3 cells around the death cell for monsters that like gold, gems, objects or magic, skipping the hero (232-245). It picks one uniformly with a running count (`if (!rn2(nmon))`, 247). The item goes to that monster only if `can_carry`; otherwise it is placed on the cell (251-254).
- Step (f), the ghost (default branch, 493-512): `makemon(PM_GHOST)` on the death cell (498), with HP equal to the dead hero's max HP (510) and level equal to the hero's level, asleep at creation (512). The ghost is the guard of the pile.
- Step (g), life saving: the amulet is the only resurrection (1084-1097, see above). It is consumed and costs 1 Constitution.
- Before the file is written, `savebones` flags every monster inventory (543), the floor objects (556) and the buried objects (558) as ghostly and resets them (read; not receipted). Loading a bones file: `getbones` returns early unless `rn2(3) == 0`, so only one game in three can meet an existing bones file (646-647). When a ghostly object is picked up, `fix_ghostly_obj` clears the flag (815); the call site is `pickup.c` 1888-1889 (grep hit, not read in full).

## 2. Key functions

- `drop_upon_death`: `/mnt/frankendom-donors/NetHack-NetHack/src/bones.c` 259-300. The whole drop: loop over inventory, curse roll, monster hand-off roll, place.
- `can_make_bones`: `/mnt/frankendom-donors/NetHack-NetHack/src/bones.c` 356-374 plus the depth gate at 376-377. Decides whether a death persists at all.
- `give_to_nearby_mon`: `/mnt/frankendom-donors/NetHack-NetHack/src/bones.c` 226-254. Uniform pick among adjacent loot-liking monsters that can carry the item.
- `savebones`: `/mnt/frankendom-donors/NetHack-NetHack/src/bones.c` 403-520 (read in part; the ghost and inventory drop are 455-512).
- `done()` gate: `/mnt/frankendom-donors/NetHack-NetHack/src/end.c` 1204 (`bones_ok`) and 1368 (`savebones` call).
- Life saving: `/mnt/frankendom-donors/NetHack-NetHack/src/end.c` 707-746 (`savelife`) and 1084-1097 (amulet branch).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Death persists with chance 1 - 1/(1 + floor(depth/4)); zero at depth 1-3 | Depth divisor 4 and offset 1 (theirs, bones.c 377) |
| One draw at death decides the whole pile; no draw per item for persistence | Single gate (theirs, 376-377) |
| Each item rolls its own curse with chance 4/5 | 4/5 (theirs, `rn2(5)` at 290) |
| Each item rolls a hand-off with chance 1/8 | 1/8 (theirs, `rn2(8)` at 296) |
| Hand-off target is a uniform pick among candidates | Candidate set = adjacent monsters that like loot (theirs, 232-247) |
| Bones loaded by one game in three | `rn2(3)` (theirs, 646) |
| Ghost HP = dead hero's max HP | Ghost made on the death cell (theirs, 498, 510) |
| Life saving HP = base + per Constitution pair | Base 50, 10 per pair of Constitution (theirs, 710) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (depth gate first, then per-item roll with curse, then the hand-off roll, then place). It omits the monster `can_carry` test (the sketch hands off to any listed monster), the 3x3 scan (the caller supplies the candidate ids), the magic-portal and no-bones-level checks, the pre-existing bones file check, the ghost, the statue and slime branches, life saving, and worn gear (the donor drops worn gear too, 271-273). Curse is kept as a flag on the placed item, not an effect.

```ts
// Licence: NetHack General Public License (donor, copyleft-style). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface DeathItem { id: string; cursed: boolean; }

type Placement = { kind: "pile" } | { kind: "monster"; monsterId: string };

interface PlacedItem { id: string; cursed: boolean; placed: Placement; }

interface DeathPile { persists: boolean; items: PlacedItem[]; }

// Chance that a death at this depth leaves a recoverable pile: 1 - 1/(1 + floor(depth/4)).
// Depth 1-3 never leaves one; 4-7 gives 1/2; 8-11 gives 2/3; 12-15 gives 3/4.
function pileChance(depth: number): number {
  if (depth <= 0) return 0;
  const k = 1 + Math.floor(depth / 4);
  return 1 - 1 / k;
}

// rand() returns a value in [0, 1). Every carried item is dumped (worn gear included).
// Each item is cursed with chance 0.8; with chance 1/8 it goes to a nearby monster that
// likes loot (uniform pick among candidates), otherwise it lies on the pile cell.
function rollDeathPile(
  depth: number,
  items: DeathItem[],
  nearbyLootMonsterIds: string[],
  rand: () => number,
): DeathPile {
  if (rand() >= pileChance(depth)) return { persists: false, items: [] };
  const out: PlacedItem[] = [];
  for (const it of items) {
    const cursed = it.cursed || rand() < 0.8;
    let placed: Placement = { kind: "pile" };
    if (rand() < 1 / 8 && nearbyLootMonsterIds.length > 0) {
      const i = Math.floor(rand() * nearbyLootMonsterIds.length);
      placed = { kind: "monster", monsterId: nearbyLootMonsterIds[i] };
    }
    out.push({ id: it.id, cursed, placed });
  }
  return { persists: true, items: out };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/dr002-nethack-death-pile.ts`, copy in `work/nethack-death-pile.ts`).

Note on the sketch: the donor's `rn2(5)` curse and `rn2(8)` hand-off draws happen for each item in order, so the sketch's draw order matches the donor. The donor reads the whole inventory list in order (274), so the sketch does too.

## 5. Lands in

- TARGET `src/fight/death.ts` (new module, engine death step; reads the zone's pile chance as data). Parity-checklist row 17 (death/respawn). The brief hint said row 23; row 23 covers zone population, so it is cited only for the zone field that sets the pile chance per zone tier.
- Frankendom's current death path is not read here; the target module does not exist yet.
- Reuse tag: rewrite-from-idea (NetHack General Public License, copyleft-style; clean-room only)
- Brief rule served: rules 1, 3 (one ledger: any item that persists must stay a server-tracked pile), rule 8 (section 5 names a module and a row); 7-9 n/a

## 6. Gaps and risks

- Take-one vs drop-all: NetHack drops the whole inventory (271-274). Frankendom uses take-one loot. Do not port the drop-all. Keep only the persistence gate.
- The 4/5 curse on every dropped item (290-291) is a penalty on loot, not a death penalty for the player. It conflicts with a server-verified item state. Cut it; if a death penalty is wanted, express it as a named debuff with a duration, not a silent curse flag.
- The 1/8 hand-off (296-297) moves loot into a monster with no ledger entry. That breaks the one-ledger ruling. Reject it.
- Ghost guard (498-512) is a monster spawned on the death cell with the hero's HP. In Frankendom this would be a zone spawn governed by row 23 caps and grace timers; do not give it a special path.
- Randomness: the donor uses one shared RNG (`rn2`) with no seed recorded. Frankendom kills are server-verified, so the pile roll must run on the server with a recorded seed in the ledger, otherwise a replay cannot reproduce it.
- No PvP tiers: NetHack has no player-versus-player death tier, so this note cannot judge a PvP-flag death rule. That gap stays open.
- Life saving (1084-1097) consumes an amulet and costs one Constitution. Frankendom has no Constitution stat; if a revive token is wanted, its cost should be a data field with a default, not a constant.
- Not read: the exact return path of `done()` after life saving, and whether a death without bones still ends the run with inventory intact.
