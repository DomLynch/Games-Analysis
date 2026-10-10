# Feel note: ACEmulator-ACE, topic world-events (WE001)

Donor tree (VPS, read-only): /mnt/frankendom-donors/ACEmulator-ACE/
Licence: AGPLv3 code (LICENSE). Assets: no asset licence line anywhere in the repo. The game client data (portal.dat, client_portal.dat, client_highres.dat) is not in the repo. Donor values are not used as data (copyleft, so donor_value_or_null is null throughout).
Half read: server. Source/ACE.Server event manager, generator gating, emote handling, admin command; Source/ACE.Entity enums; Source/ACE.Database event model; Database/Base/WorldBase.sql event table. Data half: the event table is created empty in the repo (0 INSERT rows for `event` in the Database folder), so named world events and their emote text are not in the repo. Client half not in repo.

## 1. What the player sees and feels
Mostly nothing announces itself. An event is a named on/off flag with an optional start and end time. The world changes when a flag flips: a generator (a spawner) appears or goes away, and an NPC answers differently. Ask a quest-giver whether the event is running and the NPC chooses between a success line and a failure line, so the state is spoken by the town rather than by a banner. A special flag, the PK-world state, is tied to the server's PK setting and is read-only through this path. The exact lines the player hears are emote data, not in this repo.

## 2. Why it works or is striking (criteria)
- Readable beat at 375 wide: weak in the code as shipped, since no banner or broadcast is attached to the flag. The strength is that the NPC branch and the spawn change happen together from one flag.
- One signature behaviour: the same flag gates both a spawn (generator) and a dialogue branch (success or failure line). One flag, two faces.
- One signature sound or effect: none in this repo.
- Could be made ours at 20-30 percent resemblance: yes. Keep the shared flag and the NPC success or failure branch. Add the banner that the code does not have.

## 3. The rule behind it
- Event record: name (unique), start time, end time (unix seconds, -1 means none), state, last-modified time (Database/Base/WorldBase.sql line 76; Source/ACE.Database/Models/World/Event.cs line 22).
- Five states: undefined 0, enabled 1 (armed, not yet running), disabled 2 (blocked), off 3 (stopped), on 4 (running). Source/ACE.Entity/Enum/GameEventState.cs line 3.
- Start moves enabled or off to on. Stop moves enabled or on to off. A disabled event refuses both (Source/ACE.Server/Managers/EventManager.cs).
- No timer. The window is checked lazily each time something asks: IsEventStarted compares now with the start and end times, stops an expired on-event, starts an armed or off event whose start has passed, then returns whether the state is on (EventManager.cs, line 127).
- Generators gate on the flag. GeneratorTimeType has five real values: RealTime (window on the generator itself), Event (on while the named event is enabled and started), Night and Day (follow the in-game clock, Timers.CurrentInGameTime.IsDay, WorldObject_Generators.cs line 368), and Defined (a TODO in the code, not implemented; Source/ACE.Server/WorldObjects/WorldObject_Generators.cs, CheckGeneratorStatus).
- Two-tick staging. HandleStatusStaged does not flip a generator on the first check that sees a change. It sets a flag. On the next check it applies whatever the value is then, and clears the flag (WorldObject_Generators.cs lines 445 and 453). So a flip lands one generator update late, and a flip that reverses in between still lands. A one-tick debounce.
- Who checks: Generator_Update runs every RegenerationInterval seconds (the interval value is not read), and is also called from EmoteManager, chest reset and object generation (WorldObject_Generators.cs, doc comment at line 628).
- Who sets: emotes can start (type 23), stop (type 24) or query (type 51) an event. The query branches to success (category 27) or failure (category 28) lines. Admin commands start and stop by name and write an audit line (Source/ACE.Server/Command/Handlers/AdminCommands.cs, line 2753).

Data fields (designer-tunable; donor values null because the donor is AGPL):

| name | unit | donor_value_or_null |
|---|---|---|
| event_state | enum: undef 0, enabled 1, disabled 2, off 3, on 4 | null |
| event_start_time, event_end_time | unix seconds; -1 = none | null |
| generator_time_type | enum: real_time, event, night, day, defined (not implemented) | null |
| generator_check_interval | seconds (RegenerationInterval; value not read) | null |
| stage_checks | count (2: one-tick debounce) | null |
| emote_query_branch | emote types 23 start, 24 stop, 51 query; categories 27 success, 28 failure | null |

## 4. For Frankendom
- 700 zones as data: one event row per named world event, with a zone scope list and window. The flag should be the only thing the server writes; zones and NPCs read it.
- 100 Pit characters reused across zones: the NPC branch (success or failure line) can be reused by any character that is given the flag name. Only the text changes.
- Many-vs-one: a flag that gates a spawn should not change how many attack. The attacker cap is a separate topic.
- Server-verified events driving client presentation: the server holds the flag and writes one ledger row per flip. The client draws the banner and the NPC line from that row. Do not let the client compute the window.
- Keep: one flag for both the spawn gate and the NPC line; the lazy window check on query (cheap, no timer per event); the one-tick debounce on world-state flips.
- Change: give the flip a visible announcement (the donor has none); make the debounce explicit on the server and id-keyed so it cannot double-fire; remove the Defined generator type stub or implement it, and do not leave it as a TODO.

## 5. Five-minute look test
On the existing phone build, flip one named event on and off and compare two presentations at 375 wide: (a) the world only changes (a camp appears, NPC line changes when asked); (b) the same change plus a 2-second top banner. Dom judges whether a player who was not looking can tell the world changed. Then flip the event twice within one tick: the world must end in the second state, not flicker.

## 6. Licence and IP
AGPLv3 code. Assets have no licence line; client data is not in the repo and is not sought. The README calls the project non-commercial and says it implements the server from scratch. Inspiration stays at category level: a shared on-off flag for spawns and NPC branches, a lazy time window, a one-tick debounce. No code, no event names, no emote text is copied.

## 7. Gaps
- Not read: generator spawn and despawn bodies (what happens to live objects on disable), the RegenerationInterval default, emote data rows (not in repo), the weenie emote sets that carry the success and failure lines, the day and night clock source.
- Not verified: the one-tick debounce behaviour is from reading the code; not run.
- Half read: server only. The data half (world event names and emote text) is absent from the repo; the event table is empty in the base file.
