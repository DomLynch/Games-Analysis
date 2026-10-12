// Licence: Sustainable Use License 1.0 (donor, non-commercial use only). Clean-room sketch of the shape, not a translation.

export {};

type TownerType = 'smith' | 'healer' | 'tavern' | 'witch' | 'cow';

interface PlacementRow {               // one row of the data table, in file order
  type: TownerType;
  name: string;
  x: number;
  y: number;
  gossip: string[];
}

interface PlacedTowner {
  index: number;
  type: TownerType;
  name: string;
  x: number;
  y: number;
  gossip: string;
}

interface Hub {
  placed: PlacedTowner[];
  occupant: Map<string, number>;       // "x,y" -> placed index + 1 (claim)
}

// Place hub services in table order. A row is skipped when its presence gate is closed
// or the engine has no behaviour for its type. The tile is claimed before the towner is
// created, so later steps (for example a multi-tile animal filling its neighbours) can see it.
function placeHubServices(
  rows: PlacementRow[],
  isPresent: (type: TownerType) => boolean,
  hasBehaviour: (type: TownerType) => boolean,
  pickIndex: (n: number) => number,    // seeded draw, so every client agrees
): Hub {
  const hub: Hub = { placed: [], occupant: new Map<string, number>() };
  for (const row of rows) {
    if (!isPresent(row.type)) continue;
    if (!hasBehaviour(row.type)) continue;
    const key = `${row.x},${row.y}`;
    const index = hub.placed.length;
    hub.occupant.set(key, index + 1);
    const gossip = row.gossip.length > 0 ? row.gossip[pickIndex(row.gossip.length)] : '';
    hub.placed.push({ index, type: row.type, name: row.name, x: row.x, y: row.y, gossip });
  }
  return hub;
}
