# TurningWheel-Barony (character-creation-appearance, cell 31)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/menu.cpp` (class and race validity `isCharacterValidFromDLC`, 492-618 and the per-class table to 700; race step 2168-2202); also `src/actplayer.cpp` (look to body type 7185-7220; head sprite 5740-5760), `src/game.hpp` (enums 136-206), `src/init_game.cpp` (name lists), `src/menu.cpp` 361-418 (unlock check) | Licence: BSD 2-Clause (LICENSE.txt line 3: "licensed under the BSD 2-Clause License:"; line 5: "Copyright (c) 2013-2020, Turning Wheel LLC") | C++ | symbol `isCharacterValidFromDLC(Stat& myStats, int characterClass)`

Checked: Read menu.cpp 476-500, 520-620, 590-700 (the gate, class and race packs, per-class native races; the entry for PALADIN after 700 was not read), 1883-1900 (race step text), 2168-2202 (race step choice), 11852-11895 (random name). Read actplayer.cpp 5470-5495 (debug keys, not written up), 5738-5760 (head sprite), 7185-7220 (look to body type). Read game.hpp 136-206 (class and race enums, read in part). Read init_game.cpp 125-150 and 196-206 (name lists). Grep-level only: menu.cpp 361-372 and 418 (unlock check), 2186-2190 and 2262-2456 (fallback call sites, sampled), stat_shared.cpp 406, classdescriptions.hpp 15, LICENSE.txt lines 3 and 5. Not read: PALADIN's native race, the non-Steam unlock branch beyond one line, the name-length rules. Confidence: high on the gate order and its exceptions (read in full); high on the look and head-sprite mapping; medium on the completeness of the native-race table (one entry missing). Not a camera note.

## 1. Mechanism

- A character is sex, race, look and class. The look is `stat_appearance`, 0 to 17 (`NUMAPPEARANCES 18`, classdescriptions.hpp 15). Look 0 keeps the racial type with its passives. Look 1 is "act as human" and is aesthetic only (race step 2182-2197; body type 7209-7215, the comment at 7215 says "appearance of 1 is aesthetic only").
- One function decides whether a class is allowed for a race and look (menu.cpp 492-618, then the per-class table to 700). Order of checks:
  (a) challenge-run flags are read (494-507). They let a challenge run skip the pack check for one class or one race.
  (b) Four races need pack 2 (510-518).
  (c) Class pack switch (521-559): pack 1 for CONJURER, ACCURSED, MESMER, BREWER (523-533); pack 2 for MACHINIST, PUNISHER, SHAMAN, HUNTER (535-545); pack 3 for BARD, SAPPER, SCION, HERMIT, PALADIN (547-559).
  (d) Race pack switch (564-601): pack 1 for SKELETON, VAMPIRE, SUCCUBUS, GOATMAN (566-575); pack 2 for AUTOMATON, INCUBUS, GOBLIN, INSECTOID (578-588); pack 3 for DRYAD, MYCONID, GREMLIN, SALAMANDER, GNOME (590-601).
  (e) Human race: valid (607-609).
  (f) Non-human race with look 1: valid for any class (611-613).
  (g) Base classes, enum values 0 to 12 (`<= CLASS_MONK`, 615-618): valid for every race.
  (h) Specialist class (enum 13 to 25): valid if the race is that class's native race (for example conjurer and skeleton, 622-627; mesmer and succubus, 636-637). Otherwise valid only if the native race is unlocked (`isAchievementUnlockedForClassUnlock(race)`, 627 and the other cases to 700).
- The unlock check (menu.cpp 361-418) asks Steam for a per-race achievement, but only when pack 1 is owned (365; the non-Steam build reads `achievementUnlocked` at 418).
- Native-race pairs read (case lines): conjurer-skeleton 622-627; accursed-vampire 629-634; mesmer-succubus 636-641; brewer-goatman 643-648; machinist-automaton 650-655; punisher-incubus 657-662; shaman-goblin 664-669; hunter-insectoid 671-676; bard-gnome 678-683; sapper-gremlin 685-690; scion-dryad 692-697; hermit-myconid 699-700. Paladin not read.
- Race step (2168-2202): choosing the first option sets look 0, which keeps racial passives; choosing the second sets look 1 (2182-2197). The class is then re-checked. If it is invalid the class becomes `CLASS_MONK + playerRace` (2186-2190). The same fallback repeats at many later sites (sampled 2262-2456).
- Look at random: on reset, `local_rng.rand() % NUMAPPEARANCES` (2065).
- Head sprite for a human (actplayer.cpp 5740-5757): look 0 to 4 give `113 + 12*sex + look` (5743); look 5 gives one shared sprite `332 + sex` (5745-5746); looks 6 to 11 give `341 + 13*sex + (look-6)` (5748-5749); looks 12 to 17 give `367 + 13*sex + (look-12)` (5751-5752); other values fall to 113.
- Random name (menu.cpp 11854-11895): only in the name step (charcreation_step 4) with text input active (11856). The list is chosen by sex (11863-11870) and one entry is picked at random (11881). The lists are text files loaded at start (init_game.cpp 131 and 203, with the fallback path at 198-205). About 370 male and 365 female lines (counted with wc -l), plus 104 male and 104 female NPC names.
- Tick: none. The check runs whenever race, look or class changes (2186-2190 and the sampled sites).

## 2. Key functions

- `isCharacterValidFromDLC(Stat& myStats, int characterClass)`: `/mnt/frankendom-donors/TurningWheel-Barony/src/menu.cpp` 492-618 (the gate), and 620-700 (per-class native race).
- `isCharacterValidFromDLC(int player, int characterClass, int race, int appearance)`: same file, 476-490. Sets race and look on the stat, calls the gate, restores them. It is the only path that tests a look before it is chosen.
- Race step: same file, 2168-2202.
- `isAchievementUnlockedForClassUnlock(int race)`: same file, 361-372 (Steam) and 418 (other build).
- Look to body type: `/mnt/frankendom-donors/TurningWheel-Barony/src/actplayer.cpp` 7185-7220.
- `playerHeadSprite(Monster race, sex_t sex, int appearance, int frame, int player)`: same file, 5740-5757.
- Random name: `buttonRandomName` in `/mnt/frankendom-donors/TurningWheel-Barony/src/menu.cpp` 11854-11895.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Ordered validity gate: pack ownership first, then cosmetic-free checks, then base tier, then specialist tier | Packs: classes 523-559, races 510-601 |
| Base tier open to every race | 13 base classes, enum 0 to 12 (game.hpp 137-149) |
| Specialist tier: native race or the native race's unlock | 13 specialist classes, enum 13 to 25 (game.hpp 150-162); native race per class (622-700) |
| Look is cosmetic, but a look 1 for non-human bypasses the class rule | Look bypass 611-613 (defect, see section 6) |
| Invalid class falls back to the race's own class | `CLASS_MONK + playerRace` (2190); works for the first eight races because the enums list them in the same order (game.hpp 150-157, 198-206) |
| Look count | 18 (classdescriptions.hpp 15); repeated as the literal 18 at stat_shared.cpp 406 |
| Head sprite by look | Blocks: look 0-4 stride 12 (5743); look 5 single (5746); look 6-17 stride 13 (5749, 5752) |
| Name pick | One random entry from a per-sex list (about 370 and 365 lines, wc -l) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for the gate: pack ownership first (class, then race), then the human race, then the base tier, then the specialist rule with native race or unlock. It removes the look bypass (the donor's 611-613), so the look is never read. It makes challenge runs one global flag where the donor checks one class and one race. It leaves out the native-race table (given as data), the unlock source (Steam or local is a server ledger in our design), the head sprite, the random look and the name lists. The fallback arithmetic `CLASS_MONK + playerRace` is replaced by a data map.

```ts
// Licence: BSD-2-Clause (donor). Clean-room sketch of the mechanism; no donor lines or donor data copied.
// clean-room
type Verdict = "ok" | "missing-pack" | "missing-unlock" | "unknown-class" | "unknown-race";

interface ClassRule {
  tier: "base" | "specialist";
  pack?: string;                     // content pack that must be owned (undefined = free)
  nativeRace?: string;               // the race that owns this class outright
}

interface RaceRule {
  pack?: string;
  isHuman: boolean;
}

interface Draft {
  race: string;
  look: 0 | 1;                       // cosmetic only: this sketch never reads it
  cls: string;
}

interface Context {
  packs: Set<string>;                // packs the player owns
  unlockedRaces: Set<string>;        // races whose unlock achievement is earned
  challengeOverride: boolean;        // challenge runs skip pack checks (donor: per class and per race)
}

// Order: pack ownership first, then human, then base classes, then the specialist rule.
// The look is not in the gate. In the donor a non-human race with look 1 returns valid for any class
// before the class rule runs; this sketch removes that bypass.
function validate(
  draft: Draft,
  classes: Map<string, ClassRule>,
  races: Map<string, RaceRule>,
  ctx: Context,
): Verdict {
  const cls = classes.get(draft.cls);
  if (cls === undefined) return "unknown-class";
  const race = races.get(draft.race);
  if (race === undefined) return "unknown-race";

  if (!ctx.challengeOverride) {
    if (cls.pack !== undefined && !ctx.packs.has(cls.pack)) return "missing-pack";
    if (race.pack !== undefined && !ctx.packs.has(race.pack)) return "missing-pack";
  }
  if (race.isHuman) return "ok";
  if (cls.tier === "base") return "ok";
  if (cls.nativeRace === draft.race) return "ok";
  if (cls.nativeRace !== undefined && ctx.unlockedRaces.has(cls.nativeRace)) return "ok";
  return "missing-unlock";
}

// Fallback used by the donor after a race or look change: an invalid class becomes the race's own
// class (the donor computes it as a base index plus the race index; this sketch takes it from data).
function fallbackClass(race: string, ownClassOf: Map<string, string>): string | undefined {
  return ownClassOf.get(race);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS at /tmp/ch001-barony-class-gate.ts exited 0.

## 5. Lands in

- TARGET `origins/catalogue/class-gate.ts` (proposed, new file): the validity rule over catalogue rows (class rows with tier, pack and native race; race rows with pack). Lives beside the catalogue, runs on the server when a character is created or re-spec'd.
- Parity-checklist row 21 (catalogue fields): the class and race rows carry the gate fields. The lead hint for this cell was row 3; row 3 is guard, parry and stamina, which this gate does not touch.
- Reuse tag: rewrite-from-idea (BSD-2-Clause; adapted, licence kept in the file header)
- Brief rule served: one character and one ledger (unlock state is server-side; the look is cosmetic and never changes class access); rule 7 (BSD: adapt allowed)

## 6. Gaps and risks

- Defect 1, look bypass (menu.cpp 611-613): a cosmetic choice (look 1) on a non-human race makes every class valid. Fix: gate on the real race only; the sketch never reads the look. Keep the idea: one ordered gate with an open base tier.
- Defect 2, literal count (stat_shared.cpp 406): the look count is written as 18 next to the named constant (classdescriptions.hpp 15). Fix: derive the count from the catalogue table length and fail at load if they differ.
- Defect 3, head sprite layout (actplayer.cpp 5743-5752): the strides differ (12 for looks 0 to 4, 13 for 6 to 17) and look 5 is a one-off. Fix: a table of sprite ids per look, checked at load; no arithmetic.
- Defect 4, fallback arithmetic (menu.cpp 2190): `CLASS_MONK + playerRace` gives a race's own class only while the two enums keep the same order (game.hpp 150-157 and 198-206). Fix: a data map from race to its class, as in the sketch.
- Defect 5, client-side unlocks: the unlock is an achievement read on the client (menu.cpp 361-418). Frankendom's unlock state must be checked on the server against the ledger. A client cannot be trusted to say a race is unlocked.
- Challenge-run flags (menu.cpp 494-507) skip pack checks on the client. For us, any test mode is a server flag, never a client flag.
- The donor has no class-free start: the gate always leaves a class set, and the fallback (2186-2190) assigns one. Frankendom's class-free start needs a no-class state the gate accepts; this gate does not provide it.
- Not read: PALADIN's native race (after line 700), the other fallback call sites in full (2262-2456, sampled), the non-Steam unlock branch (418, one line), name-length rules.
- Names: a per-sex list of single strings with no grammar (menu.cpp 11863-11881). Frankendom's name rules are a separate question, not decided here.

Best transferable idea: one ordered validity gate decides which class a character may take, base classes are open to every race, specialist classes need the native race or its unlock, and a cosmetic look never changes access.
Decision (proposed): adapt - keep the single ordered gate and the open base tier; drop the look bypass (611-613) and the enum arithmetic fallback; unlocks are read from the server ledger, never the client.
Acceptance: a test that no cosmetic look changes which classes a character can take, and a server test that a specialist class is refused without the native race or the server-side unlock and accepted with either, for every race.

Reuse tag: rewrite-from-idea (BSD-2-Clause; adapted, licence kept)
Brief rule served: one character and one ledger (unlock state is server-side; the look is cosmetic); rule 7 (BSD: adapt allowed)
