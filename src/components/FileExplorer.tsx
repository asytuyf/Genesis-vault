"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Folder, File, ChevronRight, ChevronDown, Hash, X } from "lucide-react";

interface FileExplorerProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const FileExplorer = ({ mobileOpen, setMobileOpen }: FileExplorerProps) => {
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["src", "app"]);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);

  // fallback to internal state when parent doesn't control mobile panel
  const mobileOpenValue = mobileOpen ?? internalMobileOpen;
  const setMobileOpenValue = setMobileOpen ?? setInternalMobileOpen;
  const pathname = usePathname();

  const getThemeColor = () => {
    if (pathname === "/archive") return "text-cyan-400";
    if (pathname === "/goals") return "text-emerald-400";
    return "text-yellow-400";
  };

  const getHoverColor = () => {
    if (pathname === "/archive") return "group-hover:text-cyan-400";
    if (pathname === "/goals") return "group-hover:text-emerald-400";
    return "group-hover:text-yellow-400";
  };

  const themeColorClass = getThemeColor();
  const hoverColorClass = getHoverColor();

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folder) ? prev.filter((f) => f !== folder) : [...prev, folder]
    );
  };

  const renderFileTreeContent = (isMobileView: boolean) => {
    return (
      <div className="relative h-full">
        {/* NOISE OVERLAY */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-900 bg-zinc-950 relative z-10">
          <div className={`flex items-center gap-2 ${themeColorClass}`}>
            <Terminal size={20} strokeWidth={2.5} />
            <span className="text-sm font-black tracking-[0.2em] uppercase">System_Root</span>
          </div>
          {!isMobileView && (
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <div className="w-1 h-1 bg-white/20 rounded-full" />
            </div>
          )}
          {isMobileView && (
            <button
              onClick={() => setMobileOpenValue(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          )}
        </div>

        {/* File Tree */}
        <div
          className={`flex-1 p-4 overflow-y-auto relative z-10 ${
            isMobileView ? "custom-scrollbar-mobile" : "custom-scrollbar"
          }`}
        >
          <div className="flex items-center gap-2 mb-4 text-zinc-500 text-xs font-black uppercase tracking-widest border-b border-zinc-900 pb-2">
            <Hash size={16} />
            <span>Directory_Tree</span>
          </div>

          <div className="space-y-1">
            {/* SRC */}
            <div className="group">
              <div
                className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer py-1.5 select-none transition-colors"
                onClick={() => toggleFolder("src")}
              >
                <span className={`text-zinc-600 ${hoverColorClass} transition-colors`}>
                  {expandedFolders.includes("src") ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                </span>
                <Folder
                  size={20}
                  className={expandedFolders.includes("src") ? themeColorClass : "text-zinc-600"}
                />
                <span className="text-sm font-bold tracking-wide">src</span>
              </div>

              {expandedFolders.includes("src") && (
                <div className="ml-2 pl-2 border-l border-zinc-900 space-y-1 mt-1">
                  {/* APP */}
                  <div>
                    <div
                      className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer py-1.5 select-none transition-colors group/app"
                      onClick={() => toggleFolder("app")}
                    >
                      <span className={`text-zinc-600 ${hoverColorClass} transition-colors`}>
                        {expandedFolders.includes("app") ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </span>
                      <Folder
                        size={20}
                        className={expandedFolders.includes("app") ? themeColorClass : "text-zinc-600"}
                      />
                      <span className="text-sm font-bold tracking-wide">app</span>
                    </div>

                    {expandedFolders.includes("app") && (
                      <div className="ml-2 pl-2 border-l border-zinc-900 space-y-1 mt-1">
                        {/* HOME PAGE */}
                        <Link
                          href="/"
                          className="flex items-center gap-2 group/file py-1"
                          onClick={() => isMobileView && setMobileOpenValue(false)}
                        >
                          <File
                            size={18}
                            className={`transition-colors ${
                              isMobileView ? "text-yellow-400" : "text-zinc-600 group-hover/file:text-yellow-400"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium transition-colors ${
                              isMobileView
                                ? pathname === "/"
                                  ? "text-yellow-400"
                                  : "text-zinc-400"
                                : `text-zinc-500 group-hover/file:text-white ${pathname === "/" ? "text-white" : ""}`
                            }`}
                          >
                            page.tsx
                          </span>
                          <span
                            className={`ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all ${
                              isMobileView
                                ? "text-yellow-400 border-yellow-400/30"
                                : "text-zinc-500 border-zinc-800 group-hover/file:border-yellow-400/30 group-hover/file:text-yellow-400"
                            }`}
                          >
                            HOME
                          </span>
                        </Link>

                        {/* ARCHIVE FOLDER */}
                        <div>
                          <div
                            className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer py-1.5 select-none transition-colors"
                            onClick={() => toggleFolder("archive")}
                          >
                            <span className="text-zinc-600 group-hover:text-cyan-400 transition-colors">
                              {expandedFolders.includes("archive") ? (
                                <ChevronDown size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </span>
                            <Folder
                              size={20}
                              className={expandedFolders.includes("archive") ? "text-cyan-400" : "text-zinc-600"}
                            />
                            <span className="text-sm font-bold tracking-wide">archive</span>
                          </div>
                          {expandedFolders.includes("archive") && (
                            <div className="ml-2 pl-2 border-l border-zinc-900 mt-1">
                              <Link
                                href="/archive"
                                className="flex items-center gap-2 group/file py-1"
                                onClick={() => isMobileView && setMobileOpenValue(false)}
                              >
                                <File
                                  size={18}
                                  className={`transition-colors ${
                                    isMobileView ? "text-cyan-400" : "text-zinc-600 group-hover/file:text-cyan-400"
                                  }`}
                                />
                                <span
                                  className={`text-sm font-medium transition-colors ${
                                    isMobileView
                                      ? pathname === "/archive"
                                        ? "text-cyan-400"
                                        : "text-zinc-400"
                                      : `text-zinc-500 group-hover/file:text-white ${
                                          pathname === "/archive" ? "text-white" : ""
                                        }`
                                  }`}
                                >
                                  page.tsx
                                </span>
                                <span
                                  className={`ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all ${
                                    isMobileView
                                      ? "text-cyan-400 border-cyan-400/30"
                                      : "text-zinc-500 border-zinc-800 group-hover/file:border-cyan-400/30 group-hover/file:text-cyan-400"
                                  }`}
                                >
                                  ARCHIVE
                                </span>
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* GOALS FOLDER */}
                        <div>
                          <div
                            className="flex items-center gap-2 text-zinc-400 hover:text-white cursor-pointer py-1.5 select-none transition-colors"
                            onClick={() => toggleFolder("goals")}
                          >
                            <span className="text-zinc-600 group-hover:text-emerald-400 transition-colors">
                              {expandedFolders.includes("goals") ? (
                                <ChevronDown size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </span>
                            <Folder
                              size={20}
                              className={expandedFolders.includes("goals") ? "text-emerald-400" : "text-zinc-600"}
                            />
                            <span className="text-sm font-bold tracking-wide">goals</span>
                          </div>
                          {expandedFolders.includes("goals") && (
                            <div className="ml-2 pl-2 border-l border-zinc-900 mt-1">
                              <Link
                                href="/goals"
                                className="flex items-center gap-2 group/file py-1"
                                onClick={() => isMobileView && setMobileOpenValue(false)}
                              >
                                <File
                                  size={18}
                                  className={`transition-colors ${
                                    isMobileView
                                      ? "text-emerald-400"
                                      : "text-zinc-600 group-hover/file:text-emerald-400"
                                  }`}
                                />
                                <span
                                  className={`text-sm font-medium transition-colors ${
                                    isMobileView
                                      ? pathname === "/goals"
                                        ? "text-emerald-400"
                                        : "text-zinc-400"
                                      : `text-zinc-500 group-hover/file:text-white ${
                                          pathname === "/goals" ? "text-white" : ""
                                        }`
                                  }`}
                                >
                                  page.tsx
                                </span>
                                <span
                                  className={`ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all ${
                                    isMobileView
                                      ? "text-emerald-400 border-emerald-400/30"
                                      : "text-zinc-500 border-zinc-800 group-hover/file:border-emerald-400/30 group-hover/file:text-emerald-400"
                                  }`}
                                >
                                  GOALS
                                </span>
                              </Link>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-zinc-600 py-1.5 opacity-50">
                          <File size={18} />
                          <span className="text-sm">layout.tsx</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600 py-1.5 opacity-50">
                          <File size={18} />
                          <span className="text-sm">globals.css</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Explorer */}
      <div
        className="fixed left-0 top-0 bottom-0 z-[500] hidden md:block"
        onMouseEnter={() => setIsDesktopOpen(true)}
        onMouseLeave={() => setIsDesktopOpen(false)}
      >
        {/* Invisible trigger zone at the very left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-8" />

        {/* IDE Sidebar - FLOATING MODULE STYLE */}
        <motion.div
          initial={{ x: -350, opacity: 0 }}
          animate={{ x: isDesktopOpen ? 10 : -350, opacity: isDesktopOpen ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 min-h-[40vh] max-h-[90vh] w-[280px] bg-[#0a0a0a] border border-zinc-900 shadow-2xl flex flex-col font-mono rounded-xl overflow-hidden transition-colors duration-500"
        >
          {renderFileTreeContent(false)}
        </motion.div>
      </div>

      {/* Mobile Explorer (Full Screen Overlay) */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: mobileOpenValue ? "0%" : "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-0 bg-black/95 z-[600] md:hidden flex flex-col font-mono"
      >
        {renderFileTreeContent(true)}
      </motion.div>
    </>
  );
};
