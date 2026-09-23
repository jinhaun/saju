import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/reading/route";
import { calculate, type SajuInput } from "../lib/saju/chart";
import { GEMINI_MODEL, type SajuReading } from "../lib/saju/reading";

const baseInput: SajuInput = {
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
    { title: "기질과 강점", body: "차분히 비교하고 핵심을 찾는 힘이 있습니다." },
    { title: "선택한 고민", body: "진로 후보마다 중요 기준을 나누어 살펴보세요." },
    { title: "주의해서 볼 점", body: "완벽한 답을 기다리다 시작을 늦추지 않도록 해보세요." },
  ],
  actions: ["후보별 장단점 세 개 적기", "이번 주에 한 사람에게 경험 묻기"],
};

type FetchMock = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

async function withServerGlobals<T>(
  apiKey: string | undefined,
  fetchMock: FetchMock,
  run: () => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  globalThis.fetch = fetchMock as typeof fetch;
  if (apiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = apiKey;

  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
}

function apiRequest(input: unknown = baseInput): Request {
  return new Request("http://localhost/api/reading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

function interactionFor(reading: unknown): object {
  return {
    id: "interaction-test",
    steps: [
      {
        type: "model_output",
        content: [{ type: "text", text: JSON.stringify(reading) }],
      },
    ],
  };
}

test("정상 요청은 고정 모델로 호출하고 서버 재계산 결과와 해석을 반환한다", { concurrency: false }, async () => {
  const apiKey = "test-gemini-secret-key";
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  await withServerGlobals(
    apiKey,
    async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify(interactionFor(validReading)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    async () => {
      const response = await POST(
        apiRequest({ ...baseInput, chart: { pillars: ["조작된 계산값"] } }),
      );
      const body = (await response.json()) as Record<string, unknown>;

      assert.equal(response.status, 200);
      assert.equal(body.model, GEMINI_MODEL);
      assert.equal(GEMINI_MODEL, "gemini-3.5-flash-lite");
      assert.deepEqual(body.chart, calculate(baseInput));
      assert.deepEqual(body.reading, validReading);
      assert.equal(body.topic, baseInput.topic);
    },
  );

  assert.match(capturedUrl, /generativelanguage\.googleapis\.com\/.*interactions/);
  assert.equal(capturedInit?.method, "POST");
  const requestBodyText = String(capturedInit?.body);
  const requestBody = JSON.parse(requestBodyText) as Record<string, unknown>;
  assert.equal(requestBody.model, "gemini-3.5-flash-lite");
  assert.equal(requestBody.store, false);
  assert.doesNotMatch(requestBodyText, /2005-12-23/);
  assert.doesNotMatch(requestBodyText, /08:37/);
  assert.doesNotMatch(requestBodyText, /test-gemini-secret-key/);
  assert.equal((capturedInit?.headers as Record<string, string>)["x-goog-api-key"], apiKey);
});

test("API 키가 없으면 외부 호출 없이 503을 반환한다", { concurrency: false }, async () => {
  let fetchCalled = false;
  await withServerGlobals(
    undefined,
    async () => {
      fetchCalled = true;
      throw new Error("호출되면 안 됩니다.");
    },
    async () => {
      const response = await POST(apiRequest());
      const body = (await response.json()) as Record<string, unknown>;

      assert.equal(response.status, 503);
      assert.equal(body.code, "API_KEY_MISSING");
      assert.equal(JSON.stringify(body).includes("test-gemini-secret-key"), false);
    },
  );
  assert.equal(fetchCalled, false);
});

test("출생 시각을 모르면 시주를 빼고 Gemini 해석을 요청한다", { concurrency: false }, async () => {
  let capturedBody = "";

  await withServerGlobals(
    "test-key",
    async (_input, init) => {
      capturedBody = String(init?.body);
      return new Response(JSON.stringify(interactionFor(validReading)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    async () => {
      const response = await POST(
        apiRequest({ ...baseInput, time: "", unknownTime: true }),
      );
      const body = (await response.json()) as {
        chart: ReturnType<typeof calculate>;
      };

      assert.equal(response.status, 200);
      assert.equal(body.chart.pillars.length, 3);
      assert.equal(body.chart.unknownTime, true);
    },
  );

  assert.doesNotMatch(capturedBody, /시주/);
  assert.match(capturedBody, /년주/);
});

test("잘못된 입력은 외부 호출 없이 400을 반환한다", { concurrency: false }, async () => {
  let fetchCalled = false;
  await withServerGlobals(
    "test-key",
    async () => {
      fetchCalled = true;
      throw new Error("호출되면 안 됩니다.");
    },
    async () => {
      const response = await POST(apiRequest({ ...baseInput, date: "2005-02-30" }));
      const body = (await response.json()) as Record<string, unknown>;

      assert.equal(response.status, 400);
      assert.equal(body.code, "INVALID_INPUT");
    },
  );
  assert.equal(fetchCalled, false);
});

test("외부 API 실패는 원문을 노출하지 않고 502를 반환한다", { concurrency: false }, async () => {
  await withServerGlobals(
    "test-key",
    async () =>
      new Response("provider-secret-error-detail", {
        status: 429,
        headers: { "Content-Type": "text/plain" },
      }),
    async () => {
      const response = await POST(apiRequest());
      const body = (await response.json()) as Record<string, unknown>;

      assert.equal(response.status, 502);
      assert.equal(body.code, "GEMINI_UNAVAILABLE");
      assert.equal(JSON.stringify(body).includes("provider-secret-error-detail"), false);
    },
  );
});

for (const [name, providerPayload] of [
  ["해석 JSON 오류", interactionFor("not-json")],
  ["필드 누락", interactionFor({ headline: "제목만 있음" })],
  ["model_output 누락", { steps: [{ type: "tool_result", content: [] }] }],
] as const) {
  test(`외부 응답 형식 실패는 502를 반환한다: ${name}`, { concurrency: false }, async () => {
    await withServerGlobals(
      "test-key",
      async () =>
        new Response(JSON.stringify(providerPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      async () => {
        const response = await POST(apiRequest());
        const body = (await response.json()) as Record<string, unknown>;

        assert.equal(response.status, 502);
        assert.equal(body.code, "INVALID_GEMINI_RESPONSE");
        assert.equal("reading" in body, false);
      },
    );
  });
}
