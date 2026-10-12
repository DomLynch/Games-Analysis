# ModernUO (death-respawn-penalty, cell 2)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/PlayerMobile.cs` (2381-2570), `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` (4740-4850), `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Item.cs` (2279-2336), `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Insurance/Insurance.cs`, `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Misc/Corpses/Corpse.cs`, `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` (3344-3460), `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Necromancy/AnimateDeadSpell.cs` | Licence: GPL-3.0 (`/mnt/frankendom-donors/ModernUO/LICENSE`, "GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007"; copyright ModernUO Development Team) | C# | symbol `Mobile` death item loop, `PlayerMobile.OnDeath`, `Insurance.CheckItemInsuranceOnDeath`, `BaseCreature.GetLootingRights`, `AnimateDeadSpell.SummonDelay_Callback`

Checked: Opened and read: Mobile.cs 4740-4850 (death item loop, corpse creation), Mobile.cs 1648 and 1677 (KeepsItemsOnDeath, Murderer), Mobile.cs 960-975 (damage-entry ordering doc), Item.cs 2279-2336 and 4428-4431 (per-item death rules), PlayerMobile.cs 2381-2390, 2403-2480 (death hooks, young and insurance overrides), 2480-2570 (OnDeath, criminal corpse flag, justice award, insurance settle, young teleport), Insurance.cs 1-141 (insurance cost, reward, saved-item decision, duel exemption, CanInsure; the rest of the file only grep-matched), Corpse.cs 92-97, 315, 321, 380, 750-770, 860-895 (decay, instanced window, loot rights), Notoriety.cs 266-290 (partly), BaseCreature.cs 3344-3460 and 3550 (monster loot rights), AnimateDeadSpell.cs 111-200, 205-300, 316-372 (animate dead), Resurrection.cs 28-68, ResGate.cs 19-27, ValueLinkList order (Mobile.cs 968), Timer.cs 78 and Timer.DelayStateCall.cs 32-37 (repeat count). Not read: Mobile.FindMostRecentDamager, DamageEntry expiry, CorpseNotoriety below line 290, Corpse loot packets and Corpse.Open, Banker, the Ankh item, the murder-context file (PlayerMurderSystem, only referenced), and the death-robe item. Confidence: high on the item-tier order, insurance decisions and the loot-rights threshold; medium on the corpse notoriety for non-owners (partly read). Camera scope: not applicable.

## 1. Mechanism

- Death is one synchronous sequence in `Mobile` (Mobile.cs 4740-4850): clear trades, combat and spells; snapshot the item lists; for each worn item call `GetParentMoveResultFor` (4796), for each backpack item call `GetInventoryMoveResultFor` (4822). Each result is one of three: remain equipped, move to backpack, or move to the corpse. Then `CreateCorpseHandler` builds the corpse from the content and equip lists (4847).
- Item tiers. A worn item (Item.cs 2279-2306): not movable means it stays equipped; staff (`KeepsItemsOnDeath`) keep all; blessed, insured or blessed-for-this-mob (`CheckBlessed`, 4428-4429) keep; newbied items keep unless the victim is a murderer (2296); a player's nontransferable item keeps (2301); everything else goes to the corpse (2306). The pack rule (Item.cs 2309-2336) is the same, with the not-movable case going to the backpack instead of remaining equipped.
- PlayerMobile adds two overrides. Insurance is checked first (PlayerMobile.cs 2431-2443). Then a young player's movable item that would go to the corpse goes to the backpack instead (2446; the same at 2469 for the pack). So a Young player's movable items go to the backpack and the corpse holds none of them.
- Murderer tier. `Murderer` is `Kills >= 5` (Mobile.cs 1677). Newbied items are protected from death only while the victim is not a murderer (Item.cs 2296, 2326). A corpse snapshots its owner's murderer and criminal status (Corpse.cs 380; PlayerMobile.cs 2497-2503 sets `corpse.Criminal = true` when the victim had any perma flag).
- Insurance (Insurance.cs). Before death, the most recent damager becomes the reward target (31-43); a pet damager is first mapped to its master (37-39), so a pet kill rewards the owner. It must be another player. Each insured item on death is decided by `CheckItemInsuranceOnDeath` (68):
  - an active duel keeps insured items and spends nothing (75-77);
  - with auto-renew on, the cost is withdrawn from the bank (85-94), halved when a player was the reward target (89-91; the donor's flat cost is 600, line 22);
  - if the bank cannot pay, the item loses its insurance and renewal is marked missed (105-107);
  - without auto-renew the insurance is used up on that death (112);
  - in every saved case the reward target gets 300 gold (115), deposited at settle time (48-64).
  An item that is insured is moved to the backpack (kept). Insured items cannot be stacks, containers, cursed, mounts or the death shroud (CanInsure, 141).
- Corpse decay and the corpse run. A corpse decays after 7 minutes (Corpse.cs 96, 315). The first 3 minutes after death are the instanced window, a Core.SE rule (94, 321). The corpse is the only place the lost items wait, so the recovery walk is the run. No corpse-summon function was found in the files read.
- Corpse looting. A non-owner's loot is a criminal act when `IsCriminalAction` is true (Corpse.cs 750-770): not the owner, not a game master or above (752-755), not a party member with loot rights, and the notoriety to the corpse is Innocent (`CorpseNotoriety`, Notoriety.cs 266-290). Looting a criminal act is blocked only on maps with the harmful-restrictions rule (Corpse.cs 860-861). A corpse flagged murderer or criminal (Notoriety.cs 281, 286) gives a different notoriety.
- Monster loot rights (BaseCreature.cs 3344-3460, used at death at 3550). Damage is summed per attacker from the unexpired damage entries, newest first. Each entry's responsible damagers are credited (3358; deleted or non-player responsibles skipped, 3360), and only player damagers count (3391). How a pet's damage reaches its master through the responsible list was not read in full. The first damager's total is multiplied by 1.25 (3428). Sorting by total gives the top. The threshold is `top / 16` when max HP is 3000 or more, `top / 8` at 1000 or more, `top / 4` at 200 or more, and `top / 2` below that (3438-3443). An attacker has the loot right if their total is at least the threshold (3450).
- Resurrection. A resurrection spell takes a dead player within range 1 (Resurrection.cs 28-60; blocked in one region at 55; not usable on a bonded dead pet). It does not revive directly: it sends the target a resurrection gump (67), which the target must accept. A resurrection gate does the same when a dead player steps on it (ResGate.cs 21-26). Any resurrection from dead to alive gives the player a death robe (PlayerMobile.cs 2387-2389).
- Necromancy on corpses (Animate Dead). The caster targets a corpse (AnimateDeadSpell.cs 131). It must be an NPC corpse, not animated, with the owner's fame at 100 or more (139-140; a player corpse is refused). After a 2-second delay (175) the caster's ability is `(necro*30 + spirit*70) / 10 * 18`, clamped to 0..owner fame (316-317). The first tier whose minimum the ability reaches gives the creature type, picked at random within the tier (326-333). Each caster has a rolling cap of three undead (272-275): a fourth kills the oldest. Each undead loses one hit point per 1.65 s (280-281, 287-295) and lasts one day (366). A skeletal dragon loses half its hit points and strength (371).

Tick: the death step is synchronous. Corpse decay, rot and the undead timers are timers (Corpse.cs 315; AnimateDeadSpell.cs 279-281).

## 2. Key functions

- `Mobile` death item loop: `/mnt/frankendom-donors/ModernUO/Projects/Server/Mobiles/Mobile.cs` 4740-4850.
- `Item.OnParentDeath` and `Item.OnInventoryDeath`: `/mnt/frankendom-donors/ModernUO/Projects/Server/Items/Item.cs` 2279-2336.
- `PlayerMobile.GetParentMoveResultFor`, `GetInventoryMoveResultFor`, `OnDeath`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/PlayerMobile.cs` 2431-2470, 2480-2570.
- `Insurance.CheckItemInsuranceOnDeath` and `CheckInsuranceBeforeDeath`/`CheckInsuranceOnDeath`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Insurance/Insurance.cs` 22-116.
- `Corpse` decay, criminal action, can-loot: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Items/Misc/Corpses/Corpse.cs` 750-770, 860-895.
- `BaseCreature.GetLootingRights`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Mobiles/BaseCreature.cs` 3344-3455.
- `AnimateDeadSpell.Target`, `Register`, `SummonDelay_Callback`, `Summoned_Damage`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Necromancy/AnimateDeadSpell.cs` 111-372.
- `ResurrectionSpell.Target`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Spells/Eighth/Resurrection.cs` 28-68.

## 3. Numbers vs mechanism

| Formula or rule | Number range (donor value) | file:line |
|---|---|---|
| Item fate, worn: keep if blessed, insured, newbied (not murderer), or nontransferable player item | rules, no numbers | Item.cs 2291, 2296, 2301; 4429 |
| Murderer threshold | Kills >= 5 | Mobile.cs 1677 |
| Insurance cost per item (auto-renew) | 600 flat; 300 when a player was the reward target (halved) | Insurance.cs 22, 89-94 |
| Insurance bonus to reward target | 300 per saved item | Insurance.cs 115 |
| Corpse decay | 7 min (420 s) | Corpse.cs 96, 315 |
| Instanced corpse window | 3 min (180 s), Core.SE | Corpse.cs 94, 321 |
| Monster loot-right threshold | top / 16 (max HP >= 3000); top / 8 (>= 1000); top / 4 (>= 200); top / 2 (below) | BaseCreature.cs 3438-3443 |
| First damager bonus | x 1.25 (integer cast) | BaseCreature.cs 3428 |
| Animate Dead fame gate | owner fame >= 100 | AnimateDeadSpell.cs 140 |
| Animate Dead ability | (necro x 30 + spirit x 70) / 10 x 18, clamped to owner fame (divide before multiply) | AnimateDeadSpell.cs 316-317 |
| Animate Dead cap per caster | 3 (the fourth kills the oldest) | AnimateDeadSpell.cs 272-275 |
| Animate Dead cast delay | 2 s | AnimateDeadSpell.cs 175 |
| Undead rot | 1 hit point per 1650 ms | AnimateDeadSpell.cs 280-281, 287-295 |
| Undead life | 1 day | AnimateDeadSpell.cs 366 |
| Skeletal dragon on summon | hit points and strength x 0.5 | AnimateDeadSpell.cs 371 |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order: item fate first, then insurance, then the loot-right threshold, then the corpse-loot gate and the Animate Dead ability/cap/rot. It drops the death robe, the justice award, the young teleport, the faction, guild and quest death hooks, the damage-entry expiry and the donor's `FindMostRecentDamager` (the sketch takes the reward target as an input), and it treats the bank as a plain number. The loot rights are computed from totals that the caller has already merged per player (pets credited to the master). The Animate Dead ability is fixed to multiply before dividing; the donor's divide-first rounding is named as a defect below. The rot timer is a pure step; the caller must stop the donor's timer when it reports dead (the donor does not).

```ts
// Licence: GPL-3.0 (donor ModernUO). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room

// ---- 1. Death: where each item goes (worn items and pack items use one rule set) ----
export type Fate = "corpse" | "keep" | "remain";
export interface ItemFlags { movable: boolean; blessed: boolean; insured: boolean; newbied: boolean; nontransferable: boolean; }
export interface VictimCtx { isPlayer: boolean; keepsItems: boolean; murderer: boolean; young: boolean; }

export function fateOnDeath(it: ItemFlags, v: VictimCtx, worn: boolean): Fate {
  if (it.insured) return "keep";   // donor runs insurance first (PlayerMobile.cs 2431, 2459), even for a non-movable worn item
  if (!it.movable) return worn ? "remain" : "keep";
  if (v.keepsItems || it.blessed) return "keep";
  if (it.newbied && !v.murderer) return "keep";
  if (v.isPlayer && it.nontransferable) return "keep";
  if (v.isPlayer && v.young) return "keep";   // young players lose nothing on the corpse
  return "corpse";
}

// ---- 2. Insurance: one saved item per paid cover ----
export interface InsuranceOutcome { saved: boolean; bank: number; stillInsured: boolean; bonusToKiller: number; }

export function settleInsurance(
  insured: boolean, autoRenew: boolean, bank: number, killedByPlayer: boolean, inDuel: boolean,
): InsuranceOutcome {
  if (!insured) return { saved: false, bank, stillInsured: false, bonusToKiller: 0 };
  if (inDuel) return { saved: true, bank, stillInsured: true, bonusToKiller: 0 }; // duel: kept, cover not spent
  if (!autoRenew) return { saved: true, bank, stillInsured: false, bonusToKiller: 300 }; // cover used up
  const cost = killedByPlayer ? 300 : 600;   // flat cost in the donor, halved when a player killed you
  if (bank >= cost) return { saved: true, bank: bank - cost, stillInsured: true, bonusToKiller: 300 };
  return { saved: true, bank, stillInsured: false, bonusToKiller: 300 }; // saved now, renewal missed
}

// ---- 3. Monster loot rights: damage share with a threshold that scales with max HP ----
export function lootRights(totals: Map<string, number>, hitsMax: number, firstDamager?: string): Set<string> {
  const rights = new Set<string>();
  if (totals.size === 0) return rights;
  if (firstDamager !== undefined && totals.has(firstDamager)) {
    totals.set(firstDamager, Math.trunc((totals.get(firstDamager) as number) * 1.25)); // first hit gets 25 percent
  }
  const top = Math.max(...totals.values());
  const div = hitsMax >= 3000 ? 16 : hitsMax >= 1000 ? 8 : hitsMax >= 200 ? 4 : 2;
  const min = Math.trunc(top / div);
  for (const [who, dmg] of totals) if (dmg >= min) rights.add(who);
  return rights;
}

// ---- 4. Corpse looting: a non-owner loot can be a criminal act ----
export interface CorpseLootCtx {
  owner: string;
  partyMemberCanLoot: (who: string) => boolean;
  notorietyInnocent: (who: string) => boolean; // from the donor's CorpseNotoriety (not read in full)
  harmfulRestrictionsMap: boolean;
}
export function canLoot(c: CorpseLootCtx, who: string): { ok: boolean; criminal: boolean } {
  const criminal = who !== c.owner && !c.partyMemberCanLoot(who) && c.notorietyInnocent(who);
  return { ok: !criminal || !c.harmfulRestrictionsMap, criminal };
}

// ---- 5. Animate dead: ability, tiers, and a rolling cap of three per caster ----
// Fixed: multiply before divide (the donor divides by 10 first, which steps in blocks of 10 raw points).
export function undeadAbility(necro: number, spirit: number, ownerFame: number): number {
  const raw = Math.trunc(necro * 30) + Math.trunc(spirit * 70);
  return Math.min(Math.max(Math.trunc((raw * 18) / 10), 0), ownerFame);
}

export interface Tier<T> { min: number; kinds: T[]; }   // tiers ordered from highest min to lowest
export function pickTier<T>(ability: number, tiers: Tier<T>[], rnd: () => number): T | null {
  for (const t of tiers) {
    if (ability < t.min || t.kinds.length === 0) continue;
    return t.kinds[Math.floor(rnd() * t.kinds.length)] ?? null;
  }
  return null;
}

export function registerUndead(list: number[], id: number, cap = 3): number | null {
  list.push(id);
  return list.length > cap ? (list.shift() as number) : null; // the oldest is killed
}

// Rot: one hit point per tick (donor interval 1650 ms), dies at zero. Caller stops its timer on dead.
export function rotTick(hp: number): { hp: number; dead: boolean } {
  return hp > 0 ? { hp: hp - 1, dead: false } : { hp: 0, dead: true };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/DR001-ModernUO-death.ts): exit 0, no output.

## 5. Lands in

- TARGET `src/fight/death.ts` (new module: item fate on death, insurance-style one-shot cover, corpse loot gate, rez windows). The loot-right threshold belongs to the loot module (parity row 18, loot roll and XP award); the sketch keeps it here only as a function the death step calls.
- Parity-checklist row 17 (death/respawn). Row 23 (zone population) does not apply: the donor's undead cap and corpse decay are per-caster and per-corpse.
- Server tick: the donor's corpse decay and rot run as timers; Frankendom's equivalent should be a per-tick step with dt, not a timer per corpse (see defect 2).

Best transferable idea: Loot rights come from each player's damage share on the fight, with the threshold a fraction of the top share that shrinks as max HP grows and a bonus for the first hitter, so the finisher and small hitters are both data-driven.
Decision (proposed): adapt — take the damage-share rights and the max-HP divisor for many-on-one fights (MAX_ATTACKERS = 3 is a Frankendom rule, not checked against the donor) and the item-fate tiers for the open PvP flag; do not take the flat insurance cost or the leaked undead rot timer.
Acceptance: A server test on a 3000-max-HP target with three players: the first hitter's total is multiplied by 1.25, a player below top/16 gets no loot right, a player at or above it does; a murderer's newbied items are lost while a non-murderer's are kept.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, shape only)
Brief rule served: 1 (one ledger: item fate decided once, server-side); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- Defect 1 (Animate Dead ability, integer division): `casterAbility / 10 * 18` (AnimateDeadSpell.cs 317) divides first, so the ability steps in blocks of 10 raw points and loses up to 17 points. Impact is small at skill scale. Fix: multiply first, `raw * 18 / 10` (the sketch does this).
- Defect 2 (undead rot timer never stops): `Timer.DelayCall(1650 ms, 1650 ms, Summoned_Damage, summoned)` (AnimateDeadSpell.cs 279-281) has count 0, which repeats forever (Timer.cs 78; DelayStateCall.cs 32-37). `Summoned_Damage` calls `Kill()` when hits reach zero (295), and nothing in the read code stops the timer, so each dead undead keeps a live repeating timer. The repeat `Kill()` is harmless because `Kill()` returns early when the mobile is dead or deleted (Mobile.cs 4721-4729); the defect is only the leaked timer (interval also rounds up to the 8 ms wheel tick, Timer.TimerWheel.cs 34, 181-189, so 1650 ms runs as 1656 ms). Read from code, not run. Fix: keep the Timer and call `Stop()` when the creature dies or is deleted, or count down with a finite count.
- Also found: pet damage reaches its master through each damage entry's responsible list (BaseCreature.cs 3351-3380, only player responsibles count), so a pet's damage counts for its master in loot rights; the sketch expects the caller to merge it. Defect 3 (first-damager intent): `firstDamager` (BaseCreature.cs 3428) is the last entry processed in newest-first order, which is the least recent unexpired entry (Mobile.cs 968). That matches the name. Not a defect; noted because the order is easy to misread. Damage expiry (DamageEntry) was not read.
- Gap, insurance: the cost is flat 600 per item (Insurance.cs 22) and does not scale with item value. Frankendom should scale by item tier, and the test should assert the bank is not overdrawn.
- Gap, corpse run: the corpse decays after 7 minutes (Corpse.cs 315). Frankendom rulings do not set a corpse window. Decide it as zone data, not a constant.
- Gap, rez: resurrection is consent-based (a gump the target must accept, Resurrection.cs 67; ResGate.cs 26). Frankendom's server-verified rulings can keep the gump as a client step, but the rez outcome must come from the server.
- Open: the donor's death hooks for faction, guild and quests (PlayerMobile.cs 2550-2570) were not read in full; their rules may change who gets rewards.
- Open: the Murderer state (Kills >= 5, Mobile.cs 1677) is the reputation rule for another topic (RF). Only its death effects are recorded here.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) Defect 2 overstated: Mobile.Kill() returns early when !Alive/Deleted (Mobile.cs 4721-4729), so the leaked rot timer calling Kill() again every tick is harmless; the real defect is only a leaked repeating timer (count 0 confirmed Timer.DelayStateCall.cs 32-33). Also Timer interval is rounded up to an 8 ms tick (Timer.TimerWheel.cs 34, 181-189) so 1650 ms runs as 1656 ms. 2) Insurance reward target: note says most recent damager that is another player; real code (Insurance.cs 37-39) first maps a BaseCreature damager to its master, so a pet kill rewards the owner (the note's section 1 omits this). 3) The note's 'Young keeps items on the body but loses the corpse content' is confusingly worded: Young movable items go to backpack, so the corpse is empty of them (PlayerMobile.cs 2446, 2469); wording confusing, rule right. 4) IsCriminalAction has a GM exemption (Corpse.cs 752-755) not mentioned. 5) Sketch fateOnDeath returns remain/keep for non-movable before insurance; donor runs insurance first (PlayerMobile.cs 2431, 2459) so an insured non-movable worn item goes to backpack, not remain-equipped. Verified OK: death tier order Item.cs 2279-2336, Murderer Kills>=5 (Mobile.cs 1677), insurance cost 600 (Insurance.cs 22), halving 91, bonus 300 (115), duel exemption 75, loot rights 1.25 and 16/8/4/2 thresholds (BaseCreature 3428-3443), decay 7 min, instanced 3 min SE, Animate Dead gates 139-140, ability formula 316-317 divide-first, cap 3 (272), 2 s delay (175), 1 day (366), dragon 50 percent (371), GPL-3. Acceptance test (3000 HP, 1.25, top/16, murderer newbied) matches the sketch and donor, no self-failing claim. Decision text cites MAX_ATTACKERS = 3 (a Frankendom rule, not checked).
Missed: Pet damage credit to master in GetLootingRights (subEntry loop 3351-3380) and pet-master reward in CheckInsuranceBeforeDeath are the missed simpler rules; note says pet path 'not read in full'. Bank fallback order for insurance is fine.

Fixed 2026-10-12 (Sonnet fixer): Defect 2 softened to a leaked timer (Kill returns early on dead, Mobile.cs 4721-4729); insurance reward target maps pets to master (Insurance.cs 37-39); Young wording clarified; GM exemption added; sketch fateOnDeath now checks insurance before the non-movable case; pet credit added as Also found.
