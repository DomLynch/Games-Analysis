# crawl-crawl (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/religion.cc` (with god-conduct.cc, god-wrath.cc, player.cc, player-reacts.cc, god-abil.cc, player-equip.cc, mutation.cc, bane-type.h, transform.cc, religion.h) | Licence: GPL-2.0-or-later (`/mnt/frankendom-donors/crawl-crawl/LICENSE` lines 7-8: "either version 2 of the License, or" / "(at your option) any later version.") | C++ | symbols `gain_piety`, `_gain_piety_point`, `lose_piety`, `piety_rank`, `handle_god_time`, `apply_exp`

Checked: Read end to end: piety-info.cc (148 lines, bookkeeping only); religion.cc 2280-2364, 2507-2728 (gain and loss path), 645-720 and 866-1046 (penance), 4176-4194 (per-turn tick), 4409-4436 (star breakpoints), 2857-2925 (excommunication), 3546-3586 (good-god carry), 3642-3708 (initial favour), 4858-4874 (power gate), 4101-4126 (pantheon matrix); god-conduct.cc 92-138, 282-400 (dislike), 556-666 (like struct and kill), 780-800, 987-1038 (dispatch); god-wrath.cc 1737-1830; player.cc 2800-2950 (XP pool, banes, anger clock, ostracism); mutation.cc 3573-3650; player-reacts.cc 769-856 (pool leak); god-abil.cc 261-306 (Zin donation). Partly read: transform.cc 208-219, 2209-2240, 2343-2385 (the form-entry function `check_transform_into` at 2012 was not read). Not read: each god's gift function (`_give_*_gift`), each god's ability bodies, `Killed()`, the faith source (`you.faith()`), the Ru sacrifice logic, and the bodies of the god-companion functions. Confidence: high on the favour, penance, anger clock and banes (read end to end); medium on the kill numbers (read the formula and the caller; the `_on_kill` denominator 100 is on a line too short to quote). camera_scope: n/a (not a camera cell).

## 1. Mechanism

Favour (the code calls it piety, 0-200) is the one per-god resource. Anger (penance, 0-200) is a second counter for the same god. Three clocks run on them.

**Favour in.** A gain is scaled by faith (`piety_scale`, religion.cc 2325), then turned into whole points by random rounding (`pgn = div_rand_round(pgn, denominator)`, 2594). Each point goes through `_gain_piety_point` (2507) in this order:
1. Penance first. If the god is angry, one penance is paid and the point is gone (2510-2513).
2. Gift timeout. If it is above zero it counts down by one (2516-2517).
3. Taper. At favour 100 or more, each point has a 2-in-5 roll (2536-2538). A hit does not add favour; it only triggers a gift roll. The two clauses stack: above 160 the swallow chance is 1 - (3/5)(3/5) = 64 percent, not 40 (this is read from the code; the source does not say whether it is intended).
4. Otherwise favour +1 (2557-2558) up to 200, then the gift roll (`do_god_gift`, gated at 2074 by no penance and no timeout).

**Favour out.** `lose_piety` (2698) subtracts and clamps at zero (2711-2714). If favour is below 1 it calls `excommunication()` (2724-2725). A misdeed (`_handle_piety_penance` through `dislike_response`, god-conduct.cc 348-351) takes favour = factor x monster level and adds penance = factor x level + offset, and only adds the penance if the god is still yours (dock_piety, religion.cc 2318). Removing the Amulet of Faith takes one third of favour (player-equip.cc 2572).

**No passive decay.** I searched every write to `raw_piety`. Writers are the gain (2558), the loss (2712-2714), excommunication (2882), `set_piety` (which only calls gain and loss, 2337-2361), start values (ng-setup, player.cc 5746) and the Amulet drain. None runs on a timer. The only time-based leak is the piety pool. Zin's donation adds to `DUR_PIETY_POOL` (god-abil.cc 263 and 281: cost = gold/2 + 1, favour = gold x ln(gold) / 200). `_decrement_durations` (player-reacts.cc 839-843) drains one pool point and gains one favour point with a 1-in-5 chance per call, while favour is below 200. How often that function is called per game turn was not read.

**Kills.** `did_kill_conduct` (god-conduct.cc 1019-1021) passes the victim's XL. The like-response for a kill starts at numerator 90, denominator 100 (`kill_living_response`, 637-639). If the monster's level is above zero (599), the gap is `extra = 36 + 2 x monster level - your XL` (604), the denominator is multiplied by `extra` and the numerator by `extra - 12` (606). A negative gain is clamped to zero (615). So a kill of a monster far below you gives nothing, and an equal-level kill is worth about 0.9 x (1 - 12/extra) favour. Example: XL 10 against level 10 gives extra 46, so 90 x 34 / (100 x 46) = 0.665 favour per kill.

**Anger (penance) and the wrath clock.**
- Misdeeds add penance (capped at 200, religion.cc 884-894 and 1025; the call in the `else` branch shows penance stacks while already angry).
- While angry, penance blocks gifts (2074), blocks powers except rank -1 (4858-4874), and is paid off by gains (2510).
- Each XP tick (`apply_exp`, player.cc 2921-2931) first calls `_handle_god_wrath` (2866-2878). While some god is angry, the wrath XP counter drops by the XP gained (2872). Each time it goes below zero, a retribution is queued (2875) and the next XP timer is set (`set_penance_xp_timeout`, religion.cc 866-878: about (XP to next XL - XP to this XL) / 200, at least 1).
- Each game turn `handle_god_time` (4176) checks the queue. With n angry gods, it rolls `x_chance_in_y(n, 20)` (4187) and fires a retribution for a random angry god. The queue counter drops by one every turn (4193-4194), whether or not the roll fired.
- A retribution cuts penance by 1 to 3 (`dec_penance(god, 1 + random2(3))`, god-wrath.cc 1826), and may confuse or slow you (one_chance_in(5) and XL below a random roll, god-wrath.cc 1737-1830).

**Curses (banes).** Timed rows measured in XP units: `BANE_DUR_LONG 4000`, `BANE_DUR_MEDIUM 2500`, `BANE_DUR_SHORT 1600` (bane-type.h 27-29). `add_bane` scales the duration by a percent multiplier (mutation.cc 3603) and adds to the existing value, so repeats stack (3610). `apply_exp` calls `_handle_banes` each XP tick (player.cc 2946). Each bane drops by `round(exp x 10 / skill cost)` (2829, 2850), halved for accursed or undead characters (2831-2832). Doom drops by `loss / 60` (2836).

**Ostracism (distance).** `ostracise_player` floors ostracism at 40 and adds the amount (religion.cc 4917-4920), capped at 300 (4888). The effective favour cap is `200 - ostracism` (player.cc 1543). It decays with XP: `loss = round(exp / (skill cost x 4/3))` (player.cc 2862).

**Excommunication and switching.** `excommunication` (religion.cc 2864-2900) zeroes favour (2882) and sets the god to none. For Elyvilon, Ashenzari and Gozag it also docks XP equal to one XL (3046, 3074, 3095; `excom_xp_docked` 2857-2861). A voluntary leave from a good god saves favour (2887). Joining a good god later carries `(saved - 30) / 2` favour (3576-3577). Joining sets favour to 15 (3691) and clears penance (3646).

**Boons by rank.** `god_power_usable` (4858-4874): rank -1 always works; anything else is blocked while angry; rank 0 always works; rank 7 is a capstone; ranks 1-6 need `piety_rank() >= rank`. The table is per god (`get_all_god_powers`, religion.cc 97-130; the Zin block is 104-113). The rank comment is at religion.h 189-192. Losing a star removes its powers with a message (`_handle_piety_loss`, 2614-2640). The gift roll is separate: random per point, not rank-gated.

**Pantheon.** `god_likes_your_god` is true only when both gods are good (4101-4104). `god_hates_your_god` (4106-4126): Ru never cares; a non-good god always hates your god (4116-4117); Zin hates chaotic gods (4121); a good god hates an evil current god (4124).

## 2. Key functions

- `gain_piety`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/religion.cc` 2576-2604 (faith scaling, random rounding, one call per point).
- `_gain_piety_point`: religion.cc 2507-2561 (penance, gift timeout, taper, +1, gift roll).
- `lose_piety`: religion.cc 2698-2726 (subtract, clamp, excommunicate below 1).
- `dock_piety`: religion.cc 2280-2320 (loss then penance, only while still worshipping).
- `_handle_piety_penance` and `dislike_response` / `like_response`: god-conduct.cc 106-138; 282-355; 599-617.
- `apply_exp`: player.cc 2921-2950 (one XP pool feeds wrath, banes, ostracism, pool-like timers).
- `handle_god_time`: religion.cc 4176-4194 (queue roll and drop).
- `divine_retribution`: god-wrath.cc 1737-1830.
- `god_power_usable`: religion.cc 4858-4874.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Points pay debt first, then count | Penance paid one point at a time (2510-2513) |
| Gains round randomly to whole points | `div_rand_round` (2594) |
| Taper above a threshold | Threshold 100 (religion.cc 2538, `piety_breakpoint(3)`) and 160 (2537); roll 2 in 5 |
| Level-gap reward curve | 90/100 at equal level; numerator x (36 + 2 x mlvl - XL - 12), denominator x (36 + 2 x mlvl - XL) (god-conduct 604-606) |
| Anger roll per turn | x_chance_in_y(angry, 20) (religion.cc 4187) |
| Anger XP clock | XP gap between this XL and the next, / 200, at least 1 (religion.cc 866-878) |
| Bane XP decay | XP x 10 / skill cost (player.cc 2829); half for accursed or undead (2831) |
| Star gates for powers | Breakpoints 30, 50, 75, 100, 120, 160 (religion.cc 4430) |

### GL table (gods-legends-favour)

| # | Name | Effect | Formula | Number ranges | Gain / loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour per god | One resource per god, 0-200, six star steps | Gains: faith-scaled, random rounding; penance paid first; taper 2-in-5 above 100 (stacks to 64 percent above 160) | cap 200; stars at 30/50/75/100/120/160 | Gain: kills by level gap (0.665 at XL 10 vs level 10), liked conducts; loss: disliked conduct = factor x level, Amulet of Faith removal = 1/3 of favour; excommunicate below 1 | None on a timer; piety pool leaks 1 point per 1-in-5 call | religion.cc 2507-2561, 2576-2604, 2698-2726; god-conduct.cc 599-615; player-reacts.cc 839-843; player-equip.cc 2572 |
| 2 | Blessings and curses (timed rows) | Curses (banes) are timed rows; blessings are rank passives (halo lost on penance) | Curse duration in XP units; add = sum; decay per XP tick = XP x 10 / skill cost | LONG 4000, MEDIUM 2500, SHORT 1600 XP units; Doom decays /60 | Added by bane effects (callers not read); halo lost at penance (religion.cc 898) | Per XP tick; halved for accursed or undead | bane-type.h 27-29; mutation.cc 3603, 3610; player.cc 2827-2851 |
| 3 | Patron choice and switching | Join sets favour 15 and clears penance; good-to-good carry; leaving costs XP for 3 gods | Carry = (saved - 30) / 2 | start 15; carry floor 30, divide by 2 | Excommunicate at favour 0; XP dock = one XL (Elyvilon, Ashenzari, Gozag) | None | religion.cc 3691, 3646, 2887, 3576-3577, 2882, 3046, 3074, 3095, 2860 |
| 3b | God anger (wrath) | Anger is penance; it blocks gifts and most powers and drives retributions | Misdeed penance = factor x level + offset; wrath XP clock; per-turn roll n/20 | penance cap 200; retribution cut 1-3; XP timer = XP gap to next XL / 200 | Anger added by misdeeds (capped at 200); each XP crossing queues one retribution | Penance paid by gains; retribution cut 1-3; queue drops by one per turn | religion.cc 884-894, 866-878, 4176-4194; player.cc 2872-2875; god-wrath.cc 1826 |
| 4 | Divine domains and aspects | Per-god like and peeve tables keyed by conduct (kill of unclean, holy, undead, demon, nonliving) | Like = numerator / denominator with level scaling; peeve = factor x level | like default 90/100; peeve factors per conduct | Kill and conduct events | None | god-conduct.cc 637-666, 780-800 (kill map) |
| 5 | Boons at favour thresholds | Power rows unlock at star ranks, deterministic | Usable if stars >= rank and not angry; rank -1 works while angry | ranks 1-6 by star; 0 always; 7 capstone; -1 under penance | Unlock on stars gained; lock on stars lost (message) | None | religion.cc 4858-4874; religion.h 186-192; religion.cc 97-130 |
| 6 | Signature powers per god and rank | Each god has rows (power id, rank, text); no per-named-opponent rows | Rank gate as row 5 | rank 1-7 | Unlock at rank | Cooldown not read | religion.cc 97-130 (Zin block 104-113) |
| 7 | Shapeshifting | Temporary form swap; blocked slots meld the gear; old form ends first | transform(dur, form): Zin protection chance piety / 160 blocks it | dur from caller (not read) | Enter and exit messages | Duration timer (not read) | transform.cc 2343-2385, 2229-2230, 211, 2348 |
| 8 | Avatars and summoned aspects | Companions are tracked per god; `remove_all_companions` clears one god's companions | Summon limits not read | not read | Hepliaklqana companions removed on losing frailty (2656) and in excommunication (3144) | not read | god-companions.cc 87; religion.cc 2656, 3144 |
| 9 | Fate, luck, oaths | Forbidden acts: first inadvertent act forgiven; Ru sacrifices run on a delay counter | Forbidden acts are a table; sacrifice delay in handle_god_time | not read | Inadvertent act forgiven once | Delay counter | god-conduct.cc 24-50 (table head), religion.cc 4176-4200 |
| 10 | Underworld and death | Beogh companion resurrection progress rises with favour gains; death rules not read | +1 progress per favour point | not read | Each favour point | None | religion.cc 2529 |
| 11 | Divine mounts | None found. Grep for mount and steed hits only monster riders (monster.cc 6256, mon-death.cc 1580) | none | none | none | none | not a reward (grep only) |
| 12 | Relics | Amulet of Faith is tied to favour: removal drains 1/3 | div_rand_round(raw, 3) | 1/3 | Removal | None | player-equip.cc 2572 (function name not read) |
| 13 | Temples and shrines | Temple god list is sorted; per-position list of gods for shrines | Lists only | not read beyond lists | not read | not read | religion.cc 4836-4847, 4081-4091 |
| 14 | Pantheon factions | Good gods like good gods; non-good gods hate you; Zin hates chaotic; good gods hate evil | Matrix of two booleans | 2 classes (good, evil), chaotic extra | Carry on good-to-good switch | None | religion.cc 4101-4126; 3546-3586 |

Best transferable idea: one favour ledger per (player, patron) where penance is paid before favour grows, kill favour falls to zero for a monster far below you, and anger runs on the same XP pool as the XP award.

Decision (proposed): adapt — keep the penance-first ledger, the level-gap kill curve, the star-gated power rows and the XP-clocked anger; drop the random gift roll as a boon source (GL focus item 5 wants rank rows, not random ones), fix the taper to one roll, and move the anger queue into the career row so it cannot be lost on a turn with no angry patron. Why for Frankendom: it gives the gods a real cost of misbehaviour that is data-driven and one ledger, without a new system.

Acceptance: A server test seeds 10,000 gains at favour 120 and asserts the swallow rate is 40 percent; a kill of a level-1 monster by an XL 27 character gives zero favour; a player at 2 stars sees the rank-3 power hidden and at 3 stars sees it.

## 4. TypeScript sketch

simplified: the sketch follows the donor order for a single patron (penance paid before gift timeout, taper, then +1, and a gift hook). It fixes the donor's stacked taper and uses one 40 percent roll from 100 up. It omits faith scaling, the Vehumet slow-down, the Ru special case, the Xom and Gozag cases, ostracism, banes and the gift bodies, the per-god power data (rank rows are passed in), and the `Killed` and transform bodies. The wrath queue is kept per patron and rolled once per queued retribution, as the donor does (the decrement happens whether or not the roll fires).

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const MAX_FAVOUR = 200;               // favour cap (donor MAX_PIETY)
const MAX_PENANCE = 200;              // anger cap (donor MAX_PENANCE)
const STAR_STEPS = [30, 50, 75, 100, 120, 160]; // favour needed for stars 1..6
const TAPER_FROM = 100;               // from here on some gains are swallowed
const TAPER_CHANCE = 2 / 5;           // one roll per point above TAPER_FROM
const WRATH_ROLL_DIVISOR = 20;        // one angry patron: 1 in 20 per turn

type Rng = () => number;

interface Patron {
  worships: boolean;
  favour: number;       // 0..MAX_FAVOUR
  penance: number;      // 0..MAX_PENANCE, paid down by gains before favour counts
  giftTimeout: number;  // favour points to wait before the next gift roll
  wrathXp: number;      // XP left before the next queued retribution
  wrathQueued: number;  // retributions waiting to fire
}

export function stars(favour: number): number {
  let s = 0;
  for (let i = 0; i < STAR_STEPS.length; i++) if (favour >= STAR_STEPS[i]) s = i + 1;
  return s;
}

function chance(p: number, rng: Rng): boolean { return rng() < p; }

// Round n/d to a whole number; the remainder rounds up with probability remainder/d.
function randRound(n: number, d: number, rng: Rng): number {
  return Math.floor(n / d) + (chance((n % d) / d, rng) ? 1 : 0);
}

// One favour point. Order: penance first, then gift timeout, then the taper, then +1.
// simplified: the donor's taper stacks two rolls above 160 (about 64 percent swallow); this sketch uses one 40 percent roll from 100 up. Faith scaling and the Vehumet slow-down are omitted.
function gainPoint(p: Patron, rng: Rng, giftRoll: () => void): void {
  if (p.penance > 0) { p.penance -= 1; return; }
  if (p.giftTimeout > 0) p.giftTimeout -= 1;
  if (p.favour >= MAX_FAVOUR) { giftRoll(); return; }
  if (p.favour >= TAPER_FROM && chance(TAPER_CHANCE, rng)) { giftRoll(); return; }
  p.favour += 1;
  giftRoll();
}

export function gainFavour(p: Patron, amount: number, denom: number, rng: Rng, giftRoll: () => void = () => {}): void {
  if (amount <= 0 || !p.worships) return;
  const points = randRound(amount, Math.max(1, denom), rng);
  for (let i = 0; i < points; i++) gainPoint(p, rng, giftRoll);
}

// Kill favour: 90/100 at equal level; a monster far below you gives nothing (numerator goes negative and is clamped).
export function killFavour(p: Patron, monsterLevel: number, playerLevel: number, rng: Rng): void {
  let num = 90;
  let den = 100;
  if (monsterLevel > 0) {
    const extra = 36 + 2 * monsterLevel - playerLevel;
    den *= extra;
    num *= extra - 12;
  }
  gainFavour(p, Math.max(0, num), Math.max(1, den), rng);
}

export function isAngry(p: Patron): boolean { return p.worships && p.penance > 0; }

export function addPenance(p: Patron, v: number, timeoutXp: number): void {
  if (!p.worships || v <= 0) return;
  p.penance = Math.min(MAX_PENANCE, p.penance + v);
  if (p.wrathXp <= 0) p.wrathXp += Math.max(1, timeoutXp);
}

export function excommunicate(p: Patron): void {
  p.worships = false;
  p.favour = 0;
  p.wrathXp = 0;
  p.wrathQueued = 0;
}

// Returns true when the loss empties favour and the patron drops you.
export function loseFavour(p: Patron, amount: number): boolean {
  if (amount <= 0 || !p.worships) return false;
  p.favour = Math.max(0, p.favour - amount);
  if (p.favour < 1) { excommunicate(p); return true; }
  return false;
}

// A misdeed: favour lost (scaled by level) and penance added, in that order. Penance only lands if still worshipping.
export function misdeed(p: Patron, pietyFactor: number, penanceFactor: number, penanceOffset: number, level: number, timeoutXp: number): void {
  const gone = loseFavour(p, Math.max(0, pietyFactor * level));
  if (!gone) addPenance(p, Math.max(0, penanceFactor * level + penanceOffset), timeoutXp);
}

// XP tick: one pooled XP amount per tick. Only counts while angry.
export function onXp(p: Patron, xp: number, timeoutXp: number): void {
  if (!isAngry(p)) return;
  p.wrathXp -= xp;
  while (p.wrathXp < 0) {
    p.wrathQueued += 1;
    p.wrathXp += Math.max(1, timeoutXp);
  }
}

// Per-turn tick: a queued retribution fires with chance angryCount/20 (one patron here), then the queue shrinks either way.
export function onTurn(p: Patron, rng: Rng, retribution: () => void): void {
  if (p.wrathQueued <= 0) return;
  if (isAngry(p) && chance(1 / WRATH_ROLL_DIVISOR, rng)) {
    retribution();
    p.penance = Math.max(0, p.penance - (1 + Math.floor(rng() * 3))); // 1..3 off penance
  }
  p.wrathQueued -= 1;
}

// Tiered powers: rank -1 works under penance; rank 0 always (when not under penance); 1..6 by stars; 7 is a capstone flag.
export interface PowerRow { id: string; rank: number; }

export function powerUsable(p: Patron, row: PowerRow, capstoneReady: boolean): boolean {
  if (!p.worships) return false;
  if (row.rank === -1) return true;
  if (p.penance > 0) return false;
  if (row.rank <= 0) return true;
  if (row.rank === 7) return capstoneReady;
  return stars(p.favour) >= row.rank;
}

// Switching between good patrons carries favour over, minus the first star step, halved.
export function switchCarry(savedFavour: number): { amount: number; denom: number } {
  return savedFavour > STAR_STEPS[0] ? { amount: savedFavour - STAR_STEPS[0], denom: 2 } : { amount: 0, denom: 1 };
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/gl001-crawl-favour-ledger.ts`: exit 0.

## 5. Lands in

- TARGET `origins/favour.ts` (new): one favour and anger ledger per (player, patron), read by the power rows and the kill hook. Server-written only.
- Parity-checklist row 18 (loot roll and XP award). The XP pool tick (`apply_exp` in the donor) is the sub-line: "server tick: fixed step, input intake, per-tick NPC budget" is not claimed here; the XP award is the row.
- Data fields (from the donor): favour cap 200 (engine), anger cap 200 (engine), star steps 30/50/75/100/120/160 (engine), taper from 100 and chance 2/5 (engine), kill base 90 per 100 and the level-gap 36 + 2 per level and cut 12 (engine), retribution roll 1 in 20 per angry patron (engine), retribution cut 1-3 penance (engine), XP timer divisor 200 (engine), curse durations 4000/2500/1600 XP (zone data per curse row).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: GL focus items 1, 2, 3, 3b, 5, 10 (favour, timed curses, switching, anger, rank boons, death-side resurrection counter). Brief rule 8 (target and parity row) satisfied.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- One ledger: the donor keeps favour, anger, the XP clock, banes and ostracism in one `you` struct, which fits the ruling. Frankendom must put anger and the anger XP clock in the same career row as favour, not in a side table.
- Server-verified: every gain and loss is a call in the donor's process. In Frankendom the kill favour must be written only after the server confirms the kill (ruling: kills are server-verified). The donor has no network step to copy.
- Taper defect: above 160 the donor swallows about 64 percent of points (two stacked rolls). Fix: one roll (sketch). Whether 64 percent was intended is not stated in the code; a server test should pin the number chosen.
- Anger queue defect candidate: each queued retribution gets one 1-in-20 roll per angry patron, and the queue shrinks whether or not it fired. With one patron, most queued retributions are lost. This may be intended; the source has a comment in `divine_retribution` (god-wrath.cc 1822-1826) that the thought of retribution mollifies the god by at least a point. Fix in Frankendom: decide one rule and test it (hold the queue until it fires, or fire on queue).
- Random gifts: the donor rolls gifts randomly per point. Frankendom boons are ranks, not random (GL focus item 5). Keep the rank rows, drop the roll.
- Piety pool leak runs through `_decrement_durations`; the caller's frequency was not read, so the real pool rate per game turn is unknown. Do not port the 1-in-5 number as a per-second rate.
- Excommunication docks XP only for Elyvilon, Ashenzari and Gozag in the lines read; the general rule for other gods was not in those lines. Frankendom should choose one rule for leaving a patron.
- Ru has its own rules (no taper, 6-star cap, sacrifices); Xom and Gozag do not use favour the same way. None are copied here.
- Ostracism is a distance counter that caps favour. It is a second-order rule that Frankendom does not need for a first pass.
- The table rows marked "not read" (rows 8, 9, 10, 13) are not checked beyond the lines cited.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: GL focus items 1, 2, 3, 3b, 5, 10; brief rule 8 (target and parity row)
