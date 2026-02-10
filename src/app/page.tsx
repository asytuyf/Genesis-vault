"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, Github, Cpu, Calendar, Terminal, ListTodo, ChevronDown, Star, Home } from "lucide-react";

// --- SCALED TECH TAGS ---
const LogoModule = ({ lang }: { lang: string }) => {
  const [error, setError] = useState(false);

  const getSlug = (text: string) => {
    if (!text) return "";
    const lower = text.toLowerCase();
    const map: Record<string, string> = {
      'html': 'html5',
      'css': 'css3',
      'c++': 'cplusplus',
      'c#': 'csharp',
      'jupyter notebook': 'jupyter',
      'shell': 'gnubash',
      'vim script': 'vim',
      'vue': 'vuedotjs',
      'nix': 'nixos',
      'java': 'openjdk', // or 'java', but openjdk is often safer for generic java
      'python': 'python',
      'javascript': 'javascript',
      'typescript': 'typescript',
      'dockerfile': 'docker',
      'scss': 'sass',
      'rust': 'rust',
      'go': 'go',
      'kotlin': 'kotlin',
      'ruby': 'ruby',
      'php': 'php',
      'swift': 'swift',
    };
    return map[lower] || lower;
  };

  const slug = getSlug(lang);
  
  if (error || !lang) return <div className="text-[9px] md:text-[10px] font-black text-zinc-600 uppercase border border-zinc-800 px-2 py-0.5"> {lang || "RAW"} </div>;
  
  return (
    <div className="flex items-center justify-center gap-1.5 md:gap-2 bg-[#facc15]/10 px-2 md:px-4 py-1 md:py-1.5 border border-[#facc15]/20">
      <img src={`https://cdn.simpleicons.org/${slug}/facc15`} className="w-3 h-3 md:w-3.5 md:h-3.5 object-contain" alt={lang} onError={() => setError(true)} draggable="false" />
      <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-tighter">{lang}</span>
    </div>
  );
};

export default function GenesisVault() {
  const [repos, setRepos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/users/Asytuyf/repos?sort=updated").then(res => res.json()).then(data => {
      if (Array.isArray(data)) setRepos(data.filter((r: any) => !r.fork));
      setLoading(false);
    });
  }, []);

  const filtered = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || (r.language && r.language.toLowerCase().includes(search.toLowerCase())));

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-x-hidden selection:bg-[#facc15] selection:text-black">
      <div className="tv-static fixed inset-0 opacity-[0.02] pointer-events-none" />
      <div className="fixed inset-0 z-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
        <div className="relative translate-y-10 md:translate-y-14">
          <Home size={700} strokeWidth={0.5} className="text-white/40" />
          <Home
            size={700}
            strokeWidth={0.5}
            className="absolute left-0 top-0 translate-x-6 translate-y-6 text-white/10"
          />
        </div>
      </div>

      {/* --- 3D STICKERS WITH TAGS --- */}
      <motion.div
        drag
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        className="fixed top-24 md:top-32 right-6 md:right-16 w-52 h-52 md:w-72 md:h-72 z-[250] cursor-grab active:cursor-grabbing"
      >
        <div className="sticker-3d w-full h-full">
          <img src="/sticker.jpg" alt="Sticker" className="w-full h-full object-cover" draggable="false" />
        </div>
        <div className="absolute top-2 left-2 bg-[#facc15] text-black px-3 py-1.5 text-xs md:text-sm font-black border-2 border-black shadow-lg z-20">
          art_ref_1
        </div>
      </motion.div>

      <motion.div
        drag
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        className="fixed top-[60%] md:top-[55%] left-6 md:left-20 w-48 h-48 md:w-68 md:h-68 z-[250] cursor-grab active:cursor-grabbing"
      >
        <div className="sticker-3d w-full h-full">
          <img src="/tesla.jpg" alt="Tesla" className="w-full h-full object-cover" draggable="false" />
        </div>
        <div className="absolute top-2 right-2 bg-[#10b981] text-black px-3 py-1.5 text-xs md:text-sm font-black border-2 border-black shadow-lg z-20">
          exhibit_c
        </div>
      </motion.div>

      <motion.div
        drag
        dragElastic={0.1}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        className="fixed bottom-24 md:bottom-32 right-12 md:right-24 w-44 h-44 md:w-64 md:h-64 z-[250] cursor-grab active:cursor-grabbing"
      >
        <div className="sticker-3d w-full h-full">
          <img src="/turing.jpeg" alt="Alan Turing" className="w-full h-full object-cover" draggable="false" />
        </div>
        <div className="absolute bottom-2 left-2 bg-[#facc15] text-black px-3 py-1.5 text-xs md:text-sm font-black border-2 border-black shadow-lg z-20">
          art_ref_2
        </div>
      </motion.div>

      {/* --- SOLID YELLOW BARS --- */}
      <div className="fixed inset-x-0 top-0 h-[28px] bg-[#facc15] z-[300] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="flex whitespace-nowrap text-[10px] md:text-[12px] font-black text-black tracking-[1.5em] md:tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] bg-[#facc15] z-[300] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="flex whitespace-nowrap text-[10px] md:text-[12px] font-black text-black tracking-[1.5em] md:tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-40">
        <header className="mb-16 md:mb-20">
          <div className="flex flex-col mb-10 select-none">
            {/* GENESIS (White) _VAULT. (Gray) */}
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85] md:leading-[0.8]">GENESIS</h1>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-600 leading-[0.85] md:leading-[0.8]">_VAULT.</h1>
          </div>

          <div className="text-zinc-600 mb-10 text-xs md:text-sm font-black uppercase tracking-wider">
            <div className="flex items-center gap-2 mb-2 hidden md:flex">
              <Terminal size={14} />
              <span>Hover on the left edge to open file explorer</span>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Terminal size={14} />
              <span>Tap the top-left menu to open file explorer</span>
            </div>
          </div>

          <div className="relative max-w-sm">
            <input type="text" placeholder="grep -i 'vault'..." className="w-full bg-transparent border-b-2 border-zinc-900 px-0 py-2 text-sm font-black outline-none focus:border-yellow-400 transition-all uppercase placeholder:text-zinc-800 text-yellow-400" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </header>

        {/* --- OPTIMIZED RESPONSIVE MANIFEST --- */}
        <div className="w-full overflow-x-auto pb-10 custom-scrollbar">
          <div className="min-w-[650px] md:min-w-[1000px] space-y-4 md:space-y-6">
            
            {/* HEADERS */}
            <div className="grid grid-cols-12 gap-x-4 md:gap-x-8 px-4 md:px-8 mb-4 text-[9px] md:text-sm uppercase text-zinc-600 font-black tracking-[0.3em] md:tracking-[0.4em]">
              <div className="col-span-5">Manifest_Entry</div>
              <div className="col-span-2 text-center">Tech_Stack</div>
              <div className="col-span-2 text-center">Engagement</div>
              <div className="col-span-2 text-center">Timestamp</div>
              <div className="col-span-1 text-right">Uplink</div>
            </div>

            {loading ? (
               <div className="py-20 text-center text-zinc-800 font-black text-xl md:text-2xl animate-pulse">Establishing_Link...</div>
            ) : (
              filtered.map((repo) => (
                <div key={repo.id} className="group grid grid-cols-12 gap-x-4 md:gap-x-8 items-center bg-[#0a0a0a] border border-zinc-900 px-4 md:px-8 py-6 md:py-10 hover:border-[#facc15] transition-none">
                  
                  {/* ENTRY - Scales from text-lg to 2xl */}
                  <div className="col-span-5">
                    <div className="text-base md:text-2xl font-black text-zinc-400 uppercase tracking-tighter group-hover:text-[#facc15] transition-none">{repo.name}</div>
                    <div className="mt-1 md:mt-3 flex items-start gap-2">
                      <p className={`text-[9px] md:text-xs text-zinc-600 font-bold uppercase leading-relaxed tracking-tight group-hover:text-zinc-300 transition-none`}>
                        {repo.description || "NO_SOURCE_DATA_AVAILABLE"}
                      </p>
                    </div>
                  </div>

                  {/* STACK */}
                  <div className="col-span-2 text-center">
                     <LogoModule lang={repo.language} />
                  </div>

                  {/* ACTIVITY */}
                  <div className="col-span-2 text-center">
                    <div className="inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-500 font-bold text-[9px] md:text-sm">
                      <Star size={12} fill="currentColor" />
                      <span>{repo.stargazers_count}</span>
                    </div>
                  </div>

                  {/* TIMESTAMP */}
                  <div className="col-span-2 text-center">
                    <div className="text-zinc-700 font-bold text-[8px] md:text-[10px] uppercase tracking-widest group-hover:text-zinc-400 transition-none">
                      {new Date(repo.updated_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* UPLINK */}
                  <div className="col-span-1 text-right">
                    <a href={repo.html_url} target="_blank" className="p-1 text-zinc-700 group-hover:text-white transition-none inline-block">
                      <Github size={20} className="md:w-6 md:h-6" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0d0d0d;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #222;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #facc15;
        }
      `}</style>
    </main>
  );
}
