# ModernUO (progression, cell 10)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` (with `DuelContext.cs` for the award call and `UOContent/Skills/SkillCheck.cs` for the use-based skill and stat gain) | Licence: GPL-3.0 (`/mnt/frankendom-donors/ModernUO/LICENSE`: "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; `Ladder.cs` has no file header) | C# | symbol `Ladder.GetExperienceGain`

Checked: Read end to end: `Ladder.cs` 70-125 (the four constant tables), 122-150 (table load), 171-255 (GetLevel, GetLevelInfo, GetLossFactor, GetOffsetScalar, GetExperienceGain), 274-318 (UpdateEntry, Find, FindNoCreate), 320-336 (LadderEntry constructors, partial); `DuelContext.cs` 91 (IsOneVsOne), 828-905 (duel end and Award). `SkillCheck.cs` 1-30 (config), 99-175 (CheckSkill), 222-312 (AllowGain, Gain, LegacyGain), 444-505 (GainStat). Not read: `IncreaseStat` and its atrophy body (`SkillCheck.cs` 372-443), `AntiMacroSystem.AntiMacroCheck`, the `Server/Skills.cs` Cap and Total fields, the draw or no-winner path of a duel, the other ladder callers (`DuelContext.cs` 1266, 1330, 1466, 1500 and `TourneyParticipant.cs`, which call `Find`), and `MLQuestSystem.HandleSkillGain`. Test coverage: a grep of `UOContent.Tests` and `Server.Tests` finds no reference to Ladder; I did not run anything. Confidence: high on the exchange formula and the level table (read in full, worked example below is my arithmetic); high on the reading of `Find` (one branch, the only insert is on load); medium on the consequence of the award order (from reading, not run). Camera: not applicable.

Best transferable idea: rank a duel by a single XP that moves by an outcome-by-level-gap table with a gate at six levels apart, and scale a loser's loss by the loser's own level, so an upset pays more and a low-level loser loses little.
Decision (proposed): adapt - the ladder shape (level from XP bands, a win-loss scalar table keyed by level gap, a loss factor by own level, nothing across a six-level gap) fits ranked 1v1 duels, but the numbers and level bands are a ruleset to be data, and the two bugs noted below must not be copied.
Acceptance: a server test duels a 650-XP player (level 5) against a 450-XP player (level 4): the winner gains 22 XP and the loser drops to 445 (-5), with both changes computed from the pre-match XP; and a pair six or more levels apart exchanges no XP.

## 1. Mechanism

- Levels from XP (`GetLevel`, `Ladder.cs` 171-184). At 22500 XP or more the level is 50 (173). From 2500 to 22499 the level is 10 plus one for every 500 XP above 2500 (178-180). Below 2500 the level is read from a 25-entry table indexed by XP divided by 100 (`m_ShortLevels`, 75-86; index read at 183). Level 2 starts at 100 XP, level 5 at 600, level 9 at 2000 (base table `m_BaseXP` at 88-90 agrees with the short table).
- The exchange, `GetExperienceGain` (224-255). Both levels are computed from their XP (231-232). The scalar comes from `GetOffsetScalar` (234): the level difference (ours minus theirs) is read from -6 to +6 (214-221), and a difference outside that range gives 0, so no XP moves (236-238). The column is `win` (index 0) or `loss` (index 1) (219). Then the base is `25 x scalar` (241). A loss is scaled by the loser's own level factor (245: `xp * GetLossFactor(ourLevel) / 100`), where the factor is 100 from level 10 up and a per-level table below (207). The value is then divided by 100 (248) and forced to at least 1 (250-252). The sign is minus for a loss (255).
- Duel end, `DuelContext.cs` 828-905. Only a one-versus-one duel awards XP (831, `IsOneVsOne` at 91). The code calls `Award` for the first player (838) and then for the second (839). `Award` (848) looks up both entries (857-858), returns if either is missing (860), computes the change (865), multiplies it by 5 for a tournament win and 2 for a tournament loss (874), records the win or loss count, adds the change to the entry (888), floors experience at zero (890), re-sorts the ladder (`UpdateEntry`, `Ladder.cs` 274-287), and sends a level-up or level-down message (after 891; partly read).
- Ranking. `LadderEntry.CompareTo` sorts higher XP first (374). `UpdateEntry` bubbles a changed entry up or down the ordered list (274-287). Ranking is therefore a sorted list of XP, not a separate score.
- Two defects in the donor, both visible in the code I read (not run):
  1. `Ladder.Find` (289-299) tests `if (m_Table.TryGetValue(mob, out var entry))` and then creates a new entry (293) and appends it (294-295). So a mobile with no table entry gets `null` back, and `Award` returns at 860 without awarding anything. A mobile that does have an entry gets a new entry with experience 0 that replaces the old one in the table and is appended to `Entries` a second time. The only insert of a new key is the load at `Ladder.cs` 144, and the `LadderEntry` constructor (325-328) does not insert itself.
  2. The award order. Because `Award` for the first player (838) changes that player's experience at 888 before the second call (839) reads it through `theirEntry` (858 and `GetLevel(them.Experience)` at 232), the second player's change uses the first player's post-match XP. The effect is small unless a level boundary is crossed by the first change.
- Skill and stat gain (second mechanism, read but not sketched). `SkillCheck.CheckSkill` (108 onward) rolls success against a chance (115). Then a gain chance is built: half of the average of the room left under the total cap and the room left in the skill (126-128), plus `(1 - chance)` times 0.5 on success, 0.2 on failure before AOS and 0 under AOS (130), then halved (131), scaled by the skill's gain factor (133), with a floor of 0.01 after that, and doubled for controlled pets (142). A gain happens when the chance beats a roll (145). `Gain` (236 onward) adds 1 point, or 1 to 4 points below base 10 (252-254), pays down a locked-down skill with a probability of total over cap (259-267), and multiplies the gain by 2 to 5 for an accelerated skill (275). Stat gain (`GainStat`, 444-505) has a per-stat delay (457) and an atrophy chance equal to raw stat total over stat cap (501). Pub 45 mode gives a flat 5% gate (300), then primary or secondary stat by a 75% roll (303).

## 2. Key functions

- `Ladder.GetLevel`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` 171-184.
- `Ladder.GetOffsetScalar`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` 210-221.
- `Ladder.GetExperienceGain`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` 224-256.
- `Ladder.Find`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` 289-299 (the defect in section 1).
- `DuelContext.Award`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/DuelContext.cs` 848-905, called from 831-841.
- `SkillCheck.CheckSkill`, `Gain`, `GainStat`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Skills/SkillCheck.cs` 108-150, 236 onward, 444-505.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Level from XP by bands, with a short table then a linear band | Short table 0-2499 XP in 100-XP steps (`Ladder.cs` 75-86); linear band from 2500 in 500-XP steps (180); cap 50 at 22500 (173) |
| Outcome scalar keyed by level gap, win and loss columns | Gap from -6 to +6 (214); scalars 175/25 at -6 down to 100/100 at 0 and 40/160 at +6 (102-118) |
| No exchange across a gap of more than six | Gate at 6 (214) |
| Base exchange 25 x scalar, divided by 100, minimum 1 | 25 (241); 100 (248); minimum 1 (250-252) |
| Loser's loss scaled by own level | Loss factors 10, 11, 11, 25, 25, 43, 43, 67, 67 for levels 1-9 (93-100), 100 from level 10 (207) |
| Tournament multiplier | 5 for a win, 2 for a loss (874) |
| Skill gain chance from room under cap and gain factor | Cap room and skill room averaged (126-128); success bonus 0.5, failure 0.2, AOS failure 0 (130); floor 0.01 (after 133); pet x2 (142) |
| Stat atrophy by total over cap | Atrophy chance equals raw stat total over stat cap (501) |
| Configured stat cap and delay | Stat cap 125 on LBR and 100 otherwise (23); gain delay 10 minutes, 0.05 minutes on ML (26) |

Worked example (my arithmetic, not run; the sketch was run on the VPS and gives the same numbers): 650 XP is level 5 and 450 XP is level 4. The winner is at level 5, a gap of +1: the win scalar is 90, so 25 x 90 = 2250, then /100 = 22, a gain of +22. The loser is at level 4, a gap of -1: the loss scalar is 85, so 25 x 85 = 2125, then x 25 (level 4 loss factor) / 100 = 531, then /100 = 5, a loss of -5. Both results give 672 and 445. Swapping the order of the two calls gives the same numbers when both values are read before either change is applied (the sketch does this); the donor's second call reads the first player's updated XP instead.

## 4. TypeScript sketch

simplified: the sketch keeps the level bands, the offset table with the six-level gate, the loss factor by own level, the minimum of 1 and the sign. It omits the tournament multiplier, the level-up messages, the ladder list and its sorting, the win and loss counters, the `Find` creation logic (the defect), the draw and no-winner path, and the skill and stat gain (not sketched). It fixes the award order: both changes are read from the same pre-match XP, which the donor does not do.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface Racer { xp: number; }

const SHORT_LEVELS = [1, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9]; // XP 0..2499 in 100s
const LOSS_FACTORS = [10, 11, 11, 25, 25, 43, 43, 67, 67];                                        // levels 1..9; 100 from level 10
// [win, loss] scalar for (ourLevel - theirLevel) from -6 to +6
const OFFSET: [number, number][] = [
  [175, 25], [165, 35], [155, 45], [145, 55], [130, 70], [115, 85], [100, 100],
  [90, 110], [80, 120], [70, 130], [60, 140], [50, 150], [40, 160],
];

export function levelOf(xp: number): number {
  if (xp >= 22500) return 50;
  if (xp >= 2500) return 10 + Math.trunc((xp - 2500) / 500);
  return SHORT_LEVELS[Math.trunc(Math.max(xp, 0) / 100)];
}

export function lossFactor(level: number): number {
  return level >= 10 ? 100 : LOSS_FACTORS[level - 1];
}

export function offsetScalar(ourLevel: number, theirLevel: number, win: boolean): number {
  const x = ourLevel - theirLevel;
  if (x < -6 || x > 6) return 0; // no exchange across a gap of more than six levels
  return OFFSET[x + 6][win ? 0 : 1];
}

// XP change for one side. Win is positive, loss negative, and a settled change is at least 1 in size.
export function xpChange(ourXp: number, theirXp: number, weWon: boolean): number {
  const ourLevel = levelOf(ourXp);
  const scalar = offsetScalar(ourLevel, levelOf(theirXp), weWon);
  if (scalar === 0) return 0;
  let xp = 25 * scalar;
  if (!weWon) xp = Math.trunc((xp * lossFactor(ourLevel)) / 100);
  xp = Math.trunc(xp / 100);
  if (xp <= 0) xp = 1;
  return weWon ? xp : -xp;
}

// Settle a one-versus-one duel. Both changes are read from the same pre-match XP (the donor applies
// the first change before computing the second, so its second player reads the first player's new XP).
export function settleDuel(a: Racer, b: Racer, aWon: boolean): { aDelta: number; bDelta: number } {
  const aXp = a.xp;
  const bXp = b.xp;
  const aDelta = xpChange(aXp, bXp, aWon);
  const bDelta = xpChange(bXp, aXp, !aWon);
  a.xp = Math.max(0, aXp + aDelta);
  b.xp = Math.max(0, bXp + bDelta);
  return { aDelta, bDelta };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/ModernUO-progression.ts`, exit 0 (no output). A second compile with commonjs output was run to check the worked example: `settleDuel` on 650 and 450 gave +22 and -5, with the winner at 672 and the loser at 445.

## 5. Lands in

- TARGET `src/fight/ladder.ts` (new; the ranked 1v1 XP step, run once per decided duel on the server). Parity-checklist row 18 (loot roll and XP award). Duel XP is a server step after a verified kill or win, so it belongs in the fight engine, not the Pit client.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only).
- Brief rule served: server-verified results (the XP is awarded by the engine from the verified duel result) and one ledger (one XP field per character, changed in one place).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- Do not copy `Ladder.Find`. As written, a new player gets no XP at all and an existing player is reset to the duel's gain (section 1). Frankendom's test must start from a new player and from a returning player, and check the XP after one duel.
- Award order. Both changes must come from the pre-match XP (the sketch does this). Frankendom's one-ledger rule means the duel result writes both characters in one transaction; a test must show the two deltas are the same whichever player is listed first.
- The level bands, the offset table and the loss factors are a ruleset. Frankendom's rule is zones as data, so put them in a ruleset data file, not in the engine. Default them to these values only if Dom wants a UO-like ladder.
- No luck, honour or perfection bonus (`Ladder.cs` is XP only; the honour bonus is in `LootPack`, not here). The tournament multiplier is an event setting: make it a data field with default 1.
- Level-gap gate: a six-level gate means a fresh player cannot duel a much higher one for XP. Frankendom's many-vs-one fights do not use this table; it applies to ranked 1v1 only.
- Not read: the draw path, the rest of the level-up messages, the other ladder callers, and `IncreaseStat` and atrophy. The skill-gain mechanism (section 1) is not in Frankendom's current rulings and is recorded here for a later decision; it is not part of the adapt decision.
