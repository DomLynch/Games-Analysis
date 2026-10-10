# ValveSoftware-source-sdk-2013 (combat-sim, cell 2)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/basecombatcharacter.cpp` | Licence: Valve Source 1 SDK licence (repo LICENSE: "SOURCE 1 SDK LICENSE", free use and modification to develop a Valve game; restricted, clean-room shape only) | C++ | symbol `CBaseCombatCharacter::OnTakeDamage_Alive`

Checked: Symbol `OnTakeDamage_Alive` is defined at basecombatcharacter.cpp 2480 and read in full (2480 to its closing brace, before 2520). Its caller `OnTakeDamage` (2393-2470, read in full through the life-state switch) was read; the NPC and player overrides call the base first (ai_basenpc.cpp 713, player.cpp 1614; both read in one line each, the rest of those overrides not read). Fractional accumulator field declared at basecombatcharacter.h 509 (read). Not read: `Event_Killed`, `Event_Dying`, `Event_Gibbed` bodies; `CTakeDamageInfo` class; `IntervalTimer`; `g_pGameRules->Damage_*` functions; the knockback tail of `CalcDamageForceVector` after line 1436 (only 1362-1436 read, not used for the sketch). Confidence: high on the accumulator and the order of the damage step; medium on how every subclass overrides it (only NPC and player overrides grepped and read at the call line). Licence is restricted, so the note is shape only. camera_scope: n/a.

## 1. Mechanism

- Entry: `OnTakeDamage` (2393) is the one place health is reduced for a combat character (per the donor comment at 2382). It returns 0 at once if `m_takedamage` is off (2397-2398), counts the hit (2400), and does shock effects for shock damage. Then it records the injury per attacker team: the team bit goes into `m_hasBeenInjured`, and a 4-slot history gets the team with its injury timer restarted (2409-2432; `m_damageHistory[i].interval.Start()` at 2420 and 2428).
- Dispatch on life state (2436-2470): alive victims go to `OnTakeDamage_Alive` (2437). If health is then 0 or less (2438), physics collisions are disabled, `Event_Killed` runs (2448), then the victim is gibbed if it asks for it, otherwise `Event_Dying` runs. A dying victim returns 1 with no damage (`OnTakeDamage_Dying`, 2520-2522). A dead victim takes the raw damage with no accumulator (`OnTakeDamage_Dead`, 2530).
- Inside `OnTakeDamage_Alive` (2480), in order:
  (a) Direction (2482-2489): the inflictor's world centre is lowered 10 units, minus this character's centre, normalised, and stored in a global attack direction. This is the knockback direction used later.
  (b) An explicit comment at 2491 says armour is not considered here (`!!!LATER`). So there is no armour step in this function.
  (c) If the victim is not events-only (2493), the damage is split: `flFractionalDamage` = damage minus its floor (2496), `flIntegerDamage` = damage minus that fraction (2497).
  (d) The fraction is added to the per-entity accumulator `m_flDamageAccumulator` (2500). If the accumulator reaches 1.0 (2504), one whole point is added to `flIntegerDamage` and 1.0 is taken off the accumulator (2507).
  (e) If `flIntegerDamage` is 0 or less, return 0 (2510-2511). Otherwise `m_iHealth -= flIntegerDamage` (2513) and return 1 (2516).
- Result: a hit below one point does no damage on its own, but its fraction is kept, and once enough fractions add up to a point, that point is taken on the hit that crosses it. Over many hits, the whole-point damage taken matches the total damage (for non-negative damage), with a carry of less than one point.
- Tick: none. This runs once per hit, synchronously, from the damage event. No loop drives it, and it has no timer of its own.
- Knockback (partly read): `CalcDamageForceVector` (1362) uses an explicit damage force if one is set. Otherwise, with an inflictor, it sets `forceScale = damage * 75 * 4` (1396) and points the force from the inflictor to the victim; blasts get 1.375 (1406). Only the first part is read; the rest is (not read).

## 2. Key functions

- `CBaseCombatCharacter::OnTakeDamage_Alive`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/basecombatcharacter.cpp` 2480. The accumulator and integer-health step (2493-2516).
- `CBaseCombatCharacter::OnTakeDamage`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/basecombatcharacter.cpp` 2393-2470. Gate, team injury record, life-state switch, death call.
- `CBaseCombatCharacter::OnTakeDamage_Dead`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/basecombatcharacter.cpp` 2525-2533. Raw damage, no accumulator.
- `CBaseCombatCharacter::CalcDamageForceVector`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/basecombatcharacter.cpp` 1362-1436 (partly read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Split a fractional hit into whole points and a carry; release one point when the carry reaches 1 | Carry threshold 1.0 (basecombatcharacter.cpp 2504, 2507) |
| A hit that releases no whole point returns early and leaves health alone | Zero check (2510) |
| Per-attacker-team injury timer, a bit set and a 4-slot history | `MAX_DAMAGE_TEAMS = 4` (basecombatcharacter.h 537) |
| Lethal hit: stop collisions, kill event, then gib or dying | Event order at 2438-2452 |
| Knockback from the inflictor's direction, lifted by 10 units | Lift 10 (basecombatcharacter.cpp 2486); force = damage * 75 * 4 (1396); blast 1.375 (1406) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the health step only: events-only check, split into whole and fraction, add the fraction to the carry, release one point at 1.0, return early on zero, then subtract. It drops the team injury history, the shock effects, the attack-direction vector, the life-state switch, the lethal-hit call and gibbing, the dead-state path, and the knockback force. It takes a non-negative amount (the donor's damage input) and returns a boolean in place of the donor's int.

```ts
// Licence: Valve Source 1 SDK licence (restricted). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface Victim {
  health: number;            // whole health points, may go below zero
  damageAccumulator: number; // fractional damage carried between hits, 0..1 at rest
  eventsOnly: boolean;       // reacts to the hit but takes no health loss
}

// Apply one incoming hit. Fractions carry over so tiny hits are not lost.
// Returns true if the hit was registered (donor return value 1), false if no whole point was taken.
function applyHit(v: Victim, amount: number): boolean {
  if (v.eventsOnly) return true;
  const whole = Math.floor(amount);
  const fraction = amount - whole;
  v.damageAccumulator += fraction;
  let integerDamage = whole;
  if (v.damageAccumulator >= 1.0) {
    integerDamage += 1;
    v.damageAccumulator -= 1.0;
  }
  if (integerDamage <= 0) return false;
  v.health -= integerDamage;
  return true;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/damage.ts` (the engine damage step, the one place health changes): parity-checklist row 1 (duel step / sim). The carry belongs in the same server step as the hit, on the server entity, so it is part of the one ledger. Frankendom's current layout was not re-checked for this note.
- Reuse tag: rewrite-from-idea (Valve Source 1 SDK licence, restricted; shape only, no lines copied)
- Brief rule served: 1 (one combat core, two clients); rule 5 (server-verified kills: the carry is server state, not client state)

Best transferable idea: keep the fraction of every hit on the victim as server state and release a whole point only when the carried fraction reaches one, so small multipliers never silently round to zero.
Decision (proposed): adapt — take the carry, but only if Frankendom applies fractional damage (guard, stance or class multipliers); store the carry on the server entity, reset it on respawn, and keep it out of the client.
Acceptance: a server test: three hits of 0.4 on a 10 HP defender leave it at 9 HP with 0.2 carried (the third hit takes the point); a hit of 0 leaves health and carry unchanged; an events-only defender reacts and loses no health or carry.

## 6. Gaps and risks

- Restricted licence: clean-room, shape only. The sketch uses the mechanism, not the donor lines.
- Armour: the donor's own comment (2491) says armour is not implemented here. Frankendom's armour and guard numbers come from its own rulings (row 3), so no armour is taken from this donor.
- The carry only matters if Frankendom produces fractional damage. If all Frankendom hit values stay whole numbers, the decision should become reject.
- The donor's `OnTakeDamage` path has a team injury history (2409-2432) that the sketch leaves out; the team logic maps to Frankendom's one ledger and hate list (rows 4 and 18), not to this sketch.
- Knockback force is donor physics (vector, mass, and a random self-hit). Frankendom's guard and stagger live in the duel step (rows 1 and 3); a vector push has no counterpart, as the Quake note in this library also says.
- The dying and dead states are only partly described: `OnTakeDamage_Dying` takes no damage and `OnTakeDamage_Dead` takes raw damage (2520-2533). The death handler bodies were not read.
- Donor type: `m_iHealth` is an int and the fraction is a float, so the donor truncates on assignment (2513). Frankendom's integer health ledger should not depend on float rounding.

Reuse tag: rewrite-from-idea (Valve Source 1 SDK licence, restricted; shape only, no lines copied)
Brief rule served: 1 (one combat core, two clients); rule 5 (server-verified kills: the carry is server state, not client state)
