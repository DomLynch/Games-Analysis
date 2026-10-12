// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface AttachEntry {
  script: string;      // script id
  attach: boolean;     // true = attach; false = detach (removes what an earlier layer attached)
  data?: string;       // per-entry init data; falls back to the script default
}

export interface AttachConfig {
  byType: Record<string, AttachEntry[]>;      // row type -> scripts (type layer: attach only)
  byRow: Record<string, AttachEntry[]>;       // row id -> attach or detach
  byInstance: Record<string, AttachEntry[]>;  // spawn instance id -> attach or detach
}

// Layers are applied in order: type, then row, then instance. A later detach removes
// the script for that instance only; a later attach replaces the data.
export function resolveAttachments(
  type: string,
  rowId: string,
  instanceId: string | undefined,
  cfg: AttachConfig,
  defaults: Record<string, string>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of cfg.byType[type] ?? []) {
    out.set(e.script, e.data ?? defaults[e.script] ?? "");
  }
  const layers: AttachEntry[][] = [cfg.byRow[rowId] ?? []];
  if (instanceId !== undefined) layers.push(cfg.byInstance[instanceId] ?? []);
  for (const layer of layers) {
    for (const e of layer) {
      if (e.attach) out.set(e.script, e.data ?? defaults[e.script] ?? "");
      else out.delete(e.script);
    }
  }
  return out;
}

export {};
