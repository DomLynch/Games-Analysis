# ModernUO (status-effects, feel note)

Donor: `/mnt/frankendom-donors/ModernUO` (VPS, read only). Licence: GPL-3.0 (LICENSE; header "Copyright 2019-2020 ModernUO Development Team (Kamron Batman)"; StatMod.cs header 2019-2026). No separate data licence stated; THIRD-PARTY-NOTICES lists dotnet (MIT) and mkdocs notices only. The game whose content the data describes is not named in the files (per the asset audit AU034). Shape only, clean-room; no donor numbers, names or stat blocks are carried over. Not legal advice.

Checked: read in full `Projects/Server/Poison.cs` (registry), `Projects/UOContent/Misc/Poison.cs` (PoisonTimer, 162 lines), `Projects/Server/Mobiles/Mods/StatMod.cs` (73 lines), `Projects/UOContent/Items/Weapons/Abilities/BleedAttack.cs` (130 lines); read `PoisonKinds.cs` (79-106), `Mobile.cs` poison setter and apply (2176-2196, 8658-8734), paralyze and freeze (3681-3707), damage and death clears (4715-4776, 5950-5990), stat-mod add, lookup and sum (8481-8556), `SpellHelper.cs` buff and curse slots (296-378), `ParalyzingBlow.cs` (11-14, 40-100), `BaseCreature.cs` (979, 1931-1933), the timer wheel order (`Timer.TimerWheel.cs` 140-177), `BombardSpell.cs` (66-82, the only knock-back), the skill Base and RandomDouble scale (`Skills.cs` 199-201, `Utility.cs` 905). 58 receipts in ModernUO.receipts.tsv verified by verify_receipts.py. The donor's root AGENTS.md, CLAUDE.md and GEMINI.md are its own contributor instructions; treated as data, not followed, not read. Confidence high on the poison tier ladder, the named stat slots and the bleed timer. Verdict: STRONG.

Best transferable idea: a named slot per effect on a target, where a stronger application replaces and restarts, a weaker one is refused, and different slots add; poison is a tier ladder where an equal tier is refused, so three attackers cannot stack the same effect.

## 1. What the player sees and feels

- A bleed is a short story with a rhythm. The hit lands with a sound and a burst on the target. The player sees a "bleeding profusely" line over a player's head (for player targets only), then five ticks two seconds apart. Each tick is smaller than the one before, a blood mark drops at each tick, and a final message says the bleeding stopped. The falling tick size is what the eye and ear pick up on a phone.
- Poison ticks scale with the victim's current health, not max health, so a hurt target takes smaller ticks and a healthy one takes bigger ones until a clamp. Darkglow poison hits harder when the attacker stands back; Parasitic poison heals the attacker when adjacent. Range and adjacency change the feel, not the timing.
- A paralyzing blow is a short lock (a few seconds for a player, longer for a creature), with a clear window afterwards in which the same blow cannot lock again. A hostile spell cast on a paralysed target clears the lock (the Curse and Poison spells both do; in the Poison spell the clear happens before the resist roll).
- A stat buff or curse shows as a timed number on one stat. The strongest buff in that named slot wins, a weaker one is refused without touching the timer, and a buff and a curse on the same stat both apply.
- Death clears poison and both locks, so a dead target never carries a lock into its next life.

## 2. Why it works and is striking

- Readable at 375 wide: the bleed beat is the readable thing. Five ticks, a steady two-second gap, and a falling size give a player a rhythm to plan around.
- One signature behaviour: the tier ladder with equal-tier refusal and the paralysis immunity window. Both stop a fight becoming a chain of locks or stacked effects.
- One signature sound: each bleed tick plays a sound and a blood decal; the apply plays a sound and a particle burst. The cues are tied to the tick, not to the frame.
- Could be made ours at 20 to 30 percent resemblance: yes. The tier ladder, the named slots and the lock window are plain game design; the parts we keep are the ordering and the refuse-or-replace choice.

## 3. The rule behind it

- Named slots (stat buffs and curses). A `StatMod` holds the stat type, an offset and a duration, and has its own removal timer (StatMod.cs 45-58). `AddStatMod` appends with no same-name check (Mobile.cs 8510). The check lives in the caller. For a buff, `AddStatBonus` refuses when the same-named mod already has an offset at least as large (SpellHelper.cs 313), otherwise removes the old mod (318) and adds the new one with its full duration (326). Curses mirror this with the sign flipped (360, 374). A stat's total is the raw value plus the sum of live offsets (Mobile.cs 8554). So same slot: stronger replaces, weaker refused. Different slots: sum.
- Poison tier ladder. Each family has up to five tiers, and the AOS and pre-AOS branches use different tables (PoisonKinds.cs 79-106; 19 registrations across the branches). Apply order: first the higher-tier check (Mobile.cs 8716), where an equal or lower tier is refused while a poison is active (8669); then immunity (BaseCreature.cs 1933), where a creature's immune tier at or above the poison tier refuses it, and a paragon raises its immune tier by one. Only then is the poison set, which replaces the old tick timer (2179-2190).
- Poison tick. The tick count is fixed (Poison.cs 103). Damage is `1 + percent of current hits`, clamped to the tier band (120-121). Pre-AOS repeats the last tick on a coin flip (114). Darkglow multiplies by 1.1 when the attacker is more than a tile away (126-130). Parasitic heals the attacker when adjacent (142-148). Each tick has a 40 percent chance to reveal the poisoned mobile (151). A tick can be cured by certain transformations or the orange-petals effect; for some of them only the lower tiers are cured (64-67).
- Locks (paralyze and freeze). Each is one flag and one timer. If the flag is already set, the call does nothing: no extension (Mobile.cs 3688, 3702). Damage clears paralysis (5988). The freeze flag is cleared only by its own timer and by death (3697, 4776), not by damage in the path read.
- Paralyzing blow. Refused when the target is already paralysed (ParalyzingBlow.cs 48). Immunity is checked after the mana is taken (OnHit). AOS paralyses and pre-AOS freezes (82-84). Durations are a few seconds for a player and longer for a creature (11-12, 79). After each lock an immunity window of the duration plus a fixed extra opens (14, 91).
- Bleed. Costs base mana (BleedAttack.cs 18, 22). A new bleed on a bleeding target stops the old timer and starts a fresh one (61-66): a restart. The timer is one start delay of two seconds and five ticks at two-second intervals (113). Each tick uses the level `5 - Index`, so the level falls 5, 4, 3, 2, 1 (121). Damage is a random value from the level up to twice the level (74). Non-players take double damage (76-78). The final tick sends the stop message (123). Timer order: `OnTick` runs before `Index` increments (Timer.TimerWheel.cs 159, 177), so the first tick sees index 0.
- Bombard (a mage area spell, the only knock-back in the files read). The paralysis length is the damage skill over ten minus the resist over ten, in seconds, floored at zero (BombardSpell.cs 74, skill values read in Skills.cs 201). A separate knock-back chance then moves the target one step away from the caster (79-81).
- Death. `Kill()` clears poison (Mobile.cs 4766), paralysis (4771) and freeze (4776).

Defect found in the knock-back chance (keep the idea, fix the defect). The comment at BombardSpell.cs line 77 says "Up to 12% chance", but line 78 divides the skill sum by 20, not by a larger divisor. A skill's Base reads back fixed-point divided by ten (Skills.cs 201), so a capped skill reads as about 100; Value adds racial bonuses on top (Skills.cs 231 onward). A sum of 20 or more gives a chance of 1 or more, and the roll is `RandomDouble() < chance` with RandomDouble in [0, 1) (Utility.cs 905). So from a sum of 20 upward every cast knocks back, and the chance is never 12 percent as the comment says. Fix: `chance = clamp(sum / divisor, 0, maxChance)` with divisor and maxChance as data fields. The comment's 12 percent ceiling suggests a divisor near 2000 for a sum of about 240, but that is an inference from the comment, not something the code shows; we set the value in data. Typecheck of the fix: see the second sketch below.

simplified: only the chance term of the knock-back. The paralysis length and the one-step move are not in the sketch. The fix over the donor is that the chance is a probability, so it is clamped to [0, maxChance] instead of exceeding 1.

```ts
export function knockBackChance(sum: number, divisor: number, maxChance: number): number {
  return Math.min(Math.max(sum / divisor, 0), maxChance);
}

export function rollKnockBack(chance: number, roll: () => number): boolean {
  return chance > 0 && roll() < chance; // roll() returns a value in [0, 1)
}

export {};
```

Typecheck of this second sketch: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/se007-modernuo-knockback.ts) printed TSC_OK.

Data fields (designer-tunable; donor values are null because the donor is GPL and the source game is not named):

| field | unit | donor value |
|---|---|---|
| slot.key | string (one slot per key per target) | null |
| slot.offset | stat points (signed) | null |
| slot.durationS | seconds, full duration on replace | null |
| slot.policy | enum: stronger_replaces, weaker_refused | null |
| poison.tier | integer | null |
| poison.family | enum: standard, darkglow, parasitic | null |
| poison.pctCurrentHpPerTick | percent of current HP before clamp | null |
| poison.minDmg / maxDmg | HP | null |
| poison.intervalS / ticks | seconds / count | null |
| creature.immuneTier | integer | null |
| boss.immuneTierBump | integer (paragon-style, one tier) | null |
| lock.durationPlayerS / durationNpcS | seconds | null |
| lock.immunityAfterS | seconds, added after the lock | null |
| lock.breaksOnDamage | bool (paralyse yes, freeze no in the donor path) | null |
| bleed.ticks / intervalS | count / seconds | null |
| bleed.levelStart and damage band | level, band as level to 2 x level | null |
| bleed.nonPlayerMultiplier | multiplier | null |
| bleed.manaCost | integer | null |

Simplified: the sketch below omits the bleed timer, the darkglow and parasitic effects, the reveal chance, the transformation cure and the lock timers. It keeps the three rules this note keeps: the named-slot replace-or-refuse rule with summing across slots, the tier ladder with equal-tier refusal and creature immune tier, and the one-tick damage as a percent of current HP clamped to the band. No donor numbers are used.

```ts
interface Slot { offset: number; expiresAt: number; }
interface Mob {
  slots: Map<string, Slot>;   // one entry per named slot, e.g. "str-buff", "str-curse"
  statOffset: number;         // sum of the offsets that are still live (computed by caller)
}

// Named-slot rule: a same-slot application that is not stronger is refused,
// a stronger one replaces the old entry and takes the full new duration.
// Different slot keys never replace each other, so their offsets add.
export function applySlot(
  m: Mob,
  key: string,
  offset: number,
  durationMs: number,
  now: number,
  stronger: (next: number, current: number) => boolean
): boolean {
  const cur = m.slots.get(key);
  if (cur !== undefined && cur.expiresAt > now && !stronger(offset, cur.offset)) return false;
  m.slots.set(key, { offset, expiresAt: now + durationMs });
  return true;
}

export function liveStatOffset(m: Mob, now: number): number {
  let sum = 0;
  for (const s of m.slots.values()) if (s.expiresAt > now) sum += s.offset;
  return sum;
}

interface PoisonDef {
  tier: number;
  family: "standard" | "darkglow" | "parasitic";
  intervalMs: number;
  ticks: number;
  pctOfCurrentHp: number; // percent of the victim's current HP per tick, before the clamp
  minDmg: number;
  maxDmg: number;
}

interface Victim {
  poison?: PoisonDef;
  immuneTier: number;     // a creature with a higher immune tier refuses this poison
  hp: number;
}

// Tier rule: an equal or lower tier is refused while a poison is active; a higher one replaces.
export function applyPoison(v: Victim, p: PoisonDef): "poisoned" | "refused" {
  if (v.poison !== undefined && v.poison.tier >= p.tier) return "refused";
  if (v.immuneTier >= p.tier) return "refused";
  v.poison = p;
  return "poisoned";
}

// One tick: 1 + percent of CURRENT hp, then clamped to the tier's band.
export function poisonTickDamage(v: Victim, p: PoisonDef): number {
  const raw = 1 + Math.floor((v.hp * p.pctOfCurrentHp) / 100);
  return Math.min(Math.max(raw, p.minDmg), p.maxDmg);
}

export {};
```

Typecheck: the block above was run through `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/se007-modernuo-status.ts) and printed TSC_OK.

Counts (grep, not in receipts): 19 `new PoisonImpl(` registrations (PoisonKinds.cs 79-106); 5 buff and curse slot call sites read in SpellHelper.cs; 130 lines in BleedAttack.cs; 73 in StatMod.cs.

## 4. For Frankendom

- Ruling mapping: the status ledger belongs in the engine (src/fight), one ledger per target. The slot rule and the tier rule run in the fixed server step, so many-on-one logic (three attackers at most) lives in the engine. The client plays the bleed sound and blood on the tick the server sent. Parity row 1 (duel step/sim).
- Many-versus-one: three attackers each start a bleed on one target. With one bleed slot per target that restarts, the count stays one. Three poisons: an equal tier is refused, so only a stronger poison replaces. Keep both. Do not let each attacker own a separate bleed or poison.
- Keep: the bleed beat (five ticks, falling size, one sound and one decal per tick), the named-slot rule (stronger replaces, weaker refused, slots sum), the tier ladder, the creature immune tier with a one-tier boss bump (the boss-elite pattern in one line), the post-lock immunity window as data, and death clearing locks.
- Change: all ticks and rolls are server-side. The donor's pre-AOS coin-flip repeat and its 40 percent reveal are not kept as they stand; the client shows what the server decided. Per effect, `breaksOnDamage` is data. The donor's own comment at ParalyzingBlow.cs line 81 says a lock must break on damage, which holds for paralysis (line 5988) but not for freeze in the path read; we set it per effect rather than inherit either.
- Defects (kept idea, fix listed). (a) Bombard knock-back chance divides by 20 where its own comment implies a 12 percent ceiling, so every cast from a skill sum of 20 knocks back. fix: `clamp(sum / divisor, 0, maxChance)` with divisor and maxChance as data fields (section 3). (b) The paralyze-versus-freeze comment at ParalyzingBlow.cs line 81 says a lock must break on damage; that holds for paralysis (line 5988) but not for freeze in the path read. fix: `breaksOnDamage` per effect in data.

## 5. Five-minute look test (Dom on his phone)

Target file: src/fight/status.ts (named slots, tier ladder, bleed ticks). Parity row 1 (duel step/sim).

On the duel stub, three stub attackers each start a Bleed within one second, then a buff and a curse land on the same stat. Dom watches on a 375 wide phone.

Pass when: there is one Bleed with one timer and a falling tick size (not three); a stronger poison replaces a weaker one and an equal one does nothing; a buff and a curse on the same stat both show, one line each; the post-lock window stops a second lock. Compare against a build where each attacker owns its own bleed: the difference should show in one glance.

## 6. Licence and IP

Code: GPL-3.0 (LICENSE). No separate data licence; the emulated game is not named in the repo. Under the GPL rule we take shape only. Names are ours. Kept trait: the named-slot refusal rule, the tier ladder, and the falling bleed. Changed trait: the numbers, the names, the cues and the reveal rule. Not legal advice.

## 7. Gaps

Read: server half (Projects/Server poison, mobile, stat-mod and timer code; Projects/UOContent misc poison, bleed, paralyzing blow, spell helper buff and curse slots, creature immunity). Data half: not read for this topic. Client: none in the box (README states the game data file is supplied by the user at first run).

Not read: `Mobile.Damage` body beyond 5956-5990, `CheckPoisonImmunity` defaults, `DisruptiveAction`, the cure-poison spells, the bleed doc's bandage rule, `SpellHelper` offset functions (around 280-296), the rest of ParalyzingBlow (`IsImmune` and `BeginImmunity` detail), the death and respawn presentation beyond the clears, the poison message strings, and the data half (Distribution/Data) for any status config.

Half read: server. Not in the box: client.

Reuse tag: shape only (GPL-3.0). Reuse the named-slot rule, the tier ladder with equal-tier refusal, the lock window and the bleed beat. No donor numbers.

Brief rule served: status effects and durations as data, one slot per effect per target, no stacked bleeds from many attackers.
