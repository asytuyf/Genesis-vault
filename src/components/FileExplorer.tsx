"use client";

import { useState, useEffect } from "react";
import { motion, useDragControls, useMotionValue, animate } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Folder, File, ChevronRight, ChevronDown, Hash, X, Lock, Unlock, Zap, Flame, Sun, Database } from "lucide-react";

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
  const [bgBrightness, setBgBrightness] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
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
    const savedBrightness = window.localStorage.getItem("global_bg_brightness");
    setAdminKey(savedKey);
    if (savedKey) {
      setAdminMode(savedMode);
    } else {
      setAdminMode(false);
      window.localStorage.setItem("goals_admin_mode", "0");
    }
    if (savedBrightness) {
      const brightness = parseInt(savedBrightness);
      setBgBrightness(brightness);
      applyBrightness(brightness);
    }
  }, []);

  const applyBrightness = (value: number) => {
    // Apply brightness overlay to body
    let overlay = document.getElementById("global-brightness-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "global-brightness-overlay";
      overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:1;transition:background-color 0.2s";
      document.body.appendChild(overlay);
    }
    overlay.style.backgroundColor = value > 0 ? `rgba(255,255,255,${value / 100 * 0.3})` : "transparent";
  };

  const updateBrightness = (value: number) => {
    setBgBrightness(value);
    window.localStorage.setItem("global_bg_brightness", String(value));
    applyBrightness(value);
  };

  const getThemeColor = () => {
    if (pathname === "/archive") return "text-cyan-400";
    if (pathname === "/goals") return "text-emerald-400";
    if (pathname === "/study") return "text-purple-400";
    if (pathname === "/streaks") return "text-orange-400";
    if (pathname === "/library") return "text-red-400";
    return "text-yellow-400";
  };

  const getPanelGlow = () => {
    if (pathname === "/archive") return "rgba(34, 211, 238, 0.25)";
    if (pathname === "/goals") return "rgba(16, 185, 129, 0.22)";
    if (pathname === "/study") return "rgba(168, 85, 247, 0.22)";
    if (pathname === "/streaks") return "rgba(249, 115, 22, 0.22)";
    if (pathname === "/library") return "rgba(239, 68, 68, 0.22)";
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
    if (!value && adminMode) {
      setAdminModeAndBroadcast(false);
    }
  };

  useEffect(() => {
    const targetX = desktopOpenValue ? 10 : -350;
    animate(panelX, targetX, { type: "spring", stiffness: 400, damping: 30 });
  }, [desktopOpenValue, panelX]);

  const renderFileTreeContent = (isMobileView: boolean) => {
    return (
      <div className="relative h-full flex flex-col overflow-hidden">
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
          className={`h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-zinc-900 bg-zinc-950 relative z-10 ${isMobileView ? "" : "cursor-grab active:cursor-grabbing"
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
          className={`flex-1 p-4 overflow-y-auto overscroll-contain relative z-10 ${isMobileView ? "custom-scrollbar-mobile" : "custom-scrollbar"
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
                            className={`text-sm font-medium transition-colors ${isMobileView
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
                                  className={`text-sm font-medium transition-colors ${isMobileView
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
                                  className={`text-sm font-medium transition-colors ${isMobileView
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

                        {/* STUDY FOLDER */}
                        <div>
                          <div
                            className="flex items-center gap-2 text-white cursor-pointer py-1.5 select-none transition-colors"
                            onClick={() => toggleFolder("study")}
                          >
                            <span className="text-purple-400 transition-colors">
                              {expandedFolders.includes("study") ? (
                                <ChevronDown size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </span>
                            <Folder
                              size={20}
                              className={expandedFolders.includes("study") ? "text-purple-400" : "text-zinc-600"}
                            />
                            <span className="text-sm font-bold tracking-wide">study</span>
                          </div>
                          {expandedFolders.includes("study") && (
                            <div className="ml-2 pl-2 border-l border-zinc-900 mt-1">
                              <Link
                                href="/study"
                                className="flex items-center gap-2 group/file py-1"
                                onClick={() => isMobileView && setMobileOpenValue(false)}
                              >
                                <File
                                  size={18}
                                  className="text-purple-400 transition-colors"
                                />
                                <span
                                  className={`text-sm font-medium transition-colors ${isMobileView
                                    ? pathname === "/study"
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
                                  STUDY
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
                                  className={`text-sm font-medium transition-colors ${isMobileView
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

                        {/* LIBRARY FOLDER */}
                        <div>
                          <div
                            className="flex items-center gap-2 text-white cursor-pointer py-1.5 select-none transition-colors"
                            onClick={() => toggleFolder("library")}
                          >
                            <span className="text-red-400 transition-colors">
                              {expandedFolders.includes("library") ? (
                                <ChevronDown size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </span>
                            <Folder
                              size={20}
                              className={expandedFolders.includes("library") ? "text-red-400" : "text-zinc-600"}
                            />
                            <span className="text-sm font-bold tracking-wide">library</span>
                          </div>
                          {expandedFolders.includes("library") && (
                            <div className="ml-2 pl-2 border-l border-zinc-900 mt-1">
                              <Link
                                href="/library"
                                className="flex items-center gap-2 group/file py-1"
                                onClick={() => isMobileView && setMobileOpenValue(false)}
                              >
                                <File
                                  size={18}
                                  className="text-red-400 transition-colors"
                                />
                                <span
                                  className={`text-sm font-medium transition-colors ${isMobileView
                                    ? pathname === "/library"
                                      ? "text-red-400"
                                      : "text-zinc-400"
                                    : "text-white"
                                    }`}
                                >
                                  page.tsx
                                </span>
                                <span
                                  className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/80 font-bold border transition-all text-red-400 border-red-400/30"
                                >
                                  LIBRARY
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

          {/* AUTH_CONSOLE - Show on pages that need admin protection */}
          {["/goals", "/library", "/streaks", "/study"].includes(pathname) && (
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
                    disabled={verifying}
                    onClick={async () => {
                      if (adminMode) {
                        // Just lock - no verification needed
                        setAdminModeAndBroadcast(false);
                        return;
                      }
                      if (!adminKey) return;

                      // Verify password with server
                      setVerifying(true);
                      try {
                        const res = await fetch("/api/verify", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ password: adminKey }),
                        });
                        if (res.ok) {
                          setAdminModeAndBroadcast(true);
                        } else {
                          alert("Invalid password");
                          setAdminModeAndBroadcast(false);
                        }
                      } catch (e) {
                        alert("Failed to verify password");
                      }
                      setVerifying(false);
                    }}
                    className={`grid h-9 w-9 place-items-center border transition-colors ${verifying
                      ? "border-yellow-400/40 text-yellow-400"
                      : adminMode
                        ? "border-emerald-400/40 text-emerald-400"
                        : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    title={adminMode ? "Lock admin" : "Unlock admin"}
                    aria-label={adminMode ? "Lock admin" : "Unlock admin"}
                  >
                    {verifying ? <Zap size={16} className="animate-pulse" /> : adminMode ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                </div>
                <div className="mt-2 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                  local cache / secure ops
                </div>

                {/* Migration button - only show when admin */}
                {adminMode && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <button
                      onClick={async () => {
                        if (migrating) return;
                        setMigrating(true);
                        setMigrateResult(null);
                        try {
                          // Hardcoded goals data for one-time migration
                          const goalsToMigrate = [
                            { "id": "1770602846", "project": "Website", "task": "Make a section of the website where i can see like real time like info about my pc's that are turned on which leads to a much complicated project (AI into the site)", "priority": "Med", "status": "PENDING", "date": "2026-02-09" },
                            { "id": "1770632955", "project": "Life", "task": "GEt gemini trial for 1 year using uni email and link it to my personel gmail maybe", "priority": "Med", "status": "PENDING", "date": "2026-02-09", "subgoals": [{ "id": "1771030451348", "text": "omg", "completed": false }, { "id": "1771030454822", "text": "wowowwo", "completed": false }] },
                            { "id": "1771033703370", "task": "three.js website", "project": "Project Ideas", "priority": "Low", "date": "2026-02-14" },
                            { "id": "1771452644572", "task": "Makes bsp proposal and find tutor (ASAP)", "project": "Uni", "priority": "High", "date": "2026-02-18", "subgoals": [{ "id": "1771452676085", "text": "Write a proposal for BSP 6", "completed": true }, { "id": "1771650634430", "text": "send mails to tutors (urgent)", "completed": false }], "deadline": "2026-03-15T02:44", "description": "programing languages teacher" },
                            { "id": "1771509106398", "task": "Improve Stickers", "project": "Website", "priority": "Low", "date": "2026-02-19" },
                            { "id": "1771955700837", "task": "Finish childhood's end tv show", "project": "Fun", "priority": "Medium", "date": "2026-02-24" },
                            { "id": "1772467247748", "task": "Ask for masters application if needed from bachelor", "project": "Uni", "priority": "High", "date": "2026-03-02" },
                            { "id": "1772468438300", "task": "TCS ask question about midterm", "project": "Uni", "priority": "Medium", "date": "2026-03-02", "subgoals": [], "description": "MSA 2.380", "deadline": "2026-03-10T13:00" }
                          ];
                          const res = await fetch("/api/migrate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ password: adminKey, goals: goalsToMigrate }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setMigrateResult(`Done! ${data.results?.goals || ""}`);
                          } else {
                            setMigrateResult(`Error: ${data.error}`);
                          }
                        } catch (e) {
                          setMigrateResult("Failed to migrate");
                        }
                        setMigrating(false);
                      }}
                      disabled={migrating}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold uppercase hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                    >
                      <Database size={12} />
                      {migrating ? "Migrating..." : "Migrate Old Data"}
                    </button>
                    {migrateResult && (
                      <div className={`mt-2 text-[9px] font-bold uppercase ${migrateResult.startsWith("Done") ? "text-emerald-400" : "text-red-400"}`}>
                        {migrateResult}
                      </div>
                    )}
                    <div className="mt-2 text-[8px] text-zinc-700">
                      One-time only. Moves your 8 goals to the cloud.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BRIGHTNESS CONTROL - Always visible */}
          <div className="mt-6 mb-4 border border-zinc-900 bg-black/40">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              <Sun size={14} className={themeColorClass} />
              <span>DISPLAY</span>
            </div>
            <div className="px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] text-zinc-600 uppercase">Dark</span>
                <span className="text-xs text-zinc-400 font-bold">{bgBrightness}%</span>
                <span className="text-[9px] text-zinc-600 uppercase">Light</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={bgBrightness}
                onChange={(e) => updateBrightness(parseInt(e.target.value))}
                className={`w-full h-1.5 cursor-pointer accent-current ${themeColorClass}`}
              />
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
        className="fixed left-0 top-0 bottom-0 z-[1000] hidden md:block"
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
          className={`absolute left-0 top-1/2 -translate-y-1/2 min-h-[40vh] max-h-[90vh] w-[280px] bg-[#0a0a0a] border border-zinc-900 shadow-2xl flex flex-col font-mono rounded-xl overflow-hidden transition-colors duration-500 ${desktopOpenValue ? "pointer-events-auto" : "pointer-events-none"
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
        className="fixed inset-0 bg-black/95 z-[1000] md:hidden flex flex-col font-mono"
      >
        {renderFileTreeContent(true)}
      </motion.div>
    </>
  );
};
