// Licence: MIT (donor, KsanaDock-Microverse). Adapted shape, written fresh from the described rule.
interface Task {
  id: number;
  priority: number;     // 1 (low) to 10 (high)
  completed: boolean;
  createdAt: number;    // seconds
}

interface Board {
  tasks: Task[];
  lastRefresh: number;  // seconds; 0 means never refreshed
  nextId: number;
}

const DAY_S = 86400;

// Daily refresh: keep the open tasks, sort them by priority (high first), top the board up
// to the minimum with new random tasks, then stamp the clock. Completed tasks are dropped.
function refreshBoard(board: Board, now: number, minOpen: number, rng: () => number): boolean {
  if (now - board.lastRefresh < DAY_S) return false;

  const open = board.tasks.filter((t) => !t.completed);
  open.sort((a, b) => b.priority - a.priority);
  while (open.length < minOpen) {
    open.push({
      id: board.nextId,
      priority: Math.floor(rng() * 10) + 1,
      completed: false,
      createdAt: now,
    });
    board.nextId += 1;
  }

  board.tasks = open;
  board.lastRefresh = now;
  return true;
}

// The task to work on now: the highest-priority open task.
function currentTask(board: Board): Task | undefined {
  let best: Task | undefined;
  for (const t of board.tasks) {
    if (t.completed) continue;
    if (best === undefined || t.priority > best.priority) best = t;
  }
  return best;
}

// Mark one open task done. Returns false if it is not open on this board.
function completeTask(board: Board, id: number): boolean {
  const t = board.tasks.find((x) => x.id === id && !x.completed);
  if (t === undefined) return false;
  t.completed = true;
  return true;
}
