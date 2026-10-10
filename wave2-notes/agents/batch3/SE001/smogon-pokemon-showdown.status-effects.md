# Design note: status effects (donor: smogon-pokemon-showdown)

Donor root (VPS, read-only): /mnt/frankendom-donors/smogon-pokemon-showdown
Licence: MIT (LICENSE, Copyright 2011-2026 Guangcong Luo and other contributors). Content: the Pokemon species, moves and names are game IP owned by others. Treat the text and names as restricted; the mechanics numbers are game rules that the donor copies.
Depth: full for the status core. Half read: server and data (data/, sim/, server protocol doc). The client is NOT in this donor tree (no client folder at the root; the protocol doc in sim/SIM-PROTOCOL.md says what the client receives). So the client-side half is "not in the half I read", not "absent".

## 1. What the player sees and feels

This is a turn-based battle log, not a real-time fight, so the feel comes from the battle text and from the one-line beats. A status lands as a short line ("was burned", "was badly poisoned", "fell asleep", "became confused", "flinched and couldn't move"). When a unit cannot act, the line says so and gives the reason ("is paralyzed! It can't move!", "is fast asleep", "is frozen solid!"). Damage from burn and poison arrives as a separate line each turn ("was hurt by its burn", "was hurt by poison"). Badly poisoned (tox) is the one escalating status: its damage per turn grows each turn it stays in, until it is cured. Switching in resets the counter. On a phone the readable part is the single line per beat, not an animation, because this donor ships no animation.

## 2. Why it works / is striking

- Readable silhouette or beat at 375 wide: the "cant" line with its reason is a one-line beat that fits a phone row. Pass for the text beat. No visual beat was read, because the client is not here.
- One signature behaviour: paralysis is a 1-in-4 "cannot move" roll plus a halved speed stat, so the player sees it as a skipped turn and a late action. Tox is a counter that grows each turn. Flinch is a one-turn skip before the unit acts. Pass.
- One signature sound or effect: none. The donor is text and logic only. Fail for sound.
- Could be made ours at 20-30 percent resemblance: yes for the rules (one major status at a time, escalating tox counter, flinch as a one-turn skip). The battle-log wording itself is copyrighted text and must not be reused.

## 3. The rule behind it

Six major statuses (brn, par, slp, frz, psn, tox) are exclusive. Only one can be on a unit. Confusion and flinch are volatiles that sit beside them. In data/conditions.ts (954 lines, 35 condition entries in total), the major statuses are at lines 2 (brn), 20 (par), 47 (slp), 83 (frz), 123 (psn), 138 (tox). Volatiles include confusion (162), flinch (198), trapped and partially-trapped (208, 222), locked move (253), two-turn move (287), choice lock (324), must-recharge (364).

The exclusivity comes from the sim, not from the data. sim/pokemon.ts setStatus (line 1684) refuses to set a status that is already set (returns false and adds a fail message when the source move carried the same status). trySetStatus (line 1669) passes the existing status id if one is set, so a second major status cannot land through trySetStatus. The move path uses trySetStatus (sim/battle-actions.ts line 1213), but a forced-status path calls setStatus directly (line 1222). I did not trace that path further, so the exclusivity claim covers the normal move path only. addVolatile (line 1969) refuses a volatile already present unless the volatile declares onRestart, in which case it runs the restart hook. Confusion has no restart hook, so a second confusion is refused and the first one keeps its timer.

Durations are counted in turns and by the residual loop. sim/battle.ts (lines 519-523) decrements a handler's duration on each Residual event and runs its end when it reaches zero. Sleep sets its counter with random(2, 5). The sim's random(m, n) returns an integer in [m, n) (sim/prng.ts lines 94-101), so the sleep counter is 2, 3 or 4, decremented once per attempted move (data/conditions.ts lines 47-80; Early Bird decrements it twice). Confusion uses random(2, 6), so 2 to 5 turns, with a 33 percent chance to hit itself for 40 base power (lines 162-196). Locked move (lockedmove, line 253) uses random(2, 4) for its true length, so 2 or 3 turns. When it ends, onEnd adds confusion unless the true count was still above 1, so a locked move that runs out can leave the unit confused.

Residual damage: poison and tox run at residual order 9, burn at 10 (data/conditions.ts). Burn takes 1/16 of max HP per residual. Poison takes 1/8. Tox adds one stage per residual up to 15, and damage per residual is max(1, maxHP/16) times the stage. Switching in resets tox to stage 0. The residual order follows the sort in sim/battle.ts lines 398-410: order low to high (default last), then priority, then speed, then sub-order, then effect order.

Paralysis: 1 in 4 chance per move attempt to be unable to move (randomChance(1, 4), data/conditions.ts lines 20-46). Speed is halved (floor of the speed times 50 percent) unless the unit has Quick Feet. Frozen: 1 in 5 chance per turn to thaw (randomChance(1, 5)). A fire-type damaging hit thaws it, and defrost moves thaw it.

Burn: physical damage is halved (sim/battle-actions.ts line 1803), except for Guts and, from gen 6, Facade.

Stat stages: boosts are clamped to -6 to +6 (sim/pokemon.ts getCappedBoost, line 1210). The stat multiplier table is 1, 1.5, 2, 2.5, 3, 3.5, 4 for +0 to +6, with the reciprocal for negative stages (lines 583-590). A boost already at -6 is still routed through the unboost message path (battle.ts around line 2046); the cap itself, which keeps it at -6, was not traced further.

Flinch: duration 1. Its onBeforeMove (data/conditions.ts lines 198-206, priority 8) cancels the unit's move if it is still set to act, and the duration ends it after the turn. Inner Focus blocks it: data/abilities.ts innerfocus onTryAddVolatile returns null for flinch (line 2155).

Immunities are stacked hooks, not a table. data/abilities.ts has 28 lines that hook SetStatus, TryAddVolatile, AfterSetStatus or Immunity, across these ability keys: insomnia, immunity, limber, vitalspirit, leafguard, waterveil, waterbubble, purifyingsalt, pastelveil, shieldsdown, comatose, thermalexchange, synchronize and others. I read only two of them: Insomnia (line 2176) blocks sleep from any source, with a message only for status moves and Yawn, and also blocks Yawn's delayed sleep. Synchronize (line 4860) is a reflect rule: when a different Pokemon's move or ability sets a status on this unit, the same status is tried back on the source, except sleep, freeze, and effects from Toxic Spikes. The other ability hooks were not read beyond their keys.

Terrain immunity is grounded-only: Electric Terrain (data/moves.ts line 4516) blocks sleep on grounded targets from any source, with a message only for Yawn and for status moves without secondary effects. Misty Terrain (line 12170) blocks every status on grounded targets, with a message only when the cause is a status move or Yawn, and blocks confusion from any source on grounded targets (line 12177). Safeguard (line 15594) was seen only as a hook pair and was not read in detail.

Message text: data/text/default.ts (lines 199-258) holds the start, already-started, end, damage and cant lines for brn, frz, par, psn, tox, slp, confusion and flinch. data/text/names.ts (lines 97-104) holds 8 display names (brn, par, slp, frz, psn, tox, fnt, confusion). I quote nothing from these.

Protocol the client would receive (sim/SIM-PROTOCOL.md): -status (line 357), -curestatus (361), -start and -end (456, 462), -activate (558), cant with a reason (298). The client is not in this tree.

## 4. For Frankendom

- Shape map: this donor is turn-based, so its timing numbers do not transfer directly. Keep the rules, convert the durations to ms or to our tick.
- Server-verified: Smogon is deterministic and seeded (prng.ts). That matches our one-ledger, server-verified shape: the same rules run on the server, and the client gets an event line.
- Many-vs-one, max 3 attackers: one major status per target at a time (Smogon's exclusivity) prevents a three-attacker pile-up of control. Smogon has no per-attacker DoT stacks (psn is one status, tox is a turn counter), so the stack cap is our own rule: the attacker count (3). Smogon's tox counter is the pattern for escalation. Use one volatile per control kind, with the first one winning, like Smogon's confusion.
- 700 zones as data: Smogon's terrains are the pattern for zone-level immunity: a zone tag (grounded or not) decides whether a status can land. Keep it as zone data.
- 100 Pit characters: immunities as hooks per character (Smogon's ability hooks) are a reuse pattern: one character, one or two hooks, not a new engine per character.
- What to keep: exclusivity of major statuses, first-wins volatiles, the one-line "cant" beat with its reason, the escalating tox counter, the 1-in-4 paralysis skip plus halved speed, stat stages clamped at -6 and +6 with a readable "cannot go lower" beat.
- What to change: the donor has no real-time duration or cadence, no animation and no sound. Our fast duels need a time-left value on the client, which this donor does not send (it sends only the status line).

## 5. A 5-minute look test Dom can judge on his phone

Build one text beat strip at 375 wide, one line per beat, on a fixed row under the target. Two variants:

- A: the donor's wording pattern: "X is paralyzed! It can't move!" as a line that stays for one second.
- B: the same event as a short badge plus a skipped-action tick on the unit card, with no text.

Show a paralysis skip, then a tox counter going 1, 2, 3. Dom judges which one he reads in one second mid-fight at 375 wide. Use our own wording, not the donor's.

## 6. Licence and IP

- Code: MIT (LICENSE). Code can be copied with the MIT notice. Recorded donor values are allowed under the MIT rule.
- Content: the Pokemon species, moves and names are game IP owned by others. The message text in data/text is donor text. Do not copy it. Inspiration: category-level only, e.g. "one major status at a time per target", "an escalating poison counter", "a one-in-four skip with a halved speed stat". Recreate with our own wording and names. Name the trait kept and the trait changed.
- The mechanics numbers (1/16, 1/8, 1-in-4, 1-in-5, the stage table) are game rules. Record them as tunable data fields with the donor value, and do not claim they are original to the donor or to any game.
- No legal conclusions.

## 7. Gaps

- Not read: sim/dex-conditions.ts (709 lines); the move-level status chances in data/moves.ts (only the terrain and status hook lines); data/items.ts status hooks (line 3545 seen only in grep); the Safeguard body (line 15594); the rest of data/conditions.ts after line 330 except lines 364-380 and the key list; data/mods (47 mods, not read); data/text other languages; test/ and tools/.
- Client: not in this tree. The client half is "not in the half I read". Nothing is claimed about the client.
- Half read: server and data (both read at rule level, not every file).
- No donor audit or catalogue exists for this donor under AU or DC in the batch folder (grepped, none found).
- No receipts.tsv written for this note.
