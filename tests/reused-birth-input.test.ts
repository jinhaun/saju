import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { toReusedBirthInput } from "../lib/saju/reused-birth-input";
import type { SajuInput } from "../lib/saju/chart";

const baseInput: SajuInput = {
  date: "2005-12-23",
  time: "08:37",
  calendar: "solar",
  topic: "career",
  question: "",
};

test("출생 시각을 알면 날짜와 시각을 자동 채움 값으로 보존한다", () => {
  assert.deepEqual(toReusedBirthInput({ ...baseInput, unknownTime: false }), {
    date: "2005-12-23",
    time: "08:37",
    unknownTime: false,
  });
});

test("출생 시각을 모르면 시각을 비우고 시간 미상 상태를 보존한다", () => {
  assert.deepEqual(
    toReusedBirthInput({ ...baseInput, time: "12:00", unknownTime: true }),
    {
      date: "2005-12-23",
      time: "",
      unknownTime: true,
    },
  );
});

test("시간 미상 값이 생략되면 출생 시각을 아는 입력으로 처리한다", () => {
  assert.deepEqual(toReusedBirthInput(baseInput), {
    date: "2005-12-23",
    time: "08:37",
    unknownTime: false,
  });
});

async function readProjectFile(relativePath: string) {
  return readFile(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    "utf8",
  );
}

test("기본 폼 제출은 유효한 계산 뒤에 자동 채움 값을 공유한다", async () => {
  const source = await readProjectFile("app/saju-form.tsx");
  const calculationIndex = source.indexOf("const localChart = calculate(input)");
  const reuseIndex = source.indexOf("reuseBirthInput(toReusedBirthInput(input))");

  assert.ok(calculationIndex >= 0, "기본 사주 계산 호출이 있어야 합니다.");
  assert.ok(reuseIndex > calculationIndex, "유효한 계산이 끝난 뒤 입력을 공유해야 합니다.");
});

test("비슷한 사주 폼은 공유 입력만 채우고 자동 제출하지 않는다", async () => {
  const source = await readProjectFile("app/similar-saju-form.tsx");
  const reuseEffect = source.match(
    /useEffect\(\(\) => \{[\s\S]*?reusedBirthInput[\s\S]*?\}, \[reusedBirthInput\]\);/,
  )?.[0];

  assert.ok(reuseEffect, "공유 입력을 반영하는 effect가 있어야 합니다.");
  assert.match(reuseEffect, /setDate\(reusedBirthInput\.date\)/);
  assert.match(reuseEffect, /setTime\(reusedBirthInput\.time\)/);
  assert.match(reuseEffect, /setUnknownTime\(reusedBirthInput\.unknownTime\)/);
  assert.doesNotMatch(reuseEffect, /handleSubmit|requestSubmit|fetch\(/);
});

test("궁합 폼은 나의 입력만 채우고 상대방 입력과 계산 결과를 유지한다", async () => {
  const source = await readProjectFile("app/compatibility-form.tsx");
  const reuseEffect = source.match(
    /useEffect\(\(\) => \{[\s\S]*?reusedBirthInput[\s\S]*?\}, \[reusedBirthInput\]\);/,
  )?.[0];

  assert.ok(reuseEffect, "공유 입력을 반영하는 effect가 있어야 합니다.");
  assert.match(reuseEffect, /setFirstDate\(reusedBirthInput\.date\)/);
  assert.match(reuseEffect, /setFirstTime\(reusedBirthInput\.time\)/);
  assert.match(reuseEffect, /setFirstUnknownTime\(reusedBirthInput\.unknownTime\)/);
  assert.doesNotMatch(reuseEffect, /setSecond(?:Date|Time|UnknownTime)/);
  assert.doesNotMatch(reuseEffect, /setResult|compareCompatibility|requestSubmit/);
});

test("공유 Provider가 장별 화면을 감싸고 장별 화면이 세 입력 폼을 유지한다", async () => {
  const pageSource = await readProjectFile("app/page.tsx");
  const chapterSource = await readProjectFile("app/chapter-experience.tsx");
  const providerContents = pageSource.match(
    /<ReusedBirthInputProvider>([\s\S]*?)<\/ReusedBirthInputProvider>/,
  )?.[1];

  assert.ok(providerContents, "공유 입력 Provider가 있어야 합니다.");
  assert.match(providerContents, /<ChapterExperience\b/);
  assert.match(chapterSource, /<SajuForm\b/);
  assert.match(chapterSource, /<SimilarSajuForm\b/);
  assert.match(chapterSource, /<CompatibilityForm\b/);
});
