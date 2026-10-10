# AAEmu-AAEmu (status-effects, batch 3, SE005)

Donor: /mnt/frankendom-donors/AAEmu-AAEmu/ (VPS, read-only). Depth: full (server half).
Licence: code CONFLICTING in the repo (README "Licensing information" names LGPL v3; LICENSE.GPL is GPL v3; LICENSE.MIT is MIT). Treated as GPL-or-unclear: clean-room, shape only. Nothing adapted. Game data files carry no licence line (class C). Unofficial server: README says not affiliated with XLGames. Asset audit AU002 read first.
Checked: AAEmu.Game/Models/Game/Skills/Buff.cs, BuffTemplate.cs, BuffConstants.cs, BuffStackRule.cs, Buffs/BuffTolerance.cs, Buffs/BuffToleranceStep.cs, Buffs/BuffToleranceCounter.cs, Buffs/Triggers/DamagedBuffTrigger.cs; Models/Game/Units/Buffs.cs (AddBuff, CheckBuffImmune, CheckDamageImmune, save and load); GameData/BuffGameData.cs (loader); Models/Game/NPChar/Npc.cs (movement gate); Models/Game/Char/CharacterCombat.cs (assist); Models/Game/Skills/Effects/DamageEffect.cs (DoT events); SQL/aaemu_game.sql and SQL/updates/2026-03-21 buff table; AAEmu.UnitTests BuffTests.cs (names only). Confidence high for the code paths listed; no tests run, no runtime.
Half read: SERVER. The matching data half (buff_templates, buff_tolerances, buff_tolerance_steps, buff_modifiers, in compact.sqlite3) is NOT in the box: a grep of SQL/ and AAEmu.Game/Data/ finds 0 tolerance rows and 0 buff template rows. The client half is not in the box either.

## 1. What the player sees and feels
Not read: no client, animation or sound files are in the box, so this is inferred from the code. A unit hit by stun, root, sleep or knockdown stops moving and loses skill use (NPCs gate movement on those flags). Re-applying the same crowd control inside a short window makes it count for less: each repeat is weaker (first full, then a set percentage less per step) until a final step grants an immune buff, which is the cue that the target has stopped reacting. A death is not silent: it leaves a timed status (a PvE death penalty, a PvP war-zone leech, and a respawn cooldown of 5 minutes after a temple revive, per the constant's own comment). At 375 wide the open question is whether one or two status icons can carry this. Not read.

## 2. Why it works, or is striking
- Readable beat: the ladder has a clear last step (an immune buff), so the player can count the hits.
- Signature behaviour: one ladder per buff tag, with a sliding window measured from the last application, not from the first.
- Signature sound or effect: not read (no effect or sound files).
- Could be ours at 20 to 30 percent resemblance: yes. The ladder plus the timed death status are both small, data-driven, and easy to re-tune.

## 3. The rule behind it
Order of operations in Buffs.AddBuff (Models/Game/Units/Buffs.cs, lines 340 to 505, as read):
1. Look up the tolerance for the buff's tag (line 364, BuffGameData lookup).
2. If a counter exists and the immune buff is not active (line 366): if the window has passed (line 368), restart at step 1; otherwise compare the next step with the current one (line 373). If the next step is not stronger, grant the immune buff and restart at step 1 (lines 376 to 378); else advance (line 382). Record LastStep (line 386).
3. Duration = template Duration plus LevelDuration times ability level (BuffTemplate.cs line 489). Then caster Duration modifiers, then owner InDuration modifiers, then the tolerance reduction of the current step (line 408), then the PvP-only character reduction (lines 410 to 411), then any forced duration.
4. Stack rule (lines 426 to 450), below.
5. Immune buff, if granted, is added after the lock is released (line 503 to 505).

Stack rules (BuffStackRule.cs, six values): Refresh 1, ChargeRefresh 2, ChargeExtend 3, Multiple 4, Extend 5, Independent 6. Refresh: a new application with less time left is dropped (line 429 to 430); otherwise it replaces the running instance (line 432). Default branch (Multiple, Extend, Independent, ChargeExtend): when MaxStack is reached, a shorter-lived instance is replaced (lines 443 to 447). Defects below.

Control flags (BuffTemplate.cs): Silence (line 27), Root (28), Sleep (29), Stun (30), Cripled (31), Knockdown (99), Fastened (105). Consumers read: NPC movement gate (Npc.cs lines 1169 to 1174: stun, sleep, root, knockdown, fastened, or dead); NPC combat behaviour (BaseCombatBehavior.cs lines 38 to 40 and 237); skill controllers (Dash, Leap, Floating end on stun or sleep). Stun, silence or sleep interrupt skills on apply (Buffs.cs 477 to 478). Player movement was not found gated on the server in this grep; not verified.

Assist credit: when a victim dies, a Character whose stun, root, sleep, silence or cripled buff is still on the victim gets assist credit (CharacterCombat.cs line 327 onward).

Persistence: table character_active_buffs (SQL/aaemu_game.sql, lines 96 to 110): character_id, buff_id, caster_id, skill_id, ab_level, duration, time_left, charge, stack_count, real_time, saved_at; primary key (character_id, buff_id). Load (Buffs.cs LoadActiveBuffs, from line 990): real-time buffs subtract offline milliseconds (lines 1039 to 1040); other buffs restore the full remaining time; expired real-time buffs are dropped.

Data fields (designer-tunable; donor value null because the licence is conflicting; our values are ours to set):
| name | unit | donor_value |
|---|---|---|
| tolerance_window | seconds, from last application | null |
| tolerance_step_reduction | percent of duration, per step, steps ordered by id | null |
| tolerance_step_hit_chance | percent (loaded, not used in the code read) | null |
| tolerance_immune_buff_id | buff id granted at the ladder end | null |
| tolerance_pvp_reduction | percent, character versus character only | null |
| buff_duration | ms | null |
| buff_level_duration | ms per ability level | null |
| max_stack | count (0 = no cap) | null |
| stack_rule | enum 1 to 6 | null |
| init_min_charge, init_max_charge, max_charge | count | null |
| real_time | bool: ticks while offline (true) or pauses (false) | null |
| control flags | bool each: stun, root, sleep, silence, knockdown, fastened, cripled | null |

## Frankendom mapping
- Shape: 700 zones as data, 100 Pit characters reused across zones, many-vs-one, server-verified. The tolerance counter and stacks are server state on the character (one ledger); the client shows the state, it does not own it.
- Many-vs-one: three attackers can chain a stun on one elite. A ladder on that tag limits the third stun. Recommend for bosses and elites only; ordinary monsters take full duration (our call).
- Parity rows: this is engine state, so it sits in row 1 (duel step and sim): status ticks, ladder and stacks run inside the duel step. Assist credit maps to row 18 (loot roll and XP award).
- Target file: src/fight/status.ts (new module, one row: 1).
- Keep: the ladder with an explicit immune step; the sliding window; the stack-rule enum; the real-time versus paused flag; the timed death status; CC assist credit.
- Change: per-group ladders (stun family, root family, knockdown family) instead of one ladder per tag; the defects below; no login restore counted as an application; stacks and caster saved.

## Defects in the donor (keep the idea; fix in the sketch)
- D1, GetStepAfter throws at the last step. BuffTolerance.cs line 24 uses Steps.First(...), which throws when no later step exists; the comment on line 23 says "TODO: Handle no more"; the caller is Buffs.cs line 372. Fix: FirstOrDefault; no next step means ladder end (sketch line `next === undefined`).
- D2, the else-if path adds a duplicate key when the immune buff is active. The tolerance gate (Buffs.cs 366) is false while the immune buff is active, so control falls to the else-if and calls Dictionary Add on an existing key (line 390), which throws. Fix: while immune is active, do not step and never Add an existing key (sketch `else if (!immuneActive)`).
- D3, the MaxStack cap can be exceeded. Lines 443 to 447 replace only an instance with less time left; if none qualifies, the new buff is added anyway. Fix: at cap with no shorter instance, drop the new one or replace the shortest.
- D4, the replacement target is the last qualifying instance in list order (lines 446 to 447), not the one with least time left. Fix: track the minimum.
- D5, a permanent application loses to a timed one. GetTimeLeft returns -1 for zero duration (Buff.cs lines 261 to 262), and the Refresh branch compares -1 < x (line 429), so a permanent application is dropped by any timed copy. Fix: treat -1 as infinite in the comparison. The sentinel itself is pinned by a unit test (GetTimeLeft_WithZeroDuration_ReturnsNegativeOne), so keep it.
- D6, stacks are not saved. Save writes stack_count as the constant 1 (Buffs.cs line 969); load never reads it. Fix: save and restore the buff's stack count.
- D7, the caster is lost on restore. Load reads caster_id into a tuple (line 1012), but the restore constructs the Buff with the character as caster (line 1066). Fix: resolve the caster from caster_id, fall back and flag when it is gone.
- D8, a login restore counts as a new application (probable; not run). Load calls AddBuff after line 1066, and AddBuff runs the ladder step (lines 340 to 411), so every reload advances the ladder. Fix: a restore flag that skips the ladder step.
- D9, hit_chance is loaded (BuffGameData.cs line 106) and never read. The only other mention is the field in BuffToleranceStep.cs. Fix: apply it as the percent chance that a step triggers, or drop the column.
- D10, the save key cannot hold two instances of one buff. Primary key (character_id, buff_id) (SQL line 108) conflicts with the Multiple stack rule from two casters. Fix: add caster_id or an instance index to the key.

Sketch (typechecked on the VPS with npx tsc --noEmit --strict --target es2020: exit 0). Best transferable idea: a per-group crowd-control ladder that steps down on each repeat inside a sliding window and ends in an explicit immune step.
simplified: omits the duration and charge math, the PvP reduction, the immune buff application (the caller applies grantImmune), and the per-tag lookup. It makes the ladder end explicit (undefined next step = end) and skips stepping while the immune buff is active, which is where the donor's else-if path breaks. Nothing is reordered.
```ts
export {};
type Step = { reductionPct: number };
type Tolerance = { windowMs: number; steps: Step[]; immuneBuffId: number };
type Counter = { idx: number; lastMs: number };

export function tolerate(tol: Tolerance, counters: Map<number, Counter>, tagId: number, nowMs: number, immuneActive: boolean): { mult: number; grantImmune: boolean } {
  let grantImmune = false;
  let c = counters.get(tagId);
  if (c === undefined) {
    c = { idx: 0, lastMs: nowMs };
    counters.set(tagId, c);
  } else if (!immuneActive) {
    if (nowMs - c.lastMs > tol.windowMs) {
      c.idx = 0;
    } else {
      const cur = tol.steps[c.idx];
      const next: Step | undefined = tol.steps[c.idx + 1];
      if (next === undefined || next.reductionPct <= cur.reductionPct) {
        c.idx = 0;
        grantImmune = true;
      } else {
        c.idx += 1;
      }
    }
    c.lastMs = nowMs;
  }
  return { mult: (100 - tol.steps[c.idx].reductionPct) / 100, grantImmune };
}
```

Decision: adapt (idea). Defects D1 and D2 are fixed in the sketch; D3 to D10 are listed as fixes for the port.

## 5. Five-minute look test (Dom, on the phone)
Build: one boss-style enemy in a fight with three attackers (the cap). Three variants on the same 375-wide screen: (A) a flat 1.5 s stun on every hit; (B) a ladder of 0, 50, 75 percent reduction then an immune beat, with a small three-pip indicator under the enemy bar and a short "resists" flash on the immune step; (C) B with the pips removed.
Judge: does B read as "this one is getting tougher" rather than "the stun is broken"? Is one pip row legible at 375 wide next to the enemy bar? Does the immune flash come too late to matter?

## 6. Licence and IP
Code: conflicting licence in the repo; treated as GPL-or-unclear. Shape only; sketch written from the shape, not copied. Game data: no licence line, class C; no values taken. Icons with attribution pages are not used here. Inspiration is category-level only: "a per-tag crowd-control ladder with an immune step" and "a timed status on death". No legal conclusion.

## 7. Gaps
- Not in the box: buff template rows, buff_tolerances and buff_tolerance_steps rows, buff_modifiers (compact.sqlite3). Counts of ladder rows: 0 in the box.
- Not read: client, animation, effect and sound files (none in the box).
- Not read: BuffTriggersHandler.cs and most trigger classes (only DamagedBuffTrigger.cs was read); TimeoutBuffTrigger; the DOT tick path in Buff.cs; the immunity by damage type body (CheckDamageImmune) beyond its first switch.
- Not verified: whether player movement is gated on the server by stun or root (not found in the grep).
- Not run: unit tests, runtime.
- Half read: server. The client half is not in the box. Named pair: none in the box.
