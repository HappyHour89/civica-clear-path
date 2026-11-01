import { PageTransition } from "@/components/motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition subtle className="space-y-8">{children}</PageTransition>;
}
