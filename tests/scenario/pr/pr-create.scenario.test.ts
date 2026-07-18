import assert from "node:assert/strict";
import type { Page } from "playwright";
import { buildPRRouteSummary } from "../../../apps/backend/src/domains/pr/services/pr-place-mode.service";
import type { PRRoute } from "../../../apps/backend/src/entities";
import { givenUser } from "../../../apps/backend/tests/pr/_kit/builders/users";
import { probePartnerRequestCreationState } from "../../../apps/backend/tests/pr/_kit/probes/partner-requests";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import {
  installDeterministicTencentLocationPickerStub,
  type TencentLocationSuggestionFixture,
} from "../_infra/browser/tencent-location-picker";
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
    gcj02: null,
    name: "Scenario Origin",
    full_address: "Scenario Origin Address",
  },
  {
    wgs84: null,
    bd09: null,
    gcj02: null,
    name: "Scenario Destination",
    full_address: "Scenario Destination Address",
  },
];
const routePickerSearchKeywords = ["上海人民广场", "上海虹桥站"] as const;
const routePickerSuggestions = [
  {
    keyword: routePickerSearchKeywords[0],
    id: "scenario-origin",
    name: "上海人民广场",
    address: "上海市黄浦区人民大道",
    cityName: "上海市",
    coordinate: { lat: 31.230525, lng: 121.473667 },
  },
  {
    keyword: routePickerSearchKeywords[1],
    id: "scenario-destination",
    name: "上海虹桥站",
    address: "上海市闵行区申贵路",
    cityName: "上海市",
    coordinate: { lat: 31.196731, lng: 121.327835 },
  },
] satisfies readonly TencentLocationSuggestionFixture[];

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
  await page.locator(".location-picker-content__map-overlay").waitFor({
    state: "detached",
    timeout: 60_000,
  });
  await page.getByTestId("location-picker.search").fill(routePickerSearchKeywords[index] ?? "上海");
  await page.getByTestId("location-picker.search-result").first().waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.getByTestId("location-picker.search-result").first().click();
  await page.getByTestId("location-picker.name").fill(point.name);
  await page.getByTestId("location-picker.address").fill(point.full_address ?? "");
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

const assertRouteUsesScenarioLabelsAndCoordinates = (route: PRRoute): void => {
  assert.equal(route.length, routeCreateDraft.length);
  for (const [index, point] of route.entries()) {
    const expected = routeCreateDraft[index];
    assert.ok(expected);
    assert.equal(point.name, expected.name);
    assert.equal(point.full_address, expected.full_address);
    assert.equal(point.wgs84, null);
    assert.equal(point.bd09, null);
    assert.ok(Array.isArray(point.gcj02));
    assert.equal(point.gcj02.length, 2);
    assert.equal(typeof point.gcj02[0], "number");
    assert.equal(typeof point.gcj02[1], "number");
    assert.ok(Number.isFinite(point.gcj02[0]));
    assert.ok(Number.isFinite(point.gcj02[1]));
  }
};

scenario("pr_create_form_requires_authentication_before_create", async (ctx) => {
  await withScenarioPage(async (page) => {
    await installDeterministicShareSidecarStubs(page);

    await page.goto("/pr/new?mode=form");
    await fillStructuredPRForm({
      page,
      title: "System scenario draft PR creation",
    });

    const createRequests: string[] = [];
    const recordCreateRequest = (request: { url(): string; method(): string }) => {
      if (request.method() === "POST" && request.url().includes("/api/pr/new/")) {
        createRequests.push(request.url());
      }
    };
    page.on("request", recordCreateRequest);
    await page.getByTestId("pr-create.publish").click();
    await page.getByTestId("pr-create.auth-disclosure").waitFor({ state: "visible" });
    await page.waitForTimeout(250);
    assert.equal(createRequests.length, 0);
    await page.getByTestId("pr-create.auth-disclosure.cancel").click();
    await page
      .getByTestId("pr-editor.form.title")
      .inputValue()
      .then((value) => {
        assert.equal(value, "System scenario draft PR creation");
      });
    ctx.record("createPostsBeforeAuth", createRequests.length);
  });
});

scenario(
  "pr_create_form_publishes_route_pr_to_route_detail",
  async (ctx) => {
    const creator = await givenUser("system-create-route-publish-creator");

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, creator);
      await installDeterministicShareSidecarStubs(page);
      await installDeterministicTencentLocationPickerStub(page, routePickerSuggestions);

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
      assert.ok(Array.isArray(requestBody.fields?.route));
      const requestRoute = requestBody.fields.route as PRRoute;
      assertRouteUsesScenarioLabelsAndCoordinates(requestRoute);

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
      const routeSummary = buildPRRouteSummary(requestRoute);
      assert.ok(routeSummary);
      assert.equal(detail.core.location, null);
      assert.deepEqual(detail.core.route, requestRoute);
      assert.equal(detail.core.placeDisplayName, routeSummary);
      assert.equal(detail.share.canonical.title, "ride_hailing");
      assert.ok(detail.share.canonical.description.includes(routeSummary));
    });
  },
  { timeoutMs: 120_000 },
);

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
