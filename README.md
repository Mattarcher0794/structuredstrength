# Wildlog

**Live at [wildlog.life](https://wildlog.life)**

Snap or upload a photo, get the species identified in seconds,
and keep every sighting in a personal life list.

## Why

Wildlife ID apps generally optimise for the identification and
treat the record as an afterthought. The interesting part is the
list you build over time, not the single lookup. Wildlog treats
the sighting as the primary object and identification as the way
you create one.

## What I owned

Everything. The idea, the model of what a sighting is and what
gets stored, the identification flow, the interface, and the
release.

## Product decisions worth noting

- **Identification returns a species, a habitat and one fact
  worth knowing.** Three fields, not a wall of taxonomy. The
  target user is curious, not scientific.
- **Sighting saves in one action from the result screen.** Every
  extra step between identification and record loses the entry,
  which is the thing the product is actually for.
- **Built as an installable web app rather than native.** Camera
  access without an app store, and the whole thing ships in
  evenings.

## Built with

Lovable, TypeScript.

## What I'd do differently

[Two or three lines. Be specific and slightly critical: what the
identification gets wrong, what the data model can't yet handle,
what you'd need a real backend for. This paragraph does more work
than the rest of the README combined.]
