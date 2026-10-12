# ACEmulator-ACE (pets-mounts-taming, cell 2)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Pet.cs` | Licence: AGPL-3.0 (`LICENSE` at the donor root is GNU Affero GPL v3; no per-file override read) | C# | symbol `Pet.SlowTick`

Checked: Read in full: `Pet.cs` 20-316 (Init, HandleCurrentActivePet_Replace and _Retail, Tick, SlowTick, StartFollow, MoveTo, OnMoveComplete, GetPetRadius). `CombatPet.cs` 1-137 (Init, FindNextTarget, GetNearbyMonsters). `Monster_Tick.cs` 1-45 (the dispatch that sends passive pets to `Pet.Tick`). `WorldObject_Use.cs` 50-75 (`GetCylinderDistance`). `PetDevice.cs` 1-200 and 560-608 in full (ActOnUse, CheckUseRequirements, SummonCreature, the Refill tail, VerifyUseRequirements); `PetDevice.cs` 201-559 was only grepped (the essence-to-wcid table and the Refill head). Candidate files opened for the topic: `Pet.cs`, `PetDevice.cs`, `CombatPet.cs`, `Monster_Tick.cs`, `WorldObject_Use.cs`; `Pet_Monster.cs` (74 lines) was not read. `PropertyManager.cs` 577 seen by grep only. Not read: the landblock loop that calls `Monster_Tick` (`Landblock.cs` 552, grep only), `Creature` physics `MoveToObject`, `InFrontOf`, `GetPhysicsRadius`, `Destroy` side effects, the summon cooldown (`NextUseTime` on the device, not located), `VisualAwarenessRangeSq` value. A grep of ACE.Server and ACE.Entity for mount, taming, tame, stable and loyal found no pet mount, taming, stabling or pet-loyalty code; the only "Loyalty" hits are allegiance (`AllegianceManager.cs` 265-279). Essence tiers appear only as comments at `PetDevice.cs` 181-199. Confidence: high on the follow-leash order and the constants; medium on the unit (ACE physics coordinates read as metres by convention, not checked). camera_scope: n/a.

Best transferable idea: a companion stands within 2 m of its owner, walks back only when farther than 2 m, and is removed server-side when the owner is more than 192 m away or gone, checked once a second on a timer inside a 0.2 s tick.
Decision (proposed): adapt - a companion follow-and-leash for hero allies in open zones is useful; the donor's missing return after its despawn is a real defect (fixed in the sketch), and the 192 m despawn should be zone data, not a constant.
Acceptance: In an open zone, a companion stays about 2 m from its hero, walks back once the hero is more than 2 m away, and the server removes it when the hero is more than 192 m away or gone; a server test asserts that a despawn never starts a follow.

## 1. Mechanism

- Driver: the monster tick. `Monster_Tick` (`Monster_Tick.cs` 19-32) checks `IsPassivePet` and sends the creature to `Pet.Tick`. `Pet.Tick` schedules its next call 0.2 s ahead (`monsterTickInterval`, `Monster_Tick.cs` line 10; `Pet.cs` 182). The comment at `Pet.cs` 177-178 says `Tick` is called 5x per second. Which loop calls `Monster_Tick` at that cadence was not read.
- Spawn (`Pet.Init`, 62-114). Order: (a) `HandleCurrentActivePet` (64) stows or refuses the owner's current pet (section 2 below); (b) spawn distance = owner physics radius + pet radius + 2.0 (70-73, `MinDistance` at 228); (c) passive pets are placed in front of the owner (77) with `TimeToRot = -1` (79) and no corpse (94); (d) `EnterWorld` (96); failure sends an error and returns false (98-102); (e) the owner's `CurrentActivePet` is set (104), the device is linked (106-108), and for passive pets the first slow-tick time is set to now (110-111).
- Each `Tick` (180-195): if the pet is moving, it updates physics and broadcasts position (184-190). Then if `currentUnixTime >= nextSlowTickTime`, it runs `SlowTick` (193-194).
- `SlowTick` (203-223), once per second (`slowTickSeconds`, 197): (a) advance the clock by 1.0 s first (207); (b) if the owner or its physics is missing, log and destroy, then return (209-213); (c) distance = cylinder distance to the owner (216); (d) if distance > 192.0 m, destroy (218-219), and then (no return) (e) if not moving and distance > 2.0 m, start following (221-222).
- `StartFollow` (231-253): `IsMoving = true`, broadcast a move to the owner at the run rate (240), then server-side `MoveToObject` with `DistanceToObject = 2.0` (244, 249) and `WalkRunThreshold = 0` (245), and `UpdateTime` set to now to avoid a snap (252).
- `OnMoveComplete` (285-300): for passive pets, a finished move with no error clears `IsMoving` (298-299).

## 2. Key functions

- `Pet.SlowTick`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Pet.cs` 203-223. The 1 s leash: owner gone, despawn past 192 m, follow past 2 m.
- `Pet.Tick`: `Pet.cs` 180-195. The 0.2 s entry point that gates the 1 s check.
- `Pet.Init`: `Pet.cs` 62-114. Spawn point, ownership, registration.
- `Pet.StartFollow` and `Pet.OnMoveComplete`: `Pet.cs` 231-253 and 285-300.
- Summon rules, for the record (not turned into a note): `PetDevice.ActOnUse` 61-101 (no charges at 75, one charge spent per summon at 86-95, a null result also charges); `PetDevice.CheckUseRequirements` 103-146 (summoning mastery at 113-117; with the server property `pet_stow_replace` on, an active combat pet always refuses a summon, 125-132; in the default retail mode it refuses unless the device's pet class weenie has WeenieType Pet, 133-143); `Pet.HandleCurrentActivePet_Retail` 145-175 (a passive device stows the active pet and returns false, so a second double-click is needed, 150-156; a combat device stows a passive pet and returns null, 157-172); `PetDevice.Refill` 560-592 (refuses when full at 568, sets structure to max at 576; the head of the function, 516-559, was grepped only).
- Combat pets, for the record (ai-aggro topic): `CombatPet.FindNextTarget` 73-96 takes the nearest visible monster inside `VisualAwarenessRangeSq` (83-91); `GetNearbyMonsters` 101-126 skips same-faction monsters unless one of them has retaliated against the owner or the pet (115-119).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Shared tick, cheap per-tick gate | 0.2 s (`Monster_Tick.cs:10`) |
| Once-a-second check on a timer inside the tick | 1.0 s (`Pet.cs:197`), advanced before the checks (207) |
| Follow-start band | start when > 2.0 m and idle; follow stops at 2.0 m (`Pet.cs:228`, 221, 244) |
| Leash despawn | > 192.0 m, or owner gone (`Pet.cs:229`, 209, 218) |
| Spawn offset | owner radius + pet radius + 2.0 m (`Pet.cs:70-73`) |
| Device charges | one charge per summon, refused at 0 (`PetDevice.cs:75`, 92) |

Formula table (file:line):

| Quantity | Formula as coded | Value | file:line |
|---|---|---|---|
| Spawn distance | `playerRadius + petRadius + MinDistance` | owner r + pet r + 2.0 m | Pet.cs:70-73 |
| Follow start | `!IsMoving && dist > MinDistance` | dist > 2.0 m | Pet.cs:221 |
| Despawn | `dist > MaxDistance` | dist > 192.0 m | Pet.cs:218, 229 |
| Slow-tick cadence | `nextSlowTickTime += 1.0` per check | 1 s, on a 0.2 s tick | Pet.cs:197, 207; Monster_Tick.cs:10 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (1 s clock advanced first, owner-gone and despawn check, then the follow start) and adds the return after a despawn that the donor lacks (defect 1 below, so the sketch does not start a follow on a removed pet). It omits the physics update of the moving pet (`IsMoving` broadcast, 184-190), the `MoveToObject` and run-rate call and the snap guard (240-252), the destroy side effects, the `TimeToRot`, corpse and device-link lines (79, 94, 106-108), the `EnterWorld` failure path (96-102), and the stow and summon rules. `dist` is a parameter (the donor computes it from physics, 216).

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Companion {
  moving: boolean;        // currently walking to the owner
  nextSlowTickS: number;  // server time of the next 1 s check
  despawned: boolean;
}

const TICK_S = 0.2;          // donor monsterTickInterval (Monster_Tick.cs:10)
const SLOW_TICK_S = 1.0;     // donor slowTickSeconds (Pet.cs:197)
const FOLLOW_START_M = 2.0;  // donor MinDistance (Pet.cs:228): start when farther, stop at this
const DESPAWN_M = 192.0;     // donor MaxDistance (Pet.cs:229)

interface CompanionStep { despawn: boolean; startFollow: boolean; }

// Called every TICK_S. The 1 s check runs only when its time is due.
// distM is the cylinder distance to the owner in metres (donor GetCylinderDistance).
function companionTick(c: Companion, nowS: number, ownerPresent: boolean, distM: number): CompanionStep {
  const none: CompanionStep = { despawn: false, startFollow: false };
  if (c.despawned || nowS < c.nextSlowTickS) return none;
  c.nextSlowTickS += SLOW_TICK_S;

  if (!ownerPresent || distM > DESPAWN_M) {
    c.despawned = true;
    return { despawn: true, startFollow: false }; // return here: the donor does not return after its despawn call
  }
  if (!c.moving && distM > FOLLOW_START_M) {
    c.moving = true;
    return { despawn: false, startFollow: true };
  }
  return none;
}

// Owner arrived or the move ended: the companion stands again (donor OnMoveComplete).
function onMoveComplete(c: Companion): void {
  c.moving = false;
}

// Spawn point: in front of the owner, far enough that the two body radii and the follow distance do not overlap.
function spawnDistance(ownerRadiusM: number, petRadiusM: number): number {
  return ownerRadiusM + petRadiusM + FOLLOW_START_M;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/ace-companion-leash.ts` with `export {}` appended) exits 0.

## 5. Lands in

- TARGET `origins/server/companions.ts` (new module, proposed): the follow-and-leash step for a hero's companion or summoned ally in open zones, run on the server world tick. Not in the duel. Parity-checklist row 21 (catalogue fields: follow and despawn distances, spawn offset), with the tick placement under the server-tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" (row 18 / post-K item 3).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine: the leash and the despawn are server state; the client only shows the companion). Zones as data for the 192 m despawn.

## 6. Gaps and risks

- AGPL-3.0: clean-room, shape only. The sketch is written from the mechanism.
- Defect 1, missing return (`Pet.cs` 218-222): after `Destroy()` on a far owner, control falls through to `StartFollow()` if the pet is not moving. Fix: return after the despawn (the sketch does), and test that a despawned companion never starts a move.
- Defect 2, charge on a null summon result (`PetDevice.cs` 86): the device is charged when the stow path returns null, which the donor comment calls retail behaviour (`Pet.cs` 167). Keep it as a retail rule only if Frankendom wants it; it is a ledger question (one ledger: one charge, one event).
- Frankendom rulings: the companion is a client-visible entity but the leash and despawn must be decided by the server (kills and state are server-verified). The camera and the companion's drawing are client-only. MAX_ATTACKERS = 3 does not apply to a follower with no attack logic; the combat-pet target search (`CombatPet.cs` 83-91) would need the engine's hate list, not this code.
- Not verified: the landblock dispatch, the physics follow (`MoveToObject`), the cooldown timer and the stow path in `PetDevice.cs` 103-146 at the cooldown; no taming, mount, stabling or levelling code exists in this donor (checked by grep).
