# exult-exult (loot-drops, cell 2)

Donor: `/mnt/frankendom-donors/exult-exult/actors.cc` | Licence: GPL-2.0-or-later (per actors.cc header: "either version 2 of the License, or (at your option) any later version"; repo COPYING is GPL version 2) | C++ | symbol `Actor::die`

Checked: Symbol `Actor::die` is defined at actors.cc 4309 and read through its loot part to the `delete_contents()` call at 4464. Also read: `Container_game_object::delete_contents` (objs/contain.cc 733-745), the append in `Container_game_object::add` (contain.cc 166), and `Actor::add` (actors.cc 3626-3676, fallback at 3671). Callers read at the call site only: `Actor::reduce_health` (actors.cc 3100-3101), `kill_npc` in usecode/intrinsics.cc 1698-1703, and the override `Monster_actor::die` (monsters.cc 517-518). Confidence: high on the order of operations; medium-high on the final removal of re-added items, because `Game_object::remove_this` was not read. Not read: `Map_chunk::find_spot`, `Dead_body`, `lay_down`, `gwin->set_body`, `Main_actor::die` (actors.cc 4838). camera_scope: not applicable (loot topic).

Best transferable idea: Keep the victim's loot as a server-owned corpse record that holds every non-bound item, with a floor fallback when no corpse exists, and never let death delete an item.
Decision (proposed): adapt - take the corpse-as-container shape and the bound-items-never-drop rule; reject the trailing delete_contents removal of spells and unplaceable items, since our one ledger must keep every item.
Acceptance: A defeated foe leaves a corpse holding its loot; a server test asserts that after a kill the corpse, floor and held items together equal the victim inventory before the kill, and that spell-flagged items never appear in the corpse.

## 1. Mechanism

- Entry: a dying actor calls `Actor::die(attacker)`. The health path reaches it from `reduce_health` when `is_dying()` (actors.cc 3100-3101). It returns at once if the actor is already dead (4312-4314, read).
- Order of steps in `die` (as the code runs):
  (a) mark the actor dead, clear its action and schedule, remove it from the time queue, clear the bleeding flag (4315-4319, read);
  (b) lay the actor down; if it is on a sleep frame, or is a frost serpent on a sit frame, a script removes it after 4 ticks instead (4345-4350, read; not part of the loot rule);
  (c) if the shape has body info and the monster is not `has_no_body`, make a `Dead_body` placed near the NPC's tile. Remove the NPC from the map, try four body spots (the corners of the footprint), then force the position to the NPC's tile if none is free, then put the NPC back (4355-4408; the put-back is at 4407);
  (d) one loop over the victim's inventory (4418-4439). Each item is removed from the victim. A spell goes to `tooheavy` (4422-4425). With a body, any other item is added to the body container (4429). With no body, the item is flagged `okay_to_take` and placed on the floor with a free-spot search of radius 5 (4431-4432). If there is no room it goes to `tooheavy` (4436). The floor check at 4433 tests the victim's tile `pos.tx`, not the spot found, so a failed search still moves the item (see section 6);
  (e) with a body: spells inside the body are removed and added to `tooheavy`, with the comment "move them back to the NPC" (4441-4453). Then the body contents are flagged `okay_to_take` (4453);
  (f) the `tooheavy` list is added back to the victim (4456-4459);
  (g) `delete_contents()` runs on the victim (4464). It removes every object in the victim's object list (contain.cc 739-743). The items added back in (f) are in that list, so they are removed too.
- Net effect as the code reads: a dead actor's loot becomes a body container, or floor items flagged takeable. Spells are never lootable. Items that cannot be placed are removed from the world, not kept (see the caveat in (g)).

## 2. Key functions

- `Actor::die`: `/mnt/frankendom-donors/exult-exult/actors.cc` 4309 to the `delete_contents()` call at 4464 (function end not read).
- `Container_game_object::delete_contents`: `/mnt/frankendom-donors/exult-exult/objs/contain.cc` 733-745 (loop over the owner's object list, `remove` then `remove_this(nullptr)`).
- `Actor::add` (fallback into `Container_game_object::add`): `/mnt/frankendom-donors/exult-exult/actors.cc` 3626-3676; the container append is at `/mnt/frankendom-donors/exult-exult/objs/contain.cc` 166.
- The death entry from the health path: `/mnt/frankendom-donors/exult-exult/actors.cc` 3100-3101 (`reduce_health`).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Death moves the whole inventory out in one pass; spells are split off first | Spell rule: spells are never lootable (theirs, actors.cc 4422; comment at 643 says readied spellbooks are never dropped, a related rule elsewhere) |
| Corpse exists when the body shape exists and the monster does not have `has_no_body` | Body data from the monster (theirs, actors.cc 4355) |
| Floor fallback: free-spot search around the death tile | Radius 5 passed to `find_spot` (theirs, actors.cc 4432; unit not read) |
| Corpse and floor items are flagged takeable | Rule: `okay_to_take` set recursively (theirs, actors.cc 4431, 4453) |
| Items with no room are held | Donor keeps them in `tooheavy`, then removes them via `delete_contents` (theirs, actors.cc 4436, 4458, 4464; see section 6) |

## 4. TypeScript sketch

simplified: keeps spells and unplaceable items on the victim (what the donor's comment says it does) instead of letting its trailing `delete_contents` remove them; uses the real spot result instead of the donor's `pos.tx` check (actors.cc 4433); processes the inventory in one pass with the corpse decided up front. It omits the four-corner body placement (4392), the body frame animation, the frost-serpent removal branch, the NPC body registration (`gwin->set_body`), nested containers (the donor gathers spells recursively), removal from the time queue, and the attacker's fight-back.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type ItemId = string;

interface Item {
  id: ItemId;
  isSpell: boolean;   // spells are never lootable
  takeable: boolean;  // may another actor take it from the corpse or ground
}

interface Corpse {
  id: string;
  items: Item[];
}

interface DeathOutcome {
  corpse: Corpse | null;  // null when the victim has no body shape
  ground: Item[];         // items placed on the floor, takeable
  held: Item[];           // spells and items with no room: they stay with the victim, not deleted
}

const GROUND_SCATTER_RADIUS = 5; // the donor passes 5 to its spot search (unit not read)

// One pass over the victim's inventory at death. Nothing is deleted.
function settleDeath(
  inventory: Item[],
  hasCorpse: boolean,
  findGroundSpot: (radius: number) => boolean, // true when a free tile was found
): DeathOutcome {
  const corpse: Corpse | null = hasCorpse ? { id: "corpse", items: [] } : null;
  const ground: Item[] = [];
  const held: Item[] = [];
  for (const it of inventory.splice(0)) {
    if (it.isSpell) { held.push(it); continue; }      // spells never go to a corpse or the floor
    if (corpse) { corpse.items.push(it); continue; }  // everything else goes into the corpse
    it.takeable = true;
    if (findGroundSpot(GROUND_SCATTER_RADIUS)) { ground.push(it); } else { held.push(it); }
  }
  if (corpse) {
    for (const it of corpse.items) { it.takeable = true; }
  }
  return { corpse, ground, held };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (run on the file at /tmp/exult-death-loot.ts).

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, called from the engine death step): the corpse as a server-owned record holding the victim's items, plus the floor fallback. Parity-checklist row 18 (loot roll and XP award). The kill is server-verified; row 17 (death/respawn) is the caller.
- today: none (Frankendom has no corpse or loot record yet).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (no item leaves the victim without landing in exactly one place); server-verified kills (the death step runs once on the server)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism, not the lines.
- The trailing `delete_contents()` (actors.cc 4464) removes everything left on the victim, including spells and unplaceable items put back at 4456-4459. The comment says they go back to the NPC. This contradicts "one ledger". Frankendom must test that no item vanishes on death: the sum of corpse, floor and held items must equal the victim's inventory before the kill.
- The floor branch checks the victim's tile (`pos.tx != -1`, actors.cc 4433), not the spot found (`pos2`, 4432). When the search fails the item is still moved to `pos2`. Not run; from reading.
- The donor is single-player: nothing says who may take a corpse. Frankendom needs claim rules (killer, party, timeout) and the server must verify each take. None of that is in the donor.
- The corpse is a tile object with volume checks (`Container_game_object::add`, not fully read). Frankendom has no tiles: the corpse should be a ledger record with an id, not a grid object.
- No loot roll is in this path. The per-item drop chance does not exist here; `Actor::roll_to_win` (actors.cc 3990) is a combat roll and was not read past its first branch.
- Spells have no Frankendom analogue. The transferable rule is "bound items never drop", as a data flag on the item.
- `Main_actor::die` (actors.cc 4838) overrides this path and was not read. `Monster_actor::die` (monsters.cc 517-518) only calls `Actor::die`.
