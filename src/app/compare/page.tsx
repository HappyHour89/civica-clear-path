import type { Metadata } from "next";
import { ComparePage } from "@/components/ComparePage";

export const metadata: Metadata = { title: "Compare versions" };

export default function Page() {
  return <ComparePage />;
}
