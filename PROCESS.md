# Process overview

## What I built

A redesign of one slice of ANU's timetable Web Publisher: pinning the class
you intend to take, so the week shows your real timetable instead of every
option at once, plus tools for fitting that week into as few days as
possible. `README.md` explains how it works.

## How I got here

I started from my own frustration, and the first prompt set the scope:

> as someone who needs to fit all my subjects into as few days as possible,
> ive always hated how i cant temporarily select a single class … so i want
> the redesign to focus on adding that specific feature

The agent read the brief and starter, asked me to pick the data, identity
and scope, then split setup from the feature:
[`9122e64`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/9122e64),
[`a943c81`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/a943c81).

Most of my direction was correction. I asked it to borrow more from the
original, and it went too far, so I pulled it back:

> i think youve gone too much in the direction of the original so scale it
> back a little … how can we improve this one piece around timetable
> planning and working out an efficient class schedule

That produced fixed lectures, "keep days free" and a fewest-days suggester
([`1e199d5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/1e199d5)).
A global "skip lectures" setting became a per-lecture checkbox when I
pointed out only lectures on free days need it
([`e174a09...62926ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/compare/e174a09...62926ea)).

Each rule I stated went into `CLAUDE.md`
([`b8d9950`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/b8d9950)):
restart the dev server so I could watch changes, confirm destructive
actions (after I wiped my subjects by accident), commit as I go.

I knew it was right from two sides: `spec/timetable.test.ts` checks the
contracts over HTTP (pins survive a reload, stay per-browser, clashes are
flagged), and I checked every change in the browser myself.
