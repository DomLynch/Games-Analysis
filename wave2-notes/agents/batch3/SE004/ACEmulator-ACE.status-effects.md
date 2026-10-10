# ACEmulator-ACE (status-effects, cell SE004)

Donor: /mnt/frankendom-donors/ACEmulator-ACE (VPS, read-only). Licence: code is GNU AGPL v3 (LICENSE; Source/lib/README.md line 1 per AU002). Clean-room, shape only; no donor numbers carried as donor values. Assets for this topic: none.
Checked: server and entity halves read: Source/ACE.Server/WorldObjects/Managers/EnchantmentManager.cs, Source/ACE.Server/Entity/AddEnchantmentResult.cs, Source/ACE.Entity/Models/PropertiesEnchantmentRegistryExtensions.cs, Source/ACE.Server/WorldObjects/Player_Xp.cs, Source/ACE.Server/Managers/PropertyManager.cs, Source/ACE.Common/ThreadSafeRandom.cs, Source/ACE.Entity/Enum/MotionCommand.cs and Sound.cs, plus a repo-wide grep for stun, fear, mez, root, knockdown and stagger. Confidence high on stacking, layers, DoT ticks, dispel selection and vitae; high on "no stun, fear, mez or root server state" (grep scope: ACE.Server, ACE.Entity). Receipts: receipts.tsv (verified).
Half read: server and entity (code plus enums and property defaults). Data half: the spell table and the source of Spell.Power and Spell.Duration are NOT in the box (Database/Base holds CREATE TABLE statements only, per DC003). Not traced: where Spell.Power is loaded from (not read).
Verdict: STRONG (layered stack, top-layer rule, expiry clock, DoT tick, vitae floor and recovery pool; all read in code).
Best transferable idea: one layered stat stack per category, where the strongest power shows and weaker copies wait in lower layers and surface when the top one expires; the death debt eases back through a level-scaled XP pool.
Decision: adapt (idea). Defects are fixed in the sketch; the dispel-count mismatch is a question for Lead, not a clear bug.

## 1. What the player sees and feels (375 wide)
A buff or debuff sits in the enchantment list; a stronger one pushes the weaker one out of view until it ends, then the weaker one comes back. A damage-over-time applies on each heartbeat (default five seconds). A death leaves a visible debt (the donor calls it vitae): a penalty value that starts 5 percent down per death and is floored at 40 percent. Which stats it scales is set by the vitae spell row, which is not in the box (not traced). It eases back as the player earns XP: each recovery point costs more XP the closer the player gets to full. A dispel removes a random mix of enchantments, filtered by power, school and beneficial or harmful.
On a phone: one live stack per category, a shrinking timer, a death debt bar that eases, and dispel as a short burst that clears some icons, not all.

## 2. Why it works, or is striking
- Readable at 375 wide: one icon per category, the strongest one shown; the rest hidden behind it. The player sees one number, not a pile.
- One signature behaviour: a weaker copy waits and returns when the top one expires. That is the "resurfacing" beat, and it needs no extra UI.
- One signature sound or effect: not read (client half absent; no sound code in the server half). Our candidate is a soft click when a buff resurfaces.
- Could be made ours at 20-30 percent resemblance: yes. Keep the layers and the death debt floor; change the names, the categories, and the dispel mix.

## 3. The rule behind it
Adding (AddEnchantmentResult.BuildStack, lines 70-139): entries in the same category are walked strongest first. Higher power surpasses. Equal power with the same spell refreshes. Equal power with a different spell: the longer duration surpasses (permanent counts as infinite); equal duration falls back to the spell id. Any weaker or shorter entry marks the result "surpassed" (line 139). A new layer is written above the highest existing layer unless it refreshes (EnchantmentManager.Add, lines 142-200). A refresh replaces the duration only when the new cast lasts longer than what remains (line 188: duration plus start time).
Top layer (PropertiesEnchantmentRegistryExtensions.cs, lines 150-155): per category, the highest power wins; then a level-8 self-aura precedence; then, for non-set spells, the newest start time (the start time counts down from zero, so the largest value is the most recent). Effects use the top layer; lower layers stay in the registry and surface when the top one is removed (inferred from the registry design; expiry path not read).
Clock: each heartbeat subtracts the interval from start time (line 251). An entry expires when start time reaches minus duration (line 254). Permanent entries (duration -1) never expire by this check.
DoT: HeartBeat_DamageOverTime (EnchantmentManager.cs lines 1220-1260) ticks the top-layer entries with the damage-over-time, nether and aetheria keys and applies heal-over-time ticks. Total damage is the per-tick value times the tick count, the duration over the heartbeat rounded up (line 1465).
Dispel (SelectDispel, lines 526-606): candidates are in the power range, excluding permanent entries (items and vitae). Filter by school and by beneficial or harmful. The count is random between a minimum and the set number, then shuffled and taken. The minimum formula is in question (defect 1).
Vitae (EnchantmentManager.cs lines 383-480; Player_Xp.cs lines 140-160, 433-435): death adds the per-death penalty (rule default 0.05) and the total is clamped to a floor. The floor is one minus a level-based percent: (level - 1) times 3, minimum 1, capped at the maximum penalty (default 0.40). Recovery: XP goes into a pool; a point of recovery costs (level^2.5 times 2.5 plus 20) times vitae^5 plus 0.5 XP, using the level at death. Worked from the formula at level 50: the first point near 60 percent vitae costs about 3,400 XP; the last point near 99 percent costs about 42,000 XP (computed here, not measured).

Data fields (designer-tunable, units; donor values null because AGPL):
| name | unit | donor_value_or_null |
|---|---|---|
| death.penalty_per_death | fraction of 1 | null (donor 0.05) |
| death.penalty_max | fraction of 1 | null (donor 0.40) |
| death.floor_per_level | percent per level | null (donor 3) |
| death.recover_step | fraction of 1 | null (donor 0.01) |
| death.pool_power | exponent | null (donor 5) |
| dot.tick_s | seconds | null (donor 5, heartbeat default) |
| dispel.variance_formula | which formula (see defect 1) | null |

## 4. For Frankendom
- Our shape: 700 zones as data, 100 Pit characters reused across zones, many-vs-one with max three attackers, server-verified events driving client presentation.
- Keep: the layered category stack with a top-layer rule (strongest power, then newest); the refresh rule (only a longer cast extends); the clock that counts down to minus duration; the death-debt floor that is a function of level; the XP-pool recovery that costs more near full.
- Change: no separate heal-over-time key set unless needed; the dispel mix becomes one filter per status kind; the nether and aetheria DoT keys become one damage-type field; no XP-pool recovery unless the death design asks for it.
- Parity row: row 1 (duel step/sim) for the layered stack. The death debt is a separate idea for row 17 (death/respawn), not part of this cell's row.
- Target file: src/fight/status.ts (proposed; shared with the ACE-side layering idea and the EQEmu note).
- Server tick sub-line: "server tick: DoT and HoT ticks on the heartbeat, one tick per category, per-tick NPC budget not in this donor's status code".

simplified: the layered stack (add rule, top-layer pick, and the dispel count with the comment's formula, not the code's). Numbers are our starting values. The start-time clock is kept in the same counting-down form. The death-debt floor is not in this sketch (row 17). Not a copy of the donor's code.
```ts
export type Ench = {
  spellId: number;
  category: number;
  power: number;
  duration: number; // seconds; -1 means permanent
  startTime: number; // counts from 0 down to -duration, as in the donor
  casterId: number;
};

export type AddOutcome = "initial" | "surpass" | "refresh" | "surpassed";

export function addOutcome(
  incoming: { spellId: number; power: number; duration: number },
  existing: Ench
): AddOutcome {
  if (incoming.power > existing.power) return "surpass";
  if (incoming.power < existing.power) return "surpassed";
  if (incoming.spellId === existing.spellId) return "refresh";
  const existingDur = existing.duration === -1 ? Infinity : existing.duration;
  const incomingDur = incoming.duration === -1 ? Infinity : incoming.duration;
  if (incomingDur > existingDur) return "surpass";
  if (incomingDur < existingDur) return "surpassed";
  return incoming.spellId > existing.spellId ? "surpass" : "surpassed";
}

export function topLayer(entries: Ench[]): Map<number, Ench> {
  const top = new Map<number, Ench>();
  for (const e of entries) {
    const cur = top.get(e.category);
    if (!cur || e.power > cur.power || (e.power === cur.power && e.startTime > cur.startTime)) {
      top.set(e.category, e);
    }
  }
  return top;
}

export function dispelCount(number: number, variance: number, roll01: () => number): number {
  const min = Math.round(number * variance);
  return min + Math.floor(roll01() * (number - min + 1));
}
```
Typecheck: scp to the VPS /tmp and `npx -p typescript tsc --noEmit --strict --target es2020` returned exit 0.

## 5. A five-minute look test for Dom
Make a debug stack of three buffs in one category: a weak long one, a strong short one, and a medium one. On a 375-wide phone, watch: (a) only the strongest shows; (b) when it expires, the next strongest surfaces with a click; (c) a same-power recast of a different spell with a longer timer replaces the shown one. Then a death-debt bar that eases on XP gain: check that the first points feel quick and the last points feel slow.

## 6. Licence and IP
Code licence: GNU AGPL v3 (LICENSE). Assets for this topic: none in the repo. The donor's mechanics are described here in our own words; numbers are data fields with donor value null. Clean-room, shape only; no code is adapted. The README's non-commercial and trademark statements are recorded as the file says (see AU002); no legal conclusion is drawn.

## 7. Gaps
- Not read: where Spell.Power and Spell.Duration are loaded from; the expiry and removal path (Remove, lines 315-357) and its messages; EnchantmentManagerWithCaching.cs; the stat-modifier arithmetic beyond the lines listed; the rest of Player_Xp.cs around the pool reset.
- Not in the box: the spell table and the client DAT files; the client half.
- Half read: server and entity only.
- No stun, fear, mez, root or knockback state found on the server. A case-insensitive grep for stun, mezz, fear and knockdown across ACE.Server/WorldObjects, ACE.Entity/Enum and ACE.Server/Entity returned only spell-name enums (for example ParalyzingFear in SpellId.cs), category names and unrelated words. The enum entries StaggerBackward (MotionCommand.cs line 92) and Knockdown1 (Sound.cs line 32) have no call sites in ACE.Server (grep for Stagger and Knockdown returned nothing there).

## Defects (keep the idea, fix the defect)
1. Dispel count mismatch: the comment at EnchantmentManager.cs line 539 says the minimum is number times variance; the code at line 590 uses number times (1 minus variance). The random-branch guard (line 587, "!= 1.0f") fits the comment's reading, since variance 1.0 then means a fixed count. Fix: use the comment's formula (our choice) or fix the comment; add a test. Which one matches retail cannot be checked here, because the spell rows are not in the box. Question for Lead.
2. DoT "combine" comment: line 1245 says DoTs from multiple sources are combined, but HeartBeat takes the top layer per spell category (lines 1222 and 150), so two casters of the same DoT share one category and only one ticks. Fix: decide the rule. To combine, group by (category, caster) in HeartBeat_DamageOverTime; otherwise fix the comment. Retail behaviour not checked.
3. Hard-coded recovery step: ReduceVitae adds 0.01 directly (EnchantmentManager.cs line 456). Not a bug; move it to a property so tuning does not need a code change.
Checked, not a defect: at full recovery the loop breaks and the surplus XP stays in the pool (Player_Xp.cs lines 148-160); the pool is reset to zero on death (Player_Death.cs line 128), so surplus does not carry into the next death.
Checked, not a defect: the refresh test uses "duration plus start time" (line 188). This is correct because start time counts down to minus duration, so the sum is time left.

## Also seen (this topic)
- Death and respawn: the death debt is the presentation of a loss. It is a visible, slowly easing penalty, not a screen state.
- Idle and ambient, loot ceremony, walk density: not read here.
- Readability at 375 wide: one category shows the strongest entry; the rest wait in layers. No UI code in the box.

## Brief rule served
Status stacking in a server-verified engine: one layered category stack decides which buff shows; timers count down to minus duration; a death debt is a level-scaled penalty that eases on XP.
