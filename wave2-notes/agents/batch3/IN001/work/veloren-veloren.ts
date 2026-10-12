// Licence: GPL-3.0 (donor, Veloren LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room

// Radial-style deadzone for a signed analog axis: inside the threshold the output is 0,
// outside it the remaining travel is rescaled to 0..1 so the output does not jump at the edge.
export function applyAxisDeadzone(input: number, threshold = 0.2): number {
  const abs = Math.abs(input);
  if (abs <= threshold || threshold >= 1) return 0;
  if (threshold <= 0) return input;
  return ((abs - threshold) / (1 - threshold)) * Math.sign(input);
}

// Chord lookup: one button plus up to two held modifiers. A chord matches in either
// modifier order (LB+RB == RB+LB). Chord entries win over the plain button entry.
export function resolveBinding(
  button: string,
  heldModifiers: string[],               // modifiers in the order they were pressed
  chords: Map<string, string>,           // key "button|mod1|mod2" -> action
  plain: Map<string, string>,            // button -> action
): string | undefined {
  const m0 = heldModifiers[0] ?? "";
  const m1 = heldModifiers[1] ?? "";
  const first = chords.get(`${button}|${m0}|${m1}`);
  if (first !== undefined) return first;
  const swapped = chords.get(`${button}|${m1}|${m0}`);
  if (swapped !== undefined) return swapped;
  return plain.get(button);
}

export {};
