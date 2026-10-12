# l1j-en-classic (vfx-blood-finishers, cell 1)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Bleed.java` | Licence: GPL-2.0 (repo `COPYING` is the version 2 text; the header on `serverpackets/S_EffectLocation.java` reads "either version 2, or (at your option) any later version"; `L1Bleed.java` has no header) | Java | symbol `L1Bleed.begin`

Checked: read `L1Bleed.java` in full (98 lines: begin 50-72, stop 74-80, attack 82-97, run 30-48). Call site read at `skill/L1SkillUse.java` 2131-2133 with the surrounding loop context (2085-2095, 1606-1630). Timer storage read at `L1Character.java` 393-402. Receive path read only as far as the self-attacker branch of `Instance/L1PcInstance.java` 2253-2262. Not read: the movement hindrance the start message describes; the kill-credit and aggro code inside `receiveDamage`; how the skill loop chooses targets for a multi-target skill; `L1SkillTimer*` (not needed, the wound uses the zero-time path). The hint file (`S_EffectLocation.java`) was opened: it is a packet writer for x, y and a gfx id, with no blood logic, so it is not the mechanism. Confidence: high on the wound roll, tick, floor and stop; medium on the call-site target semantics. This is a status-effect cell, not a camera cell, so no `camera_scope`.

Best transferable idea: a landed hit starts a wound whose length is rolled once from a weighted table, ticks on the server clock, never stacks, and cannot take the victim below 1 HP.
Decision (proposed): adapt — the wound-as-status idea fits row 8 and gives a readable "bleeding" state in a duel; the donor's thread-pool ticks, self-credited damage and single-target cast are defects that the port must fix.
Acceptance: in a duel a landed wound hit shows a Bleeding icon on the victim; HP drops by the fixed tick damage once per second for 1, 4, 6 or 8 seconds (rolled 80/130/125/65 of 400), a hit during a bleed does not extend it, and a server test asserts that a bleed tick never takes HP below 1 and never runs outside the server tick.

## 1. Mechanism

- A landed hit of skill 20090 starts a wound (call site `L1SkillUse.java` 2131-2133). `begin()` first returns if the target already has the BLEEDING marker (`L1Bleed.java` 51-52): no stacking and no refresh.
- Duration is rolled once, at application: `nextInt(400)` gives 0-399 (55). Roll >= 335 gives 8 ticks, >= 210 gives 6, >= 80 gives 4, otherwise 1 (56-64). Default is 1 (56).
- A start message goes to the victim (67). `run()` is scheduled on `GeneralThreadPool` with delay 0 and period 1000 ms (69). Then the BLEEDING marker is set with time 0 (71), which stores a map entry with a null timer, so the marker lasts until it is removed (`L1Character.java` 395-399).
- Each `run()` (30-48): if the target is null or dead, stop (32-35). Otherwise `attack()` (37), then the tick counter goes up (38), and when it reaches the rolled duration the victim gets "Your wound has healed!" and the wound stops (40-44).
- `attack()` (82-97): damage is 5 (83). If HP - 5 <= 0 and HP is not 1, damage becomes HP - 1 (85-86). If HP is 1, damage is 0 (87-88). So a wound never takes the victim below 1 HP. The victim gets the hit-react animation (93-94), then `receiveDamage(_pc, damage, false)` (95).
- `stop()` (74-80): clears the marker (75) and cancels the scheduled future (78).
- Order of effects: the first tick is due at once (delay 0), so a 1-second wound does exactly one 5-point tick on the spot. An N-tick wound does N ticks, because the counter reaches N on the Nth run. Total damage is 5 x N, capped by the floor. Expected duration over the roll is 4.675 ticks.

## 2. Key functions

- `L1Bleed.begin`: `L1Bleed.java` 50-72. Guard (51), roll and buckets (55-64), start message (67), schedule (69), marker (71).
- `L1Bleed.run`: `L1Bleed.java` 30-48. Dead or null stop (32), tick (37), counter and end (38-44).
- `L1Bleed.attack`: `L1Bleed.java` 82-97. Damage 5 and the 1-HP floor (83-89), animation (93-94), damage call (95). Only player targets take damage (91, the `instanceof` check).
- `L1Bleed.stop`: `L1Bleed.java` 74-80.
- Call site: `skill/L1SkillUse.java` 2131-2133.
- Marker storage: `L1Character.java` 393-402 (`addSkillEffect` 393-400, `setSkillEffect` from 402).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One weighted roll per application picks the wound length from a table | Roll range 0-399 (`L1Bleed.java` 55). Buckets: roll 335-399 = 8 ticks (65 of 400 = 16.25%); 210-334 = 6 ticks (125 of 400 = 31.25%); 80-209 = 4 ticks (130 of 400 = 32.5%); 0-79 = 1 tick (80 of 400 = 20%) (58-64, default 56) |
| Each tick does a fixed amount, but never takes the victim below a floor | Tick damage 5 (`L1Bleed.java` 83); floor 1 HP (85-88) |
| A periodic tick, one per second, first tick immediate | Period 1000 ms (69); first tick delay 0 (69) |
| No stacking while a wound is active | Guard on the BLEEDING marker (51) |
| Wound ends when the tick count is reached | Counter against the rolled duration (40) |

Label defects in the donor's own comments: line 59 says 16% (the true share is 16.25%, close); line 61 says 32% (31.25%); line 63 says "31% chance for 2 second" for a value of 4 seconds (both the share and the length are wrong: the share is 32.5% and the length is 4 s). The 20% share of the 1-second default is not labelled anywhere.

Defects in the donor code, with the fix for each. The idea is kept; the defect is fixed in the sketch or in the port:

1. Self-attribution. `pc.receiveDamage(_pc, ...)` (95) passes the wounded character as the attacker, because `_pc` is the first constructor argument, which is the victim (2132). `receiveDamage` skips the perceive call when the attacker is the target itself (`L1PcInstance.java` 2261). So the wound is credited to the victim, and nothing is credited to the caster. Fix: pass the caster as the attacker (a third constructor argument). What kill credit does with the attacker is (not read).
2. NPC targets crash the cast. `new L1Bleed((L1PcInstance) cha, _target)` (2132) throws a ClassCastException for a non-player loop target, while `attack()` only damages player targets (91-96). Fix: take an `L1Character` target and make only the message player-specific.
3. Wrong character can be passed. The second argument is the field `_target` (declared at `L1SkillUse.java` 139), not the loop variable `cha` used in the same call. They match only when the skill has one target (not verified). Fix: pass the loop target.
4. Off-tick damage. Ticks run on `GeneralThreadPool` (69), so HP changes off the game's main loop. The check at 51 and the set at 71 are not atomic, so two landed hits in the same moment can both pass the check. Fix: run the wound on the server tick and set the marker in the same step as the check.
5. Null path leaks the schedule. `run()` calls `stop()` when the target is null (32-33), but `stop()` dereferences `_cha` (75) before it cancels the future (78). The NullPointerException is caught in `run()` (45-47), so the future is never cancelled and the task keeps firing. Fix: cancel first, then clear the marker, with a null check.
6. Hard-coded numbers. The tick damage (83) and the floor (`- 1`, 86-88) are literals. Fix: data fields (see the JSON sidecar).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: roll the duration once, mark the victim, first tick due at once, at most one tick per call, floor the damage, stop at the tick count. It drops the thread pool and the timer (the caller passes `nowMs` once per server tick), the messages, the animation and the `receiveDamage` call, so it has no attacker and no kill credit (fix 1 is for the caller). It also drops the PC-only check (fix 2). It does not replay missed ticks: if the tick is late, one tick is emitted per call (not read: whether the donor's fixed-rate scheduler replays late runs). The floor formula `min(5, HP - 1)` gives the same result as the donor's three-branch clamp for every HP value (checked by hand for HP 1, 2, 3, 5, 6 and 7).

```ts
interface BleedState { secondsLeft: number; nextTickAt: number; }

interface Victim {
  hp: number;
  alive: boolean;
  bleed: BleedState | null; // at most one wound at a time
}

interface BleedConfig {
  rollSize: number;                                                    // donor: roll is 0..399
  durationTable: ReadonlyArray<{ minRoll: number; seconds: number }>;  // checked top-down
  tickDamage: number;                                                  // donor: 5
  tickMs: number;                                                      // donor: 1000
  floorHp: number | null;                                              // donor: 1 (bleed cannot kill); null = can kill
}

const DONOR_BLEED: BleedConfig = {
  rollSize: 400,
  durationTable: [
    { minRoll: 335, seconds: 8 },
    { minRoll: 210, seconds: 6 },
    { minRoll: 80, seconds: 4 },
    { minRoll: 0, seconds: 1 },
  ],
  tickDamage: 5,
  tickMs: 1000,
  floorHp: 1,
};

function rollSeconds(cfg: BleedConfig, roll: number): number {
  for (const row of cfg.durationTable) {
    if (roll >= row.minRoll) return row.seconds;
  }
  return cfg.durationTable[cfg.durationTable.length - 1].seconds;
}

// Wound from one landed hit. Returns false when already bleeding: no stacking, no refresh.
function applyWound(v: Victim, cfg: BleedConfig, roll: number, nowMs: number): boolean {
  if (v.bleed !== null) return false;
  v.bleed = { secondsLeft: rollSeconds(cfg, roll), nextTickAt: nowMs }; // first tick is due at once
  return true;
}

// Called once per server tick. Emits at most one tick per call; no catch-up for late calls.
function stepBleed(v: Victim, cfg: BleedConfig, nowMs: number): number {
  const b = v.bleed;
  if (b === null) return 0;
  if (!v.alive) { v.bleed = null; return 0; }
  if (nowMs < b.nextTickAt) return 0;
  const dmg = cfg.floorHp === null
    ? cfg.tickDamage
    : Math.max(0, Math.min(cfg.tickDamage, v.hp - cfg.floorHp));
  v.hp -= dmg;
  b.secondsLeft -= 1;
  b.nextTickAt += cfg.tickMs;
  if (b.secondsLeft <= 0) v.bleed = null;
  return dmg;
}
```

Typecheck: `work/l1j-bleed.ts` (the block plus `export {}`) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/vf014-l1j-bleed.ts`).

## 5. Lands in

- TARGET `src/fight/wounds.ts` (new module, proposed name; the Frankendom repo was not read). The wound is engine state (one ledger), ticked by the server, and the client only shows the icon and the tint.
- Parity-checklist row 8 (blood/wounds/decals). The list hint said row 10 (hit impact); a wound is a lasting state, not an impact, so row 8 is the better fit.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one engine: the wound is engine state, not a client effect); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, not translated.
- Tick placement: the donor ticks on a thread pool. Frankendom ticks on the server tick (parity row 18 / post-K item 3, sub-line "server tick: fixed step, input intake, per-tick NPC budget"). The port must not keep the timer.
- One wound slot per victim. Under MAX_ATTACKERS = 3, the first attacker's wound holds the slot and a second attacker's landed hit is ignored until it ends. That is the donor's rule; Frankendom must decide whether a later hit refreshes the wound or is ignored, and write that choice as a rule, not as a side effect.
- The floor means a wound can never end a duel by itself (kills are server-verified and decided by the duel step). Decide whether that is wanted; the floor is a data field for that reason.
- Blood visuals are not in the donor. The only cues are a hit-react animation each tick and a chat line. Row 8's visible blood (decals, tint, a wound icon) has to be designed on the client; this donor gives timing only.
- The movement hindrance the start message mentions is in code not read. Do not port it without reading it.
- Fix 1 (self-attribution) must be fixed when porting: credit the caster for kills and aggro, and check the rule against the duel record (row 19).

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one engine, one ledger); rules 7-9 n/a
