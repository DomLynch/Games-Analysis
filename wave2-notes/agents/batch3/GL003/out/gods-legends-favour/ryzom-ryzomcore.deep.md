# ryzom-ryzomcore (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/guild_manager/fame_manager.cpp` | Licence: GNU Affero GPL v3 or any later version (COPYING line 1 "GNU AFFERO GENERAL PUBLIC LICENSE"; fame_manager.cpp header "GNU Affero General Public License ... version 3 ... or (at your option) any later version") | C++ | symbol `CFameManager::addFameIndexed`

Checked: Read in full: fame_manager.cpp 803-986 (addFameIndexed), 1043-1099 (getFameIndexed), 1263-1396 (getMaxFameByClan, getMaxFameByFactionIndex), 1417-1496 (enforceFameCaps), 1651-1910 (tickUpdate, updateFameTrend, updatePlayerFame); fame_manager.h 1-287. Read in part: progression_pve.cpp 1940-2005 (kill penalty call) and 2054-2100 (applyXp gain flag); character.cpp 18558-18600 (verifyClanAllegiance); guild.cpp 2020-2050 (declared cult top-up). Constants read as grep lines in egs_variables.cpp and egs_variables.h. Not read: CStaticFames (static propagation factors and start-fame sheet), setEntityFame (1146-1244), the player-side declare setter, and the UseAsymmetricStaticFames default value. Confidence: high on the favour ledger and boot rule; medium on the declare path (only the guild side is read to the end). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- One ledger row per entity per faction, in raw units (6000 raw per displayed point: egs_variables.h line 28). Floor and ceiling are -100x and +100x that multiplier (egs_variables.cpp 588-589). A declared allegiance lowers the ceiling through a cap table (getMaxFameByClan 1263-1323; getMaxFameByFactionIndex 1325-1396). With no declared patron the ceiling is the absolute max (line 1338).
- Entry point `addFameIndexed` (803-986). Order of steps, as the code runs:
  (a) Start value: if the stored value is NO_FAME, take the race start value for a player, or 0 (841-847).
  (b) Damped step. The code computes `realDeltaFame = delta x factor` with factor = (1.04 x max - |value|) / max. Both signs use the same magnitude-based factor. Lines 857 and 866 give (1.04 max - value)/max for value > 0; lines 859 and 864 give the same thing with the sign flipped for value <= 0 (the test `deltaFame > 1` changes nothing). At value 0 the factor is 1.04; at +/-max it is 0.04. So gains slow near either bound, and losses are slowed in the same way (see defect D3).
  (c) `fame += realDeltaFame` (869). Trend stamp: last-change date = now; trend up if delta > 0, else down (871-873).
  (d) Player: clamp to [FameAbsoluteMin, maxFame] (890); `verifyClanAllegiance` runs (892) and may drop the patron; value stored and a gain or loss message sent (893-897); then the guild share `delta / memberCount` is added to the guild, passing the caller's propagate flag (904).
  (e) Guild: clamp to the guild's max and set the guild value (921-924). Then a loop over every owner row in the container (927-955) computes a value `gf` that is never used afterwards; only a debug line runs (defect D7).
  (f) Store `sint32(fame)` (959). Truncation toward zero (defect D4).
  (g) If `propagate` is set, each other faction gets `(sint32)(realDeltaFame * propagation)` from the static factor table (964-980). Kami and Karavan gains do not propagate outward unless `UseAsymmetricStaticFames` is set (the flag's default was not read).
- Favour losses from kills: progression_pve.cpp 1986-1997. The per-opponent XP progress object reports `gain` (applyXp, 2095-2099: true if any skill's share of XP is > 0). Only then, `addFameIndexed(killer, creature faction, creatureFameByKill or FameByKill, true)`. Default `FameByKill` = -5000 raw (egs_variables.cpp 399); each creature form can override it.
- Read: `getFameIndexed` (1043-1099) returns the stored value, or the start value if NO_FAME. For a character with no declared cult it clamps the value to the neutral cult cap (1086).
- Declaring a patron. Guild side (guild.cpp 2029-2043): declaring needs fame >= FameMinToDeclare (30 x 6000 = 180000, egs_variables.cpp 582) unless no cult is declared yet. If the fame is below the gate and no cult is declared, the code adds `FameMinToDeclare - value` through addFameIndexed (2037), sets `_DeclaredCult` (2042) and runs enforceFameCaps (2043). The top-up is not a direct set (defect D2). Player side: the same gate at character.cpp 18406 (the top-up path was not read).
- Boot and warning (character.cpp 18558-18600). When the value is below FameMinToRemain (0, egs_variables.cpp 584) for the declared cult or civ, the declared slot is set to Neutral and a message is sent (18561-18571). Between FameMinToRemain and FameWarningLevel (5 x 6000 = 30000, egs_variables.cpp 583) only a warning message is sent (18593).
- Tick (fame_manager.cpp 1651-1718): called once per pass of the service main loop (entities_game_service.cpp 769; the loop rate was not read). Each call advances one entity row, round robin (`_LastUpdatedRow`, 1704). For each row with a recent guild change or fame change it calls `updatePlayerFame` (guild-fame memory interpolation over FameMemoryInterpolation ticks = 4320000, egs_variables.cpp 102) and `updateFameTrend` (trend reset to steady after FameTrendResetDelay ticks = 18000, egs_variables.cpp 104; the check is at 1740). Neither writes the fame value itself: `updatePlayerFame` writes only `memory->Fames`, `updateFameTrend` writes only the trend and date. So favour has no time decay in this code.

## 2. Key functions

- `CFameManager::addFameIndexed` (player, guild and propagation branches): `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/guild_manager/fame_manager.cpp` 803-986.
- `CFameManager::getFameIndexed`: same file, 1043-1099.
- `CFameManager::getMaxFameByClan` and `getMaxFameByFactionIndex`: same file, 1263-1323 and 1325-1396.
- `CFameManager::enforceFameCaps`: same file, 1417-1496 (clamps every cult and civ value to the new allegiance's caps; called on guild declare at guild.cpp 2043 and from several character paths, e.g. character.cpp 18415 and 18478; the boot path's call was not traced).
- `CFameManager::tickUpdate`, `updateFameTrend`, `updatePlayerFame`: same file, 1651-1718, 1720-1780, 1782-1910.
- Kill penalty call: `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/progression/progression_pve.cpp` 1986-1997; XP gain flag 2095-2099.
- Boot: `CCharacter::verifyClanAllegiance`, `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/player_manager/character.cpp` 18558-18600.
- Guild declare: `CGuild::setDeclaredCult`, `/mnt/frankendom-donors/ryzom-ryzomcore/ryzom/server/src/entities_game_service/guild_manager/guild.cpp` 2026-2045.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Diminishing gain toward a bound: factor = (1.04 x max - |value|) / max; 1.04 at zero, 0.04 at the bound | 1/25 headroom ("theirs", fame_manager.cpp 850); bound = 100 x 6000 (egs_variables.cpp 589) |
| Per-kill penalty on the killer, per faction, only when XP was earned | Default -5000 raw (egs_variables.cpp 399); per-creature override (progression_pve.cpp 1995) |
| Declare gate and first-time top-up | 30 x 6000 = 180000 (egs_variables.cpp 582) |
| Patron dropped below a floor; warning band above it | Floor 0 (584); warning 5 x 6000 = 30000 (583) |
| Guild gets a share of each member's change | Divisor = member count (fame_manager.cpp 904), integer division |
| Round-robin tick over all rows, one row per tick | Tick unit = game tick (time_nl.h 36) |
| Memory of the old group value, linear blend after a change | 4320000 ticks blend; 18000 ticks trend reset (egs_variables.cpp 102, 104) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's damped step, clamp, declare gate and boot rule. It omits the per-allegiance cap table, the faction propagation, the Kami/Karavan asymmetry, the guild memory blend, the trend reset timer, the round-robin tick, the messages and the XP-gain gate. The `directional` branch is the proposed fix for D3 and is not donor behaviour. The top-up in `declarePatron` sets the gate value directly instead of replaying the damped step (fix for D2). `guildShare` carries the remainder instead of truncating (fix for D1).

```ts
// Licence: AGPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface FavourTuning {
  min: number;          // absolute floor (donor FameAbsoluteMin = -100 * 6000)
  max: number;          // absolute ceiling (donor FameAbsoluteMax = 100 * 6000)
  warn: number;         // warning band edge (donor FameWarningLevel = 5 * 6000)
  minToRemain: number;  // below this a declared patron is dropped (donor FameMinToRemain = 0)
  minToDeclare: number; // gate to declare a patron (donor FameMinToDeclare = 30 * 6000)
}

export interface FavourLedger { value: number; declared: boolean; }

// Donor: FAME_GAIN_FACTOR = max/25 + max. The factor it applies is (1.04*max - |value|) / max.
export function favourStep(cur: number, delta: number, t: FavourTuning, directional = false): number {
  let factor: number;
  if (!directional) {
    // donor shape: damped by distance from zero, for gains AND losses
    factor = (1.04 * t.max - Math.abs(cur)) / t.max;
  } else {
    // proposed fix: damp by room to the bound in the direction of travel, scaled so 0 gives 1.0
    const room = delta >= 0 ? t.max - cur : cur - t.min;
    factor = (2 * room) / (t.max - t.min);
  }
  const next = cur + delta * factor;       // float store: no sint32 truncation
  return Math.min(t.max, Math.max(t.min, next));
}

// Donor divides the guild share as an integer (deltaFame / memberCount). Fix: carry the remainder.
export function guildShare(delta: number, members: number, carry: { rem: number }): number {
  const total = delta / members + carry.rem;
  const whole = Math.trunc(total);
  carry.rem = total - whole;
  return whole;
}

// Donor declares by adding (minToDeclare - cur) through the damped step, which can land short.
// Fix: set the gate value directly, as the donor's setEntityFame(..., setDirectValue=true) allows.
export function declarePatron(l: FavourLedger, t: FavourTuning): boolean {
  if (l.value < t.minToDeclare) l.value = t.minToDeclare;
  l.declared = true;
  return true;
}

export type PatronStanding = 'ok' | 'warn' | 'boot';

// Donor: below minToRemain the declared patron is cleared; between minToRemain and warn only a message.
export function checkPatron(l: FavourLedger, t: FavourTuning): PatronStanding {
  if (!l.declared) return 'ok';
  if (l.value < t.minToRemain) { l.declared = false; return 'boot'; }
  if (l.value < t.warn) return 'warn';
  return 'ok';
}

export {};
```

Best transferable idea: a favour ledger where each gain slows as it nears a cap, a kill costs favour only when the killer earned XP from that creature, and a declared patron is dropped automatically when favour falls below a floor.

Decision (proposed): adapt — take the ledger shape (diminishing gain, declare gate, auto-drop below a floor, warning band) as Frankendom's favour rows on the one ledger, with the three defects below fixed; the magnitude-damped loss (D3) is a design call to settle before build.
Acceptance: a server test, run with the donor-shape damping (`directional` off, the sketch default), asserts that +1000 raw favour at zero lands at +1040 (factor 1.04), that the same gain at the +600000 cap moves the value by +40 or less, that `checkPatron` on a declared patron with favour below 0 returns 'boot' once and clears the declared flag (a second check returns 'ok'), and that `declarePatron` at favour 100000 leaves favour at or above the gate (180000). If the D3 design call picks the directional fix, the first two numbers change (+1000 at zero lands at +1000; at the cap the gain is 0) and the test is rewritten with them.

## 5. Lands in

- TARGET `src/fight/favour.ts` (new; the one favour ledger row per god, updated only by the engine on server-verified kills, oaths and offerings). Frankendom's one-ledger ruling means no client-side favour.
- Parity-checklist row 13 (specials), per the GL hint. Favour rows feed the specials tuning and the Core career ledger. The server-side kill hook is the same spot as the XP award (row 18), which is where the donor applies it.
- Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only, shape only)
- Brief rule served: one ledger (favour rows, not a second store); zones as data (per-creature penalty as a catalogue field); licence rule 7 (read: AGPL, clean-room)

## 6. Gaps and risks

- Licence is AGPL-3.0 or later: clean-room only. The sketch is written from the described mechanism; no line of the donor is copied.
- Defects found in the donor, each kept with its idea:
  - D1 integer guild share (fame_manager.cpp 904): `deltaFame / pGuild->getMemberCount()` truncates, so a small gain can become 0 for a big guild. fix: carry the remainder (`guildShare` in the sketch).
  - D2 declare top-up lands short (guild.cpp 2037): the top-up goes through the damped step. Worked example with the donor's own factor: at value 100000 (1/6 of max) the factor is 1.04 - 1/6 = 0.8733; a top-up of 80000 adds about 69867, giving about 169866 (the store truncates), below the 180000 gate. The declare then proceeds anyway (2042). fix: set the gate value directly (`declarePatron`).
  - D3 losses are damped by the same factor as gains (864-866): at +600000 a -5000 kill penalty moves the value by about -200 raw (0.04 x 5000). So a high-favour character barely loses from kills. fix (design call): damp losses by the room toward the bound in the direction of travel (the `directional` branch). Intent not confirmed in the comments; the comment at 848-849 only discusses gains.
  - D4 truncation on store (fame_manager.cpp 959): `sint32(fame)` drops sub-unit changes, and the rounding direction flips with the sign. fix: store the float, or round the same way for both signs. Effect is small (1 raw unit = 1/6000 of a point).
  - D5 trends computed and discarded (updatePlayerFame, 1804, 1865 and the no-guild branch): the local `trends[]` array is written but never copied to `fow->LastFameChangeTrends`. fix: copy it or delete it.
  - D6 unused `double alpha` in updateFameTrend (1723). Dead code, no behaviour.
  - D7 full owner scan on every guild fame change (fame_manager.cpp 927-955): the loop walks the whole `_FamesOwners` container, and the value `gf` it computes is never used. Cost grows with all players on the shard, not with the guild. fix: delete the loop, or index members by guild and update only them (the debug line uses only `fame`).
- Round-robin tick (1651-1718) touches one row per pass of the main loop (entities_game_service.cpp 769), so reset and blend lag grows with the number of rows. Frankendom: the same pattern fits a per-tick compute budget, but favour timers should be per row, not global.
- The donor has no time decay of favour; the trend reset and memory blend are the only time effects. Frankendom must decide whether favour decays; this donor does not show a model for it.
- Guild share and the cap table are faction-specific. Frankendom has one favour per god, so the per-allegiance matrix does not transfer; only the clamp shape does.
- Not read: CStaticFames (propagation factors and start sheet), setEntityFame (1146-1244), the player declare setter, the default of UseAsymmetricStaticFames.

## 7. TABLE (gods-legends-favour rows 1-14)

Units are raw fame units: 6000 per displayed point (egs_variables.h 28). "none found" means the donor code grep (blessing, curse, oath, relic, deity, patron, shrine, temple, mount, summon, shapeshift) found no divine mechanism in the server or common C++.

| # | name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | favour/fame per faction | ledger value per entity per faction | new = old + delta x (1.04 max - abs(old))/max, clamp to [min, cap] | floor -600000 (-100 x 6000); ceiling 600000; default cap 300000 (50 x 6000) | kill of a faction creature -5000 raw default, per-creature override, only if XP earned; mission action rewards (mission_action.cpp 2035, not read); guild member share delta/member count | none on the value; trend reset after 18000 ticks; guild memory blend 4320000 ticks | fame_manager.cpp 803-986; 1043-1099; progression_pve.cpp 1986-1997, 2095-2099; egs_variables.cpp 399, 587-589 |
| 2 | blessings and curses | none found | n/a | n/a | n/a | n/a | none found (curse in progression_pve.h 468 is a combat spell debuff, not divine) |
| 3 | patron choice and switch | declare a cult or civ; boot when favour falls | declare gate fame >= 180000 (first declare tops up); boot if fame < 0; warn if fame < 30000 | gate 180000; floor 0; warn 30000 | declare (guild 2029-2043; character 18406); boot (character 18561-18571); no apostasy cost or god-anger found | none | character.cpp 18406, 18558-18600; guild.cpp 2029-2043; egs_variables.cpp 582-584 |
| 4 | divine domains as tags | faction index and PVP clan tags (cults Kami, Karavan; civs Fyros, Matis, Tryker, Zorai) | faction index lookup (getFactionIndex) | 2 cults, 4 civs (egs_variables.cpp 600-625 start values, 628-655 max values) | n/a | n/a | fame_manager.cpp 1263-1396; egs_variables.cpp 618, 652 |
| 5 | boons at favour thresholds | none; only gates and warnings (not boons). Also two lower gates: trade with a faction needs fame >= -30 x 6000 = -180000 (FameMinToTrade) and not being kill-on-sight needs fame >= -50 x 6000 = -300000 (FameMinToKOS); both are pushed to the client as thresholds | n/a | gates 180000, 30000, 0, -180000, -300000 | n/a | n/a | character.cpp 18593 (warning only); egs_variables.cpp 585-586; character.cpp 14943-14945 |
| 6 | legend signature powers | none found | n/a | n/a | n/a | n/a | none found |
| 7 | shapeshifting | none found | n/a | n/a | n/a | n/a | none found |
| 8 | avatars and summons | none found | n/a | n/a | n/a | n/a | none found |
| 9 | fate, luck, oaths | closest: declared patron as a contract dropped below a floor | boot when fame < 0 | floor 0 | boot is automatic, no forfeit payment | none | character.cpp 18561-18571 |
| 10 | underworld and death | none for favour; respawn points exist (not read) | n/a | n/a | n/a | n/a | character_respawn_points.cpp (not read) |
| 11 | mounts as rewards | not searched | n/a | n/a | n/a | n/a | not searched |
| 12 | relics | none found | n/a | n/a | n/a | n/a | none found |
| 13 | temples and shrines as zone rows | none for favour; respawn points (not read) | n/a | n/a | n/a | n/a | respawn_point_type.cpp (not read) |
| 14 | pantheon factions and realm pride | 2 cults, 4 civs; per-pair caps; propagation to related factions | cap = getMaxFameByClan lookup; propagated = realDelta x static factor | caps are variables FameMaxX vs Y (egs_variables.cpp 628-655) | kill and mission changes propagate per static table (not read) | none | fame_manager.cpp 964-980, 1263-1323; egs_variables.cpp 628-655 |

Reuse tag: rewrite-from-idea (AGPL-3.0-or-later; clean-room only)
Brief rule served: one ledger (favour rows); zones as data; licence rule 7


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Mechanism, damped-step formula (fame_manager.cpp 850-866 both signs magnitude-based), clamp 890/921, guild share 904, store 959, propagate 964-980, FameByKill -5000 (egs_variables.cpp 399), declare gate 180000 / warn 30000 / remove 0 (582-584), +-100*6000 (588-589), 6000 mult (egs_variables.h 28), verifyClanAllegiance 18558-18600, guild.cpp 2029-2043 top-up via damped addFameIndexed, tick 1651-1718, FameTrendResetDelay 18000 at 1740, enforceFameCaps 1417, D1-D7 all verified. Errors: (1) table rows 4 and 14 cite egs_variables.cpp 422-447, 450-477, 618, 652 for faction/cap variables; lines 440-480 are Forage settings. The FameMax* cap variables are at about 628-660 and FameStart* at 595-625. (2) Row 4 cites 618 as faction index; 618 is FameStartFyrosvKami. Acceptance risk (not a build-failure for a faithful port): '+1000 at zero lands at +1040' pins the donor non-directional damping; if the D3 design call picks the directional fix (factor 1.0 at zero) that test fails. The 'one message' wording in the boot test has no counterpart in the sketch (checkPatron emits no message).
Missed: Fame thresholds FameMinToTrade -30*6000 and FameMinToKOS -50*6000 (egs_variables.cpp 585-586): fame gates trading and hostility, a simple favour-effect mechanism the note's table says does not exist ('boons: none; only gates and warnings' - trade/KOS gates are gates it did not list). Also FameStart* race-vs-faction start matrix (595-625) is read as 'start value' but its numbers (e.g. +20/-20 x 6000) are not given.


Fixed 2026-10-12 (Sonnet fixer, cites checked over ssh): rows 4 and 14 now cite egs_variables.cpp 600-625 (FameStart*) and 628-655 (FameMax*); lines 422-477 are Forage and guild settings. Acceptance rewritten to name the donor-shape damping it pins, to state what changes under the D3 directional fix, and to match checkPatron (no message output). Also found: FameMinToTrade (-180000) and FameMinToKOS (-300000) are two more fame gates (row 5). Start-value matrix (600-625): own civ +20 x 6000, civs next to it +/-10 or -20, cults +/-10 or +/-20 by race (e.g. Fyros v Kami +10, Matis v Kami -20); not needed by the sketch. Sketch unchanged.
