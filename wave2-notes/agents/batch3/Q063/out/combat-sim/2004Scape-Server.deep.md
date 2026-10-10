# 2004Scape-Server (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/` (RuneScript .rs2; engine op handlers in `/mnt/frankendom-donors/2004Scape-Server/src/engine/script/handlers/`) | Licence: MIT (root `LICENSE`, line 1 "MIT License", Copyright (c) 2023-2025 Lost City) | RuneScript + TypeScript | symbols `player_npc_hit_roll`, `npc_melee_attack_roll`, `npc_meleeattack`, `playerhit_n_melee`

Checked: Read in full: `npc/npc_combat_melee.rs2` (1-50), `player/player_melee.rs2` (1-59), `player/player_combat.rs2` (1-132), `npc/npc_combat.rs2` (1-341), `combat.rs2` (1-175), `player/player_combat_stat.rs2` (1-140; the mirror copy at 141-256 not read). Engine primitives read: `randominc` and `scale` in `NumberOps.ts` (36-39, 123-126). Not read: the `calc()` op (used at combat.rs2:8 and :12), `pushInt` rounding, the `queue()` timing engine, `damage_self`, `check_protect_prayer`, `equip_get_bonuses`, the tick loop that advances `map_clock`. Confidence high on order of steps and on the formulas as written; medium on integer rounding (calc not read). Confidence this is the real melee path: high for the NPC and player melee files read. `pvp/pvp_melee.rs2` has the same roll and max-hit names (seen in grep, not read).

## 1. Mechanism

Melee hit resolution is roll against roll. Each side computes an integer attack roll and an integer defence roll. Each side then draws a uniform integer from 0 up to its own roll. The attacker hits only if its draw is strictly greater. On a hit, the damage is another uniform integer from 0 up to the max hit. A miss still produces a 0-damage swing, which the target shows as a block.

NPC swings at the player (`npc/npc_combat_melee.rs2`):
- (a) `npc_melee_attack_roll` (12-20) returns 0 first if the protect check passes (13-14). Otherwise the attack roll is effective attack x (attackbonus + 64), with an effective attack of level + 9 (18).
- (b) The defence roll is the player's stored roll for the damage style (`player_defence_roll_specific`, line 25). The max hit is from the NPC's strength (lines 5-8, 26).
- (c) Hit test (30): `randominc(attack) > randominc(defence)`. Hit: damage = `randominc(maxhit)` (31). Miss: damage 0 (34).
- (d) `playerhit_n_melee` (36-50): sets the NPC action delay to now + delay (41). A melee NPC at 0 hp returns with no damage (42-45). Otherwise it queues `combat_damage_player` with 0 delay (46). Poison is queued only if severity > 0 and damage > 0 (47-49). Retaliation is queued last (50). The NPC path does not apply the `max_dealt` cap (only the player path does).

Player swings at the NPC (`player/player_melee.rs2`, with the roll in `player/player_combat.rs2`):
- (a) Gates: the swing waits while the action delay is in the future (8-11), and a dead NPC stops the action (13-16).
- (b) Hit test (20): `player_npc_hit_roll` (player_combat.rs2:25-33). The attack roll is the player's stored roll for the chosen style (36-45). The defence roll is `npc_defence_roll_specific` (npc_combat.rs2:266-275).
- (c) Only on a hit (20-32): max hit = the player's stored max (21). Demonbane-vulnerable NPC with silverlight worn: max x 160/100 (25-26). Count Draynor with garlic: +1 (22-23). Damage = `randominc(min(maxhit, max_dealt))` (28). Damage is capped at the NPC's hp for XP (29). XP and hero points are given on a hit only (30-31).
- (d) Poison roll: 1 in 4 when a poison weapon hits (37). Animation, sound and retaliation (44-47). Then `npc_queue(2, damage, 0)` (47). Queue 2 is `npc_default_damage` (npc_combat.rs2:2, 56-71): 0 damage shows a block, otherwise a damage mark; at 0 hp it queues death (71).
- (e) Attack delay: 4 ticks unarmed (54), otherwise the weapon's `attackrate` (56).

Numbers as the code writes them. Effective level = level x max(100, prayer%) / 100 (combat.rs2:5). Player style term: +8 on the effective level plus the style bonus (player_combat_stat.rs2:70). The NPC term is +9 (npc_combat_melee.rs2:6, 18; npc_combat.rs2:273). Style bonus: accurate gives +3 attack, aggressive +3 strength, defensive +3 defence, controlled +1 to each (combat.rs2:52-55). Roll = effective x (bonus + 64) (combat.rs2:12). Max hit = (strength roll + 320) / 640 (combat.rs2:8).

Worked example (the donor formulas, not a measured number): attacker level 60 on accurate with bonus 0 gives attack roll (60 + 8 + 3) x 64 = 4544. Defender level 60 with no style gives defence roll (60 + 8) x 64 = 4352. Under the uniform-draw model that is a hit chance of about 52.1 percent. Strength roll (60 + 8 + 3) x 64 = 4544 gives max hit (4544 + 320) / 640 = 7.6, which is 7 under floor rounding (calc() rounding not read).

Tick: both sides gate their swings on the server tick counter `map_clock`, by comparing it with action-delay values (player_melee.rs2:8; npc_combat_melee.rs2:41). The combat lock is 8 ticks since the last combat on the player side (player_combat.rs2:85). I did not read the tick loop that advances `map_clock`, so the fixed-step claim is not checked.

## 2. Key functions

- `player_npc_hit_roll`: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/player/player_combat.rs2` 25-33 (attack vs defence draw).
- `player_melee` label (player swing): `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/player/player_melee.rs2` 2-59 (gates, hit test, damage on hit, XP, poison, queue, delay).
- `npc_meleeattack` and `npc_melee_attack_roll`: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/npc/npc_combat_melee.rs2` 1-34 (rolls, hit test, damage).
- `playerhit_n_melee`: same file, 36-50 (delay, 0-hp rule, queue of damage, poison, retaliation).
- `npc_default_damage` (queue 2): `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/npc/npc_combat.rs2` 56-71.
- `npc_defence_roll_specific`: same file, 266-275.
- Stat and roll helpers: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/combat.rs2` 4-12 (effective level, roll, max hit).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Roll against roll: both sides draw uniform 0..roll, hit if attacker draw is greater | Roll base 64 (theirs, combat.rs2:12) |
| Effective level = level scaled by prayer, never below 100 percent | Floor 100 percent (theirs, combat.rs2:5) |
| Style term added to the effective level | +8 player, +9 NPC (theirs, player_combat_stat.rs2:70; npc_combat_melee.rs2:18); style bonus +3 or +1 (theirs, combat.rs2:52-55) |
| Max hit from the strength roll | (roll + 320) / 640 (theirs, combat.rs2:8) |
| Damage is a uniform draw up to the max hit, only on a hit | Demonbane x 160/100 and garlic +1 are per-NPC or per-item cases (theirs, player_melee.rs2:21-26) |
| Per-NPC cap on damage | `max_dealt` param, player side only (theirs, player_melee.rs2:28); values seen in config: 0 (yanille.npc:247), 3 (antimacro.npc:43), read only as config, not as behaviour |
| Swing timing | Unarmed 4 ticks (theirs, player_melee.rs2:54); weapon attackrate (theirs, player_melee.rs2:56); NPC attackrate per NPC, 5 in varrock.npc:622 (config) |
| Flinch: the NPC's next swing waits half its attack rate after it retaliates | Divide by 2 (theirs, npc_combat.rs2:11) |
| Ring of recoil | 10 percent plus 1, capped at attacker hp, members only (theirs, npc_combat.rs2:301-302) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (attack draw, defence draw, hit test, damage draw only on a hit) but takes the already-computed rolls and max hit as inputs, so the caller does the stat and style maths. It omits the protect-prayer check itself, the prayer multiplier and the style table (both are in the helpers, not in `meleeSwing`), the demonbane and garlic changes (the caller folds them into the max hit), XP and hero points, poison, retaliation and flinch, the 8-tick combat lock, the action delays, the recoil ring and the death queue. The helpers floor their results, which is my assumption: `calc()` rounding was not read. `randomInc` is modelled as floor(rng x (n + 1)), matching `NumberOps.ts:38`, but `pushInt` truncation was not read.

```ts
// Clean-room sketch: 2004Scape-style melee swing (roll against roll, then damage up to a max hit).
// Shape only, written from the described mechanism; donor licence MIT (Lost City). Not a line-by-line translation.

export type Rng = () => number; // uniform in [0, 1)

// Level scaled up by a prayer bonus (never below 100 percent), plus a flat style term.
export function effectiveLevel(level: number, prayerPct: number, styleTerm: number): number {
  return Math.floor((level * Math.max(100, prayerPct)) / 100) + styleTerm;
}

// Roll = effective level x (equipment or NPC bonus + 64).
export function roll(effective: number, bonus: number): number {
  return Math.floor(effective * (bonus + 64));
}

// Max hit from the strength roll: (strengthRoll + 320) / 640.
export function maxHit(strengthRoll: number): number {
  return Math.floor((strengthRoll + 320) / 640);
}

// Integer in 0..n inclusive.
export function randomInc(n: number, rng: Rng): number {
  return Math.floor(rng() * (n + 1));
}

export interface SwingInput {
  attackRoll: number;   // 0 when the defender's protection neutralises the swing
  defenceRoll: number;
  maxHitValue: number;
  damageCap: number;    // per-NPC cap; Infinity for none
}

export interface SwingResult {
  hit: boolean;
  damage: number;       // 0 on a miss (the target still shows a block)
}

export function meleeSwing(s: SwingInput, rng: Rng): SwingResult {
  const a = randomInc(s.attackRoll, rng); // attacker rolls first
  const d = randomInc(s.defenceRoll, rng);
  if (!(a > d)) return { hit: false, damage: 0 };
  return { hit: true, damage: randomInc(Math.min(s.maxHitValue, s.damageCap), rng) };
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (new module, engine damage step): the duel swing resolver. Parity-checklist row 1 (duel step / sim). The attack and defence rolls and the max hit sit in the engine, the client only shows the result.
- today: `src/combat.ts` (moving, per the Quake note).
- Reuse tag: adapt-allowed (MIT, Lost City; attribution if any code is copied; this sketch is clean-room)
- Brief rule served: 1 (one combat core, two clients): the roll and the damage draw run in the engine, not in the client.

Best transferable idea: a two-roll hit test (attack draw against defence draw, each bounded by a level-times-bonus roll) where the damage ceiling comes from a separate strength roll, so the hit chance and the damage ceiling are tuned by different stats.
Decision (proposed): adapt — the roll-against-roll hit and the stat-derived max hit are simple, checkable and server-friendly, so they fit one engine and server-verified kills; adapt because the donor's 8-tick locks, attack delays and one-attacker lock do not fit fast duels or MAX_ATTACKERS = 3.
Acceptance: server test with a seeded RNG: 100,000 swings at attack roll 4544 and defence roll 4352 hit about 52.1 percent, no hit exceeds the computed max hit, and a target at 0 hp takes 0 damage; the client shows a block on a miss and a number up to the max hit on a hit.

## 6. Gaps and risks

- Roll against roll gives a 0-damage miss on a large share of swings. Fast duels rely on guard, parry and stamina (row 3), so this must not add a second avoidance layer on top of parry without a test.
- Timing in the donor is in ticks (8-tick lock, 4-tick unarmed delay, attackrate). Frankendom's duel step owns its own timing (row 1); take the roll and the damage only, not the tick gates.
- The donor's one-attacker rule is "someone else is fighting that" after an 8-tick window (player_combat.rs2:85-86). Frankendom is MAX_ATTACKERS = 3, so this must become a count, not an owner lock.
- The NPC path does not apply `max_dealt`; the player path does (npc_combat_melee.rs2:31 vs player_melee.rs2:28). Frankendom must pick one damage-cap rule and test it.
- The donor's melee NPC at 0 hp deals no damage, while ranged and magic NPCs do (npc_combat_melee.rs2:43-44 comment). That is a donor quirk. Frankendom should state one rule: a dead attacker cannot hit.
- Randomness: the donor uses `Math.random` in the engine (NumberOps.ts:38). For server-verified kills and replay (row 19) the draw must come from a seeded server RNG, never from the client.
- The recoil ring and the demonbane and garlic cases are items and per-NPC flags. Frankendom should express them as data with defaults (zones as data), not as constants in the function. The recoil is members-only in the donor, so reject it unless Frankendom gear needs reflect.
- Not read: `calc()` rounding, `pushInt` rounding, `damage_self` (the player-side hp change is not checked against `Player.ts`), and the protect-prayer check. The integer model in the sketch is my assumption until those are read.
- Mechanism limits: the fixed step of the donor is not read (see section 1), so the sketch cannot promise a tick rate.

