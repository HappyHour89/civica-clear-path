import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FindMyReps } from "@/components/reps/FindMyReps";
import type { MemberLabels } from "@/components/reps/MemberCard";
import { MemberBrowser } from "@/components/reps/MemberBrowser";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { DICTIONARIES, fmt, isLanguage } from "@/lib/i18n";
import { DATA_DOWNLOADED, MEMBERS } from "@/lib/legislators";

export async function generateMetadata({ params }: PageProps<"/[lang]/representatives">): Promise<Metadata> {
  const { lang } = await params;
  return isLanguage(lang) ? { title: DICTIONARIES[lang].reps.title } : {};
}

export default async function RepresentativesPage({ params }: PageProps<"/[lang]/representatives">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = DICTIONARIES[lang];
  const labels: MemberLabels = { ...t.reps, call: t.call, website: t.website, contact: t.contact };
  const updated = new Date(`${DATA_DOWNLOADED}T12:00:00Z`).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <PageHeader eyebrow={t.nav.representatives} title={t.reps.title} intro={t.reps.intro}>
        <p className="text-sm text-muted">
          {fmt(t.reps.dataUpdated, { date: updated })} · {t.reps.dataSource}
        </p>
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6">
        <Reveal>
          {/* Reading ?state= from the URL happens in the browser, so this part renders after load. */}
          <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl border border-line bg-surface" />}>
            <FindMyReps members={MEMBERS} t={labels} />
          </Suspense>
        </Reveal>
        <MemberBrowser members={MEMBERS} t={labels} />
      </div>
    </>
  );
}
