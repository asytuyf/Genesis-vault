import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GOALS",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
