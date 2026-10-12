# Doddler-RagnarokRebuildTcp (magic-spells-powers, cell 2)

Donor: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/` (C#; server code in `RoRebuildServer/RoRebuildServer/`; skill data in `RoRebuildServer/GameConfig/ServerData/Skills/` (Skills.toml, SkillTree.toml, StatusEffects.toml); shared types in `RoRebuildServer/RebuildSharedData/ClientTypes/SkillData.cs`) | Licence: custom grant, not an OSI licence. license.txt line 1: "as long as anything based on this code is not used for commercial purposes" (also says third-party assets have their own licences; none used here) | C# | symbols `CombatEntity.TryStunTarget`, `CombatEntity.FinishCasting`, `CombatEntity.AttemptStartGroundTargetedSkill`, `MathHelper.PowScaleDown`, `SkillHandler.GetSkillCastTime`

Checked: Opened in full: CombatEntity.StatusEffects.cs `TryStunTarget` (267-300); CombatEntity.cs `FinishCasting` (826-863), `ResumeQueuedSkillAction` and `QueueCast` (869-898), `AttemptStartGroundTargetedSkill` (929-1040), `CheckLuckModifiedRandomChanceVsTarget` (1388-1412, first half and the self-target line only); CombatEntity.DamageHandling.cs interrupt block (776-795); SkillHandler.cs `GetSkillCastTime` and `GetSkillRange` (116-156); Player.cs SP helpers (1204-1246) and `ApplyAfterCastDelay` (2148-2153); MathHelper.cs resist table (18-26, 126-131); SkillHandlerAttribute.cs base class (19-50); BashHandler.cs (whole file, 25 lines); DataManager.cs `GetSpForSkill` (line 106, receipted). Read partly: the single-target and self-target cast starts (1042-1140, grep hits only, not read in full), status container (not read), SkillTree.toml (not read), luck function tail after line 1412 (not read), monster AI skill scripts (not read). Confidence: high on the stun roll and length, the interrupt table and the SP order; medium on the cast start (one of three paths read in full). camera_scope: not a camera cell. Depth thin: skill and status pipelines not read end to end.

Best transferable idea: One resist curve for stats (every stat point multiplies by 0.99), applied to both the chance and the length of a stun, with per-type stat multipliers (player x1.5, boss x2.5), and a small table of four effective cast-interrupt modes (the enum has five names: Default, InterruptOnDamage, InterruptOnSkill, InterruptOnKnockback with the alias NoInterrupt, NeverInterrupt; Default resolves to the server default) that each skill can pick.
Decision (proposed): adapt. Take the curve and the interrupt-mode table; add our one CC ladder (cell 1) because this stun has no diminishing step; do not copy the pattern where a skill's numbers are hard-coded in its handler and the data row is only documentation.
Acceptance: Server test: a player with Vit 50 hit by a 30% stun (chanceIn1000 = 300, no ResistStun, luck 0) is stunned about 14% of the time before the luck modifier (141 out of 1000) and, when stunned, for about 2.35 s (5 s x 0.99^75). The test asserts both numbers and that a fourth stun in 15 s from any source is immune.

## 1. Mechanism

Data rows (Skills.toml, 220 skill tables): keys that occur are Target (208 rows), Name (184), MaxLevel (148), Icon (148), SpCost (110), AdjustableLevel (24), InterruptMode (14), Params (7), DescEn (7). No cast-time, range, cooldown or damage key exists in the file. Status rows (StatusEffects.toml, 78 tables): Type "Buff" or "Debuff" (73), Icon (57), CanDispel (57), CanDisable (57), Name (51), ImportantJobs (14). The server reads SpCost (DataManager.cs 106) and InterruptMode (CombatEntity.cs 1025). The server does not read Params: a grep for `.Params` in RoRebuildServer returns nothing; Params is for client text or the tool that builds client data (DataToClientUtility, not read).

Cast start (ground-target path, AttemptStartGroundTargetedSkill 929-1040). Order of checks:
- (a) Dead or sitting: refused (935-945 region). Already casting: the request is queued (QueueCast, 894-898; one queue slot, a new request replaces the old one) and returns true (same function, before the range check).
- (a2) If the entity is Moving (before the range check): a player clears its attack target and the entity stops moving immediately (the queue lines are commented out), then the checks continue.
- (b) Out of range for a player: move closer, then queue (same function, range check).
- (c) Attack cooldown (`Character.AttackCooldown`): queue (line 989).
- (d) Player only: SP check. If too little SP, `InsufficientSp` is sent and the start fails. Then the player's global skill lockout `SkillCooldownTime`: if still running, queue (lockout check at line 1005).
- (e) Cast time: `GetSkillCastTime` (SkillHandler 116-137): the handler's base time x `PowScaleDown(Dex)` for players, where Dex above 100 counts double (126). Side effect inside this getter: for players, an active Suffragium status multiplies the time by (1 - 0.15 x Value1) and is removed (lines 129-133), so calling it twice loses the buff. If the result is zero or less, the skill executes at once (1016-1019).
- (f) For players: time x (100 + AddCastTime stat) / 100 (1027). The interrupt mode is taken from the skill row, or from the server default if the row says Default (1025). Cast end time = now + time (1031). The attack cooldown starts (`ApplyCooldownForAttackAction`, not read).

Finish (FinishCasting 826-863), when the timer ends:
- (g) IsCasting cleared. For players: SP check again (`HasSpForSkill`), failing with `InsufficientSp` (830-835).
- (h) Target validation by the handler (`ValidateTarget`), with a `SkillFailed` message for players (839-845).
- (i) Item-source casts remove one item here (848-857).
- (j) `SkillHandler.ExecuteSkill`. Only on success: `TakeSpValue(spCost)` (858-861). A failed execute stops the cast animation (863).
- SP cost: `SpCost[level - 1] x (100 + SpConsumption) / 100` (Player 1222; DataManager 106). TakeSpValue clamps to the SP that remains (Player.cs 1225-1236, read).

Interrupts (CombatEntity.DamageHandling.cs 781-795). While casting, any incoming hit is checked against the cast's mode:
- (k) `InterruptOnDamage`: any damage above 0 interrupts (781).
- (l) Any non-never mode: any knockback above 0 interrupts (782).
- (m) `InterruptOnSkill`: a hit from a skill (AttackSkill not None) interrupts (783). Plain auto-attacks with no knockback do not. The default for players is InterruptOnSkill (ServerOperationConfig.cs 19; the enum comment at SkillData.cs 11 says the same).
- (n) Player protections: `UninterruptibleCast` stat above 0 blocks the interrupt (788). A cast with less than 0.2 s left is not interrupted (790).
- Monsters set their mode per AI state (MonsterSkillAiState.cs 498-506, read in grep only).
- Other skills read the mode: HammerFall skips targets with NeverInterrupt (HammerFallHandler 42); Provoke only hits targets whose mode is at most InterruptOnSkill (ProvokeHandler 58).

Range. `GetSkillRange`: a skill whose class is Magic gets 9 tiles (`DefaultMagicCastRange`, SkillHandlerAttribute 19, 50). Other classes return -1 and use the Range stat (SkillHandler 143-156). Blindness caps the range at `MaxAttackRangeWhileBlind` (SkillHandler 152-153).

Cooldowns. There is no per-skill cooldown field in the skill row. For players there is one global lockout, `SkillCooldownTime`, which `ApplyAfterCastDelay(time)` can only extend (Player 2148-2153). Handlers call it: the Detect handler uses 0.7 s (DetectHandler 29); a grep (re-verified 2026-10-12) shows many more handlers: BlitzBeat 1 s, Suffragium 2 s, Kyrie Eleison 2 s, Magnus Exorcismus 3 s, Gloria 2 s, Aspersio 2 s, Lex Divina 3 s, Lex Aeterna 2 s, Magnificat 2 s, Impositio Manus 3 s, Meteor Storm 2 s, Storm Gust 4 s, Lord of Vermilion 3 s (each `source.ApplyAfterCastDelay(n)` in its handler file under SkillHandlers/). The delay is hard-coded per handler, not in the data row. Monsters set a cooldown per skill with `SetSkillCooldown(skill, cooldown / 1000f)` (MonsterSkillAiState 332); the cooldown values come from the AI scripts (not read).

Stun. `TryStunTarget(target, chanceIn1000, delayApply = 0.3)` (CombatEntity.StatusEffects.cs 267-300), in order:
- (o) Skip if the target has the DisablingState body state (269-270).
- (p) Vit is the target's effective Vit. Players: vit x 3 / 2 (276, integer). Bosses: vit x 5 / 2 (278).
- (q) Resist = `PowScaleDown(vit)` = `0.99^vit` (MathHelper 24, 126-130). If the target has a ResistStunStatus stat, the resist is scaled by `(100 - ResistStunStatus) / 100` (281-283).
- (r) Chance roll: `CheckLuckModifiedRandomChanceVsTarget(target, (int)(chanceIn1000 x resist), 1000)` (285). The luck function starts its modifier at 150 (CombatEntity 1396) and sets target luck to 0 for a self-target (1411). Read later (1388-1412): luckMod starts at 150 and, above a 10% success rate, adds (rate x 1000 - 100) / 4; monster-vs-player luck is capped at +100 over the player (and the mirror for player vs monster); self-target uses luck 0. Note the stun length uses `CharacterStat.Luk` while the chance roll uses `CharacterStat.Luck` (two different stats).
- (s) Length: `timeResist = PowScaleDown(vit + GameRandom.Next(0, luk))` (288); `len = 5 s x timeResist` (289); if DecreaseStunDuration is set, `len x (100 - DecreaseStunDuration) / 100` (291-294). If len is 0 or less, no stun.
- (t) `AddStatusEffect(status, replaceExisting: false, delay: 0.3 s)` (299). The effect of `replaceExisting: false` in the status container was not read.
- There is no diminishing step anywhere in this path. A grep for "diminish" in the server finds only two comments (Player.cs 819, MathHelper.cs 31).
- Poison (TryPoisonOnTarget, line 314) uses the same vit x 3 / 2 for players.

Bash, the data-versus-code case. BashHandler.cs 21-22 computes damage as `1f + lvl * 0.3f` and accuracy as `100 + lvl * 5`. Those values match the Bash Params row (Skills.toml 30: 130, 160, ... and 5, 10, ...) at each level, but the server never reads that row. A change to the row would not change Bash. The handler also clamps the level with a literal `lvl.Clamp(1, 10)` (16) instead of MaxLevel (Skills.toml 26).

## 2. Key functions

- `TryStunTarget`: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/CombatEntity.StatusEffects.cs` 267-300.
- `FinishCasting`: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/CombatEntity.cs` 826-863.
- `AttemptStartGroundTargetedSkill`: same file 929-1040. `QueueCast`: same file 894-898.
- Interrupt block: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/CombatEntity.DamageHandling.cs` 776-795.
- `GetSkillCastTime`, `GetSkillRange`: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/Simulation/Skills/SkillHandler.cs` 116-156.
- `PowScaleDown` and the resist table: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/Simulation/Util/MathHelper.cs` 18-26, 126-131.
- SP helpers: `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp/RoRebuildServer/RoRebuildServer/EntityComponents/Player.cs` 1204-1246; `ApplyAfterCastDelay` 2148-2153.

## 3. Numbers vs mechanism

Table rows (name | effect | formula | number ranges | cost, cast time, cooldown | caps | file:line):

| name | effect | formula | number ranges | cost / cast / cooldown | caps | file:line |
|---|---|---|---|---|---|---|
| SP cost | pay on success | `SpCost[level-1] x (100 + SpConsumption) / 100` | row ints per level; Bash 8 x5 then 15 x5 | SP | pool clamp at TakeSp | Player.cs 1222; DataManager.cs 106; CombatEntity.cs 858-861 |
| Cast time | delay before effect | handler time x `0.99^Dex` (Dex above 100 counts double); players x (100 + AddCastTime)/100 | handler constants, not read | cast | zero or less = instant | SkillHandler.cs 116-137; CombatEntity.cs 1017-1031 |
| Interrupt modes | cancel the cast | enum of five names, four effective modes (Default resolves to InterruptOnSkill; SkillData.cs 7-15) | modes: never, knockback, damage, skill (default) | n/a | 0.2 s lock-in; UninterruptibleCast | DamageHandling.cs 781-790; ServerOperationConfig.cs 19 |
| Magic range | cast distance | 9 tiles for Magic class; -1 = Range stat | 9 | n/a | blind caps range | SkillHandlerAttribute.cs 19, 50; SkillHandler.cs 143-156 |
| Global skill lockout | player queue | `SkillCooldownTime = max(old, now + delay)` | 0.7 s (Detect); 1 to 4 s in about 14 other handlers (grep only, see Cooldowns) | n/a | only extends | Player.cs 2148-2153; DetectHandler.cs 29 |
| Monster skill cooldown | reuse gap | `SetSkillCooldown(skill, cd / 1000)` | from AI scripts, not read | n/a | n/a | MonsterSkillAiState.cs 332 |
| Stun chance | roll | `(int)(chance1000 x 0.99^vit_eff x (100 - ResistStun)/100)` out of 1000 | vit x1.5 player, x2.5 boss | n/a | luck function (tail not read) | StatusEffects.cs 267-285; MathHelper.cs 24, 126-130 |
| Stun length | duration | `5 s x 0.99^(vit + rand(0, luk)) x (100 - DecreaseStun)/100` | max 5 s before stat cuts | n/a | none | StatusEffects.cs 288-294 |
| Luck gate | chance modifier | luckMod starts at 150 | self-target luck 0; monster-vs-player luck cap +-100 | n/a | final: realChance = chance x 10 x (atkLuck + mod) / (tgtLuck + mod), roll NextInclusive(0, outOf x 10) < realChance (1412-1416) | CombatEntity.cs 1396, 1411 |

Which numbers suit a fast mobile fight: 5 s base stun with a resist that falls by 1% per stat point is readable. The 0.2 s "no interrupt at the end" rule is a good phone-scale protection. The 9-tile magic range suits a phone screen. A 0.99^Dex cast-time curve has no floor: at Dex 200 (effective 300) the multiplier is 0.99^300, about 0.05, so a cast can become almost instant. Set a floor as data.

## 4. TypeScript sketch

simplified: keeps the stun order (vit multiplier by type, resist from the 0.99 curve, chance roll out of 1000, then length from vit plus a luck random, then the duration resist), and the interrupt table with the 0.2 s protection. Omitted: the rest of the luck function (monster luck cap, luck modifier table), the status container and the replaceExisting behaviour, the ResistStun branch details beyond one multiplier, the poison and other status variants, the Suffragium cast buff and the Dex cast-time scale, and the SkillCooldownTime lockout. Reordered: nothing; the luck roll is a parameter so the sketch does not claim the donor's luck formula.

```ts
// Licence: custom non-commercial grant (donor license.txt). Clean-room sketch written from the described mechanism, not a translation of the donor lines.

// --- 1. Resist curve: each stat point multiplies by 0.99 (donor: 1000-entry table, beyond it Math.pow) ---
const RESIST_TABLE: number[] = Array.from({ length: 1000 }, (_, i) => Math.pow(0.99, i));
export function resistMul(stat: number): number {
  return stat >= 0 && stat < RESIST_TABLE.length ? RESIST_TABLE[stat] : Math.pow(0.99, stat);
}

// --- 2. Stun roll and length. Chance and length both scale with the same curve. ---
export interface StunTarget {
  kind: "player" | "mob" | "boss";
  vit: number;
  luk: number;
  resistStunPct: number;      // stat: percent of chance resisted
  decreaseStunDurPct: number; // stat: percent of length removed
}

// luckRoll(chanceOutOf1000) stands in for the donor's CheckLuckModifiedRandomChanceVsTarget (rest not read).
// Returns the stun length in seconds, or 0 when the stun does not land.
export function stunLengthS(
  t: StunTarget,
  chanceIn1000: number,
  rnd01: () => number,
  luckRoll: (chanceOutOf1000: number) => boolean,
): number {
  let vit = t.vit;
  if (t.kind === "player") vit = Math.floor((vit * 3) / 2); // donor: x1.5 for players (integer math)
  if (t.kind === "boss") vit = Math.floor((vit * 5) / 2);   // donor: x2.5 for bosses

  let resist = resistMul(vit);
  const resistChance = 100 - t.resistStunPct;
  if (resistChance !== 100) resist = (resist * resistChance) / 100;

  if (!luckRoll(Math.trunc(chanceIn1000 * resist))) return 0;

  const luckBonus = t.luk > 0 ? Math.floor(rnd01() * t.luk) : 0; // donor: GameRandom.Next(0, luk)
  const timeResist = resistMul(vit + luckBonus);
  let len = 5 * timeResist;                                         // donor: base 5 s
  const durationResist = 100 - t.decreaseStunDurPct;
  if (durationResist !== 100) len = (len * durationResist) / 100;
  return len > 0 ? len : 0;
}

// --- 3. Cast interruption. Mode table as read in CombatEntity.DamageHandling.cs 781-790. ---
export type InterruptMode = "never" | "onKnockback" | "onDamage" | "onSkill";
// Default for players is onSkill (ServerOperationConfig.cs 19).

export interface HitEvent { damage: number; knockback: number; fromSkill: boolean; }
export interface CastState { isPlayer: boolean; uninterruptible: boolean; remainingS: number; }

export function castInterrupted(mode: InterruptMode, hit: HitEvent, cast: CastState): boolean {
  if (mode === "never") return false;
  const hits =
    (mode === "onDamage" && hit.damage > 0) ||
    hit.knockback > 0 ||
    (mode === "onSkill" && hit.fromSkill);
  if (!hits) return false;
  if (cast.isPlayer && (cast.uninterruptible || cast.remainingS < 0.2)) return false; // donor: player casts close to firing
  return true;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/cc-ladder.ts` (the same module as cell 1: one CC ladder, one resist curve, the interrupt-mode table). Parity-checklist row 13 (specials). Its interrupt rule also touches row 3 (guard, parry, stamina), see section 6.
- today: no CC or interrupt code in `src/fight/` was checked here.
- Reuse tag: rewrite-from-idea (custom non-commercial licence; shape only, clean-room)
- Brief rule served: 1 (one engine, two clients: the resist and interrupt rules are engine rules); server authority (the donor checks the stun and the cast on the server).

## 6. Gaps and risks

- Licence: custom grant, "as long as anything based on this code is not used for commercial purposes". It is not an OSI licence and the terms are unclear for a commercial game. Shape only, clean-room. Do not copy the table or the code.
- Data is not the source of truth for skill numbers. Only 7 rows carry Params, the server never reads them, and Bash hard-codes its numbers. Adopt the rule that the server reads only fields the row defines; reject the hard-coded pattern.
- No diminishing returns on stun (confirmed: no diminish step in TryStunTarget). Adopt the one CC ladder from cell 1 so a third stun in 15 s is a quarter-length stun. This is the main change.
- `replaceExisting: false` on the stun (CombatEntity.StatusEffects.cs 299): the container behaviour (refresh, extend or ignore) was not read. Check it before adopting.
- Default interrupt on skill hits only: a plain auto-attack without knockback does not cancel a cast (DamageHandling 781-783). A knockback always cancels (782). For Frankendom, decide whether a guard-blocked hit counts as landed (row 3).
- Dex cast-time curve has no floor (see section 3). Set a floor as data (ruling 3).
- Single queue slot: QueueCast replaces the one queued skill (CombatEntity 894-898). A second press during a cast drops the first. Check this against the fast-duel input rule (row 5).
- MAX_ATTACKERS = 3: three stuns landing in one tick walk the ladder at once if each landing counts. Same ruling as cell 1 (ruling 2).
- Monster per-skill cooldowns come from AI scripts that were not read.
- Depth thin: the status container, the luck function tail, the SkillTree, the other 219 skill handlers, and the monster AI scripts were not read.

Rulings for Dom (the questions Dom must decide, each with a recommendation):
1. Should Frankendom's stun use the one CC ladder from cell 1 (a third stun in 15 s is quarter length)? Recommendation: yes, so stun cannot be stacked by simple repetition.
2. Should a guard-blocked hit interrupt a player's cast? Recommendation: no. Only landed damage and knockback cancel a cast.
3. Should cast time from Dex have a floor, and at what value? Recommendation: yes, a 50% floor as a data field, so no build can cast instantly by stat alone.

## 7. Pass-2 additions

As-data shape:
- Skill rows: `RoRebuildServer/GameConfig/ServerData/Skills/Skills.toml` (220 tables; one table per skill, key = skill id). Row fields (name: type): Name: string; Icon: string; Target: enum string (Passive, Self, Enemy, ...); MaxLevel: int; SpCost: int[] per level (Skills.toml 27 for Bash: [8,8,8,8,8,15,15,15,15,15]); AdjustableLevel: bool; InterruptMode: enum string (NoInterrupt, NeverInterrupt, InterruptOnDamage, InterruptOnSkill, Default); Params: string[][] per level (Skills.toml 30, 7 rows only); DescEn: string template with <n> placeholders (7 rows only).
- Matching C# type: `SkillData` (SkillData.cs, whole file): SkillId (CharacterSkill), Icon, Name, Target (SkillTarget), Type (SkillClass, default None), MaxLevel, SpCost (int[]), AdjustableLevel, DescEn, Params (string[][]), InterruptMode (CastInterruptionMode, enum at SkillData.cs 5-13).
- Status rows: `StatusEffects.toml` (78 tables). Fields: Type ("Buff" or "Debuff"), Icon, CanDispel (bool, header comment line 5), CanDisable (bool), Name, ImportantJobs (14 rows).
- Skill behaviour is code: each skill is a class with `[SkillHandler(CharacterSkill.X, SkillClass.Y)]` (BashHandler.cs class header) that overrides Process, GetCastTime, GetSkillRange and ShouldSkillCostSp. The CharacterSkill enum is in code (not read).
- A new skill is one row: no. The row gives name, cost, levels and interrupt mode, but the effect is a handler class, so a new skill needs code. A new level-scaled cost or interrupt mode on an existing skill is one row, yes (the row is read by the server for SpCost and InterruptMode).
- Resource pools: SP is the one pool in the server path read here (GetStat(CharacterStat.Sp) and MaxSp, Player.cs 1204-1236). HP and other pools were not read. Frankendom should keep health, stamina, mana and focus as character data row fields, not as skill fields.

Provenance per claim: repo `/mnt/frankendom-donors/Doddler-RagnarokRebuildTcp`. Licence: custom grant in `license.txt` line 1 (quoted in section 1 and receipts). Every number and claim above has a receipt in `receipts.tsv` (184 rows across both cells, verifier passed). Custom licence: shape only, no translation.

What they patched later (no git history in the box; `.git` absent). Patch notes file `RoRebuildServer/GameConfig/ServerData/Config/PatchNotes.txt` (122 lines):
- Stunned or frozen targets cannot dodge (line 48): the stun is a real state the hit roll checks.
- Attack delay after casting magic reworked (line 68): a cast-to-attack delay rule; the code for it was not read.
- Holy Light, Pneuma and Blessing have no cast delay (line 57): cast time is per skill and can be zero.
- SP gain on attack effects fixed (line 45).
- Monsters switch targets only when hit by auto-attacks, not skills (line 5): the retarget rule is interrupt-like and was patched once.
- Defect found in this read, not in the patch notes: the Bash handler duplicates its row's numbers in code (BashHandler.cs 21-22), so the row no longer drives Bash. Recorded in section 6.

Rulings for Dom: three, in section 6 above.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Cooldown list incomplete: ApplyAfterCastDelay is used by about 15 handlers (Magnus Exorcismus 3 s, Kyrie 2 s, Storm Gust 4 s and more), not only Detect/Blitz/Suffragium.
- Interrupt table called 'four modes' and 'five-way' in different places; enum has five names, four effective modes.
- Cast-start order omitted the Moving branch (stop moving, clear target) before the range check.
- GetSkillCastTime consumes the Suffragium status (side effect in a getter); not mentioned.
- Missed: luck function body (luckMod, monster/player caps), Luk vs Luck stat split.

Fixed 2026-10-12: cooldown list, interrupt wording, Moving branch line, Suffragium side effect, luck function lines.
