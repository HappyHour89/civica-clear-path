import type { Metadata } from "next";
import { NewspaperPage } from "@/components/NewspaperPage";

export const metadata: Metadata = { title: "My newspaper" };

export default function Page() {
  return <NewspaperPage />;
}
