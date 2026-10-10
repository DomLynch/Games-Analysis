# alexbatalov-fallout2-ce (encounter-templates, cell EN010)

Donor: alexbatalov-fallout2-ce, a fan re-implementation of an isometric RPG engine (C++, src/ on the VPS at /mnt/frankendom-donors/alexbatalov-fallout2-ce/).
Licence: Sustainable Use License 1.0 (LICENSE.md line 1). Line 15 limits use to internal business or non-commercial or personal use. Ideas and shape only for us. No code, no constants and no data copied.
Verdict: STRONG (engine pipeline read end to end; the encounter list itself is not in the box). Decision: adapt (idea). Defects fixed in the sketch.
Checked: read src/worldmap.cc encounter parser (1275-1570), roll and detection (3322-3520), group setup and placement (3657-4095), condition evaluation (4096-4150), blink icon (6617-6641); src/worldmap.h 232-236; src/scripts.h 21; src/input.cc 537. Grep of src/ for ambush, camp, patrol, lair and escort gave only an enum slot and a string in this file. Confidence high on order of operations and on the defects listed. The data file data\worldmap.txt and the message file worldmap.msg are NOT in the box, so frequency values, the real encounter list and any use of camp, patrol, lair or escort are not read.
Best transferable idea: a two-step encounter, a 1.4 second map telegraph, then a yes/no choice if the party spotted it, else a drop into a formation, with the spot reward paid to the spotting skill.

Half read: engine only (src/). The engine is single-player, so there is no separate server half in this repo. Data pack (worldmap.txt, worldmap.msg, maps, city.txt) not in the box. The sibling donor alexbatalov-fallout1-ce has the same engine lineage but a much simpler roll (see its note).

## 1. What the player sees and feels (375 wide)
You walk the world map and most steps are quiet. Now and then a small map icon blinks: seven frames, alternating a dark and a bright version, about 1.4 seconds in all. Every encounter starts with this blink, caught or not. A special encounter uses a second icon pair, so rarity reads without text. Then the skill check decides only the next beat. If your survival skill catches the encounter, a one-line monitor message names it and a yes or no card asks whether to engage; "no" cancels it cleanly, and catching it pays a small XP reward that falls as the skill rises. If you do not catch it, there is no card: the screen fades straight to the encounter map and the group is already in position, a ring around you (the members scatter at a distance set by Perception), or a line, double line, wedge, cone or huddle ahead. So the surprise is the missing choice, not a missing warning.

## 2. Why it works and why it is striking
- Readable at 375: the telegraph is slow enough to read on a phone (1.4 seconds, two icon states). The special icon pair marks rarity without a label.
- One signature behaviour: the blink is shown to everyone; spotted adds a choice and a reward; unspotted adds no choice and drops into a formation. The same roll gives both branches.
- One signature sound or effect: none in the code read. wmBlinkRndEncounterIcon (6617-6641) only refreshes the map and waits; no sound call is in that function. The sound layer is not in the half read.
- Could be made ours at 20-30 percent resemblance: yes. The telegraph, the spot-or-surprise choice and the formation grammar transfer; the donor's icons, text and art do not.

## 3. The rule behind it
Pipeline, in the order the code runs it (src/worldmap.cc):
1. Gates before any roll (3322-3345): the throttle is wall-clock (1500 ms, line 3325); the party must be at least 3 away from the last encounter point on X and on Y (3331, 3335); not inside a town area; a one-time story encounter fires once, on game day 36 or later (3347).
2. Frequency: the tile subtile holds one value per day part (morning, afternoon, night, from the hour at 3395); the value indexes a six-level scale (none, rare, uncommon, common, frequent, forced) defined in the data file (1275). Easy lowers it by one fifteenth; hard raises it (3405 and following). The roll is 0 to 100; roll at or above frequency means no encounter (3416-3417).
3. Pick (3557-3660): entries whose condition holds and whose per-entry counter is not zero are candidates. Weighted draw: random up to total weight plus (Luck minus 5), plus 2 for Explorer, 1 for Ranger, 1 for Scout; Easy adds 5 and clamps to the total; Hard subtracts 5. If the draw runs past the last candidate, the last candidate wins (3629-3630). A counter above zero is decremented on pick (3636). Map: the entry's own map, or a random map from the table, or a random map from the terrain.
4. Telegraph: blink icon (3443), 7 frames at 200 each.
5. Detection (3455-3481): in a car the day-part modifier is subtracted here, after the encounter is already chosen (3451). If the frequency still beats the roll, a skill check runs: roll 1-100 under the survival skill (plus 20 with a motion sensor, capped at 95, then plus a per-tile modifier) means spotted. Spotted means XP of 100 minus the skill (3478) and the yes/no prompt. If the else branch is taken (car pushed frequency under the roll), spotted is forced true and the prompt shows.
6. Load and spawn (3657-3800): the entry's description message, then per sub-group a count = min to max, easy minus 2 (floored at min), hard plus 2, plus 2 when the party has more than two members (3693-3710). Ratio mode: count = ratio percent of the group count, at least 1 (3801). Single mode: 1.
7. Placement (3904-4095): ring (surrounding) uses a distance of Perception plus a random value from -2 to 2 (plus 3 with the cautious perk), then scatter within half that distance and a random direction (3983-4003). Line, double line and wedge alternate between two centres that grow from a map start point (or the party tile if the map has none); cone is the same walk offset by three directions; huddle walks one centre (3920-3970). Each tile must be free and path-reachable from the party; 25 attempts maximum and a 25-tile drift cap (4069 and the drift check beside it).
8. Group-chain rule (3722-3745): if an entry has exactly two sub-groups, the first member of group one is set as the attacker against the first member of group two, and a team combat is requested. Entries with three or more sub-groups request no such combat.
9. Items on members (3800 and following): min to max quantity per item, rolled at spawn time. An equipped flag exists in the struct (341 area); its use was not read.

Data fields (designer-tunable; donor values null under SUL):
| name | unit | donor_value |
|---|---|---|
| frequency_by_daypart | level 0-5 (none to forced) | null |
| daypart_hours | hhmm (morning, afternoon, night) | null |
| difficulty_freq_fraction | 1/15 of frequency | null |
| min_step_gap | world-map units, per axis (see defect 1) | null |
| spot_skill_cap | skill points | null |
| spot_scanner_bonus | skill points | null |
| spot_xp | XP = 100 - spot skill | null |
| luck_weight_offset | weight points, luck minus 5 | null |
| perk_weight_bonus (explorer, ranger, scout) | weight points | null |
| difficulty_weight_shift | weight points | null |
| telegraph_frames | count | null |
| telegraph_frame_ms | ms | null |
| group_count_min, group_count_max | members | null |
| difficulty_count_delta | members | null |
| party_size_count_bonus | members | null |
| ratio_percent | percent | null |
| ring_distance_base | tiles, plus Perception plus a random 2 | null |
| ring_cautious_bonus | tiles | null |
| placement_attempts_max | count | null |
| placement_drift_max | tiles | null |
| entry_counter | count, -1 unlimited | null |
| entry_special_flag | bool | null |

Counts in the code (from the enum and struct declarations, not from the data): 6 formations (worldmap.cc 110-115), 6 frequency levels (120-125), 4 situations (139-141 and nothing), 4 scenery values (none, light, normal, heavy), 3 day parts (176-178), 6 condition types, 40 entries per table (1411), 6 maps per table (1390), 6 sub-groups per entry (311), 3 condition terms per entry (292), 10 items per member (341). The table count and the real values are in the data file, not read.

## 4. For Frankendom
- 700 zones as data: each zone or terrain class owns one encounter table. Rows carry weight, counter, condition, map override and special flag; each group row carries min and max count, ratio, formation and a reference to one of our 100 Pit characters (reused, never a per-zone stat block). That is the reuse shape we want.
- Many-vs-one: the ring formation spawns up to N, but only 3 engage at once (MAX_ATTACKERS = 3). The others stand in reserve on the ring and step in when a slot frees. The donor has no such cap; this is our change.
- Server-verified: the roll, the detection roll, the pick, the counts and the spot reward all run on the server. The client gets an event: encounter pending, spotted yes or no, formation shape. Engaging is the state change (ruling: engage is a state change). The camera, the blink and the card are client-only.
- One ledger: the spot XP is a ledger write on the server, never a client number.
- Keep: telegraph, then choice or surprise, then formation; the counter (a limited ambush or bounty appears N times); the condition gate on rows; weighted rows per zone.
- Change: drop the wall-clock throttle (use fixed server ticks); make the situation field do work (ambush means no telegraph, fight means a dialogue state); decide the car rule (below); drop the two-group auto-combat unless it is declared in the row.

Defects found in the donor, each with the fix (keep the idea):
1. Walk gate needs both axes (3331-3337): after an encounter anchor, a walk along one axis never rolls, because the other axis difference stays under 3. Fix: distance is the larger of the two axis differences, or Euclidean, and the test is one check.
2. The anchor moves only on an encounter roll that passes (3501), not on every roll. Fix: move the anchor to the last roll point on every roll.
3. Conditions with OR (4104-4150): the match is reset for every term, so only the last term decides when an OR is used, and an earlier true is lost. Fix: accumulate with the joins (the sketch does this).
4. Luck and difficulty shift the draw (3589-3590, 3607): a shift past the total clamps to the last candidate, so the effect depends on list order. Fix: scale the weight of rare rows by luck (the sketch does this).
5. Car modifier (3451): subtracted after the encounter is chosen, so it changes only whether the prompt shows, not how many encounters happen. The code note says the copy is unexplained. Fix: decide the intent; if warnings, name it that way in the data; if fewer encounters, apply before the roll.
6. Dead branch (3722-3745): the else branch (one sub-group, where the first member attacks the player) is reached only when index is above zero, and that needs at least two sub-groups, so it cannot run. Fix: delete it or make it a real rule.
7. Wall-clock throttle (3325): the roll depends on frame time and pauses. Fix: a fixed server tick count.
8. Situation parsed (1562, default 1768) but never read in worldmap.cc. Fix: give it a rule or cut it.
9. Scenery parsed (1471) and only checked (3677). Fix: drive ring density or cover from it.

Sketch (typechecked: tsc --strict --target es2020 on the VPS, passes):
simplified: keeps the donor's roll order, the walk gate, the weighted pick with counters and the condition join. Omitted: the detection roll, the XP, the telegraph, the formation placement and the day parts. Reordered: the walk gate runs before the roll, as in the donor; the luck factor is applied to rare rows only, and conditions accumulate instead of keeping the last term.

```ts
export interface EncEntry {
  id: string;
  weight: number;   // designer data: relative weight
  left: number;     // -1 unlimited, 0 spent, n remaining
  ok: boolean;      // condition already evaluated by the caller
}
export interface Pos { x: number; y: number }
export function rollDue(p: Pos, anchor: Pos, minStep: number): boolean {
  return Math.max(Math.abs(p.x - anchor.x), Math.abs(p.y - anchor.y)) >= minStep;
}
export function evalConditions(terms: boolean[], joins: ("and" | "or")[]): boolean {
  if (terms.length === 0) return true;
  let acc = terms[0];
  for (let i = 1; i < terms.length; i++) {
    acc = joins[i - 1] === "and" ? acc && terms[i] : acc || terms[i];
  }
  return acc;
}
export function pickEntry(entries: EncEntry[], draw: number, luckFactor: number, rareBelow: number): EncEntry | null {
  const live = entries.filter(e => e.ok && e.left !== 0);
  if (live.length === 0) return null;
  const w = (e: EncEntry): number => (e.weight < rareBelow ? e.weight * luckFactor : e.weight);
  const total = live.reduce((s, e) => s + w(e), 0);
  let r = draw * total;
  for (const e of live) {
    r -= w(e);
    if (r < 0) return e;
  }
  return live[live.length - 1];
}
export function spend(e: EncEntry): void {
  if (e.left > 0) e.left -= 1;
}
export {};
```

## 5. Five-minute look test (Dom, on his phone)
Flag: encounter telegraph on the existing world walk. Preview only (/preview/ folder, no release rows, no lock).
Build: on the current world map, a pending-encounter state drives a 7-frame blink (200 ms each) on the map icon; when the roll says spotted, a yes or no card appears; when not spotted, a three-slot ring appears around the party after the blink, with only three slots engaging at once.
Walk for three minutes with the telegraph on, then three minutes with it off (surprise only). Judge: (a) can you read the threat icon on a 375-wide screen before it reaches you; (b) does the yes or no card feel like a real choice; (c) does the surprise version feel fair or cheap.
Target file: origins/server/world-spawns.ts. Ruling row: 23 (zone population: spawn caps, respawn, despawn). Presentation (blink, card, ring visuals) is client-only.

## 6. Licence and IP
Code: Sustainable Use License 1.0 (LICENSE.md line 1). Line 15 limits use to internal business or non-commercial or personal use. Shape and mechanism only for us. The donor's encounter names, icon art, message text and map names are not used or quoted. No legal conclusion; this summarises the file.

## 7. Gaps
- Not read: data\worldmap.txt (frequency values, encounter tables, group members, scripts, conditions as data) and worldmap.msg (descriptions). Both absent from the box. So no walk-density numbers per tile can be given; only the formula.
- Not read in full: the table and condition parsers past 1570 (wmParseConditional body, terrain parse), wmSetupRndNextTileNumInit beyond the start-point case, the combat code the spawn calls into, and the scripts that the group members use.
- Camp, patrol, lair and escort: not present as names in the engine code read. They are not in this box, so these shapes are not covered.
- Idle and ambient animation vocabulary: not in the encounter code read. Death, respawn and loot ceremony: not read (the spawn-time item quantities are the only loot shape here).
- Boss staging and boss intro: not read.
- Readability at 375: described from the code (blink length and icon pair), not measured.
- Walk density, numbers per tile: not readable (see the data-file gap).

Reuse tag: encounter-ambush, walk-density, rolls and tables (zone data), formation grammar.
Brief rule served: depth first (data and engine), half stated, defects with fixes, look test named.
