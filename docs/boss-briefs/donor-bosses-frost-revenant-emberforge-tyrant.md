# Brief: two donor-inspired bosses (Frost Revenant, Emberforge Tyrant)

Status: DRAFT for Dom's check, 2026-10-11. Author: donor-library dev. Owner of the build: Characters lane (owns fits). Strategy ruling applied (see section 6). Nothing here has been built; nothing was run on Hugging Face.

## 1. Ask
Two humanoid bosses for area and final fights, recreated as **distinct originals** (about 20-30% resemblance to the donor) in Frankendom's gritty realistic look, on the **shared 65-bone rig**, playing our existing 37 animations.

| Priority | Boss | Donor reference | What to keep (the idea) |
|---|---|---|---|
| 1 | Frost Revenant | World of ClaudeCraft `hoard_frost_revenant` | Tall grim plate knight, crested helm, big spiked pauldrons, icy shards on armour, tattered tabard. Realistic proportions. |
| 2 | Emberforge Tyrant | World of ClaudeCraft `hoard_emberforge_tyrant` | Black heavy plate with glowing furnace grate in the chest, orange seams at joints, horned helm with a slit, massive pauldrons. |

Not in this brief (Strategy: wait until after Proof 3, Wed 2026-10-14, because a new rig needs a new animation set): Dread Stalker (beast), Stormscale Drake (dragon). Wolf and boar stay the only creature exceptions.

## 2. Method (kit-bash first)
1. Start from one of the 100 Pit characters on the shared rig plus existing armour pieces (Knight is the closest armoured body; Guard is the plain neutral body for fitting; Minotaur/Executioner for a heavier frame).
2. Add ONE signature piece per boss through hero-set (helm or chest): Frost Revenant crested helm or icy pauldrons; Emberforge Tyrant glowing grate chest or horned helm.
3. Blender fits, stills and LODs on CPU. T4 only for generation (about $1 per boss, report actual per-job dollars).
4. Style lock: gritty realistic, phone budget about 46k polys, textured. Look-test on the phone before building more (see look-test skill).

## 3. Reference pictures (in this repo, `img/`)
- `donor-bosses-reference-views.png`: both donors, textured, front / three-quarter / side / back.
- `claudecraft-boss-candidates.png`: nine ClaudeCraft bosses and mobs for context.
- `frankendom-models-lineup.png`: our ten models (all T-pose, one shared rig).

Note on proportions: Frost Revenant has realistic long limbs (good match). Emberforge Tyrant is stocky with a big head and short legs (chibi-leaning), so its proportions must be reworked to our realistic frame, keeping only the silhouette idea.

## 4. What was tried and failed (do not repeat)
Two automatic attempts to skin the donor mesh onto our body, both in Blender headless:
- Attempt 1, weight transfer from our body to the donor: at rest the donor fits perfectly, but in Attack the armour crumples (`test1-attempt1-weight-transfer.png`).
- Attempt 2, each of the donor's 915 loose pieces tied rigidly to one bone: plates and an arm fly off (`test1-attempt2-rigid-plates.png`).
Cause: a thick, loose-piece, low-poly armour mesh (3,667 polys, 23 bones) does not skin onto our slim 65-bone body. The pose (T-pose) was NOT the cause. Do not auto-skin donors; build on our rig.
Other facts: ClaudeCraft textures are KTX2 (`KHR_texture_basisu`), which Blender cannot import; we have no converter (KTX-Software `ktx extract` would be needed). Stripping textures is fine for silhouette sheets only.

## 5. Moves we already have (our rig, 37)
Idle, Walk, Jog, Run, strafes, Attack, Heavy, Kick, Guard, Parry, Riposte, Roll, Hit, BlockImpact, Deflected, four finisher deaths (Run Through, Split Crown, Quiet One, plain Death), and Maul variants. Donor moves (KayKit set of 25: generic melee, shield bash, spellcasting) are not needed. Monster-only moves, if wanted, are new animation work and need Strategy approval.

## 6. Rulings applied
- Strategy (2026-10-11): kit-bash first; donor reference only; no auto-skinning; priority Frost Revenant then Emberforge Tyrant; every humanoid on the 65-bone rig; Characters lane builds on Monday; nothing on Hugging Face on 2026-10-11 (finish-line day, quota 88%, no new PRs).
- Dom: recreate, never reuse donor assets as-is.

## 7. Licence trace (per asset)
| Asset | Source | Licence | Evidence |
|---|---|---|---|
| `public/models/creatures/hoard_frost_revenant.glb` | github.com/levy-street/world-of-claudecraft, commit `86cc574989` (2026-10-09), cloned to `/mnt/frankendom-donors/levy-street-world-of-claudecraft` | MIT for the repo (`LICENSE`, "Copyright (c) 2026 Levy Street") | README says models are built by procedural factories through an image-to-GLB pipeline plus a curated library of CC0 model kits. |
| `public/models/creatures/hoard_emberforge_tyrant.glb` | same repo and commit | same | same |
Unverified: the exact origin of these two files (own pipeline vs a CC0 kit) was not traced per file. Treat as reference only, which the 20-30% resemblance rule requires anyway. No donor mesh or texture goes into Frankendom.

## 8. Acceptance (for the Characters lane)
- Each boss reads as the donor's idea but is clearly a new design; side-by-side with the donor shows about 20-30% resemblance.
- Plays our full move set on the shared rig with no stretching in Attack, Guard, Roll and a finisher.
- About 46k polys, textured, passes a phone look-test against the arena lighting; stills at the fight camera, 375 wide, ready idle plus mid-fight.
- Per-job Hugging Face dollars reported; licence trace kept per asset.

## 9. Test 2 result (kit-bash on the knight, run 2026-10-11 by the donor-library dev, CPU only, no Hugging Face)
Script: `tools/kitbash_frost_revenant.py` (Blender headless on the VPS; pictures rendered in Three.js). Input: our `knight.glb`. Changes: maul removed, body tinted frost-blue, 13 icy spike pieces (3 per shoulder, 2 per forearm, helm crest plus 2 side shards) each bound rigidly to one bone.
- Works mechanically: it keeps our 65 bones and all 37 animations, the pieces stay attached through Attack and nothing tears (`img/test2-kitbash-attack.png`).
- Look is basic: it reads as a spiky knight with white cones, far from the donor's tattered tabard and big shaped pauldrons (`img/test2-kitbash-views-vs-donor.png`).
- Next for the lane: replace the cones with a real signature armour piece through hero-set (crested helm, shaped spiked pauldrons), add a tabard, and use the Guard or Knight body. No auto-skinning needed.
