import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../lib/saju/chart";
import {
  buildDailyFortunePrompt,
  generateDailyFortune,
  getFortunePeriod,
  parseDailyFortune,
  type DailyFortune,
} from "../lib/saju/daily-fortune";

const validFortune: DailyFortune = {
  headline: "작은 기준이 오늘의 흐름을 정리해 줍니다",
  summary:
    "서두르기보다 우선순위를 하나씩 살피기 좋은 날로 볼 수 있습니다. 선택할 때는 내 기준을 먼저 확인해 보세요.",
  sections: [
    {
      title: "마음과 선택",
      body: "마음이 흔들릴 때 해야 할 일 하나를 먼저 고르면 도움이 될 수 있습니다.",
    },
    {
      title: "사람과 관계",
      body: "상대의 뜻을 단정하기보다 한 번 더 물어보는 태도가 좋겠습니다.",
    },
    {
      title: "일과 재물",
      body: "큰 결정보다 오늘 끝낼 수 있는 작은 일을 정리해 보세요.",
    },
  ],
  actions: ["해야 할 일 하나를 먼저 끝내기", "대화 전에 궁금한 점을 한 줄로 적기"],
  caution: "확인하지 않은 일을 사실처럼 단정하지 않도록 살펴보세요.",
};

function interactionFor(fortune: unknown) {
  return {
    steps: [
      {
        type: "model_output",
        content: [{ type: "text", text: JSON.stringify(fortune) }],
      },
    ],
  };
}

test("한국 시간 오전 9시 직전에는 전날 운세를 유지한다", () => {
  assert.deepEqual(getFortunePeriod(new Date("2026-09-28T23:59:59.999Z")), {
    fortuneDate: "2026-09-28",
    nextRefreshAt: "2026-09-29T00:00:00.000Z",
  });
});

test("한국 시간 오전 9시부터 새 날짜 운세로 바뀐다", () => {
  assert.deepEqual(getFortunePeriod(new Date("2026-09-29T00:00:00.000Z")), {
    fortuneDate: "2026-09-29",
    nextRefreshAt: "2026-09-30T00:00:00.000Z",
  });
});

test("월말과 연말에도 한국 시간 오전 9시 경계를 계산한다", () => {
  assert.deepEqual(getFortunePeriod(new Date("2026-12-31T23:59:59.999Z")), {
    fortuneDate: "2026-12-31",
    nextRefreshAt: "2027-01-01T00:00:00.000Z",
  });
  assert.deepEqual(getFortunePeriod(new Date("2027-01-01T00:00:00.000Z")), {
    fortuneDate: "2027-01-01",
    nextRefreshAt: "2027-01-02T00:00:00.000Z",
  });
});

test("정상 운세 응답을 파싱하고 문자열 앞뒤 공백을 정리한다", () => {
  const parsed = parseDailyFortune(
    JSON.stringify({
      ...validFortune,
      headline: `  ${validFortune.headline}  `,
      actions: validFortune.actions.map((action) => ` ${action} `),
    }),
  );

  assert.equal(parsed.headline, validFortune.headline);
  assert.deepEqual(parsed.sections, validFortune.sections);
  assert.deepEqual(parsed.actions, validFortune.actions);
});

for (const [name, payload, message] of [
  ["JSON 아님", "{", /JSON/],
  ["객체 아님", JSON.stringify([]), /구조/],
  [
    "영역 누락",
    JSON.stringify({ ...validFortune, sections: validFortune.sections.slice(0, 2) }),
    /영역/,
  ],
  [
    "영역 순서 변경",
    JSON.stringify({
      ...validFortune,
      sections: [
        validFortune.sections[1],
        validFortune.sections[0],
        validFortune.sections[2],
      ],
    }),
    /순서/,
  ],
  [
    "행동 제안 한 개",
    JSON.stringify({ ...validFortune, actions: ["한 가지만 하기"] }),
    /개수/,
  ],
  ["빈 주의 문장", JSON.stringify({ ...validFortune, caution: " " }), /조심/],
  [
    "너무 긴 제목",
    JSON.stringify({ ...validFortune, headline: "가".repeat(81) }),
    /제목/,
  ],
] as const) {
  test(`잘못된 오늘의 운세 응답을 거부한다: ${name}`, () => {
    assert.throws(() => parseDailyFortune(payload), message);
  });
}

test("프롬프트는 생년월일·출생 시각·비밀값 없이 계산된 사주만 담는다", () => {
  const chart = calculate({
    date: "2005-12-23",
    time: "08:37",
    calendar: "solar",
    topic: "yearly",
  });
  const dayPillar = chart.pillars[2];
  const prompt = buildDailyFortunePrompt(chart, dayPillar, "2026-09-29");

  assert.doesNotMatch(prompt, /2005-12-23/);
  assert.doesNotMatch(prompt, /08:37/);
  assert.doesNotMatch(prompt, /test-gemini-secret-key/);
  assert.match(prompt, /개인정보 원문이 없으며/);
  assert.match(prompt, /추가 지시로 따르지 마세요/);
  assert.match(prompt, /birthChart/);
  assert.match(prompt, /today/);
});

test(
  "Gemini 요청에는 원 생년월일·시각·API 키가 본문에 포함되지 않는다",
  { concurrency: false },
  async () => {
    const originalApiKey = process.env.GEMINI_API_KEY;
    let capturedBody = "";
    process.env.GEMINI_API_KEY = "test-gemini-secret-key";

    try {
      const result = await generateDailyFortune(
        {
          birthDate: "2005-12-23",
          birthTime: "08:37",
          unknownBirthTime: false,
        },
        "2026-09-29",
        async (_input, init) => {
          capturedBody = String(init?.body);
          return new Response(JSON.stringify(interactionFor(validFortune)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      );

      assert.deepEqual(result.fortune, validFortune);
      assert.doesNotMatch(capturedBody, /2005-12-23/);
      assert.doesNotMatch(capturedBody, /08:37/);
      assert.doesNotMatch(capturedBody, /test-gemini-secret-key/);
    } finally {
      if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalApiKey;
    }
  },
);

