import { ref } from "vue";
import { i18n } from "@/locales/i18n";

const rotatingTopics: ReadonlyArray<{ name: string; example: string }> = [
  {
    name: i18n.global.t("home.topics.movie.name"),
    example: i18n.global.t("home.topics.movie.example"),
  },
  {
    name: i18n.global.t("home.topics.sports.name"),
    example: i18n.global.t("home.topics.sports.example"),
  },
  {
    name: i18n.global.t("home.topics.explore.name"),
    example: i18n.global.t("home.topics.explore.example"),
  },
  {
    name: i18n.global.t("home.topics.hiking.name"),
    example: i18n.global.t("home.topics.hiking.example"),
  },
  {
    name: i18n.global.t("home.topics.study.name"),
    example: i18n.global.t("home.topics.study.example"),
  },
];

const topicIndex = ref(0);
const rotatingTopicName = ref(rotatingTopics[topicIndex.value]?.name ?? "");
const rotatingTopicExample = ref(
  rotatingTopics[topicIndex.value]?.example ?? "",
);

const normalizeIndex = (index: number) => {
  const total = rotatingTopics.length;
  if (total === 0) return 0;
  return ((index % total) + total) % total;
};

const setTopicIndex = (index: number) => {
  const normalized = normalizeIndex(index);
  const nextTopic = rotatingTopics[normalized];
  topicIndex.value = normalized;
  rotatingTopicName.value = nextTopic?.name ?? "";
  rotatingTopicExample.value = nextTopic?.example ?? "";
};

export const useLandingRotatingTopic = () => ({
  rotatingTopics,
  rotatingTopicName,
  rotatingTopicExample,
  topicIndex,
  setTopicIndex,
});
