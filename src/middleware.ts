import { randomUUID } from "node:crypto";
import { defineMiddleware } from "astro:middleware";
import { ensureStudent } from "./lib/db";

// No logins: a browser is a student. The first request mints an id into a
// long-lived `sid` cookie, and every page and endpoint reads it from
// `locals.studentId`, so the draft timetable is this browser's alone.
export const onRequest = defineMiddleware((context, next) => {
  let id = context.cookies.get("sid")?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = randomUUID();
    context.cookies.set("sid", id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: context.url.protocol === "https:",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  ensureStudent(id);
  context.locals.studentId = id;
  return next();
});
