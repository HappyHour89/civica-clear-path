import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Civica — Understand politics. Think for yourself.",
  description:
    "Plain-language, nonpartisan explanations of political and legal issues, with competing perspectives and sources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
