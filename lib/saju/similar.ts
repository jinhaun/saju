import {
  calculate,
  MAX_BIRTH_DATE,
  MIN_BIRTH_DATE,
  type SajuChart,
} from "./chart";

export type SimilarSajuInput = {
  date: string;
  time: string;
  unknownTime: boolean;
};

export type SimilarSajuMatch = {
  date: string;
  time: string | null;
  score: number;
  label: string;
  samePillars: string[];
  elementSimilarity: number;
  chart: SajuChart;
};

export type SimilarSajuResult = {
  source: SajuChart;
  matches: SimilarSajuMatch[];
  methodNote: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PILLAR_CYCLE = 60;
const elements = ["목", "화", "토", "금", "수"] as const;

function chartFor(input: SimilarSajuInput, date = input.date) {
  return calculate({
    date,
    time: input.unknownTime ? "" : input.time,
    unknownTime: input.unknownTime,
    calendar: "solar",
    topic: "strengths",
    question: "",
  });
}

function isoDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function chartSignature(chart: SajuChart) {
  return chart.pillars.map((pillar) => pillar.text).join("|");
}

function elementSimilarity(source: SajuChart, candidate: SajuChart) {
  const totalCharacters = source.pillars.length * 2;
  const difference = elements.reduce(
    (sum, element) =>
      sum + Math.abs(source.elements[element] - candidate.elements[element]),
    0,
  );
  return Math.round((1 - difference / (totalCharacters * 2)) * 100);
}

function scoreSimilarity(source: SajuChart, candidate: SajuChart) {
  const samePillars = source.pillars
    .filter((pillar, index) => pillar.text === candidate.pillars[index]?.text)
    .map((pillar) => pillar.label);
  const distributionSimilarity = elementSimilarity(source, candidate);
  const elementWeight = source.unknownTime ? 30 : 15;
  const score =
    samePillars.length * 15 +
    (source.dayMaster.character === candidate.dayMaster.character ? 15 : 0) +
    (source.pillars[2].branch === candidate.pillars[2].branch ? 10 : 0) +
    (distributionSimilarity / 100) * elementWeight;

  return {
    score: Math.min(99, Math.round(score)),
    samePillars,
    elementSimilarity: distributionSimilarity,
  };
}

function scoreLabel(score: number) {
  if (score >= 85) return "매우 닮은 구성";
  if (score >= 70) return "많이 닮은 구성";
  return "닮은 흐름이 있는 구성";
}

export function findSimilarSaju(
  input: SimilarSajuInput,
  limit = 5,
): SimilarSajuResult {
  const source = chartFor(input);
  const sourceTimestamp = Date.parse(`${input.date}T00:00:00Z`);
  const minimumTimestamp = Date.parse(`${MIN_BIRTH_DATE}T00:00:00Z`);
  const maximumTimestamp = Date.parse(`${MAX_BIRTH_DATE}T00:00:00Z`);
  const sourceSignature = chartSignature(source);
  const candidateDates: string[] = [];

  for (
    let timestamp = sourceTimestamp - DAY_PILLAR_CYCLE * DAY_MS;
    timestamp >= minimumTimestamp;
    timestamp -= DAY_PILLAR_CYCLE * DAY_MS
  ) {
    candidateDates.push(isoDate(timestamp));
  }
  for (
    let timestamp = sourceTimestamp + DAY_PILLAR_CYCLE * DAY_MS;
    timestamp <= maximumTimestamp;
    timestamp += DAY_PILLAR_CYCLE * DAY_MS
  ) {
    candidateDates.push(isoDate(timestamp));
  }

  const matches = candidateDates
    .map((date) => {
      const chart = chartFor(input, date);
      if (chartSignature(chart) === sourceSignature) return null;
      const similarity = scoreSimilarity(source, chart);
      return {
        date,
        time: input.unknownTime ? null : input.time,
        label: scoreLabel(similarity.score),
        chart,
        ...similarity,
      } satisfies SimilarSajuMatch;
    })
    .filter((match): match is SimilarSajuMatch => match !== null)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.elementSimilarity !== left.elementSimilarity) {
        return right.elementSimilarity - left.elementSimilarity;
      }
      const leftDistance = Math.abs(
        Date.parse(`${left.date}T00:00:00Z`) - sourceTimestamp,
      );
      const rightDistance = Math.abs(
        Date.parse(`${right.date}T00:00:00Z`) - sourceTimestamp,
      );
      return leftDistance - rightDistance || left.date.localeCompare(right.date);
    })
    .slice(0, Math.max(0, limit));

  return {
    source,
    matches,
    methodNote: input.unknownTime
      ? "같은 일주를 가진 날짜 중 년주·월주와 오행 분포를 비교했습니다. 출생 시각을 몰라 시주는 제외했습니다."
      : "같은 일주를 가진 날짜를 같은 출생 시각으로 계산해 년주·월주·시주와 오행 분포를 비교했습니다.",
  };
}
