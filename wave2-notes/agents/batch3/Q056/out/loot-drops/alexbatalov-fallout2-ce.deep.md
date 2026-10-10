# alexbatalov-fallout2-ce (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/actions.cc` (`_show_damage_to_object` 292, death callback 464-466, `_show_death` 471-501) with `src/item.cc` (`itemDropAll` 570-640) and `src/map.cc` (`_map_age_dead_critters` 1091-1199, map-load hook 1063-1068) | Licence: Sustainable Use License 1.0 (`/mnt/frankendom-donors/alexbatalov-fallout2-ce/LICENSE.md`; line 15: "You may use or modify the software only for your own internal business purposes or for non-commercial or personal use."). Restricted, not an OSI licence. Clean-room, shape only. | C++ | symbol `itemDropAll`

Checked: opened `_show_damage_to_object` (header at 292; 300-312; 430-470), `_show_death` (471-501), `_check_death` and the death-animation choice (200-283), `itemDropAll` (570-640; the tail after 640 was not read), `_map_age_dead_critters` (1055-1199), the flag and animation enums (`obj_types.h` 85-101, `animation.h` 36-60), and the script metarule call (`interpreter_extra.cc` 3236-3252). Callers of `itemDropAll` (grep): `map.cc` 1166, `actions.cc` 501, `interpreter_extra.cc` 3249, all read. Callers of `_show_death`: `actions.cc` 466 only. The donor has no random loot roll on the drop path: `itemDropAll` has no random call, and the only random call in the aging path is the blood-decal frame (`map.cc` 1180). The list hint (INFERRED) was not used. Not read: `wmMapDeadBodiesAge` (worldmap.cc 2834, grep only), `_critter_heal_hours` (critter.cc 796, grep only), the `gMaximumBloodDeathAnimations` table, the SPECIAL_DEATH branch's function header (actions.cc around 180-209), and the worn-armour details after line 604. Confidence high on the kill-time rule, the aging rule and the unreachable 14-day branch; medium on exactly which damage types reach the vanish animations, because that table was not read. camera_scope: not applicable.

Best transferable idea: a body that vanishes spills its whole inventory to the ground at its tile, a body that stays keeps its loot for a looter, and on zone re-entry after a long gap the remaining dead bodies spill and are removed (unless flagged no-drop).

Decision (proposed): adapt — take the spill-on-vanish and the no-drop flag, but the vanish must be a server state set by the kill, not an animation id; the zone re-entry rule belongs to zones-as-data (and overlaps row 23 despawn), not to loot as such.

Acceptance: a server test kills an enemy with a vanishing attack and asserts that its inventory appears as ground piles at its tile; a normal kill leaves the inventory on the corpse; a no-drop archetype leaves nothing on the ground; a zone re-entry after the threshold turns remaining corpses into ground piles and removes them.

## 1. Mechanism

- Death is a damage result. Inside `_show_damage_to_object`, if the hit is `DAM_DEAD` (464), the death animation is registered as a callback to `_show_death` with the chosen animation id (466).
- Choosing the animation: the death animation is picked from the attacker and the violence setting (`_check_death` at 260-281 returns the requested animation only if `violence_level >= minViolenceLevel` (264) and the art exists; otherwise it falls back to ANIM_FALL_BACK or ANIM_FALL_FRONT). Electrified-to-nothing (30) and exploded-to-nothing (31) are requested at maximum violence (307 and 309) for specific attackers. The SPECIAL_DEATH branch (209-210) requests exploded-to-nothing at normal violence.
- Spill, in `_show_death` (471-501): when the animation id is 30 or 31 (500) and the critter is not SPECIAL_DEATH and not NO_DROP (500), `itemDropAll(obj, obj->tile)` runs (501). So the spill is tied to the body vanishing. A fall death (animation 20 or 21, or the blood variants) does not spill; the body keeps its inventory.
- `itemDropAll` (570-640): money is one object with charges equal to its quantity (580-592). Every other stack is removed one unit at a time and each unit becomes an object on the tile (618-625). An equipped item sets `hasEquippedItems` (595), worn armour goes through `_adjust_ac` (604), and if anything was equipped the critter's frame is rebuilt at the end (635).
- Aging on zone re-entry: when the map is loaded and time has passed (1063), `_map_age_dead_critters` (1091) does nothing unless the world-map flag allows it (1093) and at least one whole hour has passed (1097-1099). Living critters are healed by the elapsed hours (not read). If more than 6 * 24 hours have passed since the last visit (1117), `agingType` is 1. The 14-day `else if` (1119) is never reached, because any value above 14 * 24 is already above 6 * 24. So agingType 2 never happens, and its miscellaneous-object branch (1147) never runs.
- With agingType 1, every dead critter (not the player) that is not a robot kill type and not NO_HEAL is collected (1133-1135). Each is spilled unless NO_DROP (1165-1166), given a blood decal with a random frame (1180), and destroyed.

## 2. Key functions

- Death callback and spill trigger: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/actions.cc` 464-466 and 471-501. Read in full.
- `itemDropAll`: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/item.cc` 570-640. Read in full except the tail after 640.
- Aging: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/map.cc` 1063-1068 and 1091-1199. Read in full.
- Death animation choice: `/mnt/frankendom-donors/alexbatalov-fallout2-ce/src/actions.cc` 200-283 and 300-312.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| The body that vanishes spills its inventory; the body that stays keeps it | Animation ids 30 (electrified to nothing) and 31 (exploded to nothing), theirs, actions.cc 500; animation enum values, theirs, animation.h 53-54 |
| Flags that block the spill | `CRITTER_NO_DROP = 0x40` (theirs, obj_types.h 95); `CRITTER_SPECIAL_DEATH = 0x1000` (theirs, obj_types.h 101) |
| Violence gate for the vanish animation | `VIOLENCE_LEVEL_MAXIMUM_BLOOD` (theirs, actions.cc 307-309) and the art-exists check (264-270) |
| Zone re-entry expiry after a gap | `6 * 24` hours (theirs, map.cc 1117); the 14-day constant (map.cc 1119) is unreachable as written |
| Money as one stack with quantity as charges | `misc.charges = quantity` (theirs, item.cc 592) |
| Death pickup per unit | one object per unit (theirs, item.cc 618-625) |

## 4. TypeScript sketch

simplified: follows the donor's three rules: (1) a kill-time spill only when the body vanishes and is neither specialDeath nor noDrop (actions.cc 500-501); (2) on zone re-entry after a long gap, dead bodies that are not robots and not noHeal spill (unless noDrop) and are removed (map.cc 1117-1166); (3) the 6-day threshold, with the unreachable 14-day branch left out. Differences: one pile per stack, where the donor makes one object per unit (money is one stack in both); no worn-armour AC adjustment (item.cc 604); no blood decal; no healing of living critters; no world-map gate (wmMapDeadBodiesAge, not read); and the vanish test is a boolean argument, not the donor's animation-id test.

```ts
interface Stack { id: string; qty: number; }

interface Body {
  tile: number;
  stacks: Stack[];        // inventory; money is a stack with id "money"
  noDrop: boolean;        // donor CRITTER_NO_DROP
  specialDeath: boolean;  // donor CRITTER_SPECIAL_DEATH
  noHeal: boolean;        // donor CRITTER_NO_HEAL; such bodies are not aged
  isRobot: boolean;       // donor KILL_TYPE_ROBOT; such bodies are not aged
  dead: boolean;
}

interface GroundPile { tile: number; id: string; qty: number; }

const EXPIRE_AFTER_S = 6 * 24 * 3600;   // donor: 6 * 24 hours since last visit (zone data in Frankendom)

// Spill every stack of a body onto the ground, one pile per stack.
function spill(body: Body, ground: GroundPile[]): void {
  for (const s of body.stacks) ground.push({ tile: body.tile, id: s.id, qty: s.qty });
  body.stacks = [];
}

// Kill-time rule: only a body that vanishes spills. A body that stays keeps its loot for looting.
function onKill(body: Body, vanishes: boolean, ground: GroundPile[]): void {
  if (vanishes && !body.specialDeath && !body.noDrop) spill(body, ground);
}

// Zone re-entry after `secondsAway`: if the gap passes the threshold, every aging body spills
// (unless noDrop) and is removed. Bodies that are robots or noHeal are kept.
function onZoneReentry(bodies: Body[], secondsAway: number, ground: GroundPile[]): Body[] {
  if (secondsAway <= EXPIRE_AFTER_S) return bodies;
  const kept: Body[] = [];
  for (const b of bodies) {
    const ages = b.dead && !b.isRobot && !b.noHeal;
    if (!ages) { kept.push(b); continue; }
    if (!b.noDrop) spill(b, ground);
    // the body itself is removed (donor objectDestroy); nothing pushed to kept
  }
  return kept;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/fo2-spill-check.ts` (sketch plus `export {};`): exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (death spill of the victim's inventory, with the no-drop flag). Parity-checklist row 18 (loot roll and XP award). The zone re-entry expiry belongs with zone population (row 23) and is noted here only because the donor puts it in the same function.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, non-commercial; clean-room only)
- Brief rule served: one ledger (the spill is written once, server-side); licence rule 7 (restricted, clean-room)

## 6. Gaps and risks

- The donor ties the spill to an animation id. Frankendom's kills are server-verified and the Pit is a client, so the vanish state must be set by the engine at the kill and sent to clients as data. Copying the animation trigger would make loot depend on the render.
- In the donor a vanishing body spills only at maximum violence (307-309 and the art check at 264-270). At lower violence the same death falls and keeps its loot. Frankendom must not let a display setting decide whether loot exists. The gate is a bug to avoid, not a rule to copy.
- The SPECIAL_DEATH critters get the vanish animation but do not spill (actions.cc 500), so a critter can vanish with nothing dropped. Frankendom needs an explicit rule for vanishing bodies with no loot.
- Aging is driven by the time since the last visit to the map (1097, 1117), not by how long each corpse has been dead. A corpse killed just before the player leaves is aged along with an old one. Frankendom's expiry, if any, must be per corpse or per zone visit, and stated as data.
- The 14-day branch (map.cc 1119) can never run, and its miscellaneous-object removal (1147) is dead code in practice. Do not copy the two-stage aging.
- `_show_death` contains a condition that is never true: `if (anim < 48 && anim > 63)` (actions.cc 478). Ignore that branch.
- Clean-room only: the donor licence limits use to internal business or non-commercial use, and the rules here are written from the mechanism.
- Frankendom has no drop roll from this donor. A kill's loot still needs a table or a recipe from another source.

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0; clean-room only)
Brief rule served: one ledger (spill written once, server-side); licence rule 7
