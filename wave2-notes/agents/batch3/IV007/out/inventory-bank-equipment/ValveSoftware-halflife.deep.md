# ValveSoftware-halflife (inventory-bank-equipment, cell 3)

Donor: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/player.cpp` (with `dlls/weapons.cpp`, `dlls/gamerules.cpp`, `dlls/multiplay_gamerules.cpp`, `dlls/items.cpp`) | Licence: Valve, Half-Life 1 SDK LICENSE (`/mnt/frankendom-donors/ValveSoftware-halflife/LICENSE` line 4 "Half Life 1 SDK Copyright(c) Valve Corp."; line 11 "You may, free of charge, download and use the SDK"; commercial use needs Valve's permission) | C++ | symbol `CBasePlayer::AddPlayerItem` (with `CBasePlayerItem::DefaultTouch`, `CGameRules::CanHavePlayerItem`, `CBasePlayer::GiveAmmo`, `CHalfLifeMultiplay::FlWeaponRespawnTime`)

Checked: The hinted file dlls/gamerules.cpp holds only the ammo reserve gate (36-54) and the base pickup gate (80-110); the respawn and pickup mechanism is elsewhere, found by grep for the topic words. Read: dlls/player.cpp 3830-3960 (AddPlayerItem, RemovePlayerItem, the head of GiveAmmo); dlls/gamerules.cpp 36-110; dlls/multiplay_gamerules.cpp 850-1030 (weapon, item and ammo respawn rules, multiplayer CanHavePlayerItem at 920-939); dlls/singleplay_gamerules.cpp 260-330; dlls/weapons.cpp 566-660 (CheckRespawn, Respawn, DefaultTouch), 785-830 (AddDuplicate, AddToPlayer), 901-960 (AddPrimaryAmmo), 1080-1090, 1118-1140 (ammo touch), 1158-1195 (ExtractAmmo, ExtractClipAmmo); dlls/items.cpp 95-150 (CItem::ItemTouch, Respawn head); dlls/mp5.cpp 296-306; dlls/weapons.h 104-125, 164-165, 192; grep only: dlls/cdll_dll.h 26 and 36, dlls/game.cpp 32, dlls/handgrenade.cpp 76, dlls/weapons.h 111-129. Not read: the tail of GiveAmmo (player.cpp 3960-3975), `CBasePlayerItem::AttemptToMaterialize` (the caller of FlWeaponTryRespawn), `CBasePlayerAmmo::Respawn`, `CItem::MyTouch`, `CItem::Respawn` past its first lines, `SwitchWeapon`, `FShouldSwitchWeapon`. Confidence: high on the pickup gate, duplicate-to-ammo path and reserve clamp (read end to end); medium on the respawn timer's exact call path (the final caller was not read). camera_scope not applicable (not a camera cell).

Best transferable idea: A second copy of an owned weapon is never attached as a second item: its ammo is clamped into the owned weapon's reserve and the copy is removed, while the spawn point still gets its own respawn timer.
Decision (proposed): adapt — take the pickup gate, duplicate-to-ammo conversion and reserve clamp as one pickup rule; the donor's respawn-by-copying-the-entity is not kept (see section 6).
Acceptance: Walking over a second MP5 while the reserve has room adds its ammo to the first MP5 and shows a "+N 9mm" line, and the second pickup is removed; at a full reserve the second pickup is refused and stays on the ground; a taken pickup returns after its timer (20 s weapon, 30 s item, 20 s ammo, server test: nextSpawnAt(now, "weapon") = now + 20).

## 1. Mechanism

- Slots. Each player has one singly linked list per slot, `m_rgpPlayerItems[iItemSlot()]` (player.cpp 3839). A newly added weapon goes to the head of its slot list (3873-3874). The HUD slot count is `MAX_ITEM_TYPES` 6 (cdll_dll.h 26, grep only). Each weapon class says its slot (weapons.h, e.g. `iItemSlot` returns 2, 1, 3, 4, 5 in different classes; grep only).
- Pickup order for a weapon (weapons.cpp `DefaultTouch` 615-640): (1) ignore non-players; (2) gate `CanHavePlayerItem` (624); (3) `pOther->AddPlayerItem(this)` (633); (4) attach and play the pickup sound only if step 3 returned TRUE (633-635).
- The gate (gamerules.cpp 80-105, base rule): a dead player takes nothing (83). An ammo weapon is refused only when its reserve cannot take more (`CanHaveAmmo` false, 88) AND the player already holds it (92). A weapon with no ammo is refused if the player already holds it (101-102).
- Multiplayer gate (multiplay_gamerules.cpp 920-939): when `mp_weaponstay` > 0 (922) and the weapon is not `ITEM_FLAG_LIMITINWORLD` (924), it refuses a weapon whose id the player already holds in any slot (934); otherwise it falls back to the base rule.
- Duplicate path (player.cpp 3839-3857): the new item looks for the same classname in its slot. If found, `AddDuplicate` (3845) runs: the copy's default reserve moves into the owned weapon through `ExtractAmmo` (weapons.cpp 797, 1158-1170) and `AddPrimaryAmmo` (1166). Then `CheckRespawn` runs on the copy (3848), the copy is killed, and the function returns FALSE, so the player does not attach the copy (DefaultTouch 633-635).
- New weapon path (player.cpp 3867-3880): `AddToPlayer` (weapons.cpp 807), `CheckRespawn` (3871), head insert (3873-3874), then a switch to it if `FShouldSwitchWeapon` says so.
- Ammo into a weapon (`AddPrimaryAmmo`, weapons.cpp 901-925): if the clip is empty, the clip is filled first (913) and the rest goes to the reserve through `GiveAmmo`; if the clip is not empty, all of it goes to the reserve (919).
- Reserve gate and clamp (`GiveAmmo`, player.cpp 3935-3960): refused (returns -1, 3943-3946) unless `CanHaveAmmo` is true (gamerules.cpp 41-54: room only while the reserve is below the cap, test at 51). Added amount `iAdd = min(iCount, iMax - reserve)` (3956), then `reserve += iAdd` (3960).
- Respawn on take (`CheckRespawn`, weapons.cpp 572-585): if `WeaponShouldRespawn` is YES (574-576), `Respawn()` runs. `Respawn` (589-611) creates an invisible, untouchable copy at the respawn spot (593-600, `EF_NODRAW`, think `AttemptToMaterialize`) and sets its timer to `FlWeaponRespawnTime(this)` (605).
- Timer values (multiplayer). Weapons: 20 s (`WEAPON_RESPAWN_TIME`, multiplay 46, returned at 867). With `mp_weaponstay` > 0 and the weapon not `LIMITINWORLD`, the timer is `gpGlobals->time + 0` (858-863). Items: 30 s (`ITEM_RESPAWN_TIME`, 45, returned at 978). Ammo boxes: 20 s (`AMMO_RESPAWN_TIME`, 47, returned at 1022).
- Entity budget (multiplay 872-889). `LIMITINWORLD` weapons (grenades, handgrenade.cpp 76) may spawn now (`FlWeaponTryRespawn` returns 0) while `NUMBER_OF_ENTITIES() < maxEntities - 100` (ENTITY_INTOLERANCE, 872 and 883). Otherwise they wait the normal weapon timer (887-889). The caller of `FlWeaponTryRespawn` was not read.
- Ammo box (`CBasePlayerAmmo::DefaultTouch`, weapons.cpp 1118-1140): if the busting check after the player test passes (not quoted), `AddAmmo` runs (1128); the subclass calls `GiveAmmo` with its give and cap (mp5.cpp 303). On success, `AmmoShouldRespawn` YES (1130) respawns the box; otherwise it is removed 0.1 s later.
- Plain items (`CItem::ItemTouch`, items.cpp 108-141): the touch is ignored when `CanHaveItem` is false (119). Otherwise `MyTouch` (not read), then `PlayerGotItem`, then a respawn if `ItemShouldRespawn` is YES (132), else removal.
- Single-player rules (singleplay_gamerules.cpp 269-320): weapons and items never respawn (`WeaponShouldRespawn` and `ItemShouldRespawn` return NO; `FlWeaponRespawnTime` returns -1), and `CanHaveItem` is TRUE.
- Tick: none for pickup; the respawn is a scheduled think (`nextthink`), so timing is absolute game time (`gpGlobals->time + constant`), not a per-frame counter.

## 2. Key functions

- `CBasePlayer::AddPlayerItem`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/player.cpp` 3835-3893. Slot bucket, duplicate branch (3845-3857), new-item branch (3867-3880).
- `CBasePlayerItem::DefaultTouch`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/weapons.cpp` 615-640. Gate, add, attach.
- `CBasePlayerItem::CheckRespawn` and `Respawn`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/weapons.cpp` 572-611. Respawn decision and the replacement copy with its timer.
- `CBasePlayerWeapon::AddDuplicate`, `ExtractAmmo`, `AddPrimaryAmmo`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/weapons.cpp` 793-799, 901-925, 1158-1170.
- `CBasePlayer::GiveAmmo`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/player.cpp` 3935-3960 (head read; the tail after 3960 not read).
- `CGameRules::CanHaveAmmo` and `CanHavePlayerItem`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/gamerules.cpp` 41-54 and 80-105.
- `CHalfLifeMultiplay::CanHavePlayerItem` and the respawn timers: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/multiplay_gamerules.cpp` 856-889, 920-939, 978, 1022.
- `CBasePlayerAmmo::DefaultTouch`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/weapons.cpp` 1118-1140.
- `CItem::ItemTouch`: `/mnt/frankendom-donors/ValveSoftware-halflife/dlls/items.cpp` 108-141.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Reserve gate: refuse when the reserve is at its cap | Carry caps per ammo type (theirs, e.g. buckshot 125 at weapons.h 113; 357 at 112, value 36; the 9mm cap is at weapons.h 111 but its quote has tabs, so not receipted) |
| Clamp the add to the cap: add = min(count, cap - have) | Clip size 50 for the MP5 (theirs, weapons.h 129; the MP5 ammo box gives one clip, weapons.h 164) |
| Duplicate weapon converts to ammo, no second item | None (rule) |
| Pickup timers: weapon, item and ammo | 20 s weapon (theirs, multiplay 46, 867), 30 s item (45, 978), 20 s ammo (47, 1022) |
| Zero-second respawn for unlimited weapons when weapon-stay is on | `mp_weaponstay` default 0 (theirs, game.cpp 32); zero-second respawn at multiplay 863 |
| Entity-budget reserve for limited weapons | 100 entities below the maximum (theirs, multiplay 872 and 883) |
| Limited-in-world flag for grenades | Flag bit, value 8 (theirs, weapons.h 192; the grenade sets it at handgrenade.cpp 76) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: alive check, then the owned-check gate (with the weapon-stay rule), then duplicate-to-ammo or attach at the head of the slot, then the respawn timer is set by the caller for both attached and converted pickups (the donor calls CheckRespawn in both branches, player.cpp 3848 and 3871). It omits: the spawn-copy entity (the sketch uses a timer, not an entity); the materialize think; the dead-player clip path (ExtractClipAmmo); the empty-clip fill inside AddPrimaryAmmo (the sketch gives the copy's full default reserve to the reserve); the weapon-switch call; the pickup and fire sounds; the busting check; the gEvilImpulse101 removals; the singleplayer rules; and `GetAmmoIndex`. The donor's respawn timer is set by the copy, the sketch's by the spawn point.

```ts
// Licence: Valve (Half-Life 1 SDK LICENSE: free for modified Valve games; commercial use needs Valve's permission). Restricted: clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pack {
  ammo: Record<string, number>;     // reserve per ammo type
  carry: Record<string, number>;    // cap per ammo type (donor: *_MAX_CARRY)
  weapons: { id: string; slot: number; ammo?: string }[]; // owned, newest first in each slot
}

interface WeaponDef {
  id: string;
  slot: number;
  ammo?: string;
  defaultReserve: number;           // ammo the spare copy brings with it
  limitInWorld: boolean;            // donor ITEM_FLAG_LIMITINWORLD
}

const RESPAWN_S = { item: 30, weapon: 20, ammo: 20 }; // donor multiplay defines; zone data in Frankendom
const ENTITY_RESERVE = 100;                           // donor ENTITY_INTOLERANCE

// Reserve gate (donor CanHaveAmmo): room only while below the cap.
function canHaveAmmo(p: Pack, type: string): boolean {
  return (p.ammo[type] ?? 0) < (p.carry[type] ?? 0);
}

// Clamp to the cap (donor GiveAmmo: add = min(count, cap - have)). Returns the amount added.
function giveAmmo(p: Pack, type: string, count: number): number {
  if (!canHaveAmmo(p, type)) return 0;
  const add = Math.min(count, p.carry[type] - (p.ammo[type] ?? 0));
  if (add < 1) return 0;
  p.ammo[type] = (p.ammo[type] ?? 0) + add;
  return add;
}

// Pickup gate (donor CanHavePlayerItem, base rule plus the weaponstay rule).
function canTakeWeapon(p: Pack, def: WeaponDef, alive: boolean, weaponStay: boolean): boolean {
  if (!alive) return false;
  const owned = p.weapons.some(w => w.id === def.id);
  if (weaponStay && !def.limitInWorld && owned) return false;
  if (def.ammo) return canHaveAmmo(p, def.ammo) || !owned;
  return !owned;
}

// Take a weapon. A second copy is not attached: its ammo goes to the owned weapon (donor AddPlayerItem + ExtractAmmo).
function takeWeapon(p: Pack, def: WeaponDef, alive: boolean, weaponStay: boolean): "attached" | "converted" | "refused" {
  if (!canTakeWeapon(p, def, alive, weaponStay)) return "refused";
  if (p.weapons.some(w => w.id === def.id)) {
    if (def.ammo) giveAmmo(p, def.ammo, def.defaultReserve);
    return "converted";
  }
  p.weapons.unshift({ id: def.id, slot: def.slot, ammo: def.ammo });
  return "attached";
}

// Next spawn time after a take (donor Respawn -> FlWeaponRespawnTime / FlItemRespawnTime / FlAmmoRespawnTime).
function nextSpawnAt(now: number, kind: keyof typeof RESPAWN_S): number {
  return now + RESPAWN_S[kind];
}

// Entity-budget check for LIMITINWORLD weapons (donor FlWeaponTryRespawn): spawn now if the world has room, else wait one weapon period.
function tryRespawnAt(now: number, limitInWorld: boolean, liveEntities: number, entityMax: number): number {
  if (!limitInWorld) return now;
  if (liveEntities < entityMax - ENTITY_RESERVE) return now;
  return nextSpawnAt(now, "weapon");
}

export {};
```

Checked by running the sketch on the VPS (compiled to JS, nine checks): an ammo add of 200 into a reserve of 240 with cap 250 adds 10 and stops at 250; a 5-round add at 250 is refused; an owned weapon whose ammo is full is refused; an owned weapon with room converts (reserve 240 + 30 clamps to 250); a new weapon attaches as 1 item; with weapon-stay on, an owned non-limited weapon is refused; a dead player is refused; the timers are now+30, now+20, and a limited weapon with 800 of 1000 entities spawns now while 950 waits 20 s. Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed name; the Frankendom repo was not checked for it). One pickup rule for weapons, ammo and items: the gate, the duplicate-to-ammo conversion and the reserve clamp all run on the server.
- Parity-checklist row 18 (loot roll and XP award). The pickup gate and the duplicate conversion are the award side of row 18. The respawn timers are row 23 (zone population and respawn) and belong to a separate target if adopted (section 6).
- Reuse tag: rewrite-from-idea (Valve licence; clean-room only)
- Brief rule served: 1 (one ledger: one pickup rule for every item kind); rules 7-9 n/a

## 6. Gaps and risks

- Licence: Valve's SDK licence allows free use for a modified Valve game and needs Valve's permission for commercial use. Clean-room only: the sketch is written from the mechanism, not translated.
- Defect 1, respawn by copying the entity: `Respawn` creates a new entity for every pickup (weapons.cpp 593-605), which is why the donor needs an entity budget at all (multiplay 872-883). fix: a respawn timer per spawn point (one entry in a timer wheel, row 23); no entity is created, so no budget check is needed for normal items.
- Defect 2, unverified return-value overloading: `GiveAmmo` returns an ammo index on success and -1 on refusal (player.cpp 3943), and `AddPrimaryAmmo` tests `iIdAmmo > 0` (weapons.cpp 924, and 947 in the secondary path). If index 0 is a valid ammo type, a successful give would look like a refusal. Not verified: `GetAmmoIndex` was not read. fix: return a boolean and the amount added, never an index.
- Defect 3, two places decide the same refusal: the base gate (gamerules.cpp 88-92) and the weapon-stay gate (multiplay 922-934) both refuse owned weapons, and the duplicate branch (player.cpp 3845) runs only after the gate has passed. fix: one pickup gate in one function, called by every pickup kind.
- Design choice to decide, not a defect: with a non-empty clip, all ammo from a pickup goes to the reserve (weapons.cpp 919). The clip is never topped up from a pickup. Frankendom must choose and write it in the catalogue.
- Respawn timers are row 23 territory: 20 s weapon, 30 s item and 20 s ammo are constants here (multiplay 45-47); in Frankendom they are per-zone data (zone population, row 23). The donor's `mp_weaponstay` rule (weapons respawn at 0 s when on) is a server cvar; Frankendom has no cvar and should not add one.
- Multiplayer-only: the single-player rules never respawn (singleplay_gamerules.cpp 269-320). Frankendom's zones are multiplayer-like, so do not port the single-player rules.
- Frankendom has one ledger and server-verified pickups. This donor's `dlls/` tree is the server game library in the SDK layout (not checked beyond the folder name), so the gate and clamp are server code here too. The client only shows the result.
- Not read: the tail of GiveAmmo, `AttemptToMaterialize` (which calls the try-respawn check), the ammo box's own `Respawn`, `CItem::MyTouch`, `SwitchWeapon`. The respawn call path from timer to materialize is therefore not verified end to end.
- Phone: nothing in this donor is a touch UI. The HUD slot code (cdll_dll.h 26) and the client is out of scope; loot ceremony, rarity colour and phone inspect are (not read).

Reuse tag: rewrite-from-idea (Valve licence; clean-room only)
Brief rule served: 1 (one ledger: one pickup rule for every item kind); rules 7-9 n/a
