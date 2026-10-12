# ModernUO (live-ops-events-lore-delivery, cell 3)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/Titles.cs` | Licence: GPL-3.0 (LICENSE read: GNU General Public License, Version 3, 29 June 2007; copyright ModernUO Development Team) | C# (.NET) | symbol `Titles.ComputeTitle` (with `Titles.AwardFame`, `Titles.AwardKarma`, `Titles.ComputeKillAwards`, `BaseCreature.GetLootingRights` and the kill-award distribution in `BaseCreature.OnDeath`)

Checked: category_no 32 (live-ops-events-lore-delivery), list cell 3 of 3. Read in full: `Misc/Titles.cs` (1-467); `Mobiles/BaseCreature.cs` 134 (`DamageStore.CompareTo`), 3344-3455 (`GetLootingRights`), 3546-3662 (kill-award distribution). Callers checked by grep: `ComputeTitle` (Profile.cs:32, Paperdoll.cs:16); `AwardKarma` (about 15 sites: spells, thefts, guards, corpses, bandaging, begging, poisoning, hats); `AwardFame` (ResurrectGump.cs:265, BaseVendor.cs:1144, BaseEscortable.cs:642, EscortObjective.cs:146, ReportMurdererGump.cs:67); `ComputeKillAwards` (BaseCreature.cs:3548, ReportMurdererGump.cs:63). Not read: the localisation strings behind the message numbers; `DamageEntry` insertion order and the order of `ValueLinkList.ByDescending` (only its signature, Server/Collections/ValueLinkList.cs:498); the body of `Mobile.Title`; `PlayerMurderSystem.cs` beyond its `SetKarma` call (301). The fame band thresholds (lines 33, 50, 67, 84, 101) are read but too short to quote, so they carry no receipt. Confidence: high on the title and reputation code; medium on the kill-award distribution, which is read from the code but not run. camera_scope n/a.

## 1. Mechanism

- Two axes, one string. A player's nameplate text is built from fame (0 to 15000, `MinFame`/`MaxFame` at lines 10-11) and karma (-15000 to 15000, lines 13-14), plus an optional champion title, a custom title, and a skill title.
- Order of operations in `ComputeTitle` (290-373):
  - (a) Show the fame and karma prefix only if the target shows fame titles or the viewer is the target (299); otherwise show only the name (340).
  - (b) Fame band: walk the five fame bands in order and take the first whose threshold covers fame (301-305). The last band takes the rest (above 10000).
  - (c) Karma band: inside that fame band, walk the eleven karma entries and take the first whose threshold covers karma (309-313). All five fame bands use the same eleven karma thresholds (lines 36-46, 53-63, 70-80, 87-97, 104-114).
  - (d) Name: prefix + name (328); from fame 10000 the word Lord or Lady is inserted before the name (315-325).
  - (e) Champion title, if the target has one, replaces everything after the name and returns early (343-354).
  - (f) Otherwise a custom title, if set, is appended (358-361); else a skill title is appended if the viewer may see it (362-370). The skill title is shown to others only from fame 5000 (297); the owner always sees it.
  - (g) Skill title: the highest skill must be at least 30.0 (fixed point 300, line 379). The level label is `m_Levels[index, column]` (424), where index = (min(fixed point, 1200) - 300) / 100, so 0 (Neophyte) to 9 (Legendary) (438-440). The column is 1 for Bushido and 2 for Ninjitsu, which changes the top two labels (Tatsujin, Kengo; Shinobi, Ka-ge). The female form replaces "man" with "woman" (384-387).
- Reputation changes, `AwardFame` (133-198) and `AwardKarma` (216-261). A gain is reduced by one hundredth of the current value, floored at zero (142, 232). A loss is increased by one hundredth of the current value (151, 241). A gain is blocked at the top of the range and a loss at the bottom (137, 146, 227, 236). The result is clamped (154-159, 244-249). Karma is signed, so a negative karma raises gains and reduces losses. Fame is never negative, so high fame only lowers gains and raises losses.
- Kill award, `ComputeKillAwards` (119-131). Fame = victim fame / 100; karma = -victim karma / 100 (121-122). Felucca under LBR adds 30 percent (124-127).
- Kill distribution, `BaseCreature.OnDeath` (3546-3660). Only when the creature is not summoned and does not disable kill awards (3546). Eligible attackers come from `GetLootingRights` (3344-3455): damage is summed per player; the first damager's total is multiplied by 1.25 (3423-3429); the list is sorted by damage, highest first (3433, CompareTo at 134); threshold = top damage / 16 when the creature has at least 3000 hit points, / 8 at 1000, / 4 at 200, else / 2 (3438-3444); a player has rights when damage is at least the threshold (3450).
- Recipients, for each eligible attacker (3559-3614). Pre-UOR (3568-3577): only the last killer gets the totals. Otherwise, in a party (3579-3605): each member gets the total divided by party size (3581-3582), and each eligible attacker in that party adds the shares again (3600). Solo (3606-3611): each eligible attacker gets the full totals (3609). Then `AwardFame` and `AwardKarma` run for each recipient (3652-3656).
- Tick: no loop. Titles are computed when a profile or paperdoll is opened (Profile.cs:32, Paperdoll.cs:16). Rewards run once, at creature death.

## 2. Key functions

- `ComputeTitle`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/Titles.cs` 290-373. The nameplate string.
- `AwardFame`: same file, 133-198. Gain or loss by fame band, clamp, message ladder.
- `AwardKarma`: same file, 216-261. The same shape for karma.
- `ComputeKillAwards`: same file, 119-131.
- `GetLootingRights`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 3344-3455. Eligibility by damage share.
- Kill-award distribution: same file, 3546-3662.

## 3. Numbers vs mechanism

| Quantity | Formula | Donor values (range) | file:line |
|---|---|---|---|
| Fame range | clamp to [0, 15000] | 0 to 15000 | Titles.cs:10-11 |
| Karma range | clamp to [-15000, 15000] | -15000 to 15000 | Titles.cs:13-14 |
| Fame bands | first band with fame <= threshold; last takes rest | thresholds 1249, 2499, 4999, 9999, catch-all from 10000 (read; too short to quote) | Titles.cs:33, 50, 67, 84, 101 |
| Karma bands | first band with karma <= threshold; last takes rest | -10000, -5000, -2500, -1250, -625, 624, 1249, 2499, 4999, 9999, catch-all | Titles.cs:36-46 (band 0; same in bands 1-4) |
| Epithet matrix | 5 fame bands x 11 karma bands = 55 prefixes | e.g. band 0 karma -10000 "The Outcast "; band 0 neutral "" | Titles.cs:30-117 |
| Lord/Lady | fame >= 10000 | from 10000 | Titles.cs:315 |
| Skill title gate | show to others from fame 5000 | 5000 | Titles.cs:297 |
| Skill threshold | highest skill >= 30.0 | fixed point 300 | Titles.cs:379 |
| Skill label index | (min(fp, 1200) - 300) / 100 | 0 (30.0) to 9 (120.0) | Titles.cs:438-440 |
| Fame gain | max(offset - fame/100, 0); blocked at fame >= 15000 | a +20 award stops paying at fame 2000 (20 x 100); a +40 award at 4000 | Titles.cs:137, 142 |
| Fame loss | min(offset - fame/100, 0); blocked at fame <= 0 | a -10 loss at fame 5000 becomes -60 | Titles.cs:146, 151 |
| Karma gain/loss | same rule on karma; negative karma raises gains and lowers losses | karma -5000: a +40 gain becomes +90 | Titles.cs:227-241 |
| Kill fame | victim fame / 100 | e.g. victim fame 3000 gives 30 | Titles.cs:121 |
| Kill karma | -victim karma / 100 | e.g. victim karma +5000 gives -50 | Titles.cs:122 |
| Felucca LBR bonus | totalFame / 10 * 3 (integer, then times 3) | 9 gives +0 (intent +2.7); 10 gives +3 | Titles.cs:124-126 |
| Eligibility threshold | top damage / 16, /8, /4, /2 by creature hit points (3000+, 1000+, 200+, else) | top 800 damage on a 3000-hp creature gives threshold 50 | BaseCreature.cs:3438-3444 |
| First damager boost | damage x 1.25 | 1.25 | BaseCreature.cs:3428 |
| Party share | total / party size (integer) | 10 fame over 3 members = 3 each (1 lost) | BaseCreature.cs:3581 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's reputation rule and its band lookup: gain reduced by one hundredth of the current value (floored at zero), loss increased by it, C# integer division (truncation toward zero), clamp, and the two-axis band lookup that picks the epithet. It changes four things: (1) it takes the band tables as data (`NameplateTable`), where the donor hard-codes them; (2) it returns the epithet only, not the full string, so the caller adds the name, Lord or Lady, the custom or skill title; (3) it omits the message ladder, the Felucca bonus, the karma lock, the pre-UOR and party kill split, the first-damager boost and the eligibility threshold (those stay in the kill sketch, not written here); (4) it returns the skill level index for 30.0 and up and throws below it, where the donor returns no title.

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// C# integer division truncates toward zero; match it.
const idiv = (a: number, b: number): number => Math.trunc(a / b);

export const MIN_FAME = 0;
export const MAX_FAME = 15000;
export const MIN_KARMA = -15000;
export const MAX_KARMA = 15000;

// Reputation change for fame or karma. A gain is reduced by 1% of the current value (never below 0);
// a loss is increased by 1% of the current value. For karma the signed 1% pulls the value toward zero
// from both sides. Gains are blocked at the top of the range, losses at the bottom. The result is clamped.
export function applyRep(current: number, offset: number, min: number, max: number): number {
  let o = offset;
  if (o > 0) {
    if (current >= max) return current;
    o = Math.max(o - idiv(current, 100), 0);
  } else if (o < 0) {
    if (current <= min) return current;
    o = Math.min(o - idiv(current, 100), 0);
  }
  return Math.min(Math.max(current + o, min), max);
}

// Band index: the first band whose upper bound is >= value. The last band takes every value above it.
export function bandIndex(value: number, upperBounds: number[]): number {
  for (let i = 0; i < upperBounds.length; i++) {
    if (value <= upperBounds[i] || i === upperBounds.length - 1) return i;
  }
  throw new Error("upperBounds must not be empty");
}

export interface NameplateTable {
  fameUpperBounds: number[];  // ascending; last entry is the catch-all band
  karmaUpperBounds: number[]; // ascending; last entry is the catch-all band
  epithets: string[][];       // epithets[fameBand][karmaBand]; empty string = no prefix
}

// Prefix shown before the name: the two-axis band lookup (rank band x honour band).
export function nameplatePrefix(fame: number, karma: number, t: NameplateTable): string {
  return t.epithets[bandIndex(fame, t.fameUpperBounds)][bandIndex(karma, t.karmaUpperBounds)];
}

// Skill title is shown to others only from a fame threshold; the owner always sees it.
export function showSkillTo(viewerIsOwner: boolean, showFameTitle: boolean, fame: number, fameGate = 5000): boolean {
  return showFameTitle && (viewerIsOwner || fame >= fameGate);
}

// Skill level index from a fixed-point skill value (300 = 30.0, capped at 1200 = 120.0). Index 0..9.
export function skillLevelIndex(fixedPoint: number): number {
  if (fixedPoint < 300) throw new Error("skill below 30.0 has no level");
  return idiv(Math.min(fixedPoint, 1200) - 300, 100);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` run on the VPS on the file above (copied to /tmp): exit 0, no errors.

## 5. Lands in

- TARGET `src/fight/kill-reward.ts` (new module): the server-side award for a verified kill (fame and honour per eligible attacker, the reputation rule above, and the epithet lookup used by the nameplate). Parity-checklist row 18 (loot roll and XP award). The nameplate rendering itself is client presentation (HUD, row 14); that is a follow-up, not a second row here.
- today: `src/fight/kill-reward.ts` does not exist yet; the award is not built in the Frankendom repo (not read in this pass).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: server-verified kills (the award is decided on the server from the verified kill); one ledger (fame and honour sit on the one character); MAX_ATTACKERS = 3 (the eligibility split is the many-on-one rule, to be set at 3 attackers).

## 6. Gaps and risks

- GPL-3.0: clean-room, shape only. The sketch is written from the mechanism, not translated.
- Defects found in the donor (idea kept, fix stated):
  - Party double count. The party branch adds the shares once per eligible attacker in the same party (3579-3602 inside the loop over `list` at 3559). A party with two eligible attackers therefore hands out two shares of the same total. fix: compute each party's share once per kill and sum to the kill total.
  - Not conserved in the solo branch. Each eligible attacker gets the full totals (3609), so the total handed out grows with the number of attackers. Whether this is intended is not stated in the donor. fix: choose one rule: split the total by damage share (MAX_ATTACKERS = 3), carry the integer remainder, and assert that the sum equals the kill total.
  - Integer division before a multiply. The Felucca bonus divides before the 30 percent multiply (126), so a base of 9 gives no bonus. The party share truncates (3581-3582). fix: multiply first, round once, carry the remainder.
  - First damager. The boost goes to `firstDamager` (3419, 3428). That variable is set each time the loop visits an entry, so it is the last one visited. Whether that is the first attacker depends on the insertion order of `DamageEntry` and on `ByDescending`, neither read. Marked not verified; do not port the boost until the order is tested.
  - Zero change says "lost". `SendKarmaMessage` maps any offset that is not positive or below -10 to the default arm, "You have lost a little karma" (274: `=> 1019063`), so an offset of 0 prints that line. `AwardKarma` sends the message whenever `message` is true, including when a blocked gain was clamped to 0 (255-257). The fame ladder has no default arm (165-196), so it does not have this defect. fix: return without a message when the applied change is 0.
- Frankendom epithets. This donor's titles are generic words ("The Honorable", "The Wicked"). The Frankendom nameplate epithet must come from the legends (legends-rule: myth, not scripture; folk heroes only as honourable figures, never villains), chosen per rank band and honour band. No legend text was taken from this donor.
- Pacing ceiling. The 1 percent rule stops gains at a fixed fame: a +20 award stops paying at fame 2000 (2000 / 100 = 20), a +40 award at 4000. A progression curve needs the award size and the ceiling set together, as zone data. Frankendom should tune it so a player who keeps winning still reaches the top epithet band in a planned number of kills.
- Localisation. The message numbers (1019051-1019066) are read but the strings are not. Frankendom's HUD must carry its own text.
- Long nameplates on a 375 px screen: the donor does not truncate the title in this file (not read elsewhere). The nameplate needs a length rule on the client.

Fold-in (HUD, accessibility): the epithet is plain words in the name line ("The Dread Name"), so a screen reader reads the rank without any icon. The donor shows the same string in the profile and paperdoll (Profile.cs:32, Paperdoll.cs:16); other surfaces (chat, overhead names) were not read. The donor has no colour rule for it. Frankendom's nameplate should show the same words, and the 375 px width needs a truncation rule (not in the donor).

Fold-in (progression pacing): the reputation rule is the pacing curve. Fame gains stop at 100 times the award size (a +20 award stops at 2000), so the epithet bands cannot be reached by repeated small awards. Frankendom should set the band thresholds and the award sizes together as zone data, and test that a typical kill count reaches each band.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: server-verified kills; one ledger; MAX_ATTACKERS = 3

Best transferable idea: The nameplate epithet is a two-axis band table (rank band x honour band), and the reputation gain shrinks as the current value grows, so the top epithet has to be earned.

Decision (proposed): adapt - keep the two-axis epithet table and the diminishing gain as server data for the legend epithet on the nameplate and the kill card, with the kill split rebuilt so the total is conserved and the party share is computed once.
Acceptance: A server test awards one verified kill with three eligible attackers and asserts that the fame and honour handed out sum to the kill total (no party double count); a nameplate test sets fame to 1249 and 1250 and honour to -625 and -624 and asserts that the epithet changes exactly at each edge; a +20 award at fame 2000 pays nothing.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No false claims found; licence, fame and karma bands, ComputeTitle order, AwardFame and AwardKarma, looting rights and party double count all verified against the code.
- Missed (minor): the skill title also requires beheld.Player (Titles.cs ~362) and GetHighestSkill has an AOS lock tie-break (~395-410).
- Missed (minor): pet damage is credited to the master through the Responsible list (BaseCreature.cs 3353-3387), so owners of damaging pets get looting rights.
- Missed (minor): the karma-lock rule (CheckKarmaLock, Core.UOTD) is only mentioned as omitted. None of these change the conclusions.
