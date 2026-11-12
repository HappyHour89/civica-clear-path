import type { Metadata } from "next";
import { BillsPage } from "@/components/BillsPage";

export const metadata: Metadata = { title: "Follow a bill" };

export default function Page() {
  return <BillsPage />;
}
