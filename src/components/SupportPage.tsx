"use client";

import { useState, useSyncExternalStore } from "react";
import { joinWaitlist, startCheckout } from "@/lib/client";
import { ErrorMessage } from "./AskForm";
import { useCivica } from "./CivicaProvider";
import { Button, Collapse, Reveal, Stagger, StaggerItem } from "./motion";
import { cardClass, Eyebrow, ExternalLink, inputClass, PageIntro } from "./ui";

export type DonationSettings = { enabled: boolean; testMode: boolean; portalUrl: string | null };

const MONTHLY_AMOUNTS = [5, 10, 25] as const;

const noSubscribe = () => () => {};
const returnedFromCheckout = () => new URLSearchParams(window.location.search).get("thanks") === "1";

// Choice chips that read as a single-select group to screen readers.
function Choice(props: { pressed: boolean; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="chip"
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onClick={props.onClick}
      className={`px-4 py-2 font-medium ${props.pressed ? "border-accent! bg-accent-soft! text-accent!" : ""}`}
    >
      {props.children}
    </Button>
  );
}

function Donate({ settings }: { settings: DonationSettings }) {
  const { t, language } = useCivica();
  const [plan, setPlan] = useState<"once" | "monthly">("once");
  const [amount, setAmount] = useState<(typeof MONTHLY_AMOUNTS)[number]>(10);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stripe sends donors back to /support?thanks=1. Read on the client only.
  const thanks = useSyncExternalStore(noSubscribe, returnedFromCheckout, () => false);

  async function donate() {
    setError(null);
    setRedirecting(true);
    try {
      window.location.assign(await startCheckout(plan === "once" ? { plan } : { plan, amount }, t, language));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
      setRedirecting(false);
    }
  }

  return (
    <section className={`${cardClass} space-y-5`}>
      <h2 className="font-serif text-2xl font-semibold">{t.donateTitle}</h2>
      {thanks && (
        <p role="status" className="rounded-r-md border-l-2 border-accent bg-accent-soft px-3 py-2">
          {t.donateThanks}
        </p>
      )}
      <p>{t.donateBody}</p>
      {settings.enabled ? (
        <div className="space-y-4">
          <div role="group" aria-label={t.donateFrequency} className="flex flex-wrap gap-2">
            <Choice pressed={plan === "once"} disabled={redirecting} onClick={() => setPlan("once")}>
              {t.donateOnce}
            </Choice>
            <Choice pressed={plan === "monthly"} disabled={redirecting} onClick={() => setPlan("monthly")}>
              {t.donateMonthly}
            </Choice>
          </div>
          <Collapse show={plan === "monthly"}>
            <div role="group" aria-label={t.donateAmountLabel} className="space-y-2">
              <p className="text-sm font-semibold">{t.donateAmountLabel}</p>
              <div className="flex flex-wrap gap-2">
                {MONTHLY_AMOUNTS.map((dollars) => (
                  <Choice key={dollars} pressed={amount === dollars} disabled={redirecting} onClick={() => setAmount(dollars)}>
                    ${dollars}
                  </Choice>
                ))}
              </div>
            </div>
          </Collapse>
          <Collapse show={plan === "once"}>
            <p className="text-sm text-muted">{t.donateOnceHint}</p>
          </Collapse>
          <Button type="button" onClick={donate} disabled={redirecting}>
            {redirecting ? t.donateRedirecting : t.donateButton}
          </Button>
          <ErrorMessage message={error} />
          {settings.testMode && (
            <p className="border-l-2 border-warn-ink/40 pl-3 text-sm text-warn-ink">{t.donateTestMode}</p>
          )}
          <p className="text-sm text-muted">{t.donateSecure}</p>
          {settings.portalUrl && (
            <p className="text-sm">
              <ExternalLink href={settings.portalUrl}>{t.donateManage}</ExternalLink>
            </p>
          )}
        </div>
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

export function SupportPage({ donations }: { donations: DonationSettings }) {
  const { t } = useCivica();
  return (
    <div className="space-y-10">
      <PageIntro title={t.supportTitle} intro={t.supportIntro} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Reveal delay={0.05}>
          <Donate settings={donations} />
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
