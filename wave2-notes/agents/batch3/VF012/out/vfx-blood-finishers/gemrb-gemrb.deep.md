# gemrb-gemrb (vfx-blood-finishers, cell 2)

Donor: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` | Licence: GPL-2.0-or-later (Actor.cpp line 3 SPDX tag; repo COPYING is the GNU GPL Version 2 text) | C++ (GemRB, Infinity Engine reimplementation) | symbol `Actor::Damage` (with `Actor::Die`, `ChunkActor`, `CanGetChunked`)

Checked: `Actor::Damage` 4290-4574 read end to end, except the two callees `ModifyDamage` (4399) and `DisplayCombatFeedback` (4403), which are not read and feed the damage input. `CanGetChunked` 4276-4287, `ChunkActor` 4234-4274, `Actor::Die` 5607-5668 (up to the gore branch and the die stance; the rest of Die not read), `CheckOnDeath` 5782-5830 and its removal timers 5905-5916, `pcf_hitpoint` 1145-1170 (the `hp <= 0` death test), Map loop 2447-2453, `Interface.cpp` 939-951 (the dmginfo loader), data tables `unhardcoded/shared/dmginfo.2da` and `unhardcoded/bgee/damage.2da`, `includes/damages.h` 34-35. Confidence: high on the chunk decision, the Gore gate and the blood tiers. Medium on the death call order: how `SetBase` reaches `pcf_hitpoint` was not read, so the order is from the call sites only. Not read: which of the death stance or the hit animation wins on screen (`PlayDamageAnimation` not read). `camera_scope`: not applicable (not a camera cell).

Best transferable idea: Make a kill "overkill" by a per-damage-type margin past the victim's HP (a data table, with a fixed PC rule), decide it once in the damage step, and send it as a flag so the client picks a chunked finisher only for those kills.
Decision (proposed): adapt - keep the overkill-margin finisher and its per-type data table; change the donor's unsigned compare, the hidden +1 offset and the death-order coupling; keep the chunk presentation client-only.
Acceptance: With a crushing threshold of 9 (donor table 8 plus one), a 12-point hit on a 2-HP monster gives a chunked kill flag (12 >= 2 + 9) and an 8-point hit does not (8 < 11); a poison hit never chunks; the client then shows seven body pieces scattering 5-40 units from the corpse and gone after about half a round. A server test asserts the flag is set from HP and damage, not from the client.

## 1. Mechanism

- Entry: `Actor::Damage(damage, damagetype, hitter, modtype, critical, saveflags, specialFlags)` (4290). Order of steps as the code runs:
  - (a) Guards: an actor already flagged `IF_REALLYDIED` returns 0 (4293); avatar removal or bird-type immunity returns 0 (4298).
  - (b) Resist and feedback: `ModifyDamage` (4399) reduces the damage and sets `resisted`; `DisplayCombatFeedback` (4403) runs unless the no-feedback flag is set. Both were not read.
  - (c) Chunk decision, only if `damage > 0` (4406). First `allowChunking = CanGetChunked(this)` (4408). If the target is frozen or petrified and chunking is allowed, damage becomes the sentinel 123456 and the chunk flag is set (4409-4411). Then the margin: `chunkyLimit = 1` (4415); if the damage-type table has a row, `chunkyLimit = chunking + 1` (4416-4418); if the limit is still 1, chunking is off (4420, the donor's sentinel). A PC uses a fixed 20 (4421). The chunk flag is set when `damage >= HP + chunkyLimit` (4422). The damage type is looked up with `find` on the whole word (4416).
  - (d) Stun instead of death (4432-4446): if the damage would reach zero and the type is stunning and the minimum-HP stat is zero or below, the target sleeps for 2 rounds plus 15 per HP below one (4442), and damage is cut to HP minus 1 (4446).
  - (e) Caps and drains (4451-4472): optional limits from the caster's or target's HP, not in the sketch.
  - (f) `killed = damage > chp` and the minimum-HP stat is zero (4482). A killing blow skips the hurt stance and sound (`GetHit`, 4110-4112) and triggers cleave (4528-4529).
  - (g) Morale: crossing 50 percent or 25 percent of max HP costs morale (4497-4508). Not in the sketch.
  - (h) HP write: `SetBase(IE_HITPOINTS, ... - damage)` (4522). The HP callback `pcf_hitpoint` (1145) tests `hp <= 0` (1160) and calls `Die(nullptr)` (1161). Inside `Die` (5607), the Gore setting is read (5658). If the chunk flag and Gore are both set, `ChunkActor` runs (5659-5660); otherwise the die stance plays (5662).
  - (i) Blood tier (4534-4541): damage below 10 is tier 0, below 20 is tier 1, else tier 2. The donor comments the breakpoints as "a guess" (4537).
  - (j) Animation choice (4543-4563): fire, cold, electricity, acid and disintegration pick their own animation with the tier (magic fire and magic cold also, but only when the `third` flag is false; what `third` is was not read). Any other type: if the pre-hit HP is below -10, play the critical animation (`critical << 8`, 4558-4559); else play `DL_BLOOD + tier` (4561). `DL_CRITICAL` is 0 and `DL_BLOOD` is 1 (`includes/damages.h` 34-35), and the rows of `bgee/damage.2da` run CRIT, SMALL, MEDIUM, LARGE (rows 4-7), with blood gradient 47.
  - (k) Party autopause on wounds and hits (4565-4573), return the damage.
- `CanGetChunked` (4276-4287): a minimum-HP stat blocks chunking (4278); the disable-chunking stat blocks it (4279); PST has no chunk animations (4280); EE with MC_IGNORE_RETURN blocks it (4281); a non-party actor may always chunk (4284); a party member may chunk only above Normal difficulty (4285).
- `ChunkActor` (4235-4274), the visual part only (the donor comment at 4234 says so): sets the actor's animation to a fixed id (4244) and stuns it (4246); creates seven body-part copies (4249) by copying the whole actor (`CopySelf`, 4251); each copy is placed 5 to 40 units from the victim at a random orientation (4257), gets a body-part animation, is flagged dead (4265), and gets a remove effect that fires at half a round plus or minus 30 game-time units (4268); then the original's scripts are cleared (4271-4273). The donor's own TODO (4242) says the real chunk animation and particles are not done ("fake a fountain by spawning more actors", 4243).
- Data: the damage-type table is `dmginfo` (loaded at `Interface.cpp` 939), with the CHUNKING column read at 950 and each row stored under its VALUE column (951). The shared table: crushing, piercing and slashing have CHUNKING 8; acid, cold, electricity and fire have 5; poison, magic, missile and stunning have 0 (`unhardcoded/shared/dmginfo.2da` rows 4-19). Its own meaning line: "how much below 0 HP one can go before exploding?" (line 27).
- Corpse timing (5816-5818, 5907, 5912): a chunked corpse is removed when its removal time passes (5818), set to two seconds of ticks (5912); a normal corpse is kept a day (5907). `CheckOnDeath` is called for each actor in the map's actor loop (Map.cpp 2447-2451); how often that loop runs was not read.
- Numbers worked out from the code: with the crushing row (table 8, so threshold 9), a victim at HP 2 chunks at damage 11 or more (2 + 9). A PC chunks at 20 over HP regardless of type (if the type allows chunking at all).

## 2. Key functions

- `Actor::Damage`: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Scriptable/Actor.cpp` 4290-4574 (guards, chunk decision, stun, killed, HP write, blood tier, animation).
- Chunk decision block: same file, 4406-4425.
- `CanGetChunked`: same file, 4276-4287.
- `ChunkActor`: same file, 4235-4274.
- `Actor::Die` (gore branch): same file, 5607-5668; `pcf_hitpoint` (HP death test): same file, 1145-1170.
- `CheckOnDeath` and the removal timers: same file, 5782-5830 and 5905-5916; the Map call: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Map.cpp` 2447-2451.
- Table loader: `/mnt/frankendom-donors/gemrb-gemrb/gemrb/core/Interface.cpp` 939-951; data `/mnt/frankendom-donors/gemrb-gemrb/gemrb/unhardcoded/shared/dmginfo.2da`; `/mnt/frankendom-donors/gemrb-gemrb/gemrb/unhardcoded/bgee/damage.2da`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Overkill finisher: the kill is a chunked death when the hit goes past HP by a margin | Margin per damage type from the table: 8 for crushing, piercing, slashing (theirs, dmginfo.2da rows 4, 9, 13); 5 for acid, cold, electricity, fire, magic fire and cold (rows 5-8, 14-15); 0 (off) for poison, magic, missile, stunning. The code adds 1 to each (Actor.cpp 4418) |
| Margin is data per type, with an off switch | Theirs, dmginfo table; a result of 1 is read as off (Actor.cpp 4420) |
| Player characters use a fixed larger margin | 20 (theirs, Actor.cpp 4421) |
| Three blood tiers by hit size | Breakpoints 10 and 20 (theirs, Actor.cpp 4535-4539; "a guess") |
| Critical animation when the pre-hit HP is below -10 | -10 (theirs, Actor.cpp 4558) |
| Seven body pieces, 5 to 40 units out, expiring after half a round with jitter | 7 pieces (4249), 5 to 40 (4257), half a round plus or minus 30 game-time units (4268) |
| Stun instead of death at the threshold | 2 rounds plus 15 per HP below one (4442) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order that matters: guard, then the chunk decision (frozen override, threshold lookup, PC limit, threshold test), then the killed flag and the blood tier from the same damage value. It stores the threshold as the real number (9 for crushing), so the donor's +1 is applied in the table, not in code. It uses signed numbers where the donor compares unsigned values. It omits the resist and feedback steps (input), the stun-instead-of-death branch, the caps and drains, morale, party autopause, the non-physical animation choice (fire, cold, electricity, acid and the magic variants), the rows for magic fire, magic cold, soul eater and disease in the table, the death call order inside the HP write, and the corpse timers.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type DamageKind =
  | "crushing" | "piercing" | "slashing"
  | "acid" | "cold" | "electricity" | "fire"
  | "poison" | "magic" | "missile" | "stunning";

// Data table (designer-editable): the real chunk threshold past current HP per damage kind.
// Donor value = dmginfo CHUNKING column (8 crushing, 5 elemental) plus one, which the donor adds in code. 0 = never chunks.
const CHUNK_THRESHOLD: Record<DamageKind, number> = {
  crushing: 9, piercing: 9, slashing: 9,
  acid: 6, cold: 6, electricity: 6, fire: 6,
  poison: 0, magic: 0, missile: 0, stunning: 0,
};

// Engine constants (not data in the donor): PC chunk margin and the blood tier breakpoints.
const PC_CHUNK_LIMIT = 20;
const BLOOD_TIER_1 = 10; // damage below this: tier 0 (small)
const BLOOD_TIER_2 = 20; // damage below this: tier 1 (medium), else tier 2 (large)

interface Target {
  hp: number;               // current hit points before this hit
  isPc: boolean;
  chunkingAllowed: boolean; // folds in the donor's CanGetChunked rule (min HP, disable flag, party/difficulty)
}

interface HitOutcome {
  damage: number;   // after the frozen/petrified override
  chunked: boolean; // overkill finisher: the death uses the chunk presentation
  killed: boolean;
  bloodTier: number;
  hpAfter: number;
}

function resolveHit(t: Target, kind: DamageKind, raw: number, frozenOrPetrified: boolean): HitOutcome {
  let damage = raw;
  let chunked = false;
  let allow = t.chunkingAllowed;

  if (damage > 0) {
    if (frozenOrPetrified && allow) {
      damage = 123456; // any hit on a frozen or petrified target shatters it
      chunked = true;
    }
    if (CHUNK_THRESHOLD[kind] === 0) allow = false; // 0 turns chunking off for this kind
    const limit = t.isPc ? PC_CHUNK_LIMIT : CHUNK_THRESHOLD[kind];
    if (damage >= t.hp + limit && allow) chunked = true;
  }

  const killed = damage > t.hp;
  const tier = damage < BLOOD_TIER_1 ? 0 : damage < BLOOD_TIER_2 ? 1 : 2;
  return { damage, chunked, killed, bloodTier: tier, hpAfter: t.hp - damage };
}

// Client view of a chunked death: a fixed set of body-part copies flung out at random offsets, each expiring after
// about half a round with a small random jitter. Values are the donor's, kept as named constants.
const CHUNK_PARTS = 7;
const CHUNK_OFFSET_PX: [number, number] = [5, 40];
const CHUNK_LIFE_JITTER = 30;

function chunkCopies(roundTicks: number, rnd: () => number): { offsetPx: number; lifeTicks: number }[] {
  const out: { offsetPx: number; lifeTicks: number }[] = [];
  for (let i = 0; i < CHUNK_PARTS; i++) {
    const [lo, hi] = CHUNK_OFFSET_PX;
    const offsetPx = lo + Math.floor(rnd() * (hi - lo + 1));
    const jitter = Math.floor(rnd() * (2 * CHUNK_LIFE_JITTER + 1)) - CHUNK_LIFE_JITTER;
    out.push({ offsetPx, lifeTicks: Math.floor(roundTicks / 2) + jitter });
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/gemrb-overkill-finisher.ts), exit 0. The file is `work/gemrb-overkill-finisher.ts`.

## 5. Lands in

- TARGET `src/fight/damage.ts`: the one damage step (the place health changes). The overkill flag is decided here from HP and damage, once, and sent with the kill. The chunk visual is client-only and reads the flag.
- Parity-checklist row 9 (finishers). The blood tiers would sit under row 8 (blood, wounds, decals) and are not scored here.
- today: (not read) Frankendom's current kill and finisher presentation.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only; the sketch copies no lines)
- Brief rule served: 9 (finishers); the ruling that kills are server-verified and that there is one damage step; the camera, HUD and sound stay client-only.

## 6. Gaps and risks

- Defect 1, unsigned compare: `(ieDword) damage >= Modified[IE_HITPOINTS] + chunkyLimit` (4422). The stat type of `Modified` was not read; if it is unsigned, a victim far below zero HP can make the sum wrap and the test fail. Fix: compare as signed integers (the sketch does).
- Defect 2, offset and sentinel: the table value is shifted by one (4418) and a result of 1 is read as "off" (4420). It works, but a designer cannot write "chunk one past zero" directly. Fix: store the real threshold in the data (the sketch does: 9 for crushing).
- Defect 3, sentinel damage: a frozen or petrified target gets `damage = 123456` (4410), and that same number then drives the HP write (4522) and the tier. It works for a kill, but it mixes a sentinel into the damage ledger. Fix: keep a separate `chunked` flag and leave the damage alone (the sketch does).
- Defect 4, death order: `Die` runs inside the HP write (4522 through the HP callback 1145-1161), before the animation is chosen (4534-4563). Which of the die stance and the hit animation wins on screen was not read. Fix: decide the death presentation once, after the damage step.
- Defect 5, whole-word lookup: the margin is `find(damagetype)` on the whole type word (4416), and the table is keyed by the VALUE column (Interface.cpp 951). A hit whose type word combines two bits matches no row and gets no margin, so no chunk. Whether weapon hits ever carry two type bits was not checked. Fix: look up each bit and take the largest threshold.
- Frankendom risk: `ChunkActor` makes seven full actor copies per chunked death (`CopySelf`, 4251) and places them in the world. The donor's own note calls it a fake fountain (4243) with a TODO (4242). In a crowd, that is seven objects per kill. Fix: client-only pieces from a pool, capped per frame; the sketch returns data only.
- Frankendom ruling: PC and party chunking is a gameplay switch (CanGetChunked 4284-4285, difficulty). Keep it as data, not as a hard-coded party rule.
- Numbers to make data fields: the table thresholds (dmginfo), the PC threshold (20, 4421), the blood breakpoints (10 and 20, 4535-4539), the critical HP line (-10, 4558), the piece count and offsets (4249, 4257), the piece lifetime (4268), the stun sleep (2 rounds plus 15 per HP, 4442). Where: thresholds per damage type are engine data; the PC threshold, breakpoints and piece count are engine constants unless a zone needs otherwise.
- Not written up here: the morale thresholds (4497-4508), the caps and drains (4451-4472), and the stun-instead-of-death branch (4434-4446) are real mechanisms in the same function; they are not part of the finisher note and are not scored here.
