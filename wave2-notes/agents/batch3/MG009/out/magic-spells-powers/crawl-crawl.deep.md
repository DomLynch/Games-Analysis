# crawl-crawl (magic-spells-powers, cell 3)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-summoning.cc` (cap table 2306-2350; `summons_limit` 2393-2400; `_expire_capped_summon` 2407-2425; `summoned_monster` 2431-2510; `count_summons` 2511-2523) with `mon-ench.cc` 2504-2515 (`summ_dur`), `random.cc` 447-452 (`fuzz_value`), `mon-cast.cc` 9602-9612 (cast gate), `spl-other.cc` 86-116 (Animate Dead cast and dismissal), `mon-death.cc` 1551-1606, 1965-1975, 2006-2050, 3527 (Animate Dead raise on kill) | Licence: GPL-2.0-or-later (`LICENSE`: "either version 2 of the License, or (at your option) any later version"; the Crawl header says the same) | C++ | symbol `summoned_monster` (with `summons_limit`, `_expire_capped_summon`, `summ_dur`, `_animate_dead_reap`)

Checked: Read in full `spl-summoning.cc` 2306-2330 (cap struct), 2330-2390 (cap table), 2393-2523 (limit, expiry, summoned-monster cap, count); `mon-ench.cc` 2504-2516 (duration); `random.cc` 425-452 (`fuzz_value`, `x_chance_in_y`); `mon-cast.cc` 9595-9616 (monster cast gate); `spl-other.cc` 60-140 (dismissal and cast); `spl-cast.cc` 2630-2660 (dispatch); `mon-death.cc` 1540-1620 (derived undead, head and spawn setup), 1940-2050 (reap, necromancy effects). Partly read: `mon-death.cc` 2050-2100 not read; `_apply_necromancy` bound-soul and infestation branches read only as far as 2030. Not read: the summon kill credit and XP rules; ally follow and pet AI stance (`BEH_FRIENDLY` behaviour in `mon-behv.cc` and `mon-act.cc`: only grep hits); corpse rules (`corpse.cc`). camera_scope: n/a (not a camera topic). Confidence: high on the cap table, the cap enforcement order, the duration formula and the animate-dead chance (read in full). Medium on the pet stance (not read; say so before claiming it).

Best transferable idea: each caster keeps a live count of its summons per spell against a catalogue cap that differs for player and monster casters; when a new summon pushes the count over the cap, the summon closest to expiring (and its linked group) is removed at once, and a monster does not start a capped summon when it is already at the cap.
Decision (proposed): adapt - keep the per-spell cap table as catalogue data, the expire-the-soonest removal and the do-not-start-at-cap gate; express durations in seconds with the same -60% / +40% fuzz; drop the raise-on-every-kill chance for Frankendom unless it is a capped, data-driven effect, because it gives a free ally on each kill and would bypass the one kill-credit ledger.
Acceptance: a necromancer with a Simulacrum cap of 5 summons a sixth simulacrum and the least-remaining one disappears in that same server tick; a monster at the cap does not begin the cast (no wind-up shown); a 10 s base summon lasts between 4 s and 14 s (fuzz range [base - 60%, base + 40%]).

## 1. Mechanism

- **Cap table (data).** A table maps each summon spell to a `summon_cap` with `player_cap` and `monster_cap` (`spl-summoning.cc` 2306-2309, 2313-2350). Examples: small mammal 2 for the player and 4 for monsters (2316); Haunt 8 and 8 (2331); Simulacrum 5 and 5 (2334); Summon Undead 0 and 8 (2347). Zero means uncapped for that caster kind. Monster-only summons (for example water, fire, earth and air elementals) carry a monster cap of 3 and no player cap (2351-2354, read in the listing). `summons_limit(spell, player)` returns the cap for the caster kind, or 0 when the spell is not in the table (2393-2400).
- **Enforcement on creation (`summoned_monster`, 2431-2510).** The cap is read for the caster kind (2433); zero means nothing is enforced (2434). Special cases: the large abomination gets three quarters of the horrible-things cap and the other abominations a quarter (2440); the two sphinx types split the cap in half (read in the listing, about 2443-2445); a simulacrum is capped only by its own kind, so ice blocks are free (2448-2449). The count starts at 1 for the new monster (read; the line sits just above the candidate loop, about 2473). Candidates are the monsters with the same summoner, that are summoned, aligned, and whose summon spell (`ENCH_SUMMON` degree) matches (about 2452-2468). For the variable-cap spell (shadow creatures) a linked set counts once (about 2481-2491). Each candidate's remaining summon duration is compared; the smallest is the "oldest" (2500). If the count is over the cap, that candidate is expired (2507-2508).
- **Expiry (`_expire_capped_summon`, 2407-2425).** The chosen summon dies as a timeout (`KILL_TIMEOUT`, 2410). With the recurse flag set it also expires every monster from the same summoner with the same summon id (linked group, about 2412-2424).
- **Monster cast gate (`mon-cast.cc` 9602-9612).** A capped summon is not started when the caster is already at the cap; the comment says so (9602). For a monster the count is its own summons (9611); for a marionette the count is the player's summons against the monster cap (9608-9609).
- **Count helper (`count_summons`, 2511-2523).** Counts monsters created by the summoner with that spell and aligned to it, excluding the summoner itself.
- **Duration (`summ_dur`, `mon-ench.cc` 2504-2515).** Base is 1000 for degree 6 (set, 2508-2509), plus 500 from degree 5 (2510-2511), plus 100 per degree up to 4 (2512). The base is then passed to `fuzz_value(base, 60, 40)` (2514). The unit is the donor's `aut` (not converted to turns in this pass). `fuzz_value` returns the base plus a random offset in `[-lowfuzz% of base, +highfuzz% of base]` with an average of two dice (`random.cc` 449-451; percentages are integer). Results: degree 1 base 100 lasts 40-140; degree 4 base 400 lasts 160-560; degree 6 base 1900 lasts 760-2660.
- **Animate Dead (player spell).** Cast adds `20 + random2(1 + pow)` to `DUR_ANIMATE_DEAD` through `increase_duration` with a third argument of 100 (`spl-other.cc` 114; what that argument limits was not read) and stores the spell power (115). Recasting first dismisses all zombies this player made with Animate Dead, as timeouts (86-100). The dispatch is at `spl-cast.cc` 2647.
- **Animate Dead raise on kill.** While the duration is active, a monster death in line of sight (2044-2047) calls `_animate_dead_reap` (1965-1975): it checks the duration (1967), then `x_chance_in_y(150 + div_rand_round(pow, 2), 200)` (1969-1970). At power 0 the chance is 150/200 (75%); at power 100 or more it is always (200/200). A success creates a friendly zombie of the dead monster's type (1973), only if the monster can be zombified (`requires_corpse`, 1560), summoned by the player (1596), placed within 2 cells of the corpse (1600). Reaped spirits (a separate path) last 200-400 units (1603).

## 2. Key functions

- `summons_limit` (`spl-summoning.cc` 2393-2400): cap for a spell and caster kind.
- `summoned_monster` (2431-2510): the cap enforcement at creation; the oldest-by-remaining-time choice (2500) and the expiry (2507-2508).
- `_expire_capped_summon` (2407-2425): timeout kill and linked-group expiry.
- `count_summons` (2511-2523): live count per summoner and spell.
- Monster cast gate (`mon-cast.cc` 9602-9612): no capped summon at the cap.
- `summ_dur` (`mon-ench.cc` 2504-2515) and `fuzz_value` (`random.cc` 447-452): duration and fuzz.
- Animate Dead: `cast_animate_dead` and `_dismiss_dead` (`spl-other.cc` 86-116); `_animate_dead_reap` and `_make_derived_undead` (`mon-death.cc` 1551-1606, 1965-1975); `_apply_necromancy` call from the death path (2006-2047, 3527).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Per-spell live count, cap per caster kind, zero = uncapped | Caps: small mammal 2/4 (2316); Haunt 8/8 (2331); Simulacrum 5/5 (2334); Summon Undead 0/8 (2347) |
| Split caps by type | Large abomination 3/4 of the horrible-things cap; other abominations 1/4 (2440); sphinx halves (about 2443) |
| New summon counts as 1; over the cap, expire the least-remaining one and its linked group | Count starts at 1 (about 2473); compare to cap (2507) |
| Do not start a capped summon at the cap | Gate at `mon-cast.cc` 9611 |
| Duration by degree: 100 per degree up to 4, +500 at 5, base 1000 at 6 | 100 (2512), 500 (2511), 1000 (2509); degree gates 2508 and 2510 |
| Symmetric-ish fuzz on duration | Low 60%, high 40% (2514); integer percentages (random.cc 449) |
| Animate on kill: chance rises with the spell power | 150 + power / 2 out of 200 (1970); duration gate (1967) |
| Raised units are friendly, summoned by the player, placed near the corpse | Friendly (1973); summoner set (1596); range 0-2 (1600) |

Which numbers suit a fast mobile fight: the cap counts (2 to 8) fit a phone screen; the expire-the-soonest rule needs no UI; the duration fuzz is wide (plus or minus about half) which is fine for a game in turns but too loose for a fight that lasts seconds, so use a narrower fuzz. The raise chance (75% to 100%) is far too high for a one-kill reward.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: read the cap for the caster kind, do not start a capped summon at the cap, count the new one as 1, then over the cap remove the least-remaining summon and its linked group. It counts every same-spell summon in a linked group, where the donor only dedupes linked sets for the variable-cap spell. It omits the abomination and sphinx splits, the simulacrum-only count, the marionette rule, the aligned check and the summoner id (the sketch takes a caster id). The duration fuzz uses a uniform random number, not the donor's two-dice average, and it uses integer percentages as the donor does. The raise-on-kill chance is kept as a pure function only.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

export interface SummonCap { playerCap: number; monsterCap: number; }  // 0 = uncapped for that caster kind
export interface Summon { id: string; spell: string; casterId: string; remaining: number; linkId: string | null; }

// Catalogue data: one cap per spell, separately for player and monster casters.
export const CAPS: Record<string, SummonCap> = {
  haunt: { playerCap: 8, monsterCap: 8 },
  simulacrum: { playerCap: 5, monsterCap: 5 },
  "summon-undead": { playerCap: 0, monsterCap: 8 },
};

export function capFor(spell: string, casterIsPlayer: boolean): number {
  const c = CAPS[spell];
  if (!c) return 0;
  return casterIsPlayer ? c.playerCap : c.monsterCap;
}

// A monster caster does not start a capped summon when it is already at the cap.
export function mayStartSummon(
  list: Summon[], casterId: string, spell: string, casterIsPlayer: boolean,
): boolean {
  const cap = capFor(spell, casterIsPlayer);
  if (cap === 0) return true;
  return list.filter((s) => s.casterId === casterId && s.spell === spell).length < cap;
}

// Adds a summon and enforces the cap. The new one counts as 1; when the total is over the cap, the
// summon with the least remaining time goes, and so does its linked group. Returns the removed ids.
export function addSummon(list: Summon[], s: Summon, casterIsPlayer: boolean): string[] {
  list.push(s);
  const cap = capFor(s.spell, casterIsPlayer);
  if (cap === 0) return [];
  const others = list.filter((x) => x !== s && x.casterId === s.casterId && x.spell === s.spell);
  if (1 + others.length <= cap || others.length === 0) return [];

  let oldest = others[0];
  for (const o of others) {
    if (o.remaining < oldest.remaining) oldest = o;
  }
  const removed = new Set<string>([oldest.id]);
  if (oldest.linkId !== null) {
    for (const o of others) {
      if (o.linkId === oldest.linkId) removed.add(o.id);
    }
  }
  for (let i = list.length - 1; i >= 0; i--) {
    if (removed.has(list[i].id)) list.splice(i, 1);
  }
  return [...removed];
}

// Donor summ_dur: base 100 per degree up to 4, plus 500 from degree 5 and 1000 from degree 6 (the
// degree-6 base is set, not added), then fuzzed to [base - 60%, base + 40%].
export function summonDuration(degree: number, rnd: () => number): number {
  let base = 0;
  if (degree >= 6) base = 1000;
  if (degree >= 5) base += 500;
  base += 100 * Math.min(4, degree);
  const lo = Math.floor((60 * base) / 100);
  const hi = Math.floor((40 * base) / 100);
  return base - lo + Math.floor(rnd() * (lo + hi + 1));
}

// While the necromancy effect is active, a monster death in line of sight raises a zombie with chance
// (150 + power / 2) / 200, capped at 1. Donor uses a randomised half of the power; this uses floor.
export function raiseOnKillChance(power: number): number {
  const x = 150 + Math.floor(power / 2);
  return Math.min(1, x / 200);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/mg009-crawl-summon-caps.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/summons.ts` (new module: the per-caster summon count, the cap table and the expire rule run in the engine; durations are the engine's clock). Parity-checklist row 13 (specials).
- today: (not checked in this pass; this reader did not open the Frankendom repo).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients): the cap and the expiry are engine rules, and the client only shows the remaining count. Rule 7-9 n/a.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and typechecks; it is not a translation.
- Linked groups: the donor expires linked siblings through a shared summon id (2412-2424) and dedupes them in the count only for the variable-cap spell. The sketch treats every same-spell summon in a group as separate for the count; decide which rule Frankendom wants before building.
- Units: donor durations are in `aut` units (`summ_dur` 2504-2515) and player durations use a turn-like counter (`spl-other.cc` 114). Frankendom needs seconds; the fuzz is a ratio and transfers unchanged.
- Raise-on-kill chance (`mon-death.cc` 1965-1975): fires on every death in line of sight, with no cap and no link to the caster's ledger. Frankendom's rule that kills are server-verified and one ledger means a raised ally must be credited through that ledger (parity row 18, not row 13). Drop it, or make it a capped, data-driven effect with its own cap, before adopting.
- Pet stance and leash: `BEH_FRIENDLY` behaviour not read in this pass (grep hits only in `mon-behv.cc` and `mon-act.cc`). Do not claim a stance or leash from this donor.
- Summon kill credit and XP: not read. Crawl's dungeon model differs; Frankendom must credit summon kills to the caster in one ledger.
- Corpses: Animate Dead needs a zombifiable corpse (`requires_corpse`, 1560); corpse-ownership and decay rules (`corpse.cc`) not read.
- No defect confirmed in the cap code read. The removal picks the least-remaining summon, so a just-summoned unit is never the one removed (intended by the comment at 2497-2498 about the closest-to-expiry rule).
- The camera is not part of this topic.
- Reuse tag and brief rule as in section 5.
