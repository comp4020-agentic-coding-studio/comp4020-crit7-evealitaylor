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

  it("counts a single-class activity as pinned from the start, and won't unpin it", async () => {
    const [lecture] = blocks(await me.load(), "COMP2100 LecA");
    expect(lecture.dataset.state).toBe("pinned");
    expect(lecture.hasAttribute("data-fixed")).toBe(true);
    expect(lecture.querySelector("input[name='action']")).toBeNull();
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

describe("adding subjects and starting over", () => {
  const me = new Browser();

  it("offers only subjects not yet added in the dropdown", async () => {
    const before = [...(await me.load()).querySelectorAll("#subject option")].map((o) => o.getAttribute("value"));
    expect(before).toContain("COMP3600");
    await me.post({ action: "add-subject", subject: "COMP3600" });
    const after = [...(await me.load()).querySelectorAll("#subject option")].map((o) => o.getAttribute("value"));
    expect(after).not.toContain("COMP3600");
    expect(blocks(await me.load(), "COMP3600 TutA")).toHaveLength(5);
  });

  it("unpins every class but keeps the subjects", async () => {
    await me.post({ action: "pin", class: classId(await me.load(), "COMP3600 TutA/02") });
    await me.post({ action: "unpin-all" });
    const doc = await me.load();
    // fixed, single-class activities stay: there's nothing to unpin them to
    expect(doc.querySelectorAll('[data-state="pinned"]:not([data-fixed])')).toHaveLength(0);
    expect(blocks(doc, "COMP3600 TutA")).toHaveLength(5);
  });

  it("removes every subject only through the confirm step", async () => {
    const doc = await me.load();
    // the clear button is tucked inside a closed <details>, away from Unpin all
    const clear = doc.querySelector('input[name="action"][value="clear"]');
    expect(clear?.closest("details")).not.toBeNull();
    expect(clear?.closest("details")?.hasAttribute("open")).toBe(false);
    await me.post({ action: "clear" });
    expect((await me.load()).querySelectorAll(".week [data-class]")).toHaveLength(0);
  });
});

describe("keeping days free", () => {
  const me = new Browser();
  // COMP2100 ComA/07 is Fri 11–13; ComA/01 is Mon 09–11.

  beforeAll(async () => {
    await me.load();
    await me.post({ action: "add-subject", subject: "COMP2100" });
    await me.post({ action: "toggle-day", day: "4" });
  });

  const state = async (name: string) =>
    (await me.load()).querySelector<HTMLElement>(`.week [data-class="${name}"]`)?.dataset.state;

  it("fades options on a day kept free, and remembers the choice", async () => {
    expect(await state("COMP2100 ComA/07")).toBe("avoided");
    expect(await state("COMP2100 ComA/01")).toBe("option");
    const toggle = (await me.load()).querySelector('button[aria-label="Keep Friday free"]');
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");
  });

  it("toggles back off", async () => {
    await me.post({ action: "toggle-day", day: "4" });
    expect(await state("COMP2100 ComA/07")).toBe("option");
  });
});

describe("suggesting a fewest-days plan", () => {
  const me = new Browser();
  // Fixed: COMP2100 LecA Tue, LecB Thu; COMP2310 LecA Mon. Both labs have a
  // class on Mon, Tue or Thu, so the best plan needs only those three days.

  beforeAll(async () => {
    await me.load();
    await me.post({ action: "add-subject", subject: "COMP2100" });
    await me.post({ action: "add-subject", subject: "COMP2310" });
  });

  const suggest = async () => {
    const res = await fetch(new URL("/?suggest=1", baseUrl), { headers: { cookie: me.cookie } });
    return new JSDOM(await res.text()).window.document;
  };

  it("previews a clash-free plan on the fewest days without pinning anything", async () => {
    const doc = await suggest();
    expect(doc.querySelector(".suggestion h3")?.textContent).toContain("3 days on campus");
    expect(doc.querySelectorAll('.week [data-state="suggested"]')).toHaveLength(2);
    expect(doc.querySelector('[role="alert"]')).toBeNull();
    // nothing was pinned by looking
    expect((await me.load()).querySelectorAll('.week [data-state="suggested"]')).toHaveLength(0);
    expect(blocks(await me.load(), "COMP2100 ComA")).toHaveLength(7);
  });

  it("pins the suggested classes when accepted", async () => {
    const accept = (await suggest()).querySelector('input[name="action"][value="accept"]')?.closest("form");
    const ids = [...(accept?.querySelectorAll('input[name="class"]') ?? [])].map((i) => i.getAttribute("value") ?? "");
    expect(ids).toHaveLength(2);
    const body = new URLSearchParams([["action", "accept"], ...ids.map((id) => ["class", id])]);
    await fetch(new URL("/api/plan", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl, cookie: me.cookie },
      body,
      redirect: "manual",
    });
    const doc = await me.load();
    expect(doc.querySelector("#status")?.textContent).toContain("5 of 5");
    expect(blocks(doc, "COMP2100 ComA")).toHaveLength(1);
    expect(doc.querySelector('[role="alert"]')).toBeNull();
  });

  it("respects existing pins and free days", async () => {
    await me.post({ action: "unpin-all" });
    await me.post({ action: "toggle-day", day: "0" }); // keep Monday free
    const doc = await suggest();
    // COMP2310's lecture is fixed on Monday, so that can't be helped, but
    // neither lab should land there
    const suggested = [...doc.querySelectorAll<HTMLElement>('.week [data-state="suggested"]')];
    expect(suggested).toHaveLength(2);
    for (const b of suggested) expect(b.closest(".day")?.querySelector("h3")?.textContent).not.toContain("Mon");
  });
});

describe("watching lectures as recordings", () => {
  const me = new Browser();
  // COMP2100 LecA/01 (fixed) is Tue 10–12, LecB/01 (fixed) Thu 14–15, and
  // ComA/03 (a lab) Tue 14–16. COMP2310 ComA/02 is Tue 09–11.

  beforeAll(async () => {
    await me.load();
    await me.post({ action: "add-subject", subject: "COMP2100" });
    await me.post({ action: "add-subject", subject: "COMP2310" });
    await me.post({ action: "pin", class: classId(await me.load(), "COMP2100 ComA/03") });
  });

  const block = async (name: string) =>
    (await me.load()).querySelector<HTMLElement>(`.week [data-class="${name}"]`);
  const recordBox = (doc: Document, name: string) =>
    [...doc.querySelectorAll(".free-day-note li")]
      .find((li) => li.textContent?.includes(name))
      ?.querySelector<HTMLInputElement>('input[name="recorded"]');
  const lectureId = async () =>
    (await me.load())
      .querySelector('.free-day-note input[name="action"][value="record"] ~ input[name="activity"]')
      ?.getAttribute("value") ?? "";

  it("offers no recording option until the lecture is on a day kept free", async () => {
    expect((await me.load()).querySelector('input[name="recorded"]')).toBeNull();
    expect((await block("COMP2310 ComA/02"))?.dataset.state).toBe("clashing");
  });

  it("offers it next to lectures on a free day, and only lectures", async () => {
    await me.post({ action: "toggle-day", day: "1" }); // keep Tuesday free
    const doc = await me.load();
    expect(recordBox(doc, "COMP2100 LecA/01")).toBeTruthy();
    // the lab is listed as being on Tuesday too, but gets no checkbox
    const lab = [...doc.querySelectorAll(".free-day-note li")].find((li) => li.textContent?.includes("ComA/03"));
    expect(lab).toBeTruthy();
    expect(lab?.querySelector('input[name="recorded"]')).toBeNull();
  });

  it("stops a recorded lecture counting, and remembers it", async () => {
    await me.post({ action: "record", activity: await lectureId(), recorded: "on" });
    expect((await block("COMP2100 LecA/01"))?.hasAttribute("data-skipped")).toBe(true);
    // nothing clashes with a lecture you aren't attending
    expect((await block("COMP2310 ComA/02"))?.dataset.state).not.toBe("clashing");
    expect(recordBox(await me.load(), "COMP2100 LecA/01")?.checked).toBe(true);
  });

  it("won't record a class that isn't a lecture", async () => {
    const labActivity = (await block("COMP2100 ComA/03"))?.querySelector('input[name="activity"]')?.getAttribute("value");
    await me.post({ action: "record", activity: labActivity ?? "", recorded: "on" });
    expect((await block("COMP2100 ComA/03"))?.hasAttribute("data-skipped")).toBe(false);
  });

  it("counts the lecture again once its day is no longer free", async () => {
    await me.post({ action: "toggle-day", day: "1" });
    expect((await block("COMP2100 LecA/01"))?.hasAttribute("data-skipped")).toBe(false);
    expect((await block("COMP2310 ComA/02"))?.dataset.state).toBe("clashing");
  });

  it("leaves recorded lectures out of a suggested plan's days", async () => {
    // Keep Tue and Thu free and watch both COMP2100 lectures recorded: then
    // a plan can stay on Monday alone.
    await me.post({ action: "unpin-all" });
    await me.post({ action: "toggle-day", day: "1" });
    await me.post({ action: "toggle-day", day: "3" });
    for (const name of ["COMP2100 LecA/01", "COMP2100 LecB/01"]) {
      const li = [...(await me.load()).querySelectorAll(".free-day-note li")].find((l) => l.textContent?.includes(name));
      const activity = li?.querySelector('input[name="activity"]')?.getAttribute("value") ?? "";
      await me.post({ action: "record", activity, recorded: "on" });
    }
    const res = await fetch(new URL("/?suggest=1", baseUrl), { headers: { cookie: me.cookie } });
    const doc = new JSDOM(await res.text()).window.document;
    expect(doc.querySelector(".suggestion h3")?.textContent).toContain("1 day on campus (Mon)");
  });
});
