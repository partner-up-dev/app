import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { PRTypeConfigRepository } from "../../../apps/backend/src/repositories/PRTypeConfigRepository";
import { UserRepository } from "../../../apps/backend/src/repositories/UserRepository";
import {
  bindScenarioWeChatOpenId,
  configureJoinGate,
  configureOpenConfirmationWindow,
} from "../../../apps/backend/tests/pr/_kit/actions/system-state";
import { givenPublishedPartnerRequest } from "../../../apps/backend/tests/pr/_kit/builders/partner-requests";
import { givenUser } from "../../../apps/backend/tests/pr/_kit/builders/users";
import {
  givenPRTypeConfig,
  givenPRTypeVisiblePR,
} from "../../../apps/backend/tests/pr-discovery/_kit/builders/pr-type-config";
import { withScenarioPage } from "../_infra/browser/browser";
import { installScenarioUserSession } from "../_infra/browser/session";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import {
  installDeterministicTencentLocationPickerStub,
  type TencentLocationSuggestionFixture,
} from "../_infra/browser/tencent-location-picker";
import { expectBackendJsonResponse, requestBackendJson } from "../_infra/http/backend";
import { scenario } from "../_infra/scenario/scenario";

const OUTPUT_ROOT = path.resolve("soft-copyright-manual-capture");
const SCREENSHOT_DIR = path.join(OUTPUT_ROOT, "screenshots");
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const userRepo = new UserRepository();
const typeConfigRepo = new PRTypeConfigRepository();

const locationSuggestions = [
  {
    keyword: "大学城体育馆",
    id: "manual-university-gym",
    name: "大学城体育馆",
    address: "广州市番禺区大学城中环东路",
    cityName: "广州市",
    coordinate: { lat: 23.055978, lng: 113.391215 },
  },
] satisfies readonly TencentLocationSuggestionFixture[];

type DetailResponse = {
  partnerSection: {
    roster: Array<{
      partnerId: number;
      displayName: string;
      isCreator: boolean;
      isSelf: boolean;
      state: string;
    }>;
  };
};

type ActionResponse = { status: string };

const updateNickname = async (userId: string, nickname: string): Promise<void> => {
  const updated = await userRepo.updateNickname(userId, nickname);
  assert.ok(updated, `Failed to update nickname for ${nickname}`);
};

const joinThroughBackend = async (input: { prId: number; token: string }): Promise<ActionResponse> =>
  expectBackendJsonResponse<ActionResponse>(
    await requestBackendJson(`/api/pr/${input.prId}/join`, {
      method: "POST",
      token: input.token,
      body: {},
    }),
    200,
  );

const createMessage = async (input: {
  prId: number;
  token: string;
  body: string;
}): Promise<void> => {
  await expectBackendJsonResponse(
    await requestBackendJson(`/api/pr/${input.prId}/messages`, {
      method: "POST",
      token: input.token,
      body: { body: input.body },
    }),
    200,
  );
};

const stabilizePage = async (page: Page): Promise<void> => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await document.fonts.ready;
    }
  });
  await page.waitForTimeout(250);
};

const captureViewport = async (page: Page, name: string): Promise<void> => {
  await stabilizePage(page);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
};

scenario(
  "software_manual_captures_stateful_mobile_workflows",
  async (ctx) => {
    const creator = await givenUser("manual-creator", { phoneNumber: "13800000001" });
    const participant = await givenUser("manual-participant", { phoneNumber: "13800000002" });
    const visitor = await givenUser("manual-visitor");
    const activeJoiner = await givenUser("manual-active-joiner");
    const waitlister = await givenUser("manual-waitlister");

    await Promise.all([
      updateNickname(creator.user.id, "林晓"),
      updateNickname(participant.user.id, "陈然"),
      updateNickname(visitor.user.id, "周舟"),
      updateNickname(activeJoiner.user.id, "顾北"),
      updateNickname(waitlister.user.id, "苏晴"),
    ]);

    const badmintonType = await givenPRTypeConfig({
      label: "manual-badminton",
      locations: ["大学城体育馆", "北区综合馆"],
      timeWindows: [
        ["2035-05-17T07:00:00.000Z", "2035-05-17T09:00:00.000Z"],
        ["2035-05-18T01:00:00.000Z", "2035-05-18T03:00:00.000Z"],
      ],
      defaultMinPartners: 2,
      defaultMaxPartners: 4,
      defaultPrNotes: "请提前十分钟到场，球拍可互相借用。",
      discoveryFormRatio: 0,
      discoveryCardRatio: 0,
      discoveryListRatio: 100,
    });
    await typeConfigRepo.updateByType(badmintonType.type, {
      title: "羽毛球约球",
      description: "按日期和场馆查找正在组队的羽毛球活动。",
    });

    const mainPr = await givenPRTypeVisiblePR({
      creator,
      prType: badmintonType,
      title: "周六下午羽毛球双打",
      location: "大学城体育馆",
      timeWindow: ["2035-05-17T07:00:00.000Z", "2035-05-17T09:00:00.000Z"],
      preferences: ["新手友好", "自带球拍"],
      notes: "从南门进入，在 3 号场地集合。",
      minPartners: 2,
      maxPartners: 4,
    });
    const secondPr = await givenPRTypeVisiblePR({
      creator,
      prType: badmintonType,
      title: "周日早场轻松对打",
      location: "北区综合馆",
      timeWindow: ["2035-05-18T01:00:00.000Z", "2035-05-18T03:00:00.000Z"],
      preferences: ["不限水平"],
      notes: "以活动身体为主，不计分。",
      minPartners: 2,
      maxPartners: 6,
    });
    await givenPRTypeVisiblePR({
      creator: participant,
      prType: badmintonType,
      title: "工作日晚间一小时",
      location: "大学城体育馆",
      timeWindow: ["2035-05-17T11:00:00.000Z", "2035-05-17T12:00:00.000Z"],
      preferences: ["准时"],
      notes: "下班后快速打一小时。",
      minPartners: 2,
      maxPartners: 4,
    });

    await configureJoinGate({
      pr: mainPr,
      config: [
        {
          kind: "JOIN_NOTICE",
          key: "manual-join-notice",
          version: "1",
          title: "加入须知",
          source: "PR",
          body: "请确认能够按时到场；临时有事请尽早退出。",
        },
      ],
    });
    await bindScenarioWeChatOpenId({
      user: participant,
      openId: "manual-participant-openid",
    });
    await configureOpenConfirmationWindow(mainPr);

    ctx.record("mainPrId", mainPr.id);
    ctx.record("secondPrId", secondPr.id);
    ctx.record("prType", badmintonType.type);

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, visitor);
      await installDeterministicShareSidecarStubs(page);
      await page.goto("/");
      await page.locator('[data-page="landing"]').waitFor({ state: "visible", timeout: 15_000 });
      await captureViewport(page, "01-home");

      await page.goto("/prd");
      await page.getByText("羽毛球约球", { exact: true }).waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await page.getByText("羽毛球约球", { exact: true }).scrollIntoViewIfNeeded();
      await captureViewport(page, "02-discovery-catalog");

      await page.goto(`/prd?type=${encodeURIComponent(badmintonType.type)}&view=list`);
      await page.getByText("周六下午羽毛球双打", { exact: true }).waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "03-discovery-list");
    });

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, participant);
      await installDeterministicShareSidecarStubs(page);
      await installDeterministicTencentLocationPickerStub(page, locationSuggestions);

      await page.goto("/pr/new?mode=form");
      await page.getByTestId("pr-editor.form.title").fill("周三晚饭后慢跑");
      await page.getByTestId("pr-editor.form.type").fill("running");
      await page.getByTestId("pr-editor.form.advanced-toggle").click();
      await page.getByTestId("pr-editor.form.start-date").fill("2035-05-21");
      await page.getByTestId("pr-editor.form.end-date").fill("2035-05-21");
      await page.getByTestId("pr-editor.form.place.location").fill("中心湖跑道");
      await captureViewport(page, "04-create-form");

      await page.getByTestId("pr-editor.form.type").fill("ride_hailing");
      await page.getByTestId("pr-editor.form.place.mode.route").click();
      await page.getByTestId("route.point.0.pick").click();
      await page.getByTestId("location-picker.confirm").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await page.locator(".location-picker-content__map-overlay").waitFor({
        state: "detached",
        timeout: 60_000,
      });
      await page.getByTestId("location-picker.search").fill("大学城体育馆");
      await page.getByTestId("location-picker.search-result").first().waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "05-location-picker");
    });

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, creator);
      await installDeterministicShareSidecarStubs(page);
      await page.goto(`/pr/${mainPr.id}`);
      await page.locator('[data-page="pr-detail"]').waitFor({ state: "visible", timeout: 15_000 });
      await page.getByText("周六下午羽毛球双打", { exact: true }).waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "06-pr-detail-creator");
    });

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, participant);
      await installDeterministicShareSidecarStubs(page);
      await page.goto(`/pr/${mainPr.id}`);
      await page.getByTestId("pr-detail.join.open").waitFor({ state: "visible", timeout: 15_000 });
      await page.getByTestId("pr-detail.join.open").click();
      await page.getByTestId("pr-detail.join-gate.join-notice.accept").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "07-join-notice");

      await page.getByTestId("pr-detail.join-gate.join-notice.accept").click();
      await page.getByTestId("pr-detail.join-success.confirmation-followup").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "08-join-success-confirmation");

      await page.getByTestId("pr-detail.join-success.confirmation-followup.done").click();
      await page.getByTestId("pr-detail.join-success.subscriptions").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "09-notification-subscriptions");

      await page.getByTestId("pr-detail.join-success.done").click();
      await page.getByTestId("pr-detail.participant.confirm-action").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "10-participant-state");

      await page.getByTestId("pr-detail.share.open").click();
      await captureViewport(page, "11-share-sheet");
      await page.keyboard.press("Escape");

      await page.goto(`/pr/${mainPr.id}/pairing-code`);
      await page.getByTestId("pr-pairing-code.code").waitFor({ state: "visible", timeout: 15_000 });
      await captureViewport(page, "12-pairing-code");
    });

    await createMessage({
      prId: mainPr.id,
      token: creator.token,
      body: "大家好，场地已确认，周六 14:50 在体育馆南门集合。",
    });
    await createMessage({
      prId: mainPr.id,
      token: participant.token,
      body: "收到，我会带一筒新球。",
    });

    const detail = await expectBackendJsonResponse<DetailResponse>(
      await requestBackendJson(`/api/pr/${mainPr.id}`, { token: participant.token }),
      200,
    );
    const creatorRoster = detail.partnerSection.roster.find((item) => item.isCreator);
    assert.ok(creatorRoster, "Creator roster item must exist");

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, participant);
      await installDeterministicShareSidecarStubs(page);

      await page.goto(`/pr/${mainPr.id}/messages`);
      await page.getByText("场地已确认", { exact: false }).waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "13-message-thread");

      await page.goto(`/pr/${mainPr.id}/partners/${creatorRoster.partnerId}`);
      await page.getByText("林晓", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
      await captureViewport(page, "14-partner-profile");

      await page.goto("/pr/mine");
      await page.getByText("周六下午羽毛球双打", { exact: true }).waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "15-my-prs");

      await page.goto("/me");
      await page.getByText("陈然", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
      await captureViewport(page, "16-my-profile");
    });

    const waitlistPr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "OPEN",
      title: "周五晚间羽毛球满员场",
    });
    await joinThroughBackend({ prId: waitlistPr.id, token: activeJoiner.token });

    await withScenarioPage(async (page) => {
      await installScenarioUserSession(page, waitlister);
      await installDeterministicShareSidecarStubs(page);
      await page.goto(`/pr/${waitlistPr.id}`);
      await page.getByTestId("pr-detail.waitlist.open").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await page.getByTestId("pr-detail.waitlist.open").click();
      await page.getByTestId("pr-detail.waitlist.confirm").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "17-waitlist-confirm");
      await page.getByTestId("pr-detail.waitlist.confirm").click();
      await page.getByTestId("pr-detail.waitlist-success.subscriptions").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await page.getByTestId("pr-detail.waitlist-success.done").click();
      await page.getByTestId("pr-detail.waitlist.notice").waitFor({
        state: "visible",
        timeout: 15_000,
      });
      await captureViewport(page, "18-waitlist-state");
    });

    const files = [
      "01-home.png",
      "02-discovery-catalog.png",
      "03-discovery-list.png",
      "04-create-form.png",
      "05-location-picker.png",
      "06-pr-detail-creator.png",
      "07-join-notice.png",
      "08-join-success-confirmation.png",
      "09-notification-subscriptions.png",
      "10-participant-state.png",
      "11-share-sheet.png",
      "12-pairing-code.png",
      "13-message-thread.png",
      "14-partner-profile.png",
      "15-my-prs.png",
      "16-my-profile.png",
      "17-waitlist-confirm.png",
      "18-waitlist-state.png",
    ];
    writeFileSync(
      path.join(OUTPUT_ROOT, "capture-manifest.json"),
      `${JSON.stringify(
        {
          sourceCommit: "30f51b96e2498b4b85014552512a31a7345d86cb",
          viewport: { width: 390, height: 844 },
          generatedAt: new Date().toISOString(),
          prType: badmintonType.type,
          mainPrId: mainPr.id,
          screenshots: files,
        },
        null,
        2,
      )}\n`,
    );
  },
  { timeoutMs: 240_000 },
);
