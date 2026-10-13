import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CivicIcon, type CivicIconName } from "@/components/site/CivicIcons";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/Reveal";
import { Countdown } from "@/components/vote/Countdown";
import { StateVotingInfo } from "@/components/vote/StateVotingInfo";
import { DICTIONARIES, isLanguage } from "@/lib/i18n";
import { VOTE_LINKS } from "@/lib/vote";

const ACTION_ICONS: Record<string, CivicIconName> = { check: "bill", register: "vote", polling: "reps", mail: "glossary" };

export async function generateMetadata({ params }: PageProps<"/[lang]/vote">): Promise<Metadata> {
  const { lang } = await params;
  return isLanguage(lang) ? { title: DICTIONARIES[lang].vote.title } : {};
}

export default async function VotePage({ params }: PageProps<"/[lang]/vote">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = DICTIONARIES[lang].vote;

  return (
    <>
      <PageHeader eyebrow={DICTIONARIES[lang].nav.vote} title={t.title} intro={t.intro} />
      <div className="mx-auto max-w-6xl space-y-16 px-4 sm:px-6">
        <Reveal>
          <Countdown t={t} />
        </Reveal>

        <section className="space-y-6">
          <Reveal>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">{t.actionsTitle}</h2>
          </Reveal>
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
            {t.actions.map((action) => (
              <RevealItem key={action.key}>
                <a
                  href={VOTE_LINKS[action.key as keyof typeof VOTE_LINKS]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col gap-3 rounded-3xl border border-line bg-surface p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[0_24px_50px_-36px_rgba(15,92,82,0.8)]"
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-ink">
                    <CivicIcon name={ACTION_ICONS[action.key]} className="size-7" />
                  </span>
                  <span className="font-serif text-xl font-semibold">{action.title}</span>
                  <span className="flex-1 text-muted">{action.body}</span>
                  <span className="flex items-center justify-between text-sm font-semibold text-brand">
                    {action.source}
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">
                      ↗
                    </span>
                  </span>
                </a>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <Reveal>
          <StateVotingInfo t={t} />
        </Reveal>

        <section className="space-y-6">
          <Reveal className="max-w-2xl space-y-2">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">{t.ballotTitle}</h2>
            <p className="text-muted">{t.ballotIntro}</p>
          </Reveal>
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {t.ballot.map((item, i) => (
              <RevealItem key={item.title} className="rounded-2xl border border-line bg-surface p-5">
                <span className="font-serif text-sm font-semibold text-accent-ink">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 font-serif text-xl font-semibold">{item.title}</h3>
                <p className="mt-1 text-muted">{item.body}</p>
              </RevealItem>
            ))}
          </RevealGroup>
          <Reveal>
            <p className="text-muted">{t.sampleBallot}</p>
          </Reveal>
        </section>

        <Reveal>
          <p className="rounded-2xl border-l-4 border-brand bg-brand-soft px-5 py-4 font-medium text-brand-strong">
            {t.neutrality}
          </p>
        </Reveal>
      </div>
    </>
  );
}
