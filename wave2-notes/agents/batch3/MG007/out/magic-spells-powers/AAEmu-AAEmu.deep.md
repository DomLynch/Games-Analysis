# AAEmu-AAEmu (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Skills/Skill.cs` (with `Models/Tasks/Skills/CastTask.cs`, `Models/Game/Units/Unit.cs`, `Models/Game/Units/Buffs.cs`) | Licence: README says "GNU Lesser General Public License ... version 3" (README.md:36); `LICENSE.GPL` is the GPL-3.0 text (LICENSE.GPL:2); `LICENSE.MIT` is an MIT licence for Rain0Ash 2019. Unclear mix: treated as copyleft, clean-room, shape only | C# | symbols `Skill.Use` (89), `Skill.Cast` (615), `Unit.InterruptSkills` (857)

Checked: Read in full: `Skill.Use` (89-350), `Skill.Cast` (615-752), `Skill.ScheduleEffects` (830-868), `Skill.Stop` (1433-1450), `Skill.ManaCost`/`ConsumeMana` (1559-1580), `CastTask.cs` (all 22 lines), `Unit.ReduceCurrentHp` (334-356), `Unit.InterruptSkills` (857-871). Read in part: `Buffs.cs` (455-495, the apply path that calls interrupt), `Unit.cs` 427-447 (mana drain, death), `ManaRegenTemplate.cs` (all), `SkillManager.cs` (330-386, the data loader). Opened for the search: `PlotEventTemplate.cs`, `ResetAoeDiminishingEffect.cs`, `PlotManager.cs` (line 86), `SkillCaster.cs` (read; packet marshalling only, no mechanism). Not read: the skill data table itself (no SQL schema for `casting_time` in the box; values come from a database not in the donor folder), `CheckInterval` (an extension method defined in AAEmu.Commons/Utils/Helper.cs:56, outside AAEmu.Game; its body was not read), the `Cooldowns` class, `Character` regen formula, the `SkillModifiersCache` internals, what breaks a cast on movement (no caller found for interrupt on move; not exhaustively read). Confidence: high for the cast/cooldown/GCD/mana order and for the interrupt rule; medium for "no hit interrupt" (based on the damage path read plus grep; not every damage source read).

Best transferable idea: a cast is a timed object: check the gates at start (cooldown, GCD, mana), but spend mana and start the cooldown only when the cast completes, and drop the whole cast with nothing spent when a crowd-control buff lands.
Decision (proposed): adapt - take the start-gate / completion-spend split and the CC-drops-cast rule; change the donor's gaps (GCD set at completion, no busy check, no hit rule) and fix its defects listed in section 6.
Acceptance: a player casting a 1.5 s spell who is stunned at 0.6 s sees the cast bar stop, mana unchanged, and the spell's cooldown not started; a completed cast takes its mana once and starts the cooldown; a server test asserts both.

## 1. Mechanism

- Entry: `Skill.Use` runs the gates in this order (89-350): requirements check (`UnitRequirementsGameData.CanUseSkill`, 106); per-skill cooldown (116-120); spam guard for basic attacks (129-143); global cooldown (146-154); cancel-on-start buffs (161-166); target pick (172); mana gate (197-198); range min/max (213-261). The mana gate runs before the range block.
- Spam guard: base delay 150 ms (129). For skill ids 2, 3, 4 the delay is 500 ms for a player and 1500 ms for an NPC (130-133). If the last use was less than `delay` ago and `CheckInterval(delay)` says no, the result is `CooldownTime` (135-142). The global-cooldown check (146-154) uses the same `delay` and `CheckInterval` (not read).
- Cast time: `castTime = CastTimeMul x SkillModifiers(CastTime, CastingTime)`, then `x CastTimeMultiplier` (312-313). `CastTimeMul` for a character is `(bonus + 1000) / 1000`, so the base is 1.0 (Character.cs 633-636, bonus part not read). If `castTime > 0` a `CastTask` is scheduled (331-341); otherwise `Cast` runs at once (343-346).
- `CastTask` runs `Skill.Cast` only if `Skill.Cancelled` is false (CastTask.cs 15-21).
- Completion, `Skill.Cast` (615-752): (a) if the skill is not bypassing GCD, `GlobalCooldown = now + gcd x GlobalCooldownMul/100` where gcd is 1000 for a player and 1500 for an NPC when `DefaultGcd` is set (619-626); (b) `SkillTask` cleared (663); (c) `ConsumeMana` (665); (d) `Cooldowns.AddCooldown(skill, CooldownTime)` (666); (e) channel or immediate effects (744-751).
- Channel: `StartChanneling` applies the channel buffs, optionally spawns a doodad, and schedules `EndChannelingTask` after `ChannelingTime` (774-801). Mana is spent at the start of the channel, because `ConsumeMana` runs in `Cast` before the branch.
- Projectile delay: `ScheduleEffects` sums `EffectDelay`, `distance / EffectSpeed x 1000` ms, and the fire animation time when `UseAnimTime` is set (839-845). Effects land after that delay (858-866).
- Interrupt: `Skill.Stop` (1433-1450) on a channel calls `EndChanneling`, broadcasts stop packets, clears `SkillTask`, and sets `Cancelled = true`. Nothing is spent in that path. `Unit.InterruptSkills` (857-871) calls `Stop` on the active task. It is called on death (`DoDie`, Unit.cs 447), on applying a buff with `Stun`, `Silence` or `Sleep` (Buffs.cs 477-478), and from many AI behaviours, and also from crafting (CharacterCraft.cs 383, CraftEffect.cs 104), `RecoverItem.cs` 41 and `Slave.cs` 818. `Root` is not in that list (Buffs.cs 477); Buffs.cs 463-466 uses Root only to unmount a riding character, not to interrupt a cast.
- Damage: `Unit.ReduceCurrentHp` (334-356) takes absorb charges first (341-348), then lowers HP (351). It does not call `InterruptSkills` (not in this path).

## 2. Key functions

- `Skill.Use` (89-350): the start gate. Gates and order as in section 1.
- `Skill.Cast` (615-752): the completion step. GCD set (625), mana spent (665), cooldown started (666), channel or effects branch (744-751).
- `Skill.ManaCost` (1559-1565) and `ConsumeMana` (1567-1580): the mana formula and the spend.
- `Skill.Stop` (1433-1450): the cancel path. Sets `Cancelled`, the cast never completes.
- `CastTask.Execute` (CastTask.cs 15-21): the timer hook that calls `Cast` unless cancelled.
- `Unit.InterruptSkills` (Unit.cs 857-871) and its main callers: `Buffs.cs` 477-478, `Unit.DoDie` 447, the AI behaviours, crafting (CharacterCraft.cs 383, CraftEffect.cs 104), RecoverItem.cs 41 and Slave.cs 818.
- `Unit.ReduceCurrentMp` (Unit.cs 427-443): clamps mana to 0 (434).

## 3. Numbers vs mechanism

Table of mechanisms (values are as read in the donor; "data" means a per-skill value loaded from a database table that is not in the box):

| Mechanism | Effect | Formula | Number ranges | Cost | Cooldown / cast time | Caps | file:line |
|---|---|---|---|---|---|---|---|
| Mana gate at start | refuse the cast if mana is short; spend nothing yet | `ManaCost(unit) > unit.Mp` | cost as below | none at start | none | none | Skill.cs:197-198 |
| Mana cost | mana per cast | `((abLevel-1)*1.6+8)*3/3.65 * ManaLevelMd + ManaCost`, then the `ManaCost` skill modifiers (1561-1563) | derived here, not from data: abLevel 1 gives 6.58 before `ManaLevelMd` and `ManaCost`; abLevel 10 gives 18.41 | mana | n/a | mana floor 0 (Unit.cs:434) | Skill.cs:1561-1563, 1573 |
| Cast time | delay before completion | `CastingTime x CastTimeMul x CastTimeMultiplier` | `CastingTime` is data (not in box); `CastTimeMul` = 1.0 plus bonus/1000 | none | cast time | none read | Skill.cs:312-313; Character.cs:635 |
| Per-skill cooldown | blocks the same skill id | starts at completion: `now + CooldownTime` | `CooldownTime` is data (not in box) | none | cooldown | none read | Skill.cs:116, 666 |
| Global cooldown | blocks all skills except those with `IgnoreGlobalCooldown` | `gcd x GlobalCooldownMul/100`, set at completion | 1000 ms player, 1500 ms NPC (default GCD) | none | GCD | none read | Skill.cs:146, 622-625 |
| Spam guard, basic attacks | blocks rapid basic attacks | `delay` = 150 ms; ids 2-4 use 500 ms (player) or 1500 ms (NPC) | 150 / 500 / 1500 ms | none | spam interval | none | Skill.cs:129-143 |
| Channel | effect at channel end | `ChannelingTime` timer; mana spent at start | `ChannelingTime` is data | mana at start; `ChannelingMana` loaded but not read | channel time | none read | Skill.cs:744-746, 774-801 |
| Projectile travel | effect lands after flight | `EffectDelay + dist / EffectSpeed x 1000` | `EffectSpeed` is data | none | travel time | none read | Skill.cs:840-843 |
| Interrupt by CC | cast dropped | `Stun`, `Silence` or `Sleep` buff: `InterruptSkills`, then `Cancelled = true` | none | no mana spent; no cooldown started | cast abandoned | root and hits do not interrupt | Buffs.cs:477-478; Unit.cs:868; Skill.cs:1449-1450; CastTask.cs:17-18 |
| Death | cast dropped | `DoDie` calls `InterruptSkills` | none | as above | as above | none | Unit.cs:447 |
| Absorb | damage taken from a shield charge first | `value = ConsumeCharge(value)` before HP loss | charge count not read | none | none | none read | Unit.cs:341-351 |
| Dash mana upkeep | mana drain per tick while Dash is up | formula 13 `x TickLevelManaCost`; buff stops if mana is short | formula 13 not read | mana per tick | tick interval from buff (not read) | none read | ManaRegenTemplate.cs:27-45 |
| Persistent mana regen | regen default | `PersistentMpRegen = 30` | 30 (default) | none | per tick (not read) | none read | Unit.cs:111 |

Numbers that suit a fast mobile fight, from this donor: the 150 ms spam guard and 500 ms player delay for basic attacks are real numbers from the donor; the 1000 ms GCD is a reasonable starting point for a phone fight; the donor's cast times and cooldowns are data and are not in the box, so no range can be stated for them.

## 4. TypeScript sketch

simplified: the sketch follows the donor order for the gates (cooldown, GCD, mana) and the completion step (mana, cooldown, GCD). It differs in four places on purpose: (1) it sets the GCD at start, not at completion, to close the gap noted in section 6; (2) it adds a `busy` check that the donor's start path does not show (not read elsewhere); (3) it fixes mana at start and spends it at completion, so the gate and the spend use the same number; (4) it does not have the donor's spam guard, channel branch, projectile delay, absorb charges, NPC skill variants, or the `CheckInterval` wait, and it does not drive completion from a task scheduler (the caller is a fixed-step tick).

```ts
// Licence: donor is copyleft (README LGPL-3.0; LICENSE.GPL GPL-3.0). clean-room, shape only.
// clean-room
type Ms = number;

interface CastSpec {
  id: number;
  castMs: number;        // base cast time (from skill data; 0 = instant)
  cooldownMs: number;    // per-skill cooldown, starts at completion
  ignoresGcd: boolean;
}

interface Cast {
  spec: CastSpec;
  cost: number;          // mana fixed at start, spent at completion
  endsAt: Ms;
  cancelled: boolean;
}

interface CasterState {
  mp: number;
  gcdUntil: Ms;
  cooldownUntil: Map<number, Ms>;
  cast: Cast | null;
}

type StartResult = "ok" | "busy" | "cooldown" | "gcd" | "lack-mana";

const GCD_MS = 1000;     // data field: player default (donor Skill.cs:623 uses 1000 player, 1500 NPC)

// Donor mana formula (Skill.cs:1561-1562) with its constants kept as read.
function manaCost(abLevel: number, levelMd: number, flat: number): number {
  const base = ((abLevel - 1) * 1.6 + 8) * 3 / 3.65;
  return base * levelMd + flat;
}

// Start gate: same order as the donor's use path (cooldown, GCD, mana), then the cast timer.
function startCast(c: CasterState, s: CastSpec, now: Ms, castMul: number, cost: number): StartResult {
  if (c.cast) return "busy";                                           // added: donor start path has no busy check (not read)
  if ((c.cooldownUntil.get(s.id) ?? 0) > now) return "cooldown";
  if (!s.ignoresGcd && c.gcdUntil > now) return "gcd";
  if (cost > c.mp) return "lack-mana";                                 // gate only; nothing is spent yet
  if (!s.ignoresGcd) c.gcdUntil = now + GCD_MS;                        // changed: GCD starts at start, not completion
  if (s.castMs <= 0) { complete(c, now, s, cost); return "ok"; }
  c.cast = { spec: s, cost, endsAt: now + s.castMs * castMul, cancelled: false };
  return "ok";
}

// Stun, silence, sleep or death: the cast is dropped with no mana spent and no cooldown started.
function interrupt(c: CasterState): void {
  if (c.cast) c.cast.cancelled = true;
  c.cast = null;
}

function complete(c: CasterState, now: Ms, s: CastSpec, cost: number): void {
  c.mp = Math.max(c.mp - cost, 0);
  c.cooldownUntil.set(s.id, now + s.cooldownMs);
}

// Server tick: completes a cast whose end time has passed. Fixed-step driving is an assumption of the sketch (donor uses a task scheduler).
function tick(c: CasterState, now: Ms): number | null {
  const cast = c.cast;
  if (!cast || cast.cancelled || now < cast.endsAt) return null;
  c.cast = null;
  complete(c, now, cast.spec, cast.cost);
  return cast.spec.id;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/mg007-aaemu-cast-gate.ts). Re-run after the GCD change below; see the result line in the final report.

## 5. Lands in

- TARGET `src/fight/cast.ts` (new module, engine casting step). The cast gate and the CC interrupt belong in the engine, not the client. Parity-checklist row 13 (specials).
- Reuse tag: rewrite-from-idea (copyleft; clean-room only)
- Brief rule served: 1 (one engine: cast timing, mana and cooldown are server-side); rule 3 (guard/stance is row 3, not this note); rule 7-9 n/a

## 6. Gaps and risks

- Copyleft licence: clean-room only. The sketch is written from the described order, not the lines.
- GCD is set at completion (Skill.cs:625 inside `Cast`). A long cast leaves the GCD unset while casting. Fix: set the GCD at start in the engine.
- No busy check in the start path that was read (Skill.cs:89-350). If the client does not prevent a second cast, two `CastTask`s can both complete and the second overwrites `unit.SkillTask` (Skill.cs:340-341). Not tested. Fix: refuse a start while a cast is active, and test it.
- Mana is checked at start and spent at completion (197 vs 665). The two numbers can differ if mana changes during the cast. The sketch fixes the cost at start. Frankendom needs one rule; the sketch chooses fixed-at-start.
- Defect, live code: `var value = Random.Shared.Next(0, 1);` (Skill.cs:633) always returns 0 because the upper bound is exclusive. The NPC branch that uses `value` for two animation and delay variants (628-660) therefore always takes variant 0. Fix: `Next(0, 2)` and a test that both variants can occur.
- Defect, dead data: `ChannelingMana` is loaded (SkillManager.cs:358) and defined (SkillTemplate.cs:40) but not read in the code that was searched. Fix: either spend it in the channel tick or remove it.
- Defect, dead flag and stub: `AoeDiminishing` is loaded (PlotManager.cs:86) and defined (PlotEventTemplate.cs:24) but no reader was found. `ResetAoeDiminishingEffect.Apply` only logs the text "ReportCrimeEffect" (ResetAoeDiminishingEffect.cs:15), which looks copied. So AAEmu has no crowd-control diminishing-returns ladder. Fix: build the ladder in Frankendom's CC layer (one per target, any source), not from this donor.
- Design gap: a hit does not interrupt a cast (Unit.cs 334-356 has no interrupt call). Frankendom's spell-vs-melee balance needs a rule. Options: hits break casts above a damage threshold, or a per-cast armour value. Decide; do not copy the donor's silence.
- Root does not interrupt (Buffs.cs:477). Frankendom's Root rule should be decided on purpose (cast-in-place vs cancel).
- Cast cancel on movement was not found in this read. Not verified.
- Frankendom rulings: spells stay server-verified (cooldown, mana and the CC check all in `src/fight/cast.ts`; the client only sends the request). The donor is a server emulator, so this fits.
- Data: the skill numbers (cast time, cooldown, mana cost, range) are in a database that is not in the box. Frankendom should treat each as a catalogue field with a default (zones as data, catalogue rows 20-21), not a constant.

Reuse tag: rewrite-from-idea (copyleft; clean-room only)
Brief rule served: 1 (one engine); 3 (state and timing, not the guard itself)

## Pattern and data fields

pattern_tags: wait-gate (start gate before the cast timer), timer-wheel (cast end and cooldown as scheduled timers), new:cast-cancel-on-cc (drop cast with no spend).
Data fields (in the sidecar JSON): gcd_ms, spam_guard_ms, cast_time_ms, cooldown_ms, mana_cost, mana_level_md, cast_time_mul, effect_speed, channel_time_ms, mp_floor.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: MINOR
- Section 1 listed the gate order with the mana gate (197-198) after the range block (213-261); the mana gate actually runs before the range block. Confirmed against code.
- The `CheckInterval` "not found" claim was weak: it is an extension method in AAEmu.Commons/Utils/Helper.cs:56 (outside the folder searched). Confirmed; wording corrected.
- Missed: `InterruptSkills` has more callers than listed (CharacterCraft.cs 383, CraftEffect.cs 104, RecoverItem.cs 41, Slave.cs 818); Buffs.cs 463-466 handles Root only for unmounting a rider. Added to section 1/2.

Fixed 2026-10-12: gate order sentence; `CheckInterval` location; InterruptSkills caller list and Root note. Sketch unchanged (it has no range block).
