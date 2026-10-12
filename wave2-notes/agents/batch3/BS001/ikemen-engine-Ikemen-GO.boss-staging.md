# ikemen-engine-Ikemen-GO (boss-staging, FEEL note)

Donor: /mnt/frankendom-donors/ikemen-engine-Ikemen-GO
Licence: MIT. LICENCE.txt:1 reads "MIT License"; LICENCE.txt:33 says the MIT licence covers the engine and the scripts in this repo. Caveat: data/dizzy.zss:1 says the dizzy code was "originally adapted" from another project (add004). That upstream licence is not in the box, so the dizzy script is clean-room (numbers and shape only, our own values).

Checked: src/system.go (roundState, introState, roundNoDamage, outroState), src/fightscreen.go (round timing defaults), src/bytecode.go (superPause controller), src/char.go (setSuperPauseTime, dizzy points add/set, dizzy damage path, data defaults), data/dizzy.zss, data/common.const, external/script/main.lua (grep only). The engine has no boss flag: 0 hits for "boss" in src/*.go and in external/script/*.lua. Depth: full for intro, super freeze and stun. Confidence high on the code I read. The character and motif packs are not in the box.

## 1. What the player sees and feels

A fight opens on one countdown. Before control, each side gets an intro beat (or a dialogue line if the motif sets one), then the round call, then "Fight" about 60 ticks later, and only then does the player have control. When a super lands, the screen darkens to half brightness and the game freezes for 30 ticks while the super's flash plays, so the super reads as a single big moment. (30 ticks is the code default; seconds depend on the tick rate, which I did not check.) When a fighter fills a stun meter, the screen flashes red for 30 ticks and birds circle the head. Once the victim has had a full cooldown with no hit, the stun ends. On a 375-wide phone the readable beats are the dark freeze, the red flash, and a single meter bar at the top.

## 2. Why it works / is striking

- Readable at 375 wide: the super's darkening (one brightness value, half) leaves only the attacker and the super flash lit. One beat, no clutter.
- One signature behaviour: a stun meter that a combo can only trigger once (the victim is reset to full and un-stunned after the first stun in a combo).
- One signature effect: the birds circling a stunned head, which lasts until the stun ends, plus a 30-tick red flash on the screen.
- Could be made ours at 20 to 30 percent resemblance: a darkened super freeze, a stagger meter with one stun per combo, and a stun visual that ends on a clear rule.

## 3. The rule behind it

Order of operations, as read:

a) Intro. One signed counter, sys.intro. Round state 0 while the counter is above ctrl time plus one (src/system.go:1889). The player intros run in the dialogue or intro branch (src/system.go:1909). Round announcement (src/system.go:1917). "Fight" called (src/system.go:1920). Control at zero. Defaults: ctrl time 30 (src/fightscreen.go:3284), over hit time 10 (src/fightscreen.go:3289), over wait time 45 (src/fightscreen.go:3288), callfight time 60 (src/fightscreen.go:3294). Between over hit time and over wait time, no damage can land (src/system.go:1867).

b) Super freeze (superPause controller, src/bytecode.go:10894). Defaults: pause 30 ticks (src/bytecode.go:10900), darken brightness 0.5 (src/bytecode.go:10904), move time 0. Move time is set to zero if it is longer than the pause (src/char.go:9461 to 9466). The unhittable window is pause time plus one (src/char.go:9471). The super's defence multiplier for the opponent during the combo is 1.5 (data/common.const:28 and src/char.go:8259). A longer incoming super pause takes over the current pause holder (src/char.go:9451 onward, the comparison uses bitwise not). The defence multiplier stacks for partner double pauses (src/char.go:9479).

c) Stun meter (dizzy points).
- A normal or special hit adds damage times 1.8 (data/common.const:31, src/char.go:8262). A super adds 0 (data/common.const:32).
- The add is divided by the victim's final defence (src/char.go:9099), so a tankier target fills the meter slower.
- Points are not set while the no-damage window is open (between over hit time and over wait time, src/char.go:9107).
- The meter max defaults to the life value (src/char.go:4413), so a plain-hit stun needs about life divided by 1.8 damage at defence 1.0. This is derived from the code, not measured.
- A non-guarded hit sets a 60-tick cooldown (data/dizzy.zss:200). Points return to max when the victim is neither in hit state nor lying down (data/dizzy.zss:260 to 262). The exact interplay of the cooldown and the reset was read but not traced fully.
- Once stunned in a combo, the next stun is frozen off (data/dizzy.zss:203 onward), so one stun per combo.
- Visuals: birds helper that frees itself 32 ticks after conditions clear (data/dizzy.zss:9), and a red background flash for 30 ticks (data/dizzy.zss:268 onward).

## 4. For Frankendom

- 700 zones as data: boss staging fields (intro ticks, freeze ticks, stagger max, stagger per hit) belong in zone or boss data, not in the scene.
- Many-vs-one (max 3 attackers): the stun meter should sum hits from all attackers on the boss, so the group staggers the boss. Which characters freeze during a super was not read in full in the donor (it has a background pause option). Our choice: freeze the boss and the caller, hold the other attackers for the same ticks, so nobody gets a free hit.
- Server-verified: the freeze timer, the stagger count and the one-stun-per-combo flag are engine state in src/fight. The server ticks them. The client only draws darkening, birds and the flash.
- Keep: one intro countdown, 30-tick freeze, half darkening, stagger that divides by defence, one stun per combo, a 60-tick cooldown that resets the meter when the boss is not hit.
- Change: the stagger max must be a data field, not the boss's life (the donor's default). Hits from all attackers count, as above.

## 5. A 5-minute look test Dom can judge on his phone

Put it in the /preview/ folder with no release rows. Three clips at 375 wide on the existing boss:
1. The boss's heaviest move as today.
2. The same move with a 30-tick freeze and the screen at half brightness.
3. A stagger bar at the top of the boss after three heavy hits, with the birds and the 30-tick red flash.
Dom judges whether the freeze reads as a moment, whether the birds read at phone size, and whether the bar is needed.

## 6. Licence / IP

MIT, engine and scripts (LICENCE.txt:1 and :33). Code may be adapted with the copyright notice kept. The numbers in data/common.const and src/fightscreen.go are MIT donor values and may be used as defaults. Dizzy script: upstream licence unverified, so use the shape only and our own values. Keep the birds and the flash as an original visual.

## 7. Gaps

- Not in the box: characters, motif (fight screen definition), stage packs. So idle and ambient behaviour, death and respawn presentation at character level, and loot ceremony are not in this donor (not read).
- Not read: KO and win-pose animation details beyond the outro state machine (src/system.go:1904 onward, outroState), sound files, the super's default effect animation beyond the default number, external/script/main.lua UI flow (grep only, 0 boss hits).
- Half read: engine and data scripts are both read. Content packs are absent.
- Walk density: not in this donor (not read). Readability at 375 wide: not read (the engine has no phone size check in the parts I read).
- Dragons and big creatures (MG011): see the JSON key mg011. No dragon, breath cone, flight, taming or per-part armour code found. src/model.go:70 and :71 hits are glTF light cones, not breath.
- Asset audit and catalogue for this donor (batch3 AU* / DC* files): not present in batch3, not read.
