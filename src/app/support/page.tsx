import type { Metadata } from "next";
import { SupportPage } from "@/components/SupportPage";

export const metadata: Metadata = { title: "Support" };

export default function Page() {
  return <SupportPage />;
}
