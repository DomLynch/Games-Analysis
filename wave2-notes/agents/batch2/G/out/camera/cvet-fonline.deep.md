# cvet-fonline (camera, cell 14)

Donor: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` | Licence: MIT (`/mnt/frankendom-donors/cvet-fonline/LICENSE` line 3 names the copyright; MIT allows adapting code) | C++ | symbol `MapView::ProcessScroll`

Checked: `MapView::ProcessScroll` (2979), `MapView::ScrollToHex` (3200), `MapView::ApplyScrollOffset` (3207), `MapView::ProcessZoom` (3041), `MapView::ChangeZoom` (3031), `MapView::InstantZoom` (3083), `MapView::InstantScroll` (3137) and `MapView::RefreshMinZoom` (3226) were read in full, plus the one follow caller (`Client/Client.cpp` 1476-1477) and the zoom script entry (`Scripting/ClientMapScriptMethods.cpp` 756-768). Confidence high on order of operations. Not read: `GetScrollAxialArea`, the body of `lerp`, the `dt` unit, the default values of `Hex.ScrollSpeed` and `Hex.ZoomSpeed`, the frame order between ProcessScroll and ProcessZoom, and the name of the function enclosing Client.cpp 1477.

## 1. Mechanism

- The camera is one scroll offset plus one zoom, both on the client. Two controllers run per frame, pan and zoom. Both write only through `InstantScroll` and `InstantZoom`, which apply the bounds rules.
- Follow (pan to a target): `ScrollToHex` computes the offset from the current scroll to the target hex (3202), cancels any pan in progress (3203, `_autoScrollActive = false;`), then passes that offset to `ApplyScrollOffset` (3204). `ApplyScrollOffset` starts a new pending buffer if no pan is active (3209-3211) and otherwise adds to the buffer (3216). So a retarget through `ScrollToHex` restarts the pan; only the raw `ApplyScrollOffset` path accumulates.
- Per frame (`ProcessScroll`, automatic branch): step = `speed / 10000 * dt` (2990); a fraction `step` of the owed travel is moved (2991-2992), and that amount is taken off the buffer (2994). The pan ends when the owed distance is under 0.001 (2996-2997). The follow caller in the files read is Client.cpp 1477: `map->ScrollToHex(cr->GetHex(), cr->GetHexOffset(), 100, false);`. It runs only when `cr->GetIsChosen()` (1476), inside the teleport handler that receives a server teleport (the trace name is `teleport_recv`, 1464; the enclosing function name was not read).
- Manual input (2983-2985): a pan started with `can_stop` true is cancelled by arrow input, and a pan with `can_stop` false keeps running. When no pan is running, arrow input drives a manual pan (3005-3025), with step `Hex.ScrollSpeed / 1000 / zoom * dt` (3023). Dividing by zoom keeps the on-screen pan speed constant at any zoom.
- Zoom: `ChangeZoom` stores the anchor and the target (3037-3038). `ProcessZoom` first returns if the zoom already equals the target (3050), then clamps the target to `[min, MAX_ZOOM]` where `min` is the fitted scroll minimum when scroll check is on and `MIN_ZOOM` otherwise (3054-3060). It eases with `lerp(init, target, dt * ZoomSpeed / 10000)` (3067-3070) and snaps when within 0.001 (3072-3074). If the current zoom is outside `[min, max]` it jumps at once (3078-3080).
- Anchored zoom (`InstantZoom` 3083-3134): the view size changes from `screen / zoom`; the scroll moves by minus that change times the anchor (3131-3134). The world point under the anchor stays fixed. The script entry takes the anchor from the mouse position over the screen size, or the screen centre if no mouse is available (ClientMapScriptMethods 764-768).
- Bounds (`InstantScroll` 3137-3168): with scroll check on, the visible rectangle is pushed back inside the scroll area on each axis (lt check 3155-3156, rb check 3161-3162). The buffer then wraps by whole map rows (3170-3197). The wrap is hex-specific and is not part of the port.
- Min zoom (`RefreshMinZoom` 3226-3248): fits the scroll area on each axis with a 1.1 bias (3229-3231), takes the larger, resets to `MIN_ZOOM` if above 1 and not in mapper mode (3233-3237), caps at `MAX_ZOOM` (3239). When scroll check is on, the zoom target is raised to at least this minimum (3245-3247).

## 2. Key functions

- `MapView::ProcessScroll`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 2979-3029. Per-frame ease toward the owed travel, plus the manual branch.
- `MapView::ScrollToHex`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 3200-3205. Cancels the running pan, then starts a new one from the current scroll.
- `MapView::ApplyScrollOffset`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 3207-3217. Starts or extends the owed-travel buffer.
- `MapView::ProcessZoom`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 3041-3081. Clamp, ease, snap, and the out-of-range jump.
- `MapView::InstantZoom`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 3083-3135. Zoom change with the anchor compensation at 3131-3134.
- `MapView::InstantScroll`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 3137-3198. Adds the move, clamps the visible rectangle to the bounds, then wraps by map rows.
- `MapView::RefreshMinZoom`: `/mnt/frankendom-donors/cvet-fonline/Source/Client/MapView.cpp` 3226-3248. Minimum zoom from the scroll area.
- Caller of the follow: `/mnt/frankendom-donors/cvet-fonline/Source/Client/Client.cpp` 1476-1477.
- Script entry for zoom: `/mnt/frankendom-donors/cvet-fonline/Source/Scripting/ClientMapScriptMethods.cpp` 756-769.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Pending-travel ease: each frame move `speed/10000 * dt` of what is still owed; stop under 0.001 | Speed 100 for the local-critter follow (Client.cpp 1477); the 10000 scale (2990); the 0.001 stop (2996) |
| Zoom eases to a clamped target and snaps within 0.001 | `Hex.ZoomSpeed` (3067; default not read); snap 0.001 (3068) |
| Anchored zoom: the scroll absorbs the change in view size times the anchor | Anchor = mouse position over screen size, centre if no mouse (ClientMapScriptMethods 764-766) |
| Pan speed divided by zoom, so on-screen speed stays constant | `Hex.ScrollSpeed / 1000` (3023; default not read) |
| Zoom bounds | `MIN_ZOOM` 0.05 and `MAX_ZOOM` 20.0 (Common.h 402-403) |
| Minimum zoom fits the scroll area with a bias | Bias 1.1 (3229); a fitted minimum above 1 resets to `MIN_ZOOM` (3235-3236) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside each function (pan: owed travel, then bounds; zoom: clamp, ease, snap, anchor compensation, bounds). It omits the manual arrow-key pan branch (3005-3025), the map-row wrap (3170-3197), the view-size and hex-line show/hide and fog rebuild in InstantZoom (3094-3128), the mapper-mode flag (treated as off), and the donor's hex margins on the bounds (`area_l` and the rest, 3150-3153). It treats bounds as plain scroll coordinates. Pan targets are given as scroll points, with the donor's hex offset folded into the target. The sketch applies the pan move before the stop test; the donor tests the stop first (2994-2998) and scrolls after (3028). The result is the same because the move does not change the owed travel. It assumes `lerp(a, b, t) = a + (b - a) * t` and Euclidean `dist()` (both not read). It does not fix the frame order of pan and zoom (not read).

```ts
// Licence: MIT (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface V2 { x: number; y: number }
interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

const ZOOM_MAX = 20;
const ZOOM_FLOOR = 0.05;
const NEAR = 0.001;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t; // assumed form; donor lerp body not read
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

class FightCamera {
  scroll: V2 = { x: 0, y: 0 };      // world point at the top-left of the view
  pending: V2 = { x: 0, y: 0 };     // travel still owed to the current pan
  panning = false;
  panSpeed = 0;
  panCanStop = false;
  zoom = 1;
  zoomTarget = 1;
  zoomAnchor: V2 = { x: 0.5, y: 0.5 };
  zoomSpeed = 0;
  minZoom = ZOOM_FLOOR;
  scrollCheck = true;

  constructor(private screen: V2, private bounds: Bounds) {}

  // Donor ScrollToHex: cancel any pan in progress, then start a new one from the current scroll.
  scrollTo(target: V2, speed: number, canStop: boolean): void {
    this.panning = false;
    this.applyOffset({ x: target.x - this.scroll.x, y: target.y - this.scroll.y }, speed, canStop);
  }

  // Donor ApplyScrollOffset: start a pan if none runs, otherwise add to the travel still owed.
  applyOffset(delta: V2, speed: number, canStop: boolean): void {
    if (!this.panning) {
      this.panning = true;
      this.pending = { x: 0, y: 0 };
    }
    this.panSpeed = speed;
    this.panCanStop = canStop;
    this.pending = { x: this.pending.x + delta.x, y: this.pending.y + delta.y };
  }

  // Donor ProcessScroll (automatic branch): each frame move a fixed share of the owed travel; stop when under 0.001 is owed.
  stepPan(dt: number, manualInput: boolean): void {
    if (manualInput && this.panCanStop) {
      this.panning = false;
    }
    if (!this.panning) {
      return;
    }
    const share = (this.panSpeed / 10000) * dt;
    const step: V2 = { x: lerp(0, this.pending.x, share), y: lerp(0, this.pending.y, share) };
    this.pending = { x: this.pending.x - step.x, y: this.pending.y - step.y };
    this.instantScroll(step);
    if (Math.hypot(this.pending.x, this.pending.y) < NEAR) {
      this.panning = false;
    }
  }

  // Donor ChangeZoom: store the target and the anchor; the easing happens in stepZoom.
  changeZoom(target: number, anchor: V2): void {
    this.zoomAnchor = anchor;
    this.zoomTarget = target;
  }

  // Donor ProcessZoom: clamp the target, ease toward it, snap when within 0.001.
  stepZoom(dt: number): void {
    const init = this.zoom;
    if (near(init, this.zoomTarget)) {
      return;
    }
    const min = this.scrollCheck ? this.minZoom : ZOOM_FLOOR;
    const target = clamp(this.zoomTarget, min, ZOOM_MAX);
    this.zoomTarget = target;
    if (near(init, target)) {
      return;
    }
    if (init >= min && init <= ZOOM_MAX) {
      let next = lerp(init, target, dt * this.zoomSpeed / 10000);
      if (Math.abs(next - target) < NEAR) {
        next = target;
      }
      this.instantZoom(next, this.zoomAnchor);
    } else {
      this.instantZoom(target, this.zoomAnchor);
    }
  }

  // Donor InstantZoom: change the zoom, then move the scroll so the point under the anchor stays put.
  instantZoom(newZoom: number, anchor: V2): void {
    const init = this.zoom;
    this.zoom = newZoom;
    const dw = this.screen.x / newZoom - this.screen.x / init;
    const dh = this.screen.y / newZoom - this.screen.y / init;
    this.instantScroll({ x: -dw * anchor.x, y: -dh * anchor.y });
  }

  // Donor InstantScroll: add the move, then push the visible rectangle back inside the bounds.
  instantScroll(d: V2): void {
    this.scroll = { x: this.scroll.x + d.x, y: this.scroll.y + d.y };
    if (!this.scrollCheck) {
      return;
    }
    const lt = { x: this.scroll.x, y: this.scroll.y };
    const rb = { x: this.scroll.x + this.screen.x / this.zoom, y: this.scroll.y + this.screen.y / this.zoom };
    const b = this.bounds;
    if (lt.x - b.minX < 0) this.scroll.x -= lt.x - b.minX;
    if (lt.y - b.minY < 0) this.scroll.y -= lt.y - b.minY;
    if (rb.x - b.maxX >= 0) this.scroll.x -= rb.x - b.maxX + NEAR;
    if (rb.y - b.maxY >= 0) this.scroll.y -= rb.y - b.maxY + NEAR;
  }

  // Donor RefreshMinZoom: the smallest zoom that still fits the bounds, with a 1.1 bias, capped at ZOOM_MAX.
  refreshMinZoom(): void {
    const b = this.bounds;
    if (b.maxX <= b.minX || b.maxY <= b.minY) {
      this.minZoom = ZOOM_FLOOR;
      return;
    }
    const bias = 1.1;
    let min = Math.max(this.screen.x / (b.maxX - b.minX) * bias, this.screen.y / (b.maxY - b.minY) * bias);
    if (min > 1) {
      min = ZOOM_FLOOR; // donor rule for non-mapper mode; the mapper flag is not modelled here
    }
    this.minZoom = Math.min(min, ZOOM_MAX);
    if (this.scrollCheck) {
      this.zoomTarget = Math.max(this.minZoom, this.zoomTarget);
    }
  }
}
```

## 5. Lands in

- TARGET `src/fight/fight-camera.ts` (new client-only module, not imported by the server): the owed-travel ease, anchored zoom and bounds clamp as pure functions over a camera state. Parity-checklist row 11 (fight camera).
- today: none (new module).
- Reuse tag: rewrite-from-idea (MIT: adaptable; this sketch was still written clean-room from the mechanism)
- Brief rule served: client-only camera (ruling: camera, HUD and sound are client-only); bounds read from zone data (the donor reads them from the map; `GetScrollAxialArea` not read)
- Best transferable idea: keep the camera as a pending-travel ease with an anchored zoom and a bounds clamp, so a fight pan settles smoothly and a zoom keeps the point under the anchor fixed.

## 6. Gaps and risks

- MIT allows adapting, but the sketch is written from the mechanism, not copied.
- The follow target is one point, the chosen critter. A fight camera must frame the hero and up to MAX_ATTACKERS = 3 creatures. The donor frames one point. Multi-target framing was not found in the files opened and was not searched further.
- The donor's two follow entries behave differently. `ScrollToHex` cancels the running pan and restarts (3203); `ApplyScrollOffset` accumulates. Frankendom has to choose one. A restart on every focus change matches a duel's changing target, but it can leave the camera behind during a fast chain.
- The ease constant 10000 depends on the `dt` unit, which was not read. The fight camera must use the same tick clock as the engine step, and the speed must be a data field, not a constant in the function.
- The hex-specific parts do not transfer and are cut: the isometric projection (`GeometryHelper::MakeMapCameraView` in `/mnt/frankendom-donors/cvet-fonline/Source/Common/Geometry.cpp` 672-695, read in passing) and the map-row wrap (3170-3197).
- Client-only: scroll and zoom never reach the server, so no server-verified kill or hit may depend on camera state. The duel step must not read it (one-engine ruling).
- Pit as client: the Pit view can reuse the same module. The server must not import it.
