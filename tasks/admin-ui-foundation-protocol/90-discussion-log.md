# Discussion Log

## 2026-05-31

User reframed the Admin UI/UX problem:

- The largest issue is Admin UI foundation, not general business-dashboard UX.
- `PageScaffold`, form, and container protocols are underdeveloped.
- Product Admin reveals object-local action friction, especially creating SKU by moving between page top and editor bottom.
- Same semantic field kind can appear as different input primitives.
- Form components and navigation/context components are peers, creating complex data communication.
- Operation success, failure, and error feedback are insufficient.
- Layout has weak space utilization and multi-size adaptation.

Assistant agreement:

- Treat Admin foundation as an interaction grammar.
- Build a polyfile task packet and update it while discussing.
- Interpret "unified form field strategy" as a series of governed Admin Form components.
- Do not implement until the user explicitly says `start`.

Initial protocol direction:

- Workspace/controller owns selection, draft, validation, command availability, mutation state, and feedback.
- Rail emits intent; it does not own editor state.
- Form fields emit typed value changes; they do not decide workflow.
- Object-local actions should be near the active editor, not only in page-level actions.
- Feedback must be first-class at route, editor, form, field, and mutation boundaries.
