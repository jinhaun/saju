import test from "node:test";
import assert from "node:assert/strict";
import { compareCompatibility, type CompatibilityPersonInput } from "../lib/saju/compatibility";

const first: CompatibilityPersonInput = {
  date: "1992-04-15",
  time: "08:30",
  unknownTime: false,
};

const second: CompatibilityPersonInput = {
  date: "1994-11-08",
  time: "19:20",
  unknownTime: false,
};

test("두 사람의 시간을 알면 네 기둥을 사용해 결과 네 영역을 만든다", () => {
  const result = compareCompatibility(first, second);

  assert.deepEqual(result.people.map((person) => person.usedPillarCount), [4, 4]);
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.scoreLabel);
  assert.ok(result.strengths.length >= 2);
  assert.ok(result.cautions.length >= 2);
  assert.equal(result.advice.length, 2);
  assert.match(result.accuracyNote, /네 기둥/);
});

test("시간을 모르면 빈 시간을 허용하고 그 사람의 시주를 제외한다", () => {
  const result = compareCompatibility(
    { ...first, time: undefined, unknownTime: true },
    second,
  );

  assert.deepEqual(result.people.map((person) => person.usedPillarCount), [3, 4]);
  assert.match(result.accuracyNote, /시주를 제외/);
});

test("두 사람의 입력 순서를 바꿔도 점수가 같다", () => {
  assert.equal(
    compareCompatibility(first, second).score,
    compareCompatibility(second, first).score,
  );
});

test("지원 범위의 시작일과 마지막 날을 허용한다", () => {
  const result = compareCompatibility(
    { date: "1900-01-01", unknownTime: true },
    { date: "2026-12-31", unknownTime: true },
  );

  assert.deepEqual(result.people.map((person) => person.usedPillarCount), [3, 3]);
});

for (const date of ["1899-12-31", "2027-01-01"]) {
  test(`지원 범위 밖 날짜 ${date}를 거절한다`, () => {
    assert.throws(
      () => compareCompatibility({ ...first, date }, second),
      /1900년 1월 1일부터 2026년 12월 31일/,
    );
  });
}

test("시간을 안다고 선택했으면 올바른 시간이 필요하다", () => {
  assert.throws(
    () => compareCompatibility({ ...first, time: "", unknownTime: false }, second),
    /시각/,
  );
});
