# Reinisch-Warcraft-Arena-Unity (netcode-session-integrity, cell 3)

Donor: `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Core/Spells/Spell.cs` (with `Server/ServerCommandRouter.cs` and `Core/Entity/Unit/Controllers/Unit.SpellController.cs`) | Licence: Unlicense, public domain dedication (`LICENSE` line 1: "This is free and unencumbered software released into the public domain.") | C# (Unity) | symbol `Spell.Prepare` / `ServerCommandRouter.OnSpellCast`

Checked: opened in full `Server/ServerCommandRouter.cs` (1-154), `Client/Net/ClientSpellResultHandler.cs` (20-50), `Core/Spells/Spell Processing/Cast/SpellCast.cs` (1-99), `Core/Utils/MovementUtils.cs` (1-12). Opened `Unit.SpellController.cs` 1-140 (CastSpell and trigger helpers), `Spell.cs` 69, 150-170, 277-353, 612-626, `SpellHistory.cs` 26-40 and 86-122, `SpellCastingOptions.cs` 5-30, `SpellInfo.cs` 11, 79-84, `SpellCastResult.cs` 1-60, `NgoNetworkController.cs` 18, 254-300, `ServerPlayerBroadcaster.cs` 8-12. Callers: `CastSpell` is called from the three router paths (65, 81, 98) and from trigger helpers (`Unit.SpellController.cs` 83-93). Not read: the bodies of `ValidateRange`, `ValidateAuras`, `ValidateCasterState`, `ValidateShapeShift`, `CheckTarget` and `CheckExplicitTarget` (called, not opened); the rest of `ValidatePowers`; `Spell.Launch` and the spell effects; `SpellManager`; the loader behind `BalanceReference.SpellInfosById`; where `PlayerManager.Player` is assigned (decides the fallback at router line 50); `ClientConnectionToken.IsValid`; the NGO message bus. Units: `castTime` and cooldown fields are ints and the donor compares them with a 200 threshold, so I read them as milliseconds; not confirmed against the data. Confidence: high on the check order, the client-supplied movement flags and the bookkeeping; medium on the threshold units; the position source for range was not read (see section 6).

Best transferable idea: Run one ordered server-side check chain per special request, start cooldowns on launch, and send the one result code back to the sender only, with the client showing server results rather than predicting them.
Decision (proposed): adapt — the ordered chain and the server-only result reply fit our rule that the server decides every request; the donor's client-supplied movement flags and its fallback to the host's player are fixed in the design, and the triggered-cast bypass stays internal.
Acceptance: A server test: a fighter whose server motion says moving sends a special with a cast time above zero, and the server returns Moving and starts no cast; a special sent during its own cooldown returns NotReady and leaves the cooldown unchanged; a special sent with the target out of range returns OutOfRange to the sender only.

## 1. Mechanism

Server authority for casts, with display-only copies on the client. Requests come in, the server runs one ordered check chain, returns one result code to the sender, and runs the cast on its own clock.

- **Request.** The client sends `SpellCastRequest(SpellId, MovementFlags)` (`Net/Abstraction/Messages/Requests/SpellCastRequest.cs` 9). `ServerCommandRouter.OnSpellCast` (53-67) resolves the caster from the sending connection (`ResolveCaster` 45-51), maps the spell id through the balance table (59), replies `SpellUnavailable` if the id is unknown (61), and calls `CastSpell` with `movementFlags: msg.MovementFlags` (65). The reply goes only to the sender (`Reply` 143-146).
- **Other request paths.** The destination variant (69-84) and the targeting variant (86-101) do not pass client movement flags; they pass a destination or a targeting source and rotation. `SpellCastingOptions` defaults `SpellFlags` to none (`SpellCastingOptions.cs` 26), and the router sets no `SpellFlags`, so a client cannot set the triggered or bypass flags through these requests.
- **CastSpell.** `Unit.SpellController.CastSpell` (55-77) builds the spell, calls `Prepare` (61); on failure it removes the spell and returns a handle with the failure (62-66). On success that is still casting, it marks the cast started and clears emote state (68-74).
- **Prepare.** `Spell.Prepare` (277-288) computes power costs (281), runs `ValidateCast` (283), and calls `Cast` only on success (287).
- **Check chain (`ValidateCast`, 290-353), in this order, first failure wins:**
  1. triggered-by-aura flag: return Success at once (292-293), skipping every later check;
  2. known spell (295-296);
  3. caster alive, unless passive or castable while dead (299-300);
  4. per-spell cooldown, with the comment "check cooldowns to prevent cheating" (302-304);
  5. global cooldown, unless the cast carries the ignore-GCD flag (307-308);
  6. already casting, unless the spell can cast while casting (311-312);
  7. combo points (314-315);
  8. explicit target and target checks, unless the ignore-target flag is set (318-330);
  9. range (332-334), auras (336-338), caster state (340-342), powers (344-346), shape-shift (348-350).
- **Begin cast (`Spell.cs` 612-626).** State becomes Casting (613). The cast is instant if the time is 0 or less, if already casting, or if the cast flags say so (619). Then the moving check (620-621) reads `casterMovementFlags`, which is the request's flags when given and the server's own motion otherwise (69). Shape-shift is removed if needed (623-624). The global cooldown starts here (626).
- **Cast progress (`Spell.cs` 150-167).** Time left goes down by the tick delta (153). At zero the spell finishes and launches (154-158). Otherwise, once more than 200 ms have elapsed (161), a spell that is not castable while moving is cancelled if the server's motion flags interrupt casts (162-165).
- **Cooldown bookkeeping (`SpellHistory.cs`).** The global cooldown starts when the spell does not have the DoesNotTriggerGcd attribute (88-96, skip at 90); a longer GCD already running is kept (93-94); it ticks down each update with a clamp at zero (31-32). A per-spell cooldown starts on launch from the spell's cooldown time (105-122, 120), ticks down each update (34-38), and the spell is ready when no cooldown is above zero (58-68).
- **Client, display only.** `ClientSpellResultHandler` (32-45): a failure raises an event and starts nothing (34-37); a success starts the display cooldown, and only for a pure remote client (40-44). A replicated cast is shown by `SpellCast` and ticked down locally between updates (68-98), cleared at zero (96-97). The client never predicts a cast: it waits for the server's result.
- **Admission (`NgoNetworkController.cs` 262-300).** The host's own client is always approved (268-273). A session is full at 8 players (276-281). The connection token must be valid (283-289) and the version must match (291-296). The approved token is stored per client (298). No reconnect or session-resume logic was found: a grep for reconnect or resume matched only a comment.

## 2. Key functions

- Router, request to result: `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Server/ServerCommandRouter.cs` 45-67 and 143-146.
- CastSpell and Prepare: `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Core/Entity/Unit/Controllers/Unit.SpellController.cs` 55-77; `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Core/Spells/Spell.cs` 277-353.
- Begin, progress and move interrupt: `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Core/Spells/Spell.cs` 150-167 and 612-626.
- Cooldowns: `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Core/Spells/Spell Processing/History/SpellHistory.cs` 29-40, 58-68, 88-122.
- Client display: `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Client/Net/ClientSpellResultHandler.cs` 32-45; `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Core/Spells/Spell Processing/Cast/SpellCast.cs` 68-98.
- Admission: `/mnt/frankendom-donors/Reinisch-Warcraft-Arena-Unity/Assets/Scripts/Net/Ngo/NgoNetworkController.cs` 262-300.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered check chain, first failure returns one result code | Result codes are an enum with fixed integers: Moving 23, NotReady 30, OutOfRange 40, SpellUnavailable 46 (`SpellCastResult.cs` 28, 35, 45, 51) |
| Move interrupt only after a threshold has elapsed | 200 (`MovementUtils.cs` 8) |
| Cast time, cooldown, global cooldown and charges as spell data | `SpellInfo.cs` 79 (cooldownTime), 81 (globalCooldownTime), 82 (castTime), 84 (charges); values per spell, not read |
| A longer running GCD is kept | Rule, no number (`SpellHistory.cs` 93) |
| Session cap | 8 (`NgoNetworkController.cs` 18) |

## 4. TypeScript sketch

simplified: keeps the donor's order (validation chain, then the start-of-cast moving check, then cost and GCD, then cast progress, then move interrupt, then launch and cooldown). Changes from the donor: the moving check reads the server's motion only; the cooldown starts on launch as in the donor; the router's client-supplied movement flags are not part of the signature at all. Omitted: the target lookup, the spell effects and damage, auras, caster state, shape-shift, combo points, charges, the ignore-GCD and ignore-target cast flags (kept out of the wire entirely in this sketch), the triggered-cast bypass (kept internal, not in this file), the power types other than one pool, the instant-cast flag, and the per-spell GCD attribute (`triggersGcd` stands in for it).

```ts
// Licence: public domain dedication (Unlicense, Reinisch-Warcraft-Arena-Unity). Clean-room sketch written from the described mechanism.

type CastResult =
  | 'Success' | 'SpellUnavailable' | 'NotKnown' | 'CasterDead' | 'NotReady'
  | 'BadTargets' | 'OutOfRange' | 'NoPower' | 'Moving';

interface SpellDef {
  id: number;
  castMs: number;            // donor SpellInfo.castTime
  cooldownMs: number;        // donor SpellInfo.cooldownTime
  gcdMs: number;             // donor SpellInfo.globalCooldownTime
  triggersGcd: boolean;      // donor: not DoesNotTriggerGcd
  castableWhileMoving: boolean;
  cost: number;
  range: number;
}

interface Caster {
  alive: boolean;
  known: ReadonlySet<number>;
  power: number;
  moving: boolean;           // SERVER motion state. A request never supplies this.
  x: number;                 // server-owned position
  z: number;
  gcdLeftMs: number;
  cooldownLeftMs: Map<number, number>;
  cast: { def: SpellDef; leftMs: number } | null;
}

interface Target { x: number; z: number; ok: boolean; }

const MOVE_INTERRUPT_AFTER_MS = 200; // donor MovementUtils.SpellMovementInterruptThreshold

// Ordered checks, first failure wins (donor Spell.ValidateCast order, minus the omitted steps).
function validateCast(c: Caster, def: SpellDef | undefined, target: Target | undefined): CastResult {
  if (def === undefined) return 'SpellUnavailable';
  if (!c.known.has(def.id)) return 'NotKnown';
  if (!c.alive) return 'CasterDead';
  if ((c.cooldownLeftMs.get(def.id) ?? 0) > 0) return 'NotReady';
  if (c.gcdLeftMs > 0 && def.triggersGcd) return 'NotReady';
  if (c.cast !== null) return 'NotReady';
  if (target !== undefined && !target.ok) return 'BadTargets';
  if (target !== undefined && Math.hypot(target.x - c.x, target.z - c.z) > def.range) return 'OutOfRange';
  if (c.power < def.cost) return 'NoPower';
  return 'Success';
}

// Start: validation, then the moving check against SERVER motion (donor fix: the request path trusts client flags).
// A longer GCD already running is kept (donor SpellHistory.StartGlobalCooldown).
function startCast(c: Caster, def: SpellDef, target: Target | undefined): CastResult {
  const checked = validateCast(c, def, target);
  if (checked !== 'Success') return checked;

  const instant = def.castMs <= 0;
  if (!instant && c.moving && !def.castableWhileMoving) return 'Moving';

  c.power -= def.cost;
  if (def.triggersGcd && c.gcdLeftMs <= def.gcdMs) c.gcdLeftMs = def.gcdMs;

  if (instant) {
    launch(c, def);
    return 'Success';
  }
  c.cast = { def, leftMs: def.castMs };
  return 'Success';
}

// Launch: the cooldown starts here, not at the start of the cast (donor HandleCooldown). Effects omitted.
function launch(c: Caster, def: SpellDef): void {
  if (def.cooldownMs > 0) c.cooldownLeftMs.set(def.id, def.cooldownMs);
}

// Per-tick update, donor order: GCD and cooldowns down, then cast progress, then the move interrupt.
type TickEvent = 'Idle' | 'Progress' | 'Launched' | 'Interrupted';

function tickCaster(c: Caster, dtMs: number): TickEvent {
  c.gcdLeftMs = Math.max(0, c.gcdLeftMs - dtMs);
  for (const [id, left] of c.cooldownLeftMs) {
    if (left > 0) c.cooldownLeftMs.set(id, left - dtMs);
  }

  const cast = c.cast;
  if (cast === null) return 'Idle';

  cast.leftMs -= dtMs;
  if (cast.leftMs <= 0) {
    c.cast = null;
    launch(c, cast.def);
    return 'Launched';
  }

  const elapsedMs = cast.def.castMs - cast.leftMs;
  if (elapsedMs > MOVE_INTERRUPT_AFTER_MS && c.moving && !cast.def.castableWhileMoving) {
    c.cast = null;
    return 'Interrupted';
  }
  return 'Progress';
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, with `export {};` appended in a copy, exit 0 (sketch `NW003/work/Reinisch-cast-validation.ts`).

## 5. Lands in

- TARGET `src/fight/specials.ts` (new module): server-side validation and bookkeeping for specials (cast time, cooldown, global lockout, move interrupt), called from the fight intake. Parity-checklist row 13 (specials).
- today: (not read: the Frankendom repo was not opened in this pass).
- Reuse tag: rewrite-from-idea (Unlicense: the code may be taken as is; the sketch is clean-room and the shape is what we want)
- Brief rule served: 1 (the server decides every request from its own state); rules 7-9 n/a

## 6. Gaps and risks

- **Client movement flags drive the start check (defect).** `ServerCommandRouter.cs` 65 passes the client's `MovementFlags` into the cast, `Spell.cs` 69 uses them when given, and the start check at 620 reads them. A client that is moving can claim to be still and start a non-instant cast it should not start. Fix: use server motion only, as the sketch does. The donor's other two request paths already avoid this by not passing flags.
- **Mid-cast interrupt has a 200 ms blind spot (design).** A move interrupt cannot fire until more than 200 ms have elapsed (`Spell.cs` 161). A cast of 200 ms or less completes even when the server sees movement. Frankendom should state per special whether it may complete while moving; recommendation: no for fight specials.
- **Movement is client-authoritative (design, anti-cheat gap).** `ServerPlayerBroadcaster.cs` 11 says so in its own comment. The range check (`ValidateRange`, not read) therefore works on positions the client drives. Our server-verified kills rule needs the server to own the position used for range.
- **Unregistered senders act as the host (defect).** `ServerCommandRouter.cs` 47-50 falls back to `world.PlayerManager.Player` when the sender has no registered player. The router's comment says this is for single-player and pre-registration. On a host it lets an unknown connection cast as the host. Fix: refuse, do not fall back. Whether `PlayerManager.Player` is null on a dedicated server was not read.
- **Triggered-cast bypass skips every check (latent risk).** `Spell.cs` 292-293 returns Success before any check when the triggered flag is set. The router does not expose the flag today. Any future route that carries cast flags from the wire would skip cooldowns, range and power. Fix: keep the bypass internal in our build; no wire field for it.
- **Chat has no rate or length limit (gap, not fight).** `ServerCommandRouter.cs` 134-141 broadcasts every message to everyone. Flag to the chat lane.
- **No prediction (design choice).** The client starts its display cooldown only after the server accepts (`ClientSpellResultHandler.cs` 34-44), so there is no rollback. The cost is one round trip before the action bar moves. Decide in ruling 3.
- **No reconnect or session resume.** A dropped client is approved again with a new token (`NgoNetworkController.cs` 283-298) and this donor keeps no fight state for it. Our one-ledger rule needs a resume rule; the 2004Scape and Open-RSC notes show two options.
- **Donor history is thin.** No git history and no changelog (grep of README for exploit, cheat, fix and changelog found nothing). The only exploit-related comment is "check cooldowns to prevent cheating" (`Spell.cs` 302).

## 7. PASS2 extras

- **As-data shape.** Spell rows are `SpellInfo` assets (`ScriptableUniqueInfo<SpellInfo>`, `SpellInfo.cs` 11). Fields read: `castTime` (82), `cooldownTime` (79), `globalCooldownTime` (81), `charges` (84), plus attribute flags checked by name (`DoesNotTriggerGcd`, `CastableWhileMoving`, `CanCastWhileCasting`, `CastableWhileDead`, `RequiresComboPoints`). Row fields: id: int, castTime: int, cooldownTime: int, globalCooldownTime: int, charges: int, attributes: flag set. A new spell is one row: yes, provided the balance reference loads the new asset (the loader was not read). A new check in the chain is one row: no, it is a method in `Spell.ValidateCast`. A new result code is one enum line: yes (`SpellCastResult.cs`, fixed integer values).
- **Provenance.** Repo Reinisch-Warcraft-Arena-Unity; Unlicense (`LICENSE` line 1). Every claim is in sections 1-3 with file and line; the receipts file has the rows (verifier passed on all 182 rows across the three donors).
- **What they patched later.** No history available (no `.git` directory, no changelog). Comments only: "check cooldowns to prevent cheating" (`Spell.cs` 302); "A host's real cast already started its cooldowns" (`ClientSpellResultHandler.cs` 29), which marks a host/remote split that was fixed in code, not in history. Two TODOs about map traversal and visibility in `Net/Ngo/NgoEntitySpawner.cs` (148, 204) are not netcode-session topics.
- **Rulings for Dom.**
  1. Should the server own the position used for range and the moving check for every fight action? Recommendation: yes; the donor trusts the client here, which our server-verified kills ruling rules out.
  2. Should an unregistered connection be refused, not applied to the host's own player? Recommendation: yes, refuse.
  3. For v1, should the Pit show special cooldowns only after the server accepts (donor style), or predict locally and roll back? Recommendation: server result only for v1; add prediction only if the round trip is felt on a phone.
- **Core slice.** Feeds parity row 13 (specials) through `src/fight/specials.ts` and the intake check in row 5. Ruling 1 touches row 5 and the one-ledger rule.
