# NetHack-NetHack (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/NetHack-NetHack/src/mcastu.c` (with `src/mthrowu.c` breath, `src/monmove.c` caller, `include/mcastu.h` table) | Licence: NetHack General Public License (`/mnt/frankendom-donors/NetHack-NetHack/dat/license` line 1, "NETHACK GENERAL PUBLIC LICENSE", Copyright 1989 M. Stephenson; free redistribution with source; not a standard GPL, so clean-room only) | C | symbols `choose_monster_spell`, `castmu`, `breamm` (dragon breath), `buzzmu`

Checked: Read in full: `choose_monster_spell` (mcastu.c 89-124), `castmu` lines 130-245 (cast selection, cooldown, fumble, damage start), `spell_would_be_useless` (909-935, partly), the caller that makes non-attacking casters cast undirected spells (monmove.c 884-906), the caller in attacks (mhitu.c 925-932), `mon_regen` cooldown decrement (monmove.c 307-313, caller mon.c 1193), the spell table (include/mcastu.h 18-37), `breamm` breath cooldown (mthrowu.c 1093-1134, partly), `buzzmu` (mcastu.c 989-1013). Player-side comparison read: `percent_success` (spell.c 2173-2288) and the fail roll (spell.c 1371-1376). Not read: the per-spell effect bodies (`mcast_*` functions), `nasty()` (summons), `buzz()` body, `lined_up()`, the rest of `breamm` after line 1134. Confidence: high on the pick, cooldown and fumble formulas (read end to end); medium on the breath branch (read the cooldown lines, not the full ray call). camera_scope: not applicable.

Best transferable idea: pick a boss's ability from a roll capped by its level, take the strongest usable one at or below the roll, and set a level-scaled cooldown after each use, so a level-4 boss only ever casts tier 0-3 abilities without any script.

Decision (proposed): adapt — keep the level-gated pick, the tiered lists and the level-scaled cooldown; fix the fumble rule, which in the donor is always true at monster level 1-2 (so a level-1 or level-2 caster never casts), because a boss tier ladder must work at every level.
Acceptance: a server test with a level-4 caster over 100 picks never chooses a tier 4+ ability, and a level-1 caster fumbles at most 50% of casts; in the fight a level-4 boss shows a readable tier ladder (tier 0-3 abilities only) with a cooldown of 6 ticks after each cast.

## 1. Mechanism

- A caster is a monster with an ability list and a level. The list is fixed per caster family, in ascending tier order: wizard list (12 entries, `mcastu.c` 32-35), cleric list (10 entries, 27-30). Each entry has a tier (`include/mcastu.h`), e.g. Psi Bolt tier 0, Cure Self tier 1, Summon Monsters tier 15, Death Touch tier 20.
- Pick (`choose_monster_spell`, 89-124): `spellval = rn2(m_lev)`, so the roll is 0 to level-1 (111). If the roll is above the list's top tier and `rn2(top)` is non-zero, it is re-rolled to `rn2(top)` (112-113). Then walk the list from the top and take the first entry whose tier is at or below the roll and is not useless (117-118). Fallback: the first entry (122).
- Cast attempt (`castmu`, 130-245): for an attack, a directed spell is searched up to 40 times (153-168). The attempt is skipped if the caster is cancelled, is on cooldown, or has level 0 (175). Order of steps after that: (a) cooldown is set to `10 - m_lev` if m_lev < 8, else 2 (185); (b) fumble: `rn2(ml x 10) < 20` (100 when confused) makes the air crackle and the cast miss (208); (c) the spell effect runs; for damage spells, `dmg = d(ml/2 + damn, damd)` (241), or `d(ml/2 + 1, 6)` when `damd` is 0 (243), halved as `(dmg+1)/2` if the hero resists halving (245).
- Non-attacking casters (monmove.c 895-902): a monster with no cooldown and within distance squared 49 of the hero calls `castmu` with the undirected flag; only undirected spells can be cast this way, so most of the time the monster moves normally.
- Cooldown tick: `mon_regen` decrements `mspec_used` by 1 on each call (monmove.c 311-312); its caller is `mon.c` 1193.
- Breath (dragon ranged attack, `breamm`, mthrowu.c 1093-1140): when lined up and `!mspec_used`, the breath fires on `rn2(3) != 0` (2 turns in 3, line 1117). After a breath, `mspec_used = 8 + rn2(18)` (1131-1132) is set only if the target is not the hero, or if `rn2(3) == 0` (1131). Against the hero, the breath therefore often repeats next turn. A sleep breath against a hero without sleep resistance adds `rnd(20)` to the cooldown (1133-1134).
- Ranged zap (`buzzmu`, mcastu.c 1000): when lined up, a 2-in-3 chance per turn to zap (`rn2(3)`), with no cooldown set in this function (not read).
- Tick: the donor does not run real time. `mon_regen` is called from `mon.c` 1193; whether that call runs once per game turn or once per monster move was not confirmed (caller not read in full), so the unit of the cooldown is stated as ticks.

## 2. Key functions

- `choose_monster_spell`: `/mnt/frankendom-donors/NetHack-NetHack/src/mcastu.c` 89-124. Tier roll, reroll above the top tier, highest usable entry at or below the roll.
- `castmu`: `/mnt/frankendom-donors/NetHack-NetHack/src/mcastu.c` 130-245. Retry loop, cooldown, fumble, damage start.
- `breamm`: `/mnt/frankendom-donors/NetHack-NetHack/src/mthrowu.c` 1093-1140. Breath fire roll and cooldown.
- `buzzmu`: `/mnt/frankendom-donors/NetHack-NetHack/src/mcastu.c` 989-1013. Ranged zap, `lined_up` and `rn2(3)`.
- `mon_regen` cooldown decrement: `/mnt/frankendom-donors/NetHack-NetHack/src/monmove.c` 307-313.
- Callers: `/mnt/frankendom-donors/NetHack-NetHack/src/mhitu.c` 930 (attack) and `/mnt/frankendom-donors/NetHack-NetHack/src/monmove.c` 895-902 (undirected cast).
- Player side (comparison only): `percent_success` in `/mnt/frankendom-donors/NetHack-NetHack/src/spell.c` 2173-2288, and the fail roll at 1371-1376.

## 3. Numbers vs mechanism

TABLE (name | effect | formula | number ranges | cost | cooldown/cast time | caps | file:line)

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Wizard ability list | ascending tier list | fixed list | tiers 0, 1, 2, 3, 4, 6, 8, 10, 13, 15, 18, 20 | none | none | top tier 20 | mcastu.c:32-35; include/mcastu.h:18-37 |
| Cleric ability list | ascending tier list | fixed list | tiers 0, 1, 2, 4, 6, 8, 10, 11, 12, 13 | none | none | top tier 13 | mcastu.c:27-30; include/mcastu.h:18-37 |
| Tier roll | which tier is allowed | rn2(m_lev) | level 1 gives 0; level 4 gives 0-3; level 10 gives 0-9 | none | none | roll < m_lev | mcastu.c:111 |
| Tier reroll | a very high caster cannot skip the top tiers | if roll > top and rn2(top) != 0, roll = rn2(top) | only possible when m_lev > top + 1 (monster level 22+ for the wizard list, top 20) | none | none | none | mcastu.c:112-113 |
| Pick | strongest usable at or below roll | walk list from top, tier <= roll and not useless | e.g. level 4 wizard: only Psi Bolt, Cure Self, Haste Self, Stun You | none | none | fallback list[0] | mcastu.c:116-122 |
| Retry | find a directed usable spell | up to 40 tries | cnt = 40 | none | none | 40 | mcastu.c:153, 168 |
| Cooldown after cast | pause before the next cast | 10 - m_lev if m_lev < 8, else 2 | level 1: 9; level 3: 7; level 7: 3; level 8+: 2 | none | ticks (unit as in the donor's mon_regen; see section 1) | none | mcastu.c:185 |
| Cooldown tick | cooldown runs down | mspec_used-- per mon_regen call | 1 per call | none | ticks | none | monmove.c:312; mon.c:1193 |
| Fumble | cast misses, air crackles | rn2(m_lev x 10) < 20 (100 if confused) | level 1-2: always; level 3: 67%; level 5: 40%; level 10: 20%; level 20: 10% | cooldown already spent (185 before 208) | none | none | mcastu.c:208 |
| Damage | spell damage | d(m_lev/2 + damn, damd); d(m_lev/2 + 1, 6) when damd is 0 | level 10, damn 1, damd 6: d(6,6) = 6-36 | none | none | none | mcastu.c:241-243 |
| Halved damage | half-damage resistance | (dmg + 1) / 2 | halves, rounded up | none | none | none | mcastu.c:245 |
| Undirected cast | cast while not attacking | only if mspec_used == 0 and dist2 <= 49 | distance 7 or less | none | cooldown applies | undirected only | monmove.c:895-902 |
| Breath fire | dragon breath | rn2(3) != 0 when lined up and off cooldown | 2 in 3 per turn | none | none | lined up | mthrowu.c:1117 |
| Breath cooldown | pause after breath | 8 + rn2(18) | 8-25 ticks; vs hero set only 1 in 3 | none | 8-25 ticks | none | mthrowu.c:1131-1132 |
| Sleep breath extra | sleep breath is longer | + rnd(20) | +1 to +20 ticks | none | added | no sleep resistance | mthrowu.c:1133-1134 |
| Ranged zap | non-breath ranged spell | lined up and rn2(3) | 2 in 3 per turn | none | none | lined up | mcastu.c:1000 |
| Player comparison: chance | the hero's base chance | 11 x stat / 2, capped at 120 | stat 18 gives 99 | none | none | 120 | spell.c:2230, 2262 |
| Player comparison: difficulty | spell harder than hero | (level - 1) x 4 - (skill x 6 + ulevel / 3 + 1); if > 0, chance -= isqrt(900 x d + 2000) | | none | none | none | spell.c:2240, 2244 |
| Player comparison: power cost | energy per cast | 5 x level | 5-35 | 5 x level energy | none | none | include/spell.h:36 |
| Player comparison: fail roll | cast fails | fail if rnd(100) > chance; energy cost / 2 | | half energy | one turn | none | spell.c:1372-1373 |

Which numbers suit a fast mobile fight: the tier ladder (a caster's level sets which abilities it can use) is the number that transfers directly, because a boss phase can be a level. The cooldown of 10 minus level (2 to 9) is in monster moves; for a 375-wide fight, 2 to 4 ticks feels right for top tiers. The breath cooldown (8-25) is long enough to read as a pause; the 1-in-3 cooldown against the hero is the donor's way to make a breath feel dangerous, and is worth copying as a data field.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's tier pick (roll, reroll above the top tier, highest usable entry at or below the roll, fallback to the first), the cooldown rule, the damage dice, and the breath fire and cooldown rule. It changes the fumble rule as the fix noted in the Decision: the donor threshold 20 is capped at level x 5 (donor: always fumbles at levels 1-2). It omits the 40-try directed search, the cancelled and resistance checks, the messages, the undirected cast branch in monmove, the per-spell effect bodies, `buzzmu`, `lined_up` and the rest of `breamm` (hunger and pet branches).

```ts
// Licence: NetHack General Public License (donor dat/license). Restricted: clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface SpellDef {
  name: string;
  level: number;               // tier of the ability; list is in ascending level
  usable: (c: Caster) => boolean;
}

export interface Caster {
  level: number;               // monster level (m_lev)
  cooldown: number;            // ticks until the next cast
  confused: boolean;
}

// Pick: roll 0..level-1. If the roll is above the top tier, reroll below the top with high probability.
// Then take the highest usable spell whose tier is at or below the roll; fall back to the first spell.
export function pickSpell(c: Caster, list: SpellDef[], rand: (n: number) => number): SpellDef {
  const top = list[list.length - 1].level;
  let roll = rand(c.level);
  if (roll > top && rand(top) !== 0) roll = rand(top);
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].level <= roll && list[i].usable(c)) return list[i];
  }
  return list[0];
}

// Cooldown after a cast: 10 - level below level 8, otherwise 2 ticks.
export function cooldownAfterCast(level: number): number {
  return level < 8 ? 10 - level : 2;
}

// Fumble: the donor rolls rand(level x 10) < 20 (100 when confused), which always fumbles at level 1-2.
// Fix used here: the 20 is capped at level x 5, so levels 1-4 fumble half the time and levels 4+ keep the donor rate.
export function fumbles(c: Caster, rand: (n: number) => number): boolean {
  const threshold = c.confused ? 100 : Math.min(20, c.level * 5);
  return rand(c.level * 10) < threshold;
}

// Damage: (level / 2) + dice dice of sides sides, halved (rounded up) when the target resists halving.
export function castDamage(
  level: number,
  dice: number,
  sides: number,
  halved: boolean,
  rand: (n: number) => number,
): number {
  const count = Math.floor(level / 2) + dice;
  let dmg = 0;
  for (let i = 0; i < count; i++) dmg += rand(sides) + 1;
  return halved ? Math.floor((dmg + 1) / 2) : dmg;
}

// Breath: fires on 2 of 3 turns when lined up and off cooldown. After a breath at the hero the cooldown
// (8..25 ticks) is set only 1 time in 3; against any other target it is always set.
export function breathTurn(
  b: { cooldown: number },
  lined: boolean,
  targetIsHero: boolean,
  rand: (n: number) => number,
): boolean {
  if (b.cooldown > 0 || !lined) return false;
  if (rand(3) === 0) return false;
  if (!targetIsHero || rand(3) === 0) b.cooldown = 8 + rand(18);
  return true;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/caster-ai.ts` (new module, engine AI brain: tier pick, cooldown, fumble, breath). Parity-checklist row 2 (AI brain). The cast execution (damage, effects) stays with row 13 (specials).
- Reuse tag: rewrite-from-idea (NetHack General Public License; clean-room only)
- Brief rule served: one engine (the pick and the cooldown are engine state per monster, not client state); MAX_ATTACKERS = 3 applies to who may cast into the fight (caster must be one of the three attackers, not checked here); clean-room only.

## 6. Gaps and risks

- NGPL, not a standard GPL: clean-room only. The sketch is written from the mechanism.
- Defect (keep the idea, fix the defect): `castmu` line 208 rolls `rn2(ml x 10) < 20`. A monster of level 1 or 2 always fumbles, so it never casts. Fix: cap the 20 at level x 5 (sketch `fumbles`). The cooldown is also spent on a fumble (185 is set before 208), which is kept as a design choice, but the Frankendom test should decide whether a fumble should cost the cooldown.
- The breath cooldown against the hero is set only 1 time in 3 (1131). That makes a dragon breathe on consecutive turns often. Frankendom should expose this as a data field (breath repeat chance), not as a constant, because it changes how a dragon boss feels.
- Against the one-ledger ruling: the cooldown is per-monster state in the engine. Frankendom must keep it in the engine record, not in the Pit or zone client.
- Against zones as data: the tier lists are fixed per caster family (engine constant); the monster level comes from the encounter (zone data). Keep the level in zone data so a boss phase can be a level.
- Summons: `mcast_summon_mons` (SUMMON_MONS, tier 15) calls `nasty()` (not read) to create monsters. Frankendom must count summoned units against the zone population cap (parity row 23) and the attacker limit (MAX_ATTACKERS = 3), otherwise a summoner breaks both.
- Time model: the donor counts monster moves, not real time. Frankendom must convert the cooldown to real time on the server tick (the sketch's ticks are the server's tick unit, not seconds).
- Not read: the per-spell effect bodies, `buzz()`, `lined_up()` and the rest of `breamm`. The breath range and damage dice are not confirmed here.
- Reject considered: the 40-try loop for a directed spell (cheap on the server, but a retry loop hides the real pick rate; a single pick plus a fallback is clearer).

Reuse tag: rewrite-from-idea (NetHack General Public License; clean-room only)
Brief rule served: one engine (per-monster AI state in the engine record); clean-room only (NGPL). Parity row 2.
