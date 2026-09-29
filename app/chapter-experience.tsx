"use client";

import { useEffect, useRef, useState } from "react";
import CompatibilityForm from "./compatibility-form";
import { useReusedBirthInput } from "./reused-birth-input-context";
import SajuForm from "./saju-form";
import SimilarSajuForm from "./similar-saju-form";
import TodayFortuneCard from "./today/today-fortune-card";

type ChapterId = "reading" | "similar" | "harmony" | "compatibility" | "today";

const chapters: Array<{
  id: ChapterId;
  number: string;
  title: string;
  description: string;
}> = [
  {
    id: "reading",
    number: "제1장",
    title: "나의 사주 해석",
    description: "나의 기질과 지금 고민의 흐름을 읽어봅니다.",
  },
  {
    id: "similar",
    number: "제2장",
    title: "나와 닮은 사주",
    description: "일주와 오행 구성이 비슷한 날짜를 찾아봅니다.",
  },
  {
    id: "harmony",
    number: "제3장",
    title: "나와 잘 맞는 사주와 오행",
    description: "서로 힘을 보태기 쉬운 기운과 일지를 살펴봅니다.",
  },
  {
    id: "compatibility",
    number: "제4장",
    title: "서로의 궁합",
    description: "두 사람의 사주 흐름을 함께 비교합니다.",
  },
  {
    id: "today",
    number: "제5장",
    title: "오늘의 운세",
    description: "오늘의 흐름과 작은 행동을 확인합니다.",
  },
];

export default function ChapterExperience({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { reusedBirthInput } = useReusedBirthInput();
  const [activeChapter, setActiveChapter] = useState<ChapterId>("reading");
  const [showInput, setShowInput] = useState(true);
  const chapterContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reusedBirthInput) return;
    setActiveChapter("reading");
    setShowInput(false);
  }, [reusedBirthInput]);

  function openChapter(chapterId: ChapterId) {
    setActiveChapter(chapterId);
    setShowInput(false);
    window.setTimeout(() => chapterContentRef.current?.focus(), 0);
  }

  const activeChapterInfo = chapters.find((chapter) => chapter.id === activeChapter) ?? chapters[0];
  const inputSummary = reusedBirthInput
    ? `${reusedBirthInput.date} · ${reusedBirthInput.unknownTime ? "출생 시각 모름" : reusedBirthInput.time}`
    : "";

  return (
    <>
      {reusedBirthInput && !showInput && (
        <section className="chapter-index" aria-labelledby="chapter-index-title">
          <div className="chapter-index-heading">
            <div>
              <p className="chapter-kicker">나의 사주 목차</p>
              <h2 id="chapter-index-title">궁금한 장을 펼쳐보세요.</h2>
              <p>한 번에 한 장씩, 필요한 내용에 집중해서 볼 수 있습니다.</p>
            </div>
            <div className="chapter-input-summary">
              <span>{inputSummary}</span>
              <button type="button" onClick={() => setShowInput(true)}>
                기본 정보 수정
              </button>
            </div>
          </div>

          <div className="chapter-grid" aria-label="사주 결과 목차">
            {chapters.map((chapter) => {
              const isActive = chapter.id === activeChapter;
              return (
                <button
                  type="button"
                  className="chapter-card"
                  aria-pressed={isActive}
                  onClick={() => openChapter(chapter.id)}
                  key={chapter.id}
                >
                  <span className="chapter-number">{chapter.number}</span>
                  <strong>{chapter.title}</strong>
                  <small>{chapter.description}</small>
                  {isActive && <span className="chapter-selected">선택됨</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div
        className="chapter-content"
        ref={chapterContentRef}
        tabIndex={-1}
        aria-label={showInput ? "기본 정보 입력" : activeChapterInfo.title}
      >
        <div
          hidden={
            !showInput && activeChapter !== "reading" && activeChapter !== "harmony"
          }
        >
          <SajuForm
            isAuthenticated={isAuthenticated}
            hideInput={!showInput}
            showResult={!showInput && (activeChapter === "reading" || activeChapter === "harmony")}
            resultView={activeChapter === "harmony" ? "harmony" : "reading"}
          />
        </div>

        <div hidden={showInput || activeChapter !== "similar"}>
          <SimilarSajuForm />
        </div>

        <div hidden={showInput || activeChapter !== "compatibility"}>
          <CompatibilityForm />
        </div>

        {!showInput && activeChapter === "today" && (
          isAuthenticated ? (
            <TodayFortuneCard />
          ) : (
            <section className="state-card chapter-login-state">
              <p className="chapter-kicker">제5장 오늘의 운세</p>
              <h2>오늘의 운세는 로그인 뒤 볼 수 있어요.</h2>
              <p>위쪽의 Google 로그인 버튼을 누른 뒤, 기본 사주 결과를 한 번 저장해 주세요.</p>
            </section>
          )
        )}
      </div>
    </>
  );
}
