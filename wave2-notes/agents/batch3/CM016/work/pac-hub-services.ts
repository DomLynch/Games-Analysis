// clean-room sketch from the described mechanism (donor licence: GPL-3.0; shape only, no lines copied).
export {};

type Service = string;
type Weights = Record<Service, number>;

interface HubRules {
  stageWeights: Record<number, Weights>; // stage -> chance per service; the weights sum to at most 1, the rest is "no service"
  festival: boolean;                     // festival rule: always pick a service, repeats allowed
  portalStages: number[];                // stages that use the portal layout (donor: [0, 10, 20])
}

interface HubState {
  used: Set<Service>; // services already placed this game
}

// Weighted pick against a total. Returns null when the roll falls past every weight.
function pickWeighted(weights: Weights, total: number, rnd: () => number): Service | null {
  let r = rnd() * total;
  for (const [item, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return item;
  }
  return null;
}

// One service per stage. A repeat in the same game drops the slot; it is not re-rolled.
function placeService(stage: number, rules: HubRules, hub: HubState, rnd: () => number): Service | null {
  const weights = rules.stageWeights[stage];
  if (!weights) return null;
  const total = rules.festival ? Object.values(weights).reduce((a, b) => a + b, 0) : 1;
  let s = pickWeighted(weights, total, rnd);
  if (s !== null && !rules.festival && hub.used.has(s)) s = null; // no repeat in one game
  if (s !== null) hub.used.add(s);
  return s;
}

// Release delay for one player. Rank 1 = highest life, so a higher-ranked player waits longer.
function releaseDelayMs(
  stage: number,
  rules: HubRules,
  hasService: boolean,
  aliveCount: number,
  rank: number,
  isBot: boolean,
  rnd: () => number
): number {
  let delay = (hasService ? 10000 : 5000) + (aliveCount - rank) * 2000;
  if (stage === 0) {
    delay = 12000;
  } else if (rules.portalStages.includes(stage)) {
    delay = 8000;
  } else if (stage < 5) {
    delay = hasService ? 10000 : 5000;
  }
  if (isBot) delay += 1000 + rnd() * 5000;
  return delay;
}

// Players start on an ellipse around the hub centre (300 by 250 in the donor).
function startPosition(i: number, n: number, cx: number, cy: number): { x: number; y: number } {
  const a = (2 * Math.PI * i) / n;
  return { x: cx + Math.cos(a) * 300, y: cy + Math.sin(a) * 250 };
}
