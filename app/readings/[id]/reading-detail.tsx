"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { topicLabels } from "../../../lib/saju/chart";
import type { SavedReadingDetail } from "../../../lib/saju/saved-reading";

type DetailResponse = { reading?: SavedReadingDetail; message?: string };

export default function ReadingDetail({ id }: { id: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<SavedReadingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/readings/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as DetailResponse;
      if (!response.ok || !payload.reading) {
        throw new Error(payload.message || "결과를 불러오지 못했습니다.");
      }
      setDetail(payload.reading);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "결과를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteReading() {
    if (!detail) return;
    const confirmed = window.confirm(
      `${detail.birthDate} · ${topicLabels[detail.topic]} 결과를 삭제할까요? 삭제하면 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/readings/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || "결과를 삭제하지 못했습니다.");
      router.push("/readings");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "결과를 삭제하지 못했습니다.");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <section className="state-card" role="status">저장된 해석을 불러오고 있어요…</section>;
  }
  if (error && !detail) {
    return (
      <section className="state-card" role="alert">
        <h1>결과를 열지 못했습니다.</h1>
        <p>{error}</p>
        <button type="button" className="retry-button" onClick={() => void load()}>
          다시 불러오기
        </button>
      </section>
    );
  }
  if (!detail) return null;

  return (
    <article className="detail-card" aria-labelledby="saved-reading-title">
      <header className="detail-header">
        <div>
          <p className="eyebrow">
            {detail.birthDate} · {detail.birthTime ?? "출생 시각 모름"}
          </p>
          <h1 id="saved-reading-title">{detail.reading.headline}</h1>
          <span className="topic-badge">{topicLabels[detail.topic]}</span>
        </div>
        <button
          type="button"
          className="delete-button"
          disabled={isDeleting}
          onClick={deleteReading}
        >
          {isDeleting ? "삭제 중…" : "이 결과 삭제"}
        </button>
      </header>

      {error && <p className="error" role="alert">{error}</p>}
      {detail.question && (
        <div className="concern-summary">
          <p className="summary-label">내가 적은 고민</p>
          <p>“{detail.question}”</p>
        </div>
      )}
      <div className="reading-summary saved-summary">
        <p className="summary-label">한눈에 보는 해석</p>
        <p>{detail.reading.summary}</p>
      </div>
      <div className="reading-sections">
        {detail.reading.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <section className="action-card">
        <h2>지금 해볼 작은 행동</h2>
        <ol>
          {detail.reading.actions.map((action) => <li key={action}>{action}</li>)}
        </ol>
      </section>
      <section className="result-section">
        <h2>사주 {detail.chart.pillars.length === 3 ? "세" : "네"} 기둥</h2>
        <dl className="pillars">
          {detail.chart.pillars.map((pillar) => (
            <div key={pillar.label}>
              <dt>{pillar.label}</dt>
              <dd lang="zh-Hant">{pillar.text}</dd>
              <span>{pillar.korean}</span>
            </div>
          ))}
        </dl>
      </section>
    </article>
  );
}
