# Open-RSC-Core-Framework (death-respawn-penalty, cell 1)

Donor: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Player.java` (with `container/Inventory.java`, `entity/GroundItem.java`, `entity/Mob.java`, `player/Duel.java`) | Licence: GNU AFFERO GENERAL PUBLIC LICENSE Version 3 (the LICENSE file header; copyleft, clean-room, shape only) | Java | symbol `killedBy` (player death) and `dropOnDeath` (item rule)

Checked: Read in full: `Player.killedBy` (2195-2328), `Inventory.dropOnDeath` (423-558), `GroundItem.belongsTo` (107-129) and `isInvisibleTo` (147-166), `Mob.damage` (910-926), the attack function `Mob.startCombat` (726, skull call at 765; read 726-770 only in part), `Player.setSkulledOn` and `addSkull` (740-760, 2890-2896), `PlayerSettings` add/last-attacked (119-140), `Duel.dropOnDeath` (169-197, end of method not read). Callers of `killedBy`: `Mob.java:914` and `916` read (the only caller read in full, through `damage`); `CombatEvent.java:135`, `ProjectileEvent.java:103/160/164/166`, `SpellHandler.java:1780`, `Server.java:730` and `Npc.java:296` seen by grep only (not read). So the claims below about the player-death path hold for the `damage` caller; I did not check other callers in full. Death hook `PlayerDeathTrigger` (`PlayerDeath.java`, empty stub): grep found no call sites for `onPlayerDeath` or `blockPlayerDeath`, so the trigger is not used on this path. Not read: `Npc.killedBy` body (NPC death drops), `Skills.normalize`, `cure()`, the event loop that fires `DelayedEvent` and `SingleEvent`, item definitions (`getDefaultPrice`, `isStackable`, `isUntradable`), `DeathLog`, the config file read by `tryReadInt` and `tryReadBool`. Camera: not a camera cell (camera_scope n/a). Confidence: high on the player-death order and the keep-N rule; medium on the pile-life unit (milliseconds, inferred from the 20-minute skull comment at `Player.java:2894`, the `Event` constructor not read). No resurrection, ghost or necromancy path found: grep for `resurrect`, `revive` and `ghost` in `server/src` hit only item and NPC names.

Best transferable idea: On a player death, protect a fixed number of the most valuable keepable items (fewer when the victim is skulled, one more with a protect prayer), and move only a bounded number to the killer.
Decision (proposed): adapt — keep the protected-slot rule as zone data and change the transfer to take-one; reject the donor's drop-all, which conflicts with the take-one ruling.
Acceptance: Server test: an unflagged victim with 6 keepable items killed by a player keeps 3 protected, the killer's ledger gains exactly 1 item, the victim ends with 5 items, and a third player sees the pile only after 64 s.

## 1. Mechanism

- One function kills a player: `Player.killedBy(Mob mob)`. Called from `Mob.damage` when the hit takes HITS to zero or below (`Mob.java:912-916`), and from the projectile and combat events. The killer is the mob argument (`Player.java:2222`).
- Order of steps (as the code runs):
  (a) Bail if the player is not logged in (2196) or already dead (2197). Set the dead flag (2198). Play the death sound and send the died packet (2200-2201).
  (b) Tutorial special case (2203-2213): exits early for one NPC kill; not part of the rule.
  (c) Clear the projectile, clear the "attacked by" list, store `last_death` (2215-2220).
  (d) If the killer is a player (2222-2270): message the killer, victory sound, PK kill-count and feed only when the killer stands in the Wilderness (`inWilderness`), defence-cape damage message, reset tracked damage for everyone who hit the dead player.
  (e) Always: register a bones pile (2273), owned by the killer if the killer is a player, owner-less otherwise (the `player` variable is the killer, see 2222).
  (f) Duel: if a duel is active for either side, the duel stake drop runs instead of the normal drop (2275-2278). Otherwise, unless the player has elevated privileges, `Inventory.dropOnDeath(mob)` runs (2279-2281). This is where the item rule lives (below).
  (g) Hardcore ironman: demoted to plain ironman on death (2283-2287).
  (h) Reset combat, clear the opponent (2289-2290). Respawn: the cached `death_location` branch is dead (2292-2294; the code comment says it never gets set), so the player is always placed at the global `RESPAWN_LOCATION_X/Y` (2296), defaults 120 and 648 (`ServerConfiguration.java:640-641`).
  (i) Sync the world, stats, inventory and equipment, reset path, cure, normalise skills, reset update flags (2299-2316). Remove the skull (2317). Start a 5-tick `killed` guard that clears itself (2320-2326).
- Item rule, `Inventory.dropOnDeath` (423-558):
  (1) Build one list: equipment only if the equipment-tab option is on (436; default false, `ServerConfiguration.java:622`), then the inventory (455). Key per item = default price, or -1 for stacks and noted items ("Stacks are always lost", 445).
  (2) Order: a TreeMap in reverse key order (426), so the most valuable first and stacks last. Within each price bucket, sort by catalog id then amount (461-470).
  (3) Protect the top three keepable items, but only if the player is not skulled and not an ultimate ironman (475-483). A stackable item in the top three ends the protection early (the loop tests only `isStackable`, 478-480). Noted non-stackable items also sort last (key -1) but do not stop it and are not excluded, so with fewer than 3 real items noted items fill the protected slots (donor defect: unintended; the sketch keeps the 'noted sorts last' idea and the walk-until-stackable rule, and a new rule should exclude noted items from protection).
  (4) If the protect-items prayer is on and an item is left, protect one more keepable item (485-489). Skulled players still get this one.
  (5) Route each remaining item (494-534): untradable items stay on the victim's tile and are owned by the victim, 640 s life (504-508); if the killer is an NPC or there is no killer, the item is owner-less with `killedByMob` set, 640 s (513-520); if a player killed the victim, the pile is owned by the killer, or by the victim if the killer is an ironman (525-527), tagged `killerHash`, 640 s (531-534).
  (6) Family-crest gauntlets are re-granted if missing (541-553; the comment says this duplicates them on purpose).
- Skull (the PvP flag): `Mob.startCombat` (`Mob.java:726`) calls `setSkulledOn` on the attacking player when the victim is a player (`Mob.java:763-765`). It skulls the attacker for 20 minutes (`addSkull(1200000)`, `Player.java:2894`) unless the victim has hit the attacker in the last 20 minutes (`Player.java:2893`, reading `PlayerSettings.lastAttackedBy`, which returns the time a given player last hit this one). So an attack that answers a recent hit is not skulled. `addSkull` is a no-op while a skull event exists (741), so a second PvP attack does not renew the 20-minute timer. The skull is removed when the timer fires (`addSkull` schedules `removeSkull`, 740-746) and also on death (2317).
- Ground-pile visibility (`GroundItem`): a player-owned pile is visible and takeable by its owner and by its killer at once (`belongsTo` 129, `killerHash` 154). Everyone else sees a tradable pile only after 64 s (`isInvisibleTo` 148-165, `<= 64000` means still hidden); an untradable pile is hidden from everyone but its owner for good (the untradable check at 155 returns true before the killer and timer checks), so the killer never sees it. An owner-less pile (NPC kill) is visible and takeable by everyone at once (`belongsTo` returns true when the owner hash is 0, 129). An ironman who did not own the pile sees a `killedByMob` pile but cannot take it (160-162 and `belongsTo` 125).
- Tick: the death call is synchronous, one per lethal hit (`Mob.damage`), not a per-frame loop. Timers use `GAME_TICK` (640 ms, `ServerConfiguration.java:28`): the dead guard is 5 ticks (2320), the piles last `GAME_TICK * 1000` (534) = 640000 ms, and the skull timer is 1200000 ms.

## 2. Key functions

- `killedBy` (death handler): `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Player.java` 2195-2328. Everything in section 1 (a) to (i).
- `dropOnDeath` (item rule): `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/container/Inventory.java` 423-558. Ranking 426-470, protection 474-489, routing 494-534.
- Pile visibility and take rule: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/GroundItem.java` 107-166.
- Skull: `Player.java` 740-746 (`addSkull`), 2890-2896 (`setSkulledOn`); `Mob.java` 726 and 763-765; `PlayerSettings.java` 119-120 and 133-135.
- Duel stake drop (the other death path): `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Duel.java` 169-197 (`dropOnDeath`, stake items go to the opponent's pile).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rank by value, stacks and noted last | Key = default price, -1 for stacks and noted (`Inventory.java:426, 445, 455`) |
| Protect the top N keepable items | N = 3 (`Inventory.java:476`); 0 when skulled or ultimate ironman (475) |
| Protect-items prayer adds one | +1 keepable item (`Inventory.java:485`) |
| Unprotected items all go (donor has no take count) | Take count: none in donor (all remaining items dropped, 494-534) |
| Owner-only window for a dropped pile | 64000 ms (`GroundItem.java:165`) |
| Pile lifetime | `GAME_TICK * 1000` = 640000 ms (`Inventory.java:534`; `GAME_TICK` = 640, `ServerConfiguration.java:28`) |
| Dead guard | `GAME_TICK * 5` = 3200 ms (`Player.java:2320`) |
| Skull timer | 1200000 ms = 20 min (`Player.java:2894`); not skulled if the victim hit the attacker in the last 20 min (2893) |
| Respawn tile | Global `120, 648` (`ServerConfiguration.java:640-641`); the per-death location branch is dead (2292-2294) |
| Lethal check | `newHp <= 0` (`Mob.java:912`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (rank, protect N plus prayer capped at keepable items, then route) and adds the take count from Frankendom's take-one rule. It differs from the donor on purpose: after `takeCount` items, the victim keeps the rest (the donor drops every unprotected item). It omits the duel stake branch, the Hardcore rank demotion, the tutorial exit, the PK kill count and feed, the defence-cape message, party loot sharing (off by default in the donor, `ServerConfiguration.java:652`), the equipment-tab option (worn gear is treated as inventory here), the ironman rule for NPC-kill piles (`killedByMob`), the 5-tick dead guard, and the respawn call. Tie-break uses the item id string, not the donor's catalog number. Typechecked on the VPS: `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

export interface Item {
  id: string;
  amount: number;
  value: number;       // default price per item, from the item definition
  stackable: boolean;
  noted: boolean;
  untradable: boolean;
}

export interface DeathRule {
  keepUnflagged: number;  // protected items when not PvP-flagged (donor: 3)
  keepSkulled: number;    // protected items when skulled (donor: 0)
  prayerExtra: number;    // one more protected item while the protect prayer is on (donor: 1)
  takeCount: number;      // items that move to the killer; Infinity = donor (every unprotected item)
  ownerWindowMs: number;  // only the owner and the killer see a player-owned pile for this long (donor: 64000)
  pileLifeMs: number;     // pile despawns after this long (donor: GAME_TICK * 1000 = 640000)
  respawn: { x: number; y: number }; // respawn tile (donor: one global config point)
}

export interface Pile {
  item: Item;
  ownerId: string | null;   // null = owner-less (NPC killer): visible and takeable by all at once
  untradable?: boolean;     // donor: invisible and untakeable to everyone but the owner, permanently
  killerId: string | null;  // the player who made the kill, who always sees the pile
  spawnedAt: number;
}

// Protected = walk the ranked list, up to N + prayer items, stopping at the first stackable (donor tests isStackable only).
// Noted non-stackable items sort last (key -1) but ARE protectable when fewer than N real items exist.
export function settleDeath(
  inv: Item[],
  victimId: string,
  killerId: string | null,
  killerIronman: boolean,
  skulled: boolean,
  prayerOn: boolean,
  rule: DeathRule,
  nowMs: number,
): { kept: Item[]; piles: Pile[] } {
  // Stacks and noted items sort last (key -1); the rest by default price, highest first.
  const key = (it: Item): number => (it.stackable || it.noted ? -1 : it.value);
  const ranked = [...inv].sort((a, b) => key(b) - key(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // donor: the walk breaks at the first stackable item; a noted non-stackable item does not break it
  let keepable = 0;
  while (keepable < ranked.length && !ranked[keepable].stackable) keepable += 1;
  const n = (skulled ? rule.keepSkulled : rule.keepUnflagged) + (prayerOn ? rule.prayerExtra : 0);
  const protectedCount = Math.min(n, keepable);

  const kept: Item[] = ranked.slice(0, protectedCount);
  const piles: Pile[] = [];
  let takes = 0;

  for (const it of ranked.slice(protectedCount)) {
    if (it.untradable) {
      // untradable stays on the victim's tile, owned by the victim
      piles.push({ item: it, ownerId: victimId, killerId: null, spawnedAt: nowMs, untradable: true });
      continue;
    }
    if (killerId === null) {
      // no player killer: owner-less pile
      piles.push({ item: it, ownerId: null, killerId: null, spawnedAt: nowMs });
      continue;
    }
    if (takes >= rule.takeCount) {
      // adapt: beyond the take count the victim keeps the item (donor drops it)
      kept.push(it);
      continue;
    }
    takes += 1;
    // an ironman killer cannot take: the pile goes to the victim instead (donor rule)
    const ownerId = killerIronman ? victimId : killerId;
    piles.push({ item: it, ownerId, killerId, spawnedAt: nowMs });
  }
  return { kept, piles };
}

// Donor isInvisibleTo/belongsTo for player-owned piles: owner and killer see it at once; others wait the window.
export function canSee(p: Pile, viewerId: string, nowMs: number, rule: DeathRule): boolean {
  if (p.ownerId === null) return true;
  if (p.untradable) return p.ownerId === viewerId; // donor isInvisibleTo: untradable hides before any timer
  if (p.ownerId === viewerId || p.killerId === viewerId) return true;
  return nowMs - p.spawnedAt > rule.ownerWindowMs;
}

export function pileExpired(p: Pile, nowMs: number, rule: DeathRule): boolean {
  return nowMs - p.spawnedAt >= rule.pileLifeMs;
}
```

## 5. Lands in

- TARGET `src/fight/death.ts` (new module, engine death step, server-side): the one function that moves items on a death and returns the respawn tile. Parity-checklist row 17 (death/respawn). The zone respawn-point and population side belongs to row 23 and is not part of this note.
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only, shape only)
- Brief rule served: 1 (one engine: the death step is one server function, not a client rule); 17 (death/respawn). Rules 7-9 n/a.

Data shape (PASS2 item 1):
- Donor data: no table for the death rule. Rule constants are in code (`Inventory.java`, `Player.java`, `GroundItem.java`). Config keys (`respawn_location_x`, `respawn_location_y`, `want_equipment_tab`, `want_parties`) are read by `tryReadInt` and `tryReadBool` from a config file that was not read. Item rows come from the item definitions (not read); the code reads `catalogId`, `amount`, `noted`, `defaultPrice`, `stackable`, `untradable`.
- Row fields for a new death rule: `keepUnflagged:int`, `keepSkulled:int`, `prayerExtra:int`, `takeCount:int`, `ownerWindowMs:int`, `pileLifeMs:int`, `respawn:{x:int,y:int}`.
- A new death tier is one row: no. In the donor a tier is an if on `isSkulled()` and `isIronMan(Ultimate)` (`Inventory.java:475`). In our sketch a tier is a `DeathRule` row, so a new keep count or take count for a zone is one row: yes.

Provenance per claim: repo Open-RSC-Core-Framework (no `.git` folder, no changelog read), file and line as in receipts; licence AGPL-3.0, so shape only.

What they patched later: no history available (no `.git`, no CHANGELOG in the box). Code comments are the only record:
- `Player.java:2310` "OG RSC did not reset active prayers after death": a deliberate authenticity choice, prayers kept through death.
- `Player.java:2293` "Seems to never be set": the cached death-location branch is dead code.
- `Inventory.java:541` "This authentically duplicates them if they were just dropped on death": the family-crest gauntlets re-grant is a known duplicate, kept on purpose.
- `Player.java:2215` "Seems to never be set" (on the projectile attribute, not death; noted only to be clear).

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch comes from the described mechanism.
- Donor drops everything unprotected. Frankendom's take-one rule needs `takeCount` (default 1 in our proposal). The sketch adapts this; it is not the donor.
- Credit goes to `combatWith` at the lethal hit (`Mob.java:914`, `916`). How `combatWith` is chosen was not read. Frankendom's many-on-one rule needs the killer from the engine's hate list, not the last hitter. Not solved by the donor.
- Death is a dead flag plus a 5-tick guard (`Player.java:2198`, 2320), not a state. Frankendom's engine rule is that a state change is explicit: the death should be a state (`dead`, `lockUntilTick`), and the server should be the only place it is set.
- One ledger: the donor moves items by calling `remove` on the carried-items container (`Inventory.java:499`) and then registers ground items. Frankendom must do the take and the drop as one ledger transaction, with the server verifying the kill.
- Owner window: the donor's 64 s window applies only to player piles, and NPC-kill piles have no window (`GroundItem.java:129`, 148). Frankendom should decide which piles get a window.
- Party loot sharing is off by default (`ServerConfiguration.java:652`), so the donor never tested it in default settings. Frankendom has no party loot.
- Worn gear is excluded from the death list unless the equipment-tab option is on (`Inventory.java:436`, default false at `ServerConfiguration.java:622`). Silent in the donor; see Ruling 3.
- Time unit: `GAME_TICK` multiples are passed as milliseconds to the event constructors. The unit is inferred from the 20-minute comment (`Player.java:2894`); the event loop was not read.
- Death hook `PlayerDeathTrigger` has no call site on this path (grep). Do not model a death plugin on it.

## Defects to keep the idea and fix (Dom rule 2026-10-10)

- Drops every unprotected item, no take count. fix: `takeCount` data field (default 1 for take-one); the victim keeps the rest (see sketch).
- Noted non-stackable items can take protected slots (only `isStackable` is tested, `Inventory.java` 478-489). fix: exclude noted items from the protection walk (data flag `protectNoted`, default false); keep the 'noted sorts last' idea.
- Dead death-location branch (`Player.java:2292-2294`). fix: remove it; the respawn tile is zone data.
- `Mob.damage` calls `killedBy` in both branches of an identical `if` (`Mob.java:913-917`). fix: one call.
- Dead guard is a timer flag, not a state (`Player.java:2198`, 2320). fix: a `dead` state with `lockUntilTick`.
- Pile window is hard-coded at 64000 ms (`GroundItem.java:165`). fix: `ownerWindowMs` in zone data.

## Rulings for Dom

1. Protected items on death: keep 3 when unflagged, 0 when skulled, plus 1 with the protect prayer (the donor's numbers). Recommendation: yes, with the counts as zone data so an open-PvP zone can differ.
2. Take-one on a player kill: the killer takes exactly one item from the unprotected set, the victim keeps the rest. Recommendation: yes (take count 1). The donor drops everything; we do not copy that.
3. Worn gear on death: the donor keeps worn gear by default. Recommendation: keep worn gear in unflagged zones; decide per zone for open PvP.

Reuse tag and weight: Core slice uses this this week for the first duel loop (row 17, `src/fight/death.ts`). Feeds the many-on-one kill credit (hate list, not `combatWith`) and the take-one rule.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Error: note said stacks AND noted items are "never keepable"; the donor protection loop breaks only on `isStackable()`, so noted non-stackable items can fill protected slots (confirmed against Inventory.java).
- Missed: untradable piles are invisible to everyone but the owner permanently (confirmed, GroundItem.isInvisibleTo).
- Missed: `addSkull` is a no-op while the skull event exists, so a repeat attack does not renew the 20-minute timer (confirmed).
Fixed 2026-10-12: Mechanism 3 text, sketch comment and keepable count (walk until first stackable), sketch canSee for untradable piles (Pile.untradable), pile-visibility and skull lines, new defect line; work/Open-RSC-Core-Framework-death.ts updated to match.
