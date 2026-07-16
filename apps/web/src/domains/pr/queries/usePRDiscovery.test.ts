import { afterEach, describe, expect, test, vi } from "vitest";
import {
  PR_DISCOVERY_VIEW_RESOLUTION_TIMEOUT_MS,
  PRDiscoveryViewResolutionTimeoutError,
  withPRDiscoveryViewResolutionTimeout,
} from "./usePRDiscovery";

describe("PR discovery view resolution", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("aborts the request after the 500ms resolution timeout", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    const result = withPRDiscoveryViewResolutionTimeout(
      (signal) => {
        requestSignal = signal;
        return new Promise<string>(() => undefined);
      },
      { timeoutMs: PR_DISCOVERY_VIEW_RESOLUTION_TIMEOUT_MS },
    );

    await vi.advanceTimersByTimeAsync(PR_DISCOVERY_VIEW_RESOLUTION_TIMEOUT_MS - 1);
    await expect(Promise.race([result, Promise.resolve("pending")])).resolves.toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(requestSignal?.aborted).toBe(true);
    await expect(result).rejects.toBeInstanceOf(PRDiscoveryViewResolutionTimeoutError);
  });

  test("keeps non-timeout request errors visible", async () => {
    vi.useFakeTimers();
    const expected = new Error("view request failed");
    const result = withPRDiscoveryViewResolutionTimeout(async () => {
      throw expected;
    });

    await expect(result).rejects.toBe(expected);
  });

  test("propagates TanStack aborts to the request signal", async () => {
    const externalController = new AbortController();
    let requestSignal: AbortSignal | undefined;
    const expected = new Error("query aborted");
    const result = withPRDiscoveryViewResolutionTimeout(
      (signal) => {
        requestSignal = signal;
        return new Promise<string>((_, reject) => {
          signal.addEventListener("abort", () => reject(expected), { once: true });
        });
      },
      { signal: externalController.signal },
    );

    await Promise.resolve();
    externalController.abort(expected);
    expect(requestSignal?.aborted).toBe(true);
    await expect(result).rejects.toBe(expected);
  });
});
