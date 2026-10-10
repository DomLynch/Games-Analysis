# AAEmu-AAEmu (progression, cell 10)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/NPChar/Npc.cs` | Licence: GPL-3.0 (LICENSE.GPL full text; README "Licensing information" header says LGPL-3.0; a LICENSE.MIT file (MIT, Rain0Ash 2019) exists but no .cs file names it, so its scope is unclear) | C# | symbol `Npc.DoDie` (kill XP split; `Npc.cs` 838-1000)

Checked: Read `Npc.cs` 800-1035 (kill XP property and the `DoDie` split, 838-1000, read in full; 1010-1035 read for the despawn call), `Character.cs` 1425-1500 (`AddExp` and the level check), `ExperienceManager.cs` (1-215, in full), `ExperienceLevelTemplate.cs` (in full), `SqliteExperienceLevelTemplateLoader.cs` (in full), `CharacterAbilities.cs` 36-70, `CharacterCombat.cs` 55-110 (death exp loss), `Configurations.cs` by grep (48, 161, 176). Not read: `FormulaManager` (where the kill XP base formula is evaluated), `QuestManager.DoOnMonsterHuntEvents`, `ComputeDeathWaitTime`, the mate `AddExp` body, and `ExperienceManagerTests.cs` (listed only). Candidates opened for this topic: `Npc.cs`, `Character.cs`, `ExperienceManager.cs`, `CharacterCombat.cs`, `CharacterAbilities.cs`, `SqliteExperienceLevelTemplateLoader.cs`. Confidence: high on the order and the factors as read; nothing was run. The base kill XP number itself comes from a formula that was not read, so it is not stated here. camera_scope: n/a.

Best transferable idea: Share one kill's XP across the eligible contributors with a group factor (more contributors or a bigger team each get less) and a level-gap factor that falls 0.1 per level above the monster and rises 0.1 per level below, with no XP at a gap of 10 or more.
Decision (proposed): adapt - take the group factor times level factor with the 10-level zero band and the truncation; reject the raid and full-party factors (no raids in our rules) and do not copy the solo fallback that skips the level factor.
Acceptance: server test: with MAX_ATTACKERS = 3 and a level-20 monster, three contributors (levels 20, 21, 25) and a 1000 base award about 875, 787, 437 XP; a level-30 contributor gets 0 and is still counted as a contributor for loot rights.

Best transferable idea: Share one kill's XP across the eligible contributors with a group factor (more contributors or a bigger team each get less) and a level-gap factor that falls 0.1 per level above the monster and rises 0.1 per level below, with no XP at a gap of 10 or more.
Decision (proposed): adapt - take the group factor times level factor with the 10-level zero band and the truncation; reject the raid and full-party factors (no raids in our rules) and do not copy the solo fallback that skips the level factor.
Acceptance: server test: with MAX_ATTACKERS = 3 and a level-20 monster, three contributors (levels 20, 21, 25) and a 1000 base award about 875, 787, 437 XP; a level-30 contributor gets 0 and is still counted as a contributor for loot rights.

## 1. Mechanism

- Who shares. Team members within `MaxLootingRange` (200 units) are added when they hold tag rights (`Npc.cs` 854, 856). The tagger is added when the tag team is missing (861-864) or when there is no tag team (867-870). If nobody is eligible, the killer gets the full kill XP with no group or level factor (875-878).
- Group factor (`Npc.cs` 897-946). Set for each contributor inside the loop from the same team and count inputs. Raid (a team that is not a party): 0.33 for the player and 0.66 for pets (916-918). Otherwise a team with more than three members (`MembersCount() > 3`): 0.66 each (902-904, 922-924). Otherwise, with two or three eligible players: 0.90 (932-933) or 0.875 (937). Otherwise (solo, or a single eligible player): 1.0 (943-945).
- Level factor (`Npc.cs` 950-968). A player whose level is 10 or more above the monster, or 10 or more below, gets nothing (950-953). Otherwise `levDif = 1 - 0.1 x (playerLevel - npcLevel)` when the player is above (962), `1 + 0.1 x (npcLevel - playerLevel)` when below (967), and 1 when equal (956).
- Award. Per eligible player, `(int)(KillExp x plMod x levDif)` (970), then `pl.AddExp(plKillXp, true)` (973). Pets get the same product with `mateMod` (971-980).
- Kill XP base. `KillExp` (800-826) returns 0 for `NoExp`, otherwise evaluates a formula (806, not read) with level and stats, then multiplies by the NPC's `ExpMultiplier` (824) and adds `ExpAdder` (825).
- Into the player. `Character.AddExp` multiplies a positive delta by the server `ExpRate` (`Character.cs` 1439; default 1.0 in `Configurations.cs` 48), finds the new level from the total-exp table by binary search (`ExperienceManager.cs` 108), trims the overflow above the cap (1447-1449; cap 55 at `ExperienceManager.cs` 23), and adds the same delta to the active profession's exp (`CharacterAbilities.cs` 50-55, capped at max-level exp). It then broadcasts a level change and fires level-up quest events.
- Death loss (separate rule, not sketched). Below the minimum level (10) there is no loss, only a free resurrection (`CharacterCombat.cs` 72-86). At or above it, in the default world only (70), the loss is `floor(span of this level x 0.05)`, capped at the exp earned this level (`ExperienceManager.cs` 212-213; `CharacterCombat.cs` 74-77), and 80 percent of it is recoverable (78).

## 2. Key functions

- `Npc.DoDie` (kill split): `Npc.cs` 838-1000. Eligibility (854), the solo fallback (875-884), group factor (897-946), level factor and award (950-973), and quest fan-out after (986).
- `Npc.KillExp`: `Npc.cs` 800-826. Base formula, multipliers, `NoExp`.
- `Character.AddExp`: `Character.cs` 1432-1473. Rate, level from exp, overflow, profession exp, broadcast.
- `ExperienceManager.GetLevelFromExp` and `GetExpForLevel`: `ExperienceManager.cs` 43-130. Binary search over total exp per level, overflow.
- `CharacterCombat.DoDie` (death loss part): `CharacterCombat.cs` 61-102.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Group factor, by contributor count | 2 players 0.90 (`Npc.cs` 933 for pets; the player line is 932), 3 players 0.875 (937), solo 1.0 (943-945) |
| Team-size rule | More than three members = 0.66 (`Npc.cs` 902, 924; the player line is 923) |
| Raid rule | 0.33 player, 0.66 pets (`Npc.cs` 917-918; comment 916) |
| Level-gap zero band | 10 levels above or below (`Npc.cs` 950) |
| Level-gap step | 0.1 per level (`Npc.cs` 962, 967) |
| Truncation | `(int)` cast (`Npc.cs` 970) |
| Base kill XP | Formula (`Npc.cs` 806, not read); NPC `ExpMultiplier` (824) and `ExpAdder` (825) |
| Server exp rate | 1.0 (`Configurations.cs` 48) |
| Level cap for players | 55 (`ExperienceManager.cs` 23) |
| Death loss rate | 0.05 (`Configurations.cs` 161) |
| Death loss minimum level | 10 (`Configurations.cs` 176) |
| Recoverable share | 0.80 (`CharacterCombat.cs` 78) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the award: the group factor is computed once from the eligible count, the team size and the raid flag; each contributor gets a truncated product of base, group and level factor; a gap of 10 or more gives 0. It omits: the pet share (same shape, pets use their own group constants), the solo fallback (the donor gives the killer the full kill XP with no factor at all; the sketch does not copy that, see gap 2), the base kill XP formula, the server exp rate, the level-up and the profession exp, the quest fan-out, and the death loss. The raid and team-size inputs are arguments, because the donor reads them from the team object before the loop.

```ts
// Licence: copyleft (AAEmu LICENSE.GPL is GPL-3.0; README "Licensing information" header is LGPL-3.0).
// clean-room: written from the described mechanism, not a translation of the donor lines.
const ZERO_BAND = 10;   // no XP at a gap of +10 or more, or -10 or less (donor)
const STEP = 0.1;       // XP change per level of gap (donor)

// Group factor for the eligible players. Raid, then full party (team larger than three),
// then the count of eligible players; otherwise a solo share.
function groupFactor(eligibleCount: number, teamSize: number, isRaid: boolean): number {
  if (isRaid) return 0.33;
  if (teamSize > 3) return 0.66;
  if (eligibleCount === 2) return 0.9;
  if (eligibleCount === 3) return 0.875;
  return 1.0;
}

// Level-gap factor: 1 at equal level, falling 0.1 per level above the NPC, rising 0.1 per level below.
function levelFactor(playerLevel: number, npcLevel: number): number {
  const gap = playerLevel - npcLevel;
  if (gap >= ZERO_BAND || gap <= -ZERO_BAND) return 0;
  if (gap > 0) return 1 - STEP * gap;
  if (gap < 0) return 1 + STEP * -gap;
  return 1;
}

interface Contributor { id: number; level: number; }
interface Award { playerId: number; xp: number; }

// Kill XP for each eligible contributor: truncated product of the base kill XP, the group factor and the level factor.
function splitKillXp(killXp: number, npcLevel: number, contributors: Contributor[], teamSize: number, isRaid: boolean): Award[] {
  const group = groupFactor(contributors.length, teamSize, isRaid);
  return contributors.map((c) => ({
    playerId: c.id,
    xp: Math.trunc(killXp * group * levelFactor(c.level, npcLevel)),
  }));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS passed (`/tmp/xp-sketch.ts`).

## 5. Lands in

- TARGET `src/fight/xp.ts` (new module: the kill XP split, pure function of the eligible list). Parity-checklist row 18 (loot roll and XP award). The level table itself belongs with the character level, not with this award.
- today: not checked in this pass.
- Reuse tag: rewrite-from-idea (GPL-3.0 / LGPL-3.0; clean-room only)
- Brief rule served: zones as data (zero band, step and group factors as engine constants; NPC exp multiplier and adder as zone data), server-verified kills (award computed on the server from the contributor list), one ledger (the award is one write per contributor).

## 6. Gaps and risks

- Gap 1, zero-XP contributors keep their other credit (as read). The zero band (950-953) skips only the award. The same loop still runs the quest fan-out for each contributor (986). Loot rights come from a separate list in `LootingContainer.cs` (137-161, distance and tag rights only), so the zero band does not remove them. Frankendom should decide this on purpose; the acceptance line assumes the credit stays.
- Gap 2, the solo fallback skips the level factor (reading, not run). When no one is eligible, the killer gets `KillExp` with no group and no level factor (`Npc.cs` 878), and its mates get `KillExp` too (882). A level-30 killer of a level-20 monster would get full XP. The rest of the donor applies the zero band. Frankendom must use one path for kill XP.
- Gap 3, group factors are based on the team, not on the fight. The donor counts team members for the 0.66 rule (902) and eligible players for 0.90 and 0.875. Frankendom caps attackers at three, so the 0.66 rule never applies and the 0.875 and 0.90 steps are the whole group rule. Keep the factors as engine constants, and keep the raid rule out.
- Gap 4, the base kill XP is not in this note. `KillExp` uses a formula that was not read (`Npc.cs` 806). Frankendom should treat the base as NPC zone data and not copy the donor's formula.
- Gap 5, the level step is linear and float. `1 - 0.1 x gap` is computed in single-precision floats and truncated (`Npc.cs` 962, 970). Frankendom should compute in integers (basis points) so that the same kill gives the same XP on server and test.
- Gap 6, death loss is a separate rule. The loss is 5 percent of this level's span, 80 percent recoverable, and free below level 10 (`CharacterCombat.cs` 72-78, `Configurations.cs` 161, 176). It is not part of the kill split; if Frankendom wants it, it is its own row (17 death and respawn).
- Gap 7, the level table is data and must be sorted. The loader rejects a table that is not sorted by total exp or misses a level (`SqliteExperienceLevelTemplateLoader.cs` 36-52). Frankendom's zone data should keep that check.
- Gap 8, profession exp is capped at max-level exp per ability (`CharacterAbilities.cs` 55-59), and the same kill delta feeds it (`Character.cs` 1456). A kill therefore grows profession exp by the same amount as character exp. The addendum's rulings do not name a profession track, so this part does not transfer as it stands.

Reuse tag: rewrite-from-idea (GPL-3.0 / LGPL-3.0; clean-room only)
Brief rule served: zones as data; server-verified kills; one ledger
