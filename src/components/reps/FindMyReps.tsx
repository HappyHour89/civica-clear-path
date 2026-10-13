"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { fmt } from "@/lib/i18n";
import { delegation, NON_STATES, type Member } from "@/lib/legislators";
import type { OfficialsResult } from "@/lib/officials";
import { isStateCode, US_STATES } from "@/lib/states";
import { MemberCard, type MemberLabels } from "./MemberCard";

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink transition-[border-color,box-shadow] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: OfficialsResult }
  | { status: "error" };

export function FindMyReps({ members, t }: { members: Member[]; t: MemberLabels }) {
  const initial = useSearchParams().get("state")?.toUpperCase();
  const [state, setState] = useState(isStateCode(initial) ? initial : "");
  const [address, setAddress] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });

  const { senators, house } = state ? delegation(members, state) : { senators: [], house: [] };
  const match = lookup.status === "done" ? lookup.result : null;
  const myRep = match?.addressMatched ? match.representative : null;

  function chooseState(next: string) {
    setState(next);
    setLookup({ status: "idle" });
  }

  async function findDistrict(event: React.FormEvent) {
    event.preventDefault();
    if (!address.trim()) return;
    setLookup({ status: "loading" });
    try {
      const response = await fetch("/api/officials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, address }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const result = (await response.json()) as OfficialsResult;
      if (result.lookupFailed) {
        setLookup({ status: "error" });
        return;
      }
      if (result.state !== state) setState(result.state);
      setLookup({ status: "done", result });
    } catch {
      setLookup({ status: "error" });
    }
  }

  return (
    <div className="space-y-8 rounded-3xl border border-line bg-surface p-5 sm:p-8">
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-end">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-semibold">{t.findTitle}</h2>
          <p className="text-muted">{t.findBody}</p>
        </div>
        <div className="space-y-2">
          <label htmlFor="my-state" className="block font-semibold">
            {t.stateLabel}
          </label>
          <select id="my-state" value={state} onChange={(e) => chooseState(e.target.value)} className={fieldClass}>
            <option value="">{t.chooseState}</option>
            {Object.entries(US_STATES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state && (
          <motion.div
            key={state}
            className="space-y-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {NON_STATES.has(state) ? (
              <p className="rounded-xl bg-paper px-4 py-3 text-muted">{fmt(t.territoryNote, { state: US_STATES[state] })}</p>
            ) : (
              <section className="space-y-3">
                <h3 className="font-serif text-xl font-semibold">{t.yourSenators}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {senators.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 * i }}
                    >
                      <MemberCard member={m} t={t} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <h3 className="font-serif text-xl font-semibold">{fmt(t.houseFromState, { state: US_STATES[state] })}</h3>
              {house.length > 1 && (
                <div className="space-y-4 rounded-2xl border border-dashed border-brand/40 bg-brand-soft/40 p-4 sm:p-5">
                  <p className="text-sm">{t.districtNote}</p>
                  <form onSubmit={findDistrict} className="space-y-2">
                    <h4 className="font-semibold">{t.addressTitle}</h4>
                    <p className="text-sm text-muted">{t.addressWhy}</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label htmlFor="rep-address" className="sr-only">
                        {t.addressLabel}
                      </label>
                      <input
                        id="rep-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="123 Main St, Springfield, IL 62701"
                        autoComplete="street-address"
                        maxLength={200}
                        className={fieldClass}
                      />
                      <button
                        type="submit"
                        disabled={lookup.status === "loading" || !address.trim()}
                        className="shrink-0 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-ink transition-colors hover:bg-brand-strong disabled:opacity-60"
                      >
                        {lookup.status === "loading" ? t.finding : t.findDistrict}
                      </button>
                    </div>
                  </form>
                  <div aria-live="polite">
                    {lookup.status === "error" && <p className="text-sm text-error-ink">{t.lookupFailed}</p>}
                    {match && !match.addressMatched && (
                      <p className="text-sm text-error-ink">
                        {t.addressNoMatch}{" "}
                        <a
                          href="https://www.house.gov/representatives/find-your-representative"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-4"
                        >
                          house.gov
                        </a>
                      </p>
                    )}
                    {myRep && (
                      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                        <p className="text-sm font-semibold text-brand">{t.yourDistrict}</p>
                        <MemberCard member={myRep} t={t} highlight />
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
              <ul className="grid gap-4 md:grid-cols-2">
                {house.map((m) => (
                  <li key={m.id}>
                    <MemberCard member={m} t={t} highlight={myRep?.id === m.id} />
                  </li>
                ))}
              </ul>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
