import { NextResponse } from "next/server";
import { parseReading } from "../../../../lib/saju/reading";
import {
  isReadingId,
  type SavedReadingDetail,
} from "../../../../lib/saju/saved-reading";
import { getAuthenticatedUser } from "../../../../lib/supabase/auth";
import { createClient } from "../../../../lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json(
    { code: "NOT_FOUND", message: "해당 결과를 찾을 수 없습니다." },
    { status: 404 },
  );
}

async function authorizedId(context: RouteContext) {
  const user = await getAuthenticatedUser();
  const { id } = await context.params;
  return { user, id };
}

export async function GET(_request: Request, context: RouteContext) {
  const { user, id } = await authorizedId(context);
  if (!user) {
    return NextResponse.json(
      { code: "AUTH_REQUIRED", message: "결과를 보려면 다시 로그인해 주세요." },
      { status: 401 },
    );
  }
  if (!isReadingId(id)) return notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saju_readings")
    .select("id, birth_date, birth_time, topic, question, chart, reading, model, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return notFound();

  try {
    const detail: SavedReadingDetail = {
      id: String(data.id),
      birthDate: data.birth_date,
      birthTime: data.birth_time ? String(data.birth_time).slice(0, 5) : null,
      topic: data.topic,
      question: data.question || "",
      chart: data.chart,
      reading: parseReading(JSON.stringify(data.reading)),
      model: data.model,
      createdAt: data.created_at,
    };
    return NextResponse.json({ reading: detail });
  } catch {
    return NextResponse.json(
      { code: "INVALID_RECORD", message: "저장된 결과의 형식을 확인하지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { user, id } = await authorizedId(context);
  if (!user) {
    return NextResponse.json(
      { code: "AUTH_REQUIRED", message: "삭제하려면 다시 로그인해 주세요." },
      { status: 401 },
    );
  }
  if (!isReadingId(id)) return notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saju_readings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) return notFound();
  return NextResponse.json({ deleted: true });
}
