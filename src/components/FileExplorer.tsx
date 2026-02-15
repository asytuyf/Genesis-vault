"use client";

import { useState, useEffect } from "react";
import { motion, useDragControls, useMotionValue, animate } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Folder, File, ChevronRight, ChevronDown, Hash, X, Lock, Unlock, Zap, Flame } from "lucide-react";

interface FileExplorerProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  desktopOpen?: boolean;
}

export const FileExplorer = ({ mobileOpen, setMobileOpen, desktopOpen }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["src", "app"]);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const dragControls = useDragControls();
  const panelX = useMotionValue(-350);
  const panelY = useMotionValue(0);

  // fallback to internal state when parent doesn't control mobile panel
  const mobileOpenValue = mobileOpen ?? internalMobileOpen;
  const setMobileOpenValue = setMobileOpen ?? setInternalMobileOpen;
  const desktopOpenValue = desktopOpen ?? false;
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedKey = window.localStorage.getItem("goals_admin_key") || "";
    const savedMode = window.localStorage.getItem("goals_admin_mode") === "1";
    setAdminKey(savedKey);
    if (savedKey === "genesis2026") {
      setAdminMode(savedMode);
    } else {
      setAdminMode(false);
      window.localStorage.setItem("goals_admin_mode", "0");
    }
  }, []);

  const getThemeColor = () => {
    if (pathname === "/archive") return "text-cyan-400";
    if (pathname === "/goals") return "text-emerald-400";
    if (pathname === "/focus") return "text-purple-400";
    if (pathname === "/streaks") return "text-orange-400";
    return "text-yellow-400";
  };

  const getPanelGlow = () => {
    if (pathname === "/archive") return "rgba(34, 211, 238, 0.25)";
    if (pathname === "/goals") return "rgba(16, 185, 129, 0.22)";
    if (pathname === "/focus") return "rgba(168, 85, 247, 0.22)";
    if (pathname === "/streaks") return "rgba(249, 115, 22, 0.22)";
    return "rgba(250, 204, 21, 0.22)";
  };

  const themeColorClass = getThemeColor();
  const panelGlow = getPanelGlow();

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folder) ? prev.filter((f) => f !== folder) : [...prev, folder]
    );
  };

  const setAdminModeAndBroadcast = (next: boolean) => {
    setAdminMode(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem("goals_admin_mode", next ? "1" : "0");
    window.dispatchEvent(new CustomEvent("goals-admin-mode", { detail: next }));
  };

  const updateAdminKey = (value: string) => {
    setAdminKey(value);
    if (typeof window === "undefined") return;
    window.localStorage.setItem("goals_admin_key", value);
    window.dispatchEvent(new CustomEvent("goals-admin-key", { detail: value }));
    if (value !== "genesis2026" && adminMode) {
      setAdminModeAndBroadcast(false);
    }
  };

  useEffect(() => {
    const targetX = desktopOpenValue ? 10 : -350;
    animate(panelX, targetX, { type: "spring", stiffness: 400, damping: 30 });
  }, [desktopOpenValue, panelX]);

  const renderFileTreeContent = (isMobileView: boolean) => {
    return (
      <div className="relative h-full">
        {/* NOISE OVERLAY */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 10% -6%, ${panelGlow}, transparent 48%)`,
            opacity: 0.35,
          }}
        />

        {/* Header */}
        <div
          className={`h-14 flex items-center justify-between px-4 border-b border-zinc-900 bg-zinc-950 relative z-10 ${
            isMobileView ? "" : "cursor-grab active:cursor-grabbing"
          }`}
          onPointerDown={isMobileView ? undefined : (e) => dragControls.start(e)}
        >
          <div className={`flex items-center gap-2 ${themeColorClass}`}>
            <Terminal size={20} strokeWidth={2.5} />
            <span className="text-sm font-black tracking-[0.2em] uppercase">System_Root</span>
          </div>
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
                className="flex items-center gap-2 text-white cursor-pointer py-1.5 select-none transition-colors"
                onClick={() => toggleFolder("src")}
              >
                <span className={`${themeColorClass} transition-colors`}>
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
                      className="flex items-center gap-2 text-white cursor-pointer py-1.5 select-none transition-colors group/app"
                      onClick={() => toggleFolder("app")}
                    >
                      <span className={`${themeColorClass} transition-colors`}>
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
                            className="text-yellow-400 transition-colors"
                          />
                          <span
                            className={`text-sm font-medium transition-colors ${
                              isMobileView
                                ? pathname === "/"
                                  ? "text-yellow-400"
                                  : "text-zinc-400"
                                : "text-white"
                            }`}
                          >
                            page.tsx
                          </span>
                          <span
                            className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all text-yellow-400 border-yellow-400/30"
                          >
                            HOME
                          </span>
                        </Link>

                        {/* ARCHIVE FOLDER */}
                        <div>
                          <div
                            className="flex items-center gap-2 text-white cursor-pointer py-1.5 select-none transition-colors"
                            onClick={() => toggleFolder("archive")}
                          >
                            <span className="text-cyan-400 transition-colors">
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
                                  className="text-cyan-400 transition-colors"
                                />
                                <span
                                  className={`text-sm font-medium transition-colors ${
                                    isMobileView
                                      ? pathname === "/archive"
                                        ? "text-cyan-400"
                                        : "text-zinc-400"
                                      : "text-white"
                                  }`}
                                >
                                  page.tsx
                                </span>
                                <span
                                  className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all text-cyan-400 border-cyan-400/30"
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
                            className="flex items-center gap-2 text-white cursor-pointer py-1.5 select-none transition-colors"
                            onClick={() => toggleFolder("goals")}
                          >
                            <span className="text-emerald-400 transition-colors">
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
                                  className="text-emerald-400 transition-colors"
                                />
                                <span
                                  className={`text-sm font-medium transition-colors ${
                                    isMobileView
                                      ? pathname === "/goals"
                                        ? "text-emerald-400"
                                        : "text-zinc-400"
                                      : "text-white"
                                  }`}
                                >
                                  page.tsx
                                </span>
                                <span
                                  className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all text-emerald-400 border-emerald-400/30"
                                >
                                  GOALS
                                </span>
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* FOCUS FOLDER */}
                        <div>
                          <div
                            className="flex items-center gap-2 text-white cursor-pointer py-1.5 select-none transition-colors"
                            onClick={() => toggleFolder("focus")}
                          >
                            <span className="text-purple-400 transition-colors">
                              {expandedFolders.includes("focus") ? (
                                <ChevronDown size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </span>
                            <Folder
                              size={20}
                              className={expandedFolders.includes("focus") ? "text-purple-400" : "text-zinc-600"}
                            />
                            <span className="text-sm font-bold tracking-wide">focus</span>
                          </div>
                          {expandedFolders.includes("focus") && (
                            <div className="ml-2 pl-2 border-l border-zinc-900 mt-1">
                              <Link
                                href="/focus"
                                className="flex items-center gap-2 group/file py-1"
                                onClick={() => isMobileView && setMobileOpenValue(false)}
                              >
                                <File
                                  size={18}
                                  className="text-purple-400 transition-colors"
                                />
                                <span
                                  className={`text-sm font-medium transition-colors ${
                                    isMobileView
                                      ? pathname === "/focus"
                                        ? "text-purple-400"
                                        : "text-zinc-400"
                                      : "text-white"
                                  }`}
                                >
                                  page.tsx
                                </span>
                                <span
                                  className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all text-purple-400 border-purple-400/30"
                                >
                                  FOCUS
                                </span>
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* SIGNAL FOLDER */}
                        <div>
                          <div
                            className="flex items-center gap-2 text-white cursor-pointer py-1.5 select-none transition-colors"
                            onClick={() => toggleFolder("track")}
                          >
                            <span className="text-orange-400 transition-colors">
                              {expandedFolders.includes("track") ? (
                                <ChevronDown size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </span>
                            <Folder
                              size={20}
                              className={expandedFolders.includes("track") ? "text-orange-400" : "text-zinc-600"}
                            />
                            <span className="text-sm font-bold tracking-wide">track</span>
                          </div>
                          {expandedFolders.includes("track") && (
                            <div className="ml-2 pl-2 border-l border-zinc-900 mt-1">
                              <Link
                                href="/streaks"
                                className="flex items-center gap-2 group/file py-1"
                                onClick={() => isMobileView && setMobileOpenValue(false)}
                              >
                                <File
                                  size={18}
                                  className="text-orange-400 transition-colors"
                                />
                                <span
                                  className={`text-sm font-medium transition-colors ${
                                    isMobileView
                                      ? pathname === "/streaks"
                                        ? "text-orange-400"
                                        : "text-zinc-400"
                                      : "text-white"
                                  }`}
                                >
                                  page.tsx
                                </span>
                                <span
                                  className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all text-orange-400 border-orange-400/30"
                                >
                                  TRACK
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

          {pathname === "/goals" && (
            <div className="mt-6 border border-zinc-900 bg-black/40">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                <Lock size={14} className={themeColorClass} />
                <span>AUTH_CONSOLE</span>
              </div>
              <div className="px-3 py-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2">
                  Admin_Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="ADMIN_KEY"
                    value={adminKey}
                    onChange={(e) => updateAdminKey(e.target.value)}
                    className="flex-1 bg-black border border-zinc-800 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-emerald-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAdminModeAndBroadcast(adminKey === "genesis2026" ? !adminMode : false)
                    }
                    className={`grid h-9 w-9 place-items-center border transition-colors ${
                      adminMode
                        ? "border-emerald-400/40 text-emerald-400"
                        : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                    title={adminMode ? "Lock admin" : "Unlock admin"}
                    aria-label={adminMode ? "Lock admin" : "Unlock admin"}
                  >
                    {adminMode ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                </div>
                <div className="mt-2 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                  local cache / secure ops
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Explorer */}
      <div
        className="fixed left-0 top-0 bottom-0 z-[500] hidden md:block"
      >
        {/* IDE Sidebar - FLOATING MODULE STYLE */}
        <motion.div
          style={{ x: panelX, y: panelY }}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.2}
          initial={{ opacity: 0 }}
          animate={{ opacity: desktopOpenValue ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden={!desktopOpenValue}
          className={`absolute left-0 top-1/2 -translate-y-1/2 min-h-[40vh] max-h-[90vh] w-[280px] bg-[#0a0a0a] border border-zinc-900 shadow-2xl flex flex-col font-mono rounded-xl overflow-hidden transition-colors duration-500 ${
            desktopOpenValue ? "pointer-events-auto" : "pointer-events-none"
          }`}
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
