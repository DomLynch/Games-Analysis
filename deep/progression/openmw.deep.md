# openmw (progression, cell 10)

Donor: /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/npcstats.cpp | Licence: GPL-3 | C++ | symbol NpcStats::levelUp / getSkillProgressRequirement
Symbol check: getSkillProgressRequirement opens at 186 and closes at 212; getLevelProgress / setLevelProgress 214-222; levelUp 224-246; updateHealth 248-254; getTypeFactor helper 169-183 (all opened this pass). Callers opened: /mnt/frankendom-donors/openmw/apps/openmw/mwgui/levelupdialog.cpp 245-265, /mnt/frankendom-donors/openmw/apps/openmw/mwgui/waitdialog.cpp 280-292. A grep of mwmechanics for mLevelProgress finds the field only in the constructor (25), the accessors, levelUp and the save and load paths (449, 494); no code that increments it was found in apps/openmw (the only writer outside save/load is the Lua setter at mwlua/stats.cpp 105, line seen in grep only).

## 1. Mechanism
- Level progress is a counter (mLevelProgress, comment "0-10") on the stats object. The accessors (214-222) read and set it; the save and load paths write it. Nothing in apps/openmw/mwmechanics adds to it (see Symbol check), so the source of progress is outside this code (not read; a Lua setter exists).
- getSkillProgressRequirement(skill, class) (186-212) gives the progress cost of one point of that skill: (1 + the skill's base) times the type factor, then times fSpecialSkillBonus when the skill's specialisation equals the class specialisation. The type factor (getTypeFactor 169-183) is fMinorSkillBonus for the class's minor skills, fMajorSkillBonus for major, otherwise fMiscSkillBonus, all game settings. It throws if the type factor is 0 or less, or if the specialisation factor is 0 or less.
- Trigger: levelUp does not test the counter itself. The sleeping/rest dialog (waitdialog.cpp 286) opens the level-up GUI when sleeping and the counter is at least iLevelUpTotal. In that dialog (levelupdialog.cpp 245-265) the player's chosen attributes are each raised by getLevelupAttributeMultiplier (capped at 100), and then levelUp() is called. The attribute step is therefore outside levelUp.
- levelUp() (224-246): subtracts iLevelUpTotal from the counter and floors it at 0 (the comment says this covers console use); clears mSkillIncreases (the per-attribute skill-increase counts); reads the base Endurance (read after the dialog's attribute raise, so a raised Endurance counts); healthGain = Endurance x fLevelUpHealthEndMult; adds it to health base; sets current health to max(1, current + gain); adds one to the level.
- updateHealth() (248-254) sets the health stat to floor(0.5 x (strength + endurance)) by passing that number to setHealth; how a plain number becomes a stat (base and current) was not read.
- Output is level, health and the counter; the function emits no event.
- Inputs: skill values, class data, game-settings values, endurance. Event-driven.

## 2. Key functions
- getSkillProgressRequirement | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/npcstats.cpp | 186-212 | per-skill progress cost from base, class type (via getTypeFactor 169-183) and specialisation.
- getLevelProgress / setLevelProgress | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/npcstats.cpp | 214-222 | the progress counter accessors.
- levelUp | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/npcstats.cpp | 224-246 | consumes the level-up total, clears skill-increase counts, raises health by endurance, adds one level.
- updateHealth | /mnt/frankendom-donors/openmw/apps/openmw/mwmechanics/npcstats.cpp | 248-254 | sets health to floor(half of strength plus endurance).

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Progress counter minus a fixed total, floored at zero | iLevelUpTotal (theirs, game setting, read at npcstats.cpp 228) |
| Health gain as a fraction of endurance, current health floored at 1 | fLevelUpHealthEndMult (theirs, game setting, npcstats.cpp 239) |
| Skill cost = (1 + base) times class factor times specialisation bonus | fMinorSkillBonus, fMajorSkillBonus, fMiscSkillBonus and fSpecialSkillBonus (theirs, game settings, npcstats.cpp 175, 180, 182, 204) |

## 4. TypeScript sketch
simplified: the type factor is passed in already chosen (the minor, major, misc lookup is omitted); the factor sanity checks that throw are omitted; the specialisation test is reduced to a boolean; levelUp omits clearing the skill-increase counts and the attribute step that happens in the dialog before it; the trigger test (counter >= total) is omitted; health is plain numbers rather than a base and current stat object.
```ts
// Licence: GPL-3 (openmw) | clean-room: written from the mechanism, no donor lines.
interface Stats { level: number; progress: number; healthBase: number; healthCur: number; endurance: number; }
interface LevelCfg { levelUpTotal: number; healthEndMult: number; } // theirs: both are game settings

// Progress cost of one point for a skill (class factor and specialisation are theirs).
function skillProgressRequirement(skillBase: number, typeFactor: number, specBonus: number, specialised: boolean): number {
  let req = (1 + skillBase) * typeFactor;
  if (specialised) req *= specBonus;
  return req;
}

// Consume one level-up total and grow level and health.
function levelUp(s: Stats, cfg: LevelCfg): void {
  s.progress = Math.max(0, s.progress - cfg.levelUpTotal);
  const gain = s.endurance * cfg.healthEndMult;
  s.healthBase += gain;
  s.healthCur = Math.max(1, s.healthCur + gain);
  s.level += 1; // one level per call; the donor does not loop
}

// Health base from strength and endurance (theirs: half of the sum, floored).
function updateHealth(strength: number, endurance: number): number {
  return Math.floor(0.5 * (strength + endurance));
}
```

## 5. Lands in
- Frankendom file(s): none to build. origins/progression/model.ts (exists) already owns level: the level is derived from total CP credit (levelOfCredit, cumulative, requirement), paid by award(state, event) from origins/server/mob-rewards.ts. Health by level is resolved by src/fight/stats.ts (statsAt(id, level)), a catalogue lookup, so the donor's Endurance-times-multiplier health gain has no consumer. The one thing worth keeping from this donor is the shape "level-up consumes a fixed total from a carried counter, floored at 0", which model.ts does differently (cumulative credit, no carry counter), so it is a note only.
- Parity-checklist row: 18 (loot roll and XP award) for the level step; row 21 (catalogue fields) for any per-level number.
- Reuse tag: rewrite-from-idea (GPL-3; mechanism only), not planned.
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks
- The counter's writer is not in the files read (Symbol check). Frankendom's progress source is the server-verified kill (origins/server/mob-rewards.ts), not a skill-use counter.
- Frankendom ruling "one ledger": the donor splits a level-up across a GUI step (attribute raises, levelupdialog.cpp 254-261) and levelUp (health, level, counts). Frankendom writes CP, level and anything unlocked in one transaction.
- Frankendom ruling "server-verified kills": the player chooses attributes in a client dialog and then calls levelUp locally; nothing is verified. A Frankendom level-up is derived on the server from credit.
- One level per call, and the caller must test the counter first; model.ts instead derives the level from credit, so skipped levels cannot occur.
- Requirement values come from game settings (iLevelUpTotal, fLevelUpHealthEndMult, skill bonuses). Frankendom's numbers must be catalogue fields ("no hidden numbers"), not a settings store.
- Death, respawn and stat recalculation are not in this file. getLevelupAttributeMultiplier (256-271) reads iLevelUp01Mult to iLevelUp10Mult but was only read, not ported.
- GPL-3: mechanism only, no code lifted.
