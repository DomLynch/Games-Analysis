# wesnoth-wesnoth (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` | Licence: GPL-2.0-or-later (attack.cpp header lines 6-9 and COPYING: GPL version 2, or any later version) | C++ | symbols `battle_context_unit_stats::battle_context_unit_stats`, `attack::perform`, `attack::perform_hit`

Checked: Callers: a grep over src finds `attack_unit_and_advance` called only from src/synced_commands.cpp:228, so the fight runs inside a synced command. Read in full: `battle_context_unit_stats` constructor (attack.cpp 76-232), `battle_context` constructor (239-259), `attack::perform` (1222-1386), `attack::perform_hit` (856-1109), `swarm_blows` (attack.hpp 43-50), `round_damage` (utils/math.hpp 78-82), `modified_chance_to_hit` (units/attack_type.cpp 852-859), `effective_damage_type` (792-821). Not read: the prediction code (`complex_fight`, `do_fight`, Monte Carlo in attack_prediction.cpp), `unit_killed`, `take_hit`, `refresh_bc`, `check_replay_attack_result`, the ToD and leadership values, `composite_value`. Confidence high on the live hit path; the claim that the preview matches it is not checked. camera_scope: not a camera note.

## 1. Mechanism

- One fight is one `attack::perform` call. It builds a `battle_context` (attack.cpp 1243), which builds one stats record per side (257-258): each side's hit chance, damage, strike count and specials are computed from its own weapon and the other side's weapon, terrain and resistances.
- Stats order (attack.cpp 76-232, per side): (a) hp is clamped to 0..max (123-132). (b) Base hit chance is `100 - defender terrain defence` when that is given (171), otherwise the defender's `defense_modifier` for the terrain (not read). The weapon then applies `clamp(cth + accuracy - parry, 0, 100)` (units/attack_type.cpp 857); an invulnerable defender gets 0 (174-175); the result is clamped to 0..100 (178). (c) Damage multiplier: start at 100, add the time-of-day bonus (189 or 192) and the leadership bonus (200), then multiply by the resistance percent (206). (d) `damage = round(base x mult / 10000)` (209); the slowed value is `round(base x mult / 20000)`, which is half (210); a slowed attacker uses it (212-214). (e) Strike count: `num_blows = calc_blows(hp)` (230), where `swarm_blows` returns the max at full hp and interpolates linearly toward min as hp falls (attack.hpp 43-50).
- Rounding (math.hpp 78-82): ties go toward the base damage. The offset is half the divisor, minus one when the multiplier is above the divisor, so a 25 percent bonus on base 10 (resistance 100) gives 12, not 13. Result is at least 1 when base is nonzero.
- Exchange order (attack.cpp 1222-1386): the defender opens only when it has firststrike and the attacker does not (1299). Otherwise the attacker strikes first. Strikes then alternate: attacker if it has strikes left and the defender is not opening (1316-1321), defender if it has strikes left (1327-1332). When both have spent their strikes and a berserk round remains, both counts reset and the round counter drops (1336-1341). The loop ends when both have 0 strikes (1343-1347) or a unit dies (`perform_hit` returns false, 1317-1331).
- Per strike (`perform_hit`, 856-1109): by default the roll is an integer 0..99 (889) and the strike hits when `roll < cth` (891). A 100 chance always hits and 0 never hits. On a hit the damage is the attacker's current damage (895). The defender's hp is reduced by that damage (976, `take_hit`; its internal clamp is not read). Drain on a hit is `damage_done x drain_percent / 100 + drain_constant`, capped at the attacker's max hp and floored so it cannot kill the attacker (922-931). A death calls `unit_killed` (1048-1049) and ends the loop. Otherwise the attacker's strike count drops by one (1095).
- Experience: each side earns `combat_xp(opponent level)` (1296-1297), which is `combat_experience x level` (game_config.hpp 56).
- Biased mode (opt-in, not the default): used only when the random mode is "biased" and the game is not networked (744). The campaign dialog's default choice (RNG_DEFAULT) sets the random mode to the empty string (singleplayer.cpp 63); which choice the dialog pre-selects was not read. It keeps a credit per side: `expected = (cth x strikes_left + credit) / 100` (883); the strike hits when `random(0..strikes_left-1) < expected` (884); then `credit += cth - 100 x hit` (885). The credit is reset to a random 0..99 whenever that side's cth changes (878-880).
- Replay check (live path): each strike's chance, hit flag and damage are checked against the replay record (899-908). If the record says the defender died and the game does not, the record wins (1000-1018). This is a sync check for replays, not a server check.
- Tick: no tick loop in the logic read. The whole fight runs synchronously inside one command (`attack::perform`, 1222-1386); the animation calls in the loop (e.g. `unit_display::unit_attack`, 965-973) are display only, and no timer or accumulator appears in the code read.

## 2. Key functions

- `battle_context_unit_stats::battle_context_unit_stats`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 76-232. Builds one side's hit chance, damage (percent stack), slowed damage and strike count.
- `battle_context::battle_context`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 239-259. Builds both sides; each side's stats take the other side's weapon as the opponent weapon (257-258).
- `attack::perform`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 1222-1386. Strike order, firststrike, berserk rounds, XP.
- `attack::perform_hit`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.cpp` 856-1109. One strike: roll, hit test, damage, drain, death, strike count.
- `swarm_blows`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/actions/attack.hpp` 43-50. Strike count as a function of hp.
- `round_damage`: `/mnt/frankendom-donors/wesnoth-wesnoth/src/utils/math.hpp` 78-82. The one rounding rule for all damage.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage is one integer percent stack: base x (100 + bonuses) x resistance%, over 10000 | 100 base (theirs, attack.cpp 184); resistance default 100 = no effect when there is no unit (theirs, units/attack_type.cpp 808) |
| Slowed damage is the same stack over 20000, i.e. half | Divisor 20000 (theirs, attack.cpp 210) |
| Rounding with ties toward the base damage, minimum 1 | Divisor and tie offset as in math.hpp 80-81 (theirs) |
| Hit chance = clamp(base + accuracy - parry, 0, 100) | Clamp range 0..100 (theirs, attack_type.cpp 857) |
| Strikes interpolate with hp between a min and a max (swarm) | No constant: a linear rule (attack.hpp 43-50). Per-weapon min and max are catalogue data (not read) |
| Berserk: extra rounds of strikes | Default rounds 1 (theirs, attack.cpp 146) |
| Drain as percent of damage plus a flat part | Default drain percent 50 (theirs, attack.cpp 219) |
| Strike roll is uniform 0..99, hit when roll < chance | Range 0..99 (theirs, attack.cpp 889) |
| Experience scales with the opponent's level | `combat_experience` value (not read); the formula is theirs, game_config.hpp 56 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: the stats are fixed at the start, strikes alternate, a firststrike side opens, berserk resets the counts, a death stops the loop, and the percent stack and rounding match. It omits the biased (debt-carry) RNG mode, the invulnerable flag, drain, poison, petrify, slow applied by a hit (the donor halves the defender's damage after a slowing hit, 1071-1074), the replay check, XP, the prediction code, and the clamp inside `take_hit`. The sketch reduces the defender's hp by the full damage and clamps at 0.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Fighter {
  hp: number;
  maxHp: number;
  baseDamage: number;     // weapon damage before modifiers
  hitChance: number;      // 0..100, from hitChance() below
  blowsMin: number;       // strikes at the low-hp end of a swarm weapon
  blowsMax: number;       // strikes at full hp
  firststrike: boolean;
  rounds: number;         // berserk rounds, 1 = normal
  todPct: number;         // time-of-day bonus, percentage points
  leadPct: number;        // leadership bonus, percentage points
  slowed: boolean;
}

export interface Hit { by: "a" | "d"; damage: number; }
export interface Outcome { aHp: number; dHp: number; hits: Hit[]; winner: "a" | "d" | "none"; }

// Chance to hit: base chance, plus accuracy, minus parry, clamped to 0..100.
export function hitChance(baseCth: number, accuracy: number, parry: number): number {
  return Math.min(100, Math.max(0, baseCth + accuracy - parry));
}

// Strikes for a swarm weapon: full max at full hp, interpolated down to min at 0 hp.
export function blowsAt(min: number, max: number, hp: number, maxHp: number): number {
  if (hp >= maxHp) return max;
  if (max < min) return min - Math.floor(((min - max) * hp) / maxHp);
  return min + Math.floor(((max - min) * hp) / maxHp);
}

// Integer rounding of base * mult / divisor. Ties go toward the base damage; result is at least 1 when base > 0.
export function roundDamage(base: number, mult: number, divisor: number): number {
  if (base === 0) return 0;
  const tieBias = Math.floor(divisor / 2) - (mult <= divisor ? 0 : 1);
  return Math.max(1, Math.floor((base * mult + tieBias) / divisor));
}

// Percent stack: (100 + time-of-day + leadership) x target resistance%, scaled by 1/10000; slowed uses 1/20000.
export function damageFor(f: Fighter, targetResistPct: number): number {
  const mult = (100 + f.todPct + f.leadPct) * targetResistPct;
  return roundDamage(f.baseDamage, mult, f.slowed ? 20000 : 10000);
}

// One fight. roll() returns an integer 0..99 per strike; a strike hits when roll < hitChance.
// Strikes alternate; a firststrike side (when only the other has none) opens; berserk rounds reset strike counts; a death ends the loop.
export function exchange(a: Fighter, d: Fighter, aResistPct: number, dResistPct: number, roll: () => number): Outcome {
  let aHp = a.hp;
  let dHp = d.hp;
  const aBlows = blowsAt(a.blowsMin, a.blowsMax, a.hp, a.maxHp);
  const dBlows = blowsAt(d.blowsMin, d.blowsMax, d.hp, d.maxHp);
  let aLeft = aBlows;
  let dLeft = dBlows;
  const aDmg = damageFor(a, dResistPct);
  const dDmg = damageFor(d, aResistPct);
  let roundsLeft = Math.max(a.rounds, d.rounds) - 1;
  let defenderFirst = d.firststrike && !a.firststrike;
  const hits: Hit[] = [];

  // Returns false when the struck side dies.
  const strike = (by: "a" | "d"): boolean => {
    const attacker = by === "a" ? a : d;
    const dmg = by === "a" ? aDmg : dDmg;
    if (roll() < attacker.hitChance) {
      hits.push({ by, damage: dmg });
      if (by === "a") { dHp = Math.max(0, dHp - dmg); return dHp > 0; }
      aHp = Math.max(0, aHp - dmg);
      return aHp > 0;
    }
    return true;
  };

  for (;;) {
    if (aLeft > 0 && !defenderFirst) {
      aLeft--;
      if (!strike("a")) break;
    }
    defenderFirst = false;
    if (dLeft > 0) {
      dLeft--;
      if (!strike("d")) break;
    }
    if (roundsLeft > 0 && aLeft === 0 && dLeft === 0) {
      aLeft = aBlows;
      dLeft = dBlows;
      roundsLeft--;
      defenderFirst = d.firststrike && !a.firststrike;
    }
    if (aLeft <= 0 && dLeft <= 0) break;
  }

  const winner = aHp <= 0 ? "d" : dHp <= 0 ? "a" : "none";
  return { aHp, dHp, hits, winner };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/wesnoth-exchange.ts`; copy kept at `Q068/work/wesnoth-exchange.ts`).

## 5. Lands in

- TARGET `src/fight/exchange.ts` (new module, the duel step): the strike loop, the percent-stack damage and the rounding, called once per engaged pair. Parity-checklist row 1 (duel step / sim).
- Engine rule, not zone data: rounding, the percent-stack divisor and the strike order. Zone data, only if Frankendom adds a time-of-day or zone bonus: the donor takes its bonus from the time of day (value not read).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients); server-verified kills (the server recomputes the same strikes)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Server verification: the donor checks each strike against a replay record and lets the record override a death (899-908, 1000-1018). That is a replay sync check, not a server authority. Frankendom needs the server to recompute the rolls from a seed and be the only writer of kills.
- Roll source: the default is a per-strike uniform 0..99 from the game RNG (889). Frankendom needs a seeded roll per fight that the server can replay. The Pit client shows the server's result, it does not roll.
- Biased (debt-carry) mode: opt-in only; it is set when the player picks the biased RNG option (singleplayer.cpp 69, attack.cpp 744), and the default option maps to the empty string (singleplayer.cpp 63). Each strike depends on earlier strikes of the same attack through the credit (883-885). Rejected for now: it adds per-fight state that the server would have to replay exactly, and the code read gives no reason to think it helps players (the donor's own intent is not read).
- One ledger: the donor applies damage through the unit's `take_hit` (976) and a death through `unit_killed` (1048-1049). Frankendom must write hp in one place only. The donor's `take_hit` clamp and `unit_killed` were not read.
- Many-on-one: this is a pair. The donor has no many-on-one logic here. Frankendom's MAX_ATTACKERS = 3 means the engine calls the exchange once per engaged attacker, in the hate-list order (row 4). Not adopted from this donor.
- Status effects (slow, poison, petrify, drain) are cut from the sketch. Drain is listed in data fields; the others are not. Slow changes the defender's damage after a hit (1071-1074), which Frankendom would need to model as a status, not a number.
- The donor's prediction (preview) uses exact probabilities or Monte Carlo above a complexity threshold (attack_prediction.cpp 2370-2372). Not read. If Frankendom shows a damage preview, that code is a separate read.
- Strike count is taken from hp when the stats are built (230, 1292-1294). A mid-fight refresh (`refresh_bc`, not read) is not described here.

## Data fields

- `damage_percent_stack`: divisor 10000 (full), 20000 (slowed, half); unit ratio; where engine constant; donor_ref attack.cpp:209-210.
- `resistance_default`: 100 percent = no effect; unit ratio; where engine constant; donor_ref units/attack_type.cpp:808.
- `tod_bonus`: percentage points added to 100 per time of day (value not read); unit ratio; where zone data; donor_ref attack.cpp:189-192.
- `berserk_rounds_default`: 1; unit count; where engine constant; donor_ref attack.cpp:146.
- `drain_percent_default`: 50; unit ratio; where engine constant; donor_ref attack.cpp:219.
- `strike_roll_range`: 0..99 (100 outcomes); unit count; where engine constant; donor_ref attack.cpp:889.
- `weapon_blows_min_max`: per weapon (catalogue item field); unit count; where engine constant (the interpolation rule); donor_ref attack.hpp:43-50.
- `xp_per_opponent_level`: combat_experience (value not read); unit count; where engine constant; donor_ref game_config.hpp:56.

Best transferable idea: Compute each hit as one integer percent stack (base x (100 + bonuses) x resistance%) rounded once with ties toward the base damage, alternate strikes with a firststrike opener, and let the server resolve each strike from one seeded roll.
Decision (proposed): adapt - Frankendom's duel needs one exact damage formula that the server can recompute; the donor's integer rounding and strike order fit duel step row 1, but its biased credit mode and its replay-override of deaths do not fit one ledger with server-verified kills.
Acceptance: A server test asserts that base 10 with +25 percent time-of-day and 100 percent resistance deals 12 (the tie goes toward the base), and that the same seed gives the same hit list and hp on the server and in the client.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (one combat core, two clients); server-verified kills
