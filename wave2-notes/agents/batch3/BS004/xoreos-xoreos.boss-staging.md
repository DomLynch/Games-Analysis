# xoreos (engine reimplementation, boss-staging, depth thin)

Donor: xoreos-xoreos at /mnt/frankendom-donors/xoreos-xoreos (VPS). Code only; no game data in the folder. Licence: GPL-3.0-or-later (COPYING:1-2). Shape only. Nothing copied.

Checked: src/engines/nwn/script/function_tables.h (848 entries; 705 with handler 0; 143 bound), src/engines/nwn/script/functions_object.cpp:347 and :387 (PlayAnimation bound), src/engines/nwn/script/container.cpp:59 (cutscene-abort module event), src/engines/nwn2/script/function_tables.h:928 (MountObject, handler 0), src/engines/dragonage/script/function_tables.h:938 (CommandFly, handler 0), src/aurora/gdaheaders.cpp (2205 hash-to-name entries; Boss, IsBoss, EliteBoss, KobeDragon names at :1010, :1727, :1962, :2225), grep for SetCutsceneMode, FadeToBlack implementations across src (none). Decision: adapt (idea) for the verb list only. Confidence high on what is bound and what is not. Best transferable idea: a short fixed list of staging verbs (cutscene mode with input lock, fade, camera lock, play animation) that a boss script calls, plus an abort event that restores control when an intro is interrupted.

## 1. What the player sees and feels (375 wide)
This donor does not ship a boss intro. The script API it implements describes one. In the NWN script function table, the staging verbs are: SetCutsceneMode (table line 828), FadeToBlack and FadeFromBlack (line 832 and nearby), SetCameraMode, LockCameraPitch, LockCameraDistance, LockCameraDirection (lines 959-961), the cutscene effects EffectCutsceneParalyze, EffectCutsceneDominated, EffectCutsceneGhost, EffectCutsceneImmobilize (around lines 721-903), and PlayAnimation (line 436, bound to Functions::playAnimation at functions_object.cpp:347). The verbs for a cutscene exist as names. Most of them have no handler in this donor, so the phone player would see nothing from them here. (Not read: the original game scripts that call them, which are not in the donor folder.)

## 2. Why it works, or is striking
- Readable beat: a fade to black, a camera lock on the boss, and the boss animation. Three steps, each readable at 375 wide.
- One signature behaviour: the abort hook (container.cpp:59, Mod_OnCutsnAbort). An interrupted intro hands control back to the player through a named event, not a timer.
- One signature sound: none in the table read.
- Could be made ours at 20 to 30 percent resemblance: a 2 s boss intro (fade, lock, one animation, fade back) with a skip that fires the abort event.

## 3. The rule behind it
- Designer-facing verb list, not a timing rule. The table entries are the rule: a named verb per staging action, with defaults. Defaults present in the table include a fade speed value (kDefaultFadeSpeedMedium, at function_tables.h:131 and 2535-2536) and a snap camera transition type (function_tables.h:105).
- Binding status: 143 of 848 entries have a handler. 705 have handler 0. Cutscene verbs are mostly in the 705 (SetCutsceneMode and FadeToBlack are 0 at lines 828 and 832). PlayAnimation is bound.
- Boss flags: the GDA name table has three names, Boss, IsBoss and EliteBoss (gdaheaders.cpp:1010, 1727, 1962), which suggest a plain boss and an elite tier. Which table uses them, and their values, are not in the donor (not read).

Data fields (our proposal, donor value null because the donor is GPL):
- intro_fade_s (seconds), proposal 0.3 to 0.5 each way
- intro_cam_lock_s (seconds), proposal 1.5 to 2
- intro_skip_window_s (seconds), proposal first 0.5 s tap skips
- boss_flag_tiers (enum), proposal normal, boss, elite boss (the name set suggests two boss tiers above normal)

Defect check: none found in what is bound. The donor's unbound verbs are a gap, not a bug to fix.

## 4. For Frankendom
- 700 zones as data: the intro (camera mark, animation name, fade timing) is zone data; one template for a boss intro, reused across zones.
- Many-vs-one: the intro must not lock the 3 attackers; lock player input only, and let the escorts keep acting on the server.
- Server-verified: the intro is a server state change (boss enters engage state), the client plays the fade and camera. The skip sends one event; the server ends the intro state and the abort event returns control.
- Parity rows: row 11 (fight camera) is the one row for the lock and fade. Row 7 (creature clips) for the animation. Row 13 (specials) for the intro as a special state.
- Keep: named verb list; abort event restores control; intro as a state, not a timer.
- Change: our intro verbs are all bound on day one (the donor leaves most unbound); the skip is a player input, not a designer call.

## 5. Five-minute look test (Dom's phone)
- Build: one arena, one boss, one 2 s intro: fade to black 0.4 s, camera lock on boss 1.5 s, boss animation, fade back. Compare with a no-intro variant. Style flag only, published to preview folder, no release rows.
- Judge at 375 wide: does the intro read as a moment, does a tap to skip feel right, do you lose a second of control you wanted.
- Target file: src/fight/<module>.ts (module not chosen; not read). One parity row: row 11 (fight camera).

## 6. Licence and IP
- GPL-3.0-or-later (COPYING:1-2). Code only, no game data in the folder. Shape only. Recreate the verb list in our own names. Keep the trait (named verbs and an abort event), change the trait (all verbs bound, skip as player input).

## 7. Gaps
- Half read: server (script function tables and the GDA name table). Not read: the engine's cutscene implementation beyond the table (none found by grep), the client render and camera code, the original game scripts (not in the folder), and the GDA rows that carry Boss or EliteBoss values.
- Idle and ambient behaviour, death and respawn, loot reveal, walk density, readability at 375 wide: not applicable to this donor (engine library). Not read.

## MG011: dragons and boss abilities (table rows)
Only names and unbound handlers. No dragon code in this donor.

| name | effect | formula | number ranges | cost | cooldown or cast | caps | file:line |
|---|---|---|---|---|---|---|---|
| MountObject | mount a creature or object (script verb) | n/a | n/a | n/a | n/a | n/a | nwn2 function_tables.h:928, handler 0 |
| CommandFly | fly command (script verb, Dragon Age and Dragon Age 2 tables) | n/a | n/a | n/a | n/a | n/a | dragonage function_tables.h:938, handler 0 |
| KobeDragon | a GDA column name (dragon type flag, values not read) | n/a | n/a | n/a | n/a | n/a | gdaheaders.cpp:2225 |
| Dragon breath, taming, armour per body part | none in this donor | n/a | n/a | n/a | n/a | n/a | grep src: no hits |

Resource pools as data: not in this donor.

Proposal for a fast mobile fight (ours): a mount or fly verb list with bind-or-don't-ship rule (no verb in the build unless it has a handler); a flying boss phase on the same run-and-rearm cycle as in the Warzone note.

## Reuse tag
Idea adapt (verb list only); no code.

## Brief rule served
FEEL boss-staging (thin); MG011 (dragons and boss abilities, names only).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)

Verdict: CLEAN
- No errors found; all cited lines and numbers verified against the donor.
- Missed: none.
