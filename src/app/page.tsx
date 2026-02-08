"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link"; 
import { Search, Github, Cpu, Calendar, Terminal, ListTodo, ChevronDown, ChevronUp, Star, Shield } from "lucide-react";

// --- TECH TAGS: Translucent Yellow with White Text ---
const LogoModule = ({ lang }: { lang: string }) => {
  const [error, setError] = useState(false);
  const slug = lang?.toLowerCase()
    .replace('c++', 'cplusplus').replace('javascript', 'javascript').replace('typescript', 'typescript');
  
  if (error || !lang) return <div className="text-[10px] font-black text-zinc-600 uppercase border border-zinc-800 px-3 py-1"> {lang || "RAW"} </div>;
  
  return (
    <div className="flex items-center justify-center gap-2 bg-[#facc15]/10 px-4 py-1.5 border border-[#facc15]/20">
      <img src={`https://cdn.simpleicons.org/${slug}/facc15`} className="w-3.5 h-3.5 object-contain" alt={lang} onError={() => setError(true)} draggable="false" />
      <span className="text-[10px] font-black text-white uppercase tracking-tighter">{lang}</span>
    </div>
  );
};

export default function GenesisVault() {
  const [repos, setRepos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/users/Asytuyf/repos?sort=updated").then(res => res.json()).then(data => {
      if (Array.isArray(data)) setRepos(data.filter((r: any) => !r.fork));
      setLoading(false);
    });
  }, []);

  const filtered = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || (r.language && r.language.toLowerCase().includes(search.toLowerCase())));

  return (
    <main className="relative min-h-screen bg-[#050505] text-[#f4f4f5] font-mono overflow-x-hidden selection:bg-[#facc15] selection:text-black">
      <div className="tv-static fixed inset-0 opacity-[0.02] pointer-events-none" />

      {/* --- SOLID YELLOW BARS --- */}
      <div className="fixed inset-x-0 top-0 h-[28px] bg-[#facc15] z-[300] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>MEN AT WORK // UNDER CONSTRUCTION // SYSTEM_ONLINE //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] bg-[#facc15] z-[300] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>MEN AT WORK // UNDER CONSTRUCTION // SYSTEM_ONLINE //</span>)}
        </motion.div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-40">
        <header className="mb-20">
          <div className="flex flex-col mb-12 select-none">
            <h1 className="text-6xl md:text-9xl lg:text-[11rem] font-black tracking-tighter text-white leading-[0.8]">GENESIS</h1>
            <h1 className="text-6xl md:text-9xl lg:text-[11rem] font-black tracking-tighter text-yellow-100 leading-[0.8]">_VAULT.</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 mb-12">
            <Link href="/archive" className="px-10 py-5 bg-[#facc15] text-black font-black uppercase text-sm border-2 border-black hover:bg-white transition-none flex items-center justify-center gap-3">
              <Terminal size={18} strokeWidth={3} /> OPEN_ARCHIVE
            </Link>
            <Link href="/goals" className="px-10 py-5 bg-[#10b981] text-black font-black uppercase text-sm border-2 border-black hover:bg-white transition-none flex items-center justify-center gap-3">
              <ListTodo size={18} strokeWidth={3} /> DIRECTIVE_LOG
            </Link>
          </div>

          <div className="relative max-w-md">
            <input type="text" placeholder="grep -i 'vault'..." className="w-full bg-transparent border-b-4 border-zinc-900 px-0 py-4 text-sm font-black outline-none focus:border-[#facc15] transition-all uppercase placeholder:text-zinc-800 text-[#facc15]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </header>

        {/* --- HORIZONTAL SCROLL CONTAINER (PREVENTS SMOTHERING) --- */}
        <div className="w-full overflow-x-auto pb-10 custom-scrollbar">
          <div className="min-w-[900px] space-y-6">
            
            {/* HEADERS */}
            <div className="grid grid-cols-12 gap-x-8 px-8 mb-4 text-sm uppercase text-zinc-600 font-black tracking-[0.4em]">
              <div className="col-span-5">Manifest_Entry</div>
              <div className="col-span-2 text-center">Tech_Stack</div>
              <div className="col-span-2 text-center">Engagement</div>
              <div className="col-span-2 text-center">Timestamp</div>
              <div className="col-span-1 text-right">Uplink</div>
            </div>

            {loading ? (
               <div className="py-20 text-center text-zinc-800 font-black text-2xl animate-pulse uppercase">Establishing_Link...</div>
            ) : (
              filtered.map((repo) => (
                <div key={repo.id} className="group grid grid-cols-12 gap-x-8 items-center bg-[#0a0a0a] border border-zinc-900 px-8 py-10 hover:border-[#facc15] transition-none">
                  
                  {/* ENTRY */}
                  <div className="col-span-5">
                    <div className="text-2xl font-black text-zinc-400 uppercase tracking-tighter group-hover:text-[#facc15] transition-none">{repo.name}</div>
                    <div className="mt-3 flex items-start gap-3">
                      <p className={`text-xs text-zinc-600 font-bold uppercase leading-relaxed tracking-tight group-hover:text-zinc-300 transition-none ${expandedId === repo.id ? '' : 'line-clamp-2'}`}>
                        {repo.description || "NO_SOURCE_DATA_AVAILABLE"}
                      </p>
                      {repo.description && repo.description.length > 50 && (
                        <button onClick={() => setExpandedId(expandedId === repo.id ? null : repo.id)} className="text-zinc-700 hover:text-[#facc15] mt-0.5 shrink-0 transition-none"><ChevronDown size={14}/></button>
                      )}
                    </div>
                  </div>

                  {/* STACK */}
                  <div className="col-span-2 text-center">
                     <LogoModule lang={repo.language} />
                  </div>

                  {/* STARS */}
                  <div className="col-span-2 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-500 font-bold">
                      <Star size={14} fill="currentColor" />
                      <span className="text-xs font-black">{repo.stargazers_count}</span>
                    </div>
                  </div>

                  {/* TIMESTAMP */}
                  <div className="col-span-2 text-center">
                    <div className="text-zinc-700 font-bold text-[10px] uppercase tracking-widest group-hover:text-zinc-400">
                      <Calendar size={12} className="inline mr-2 mb-0.5"/>
                      {new Date(repo.updated_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* UPLINK */}
                  <div className="col-span-1 text-right">
                    <a href={repo.html_url} target="_blank" className="inline-flex p-1 text-zinc-700 group-hover:text-white transition-none">
                      <Github size={24} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- BACKGROUND DECO --- */}
      <div className="fixed inset-0 z-0 opacity-[0.08] pointer-events-none select-none">
        <div className="absolute top-[12%] left-[5%] flex flex-col items-center">
            <Cpu size={140} strokeWidth={0.5} />
            <span className="text-[10px] mt-2 font-black uppercase tracking-widest text-zinc-700">CPU_LOAD: 0.08</span>
        </div>
        <div className="absolute bottom-[20%] left-[8%] flex flex-col items-center">
            <Shield size={120} strokeWidth={0.5} />
            <span className="text-[10px] mt-2 font-black uppercase tracking-widest text-zinc-700">SHELL: ZSH</span>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #facc15;
        }
      `}</style>
    </main>
  );
}