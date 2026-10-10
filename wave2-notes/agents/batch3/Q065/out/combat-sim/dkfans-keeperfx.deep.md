# dkfans-keeperfx (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` | Licence: GPL-2.0-or-later (per source headers: "either version 2 of the License, or (at your option) any later version", thing_stats.c 15-16; the repo LICENSE file is the GPL v2 text) | C | symbol `apply_damage_to_thing`

Checked: Symbol `apply_damage_to_thing` is defined at thing_stats.c 1125 (read through its closing brace, which comes before line 1164). The chain above it was read: the hit roll `get_damage_of_melee_shot` (thing_shots.c 965-984, read in full); the melee blow `compute_creature_attack_melee_damage` (thing_stats.c 512-521) and its caller `calculate_melee_damage` (thing_creature.c 3605-3616); the wrapper `apply_damage_to_thing_and_display_health` (thing_creature.c 6231-6244); the creature damage step `apply_damage_to_creature` (thing_stats.c 977-1014); armour `calculate_correct_creature_armour` (thing_stats.c 700-725); defence `calculate_correct_creature_defense` (thing_stats.c 726-733). Not read: the level-scaling functions `compute_creature_max_armour` and `compute_creature_max_defense`, `lua_on_apply_damage_to_thing`, the death handler that runs after health goes below zero, the `LbRandomSeries` body. Callers: grep finds 15 callers of `apply_damage_to_thing` (spells, traps, doors, lava, slaps); I read only the melee shot caller (`melee_shot_hit_creature_at`, thing_shots.c 1102; read to about 1160, its end was not confirmed). Confidence high on the order of operations in the damage step; medium on how each caller sets its raw damage. camera_scope: n/a.

## 1. Mechanism

- A hit is two decisions, then one damage step. Decision one is the hit roll, in `get_damage_of_melee_shot` (thing_shots.c 965). If the shot is `NeverBlock` (967-968) it always returns the shot damage. Otherwise it computes `hitchance = (shot dexterity - target defence) / 2` (970), clamps it to -96..96 (971-977), and the hit lands if a 0..255 roll is below `128 + hitchance` (979). A miss returns -1.
- Decision two is the blow size for melee creatures. `calculate_melee_damage` (thing_creature.c 3605) takes the creature's strength and passes it, with its luck and level, to `compute_creature_attack_melee_damage` (thing_stats.c 512). That doubles the blow when a 0..99 roll is under the luck value (517-518). The code that writes the result into the shot was not read.
- The damage step runs in this order, in `apply_damage_to_thing` (thing_stats.c 1125):
  (a) zero or negative damage returns 0 (1129-1130);
  (b) a thing already below zero health returns 0 (1132-1133);
  (c) a Lua hook is called (1134), not read;
  (d) by class: creatures go to `apply_damage_to_creature`; objects and traps take the raw damage with no armour (`apply_damage_to_object`, 1016-1022); doors take raw damage (`apply_damage_to_door`, 1024-1029).
- Inside `apply_damage_to_creature` (977): if the creature has `CCFlg_PreventDamage` it returns 0 (980-981), before any armour. Otherwise it reads the armour (984), computes `cdamage = dmg * (256 - armour) / 256` (986), raises it to 1 if it is 0 or less (987-988), subtracts it from health (990), and sets `last_turn_damaged` to the game turn plus one (991). A possessed creature also gets a palette flash and rumble (not in the sketch).
- Back in `apply_damage_to_thing`: if health is now below zero, and no player has been recorded as the fighter (`fighting_player_idx == -1`), and the dealer is a real player, that player is recorded as the killer (1141-1146). The death handler itself was not read.
- Armour (`calculate_correct_creature_armour`, 700-725): start from the level-scaled base (not read); if the armour spell is on, multiply by 320/256 (707); cap at 204 (709-710), with the donor comment at 708 saying this keeps armour at "up to 80% of damage even with the buff"; clamp negative to 0; for non-neutral things apply the dungeon's armour percent (718); cap at 255 (721).
- Defence (`calculate_correct_creature_defense`, 726-733): the level-scaled base (not read), with no dungeon modifier yet (`TODO`, 731).
- Tick: none. This is synchronous: one call per hit, from the shot's hit handler (melee path at 1112-1122, from `melee_shot_hit_creature_at`). No loop drives it.

## 2. Key functions

- `apply_damage_to_thing`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` 1125 to its closing brace. The entry point for every damage source; the order above.
- `apply_damage_to_creature`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` 977-1014. Prevent flag, armour soak, minimum 1, health, last-hit turn.
- `get_damage_of_melee_shot`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_shots.c` 965-984. Hit roll: dexterity minus defence over 2, clamped to +-96, against 128 of 256.
- `compute_creature_attack_melee_damage`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` 512-521. Luck doubles the blow.
- `calculate_correct_creature_armour`: `/mnt/frankendom-donors/dkfans-keeperfx/src/thing_stats.c` 700-725. Buff 320/256, cap 204, dungeon percent, cap 255.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hit chance centred on half the roll range, moved by (attacker stat - defender stat) / 2, clamped | Centre 128 of 256 (thing_shots.c 979); divisor 2 (970); clamp +-96 (971-977) |
| Armour as a fraction out of 256: damage * (256 - armour) / 256, floored, minimum 1 | Divisor 256 (thing_stats.c 986); minimum 1 (987-988) |
| Blow doubles on a percentage roll | Luck is a percent (517-518, theirs); no clamp in the compute function, so luck of 100 or more always doubles |
| Immunity flag returns before any armour or health change | `CCFlg_PreventDamage` (980) |
| Kill credit = first player to take a creature below zero | `fighting_player_idx == -1` check (1144) |
| Armour buff multiplier then cap | 320/256 (707); cap 204 (709-710), 80 percent comment (708); hard cap 255 (721) |
| Per-thing random seed for every roll | `THING_RANDOM` macro (game_merge.h 61) uses the thing's own `random_seed` (LbRandomSeries body not read) |
| Health bar shown for 8 turns after a hit | 8 (thing_creature.c 6241); presentation only |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the damage step (no-op checks, prevent flag, armour soak with minimum 1, health, kill credit on the lethal hit) and the hit roll and melee doubling. It takes rolls as inputs instead of drawing them from a per-thing seed. It omits the Lua hook, the possession palette and rumble, the object, trap and door branches, the level-scaled base stats, the armour buff and dungeon percent (the caller passes the effective armour), the melee damage-percent scaling, life drain, hit-stop, group-up, and the death handler. Kill credit uses `null` for the donor's -1.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Defender {
  health: number;
  armour: number;           // effective armour 0..255, already buffed and modified by the caller
  preventDamage: boolean;   // true = takes no damage at all
  lastDamagedTurn: number;
  killedBy: number | null;  // first player whose hit left the defender below zero
}

// Hit roll for an attack shot. Chance is centred on 128 of 256 and moved by
// (shot dexterity - defence) / 2, clamped to +-96.
function rollHit(shotDexterity: number, defence: number, roll256: number): boolean {
  let hitChance = Math.trunc((shotDexterity - defence) / 2);
  hitChance = Math.min(96, Math.max(-96, hitChance));
  return roll256 < 128 + hitChance;
}

// Melee blow: strength, doubled when a 0..99 roll falls under the luck percentage.
function meleeBlow(strength: number, luckPercent: number, roll100: number): number {
  return roll100 < Math.min(100, luckPercent) ? strength * 2 : strength;
}

// One damage application. Order: no-op checks, prevent flag, armour soak with a
// minimum of 1, health loss, then kill credit on the lethal hit.
function applyDamage(d: Defender, raw: number, attackerPlayer: number | null, gameTurn: number): number {
  if (raw <= 0) return 0;
  if (d.health < 0) return 0;          // already dead
  if (d.preventDamage) return 0;
  const armour = Math.min(255, Math.max(0, d.armour));
  let dealt = Math.floor((raw * (256 - armour)) / 256);
  if (dealt <= 0) dealt = 1;           // a landed hit always does at least 1
  d.health -= dealt;
  d.lastDamagedTurn = gameTurn + 1;
  if (d.health < 0 && d.killedBy === null && attackerPlayer !== null) {
    d.killedBy = attackerPlayer;
  }
  return dealt;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new engine damage step, the one place health changes): parity-checklist row 1 (duel step / sim). The hit roll and melee doubling sit in the same step, so the duel can be replayed from the server seed. Frankendom's current layout was not re-checked for this note.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: one damage function that does a hit roll, then armour as a fraction out of 256 with a floor of 1, then health and first-lethal-hit credit, all server-side.
Decision (proposed): adapt — the hit-roll and armour-fraction shape fit a duel step, but KeeperFX's order (immunity check before armour) and its per-thing seed must be changed to match our server-verified kills and our one ledger.
Acceptance: a server test: a 0-armour defender takes the full raw hit; a 255-armour defender takes 1 (never 0) from a non-zero hit; a defender with the prevent flag takes 0 and loses no armour; the first lethal hit records the attacker and a second lethal hit does not overwrite it.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism. The numbers (256, 128, 96, 204, 320/256, 1) are stated as observed; the sketch does not copy the C lines.
- Order: KeeperFX returns on the prevent flag before armour (980 before 984), so an immune target loses no armour. The Quake note in this library applies armour before its immunity gates. Frankendom must pick one order and test it.
- Rolls: KeeperFX rolls from each thing's own random seed. Frankendom's kills are server-verified, so the roll must come from a server-side seed that clients cannot choose. The `LbRandomSeries` body was not read, so the seed derivation is unknown.
- Kill credit: KeeperFX records the first player to make the creature lethal (1144-1146) and does not change it later. Frankendom's hate list and XP share (rows 18 and 4) need a rule for the same case; this only covers the single credit field.
- Level scaling is not read: the base armour and defence per level (`compute_creature_max_armour`, `compute_creature_max_defense`) are unknown here, so the donor's numbers cannot be turned into Frankendom values yet.
- The dungeon modifiers (armour percent at 718, health and strength) are per-player configuration in KeeperFX. For Frankendom they would be zone data, not an engine constant.
- Melee damage: the path from `calculate_melee_damage` into the shot's damage was not read. Only the luck doubling is confirmed.
