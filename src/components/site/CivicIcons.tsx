export type CivicIconName = "bill" | "branches" | "filibuster" | "redistricting" | "glossary" | "reps" | "vote" | "explain";

const PATHS: Record<CivicIconName, React.ReactNode> = {
  bill: (
    <>
      <path d="M8 3h11l5 5v21H8z" />
      <path d="M19 3v5h5M12 14h8M12 18h8M12 22h5" />
      <path d="m18 23 2 2 4-4" />
    </>
  ),
  branches: (
    <>
      <path d="M4 12 16 5l12 7M5 27h22M7 12v12M13 12v12M19 12v12M25 12v12M4 12h24" />
    </>
  ),
  filibuster: (
    <>
      <path d="M10 4h12M10 28h12M11 4c0 7 10 7 10 12s-10 5-10 12M21 4c0 7-10 7-10 12s10 5 10 12" />
      <path d="M13 25h6" />
    </>
  ),
  redistricting: (
    <>
      <rect x="4" y="4" width="24" height="24" rx="2" />
      <path d="M4 13h9v15M13 13l5-9M18 4v13h10M13 21h15" />
    </>
  ),
  glossary: (
    <>
      <path d="M16 8c-3-2-7-3-12-3v20c5 0 9 1 12 3 3-2 7-3 12-3V5c-5 0-9 1-12 3zM16 8v20" />
    </>
  ),
  reps: (
    <>
      <circle cx="11" cy="10" r="4" />
      <circle cx="22" cy="11" r="3.5" />
      <path d="M3 26c0-5 4-8 8-8s8 3 8 8M17 20c1.5-1.3 3.2-2 5-2 4 0 7 3 7 8" />
    </>
  ),
  vote: (
    <>
      <path d="M5 16h22v12H5zM9 16V5h12l3 3v8" />
      <path d="m12 11 2.5 2.5L19 9M11 22h10" />
    </>
  ),
  explain: (
    <>
      <path d="M5 6h22v15H14l-6 5v-5H5z" />
      <path d="M13.5 11a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7M16 18.2v.1" />
    </>
  ),
};

export function CivicIcon({ name, className }: { name: CivicIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
