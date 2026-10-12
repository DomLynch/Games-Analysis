# OpenGothic (weather-time-light, depth thin)

Donor: OpenGothic, root /mnt/frankendom-donors/OpenGothic. Licence: MIT (Copyright 2019 Try, LICENSE). Code may be adapted with the notice kept. Half read: client (sky, lights, world clock, music tags, NPC routines). No server half exists in this donor (single-player engine). No game data tables were read.

Checked: read the full sky light function (sky.cpp 79-158), gametime.h, lightsource.cpp setDir, world.cpp setDayTime, worldsound.cpp music tags, npc.cpp currentRoutine. Confidence high on the time code. Weather: greps for rain, snow, precipitation and weather under common/ and shader/ found no weather state machine and no precipitation. The only snow hit is a material code (world.cpp:60). So the weather half of this topic is NONE here; the weather half is in the openmw donor. Receipts: 64 of 64 pass (receipts.tsv, shared with openmw).

Best transferable idea: one game clock with four keyed times drives the sun path, the night blend and the music day window, so light and score turn over at the same moment.

## 1. What the player sees and feels
The sky runs on a fixed 24-hour clock. The sun rises at 04:45, is highest at 13:09, sets at 21:33, and the day ends at 24:00. The sun-driven ambient switches off within about half a degree of the horizon (smoothstep from 0 to 0.01 on sun height, sky.cpp:133), while the night blend takes about 10 degrees below the horizon to finish. The sun's own colour is a constant in this code (sky.cpp:136), so any warm dusk tint is elsewhere (not read). So the ambient goes out quickly and the night settles slowly. Two cloud layers scroll at different speeds. The music switches to a night set at 21:00 and back to a day set at 04:00, so the score turns with the light.

## 2. Why it works, or is striking
- Readable at 375 wide: four keys mean the light always reads as day, dusk or night at a glance.
- One signature behaviour: a single sun ring. Noon is the highest point; the sun crosses the sky once per day.
- One signature sound: the music day or night tag flips on the same clock as the light.
- Could be made ours at 20-30 percent resemblance: a keyed sun path and a music window, with our own times per region.

## 3. The rule behind it
- Sun elevation: a piecewise-linear value through the keys (rise to noon 0 to 1; noon to set 1 to 0; set to midnight 0 to -1; midnight to rise -1 to 0). sky.cpp:94-103. The sun direction is then normalised (lightsource.cpp:17), so real elevation is sine-shaped: about 61 degrees at noon, not a straight line.
- Azimuth: one full turn per day from the day fraction. sky.cpp:116-117.
- Night blend: 1 minus a linearstep from -0.18 to 0 on sun height. sky.cpp:79.
- Sun ambient: gated by a smoothstep on sun height (sky.cpp:133), then multiplied by a chain of named tune-up factors; the last is 0.3 (sky.cpp:146). The lux constants are 128000 for the sun and 0.32 for the moon (sky.cpp:31-32).
- Music day window: day if 04:00 to 21:00 inclusive (worldsound.cpp:241). Tag fallback runs zone, then default zone; day or night, then day; mode, then standard (worldsound.cpp:262-264).
- Skip to hour: same day if the target is later than now, else the next day (world.cpp:390-399).
- NPC routine lookup: wrap-around search by time of day (npc.cpp:3243-3259). If no routine covers now, pick the one that ended most recently by cyclic distance, so no NPC is left without a target.

Data fields (designer-tunable):
| name | unit | donor value (MIT) |
|---|---|---|
| sun_key_rise | hh:mm | 04:45 |
| sun_key_noon | hh:mm | 13:09 |
| sun_key_set | hh:mm | 21:33 |
| day_end | hh:mm | 24:00 |
| night_blend_depth | sun height | 0.18 |
| sun_ring_radius | unitless | 0.56 |
| sun_lux | lux | 128000 |
| moon_lux | lux | 0.32 |
| ambient_tuneup | factor | 0.3 |
| cloud_period_layer0 | ticks | 90000 |
| cloud_period_layer1 | ticks | 270000 |
| music_day_window | hh:mm to hh:mm | 04:00 to 21:00 |
| routine_fallback | rule | none (nearest ended) |

## 4. For Frankendom
- Server clock: one time of day for all players, sent by the server; the client draws the sky. Zones carry their own key times as data (700 zones as rows, not code).
- Client-only presentation under the rulings: sky, light, music tags are client code. The server sends the clock value and the zone's time profile.
- Many-vs-one: the night blend must not push the hero or the three attackers into black. Keep a floor on ambient so the attacker outlines stay readable at 24:00.
- Parity row 16 (colour grade/quality) for the sky and light. Engine untouched.
- Keep: one clock, the normalised ring, the wrap at 24:00, the music tag on the same clock, and the routine fallback.
- Change: replace the linear keys with a smooth curve; name the tune-up chain as data fields (no magic 0.68 / 0.5 / 0.3 stack); make key times per zone data.
- Routine fallback for zone population (parity row 23): if no spawn or schedule covers the time, use the nearest one that ended. No empty-time gaps in a walk.

## 5. The 5-minute look test
Make a scene with a time scrubber from 04:00 to 24:00 and the four keys marked. Publish to /preview/ with the look-test flag (no release rows). On a 375-wide phone, check at 13:09, 21:33 and 24:00: the hero silhouette and a three-attacker ring must stay readable. Compare the current linear key curve against a smooth curve across 21:00 to 22:00 and pick the one that reads as dusk.

## 6. Licence and IP
MIT, from the LICENSE file. Code may be adapted with the notice kept. This note copies no code. Donor values in the table above are allowed under MIT and are facts about the donor's sky keys; they are not copied lore. No legal conclusion.

## 7. Gaps
- Not read: shader/sky/sky.frag, fog.frag, sky_view_lut.frag and the other sky shaders (names only). The fog and sky colour are GPU-side; not transferable as code.
- Not read: the colour of the sun disc over the day. sky.cpp:136 sets the sun colour to a constant, while the comment at lines 21-23 suggests a time-varying colour. If the warm colour lives in a shader, it was not read.
- Not read: the rest of worldview.cpp (updateLights at 229-231 only), the world tick, daytime sound objects in worldsound.cpp, NPC routine start and end logic past npc.cpp:3265.
- Not read: Gothic game data (INI sky texture names, zone and time data). No data tables read, so no counts.
- Not in this donor: rain, snow, fog density, weather timers, weather change. The weather half is NONE here.
- Not read: death and respawn, loot reveal, walk density, boss staging.
- Half read: client only. Server half: not in this donor.

Decision: adapt the time keys and the routine fallback (idea). No defect in the time code needs a fix (checked: gtime(1,0,0) is 24 hours, so the midnight wrap is correct).

No code sketch: this template asks for data fields, not code, so nothing was typechecked.

Tags: day-night, scheduler, mood-preset, new:sky-keyframes, new:routine-fallback
