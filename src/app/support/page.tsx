import type { Metadata } from "next";
import { SupportPage } from "@/components/SupportPage";
import { donationsEnabled, portalLoginUrl, stripeTestMode } from "@/lib/stripe";

export const metadata: Metadata = { title: "Support" };

export default function Page() {
  return (
    <SupportPage donations={{ enabled: donationsEnabled(), testMode: stripeTestMode(), portalUrl: portalLoginUrl() }} />
  );
}
