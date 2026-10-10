# angband-angband (progression, cell 10)

Donor: `/mnt/frankendom-donors/angband-angband/src/player.c` (adjust_level 208-255, player_exp_gain 257-278, player_exp_lose 280-294; kill XP in `/mnt/frankendom-donors/angband-angband/src/mon-util.c` player_kill_monster 1014-1108) | Licence: dual, per src/player.c 7-17: (a) GNU GPL version 2, or (b) "the Angband licence" (educational, research and not-for-profit use only). Treated as GPL-2.0: clean-room, shape only | C | symbol `player_exp_gain` / `adjust_level` / `player_kill_monster`

Checked: read in full: player.c 208-294 (level loops, gain, drain), mon-util.c 1014-1016 (header) and 1050-1112 (kill XP, fractional carry, gain call), ui-display.c 228-242 (XP to go). Not read: mon-util.c 1017-1049. Table: player.c 48-100 read; only the declaration line receipted (the value lines are under 15 characters). Expfact: player-birth.c 996 and main-stats.c 483 (main-stats read by grep line only). Race part: lib/gamedata/p_race.txt line 80 (Human `exp:100`, under 15 characters, not receipted). Class part: lib/gamedata/class.txt has NO `exp:` line (grep; line 25 is a comment), and init.c 3531 parses `exp` (not read in full; the default for a missing field not read). Not read: monster mexp and level data, the drop call after the gain (mon-util.c 1111), other XP gain and drain call sites (grep only). Sketch: typechecked (tsc --strict, es2020) and run on the VPS against the sketch itself with test values: a kill of base 10 at monster level 5 by a level 3 character gives 16 then 17; with a test expfact of 130 the level 2 threshold is 13 and level 5 is 91; a non-permanent drain of 500 from 1000 keeps the mark at 1000, and a later gain of 100 gives exp 600 and mark 1010. Confidence: high on the rules (read end to end); the expfact class part is unknown. Camera: n/a.

Best transferable idea: keep a high-water XP mark so a drain lowers current XP but not the mark, and while behind the mark each gain raises the mark by a tenth; and carry the fraction of each kill's XP so small rewards are never lost to rounding.
Decision (proposed): adapt - take the fractional XP carry and the level-gap kill formula now; leave the high-water mark for a separate decision because it adds a second XP number to the ledger (a possible death penalty for row 17).
Acceptance: a server test asserts that after +1000 XP and a non-permanent -500 XP drain the mark stays 1000, and a further +100 gives 600 XP with a mark of 1010; a second test asserts that two kills of base 10 at monster level 5 by a level 3 character credit 16 then 17 XP.

## 1. Mechanism

- Kill XP (mon-util.c 1072-1108). The divisor is the player's level (1072). Base XP = monster `mexp * monster level / player level`, integer (1075). The remainder of that division is scaled to 1/65536 and added to the character's carry (1078-1079). When the carry reaches 65536, one XP is added and 65536 is taken off the carry (1082-1087). The result goes to `player_exp_gain` (1108).
- Gain (player.c 257-278). Amount is capped at `PY_MAX_EXP - exp` (265-267). Then `exp += amount` (268). If exp is still below the high-water mark, the mark rises by `amount / 10`, capped at PY_MAX_EXP (269-275). Then `adjust_level` (277).
- Drain (280-294). Taken from exp, never more than exp (288-289), then `exp -= amount` (290). A permanent drain also lowers the mark (291-292). Then `adjust_level` (293).
- Level (208-255). First the mark is raised to exp if exp is above it (210-211). Then the level falls while `exp < T(level)` (217-219). Then the level rises while `exp >= T(level + 1)` (222-223); each step restores STR, INT, WIS, DEX and CON (241-245). Then a separate catch-up for the highest level reached (248-250).
- The threshold is `T(L) = player_exp[L - 2] * expfact / 100`, integer, for L from 2 to 50 (PY_MAX_LEVEL, player.h 81; table player.c 48-100). The same threshold is used on the way up and on the way down, so there is no hysteresis band.
- Expfact is a percent: race exp plus class exp (player-birth.c 996). Human race exp is 100 (p_race.txt 80). The active class file has no `exp:` lines, so the class part is not set in this donor's data as read.
- XP to go, shown to the player: `T(level + 1) - exp` (ui-display.c 236-237).
- Numbers at work (arithmetic from the code, plus the test run): kill base 10 at monster level 5 by a level 3 character: 50 / 3 = 16 remainder 2, carry 43690; the second kill's remainder adds another 43690 to the carry, reaching 87380, which is at least 65536, so it gives 17 and leaves carry 21844. Total 33 for two kills (exact value 33.3, so the carry is what keeps the rounding honest).

## 2. Key functions

- `adjust_level`: `/mnt/frankendom-donors/angband-angband/src/player.c` 208-255 (level loops and the high-water mark).
- `player_exp_gain`: same file, 257-278 (cap, add, mark, re-level).
- `player_exp_lose`: same file, 280-294 (drain, permanent drain).
- `player_kill_monster`: `/mnt/frankendom-donors/angband-angband/src/mon-util.c` 1014-1108 (base, carry, gain call at 1108).
- XP to go display: `/mnt/frankendom-donors/angband-angband/src/ui-display.c` 234-237.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Threshold table with a percent factor per character; level from exp in both directions with the same threshold | Table of 50 base values, first 10, then 25, 45, 70 ... last 5000000 (theirs, player.c 48-99; declaration receipted at 48) |
| Level cap | 50 (theirs, player.h 81) |
| Max XP cap | 99999999 (theirs, player.h 79) |
| Kill XP = monster base x monster level / player level | Divisor is the player level (theirs, mon-util.c 1075) |
| Carry of the division remainder | 1/65536 steps (theirs, mon-util.c 1078-1087) |
| High-water mark rises by a tenth of a gain while behind it | 10 (theirs, player.c 270) |
| Permanent drain also lowers the mark | None (theirs, 291-292) |
| Expfact = race percent + class percent | Human race 100 (theirs, p_race.txt 80); class part not set in the active file |

## 4. TypeScript sketch

simplified: keeps the threshold function, the level-down then level-up loops in the donor's order, the mark rule, the gain cap, the non-permanent and permanent drains, and the kill XP with its carry. It omits the stat restores on level gain, the messages and history, the update flags (`handle_stuff`), the highest-level catch-up loop (max_lev), the assert, the unique-kill bookkeeping and the monster drop, and the typed integers (plain numbers here). The expfact is an input (race plus class). The table is copied from player.c 50-99 as numbers.

```ts
// Licence: GPL-2.0 or the Angband licence (dual; src/player.c header). Treated as GPL-2.0: clean-room, shape only. Numbers are the donor's table, kept as data.
// Frankendom reading: one XP record (exp, high-water mark, fractional carry); level is derived from exp and the race/class factor.
const PY_MAX_LEVEL = 50;
const PY_MAX_EXP = 99999999;
// Base XP threshold table: entry i is the base for reaching level i+2 (before the percent factor).
const PLAYER_EXP: readonly number[] = [10, 25, 45, 70, 100, 140, 200, 280, 380, 500, 650, 850, 1100, 1400, 1800, 2300, 2900, 3600, 4400, 5400, 6800, 8400, 10200, 12500, 17500, 25000, 35000, 50000, 75000, 100000, 150000, 200000, 275000, 350000, 450000, 550000, 700000, 850000, 1000000, 1250000, 1500000, 1800000, 2100000, 2400000, 2700000, 3000000, 3500000, 4000000, 4500000, 5000000];

export interface Char {
  lev: number;
  exp: number;        // current XP
  maxExp: number;     // high-water XP mark
  expfact: number;    // percent: race exp + class exp (e.g. 130 = 130%)
  expFrac: number;    // fractional XP carried between kills, 0..0xFFFF
}

// XP needed to be at level `level` (level >= 2), in whole XP: base * expfact / 100, truncated.
export function thresholdFor(level: number, expfact: number): number {
  return Math.trunc((PLAYER_EXP[level - 2] * expfact) / 100);
}

// Level from exp, with the donor's two loops: drop while below this level's threshold, rise while at or above the next.
export function adjustLevel(p: Char): void {
  if (p.exp > p.maxExp) p.maxExp = p.exp;
  while (p.lev > 1 && p.exp < thresholdFor(p.lev, p.expfact)) p.lev--;
  while (p.lev < PY_MAX_LEVEL && p.exp >= thresholdFor(p.lev + 1, p.expfact)) p.lev++;
}

// Kill XP: base = monster exp x monster level / player level; the remainder is carried in 1/65536 steps.
export function killXp(mexp: number, monsterLevel: number, p: Char): number {
  const div = p.lev;
  let gain = Math.trunc((mexp * monsterLevel) / div);
  const frac = Math.trunc((((mexp * monsterLevel) % div) * 0x10000) / div) + p.expFrac;
  if (frac >= 0x10000) {
    gain += 1;
    p.expFrac = frac - 0x10000;
  } else {
    p.expFrac = frac;
  }
  return gain;
}

// Gain: cap at PY_MAX_EXP; while still below the mark, the mark grows by a tenth of the gain.
export function gainExp(p: Char, amount: number): void {
  amount = Math.min(amount, PY_MAX_EXP - p.exp);
  p.exp += amount;
  if (p.exp < p.maxExp) {
    p.maxExp = Math.min(PY_MAX_EXP, p.maxExp + Math.trunc(amount / 10));
  }
  adjustLevel(p);
}

// Drain: take exp (never below 0); a permanent drain also lowers the mark.
export function loseExp(p: Char, amount: number, permanent: boolean): void {
  if (p.exp < amount) amount = p.exp;
  p.exp -= amount;
  if (permanent) p.maxExp -= amount;
  adjustLevel(p);
}
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new module): the kill XP award runs once per verified kill, in the fight engine; the level is derived from the one XP value. Parity-checklist row 18 (loot roll and XP award).
- Reuse tag: adapt-shape (GPL-2.0 option; clean-room only; do not use the Angband licence option, which is not-for-profit only).
- Brief rule served: one ledger (one XP value; the level is derived from it); server-verified kills (the award is one call on the verified kill); zones as data (the table and any per-zone monster level are data).

## 6. Gaps and risks

- The high-water mark is a second XP number. Frankendom's one-ledger ruling needs one source of truth, so the mark needs its own decision (a death penalty for row 17 is the obvious use), not a quiet addition in the progression module.
- The class part of expfact is not set in the active class file (no `exp:` lines in lib/gamedata/class.txt). The donor does not show what a missing field becomes (init.c 3531 not read in full). Frankendom must not copy an unset value; it sets its own factors as data.
- The last table entry (5000000, player.c 99) is never used: the level cap of 50 means the highest threshold used is entry 48 (4500000, player.c 98). Do not author a level-51 threshold.
- Kill XP has no party split here: the whole award goes to the killer (mon-util.c 1108). Frankendom's MAX_ATTACKERS = 3 needs an attacker split written down separately.
- A drain that lowers the level does not refund or re-grant the stats; stats only restore on a level gain (player.c 241-245). Frankendom must decide whether a level loss touches stats at all.
- A negative gain is refused with a message (player.c 259-263), not a clamp. The server must reject negative XP the same way (test it).
- Kill XP falls as the player levels (divided by player level). That keeps low monsters from paying high levels, but it can feel harsh in a fast duel loop; the monster level values are zone data, so Frankendom can tune the curve there.
- The "Angband licence" option is not-for-profit only. The GPL option is copyleft; clean-room only.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code.

**Errors / corrections:** All verified: dual GPL-2 / Angband licence header, player_exp table (50 entries, 10..5000000), adjust_level 208-255 order (mark, level down, level up + stat restores, max_lev catch-up at 248), player_exp_gain 257-278 (cap, mark += amount/10 when exp<max_exp), player_exp_lose 280-294, kill XP 1072-1108 with 65536 carry, PY_MAX_EXP 99999999 / PY_MAX_LEVEL 50, expfact = r_exp + c_exp (player-birth.c 996), Human exp:100 (p_race.txt 80), no exp: lines in class.txt, ui-display XP-to-go. Sketch matches; test numbers (16 then 17, 600/1010) are correct.

**Missed:** Nothing.
