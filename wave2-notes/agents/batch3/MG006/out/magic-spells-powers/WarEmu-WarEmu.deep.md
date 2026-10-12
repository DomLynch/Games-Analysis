# WarEmu-WarEmu (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Abilities/AbilityInterface.cs` | Licence: GPL-2.0-or-later (as read: file headers, e.g. `Handlers/DealDamagesHandler.cs` line 7 "either version 2 of the License, or (at your option) any later version") | C# | symbol `AbilityInterface.StartCast` / `Cast`

Checked: Read in full or in the relevant span: `AbilityInterface.cs` 28-250 (load, level-up ability list, move cancel, `StartCast`, `Cast`, `Cancel`, `CanCast`, cooldown helpers 251-274); `Ability.cs` 40-160 (start, update, completion, AP spend, cancel) and 448-460 (per-second tick); `Unit.cs` 278-362 (AP pool, cap, regen tick, global-cooldown pause); `Handlers/DealDamagesHandler.cs` 143-156 (ability damage formula). Read in part: `AbilityMgr.cs` (cast-time-zero path at 153 only, not read); `CombatInterface.cs` (only the item-cooldown call at 164). NOT read: the other handler families (`Handlers/Zone/*`, `Handlers/Bonus/*`, `Handlers/Entries/*`, DoT and absorb buff bodies beyond their damage-scaling lines), `F_INTERRUPT` handler body (`CombatHandlers.cs:127-128`), the database schema for ability rows (`Common/Database`, only the `Characters_ability` class name seen). The ability numbers (cast time, cooldown, AP cost, damage base) are database rows, not in this box. Confidence: high on the order of the cast gate, the global cooldown, the AP spend and regen, and the cancel-on-move threshold; medium on the channel path (`ApSec`), which was read only through its tick hooks. Camera: not applicable.

Best transferable idea: Make the action-point pool a second resource that regenerates by a fixed tick, pauses its regen while a global cooldown runs, and is spent when a cast lands (not when it starts), so a fast fight has a rhythm limit that a player can read off a bar.
Decision (proposed): adapt. Take the AP pool with pausing regen, the global cooldown set at cast start, and the spend-at-completion rule; reject the donor's per-ability cooldown as the only lock (we keep the global one and add the server-side cap, because the server owns the rhythm); fix the defects in section 6.
Acceptance: A server test sets AP to 40 and casts an ability costing 30; the AP drops to 10 only when the cast lands; a second ability press within 1.5 s, after the first cast has landed, is refused with a global-cooldown reason that the build adds (the donor returns one shared NOT-READY result for both the global and the ability cooldown, and a distinct AP result); a refused press made while a cast is still in progress also cancels that cast, as in the donor, so the AP-drops-to-10 check must run before any second press; regen gives +25 AP per second and holds for the global cooldown (pauses 300 ms per retry) before resuming.

## 1. Mechanism

- Resource pool. The character has `ActionPoints` capped at `MaxActionPoints = 250` (Unit.cs:299). Regen runs in `UpdateActionPoints` (343-361): every `ACTION_REGEN_TIME = 1000` ms (Unit.cs:38) it adds 25 AP (357), clamped to the max (358-359). If the global cooldown is running at the regen tick, the tick is skipped and retried after 300 ms (347-349), so regen pauses while the global cooldown runs.
- Ability data: each ability row holds cast time (`Info.Info.CastTime`, ms), cooldown (`Info.Info.Cooldown`, seconds), AP cost (`Info.Info.ApCost`), range (`Info.Info.MaxRange`), and a per-second AP field (`Info.Info.ApSec`) (names read in use; row schema not read). Rows load from the database per career (`AbilityInterface.UpdateAbilities`, starts at 86, read in part).
- One cast at a time. `AbilityInterface.CurrentAbility` holds the one ability being cast (`IsCasting()`, 160-163). Starting the same ability while it is casting is ignored (195). Starting a different one first cancels the current cast (`Cancel(false)`, 198), and this happens before the gate: a press that is then refused (global cooldown, no AP) still drops the cast in progress.
- Gate, `CanCast` (239-249): AP refusal if the cost is above the caster's AP (241); refusal if the global cooldown (id 0) is still running (243); refusal if the ability's own cooldown is running (245). AP is only checked here, not spent.
- Start, `Cast` (206-228): if the gate passes and the handler's own check passes, the global cooldown (1500 ms, `GlobalMSCoolDown`, AbilityInterface.cs:32) is set (217), the ability starts, and its own cooldown `Cooldown * 1000` is set (220). If the handler refuses, the cast is cancelled (223 or 226).
- Cast time and completion, `Ability.Update` (80-99): when `StartTime + CastTime` has passed, a non-channel ability (`ApSec == 0`) calls `Cast()` (89-90); the ability then stops (`Stop()`), and `AbilityInterface.Update` clears `CurrentAbility` when it is done.
- AP spend, `Ability.Cast` (121-131): the gate is checked again with AP only (124), and then the cost is taken: `Caster.ActionPoints -= Info.Info.ApCost` (126). So AP is charged when the cast lands. If the AP gate fails at completion, `Cast` returns false and spends nothing; if only the handler's own check refuses, the handler sends a done message.
- Cancel on move, `AbilityInterface.OnMove` (53-56): if a cast is running and its cast time is over 1000 ms, the cast is cancelled (54-55). A cast of 1000 ms or less keeps going while the caster moves. The event is registered at load (40).
- Channel path (not fully read): `Ability.OnTick` (451-458) calls the handler's tick and, when `ApSec != 0`, calls `Cast()` on each tick; the tick timer runs once a second (80-82). The per-tick AP charge is therefore the `ApCost` on each `Cast()` call; this was not traced through every handler.
- Damage, `DealDamagesHandler.GetAbilityDamage` (143-156): base = the ability's damage value plus the ability's own level (`Ab.Info.Level`, not the caster's level) times 5.82 (147). If the ability's `MaxRange` is 5 or less (149), it adds STR/5 (151) and `weapon damage * 0.1 * cast seconds` (152). So a slower melee-range cast hits harder. The result is floored at 0 a few lines later (not receipted).

## 2. Key functions

- `AbilityInterface.StartCast` and `Cast`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Abilities/AbilityInterface.cs` 190-228.
- `AbilityInterface.CanCast`: same file, 239-249.
- `AbilityInterface.OnMove`: same file, 53-56 (registered 40).
- `AbilityInterface.Update`: same file, 165-181 (clears `CurrentAbility` when done).
- `Ability.Update` and `Ability.Cast`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Abilities/Ability.cs` 80-131.
- `Unit.UpdateActionPoints`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Objects/Unit.cs` 343-361.
- `DealDamagesHandler.GetAbilityDamage`: `/mnt/frankendom-donors/WarEmu-WarEmu/WorldServer/World/Abilities/Handlers/DealDamagesHandler.cs` 143-156.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Resource pool with a cap and a fixed regen tick | AP max 250 (Unit.cs:299); regen +25 per tick (357); tick 1000 ms (Unit.cs:38) |
| Regen pauses while the global cooldown runs, retried later | Retry 300 ms (Unit.cs:349) |
| Global cooldown set at cast start | 1500 ms (AbilityInterface.cs:32, set at 217) |
| Per-ability cooldown set at cast start | `Cooldown * 1000` ms (220); a data field per ability |
| Cost checked at start, spent at completion | Check 241; spend 126 |
| Move cancels only a long cast | Threshold 1000 ms (54) |
| Melee-range damage scales with cast time | `weapon damage * 0.1 * cast seconds` (152); ability-level term `5.82` (147); STR/5 (151) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order: start cancels the current cast, the gate checks AP and both cooldowns, the global and per-ability cooldowns are set, AP is checked again and spent at completion, a move cancels only a long cast, and regen pauses while the global cooldown runs. It omits the handler-specific checks, the channel per-second path (`ApSec`), the level-up ability list, the career filter, the cast-time-zero path in `AbilityMgr`, the animation and network messages, the buff abilities, and the DoT and absorb handlers. It also drops the handler's done message on refusal and the animation side of a cancel. The engine's constants are data here: the sketch keeps them as named constants so they can be moved to zone data.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const GLOBAL_COOLDOWN_MS = 1500;   // data: global cooldown after any cast start
const AP_MAX = 250;                // data: action point pool cap
const AP_REGEN_PER_TICK = 25;      // data: AP gained per regen tick
const AP_REGEN_TICK_MS = 1000;     // engine constant: regen tick interval
const AP_REGEN_PAUSE_MS = 300;     // engine constant: retry delay while on global cooldown
const CANCEL_ON_MOVE_CAST_MS = 1000; // engine constant: a cast longer than this is cancelled by moving

interface Ability {
  id: number;
  castMs: number;            // cast time, ms
  cooldownMs: number;        // per-ability cooldown, ms (set at cast start)
  apCost: number;            // AP charged at completion, not at start
  maxRange: number;          // <= 5 is treated as melee
  level: number;             // the ability's own level (donor scales damage by this, not the caster's level)
}

interface Fighter {
  ap: number;
  nextApRegenMs: number;
  globalCdUntilMs: number;
  abilityCdUntil: Map<number, number>;
  current: { ability: Ability; startMs: number } | null;
  weaponDamage: number;
  strength: number;
}

// AP regen: skipped and retried after a pause while the global cooldown is running.
function regenAp(f: Fighter, nowMs: number): void {
  if (nowMs < f.nextApRegenMs) return;
  if (nowMs < f.globalCdUntilMs) { f.nextApRegenMs = nowMs + AP_REGEN_PAUSE_MS; return; }
  f.nextApRegenMs = nowMs + AP_REGEN_TICK_MS;
  f.ap = Math.min(AP_MAX, f.ap + AP_REGEN_PER_TICK);
}

// Refusal reason, or "ok". Checks AP and the global and per-ability cooldowns; does not spend AP.
function canStart(f: Fighter, a: Ability, nowMs: number): string {
  if (a.apCost > f.ap) return "not enough AP";
  if (nowMs < f.globalCdUntilMs) return "global cooldown";
  if (nowMs < (f.abilityCdUntil.get(a.id) ?? 0)) return "ability cooldown";
  return "ok";
}

// Start a cast. A new ability cancels the current one; the same ability already casting is ignored.
function startCast(f: Fighter, a: Ability, nowMs: number): string {
  if (f.current && f.current.ability.id === a.id) return "already casting";
  f.current = null;                                     // a different cast is cancelled first
  const r = canStart(f, a, nowMs);
  if (r !== "ok") return r;
  f.globalCdUntilMs = nowMs + GLOBAL_COOLDOWN_MS;
  f.abilityCdUntil.set(a.id, nowMs + a.cooldownMs);
  f.current = { ability: a, startMs: nowMs };
  return "ok";
}

// Move cancels only a cast longer than the threshold.
function onMove(f: Fighter): void {
  if (f.current && f.current.ability.castMs > CANCEL_ON_MOVE_CAST_MS) f.current = null;
}

// Completion: AP is re-checked and spent here, not at cast start. Returns true if the ability lands.
function completeCast(f: Fighter, nowMs: number): boolean {
  const c = f.current;
  if (!c || nowMs < c.startMs + c.ability.castMs) return false;
  f.current = null;
  if (c.ability.apCost > f.ap) return false;
  f.ap -= c.ability.apCost;
  return true;
}

// Melee-range damage: base, plus level scaling; for melee range, add STR/5 and weapon damage * 0.1 * cast seconds.
function abilityDamage(f: Fighter, a: Ability, baseDamage: number): number {
  let dmg = baseDamage + a.level * 5.82;
  if (a.maxRange <= 5) {
    dmg += f.strength / 5;
    dmg += f.weaponDamage * 0.1 * (a.castMs * 0.001);
  }
  return dmg < 0 ? 0 : Math.trunc(dmg);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/mg006-waremu-cast-sketch.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/cast.ts` (proposed new module; the current Frankendom file was not read in this pass). Parity-checklist row 13 (specials: the AP pool and the global cooldown are the rhythm rule for specials against melee).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one engine: AP, global cooldown and the cast gate live in the engine and the server decides; the Pit does not hold a timer); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, and no donor line is translated.
- Defect 1 (fix: reserve AP at start, or refund cooldowns on a failed completion). The donor sets the global cooldown and the ability cooldown at start (217, 220) but spends AP only at completion (126). If AP falls in between (AP-steal handlers exist in `Handlers/Bonus/StealsActionPointsHandler.cs`; their body was not read), the completion re-check fails after both cooldowns have already run, so the caster loses the cast and the cooldown with no message. Fix: reserve the AP in the ledger at start and release the reserve on cancel; or, if the cast fails at completion, clear the two cooldowns it set.
- Defect 2 (fix: one refusal path that tells the caster). `CanCast` checks AP with `>` (241), and `Cast` re-checks through the same gate at completion (124). When that gate fails, `Ability.Cast` returns false (the else branch of the gate) and sends nothing about AP, so the caster sees the cast end with no reason. Fix: a single refusal path that reports "AP short" to the caster.
- Defect 3 (fix: delta time). Regen is per tick with a fixed 1000 ms interval and a 300 ms retry (Unit.cs:347-353); a stalled server tick would drop or bunch regen ticks. Fix: accrue regen from elapsed ms, as in `regenAp`'s schedule but computed from `dt`.
- Gap 4: the global cooldown is set at cast start (217), but the cast-time window is measured from `StartTime` on the server (87). Frankendom's server tick is fixed-step, so the GCD and the cast completion must be stated in ticks and the sketch's ms values converted.
- Also found: `DealDamagesHandler.Update` cancels the cast when the target is null or dead (DealDamagesHandler.cs ~135-138). Frankendom: a cast on a dead target ends without spend.
- Gap 5: the channel path (`ApSec`, `Ability.OnTick` 451-458) was read only through its hooks. Do not port channel AP drain until the handler bodies are read.
- Gap 6: the melee-range damage formula (152) grows with cast time, which rewards slow melee specials. For a fast mobile fight this is the wrong direction; if it is used, cap the cast-time term (the donor has no cap).
- Gap 7: this donor's AP pool (250, +25 per second) and 1.5 s global cooldown are a WAR-era rhythm. Whether they suit a fast mobile fight is a tuning question; the donor gives no evidence either way.
- Not read: the other handler families and the `F_INTERRUPT` client message (`CombatHandlers.cs:127-128`), which may be the client interrupt path.
- Camera: not applicable to the cast rule.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) Damage level term: note and sketch use the caster's Level * 5.82; real code is Ab.Info.Level (the ability's own level) * 5.82 plus Ab.Info.GetDamage(0) (DealDamagesHandler.cs 147), so the sketch abilityDamage uses the wrong variable (f.level). 2) Several line cites are off: AbilityInterface.Update is 165-181 (note says 116-127), IsCasting is 160-163 (note 192-196), UpdateAbilities starts 86 (note 67-105), OnMove 51-56 ok. 3) Unflagged donor behaviour that matters to the Acceptance: StartCast calls Cancel(false) BEFORE the CanCast gate (AbilityInterface.cs 197-200), so a refused press (global cooldown, no AP) still cancels the cast in progress; the note states 'a different one first cancels the current cast' but its test 'a second press within 1.5 s is refused' only works if the first cast has already landed (a build that cancels first and then refuses would drop the first cast, and AP would never fall to 10). 4) Both refusals return ABILITYRESULT_NOTREADY (no distinct 'global cooldown' reason) - the Acceptance says 'refused with the global cooldown reason'; the donor has no such reason string, the build must add it. Verified OK: AP max 250, +25 per 1000 ms, 300 ms retry on global cooldown (Unit.cs 343-361), GCD 1500 ms (AbilityInterface.cs 32, set 217), own cooldown Cooldown*1000 (220), AP spent at Ability.Cast 126, move cancel when CastTime > 1000 (54), STR/5 and weapon*0.1*cast seconds for MaxRange<=5, GPL-2-or-later header, no CLAUDE.md in donor.
Missed: DealDamagesHandler.Update cancels the cast when the target is dead or null (DealDamagesHandler.cs ~135-138), a simple rule not covered. Ability.Update also stops channel abilities (ApSec != 0) through OnTick rather than Cast (Ability.cs 89-93) - note acknowledges channel path not traced.

Fixed 2026-10-12 (Sonnet fixer): damage level term is the ability's own level (sketch now has `Ability.level`, drops `Fighter.level`); line cites corrected (Update 165-181, IsCasting 160-163, UpdateAbilities from 86); noted the cancel-before-gate behaviour; acceptance reworded (first cast must land first; global-cooldown reason is added by the build since the donor has one shared NOT-READY result). Also found: damage handler cancels the cast on a null or dead target.
