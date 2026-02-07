import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css"; // <--- THIS LINE IS CRITICAL

const jbMono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GENESIS_VAULT",
  description: "Secure Project Storage",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jbMono.className}>{children}</body>
    </html>
  );
}