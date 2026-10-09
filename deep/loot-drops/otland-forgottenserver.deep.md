# otland-forgottenserver (loot-drops, cell 8)

Donor: /mnt/frankendom-donors/otland-forgottenserver/data/scripts/events/monster/default_onDropLoot.lua | Licence: GPL-2 (LICENSE in the donor root; text not re-read) | Lua (C++ dispatcher) | symbol default onDropLoot / Container.createLootItem

Symbol check: the input pointed to `Monster::dropLoot` (src/monster.cpp line 1963-1968, verified). That function is a dispatcher: it fires the Lua event `onDropLoot` only when the corpse exists and the monster's `lootDrop` flag is set. The roll is in Lua, documented below.

## 1. Mechanism

- Death path: `Creature::onDeath` (creature.cpp 448-521) calls `dropCorpse(...)` (511). `Creature::dropCorpse` (523-582) first checks `!lootDrop && getMonster()`: such a monster gets only a poof effect and no corpse (526-536). Otherwise it makes the blood splash by race (538-555), creates the corpse with `getCorpse` and places it on the tile (564-568), runs the creature death script events (571-574), and if a corpse exists calls `dropLoot(corpse->getContainer(), lastHitCreature)` (576-578).
- `Monster::dropLoot` (monster.cpp 1963-1968) forwards to `tfs::events::monster::onDropLoot` only if `corpse && lootDrop` (1965). The C++ event bridge (events.cpp) was not read; the Lua side is `Monster:onDropLoot` (data/events/scripts/monster.lua 1-9), which runs the default event when registered (`hasEvent.onDropLoot`) and then, for a player owner, `player:updateKillTracker`.
- The default event (data/scripts/events/monster/default_onDropLoot.lua, 3-40) runs once per death. First gate: if the `RATE_LOOT` config is 0, return (4-6).
- Stamina gate (8-14): the owner is `Player(corpse:getCorpseOwner())`. Loot is created if there is no player owner, or the player's stamina is above 840, or the stamina system is off. So a monster with no player owner always drops, and at 840 or below the owner gets nothing (line 12).
- Loot loop (16-24): for each entry of `mType:getLoot()` it calls `corpse:createLootItem(entry)`; a nil return only prints a warning.
- Message (26-39): for a player owner, "Loot of <name>: <contents>." or "nothing (due to low stamina)", broadcast to the party if there is one, else sent to the player.
- `Container.createLootItem` (container.lua 5-69): if the container has no empty slots it returns true at once (6-8). It draws `randvalue = getLootRandom()` (11), `random(0, MAX_LOOTCHANCE) / RATE_LOOT` (global.lua 91-93), a fractional value whenever the rate does not divide it. If `randvalue < item.chance` (14): stackable items get `randvalue % maxCount + 1`, others 1 (15-19). Because the count reuses the roll that passed the chance test, count and chance are correlated, and the count is fractional when `randvalue` is. Then, per stack of at most `ITEM_STACK_SIZE` (100, cpplinter.lua 1264) (22-23): create the item (30), and if it is a container recurse into `item.childLoot`, removing it and failing on any child failure, or removing it and returning true if child loot existed but it ended up empty (35-47); apply charges, action id and text if set (49-59); add it to the corpse and delete it if the add is refused (61-65).
- Constants: `MAX_LOOTCHANCE = 100000` (src/monsters.h 13); `rateLoot = 2` (config.lua.dist 147; also the fallback in src/configmanager.cpp 271); `staminaSystem = true` (config.lua.dist 168, fallback true at configmanager.cpp 232).
- Output: items placed in the corpse, and the loot message.

## 2. Key functions

| Name | Path | Lines | What it does |
|---|---|---|---|
| Monster::dropLoot (dispatcher) | /mnt/frankendom-donors/otland-forgottenserver/src/monster.cpp | 1963-1968 | Forwards to the Lua onDropLoot event when the corpse exists |
| Creature::onDeath | /mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp | 448-521 | Credits kills, then calls dropCorpse |
| Creature::dropCorpse | /mnt/frankendom-donors/otland-forgottenserver/src/creature.cpp | 523-582 | Makes the corpse, runs death events, calls dropLoot at 577 |
| default onDropLoot (Lua) | /mnt/frankendom-donors/otland-forgottenserver/data/scripts/events/monster/default_onDropLoot.lua | 3-40 | Stamina gate, loop over loot entries, loot message |
| Container.createLootItem (Lua) | /mnt/frankendom-donors/otland-forgottenserver/data/lib/core/container.lua | 5-55 | One roll per entry; count for stackables; child loot recursion |
| getLootRandom (Lua) | /mnt/frankendom-donors/otland-forgottenserver/data/global.lua | 91-93 | Random 0..100000 divided by the loot rate |
| Monster:onDropLoot (Lua) | /mnt/frankendom-donors/otland-forgottenserver/data/events/scripts/monster.lua | 1-9 | Runs the default event, then updates the kill tracker |

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-entry chance out of a large fixed range (a single roll per entry) | Range 0..100000 (theirs, MAX_LOOTCHANCE, src/monsters.h 13) |
| Rate divides the roll, scaling every chance at once | Loot rate 2 (theirs, config.lua.dist 147); rate 0 disables loot (theirs) |
| Stackable count = roll modulo max count, plus one | Stack split at 100 (theirs, ITEM_STACK_SIZE, cpplinter.lua 1264) |
| Stamina gate: no loot when stamina is at or below the threshold | Threshold 840 (theirs, default_onDropLoot.lua 12); stamina system on by default (theirs, config.lua.dist 168) |
| Containers roll their own children, once per stack | Recursive child loot (theirs) |

## 4. TypeScript sketch

Licence: GPL-2. CLEAN-ROOM sketch: written from the mechanism above, not translated from the donor.

simplified: the corpse-full early exit, the container-child failure and empty-container removal rules, charges / action id / text, the party message, the `lootDrop` flag and the no-owner case are omitted; the sketch floors the roll before the modulo (the donor keeps it fractional when the rate does not divide it) and rolls child loot once per drop, for any item (the donor rolls it once per stack, and only for container items).
```ts
// clean-room sketch of a single-roll-per-entry drop table with a global rate and a stamina gate.
// Licence line: GPL-2 donor; this sketch is clean-room, written from mechanism only.
interface LootEntry { itemId: number; chance: number; maxCount: number; stackable: boolean; children?: LootEntry[]; }
interface Drop { itemId: number; count: number; }
const ROLL_MAX = 100_000;        // theirs
const RATE_LOOT: number = 2;             // theirs (config default)
const STAMINA_FLOOR = 840;       // theirs
const STACK_CAP = 100;           // theirs
function gateByStamina(stamina: number | undefined, systemOn: boolean): boolean {
  if (stamina === undefined || !systemOn) return true;
  return stamina > STAMINA_FLOOR;
}
function rollEntry(e: LootEntry, rnd: () => number): Drop[] {
  // One roll per entry; the rate divides the roll.
  const r = Math.floor(rnd() * (ROLL_MAX + 1)) / RATE_LOOT;
  if (r >= e.chance) return [];
  const count = e.stackable ? (Math.floor(r) % e.maxCount) + 1 : 1;
  const out: Drop[] = [];
  let left = count;
  while (left > 0) {
    const n = Math.min(STACK_CAP, left);
    out.push({ itemId: e.itemId, count: n });
    left -= n;
  }
  for (const child of e.children ?? []) out.push(...rollEntry(child, rnd));
  return out;
}
function dropTable(table: LootEntry[], stamina: number | undefined, systemOn: boolean, rnd: () => number): Drop[] {
  if (RATE_LOOT === 0) return [];
  if (!gateByStamina(stamina, systemOn)) return [];
  return table.flatMap((e) => rollEntry(e, rnd));
}
```

## 5. Lands in

- TARGET origins/encounters/encounters.ts (`rollTable`: it already takes one seeded draw per entry in `independent` mode and per-entry quantity, plus `currency` min-max; origins/server/mob-rewards.ts pays it). The donor adds nothing structural. Two ideas to check, not copy: a rate multiplier as a catalogue field on the loot table (row 21) rather than a global, and the anti-farm gate, which Frankendom already serves in origins/progression/model.ts (`falloffPermille`: a grey kill, level difference past the falloff, pays 0). A stamina counter is not needed. Today the Pit table is src/loot.ts, and src/loot-claims.ts is the Pit's claim outbox (not a corpse owner rule).
- Parity checklist row 18 (loot roll and XP award; post-K item 3); row 21 for the rate field.
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) one-character, one-ledger rule; rules 7-9 n/a

## 6. Gaps and risks

- Server-verified kills: the donor rolls with `math.random` (global.lua 92), unseeded, with no record. Frankendom's `rollLoot` takes a seed and the server replays it; this donor offers no replay.
- No hidden numbers: the donor's rate is one global config value that divides every roll (and makes the stackable count fractional). Frankendom keeps rates as catalogue fields on the loot table, and quantities as whole numbers (integer only, as in origins/progression/model.ts).
- One ledger: items go straight into a corpse container and the player's message is sent from the same script. In Frankendom the drop is a row written with the kill's CP in the one transaction (origins/server/mob-rewards.ts, mint key `loot:<killId>:<n>`); there is no corpse container.
- The donor's owner rule: a monster without a player owner always drops, and the stamina gate pays nothing but still ends the kill. With server-verified kills the owner is the verified killer; the gate belongs in the model's falloff, not in the roll.
- MAX_ATTACKERS = 3: up to three creatures can die near one player; the donor's corpse owner is one creature's `lastHitCreature`/most-damage resolution. Frankendom's owner is the player the verified kill is credited to, one roll per creature kill.
