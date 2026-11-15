import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublishedView } from "@/components/PublishedView";
import { getPage } from "@/lib/publicPages";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const page = await getPage(slug);
  if (!page) return { title: "Not found" };
  return {
    title: page.briefing.title,
    description: page.briefing.summary,
    openGraph: { title: `${page.briefing.title} · Civica`, description: page.briefing.summary, type: "article" },
  };
}

async function PublishedPageContent({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  return <PublishedView page={page} />;
}

export default function Page(props: Props) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-lg bg-surface" />}>
      <PublishedPageContent params={props.params} />
    </Suspense>
  );
}
