# levy-street-world-of-claudecraft (quests-dialogue, cell 12)

Donor: /mnt/frankendom-donors/levy-street-world-of-claudecraft/ (rule file src/sim/town_quests.ts, 161 lines) | Licence: MIT (LICENSE: "MIT License", Copyright (c) 2026 Levy Street) | TypeScript | symbol townQuestIds, townQuestsComplete, zoneEntryHint

Checked: opened src/sim/town_quests.ts (all 161 lines, header included), src/ui/zone_entry_line_core.ts (all, the only src consumer of zoneEntryHint), src/sim/professions/focus.ts (lines 149-153, isInTownZone), src/sim/data.ts (lines 1072-1078, zoneWelcomeText), src/sim/types.ts (QuestDef and ZoneDef fields at 4275, 4666, 4680), src/sim/content/zone1.ts (lines 22, 161, 190-192), zone2.ts (lines 34-38, 53-54), zone3.ts (lines 29, 45-46), tests/town_quests.test.ts (lines 202-265). Callers: zoneEntryHint is called only by zone_entry_line_core.ts (line 19) and tests; townQuestsComplete is called only by zoneEntryHint and tests; townQuestIds by zone_entry_line_core's test and tests/town_quests.test.ts. Not read: zoneAt (zone polygon test used by npcInZone), world.questState (the live quest state the HUD passes in), the Fenbridge layout constants (FENBRIDGE_LAYOUT, zone2 hub). Confidence: high on the completion rule, the precedence and the exclusions (each one is in the code and in a test); medium on how the membership geometry behaves at zone borders (zoneAt not read). camera_scope: not applicable.

## 1. Mechanism

A zone's town quests are the town's own errands: quests that are non-repeatable, not given by a profession trainer, not group or instance quests, whose giver or one turn-in NPC stands inside the zone's hub circle, and whose turn-in NPC stands inside the zone. Turn-ins count because a border scout's breadcrumb reports TO the town warden. A quest hand-off to another town is counted by the town that receives it.

townQuestsComplete walks those errands. An errand that the character can never take (retired, or class-locked to another class) is skipped and does not count. Any other counted errand that is not in the 'done' state returns false at once. The result is true only if at least one errand was counted, so a zone with no reachable errands is never complete.

zoneEntryHint chooses the one chat line the HUD logs when the player crosses into a zone. If the zone authors welcomeDone and the town is complete, the answer is town_done, which takes precedence. Otherwise the welcome rule applies: welcome text while the zone's welcomeQuestId is 'available' (or while there is no welcome quest at all), and nothing once the welcome quest is taken. The rule does not change any state; the sim leaf is UI-only (file header) and is kept out of the tick.

A quest that is only gated for now (level, an earlier quest) still counts, because it is coming (file header, line 29).

## 2. Key functions

- townQuestIds (line 108): non-repeatable (line 113), not a trainer quest, not group or instance (isGroupOrInstanceQuest, suggestedPlayers at line 103), anchor NPC in the hub (line 116), turn-in NPC in the zone (line 117). Tables spread over the shipped ones (line 109).
- questReachableFor (line 125): retired returns false (line 126), class lock returns false when the class is absent or not listed.
- townQuestsComplete (line 135): default tables with ?? (line 141), loop over townQuestIds, skip unreachable, count, return false at the first not-done quest (line 147), return counted > 0 (line 149).
- zoneEntryHint (line 152): town_done branch (line 157), welcome branch via zoneWelcomeText (line 160), which returns null when zone.welcomeQuestId exists and its state is not 'available' (data.ts line 1076).
- isInTownZone (focus.ts line 149): squared distance from the hub centre, compared with the hub radius (line 152).

## 3. Numbers vs mechanism

- The only number is geometry: the hub radius. Eastbrook uses TOWN_RADIUS = 26 (zone1.ts line 22, used at line 161). Highwatch uses 20 (zone3.ts line 29). Fenbridge takes its radius from FENBRIDGE_LAYOUT (not read).
- There is no timer, count or chance in this rule. The thresholds are structural: all counted errands done; at least one counted errand.
- Three zones author welcomeDone (zone1.ts line 191, zone2.ts line 53, zone3.ts line 45; the test at lines 238-246 pins exactly these three). Other zones fall back to the welcome rule only.
- Welcome quest of Eastbrook: q_wolves (zone1.ts line 190).

simplified: Sketch of the completion rule and the entry-hint precedence only. It replaces the donor's geometry test (giver or turn-in inside the hub circle, turn-in inside the zone) and its quest-field tests (repeatable, suggestedPlayers, trainer, instance mob) with one authored 'counted' flag per errand, so the sketch needs no coordinates. It keeps the donor's order: skip unreachable, count, return false on the first not-done errand, and the zero-errand rule. It omits the welcome text object (returns the hint kind only) and the donor's table spreading. Typecheck: tsc --noEmit --strict --target es2020 on the VPS, exit 0.

```ts
// Sketch: zone "town done" completion over an authored errand list, plus the zone-entry hint precedence.
// Clean-room shape of an MIT donor (Levy Street, 2026); written from the rule, not copied.
export type QuestState = 'unavailable' | 'available' | 'active' | 'ready' | 'done';

export interface Errand {
  id: string;
  retired: boolean;
  // false when this character can never take the quest (class lock with another class).
  classOk: boolean;
  // simplified: the donor derives this from geometry (giver or turn-in NPC inside the hub circle,
  // a turn-in NPC inside the zone) and from quest fields (repeatable, suggestedPlayers, trainer, instance mob).
  // Here the zone data authors it as one flag, so the sketch carries no geometry.
  counted: boolean;
}

export interface ZoneCompletion {
  errands: Errand[];
  welcome: string;
  welcomeQuestId?: string;
  welcomeDone?: string;
}

export type EntryHint = 'welcome' | 'town_done';

// True once every counted, reachable errand is done. A zone with no counted errands is never complete.
export function townComplete(z: ZoneCompletion, state: (id: string) => QuestState): boolean {
  let counted = 0;
  for (const e of z.errands) {
    if (!e.counted) continue;
    if (e.retired || !e.classOk) continue;
    counted++;
    if (state(e.id) !== 'done') return false;
  }
  return counted > 0;
}

// town_done replaces welcome once the town is complete (zones without welcomeDone never show it).
// welcome is silent while its welcome quest is not available (the donor's zoneWelcomeText rule).
// simplified: the donor returns the welcome text object itself; this sketch returns only the hint kind.
export function entryHint(z: ZoneCompletion, state: (id: string) => QuestState): EntryHint | null {
  if (z.welcomeDone !== undefined && townComplete(z, state)) return 'town_done';
  if (z.welcomeQuestId !== undefined && state(z.welcomeQuestId) !== 'available') return null;
  return 'welcome';
}

export {};
```

## 4. TypeScript sketch

Sketch file: /private/tmp/p2/wave2-haiku/batch3/QD017/work/levy-street-town-done.ts (same content as the block above). Typecheck on the VPS (/tmp/levy-street-town-done.ts): exit 0.

## 5. Lands in

Target file (proposed; not checked against the Frankendom repo): origins/quests/town-done.ts, with the errand list authored per zone in zone data and the entry line produced by the client HUD. Parity row 18 (loot roll and XP award) is a weak fit: the town-done line grants nothing and rolls no loot. It is the closest row only because the rule is zone-level quest completion, and the text says so rather than claiming a reward path.

## 6. Gaps and risks

1. Geometry inference is brittle. Whether a quest counts depends on where its giver and turn-in NPCs stand relative to the hub radius (town_quests.ts lines 116-117, hub radius from zone data: 26 and 20 here). Moving one NPC can silently add or remove a counted errand. Fix: author the errand list per zone as data (the sketch's counted flag), and let a test check the list against the NPC positions.
2. Level-gated errands block the line. A quest that is only gated (header line 29) still counts, so a player who cannot take it yet sees no town_done. That is the donor's stated choice; it can keep the line silent for a long time if an errand is gated far above the entry level. Fix: decide per zone whether gated errands count; the donor does not separate them.
3. Latent default mismatch. townQuestIds spreads the tables over the shipped ones (line 109), while townQuestsComplete uses ?? (line 141). An explicit quests: undefined would make townQuestIds throw on Object.values(undefined). No src caller passes it (only tests), so this is latent and was not reproduced. Fix: one default function for all three tables.
4. Precedence: town_done is checked before the welcome branch (line 157 before line 160), so it wins whenever both would apply. No test isolates this case: q_wolves, the Eastbrook welcome quest, is itself a counted town errand (test line 43), so the Eastbrook town_done tests finish it first. Fine for a chat line; if Frankendom uses the rule for anything that moves state, this precedence must be tested on its own.
5. Client-only. The file header says the sim leaf is UI-only and never joins the tick. The town-done state is therefore not server-verified. That matches a chat line; it does not match a reward. Any reward or unlock tied to town completion must be computed on the server, which the donor does not do.
6. Cost is not measured. townQuestIds scans every quest, and instanceMobIds rebuilds a set from every dungeon on each call. The call happens on a zone crossing (zone_entry_line_core.ts line 19), not per tick, so this is probably fine, but it was not timed.

Frankendom gaps against the rulings: there is no zone-completion aggregate in Frankendom's rulings (not checked against the repo). Zones as data fits this rule once the errand list is data (gap 1). Server-verified kills do not apply: this rule reads quest state, and the donor takes that state from the world, which is client-side here. One ledger does not apply: the rule grants nothing.

Reuse tag: adapt (the zone completion rule and entry precedence; the geometry inference replaced by authored errand flags, fix for gap 1).

Brief rule served: 12 quests-dialogue (STRONG, full depth); addendum rule "keep the idea, fix the defect" (decision adapt); parity row 18 used with the weak-fit caveat above.

Best transferable idea: a zone is done when every errand the town hands out and receives inside the zone is turned in, with retired or other-class quests skipped and a zone with zero counted errands never counted as done.

Decision (proposed): adapt — keep the completion rule and the precedence of the done line over the welcome line; author the errand list per zone as data instead of inferring it from NPC positions, so a moved NPC cannot change the rule.
Acceptance: entering a zone with a town-done line shows it only after the last counted errand is turned in; a retired or other-class errand does not block it; a zone with zero counted errands never shows it; a server-side test asserts the errand list in zone data matches the NPCs' positions.
