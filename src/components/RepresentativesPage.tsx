"use client";

import { useState } from "react";
import { US_STATES } from "@/lib/states";
import { useCivica } from "./CivicaProvider";
import { Officials } from "./Officials";
import { inputClass, PageIntro } from "./ui";

export function RepresentativesPage() {
  const { t, state, setState, officials, lookUpOfficials, officialsLoading } = useCivica();
  const [address, setAddress] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const showing = officials && officials.state === state ? officials : null;

  return (
    <div className="space-y-6">
      <PageIntro title={t.navRepresentatives} intro={t.repsIntro} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!state) return setLocalError(t.needState);
          setLocalError(null);
          void lookUpOfficials(state, address.trim());
        }}
        className="space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="state" className="block font-semibold">
              {t.locationLabel}
            </label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={officialsLoading}
              className={inputClass}
            >
              <option value="">{t.noState}</option>
              {Object.entries(US_STATES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted">{t.locationHint}</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="address" className="block font-semibold">
              {t.addressLabel}
            </label>
            <input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.addressPlaceholder}
              autoComplete="street-address"
              maxLength={200}
              disabled={officialsLoading || !state}
              className={inputClass}
            />
            <p className="text-sm text-muted">{t.addressHint}</p>
          </div>
        </div>
        {localError && (
          <p role="alert" className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error-ink">
            {localError}
          </p>
        )}
        <button
          type="submit"
          disabled={officialsLoading}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {officialsLoading ? t.findingReps : t.findReps}
        </button>
      </form>

      {showing && (
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold">{t.yourOfficials}</h2>
          <Officials officials={showing.officials} error={showing.error} t={t} />
        </section>
      )}
    </div>
  );
}
