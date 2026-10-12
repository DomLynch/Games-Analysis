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
