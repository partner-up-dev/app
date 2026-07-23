# `6-5.1b-2` Mental Rehearsal

- Provider returns a syntactically valid but sensitive error message: retain
  only code/boolean, not message/body.
- `queryCity` input contains route coordinates: log endpoint/outcome only.
- Driver-route success contains a provider order ID and location: log neither,
  even if aggregate route result is retained.
- A test passes because stdout was not captured: make the capture assertion
  explicit and restore stdout safely after the test.
