import assert from "node:assert/strict";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { Page } from "playwright";
import { givenPersistedPartnerRequest } from "../../../apps/backend/tests/pr-core/_kit/builders/partner-requests";
import { givenUser } from "../../../apps/backend/tests/pr-core/_kit/builders/users";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { scenario } from "../_infra/scenario/scenario";

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

type DateTimeInputParts = {
  date: string;
  time: string;
};

type DateTimeRangeInputParts = {
  start: DateTimeInputParts;
  end: DateTimeInputParts;
};

const toBrowserLocalDateTimeParts = async (
  page: Page,
  value: string,
): Promise<DateTimeInputParts> =>
  page.evaluate((instant) => {
    const date = new Date(instant);
    const pad2 = (numberValue: number): string => String(numberValue).padStart(2, "0");
    return {
      date: [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join("-"),
      time: [pad2(date.getHours()), pad2(date.getMinutes())].join(":"),
    };
  }, value);

const readDateTimeRangeInputs = async (page: Page): Promise<DateTimeRangeInputParts> =>
  page.evaluate(() => ({
    start: {
      date:
        document.querySelector<HTMLInputElement>('[data-testid="pr-editor.form.start-date"]')
          ?.value ?? "",
      time:
        document.querySelector<HTMLInputElement>('[data-testid="pr-editor.form.start-time"]')
          ?.value ?? "",
    },
    end: {
      date:
        document.querySelector<HTMLInputElement>('[data-testid="pr-editor.form.end-date"]')
          ?.value ?? "",
      time:
        document.querySelector<HTMLInputElement>('[data-testid="pr-editor.form.end-time"]')
          ?.value ?? "",
    },
  }));

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

    const readyStart = readyEditableTimeFields.time[0];
    const readyEnd = readyEditableTimeFields.time[1];
    assert.ok(readyStart);
    assert.ok(readyEnd);
    const expectedInitialRange: DateTimeRangeInputParts = {
      start: await toBrowserLocalDateTimeParts(page, readyStart),
      end: await toBrowserLocalDateTimeParts(page, readyEnd),
    };
    const editedRange: DateTimeRangeInputParts = {
      start: {
        ...expectedInitialRange.start,
        date: "2030-01-02",
      },
      end: {
        ...expectedInitialRange.end,
        date: "2030-01-03",
      },
    };
    await page.waitForFunction(
      (expected) => {
        const readInput = (testId: string): string | undefined =>
          document.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)?.value;
        return (
          readInput("pr-editor.form.start-date") === expected.start.date &&
          readInput("pr-editor.form.start-time") === expected.start.time &&
          readInput("pr-editor.form.end-date") === expected.end.date &&
          readInput("pr-editor.form.end-time") === expected.end.time
        );
      },
      expectedInitialRange,
      { timeout: 10_000 },
    );
    assert.deepEqual(
      await readDateTimeRangeInputs(page),
      expectedInitialRange,
      "PR edit initial time inputs should match browser-local fixture instants",
    );

    assert.equal(await page.getByTestId("pr-editor.form.title").count(), 0);
    assert.equal(await page.getByTestId("pr-editor.form.type").count(), 0);
    assert.equal(await page.getByTestId("pr-editor.form.place.location").count(), 0);

    await page.getByTestId("pr-editor.form.start-date").fill("2030-01-02");
    await page.getByTestId("pr-editor.form.end-date").fill("2030-01-03");
    await page.waitForFunction(
      (expected) => {
        const readInput = (testId: string): string | undefined =>
          document.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)?.value;
        return (
          readInput("pr-editor.form.start-date") === expected.start.date &&
          readInput("pr-editor.form.start-time") === expected.start.time &&
          readInput("pr-editor.form.end-date") === expected.end.date &&
          readInput("pr-editor.form.end-time") === expected.end.time
        );
      },
      editedRange,
      { timeout: 10_000 },
    );
    await page.getByTestId("pr-detail.creator.edit-content.submit").click();

    await page.getByTestId("pr-editor.form").waitFor({
      state: "detached",
      timeout: 10_000,
    });
    await page.waitForFunction(
      (expected) => {
        const text = document
          .querySelector('[data-testid="pr-detail.facts.time-value"]')
          ?.textContent?.trim();
        return text?.includes(expected) === true;
      },
      editedRange.start.date,
      { timeout: 10_000 },
    );
  });
});
