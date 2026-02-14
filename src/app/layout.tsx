"use client";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { useState } from "react";
import { FileExplorer } from "@/components/FileExplorer";
import { Menu, X } from "lucide-react";

const jbMono = JetBrains_Mono({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);
  const [desktopExplorerOpen, setDesktopExplorerOpen] = useState(false);

  return (
    <html lang="en">
      <body className={jbMono.className}>
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileExplorerOpen((open) => !open)}
          aria-label={mobileExplorerOpen ? "Close file explorer" : "Open file explorer"}
          aria-expanded={mobileExplorerOpen}
          className="fixed left-4 top-[36px] z-[700] p-2 bg-black/50 border border-zinc-800 rounded-lg md:hidden text-zinc-400 hover:text-white transition-colors"
        >
          {mobileExplorerOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop Menu Button */}
        <button
          type="button"
          onClick={() => setDesktopExplorerOpen((open) => !open)}
          aria-label="Toggle file explorer"
          aria-pressed={desktopExplorerOpen}
          className="fixed left-4 top-[36px] z-[700] hidden md:flex items-center justify-center p-2 bg-black/50 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
        >
          {desktopExplorerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <FileExplorer
          mobileOpen={mobileExplorerOpen}
          setMobileOpen={setMobileExplorerOpen}
          desktopOpen={desktopExplorerOpen}
        />
        
        {children}
      </body>
    </html>
  );
}
