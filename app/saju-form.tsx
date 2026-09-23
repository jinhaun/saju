"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  calculate,
  InputError,
  MAX_BIRTH_DATE,
  MIN_BIRTH_DATE,
  topicLabels,
  topicValues,
  type SajuChart,
  type SajuInput,
  type Topic,
} from "../lib/saju/chart";
import type { SajuReading } from "../lib/saju/reading";
import type { SaveReadingRequest } from "../lib/saju/saved-reading";

const topicDescriptions: Record<Topic, string> = {
  relationship: "연애와 가까운 관계가 궁금해요",
  career: "일과 앞으로의 방향을 살펴보고 싶어요",
  wealth: "돈을 대하는 흐름이 궁금해요",
  social: "사람들과 맺는 관계를 알고 싶어요",
  strengths: "나의 기질과 강점을 발견하고 싶어요",
  yearly: "올해의 전반적인 흐름이 궁금해요",
};

type SaveStatus = "idle" | "guest" | "saving" | "saved" | "error" | "auth";

export default function SajuForm({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [chart, setChart] = useState<SajuChart | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [question, setQuestion] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState<SajuReading | null>(null);
  const [readingError, setReadingError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSave, setPendingSave] = useState<SaveReadingRequest | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  async function saveResult(payload: SaveReadingRequest) {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const response = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { id?: string; message?: string };
      if (!response.ok || !result.id) {
        if (response.status === 401) {
          setSaveStatus("auth");
          setSaveError(result.message || "로그인이 만료되었습니다. 다시 로그인해 주세요.");
          return;
        }
        throw new Error(result.message || "결과를 저장하지 못했습니다.");
      }
      setSavedId(result.id);
      setSaveStatus("saved");
    } catch (caught) {
      setSaveStatus("error");
      setSaveError(
        caught instanceof Error ? caught.message : "결과를 저장하지 못했습니다.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: SajuInput = {
      date: String(data.get("date") || ""),
      time: String(data.get("time") || ""),
      calendar: "solar",
      topic: String(data.get("topic") || "") as Topic,
      question: String(data.get("question") || ""),
      unknownTime,
    };

    try {
      const localChart = calculate(input);
      setChart(localChart);
      setSelectedTopic(input.topic);
      setSubmittedQuestion(input.question?.trim() || "");
      setError("");
      setReading(null);
      setReadingError("");
      setPendingSave(null);
      setSaveStatus("idle");
      setSaveError("");
      setSavedId("");
      setIsLoading(true);
      window.setTimeout(() => resultRef.current?.focus(), 0);

      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as {
        chart?: SajuChart;
        reading?: SajuReading;
        message?: string;
      };

      if (!response.ok || !payload.chart || !payload.reading) {
        throw new Error(payload.message || "해석을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }

      setChart(payload.chart);
      setReading(payload.reading);
      setIsLoading(false);

      const savePayload: SaveReadingRequest = {
        requestId: crypto.randomUUID(),
        input,
        reading: payload.reading,
      };
      setPendingSave(savePayload);
      if (isAuthenticated) {
        await saveResult(savePayload);
      } else {
        setSaveStatus("guest");
      }
    } catch (caught) {
      if (caught instanceof InputError) {
        setChart(null);
        setSelectedTopic(null);
        setSubmittedQuestion("");
        setReading(null);
        setError(caught.message);
      } else {
        setReadingError(
          caught instanceof Error
            ? caught.message
            : "해석을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="input-card" aria-labelledby="input-title">
      <div className="section-heading">
        <h2 id="input-title">기본 정보와 고민을 알려주세요.</h2>
        <p className="form-intro">별표가 있는 항목은 필수입니다</p>
        {isAuthenticated && (
          <p className="privacy-note">
            생년월일·출생 시각·고민과 해석을 본인만 보는 결과에 저장하며, 언제든 개별 삭제할 수 있습니다.
          </p>
        )}
      </div>
      <form ref={formRef} onSubmit={handleSubmit} aria-busy={isLoading || saveStatus === "saving"}>
        <div className="birth-grid">
          <div className="field-group">
            <label htmlFor="date">생년월일 <span aria-hidden="true">*</span></label>
            <input
              id="date"
              name="date"
              type="date"
              min={MIN_BIRTH_DATE}
              max={MAX_BIRTH_DATE}
              required
            />
          </div>

          <div className="field-group">
            <div className="time-label-row">
              <label htmlFor="time">
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
              id="time"
              name="time"
              type="time"
              required={!unknownTime}
              disabled={unknownTime}
            />
            {unknownTime && (
              <p className="field-help" role="status">
                시주는 제외하고 세 기둥으로 해석합니다. 절기 경계에서는 년주·월주가 달라질 수 있어요.
              </p>
            )}
          </div>
        </div>

        <fieldset className="topic-fieldset">
          <legend>지금 가장 궁금한 주제 <span aria-hidden="true">*</span></legend>
          <p className="field-help">하나를 골라주세요. 선택한 고민을 중심으로 해석해 드립니다.</p>
          <div className="topic-grid">
            {topicValues.map((topic) => (
              <label className="topic-card" key={topic}>
                <input name="topic" type="radio" value={topic} required />
                <span className="topic-check" aria-hidden="true" />
                <span className="topic-copy">
                  <strong>{topicLabels[topic]}</strong>
                  <small>{topicDescriptions[topic]}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-group question-field">
          <div className="label-row">
            <label htmlFor="question">직접 적는 고민 <span className="optional">선택</span></label>
            <span className="character-count" aria-live="polite">{question.length}/200</span>
          </div>
          <textarea
            id="question"
            name="question"
            maxLength={200}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="예: 지금 준비 중인 일이 저와 잘 맞는지 궁금해요."
          />
        </div>

        <button type="submit" disabled={isLoading || saveStatus === "saving"}>
          {isLoading
            ? "사주 해석을 준비하고 있어요…"
            : saveStatus === "saving"
              ? "결과를 저장하고 있어요…"
              : readingError
                ? "다시 해석하기"
                : "나의 사주 해석 보기"}
        </button>
      </form>

      <div className="feedback" aria-live="polite">
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      {chart && selectedTopic && (
        <section className="result" aria-labelledby="result-title" ref={resultRef} tabIndex={-1}>
          <div className="result-heading">
            <div>
              <p className="result-label">기본 계산이 끝났어요</p>
              <h2 id="result-title">{chart.pillars[2].korean}일주</h2>
            </div>
            <span className="topic-badge">{topicLabels[selectedTopic]}</span>
          </div>

          <div className="concern-summary">
            <p className="summary-label">선택한 고민</p>
            <strong>{topicLabels[selectedTopic]}</strong>
            {submittedQuestion && <p>“{submittedQuestion}”</p>}
          </div>

          {isLoading && (
            <div className="reading-status" role="status">
              <span className="loading-dot" aria-hidden="true" />
              <div>
                <strong>고민과 사주를 함께 살펴보고 있어요.</strong>
                <p>잠시만 기다려 주세요. 기본 계산 결과는 그대로 유지됩니다.</p>
              </div>
            </div>
          )}

          {readingError && !isLoading && (
            <div className="reading-error" role="alert">
              <strong>해석을 가져오지 못했어요.</strong>
              <p>{readingError}</p>
              <button type="button" className="retry-button" onClick={() => formRef.current?.requestSubmit()}>
                같은 내용으로 다시 해석하기
              </button>
            </div>
          )}

          {reading && !isLoading && (
            <article className="reading" aria-labelledby="reading-title">
              <div className="reading-summary">
                <p className="summary-label">한눈에 보는 해석</p>
                <h3 id="reading-title">{reading.headline}</h3>
                <p>{reading.summary}</p>
              </div>

              <div className="reading-sections">
                {reading.sections.map((section) => (
                  <section key={section.title}>
                    <h3>{section.title}</h3>
                    <p>{section.body}</p>
                  </section>
                ))}
              </div>

              <section className="action-card">
                <h3>지금 해볼 작은 행동</h3>
                <ol>
                  {reading.actions.map((action) => <li key={action}>{action}</li>)}
                </ol>
              </section>

              <p className="reading-disclaimer">
                이 해석은 자신을 돌아보기 위한 참고 자료입니다. 중요한 결정은 실제 상황과 전문가의 조언을 함께 살펴보세요.
              </p>
            </article>
          )}

          {reading && !isLoading && saveStatus !== "idle" && (
            <div className={`save-panel save-${saveStatus}`} role="status" aria-atomic="true">
              {saveStatus === "guest" && (
                <>
                  <strong>이 결과는 저장되지 않았습니다.</strong>
                  <p>Google로 로그인한 뒤 새로 만든 결과부터 내 사주 결과에 저장됩니다.</p>
                </>
              )}
              {saveStatus === "saving" && (
                <>
                  <strong>결과를 안전하게 저장하고 있어요.</strong>
                  <p>해석은 이미 완성됐으니 잠시만 기다려 주세요.</p>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <strong>내 결과에 저장됐습니다.</strong>
                  <p>새로고침하거나 다시 로그인해도 이 해석을 볼 수 있어요.</p>
                  <Link className="inline-link" href={savedId ? `/readings/${savedId}` : "/readings"}>
                    저장된 결과 보기
                  </Link>
                </>
              )}
              {(saveStatus === "error" || saveStatus === "auth") && (
                <>
                  <strong>{saveStatus === "auth" ? "로그인을 다시 확인해 주세요." : "해석은 완성됐지만 저장하지 못했어요."}</strong>
                  <p>{saveError}</p>
                  {saveStatus === "error" && pendingSave && (
                    <button
                      type="button"
                      className="retry-button"
                      onClick={() => void saveResult(pendingSave)}
                    >
                      저장만 다시 시도
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="chart-summary">
            <p className="summary-label">나를 나타내는 중심 글자</p>
            <p className="day-master">
              <strong>{chart.dayMaster.korean}{chart.dayMaster.element}</strong>
              <span>{chart.dayMaster.character}</span>
            </p>
          </div>

          <div className="result-section">
            <h3>사주 {chart.pillars.length === 3 ? "세" : "네"} 기둥</h3>
            <dl className="pillars">
              {chart.pillars.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd lang="zh-Hant">{item.text}</dd>
                  <span>{item.korean}</span>
                </div>
              ))}
            </dl>
          </div>

          <div className="result-section">
            <h3>오행 분포</h3>
            <p className="section-description">
              {chart.pillars.length * 2}글자에 나타난 대표 오행의 개수입니다.
            </p>
            <div className="element-list">
              {Object.entries(chart.elements).map(([element, count]) => (
                <div className="element-row" key={element}>
                  <span className="element-name">{element}</span>
                  <div className="element-track" aria-hidden="true">
                    <span
                      style={{ width: `${(count / (chart.pillars.length * 2)) * 100}%` }}
                    />
                  </div>
                  <strong aria-label={`${element} ${count}개`}>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          <details className="calculation-note">
            <summary>계산 기준 보기</summary>
            <p>{chart.method}</p>
            <p>{chart.elementMethod}</p>
          </details>
        </section>
      )}
    </section>
  );
}
