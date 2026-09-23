import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeCursor,
  encodeCursor,
  isReadingId,
  parseSaveReadingRequest,
} from "../lib/saju/saved-reading";
import type { SajuInput } from "../lib/saju/chart";
import type { SajuReading } from "../lib/saju/reading";
import { safeNextPath } from "../lib/supabase/redirect";

const validInput: SajuInput = {
  date: "2005-12-23",
  time: "08:37",
  calendar: "solar",
  topic: "career",
  question: "저에게 맞는 일의 방향이 궁금해요.",
};

const validReading: SajuReading = {
  headline: "기준을 세우며 방향을 찾는 사람",
  summary: "서두르기보다 기준을 분명히 할 때 강점이 드러납니다.",
  sections: [
    {
      title: "기질과 강점",
      body: "차분히 비교하고 핵심을 찾는 힘이 있습니다.",
    },
    {
      title: "선택한 고민",
      body: "진로 후보마다 중요 기준을 나누어 살펴보세요.",
    },
    {
      title: "주의해서 볼 점",
      body: "완벽한 답을 기다리다 시작을 늦추지 않도록 해보세요.",
    },
  ],
  actions: ["후보별 장단점 세 개 적기", "이번 주에 한 사람에게 경험 묻기"],
};

const validRequest = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  input: validInput,
  reading: validReading,
};

test("로그인 콜백은 내부 상대 경로만 허용한다", () => {
  assert.equal(safeNextPath("/"), "/");
  assert.equal(safeNextPath("/readings?cursor=next"), "/readings?cursor=next");
  assert.equal(safeNextPath("https://outside.example/path"), "/");
  assert.equal(safeNextPath("//outside.example/path"), "/");
  assert.equal(safeNextPath("javascript:alert(1)"), "/");
  assert.equal(safeNextPath(null), "/");
});

test("정상 저장 요청을 검사하고 허용된 입력만 반환한다", () => {
  const parsed = parseSaveReadingRequest({
    ...validRequest,
    userId: "클라이언트가 보낸 사용자 ID",
    input: {
      ...validInput,
      chart: { pillars: ["조작된 계산값"] },
      email: "private@example.com",
    },
  });

  assert.deepEqual(parsed, {
    ...validRequest,
    input: { ...validInput, unknownTime: false },
  });
  assert.equal("userId" in parsed, false);
  assert.equal("chart" in parsed.input, false);
  assert.equal("email" in parsed.input, false);
});

test("출생 시각을 모르는 저장 요청은 빈 시각과 선택 상태를 유지한다", () => {
  const parsed = parseSaveReadingRequest({
    ...validRequest,
    input: { ...validInput, time: "", unknownTime: true },
  });

  assert.equal(parsed.input.time, "");
  assert.equal(parsed.input.unknownTime, true);
});

for (const requestId of [
  "",
  "not-a-uuid",
  "123e4567-e89b-02d3-a456-426614174000",
  "123e4567-e89b-42d3-c456-426614174000",
]) {
  test(`올바르지 않은 저장 UUID를 거부한다: ${requestId || "빈 값"}`, () => {
    assert.throws(
      () => parseSaveReadingRequest({ ...validRequest, requestId }),
      /저장 요청 번호/,
    );
  });
}

for (const [name, input, message] of [
  ["존재하지 않는 날짜", { ...validInput, date: "2005-02-30" }, /존재/],
  ["올바르지 않은 시각", { ...validInput, time: "24:00" }, /시각/],
  ["허용하지 않는 주제", { ...validInput, topic: "health" }, /주제/],
  ["201자 질문", { ...validInput, question: "가".repeat(201) }, /200자/],
] as const) {
  test(`저장 전에 입력을 다시 검사한다: ${name}`, () => {
    assert.throws(
      () => parseSaveReadingRequest({ ...validRequest, input }),
      message,
    );
  });
}

for (const [name, reading, message] of [
  ["해석 누락", undefined, /JSON/],
  ["필수 필드 누락", { headline: "제목만 있음" }, /핵심 요약/],
  [
    "상세 영역 순서 변경",
    {
      ...validReading,
      sections: [
        validReading.sections[1],
        validReading.sections[0],
        validReading.sections[2],
      ],
    },
    /순서/,
  ],
] as const) {
  test(`저장 전에 해석 구조를 다시 검사한다: ${name}`, () => {
    assert.throws(
      () => parseSaveReadingRequest({ ...validRequest, reading }),
      message,
    );
  });
}

test("목록 커서를 인코딩하고 UTC ISO 형식으로 복원한다", () => {
  const encoded = encodeCursor({
    createdAt: "2026-09-23T10:20:30+09:00",
    id: "42",
  });

  assert.deepEqual(decodeCursor(encoded), {
    createdAt: "2026-09-23T01:20:30.000Z",
    id: "42",
  });
  assert.equal(decodeCursor(null), null);
});

for (const [name, value] of [
  ["JSON이 아닌 값", "not-json"],
  [
    "날짜가 올바르지 않은 값",
    Buffer.from(JSON.stringify({ createdAt: "not-a-date", id: "1" })).toString(
      "base64url",
    ),
  ],
  [
    "ID가 0인 값",
    Buffer.from(
      JSON.stringify({ createdAt: "2026-09-23T01:20:30.000Z", id: "0" }),
    ).toString("base64url"),
  ],
] as const) {
  test(`올바르지 않은 목록 커서를 거부한다: ${name}`, () => {
    assert.throws(() => decodeCursor(value), /목록 위치 정보/);
  });
}

test("저장 결과 ID는 0이 아닌 십진수 정수만 허용한다", () => {
  for (const value of ["1", "42", "9007199254740993"]) {
    assert.equal(isReadingId(value), true, value);
  }
  for (const value of ["", "0", "01", "+1", "-1", "1.0", "1e3", "abc"]) {
    assert.equal(isReadingId(value), false, value);
  }
});
