# Design note: status effects (donor: keldaanCommunity-pokemonAutoChess)

Donor root (VPS, read-only): /mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess
Licence: GPL-3.0 (LICENSE at donor root). Content: policy.md says the Pokemon content belongs to The Pokemon Company. Treat as restricted for inspiration: category-level only.
Depth: full for the status model. Half read: BOTH halves (server model and simulation in app/, client sprites and battle dispatch in app/public/src/game/components/).

## 1. What the player sees and feels

Each unit on the board carries small animated status badges drawn from one "status" sprite atlas, one animation per status key (BURN, SLEEP, FREEZE, CONFUSION, PARALYSIS, CHARM, FLINCH, POISON and others). Most badges sit at a local y offset of -30 at 2x scale, above the head. Freeze sits at offset 0, on the body. The art itself was not viewed, so I cannot describe the shapes. The code does show two visible behaviours: poison switches to a separate POISON_BADLY animation at three or more stacks, and possessed tints the body. Charm changes movement: a charmed unit leaves its attack state and walks back toward the unit that charmed it until it is one cell away. Sleep plays the SLEEP action animation on the body. Poison and burn keep ticking damage once a second on top of this.

## 2. Why it works / is striking

- Readable silhouette or beat at 375 wide: the badge sits over the head and the unit's own motion (the walk-to-charmer, the sleep animation) carries the meaning, so the player does not need to read a number. Pass on the code evidence; the art and its legibility at 375 wide were not checked.
- One signature behaviour: charm is a forced walk to the charmer. Poison is one tick per second scaled by stacks. Burn is one tick per second. Pass.
- One signature sound or effect: no sound was found in the paths read (see gaps). The signature visual is the badge tier swap at poison stack three. Partial.
- Could be made ours at 20-30 percent resemblance: yes. Keep the over-head badge, the escalating stack tier, and the charm walk. Change the names, art, and the palette (the donor badges are its own art).

## 3. The rule behind it

Statuses are time-based (milliseconds on the server), not turn-based. Each status has a boolean that is synced to the client and a separate cooldown timer that is not synced. Only 35 booleans and one number (poisonStacks) are synced, so the client never receives remaining time. Every tick runs in the server update (updateAllStatus, app/models/colyseus-models/status.ts line 197). Burn and poison tick every 1000 ms.

The rules, read from the code:

- Burn (updateBurn, line 443): one damage tick per 1000 ms of 5 percent max HP. Weather scales it (drought x1.3, rain x0.7), Assault Vest x0.5, water-type abilities x0.7, x0.5 or x0.3, and Well-Baked or Magmarizer set it to 0. Burn also speeds freeze wear-off to twice speed while burning.
- Poison (triggerPoison line 579, updatePoison line 624): each application adds one stack. The cap is 3 by default, 4 if the source has the venomous effect, 5 if toxic. Damage per tick is 5 percent max HP times stacks. Duration is refreshed only if the new one is longer. When the timer ends, stacks reset to zero.
- Freeze (triggerFreeze, line about 727): no stacking (the code says so). Snow x1.3 duration, drought x0.7, enraged halves it, and an icy-rock item reduces it.
- Sleep (triggerSleep line 776, updateSleep line 804): does not stack. Every hit taken while asleep removes 300 ms from the remaining sleep (pokemon-entity.ts, around line 1227). Night x1.3, Zenith x0.7. Slaking wakes into a rage of 3000 ms.
- Confusion (triggerConfusion line 822): refuses to re-apply while active. Sandstorm x1.3.
- Paralysis (triggerParalysis line 924): refresh only if the new duration is longer. Storm x1.3, Electric Quartz item reduces.
- Charm (triggerCharm line 862, updateCharm line 883): forced movement toward the charm origin until within one cell (moving-state.ts line 24). Each hit from the charmer takes 500 ms off the charm (pokemon-entity.ts around line 1231).
- Flinch (triggerFlinch line 992): while flinched, a shield absorbs only half of each hit (pokemon-state.ts line 590). The other half passes to HP.
- Wound (triggerWound line 893): refresh only if longer; Blood Moon x1.3. The effect on healing was not read.
- Knockback on every tenth block (FightingKnockbackEffect, app/core/effects/synergies.ts line 327): when the blocker has blocked ten times and the attacker is adjacent, the attacker is pushed to a free cell, loses its shield, and takes the blocker's attack as physical damage. Protective Pads prevent it.
- Control immunity window: when a sleep or freeze ends, ccCooldown is set to CC_COOLDOWN (app/config/game/game.ts line 6, value 1500 ms). Sleep and freeze cannot be applied again while the window is open. This is the anti-chain-stun rule.
- Immunities: items grant specific immunities (Flame Orb: freeze; X-Ray Vision: sleep; Heavy-Duty Boots: lock; Air Balloon: board effects; app/core/effects/items.ts lines 829-864). Passives too (Vigoroth: sleep; Comatose: burn, poison, freeze, paralysis, app/core/effects/passives.ts lines 1293-1310). Comatose keeps the unit flagged as asleep but it still acts (pokemon-entity.ts line 234 excludes it).
- Rune protect (triggerRuneProtect; call sites in dishes.ts and items.ts): clears all negative statuses and blocks new ones for a timer. Call-site timers are 10 s, 30 s, 60 s, or the whole fight.
- Cure-on-apply berries: Aspear (freeze), Chesto (sleep), Persim (confusion), Cheri (paralysis), Pecha (poison). Applying the status eats the berry and cures it at once.

Call-site counts (grep across app/core and app/models, values in ms, counted as call sites, not as an ability list): paralysis 3000 (13 call sites), poison 3000 (8), freeze 2000 (8), flinch 3000 (8), burn 3000 (8), burn 5000 (6), burn 2000 (6), confusion 3000 (7), wound 4000 (4), sleep 2000 (3), sleep 3000 (2), charm 1000 (2), charm 2000 (2). These are the durations the content uses most often.

Client half (app/public/src/game/components/pokemon-sprite.ts): addStatusEffectsSprites (line 950) adds one badge per true boolean. Badges come from the "status" sprite atlas, one animation per status key (BURN, SLEEP, FREEZE, CONFUSION, PARALYSIS, CHARM, FLINCH, POISON, POISON_BADLY and others). Positions differ: most at y offset -30, fatigue -10, charm and flinch -40, freeze 0, pokerus -50. Poison badge switches to POISON_BADLY at 3 stacks (addPoison line 1364). Possessed tints the body (line 1208). battle-manager.ts changeStatus (line 200) runs on every synced field change; sleep also plays the SLEEP action animation (line 218).

## 4. For Frankendom

- Shape map: 700 zones as data, one status table shared by all 100 Pit characters. Each character gets immunity tags as data, the way Keldaan gives Vigoroth sleep immunity.
- Many-vs-one, max 3 attackers: the poison-style stack cap should equal the number of attackers (3 for us). A DoT can stack once per attacker, so three attackers never pile up beyond three stacks. The control rule (one of sleep, freeze, paralysis, charm at a time per target) is the same idea as Keldaan's freeze-does-not-stack and sleep-does-not-stack. Keep the 1.5 s control-immunity window after any control ends. Without it, three attackers chain-stun a target.
- Server-verified events driving presentation: Keldaan syncs booleans and dispatches per field change. That fits our server-verified shape. Send each status change as one event with the status id, the stack count, and an end time. Do not send the timer ticks.
- What to keep: badge over the head, badge tier swap at stack 3, the charm walk, cure-on-apply items, the 1.5 s control window, the knockback on every tenth block.
- What to change: Keldaan does not sync remaining time, so the player cannot read time left. We should sync the end time (server clock) so a timer ring can show it. Keldaan sends a number tick every second per unit. On a phone with three attackers that is a number flood. Batch the tick number into one floating number per second per target.

## 5. A 5-minute look test Dom can judge on his phone

Build one preview scene at 375 wide: one target against three attackers (the many-vs-one shape). Show two variants, A and B, for 60 seconds each:

- A: poison stacks as one badge above the head that swaps to a heavier badge at 3 stacks, one number per second.
- B: the same stacks shown as a fixed badge on the unit card (HUD corner), with a ring for time left and no number.

Then one control test: a freeze shown as a centred badge (A) vs an above-head badge (B), with the 1.5 s immunity window shown as a grey pulse when the freeze ends.

Dom answers: which can he read mid-fight in one second, and does the grey pulse make the chain-stun obvious.

## 6. Licence and IP

- Code: GPL-3.0. Do not copy code. Inspiration only.
- Content: policy.md says the Pokemon content rights belong to The Pokemon Company. Names, badges and sprites are instance-level content. Do not reuse them.
- Category-level inspiration only: "a stacking damage badge over the head that changes weight at three stacks", "a control status that makes the unit walk to its controller", "a 1.5 s immunity window after control ends". Recreate with our own art and names. Name the trait kept and the trait changed.
- Donor values: none recorded (GPL donor, so donor_value_or_null is null for every field).
- No legal conclusions.

## 7. Gaps

- Not read: the wound effect in detail; the full ability and item list that applies statuses (only call-site counts were taken); app/core/effects/abilities and passives beyond the immunity lines; abilities-animations.ts beyond the grep hit; the animation manager for SLEEP beyond the dispatch line; app/public/dist; tests; sound (none found in the paths read).
- No donor audit or catalogue exists for this donor under AU or DC in the batch folder (grepped, none found).
- Half read: both. The client is read only at the sprite and dispatch level.
- No receipts.tsv written for this note.
