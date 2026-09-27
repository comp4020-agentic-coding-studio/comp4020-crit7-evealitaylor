import type { ClassOption, PlannedSubject } from "./db";

// The rules of the draft timetable, kept free of the database and the page:
// - a pinned activity shows only its pinned class;
// - an unpinned activity shows every class it offers, but a class that
//   overlaps something already pinned is marked as clashing (still pinnable —
//   you might be about to move the other one);
// - two pinned classes that overlap are a clash, and are called out.
// Teaching weeks are ignored: every class here runs across the same weeks.

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const DAY_START = 8 * 60;
export const DAY_END = 19 * 60;

export type BlockState = "pinned" | "option" | "clashing";

export type Block = {
  option: ClassOption;
  subjectCode: string;
  activityCode: string;
  kind: string;
  state: BlockState;
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

export function buildTimetable(plan: PlannedSubject[]) {
  type Pinned = { option: ClassOption; activityId: number; name: string };
  const pinned: Pinned[] = [];
  for (const subject of plan) {
    for (const activity of subject.activities) {
      const option = activity.options.find((o) => o.id === activity.pinnedId);
      if (option) {
        pinned.push({
          option,
          activityId: activity.id,
          name: className(subject.code, activity.code, option.label),
        });
      }
    }
  }

  const blocks: Omit<Block, "lane" | "lanes">[] = [];
  for (const subject of plan) {
    for (const activity of subject.activities) {
      const shown = activity.pinnedId
        ? activity.options.filter((o) => o.id === activity.pinnedId)
        : activity.options;
      for (const option of shown) {
        const clashesWith = pinned
          .filter((p) => p.activityId !== activity.id && overlaps(p.option, option))
          .map((p) => p.name);
        const isPinned = option.id === activity.pinnedId;
        blocks.push({
          option,
          subjectCode: subject.code,
          activityCode: activity.code,
          kind: activity.kind,
          state: isPinned ? "pinned" : clashesWith.length ? "clashing" : "option",
          clashesWith,
        });
      }
    }
  }

  const clashes: Clash[] = [];
  for (let i = 0; i < pinned.length; i++) {
    for (let j = i + 1; j < pinned.length; j++) {
      const [a, b] = [pinned[i].option, pinned[j].option];
      if (overlaps(a, b)) {
        clashes.push({
          a: pinned[i].name,
          b: pinned[j].name,
          day: a.day,
          start: Math.max(a.start, b.start),
          end: Math.min(a.end, b.end),
        });
      }
    }
  }

  const total = plan.reduce((n, s) => n + s.activities.length, 0);
  return { blocks: layOut(blocks), clashes, pinnedCount: pinned.length, total };
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
