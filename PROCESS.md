# Process overview

## What I built

A redesign of one slice of ANU's timetable Web Publisher: planning a week.
You pin the class you intend to take, so the week shows your real timetable
instead of every option at once, with tools for fitting it into as few days
as possible. `README.md` explains how it works.

## How I got here

I always try to fit my subjects into as few days as possible, and Web
Publisher never lets me set a class aside to see the result. So I started
there: subjects, activities and classes in SQLite, and pins saved per
browser so a plan survives a reload
([`9122e64`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/9122e64),
[`a943c81`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/a943c81)).
Pinning a class hides its activity's other times, which became the core of
the redesign.

I first styled it to match Web Publisher exactly, but that looked dated and
left no room for the features, so I moved to a cleaner layout that keeps its
dark bar, beige accent and activity colours
([`1e199d5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/1e199d5)).
The same commit adds the planning tools. Single-class lectures pin
themselves, since there's no choice to make. "Keep days free" fades classes
on days you want off. A suggester finds a clash-free plan on the fewest
days, but only previews it, so your choices never change without you. I
kept a subject dropdown because it's quicker than searching, and moved
"Unpin all" away from "Remove all subjects" after deleting my subjects by
mistake.

Lectures took two attempts. A single "skip lectures" setting was too blunt,
because skipping only matters on a day you want free, so each lecture on a
free day now has its own "Watch recording" checkbox
([`e174a09...62926ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/compare/e174a09...62926ea)).

Tests against the running app check that pins persist, stay per browser and
flag clashes, and I tried every change in the browser, which is where most
of these decisions came from.
