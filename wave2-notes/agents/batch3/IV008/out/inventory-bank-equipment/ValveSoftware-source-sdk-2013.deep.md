# ValveSoftware-source-sdk-2013 (inventory-bank-equipment, cell 1)

Donor: /mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game | Licence: Valve Source 1 SDK licence (LICENSE, Valve Corporation); read the first paragraph only, rest (not read) | C++ | symbol CBasePlayer::BumpWeapon, CBaseCombatCharacter::Weapon_Equip, Weapon_EquipAmmoOnly, GiveAmmo

Checked: cell 1 = row 2 of cells-IV008.tsv. Hint file client/c_basecombatweapon.cpp grepped only: no inventory code there, so not the mechanism. Opened in full or in the relevant span: server/basecombatcharacter.cpp (Weapon_Detach 1703, Weapon_Equip 2075-2130, Weapon_EquipAmmoOnly 2190-2230, Weapon_SlotOccupied 2238, Weapon_GetSlot 2254, GiveAmmo 2985-3028), server/player.cpp (BumpWeapon 6754-6840), server/hl2/hl2_player.cpp (CHL2_Player::BumpWeapon 2707-2760), shared/ammodef.cpp (MaxCarry 103-117), shared/shareddefs.h (MAX_WEAPON_SLOTS 115, MAX_WEAPONS 118). Confidence high for the pickup and ammo path; medium for the HL2 swap (not read: Weapon_CanSwitchTo, the WEAPON_PRIMARY_SLOT constant, any removal of the held gun outside the lines read).

## 1. Mechanism

Order of operations when the player touches a world gun (base player, server/player.cpp:6754):
1. Refuse if the gun already has an owner, the character cannot use it, or game rules forbid it (6762).
2. Non-episodic path: refuse if the gun is not visible through solid world (6781, FVisible with MASK_SOLID; FL_NOTARGET bypasses).
3. Duplicate (a gun of the same class is already held, 6788): Weapon_EquipAmmoOnly (basecombatcharacter.cpp:2190) gives the pickup's clip to the owner through GiveAmmo, which clamps to the carry cap minus what is held. It subtracts what was taken from the pickup and reports success only if something was taken (2206, 2223). BumpWeapon then removes the world pickup only when it has no primary ammo left (6793-6796). Otherwise the pickup stays on the ground with the remainder.
4. New gun: Weapon_Equip (2075) writes the gun into the first empty index of a flat array bounded by MAX_WEAPONS (2078-2082). The base class checks no slot. It then gives default ammo: with no clip, GiveAmmo(default); with default above max clip, the clip is filled and the overflow goes to GiveAmmo (2106, 2112).
5. HL2 override (hl2_player.cpp:2707): the duplicate branch is the same idea, but it returns false in both outcomes (2730-2737). The new-gun branch first checks the slot (2747). If the slot is occupied, it swaps only when the gun returned by Weapon_GetSlot(WEAPON_PRIMARY_SLOT) has no ammo (2751), then calls Weapon_Equip (2753). Otherwise it refuses. The swap check reads the primary slot, not the pickup's own slot. In the lines read, the held empty gun is not detached: the only index-clearing code read is Weapon_Detach (1703-1714).

## 2. Key functions

- CBasePlayer::BumpWeapon, server/player.cpp:6754. Pickup entry point and duplicate rule.
- CBaseCombatCharacter::Weapon_EquipAmmoOnly, server/basecombatcharacter.cpp:2190. Moves clip ammo from a duplicate pickup into the owner; checks the same class by classname at 2195 only.
- CBaseCombatCharacter::Weapon_Equip, server/basecombatcharacter.cpp:2075. First-empty insert and default ammo grant.
- CBaseCombatCharacter::GiveAmmo, server/basecombatcharacter.cpp:2985. Clamp and report: returns the accepted amount.
- CAmmoDef::MaxCarry, shared/ammodef.cpp:103. Per ammo type cap, cvar-driven or fixed.
- CHL2_Player::BumpWeapon, server/hl2/hl2_player.cpp:2707. Slot rule and swap (the only slot-exclusive code path found).
- Weapon_GetSlot and Weapon_SlotOccupied, server/basecombatcharacter.cpp:2254 and 2238. Slot lookup returns the first gun whose GetSlot matches. Weapon_SlotOccupied has no callers in server/ or shared/ except hl2_player.cpp:2747 (grep).
- Weapon_Detach, server/basecombatcharacter.cpp:1703. Clears the index at 1714.

## 3. Numbers vs mechanism

- MAX_WEAPONS = 48 (shareddefs.h:118). A flat carry array, not one per slot.
- MAX_WEAPON_SLOTS = 6 (shareddefs.h:115). Labelled as HUD item-selection slots, so a display bucket, not a carry limit.
- Ammo add = min(count, MaxCarry - held) (basecombatcharacter.cpp:2999-3000). Example used in the sketch only: cap 30, held 18, pickup 20, so 12 is taken and 8 stays on the pickup. The donor has no such numbers in code; the specific MaxCarry values for each ammo type were not read.
- Clip fill: default clip above max clip fills the clip to max and sends the rest to reserve (2112-2113).
- No timers and no tick: every step is instant on touch. No randomness.

## 4. TypeScript sketch

simplified: keeps the donor's duplicate rule (take what fits, leave the rest, remove only at zero), the carry clamp, and the first-empty insert. It omits Weapon_CanUse, the visibility gate, game-rule hooks, default clips for new guns, the HUD switch, and dropping the swapped-out empty gun to the world. It changes two donor points: the slot test uses the pickup's own slot (donor reads WEAPON_PRIMARY_SLOT), and the empty held gun is replaced in its index rather than left in the array. Typechecked on the VPS: npx tsc --noEmit --strict --target es2020, exit 0.

```ts
// Clean-room shape of a carry bag with duplicate-to-ammo pickup, partial take and a slot rule.
const MAX_WEAPONS = 48; // donor shareddefs.h:118
const MAX_WEAPON_SLOTS = 6; // donor shareddefs.h:115 (HUD buckets, not a carry limit)

interface Gun { id: string; slot: number; ammoType: string; }
interface Pickup { gun: Gun; clip: number; }

class Bag {
  private guns: Array<Gun | null> = new Array<Gun | null>(MAX_WEAPONS).fill(null);
  private clips = new Map<string, number>();
  private ammo = new Map<string, number>();

  constructor(private carryMax: Map<string, number>) {}

  // donor GiveAmmo: add = min(count, max - have); returns the amount actually taken
  giveAmmo(count: number, ammoType: string): number {
    if (count <= 0) return 0;
    const have = this.ammo.get(ammoType) ?? 0;
    const add = Math.min(count, (this.carryMax.get(ammoType) ?? 0) - have);
    if (add < 1) return 0;
    this.ammo.set(ammoType, have + add);
    return add;
  }

  private hasAnyAmmo(g: Gun): boolean {
    return (this.clips.get(g.id) ?? 0) > 0 || (this.ammo.get(g.ammoType) ?? 0) > 0;
  }

  // returns true when the world pickup is consumed (removed)
  bump(p: Pickup): boolean {
    // 1. duplicate: move what fits to the bag; the pickup keeps the remainder
    const owned = this.guns.find((g) => g !== null && g.id === p.gun.id);
    if (owned) {
      const taken = this.giveAmmo(p.clip, owned.ammoType);
      if (taken === 0) return false;
      p.clip -= taken;
      return p.clip <= 0;
    }
    // 2. slot rule: an occupied slot refuses unless the held gun is empty; then swap it out
    const idx = this.guns.findIndex((g) => g !== null && g.slot === p.gun.slot);
    if (idx >= 0) {
      const held = this.guns[idx];
      if (held === null || this.hasAnyAmmo(held)) return false;
      this.guns[idx] = p.gun; // fix: donor leaves the empty gun in the array (see note)
      this.clips.set(p.gun.id, p.clip);
      return true;
    }
    // 3. free space: first empty index (donor Weapon_Equip)
    const free = this.guns.indexOf(null);
    if (free < 0) return false;
    this.guns[free] = p.gun;
    this.clips.set(p.gun.id, p.clip);
    return true;
  }
}

export {};
```

## 5. Lands in

Target: origins/server/inventory-pickup.ts (proposed new file; name not checked against the Frankendom repo). Parity row 18 (loot roll and XP award: pickup ownership and the award go through the one server ledger).

## 6. Gaps and risks

- Frankendom rule (server-verified pickups, one ledger): the take-what-fits math and the slot swap must run on the server. The client only shows "+12 rounds" and the leftover pickup. Never let the client decide the count.
- Donor defects found, with fixes:
  (a) HL2 slot test reads WEAPON_PRIMARY_SLOT, not the pickup's slot (hl2_player.cpp:2749-2751). Fix: test the pickup's own slot (sketch step 2).
  (b) The swap calls Weapon_Equip and leaves the empty held gun in the array (hl2_player.cpp:2753; no detach in lines read). Fix: replace the index and drop the old gun to the world (sketch step 2 replaces; world drop not in sketch).
  (c) Duplicate gate uses class and subtype (player.cpp:6788), but Weapon_EquipAmmoOnly matches class only (basecombatcharacter.cpp:2195). Fix: one key, class plus variant, used in both places.
- Flat 48-entry bag: no per-slot cap in the base class, so the bag can grow to 48 guns. For a phone list this is too large. Fix: a Frankendom bag cap as zone or engine data, not 48.
- Clamp-and-report returns 0 when nothing fits, and the pickup stays. The donor shows no "bag full" message in these lines (not read). Frankendom needs one.
- Not read: Weapon_CanSwitchTo, the WEAPON_PRIMARY_SLOT constant, the game-rule hooks CanHaveAmmo and CanHavePlayerItem, the name overload of GiveAmmo (basecombatcharacter.cpp:3030), NPC and TF equip paths, client/c_basecombatweapon.cpp.

Reuse tag: adapt (shape only; Valve licence, clean-room; no donor lines copied into the sketch).
Brief rule served: anti-strictness rules 1-4 (judged the idea, opened the real code, listed candidates); 2026-10-10 keep-the-idea rule (defects listed with fixes, decision adapt).

Best transferable idea: A duplicate loot pickup converts into the owned item's ammo up to the carry cap, the drop keeps the leftover, and the drop is removed only at zero.
Decision (proposed): adapt — duplicates-as-ammo and leftover-stays fit loot drops in a many-on-one fight, but the slot swap must check the pickup's own slot and replace, not stack, the empty gun.
Acceptance: Server test: a gun holds 18 of 30 rounds; a duplicate drop with 20 rounds gives the bag +12, leaves 8 on the ground, and the drop is removed only when it reaches 0.
