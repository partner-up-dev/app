import type { TencentLBSLibrary, TencentMapSdk } from "./types";

type LoadTencentLBSSdkInput = {
  key: string;
  libraries?: readonly TencentLBSLibrary[];
};

const SDK_URL = "https://map.qq.com/api/gljs";
const SDK_VERSION = "1.exp";
const SDK_LOAD_TIMEOUT_MS = 25_000;
const MAX_SDK_LOAD_ATTEMPTS = 2;

const loadPromises = new Map<string, Promise<TencentMapSdk>>();

const resolveLoadKey = ({ key, libraries = [] }: LoadTencentLBSSdkInput): string =>
  [key.trim(), [...libraries].sort().join(",")].join("|");

const getExistingSdk = (): TencentMapSdk | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.TMap ?? null;
};

const hasLibraryCapability = (sdk: TencentMapSdk, library: TencentLBSLibrary): boolean => {
  if (library === "service") {
    return Boolean(sdk.service);
  }

  return true;
};

const hasRequestedLibraryCapabilities = (
  sdk: TencentMapSdk,
  libraries: readonly TencentLBSLibrary[] = [],
): boolean => libraries.every((library) => hasLibraryCapability(sdk, library));

export const loadTencentLBSSdk = (input: LoadTencentLBSSdkInput): Promise<TencentMapSdk> => {
  const normalizedKey = input.key.trim();
  if (normalizedKey.length === 0) {
    return Promise.reject(new Error("Tencent LBS key is required"));
  }

  const existingSdk = getExistingSdk();
  if (existingSdk && hasRequestedLibraryCapabilities(existingSdk, input.libraries)) {
    return Promise.resolve(existingSdk);
  }

  if (typeof document === "undefined") {
    return Promise.reject(new Error("Tencent LBS can only load in the browser"));
  }

  const loadKey = resolveLoadKey({
    key: normalizedKey,
    libraries: input.libraries,
  });
  const existingPromise = loadPromises.get(loadKey);
  if (existingPromise) {
    return existingPromise;
  }

  const createScriptUrl = (attempt: number): string => {
    const params = new URLSearchParams({
      v: SDK_VERSION,
      key: normalizedKey,
    });
    const libraries = [...(input.libraries ?? [])].sort();
    if (libraries.length > 0) {
      params.set("libraries", libraries.join(","));
    }
    if (attempt > 0) {
      params.set("_retry", String(attempt));
    }
    return `${SDK_URL}?${params.toString()}`;
  };

  const readLoadedSdk = (): TencentMapSdk => {
    const sdk = window.TMap;
    if (!sdk) {
      throw new Error("Tencent LBS SDK loaded without TMap");
    }
    if (!hasRequestedLibraryCapabilities(sdk, input.libraries)) {
      throw new Error("Tencent LBS SDK loaded without requested libraries");
    }
    return sdk;
  };

  const loadScriptOnce = (attempt: number): Promise<TencentMapSdk> =>
    new Promise<TencentMapSdk>((resolve, reject) => {
      const script = document.createElement("script");
      let timeoutId: number | null = null;

      const finish = (result: { sdk: TencentMapSdk } | { error: Error }) => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        script.onload = null;
        script.onerror = null;
        if ("sdk" in result) {
          resolve(result.sdk);
          return;
        }
        script.remove();
        reject(result.error);
      };

      script.charset = "utf-8";
      script.async = true;
      script.src = createScriptUrl(attempt);
      script.onload = () => {
        try {
          finish({ sdk: readLoadedSdk() });
        } catch (error) {
          finish({
            error: error instanceof Error ? error : new Error("Tencent LBS SDK failed to load"),
          });
        }
      };
      script.onerror = () => {
        finish({ error: new Error("Tencent LBS SDK failed to load") });
      };
      timeoutId = window.setTimeout(() => {
        try {
          finish({ sdk: readLoadedSdk() });
        } catch {
          finish({ error: new Error("Tencent LBS SDK load timed out") });
        }
      }, SDK_LOAD_TIMEOUT_MS);
      document.head.appendChild(script);
    });

  const promise = (async () => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_SDK_LOAD_ATTEMPTS; attempt += 1) {
      try {
        return await loadScriptOnce(attempt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Tencent LBS SDK failed to load");
      }
    }
    throw lastError ?? new Error("Tencent LBS SDK failed to load");
  })().catch((error: unknown) => {
    loadPromises.delete(loadKey);
    throw error;
  });

  loadPromises.set(loadKey, promise);
  return promise;
};
