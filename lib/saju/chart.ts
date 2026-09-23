import lunar from "lunar-javascript";

const { Solar } = lunar;

export type SajuInput = {
  date: string;
  time: string;
  calendar: "solar";
  topic: Topic;
  question?: string;
  unknownTime?: boolean;
};

export const topicValues = [
  "relationship",
  "career",
  "wealth",
  "social",
  "strengths",
  "yearly",
] as const;

export type Topic = (typeof topicValues)[number];

export const MIN_BIRTH_DATE = "1900-01-01";
export const MAX_BIRTH_DATE = "2026-12-31";

export const topicLabels: Record<Topic, string> = {
  relationship: "연애·관계",
  career: "진로·직업",
  wealth: "재물·돈",
  social: "인간관계",
  strengths: "성격·강점",
  yearly: "올해의 흐름",
};

export type Pillar = {
  label: string;
  text: string;
  korean: string;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
};

export type SajuChart = {
  pillars: Pillar[];
  elements: Record<"목" | "화" | "토" | "금" | "수", number>;
  dayMaster: { character: string; korean: string; element: string };
  unknownTime: boolean;
  method: string;
  engine: string;
  elementMethod: string;
};

export class InputError extends Error {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

const stems = [..."甲乙丙丁戊己庚辛壬癸"];
const branches = [..."子丑寅卯辰巳午未申酉戌亥"];
const stemKo = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const branchKo = [
  "자",
  "축",
  "인",
  "묘",
  "진",
  "사",
  "오",
  "미",
  "신",
  "유",
  "술",
  "해",
];
const stemElement = [
  "목",
  "목",
  "화",
  "화",
  "토",
  "토",
  "금",
  "금",
  "수",
  "수",
];
const branchElement = [
  "수",
  "토",
  "목",
  "목",
  "토",
  "화",
  "화",
  "토",
  "금",
  "금",
  "토",
  "수",
];

export const CALCULATION =
  "양력 · 한국 표준시(UTC+9) · 23시 일자 변경 · 진태양시 보정 없음";

export function validateInput(raw: SajuInput): SajuInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new InputError("입력 내용을 확인해주세요.");
  if (raw.calendar !== "solar")
    throw new InputError(
      "이번 버전은 양력만 지원합니다. 양력 날짜를 입력해주세요.",
      "calendar",
    );

  const date = raw.date;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new InputError("생년월일을 입력해주세요.", "date");

  const [year, month, day] = date.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  )
    throw new InputError("실제로 존재하는 날짜를 입력해주세요.", "date");
  if (date < MIN_BIRTH_DATE || date > MAX_BIRTH_DATE)
    throw new InputError(
      "1900년 1월 1일부터 2026년 12월 31일까지의 날짜를 지원합니다.",
      "date",
    );
  if (raw.unknownTime !== undefined && typeof raw.unknownTime !== "boolean")
    throw new InputError("출생 시각 선택을 확인해주세요.", "unknownTime");
  const unknownTime = raw.unknownTime === true;
  if (
    !unknownTime &&
    (typeof raw.time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time))
  )
    throw new InputError("태어난 시각을 정확히 입력해주세요.", "time");
  if (!topicValues.includes(raw.topic))
    throw new InputError("풀이 주제를 선택해주세요.", "topic");
  if (raw.question !== undefined && typeof raw.question !== "string")
    throw new InputError("질문은 글자로 입력해주세요.", "question");

  const question = (raw.question || "").trim();
  if (question.length > 200)
    throw new InputError("질문은 200자까지 입력할 수 있어요.", "question");

  return {
    date,
    time: unknownTime ? "" : raw.time,
    calendar: "solar",
    unknownTime,
    topic: raw.topic,
    question,
  };
}

function pillar(label: string, text: string): Pillar {
  const [stem, branch] = [...text];
  return {
    label,
    text,
    korean: stemKo[stems.indexOf(stem)] + branchKo[branches.indexOf(branch)],
    stem,
    branch,
    stemElement: stemElement[stems.indexOf(stem)],
    branchElement: branchElement[branches.indexOf(branch)],
  };
}

export function calculate(raw: SajuInput): SajuChart {
  const input = validateInput(raw);
  const [year, month, day] = input.date.split("-").map(Number);
  const [hour, minute] = input.unknownTime
    ? [12, 0]
    : input.time.split(":").map(Number);

  const chinaTime = new Date(
    Date.UTC(year, month - 1, day, hour - 1, minute),
  );
  const terms = Solar.fromYmdHms(
    chinaTime.getUTCFullYear(),
    chinaTime.getUTCMonth() + 1,
    chinaTime.getUTCDate(),
    chinaTime.getUTCHours(),
    minute,
    0,
  )
    .getLunar()
    .getEightChar();
  const local = Solar.fromYmdHms(year, month, day, hour, minute, 0)
    .getLunar()
    .getEightChar();
  local.setSect(1);

  const pillars = [
    pillar("년주", terms.getYear()),
    pillar("월주", terms.getMonth()),
    pillar("일주", local.getDay()),
  ];
  if (!input.unknownTime) pillars.push(pillar("시주", local.getTime()));
  const elements: SajuChart["elements"] = {
    목: 0,
    화: 0,
    토: 0,
    금: 0,
    수: 0,
  };
  pillars.forEach((item) => {
    elements[item.stemElement as keyof typeof elements]++;
    elements[item.branchElement as keyof typeof elements]++;
  });

  return {
    pillars,
    elements,
    dayMaster: {
      character: pillars[2].stem,
      korean: stemKo[stems.indexOf(pillars[2].stem)],
      element: pillars[2].stemElement,
    },
    unknownTime: input.unknownTime === true,
    method: input.unknownTime
      ? `${CALCULATION} · 출생 시각 미상은 정오 기준으로 년·월주를 계산하고 시주 제외`
      : CALCULATION,
    engine: "lunar-javascript@1.7.7",
    elementMethod: `천간과 지지의 대표 오행 ${pillars.length * 2}자를 센 값입니다. 지장간과 계절 가중치를 반영한 강약 판단은 아닙니다.`,
  };
}
