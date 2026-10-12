// Licence: BSD-3-Clause (donor, evennia LICENSE.txt). Re-expressed here as a clean sketch of the mechanism (not a line translation).
// clean-room
type Builder = (x: number, y: number, pass: number, cells: Map<string, Room | null>) => Room | null;

interface Room {
  id: string;
  kind: string;
  exits: Record<string, string>; // direction -> neighbour id
}

const key = (x: number, y: number): string => `${x},${y}`;

// The donor's legend keys are sometimes tuples such as ("♣", "♠"), which never equal a single character.
// Here every key must be exactly one character; anything else is rejected at load time.
function validateLegend(legend: Record<string, Builder>): void {
  for (const k of Object.keys(legend)) {
    if ([...k].length !== 1) throw new Error(`legend key must be one character: "${k}"`);
  }
}

// Scan rows in order. Pass 0 creates rooms; later passes can wire roads between rooms that already exist.
// Characters with no legend entry (spaces, water) are skipped.
function buildLayout(rows: string[], legend: Record<string, Builder>, passes: number, autoExits: boolean): Map<string, Room> {
  validateLegend(legend);
  const cells = new Map<string, Room | null>();
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const build = legend[rows[y][x]];
        if (build === undefined) continue;
        const room = build(x, y, pass, cells);
        if (pass === 0) cells.set(key(x, y), room);
      }
    }
  }

  // Automatic N/E/S/W exits between adjacent rooms; each room lists its own neighbours, so links are two-way.
  const rooms = new Map<string, Room>();
  for (const [k, room] of cells) {
    if (room) rooms.set(k, room);
  }
  if (autoExits) {
    const steps: [string, number, number][] = [["north", 0, -1], ["east", 1, 0], ["south", 0, 1], ["west", -1, 0]];
    for (const [k, room] of rooms) {
      const [sx, sy] = k.split(",").map(Number);
      for (const [dir, dx, dy] of steps) {
        const neighbour = rooms.get(key(sx + dx, sy + dy));
        if (neighbour) room.exits[dir] = neighbour.id;
      }
    }
  }
  return rooms;
}

export {};
