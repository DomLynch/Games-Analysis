# ACEmulator-ACE (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` (plus `Player_Xp.cs`, `Managers/EnchantmentManager.cs`, `Managers/AllegianceManager.cs`, `Entity/CreatureVital.cs`, `Corpse.cs`) | Licence: GNU AGPL v3 (LICENSE file, read: "GNU AFFERO GENERAL PUBLIC LICENSE, Version 3"); copyleft, clean-room shape only | C# | symbol `InflictVitaePenalty`, `UpdateXpVitae`, `GetMinVitae`

Checked: Read in full: `InflictVitaePenalty` (Player_Death.cs 125-140), `UpdateXpVitae` (Player_Xp.cs 134-181), `VitaeCPPoolThreshold` (Player_Xp.cs 433-435), `UpdateVitae` / `ReduceVitae` / `RemoveVitae` / `GetMinVitae` (EnchantmentManager.cs 383-476), penalty constants (PropertyManager.cs 669-670). Read in part: death path (Player_Death.cs 200-235), vital scaling (CreatureVital.cs 120-170), corpse decay (Corpse.cs 99-112). Callers: `InflictVitaePenalty` has one caller read (Player_Death.cs 209); no repo-wide caller search was run. Not read: `RemoveAllEnchantments` (so I cannot say whether the vitae row survives the death purge), `HandleNoAllegiance` (AllegianceManager.cs 368+), `ContractTracker`, Pet classes, Lifestone code beyond the broadcast check, monster spell lists. Confidence: high on the debt and recovery loop; medium on the death purge interaction (open). camera_scope: n/a.

## 1. Mechanism

- A death adds a debt. `vitae` is a multiplier on max vitals (1.0 = no debt). The first death creates the row at `1 - vitae_penalty` (0.95). Each later death subtracts 0.05 (`vitae_penalty`). Then the value is clamped to a floor from `GetMinVitae(level)` (EnchantmentManager.cs 391-408).
- Floor by level: the allowed debt is `(level - 1) * 3` percent, at least 1 percent (395-397), capped at `100 - round((1 - 0.40) * 100)` = 40 percent (393, 399-401). The floor is `(100 - debt) / 100` and never below 0.60 (403-405). So a level 1-14 character can go down to 1 to 39 percent debt, and from level 15 on the debt stops at 40 percent.
- Order at death (Player_Death.cs 200-231): `hadVitae` is saved (204); a PK-lite death skips the debt step (207-209); the debt is applied (`InflictVitaePenalty`, 125-140: `DeathLevel = Level`, `VitaeCpPool = 0`, then `UpdateVitae`). Then the donor purges enchantments (211-221: `RemoveAllEnchantments` at 214 on a PK or without augmentation, `RemoveAllBadEnchantments` at 220 otherwise), and after the death animation `CreateCorpse(topDamager, hadVitae)` runs (231). Whether `RemoveAllEnchantments` spares the vitae row is open (not read).
- Recovery: earned XP fills a pool. `GrantXP` calls `UpdateXpVitae` for any XP type except Allegiance (Player_Xp.cs 116-117). `UpdateXpVitae` carries the pool: while `pool >= threshold`, subtract the threshold and call `ReduceVitae`, which adds 0.01 (EnchantmentManager.cs 455-460) and returns 1.0 at the top (148-158). The threshold uses the DEATH level, not the current level (Player_Xp.cs 148, 156). At 1.0 the vitae row is removed after a 2 second delay (168-185).
- Threshold formula: `(L^2.5 * 2.5 + 20) * v^5 + 0.5` (Player_Xp.cs 435), where L = death level and v = current vitae. Computed by hand, not run: at L = 50, v = 0.60 it is about 3,440 XP per 1 percent; at L = 50, v = 0.95 about 34,000 XP per 1 percent. The curve makes a 1 percent step cheaper the deeper the debt.
- Effect on play: `GetMaxValue` multiplies each vital's max by vitae after enchantment multipliers and before additives, for players only (CreatureVital.cs 156-159; comment at 162 says additives are not scaled).
- Corpse: an empty player corpse rots in 15 s (Corpse.cs 27, 106-107); with items it rots after `max(3600, level * 300)` s (110). `RecalculateDecayTime` is called from Creature_Death.cs 540 and 551.
- Tick: none. Death and XP grants are events. There is no loop.

## 2. Key functions

- `InflictVitaePenalty`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Death.cs` 125-140.
- Death path with the PK-lite gate: same file, 200-231 (read 200-235).
- `UpdateXpVitae`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Player_Xp.cs` 134-181.
- `VitaeCPPoolThreshold`: same file, 433-435.
- `UpdateVitae`, `ReduceVitae`, `RemoveVitae`, `GetMinVitae`: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Managers/EnchantmentManager.cs` 391-476.
- Vital scaling: `/mnt/frankendom-donors/ACEmulator-ACE/Source/ACE.Server/WorldObjects/Entity/CreatureVital.cs` 127-159 (read 120-170).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Death adds a fixed debt step, read from config | 0.05 per death (theirs, PropertyManager.cs 669) |
| Debt cannot exceed a global maximum | 0.40 (theirs, PropertyManager.cs 670) |
| Debt allowed grows with the level, with a 1 percent minimum | 3 percent per level, minimum 1 (EnchantmentManager.cs 395-397) |
| Recovery moves the multiplier in fixed steps when a pool fills | 0.01 per step (EnchantmentManager.cs 456) |
| Pool cost rises with the level and falls as the debt deepens | `(L^2.5*2.5+20)*v^5+0.5` (Player_Xp.cs 435) |
| Empty corpse rots fast; full corpse rots by level | 15 s (theirs, Corpse.cs 27); `max(3600, level*300)` s (Corpse.cs 110) |
| Multiplier applies to max vitals only, not to additives | multiply then add (CreatureVital.cs 156-162) |

Defects found in the donor (keep the idea, fix each):
1. Float drift: the debt is a 32-bit float that the donor adds and subtracts in steps of 0.01 and 0.05 (EnchantmentManager.cs 436, 456). fix: store the debt as an integer percent in the server ledger.
2. Two levels for one debt: the floor uses the current level (`GetMinVitae((uint)Player.Level)`, EnchantmentManager.cs 440) while the pool uses the death level (Player_Xp.cs 148). fix: use one level and write it into the row.
3. The pool cost curve (v^5) makes deep debt cheapest to lower per 1 percent. The code does not show whether that is intended. fix: make the cost per step an explicit data field and set it on purpose; this is a design question, not a proven bug.

## 4. TypeScript sketch

simplified: the sketch follows the donor order (floor, then the death debt, then the pool loop, then vital scaling). It omits the PK-lite death-purge path, the Allegiance XP exclusion, the 2 second removal of a finished debt, the chat messages, the corpse, the min-5 vital rule, and the augmentation exceptions. It keeps the donor's threshold curve unchanged (defect 3 is left open on purpose). It uses JS numbers, not float32, so the float drift of defect 1 does not occur.

```ts
// Licence: AGPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// Death debt ("vitae"): each death lowers a multiplier on max vitals; earned XP refills it in 1 percent steps.

const PENALTY_PER_DEATH = 0.05;   // data: per-death step
const PENALTY_MAX = 0.40;         // data: deepest penalty allowed (global floor)
const LEVEL_STEP_PCT = 3;         // data: penalty allowed per level, in percent

interface VitaeState {
  vitae: number;     // 1.0 = no penalty, 0.60 = deepest
  poolXp: number;    // XP earned toward the next 1 percent
  deathLevel: number;
}

// Level floor: at most 3 percent per level below 1, capped by the global maximum.
function minVitae(level: number): number {
  const globalFloor = 1 - PENALTY_MAX;
  const globalMaxPct = 100 - Math.round(globalFloor * 100);
  let maxPct = Math.max((level - 1) * LEVEL_STEP_PCT, 1);
  if (maxPct > globalMaxPct) maxPct = globalMaxPct;
  return Math.max((100 - maxPct) / 100, globalFloor);
}

// One death. PK-lite deaths reset the pool but add no penalty.
function onDeath(s: VitaeState, level: number, pkLite: boolean): void {
  s.deathLevel = level;
  s.poolXp = 0;
  if (pkLite) return;
  s.vitae = Math.max(s.vitae - PENALTY_PER_DEATH, minVitae(level));
}

// XP needed to move from vitae to vitae + 0.01 (donor formula, kept as is; see simplified line).
function poolThreshold(vitae: number, deathLevel: number): number {
  return (Math.pow(deathLevel, 2.5) * 2.5 + 20) * Math.pow(vitae, 5) + 0.5;
}

// Earned XP fills the pool; each full pool lifts the penalty by 0.01, capped at 1.0.
function earnXp(s: VitaeState, xp: number): void {
  let pool = s.poolXp + xp;
  let need = poolThreshold(s.vitae, s.deathLevel);
  while (pool >= need && s.vitae < 1) {
    pool -= need;
    s.vitae = Math.min(1, s.vitae + 0.01);
    need = poolThreshold(s.vitae, s.deathLevel);
  }
  s.poolXp = pool;
}

// Max vital after vitae scaling (applied after enchantment multipliers, before additives).
function scaledMaxVital(base: number, vitae: number): number {
  return Math.max(5, Math.round(base * vitae));
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (typescript 7.0.2), exit 0, no output.

Best transferable idea: a death adds a level-gated debt to max vitals that only earned XP can pay down in fixed steps, so the penalty is felt in play and can always be recovered.
Decision (proposed): adapt — keep the debt multiplier and XP-paid recovery, but store the debt as an integer percent on the one character ledger, use one level for both floor and pool, and make the cost curve an explicit data field. Reject the donor's Allegiance-XP exclusion, which has no Frankendom use.
Acceptance: server test: two deaths at level 20 leave vitae at 0.90 (floor is 0.60); a PK-lite death adds no debt; about 2,650 XP at vitae 0.90 and level 20 (computed, not run) moves the debt by exactly one 1 percent step.

## 5. Lands in

- TARGET `src/fight/death.ts` (new, engine death step, server side). Parity-checklist row 17 (death/respawn). Debt is a server ledger row, not a client value.
- today: none (Frankendom has no death debt yet).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room only)
- Brief rule served: 1 (one engine, one ledger: the debt is written server-side), GL focus items 1 (favour resource with gain and loss events) and 10 (underworld and death rules).

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is written from the described mechanism.
- The death purge is not read. If the donor's purge removes the vitae row, the debt can vanish on death; whether it does is an open question.
- Frankendom kills are server-verified. The donor's PK-lite rule (no debt when a player kills you) needs a Frankendom equivalent (duel deaths versus zone deaths); not decided.
- A 40 percent cap on all vitals is a large nerf. It should be a data field with a default that the Strategy lane sets, not a constant.
- Level 1-14 floors are tiny (1 to 39 percent). That is the donor's design, not a proven error.

## 7. GL focus table (gods-legends-favour, items 1-14)

| # | Item | Name | Effect | Formula | Number ranges | Gain / loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|---|
| 1 | Favour / piety | Vitae recovery pool | Earned XP refills the death debt | pool += XP; step when pool >= `(L^2.5*2.5+20)*v^5+0.5` | v 0.60-1.00, step 0.01 | gain: non-Allegiance XP; loss: death -0.05 | none; pool resets at death | Player_Xp.cs 116-117, 148-158, 435; EnchantmentManager.cs 436, 456 |
| 2 | Blessings / curses as timed rows | Enchantment rows | Timed rows; recast extends only if longer | new duration applies only if > remaining (`duration > timeRemaining`) | not read beyond this | cast / recast | timed (expiry code not read) | EnchantmentManager.cs 184-193 |
| 3 | Patron choice and switching | Allegiance swear and break | Patron/vassal tree; patron gets a share of vassal XP | generated = 50 + 22.5 * (loyalty/291) * (1 + RT/730 * IG/720) %; received uses leadership and vassal factor; passup = generated * received | direct 50/22.5, indirect 16/8; caps 291, 730, 720 | conversion cost: none found; apostasy penalty: none found in break path; god anger: none | none | AllegianceManager.cs 180-190, 195-283, 324, 348-366; Player_Allegiance.cs 487-499 |
| 4 | Divine domains / aspects | none | no domain tags found | - | - | - | - | none (grep "domain" found no game use) |
| 5 | Boons at favour thresholds | none | "Boon" spells are fixed buffs; no rank gate found | - | - | - | - | SpellId.cs (names only, not read) |
| 6 | Legend signature powers | not read | monster spell lists not opened | - | - | - | - | (not read) |
| 7 | Shapeshifting | none | grep for shapeshift / polymorph in ACE.Server: no hits | - | - | - | - | none |
| 8 | Avatars / summons | pets exist | Pet.cs, Pet_Monster.cs, CombatPet.cs (names only); no summon limit found | - | - | - | - | (not read) |
| 9 | Fate, luck, oaths | luck and contracts | luck appears only in rabbit's-foot crafting (RecipeManager.cs 603); ContractTracker exists, abandon action exists, no forfeit found | - | - | - | - | RecipeManager.cs 603 |
| 10 | Underworld / death | Vitae debt and corpse | debt (row 1); corpse rot 15 s empty, else max(3600, L*300) s | see row 1 | 15 s; 3600 s min | death | corpse rots | Corpse.cs 27, 106-110; Player_Death.cs 200-231 |
| 11 | Mounts | none found | word-level grep not run; earlier hits were "amount" | - | - | - | - | none (not established) |
| 12 | Relics | none | no relic hits | - | - | - | - | none |
| 13 | Temples / shrines | Lifestone | death broadcast to the lifestone landblock if enabled; service and offering not read | - | - | - | - | Player_Death.cs 76-77 |
| 14 | Pantheon factions, realm pride | Allegiance trees; titles | allegiance hierarchy (AllegianceManager.cs 129-171, not read); titles are an enum (CharacterTitle.cs names only); no realm pride found | - | - | - | - | AllegianceManager.cs 324, 348; CharacterTitle.cs 208 |

Best transferable idea (table): the debt-and-pool loop (row 1 and 10) is the one mechanism worth keeping; the patron tithe (row 3) is a second candidate for Core Items career rows and is not written as a note here.
Brief rule served: 1, GL focus 1 and 10.
