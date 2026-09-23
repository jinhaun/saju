"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  MAX_BIRTH_DATE,
  MIN_BIRTH_DATE,
  InputError,
} from "../lib/saju/chart";
import {
  compareCompatibility,
  type CompatibilityPersonInput,
  type CompatibilityResult,
} from "../lib/saju/compatibility";

type PersonFieldsProps = {
  id: "first" | "second";
  label: string;
  unknownTime: boolean;
  onToggleUnknownTime: () => void;
};

function PersonFields({ id, label, unknownTime, onToggleUnknownTime }: PersonFieldsProps) {
  return (
    <fieldset className="person-card">
      <legend>{label}</legend>
      <div className="person-fields">
        <div className="field-group">
          <label htmlFor={`${id}-date`}>생년월일 <span aria-hidden="true">*</span></label>
          <input
            id={`${id}-date`}
            name={`${id}-date`}
            type="date"
            min={MIN_BIRTH_DATE}
            max={MAX_BIRTH_DATE}
            required
          />
        </div>

        <div className="field-group">
          <div className="time-label-row">
            <label htmlFor={`${id}-time`}>
              출생 시각 {!unknownTime && <span aria-hidden="true">*</span>}
            </label>
            <button
              type="button"
              className="unknown-time-button"
              aria-pressed={unknownTime}
              onClick={onToggleUnknownTime}
            >
              시간을 잘 모름
            </button>
          </div>
          <input
            id={`${id}-time`}
            name={`${id}-time`}
            type="time"
            required={!unknownTime}
            disabled={unknownTime}
          />
          {unknownTime && (
            <p className="field-help" role="status">
              시주는 제외하고 확인 가능한 정보만 비교합니다.
            </p>
          )}
        </div>
      </div>
    </fieldset>
  );
}

export default function CompatibilityForm() {
  const [firstUnknownTime, setFirstUnknownTime] = useState(false);
  const [secondUnknownTime, setSecondUnknownTime] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const person = (
      id: "first" | "second",
      unknownTime: boolean,
    ): CompatibilityPersonInput => ({
      date: String(data.get(`${id}-date`) || ""),
      time: unknownTime ? undefined : String(data.get(`${id}-time`) || ""),
      unknownTime,
    });

    try {
      const nextResult = compareCompatibility(
        person("first", firstUnknownTime),
        person("second", secondUnknownTime),
      );
      setResult(nextResult);
      setError("");
      window.setTimeout(() => resultRef.current?.focus(), 0);
    } catch (caught) {
      setResult(null);
      setError(
        caught instanceof InputError
          ? caught.message
          : "궁합을 계산하지 못했습니다. 입력 내용을 다시 확인해 주세요.",
      );
    }
  }

  return (
    <section className="compatibility-card" aria-labelledby="compatibility-title">
      <div className="section-heading">
        <p className="step-label">두 사람 궁합</p>
        <h2 id="compatibility-title">서로의 궁합을 알아보아요</h2>
        <p className="form-intro">
          두 사람의 일간·일지와 오행 구성을 비교합니다. 점수는 관계를 단정하는
          값이 아니라 대화를 돕는 참고 지표입니다.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="compatibility-people">
          <PersonFields
            id="first"
            label="나"
            unknownTime={firstUnknownTime}
            onToggleUnknownTime={() => setFirstUnknownTime((value) => !value)}
          />
          <PersonFields
            id="second"
            label="상대방"
            unknownTime={secondUnknownTime}
            onToggleUnknownTime={() => setSecondUnknownTime((value) => !value)}
          />
        </div>

        <button type="submit">두 사람 궁합 보기</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}

      {result && (
        <section
          className="compatibility-result"
          aria-labelledby="compatibility-result-title"
          ref={resultRef}
          tabIndex={-1}
        >
          <div className="compatibility-score">
            <div className="score-number" aria-label={`궁합 점수 ${result.score}점`}>
              <strong>{result.score}</strong>
              <span>점</span>
            </div>
            <div>
              <p className="result-label">궁합 균형 점수</p>
              <h3 id="compatibility-result-title">{result.scoreLabel}</h3>
              <p>{result.accuracyNote}</p>
            </div>
          </div>

          <div className="compatibility-day-pillars" aria-label="두 사람의 일주">
            {result.people.map((person, index) => (
              <div key={index}>
                <span>{index === 0 ? "나" : "상대방"}</span>
                <strong lang="zh-Hant">{person.dayPillar}</strong>
                <small>
                  {person.dayPillarKorean}일주 · {person.dayMaster.korean}
                  {person.dayMaster.element}
                </small>
              </div>
            ))}
          </div>

          <div className="compatibility-insights">
            <section className="compatibility-insight strength-insight">
              <h3>잘 맞는 점</h3>
              <ul>{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section className="compatibility-insight caution-insight">
              <h3>부딪힐 수 있는 점</h3>
              <ul>{result.cautions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>

          <section className="compatibility-advice">
            <h3>관계를 위한 작은 조언</h3>
            <ol>{result.advice.map((item) => <li key={item}>{item}</li>)}</ol>
          </section>

          <p className="reading-disclaimer">
            궁합은 관계의 가능성을 살펴보는 참고 자료입니다. 실제 관계는 서로의
            선택과 대화, 상황에 따라 달라질 수 있습니다.
          </p>
        </section>
      )}
    </section>
  );
}
