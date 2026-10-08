import type { Dictionary } from "@/lib/i18n";
import type { FederalOfficial, OfficialsResult } from "@/lib/officials";
import { isSafeHttpUrl } from "@/lib/sources";
import { ExternalLink } from "./ui";

const FIND_REP_URL = "https://www.house.gov/representatives/find-your-representative";

function OfficialCard({ official, label, t }: { official: FederalOfficial; label: string; t: Dictionary }) {
  return (
    <div className="space-y-1 rounded-xl border border-line p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="font-semibold">{official.name}</p>
      <p className="text-sm text-muted">
        {official.party}
        {official.chamber === "house" &&
          ` · ${official.district ? `${t.district} ${official.district}` : t.atLarge}`}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
        {official.phone && (
          <a href={`tel:${official.phone.replace(/[^\d+]/g, "")}`} className="text-accent underline underline-offset-2">
            {t.call} {official.phone}
          </a>
        )}
        {official.website && isSafeHttpUrl(official.website) && (
          <ExternalLink href={official.website}>{t.website}</ExternalLink>
        )}
        {official.contactForm && isSafeHttpUrl(official.contactForm) && (
          <ExternalLink href={official.contactForm}>{t.contact}</ExternalLink>
        )}
      </div>
    </div>
  );
}

export function Officials(props: { officials: OfficialsResult | null; error: boolean; t: Dictionary }) {
  const { officials, t } = props;
  if (props.error || !officials) {
    return <p className="text-sm text-muted">{t.officialsUnavailable}</p>;
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {officials.senators.map((senator) => (
          <OfficialCard key={senator.name} official={senator} label={t.senator} t={t} />
        ))}
        {officials.representative && (
          <OfficialCard official={officials.representative} label={t.representative} t={t} />
        )}
      </div>
      {!officials.representative && (
        <p className="text-sm">
          {officials.addressMatched === false && <span className="text-muted">{t.addressNotMatched} </span>}
          <ExternalLink href={FIND_REP_URL}>{t.findYourRep}</ExternalLink>
        </p>
      )}
      <p className="text-xs text-muted">{t.officialsSource}</p>
    </div>
  );
}
