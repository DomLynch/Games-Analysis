// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Band = { above: number; colour: 'green' | 'flash' | 'red' }; // first band with value > above wins; no band matched = hidden
type XAnchor = 'left' | 'centre' | 'right';
type YAnchor = 'top' | 'bottom';

interface PanelBase {
  name: string;
  xa: XAnchor; dx: number;   // offset from the anchor, in virtual px
  ya: YAnchor; dy: number;
  stat: string;              // which stat drives the panel
  gateStat?: string;         // panel shows only while this stat is non-zero
}
interface NumberPanel extends PanelBase { kind: 'number'; digits: number; bands: Band[]; flashBit?: number; }
interface IconPanel extends PanelBase { kind: 'icon'; }
type Panel = NumberPanel | IconPanel;

interface Snapshot { stats: Record<string, number>; flashes: number; serverFrame: number; }
type Colour = 'green' | 'red';
type DrawOp =
  | { name: string; x: number; y: number; kind: 'number'; text: string; colour: Colour; plate: boolean }
  | { name: string; x: number; y: number; kind: 'icon'; icon: number };

const VIRTUAL_W = 320; // the status bar is laid out on a 320-wide canvas, centred in the viewport
const FLASH_HEALTH = 1;
const FLASH_ARMOUR = 2;
const FLASH_AMMO = 4;

function anchorX(a: XAnchor, dx: number, viewW: number): number {
  if (a === 'left') return dx;
  if (a === 'right') return viewW + dx;
  return viewW / 2 - VIRTUAL_W / 2 + dx;
}

function anchorY(a: YAnchor, dy: number, viewH: number): number {
  return a === 'top' ? dy : viewH + dy;
}

// Number text in a field `digits` wide. Over-range values clamp to all 9s; they never drop the low digits.
function fieldText(value: number, digits: number): string {
  const max = 10 ** digits - 1;
  if (value > max) return '9'.repeat(digits);
  if (value < -max) return '-' + '9'.repeat(digits - 1);
  return String(value).padStart(digits, ' ');
}

// 'flash' alternates between green and red every 4 server frames.
function resolveColour(band: 'green' | 'flash' | 'red', serverFrame: number): Colour {
  if (band === 'flash') return ((serverFrame >> 2) & 1) === 1 ? 'red' : 'green';
  return band;
}

// Pure: one draw list per frame from the panel data and the snapshot.
function layoutFrame(panels: Panel[], snap: Snapshot, viewW: number, viewH: number): DrawOp[] {
  const ops: DrawOp[] = [];
  for (const p of panels) {
    if (p.gateStat !== undefined && (snap.stats[p.gateStat] ?? 0) === 0) continue;
    const x = anchorX(p.xa, p.dx, viewW);
    const y = anchorY(p.ya, p.dy, viewH);
    const value = snap.stats[p.stat] ?? 0;
    if (p.kind === 'icon') {
      if (value !== 0) ops.push({ name: p.name, x, y, kind: 'icon', icon: value });
      continue;
    }
    const band = p.bands.find(b => value > b.above);
    if (band === undefined) continue;
    ops.push({
      name: p.name, x, y, kind: 'number',
      text: fieldText(value, p.digits),
      colour: resolveColour(band.colour, snap.serverFrame),
      plate: p.flashBit !== undefined && (snap.flashes & p.flashBit) !== 0,
    });
  }
  return ops;
}

// Engine side: flash bits are set per tick. Fix: bit 4 (ammo) is set when the ammo count drops.
function flashBits(hitHealthThisTick: boolean, hitArmourThisTick: boolean, ammoDropped: boolean): number {
  return (hitHealthThisTick ? FLASH_HEALTH : 0) | (hitArmourThisTick ? FLASH_ARMOUR : 0) | (ammoDropped ? FLASH_AMMO : 0);
}

// Data, not code: the single-player status row as three number panels on the bottom-left of the 320 canvas.
const statusRow: Panel[] = [
  {
    name: 'health', kind: 'number', xa: 'left', dx: 0, ya: 'bottom', dy: -24, stat: 'health', digits: 3,
    bands: [{ above: 25, colour: 'green' }, { above: 0, colour: 'flash' }, { above: -Infinity, colour: 'red' }],
    flashBit: FLASH_HEALTH,
  },
  {
    name: 'ammo', kind: 'number', xa: 'left', dx: 100, ya: 'bottom', dy: -24, stat: 'ammo', digits: 3, gateStat: 'ammoIcon',
    bands: [{ above: 5, colour: 'green' }, { above: -1, colour: 'flash' }],
    flashBit: FLASH_AMMO,
  },
  {
    name: 'armour', kind: 'number', xa: 'left', dx: 200, ya: 'bottom', dy: -24, stat: 'armour', digits: 3, gateStat: 'armourIcon',
    bands: [{ above: 0, colour: 'green' }],
    flashBit: FLASH_ARMOUR,
  },
];

export {};
