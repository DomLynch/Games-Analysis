# coding-horror-basic-computer-games (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/coding-horror-basic-computer-games/28_Combat/java/Combat.java` | Licence: public domain (repo `LICENSE` line 1: "This is free and unencumbered software released into the public domain.") | Java | symbol `attackFirst` / `attackSecond`

Checked: Read the whole class (268 lines) in one file. Entry chain: `main` (261-264) calls `play` (37-44), which calls `showIntro`, `getForces`, `attackFirst`, `attackSecond` in that order. Both strike methods were read in full, and the win/loss test is inline in `attackSecond` (244-257). Confidence high on the rules as coded. Not read: the BASIC source `28_Combat/combat.bas` and the other language ports. The README known-bug list was read. The line `cpuArmy = 0;` (104) is too short for the 15-character receipt rule, so that claim is from direct reading only. Verdict STRONG on the strength of a fixed deterministic rule table with no random source.

Best transferable idea: a group action's outcome is set by which fraction of a pool is committed (below a third, below two thirds, otherwise), with one fixed band table that is easy to test and explain.
Decision (proposed): reject - the bands are a turn-based war-game rule over unit pools; Frankendom's duel resolves per blow with guard and stamina, and its kills are server-verified per event, so a pool-share table has no slot in the fight.
Acceptance: if built anyway, a server test would assert that committing under one third of a pool loses only the men sent and changes no other pool.

## 1. Mechanism

- Turn-based, two strikes, no random roll anywhere in the file. Each side has three pools: army, navy, air force. The player splits up to 72000 men over the three pools (`getForces`, 56-70; cap 18 and the check at 68). The computer starts at 30000 army, 20000 navy, 22000 air force (27-29).
- Strike 1 (`attackFirst`, 72-157). The player picks a pool and a count. The count is re-asked until it is 0 or more and no larger than the chosen pool (84-91). The count is then compared with a share of one pool:
  - Army, against the player's own army. Below 1/3: the men sent are lost (97-99). From 1/3 up to 2/3: the player loses floor(n/3) men and the computer's army is set to 0 (101-104). At 2/3 or more: own army becomes floor(army/3), own air force becomes floor(air/3), computer navy becomes floor(2/3 of navy) (106-112).
  - Navy, against the computer's navy (not the player's). Below 1/3 of cpuNavy: attack stopped, own navy minus n (117-119). From 1/3 to 2/3: cpuNavy becomes floor(cpuNavy/3) (121-123). At 2/3 or more: own army and own air force each become floor(/3), cpuNavy becomes floor(2/3) (125-131).
  - Air force, against the player's own air force. Below 1/3: wiped out, own air force minus n (136-139). From 1/3 to 2/3: a dogfight the player wins; cpuArmy becomes floor(2/3), cpuNavy and cpuAir each become floor(/3) (140-145). At 2/3 or more: own army becomes floor(/4), own navy floor(/3), cpuArmy floor(2/3) (146-152).
- Strike 2 (`attackSecond`, 159-259). The state is printed (164-171) and the player picks a pool and count again, with the same bounds (173-187). The test is against a half of the enemy pool:
  - Army: count below half of cpuArmy means the attack is repulsed and own army drops by n (193-195). Otherwise cpuArmy becomes 0 (197-199).
  - Navy: count below half of cpuNavy means own army becomes floor(/4) and own navy floor(/2) (205-209). Otherwise cpuAir becomes floor(2/3) and cpuNavy floor(/2) (211-215).
  - Air force: count strictly above half of cpuAir means a counterattack, and own army, navy and air each become floor(/3) (221-226). Half or less (equal counts here) sets `planeCrashWin = true` (229-231), which is an immediate player win.
- Ending (237-257). If there was no crash win, the summary is printed (237-241). The player wins if `planeCrashWin` or if own total is greater than floor(3/2 x computer total) (244-247). The player loses if own total is below floor(2/3 x computer total) (249-253). Otherwise a treaty (254-257).
- Tick: none. The game is a sequence of prompts. The `do/while` loops (68, 82, 88, 178, 184) only re-ask for bad input. There is no per-frame loop, no timer and no accumulator.

## 2. Key functions

- `attackFirst`: `/mnt/frankendom-donors/coding-horror-basic-computer-games/28_Combat/java/Combat.java` 72-157. Three bands for each pool, with cross-pool cuts in the high bands.
- `attackSecond`: `/mnt/frankendom-donors/coding-horror-basic-computer-games/28_Combat/java/Combat.java` 159-259. Half-pool tests for each pool, the crash flag, then the win, loss and treaty test (244-257).
- `Combat.play`: `/mnt/frankendom-donors/coding-horror-basic-computer-games/28_Combat/java/Combat.java` 37-44. Fixed order of the four steps.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Committed share of a pool picks one of three bands: below 1/3, below 2/3, otherwise | 1/3 and 2/3 cut-offs (theirs, lines 97, 101, 117, 121, 136, 140) |
| Second strike: one cut at half the enemy pool | 1/2 (theirs, lines 193, 205, 221) |
| Band outcomes are integer floors of pool divisions | Divisors 2, 3 and 4 (theirs, 109-111, 128-130, 149-151, 208-209) |
| Ending: win above 3/2 of the enemy total, loss below 2/3, else treaty | 3/2 and 2/3 (theirs, 245 and 249) |
| A win flag short-circuits the summary and the ending test | `planeCrashWin` (theirs, 231) |
| Fixed starting pools with a per-side cap | Cap 72000 (theirs, 18); computer pools 30000 / 20000 / 22000 (27-29) |

Quirks in the donor, recorded so they are not copied: the navy first-strike band is compared with cpuNavy while the army and air bands use the player's own pool (117 against 97 and 136). The navy message at 122 says "ARMY" while the code cuts cpuNavy (123). The army mid-band message reports two thirds of cpuArmy (102) and then sets cpuArmy to 0 (104), which the README lists as a known bug.

## 4. TypeScript sketch

simplified: the sketch keeps the first-strike band rule, the army branch of strike 1, the second-strike half test and the final win, loss and treaty test. It omits the navy and air-force branches of both strikes, the cross-pool cuts in the high band, the second-strike state changes, the outcome text and the input re-prompts. Nothing is reordered: the band is decided before any state changes, as in the donor.

```ts
// Licence: public domain (donor LICENSE). clean-room sketch written from the described mechanism, not a translation.
type Band = 'low' | 'mid' | 'high';

// Committed share of one pool decides the band: below 1/3, below 2/3, otherwise.
function firstStrikeBand(committed: number, ownPool: number): Band {
  if (committed < ownPool / 3) return 'low';
  if (committed < (2 * ownPool) / 3) return 'mid';
  return 'high';
}

// Second strike: one cut at half of the enemy pool.
function secondStrikeRepulsed(committed: number, enemyPool: number): boolean {
  return committed < enemyPool / 2;
}

type Ending = 'win' | 'loss' | 'treaty';

// Final test: win above 3/2 of the enemy total (or a crash flag), loss below 2/3, otherwise treaty.
function ending(myTotal: number, enemyTotal: number, crashWin: boolean): Ending {
  if (crashWin || myTotal > Math.floor((3 / 2) * enemyTotal)) return 'win';
  if (myTotal < Math.floor((2 / 3) * enemyTotal)) return 'loss';
  return 'treaty';
}

// Army branch of the first strike. Low: lose the men sent. Mid: lose a third of them and zero the enemy army.
// High: own army cut to a third. Other pools are not touched here.
function armyFirstStrike(mine: number, theirs: number, committed: number): { mine: number; theirs: number; band: Band } {
  const band = firstStrikeBand(committed, mine);
  if (band === 'low') return { mine: mine - committed, theirs, band };
  if (band === 'mid') return { mine: Math.floor(mine - committed / 3), theirs: 0, band };
  return { mine: Math.floor(mine / 3), theirs, band };
}
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (parity row 1, duel step / sim). Decision is reject, so nothing lands. If the band idea were ever used, it would be a group-commit test in the engine, and it would need its own row, not a change to the duel.
- Reuse tag: none (decision reject). Public domain, so adaptation would be allowed if ever needed.
- Brief rule served: 1 (one combat core, two clients). The file is a deterministic rule with no random roll, which is the property the rule would want to keep.

## 6. Gaps and risks

- Decision (proposed): reject. The file resolves whole pools per turn. Frankendom's duel is a per-blow state machine (guard, stamina, stagger), and the many-on-one cap is a count (MAX_ATTACKERS = 3), not a share of a pool. The band table has no slot in the fight as it stands.
- Fixed thresholds make cliff edges. A commit one man above or below a third gives a different outcome. In a fair duel every such cliff is a complaint, and the server would need to verify each side of it.
- Integer floors decide outcomes near the bands, so rounding is part of the rule, not an implementation detail. Any port must pin the rounding in a test.
- The donor is a 1978 BASIC game ported to Java with known bugs (army mid-band, navy message). The port is faithful to the bugs, so it is not a reference for the numbers. Not read: the BASIC source and the other ports, so I cannot say whether they match this one.
- Zones as data: the pool sizes (27-29) and the 72000 cap (18) would be zone data if a band idea were used at all; the 1/3, 2/3 and 1/2 cut-offs are rule constants of the engine.
