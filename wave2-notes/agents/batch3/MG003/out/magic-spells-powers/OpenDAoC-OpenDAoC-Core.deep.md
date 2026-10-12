# OpenDAoC-OpenDAoC-Core (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Effects/CrowdControlECSEffect.cs` (with ECSImmunityEffect.cs, ECSGameSpellEffect.cs, ECSGameEffect.cs, spells/CCSpellHandler.cs, gameutils/EffectHelper.cs, ECS-Components/EffectListComponent.cs, serverproperty/ServerProperties.cs) | Licence: GNU GPL-3.0 per the repo LICENSE file (read: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"); source files carry the Dawn of Light header (gplheader.txt): "either version 2 of the License, or (at your option) any later version". Copyleft: clean-room, shape only | C# | symbol `CalculateNewEffectDuration` (NpcImmunityEffect, ECSImmunityEffect.cs 46-51)

Checked: Read in full: ECS-Effects/CrowdControlECSEffect.cs (133 lines), ECS-Effects/ECSImmunityEffect.cs (74 lines), ECS-Effects/ECSGameSpellEffect.cs 60-82 (TryApplyImmunity), gameutils/EffectHelper.cs 275-305, spells/CCSpellHandler.cs 150-220 (mez resist and duration) and 262-332 (stun resist and duration), ECS-Components/EffectListComponent.cs 922-940 (the call site), serverproperty/ServerProperties.cs 2470-2490. Not read: the rest of EffectListComponent, ECSGameEffectFactory, the body of `StopCurrentSpellcast`, the `ECSGameEffect` pulse and removal code beyond line 81, the Mastery of Concentration and Shield of Immunity abilities, CharmECSEffect (immunity lookup seen by grep only, line 53), StandardMobBrain CC avoidance (seen by grep only, 1338-1339). Confidence: high on the halving formula, the threshold, the immunity types, the window timing (starts when the CC is removed) and the NPC 60 s override. On how many applications fit one NPC window: the order between OnApplyNewEffect and immunity creation is traced in the fix pass (queued effects). camera_scope: not a camera cell.

Best transferable idea: Make crowd control self-limiting on a non-player target (each reapplication inside a window halves its duration and anything under one second is refused), and give players a fixed immunity window that starts when the control ends.
Decision (proposed): adapt - keep the halving ladder, the one-second floor, the 75 percent health gate (mez only, as in the donor) and the window-after-end rule for the Frankendom CC ladder; key the ladder on the target alone (Frankendom ruling) instead of on the CC kind, and let the NPC window follow the configured timer (the donor fixes it at 60 s).
Acceptance: A server test lands an 8 s stun on an NPC and then reapplies at 4 s, 2 s, 1.33 s and 1.0 s durations (the sketch's count rule), refuses the next at 0.8 s, and refuses any stun or mez on a player for the window that starts when their 10 s stun ends (60 s with the adaptive factor of 6).

## 1. Mechanism

Crowd control (stun and mez are read; the same pattern is used for other CC kinds, not read) is an ECS effect with two parts: the effect itself, and an immunity effect that holds the window and, for NPCs, the reapplication ladder.

- Start (`CrowdControlECSEffect.cs`, `OnHardCCStart` 24-33). The target's current spellcast is stopped (26), turning is disabled, NPC movement stops, and max speed is resent. For an NPC target, if no NPC immunity of that kind exists yet, one is created with the configured immunity duration (stun 79-80; mez 115-116). That object carries the NPC ladder.
- Window length (`AbstractCrowdControlECSEffect` constructor, 11-22). Adaptive mode: `min(60000, duration x 6)` ms (14-16). Flat mode: `60 s` (20). Defaults in ServerProperties.cs: adaptive off (2476-2477), flat 60 (2479-2480), adaptive multiplier 6 (2482-2483).
- Player window (`TryApplyImmunity`, ECSGameSpellEffect.cs 66-80). Called from EffectListComponent.cs 934-936 only when a CC is removed (`stop`) and not being replaced. The window therefore starts when the CC ends. It creates an immunity effect of the matching type, lasting the immunity duration (79). A summoned pet's stun and an unresistable stun create no window (69-76).
- Player check (`CheckSpellResist`, CCSpellHandler.cs 157-199 for mez, 272-310 for stun). Immune if the target holds the matching immunity effect (mez test at 162, stun test at 276) or is already in that state (167, 281). The stun test skips the immunity effect for `UnresistableStunSpellHandler`, and both tests also pass on the target's innate ability `MezzImmunity` / `StunImmunity` (162, 276). The immunity effect types are separate per CC kind: MezImmunity, StunImmunity, SnareImmunity, NearsightImmunity (EffectHelper.cs 280-288). A stun does not block a mez.
- NPC ladder check (CCSpellHandler.cs 169 for mez, 283 for stun). If the NPC immunity exists, the new CC is refused when `!CanApplyNewEffect(newDuration)`. `CanApplyNewEffect(d)` is true when `CalculateNewEffectDuration(d) >= 1000` (ECSImmunityEffect.cs 43). `CalculateNewEffectDuration(d)` is `d / (2 x count)` on a long (46-51; the division truncates). `count` starts at 1 (30) and goes up by one on each applied CC (`OnDurationEffectApply` at CCSpellHandler.cs 206 and 316 calls `OnApplyNewEffect`, which runs `_count++` at line 55). Traced order: the stun effect and its NPC immunity effect are both queued (EffectListComponent.cs 509-535, `_pendingEffects.Enqueue`), so on the first application the ladder does not exist yet when `OnDurationEffectApply` looks for it and the count is not bumped; the ladder appears when the queue runs `OnStartEffect` (CrowdControlECSEffect.cs 79-80) with count 1. Later applications bump it. Two casts landing in the same service tick could differ; not traced.
- Duration handed to the effect. The base duration is scaled by the target's mez or stun duration reduction (percent, times 0.01; CCSpellHandler.cs 212 and 322). If the NPC ladder exists, the result is then divided by `2 x count` (215, 325). The final value is clamped to `[1, spell duration x 4]` (217, 327).
- NPC health gate (CCSpellHandler.cs 174, in the MEZ handler only). A GameNPC below 75 percent health resists a mez outright. The stun handler (272-309) has no health gate.
- NPC window length. `NpcImmunityEffect` sets `Duration = 60000` in its constructor (ECSImmunityEffect.cs 35), after the base constructor copies `initParams.Duration` (ECSGameEffect.cs 81). The configured immunity timer therefore never reaches the NPC window.
- Interrupt on resist. A refused CC starts the target's interrupt timer (CCSpellHandler.cs 193 for mez, 289 for stun) and tells the caster it is immune (the stun message literal is at 288; the mez message is built at 173 and sent through the same block).

Ladder arithmetic for a base duration of 8000 ms (the sketch's count rule, count starts at 1 at the first application):

| application | count before | duration | result |
|---|---|---|---|
| 1st | none yet (ladder created) | 8000 | lands |
| 2nd | 1 | 8000 / 2 = 4000 | lands, count to 2 |
| 3rd | 2 | 8000 / 4 = 2000 | lands, count to 3 |
| 4th | 3 | 8000 / 6 = 1333 | lands, count to 4 |
| 5th | 4 | 8000 / 8 = 1000 | lands, count to 5 |
| 6th | 5 | 8000 / 10 = 800 | refused (under 1000) |

In general, with base B, the n-th reapplication lands when B / (2n) is at least 1000 ms, which is n up to B / 2000.

## 2. Key functions

- `AbstractCrowdControlECSEffect` constructor (immunity duration): `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Effects/CrowdControlECSEffect.cs` 11-22. `OnHardCCStart` / `OnHardCCStop` 24-49. `StunECSGameEffect` 62-96. `MezECSGameEffect` 101-132.
- `TryApplyImmunity`: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Effects/ECSGameSpellEffect.cs` 66-80.
- Call site on removal: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Components/EffectListComponent.cs` 934-936.
- NPC ladder: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/ECS-Effects/ECSImmunityEffect.cs` 28-74 (`NpcImmunityEffect`, `CanApplyNewEffect`, `CalculateNewEffectDuration`, `OnApplyNewEffect`).
- Mez and stun resist and duration: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/spells/CCSpellHandler.cs` 157-217 (mez), 272-327 (stun).
- Immunity types: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameutils/EffectHelper.cs` 275-305.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Reapplication halves: duration / (2 x count), refuse below a floor | Floor 1000 ms (ECSImmunityEffect.cs 43); divisor factor 2 (49) |
| Window starts when the control ends, length = duration x factor, capped | Factor 6 and cap 60000 ms (CrowdControlECSEffect.cs 14-16; ServerProperties.cs 2482) |
| Flat window | 60 s (CrowdControlECSEffect.cs 20; ServerProperties.cs 2479) |
| Health gate on NPC targets, mez only | 75 percent (CCSpellHandler.cs 174) |
| Target duration reduction as a percent | Mez and stun reduction properties x 0.01 (CCSpellHandler.cs 212, 322) |
| Clamp to a minimum of 1 and a maximum of four times the spell duration | 4 (CCSpellHandler.cs 217, 327) |

Mechanism table (MG focus). Units are milliseconds.

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| NPC CC reapplication | later CC on an NPC is shorter | d / (2 x count); refused when under 1000 | count 1 up to B/2000 | none | window 60 s (NPC constructor) | minimum 1 ms; max 4 x spell duration | ECSImmunityEffect.cs 35, 43-55; CCSpellHandler.cs 169, 215-217 |
| Player CC window | no further CC of that kind | adaptive min(60000, dur x 6); flat 60000 | 60000 cap; factor 6 | none | window starts at CC end | 60 s | CrowdControlECSEffect.cs 14-20; ECSGameSpellEffect.cs 66-80; EffectListComponent.cs 934-936 |
| NPC health gate (mez only) | mez resisted | NPC health below 75 percent | 75 percent | none | none | none | CCSpellHandler.cs 174 |
| Duration reduction | shorter CC on tough targets | base x reduction percent x 0.01 | percent property (not read) | none | none | clamp min 1 | CCSpellHandler.cs 212, 217, 322, 327 |
| CC stops casting | target casting cancelled | stop cast, freeze turning, stop NPC movement | none | none | none | none | CrowdControlECSEffect.cs 24-33 |
| Pet stun exemption | summoned pet stun gives no window | caster is summoned pet | none | none | none | none | CrowdControlECSEffect.cs 67-68; ECSGameSpellEffect.cs 73 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's halving ladder (base / (2 x count), refused under 1 s), the 75 percent health gate (mez only), and the player window that starts when the control ends (adaptive or flat). It adapts two things: one ladder per target (the donor keeps one per CC kind), and the NPC window uses the flat setting (the donor fixes it at 60 s). It starts the NPC ladder at the first application (the donor starts it when the queued effect starts) with count 1 for the first reapplication (traced: no bump on the first application). It adds the donor's 'already in that state' refusal for players. It omits the duration-reduction property, the pet and unresistable exceptions, the immunity effect objects and their pulse, the start effects (cast stop, turning, movement), the interrupt timer on resist, and the ceremonial-item intercepts.

```ts
// Donor licence: GPL (OpenDAoC LICENSE is GPL-3.0; source header gplheader.txt is GPL-2.0-or-later). Clean-room sketch from the described mechanism, not a translation of the donor lines.
// Adapted: the donor keys immunity on (target, CC kind); this sketch keys one ladder on the target alone (Frankendom ruling: one CC ladder).

interface Ladder { count: number; expiresAt: number; }     // NPC diminishing-returns window, per target
interface PlayerWindow { expiresAt: number; }              // player immunity window, started when a CC ends

const NPC_MIN_MS = 1000;        // a reapplication shorter than this is refused
const NPC_HP_GATE = 0.75;       // NPCs below this health share resist CC outright
const FLAT_WINDOW_MS = 60000;   // flat immunity window, used for NPC ladders and when adaptive is off
const ADAPTIVE_FACTOR = 6;      // adaptive player window = CC duration x factor
const ADAPTIVE_CAP_MS = 60000;  // adaptive window cap

type ApplyResult = { ok: true; durationMs: number } | { ok: false; reason: 'immune' | 'hp-gate' };

function playerWindowMs(durationMs: number, adaptive: boolean): number {
  return adaptive ? Math.min(ADAPTIVE_CAP_MS, durationMs * ADAPTIVE_FACTOR) : FLAT_WINDOW_MS;
}

// NPC: reapplication duration = base / (2 x count), refused when under 1 s. Each applied CC bumps count.
// Simplified: the window starts at the first application here; the donor starts it at CC start.
function applyToNpc(l: Ladder | null, baseMs: number, hpShare: number, now: number, kind: 'stun' | 'mez'): { res: ApplyResult; next: Ladder | null } {
  if (kind === 'mez' && hpShare < NPC_HP_GATE) return { res: { ok: false, reason: 'hp-gate' }, next: l };
  if (l === null || now >= l.expiresAt) {
    return { res: { ok: true, durationMs: baseMs }, next: { count: 1, expiresAt: now + FLAT_WINDOW_MS } };
  }
  const dur = Math.floor(baseMs / (2 * l.count));
  if (dur < NPC_MIN_MS) return { res: { ok: false, reason: 'immune' }, next: l };
  return { res: { ok: true, durationMs: dur }, next: { count: l.count + 1, expiresAt: l.expiresAt } };
}

// Player: refused while the immunity window runs. Otherwise the CC lands at full duration (no halving).
function applyToPlayer(w: PlayerWindow | null, baseMs: number, now: number, alreadyInState: boolean): { res: ApplyResult; next: PlayerWindow | null } {
  if (alreadyInState || (w !== null && now < w.expiresAt)) return { res: { ok: false, reason: 'immune' }, next: w };
  return { res: { ok: true, durationMs: baseMs }, next: null };
}

// Player: the window starts when the CC ends (donor calls TryApplyImmunity on effect removal, not on landing).
function onPlayerCcEnd(baseMs: number, adaptive: boolean, now: number): PlayerWindow {
  return { expiresAt: now + playerWindowMs(baseMs, adaptive) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/mg003-opendaoc-cc-ladder.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/cc.ts` (new engine step: one crowd-control ladder keyed by target, with the NPC halving and the player window that starts at CC end). Parity-checklist row 13 (specials); the ruling source is the Proof 3 CC ladder.
- Reuse tag: rewrite-from-idea (GPL-3.0 repo, GPL-2.0-or-later headers; clean-room only, no line-by-line translation)
- Brief rule served: 1 (one engine: the ladder and the windows live in src/fight, not in the Pit or zone client).

## 6. Gaps and risks

- GPL copyleft: clean-room only. The sketch is written from the mechanism.
- Donor defects, each kept as an idea and fixed in the sketch:
  - The NPC window is fixed at 60 s by a constructor override (ECSImmunityEffect.cs 35, after ECSGameEffect.cs 81 copies the configured duration). The configured immunity timer (ServerProperties.cs 2480, 2483) therefore does not reach NPC windows. Fix: the sketch lets the NPC window follow the configured setting. Whether the 60 s was intended is not stated in the code (decide with the owner).
  - Per-kind immunity means a stun does not reduce the mez ladder (EffectHelper.cs 280-283). This conflicts with the Frankendom one-ladder ruling. Fix: one ladder per target (sketch).
  - The halving divides on a long, so each step floors (ECSImmunityEffect.cs 49). The donor comment at line 41 states the equivalent threshold `_count < duration / 2000 + 1`; that holds for integers, so this is a checked point, not a defect.
  - The first application's count bump is now traced (queued effects, no bump on the first application, section 1). The sketch's count rule is explicit so that a test can check it; only same-tick double casts remain untraced.
- Frankendom rulings:
  - Server-verified: the donor's checks run in the spell handler (server side, as far as read). The 75 percent health gate and the ladder are engine state; the Pit and zones show the result but do not decide it.
  - One ladder across all CC (Proof 3): the sketch keys on target. A mez landing after a stun shares the same halving. The mez-only health gate stays mez-only so a stun on a wounded NPC still lands, as in the donor.
  - MAX_ATTACKERS = 3: three attackers on one NPC share one ladder, so each extra CC from a crowd shortens the next. This is a designed effect of the rule; the playtest should confirm it reads fairly.
  - Stop casting and freeze turning are engine state, not client effects.
- Fast-fight numbers: an 8 s stun is long for a fast duel, and at factor 6 a 10 s stun on a player gives 60 s of immunity, which is long for a mobile fight. For duels the adaptive factor is a playtest number (for example 2 or 3), not a donor fact.
- Not covered: the caster side of CC (which spells apply it), the concentration list, and the charm/pet conversion path (CharmECSEffect.cs 53 reads immunity; not traced). Those need a separate cell.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) The 75 percent NPC health gate is presented as part of the general CC rule (mechanism table, Numbers table, Decision 'keep ... the 75 percent health gate', sketch NPC_HP_GATE applied to every NPC CC). Real: it exists only in the MEZ handler (CCSpellHandler.cs:174). StunSpellHandler.CheckSpellResist (272-309) has no health gate (grep HealthPercent in the file gives only line 174). The note's own Acceptance uses a stun, so a stun test at full HP passes, but a donor-faithful stun on an NPC under 75% would land while the sketch refuses. 2) Stun immunity check skips UnresistableStunSpellHandler (276) and HasAbility(StunImmunity/MezzImmunity) (162, 276); not mentioned. 3) Count start: note flags it medium confidence, correct to do so. Real flow: OnDurationEffectApply creates the effect (SpellHandler.cs 2167) and then calls OnApplyNewEffect only if the NPC immunity already exists; ECSGameEffectFactory.Create calls effect.Start() and OnStartEffect creates the ladder (CrowdControlECSEffect.cs 79-80), so whether the first application bumps count depends on whether Start() is synchronous (not traced by the reader or me). The Acceptance (4 s, 2 s, 1.33 s, 1.0 s, refuse 0.8 s) bakes in count=1 after the first landing; this is the note's own rule, but unconfirmed against the donor. Verified OK: ECSImmunityEffect.cs 30, 35 (Duration=60000), 43, 46-51, 53-56; CrowdControlECSEffect.cs 14-20, 24-33, 79-80, 115-116, 67-68; ServerProperties 2476-2483 defaults (false/60/6); TryApplyImmunity ECSGameSpellEffect.cs 66-80; EffectListComponent.cs 934-936; CCSpellHandler clamp 217/327, reduction 212/322, ladder 215/325, immune types EffectHelper.cs 280-288; ECSGameEffect.cs:81 Duration copy; licence lines.
Missed: Mez-only health gate (see error 1). Also the donor refuses a player CC when already in that state (167, 281), which the sketch omits (it only checks the window).

Fixed 2026-10-12 (Sonnet fixer): the 75 percent health gate is now mez only (donor 174; stun has none) in the mechanism, tables, decision and sketch (`kind` parameter); the innate immunity abilities and the unresistable-stun skip noted; the player 'already in that state' check added to the sketch; the count start verified (effects are queued, so no bump on the first application, which supports the 8000/4000/2000/1333/1000/refuse 800 acceptance); sketch typechecked on the VPS. Not verified: same-tick double casts.
