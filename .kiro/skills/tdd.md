# TDD

Strict red-green-refactor test-driven development.

## Process

1. Confirm which interface changes are needed for the feature. Read existing code first.
2. Look at module structure. Prefer larger modules with thin interfaces over many small files.
3. Confirm which behaviors to test with the user. List them as plain-English assertions.
4. Design interfaces for testability — inject dependencies, avoid global state.
5. Loop (one behavior at a time):
   - **Red**: Write ONE failing test that asserts the next behavior. Run it. Confirm it fails for the right reason.
   - **Green**: Write the minimum code to make the test pass. No more.
   - **Refactor**: Look for duplication, unclear names, or structural improvements. Apply them. Re-run tests to confirm green.
6. After each green, check: is there a refactoring candidate across the module? If yes, refactor now while tests protect you.
7. Repeat step 5 until all behaviors from step 3 are covered.

## Rules

- Never write production code without a failing test first.
- Never write more than one failing test at a time.
- If a test is hard to write, the interface needs redesigning — fix the interface first.
- Run the full test suite after each refactor step.
