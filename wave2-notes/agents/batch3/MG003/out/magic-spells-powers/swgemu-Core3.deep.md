# swgemu-Core3 (magic-spells-powers, cell 22)

Donor: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/commands/JediQueueCommand.h` (with ForcePowersQueueCommand.h, JediMindTrickCommand.h, player/PlayerObjectImplementation.cpp, player/events/ForceRegenerationEvent.h, bin/scripts/commands/force*.lua) | Licence: GNU AGPL-3.0 per the repo COPYING file (read: "GNU AFFERO GENERAL PUBLIC LICENSE, Version 3"); the Lua data files carry a GNU LGPL (version 2 or later) header; src files say "See file COPYING". Both copyleft: clean-room, shape only | C++ with Lua data | symbol `doJediSelfBuffCommand`

Checked: Read in full: JediQueueCommand.h 66-300 (self-buff toggle, checks, buff creation, council cost and buff modifiers, charge); ForcePowersQueueCommand.h (whole, 129 lines); JediMindTrickCommand.h (whole, 112 lines); ForceRegenerationEvent.h (whole, 62 lines); PlayerObjectImplementation.cpp 2504-2545 (regen activation) and 2755-2809 (setForcePower, doForceRegen); BuffDurationEvent.h line 22; Lua data forceArmor1, forceArmor2, forceAbsorb1, forceRun1, forceSpeed2, forceChoke, forceIntimidate1, forceLightningSingle1 (only receipted numbers are quoted). Not read: the body of `CombatManager::doCombatAction`; `JediMindTrickRemovalTask`; `forceMeditate` task body; the Engine3 `Task` base class (not in this donor, so `isScheduled()` during `run()` is unknown); Buff.idl beyond the constructor; QueueCommand.cpp cooldown path beyond checkCooldown (340-395); all callers of `doJediSelfBuffCommand`. Callers of `activateForcePowerRegen` seen by grep only: CreatureObjectImplementation.cpp 1298, PlayerIncapacitationRecoverTask.h 80, PlayerObjectImplementation.cpp 1816, 2742, 2769. Confidence: high on the cost, toggle and charge-order logic and on the regen arithmetic; medium on the regen re-arm loop (it depends on the unread Task semantics). camera_scope: not a camera cell.

Best transferable idea: Charge a power's resource only after its effect is accepted, make a self buff a toggle that costs nothing to switch off, and regenerate the pool on a timer that re-arms only while it is below max and runs three times faster while meditating.
Decision (proposed): adapt - take the charge-after-accept, free-toggle and meditation-regen shape for a focus pool that feeds row 13 specials; drop the light/dark council cost table, and fix the donor's negative-rounding and unclamped haste.
Acceptance: A server test: a focus special refused at 0 focus costs nothing; activating an active self buff a second time costs nothing and removes it; a meditating player gains 15 focus every 5 s at regen 10 (3 per second) and stops at max, while a standing player gains 5 every 5 s at regen 10.

## 1. Mechanism

Force powers are server commands charged against one pool, the Force Power value on the player object (max from `getForcePowerMax`). Three families use it.

- Self buffs (`doJediSelfBuffCommand`, JediQueueCommand.h 75-...). Order:
  1. If the buff is already active: remove it and return success. No charge (77-78).
  2. Common checks (`doCommonJediSelfChecks`, 127-143): armour refuses (133-134); any blocking buff refuses (137-138); the pool must hold at least the modified cost (142; check at 119-120).
  3. Build the buff (`createJediSelfBuff`, 146-...): first remove any overrideable buffs (148), then set the buff type, speed multiplier if speedMod > 0, and skill mods scaled by the council buff modifier (`getFrsModifiedBuffValue`, 197-225).
  4. Add the buff (101), then charge the modified cost (`doForceCost` 104; the subtraction is at 291), then play the client effect.
- Ranged force powers (`ForcePowersQueueCommand::doCombatAction`, ForcePowersQueueCommand.h 26-82). Checks come first: target, prone, distance, line of sight, player-entry rule. The pool check is at 51. Then the combat action runs (59). A result of -1 returns invalid target and -3 returns general error, both with no charge. Any other result charges the modified cost (69), raises visibility, and returns success. If the action throws, the charge is skipped.
- Mind trick (`JediMindTrickCommand::doQueueCommand`, JediMindTrickCommand.h 19-108). The target must be an AI agent that is a pet, not a droid or vehicle, with a linked owner (41-53). It then calls the shared force path (`doCombatAction`, 60), so the pool is charged before the roll. The roll is `failCalc = targetLevel - playerLevel + random(100)` (65); success when it is under 75 (69). On success the pet flag is removed, the agent is marked mind-tricked (80), the owner link is cleared, the faction is set to the template faction in on-leave state, and peace is forced (92). A removal timer of 10 + random(25) seconds (94) returns it (task not read). Failure sends a message only.

Cost and duration rules:
- Council cost (`getFrsModifiedForceCost`, JediQueueCommand.h 228-256). Base cost, plus `(int)((manipulationMod * frsModifier) + .5)` if a light or dark council modifier and a manipulation skill mod are both non-zero (255). Otherwise the base cost.
- Council buff value (`getFrsModifiedBuffValue`, 197-225). Base value, plus `(int)((controlModifier * buffModifier) + 0.5f)` on the same pattern (224). Otherwise the base value.
- Command duration (`getCommandDuration`, ForcePowersQueueCommand.h 114-121). If combat haste > 0: speed x (1 - haste/100) (117-118). No clamp.
- Buff duration: seconds. `BuffDurationEvent` schedules `buffDuration * 1000` ms (BuffDurationEvent.h 22).

Regeneration (`activateForcePowerRegen` 2504; `doForceRegen` 2785; `ForceRegenerationEvent::run` ForceRegenerationEvent.h 24-51):
- Activation. If the `jedi_force_power_regen` skill mod is 0, there is no regen (2512). Otherwise regen = that mod, plus (control + manipulation) / 10 for the rank (2530), then an optional multiplier and divisor (2532-2539). Timer = regen / 5 (2541). Interval = 10 / timer seconds = 50 / regen seconds (2543). The event is scheduled only if it is not already scheduled (2519).
- Tick (`doForceRegen`). 5 points (2791). x3 while meditating (2795-2799). If the tick would overshoot max, set to max (2804-2805). Otherwise add the tick (2807). Net rate: 5 x modifier every 50/regen s, which is regen/10 points per second (derived, not quoted).
- Re-arm. `setForcePower` calls `activateForcePowerRegen` whenever the new value is below max (2768). `doForceRegen` writes through `setForcePower`, so a tick re-arms the next one while below max. Whether `isScheduled()` is still true during the event's own `run()` is in the unread Task base class.

## 2. Key functions

- `doJediSelfBuffCommand`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/commands/JediQueueCommand.h` 75-93 (toggle, checks, buff).
- `doJediForceCostCheck`: same file, 115-124.
- `doCommonJediSelfChecks`: same file, 127-143.
- `createJediSelfBuff`: same file, 146-...
- `getFrsModifiedBuffValue` and `getFrsModifiedForceCost`: same file, 197-225 and 228-256.
- `doForceCost`: same file, 288-293.
- `ForcePowersQueueCommand::doCombatAction`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/commands/ForcePowersQueueCommand.h` 26-82; `getCommandDuration` 114-121.
- `JediMindTrickCommand::doQueueCommand`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/creature/commands/JediMindTrickCommand.h` 19-108.
- `activateForcePowerRegen`, `setForcePower`, `doForceRegen`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/player/PlayerObjectImplementation.cpp` 2504-2545, 2755-2809.
- `ForceRegenerationEvent::run`: `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/src/server/zone/objects/player/events/ForceRegenerationEvent.h` 24-51.
- Command data (per command, Lua): `/mnt/frankendom-donors/swgemu-Core3/MMOCoreORB/bin/scripts/commands/force*.lua`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Charge after the effect is accepted; refuse before if short | Refusals -1 and -3 charge nothing (ForcePowersQueueCommand.h 61-66) |
| Self-buff toggle: second use removes the buff and costs nothing | None (JediQueueCommand.h 77-78) |
| Blocking list refuses; overrideable list is removed first | Lists are per-command data (not read) |
| Pool regen: fixed tick, x3 while meditating, capped at max | Tick 5 (2791); meditation x3 (2799) |
| Regen interval from a rate: 50 / regen seconds | Constant 50 (derived from 10 / (regen / 5)) |
| Council-scaled cost and buff value | Modifiers per command in Lua (e.g. forceArmor2.lua 52, extra cost -0.003, not the main cost path) |
| Level-gap success roll with a fixed threshold | Threshold 75 (JMT 69); span 100 (JMT 65) |
| Timed convert with automatic return | Base 10 s, span 25 s (JMT 94) |

Mechanism table (MG focus). Pool max is not read; costs are the only numbers the donor gives for the pool.

| name | effect | formula | number ranges | cost | cooldown / cast time | caps | file:line |
|---|---|---|---|---|---|---|---|
| Pool regen | focus refills | tick 5, x3 meditating, every 50/regen s; regen = skill + (control+manip)/10 | regen 0 = none; tick 5 or 15 | none | interval 50/regen s | capped at pool max | PlayerObjectImplementation.cpp 2504-2545, 2791-2807 |
| Self-buff toggle | buff on or off | off: free; on: add buff, then charge council-modified cost | cost 50-300 (Lua); duration seconds | pool | duration x 1000 ms | blocked by blocking buffs; armour refuses; overrideable buffs removed first | JediQueueCommand.h 75-104, 127-143, 146-148; BuffDurationEvent.h 22 |
| Ranged power | damage or control action | pool check before; charge after accepted action | cost 75-400 (Lua) | pool | command duration = speed x (1 - haste/100) | haste unclamped | ForcePowersQueueCommand.h 26-82, 114-118 |
| Council cost | cost changes by council | base + round(manip x councilMod) | base from Lua | pool | none | zero mod = base | JediQueueCommand.h 228-256 |
| Council buff value | buff strength changes by council | base + round(control x buffMod) | per command | none | none | zero mod = base | JediQueueCommand.h 197-225 |
| Mind trick | a player-owned pet switches to peace and returns later | roll: targetLvl - playerLvl + rand(100) < 75 | threshold 75; span 100; 10 + rand(25) s | pool, charged before the roll | 10 to 34 s if rand(25) gives 0-24 (not read) | pets only; not droids or vehicles | JediMindTrickCommand.h 41, 60, 65, 69, 80, 92, 94 |

Lua command data quoted (receipted lines only): forceArmor2 cost 150, duration 1800 s (forceArmor2.lua 46-47); forceArmor1 cost 75 (46); forceAbsorb1 cost 50 (46); forceRun1 cost 200 (46); forceSpeed2 cost 300 (46); forceIntimidate1 cost 300 (49); forceLightningSingle1 cost 75 (50); forceChoke cost 400 (50). The other force*.lua files give further costs and durations (not receipted).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: free toggle-off; armour and blocking refusals; pool check; buff added, then charged; ranged power checked before the action and charged only when the action is accepted; regen tick capped at max, x3 while meditating. Fixes: the haste duration is clamped at zero (donor has no clamp) and the council-scaled cost uses Math.round, not (int)(x + 0.5), which truncates toward zero for negative values. It omits the council light and dark tables, the speed multiplier and skill mods on the buff, the overrideable-buff removal, client effects, visibility, the mind trick, the regen rank inputs and multipliers, the regen event timer (the sketch returns a time, the engine owns the timer), and the donor's exception path.

```ts
// Donor licence: AGPL-3.0 (swgemu-Core3 COPYING); Lua data headers are LGPL. Clean-room sketch from the described mechanism, not a translation of the donor lines.
interface Pool { value: number; max: number; }
interface PowerDef { cost: number; durationS: number; }
interface Actor { pool: Pool; buffs: Set<string>; meditating: boolean; alive: boolean; }

type UseResult =
  | { ok: true; charged: number }
  | { ok: false; reason: 'armour' | 'blocked' | 'no-power' | 'invalid' };

const TICK = 5;      // points per regen tick
const MED_MULT = 3;  // tick multiplier while meditating

// Seconds between regen ticks for a given regen rate (donor: timer = regen / 5, interval = 10 / timer).
// A rate of 0 means no regen at all.
function regenIntervalS(regen: number): number {
  return regen > 0 ? 50 / regen : Infinity;
}

// One regen tick. Caps at max instead of overshooting.
function regenTick(a: Actor): void {
  if (!a.alive || a.pool.value >= a.pool.max) return;
  const tick = TICK * (a.meditating ? MED_MULT : 1);
  a.pool.value = Math.min(a.pool.max, a.pool.value + tick);
}

// Regen re-arms only while below max, so the engine owns the timer.
function needsRegenTimer(a: Actor): boolean {
  return a.alive && a.pool.value < a.pool.max;
}

// Self buff. Toggling off is free. Otherwise: armour and blocking buffs refuse, the pool must cover the cost,
// then the buff is applied and the cost is charged (donor order: add buff, then charge).
function useSelfBuff(a: Actor, buff: string, def: PowerDef, blocks: string[], armour: boolean): UseResult {
  if (a.buffs.has(buff)) {
    a.buffs.delete(buff);
    return { ok: true, charged: 0 };
  }
  if (armour) return { ok: false, reason: 'armour' };
  if (blocks.some((b) => a.buffs.has(b))) return { ok: false, reason: 'blocked' };
  if (a.pool.value < def.cost) return { ok: false, reason: 'no-power' };
  a.buffs.add(buff);
  a.pool.value -= def.cost;
  return { ok: true, charged: def.cost };
}

// Ranged power. Refused before the action when the pool is short. Charged after the action is accepted.
// A refusal from the action (invalid target, general error) charges nothing.
function useRanged(a: Actor, def: PowerDef, action: () => 'done' | 'invalid' | 'error'): UseResult {
  if (a.pool.value < def.cost) return { ok: false, reason: 'no-power' };
  const res = action();
  if (res === 'invalid') return { ok: false, reason: 'invalid' };
  if (res === 'error') return { ok: false, reason: 'invalid' };
  a.pool.value -= def.cost;
  return { ok: true, charged: def.cost };
}

// Command duration with combat haste. Fixed: clamped at zero (donor has no clamp, so haste of 100 or more gives zero or a negative time).
function commandDurationS(speed: number, hastePct: number): number {
  if (hastePct <= 0) return speed;
  return Math.max(0, speed * (1 - hastePct / 100));
}

// Modified cost with a council modifier. Fixed: Math.round, not (int)(x + 0.5), which truncates toward zero for negatives.
function modifiedCost(base: number, manipulationSkill: number, councilMod: number): number {
  if (manipulationSkill === 0 || councilMod === 0) return base;
  return base + Math.round(manipulationSkill * councilMod);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/mg003-swg-force-pool.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/powers.ts` (new engine step: focus pool, power charge, self-buff toggles, pool regen). Parity-checklist row 13 (specials).
- Reuse tag: rewrite-from-idea (AGPL-3.0 and LGPL-2.0+ data; clean-room only, no line-by-line translation)
- Brief rule served: 1 (one engine: the pool and every charge live in src/fight, not in the client). The pets-only mind trick is the consent rule to carry into section (d); it is noted, not built here.

## 6. Gaps and risks

- Copyleft: clean-room only. The sketch is written from the mechanism.
- Donor defects, each kept as an idea and fixed in the sketch:
  - Combat haste has no clamp (ForcePowersQueueCommand.h 117-118): haste of 100 or more gives a zero or negative duration. Fix: clamp at zero (sketch).
  - Council modifiers use `(int)((x) + .5)` (JediQueueCommand.h 255) and `(int)(x + 0.5f)` (224). For negative values this truncates toward zero, so -2.4 becomes -1. Only matters if a modifier can go negative (not verified). Fix: Math.round (sketch).
  - The regen loop depends on the unread Task base class: whether `isScheduled()` is true while the event runs decides whether the chain continues. Fix: the engine owns the timer and states the re-arm rule, tested by a server test (Acceptance).
  - The mind trick variable `failCalc` holds the success test (65-69). A readability issue only; no change to the rule.
- Frankendom rulings:
  - One ledger: the pool is server state. The client may draw the focus bar but must not charge it.
  - Server-verified: the donor's refusal codes (-1, -3) come from the combat manager. Frankendom's equivalent is the engine's target-validity check, which runs before any charge.
  - MAX_ATTACKERS = 3: nothing in the power code limits attackers (not read). A ranged power that hits several targets would charge once, which the engine must state.
  - Pit as client: meditation state and the regen tick must be engine state. A client timer would let the pool drift.
  - Consent: the donor lets a mind trick convert only player-owned pets. Keep that rule for the Proof 3 crowd-control ladder; do not let a converted pet be used against its owner in a duel without a rule.
- Fast-fight numbers: a 5 s tick at regen 10 (1 point per second) is slow for a mobile duel, so a focus special would wait a long time. The donor's regen is set per character through skill mods, so the tick rate is a catalogue value, not a constant. For a fast duel, set the regen so the tick interval is about 1 s (regen 50). Costs of 75-400 only make sense against a pool max that the donor does not give (not read).
- Spell and power data are Lua per command (bin/scripts/commands). Frankendom must author cost and duration per power in the catalogue (row 21), not read a script.
- Not covered: the damage side of the ranged powers and the combat manager. Those need a separate cell.
