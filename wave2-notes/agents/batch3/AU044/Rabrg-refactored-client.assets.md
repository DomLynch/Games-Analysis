# Rabrg-refactored-client (asset audit, AU044)

Donor: /mnt/frankendom-donors/Rabrg-refactored-client (VPS, read only).

Halves: client half only. src/com/jagex/runescape/ holds 73 Java files for a RuneScape 317 client (README line 4: "Refactoring the obfuscated v317 of the RuneScape (RuneTek 3) client."). No server half in the box. No cache or data pack in the box: the cache classes (cache/Index, cache/Archive, cache/def/*) are present as code but their data files are not.

Restricted: _RESTRICTED-NOTE.txt line 1 reads "RESTRICTED: Jagex-derived RuneScape 317 client. Study shape/idea only; never copy code or constants." Inspiration stays category level for this donor.

## Licence (what the files say)
- Code: no LICENSE file and no licence statement in the tree. Files: 73 .java, README.md, _RESTRICTED-NOTE.txt, .gitignore. Licence unknown.
- Asset licence: none. There are no asset files in the tree (1.3 MB total, all Java and text).

## Asset inventory
| group | path | count | class | note |
|---|---|---|---|---|
| non-code content | none | 0 | D | no sprites, models, audio, maps or string tables in the tree |
| code | src/com/jagex/runescape/** | 73 Java files | restricted | decompiled client code; Rasterizer3D.java line 3 says "Decompiled by JODE" |

Data tables: none in the box. The client reads its art, models, audio and item/NPC data from a cache that is not in the box.

## Rights-holder status (from the files)
Proprietary: _RESTRICTED-NOTE.txt names it a Jagex-derived RuneScape 317 client. Rasterizer3D.java line 3 marks it as decompiled source. README says it is a refactor of an obfuscated client. Status: derived from a commercial client; restricted by the donor's own note.

## Best class
D. No usable non-code content. Code is restricted and unlicensed.

## Inspiration (category level only, per the restricted note)
- A low-memory software renderer that uses a global quality flag (Rasterizer3D.java lines 11 and 14: low-memory and textured flags). Idea: one switch that drops expensive paths, per device tier.
- Precomputed trig and shading lookup tables instead of per-frame maths (Rasterizer3D.java lines 18, 20 and 21: a 512-step shadow table and 2048-step sine and cosine tables). Idea: a lookup for a dusk-to-night colour ramp.
- A priority-ordered queue of outstanding asset requests with a checksum check on arrival (OnDemandRequester.java lines 18, 21, 22, 27). Idea: zone chunks load by priority and are verified before use.
- A keep-alive timer on the request socket (OnDemandRequester.java declares a since-keep-alive counter; the body was not read).

## Briefs (category level, all ours to design)
Dom's rule: recreate as a clearly distinct original, never a copy. No instance-level looks or constants are given for this restricted donor.

1. **Angle lookup ramp** (own label). Why: precomputed angle tables replace per-frame trig. Kept: indexed lookup tables. Changed: the table drives a dusk-to-night colour ramp in our GPU shader, not a rasteriser. Ref: Rasterizer3D.java lines 18-21.
2. **Priority asset queue with a checksum** (own label). Why: assets are requested by priority and verified on arrival. Kept: a priority queue of outstanding requests and a check on arrival. Changed: zone chunks load in a per-frame budget with a visible loading ribbon, not a silent socket. Ref: OnDemandRequester.java lines 21, 22, 27.
3. **One quality switch** (own label). Why: a single flag gates the expensive texture path. Kept: one switch for the expensive path. Changed: quality tiers per device, not a boolean. Ref: Rasterizer3D.java lines 11, 14.

## Cross-link
- Zones and scene: Scene.java and SceneCluster.java exist in the tree but were not read. No asset content to take.
- Loot and items: cache/def/ItemDefinition.java exists but was not read; its data is not in the box.
- Sound: sound/SoundTrack*.java exist but were not read. No sound assets in the box.
- Camera: CameraAngle.java exists but was not read.

## Not read
- All 73 Java files except the parts of Rasterizer3D.java (lines 1-28) and OnDemandRequester.java (lines 1-28).
- Scene, SceneCluster, SoundTrack*, Model, Game, GameShell, cache/def/* (names only).
- Any body of the classes above.
