# LostCityRS-Engine-TS (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` | Licence: MIT (LICENSE line 1 "MIT License", line 3 "Copyright (c) 2023-2026 Lost City"; code may be adapted, keep the notice) | TypeScript | symbol `World.addObj`

Checked: read in full: `World.addObj` (World.ts 1465-1500), `World.removeObj` (1516-1533), `Zone.addObj` (Zone.ts 302-326), `Zone.revealObj` (328-347), `Zone.removeObj` (358-375), `Zone.getObj` (377-384), `Obj.turn` and `Obj.isValid` (Obj.ts 27-62), `Entity.setLifeCycle` (Entity.ts 36-43), pickup in `OBJ_TAKEITEM` (ObjOps.ts 137-160), player drop in `INV_DROPITEM` (InvOps.ts 163-186), tick rate (World.ts 120). Partly read: per-player visibility filters (Zone.ts 125-147, 162, 214; the enclosing function names were not read). Callers: `World.addObj` is called from `INV_DROPITEM` (InvOps.ts 183, the owner is the dropping player) and from `Obj.turn` (Obj.ts 39, static respawn with no owner). The NPC-death caller is not in this repo (not read). Drop tables and loot rolls: not in the donor (grep for droptable, drop_table, loot, dropTable, rarity over the repo found nothing; content scripts are not in this repo). Confidence: high on ownership, reveal, despawn, pickup and cap; there is no loot-roll code in the donor to copy.

Best transferable idea: give a dropped pile to its killer for a fixed window (100 ticks in the donor), then make it public; an untradeable pile is never revealed to other players and simply expires (the donor's server pickup check stops refusing other players after the window, so Frankendom must add that refusal itself).
Decision (proposed): adapt - keep the owner-first window, the untradeable rule and the despawn timer, but as server state in the one ledger, with the window, timer and pile cap as zone data, and the pickup owner check on the server, not the client.
Acceptance: a server test drops a pile for player A; a take by player B inside the window is refused, A's take succeeds, and after the window any player can take it; an untradeable pile is never shown to B, a take by B after the window is refused by the server (a Frankendom rule: the donor's pickup check would let B take it), and the pile is removed at its despawn tick.

## 1. Mechanism

- A player drop creates an `Obj` with lifecycle DESPAWN and calls `World.addObj(floorObj, player.hash64, duration)` (InvOps.ts 182-183). The duration is an argument from the script; the engine has no default for it.
- `World.addObj` (World.ts 1465-1499), in order:
  - (a) If the item is stackable and a DESPAWN pile of the same type already exists with the same receiver on that tile, and the merged count is at most `Inventory.STACK_LIMIT` (0x7fffffff, effectively no cap), the new count is added to the existing pile and its lifecycle tick is set to the new duration (1468-1478). The merged pile's despawn timer restarts. Return.
  - (b) Otherwise `zone.addObj` is called (1482-1484).
  - (c) If the receiver is not NO_RECEIVER (an owned drop): the pile gets `setLifeCycle(duration)`, `receiver64` = owner, and `reveal` = 100 (1486-1493). The comment at 1487 says it reveals "100 ticks after being dropped".
  - (d) Else (a public drop): `reveal` = -1 and `setLifeCycle(duration)` (1496-1498).
- Zone add (Zone.ts 302-326): a DESPAWN pile is added to the tail of the zone's list (315). If the zone is at its cap (`totalObjs >= Zone.OBJS`, 305), the code walks the list from the head (oldest first, see LinkList.ts 13 and 105) and removes the first DESPAWN pile it finds, with duration 0 (307-309). It removes at most one, and if no DESPAWN pile exists nothing is removed and the add still goes ahead, so the cap is soft.
- Per tick, `Obj.turn` (Obj.ts 27-50), in order: (1) if `reveal > -1` and the countdown reaches 0, `World.revealObj(this)` (28-29); (2) `--lifecycleTick`; at 0, a DESPAWN pile that is active is removed with `World.removeObj(this, 0)` (33-37).
- Reveal (`Zone.revealObj`, Zone.ts 328-347): if the item is not tradeable (or is members-only on a free world) or `reveal` is already -1, it sets `reveal` = -1 and returns, without clearing the owner (334-337). So an untradeable owned pile keeps its owner and is never announced to other players, until it despawns. But `Obj.isValid` only rejects a non-owner while `reveal > -1` (Obj.ts 52-55), so once that reveal tick has set `reveal` to -1, the pickup gate no longer refuses other players for such a pile. Otherwise the owner is cleared to NO_RECEIVER, `reveal` = -1, and an `ObjReveal` event is queued (339-346); who receives it is decided by the zone filters (Zone.ts 141, read but not traced further).
- Visibility: `Obj.isValid(hash64)` (Obj.ts 52-62) returns false only while `reveal > -1` and the asker is not the owner (53-55); after the reveal tick (`reveal` = -1) it no longer checks the owner, even if the owner was kept (untradeable pile). The zone's per-player update filters send an add only to the owner for owned piles (Zone.ts 137), skip owned piles in the full resend to other players (162), and skip follow events addressed to someone else (214); these filters are what keep an untradeable pile hidden from others after the reveal tick.
- Pickup (`OBJ_TAKEITEM`, ObjOps.ts 137-160): if `!obj.isValid(player.hash64)` the take returns false (143-145). Otherwise the count goes to the inventory (147) and the pile is removed: for a RESPAWN object with `respawnrate` (156-157), for a DESPAWN pile with duration 0 (158-159).

## 2. Key functions

- `World.addObj`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/World.ts` 1465-1500 (merge, owner window, public drop).
- `Obj.turn` and `Obj.isValid`: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/entity/Obj.ts` 27-62 (reveal countdown, despawn, visibility gate).
- `Zone.addObj` (cap and eviction): `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` 302-326.
- `Zone.revealObj` (untradeable exception, owner clear, reveal event): `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/zone/Zone.ts` 328-347.
- Pickup gate: `/mnt/frankendom-donors/LostCityRS-Engine-TS/src/engine/script/handlers/ObjOps.ts` 137-160 (the owner check is at 143-145).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Owner-only window, then public | REVEAL = 100 ticks (Obj.ts 9); tick length TICKRATE = 600 ms (World.ts 120), so about 60 s |
| Despawn timer on each drop | duration passed by the script (InvOps.ts 164, 183); no engine default |
| Untradeable piles never go public | rule at Zone.ts 334-337; no number |
| Stack merge restarts the despawn timer | STACK_LIMIT = 0x7fffffff (Inventory.ts 14): effectively no cap |
| Pile cap per zone, oldest-first eviction | Zone.OBJS = (SIZE << 1) + 1 with SIZE = 8 * 8 (Zone.ts 36-38), so 129 (computed); total includes static objects (Zone.ts 74-75, 236-237) |
| Static respawn (not loot) | respawnrate default 100 ticks, "default to 1-minute" (ObjType.ts 181), used by pickup of RESPAWN objects (ObjOps.ts 157) |
| Respawn scaled by player count (not loot) | (4000 - min(players, 2000)) * rate / 4000, truncated (World.ts 1733-1734), applied in removeObj (1523, 1528-1529); row 23 territory |

## 4. TypeScript sketch

simplified: keeps the owner window, the reveal, the untradeable exception, the despawn timer, the stack merge (with timer restart) and oldest-first eviction at the cap, in the donor's order (reveal countdown, then despawn). Difference from the donor: the donor's pickup refuses a non-owner only while the reveal countdown runs; with `ownerOnlyForever` false the sketch's `takePile` behaves like that, with it true (Frankendom's wanted rule for untradeable piles) it is stricter. `isVisibleTo` (the update filters) stays owner-only for an untradeable pile in both cases. It omits: static (respawning) piles and their count toward the cap, the members-only check, the per-player event filters, the wealth log, the zone tile lookup, the ObjAdd/ObjReveal messages, and the stack-limit value (it is a parameter). Every pile in the sketch despawns, so eviction always finds a candidate; the donor's soft-cap case is not modelled.

```ts
// Licence: MIT (donor, LostCityRS-Engine-TS). clean-room
// Sketch of the ownership and reveal shape of dropped piles. Not a line-by-line translation.
export {};

const PUBLIC = -1;          // no owner: anyone can see and take the pile
const REVEAL_TICKS = 100;   // owner-only window; zone or encounter data in Frankendom
const PILE_CAP = 129;       // piles per zone before the oldest is evicted; zone data in Frankendom

interface Pile {
  itemId: number;
  count: number;
  stackable: boolean;
  tradeable: boolean;
  owner: number;            // player id, or PUBLIC
  revealIn: number;         // ticks until the pile goes public; -1 = not counting
  despawnIn: number;        // ticks until the pile is removed
}

interface Zone { piles: Pile[]; }   // array order = insertion order, oldest first

type PileEvent = 'revealed' | 'stays-private' | 'despawned';

function removePile(zone: Zone, pile: Pile): void {
  const i = zone.piles.indexOf(pile);
  if (i !== -1) zone.piles.splice(i, 1);
}

// Drop a pile. owner = the dropper or killer, or PUBLIC for a drop to everyone.
function addPile(zone: Zone, itemId: number, count: number, stackable: boolean, tradeable: boolean,
                 owner: number, despawnTicks: number, stackLimit: number): Pile {
  const duration = Math.max(1, despawnTicks);

  // Stackable piles of the same item and owner on this tile merge; the merged pile restarts its timer.
  if (stackable) {
    const existing = zone.piles.find(p => p.itemId === itemId && p.owner === owner);
    if (existing && existing.count + count <= stackLimit) {
      existing.count += count;
      existing.despawnIn = duration;
      return existing;
    }
  }

  // Full zone: evict the oldest pile. Static (non-despawning) piles are not modelled here.
  if (zone.piles.length >= PILE_CAP) {
    zone.piles.shift();
  }

  const pile: Pile = {
    itemId, count, stackable, tradeable, owner,
    revealIn: owner === PUBLIC ? -1 : REVEAL_TICKS,
    despawnIn: duration,
  };
  zone.piles.push(pile);
  return pile;
}

// Visibility (the donor's per-player update filters): a private pile is only shown to its owner.
function isVisibleTo(pile: Pile, player: number): boolean {
  return pile.owner === PUBLIC || pile.owner === player;
}

// Pickup gate: returns the count taken, or 0 if refused (not present, empty, or not allowed for this player).
// Donor: a non-owner is refused only while the reveal countdown runs (revealIn > -1); ownerOnlyForever = true is the stricter Frankendom rule.
function takePile(zone: Zone, pile: Pile, player: number, ownerOnlyForever: boolean): number {
  if (!zone.piles.includes(pile) || pile.count < 1) return 0;
  const refused = ownerOnlyForever ? !isVisibleTo(pile, player)
                                   : pile.revealIn > -1 && pile.owner !== PUBLIC && pile.owner !== player;
  if (refused) return 0;
  const taken = pile.count;
  removePile(zone, pile);
  return taken;
}

// One server tick for one pile: reveal countdown first, then despawn countdown.
function tickPile(zone: Zone, pile: Pile): PileEvent[] {
  const events: PileEvent[] = [];
  if (!zone.piles.includes(pile)) return events;

  if (pile.revealIn > 0) {
    pile.revealIn -= 1;
    if (pile.revealIn === 0) {
      pile.revealIn = -1;
      if (pile.tradeable) {
        pile.owner = PUBLIC;
        events.push('revealed');
      } else {
        // Untradeable piles keep their owner and stay private until they despawn.
        events.push('stays-private');
      }
    }
  }

  if (pile.despawnIn > 0) {
    pile.despawnIn -= 1;
    if (pile.despawnIn === 0) {
      removePile(zone, pile);
      events.push('despawned');
    }
  }
  return events;
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module: ground piles and their owner window, server side, one ledger). Parity-checklist row 18 (loot roll and XP award; the ground-pile ownership is the ground half of it). The pile cap is a per-zone object cap, so it is named as zone data here, not as a row 23 spawn cap.
- Reuse tag: adapt-allowed (MIT; code may be adapted, keep the licence notice; this note takes the shape only)
- Brief rule served: one ledger and server-verified loot (Frankendom rulings: the owner check runs in the engine, the client only displays); rules 7-9 n/a

## 6. Gaps and risks

- There is no loot roll or drop table in this repo. The donor gives ownership and timing only. Frankendom's roll (row 18) has to come from elsewhere; do not read this note as a drop table.
- The window is in ticks. Its real length in seconds depends on Frankendom's own tick length, which this note did not read.
- The server pickup check (ObjOps.ts 143-145) refuses non-owners only during the owner window (`reveal > -1`). For an untradeable pile after the window the donor's pickup passes for any player, and only the per-player visibility filters (Zone.ts 137, 162, 214) hide it. Frankendom must put the owner check in the server take handler, for the whole life of an untradeable pile, and test it.
- An untradeable owned pile keeps its owner and stays hidden from others until it despawns (Zone.ts 334-337), but is takeable by any player who can request it, because `isValid` stops checking after the reveal tick (Obj.ts 52-55). Frankendom must decide on purpose whether it is owner-only forever (the sketch's `ownerOnlyForever` flag) or takeable by anyone.
- A stack merge restarts the despawn timer (World.ts 1476), so a pile can outlive its first timer if topped up. Frankendom should decide whether that is wanted.
- Eviction removes the oldest DESPAWN pile, which may be someone's owner-only pile, and the cap is soft (no removal when no DESPAWN pile exists). Frankendom's zone data should pick a cap and an eviction rule on purpose.
- The donor's cap counts static objects too (Zone.ts 236-237). The sketch does not model this.
- Not read: `Zone.queueEvent` and the client handling of `ObjReveal`; the full body and name of the function that holds the event checks at Zone.ts 125-147; the NPC-death caller of `World.addObj` (not in this repo).


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Main claim 'an untradeable owned pile never goes public / stays owner-only until it despawns' is only half true. Zone.revealObj (Zone.ts 334-337) sets reveal=-1 and keeps receiver64, but Obj.isValid (Obj.ts 52-55) only rejects non-owners while `reveal > -1`; after the reveal tick reveal is -1, so the pickup gate OBJ_TAKEITEM (ObjOps.ts 143) passes for ANY player. Only the client-visibility filters (Zone.ts 137, 162, 214) still hide it. So the note's own 'owner check that matters is the server pickup check (143-145)' does not hold for untradeable piles, the sketch's isVisibleTo (owner-only forever) is stricter than the donor, and the Acceptance line for untradeable piles would fail against the donor. Everything else verified: REVEAL=100 (Obj.ts 9), TICKRATE 600 (World.ts 120), Zone.OBJS=129 (Zone.ts 36-38), STACK_LIMIT 0x7fffffff, merge restarts lifecycleTick (World.ts 1476), eviction removes first DESPAWN pile oldest-first and soft cap (Zone.ts 305-313), turn order reveal then despawn (Obj.ts 28-37), setLifeCycle clamps to >=1 (Entity.ts 36-43), respawnrate 100 (ObjType.ts 181), scaleByPlayerCount (World.ts 1731-1735), MIT.

**Missed:** Merge in World.addObj sets lifecycleTick directly (no Math.max(1,...) clamp that setLifeCycle applies); also reveal is NOT reset on merge so a merged pile keeps its old reveal countdown.
