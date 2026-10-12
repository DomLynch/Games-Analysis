// Licence: GPL-2.0 (donor, sound.cpp header "version 2"). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface View { left: number; width: number; zoom: number; }   // one player's view, world px; zoom index 0..5
interface Rect { left: number; right: number; }                  // event extent along the view's x axis

const MAX_CHANNELS = 8;                              // engine constant: fixed channel pool
const ZOOM_LOUDNESS = [255, 255, 255, 190, 134, 8];  // engine constant: loudness by zoom index (0 = closest)

// Gate + pan + zoom loudness. An event with no overlapping view is silent (no fallback).
// The first matching view wins, so one event plays once.
function spatialGain(views: View[], ev: Rect, trim: number): { gain: number; pan: number } | null {
  for (const v of views) {
    if (!(ev.left < v.left + v.width && ev.right > v.left)) continue;
    const centre = (ev.left + ev.right) / 2 - v.left;
    // Fixed: the event may straddle the view edge, so the centre can fall outside [0, width].
    // The donor passes that raw pan on to the channel gains.
    const pan = Math.min(1, Math.max(0, centre / Math.max(1, v.width)));
    const gain = trim * (ZOOM_LOUDNESS[v.zoom] / 255);
    return { gain, pan };
  }
  return null;
}

// Constant-power pan: left and right gains keep the summed power steady across the stereo field.
function panGains(gain: number, pan: number): { left: number; right: number } {
  const p = Math.min(1, Math.max(0, pan));
  return { left: Math.sin((1 - p) * Math.PI / 2) * gain, right: Math.sin(p * Math.PI / 2) * gain };
}

// Master effect volume setting 0..127, cubic so the slider tracks perceived loudness.
function effectCurve(setting: number): number {
  const s = Math.min(127, Math.max(0, Math.floor(setting)));
  return Math.floor((s * s * s) / (127 * 127));
}

// First free channel of the fixed pool; null means the cue is dropped (donor behaviour, no priority).
function allocateChannel(busy: boolean[]): number | null {
  const i = busy.indexOf(false);
  return i === -1 ? null : i;
}

export {};
