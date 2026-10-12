# crawl-crawl (quests-dialogue, cell 12)
Donor: /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-speak.cc (speech chance and line selection; data in /mnt/frankendom-donors/crawl-crawl/crawl-ref/source/dat/database/monspeak.txt) | Licence: GNU GPL version 2 or later (/mnt/frankendom-donors/crawl-crawl/LICENSE lines 6-7: "either version 2 of the License, or"); other notices in the same file (Boost for catch.hpp, CC0 for tiles) do not apply to this code | C++ | symbol maybe_mons_speaks, mons_speaks, __try_exact_string, _try_exact_string, __get_speak_string
Checked: no quest system and no dialogue tree in this donor (grep -rn "quest" over source/*.cc and *.h: only unrelated uses of the word "question"/"conquest"). The win item (the Orb) appears only as a prefix (mon-speak.cc:574). Opened: mon-speak.cc 35-124 (__try_exact_string, whole), 125-165 (_invalid_msg, whole), 166-208 (_try_exact_string, whole), 209-276 (__get_speak_string, whole), 341-414 (maybe_mons_speaks, whole), 427-575 (mons_speaks, the gating and prefix build; the rest after 575 not read); mon-act.cc 1984 (function name via awk) and 2352-2368 (the call site); random.cc 228-231 (coinflip), 430-433 (one_chance_in), 441-447 (x_chance_in_y tail, not fully read); random.h 74-78, 330; database.cc 105-111 (the TextDB registration), 845-853 (getSpeakString); dat/database/monspeak.txt lines 1-30 (grammar) and counts. Not read: _getRandomisedStr (the substitution library) and random2; the Lua execution path; dat/dlua/*.lua (names only). Candidates opened: 5 (mon-speak.cc, mon-act.cc, random.cc, database.cc, monspeak.txt) plus the header random.h. Confidence: high on the chance math and the prefix fallback order; medium on what one_chance_in does (assumed uniform random2 from its name and the code at random.cc:432, random2 not read). Camera scope: not applicable.

## 1. Mechanism
Speech is a per-monster-move bark. handle_monster_move (mon-act.cc:1984) calls maybe_mons_speaks(mons) once per move for any monster that is not asleep (mon-act.cc:2363-2364). maybe_mons_speaks first returns for patrolling or wandering monsters (mon-speak.cc:348) and for neutral attitude (the note at 351-353 says it is handled elsewhere). It then builds a chance: start at 21, subtract 9 for uniques, multiply by 15 for allies, multiply by 10 for band followers (not uniques), halve for fleeing, halve for confused, multiply by 5/2 for blood-for-blood orc allies. A monster with the speaks flag (or a name) speaks on a one-in-chance roll (line 393). Two named monsters, Crazy Yiuf and Donald, get an extra one-in-nine roll (line 398; the code tests the two monster types, not all uniques). A non-humanoid shape (quadruped or above) gets a one-in-(4 x chance) roll (line 409). Otherwise it stays silent.
mons_speaks then filters: it returns early for sleeping, unable-to-act or explode-kill monsters (433), but speaks even when invisible, silenced or banished if the monster is dying, banished, summoned and expired, or the player is dead (440 force_speak). Silenced monsters speak one third as often (462), charmed ones one third (476), and neutral monsters half as often by coin flip (483).
Prefixes: the attitude (friendly, hostile or neutral; 486-491), fleeing (494), silenced (500), confused (504), related if the monster and its foe or the player share a genus (520, 528), the current god or good-god name (coin flip), the branch abbreviation, and orb if the player carries the win item (574). These form the lookup key.
Lookup: __try_exact_string (35-124) first tries the full key; on a miss it may drop the hostile, related, religion, branch or silenced prefix (coin flips at lines 110 and 119; the hostile skip is at line 94). _try_exact_string (166-208) retries up to ten times, rejecting any line that fails _invalid_msg (125-165: lines naming the player when the player is excluded, the foe token, god tokens, or "VISUAL" when unseen). __get_speak_string (209-276) falls back in order: the exact full list, then every ordered combination of three prefixes, then pairs, then singles, then "default" with the key alone.

## 2. Key functions
- maybe_mons_speaks (mon-speak.cc:341-414): the chance and the three roll branches. Caller: handle_monster_move (mon-act.cc:2364), the only caller found by grep.
- mons_speaks (mon-speak.cc:427-575 read): the gates and the prefix list.
- _try_exact_string (mon-speak.cc:166-208): the ten-try retry with the line filter. Note the comment at line 184 and the empty-retry branch at 189-193: an empty result after a discard does not advance the try counter, so the cap is not a hard cap on draws (the loop still ends with probability one, because the coin flips in __try_exact_string can change the result; reasoned from the code, not run).
- __get_speak_string (mon-speak.cc:209-276): the fallback order (215, 221, 241, 257, 272).
- getSpeakString (database.cc:845-853): one string for the key from the speech database through _getRandomisedStr (852; not read, the name suggests a random pick), then embedded Lua runs on the text (853).

## 3. Numbers vs mechanism
- Base: one in 21 per monster move (359). Unique: 12 (363). Unique ally: 12 x 15 = 180 (368); common ally: 21 x 15 = 315. Band follower: 21 x 10 = 210 (374, not unique). Fleeing: chance / 2 (379). Confused: chance / 2 again (381). Blood-for-blood ally orc: chance x 5 / 2 (388).
- Worked numbers (integer division as in the donor): a fleeing unique is 12 / 2 = 6, so one in 6 per move; a fleeing unique ally is 180 / 2 = 90, one in 90; a quadruped with a 21 base has one in 84 (21 x 4). Crazy Yiuf and Donald get an extra one in nine (398).
- Silenced: one in three (462). Charmed: one in three (476). Neutral: coin flip (483).
- Retry cap: ten tries (178). Dying or banished monsters speak regardless of silence (440).
- Data size: monspeak.txt holds 742 blocks separated by the %%%% line (counted with grep; blocks begin with a substitution key such as the underscore-wrapped library names or a "default <prefixes> <key>" header; each following line is one line; the file has 9,344 lines).
- Units: each value is a per-move chance, not per second. Crawl is turn-based; a real-time game needs a per-second rate (see section 6).

## 4. TypeScript sketch
simplified: omits the Lua execution of speech text (database.cc:853), the @-token substitution library (_getRandomisedStr, not read), the god and branch prefixes (replaced by one quest prefix), the silenced and charmed one-in-three gates, the neutral coin flip, the one-in-nine extra roll for two named monsters, and the force-speak rules for death and banishment. It keeps the chance math, the prefix order, the fallback tiers (threes, twos, singles, default) and the line filter. It fixes the donor defect: a rejected line counts as one try, so the ten-try cap is a hard cap (the donor's tries-- does not count an empty retry).
```ts
type Attitude = "friendly" | "hostile" | "neutral";
interface Speaker {
  attitude: Attitude;
  speaksFlag: boolean;     // donor: M_SPEAKS class flag or a name
  quadruped: boolean;
  unique: boolean;
  bandFollower: boolean;
  allyOfPlayer: boolean;   // donor: wont_attack()
  fleeing: boolean;
  confused: boolean;
  silenced: boolean;
  related: boolean;        // same genus as the foe or the player
  questTag?: string;       // quest-state prefix, e.g. "orb" while carrying the win item
}

// Donor chance math, per monster move: one-in-N roll on a base of 21.
function barkChance(s: Speaker): number {
  let chance = 21;
  if (s.unique) chance -= 9;
  if (s.allyOfPlayer) chance *= 15;
  else if (!s.unique && s.bandFollower) chance *= 10;
  if (s.fleeing) chance = Math.floor(chance / 2);
  if (s.confused) chance = Math.floor(chance / 2);
  return chance;
}

const oneIn = (n: number, rnd: () => number): boolean => n >= 1 && Math.floor(rnd() * n) === 0;

function shouldBark(s: Speaker, rnd: () => number): boolean {
  const chance = barkChance(s);
  if (s.speaksFlag && oneIn(chance, rnd)) return true;
  if (s.quadruped && oneIn(chance * 4, rnd)) return true;
  return false;
}

function contextPrefixes(s: Speaker): string[] {
  const p: string[] = [s.attitude];
  if (s.fleeing) p.push("fleeing");
  if (s.confused) p.push("confused");
  if (s.silenced) p.push("silenced");
  if (s.related) p.push("related");
  if (s.questTag) p.push(s.questTag);
  return p;
}

// All ordered combinations of size r, lexicographic by index (donor loop order).
function combos(xs: string[], r: number): string[][] {
  if (r === 0) return [[]];
  if (xs.length < r) return [];
  const [head, ...rest] = xs;
  return [...combos(rest, r - 1).map((c) => [head, ...c]), ...combos(rest, r)];
}

type Pool = Map<string, string[]>;
function pickFrom(pool: Pool, key: string, rnd: () => number): string | null {
  const lines = pool.get(key);
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(rnd() * lines.length)];
}

// Donor order: exact full prefix list, then threes, twos, singles, then no prefix.
function pickLine(prefixes: string[], key: string, pool: Pool, rnd: () => number): string | null {
  const exact = pickFrom(pool, [...prefixes, key].join(" "), rnd);
  if (exact !== null) return exact;
  for (const r of [3, 2, 1]) {
    for (const c of combos(prefixes, r)) {
      const hit = pickFrom(pool, `default ${c.join(" ")} ${key}`, rnd);
      if (hit !== null) return hit;
    }
  }
  return pickFrom(pool, `default ${key}`, rnd);
}

// Donor filter (_invalid_msg subset): a line that names the player is rejected when the player is excluded.
function lineAllowed(line: string, noPlayer: boolean, unseen: boolean): boolean {
  if (noPlayer && line.includes("@player")) return false;
  if (unseen && line.includes("VISUAL")) return false;
  return true;
}

// Fixed retry cap: a rejected line counts as a try; the donor's tries-- does not.
function chooseLine(
  prefixes: string[], key: string, pool: Pool, rnd: () => number, noPlayer: boolean, unseen: boolean,
): string | null {
  for (let tries = 0; tries < 10; tries++) {
    const line = pickLine(prefixes, key, pool, rnd);
    if (line === null) return null;
    if (lineAllowed(line, noPlayer, unseen)) return line;
  }
  return null;
}
export {};
```
Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 crawl-bark-select.ts` on the VPS (/tmp): passed with no output (TSC_OK).

## 5. Lands in
Target: src/fight/barks.ts (proposed): the creature bark roll and line choice for fight barks (hostile, fleeing, related), with the quest-state prefix. Parity row 12 (combat sound cues): barks are cue text and sound, client-side, so the chance roll and the choice are client code unless a bark reveals hidden state (then it must be server-decided).

## 6. Gaps and risks
- Per-move rate: the donor rolls once per monster move. A real-time browser game must convert the one-in-N roll to a per-second rate, or the bark rate will change with the tick rate. fix: one rate constant per second, roll at a fixed server or client tick.
- Client-only: bark choice is cosmetic. Rulings say the HUD, camera and sound are client-only, so the roll should run on the client; keep it out of the server kill path.
- No dialogue tree and no quest state here: the donor has no branching dialogue, no quest log and no objectives. The only quest-like state is the orb prefix (mon-speak.cc:574). Frankendom's quests-dialogue needs its own tree; this donor only covers barks.
- Zones as data: the line pools are a data file (monspeak.txt, 742 blocks), keyed by context. That fits zones as data if the pool is per zone; the donor keeps one global pool.
- Embedded Lua in speech text (database.cc:853): lines can run Lua. Frankendom must not allow data-driven code in bark text.
- Defect (keep the idea, fix it): the retry loop does not count empty retries (mon-speak.cc:189-193), so the ten-try cap is not a hard cap. fix: count every try (sketch chooseLine).
- Note (not a defect today): the fleeing and confused halvings use integer division (lines 379, 381). With the current constants the smallest chance is 3 (unique 12, halved twice), so no value reaches zero; if the constants change, clamp the chance to at least one before the roll.
- Risk: the speech roll sits in handle_monster_move (mon-act.cc:2363-2364), so any monster move triggers it, including invisible ones (the unseen check is inside mons_speaks at lines 446 and 456). Check the cost in a 40-monster fight before adopting.

Reuse tag: adapt (context-keyed line choice with ordered fallback tiers, bark chance from state modifiers, and a hard retry cap). No donor code is reused.
Brief rule served: Rule 1 (no hint file; grep for speech and quest words found mon-speak.cc); Rule 5 (the one caller of maybe_mons_speaks found by grep, mon-act.cc:2364); Rule 6 (the per-move loop described); Rule 8 (target file and row given); Rule 10 (receipts verified); parity row 12.

Decision (proposed): adapt. Why: a context-keyed line choice with a fixed fallback order and a modifier-based bark chance fits fight barks and quest-state lines; reject the religion and branch prefixes (Crawl-specific) and keep the rate per second, not per move.
Best transferable idea: pick a bark line by stacking context prefixes (attitude, fleeing, silenced, related, quest state) with a fixed fallback order, and roll the bark chance from state modifiers each tick, with a hard retry cap.
Acceptance: a client test asserts that a fleeing unique rolls one in six per move (12 halved), against one in 21 for a plain monster; a line naming the player is never shown when the player is excluded; an empty pool falls back to the default line and never loops past ten tries.
