"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, X, BookOpen, Tag, Clock, Trash2,
  Edit3, Eye, Save, Image, FileText, ChevronDown, ChevronRight, ImagePlus
} from "lucide-react";

interface Tutorial {
  id: string;
  title: string;
  category: string;
  content: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

// IndexedDB helper for storing images separately
const DB_NAME = "library_images_db";
const STORE_NAME = "images";

const openImageDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

const saveImageToDB = async (id: string, data: string): Promise<void> => {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, data });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getImageFromDB = async (id: string): Promise<string | null> => {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
};

// Compress image before storing
const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// Component to load and display images from IndexedDB
const IDBImage = ({ imageId, alt, cache, onLoad }: {
  imageId: string;
  alt: string;
  cache: Record<string, string>;
  onLoad: (id: string, data: string) => void;
}) => {
  const [src, setSrc] = useState<string | null>(cache[imageId] || null);
  const [loading, setLoading] = useState(!cache[imageId]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cache[imageId]) {
      setSrc(cache[imageId]);
      setLoading(false);
      return;
    }

    getImageFromDB(imageId)
      .then((data) => {
        if (data) {
          setSrc(data);
          onLoad(imageId, data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [imageId, cache, onLoad]);

  if (loading) {
    return (
      <div className="my-4 bg-zinc-900 border border-zinc-800 rounded p-8 flex items-center justify-center">
        <span className="text-zinc-600 text-sm">Loading image...</span>
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="my-4 bg-zinc-900 border border-red-900/50 rounded p-8 flex items-center justify-center">
        <span className="text-red-400 text-sm">Image not found</span>
      </div>
    );
  }

  return (
    <div className="my-4">
      <img src={src} alt={alt} className="max-w-full rounded border border-zinc-800" />
      {alt && alt !== "image" && <p className="text-xs text-zinc-600 mt-1">{alt}</p>}
    </div>
  );
};

export default function LibraryPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  // Listen for admin mode changes
  useEffect(() => {
    const checkAdmin = () => {
      const stored = localStorage.getItem("goals_admin_mode");
      setAdminMode(stored === "1");
    };
    checkAdmin();
    window.addEventListener("goals-admin-mode", checkAdmin);
    window.addEventListener("storage", checkAdmin);
    return () => {
      window.removeEventListener("goals-admin-mode", checkAdmin);
      window.removeEventListener("storage", checkAdmin);
    };
  }, []);

  // Form state for add/edit
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [newImagePath, setNewImagePath] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Image cache for IndexedDB images
  const [imageCache, setImageCache] = useState<Record<string, string>>({});

  // Helper to insert image markdown at cursor
  const insertImageMarkdown = useCallback((src: string, alt = "image") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormContent(prev => prev + `\n![${alt}](${src})\n`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const imageMarkdown = `\n![${alt}](${src})\n`;

    setFormContent(prev => prev.slice(0, start) + imageMarkdown + prev.slice(end));

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + imageMarkdown.length;
      textarea.focus();
    }, 0);
  }, []);

  // Handle pasting images or URLs directly into content
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for pasted text first (could be an image URL)
    const text = clipboardData.getData("text/plain");
    if (text && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(text)) {
      e.preventDefault();
      insertImageMarkdown(text);
      return;
    }

    // Check for HTML (e.g., copying an image from a webpage)
    const html = clipboardData.getData("text/html");
    if (html) {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1].startsWith("http")) {
        e.preventDefault();
        insertImageMarkdown(imgMatch[1]);
        return;
      }
    }

    // Check for actual image file (screenshot, etc.)
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        // Compress and store in IndexedDB
        const compressed = await compressImage(file);
        const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await saveImageToDB(imageId, compressed);

        // Cache it for immediate display
        setImageCache(prev => ({ ...prev, [imageId]: compressed }));

        insertImageMarkdown(`idb://${imageId}`);
        break;
      }
    }
  };

  // Handle file input for images
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    // Compress and store in IndexedDB
    const compressed = await compressImage(file);
    const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await saveImageToDB(imageId, compressed);

    // Cache it for immediate display
    setImageCache(prev => ({ ...prev, [imageId]: compressed }));

    insertImageMarkdown(`idb://${imageId}`);
    e.target.value = ""; // Reset input
  };

  // Load tutorials from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("library_tutorials");
      if (saved) {
        try {
          setTutorials(JSON.parse(saved));
        } catch {
          setTutorials([]);
        }
      }
    }
  }, []);

  // Save tutorials to localStorage
  const saveTutorials = (newTutorials: Tutorial[]) => {
    setTutorials(newTutorials);
    localStorage.setItem("library_tutorials", JSON.stringify(newTutorials));
  };

  const filtered = tutorials.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase()) ||
    t.content?.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setFormTitle("");
    setFormCategory("");
    setFormContent("");
    setFormImages([]);
    setShowAddModal(true);
    setIsEditing(false);
  };

  const openEditModal = (tutorial: Tutorial) => {
    setFormTitle(tutorial.title);
    setFormCategory(tutorial.category);
    setFormContent(tutorial.content);
    setFormImages(tutorial.images || []);
    setSelectedTutorial(tutorial);
    setIsEditing(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setSelectedTutorial(null);
    setIsEditing(false);
    setFormTitle("");
    setFormCategory("");
    setFormContent("");
    setFormImages([]);
  };

  const addImagePath = () => {
    if (newImagePath.trim() && !formImages.includes(newImagePath.trim())) {
      setFormImages([...formImages, newImagePath.trim()]);
      setNewImagePath("");
    }
  };

  const removeImagePath = (path: string) => {
    setFormImages(formImages.filter(p => p !== path));
  };

  const saveTutorial = () => {
    if (!formTitle.trim()) return;

    const now = new Date().toISOString();

    if (isEditing && selectedTutorial) {
      // Update existing
      const updated = tutorials.map(t =>
        t.id === selectedTutorial.id
          ? {
              ...t,
              title: formTitle,
              category: formCategory,
              content: formContent,
              images: formImages,
              updatedAt: now
            }
          : t
      );
      saveTutorials(updated);
    } else {
      // Add new
      const newTutorial: Tutorial = {
        id: Date.now().toString(),
        title: formTitle,
        category: formCategory,
        content: formContent,
        images: formImages,
        createdAt: now,
        updatedAt: now
      };
      saveTutorials([newTutorial, ...tutorials]);
    }
    closeModal();
  };

  const deleteTutorial = (id: string) => {
    saveTutorials(tutorials.filter(t => t.id !== id));
    closeModal();
  };

  // Simple markdown-like renderer
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeBlockIndex = 0;

    lines.forEach((line, index) => {
      // Code block handling
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${codeBlockIndex}`} className="bg-black border border-zinc-800 p-4 my-4 overflow-x-auto text-sm text-zinc-300 font-mono rounded">
              <code>{codeContent.join("\n")}</code>
            </pre>
          );
          codeContent = [];
          codeBlockIndex++;
        }
        inCodeBlock = !inCodeBlock;
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith("### ")) {
        elements.push(<h3 key={index} className="text-lg font-bold text-white mt-6 mb-2">{line.slice(4)}</h3>);
        return;
      }
      if (line.startsWith("## ")) {
        elements.push(<h2 key={index} className="text-xl font-bold text-white mt-6 mb-3">{line.slice(3)}</h2>);
        return;
      }
      if (line.startsWith("# ")) {
        elements.push(<h1 key={index} className="text-2xl font-black text-white mt-6 mb-4">{line.slice(2)}</h1>);
        return;
      }

      // Image
      const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        const alt = imgMatch[1];
        let src = imgMatch[2];

        // Handle IndexedDB images
        if (src.startsWith("idb://")) {
          const imageId = src.slice(6);
          elements.push(
            <IDBImage key={index} imageId={imageId} alt={alt} cache={imageCache} onLoad={(id, data) => setImageCache(prev => ({ ...prev, [id]: data }))} />
          );
          return;
        }

        // If it's just a filename, prepend /tutorials/
        // But don't modify data: URLs (base64 images) or absolute paths/URLs
        if (!src.startsWith("/") && !src.startsWith("http") && !src.startsWith("data:")) {
          src = `/tutorials/${src}`;
        }
        elements.push(
          <div key={index} className="my-4">
            <img src={src} alt={alt} className="max-w-full rounded border border-zinc-800" />
            {alt && alt !== "image" && <p className="text-xs text-zinc-600 mt-1">{alt}</p>}
          </div>
        );
        return;
      }

      // Inline formatting
      let formattedLine = line;
      // Bold
      formattedLine = formattedLine.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>');
      // Inline code
      formattedLine = formattedLine.replace(/`([^`]+)`/g, '<code class="bg-black px-1.5 py-0.5 text-red-400 text-sm rounded border border-zinc-800">$1</code>');

      if (line.trim() === "") {
        elements.push(<div key={index} className="h-3" />);
      } else {
        elements.push(
          <p key={index} className="text-zinc-300 leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />
        );
      }
    });

    return elements;
  };

  const getPreview = (content: string) => {
    // Get first 100 chars without markdown
    const plain = content
      .replace(/```[\s\S]*?```/g, "")
      .replace(/#+\s/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[.*?\]\(.*?\)/g, "[image]")
      .trim();
    return plain.length > 100 ? plain.slice(0, 100) + "..." : plain;
  };

  const categories = [...new Set(tutorials.map(t => t.category).filter(Boolean))];

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-hidden p-6 pt-16 md:p-24">
      {/* HAZARD BARS */}
      <div className="fixed inset-x-0 top-0 h-[28px] bg-red-500 z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] bg-red-500 z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>

      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
        <BookOpen size={600} strokeWidth={0.5} />
      </div>

      {/* HEADER */}
      <header className="relative z-10 mb-16">
        <div className="flex flex-col mb-10 select-none">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85] md:leading-[0.8]">
            KNOWLEDGE
          </h1>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-700 uppercase leading-[0.85] md:leading-[0.8]">
            _VAULT.
          </h2>
        </div>

        <div className="text-zinc-600 mb-8 text-xs md:text-sm font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span>Store tutorials and reference guides with markdown support</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="grep -i 'tutorial'..."
              className="w-full bg-transparent border-b-2 border-zinc-900 px-0 py-2 text-sm font-black outline-none focus:border-red-500 transition-all uppercase placeholder:text-zinc-800 text-red-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {adminMode && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-red-700/30 text-red-400 px-5 py-2.5 text-sm font-bold uppercase border border-red-500/30 hover:bg-red-700/50 transition-colors"
            >
              <Plus size={18} /> Add Tutorial
            </button>
          )}
        </div>

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSearch(cat)}
                className="px-3 py-1 text-xs font-bold uppercase border border-zinc-800 text-zinc-500 hover:border-red-500/50 hover:text-red-400 transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* TUTORIAL GRID */}
      <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-zinc-800 uppercase font-black text-xl text-center border border-dashed border-zinc-900">
            {tutorials.length === 0 ? "No tutorials yet. Add your first one!" : "No matching tutorials found"}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((tutorial) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
                key={tutorial.id}
                onClick={() => {
                  setSelectedTutorial(tutorial);
                  setIsEditing(false);
                }}
                className="group bg-[#0a0a0a] border border-zinc-800 p-6 hover:border-red-500 transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Delete button - admin only */}
                {adminMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTutorial(tutorial.id); }}
                    className="absolute top-4 right-4 text-zinc-800 hover:text-red-500 transition-colors z-20 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Category tag */}
                <div className="flex items-center gap-2 mb-4">
                  {tutorial.category && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 text-[10px] font-black uppercase tracking-widest group-hover:border-red-500/30 group-hover:text-red-400 transition-colors">
                      <Tag size={10} />
                      {tutorial.category}
                    </span>
                  )}
                  {tutorial.images?.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-600 text-[10px]">
                      <Image size={10} />
                      {tutorial.images.length}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold uppercase tracking-tight text-zinc-100 group-hover:text-white transition-colors mb-3">
                  {tutorial.title}
                </h3>

                {/* Preview */}
                <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                  {getPreview(tutorial.content)}
                </p>

                {/* Date */}
                <div className="flex items-center gap-2 text-zinc-700 text-[10px] font-bold">
                  <Clock size={12} />
                  {new Date(tutorial.updatedAt).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      <AnimatePresence>
        {(showAddModal || (selectedTutorial && isEditing)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-zinc-800 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black uppercase tracking-wider text-red-400">
                  {isEditing ? "Edit Tutorial" : "New Tutorial"}
                </h2>
                <button onClick={closeModal} className="text-zinc-600 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Tutorial title..."
                  className="w-full bg-black border border-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g., NixOS, Git, Docker..."
                  className="w-full bg-black border border-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-red-500 transition-colors"
                />
              </div>

              {/* Content */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600">
                    Content (Markdown)
                  </label>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors cursor-pointer">
                    <ImagePlus size={14} />
                    <span>Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="text-[9px] text-zinc-700 mb-2">
                  Supports: # Headers, **bold**, `code`, ```code blocks```. Paste images directly or click Add Image.
                </div>
                <textarea
                  ref={textareaRef}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Write your tutorial content here... Paste images directly!"
                  rows={14}
                  className="w-full bg-black border border-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-red-500 transition-colors font-mono resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={saveTutorial}
                  className="flex-1 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Save Tutorial
                </button>
                <button
                  onClick={closeModal}
                  className="px-6 py-3 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW MODAL */}
      <AnimatePresence>
        {selectedTutorial && !isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border border-zinc-800"
            >
              {/* Header */}
              <div className="sticky top-0 bg-[#0a0a0a] border-b border-zinc-800 p-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  {selectedTutorial.category && (
                    <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase">
                      {selectedTutorial.category}
                    </span>
                  )}
                  <h2 className="text-lg font-bold text-white">{selectedTutorial.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {adminMode && (
                    <>
                      <button
                        onClick={() => openEditModal(selectedTutorial)}
                        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Edit"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => deleteTutorial(selectedTutorial.id)}
                        className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                  <button onClick={closeModal} className="p-2 text-zinc-600 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {renderContent(selectedTutorial.content)}
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-800 p-4 text-[10px] text-zinc-600">
                Last updated: {new Date(selectedTutorial.updatedAt).toLocaleString()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
