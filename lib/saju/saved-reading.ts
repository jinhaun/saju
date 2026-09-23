import {
  validateInput,
  type SajuChart,
  type SajuInput,
  type Topic,
} from "./chart";
import { parseReading, type SajuReading } from "./reading";

export type SaveReadingRequest = {
  requestId: string;
  input: SajuInput;
  reading: SajuReading;
};

export type SavedReadingListItem = {
  id: string;
  birthDate: string;
  topic: Topic;
  headline: string;
  createdAt: string;
};

export type SavedReadingDetail = {
  id: string;
  birthDate: string;
  birthTime: string | null;
  topic: Topic;
  question: string;
  chart: SajuChart;
  reading: SajuReading;
  model: string;
  createdAt: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSaveReadingRequest(raw: unknown): SaveReadingRequest {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("저장할 결과를 확인해 주세요.");
  }

  const data = raw as Record<string, unknown>;
  if (typeof data.requestId !== "string" || !uuidPattern.test(data.requestId)) {
    throw new Error("저장 요청 번호가 올바르지 않습니다.");
  }
  if (!data.input || typeof data.input !== "object" || Array.isArray(data.input)) {
    throw new Error("저장할 입력 내용을 확인해 주세요.");
  }

  const inputData = data.input as Record<string, unknown>;
  if (
    inputData.unknownTime !== undefined &&
    typeof inputData.unknownTime !== "boolean"
  ) {
    throw new Error("출생 시각 선택을 확인해주세요.");
  }
  const input = validateInput({
    date: typeof inputData.date === "string" ? inputData.date : "",
    time: typeof inputData.time === "string" ? inputData.time : "",
    calendar: inputData.calendar as "solar",
    topic: inputData.topic as Topic,
    question:
      inputData.question === undefined
        ? undefined
        : (inputData.question as string),
    unknownTime: inputData.unknownTime === true,
  });
  const reading = parseReading(JSON.stringify(data.reading));

  return { requestId: data.requestId, input, reading };
}

export function isReadingId(value: string) {
  return /^[1-9]\d*$/.test(value);
}

export type ReadingCursor = { createdAt: string; id: string };

export function encodeCursor(cursor: ReadingCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string | null): ReadingCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (
      typeof parsed.createdAt !== "string" ||
      Number.isNaN(Date.parse(parsed.createdAt)) ||
      typeof parsed.id !== "string" ||
      !isReadingId(parsed.id)
    ) {
      throw new Error("invalid cursor");
    }
    return {
      createdAt: new Date(parsed.createdAt).toISOString(),
      id: parsed.id,
    };
  } catch {
    throw new Error("목록 위치 정보가 올바르지 않습니다.");
  }
}
