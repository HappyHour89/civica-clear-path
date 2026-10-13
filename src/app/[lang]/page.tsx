import Link from "next/link";
import { notFound } from "next/navigation";
import { ElectionStrip } from "@/components/home/ElectionStrip";
import { HomeHero } from "@/components/home/HomeHero";
import { ViewpointsDemo } from "@/components/home/ViewpointsDemo";
import { CivicIcon, type CivicIconName } from "@/components/site/CivicIcons";
import { CivicaMark } from "@/components/site/CivicaLogo";
import { Reveal, RevealGroup, RevealItem } from "@/components/site/Reveal";
import { DICTIONARIES, isLanguage } from "@/lib/i18n";

const SECTIONS: { key: "explain" | "representatives" | "vote" | "learn" | "about"; icon: CivicIconName | null }[] = [
  { key: "explain", icon: "explain" },
  { key: "representatives", icon: "reps" },
  { key: "vote", icon: "vote" },
  { key: "learn", icon: "glossary" },
  { key: "about", icon: null },
];

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();
  const t = DICTIONARIES[lang];
  const h = t.home;

  return (
    <>
      <HomeHero lang={lang} t={{ home: h, topics: t.topics, tagline: t.tagline }} />

      <div className="px-4 sm:px-6">
        <ElectionStrip lang={lang} t={h} />
      </div>

      <section className="mx-auto mt-24 grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <Reveal>
            <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{h.howTitle}</h2>
          </Reveal>
          <RevealGroup className="mt-8 space-y-6" stagger={0.12}>
            {h.steps.map((step, i) => (
              <RevealItem key={step.title} className="flex gap-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-brand font-serif text-lg font-semibold text-brand">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-serif text-xl font-semibold">{step.title}</h3>
                  <p className="mt-1 text-muted">{step.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
        <ViewpointsDemo t={h} />
      </section>

      <section className="mt-24 bg-brand text-brand-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
          <Reveal className="space-y-5">
            <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{h.neutralityTitle}</h2>
            <p className="text-lg text-brand-soft">{h.neutralityBody}</p>
          </Reveal>
          <RevealGroup className="grid gap-4" stagger={0.12}>
            {h.principles.map((principle) => (
              <RevealItem key={principle.title} className="rounded-2xl border border-white/20 bg-white/5 p-5">
                <h3 className="font-serif text-xl font-semibold">{principle.title}</h3>
                <p className="mt-1 text-brand-soft">{principle.body}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{h.sectionsTitle}</h2>
        </Reveal>
        <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6" stagger={0.07}>
          {SECTIONS.map(({ key, icon }, index) => (
            <RevealItem key={key} className={index < 2 ? "lg:col-span-3" : "lg:col-span-2"}>
              <Link
                href={`/${lang}/${key}`}
                className="group flex h-full flex-col gap-4 rounded-3xl border border-line bg-surface p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-[0_24px_50px_-36px_rgba(15,92,82,0.8)]"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-brand-ink">
                  {icon ? <CivicIcon name={icon} className="size-7" /> : <CivicaMark size={30} animate={false} />}
                </span>
                <span className="font-serif text-2xl font-semibold">{t.nav[key]}</span>
                <span className="flex-1 text-muted">{h.sections[key]}</span>
                <span aria-hidden className="text-brand transition-transform group-hover:translate-x-1.5">
                  →
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <Reveal className="flex flex-col items-start gap-6 rounded-[2rem] border border-line bg-accent-soft px-8 py-12 md:flex-row md:items-center md:justify-between md:px-12">
          <div className="max-w-xl space-y-2">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">{h.finalTitle}</h2>
            <p className="text-lg text-accent-ink">{h.finalBody}</p>
          </div>
          <Link
            href={`/${lang}/explain`}
            className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-lg font-semibold text-brand-ink transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-brand-strong"
          >
            {h.ctaAsk}
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </Reveal>
      </section>
    </>
  );
}
