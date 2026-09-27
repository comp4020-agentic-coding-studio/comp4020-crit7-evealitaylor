import type { APIRoute } from "astro";
import {
  addSubject,
  clearPlan,
  pinClass,
  pinClasses,
  removeSubject,
  setSkipLectures,
  toggleFreeDay,
  unpinActivity,
  unpinAll,
} from "../../lib/db";
import { planChanged } from "../../lib/events";

// Every change to a draft timetable is a plain HTML form POST here, followed
// by a 303 back to the page, so the whole feature works with no client-side
// JavaScript: the page re-renders from SQLite, which is also why a pin is
// still there after a reload.
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const id = locals.studentId;

  if (action === "add-subject") addSubject(id, String(form.get("subject") ?? ""));
  else if (action === "remove-subject") removeSubject(id, String(form.get("subject") ?? ""));
  else if (action === "pin") pinClass(id, Number(form.get("class")));
  else if (action === "unpin") unpinActivity(id, Number(form.get("activity")));
  else if (action === "unpin-all") unpinAll(id);
  else if (action === "clear") clearPlan(id);
  else if (action === "toggle-day") toggleFreeDay(id, Number(form.get("day")));
  else if (action === "lectures") setSkipLectures(id, form.get("lectures") === "skip");
  else if (action === "accept") pinClasses(id, form.getAll("class").map(Number).filter(Number.isInteger));
  else return new Response("unknown action", { status: 400 });

  planChanged(id);
  return redirect("/", 303);
};
