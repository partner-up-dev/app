// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createTencentLBSMapProvider,
  resolveTencentMapDesignColor,
  resolveTencentMarkerStyleId,
  shouldAnimateTencentMarkerMove,
  toTencentMarkerRotateDegrees,
} from "./tencent-lbs-provider";
import type {
  TencentFitBoundsOptions,
  TencentLatLng,
  TencentLatLngBounds,
  TencentMap,
  TencentMapEventName,
  TencentMapOptions,
  TencentMapSdk,
  TencentMarkerClickEvent,
  TencentMarkerStyleOptions,
  TencentMoveAlongOptions,
  TencentMoveAlongParamSet,
  TencentMultiMarker,
  TencentMultiPolyline,
  TencentPointGeometry,
  TencentPolylineGeometry,
  TencentPolylineStyleOptions,
} from "./types";

type TencentMapListener = () => void;

class FakeLatLng implements TencentLatLng {
  constructor(
    private readonly lat: number,
    private readonly lng: number,
  ) {}

  getLat(): number {
    return this.lat;
  }

  getLng(): number {
    return this.lng;
  }
}

class FakeLatLngBounds implements TencentLatLngBounds {
  readonly points: TencentLatLng[];

  constructor(sw: TencentLatLng, ne: TencentLatLng) {
    this.points = [sw, ne];
  }

  extend(latLng: TencentLatLng): TencentLatLngBounds {
    this.points.push(latLng);
    return this;
  }

  isEmpty(): boolean {
    return this.points.length === 0;
  }
}

class FakeTencentMap implements TencentMap {
  static lastInstance: FakeTencentMap | null = null;

  readonly fitBoundsCalls: {
    bounds: TencentLatLngBounds;
    options?: TencentFitBoundsOptions;
  }[] = [];
  readonly easeToCalls: {
    options?: { duration?: number };
    status: { center?: TencentLatLng; zoom?: number; rotation?: number };
  }[] = [];

  private readonly listeners = new Map<TencentMapEventName, Set<TencentMapListener>>();
  private rotation: number;
  private zoom: number;

  constructor(
    _container: HTMLElement | string,
    readonly options: TencentMapOptions,
  ) {
    this.rotation = options.rotation ?? 0;
    this.zoom = options.zoom ?? 12;
    FakeTencentMap.lastInstance = this;
  }

  setCenter(_center: TencentLatLng): TencentMap {
    return this;
  }

  setZoom(zoom: number): TencentMap {
    this.zoom = zoom;
    return this;
  }

  setRotation(rotation: number): TencentMap {
    this.rotation = rotation;
    return this;
  }

  getZoom(): number {
    return this.zoom;
  }

  getRotation(): number {
    return this.rotation;
  }

  fitBounds(bounds: TencentLatLngBounds, options?: TencentFitBoundsOptions): TencentMap {
    this.fitBoundsCalls.push({ bounds, options });
    return this;
  }

  easeTo(
    status: { center?: TencentLatLng; zoom?: number; rotation?: number },
    options?: { duration?: number },
  ): TencentMap {
    this.easeToCalls.push({ status, options });
    if (typeof status.zoom === "number") {
      this.zoom = status.zoom;
    }
    if (typeof status.rotation === "number") {
      this.rotation = status.rotation;
    }
    return this;
  }

  on(eventName: TencentMapEventName, listener: TencentMapListener): TencentMap {
    const listeners = this.listeners.get(eventName) ?? new Set<TencentMapListener>();
    listeners.add(listener);
    this.listeners.set(eventName, listeners);
    return this;
  }

  off(eventName: TencentMapEventName, listener: TencentMapListener): TencentMap {
    this.listeners.get(eventName)?.delete(listener);
    return this;
  }

  emit(eventName: TencentMapEventName): void {
    for (const listener of this.listeners.get(eventName) ?? []) {
      listener();
    }
  }

  destroy(): void {
    this.listeners.clear();
  }
}

class FakeMarkerStyle {
  constructor(readonly options: TencentMarkerStyleOptions) {}
}

class FakePolylineStyle {
  constructor(readonly options: TencentPolylineStyleOptions) {}
}

class FakeMultiMarker implements TencentMultiMarker {
  setGeometries(_geometries: TencentPointGeometry[]): TencentMultiMarker {
    return this;
  }

  setStyles(_styles: Record<string, object>): TencentMultiMarker {
    return this;
  }

  moveAlong(
    _param: TencentMoveAlongParamSet,
    _options?: TencentMoveAlongOptions,
  ): TencentMultiMarker {
    return this;
  }

  stopMove(): TencentMultiMarker {
    return this;
  }

  setMap(_map: TencentMap | null): TencentMultiMarker {
    return this;
  }

  on(_eventName: "click", _handler: (event: TencentMarkerClickEvent) => void): TencentMultiMarker {
    return this;
  }

  off(_eventName: "click", _handler: (event: TencentMarkerClickEvent) => void): TencentMultiMarker {
    return this;
  }
}

class FakeMultiPolyline implements TencentMultiPolyline {
  setGeometries(_geometries: TencentPolylineGeometry[]): TencentMultiPolyline {
    return this;
  }

  setMap(_map: TencentMap | null): TencentMultiPolyline {
    return this;
  }
}

const installFakeTencentSdk = () => {
  const sdk: TencentMapSdk = {
    LatLng: FakeLatLng,
    LatLngBounds: FakeLatLngBounds,
    Map: FakeTencentMap,
    MarkerStyle: FakeMarkerStyle,
    MultiMarker: FakeMultiMarker,
    MultiPolyline: FakeMultiPolyline,
    PolylineStyle: FakePolylineStyle,
  };
  window.TMap = sdk;
};

const getLastFakeMap = (): FakeTencentMap => {
  const map = FakeTencentMap.lastInstance;
  if (!map) {
    throw new Error("Expected fake Tencent map instance.");
  }
  return map;
};

afterEach(() => {
  document.documentElement.removeAttribute("style");
  window.TMap = undefined;
  FakeTencentMap.lastInstance = null;
  vi.useRealTimers();
});

describe("Tencent LBS design colors", () => {
  test("falls back to design-web sys token values when CSS variables are unavailable", () => {
    expect(resolveTencentMapDesignColor("primary")).toBe("#96d945");
    expect(resolveTencentMapDesignColor("secondary")).toBe("#85976e");
    expect(resolveTencentMapDesignColor("tertiary")).toBe("#4c9e99");
    expect(resolveTencentMapDesignColor("danger")).toBe("#d32f2f");
    expect(resolveTencentMapDesignColor("muted")).toBe("#44483d");
  });

  test("reads runtime sys color variables for map SDK color values", () => {
    document.documentElement.style.setProperty("--sys-color-secondary", "#123456");

    expect(resolveTencentMapDesignColor("secondary")).toBe("#123456");
  });
});

describe("Tencent LBS marker heading", () => {
  test("converts north-clockwise provider heading to Tencent counter-clockwise rotate", () => {
    expect(toTencentMarkerRotateDegrees(0)).toBe(0);
    expect(toTencentMarkerRotateDegrees(90)).toBe(270);
    expect(toTencentMarkerRotateDegrees(180)).toBe(180);
    expect(toTencentMarkerRotateDegrees(270)).toBe(90);
    expect(toTencentMarkerRotateDegrees(-90)).toBe(90);
  });

  test("uses heading-aware route driver style id without replacing the driver icon style", () => {
    expect(
      resolveTencentMarkerStyleId({
        headingDegrees: 90,
        icon: "routeDriver",
        id: "driver",
        position: { lat: 30, lng: 120 },
      }),
    ).toBe("routeDriverHeading-270");

    expect(
      resolveTencentMarkerStyleId({
        active: true,
        icon: "routeDriver",
        id: "driver",
        position: { lat: 30, lng: 120 },
      }),
    ).toBe("routeDriver");
  });

  test("animates only route driver marker coordinate changes", () => {
    expect(
      shouldAnimateTencentMarkerMove({
        previous: {
          icon: "routeDriver",
          id: "driver",
          position: { lat: 30, lng: 120 },
        },
        next: {
          icon: "routeDriver",
          id: "driver",
          position: { lat: 30.001, lng: 120.001 },
        },
      }),
    ).toBe(true);

    expect(
      shouldAnimateTencentMarkerMove({
        previous: {
          icon: "routeStart",
          id: "start",
          position: { lat: 30, lng: 120 },
        },
        next: {
          icon: "routeStart",
          id: "start",
          position: { lat: 30.001, lng: 120.001 },
        },
      }),
    ).toBe(false);

    expect(
      shouldAnimateTencentMarkerMove({
        previous: {
          icon: "routeDriver",
          id: "driver",
          position: { lat: 30, lng: 120 },
        },
        next: {
          icon: "routeDriver",
          id: "driver",
          position: { lat: 30, lng: 120 },
        },
      }),
    ).toBe(false);
  });
});

describe("Tencent LBS viewport following", () => {
  beforeEach(() => {
    installFakeTencentSdk();
  });

  test("follows a single marker with caller supplied follow zoom", async () => {
    const provider = await createTencentLBSMapProvider({
      apiKey: "test-key",
      container: document.createElement("div"),
    });

    provider.fitMarker({
      marker: {
        id: "driver",
        position: { lat: 30.27, lng: 120.16 },
      },
      padding: {
        top: 12,
        right: 16,
        bottom: 240,
        left: 16,
      },
      zoom: 17,
    });

    const map = getLastFakeMap();
    expect(map.fitBoundsCalls).toHaveLength(0);
    expect(map.easeToCalls).toHaveLength(1);
    expect(map.easeToCalls[0]?.status.center?.getLat()).toBe(30.27);
    expect(map.easeToCalls[0]?.status.center?.getLng()).toBe(120.16);
    expect(map.easeToCalls[0]?.status.zoom).toBe(17);
    expect(map.easeToCalls[0]?.status.rotation).toBeUndefined();
    expect(map.easeToCalls[0]?.options?.duration).toBe(240);
    expect(map.getZoom()).toBe(17);
  });

  test("reports user viewport interactions while suppressing programmatic zoom events", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const interactions: string[] = [];
    const provider = await createTencentLBSMapProvider({
      apiKey: "test-key",
      container: document.createElement("div"),
      onUserViewportInteraction: () => {
        interactions.push("user");
      },
    });
    const map = getLastFakeMap();

    map.emit("dragstart");
    expect(interactions).toHaveLength(1);

    provider.fitMarker({
      marker: {
        id: "driver",
        position: { lat: 30.27, lng: 120.16 },
      },
      zoom: 17,
    });
    map.emit("zoom");
    expect(interactions).toHaveLength(1);

    vi.setSystemTime(new Date("2026-01-01T00:00:00.400Z"));
    map.emit("zoom");
    expect(interactions).toHaveLength(2);
  });
});
