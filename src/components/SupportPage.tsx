"use client";

import { useState } from "react";
import { joinWaitlist } from "@/lib/client";
import { ErrorMessage } from "./AskForm";
import { useCivica } from "./CivicaProvider";
import { Button, Collapse, Reveal, Stagger, StaggerItem } from "./motion";
import { cardClass, Eyebrow, inputClass, PageIntro } from "./ui";

// Set NEXT_PUBLIC_KOFI_URL (e.g. https://ko-fi.com/yourname) in Vercel to
// show the donate button. Only Ko-fi and Buy Me a Coffee links are used.
function donationUrl() {
  const url = process.env.NEXT_PUBLIC_KOFI_URL;
  if (!url) return null;
  try {
    const { protocol, hostname } = new URL(url);
    const allowed = ["ko-fi.com", "www.ko-fi.com", "buymeacoffee.com", "www.buymeacoffee.com"];
    return protocol === "https:" && allowed.includes(hostname) ? url : null;
  } catch {
    return null;
  }
}

function Donate() {
  const { t } = useCivica();
  const url = donationUrl();
  return (
    <section className={`${cardClass} space-y-4`}>
      <h2 className="font-serif text-2xl font-semibold">{t.donateTitle}</h2>
      <p>{t.donateBody}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          {t.donateButton} <span aria-hidden>↗</span>
        </a>
      ) : (
        <p className="text-muted">{t.donateSoon}</p>
      )}
      <p className="border-t border-line pt-4 text-sm text-muted">{t.donateNeutral}</p>
    </section>
  );
}

function Waitlist() {
  const { t, language } = useCivica();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "joining" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(t.waitlistInvalid);
    setError(null);
    setState("joining");
    try {
      await joinWaitlist(email.trim(), language, t);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="rounded-r-md border-l-2 border-accent bg-accent-soft px-3 py-2">
        {t.waitlistDone}
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="waitlist-email" className="block font-semibold">
        {t.waitlistLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.waitlistPlaceholder}
          maxLength={254}
          disabled={state === "joining"}
          className={`${inputClass} sm:max-w-sm`}
        />
        <Button type="submit" disabled={state === "joining"}>
          {state === "joining" ? t.waitlistJoining : t.waitlistButton}
        </Button>
      </div>
      <ErrorMessage message={error} />
      <Collapse show={!error}>
        <p className="text-sm text-muted">{t.waitlistPrivacy}</p>
      </Collapse>
    </form>
  );
}

export function SupportPage() {
  const { t } = useCivica();
  return (
    <div className="space-y-10">
      <PageIntro title={t.supportTitle} intro={t.supportIntro} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Reveal delay={0.05}>
          <Donate />
        </Reveal>
        <section className="space-y-5">
          <div className="space-y-2">
            <Eyebrow>{t.premiumBadge}</Eyebrow>
            <h2 className="font-serif text-2xl font-semibold">{t.premiumTitle}</h2>
            <p className="text-muted">{t.premiumIntro}</p>
          </div>
          <Stagger as="ol" className="divide-y divide-line border-y border-line">
            {t.premiumFeatures.map((feature, i) => (
              <StaggerItem as="li" key={feature.title} className="grid grid-cols-[2rem_1fr] gap-2 py-3">
                <span className="font-serif text-sm font-semibold text-accent">0{i + 1}</span>
                <span>
                  <span className="block font-semibold">{feature.title}</span>
                  <span className="block text-sm text-muted">{feature.body}</span>
                </span>
              </StaggerItem>
            ))}
          </Stagger>
          <Waitlist />
        </section>
      </div>
    </div>
  );
}
