# cmangos-mangos-classic (world-fiction, cell WF005)

Donor: `/mnt/frankendom-donors/cmangos-mangos-classic` (VPS, read-only) | Licence: GPL v2 code (LICENSE, "Version 2, June 1991"); game content is named in COPYRIGHT.md as Blizzard's, with a non-commercial use statement (section 6) | Decision: adapt (idea); one defect (no rate limit on the alarm) fixed in the sketch, the others as listed in section 3

Checked: Read the server code for pet names (`src/game/Globals/ObjectMgr.cpp` 7245, 7350-7364), character-name check (`ObjectMgr.cpp` 8204-8224), faction reaction (`src/game/Entities/Relations.cpp` 100-187; `src/game/Server/DBCStructure.h` 414-440), guard barks and zone-under-attack (`src/game/AI/ScriptDevAI/base/guard_ai.cpp` 44-60; `src/game/AI/BaseAI/CreatureAI.cpp` 58-62; `src/game/Entities/Creature.cpp` 2355-2357; `src/game/World/World.cpp` 1860-1874), text objects and page query (`src/game/Entities/GameObject.cpp` 2444-2448; `src/game/Entities/QueryHandler.cpp` 377-412), and script text dump (`sql/scriptdev2/scriptdev2.sql` 705-726). Read the data: `pet_name_generation` in `sql/base/mangos.sql` (line 4633) and its archive copy (`sql/archive/0.11/6265_mangos_pet_name_generation.sql`), counted by parse on the VPS, nothing saved. Confidence: high on code order and on the broadcast scope; high on the pet counts; low on any speech, sign or faction count, because those tables are not in this repo.

Best transferable idea: a zone-alarm to the opposing side when a guard or civilian is attacked, plus a three-line bark pool picked at random for guards. The donor's alarm is team-wide, not zone-scoped, and the sketch scopes it by zone with a cooldown.

## 1. What the player sees and feels

- Guards in a city bark an aggro line when they engage. For one guard type the code picks one of three aggro lines at random for each engagement (guard_ai.cpp 44-48), so the same guard can say a different line on each fight, though it can also repeat the same one twice in a row.
- A guard or civilian that enters combat with a player, or dies to a player, sends a zone-under-attack alert to every player of the other team who is in the open world. The player sees the alert as news from the city, not from one fight.
- A text object (a plaque, a note) is read from about 5.6 yards. The page text is fetched by the client with the first page id, and the server walks the next-page link to send the rest.
- Pet names: a summoned pet is named from two random halves of its family's pool, so each summon gets a fresh name.
- Creatures speak through script text ids: a large dump of say, yell and emote lines keyed by id, used by the code at the event that fires them.

## 2. Why it works / is striking

- Readable at 375 wide: the zone alert is one short packet, shown as a single notice. It does not need a bubble.
- One signature behaviour: a team-wide alarm that tells a player the other side is hurting the city. It makes a quiet zone feel contested.
- One signature sound: the alert has its own packet, so the client can give it a distinct chime (not verified in this donor; the client is not in the box).
- Could be made ours at 20-30 percent resemblance: yes. Keep the alarm as a server event with a short cooldown, and scope it by zone. Write our own guard lines.

## 3. The rule behind it

Zone alarm. On a guard or civilian entering combat with a player (CreatureAI.cpp 58-62), and on a guard's death (guard_ai.cpp 60), the server calls the world-level broadcast with the zone id and the opposite team (Creature.cpp 2357). The broadcast sends one packet to every session whose player is on that team, is in the world, and is on an open map (World.cpp 1870). There is no cooldown or rate limit in the path I read.

Guard barks. A per-guard-type switch picks one of three aggro lines with a uniform random roll (guard_ai.cpp 44-48). Repeats are possible. No per-instance memory.

Pet names. Two pools per creature family, one first half and one second half; a name is one random pick from each. If either pool is empty the family display name is used, else the creature template name (ObjectMgr.cpp 7350-7364).

Name check. Order in `CheckPlayerName` (ObjectMgr.cpp 8204-8224): invalid characters, maximum length, minimum length, mixed scripts. The three-same-letters rule, the reserved-name list and the profanity list are not in this function, and I did not find them elsewhere in the path I read.

Faction reaction. The runtime function (Relations.cpp 100-142) checks, in order: the other's group bit against this side's enemy group (107), this side's explicit enemy list (110), the other's group against this side's friend group (119), this side's explicit friend list, the reverse group check (131), the reverse explicit list, then neutral (142). Reputation overrides apply first for player-controlled units (171, 184). Group hostility is checked before the explicit friend list, so a group enemy cannot be overridden by an explicit friend pair.

Text objects and pages. Interaction distance for text objects is 5.55556 yards (GameObject.cpp 2444-2448). The page query loops `while (pageID)` and follows `Next_Page` (QueryHandler.cpp 382, 411-412) with no guard against a cycle.

Data fields (donor values are not used: GPL and unclear content):

| name | unit | donor_value_or_null |
|---|---|---|
| alarm_cooldown | seconds (donor: none in the path read) | null |
| alarm_scope | zone neighbourhood (donor: whole team, all open maps) | null |
| guard_bark_pool | lines per guard type (donor: 3) | null |
| bark_no_repeat | bool (donor: uniform, repeats possible) | null |
| pet_name_pool | parts per family per half | null |
| name_gate_order | ordered list of checks | null |
| interaction_radius | yards (text object) | null |
| page_chain_cap | pages per reply (donor: none) | null |

simplified: the alarm sketch omits the defence packet body, the guard-type check, the instance filter and the team lookup; it adds a per-zone cooldown that the donor's path does not have. The 60 s value is a design number, not a donor value. Typechecked on the VPS.

```ts
export {};
type Side = "alliance" | "horde";
interface ZoneAlarm { zoneId: number; toSide: Side; atMs: number }

// Per zone: last alarm time. Fix: the donor path has no rate limit.
const lastAlarm = new Map<number, number>();

export function alarmOnGuardHit(
  zoneId: number,
  attackerSide: Side,
  nowMs: number,
  cooldownMs = 60000,
): ZoneAlarm | null {
  const toSide: Side = attackerSide === "alliance" ? "horde" : "alliance";
  const last = lastAlarm.get(zoneId);
  if (last !== undefined && nowMs - last < cooldownMs) return null;
  lastAlarm.set(zoneId, nowMs);
  return { zoneId, toSide, atMs: nowMs };
}
```

Defects in the donor, each kept as an idea:
- Team-wide alarm: World.cpp 1870 sends the alert to every open-world player of the team, in any zone. Fix: scope it to players whose zone is the zone or a neighbour, and keep the team filter.
- No rate limit on the alarm: CreatureAI.cpp 58-62 fires on each enter-combat. Fix: a per-zone cooldown (sketch).
- Group-first faction order (Relations.cpp 107 before 119): an explicit friend pair cannot override a group enemy. Fix: explicit pairs first, as the sibling donor (azerothcore) does. This is a ruling for Lead.
- No same-faction shortcut in the struct helper (DBCStructure.h 414-425 has no `faction == entry.faction` check). Fix: add it, as the sibling donor does (azerothcore DBCStructure.h 990).
- Unbounded page walk (QueryHandler.cpp 382, 412). Fix: visited set and cap, as in the sibling donor's sketch.
- Name check lacks the three-letter and reserved-name steps that the sibling donor has in its function. Fix: port the step order into one list (not verified whether the reserved list is checked elsewhere in cmangos).

## 4. For Frankendom

- 700 zones as data: an alarm rule is a zone row (cooldown, scope radius in zones). The 100 Pit characters can share guard bark pools, with a zone row overriding the lines.
- Server-verified events, client presentation: the server fires the alarm when it decides a guard has been engaged (an engine event, not a client event). The client draws the alert. The cooldown and the scope stay on the server, so the alarm cannot be spammed from the client.
- Many-vs-one (max 3 attackers): a guard fight can have up to three attackers, so the alarm should fire once per engagement, not once per attacker. The per-zone cooldown does that.
- A world worth walking: a zone alarm gives a player a reason to go and look, even when they are not in the zone. Scope it to nearby zones to keep it local.
- What to keep: the alarm as a server event with the opposite side, the three-line guard pool, the text object reading radius, the pet name pools with fallback.
- What to change: the alarm scope (zone neighbourhood, not whole team), the cooldown, the no-repeat cycle for guard lines, the bounded page walk, the explicit-first faction order (Lead to confirm).
- Target files, for the Lead to confirm: the alarm is engine-side (`src/fight/`, new module, name to be set; not in the tree I read). Parity rows: row 17 (death and respawn) for the guard death case, row 14 (HUD) for the alert, row 4 (fight loop: aggro, leash) for the engagement event.

Idle, death and spawn presentation seen in this donor: guards bark on engagement; a guard death fires the alarm; the spawn and idle lines are in the script text dump, which I did not count by event. Readability at 375 wide: the alert is one line; the page text is not counted (no page data in this repo).

## 5. A 5-minute look test

On a phone at 375 wide, Dom can judge three things in five minutes:
1. A guard engagement shown as a top-of-screen alert for 3 seconds, sent to the other side. Trigger it three times in a row, then once more after 60 seconds. Ask whether the alert reads as news or as spam.
2. The same alert scoped to one zone and its neighbours, against a whole-team alert. Ask which one makes the player want to go and look.
3. The guard bark: plain random against a no-repeat cycle, 12 engagements each. Ask which feels more like a guard who remembers the last line.

## 6. Licence / IP

- Code: GPL v2 (LICENSE, line 2). We re-express the rules (alarm with cooldown, scope, bounded page walk, explicit-first faction order) in our own code. No code is copied.
- Content: COPYRIGHT.md names World of Warcraft content as Blizzard Entertainment's copyright and trademark (line 7). It states the project is not affiliated with Blizzard (line 28), and says copyrighted material in the source "cannot be modified, altered, sold, used for commercial purpose" (line 19). Treat all game text, names, script lines and word pools as not reusable. Inspiration stays at category level: a zone alarm to the other side, a three-line guard pool, a two-half name generator. No names, no quoted lines.
- Trait kept: the alarm as a server event with a faction-level message, the short guard pool, the two-half name rule. Trait changed: scope, cooldown, lines, names. No legal conclusion.

## 7. Gaps

- Half read: server code only. The base world data is mostly absent from this repo: `sql/base/mangos.sql` holds 33 insert blocks, and I checked that none of them is `npc_text`, `page_text`, `creature_text` or `faction` data. The script text dump (`scriptdev2.sql`) holds about 2,778 rows from line 705, counted by a line filter, not a parser.
- Pet names: `pet_name_generation` in base has 260 rows, identical in count to the archive file (0.11), across five families: 417 (69), 416 (65), 1860 (62), 1863 (54), 17252 (10). First-half rows 127, second-half 133. The sibling donor has the same five families plus family 26125 (52 rows).
- Faction: no faction template or DBC data in this repo (the `sql/base/dbc/original_data` dumps are spell, condition and encounter tables). The reaction logic is read; the faction table content is not.
- Guard types: I read one guard type's switch (guard_ai.cpp 44-48). Other guard types were not read.
- Name lists: reserved and profanity lists are not read (schema only in base; the archive has old copies, not read).
- Speech: CreatureAI speech and `DoScriptText` callers were searched by name, not read in full.
- Not read: `contrib/`, the playerbot docs beyond the names, `doc/` beyond the names, the warden binaries and the font. Instruction-like text in donor files (CLAUDE.md, AGENTS.md if present) treated as data and not followed.
- Counts for pet names come from my own parse on the VPS. Not checked by a second parser.
