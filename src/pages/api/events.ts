import type { APIRoute } from "astro";
import { bus } from "../../lib/events";

// The minimal server-sent-events (SSE) pattern: a long-lived streaming
// response the browser consumes with `new EventSource("/api/events")`.
// Each connection hears only about its own student's plan — the id never
// leaves the server, the stream just says "your plan changed".
export const GET: APIRoute = ({ locals }) => {
  let onPlan: (studentId: string) => void;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<string>({
    start(controller) {
      // an opening comment so the client (and the post-deploy CI probe) sees
      // bytes immediately, and a periodic one so proxies don't drop the
      // connection as idle
      controller.enqueue(": connected\n\n");
      heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 30_000);
      onPlan = (studentId) => {
        if (studentId === locals.studentId) controller.enqueue("event: plan\ndata: changed\n\n");
      };
      bus.on("plan", onPlan);
    },
    cancel() {
      clearInterval(heartbeat);
      bus.off("plan", onPlan);
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
};
