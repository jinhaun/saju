"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { topicLabels } from "../../lib/saju/chart";
import type { SavedReadingListItem } from "../../lib/saju/saved-reading";

type ListResponse = {
  items?: SavedReadingListItem[];
  nextCursor?: string | null;
  message?: string;
};

function savedDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ReadingsList() {
  const [items, setItems] = useState<SavedReadingListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextCursor?: string) => {
    setIsLoading(true);
    setError("");
    try {
      const query = nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : "";
      const response = await fetch(`/api/readings${query}`, { cache: "no-store" });
      const payload = (await response.json()) as ListResponse;
      if (!response.ok || !payload.items) {
        throw new Error(payload.message || "저장된 결과를 불러오지 못했습니다.");
      }
      setItems((current) =>
        nextCursor ? [...current, ...payload.items!] : payload.items!,
      );
      setCursor(payload.nextCursor || null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "저장된 결과를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="history-card" aria-labelledby="history-title">
      <div className="history-heading">
        <div>
          <p className="step-label">최신순</p>
          <h2 id="history-title">저장된 해석</h2>
        </div>
        <Link className="primary-link compact" href="/">
          새 해석 만들기
        </Link>
      </div>

      {isLoading && items.length === 0 && (
        <p className="list-status" role="status">
          저장된 결과를 불러오고 있어요…
        </p>
      )}
      {error && (
        <div className="reading-error" role="alert">
          <strong>결과를 불러오지 못했어요.</strong>
          <p>{error}</p>
          <button type="button" className="retry-button" onClick={() => void load()}>
            다시 불러오기
          </button>
        </div>
      )}
      {!isLoading && !error && items.length === 0 && (
        <div className="empty-state">
          <h3>아직 저장된 결과가 없습니다.</h3>
          <p>로그인한 상태에서 새 사주 해석을 만들면 여기에 저장됩니다.</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="reading-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/readings/${item.id}`}>
                <div className="list-meta">
                  <span className="topic-badge">{topicLabels[item.topic]}</span>
                  <span>{item.birthDate}</span>
                </div>
                <h3>{item.headline}</h3>
                <p>{savedDate(item.createdAt)} 저장</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <button
          type="button"
          className="load-more-button"
          disabled={isLoading}
          onClick={() => void load(cursor)}
        >
          {isLoading ? "더 불러오는 중…" : "결과 더 보기"}
        </button>
      )}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {items.length > 0 ? `저장된 결과 ${items.length}개를 표시했습니다.` : ""}
      </span>
    </section>
  );
}
