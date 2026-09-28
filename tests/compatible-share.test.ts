import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../lib/saju/chart";
import {
  buildCompatibleSajuProfile,
  type CompatibleSajuProfile,
} from "../lib/saju/compatible-profile";
import {
  buildCompatibleShareSvg,
  COMPATIBLE_SHARE_HEIGHT,
  COMPATIBLE_SHARE_WIDTH,
} from "../lib/saju/compatible-share";

function knownProfile() {
  const chart = calculate({
    date: "1990-01-15",
    time: "12:30",
    calendar: "solar",
    topic: "relationship",
    question: "공유 이미지에 들어가면 안 되는 사용자의 고민",
    unknownTime: false,
  });
  return buildCompatibleSajuProfile(chart);
}

test("알려진 입력의 관계 조화 제목, 추천 세 카드, 오행과 육합을 SVG에 담는다", () => {
  const profile = knownProfile();
  const svg = buildCompatibleShareSvg(profile);
  const expectedHarmony = `나의 ${profile.harmony.myBranchKorean}(${profile.harmony.myBranch})와 ${profile.harmony.partnerBranchKorean}(${profile.harmony.partnerBranch}) 일지`;

  assert.match(svg, /관계의 조화 살펴보기/);
  assert.match(svg, /나와 잘 맞는 사주/);
  assert.match(svg, /토 · 수 · 목/);
  assert.equal((svg.match(/<g class="card">/g) || []).length, 3);
  assert.ok(svg.includes(expectedHarmony));
  assert.match(svg, /육합 관계/);

  for (const recommendation of profile.recommendations) {
    assert.ok(svg.includes(recommendation.label));
    assert.ok(svg.includes(`${recommendation.dayMasters} 일간`));
  }
});

test("공유 SVG에는 생년월일, 시각, 고민과 Gemini 전체 해석 데이터를 넣지 않는다", () => {
  const svg = buildCompatibleShareSvg(knownProfile());
  const excludedValues = [
    "1990-01-15",
    "12:30",
    "공유 이미지에 들어가면 안 되는 사용자의 고민",
    "사용자의 고민",
    "Gemini 해석",
    "사주 네 기둥",
  ];

  for (const value of excludedValues) {
    assert.equal(svg.includes(value), false, `공유 SVG에 제외 데이터가 포함됐습니다: ${value}`);
  }
});

test("SVG 크기를 고정하고 전달받은 XML 위험 문자를 escape한다", () => {
  const profile = knownProfile();
  const dangerous = `A&B <C> "D" 'E'`;
  const unsafeProfile: CompatibleSajuProfile = {
    ...profile,
    recommendations: profile.recommendations.map((recommendation, index) =>
      index === 0
        ? {
            ...recommendation,
            label: dangerous,
            description: dangerous,
          }
        : recommendation,
    ),
    note: dangerous,
  };
  const svg = buildCompatibleShareSvg(unsafeProfile);

  assert.match(
    svg,
    new RegExp(
      `<svg[^>]+width="${COMPATIBLE_SHARE_WIDTH}"[^>]+height="${COMPATIBLE_SHARE_HEIGHT}"[^>]+viewBox="0 0 ${COMPATIBLE_SHARE_WIDTH} ${COMPATIBLE_SHARE_HEIGHT}"`,
    ),
  );
  assert.equal(COMPATIBLE_SHARE_WIDTH, 1080);
  assert.equal(COMPATIBLE_SHARE_HEIGHT, 1560);
  assert.equal(svg.includes(dangerous), false);
  assert.ok(svg.includes("A&amp;B &lt;C&gt; &quot;D&quot; &apos;E&apos;"));
});
