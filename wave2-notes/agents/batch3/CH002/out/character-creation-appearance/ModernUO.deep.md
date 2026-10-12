# ModernUO (character-creation-appearance, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Character Creation/CharacterCreation.cs` (with `Projects/UOContent/Misc/RaceDefinitions.cs`, `Projects/Server/Race.cs`, `Projects/UOContent/Misc/NameVerification.cs`, `Projects/UOContent/Misc/ProfessionInfo.cs`, `Distribution/Data/Professions/AOS/prof.txt`) | Licence: GNU GPL v3 (`/mnt/frankendom-donors/ModernUO/LICENSE`, line 2: "Version 3, 29 June 2007"; copyleft, clean-room, shape only) | C# | symbol `OnCharacterCreated`

Checked: Read in full: `OnCharacterCreated` (200-301), `SetStats` (399-415), `SetName` (417-427), `ValidateSkills` (429-474), `SetSkills` (476-~495); `Race.cs` (whole file); `RaceDefinitions.cs` (whole file); `NameVerification.cs` (whole file, `Validate` overloads and `ContainsExceptions`); `ProfessionInfo.cs` (whole file); `BuiltInRng.Next` (line 34) and `Utility.Random(from, count)` (line 890); `Mobile.Race` getter (395-404). Depth: full for the validators and their order. Not read: `GiveProfessionItems` item lists (501-716), `AddSkillItems`, `ProfanityProtection.Disallowed` (only referenced), the era-folder selection `ExpansionInfo.GetEraFolder` (so which `prof.txt` loads is not confirmed), the packet parsing that fills `args`, and the caller of `CharacterCreatedEvent` (`IncomingAccountPackets.cs`, not read). Only the AOS `prof.txt` was read in detail (Paladin 13-15, Necromancer 31-33, Warrior 48-50, Mage 65-67, Blacksmith 82-84 for stats; skill rows read for Paladin, Necromancer and Warrior); the SE, SA and None tables were summed with awk only, not read row by row. Callers of `ValidateSkills`: only `SetSkills` (one caller, read). Faces and scars: a grep for `scar` under `Projects/**/*.cs` returned only unrelated hits in the first five lines shown (Scarecrow, weapons, gift items); a grep for face-sculpt terms returned nothing; no face or scar appearance system was found. Confidence: high for the validators and the order; medium for the profession-template outcome (depends on the era table that loads). camera_scope: not applicable.

Best transferable idea: Validate a character build on the server against an allow-list and a fixed budget (stats 10-60 with one total, skills capped at 50 with a total of 100 or 120), and refuse with a reason instead of silently resetting.
Decision (proposed): adapt — keep the server-side budget and allow-list checks; replace the silent resets with refusals that name the reason, count every granted point, and clip skin with the chosen race, because silent fallbacks would hide errors from a phone player.
Acceptance: the create screen shows "x of 90" and "x of 100" and keeps Create disabled until both match; a server test asserts that a skill total of 99 or a skill of 51 is refused with skill-total or skill-cap, and that a name containing "!" or starting "gm" is refused.

## 1. Mechanism

- One entry point, `OnCharacterCreated` (200), turns a creation request into a `PlayerMobile`. Order as the code runs for a Player-level account: (a) profession index checked against the table (202); (b) the mobile is created (`CreateMobile`, 181-198) and sex set (226); (c) skin hue is clipped at 227 with `newChar.Race`, which is still the default race because the chosen race is only assigned at 236; (d) the name is set (230, via `SetName`, which trims at 419 and validates); (e) backpack; (f) race: the chosen race is used if the core expansion meets its `RequiredExpansion`, otherwise Human (235-236); (g) stats (251) and skills (252), with the profession's template replacing the client's values when a profession is chosen (`profession?.Stats ?? args.Stats`, `profession?.Skills ?? args.Skills`); (h) hair id validated with the chosen race (255), hair hue clipped with the chosen race (258); beard the same (261-262).
- Stats: `SetStats` (399-415). Each stat must be 10 to 60 (407) and the three must sum to 90 when the client has the `NewCharacterCreation` protocol flag, otherwise 80 (401). On any failure all three are set to 10 (409-411, silently), then `InitStats` (414).
- Skills: `SetSkills` (476) calls `ValidateSkills` first; if it fails, it returns and nothing is applied. `ValidateSkills` (429-474), per entry in client order: value must be 50 or less and the name must be in a whitelist of 55 names (437, list at 20-76); race and era removals zero the entry in place (451-454: Archery removed for gargoyles, Throwing removed for everyone else, plus AOS/SE/SA gates); the entry's value is still added to the running total (459) even when the entry was zeroed; a name listed twice with a value above 0 is refused (466); at the end the total must be exactly 100 or 120 (473). Applied values: `BaseFixedPoint = value * 10` (495), so a skill of 50 becomes 500 tenths.
- Name: `SetName` (417-427) trims (419) and calls `NameVerification.ValidatePlayerName` (106 calls `Validate` with length 2-16, letters allowed, digits refused, exceptions = space, dash, period, apostrophe, at most one exception in a row, no exception first). A failed name is replaced silently by "Generic Player" (423). Start-prefix block (206): a name beginning with seer, counselor, gm, admin, lady or lord is refused. Disallowed words (profanity plus job words, the `Disallowed` array at NameVerification.cs 46-79) are refused only at word boundaries (264).
- Race appearance: one abstract `Race` class (Race.cs) holds an id, a race index with `RaceFlag = 1 << raceIndex` (16), male and female bodies, male and female ghost bodies, and the expansion it needs. `Race.Races` has 256 slots (29). `Body` returns the alive or ghost body (91). Each race implements its own validators and clippers: `ValidateHair`, `ValidateFacialHair`, `RandomHair`, `RandomFacialHair`, `ClipSkinHue`, `RandomSkinHue`, `ClipHairHue`, `RandomHairHue`. Three races (RaceDefinitions.cs):
  - Human (29-134): bodies 400/401, ghost 402/403; skin clamped to 1002-1058 (115-118); random skin 57 values from 1002 (121); hair hue clamped to 1102-1149 (127-130); random hair 48 values from 1102 (133); hair ids in ranges (45 onward); beard male only.
  - Elf (158 onward): bodies 605/606, ghost 607/608; skin is a whitelist of 32 hues with fallback to the first entry (210-216); hair hue whitelist of 51 hues with fallback (231); no facial hair (202); random skin from the whitelist with the 0x8000 bit (219).
  - Gargoyle (247 onward): bodies 666/667, ghost 402/403 (the same ghost ids as Human); skin is not clipped at all (294); random skin 25 values from 1755 (296); hair hue whitelist of 18 horn hues (duplicates present) with fallback to the first (298-311 region); male beard list only.
- Random ranges: `Utility.Random(from, count)` draws from `BuiltInRng.Next(from, count)` (Utility.cs 890), which returns `minValue + Generator.Next(count)` (BuiltInRng.cs 34), so the values lie in `[from, from + count)`. The random ranges in section 3 follow from that.
- Tick and timing: not applicable. This is a one-shot server handler; `WelcomeTimer` (301) is the only timer and is cosmetic.
- Profession templates: `ProfessionInfo` (static constructor) reads a `prof.txt` table. A profession loads only if its stats sum is at least 80 and its skills sum is at least 100 (101). When a profession is chosen its stats and skills replace the client's (251-252).

## 2. Key functions

- `OnCharacterCreated`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Character Creation/CharacterCreation.cs` 200-301. Creates the mobile, clips skin with the default race (227), sets race (236), stats (251), skills (252), hair and beard (255-261).
- `SetStats`: same file 399-415. Range 10-60 (407), sum 90 or 80 by protocol flag (401, 407), silent reset to 10 (409-411).
- `ValidateSkills`: same file 429-474. Whitelist and cap (437), race and era removal (451-454), total (459), duplicate (466), total must be 100 or 120 (473).
- `SetSkills`: same file 476-~495. Refuses the whole list when `ValidateSkills` fails; applies `value * 10` (495).
- `NameVerification.Validate` family: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/NameVerification.cs` 106 (player-name call), 157 (length), 190 (digit refusal), 206 (start prefix), 209-250 (`ContainsExceptions`), 264 (word boundary).
- `Race` base: `/mnt/frankendom-donors/ModernUO/Projects/Server/Race.cs` 29 (table), 39 (`AllowAllRaces = 0x7`), 91 (`Body`).
- Three race classes: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Misc/RaceDefinitions.cs` Human 26-134, Elf 136-236, Gargoyle 237-313 (ranges as listed above).

## 3. Numbers vs mechanism

| Rule | Formula or range | Donor value | file:line |
|---|---|---|---|
| Stat floor and ceiling | 10 <= stat <= 60 | 10, 60 | CharacterCreation.cs:407 |
| Stat budget | str + dex + int == budget | 90 if `NewCharacterCreation` else 80 | CharacterCreation.cs:401 |
| Stat fallback | any failure sets 10/10/10 | 10 | CharacterCreation.cs:409-411 |
| Skill cap per entry | value <= cap | 50 | CharacterCreation.cs:437 |
| Skill total | total in {100, 120} | 100 or 120 | CharacterCreation.cs:473 |
| Skill applied | BaseFixedPoint = value x 10 | x10 (tenths) | CharacterCreation.cs:495 |
| Name length | 2 <= len <= 16 | 2, 16 | NameVerification.cs:106, 157 |
| Name exception run | run of exception chars <= 1 | 1 | NameVerification.cs:106, 233, 244 |
| Name start prefixes | refused if starts with | seer, counselor, gm, admin, lady, lord | NameVerification.cs:206 |
| Human skin clamp | clamp to [1002, 1058] | 57 values | RaceDefinitions.cs:115-121 |
| Human hair hue clamp | clamp to [1102, 1149] | 48 values | RaceDefinitions.cs:127-133 |
| Gargoyle random skin | [1755, 1780) | 25 values | RaceDefinitions.cs:296 |
| Elf skin whitelist | 32 entries, fallback to entry 0 | 32 | RaceDefinitions.cs:210-216 |
| Profession load gate | stats >= 80, skills >= 100 | 80, 100 | ProfessionInfo.cs:101 |
| AOS profession stats (read) | Paladin 30/25/25 = 80; Necromancer 25/20/45 = 90; Warrior 35/35/10 = 80; Mage 25/10/45 = 80; Blacksmith 60/10/10 = 80 | 80 or 90 | prof.txt lines 13-15, 31-33, 48-50, 65-67, 82-84 |
| Template vs budget | a template passes only if its sum equals the budget for that client | new client 90: four of five AOS templates fail; old client 80: the Necromancer fails | CharacterCreation.cs:251, 401, 407 with prof.txt above |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (stats, then skills, then name) but turns every silent reset into an explicit refusal with a reason. It omits hair and beard tables, the race expansion fallback, the profession templates and their load gate, the ghost bodies, the item grants (`AddSkillItems`), the young-account ticket, and the donor's disallowed-word list and start prefixes (the sketch keeps a shortened prefix list). The whitelist is four names, not 55. Race-specific removals (Archery, Throwing) are not modelled: any skill outside the whitelist is refused, not zeroed. The duplicate rule is written as "no name twice with a positive value"; the donor also refuses a zero entry followed by a positive one for the same name. The name rule is stricter than the donor: it requires a letter first and an allow-list of characters, which the donor does not do (its exception branch only refuses digits at NameVerification.cs:190).

```ts
// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type RaceId = "human" | "elf" | "gargoyle";

interface RaceAppearance {
  id: RaceId;
  skinMin: number;   // inclusive clamp range for skin hue (Human rule)
  skinMax: number;
}

interface SkillPick {
  name: string;
  value: number;     // 0..50
}

interface BuildInput {
  race: RaceAppearance;
  newClient: boolean;
  stats: [number, number, number];   // str, dex, int
  skills: SkillPick[];
  skinHue: number;
  name: string;
}

type Refusal =
  | "stat-range"
  | "stat-total"
  | "skill-cap"
  | "skill-not-allowed"
  | "skill-duplicate"
  | "skill-total"
  | "name";

type BuildResult =
  | { ok: true; skinHue: number; stats: [number, number, number]; granted: SkillPick[]; name: string }
  | { ok: false; reason: Refusal };

const STAT_MIN = 10;
const STAT_MAX = 60;
const STAT_BUDGET_NEW = 90;
const STAT_BUDGET_OLD = 80;
const SKILL_CAP = 50;
const SKILL_TOTALS = [100, 120];
// simplified: the donor list has 55 names; four are kept here for the sketch.
const ALLOWED_SKILLS = new Set(["Tactics", "Swords", "Healing", "Wrestling"]);
// simplified: the donor's race-specific removals (Archery for gargoyles, Throwing for others) are
// not modelled; here any skill outside the whitelist is refused instead of zeroed.

// The name rule allows letters first, then letters, space, dash, period and apostrophe.
// simplified: the donor's disallowed-word list and start-prefix list are not included.
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/;
const START_BLOCKED = /^(seer|counselor|gm|admin|lady|lord)/i;

function validName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 2 || name.length > 16) return null;
  if (!NAME_RE.test(name)) return null;
  if (/[ .'-]{2}/.test(name)) return null;      // at most one exception character in a row
  if (START_BLOCKED.test(name)) return null;
  return name;
}

export function validateBuild(b: BuildInput): BuildResult {
  const budget = b.newClient ? STAT_BUDGET_NEW : STAT_BUDGET_OLD;
  const [str, dex, int] = b.stats;

  for (const s of [str, dex, int]) {
    if (s < STAT_MIN || s > STAT_MAX) return { ok: false, reason: "stat-range" };
  }
  if (str + dex + int !== budget) return { ok: false, reason: "stat-total" };

  const granted: SkillPick[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const pick of b.skills) {
    if (pick.value > SKILL_CAP) return { ok: false, reason: "skill-cap" };
    if (!ALLOWED_SKILLS.has(pick.name)) return { ok: false, reason: "skill-not-allowed" };
    if (pick.value === 0) continue;
    if (seen.has(pick.name)) return { ok: false, reason: "skill-duplicate" };
    seen.add(pick.name);
    total += pick.value;          // fix: every chosen point is granted, so the budget cannot leak
    granted.push(pick);
  }
  if (!SKILL_TOTALS.includes(total)) return { ok: false, reason: "skill-total" };

  const name = validName(b.name);
  if (name === null) return { ok: false, reason: "name" };   // fix: refuse, do not replace with a default

  // fix: skin is clipped with the chosen race, and every race has a range (donor Gargoyle is unclipped)
  const skinHue = Math.min(b.race.skinMax, Math.max(b.race.skinMin, b.skinHue & 0x3fff)) | 0x8000;

  return { ok: true, skinHue, stats: [str, dex, int], granted, name };
}

export {};
```

Typecheck: copied to `/tmp/modernuo-free-build.ts` on the VPS and run with `npx -p typescript tsc --noEmit --strict --target es2020` (TypeScript 7.0.2): exit 0, no output.

Defects found in the donor (keep the idea, fix the defect):
- Skin is clipped with the default race before the race is set (CharacterCreation.cs:227 before 236; `Mobile.Race` defaults to Human at Mobile.cs:397). Result as read: an Elf or Gargoyle skin is clipped with Human's 1002-1058 range, and the Gargoyle's own `ClipSkinHue` (RaceDefinitions.cs:294) never runs at creation. fix: pick the race first, then clip (sketch line 90 takes the race as input).
- Gargoyle skin is not clipped (RaceDefinitions.cs:294; masked to 0x3FFF only at 227). fix: every race gets a range or whitelist, and the clip uses the chosen race.
- A removed skill keeps its value in the total (CharacterCreation.cs:454 zeroes, 459 adds the captured value). fix: refuse removed skills, or add only granted points (sketch 81).
- Failures reset silently: whole skill list dropped (SetSkills, 476-~480), stats set to 10/10/10 (409-411), name replaced by "Generic Player" (423). fix: return a reason code so the create screen can show it.
- Profession templates do not match the budget: the AOS table has 80-point templates (Paladin, Warrior, Mage, Blacksmith) and one 90-point template (Necromancer). `SetStats` accepts 90 only for new clients and 80 only for old ones (401, 407), so four of five templates fall back to 10/10/10 on a new client, and the Necromancer does on an old client. This is read from code and the AOS table only; the table that actually loads was not confirmed. fix: validate each template against the budget at load time (a test per template).
- Name rule: the player-name branch refuses only digits (NameVerification.cs:190), so symbols outside space, dash, period and apostrophe pass. The start prefix `gm` (206) has no word boundary, so a name such as "Gmelda" is refused (as read; not run). fix: letters-first allow-list and whole-word prefix check (sketch lines 51-59).

Not run: none of this was executed; every claim above is from reading the code and the AOS table.

## 5. Lands in

- TARGET `origins/character/appearance.ts` (new, proposed): the server-side build validator (stat budget, skill allow-list and total, name rule, per-race skin and hair clamps). The client only proposes the build; the server decides.
- Parity-checklist row 6 (hero actor/animation): body family per race on the shared rig (one body id per sex and race, ghost ids), hair and skin as data on that actor. Note: the brief's hint row 3 (guard/parry/stamina) does not fit this topic; row 6 is the one that does.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: server-verified rules (the donor validates on the server, sketch `validateBuild` is pure and server-side); one ledger for the stat and skill budget (fix in sketch line 81); zones and the Pit are not involved.

## 6. Gaps and risks

- Frankendom has no classes in the donor sense. The donor's class-free path is the free budget (stats 90 or 80, skills 100 or 120, skill cap 50). The profession templates are the class-like part and are the piece Frankendom should not port. The budget shape transfers; the templates do not.
- Faces and scars: the donor has hair and beard only. There is no face sculpt and no scar grade in this code. Scars-as-grades cannot be taken from ModernUO.
- Race bodies: the donor uses one body id per sex and race and a separate ghost id. Frankendom's shared rig needs body families as data (catalogue fields, parity row 21), not as per-race code. The Gargoyle and Human ghost ids are the same (402/403, RaceDefinitions.cs:29 and 247), which may be intentional; the reason is not in the code.
- Protocol dependence: the stat budget depends on a client protocol flag (CharacterCreation.cs:401). A browser client has one version, so one budget is enough; a version switch would have to be a separate rule.
- GPL-3.0: clean-room. The sketch is written from the mechanism; no donor line is translated.
- One ledger: the donor validates stats and skills in separate functions and the template path bypasses the client's values; the sketch keeps one budget function that every build passes through, templates included.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
Errors: None found. Verified: OnCharacterCreated order (CharacterCreation.cs:200-300, skin clip 227 before race set 236), SetStats 399-415, SetName 417-427, ValidateSkills 429-474 (55-name list 22-76, zeroed skill still added at 459, total 100/120 at 473), NameVerification 106/157/190/206/264 and StartDisallowed list (gm etc.), Race.cs 16/29/39/91, Human/Elf/Gargoyle bodies, ghost ids, skin/hair ranges, Elf 32 skin and 51 hair hues, Gargoyle unclipped skin 294, ProfessionInfo.cs:101 gate, AOS prof.txt stats, GPL-3 LICENSE. Acceptance numbers (x of 90, x of 100, 99 -> skill-total, 51 -> skill-cap, '!' and 'gm' refused) all pass against the sketch.
Missed: Minor: Alchemy fallback comment (CharacterCreation.cs:442-445) says an invalid pick becomes Alchemy at 0, but code zeroes the entry; not mentioned. Nothing that changes a decision.
