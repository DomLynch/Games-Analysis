# darkanrs-client (onboarding-first-30min, OB010)

Donor: darkanrs-client (VPS, read-only: /mnt/frankendom-donors/darkanrs-client)
Licence: GNU GPL v3 code (LICENSE). Restricted by the repo's own note (_RESTRICTED-NOTE.txt line 1): Jagex-derived RuneScape client, "Study shape/idea only; never copy code or constants." Content class D for code, C for anything game-derived. Inspiration here is category-level only.

Checked: CLIENT half only (src/main/java, 1,060 .java files; client.jar and lib/clientlibs.jar listed, not extracted). Read: GameTipsLoader.java, IndexLoaders.java (loading and tip wiring), MaterialProp23.java (client frame loop, cutscene dispatch), CutsceneDefinitions.java (cutscene load gate), CutsceneArea.java, CutsceneAction.java, CutsceneAction_Sub9.java, ApplyHitmarkCutsceneAction.java, SendFinishedCutsceneAction.java, BrightnessPreference.java (cutscene end and finish packet), CombinedInputSubscriber.java (skip gesture check), PacketDecoder.java (CUTSCENE packet), Login.java (lobby and account creation), LoginStage.java, LobbyStage.java, AccountCreationResponseOpcodes.java, LocalizedText.java. Confidence: high on the cutscene and tips mechanisms (order of operations read in the code); medium on what the player sees, because the content that fills them is not in the repo.
Half-read: client. The server half is not in this repo. Same-family folders on the box that may pair with it, named only and NOT opened: LostCityRS-Engine-TS, Open-RSC-Core-Framework. The data (cache indices: tips index 33 at IndexLoaders.java line 102, cutscene index, CS2 scripts) is not in the repo.

## 1. What the player sees and feels (375 wide)
A loading screen with a bar and one line of tip text under it, in a font the client loads from the cache. The client does not leave the loading stage until the first tip (and a second, when one is pinned) is fully loaded (IndexLoaders.java line 147), so the tip text is in memory before the world appears. After login, if the server starts a scripted intro, the screen goes black into a camera move with music, entities walking, and a timed hit number. Any configured tap or key ends it early. The client does not show text on its own in this path; scripted text, if any, comes from the cache.

## 2. Why it works / is striking (375 wide)
- Readable beat: the loading tip is one line in a fixed slot, so it never fights the bar.
- One signature behaviour: a cutscene that waits until everything it needs is ready, then starts on a shared clock, and a skip that is data, not code.
- One signature sound: a music cue inside the cutscene that the cutscene waits for before it starts (CutsceneAction_Sub9 readiness check).
- Could be made ours at 20-30 percent resemblance: a short ring walk-in with a stinger and a skip tap, the first hit number taken from the real server event.

## 3. The rule behind it
Cutscene timeline (MaterialProp23.java lines 90-98): each cutscene action carries a start offset in client frames. Once the cutscene is playing, a cursor walks the action list and fires every action whose offset is now due, then stops at the first future action. The clock starts when the state flips to playing (line 86 stores the start frame). Actions are assumed to be in time order; the sort itself was not read.
Load gate (CutsceneDefinitions.java lines 139-155): the cutscene does not start until every entity, every music action and every object reports ready. A failed asset blocks the start; no timeout was seen in the lines read.
Skip (MaterialProp23.java line 76): a data-defined input subscriber decides the skip (CombinedInputSubscriber.java lines 72-83: a click type, a minimum click count, and keys that must be held). Skipping and natural end both send CUTSCENE_FINISHED with a flag (BrightnessPreference.java line 21: 1 when the scripted finish fires, 0 when skipped).
Scripted hit (ApplyHitmarkCutsceneAction.java lines 105-109): a timed call that shows a hit on a cutscene entity. It is presentation only; it does not decide anything.
Loading tips (IndexLoaders.java lines 119-124 and 147; GameTipsLoader.java lines 155-170): a tip group is picked by a per-player preference integer. If that group is empty the client falls back to group 0. When the group has a pinned first entry, the rest are shuffled with a random partial swap (line 161), and the pinned one stays first (line 160). The bar is a sum of parts (IndexLoaders.java line 113).

Data fields (designer-tunable, donor values NOT used because the donor licence is GPL and restricted):
- cutscene.action.start_frames (unit: client frames; our build should use ms), donor_value_or_null: null
- cutscene.ready_gate (bool: wait for all entities, music and objects), donor_value_or_null: null
- cutscene.skip.click_type, cutscene.skip.min_clicks (unit: count), cutscene.skip.held_keys (list), donor_value_or_null: null
- cutscene.finish_flag (unit: 1 natural, 0 skipped), donor_value_or_null: null
- hit_presentation.scripted_value (unit: damage number, from the server event), donor_value_or_null: null
- loading_tip.group_id (unit: id), loading_tip.pinned_first (bool), loading_tip.shuffle (bool), donor_value_or_null: null

## 4. For Frankendom
- 700 zones as data: the intro is data (a cutscene record keyed by zone or by first-fight id), not code. One runtime plays it.
- 100 Pit characters: a cutscene can reuse the same camera and stinger across characters; only the entity list changes.
- Many-vs-one: a scripted hit must show the damage number from the server event, never a fake one. The client presents; the server decides.
- Server-verified events driving client presentation: the ready gate fits our rule that the client waits for assets, not for the server.
- Keep: the ready gate, the time-sorted cursor, the data-defined skip, the pinned first tip, the finish flag sent back to the server.
- Change: no fixed frame counts in code; express offsets in ms as data. Our skip is always one tap. The idle kill (MaterialProp23.java lines 70-71, 2250 read pulses) belongs to the server, not the presentation layer.

## 5. A 5-minute look test Dom can judge on his phone (375 wide)
Build two things on the existing gladiator ring, nothing else:
1. A 4-second walk-in: camera push-in on the ring, one music stinger at about 1.2 s, the first hit number at about 2.4 s taken from a real server event, and any tap skips it. Compare with the current opener. Judge: does the hit number read at 375 wide, does one tap skip, does the stinger land on the hit.
2. A loading card: three tips, one pinned, the other two shuffled, one line each. Judge: is the tip readable at 375 wide and does it sit clear of the bar.

## 6. Licence and IP
Code: GPL v3, clean-room shape only. Content: Jagex-derived (restricted note). Inspiration stays category-level: "a loading card with a pinned first tip", "a skippable scripted walk-in". No code, constants, names, splash URLs or cache references are reused. Recreate with our own art, music and tip text.

## 7. Gaps
- Not read: the client.jar class bodies; the tips index contents (cache, not in repo); the cutscene index contents; CS2 scripts; which cutscene plays at login; the server half; the first 90 seconds as the player experiences it.
- Not in the client (absent in the half read, not absent from the game): first fight staging and rigging; first kill feedback; first loot and loot reveal; first level; hub and services; first meaningful choice; minute 5, 10 and 30 hooks; tutorial text length.
- Idle and ambient animation vocabulary, death and respawn presentation, walk density and 375 readability of creatures: not in this client half. Not read.
- Half read: client. Server half named above, not opened.

## Onboarding (first 30 minutes), for comparison only
1. First 90 seconds: loading screen with a bar and one tip line; then login (Login.java); then whatever the server starts (CUTSCENE packet, ServerProt.java line 117). The client shows nothing before a control except the loading screen and the cutscene.
2. First fight: the client can show a scripted hit on a cutscene entity at a timed point (ApplyHitmarkCutsceneAction.java line 108). Winnability is not in the client; it is server or cache data (not read).
3. First reward, loot, level: not in the client half. Not read.
4. First hub: a cutscene area (CutsceneArea.java lines 5-21) builds a walk packet to a target and sets the minimap flag; it is called from CutsceneAction_Sub4.java line 227 (the surrounding trigger logic was not read). Services (bank, shop, trainer) are not in the client half. Not read.
5. First meaningful choice: not in the client half. Not read.
6. Pull-forward hooks at minute 5, 10, 30: not in the client half. Not read.
7. Tutorial style: no tutorial code in the client half. The cutscene skip is the only player-facing gate (data-defined). Text length: not in the half read.
8. Drop-off risks it has: a cutscene that stays in the loading state if any asset never reports ready (no timeout seen). Drop-off risk it avoids: the skip is one tap by data; the loading card has a pinned first tip so the first screen is never empty.
9. Could be ours at 20-30 percent resemblance: a skippable ring walk-in with a stinger and a server-taken first hit number, plus a pinned-first loading card. Look test: section 5.

## Also reported where the donor has it
- Idle and ambient behaviours: not in the client half.
- Death and respawn presentation: not in the client half.
- Loot reveal ceremony: not in the client half.
- Walk density: not in the client half.
- Readability at 375 wide: not read. The loading tip is a fixed one-line slot; that is the only layout rule visible.

## Other facts checked
- LocalizedText.java: 62 named static strings, each with four language strings in one constructor (English, German, French, Spanish; sampled rows). The grep count of "new LocalizedText(" lines is 170 and was not reconciled with the 62 names.
- LoginStage enum: 20 values. LobbyStage enum: 3 values. AccountCreationResponseOpcodes: 10 values. Most names are obfuscated; the meaning of each stage was not confirmed.
- GameTipsLoader.method6793 (lines 11-31): a tip line that starts with a direct-login command has everything after its first argument replaced by stars. Worth copying as a rule for any on-screen hint that shows a command.

Reuse tag: shape only. Brief rule served: onboarding first 30 min (feel), cutscene and loading-card shape.
