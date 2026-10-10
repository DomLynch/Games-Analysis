# Feel note: hit-feedback-stack, donor dhewm-dhewm3

Reader ID HF002. Depth: thin. Half read: both in the sense of code (game logic and view presentation are in the same binary; read both). The data half is NOT in the donor: the damage and feel numbers live in def and pk4 data, which this source release does not contain (README.md line 48). Not read: the data half, because it is absent.
Donor root: /mnt/frankendom-donors/dhewm-dhewm3 (read over ssh, read-only). Code read in neo/game (base) with the matching neo/d3xp copy checked by line number.

## 1. What the player sees and feels
The player is the one who gets hit most, so the feedback is on the camera. A hit jerks the view for a fraction of a second: the pitch and roll follow the direction of the blow, so a hit from the front tips you back and a side hit rolls you. Damage can also leave a short red-tinted screen blob (a texture placed at a position and size set per damage type, with random jitter), and a short double-vision effect if the damage type asks for it. Being hit by a heavy blow pushes you with a velocity change in the hit direction, and you cannot cancel that push for a short time. Monsters react with a pain sound picked by how much health they have left (four bands), and a pain animation only when the blow is big enough and not too soon after the last one. Separately, loud sounds marked as "shakes" make the whole view jitter while they play, with the amount set by the sound's volume at the player's position. A scripted event can also kick nearby players' views for a set time and amount, and optionally push things around it.

## 2. Why it works, or is striking
- Readable at a small screen: a direction-coded kick is a strong, fast cue, the view says "from there" without text.
- One signature behaviour: the blow's direction becomes the camera's direction. Strong idea, cheap to build.
- One signature effect: a screen blob placed on the side the hit came from. On a phone this can mark which side a hit came from.
- Could be made ours at 20-30 percent resemblance: yes, if the kick is small and the blob art and timing are ours.

## 3. The rule behind it (ordering and timing)
Player being hit (order in the damage routine):
1. Knockback first: if the damage type has a knockback value (default 20 when absent), add a velocity in the hit direction, scaled by a global knockback cvar and by an attacker push scale (read from the damage def for self-inflicted damage, 1.0 otherwise). Set a no-counter timer clamped to 50 to 200.
2. Armour soak: if armour absorbed damage, play a short armour sound, rate-limited (200 ms).
3. Burn and no-air sounds, by flag.
4. View feedback (only if still alive, and only if the view-effect cvar is on): skip if the last impulse was under 150 ms ago (so a shotgun cannot wipe the view). Then double-vision time (dv_time), head kick time and amplitude (pitch and roll from the blow direction), and screen blob time, position, size and material.
5. Health damage applied last.

Monster being hit (Actor pain routine):
1. Physics rest for ragdoll impacts.
2. Pain debounce: if the last pain sound was too recent, stop.
3. Pain sound by health band: above 75, above 50, above 25, else. Sets the next-pain debounce.
4. Pain animation only if the actor allows pain, not inside the last pain window, and damage passes the actor's pain threshold. Animation name tries prefix plus damage group, then prefix, with legs excluded.

Shake (sound-driven): each frame the sound world reads the summed shake amplitude at the listener; the view angle becomes random per axis scaled by that amplitude.

Shake (event-driven, FX_SHAKE): kicks each player within a radius with the same view impulse (time and amplitude from the event), and if an impulse is set, a radial push.

Data fields (designer-tunable; donor values null because the licence is GPL, not MIT, Apache or BSD):

| name | unit | donor_value_or_null |
|---|---|---|
| knockback_base | integer (default 20 if absent) | null |
| knockback_global_scale | cvar (default 1000) | null |
| knockback_no_counter_clamp | ms (50 to 200) | null |
| impulse_delay | ms (fixed in code, 150) | null |
| kick_time | seconds | null |
| kick_amplitude | ratio | null |
| dv_time | seconds | null |
| blob_time | seconds | null |
| blob_width, blob_height | pixels (times blob-size cvar) | null |
| pain_delay | seconds | null |
| pain_threshold | damage points | null |
| pain_health_bands | health points (75, 50, 25) | null |
| shake_sound_amplitude | per-sound shake value (not read) | null |

## 4. For Frankendom
- 700 zones as data: the hit-side blob and kick numbers belong to a damage-type row, so any zone reuses the same few damage types instead of new code.
- 100 Pit characters reused: the pain-band and pain-threshold numbers can sit on the character family row; a recoloured character inherits its feel.
- Many-vs-one, max 3 attackers: the blob-by-side idea is the useful one. Three attackers map to three sides (left, right, front), so each hit shows its own side. The 150 ms impulse delay stops three hits in a row from wiping the view, which matters more with three attackers than one.
- Server-verified: the server decides the damage and the knockback position change. The client only presents the kick, blob and push timing. The kick and blob are cosmetic and must not feed back into server state.
- Keep: kick by hit direction; blob by hit side; impulse delay; no-counter timer after a push; pain sound by health band with a debounce.
- Change: drop the double-vision effect (it fights readability on a small screen); keep the kick small; keep shake to one short event per hit, not stacked; make the knockback push a server-verified tile move, not a free velocity.

## 5. Five-minute look test (Dom, phone)
Use the same duel scene as the other donor's test (dummy plus three attackers) and add the blob and kick:
- Profile X: sound and a flash-type white fade only (the donor's Flash, which is not a hit effect).
- Profile Y: direction kick (small) plus a blob on the hit side.
- Profile Z: Y plus a 150 ms impulse lock so three quick hits do not stack.
Dom taps three attackers from left, right and front and says which profile tells him which side hit him, within one second, without nausea. No release rows.

## 6. Licence and IP
- Code: GNU GPL (COPYING.txt line 1), with the Doom 3 GPL additional terms (README.md line 225) and an excluded-code clause (README.md line 227). Third-party parts keep their own licences (Dear ImGui is MIT).
- Game data: not in the repo (README.md line 48). The data is proprietary under the Doom 3 EULA, which names Id Software and Activision. The installer folder holds that EULA text (neo/sys/linux/setup/image/License.txt line 1).
- Treat as category-level inspiration only: "a view kick from the hit direction", "a screen blob on the hit side". No code, no Doom 3 names, no textures, no sound, no donor numbers kept.
- Recreate as a distinct original: keep the direction rule and the timing lock; change our kick numbers, blob art, names and timing.

## 7. Gaps
- Read: neo/game/Player.cpp (Damage, knockback, damage feedback), neo/game/PlayerView.cpp (DamageImpulse, CalculateShake, Flash, Fade), neo/game/Actor.cpp (Pain, pain sounds and debounce), neo/game/Fx.cpp (FX_SHAKE handler), neo/framework/DeclFX.cpp (FX shake parse), neo/game/Misc.cpp (idEarthQuake shake, lines around 3090 to 3240, a world shake entity, not a hit effect), neo/game/gamesys/SysCvar.cpp (defaults for knockback and view cvars, read by name).
- The neo/d3xp copy of the same routines was checked by line number only (Player.cpp, PlayerView.cpp, Game_local.cpp), not read in full.
- Not read: the data half (damage and feel defs, materials, sounds, models): absent from this release. The only .def file found within depth 3 under base/ and neo/ is a Maya importer file (neo/MayaImport/mayaimport.def), not feel data.
- Not found: no hit-stop code, no hit particle code, no hit flash on the monster. The white Flash in PlayerView is a fade used for teleport or pickup events.
- Half read: code only; data absent.
