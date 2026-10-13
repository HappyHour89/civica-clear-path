// Bilingual glossary. Lines marked TODO(ko-review) need a native speaker's check.
import type { Bilingual } from "./learn";

export type GlossaryEntry = { term: Bilingual; definition: Bilingual };

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: { en: "Amendment", ko: "수정안 / 개정" },
    definition: {
      en: "A change to a bill, law, or the Constitution. The U.S. Constitution has 27 amendments.",
      ko: "법안, 법률, 헌법을 고치는 것. 미국 헌법에는 27개의 수정 조항이 있습니다.",
    },
  },
  {
    term: { en: "Appropriations", ko: "세출 예산" },
    definition: {
      en: "Laws that set how much money federal agencies and programs can spend.",
      ko: "연방 기관과 프로그램이 쓸 수 있는 금액을 정하는 법률.",
    },
  },
  {
    term: { en: "Ballot measure", ko: "주민 투표 안건" },
    definition: {
      en: "A proposed law or constitutional change that voters decide directly, in states that allow it.",
      ko: "이를 허용하는 주에서 유권자가 직접 결정하는 법률안이나 헌법 개정안.",
    },
  },
  {
    term: { en: "Bicameral", ko: "양원제" },
    definition: {
      en: "Having two legislative chambers. Congress is bicameral: the Senate and the House.",
      ko: "입법부가 두 개의 원으로 이루어진 것. 미국 의회는 상원과 하원으로 된 양원제입니다.",
    },
  },
  {
    term: { en: "Bill", ko: "법안" },
    definition: {
      en: "A proposed law introduced in Congress or a state legislature.",
      ko: "연방 의회나 주 의회에 제출된 법률 제안.",
    },
  },
  {
    term: { en: "Cabinet", ko: "내각" },
    definition: {
      en: "The heads of the major executive departments, who advise the President.",
      ko: "대통령에게 조언하는 주요 행정 부처의 장들.",
    },
  },
  {
    term: { en: "Caucus", ko: "코커스 / 당원 모임" },
    definition: {
      en: "A meeting of party members, or a group of lawmakers who share an interest. Some states also use caucuses to choose presidential nominees.",
      ko: "정당 구성원의 모임, 또는 같은 관심사를 가진 의원들의 모임. 일부 주는 대통령 후보를 뽑을 때도 코커스를 엽니다.",
    },
  },
  {
    term: { en: "Checks and balances", ko: "견제와 균형" },
    definition: {
      en: "The ways each branch of government can limit the power of the others.",
      ko: "정부의 각 부가 다른 부의 권력을 제한할 수 있는 장치.",
    },
  },
  {
    term: { en: "Cloture", ko: "토론 종결 (클로처)" },
    definition: {
      en: "A Senate vote to end debate. For most legislation it takes three-fifths of senators, usually 60.",
      ko: "토론을 끝내기 위한 상원 표결. 대부분의 법안은 상원의원 5분의 3, 보통 60명의 찬성이 필요합니다.",
    },
  },
  {
    term: { en: "Committee", ko: "위원회" },
    definition: {
      en: "A small group of lawmakers that studies bills on a subject, holds hearings, and decides which bills move forward.",
      ko: "특정 분야의 법안을 검토하고 청문회를 열며 어떤 법안을 진행시킬지 정하는 소규모 의원 집단.",
    },
  },
  {
    term: { en: "Constituent", ko: "지역구 주민 / 유권자" },
    definition: {
      en: "A person an elected official represents.",
      ko: "선출직 공직자가 대표하는 사람.",
    },
  },
  {
    term: { en: "Due process", ko: "적법 절차" },
    definition: {
      en: "The constitutional guarantee that the government must follow fair procedures before taking away a person's life, liberty, or property.",
      ko: "정부가 개인의 생명, 자유, 재산을 빼앗기 전에 공정한 절차를 따라야 한다는 헌법상 보장.",
    },
  },
  {
    term: { en: "Electoral College", ko: "선거인단" },
    definition: {
      en: "The system that formally elects the President. Each state gets electors equal to its number of senators and representatives; D.C. gets three.",
      ko: "대통령을 공식적으로 선출하는 제도. 각 주는 상원의원과 하원의원 수를 합한 만큼의 선거인을 갖고, 워싱턴 D.C.는 3명을 갖습니다.",
    },
  },
  {
    term: { en: "Executive order", ko: "행정명령" },
    definition: {
      en: "A directive from the President to federal agencies on how to carry out the law. It cannot override laws passed by Congress.",
      ko: "법 집행 방식에 대해 대통령이 연방 기관에 내리는 지시. 의회가 통과시킨 법률을 무시할 수는 없습니다.",
    },
  },
  {
    term: { en: "Federalism", ko: "연방제" },
    definition: {
      en: "The sharing of power between the national government and the states.",
      ko: "권력을 연방 정부와 주 정부가 나누어 갖는 체제.",
    },
  },
  {
    term: { en: "Filibuster", ko: "필리버스터" },
    definition: {
      en: "Extended debate in the Senate used to delay or block a vote.",
      ko: "표결을 늦추거나 막기 위해 상원에서 토론을 길게 이어 가는 것.",
    },
  },
  {
    term: { en: "Gerrymandering", ko: "게리맨더링" },
    definition: {
      en: "Drawing district lines to give one party or group an advantage.",
      ko: "특정 정당이나 집단에 유리하도록 선거구 경계를 긋는 것.",
    },
  },
  {
    term: { en: "Impeachment", ko: "탄핵" },
    definition: {
      en: "The House formally charging a federal official with wrongdoing. If the Senate convicts by a two-thirds vote, the official is removed from office.",
      ko: "하원이 연방 공직자를 공식적으로 소추하는 것. 상원이 3분의 2 찬성으로 유죄를 결정하면 공직에서 파면됩니다.",
    },
  },
  {
    term: { en: "Incumbent", ko: "현직자" },
    definition: {
      en: "The person who currently holds an office.",
      ko: "현재 그 직책을 맡고 있는 사람.",
    },
  },
  {
    term: { en: "Judicial review", ko: "사법 심사" },
    definition: {
      en: "The power of courts to strike down laws or government actions that violate the Constitution.",
      ko: "헌법에 어긋나는 법률이나 정부 조치를 법원이 무효화할 수 있는 권한.",
    },
  },
  {
    term: { en: "Lobbying", ko: "로비 활동" },
    definition: {
      en: "Trying to influence lawmakers or officials on behalf of a group, company, or cause.",
      ko: "단체, 기업, 대의를 대신해 의원이나 공직자에게 영향을 주려는 활동.",
    },
  },
  {
    term: { en: "Majority leader", ko: "다수당 원내대표" },
    definition: {
      en: "The leader of the party with the most seats in a chamber, who largely controls which bills come up for a vote.",
      ko: "한 원에서 가장 많은 의석을 가진 정당의 대표로, 어떤 법안을 표결에 부칠지 대부분 결정합니다.",
    },
  },
  {
    term: { en: "Midterm election", ko: "중간선거" },
    definition: {
      en: "A federal election held halfway through a President's four-year term, when all House seats and about a third of Senate seats are on the ballot.",
      ko: "대통령 4년 임기의 중간에 치르는 연방 선거로, 하원 전 의석과 상원 의석의 약 3분의 1을 선출합니다.",
    },
  },
  {
    term: { en: "Pocket veto", ko: "보류 거부권" },
    definition: {
      en: "When a bill dies because the President doesn't sign it and Congress adjourns within 10 days.",
      ko: "대통령이 서명하지 않은 상태에서 10일 안에 의회가 휴회해 법안이 폐기되는 것.",
    },
  },
  {
    term: { en: "Precedent", ko: "판례 / 선례" },
    definition: {
      en: "An earlier court decision that guides how later, similar cases are decided.",
      ko: "이후 비슷한 사건을 판단할 때 기준이 되는 이전 법원 판결.",
    },
  },
  {
    term: { en: "Primary election", ko: "예비선거" },
    definition: {
      en: "An election in which voters choose a party's candidates for the general election.",
      ko: "본선거에 나갈 정당 후보를 유권자가 뽑는 선거.",
    },
  },
  {
    term: { en: "Quorum", ko: "의사 정족수" },
    definition: {
      en: "The minimum number of members who must be present for a body to conduct business.",
      ko: "회의를 진행하기 위해 출석해야 하는 최소 인원.",
    },
  },
  {
    term: { en: "Ratify", ko: "비준하다" },
    definition: {
      en: "To formally approve, as when states ratify a constitutional amendment or the Senate approves a treaty.",
      ko: "공식적으로 승인하는 것. 예: 주들이 헌법 수정안을 비준하거나 상원이 조약을 승인하는 경우.",
    },
  },
  {
    term: { en: "Reapportionment", ko: "의석 재배분" },
    definition: {
      en: "Redividing the 435 House seats among the states after each census.",
      ko: "인구조사 이후 하원 435석을 주별로 다시 나누는 것.",
    },
  },
  {
    term: { en: "Reconciliation", ko: "예산 조정 절차" },
    definition: {
      en: "A budget process that lets certain tax and spending bills pass the Senate with a simple majority and limited debate.",
      ko: "특정 세금·지출 법안을 단순 과반과 제한된 토론으로 상원에서 통과시킬 수 있게 하는 예산 절차.",
    },
  },
  {
    term: { en: "Redistricting", ko: "선거구 재획정" },
    definition: {
      en: "Redrawing the boundaries of election districts, usually after each census.",
      ko: "보통 인구조사 이후 선거구 경계를 다시 긋는 것.",
    },
  },
  {
    term: { en: "Separation of powers", ko: "권력 분립" },
    definition: {
      en: "Dividing government power among legislative, executive, and judicial branches.",
      ko: "정부 권력을 입법부, 행정부, 사법부로 나누는 것.",
    },
  },
  {
    term: { en: "Speaker of the House", ko: "하원의장" },
    definition: {
      en: "The presiding officer of the House, elected by its members, who controls much of the House agenda.",
      ko: "하원의원들이 선출하는 하원의 의장으로, 하원 의사일정의 상당 부분을 결정합니다.",
    },
  },
  {
    term: { en: "Supermajority", ko: "가중 다수" },
    definition: {
      en: "A threshold higher than a simple majority, such as three-fifths or two-thirds.",
      ko: "5분의 3이나 3분의 2처럼 단순 과반보다 높은 의결 기준.", // TODO(ko-review)
    },
  },
  {
    term: { en: "Veto", ko: "거부권" },
    definition: {
      en: "The President's (or a governor's) power to reject a bill passed by the legislature.",
      ko: "의회가 통과시킨 법안을 대통령(또는 주지사)이 거부할 수 있는 권한.",
    },
  },
  {
    term: { en: "Whip", ko: "원내 총무 (휩)" },
    definition: {
      en: "A party leader who counts votes and encourages members to vote with the party.",
      ko: "표를 세고 소속 의원들이 당과 같은 방향으로 투표하도록 독려하는 정당 지도부.", // TODO(ko-review)
    },
  },
];
