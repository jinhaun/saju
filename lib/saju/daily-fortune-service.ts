import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateDailyFortune,
  isSameDailyFortuneProfile,
  type ActivatableDailyFortuneProfile,
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

export async function activateDailyFortuneProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: ActivatableDailyFortuneProfile,
  fortuneDate: string,
): Promise<DailyFortuneRecord> {
  const { data: current, error: currentError } = await supabase
    .from("saju_profiles")
    .select("birth_date, birth_time, unknown_birth_time")
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError) {
    throw new DailyFortuneServiceError(
      "DATABASE_ERROR",
      "저장된 사주 기준 정보를 확인하지 못했습니다.",
    );
  }

  const profileChanged = !isSameDailyFortuneProfile(current, profile);
  const { error: upsertError } = await supabase.from("saju_profiles").upsert(
    {
      user_id: userId,
      birth_date: profile.birthDate,
      birth_time: profile.unknownBirthTime ? null : profile.birthTime,
      unknown_birth_time: profile.unknownBirthTime,
      calendar: profile.calendar || "solar",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    throw new DailyFortuneServiceError(
      "DATABASE_ERROR",
      "오늘의 운세 기준 정보를 저장하지 못했습니다.",
    );
  }

  if (profileChanged) {
    const { error: deleteError } = await supabase
      .from("daily_fortunes")
      .delete()
      .eq("user_id", userId)
      .eq("fortune_date", fortuneDate);
    if (deleteError) {
      throw new DailyFortuneServiceError(
        "DATABASE_ERROR",
        "새 사주에 맞게 오늘의 운세를 바꾸지 못했습니다.",
      );
    }
  }

  return ensureDailyFortune(supabase, userId, fortuneDate);
}
