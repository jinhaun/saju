import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompatibleSajuProfile,
  type CompatibleSajuProfile,
} from "../lib/saju/compatible-profile";
import { calculate, type Pillar, type SajuChart } from "../lib/saju/chart";

type Element = keyof SajuChart["elements"];

function makePillar(label: string, branch: string): Pillar {
  return {
    label,
    text: `甲${branch}`,
    korean: "갑자",
    stem: "甲",
    branch,
    stemElement: "목",
    branchElement: "수",
  };
}

function makeChart(
  element: Element,
  branch = "子",
  elementCounts: SajuChart["elements"] = {
    목: 2,
    화: 2,
    토: 2,
    금: 2,
    수: 0,
  },
): SajuChart {
  return {
    pillars: [
      makePillar("년주", "寅"),
      makePillar("월주", "卯"),
      makePillar("일주", branch),
      makePillar("시주", "午"),
    ],
    elements: { ...elementCounts },
    dayMaster: { character: "甲", korean: "갑", element },
    unknownTime: false,
    method: "테스트 계산 기준",
    engine: "test",
    elementMethod: "테스트 오행 기준",
  };
}

const generationCases: Array<{
  mine: Element;
  supportsMe: Element;
  flowsFromMe: Element;
}> = [
  { mine: "목", supportsMe: "수", flowsFromMe: "화" },
  { mine: "화", supportsMe: "목", flowsFromMe: "토" },
  { mine: "토", supportsMe: "화", flowsFromMe: "금" },
  { mine: "금", supportsMe: "토", flowsFromMe: "수" },
  { mine: "수", supportsMe: "금", flowsFromMe: "목" },
];

for (const { mine, supportsMe, flowsFromMe } of generationCases) {
  test(`${mine} 일간은 ${supportsMe}의 도움을 받고 ${flowsFromMe}로 이어진다`, () => {
    const profile = buildCompatibleSajuProfile(makeChart(mine));

    assert.equal(profile.recommendations[0].element, supportsMe);
    assert.equal(profile.recommendations[0].label, "나를 북돋는 기운");
    assert.equal(profile.recommendations[1].element, flowsFromMe);
    assert.equal(profile.recommendations[1].label, "함께 성장하는 기운");
  });
}

test("추천 오행 세 개는 서로 중복되지 않는다", () => {
  for (const { mine } of generationCases) {
    const recommendations = buildCompatibleSajuProfile(makeChart(mine)).recommendations;
    const recommendedElements = recommendations.map(({ element }) => element);

    assert.equal(recommendations.length, 3);
    assert.equal(new Set(recommendedElements).size, 3, `${mine} 일간 추천이 중복됐습니다.`);
  }
});

const harmonyCases: Array<{
  mine: string;
  mineKorean: string;
  partner: string;
  partnerKorean: string;
}> = [
  { mine: "子", mineKorean: "자", partner: "丑", partnerKorean: "축" },
  { mine: "丑", mineKorean: "축", partner: "子", partnerKorean: "자" },
  { mine: "寅", mineKorean: "인", partner: "亥", partnerKorean: "해" },
  { mine: "亥", mineKorean: "해", partner: "寅", partnerKorean: "인" },
  { mine: "卯", mineKorean: "묘", partner: "戌", partnerKorean: "술" },
  { mine: "戌", mineKorean: "술", partner: "卯", partnerKorean: "묘" },
  { mine: "辰", mineKorean: "진", partner: "酉", partnerKorean: "유" },
  { mine: "酉", mineKorean: "유", partner: "辰", partnerKorean: "진" },
  { mine: "巳", mineKorean: "사", partner: "申", partnerKorean: "신" },
  { mine: "申", mineKorean: "신", partner: "巳", partnerKorean: "사" },
  { mine: "午", mineKorean: "오", partner: "未", partnerKorean: "미" },
  { mine: "未", mineKorean: "미", partner: "午", partnerKorean: "오" },
];

test("열두 일지는 양방향 육합 관계와 한글 이름을 반환한다", () => {
  for (const expected of harmonyCases) {
    const harmony = buildCompatibleSajuProfile(makeChart("목", expected.mine)).harmony;

    assert.deepEqual(harmony, {
      myBranch: expected.mine,
      myBranchKorean: expected.mineKorean,
      partnerBranch: expected.partner,
      partnerBranchKorean: expected.partnerKorean,
    });
  }
});

test("보완 오행은 앞선 두 추천을 제외하고 가장 적은 오행을 고른다", () => {
  const profile = buildCompatibleSajuProfile(
    makeChart("목", "子", {
      목: 3,
      화: 0,
      토: 2,
      금: 1,
      수: 0,
    }),
  );
  const balance = profile.recommendations[2];

  assert.equal(profile.recommendations[0].element, "수");
  assert.equal(profile.recommendations[1].element, "화");
  assert.equal(balance.element, "금");
  assert.equal(balance.label, "빈 곳을 채우는 기운");
  assert.match(balance.description, /금 기운은 내 사주에 1개/);
});

test("추천 카드마다 해당 오행의 두 일간 이름을 제공한다", () => {
  const expectedDayMasters: Record<Element, string> = {
    목: "갑목·을목",
    화: "병화·정화",
    토: "무토·기토",
    금: "경금·신금",
    수: "임수·계수",
  };

  for (const { mine } of generationCases) {
    const profile: CompatibleSajuProfile = buildCompatibleSajuProfile(makeChart(mine));
    for (const recommendation of profile.recommendations) {
      assert.equal(
        recommendation.dayMasters,
        expectedDayMasters[recommendation.element],
      );
    }
  }
});

test("알려진 입력의 화면 추천 요약은 토 · 수 · 목 순서다", () => {
  const chart = calculate({
    date: "1990-01-15",
    time: "12:30",
    calendar: "solar",
    topic: "relationship",
    question: "",
    unknownTime: false,
  });
  const summary = buildCompatibleSajuProfile(chart)
    .recommendations
    .map(({ element }) => element)
    .join(" · ");

  assert.equal(summary, "토 · 수 · 목");
});
