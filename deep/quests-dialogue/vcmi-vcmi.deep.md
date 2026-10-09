# vcmi-vcmi (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | Licence: GPL-2 | C++ | symbol Quest::checkQuest / takeRequirements (input line 110 verified: `Quest::checkQuest`; `takeRequirements` at 115, `QuestSource::isQuestAvailable` at 423, `SeerHut::onHeroVisit` at 731)

## 1. Mechanism
- A seer hut offers one quest at a time to a hero. A quest is a mission (a hero gate through mission.heroAllowed, whose body was not read, plus creature stacks, artifacts and resources; a table at lines 62-79 classifies a mission into one of 16 kinds such as bring-artifact, bring-creature, hero-level, kill-creature and reach-date), plus a last day, a set of allowed difficulties, a repeat flag and a completed flag.
- Gate, read at visit time: checkQuest(hero) (110-113) only asks the mission whether this hero may take it (`heroAllowed`). `checkMissionArmy` (105-108) is a separate helper that asks whether the army holds the required creature units; its callers were not read. isQuestAvailable (423-432) rejects a quest whose last day has passed (`lastDay >= 0 && lastDay <= today - 1`), that is not offered on the current difficulty, or a one-shot already completed. `isEmpty` (434-437) is true when no quest is available.
- Visit flow (onHeroVisit, 731-772): first, if the hut is not empty and the active quest is finished or expired, it sets an advance flag so the next quest is offered (734-735; `newTurn` does the same at 724-729). If there is a quest: on the player's first visit it records the visit and adds the quest to the player's log if absent (741-749); it shows dialogue on first visit or when requirements fail (751-756); if requirements pass, it hands off to the generic reward path (CRewardableObject::onHeroVisit) and returns (757-761). If the hut has no quest it shows an "empty seer" text (763-771).
- Completion (takeRequirements, 115-141): for each required artifact, if the hero does not hold it alone but holds an assembled artifact containing it, the assembly is disassembled first (a disassembly event), then the part is removed; a part that is still missing logs an error (136). Creatures are taken (allowFullArmyRemoval decides whether the whole army can go; `SeerHut::allowsFullArmyRemoval` 774-779 is true when the reward gives units or a compatibility setting is on). Resources are subtracted from the owner (-mission.resources, 140). All of this is issued as game events, not direct edits. The source FIXME (117) says this belongs to the reward, not the limiter.
- Inputs: hero, owner, calendar day, difficulty, mission data, visit state. Output: a set of applied events (artifact removal, army change, resource change, log entry, visited flag) and a dialogue. Runs on the hero-visit event, not per tick.

## 2. Key functions
- Quest::checkQuest (vcmi) | /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | 110-113 | delegates to mission.heroAllowed; the hero gate.
- Quest::checkMissionArmy (vcmi) | /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | 105-108 | army holds the required creature units.
- Quest::takeRequirements (vcmi) | /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | 115-141 | removes artifacts (disassembling assemblies first), takes creatures, subtracts resources, all as events.
- QuestSource::isQuestAvailable (vcmi) | /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | 423-432 | deadline, difficulty and one-shot gate.
- SeerHut::newTurn / allowsFullArmyRemoval (vcmi) | /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | 724-729 / 774-779 | per-turn advance flag; whether the whole army may be taken.
- missionKinds table (vcmi) | /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | 62-79 | the 16 mission kinds and their classifier predicates (last match wins).
- SeerHut::onHeroVisit (vcmi) | /mnt/frankendom-donors/vcmi-vcmi/lib/mapObjects/Quest.cpp | 731-772 | visit flow: advance, first-visit log and flag, dialogue, hand-off to reward.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Gate a reward on deadline, difficulty and one-shot state before offering it | last-day field and difficulty set per quest (theirs, in data) |
| Check requirements (unit counts, owned items) before the reward | creature types and counts per quest (theirs, data) |
| Take the requirements as events on completion, never by direct write | artifact list, creature list, gold amount per quest (theirs, data) |
| Whole-army removal behind a flag | allowFullArmyRemoval flag (theirs, lines 115, 139, 774-779) |
| Visit state: first-visit flag, quest-log entry, fail dialogue, advance flag | property names SEERHUT_VISITED and SEERHUT_ADVANCE (theirs, lines 746 and 735) |

## 4. TypeScript sketch
simplified: the sketch's `meets` combines the creature and artifact checks, where the donor's `checkQuest` only calls `heroAllowed` (and the army helper is separate, with callers not read). Omitted: the per-player first-visit log, the advance flag, the dialogue and empty-seer text, the hand-off to the reward path, assembled-artifact disassembly, the whole-army rule (passed as a parameter), the mission-kind classifier, and error logging for a missing artifact. Order of the three takes (artifacts, creatures, resources) matches the donor.

```ts
// Licence: GPL-2 (vcmi-vcmi). CLEAN-ROOM: written from the mechanism, no donor lines.
type Req = { creatures: Map<string, number>; artifacts: string[]; gold: number };
type Quest = { lastDay: number; difficulties: Set<string>; repeated: boolean; done: boolean; req: Req };
type Hero = { owner: string; army: Map<string, number>; artifacts: Set<string> };
type Event =
  | { kind: "removeArtifact"; hero: Hero; art: string }
  | { kind: "takeCreatures"; hero: Hero; creatures: Map<string, number>; wholeArmy: boolean }
  | { kind: "giveGold"; owner: string; gold: number };

function available(q: Quest, day: number, difficulty: string): boolean {
  if (q.lastDay >= 0 && day > q.lastDay) return false;   // deadline passed
  if (!q.difficulties.has(difficulty)) return false;      // not offered on this difficulty
  return q.repeated || !q.done;                           // one-shot already done
}

function meets(q: Quest, hero: Hero): boolean {
  for (const [type, n] of q.req.creatures)
    if ((hero.army.get(type) ?? 0) < n) return false;
  return q.req.artifacts.every((a) => hero.artifacts.has(a));
}

// On completion: emit events, never write state directly.
function takeRequirements(q: Quest, hero: Hero, owner: string, wholeArmy: boolean): Event[] {
  const out: Event[] = [];
  for (const art of q.req.artifacts) out.push({ kind: "removeArtifact", hero, art });
  out.push({ kind: "takeCreatures", hero, creatures: q.req.creatures, wholeArmy });
  out.push({ kind: "giveGold", owner, gold: -q.req.gold });
  return out;
}
```

## 5. Lands in
- Frankendom target: `origins/quests/journal.ts` (a finished quest is final and rewards are paid once, per its header comment) and the server entry `origins/server/quest-advance.ts`, with the item and gold removal through the server holdings (`origins/server/holdings.ts`). All exist on the VPS snapshot /root/work-k7 (not main); only header comments were read. No `src/fight/` module is involved.
- Parity-checklist row: 18 (loot roll and XP award) for the reward and cost side; post-K item 3 for the server transaction. Feature-map section: Origins O2 quests (`docs/specs/origins/modernuo-quests.md` on the snapshot) and the one-ledger rule.
- Reuse tag: rewrite-from-idea (GPL-2; the event-based take is the idea).
- Brief rule served: one-character, one-ledger rule (server inventory is the authority); rules 7-9 n/a
- Usable rule: one-character/one-ledger (every removal and grant goes through the authority as an event, which the sketch models).

## 6. Gaps and risks
- Turn-based adventure map: days, creature stacks and artifacts. Frankendom has no day counter on the quest path; each field needs a mapping before reuse (the deadline would be a server-time timestamp).
- Source FIXME in takeRequirements (117) says the requirement logic is coupled to the reward and hacks limiter state. Do not copy that coupling.
- Check (`checkQuest`) and take (`takeRequirements`) are separate calls. Frankendom must make check plus take one server transaction in the one ledger, or two sessions could both spend the same item.
- Artifact disassembly (assembled parts) needs a Frankendom equivalent before reuse; not decided here.
- Dialogue text lives inside the visit handler (751-756, 763-771). Frankendom text should be data, not code.
- The visit handler writes state through property events keyed by player (746), per-owner not per-hero; Frankendom keys quest state per character.
- Out of the fight path: no conflict with one engine, zones as data, server-verified kills, MAX_ATTACKERS = 3 or Pit as client only. Lead to confirm where quests sit in the feature map.
- Not read: `Mission::heroAllowed`, `CRewardableObject::onHeroVisit`, `getVisitText`, and the quest identity and log code.
