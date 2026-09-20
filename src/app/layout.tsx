import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NavigationWrapper } from "@/components/NavigationWrapper";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const jbMono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HOME",
  applicationName: "Genesis Vault",
  // Added to the home screen on an iPhone, it opens without browser chrome and
  // is named Genesis under the wings icon.
  appleWebApp: {
    capable: true,
    title: "Genesis",
    statusBarStyle: "black",
  },
  formatDetection: { telephone: false },
  other: {
    // Older iOS reads this name; newer versions take standalone from the
    // manifest and from the tag Next writes as mobile-web-app-capable.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d0d0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jbMono.className}>
        <ServiceWorkerRegistrar />
        <NavigationWrapper>
          {children}
        </NavigationWrapper>
      </body>
    </html>
  );
}
