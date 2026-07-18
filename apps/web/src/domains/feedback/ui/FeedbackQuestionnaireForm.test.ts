// @vitest-environment happy-dom

import { type App, createApp, nextTick } from "vue";
import { afterEach, describe, expect, test, vi } from "vitest";
import type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "@partner-up-dev/backend/contracts";
import FeedbackQuestionnaireForm from "./FeedbackQuestionnaireForm.vue";

const definition = {
  key: "feedback-form-test",
  version: "1",
  title: "Feedback form",
  questions: [
    {
      id: "rating",
      type: "single_choice",
      label: "Rating",
      required: true,
      options: [
        {
          value: "bad",
          label: "Needs improvement",
          requires: [{ questionId: "note" }],
        },
      ],
    },
    {
      id: "note",
      type: "textarea",
      label: "Improvement note",
      required: false,
      maxLength: 500,
    },
  ],
} satisfies FeedbackQuestionnaireDefinition;

let mountedApp: App<Element> | null = null;
let host: HTMLElement | null = null;

afterEach(() => {
  mountedApp?.unmount();
  host?.remove();
  mountedApp = null;
  host = null;
});

const setTextareaValue = (textarea: HTMLTextAreaElement, value: string): void => {
  textarea.value = value;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("FeedbackQuestionnaireForm", () => {
  test("keeps conditional answers available for a retry after submit", async () => {
    const submissions: FeedbackQuestionnaireAnswers[] = [];
    const onSubmit = vi.fn<(answers: FeedbackQuestionnaireAnswers) => void>(
      (answers: FeedbackQuestionnaireAnswers) => {
        submissions.push(JSON.parse(JSON.stringify(answers)) as FeedbackQuestionnaireAnswers);
      },
    );
    host = document.createElement("div");
    document.body.appendChild(host);
    mountedApp = createApp(FeedbackQuestionnaireForm, {
      instanceId: 7,
      definition,
      pending: false,
      onSubmit,
    });
    mountedApp.mount(host);
    await nextTick();

    host.querySelector<HTMLInputElement>('input[name="rating"]')?.click();
    await nextTick();
    host.querySelector<HTMLButtonElement>('[data-testid="pr-detail.feedback.submit"]')?.click();
    await nextTick();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(host.textContent).toContain("请填写「Improvement note」");

    const textarea = host.querySelector<HTMLTextAreaElement>("#feedback-7-note");
    expect(textarea).not.toBeNull();
    setTextareaValue(textarea as HTMLTextAreaElement, "More seasoning would help.");
    await nextTick();
    host.querySelector<HTMLButtonElement>('[data-testid="pr-detail.feedback.submit"]')?.click();
    await nextTick();
    host.querySelector<HTMLButtonElement>('[data-testid="pr-detail.feedback.submit"]')?.click();
    await nextTick();

    expect(submissions).toEqual([
      {
        rating: { type: "single_choice", value: "bad" },
        note: { type: "textarea", value: "More seasoning would help." },
      },
      {
        rating: { type: "single_choice", value: "bad" },
        note: { type: "textarea", value: "More seasoning would help." },
      },
    ]);
  });
});
