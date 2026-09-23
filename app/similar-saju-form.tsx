"use client";

import { useRef, useState, type FormEvent } from "react";
import { MAX_BIRTH_DATE, MIN_BIRTH_DATE } from "../lib/saju/chart";
import type {
  SimilarSajuMatch,
  SimilarSajuResult,
} from "../lib/saju/similar";

function SimilarMatchCard({ match, rank }: { match: SimilarSajuMatch; rank: number }) {
  return (
    <li className="similar-match-card">
      <header className="similar-match-heading">
        <div>
          <p className="summary-label">닮은 사주 {rank}</p>
          <h3>{match.date}</h3>
          <p>{match.time ? `${match.time} 기준` : "출생 시각 미상 기준"}</p>
        </div>
        <div
          className="similar-score"
          role="img"
          aria-label={`닮은 정도 ${match.score}점, ${match.label}`}
        >
          <strong>{match.score}</strong>
          <span>점</span>
        </div>
      </header>

      <div className="similar-reasons">
        <strong>{match.label}</strong>
        <p>
          {match.samePillars.join("·")}가 같고, 오행 분포는 {match.elementSimilarity}%
          닮았습니다.
        </p>
      </div>

      <dl className="pillars similar-pillars">
        {match.chart.pillars.map((pillar) => (
          <div key={pillar.label}>
            <dt>{pillar.label}</dt>
            <dd lang="zh-Hant">{pillar.text}</dd>
            <span>{pillar.korean}</span>
          </div>
        ))}
      </dl>
    </li>
  );
}

export default function SimilarSajuForm() {
  const [unknownTime, setUnknownTime] = useState(false);
  const [result, setResult] = useState<SimilarSajuResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/similar-saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: String(data.get("similar-date") || ""),
          time: String(data.get("similar-time") || ""),
          unknownTime,
        }),
      });
      const payload = (await response.json()) as SimilarSajuResult & {
        message?: string;
      };
      if (!response.ok || !Array.isArray(payload.matches)) {
        throw new Error(
          payload.message || "비슷한 사주를 찾지 못했습니다. 다시 시도해 주세요.",
        );
      }
      setResult(payload);
      window.setTimeout(() => resultRef.current?.focus(), 0);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "비슷한 사주를 찾지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="similar-saju-card" aria-labelledby="similar-saju-title">
      <div className="section-heading">
        <p className="step-label">비슷한 사주 찾기</p>
        <h2 id="similar-saju-title">나와 닮은 사주를 찾아보세요.</h2>
        <p className="form-intro">
          실제 이용자가 아니라 1900년부터 2026년까지의 달력 날짜를 비교합니다.
          같은 일주 중 다른 기둥과 오행 구성이 가까운 다섯 날짜를 보여드려요.
        </p>
      </div>

      <form onSubmit={handleSubmit} aria-busy={isLoading}>
        <div className="birth-grid">
          <div className="field-group">
            <label htmlFor="similar-date">
              생년월일 <span aria-hidden="true">*</span>
            </label>
            <input
              id="similar-date"
              name="similar-date"
              type="date"
              min={MIN_BIRTH_DATE}
              max={MAX_BIRTH_DATE}
              required
            />
          </div>

          <div className="field-group">
            <div className="time-label-row">
              <label htmlFor="similar-time">
                출생 시각 {!unknownTime && <span aria-hidden="true">*</span>}
              </label>
              <button
                type="button"
                className="unknown-time-button"
                aria-pressed={unknownTime}
                onClick={() => setUnknownTime((current) => !current)}
              >
                시간을 잘 모름
              </button>
            </div>
            <input
              id="similar-time"
              name="similar-time"
              type="time"
              required={!unknownTime}
              disabled={unknownTime}
            />
            {unknownTime && (
              <p className="field-help" role="status">
                시주는 제외하고 세 기둥만 비교합니다.
              </p>
            )}
          </div>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "닮은 사주를 찾고 있어요…" : "비슷한 사주 찾기"}
        </button>
      </form>

      <div className="feedback" aria-live="polite">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>

      {result && (
        <section
          className="similar-saju-result"
          aria-labelledby="similar-result-title"
          ref={resultRef}
          tabIndex={-1}
        >
          <div className="similar-result-heading">
            <div>
              <p className="result-label">달력 비교가 끝났어요</p>
              <h2 id="similar-result-title">가장 닮은 사주 다섯 가지</h2>
            </div>
            <span className="topic-badge">
              {result.source.pillars[2].korean}일주
            </span>
          </div>
          <p className="similar-method-note">{result.methodNote}</p>

          {result.matches.length > 0 ? (
            <ol className="similar-match-list">
              {result.matches.map((match, index) => (
                <SimilarMatchCard
                  key={`${match.date}-${match.time || "unknown"}`}
                  match={match}
                  rank={index + 1}
                />
              ))}
            </ol>
          ) : (
            <div className="reading-error" role="status">
              <strong>지원 범위에서 비슷하지만 다른 사주를 찾지 못했어요.</strong>
              <p>출생 시각을 다르게 입력하거나 시간 미상으로 다시 비교해 보세요.</p>
            </div>
          )}

          <p className="reading-disclaimer">
            닮은 정도는 사주의 계산 구조를 비교한 참고값이며 성격이나 삶이 같다는
            뜻은 아닙니다.
          </p>
        </section>
      )}
    </section>
  );
}
