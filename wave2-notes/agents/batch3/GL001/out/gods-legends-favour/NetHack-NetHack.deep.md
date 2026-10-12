# NetHack-NetHack (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/NetHack-NetHack/src/pray.c` (with priest.c, mon.c, makemon.c, attrib.c, timeout.c, allmain.c, rnd.c, polyself.c, steed.c, minion.c, artifact.c, sit.c, uhitm.c, botl.c, role.c; headers under `/mnt/frankendom-donors/NetHack-NetHack/include/`) | Licence: NetHack General Public License (`/mnt/frankendom-donors/NetHack-NetHack/dat/license`, lines 1-4 and 55: "NETHACK GENERAL PUBLIC LICENSE", "Based on the BISON general public license", and clause b, which requires distributed derivative works to stay under identical terms). This is a copyleft licence in the GPL family but is not one of the named licences, so it is treated as clean-room, shape only | C | symbols `can_pray`, `prayer_done`, `pleased`, `angrygods`, `offer_corpse`, `bestow_artifact`, `adjalign`, `set_malign`, `touch_artifact`, `spec_dbon`

Checked: Read in full or in the ranges that matter: pray.c 1071-1175 (pleased: boon roll and tiers), 1354-1362 (timeout reset), 1429-1446 (gods_angry, gods_upset), 704-787 (angrygods), 1631-1697 (cross-aligned altar conversion), 1781-1838 (gift artifacts), 1839-1870 (sacrifice value and dosacrifice entry), 1959-2123 (offer_corpse, except the sanctum branch at 1959-2020), 2124-2176 (can_pray), 2177-2198 (pray_revive), 2276-2346 (prayer_done); priest.c 558-740 (priest_talk with donation tiers); mon.c 3676-3735 (kill alignment accounting); makemon.c 2321-2366 (set_malign); attrib.c 1298-1316 (adjalign); timeout.c 600-621 (luck drift); allmain.c 268-284 (timeout tick); rnd.c 110-150 (rnl); polyself.c 735-760, 813, 862-890, 1157-1175 (polymorph duration, size scaling, armour break); steed.c 26-45, 93-130, 169-177 (saddle and ride); minion.c 196-256 (summon by alignment); artifact.c 908-983 (touch_artifact), 1000-1030, 1100-1110 (spec_applies, spec_dbon); sit.c 39-70 (throne effect roll); uhitm.c 331-345 (caitiff and samurai); botl.c 298-350 (rank titles); role.c 494-505 (Valkyrie row). Not read: `in_trouble` body (pray.c 198-287), `ugod_is_angry`, `rnz`, `revive`, the sanctum branch of offer_corpse, the body of "pat on the head" cases 3 and 4 (partly read), `rehumanize`, `Killed`-equivalent death handling, the rest of `set_malign` callers. Confidence: high on the prayer gate, boon roll, anger ladder, offering cuts and kill alignment (read end to end); medium on the donation tiers (read end to end, but the protection step is a loop I read once). camera_scope: n/a.

## 1. Mechanism

NetHack has one god per alignment and no favour bar. The favour is the alignment record (`u.ualign.record`), with a prayer timeout, a luck value and a divine-anger counter beside it. Four clocks run on them.

**Alignment record (favour in).** `adjalign(n)` (attrib.c 1298-1316): a negative change applies at once and also feeds an abuse counter that calls erinyes (1309); a positive change is capped at `ALIGNLIM = 10 + moves / 200` (align.h 17; attrib.c 1314). Killing a monster adds `mtmp->malign` (mon.c 3732). `malign` is set once at creation (makemon.c 2321-2366): a hostile of the other alignment gives its alignment's absolute value; an always-hostile cross-aligned gives at least 5 (2357); a coaligned peaceful is a penalty of -3 x max(3, |align|) (2361); a hostile with no alignment gives 20 (2345). Killing a peaceful costs 5 (mon.c 3729). Killing a priest, a guardian or a pet has its own cases (mon.c 3685-3711).

**Prayer gate (can_pray, pray.c 2124-2176).** The prayer timeout must be at most 200 for major trouble, 100 for minor trouble, and 0 otherwise (2151-2153). Otherwise a prayer is "naughty" if Luck is below 0, anger is above 0, or the alignment is below 0 (2155). Praying at another alignment's altar halves the alignment used (2144-2145); praying at the opposite altar negates it (2142-2143).

**Outcomes (prayer_done, 2276-2346).** Too soon: timeout += rnz(250), Luck -3, then `gods_upset` (2319-2321). `gods_upset` adds one anger to your own god and then runs `angrygods`; if the angered god is not your own it instead decrements your anger by one when anger is above zero (1440-1441). Naughty: `angrygods` only (2325). Coaligned and not too soon: `pleased` (2340).

**Boon ladder (pleased, pray.c 1071-1175).** The roll is `rn1(prayer_luck + 2, 1)` off an altar, which is 1 to Luck+2, or `rn1(prayer_luck + 3 + shrine, 1)` on an altar (1126). Off an altar the result is capped at 3 (1128). An alignment below STRIDENT (4) forces it to 1 or 0 (1130). The result picks the tier: 1 fixes the worst major trouble; 2 fixes up to nine; 3 up to ten; 4 and up fix all; 5 also rolls a "pat on the head" (switch at 1132, pat flag at 1134). Off an altar the roll is capped at 3, so tier 5 is reachable only on an altar. A pat on the head is also granted directly, with no roll, when the hero is not in trouble and alignment is at least DEVOUT (1105-1108; only if the prayer began with no trouble). Before the roll, pleased() also handles: cross-altar prayer (p_type 2, a prayer on another god's altar) gets only `adjalign(-1)` and returns with no boon (1085-1087); alignment below 2 with no trouble gets +1 (1088-1089); the mood message tiers DEVOUT / STRIDENT / below (1077-1082). The pat is `rn2((Luck + 6) >> 1)` (1167): nothing, a blessing or repair of the weapon, or a restored lost level, max HP and strength, hunger and Luck (1253 for the level; 1269-1275 for the rest). After a success the timeout is `rnz(350)` (1356), plus `rnz(1000)` for each demigod or Elbereth-hand step (1361).

**Anger ladder (angrygods, pray.c 704-787).** Your own god: `maxanger = 3 x anger + (Luck > 0 or alignment >= STRIDENT ? -Luck/3 : -Luck)` (717). Another god: `alignment/2 + (Luck > 0 ? -Luck/3 : -Luck)` (715). Clamped to 1..15 (720-723). Then `rn2(maxanger)` (725): 0-1 displeased; 2-3 lose a level and one Wisdom (742); 4-5 black glow and a random curse (`rndcurse`); 6 punishment if not already punished; 7-8 a minion summoned (684); anything higher, a zap from the god (`god_zaps_you`). The timeout is then raised to at least `rnz(300)` (780-782).

**Offerings (dosacrifice, pray.c 1854-2123).** The value is `difficulty + 1` for a fresh corpse (1845; the age test sits just above it at 1843-1844); eaten corpses lose value. At your own altar, in order: if angry, anger falls by `value x 3 / 24` (2 / 24 for chaotic; 2033); else if the alignment record is negative (`ugod_is_angry`), `adjalign(value)` with value clamped to MAXVALUE and to `-record` ("partially absolved", 2058-2064); else if the timeout is above zero it falls by `value x 300 / 24` (500 for chaotic; 2067) and the luck gets a small lift if it was negative; else the luck rises by `value x 10 / 48` (2095) but never above the value (2101), and a gift artifact is rolled first (`bestow_artifact`).

**Gift artifacts (bestow_artifact, pray.c 1781-1838).** Needs XL above 2 and Luck at least 0 (1784). The chance is `1 in (6 + 2 x gifts x artifacts)` (1792), so each gift makes the next less likely. A gift sets the timeout to `rnz(300 + 50 x artifacts)` (1819).

**Conversion (offer_different_alignment_altar, pray.c 1631-1697).** Only when your god is angry (or on an unaligned altar in Gehennom), and only once (the base alignment check, 1624-1647): Luck -3, timeout +300 (1646-1647). A rejected second conversion: anger +3, alignment -5, Luck -5, Wisdom -2, then `angrygods` (1649-1654). On a cross-aligned altar when the god is not angry (the "conflict" branch, 1655-1680 area): the offering is taken; with chance (XL+2)/(XL+8) (`rn2(8 + XL) > 5`, line 1661) the altar takes your alignment and Luck rises by 1, otherwise Luck falls by 1; a rare minion can follow in either case (later lines).

**Luck and time.** Luck drifts one step toward base every 600 moves, or every 300 with the Amulet or with anger (timeout.c 607, 616). The prayer timeout falls by one each move (allmain.c 278). `rnl(x)` shifts a roll by `(|Luck| + 1) / 3` (signed like Luck, rounded away from zero) for ranges up to 15 and by Luck for large ones; the shift is skipped only when `rn2(37 + |adjustment|)` is zero (rnd.c 128-143).

**Polymorph (shapeshifting).** Duration `rn1(500, 500)`, so 500-999 moves (polyself.c 813). A low-level character who becomes a higher-level form has the duration scaled by XL / monster level (882). Body armour breaks in a breaking form (888, and the message at 1171), and the weapon drops (889).

**Mounts.** A saddle-able steed must be of a steed class, at least medium size, and non-humanoid (centaurs excepted), not amorphous, noncorporeal, whirly or unsolid (can_saddle, steed.c 26-33); it does not need to be tame. `use_saddle` handles an untame steed explicitly (94-96). Riding needs a tame steed and a rider that is humanoid and neither very small nor big (can_ride, 169-175). Saddling succeeds on `rn2(100) < chance`, where chance = DEX + CHA/2 + 2 x tameness + XL x (20 if tame, else 5), minus 10 x steed level when untame, plus 20 for a Knight (93-98); riding skill modifies it (unskilled/restricted -20, skilled +15, expert +30, 99-113); confusion, fumbling or glib -20 or else riding gloves or boots +10; a cursed saddle -50 (114-123). This is a skill check, not a divine reward.

**Temple donation (priest_talk, priest.c 558-740).** The base suggestion is `XL peak x rn1(101, 150 + 40 x cheapskate)` (637-638), so 150-250 per peak XL, rising after each refusal. The tier unit is `suggested x quan`, where `quan = max(1, gold / (suggested x 3))` (639-646), so a rich hero is asked for multiples. Tiers, by offer against that unit (660-681): under 1x: "thank you" or "cheapskate", nothing; 1x to 2x: clairvoyance for a random time proportional to the offer (679); 2x to 3x: protection (`u.ublessed`) in steps: the first point is 2-4 (695), each further 2x adds one, capped at 20 (696-698: below 9 always +1, above 9 only with chance 1/current value); 3x and up: alignment +2 if coaligned, or, if the hero has strayed (record negative) and more than 5000 moves have passed since the last cleansing, the record is reset to 0 ("cleanse", 712-714).

**Pantheon and titles.** Each role has three gods, `lgod`, `ngod`, `cgod` (you.h 187; Valkyrie: Tyr, Odin, Loki at role.c 503). Rank titles are read from XL (`xlev_to_rank`, botl.c 298-350; the Valkyrie titles run from Stripling to Lord, role.c 494-502).

**Artifact damage tags.** An artifact's special damage applies when a tag matches the target: one species (artifact.c 1021), a monster class letter (1023), a monster flag word (1025), or an alignment mismatch (the DALIGN branch, around 1029). The bonus is `rnd(damd)`, or the base value if `damd` is zero (1107).

**Relic restriction.** `touch_artifact` (artifact.c 908-967): a self-willed artifact blasts a mismatched holder for d(4,10) (d(2,10) with antimagic) (953); an alignment-only mismatch blasts a non-self-willed artifact one time in four (945).

**Throne.** Sitting on a throne rolls `rnd(6) > 4` (one in three, sit.c 45) and then one of 13 effects (46, dispatched at 64).

## 2. Key functions

- `can_pray`: `/mnt/frankendom-donors/NetHack-NetHack/src/pray.c` 2124-2176 (prayer gate).
- `prayer_done`: pray.c 2276-2346 (outcome by prayer type).
- `pleased`: pray.c 1071-1386 (boon ladder, pat on the head, timeout reset).
- `angrygods`: pray.c 704-787 (anger ladder).
- `gods_upset`: pray.c 1436-1444 (anger +1 for own god, then the ladder).
- `dosacrifice` / `offer_corpse`: pray.c 1854-2123 (offerings).
- `bestow_artifact`: pray.c 1781-1838 (gift artifacts).
- `offer_different_alignment_altar`: pray.c 1631-1697 (conversion).
- `adjalign`: attrib.c 1298-1316. `xkilled` alignment accounting: mon.c 3676-3735. `set_malign`: makemon.c 2321-2366.
- `priest_talk`: priest.c 558-740 (donation tiers).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Thresholds gate the request by how much you owe | 200 major, 100 minor, 0 none (pray.c 2151-2153) |
| Outcome ladder from one roll, cap off the altar | rn1(Luck + 2, 1), capped at 3 off the altar (1126-1128) |
| Anger ladder: roll under a cap that grows with anger | maxanger = 3 x anger + luck term, clamped to 1..15 (717-723, 725) |
| Offering cuts a timer by value / max | 300/24 per value (500/24 chaotic), anger 3/24 (2 chaotic) (2033, 2067) |
| Gift odds fall as more gifts exist | 1 in (6 + 2 x gifts x artifacts) (1792) |
| Donation tiers as multiples of a suggested price | 1x, 2x, 3x of suggested x quan (priest.c 639-646, 679, 681, 716) |

### GL table (gods-legends-favour)

| # | Name | Effect | Formula | Number ranges | Gain / loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour per god | Alignment record, 0..ALIGNLIM | Positive changes cap at 10 + moves/200; negative apply at once | cap 10 + moves/200 | Gain: kill malign (5 to 20 hostile); Loss: peaceful kill -5, caitiff -1, samurai dishonour -1, too-soon prayer does not touch it directly | Cap rises with moves; no timer decay | attrib.c 1298-1316; mon.c 3729-3732; makemon.c 2345-2365; uhitm.c 336-344 |
| 2 | Blessings and curses | Blessings: pat on the head (weapon blessing or repair, restored level, max HP, Str, hunger, Luck); curses: anger rung 4-5 (random curse), temple protection AC | Pat roll rn2((Luck+6)>>1); clairvoyance time = offer-scaled | pat pool grows with Luck; protection first step 2-4 | Earned by boon tiers 5 (pat) and by donations | Clairvoyance is a timed row (incr_itimeout); protection counter capped near 20 | pray.c 1167-1275; priest.c 679-705 |
| 3 | Patron choice and switching | One god per alignment; conversion only once while angry; rejection adds anger | Conversion: Luck -3, timeout +300 | Luck -3 / -5; timeout +300; anger +3 on rejection | Conversion cost; rejection: alignment -5, Wis -2 | None | pray.c 1624-1654 |
| 3b | God anger | Own-god anger raised by too-soon prayers and rejected conversions; cut by offerings (a non-own god being upset lowers it by 1) | Anger ladder rn2(maxanger) (rungs 0-1, 2-3, 4-5, 6, 7-8, 9+) | maxanger 1..15 | +1 per too-soon prayer (gods_upset; -1 when the upset god is not your own), +3 rejected conversion | Offering cut 3/24 per value (2/24 chaotic) | pray.c 704-787, 1436-1444, 2033, 2319-2321 |
| 4 | Divine domains and aspects | Pantheon gods per role; artifact species tags drive bonus damage | Species, class, flag-word and alignment tags; bonus rnd(damd) | damd per artifact | Hit with a tagged target | None | you.h 187; role.c 503; artifact.c 1021-1025, 1107 |
| 5 | Boons at thresholds | Boon tiers by roll (random, not rank); pat on the head at tier 5 (altar only) or directly when not in trouble and alignment >= DEVOUT | Action = rn1(Luck+2, 1), capped 3 off altar; low alignment forces 0 or 1 | tiers 1..5 | Each successful prayer | Timeout rnz(350) after a boon | pray.c 1126-1175, 1356 |
| 6 | Legend signature powers | Not per named legend. Gift artifacts are the signature items | none per legend | none | none | none | pray.c 1781-1838 (gift items only) |
| 7 | Shapeshifting | Polymorph self: duration 500-999; armour breaks; weapon drops; scaled by XL/mlvl | rn1(500,500); x XL/mlvl when XL < mlvl | 500-999 moves | Enter and exit | Duration counts down (not read) | polyself.c 813, 882, 888-889, 1171 |
| 8 | Avatars and summoned aspects | Minion by alignment: lawful angel, neutral elemental, chaotic demon; hostile | Minion chosen by alignment; hostile | summon limit not read | Anger rung 7-8 | Minion persists until killed (not read) | minion.c 203-252; pray.c 684 |
| 9 | Fate, luck, oaths | Luck -10..10; rnl luck-adjusted rolls; Knight and Samurai oaths cost alignment (no server check) | rnl: (|Luck|+1)/3 for ranges up to 15, Luck otherwise; adjustment skipped only when rn2(37+|adj|) is zero | Luck -10..10 | Caitiff -1, dishonour -1 | Luck drifts to base every 600 (300 angry or Amulet) | rnd.c 128-143; uhitm.c 336-344; timeout.c 607-620 |
| 10 | Underworld and death | Prayer in Gehennom angers unless a roll passes; praying on a coaligned altar revives your tame corpse | Gehennom: angrygods unless alignment > 0 and rnl passes; revive on altar | not read | Revive is a success path | None | pray.c 2308-2311, 2184-2191 |
| 11 | Divine mounts | None. Steeds are tamed and saddled animals; no divine reward found | Saddle chance: DEX + CHA/2 + 2 tame + XL x 20 (tame, else x5 and -10 x steed level) (+20 Knight, riding skill -20..+30, confusion -20, riding gloves/boots +10, cursed saddle -50) | 0..100 | Saddle roll | Riding skill (not read) | steed.c 26-33, 93-123, 169-175 |
| 12 | Relics | Gift artifacts: one per roll, odds fall with gifts; holder blasted on mismatch | 1 in (6 + 2 x gifts x artifacts); timeout rnz(300+50 x artifacts); blast d(4,10) or d(4,4) | odds 1/6 down | Gift on offering; blast on touch | Gifts make the next less likely | pray.c 1781-1819; artifact.c 945-953 |
| 13 | Temples and shrines | Temple priest: donation buys clairvoyance, protection, alignment; altar: offering, conversion | Suggested = XL peak x 150..250 (times quan for rich heroes); tiers at 1x, 2x, 3x | 150..250 per XL | Donation; offering | Clairvoyance expires; protection persists | priest.c 637-716; pray.c 1854-2123 |
| 14 | Pantheon factions | Three gods per role (lawful, neutral, chaotic); cross-aligned prayer halves alignment; opposite negates; titles by XL | Halving and negation in the prayer check; titles by XL index | 3 gods per role | Cross-altar prayer | None | you.h 187; role.c 503; pray.c 2142-2145; botl.c 345 |

Best transferable idea: a favour ledger where the request is refused until a timeout falls under a threshold, the boon is a roll capped by favour tier (fewer fixes off the altar), and anger is a ladder whose size grows with the anger counter.

Decision (proposed): adapt — keep the timeout gate by trouble, the anger ladder (scaled by anger), and the offering cut to the timeout and anger counters; use favour-tier caps instead of the luck-based roll for boons (GL focus item 5 wants ranks); drop the lost-level rung, since Frankendom has no XL-loss rule; keep the offering cut and gift odds that fall with the count of gifts. Why for Frankendom: the donor's mechanism gives players a timer and a wrath ladder that are both data rows, one ledger, no new system.

Acceptance: A server test sets timeout 201 with major trouble and asserts the request is refused; at timeout 200 the request passes; with anger 1 the same request is refused as naughty, and a 10-piece offering of value 24 cuts anger by 3.

## 4. TypeScript sketch

simplified: the sketch follows the donor order: alignment cap, prayer gate, boon roll and tiers, anger ladder (with the too-soon increments), offering (anger first, then negative record, then timeout, then luck), kill malign, luck drift and the knight rule. It omits the opposite-altar negation, the donor's luck-adjusted rnl for the low-alignment branch (plain rn2 here), the abuse counter and erinyes, the minion, gift artifacts, polymorph, the temple, the rank titles and the luck base other than 0 (the tick passes 0). It also leaves out the `rnz` distribution, passing the rolls in as plain numbers (`timeoutRoll`, `rnzPenalty`).

```ts
// Licence: NetHack General Public License (donor; copyleft, GPL family). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const STRIDENT = 4;      // alignment at which the boon roll is trusted
const MAXVALUE = 24;     // highest sacrifice value
const LUCKMAX = 10;
const LUCKMIN = -10;

type Rng = () => number;
const rn2 = (n: number, rng: Rng): number => Math.floor(rng() * n);
const rn1 = (x: number, y: number, rng: Rng): number => rn2(x, rng) + y;
const trunc = (x: number): number => (x < 0 ? Math.ceil(x) : Math.floor(x)); // C integer division

interface Ledger {
  record: number;   // alignment record: the favour
  timeout: number;  // prayer timeout, one point per turn
  luck: number;     // -10..10
  anger: number;    // divine anger of your own god, 0 = calm
  moves: number;
}

// ALIGNLIM grows with the game clock: 10 + moves / 200.
function alignLimit(moves: number): number { return 10 + Math.floor(moves / 200); }

// Positive changes are capped at the limit; negative changes always apply.
export function adjAlign(l: Ledger, n: number): void {
  if (n < 0) { l.record += n; return; }
  l.record = Math.min(alignLimit(l.moves), l.record + n);
}

function changeLuck(l: Ledger, n: number): void {
  l.luck = Math.max(LUCKMIN, Math.min(LUCKMAX, l.luck + n));
}

// Prayer gate. Major trouble needs timeout <= 200, minor <= 100, none needs 0.
// simplified: the donor's opposite-altar case (alignment negated) is omitted; the other-altar case is kept.
export function canPray(l: Ledger, trouble: number, otherAltar: boolean): 'too-soon' | 'naughty' | 'ok' {
  const alignment = otherAltar ? Math.trunc(l.record / 2) : l.record;
  const limit = trouble > 0 ? 200 : trouble < 0 ? 100 : 0;
  if (l.timeout > limit) return 'too-soon';
  if (l.luck < 0 || l.anger > 0 || alignment < 0) return 'naughty';
  return 'ok';
}

// Boon roll: 1..(luck + 2), or (luck + 3 + shrine) on an altar, capped at 3 off the altar.
// simplified: the donor uses rnl(2) for the low-alignment branch, here it is rn2(2) (no luck adjustment).
export function boonAction(l: Ledger, onAltar: boolean, onShrine: boolean, rng: Rng): number {
  const prayerLuck = Math.max(l.luck, -1);
  let action = rn1(prayerLuck + (onAltar ? 3 + (onShrine ? 1 : 0) : 2), 1, rng);
  if (!onAltar) action = Math.min(action, 3);
  if (l.record < STRIDENT) action = (l.record > 0 || rn2(2, rng) === 0) ? 1 : 0;
  return action;
}

// How many troubles the action fixes. 1: worst major only; 2 and 3: up to 9 or 10; 4 and up: all; 5 also rolls a pat on the head.
export function troublesFixed(action: number, troubles: number): number {
  switch (Math.min(action, 5)) {
    case 0: return 0;
    case 1: return Math.min(1, troubles);
    case 2: return Math.min(9, troubles);
    case 3: return Math.min(10, troubles);
    default: return troubles;
  }
}

// Pat-on-the-head pool grows with luck: rn2((luck + 6) >> 1).
export function patPoolSize(luck: number): number { return (luck + 6) >> 1; }

// Anger ladder. Own god: 3 x anger plus a luck term. Other god: alignment / 2 plus a luck term. Clamped to 1..15.
// The timeout is set to at least timeoutRoll (rnz(300) in the donor, passed in here).
export function angerRung(l: Ledger, ownGod: boolean, rng: Rng, timeoutRoll: number): string {
  let maxanger: number;
  if (ownGod) {
    const luckTerm = (l.luck > 0 || l.record >= STRIDENT) ? -trunc(l.luck / 3) : -l.luck;
    maxanger = 3 * l.anger + luckTerm;
  } else {
    maxanger = trunc(l.record / 2) + (l.luck > 0 ? -trunc(l.luck / 3) : -l.luck);
  }
  maxanger = Math.max(1, Math.min(15, maxanger));
  const r = rn2(maxanger, rng);
  l.timeout = Math.max(l.timeout, timeoutRoll);
  if (r <= 1) return 'displeased';
  if (r <= 3) return 'lose-level';
  if (r <= 5) return 'curse';
  if (r === 6) return 'curse';   // punishment in the donor when not already punished
  if (r <= 8) return 'minion';
  return 'zap';
}

// A prayer too soon: timeout grows, luck drops 3, your own god's anger rises by one, then the anger ladder runs.
export function prayTooSoon(l: Ledger, rnzPenalty: number, rng: Rng, timeoutRoll: number): string {
  l.timeout += rnzPenalty;
  changeLuck(l, -3);
  l.anger += 1;
  return angerRung(l, true, rng, timeoutRoll);
}

// Offering on an altar of your own god. Anger first, then a negative record (absolved), then timeout, then luck (capped so luck never rises above the value).
export function offer(l: Ledger, value: number, chaotic: boolean): void {
  if (l.anger > 0) {
    l.anger = Math.max(0, l.anger - trunc((value * (chaotic ? 2 : 3)) / MAXVALUE));
    return;
  }
  if (l.record < 0) {
    // donor middle branch (ugod_is_angry): a negative record is partly absolved by the offering
    adjAlign(l, Math.min(value, MAXVALUE, -l.record));
    return;
  }
  if (l.timeout > 0) {
    l.timeout = Math.max(0, l.timeout - trunc((value * (chaotic ? 500 : 300)) / MAXVALUE));
    return;
  }
  const orig = l.luck;
  let inc = trunc((value * LUCKMAX) / (MAXVALUE * 2));
  if (orig > value) inc = 0;
  else if (orig + inc > value) inc = value - orig;
  changeLuck(l, inc);
  if (l.luck < 0) l.luck = 0;
}

// Per-kill favour: the monster's malign (set once at creation). Cross-aligned hostiles give at least 5.
export function malignFor(mal: number, coaligned: boolean, peaceful: boolean, alwaysHostile: boolean): number {
  const absMal = Math.abs(mal);
  if (alwaysHostile) return coaligned ? 0 : Math.max(5, absMal);
  if (coaligned) return peaceful ? -3 * Math.max(3, absMal) : Math.max(3, absMal);
  return absMal;
}

// Luck drifts toward its base once per period: 600 moves, 300 with the Amulet or anger.
export function luckDrift(l: Ledger, baseLuck: number, amuletOrAngry: boolean): void {
  const period = amuletOrAngry ? 300 : 600;
  if (l.luck === baseLuck || l.moves % period !== 0) return;
  l.luck += l.luck > baseLuck ? -1 : 1;
}

// Once per turn: the prayer timeout falls by one; luck drifts (base 0 here).
export function tick(l: Ledger): void {
  l.moves += 1;
  if (l.timeout > 0) l.timeout -= 1;
  luckDrift(l, 0, false);
}

// Knight's code: attacking a helpless or fleeing foe costs one alignment (a lawful knight only).
export function caitiff(l: Ledger, lawfulKnight: boolean, helplessOrFleeing: boolean): void {
  if (l.record <= -10) return; // donor skips the penalty once record is already at -10 or below
  if (lawfulKnight && helplessOrFleeing) adjAlign(l, -1);
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/gl001-nethack-prayer-ledger.ts`: exit 0.

## 5. Lands in

- TARGET `origins/favour.ts` (new, same ledger as crawl-crawl): the alignment-style favour record, prayer timeout, luck and anger, server-written. Prayer and anger rules do not get their own file.
- Parity-checklist row 18 (loot roll and XP award): kill favour (the malign add) and gift-artifact odds sit on the award event. Prayer and anger have no row of their own; the favour ledger carries them under row 18.
- Data fields (from the donor): prayer thresholds 200 / 100 / 0 ticks (engine); timeout after boon rnz(350) ticks (engine); too-soon penalty rnz(250) ticks and Luck -3 (engine); anger ladder cap 15 and rungs (engine); offering cut 300/24 and 3/24 per value (engine); gift odds 1 in (6 + 2 x gifts x artifacts) (engine); relic blast d(4,10) (zone data per relic row); donation tiers 1x / 2x / 3x (zone data per temple row).
- Reuse tag: rewrite-from-idea (NetHack General Public License, copyleft family: clean-room, shape only)
- Brief rule served: GL focus items 1, 2, 3, 3b, 4 (artifact tags), 5, 9, 10, 12, 13, 14; brief rule 8 (target and parity row) satisfied.

## 6. Gaps and risks

- NGPL copyleft: clean-room, shape only. The sketch is written from the mechanism.
- Server-verified: the donor's prayer, anger and offering are all in-process. In Frankendom every change (timeout, anger, luck) must be written by the server; the client only asks.
- One ledger: the donor splits alignment, luck, anger and timeout into separate `u.` fields that all sit in one struct. Frankendom must keep them in one row (the career row), so a single write sets them all.
- Boon ladder fix: the pat on the head does not need roll tier 5 off an altar (cap 3); the donor grants it directly when not in trouble and alignment >= DEVOUT (1105-1108). A favour-tier version should do the same: highest tier plus no trouble = a free favour.
- Boons are a luck roll, not a rank. GL focus item 5 wants ranks. The sketch keeps the tier shape with a fixed cap. The random boon is the thing to drop.
- The lost-level rung (anger 2-3) has no equivalent in Frankendom's rulings. Reject it, or make it a timed debuff row.
- Prayer during Gehennom depends on a luck-adjusted roll (2311). Frankendom has no Gehennom; the rule is not needed.
- Too-soon prayers add anger, and anger makes the next rung worse. There is no decay of anger except offerings (2033). A player who keeps praying too soon can climb the ladder. Frankendom should cap or decay anger; not read whether the donor caps it elsewhere.
- Luck drift is tied to the move counter (`moves % 600`, timeout.c 607). A luck change can wait up to 600 turns to start moving back. This is a design choice, not a defect.
- No defect found in the parts read. The donor's `rnl` is luck-adjusted; the sketch uses plain random rolls, which changes the odds on the low-alignment branch.
- Not read: `in_trouble`, `ugod_is_angry`, `rnz`, `revive`, the sanctum branch of offer_corpse, the rest of the pat-on-the-head cases 3 and 4, and the summon limit (if any) for minions.

Reuse tag: rewrite-from-idea (NetHack General Public License, copyleft family: clean-room, shape only)
Brief rule served: GL focus items 1, 2, 3, 3b, 4, 5, 9, 10, 12, 13, 14; brief rule 8 (target and parity row)

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Boon section implied a pat on the head needs roll tier 5; impossible off an altar (cap 3); donor grants it directly when not in trouble and alignment >= DEVOUT (pray.c 1105-1108).
- Sacrifice order omitted the middle `ugod_is_angry` branch (2058-2064, adjalign(value) 'partially absolved'); sketch offer() omitted it too.
- Steed said to need tame to be saddle-able; can_saddle (26-33) has no tame test; saddle chance omitted -10*m_lev untame, riding skill, confusion, gloves/boots, cursed saddle.
- Priest tiers are multiples of suggested*quan (quan=max(1,gold/(suggested*3))), top tier has the cleanse branch (712-714), protection increments probabilistic above 9 (696-698).
- gods_upset also decrements anger when the god is not your own (1440-1441); note said only +1.
- rnl small-range adjustment is (|Luck|+1)/3, not Luck/3 (rnd.c 128).
- Missed: cross-altar prayer gets only adjalign(-1) (1085-1087); alignment<2 and no trouble +1 (1088-1089); mood tiers (1077-1082); check_caitiff skips when record <= -10 (333).

Fixed 2026-10-12: all six errors corrected in section 1 and the GL table; pleased() prelude line added; pat-on-head fix added to section 6; sketch offer() now has the negative-record branch (typecheck below).
