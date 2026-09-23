import { NextResponse } from "next/server";
import { calculate, InputError } from "../../../lib/saju/chart";
import { GEMINI_MODEL } from "../../../lib/saju/reading";
import {
  decodeCursor,
  encodeCursor,
  parseSaveReadingRequest,
  type SavedReadingListItem,
} from "../../../lib/saju/saved-reading";
import { getAuthenticatedUser } from "../../../lib/supabase/auth";
import { createClient } from "../../../lib/supabase/server";

function unauthorized() {
  return NextResponse.json(
    { code: "AUTH_REQUIRED", message: "결과를 저장하려면 다시 로그인해 주세요." },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const { requestId, input, reading } = parseSaveReadingRequest(
      await request.json(),
    );
    const chart = calculate(input);
    const supabase = await createClient();
    const row = {
      request_id: requestId,
      user_id: user.id,
      birth_date: input.date,
      birth_time: input.unknownTime ? null : input.time,
      topic: input.topic,
      question: input.question || null,
      chart,
      reading,
      model: GEMINI_MODEL,
      schema_version: 1,
    };

    const { data, error } = await supabase
      .from("saju_readings")
      .insert(row)
      .select("id, created_at")
      .single();

    if (!error && data) {
      return NextResponse.json(
        { id: String(data.id), createdAt: data.created_at, duplicate: false },
        { status: 201 },
      );
    }

    if (error?.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("saju_readings")
        .select("id, created_at")
        .eq("request_id", requestId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existingError && existing) {
        return NextResponse.json({
          id: String(existing.id),
          createdAt: existing.created_at,
          duplicate: true,
        });
      }
    }

    console.error("Saving reading failed:", error?.code || "unknown database error");
    return NextResponse.json(
      { code: "SAVE_FAILED", message: "해석은 완성됐지만 저장하지 못했습니다. 저장만 다시 시도해 주세요." },
      { status: 503 },
    );
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError || error instanceof Error) {
      return NextResponse.json(
        { code: "INVALID_SAVE", message: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "SAVE_FAILED", message: "결과를 저장하지 못했습니다." },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const cursor = decodeCursor(new URL(request.url).searchParams.get("cursor"));
    const supabase = await createClient();
    let query = supabase
      .from("saju_readings")
      .select("id, birth_date, topic, reading, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(21);

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Listing readings failed:", error.code);
      return NextResponse.json(
        { code: "LIST_FAILED", message: "저장된 결과를 불러오지 못했습니다. 다시 시도해 주세요." },
        { status: 503 },
      );
    }

    const hasMore = data.length > 20;
    const page = data.slice(0, 20);
    const items: SavedReadingListItem[] = page.map((row) => ({
      id: String(row.id),
      birthDate: row.birth_date,
      topic: row.topic,
      headline:
        row.reading && typeof row.reading === "object" && "headline" in row.reading
          ? String(row.reading.headline)
          : "저장된 사주 해석",
      createdAt: row.created_at,
    }));
    const last = page.at(-1);

    return NextResponse.json({
      items,
      nextCursor:
        hasMore && last
          ? encodeCursor({ createdAt: last.created_at, id: String(last.id) })
          : null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "저장된 결과를 불러오지 못했습니다.";
    return NextResponse.json(
      { code: "INVALID_CURSOR", message },
      { status: 400 },
    );
  }
}
