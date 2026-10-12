# Open-RSC-Core-Framework (pvp-ranking-seasons-matchmaking, cell 1)

Donor: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Player.java` | Licence: GNU AGPL v3 (as read: LICENSE line 1 "GNU AFFERO GENERAL PUBLIC LICENSE", Version 3) | Java | symbol `Player.checkAttack`

Checked: Symbol `Player.checkAttack` at Player.java 872 (read in full, 872-935), base `Mob.checkAttack` at Mob.java 830-872 (read in full), `Point.wildernessLevel` at Point.java 372-380 (read), `canBeReattacked` at Player.java 4552-4554 (read), `PVP_REATTACK_TIMER` default at ServerConfiguration.java 494 (read). Callers: one caller read (AttackHandler.java 112-124); RangeEvent.java 79, ThrowingEvent.java 85, SpellHandler.java 1392/1396 are missile callers and were NOT read beyond the grep line. Searched the whole server tree for ranking, Elo, Glicko, rating, season, bracket, leaderboard, tournament, matchmaking, hiscore: no ranking, rating, season, bracket, tournament or matchmaking queue exists in server/src (hits were staff-rank and clan-rank text only). So this donor covers only the level-gap eligibility part of the topic. Confidence: medium that STRONG is right, because the gate is real and checkable, but it is not Elo, seasons or brackets. Not read: Duel.java, the Lumbridge and banker branches' surroundings beyond line 901, and the tick length in ms (ticks are the unit used).

## 1. Mechanism

- One eligibility gate answers "may attacker A start or continue an attack on victim V?". It returns a boolean and changes no state. It runs when the walk-to action arrives (AttackHandler.java 120 calls `checkAttack(mob, false)` inside `executeInternal`), so a player who walks in can be refused at arrival.
- Player version, order of steps (Player.java 872-935):
  (a) Party block: same non-null party refuses with "You can't attack your party members" (876).
  (b) Duel bypass: if both are in combat, both duels are active and each is the other's opponent, return true at once (879-883). This skips the band and the cooldown below.
  (c) Reattack cooldown: unless the attack is a missile, the victim must pass `canBeReattacked()` (886). That is true when `ranAwayTimer + PVP_REATTACK_TIMER <= current tick` (4553). The timer defaults to 5 (ServerConfiguration.java 494).
  (d) Mode switch on the global flag `USES_PK_MODE` (891, set at ServerConfiguration.java 541).
  (d1) PK mode (891-909): both players must have `pk_mode` non-zero (892). Before the gap test, two more refusals run: either player inside the Lumbridge starting chunk (895-898) and a banker NPC within 5 tiles of the attacker (899-901). Combat level gap must be at most 5 (902). The gaps in ATTACK, DEFENSE and STRENGTH max stats must each be at most 10 (903-905). A TODO says hits are not checked (906). The message on refusal is at 907. The depth mode has no safe-area or banker rule, only the depth test.
  (d2) Depth mode, the else branch (910-928): both sides' `wildernessLevel()` must be at least 1 (913). The combat-level gap must be at most the attacker's depth (918) AND at most the victim's depth (923). A refusal sends two messages (919-920 and 924-925 region, not receipted).
  (e) Invulnerable or invisible victim refused (930), then return true.
- Depth value: `wildernessLevel()` (Point.java 372-380) computes `wild = 2203 - (y + (1776 - (944 * Formulae.getHeight(this))))` (373). It is forced to -50 when `x + 2304 >= 2640` (374). If `wild > 0` the depth is `1 + wild / 6` (377-378, integer division), else 0. So depth is a tile-based number, zero outside PvP ground.
- Base version (Mob.java 830-872, used when the attacker is not the Player override): it has no party, duel or PK-mode branch. It checks the reattack gate for Player victims (839), the depth >= 1 test (846), and the gap against the attacker depth (851) and the victim depth (856). For an NPC victim it returns `victim.getDef().isAttackable()` (865-871 region). Its refusal messages are commented out.

## 2. Key functions

- `Player.checkAttack`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Player.java` 872-935 (read in full). Party, duel bypass, reattack, PK-mode band, depth band, invulnerability.
- `Mob.checkAttack` (base): `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/Mob.java` 830-872. Depth band only.
- `Player.canBeReattacked`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/entity/player/Player.java` 4552-4554.
- `Point.wildernessLevel`: `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/model/Point.java` 372-380.
- Caller (one read): `/mnt/frankendom-donors/Open-RSC-Core-Framework/server/src/com/openrsc/server/net/rsc/handlers/AttackHandler.java` 112-124.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Mutual consent flag: both sides must opt in before a fight is allowed | `pk_mode` non-zero on both (theirs, Player.java 892); default 0 (Player.java 558-560, not receipted) |
| Two-sided level-gap band: |level A - level B| must fit BOTH sides' limits | Opt-in mode: gap 5 (theirs, Player.java 902). Depth mode: limit is the tile depth `1 + wild/6` (theirs, Point.java 378) |
| Per-stat secondary band in opt-in mode | Max-stat gap 10 for ATTACK, DEFENSE, STRENGTH (theirs, Player.java 903-905); hits not included (theirs, TODO 906) |
| Cooldown after running away | `PVP_REATTACK_TIMER` default 5 ticks (theirs, ServerConfiguration.java 494); tick length not read |
| Duel exemption: active mutual duel skips band and cooldown | None (rule, Player.java 879-883) |
| Depth from position | Constants 2203, 1776, 944, 2304, 2640, 6 (theirs, Point.java 373, 374, 378) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (party, duel bypass, reattack cooldown, then the mode branch) and returns a reason string for each refusal, which the donor does not do. It merges the two modes into one function with the mode as a parameter, which the donor does with a global flag. It models the Lumbridge-chunk and banker-radius refusals as one `inSafeArea` flag from zone data. It replaces the position formula with a `depth` field supplied by zone data, and it omits the stat-gap TODO, the invulnerable and invisible check, the NPC branch, and the missile-only path beyond skipping the cooldown.

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described rule, not a translation of the donor lines.
// clean-room
type Mode = "optin-band" | "depth-band";

interface Fighter {
  id: string;
  combatLevel: number;
  maxAttack: number;
  maxDefense: number;
  maxStrength: number;
  depth: number;            // PvP depth at the fighter's tile, from zone data (0 = no PvP here)
  pvpOptIn: boolean;        // mutual opt-in flag
  inSafeArea: boolean;      // zone data: start chunk or hub (donor: Lumbridge chunk and banker radius)
  partyId: string | null;
  duelOpponentId: string | null;
  ranAwayTick: number;      // tick the victim last ran away
}

type Check = { ok: true } | { ok: false; reason: string };

const OPTIN_LEVEL_GAP = 5;    // donor constant for the opt-in mode
const OPTIN_STAT_GAP = 10;    // donor constant, applied to attack, defence and strength
const REATTACK_TICKS = 5;     // donor default for the reattack cooldown

function canEngage(a: Fighter, v: Fighter, tick: number, missile: boolean, mode: Mode): Check {
  if (a.partyId !== null && a.partyId === v.partyId) return { ok: false, reason: "same party" };
  // Active mutual duel: bypass the band and the cooldown (duel is its own arena).
  if (a.duelOpponentId === v.id && v.duelOpponentId === a.id) return { ok: true };
  if (!missile && v.ranAwayTick + REATTACK_TICKS > tick) return { ok: false, reason: "reattack cooldown" };

  if (mode === "optin-band") {
    if (!a.pvpOptIn || !v.pvpOptIn) return { ok: false, reason: "not opted in" };
    if (a.inSafeArea || v.inSafeArea) return { ok: false, reason: "safe area" };
    const levelGap = Math.abs(a.combatLevel - v.combatLevel);
    if (levelGap > OPTIN_LEVEL_GAP) return { ok: false, reason: `level gap ${levelGap} > ${OPTIN_LEVEL_GAP}` };
    const statGap = Math.max(
      Math.abs(a.maxAttack - v.maxAttack),
      Math.abs(a.maxDefense - v.maxDefense),
      Math.abs(a.maxStrength - v.maxStrength),
    );
    if (statGap > OPTIN_STAT_GAP) return { ok: false, reason: `stat gap ${statGap} > ${OPTIN_STAT_GAP}` };
    return { ok: true };
  }

  // Depth band: both must stand on PvP ground, and the level gap must fit BOTH depths.
  if (a.depth < 1 || v.depth < 1) return { ok: false, reason: "no PvP ground" };
  const gap = Math.abs(a.combatLevel - v.combatLevel);
  if (gap > a.depth) return { ok: false, reason: `level gap ${gap} > band ${a.depth}` };
  if (gap > v.depth) return { ok: false, reason: `level gap ${gap} > band ${v.depth}` };
  return { ok: true };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/pv002-open-rsc-engage.ts): exit 0, no output.

## 5. Lands in

- TARGET `src/fight/engage.ts` (new module, one engage gate). Parity-checklist row 1 (duel step / sim): engage is a state change, so the gate runs in the server's duel step and only then starts the fight. Frankendom's current engage code: (not read).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room, shape only; no donor lines)
- Brief rule served: 1 (one combat core, two clients). The gate runs on the server, which serves the server-verified-kills ruling. Rules 7-9 n/a.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the described rule.
- No ranking in this donor: no Elo, Glicko, rating, season, bracket, tournament, matchmaking queue, ping logic or leaderboard was found in server/src. Rank floors, season resets and ranked matchmaking must come from another donor. This note covers eligibility only.
- Two rule sets in one function: the opt-in band (Player.java 891-909) and the depth band (910-928) differ, and the opt-in branch never checks depth. Fix: one `canEngage` with the mode as zone data, as the sketch does.
- Defect (opaque depth): depth comes from a hard-coded position formula with magic numbers and integer division (Point.java 373, 378). Fix: store the depth per zone tile band as zone data; do not port the formula.
- Defect (incomplete stat band): the opt-in band checks only ATTACK, DEFENSE and STRENGTH max stats and the TODO at 906 says hits are not checked. Fix: list the compared stats explicitly in zone data and include hits, or document why not.
- Defect (silent base path): the base `Mob.checkAttack` has its refusal messages commented out (Mob.java around 847-858), so the NPC-side path refuses without telling the player why. Fix: return a reason, as the sketch does.
- Also found: the opt-in branch refuses in the Lumbridge start chunk and near a banker (Player.java 895-901), a safe-area rule that fits a town or hub flag.
- Duel exemption returns true before the band and the cooldown. Frankendom must tie the bypass to a duel the server created, never to a client claim.
- The mode is one global server flag (ServerConfiguration.java 541). Frankendom needs it per zone.
- Only one caller read (AttackHandler.java 120). Missile callers (RangeEvent, ThrowingEvent, SpellHandler) were not read, so the missile path is described from the flag only.

Best transferable idea: one server-side engage check that returns a reason, combining a mutual opt-in flag, a two-sided level-gap band that scales with the zone's danger depth, a reattack cooldown and a duel exemption.
Decision (proposed): adapt - the gate shape (mutual flag, two-sided band, reason string) fits our open PvP flag and server-verified engage; the band comes from zone data and both modes go into one function, while the position formula and the donor constants are not taken as they are.
Acceptance: two open-PvP fighters whose level gap is 7 in a zone with band 6 are refused by the server with the reason "level gap 7 > band 6" shown in the HUD, and the same pair engage once that zone's band is 8 (the test sets the depth of BOTH fighters to the same band, since the gate needs the gap within each side's depth, and checks the exact reason string, which is `level gap <gap> > band <depth>` for whichever side's depth fails first, attacker first); a server test asserts both outcomes and that an active mutual duel ignores the band. In the donor the duel bypass also needs both sides in combat with active duels; the sketch simplifies this to a server-created duel link.

Reuse tag: rewrite-from-idea (GNU AGPL-3.0; clean-room, shape only)
Brief rule served: 1 (one engine: the gate runs in the server's engage step; the client only shows the reason)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Donor claims check out: Player.checkAttack 872-935 order (party 875, duel bypass 879-884, reattack 885-889, USES_PK_MODE 891, pk gap 5 and stat gaps 10 at 902-905, TODO 906, depth branch 910-928, invuln/invis 930); Mob.checkAttack 830-875 (duel bypass commented out 832-837, messages commented out); Point.wildernessLevel 372-380; canBeReattacked 4552-4554; PVP_REATTACK_TIMER 5 (ServerConfiguration 494), USES_PK_MODE default false (541); pk_mode default 0 (Player 558-560); AttackHandler.java:120 caller; no ranking/season/matchmaking code (grep for highscore/ladder/tournament hits only unrelated files). Errors: 1) Note says PK-mode refusal is 'message at 907' and omits two further refusals inside the PK branch that it does list as unread: Lumbridge starting chunk (895-898) and banker within 5 tiles (899-901) - disclosed in the Checked line but the Mechanism text presents 891-909 as complete. 2) Duel bypass in the donor needs inCombat() on BOTH sides plus isDuelActive and victim.equals(getOpponent()); sketch reduces this to duelOpponentId equality (acceptable simplification, flagged 'simplified'). 3) ACCEPTANCE vs SKETCH MISMATCH (would make a correct build fail its own test): Acceptance expects the refusal reason 'level gap 7 > band 6'; the sketch emits `level gap ${gap} > your band ${a.depth}` / `> their band ${v.depth}` (and 'level gap N > 5' in opt-in mode), so a build copied from the sketch returns 'level gap 7 > your band 6' and fails a string-equality assertion. Pick one string (or assert on a reason code). 4) Acceptance 'band 6 refused, band 8 engages' is consistent with the depth-mode logic only if BOTH fighters stand in zones with depth >= gap; the test must set both depths.
Missed: Nothing structural: donor really has no ranking. Missed (minor): Player.java 891 PK-mode branch also blocks near bankers and in the Lumbridge start chunk (a safe-zone rule transferable to Frankendom's town/hub); Mob.checkAttack for NPC victims returns victim.getDef().isAttackable().

Fixed 2026-10-12 (Sonnet fixer): verified at Player.java 872-935 that the PK branch has the Lumbridge and banker refusals (895-901), now in mechanism, sketch (inSafeArea) and an Also-found line; reason strings in the sketch now match the acceptance exactly (`level gap 7 > band 6`); acceptance now says both depths must be set and what the reason string is; noted the donor duel bypass needs both sides in combat. Sketch retypechecked.
