import type { Metadata } from "next";
import { DocumentForm } from "@/components/AskForm";

export const metadata: Metadata = { title: "Explain a document" };

export default function DocumentPage() {
  return <DocumentForm />;
}
