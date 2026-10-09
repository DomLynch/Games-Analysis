# OpenRA-OpenRA (progression, cell 10)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GainsExperience.cs | Licence: GPL-3 | C# | symbol GainsExperience.GiveExperience / GiveLevels
Symbol check: GiveLevels opens at 105 and closes at 112; GiveExperience opens at 114 and closes at 139 (both opened this pass). Kill-side input is /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GivesExperience.cs, Killed at 57-77, opened this pass.

## 1. Mechanism
- Donor: OpenRA GainsExperience trait. Each actor keeps an Experience total and a Level. Created (92-101) builds nextLevel, a list of (required XP, condition) pairs: each Conditions key is multiplied (key x value, no division by 100 in the code) by the actor's value, which is the Valued cost, or 1 if the actor has no Valued trait, or an explicit ExperienceModifier when that is 0 or more (lines 94-97). So each level's XP need scales with the unit's worth.
- Input, kill path (GivesExperience.cs 57-77): when a victim carrying GivesExperience dies, it returns early if its exp is 0, the attacker is null or disposed, or the attacker's player relationship is not in ValidRelationships (default neutral or enemy). Otherwise it applies the victim's own modifiers to exp (and stores the result back into the field, line 65), then, if the attacker has GainsExperience, calls killer.GiveExperience(exp with the attacker's modifiers and ActorExperienceModifier applied). Separately it feeds the owning player's PlayerExperience with PlayerExperienceModifier. Direct input: GiveExperience(amount, silent) from Created (starting XP), or GiveLevels(n).
- GiveLevels (105-112): returns if MaxLevel is 0, otherwise takes newLevel = min(Level + n, MaxLevel) and calls GiveExperience with (threshold of newLevel) - Experience.
- GiveExperience (114-139) throws on a negative amount, returns if MaxLevel is 0, clamps Experience to between 0 and the top threshold, then loops: while Level < MaxLevel and Experience >= the next threshold, it grants that level's condition and increments Level. One call can therefore raise several levels.
- Side effects per level (only when not silent): a level-up notification sound, a transient text line, and (if LevelUpImage and LevelUpSequence are set) a SpriteEffect added at the end of the frame.
- Dev cheat order (ResolveOrder 141-159): for DevLevelUp it checks the player's DeveloperMode and returns if it is not enabled, then calls GiveLevels(ExtraData) if ExtraData is above 0, else GiveLevels(1), and prints a debug line. GiveLevels is called with the default silent = false.
- Runs in the game's order and tick pipeline: the caller (a kill or a cheat) drives it. No timer.

## 2. Key functions
- GainsExperience.GiveExperience | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GainsExperience.cs | 114-139 | adds XP (clamped to 0..top threshold), then grants each crossed level's condition once.
- GainsExperience.GiveLevels | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GainsExperience.cs | 105-112 | converts "n levels" into the XP gap to the target threshold.
- GainsExperience.Created | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GainsExperience.cs | 92-101 | builds the absolute threshold list from the keys times the actor value (Valued cost, else 1); grants starting XP if any.
- GivesExperience.Killed | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GivesExperience.cs | 57-77 | the kill-side input: validates relationship, applies modifiers, calls the killer's GiveExperience and the player's PlayerExperience.
- GainsExperience.ResolveOrder | /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/GainsExperience.cs | 141-159 | dev-only level command, gated by developer mode (silently ignored when it is off).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Thresholds as a fraction of a per-entity value, so need scales with worth | Conditions keys (XP multipliers per level, theirs, in the trait's YAML; GainsExperience.cs 29) |
| Clamp to the top threshold, then grant each crossed level once | Max level equals the number of conditions (theirs, line 88) |
| "n levels" becomes the XP gap to the target threshold | ExperienceModifier -1 means "use the actor's Valued cost", or 1 without a Valued trait (theirs, GainsExperience.cs 46 and 95) |
| Level-up presentation kept separate from state | Sprite "levelup" (line 39), palette "effect" (line 43), sounds (theirs, presentation) |

## 4. TypeScript sketch
simplified: the Valued fallback of 1 when the actor has no Valued trait, the lower clamp at 0, starting XP, the kill-side relationship check and the victim and killer percentage modifiers (GivesExperience.cs 57-77), the player-level experience feed, the silent flag and all presentation (sound, text, sprite) are omitted; the dev-order gate is omitted; the modifier is passed in rather than read from the actor.
```ts
// Licence: GPL-3 | clean-room: written from the mechanism, no donor lines.
// XP with level thresholds. Thresholds are precomputed as absolute XP (percent x per-unit value).
// Adding XP clamps at the top threshold and grants each crossed level's condition exactly once.
interface Gains { xp: number; level: number; granted: string[]; }

function absoluteThresholds(percents: number[], unitValue: number, modifier: number): number[] {
  const base = modifier < 0 ? unitValue : modifier;   // -1 means use the unit's own value (theirs)
  return percents.map(p => p * base);
}

function giveExperience(g: Gains, need: number[], conditions: string[], amount: number): void {
  if (amount < 0) throw new Error("revoking experience is not supported");
  if (need.length === 0) return;
  const cap = need[need.length - 1];
  g.xp = Math.min(g.xp + amount, cap);
  while (g.level < need.length && g.xp >= need[g.level]) {
    g.granted.push(conditions[g.level]);              // grant once per level
    g.level += 1;
  }
}

function giveLevels(g: Gains, need: number[], conditions: string[], n: number): void {
  if (need.length === 0) return;
  const target = Math.min(g.level + n, need.length);
  giveExperience(g, need, conditions, need[target - 1] - g.xp);
}
```

## 5. Lands in
- Frankendom file(s): TARGET origins/progression/model.ts (already exists: it holds the one career, CP credit, requirement/cumulative/levelOfCredit and award(state, event), integer only). Level there is derived from total credit (levelOfCredit), so a per-actor "grant condition per level" list is not needed. The donor's genuinely new idea is only "XP need scales with the entity's worth"; Frankendom already scales pay by target level through killValue and the falloff table, so the donor adds nothing to build. The award itself is called from origins/server/mob-rewards.ts (mobBatch) and origins/server/career.ts (pitBatch).
- Parity-checklist row: 18 (loot roll and XP award). Row 18 is post-K item 3: the server tick unifies the Pit and zone rewards.
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only, and Frankendom already has the mechanism).
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- Frankendom ruling "server-verified kills": the donor has no authority check; whoever calls GiveExperience wins, and the kill path trusts the attacker object passed in. Frankendom awards only from a server-replayed kill (mob-rewards.ts), so this is a reference for the arithmetic only.
- Frankendom ruling "one ledger": the donor feeds actor XP and PlayerExperience in two separate calls (GivesExperience.cs 72 and 75-76). Frankendom pays CP, loot and level in one transaction.
- The donor mutates the victim's stored exp when applying its modifiers (GivesExperience.cs 65). Harmless there because a victim dies once; do not copy the pattern into a retryable server settlement (model.ts is built so a retried settlement checks byte for byte).
- Level conditions are granted as named strings. Frankendom levels are derived from credit and gates read levelOfCredit, so no grant list exists to port.
- Silent flag and presentation (sound, text, sprite) are client concerns; the Pit and zones must not own them as state.
- No loss path (Frankendom also has no XP loss), and the donor throws on negative XP; the server must reject, not throw.
- GPL-3: mechanism only, no code lifted.
