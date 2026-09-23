import {
  calculate,
  type Pillar,
  type SajuChart,
} from "./chart";

const elements = ["목", "화", "토", "금", "수"] as const;
type Element = (typeof elements)[number];

export type CompatibilityPersonInput = {
  date: string;
  time?: string;
  unknownTime: boolean;
};

export type CompatibilityResult = {
  score: number;
  scoreLabel: string;
  people: [CompatibilityPersonSummary, CompatibilityPersonSummary];
  strengths: string[];
  cautions: string[];
  advice: string[];
  accuracyNote: string;
};

type CompatibilityPersonSummary = {
  dayPillar: string;
  dayPillarKorean: string;
  dayMaster: SajuChart["dayMaster"];
  usedPillarCount: 3 | 4;
};

type PreparedPerson = {
  chart: SajuChart;
  pillars: Pillar[];
  elementCounts: Record<Element, number>;
  unknownTime: boolean;
};

const generates: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const harmonyPairs = [
  ["子", "丑"],
  ["寅", "亥"],
  ["卯", "戌"],
  ["辰", "酉"],
  ["巳", "申"],
  ["午", "未"],
] as const;

const clashPairs = [
  ["子", "午"],
  ["丑", "未"],
  ["寅", "申"],
  ["卯", "酉"],
  ["辰", "戌"],
  ["巳", "亥"],
] as const;

function hasPair(
  pairs: ReadonlyArray<readonly [string, string]>,
  first: string,
  second: string,
) {
  return pairs.some(
    ([left, right]) =>
      (left === first && right === second) ||
      (left === second && right === first),
  );
}

function preparePerson(input: CompatibilityPersonInput): PreparedPerson {
  const chart = calculate({
    date: input.date,
    time: input.time || "",
    calendar: "solar",
    topic: "relationship",
    question: "",
    unknownTime: input.unknownTime,
  });
  const pillars = chart.pillars;
  const elementCounts: Record<Element, number> = {
    목: 0,
    화: 0,
    토: 0,
    금: 0,
    수: 0,
  };

  for (const pillar of pillars) {
    elementCounts[pillar.stemElement as Element] += 1;
    elementCounts[pillar.branchElement as Element] += 1;
  }

  return { chart, pillars, elementCounts, unknownTime: input.unknownTime };
}

function summarize(person: PreparedPerson): CompatibilityPersonSummary {
  const dayPillar = person.chart.pillars[2];
  return {
    dayPillar: dayPillar.text,
    dayPillarKorean: dayPillar.korean,
    dayMaster: person.chart.dayMaster,
    usedPillarCount: person.unknownTime ? 3 : 4,
  };
}

function scoreLabel(score: number) {
  if (score >= 80) return "잘 맞는 흐름이 많은 편이에요";
  if (score >= 65) return "균형을 맞춰가기 좋은 편이에요";
  return "대화와 조율이 중요한 관계예요";
}

function withAndParticle(element: Element) {
  return `${element}${element === "목" || element === "금" ? "과" : "와"}`;
}

export function compareCompatibility(
  firstInput: CompatibilityPersonInput,
  secondInput: CompatibilityPersonInput,
): CompatibilityResult {
  const first = preparePerson(firstInput);
  const second = preparePerson(secondInput);
  const firstElement = first.chart.dayMaster.element as Element;
  const secondElement = second.chart.dayMaster.element as Element;
  const firstBranch = first.chart.pillars[2].branch;
  const secondBranch = second.chart.pillars[2].branch;

  const isSameElement = firstElement === secondElement;
  const isGenerating =
    generates[firstElement] === secondElement ||
    generates[secondElement] === firstElement;
  const isHarmony = hasPair(harmonyPairs, firstBranch, secondBranch);
  const isClash = hasPair(clashPairs, firstBranch, secondBranch);
  const complementaryElements = elements.filter(
    (element) =>
      (first.elementCounts[element] <= 1 && second.elementCounts[element] >= 2) ||
      (second.elementCounts[element] <= 1 && first.elementCounts[element] >= 2),
  );

  let score = 60;
  score += isSameElement ? 4 : isGenerating ? 10 : -6;
  score += isHarmony ? 12 : isClash ? -12 : 0;
  score += Math.min(8, complementaryElements.length * 2);
  score = Math.max(30, Math.min(92, score));

  const strengths: string[] = [];
  if (isGenerating) {
    strengths.push(
      `${withAndParticle(firstElement)} ${secondElement} 기운이 서로 이어지는 관계라, 한 사람의 방식이 다른 사람의 성장을 돕기 쉬워요.`,
    );
  } else if (isSameElement) {
    strengths.push(
      `두 사람의 중심 기운이 ${firstElement}으로 같아 생각의 속도와 중요하게 여기는 기준을 이해하기 쉬워요.`,
    );
  } else {
    strengths.push(
      `${withAndParticle(firstElement)} ${secondElement}의 관점이 달라 역할을 나누면 서로 보지 못한 부분을 채울 수 있어요.`,
    );
  }
  if (isHarmony) {
    strengths.push("두 사람의 일지가 합을 이루어 일상에서 자연스럽게 호흡을 맞추는 장점이 있어요.");
  } else if (complementaryElements.length > 0) {
    strengths.push(
      `서로 부족한 ${complementaryElements.join("·")} 기운을 보완할 가능성이 있어요.`,
    );
  } else {
    strengths.push("서로 비슷한 부분과 다른 부분이 함께 있어 경험을 쌓을수록 관계의 장점을 찾기 쉬워요.");
  }

  const cautions: string[] = [];
  if (isClash) {
    cautions.push("두 사람의 일지가 충을 이루어 생활 리듬이나 감정 표현 방식이 빠르게 부딪힐 수 있어요.");
  } else if (!isGenerating && !isSameElement) {
    cautions.push("의견이 다를 때 누가 이끌지 정하지 않으면 주도권 다툼처럼 느껴질 수 있어요.");
  } else if (isSameElement) {
    cautions.push("닮은 방식이 장점이지만, 둘 다 같은 부분을 고집하면 양보할 사람이 없어질 수 있어요.");
  } else {
    cautions.push("서로 돕는 관계라도 한쪽만 계속 맞춰주면 부담이 쌓일 수 있어요.");
  }

  const combined = elements.map((element) => ({
    element,
    count: first.elementCounts[element] + second.elementCounts[element],
  }));
  const strongest = combined.reduce((best, item) =>
    item.count > best.count ? item : best,
  );
  cautions.push(
    `두 사람을 함께 보면 ${strongest.element} 기운이 가장 두드러져, 그 장점만 반복하지 않도록 다른 방식도 의식해보세요.`,
  );

  const advice = [
    "의견이 다를 때 결론부터 정하기보다 각자가 중요하게 보는 기준을 한 문장씩 먼저 말해보세요.",
    "잘 맞는 점은 당연하게 넘기지 말고, 서로 고마웠던 행동을 구체적으로 표현해보세요.",
  ];

  const hasUnknownTime = first.unknownTime || second.unknownTime;
  return {
    score,
    scoreLabel: scoreLabel(score),
    people: [summarize(first), summarize(second)],
    strengths,
    cautions,
    advice,
    accuracyNote: hasUnknownTime
      ? "출생 시각을 모르는 사람은 시주를 제외한 세 기둥으로 비교했습니다. 시간까지 입력한 결과보다 해석 범위가 좁습니다."
      : "두 사람 모두 출생 시각을 포함한 네 기둥으로 비교했습니다.",
  };
}
