# Check of camera-brainstorm.md against camera-digest.md

Checker: independent pass. The brainstorm file was not edited. For WoWee and Valve I also opened the full donor notes under /private/tmp/p2/wave2-haiku/batch3/ (QC017, QC002) to confirm constants. Findings below are what the digest and those notes show. "wrong" means a claim the digest contradicts, or a licence breach. "minor" means overstated, unsupported or loose.

## Overall verdict

- Gems: 18 checked. 11 OK, 7 minor, 0 wrong. Donor, mechanism and licence tag hold up. The header claims are the weak part (see H1, H2).
- Defect -> fix: 10 rows checked. 9 OK, 1 minor, 0 wrong.
- Licence/shape-only rule: BROKEN in the presets. Preset A copies two restricted-donor (WoWee) constants exactly and a third nearly. Preset D copies one GPL donor (roBrowserLegacy) pair. The header says "every number is OUR guess", which is false for these.
- Presets A-E: not sane for 375x812 portrait. The shoulder offsets push the hero out of the frame in A, D and E. Details in section 3.
- Pit camera: untouched in intent. Only gap is that the preset chooser and global shake/FOV stack must be proven not to reach Pit (section 3).

## 0. Header claims

| id | claim | verdict | note |
|----|-------|---------|------|
| H1 | "about 120 donor games surveyed" | minor | The digest only says 55 notes. Nothing supports 120. Drop it or say 55. |
| H2 | "nobody ships a shoulder offset ... OpenMW is the only donor with a real over-the-shoulder offset" | minor | Overstated. jynew carries a Cinemachine prefab_shoulder_offset setting (digest data_fields; note says only the settings transfer). SRB2 has a lateral shift in its CS_SIMPLE style (p_user.c 10154-10156). OpenMW is still the only donor with a shoulder rig that switches sides and uses probes. Reword to "only donor with a working shoulder rig". |
| H3 | "Every number in the preset sketches is OUR starting guess, not a donor value" | wrong | Not true. See section 3 (licence). |

## 1. The 18 gems

| # | verdict | check |
|---|---------|-------|
| 1 | OK | openmw [C]: shoulder focal offset, side-ray probes, combat raise, all in digest. Defect row correctly says it is opt-in. |
| 2 | minor | WoWee [R]: fast pull-in, slow give-back, zoom debt after a clear spell are in the note. "Kills the flicker when you run along a wall edge or past pillars" is the brainstorm's own embellishment. The donor acceptance is about slope jitter. Say "slope and edge jitter, to be tested". |
| 3 | minor | WoWee [R] step-around exists, but the donor value is 14 degrees (note: +/-14, gain 1.0, tau 0.12/0.30). "About a dozen" is a near-copy of a restricted constant. Describe it as "a small yaw step" with no number, and use our own value. |
| 4 | OK | OpenAC [P]: damped eye starting from wall-clamped eye, sphere sweep, body fade at 0.45 m, lock-on frames one target. All in digest. Note digest says "do not copy its raw numbers"; the 0.45 appears in Preset D (section 3). |
| 5 | OK | ioq3 [C] and dhewm3 [C]: sweep, pull-in, lift, sweep again, aim at focus point. All in digest. |
| 6 | OK | gawric L2J [P]: sphere cast from look-at, lerp the look-at. Digest confirms. |
| 7 | minor | Mechanisms hold (Ikemen dead zone, CnC mean-then-clamp, SpacetimeDB step per attacker, runelite 80 percent fit). Three tag issues: (a) Ikemen is scope=pit in the digest; the note says use it for the world camera only and keep Pit frozen. The brainstorm should state that. (b) SpacetimeDB is tagged [P] but the repo root is BSL 1.1; only demo/Blackholio is Apache-2.0 (digest checker). Tag it [P, demo only]. (c) The CnC note (GPL-3 with EA terms) says do not name the donor in any Frankendom output. Fine for this internal file; strip the name before anything is published. |
| 8 | OK | Valve [R], roBrowser [C], open-midgard [C]: goal/ideal plus ease, clamp at write, wanted vs drawn, zoom reset to behind. All in digest. |
| 9 | OK | STK [C]: speed pull-back, 2x floor, dt/T easing. In digest. |
| 10 | OK | CDDA [C], hedgewars [C], exult [C]: look-ahead, dead zone, margin clamp, glide-then-snap. In digest. |
| 11 | OK | Microverse [P], OpenDiablo2 [C], ClassicUO [P] cursor lean, esponges [P] recentre while moving. All in digest. |
| 12 | OK | Mindustry [C] render-only shake with distance falloff; Barony [P] shake decay; daggerfall [P] hit-sized wobble; nostalro [P] keeps larger amplitude. All in digest. |
| 13 | OK | Cubyz [C] closed-form spring with step-up and landing kicks; korangar [P] exact per-second step with dead band. In digest. |
| 14 | OK | roBrowserLegacy [C] occluder fade. In digest. Digest also says it has no pull-in, so "stay far in cluttered zones" is an inference; acceptable. |
| 15 | minor | Mechanism holds (open-midgard, nostalro, goro, Microverse). Licence tags missing for open-midgard [C] and Microverse [P]. |
| 16 | OK | benilla [P] clip-gated tilt, eye stays put. Digest also says the bias is one-sided; the defect table covers that. |
| 17 | minor | Open-RSC turn-away, AGPL shape only, is correct. The reason "pull-in would put the camera on the hero's head" is the brainstorm's own, not the donor's. Digest says only that turn-away avoids a pull-in ray cast. Mark as our rationale. |
| 18 | OK | otclient [P], DevilutionX [R], UltimaXNA [C], crossuo [C]: glide between confirmed steps, anchor at commit. In digest. |

## 2. Ten defect -> fix rows checked

Rows chosen: openmw, WoWee, gawric, daggerfall, Cataclysm-DDA, nostalro, Ikemen-GO, esponges, SRB2, OpenEnroth.

| row | verdict | check |
|-----|---------|-------|
| openmw | OK | Opt-in default, combat offset also used for Swimming, focal cast start offset: all three are the digest checker's corrections. |
| Kelsidavis-WoWee | OK | Centred pivot, 88 degree clamp: both in the note. The -20 to +55 band is ours, but it conflicts with Preset A (see section 3, item P5). |
| gawric-L2J | OK | Snapping distance, unrotated world-space offset, fixed 90 degree horizontal FOV, no auto-follow: all in digest. |
| daggerfall-unity | OK | Hit size lost after the first frame, per-frame Rotate, 2.5 to 5 s duration: in digest. |
| Cataclysm-DDA | OK | Unclamped inverse lerp gives backward lead: in digest. |
| nostalro | OK | 1.0 pops, 0.6 rings, inverted indoor pitch band: in digest. "Around 9" is the digest's own sketch value, not a donor constant. |
| Ikemen-GO | OK | Edge speed floor with no cap, 2D: in digest. |
| esponges | OK | Upward-only lift, linear decay, broken sphere distance on lift: in digest. |
| SRB2 | OK | Camera state in server tic loop, per-tic ease, centred. The 1-(1-s)^(dt*60) form is the digest's own suggestion. |
| OpenEnroth | minor | Jitter writes party facing: in digest. Licence is LGPL-3.0; the row has no tag, add [C]. |

Extra observation: the last row "Barony fixed-step | none material" is filler that the digest does not support as a defect. Remove it.

## 3. Licence and shape-only breaches

Digest rule: restricted, GPL, AGPL, LGPL donors give shape only. The brainstorm repeats it. These preset values coincide with donor values:

| id | where | value | donor | verdict |
|----|-------|-------|-------|---------|
| L1 | Preset A | "dist-out 0.40, dist-in 0.06" | Kelsidavis-WoWee [R]: collision_recover_tau 0.40, collision_pull_in_tau 0.06 (note lines 20 and 43) | wrong. Exact copy of restricted constants. |
| L2 | Preset A and gem 3 | "stepAround up to 12 deg", "about a dozen" | WoWee [R]: +/-14 | wrong in the preset (derived from a restricted constant); minor in the gem. |
| L3 | Preset D | "occluderFade ON, 25 percent opacity, 150 ms" | roBrowserLegacy [C, GPL-3]: acceptance "fades to 25 percent opacity within 150 ms" | wrong. Same pair of numbers. |
| L4 | Preset A | "combat tauChange 0.2" | openmw [C]: acceptance "eases over about 0.2 seconds" | minor. Common value, but change it (for example 0.25) to stay clear. |
| L5 | Preset C | "FOV +5 deg ... over 0.3 s" | roBrowserLegacy [C]: "ease FOV about 0.3 s" | minor. Change the time. |
| L6 | Preset D | "bodyFade when eye within 0.45 of pivot" | OpenAC [P]: 0.45 m | minor. Permissive, so allowed with notice, but the OpenAC note says do not copy raw numbers, and the header says all numbers are ours. Pick a different value or credit it. |
| L7 | Preset D | "release coast 0.45 s" | unityro [C]: about 0.5 s | minor. Close to the donor; use a clearly different value or tune on the phone first. |

Fix: replace each with our own value, and rewrite the header sentence to "values are our starting guesses; none is copied from a restricted or copyleft donor".

## 4. Preset consistency for a 375x812 portrait phone

Visible half-width at the hero = d * tan(vFOV/2) * (375/812). Hero body is about 0.6 m wide, so offset + 0.3 m must stay inside about 85 percent of the half-width.

| preset | d (m) | vFOV | half-width (m) | stated shoulder (m) | hero far edge (m) | result |
|--------|-------|------|----------------|---------------------|-------------------|--------|
| A | 3.2 | 52 | 0.72 | 0.55 | 0.85 | clipped by the frame edge |
| B alone | 3.6 | 52 | 0.81 | 0.55 | 0.85 | just clipped |
| B 3 attackers | 5.25 | 56 | 1.29 | 0.20 | 0.50 | fine for the hero |
| C | 3.0 | 52 | 0.68 | 0.35 | 0.65 | at the edge, no room for look-ahead |
| D | 3.8 | 52 | 0.86 | 0.70 | 1.00 | clipped |
| E | 2.2 (down to 1.4) | 56 | 0.54 (0.34) | 0.40 | 0.70 | clipped, and at 1.4 m the frame is narrower than the hero |

Problems:

- P1 (wrong). Shoulder offsets A 0.55, D 0.70, E 0.40 put part of the hero outside a portrait frame. The brainstorm sets the vertical FOV cap for portrait but never checks the horizontal result. Fix: define the shoulder as a fraction of the visible half-width (target 0.35 to 0.40), or use A 0.30, B 0.30 alone, C 0.25, D 0.40, E 0.15, and have E shrink the shoulder as the pull-in shortens.
- P2 (wrong). Preset A says "focus height 0.9*H" (1.62 m), but section 3 says the base focus is chest height. With pitch 14 degrees at 3.2 m, the feet are about 1.6 m below the focus and land at the bottom frame edge (about 23.6 degrees below the view axis against a half-FOV of 26). Add the 0.3 combat raise and the feet leave the frame, and the thumb controls cover the bottom anyway. Use about 0.65 to 0.7*H and keep the thumb-zone safe frame (idea 11) as a first-class part.
- P3 (minor). Preset B fit rule "back off until all targets inside 80 percent of the view" has no distance cap. In portrait the horizontal span is the limit: a 2 m lateral spread needs d near 11 m. The "+0.55 per attacker" line stops at 5.25 m but the fit rule overrides it. State a hard maximum (for example the zone band's max) and prefer framing spread along the screen-vertical axis.
- P4 (minor). Preset C: "5.2 at sprint (>= 2x rest floor? use 1.5x for phone)" is internally inconsistent (3.0 to 5.2 is 1.73x, not 1.5x) and leaves an open question inside a spec. Pick one: for example 3.0 to 4.5 for 1.5x.
- P5 (minor). Pitch bands disagree: defect table says about -20 to +55; Preset A says -15 to 50; Preset E says 5 to 60. Pick one follow band and let zones override it.
- P6 (minor). Preset A "rear half-plane clamp +-110 deg from facing" contradicts itself: the rear half of the circle is 90 degrees or more away from facing. Write "camera yaw stays within +-90 deg of directly behind the hero".
- P7 (minor). Preset D spring (omega 6, zeta 0.85) has a steady lag of about 2*zeta/omega = 0.28 s times speed. Feed-forward of 0.12 s only removes part of it. At a 5 m/s run, the remaining lag is about 0.8 m, about the half-width at that distance. Add a leash box (fallout-style, in world units) so lag never drops the hero off the frame.
- P8 (minor). Preset E "vFOV 56 (cap 60)": fine for portrait in itself, but the cap 60 combined with a 1.4 m minimum distance gives the clipped view above. Raise the minimum distance or cap the shoulder by distance.
- P9 (minor, Pit). The chooser "blends all parameters" and the post stack (shake, FOV pulse, bob) is global. Nothing says these are read only by the world camera. Add a test: with every preset A..E and every post effect on, Pit camera output stays byte-identical to the frozen snapshot, and `?cam=` is ignored in Pit scenes.

## 5. Corrected list (what to change in the brainstorm)

1. Header: replace "about 120 donor games surveyed" with "55 notes". Replace "every number is OUR guess" with the shape-only sentence in section 3.
2. Headline: change "nobody ships a shoulder offset" to "only OpenMW ships a working shoulder rig; jynew has a prefab setting and SRB2 a simple lateral shift".
3. Gem 2: soften the "kills the flicker" claim. Gem 3: drop "about a dozen degrees".
4. Gem 7: add "(Ikemen is scope=pit; used for the world camera only)", tag SpacetimeDB [P, demo only], remove the CnC name before publishing.
5. Gem 15: add [C] to open-midgard and [P] to Microverse. Gem 17: label the "hero's head" reason as ours. Defect table: tag OpenEnroth [C], delete the Barony filler row.
6. Preset A: dist-in/out to our own values (suggest 0.08 in, 0.50 out), stepAround to our own value (suggest 10 degrees), combat tauChange 0.25, shoulder 0.30, focus height 0.68*H, yaw clamp rewritten as +-90 from behind, pitch band matched to the follow band.
7. Preset B: shoulder 0.30 alone (down to 0.10 at 3 attackers), add a hard distance cap, state the fit axis.
8. Preset C: shoulder 0.25, sprint distance 4.5 (1.5x), FOV pulse over 0.25 s.
9. Preset D: shoulder 0.40, occluder fade values changed (for example 35 percent over 200 ms), body-fade radius and coast time changed, add a lateral leash.
10. Preset E: shoulder 0.15 and scaled with distance, minimum distance raised to at least 1.8, or hero fade on.
11. Add the Pit-isolation test from P9 to Phase 0.
12. Unchanged and fine: gems 1, 4, 5, 6, 8-14, 16, 18; defect rows other than the two noted; the pipeline in section 3; experiment plan; questions for Dom.
