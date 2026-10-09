# ioquake-ioq3 (loot-drops, cell 8)

Donor: /mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c | Licence: GPL-2 | C | symbol Touch_Item / Drop_Item / RespawnItem (verified: `RespawnItem` at 350, `Touch_Item` at 426, `LaunchItem` at 571, `Drop_Item` at 621).

## 1. Mechanism

- `Touch_Item` (426-559) runs on contact. It returns unless the toucher is a client (430) with health of at least 1 (432), and unless the shared grab rule `BG_CanItemBeGrabbed` allows it (436; the comment at 435 says the same rule is used client side and server side; its body was not read). It logs the pickup (440), then dispatches on the item type to a pickup function (445-477; an unknown type returns). A pickup function returns the number of seconds until respawn (comment at line 29); a return of 0 means the pickup was refused and `Touch_Item` returns with nothing changed (479-481). Pickup_Team lives in another file (not read).
- If taken: the pickup event is queued (predictable or not, 484-488), powerups and team items broadcast a global pickup sound unless the item's `speed` is set (491-508), then `G_UseTargets` fires the item's targets (511). So targets fire only on a taken pickup.
- Respawn interval (513-533): `wait == -1` hides the entity, clears contents, sets `unlinkAfterEvent` and returns with no respawn at all (514-520). Otherwise a non-zero `wait` replaces the value the pickup returned (523-525). Then, if `random` is set, `respawn += crandom() * random` (crandom is in [-1, 1]) and `respawn` is raised to 1 if lower (528-533); the floor applies only when `random` is set. A dropped item (`FL_DROPPED_ITEM`) gets `freeAfterEvent`, so it is freed after the pickup event and never respawns (536-538).
- The entity is then hidden but kept: no-client, no-draw, no contents (543-545). If `respawn <= 0` (the pickup returned -1, for example Pickup_PersistantPowerup line 189) it has no think and stays hidden until another event revives it (551-553); otherwise `nextthink = level.time + respawn * 1000` (milliseconds) with `RespawnItem` as the think (555-556).
- `RespawnItem` (350-418): for a teamed entity it counts the chain from the team master and picks one at `rand() % count` (356-373; `G_Error` if the master is missing); it sets contents to trigger, clears no-draw and no-client, relinks (379-382), plays a respawn sound for powerups and the kamikaze holdable (global unless `speed` is set, 384-412), always adds the local `EV_ITEM_RESPAWN` event (415) and clears `nextthink` (417).
- `LaunchItem` (571-612) spawns the dropped entity at an origin with a given velocity: trigger contents, touch hook `Touch_Item`, gravity trajectory, bounce, flags `FL_DROPPED_ITEM`. It sets a 30 s auto-free think (`G_FreeEntity`, 602-605), except a dropped CTF flag in a CTF game, which uses the flag-drop think with the same 30 s (595-601).
- `Drop_Item` (621-634): takes the dropper's yaw plus an `angle` argument, pitch forced to 0 (625-627), forward vector scaled to 150 (630), and `velocity[2] += 200 + crandom() * 50` (631), then calls `LaunchItem` at the dropper's position.
- Inputs: touch, pickup functions, respawn fields. Outputs: inventory changes, timed respawn, a thrown item.
- Tick: on touch, on the respawn think, on drop, and on the 30 s free think.

## 2. Key functions

- `Touch_Item`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` lines 426-559. Grab rule, log, pickup dispatch (0 = refused), targets, respawn interval, hide.
- `RespawnItem`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` lines 350-418. Team pick, make visible, respawn sound and event.
- `LaunchItem`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` lines 571-612. Spawns the dropped entity, 30 s auto-free.
- `Drop_Item`: `/mnt/frankendom-donors/ioquake-ioq3/code/game/g_items.c` lines 621-634. Velocity from yaw, upward kick, hands to `LaunchItem`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pickup returns the respawn interval (0 = refused); the item's own field can override it | per-item respawn values 25, 35, 40, 60, 120 s (theirs, lines 39-44); weapon values are cvars (theirs) |
| Jitter: a bounded random offset on the interval, floored at one second | `random` field (theirs, data); one-second floor (theirs) |
| Never-respawn as a non-positive interval; the item stays hidden; `wait == -1` unlinks it | sign convention (theirs) |
| Shared grab rule used by both client prediction and server | `BG_CanItemBeGrabbed` (theirs) |
| Drop velocity from facing, fixed speed, upward kick with a random part; dropped items expire | 150 speed, 200 upward, plus or minus 50 random (theirs, 630-631); 30 s expiry (theirs, 602-605) |

## 4. TypeScript sketch

simplified: the grab rule and the refusal path (a pickup returning 0), target firing, the `wait == -1` unlink branch, the global/local sounds, the team-chain pick, the 30 s expiry of dropped items and the physics launch are omitted; the sketch treats a dropped item as gone without the donor's free-after-event step; `Drop_Item`'s `angle` argument and the pitch reset are not modelled, and `wait` is not special-cased at -1 (the sketch treats it as a non-positive interval, i.e. never respawn, but without unlinking).
```ts
// Licence: GPL-2 (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
interface Item { id: number; wait: number; jitter: number; hidden: boolean; dropped: boolean; nextThinkAt: number | null; }

// Respawn interval: the item's own wait overrides the pickup's value; jitter is bounded and floored.
function respawnInterval(pickupValue: number, item: Item, rand: () => number): number {
  let r = item.wait !== 0 ? item.wait : pickupValue;
  if (item.jitter !== 0) {
    r += (rand() * 2 - 1) * item.jitter;
    if (r < 1) r = 1; // the donor floors only when jitter is applied
  }
  return r;
}

// After a pickup: dropped items are gone; others hide, and schedule a respawn unless the interval says never.
function afterPickup(item: Item, pickupValue: number, now: number, rand: () => number): void {
  if (item.dropped) { item.nextThinkAt = null; return; }
  item.hidden = true;
  const r = respawnInterval(pickupValue, item, rand);
  item.nextThinkAt = r <= 0 ? null : now + r;
}

// Respawn think: show the item again and clear its schedule.
function respawnThink(item: Item): void {
  item.hidden = false;
  item.nextThinkAt = null;
}

// Drop: velocity from the source's yaw at a fixed speed, with an upward kick and a random part.
function dropVelocity(yawRad: number, rand: () => number): { x: number; y: number; z: number } {
  const speed = 150;
  return {
    x: Math.cos(yawRad) * speed,
    y: Math.sin(yawRad) * speed,
    z: 200 + (rand() * 2 - 1) * 50,
  };
}
```

## 5. Lands in

- TARGET origins/server/mob-rewards.ts (the server decides a verified kill's drop) with the write in origins/inventory/inventory.ts (`receive`) and the roll in origins/encounters/encounters.ts (`rollLoot` / `intoBackpack`). Zone camps respawn through origins/mobs/populate.ts (camps from rows), so the donor's respawn timer has no kill-drop use; the one idea that lands is the interval as data (a catalogue/zone field with a default and a bounded jitter floored at 1 s). No new src/fight/loot.ts or src/fight/spawns.ts: both would duplicate encounters.ts and populate.ts.
- Parity checklist row 18 (loot roll and XP award; post-K item 3) for the drop; zones-as-data feature map for the respawn interval.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks

- One ledger: the pickup functions change the player directly and return only a timer. Frankendom grants through the server inventory in one transaction with the kill's CP and the token consumption (origins/server/mob-rewards.ts).
- Server-verified kills: the grab rule is shared with the client for prediction (comment, line 435). Frankendom has no client-predicted pickup; the server is the only authority and replays the kill from its seed.
- The respawn interval comes back as the pickup function's return value (and can be overridden by entity fields). Frankendom wants timing as a catalogue/zone field with a default, not a return value (no hidden numbers).
- The donor's `crandom()` is not seeded; any Frankendom jitter must come from the seeded stream the server replays.
- Dropped items are free-standing entities with a 30 s expiry (602-605) and any toucher can take them. In Frankendom a kill drop is claimed by the player the kill was verified for; with MAX_ATTACKERS = 3 up to three kills may be pending on one player, so a drop must be keyed to its kill, never first-to-touch.
