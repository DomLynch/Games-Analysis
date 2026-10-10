# openmw (status-effects, SE009)

Donor: `/mnt/frankendom-donors/openmw` (read-only, VPS) | Licence: GPLv3 for the code (README.md:9; LICENSE is the GPL v3 text). Clean-room: shape only, no code or numbers copied. Asset licences are not relevant to this topic.

Checked: Read the stagger and knockdown path (Lua local combat script, character state machine, creature stats), the fall-knockdown rule, the magic effect container, active-spell stacking and refresh, per-tick effect application, the AI-setting effects (fear-like, frenzy and calm), paralysis, dispel and the corprus worsening clock. Confidence: high on order of operations for the stagger, stacking and expiry rules (read in full); medium on the AI-setting path because the magic-effect flags that decide whether it runs per frame live in the data half. Half read: client (engine code and the Lua combat and camera scripts). The Morrowind data half (magic effect records, spell records, GMST values from the game) is not in the box. Paired donor: none in this batch (the box has no data half for openmw).

## 1. What the player sees and feels

A hit that lands does one of two things, and the player can tell which from the body. A light hit flinches the character into a short hit-recovery clip and the character keeps control soon after. A heavier hit, or an unlucky roll on a heavy one, drops the character into a knockdown clip, the controls are gone for the length of that clip, and a blow that kills while the character is down plays its own death-on-the-ground clip rather than the standing death. While a status is on, the player sees it as a change in what the body can do: a paralysed character stops, a calmed or frenzied creature changes whether it keeps fighting, a demoralised creature backs off. A flinch or a fall ends when its animation finishes, so the player reads the end of the hit from the end of the motion. Magic statuses such as paralysis or calm end on their own timer, with no pose attached. On a 375-wide phone the readable part is the body's pose and the stop, not a number.

## 2. Why it works / is striking

- Readable silhouette or beat: flinch and fall are two different body shapes, and the fall is a clear beat with a clear end. Scores well at 375 wide.
- One signature behaviour: the agility gate. Strong characters are harder to knock down, so the same hit reads differently on two characters, and the reason is visible in their stats.
- One signature sound or effect: the knockdown clip carries its own pose change; the death-while-down clip is a separate pose. No sound was read (the audio half is not in the box).
- Could be made ours at 20-30 percent resemblance: yes. Keep the two-tier hit reaction (flinch versus fall) and the rule that a status lasts exactly as long as its animation. Change the numbers, the names and the clips.

Verdict: STRONG. The stagger rule is self-contained, read in code, and re-expressible as a server roll with a client clip.

## 3. The rule behind it

Stagger (the on-hit rule, read in `files/data-mw/scripts/omw/combat/local.lua`):
1. Only attacks that carry damage and have an attacker are staggered.
2. Knockdown is possible only when the raw health damage (before armour) is above zero AND at least the agility term.
3. Knockdown additionally needs the odds roll: roll a number from 0 to 99 and knock down if the roll is at or above a threshold that grows with agility.
4. Anything else sets hit recovery (the flinch). So the flinch is the default and the fall is the exception.
5. Armour and difficulty are applied first (`applyArmor`, `adjustDamageForDifficulty`), then stagger reads the raw health number. Stagger can be switched off per attack (`ignoreStagger`).

Fall knockdown (read in `apps/openmw/mwmechanics/character.cpp`, the fall handler): a fall that costs more health than the acrobatics skill times the fatigue term knocks the character down. A fall below that line costs health and gives acrobatics progress only.

Knockdown lifetime: the knocked-down state clears when the hit animation stops playing (`character.cpp` hit-state refresh), not on a timer. So the duration of a fall IS the length of its clip.

Knockdown and paralysis change other rules (read in `apps/openmw/mwmechanics/combat.cpp`):
- A knocked-down or paralysed or unaware target loses evasion (line 331).
- A knocked-down blocker cannot block (line 79).
- A knocked-down target takes a multiplied damage from a hit (line 285, the KO multiplier, default value not copied).
- Hand-to-hand hits on a paralysed or knocked-down target count as health damage, not fatigue (line 488).

Status ledger (read in `apps/openmw/mwmechanics/magiceffects.cpp` and `activespells.cpp`):
- Each effect is keyed by its id plus its argument (skill or attribute). Magnitudes with the same key ADD, base and modifier separately (magiceffects.cpp:101-108, 117-127).
- A spell that is not flagged stackable is not added again while the same spell from the same source is active and not temporary (activespells.cpp:482-491). A temporary one is merged into the active entry when none of its effect slots clash (line 492); if one clashes, the old effects get time left 0 and the spell is re-added (line 495). So a re-cast refreshes, it does not double.
- Potions and ingredients are flagged temporary AND stackable (spellcasting.cpp:320 and 395), so three potions add.
- Per-frame application scales the magnitude by the frame time, but the last frame is clipped to the time left: `mult = min(timeLeft, dt)` (spelleffects.cpp:1362-1365).
- Dispel is a per-spell chance: a roll from 0 to 99 below the magnitude removes that spell (spelleffects.cpp:464).
- Paralysis is on when the paralysis magnitude is above zero (creaturestats.cpp:214). God mode exempts the player (creaturestats.cpp:211-212).

Corprus worsening (read in `activespells.cpp` 186-192, `creaturestats.hpp` line 30, and `spelleffects.cpp` 1230-1233 and 1377): a status that gets worse on a clock. The worsening step is 24 game hours (`TimeStamp::operator+=` takes hours, timestamp.hpp:31). Each step re-applies the corprus effects through the normal apply path (spelleffects.cpp:1230-1233), and a counter on the spell records how many steps have happened. The size of each step's change was not traced.

Fear-like effects (read in `spelleffects.cpp` 56-66, 585-609, 1021-1026):
- Frenzy adds to the Fight AI setting; Calm subtracts and stops current combat when the magnitude is positive; Demoralize adds to the Flee AI setting; Rally subtracts from it. Each is a modifier on an AI setting, not a state change.
- The effect is valid only on NPC humanoids for the humanoid variant and only on creatures for the creature variant (line 59). The player is never a valid target for these (line 59 returns invalid when the target is the player).

Numbers are designer-tunable data fields (see the JSON). None of the donor numbers are copied because the code is GPL and the values sit in the data half, which is not in the box.

Best transferable idea: a status keeps one clock per (effect, argument) key, sums its magnitudes, and ends on the same animation or tick that carried it, so the player reads a stop, a fall or a stand-up instead of a number.

## 4. For Frankendom

- Engine ownership: the status ledger and the stagger roll belong in `src/fight` (the one engine). The client shows the flinch or the fall and the remaining clip; it does not roll. Parity row 10 (hit impact and hitstop) carries the visual side; row 3 (guard, parry and stamina) carries the block refusal and the evasion loss.
- Server-verified: the stagger roll in the donor is `math.random(0,99)` in a client-side Lua script. That is the defect for us (see Defects). The roll must come from the server seed and be written to the fight record (row 19).
- Duration: the donor ends statuses on animation end. For a fast duel that couples the server tick to the client clip. Keep the rule that a fall lasts as long as its clip, but store the duration in server ticks and play the clip at that rate.
- Many-vs-one (max 3 attackers): each attacker rolls its own stagger, so three attackers roll three times per round. The donor has no cap on that. Propose a per-target knockdown cooldown in the engine (not in the donor).
- 700 zones as data: the agility gate, the odds base and the odds slope are zone or creature data fields. The rules stay in the engine.
- 100 Pit characters reused across zones: one ledger per character. Keep the key scheme (effect, argument) so a recoloured character reuses the same status logic.

## 5. A 5-minute look test (Dom, on the phone)

Build a training dummy in the Pit with three hit buttons: light, medium and heavy. Each button fires one hit at the dummy.
- Light hit: expect a flinch (short, the dummy stays on its feet).
- Heavy hit on a low-agility dummy: expect a fall, the dummy grounded for the clip's length, then a stand-up.
- Heavy hit on a high-agility dummy: expect a flinch only.
- Death while down: expect the death-on-the-ground clip, not the standing death.
Compare on a 375-wide screen. Pass if the flinch and the fall look different at a glance and the fall ends where its clip ends.

## 6. Licence and IP

GPLv3 code. Shape and rule only, clean-room. The numbers are GMST values from the game data area; none are copied. The Lua stagger function is a GPL example of the rule; we re-express the rule ourselves. Recreate as a clearly distinct original: keep the two-tier hit (flinch then fall), keep the agility gate, keep the status ending on its clip; change the names, the odds, the clips and the poses. No legal conclusions.

## 7. Gaps

- Not read: the Morrowind data half (magic effect records and their flags, spell records, the real GMST values). Named here as absent from the box.
- Not read: the render code for status icons and the camera shake or hitstop on a fall.
- Not read: the combat AI packages that choose to attack or flee after a status (only the AI-setting modifiers were read).
- Open check (not verified): `modifyAiSetting` adds an int-cast magnitude (spelleffects.cpp:63) and the per-frame magnitude is scaled by frame time unless the effect is flagged NoMagnitude or AppliedOnce (spelleffects.cpp:1358, 1365). If the Frenzy, Calm and Demoralize records lack those flags, the fractions would truncate. The flags are in the data half, so this is unchecked. Do not treat it as a defect until the flags are read.
- Death and respawn presentation: only the death-while-down clip mapping was read (character.cpp:117-118). The respawn flow was not read.
- Loot reveal, walk density, idle and ambient behaviour: not in the status code, not read.

## Defects (keep the idea, fix the defect)

1. Stagger roll is client-side random: `math.random(0,99)` in `files/data-mw/scripts/omw/combat/local.lua:90`. Idea kept: a roll gated by agility. Fix: take the roll from the server seed and write it to the fight record.
2. Per-frame magnitude into an int modifier (open check in section 7, not yet confirmed as a defect). Idea kept: frame-scaled status magnitude. Fix: accumulate fractional magnitude in a float and round once per status change, not per frame.
3. `truncate()` rounds toward zero at 1/1024 (magiceffects.cpp:20-23), so positive and negative modifiers round differently. Minor. Fix: round symmetrically or skip truncation for integer modifiers.

Decision: adapt (idea), defects fixed in our build.

## Best transferable ideas (one line each)

- Stagger: a flinch by default, a fall only when the hit clears a damage gate and an agility-scaled roll.
- Status lifetime: the status ends when its clip ends; the clip length IS the duration.
- Stacking: one key per (effect, argument); spells refresh, consumables add.
- Death while down: a separate death-on-the-ground clip, chosen by state.
