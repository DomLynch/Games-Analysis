# OpenRA-OpenRA (anticheat-validation, cell 6)

Donor: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/ValidateOrder.cs` | Licence: GPL-3 | C# | symbol `ValidateOrder.OrderValidation` (verified at 23). The call site that makes this a gate is `ResolveOrder` in `OpenRA.Game/Network/UnitOrders.cs` (417), read in this cell.

## 1. Mechanism

- Orders come in as (client id, order). A grouped order is split into one order per subject actor (UnitOrders.cs 406-410). Before an order reaches its actor, `ResolveOrder` (UnitOrders.cs 417-424) drops it if the subject is missing or dead (419-420). It then runs every `IValidateOrder` trait in the world (`World.OrderValidators`, set at World.cs 208) with `All` and calls the subject's `ResolveOrder` only if all return true (422-423).
- `ValidateOrder.OrderValidation` (23-48) is one of those validators (the trait is attached to the world actor, described as "used to detect exploits", 17-19). Orders with no subject or no subject owner pass (25-26). If the subject's owner client index does not exist in the lobby, the order is rejected and a debug line is written (31-37). The order is then rejected unless the sender is the subject's owner client, or the owner is a bot and the sender is that bot's controller client (39-45). Last, the subject's trait decides with `AcceptsOrder(order string)` (47).
- The donor is a lockstep game, so each client runs the same check on the same tick and reaches the same decision; that is the design, inferred from the model, not shown by the lines read (the call site only shows the per-order call).
- Inputs: the order, the lobby, the world's validators. Outputs: true or false. A rejected order changes no game state; the only side effect is the debug log line for an unknown owner client (33-35).
- Tick: the order's net tick.

## 2. Key functions

- `ValidateOrder.OrderValidation`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/ValidateOrder.cs` lines 23-48. Owner lookup, bot-controller exception, then the trait's own accept.
- `UnitOrders.ResolveOrder`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Network/UnitOrders.cs` lines 417-424. Drops dead or missing subjects; requires every validator to pass before the subject acts.
- `IValidateOrder`: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/Traits/TraitsInterfaces.cs` lines 151-151. The interface every validator implements.
- `World` validator list: `/mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Game/World.cs` lines 208-208. Collects every `IValidateOrder` trait on the world actor once, at world creation.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Validator chain: every validator must accept (logical AND) | none |
| Owner-of-subject check: the sender must control the target | client index (theirs) |
| Controller exception for a delegated (bot) owner | bot controller index (theirs) |
| Dead or missing target is dropped before any check | n/a |
| Final decision delegated to the target's own accept rule | the accept rule per trait (theirs, not read) |

No numbers in the validator itself. The debug log channel name ("debug", line 33) is the only literal.

## 4. TypeScript sketch

simplified: the donor's accept rule is the last step of the same validator (47), and the dead-or-missing test belongs to the call site; the sketch splits the target's own accept into a second validator (`traitAccepts`) and keeps the drop in `resolveOrder`, so an order with no subject returns true from the donor's validator and false from the sketch's second one (the donor never reaches it, because `ResolveOrder` drops it first). The sketch omits grouped-order splitting, the lobby lookup (it passes `clientKnown`), the bot-presence test (the donor requires the owner client to be a bot; the sketch only checks the controller index) and the log line.

```ts
// Licence: GPL-3 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Owner { clientId: number | null; botController: number | null; }
interface Subject { id: number; dead: boolean; owner: Owner | null; accepts(orderName: string): boolean; }
interface Order { subject: Subject | null; name: string; }
type Validator = (sender: number, order: Order) => boolean;

// Every validator must accept. An order with a dead or missing subject is dropped.
function resolveOrder(sender: number, order: Order, validators: Validator[], apply: (s: Subject, o: Order) => void): boolean {
  const s = order.subject;
  if (!s || s.dead) return false;
  if (!validators.every(v => v(sender, order))) return false;
  apply(s, order);
  return true;
}

// Ownership: the sender must control the target, or be the bot controller of a bot owner.
function ownerCheck(clientKnown: (id: number) => boolean): Validator {
  return (sender, order) => {
    const s = order.subject;
    if (!s || !s.owner) return true; // world-level orders pass
    const owner = s.owner.clientId;
    if (owner === null || !clientKnown(owner)) return false;
    const isBot = s.owner.botController !== null && sender === s.owner.botController;
    if (owner !== sender && !isBot) return false;
    return true;
  };
}

// The target's own rule has the final say.
function traitAccepts(): Validator {
  return (_sender, order) => order.subject ? order.subject.accepts(order.name) : false;
}
```

## 5. Lands in

- Frankendom target: NEW `src/fight/intake.ts` (TARGET; the per-tick intent gate the engine runs before it applies a player's action), serving parity row 5 (controls and input, "intake -> row 5"). Today: `src/input.ts` (moving) produces intents, `src/net/pvp.ts` has `cleanKit` (sanitising a client-sent kit), and `origins/server/encounter-verify.ts` re-simulates a record with the parameters the SERVER holds ("a client cannot name its own foe, level, seed, pool or twist"), which is the server-authoritative form of this donor's owner check. All on the VPS snapshot /root/work-k7 (not main); header comments read only.
- Parity-checklist row: 5 (controls and input; intake). Rows 18 and 19 (rewards, fight record) are served by the verifier side, not this gate. Brief rule 2: the server verifies an action before it resolves.
- Reuse tag: rewrite-from-idea
- Brief rule served: 2 (engage is a state change; kills server-verified); rules 7-9 n/a

## 6. Gaps and risks

- The donor checks ownership and the target's own accept rule. It does not check range, cooldown, cost or line of sight in these functions; those, if any, sit inside `AcceptsOrder`, which was not read. Frankendom needs those checks in the engine (server-verified kills).
- The ownership check exists because the lockstep model sends every order to every client. Frankendom's server-authoritative model needs the same check on the server and takes the owner from the authenticated session (one-character, one-ledger rule), never from the message.
- The comment (41-43) notes a race: an owner can change within a net tick. The donor accepts that and drops the order. Frankendom has no owner transfer in this sense; if ownership transfers ever exist, the check must be done at apply time.
- This is a per-action gate. It does not detect outcomes: Frankendom's outcome side is replay verification (`verifyRecord`, `verify-duel.ts`), not a per-order validator. See the Kaladin cell for the statistical side.
- Pit is a client only: the gate sits in the shared engine (`src/fight/`) or the server, not in the Pit client. MAX_ATTACKERS = 3 is a rule for the engine to check at intake, not something this donor shows.
- Not read: `AcceptsOrder` implementations, `OrderManager`, and the lobby client types.
