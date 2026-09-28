import { NextResponse } from "next/server";
import { getFortunePeriod } from "../../../lib/saju/daily-fortune";
import {
  DailyFortuneServiceError,
  ensureDailyFortune,
} from "../../../lib/saju/daily-fortune-service";
import { getAuthenticatedUser } from "../../../lib/supabase/auth";
import {
  createAdminClient,
  hasSupabaseAdminConfig,
} from "../../../lib/supabase/admin";

export const maxDuration = 120;

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { code: "AUTH_REQUIRED", message: "오늘의 운세를 보려면 Google 로그인이 필요합니다." },
      { status: 401 },
    );
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      {
        code: "SERVER_SETUP_REQUIRED",
        message: "오늘의 운세 서버 설정이 아직 완료되지 않았습니다.",
      },
      { status: 503 },
    );
  }

  const period = getFortunePeriod();
  try {
    const record = await ensureDailyFortune(
      createAdminClient(),
      user.id,
      period.fortuneDate,
    );
    return NextResponse.json({ ...record, nextRefreshAt: period.nextRefreshAt });
  } catch (error) {
    if (error instanceof DailyFortuneServiceError) {
      const status = error.code === "PROFILE_REQUIRED" ? 404 : 503;
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status },
      );
    }
    console.error(
      "Daily fortune request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      {
        code: "DAILY_FORTUNE_FAILED",
        message: "오늘의 운세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }
}
