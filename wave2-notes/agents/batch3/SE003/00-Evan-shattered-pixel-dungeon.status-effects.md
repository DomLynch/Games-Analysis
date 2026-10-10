# 00-Evan-shattered-pixel-dungeon (status-effects, cell SE003)

Donor: `/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/` (`actors/buffs/` 88 files; `actors/Char.java`, `actors/Actor.java`, `actors/mobs/Mob.java`, `items/wands/WandOfBlastWave.java`; strings `core/src/main/assets/messages/actors/actors.properties`) | Licence: GPL v3 (source headers say "either version 3 of the License"; AU001 confirms). Clean-room, shape only. Java.

Checked: `Buff.java` (full), `FlavourBuff.java`, `Actor.java` spend and postpone, `Char.java` resist, immunity, speed, time-scale, hit-damage order and the fear hooks (lines 466-500, 645-670, 770-790, 880-895, 950-955, 1100-1110, 1165-1180, 1355-1420), buff bodies `Bleeding`, `Poison`, `Burning`, `Chill`, `Frost`, `Paralysis`, `Terror`, `Dread`, `Daze`, `Slow`, `Cripple`, `Vertigo`, `Vulnerable`, `Weakness`, `Roots`, `Charm` (short ones in full, long ones by their hooks), `Mob.java` fear hooks (285, 355-385, 540-552), `WandOfBlastWave.throwChar` (120-175). String table counted: 298 `actors.buffs.*` keys in `actors.properties`. Earlier audit read first: AU001 (`/private/tmp/p2/wave2-haiku/batch3/AU001/00-Evan-shattered-pixel-dungeon.assets.md`), DC001 (`.../DC001/00-Evan-shattered-pixel-dungeon.catalogue.md`). Confidence: high on the stacking verbs, resist, bleed, poison, paralysis wake, knockback and fear rules (61 receipts across both notes verified). Medium on the exact effect of `Frost` (only its attach and detach read).

Verdict: STRONG. Best transferable idea: name the two ways to add time (add versus keep-the-larger) and let each caller pick one; the damage-built wake-up roll for a stun is a cheap second chance that rewards the player for hitting.
Decision: adapt (idea), with one defect fixed in the sketch.

## 1. What the player sees and feels

Negative statuses sit as small icons in a row with a number: turns left for most and for poison, and the bleed level for bleeding. Each icon fades as it runs down. A feared monster gets a red-tinted status icon and runs from you at double speed. If it gets out of sight and six cells away, it is removed. Hitting it cuts the fear by five turns. When fear ends while it can still see you, it turns on you with a warning, and hunts.

A paralysed enemy wakes on a hit only sometimes: each hit adds to a build-up, and the chance grows with the damage taken during that stun. A push that runs into a wall or another creature deals damage and stuns the target. Frost leaves the target frozen and then, if the target was standing in water, chilled for five more turns.

At 375 wide: an icon, a number and a tint. The fade and the number carry the time without the tint. The icon art itself was not read.

## 2. Why it works (criteria)

- Readable at 375 wide: yes. The fade and the number give time left; the tint gives the family (red fear, purple poison, cyan frost).
- One signature behaviour: a fear that breaks into rage when it ends with the monster in view (`Mob.remove`, 540-552), plus removal of a far unseen feared monster (`Dread.act`).
- One signature sound or effect: not in the half read. The `CharSprite` state and sound code were not read.
- Could be made ours at 20-30% resemblance: yes. Keep the wake-up roll and the fleeing monster; change the icons, the names and the stun shape.

## 3. The rule behind it

Adding time (`Buff.java`, `Actor.java`):
- `append` makes a new instance and spends the duration on it (Buff.java 170); whether the target can hold two copies was not read. `affect` reuses the existing instance and spends the duration onto it (186). That ADDS to the remaining time, because `spend` does `this.time += time` (Actor.java 62).
- `prolong` reuses the instance and calls `postpone`, which only moves the timer forward if it is behind (Buff.java 193; Actor.java 79-80). That keeps the larger value, not the sum.
- Every add is scaled first by `target.resist(buffClass)` (170, 186, 193).
- The two verbs are picked per caller with no name to show which: the elemental blast's paralysis uses `affect` (ElementalBlast.java 285), the sunray's paralysis uses `prolong` (Sunray.java 116). This is the stacking rule to name and fix.

Resist (`Char.java` 1356-1376):
- The loop halves once per matching class in the resist set (1372). A comment above it says resists "do not stack" (1359). The code does stack across distinct classes. Defect, fix: pick one rule (below).

Levels and counters:
- Poison: damage per turn = `(int)(left / 3) + 1` (Poison.java 112). `set` keeps the larger time (61); `extend` adds (66). Total incoming damage is the sum of the remaining ticks.
- Bleed: level is set to the larger value on `set` (Bleeding.java). Each turn it does round(level) damage, then re-rolls its level between half and full (80, 132), and ends when the rounded level reaches 0. Estimate for the health bar: level x 4 (162).
- Burning: 8 turns (`DURATION = 8f`, Burning.java 54). Reignite only raises the timer (214). Damage per turn is rng(1, 3 + depth/4) (105). Water ends it. Chill and Burning cancel each other on attach (Chill.attachTo and Burning.attachTo both detach the other).
- Chill: speed reduction is 10 percent per turn remaining, capped at 50 percent (Chill.java 47). So it stays at 50 percent for the first five of its ten turns, then fades.
- Frost: freezes (paralysed counter), 10 turns (Frost.java). On detach in water, adds Chill for half its duration (112).

Speed and time scale (`Char.java` 770-790, 1165-1180):
- `speed()` multiplies: Cripple /2 (772), Stamina x1.5, Adrenaline x2, Haste x3, Dread x2 (776).
- Time spent per action: Slow halves it (timeScale 0.5). Chill uses its speed factor only when Slow is not present (`else if`, line 1173). Speed doubles it.
- Vertigo: moving to an adjacent cell may go to a random neighbour cell instead (Char.java 1302-1312).

Hit order (`Char.java` 466-500):
- Outgoing: Weakness x0.67 before armour (480). Then armour reduction. Then Vulnerable x1.33 after armour (495). Then the on-hit proc.
- Daze halves the attacker's accuracy roll (649) and the defender's defence roll (665).

Fear (`Dread`, `Terror`, `Mob.java`, `Char.java`):
- Terror: 20 turns, a flavour buff (`DURATION = 20f`, Terror.java 33). Each hit shortens it by 5 turns unless `ignoreNextHit` is set (Terror.java 69).
- Dread: 20 turns, counted down by one per turn; each hit takes 5 off (Dread.java 128). Dread overrides Terror on attach (Dread.java 44). Dread is immune to Terror (`immunities`). A far unseen feared monster is removed and its experience halved (Dread.java 63, 65). Dread doubles the holder's speed (Char.java 776).
- Mob AI: while either is active, the mob is fleeing (Mob.java 285). Its enemy becomes the caster (`chooseEnemy`, reads `object`).
- If the caster dies, its fear buffs are removed (Char.java 1103-1107).
- Boss immunity: boss and mini-boss properties are immune to Dread (and to ally buffs) (Char.java 1419-1421).

Stun from a hit (paralysis wake, `Paralysis.java`):
- Each hit while paralysed adds to `ParalysisResist.damage` (Paralysis.java 58 is the roll). Wake if rng(0, build) >= rng(0, current HP).
- Build-up shrinks by ceil(build / 10) on each turn with no paralysis (100). Stops at zero.

Knockback (`WandOfBlastWave.throwChar`, 120-175):
- Distance = min(travel, power). A boss gets power (power + 1) / 2 (123).
- Collision happens when the power reaches the end of the line (the wall or obstacle at the end), or when a creature is in the next cell (`collided` is set when `dist == trajectory.dist`, and when a creature blocks the cell). A collision deals rng(d, 2d) damage (170) and paralyses for 1 + d/2 turns (172). A push with less power than the line length just moves the target, with no damage and no stun.

Data fields for our side (donor value null: GPL v3 code, clean-room):

| name | unit | donor_value_or_null |
|---|---|---|
| addPolicy | enum: additive, refresh | null |
| resistPerSource | ratio per distinct resisting source | null |
| resistFloor | ratio, lowest multiplier | null |
| wakeBuildDecay | percent of build-up removed per free turn | null |
| knockbackBossPowerDivisor | integer divisor for boss power | null |
| knockbackStunBase | turns | null |
| knockbackStunPerDistance | turns per cell (added to base) | null |
| poisonTickDivisor | turns per extra damage point | null |
| chillSlowPerTurn | percent per turn left | null |
| chillSlowCap | percent | null |
| burnDurationTurns | turns | null |
| burnTickMin / burnTickDepthDivisor | damage / depth divisor | null |

## 4. For Frankendom

- 700 zones as data: depth-scaled burn damage (rng(1, 3 + depth/4), Burning.java 105) becomes a zone data field (`zone_tick_scale`), not an engine constant.
- 100 Pit characters reuse the same status rows. A creature differs by its resists and its levels (`resist` list), not its code.
- Many-vs-one: fear is one shared buff per target. A second caster does not add a second fear; `affect` returns the existing buff and the new caster overwrites its `object` (for example the Terror casts in ElementalStrike.java 465 and DeathMark.java 116 set `.object = hero.id()` on the returned buff). So the donor keeps one fear and one enemy per target. Our cap of three attackers needs the same single-owner rule for fear.
- Server-verified: add, resist, the wake roll and the knockback all run in the engine on the server. The client shows the icon and the number from the event.
- Keep: the two named add verbs; the wake-up build-up roll; knockback distance before damage and stun; fear breaking into rage when it ends with a visible enemy; the caster-death removal.
- Change, defect: the resist comment and the code disagree (Char.java 1359 and 1372). Fix: one rule written in the data (resistPerSource, resistFloor), tested. The sketch uses one multiplier per distinct source with a floor at a quarter.
- Change: the far-unseen removal (Dread.java 63) is a despawn. It belongs under zone population (row 23), not in the status step. Keep the status rule; move the despawn.
- Not to port: Frost destroys potions and Burning destroys scrolls (inventory loss). One-ledger rule forbids status-driven item loss.
- Not to port: the halved experience on removal (Dread.java 65) is a reward rule. Keep only if the zone-population row sets the reward.

## 5. Lands in

- TARGET `src/fight/status-effects.ts` (new module, engine status step). Parity-checklist row 1 (duel step/sim). Add, resist, the per-turn tick, the wake roll and the knockback all run in the duel step on the server.
- Reuse tag: rewrite-from-idea (GPL v3; clean-room only)
- Brief rule served: 1 (one engine; status step on the server, presentation on the client)

Typechecked sketch (strict tsc, run on the VPS):

simplified: omits the Weakness and Vulnerable multipliers in the attack chain, the ring and item hooks, the Frost-to-Chill crossover, and the on-screen text. It keeps the donor order for the status layer: resist then add time; a hit wakes or keeps a stun via the build-up roll; a push resolves distance first, then damage and stun.

```ts
// clean-room sketch, written from the described mechanism (donor is GPL v3; no donor values kept)
export {};

// Two ways to add time to one status. The donor has both (affect adds, prolong keeps the larger).
type Policy = "additive" | "refresh";

// Resist: each distinct resisting source halves the time. The donor comment says resists "do not stack"
// while its code multiplies once per matching class. This sketch picks one rule and floors it at a quarter.
function resistFactor(sources: number): number {
  return Math.max(0.25, Math.pow(0.5, sources));
}

// current is null when the status is not active yet.
function addTimed(current: number | null, dur: number, sources: number, policy: Policy): number {
  const add = dur * resistFactor(sources);
  if (current === null) return add;
  return policy === "additive" ? current + add : Math.max(current, add);
}

// Damage-based wake-up. rand(lo, hi) returns an integer in [lo, hi] inclusive; the caller supplies it.
type RandInt = (lo: number, hi: number) => number;

interface Stun {
  turns: number;
  damageSinceStun: number;
}

// Each hit adds to the build-up, then a roll of build-up against current HP decides if the target wakes.
function hitWakes(s: Stun, hitDamage: number, hp: number, rand: RandInt): boolean {
  s.damageSinceStun += hitDamage;
  return rand(0, s.damageSinceStun) >= rand(0, hp);
}

// Called only on turns with no stun active: build-up shrinks by a tenth, rounded up, to zero.
function quietTurn(s: Stun): void {
  s.damageSinceStun = Math.max(0, s.damageSinceStun - Math.ceil(s.damageSinceStun / 10));
}

// Knockback along a line: distance = min(travel, power). A boss takes half power, rounded up.
// A blocker stops the push: it deals rand(d, 2d) and stuns for 1 + d/2 turns (the donor applies the stun as a prolong).
function knockback(travel: number, power: number, boss: boolean, rand: RandInt): { moved: number; damage: number; stunTurns: number } {
  const p = boss ? Math.floor((power + 1) / 2) : power;
  const d = Math.min(travel, p);
  if (d <= 0) return { moved: 0, damage: 0, stunTurns: 0 };
  const blocked = d === travel;
  if (!blocked) return { moved: d, damage: 0, stunTurns: 0 };
  return { moved: d, damage: rand(d, 2 * d), stunTurns: 1 + d / 2 };
}

// simplified: omits the Weakness and Vulnerable multipliers in the attack chain, the ring and item hooks, the
// Frost-to-Chill crossover, and the on-screen text. It keeps the donor order for the status layer: resist then
// add time; a hit wakes or keeps a stun via the build-up roll; a push resolves distance first, then damage and stun.
const slowA = addTimed(null, 10, 1, "additive");
const slowB = addTimed(slowA, 10, 0, "refresh");
const wakeRng: RandInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const stun: Stun = { turns: 3, damageSinceStun: 0 };
hitWakes(stun, 4, 20, wakeRng);
quietTurn(stun);
const push = knockback(3, 5, false, wakeRng);
void slowB;
void push;
```

Look test (Dom, phone, 375 wide, about 5 minutes): one duel against a single heavy enemy. Style flag on the existing scene: `?addPolicy=additive|refresh`. Hit the enemy with a fear spell, then take a second cast before the first ends. `additive` shows the counter climbing past its normal length; `refresh` holds it at the cap. Compare the two 20-second clips for whether the status reads as "piling on" or "topped up". Then one wall push on a paralysed enemy: does the stun number and the wake chance read clearly? Publish the flag to the preview folder with no release rows and no lock (look-test skill).

## 6. Licence, IP and gaps

- Licence: GPL v3 (source headers, AU001). Clean-room, shape only. No donor values in our data (all `donor_value_or_null` are null). No legal conclusions.
- Names: the donor's buff names are not copied; the string table is counted (298 `actors.buffs.*` keys), not quoted.
- Not read: `Random` helper (not in the donor tree: `com/watabou/utils/Random.java` is absent, so the NormalFloat and NormalIntRange semantics are assumed from the call shape only); `Charm`, `Amok`, `Blindness`, `Drowsy`, `Sleep`, `Corrosion`, `Degrade`, `Doom`, `Combo`, `Momentum` bodies (beyond the hook lines); `Frost` item-freeze body (read for attach and detach); sprite, `CharSprite.State`, `BuffIndicator` and `FloatingText` render code (names only); `Burning` item-burn body (read for trigger rule only).
- Half read: code (engine) and the string table (count only). The render half was not read. Single-player: no server half to compare.
- Gaps against our rulings: the donor's fear is a per-creature buff with a caster link; our fear needs the same link. The donor's despawn-on-escape (Dread.java 63) is zone population work (row 23), not this note.

Reuse tag: rewrite-from-idea (GPL v3; clean-room only)
Brief rule served: 1 (one engine; status step on the server, presentation on the client)
