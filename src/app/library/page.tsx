import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryView } from "@/components/PublishedView";
import { listLibrary } from "@/lib/publicPages";

export const metadata: Metadata = { title: "Library" };

async function Library() {
  return <LibraryView entries={await listLibrary()} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-surface" />}>
      <Library />
    </Suspense>
  );
}
