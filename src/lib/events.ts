import { EventEmitter } from "node:events";

// One process, one bus: every open SSE connection subscribes here. When a
// student's plan changes, the bus announces their id, and any other tab open
// on that same browser reloads its timetable. This only works because the
// app runs on exactly one machine (see fly.toml) — a second machine would
// have its own bus and tabs would miss events.
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export const planChanged = (studentId: string) => bus.emit("plan", studentId);
