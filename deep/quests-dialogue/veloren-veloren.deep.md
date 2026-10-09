# veloren-veloren (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/quest.rs | Licence: GPL-3 | Rust | symbol roll_courier_quest / create_quest (input line 161 verified: `create_quest`; `roll_courier_quest` at 832)

## 1. Mechanism
- An NPC-AI quest generator inside the rtsim world simulation. When a player asks an NPC for a quest, `quest_request` (171-457) builds up to three offers: an escort (the NPC must be a merchant with no job; a site 1000 to 5000 units away; reward distance / 5 coins; time limit 1 + distance / 80 minutes; 175-253), a slay quest (the nearest monster within 2500 units that is in no other quest; reward 1000 coins; 60 minutes; 255-328), and a courier quest from `roll_courier_quest` (180 minutes; 330-447). Each offer exists only if the NPC holds the reward in its inventory (`create_deposit`, 16-60), and one offer is picked at random, or a "nothing" line if none (449-455). This note covers the courier roll and the create step in detail; finishing a delivery is not in the lines read.
- roll_courier_quest (832-904): pick a uniformly random courier variant from `COURIER_QUEST_VARIANTS` (833-836; deliver to the giver, deliver to another NPC, or carry a message). For deliver-to-giver the target is the giver at the giver's current site with distance 0 (840-843). Otherwise it picks a random actor that is an NPC of a listed profession (hunter, farmer, blacksmith, alchemist, chef, herbalist, guard) within 5,000 units (856-868; the giver itself is not excluded by the filter), then a random site within 512 units of that NPC, and returns nothing if no site qualifies (869-878). It then computes the nearest spot for the payload around the giver's chunk (881); only the gnarling-carving payload requires one, and if none is found it returns nothing (886-891). The instance carries the variant, the spot, source site and actor, target actor and site, messenger, and the distance truncated to an integer with a minimum of 1 (894-903).
- create_quest (161-169): ask the world for a new quest id (`quests.register()`), and queue the (id, quest) pair for creation through the controller. The creation is deferred to the end of the rtsim tick, for parallelism reasons (comment 159-160).
- check_for_timeouts (459-493): for each quest related to this actor, if its timeout has passed and the deposit resolves, any job tied to the quest is ended, and for an escort quest the NPC walks to the escorter and says a timeout line; slay and courier quests give no message.
- Inputs: the NPC's position and site, the world's actor and site tables, random draws. Outputs: a queued quest and a courier instance. Runs inside the rtsim NPC-AI tick (the NPC-AI driver itself is not read).

## 2. Key functions
- create_quest (veloren) | /mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/quest.rs | 161-169 | registers a quest id and queues creation.
- roll_courier_quest (veloren) | /mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/quest.rs | 832-904 | picks a variant, a target NPC and site within caps, the payload spot, and returns the instance or nothing.
- get_nearest_spot (veloren) | /mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/quest.rs | 547-561 | finds the closest spot of a kind for a payload.
- quest_request (veloren) | /mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/quest.rs | 171-457 | builds the escort, slay and courier offers behind a deposit check and picks one.
- escorted (veloren) | /mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/quest.rs | 495-537 | the escorted NPC follows, nags when far behind, resolves and pays on arrival.
- check_for_timeouts (veloren) | /mnt/frankendom-donors/veloren-veloren/rtsim/src/rule/npc_ai/quest.rs | 459-493 | ends a quest that has run out of time.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Uniform random variant choice, then find a partner within a distance cap | COURIER_QUEST_VARIANTS list (theirs, data/quest in the crate; not read) |
| Two-stage target search: nearby actor, then a site near that actor | Profession list (lines 856-862), NPC distance cap 5,000 (line 563) and site distance cap 512 (line 874) (theirs) |
| Reject the quest when a required spot is missing | Payload rule for spot (theirs) |
| Deferred creation through a queue, so ids are stable | Queue of (id, quest) pairs (theirs) |
| Integer distance with a minimum of 1 | Minimum 1 (theirs, lines 893 and 902) |

## 4. TypeScript sketch
simplified: the sketch rolls only the target-NPC branch plus the deliver-to-giver variant; it omits the payload spot search and its rejection (886-891), the world and chunk types, the give-marker and dialogue steps, the deposit check, the quest-request offer menu and the timeout handling. It keeps the donor's order (variant, target NPC within the cap, site within 512 of that NPC) and its integer rule (truncate, minimum 1). Unlike the earlier draft it does not exclude the giver from the candidates, because the donor's filter does not.

```ts
// Licence: GPL-3 (veloren-veloren). CLEAN-ROOM: written from the mechanism, no donor lines.
interface Npc { id: number; x: number; y: number; profession?: string; site: number; }
interface Site { id: number; x: number; y: number; }
type Variant = 'deliverToGiver' | 'deliverToOther' | 'message';
interface Courier { kind: Variant; source: number; target: number; targetSite: number | null; distance: number; }

const MAX_NPC_DISTANCE = 5000;  // theirs (MAX_COURIER_QUEST_DISTANCE, world units)
const MAX_SITE_DISTANCE = 512;  // theirs
const PROFESSIONS = new Set(['hunter', 'farmer', 'blacksmith', 'alchemist', 'chef', 'herbalist', 'guard']); // theirs

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const pickOne = <T>(xs: T[], rnd: () => number): T | undefined => xs[Math.floor(rnd() * xs.length)];

function rollCourier(giver: Npc, npcs: Npc[], sites: Site[], kinds: Variant[], rnd: () => number): Courier | null {
  const kind = pickOne(kinds, rnd) ?? 'message';
  if (kind === 'deliverToGiver') {
    return { kind, source: giver.id, target: giver.id, targetSite: giver.site, distance: 1 }; // distance 0 -> minimum 1
  }
  const candidates = npcs
    .filter((n) => n.profession !== undefined && PROFESSIONS.has(n.profession))
    .map((n) => ({ n, d: dist(giver.x, giver.y, n.x, n.y) }))
    .filter((c) => c.d <= MAX_NPC_DISTANCE);
  const pick = pickOne(candidates, rnd);
  if (!pick) return null;
  const near = sites.filter((s) => dist(pick.n.x, pick.n.y, s.x, s.y) <= MAX_SITE_DISTANCE);
  const site = pickOne(near, rnd);
  if (!site) return null;
  return { kind, source: giver.id, target: pick.n.id, targetSite: site.id, distance: Math.max(1, Math.trunc(pick.d)) };
}

const registry: { nextId: number; queued: [number, string][] } = { nextId: 1, queued: [] };

function createQuest(kind: string): number {
  const id = registry.nextId++;
  registry.queued.push([id, kind]);   // created later by the controller, at the end of the tick
  return id;
}
```

## 5. Lands in
- Frankendom target: `origins/quests/journal.ts` (authored quests with stage transitions and once-paid rewards, per its header) and `origins/encounters/encounters.ts` for any generated target choice. A generator would be a NEW `origins/server/quest-roll.ts` (does not exist today) that picks from authored content with a server-recorded roll, then calls `origins/server/quest-advance.ts`. The existing files are on the VPS snapshot /root/work-k7 (not main); only header comments were read.
- Parity-checklist row: none of rows 1 to 22. Feature-map section: Origins O2 quests (`docs/specs/origins/modernuo-quests.md` on the snapshot) and living-world (`docs/specs/origins/living-world.md`, not read); zones as data for the site search.
- Reuse tag: rewrite-from-idea (GPL-3; the roll and defer pattern maps, the code does not)
- Brief rule served: (category default, not per-cell) zone-schema rule; rules 7-9 n/a

## 6. Gaps and risks
- Procedural quests from the NPC simulation. Frankendom's quest content is authored; a generator is a later decision for Lead and Strategy.
- The roll uses the simulation's random source (`ctx.rng`, 834, 868, 876). Under server-verified rules Frankendom must record the roll on the server and never accept a client-supplied target.
- The deposit model (the NPC holds the reward and it moves on resolve, 16-60 and 523) is a form of escrow; Frankendom's one ledger would pay from the quest reward record, once, in one entry.
- Targets are world NPCs and sites, which assume a populated simulated world; Frankendom zones are data and may be sparse, so the 5,000 and 512 caps need rethinking.
- The giver can be picked as its own courier target (the filter at 856-867 does not exclude it) when it has a listed profession and distance 0; Frankendom should exclude it.
- The slay quest (255-328) hands a player a kill on a world monster; a Frankendom version must take the kill from the server-verified kill record (MAX_ATTACKERS = 3 for the fight itself), and monsters in no other quest is checked imperfectly (comment 261).
- Pit is a client only and has no quests.
- Donor is GPL-3, so only the mechanism is described here.
- Not read: `data/quest.rs` (variants, rewards, payloads), `resolve_take_deposit`, `CourierQuestInstance` methods other than the headers (567-829), and the NPC-AI driver.
