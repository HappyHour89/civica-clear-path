import data from "@/data/legislators.json";

export type Member = {
  id: string;
  name: string;
  party: string;
  chamber: "senate" | "house";
  state: string;
  district: number | null;
  since: string;
  phone: string | null;
  website: string | null;
  contactForm: string | null;
  photo: boolean;
};

export const MEMBERS = data.members as Member[];
export const DATA_DOWNLOADED = data.downloaded;
export const PARTIES = [...new Set(MEMBERS.map((m) => m.party))].sort();

// Jurisdictions without senators, represented in the House by a non-voting delegate.
export const NON_STATES = new Set(["DC", "PR", "GU", "VI", "AS", "MP"]);

export function photoUrl(id: string) {
  return `https://unitedstates.github.io/images/congress/225x275/${id}.jpg`;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function filterMembers(
  members: Member[],
  filters: { chamber?: Member["chamber"]; state?: string; party?: string; query?: string },
) {
  const query = normalize(filters.query?.trim() ?? "");
  return members.filter(
    (m) =>
      (!filters.chamber || m.chamber === filters.chamber) &&
      (!filters.state || m.state === filters.state) &&
      (!filters.party || m.party === filters.party) &&
      (!query || normalize(m.name).includes(query)),
  );
}

export function delegation(members: Member[], state: string) {
  return {
    senators: members.filter((m) => m.chamber === "senate" && m.state === state),
    house: members
      .filter((m) => m.chamber === "house" && m.state === state)
      .sort((a, b) => (a.district ?? 0) - (b.district ?? 0)),
  };
}
