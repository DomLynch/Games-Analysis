# ikemen-engine-Ikemen-GO: hit-feedback-stack (HF001)

Donor: /mnt/frankendom-donors/ikemen-engine-Ikemen-GO (VPS, read only).
Depth: full for the feedback logic. Tuned numbers: thin (character packs are not in the repo).
Half read: both. Read the engine (src/char.go, src/system.go, src/anim.go, src/bytecode.go) and the common system scripts (data/common1.cns.zss, data/guardbreak.zss, data/common.const). Character packs (chars, sff, snd) are absent from this repo, so no per-move hit numbers exist here (not in the half I read).
Asset audit or catalogue for this donor in batch3: none found (checked AU*/ and DC*/). Not used.

## 1. What the player sees and feels

A clean hit makes the whole exchange stop for a few frames. Both fighters freeze, a spark appears at the contact point and the hit sound fires on the same frame. The struck fighter flashes near-white for three frames when the hit lifts it into the air. A heavy hit that drops the fighter adds a short screen shake, and on a controller the hit state sends a rumble. When the freeze ends, the struck fighter slides back and the slide eases off, instead of stopping dead. The order is the feel: contact (spark and sound), then the hold, then the knock.

## 2. Why it works, or why it is striking

- Readable at 375 wide: the freeze plus a single white frame gives a beat even when sprites are small.
- One signature behaviour: a shared freeze on contact, set on both sides.
- One signature sound: the hit sound at contact, from a per-hit sound group and number.
- Could be ours at 20-30 percent resemblance: keep the order (spark and sound at contact, freeze, flash, slide that eases), and change the numbers, colours, sounds and shake shape.

## 3. The rule behind it

Order for one contact event (t counts from the contact frame; the order is from code, the numbers are tunable):

1. t=0, spark at the contact point. Engine default spark is anim 2 for a clean hit and 40 for a guard (src/char.go 339-340). The hit spark call is at src/char.go 12067.
2. t=0, hit sound from the hit's sound group and number, on a channel (default channel -1, src/char.go 341). Guard uses its own guard sound (src/char.go ~12085-12095).
3. t=0, hit-pause set. The attacker gets pausetime[0], the target gets pausetime[1] (src/char.go 14317 for the target, 14322 for the attacker). Guarded hits use guard_pausetime (src/char.go 14334; its default is copied from pausetime at 931-932). A +1 frame offset applies when hpFix is set, which is for Ikemen-version or Mugen 1.x characters (src/char.go 14240).
4. t=0 onward, hit state. The ground hit states (5000 family) run forceFeedback on set frames (data/common1.cns.zss 504, 532, 554). The air get-hit state 5201 and air recovery state 5210 run palFx with time 3 and add 128,128,128 (data/common1.cns.zss 906 and 926).
5. Freeze end, slide. The knock-back state moves with its slide, then multiplies x velocity by 0.6 once time reaches slideTime (data/common1.cns.zss 479-497, velMul at 487).
6. Landing or bounce, shake. The fall state calls fallEnvShake (data/common1.cns.zss 746, 796). The shake is one shared object per screen: time, freq, ampl, decay, mul. Its defaults in clear() are freq 60 and ampl -4 with mul 1.0 (src/system.go 6771-6777, update at 6798, run once per frame at src/system.go 2907).

Stacking (the most useful rule here): the target freeze is assigned only when the target is not already in hit-stun. At src/char.go 14316 the check is `if !getter.csf(CSF_gethit)`, then 14317 assigns. A second hit during stun does not extend the freeze. The shake is one object that a new trigger overwrites. Neither stacks by addition.

Scaling with damage or weapon, as the donor does it:
- Freeze length is per HitDef (pausetime, guard_pausetime). A guarded hit freezes differently from a clean hit.
- Shake amplitude is per HitDef (fall.envshake values, converted by the scale ratio at src/char.go 14298-14300). Damage itself is not a term in the feedback code I read.
- Rumble length is by hit-state tier: 6 frames on light states, 8 on mid, 15 on heavy (src/common1.cns.zss 504 and the 5010-5030 group).
- Sound: per hit group and number. There is no damage-based pitch in this donor (see the OpenBOR note for that).

Data fields (designer-tunable; donor value only because MIT):

| name | unit | donor_value_or_null |
|---|---|---|
| hitstop_attacker_ticks | logic frames | null (per HitDef pausetime[0]; numbers not in repo) |
| hitstop_target_ticks | logic frames | null (pausetime[1]) |
| hitstop_guard_ticks | logic frames | null (guard_pausetime) |
| hitpause_newer_offset | frames | 1 (hpFix, src/char.go 14240) |
| flash_hit_ticks | frames | 3 (data/common1.cns.zss 906) |
| flash_hit_add | 0-255 per channel | 128 (same line) |
| flash_guardbreak_ticks | frames | 20 (data/guardbreak.zss 163) |
| flash_guardbreak_add | 0-255 per channel | 64 red only (same line) |
| shake_freq | degrees per frame | 60 (src/system.go clear) |
| shake_ampl | px (sign flips direction) | -4 (src/system.go clear) |
| shake_ticks | frames | null (per HitDef fall.envshake time) |
| knock_slide_mul | multiplier per frame | 0.6 (data/common1.cns.zss 487) |
| rumble_ticks_by_tier | frames | 6, 8, 15 (data/common1.cns.zss 504 and the 5010-5030 group) |

Our starting values, not donor values (for the look test only): hitstop attacker 4 frames light, 8 heavy; target 2 frames more than attacker; shake only on heavy. These are design guesses to be tuned by Dom.

## 4. For Frankendom

- Server verified. In this donor the freeze is simulation state, not a cosmetic. c.hitPauseTime counts down inside the update loop and is checked with pause(). Our server should own the freeze: the hit event carries stop_ticks_attacker and stop_ticks_target, and both clients freeze for the same ticks. The client plays spark, sound and flash at the event, and never decides the freeze length itself.
- Input during freeze. The donor has a common toggle that buffers commands during hit pause (data/common.const line 16, Input.PauseOnHitPause = 1). The file marks it deprecated in favour of command parameters, so we should set the behaviour per command, not as a global. Keep the idea: an input pressed in the freeze is queued, not lost. This matters for fast duels.
- Many-vs-one (max 3 attackers). The donor assigns the target freeze only when not already stunned, so three attackers do not stack three freezes. Keep that. Shake is one object, so take the max, not the sum.
- 700 zones as data, 100 Pit characters. The feedback table is one shared table keyed by weapon class and hit kind (clean, guard, guard-break, fall, bounce). Zones and characters do not carry their own feedback numbers; they reuse the table.
- Keep: the order (contact spark and sound, freeze, flash, slide with the 0.6 multiplier, shake on fall or bounce), the assign-not-add freeze rule, the 3-frame white flash, the 20-frame red guard-break flash.
- Change: our own colours and sounds, no shake on light hits, rumble only on heavy tier, and the freeze length comes from the server event.

## 5. Five-minute look test (for Dom, on the phone)

Build a flag on the existing dummy duel, published to /preview/ with no release rows (per the look-test skill). Three toggles, switchable on the same screen:
- A: no freeze, no shake, no flash (the current baseline).
- B: the ordered stack above (spark and sound at contact, both frozen, white flash, slide that eases, shake on heavy only, rumble on heavy).
- C: B, with three attackers piling in on one target, to test the stacking rule.
Ask Dom: can you tell which hit landed in a three-on-one pile? Does heavy feel heavier than light with no number on screen? Does the freeze read as impact or as lag?

## 6. Licence and IP

- Code: MIT. LICENCE.txt line 1 says "MIT License"; line 33 says "The MIT License applies to the Ikemen GO engine and the scripts in this repo." The data/*.zss scripts are covered by that line.
- README line 58 and 67: the bundled default screenpack is under CC-BY 3 (not read in full, not used here). Character packs are not in this repo.
- Use: we take ideas and an order, and write our own code. No code copied. Category-level only: "a freeze on contact, then a slide that eases".

## 7. Gaps

- Not read: character packs (absent from the repo), fightfx sprite and sound packs (absent), the bytecode EnvShake controller at src/bytecode.go 10720 (only the type and fields were seen).
- Not traced: the call order between the spark and sound call (src/char.go 12067-12095) and the pause assignment (14316-14334). Two functions, call order not confirmed.
- Not traced: whether the knock velocity applies on the contact frame or after the freeze.
- Not read: shake decay default (env decay field), hit rumble call details beyond the state lines.
- Half read: both (engine and common scripts). No per-move numbers exist in the half present.
