# id-Software-Quake-2 (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` | Licence: GPL-2.0 (gnu.txt) | C | symbol `Touch_Item / Drop_Item / DoRespawn` (verified: `Touch_Item` at 761, `Drop_Item` at 843, `DoRespawn` at 119, `SetRespawn` at 146).

## 1. Mechanism

- An item is an entity with a touch hook. `Touch_Item` (761-821) runs when a living client touches it. It calls the item's pickup function, which returns whether it was taken. If taken: a screen flash, a status-bar icon and message, a sound by type (health uses a sound by amount), and the selected-item change for usable items. Then, whether or not the pickup was taken, it fires the item's targets once (a spawnflag marks them used), so targets fire even when the pickup is refused.
- Pickup is refused in the pickup function, not in the touch hook: health refuses when the player is at max health (Pickup_Health 556-559, unless the item ignores the max); powerups refuse at a per-skill quantity limit (Pickup_Powerup 158-168).
- If an item was taken: the hiding is done by the pickup function's own `SetRespawn` call, which sets the respawn flag. The pickup functions call it only in deathmatch and only for items that are not dropped (for example Pickup_Powerup 174-175, Pickup_Health 581-582 with 30 s, Pickup_PowerArmor 737-738). `Touch_Item` (814-820) then clears that flag and keeps the entity (it does not hide it), or frees the entity if the flag was not set, so in single player a taken item is freed and does not respawn. Dropped items are always freed on pickup and never respawn. In cooperative play, items flagged to stay remain (unless dropped).
- `SetRespawn` (146-154) hides the entity (no-client, non-solid) and schedules `DoRespawn` after a delay. `DoRespawn` (119-144) picks one entity from a team chain at random (`rand() % count`), shows it, makes it solid again, and sends a respawn event.
- `Drop_Item` (843-890) spawns a tossed entity owned by the dropper (owner set at 862; the one-second think is set at 885), placed by a trace from the dropper's view when the dropper is a client (offset 24, 0, -16; box 15), and tossed with velocity 100 along the view direction and 300 up. Its touch hook is `drop_temp_touch`, which ignores the owner; `drop_make_touchable` runs one second later (`level.time + 1`, level.time is in seconds) and swaps the hook to `Touch_Item`, so after that second the dropper can take it too. In deathmatch the same function schedules `G_FreeEdict` another 29 s later, so a dropped item lasts 30 s in total; outside deathmatch it does not expire.
- Inputs: touch events, delays, team chains. Outputs: inventory changes, respawn timers, world entities.
- Tick: on touch, on pickup, on the respawn think, and on the drop's one-second think.

## 2. Key functions

- `Touch_Item`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` lines 761-821. Touch gate, pickup call, effects, free-or-keep.
- `SetRespawn`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` lines 146-154. Hides the item and schedules the respawn think.
- `DoRespawn`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` lines 119-144. Random member of a team chain; shows it again.
- `Drop_Item`: `/mnt/frankendom-donors/id-Software-Quake-2/game/g_items.c` lines 843-890. Spawns a dropped entity from the dropper's view.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Touch-to-take: a pickup function returns taken or not; the caller acts on it | pickup per item class (theirs) |
| Respawn by timer: hide now, show after a delay | delay passed per item (theirs, data; deathmatch only; 30 s for health at line 582) |
| Team-chain choice: one of several spawn points for one item, uniform | `rand() % count` (theirs) |
| Dropped item: free on pickup, no respawn; dropper excluded for a short window | exclusion 1 s (theirs, `level.time + 1`); deathmatch expiry 30 s total (theirs); drop offset and trace box 15 units, toss velocity 100 / 300 (theirs) |
| Health pickup sound by amount | amounts 2, 10, 25, 100 (theirs) |

## 4. TypeScript sketch

simplified: the cooperative stay-in-world rule, the respawn-flag handling in `Touch_Item`, the pickup effects (flash, icon, sound), the trace-based placement and the toss velocity are omitted; the sketch's drop exclusion is `OWNER_EXCLUDE_MS`, a millisecond version of the donor's 1 s (theirs), and the deathmatch 30 s expiry is not modelled.
```ts
// Licence: GPL-2.0 (gnu.txt) (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Item { id: number; alive: boolean; hidden: boolean; dropped: boolean; respawnAt: number | null; teamChain: number[]; targetsUsed?: boolean; }
interface Player { id: number; hp: number; maxHp: number; }

// Touch: only a living player can take an item; the item's own rule decides if it is taken.
// `take` is the item's own pickup rule; for a respawnable item it also does the hiding and scheduling
// (the donor's pickup calls its respawn setter), so the touch step does not hide anything itself.
function touch(item: Item, p: Player, take: (item: Item, p: Player) => boolean, fireTargets: (item: Item) => void): boolean {
  if (p.hp < 1 || item.hidden) return false;
  const taken = take(item, p);
  if (!item.targetsUsed) { fireTargets(item); item.targetsUsed = true; } // fires even if the pickup was refused
  if (!taken) return false;
  if (item.dropped) item.alive = false;                     // dropped: gone for good
  return true;
}

// The respawn setter a pickup rule calls: hide now, show after the delay.
function setRespawn(item: Item, now: number, respawnDelay: number): void {
  item.hidden = true;
  item.respawnAt = now + respawnDelay;
}

// Respawn: pick one of the team's spawn points at random, then show it again.
function respawn(item: Item, pickRandom: (n: number) => number, chainItems: Map<number, Item>): Item | null {
  const chain = item.teamChain.length > 0 ? item.teamChain : [item.id];
  const chosenId = chain[pickRandom(chain.length)];
  const target = chainItems.get(chosenId) ?? item;
  target.hidden = false;
  target.respawnAt = null;
  return target;
}

// Due respawns: called once per tick.
function dueRespawns(items: Item[], now: number): Item[] {
  return items.filter(i => i.hidden && i.respawnAt !== null && now >= i.respawnAt);
}

// Drop: a new entity at the dropper's position; the dropper is excluded for a short window (theirs: 1 s, level.time + 1)
const OWNER_EXCLUDE_MS = 1000;
function drop(itemId: number, at: { x: number; y: number }, dropperId: number, now: number): Item & { ownerId: number; ownerUntil: number } {
  return { id: itemId, alive: true, hidden: false, dropped: true, respawnAt: null, teamChain: [], ownerId: dropperId, ownerUntil: now + OWNER_EXCLUDE_MS };
}
```

## 5. Lands in

- TARGET origins/server/mob-rewards.ts (the server grants a verified kill's drop; the pickup rule returns taken or refused, modelled on `Touch_Item`) with the item write in origins/inventory/inventory.ts (`receive`); today src/loot.ts holds the Pit's loot table. Respawn timers have no kill-drop use. Checklist row 18 (loot roll and XP award; post-K item 3).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks

- One ledger: the donor's touch hook changes the player directly through the pickup function. In Frankendom the grant must go through the server inventory only, in one transaction with the kill's CP and the token consumption (origins/server/mob-rewards.ts header).
- Server-verified kills: touch is client-driven in the donor (the client's contact with the item is the event). Frankendom's server decides the pickup from a verified kill; the donor has no such check.
- MAX_ATTACKERS = 3: up to three creatures can die near one player, so a kill-drop claim must be per player and per kill, not first-to-touch. The donor's first-touch rule does not give that.
- The 1 s owner exclusion and the 30 s deathmatch expiry are the donor's numbers; any Frankendom claim window or expiry is ours and must be set as zone data, not copied.
- `DoRespawn` and the team chain are for map-placed items. A kill drop is not placed on a map point in Frankendom, so the respawn half does not apply.
