# ErrorToast Migration

## Target

- Local owner: `apps/frontend/src/shared/ui/feedback/ErrorToast.vue`.
- Package target: likely `PuInlineNotice`, `PuSnackbar`, or `PuSnackbarHost`
  depending on whether the usage is inline or transient toast.
- Desired final state: no bespoke error-toast styling when a package feedback
  component covers the intent.

## Current Contract

- Props: `message`, optional `persistent`.
- Event: `close`.
- Current component is not a global toast service; it is rendered where used.

## Migration Shape

- From: local error surface with custom close button.
- To: inspect each usage before choosing inline notice versus snackbar.
- Compatibility strategy: preserve close behavior and persistent behavior.

## Risks

- Snackbar queue semantics may be too different for existing inline usages.
- Close button label and accessibility may regress if moved too quickly.

## Verification

- Build, token lint, frontend unit tests.
- Targeted workflow tests for any surface that renders an error toast.
