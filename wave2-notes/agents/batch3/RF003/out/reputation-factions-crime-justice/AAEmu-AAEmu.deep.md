# AAEmu-AAEmu (reputation-factions-crime-justice, cell 2)

Donor: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/CrimeManager.cs` (with Models/Game/Char/CharacterCombat.cs, Models/Game/Char/Character.cs, Models/Game/Crime/TrialData.cs, Core/Managers/TrialManager.cs) | Licence: LGPL-3.0-or-later per README "Licensing information" (repo also ships LICENSE.GPL and LICENSE.MIT, MIT header read only; which file covers which code not read) | C# | symbol `CheckWantedThreshold`, `AddCrime`, `CalculateJailTime`, `ResultIsGuilty`, `ResultIsNotGuilty`

Checked: read in full: `CrimeManager.cs` (1-445), `JusticeConfig.cs`, `BountyDescription.cs`. Read by range: `Character.cs` 112-145, 2876-2935, 3046-3066; `CharacterCombat.cs` 20-36, 92-200, 205-275, 395-470; `TrialData.cs` 85-132, 400-486; `TrialManager.cs` 575-660, 752-835; `Unit.cs` 955-985; `BuffConstants.cs` 35-36. Grep only: `CSNaviOpenBountyPacket.cs` 31. Not read: `TrialData.cs` 1-84 and 132-400 (jury timers, vote collection, trial step machine), `TrialManager.cs` 1-575 and 660-750, `CharacterManager.AddOfflineCrimePoints`, `WorldManager.GetCharacterById`, the `Wanted`/`TagWanted` buff definitions, the csproj overflow setting, `CollectAssists` and the honor split's solo branch. Confidence: high on the crime-point meter, the two thresholds, the verdict clearing and the sentence multipliers (all read). Medium on the offline-victim penalty (depends on `GetCharacterById` being online-only, not read). Medium-high on the AddCrime overflow defect (C# unchecked cast assumed; csproj not read). Licence LGPL/GPL/MIT: clean-room, shape only.

Best transferable idea: a crime meter that fills when evidence is reported, sets a wanted tag at a low threshold and an escalated state at a high lifetime total, is cleared by any verdict, and sets jail time from the evidence list, scaled by the jury's tally.
Decision (proposed): adapt — keep the two-threshold meter (a wanted tag, then an escalated outlaw state) and the clear-on-verdict rule for our open PvP flag and murder counts; drop the jury trial (too heavy for phone-first) and keep the sentence table as data.
Acceptance: a player whose reported murders reach 50 points gets a visible Wanted badge on the nameplate and can be arrested by a player on their next death; a server test asserts that 3 murders of 20 points give meter 60 and wanted true, that infamy 3000 sets the escalated state, that a not-guilty verdict removes the counted points from infamy, and that adding 40000 points caps the meter at 32767 (not 0).

## 1. Mechanism

- Two counters per character. `CrimePoint` (a short, the wanted meter, "/50" in the packet comment, `Character.cs` 115-126) and `InfamyPoint` (an int, lifetime total, `Character.cs` 130-141). Both setters call `CheckWantedThreshold()` when the value changes (`CharacterCombat.cs` 416).
- Adding crime: crime points enter when evidence is reported, not at the kill. `CrimeManager.ReportCrime` (`CrimeManager.cs` 236) calls `AddCrimePoints`, which calls `AddCrime` on an online criminal (265) and an offline add otherwise (270). `AddCrime` (`Character.cs` 2882-2901) adds the amount to the meter, clamps it, and adds the same amount to infamy (2897). A kill by a non-friendly player also creates a bloodstain evidence doodad (`CharacterCombat.cs` 154) but adds no points by itself.
- State rules (`CheckWantedThreshold`, `CharacterCombat.cs` 416-458). Order: (a) if infamy >= 3000, apply the Wanted and Contemptuous buffs and set the pirate faction (419-433). (b) Otherwise, if meter >= 50, apply Wanted (438-442); if below 50, remove Wanted (447-449). In case (b) Contemptuous is removed (453-455). The pirate faction is not removed here.
- Arrest on death (`CharacterCombat.cs` 166-177). When a player kills a character, `possibleArrest` is set and the victim's death runs `ArrestCriminal` if the victim has the Wanted tag (166-171). A pirate (Contemptuous) is arrested only outside the pirate desperado zones (168-176). `ArrestCriminal` (`TrialManager.cs` 580-628) picks the court by the victim's faction, falls back to the arrestor's region, and returns null if both are outside the justice system. It creates the trial case and calls `CalculateJailTime` (`TrialManager.cs` 648, in the case-creation helper).
- Jail time (`TrialData.cs` 85-132). For each unjudged evidence item: murder scores 20 (106), theft 8 (109), assault 0 (100-103). If the victim is online and under level 30, the score is multiplied by 10 (114-117). The base is the sum (122). It is multiplied by `1 + InfamyPoint / 1000` (123). A pirate gets a fixed 40 (124-126).
- Verdict (`TrialData.cs` 420-476). Each juror picks an option index. Default with no votes is 3 (420). The most-voted option wins, ties going to the first option reached (424). Options 0-1 are not guilty (sentence 0). Option 2 gives 0.2 x jail time, 3 gives 0.5, 4 gives 0.8, 5 gives 1.0, 6 gives 1.2 (441-465). The result is rounded to whole minutes (438-476).
- Guilty (`TrialManager.cs` 727-789): the meter is cleared (755), infamy is kept, the prisoner buff runs for the jail time with a 10-second minimum (770), and the defendant is sent to the court jail.
- Not guilty (`TrialManager.cs` 796-824): the meter is cleared (811), the same counted points are removed from infamy (812). If infamy is then 0 or less and the faction is pirate, the defendant goes back to the default faction (818).
- Order for one case: report evidence (points added, state refreshed) → murder or theft evidence accumulates → arrest on death (only if the Wanted tag is on) → jail time computed at case creation → jury votes → verdict → meter cleared, infamy kept (guilty) or reduced (not guilty).

## 2. Key functions

- `CheckWantedThreshold`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/CharacterCombat.cs` 416-458.
- `AddCrime`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/Character.cs` 2882-2902; `CrimePoint` setter 115-126; `InfamyPoint` setter 130-141.
- `ReportCrime` (starts 180) and `AddCrimePoints` (starts 257): `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/CrimeManager.cs`, call sites at 236, 265 and 270.
- Arrest on death: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/CharacterCombat.cs` 166-177.
- `ArrestCriminal` (580-628) and the `CalculateJailTime` call (648): `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TrialManager.cs`.
- `CalculateJailTime`: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Crime/TrialData.cs` 85-132.
- Verdict tally and sentence: `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Crime/TrialData.cs` 400-476.
- `ResultIsGuilty` (727-789) and `ResultIsNotGuilty` (796-824): `/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/TrialManager.cs`.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants (value, where it is) |
|---|---|
| Wanted tag when the meter reaches a threshold, removed below it | 50 crime points (`CrimeManager.cs` 25; check at `CharacterCombat.cs` 438) |
| Escalated outlaw state when lifetime infamy reaches a threshold | 3000 infamy (`CrimeManager.cs` 26; check at `CharacterCombat.cs` 419) |
| Evidence score by kind | murder 20 (`TrialData.cs` 106), theft 8 (109), assault 0 (100-103) |
| Low-level victim multiplier | victim online and level below 30 gives x10 (`TrialData.cs` 114-117) |
| Infamy jail multiplier | `1 + infamy / 1000` with integer division (`TrialData.cs` 123) |
| Pirate jail length | 40 minutes, fixed (`TrialData.cs` 126) |
| Sentence rate by jury option | 2: 0.2, 3: 0.5, 4: 0.8, 5: 1.0, 6: 1.2 (`TrialData.cs` 449, 453, 457, 461, 465) |
| No-vote default option | 3 (`TrialData.cs` 420) |
| Minimum jail buff | 10 seconds (`TrialManager.cs` 770) |
| Meter cap (short) | 32767 intended; see defect 1 (`Character.cs` 2887) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: add points (meter and infamy), refresh the wanted and escalated state, verdict clears the meter and reduces infamy on not guilty, jail minutes from evidence, sentence from the jury option. It fixes two donor defects (the meter cap and the integer infamy step) as noted in the code. It omits the buffs themselves (Wanted, Contemptuous, prisoner, forcibly-awaiting-trial), the faction call, the court-room and region lookup, the jury timers and trial step machine, the arrest-on-death rule (described in section 1 only), the bot-report suspect logic, the offline add path, the 10-second jail minimum, and the honor split. It does not model the pirate faction removal on acquittal beyond the infamy-at-zero check.

```ts
// Licence: LGPL-3.0 per README (repo also ships LICENSE.GPL and LICENSE.MIT; per-file licence not read). Treated as copyleft.
// clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
const WANTED_AT = 50;      // donor CrimeManager.WantedCrimePointThreshold
const PIRATE_AT = 3000;    // donor CrimeManager.PirateCrimePointThreshold
const METER_MAX = 32767;   // donor meter is a short

interface Justice {
  meter: number;     // current crime points; cleared by any verdict
  infamy: number;    // lifetime total; reduced only by a not-guilty verdict
  wanted: boolean;   // derived from meter and infamy
  pirate: boolean;   // set when infamy reaches PIRATE_AT; cleared only by a not-guilty verdict with no infamy left
}

interface Evidence { kind: 'murder' | 'theft' | 'assault'; victimLevel: number | null }

function refresh(j: Justice): void {
  if (j.infamy >= PIRATE_AT) j.pirate = true;
  j.wanted = j.infamy >= PIRATE_AT || j.meter >= WANTED_AT;
}

// Fixed: the meter is clamped once. The donor's cast wraps large values to negative, then the setter zeroes them.
function addCrime(j: Justice, amount: number): void {
  j.meter = Math.max(0, Math.min(METER_MAX, j.meter + amount));
  j.infamy = Math.max(0, j.infamy + amount);
  refresh(j);
}

// Any verdict clears the meter. Not guilty also removes the same number of points from infamy.
function verdict(j: Justice, guilty: boolean): void {
  const counted = j.meter;
  j.meter = 0;
  if (!guilty) {
    j.infamy = Math.max(0, j.infamy - counted);
    if (j.infamy <= 0) j.pirate = false;
  }
  refresh(j);
}

// Jail minutes from evidence. Fixed: float infamy multiplier (donor integer division steps at each 1000).
function jailMinutes(evidence: Evidence[], infamy: number, pirate: boolean): number {
  let base = 0;
  for (const e of evidence) {
    let score = e.kind === 'murder' ? 20 : e.kind === 'theft' ? 8 : 0;
    if (e.victimLevel !== null && e.victimLevel < 30) score *= 10;
    base += score;
  }
  const minutes = base * (1 + infamy / 1000);
  return pirate ? 40 : minutes;
}

const SENTENCE_RATE: Record<number, number> = { 2: 0.2, 3: 0.5, 4: 0.8, 5: 1.0, 6: 1.2 };

// mostVoted: jury option index. 0 and 1 are not guilty; no votes defaults to 3.
function sentence(jailTime: number, mostVoted: number): { guilty: boolean; minutes: number } {
  const rate = SENTENCE_RATE[mostVoted];
  if (mostVoted <= 1 || rate === undefined) return { guilty: false, minutes: 0 };
  return { guilty: true, minutes: Math.round(jailTime * rate) };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/rf003-aamu-justice.ts) exited 0.

## 5. Lands in

- TARGET `origins/server/justice.ts` (new module): the meter, infamy and verdict live on the server with the one ledger; the nameplate badge and the Wanted tag are client views. This is server rules, not fight code, so it does not go in src/fight.
- Parity-checklist row 17 (death/respawn): the arrest on death and the jail teleport on a verdict are death-and-respawn rules. The hint was row 21 (catalogue fields); the data fields below go in the catalogue, but the rule itself is row 17.
- today: no justice module found in this session's reading (not checked in Frankendom's repo).
- Reuse tag: rewrite-from-idea (LGPL-3.0 / GPL-3.0 files present; clean-room only)
- Brief rule served: 1 (one ledger: meter and infamy live on the server); rules 7-9 n/a

## 6. Gaps and risks

- Clean-room only. Licence per README is LGPL-3.0-or-later and the repo also ships GPL and MIT files; the code is not translated.
- Defect 1, cap overwritten by a cast: `AddCrime` writes `CrimePoint = short.MaxValue` (`Character.cs` 2887), then the `if/else` at 2889-2895 is not chained to that cap, so it runs `CrimePoint = (short)newAmount` (2895). For a sum above 32767 the cast wraps to a negative value and the setter (122) stores 0. So an overflow resets the meter to zero, the opposite of the comment. fix: clamp once, as in the sketch, and test a 40000 add.
- Defect 2, integer division: `JailTime *= (1 + (Defendant.InfamyPoint / 1000));` (`TrialData.cs` 123) steps the multiplier at every 1000 infamy (1000 gives x2, 999 gives x1). The source comment gives the intent as a smooth (crimePoints / 5) * (1 + infamy / 1000). fix: float infamy term, or a data table of steps.
- Defect 3, stale comment: the rates and the example line (`TrialData.cs` 434-435) do not match the multipliers at 449-465. The code is what runs. fix: keep one table as data and delete the comment.
- Defect 4, level penalty depends on who is online: the victim is found with `WorldManager.Instance.GetCharacterById` (`TrialData.cs` 114). An offline victim gives null, so the x10 penalty (117) is skipped and the jail depends on the server's online state at arrest. fix: store the victim's level on the evidence record when the crime happens.
- Defect 5, tie rule is implicit: a tie goes to whichever option the dictionary reached first (`TrialData.cs` 424, strict `>`). fix: an explicit tie rule (for example not guilty on a tie).
- Defect 6, unknown vote index: options 7 and above would be treated as guilty by `mostVoted > 1` (431) while the switch default gives zero minutes (sentence 0), so they take the guilty path with the 10-second minimum. Whether the client can send them is not read. fix: reject any index outside 0-6.
- Bounty money is a stub: the bounty list packet sends a fixed `BountyAmount = 1000000` (`CSNaviOpenBountyPacket.cs` 31). Nothing computes a bounty from crime points, so the bounty idea is not transferable from this donor.
- No guards: the donor's arrest is by a player who kills a wanted character. No NPC guard AI was found in the reading. Frankendom's guard spawns (zone row) have no model here.
- Karma and fame: this donor has no karma. The nearest is PvP honor (`CharacterCombat.cs` 210-275): Conflict gives 10 solo, or 6 to the killer and 4 to each online assist; War gives 20, or 16 and 4. A solo fallback runs when no assist is online (not read beyond the branch). Not in this note's mechanism; a separate idea if Lead wants a fame rule.
- Death wait escalation (`CharacterCombat.cs` 31-32): 15, 30, 60 ... 240 seconds, reset after 5 minutes without dying. That is the death-respawn topic (DR), not this one; not adopted here.
- Not read: the trial jury timers and vote collection (`TrialData.cs` 132-400), the trial step machine, `CharacterManager.AddOfflineCrimePoints`, the csproj overflow setting that decides whether the cast wraps or throws.

Reuse tag: rewrite-from-idea (LGPL-3.0 / GPL-3.0 files present; clean-room only)
Brief rule served: 1 (one ledger: meter and infamy live on the server); rules 7-9 n/a

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN. 50/3000 thresholds, CheckWantedThreshold order, AddCrime wrap defect, arrest rule, jail score 20/8/0, x10 under 30, int-division infamy, sentence rates, default 3, clearing, LGPL README all match.
- No errors or missed items found.
