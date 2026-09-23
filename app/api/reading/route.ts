import { NextResponse } from "next/server";
import { calculate, InputError, validateInput, type SajuInput, type Topic } from "../../../lib/saju/chart";
import {
  buildReadingPrompt,
  extractInteractionText,
  GEMINI_MODEL,
  parseReading,
  READING_SCHEMA,
} from "../../../lib/saju/reading";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

function requestInput(raw: unknown): SajuInput {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new InputError("입력 내용을 확인해주세요.");
  }
  const data = raw as Record<string, unknown>;
  if (data.question !== undefined && typeof data.question !== "string") {
    throw new InputError("질문은 글자로 입력해주세요.", "question");
  }
  if (data.unknownTime !== undefined && typeof data.unknownTime !== "boolean") {
    throw new InputError("출생 시각 선택을 확인해주세요.", "unknownTime");
  }
  return validateInput({
    date: typeof data.date === "string" ? data.date : "",
    time: typeof data.time === "string" ? data.time : "",
    calendar: data.calendar === "solar" ? "solar" : (data.calendar as "solar"),
    topic: data.topic as Topic,
    question: data.question,
    unknownTime: data.unknownTime === true,
  });
}

export async function POST(request: Request) {
  try {
    const input = requestInput(await request.json());
    const chart = calculate(input);
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { code: "API_KEY_MISSING", message: "해석 기능을 준비하지 못했습니다. API 설정을 확인해 주세요." },
        { status: 503 },
      );
    }

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        store: false,
        input: buildReadingPrompt(chart, input.topic, input.question || ""),
        system_instruction:
          "당신은 사주 계산기가 아니라, 제공된 계산값을 쉬운 한국어로 설명하는 안내자입니다. 출력 스키마를 정확히 지키세요.",
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: READING_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { code: "GEMINI_UNAVAILABLE", message: "해석을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 },
      );
    }

    const reading = parseReading(extractInteractionText(await response.json()));
    return NextResponse.json({ chart, topic: input.topic, question: input.question || "", reading, model: GEMINI_MODEL });
  } catch (error) {
    if (error instanceof InputError) {
      return NextResponse.json({ code: "INVALID_INPUT", message: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ code: "INVALID_JSON", message: "입력 내용을 확인해주세요." }, { status: 400 });
    }
    console.error(
      "Gemini reading failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { code: "INVALID_GEMINI_RESPONSE", message: "해석을 완성하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
