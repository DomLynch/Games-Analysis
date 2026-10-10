# ClassicUO (onboarding-first-30min, OB011)

Donor: ClassicUO (/mnt/frankendom-donors/ClassicUO/). Licence: BSD 2-Clause (LICENSE.md line 1). README line 68 says "BSD 4 license" (conflict; LICENSE.md text is the licence). No game assets in the repo (README line 68 says it distributes no copyrighted assets). Depth: thin. Half read: client only.

Checked: src/ClassicUO.Client/Network/PacketHandlers.cs (0x0B, 0x2C, 0xA6 handlers), Game/Scenes/LoginScene.cs, Game/Scenes/GameScene.cs (CheckDeathScreen), Game/Scenes/MainScene.cs, Game/UI/Gumps/TipNoticeGump.cs, Game/UI/Gumps/CharCreation/ (CharCreationGump, CreateCharCityGump, CreateCharProfessionGump, CreateCharTradeGump, CreateCharAppearanceGump), Game/GameObjects/EntityTextContainer.cs, Game/Constants.cs, Game/Managers/AudioManager.cs, Game/GameActions.cs, Main.cs, grep for tutorial/tip/onboard/welcome/first-time across src/, tools/, README.md. Confidence high that the client has no tutorial code. Not read: the server half (absent from this donor), tests/, the monokickstart tool, the GridLootGump body, the sound-effect (0x54) handler.

Half read: client. The first-30-minute content of a UO shard (intro, starter quests, tip text, city descriptions, first fight, loot tables) is server-sent. It is not in this repo, so I cannot report it as absent from the donor box; I say "not in the half I read".

## 1. What the player sees and feels
Before the world appears, the player sees a login screen with login music (track 78 on 7.0+ clients, 0 on newer-than-308Z, 8 on older). A saved autologin setting skips the screen (LoginScene.cs lines 72 and 79 to 84); a startup flag also skips it (Main.cs line 398 sets SkipLoginScreen). Then a server list, a character list and, if empty, the creation flow. Creation is a paged gump: appearance and name, a profession tree (categories you drill into), then either a skill-spread page (when the profession has no preset) or straight to a city page showing a six-facet map. The name must be 2 to 16 characters (CreateCharAppearanceGump.cs line 787). On the city page the first city is already selected for new clients (CreateCharCityGump.cs line 53), so Create is one tap away. In play, the only client-side hint is a server "tip" window: it can open at 200,100 with previous/next buttons, or as a notice at 20,20 with no buttons (PacketHandlers.cs lines 3471 to 3492; TipNoticeGump.cs lines 45 to 54). The tip text is sent by the server; the client only shows it and asks for the next or previous tip.

## 2. Why it works / is striking (for this donor)
- The creation flow is short and pre-filled: the default city is preselected, and a valid name is the only text entry. Friction is removed in the client, not explained.
- Hit feedback is numbers, not a flash: a damage number floats up from the entity. The player's own numbers use one hue and other entities' numbers use another (EntityTextContainer.cs line 85). The number lives 1.5 s (line 90), rises one pixel every 25 ms (constant at line 51, rise at the update loop), and at most 10 numbers queue per entity (line 94). Readable at 375 wide if the two hues contrast.
- Death is staged: the death handler (PacketHandlers.cs lines 1745 to 1760) plays death music (track 42), forces war mode off, and shows a "you are dead" line for 1.5 s (Constants.cs line 86) only when the profile's death-screen option is on (GameScene.cs line 1232). The screen clears when the timer ends.
- War music is random: entering war mode plays one of three tracks (38 to 40), chosen at random (GameActions.cs line 36).
- Could be ours at 20 to 30 percent resemblance: a two-hue damage number stream with a 10-number queue, and a one-line death beat with its own music cue.

## 3. The rule behind it
Hit feedback is a per-entity queue of short-lived numbers. Each number is created at the damage event, carries an owner colour, a lifetime, a slow rise, and a queue cap. Death is a timer that starts at the death packet and gates a single overlay. Music is keyed to state: login loop, a random war track on entering war mode, a fixed death track.

Data fields (designer-tunable; donor values allowed because the code is BSD 2-Clause):
- damage_number_life: 1500, ms (donor 1500)
- damage_number_rise_step: 1, px per tick (donor 1)
- damage_number_rise_tick: 25, ms (donor 25)
- damage_number_queue_cap: 10, count per entity (donor 10)
- damage_hue_self: 0x0034, hue index (donor value 0x0034)
- damage_hue_other: 0x0021, hue index (donor value 0x0021)
- death_overlay_hold: 1500, ms (donor 1500)
- death_music_track: 42, track index (donor 42)
- login_music_track: 78 (7.0+), 0 (308Z and newer), 8 (older), track index
- war_music_tracks: 38 to 40, random pick, track index
- tip_window_pos_with_buttons: 200,100, px (donor 200,100)
- tip_window_pos_notice: 20,20, px (donor 20,20)
- name_min_len: 2, chars (donor 2); name_max_len: 16, chars (donor 16)
- default_city_index_new_client: 0, index (donor 0); old client: 3, fallback 0 (donor 3, 0)

## 4. For Frankendom
- The 700-zone, 100-character, 3-attacker shape is served by the damage-number queue: cap at ten per entity, so a three-on-one fight stays readable. Keep one hue for the hero's damage and one for the attackers' damage.
- Death and respawn: keep the 1.5 s overlay idea, but make it a death beat (one line, one music cue, then the ring or town hall). Death is a state change driven by the server, so the client only plays it.
- Server-verified events drive the presentation: the client does not decide a kill or a loot drop. The tip window is the model for server-authored hints (text supplied by the server, client only shows it and requests the next).
- Keep: pre-selected defaults, a short creation path, numbers over flashes, a death beat with music.
- Change: no profession tree and no six-facet city map; our first screen is the ring. Replace the random war track with a fixed, placed stinger on the first fight.

## 5. The 5-minute look test
On a 375-wide phone, play one 60-second ring clip twice. A: the current hit feedback (one hue, no queue cap). B: the player's hits in one hue and the attackers' hits in another, numbers drifting up for 1.5 s, capped at ten per target, three attackers on screen. Dom judges: can he read his own numbers at a glance, and does the death beat (one line, one music cue, then the town hall) feel like a beat or a pause.

## 6. Licence and IP
Code: BSD 2-Clause (LICENSE.md). Code may be adapted with the notice kept (adapt-with-notice). Art and string content: none in the repo (README line 68). The constants above are donor values from BSD code and may be used directly. Recreate the number stream with our own fonts and colours. No legal conclusion is drawn.

## 7. Gaps
- Not read: the server half (not in this donor). The first 90 seconds, the first fight, first loot, first hub and the tip texts are all server-sent and absent.
- Not read: GridLootGump body (loot container view), the 0x54 sound-effect handler, the monokickstart tool, tests/.
- Half read: client only.
- The death overlay text key was not read (the text is a client resource; name not checked).

Best transferable idea: a per-target damage-number queue with an owner hue and a hard cap of ten, so three-on-one hit feedback stays readable on a phone.

## Onboarding items (per ONBOARDING-FOCUS)
1. First 90 seconds: login screen with music, autologin skip, creation gump, then server-driven world. Client shows nothing before the server sends the world. Not in the donor: the server half.
2. First fight and first hit: client shows damage numbers (own hue, other hue, 1.5 s). The first fight is server-scripted (not read).
3. First reward, loot, level or unlock: client has a grid loot view (GridLootGump.cs, body not read). The reward ceremony is not in the client.
4. First hub: the start city is chosen during creation from a six-facet map (CreateCharCityGump.cs line 20 names the facets). Bank, shop and trainer introduction is server-side (not in repo).
5. First meaningful choice: profession (CreateCharProfessionGump.cs) and the skill spread (CreateCharTradeGump.cs line 328 requires three unique skills on old clients).
6. Pull-forward at 5, 10, 30 minutes: none in the client. Tip windows are the only in-play hint, and the server decides when they open.
7. Tutorial style: none in the client. Server tips with previous and next buttons (text length unknown; the server sends it).
8. Drop-off risks: a four-step creation flow with a name rule; a server tip window can cover the centre of the screen at 200,100; no client skip for the tip window other than closing it.
9. Could be ours at 20 to 30 percent: a preselected first choice, a single-line death beat, and two-hue damage numbers. Look test: section 5 above.

## Receipts
See receipts.tsv in this folder (note ClassicUO).
