# EQEmu (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/EQEmu/zone/attack.cpp` (owner-hit retaliation in `CommonDamage`, 4121-4160; hate join in `Mob::AddToHateList`, 3054-3290) with `/mnt/frankendom-donors/EQEmu/zone/entity.cpp` 4326-4390, `zone/pets.cpp` 84-334, `zone/mob_ai.cpp` 1398-1446 | Licence: GPL-3.0 (repo `LICENSE.md` is GNU GPL v3, Version 3, 29 June 2007) | C++ | symbol `EntityList::AddTempPetsToHateListOnOwnerDamage` (with `Mob::CommonDamage` pet block and `NPC::TryDepopTargetLockedPets`)

Checked: Read in full the owner-hit retaliation block (`attack.cpp` 4121-4160), the swarm-pet functions (`entity.cpp` 4326-4390), the summon path (`pets.cpp` 71-318: `MakePoweredPet`, including the target-lock branch 287-316), the target-lock depop (`pets.cpp` 319-334; `npc.cpp` 533-540), the destructor depop (`mob.cpp` 534-576), and the pet follow branch (`mob_ai.cpp` 1398-1446). Partly read: `attack.cpp` 2470-2660 and 2835-2925 (NPC death: XP and loot owner), 3054-3290 (`AddToHateList`), `corpse.cpp` 88-180, 999-1138, 1955-2041, 2243-2377 (corpse decay, rez and summon, used only for context), `spell_effects.cpp` 1280-1300, 1712-1725, 1787-1862 (summon, rez and corpse-summon branches). Not read: `Pet::` class members, `DistanceSquared` (whether it includes z; the z test is separate in the code), `SetPetOrder`, the Sit and Feign follow-up, the hate-list internals, `GetFocusEffect`, the pets table, bot pets, the `EntityList` pet cleanup at zone end. Constants from `common/emu_constants.h` 878-905 and `common/ruletypes.h` (grep lines), `common/features.h` 146-147. camera_scope: n/a (not a camera topic). Confidence: high on the owner-hit and target-lock rules (read in full). Medium on the follow leash bands (read in full, DistanceSquared not read). The snap-branch defect is read directly.

Best transferable idea: a summoned pet joins the fight the moment its owner is hit (unless held, already engaged, immune or a familiar), and a target-lock summon vanishes whenever its caster's target changes, so every summon is tied to the current fight.
Decision (proposed): adapt - keep the owner-hit join and the target-lock tie, cap the joins at Frankendom's MAX_ATTACKERS = 3 (the donor has no cap), and apply the same hold gate to swarm pets as to main pets; reject the donor's self-unsummon with 20k damage (use the engine's own removal) and the dead snap branch (replace with a defined teleport).
Acceptance: a player is hit by a wolf while a companion stands on Follow; the companion steps in and attacks the wolf within one AI movement tick (100 ms), a fourth companion does not join a fight that already has three attackers, and a target-lock summon is removed on the same server tick its caster switches target.

## 1. Mechanism

- **Summon gate.** A caster with a pet cannot summon another: `MakePoweredPet` returns early when `HasPet()` (`pets.cpp` 84), and the pet spell branch sends "only one pet" when `GetPet()` is set (`spell_effects.cpp` 1291-1297). So one main pet per caster.
- **Pet power (scaling).** Power comes from focus or the spell (`act_power`). Stat scaling applies only when the caster is a client or bot and the pets-table row has `petpower` -1 (`pets.cpp` 123). With scale = power / 100 (125): max HP x (1 + scale) (128), AC x (1 + scale) (130), min and max damage x (1 + scale / 2) (132), size up to 3x, and level gain of `1 + power / 25`, capped by the rule `PetPowerLevelCap` (default 10, `ruletypes.h` 295; 131). Live AA "Elemental Durability" adds a percentage to max HP (`PetMaxHP`, not receipted).
- **Owner-hit retaliation (main pet).** Inside `Mob::CommonDamage`, after an attack lands on the owner, the owner's main pet joins the attacker if all of these hold: the pet is not a familiar (4127), not aggro-immune, not already engaged (4129), not Ghold (4136), not Held (4138; receipt not possible, quote 14 characters), the attacker is not the owner itself, not a corpse, not a trap (4137). When the owner is a client and the pet is not on stop, a sitting pet goes back to its previous order and stands (4141-4147); the pet then adds the attacker to its hate list and targets it (4153-4154). The donor comment at 4121-4122 says Hold pets without Focus engage "if they're engaged"; the gate read does not check Focus, so the code and comment disagree. I did not read where Focus is defined.
- **Swarm pets (temporary pets).** A mob that owns swarm pets joins them to its fights: when it adds a target to its hate list, its swarm pets add the same target (`attack.cpp` 3289-3290; `entity.cpp` 4340-4357) unless they are aggro-immune. When the owner is hit, `AddTempPetsToHateListOnOwnerDamage` (4364-4390) adds the attacker to each swarm pet that is not engaged, not aggro-immune, and not a corpse or trap, and sets the attacker as its target (4385-4386). No Hold check is applied to swarm pets in this path (the main-pet path has one).
- **Main pet on a hate join.** When a mob adds a target to its hate list, its main pet gets the same target (`attack.cpp` 3267), unless the pet is aggro-immune or a familiar (gate block starts at 3252).
- **Target-lock (summon tied to the caster's target).** A pet with `PetType::TargetLock` (value 5; `emu_constants.h` 896-902) is only activated if the caster has a target that is not the caster; for a self-cast spell the target must be within 200 units (`pets.cpp` 287-297). An activated pet gets the target as hate (1 point), stores the target id as its lock, and gets aggro immunity (305-308). If the gate fails the pet casts a self-unsummon (`SPELL_UNSUMMON_SELF`, "damages self for 20K", 311) and is killed if still alive.
- **Target-lock tie.** `NPC::SetTarget` returns early if the target is unchanged (534). Otherwise, if the pet has a lock id, it calls `TryDepopTargetLockedPets` (538). That check (`pets.cpp` 319-334) runs when the new target is null, is not the lock id, or is a corpse (321). Then a locked pet (or an auto-locked swarm pet) is removed: the self-unsummon, then `Kill()` if still alive (334). So a target-lock pet goes the moment its owner's target changes, dies or becomes a corpse. The check is event-driven (on target change), not a per-tick scan.
- **Follow leash (main pet, `mob_ai.cpp` 1398-1446).** The pet branch runs on the AI movement timer (100 ms; `features.h` 146). Squared distance: under 400 (20 units) and no level change over 100: stop (1409, 1442). From 1225 (35 units): run (1416). From 202500 (450 units) or a level change over 100: the "snap" branch (1423). The snap branch (1423) calls the same `WalkTo` or `RunTo` as the else branch, so the snap has no effect (defect, see section 6).
- **Owner death and swarm pets.** Swarm pets are depopped in the owner object's destructor (`mob.cpp` 573-574), not at the moment the owner dies. A dying swarm pet decrements its owner's temp pet count (`attack.cpp` 2543-2546).
- **Kill and XP ownership.** On an NPC death (`attack.cpp` 2470 onward), the XP owner is the top of the hate list (the killer, read at 2549); if that mob has an owner, the XP goes to the owner's ultimate owner only when the owner is in the same group or raid (2618-2633). Loot: the killer gets loot slot 0 (2863); group members fill later slots; raid loot types decide who (LeaderOnly, LeaderAndGroupLeadersOnly, LeaderSelected, EntireRaid; 2871-2909, partly read).
- **Corpses (context only).** NPC corpse decay is 450000 ms below level 55 and 1500000 ms at level 55 and up (`ruletypes.h` 675-676); loot unlocks for everyone after 150000 ms (677); a player corpse can be resurrected for 3 hours by default (54). Corpse summon needs the owner or consent (name, guild, group, raid; `corpse.cpp` 1955-2000, read). These are secondary here; ModernUO covers corpse mechanics in more depth.

## 2. Key functions

- `Mob::CommonDamage` owner-hit pet block (`attack.cpp` 4121-4156) and swarm call (4158-4159): main-pet retaliation and swarm retaliation.
- `EntityList::AddTempPetsToHateList` (`entity.cpp` 4340-4357): swarm pets take the owner's target.
- `EntityList::AddTempPetsToHateListOnOwnerDamage` (`entity.cpp` 4364-4390): swarm pets take the attacker.
- `EntityList::DestroyTempPets` (`entity.cpp` 4326-4336): depop swarm pets by owner id.
- `Mob::~Mob` (`mob.cpp` 534-576): owner destructor depops temp pets (573-574).
- `Mob::AddToHateList` (`attack.cpp` 3054-3290): owner and pet hate join (3267) and swarm join (3290).
- `MakePoweredPet` (`pets.cpp` 81-318): one-pet gate (84), power scaling (123-132), target-lock summon (287-316).
- `NPC::TryDepopTargetLockedPets` (`pets.cpp` 319-334) and `NPC::SetTarget` (`npc.cpp` 533-540): target-lock tie.
- Pet follow branch (`mob_ai.cpp` 1398-1446): leash bands and snap.
- `NPC::Death` (`attack.cpp` 2470 onward): XP owner (2618-2633), loot slots (2863-2909).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One pet per caster: early return when a pet exists | Gate at `pets.cpp` 84; spell message at 1291 |
| Pet strength from a power number: scale = power / 100 | HP x (1 + s) (128); AC x (1 + s) (130); damage x (1 + s / 2) (132); power 25 per level (131) |
| Level gain capped (intended: min(1 + power / 25, cap)) | Cap 10 (`ruletypes.h` 295); code compares the gain with level + cap (131) |
| Owner-hit retaliation with a set of stance gates | Familiar, aggro immune, engaged, Ghold, Held, self, corpse, trap (4121-4138) |
| Target-lock: summon needs a target, self-cast within 200 units | 200 (296); lock id (307); aggro immunity (308) |
| Target-lock ends on target change, death or corpse | Event-driven (538); checks at 321 and 334 |
| Follow: stop inside 20 units, run from 35, snap from 450 | Squared 400, 1225, 202500 (1409, 1416, 1423); z-diff 100 |
| AI movement and think ticks | 100 ms (`features.h` 146); 50 ms (147) |
| Swarm pet depop on owner destruction | Owner destructor (573-574) |
| XP to an owner's ultimate owner only in the same group or raid | 2618-2633 |
| Corpse decay and unlock by NPC level band | Minor 450 s, major 1500 s, unlock 150 s (`ruletypes.h` 675-677) |

Which numbers suit a fast mobile fight: the 100 ms movement tick is fast enough for a companion to join in a beat; the 20-unit stop and 35-unit run radii are tight but workable for a melee companion in a phone-size frame; the 450-unit snap is too far to be useful as a leash. A 200-unit self-cast range for a target-lock summon reads well at phone scale. Power scaling as a percentage of stats is easy to tune as data.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's gate order for owner-hit joins (not the owner, no corpse or trap; familiar and immunity and engaged skips; hold gate for main pets only) and the target-lock end rule, and adds the Frankendom attacker cap. It omits the per-type immunity flags (bot, client, NPC), the pet sit and stand fix, the Focus check (not read), the hate amounts (the donor adds 1 point and sets the target), the 20k self-unsummon damage (replaced by a plain removal), the summon-time range gate and the pet power scaling. Its `followStep` fixes the donor's dead snap branch by making snap a teleport beside the owner; this is a design choice, not the donor's behaviour.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface Pet {
  id: string;
  ownerId: string;
  kind: "main" | "swarm";
  familiar: boolean;          // familiars never join an owner's fight
  aggroImmune: boolean;       // others may not add this pet to a hate list
  engaged: boolean;           // already in a fight
  held: boolean;              // Hold stance; main pets only, per the donor gate
  gheld: boolean;             // never auto-engages
  targetLockId: string | null; // target-lock pets keep the caster's target id
}

export interface Attacker { id: string; kind: "npc" | "client" | "bot" | "corpse" | "trap"; }

// Frankendom ruling; the donor has no cap on pets joining one fight.
export const MAX_ATTACKERS = 3;

// The owner was hit: free pets of that owner join the attacker.
export function petsAnswerOwnerHit(
  ownerId: string, attacker: Attacker, pets: Pet[], attackersAlready: number,
): string[] {
  if (attacker.kind === "corpse" || attacker.kind === "trap" || attacker.id === ownerId) return [];
  const joined: string[] = [];
  for (const p of pets) {
    if (p.ownerId !== ownerId || p.familiar || p.aggroImmune || p.engaged) continue;
    if (p.kind === "main" && (p.held || p.gheld)) continue;
    if (attackersAlready + joined.length >= MAX_ATTACKERS) break;
    joined.push(p.id);
  }
  return joined;
}

// The owner engaged something: swarm pets add that target to their hate lists.
export function swarmJoinOnOwnerEngage(ownerId: string, pets: Pet[]): string[] {
  return pets.filter((p) => p.ownerId === ownerId && p.kind === "swarm" && !p.aggroImmune).map((p) => p.id);
}

// Swarm pets end with their owner's object (donor: the owner destructor depops them).
export function swarmRemovedWithOwner(ownerId: string, pets: Pet[]): string[] {
  return pets.filter((p) => p.ownerId === ownerId && p.kind === "swarm").map((p) => p.id);
}

// Summon-time gate for a target-lock pet: needs a target; a self-cast needs the target within 200 units.
export function targetLockSummonOk(selfCast: boolean, hasTarget: boolean, distance: number): boolean {
  if (!hasTarget) return false;
  return selfCast ? distance <= 200 : true;
}

// Called only when the caster's target actually changes. Ends a target-lock pet when the new target
// is gone, is not the locked id, or is a corpse. The donor then unsummons it (20k self damage, then Kill).
export function targetLockEnds(p: Pet, newTarget: { id: string; isCorpse: boolean } | null): boolean {
  if (p.targetLockId === null) return false;
  if (newTarget === null) return true;
  return newTarget.id !== p.targetLockId || newTarget.isCorpse;
}

export type FollowStep = "hold" | "walk" | "run" | "snap";

// Squared distance thresholds from the donor: 400 (20 units) stop, 1225 (35) run, 202500 (450) snap.
// Fix: the donor's snap branch calls the same walk or run as the else branch; here snap is a teleport beside the owner.
export function followStep(distSq: number, zDiff: number): FollowStep {
  if (distSq < 400 && zDiff <= 100) return "hold";
  if (distSq >= 202500 || zDiff > 100) return "snap";
  return distSq >= 1225 ? "run" : "walk";
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/mg009-eqemu-pet-engagement.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/companions.ts` (new module: a companion joins an owner's fight through the engine's attacker cap, and a target-lock summon is removed by the engine when its caster's target changes). Parity-checklist row 4 (fight loop: aggro, chase, leash). Row 13 (specials) is the brief's hint; the join and leash here are aggro and chase, so row 4 is the one that fits.
- today: (not checked in this pass; this reader did not open the Frankendom repo).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients): the join, the cap and the target-lock removal happen in the engine, not the client. Rule for MAX_ATTACKERS = 3 applies to joins.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and typechecks; it is not a translation.
- Dead snap branch (`mob_ai.cpp` 1423): both branches call the same `WalkTo` or `RunTo`, so the 450-unit "snap" does nothing different. The comment says "Snap to owner". Fix: define snap as a teleport beside the owner, and test it.
- Level gain cap is compared wrong (`pets.cpp` 131): the test is `gain > level + cap`, not `gain > cap`, so a pet gains more levels than the rule allows once its level is low (for example, at power 250 a level-5 pet gains 11 levels, one over the 10 cap). Fix: `min(1 + floor(power / 25), cap)`.
- The Hold and Focus comment (`attack.cpp` 4121-4122) does not match the gate (4136-4138: Ghold and Held exclude; no Focus check). Frankendom should pick one rule and test it. Swarm pets have no Hold check at all (`entity.cpp` 4377-4385): treat as a choice and apply the same gate.
- Owner-hit joins have no cap in the donor. Frankendom's `MAX_ATTACKERS = 3` must bound the join count on one target (sketch).
- Self-unsummon with 20k damage is a hack to remove a pet through the spell system (`pets.cpp` 311, 334). Frankendom should remove the pet directly in the engine, with a server-verified removal.
- Swarm pets depop in the owner's destructor, not at owner death (`mob.cpp` 573-574). For Frankendom, an owner's death should remove its swarm pets on the same tick; that is a design choice, not the donor's behaviour.
- XP and loot ownership (`attack.cpp` 2618-2633, 2863-2909) use the hate-list top and group or raid membership; Frankendom's one ledger and server-verified kills should credit damage through the ledger, which belongs to parity row 18, not row 4. Cross-check before building.
- Corpse numbers (ruletypes 54, 675-677) are per-server rules. In Frankendom they are zone data candidates.
- Not read: `Pet::` class members, `DistanceSquared` (whether it includes z), `SetPetOrder`, the Sit and Feign follow-up, Focus definition, the hate-list internals, the pets table, bot pets. The camera is not part of this topic.
- Reuse tag and brief rule as in section 5.
