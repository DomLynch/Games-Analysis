```

## 5. Lands in

- TARGET `src/fight/xp-award.ts` (new module: the kill split and the grant, one ledger; the Pit and zones are clients). Parity-checklist row 18 (loot roll and XP award), sub-line: the XP award is computed once, server side, from the verified damage ledger, and the camp counter is stored on the NPC instance.
- Zone data: the dungeon camp multiplier (1.20) is per zone, so it belongs in zone data; the other numbers are engine constants.
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: one ledger (one award per gainer per kill, computed once) and server-verified kills (the server holds the damage ledger; the client never sends an award).

## 6. Gaps and risks

- Licence GPL-2.0: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- The camp counter decays once per gainer (line 1257 inside the loop from 1111). A four-person kill therefore drains the counter four times. Frankendom should step it once per kill and test that.
- Grouped gainers get the full NPC value (line 1189), not their damage share. With the group bonus (1310) a group can be paid more than the NPC is worth, up to the 125% cap plus 12.5% per member. Frankendom must choose this on purpose; the default in the sketch follows the donor.
- Server-verified: the donor trusts the in-process damage map (`XPGainers`). Frankendom must build the damage ledger from server-verified hits and award once; the award must not depend on any client report.
- Zones as data: the 125% cap, the 0.55 camp bonus, the 0.05 decay and the 1800000 ms window are server properties in the donor (ServerProperties.cs); Frankendom makes them engine constants, and only the dungeon multiplier is zone data.
- One level per gain call: the donor raises at most one level per call (line 4994-4996), and its own trainer uses a zero-XP call to catch up (GameTrainer.cs 154). Frankendom should compute all level-ups from one XP write, not rely on repeated calls.
- The floor (4940-4950) makes a loss stop at the current level's start. That is a rule to keep, but it is applied after the event in the donor, so any listener sees the pre-floor value. Frankendom's ledger should write the floored amount only.
- Not read: `OnLivingKilled` (player kills, 1335-1465), `ZoneBonus.GetXPBonus`, the outpost constants against their defaults, the death XP setter, and `OnLevelSecondStage` in full. The player-kill rules may differ from what is written here.
- MAX_ATTACKERS = 3 has no direct counterpart here; the damage ledger here is unbounded, so Frankendom's cap on attackers must be applied before the split.

