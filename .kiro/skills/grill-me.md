# Grill Me

Interview the user relentlessly about every aspect of a plan until reaching shared understanding.

## Process

1. Identify the plan or feature under discussion.
2. Walk down each branch of the design tree one decision at a time.
3. For each decision point:
   - If the answer can be determined by exploring the codebase, explore it yourself instead of asking.
   - If it requires a product/UX judgment, ask the user directly.
4. Resolve dependencies between decisions explicitly — don't move to a downstream question until its upstream dependency is settled.
5. Challenge vague answers. Ask "what happens when..." and "what if..." to surface edge cases.
6. Summarize the resolved decisions periodically so the user can correct drift.
7. Stop when every branch terminates in either a concrete decision or an explicit "defer."
