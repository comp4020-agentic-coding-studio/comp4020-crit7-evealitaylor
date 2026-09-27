import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  type Activity,
  activities,
  type ClassOption,
  classOptions,
  pins,
  recordedLectures,
  type Subject,
  studentSubjects,
  students,
  subjects,
} from "./schema";
import { CATALOGUE, parseWhen } from "./seed";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");
client.pragma("foreign_keys = ON");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

// The catalogue is reference data: load it once, into an empty database.
// Changing it later means a migration, not an edit here, because students'
// pins point at these rows.
if (!db.select().from(subjects).limit(1).get()) {
  db.transaction((tx) => {
    for (const subject of CATALOGUE) {
      tx.insert(subjects).values({ code: subject.code, name: subject.name }).run();
      for (const activity of subject.activities) {
        const { id } = tx
          .insert(activities)
          .values({ subjectCode: subject.code, code: activity.code, kind: activity.kind })
          .returning()
          .get();
        for (const [label, when, location] of activity.classes) {
          tx.insert(classOptions)
            .values({ activityId: id, label, location, weeks: activity.weeks, ...parseWhen(when) })
            .run();
        }
      }
    }
  });
}

export type { Activity, ClassOption, Subject };

export function ensureStudent(id: string): void {
  db.insert(students).values({ id }).onConflictDoNothing().run();
}

export function listSubjects(): Subject[] {
  return db.select().from(subjects).orderBy(asc(subjects.code)).all();
}

export function addSubject(studentId: string, subjectCode: string): void {
  if (!db.select().from(subjects).where(eq(subjects.code, subjectCode)).get()) return;
  db.insert(studentSubjects).values({ studentId, subjectCode }).onConflictDoNothing().run();
}

export function removeSubject(studentId: string, subjectCode: string): void {
  const ids = db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.subjectCode, subjectCode))
    .all()
    .map((a) => a.id);
  db.transaction((tx) => {
    if (ids.length) {
      tx.delete(pins)
        .where(and(eq(pins.studentId, studentId), inArray(pins.activityId, ids)))
        .run();
      tx.delete(recordedLectures)
        .where(and(eq(recordedLectures.studentId, studentId), inArray(recordedLectures.activityId, ids)))
        .run();
    }
    tx.delete(studentSubjects)
      .where(and(eq(studentSubjects.studentId, studentId), eq(studentSubjects.subjectCode, subjectCode)))
      .run();
  });
}

// Pinning a class replaces whatever was pinned for its activity. Only
// classes of subjects the student has added can be pinned.
export function pinClass(studentId: string, classOptionId: number): void {
  const row = db
    .select({ activityId: classOptions.activityId, subjectCode: activities.subjectCode })
    .from(classOptions)
    .innerJoin(activities, eq(activities.id, classOptions.activityId))
    .where(eq(classOptions.id, classOptionId))
    .get();
  if (!row) return;
  const added = db
    .select()
    .from(studentSubjects)
    .where(and(eq(studentSubjects.studentId, studentId), eq(studentSubjects.subjectCode, row.subjectCode)))
    .get();
  if (!added) return;
  db.insert(pins)
    .values({ studentId, activityId: row.activityId, classOptionId })
    .onConflictDoUpdate({ target: [pins.studentId, pins.activityId], set: { classOptionId } })
    .run();
}

export function clearPlan(studentId: string): void {
  db.transaction((tx) => {
    tx.delete(pins).where(eq(pins.studentId, studentId)).run();
    tx.delete(recordedLectures).where(eq(recordedLectures.studentId, studentId)).run();
    tx.delete(studentSubjects).where(eq(studentSubjects.studentId, studentId)).run();
  });
}

export function unpinAll(studentId: string): void {
  db.delete(pins).where(eq(pins.studentId, studentId)).run();
}

export function unpinActivity(studentId: string, activityId: number): void {
  db.delete(pins)
    .where(and(eq(pins.studentId, studentId), eq(pins.activityId, activityId)))
    .run();
}

export function freeDaysFor(studentId: string): number[] {
  const row = db.select({ freeDays: students.freeDays }).from(students).where(eq(students.id, studentId)).get();
  return (row?.freeDays ?? "").split(",").filter(Boolean).map(Number);
}

export function toggleFreeDay(studentId: string, day: number): void {
  if (!Number.isInteger(day) || day < 0 || day > 4) return;
  const days = new Set(freeDaysFor(studentId));
  if (days.has(day)) days.delete(day);
  else days.add(day);
  db.update(students)
    .set({ freeDays: [...days].sort().join(",") })
    .where(eq(students.id, studentId))
    .run();
}

export function recordedLecturesFor(studentId: string): Set<number> {
  return new Set(
    db
      .select({ activityId: recordedLectures.activityId })
      .from(recordedLectures)
      .where(eq(recordedLectures.studentId, studentId))
      .all()
      .map((r) => r.activityId),
  );
}

// Only lectures can be watched as a recording, and only of subjects the
// student has added.
export function setRecorded(studentId: string, activityId: number, recorded: boolean): void {
  if (!recorded) {
    db.delete(recordedLectures)
      .where(and(eq(recordedLectures.studentId, studentId), eq(recordedLectures.activityId, activityId)))
      .run();
    return;
  }
  const lecture = db
    .select()
    .from(activities)
    .innerJoin(
      studentSubjects,
      and(eq(studentSubjects.subjectCode, activities.subjectCode), eq(studentSubjects.studentId, studentId)),
    )
    .where(and(eq(activities.id, activityId), eq(activities.kind, "Lecture")))
    .get();
  if (!lecture) return;
  db.insert(recordedLectures).values({ studentId, activityId }).onConflictDoNothing().run();
}

// Accepting a suggested plan pins each of its classes. pinClass only pins
// classes of subjects the student has added, so a stale or tampered form
// can't pin anything else.
export function pinClasses(studentId: string, classOptionIds: number[]): void {
  db.transaction(() => {
    for (const id of classOptionIds) pinClass(studentId, id);
  });
}

// An activity offering a single class is "fixed": there's nothing to choose,
// so it counts as pinned without the student doing anything.
export type PlannedActivity = Activity & {
  options: ClassOption[];
  pinnedId: number | null;
  fixed: boolean;
};
export type PlannedSubject = Subject & { activities: PlannedActivity[] };

// Everything the timetable page shows for one student: their subjects, each
// subject's activities, every class on offer, and which one (if any) is
// pinned, counting a fixed activity's only class as pinned.
export function planFor(studentId: string): PlannedSubject[] {
  const chosen = db
    .select({ code: subjects.code, name: subjects.name })
    .from(studentSubjects)
    .innerJoin(subjects, eq(subjects.code, studentSubjects.subjectCode))
    .where(eq(studentSubjects.studentId, studentId))
    .orderBy(asc(subjects.code))
    .all();
  if (!chosen.length) return [];

  const codes = chosen.map((s) => s.code);
  const acts = db
    .select()
    .from(activities)
    .where(inArray(activities.subjectCode, codes))
    .orderBy(asc(activities.id))
    .all();
  const opts = db
    .select()
    .from(classOptions)
    .where(
      inArray(
        classOptions.activityId,
        acts.map((a) => a.id),
      ),
    )
    .orderBy(asc(classOptions.id))
    .all();
  const pinned = new Map(
    db
      .select()
      .from(pins)
      .where(eq(pins.studentId, studentId))
      .all()
      .map((p) => [p.activityId, p.classOptionId]),
  );

  return chosen.map((subject) => ({
    ...subject,
    activities: acts
      .filter((a) => a.subjectCode === subject.code)
      .map((a) => {
        const options = opts.filter((o) => o.activityId === a.id);
        const fixed = options.length === 1;
        return {
          ...a,
          options,
          pinnedId: fixed ? options[0].id : (pinned.get(a.id) ?? null),
          fixed,
        };
      }),
  }));
}
