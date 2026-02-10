"use client";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { useState } from "react";
import { FileExplorer } from "@/components/FileExplorer";
import { Menu } from "lucide-react";

const jbMono = JetBrains_Mono({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);

  return (
    <html lang="en">
      <body className={jbMono.className}>
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileExplorerOpen(true)}
          aria-label="Open file explorer"
          aria-expanded={mobileExplorerOpen}
          className={`fixed left-4 top-[36px] z-[700] p-2 bg-black/50 border border-zinc-800 rounded-lg md:hidden text-zinc-400 hover:text-white transition-colors ${
            mobileExplorerOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <Menu size={24} />
        </button>

        <FileExplorer mobileOpen={mobileExplorerOpen} setMobileOpen={setMobileExplorerOpen} />
        
        {children}
      </body>
    </html>
  );
}
