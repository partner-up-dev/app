import assert from "node:assert/strict";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { installScenarioUserSession } from "../_infra/browser/session";
import { withScenarioPage } from "../_infra/browser/browser";
import { scenario } from "../_infra/scenario/scenario";
import { givenPersistedPartnerRequest } from "../../../apps/backend/tests/pr-core/_kit/builders/partner-requests";
import { givenUser } from "../../../apps/backend/tests/pr-core/_kit/builders/users";

const readyEditableTimeFields: PartnerRequestFields = {
  title: "System scenario ready editable time PR",
  type: "badminton",
  time: ["2030-01-01T00:00:00+08:00", "2030-01-02T00:00:00+08:00"],
  location: "Scenario Court",
  route: null,
  minPartners: 2,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
};

scenario("pr_detail_ready_creator_edits_time_window_from_pr_page", async (ctx) => {
  const creator = await givenUser("system-pr-detail-edit-ready-creator");
  const pr = await givenPersistedPartnerRequest({
    creator,
    fields: readyEditableTimeFields,
    status: "READY",
    allowEditAfterReady: {
      timeWindow: ["2030-01-01T00:00:00+08:00", "2030-01-04T00:00:00+08:00"],
    },
  });

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await page.goto(`/pr/${pr.id}`);

    const factsTime = page.getByTestId("pr-detail.facts.time-value");
    await factsTime.waitFor({ state: "visible", timeout: 10_000 });
    await factsTime.locator("xpath=..").getByText("可调整").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    await page.getByTestId("pr-detail.creator.edit-content").click();
    await page.getByTestId("pr-editor.form.start-date").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.waitForFunction(
      () => {
        const startDate = document.querySelector<HTMLInputElement>(
          '[data-testid="pr-editor.form.start-date"]',
        )?.value;
        const startTime = document.querySelector<HTMLInputElement>(
          '[data-testid="pr-editor.form.start-time"]',
        )?.value;
        const endDate = document.querySelector<HTMLInputElement>(
          '[data-testid="pr-editor.form.end-date"]',
        )?.value;
        const endTime = document.querySelector<HTMLInputElement>(
          '[data-testid="pr-editor.form.end-time"]',
        )?.value;
        return (
          startDate === "2030-01-01" &&
          startTime === "00:00" &&
          endDate === "2030-01-02" &&
          endTime === "00:00"
        );
      },
      undefined,
      { timeout: 10_000 },
    );

    assert.equal(await page.getByTestId("pr-editor.form.title").count(), 0);
    assert.equal(await page.getByTestId("pr-editor.form.type").count(), 0);
    assert.equal(await page.getByTestId("pr-editor.form.place.location").count(), 0);

    await page.getByTestId("pr-editor.form.start-date").fill("2030-01-02");
    await page.getByTestId("pr-editor.form.end-date").fill("2030-01-03");
    await page.waitForFunction(
      () => {
        const startDate = document.querySelector<HTMLInputElement>(
          '[data-testid="pr-editor.form.start-date"]',
        )?.value;
        const startTime = document.querySelector<HTMLInputElement>(
          '[data-testid="pr-editor.form.start-time"]',
        )?.value;
        const endDate = document.querySelector<HTMLInputElement>(
          '[data-testid="pr-editor.form.end-date"]',
        )?.value;
        const endTime = document.querySelector<HTMLInputElement>(
          '[data-testid="pr-editor.form.end-time"]',
        )?.value;
        return (
          startDate === "2030-01-02" &&
          startTime === "00:00" &&
          endDate === "2030-01-03" &&
          endTime === "00:00"
        );
      },
      undefined,
      { timeout: 10_000 },
    );
    await page.getByTestId("pr-detail.creator.edit-content.submit").click();

    await page.getByTestId("pr-editor.form").waitFor({
      state: "detached",
      timeout: 10_000,
    });
    await page.waitForFunction(
      () => {
        const text = document
          .querySelector('[data-testid="pr-detail.facts.time-value"]')
          ?.textContent?.trim();
        return text === "2030-01-02";
      },
      undefined,
      { timeout: 10_000 },
    );
  });
});
