import { BILL_STAGES, type Bill, type BillStage } from "./schemas";

// Followed bills live only in the reader's browser (localStorage): no
// accounts, nothing stored by Civica.

export type FollowedBill = {
  key: string;
  bill: Bill;
  followedAt: string;
  checkedAt: string;
  // Set when a check found something new, until the reader opens it.
  update: { from: BillStage; to: BillStage; previousAction: string } | null;
};

const STORAGE_KEY = "civica.bills.v1";
export const MAX_FOLLOWED = 25;

export function billKey(bill: Pick<Bill, "jurisdiction" | "number" | "session">) {
  return [bill.jurisdiction, bill.number, bill.session].map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "")).join("|");
}

// The words used to look the bill up again when checking for updates.
export function billQuery(bill: Bill) {
  return `${bill.number} (${bill.jurisdiction}, ${bill.session})${bill.nickname ? `, ${bill.nickname}` : ""}`;
}

// What moved between two checks of the same bill, or null if nothing did.
export function detectUpdate(previous: Bill, next: Bill): FollowedBill["update"] {
  const moved =
    previous.stage !== next.stage ||
    (next.last_action_date !== "" && next.last_action_date !== previous.last_action_date) ||
    (next.last_action_date === "" && next.last_action.trim() !== previous.last_action.trim());
  return moved ? { from: previous.stage, to: next.stage, previousAction: previous.last_action } : null;
}

// Where a stage sits on the Introduced → Law track (failed and vetoed end it).
export const TRACK: BillStage[] = ["introduced", "committee", "passed_one_chamber", "passed_both", "to_executive", "enacted"];

export function trackPosition(stage: BillStage) {
  if (stage === "vetoed") return TRACK.indexOf("to_executive");
  const index = TRACK.indexOf(stage);
  return index;
}

export function readFollowed(): FollowedBill[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FollowedBill =>
        item && typeof item.key === "string" && item.bill && (BILL_STAGES as readonly string[]).includes(item.bill.stage),
    );
  } catch {
    return [];
  }
}

export function writeFollowed(bills: FollowedBill[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bills.slice(0, MAX_FOLLOWED)));
  } catch {
    // Storage can be unavailable (private mode); following then lasts for this visit only.
  }
}
