# One manuscript, many hands

This contract protects the identity of Untranslatable as its world and source
grow. A contribution can change the composition; it should still look as
though the same artist made it.

## The fixed language

| Element | Parameter | Enforcement |
|---|---|---|
| Paper | `#f0e8d9` | One world surface; no visitor backgrounds |
| Ink | `#282429`, `#2b4587`, `#a74343` | Server accepts only named ink values |
| Hand | 2–5 irregular curved pen gestures per glyph | Deterministic renderer; no visitor SVG, fonts or images |
| Pen | 9–24 unit glyphs; thin variable pressure | Renderer owns size and stroke weight |
| Loose thread | One fine, continuous curved line | Separate constrained pen; no filled shapes |
| Space | 72 units around every work | Atomic server collision check |
| Density | At most 18 traces per 2,400-unit region | Atomic server capacity check |
| Scale | Each trace fits within 1,600 units | Shared client/server rules |
| Complexity | 128 strokes, 512 points per stroke, 4,096 points total | Server validation |
| Existing work | Append only; no visitor edit/delete route | API contract |
| Motion | Slow, small movement; explicit pause | Client; reduced motion starts paused |
| Sound | Silent in this release; ambient album layer in a later phase | Sound starts only by choice |

World coordinates currently run from −50,000 to +50,000. That is an explicit
capacity boundary, not a claim of infinite storage. Expand it through a
versioned change after testing precision and performance.

## What is allowed to grow

The number of contributions, their routes across the paper, the relationships
between passages, new ways to navigate them, accessibility, rendering speed,
self-hosting support, and ways to preserve/export the shared work.

New pens must produce a recognisable relative of the existing hand. Prove this
with side-by-side images at the same scale, using the original artwork as the
reference. A new pen is an explicit design change, never a hidden side effect
of a dependency update. Keep the old renderer available for existing data.

## What stays outside the core

Profiles, rankings, likes, follower counts, advertising, attention rewards,
chat, arbitrary uploads, new palettes, generated biographies and
interfaces that compete with the manuscript. Forks may pursue another identity;
the core does not silently turn into that fork.

## Calm is a constraint

No flashes, abrupt scene changes, forced camera rides, countdowns or attention
rewards. The visitor controls their pace and can always return to the beginning.
Movement stays slow and interruptible. Pausing preserves the whole experience.
Empty paper is part of the work; growth must preserve it.

The audiovisual direction is an album experienced as a place. Future sound
belongs to locations and relationships in this manuscript. Movement should
produce gradual blends, with no abrupt changes in loudness. Always provide a
visible mute and independent volume control. Sound needs an explicit start;
the visual world remains complete in silence. An interactive sound layer must
use supplied or cleared music, preserve the artist's arrangements, and document
its transitions before it enters the core. This release contains no audio.

## Changes without the original makers

Ordinary additions to the world pass the rules automatically. They need no
manual review. Code changes go through the same public tests and one
independent review. Review the observable result, not who proposed it.

Accessibility and performance fixes may preserve the current design version.
A change to the palette, gesture family, spatial rules or saved format must
name the changed rule, include before/after visual evidence, preserve old
marks, and increment the appropriate version. Default to the existing contract
when there is no evidence for changing it.

Tests protect mechanical rules; human reviewers protect the artistic identity.
Open source makes stewardship transferable. It does not mean unreviewed code
should automatically replace the live world.

The executable parameters are in `public/rules.js`. Tests and this document
must change together when a parameter changes.
