# CleverRaven-Cataclysm-DDA (progression, cell 10)

Donor: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/skill.cpp` (`SkillLevel::train` 350-402, `knowledge_train` 404-434, `rust` 444-487, `on_exercise_change` 515-545), `src/character.cpp` (`Character::practice` 2543-2606), `src/character_knowledge.cpp` (`do_skill_rust` 255-290), `src/character_body.cpp` (daily check 379-380) | Licence: Creative Commons Attribution-ShareAlike 3.0 (`LICENSE.txt` line 1: "Cataclysm is licensed under the Creative Commons Attribution-ShareAlike 3.0"); the .cpp files carry no per-file licence header (skill.cpp begins with `#include`). Copyleft: clean-room, shape only. | C++ | symbol `SkillLevel::train`

Checked: Read end to end: `SkillLevel::train` (350-402), `knowledge_train` (404-434), `isRusty`, `rust`, `practice` and `on_exercise_change` (437-545), `Character::practice` from its start to the `train` call (2543-2606; the lines after 2606 (not read)), the rust loop in `do_skill_rust` to the `rust` call (255-285; the rest (not read)), the once-per-day check (character_body.cpp 379-380), and the crafting caller (crafting.cpp 3150-3161). Grep only: `talker_character.cpp:1272` (teacher `knowledge_train` call), `character.cpp` `readBook` callers, `SKILL_TRAINING_SPEED` default (not read). Confidence: high on the two-track catch-up, the level and theory thresholds, and the rust formula; medium on the rust gating (the predator branch is read to its `continue`; the other rust gates were read in full). The donor fields are C++ `int`, and the code adds floats to them (truncation), which the sketch does not model. `camera_scope` n/a (not a camera cell). The hint file `src/crafting.cpp` was only read at the caller, not for the mechanism.

## 1. Mechanism

Each skill has two tracks: practical (`level`, `exercise`) and theory (`knowledgeLevel`, `knowledgeXp`). Practice fills the practical track and drags it toward the theory track. Reading a book or being taught fills only the theory track.

(a) Practice call. `Character::practice` returns early if the skill cannot train, the character is asleep, or the effective level is at `MAX_SKILL` (2548-2550). It builds two modifiers: catch-up `1 + (2 x INT + PER) / 24` (2558) and knowledge `1 + INT / 40` (2561). `amount` is `adjust_for_focus(min(1000, amount)) x 100` (2578). Savant halves non-savant skills (2588). Blunt grinding zeroes any gain when the level is above the recipe's `cap` (2591-2593). Training runs only when the level is in training mode (2600). `SkillLevel::train` is then called (2603).

(b) `SkillLevel::train`. The level gap is `max(K,1) / max(L,1)` (358). Three cases: theory level ahead of practice: catch-up is multiplied by the gap (361-362). Same level with theory XP ahead of practical XP: catch-up becomes `amount x max(catchup - exercise / knowledgeXp, 1)` and knowledge becomes `amount x max(knowledge - 0.1 x exercise / knowledgeXp, 1)` (363-368), so practice slows as it closes on theory. Otherwise both are `amount` (370-373). Theory gain is capped at 0.9 of the catch-up gain (376-378). Theory stops at `MAX_SKILL` (380-381). `SKILL_TRAINING_SPEED` scales both (384-387). Then practical XP += catch-up (389), the rust accumulator -= catch-up (397), theory XP += knowledge (398), `on_exercise_change` runs (400), and `practice()` stamps the last-practised time (401, 490-492).

(c) Level change. `on_exercise_change`: negative XP drops one level and parks XP just below the old start (517-520). Otherwise, while practical XP reaches `10000 x (L+1)^2`, it loops: with multi-level allowed the threshold is subtracted, otherwise XP is zeroed (524-526). A level above theory raises theory to the same level and resets theory XP (527-530). Theory XP at `10000 x (K+1)^2` raises theory level (540-542).

(d) Book or teacher (`knowledge_train`). Gain is `amount x 2 / (gap + 1)` (421), where the gap is taken from the teacher's knowledge or else from the theory-practice gap (413-419). It is multiplied by the speed option (424-427) and added to theory XP, which can raise theory level (430-431).

(e) Rust. Once per 24 hours, `do_skill_rust` runs for each skill (character_body.cpp 379-380; character_knowledge.cpp 255-285). Combat skills of predator characters skip rust at their cadence (261-270). `rust` does nothing within 24 hours of the last practice (446-448), or at `MAX_SKILL` (451-453), or when the accumulator is above `3 x 10000 x (L+1)^2` (457-460). Otherwise `rust_amount = (L+1)^2 x mult x 16 / max(sqrt(acc / levelExp), 0.04)` (464-469). At level 0 it is capped at the practical XP (475-476). The amount moves from practical XP into the accumulator (483-484). The bool return of `rust` is always false (448, 453, 460, 480, 487). Its caller uses the return only as a power-level hook (character_knowledge.cpp:285).

Tick: none. Practice is event-driven (one call per craft or action). Rust is a daily check on the game calendar, not a per-frame step.

## 2. Key functions

- `SkillLevel::train`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/skill.cpp` 350-402. Catch-up, theory cap, rust debit, level change.
- `SkillLevel::knowledge_train`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/skill.cpp` 404-434. Book and teacher gain.
- `SkillLevel::rust`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/skill.cpp` 444-487. Grace, cap, slowdown, amount.
- `SkillLevel::on_exercise_change`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/skill.cpp` 515-545. Level thresholds, multi-level loop, theory level.
- `Character::practice`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character.cpp` 2543-2606. Modifiers, savant, blunt cap, call into `train`.
- `Character::do_skill_rust`: `/mnt/frankendom-donors/CleverRaven-Cataclysm-DDA/src/character_knowledge.cpp` 255-290. Once-per-day loop over skills.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Two tracks per skill: practice fills practical XP; study or teaching fills theory XP | Theory-only gain factor `2 / (gap + 1)` (theirs, skill.cpp:421) |
| Practice catches up toward theory faster when theory is ahead by level (gap ratio), slower when near it | Catch-up `1 + (2 x INT + PER) / 24` (theirs, character.cpp:2558); knowledge `1 + INT / 40` (theirs, 2561) |
| Theory may not outrun practice by more than 90 percent of a gain | 0.9 (theirs, skill.cpp:376-377) |
| Level thresholds grow with the square of the level | `10000 x (L+1)^2` (theirs, skill.cpp:522 for practical, 430 for theory) |
| Daily decay: an accumulator takes XP away after a grace period, with a sqrt slowdown | 24-hour grace (theirs, skill.cpp:446); base 16 and slowdown floor 0.04 (theirs, 469 and 464-465) |
| Cap on skill level | `MAX_SKILL = 10` (theirs, game_constants.h:92) |
| Blunt grinding cap per recipe | `cap = 99` default (theirs, character.h:1288); recipe passes its own cap (crafting.cpp:3160) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for one practice event: the level-gap catch-up with the same-level slowdown, the theory gain with its 90 percent cap, the speed scaling, the rust debit, the level change, and the once-per-day rust step with its grace period, cap and slowdown. It omits: the INT, PER and savant modifiers and the focus adjustment (they are inputs here), the blunt grinding cap (done by the caller), the donor's integer fields (the donor adds floats to ints and truncates; the sketch uses plain numbers), the predator skip, the messages and sounds, the power-level hook, the NPC teaching case beyond the formula, and the donor's `SKILL_TRAINING_SPEED` default. The sketch writes game time in seconds; the donor's calendar units were not converted.

```ts
// clean-room: written from the described mechanism (CC-BY-SA 3.0 donor), not a translation of the donor lines.
// Two tracks per skill: practical XP (exercise) and theory XP (knowledge). Practice catches up toward theory.
const MAX_SKILL = 10;
const DAY = 24 * 60 * 60;   // rust grace and rust cadence (game time units assumed in seconds here)

interface Skill {
  level: number;          // practical level
  exercise: number;       // practical XP into the current level
  knowledgeLevel: number; // theory level
  knowledgeXp: number;    // theory XP into the current theory level
  rustAcc: number;        // XP taken away by rust, kept for slowdown
  lastPracticed: number;  // game time of last practice
}

const levelXp = (l: number): number => 10000 * (l + 1) ** 2;   // XP to go from level l to l+1

function onExerciseChange(s: Skill, allowMulti: boolean): void {
  if (s.exercise < 0) {                       // de-level: park just below the current level's start
    s.exercise = 10000 * s.level ** 2 - 1;
    s.level -= 1;
    return;
  }
  while (s.exercise >= levelXp(s.level)) {
    s.exercise = allowMulti ? s.exercise - levelXp(s.level) : 0;
    s.level += 1;
    if (s.level > s.knowledgeLevel) { s.knowledgeLevel = s.level; s.knowledgeXp = 0; }
  }
  if (s.rustAcc < 0) s.rustAcc = 0;
  if (s.level === s.knowledgeLevel && s.exercise > s.knowledgeXp) s.knowledgeXp = s.exercise;
  if (s.knowledgeXp >= 10000 * (s.knowledgeLevel + 1) ** 2) { s.knowledgeXp = 0; s.knowledgeLevel += 1; }
}

// One practice event. catchupMod ~ 1 + (2*INT + PER)/24, knowMod ~ 1 + INT/40 (donor formulas, set by caller).
function train(s: Skill, amount: number, catchupMod: number, knowMod: number,
               allowMulti: boolean, scaling: number, now: number): void {
  if (amount < 0) return;
  const levelGap = Math.max(s.knowledgeLevel, 1) / Math.max(s.level, 1);
  let catchup = amount * catchupMod;
  let know = amount * knowMod;
  if (s.knowledgeLevel > s.level) {
    catchup *= levelGap;                      // theory ahead: practice catches up faster
  } else if (s.knowledgeLevel === s.level && s.knowledgeXp > s.exercise) {
    // same level: catch-up slows as practice closes on theory
    catchup = amount * Math.max(catchupMod - s.exercise / s.knowledgeXp, 1);
    know = amount * Math.max(knowMod - 0.1 * s.exercise / s.knowledgeXp, 1);
  } else {
    catchup = amount;
    know = amount;
  }
  if (know > catchup * 0.9) know = catchup * 0.9;   // theory cannot outrun practice by much
  if (s.knowledgeLevel >= MAX_SKILL) know = 0;
  if (scaling > 0) { catchup *= scaling; know *= scaling; }
  s.exercise += catchup;
  s.rustAcc -= catchup;
  s.knowledgeXp += know;
  s.lastPracticed = now;
  onExerciseChange(s, allowMulti);
}

// Book or teacher: theory only. Gain is scaled by the level gap: 2 / (gap + 1).
function knowledgeTrain(s: Skill, amount: number, npcKnowledge: number, scaling: number): void {
  const gap = npcKnowledge > 0
    ? Math.max(npcKnowledge - s.knowledgeLevel, 1)
    : Math.max(s.knowledgeLevel - s.level, 1);
  amount *= 2 / (gap + 1);
  if (scaling > 0) amount = Math.ceil(amount * scaling);
  s.knowledgeXp += amount;
  if (s.knowledgeXp >= 10000 * (s.knowledgeLevel + 1) ** 2) { s.knowledgeXp = 0; s.knowledgeLevel += 1; }
}

// Once per day: practical XP leaks into the rust accumulator. No rust in the grace period after practice.
function rust(s: Skill, now: number, rustResistPct: number, rustMult: number): void {
  if (now - s.lastPracticed < DAY) return;
  if (s.level >= MAX_SKILL) return;
  const lm = (s.level + 1) ** 2;
  const levelExp = lm * 10000;
  if (s.rustAcc > levelExp * 3) return;               // capped: too small to matter
  const slowdown = Math.max(Math.sqrt(s.rustAcc / levelExp), 0.04);
  let amount = Math.trunc((lm * rustMult * 16) / slowdown);
  if (rustResistPct > 0) amount = Math.round(amount * Math.max(100 - rustResistPct, 0) / 100);
  if (s.level === 0) amount = Math.min(amount, s.exercise);
  if (amount <= 0) return;
  s.rustAcc += amount;
  s.exercise -= amount;
  onExerciseChange(s, false);
}

export {};
```

## 5. Lands in

- TARGET `src/fight/skills.ts` (new; two-track technique practice on the server ledger). Parity-checklist row 18 (XP award) is the nearest row. Row 13 (specials) is the alternative if the technique is a special.
- today: Frankendom's current technique or skill code was not read (not checked).
- Reuse tag: rewrite-from-idea (CC-BY-SA 3.0; clean-room only)
- Brief rule served: 1 (one ledger; the server decides every award); zones as data for per-technique cost and cap.

## 6. Gaps and risks

- CC-BY-SA 3.0: clean-room, shape only. The sketch is written from the mechanism.
- Theory from the Pit: the Pit is client. Theory XP from a drill must come from a server-verified drill record, or the client can grant itself theory. Frankendom should award theory only from a server record.
- Practice from fights: award only from server-verified hits (checklist row 18), never from a client message.
- Integer truncation: the donor stores integers and adds floats, so each award truncates. Frankendom should use integer milli-points and say which rounding applies.
- Rust: reject for now. A daily decay that takes practical XP away conflicts with a fight-driven progression, and it needs a day clock the fight does not have. If Dom wants decay, it should be a separate server job and not part of the duel.
- The same-level slowdown uses the ratio of practical to theory XP; if theory is never raised, practice never slows. Test the case where theory stays at zero.
- Level thresholds grow with the square of the level and `MAX_SKILL` is 10. These are data for Frankendom (per-skill tuning), not engine constants.
- The predator skip (character_knowledge.cpp:261-270) is a species flag and does not transfer.

Best transferable idea: keep two counters per technique, one for what the player has drilled and one for what they have fought with, and let the fought counter catch up faster when it is far behind the drilled one, so study and practice both matter without a fixed timer.

Decision (proposed): adapt — the two-track catch-up suits technique learning (Pit drills as theory, server-verified fight hits as practice); rust is rejected for now because it needs a day clock the duel does not have.
Acceptance: after 10 server-verified practice awards, a player with drilled theory 5 has more practical XP on that technique than a player with no theory, and theory never gains more than 90 percent of a practical gain on any single award.
