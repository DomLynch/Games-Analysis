# exult-exult (progression, cell 10)

Donor: `/mnt/frankendom-donors/exult-exult/actors.cc` | Licence: GPL-2.0 (`/mnt/frankendom-donors/exult-exult/COPYING`: "GNU GENERAL PUBLIC LICENSE", "Version 2, June 1991"; the per-file header was not read, so "or later" is unverified; clean-room only) | C++ | symbol `Actor::reduce_health` (kill XP) and `Actor::figure_hit_points` (credit to attacker)

Checked: Read on the VPS: `actors.cc` 2531-2553 (set_property exp path), 2906-3100 (reduce_health, including the XP block 3017-3094), 4023-4035 and 4080-4105 (figure_hit_points start and the apply_damage call), 4175-4200 (the end of the powers code, the credit at 4193-4194, and weapon usecode after it; 4105-4174 not read), `actors.h` 101-103 and 565-567, `shapes/shapeinf/monstinf.cc` 160-172, `shapes/shapeinf/weaponinf.cc` 165-175, `objs/objs.cc` 1420-1500 (base apply_damage and Game_object::reduce_health: no XP there). Not read: `Log2` and `bitcount` definitions; `Monster_info` and `Weapon_info` field values; `Actor::die`; `get_info()`; the usecode `died` path. Confidence: high on the XP formula and its order (read line by line); medium on the attacker credit point, since 4105-4174 was not read. Two lines are too short to quote under the 15-character rule (3092 `expval /= 2;` and 3093 `*exp = expval;`); they were read by eye and anchored to the quoted comment at 3091.

## 1. Mechanism

- Entry: `figure_hit_points` (4023) calls `apply_damage` with `&expval` when the weapon hits (4101). `reduce_health` (2912) zeroes `*exp` first (2917-2919), returns 0 for a dead actor or a god-mode party/NPC actor (2921-2923), and for an immune monster it calls `fight_back` and returns (2930-2935).
- Defeat test: `defeated = is_dying() || (val <= 0 && oldhp > 0)` (3015). XP is only computed when `defeated && exp` (3017) and the victim is not asleep (3019). The comment at 3018 says "No experience for killing sleeping people."
- Victim base (raw properties, 3026-3028): `expval = STR + combat + (DEX + 1) / 3 + INT / 5`. The donor's comment at 3023-3025 says this must be computed before the equipment is deleted or transferred, so the code reads combat first.
- Monster base (3029-3034): `+ minf->get_base_xp_value()`. The monster record value is armour + weapon + up to five safety flags (monstinf.cc 167-172). The donor says the formula is exact (monstinf.cc 166).
- Possessions (3036-3082, only items whose owner is the victim): each item adds its armour value (3049) and OR-s its armour immunity bits into the immunity set (3057). A weapon item adds its base XP (3062; base = damage + 2 per power bit + 1 explode + 10 autohit + 1 no-blocking, weaponinf.cc 169-174), then a reach term: melee adds 2 if range > 5, else 1 if range > 3 (3067-3068); poor thrown adds combat / 5 (3071-3072); good thrown adds combat / 3 (3074-3075); ranged adds range / 2 (3077-3078).
- Immunity and vulnerability (3088-3090): `vuln &= ~immune`, then `+ popcount(immune)` and `- popcount(vuln)`. A vulnerability the victim is also immune to does not count.
- Halve (3092): `expval /= 2`. The result goes to `*exp` (3093).
- Credit (4193-4194): after the powers code read at 4175-4191 and before weapon usecode (4197), `expval > 0` with an NPC attacker adds `expval` to the attacker's `exp` property.
- Level-up (`set_property`, 2536-2553): exp is capped at `max_exp` (2538-2540). The old level is read, the new exp is written, and `delta = new level - old level`. Each level gained adds 3 training points (2546), with the gain capped at 255 (2547-2548) and added straight to the training property (2550). The running training total is not capped on this path.
- Level from exp (actors.h 565-567): `level = 1 + Log2(exp / 50)`.

## 2. Key functions

- `Actor::reduce_health`: `/mnt/frankendom-donors/exult-exult/actors.cc` 2912-3110. Health, the defeat test, the victim-side XP block (3017-3094), and the death call (3100-3101).
- `Actor::figure_hit_points`: same file, 4023-4200. Owns `expval` (4092), calls apply_damage with it (4101), and credits the attacker (4193-4194).
- `Actor::set_property` (exp case): same file, 2531-2553. Cap, level delta, training gain.
- `Monster_info::get_base_xp_value`: `/mnt/frankendom-donors/exult-exult/shapes/shapeinf/monstinf.cc` 165-175. Base for the monster record.
- `Weapon_info::get_base_xp_value`: `/mnt/frankendom-donors/exult-exult/shapes/shapeinf/weaponinf.cc` 167-175. Base for each weapon the victim carried.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Kill reward = victim's own stat strength + a fixed base for its record + its loadout, halved | Stat weights: whole STR, whole combat, (DEX+1)/3, INT/5 (theirs, actors.cc 3027-3028); halving (theirs, 3092) |
| Sleeping victim gives nothing | Zero (theirs, 3019) |
| Loadout bonus: items add armour, weapon base, reach bonus | Weapon base = damage + 2 per power bit + 1 explode + 10 autohit + 1 no-blocking (theirs, weaponinf.cc 169-174); melee reach +2 at range > 5, +1 at range > 3 (theirs, 3068); thrown combat/5 and combat/3 (theirs, 3072, 3075); ranged range/2 (theirs, 3078) |
| Immunities add, vulnerabilities subtract, shared bits cancel | Bit count (popcount); the cancel rule `vuln &= ~immune` (theirs, 3088) |
| Level = 1 + floor(log2(exp / 50)) | 50 (theirs, actors.h 566) |
| Exp cap | 999999 (theirs, actors.h 101) |
| Training per level gained | 3 (theirs, actors.cc 2546); cap 255 (theirs, actors.h 103, 2547) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: sleep gate, victim stats, monster base, then each carried armour value and weapon, then the immunity and vulnerability bit counts, then the halving. It then applies the exp cap and the level-up training gain. It omits: the defeat test and the god-mode and immune early returns, the tournament and split-death paths, the slime split, the weapon powers and their usecode calls, the death handler (`die`), the oppressor and target settings, and the NPC attacker check (the sketch takes the attacker's XP as an input). It uses `Math.trunc` for the integer divisions. Its `levelOf` returns 1 below 50 XP because the donor's `Log2` at 0 was not read. It uses the victim's raw stats as the donor does (3027-3028), not an effective stat value.

```ts
// Licence: GPL-2.0 (donor COPYING, version 2). Clean-room: written from the mechanism, not translated from the donor lines.
export interface CarriedWeapon {
  baseXp: number;
  reach: "melee" | "poorThrown" | "goodThrown" | "ranged" | "none";
  range: number;
}

export interface Victim {
  str: number;
  dex: number;
  int: number;
  combat: number;          // capped by the game elsewhere; used raw here
  asleep: boolean;
  monsterBaseXp: number;   // monster record: armour + weapon + safety flags
  immuneBits: number;      // immunity flags, as a bit mask
  vulnBits: number;        // vulnerability flags, as a bit mask
  carriedArmour: number[]; // armour value of each item the victim owned
  carriedImmunity: number; // armour immunity bits from those items (OR-ed into immuneBits)
  carriedWeapons: CarriedWeapon[];
}

const XP_CAP = 999999;      // total XP a character can hold
const TRAINING_PER_LEVEL = 3;
const TRAINING_CAP = 255;

export function popcount(n: number): number {
  let x = n >>> 0;
  let c = 0;
  while (x) { x &= x - 1; c++; }
  return c;
}

// XP the victim is worth to whoever lands the killing hit. Zero if the victim was asleep.
export function killXp(v: Victim): number {
  if (v.asleep) return 0;
  let xp = v.str + v.combat + Math.trunc((v.dex + 1) / 3) + Math.trunc(v.int / 5) + v.monsterBaseXp;
  let immune = v.immuneBits | v.carriedImmunity;
  for (const a of v.carriedArmour) xp += a;
  for (const w of v.carriedWeapons) {
    xp += w.baseXp;
    switch (w.reach) {
      case "melee": xp += w.range > 5 ? 2 : w.range > 3 ? 1 : 0; break;
      case "poorThrown": xp += Math.trunc(v.combat / 5); break;
      case "goodThrown": xp += Math.trunc(v.combat / 3); break;
      case "ranged": xp += Math.trunc(w.range / 2); break;
      case "none": break;
    }
  }
  // Vulnerabilities that the victim is also immune to do not count against the award.
  let vuln = v.vulnBits & ~immune;
  xp += popcount(immune);
  xp -= popcount(vuln);
  return Math.trunc(xp / 2);
}

// Add XP to the killer, capped. Returns the new level and the training points earned by the level-ups.
export function award(currentXp: number, gain: number, levelOf: (xp: number) => number): { xp: number; level: number; training: number } {
  const before = levelOf(currentXp);
  const xp = Math.min(XP_CAP, currentXp + gain);
  const after = levelOf(xp);
  const delta = Math.max(0, after - before);
  const training = Math.min(TRAINING_CAP, TRAINING_PER_LEVEL * delta);
  return { xp, level: after, training };
}

// Level from XP. The sketch returns 1 below 50 XP; the donor's Log2 for 0 was not read.
export function levelOf(xp: number): number {
  const q = Math.trunc(xp / 50);
  if (q < 1) return 1;
  return 1 + Math.floor(Math.log2(q));
}
```

## 5. Lands in

- TARGET `src/fight/reward.ts` (new, engine reward step on the server, called at the death event). Parity-checklist row 18 (loot roll and XP award). The loot half of row 18 is not in this note.
- today: not checked. No Frankendom source was opened in this pass, so whether a kill-XP path exists is unverified.
- Reuse tag: rewrite-from-idea (GPL-2.0: clean-room, shape only)
- Brief rule served: kills server-verified and one ledger (the award is computed in the engine from the victim's server record, never a client value); parity row 18

Best transferable idea: score a kill from the victim's own stats and loadout plus a fixed base from its record, halved, with a sleeping victim giving nothing, and derive level from the log2 of total XP.

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism.
- Raw versus effective stats: the donor reads raw properties for the victim (3027-3028). A Frankendom stat-modifier stack would give different values. Decide which one the award uses and test it.
- Loadout term: the victim's items add to its XP. In Frankendom this couples loot value to XP, so a designer can farm XP by dropping heavy gear. Decide whether that coupling is wanted.
- Server verification: the donor computes the award in the same process that applied the hit. Frankendom's award must be computed on the server from the server's record, with no client-supplied XP (the kill ruling).
- Training points are a second currency the donor gives on level-up. The brief does not mention training, so this is a design choice, not a port.
- The 3-per-level and 255 cap are donor numbers; the level curve (log2 of exp / 50) doubles XP per level. Frankendom progression data should own these values (zones-as-data rule).
- The donor credits the attacker after its powers code (4193). Frankendom should pick one order for the server's ledger and test it.
- Not read: the `Log2` and `bitcount` definitions, `Monster_info` and `Weapon_info` field values, the `die` path, the powers block body (4105-4174), and any party or group XP (none was found in the greps, which were not exhaustive). Each is a gap, not a claim.
