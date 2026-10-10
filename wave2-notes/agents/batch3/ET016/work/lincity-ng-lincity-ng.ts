// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// One good, one hub, one partner, one tick. Fill ratios are fixed-point: 1000 means 100 percent.
const QUANTA = 1000;
const RATE_DIVISOR = 8; // one transfer may not exceed the sender's max load divided by 8

interface Rule { max: number; give: boolean; take: boolean; }
interface Holder { count: number; rule: Rule; evacuating: boolean; }

// Moves stock of one good between `partner` and `hub`, pulling the partner toward `targetRatio`.
// Returns the units moved (>= 0). Conservation: the partner gains exactly what the hub loses.
function equaliseOnce(partner: Holder, hub: Holder, targetRatio: number): number {
  let flow: number;
  if (partner.evacuating) {
    flow = -(hub.rule.max - hub.count);            // partner pushes into the hub's headroom
    if (-flow > partner.count) flow = -partner.count;
  } else {
    flow = Math.floor((targetRatio * partner.rule.max) / QUANTA) - partner.count;
    const allowed = flow > 0
      ? partner.rule.take && hub.rule.give
      : partner.rule.give && hub.rule.take;
    if (!allowed) return 0;
    if (flow > 0) {
      if (flow * RATE_DIVISOR > hub.rule.max) flow = Math.floor(hub.rule.max / RATE_DIVISOR);
      if (flow > hub.count) flow = hub.count;
    } else if (flow < 0) {
      if (-flow * RATE_DIVISOR > hub.rule.max) flow = -Math.floor(hub.rule.max / RATE_DIVISOR);
      if (-flow > hub.rule.max - hub.count) flow = -(hub.rule.max - hub.count);
      if (flow > 0) flow = 0;
    }
  }
  partner.count += flow;
  hub.count -= flow;
  return Math.abs(flow);
}

export {};
