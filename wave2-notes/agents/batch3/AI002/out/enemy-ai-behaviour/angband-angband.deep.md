# angband-angband (enemy-ai-behaviour, cell 3)

Donor: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` | Licence: dual, "either: a) the GNU General Public License ... version 2, or b) the Angband licence" (mon-move.c header 9-20); we take option a, GPL-2.0 (copyleft), and write clean-room only | C | symbol `get_move`

Checked: Read in full: `get_move` (mon-move.c 836-967), `get_move_advance` (391-502), `get_move_find_range` (212-301), `get_move_bodyguard` (309-368), `get_move_find_hiding` (613-666), `get_move_flee` (675-731), `monster_can_hear` and `monster_can_smell` (104-123). Fear and damage: `monster_scared_by_damage` (mon-util.c 1140-1182) and its two callers (1216 region, 1243, 1291), read in full. Noise and scent: `make_noise` head and the propagation loop (game-world.c 1163-1210), `update_scent` (379-410), the per-turn call (658-659). Data: `constants.txt` 56-63 and 195; `monster.txt` rows cave spider (1116-1130), wolf (3082-3090); `changes.txt` 157, 245, 366, 456. Groups: `group_monster_tracking` and `monster_group_leader` (mon-group.c 451-487). Not read: `monster_turn` body beyond the `get_move` call (1503-1692 partly), `z_info->max_hearing` value, the child-cell filter inside `make_noise` (after 1210), the race loader (how `race->level` is set from `depth:`), the `monster_turn_should_stagger` path. Candidates opened: mon-move.c, mon-util.c, game-world.c, mon-group.c, cave.c (ddgrid order 73-75), constants.txt, monster.txt, changes.txt. Confidence: high on the decision order, the fear formula and the flows; medium on the level field (race->level source not read). Verdict STRONG; depth full.

Best transferable idea: a monster's whole move decision is one ordered chain (track by sight, then sound from a per-turn noise flood, then scent age; then terrain, pack ambush, fear run, pack surround, and a fallback), with the fear test a power score (level plus four times the health fraction) and the sensing ranges as per-race numbers.
Decision (proposed): adapt - take the ordered chain, the power-score fear test, the damage fear roll and the pack ambush rule; fix the morale term (the donor uses the monster's index bit, so it is arbitrary and invisible to designers: replace with a seeded per-creature draw shown in the row), state the +25 offset as a data field, and cap the afraid hold as a data value.
Acceptance: A server test: a pack creature in view of a player who stands in open ground above half HP moves to an unseen ambush spot at least 3/4 of the player distance plus 2 away and does not charge; a creature hit for half its remaining HP (or at 10% HP on a roll) gets a fear timer and runs; a creature with no move while afraid is held for the same number of turns.

## 1. Mechanism

- Per monster turn (`monster_turn`, mon-move.c 1503; `get_move` is called at 1574) the decision order in `get_move` (836-967) is fixed:
  1. `get_move_find_range` sets `min_range` (how close it will stay) and `best_range` (its preferred distance); called at 851, before the chain at 854.
  2. `get_move_advance` picks a target from the senses: (a) sight: if the monster's cell is in the player's view, go straight at the player (422); (b) sound: if the monster hears (base hearing above the noise value at its cell, 428), take the first neighbour with less noise than the current cell; (c) scent: if none of that and it smells (470), take the neighbour with the best scent.
  3. If that fails: follow a group member that is tracking and in line of sight (`group_monster_tracking`, first such member in list order, mon-group.c 451-467); else keep the last target if tracking; else a random step.
  4. Terrain damage: flee to safety (`get_move_find_safety`), done.
  5. Pack ambush (animal packs, GROUP_AI, not wall-passing): if fewer than 5 of the 8 cells around the player are open or room squares, and the player is above half HP, find an ambush spot (`get_move_find_hiding`; the test is at 905).
  6. Afraid (`min_range == flee_range`): flee to a safety spot (`get_move_find_safety`, then `get_move_flee`), done (917 onward).
  7. Pack surround (GROUP_AI, player in view, not adjacent): take an empty square next to the player, starting at a random offset (934 onward; `randint0(8)` at 942).
  8. Otherwise the chosen target is a step; a zero offset means "already there" (return false).
- Power score (`get_move_find_range`, 212-307): an afraid monster (fear timer or the frightened flag) has `min_range = flee_range`. A bodyguard does not flee (226). Otherwise the monster's level is `race level + (midx & 0x08) + 25` (241). If `m_lev + 3 < p_lev`, run (244). If `m_lev - 5 < p_lev`, compare `p_lev*p_mhp + 4*p_chp` with `m_lev*m_mhp + 4*m_chp` by cross-multiplication (computed at 257; compared at 261); if the player's is larger, run. Taunted monsters skip this (232). The power test sets `min_range = flee_range`; then line 277 (`if !(min_range < flee_range) min_range = flee_range`) fires first, so the `else if cdis < turn_range -> min_range = 1` branch (279-281) applies only to monsters that are NOT already running: it just undoes the +3 bump that NEVER_MOVE / NEVER_BLOW monsters get. A close monster that fails the power check still runs. `flee_range` is `max_sight + flee-range` = 20 + 5 = 25 grids (constants.txt 58, 195; mon-move.c 219).
  - Algebra for the reader: `p_val/p_mhp = p_lev + 4 * (p_chp/p_mhp)`, so the test is "player level plus four times the health fraction is greater than the monster's", applied only when the player's level is above the monster's effective level minus 5 (mon-move.c 246).
- Hearing and smell per race: `hearing` and `smell` are race fields (monster.txt, e.g. cave spider `hearing:8` at 1121, wolf `hearing:30` at 3088 and `smell:50` at 3089). Base hearing = race hearing minus player stealth / 3 (397; 106-107).
- Noise: `make_noise` (game-world.c 1168-1210) floods outward from the player over the level, +1 per step (+4 under cover of tracks, 1173), and stops spreading past `z_info->max_hearing` (1204). It is rebuilt every player turn that is not resting (658).
- Scent: `update_scent` (379-410) ages all scent by one per player turn (400), then, unless the player has TMD_COVERTRACKS (early return at 406, so no scent is laid), lays a 5x5 pattern of values 2, 1, 0 around the player (388-398). A monster smells only scent younger than its `smell` value (`monster_can_smell`, 117-124: `race->smell > scent`); scent 0 means never visited.
- Fear from damage (`monster_scared_by_damage`, mon-util.c 1140-1182; player hits reduce HP at 1291 and check fear at 1311; monster-on-monster hits reduce HP at 1216 and check fear at 1243; the check runs only after a non-lethal hit):
  - if already afraid: a roll of 1 to the damage taken reduces fear; if the roll reaches the fear, fear is cured (1144-1156);
  - otherwise, only if `monster_can_be_scared(mon)` (1157): `percentage = 100*hp/maxhp` (1159); runs if `randint1(10) >= percentage` (1162, so about 10 percent HP or less) or if the hit took the monster to no more than the damage (`dam >= hp` after the hit, which is "half of what it had") with 80 percent chance (1165);
  - fear time = `randint1(10)` plus 20 if `dam >= hp` and percentage above 7, else `(11 - percentage) * 5` (1169-1172).
- Afraid with no move: the fear turns into a hold of the same length (mon-move.c 1672-1676; changelog line 157 "afraid monsters with nowhere to run become held").
- Flee destination (`get_move_flee`, 675-738): if the player is near (within the best range) or the monster can hear or smell, score each neighbour, diagonals first, by `5000/(d+3) - 500/(noise+1)`, where `d` is the distance to the flee target and `noise` is the noise value at that cell (711). Clamped at 0. The effect is a swerve around the player rather than a straight line away.
- Bodyguard (`get_move_bodyguard`, 309-368): a bodyguard stays next to its leader; if more than one cell away and the leader is in line of sight or within 10, it steps to a neighbour closer to the leader, preferring one that is also closer to the player (326).
- Ambush spot (`get_move_find_hiding`, 613-666): nearest empty, projectable, unseen cell at ring distance 1 to 9 from the monster, at least `distance(player)*3/4 + 2` from the player (620), closest to the player among those (649).

## 2. Key functions

- `get_move`: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` 836-967 (chain 851-966).
- `get_move_advance`: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` 391-502.
- `get_move_find_range`: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` 212-301.
- `get_move_bodyguard`: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` 309-368.
- `get_move_find_hiding`: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` 613-666.
- `get_move_flee`: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` 675-731.
- `monster_can_hear` / `monster_can_smell`: `/mnt/frankendom-donors/angband-angband/src/mon-move.c` 104-123.
- `monster_scared_by_damage`: `/mnt/frankendom-donors/angband-angband/src/mon-util.c` 1140-1182.
- `make_noise`: `/mnt/frankendom-donors/angband-angband/src/game-world.c` 1168-1210; `update_scent`: `/mnt/frankendom-donors/angband-angband/src/game-world.c` 379-410.
- `group_monster_tracking`: `/mnt/frankendom-donors/angband-angband/src/mon-group.c` 451-467.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Decide by sight, then sound, then scent, with a fallback | None (order) |
| Sound: a flood field from the player, cut at the largest hearing value | Noise +1 per step, +4 under cover of tracks (game-world.c 1173); cut at z_info->max_hearing (1204; value not read) |
| Hearing margin: race hearing minus stealth / 3 | Divisor 3 (mon-move.c 397); cave spider 8, wolf 30 (monster.txt 1121, 3088) |
| Scent as age, with a per-race oldest-smellable age | Aging +1 per turn (game-world.c 400); pattern 2 / 1 / 0 (388-398); wolf smell 50 (monster.txt 3089) |
| Power score: level + 4 x health fraction, compared with cross-multiplication | Band: player level above effective monster level minus 5 (mon-move.c 246); "+3" run margin (244); level offset +25 (241); morale bit 8 (241) |
| A monster not running and closer than turn-range drops min range to 1 (a close monster that fails the power check still runs) | turn-range 5 (constants.txt 62; mon-move.c 277-281) |
| Range keeping: NEVER_MOVE / NEVER_BLOW +3 min range, archers +3 best range, spellcasters (freq_spell > 24) +3, breathers hold point blank | 3 (mon-move.c 266-300) |
| Flee range | max-sight 20 + flee-range 5 (constants.txt 58, 195) |
| Damage fear: low-HP roll and big-hit roll | 10 (low HP roll, mon-util.c 1162); 80 percent (1165); fear time 10 + 20, or (11 - pct) * 5 (1169-1172) |
| Afraid pain: cut the fear by a roll up to the damage | randint1(dam) (1146) |
| Pack ambush | Fewer than 5 open cells (mon-move.c 905); half HP (905); ambush distance 3/4 + 2 (620) |
| Bodyguard leash | 10 cells (326) |
| Flee score | 5000 / (d + 3) - 500 / (noise + 1) (711) |

## 4. TypeScript sketch

simplified: the sketch keeps the power-score run test (with its margin, band and cross-multiplication), the afraid-overrides-distance rule, the damage fear roll (pain cuts fear; low-HP and big-hit triggers; fear time), the afraid-held conversion, the sight-sound-scent step order, the pack ambush test and distance, and the flee score. It takes the morale value as a field, seeded by the caller (the donor's index bit is not reproduced). It omits: the taunt skip, the range-keeping bumps (NEVER_MOVE / NEVER_BLOW / archers / casters / breathers; only the close-monster min range 1 is a helper), decoy targeting, the frightened race flag, the equal-noise backup step, the group tracker and the group surround, the bodyguard leash, the terrain-damage flee, the safety-map search, the reproduction and item steps, and the stagger. The step search returns an index into the neighbour list instead of a direction. Neighbour lists and the noise and scent fields are passed in. The RNG is passed in and is not the donor's.

```ts
// Licence: GPL-2.0 (donor option a; the donor is also offered under the Angband licence). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number; // uniform in [0, 1)
const randint1 = (n: number, rng: Rng): number => 1 + Math.floor(rng() * n); // 1..n
const randint0 = (n: number, rng: Rng): number => Math.floor(rng() * n);     // 0..n-1

interface Race { level: number; hearing: number; smell: number; } // per-race row fields
interface Mon {
  race: Race;
  hp: number;
  maxHp: number;
  morale: number; // 0 or 8 in the donor (from the index bit); the fix seeds it per creature
  fear: number;   // turns of fear left
  canBeScared: boolean; // donor monster_can_be_scared gates the new-fear branch
  hold: number;   // turns held still
}
interface Player { level: number; hp: number; maxHp: number; stealth: number; }

const FLEE_RANGE = 25; // max sight 20 + flee-range 5 (constants.txt)
const TURN_RANGE = 5;  // a monster that is NOT running and is closer than this stays at min range 1 (constants.txt)

// Run decision: an afraid monster runs at any distance; otherwise the monster runs when the player is
// clearly stronger (level, then level and health cross-multiplied). Distance does NOT exempt a monster
// that fails the power check (the donor sets min_range = flee_range before the turn-range test).
function runsFromPlayer(m: Mon, p: Player): boolean {
  if (m.fear > 0) return true;
  const mLev = m.race.level + m.morale + 25;
  if (mLev + 3 < p.level) return true;
  if (mLev - 5 < p.level) {
    const pVal = p.level * p.maxHp + 4 * p.hp;
    const mVal = mLev * m.maxHp + 4 * m.hp;
    return pVal * m.maxHp > mVal * p.maxHp;
  }
  return false;
}

// Damage can cut existing fear, or cause fear. HP is already reduced when this runs (donor order).
function onDamage(m: Mon, dam: number, rng: Rng): void {
  if (dam <= 0 || m.hp <= 0) return;
  if (m.fear > 0) {
    const tmp = randint1(dam, rng);
    if (tmp < m.fear) m.fear -= tmp; else m.fear = 0;
    return;
  }
  if (!m.canBeScared) return;
  const pct = Math.floor((100 * m.hp) / m.maxHp);
  const lowHp = randint1(10, rng) >= pct;            // runs sometimes at 10% or less
  const bigHit = dam >= m.hp && randint0(100, rng) < 80; // usually when the hit takes half of what was left
  if (lowHp || bigHit) {
    let time = randint1(10, rng);
    time += dam >= m.hp && pct > 7 ? 20 : (11 - pct) * 5;
    m.fear = time;
  }
}

// For a monster that is not running: close monsters drop min range to 1 (undoing the +3 range bumps).
function minRangeWhenNotRunning(dist: number, bumpedMinRange: number): number {
  return dist < TURN_RANGE ? 1 : bumpedMinRange;
}

// Afraid and no move possible this turn: the fear turns into a hold of the same length.
function onNoMove(m: Mon): void {
  if (m.fear > 0) { m.hold += m.fear; m.fear = 0; }
}

// Tracking: sight first, then the quieter-to-louder noise field, then the scent.
// Returns -1 to go straight at the player, an index into nbrs, or null (no track).
interface Field { noise: (cell: number) => number; scent: (cell: number) => number; }
function trackStep(m: Mon, p: Player, inView: boolean, cell: number, nbrs: number[], f: Field): number | null {
  if (inView) return -1;
  const base = m.race.hearing - Math.floor(p.stealth / 3);
  const here = f.noise(cell);
  if (here !== 0 && base > here) {
    const cur = base - here;
    for (let i = 0; i < nbrs.length; i++) {
      const n = nbrs[i];
      if (f.noise(n) === 0) continue;
      if (base - f.noise(n) > cur) return i; // first better neighbour, as in the donor
    }
  }
  if (f.scent(cell) !== 0 && m.race.smell > f.scent(cell)) {
    let best = -1, bestS = 0;
    for (let i = 0; i < nbrs.length; i++) {
      const sc = f.scent(nbrs[i]);
      const s = m.race.smell - sc;
      if (sc !== 0 && s > bestS) { bestS = s; best = i; }
    }
    if (best >= 0) return best;
  }
  return null;
}

// Pack rule: with fewer than 5 open neighbours around the player and the player above half HP,
// a pack member takes an ambush spot out of sight instead of charging.
function packAmbush(openNeighbours: number, pHp: number, pMaxHp: number): boolean {
  return openNeighbours < 5 && pHp > Math.floor(pMaxHp / 2);
}
function ambushMinDistance(distToPlayer: number): number {
  return Math.floor(distToPlayer * 3 / 4) + 2;
}

// Flee destination score: far from the flee target, and not next to the player (swerve).
function fleeScore(distToTarget: number, noiseAtCell: number): number {
  const s = Math.floor(5000 / (distToTarget + 3)) - Math.floor(500 / (noiseAtCell + 1));
  return s < 0 ? 0 : s;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copied to /tmp/ai002-angband-ai.ts) exit 0.

## 5. Lands in

- TARGET `src/fight/ai.ts` (engine AI brain: the decision chain, power test, damage fear, pack rules; server-side).
- Parity-checklist row 2 (AI brain). Pack ambush and the surround are AI brain; the aggro sub-line belongs to row 4 and is not decided here.
- Reuse tag: rewrite-from-idea (GPL-2.0 option taken; clean-room only, shape not code)
- Brief rule served: 2 (one AI brain in the engine; pack and fear are engine rules, not client logic); addendum rule 6 (copyleft: shape only).

## 6. Gaps and risks

- The morale term is a donor defect: `(mon->midx & 0x08)` (mon-move.c 241) is bit 3 of the monster's array index, so a creature's "morale" depends on its spawn slot. It is invisible to designers and not in any row. fix: a seeded per-creature draw (0 or 8) stored on the creature and shown in the row, or drop it.
- The +25 offset (241) means a race-level-10 creature (effective level 35) only runs by the power test from player level 31 (band 246), and outright from level 39 (244). This is computed from the code, not observed in play. fix: make the offset a named data field with a stated default, and test it.
- Time base: the noise flood and scent aging run per player turn (game-world.c 658-659), so a fast client shortens tracking. Frankendom keys them to server ticks.
- Cost on a small server: `make_noise` floods the whole reachable level and `update_scent` loops the whole cave every player turn (game-world.c 1173-1204, 400). Both are per player, not per creature, and both scale with zone size. Frankendom refreshes only zones with players, and caps the flood at the largest hearing value.
- Determinism: the random surround offset (mon-move.c 942, `randint0(8)`), the fear rolls and the 80 percent big-hit roll are global RNG draws. Server verification needs seeded draws per creature.
- Many-on-one: the pack surround fills empty cells next to the player with no slot cap (the code is in get_move 934-948), so a pack can exceed three attackers. MAX_ATTACKERS = 3 has to be an engine cap; the donor shows none.
- The pack surround loop (mon-move.c 943-952) falls through to the last square if all 8 are filled (the `continue` never ends in a break), so the monster heads to a filled square. fix: stop when none is empty.
- Sound-following skips grids with an unkillable/immovable monster or damaging terrain (446-453), and decoy targeting exists (monster_is_decoyed, 394/838); neither is in the sketch.
- The group tracker (mon-group.c 451-467) returns the first tracking member in list order, not the nearest. fix: pick the nearest tracker.
- The afraid hold lasts as long as the fear was set: up to 30 turns for a big hit above 7 percent HP, and up to 60 at 1 percent HP (`randint1(10)` plus `(11 - pct) * 5`). A creature held that long next to a player is a free kill. fix: cap the hold as a data field.

## 7. As data

- Yes, the donor has data rows. `monster.txt` has one block per race with fields such as `name`, `base`, `speed`, `hit-points`, `hearing`, `smell`, `armor-class`, `sleepiness`, `depth`, `rarity`, `experience`, `blow` (repeatable), `flags` (repeatable: e.g. `flags:ANIMAL | WEIRD_MIND` at 1128, `flags:GROUP_AI` at 1129) and `friends` (chance:count-dice:name, e.g. `friends:100:2d8:Same` at 1130). Engine numbers are in `constants.txt` (`mon-play:flee-range:5` at 58, `mon-play:turn-range:5` at 62, `player:max-sight:20` at 195).
- Row fields a Frankendom creature row would need (name: type): hearing: int; smell: int (oldest scent it can follow, in player turns); level: int (donor race level, source field not read); pack: bool (GROUP_AI); friends: chance and count; flee_mode: enum (never | power | fear_only); morale_seed: bool (replaces the index bit).
- A new creature is one row: yes, for a new monster with the same sense and fear rules (the rows at monster.txt 1116 and 3082 differ only in these fields). A new pack tactic is code.
- Engine constants (not per row): flee range, turn range, the 5-of-8 open threshold, the ambush distance formula, the fear roll sizes, the flee score weights.

## 8. Provenance and patch history

- Provenance: repo `angband-angband`, mon-move.c header "either: a) the GNU General Public License ... version 2, or b) the Angband licence" (mon-move.c 9-20). We take GPL-2.0; copyleft; shape only. No CLAUDE.md or AGENTS.md read.
- Patch history (changes.txt, Angband 4 changelog; version headings not read):
  - line 157: "afraid monsters with nowhere to run become held" (the hold rule, 1672-1676).
  - line 245: "Monster groups act more as a group, with leaders and sometimes bodyguards" (bodyguard and group tracking).
  - line 366: "explicitly by sight, sound or scent" (the three-sense tracking order).
  - line 456: "Allow group monsters to melee the player in open areas again" (the pack rule has been reversed once; the open-area threshold in 905 is the current rule).
- No history line covers the morale index bit or the +25 offset.

## 9. Rulings for Dom

1. Adopt the power score (player level plus four times the health fraction) for when a creature runs from a much stronger player, with the offset as a named data field? Recommendation: yes, with the offset set by Dom, not 25 by default.
2. Animal packs (wolves, hounds) ambush instead of charging when the player stands in open ground and is above half HP, as a row flag `pack_ambush`? Recommendation: yes; it fits the three-attacker cap and gives a visible tactic on a phone.
3. Should a creature with no move while afraid be held, and for how long at most? Recommendation: hold for the fear turns but cap the hold at a data value (for example 10 turns); Dom to set the cap.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Turn-range rule was wrong in section 3 and the sketch: after the power test sets min_range = flee_range, line 277 fires first, so the cdis < turn_range -> min_range = 1 branch (279-281) only applies to monsters not already running. A close monster that fails the power check still runs.
- monster_scared_by_damage new-fear branch is gated by monster_can_be_scared (mon-util.c 1157); omitted.
- update_scent returns early under TMD_COVERTRACKS (game-world.c 406): no scent is laid; note only mentioned the +4 noise increment.
- 'get_move (836-981)' vs '836-967' internal mismatch (real end 967).
- Missed: range-keeping rules in get_move_find_range (266-300: +3 for NEVER_MOVE/NEVER_BLOW, archers, casters; breathers point blank), decoy targeting (394/838), sound-following skips (446-453); surround loop falls through to a filled square if all 8 are occupied (donor defect).
- Everything else verified (get_move order, advance, find_range constants, fear constants, constants.txt, monster.txt rows, changes.txt, mon-group, licence, as-data section).

Fixed 2026-10-12: turn-range rule in mechanism, numbers table and sketch (runsFromPlayer no longer exempts close monsters; new minRangeWhenNotRunning helper); canBeScared gate added to onDamage and Mon; covertracks scent; line range 836-967; range-keeping and surround-fallthrough lines added. Sketch mirrored in work/angband-ai.ts.
Typecheck on VPS (tsc --strict, es2020) of the updated work/angband-ai.ts: exit 0.
