// The class catalogue. Invented, but shaped like a real ANU semester in the
// web publisher: one or two lecture streams everyone attends, and tutorials
// and labs offered many times a week, which is where the choosing happens.
//
// Each class is "day start–end location": day is Mon..Fri, times are 24h.

type Row = [label: string, when: string, location: string];
type ActivitySeed = { code: string; kind: string; weeks: string; classes: Row[] };
type SubjectSeed = { code: string; name: string; activities: ActivitySeed[] };

const ALL = "1-6, 9-14";
const TUTS = "2-6, 9-13";

export const CATALOGUE: SubjectSeed[] = [
  {
    code: "COMP2100",
    name: "Software Design Methodologies",
    activities: [
      { code: "LecA", kind: "Lecture", weeks: ALL, classes: [["01", "Tue 10:00-12:00", "Kambri Cultural Centre, Cinema"]] },
      { code: "LecB", kind: "Lecture", weeks: ALL, classes: [["01", "Thu 14:00-15:00", "Kambri Cultural Centre, Cinema"]] },
      {
        code: "ComA",
        kind: "Computer Lab",
        weeks: TUTS,
        classes: [
          ["01", "Mon 09:00-11:00", "CSIT N113"],
          ["02", "Mon 13:00-15:00", "CSIT N113"],
          ["03", "Tue 14:00-16:00", "CSIT N114"],
          ["04", "Wed 09:00-11:00", "CSIT N113"],
          ["05", "Wed 16:00-18:00", "CSIT N114"],
          ["06", "Thu 10:00-12:00", "CSIT N113"],
          ["07", "Fri 11:00-13:00", "CSIT N114"],
        ],
      },
    ],
  },
  {
    code: "COMP2310",
    name: "Systems, Networks and Concurrency",
    activities: [
      { code: "LecA", kind: "Lecture", weeks: ALL, classes: [["01", "Mon 11:00-13:00", "Manning Clark Centre, Theatre 1"]] },
      {
        code: "ComA",
        kind: "Computer Lab",
        weeks: TUTS,
        classes: [
          ["01", "Mon 15:00-17:00", "Hanna Neumann 1.23"],
          ["02", "Tue 09:00-11:00", "Hanna Neumann 1.23"],
          ["03", "Tue 16:00-18:00", "Hanna Neumann 1.24"],
          ["04", "Wed 11:00-13:00", "Hanna Neumann 1.23"],
          ["05", "Thu 15:00-17:00", "Hanna Neumann 1.24"],
          ["06", "Fri 09:00-11:00", "Hanna Neumann 1.23"],
        ],
      },
    ],
  },
  {
    code: "MATH1014",
    name: "Mathematics and Applications 2",
    activities: [
      { code: "LecA", kind: "Lecture", weeks: ALL, classes: [["01", "Mon 14:00-15:00", "Llewellyn Hall"]] },
      { code: "LecB", kind: "Lecture", weeks: ALL, classes: [["01", "Wed 14:00-15:00", "Llewellyn Hall"]] },
      { code: "LecC", kind: "Lecture", weeks: ALL, classes: [["01", "Fri 14:00-15:00", "Llewellyn Hall"]] },
      {
        code: "TutA",
        kind: "Tutorial",
        weeks: TUTS,
        classes: [
          ["01", "Mon 10:00-11:00", "Hanna Neumann 2.02"],
          ["02", "Tue 12:00-13:00", "Hanna Neumann 2.02"],
          ["03", "Tue 15:00-16:00", "Marie Reay 5.02"],
          ["04", "Wed 10:00-11:00", "Hanna Neumann 2.02"],
          ["05", "Wed 15:00-16:00", "Marie Reay 5.02"],
          ["06", "Thu 09:00-10:00", "Hanna Neumann 2.02"],
          ["07", "Thu 12:00-13:00", "Marie Reay 5.02"],
          ["08", "Fri 10:00-11:00", "Hanna Neumann 2.02"],
        ],
      },
    ],
  },
  {
    code: "STAT2001",
    name: "Introductory Mathematical Statistics",
    activities: [
      { code: "LecA", kind: "Lecture", weeks: ALL, classes: [["01", "Tue 13:00-14:00", "Coombs Lecture Theatre"]] },
      { code: "LecB", kind: "Lecture", weeks: ALL, classes: [["01", "Thu 13:00-14:00", "Coombs Lecture Theatre"]] },
      {
        code: "TutA",
        kind: "Tutorial",
        weeks: TUTS,
        classes: [
          ["01", "Mon 16:00-17:00", "CBE 2.05"],
          ["02", "Tue 11:00-12:00", "CBE 2.05"],
          ["03", "Wed 12:00-13:00", "CBE 2.06"],
          ["04", "Thu 11:00-12:00", "CBE 2.05"],
          ["05", "Thu 16:00-17:00", "CBE 2.06"],
        ],
      },
    ],
  },
  {
    code: "COMP3600",
    name: "Algorithms",
    activities: [
      { code: "LecA", kind: "Lecture", weeks: ALL, classes: [["01", "Wed 09:00-11:00", "Manning Clark Centre, Theatre 2"]] },
      {
        code: "TutA",
        kind: "Tutorial",
        weeks: TUTS,
        classes: [
          ["01", "Mon 12:00-13:00", "CSIT N101"],
          ["02", "Tue 15:00-16:00", "CSIT N101"],
          ["03", "Wed 13:00-14:00", "CSIT N101"],
          ["04", "Thu 10:00-11:00", "CSIT N101"],
          ["05", "Fri 12:00-13:00", "CSIT N101"],
        ],
      },
    ],
  },
  {
    code: "ENGN1211",
    name: "Discovering Engineering",
    activities: [
      { code: "LecA", kind: "Lecture", weeks: ALL, classes: [["01", "Thu 09:00-11:00", "Marie Reay Theatre"]] },
      {
        code: "WrkA",
        kind: "Workshop",
        weeks: TUTS,
        classes: [
          ["01", "Mon 09:00-12:00", "Ian Ross 2.01"],
          ["02", "Tue 13:00-16:00", "Ian Ross 2.01"],
          ["03", "Wed 13:00-16:00", "Ian Ross 2.01"],
          ["04", "Fri 09:00-12:00", "Ian Ross 2.01"],
        ],
      },
    ],
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function parseWhen(when: string): { day: number; start: number; end: number } {
  const match = /^(\w{3}) (\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(when);
  if (!match || !DAYS.includes(match[1])) throw new Error(`bad class time: ${when}`);
  const [, day, sh, sm, eh, em] = match;
  return { day: DAYS.indexOf(day), start: +sh * 60 + +sm, end: +eh * 60 + +em };
}
