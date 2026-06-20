# To Issues

Break a PRD into independently-grabbable tasks as vertical slices.

## Process

1. Locate the PRD. If a path isn't provided, search the repo or ask.
2. Explore the codebase to understand current architecture, integration points, and module boundaries.
3. Draft vertical slices (tracer bullets):
   - Each slice cuts through ALL integration layers (DB → API → UI), not a horizontal slice of one layer.
   - Each slice is independently shippable and testable.
   - Order slices to flush out unknown unknowns early — the riskiest integration first.
4. Establish blocking relationships:
   - Mark which issues block others.
   - Identify which can be worked in parallel.
5. For each issue, write:
   - **Title**: Short imperative sentence.
   - **Slice**: What layers it touches.
   - **Acceptance criteria**: How to verify it works.
   - **Blocked by**: List of prerequisite issues (or "none").
   - **Risk**: What unknown unknowns this slice exposes.

Output as a numbered list. Ask user if they want it written to a file or posted somewhere.
