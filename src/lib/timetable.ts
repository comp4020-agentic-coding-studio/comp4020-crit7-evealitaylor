import type { ClassOption, PlannedSubject } from "./db";

// The rules of the draft timetable, kept free of the database and the page:
// - a pinned activity shows only its pinned class (a fixed, single-class
//   activity counts as pinned);
// - an unpinned activity shows every class it offers, but a class that
//   overlaps something already pinned is marked as clashing (still pinnable —
//   you might be about to move the other one), and a class on a day the
//   student wants to keep free is marked as avoided;
// - two pinned classes that overlap are a clash, and are called out, as is a
//   pinned class on a day meant to be free;
// - a suggestion (see suggestPlan) previews a class for each unpinned
//   activity, drawn as "suggested", and is treated like a pin for clashes;
// - a lecture on a day the student wants free can be watched as a recording
//   instead: it still shows, marked skipped, but counts for nothing — no
//   clashes, no free-day warning, no day on campus, no part in suggestions.
//   Un-free the day and the lecture counts again.
// Teaching weeks are ignored: every class here runs across the same weeks.

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const DAY_START = 8 * 60;
export const DAY_END = 19 * 60;

export type BlockState = "pinned" | "suggested" | "option" | "clashing" | "avoided";

export type Block = {
  option: ClassOption;
  subjectCode: string;
  activityCode: string;
  kind: string;
  state: BlockState;
  fixed: boolean;
  skipped: boolean; // a lecture on a free day, watched as a recording
  clashesWith: string[]; // names of pinned classes this one overlaps
  lane: number; // position among blocks that overlap it on screen
  lanes: number;
};

export type Clash = { a: string; b: string; day: number; start: number; end: number };

export const overlaps = (a: ClassOption, b: ClassOption) =>
  a.day === b.day && a.start < b.end && b.start < a.end;

export const className = (subjectCode: string, activityCode: string, label: string) =>
  `${subjectCode} ${activityCode}/${label}`;

export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// the grid's hour labels, as Web Publisher prints them: "9:00 AM"
export function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const isLecture = (kind: string) => kind === "Lecture";

// Whether a class is a lecture being watched as a recording: ticked, and on
// a day the student wants free.
const watchedRecorded = (
  activity: { id: number; kind: string },
  option: ClassOption,
  recorded: Set<number>,
  free: Set<number>,
) => recorded.has(activity.id) && isLecture(activity.kind) && free.has(option.day);

type Options = { freeDays?: number[]; suggestion?: Map<number, number>; recorded?: Set<number> };

export function buildTimetable(
  plan: PlannedSubject[],
  { freeDays = [], suggestion, recorded = new Set() }: Options = {},
) {
  const free = new Set(freeDays);
  // what each activity has settled on: its pin, or else the suggested class
  const chosenId = (a: PlannedSubject["activities"][number]) => a.pinnedId ?? suggestion?.get(a.id) ?? null;

  type Taken = { option: ClassOption; activityId: number; name: string; suggested: boolean };
  const taken: Taken[] = [];
  for (const subject of plan) {
    for (const activity of subject.activities) {
      const option = activity.options.find((o) => o.id === chosenId(activity));
      // a lecture watched as a recording takes no time on campus
      if (option && !watchedRecorded(activity, option, recorded, free)) {
        taken.push({
          option,
          activityId: activity.id,
          name: className(subject.code, activity.code, option.label),
          suggested: activity.pinnedId === null,
        });
      }
    }
  }

  const blocks: Omit<Block, "lane" | "lanes">[] = [];
  for (const subject of plan) {
    for (const activity of subject.activities) {
      const chosen = chosenId(activity);
      const shown = chosen ? activity.options.filter((o) => o.id === chosen) : activity.options;
      for (const option of shown) {
        const isSkipped = option.id === chosen && watchedRecorded(activity, option, recorded, free);
        const clashesWith = isSkipped
          ? []
          : taken.filter((p) => p.activityId !== activity.id && overlaps(p.option, option)).map((p) => p.name);
        let state: BlockState;
        if (option.id === activity.pinnedId) state = "pinned";
        else if (option.id === chosen) state = "suggested";
        else if (clashesWith.length) state = "clashing";
        else if (free.has(option.day) && !isSkipped) state = "avoided";
        else state = "option";
        blocks.push({
          option,
          subjectCode: subject.code,
          activityCode: activity.code,
          kind: activity.kind,
          state,
          fixed: activity.fixed,
          skipped: isSkipped,
          clashesWith,
        });
      }
    }
  }

  const clashes: Clash[] = [];
  for (let i = 0; i < taken.length; i++) {
    for (let j = i + 1; j < taken.length; j++) {
      const [a, b] = [taken[i].option, taken[j].option];
      if (overlaps(a, b)) {
        clashes.push({
          a: taken[i].name,
          b: taken[j].name,
          day: a.day,
          start: Math.max(a.start, b.start),
          end: Math.min(a.end, b.end),
        });
      }
    }
  }

  // pinned classes sitting on a day the student wants free. Lectures among
  // them can be watched as a recording instead; those stay listed (so the
  // choice can be undone) but no longer break the free day.
  const onFreeDays = plan.flatMap((subject) =>
    subject.activities.flatMap((activity) => {
      const option = activity.options.find((o) => o.id === activity.pinnedId);
      if (!option || !free.has(option.day)) return [];
      return [
        {
          name: className(subject.code, activity.code, option.label),
          day: option.day,
          activityId: activity.id,
          lecture: isLecture(activity.kind),
          recorded: watchedRecorded(activity, option, recorded, free),
        },
      ];
    }),
  );

  const total = plan.reduce((n, s) => n + s.activities.length, 0);
  const pinnedCount = plan.reduce((n, s) => n + s.activities.filter((a) => a.pinnedId !== null).length, 0);
  return { blocks: layOut(blocks), clashes, onFreeDays, pinnedCount, total };
}

// ---- suggesting a plan ----------------------------------------------------

export type Suggestion = {
  choice: Map<number, number>; // activity id -> class option id
  days: number[]; // days on campus under the suggestion, pins included
  freeDayClasses: number; // suggested classes on a day meant to be free (pins can't move)
  gapMinutes: number; // time between classes, summed over the week
};

// Pick one class for every unpinned activity so that nothing clashes, then
// minimise, in order: classes on days meant to be free, days on campus, and
// time stuck between classes. Pins (fixed classes included) are never
// changed. A depth-first search with branch-and-bound on the first two
// measures; the catalogue is small enough that this is instant. Returns null
// when no clash-free plan exists.
export function suggestPlan(
  plan: PlannedSubject[],
  freeDays: number[] = [],
  recorded: Set<number> = new Set(),
): Suggestion | null {
  const free = new Set(freeDays);
  const acts = plan.flatMap((s) => s.activities);
  // lectures watched as recordings take no time, so they don't constrain
  const base = acts.flatMap((a) =>
    a.options.filter((o) => o.id === a.pinnedId && !watchedRecorded(a, o, recorded, free)),
  );
  // most constrained first: fewer options means earlier pruning
  const open = acts.filter((a) => a.pinnedId === null).sort((a, b) => a.options.length - b.options.length);
  if (!open.length) return null;

  const cost = (classes: ClassOption[]) => {
    const days = new Set(classes.map((c) => c.day));
    let gapMinutes = 0;
    for (const day of days) {
      const today = classes.filter((c) => c.day === day).sort((a, b) => a.start - b.start);
      let end = today[0].end;
      for (const c of today.slice(1)) {
        gapMinutes += Math.max(0, c.start - end);
        end = Math.max(end, c.end);
      }
    }
    return {
      days: [...days].sort(),
      freeDayClasses: classes.filter((c) => free.has(c.day)).length,
      gapMinutes,
    };
  };
  const better = (a: ReturnType<typeof cost>, b: ReturnType<typeof cost>) =>
    a.freeDayClasses !== b.freeDayClasses
      ? a.freeDayClasses < b.freeDayClasses
      : a.days.length !== b.days.length
        ? a.days.length < b.days.length
        : a.gapMinutes < b.gapMinutes;

  let best: { picks: ClassOption[]; cost: ReturnType<typeof cost> } | null = null;
  const picks: ClassOption[] = [];

  const search = (i: number) => {
    const classes = [...base, ...picks];
    if (best) {
      // both measures only grow as classes are added, so a partial plan
      // already worse on them can't win
      const partial = cost(classes);
      if (
        partial.freeDayClasses > best.cost.freeDayClasses ||
        (partial.freeDayClasses === best.cost.freeDayClasses && partial.days.length > best.cost.days.length)
      ) {
        return;
      }
    }
    if (i === open.length) {
      const c = cost(classes);
      if (!best || better(c, best.cost)) best = { picks: [...picks], cost: c };
      return;
    }
    for (const option of open[i].options) {
      if (classes.some((c) => overlaps(c, option))) continue;
      picks.push(option);
      search(i + 1);
      picks.pop();
    }
  };
  search(0);

  if (!best) return null;
  const found = best as { picks: ClassOption[]; cost: ReturnType<typeof cost> };
  return {
    choice: new Map(found.picks.map((o) => [o.activityId, o.id])),
    ...found.cost,
    // counted over the whole week while searching (pins add the same amount
    // to every candidate), but reported for the suggested classes only
    freeDayClasses: found.picks.filter((o) => free.has(o.day)).length,
  };
}

// Blocks that overlap in time share their day's column side by side: group
// them into clusters of mutual overlap, then give each block the first free
// lane in its cluster.
function layOut(blocks: Omit<Block, "lane" | "lanes">[]): Block[] {
  const out: Block[] = [];
  for (let day = 0; day < DAYS.length; day++) {
    const today = blocks
      .filter((b) => b.option.day === day)
      .sort((a, b) => a.option.start - b.option.start || b.option.end - a.option.end);
    let cluster: Block[] = [];
    let clusterEnd = -1;
    const close = () => {
      const lanes = Math.max(0, ...cluster.map((b) => b.lane + 1));
      for (const b of cluster) b.lanes = lanes;
      out.push(...cluster);
      cluster = [];
    };
    for (const b of today) {
      if (b.option.start >= clusterEnd) close();
      const laneEnds: number[] = [];
      for (const c of cluster) laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? 0, c.option.end);
      let lane = laneEnds.findIndex((end) => end === undefined || end <= b.option.start);
      if (lane === -1) lane = laneEnds.length;
      cluster.push({ ...b, lane, lanes: 1 });
      clusterEnd = Math.max(clusterEnd, b.option.end);
    }
    close();
  }
  return out;
}
