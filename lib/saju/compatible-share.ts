import type { CompatibleSajuProfile } from "./compatible-profile";

export const COMPATIBLE_SHARE_WIDTH = 1080;
export const COMPATIBLE_SHARE_HEIGHT = 1560;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function wrapShareText(value: string, maxLength: number) {
  const lines: string[] = [];
  let line = "";

  for (const word of value.split(/\s+/)) {
    if (!line) {
      line = word;
      continue;
    }
    if (Array.from(`${line} ${word}`).length <= maxLength) {
      line += ` ${word}`;
      continue;
    }
    lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

function renderTextLines(lines: string[], x: number, y: number, lineHeight: number) {
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}">${escapeXml(line)}</text>`)
    .join("");
}

export function buildCompatibleShareSvg(profile: CompatibleSajuProfile) {
  const elements = profile.recommendations.map((item) => item.element).join(" · ");
  const cards = profile.recommendations.map((item, index) => {
    const y = 410 + index * 245;
    const description = wrapShareText(item.description, 34).slice(0, 3);
    return `
      <g class="card">
        <rect x="90" y="${y}" width="900" height="215" rx="24" />
        <circle cx="150" cy="${y + 62}" r="38" />
        <text class="element" x="150" y="${y + 74}" text-anchor="middle">${escapeXml(item.element)}</text>
        <text class="label" x="215" y="${y + 52}">${escapeXml(item.label)}</text>
        <text class="masters" x="215" y="${y + 94}">${escapeXml(item.dayMasters)} 일간</text>
        <g class="description">${renderTextLines(description, 215, y + 140, 31)}</g>
      </g>`;
  }).join("");

  const harmony = `나의 ${profile.harmony.myBranchKorean}(${profile.harmony.myBranch})와 ${profile.harmony.partnerBranchKorean}(${profile.harmony.partnerBranch}) 일지`;
  const noteLines = wrapShareText(profile.note, 38).slice(0, 3);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${COMPATIBLE_SHARE_WIDTH}" height="${COMPATIBLE_SHARE_HEIGHT}" viewBox="0 0 ${COMPATIBLE_SHARE_WIDTH} ${COMPATIBLE_SHARE_HEIGHT}">
    <rect width="1080" height="1560" fill="#f3ead8" />
    <rect x="42" y="42" width="996" height="1476" rx="28" fill="#fffdf7" stroke="#b28a46" stroke-width="3" />
    <rect x="58" y="58" width="964" height="1444" rx="22" fill="none" stroke="#dfca9c" stroke-width="2" />
    <style>
      text { font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; fill: #173746; }
      .service { font-size: 25px; font-weight: 700; fill: #9c3929; letter-spacing: 3px; }
      .title { font-family: "Nanum Myeongjo", "Batang", serif; font-size: 58px; font-weight: 800; }
      .intro { font-size: 25px; fill: #5e625f; }
      .summary-box { fill: #f5ecd8; stroke: #d8bd83; stroke-width: 2; }
      .summary-label { font-size: 23px; font-weight: 800; fill: #9c3929; }
      .summary-elements { font-size: 42px; font-weight: 800; letter-spacing: 7px; }
      .card rect { fill: #faf7f1; stroke: #d7c8aa; stroke-width: 2; }
      .card circle { fill: #224656; stroke: #b28a46; stroke-width: 2; }
      .element { font-size: 34px; font-weight: 800; fill: #fffdf5; }
      .label { font-size: 22px; font-weight: 800; fill: #9c3929; }
      .masters { font-size: 31px; font-weight: 800; }
      .description text { font-size: 22px; fill: #545b59; }
      .harmony-box { fill: #e8f0ed; stroke: #b9ccc5; stroke-width: 2; }
      .harmony-label { font-size: 22px; font-weight: 800; fill: #9c3929; }
      .harmony-title { font-size: 30px; font-weight: 800; }
      .harmony-copy { font-size: 22px; fill: #545b59; }
      .note text { font-size: 20px; fill: #656a67; }
      .footer { font-family: "Nanum Myeongjo", "Batang", serif; font-size: 25px; font-weight: 800; fill: #9c3929; }
    </style>
    <text class="service" x="90" y="105">관계의 조화 살펴보기</text>
    <text class="title" x="90" y="180">나와 잘 맞는 사주</text>
    <text class="intro" x="90" y="225">서로 힘을 보태기 쉬운 사주의 특징을 정리했습니다.</text>
    <rect class="summary-box" x="90" y="265" width="900" height="110" rx="20" />
    <text class="summary-label" x="125" y="312">잘 맞는 오행</text>
    <text class="summary-elements" x="125" y="357">${escapeXml(elements)}</text>
    ${cards}
    <rect class="harmony-box" x="90" y="1165" width="900" height="150" rx="22" />
    <text class="harmony-label" x="125" y="1210">일지로 보는 자연스러운 호흡</text>
    <text class="harmony-title" x="125" y="1255">${escapeXml(harmony)}</text>
    <text class="harmony-copy" x="125" y="1292">서로의 리듬을 맞추기 쉬운 육합 관계로 봅니다.</text>
    <g class="note">${renderTextLines(noteLines, 90, 1365, 32)}</g>
    <text class="footer" x="90" y="1475">나의 사주 안내서</text>
  </svg>`;
}

export async function renderCompatibleSharePng(profile: CompatibleSajuProfile) {
  const svg = buildCompatibleShareSvg(profile);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const imageUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("공유 이미지를 불러오지 못했습니다."));
      image.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = COMPATIBLE_SHARE_WIDTH;
    canvas.height = COMPATIBLE_SHARE_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 그릴 수 없습니다.");
    context.drawImage(image, 0, 0);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) throw new Error("PNG 이미지를 만들 수 없습니다.");
    return pngBlob;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export function downloadCompatibleSharePng(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `나와-잘-맞는-사주-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
