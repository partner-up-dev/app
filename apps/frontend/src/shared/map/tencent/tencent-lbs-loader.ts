import type { TencentLBSLibrary, TencentMapSdk } from "./types";

type LoadTencentLBSSdkInput = {
  key: string;
  libraries?: readonly TencentLBSLibrary[];
};

const SDK_URL = "https://map.qq.com/api/gljs";
const SDK_VERSION = "1.exp";
const CALLBACK_PREFIX = "__partnerUpTencentLBSReady";

const loadPromises = new Map<string, Promise<TencentMapSdk>>();
let callbackSequence = 0;

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

  const promise = new Promise<TencentMapSdk>((resolve, reject) => {
    const callbackName = `${CALLBACK_PREFIX}${callbackSequence}`;
    callbackSequence += 1;

    const callbackRegistry = window as unknown as Window & Record<string, (() => void) | undefined>;
    const cleanup = () => {
      delete callbackRegistry[callbackName];
    };

    callbackRegistry[callbackName] = () => {
      const sdk = window.TMap;
      cleanup();
      if (!sdk) {
        reject(new Error("Tencent LBS SDK loaded without TMap"));
        return;
      }
      resolve(sdk);
    };

    const params = new URLSearchParams({
      v: SDK_VERSION,
      key: normalizedKey,
      callback: callbackName,
    });
    const libraries = [...(input.libraries ?? [])].sort();
    if (libraries.length > 0) {
      params.set("libraries", libraries.join(","));
    }

    const script = document.createElement("script");
    script.charset = "utf-8";
    script.async = true;
    script.src = `${SDK_URL}?${params.toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Tencent LBS SDK failed to load"));
    };
    document.head.appendChild(script);
  });

  loadPromises.set(loadKey, promise);
  return promise;
};
