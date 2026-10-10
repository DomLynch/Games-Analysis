// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Group = "lower" | "torso" | "leftArm" | "rightArm";
const GROUPS: Group[] = ["lower", "torso", "leftArm", "rightArm"];
type Priority = Record<Group, number>;

interface Clip {
  name: string;                 // e.g. "walk", "block", "hit1"
  priority: Priority;           // one priority per body group
  groups: Group[];              // body groups this clip drives (its blend mask)
  time: number;                 // seconds into the clip
  pose: (t: number) => number;  // one scalar stands in for a bone transform
}

interface Rule { from: string; to: string; duration: number; easing: "linear" | "sineOut"; }

// Wildcard match: "*" alone, or a leading or trailing star.
function fits(pattern: string, s: string): boolean {
  return pattern === "*" || s === pattern
    || (pattern.startsWith("*") && s.endsWith(pattern.slice(1)))
    || (pattern.endsWith("*") && s.startsWith(pattern.slice(0, -1)));
}

// The last matching rule wins: later rules override earlier ones.
function findRule(rules: Rule[], from: string, to: string): Rule | undefined {
  for (let i = rules.length - 1; i >= 0; i--) {
    if (fits(rules[i].from, from) && fits(rules[i].to, to)) return rules[i];
  }
  return undefined;
}

const EASE: Record<Rule["easing"], (x: number) => number> = {
  linear: (x) => x,
  sineOut: (x) => Math.sin((x * Math.PI) / 2),
};

const samePriority = (a: Priority, b: Priority): boolean => GROUPS.every((g) => a[g] === b[g]);

// Starting a clip: an older clip with the same full priority vector ends.
// A clip that is already playing only takes the new priority and is not restarted.
function play(clips: Clip[], next: Clip): Clip[] {
  const kept = clips.filter((c) => c.name === next.name || !samePriority(c.priority, next.priority));
  const same = kept.find((c) => c.name === next.name);
  if (same) {
    same.priority = next.priority;
    return kept;
  }
  return [...kept, next];
}

// Per body group: the clip with the highest priority for that group among clips whose mask includes it.
// Ties keep the earlier clip in the list (donor: strict less-than over a name-sorted map).
function activeFor(clips: Clip[], g: Group): Clip | undefined {
  let best: Clip | undefined;
  for (const c of clips) {
    if (!c.groups.includes(g)) continue;
    if (!best || best.priority[g] < c.priority[g]) best = c;
  }
  return best;
}

interface Channel {
  current: string;   // clip name this group last switched to ("" = none)
  shown: number;     // value this group output last frame
  from: number;      // snapshot taken when the group switched
  start: number;     // seconds: time the blend began
  duration: number;  // seconds; 0 = snap
  ease: (x: number) => number;
}

// One group, one frame. On a switch, snapshot what the group shows, then blend to the new clip's sample.
function stepChannel(ch: Channel, clip: Clip, rules: Rule[], now: number): number {
  const sample = clip.pose(clip.time);
  if (clip.name !== ch.current) {
    const rule = findRule(rules, ch.current, clip.name);
    ch.from = ch.shown;
    ch.start = now;
    ch.duration = rule ? rule.duration : 0;
    ch.ease = rule ? EASE[rule.easing] : EASE.sineOut;
    ch.current = clip.name;
  }
  const t = ch.duration === 0 ? 1 : Math.min((now - ch.start) / ch.duration, 1);
  ch.shown = ch.from + (sample - ch.from) * ch.ease(t);
  return ch.shown;
}

export {};
