# MovingBlocks-Terasology (procgen-grammars, feel/world-design note)

Donor: `/mnt/frankendom-donors/MovingBlocks-Terasology` | Licence: Apache License 2.0 (LICENSE line 2; SPDX Apache-2.0 in file headers; NOTICE says Copyright 2011-2016 MovingBlocks, keep the notice) | Java | depth: thin (the engine's generation pipeline read in full, but the box has no content modules, so no concrete generator step is in it) | half read: server (engine world generation; `modules/` holds build files only)

Checked: WorldBuilder.java (all 434 lines); BaseFacetedWorldGenerator.java (all); Border3D.java (1-80 of 153); UpdatePriority.java, Facet.java, FacetBorder.java, FacetProvider.java, Produces/Requires (small files); ProviderStore.java (addZone, setSeed, getSeed, getChildZone); Zone.java (initialize, process, generateChunk, containsBlock, getSiblingRegionFunctions); zones/LayeredZoneRegionFunction.java (all 176); LayerThickness, ConstantLayerThickness, MinMaxLayerThickness, SeededNoiseLayerThickness (all); ZonePlugin.java (header); ZoneRegionFunction.java (interface). Grep: no class in engine/src carries @Produces, so no engine facet provider is in the box; engine-tests/src/main/java/org/terasology/unittest/worlds/FlatSurfaceHeightProvider.java and engine-tests WorldBuilderTest.java do use @Produces and are the one concrete worked provider available. Confidence high on how the pipeline orders steps and handles seeds; no generated output was seen.

## 1. What the player sees/feels

Nothing in this box reaches a screen directly: there are no biomes, ores, trees or structures in the tree. What the engine code does produce is layered ground: bands of underground material whose thickness changes smoothly from column to column, a surface taken from an elevation field, and zone volumes that overwrite only the blocks inside their own region. A player would feel "strata that vary slowly under the ground". This is from the code, not from play.

## 2. Why it works / is striking

- Readable at 375 wide: not applicable as shipped; the only visible property is that bands change smoothly.
- One signature behaviour: a generation step declares what it produces and what it needs, and the builder refuses to run a graph with a missing step (a named error). That is the transferable part.
- Could be made ours at 20-30 percent resemblance: yes for the build tool (declared steps, a zone overlay that touches only its footprint). Not for the look.

## 3. The rule behind it

Facet pipeline (WorldBuilder.java):
- A provider declares Produces (facets it writes), Requires (facets it reads, each with a border), and Updates (facets it changes, each with a priority).
- Chains: for each facet, the builder collects every producer and updater, then walks requirements to add their providers in order (174-304). A requirement with no producer throws a named error at build time (197-209).
- Cycles: a requirement that loops back is caught by comparing update priorities (265-292).
- Priorities (UpdatePriority.java 10-16): produces 250, critical 200, high 150, normal 100, low 50, trivial 0, requires -50. An updater joins a chain only if its priority is above the cut-off passed down by the requirer (251-257).
- Borders: starting from zero, each facet's border grows by what its requirers need, computed from the last provider back to the first (determineBorders, 110-172). That is how chunk-edge data is made large enough to be correct.
- Rasterizers: ordered after their antecedents (373-402). A rasterizer whose required facet has no chain is dropped without a message (407-422).
- Seeds: the world seed string becomes a 32-bit Java hashCode (BaseFacetedWorldGenerator 45), which is copied to every provider (WorldBuilder 92-94) and every child zone (ProviderStore 57-61), and each zone and layer uses that same value.

Zones and layers:
- A zone is a region predicate plus rasterizers plus child zones (Zone extends ProviderStore). When a chunk is generated, a zone with no block in its region is skipped; otherwise it rasterizes the whole chunk and puts back every block outside its region (Zone.java 110-150).
- A layered zone sorts its sibling layers by absolute ordering. For each column, the layer range is the running sum of the layer thicknesses from the surface (downward for underground, upward for sky). The outermost layer is open on its far side. The lower bound is exclusive and the upper bound inclusive (LayeredZoneRegionFunction 56-116, 170-171).
- Thickness: a constant, or a value picked between a minimum and a maximum by 2-octave Brownian simplex noise at scale 100 (MinMaxLayerThickness 26, 34-39).

Data fields (Apache, so donor values are allowed):

| name | unit | donor value | where |
|---|---|---|---|
| seaLevel | blocks | 32 (WorldBuilder 36) | engine constant |
| facet border top / bottom / sides | blocks | annotation, default 0 (Facet, FacetBorder) | zone data per facet |
| update priority | priority | 250, 200, 150, 100, 50, 0, -50 (UpdatePriority 10-16) | engine constant |
| layer ordering | index | 400, 300, 200, 100, 0, -100, -200, -300 (LayeredZoneRegionFunction 134-141) | zone data |
| layer thickness min / max | blocks | set per layer (MinMax constructor) | zone data |
| noise scale | blocks | 100 (MinMaxLayerThickness 34) | engine constant |
| noise octaves | count | 2 (MinMaxLayerThickness 26) | engine constant |

## 4. For Frankendom

- Maps to: the zone build tool, not the live server. A zone row names the steps it runs and the facets they produce; the builder refuses a row whose step needs a missing producer. That is the one transferable structure.
- Keep: the declared produces/requires graph with a named missing-step error and a cycle check at build time.
- Keep: the zone overlay. A sub-zone (vault, camp, lake) writes only inside its footprint and puts back everything outside it. That is how a sub-zone sits inside a parent zone without touching the parent's other tiles.
- Adapt: ordered layers as tiers of a zone (shore, inland, keep) with thickness rows. Only useful if our zones have depth; the first slice is probably flat, so this is parked.
- Change (keep the idea, fix the defect):
  - Every layer uses the same seed (ProviderStore 58-60; LayeredZoneRegionFunction 64; SeededNoiseLayerThickness 27), so layers with the same rule move in lockstep. The donor's own TODO says so (MinMaxLayerThickness 25). Fix: derive each zone's seed from the world seed plus the zone id.
  - A rasterizer with a missing facet is dropped silently (416-418). Fix: a build error that names the rasterizer.
  - The seed is a 32-bit string hash (BaseFacetedWorldGenerator 45). Fix: a 64-bit hash of the zone id; keep the world seed as a stored string.
  - Zone.initialize is called twice (Zone.java 86 TODO). Fix: run it once, or make it idempotent.
  - Two providers producing one facet only log a warning (WorldBuilder ~241-243: 'Facet already produced ... overwritten'); the last producer silently wins. Fix: a build error naming both providers (keep the declared-produces idea).
- Core slice this week: none directly. The useful piece is the zone build tool's step graph and per-zone seed. It feeds zone data, not parity row 23 yet (row 23 owns zone population; it would take the overlay footprint for spawn areas).

Decision (proposed): adapt. Take the declared step graph, the missing-step error and the overlay footprint; derive per-zone seeds; reject the chunk-border arithmetic unless the world is chunked (not planned).
Acceptance: a build test with a zone row that requires a missing step fails and names the step; two zones with the same thickness rule and different ids produce different noise fields.

## 5. Look test (Dom, 5 minutes, phone)

Render one column of two stacked bands from the same seed, once with the donor's shared seed and once with a per-zone seed, both at the same thickness rule. Dom looks at the two pictures on his phone and says whether the shared-seed pair looks like a copy. If it does, the per-zone seed is the fix to build.

## 6. Licence / IP

Apache License 2.0 (LICENSE line 2). Adaptation allowed with the NOTICE kept. No content assets in the box (modules are not present), so there is no art, lore or name to avoid.

## 7. Gaps

- Not read: WorldImpl.java (86 lines), RegionImpl.java, GeneratingRegion.java, WorldRasterizer.java, WorldFacet.java, EntityBuffer.java, the facets directory (SurfacesFacet, ElevationFacet and others, named only), Border3D.java lines 80-153, WorldGeneratorPluginLibrary (the donor's comment says provider order comes from hash-based iteration; the iteration itself was not read).
- Half read: server only. No client, no content, no docs on world generation (docs/ has no such file).
- No git history in the box. History below is from code comments only.

## As-data shape

- Not a table. A zone is a Java class (ZonePlugin extends Zone; ZonePlugin.java 15). A facet provider is a Java class with annotations (Produces, Requires, Updates; Facet with a value and a FacetBorder for top, bottom and sides).
- Row fields: none. The row equivalent is the annotation set (produces, requires, updates, priority, border) on a class.
- A new zone is one row: no (it is a class). A new facet provider: no (a class plus annotations). A new layer rule: no (a LayerThickness class). The step graph is data only in the sense that annotations are read at build time.

## Provenance per claim

Repo: MovingBlocks-Terasology (folder above), Apache-2.0. Each key claim has a receipt in `receipts.tsv` (note = MovingBlocks-Terasology): BaseFacetedWorldGenerator 45 (hashCode seed); WorldBuilder 87, 93, 133, 159, 179, 204-205, 243, 288, 350, 373, 416; ProviderStore 21, 60; LayeredZoneRegionFunction 64, 84, 86, 113, 138, 141, 170; SeededNoiseLayerThickness 27; MinMaxLayerThickness 25, 34; Zone 86, 133, 138; Border3D 14; UpdatePriority 10; ZonePlugin 15; LICENSE 2.

## What they patched later

- Facet collection before the requirement check, so the check does not depend on provider order (WorldBuilder 178-181).
- Update priority returned only for facets the provider actually updates (comment at 350-353), with the comment saying the old behaviour understated the chain.
- Stale TODO: WorldBuilder 87 says the required-provider check is missing; the check exists at 197-209. Treat the TODO as out of date.
- Duplicate producer of one facet: only a warn log, last wins (WorldBuilder ~241-243); not patched.
- Still open per the donor's own TODOs: shared layer noise (MinMaxLayerThickness 25); initialize called twice (Zone 86); rasterizer ordering handles first-order dependencies only (WorldBuilder 373).

## Rulings for Dom

1. Should each zone row name the steps it runs and the facets they produce, and be refused at build if a step is missing? Recommend yes.
2. Do our zones need depth (layers), or is the first slice flat? Recommend flat for now; park layers.
3. Should every zone derive its noise seed from the world seed plus its id, so two zones with the same rule never share a pattern? Recommend yes.

## Reuse tag

Reuse tag: adapt (Apache-2.0; keep NOTICE; step graph, missing-step error and overlay only).
Brief rule served: zones as data (declared steps, overlay footprint); one ledger and server-verified are unaffected because the tool runs offline; PASS2 items 1-5 done above.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Licence cite: 'Apache License' is LICENSE line 2, not 3 (NOTICE 2011-2016 correct).
- 'No @Produces anywhere' true only for engine/src; engine-tests (FlatSurfaceHeightProvider.java, WorldBuilderTest.java) use @Produces.
- Missed: WorldBuilder ~241-243 only warns when two providers produce one facet; last producer silently wins.
- Everything else verified (line cites, priorities, layer ordering, seeds, as-data shape, history).

Fixed 2026-10-12: licence line cites (3 -> 2); grep claim narrowed to engine/src with the test-module providers named; added duplicate-producer defect line to section 4 and the 'patched later' list.
