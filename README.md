# How the planner works

ANU's timetable Web Publisher shows you every class time of every activity
of every subject, all at once. That's useful for seeing your options. It's no
help at all for the question most students are actually asking: *if I take
these classes, what does my week look like?*

This planner answers that question. Pick your subjects, then **pin** the one
class you intend to take for each activity. A pinned activity shows only
that class, and its other times disappear, so the week fills in with your
real timetable while the choices you haven't made yet stay visible.

It's a prototype. The subjects and class times are invented, and nothing
here enrols you in anything. When you've settled on a plan, you still enrol
through MyTimetable.

## The words it uses

- **Subject**: a course, like COMP2100 Software Design Methodologies.
- **Activity**: one kind of class a subject runs each week, with its code:
  **LecA** is a lecture stream, **TutA** a tutorial, **ComA** a computer lab,
  **WrkA** a workshop. You attend one class of every activity.
- **Class**: one time an activity is offered, numbered 01, 02, and so on.
  Lectures often have a single class; tutorials and labs usually have many.
- **Pin**: your choice of class for an activity. Pins aren't enrolments,
  just a draft you can change as often as you like.
- **Fixed**: an activity with only one class, usually a lecture. There's no
  choice to make, so it's in your week from the moment you add the subject.

## Step by step

1. **Add your subjects.** On the Planner, choose a subject from the *Add a
   subject* dropdown and press **Add**. It appears under *Your subjects*, and
   every class it offers appears on *Your week* as a faded, dashed block.
   Add the rest of your subjects the same way.
2. **Mark the days you'd rather keep free.** Under *Your week*, press a
   day in *Keep days free*, such as Fri. Classes on that day fade out, so
   the options that keep it clear stand out. Press it again to undo.
   If a lecture you've pinned falls on one of those days, it's listed in an
   amber note above the week, with a **Watch recording** checkbox next to
   it. Tick it if you'll catch up on the recording instead of going. The
   lecture stays on the week, faded and marked *Recorded*, but stops
   counting: it can't clash with anything, doesn't break the free day, and
   doesn't add a day on campus. Only lectures get the checkbox, since
   tutorials and labs aren't recorded.
3. **Pin your classes, working around what's fixed.** Lectures with a
   single class are already there, marked *Fixed*. For everything else,
   press **Pin** next to a class in the list, or click its block on the
   week. It turns solid. As you pin, any class that overlaps something
   you've pinned turns grey and hatched, and the list tells you what it
   clashes with. To fit everything into fewer days, choose classes on days
   you're already on campus.
4. **Or let the planner suggest a plan.** Press **Suggest a fewest-days
   plan**. The planner tries every combination of the classes you haven't
   pinned and picks the one that, in order, keeps your free days clear,
   puts you on campus the fewest days, and leaves the least time between
   classes, with no clashes. The suggested classes appear outlined on the
   week, with a summary above. Press **Pin these classes** to keep them, or
   **Discard** to go back. Your own pins are never changed.
5. **Change your mind freely.** To swap a pinned class, open *Switch class*
   under it and pin a different one, or press **Unpin** (or click the solid
   block) to bring every option back.
6. **Check for clashes.** If two pinned classes overlap, a red box above the
   week names them, the day, and the overlapping hours, and both blocks get
   a red outline. Fix it by switching one of them. If a pinned or fixed
   class falls on a day you want free, an amber note says so.
7. **Start over if you need to.** **Unpin all classes**, above the week,
   clears every pin but keeps your subjects (fixed classes stay). **Remove all subjects…**, at the
   bottom of your subjects list, clears everything. It asks you to confirm
   first.

## Reading the week

- **Solid block**: a class you've pinned.
- **Outlined block**: a class in a suggested plan you haven't accepted yet.
- **Faded, dashed block**: a class you could still choose.
- **Grey, hatched block**: a class that clashes with one you've pinned.
- **Very faint block**: a class on a day you want to keep free.
- **Dotted block marked "Recorded"**: a lecture you'll watch as a
  recording.
- **Colour**: the kind of activity, as in Web Publisher. Lectures are
  lavender, computer labs blue, tutorials green and workshops pink.

When several classes run at the same time on the same day, they share the
column side by side. The subjects list keeps to class, day and time; each
block on the week shows its location, and hovering over it (or focusing it
with the keyboard) shows its full details.

## Your plan is saved

Your subjects and pins are saved as you go. Reload the page, close the tab,
or come back tomorrow, and your plan is still there. It belongs to this
browser. There are no accounts, so another browser or device starts with an
empty plan. If you have the planner open in two tabs, a change in one shows
up in the other.

## Why it works this way

- **One slice, done properly.** This isn't a rebuild of the whole timetable
  system. It changes the one part that makes planning painful: seeing every
  option at once, with no way to set a choice aside.
- **Choices disappear once made.** A pinned activity collapses to one class,
  in the list and on the week, so the space goes to what you still need to
  decide.
- **Fewer days is the goal.** Keeping days free and asking for a
  suggestion turn "can I fit this into three days?" into a single click,
  instead of an evening of trial and error.
- **Suggestions are only suggestions.** A suggested plan never touches
  your pins and never pins anything until you accept it.
- **Clashes show up before you make them.** Marking classes that overlap a
  pin turns "does this fit?" from guesswork into something you can see.
- **Subjects come from a dropdown.** Web Publisher makes you search by code.
  A list of what's on offer is quicker when you already know your subjects.
- **Mistakes are cheap to undo, and hard to make.** Every pin can be
  undone in one click. The one action that loses work, removing all
  subjects, asks you to confirm and sits away from the everyday buttons.
- **It stays recognisable.** The dark bar, the beige accent and colour by
  activity type come from Web Publisher, so it still feels like the ANU tool
  you know, just easier to plan with.
