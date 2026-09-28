import { NextResponse } from "next/server";
import { getFortunePeriod } from "../../../../lib/saju/daily-fortune";
import { ensureDailyFortune } from "../../../../lib/saju/daily-fortune-service";
import {
  createAdminClient,
  hasSupabaseAdminConfig,
} from "../../../../lib/supabase/admin";

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, message: "Cron 서버 설정이 필요합니다." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, message: "허용되지 않은 예약 요청입니다." },
      { status: 401 },
    );
  }
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { success: false, message: "Supabase 서버 설정이 필요합니다." },
      { status: 503 },
    );
  }

  const supabase = createAdminClient();
  const period = getFortunePeriod();
  const { data: profiles, error } = await supabase
    .from("saju_profiles")
    .select("user_id")
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Cron profile listing failed:", error.code);
    return NextResponse.json(
      { success: false, message: "운세 대상 목록을 불러오지 못했습니다." },
      { status: 503 },
    );
  }

  let generated = 0;
  let alreadyReady = 0;
  let failed = 0;
  const concurrency = 3;

  for (let index = 0; index < profiles.length; index += concurrency) {
    const batch = profiles.slice(index, index + concurrency);
    const results = await Promise.allSettled(
      batch.map((profile) =>
        ensureDailyFortune(supabase, profile.user_id, period.fortuneDate),
      ),
    );

    results.forEach((result) => {
      if (result.status === "rejected") {
        failed += 1;
        return;
      }
      if (result.value.generatedNow) generated += 1;
      else alreadyReady += 1;
    });
  }

  const summary = {
    success: failed === 0,
    fortuneDate: period.fortuneDate,
    targets: profiles.length,
    generated,
    alreadyReady,
    failed,
  };

  if (failed > 0) {
    console.error("Daily fortune cron completed with failures:", summary);
    return NextResponse.json(summary, { status: 500 });
  }
  return NextResponse.json(summary);
}
