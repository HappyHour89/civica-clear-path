import type { Metadata } from "next";
import { ReviewDesk } from "@/components/ReviewDesk";

export const metadata: Metadata = { title: "Review desk", robots: { index: false, follow: false } };

export default function Page() {
  return <ReviewDesk />;
}
