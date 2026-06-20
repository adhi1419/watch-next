# Improve Codebase Architecture

Find candidates for deepening shallow modules into deeper ones with clearer boundaries.

## Process

1. Explore the codebase structure — directory layout, module boundaries, file sizes.
2. Identify symptoms:
   - **Fragmentation**: Understanding one concept requires bouncing between many small files. Look for directories with 10+ files under 50 lines each.
   - **Testability extractions**: Pure functions extracted solely for unit testing, but real bugs hide in how they're called (the integration seam). Look for `utils/` or `helpers/` that are only imported from one place.
   - **Tight coupling**: Modules that always change together, or where modifying one requires understanding the internals of another. Look for circular imports or shotgun surgery patterns.
3. For each candidate, assess:
   - What concept is scattered that should be unified?
   - What would the deeper module's interface look like? (Fewer, more powerful operations.)
   - What information would be hidden behind that interface?
4. Present candidates ranked by impact (how much cognitive load they eliminate).
5. For each candidate, sketch the target state: new module boundary, public interface, what gets absorbed.

## Output

A ranked list of refactoring candidates with before/after module boundaries. Ask user which to pursue.
