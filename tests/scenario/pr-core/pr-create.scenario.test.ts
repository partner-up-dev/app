import assert from "node:assert/strict";
import type { Page } from "playwright";
import { buildPRRouteSummary } from "../../../apps/backend/src/domains/pr-core/services/pr-place-mode.service";
import type { PRRoute } from "../../../apps/backend/src/entities";
import { givenUser } from "../../../apps/backend/tests/pr-core/_kit/builders/users";
import { probePartnerRequestCreationState } from "../../../apps/backend/tests/pr-core/_kit/probes/partner-requests";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { expectBackendJsonResponse, requestBackendJson } from "../_infra/http/backend";
import { scenario } from "../_infra/scenario/scenario";

type CreatePRResponse = {
  id: number;
  status: string;
  canonicalPath: string;
};

type PRDetailRouteProbe = {
  core: {
    location: string | null;
    route: PRRoute | null;
    placeDisplayName: string | null;
  };
  share: {
    canonical: {
      title: string;
      description: string;
    };
  };
};

const routeCreateDraft: PRRoute = [
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
    name: "Scenario Origin",
    full_address: "Scenario Origin Address",
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
    name: "Scenario Destination",
    full_address: "Scenario Destination Address",
  },
];

async function installScenarioTencentMapSdk(page: Page): Promise<void> {
  await page.route("https://map.qq.com/api/gljs**", async (route) => {
    const url = new URL(route.request().url());
    const callback = url.searchParams.get("callback");
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        (() => {
          class LatLng {
            constructor(lat, lng) {
              this.lat = lat;
              this.lng = lng;
            }
            getLat() { return this.lat; }
            getLng() { return this.lng; }
          }

          class LatLngBounds {
            constructor(sw, ne) {
              this.points = [sw, ne];
            }
            extend(point) {
              this.points.push(point);
              return this;
            }
            isEmpty() {
              return this.points.length === 0;
            }
          }

          class Map {
            constructor(container, options) {
              this.container = typeof container === "string" ? document.getElementById(container) : container;
              this.center = options.center;
              this.zoom = options.zoom ?? 12;
              this.listeners = new globalThis.Map();
            }
            setCenter(center) {
              this.center = center;
              return this;
            }
            setZoom(zoom) {
              this.zoom = zoom;
              return this;
            }
            setRotation() { return this; }
            getZoom() { return this.zoom; }
            getRotation() { return 0; }
            getCenter() { return this.center; }
            fitBounds() { return this; }
            easeTo(status) {
              if (status.center) this.center = status.center;
              if (typeof status.zoom === "number") this.zoom = status.zoom;
              return this;
            }
            on(eventName, listener) {
              const listeners = this.listeners.get(eventName) ?? [];
              listeners.push(listener);
              this.listeners.set(eventName, listeners);
              if (eventName === "click" && this.container) {
                this.container.addEventListener("click", () => {
                  const next = window.__scenarioTencentNextLocation ?? {
                    lat: this.center.getLat(),
                    lng: this.center.getLng(),
                  };
                  listener({ latLng: new LatLng(next.lat, next.lng) });
                });
              }
              return this;
            }
            off(eventName, listener) {
              const listeners = this.listeners.get(eventName) ?? [];
              this.listeners.set(eventName, listeners.filter((item) => item !== listener));
              return this;
            }
            destroy() {}
          }

          class MarkerStyle {
            constructor(options) {
              this.options = options;
            }
          }

          class MultiMarker {
            constructor() {}
            setGeometries() { return this; }
            setStyles() { return this; }
            moveAlong() { return this; }
            stopMove() { return this; }
            setMap() { return this; }
            on() { return this; }
            off() { return this; }
          }

          class PolylineStyle {
            constructor(options) {
              this.options = options;
            }
          }

          class MultiPolyline {
            setGeometries() { return this; }
            setMap() { return this; }
          }

          class Suggestion {
            async getSuggestions() {
              return { data: [] };
            }
          }

          class Geocoder {
            async getAddress({ location }) {
              const next = window.__scenarioTencentNextLocation;
              return {
                result: {
                  address: next?.address ?? "Scenario Address",
                  address_component: {
                    city: next?.cityName ?? "广州",
                  },
                  pois: [
                    {
                      title: next?.name ?? "Scenario Location",
                    },
                  ],
                  location: {
                    lat: location.getLat(),
                    lng: location.getLng(),
                  },
                },
              };
            }
          }

          window.TMap = {
            Map,
            LatLng,
            LatLngBounds,
            MarkerStyle,
            MultiMarker,
            PolylineStyle,
            MultiPolyline,
            service: {
              Suggestion,
              Geocoder,
            },
          };

          ${callback ? `window[${JSON.stringify(callback)}]?.();` : ""}
        })();
      `,
    });
  });
}

async function fillStructuredPRForm(input: { page: Page; title: string }): Promise<void> {
  const { page, title } = input;
  await page.getByTestId("pr-editor.form.title").fill(title);
  await page.getByTestId("pr-editor.form.type").fill("badminton");
  await page.getByTestId("pr-editor.form.advanced-toggle").click();
  await page.getByTestId("pr-editor.form.start-date").fill("2031-04-01");
  await page.getByTestId("pr-editor.form.end-date").fill("2031-04-02");
  await page.getByTestId("pr-editor.form.place.location").fill("Scenario Court");
}

const pickRoutePoint = async (page: Page, index: number, point: PRRoute[number]): Promise<void> => {
  await page.getByTestId(`route.point.${index}.pick`).click();
  await page.getByTestId("location-picker.confirm").waitFor({
    state: "visible",
    timeout: 10_000,
  });

  await page.evaluate(
    (nextLocation) => {
      const scenarioWindow = window as unknown as {
        __scenarioTencentNextLocation: {
          address: string | null;
          cityName: string;
          lat: number;
          lng: number;
          name: string;
        };
      };
      scenarioWindow.__scenarioTencentNextLocation = nextLocation;
    },
    {
      address: point.full_address,
      cityName: "广州",
      lat: point.gcj02?.[0] ?? 0,
      lng: point.gcj02?.[1] ?? 0,
      name: point.name,
    },
  );
  await page.getByTestId("location-picker.map").click();

  await page.waitForFunction(
    (name) => {
      const input = document.querySelector<HTMLInputElement>(
        '[data-testid="location-picker.name"]',
      );
      return input?.value === name;
    },
    point.name,
    { timeout: 10_000 },
  );
  await page.getByTestId("location-picker.confirm").click();
  await page.getByTestId(`route.point.${index}.pick`).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByText(point.name).waitFor({
    state: "visible",
    timeout: 10_000,
  });
};

const fillStructuredRoutePRForm = async (page: Page): Promise<void> => {
  await page.getByTestId("pr-editor.form.type").fill("ride_hailing");
  await page.getByTestId("pr-editor.form.advanced-toggle").click();
  await page.getByTestId("pr-editor.form.start-date").fill("2031-04-01");
  await page.getByTestId("pr-editor.form.end-date").fill("2031-04-02");
  await page.getByTestId("pr-editor.form.place.mode.route").click();
  await pickRoutePoint(page, 0, routeCreateDraft[0]!);
  await pickRoutePoint(page, 1, routeCreateDraft[1]!);
};

scenario("pr_create_form_requires_authentication_for_save_draft", async (ctx) => {
  await withScenarioPage(async (page) => {
    await installDeterministicShareSidecarStubs(page);

    await page.goto("/pr/new?mode=form");
    await fillStructuredPRForm({
      page,
      title: "System scenario draft PR creation",
    });

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/pr/new/form") && response.request().method() === "POST",
    );
    await page.getByTestId("pr-create.save-draft").click();
    const createResponse = await createResponsePromise;
    assert.equal(createResponse.status(), 401);
    ctx.record("authRequiredStatus", createResponse.status());
  });
});

scenario("pr_create_form_publishes_route_pr_to_route_detail", async (ctx) => {
  const creator = await givenUser("system-create-route-publish-creator");

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);
    await installScenarioTencentMapSdk(page);

    await page.goto("/pr/new?mode=form");
    await fillStructuredRoutePRForm(page);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/pr/new/form") && response.request().method() === "POST",
    );
    await page.getByTestId("pr-create.publish").click();
    const createResponse = await createResponsePromise;
    assert.equal(createResponse.status(), 201);

    const requestBody = JSON.parse(createResponse.request().postData() ?? "{}") as {
      fields?: {
        location?: unknown;
        route?: unknown;
      };
    };
    assert.equal(requestBody.fields?.location, null);
    assert.deepEqual(requestBody.fields?.route, routeCreateDraft);

    const created = (await createResponse.json()) as CreatePRResponse;
    assert.equal(created.status, "OPEN");
    ctx.record("creatorUserId", creator.user.id);
    ctx.record("routePrId", created.id);

    await page.waitForURL(`**${created.canonicalPath}?entry=create`);
    await page.getByTestId("pr-detail.route").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByText("Scenario Origin").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByText("Scenario Destination").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    const detail = await expectBackendJsonResponse<PRDetailRouteProbe>(
      await requestBackendJson(`/api/pr/${created.id}`, {
        token: creator.token,
      }),
      200,
    );
    const routeSummary = buildPRRouteSummary(routeCreateDraft);
    assert.ok(routeSummary);
    assert.equal(detail.core.location, null);
    assert.deepEqual(detail.core.route, routeCreateDraft);
    assert.equal(detail.core.placeDisplayName, routeSummary);
    assert.equal(detail.share.canonical.title, "ride_hailing");
    assert.ok(detail.share.canonical.description.includes(routeSummary));
  });
});

scenario("pr_create_form_publishes_authenticated_pr", async (ctx) => {
  const creator = await givenUser("system-create-publish-creator");

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await page.goto("/pr/new?mode=form");
    await fillStructuredPRForm({
      page,
      title: "System scenario published PR creation",
    });

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/pr/new/form") && response.request().method() === "POST",
    );
    await page.getByTestId("pr-create.publish").click();
    const createResponse = await createResponsePromise;
    assert.equal(createResponse.status(), 201);

    const created = (await createResponse.json()) as CreatePRResponse;
    assert.equal(created.status, "OPEN");
    ctx.record("creatorUserId", creator.user.id);
    ctx.record("prId", created.id);

    const state = await probePartnerRequestCreationState(created.id);
    assert.equal(state.status, "OPEN");
    assert.equal(state.createdBy, creator.user.id);
    await page.waitForURL(`**${created.canonicalPath}?entry=create`);
  });
});
