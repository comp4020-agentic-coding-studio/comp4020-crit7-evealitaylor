# Process overview

## What I built

A redesign of one slice of ANU's timetable Web Publisher: planning a week.
Instead of showing every class time for every activity at once, it lets you
pin the class you intend to take so the week shows your real timetable, and
it gives you tools for fitting that week into as few days as possible.
`README.md` explains how it works.

## How I got here

The project started from a frustration I have every semester:

> as someone who needs to fit all my subjects into as few days as possible,
> ive always hated how i cant temporarily select a single class that i
> intend to enrol in so that i can look at what my timetable would look
> like … so i want the redesign to focus on adding that specific feature

The first working version modelled subjects, activities and classes in
SQLite, and let you pin one class per activity, saved against your browser
so a plan survives a reload
([`9122e64`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/9122e64),
[`a943c81`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/a943c81)).
Once a class was pinned, its activity's other times disappeared, and that
immediately felt like the heart of the redesign:

> i really like how once its selected the other options go away to clear up
> space for what already needs to be added … i dont think it should stray
> too far away from that original design in this inital redesign

I restyled the page to match Web Publisher closely, with its header, notice
banner and beige panels. Seeing it finished, I realised it now looked dated
and cramped for the new features, so I pulled it back and pointed the rest
of the work at the actual problem:

> i think youve gone too much in the direction of the original so scale it
> back a little - it still should look aesthetic and more in line with
> current modern builds … how can we improve this one piece around
> timetable planning and working out an efficient class schedule

The result keeps Web Publisher's dark tab bar, beige accent and colour by
activity type, so it still feels like the ANU tool, inside a cleaner
modern layout
([`1e199d5`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/commit/1e199d5)).
The same commit carries three planning features I chose because each
removes a step I do by hand. Lectures with only one class now count as
pinned automatically, since there's no decision to make and pinning them
was busywork. "Keep days free" toggles fade out every class on the days you
want off, so the options that keep those days clear stand out. And "Suggest
a fewest-days plan" searches every combination of your unpinned classes for
one with no clashes that avoids your free days, then uses the fewest days
on campus, then leaves the least time between classes. It only previews
until you accept, because a planner that silently moved your choices would
be worse than none.

Two smaller changes in that commit came from using it. Web Publisher makes
you search by code, but I kept a dropdown:

> i liked that the subjects were in a dropdown which isnt how it normally
> goes but would honestly be easier for students but especially for testing.
> make an unpin all button because i accidentally removed the subjects when
> i just wanted to unpin the classes

That accident is why "Unpin all classes" now sits above the week, while
"Remove all subjects" is at the bottom of the list behind a confirmation.
The subject list also stopped showing locations, which doubled its length
for information you only need once a class is chosen; they stay on the
week grid.

The last feature changed shape twice. Most lectures are recorded, so I
wanted students who skip them to see a truer week:

> for days free add a select for if you want to include lectures as most of
> them are recorded these days so some people chose to skip them and catch
> up later if they have bigger work schedules

A single setting for all lectures turned out to be too blunt. Skipping only
matters when a lecture lands on a day you're trying to keep free, so I
narrowed it:

> just make it a checkbox for classes on days you want free, just next to
> them someone can select watch recording, only if its classed as a lecture
> though

Now each lecture on a free day has a "Watch recording" checkbox. Ticked, it
stays visible but stops counting towards clashes, free days and the
suggester
([`e174a09...62926ea`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-evealitaylor/compare/e174a09...62926ea)).

I knew each step was right from two directions: `spec/timetable.test.ts`
checks the contracts against the running app (pins survive a reload and
belong to one browser, clashes are flagged, suggestions never pin anything
until accepted), and I tried every change in the browser myself, which is
how I found the problems that drove most of these changes.
