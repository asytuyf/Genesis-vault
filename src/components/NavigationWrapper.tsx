"use client";

import { useEffect, useState } from "react";
import { FileExplorer } from "@/components/FileExplorer";
import { Menu, X } from "lucide-react";

/** Scrolled less than this, the menu button always shows. */
const TOP_ZONE = 80;
/** Movement smaller than this does not count as scrolling either way. */
const JITTER = 6;

// The menu button floats over the page. It tucks itself away while you scroll
// down, so it never sits on top of what you are reading, and is back the
// moment you scroll up. While a sheet or dialog is open it steps aside too
// (see .nav-menu-button in globals.css): the window has its own close button.
// The visible button is small; ::before keeps the tap target finger-sized.
const button =
  "nav-menu-button fixed left-4 top-[36px] z-[1010] h-9 w-9 place-items-center rounded-xl " +
  "bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 " +
  "shadow-[0_6px_20px_rgba(0,0,0,0.45)] before:absolute before:-inset-1.5 before:content-['']";

export function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);
  const [desktopExplorerOpen, setDesktopExplorerOpen] = useState(false);
  const [tucked, setTucked] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < TOP_ZONE) {
          setTucked(false);
          last = y;
        } else if (Math.abs(y - last) > JITTER) {
          setTucked(y > last);
          last = y;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Never tucked away while the explorer it opens is showing.
  const hidden = tucked && !mobileExplorerOpen && !desktopExplorerOpen;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setMobileExplorerOpen((open) => !open)}
        aria-label={mobileExplorerOpen ? "Close file explorer" : "Open file explorer"}
        aria-expanded={mobileExplorerOpen}
        data-hidden={hidden}
        className={`${button} grid md:hidden`}
      >
        {mobileExplorerOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
      </button>

      {/* Desktop Menu Button */}
      <button
        type="button"
        onClick={() => setDesktopExplorerOpen((open) => !open)}
        aria-label="Toggle file explorer"
        aria-pressed={desktopExplorerOpen}
        data-hidden={hidden}
        className={`${button} hidden md:grid`}
      >
        {desktopExplorerOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
      </button>

      <FileExplorer
        mobileOpen={mobileExplorerOpen}
        setMobileOpen={setMobileExplorerOpen}
        desktopOpen={desktopExplorerOpen}
      />

      {children}
    </>
  );
}
