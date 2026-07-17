// @vitest-environment happy-dom

import { type App, createApp, nextTick } from "vue";
import { afterEach, describe, expect, test } from "vitest";
import type { PRDetailView } from "@/domains/pr/model/types";
import PRFeedbackQuestionnaireModal from "./PRFeedbackQuestionnaireModal.vue";

let mountedApp: App<Element> | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  mountedApp?.unmount();
  host?.remove();
  mountedApp = null;
  host = null;
});

describe("PRFeedbackQuestionnaireModal", () => {
  test("renders a retryable submission error inside the open modal", async () => {
    const questionnaire = {
      instanceId: 7,
      title: "Activity feedback",
      definition: {
        key: "modal-test",
        version: "1",
        title: "Activity feedback",
        questions: [
          {
            id: "note",
            type: "textarea",
            label: "Note",
            required: true,
            maxLength: 100,
          },
        ],
      },
      responseState: { status: "NOT_SUBMITTED" },
    } as PRDetailView["feedbackQuestionnaire"];
    host = document.createElement("div");
    document.body.appendChild(host);
    mountedApp = createApp(PRFeedbackQuestionnaireModal, {
      open: true,
      questionnaire,
      pending: false,
      errorMessage: "请补充必填反馈",
    });
    mountedApp.mount(host);
    await nextTick();

    const error = document.body.querySelector('[data-testid="pr-detail.feedback.error"]');
    expect(error?.textContent).toContain("请补充必填反馈");
    expect(document.body.querySelector('[data-testid="pr-detail.feedback.submit"]')).not.toBeNull();
  });
});
