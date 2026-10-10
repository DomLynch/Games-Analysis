# OpenDAoC-OpenDAoC-Core (status-effects, SE008)

Donor/Licence: OpenDAoC-OpenDAoC-Core, C# server emulator (DAoC). Code GNU GPL v3 per LICENSE line 2 and README.md line 41. The existing asset audit notes that the root gpl.txt is GPL v2 text, so the version is not settled by the files. No sprites, sound, fonts or icons are in the box. Decision: adapt the idea (shape only, clean-room re-expression with our own numbers).

Checked: ECS-Effects (48 files, 2,998 lines: ECSGameEffect, ECSGameSpellEffect, ECSImmunityEffect, CrowdControlECSEffect, StagECSEffect, BleedECSEffect, StatBuffECSEffect, StatDebuffECSEffect, ECSGameEffectFactory); ECS-Components/EffectListComponent.cs (1,051 lines: add, refresh, stack, remove, tick); spells/CCSpellHandler.cs, SpeedDecreaseSpellHandler.cs, StyleStun.cs, StyleBleeding.cs, negative/FearSpellHandler.cs, negative/FearBrain.cs; propertycalc/StatCalculator.cs and PropertyIndexer.cs; gameobjects/GameLiving.cs indexers; GameNPC.cs brain stack (AddBrain, RemoveBrain). Confidence: high on the stacking, stun-ladder formula, and stat order (read in full). Medium on the NPC ladder's first-stun count (derived from the start order, not run). Not read: spell rows (not in the box), the legacy GameSpellEffect refresh path, charm, disease, realm-ability effects.

Best transferable idea: one active effect per type, chosen by value times effectiveness, with a per-target NPC stun window in which each further stun is shorter until one is refused.

## 1. What the player sees and feels (375 wide)
Status starts and ends send up to three messages, depending on flags: first person to the target, third person to the caster, third person to the nearby area. A stun or mez stops the target mid-cast, freezes its turning, and leaves an NPC standing still. A snare slows walk speed by a percentage; a root is the same effect at 99 or more. A fear makes a mob turn and walk straight away from the nearest player at run speed, then re-plan every three seconds, so the visible beat is the backing-off shape. A bleed is a damage tick at the spell's pulse rate that shrinks by one each time. The Stag self-buff swaps the model (a different body for one race) and plays an emote, and its extra max HP drains back on expiry. Icons, HUD, screen effect and sound are client-side and not in this box (not read), so the on-screen look is not verified.

## 2. Why it works, or is striking
- Readable at 375 wide: a feared mob walking 300 units straight away from the nearest player (FearBrain.cs:56) is one clear shape. A stunned mob is one still shape.
- One signature behaviour: the NPC stun ladder. Each stun on the same mob is shorter, then refused. The rhythm reads as "it is getting used to this".
- One signature effect: the flee brain re-plans on a 3,000 ms think (FearBrain.cs:32), so the walk-away happens in steps.
- 20-30 percent resemblance: a boss that shrugs off the fourth stun with a visible ring, and a fear that is a short walk-away every few seconds.
- Sound: none in the box, so the sound axis is not verifiable here.

## 3. The rule behind it
(a) Same-type stacking. One active effect per effect type. The newcomer is compared with the current best by spell value times effectiveness; a tie goes to the newcomer (ECSGameEffect.cs:211; EffectListComponent.cs:790). If the newcomer wins: a buff from a different caster coexists and the old one is disabled (EffectListComponent.cs:839); a debuff ends the old one (:845). If the newcomer loses: a buff from another caster is added parked; a debuff is refused. When the active effect ends, the best parked one wakes (EffectListComponent.cs:937). Only one movement-speed buff is allowed at a time (EffectListComponent.cs:866 comment).
(b) Hard CC on players: no ladder. A player already stunned is immune to a second stun (CCSpellHandler.cs:281). When the effect ends, a player immunity effect is created (ECSGameSpellEffect.cs:66-80, the create call at :79). While it runs, the same spell cannot refresh the player (EffectListComponent.cs:688).
(c) Hard CC on NPCs: diminishing ladder. The window opens when the first stun starts (CrowdControlECSEffect.cs:79-80). The first stun gets the full duration. Each later stun gets base divided by (2 times count) (ECSImmunityEffect.cs:49). Count goes up after each applied stun (ECSImmunityEffect.cs:55; CCSpellHandler.cs:316). A stun is refused when the result is under 1,000 ms (ECSImmunityEffect.cs:43). Window length: flat seconds, or an adaptive cap (CrowdControlECSEffect.cs:16, :20). Derived ladder for a 6 s base: 6 s, 3 s, 1.5 s, 1.0 s, then refused. This is derived from the formulas and was not run.
(d) Hit chance scales CC length: below 55 the duration falls toward zero, above 100 it grows, capped at 200 (CCSpellHandler.cs:76, :84). Style stuns are exempt (CCSpellHandler.cs:73).
(e) Stat modifiers. Each effect writes its value into a category per property: base buff, spec buff, debuff, spec debuff, ability, item (ECSGameSpellEffect.cs:116; GameLiving.cs:2203; StatBuffECSEffect.cs:24). Totals are computed in a fixed order: a spec debuff eats buffs first, then a base debuff eats buffs, then what remains eats base and item stat at a lower rate (StatCalculator.cs:67, :198, :204). The donor comment states the rates: a debuff is full strength against buffs and half strength against base and item stat (StatCalculator.cs:33). Player buff totals are capped by level (StatCalculator.cs:98). Speed debuffs go into a separate multiplicative slot (StatDebuffECSEffect.cs:32).
(f) Bleed: a DoT whose per-tick damage starts at the spell damage and falls by one each tick, not below one (BleedECSEffect.cs:12, :42-43). Resist is applied per tick (BleedECSEffect.cs:32). A newer bleed only replaces a weaker one (BleedECSEffect.cs:17). Bleed is never resisted (StyleBleeding.cs:42-44). Its tick hits are flagged as not starting combat (StyleBleeding.cs:30), but each pulse keeps the victim in combat (DamageOverTimeECSEffect.cs:42-58).
(g) Snare and root share one class. Slow is a percentage of walk speed; a value of 99 or more is a root (SpeedDecreaseSpellHandler.cs:12, :66). Roots never crit; a snare crit doubles effectiveness, with the chance capped at 50 (SpeedDecreaseSpellHandler.cs:63-66, :74). A snare always conflicts with another snare or root (:45). Snare duration is clamped between 1 and 4 times base (:55-58).
(h) Fear: NPCs only, and only when the NPC level is not above the spell value (FearSpellHandler.cs:46). The fear brain is pushed onto the NPC brain stack (FearSpellHandler.cs:66; GameNPC.cs:2138). The top brain runs (GameNPC.cs:2101-2110). Think every 3,000 ms (FearBrain.cs:32). The flee target is the first player in range max(aggro, 750) (FearBrain.cs:41). The flee point is 300 units on the far side of the player's heading (FearBrain.cs:54-59). On expiry the brain is removed (FearSpellHandler.cs:82).
(i) The stun flag is derived, not toggled: on stop, IsStunned is recomputed from whether another stun is still active (CrowdControlECSEffect.cs:89). On stop the brain is told to think now (CrowdControlECSEffect.cs:41), so a freed mob resumes at once.
(j) Stag self-buff: extra max HP is about a tenth of max HP times a random factor near one (StagECSEffect.cs:41). It is applied as a base buff and the same fraction is healed; expiry removes it and clamps HP (StagECSEffect.cs:46-48, :62-64). Race selects the model (StagECSEffect.cs:35-37).
(k) Order of operations. Each change is queued and handled at the start of the tick (EffectListComponent.cs:63-79). Immunity effects start at once, not on the next tick (EffectListComponent.cs:664-667). The factory starts a new effect immediately (ECSGameEffectFactory.cs:21). On removal, the player immunity is created before the queued stop callback runs (EffectListComponent.cs:936-937).
(l) Message audience: target first person, caster third person, area third person, with a caster-excluded area list (ECSGameEffect.cs:299-331).
(m) Defect, keep the idea: StatDebuffECSEffect.OnStopEffect calls base.OnStartEffect() (StatDebuffECSEffect.cs:54). The base hooks are empty today (ECSGameEffect.cs:218-219), so there is no effect now. Fix: call base.OnStopEffect().
(n) Defect, keep the idea: the fear brain map is keyed by NPC (FearSpellHandler.cs:64). A second fear on the same NPC overwrites the entry and pushes another brain (:66). If expiry removes only the entry it finds, an older brain may stay on the stack. Whether a refresh runs expiry on the old effect is in the legacy path, not read. Fix: one fear brain per NPC; a new fear refreshes the timer instead of pushing a brain.
(o) Defect, keep the idea: the style-stun rule "immunity timer exactly five times the length of the stun" lives in a legacy hook (StyleStun.cs:45-47). The ECS stun class does not call that hook, so the ECS window is the flat or adaptive one (CrowdControlECSEffect.cs:16, :20). Fix: pass the x5 into the ECS window for style stuns.
(p) Open check: the NPC immunity sets Duration to 60000 after the base constructor has set ExpireTick from the passed window (ECSImmunityEffect.cs:35; ECSGameEffect.cs:85). If anything reads Duration for expiry, the window would be 60 s whatever the setting. Not verified.

## 4. For Frankendom
- Shape: effects live in the engine (one effect list per living), and the client only shows state. That matches one engine and server-verified changes.
- Target file: src/fight/status-effects.ts (proposed new module). Parity row: 1 (duel step and sim). Fear's flee is a fight-loop concern (row 4), noted but not the target row.
- Many-vs-one (max 3 attackers): the per-target type slot and the caster-coexistence rule matter. Buffs from three casters can coexist; a debuff type keeps only its strongest. The NPC ladder is per target, so three attackers stunning one boss get the ladder, not three full stuns.
- Keep: one active effect per type; value times effectiveness with a tie to the newcomer; parking and waking; the derived stun flag; the brain-stack fear; three-audience messages sent by the server.
- Change: one clock, read on the server tick (fixed step, input intake, per-tick NPC budget), not per-effect timers; fix the stop call (m); one fear brain per NPC (n); carry the style-stun x5 into the ECS window (o); confirm expiry reads the expiry tick (p).

Sketch (typechecked with tsc --strict, es2020):
simplified: the same-type pick and the NPC ladder only. It omits hit-chance scaling, the stun-reduction stat, the tick queue, and the parked-effect wake (the donor's wake is a separate step). The donor checks the un-reduced base and applies the reduced one; the sketch uses one value for both.
```ts
export {};

type Effect = { type: string; caster: string; value: number; eff: number; active: boolean };

// Same-type rule: the stronger value*effectiveness wins; a tie goes to the newcomer.
// Returns the effect to make active and the ones to park, or null when the newcomer is weaker.
export function pickSameType(list: Effect[], incoming: Effect): { activate: Effect; park: Effect[] } | null {
  const score = (e: Effect) => e.value * e.eff;
  const current = list.filter(e => e.active && e.type === incoming.type);
  const best = current.reduce<Effect | null>((b, e) => (b === null || score(e) > score(b) ? e : b), null);
  if (best === null || score(incoming) >= score(best)) {
    return { activate: incoming, park: current };
  }
  return null;
}

type Immunity = { count: number; untilMs: number };

// NPC diminishing returns: the first stun gets the full duration and opens the window.
// Each later stun in the window gets base / (2 * count), and is refused when that is under 1000 ms.
export function applyNpcStun(
  imm: Immunity | null,
  base: number,
  nowMs: number,
  windowMs: number,
): { dur: number; imm: Immunity } | null {
  if (imm === null || nowMs >= imm.untilMs) {
    return { dur: base, imm: { count: 1, untilMs: nowMs + windowMs } };
  }
  const dur = Math.trunc(base / (2 * imm.count));
  if (dur < 1000) return null;
  return { dur, imm: { count: imm.count + 1, untilMs: imm.untilMs } };
}
```

## 5. Five-minute look test (Dom, on a phone)
Build a debug-only stun ladder on the existing fight with no release rows. One target, one 6 s stun applied four times in a row. Show each landing as a bar: 6 s, 3 s, 1.5 s, 1.0 s. The fifth shows a refused flash. Compare with a flat version (6 s every time). Dom judges whether the fourth landing still reads as a stun and whether the refusal reads as a beat. Second part: one mob flees 300 units straight away from the nearest player and re-plans every 3 s. Dom judges whether the walk-away reads at 375 wide.

## 6. Licence and IP
Code: GPL v3 per LICENSE and README.md line 41, with gpl.txt at v2. The shape-only rule applies: no code is copied, and no donor constant is carried into our data. Our values are our own. No content assets exist in the box. No legal conclusion is drawn.

## 7. Gaps
- Half read: server only. Client half (screen, icons, sound): not in the box. Spell rows: not in the box (OpenDAoC-Database is named in the README and is absent).
- Data read: EN/Effects.txt has 33 lines, 24 key lines. Keys are dotted, grouped per effect class, with first-person and third-person message pairs. Nothing quoted.
- Not read: the legacy GameSpellEffect refresh and expiry path (spells/SpellHandler.cs); charm (ECS-Effects/CharmECSEffect.cs); disease; realm-ability effects; EffectService.cs beyond the two lines a grep showed (112, 229).
- Not verified: the NPC ladder count (derived by reading the start order, not run); the fear orphan (needs the legacy path); the Duration field question (p).
- Stagger and knockdown: no mechanic by those names in the server .cs files read or grepped. "Stagger" appears only as emote text (commands/playercommands/emotes.cs) and as a death announcement line in a few scripts. The closest real mechanic is the style stun (StyleStun.cs), which is covered above.
- Idle and ambient behaviour, death and respawn presentation, loot ceremony, walk density: not in these files (not read).
