# azerothcore-azerothcore-wotlk (world-fiction, cell WF005)

Donor: `/mnt/frankendom-donors/azerothcore-azerothcore-wotlk` (VPS, read-only) | Licence: GPL-2.0 code (LICENSE, "Version 2, June 1991"); game-derived text and data with no content licence stated (section 6) | Decision: adapt (idea), with three defects fixed in the sketch

Checked: Read the server code for pet names (`src/server/game/Globals/ObjectMgr.cpp` 8076-8147), character-name gates (9284-9313), faction relations (`src/server/shared/DataStores/DBCStructure.h` 974-1020; `src/server/game/Entities/Unit/Unit.cpp` 7017-7047), creature speech (`src/server/game/Texts/CreatureTextMgr.cpp` 257-345; `Creature.cpp` 3885-3897), gossip replies (`src/server/game/Handlers/QueryHandler.cpp` 285-340), page text (`QueryHandler.cpp` 361-400; `ObjectMgr.cpp` 6470-6510), and text objects (`GameObject.cpp` 2921-2925). Read the data tables `pet_name_generation`, `factiontemplate_dbc`, `creature_text`, `npc_text`, `page_text`, `gameobject_template` (type 9) and `creature_text_option_sets` (update 2026_07_14_03) by row count and parsing; the parse ran on the VPS and nothing was saved. Confidence: high on code order and on counts; medium on zone story, because no zone table has rows. Client DBCs are not in the box.

Best transferable idea: a bark pool with a per-creature no-repeat cycle, a per-group trigger chance and cooldown, and signs whose pages are a linked chain that one interaction reads in order.

## 1. What the player sees and feels

- Walk up to a creature that has just noticed you. One short line appears in a speech bubble, with an emote and a sound on some lines. The median line is 40 characters, and 90 percent are under 107. The next time that creature notices someone, it says a different line from the same group, and it does not repeat a line until the group is used up.
- Open a greeting from an NPC and the panel shows one of up to eight variant lines. The server sends every variant with its weight and the client makes the pick, so the same NPC can greet two players differently.
- Stand within about 5.6 yards of a text object (a plaque, a tombstone, a notice) and the page opens. The chain of pages behind it comes back in one reply. Of 709 chain heads, 415 are single pages, 47 are three-page chains, and the longest runs to 30 pages. Page text runs a median of 366 characters, so on a 375-wide phone it needs cutting into pages before it reads.
- A pet summoned from a family gets a name from two random halves drawn from that family's pools, so names vary per summon and are never a story.

## 2. Why it works / is striking

- Readable at 375 wide: a 40-character median fits one bubble. The 107-character 90th percentile needs two lines, so a 90-character target is a fair design limit.
- One signature behaviour: the per-creature no-repeat cycle. A repeated bark feels like a creature that remembers, not a glitch.
- One signature sound: each line can carry its own sound and emote id (sound on 3,768 rows, emote on 4,419 rows).
- Could be made ours at 20-30 percent resemblance: yes. Keep the cycle, the trigger chance and the page chain. Write our own lines, our own signs and our own greeting pools.

## 3. The rule behind it

Speech (`creature_text`, 18,591 lines, 4,175 creatures, 12,159 groups). Each group is a set of weighted lines. A pick is weighted-random among the lines this creature instance has not said in this group. When none are left, the memory clears and the group starts again (CreatureTextMgr.cpp 294-304, 307, 340). Lines per group: 10,120 groups hold one line, 611 hold exactly three.

Group options (`creature_text_option_sets`, 7 sets; `creature_text_options`, 49 bindings). Trigger chance rolled before each attempt (CreatureTextMgr.cpp 287). Cooldown stored in milliseconds, converted to seconds rounding up, and checked against game time (Creature.cpp 3891, 3897). Player-only gate: fires only when the target is a player (CreatureTextMgr.cpp 284).

Gossip variants (`npc_text`, 8,361 rows, up to 8 weighted slots). 7,368 rows use one slot, 989 use two or more, 427 use all eight, and 4 use none. The client does the pick (QueryHandler.cpp 333).

Signs (`gameobject_template` type 9, 165 text objects; `page_text`, 1,951 pages). A text object's data points at a first page, a language and a page material. Each page names its next page. Chain heads: 709, of which 415 single pages, 66 two-page, 47 three-page, and the longest is 30. The interaction distance for text objects is 5.5555553 yards (GameObject.cpp 2921-2925).

Data fields (donor values are not used: GPL and unclear content):

| name | unit | donor_value_or_null |
|---|---|---|
| line_weight | relative weight | null |
| trigger_chance | percent 0-100 | null |
| group_cooldown | seconds (donor stores ms) | null |
| player_only | bool | null |
| no_repeat_cycle | bool | null |
| text_range | enum 0-4 | null |
| gossip_slots | count, max 8 | null |
| page_chain_len | pages, design max 3 for our signs | null |
| page_chars_target | characters, design 90-120 | null |
| read_radius | yards | null |

simplified: omits the cooldown clock, the trigger-chance roll, the player-only gate, the reverse-direction friendly check and the hates-all flag. The page walk is my fix for the donor's unbounded loop, not a copy of it. Typechecked on the VPS.

```ts
export {};
type Line = { id: number; weight: number };

// Per creature instance: line ids already said in this group.
export function pickBark(group: Line[], said: Set<number>): Line | undefined {
  let pool = group.filter((l) => !said.has(l.id));
  if (pool.length === 0) {
    said.clear();
    pool = group;
  }
  const total = pool.reduce((s, l) => s + l.weight, 0);
  if (pool.length === 0 || total <= 0) return undefined;
  let r = Math.random() * total;
  for (const l of pool) {
    r -= l.weight;
    if (r < 0) { said.add(l.id); return l; }
  }
  const last = pool[pool.length - 1];
  said.add(last.id);
  return last;
}

// Page chain walk with a visited set and a cap. Fix: the donor loops on NextPage with no guard.
export function walkPages(start: number, next: Map<number, number>, cap = 10): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  let id = start;
  while (id !== 0 && next.has(id) && !seen.has(id) && out.length < cap) {
    seen.add(id);
    out.push(id);
    id = next.get(id) ?? 0;
  }
  return out;
}

export type Rel = "hostile" | "neutral" | "friendly";
export interface Faction {
  id: number;          // 0 means no explicit identity
  group: number;       // own group bit
  friendMask: number;
  enemyMask: number;
  enemies: number[];   // up to 4 explicit enemy ids
  friends: number[];   // up to 4 explicit friend ids
}

// Explicit pairs first (the more specific rule wins), then group masks. Same faction is friendly.
export function reaction(me: Faction, other: Faction): Rel {
  if (me.id !== 0 && me.id === other.id) return "friendly";
  if (other.id !== 0) {
    if (me.enemies.includes(other.id)) return "hostile";
    if (me.friends.includes(other.id)) return "friendly";
  }
  if (me.enemyMask & other.group) return "hostile";
  if ((me.friendMask & other.group) || (me.group & other.friendMask)) return "friendly";
  return "neutral";
}
```

Defects in the donor, each kept as an idea:
- Unbounded page walk: `QueryHandler.cpp` 361-400 loops `while (pageID)` and follows `pageText->NextPage` (line 391). The loader only checks that a next page exists (ObjectMgr.cpp 6501-6506). Fix: walk at load with a visited set and a cap; reject cycles. Sketch: `walkPages`.
- Dangling text objects: 24 of 165 text objects point at page ids that are not in `page_text`. The loader has no text-object check (`GAMEOBJECT_TYPE_TEXT` is not referenced in the loader; searched the whole `src/server/game` tree). Fix: a load-time check, and a placeholder page. The donor already has a "page missing" string in the query handler (QueryHandler.cpp 374-376).
- Hard-coded naming rule: names ending in a two-letter suffix are refused by a literal check in two places (ObjectMgr.cpp 9005 and 9108). Fix: move it to one reserved-name list in data.

## 4. For Frankendom

- 700 zones as data: speech pools belong to the character template, so the 100 Pit characters can share one pool across zones. A zone row can override or add lines, so a zone reads differently without copying the pool.
- Server-verified events, client presentation: the server fires the event (aggro, kill, death) and picks the line id, because the no-repeat memory is per entity and belongs with the entity on the server. The client draws the bubble from that id. Gossip variants may be a client draw, seeded per visit so the same NPC gives the same line for the whole visit.
- Many-vs-one (max 3 attackers): at most three attackers can fire barks in one fight. A per-fight cap of one bubble per few seconds keeps three speakers from talking over each other. Each attacker keeps its own cycle memory, so the cycle does not leak across the three.
- A world worth walking: a three-page sign is a three-line zone story in one interaction. Keep three pages of 90-120 characters each. Use it as one zone story per zone.
- What to keep: the no-repeat cycle, the trigger chance, the page chain, the 5.6-yard interaction radius, the per-line emote and sound.
- What to change: our own lines and signs, the page cap of three, the explicit-pair-first faction order (a choice for Lead to confirm, since the donor's runtime order is this one), and the bounded page walk.
- Target files, for the Lead to confirm: the bark pick is engine-side and cosmetic, so it belongs in a new module under `src/fight/` (name to be set; not in the tree I read). Parity rows: row 12 (combat sound cues) for line and sound pairing, row 14 (HUD) for the bubble and sign reader. Faction relations: row 4 (fight loop: aggro, leash) for who attacks whom.

Idle, death and spawn presentation seen in this donor: ambient lines are mostly commented as firing on aggro, with a spawn-yell set (28 rows commented "random yell on spawn") and about 195 rows whose comment mentions death (regex count of comment text, approximate). No idle-animation table was read (emotes_dbc.sql is schema-only, 0 rows). Readability at 375 wide: see section 1.

## 5. A 5-minute look test

On a phone at 375 wide, Dom can judge three things in five minutes:
1. A mock creature with a three-line bark group. Trigger it 12 times in two modes: plain weighted random, and the no-repeat cycle. Ask which one reads as the creature remembering.
2. One sign shown two ways: one page of 366 characters (the donor median) against three pages of about 120 characters each. Ask which reads better at 375 wide.
3. One gossip panel with eight weighted greetings, opened 10 times. Ask whether the variety feels alive or random.

## 6. Licence / IP

- Code: GPL-2.0 (LICENSE, line 2). We re-express the rules (no-repeat cycle, explicit pairs first, bounded page walk) in our own code. No code is copied.
- Content: the repo says AzerothCore "is not an official Blizzard Entertainment product" (`.github/README.md` line 88). The data is game-derived, and I found no content licence for it. Treat all game text and names as not reusable. Inspiration stays at category level: a three-line bark pool, a three-page sign, a greeting with weighted variants. No names, no quoted lines.
- Trait kept: the cycle and the chain. Trait changed: lines, signs and names are ours. No legal conclusion.

## 7. Gaps

- Half read: server code and data SQL. No client half (no client DBCs or art in the box).
- Zone story: `areatable_dbc.sql` is schema-only (0 rows), so there is no zone-intro text to read. The three-page sign and the three-line bark group are the closest analogues, not a donor zone story.
- Faction names and reputation thresholds: `faction_dbc.sql` is schema-only (0 rows). Not read.
- Name filters: `namesprofanity_dbc.sql` and `namesreserved_dbc.sql` are schema-only (0 rows). Not read.
- Counts come from my own parse on the VPS. Not checked by a second parser.
- Not read: most of the 309 `db_world` files (only the tables named above), the C++ scripts under `src/server/scripts` beyond names, `modules/`, and the AGENTS.md and CLAUDE.md files. Those two are instruction-like text in a donor, treated as data and not followed.
- Confidence: the code order is read directly. The "three-line zone story" is an analogue, and the note says so.
