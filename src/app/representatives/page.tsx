import type { Metadata } from "next";
import { RepresentativesPage } from "@/components/RepresentativesPage";

export const metadata: Metadata = { title: "My representatives" };

export default function Page() {
  return <RepresentativesPage />;
}
