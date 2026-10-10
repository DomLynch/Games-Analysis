# 0ad-0ad (progression, cell 1)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Promotion.js` | Licence: GPL-2.0-or-later (LICENSE.txt: `binaries/data/` is GPL version 2 or later, see license_gpl-2.0.txt) | JavaScript (0 A.D. simulation script) | symbol `Promotion.prototype.IncreaseXp`

Checked: Promotion.js read in full (141 lines); `IncreaseXp` at 57-99 read line by line. XP sources read: `HandleAttackEffects` (Attack.js 303-344, XP credit 338-344), `Health.prototype.TakeDamage` (Health.js 188-198; `Reduce` not read), `Heal.prototype.PerformHeal` (Heal.js 204-231), `ChangeEntityTemplate` (Transform.js 4-95, XP carry at 82-87), Loot.js 1-20, and the damage receiver map (simulation/data/attack_effects/damage.json, line 5). Callers of `IncreaseXp` checked: Attack.js, Heal.js, Transform.js, Promotion.js (self), Commands.js 646-648 (cheat, grep only). Not read: `ApplyModifiers` / `ApplyTemplateModifiers` (ModifiersManager), `StatusBars.js` 187 and `GuiInterface.js` 555 (display, grep only). Confidence: high on the XP-to-promotion path as written; I read only one receiver (damage), so "every hit" is limited to the damage receiver. Licence read from LICENSE.txt; clean-room, shape only.

Best transferable idea: award a unit's XP per hit as its loot value times the share of its max health that hit removed, then promote through as many tiers as the carried XP pays for, in one loop.
Decision (proposed): adapt - the per-hit damage-share award and the tier carry-over fit a 3-attacker fight and a server ledger; the passive trickle timer and the entity-template swap do not fit our rulings (passive XP is not a server-verified kill, and tiers are data, not templates).
Acceptance: a server test with a victim of 100 loot XP and 120 max HP: a 60-HP hit from one attacker credits 50 XP; a second hit worth 65 XP leaves that attacker at tier 1 with 15 XP carried; a status-effect tick credits 0 XP.

## 1. Mechanism

- Each unit has an XP counter (`currentXp`). XP enters in three places: its own hits (Attack.js 342-344), healing it does (Heal.js 228-231), and a carry-over when its entity is replaced by a promoted one (Transform.js 82-87). A 1 s trickle timer also adds XP (Promotion.js 107-130), but I found no template that sets a `TrickleRate` (grep for `<TrickleRate>` under templates/ returned 0 matches).
- A hit's XP is computed in the damage receiver. `Health.prototype.TakeDamage` (Health.js 188) gives `change.xp = loot XP x (health removed) / max health` only when the victim has Loot XP and `change.healthChange < 0` (196-197). The attack helper credits it to the attacker's Promotion (342-344). Status-effect damage gives no XP (338-340).
- Order inside `IncreaseXp` (Promotion.js 57-99): (a) if this unit already has a promoted successor waiting to be destroyed, forward the XP to the successor and return (61-66); (b) add the amount (69); (c) read the current tier's required XP through value modifiers (70, 24); (d) if XP >= required: look up the owning player and return if none, before spending anything (75-77); spend the required XP (80); loop: fetch the next template, stop if it has no Promotion block (86-87), read its required XP with modifiers (88), stop if XP is below it (90-91), otherwise spend it and advance (92-93); (e) `Promote`: if HP is 0, return without a template change (39-44), else `ChangeEntityTemplate` (46); (f) post `ExperienceChanged` (98). Step (f) is skipped by the early return in (d).
- Consequence of that order: on a hit that completes a tier while the unit dies, the XP is spent (80) and the tier is not gained (39-44). I found no comment in the donor saying whether this is intended.
- Heal XP: `PerformHeal` gives the healer `(healed amount / target max HP) x target Loot XP` (230-231), using the healed target's Loot value.
- Numbers as shipped in the templates: infantry Loot XP 100 (template_unit_infantry.xml 44), infantry RequiredXp 100 (54); cavalry Loot XP 130 (template_unit_cavalry.xml 39), cavalry RequiredXp 150 (49). So one infantry kill at full HP is worth 100 XP and one tier costs 100.

## 2. Key functions

- `Promotion.prototype.IncreaseXp`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Promotion.js` 57-99. Whole XP-to-tier pipeline.
- `Promotion.prototype.Promote`: Promotion.js 37-47. Dead-unit check (39-44), template swap (46).
- `Promotion.prototype.CheckTrickleTimer` / `TrickleTick`: Promotion.js 107-130. Interval 1000 ms (124) calls `IncreaseXp(trickleRate)` (129).
- `Health.prototype.TakeDamage`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Health.js` 188-198. XP share at 196-197.
- `AttackHelper.prototype.HandleAttackEffects`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/helpers/Attack.js` 303. Status-effect exception 338-340, XP credit 342-344.
- `Heal.prototype.PerformHeal`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Heal.js` 204. Healer XP at 226-231.
- `ChangeEntityTemplate`: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/helpers/Transform.js` 4. XP carry at 82-87 (the old entity's counter is handed to the new one).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| XP for a hit = victim loot XP x health removed / victim max health | Loot XP per unit: infantry 100 (theirs, template_unit_infantry.xml 44), cavalry 130 (theirs, template_unit_cavalry.xml 39) |
| Tier carry-over loop: spend the current requirement, climb while XP still covers the next one | RequiredXp per tier: infantry 100 (theirs, template_unit_infantry.xml 54), cavalry 150 (theirs, template_unit_cavalry.xml 49) |
| Trickle: a fixed-interval timer adds a rate as XP | Interval 1000 ms (theirs, Promotion.js 124). TrickleRate: no value found in templates/ (0 matches for `<TrickleRate>`). |
| Required XP and loot XP pass through value modifiers (techs, auras) | Modifier names "Promotion/RequiredXp" (Promotion.js 24, 88) and "Loot/xp" (Loot.js 15) |
| Healer share: healed fraction x target loot XP | Same formula as hits (Heal.js 231) |
| Dead unit: XP spent, tier not gained | Mechanism (Promotion.js 80 vs 39-44) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order that matters: XP is added first, the tier loop spends each requirement and climbs, and a dead unit spends XP but keeps its tier. It omits the trickle timer, the forwarding of XP to a promoted successor (Promotion.js 61-66), the template swap and the ExperienceChanged message, the owning-player gate (75-77), the value-modifier lookups (tech and aura multipliers), the healer path, and the Transform carry-over. The donor's loop re-reads each next template; the sketch uses a plain array indexed by tier, so the template chain becomes data.

```ts
// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

interface TierRules {
  requiredXp: number[];   // XP needed to leave tier i; the top tier has no entry
}

interface Veteran {
  tier: number;
  xp: number;
  alive: boolean;
}

// XP one hit is worth: the victim's loot XP times the share of its max health this hit removed.
function xpForHit(victimLootXp: number, healthRemoved: number, victimMaxHp: number): number {
  if (healthRemoved <= 0 || victimMaxHp <= 0) return 0;
  return (victimLootXp * healthRemoved) / victimMaxHp;
}

// Add XP, then climb as many tiers as the carried XP pays for.
function addXp(v: Veteran, amount: number, rules: TierRules): void {
  v.xp += amount;
  let tier = v.tier;
  while (tier < rules.requiredXp.length && v.xp >= rules.requiredXp[tier]) {
    v.xp -= rules.requiredXp[tier];
    tier += 1;
  }
  // XP is spent even when the unit is dead, but the tier only changes for a living unit (as in the donor).
  if (tier !== v.tier && v.alive) v.tier = tier;
}

// Example with the donor's infantry tier-0 requirement of 100 XP.
const rules: TierRules = { requiredXp: [100, 150] };
const v: Veteran = { tier: 0, xp: 0, alive: true };
addXp(v, xpForHit(100, 60, 120), rules); // 50 XP, still tier 0
addXp(v, xpForHit(130, 60, 120), rules); // +65 XP: 115 -> tier 1 with 15 carried
```

## 5. Lands in

- TARGET `src/fight/xp.ts` (new module): the XP ledger for a fight. Parity-checklist row 18 (loot roll and XP award), sub-line for the per-hit damage-share award. Server-side only: XP is credited from hits the server has applied, never from client claims.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: one ledger (XP is a server value credited per server-applied hit); kills server-verified; row 18.

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism and was not translated line by line.
- Per-hit award, not kill-only: the donor credits every damaging hit. With MAX_ATTACKERS = 3, three attackers would split a victim's loot XP by damage share. That is the intended shape, but the server must credit only hits it has applied, and must not credit a hit it rejected.
- The donor loses XP on a death that completes a tier (Promotion.js 80, then 39-44). Frankendom must pick one rule for a dead attacker and test it; the ledger must not lose XP silently.
- The trickle timer gives XP with no hit and no kill. Under server-verified kills that is a bypass. Reject for duel XP; if a zone wants passive XP, it must be a server-side tick with its own data field, not a client timer.
- Entity-template swap is an engine entity replacement. Frankendom's hero has one character and one ledger, so the tier is a field, not a template change. Do not port `ChangeEntityTemplate` as is.
- Value modifiers (techs and auras) are the donor's way to change RequiredXp and Loot XP. Express them as zone data fields with defaults, not constants in the function. The ModifiersManager was not read.
- Heal XP is a route to XP that has no Frankendom counterpart in the duel. Left out of the adoption.
- Not read: ModifiersManager internals, the display code in StatusBars.js and GuiInterface.js.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: one ledger; server-verified kills; parity row 18 (loot roll and XP award).
