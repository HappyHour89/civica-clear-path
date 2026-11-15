import type { Metadata } from "next";
import { ChargesPage } from "@/components/ChargesPage";

export const metadata: Metadata = { title: "Why is my bill this high?" };

export default function Page() {
  return <ChargesPage />;
}
