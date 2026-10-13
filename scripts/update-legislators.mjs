// Refreshes src/data/legislators.json from the public-domain congress-legislators
// dataset and records which members have an official photo in unitedstates/images.
//
//   npm run update:legislators
//
// Run it whenever Congress changes (new members, resignations, special elections),
// then commit the updated JSON file.
import { writeFile } from "node:fs/promises";

const DATA_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/gh-pages/legislators-current.json";
const PHOTO_CHECK_URL = (id) =>
  `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${id}.jpg`;
const OUT_FILE = new URL("../src/data/legislators.json", import.meta.url);
const DAY_MS = 24 * 60 * 60 * 1000;

// Start of the member's current, unbroken run of terms in the same chamber.
function continuousServiceStart(terms) {
  let index = terms.length - 1;
  const type = terms[index].type;
  while (index > 0) {
    const previous = terms[index - 1];
    const gap = new Date(terms[index].start) - new Date(previous.end);
    if (previous.type !== type || gap > 45 * DAY_MS) break;
    index--;
  }
  return terms[index].start;
}

async function hasPhoto(id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(PHOTO_CHECK_URL(id), { method: "HEAD" });
      if (response.status === 200) return true;
      if (response.status === 404) return false;
    } catch {
      // Retry on network errors.
    }
  }
  throw new Error(`Could not check photo for ${id}`);
}

async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

const response = await fetch(DATA_URL);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
const raw = await response.json();

const members = raw
  .map((person) => {
    const term = person.terms.at(-1);
    const name = person.name.official_full ?? [person.name.first, person.name.last].filter(Boolean).join(" ");
    return {
      id: person.id.bioguide,
      name,
      sortName: `${person.name.last}, ${person.name.first}`,
      party: term.party,
      chamber: term.type === "sen" ? "senate" : "house",
      state: term.state,
      district: term.type === "rep" ? term.district : null,
      since: continuousServiceStart(person.terms).slice(0, 4),
      phone: term.phone ?? null,
      website: term.url ?? null,
      contactForm: term.contact_form ?? null,
    };
  })
  .sort((a, b) => a.sortName.localeCompare(b.sortName));
members.forEach((m) => delete m.sortName);

const photos = await mapWithLimit(members, 16, (m) => hasPhoto(m.id));
members.forEach((m, i) => (m.photo = photos[i]));

const output = {
  source: "https://github.com/unitedstates/congress-legislators",
  downloaded: new Date().toISOString().slice(0, 10),
  members,
};
await writeFile(OUT_FILE, `${JSON.stringify(output, null, 1)}\n`);

const count = (chamber) => members.filter((m) => m.chamber === chamber).length;
console.log(
  `Saved ${members.length} members (${count("senate")} senators, ${count("house")} House), ` +
    `${photos.filter(Boolean).length} with photos.`,
);
