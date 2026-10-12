// Licence: MIT (2004Scape-Server, Lost City). Clean-room sketch written from the described mechanism.
type InputClass = 'user' | 'client' | 'restricted';

// Per-tick budgets. Donor values: user 5, client 20, restricted 2.
const TICK_BUDGET: Record<InputClass, number> = { user: 5, client: 20, restricted: 2 };

interface Inbound {
  cls: InputClass;
  bound: boolean;      // false = no decoder registered for this opcode
  handle(): boolean;   // false = the server rejected the request
}

// Handle at most TICK_BUDGET messages per class this tick. Leftover messages stay queued for the next tick.
// Every message spends budget in its own class, rejected or not.
function drainInputs(queue: Inbound[]): { handled: number; rejected: number } {
  const used: Record<InputClass, number> = { user: 0, client: 0, restricted: 0 };
  const underBudget = (): boolean =>
    (Object.keys(TICK_BUDGET) as InputClass[]).every((c) => used[c] < TICK_BUDGET[c]);
  let handled = 0;
  let rejected = 0;

  while (queue.length > 0 && underBudget()) {
    const msg = queue.shift() as Inbound;
    used[msg.cls] += 1; // spend the budget before handling, so a rejected message still counts
    if (!msg.bound) continue;
    if (msg.handle()) handled += 1;
    else rejected += 1;
  }
  return { handled, rejected };
}

interface LocOp { x: number; z: number; locId: number; op: number; }
interface LocDef { ops: ReadonlyArray<string | null>; }
interface SceneView {
  originX: number; // set when the client's build area is (re)sent
  originZ: number;
  locAt(x: number, z: number, locId: number): LocDef | undefined;
}

const SCENE_HALF_WINDOW = 52; // donor hardcodes 52 (the loaded build area is 104 tiles wide)

type OpCheck = { ok: true; def: LocDef } | { ok: false; reason: string };

// Checks in donor order: scene window, then the loc exists on that tile, then the op slot exists.
function checkLocOp(req: LocOp, scene: SceneView): OpCheck {
  const inWindow =
    req.x >= scene.originX - SCENE_HALF_WINDOW && req.x <= scene.originX + SCENE_HALF_WINDOW &&
    req.z >= scene.originZ - SCENE_HALF_WINDOW && req.z <= scene.originZ + SCENE_HALF_WINDOW;
  if (!inWindow) return { ok: false, reason: 'outside scene window' };

  const def = scene.locAt(req.x, req.z, req.locId);
  if (def === undefined) return { ok: false, reason: 'no such loc on tile' };

  if (!def.ops[req.op - 1]) return { ok: false, reason: 'loc has no such op' };
  return { ok: true, def };
}

// Button clicks are accepted only for a component under an open root (modal, chat, side, tab or tutorial).
function buttonAllowed(componentRoot: number | undefined, openRoots: ReadonlySet<number>): boolean {
  return componentRoot !== undefined && openRoots.has(componentRoot);
}

export {};
