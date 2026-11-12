import type { Metadata } from "next";
import { pwaMetadata } from "@/lib/pwa";

export const metadata: Metadata = {
  title: "TRACK",
  ...pwaMetadata("streaks"),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
