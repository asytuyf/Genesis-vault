import type { Metadata } from "next";
import { pwaMetadata } from "@/lib/pwa";

export const metadata: Metadata = {
  title: "LIBRARY",
  ...pwaMetadata("library"),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
