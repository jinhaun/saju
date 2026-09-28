"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DailyFortune } from "../../lib/saju/daily-fortune";

type DailyFortuneResponse = {
  id: string;
  fortuneDate: string;
  fortune: DailyFortune;
  generatedAt: string;
  generatedNow: boolean;
  nextRefreshAt: string;
};

type LoadError = {
  code: string;
  message: string;
};

function previewResult(): DailyFortuneResponse {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const tomorrowAtNineKst = new Date(
    Date.UTC(
      kst.getUTCFullYear(),
      kst.getUTCMonth(),
      kst.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );
  const fortuneDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return {
    id: "preview",
    fortuneDate,
    generatedAt: now.toISOString(),
    generatedNow: true,
    nextRefreshAt: tomorrowAtNineKst.toISOString(),
    fortune: {
      headline: "천천히 살피면 좋은 흐름이 보이는 날",
      summary:
        "오늘은 서두르기보다 이미 가진 강점을 차분히 정리할수록 선택이 또렷해지는 흐름입니다. 작은 약속을 지키는 일이 다음 기회를 여는 데 도움이 될 수 있어요.",
      sections: [
        {
          title: "마음과 선택",
          body: "새로운 일을 크게 벌이기보다 지금 가장 중요한 한 가지를 골라 마무리해 보세요. 마음이 복잡할수록 기준을 글로 적으면 도움이 됩니다.",
        },
        {
          title: "사람과 관계",
          body: "상대의 말을 바로 판단하기보다 한 번 더 묻는 태도가 관계의 오해를 줄여줄 수 있습니다. 짧은 안부도 충분한 연결이 됩니다.",
        },
        {
          title: "일과 재물",
          body: "익숙한 방법을 정돈하는 데 유리한 날입니다. 충동적인 지출보다 필요한 것의 우선순위를 확인해 보세요.",
        },
      ],
      actions: [
        "오늘 끝낼 일 한 가지를 적고 20분만 집중해 보기",
        "미뤄둔 사람에게 짧은 안부를 전하기",
      ],
      caution:
        "빠른 결론을 내리기보다 사실과 내 해석을 나누어 살펴보세요.",
    },
  };
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${value}T00:00:00+09:00`));
}

function refreshLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TodayFortuneCard({ preview = false }: { preview?: boolean }) {
  const [result, setResult] = useState<DailyFortuneResponse | null>(() =>
    preview ? previewResult() : null,
  );
  const [error, setError] = useState<LoadError | null>(null);
  const [isLoading, setIsLoading] = useState(!preview);

  const loadFortune = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/daily-fortune", { cache: "no-store" });
      const payload = (await response.json()) as Partial<DailyFortuneResponse> &
        Partial<LoadError>;
      if (!response.ok || !payload.fortune || !payload.fortuneDate) {
        throw {
          code: payload.code || "DAILY_FORTUNE_FAILED",
          message:
            payload.message ||
            "오늘의 운세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        } satisfies LoadError;
      }
      setResult(payload as DailyFortuneResponse);
    } catch (caught) {
      const loadError = caught as Partial<LoadError>;
      setError({
        code: loadError.code || "DAILY_FORTUNE_FAILED",
        message:
          loadError.message ||
          "오늘의 운세를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (preview) return;
    void loadFortune();
  }, [loadFortune, preview]);

  useEffect(() => {
    if (!result?.nextRefreshAt) return;
    const delay = Math.max(
      1_000,
      new Date(result.nextRefreshAt).getTime() - Date.now() + 1_000,
    );
    const timer = window.setTimeout(() => void loadFortune(), delay);
    return () => window.clearTimeout(timer);
  }, [loadFortune, result?.nextRefreshAt]);

  if (isLoading) {
    return (
      <section className="state-card today-state" aria-live="polite">
        <span className="loading-dot" aria-hidden="true" />
        <h2>오늘의 운세를 준비하고 있어요.</h2>
        <p>저장된 사주와 오늘의 흐름을 함께 살펴봅니다.</p>
      </section>
    );
  }

  if (error) {
    const needsProfile = error.code === "PROFILE_REQUIRED";
    return (
      <section className="state-card today-state" role="alert">
        <h2>{needsProfile ? "내 운세 기준 정보가 필요해요." : "운세를 불러오지 못했어요."}</h2>
        <p>{error.message}</p>
        {needsProfile ? (
          <Link className="primary-link" href="/">
            기본 사주 입력하러 가기
          </Link>
        ) : (
          <button type="button" className="retry-button" onClick={() => void loadFortune()}>
            다시 시도
          </button>
        )}
      </section>
    );
  }

  if (!result) return null;

  return (
    <article className="today-fortune" aria-labelledby="today-fortune-title">
      {preview && (
        <p className="preview-note" role="status">
          화면 검토용 예시입니다. 실제 운세는 로그인한 사용자의 저장 정보로 생성됩니다.
        </p>
      )}
      <header className="today-fortune-heading">
        <div>
          <p className="eyebrow">{dateLabel(result.fortuneDate)}</p>
          <h2 id="today-fortune-title">{result.fortune.headline}</h2>
        </div>
        <span className="today-seal">今日</span>
      </header>

      <p className="today-summary">{result.fortune.summary}</p>

      <div className="today-section-grid">
        {result.fortune.sections.map((section) => (
          <section key={section.title}>
            <h3>{section.title}</h3>
            <p>{section.body}</p>
          </section>
        ))}
      </div>

      <div className="today-guidance-grid">
        <section className="today-actions">
          <h3>오늘 해볼 작은 행동</h3>
          <ol>
            {result.fortune.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
        </section>
        <section className="today-caution">
          <h3>조심해서 볼 점</h3>
          <p>{result.fortune.caution}</p>
        </section>
      </div>

      <footer className="today-fortune-footer">
        <p>
          다음 갱신은 <strong>{refreshLabel(result.nextRefreshAt)}</strong>입니다.
          {result.generatedNow
            ? " 방금 새로운 운세를 만들었습니다."
            : " 오늘 만들어진 운세를 불러왔습니다."}
        </p>
        <p>
          이 내용은 자신을 돌아보기 위한 참고 자료입니다. 중요한 결정은 실제 상황과
          전문가의 조언을 함께 살펴보세요.
        </p>
      </footer>
    </article>
  );
}
