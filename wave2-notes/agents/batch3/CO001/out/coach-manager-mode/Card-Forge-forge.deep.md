# Card-Forge-forge (coach-manager-mode, cell 37)

Donor: `/mnt/frankendom-donors/Card-Forge-forge/forge-ai/src/main/java/forge/ai/AiAttackController.java` (symbol `declareAttackers` aggression block, 1077-1276; per-attacker `shouldAttack` 1472-1565) with profiles from `forge-ai/src/main/java/forge/ai/AiProfileUtil.java` and `AiProps.java` and data `forge-gui/res/ai/*.ai` | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007") | Java | symbol `declareAttackers`

Checked: verdict STRONG, confidence high for the stance ladder and the per-attacker rule (read in full: AiAttackController.java 74-125, 807-870, 1020-1070, 1077-1276, 1472-1565; AiProfileUtil.java whole; AiProps.java whole; forge-gui/res/ai/Default.ai, Reckless.ai, Cautious.ai key lines by grep). Medium confidence on the next-turn unblockable clock: the roles look swapped at 1212-1225 but I did not run it. camera_scope: n/a. NOT read: `SpellAbilityFactors.calculate` (saf.*), `ComputerUtilCombat.damageIfUnblocked`, `ComputerUtil.possibleNonCombatDamage`, `AiBlockController`, the draft AI, Experimental.ai (grep only), AiController's main loop. AI behaviour when the coach is absent: the donor does hand a lost seat to the AI. `FServerManager.convertToAI` (forge-gui/src/main/java/forge/gamemodes/net/server/FServerManager.java 985-1005) builds a `PlayerControllerAi` and swaps it in; it runs on the reconnect-timeout path (977, message "AI has taken over") and on the host's `/skipreconnect` command (852-871). Other clients also see a modal for the lost seat (FGameClient.java:396-403). So the donor's absent-player answer is "AI takes over after a timeout or a host command", and this note's stance ladder is that AI's own default.

## 1. Mechanism

- A stance from 0 to 5 (6 is an exalted override) is set once per declare-attackers step, in `declareAttackers`. It is then read per attacker in `shouldAttack`. Stance 0 is "stay home and block" and is the initial value (79).
- Race inputs (all computed before the stance, 1077-1140):
  - Our creatures that can attack this turn (`computerForces`) and their creatures that could attack next turn (`humanForces`); `outNumber = computerForces - humanForces` (1140).
  - `candidateUnblockedDamage`: our attackers' damage if unblocked, to the opponent (1088-1095, 1094).
  - `candidateCounterAttackDamage`: their next-turn attackers' damage to us (1106-1113, 1112).
  - `aiLifeToPlayerDamageRatio` = our life / their counter damage (1128-1131, 1130), then reduced by 1 for each opponent blocker that can block any attacker (1142-1146, 1144). The 1 is a fixed penalty, not derived; the donor comments on its numbers as "bad magic numbers" (1237).
  - `humanLifeToDamageRatio` = (their life minus possible non-combat damage) / our unblocked damage (1134-1137).
  - `ratioDiff = aiLifeToPlayerDamageRatio - humanLifeToDamageRatio` (1149). Higher favours us.
- Attrition race (1157-1185): attackers sorted by power, weakest first; each round the summed damage is taken off the opponent's life, and the list is shortened by the number of their potential blockers (1169-1185; cap 99 rounds). `doAttritionalAttack` is true when the opponent's life reaches 0 (1185).
- Unblockable clock (1194-1231): our unblockable damage this turn (1198-1210, charged to the opponent at 1209); the next-turn unblockable damage (1212-1225, charged at 1223); `turnsUntilDeathByUnblockable = 1 + (opponent life - unblockable now) / next-turn unblockable` (1227). If the next-turn figure is 0 the donor divides by zero and gets an Infinity (sketch makes this explicit, same value).
- Stance ladder, first match wins (1239-1272):
  - 5 "all out": `ratioDiff > 0` and the attrition race is won (1239-1240).
  - 4 "trade or damage": `ratioDiff >= 1`, two or more attackers, and (their ratio < 2 or outnumber > 0) (1241); or PLAY_AGGRO with a random roll (1242); or the chance-based trade branch (1244-1258): roll against CHANCE_TO_ATTACK_INTO_TRADE, their ratio > 1, our creature count above theirs, our life above theirs, mana checks, lower-pressure check (1256-1257).
  - 3: `ratioDiff >= 0` and two or more attackers (1259-1260).
  - 2: `ratioDiff + outNumber >= -1`, or our ratio > 1, or `-ratioDiff < turnsUntilDeathByUnblockable` (1261-1266).
  - 1: unblockable-only attacks (1267-1268).
  - 0: stay home (1272).
- Per attacker (`shouldAttack`, 1472-1565): a first gate (1473-1478): a creature with the NonCombatPriority tag and no vigilance is held back unless power times the priority reaches the opponent's smallest life total, and then only when it has no ability the AI wants to play instead (the rest of that gate was not read). Then two early returns (1505-1514: a creature that cannot block and can kill all; a creature that survives with trample). Then a switch on the stance (1517): 6 exalted, 5 attack all, 4 expects a trade or a free attack, 3 expects a kill or unblockable, 2 expects to survive or draw a group block, 1 unblockable only. The per-attacker simulation (`saf.calculate`) runs for every stance except 5 (1499-1501).
- Profile (the personality data): `AiProfileUtil.loadProfile` reads `key=value` lines (105-111). A missing key uses the code default in `AiProps` (149); an empty value also uses the default (122). `PLAY_AGGRO`, `CHANCE_TO_ATTACK_INTO_TRADE`, `ATTACK_INTO_TRADE_WHEN_TAPPED_OUT`, `CHANCE_TO_ATKTRADE_WHEN_OPP_HAS_MANA` and `RANDOMLY_ATKTRADE_ONLY_ON_LOWER_LIFE_PRESSURE` are read at 862-866, and only when the AI does not use full simulation (`!simAI`, 858-860); with full simulation the personality numbers are not used and stay at 0 or false.
- Personality values (verified by grep): Default.ai `CHANCE_TO_ATTACK_INTO_TRADE=0`, `PLAY_AGGRO=false`, `CHANCE_TO_ATKTRADE_WHEN_OPP_HAS_MANA=30`; Reckless.ai `PLAY_AGGRO=true`, `CHANCE_TO_ATTACK_INTO_TRADE=100`, `ATTACK_INTO_TRADE_WHEN_TAPPED_OUT=true`, `CHANCE_TO_ATKTRADE_WHEN_OPP_HAS_MANA=100`; Cautious.ai `CHANCE_TO_ATKTRADE_WHEN_OPP_HAS_MANA=0`, `AI_IN_DANGER_MAX_THRESHOLD=6`. The code default for `CHANCE_TO_ATTACK_INTO_TRADE` is 40 (AiProps.java:44), not 0.

## 2. Key functions

- `declareAttackers` race and stance block: `/mnt/frankendom-donors/Card-Forge-forge/forge-ai/src/main/java/forge/ai/AiAttackController.java` 1077-1276.
- `shouldAttack` per-attacker rule: same file, 1472-1565.
- Profile loader: `/mnt/frankendom-donors/Card-Forge-forge/forge-ai/src/main/java/forge/ai/AiProfileUtil.java` 96-115 (load), 117-152 (get with default).
- Property defaults: `/mnt/frankendom-donors/Card-Forge-forge/forge-ai/src/main/java/forge/ai/AiProps.java` 26-166 (122 entries, each with a code default).

## 3. Numbers vs mechanism

Table rows (name | what | formula | ranges | file:line)

| Row | What | Formula | Ranges | file:line |
|---|---|---|---|---|
| Stance | how many attackers commit | stance 0-5 from race ratio and force count; 6 exalted override | 0 stay home to 5 all out | AiAttackController.java:1239-1272; 1034 |
| Our race ratio | our life over their counter damage | `ai.getLife() / candidateCounterAttackDamage`; 1000000 if no counter damage | ratio, unitless (turns) | :1128-1131 |
| Blocker penalty | fixed cut to our ratio per opponent blocker | `ratio -= 1` per blocker that can block | 0 to N blockers | :1142-1146 |
| Their race ratio | their life over our unblocked damage | `(their life - non-combat damage) / our unblocked`; 1000000 if none | ratio, unitless (turns) | :1134-1137 |
| Ratio difference | who is ahead on the race | `ourRatio - theirRatio` | higher favours us | :1149 |
| Outnumber | creature count edge | `computerForces - humanForces` | integer | :1140 |
| Stance 5 gate | all out | `ratioDiff > 0` AND attrition race won | n/a | :1239-1240, 1157-1185 |
| Attrition race | rounds to kill their life | sum of attacker damage each round, list shortened by their blockers; cap 99 rounds | cap 99 | :1164-1185 |
| Stance 4 gate | trade or damage | `ratioDiff >= 1`, two or more attackers, and (their ratio < 2 or outnumber > 0) | ratio 1 and 2 | :1241 |
| Stance 4 chance | random trade | PLAY_AGGRO and roll under CHANCE_TO_ATTACK_INTO_TRADE; or the chance branch with gates | 0-100 percent | :862-863, 1242, 1244-1257 |
| Stance 3 gate | good trades | `ratioDiff >= 0` and two or more attackers | 0 | :1259 |
| Stance 2 gate | edge or clock | `ratioDiff + outNumber >= -1`, or our ratio > 1, or unblockable clock | -1 | :1261-1262 |
| Unblockable clock | turns until their life is gone to unblockables | `1 + (their life - unblockable now) / unblockable next`; 0 if none now | turns | :1196-1231 (1227) |
| Per-attacker rule | each attacker commits or stays | switch on stance; early returns at 1505-1514 | 6 cases | :1472-1565 (1517-1560) |
| Personality | CHANCE_TO_ATTACK_INTO_TRADE | code default 40; Default.ai 0; Reckless.ai 100 | 0-100 | AiProps.java:44; Default.ai:10; Reckless.ai:10 |
| Personality | PLAY_AGGRO | code default false; Reckless.ai true | bool | AiProps.java:43; Reckless.ai:7 |
| Personality | CHANCE_TO_ATKTRADE_WHEN_OPP_HAS_MANA | Default.ai 30; Reckless.ai 100; Cautious.ai 0 | 0-100 | Default.ai:20; Reckless.ai:20; Cautious.ai:24 |
| Profile key count | keys in AiProps | 122 entries; Default.ai omits SIDEBOARDING_ENABLE (code default true) | 122 | AiProps.java:29-150; Default.ai |
| Lost seat | absent player's seat | other clients see a modal; the AI takes the seat on reconnect timeout or host `/skipreconnect` (`convertToAI`) | n/a | FGameClient.java:396-403; FServerManager.java:852-871, 977, 985-1005 |

Not in the table, not read: the SpellAbilityFactors numbers (canKillAll, canBeKilled and friends), the block controller, the reconnect window length.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the stance ladder (ratio, ratio difference, outnumber, then the gates in donor order) and the donor's unblockable-clock comparison. It omits the donor's exalted stance 6, the reconnaissance override, the full random-trade gates (creature count, life, mana, lower-pressure check, which the sketch replaces with a percentage and a ratio test), the attrition simulation (passed in as a flag), the per-attacker simulation, and the next-turn unblockable figure (passed in; the donor's version has the role question in Section 6). `unblockableTurns` keeps the donor's values exactly, including +/-Infinity, but names the zero cases.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface RaceInputs {
  aiLife: number;
  humanLife: number;
  humanNonCombatDamage: number;      // possible non-combat damage the opponent could take this turn
  humanCounterDamage: number;        // damage the opponent's creatures could deal to us next turn
  aiUnblockedDamage: number;         // damage our attackers deal if unblocked
  aiForces: number;                  // our creatures that can attack this turn
  humanForces: number;               // their creatures that could attack next turn
  humanBlockersThatCanBlock: number; // their blockers able to block any of our attackers
  attackers: number;                 // our attackers this turn
  attritionalWin: boolean;           // donor simulates an attrition race; not reproduced here, passed in
  unblockableTurnsToKill: number;    // 0 = no unblockable clock this turn (donor default)
  unblockableOnAttack: boolean;      // donor doUnblockableAttack
}

interface Personality {
  playAggro: boolean;
  chanceToTradePct: number;          // 0..100
}

// Stance 0..5 (the donor also has 6 = exalted, a separate override; omitted here).
// simplified: the donor's random-trade branch also needs creature-count, life, mana and lower-life-pressure gates;
// this sketch keeps only the percentage and the damage ratio. The attrition race and the unblockable clock
// are computed by the caller and passed in.
function stance(r: RaceInputs, p: Personality, roll: () => number): number {
  let aiRatio = r.humanCounterDamage > 0 ? r.aiLife / r.humanCounterDamage : 1_000_000;
  aiRatio -= r.humanBlockersThatCanBlock; // donor: fixed penalty per blocker (a magic number, kept for parity)
  const humanRatio =
    r.aiUnblockedDamage > 0 ? (r.humanLife - r.humanNonCombatDamage) / r.aiUnblockedDamage : 1_000_000;
  const ratioDiff = aiRatio - humanRatio;
  const outNumber = r.aiForces - r.humanForces;
  const trade = roll() * 100 < p.chanceToTradePct;

  if (ratioDiff > 0 && r.attritionalWin) return 5;
  if ((ratioDiff >= 1 && r.attackers > 1 && (humanRatio < 2 || outNumber > 0)) || (p.playAggro && trade && humanRatio > 1)) {
    return 4;
  }
  if (trade && humanRatio > 1) return 4;
  if (ratioDiff >= 0 && r.attackers > 1) return 3;
  if (ratioDiff + outNumber >= -1 || aiRatio > 1 || -ratioDiff < r.unblockableTurnsToKill) return 2;
  if (r.unblockableOnAttack) return 1;
  return 0;
}

// Unblockable clock, donor formula 1 + (life - now) / next. Zero when no unblockable damage now (donor default).
// When the next-turn figure is 0 the donor divides by zero: it gets +/-Infinity in doubles. Made explicit here,
// same values, so the stance-2 path is visible rather than accidental.
function unblockableTurns(lifeAfterNow: number, perTurnNow: number, perTurnNext: number): number {
  if (perTurnNow <= 0) return 0;
  if (perTurnNext <= 0) return lifeAfterNow > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  return 1 + lifeAfterNow / perTurnNext;
}

export {};
```

Sketch typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/CO001-forge-stance.ts, exit 0.

## 5. Lands in

- TARGET `src/fight/coach-stance.ts` (new engine module): the pre-fight stance for a coach's fighter and the default stance when the coach is absent. It reads the race inputs from the engine state and returns a stance; it does not read the client.
- Parity-checklist row 4 (fight loop: aggro, chase, leash): the stance decides when a fighter commits.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 4 (aggro and commit); 1 (one engine: the stance is computed by the engine, not a client); 2 (AI brain: the same rule drives an absent coach)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and typechecks; no donor line is translated.
- Possible role swap (medium confidence, not run). The next-turn unblockable loop (1212-1225) iterates `nextTurnAttackers`, which are the opponent's creatures (built from `oppList` at 1106-1112), and checks each against `myList` (our creatures, 1216). Its damage is charged to `defendingOpponent`, the opponent (1223). The clock formula (1227) reads it as our next-turn unblockable damage. If the roles are swapped, the clock measures the wrong side. Fix: iterate our creatures that can attack next turn, check them against the opponent's blockers, and charge the opponent. Test with a fixed board before trusting stance 2.
- Target mismatch at 1223 (same finding): the damage of an opponent creature is charged to the opponent. Impact is probably small (damage amounts rarely depend on the target), but it is a wrong argument. Fix with the change above.
- Magic-number penalty (1142-1146): the ratio is in turns, the penalty is a count of blockers. They are different units; a turns-based term would be honest. Keep the stance ladder, replace the penalty. The donor's own comment calls these "bad magic numbers" (1237).
- Profile loader (AiProfileUtil.java 105-108): an unknown key makes `AiProps.valueOf` throw, which would stop the whole load. A value containing `=` is dropped silently (107). Fix: validate every key at load, name the bad key, and split on the first `=` only.
- Profile default trap: a profile that omits a key takes the code default, not Default.ai's value. Example: `CHANCE_TO_ATTACK_INTO_TRADE` is 40 in code and 0 in Default.ai (AiProps.java:44; Default.ai:10). Default.ai itself omits `SIDEBOARDING_ENABLE`. Fix: load Default.ai as the base, apply the personality on top, and test that every key is present.
- Design: the stance is recomputed from race ratios each turn, with no memory. A coach who flips between stances from turn to turn is possible. Frankendom may want hysteresis (a stance change needs a margin), but that is a new rule, not donor code.
- Absent coach: the donor does hand a lost seat to its AI (`convertToAI`, after a reconnect timeout or a host command), and that AI runs this stance ladder. For Frankendom the stance from this ladder is the default, not a forfeit or a free pass. Unlike the donor, which waits for a timeout or host command, the default should apply at once when the coach is absent.
- Not read, so not claimed: the per-attacker simulation numbers (`saf.*`), `damageIfUnblocked`, `possibleNonCombatDamage`, the block controller, and the reconnect window length.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 4 (aggro and commit); 1 (one engine); 2 (default tactics when absent)

Best transferable idea: pick each fighter's stance from a race ratio (our life over their counter damage, against their life over our unblocked damage) plus a force count, through an ordered ladder of six stances, and read the stance per fighter with a few personality numbers.
Decision (proposed): adapt — keep the race-ratio ladder and the personality data, but drop the fixed per-blocker penalty and fix the next-turn clock's roles before using stance 2.
Acceptance: a server test on a fixed board (3 of our attackers, 2 of theirs able to block, life 20 vs 15) returns the stance from the race rule and not stance 5 unless the attrition race is won; a personality file with a missing or misspelled key fails validation at load and names the key; an absent coach's fighter commits at the computed stance.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: MATERIAL: note claims 'no AI takeover found in the network layer' and 'the donor has no AI takeover' for a lost seat. False: FServerManager.convertToAI(RemoteClient) (forge-gui/.../net/server/FServerManager.java ~985-1005) builds a PlayerControllerAi and calls p.dangerouslySetController(aiCtrl); /skipreconnect calls it (FServerManager.java:859-872, message 'Host forced AI takeover'). So the 'Lost seat' row and the Gaps bullet 'Absent coach: the donor has no AI takeover' are wrong; the donor does hand a disconnected seat to the AI (host command / timeout path). The stance ladder itself is correct. Verified OK: licence GPL-3; declareAttackers lines 1077-1276 all match (ratios 1128-1137, blocker penalty 1142-1146, ratioDiff 1149, attrition 1157-1186, unblockable 1194-1231, ladder 1239-1273, role swap observation at 1212-1225 is accurate, division gives Infinity); AiProps CHANCE_TO_ATTACK_INTO_TRADE default 40 (:44), PLAY_AGGRO false (:43), 122 enum entries, Default/Reckless/Cautious values; profile loader behaviour 96-115; stance 6 exalted ~1034. Minor: the sketch's extra 'if (trade && humanRatio>1) return 4' is a declared simplification.
Missed: (1) shouldAttack's first rule (1473-1478): a creature with SVar NonCombatPriority and no vigilance never attacks - note says 'two early returns' and omits this earlier one. (2) The whole stance block only reads the personality props when !simAI (usesFullSimulation) at ~858-868; with full simulation the profile numbers are not used. (3) AiAttackController also has the AI takeover path above, relevant to the 'absent coach' ruling.

Fixed 2026-10-12 (Sonnet fixer): verified on the donor. Corrected the material claim: the donor does take over a lost seat with AI (FServerManager.convertToAI 985-1005, timeout path 977, /skipreconnect 852-871); rewrote the intro, the Lost-seat row and the Absent-coach gap. Added the NonCombatPriority first gate in shouldAttack (1473-1478), softened to a reluctance rule since the checker's wording was stronger than the code; added that personality props are read only when not full-simulation AI (858-866). Sketch unchanged.
