import test from "node:test";
import assert from "node:assert/strict";
import { isSameDailyFortuneProfile } from "../lib/saju/daily-fortune";

const nextProfile = {
  birthDate: "2000-01-01",
  birthTime: "08:30",
  unknownBirthTime: false,
} as const;

test("같은 생년월일과 출생 시각은 기존 오늘 운세를 재사용한다", () => {
  assert.equal(
    isSameDailyFortuneProfile(
      {
        birth_date: "2000-01-01",
        birth_time: "08:30:00",
        unknown_birth_time: false,
      },
      nextProfile,
    ),
    true,
  );
});

test("다른 사주 정보는 오늘 운세를 새로 만들 대상으로 판단한다", () => {
  assert.equal(
    isSameDailyFortuneProfile(
      {
        birth_date: "2000-01-02",
        birth_time: "08:30:00",
        unknown_birth_time: false,
      },
      nextProfile,
    ),
    false,
  );
  assert.equal(isSameDailyFortuneProfile(null, nextProfile), false);
});

test("출생 시각을 모르는 경우에는 빈 시각끼리 같은 프로필로 판단한다", () => {
  assert.equal(
    isSameDailyFortuneProfile(
      {
        birth_date: "2000-01-01",
        birth_time: null,
        unknown_birth_time: true,
      },
      {
        birthDate: "2000-01-01",
        birthTime: null,
        unknownBirthTime: true,
      },
    ),
    true,
  );
});
