import { NextResponse } from "next/server";
import { InputError } from "../../../lib/saju/chart";
import {
  findSimilarSaju,
  type SimilarSajuInput,
} from "../../../lib/saju/similar";

function requestInput(raw: unknown): SimilarSajuInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new InputError("입력 내용을 확인해주세요.");
  }
  const data = raw as Record<string, unknown>;
  if (data.unknownTime !== undefined && typeof data.unknownTime !== "boolean") {
    throw new InputError("출생 시각 선택을 확인해주세요.", "unknownTime");
  }
  return {
    date: typeof data.date === "string" ? data.date : "",
    time: typeof data.time === "string" ? data.time : "",
    unknownTime: data.unknownTime === true,
  };
}

export async function POST(request: Request) {
  try {
    const result = findSimilarSaju(requestInput(await request.json()));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InputError) {
      return NextResponse.json(
        { code: "INVALID_INPUT", message: error.message },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { code: "INVALID_JSON", message: "입력 내용을 확인해주세요." },
        { status: 400 },
      );
    }
    console.error(
      "Similar saju search failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      {
        code: "SEARCH_FAILED",
        message: "비슷한 사주를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 500 },
    );
  }
}
