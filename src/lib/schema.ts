import { sql } from "drizzle-orm";
import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
//
// The slice modelled is the one MyTimetable's web publisher has: a subject
// has activities (LecA, TutA, ComA, ...), you attend one class of each
// activity, and each activity offers several classes to choose between.

export const subjects = sqliteTable("subjects", {
  code: text().primaryKey(), // e.g. COMP2100
  name: text().notNull(),
});

export const activities = sqliteTable("activities", {
  id: int().primaryKey({ autoIncrement: true }),
  subjectCode: text("subject_code")
    .notNull()
    .references(() => subjects.code),
  code: text().notNull(), // e.g. LecA, TutA
  kind: text().notNull(), // Lecture, Tutorial, Computer Lab, Workshop
});

export const classOptions = sqliteTable("class_options", {
  id: int().primaryKey({ autoIncrement: true }),
  activityId: int("activity_id")
    .notNull()
    .references(() => activities.id),
  label: text().notNull(), // e.g. 01, 02
  day: int().notNull(), // 0 = Monday … 4 = Friday
  start: int().notNull(), // minutes after midnight
  end: int().notNull(),
  location: text().notNull(),
  weeks: text().notNull(), // teaching weeks, as the publisher prints them
});

// A student is a browser: the `sid` cookie holds this id (see middleware.ts).
export const students = sqliteTable("students", {
  id: text().primaryKey(),
  // days the student would rather keep free of classes: "0,4" = Mon and Fri
  freeDays: text("free_days").notNull().default(""),
  // 1 when the student skips lectures (watching recordings instead)
  skipLectures: int("skip_lectures").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// The subjects a student is planning around.
export const studentSubjects = sqliteTable(
  "student_subjects",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    subjectCode: text("subject_code")
      .notNull()
      .references(() => subjects.code),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.subjectCode] })],
);

// The feature: at most one pinned class per activity per student. A pinned
// activity shows only its chosen class; an unpinned one shows every option.
export const pins = sqliteTable(
  "pins",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    activityId: int("activity_id")
      .notNull()
      .references(() => activities.id),
    classOptionId: int("class_option_id")
      .notNull()
      .references(() => classOptions.id),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.activityId] })],
);

// Lectures the student will watch as a recording instead of attending. Only
// counts while the lecture falls on a day they want free (see timetable.ts).
export const recordedLectures = sqliteTable(
  "recorded_lectures",
  {
    studentId: text("student_id")
      .notNull()
      .references(() => students.id),
    activityId: int("activity_id")
      .notNull()
      .references(() => activities.id),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.activityId] })],
);

export type Subject = typeof subjects.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type ClassOption = typeof classOptions.$inferSelect;
