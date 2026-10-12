# openmw (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/mechanicsmanagerimp.cpp` | Licence: GNU GPL v3 (repository LICENSE line 1 "GNU GENERAL PUBLIC LICENSE", version 3, 29 June 2007; the "or any later version" wording was not found in this file, which has no licence header) | C++ | symbol `MechanicsManager::getDerivedDisposition`

Checked: Read in full: mechanicsmanagerimp.cpp 475-561 (getDerivedDisposition), 563-589 (getBarterOffer, to the price terms), 597-722 (getPersuasionDispositionChange, all branches read to the end of the Taunt and Bribe branches), 1336-1450 (the per-observer loop of reportCrime: theft, pickpocket, assault, base versus crime modifier, the guard alarm). actors.cpp 1200-1220 (witness calmed when the crime is paid). opencs defaultgmsts.cpp: the disposition and persuasion default values, read by grep on the named constants (lines 1678-1689, 1780-1782, 1960-1961, 2031-2042 for their ranges). Not read: reportCrime head (1225-1335: how dispTerm, disp, alarm and the observer list are computed), MechanicsManager::getFactionReaction (dialogue manager), the fight bias (combat.cpp 559-575, grepped only), the werewolf and Charm effect code (grepped only), and the game's own Morrowind.esm GMST values (the donor's default table may differ from the shipped game). Confidence: high on the derived disposition formula and the worst-faction defect (read end to end); medium on the crime path (the loop is read, its inputs are not). camera_scope: n/a (not a camera cell).

## 1. Mechanism

- One number per NPC: disposition, 0 to 100 (50 is neutral). `getDerivedDisposition` (475-561) computes it on demand from stored state and the player:
  1. Start: the NPC's base disposition plus its temporary crime modifier (478).
  2. Race: plus fDispRaceMod when the NPC and the player share a race (488-489).
  3. Personality: plus fDispPersonalityMult times (player Personality minus fDispPersonalityBase) (493-494).
  4. Faction standing (496-541). Own faction first: if the player has the NPC's faction and is not expelled, reaction = the dialogue reaction of the faction to itself and rank = the player's rank in it. Otherwise, over the player's non-expelled factions (519), the reaction is the LOWEST value (worst) and its rank is taken (524-526). If the player has the NPC's faction but is expelled, the reaction and rank stay 0 and no other faction is considered. The faction term is `(fDispFactionRankMult * rank + fDispFactionRankBase) * fDispFactionMod * reaction` (540).
  5. Bounty: minus fDispCrimeMod times the player's bounty (544). The default for fDispCrimeMod is 0 in the donor's default table (defaultgmsts.cpp 1678), so bounty has no effect unless the game file sets it.
  6. Disease: plus fDispDiseaseMod if the player has a common or blight disease (545-546; default -10). Weapon drawn: plus fDispWeaponDrawn (550; default -5).
  7. Charm: plus the magnitude of the Charm magic effect on the NPC (552-556). This is the blessing/curse slot on the effect ladder.
  8. Clamp to 0..100 (559), truncating the float first.
- Barter (`getBarterOffer`, 563-589): the derived disposition, the player's and seller's Mercantile, Luck (0.1 x Luck, capped at 10) and Personality (0.2 x Personality, capped at 10) form a buy and sell term (`buyTerm = 0.01 * (100 - 0.5 * (pcTerm - npcTerm))`, 584-589). A disposition above 50 lowers the price the player pays.
- Persuasion (`getPersuasionDispositionChange`, 597-722): a die roll 0-99 against a target that falls off with distance from disposition 50: `d = 1 - 0.02 x |disposition - 50|` (616), `target = d x (player rating - NPC rating + 50)`. Admire, Intimidate, Taunt and Bribe (bribe adds the bribe GMST 35, 75 or 150 for 10, 100 or 1000 gold, defaults at 1646-1648) each have their own success rule, a minimum chance of 5 (iPerMinChance) and a minimum change of 10 (iPerMinChange). The result is a temporary change (tempChange) or a permanent change (permChange). Intimidate and Taunt also move the NPC's Flee and Fight AI settings. Line 677 says the donor deliberately departs from Morrowind on marginal Intimidate wins (no disposition gain).
- Crime (`reportCrime`, 1225; loop 1336-1450): for each observer, the disposition change is `dispTerm x alarmTerm` for theft (1351). For pickpocket and assault it is either the full term or a term scaled by alarm, and the victim's change is permanent. The change is clamped so the result stays in 0..100 (1393 for permanent, the same clamp on the temporary path). Permanent changes add to the NPC's base disposition (1395). Temporary changes add to the crime modifier (1401). Guards with alarm 100 or more also start pursuit (AiPursue at 1413; the guard branch was read).
- Forgiveness (actors.cpp 1200-1220): when the NPC's crime id is at or below the player's crime id (the player has paid for the crime), the witness is calmed, and its crime modifier is reset to 0 (1216). The temporary penalty is removed exactly when the player pays.

Order of operations for one NPC reading the player: base and crime modifier, race, personality, worst faction, bounty, disease, weapon drawn, charm, clamp. Crime writes happen on reportCrime, and the crime modifier is cleared on payment.

## 2. Key functions

- `MechanicsManager::getDerivedDisposition`: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/mechanicsmanagerimp.cpp` 475-561.
- `MechanicsManager::getBarterOffer`: same file, 563-589.
- `MechanicsManager::getPersuasionDispositionChange`: same file, 597-722.
- `MechanicsManager::reportCrime`: same file, 1225 (head not read); observer loop 1336-1450.
- Witness forgiveness: `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/actors.cpp` 1200-1220.
- Stored state: `NpcStats` base and crime modifier, `/mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/npcstats.cpp` 34-61.
- Default constants: `/mnt/frankendom-donors/openmw/apps/opencs/model/world/defaultgmsts.cpp` 1678-1689, 1780-1782, 1960-1961.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants (donor default table) |
|---|---|
| One 0..100 standing per NPC, derived on demand from base plus modifiers, clamped | Clamp 0..100 (559) |
| Same-group bonus (race) | +5 (fDispRaceMod, defaultgmsts.cpp 1687) |
| Trait pivot: (stat minus pivot) x 0.5 | Pivot 50, mult 0.5 (1684-1685) |
| Faction term: (rank x 0.5 + 1) x 3 x reaction, worst faction wins | Rank mult 0.5, base 1, scale 3 (1680-1682) |
| Penalty for disease and for drawn weapon | -10 (1679), -5 (1689) |
| Temporary crime modifier cleared when the bounty is paid | Crime id comparison (actors.cpp 1203) |
| Persuasion chance falls off away from neutral | d = 1 - 0.02 x abs(d - 50) (616); min chance 5 (1960); min change 10 (1961); die mult 0.3 (1780) |

## 4. TypeScript sketch

simplified: the sketch keeps the derived standing (with the fixed worst-faction rule), the theft clamp, the temporary-or-permanent split and the payment forgiveness, plus the Admire-style persuasion target. It omits the dialogue reaction table (reactionTo is an argument), the Charm magnitude (an argument), the bounty term (default zero in the donor table), the race and disease and drawn weapon terms beyond the passed fields, the Intimidate, Taunt and Bribe branches with their AI-setting changes, the minimum-change floors, the reportCrime observer list and guard pursuit, and the barter price. The fixed rule is in `worstFactionReaction`: a flag replaces the donor's first-entry test, which can match an expelled faction.

```ts
// Licence: GPL-3.0 (donor; repository LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface DispTuning {
  raceMod: number;          // same-race bonus (donor GMST fDispRaceMod default 5)
  personalityBase: number;  // personality pivot (donor fDispPersonalityBase default 50)
  personalityMult: number;  // per point off the pivot (donor fDispPersonalityMult default 0.5)
  factionMod: number;       // scale on the faction term (donor fDispFactionMod default 3)
  factionRankBase: number;  // donor fDispFactionRankBase default 1
  factionRankMult: number;  // donor fDispFactionRankMult default 0.5
  diseaseMod: number;       // donor fDispDiseaseMod default -10
  weaponDrawnMod: number;   // donor fDispWeaponDrawn default -5
}

export interface FactionStanding { rank: number; expelled: boolean; }

export interface PlayerState {
  race: string;
  personality: number;
  factions: Map<string, FactionStanding>;
  diseased: boolean;
  weaponDrawn: boolean;
  charm: number;
}

export interface NpcState { race: string; faction: string; baseDisposition: number; crimeModifier: number; }

// Donor: the player's reaction is the WORST (lowest) of their non-expelled factions, with that faction's rank.
// The donor starts from reaction 0 and seeds with "first entry", which can be an expelled faction; this sketch uses a flag.
export function worstFactionReaction(
  npcFaction: string,
  player: PlayerState,
  reactionTo: (a: string, b: string) => number,
): { reaction: number; rank: number } {
  const own = player.factions.get(npcFaction);
  if (own !== undefined) {
    if (own.expelled) return { reaction: 0, rank: 0 };
    return { reaction: reactionTo(npcFaction, npcFaction), rank: own.rank };
  }
  if (npcFaction === '') return { reaction: 0, rank: 0 };
  let found = false;
  let reaction = 0;
  let rank = 0;
  for (const [pf, standing] of player.factions) {
    if (standing.expelled) continue;
    const r = reactionTo(npcFaction, pf);
    if (!found || r < reaction) { reaction = r; rank = standing.rank; found = true; }
  }
  return { reaction, rank };
}

// Donor getDerivedDisposition: base + crime modifier + race + personality + faction term - disease - weapon drawn + charm, clamp 0..100.
export function derivedDisposition(
  npc: NpcState,
  player: PlayerState,
  t: DispTuning,
  reactionTo: (a: string, b: string) => number,
): number {
  let x = npc.baseDisposition + npc.crimeModifier;
  if (npc.race === player.race) x += t.raceMod;
  x += t.personalityMult * (player.personality - t.personalityBase);
  const { reaction, rank } = worstFactionReaction(npc.faction, player, reactionTo);
  x += (t.factionRankMult * rank + t.factionRankBase) * t.factionMod * reaction;
  if (player.diseased) x += t.diseaseMod;
  if (player.weaponDrawn) x += t.weaponDrawnMod;
  x += player.charm;
  return Math.min(100, Math.max(0, Math.trunc(x)));
}

// Donor getPersuasionDispositionChange (Admire-style branch): chance falls away from disposition 50.
export function admireTarget(disposition: number, playerRating: number, npcRating: number): number {
  const d = 1 - 0.02 * Math.abs(disposition - 50);
  return d * (playerRating - npcRating + 50);
}

// Donor reportCrime (theft branch): a witness loses disposition, clamped so the result stays 0..100.
export function theftPenalty(npc: NpcState, currentDisposition: number, dispTerm: number, alarmTerm: number, permanent: boolean): NpcState {
  const current = currentDisposition;
  let mod = Math.trunc(dispTerm * alarmTerm);
  mod = Math.min(Math.max(mod, -current), 100 - current);
  if (permanent) return { ...npc, baseDisposition: npc.baseDisposition + mod };
  return { ...npc, crimeModifier: npc.crimeModifier + mod };
}

// Donor actors.cpp: when the player has paid the witness's crime id, the temporary crime modifier is cleared.
export function forgiveIfPaid(npc: NpcState, npcCrimeId: number, playerCrimeId: number): NpcState {
  if (npcCrimeId <= playerCrimeId) return { ...npc, crimeModifier: 0 };
  return npc;
}

export {};
```

Best transferable idea: keep one 0 to 100 standing per NPC or patron, derived on demand from a base plus a temporary penalty, a race or group bonus, and the WORST of the player's standings with the groups it belongs to, and clear the temporary penalty the moment the bounty is paid.

Decision (proposed): adapt — take the derived standing (base plus temporary penalty, worst-group rule, clamp 0 to 100) as a per-god or per-faction standing row on the one ledger, with the expelled-first defect fixed; the bribe and persuasion dice are not taken in this cell.
Acceptance: a server test asserts that a player expelled from faction A (listed first) and at rank 2 in faction B with reaction +10 reads the standing as base + 60 (not base + 0), that a temporary penalty of -20 is removed on the next check after the player pays, and that the result stays in 0 to 100.

## 5. Lands in

- TARGET `src/fight/standing.ts` (new: derived standing read by the server; used by the AI brain for fight bias and by the barter price). The temporary penalty is written by the server when a witness sees a crime and cleared when the bounty is paid.
- Parity-checklist row 13 (specials), per the GL hint. The fight-bias use feeds the AI brain (row 2), which is noted but not a second row.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
- Brief rule served: one ledger (standing rows, not a second store); zones as data (the default table values are the data, not the code); licence rule 7 (read: GPL v3, clean-room)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the described mechanism; no donor line is copied.
- Defects, each kept with its idea:
  - D1 worst-faction seed (mechanicsmanagerimp.cpp 496, 519, 524): the reaction starts at 0 and the first entry is picked with `playerFactionIt == ...begin()`. When the first listed faction is expelled, that test never matches again (the expelled entry is skipped at 519), so a later faction with a reaction of zero or more is never taken. Example: player factions {A: expelled, B: rank 2, reaction +10} gives reaction 0 and rank 0, so the faction term is 0. The rule as designed gives (0.5 x 2 + 1) x 3 x 10 = 60. fix: a `found` flag (the sketch does this).
  - D2 weak point (design check, not changed): when the player is expelled from the NPC's own faction, the code returns reaction 0 and never looks at the other factions (the else branch is not reached). This may be intended; decide and document it.
  - D3 the bounty term uses fDispCrimeMod, which the donor default table sets to 0 (defaultgmsts.cpp 1678). So a bounty has no disposition effect unless the game file sets the value. The crime effect that matters in the donor is the witness modifier, not the bounty. Check the game's own value before copying the rule.
- Floats are truncated to int before the clamp (559): negative values truncate toward zero, which is harmless at the 0 bound but makes the sign of the fraction depend on the value. Small, no fix needed beyond a round rule.
- Not read: the reportCrime head (1225-1335), where dispTerm, disp, alarm and the observer list come from; getFactionReaction (the dialogue reaction table); the fight bias (combat.cpp 559-575); the Charm effect's definition; the werewolf path (setWerewolf is reached through mwlua/types/npc.cpp 270-274 and the mechanics manager; body not read).
- Frankendom: a per-NPC standing with a temporary penalty is a natural match for a "favour with a god" row, but favour must be one ledger row per god (server-written), not derived from client-side state. The derived view is read-only.

## 7. TABLE (gods-legends-favour rows 1-14)

Units are disposition points on 0..100 (50 neutral) unless marked. "none found" means the grep for the topic words found no divine mechanism in apps/openmw or components, or the named code was grepped only.

| # | name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | favour per NPC (disposition) | 0..100 standing per NPC, derived on read | base + crime modifier + race + personality + faction term - disease - drawn weapon + charm, clamp | clamp 0..100; race +5; disease -10; drawn -5; faction term (0.5 x rank + 1) x 3 x reaction | losses: theft and pickpocket and assault (reportCrime 1336-1401, dispTerm x alarmTerm, clamped); gains: admire, bribe, taunt, intimidate (persuasion 597-722) | temporary crime modifier cleared on payment (actors.cpp 1216); no time decay found | mechanicsmanagerimp.cpp 475-561, 1336-1401, 597-722; actors.cpp 1203-1216 |
| 2 | blessings and curses | Charm magic effect adds its magnitude; disease subtracts a fixed amount | +magnitude (Charm); -10 for disease | Charm magnitude (not read); disease -10 | a spell or disease status on the effect ladder | the effect's own duration (not read) | mechanicsmanagerimp.cpp 545-557 |
| 3 | patron choice and switch | none found; faction join sets rank 0; expulsion is a flag that skips the faction | n/a | rank starts at 0 | expel sets a flag (getExpelled, 519) | none | mechanicsmanagerimp.cpp 519 (flag read); npcstats.hpp 76 (join, grepped) |
| 4 | divine domains as tags | race as a group tag adds +5 to the same-race NPC; no divine domain found | +fDispRaceMod when races match | +5 | joins or leaves the group only through character creation | none | mechanicsmanagerimp.cpp 488-489 |
| 5 | boons at thresholds | rank raises the faction term by rank (not a random roll); promotion rewards not read | (0.5 x rank + 1) x 3 x reaction | rank 0 upward; multiplier per rank 0.5 | rank rises on promotion (not read) | none | mechanicsmanagerimp.cpp 540 |
| 6 | legend signature powers | none found | n/a | n/a | n/a | n/a | none found |
| 7 | shapeshifting | werewolf path exists; body not read (grep: 82 files) | n/a | n/a | n/a | n/a | mwlua/types/npc.cpp 270 (setWerewolf call only) |
| 8 | avatars and summons | not searched | n/a | n/a | n/a | n/a | not searched |
| 9 | fate and luck | Luck and Personality feed the barter price (capped terms) | b = min(0.1 x Luck, 10); c = min(0.2 x Personality, 10) | caps 10 | every barter offer | none | mechanicsmanagerimp.cpp 578-579, 584-589 |
| 10 | underworld and death | death count per id exists (countDeaths); corpse and resurrect code not read | n/a | n/a | n/a | n/a | mechanicsmanagerimp.cpp 592-594 |
| 11 | mounts as rewards | not searched | n/a | n/a | n/a | n/a | not searched |
| 12 | relics | none found | n/a | n/a | n/a | n/a | none found |
| 13 | temples and shrines as zone rows | none found in the disposition code (grep temple: 6 files, not read) | n/a | n/a | n/a | n/a | not read |
| 14 | pantheon factions and realm pride | worst-faction standing across the player's groups; expelled groups skipped; own-faction branch | reaction = min over non-expelled factions; own faction overrides | reaction from the dialogue table (not read) | a faction reaction change or an expel flag | none | mechanicsmanagerimp.cpp 496-541 |

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: one ledger (standing rows); zones as data; licence rule 7
