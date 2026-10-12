# jynew-jynew (rendering-performance, cell 17)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/Utils/Helpers/GraphicSetting.cs` | Licence: restricted: the per-file header (line 5) says all code is MIT, but the root `LICENSE` (lines 5-9) says no use of any code or resources is permitted without authorization and commercial use is prohibited; lines 13-17 add community agreements for some folders. Conflicting, so clean-room, shape only | C# (Unity) | symbol `GraphicSetting.Execute`

Checked: Read `GraphicSetting.cs` in full (256 lines). Read `GraphicSettingsHelper.cs` in full (105 lines; the older settings class). Read `GraphicSettingsPanel.cs` 40-60 (`ApplySetting`) and `Jyx2_UIManager.cs` 138-147 (the startup call). Read the root `LICENSE` in full (17 lines). Read `MirrorReflection.cs` 1-130 and grep hits for 155-181 (second mechanism, see section 6). Candidates opened: `GraphicSetting.cs`, `GraphicSettingsHelper.cs`, `GraphicSettingsPanel.cs`, `Jyx2_UIManager.cs`, `MirrorReflection.cs`, `XLua/Src/ObjectPool.cs` (hint file: header only, MIT, a Lua object-index pool, not rendering), `LICENSE`. Grep for batching, culling, LODGroup, GPU instancing and occlusion in the game-owned folders (`Scripts`, `Jyx2UI`, `Jyx2Tools`, `Mods`) found none. Not read: `COMMUNITY_LICENSE_FOR_JYX2` (a folder, not read), the Unity QualitySettings asset (ProjectSettings), the third-party post-processing and water packages (not read). Confidence: high on the tier table and apply order; medium on defect D1 (a C# rule, not run: no .NET or Unity runtime was run on the VPS). camera_scope: n/a (not a camera cell).

## 1. Mechanism

One class holds every graphics setting as a public property with a default, applies them in one call, and saves them to player prefs.

1. Defaults by platform, chosen at compile time in `Awake` (88-113). The phone branch (90-100) sets anti-aliasing off, vsync off, frame cap 60, quality Mid, shader LOD Mid, shadows Disable, shadow show Team. The desktop branch (102-111) sets anti-aliasing on, vsync on, frame cap 200, quality Extreme, shader LOD High, shadows All, shadow show All.
2. Load on first use. The singleton getter (73-86) creates a `[GraphicSetting]` object, keeps it across scenes, and calls `Load` (131-146). `Load` overwrites each public property from player prefs when a key `<class>-<property>` exists.
3. Save (115-129) writes each declared public property as an int, then saves prefs.
4. Apply, `Execute` (148-169), in this order: frame cap `targetFrameRate = MaxFps` (150); quality tier `SetQualityLevel(QualityLevel, true)` (151); max shader LOD `Shader.globalMaximumLOD` (152); shadows (153); `vSyncCount` (154); anti-aliasing last (156), which is 4 samples or off (226). Fog, post, water-normal and shadow-show steps are inside a comment block (157-168), so they do not run.
5. Callers. Startup runs `Execute` after the main menu and the info panel are shown (`Jyx2_UIManager.cs` 146). The settings panel's `ApplySetting` (53-59) calls `Save` then `Execute`.

Enum values used as data: frame caps 30, 60, 120, 200 (`MaxFpsEnum`, 230-236); quality tiers Low=0, Mid, High, Extreme (238-244); shader LOD caps 700, 900, 1000 (`ShaderLodLevelEnum`, 246-251; these are the Unity max-LOD values).

## 2. Key functions

- `GraphicSetting.Awake`: `GraphicSetting.cs` 88-113 (platform defaults; phone branch 90-100, desktop branch 102-111).
- `GraphicSetting.Execute`: `GraphicSetting.cs` 148-169 (apply order; fog, post, water and shadow-show calls commented out at 157-168).
- `GraphicSetting.Load` / `Save`: `GraphicSetting.cs` 131-146 / 115-129 (reflection over public properties; prefs keys `<class>-<property>`).
- `GraphicSetting.ExecuteAntiAliasing`: `GraphicSetting.cs` 224-227.
- Startup call: `Scripts/UI/Framework/Jyx2_UIManager.cs` 146.
- Settings panel: `Scripts/UI/GraphicSettingsPanel.cs` 53-59 (`ApplySetting`).
- Legacy helper (no callers under `Scripts/`): `Scripts/Utils/Helpers/GraphicSettingsHelper.cs` 33-95 (`InitSettings`) and 97-104 (`DoSettings`).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One platform default table, then per-field override from storage | Phone: AA off, vsync off, cap 60, Mid, LOD 900, shadows off (`GraphicSetting.cs` 94-99); desktop: AA on, vsync on, cap 200, Extreme, LOD 1000, shadows all (102-110, see 107-110) |
| Frame cap applied once at boot | `Application.targetFrameRate = (int)MaxFps` (150); values 30/60/120/200 (232-235) |
| Max shader LOD as one global cap | `Shader.globalMaximumLOD` (152); 700 / 900 / 1000 (248-250) |
| Anti-aliasing: 4 samples or off | `QualitySettings.antiAliasing = HasAntiAliasing == 1? 4 : 1;` (226) |
| Vsync on/off | `QualitySettings.vSyncCount = Vsync;` (154) |
| Settings are typed per field, not a string table | Properties with defaults (`GraphicSetting.cs` 24-69) |

## 4. TypeScript sketch

simplified: keeps the donor's platform defaults and its apply order (frame cap, quality tier, shader LOD cap, shadows, vsync, anti-aliasing). It omits Unity's quality-level asset, the fog, post and water-normal toggles (commented out in the donor), and the shadow-show setting (dead in the donor). It replaces reflection-based prefs with one typed JSON record, so an invalid field falls back to the platform default for that field only. It reorders two things: vsync on sets the frame cap to 0 (the donor sets 200 and relies on the engine to ignore it), and apply runs before save (the donor saves first, so a failed save would block the apply).

```ts
// Licence: restricted (donor). Root LICENSE forbids use of code or resources without authorization; the per-file header says MIT. Clean-room: shape only, written from the described mechanism.
// clean-room

export type QualityTier = 'low' | 'mid' | 'high' | 'extreme';
export type ShadowMode = 'off' | 'hard' | 'all';

export interface GraphicSettings {
  tier: QualityTier;
  shaderLod: number; // donor values 700 / 900 / 1000 (a max-LOD cap); 0 = no cap in this sketch
  shadows: ShadowMode;
  aa: boolean;
  vsync: boolean;
  fpsCap: number; // donor values 30 / 60 / 120 / 200; 0 = no cap
}

// Platform defaults as data: phone branch and desktop branch.
export const PHONE_DEFAULTS: GraphicSettings = {
  tier: 'mid', shaderLod: 900, shadows: 'off', aa: false, vsync: false, fpsCap: 60,
};
export const DESKTOP_DEFAULTS: GraphicSettings = {
  tier: 'extreme', shaderLod: 1000, shadows: 'all', aa: true, vsync: true, fpsCap: 200,
};

export interface Engine {
  setFpsCap(fps: number): void;
  setQualityTier(t: QualityTier): void;
  setShaderLodCap(lod: number): void;
  setShadows(m: ShadowMode): void;
  setVsync(on: boolean): void;
  setAntiAliasing(on: boolean): void;
}

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const KEY = 'graphics-v2';
const TIERS: readonly QualityTier[] = ['low', 'mid', 'high', 'extreme'];
const SHADOWS: readonly ShadowMode[] = ['off', 'hard', 'all'];
const FPS: readonly number[] = [0, 30, 60, 120, 200];

// Each field is checked on its own; a bad value falls back to the platform default for that field only.
function sanitize(p: Partial<GraphicSettings>, d: GraphicSettings): GraphicSettings {
  return {
    tier: TIERS.includes(p.tier as QualityTier) ? (p.tier as QualityTier) : d.tier,
    shaderLod: typeof p.shaderLod === 'number' ? p.shaderLod : d.shaderLod,
    shadows: SHADOWS.includes(p.shadows as ShadowMode) ? (p.shadows as ShadowMode) : d.shadows,
    aa: typeof p.aa === 'boolean' ? p.aa : d.aa,
    vsync: typeof p.vsync === 'boolean' ? p.vsync : d.vsync,
    fpsCap: FPS.includes(p.fpsCap as number) ? (p.fpsCap as number) : d.fpsCap,
  };
}

// Never throws: a missing or corrupt record gives the platform defaults.
export function loadSettings(store: KeyValueStore, defaults: GraphicSettings): GraphicSettings {
  try {
    const raw = store.get(KEY);
    if (raw === null) return { ...defaults };
    return sanitize(JSON.parse(raw) as Partial<GraphicSettings>, defaults);
  } catch {
    return { ...defaults };
  }
}

// Typed JSON, enums stored as strings. No numeric cast of enum values.
export function saveSettings(s: GraphicSettings, store: KeyValueStore): boolean {
  try {
    store.set(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

// Donor order: fps cap, quality tier, shader LOD cap, shadows, vsync, anti-aliasing.
// With vsync on, the display refresh is the cap, so the sketch sets the cap to 0 instead of relying on the engine to ignore it.
export function applySettings(s: GraphicSettings, e: Engine): void {
  e.setFpsCap(s.vsync ? 0 : s.fpsCap);
  e.setQualityTier(s.tier);
  e.setShaderLodCap(s.shaderLod);
  e.setShadows(s.shadows);
  e.setVsync(s.vsync);
  e.setAntiAliasing(s.aa);
}

// Apply first, then save: a failed save never blocks the change.
export function applyAndSave(next: GraphicSettings, e: Engine, store: KeyValueStore): boolean {
  applySettings(next, e);
  return saveSettings(next, store);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/rp012-jynew-graphic-tiers.ts) exits 0.

## 5. Lands in

- TARGET `origins/client/quality/graphic-tiers.ts` (new; proposed path, not verified against the Frankendom tree). Client-only: frame cap, quality and anti-aliasing never touch fight state, so server-verified kills and the one ledger are untouched. The phone defaults become the phone frame budget.
- Parity-checklist row 16 (colour grade/quality): the quality tier and frame cap per device class.
- Reuse tag: rewrite-from-idea (restricted licence: clean-room only)
- Brief rule served: client-only quality and frame path (camera, HUD and sound are client-only); rules 7-9 n/a
- Best transferable idea: keep one platform default table for phones and desktop, apply the whole graphics record in one fixed order at boot and on change, and store it as typed data that falls back per field.
Decision (proposed): adapt — the phone default set (cap 60, shadows off, AA off, vsync off) is the frame budget row 16 needs; take the table and one apply path, and drop the reflection persistence and the dead toggles.
Acceptance: on a 375-wide phone, a 30-second fight holds the 60 fps cap with shadows and anti-aliasing off (frame times in the devtools performance panel); a test where the save throws leaves the new tier applied and the old saved record intact; a corrupt saved record loads the phone default without throwing.

## 6. Gaps and risks

- Licence conflict: the file header says MIT; the root `LICENSE` says no use without authorization and bans commercial use. Clean-room only; the sketch is written from the mechanism.
- D1, Save casts enums to int: `GraphicSetting.cs` 124 `var intValue = (int)info.GetValue(this);`. The properties it walks include enum types (`MaxFps`, `QualityLevel`, `ShaderLodLevel`, `ShadowQuality`, `ShadowShowLevel`). In C#, `(int)` on a boxed enum throws InvalidCastException (C# rule; not run). If so, `ApplySetting` (`GraphicSettingsPanel.cs` 57) throws before `Execute` (58), and the panel's change is not applied. Fix: store enums by name or convert by underlying type, and apply before save (sketch `applyAndSave`).
- D2, shadow-show setting does nothing: `ExecuteShadowShowLevel` (171-199) is called from no live path (the call at 168 is commented out), and both of its branches set `ShadowCastingMode.On` (194, 197). Fix: wire it or remove the dropdown.
- D3, water-normal toggle: `ExecuteWaterNormal` (201-222) is not called from `Execute`, and the property doc says it is not implemented (`GraphicSetting.cs` 32). Fix: remove.
- D4, fog and post toggles: their code is commented out (158-160). Fix: remove or wire.
- D5, vsync with a 200 cap on desktop: Unity documents that `targetFrameRate` is ignored while `vSyncCount` is non-zero (general Unity documentation; not checked in this donor). The 200 cap is then probably a no-op on desktop. Fix: with vsync on, cap 0 (sketch).
- D6, two settings systems: `GraphicSettingsHelper` (33, 97) has no caller under `Scripts/`, uses different prefs keys (`config-*`), and defaults the cap to 30 (line 30). Fix: delete the legacy helper; one ledger.
- D7, asymmetric reflection: `Load` walks all properties (135) while `Save` walks declared-only (119). Fix: the same binding flags, or typed records as in the sketch.
- Second mechanism, not written as its own note: `VFX/EffectsPackage/ThirdPartys/MirrorReflection/Scripts/MirrorReflection.cs` (a copy of Unity Pro Standard Assets water per its header, line 14, so restricted). It sets the reflection pass to skip pixel lights (60-62, restored at 101-102), culls the water layer from the reflection camera (84), and renders into a 256 texture by default (`m_TextureSize` at 21, the target created at 164). It re-renders on every camera that sees the water (`OnWillRenderObject`, 37). Relevant to row 16 only if Frankendom adds a mirror or water reflection; the idea (cut the reflection pass by lights and layers) is recorded here, the code is not read end to end.
- Batching and culling: none in the game-owned folders (grep above). The donor has no draw-call budget, no batching and no per-frame cull for characters. A frame budget on phones therefore has to come from the tier table alone.
- Not read: the Unity quality asset, the third-party water and post packages, `COMMUNITY_LICENSE_FOR_JYX2`.
