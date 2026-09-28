import { NextResponse } from "next/server";
import { calculate, InputError } from "../../../../lib/saju/chart";
import { getFortunePeriod } from "../../../../lib/saju/daily-fortune";
import {
  activateDailyFortuneProfile,
  DailyFortuneServiceError,
} from "../../../../lib/saju/daily-fortune-service";
import { parseReading } from "../../../../lib/saju/reading";
import { parseReadingLookupRequest } from "../../../../lib/saju/saved-reading";
import { getAuthenticatedUser } from "../../../../lib/supabase/auth";
import {
  createAdminClient,
  hasSupabaseAdminConfig,
} from "../../../../lib/supabase/admin";
import { createClient } from "../../../../lib/supabase/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { code: "AUTH_REQUIRED", message: "저장된 사주를 보려면 다시 로그인해 주세요." },
        { status: 401 },
      );
    }

    const input = parseReadingLookupRequest(await request.json());
    const supabase = await createClient();
    let query = supabase
      .from("saju_readings")
      .select("id, reading, model, created_at")
      .eq("user_id", user.id)
      .eq("birth_date", input.date)
      .eq("topic", input.topic)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);

    query = input.unknownTime
      ? query.is("birth_time", null)
      : query.eq("birth_time", input.time);
    query = input.question
      ? query.eq("question", input.question)
      : query.is("question", null);

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("Matching saved reading failed:", error.code);
      return NextResponse.json(
        { code: "MATCH_FAILED", message: "저장된 사주를 확인하지 못했습니다. 다시 시도해 주세요." },
        { status: 503 },
      );
    }
    if (!data) return NextResponse.json({ matched: false });

    let todayFortuneReady = false;
    let todayFortuneMessage = "오늘의 운세 화면에서 다시 불러와 주세요.";
    if (hasSupabaseAdminConfig()) {
      try {
        const period = getFortunePeriod();
        await activateDailyFortuneProfile(
          createAdminClient(),
          user.id,
          {
            birthDate: input.date,
            birthTime: input.unknownTime ? null : input.time,
            unknownBirthTime: input.unknownTime === true,
          },
          period.fortuneDate,
        );
        todayFortuneReady = true;
        todayFortuneMessage = "저장된 사주에 맞는 오늘의 운세도 준비됐습니다.";
      } catch (caught) {
        console.error(
          "Preparing matched reading fortune failed:",
          caught instanceof DailyFortuneServiceError ? caught.code : "unknown error",
        );
      }
    }

    return NextResponse.json({
      matched: true,
      id: String(data.id),
      chart: calculate(input),
      reading: parseReading(JSON.stringify(data.reading)),
      model: data.model,
      createdAt: data.created_at,
      todayFortuneReady,
      todayFortuneMessage,
    });
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError || error instanceof Error) {
      return NextResponse.json(
        { code: "INVALID_LOOKUP", message: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "MATCH_FAILED", message: "저장된 사주를 불러오지 못했습니다." },
      { status: 503 },
    );
  }
}
