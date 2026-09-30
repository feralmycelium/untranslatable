# Contributing

Read DESIGN-CONTRACT.md first. Keep the experience centred on exploring,
making and leaving a trace. The original cream, ink and handwriting are the
reference, including for contributions made by agents.

1. Run `npm install`, then `bun run dev`.
2. Write a failing behavioural test for a changed rule or data operation.
3. Make the smallest change, then run `bun test` and `bun run build`.
4. For visual changes, include desktop and phone captures and show the
   before/after at the same scale. Check touch, keyboard and reduced motion.
5. Request an independent review. Explain the user-visible change, the tests
   run, and whether DESIGN-CONTRACT.md or the saved format changes.

Do not rewrite applied migrations or regenerate existing contributions with a
different hand. Add a migration and a versioned renderer when necessary.
Never include a live database, local drafts, credentials or dependency caches
in a patch. Tests use temporary databases.

No bot auto-merges identity changes. Contributions to code use the MIT license.
Artwork contributions use CC BY 4.0 as described in ART-LICENSE.md.
