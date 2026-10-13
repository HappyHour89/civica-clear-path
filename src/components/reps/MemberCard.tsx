"use client";

import { useState } from "react";
import { fmt, type Dictionary } from "@/lib/i18n";
import { NON_STATES, photoUrl, type Member } from "@/lib/legislators";
import { isSafeHttpUrl } from "@/lib/sources";
import { US_STATES } from "@/lib/states";

export type MemberLabels = Dictionary["reps"] & Pick<Dictionary, "call" | "website" | "contact">;

function Placeholder() {
  return (
    <svg viewBox="0 0 90 110" className="size-full text-muted/40" aria-hidden>
      <rect width="90" height="110" fill="var(--line)" />
      <circle cx="45" cy="42" r="17" fill="currentColor" />
      <path d="M12 110c2-24 16-36 33-36s31 12 33 36z" fill="currentColor" />
    </svg>
  );
}

export function MemberPhoto({ member, alt, className }: { member: Member; alt: string; className: string }) {
  const [failed, setFailed] = useState(!member.photo);
  return (
    <span className={`block shrink-0 overflow-hidden rounded-xl bg-line ${className}`}>
      {failed ? (
        <Placeholder />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- public-domain photos from a fixed external host
        <img
          src={photoUrl(member.id)}
          alt={alt}
          width={225}
          height={275}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          // An image can fail before React attaches onError, so also check once mounted.
          ref={(img) => {
            if (img?.complete && img.naturalWidth === 0) setFailed(true);
          }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export function memberLocation(member: Member, t: MemberLabels) {
  const state = US_STATES[member.state] ?? member.state;
  if (member.chamber === "senate") return fmt(t.senatorFor, { state });
  if (NON_STATES.has(member.state)) return fmt(t.delegateFor, { state });
  if (member.district === 0) return fmt(t.repAtLarge, { state });
  return fmt(t.repFor, { state, district: member.district ?? "" });
}

export function MemberCard({ member, t, highlight }: { member: Member; t: MemberLabels; highlight?: boolean }) {
  return (
    <article
      className={`flex h-full gap-4 rounded-2xl border bg-surface p-4 transition-[border-color,box-shadow] ${
        highlight ? "border-brand shadow-[0_0_0_3px_var(--brand-soft)]" : "border-line hover:border-brand/40"
      }`}
    >
      <MemberPhoto member={member} alt={fmt(t.photoAlt, { name: member.name })} className="h-[7.3rem] w-24" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="font-serif text-lg leading-snug font-semibold">{member.name}</h3>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="rounded-md border border-line px-1.5 py-0.5 text-xs font-medium text-ink">
            {t.parties[member.party] ?? member.party}
          </span>
          <span>{memberLocation(member, t)}</span>
        </p>
        <p className="text-sm text-muted">{fmt(t.inOfficeSince, { year: member.since })}</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-sm font-medium">
          {member.phone && (
            <a href={`tel:${member.phone.replace(/[^\d+]/g, "")}`} className="text-brand underline underline-offset-4">
              {t.call} {member.phone}
            </a>
          )}
          {member.website && isSafeHttpUrl(member.website) && (
            <a href={member.website} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-4">
              {t.website}
            </a>
          )}
          {member.contactForm && isSafeHttpUrl(member.contactForm) && (
            <a
              href={member.contactForm}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline underline-offset-4"
            >
              {t.contact}
            </a>
          )}
        </p>
      </div>
    </article>
  );
}
