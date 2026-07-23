# `6-3.2c-2` Rehearsal

- A route component can receive cache data before `onMounted`; the workflow
  therefore fences on mounted state and waits a post-render tick.
- If the response cursor changes while an older request is in flight, the
  older success may only record its own cursor; the newer cursor remains
  eligible for a separate attempt.
- If the route unmounts or changes PR while a request is in flight, ignore its
  local success/failure bookkeeping. The backend operation remains safe and
  cannot affect a different PR because the route parameter is explicit.
- A hidden document does not spin a retry loop. It retries only when it becomes
  visible, the cursor changes, or the one bounded retry is due.
- `/pr/:id` retains only its navigation action; it never imports or mounts the
  acknowledgement workflow.
