# daggerfall-unity (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/Temple.cs` (with `UserInterfaceWindows/DaggerfallGuildServiceDonation.cs`, `Player/PersistentFactionData.cs`, `Entities/PlayerEntity.cs`, `Guilds/Guild.cs`, `Utility/Dice100.cs`, `Formulas/FormulaHelper.cs`, `MagicAndEffects/Effects/Special/RingOfNamiraEffect.cs`, `MagicAndEffects/Effects/Special/LycanthropyEffect.cs`) | Licence: MIT (`LICENSE`, "MIT License, Copyright (c) 2009-2023 Daggerfall Workshop"; each file header also says MIT) | C# (Unity) | symbol `DaggerfallGuildServiceDonation.DonationMsgBox_OnGotUserInput`

Checked: Read in full: the donation branch (DaggerfallGuildServiceDonation.cs 55-76), `Dice100` (Utility/Dice100.cs), `PersistentFactionData` ChangeReputation and PropagateReputationChange (390-455), `NormalizeReputations` (PlayerEntity.cs 2223-2242) and its caller loop (446-459), `CalculateNewRank` (Guild.cs 96-116), `Temple.Blessing` and `BlessingStat` (Temple.cs 332-372), the per-deity benefit methods (Temple.cs 408-458), the deity table (Temple.cs 132-142), the Ring of Namira effect (whole file, 71 lines), `ForceTransformDuringFullMoon` (LycanthropyEffect.cs 606-624). Not read: the rest of the donation handler (too-generous branch, 77-88), `Killed` and the death path, DarkBrotherhood.cs and ThievesGuild.cs bodies, CalironsCurse.cs, DispelDaedra.cs body, DaggerfallDaedraSummonedWindow.cs. Callers: ChangeReputation has many callers (grep); I traced the donation caller only as far as the window code. Confidence: high on the favour path (gain roll, clamp, propagation, decay, rank gate); medium on the decay cadence, because I read the loop and its guard but not every caller of PlayerEntity's update function. camera_scope: not applicable (not a camera cell).

## 1. Mechanism

- Favour is a signed integer per faction, held in one ledger (`PersistentFactionData`), clamped to -100..100 on every write (PersistentFactionData.cs 398, with the bounds at 32-33). The donor calls it "reputation". For a temple it is the deity's faction row.
- Donation is the active way to raise a deity's favour. Order of steps in the donation handler: (a) parse the typed amount; (b) if the player has at least that much gold (60), deduct it (63); (c) take the deity from the building's faction id (64), so the same temple button works for members and non-members; (d) read `rep = |favour|` (67); (e) roll `Dice100.SuccessRoll((2 * amount / max(rep,1)) + 1)` (68), where the chance is in percent, the division is integer, and a chance over 100 is always a success; (f) on success add exactly one favour point, with no propagation (69, comment "Does not propagate in classic"); (g) show a thanks message. The gold is spent whether or not the roll succeeds.
- So the chance falls as favour grows. At favour 0, any donation of 50 gold or more is a certain success (2*50/1 + 1 = 101). At favour 50, a 100-gold donation has a 5 percent chance (2*100/50 + 1 = 5). Large donations give more chances, so the price of favour rises with standing.
- Other favour changes (quests, crimes, guild sync) go through `ChangeReputation(id, amount, propagate)`. With propagate on: allies get `amount / 2` and enemies get `-amount / 2` (PersistentFactionData.cs 408-409, non-propagating calls). A deity change also adds the full amount to the generic temple faction (434). Crime (PlayerEntity.cs 2298) subtracts half the crime value from the people faction, propagated.
- Decay: game time runs a loop over every elapsed minute (PlayerEntity.cs 455). When `(minute % 161280) == 0` (458, 161280 minutes = 112 days) and `preventNormalizingReputations` is not set (458), `NormalizeReputations` moves every faction one point toward 0 (2239 and 2241; the same call also normalises legal rep).
- Ranks: `CalculateNewRank` returns -1 ("Expelled.") below favour 0 (Guild.cs 104-105). Otherwise it walks rank r = 0..9 and stops at the first rank whose favour requirement fails (requirements 0,10,...,90 at Guild.cs 37) or whose skill gate fails (111). Rank is the only gate for the deity's service row (see below).
- Rank-gated boons per deity (Temple.cs 132-142 holds one row per deity): free healing when `healing <= rank` (415); Arkay cure discount `((10 - rank) << 8) / 10 * price >> 8` (421); Akatosh fast travel `((95 - rank) / 100) * duration` (435); Kynareth deep breath `((10 + rank) / 10) * duration` (445); Stendarr death avoidance, a random roll below the rank out of 50, not while submerged (454); summoning gate (496).
- Blessing (Temple.cs 332-353): donation calls `FormulaHelper.CalculateTempleBlessing(gold, favour)`, which returns the constant 1 (FormulaHelper.cs 396). If the boost is above 0, the code is supposed to change one stat: Akatosh Speed, Dibella Luck (362), Julianos Intelligence, Kynareth Endurance, Mara Personality (`BlessingStat`, 355-372). It only logs (342) and shows a message box. No stat changes. The donor marks this itself as a TODO (341).
- Tick: none. Donation is an event; decay is driven by game time, not a frame loop.

## 2. Key functions

- `DonationMsgBox_OnGotUserInput`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/UserInterfaceWindows/DaggerfallGuildServiceDonation.cs` 55-76 (read). Favour roll at 67-69.
- `Dice100.SuccessRoll`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Utility/Dice100.cs` 15-18. Success is `Random.Range(0, 100) < chanceSuccess`.
- `ChangeReputation` and `PropagateReputationChange`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Player/PersistentFactionData.cs` 390-455.
- `NormalizeReputations` and its time loop: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Entities/PlayerEntity.cs` 2223-2242 and 455-459.
- `CalculateNewRank`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/Guild.cs` 96-116.
- `Temple.Blessing` and `BlessingStat`: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/Temple.cs` 332-372. Stub: `FormulaHelper.CalculateTempleBlessing` at `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Formulas/FormulaHelper.cs` 394-397.
- Per-deity benefits: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/Guilds/Temple.cs` 408-458 and deity rows 132-142.
- Ring of Namira reflect: `/mnt/frankendom-donors/daggerfall-unity/Assets/Scripts/Game/MagicAndEffects/Effects/Special/RingOfNamiraEffect.cs` (team switch from line 39; the Daedra, Undead and default cases at 49, 52 and 57; damage 60, durability 65).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Favour gain roll: chance = floor(2 * gold / max(abs(favour), 1)) + 1, success if roll below chance | The 2 and the +1 (theirs, DonationMsgBox 68) |
| Each win adds one point | +1 (theirs, 69) |
| Signed standing clamped to a band | -100 and 100 (theirs, PersistentFactionData 32-33 and 398) |
| Propagate a change: half to allies, negated half to enemies | Ratio 1/2 (theirs, 408-409) |
| Decay one point toward zero on a long period | 161280 game minutes = 112 days; step 1 (theirs, PlayerEntity 458, 2239, 2241) |
| Rank from standing: highest rank whose requirement is met | Requirements 0,10,...,90 (theirs, Guild.cs 37); negative = expelled (105) |
| Rank-scaled boon factors | Arkay (10-rank)/10 (421); Akatosh (95-rank)/100 (435); Kynareth (10+rank)/10 (445) |
| Death avoidance, chance rank/50 | Stendarr; roll 0..49 below rank (454) |
| Reflect damage by enemy team | Daedra 1/2 (RingOfNamira 49-50); Undead 2 (52-53); other teams 1 (57); animal and spriggan cases return with no reflect (cases precede line 49, exact lines not receipted); durability loss = reflected damage (65) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order (gold first, then the favour roll with the chance formula, then +1, with clamp and decay). It omits: the walk from a child faction up to its root and the per-child half-change (PropagateReputationChange), the generic temple chain, skill gates in the rank loop, the too-generous branch, the thanks message, the Hircine ring and cure-quest parts of lycanthropy, and the Ring of Namira switch (its fix is in the notes below). Fixes applied in the sketch: the half-change rounds away from zero (donor integer division turns +1 and -1 into 0 for allies and enemies), the cure cost is one floor of price * (10 - rank) / 10 (donor shift-then-divide chain), and the blessing becomes a timed status row instead of a log line.

```ts
// Licence: MIT (donor, Daggerfall Unity). Idea adapted from the favour mechanism; numbers are the donor's values, marked where used.
// Donor constants: favour clamp -100..100 (PersistentFactionData.cs:32-33); rank requirements 0,10..90 (Guild.cs:37);
// decay every 161280 game minutes = 112 days (PlayerEntity.cs:458).

export {};

const REP_MIN = -100;
const REP_MAX = 100;
const RANK_REQ_REP = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
const DECAY_EVERY_GAME_MIN = 161280;

interface FactionRow { id: string; rep: number; allies: string[]; enemies: string[]; }
type Ledger = Map<string, FactionRow>;
interface Wallet { gold: number; }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Fix (donor defect): the half-change is rounded away from zero, so a +1 or -1 still reaches allies and enemies.
// Donor uses amount / 2 with C# integer division, which turns +1 and -1 into 0.
function changeFavour(ledger: Ledger, id: string, amount: number, propagate: boolean): void {
  const row = ledger.get(id);
  if (row === undefined) return;
  row.rep = clamp(row.rep + amount, REP_MIN, REP_MAX);
  if (!propagate) return;
  const half = Math.sign(amount) * Math.ceil(Math.abs(amount) / 2);
  for (const a of row.allies) changeFavour(ledger, a, half, false);
  for (const e of row.enemies) changeFavour(ledger, e, -half, false);
}

// Donation chance in percent: floor(2 * gold / max(|favour|, 1)) + 1. Can exceed 100, which means certain success.
export function donationChance(gold: number, rep: number): number {
  return Math.trunc((2 * gold) / Math.max(Math.abs(rep), 1)) + 1;
}

// roll() returns an integer 0..99. Success when roll < chance, as the donor's Dice100.SuccessRoll does.
export function donate(ledger: Ledger, deity: string, gold: number, wallet: Wallet, roll: () => number): boolean {
  if (wallet.gold < gold) return false;
  wallet.gold -= gold;
  const row = ledger.get(deity);
  if (row === undefined) return false;
  if (roll() < donationChance(gold, row.rep)) changeFavour(ledger, deity, 1, false);
  return true;
}

// Rank from favour: highest rank whose requirement is met; below 0 is expelled (-1). The donor also checks skills (omitted).
export function rankFor(rep: number): number {
  if (rep < 0) return -1;
  let r = 0;
  while (r + 1 < RANK_REQ_REP.length && rep >= RANK_REQ_REP[r + 1]) r++;
  return r;
}

// Decay, called once per DECAY_EVERY_GAME_MIN game minutes: each non-zero favour moves one point toward 0.
export function decayStep(ledger: Ledger): void {
  for (const row of ledger.values()) {
    if (row.rep < 0) row.rep += 1;
    else if (row.rep > 0) row.rep -= 1;
  }
}

// Rank-scaled boons. Fix (donor defect): cure cost is computed as one floor of price * (10 - rank) / 10,
// not the donor's shift-then-divide chain that truncates before the multiply.
export function cureCost(price: number, rank: number): number {
  return Math.floor((price * (10 - rank)) / 10);
}

export function fastTravelSeconds(durationS: number, rank: number): number {
  return Math.trunc(((95 - rank) / 100) * durationS);
}

// Stendarr-style death avoidance: roll in 0..49 must be below rank (chance rank / 50). Caller supplies the roll.
export function avoidDeath(rank: number, roll: () => number): boolean {
  return roll() < rank;
}

// Blessing. Donor computes a boost but applies no stat (TODO). Fix: the boost becomes a timed status row on the effect ladder.
export interface TimedStatRow { stat: string; amount: number; expiresAtS: number; }
export function blessingRow(stat: string, amount: number, nowS: number, durationS: number): TimedStatRow {
  return { stat, amount, expiresAtS: nowS + durationS };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 gl004-favour-daggerfall.ts` on the VPS (copy at /tmp/gl004-favour-daggerfall.ts): exit 0.

Defects in the donor, each with the fix (the idea is kept):
- D1, blessing has no effect: Temple.cs 341-342 log only; FormulaHelper.cs 396 returns 1. fix: a timed status row (`blessingRow`) with the stat and amount as catalogue data, boost from gold and favour as a designer formula.
- D2, one-point changes never reach allies or enemies: PersistentFactionData.cs 408-409 use integer division. fix: round the half away from zero (`changeFavour`).
- D3, Arkay cure discount truncates early: Temple.cs 421 shifts and divides before the multiply. fix: `cureCost` as one floor.
- D4, Ring of Namira reflect is 0 on a one-point hit against Daedra: RingOfNamiraEffect.cs 50 is `sourceDamage / 2`, integer division. fix: round half up with a floor of 1 on any landed hit (not in the sketch; the Namira table is in the Lands-in row).

## 5. Lands in

- TARGET `src/fight/favour.ts` (new module: favour ledger row per deity, rank from favour, rank-scaled boons, decay on the game clock, timed blessing rows). Donations and temple buttons stay in the town/zone data (origins), not in the fight.
- Parity-checklist row 13 (specials). Row 13 is the hint in the brief; the rank-gated boons and the Namira reflect table are specials.
- Reuse tag: adapt (MIT: code may be adapted; keep the Daggerfall Workshop copyright notice in any copied code; the sketch above is a rewrite from the idea)
- Brief rule served: rules 1 and 2 (one engine, one ledger: favour is a ledger row, the roll runs on the server); GL focus items 1, 2, 4, 5, 10 (partly), 13 and 14.

## 6. Gaps and risks

- The donor rolls with client `Random`. Frankendom must run the donation roll on the server with a recorded seed or roll, so a player cannot re-roll a failed donation.
- The donor has no cap on the donation chance. With favour 0 and a large donation, the win is certain. Frankendom needs a gold cap per donation or a chance ceiling as zone data, or a rich player can buy the first ranks in one click.
- The donor's blessing does nothing (D1). Its boost numbers are not in the donor. They are designer data, not a copy of the donor.
- Decay: the donor uses game-day minutes. Frankendom's clock differs, so the interval becomes a zone or engine constant and must be tested for the case when the timer crosses a boundary between two fights.
- Stendarr's death avoidance is a random save. Frankendom's death rules (row 17) and server-verified kills need the roll recorded in the fight record; it must not be a client decision.
- Ring of Namira reflects damage back to the attacker, which bypasses guard and stance (rows 1 and 3). If Frankendom uses it, the reflect must run after the duel step's guard check, not as a side effect of the hit. The team table (Daedra 1/2, Undead 2) is a domain-to-damage table and fits zone data or a catalogue row; the defect in D4 applies.
- Lycanthropy forces the player into a beast form at every full moon. The donor's own comment says this shuts the player out for 24 hours every 15 days. Not a fit for the Pit or the world; only the shape of the form switch (not read in full) could transfer.
- No curse code was read (CalironsCurse.cs not read), so the curse half of item 2 in the GL focus is not covered by this donor.

Reuse tag: adapt (MIT). Brief rule served: rules 1-2 and GL focus items 1, 2, 4, 5, 13, 14.

Best transferable idea: a favour row that a donation can raise only with a roll whose chance falls as the current favour rises, with rank, boons and decay all read from that one row.
Decision (proposed): adapt — the favour ledger, the falling donation chance, the rank table and the decay are sound; the donor's blessing is unimplemented and its boons are hard-coded per deity, so Frankendom takes the shape and moves the numbers to catalogue or zone data, with D1 to D4 fixed in the sketch.
Acceptance: a server test donates 100 gold at favour 0 (always wins, favour goes from 0 to 1), and at favour 50 (chance 5) with a seeded roll of 4 (wins) and 5 (no change); favour never leaves -100..100; a player at favour 30 holds rank 3 and gets the rank-3 boon rows, and a player at favour -1 is expelled.

GL table (gods-legends-favour, items from GL-FOCUS.md; "not read" where the donor has no code I opened):

| # | name | effect | formula | number ranges | gain/loss events | decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour per deity (ledger row) | signed standing per faction, gates ranks and services | clamp(rep + d, -100, 100); propagate: allies d/2, enemies -d/2 | -100..100 | donation win +1 (chance floor(2*gold/max(\|rep\|,1))+1 %); quest and crime changes (crime: -(value/2) to people faction, propagated) | -1 toward 0 every 161280 game minutes (112 days) | PersistentFactionData.cs 32-33, 390-455; DaggerfallGuildServiceDonation.cs 63-69; PlayerEntity.cs 2293-2298, 455-459, 2239-2241 |
| 2 | Blessings and curses | blessing: donation buys a stat boost for a deity (Akatosh Speed, Dibella Luck, Julianos Intelligence, Kynareth Endurance, Mara Personality); not applied, TODO | boost = CalculateTempleBlessing(gold, favour) = 1 (stub) | stat boost not implemented | donation per call | none (no timed row) | Temple.cs 332-372 (Luck at 362); FormulaHelper.cs 396. Curses: CalironsCurse.cs not read |
| 3 | Patron choice and switching | guild join needs favour >= 0 and skills; favour < 0 expels; no apostasy or god-anger code found (grep for apostas, wrath, anger in Game/*.cs: none in guild code) | rank -1 if rep < 0 | rank 0..9 | expulsion below 0 | none | Guild.cs 104-105; ThievesGuild.cs 129 and DarkBrotherhood.cs 134 (comments: never expel); no switch cost found |
| 4 | Divine domains as tags driving damage | Ring of Namira reflect table by enemy team: Daedra x1/2, Undead x2, other teams x1, animal and spriggan cases no reflect | reflected = sourceDamage * mult; enemy health -= reflected; durability loss = reflected | mult 0, 1/2, 1, 2 | every landed hit on the wearer | none | RingOfNamiraEffect.cs 49-65 |
| 5 | Boons at favour thresholds (ranks) | per-deity service rows: free healing (healing <= rank), Arkay cure discount, Akatosh fast travel, Kynareth deep breath, summoning gate, Stendarr death avoidance | Arkay (10-rank)/10; Akatosh (95-rank)/100; Kynareth (10+rank)/10; Stendarr chance rank/50 | rank 0..9; deity rows 134-141 | rank change from favour | n/a | Temple.cs 132-142, 415, 421, 435, 445, 454, 496 |
| 6 | Legend signature powers per named opponent per rank | none in this donor (not searched further; DaggerfallDaedraSummonedWindow.cs not read) | n/a | n/a | n/a | n/a | not read |
| 7 | Shapeshifting | full moon forces lycanthrope form each magic round unless Hircine ring; cure quest 30 percent roll; beast-form flag feeds the player's beast state (partly read) | roll 1..100 < 30 | 30 percent cure | full-moon event; cure quest | full moon (donor comment: 24 hours every 15 days) | LycanthropyEffect.cs 441, 606-624 |
| 8 | Avatars and summons | summoning is a rank row (summoning <= rank) per deity; the summon window was not read | rank gate only | rank 0..9 | rank change | n/a | Temple.cs 496; DaggerfallDaedraSummonedWindow.cs not read |
| 9 | Fate, luck, oaths | Dibella maps to Luck, but the blessing does nothing (D1); no oath contract code read | n/a | n/a | n/a | n/a | Temple.cs 355-372 (Luck at 362) |
| 10 | Underworld and death rules | Stendarr death avoidance: random roll below rank out of 50, not while submerged; corpse run and death tiers not read | roll 0..49 < rank | rank 0..9 | per death | n/a | Temple.cs 450-454 (roll at 454) |
| 11 | Divine mounts | none found in read files | n/a | n/a | n/a | n/a | not searched further |
| 12 | Relics and artifacts | Ring of Namira is an artifact subtype with an effect key; one-in-world ownership and transfer not in read code | see item 4 | n/a | n/a | n/a | RingOfNamiraEffect.cs (EffectKey declaration) |
| 13 | Temples and shrines as zone rows | a temple building carries a faction id; donation and services key off it; each deity has one rank row | deity = Temple.GetDivine(building faction id) | 8 deity rows | donation at the building | n/a | DaggerfallGuildServiceDonation.cs 64; Temple.cs 132-142 |
| 14 | Pantheon factions and realm pride | deity factions (ids 21-35) sit under a generic temple faction; a deity change adds the full amount to it; realm and PvP pride not read | Generic_Temple propagated +d | ids 21-35 | any deity change | n/a | Temple.cs 50 (enum); PersistentFactionData.cs 434 |
