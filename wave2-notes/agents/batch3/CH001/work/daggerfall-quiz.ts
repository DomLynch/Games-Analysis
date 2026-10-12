// Licence: MIT (donor). Clean-room sketch of the mechanism; no donor lines or donor data copied.
// clean-room
type PathId = 0 | 1 | 2; // three paths; names and meaning come from our catalogue, not the donor

interface QuizData {
  questionCount: number;             // size of the question library (donor: 40)
  answers: PathId[][];               // one row per question, one entry per answer choice (our data)
  results: Map<string, number>;      // weight triple "w0,w1,w2" -> class id (our data)
}

interface QuizState {
  picked: number[];                  // question indices, in ask order
  answered: number;
  weights: [number, number, number];
}

// Pick `pick` distinct indices from `total`. Partial Fisher-Yates: each subset is equally likely.
// The donor steps to the next free index on a repeat, which makes questions after a run of picks more likely.
function pickQuestions(total: number, pick: number, rand: () => number): number[] {
  const idx = Array.from({ length: total }, (_, i) => i);
  for (let i = 0; i < pick; i++) {
    const j = i + Math.floor(rand() * (total - i));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, pick);
}

function startQuiz(data: QuizData, rand: () => number): QuizState {
  return { picked: pickQuestions(data.questionCount, 10, rand), answered: 0, weights: [0, 0, 0] };
}

// One answer. Returns the class id after the last answer, null while asking, and null with no match
// (the caller must treat a no-match as an error, not as a class).
function answer(state: QuizState, data: QuizData, choice: 0 | 1 | 2): number | null {
  const q = state.picked[state.answered];
  const path = data.answers[q][choice];
  state.weights[path] += 1;
  state.answered += 1;
  if (state.answered < state.picked.length) return null;
  return data.results.get(state.weights.join(",")) ?? null;
}

export {};
