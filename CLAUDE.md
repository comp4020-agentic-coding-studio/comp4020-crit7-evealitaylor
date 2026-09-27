# Harness

Rules for working in this repo. They come from what I've asked for while
building it; when I state a new preference or rule in conversation, add it
here in the section it belongs to.

## What this app is

A redesign of one feature of ANU's MyTimetable web publisher
(mytimetable.anu.edu.au). Today it only shows every class time for every
activity of every subject at once. I want to pin the one class I intend to
enrol in for an activity and see what my timetable would actually look like,
because I try to fit my subjects into as few days as possible.

- The brief says "don't rebuild the whole thing; model the slice that annoys
  you". My slice is timetable planning: working out an efficient class
  schedule. Improvements go into that piece, not into the rest of the system.
- Course and class data is invented but ANU-style (LecA/TutA/ComA codes, real
  campus building names). It is not scraped from the real site.
- No logins: a browser is a student, identified by a cookie. Pins belong to
  that browser only.
- In scope beyond pinning: clash warnings between pinned classes; marking
  unpinned options that clash with a pinned class; single-class activities
  counting as pinned automatically ("Fixed"); "keep days free" toggles that
  fade options on those days; and a "suggest a fewest-days plan" solver the
  student previews, then accepts or discards. Not chosen: a days-on-campus
  summary. Ask before adding features I haven't picked.
- A suggestion never overrides the student's own pins, and never pins
  anything until they accept it.
- Lectures are often recorded, and some students skip them to watch later.
  A "lectures" setting next to "Keep days free" lets them choose: when
  lectures are skipped, they still show (faded, as recorded) but don't
  count for clashes, free days, days on campus, or suggestions.
- Keep the behaviour I like: once a class is pinned, the activity's other
  options disappear, freeing space for what still needs choosing.

## Design

- Keep it recognisably Web Publisher (a dark tab bar, the beige `#F5EDDE`
  accent, blocks coloured by activity type), but it should look like a
  clean, modern build, not a copy of the original. Don't lean too far toward
  the original.
- Subjects are added from a dropdown, not the original's search. It's easier
  for students, and for testing.
- The subjects list shows class, day and time only, not locations: they
  take up a lot of room and aren't needed there. Locations stay on the week
  grid and in each block's details.
- Destructive actions get a confirmation step and sit apart from safe ones.
  Unpinning everything and removing every subject must never be one
  miss-click apart.

## Copy

- The About page is a user-facing explainer: how subject selection and
  pinning work, with step-by-step instructions.
- Don't mention Claude, or the harness files, in anything the site shows
  (README.md is published at /readme/).

## Working rules

- Whenever you change the site, restart `pnpm dev` so I can watch it update
  live.
- Keep this file up to date with the things I mention (see the top).

## Commits

- Commit as you make changes: each finished change gets its own commit
  straight away, rather than batching work up for me to approve later.
- Keep setup and plumbing (schema, migrations, seed data, removing starter
  code) in separate commits from feature work and its tests.
- Every commit should build and pass `pnpm check` on its own.
