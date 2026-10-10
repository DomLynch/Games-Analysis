# EQEmu (status-effects, cell SE004)

Donor: /mnt/frankendom-donors/EQEmu (VPS, read-only). Licence: GPL-3.0 (LICENSE.md line 3, "Version 3, 29 June 2007"). Clean-room, shape only; no donor numbers are carried as donor values.
Checked: server and common halves read (zone/spells.cpp, zone/spell_effects.cpp, zone/attack.cpp, zone/mob.cpp, common/spdat.cpp, common/spdat.h, common/ruletypes.h, zone/client_process.cpp). Confidence high on stacking order, stun, mez, root, bash, gravity; medium on fear pathing (not read). Receipts: receipts.tsv (86 rows, all verified).
Half read: server and common (code plus rule defaults). Data half: spell rows are NOT in the box (grep over utils/sql found no INSERT INTO spells_new file; utils/sql holds migrations and schema). Client half: client_files holds only CMake and export/import folders, so the client status-icon code is not in the box.
Verdict: STRONG (stacking order, stun/mez/root/fear rules, root break formula, all read in code).
Best transferable idea: one ordered stacking test (refuse, overwrite, or coexist), a per-target resist percent, and a six-second tic clock, with mez broken by the first non-lethal hit.
Decision: adapt (idea). Defects below are fixed in the sketch.

## 1. What the player sees and feels (375 wide)
A stun freezes the target for a short, rule-set time (two seconds by default for a bash stun); the server sends the duration to the client, which plays the frozen state. A fear sends the target running to a flee point in steps of six seconds, and a player target can only be feared for four steps (24 s). A mez holds the target still until the first non-lethal hit, and the hit wakes it with a message to nearby players. A root pins the target in place; each hit can shake it loose, and the odds depend on the level gap. Gravity push or pull slides a mob or player a little each game tick. A knockdown is handled entirely by the client; the server sends nothing for it.
On a phone the readable beats are: frozen pose plus a timer, one icon per status type, a one-hit wake for mez, and a shake for root.

## 2. Why it works, or is striking
- Readable silhouette or beat at 375 wide: mez-breaks-on-hit gives a one-hit tension that reads at any zoom; root breaking by damage gives a visible shake per hit.
- One signature behaviour: mez wakes on any non-lethal hit. In many-vs-one (max three attackers) this makes the tank-and-spank choice visible: hit the wrong target and the sleeper wakes.
- One signature sound or effect: the donor's own sound is not read (client half absent). Our candidate is a single wake chime on mez break.
- Could be made ours at 20-30 percent resemblance: yes. Keep the ordered stack test and the mez break; change the names, the number of statuses, and the flee and gravity feel.

## 3. The rule behind it
Stacking, the order of tests (CheckStackConflict, zone/spells.cpp lines 3069-3340):
1. Resurrection effects stack with anything (returns 0).
2. A complete heal is refused while a complete-heal blocker is active (line 3094), and a complete-heal effect never stacks or overwrites (line 3329).
3. Same spell id (block at line 3099): a weaker caster level is refused; equal or higher caster level overwrites. Stackable DoTs and mana burn are exempt. Improved taunt has an exception.
4. Rule list AlwaysStackSpells (line 3125) stacks with everything.
5. A bard song and a beneficial buff stack (line 3139).
6. When the effect lists differ: the AStacker to DStacker ladder (effects 446 to 449) blocks a lower-valued same-type effect; the overwrite command (effect 149) replaces a buff when one named effect is below a threshold; the block command (effect 148) refuses a new buff when its value is below a threshold, except detrimental spells, which bypass it (lines 3183-3259).
7. Per matching effect slot: exclusions (bard-only effects, the ignored-in-stacking list, negative AC, NPC DoTs from different casters), then a DoT from a different spell stacks when both are detrimental (lines 3290-3338). The final value comparison after line 3340 was not read.

Duration: CalcBuffDuration picks the formula and base from the spell row. A detrimental buff between two clients uses a PvP formula and cap. Formulas read in the switch are cases 1 to 14 (level halves, 30 per level, fixed 2 or 50, level plus 10, and so on). An illusion override sets 10000 tics (about 16 hours). A buff's tic count drops once per six-second tic (zone/spell_effects.cpp line 3858; tic_timer 6000 at zone/mob.cpp line 110).

Stun (zone/spells.cpp lines 5769-5800): a shorter stun never replaces a longer one; the stun starts a timer in milliseconds; a stun on a caster may interrupt the spell being cast, and persistent-casting bonuses lower that chance.
Stun immunity and resist (zone/spell_effects.cpp lines 731-765): a detrimental stun is refused when the target has a stun-immunity flag, or when the target's level is above the spell's max level (0 means the base immunity level, default 55). NPC casters ignore the base immunity by default. Stun resist is a percent from item and spell bonuses (plus AA for clients and bots): the stun lands when a roll from 0 to 99 is at or above that percent.
Fear (lines 906-934): with pathing on (default), the target gets a flee point and does not stop; with pathing off, it is stunned for the remaining tics times six seconds minus the elapsed part of the current tic. Player targets are capped at four tics (rule default).
Mez (zone/spell_effects.cpp line 1191; zone/attack.cpp lines 4299-4311): a mez holds until any non-lethal hit with an attacker, which fades the mez buff.
Root (zone/attack.cpp lines 6260-6280): rooted state; the root's break chance starts from a rule value of 55, is cut by the caster's root-break bonus, then by the level gap: gap 2 keeps 80 percent, gaps 3 to 20 keep 60 percent, gaps 22 and up keep 20 percent; the minimum is 1. Gap 21 falls through unchanged (defect below). Only roots from detrimental spells break, and damage from the root's own slot does not break it.
Bash and kick stun (zone/attack.cpp lines 4318-4407): a bash skill can stun; a kick can stun only for warriors at or above the level rule (PC 56, NPC 1). The roll is 0 to 100 inclusive; the stun lands when the roll is above 55 minus the bonus. With no bonus that is 45 of 101 values (about 44.6 percent). Frontal-stun immunity classes and races are checked. A second check rolls frontal and general stun resist. The stun lasts the combat rule StunDuration (2000 ms default).
Gravity (zone/mob.cpp lines 6884-6940): called from the client and NPC loops (zone/client_process.cpp line 503; zone/npc.cpp line 736). Each gravity buff moves the mob by |value|/100 per call in the direction of the value's sign, toward or away from the caster; nothing moves within five units.

Data fields (designer-tunable, units; donor values null because GPL):
| name | unit | donor_value_or_null |
|---|---|---|
| status.tic_ms | ms | null (donor 6000) |
| stun.default_ms | ms | null (donor 2000) |
| stun.resist_pct | percent, from gear and buffs | null |
| stun.immune_level | level | null (donor 55) |
| fear.pc_max_tics | tics | null (donor 4) |
| root.break_base_pct | percent | null (donor 55) |
| root.break_mult_gap2 | ratio | null (donor 0.8) |
| root.break_mult_gap3_20 | ratio | null (donor 0.6) |
| root.break_mult_gap22_plus | ratio | null (donor 0.2) |
| bash.stun_threshold | percent of 100 | null (donor 55) |
| gravity.units_per_tick_div | divisor | null (donor 100) |
| gravity.dead_zone | units | null (donor 5) |

## 4. For Frankendom
- Our shape: 700 zones as data, 100 Pit characters reused across zones, many-vs-one with max three attackers, server-verified events driving client presentation.
- Keep: the ordered stacking test (refuse, overwrite, or coexist); a per-target resist percent; mez breaking on any non-lethal hit; the fear-as-steps model with a player cap; root breaking by damage with a level-gap band.
- Change: fewer statuses (stun, fear, mez, root, gravity); no bard songs; the ladder and block effects become one blocks-list field per status kind; knockdown becomes a server event with a duration so the server can verify it (donor's knockdown is client-only).
- Parity row: row 1 (duel step/sim). Target file: src/fight/status.ts (new module proposed). Server tick sub-line: "server tick: status tics counted in fixed 6000 ms steps, applied in the engine step, with no per-tick NPC budget in this donor".
- Engine rule: the status arbitration runs in src/fight, server-side; the client only receives a status event (kind, start, duration) and presents it.

simplified: the ordered stacking test and the root-break band, with the donor's band gap at 21 fixed (our decision: 21 joins the 80 percent band). Numbers are our starting values, not donor values. Integer division is kept with Math.floor. The gravity sign is taken per effect, which fixes the leak described in defect 2. The stacking test here is shown in its shortest form; the value tail was not read in the donor.
```ts
const ROOT_BREAK_BASE_PCT = 55; // our starting value, not the donor's number

export function rootBreakPct(levelDiff: number, buffBonusPct: number): number {
  let chance = ROOT_BREAK_BASE_PCT;
  chance -= Math.floor((chance * buffBonusPct) / 100);
  if (levelDiff === 2) {
    chance = Math.floor((chance * 80) / 100);
  } else if (levelDiff >= 3 && levelDiff <= 20) {
    chance = Math.floor((chance * 60) / 100);
  } else if (levelDiff >= 21) {
    chance = Math.floor((chance * 20) / 100);
  }
  return Math.max(1, chance);
}

export function gravityStep(value: number, dx: number, dy: number, dist: number): { dx: number; dy: number } {
  if (value === 0 || dist <= 5) return { dx: 0, dy: 0 };
  const sign = value > 0 ? 1 : -1;
  const amount = Math.abs(value) / 100;
  return { dx: (dx / dist) * amount * sign, dy: (dy / dist) * amount * sign };
}
```
Typecheck: scp to the VPS /tmp and `npx -p typescript tsc --noEmit --strict --target es2020` returned exit 0.

## 5. A five-minute look test for Dom
Build a debug scene with one target and three attackers, and four buttons: stun (2 s), fear (3 tics), mez, root. On a 375-wide phone, judge: (a) does a stun read as a frozen pose with one timer ring; (b) does mez wake on the first hit with one flash; (c) does root shake per hit with the odds shown as a ring; (d) does fear read as running in six-second steps. Compare the stun and mez against the current build, not against the donor.

## 6. Licence and IP
Code licence: GPL-3.0 (LICENSE.md). The spell rows that give real stun and fear values are not in the box, and this note does not use any donor spell name or value. Mechanics are described in our own words; numbers are listed as data fields with donor value null. Clean-room only: shape, not code.

## 7. Gaps
- Not read: fear pathing (CalculateNewFearpoint and the flee code), charm, lull, blind, the mez resist roll beyond the base immunity check, the stacking value comparison after line 3340, CalcBuffDuration_formula cases above 14, AA and item stun bonuses beyond their names.
- Not in the box: spell rows (utils/sql holds no spells_new inserts), the client UI for status icons, the client half.
- Half read: server and common only.

## Defects (keep the idea, fix the defect)
1. Root break band gap: "else if (level_diff > 21)" (zone/attack.cpp line 6272) skips gap 21, so a gap of 21 gets the base chance and a gap of 22 gets 20 percent. Fix: `>= 21`. Shown in the sketch.
2. Gravity sign leak: `away` is set once to -1 (zone/mob.cpp line 6887) and only ever set to 1 inside the positive-value branch (line 6919), so a pull that follows a push in the same loop is applied as a push. Fix: take the sign from each effect's own value. Shown in the sketch.
3. Bash stun clause: "bashsave_roll > 98" (zone/attack.cpp line 4394) adds nothing when the bonus is zero or more, because rolls 99 and 100 already pass "> 55". Not a numeric defect; fix: delete the clause or name its intent.
4. Resurrection-block slot choice: the loop at zone/spells.cpp lines 3853-3860 has no break, so the slot kept is the last free one, not the first. No gameplay impact seen. Fix: break on the first free slot to match the rest of CanBuffStack.
5. Knockdown is client-only (zone/spell_effects.cpp line 3128): the server holds no knockdown state, so it cannot verify it. This is a design gap for us, not a bug in the donor. Fix (ours): server event with a duration; the client presents it.

## Also seen (this topic)
- Death and respawn: not read here (see the ACE note for a death debt).
- Idle and ambient, loot ceremony, walk density: not read for this topic.
- Readability at 375 wide: the server sends the stun duration and mez and root state; no UI code in the box.

## Brief rule served
Status stacking and crowd control in a server-verified engine: one ordered test decides refuse, overwrite or coexist; statuses carry tics and resist percents; mez breaks on hit.
