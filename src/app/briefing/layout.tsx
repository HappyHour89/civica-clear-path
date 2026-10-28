import type { Metadata } from "next";
import { BriefingFrame } from "@/components/BriefingView";

export const metadata: Metadata = { title: "Your briefing" };

export default function BriefingLayout({ children }: { children: React.ReactNode }) {
  return <BriefingFrame>{children}</BriefingFrame>;
}
