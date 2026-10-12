# l1j-en-classic (reputation-factions-crime-justice, cell 3)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1PcInstance.java` (death runnable, class `Death`, lines 194-503) with `model/L1PinkName.java`, `model/L1Karma.java`, `utils/CalcExp.java`, `model/Instance/L1GuardInstance.java`, `model/Instance/L1MonsterInstance.java` | Licence: GPL-2.0 (repo `COPYING`: GNU GPL version 2, June 1991; `L1Karma.java` header: "version 2, or (at your option) any later version"; `L1PinkName.java` has no header) | Java | symbol `L1PinkName.PinkNameTimer`, `L1PcInstance.Death.run`, `L1PcInstance.isWanted`, `L1GuardInstance.searchTarget`, `L1Karma.getLevel`

Checked: read in full: `L1PinkName.java` (1-137), `L1Karma.java` (1-85). Read by range: `L1PcInstance.java` 330-520 (the death runnable, including the gates at 365-384 and the duel return at 391-397), 1213-1232, 2054-2058, 2086-2095, 2222-2230, 2322-2332, 2415-2424, 3050-3052, 3462-3487; `L1GuardInstance.java` 78-112 (search and set-target); `L1Character.java` 1003-1018; `CalcExp.java` 508-540; `L1MonsterInstance.java` 580-593; `JailController.java` 1-60 and grep for `run` (149). Config defaults read by grep (`server.properties` 177, 184; `altsettings.properties` 203, 206). Not read: the rest of the death runnable (194-330: database writes and war or castle branches), `castleWarResult`, `simWarResult`, `caoPenaltyResult`'s item choice (`CaoPenalty()`), `beginHell` (1075), `setLastPk` bodies (2965-2971, grep only), `L1GuardianInstance` 190 and 312, `C_NPCAction` 1058-1066 (grep only), the jail controller body (149-201), `CHAO_PINK` and `DUAL_PINK` code paths in `Config.java` (grep only). Confidence: high on the pink timer, the death drop formula, the PK kill ledger, the 24-hour wanted state and the guard target rule (all read). Medium on which karma path runs for a monster kill (both were read, the caller that runs both was not). Licence GPL-2.0: clean-room, shape only.

Best transferable idea: one alignment number from -32768 to 32767 decides the death item-loss chance (12.8% at 0, 52% at the bottom, zero near 32000), a PK kill pushes the killer's number at least 1000 lower, and a hostile act marks the attacker pink for a window that a repeat act only refreshes near its end.
Decision (proposed): adapt — keep one lawful number as the single alignment ledger, the 180-second pink window (as a server end-stamp, not a counter), the PK count and the 24-hour wanted state, and the lawful-scaled death drop; reject the karma level ladder for now (display only) and the chaotic double-rate until Lead wants a second alignment track.
Acceptance: a player who kills a lawful, non-pink player gets a PK count and a 24-hour Wanted mark and a visible guard target; a server test asserts killer lawful falls by at least 1000 per PK kill and stops at -32768, pink ends at a server time stamp 180 s after the last hostile act (a repeat act within the last 90 s resets it to 180 s), and a victim at lawful 0 has a 12.8% per-death roll for item loss.

## 1. Mechanism

- One number per player: `_lawful`, clamped to -32768..32767 on add (`L1Character.java` 1015-1017). Below zero is chaotic. It moves on monster kills (`CalcExp.java` 523-529) and on player kills (below).
- Pink window (`L1PinkName.java`). A hostile act by a player on a player starts a pink timer on the attacker. Gates in `onAction` (106-111): victim lawful is zero or above; victim not already pink (unless `DualPink`); attacker lawful zero or above (unless `ChaoPink`); both in a normal zone; no castle war. If there is no timer, one starts at 180 (`_secondsLeft = 180`, 27). If a timer exists and 90 s or less are left, it resets to 180 (117-119, 74). The timer thread decrements once per loop and sleeps 1000 ms per pass (39-42), so the window is a counter, not a deadline. It ends early when the attacker dies while not pink, or when the attacker turns chaotic (52-55; `ChaoPink` off).
- Death (`L1PcInstance.Death.run`, from 382). Gates first: a victim in a non-normal zone, hit by a player who is not in a war area, returns (365-374); a sim-war result returns (376-379); a duel partner returns (391-397); if the map has no death penalty, return (382-384). Then:
  1. Guard killer: the victim's PK count drops by one and last PK is cleared (406-411).
  2. Item-loss roll (419-438). `lostRate = trunc(((lawful + 32768) / 1000 - 65) * 4)`. If it is negative, take its magnitude and double it when lawful is below zero (422-424). Roll `1..1000` (425). If roll is at or under the rate, drop items: count 1 by default; 1-2 at -10000 and below; 1-3 at -20000 and below; 1-4 at -30000 and below (428-436). Items go to the floor through `caoPenaltyResult` (437, 3462-3473).
  3. PK kill (449-489). Only if the victim is lawful (zero or above) and not pink. If the killer's lawful is under 30000, the killer's PK count rises by one and last PK is stamped (451-459). Then the killer's lawful is set to `min(floor, lawful - 1000)`, clamped at -32768 (465-479), where `floor = -4 * level^2` below level 50 and `-0.08 * level^3` at 50 and above (467-471). Hell warning at 5 PKs and hell at 10 (483-489), only when the PK count rose.
  4. Otherwise (victim pink or chaotic): the victim's pink clears (490-491).
- Wanted: `isWanted()` is true for 24 hours after the last stamp (2086-2095). It expires on read (clears the stamp at 2090).
- Guards. A visible guard searches for players (`L1GuardInstance.searchTarget`, 81-104): it adds and targets any visible, living, non-GM player who is `isWanted()` (94-100), unless the guard is a castle guard and the player holds that castle. When a pink player damages a player, every visible guard is told to target the attacker (2327-2331; the same pattern at 2419-2424).
- Karma (`L1Karma`): a separate counter, -15.5M to 15.5M. Gained on kills (`CalcExp.AddExp` 531-533; `L1MonsterInstance.giveKarma` 586-592; `L1GuardianInstance` 312). Level is 1 to 8 per sign (thresholds 10000, 20000, 100000, 500000, 1.5M, 3M, 5M, 10M), and the percent to the next level uses the ninth threshold (15.5M) as the top (`getPercent`, 82-83).
- Order for one death: zone and war gates → duel gate → map gate → guard PK count reset → item-loss roll → PK kill and lawful drop → pink clears on a pink or chaotic victim.

## 2. Key functions

- Death runnable (gates, item loss, PK ledger): `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1PcInstance.java` 194 (class), 365-491.
- Pink timer and gate: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1PinkName.java` 25-80 (timer), 82-122 (`onAction`), 124-132 (`broadcastPink`).
- `isWanted()`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1PcInstance.java` 2086-2095.
- Guard target search: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1GuardInstance.java` 81-111.
- Karma level and percent: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Karma.java` 31-84.
- Kill lawful and karma grant (player kill path is the death runnable above; monster kill path here): `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/utils/CalcExp.java` 513-533.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (value, where it is) |
|---|---|
| Pink window length | 180 s (`L1PinkName.java` 27, 74) |
| Refresh only in the last part of the window | at 90 s or less left (`L1PinkName.java` 117) |
| Death item-loss rate per mille | `((lawful + 32768)/1000 - 65) * 4`, magnitude, doubled below zero (`L1PcInstance.java` 419-423). Examples: lawful 0 gives 128 (12.8%); lawful -10000 gives 336 (33.6%); lawful -20000 gives 416 (41.6%); lawful -32768 gives 520 (52%); from about 31983 up the rate is zero |
| Item-loss count bands | 1 by default; 1-2 at -10000; 1-3 at -20000; 1-4 at -30000 (`L1PcInstance.java` 428-436) |
| PK kill lawful drop | at least 1000 below the current value (`L1PcInstance.java` 472-473) |
| PK kill lawful floor | `-4 * level^2` below 50; `-0.08 * level^3` at 50 and above (467-471) |
| Lawful clamp | -32768 (476-477); range -32768..32767 (`L1Character.java` 1017) |
| PK count only if killer lawful under 30000 | 30000 (`L1PcInstance.java` 451) |
| Wanted length | 24 h (`L1PcInstance.java` 2089) |
| Hell warning and hell PK counts | 5 and 10 (`config/altsettings.properties` 206, 203) |
| Karma level thresholds | 10000, 20000, 100000, 500000, 1.5M, 3M, 5M, 10M (`L1Karma.java` 24-25) |
| Karma gain multiplier | x5 when aligned (`CalcExp.java` 533) or when signs differ (`L1MonsterInstance.java` 589-590): see defect 4 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for a death: the item-loss roll runs before the PK ledger, and the PK ledger runs only for a lawful, non-pink victim. It changes the pink counter into a server end-stamp (defect 1). It omits the zone and war gates and the duel and sim-war returns (listed in section 1), the pet and summon master attribution (`getAttackingPlayer`), elf PK counts, the hell mode, the damage-over-time and reload effects, the `CHAO_PINK` and `DUAL_PINK` switches (both off, as the config default), the guard hate-list call, the item choice (`CaoPenalty()`), and all packets. The sketch treats the map death-penalty flag as an input and the normal-zone check as an input on the pink path only.

```ts
// Licence: GPL-2.0 (donor, repo COPYING). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const LAWFUL_MIN = -32768;
const LAWFUL_MAX = 32767;
const PINK_S = 180;            // pink-name window after a hostile act
const PINK_REFRESH_S = 90;     // a new hostile act refreshes the window only at or below this many seconds left
const WANTED_MS = 24 * 3600 * 1000;

interface Pc {
  id: string;
  level: number;
  lawful: number;
  pkCount: number;
  pinkUntil: number | null;    // ms timestamp (fixed: donor counts seconds in a loop)
  lastPkAt: number | null;     // ms timestamp of the last PK kill
  inNormalZone: boolean;
  mapDeathPenalty: boolean;    // read from the map on the donor
}

const clampLawful = (v: number): number => Math.max(LAWFUL_MIN, Math.min(LAWFUL_MAX, v));
const isPink = (p: Pc, now: number): boolean => p.pinkUntil !== null && p.pinkUntil > now;

// Hostile act on a player: the attacker goes pink. A repeat act refreshes only at or below 90 s left.
function onHostileAct(attacker: Pc, victim: Pc, now: number): void {
  if (attacker.id === victim.id) return;
  if (victim.lawful < 0 || attacker.lawful < 0) return;   // chaotic on either side: no pink (CHAO_PINK off)
  if (isPink(victim, now)) return;                        // a pink victim gets no new pink (DUAL_PINK off)
  if (!victim.inNormalZone || !attacker.inNormalZone) return;
  const active = isPink(attacker, now);
  if (!active || attacker.pinkUntil! - now <= PINK_REFRESH_S * 1000) {
    attacker.pinkUntil = now + PINK_S * 1000;
  }
}

// Death of a victim. Returns the number of inventory items the ledger says to drop.
function onDeath(victim: Pc, killer: Pc | null, rng: () => number, now: number): number {
  if (!victim.mapDeathPenalty || !killer || killer.id === victim.id) return 0;

  // Lawful-scaled drop: rate in per mille, doubled when chaotic.
  let lostRate = Math.trunc(((victim.lawful + 32768) / 1000 - 65) * 4);
  let drops = 0;
  if (lostRate < 0) {
    lostRate = -lostRate;
    if (victim.lawful < 0) lostRate *= 2;
    const roll = 1 + Math.floor(rng() * 1000);
    if (roll <= lostRate) {
      if (victim.lawful <= -30000) drops = 1 + Math.floor(rng() * 4);
      else if (victim.lawful <= -20000) drops = 1 + Math.floor(rng() * 3);
      else if (victim.lawful <= -10000) drops = 1 + Math.floor(rng() * 2);
      else drops = 1;
    }
  }

  if (victim.lawful >= 0 && !isPink(victim, now)) {
    // PK kill: count it if the killer is not very lawful, then set killer lawful to the level floor
    // or 1000 below the current value, whichever is lower.
    if (killer.lawful < 30000) {
      killer.pkCount += 1;
      killer.lastPkAt = now;
    }
    const levelFloor = killer.level < 50 ? -4 * killer.level ** 2 : -0.08 * killer.level ** 3;
    killer.lawful = clampLawful(Math.min(Math.trunc(levelFloor), killer.lawful - 1000));
  } else {
    victim.pinkUntil = null;   // a pink or chaotic victim is not a PK victim; the pink clears
  }
  return drops;
}

// Wanted: a PK kill in the last 24 h. Expires on read, as the donor does.
function isWanted(p: Pc, now: number): boolean {
  if (p.lastPkAt === null) return false;
  if (now - p.lastPkAt > WANTED_MS) { p.lastPkAt = null; return false; }
  return true;
}

// Karma ladder: eight levels per sign (the donor's ninth threshold is only the percent ceiling).
const KARMA_STEPS = [10000, 20000, 100000, 500000, 1500000, 3000000, 5000000, 10000000];

function karmaLevel(k: number): number {
  const mag = Math.abs(k);
  let lvl = 0;
  for (const step of KARMA_STEPS) {
    if (mag >= step) lvl++; else break;
  }
  return k < 0 ? -lvl : lvl;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/rf003-l1j-lawful.ts) exited 0.

## 5. Lands in

- TARGET `src/fight/hostile-flag.ts` (the same module as cell 1, shared PvP flag): the pink window, the PK count and the lawful number are one engine state. The guard reaction is a client-visible consequence of the server state.
- Parity-checklist row 17 (death/respawn): the death item-loss roll and the PK kill are death rules. The hint was row 21 (catalogue fields); the data fields go in the catalogue, the rule is row 17.
- today: no hostile-flag module found in this session's reading (not checked in Frankendom's repo).
- Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
- Brief rule served: 1 (one ledger: the lawful number and the PK state live on the server); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism; no class or message names are carried over.
- Defect 1, the pink window is a counter, not a deadline: `_secondsLeft` is decremented once per loop, and each pass sleeps 1000 ms (`L1PinkName.java` 39-42). Loop overhead and sleep drift make the window longer than 180 s of wall time. fix: store `pinkUntil` as a server timestamp and check it on each tick (the sketch does this).
- Defect 2, unsynchronized timer field: `onAction` checks `_timer == null` (112) and then calls `_timer.getSecondsLeft()` (117). The timer thread sets `_parent._timer = null` when it stops (`L1PinkName.java` 70). If the timer stops between those two reads, the second read can fail. Not run; the field is not volatile and not locked. fix: take one local reference, or do the check and the reset inside a lock, and make the pink state a timestamp so no thread is needed.
- Defect 3, a getter that writes: `isWanted()` clears the stamp when it expires (2090). A read is a write. fix: a pure check, plus a periodic sweep if the stamp needs clearing.
- Defect 4, two karma rules: `CalcExp.AddExp` gives x5 when the monster's karma has the same sign as the player's karma (531-533). `L1MonsterInstance.giveKarma` gives x5 when the signs differ, and compares against the karma level sign rather than the raw karma (589-590). Which path runs for a monster kill was not read; if both run, karma is granted twice. fix: one rule (same sign, raw karma) in one place; test it.
- Defect 5, PK stamp is gated on killer lawful: the last-PK stamp and PK count are set only when the killer's lawful is under 30000 (451-458), but the lawful drop applies to every PK kill (465-479). A very lawful killer therefore gets the drop without the wanted state. This may be intended; it should be a named rule, not an accident. fix: name the threshold as data and test both sides.
- Defect 6, lawful is written as an absolute value: `player.setLawful(lawful)` (479) sets the number to the computed floor or to `lawful - 1000`, not to a delta. The "at least 1000 lower" rule holds, but the design reads like a delta. fix: write the rule as `min(floor, current - 1000)` in the code and in the data table.
- Scope: this donor's death penalty is gated by the map flag (382-384). That is zone data, which fits "zones as data" in Frankendom. The duel, sim-war and castle-war returns are engine rules we would need to decide on (duels are not in the Frankendom rulings).
- Guards: the donor's guards hunt any wanted player for 24 h (`L1GuardInstance.java` 94-100), and a pink attacker pulls every visible guard onto them. Frankendom has guard spawns in zone rows; the 24-hour hunt is a data field, not a constant.
- Jail: `JailController` holds a release time per player and teleports on release (149-171). The body was only grepped; the sentence length and the jail rule are not in this note.
- Not read: the rest of the death runnable (194-330), `beginHell`, `caoPenaltyResult`'s item choice, the `CHAO_PINK` and `DUAL_PINK` code paths.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only)
Brief rule served: 1 (one ledger: the lawful number and the PK state live on the server); rules 7-9 n/a
