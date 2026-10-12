# xu4-engine-u4 (inventory-bank-equipment, cell 9)

Donor: /mnt/frankendom-donors/xu4-engine-u4/src/item.cpp | Licence: GPL-3.0 (COPYING in the donor root is the GPLv3 text; item.cpp carries only a $Id$ header with no licence notice, so the licence is taken from COPYING) | C++ | symbol itemConditionsMet, itemAtLocation, putReagentInInventory, isWeaponInInventory

Checked: opened item.cpp lines 1-168 (location table and rune, stone and item pickups), 386-534 (mystic, weapon, reagent pickups; condition check; location lookup; use dispatch), 1181-1191 of src/game.cpp (the Search action), 136-156 of src/dungeon.cpp (the dungeon search), xu4.cpp 455-508 (xu4_srandom and xu4_random), savegame.h (grep for the reagents, weapons, moves and lastreagent fields), utils.h and party.cpp adjustReagent (grep only). Not read: item.cpp 169-385 (use handlers: bell, horn, wheel, skull, stone, key), 539-567 (abyss and stone helpers), the adjustKarma amount, and the move counter increment. The bag, bank and equipment slot topic is NOT in this donor's pickup code: there is no slot model, no stacking into a bag and no move or swap; the only inventory-like concepts are per-type counts and one-time flags. Confidence: high on the pickup gate, grant and cap order (every line in the pickup path read, and the single caller checked); high that the grant path has two callers (game.cpp:1188 and dungeon.cpp:149), found by grep; the grep did not prove there are no other callers through function pointers, so that is medium-high. camera_scope: n/a (not a camera topic).

## 1. Mechanism
Ultima IV style searchable objects are rows in one static table, items[] (item.cpp:51). Each row names the map label that places the object (locationLabel), a display name, an "is in inventory" test, a "put in inventory" grant, an optional use handler, a data value, and condition bits (SC_NEWMOONS, SC_FULLAVATAR, SC_REAGENTDELAY).

The Search action (game.cpp:1181-1191) does three things in order: itemAtLocation looks up the map label with a case-insensitive compare (item.cpp:488-499) and returns the row only if itemConditionsMet passes (item.cpp:493-494); if the row is found and its owned test is true, the player sees "Nothing Here!" (game.cpp:1183-1184); otherwise the player sees "You find..." and the put handler runs (game.cpp:1187-1188). If the conditions fail, itemAtLocation returns NULL, so a gated object looks exactly like empty ground ("Nothing Here!", game.cpp:1191).

The three gates (item.cpp:463-482):
- SC_NEWMOONS: both moon-phase counters must be 0 (trammelphase and feluccaphase, item.cpp:466-468).
- SC_FULLAVATAR: every karma value must be 0 (item.cpp:470-475).
- SC_REAGENTDELAY: the grant is refused while (moves & 0xF0) equals lastreagent (item.cpp:477-479). lastreagent is set to moves & 0xF0 by every grant except the weapon grant (item.cpp:133, 148, 163, 417, 452).

The grants:
- Rune: 100 XP, karma event KA_FOUND_ITEM, flag bit set (item.cpp:130-133).
- Stone: 200 XP, flag bit set (item.cpp:145-148).
- Item (bell, book, candle, horn, wheel, skull): 400 XP, flag bit set (item.cpp:160-163).
- Mystic sword or armour: 400 XP, count += 8 (item.cpp:409-417).
- Weapon: count++ (item.cpp:433). Ownership of a weapon is true if the count is above 0 or any party member has that weapon equipped (item.cpp:420-429).
- Reagent: karma event, then count += xu4_random(8) + 2, so a find adds 2 to 9 units (item.cpp:449-452). No XP. The count is capped at 99 and the player sees "Dropped some!" for the overflow (item.cpp:454-456). The reagent ownership test is a constant false (item.cpp:445-447), so the reagent gate is the cooldown alone.

The random draw is xu4_random (xu4.cpp:479-508): on the non-Boron path it uses rand() scaled to 0..upperRange-1 (xu4.cpp:495-497). rand() is seeded by xu4_srandom(seed) (xu4.cpp:459-468); where that seed comes from was not read, so it is not known to be per player.

## 2. Key functions
- itemConditionsMet (item.cpp:463-482): the three gates, in the order newmoons, fullavatar, reagent delay. Returns true only if all pass.
- itemAtLocation (item.cpp:488-499): label lookup, then the condition check. Returns the first matching row or NULL.
- putReagentInInventory (item.cpp:449-458): karma event, add 2 to 9, set the bucket, cap at 99 with the message.
- isWeaponInInventory (item.cpp:420-430) and putWeaponInInventory (item.cpp:432-434).
- Callers of the gate-then-grant path (grep of itemAtLocation and the put handler across src): two. The Search action (game.cpp:1181-1191) and dungeonSearch (dungeon.cpp:142-152), which says "You find Nothing!" when no object is at the location (dungeon.cpp:152). Both run the same owned check, then the put handler. itemUse (item.cpp:504-534) is a separate path, called from combat.cpp:1056 and game.cpp:1206; it was not read in full.

## 3. Numbers vs mechanism
- XP per one-time find: 100 (rune), 200 (stone), 400 (item and mystic). Reagents and weapons award no XP in these functions.
- Reagent grant: 2 + xu4_random(8), which is 2 to 9 units.
- Reagent cap: 99 (item.cpp:454-455; the generic AdjustValue in utils.h:16 also caps at 99 for other reagent paths).
- Mystic grant: +8 to the count (item.cpp:412, 414).
- Reagent delay: compares moves & 0xF0 (bits 4-7 of the low byte), so the bucket takes values 0 to 240 in steps of 16 (item.cpp:477-478, savegame.h move field declared uint32_t at savegame.h:210). The bucket is read from the move counter; the code that advances it was not read.
- New-moon gate: both phase counters equal 0.
- Full-avatar gate: every karma value equal 0.

## 4. TypeScript sketch
simplified: the donor writes into a save struct through global state and uses rand(); the sketch takes a pure ledger and an injected roll. It omits the weapon grant and its equipped-weapon ownership test, the mystic +8 grant (its FIXME is the donor's own warning), the use handlers, the karma amount (the sketch's karma +1 is a placeholder; the donor calls adjustKarma(KA_FOUND_ITEM) and the amount was not read), and the abyss helpers. Donor defects fixed in the sketch: the grant checks one-time ownership itself instead of relying on its caller (fix: the put step is not reachable without the owned check); the roll is injected instead of rand() (fix: server RNG). Kept from the donor: gate-then-grant order, the move-bucket cooldown, the 2 to 9 reagent grant, the cap at 99 with the overflow reported (here returned as dropped instead of only a message).

```ts
// Clean-room shape of a location-gated pickup with a capped stack.
// Shape only, written from the donor's gate-then-grant order (GPL-3 donor, no line-by-line translation).
// fix: the grant checks ownership itself (donor relies on its caller); the roll is injected (donor uses rand()).

export type Gate = 'newMoons' | 'fullAvatar' | 'reagentDelay';

export interface PickupDef {
  readonly id: string;
  readonly locationLabel: string; // map label that places the object (zone data)
  readonly kind: 'flag' | 'stack';
  readonly xp: number;            // XP tier for one-time finds (data); stacks award no XP here
  readonly gates: readonly Gate[];
  readonly stackCap?: number;     // consumables: donor caps reagents at 99
}

export interface WorldState {
  readonly newMoons: boolean;
  readonly allKarmaZero: boolean;
  readonly moveBucket: number;    // moves & 0xF0 (bits 4-7 of the low byte): values 0..240 in steps of 16
}

export interface Ledger {
  readonly owned: Set<string>;          // one-time items
  readonly stacks: Map<string, number>; // consumables
  lastGrantBucket: number;              // move bucket at the last grant
  xp: number;
  karma: number;
}

export type SearchResult =
  | { kind: 'nothing' }
  | { kind: 'found'; id: string; dropped: number };

export function conditionsMet(gates: readonly Gate[], w: WorldState, l: Ledger): boolean {
  if (gates.includes('newMoons') && !w.newMoons) return false;
  if (gates.includes('fullAvatar') && !w.allKarmaZero) return false;
  // Reagent delay: no grant while the move bucket equals the bucket of the last grant.
  if (gates.includes('reagentDelay') && w.moveBucket === l.lastGrantBucket) return false;
  return true;
}

// Gate first, then grant. A one-time item already held returns 'nothing' (fix: checked here, not by the caller).
// roll(n) must return 0..n-1.
export function search(
  def: PickupDef,
  w: WorldState,
  l: Ledger,
  roll: (n: number) => number,
): SearchResult {
  if (!conditionsMet(def.gates, w, l)) return { kind: 'nothing' };

  if (def.kind === 'flag') {
    if (l.owned.has(def.id)) return { kind: 'nothing' };
    l.owned.add(def.id);
    l.xp += def.xp;
    l.karma += 1; // placeholder: donor calls adjustKarma(KA_FOUND_ITEM); the amount was not read
    l.lastGrantBucket = w.moveBucket;
    return { kind: 'found', id: def.id, dropped: 0 };
  }

  // Stack: donor grants 2..9 (roll(8) + 2), then caps. The overflow is returned, not lost silently.
  const cap = def.stackCap ?? 99;
  const before = l.stacks.get(def.id) ?? 0;
  const want = before + roll(8) + 2;
  const after = Math.min(want, cap);
  l.stacks.set(def.id, after);
  l.karma += 1; // placeholder, same as above
  l.lastGrantBucket = w.moveBucket;
  return { kind: 'found', id: def.id, dropped: want - after };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in
Target file (proposed, not checked against the Frankendom repo): origins/loot/pickup-gates.ts. Parity row 18 (loot roll and XP award): a searched or looted object is gated on world state, granted once or as a capped stack, and XP is awarded per tier. The gate-then-grant order belongs in the server, not the client, so the player never sees a grant the server has not verified.

## 6. Gaps and risks
- One ledger and server-verified kills: the donor writes grants straight into the save struct with no transaction. Frankendom must make each grant a single server write that checks the owned set, the cooldown bucket and the cap together.
- Not server-authoritative RNG: xu4_random uses rand() (xu4.cpp:495-497), seeded by xu4_srandom (xu4.cpp:459-468) from a seed whose source was not read. Frankendom needs a seeded roll owned by the server, per player or per event.
- Donor defects to fix before reuse (keep the idea): (1) the one-time grant relies on the caller to check ownership (game.cpp:1183-1188); fix: the server grant checks it. (2) Overflow above 99 is only a message ("Dropped some!", item.cpp:456); fix: return the overflow and give it to a bank or bag. (3) The mystic +8 grant; the donor's FIXME at item.cpp:389-398 says more mystic items could be obtained than intended. Not reproduced here; fix: one-time only, no +8. (4) isReagentInInventory is a constant false (item.cpp:445-447), so only the cooldown limits reagent farming; fix: a per-zone cap or a server cooldown ledger.
- Gated objects look like empty ground ("Nothing Here!", game.cpp:1191). That is a presentation choice to keep for hidden loot, but the client must not reveal the gate state; the server should decide visibility.
- Not applicable: MAX_ATTACKERS = 3 and the Pit are not touched by this mechanism. The "Dropped some!" and "You find..." messages are client-only; the grant logic is engine-side.
- Missing from the donor: bag and equipment slots, stacking into slots, atomic move and swap, bank, drop ceremony. Frankendom must build those without help from this file.

Reuse tag: adapt (gate-then-grant pickup with a move-bucket cooldown and a capped stack that reports overflow; the bag, slot and atomic-move parts are not in this donor).

Brief rule served: rule 1 (the hint file was the wrong place for loot; item.cpp and game.cpp were the real path), rule 4 (numbers quoted only where read; the karma amount and move counter increment marked not read), rule 7 (GPL-3: clean-room shape only), fold-in "loot = drop ceremony, rarity, phone inspect": the donor's "You find..." line and "Nothing Here!" line are the only presentation and there is no rarity colour or sound in this code.

Best transferable idea: Gate a pickup on world state first, then grant it once (refuse if already owned) or as a capped stack that reports the overflow, with a cooldown keyed to the move counter.

Decision (proposed): adapt - keep gate-then-grant, the move-bucket cooldown and the capped stack that reports overflow; change ownership to a server check inside the grant, use a seeded server roll, and drop the mystic +8 farm (the FIXME).
Acceptance: a server test searches the same reagent location twice inside one move bucket and asserts the second search grants nothing; and a stack at 95 granted 9 caps at 99 and reports dropped 5, which the client shows as a "Dropped some" line.

Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: CLEAN. All checked claims hold (items[] at item.cpp:51, gate order 463-482, itemAtLocation 488-499, lastreagent setters, XP 100/200/400, mystic +8 and FIXME, reagent 2+xu4_random(8) and cap 99, call sites, savegame fields, GPL v3).
- Missed (minor): xu4_random has a USE_BORON branch (boron_random % range) that the note covers only as "non-Boron path"; the isStoneInInventory generic virt == -1 test is not mentioned. Nothing important missed.
