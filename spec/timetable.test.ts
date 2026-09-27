import axe from "axe-core";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";

// The feature's contracts, driven over HTTP against the running app, as a
// browser would: a cookie identifies the student, forms POST to /api/plan.
// - an unpinned activity shows every class it offers;
// - pinning a class leaves only that class showing for its activity, and
//   the pin is still there on a fresh load (it lives in SQLite);
// - unpinning brings every option back;
// - pins belong to one browser, not everyone;
// - classes that overlap a pin are marked clashing, and two pinned classes
//   that overlap raise a clash warning.
// The class codes below come from the seeded catalogue (src/lib/seed.ts).
const baseUrl = inject("baseUrl");

class Browser {
  cookie = "";

  async load() {
    const res = await fetch(baseUrl, { headers: { cookie: this.cookie } });
    this.keep(res);
    return new JSDOM(await res.text()).window.document;
  }

  // Astro checks form POSTs carry a same-origin Origin header (CSRF
  // protection); browsers send it automatically, a bare fetch doesn't.
  async post(fields: Record<string, string>) {
    const res = await fetch(new URL("/api/plan", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl, cookie: this.cookie },
      body: new URLSearchParams(fields),
      redirect: "manual",
    });
    this.keep(res);
    return res;
  }

  private keep(res: Response) {
    const sid = res.headers.getSetCookie().find((c) => c.startsWith("sid="));
    if (sid) this.cookie = sid.split(";")[0];
  }
}

// the week grid's blocks for one activity, e.g. "COMP2100 ComA"
const blocks = (doc: Document, activity: string) =>
  [...doc.querySelectorAll<HTMLElement>(".week [data-class]")].filter((b) =>
    b.dataset.class?.startsWith(`${activity}/`),
  );

const classId = (doc: Document, name: string) =>
  doc.querySelector(`.week [data-class="${name}"] input[name="class"]`)?.getAttribute("value") ?? "";

describe("pinning a class", () => {
  const me = new Browser();

  beforeAll(async () => {
    await me.load();
    const res = await me.post({ action: "add-subject", subject: "COMP2100" });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
  });

  it("shows every class of an unpinned activity", async () => {
    const shown = blocks(await me.load(), "COMP2100 ComA");
    expect(shown).toHaveLength(7);
    expect(shown.every((b) => b.dataset.state === "option")).toBe(true);
  });

  it("shows only the pinned class once one is pinned, and keeps it across a reload", async () => {
    const id = classId(await me.load(), "COMP2100 ComA/03");
    expect(id).not.toBe("");
    await me.post({ action: "pin", class: id });

    for (let reload = 0; reload < 2; reload++) {
      const shown = blocks(await me.load(), "COMP2100 ComA");
      expect(shown.map((b) => b.dataset.class)).toEqual(["COMP2100 ComA/03"]);
      expect(shown[0].dataset.state).toBe("pinned");
    }
  });

  it("leaves other activities of the subject untouched", async () => {
    expect(blocks(await me.load(), "COMP2100 LecA")).toHaveLength(1);
    expect(blocks(await me.load(), "COMP2100 LecA")[0].dataset.state).toBe("option");
  });

  it("keeps pins to the browser that made them", async () => {
    const stranger = new Browser();
    const doc = await stranger.load();
    expect(blocks(doc, "COMP2100 ComA")).toHaveLength(0);
    expect(doc.querySelectorAll('[data-state="pinned"]')).toHaveLength(0);
  });

  it("brings every option back when unpinned", async () => {
    const activity = (await me.load())
      .querySelector('.week [data-class="COMP2100 ComA/03"] input[name="activity"]')
      ?.getAttribute("value");
    await me.post({ action: "unpin", activity: activity ?? "" });
    expect(blocks(await me.load(), "COMP2100 ComA")).toHaveLength(7);
  });
});

describe("clashes", () => {
  const me = new Browser();
  // COMP2100 LecA/01 is Tue 10–12; COMP2310 ComA/02 is Tue 09–11.

  beforeAll(async () => {
    await me.load();
    await me.post({ action: "add-subject", subject: "COMP2100" });
    await me.post({ action: "add-subject", subject: "COMP2310" });
    await me.post({ action: "pin", class: classId(await me.load(), "COMP2100 LecA/01") });
  });

  it("marks options that overlap a pinned class as clashing", async () => {
    const doc = await me.load();
    const state = (name: string) =>
      doc.querySelector<HTMLElement>(`.week [data-class="${name}"]`)?.dataset.state;
    expect(state("COMP2310 ComA/02")).toBe("clashing");
    expect(state("COMP2310 ComA/01")).toBe("option");
  });

  it("warns when two pinned classes overlap", async () => {
    expect((await me.load()).querySelector('[role="alert"]')).toBeNull();
    await me.post({ action: "pin", class: classId(await me.load(), "COMP2310 ComA/02") });
    const alert = (await me.load()).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("COMP2100 LecA/01");
    expect(alert?.textContent).toContain("COMP2310 ComA/02");
  });

  // The invariants only ever see / as a brand-new browser — the empty state.
  // This runs the same axe floor over a populated grid, clash warning and all.
  it("keeps the populated timetable above the accessibility floor", async () => {
    const res = await fetch(baseUrl, { headers: { cookie: me.cookie } });
    const dom = new JSDOM(await res.text(), { url: baseUrl, runScripts: "outside-only", pretendToBeVisual: true });
    const window = dom.window as unknown as { eval: (s: string) => void; axe: typeof axe };
    window.eval(axe.source);
    const results = await window.axe.run(dom.window.document, {
      rules: { "color-contrast": { enabled: false }, "link-in-text-block": { enabled: false } },
    });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  it("drops a subject's pins when the subject is removed", async () => {
    await me.post({ action: "remove-subject", subject: "COMP2310" });
    const doc = await me.load();
    expect(doc.querySelector('[role="alert"]')).toBeNull();
    expect(blocks(doc, "COMP2310 ComA")).toHaveLength(0);
  });
});
