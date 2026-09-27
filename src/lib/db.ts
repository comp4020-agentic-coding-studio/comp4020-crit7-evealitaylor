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

export function unpinActivity(studentId: string, activityId: number): void {
  db.delete(pins)
    .where(and(eq(pins.studentId, studentId), eq(pins.activityId, activityId)))
    .run();
}

export type PlannedActivity = Activity & { options: ClassOption[]; pinnedId: number | null };
export type PlannedSubject = Subject & { activities: PlannedActivity[] };

// Everything the timetable page shows for one student: their subjects, each
// subject's activities, every class on offer, and which one (if any) is pinned.
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
      .map((a) => ({
        ...a,
        options: opts.filter((o) => o.activityId === a.id),
        pinnedId: pinned.get(a.id) ?? null,
      })),
  }));
}
