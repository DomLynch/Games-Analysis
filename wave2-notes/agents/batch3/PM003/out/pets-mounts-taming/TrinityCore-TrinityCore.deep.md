# TrinityCore-TrinityCore (pets-mounts-taming, cell 29)

Donor: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/scripts/Spells/spell_hunter.cpp` (plus `src/server/game/Spells/SpellEffects.cpp`, `Entities/Creature/CreatureData.h`, `Entities/Pet/PetDefines.h`, `Entities/Unit/Unit.cpp`) | Licence: GPL-2.0 (COPYING file is GNU GPL version 2, June 1991; source headers say "version 2 of the License, or (at your option) any later version", i.e. GPL-2.0-or-later) | C++ | symbol `spell_hun_tame_beast::CheckCast`

Checked: read in full: `spell_hunter.cpp` 1600-1668 (CallPetSpellIds table and CheckCast), `SpellEffects.cpp` 2606-2653 (EffectTameCreature), `CreatureData.h` 547-559 (IsExotic, IsTameable), `PetDefines.h` 35-48, `Unit.cpp` 11160-11237 (CreateTamedPetFrom, InitTamedPet), `Pet.cpp` 105-154 (GetLoadPetInfo), `Pet.cpp` 716-765 (GivePetXP, read for section 6). Read in part: `Unit.cpp` 8303-8341 and 8800-8880 (mount and mounted speed), `Player.cpp` 2236-2248 and 2474-2484 (owner level-up and spec-change pet sync; GiveLevel start at 2168 by grep). Grep-read only: `KillRewarder.cpp` 166, `SpellAuraDefines.h` 233. Not read: the tame spell's data row (any creature-health gate would live there), `SendTameFailure` and packet code, the stable-swap handler beyond `Player.cpp` 29668-29700, other callers of `GetLoadPetInfo`, and where a `PetStable` object is created. Confidence: high on the order of the taming checks (both functions read end to end, no random roll found in either); medium on the claim that every caster has a stable object (the donor skips the slot checks when none exists and I did not trace where it is created).

## 1. Mechanism

- A tame is a cast. The cast check (`CheckCast`, 1612-1668) runs before the effect and returns a refusal code or `SPELL_CAST_OK`. The checks run in this order:
  (a) a player caster and an explicit unit target, else refuse (1614-1619);
  (b) target level must not exceed the tamer's level, else `SPELL_FAILED_HIGHLEVEL` (1623-1624);
  (c) `IsTameable(canTameExotic, difficulty)` must pass, else `SPELL_FAILED_BAD_TARGETS` (1627-1628);
  (d) the tamer has no current pet (1632-1633, `ALREADY_HAVE_SUMMON`);
  (e) the tamer has a free active slot (1635-1644; none gives `TooMany` to the client);
  (f) the tamer knows the "call pet" spell for that slot index (1647-1652; missing gives `TooMany`);
  (g) the tamer controls no charm (1655-1656);
  (h) the target has no owner (1658-1661, `CreatureAlreadyOwned`).
- `IsTameable` (CreatureData.h 552-559): the creature must be type BEAST, have a family other than none, and carry the TAMEABLE type flag. An exotic-flagged creature is allowed only if the tamer may tame exotics (`return canTameExotic || !IsExotic(...)`, 558). That allowance comes from a GM or an aura of type 146 (`SPELL_AURA_ALLOW_TAME_PET_TYPE`, SpellAuraDefines.h 233).
- The effect (`EffectTameCreature`, 2606-2653) re-checks only a few things: caster has no pet (2612), target is a unit creature and not already a pet (2618-2624), caster is a hunter (2626-2627). It does NOT re-run `IsTameable` or the level test; those are only in `CheckCast`.
- Success path: `finish()` (2631), then `CreateTamedPetFrom` (2633). That builds the pet and calls `InitTamedPet` (Unit.cpp 11202-11237), which fails if no active slot is free (11211-11212), sets the pet's stats to the caster's level (11219), makes it the current active index (11233) and writes it into the free active slot (11234-11235). Back in the effect: the wild creature is despawned (2638), the pet is added to the map and the client is told it is newly tamed (2641-2644); the caster takes the pet (`SetMinion`, 2647); for a player caster the pet is saved as current and the pet spells are sent (2649-2653).
- Deterministic: no random roll appears in `CheckCast` or `EffectTameCreature`. Success is the AND of the gates above.
- Stable model (PetDefines.h 36-47, Pet.cpp 105-154): 5 active slots (indices 0-4) and 200 stabled slots (slot ids 5 to 204, range check `slot < PET_SAVE_LAST_STABLE_SLOT`), plus an unslotted list. Load lookup order when no slot is given: by pet number (active, then stabled, then unslotted), else by entry in unslotted, else fallback to active slot 0, then the first unslotted pet (Pet.cpp 107-151).
- Tick: none. This is an event (cast) with synchronous checks, not a per-frame loop.

## 2. Key functions

- `spell_hun_tame_beast::CheckCast`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/scripts/Spells/spell_hunter.cpp` 1612-1668. All refusal gates, in the order listed in section 1.
- `Spell::EffectTameCreature`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Spells/SpellEffects.cpp` 2606-2653. Caster re-checks, finish, create, despawn, add to map, save.
- `CreatureTemplate::IsExotic` and `IsTameable`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Creature/CreatureData.h` 547-559.
- `Unit::CreateTamedPetFrom` and `Unit::InitTamedPet`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Unit/Unit.cpp` 11160-11237. Free-slot test, level set, current-slot write.
- `Pet::GetLoadPetInfo`: `/mnt/frankendom-donors/TrinityCore-TrinityCore/src/server/game/Entities/Pet/Pet.cpp` 105-154. Slot lookup order.

## 3. Numbers vs mechanism

| Rule (formula) | Number or range | file:line |
|---|---|---|
| Refuse if target level > tamer level: `target->GetLevelForTarget(caster) > caster->GetLevel()` | allowed gap: 0 (target level <= tamer level) | spell_hunter.cpp 1623-1624 |
| Tameable: `type == BEAST && family != CREATURE_FAMILY_NONE && (TypeFlags & TAMEABLE) != 0` | type BEAST; family not none; TAMEABLE flag | CreatureData.h 554 |
| Exotic: allowed iff `canTameExotic || !IsExotic` | exotic needs GM or aura 146 | CreatureData.h 558; SpellAuraDefines.h 233; Player.h 2482 (grep-read) |
| Active slot free: first slot with no value, of `MAX_ACTIVE_PETS` | 5 slots (index 0-4) | PetDefines.h 36; Unit.cpp 11206-11212 |
| Call-pet spell per slot: index i uses CallPetSpellIds[i] | 5 spell ids, one per active slot | spell_hunter.cpp 1603-1610 |
| Stabled slots: `PET_SAVE_FIRST_STABLE_SLOT + MAX_PET_STABLES` | ids 5 to 204 (200 slots) | PetDefines.h 37, 46-47; Pet.cpp 133-134 |
| Pet level at tame = caster level (`InitStatsForLevel(level)`) | pet level := owner level | Unit.cpp 11219 |
| Tame success consumes the wild creature | 1 creature to 1 pet (despawn) | SpellEffects.cpp 2638 |
| Roll for tame success | none in the code read | spell_hunter.cpp 1612-1668; SpellEffects.cpp 2606-2653 |
| Mounted run speed: main = max positive `MOD_INCREASE_MOUNTED_SPEED` aura; speed = max(stack bonus, non-stack bonus); then `AddPct(speed, main)` | main is a percent from aura data (value not read); stack and non-stack bonuses are multipliers | Unit.cpp 8816-8818; 8869; 8871 |
| Mount sets display id; dismount sets it to 0 | display id from mount arg; 0 = none | Unit.cpp 8307; 8341 |
| Pet XP to next level = XP for level x 0.05 (not used in the tame gate; see section 6) | factor 0.05 | Pet.cpp 44; 761; 822 |
| Pet XP kill share: 100% solo, 50% in group (`xp / 2`) | 1.0 / 0.5 | KillRewarder.cpp 166 |

## 4. TypeScript sketch

simplified: the sketch follows the donor check order (target level, tameable, current pet, first free active slot, call spell for that slot, charmed, owned). It omits the caster-is-player and target-is-creature type checks, the donor's skip of the slot checks when the caster has no stable object, the failure messages sent to the client (the sketch returns the reason), the spell finish, the despawn, add-to-world and save steps, and the hunter class gate in the effect handler. The donor's exotic test and the tameable test are merged into one refusal, as in the donor.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

type TameRefusal =
  | "not-tameable"          // beast + family + tameable flag, and exotic only if the tamer may tame exotics
  | "above-your-level"      // target level higher than the tamer's level
  | "already-have-pet"      // tamer already has a current pet
  | "active-slots-full"     // no free active companion slot
  | "no-call-spell-for-slot"// the tamer does not know the call spell for the first free slot
  | "already-charmed"       // tamer already controls a charmed unit
  | "already-owned";        // target already has an owner

interface TameTarget {
  level: number;
  isBeast: boolean;
  hasFamily: boolean;
  tameableFlag: boolean;
  exotic: boolean;
  ownerId: string | null;
}

interface Tamer {
  level: number;
  canTameExotic: boolean;
  hasCurrentPet: boolean;
  activeSlots: (string | null)[];   // length 5 in the donor (engine constant)
  callSpellKnown: boolean[];        // one per active slot
  controllingCharm: boolean;
}

// Order follows the donor's cast check: target gates first, then the stable, then charm and owner.
// Deterministic: no roll appears anywhere in these checks.
function checkTame(t: TameTarget, p: Tamer): TameRefusal | null {
  if (t.level > p.level) return "above-your-level";
  if (!t.isBeast || !t.hasFamily || !t.tameableFlag) return "not-tameable";
  if (t.exotic && !p.canTameExotic) return "not-tameable";
  if (p.hasCurrentPet) return "already-have-pet";
  const slot = p.activeSlots.findIndex((s) => s === null);
  if (slot < 0) return "active-slots-full";
  if (!p.callSpellKnown[slot]) return "no-call-spell-for-slot";
  if (p.controllingCharm) return "already-charmed";
  if (t.ownerId !== null) return "already-owned";
  return null;
}
```

## 5. Lands in

- TARGET `src/fight/companions.ts` (new module, proposed; this reader did not read the current Frankendom layout). The ordered gate runs on the server inside the summon or tame action, before any state change. Parity-checklist row 21 (catalogue fields): the beast, family, tameable and exotic flags become catalogue fields on the creature row, and the 5 active and 200 stored slot caps are engine constants.
- today: no companion or tame model read in this reader's pass.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one engine with server-verified outcomes (the gate decides on the server, never the client); catalogue as runtime source (row 21)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Hunter-only gate: `EffectTameCreature` requires `CLASS_HUNTER` (SpellEffects.cpp 2626-2627). Frankendom starts class-free (CH topic), so the class test must become a data flag (an unlock aura or item) on the tamer, not a class.
- Effect does not re-check: `EffectTameCreature` does not call `IsTameable` or the level test (2606-2653). Only `CheckCast` does. Frankendom must run the gate again on the server when the tame is applied, so a stale or forged cast cannot skip it.
- Spell finishes before the pet exists: `finish()` (2631) runs before `CreateTamedPetFrom` (2633). If creation fails (no free slot), the cast is spent and the creature is not despawned (2634-2635). The check and the create must be one server step, or refund on failure.
- Stable fallback skips the slot test: when the caster has no `PetStable`, `CheckCast` skips the slot and call-spell checks (1630, `if (PetStable const* petStable = ...)`). Frankendom has no such fallback; the gate always runs.
- No tame chance: success is deterministic. If Frankendom wants a risk on a tame, it must be a data roll on the catalogue row, not a donor rule.
- Pet level sync makes donor pet XP inert (defect, found while reading `GivePetXP` 716-765 for section 6). Hunter pets are set to the owner's level at tame (Unit.cpp 11219), synced on load (Pet.cpp 312) and on owner level-up (Player.cpp 2244), and again in a second owner-side path at Player.cpp 2481 (function name not read). `GivePetLevel` syncs the pet to the owner (Pet.cpp 1802). So when `GivePetXP` runs (called from KillRewarder.cpp 166 with 100% solo, 50% group), the pet is already at owner level and the early return at Pet.cpp 731 (`if (petlevel >= maxlevel)`, with `maxlevel` from 727) drops the XP. I read every path I could find that sets or checks the pet level; I did not run this. Fix: keep the idea (a kill share split solo and group, a 0.05 factor on the owner's XP table) but let a pet trail the owner by a band of data-defined levels, or let XP raise a pet power tier, so XP can still accumulate.
- Happiness and loyalty: not present. `HAPPINESS_LEVEL_SIZE` (Pet.h 24) and `PetHappinessEnabled` (SystemPackets.h 178, marked "classic only") are the only traces, and no loyalty or feeding mechanic was found in the places read.
- Mount: `Unit::Mount` (8303) and `Dismount` (8336) read in part. Player controls are disabled on mount (`DisablePetControlsOnMount`, Player.cpp 27886, grep-read only). The mount aura values are data and were not read.

Best transferable idea: a tame is one ordered server-side gate (target level, tameable type and flag, one free companion slot, call spell known for that slot, not charmed, not owned), with fixed slot caps (5 active, 200 stored) and no random roll.
Decision (proposed): adapt - keep the ordered gate and the slot caps, but replace the hunter class test with a data unlock flag and run the gate again when the tame is applied, because Frankendom is class-free and server-verified.
Acceptance: a server test asserts that taming a beast whose level is at or below the player's, with a free companion slot, succeeds; a sixth tame returns "active-slots-full" and the creature stays alive.
