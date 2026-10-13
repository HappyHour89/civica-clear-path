// Learn guides, in English and Korean side by side. Facts here are settled civics
// (constitutional rules, Senate rules, landmark cases); avoid anything time-sensitive.
// Lines marked TODO(ko-review) need a native speaker's check.
import type { Language } from "@/lib/i18n";

export type Bilingual = { en: string; ko: string };
export type GuideSlug = "how-a-bill-becomes-law" | "three-branches" | "filibuster" | "redistricting";

export type Guide = {
  slug: GuideSlug;
  icon: "bill" | "branches" | "filibuster" | "redistricting";
  title: Bilingual;
  summary: Bilingual;
  sections: { heading: Bilingual; paragraphs: Bilingual[] }[];
};

export const pick = (text: Bilingual, lang: Language) => text[lang];

export const BILL_STEPS: { title: Bilingual; body: Bilingual }[] = [
  {
    title: { en: "Introduction", ko: "법안 발의" },
    body: {
      en: "Anyone can suggest an idea, but only a member of Congress can introduce a bill. Bills that raise taxes must start in the House.",
      ko: "누구나 아이디어를 제안할 수 있지만, 법안은 연방 의원만 발의할 수 있습니다. 세금을 올리는 법안은 반드시 하원에서 시작해야 합니다.",
    },
  },
  {
    title: { en: "Committee", ko: "위원회 심사" },
    body: {
      en: "A committee studies the bill, may hold hearings and rewrite it (a “markup”), then votes on whether to send it to the full chamber. Most bills stop here.",
      ko: "위원회가 법안을 검토하고 청문회를 열거나 내용을 수정(“마크업”)한 뒤, 본회의에 올릴지 표결합니다. 대부분의 법안은 이 단계에서 멈춥니다.",
    },
  },
  {
    title: { en: "Floor vote", ko: "본회의 표결" },
    body: {
      en: "The full chamber debates and votes. The House passes bills by simple majority. In the Senate, most bills first need 60 votes to end debate before the final vote.",
      ko: "본회의에서 토론하고 표결합니다. 하원은 단순 과반으로 법안을 통과시킵니다. 상원에서는 대부분의 법안이 최종 표결 전에 토론을 끝내기 위해 먼저 60표가 필요합니다.",
    },
  },
  {
    title: { en: "The other chamber", ko: "다른 원의 심사" },
    body: {
      en: "The other chamber must pass the exact same text, usually after its own committee review and floor vote.",
      ko: "다른 원도 보통 자체 위원회 심사와 본회의 표결을 거쳐 똑같은 문구의 법안을 통과시켜야 합니다.",
    },
  },
  {
    title: { en: "Resolving differences", ko: "차이 조정" },
    body: {
      en: "If the two versions differ, the chambers trade amendments or form a conference committee. Both must then approve one identical version.",
      ko: "두 원의 법안 내용이 다르면 수정안을 주고받거나 양원 협의회를 구성합니다. 그런 다음 양원 모두 같은 최종안을 승인해야 합니다.",
    },
  },
  {
    title: { en: "The President", ko: "대통령" },
    body: {
      en: "The President can sign the bill into law or veto it. An unsigned bill becomes law after 10 days (Sundays excepted) while Congress is in session; if Congress adjourns first, it dies — a “pocket veto.”",
      ko: "대통령은 법안에 서명해 법으로 만들거나 거부권을 행사할 수 있습니다. 의회 회기 중에는 서명하지 않아도 10일(일요일 제외)이 지나면 법이 됩니다. 그 전에 의회가 휴회하면 법안은 폐기되는데, 이를 “보류 거부권(pocket veto)”이라고 합니다.",
    },
  },
  {
    title: { en: "Veto override", ko: "거부권 무효화" },
    body: {
      en: "Congress can override a veto with a two-thirds vote in both the House and the Senate. The bill then becomes law without the President's signature.",
      ko: "하원과 상원이 각각 3분의 2 찬성으로 거부권을 무효화할 수 있습니다. 그러면 대통령의 서명 없이도 법안이 법이 됩니다.",
    },
  },
];

export const BRANCHES: { name: Bilingual; who: Bilingual; powers: Bilingual[] }[] = [
  {
    name: { en: "Legislative", ko: "입법부" },
    who: { en: "Congress: the Senate and the House", ko: "의회: 상원과 하원" },
    powers: [
      { en: "Writes and passes laws", ko: "법률을 만들고 통과시킴" },
      { en: "Controls federal spending and taxes", ko: "연방 예산과 세금을 결정함" },
      { en: "Declares war", ko: "전쟁을 선포함" },
      { en: "Senate confirms nominees and approves treaties", ko: "상원은 공직 지명자를 인준하고 조약을 비준함" },
    ],
  },
  {
    name: { en: "Executive", ko: "행정부" },
    who: { en: "The President, Vice President, Cabinet, and federal agencies", ko: "대통령, 부통령, 내각, 연방 기관" },
    powers: [
      { en: "Carries out and enforces laws", ko: "법률을 집행함" },
      { en: "Commands the armed forces", ko: "군 통수권을 가짐" },
      { en: "Conducts foreign policy and negotiates treaties", ko: "외교 정책을 수행하고 조약을 협상함" },
      { en: "Nominates judges and officials; can veto bills", ko: "판사와 공직자를 지명하고 법안에 거부권을 행사할 수 있음" },
    ],
  },
  {
    name: { en: "Judicial", ko: "사법부" },
    who: { en: "The Supreme Court and lower federal courts", ko: "연방대법원과 하급 연방법원" },
    powers: [
      { en: "Decides legal disputes", ko: "법적 분쟁을 판결함" },
      { en: "Interprets laws and the Constitution", ko: "법률과 헌법을 해석함" },
      {
        en: "Can strike down laws and actions that violate the Constitution",
        ko: "헌법에 어긋나는 법률과 조치를 무효화할 수 있음",
      },
    ],
  },
];

export const CHECKS: Bilingual[] = [
  { en: "The President can veto bills; Congress can override with a two-thirds vote.", ko: "대통령은 법안에 거부권을 행사할 수 있고, 의회는 3분의 2 찬성으로 이를 무효화할 수 있습니다." },
  { en: "The President nominates judges; the Senate decides whether to confirm them.", ko: "대통령이 판사를 지명하고, 상원이 인준 여부를 결정합니다." },
  { en: "Courts can rule laws unconstitutional; the Constitution itself can be amended.", ko: "법원은 법률을 위헌으로 판결할 수 있고, 헌법 자체는 개정될 수 있습니다." },
  { en: "The House can impeach, and the Senate can remove, a President or federal judge.", ko: "하원은 대통령이나 연방 판사를 탄핵 소추하고, 상원은 파면할 수 있습니다." },
];

export const GUIDES: Guide[] = [
  {
    slug: "how-a-bill-becomes-law",
    icon: "bill",
    title: { en: "How a bill becomes law", ko: "법안이 법이 되는 과정" },
    summary: {
      en: "The path from an idea to a federal law, step by step — and why most bills never make it.",
      ko: "아이디어가 연방 법률이 되기까지의 과정과, 대부분의 법안이 끝까지 가지 못하는 이유를 단계별로 알아봅니다.",
    },
    sections: [
      {
        heading: { en: "Why it's hard on purpose", ko: "일부러 어렵게 만든 이유" },
        paragraphs: [
          {
            en: "The Constitution requires both chambers of Congress to pass the same text and the President to sign it, or Congress to override a veto. Each step is a chance to change or stop a bill. Supporters of this design say it forces careful debate and broad agreement; critics say it makes it hard to respond to problems quickly.",
            ko: "헌법은 의회 양원이 같은 문구의 법안을 통과시키고 대통령이 서명하거나, 의회가 거부권을 무효화하도록 요구합니다. 각 단계마다 법안을 바꾸거나 멈출 기회가 있습니다. 이 구조를 지지하는 쪽은 신중한 토론과 폭넓은 합의를 이끈다고 보고, 비판하는 쪽은 문제에 빠르게 대응하기 어렵게 만든다고 봅니다.",
          },
        ],
      },
      {
        heading: { en: "After it becomes law", ko: "법이 된 이후" },
        paragraphs: [
          {
            en: "Federal agencies write regulations to carry out many laws, and people affected by a law can challenge it in court. Congress can also amend or repeal a law later through the same process.",
            ko: "연방 기관은 많은 법을 시행하기 위해 세부 규정을 만들고, 법의 영향을 받는 사람들은 법원에 이의를 제기할 수 있습니다. 의회는 같은 절차를 거쳐 나중에 법을 개정하거나 폐지할 수도 있습니다.",
          },
        ],
      },
    ],
  },
  {
    slug: "three-branches",
    icon: "branches",
    title: { en: "The three branches", ko: "삼권 분립" },
    summary: {
      en: "What Congress, the President, and the courts each do — and how they check one another.",
      ko: "의회, 대통령, 법원이 각각 무슨 일을 하고 서로를 어떻게 견제하는지 알아봅니다.",
    },
    sections: [
      {
        heading: { en: "Separation of powers", ko: "권력 분립" },
        paragraphs: [
          {
            en: "The Constitution splits federal power among three branches so that no single person or group holds all of it. Each branch has its own job, and each has ways to limit the others — a system called checks and balances.",
            ko: "헌법은 어느 한 사람이나 집단이 모든 권력을 갖지 못하도록 연방 권력을 세 부로 나눕니다. 각 부는 고유한 역할이 있고 서로를 제한할 수단도 갖는데, 이를 견제와 균형이라고 합니다.",
          },
          {
            en: "The courts' power to strike down unconstitutional laws, called judicial review, was established by the Supreme Court in Marbury v. Madison (1803).",
            ko: "위헌 법률을 무효화하는 법원의 권한, 즉 사법 심사권은 1803년 연방대법원의 마버리 대 매디슨(Marbury v. Madison) 판결로 확립되었습니다.",
          },
        ],
      },
      {
        heading: { en: "States have branches too", ko: "주 정부에도 삼권이 있습니다" },
        paragraphs: [
          {
            en: "Under federalism, power is also shared between the national government and the states. Each state has its own legislature, governor, and courts, which handle much of daily life — from schools to traffic laws.",
            ko: "연방제에서는 권력이 연방 정부와 주 정부 사이에도 나뉩니다. 각 주에는 자체 의회, 주지사, 법원이 있으며, 학교부터 교통법규까지 일상생활의 많은 부분을 다룹니다.",
          },
        ],
      },
    ],
  },
  {
    slug: "filibuster",
    icon: "filibuster",
    title: { en: "The filibuster", ko: "필리버스터" },
    summary: {
      en: "Why most bills need 60 votes in the Senate, the exceptions, and the debate over changing it.",
      ko: "상원에서 대부분의 법안에 60표가 필요한 이유, 예외, 그리고 이를 바꾸자는 논쟁을 알아봅니다.",
    },
    sections: [
      {
        heading: { en: "What it is", ko: "필리버스터란" },
        paragraphs: [
          {
            en: "In the Senate, debate on most measures continues until enough senators vote to end it. Using extended debate — or the threat of it — to delay or block a vote is called a filibuster. The House has no filibuster; its rules limit debate.",
            ko: "상원에서는 대부분의 안건에 대해 충분한 수의 상원의원이 토론 종결에 찬성할 때까지 토론이 계속됩니다. 토론을 길게 이어 가거나 그렇게 하겠다고 위협해 표결을 늦추거나 막는 것을 필리버스터라고 합니다. 하원에는 필리버스터가 없으며, 규칙으로 토론 시간을 제한합니다.",
          },
          {
            en: "Under Senate Rule XXII, ending debate on most legislation — a vote called cloture — takes three-fifths of senators: 60 votes when all 100 seats are filled. That threshold dates to 1975; before then it was two-thirds of senators voting. Today senators rarely need to speak for hours, so in practice most major bills need 60 votes to advance.",
            ko: "상원 규칙 22조에 따라 대부분의 법안에 대한 토론 종결(클로처, cloture) 표결에는 상원의원 5분의 3, 즉 100석이 모두 찬 경우 60표가 필요합니다. 이 기준은 1975년에 정해졌고, 그 전에는 출석 의원의 3분의 2였습니다. 오늘날에는 실제로 몇 시간씩 연설하는 경우가 드물어, 대부분의 주요 법안이 사실상 60표를 얻어야 진행됩니다.", // TODO(ko-review)
          },
        ],
      },
      {
        heading: { en: "Exceptions", ko: "예외" },
        paragraphs: [
          {
            en: "Some measures can pass with a simple majority. Budget reconciliation bills, created by the Congressional Budget Act of 1974, have limited debate. And since rule changes in 2013 and 2017, ending debate on presidential nominations — including Supreme Court justices — takes only a simple majority.",
            ko: "일부 안건은 단순 과반으로 통과될 수 있습니다. 1974년 의회예산법으로 만들어진 예산 조정(reconciliation) 법안은 토론 시간이 제한됩니다. 또 2013년과 2017년 규칙 변경 이후로는 연방대법관을 포함한 대통령 지명자에 대한 토론 종결에 단순 과반만 필요합니다.",
          },
        ],
      },
      {
        heading: { en: "The debate", ko: "찬반 논쟁" },
        paragraphs: [
          {
            en: "Supporters of keeping the filibuster say it pushes the parties toward compromise, protects the voice of the minority party, and prevents sharp swings in policy each time control of the Senate changes.",
            ko: "필리버스터 유지를 지지하는 쪽은 이 제도가 정당 간 타협을 이끌고, 소수당의 목소리를 보호하며, 상원 다수당이 바뀔 때마다 정책이 크게 흔들리는 것을 막는다고 주장합니다.",
          },
          {
            en: "Supporters of changing or ending it say it lets a minority block bills that most senators support, contributes to gridlock, and is used far more often than in the past. The rule is not in the Constitution, and the Senate can change it.",
            ko: "필리버스터를 바꾸거나 없애자는 쪽은 이 제도 때문에 소수가 다수 상원의원이 지지하는 법안을 막을 수 있고, 입법 교착이 심해지며, 과거보다 훨씬 자주 쓰인다고 주장합니다. 이 규칙은 헌법에 있는 것이 아니며, 상원이 바꿀 수 있습니다.",
          },
        ],
      },
    ],
  },
  {
    slug: "redistricting",
    icon: "redistricting",
    title: { en: "How redistricting works", ko: "선거구 재획정의 원리" },
    summary: {
      en: "How House seats are divided among states, who draws district lines, and what gerrymandering is.",
      ko: "하원 의석이 주별로 어떻게 배분되는지, 누가 선거구 경계를 정하는지, 게리맨더링이 무엇인지 알아봅니다.",
    },
    sections: [
      {
        heading: { en: "Seats follow the census", ko: "의석은 인구조사를 따릅니다" },
        paragraphs: [
          {
            en: "Every ten years, the census counts everyone in the country. The 435 House seats are then divided among the states by population — a process called apportionment — so some states gain seats and others lose them.",
            ko: "10년마다 인구조사로 전국의 인구를 셉니다. 그런 다음 하원 435석을 인구에 따라 주별로 나누는데, 이를 의석 배분(apportionment)이라고 합니다. 그 결과 의석이 늘어나는 주도, 줄어드는 주도 생깁니다.",
          },
          {
            en: "Each state then redraws its district lines. Districts must have nearly equal populations, a requirement the Supreme Court set out in the 1960s (Wesberry v. Sanders, 1964, for congressional districts). The Voting Rights Act of 1965 also bars maps that dilute the voting power of racial minority groups.",
            ko: "이후 각 주는 선거구 경계를 다시 긋습니다. 선거구마다 인구가 거의 같아야 하는데, 이는 1960년대 연방대법원 판결(연방 하원 선거구의 경우 1964년 Wesberry v. Sanders)로 정해진 원칙입니다. 1965년 투표권법(Voting Rights Act)은 인종적 소수 집단의 투표 영향력을 약화시키는 선거구도 금지합니다.",
          },
        ],
      },
      {
        heading: { en: "Who draws the lines", ko: "누가 경계를 긋나요" },
        paragraphs: [
          {
            en: "In most states, the state legislature draws the map, and the governor can usually veto it. Some states hand the job to independent or bipartisan commissions. Courts sometimes draw maps when lawmakers deadlock or a map is struck down.",
            ko: "대부분의 주에서는 주 의회가 선거구 지도를 만들고, 주지사가 보통 거부권을 행사할 수 있습니다. 일부 주는 독립적이거나 양당이 참여하는 위원회에 이 일을 맡깁니다. 의원들이 합의하지 못하거나 지도가 무효화되면 법원이 직접 지도를 그리기도 합니다.",
          },
        ],
      },
      {
        heading: { en: "Gerrymandering", ko: "게리맨더링" },
        paragraphs: [
          {
            en: "Gerrymandering means drawing lines to favor a party or group. Two common techniques are “packing” — concentrating a group's voters into a few districts — and “cracking” — spreading them thinly across many. Both major parties have drawn maps to their own advantage.",
            ko: "게리맨더링은 특정 정당이나 집단에 유리하게 선거구 경계를 긋는 것입니다. 흔한 방법으로는 한 집단의 유권자를 몇몇 선거구에 몰아넣는 “패킹(packing)”과 여러 선거구에 얇게 흩어 놓는 “크래킹(cracking)”이 있습니다. 양대 정당 모두 자신에게 유리한 지도를 그린 적이 있습니다.",
          },
          {
            en: "In Rucho v. Common Cause (2019), the Supreme Court ruled that federal courts cannot decide claims of partisan gerrymandering. State courts and state laws can still limit it. Supporters of legislature-drawn maps say elected officials are accountable to voters; supporters of independent commissions say lawmakers shouldn't draw their own districts.",
            ko: "2019년 Rucho v. Common Cause 판결에서 연방대법원은 정당 간 게리맨더링 문제를 연방 법원이 판단할 수 없다고 결정했습니다. 주 법원과 주 법률은 여전히 이를 제한할 수 있습니다. 의회가 지도를 그리는 방식을 지지하는 쪽은 선출직 공직자가 유권자에게 책임을 진다고 말하고, 독립 위원회를 지지하는 쪽은 의원이 자기 선거구를 직접 그려서는 안 된다고 말합니다.",
          },
        ],
      },
    ],
  },
];

// Example voters for the redistricting visual: 15 in Group A (columns 0-2) and
// 10 in Group B (columns 3-4). Each map assigns every cell to one of 5 districts.
export const VOTER_GROUPS = Array.from({ length: 25 }, (_, i) => ((i % 5) < 3 ? "A" : "B")) as ("A" | "B")[];

export const DISTRICT_MAPS: number[][] = [
  // Vertical strips: one district per column.
  Array.from({ length: 25 }, (_, i) => i % 5),
  // Horizontal strips: every district has 3 A and 2 B.
  Array.from({ length: 25 }, (_, i) => Math.floor(i / 5)),
  // Lines drawn so Group B wins three districts.
  [4, 4, 0, 0, 0, 4, 4, 0, 0, 1, 4, 1, 1, 1, 1, 3, 3, 3, 3, 2, 3, 2, 2, 2, 2],
];

export const MAP_DESCRIPTIONS: Bilingual[] = [
  {
    en: "Districts follow columns. Group A, with 60% of voters, wins 3 of 5 seats — close to its share.",
    ko: "선거구가 세로줄을 따릅니다. 유권자의 60%인 A 그룹이 5석 중 3석을 얻어, 득표 비율과 비슷합니다.",
  },
  {
    en: "Group B is “cracked” across every district. Group A wins all 5 seats.",
    ko: "B 그룹이 모든 선거구에 흩어져(“크래킹”) A 그룹이 5석을 모두 얻습니다.",
  },
  {
    en: "Group A is “packed” into two districts. Group B, with 40% of voters, wins 3 of 5 seats.",
    ko: "A 그룹이 두 선거구에 몰려(“패킹”) 유권자의 40%인 B 그룹이 5석 중 3석을 얻습니다.",
  },
];

export function districtWinners(map: number[]) {
  const tallies = Array.from({ length: 5 }, () => ({ A: 0, B: 0 }));
  map.forEach((district, cell) => tallies[district][VOTER_GROUPS[cell]]++);
  return tallies.map((t) => (t.A > t.B ? "A" : "B"));
}
