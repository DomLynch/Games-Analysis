# coding-horror-basic-computer-games (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/coding-horror-basic-computer-games/15_Boxing/csharp/AttackStrategy.cs` (with `OpponentAttackStrategy.cs`, `PlayerAttackStrategy.cs`, `Round.cs`, `Boxer.cs`, `Program.cs`) | Licence: Unlicense, a public-domain dedication (repo `LICENSE` lines 1-3: "free and unencumbered software released into the public domain") | C# port of the 1978 BASIC `15_Boxing/boxing.bas` (also Java and JS ports in the same folder) | symbols `AttackStrategy.Attack`, `RegisterKnockout`, `Round.CheckRoundWinner`, `OpponentAttackStrategy.ScoreFullSwing`

Checked: category_no 13 (vfx-blood-finishers), camera_scope not applicable. Read in full: the C# files `AttackStrategy.cs` (1-48), `OpponentAttackStrategy.cs` (1-115), `PlayerAttackStrategy.cs` (1-121), `Round.cs` (1-96), `Boxer.cs` (1-45), `Utils.cs` (1-35), `Program.cs` (1-29). `boxing.bas`: only the punch lines (grep of labels 600-1080 and the lines named in the receipts); its loop structure was not read in full. `java/Boxing.java` 1-120 and `GameSession.java` 1-35 read; `Boxing.java` 120-227 (the player's punch branch in Java) not read. Confidence high on the C# rule and its order of operations; moderate on the BASIC comparison, because only the punch branches were read.

## 1. Mechanism

- Nothing here is a visual. The "blood" in this donor is one line of text. The one thing that works like a finisher is a knockout (KO): a damage counter per boxer per round that ends the whole match when it passes a threshold.
- Round (C# `Round.cs`): `RoundBegins` (67-76) pushes the round-winner check, then seven "who attacks" slots (72-75). Each slot rolls 1 to 10 and gives the CPU the attack when the roll is over 5 (94). Work runs as a stack: `Round.Start` pops one action at a time (31-39).
- Attack (`AttackStrategy.cs` 17-32): roll the punch. If it is the attacker's best punch, the victim takes 2 points (20-23). The punch's own action is pushed and runs next.
- Damage ledger (`Boxer.cs` 24, 26): `DamageTaken` is a plain integer that resets to 0 at the start of each round (`ResetPlayers` calls `ResetForNewRound`, `Round.cs` 60-65).
- Vulnerability: each boxer has a secret weak punch (`Boxer.Vulnerability`, `Boxer.cs` 11). A punch of that kind always lands with no roll: the CPU's full swing checks it at `OpponentAttackStrategy.cs` 24, its jab at 93-95 (5 points, no roll), and the Java jab at `Boxing.java` 97.
- CPU full swing (`OpponentAttackStrategy.cs` 21-49): if the player is weak to it, it lands. Otherwise a roll of 1 to 60 decides the block (30-37). On a hit: if the victim's `DamageTaken` is over 35, a KO is pushed (43-46), and only then is 15 added (47). The KO check reads the total from before this punch's 15.
- CPU hook (51-61): adds 7, then 5 (54-56), then checks for KO (57-60). Here the check is after both additions.
- CPU uppercut (63-88): if the player is weak to it, it connects for 8 (86). Otherwise a roll of 1 to 200 decides "block and hit the CPU for 5" (72-76; the 5 goes to the attacker, 75) or the connect (79-87).
- CPU jab (90-111): weak to the jab means 5 points with no roll. Otherwise a roll of 1 to 7 over 4 prints "BLOOD SPILLS !!!" and adds 5 (99-103); anything else is "IT'S BLOCKED!" with no points (106).
- Player punches (`PlayerAttackStrategy.cs`): full swing lands on a roll under 10 of 30 (27), adds 15 with the same KO check before (40-44). Uppercut lands on a roll under 51 of 100 for 4 (57-70). Hook is blocked on a roll of 1 of 2 (83), otherwise 7 (96). Jab is blocked on a roll under 4 of 8 (109), otherwise 3 (119).
- KO (`AttackStrategy.cs` 40-45): `RegisterKnockout` clears the whole work stack (42), tells the round the game has ended (43), and prints the winner line. `Program.cs` 27 then stops the round loop.
- Round end (`Round.cs` 78-90): if the CPU's damage is greater than the player's, the player wins the round; otherwise the CPU wins (ties go to the CPU). A match is won with two round wins (`Boxer.cs` 30). Three rounds at most (`Program.cs` 21).

## 2. Key functions

- `AttackStrategy.Attack` and `RegisterKnockout`: `/mnt/frankendom-donors/coding-horror-basic-computer-games/15_Boxing/csharp/AttackStrategy.cs` 17-45. The best-punch bonus and the KO that clears the queue.
- `OpponentAttackStrategy.FullSwing`, `Hook`, `Uppercut`, `Jab`: `/mnt/frankendom-donors/coding-horror-basic-computer-games/15_Boxing/csharp/OpponentAttackStrategy.cs` 21-111. The CPU punches and their KO checks.
- `PlayerAttackStrategy.FullSwing`, `Uppercut`, `Hook`, `Jab`: `/mnt/frankendom-donors/coding-horror-basic-computer-games/15_Boxing/csharp/PlayerAttackStrategy.cs` 18-120. The player's punches (read in full; the player's KO check mirrors the CPU's at 40-42).
- `Round.CheckRoundWinner` and the seven-slot loop: `/mnt/frankendom-donors/coding-horror-basic-computer-games/15_Boxing/csharp/Round.cs` 67-90.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| A per-round damage ledger that resets each round | Reset at round start (theirs, `Boxer.cs` 26) |
| KO when the ledger passes a threshold, checked after the hit | Threshold 35 (theirs, `AttackStrategy.cs` 5); C# full swing checks before its +15 (43, 47) and the hook after its +7 and +5 (54-60) |
| Weakness: a set punch always lands with no roll | Weak-punch hit is certain (C# `OpponentAttackStrategy.cs` 24, 66, 93; Java `Boxing.java` 54, 97) |
| Best-punch bonus to the victim | +2 (theirs, `AttackStrategy.cs` 22) |
| Points per punch | Full swing 15 (`OpponentAttackStrategy.cs` 47); hook 7 then 5 (54, 56); uppercut 8 (86); jab 5 (103 and 110) |
| Hit or block by a roll | Full swing hits on the BASIC rule when the 1..60 roll is under 30 (theirs, `boxing.bas` 97); C# blocks on the same test (`OpponentAttackStrategy.cs` 30) |
| Round: seven exchanges, the CPU attacks on a roll over 5 of 10 | Seven (theirs, `Round.cs` 72); 5 of 10 (theirs, `Round.cs` 94) |
| Round winner: more damage taken loses | Ties go to the CPU (theirs, `Round.cs` 80) |
| Match: best of three, two wins | Two wins (theirs, `Boxer.cs` 30); three rounds (`Program.cs` 21, not receipted) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's KO rule (one ledger per round, KO when the total passes 35, the check after all of a punch's points are added) and the round winner test. It moves the KO check after the hit for every punch, so it changes the donor's order for the full swing (the donor checks before the 15 is added). It leaves out the rolls (blocks, the 3-in-7 jab branch, the 1-in-200 uppercut block, the CPU's choice of punch), the blood message, the player's own punch branches, and the stack. The donor's stack-clear becomes a returned KO victim, and the seven-exchange loop is left to the caller.

```ts
// Licence: Unlicense / public domain dedication (donor LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type PunchKind = "fullSwing" | "hook" | "uppercut" | "jab";

// Points per landed punch, in the order the donor adds them (hook is two hits).
const POINTS: Record<PunchKind, number[]> = {
  fullSwing: [15],
  hook: [7, 5],
  uppercut: [8],
  jab: [5],
};

export interface Ledger {
  damage: number; // points taken this round; reset at the start of each round
}

export const KO_AT = 35; // a fighter is knocked out when the ledger is over this value
export const BEST_PUNCH_BONUS = 2; // added to the victim when the attacker lands its best punch

// Apply one landed punch to the victim's ledger. Returns true when the victim is knocked out.
// The check runs once, after all of this punch's points are added.
export function landPunch(victim: Ledger, kind: PunchKind, isBestPunch: boolean): boolean {
  if (isBestPunch) victim.damage += BEST_PUNCH_BONUS;
  for (const p of POINTS[kind]) victim.damage += p;
  return victim.damage > KO_AT;
}

export type Side = "player" | "cpu";
export interface RoundResult {
  koVictim?: Side;   // set when the round ends by knockout (the match ends too)
  roundWinner?: Side;
}

// A knockout ends the round at once. Otherwise the side with more damage taken loses the round.
export function settleRound(
  player: Ledger, cpu: Ledger, koVictim: Side | undefined,
): RoundResult {
  if (koVictim) return { koVictim };
  return { roundWinner: cpu.damage > player.damage ? "player" : "cpu" };
}

// Best of three: the match is over when either side has two round wins.
export function matchOver(playerWins: number, cpuWins: number): boolean {
  return playerWins >= 2 || cpuWins >= 2;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/finisher.ts` (the KO gate that a finisher or match end reads from the damage ledger; the ledger itself stays in `src/fight/damage.ts`, parity row 1). Parity-checklist row 9 (finishers).
- Reuse tag: rewrite-from-idea (Unlicense, public domain; the shape may be adapted)
- Brief rule served: 1 (one combat core, two clients); the KO is a server-verified state change (the engine's rule), not a client effect; rules 7-9 n/a

## 6. Gaps and risks

- The donor's KO ends the whole match. In Frankendom a KO or finisher is a state change in one fight, recorded once in the ledger and the fight record. The KO check must read server-settled damage, not a client estimate, or the finisher can show on a screen the ledger does not agree with.
- Donor values are points per round, not HP. Frankendom's ledger is HP-based. The threshold is a finisher meter (a fraction of max HP or a stagger count) and must be expressed as data: `ko_threshold` is zone data, because a pit fight and a street fight may use different thresholds.
- Ordering: the donor checks KO before the full swing's 15 but after the hook's 12. The sketch uses one order (after all points). Frankendom must pick one order and test it; the donor's split is a quirk we do not copy.
- Divergence inside the donor: the C# CPU full swing blocks when its roll is under 30 (`OpponentAttackStrategy.cs` 30-33), while the BASIC hits when the roll is under 30 (`boxing.bas` 97, "IF R6 <30 THEN 770"), and the Java hits on the same test (`Boxing.java` 54). So the C# port inverts the block test. Do not take the C# block rule; use the BASIC form if a hit chance is needed.
- Java divergence: `Boxing.java` 33-35 `break` out of the seven-slot loop after any CPU punch, because `opponentPunch()` returns true at its end (line 108). The C# (`Round.cs` 72-75) runs all seven slots. Do not copy the Java round loop.
- The donor's stack (`Work.Push`, `Work.Clear`) is a sequencing trick for a console game. Frankendom's fight is a tick loop: a KO should be a state change that stops further exchanges in that round, not a stack.
- The random rolls use a clock-seeded `Random` (`Utils.cs` 4, `new((int) DateTime.UtcNow.Ticks)`). Frankendom must draw these from the fight record's seeded stream (row 19, replay), or a replay will not match the fight.
- The "blood" is only a message. Frankendom's blood and finisher VFX (row 8, row 9) should key on the same server event, not on this text.
- Unread: the BASIC round loop structure and the full Java player branch (see Checked).

Reuse tag: rewrite-from-idea (Unlicense, public domain; the shape may be adapted)
Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

Best transferable idea: a per-round damage ledger that ends the fight with a KO once it passes a threshold, checked right after each landed punch, and that resets each round.

Decision (proposed): adapt — take the threshold gate as the finisher trigger (a per-round meter that opens a finisher when it passes a data threshold), but check once after all points, keep the ledger in one place, and drop the text-only "blood" and the console stack.
Acceptance: a server test: a victim whose ledger is over the finisher threshold (35 in the donor) loses the exchange on the next landed hit; the remaining exchanges of that round are not resolved, the KO is written once to the fight record, and the same fight replays to the same result from its seed.
