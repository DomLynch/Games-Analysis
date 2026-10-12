# levy-street-world-of-claudecraft (vfx-blood-finishers, cell 2)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/render/ability_vfx/sequencer.ts` (impact stack, `ArchetypeSequencer.impact` 1118-1423) with `spectacle.ts` (constants) and `fx.ts` (camera trauma budget, `shakeAt` 1886-1901) | Licence: MIT (`LICENSE`: "MIT License", "Copyright (c) 2026 Levy Street"; code may be adapted) | TypeScript | symbol `ArchetypeSequencer.impact`

Checked: read `sequencer.ts` 674-766 (update loop, impact trigger, flip2 and ring2), 1118-1423 (impact, in full), 1425-1470 (archetype impact, strike branch only), 1883-1901 and 2337-2342 of `fx.ts`, and all of `spectacle.ts` (153 lines). The list hint `warrior_hammer.ts` was opened: it is one hammer contact (storm_bolt) with a fixed 0.32 trauma and a comment that says it has no blood, so it is an example of a per-ability choice, not the stack. Not read: `release` (1026-1117), the rest of `update` (800-916), `drawTransients` (1991-2236, which draws the afterglow dome and embers), the rest of `archetypeImpact` (1425-1672), `screenFxAt` callers (`fx.ts` 1906-1910 and onward), the post pass (clamps the comment mentions), any death presentation, and any hitstop or freeze-frame code (not searched beyond one grep). Confidence: high on the impact order, numbers and trauma budget; medium on how the host uses `screenFx`. This is a VFX cell, not a camera cell, so no `camera_scope`; the trauma budget is noted below because it is the part the world camera could reuse.

Best transferable idea: a finisher is an ordinary impact plus two scheduled beats (a second wave at +0.12 s and a light column) and a bigger camera kick, with the kick capped by a rolling budget and faded by distance so chained hits never shake the camera into a rumble.
Decision (proposed): adapt — the timed-beat staging and the trauma budget fit a fast fight, but the donor's per-slot clocks, the fixed numbers in yards and the physical-branch dead code must be fixed; the effect stays client-only and never decides a kill.
Acceptance: a finisher strike on a foe, at 375 px, shows a ground wave and a white halo 0.12 s after the strike (client); the camera kicks once with 0.45 trauma only when the player is within 18 units of the hit (the donor's 18 yd); a client test asserts that three finisher hits in one second add no more than 0.55 total trauma and that the kill and HP are unchanged by the beats.

## 1. Mechanism

- Each frame, `update(host, dt)` adds dt to every active slot's clock (`slot.t`, 686). When `slot.t` reaches `impactAt`, `impact()` runs once (712-719). Physical specs have their own path and leave the loop before this stack (726-732), and `impact()` returns early for them (1120-1126).
- Order of effects inside one `impact()` call, all at the impact moment unless noted:
  1. Sound cue (1140-1147).
  2. Tier 0 only: impact flipbook, size 2 x power x 3.4 for crescendo archetypes (bolt, strike, burst, dot; `spectacle.ts` 24-29) and 1.0 otherwise; HDR 1.6 for a finisher, 1.25 otherwise, times 1.65 for crescendo (1153-1165, `spectacle.ts` 79).
  3. Ground ring (1167-1185), radius 2.4 x power, times 1.9 for crescendo and times the ring scale (`ringScale`, 2279, not read in full). The second ring is queued at +0.18 s for crescendo or radial archetypes and +0.06 s otherwise (1189). It is not gated by tier (1167).
  4. Vertical halo, default on for non-gentle impacts, radius 2.6 x power x 2.3 for crescendo (1196-1219, `spectacle.ts` 88).
  5. Finisher: the third ring is queued for +0.12 s (1237-1239).
  6. Sparks (1243-1261): count = round(30, or 14 for gentle archetypes, x power x particle quality x 0.5 at tier 1 x 2.0 for crescendo), clamped to 4-60. Particle quality is 0.4 + 0.6 x quality (1242).
  7. Blood, only when the spec authors it (1270-1284): 12 x power x gush particles, colour 0xa01222. A strike with a bleed flag gets an 8-particle blood burst at the target (1446-1448). Blood is particles only in what was read.
  8. Target flash: non-gentle, targeted hits pulse the victim's rig (1301-1304).
  9. Light pulse: min(10, 2.5 x light x power x 3.6 for crescendo), range 12 (1309-1316). Tier 0 crescendo adds a sustained light of 6.0 for 2.0 s (1318-1329).
  10. Decal (tier 0), second flipbook queued at +0.3 s (1353-1356), and for finishers at tier 0 a light column of radius 1.3 x power, height 8.5, lasting 1.3 s (1359-1370).
  11. Camera trauma (1375-1382): only at tier 0 and only for crescendo or finisher hits: 0.45 for a finisher, otherwise 0.3 x min(1.3, power).
  12. Afterglow (1417-1422): tier 0 crescendo holds 1.3 s (strike) or 2.8 s (others) with an ember burst every 0.4 s.
- Queued beats fire later from `update` on the same slot clock: the follow-up flipbook (735-748), the follow-up ring (750-766), and the finisher wave at `ring3At` (767-795): a ground wave with radius 6.0 x ringScale and a white halo of radius 4.4 x rs, where rs is ringScale times 1.9 for crescendo (`spectacle.ts` 122-123, 769).
- Tier rules: `start()` refuses tier 2 (552). Tier 1 halves the spark count (1247) and skips the tier-0 items (flipbook, shake, decal, light column, afterglow). The file header says tier 1 keeps one motif beat and sheds lingers (35-36).
- Camera trauma goes through `shakeAt` (`fx.ts` 1886-1901): nothing is granted under reduced motion (1889). Each request is multiplied by a distance falloff, full within 18 yd and zero at 50 yd (1895). The grant is `min(amount x falloff, 0.55 - recent)` (1896), so a rolling cap of 0.55 applies. `recent` decays by 0.8 per second of frame dt (2342, in the per-frame `update` at 2337).

## 2. Key functions

- `ArchetypeSequencer.update`: `sequencer.ts` 674-766 read (beat queue, slot clock, impact trigger, flip2, ring2). Lines 767-795 are the finisher wave.
- `ArchetypeSequencer.impact`: `sequencer.ts` 1118-1423, read in full.
- `ArchetypeSequencer.archetypeImpact`: `sequencer.ts` 1425-1470 (strike branch only; the rest not read).
- `crescendo gate`: `spectacle.ts` 24-43 (archetype set and `usesCrescendoScale`).
- Camera trauma: `fx.ts` 1883-1901 (`shakeAt`), 2337-2342 (decay in the per-frame update).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Impact = a set of layered effects that fire now, then a few queued beats on the same clock | Second ring +0.06 s plain, +0.18 s crescendo (`sequencer.ts` 1189); finisher wave +0.12 s (1238); second flipbook +0.3 s (`spectacle.ts` 97) |
| The finisher is the same impact with one extra beat and a bigger kick | Finisher wave radius 6.0 (`spectacle.ts` 122), white halo 4.4 (123); finisher trauma 0.45 (118) against impact trauma 0.3 (117) |
| Particle counts scale with power and with quality, and are clamped | Sparks base 30 or 14 (`sequencer.ts` 1244), crescendo x2.0 (`spectacle.ts` 81), tier 1 x0.5 (1247), clamp 4-60 (1256), quality 0.4 + 0.6q (1242) |
| Camera trauma with distance falloff and a rolling cap | Full inside 18 yd, zero at 50 yd (`fx.ts` 1895); cap 0.55 (1896); decay 0.8 per second (2342) |
| Tier budget: tier 0 = full, tier 1 = fewer particles, tier 2 = not started | Tier 2 refused (`sequencer.ts` 552); tier 1 halves sparks (1247) |
| Afterglow dwell after a crescendo | 2.8 s spell, 1.3 s strike, ember period 0.4 s (`spectacle.ts` 139, 142, 144) |

Donor comments on the numbers: `spectacle.ts` 124-125 says the post pass clamps screen flash at 0.4 and ripple at 1.4 (the post pass was not read, so this is the comment, not checked code).

## 4. TypeScript sketch

simplified: one stack for the whole fight clock; the donor keeps one clock per cast slot. It keeps the donor's order at impact (ground ring, its follow-up, sparks, the finisher wave scheduled, then trauma at tier 0 for crescendo or finisher hits), the tier-2 refusal, the falloff and the rolling cap. It omits the flipbooks, halo, light, pillar, decal, afterglow, the sound cue, the target flash, the quality factor on sparks, the reduced-motion switch, the spark speed, and the radial case for the follow-up delay (the donor also uses 0.18 s for nova and shout). The donor fires the finisher wave from its own update loop; here it is a queue in `update`, which is the same clock idea.

```ts
type Emit = (kind: string, count: number) => void;

// Client-only. Times are seconds of the stack clock (summed dt), never frames.
const TUNE = {
  ring2AfterPlainS: 0.06,     // donor: sequencer.ts:1189 (0.06 plain)
  ring2AfterBoostS: 0.18,     // donor: sequencer.ts:1189 (0.18 crescendo or radial)
  finisherWaveAfterS: 0.12,   // donor: sequencer.ts:1238 (ring3At = t + 0.12)
  sparkBase: 30,              // donor: sequencer.ts:1244 (14 for gentle archetypes)
  sparkBoost: 2.0,            // donor: spectacle.ts:81 (impactSparkCount)
  sparkMax: 60,               // donor clamp: sequencer.ts:1256
  tier1SparkScale: 0.5,       // donor: sequencer.ts:1247
  impactShake: 0.3,           // donor: spectacle.ts:117
  finisherShake: 0.45,        // donor: spectacle.ts:118
  shakeCap: 0.55,             // donor: fx.ts:1896
  shakeDecayPerS: 0.8,        // donor: fx.ts:2342
  shakeFullYd: 18,            // donor: fx.ts:1895
  shakeZeroYd: 50,            // donor: fx.ts:1895 (18 + 32)
};

interface Impact {
  finisher: boolean;
  boost: boolean;        // crescendo archetype, non-filler
  tier: 0 | 1 | 2;       // donor: 2 never reaches the sequencer
  power: number;
  distanceYd: number;
}

class ShakeBudget {
  private recent = 0;

  decay(dt: number): void {
    this.recent = Math.max(0, this.recent - dt * TUNE.shakeDecayPerS);
  }

  // Trauma actually granted for one request: distance falloff, then the rolling cap.
  request(amount: number, distanceYd: number): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const span = TUNE.shakeZeroYd - TUNE.shakeFullYd;
    const falloff = distanceYd <= TUNE.shakeFullYd
      ? 1
      : Math.max(0, 1 - (distanceYd - TUNE.shakeFullYd) / span);
    const granted = Math.min(amount * falloff, Math.max(0, TUNE.shakeCap - this.recent));
    if (granted <= 0.01) return 0;
    this.recent += granted;
    return granted;
  }
}

class ImpactStack {
  private now = 0;
  private pending: { at: number; fire: () => void }[] = [];

  constructor(private budget: ShakeBudget, private emit: Emit) {}

  // One landed hit: ground ring and its follow-up are scheduled, sparks fire now,
  // the finisher wave is scheduled, and tier-0 hits request camera trauma.
  start(hit: Impact): void {
    if (hit.tier >= 2) return;
    this.emit('ground-ring', 1);
    const ring2 = hit.boost ? TUNE.ring2AfterBoostS : TUNE.ring2AfterPlainS;
    this.pending.push({ at: this.now + ring2, fire: () => this.emit('ground-ring-2', 1) });
    const sparks = Math.min(
      TUNE.sparkMax,
      Math.max(4, Math.round(
        TUNE.sparkBase * hit.power * (hit.boost ? TUNE.sparkBoost : 1) *
        (hit.tier === 1 ? TUNE.tier1SparkScale : 1),
      )),
    );
    this.emit('sparks', sparks);
    if (hit.finisher) {
      this.pending.push({
        at: this.now + TUNE.finisherWaveAfterS,
        fire: () => this.emit('finisher-wave', 2),
      });
    }
    if (hit.tier === 0 && (hit.boost || hit.finisher)) {
      const amount = hit.finisher ? TUNE.finisherShake : TUNE.impactShake * Math.min(1.3, hit.power);
      this.budget.request(amount, hit.distanceYd);
    }
  }

  // Once per frame: advance the clock, decay the budget, fire every due beat.
  update(dt: number): void {
    this.now += dt;
    this.budget.decay(dt);
    const due = this.pending.filter((b) => this.now >= b.at);
    this.pending = this.pending.filter((b) => this.now < b.at);
    for (const b of due) b.fire();
  }
}

export {};
```

Typecheck: `work/levy-impact-stack.ts` (the block plus `export {}`) passed `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/vf014-levy-impact-stack.ts`).

## 5. Lands in

- TARGET `src/fight/impact_event.ts` (new, proposed name; the Frankendom repo was not read): the engine emits one hit event per landed blow with `finisher`, `tier` and `power`, and nothing else. The beat scheduler and the trauma budget are client code (proposed `src/render/impact_stack.ts`, not read). Server-verified kills and HP never wait on a beat.
- Parity-checklist row 10 (hit impact / hitstop). The finisher-specific rule (the staged second wave) also serves row 9, but the list hint and the mechanism both point to row 10.
- Reuse tag: adapt-shape (MIT: code may be adapted; the sketch was written from the mechanism)
- Brief rule served: 1 (one engine: the engine says what happened, the client shows it); rules 7-9 n/a

## 6. Gaps and risks

- The donor's per-slot clocks are per cast. A fight with several finishers needs one clock per hit event, or two finishers will share a clock and the second wave will fire early. The sketch shares one clock and is simplified for that reason.
- Units: the donor's distances are in yards (`fx.ts` 1883 comment, 1895 constants). Frankendom must pick one unit and convert these numbers once, as data.
- Dead conditions: in the finisher wave block (767-795) the `!spec.physical` tests cannot be false, because physical specs leave the update loop at 732 before that code and return early from `impact()` at 1126. Do not port those tests.
- Many-on-one: the trauma cap is 0.55 for the whole camera. With MAX_ATTACKERS = 3, a three-on-one burst grants at most 0.55 and then nothing until it decays (0.8 per second), so most of the extra hits add no shake. That is the donor's intent (no rumble), but it must be tested so it does not read as "the finisher did nothing".
- World camera (the owner's priority): this budget is the part the world camera could reuse directly. It is a request with distance falloff and a rolling cap, not a camera move. The shake itself is not a shoulder or lag rule, so it does not replace the follow-camera work.
- Blood here is particles keyed by the authored `blood` flag and a strike bleed flag (`physical_choreography_core.ts` 33 lists blood as one of five contact materials). The donor has no gore decals and no death presentation in what was read. Row 8 (blood and wounds) and the death screen are not covered by this cell.
- Hitstop and freeze-frames were not read in this pass. Do not claim the donor has them.
- Reduced motion: the donor's `shakeAt` path returns early under reduced motion (1889). Other shake paths were not checked. Frankendom must honour the player's setting on every shake and flash path.
- Screen flash: `screenFxFinisher` is 2.0 (`spectacle.ts` 128) and the post pass clamps (per comment). The post pass and its callers were not read, so the flash strength is not verified as applied.

Reuse tag: adapt-shape (MIT; code may be adapted, sketch written from the mechanism)
Brief rule served: 1 (one engine: the engine reports the hit, the client shows it); rules 7-9 n/a
