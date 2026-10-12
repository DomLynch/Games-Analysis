# ModernUO (pvp-ranking-seasons-matchmaking, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` (ladder table and XP math), with the award call in `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/DuelContext.cs` 848-897 | Licence: GPL-3.0 (repo `LICENSE`, "Version 3, 29 June 2007"; no per-file header in Ladder.cs) | C# | symbols `Ladder.GetExperienceGain`, `Ladder.Find`, `DuelContext.Award`

Checked: Opened all of `Ladder.cs` (1-384, read in full), `DuelContext.cs` 760-910 (Finish and Award), `TourneyParticipant.cs` 20-60, `TournamentRegistrar.cs` 36-56, `Gumps/LadderGump.cs` 19-40, and the repo LICENSE header. Callers: `GetExperienceGain` has one caller (DuelContext.cs 865); `Award` has two call sites, both inside `Finish` under `if (IsOneVsOne)` (838-839); `Ladder.Find` has at least 8 callers in ConPVP (grep: DuelContext 857-858, TourneyParticipant 43, TournamentRegistrar 44, TournamentSignupItem 87, ArenaGump 144, ConfirmSignupGump 404, TournamentBracketGump 399, and the read in DuelContext 1266). Not read: `Trophy.cs`, `TournamentController.cs`, the bracket logic in `Tournament.cs` beyond `LevelRequirement`, rematch and sudden-death paths. Confidence: high on the ladder math and on the inverted `Find` (both read directly); this is the copy in the donor box, so production behaviour is not checked. camera_scope: not applicable.

Best transferable idea: Scale a 1v1 result's rating change by the level gap through a small win/loss table, so beating a much higher opponent pays more and losing to a lower one costs more, with the loss scaled down at low levels.

Decision (proposed): adapt - keep the gap table and the low-level loss shrink, but store the XP on the character's one ledger and make the ladder a view over it (a second ladder table would break the one-ledger ruling); fix the two defects listed in section 6.
Acceptance: A server test: two equal-level (level 1) characters duel in the Pit, A wins, A gains 25 XP and B loses 25; a level-5 character beating a level-3 character gains 20; reading the ladder twice changes no XP.

## 1. Mechanism

- Trigger: when a duel finishes, `Finish` calls `Award` once for each side, and only for a one-versus-one duel (DuelContext.cs 831, 838-839). `Award` finds both rows, computes a signed XP change, applies a multiplier in tournaments, bumps the wins or losses count, adds the XP, floors the total at 0, re-sorts the leaderboard and sends a level-up or level-down message (DuelContext.cs 857-897).
- Level from XP (Ladder.cs 171-184): levels 1 to 9 come from a lookup table indexed by xp / 100 (`m_ShortLevels`) below 2500 XP; from 2500 XP up, level = 10 + (xp - 2500) / 500, capped at level 50 at 22500 XP.
- XP change for one side (`GetExperienceGain`, Ladder.cs 224-256), in order: (a) gap = our level - their level; (b) the offset scalar is read from a 13-row table for gap -6 to +6, with separate win and loss columns (Ladder.cs 210-222); a gap outside that window returns scalar 0, and the function returns 0 (no XP either way); (c) base xp = 25 x scalar; (d) on a loss only, xp = xp x loss factor of our level / 100, where the factor is 10 to 67 for levels 1 to 9 and 100 from level 10 (Ladder.cs 200-208, 245); (e) xp = xp / 100 (integer); (f) if xp <= 0, xp = 1; (g) return xp with sign + for a win, - for a loss.
- Tournament multiplier (DuelContext.cs 872-875): gain x5, loss x2, applied after step (g). It runs only when `m_Tournament` is set.
- Leaderboard: `Entries` is a list kept in XP order by `UpdateEntry`, which bubbles the changed row up or down by swapping with its neighbours (Ladder.cs 271-287). `CompareTo` orders by XP, highest first (Ladder.cs 374). Rank shown to players is `Index + 1` (TourneyParticipant and DuelContext ViewLadder paths).
- Worked numbers (hand arithmetic from the code above; not run): equal-level win = +25 at any level; equal-level loss = -25 at level 10 or above, -6 at level 5 (factor 25: 25 x 100 x 25 / 100 = 625, then / 100 = 6), and -2 at level 1 (factor 10: 250, then / 100 = 2); level 5 beats level 3 (gap +2, win scalar 80) = +20; level 5 loses to level 3 (loss scalar 120, factor 25) = -7.

## 2. Key functions

- `Ladder.GetExperienceGain`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` 224-256. Signed change for one side; ordering in section 1.
- `Ladder.GetOffsetScalar`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` 210-222. Gap window and table lookup.
- `Ladder.GetLevel`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` 171-184.
- `Ladder.Find`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/Ladder.cs` 289-299. DEFECT (see section 6): the existence test is inverted.
- `DuelContext.Award`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/DuelContext.cs` 848-897. Lookup, gain, multiplier, counts, floor, re-sort, messages.
- `DuelContext.Finish` award block: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/ConPVP/DuelContext.cs` 831-839. Only one-versus-one duels award XP; each side is awarded in turn.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Rating change scaled by the level gap through a win table and a loss table | Gap window -6..+6; win scalars 175 to 40; loss scalars 25 to 160 (theirs, Ladder.cs 105-117) |
| Base unit for one decisive result | 25 XP (theirs, Ladder.cs 241) |
| Losses scaled down at low levels, full from level 10 | Loss factors 10, 11, 11, 25, 25, 43, 43, 67, 67 for levels 1-9; 100 from level 10 (theirs, Ladder.cs 93-100, 202-204) |
| Decisive result never rounds to zero | Minimum 1 XP (theirs, Ladder.cs 250-255) |
| Level from XP: fixed steps, then linear | Base floors 0, 100, 200, 400, 600, 900, 1200, 1600, 2000, 2500; 500 XP per level from 10; cap 50 at 22500 (theirs, Ladder.cs 90, 180, 173-176) |
| Tournament amplifies gains and losses differently | x5 gain, x2 loss (theirs, DuelContext.cs 874) |
| Floor at zero | 0 (theirs, DuelContext.cs 890-892) |

## 4. TypeScript sketch

simplified: keeps the donor's level table, offset window, loss factors, the minimum of 1 and the zero-at-out-of-window rule, and the tournament multipliers. It fixes the inverted `Find` (creates a row only when missing) and settles both sides from the pre-duel XP (the donor settles side A first, so side B reads A's new XP). It omits the sorted list and bubble swap (rank is recomputed on read), the level-up and level-down messages, the wins and losses bookkeeping on the donor's `Entries` list, the `Trophy` reward and the bracket code. Divides once instead of twice (identical for positive values).

```ts
// Licence: GPL-3.0 (donor, ModernUO LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Entry = { id: string; xp: number; wins: number; losses: number };

// Base XP floor for levels 1..10 (index = level - 1). Level 10+ is 2500 + 500 per level, cap 50 at 22500 XP.
const BASE_XP = [0, 100, 200, 400, 600, 900, 1200, 1600, 2000, 2500];

function levelOf(xp: number): number {
  if (xp >= 22500) return 50;
  if (xp >= 2500) return 10 + Math.floor((xp - 2500) / 500);
  let lvl = 1;
  for (let i = 0; i < 9; i++) if (xp >= BASE_XP[i]) lvl = i + 1;
  return lvl;
}

// Win and loss scalars for gap = ourLevel - theirLevel, gap -6..+6 (index gap + 6). Tunable data.
const OFFSET: Array<[number, number]> = [
  [175, 25], [165, 35], [155, 45], [145, 55], [130, 70], [115, 85], [100, 100],
  [90, 110], [80, 120], [70, 130], [60, 140], [50, 150], [40, 160],
];

// Percent applied to losses only, levels 1..9. Level 10+ is 100.
const LOSS_FACTOR = [10, 11, 11, 25, 25, 43, 43, 67, 67];

// Signed XP change for one side. Returns 0 outside a +-6 level gap (donor rule).
function xpChange(ourXp: number, theirXp: number, won: boolean, multiplier: number): number {
  const lvl = levelOf(ourXp);
  const gap = lvl - levelOf(theirXp);
  if (gap < -6 || gap > 6) return 0;
  const [winScale, lossScale] = OFFSET[gap + 6];
  const scalar = won ? winScale : lossScale;
  const factor = won || lvl >= 10 ? 100 : LOSS_FACTOR[lvl - 1];
  // simplified: one integer division; the donor divides twice, which gives the same result for positive values.
  let xp = Math.trunc((25 * scalar * factor) / 10000);
  if (xp <= 0) xp = 1; // a decisive result always moves at least 1 XP
  return (won ? xp : -xp) * multiplier;
}

class Ladder {
  private byId = new Map<string, Entry>();

  // Fixed: the donor's Find tests for existence with the test inverted (it resets existing rows and returns null for new ones).
  find(id: string): Entry {
    let e = this.byId.get(id);
    if (!e) {
      e = { id, xp: 0, wins: 0, losses: 0 };
      this.byId.set(id, e);
    }
    return e;
  }

  // One 1v1 duel. Both gains come from the pre-duel XP of both sides (donor settles A first, so B reads A's new XP).
  settleDuel(a: string, b: string, aWon: boolean, tournament: boolean): void {
    const ea = this.find(a);
    const eb = this.find(b);
    const mult = (won: boolean) => (tournament ? (won ? 5 : 2) : 1);
    const gainA = xpChange(ea.xp, eb.xp, aWon, mult(aWon));
    const gainB = xpChange(eb.xp, ea.xp, !aWon, mult(!aWon));
    this.apply(ea, gainA, aWon);
    this.apply(eb, gainB, !aWon);
  }

  private apply(e: Entry, gain: number, won: boolean): void {
    if (gain === 0) return;
    if (won) e.wins++; else e.losses++;
    e.xp = Math.max(0, e.xp + gain);
  }

  // 1-based rank by XP, highest first. Re-sorted on read (donor keeps a sorted list with bubble swaps).
  rank(id: string): number {
    const sorted = [...this.byId.values()].sort((x, y) => y.xp - x.xp);
    return sorted.findIndex((e) => e.id === id) + 1;
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS (/tmp/PV001-modernuo-ladder.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/duel-xp.ts` (new module; the one place a 1v1 result moves a character's XP, called from the engine's duel settlement). Parity-checklist row 18 (loot roll and XP award). The cells hint said row 7; row 7 is creature actor and clips, so I used row 18 for XP award.
- today: Frankendom's current duel-settlement location was not read (not read); this section is the target only.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: addendum "keep the idea, fix the defect" (Dom 2026-10-10): the idea is kept, both defects are fixed in the sketch, decision is adapt; ruling "one ledger" (section 6).

## 6. Gaps and risks

- DEFECT 1, inverted lookup (Ladder.cs 291-293). `Find` tests `if (m_Table.TryGetValue(mob, out var entry))` and, in the found branch only, overwrites the row with `new LadderEntry(mob, this)` and appends it to `Entries`. A player with no row gets `null` back. Effects read directly from callers: `Award` returns early when either side is null (DuelContext.cs 860-863), so a player who has never had a row gets no XP; any read (leaderboard, tournament XP total at TourneyParticipant.cs 43-47, the registrar at TournamentRegistrar.cs 44) resets an existing player's XP, wins and losses to zero and leaves a duplicate in `Entries`. Fix: create the row only when it is missing, return the existing row otherwise (sketch `find`).
- DEFECT 2, settle order (DuelContext.cs 838-839, 888). `Award` for side A writes A's new XP before `Award` for side B reads A's row as "their" entry, so B's gain uses A's post-duel level. Fix: read both sides' XP before writing either (sketch `settleDuel`).
- Rank floor, read as a gate (TournamentRegistrar.cs 46). The check is `if (entry != null && ...)`, so a player with no row passes any level requirement. Frankendom: the gate reads the ledger value, with 0 XP meaning level 1, so the gate cannot be skipped by a missing row.
- Out-of-window gaps (Ladder.cs 214-216). A gap of +7 or more, or -7 or less, pays 0 both ways, with no comment in the donor. This removes the reward for upsets against far-higher players and the cost of losing to far-lower ones. Frankendom should decide this per Pit ruleset and keep the window as data.
- No seasons, decay, reset, ping matching, smurf control or account link. The ladder is per `Mobile`; a grep for season, reset and decay in ConPVP found no ladder reset (only tournament `Undefeated.Clear`, Tournament.cs 701, 817, 952). Frankendom's season and smurf rules need their own design.
- Frankendom ruling: one ledger. This ladder keeps XP in its own serialized table; in Frankendom the XP must sit on the character and the ladder is a view. A second XP store would be a second ledger.
- Server authority: `Award` trusts the caller's win flag from `Finish` (DuelContext.cs 789-795 and 838-839). Frankendom kills are server-verified; the result must come from the engine's duel step, not a client message. The donor does not check this.
- Rounding is not a defect: the donor divides by 100 twice (Ladder.cs 245, 248); for positive integers that equals one division by 10000, which the sketch uses.
- Licence: GPL-3.0. Clean-room only: the sketch is written from the mechanism, not translated from the C#.
