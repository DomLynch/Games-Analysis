# opentibiabr-otclient (loot-drops, cell 3)

Donor: `/mnt/frankendom-donors/opentibiabr-otclient/mods/game_bot/default_configs/vBot_4.8/targetbot/looting.lua` (plus `vBot/items.lua`, `vBot/analyzer.lua`, `vBot/vlib.lua`) | Licence: MIT (repo `LICENSE`: "OTClient is made available under the MIT License", copyright 2010-2020 OTClient); the vBot files carry no licence header of their own (grep found none); code may be adapted | Lua (client bot) | symbol `TargetBot.Looting.process`

Checked: Read in full: `targetbot/looting.lua` (1-341: settings, process, container search, per-item loot, ownership message, corpse intake). Read: `vBot/items.lua` lines 1-40 (table shape only; the file is 1403 lines of name-to-value pairs), `analyzer.lua` 1517-1530 (`bottingStats`), `vlib.lua` 640-643 (`distanceFromPlayer`). Not read: where `lootedItems`/`usedItems` are filled; the caller of `process` (the TargetBot tick loop); `getDistanceBetween` (engine call, its metric is unknown); the `dangerLevel` value passed in; `Containers.lua` and `depot_withdraw.lua` (not read). Donor search: `grep -rni` for drop, random, chance, owner and loot across `mods`, `modules` and `src` found no drop table and no roll in the bot code. The "drop" hits are a Drop Tracker counter (`analyzer.lua` 375-460, read in part), a `dropItem` helper (`vlib.lua` 176, not read) and a module name; `modules/game_prey/prey.lua` matched "chance" (not read). `src/client/protocolgameparse.cpp` 3524 stores a server-sent `loot` list (not read). The corpse owner is decided by the server: the client only reads its refusal text. Confidence: medium. This note covers corpse ownership handling and the pickup queue. It does not cover drop tables or rolls, because the donor has none (the server holds them; not in this tree). If the library needs drop-table evidence, this donor is the wrong one.

## 1. Mechanism

- Intake (`onCreatureDisappear`, looting.lua 310-339). When a monster vanishes near the player, the bot first gates: not in a protection zone (311); the creature's config does not say `dontLoot` (315); the monster's last tile is on the player's floor and within 6 tiles (Chebyshev, 322). Only then does it schedule a check 20 ms later (323).
- The 20 ms check (323-339): the bot needs at least one loot container configured (`containers[1]`, read, no receipt), and the queue must have fewer than 20 entries (325). The corpse tile's top item must be a container (326-329, read, not receipted). A path of length 6 or less must exist (330). Then the entry `{pos, creature, container id, added, tries = 0}` is inserted (331), the queue is sorted by distance with the largest first (333-337), and the corpse is marked on the map (339).
- Pick (`process`, 107-): the bot exits if there is no item list and no every-item mode (108), or if the danger value is above `maxDanger` (default 10, line 62; gate 112). It clears the queue and exits if free capacity is below `minCapacity` (default 100, line 63; gate 116-117). Then it picks the head of the queue (index 1, the farthest) or the tail when `lootLast` is set (121).
- Order of the rest of `process`: wait gate (127). No open loot bag means "No space" and exit (134). Loot bags that are already open and flagged are looted first (142-144). Then the drop rule: the entry is removed when its tries exceed 30, when its floor differs, or when its Chebyshev distance exceeds the range (default 40; 150-152). Walk when the distance is above 2, or above 1 for client 760 and earlier (160-167); each walk try adds one (168). Otherwise open the corpse (179) and wait `lootDelay` (default 200 ms; 180).
- Taking items (`lootContainer`, 237-). Each item in an open loot bag: if it is a loot item (or, in every-item mode, any non-container item not on the ignore list), its `lootTries` goes up by one, and it is skipped from the fifth attempt on (244-245). Food is eaten at most once every 5 s (248). Nested bags are opened at most once (262: the counter is raised, then checked against 2). When nothing is left, the bag flag is cleared, the bag closed, and the queue entry removed (271-272).
- Moving (`lootItem`, 284-301): a stackable item merges into the first slot of any loot bag holding the same id with count below 100, moving its full count (289). Otherwise, or when no partner exists, one unit goes to the next free slot of the first loot bag (299). Each move waits 300 ms. The second case then gives a partner for the rest of the stack on the next pass; this is read from the code and was not run.
- Ownership (`onTextMessage`, 279-281): if the text contains "you are not the owner" and the queue is not empty, the entry is removed (head or tail as above). The client does not compute ownership; it reacts to the server's refusal text. The comment says this avoids wasting time on a corpse that is not yours.
- Value: `bottingStats` (`analyzer.lua` 1517-1530) sums price times count for looted items and for used items, using the price table in `items.lua`, and reports the balance (loot worth minus waste worth).

## 2. Key functions

- `TargetBot.Looting.process`: `/mnt/frankendom-donors/opentibiabr-otclient/mods/game_bot/default_configs/vBot_4.8/targetbot/looting.lua` 107-184. Gates, queue pick, wait, bag search, range and tries drop, walk or open.
- `TargetBot.Looting.lootContainer`: same file, 237-273. Per-item attempts, food, nested bags, close and remove.
- `TargetBot.Looting.lootItem`: same file, 284-301. Stack merge (cap 100) or single-unit move.
- `onCreatureDisappear` corpse intake: same file, 310-339. Gates, 20 ms check, queue insert and sort.
- Ownership text handler: same file, 279. Removes the queue entry on "you are not the owner".
- `bottingStats`: `/mnt/frankendom-donors/opentibiabr-otclient/mods/game_bot/default_configs/vBot_4.8/vBot/analyzer.lua` 1517-1530. Loot worth minus waste worth from the price table.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Corpse claim queue: capped, sorted by distance, head or tail picked | Cap 20 (theirs, looting.lua 325); sort largest first (337); radius 6 (322); path 6 (330) |
| Retry budget per claim and drop on budget exhaustion | 30 walk tries (152); range 40 by default (151); the queue entry is removed when either is exceeded |
| Server refusal removes the claim; client does not compute ownership | Text match "you are not the owner" (279) |
| Pickup wait after each action | Loot delay 200 ms default (180); move wait 300 ms (read, no receipt); open-bag waits of 500 ms and 300 ms (read, no receipt) |
| Per-item attempt budget, then skip | 5 attempts (245); nested bag opened at most once (262) |
| Stack merge with a cap | Stack cap 100 (289) |
| Food on a timer | Every 5000 ms (248) |
| Value table for worth | Gold coin 1, platinum coin 100, crystal coin 10000 (items.lua 2-4); loot worth minus waste worth (analyzer.lua 1522-1530) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: intake gates, the 20 ms corpse check (passed in as `hasCorpse` and `pathLen`), queue cap and sort, ownership refusal, then the process order (danger, capacity, empty queue, wait, no bag, open bag first, drop rule, walk, open), then per-item attempts and the move. It omits: the "no loot list and no containers" early exit (108), the `dontLoot` lookup (315), the protection-zone check is kept but the bot-on check (`TargetBot.isOn`) is not, the nested-bag opening, the food branch, the tile-missing walk case, the open-bag search, the every-item mode, the 500 ms and 300 ms open waits, and the `g_game.open` and `g_game.close` calls. The queue sort uses Chebyshev distance; the donor sorts with `getDistanceBetween` (engine metric, not read). Typecheck: `tsc --strict` passes on the VPS.

```ts
// Licence: MIT (donor repo LICENSE; adaptation allowed). This sketch is written from the described mechanism, not a translation of the donor lines.
// clean-room
type Pos = { x: number; y: number; z: number };
interface Corpse { pos: Pos; name: string; tries: number; dist: number; }
interface LootItem { id: number; count: number; stackable: boolean; tries: number; }
interface Bag { slots: { id: number; count: number }[]; }

const MAX_QUEUE = 20;          // queue is full: no more corpses are added
const CORPSE_RADIUS = 6;       // the monster must have died this close to the player
const PATH_LIMIT = 6;          // path length to the corpse tile
const MAX_TRIES = 30;          // walk attempts per corpse before it is dropped
const STACK_CAP = 100;         // a stack is merged only while below this count
const ITEM_TRIES = 5;          // the fifth attempt on one item skips it
const MOVE_WAIT_MS = 300;      // pause after a move

function cheb(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// Step 1, at the moment a monster vanishes: gate on protection zone, loot config and distance.
function onMonsterVanished(me: Pos, deathPos: Pos, dontLoot: boolean, inPz: boolean): boolean {
  if (inPz || dontLoot) return false;
  if (me.z !== deathPos.z || cheb(me, deathPos) > CORPSE_RADIUS) return false;
  return true; // caller schedules the corpse check ~20 ms later
}

// Step 2, 20 ms later: is there a corpse on that tile, and is it reachable?
function onCorpseCheck(queue: Corpse[], me: Pos, deathPos: Pos, name: string,
                       hasCorpse: boolean, pathLen: number | null): void {
  if (!hasCorpse || queue.length >= MAX_QUEUE) return;
  if (pathLen === null || pathLen > PATH_LIMIT) return;
  queue.push({ pos: deathPos, name, tries: 0, dist: cheb(me, deathPos) });
  queue.sort((a, b) => b.dist - a.dist); // farthest first; index 0 is the farthest
}

// Ownership is not computed here: the server's refusal text removes the head or tail entry.
function onServerText(queue: Corpse[], text: string, lootLast: boolean): void {
  if (queue.length === 0) return;
  if (!text.toLowerCase().includes("you are not the owner")) return;
  queue.splice(lootLast ? queue.length - 1 : 0, 1);
}

type Step = "idle" | "high-danger" | "no-cap" | "wait" | "no-space" | "loot-open-bag"
  | "dropped" | "walk" | "open";

interface Ctx {
  now: number; waitTill: number;
  danger: number; maxDanger: number;
  freeCap: number; minCap: number;
  maxRange: number; /* default 40 in the donor */ lootLast: boolean; adjacentOnly: boolean;
  hasLootBag: boolean; openLootBag: boolean; corpseTileHasBag: boolean;
}

// One pass of the loot step, in the donor's order. The caller acts on the returned step.
function processStep(queue: Corpse[], me: Pos, c: Ctx): Step {
  if (c.danger > c.maxDanger) return "high-danger";
  if (c.freeCap < c.minCap) { queue.length = 0; return "no-cap"; }
  if (queue.length === 0) return "idle";
  if (c.now < c.waitTill) return "wait";
  if (!c.hasLootBag) return "no-space";
  if (c.openLootBag) return "loot-open-bag";
  const i = c.lootLast ? queue.length - 1 : 0;
  const e = queue[i];
  const d = cheb(me, e.pos);
  if (e.tries > MAX_TRIES || e.pos.z !== me.z || d > c.maxRange) { queue.splice(i, 1); return "dropped"; }
  if (d > (c.adjacentOnly ? 1 : 2)) { e.tries += 1; return "walk"; }
  if (!c.corpseTileHasBag) { queue.splice(i, 1); return "dropped"; }
  return "open";
}

// Where one item goes. Stackable items merge into a stack below STACK_CAP; otherwise one unit is moved to the first bag.
function itemMove(item: LootItem, bags: Bag[]): { bag: number; slot: number; count: number; waitMs: number } | null {
  item.tries += 1;
  if (item.tries >= ITEM_TRIES) return null;
  if (item.stackable) {
    for (let b = 0; b < bags.length; b++) {
      const slot = bags[b].slots.findIndex((s) => s.id === item.id && s.count < STACK_CAP);
      if (slot >= 0) return { bag: b, slot, count: item.count, waitMs: MOVE_WAIT_MS };
    }
  }
  return { bag: 0, slot: bags[0].slots.length, count: 1, waitMs: MOVE_WAIT_MS };
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module): corpse claim, ownership and pickup decided by the engine. Parity-checklist row 18 (loot roll and XP award). The client may keep a display-only queue; it must not decide ownership.
- Reuse tag: reuse-idea (MIT: adaptable; written clean from the mechanism)
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- No drop tables or rolls in this donor. Frankendom's loot roll (row 18) has no donor shape here. Rarity weights, pity counters and per-zone tables must be designed on Frankendom's side, as data.
- Ownership by string match is a bad shape for Frankendom: the donor relies on an English server message. Frankendom's ownership must be a server-verified field in the one ledger, never a chat string. Adopt the queue shape, not the match.
- Server-verified loot: the donor's pickup is client automation (it moves items with `g_game.move`). In Frankendom the server grants loot into the one ledger and the client only requests and displays. The move and merge code is UI-level and may be skipped on the server.
- One ledger: `bottingStats` totals come from client-side messages, so they are estimates. Frankendom's worth and balance must come from the ledger.
- Zones as data: the queue cap (20), the radius (6), the path limit (6), the range (40), the tries (30) and the delays are constants in code (with UI overrides). In Frankendom they are zone fields with defaults, not literals.
- Timing: 200, 300, 500 and 5000 ms are wall-clock delays. The server tick must be a fixed step, so these become tick counts (row 18 sub-line on the server tick).
- Pit as client: the Pit shows the queue and the loot result. It must not run the corpse check or the moves.
- The donor mixes two distance metrics: Chebyshev in the range checks and an engine call (`getDistanceBetween`) in the sort. Do not copy the mix; use one metric from the engine.
- The one-unit first move then merge is inferred from the code and not run. Test it if it is ever used.
- Licence MIT: adaptation allowed; the sketch was still written from the mechanism.

Reuse tag: reuse-idea (MIT; adaptable)
Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: Keep a capped, distance-sorted queue of claimable corpses per player, drop an entry when the server refuses the claim or its retry budget runs out, and make ownership a server answer instead of a client guess.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Nit only: bottingStats spans analyzer.lua 1517-1533 (return at 1532), note cites 1517-1530. All constants (20 queue, 6 radius, 6 path, 30 tries, 40 range, 5 item tries, 100 stack, 200/300/500 ms, 5000 food, 760 client, maxDanger 10, minCap 100), order of process, items.lua 2-4 values, MIT licence verified.

**Missed:** Sketch omits isMonster() gate (313) and TargetBot.isOn (312) though only isOn is declared; container-full -> open next bag logic (190-203) only mentioned as waits.
