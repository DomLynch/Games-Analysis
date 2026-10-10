# OpenRA-OpenRA (anticheat-validation, cell 2)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/ValidateOrder.cs` | Licence: GPL-3.0-or-later (file header: "either version 3 of the License, or (at your option) any later version"; repo `COPYING` is "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007") | C# | symbol `ValidateOrder.OrderValidation` (with `IValidateOrder`, `UnitOrders.ResolveOrder`, `RejectsOrdersExts.AcceptsOrder`)

Checked: Read in full: `ValidateOrder.cs` (50 lines). Callers and the path it sits in: `OpenRA.Game/Network/UnitOrders.cs` 46-48 (server-only helper, `ProcessOrder` head), 50-62 (first cases), 92-120 (kick vote and chat excerpts), 395-425 (default branch and `ResolveOrder`, read as an excerpt); `OpenRA.Game/Network/OrderManager.cs` 18-28 (immediate orders), 161-171 (`ReceiveSync`, partly), 236-262 (per-frame order pass, partly). `RejectsOrders.cs` 40-70 (the `AcceptsOrder` body) and 17-39 (grep-level for the info fields and the `Desc` text). Grep only (not read): `World.cs` 208, `TraitsInterfaces.cs` 151, `world.yaml` ValidateOrder entries (ts 379, cnc 263, d2k 239, ra 270). Not read: the other switch cases in `UnitOrders.cs` between 62 and 400 (labels only, from grep: StartGame 171, PauseGame 217, HandshakeRequest 238, GenerateMap 387), the value of `ChatMessageMaxLength`, the `Order` class, the rest of `OrderManager` (the frame loop and `OutOfSync`), and any test of this validator (not searched). Camera: not applicable. Confidence: high on the validator chain and the `AcceptsOrder` semantics (the `Desc` text at RejectsOrders.cs 20 agrees with the code). Note: `ValidateOrder` is the only validator in the `world.yaml` files grepped above.

## 1. Mechanism

- Who sends. Client orders are read per simulation frame and per immediate order. The frame pass (`OrderManager.cs` 236-257) takes each client's queued packet for the frame, checks the frame number (244), and calls `UnitOrders.ProcessOrder(this, World, clientId, order)` for each order (257). Immediate orders take the same route (`ReceiveImmediateOrders`, `OrderManager.cs` 181). So every order carries the sender's client index (`clientId`).
- Order of steps (as the code runs):
  (a) `ProcessOrder` (`UnitOrders.cs` 48) switches on the order string. Special orders are handled in their own cases; the ones read (Chat, kick votes, DisableChatEntry, PauseGame) have their own checks, the rest were not read. Some are server-only: the helper `OrderNotFromServerOrWorldIsReplay` returns true when `clientId != 0` or the world is a replay (46), and the kick-vote and disable-chat cases use it (80, 94, 103). `Chat` drops the message when the sender is not in the lobby (115-116). Ordinary orders fall to `default` (401), which calls `ResolveOrder` (407), or once per grouped subject (410).
  (b) `ResolveOrder` (`UnitOrders.cs` 417-424). A null or dead subject returns at once (419-420). Otherwise `world.OrderValidators.All(...)` must be true (422). Only then does `order.Subject.ResolveOrder(order)` run (423). `OrderValidators` is the list of every `IValidateOrder` trait on the world actor (`World.cs` 208, grep).
  (c) `ValidateOrder.OrderValidation` (`ValidateOrder.cs` 23-48), in its order:
     - no subject or no owner: return true (25-26). This is the donor's only accept without an owner check.
     - look up the owner's client index in the lobby (28-29); if missing, log and return false (31-37).
     - `isBotOrder` is true when the owner client is a bot and the sender is that bot's controller (39).
     - if the sender is not the owner and not the bot controller, return false (44-45). The comment at 41-43 gives the reason: the owner may have changed within the last net tick, or the client is acting maliciously.
     - otherwise return `order.Subject.AcceptsOrder(order.OrderString)` (47).
  (d) `AcceptsOrder` (`RejectsOrders.cs` 50-69). No enabled `RejectsOrders` trait: true (53-54). If any trait's `Except` list has the order: true (57). If any trait's `Reject` list has it: false (64). Otherwise the result is `anyRejects`, which is true only if some `Reject` list is non-empty (63, 68). So an actor with a `RejectsOrders` trait whose `Reject` lists are all empty refuses every order not in an `Except` list. The `Desc` text at line 20 says so: "Leave empty to reject all minus those listed under Except."
- Tick: no timing in this mechanism. The check is per order, inside the frame pass that the lockstep already runs.

## 2. Key functions

- `OrderValidation`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/ValidateOrder.cs` 23-48. Owner, bot-controller and accept checks, in that order.
- `ResolveOrder`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/UnitOrders.cs` 417-424. Dead or missing subject, then all validators, then apply.
- `ProcessOrder` (default branch): `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/UnitOrders.cs` 48 and 401-411. Special orders versus ordinary orders.
- `AcceptsOrder`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/RejectsOrders.cs` 50-69. Except, Reject, the empty-list default.
- Intake: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/OrderManager.cs` 181 and 257.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Sender must control the subject: owner or the owner's bot controller, else drop | Server sender id 0 (theirs, UnitOrders.cs 46); bot controller client index (theirs, ValidateOrder.cs 39; assigned at `Server.cs` 1121, grep only) |
| Every validator in a list must pass before the order is applied (AND over `All`) | None (mechanism, UnitOrders.cs 422) |
| Subject-level accept list: Except overrides, Reject blocks, empty Reject means deny by default | None (mechanism, RejectsOrders.cs 57, 64, 68); the lists themselves are mod data (theirs, mods' rules; the `Reject`/`Except` fields in RejectsOrders.cs 20-25) |
| Dead or missing subject: drop before any check | None (mechanism, UnitOrders.cs 419-420) |
| Subject with no owner: accept (the donor's default) | None (mechanism, ValidateOrder.cs 25-26); this is the one line not to copy |
| Chat length cap (not a validator, same server-only pattern) | `ChatMessageMaxLength` (value not read) |

## 4. TypeScript sketch

simplified: keeps the donor's order: the resolve gate (missing or dead subject dropped), then the all-must-pass validator list, then the owner gate (owner present, sender is the owner or its bot controller), then the unit's accept list with Except and Reject and the empty-Reject default. It omits the server-only special-case switch (`clientId != 0`, replay check), the lobby lookup as a `Map`, the log line, and the per-trait `IsTraitDisabled` flag (the caller passes only enabled rules). It keeps the donor's no-owner accept (`ValidateOrder.cs` 25-26) so the gap is visible; the Frankendom note says to change that default.

```ts
// Licence: GPL-3.0-or-later (donor header: "either version 3 of the License, or (at your option) any later version"). Clean-room sketch written from the described steps, not a translation of the donor lines.
// clean-room
export interface Seat { id: number; isBot: boolean; botControllerId?: number; }

export interface Unit {
  ownerSeat: number | null;   // null = no owner
  dead: boolean;
  accepts(cmd: string): boolean;
}

// One rule set per enabled "rejects orders" trait on the unit.
export interface AcceptRule { reject: Set<string>; except: Set<string>; }

// Donor RejectsOrdersExts.AcceptsOrder: Except wins; Reject blocks; no Reject list anywhere -> deny.
export function acceptsOrder(rules: AcceptRule[], cmd: string): boolean {
  if (rules.length === 0) return true;
  if (rules.some(r => r.except.has(cmd))) return true;
  let anyReject = false;
  for (const r of rules) {
    anyReject = anyReject || r.reject.size > 0;
    if (r.reject.has(cmd)) return false;
  }
  return anyReject;
}

export type Validator = (sender: number, cmd: string, unit: Unit, seats: Map<number, Seat>) => boolean;

// Donor ValidateOrder.OrderValidation, in the donor's order of checks.
export const ownerGate: Validator = (sender, cmd, unit, seats) => {
  if (unit.ownerSeat === null) return true;                 // donor returns true when there is no owner
  const owner = seats.get(unit.ownerSeat);
  if (!owner) return false;                                 // owner seat is gone: drop
  const isBotOrder = owner.isBot && sender === owner.botControllerId;
  if (owner.id !== sender && !isBotOrder) return false;     // only the owner (or its bot controller) may command
  return unit.accepts(cmd);                                 // the unit's own accept list is the last word
};

// Donor UnitOrders.ResolveOrder: dead or missing subject is dropped; every validator must pass.
export function resolveOrder(
  sender: number, cmd: string, unit: Unit | null,
  seats: Map<number, Seat>, validators: Validator[], apply: (u: Unit, cmd: string) => void,
): void {
  if (!unit || unit.dead) return;
  if (validators.every(v => v(sender, cmd, unit, seats))) apply(unit, cmd);
}
```

## 5. Lands in

- TARGET `src/fight/intake-gate.ts` (new). It is the server-side gate on a fight command before the engine applies it (engine step: the fight duel input, parity row 5 "controls/input").
- Parity row: 5 (controls/input intake). The addendum gives intake to row 5. Row 18's server-tick sub-line (input intake) also covers the per-tick order pass, but row 5 is the row that names the gate.
- today: not checked. No Frankendom repo was read in this pass.
- Reuse tag: adapt-shape (GPL-3.0-or-later: clean-room only)
- Brief rule served: server decides (the server checks the sender before any state changes); one ledger (the gate changes nothing before it passes); rules 7-9 n/a

Best transferable idea: before any fight command changes state, the server checks that the sender controls the fighter, that the fighter is alive, and that the fighter's current state accepts that command, with every check in one short ordered list.
Decision (proposed): adapt. Frankendom's server must check that the sender owns the hero before a duel input, and the per-state accept list belongs in data, not in ad hoc `if`s in the duel step; do not copy the donor's no-owner accept, which Frankendom must refuse.
Acceptance: a server test asserts that an input naming a hero the sender does not own changes nothing; a dead hero ignores input; a state whose accept list refuses "attack" drops that input and keeps the rest of the state; a hero with no owner is refused, not accepted.

## 6. Gaps and risks

- The no-owner accept (ValidateOrder.cs 25-26) returns true before the owner and accept checks. Any actor without an owner accepts any order from any sender. Frankendom's gate must default to deny.
- The gate is opt-in. `ValidateOrder` only runs when the world actor has the trait (the `world.yaml` entries, grep only). A mod without it has no owner check at all. Frankendom's gate must be part of the fight engine, not a trait a zone can leave out (zones as data, one engine).
- Server-verified kills: this gate checks who may command a fighter, not whether a hit or kill is real. A kill still needs the engine's own check.
- Accept lists are per unit type (mod data in OpenRA). Frankendom's accept lists should be per state (a stagger or a finisher refuses commands), not per character, or a state change will not block a command. Decide where the list lives (engine constant rule, data values) before writing it.
- The empty-Reject default (RejectsOrders.cs 63-68) denies everything not excepted. That is useful for a whitelist, but it is a surprise if a designer writes an empty Reject list by mistake. Frankendom should name the mode (whitelist or blacklist) in the data.
- Ownership can change inside a net tick. The donor accepts that window (ValidateOrder.cs 41-43 comment) and does not handle it beyond the check. Frankendom's ownership is one character one ledger; a change of owner should be a state change the server applies in order, not a race.
- Special orders in `ProcessOrder` (UnitOrders.cs 53-400) each have their own checks. Not all were read. Do not assume the validator chain covers them; Frankendom should route every command through one gate.
- A sibling mechanism exists: `OrderManager.ReceiveSync` (161-171) compares a per-frame sync hash from each client and calls `OutOfSync` on a mismatch. It was read only in part and is not explained here; it belongs to the desync-detection cell, not this one.
- The chat length cap and other special cases are not validators. Their values were not read.
- GPL-3.0-or-later: clean-room. The sketch was written from the described steps, not from the lines.

Reuse tag: adapt-shape (GPL-3.0-or-later: clean-room only)
Brief rule served: server decides before state changes; one ledger; rules 7-9 n/a
