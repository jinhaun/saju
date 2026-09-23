import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/similar-saju/route";
import { findSimilarSaju } from "../lib/saju/similar";

const knownTimeInput = {
  date: "2005-12-23",
  time: "08:37",
  unknownTime: false,
};

function signature(pillars: Array<{ text: string }>) {
  return pillars.map((pillar) => pillar.text).join("|");
}

test("같은 일주 중 완전히 같지 않은 닮은 사주 다섯 개를 찾는다", () => {
  const result = findSimilarSaju(knownTimeInput);
  const sourceSignature = signature(result.source.pillars);

  assert.equal(result.matches.length, 5);
  assert.equal(result.source.pillars.length, 4);
  for (const [index, match] of result.matches.entries()) {
    assert.notEqual(match.date, knownTimeInput.date);
    assert.equal(match.time, knownTimeInput.time);
    assert.equal(match.chart.pillars.length, 4);
    assert.equal(match.chart.pillars[2].text, result.source.pillars[2].text);
    assert.notEqual(signature(match.chart.pillars), sourceSignature);
    assert.ok(match.samePillars.includes("일주"));
    assert.ok(match.score >= 0 && match.score < 100);
    if (index > 0) {
      assert.ok(result.matches[index - 1].score >= match.score);
    }
  }
});

test("출생 시각을 모르면 시주 없이 세 기둥만 비교한다", () => {
  const result = findSimilarSaju({
    ...knownTimeInput,
    time: "",
    unknownTime: true,
  });

  assert.equal(result.source.pillars.length, 3);
  assert.match(result.methodNote, /시주는 제외/);
  for (const match of result.matches) {
    assert.equal(match.time, null);
    assert.equal(match.chart.pillars.length, 3);
    assert.equal(match.chart.pillars.some((pillar) => pillar.label === "시주"), false);
  }
});

test("지원 범위의 끝 날짜에서도 앞선 후보를 찾아 반환한다", () => {
  const result = findSimilarSaju({
    date: "2026-12-31",
    time: "12:00",
    unknownTime: false,
  });

  assert.equal(result.matches.length, 5);
  assert.ok(result.matches.every((match) => match.date < "2026-12-31"));
});

test("비슷한 사주 API는 서버 계산 결과를 반환한다", async () => {
  const response = await POST(
    new Request("http://localhost/api/similar-saju", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...knownTimeInput, score: 100, chart: "fake" }),
    }),
  );
  const body = (await response.json()) as ReturnType<typeof findSimilarSaju>;

  assert.equal(response.status, 200);
  assert.equal(body.matches.length, 5);
  assert.equal(body.matches[0].date === knownTimeInput.date, false);
});

test("비슷한 사주 API는 잘못된 입력을 400으로 거절한다", async () => {
  const response = await POST(
    new Request("http://localhost/api/similar-saju", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...knownTimeInput, date: "2027-01-01" }),
    }),
  );
  const body = (await response.json()) as { code: string };

  assert.equal(response.status, 400);
  assert.equal(body.code, "INVALID_INPUT");
});
