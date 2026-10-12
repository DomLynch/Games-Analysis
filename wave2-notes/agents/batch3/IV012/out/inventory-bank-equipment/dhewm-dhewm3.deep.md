# dhewm-dhewm3 (inventory-bank-equipment, cell 9)

Donor: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` | Licence: GPL-3.0 (`COPYING.txt` line 2: "Version 3, 29 June 2007"; source headers "Doom 3 GPL Source Code") | C++ | symbol `idInventory::Give`

Checked: Read in full: `idInventory::Give` (733-849), `idPlayer::GiveItem` (2949-2986), `idPlayer::GiveInventoryItem` (3224 on; append at 3228), `idItem::GiveToPlayer` and `idItem::Pickup` (Item.cpp 344-380), `idInventory::Drop` (857-879), `idInventory::HasAmmo` and `UseAmmo` (883-930), `idPlayer::UpdateHud` pickup-toast block (6083-6105). Callers of `idInventory::Give` checked: `idPlayer::Give` (2868-2914), which `GiveItem` calls (2966) and which `RestoreInventory` reaches (405-407). Not read: `idPlayer::Give` callers beyond these, the GUI files that draw the toasts (`itemtext`, `itemicon`, `itemPickup` events), the item-side of drop, and the data `.def` files (not in the donor box, so every `max_<ammo>` value is unknown). Also the d3xp copy was read only at the toast lines (7196-7213) and `GiveItem` (3594 on; end not checked). Confidence: high on the pickup order and the caps; high on the toast defect; medium on whether the GUI adds its own stagger. Camera: not applicable.

## 1. Mechanism

- A world item is applied to the player in one call. `idItem::Pickup` (Item.cpp 361) asks `GiveToPlayer` first (363). If that returns false it returns false at once, before the sound, the targets, the contents clear and the hide (378 onward). So a refused item stays in the world.
- `GiveToPlayer` (Item.cpp 344-353) routes items marked `inv_carry` to `GiveInventoryItem` (350). Every other item goes to `idPlayer::GiveItem` (353).
- `idPlayer::GiveItem` (2949) walks every attribute of the item (2963-2967) and calls `idInventory::Give` on each one. `gave` becomes true if any single attribute was applied. There is no all-or-nothing check, so a pickup that fills only one of its attributes is still consumed.
- `idInventory::Give` (733) checks each stat kind in turn.
  - Ammo (`ammo_` prefix): the stock is compared with `max` (749). At or above max, the attribute is refused (returns false). Otherwise the amount is added, and clamped to `max` only when `max` is above 0 (755-756). `max` comes from the player's spawn arg `max_<ammo>` (653), default 0. A stat with no `max_` entry therefore reads as max 0 and is refused.
  - Armour: refused when `armor >= maxarmor` (766), with the comment "can't hold any more, so leave the item" (767). Otherwise added and clamped to `maxarmor` (773).
  - Weapons: in single player, a weapon whose bit is already set is not taken (823). Taking a weapon sets its bit (834). The weapon's ammo arrives through its own ammo attribute, so an owned weapon can still pay out its ammo.
  - `inv_carry` items: `GiveInventoryItem` (3224) appends a copy of the item to `inventory.items` (3228). There is no cap and no merge with an existing copy, and the function always returns true.
  - Unknown stat names: a warning is logged and the attribute returns false (845). The other attributes still apply.
- The HUD toast queue. `idPlayer::GiveItem` adds the item's display name to `inventory.pickupItemNames` only when `gave` is true and no name was added during this call (2981). The count check exists because ammo `Give` queues its own name via `AddPickupName` (Player.cpp 760-763), which the check avoids doubling. Items with `inv_carry` bypass `GiveItem` and queue their own toast in `GiveInventoryItem` (3237), firing the `invPickup` HUD event (3240). The health, stamina and air refuse-when-full gates live in `idPlayer::Give` (2876, 2891, 2906) and run before `inventory.Give`; the weapon HUD pulse is throttled by `lastGiveTime + 1000` (828). `idPlayer::UpdateHud` (6072) drains that queue into HUD slots 1-5, for the local client only (check at 6079-6080). It is called from 6356 and 7896, which were not read. Each pass fires up to five toasts (6090). Each toast that does not end a set sets the next gate 400 ms later (6101). The toast that ends a set sets the gate to `onePickupTime + 2000` (6099). `onePickupTime` is meant to hold the set's first-toast time, but it is never written (see section 6), so that gate is 2000 ms, not a rest.
- Drop: `idInventory::Drop` (857-879) clears the weapon's bit (873). When the weapon has an ammo type, it sets that weapon's clip to -1 and that ammo type's stock to 0 (876-877). The comment says the ammo is "pushed in the item", but the item side was not read.

Order of steps for one pickup: (1) `Pickup` asks `GiveToPlayer`; (2) `GiveItem` walks the attributes, calling `Give` on each; (3) a weapon attribute refreshes the weapon HUD; (4) if something was given, one display name is queued; (5) `GiveItem` returns `gave`; (6) if true, `Pickup` plays the sound, fires targets, clears the contents and hides the item; (7) later `UpdateHud` calls drain the name queue into toasts.

## 2. Key functions

- `idInventory::Give`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 733-849. Per-stat gate, cap clamp, refuse-when-full, weapon bit.
- `idPlayer::GiveItem`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 2949-2986. Any-of over attributes; display name queued only when `gave`.
- `idPlayer::GiveInventoryItem`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 3224 on (append at 3228). Unbounded append to `inventory.items`.
- `idItem::Pickup` and `GiveToPlayer`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Item.cpp` 344-380. The item is consumed only after the give succeeds.
- `idInventory::Drop`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 857-879. Clears the weapon bit and zeroes that weapon's ammo.
- Toast drain in `idPlayer::UpdateHud`: `/mnt/frankendom-donors/dhewm-dhewm3/neo/game/Player.cpp` 6083-6105. Five per pass, 400 ms gap, 2000 ms rest (intended).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Refuse a pickup when the stat is already at its cap, and leave the item in the world | Refusal test `ammo >= max` (749) and `armor >= maxarmor` (766). Theirs. |
| Cap clamp: excess above the cap is discarded, not returned | Caps from `max_<ammo>` (653), default 0 (theirs). Values are in `.def` data, not in the donor box. |
| A stat with no cap reads as 0 and is refused | Default 0 (653). Theirs. |
| Any-of consumption: the item is consumed if any attribute applied | `gave` set per attribute (2966-2967). Theirs. |
| Ownership as one bit per weapon slot | 16 weapon slots (`MAX_WEAPONS = 16`, Player.h:67) and 16 ammo types (`AMMO_NUMTYPES = 16`, Weapon.h:55). Theirs. |
| Toast pacer: at most a set of five, a short gap, a rest after a full set | Five per set (6090), 400 ms gap (6101), 2000 ms rest (6099). Theirs. |
| Unknown key is logged and skipped | Warning text (845). Theirs. |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's refuse-when-full rule, the cap clamp and any-of consumption. It differs in three places. (a) An unknown stat refuses the whole pickup; the donor skips only that attribute and applies the rest. (b) The toast pacer shows one toast per tick; the donor can show up to five in one pass with no gate check between them (6090). (c) The pacer's rest is anchored on the set's first toast, which is the donor's evident intent; the donor never sets that anchor (6095-6096), see section 6. Idle reset uses the last toast time, where the donor uses the gate time (6086). It omits the weapon bitmask, the `inv_carry` list, the single-player weapon re-take rule, the clip rule, the multiplayer re-pick, the item-side of drop and the HUD event names.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Attr = { stat: string; amount: number };

// max 0 means "no room", as the donor's ammo gate does (Player.cpp:749).
interface Stat { current: number; max: number; }
interface Store { stats: Map<string, Stat>; }

// Returns false (item stays on the floor, untouched) when nothing would change.
// Attributes that are already full are skipped; the rest are applied (any-of, as in the donor).
function tryPickup(store: Store, attrs: Attr[]): boolean {
  const plan: Attr[] = [];
  for (const a of attrs) {
    const s = store.stats.get(a.stat);
    if (!s) return false;               // unknown stat: refuse the whole item (donor skips only that attribute)
    if (s.current >= s.max) continue;   // full: this attribute adds nothing
    plan.push(a);
  }
  if (plan.length === 0) return false;  // nothing to gain: the item is not consumed
  for (const a of plan) {
    const s = store.stats.get(a.stat)!;
    s.current = Math.min(s.max, s.current + a.amount); // excess above max is discarded, not returned
  }
  return true;
}

// Toast pacer: at most five toasts per set, 400 ms between toasts, 2000 ms rest after a full set,
// measured from the set's first toast (the donor's intent; its anchor is never set, see section 6).
interface Pacer { queue: string[]; slot: number; setStart: number; nextAt: number; lastShown: number; }
const GAP_MS = 400;
const SET_SIZE = 5;
const REST_MS = 2000;
const IDLE_RESET_MS = 2000;

// Called once per tick. Shows at most one toast per call.
function tickToasts(p: Pacer, now: number, show: (slot: number, text: string) => void): void {
  if (p.queue.length === 0) return;
  if (now < p.nextAt) return;
  if (p.slot > 0 && now - p.lastShown > IDLE_RESET_MS) p.slot = 0; // idle: the next set starts at slot 1
  if (p.slot === 0) p.setStart = now;                              // anchor the set on its first toast
  show(p.slot + 1, p.queue.shift()!);
  p.lastShown = now;
  p.slot += 1;
  if (p.slot === SET_SIZE) {
    p.slot = 0;
    p.nextAt = p.setStart + REST_MS;
  } else {
    p.nextAt = now + GAP_MS;
  }
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/IV012-dhewm-dhewm3-pickup.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/loot.ts` (proposed module name; not checked against the Frankendom repo): one pickup is one engine step that either changes the caps or is refused, and the item is consumed only on success. Parity-checklist row 18 (loot roll and XP award).
- The toast pacer is client HUD. It belongs under row 14 (HUD) and is not in this section's row.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one ledger: a pickup changes stats or is refused, in one step); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not translated.
- Any-of pickup: `GiveItem` consumes the item when one attribute applies (2966-2967). A full ammo attribute silently drops its share. Frankendom's one-ledger rule needs a decision: all-or-nothing (refuse when any part would be lost) or any-of (this donor). The sketch keeps any-of. Decide before building.
- Unbounded bag: `inv_carry` items are appended with no cap and no merge (3228). The donor has no bag, bank or equipment slot count. Slot counts would have to be new data fields, not something to copy from here.
- Weapons are an ownership bitmask (Player.h:67), not equip slots. This code has no equip slot model.
- Defect, toast anchor never set (keep the idea, fix the code): the test for the first toast (6095) runs after the post-increment in the same loop (6093), so it is never true. `onePickupTime` is therefore never set (6096 is its only write). The rest after five is `onePickupTime + 2000` (6099), which is 2000 when the anchor is 0, so the 2 s rest does not hold. The d3xp copy has the same lines (d3xp/Player.cpp 7196-7213), except that in multiplayer the set size is 3, not 5 (count = 3 under isMultiplayer), so 'five per set' holds for single player only. fix: set the anchor before the increment when the slot is 1. The sketch does this.
- Defect, the 400 ms gap is not checked inside the loop (keep the idea, fix the code): up to five toasts fire in one pass (6090) and the gap is only read on the next pass. fix: one toast per tick, as the sketch does. Whether the GUI adds its own stagger between `itemPickup1..5` events was not read (GUI files not in the donor box).
- Gate on max 0: a stat with no `max_` key is refused (749, 653). If Frankendom wants "no cap", the data must say so explicitly, not rely on 0.
- Unknown stat: logged and skipped (845). Frankendom should reject an unknown stat in the catalogue check, not at runtime.
- Multiplayer re-pick (823) is a multiplayer rule; not copied.
- Pickup presentation on a 375 px phone: the toast layout and touch UX are in GUI files that were not read. Nothing here shows phone layout.
- Data: every `max_<ammo>` value, the item names and the icons come from `.def` data that is not in the donor box. The numbers in section 3 are the code's constants only.
- Doom 3 is a single-player shooter with a per-player inventory; the "bag" is one unbounded list. Frankendom's bag, bank and equipment numbers have to come from its own data.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (one ledger: a pickup changes stats or is refused, in one step); rules 7-9 n/a

Best transferable idea: a pickup is refused whole-or-part when the store has no room, the item stays in the world, and the pickup toast queue is paced in one place.

Decision (proposed): adapt - keep refuse-when-full and the cap clamp, and the toast pacer with its anchor fixed; do not copy the any-of consumption until Frankendom has chosen its ledger rule (section 6).
Acceptance: a server test asserts that a pickup into a full stat leaves the world item and the ledger unchanged, and that a pickup which fills one attribute and not another consumes the item only under the chosen rule; on a 375 px phone, five pickups in one frame show five toasts at 400 ms steps and the next set waits 2 s from the first toast.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Gap: the toast section did not say why GiveItem checks the queue count (ammo Give queues its own name, Player.cpp 760-763). Confirmed.
- Gap: inv_carry items bypass GiveItem and queue their own toast in GiveInventoryItem (3237) and fire invPickup (3240). Confirmed.
- Error: 'same lines / five per set' is not exact for d3xp; multiplayer branch uses count = 3 (d3xp/Player.cpp 7196-7213). Confirmed.
- Missed: idPlayer::Give (2868-2916) holds the health/stamina/air refuse-when-full gates (2876, 2891, 2906); mechanism list omitted them. Also the weapon HUD throttle lastGiveTime + 1000 (828).

Fixed 2026-10-12: added the ammo/inv_carry toast paths, the d3xp multiplayer set size of 3, and the health/stamina/air gates. Sketch unchanged.
