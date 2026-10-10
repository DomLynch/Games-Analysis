# gawric-Unity-Client-for-L2J (progression, cell 10)

Donor: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/CharacterInterlude/Appearance/MaxLevelExp.cs` | Licence: Apache-2.0 (repo LICENSE, "Version 2.0, January 2004"; adaptation allowed with notice) | C# (Unity) | symbol `LevelServer` (`GetExp`, `GetLevelFromExp`, `GetExpToNextLevel`)

Checked: `LevelServer` in MaxLevelExp.cs read in full (142 lines). Callers read: PlayerStats.cs 1-120 (`ExpPercent`), UserInfoDto.cs 25-75 (exp block 39-43), CharacterInfoWindow.cs 232-250 and 295-330 (XP label and bar), CharSelectWindow.cs 255-270, EntityActionVisual.cs 150-168, PlayerWorldApply.cs 150-166. Grep-line only, not read in full: CharSelectedDto.cs 67, CharSelectInfoPackage.cs 71 and 75, GlobalEffectsHandler.cs 24-27 (short, read via grep). `GetLevelFromExp` and `GetExpToNextLevel` have no callers outside MaxLevelExp.cs (whole-tree grep). The XP award (kill XP, SP grant) is NOT in this client: a grep of Scripts for XP-gain and award names found no award code. Equivalence probe: the sketch's `levelFromTotalXp` against a port of the donor's `GetLevelFromExp` scan, 200,016 probes (0 mismatches), run on the VPS. Confidence: high on the curve and the lookup; high on the bar formula (read); the on-screen effect was not seen (not run). Camera: n/a.

Best transferable idea: keep one number (total XP on the ledger) and derive the level from a cumulative threshold table, so the level can never disagree with the XP.
Decision (proposed): adapt - take the cumulative table and the level lookup, but compute the XP bar within the current level and keep the award on the server; the donor's bar is cumulative and falls back at each level-up.
Acceptance: at 48229 total XP (level 10 start) the XP bar reads 0% of level 10, not about 68%; a server test asserts levelFromTotalXp(71200) = 10 and levelFromTotalXp(71201) = 11.

## 1. Mechanism

- A static table `LEVEL[0..81]` (MaxLevelExp.cs 10-94) holds the total XP needed to REACH each level, not the gap between levels. Index 0 is a -1 placeholder, index 1 is 0, level 10 is 48229 (line 22), level 80 is 4200000000 (line 92), level 81 is 6299994999. The table is strictly increasing from index 1 (checked when the sketch was built).
- `GetExp(level)` returns `LEVEL[level]` for a valid level (1..81, `IsValidLevel` 104-107) and -1 otherwise (98-101).
- `GetLevelFromExp(totalExp)` (116-128): a negative total returns 1; otherwise it scans level = 1..81 and returns `level - 1` at the first level whose threshold is above the total (123-124); a total at or above the top threshold returns 81 (127). Order: scan up, stop at the first bigger threshold, step back one.
- `GetExpToNextLevel(level, currentExp)` (130-141): clamps the level to 1..81, returns 0 at the cap, otherwise `LEVEL[level+1] - currentExp` clamped at 0. No caller in the donor.
- The client does not award XP. `UserInfoDto` reads the total exp as a long from the server packet (39), stores it (42), and sets `MaxExp = GetExp(level + 1)` (43). Character select does the same (CharSelectedDto 67, CharSelectInfoPackage 71).
- Level-up is server-driven. A social action with id 15 raises `EventBus.LevelUp` for an entity actor (EntityActionVisual.cs 161-162) and for the player (PlayerWorldApply.cs 160-161). `GlobalEffectsHandler` plays special effect 99999 (`SpecialSkillType.LevelUp`, SpecialSkillType.cs 6) on that event (GlobalEffectsHandler.cs 24-27).
- Display: `CharacterInfoWindow` sets the label to `ExpPercent(level + 1)` (241) and the bar width to `315 * Exp / MaxExp` (301, 303-309). `ExpPercent(level)` (PlayerStats.cs 74-91) returns `100 / GetExp(level) * Exp`, rounded to 2 places (81-87); 0 when Exp is 0, and 100 when the threshold is 0 and Exp is above 0 (76-82). So the bar and label both divide the total XP by the cumulative threshold of the NEXT level.
- Numbers as the code computes them (arithmetic from the formulas; not seen running): at 48229 total XP (level 10 start) the bar is 48229 / 71201 = 0.677 (about 68%, 213 px of 315). At 71200 (still level 10) it is 0.99999. At 71201 (level 11) it is 71201 / 101676 = 0.700 (about 70%, 221 px). So the bar falls back to about 70% at every level-up.

## 2. Key functions

- `LevelServer.GetLevelFromExp`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Game/CharacterInterlude/Appearance/MaxLevelExp.cs` 116-128 (linear scan from level 1; returns level - 1 at the first threshold above the total).
- `LevelServer.GetExp` and `IsValidLevel`: same file, 96-107 (table lookup; -1 when invalid).
- `LevelServer.GetExpToNextLevel`: same file, 130-141 (remaining XP to the next cumulative threshold; unused in the donor).
- `PlayerStats.ExpPercent(int level)`: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Combat/Stats/PlayerStats.cs` 74-91 (percent of the threshold passed in).
- Server exp read: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/Networking/ClientLibrary/Packet/Dto/Incoming/Game/UserInfoDto.cs` 39-43.
- XP bar and label: `/mnt/frankendom-donors/gawric-Unity-Client-for-L2J/l2-unity/Assets/Scripts/UI/Game/CharacterInfoWindow.cs` 232 (`UpdateBarsInterlude`), 239-241 (label), 301-309 (bar).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cumulative XP threshold table, one entry per level; level = highest threshold at or below the total | The 81-entry table (theirs, MaxLevelExp.cs 10-94): level 10 = 48229, level 20 = 835854, level 80 = 4200000000, level 81 = 6299994999 |
| Level cap | 81 (theirs, MaxLevelExp.cs 8) |
| Negative total XP maps to level 1 | Rule as read (MaxLevelExp.cs 118-119) |
| Next-level remaining XP, clamped at 0; 0 at the cap | None (the subtraction and the clamp) |
| XP bar = share of the current level earned | Donor does NOT do this: its bar is total / next cumulative threshold (CharacterInfoWindow.cs 303). Sketch adapts it. |
| Invalid level sentinel | -1 (theirs, MaxLevelExp.cs 98-101). Not a value Frankendom should use. |

## 4. TypeScript sketch

simplified: keeps the donor's cumulative table (copied from MaxLevelExp.cs 12-93 as numbers), its level lookup (written as a break-on-first-larger loop; same result on this strictly increasing table, checked by the probe above) and a remaining-XP function. It omits the donor's -1 invalid-level sentinel, the client-side display, the social-action 15 level-up event and effect id, and the packet reads. It deliberately changes the donor's bar: `levelProgress` divides by the span of the current level, where the donor divides by the next cumulative threshold.

```ts
// Licence: Apache-2.0 (donor LICENSE). Clean-room shape; the threshold numbers are the donor's table, kept as data.
// Total XP (the ledger value) needed to REACH each level. Index 0 is unused; index 1 is level 1.
const MAX_LEVEL = 81;
const XP_TO_REACH: readonly number[] = [-1, 0, 68, 363, 1168, 2884, 6038, 11287, 19423, 31378, 48229, 71201, 101676, 141192, 191452, 254327, 331864, 426284, 539995, 675590, 835854, 1023775, 1242536, 1495531, 1786365, 2118860, 2497059, 2925229, 3407873, 3949727, 4555766, 5231213, 5981539, 6812472, 7729999, 8740372, 9850111, 11066012, 12395149, 13844879, 15422851, 17137002, 18995573, 21007103, 23180442, 25524751, 28049509, 30764519, 33679907, 36806133, 40153995, 45524865, 51262204, 57383682, 63907585, 70852742, 80700339, 91162131, 102265326, 114038008, 126509030, 146307211, 167243291, 189363788, 212716741, 237351413, 271973532, 308441375, 346825235, 387197529, 429632402, 474205751, 532692055, 606319094, 696376867, 804219972, 931275828, 1151275834, 1511275834, 2099275834, 4200000000, 6299994999];

// Level from the ledger's total XP: the highest level whose threshold is <= xp (level 1 at 0 or below).
export function levelFromTotalXp(totalXp: number): number {
  let level = 1;
  for (let l = 2; l <= MAX_LEVEL; l++) {
    if (totalXp >= XP_TO_REACH[l]) level = l;
    else break;
  }
  return level;
}

// XP still needed for the next level; 0 at the cap.
export function xpToNextLevel(totalXp: number): number {
  const lvl = levelFromTotalXp(totalXp);
  if (lvl >= MAX_LEVEL) return 0;
  return Math.max(0, XP_TO_REACH[lvl + 1] - totalXp);
}

// Share of the CURRENT level already earned, 0..1 (adapt: the donor bar divides by the next cumulative threshold).
export function levelProgress(totalXp: number): number {
  const lvl = levelFromTotalXp(totalXp);
  if (lvl >= MAX_LEVEL) return 1;
  const lo = XP_TO_REACH[lvl];
  const hi = XP_TO_REACH[lvl + 1];
  return Math.min(1, Math.max(0, (totalXp - lo) / (hi - lo)));
}
```

## 5. Lands in

- TARGET `src/fight/progression.ts` (new module): total XP on the ledger is the only stored value; `levelFromTotalXp` derives the level, `xpToNextLevel` and `levelProgress` feed the HUD. The award itself (kill XP) belongs to the fight engine, not this file. Parity-checklist row 18 (loot roll and XP award).
- Reuse tag: adapt-shape (Apache-2.0: adaptation allowed with notice). Do NOT copy the table: it is Lineage II's curve; Frankendom should author its own numbers as data.
- Brief rule served: one ledger (level is a view of total XP, never stored separately); zones as data (the curve is a data table, not code).

## 6. Gaps and risks

- The donor is the client only. The award amounts and the server rule for XP and SP are not in this repo, so this donor gives the curve and the lookup, not the reward formula. That is why depth is thin.
- Level and total XP are both stored on the client (UserInfoDto.cs 38 for Level, 39-43 for exp). Under Frankendom's one-ledger ruling the server stores total XP only; the level is derived and never sent as the source of truth.
- The bar is cumulative. Read from the formula (CharacterInfoWindow.cs 303), it drops from about 100% to about 70% at every level-up. Frankendom should not copy this; the sketch's `levelProgress` is the intended behaviour, but it is not a donor behaviour and needs a Frankendom test.
- Level-up is announced by social action 15 (EntityActionVisual.cs 161, PlayerWorldApply.cs 160-161), a packet reused for an animation. Frankendom should raise a state event from the fight engine, not reuse a social action.
- Negative risk in `ExpPercent`: called with level 82 at the cap, `GetExp` returns -1, so `100 / -1 * Exp` is negative (arithmetic, not run). The UI guard at CharacterInfoWindow.cs 239 (`stats.MaxExp > 0`) hides it. Frankendom needs an explicit cap branch, not a guard in the view.
- Licence: Apache-2.0 allows adaptation with a notice. The numbers are Lineage II game data; the shape transfers, the numbers should not.
- `GetExpToNextLevel` is present but unused in this donor; it is a helper that nothing exercises. Frankendom must test it if adopted.
