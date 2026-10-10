# beyond-all-reason-Beyond-All-Reason (inventory-bank-equipment, cell 2)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/unit_stockpile_limit.lua` | Licence: GPL v2 for the game code (LICENSE.md line 2; this gadget's header says "GNU GPL, v2 or later", line 10) | Lua | symbol `UpdateStockpile` (with `gadget:AllowCommand`)

Checked: The hint was `INFERRED`, so I searched `stockpile`, `storage`, `inventory`, `equipment` in the donor's `.lua` files. The best bank-like mechanism is the unit stockpile (a capped stored count of a weapon's ammo that builds while idle). Read in full: `luarules/gadgets/unit_stockpile_limit.lua` (all 153 lines) and `luarules/gadgets/unit_stockpile_script.lua` (all 49 lines). Also read: `luarules/gadgets/game_team_resources.lua` (118 lines; start-storage floor only, a thin second candidate, not used), `units/CorVehicles/T2/cormabm.lua` (the stockpile fields only), `luarules/gadgets/unit_waterspeedmultiplier.lua` line 97 (for the `math_clamp` argument order). Not read: the engine code that builds the stock over time (`stockpiletime` is engine-side; the value 90 is seen, its unit of time is not verified), and `math.clamp` itself (engine-provided, no definition in the donor). Confidence: high for the desired-target and reconcile logic, which the note relies on; medium for the engine timing.

Best transferable idea: Treat a capped stock as a desired target the player moves in steps (clamped to the cap), and let the server reconcile the actual stock to it on every change event.
Decision (proposed): adapt - A charge bank that the player sets by steps and the server reconciles fits one ledger (the phone sends a step, never a stock value) and gives a clear target-versus-stock HUD; adapt because the donor's chunked engine orders and the modifier keys do not exist on a phone, and its UnitGiven rule resets a transferred unit to full stock, which Frankendom must not do.
Acceptance: A hero with a special-charge cap of 20 and a target of 15: the player taps +5 and the target goes to 20 (a further tap stays at 20); the server reconciles stock toward 20 over idle time; a server test asserts stock never exceeds the cap, the target never leaves [0, cap], and a transferred unit keeps its stock.

## 1. Mechanism

- Each stockpile-capable unit has a cap, its limit. The default is 99 (line 17); a weapon's `customParams.stockpilelimit` overrides it (line 35; example cormabm: 20). The gadget keeps a per-unit desired target, `StockpileDesiredTarget`, separate from the actual stock.
- Desired target is set when the unit is created (line 131) to the full limit. A unit that changes hands is handled the same way (`gadget.UnitGiven = gadget.UnitCreated`, line 135). A destroyed unit drops its entry (line 142).
- Player input (`gadget:AllowCommand`, line 84). The step is chosen from modifiers: plain 1; shift 5; ctrl 20; shift and ctrl 100 (lines 102-110). The right button negates it (lines 112-113). Gadget-issued orders (`fromLua` and `fromSynced` both true, line 115) pass through unchanged. A player order is not executed as given: the desired target moves by the step and is clamped to the limit (lines 118-120), then the gadget reconciles the unit (line 121), and the player's order is refused (`return false`, line 123).
- Reconcile (`UpdateStockpile`, line 42). The target is `min(limit, desired)` (line 46; the clamp is written with the value first: `mathClamp(limit, 0, desired)`). The gap is `count = stock + queued - target` (line 50). A negative gap means too few: add orders. A positive gap means too many: remove orders. The orders are sent greedily in chunks of 100, 20, 5, 1 (add: lines 52, 55, 58; remove: 67, 70, 73). A gap of 19 is sent as 5, 5, 5, 1, 1, 1, 1.
- Reconcile also runs on every engine stockpile event (`gadget:StockpileChanged`, line 137), so when the stock changes by itself the gadget brings it back to the target. The script `unit_stockpile_script.lua` pushes the new count to the unit's own script (line 47) so the unit's own script can react to it.
- Order of operations for one player click: refuse raw order; move desired by the step, clamped; reconcile (issue chunks); the engine then builds or spends stock; each change fires StockpileChanged, which reconciles again.

## 2. Key functions

- `UpdateStockpile`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/unit_stockpile_limit.lua` 42-82 (chunked add and remove, lines 46-80 as read). Callers (checked by grep): `AllowCommand` (121), `UnitCreated` (132), `StockpileChanged` (138).
- `gadget:AllowCommand`: same file, 84-124. Player step, clamp, and refusal of the raw order.
- `gadget:UnitCreated` (and `UnitGiven`): same file, 129-135, calls `UpdateStockpile` at 132. Sets the desired target to the limit.
- `gadget:StockpileChanged`: same file, 137-139. Re-runs reconcile on an engine event.
- `unit_stockpile_script.lua` 45-48: pushes the count to the unit's own script.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Stock is a capped bank; the desired target is the authority; the actual count is reconciled to it | Default cap 99 (line 17); per-unit override (cormabm 20, line 151 of its file) |
| Player moves the target by a step and the clamp keeps it in [0, cap] | Steps 1 / 5 / 20 / 100 by modifier (lines 102-110) |
| Gap = stock + queued - target; add when negative, remove when positive | Chunks 100 / 20 / 5 / 1 are the engine's order batch sizes, not a game rule |
| Reconcile again on every change event | Engine event `StockpileChanged` |

## 4. TypeScript sketch

simplified: keeps the step table, the clamped desired target, the gap and the greedy chunking in the donor's order (add or remove chosen by the sign of the gap). It omits the queued-order split (the engine has a queue; a server bank has none), the gadget-bypass branch (the sketch only has the player path), the change-event hook, the unit-script push, the `UnitGiven` reset (the sketch keeps the constructor only, see section 6), and the engine's build time (`stockpiletime`).

```ts
// Licence: GPL v2 or later (donor; LICENSE.md and the gadget header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Bank { limit: number; desired: number; stock: number; queued: number; }

// Player input: a step of 1 (plain), 5 (shift), 20 (ctrl), 100 (ctrl+shift).
function stepFor(shift: boolean, ctrl: boolean): number {
  if (shift && ctrl) return 100;
  if (ctrl) return 20;
  if (shift) return 5;
  return 1;
}

// The player never sets stock directly: the desired target moves by the step and is clamped to [0, limit].
function playerStep(b: Bank, step: number, remove: boolean): Bank {
  const delta = remove ? -step : step;
  return { ...b, desired: Math.min(Math.max(b.desired + delta, 0), b.limit) };
}

const CHUNKS = [100, 20, 5, 1];

// Reconcile: the orders that bring stock + queued to the target. Positive = add, negative = remove.
// Chunks are taken greedily from the largest size, so a gap of 19 is 5,5,5,1,1,1,1.
function reconcile(b: Bank): number[] {
  const target = Math.min(b.limit, b.desired);
  const count = b.stock + b.queued - target;
  const sign = count < 0 ? 1 : -1;
  let need = Math.abs(count);
  const orders: number[] = [];
  for (const c of CHUNKS) {
    while (need >= c) {
      orders.push(sign * c);
      need -= c;
    }
  }
  return orders;
}

// A new unit (or a unit that changes hands) starts with the desired target at the full limit.
function newBank(limit: number): Bank {
  return { limit, desired: limit, stock: 0, queued: 0 };
}

const demo = reconcile({ limit: 20, desired: 20, stock: 0, queued: 0 });
export { stepFor, playerStep, reconcile, newBank, demo };
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file copied to /tmp), exit 0.

## 5. Lands in

- TARGET `src/fight/charges.ts` (proposed module; the repo layout was not checked here). A capped stock of special charges (for example a finisher or special meter per hero) that builds while idle and is spent in the fight. The donor's stock is an ammo bank, so this is an adaptation, not a copy.
- Parity-checklist row 13 (specials). Not row 18 (loot): the bank is a charge stock, not a drop.
- Reuse tag: adapt (GPL v2 / GPL v2 or later; clean-room, shape only)
- Brief rule served: one ledger (the server holds the desired target and the stock; the phone sends a step, never a stock value); rules 7-9 n/a

## 6. Gaps and risks

- Licence: GPL. Clean-room only; the sketch is written from the mechanism.
- Transfer reset: `gadget.UnitGiven = gadget.UnitCreated` (line 135) sets the desired target to the full limit when a unit changes hands. For a charge bank this would hand the new owner a full stock for free. Fix: on transfer keep stock and desired, and only clamp the desired target to the new limit.
- Two refusals: the raw order is always refused (line 123), so the player can only move the target. Frankendom's equivalent is the same rule (the client sends a step, the server decides), so it fits, but the HUD must show the target and the actual stock as two numbers, or the player sees a delay as a bug.
- Build time: the stock builds over time in the engine (`stockpiletime`, unit of time not verified). Frankendom would need its own timer (a fixed step on the server tick, row 18 or post-K item 3 sub-line "server tick: fixed step"). The donor's timing is not in the donor code read here.
- Argument order: `mathClamp(limit, 0, desired)` (line 46) reads backwards. The result is min(limit, desired) if the engine clamp is (value, low, high), as the sibling gadget uses it (waterspeed line 97). The engine definition was not read. Fix: write `Math.min(limit, desired)` explicitly.
- The chunk sizes 100/20/5/1 exist because the engine takes one order per batch. Frankendom has no order queue, so do not port them.
- Steps 1 / 5 / 20 / 100 need modifier keys. On a phone these must be taps or a stepper control; the donor has no touch rule.

Reuse tag: adapt (GPL; clean-room, shape only)
Brief rule served: one ledger for a charge bank (row 13); the server holds the target, the phone sends steps
