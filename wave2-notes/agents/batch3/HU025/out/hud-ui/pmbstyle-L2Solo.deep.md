# pmbstyle-L2Solo (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/WorldObserver/public/mapClusters.js` (symbol `clusterProjected`), with `mapViewport.js`, `mapControls.js`, `mapAtlas.js` and the map code in `app.js` (same folder) | Licence: Apache-2.0 (LICENSE line 2: "Version 2.0, January 2004") | JavaScript (browser) | symbol `clusterProjected`

Checked: the hint file `src/WorldObserver/public/index.html` was not read (the page shell; the map code is elsewhere). Read in full: mapClusters.js (55 lines), mapViewport.js (37), mapControls.js (129), mapAtlas.js (30), uiLanguage.js (134). Read in part, by line range: app.js 13, 455-500, 462-482, 555-580, 2081-2170, 2205-2220, 2253-2300, 2330-2375 (part), 3310-3320, 3978-4035 (wheel, drag). LICENSE line 2. Grep only: RadarControl.js and QuestService.js (radar packets), PartyMemberPosition.js (a comment). Confidence: high on the map view, clustering, zoom anchor, drag pan and Follow; medium on the marker render details (single points and the cluster badge were read only in part). Not read: the rest of app.js (4099 lines overall), the clamp() helper definition used by app.js, the snapshot feed (worldState.js), the server side of the world map data, touch-specific code (none seen in the ranges read), health and target frames (none in this donor's HUD files read). This is a spectator web map of a Lineage 2 C4 server emulator, not the game client; it is read as a map view.

Best transferable idea: a zone map that groups nearby markers on a fixed screen-pixel grid into badges (mean position, bigger badges for bigger groups, only what is in view plus a margin), zooms about the cursor, and turns Follow off on a manual pan.
Decision (proposed): adapt — cluster-by-screen-grid and the anchored zoom suit a zone map with many enemies or players; the donor's tile atlas and map-unit scheme are not used, and zone bounds come from zone data.
Acceptance: on a 375-wide phone, a zoomed-out zone map shows 40 enemies that sit in one 58 px area as one badge reading 40 at their mean point; tapping the badge zooms to its members; the wheel (or pinch, to be added) keeps the point under the cursor fixed while not at the zone edge (unit test: zoomAt keeps the focus fraction); dragging the map turns Follow off.

## 1. Mechanism

- A zone map in map units, drawn into a rectangle. Four layers: a view rectangle, a scale from view to screen, a set of markers grouped in screen space, and a Follow mode that centres on one actor.
- Order of steps:
  (a) Projection: a world location becomes map px as `(locX / blockSize + mid - min) x blockPx`, with blockSize 32768 and blockPx 900 (mapAtlas.js 17, 23-28). `project` in app.js clamps the result to an 18 px inset (497-498).
  (b) View: `{x, y, width, height}` in map px. Clamped to the map (clampViewport, app.js 462-474): width and height at least 240 and 170, and the view never leaves the map.
  (c) Screen mapping: `scale = min(rect.w / view.w, rect.h / view.h)` (mapViewport.js 7). The content is centred and the gutters show map content, so culling uses the enlarged visible rect (mapViewport.js 8-20; mapControls.js 15 uses `1 / scale` for marker units).
  (d) Wheel zoom (app.js 3990-4002): the factor is `exp(clamp(delta, -100, 100) x 0.002)` (3996), applied to width and height. The focus is the map point under the cursor; its fraction across the view is kept (`focusRatioX`, 3999-4002), so the point stays under the cursor until the zone edge clamps the view.
  (e) Drag pan (4009-4026): pointerdown captures the pointer and stores the start view; each move divides the screen offset by the start view's scale and applies it to the start view (no accumulation between moves). Pointerdown on the map also turns Follow off (mapControls.js 122).
  (f) Follow (mapControls.js 89-98, 113-118; `updateFollow` is called from `renderActorUpdates`, app.js 3316): centre on the selected actor's anchor, width `min(view.w, 2200)`, height from the rect aspect (aspect at least 0.5).
  (g) Destinations (mapControls.js 70-87): a town or dungeon sets a fixed 2800 map px height, centred, and turns Follow off.
  (h) Grouping (app.js 2123-2140, mapClusters.js 18-52): items outside the visible view plus a margin are dropped (72 screen px, app.js 2131). The rest go into cells of `floor(point / cell)`, with cell = 58 screen px (2104). A cell's point is the mean of its members. Clusters are sorted by size ascending, so the biggest badges are drawn last and sit on top (mapClusters.js 51; forEach at app.js 2263).
  (i) Drawing (app.js 2205-2208, 2263): one member is a point; more are a badge with radius `clamp(12 + 1.05 x log2(n), 14, 21)` screen px. Colour: any PK member gives the PK colour, one phase gives that colour, mixed phases give the mixed colour (2143-2147).
  (j) Labels (2086-2088): shown only when the view is narrower than 10000 map px; font size `clamp(width / 55, 44, 135)`.
  (k) Render coalescing: each state change calls the same scheduler; at most one pending frame (mapViewport.js 24-34; app.js 13).
  (l) Preferences (view, label and raid toggles, filters) live in sessionStorage behind try/catch (mapControls.js 24, 44-46): per-viewer convenience only.
- Tick: no game tick. Drawing is event-driven (state changes, actor updates, resize) and coalesced to one frame. Wheel and drag act on the pointer events directly.

## 2. Key functions

- `clusterProjected`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/WorldObserver/public/mapClusters.js` 18-52. Viewport and margin culling, grid keys, mean point, size sort.
- `metrics` and `frameRenderer`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/WorldObserver/public/mapViewport.js` 6-34. The fit scale with gutters, and one-frame coalescing.
- `create` (mapControls): `/mnt/frankendom-donors/pmbstyle-L2Solo/src/WorldObserver/public/mapControls.js` 2-127. Destination focus (70-87), Follow (89-98, 113-118), manual pan turns Follow off (122).
- `clusterActors`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/WorldObserver/public/app.js` 2123-2140. Cell 58 px and margin 72 px in screen units.
- `renderCluster`: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/WorldObserver/public/app.js` 2205-2208 (radius; read in part).
- Wheel and drag handlers: `/mnt/frankendom-donors/pmbstyle-L2Solo/src/WorldObserver/public/app.js` 3990-4035.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Grid clustering with a screen-pixel cell, culled to view plus margin | Cell 58 px (app.js 2104); margin 72 px (2131) |
| Badge radius grows with the log of the group size | 12 + 1.05 x log2(n), clamped to 14-21 px (2206) |
| Zoom factor per wheel delta, clamped | exp(clamp(delta, -100, 100) x 0.002) (3996) |
| Viewport limits | Min 240 x 170 map px (464-465); map block 900 px, 32768 world units (mapAtlas.js 17) |
| Follow width cap | 2200 map px (mapControls.js 96); destination height 2800 (78) |
| Constant screen size for markers | units = 1 / scale (mapControls.js 15; app.js 2107-2108) |
| Label size from width | clamp(width / 55, 44, 135) and hidden at 10000+ (app.js 2087-2088) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for clamp, zoom, drag, Follow and grouping, and the badge radius formula. It replaces the donor's map-unit atlas (tiles, blocks, hidden ranges) with plain view and zone bounds. It uses its own clamp helper (the donor's clamp in app.js was not read) and does not model the 18 px projection inset. It omits the wheel `deltaMode` conversion, the SVG and DOM work, the drag start and stop events, the PK and phase colours, the labels, the sessionStorage preferences, and the destination picker. The grouping drops the donor's `null` viewport case (the donor returns all points when no view is given), and uses floats throughout.

```ts
// Licence: Apache-2.0 (donor LICENSE, Version 2.0). Adapted shape, rewritten in TypeScript for Frankendom.
// Client-only map view: zone bounds come from zone data; the engine never reads the view.

export interface Pt { x: number; y: number; }
export interface MapView { x: number; y: number; width: number; height: number; } // map units
export interface MapBounds { width: number; height: number; }                    // zone size, map units

// Own helper (the donor's clamp() was not read): keeps the view inside the zone and above a minimum size.
function clampTo(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// Mirror of the donor clampViewport (app.js 462-474): min 240 x 170 map px, never outside the zone.
export function clampView(v: MapView, b: MapBounds, minW = 240, minH = 170): MapView {
  const width = clampTo(v.width, minW, b.width);
  const height = clampTo(v.height, minH, b.height);
  return {
    x: clampTo(v.x, 0, Math.max(0, b.width - width)),
    y: clampTo(v.y, 0, Math.max(0, b.height - height)),
    width,
    height,
  };
}

// Meet-fit scale of a view in a rectangle (donor mapViewport.js 7). Screen px per map unit.
export function fitScale(view: MapView, rectW: number, rectH: number): number {
  return Math.max(0.0001, Math.min(rectW / view.width, rectH / view.height));
}

// Wheel zoom anchored at the cursor. deltaPx is the wheel delta in px (donor: exp(clamp(delta, -100, 100) * 0.002)).
export function zoomAt(v: MapView, focus: Pt, deltaPx: number, b: MapBounds): MapView {
  const k = Math.exp(clampTo(deltaPx, -100, 100) * 0.002);
  const width = v.width * k;
  const height = v.height * k;
  const rx = (focus.x - v.x) / v.width; // same fraction before and after, so the focus point stays put
  const ry = (focus.y - v.y) / v.height;
  return clampView({ x: focus.x - width * rx, y: focus.y - height * ry, width, height }, b);
}

// Drag pan from the drag-start snapshot (donor app.js 4024-4026): no drift between move events.
export function panFrom(start: MapView, startPx: Pt, nowPx: Pt, scale: number, b: MapBounds): MapView {
  const dx = (nowPx.x - startPx.x) / scale;
  const dy = (nowPx.y - startPx.y) / scale;
  return clampView({ ...start, x: start.x - dx, y: start.y - dy }, b);
}

// Follow view centred on an anchor. Width capped at 2200 map units (donor mapControls.js 96).
export function followView(anchor: Pt, viewW: number, rectW: number, rectH: number, b: MapBounds, maxW = 2200): MapView {
  const aspect = Math.max(0.5, rectW / Math.max(1, rectH));
  const width = Math.min(viewW, maxW);
  const height = width / aspect;
  return clampView({ x: anchor.x - width / 2, y: anchor.y - height / 2, width, height }, b);
}

export interface Item<T> { item: T; point: Pt; }
export interface Cluster<T> { members: Item<T>[]; point: Pt; size: number; }

// Grid clustering in map units (donor mapClusters.js). cell and margin are screen px divided by the scale.
// Cells are keyed by floor(point / cell); the cluster point is the mean of its members; small clusters first.
export function cluster<T>(items: Item<T>[], cell: number, view: MapView, margin: number): Cluster<T>[] {
  const size = Math.max(1, cell);
  const cells = new Map<string, { members: Item<T>[]; sx: number; sy: number }>();
  for (const it of items) {
    const p = it.point;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    if (p.x < view.x - margin || p.x > view.x + view.width + margin) continue;
    if (p.y < view.y - margin || p.y > view.y + view.height + margin) continue;
    const key = `${Math.floor(p.x / size)}:${Math.floor(p.y / size)}`;
    let c = cells.get(key);
    if (!c) {
      c = { members: [], sx: 0, sy: 0 };
      cells.set(key, c);
    }
    c.members.push(it);
    c.sx += p.x;
    c.sy += p.y;
  }
  return [...cells.values()]
    .map((c) => ({
      members: c.members,
      point: { x: c.sx / c.members.length, y: c.sy / c.members.length },
      size: c.members.length,
    }))
    .sort((a, b) => a.size - b.size);
}

// Badge radius in screen px for a cluster of n (donor app.js 2206: clamp(12 + log2(n) * 1.05, 14, 21)).
export function clusterRadiusPx(n: number): number {
  return clampTo(12 + Math.log2(n) * 1.05, 14, 21);
}
```

## 5. Lands in

- TARGET `src/fight/map-view.ts` (new, client-only map and minimap view: zone bounds from zone data, markers from the engine's positions). Parity-checklist row 14 (HUD).
- Reuse tag: adapt (Apache-2.0: code may be adapted; the sketch is a rewrite and does not use the donor's tiles)
- Brief rule served: addendum rule 2 (judge the idea, not the genre); rulings that HUD is client-only and zones are data

## 6. Gaps and risks

- Grid-edge artefact (design limit of grid clustering, not a bug in the donor): two markers 1 px apart across a cell boundary stay separate, and two markers 57 px apart in one cell merge. Fix option (not in the donor): a second pass that merges badges closer than one cell.
- Zoom anchor breaks at the zone edge: `clampView` moves the view when the zoom would leave the zone, so the point under the cursor is no longer fixed there. The sketch keeps this behaviour; it is expected, but a test should cover it.
- Follow and drag: the donor turns Follow off on any pointerdown on the map (mapControls.js 122), and point badges stop propagation of pointerdown (app.js 2154-2157), so a tap on a badge does not break Follow. Frankendom should copy the pattern, not the handler order (not tested).
- Localisation string table (read as data): `uiLanguage.js` holds 91 English labels in six groups: status 13, type 4, plan 8, reason 36, event 26, strategy 4 (counted from the file, lines 6-110). It is English only; there is no locale switch. Grammar: keys are machine codes (snake_case, grouped by feature prefix such as clan_craft_ or player_order_), values are short sentence-case English labels with no placeholders. `label(group, value)` looks up the table (line 130), then `humanize` (112-125), which splits underscores, hyphens and camelCase into words, keeps all-caps tokens, and sentence-cases the result, then falls back to a dash for empty input. Frankendom gap: a code-to-label fallback means a new server code shows readable text before its label exists; the table itself is per-language work not done here.
- Tiles: `mapAtlas.js` takes its tiles from a third-party repo (metadata source, line 15). Their licence was not read. Do not copy tiles; use zone art from Frankendom's own assets.
- Not read: health and target frames (no HUD status code read in this donor; the Response folder has packet builders, not read beyond names); touch UX (only pointer events are read in app.js 4009-4035); input buffer and lock-on (not read); the radar packets (RadarControl.js and QuestService.js, grep only: an arming packet, then a visible one) and PartyMemberPosition.js (a comment says it sends a complete party snapshot, not a delta). The snapshot-versus-delta choice for the minimap party dots is a candidate for a later note.
- Frankendom gap: map state (view, filters) is per viewer in sessionStorage; Frankendom should keep it client-only and never let it change server state.

Reuse tag: adapt (Apache-2.0)
Brief rule served: addendum rule 2; HUD client-only ruling; zones as data
