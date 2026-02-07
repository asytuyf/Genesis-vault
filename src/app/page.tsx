"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link"; // Ensure this is next/link
import { Search, Github, ExternalLink, Box, Activity, Cpu, TriangleAlert, Star, Calendar, Zap, FileCode, Terminal } from "lucide-react";

const LogoModule = ({ lang }: { lang: string }) => {
  const [error, setError] = useState(false);
  const mapping: Record<string, string> = {
    'html': 'html5', 'css': 'css3', 'java': 'java', 'javascript': 'javascript',
    'python': 'python', 'typescript': 'typescript', 'cpp': 'cplusplus', 'c++': 'cplusplus'
  };
  const slug = mapping[lang?.toLowerCase()] || lang?.toLowerCase();
  if (error || !lang) return <div className="flex items-center gap-2 opacity-30"><FileCode size={14} /></div>;

  return (
    <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">
      <img src={`https://cdn.simpleicons.org/${slug}/facc15`} className="w-4 h-4" alt={lang} onError={() => setError(true)} />
      <span className="text-[10px] font-black text-[#facc15] uppercase">{lang}</span>
    </div>
  );
};

export default function GenesisVault() {
  const [repos, setRepos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/users/Asytuyf/repos?sort=updated")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRepos(data.filter((r: any) => !r.fork));
        setLoading(false);
      });
  }, []);

  const filtered = repos.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.language && r.language.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <main className="relative min-h-screen bg-[#050505] text-[#f4f4f5] font-mono overflow-hidden selection:bg-[#facc15] selection:text-black">
      <div className="tv-static" />

      {/* --- TOP/BOTTOM FRAME --- */}
      <div className="fixed inset-x-0 top-0 h-[28px] hazard-bar z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>MEN AT WORK // UNDER CONSTRUCTION //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] hazard-bar z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>MEN AT WORK // UNDER CONSTRUCTION //</span>)}
        </motion.div>
      </div>

      {/* --- STICKERS --- */}
      <motion.div drag className="fixed top-40 right-40 z-[160] w-52 h-52 cursor-grab active:cursor-grabbing select-none">
        <div className="sticker-3d w-full h-full relative bg-black"><img src="/sticker.jpg" className="w-full h-full object-cover grayscale-[0.2]" alt="Art" /><div className="holo-shimmer" /></div>
        <div className="absolute -bottom-2 -right-2 bg-white text-black text-[10px] font-black px-2 py-1 rotate-12 border-2 border-black uppercase">REF_ART_1</div>
      </motion.div>
      <motion.div drag className="fixed bottom-40 left-40 z-[160] w-48 h-48 cursor-grab active:cursor-grabbing select-none">
        <div className="sticker-3d w-full h-full relative bg-black"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a1/Alan_Turing_Aged_16.jpg" className="w-full h-full object-cover" alt="Turing" /><div className="holo-shimmer" /></div>
        <div className="absolute -top-2 -left-2 bg-white text-black text-[10px] font-black px-2 py-1 -rotate-12 border-2 border-black uppercase">REF_ART_2</div>
      </motion.div>
      <motion.div drag className="fixed bottom-32 right-1/4 z-[160] w-56 h-56 cursor-grab active:cursor-grabbing select-none">
        <div className="sticker-3d w-full h-full relative bg-black"><img src="/tesla.jpg" className="w-full h-full object-cover grayscale-[0.1]" alt="Tesla" /><div className="holo-shimmer" /></div>
        <div className="absolute -top-3 -right-3 bg-[#facc15] text-black text-[10px] font-black px-3 py-1 rotate-6 border-2 border-black uppercase">REF_ART_C</div>
      </motion.div>

      {/* --- CONTENT AREA --- */}
      <div className="relative z-10 max-w-7xl mx-auto px-12 md:px-24 py-40">
        <header className="mb-32 flex flex-col gap-10">
          <div className="flex flex-col">
            <h1 className="text-8xl md:text-[11rem] font-black tracking-tighter text-white uppercase leading-[0.75]">GENESIS</h1>
            <h1 className="text-8xl md:text-[11rem] font-black tracking-tighter text-zinc-900 uppercase leading-[0.75]">_VAULT.</h1>
          </div>

          {/* FIX: Functional Button with high z-index and pointer events */}
          <div className="relative z-[200] pointer-events-auto">
            <Link href="/archive" className="inline-flex items-center gap-3 px-8 py-4 bg-[#facc15] text-black font-black uppercase text-sm border-2 border-black hover:scale-105 active:scale-95 transition-all shadow-[6px_6px_0px_rgba(255,255,255,0.1)] cursor-pointer">
              <Terminal size={18} />
              Open_Command_Archive
            </Link>
          </div>

          <div className="relative max-w-md mt-10">
            <input 
              type="text" 
              placeholder="SEARCH_MANIFEST..."
              className="w-full bg-transparent border-b-2 border-zinc-800 px-0 py-3 text-xs font-bold outline-none focus:border-[#facc15] transition-all uppercase placeholder:text-zinc-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute right-0 top-3 text-[#facc15]" size={18} />
          </div>
        </header>

        {/* TABLE */}
        <div className="w-full overflow-hidden">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[10px] uppercase text-zinc-700 font-black tracking-[0.3em]">
                <th className="px-6 pb-4">Entry</th>
                <th className="px-6 pb-4 hidden lg:table-cell text-center">Language</th>
                <th className="px-6 pb-4 hidden md:table-cell text-center">Stars</th>
                <th className="px-6 pb-4 hidden sm:table-cell text-center">Date</th>
                <th className="px-6 pb-4 text-right">Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-20 text-zinc-800 uppercase font-black text-2xl animate-pulse">Establishing Connection...</td></tr>
              ) : (
                filtered.map((repo) => (
                  <tr key={repo.id} className="project-row group">
                    <td className="py-10 px-6 rounded-l-xl">
                      <div className="flex gap-8 items-start">
                        <Box size={24} className="text-zinc-800 group-hover:text-white transition-colors mt-1" />
                        <div>
                          <div className="text-2xl font-black text-zinc-100 uppercase tracking-tighter group-hover:text-[#facc15] transition-colors">{repo.name}</div>
                          <p className="text-[11px] text-zinc-600 mt-1 max-w-xl font-bold uppercase group-hover:text-zinc-400 line-clamp-1">{repo.description || "NO_DATA"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-10 px-6 hidden lg:table-cell text-center"><LogoModule lang={repo.language} /></td>
                    <td className="py-10 px-6 hidden md:table-cell text-center">
                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                         <Star size={12} fill="currentColor" />
                         <span className="text-xs font-black">{repo.stargazers_count}</span>
                       </div>
                    </td>
                    <td className="py-10 px-6 hidden sm:table-cell text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400 font-bold text-[10px]">
                        <Calendar size={12} /><span>{new Date(repo.updated_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-10 px-6 text-right rounded-r-xl">
                      <div className="flex justify-end gap-6 text-zinc-800 group-hover:text-white transition-colors">
                        <a href={repo.html_url} target="_blank" className="hover:scale-150 transition-all"><Github size={24} /></a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="fixed inset-0 z-0 opacity-[0.05] pointer-events-none">
        <div className="absolute top-[10%] left-[5%]"><Activity size={300} /></div>
        <div className="absolute top-[40%] right-[10%]"><Cpu size={400} /></div>
      </div>
    </main>
  );
}