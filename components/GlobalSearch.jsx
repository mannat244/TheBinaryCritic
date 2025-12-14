"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Film, Tv, Calendar, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"; // Ensure accessibility if needed, or just use a hidden DialogTitle

// Simple debounce hook
function useDebounceValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function GlobalSearch({ open, onOpenChange }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("auto"); // auto, movie, tv
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const debouncedQuery = useDebounceValue(query, 350);

  // Reset query when opened
  useEffect(() => {
    if (open) {
        // Optional: focus input
    } else {
        // Optional: clear query on close? 
        // setQuery(""); 
    }
  }, [open]);

  // Search Logic
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      const cacheKey = `search:${mode}:${debouncedQuery.trim().toLowerCase()}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        try {
            const parsed = JSON.parse(cached);
            setResults(parsed);
            setLoading(false);
            return;
        } catch (e) {
            sessionStorage.removeItem(cacheKey);
        }
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=${mode}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        
        // Client-side Ranking & Filtering
        let processed = data.results || [];
        
        // 1. Remove noise
        processed = processed.filter(item => 
            item.poster_path && 
            item.release_date && 
            (item.vote_count > 5 || item.vote_average > 0)
        );

        // 2. Boost Indian Content & Exact Match
        processed.sort((a, b) => {
            const aTitle = a.title?.toLowerCase() || "";
            const bTitle = b.title?.toLowerCase() || "";
            const q = debouncedQuery.toLowerCase();

            if (aTitle === q && bTitle !== q) return -1;
            if (bTitle === q && aTitle !== q) return 1;

            const indianLangs = ['hi', 'ta', 'te', 'ml', 'kn'];
            const aIsIndian = a.origin_country?.includes('IN') || indianLangs.includes(a.original_language);
            const bIsIndian = b.origin_country?.includes('IN') || indianLangs.includes(b.original_language);

            if (aIsIndian && !bIsIndian) return -1;
            if (!aIsIndian && bIsIndian) return 1;

            return b.vote_count - a.vote_count;
        });

        setResults(processed);
        
        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(processed));
        } catch (e) {
            sessionStorage.clear();
        }

      } catch (error) {
        console.error(error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, mode]);

  const handleSelect = (item) => {
    onOpenChange(false);
    if (item.media_type === "movie") {
        router.push(`/movie/${item.id}`);
    } else {
        router.push(`/tv/${item.id}`);
    }
  };

  const movies = results.filter(r => r.media_type === "movie");
  const tvShows = results.filter(r => r.media_type === "tv");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="z-[999] w-[95vw] sm:min-w-[85vw] sm:max-w-[90vw] sm:w-full bg-neutral-950 border-neutral-800 p-0 overflow-hidden gap-0 shadow-2xl sm:rounded-xl top-[5%] translate-y-0 data-[state=open]:slide-in-from-top-5"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        
        {/* Search Header */}
        <div className="flex items-center h-14 sm:h-16 px-3 sm:px-4 border-b border-white/10 bg-neutral-900/50">
            <Search className="w-4 h-4  sm:w-5 sm:h-5 text-neutral-400 mr-2 sm:mr-3 shrink-0" />
            <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent max-w-46 border-none sm:max-w-full outline-none text-base sm:text-lg text-white placeholder:text-neutral-500 h-full min-w-0"
            />
            
            {/* Mode Tabs */}
            <div className="flex items-center gap-0.5 ml-auto sm:gap-1 bg-neutral-800/50 p-0.5 sm:p-1 rounded-lg sm:ml-2 shrink-0">
                {['auto', 'movie', 'tv'].map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={cn(
                            "px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all capitalize",
                            mode === m 
                                ? "bg-neutral-700 text-white shadow-sm" 
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {m === 'movie' ? <span className="sm:hidden">Mov</span> : m === 'tv' ? <span className="sm:hidden">TV</span> : <span className="sm:hidden">{m}</span>}
                        <span className="hidden sm:inline">{m}</span>
                    </button>
                ))}
            </div>
            
            <button 
                onClick={() => onOpenChange(false)}
                className="ml-2 p-1.5 sm:p-2 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors shrink-0"
            >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
        </div>

        {/* Results Body */}
        <div className="h-[70vh] overflow-y-auto custom-scrollbar bg-black/20 p-4 sm:p-6">
            {loading && (
                <div className="flex items-center justify-center h-full text-neutral-500 gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
            )}

            {!loading && query.length > 1 && results.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p>No results found for "{query}"</p>
                </div>
            )}

            {!loading && results.length > 0 && (
                <div className="space-y-8">
                    {/* Movies Section */}
                    {movies.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Film className="w-4 h-4" /> Movies
                            </h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                {movies.map(movie => (
                                    <ResultCard key={movie.id} item={movie} onClick={() => handleSelect(movie)} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TV Section */}
                    {tvShows.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Tv className="w-4 h-4" /> TV Series
                            </h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                {tvShows.map(show => (
                                    <ResultCard key={show.id} item={show} onClick={() => handleSelect(show)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {!loading && query.length < 2 && (
                <div className="flex flex-col items-center justify-center h-full text-neutral-600">
                    <p className="text-sm">Type to search for movies and TV shows</p>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultCard({ item, onClick }) {
    return (
        <div 
            onClick={onClick}
            className="group cursor-pointer bg-neutral-900/50 hover:bg-neutral-800 rounded-xl overflow-hidden transition-all duration-300 border border-white/5 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
        >
            <div className="aspect-[2/3] relative bg-neutral-800 overflow-hidden">
                <Image 
                    src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                    alt={item.title}
                    fill
                    className="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    sizes="(max-width: 768px) 50vw, 20vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                
                {item.vote_average > 0 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-bold text-yellow-500 flex items-center gap-1 border border-white/10">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {item.vote_average.toFixed(1)}
                    </div>
                )}
            </div>
            <div className="p-2 sm:p-3">
                <h4 className="text-xs sm:text-sm font-medium text-white line-clamp-1 group-hover:text-purple-400 transition-colors">
                    {item.title}
                </h4>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-[9px] sm:text-[10px] text-neutral-500 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {item.release_date ? item.release_date.split('-')[0] : 'N/A'}
                    </p>
                    {item.origin_country?.includes('IN') && (
                        <span className="text-[8px] sm:text-[9px] font-bold text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded">IN</span>
                    )}
                </div>
            </div>
        </div>
    );
}

