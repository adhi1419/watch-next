# To PRD

Turn a user's idea into a structured PRD with user stories.

## Process

1. Ask the user for a detailed description of what they want. Accept freeform input.
2. Explore the repo to verify assertions about the current state — don't trust claims without checking code.
3. Interview the user relentlessly (grill-me approach) to resolve ambiguity, edge cases, and scope. Skip if a grill-me session already happened in this conversation.
4. Sketch out the major modules/components needed. List them with one-line responsibilities.
5. Write the PRD:
   - **Goal**: One sentence.
   - **Non-goals**: What this deliberately excludes.
   - **Current state**: What exists today (verified from code).
   - **Modules**: Components and their boundaries.
   - **User Stories**: Each as "As a [user], I want [action], so that [outcome]" with acceptance criteria.
   - **Open questions**: Anything unresolved from the interview.

Output the PRD as a markdown file in the repo (ask user where to put it, default: `docs/prd-<feature>.md`).
