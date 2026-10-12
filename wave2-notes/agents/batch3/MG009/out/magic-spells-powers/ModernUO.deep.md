# ModernUO (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Necromancy/AnimateDeadSpell.cs` | Licence: GPL-3.0 (repo `LICENSE` is GNU GPL v3; `Projects/UOContent/Mobiles/AI/BaseAI/PetOrders.cs` header says "version 3"; `AnimateDeadSpell.cs` has no header) | C# | symbol `SummonDelay_Callback` (with `Register`, `Summoned_Damage`)

Checked: Read `AnimateDeadSpell.cs` in full (422 lines): target check 111-160, `Register` 260-285, drain 287-295, `SummonDelay_Callback` about 298-381, tier table and groups about 40-100. Also read the summon and slot code in `Server/Mobiles/Mobile.cs` 836-870 and 7827; `BaseCreature.cs` 2590-2650 (master and slots), 3170-3300 and 3336-3560 (kill rewards, loot rights, OnDeath), 3745-3870 (SetControlMaster, Summon helper), 5980-6010 (abandoned bonded pets); `Corpse.cs` 88-100, 222-330, 556-592, 855-900, 1120-1170 (of 1182 lines, not the whole file); `PetOrders.cs` 1-300 (of 859; Transfer, Patrol, Rename and Release not read); `BaseAI.cs` 940-958; `AIMovement.cs` 625-670; `Timer.DelayStateCall.cs` 24-40; `Timer.cs` 42-60, 78. Not read: the wander code that uses `RangeHome`; `Notoriety.cs:332`; `PetLogin.cs`. camera_scope: n/a (not a camera topic). Confidence: high on the AnimateDead numbers and order (read in full). Medium on the drain-timer defect: the code shows the returned timer is never stored or stopped, but I did not run it and did not read how the engine tears timers down.

Best transferable idea: a necromancer spends one fresh corpse as a one-shot resource to raise an ally whose tier is set by the caster's skill and the victim's fame, each caster keeps at most three living raises (the oldest is evicted), and each raise loses one hit point per tick until it is removed.
Decision (proposed): adapt - keep the corpse as a one-shot spend, the tier from fame and skill, and the cap of three per caster, but drive the drain from one server tick (not a repeating timer per creature) and fix the integer division in the tier score; reject the donor's karma and 1-day lifetime because Frankendom has no karma and fights are seconds long.
Acceptance: a player who raises from a 500-fame corpse at 100 necromancy and 100 spirit speak sees a skeleton-tier ally appear 2 s after the cast; a server test asserts that a 4th raise by one caster removes the oldest in that same tick, and that a raised creature with 100 hp is removed on the 101st drain tick (166.65 s at 1650 ms).

## 1. Mechanism

- **Cast.** Animate Dead targets a corpse. The target is refused unless the item is a corpse with the standard corpse graphic (`ItemID` 0x2006), not already animated, owned by a non-player (not a `PlayerMobile`, not null), with owner fame at least 100, and the owner is not summoned or bonded (`AnimateDeadSpell.cs` 137-141). Undead remains (an empty group) are refused (151). Cast delay 1.5 s (106); required skill 40 (108); mana 23 (109). The corpse is checked again after the delay.
- **Delay.** The raise happens 2.0 s after a successful target (175). In the callback the donor re-checks that the corpse is not animated or deleted and that the caster exists, and that the owner is still there (301-309).
- **Tier score.** Skill points are `trunc(necro x 30) + trunc(spirit x 70)` (316). The donor then computes `(score / 10) x 18` with integer division before the multiply, and clamps to `[0, owner fame]` (317). At 100 necromancy and 100 spirit speak the raw score is 10000 and the tier score is 18000, which is exactly the top default entry (`LichLord`, line 89). So the top tier needs both skills maxed and a victim of at least 18000 fame; a 500-fame victim never gets past the lowest tiers.
- **Tier pick.** Entries are checked from the highest requirement down (326). The first entry whose requirement the score meets gives a uniform random kind from that entry (333). Each creature group has its own ladder (read, lines about 40-100): the Default ladder runs 18000 `LichLord`, 10000 `FleshGolem`, 5000 `Lich`, 3000 `SkeletalKnight` or `BoneKnight`, 2000 `Mummy`, 1000 `SkeletalMage` or `BoneMagi`, 0 `PatchworkSkeleton`. Dragons use the same ladder with `SkeletalDragon` at 18000. Insects get a single maggot mound at 0. Mounts get `HellSteed` at 10000 and a skeletal mount at 0. Elementals get a wailing banshee at 5000 and a wraith at 0.
- **Spawn.** The creature is summoned uncontrolled: `ControlSlots` is 0 (1 for a mount) (362), it is marked `Summoned` with its master set to the caster, its backpack is cleared, `RangeHome` is 10, and an `UnsummonTimer` ends it after 1 day (`BaseCreature.Summon` helper 3838-3859; 366). Fame is set to 0 and karma to -1500 (375). A skeletal dragon loses 50% of its strength and hit point scale (`Scale`, read). The corpse gets hue 1109 and is flagged animated, so it cannot be raised twice (378-379).
- **Per-caster cap (the Register step).** Each caster has a list of their living raised creatures. After the add, if the list has more than three entries the oldest (index 0) is removed from the list and killed (272-276). Deleted entries are dropped first.
- **Life drain.** Each raised creature gets a `Timer.DelayCall` that starts at 1650 ms and repeats every 1650 ms (279-282). Each tick, `Summoned_Damage` loses one hit point while `Hits > 0` (289-291). A tick that finds `Hits` at 0 kills the creature. So a creature with N hit points dies on tick N+1. The `DelayCall` overload used passes count 0 (`Timer.DelayStateCall.cs` 33), and `Timer.cs` 78 treats count 0 as unbounded. Nothing in this file stores the returned timer or stops it when the creature dies.
- **Kill and loot rules for the raised creature.** A summoned creature gives no treasure chest or map (`BaseCreature.cs` 3241), no generated loot (3283), and no fame, karma, quest or faction credit (3546). Its master is not credited.

**Slot budget (summons and pets, the general rule).** `Mobile.FollowersMax` defaults to 5 (`Mobile.cs` 7827). `Followers` is a running total of `ControlSlots` of the master's pets. Each pet adds its slots when its master is set (`BaseCreature.cs` 2644) and removes them when the master changes (2630). Taming refuses if followers plus slots exceed the max (3770), and summon spells check the same budget before summoning (3826). Slot costs per spell in the donor: air elemental 2 (`Eighth/AirElemental.cs` 32), fire elemental 4 (`Eighth/FireElemental.cs` 33), water elemental 3 (`Eighth/WaterElemental.cs` 32), earth elemental 2 (`Eighth/EarthElemental.cs` 32), summon daemon 4 or 5 (`Eighth/SummonDaemon.cs` 34), animated weapon 4 (`Mysticism/AnimatedWeaponSpell.cs` 27), vengeful spirit 3 (`Necromancy/VengefulSpirit.cs` 79), mirror image 1 (`Ninjitsu/MirrorImage.cs` 63). Animated dead costs 0 slots; it is limited only by the three-raise cap.

**Corpses as a resource.** Default corpse decay is 7 minutes (`Corpse.cs` 96, 315). A monster corpse is flagged no-bones (254), so the decay timer deletes it (1157). A player corpse turns into bones with a second 7-minute timer (576), then is deleted. Raised creatures never come from player corpses (139).

**Pets: standing orders and stance (`PetOrders.cs`, `BaseAI.cs`, `AIMovement.cs`).** The order enum starts None, Come, Drop, Follow, Friend, Unfriend, Guard, Attack, Patrol, Release, Stay (`BaseCreature.cs` 44-62 read; later values not read). Only six orders are "restable", that is standing orders: None, Come, Guard, Attack, Stay, Follow (`PetOrders.cs` 25-27). Every other order is transient. When a transient finishes, `ResumeInterrupted` returns the interrupted order if it was restable, otherwise the standing order (68-71). Attack is the one case where a gone target forces the fallback. Only Attack, Guard, Drop, Friend, Unfriend and Rename keep the combat posture (33-35, 102-105). Any other order clears war mode and the combatant. `SetPersistentOrder` sets Home to zero for Follow and Guard, and anchors Home at the pet's current spot for every other standing order (54). A comment says a zero Home "wanders without bounds" (237). Attack auto-focus needs the target alive, visible and within twice perception (`BaseAI.cs` 940-950; `RangePerception` default 16, `BaseCreature.cs` 171, so 32 tiles). Chase leash is twice perception (`BaseCreature.cs` 1094). Guard paces back once the master is more than 3 tiles away (`BaseAI.cs` 28; `AIMovement.cs` 656). Follow counts as pacing to the master (`AIMovement.cs` 639-654).

**Bonded pets and abandonment.** A bonded pet that dies is not deleted: it becomes a dead pet with zero hit points and is ordered to follow its owner (`BaseCreature.cs` 3496). If the owner is more than 12 tiles away or cannot be seen, an abandonment time starts (3530-3537). After `BondingAbandonDelay`, which is 1 day (1391), a periodic pass removes it (5996-5998; enclosing method only partly read).

**Loot rights (who owns the kill).** `GetLootingRights` (3344-3455) walks the damage ledger newest first. Each entry's responsible sub-entries (`Responsible`) are credited to the sub-entry's damager if that damager is a player (3358-3360), and that damage is taken off the parent entry (3386). Only players get rights. The oldest hit (the first damager) gets its total multiplied by 1.25 (3428). The top total sets a threshold: top damage divided by 16 if max hit points are 3000 or more, by 8 if 1000 or more, by 4 if 200 or more, otherwise by 2 (3440 for the first case; the other three lines not receipted). A damager has the right if their total is at least the threshold (3450). `ComputeBonusDamage` credits a pet's damage to its master (3323). Corpses copy the rights holders into their aggressor list: a pet's master is always added (`Corpse.cs` 300), and holders with `m_HasRight` are added (308). How the aggressor list gates looting was not read.

XP: no XP award code was read. Kill rewards here are fame, karma, quest and faction credit, and loot rights.

## 2. Key functions

- `AnimateDeadSpell.Target` (`AnimateDeadSpell.cs` 111-160): the corpse eligibility gate, undead refusal (151), the 1.5 s cast delay (106), and the 2.0 s raise delay (175).
- `AnimateDeadSpell.SummonDelay_Callback` (about 298-381): the revalidation, the tier score (316-317), the tier pick (326-333), the spawn (362-366), the karma and hue marks (375-378), and `Register` (381).
- `AnimateDeadSpell.Register` (260-285): the per-caster list, the three-raise cap (272-276), and the drain timer (279-282).
- `AnimateDeadSpell.Summoned_Damage` (287-295): one hit point lost per tick, kill at zero.
- `BaseCreature.Summon` helper (3812-3870): the follower check (3826), `RangeHome` 10 (3840), the one-day `UnsummonTimer` (3859).
- `BaseCreature.Master` setter (1153-1180) and `RemoveFollowers` / `AddFollowers` (2625-2650): slot accounting.
- `BaseCreature.GetLootingRights` (3344-3455): the damage ledger, player-only rights, the 1.25 first-damager bonus, the threshold divisors.
- `BaseCreature.OnDeath` (3475-3560): the bonded-pet branch (3496) and the summoned no-award gates (3546).
- `Corpse` constructor (about 222-316): decay setup (315), monster no-bones (254), and aggressor and rights copy (300-308).
- `Corpse` decay (`InternalTimer.OnTick`, 1149-1162) and `TurnToBones` (560-580): the decay sequence.
- `BaseAI.IssueOrder` and `SetPersistentOrder`/`ResumeInterrupted` (`PetOrders.cs` 25-71, 88-120): the standing-order and transient-resume model.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Tier score = skill-weighted sum, scaled to a 0-18000 ladder, capped at the victim's fame, then the highest met tier is picked | Skill weights 30 (necro) and 70 (spirit) (316); scale x18 over 10 (317, donor integer division); top tier 18000 (89) |
| Ladder checked from the top, one random kind from the first met tier | Ladders per group (Default, Dragons, Elementals, Mounts, Insects; undead refused at 151) |
| Corpse is one-shot: flag it and refuse a second raise | Hue 1109 (378); fame gate 100 (139) |
| Per-caster cap, oldest evicted and killed on the fourth raise | Cap 3 (272) |
| Life drain: one point per fixed interval, kill on the tick after zero | Interval 1650 ms (280-281); step 1 (291) |
| Summoned creatures give no kill rewards | Gates at 3241, 3283, 3546 |
| Damage ledger to player rights with a first-damager bonus and a max-HP threshold | First-damager 1.25 (3428); threshold divisor 16 / 8 / 4 / 2 by max HP 3000 / 1000 / 200 / other (3440) |
| Follower slots: a pet costs its slot count, checked at taming and summon | Default max 5 (7827); per-spell and per-creature slot counts (see Mechanism) |
| Corpse decay: monsters delete, players turn to bones, then delete | Decay 7 min (96); bones 7 min (576) |
| Guard leash and chase leash | Guard range 3 (28); perception 16 (171); chase leash 2 x perception (1094) |
| Bonded death: dead pet follows owner; abandonment removes it after a day | Abandon delay 1 day (1391); owner range 12 (3530, 5996) |

Which numbers suit a fast mobile fight: 1.5 s cast and 2.0 s raise delay are long for a duel and would suit a telegraphed raise only; the 1650 ms drain is slow enough to read; a cap of three per caster and a per-creature drain give a clear "hunt the necromancer's allies" rule. The 18000 top tier and the 1-day lifetime are wrong scale for a fight of seconds.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: check the corpse, score the caster, pick the tier, spend the corpse, add to the caster's list with eviction, then drain each tick. It fixes the donor's integer division (divide after multiply) and replaces the per-creature repeating timer with a single tick call. It omits the cast and raise delays, the reagent and skill checks, the owner's summoned and bonded flags (the sketch takes an `eligible` boolean), the fame and karma changes, the hue and animated flag beyond `spent`, the skeletal dragon scaling, the one-day `UnsummonTimer`, the aggression and kill rules, and the group-specific ladders (one ladder is used). The `resolveRaise` caller is expected to set `spent` when the raise is committed.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

type Kind = string;
// Highest requirement first, as the donor orders its entries.
interface Tier { requirement: number; kinds: Kind[]; }

const TIERS: Tier[] = [
  { requirement: 18000, kinds: ["lord"] },
  { requirement: 10000, kinds: ["golem"] },
  { requirement: 5000, kinds: ["lich"] },
  { requirement: 3000, kinds: ["knight", "bone-knight"] },
  { requirement: 2000, kinds: ["mummy"] },
  { requirement: 1000, kinds: ["mage", "bone-mage"] },
  { requirement: 0, kinds: ["skeleton"] },
];

const MAX_RAISED_PER_CASTER = 3;  // a 4th raise evicts the oldest
const DRAIN_EVERY_MS = 1650;      // one hit point lost per interval
const DRAIN_STEP = 1;

export interface Corpse { ownerFame: number; eligible: boolean; spent: boolean; }
export interface Raised { id: string; hp: number; nextDrainMs: number; }

// Donor: skill points as trunc(necro*30) + trunc(spirit*70), then (score / 10) * 18, capped at the victim's fame.
// Defect fixed: the donor divides by 10 before the x18, which drops up to 9 points; this multiplies first.
export function tierScore(necro: number, spirit: number, ownerFame: number): number {
  const raw = Math.trunc(necro * 30) + Math.trunc(spirit * 70);
  const scaled = Math.floor((raw * 18) / 10);
  return Math.max(0, Math.min(scaled, ownerFame));
}

// First tier whose requirement the score meets; one kind chosen at random from that tier.
export function pickKind(score: number, rnd: () => number): Kind | null {
  for (const t of TIERS) {
    if (score < t.requirement) continue;
    return t.kinds[Math.floor(rnd() * t.kinds.length)];
  }
  return null;
}

export function canRaise(c: Corpse): boolean {
  return c.eligible && !c.spent && c.ownerFame >= 100;
}

export function resolveRaise(
  caster: { necro: number; spirit: number }, corpse: Corpse, rnd: () => number,
): Kind | null {
  if (!canRaise(corpse)) return null;
  return pickKind(tierScore(caster.necro, caster.spirit, corpse.ownerFame), rnd);
}

// Per-caster list, oldest first. Returns the evicted creatures so the caller removes them.
export function addRaised(list: Raised[], r: Raised): Raised[] {
  list.push(r);
  const evicted: Raised[] = [];
  while (list.length > MAX_RAISED_PER_CASTER) {
    evicted.push(list.shift() as Raised);
  }
  return evicted;
}

export function spawnRaised(id: string, maxHp: number, nowMs: number): Raised {
  return { id, hp: maxHp, nextDrainMs: nowMs + DRAIN_EVERY_MS };
}

// One call per server tick for each raised creature, no per-creature timer.
// Donor order: while hp > 0 lose one point; a tick that finds hp at 0 kills.
export function drainTick(r: Raised, nowMs: number): "alive" | "dead" {
  if (nowMs < r.nextDrainMs) return "alive";
  r.nextDrainMs += DRAIN_EVERY_MS;
  if (r.hp > 0) {
    r.hp -= DRAIN_STEP;
    return "alive";
  }
  return "dead";
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/mg009-modernuo-animate-dead.ts`: exit 0.

## 5. Lands in

- TARGET `src/fight/summons.ts` (new module: raised and summoned units are engine units; the corpse spend, the per-caster cap and the tick drain live here, not in the client). Parity-checklist row 13 (specials).
- today: (not checked in this pass; this reader did not open the Frankendom repo).
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 1 (one combat core, two clients): the raise, the cap and the drain are one engine step, and the client only shows them.

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism and typechecks; it is not a translation.
- The drain timer (`AnimateDeadSpell.cs` 279-282) is a repeating `DelayCall` per raised creature with no stored handle, and count 0 is unbounded (`Timer.DelayStateCall.cs` 33; `Timer.cs` 78). From the code, a creature that is killed or evicted keeps its timer running, which calls `Kill()` again on a dead mob. I did not run this, and I did not read how the engine tears timers down. Fix in the sketch: one engine tick, no per-creature timer.
- Integer division in the tier score (317): `casterAbility / 10 * 18` loses up to 9 points before the multiply. Fix: multiply first (sketch).
- Summoned creatures give no kill credit, but the donor still credits the master's damage through the ledger (3358-3360). Frankendom rule: kills are server-verified and one ledger. Summon damage must credit the caster in the engine ledger, which is parity row 18 (loot and XP award), not row 13. Cross-check against row 18 before building.
- The three-raise cap (272) is per caster and per spell family; it is not Frankendom's `MAX_ATTACKERS = 3`, which limits attackers on one target. Do not merge the two rules.
- Karma -1500 and fame 0 on raised units (375) are donor social flags. Frankendom has no karma; cut.
- The one-day lifetime (366) is a backstop for a world that lasts hours. A fight lasts seconds: the drain alone should end a raise, and the lifetime should be seconds or the fight end.
- Corpse decay (96) and monster corpse no-bones (254) are per-zone data candidates (zones as data).
- The pet stance model (`PetOrders.cs`) is larger than Frankendom needs. Keep only the standing-order and transient-resume rule. The Guard leash (3 tiles) and the attack auto-focus (twice perception) are numbers worth testing against the Pit and zones.
- Not read: the rest of `PetOrders.cs`, the `RangeHome` wander code, `Notoriety.cs:332`, `PetLogin.cs`, the aggressor gate in `Corpse.Open`. The camera is not part of this topic.
- Reuse tag and brief rule as in section 5.
