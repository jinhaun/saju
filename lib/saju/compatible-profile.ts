import type { SajuChart } from "./chart";

const elements = ["목", "화", "토", "금", "수"] as const;
type Element = (typeof elements)[number];

const generates: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const generatedBy: Record<Element, Element> = {
  목: "수",
  화: "목",
  토: "화",
  금: "토",
  수: "금",
};

const dayMasterNames: Record<Element, string> = {
  목: "갑목·을목",
  화: "병화·정화",
  토: "무토·기토",
  금: "경금·신금",
  수: "임수·계수",
};

const branchNames: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

const harmonyBranches: Record<string, string> = {
  子: "丑",
  丑: "子",
  寅: "亥",
  亥: "寅",
  卯: "戌",
  戌: "卯",
  辰: "酉",
  酉: "辰",
  巳: "申",
  申: "巳",
  午: "未",
  未: "午",
};

export type CompatibleSajuRecommendation = {
  element: Element;
  dayMasters: string;
  label: string;
  description: string;
};

export type CompatibleSajuProfile = {
  recommendations: CompatibleSajuRecommendation[];
  harmony: {
    myBranch: string;
    myBranchKorean: string;
    partnerBranch: string;
    partnerBranchKorean: string;
  };
  note: string;
};

export function buildCompatibleSajuProfile(chart: SajuChart): CompatibleSajuProfile {
  const myElement = chart.dayMaster.element as Element;
  const supportElement = generatedBy[myElement];
  const flowElement = generates[myElement];
  const balanceElement = elements
    .filter((element) => element !== supportElement && element !== flowElement)
    .sort((left, right) => chart.elements[left] - chart.elements[right])[0];
  const myBranch = chart.pillars[2].branch;
  const partnerBranch = harmonyBranches[myBranch];

  return {
    recommendations: [
      {
        element: supportElement,
        dayMasters: dayMasterNames[supportElement],
        label: "나를 북돋는 기운",
        description: `${supportElement} 기운은 나의 중심인 ${myElement} 기운을 생해, 지치거나 막힐 때 힘을 보태는 흐름으로 봅니다.`,
      },
      {
        element: flowElement,
        dayMasters: dayMasterNames[flowElement],
        label: "함께 성장하는 기운",
        description: `나의 ${myElement} 기운이 ${flowElement} 기운으로 자연스럽게 이어져, 서로의 생각을 행동과 성장으로 연결하기 쉬운 흐름입니다.`,
      },
      {
        element: balanceElement,
        dayMasters: dayMasterNames[balanceElement],
        label: "빈 곳을 채우는 기운",
        description: `${balanceElement} 기운은 내 사주에 ${chart.elements[balanceElement]}개로 비교적 적어, 익숙하지 않은 관점과 균형을 더해줄 수 있습니다.`,
      },
    ],
    harmony: {
      myBranch,
      myBranchKorean: branchNames[myBranch],
      partnerBranch,
      partnerBranchKorean: branchNames[partnerBranch],
    },
    note: "이 내용은 내 사주만으로 살펴본 잘 맞기 쉬운 특징입니다. 실제 두 사람의 궁합은 상대방의 전체 사주와 관계의 상황을 함께 비교해야 합니다.",
  };
}
