# OpenTTD-OpenTTD (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/OpenTTD-OpenTTD/src/script/squirrel.cpp` (with `src/3rdparty/squirrel/squirrel/sqvm.cpp`, `sqvm.h`, `src/script/script_instance.cpp`, `src/ai/ai_core.cpp`) | Licence: GPL-2.0 (COPYING.md: "GNU General Public License"; full version text not read, treat as GPL-2.0 per the project; clean-room only) | C++ | symbol `Squirrel::Resume`, `SQVM::DecreaseOps`

Checked: `Squirrel::Resume` read 378-395; `sqvm.h` 168-189 (counter and helpers) read; `sqvm.cpp` 738-746 (the instruction loop) read; `ScriptInstance::GameLoop` seen at 186-221 by grep lines only (pause and suspend gates at 196-201, resume call at 264); `ai_core.cpp` 86-97 read (frame gate and per-company loop). Not read: the value of `_ops_till_suspend_error_threshold` and where it is set, what happens after the "excessive CPU usage" error is raised, `ScriptInstance::Died`, the Squirrel script AIs themselves (they are outside this donor). Confidence: high on the budget, debt and frame gate; low on the failure path. Depth: full for the compute-budget mechanism; it contains NO target selection, aggro or chase logic, so for the topic "ai-aggro" itself this donor is thin. The hint file `ai_instance.cpp` is the host wrapper, as an earlier reader also found.

Best transferable idea: give every AI brain the same fixed instruction budget per tick, suspend it the instant the budget is spent, and carry any overspend forward as debt so a greedy brain pays by skipping later ticks.

## 1. Mechanism

- Each scripted AI player runs inside a virtual machine that counts instructions. The VM has a counter `_ops_till_suspend` (`sqvm.h` 170). The instruction loop subtracts one per instruction (`sqvm.cpp` 742, `DecreaseOps(1)`) and, when the counter is at or below zero and the script is allowed to pause, marks the VM suspended and returns (743). `ShouldSuspend()` is `_can_suspend && _ops_till_suspend <= 0` (`sqvm.h` 175-178).
- One tick, one slice. Each game tick `GameLoop` resumes the script with the budget `script_max_opcode_till_suspend` (`script_instance.cpp` 264), whose setting defaults to 10000 and ranges 500 to 250000 (`script_settings.ini` 50-52). So a brain gets at most that many instructions per tick, however long its code is, and continues where it stopped on the next tick. It returns early at once if paused (`script_instance.cpp` 196).
- Debt. `Resume` (`squirrel.cpp` 384-394): if the previous slice overdrew (`overdrawn_ops > 0`, line 384), the new budget first pays it off (385). If debt still remains the brain gets no turn this tick and `Resume` returns (387). If the budget covers it, the brain runs with only what is left (390). After the slice, the new debt is recorded as the negative of what remained (394), because one instruction group can overshoot zero.
- Brains are skipped by difficulty. `AI::GameLoop` increments a frame counter (`ai_core.cpp` 88) and returns unless the low bits of the counter are zero; the number of bits depends on the `competitor_speed` setting (90). So at lower settings all AIs think every 2nd, 4th, 8th or 16th tick. Then it loops over every company that is an AI (93) and calls its `GameLoop` (96).
- Runaway protection: if the counter falls below an error threshold the VM raises "excessive CPU usage" (`sqvm.cpp` 745). What the host does then was not read.

## 2. Key functions

- `Squirrel::Resume`: `src/script/squirrel.cpp` 378-395. Debt payoff, resume with the budget, record new debt.
- `SQVM::DecreaseOps`, `ShouldSuspend`: `src/3rdparty/squirrel/squirrel/sqvm.h` 175-189. The counter and the suspend test.
- Instruction loop: `src/3rdparty/squirrel/squirrel/sqvm.cpp` 738-746. Subtract one per instruction, suspend at zero, error below the threshold.
- `AI::GameLoop`: `src/ai/ai_core.cpp` 86-97. Frame gate by difficulty, then every AI company.
- `ScriptInstance::GameLoop`: `src/script/script_instance.cpp` 186-264 (gates read by grep). Pause gate (196), resume call (264).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Fixed instruction (or work) budget per brain per tick; suspend when spent, resume next tick | 10000 default, 500 to 250000 range (theirs, script_settings.ini 50-52) |
| Overspend carried forward as debt; a brain in debt skips ticks until paid | Debt = negative remaining counter (theirs, squirrel.cpp 394) |
| Global think rate scaled by difficulty with a power-of-two frame mask | `1 << (4 - competitor_speed)`, speed 0 to 4 (theirs, ai_core.cpp 90) |
| Hard stop for runaway brains | Error threshold (value not read) |

## 4. TypeScript sketch

simplified: a "brain" is a generator that yields after each unit of work instead of a VM counting real instructions, so cost is whatever the brain reports; no error threshold or script death; the difficulty mask is passed in.

```ts
// Licence: GPL-2.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export class Brain {
  debt = 0;
  private it: Iterator<number>; // each yield reports the work units just spent
  constructor(gen: () => Iterator<number>) { this.it = gen(); }

  // returns false when the brain has finished
  runSlice(budget: number): boolean {
    if (this.debt > 0) {
      this.debt -= budget;
      if (this.debt >= 0) return true; // still paying; no turn this tick
      budget = -this.debt;             // run with what is left
      this.debt = 0;
    }
    let left = budget;
    while (left > 0) {
      const r = this.it.next();
      if (r.done) return false;
      left -= r.value;
    }
    this.debt = -left; // overshoot becomes debt
    return true;
  }
}

export function tick(brains: Brain[], frame: number, speed: number, budget = 10000): void {
  const mask = (1 << (4 - speed)) - 1;
  if ((frame & mask) !== 0) return;
  for (const b of brains) b.runSlice(budget);
}
```

## 5. Lands in

- TARGET `src/fight/tick.ts` (the server tick's NPC budget; Lead's named sub-line "server tick: fixed step, input intake, per-tick NPC budget" under row 18 / post-K item 3), and `src/fight/ai.ts` for the brain loop (row 2, AI brain). Acceptance: Proof 3, N NPC brains inside the tick budget. today: not checked.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 5 (many-on-one logic lives in the engine and must stay inside the tick), 1 (one engine)

## 6. Gaps and risks

- Real VM instruction counting is not available to Frankendom's TypeScript brains. The sketch's unit of cost is self-reported work, which a buggy brain can lie about; a time-based budget (measured milliseconds with a hard cap) is the nearest real replacement and was not examined here.
- The donor budget is per script, not per tick globally; a crowd of brains could still exceed a tick's wall time because every company gets the full 10000. Frankendom needs one shared tick budget divided among brains.
- A brain in debt skips ticks, which in a fight would mean a mob freezing for several ticks. That is acceptable for a strategy game and probably not for a duel; the debt should be capped or paid in smaller instalments.
- The frame mask throttles all brains together by difficulty; Frankendom would want per-NPC think rates (compare the Dawn of Light think interval tied to aggression).
- No aggro, target selection or threat logic is in this donor. Use the Dawn of Light and OpenTibia notes for that.
- GPL-2.0: clean-room only.
