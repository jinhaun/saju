import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function readProjectFile(relativePath: string) {
  return readFile(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    "utf8",
  );
}

test("기본 입력 성공 뒤 다섯 장의 목차를 연다", async () => {
  const source = await readProjectFile("app/chapter-experience.tsx");
  const chapterIds = [...source.matchAll(/id: "(reading|similar|harmony|compatibility|today)"/g)]
    .map((match) => match[1]);

  assert.deepEqual(chapterIds, [
    "reading",
    "similar",
    "harmony",
    "compatibility",
    "today",
  ]);
  assert.match(source, /if \(!reusedBirthInput\) return;/);
  assert.match(source, /setActiveChapter\("reading"\)/);
  assert.match(source, /setShowInput\(false\)/);
  assert.match(source, /reusedBirthInput && !showInput/);
});

test("목차를 누르면 선택한 장 하나만 표시한다", async () => {
  const source = await readProjectFile("app/chapter-experience.tsx");

  assert.match(source, /onClick=\{\(\) => openChapter\(chapter\.id\)\}/);
  assert.match(
    source,
    /showResult=\{!showInput && \(activeChapter === "reading" \|\| activeChapter === "harmony"\)\}/,
  );
  assert.match(source, /hidden=\{showInput \|\| activeChapter !== "similar"\}/);
  assert.match(source, /hidden=\{showInput \|\| activeChapter !== "compatibility"\}/);
  assert.match(source, /!showInput && activeChapter === "today"/);

  const sajuSource = await readProjectFile("app/saju-form.tsx");
  assert.match(sajuSource, /resultView === "reading"/);
  assert.match(sajuSource, /resultView === "harmony"/);
});

test("기본 정보 수정은 기존 폼을 다시 보여준다", async () => {
  const source = await readProjectFile("app/chapter-experience.tsx");
  const sajuSource = await readProjectFile("app/saju-form.tsx");

  assert.match(
    source,
    /<button type="button" onClick=\{\(\) => setShowInput\(true\)\}>\s*기본 정보 수정\s*<\/button>/,
  );
  assert.match(source, /hideInput=\{!showInput\}/);
  assert.match(sajuSource, /className="saju-input-stage" hidden=\{hideInput\}/);
});

test("현재 장을 글과 보조 기술 상태로 함께 알리고 이동 뒤 내용에 초점을 둔다", async () => {
  const source = await readProjectFile("app/chapter-experience.tsx");

  assert.match(source, /aria-pressed=\{isActive\}/);
  assert.match(source, /\{isActive && <span className="chapter-selected">선택됨<\/span>\}/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /chapterContentRef\.current\?\.focus\(\)/);
  assert.match(source, /<button\s+type="button"\s+className="chapter-card"/);
});

test("모바일에서는 목차가 한 열이고 버튼은 충분한 높이를 유지한다", async () => {
  const css = await readProjectFile("app/globals.css");

  assert.match(css, /\.chapter-card\s*\{[\s\S]*?min-height:\s*(?:1[12]\d|[4-9]\d)px;/);
  assert.match(
    css,
    /@media \(max-width: 620px\)\s*\{[\s\S]*?\.chapter-grid\s*\{\s*grid-template-columns:\s*1fr;/,
  );
});

test("장 전환 중에도 입력 재사용 폼들을 같은 Provider 안에 계속 둔다", async () => {
  const pageSource = await readProjectFile("app/page.tsx");
  const chapterSource = await readProjectFile("app/chapter-experience.tsx");
  const providerContents = pageSource.match(
    /<ReusedBirthInputProvider>([\s\S]*?)<\/ReusedBirthInputProvider>/,
  )?.[1];

  assert.ok(providerContents, "공유 입력 Provider가 있어야 합니다.");
  assert.match(providerContents, /<ChapterExperience\b/);
  assert.match(chapterSource, /<SajuForm\b/);
  assert.match(chapterSource, /<SimilarSajuForm\s*\/>/);
  assert.match(chapterSource, /<CompatibilityForm\s*\/>/);
  assert.match(chapterSource, /useReusedBirthInput\(\)/);
});

test("비로그인 오늘의 운세는 요청 대신 로그인 안내를 보여준다", async () => {
  const source = await readProjectFile("app/chapter-experience.tsx");

  assert.match(
    source,
    /isAuthenticated \? \(\s*<TodayFortuneCard\s*\/>\s*\) : \(\s*<section className="state-card chapter-login-state">/,
  );
  assert.match(source, /오늘의 운세는 로그인 뒤 볼 수 있어요\./);
});
