// Licence: GPL-2.0-or-later (donor, source/ps/Loader.cpp header). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
// A task returns 0 when finished, a percent 1..100 when it stopped at its slice end, or a negative code on error.
interface LoadTask {
  description: string;
  estimatedMs: number;                       // registered estimate, used for admission and progress
  run(sliceEndsAt: number): number;          // must stop by sliceEndsAt and keep its own state between calls
}

interface LoaderState {
  queue: LoadTask[];
  tallyMs: number;                           // estimated time of finished tasks
  totalMs: number;                           // sum of all registered estimates
  firstCall: boolean;                        // the first slice after registration does no work
  active: boolean;
}

interface SliceReport {
  done: boolean;
  progress: number;                          // 0..1, monotonic
  nextDescription: string;
  error?: number;
}

// Admit the next task only if it is expected to end within 20 percent over the budget.
// The first task of a slice is always admitted, so every slice makes progress.
function admit(timeLeftMs: number, budgetMs: number, estimateMs: number, startedThisSlice: boolean): boolean {
  if (timeLeftMs <= 0) return false;
  if (!startedThisSlice) return true;
  return timeLeftMs + estimateMs <= budgetMs * 1.2;
}

function report(st: LoaderState, progress: number, done: boolean, error?: number): SliceReport {
  const next = st.queue.length > 0 ? st.queue[0].description : "";
  return error === undefined ? { done, progress, nextDescription: next } : { done, progress, nextDescription: next, error };
}

function progressiveLoad(st: LoaderState, budgetMs: number, clock: () => number): SliceReport {
  if (st.firstCall) {
    st.firstCall = false;                    // let one frame draw before the first slice
    return report(st, 0, false);
  }
  if (!st.active) return report(st, 1, true);

  const sliceEndsAt = clock() + budgetMs;
  let startedThisSlice = false;
  let progress = st.totalMs > 0 ? st.tallyMs / st.totalMs : 0;

  while (st.queue.length > 0) {
    const task = st.queue[0];
    const timeLeft = sliceEndsAt - clock();
    if (!admit(timeLeft, budgetMs, task.estimatedMs, startedThisSlice)) break;
    startedThisSlice = true;

    const status = task.run(sliceEndsAt);
    const interrupted = status > 0 && status <= 100;

    if (!interrupted) {                      // finished or failed: leave the queue
      st.queue.shift();
      st.tallyMs += task.estimatedMs;
    }
    if (st.totalMs > 0) {
      let current = st.tallyMs;
      if (interrupted) current += task.estimatedMs * (status / 100);   // credit the part the task reports
      progress = current / st.totalMs;
    }
    if (interrupted) break;                  // resumes at the front on the next slice
    if (status < 0) return report(st, progress, false, status);
  }

  if (st.queue.length === 0) {
    st.active = false;
    return report(st, 1, true);
  }
  return report(st, progress, false);
}

// Registration helper: the total is fixed once the queue is closed.
function openLoad(tasks: LoadTask[]): LoaderState {
  const totalMs = tasks.reduce((sum, t) => sum + t.estimatedMs, 0);
  return { queue: tasks.slice(), tallyMs: 0, totalMs, firstCall: true, active: true };
}
