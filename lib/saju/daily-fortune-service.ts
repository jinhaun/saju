import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateDailyFortune,
  type DailyFortune,
  type DailyFortuneProfile,
} from "./daily-fortune";

export type DailyFortuneRecord = {
  id: string;
  fortuneDate: string;
  fortune: DailyFortune;
  generatedAt: string;
  generatedNow: boolean;
};

export class DailyFortuneServiceError extends Error {
  code: "PROFILE_REQUIRED" | "DATABASE_ERROR" | "GENERATION_ERROR";

  constructor(
    code: DailyFortuneServiceError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

type FortuneRow = {
  id: number | string;
  fortune_date: string;
  fortune: DailyFortune;
  generated_at: string;
};

function toRecord(row: FortuneRow, generatedNow: boolean): DailyFortuneRecord {
  return {
    id: String(row.id),
    fortuneDate: row.fortune_date,
    fortune: row.fortune,
    generatedAt: row.generated_at,
    generatedNow,
  };
}

async function readExisting(
  supabase: SupabaseClient,
  userId: string,
  fortuneDate: string,
) {
  const { data, error } = await supabase
    .from("daily_fortunes")
    .select("id, fortune_date, fortune, generated_at")
    .eq("user_id", userId)
    .eq("fortune_date", fortuneDate)
    .maybeSingle();

  if (error) {
    throw new DailyFortuneServiceError(
      "DATABASE_ERROR",
      "오늘의 운세 저장소를 확인하지 못했습니다.",
    );
  }
  return data as FortuneRow | null;
}

export async function ensureDailyFortune(
  supabase: SupabaseClient,
  userId: string,
  fortuneDate: string,
): Promise<DailyFortuneRecord> {
  const existing = await readExisting(supabase, userId, fortuneDate);
  if (existing) return toRecord(existing, false);

  const { data: profileRow, error: profileError } = await supabase
    .from("saju_profiles")
    .select("birth_date, birth_time, unknown_birth_time")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new DailyFortuneServiceError(
      "DATABASE_ERROR",
      "내 운세 기준 정보를 불러오지 못했습니다.",
    );
  }
  if (!profileRow) {
    throw new DailyFortuneServiceError(
      "PROFILE_REQUIRED",
      "먼저 기본 사주 해석을 한 번 만들어 주세요.",
    );
  }

  const profile: DailyFortuneProfile = {
    birthDate: profileRow.birth_date,
    birthTime: profileRow.birth_time,
    unknownBirthTime: profileRow.unknown_birth_time,
  };

  let generated;
  try {
    generated = await generateDailyFortune(profile, fortuneDate);
  } catch (error) {
    console.error(
      "Daily fortune generation failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    throw new DailyFortuneServiceError(
      "GENERATION_ERROR",
      "오늘의 운세를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const { data, error } = await supabase
    .from("daily_fortunes")
    .insert({
      user_id: userId,
      fortune_date: fortuneDate,
      birth_chart: generated.chart,
      day_pillar: generated.dayPillar,
      fortune: generated.fortune,
      model: generated.model,
      schema_version: 1,
    })
    .select("id, fortune_date, fortune, generated_at")
    .single();

  if (!error && data) return toRecord(data as FortuneRow, true);

  if (error?.code === "23505") {
    const duplicate = await readExisting(supabase, userId, fortuneDate);
    if (duplicate) return toRecord(duplicate, false);
  }

  console.error("Saving daily fortune failed:", error?.code || "unknown error");
  throw new DailyFortuneServiceError(
    "DATABASE_ERROR",
    "오늘의 운세를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  );
}
