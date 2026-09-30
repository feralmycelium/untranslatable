# Working on Untranslatable

Read DESIGN-CONTRACT.md before choosing a visual or interaction direction.
Keep the accepted handwriting, cream paper and three inks. User marks are
constrained art data, never executable markup. Do not add social dashboards,
identity systems or arbitrary uploads. A future spatial ambient album layer
is approved as a direction; this release builds the silent visual foundation.

Keep changes bounded. Test behavioural changes before implementation. Data
tests use temporary SQLite databases; never clear the live world to test.
Client and server rules must agree. Guard spacing/capacity atomically.

Observe desktop, phone, keyboard, drawing, publish, independent-client sync,
draft recovery and reduced-motion behaviour before claiming a visual change
works. Keep previous records renderable. Do not rewrite applied migrations.
Public patches must exclude data/, local evidence,
secrets and dependency/build output.
