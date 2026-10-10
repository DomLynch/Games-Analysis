# 0ad-0ad (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/ResourceGatherer.js` | Licence: GPL-2.0-or-later (LICENSE.txt line 17-18: "binaries/data/ ... GPL version 2 (or later) - see license_gpl-2.0.txt"; the GPL text file itself was not read) | JavaScript (0 A.D. simulation component) | symbol `ResourceGatherer.prototype.PerformGather` with `CommitResources`

Checked: Read in full: ResourceGatherer.js 36-165 (init, carried state, capacities), 175-215 (StartGathering), 251-296 (PerformGather), 296-424 (rate lookup, CanCarryMore, IsCarryingAnythingExcept, CanReturnResource, CommitResources, DropResources). Not read: ResourceGatherer.js 1-35 (schema), 215-250 (StopGathering), 424-526 (tasked type, counters, modification handlers). ResourceDropsite.js 1-78 (whole file). Player.js 267-271 (AddResources). ResourceSupply.js 214-245 (TakeResources, Change). GarrisonHolder.js 1-12, 77-100, 145-180 (partial). Garrisonable.js 1-8, 36-50 (partial). Templates: `template_unit_infantry.xml` and `template_unit_support_female_citizen.xml` (Capacities blocks only). Callers: `UnitAI.js` grep (CommitResources at 2682, 2837, 3137, 3302; the four call sites were not read). Candidates opened (8 files plus UnitAI by grep): ResourceGatherer.js, ResourceDropsite.js, Player.js, ResourceSupply.js, GarrisonHolder.js, Garrisonable.js, two templates. Confidence: high on the carry, tick and commit order and the numbers; medium on the garrison slot rule (partial read, UnitSize not read). The hint file was the right file. camera_scope: not applicable.

## 1. Mechanism

- A unit carries an amount per resource kind (`this.carrying`, a map of kind to integer, line 43). Each kind has its own cap (`this.capacities`), set from the template's `Capacities` block with modifiers applied (132-137). The donor's own comment says the component supports several kinds at once, but "the rest of the game currently ensures and assumes we'll only be carrying one type at once" (44-46).
- Starting a gather (`StartGathering`, 175-210): if already gathering, stop first (177-178); a zero rate refuses (180-182); the supply must accept this gatherer (184-186). If the unit carries any kind other than the target's kind, the whole load is dropped first (192-193; `DropResources` at 416-419 empties the map). The donor comment says the dropped resources "just vanish" (413-414).
- The gather tick is a timer, not a per-frame step: `timing = 1000 / rate` in ms (201), set with `SetInterval` (207). The rate is the template rate times the base speed (127-128), times diminishing returns from the source (310-312).
- One tick (`PerformGather`, 251-289), in this order: (1) source missing or empty: stop with "TargetInvalidated" (254-257); (2) target out of range: stop with "OutOfRange" (260-263); (3) face the target (267); (4) if the kind is not yet carried, set it to 0 (270-271); (5) room = capacity minus carried (273); (6) take = `TakeResources(min(GATHER_AMOUNT, room))`, with GATHER_AMOUNT = 1 (38, 274). The source clamps its own amount at zero and returns the amount that really changed and an "exhausted" flag (ResourceSupply.js 214-222, 237); (7) carried += the amount actually taken (275); last carried kind is recorded (276); the owner's statistics counter is raised (281-283); (8) if carried is at capacity, stop with "InventoryFilled" (285-286); else if the source is exhausted, stop with "TargetInvalidated" (287-288).
- Caps: infantry and the female citizen carry 10 each of food, wood, stone and metal (infantry template Capacities at 79-84; female citizen at 58-63; only the food line was receipted).
- Commit (drop-off), `CommitResources` (396-409): the dropsite's `ReceiveResources(carrying)` (ResourceDropsite.js 45-58) copies every carried kind the dropsite accepts (52-54), adds those amounts to the owner's stock (56; `Player.AddResources` 267-271, no cap), and returns the map. The gatherer subtracts exactly what was returned (405) and deletes any kind that reaches zero (406-407). Kinds the dropsite does not accept stay carried.
- Before a return, `CanReturnResource` (363-387) checks that the dropsite accepts the main carried kind (372) and that the dropsite belongs to the same player, or is a shared dropsite of a mutual ally (381-386).
- Second mechanism in this cell (partial read): size-weighted garrison admission. `IsAllowedToGarrison` (GarrisonHolder.js 157-167) refuses when `OccupiedSlots() + TotalSize() > GetCapacity()` (163). `TotalSize` is the unit's size plus the slots its own holder is using (Garrisonable.js 41-48). `OccupiedSlots` sums `TotalSize` over the contents (145-155). `GetCapacity` is the template `Max` with modifiers (91-94). Ownership (171) and class filter (175) are checked too. The unit's `UnitSize()` was not read.

## 2. Key functions

- `ResourceGatherer.prototype.PerformGather` (`.../components/ResourceGatherer.js` 251-289): one tick, order (1) to (8) above.
- `ResourceGatherer.prototype.CommitResources` (ResourceGatherer.js 396-409): the one-call drop-off, subtract what the dropsite took.
- `ResourceDropsite.prototype.ReceiveResources` (`.../components/ResourceDropsite.js` 45-58): copies accepted kinds, adds them to the owner, returns the copy.
- `ResourceGatherer.prototype.StartGathering` (ResourceGatherer.js 175-210): the switch-of-kind rule (192-193).
- `ResourceSupply.prototype.TakeResources` (`.../components/ResourceSupply.js` 214-223): the source side of the take.
- `GarrisonHolder.prototype.IsAllowedToGarrison` (`.../components/GarrisonHolder.js` 157-167): size-weighted admission.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Carry a fixed amount per kind; room = cap minus carried; take the smaller of the tick amount and the room | Cap 10 per kind (template); tick amount 1 (ResourceGatherer.js 38) |
| The source reports what it really gave and whether it is empty; the carrier adds only that | Source clamps at 0 (ResourceSupply.js 237) |
| Stop reasons: full, source gone, out of range | Strings "InventoryFilled", "TargetInvalidated", "OutOfRange" (ResourceGatherer.js 256, 262, 286) |
| Tick interval from rate | `1000 / rate` ms (201) |
| Drop-off: owner receives every accepted kind in one call, the carrier subtracts the same amounts | No cap on the owner's stock (Player.js 270) |
| Size-weighted slot admission | Garrison Max from template; Size per unit from the Garrisonable schema (Garrisonable.js 8) |

## 4. TypeScript sketch

simplified: keeps the donor's order for one tick (stop checks and take with room), the switch-of-kind rule (as the donor does it, a drop with no refusal), the one-call commit (accepted kinds only, subtract exactly what was taken, delete zero kinds), and the garrison admission sum. It omits: the stop-reason checks before the take (source missing, out of range, face target); the statistics counter; the last-carried-kind record; the owner check and the mutual-ally check in CanReturnResource; the timer and the rate formula; and the modifier application. `unitSize` is an input because the donor's `UnitSize()` was not read. The sketch does not refuse the kind switch; section 5 proposes that Frankendom refuses it instead.

```ts
// Licence: GPL-2.0-or-later (donor, binaries/data). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Carrier {
  capacity: Record<string, number>;   // per kind; a kind with no entry cannot be carried
  carrying: Record<string, number>;   // kind -> amount carried (a key may hold 0)
}

interface Supply { kind: string; amount: number; }

interface Dropsite { accepts: Set<string>; ledger: Record<string, number>; }

type Stop = "InventoryFilled" | "TargetInvalidated";

// One gather tick: take at most perTick of the supply's kind, never past the carrier's capacity.
function gatherTick(c: Carrier, s: Supply, perTick: number): Stop | undefined {
  if (s.amount <= 0) return "TargetInvalidated";
  const cap = c.capacity[s.kind] ?? 0;
  const have = c.carrying[s.kind] ?? 0;
  const taken = Math.min(perTick, cap - have, s.amount);
  s.amount -= taken;
  c.carrying[s.kind] = have + taken;
  if (have + taken >= cap) return "InventoryFilled";
  if (s.amount === 0) return "TargetInvalidated";
  return undefined;
}

// Starting a gather of another kind. The donor drops the whole load here (no refusal); the sketch keeps the donor rule.
function startGather(c: Carrier, kind: string): void {
  if (Object.keys(c.carrying).some(k => k !== kind)) c.carrying = {};
}

// Commit = one drop-off: the dropsite takes every kind it accepts into the owner's ledger (no cap),
// and the carrier subtracts exactly what was taken. Kinds not accepted stay carried.
function commit(c: Carrier, d: Dropsite): Record<string, number> {
  const taken: Record<string, number> = {};
  for (const kind of Object.keys(c.carrying)) {
    if (d.accepts.has(kind)) taken[kind] = c.carrying[kind];
  }
  for (const kind of Object.keys(taken)) d.ledger[kind] = (d.ledger[kind] ?? 0) + taken[kind];
  for (const kind of Object.keys(taken)) {
    c.carrying[kind] -= taken[kind];
    if (c.carrying[kind] === 0) delete c.carrying[kind];
  }
  return taken;
}

// Size-weighted slot admission (GarrisonHolder): fits if the holder's occupied slots plus the unit's own size
// plus whatever the unit already holds stay within capacity. unitSize is an input here (its donor source was not read).
function canGarrison(h: { capacity: number; occupied: number }, unitSize: number, unitHeld: number): boolean {
  return h.occupied + (unitSize + unitHeld) <= h.capacity;
}

export {};
```

## 5. Lands in

- TARGET `origins/inventory/carry.ts` (proposed name; the Frankendom tree was not read, per the batch rule). Holds the per-kind carry cap, the one-tick take, and the one-call drop-off, all called from the server. One ledger: the drop-off is the only place a carried kind becomes owned stock.
- Parity row: no row in 1-23 covers carry caps, drop-off or slot weight. The nearest is row 21 (catalogue fields), because the caps are template fields (`Capacities`) and the kind filter is a template list. The server tick (fixed step, input intake, per-tick NPC budget) is row 18 / post-K item 3; the gather tick is a timer, which is a consequence of that, not the mechanism itself.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one ledger: one drop-off call moves carried stock into owned stock); rules 7-9 n/a

Best transferable idea: A carrier holds a fixed count per kind, takes only what the source actually gives each tick, and pays out in one drop-off call that moves exactly the accepted amounts into the owner's ledger.
Decision (proposed): adapt. Take the per-kind cap, the one-call drop-off, and the size-weighted slot check for multi-slot units (bags or garrisons), so one ledger and "weight and capacity" both have a rule. Change the switch rule: the donor drops the load silently (ResourceGatherer.js 192-193, 413-419), which would break one ledger; Frankendom refuses the switch and keeps the load.
Acceptance: A server test: a carrier with cap 10 takes at most 1 per tick and reports "full" at 10; switching to another kind is refused with the load unchanged; a drop-off moves the whole accepted load into the player's ledger in one call and leaves unaccepted kinds on the carrier; a 2-slot unit is refused by a holder with 1 slot free.

## 6. Gaps and risks

- The donor's commit is two halves joined by convention: the dropsite adds to the owner, and the caller subtracts what the dropsite returned (ResourceGatherer.js 402-405). Nothing enforces that both happen together. Frankendom must do both in one server transaction.
- The donor drops resources on a kind switch and says they "just vanish" (ResourceGatherer.js 413-414). This is silent loss. It cannot be copied under one ledger.
- No stock cap: `Player.AddResources` adds without limit (Player.js 270). Frankendom needs a cap per kind as catalogue data.
- Capacities are template numbers with modifiers applied by `ApplyValueModificationsToEntity` (ResourceGatherer.js 136). The modifier sources (techs, auras) were not read. Frankendom should keep caps as catalogue fields, not as constants in the component.
- The gather tick is a timer with interval 1000 / rate ms (201-207). The simulation timer's step model was not read (not read), so it cannot be cited for Frankendom's fixed-step server tick.
- The four UnitAI call sites of CommitResources (2682, 2837, 3137, 3302) were not read, so the full return flow (when the unit decides to commit) is not checked.
- The donor supports several kinds at once in principle (ResourceGatherer.js 44-46) but the rest of the game assumes one. Frankendom must decide and test that one choice.
- Garrison admission: `UnitSize()` was not read, so the unit's slot size source is not checked; the rule above is the sum check only.
