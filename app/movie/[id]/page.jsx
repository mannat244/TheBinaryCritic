"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { browserCacheFetch } from "@/lib/browserCache";
import Navbar from "@/components/Navbar";
import { GradientBackground } from "@/components/ui/gradient-background";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MediaActions from "@/components/MediaActions";
import { Play, Star, Clock, Calendar, Check, Bookmark, Share2, Loader2, Eye } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StreamingCard from "@/components/StreamingCard";
import ReviewCard from "@/components/ReviewCard";
import ReviewFeed from "@/components/ReviewFeed";
import { useMediaStore } from "@/hooks/useMediaStore";
import { toast } from "sonner";
import VerdictRadialChart from "@/components/VerdictRadialChart";
import { CommunityBreakdown } from "@/components/CommunityBreakdownBars";

export default function Page() {
  const { id } = useParams();
  const { data: session } = useSession();
  const { watched } = useMediaStore();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [trailerId, setTrailerId] = useState(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);

  const userHasReviewed = reviews.some(r => r.userId?._id === session?.user?.id || r.userId?.email === session?.user?.email);

  const [stats, setStats] = useState(null);

  const fetchStats = async () => {
    const res = await fetch(
      `/api/stats?mediaId=${id}&mediaType=movie`
    );
    const data = await res.json();
    setStats(data.stats);
  };


  useEffect(() => {
    if (id) fetchStats();
  }, [id]);


  const handleReviewSubmit = async (data) => {
    if (!session) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch("/api/review/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: id,
          mediaType: "movie",
          ...data
        })
      });

      if (!res.ok) throw new Error("Failed to submit review");

      // Refresh reviews
      fetchReviews();
      fetchStats();


      // success
      toast.success("Review submitted successfully!", {
        description: "Your verdict is now live on The Binary Critic",
      });
    } catch (error) {
      console.error(error);

      toast.error("Failed to submit review", {
        description: "Please try again in a moment",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };


  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?mediaId=${id}&mediaType=movie&sort=${sortBy}&page=${currentPage}&limit=10`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setTotalReviews(data.totalCount || 0);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReviews();
    }
  }, [id, sortBy, currentPage]);

  useEffect(() => {
    const load = async () => {
      const key = `movie_${id}`;
      const data = await browserCacheFetch(
        key,
        async () => {
          const res = await fetch("/api/movie", {
            method: "POST",
            body: JSON.stringify({ id }),
          });
          return res.json();
        },
        60 * 60 // TTL = 1 hour
      );
      setMovie(data);
      setLoading(false);
      // Set document title to movie name
      if (data && data.title) {
        document.title = `${data.title} | The Binary Critic`;
      }
    };
    load();
  }, [id]);

  // Prefetch trailer when movie data is available
  useEffect(() => {
    if (movie) {
      fetchTrailer(movie);
    }
  }, [movie]);

  const fetchTrailer = async (currentMovie) => {
    setTrailerLoading(true);
    setTrailerId(null);

    // 1. Try to find a trailer in TMDB data
    const videos = currentMovie.videos?.results || [];
    const officialTrailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer" && v.official);
    const anyTrailer = videos.find(v => v.site === "YouTube" && v.type === "Trailer");
    const anyVideo = videos.find(v => v.site === "YouTube");

    const bestVideo = officialTrailer || anyTrailer || anyVideo;

    if (bestVideo) {
      setTrailerId(bestVideo.key);
      setTrailerLoading(false);
      return;
    }

    // 2. If no TMDB video, fetch from SerpApi via our API (with Browser Caching)
    try {
      const trailerKey = `trailer_${currentMovie.id}`;

      const data = await browserCacheFetch(
        trailerKey,
        async () => {
          const res = await fetch("/api/trailer", {
            method: "POST",
            body: JSON.stringify({
              id: currentMovie.id,
              title: currentMovie.title,
              year: new Date(currentMovie.release_date).getFullYear()
            }),
          });
          return res.json();
        },
        24 * 60 * 60 // TTL = 24 hours
      );

      if (data.videoId) {
        setTrailerId(data.videoId);
      }
    } catch (error) {
      console.error("Failed to fetch trailer", error);
    } finally {
      setTrailerLoading(false);
    }
  };

  const handlePlayTrailer = () => {
    setTrailerOpen(true);
  };

  // Helper to format runtime (e.g., 214 -> 3h 34m)
  const formatRuntime = (minutes) => {
    if (!minutes) return "N/A";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // Helper to get year
  const getYear = (date) => {
    if (!date) return "N/A";
    return new Date(date).getFullYear();
  };

  // Data Extractors
  const getDirector = () => movie.credits?.crew?.find((c) => c.job === "Director")?.name || "Unknown";
  const getCountry = () => movie.production_countries?.[0]?.name || "Unknown";
  const getLanguage = () => movie.spoken_languages?.[0]?.english_name || "Unknown";

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-sans overflow-hidden">
        <Navbar />

        {/* Hero Section Skeleton */}
        <div className="relative w-full h-[25vh] md:h-screen bg-neutral-900 animate-pulse">
          <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-6 relative z-10 -mt-14 md:-mt-48 pb-20">

          {/* Desktop Layout (Hidden on Mobile) */}
          <div className="hidden md:flex relative -top-54 flex-row gap-8 items-end">
            {/* Poster Skeleton */}
            <div className="shrink-0 w-56 aspect-[2/3] rounded-lg bg-neutral-800 shadow-2xl border border-white/5 animate-pulse" />

            {/* Text Info Skeleton */}
            <div className="flex-1 space-y-4 pb-4">
              <div className="flex gap-3">
                <Skeleton className="h-4 w-20 bg-neutral-800" />
                <Skeleton className="h-4 w-12 bg-neutral-800" />
                <Skeleton className="h-4 w-16 bg-neutral-800" />
              </div>
              <Skeleton className="h-16 w-3/4 bg-neutral-800" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full bg-neutral-800/60" />
                <Skeleton className="h-4 w-full bg-neutral-800/60" />
                <Skeleton className="h-4 w-2/3 bg-neutral-800/60" />
              </div>
              <div className="flex gap-12 pt-6 border-t border-white/5 mt-6">
                <div className="space-y-2"><Skeleton className="h-3 w-16 bg-neutral-800" /><Skeleton className="h-5 w-24 bg-neutral-800" /></div>
                <div className="space-y-2"><Skeleton className="h-3 w-16 bg-neutral-800" /><Skeleton className="h-5 w-24 bg-neutral-800" /></div>
                <div className="space-y-2"><Skeleton className="h-3 w-16 bg-neutral-800" /><Skeleton className="h-5 w-24 bg-neutral-800" /></div>
              </div>
            </div>
          </div>

          {/* Mobile Layout (Hidden on Desktop) */}
          <div className="md:hidden">
            {/* Header Row: Poster + Info */}
            <div className="flex gap-5 mb-8 items-end">
              {/* Poster (Left) */}
              <div className="w-32 shrink-0 aspect-[2/3] rounded-lg bg-neutral-800 shadow-2xl border border-white/5 animate-pulse" />

              {/* Title & Metadata (Right) */}
              <div className="flex-1 min-w-0 pb-1 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-12 bg-neutral-800" />
                  <Skeleton className="h-3 w-8 bg-neutral-800" />
                </div>
                <Skeleton className="h-8 w-full bg-neutral-800" />
                <Skeleton className="h-3 w-16 bg-neutral-800" />
              </div>
            </div>

            {/* Info Grid (Minified) */}
            <div className="grid grid-cols-3 gap-4 border-y border-white/5 py-4 mb-6">
              <div className="space-y-2"><Skeleton className="h-3 w-full bg-neutral-800" /><Skeleton className="h-4 w-full bg-neutral-800" /></div>
              <div className="space-y-2"><Skeleton className="h-3 w-full bg-neutral-800" /><Skeleton className="h-4 w-full bg-neutral-800" /></div>
              <div className="space-y-2"><Skeleton className="h-3 w-full bg-neutral-800" /><Skeleton className="h-4 w-full bg-neutral-800" /></div>
            </div>

            {/* Overview */}
            <div className="space-y-2 mb-6">
              <Skeleton className="h-4 w-24 bg-neutral-800 mb-2" />
              <Skeleton className="h-3 w-full bg-neutral-800/60" />
              <Skeleton className="h-3 w-full bg-neutral-800/60" />
              <Skeleton className="h-3 w-full bg-neutral-800/60" />
              <Skeleton className="h-3 w-2/3 bg-neutral-800/60" />
            </div>
          </div>

          {/* Cast Skeleton (Shared) */}
          <div className="mt-12 md:mt-20 space-y-6">
            <Skeleton className="h-8 w-48 bg-neutral-800" />
            <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square rounded-full bg-neutral-800" />
                  <Skeleton className="h-3 w-20 mx-auto bg-neutral-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) return <div className="text-white text-center mt-20">Movie not found</div>;

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <Navbar />

      {/* ----------------------------------------------------
          HERO SECTION (Backdrop + Gradient)
      ----------------------------------------------------- */}
      <div className="relative w-full mt-14 h-[25vh] md:mt-0 md:h-screen overflow-hidden group">
        {/* Backdrop Image */}
        {movie.backdrop_path ? (
          <Image
            src={
              movie.backdrop_path.startsWith('https://')
                ? movie.backdrop_path
                : `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
            }
            alt={movie.title}
            fill
            className="object-cover object-top opacity-80"
            priority
          />
        ) : movie.poster_path && (
          <Image
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
            alt={movie.title}
            sizes="342px"
            fill
            className="object-cover object-center opacity-80 blur-sm"
            priority
          />
        )}

        {/* Gradient Overlay (Immersive Fade) */}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent" />


        {/* CENTER PLAY BUTTON (Mobile & Desktop) */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <button
            onClick={handlePlayTrailer}
            className="group/play relative flex items-center justify-center transition-all duration-500  bg-black/50 border border-neutral-800/70 rounded-full backdrop-blur-md hover:scale-110 cursor-pointer"
          >
            <Play className="w-10 h-10 p-2.5 md:w-12 md:h-12 text-white/80 group-hover/play:text-purple-400 transition-all duration-500" strokeWidth={1.5} />
          </button>
        </div>

        {/* TRAILER DIALOG */}
        <Dialog open={trailerOpen} onOpenChange={setTrailerOpen}>
          <DialogContent className="min-w-[80vw] w-full bg-black border-white/10 p-0 overflow-hidden aspect-video">
            <DialogHeader className="sr-only">
              <DialogTitle>{movie.title} Trailer</DialogTitle>
            </DialogHeader>

            {trailerLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : trailerId ? (
              <iframe
                src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                title={`${movie.title} Trailer`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-neutral-400 gap-4">
                <p>Trailer not found.</p>
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + " trailer")}`, "_blank")}
                >
                  Search on YouTube
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Content Container (Desktop Only) */}
        <div className="absolute inset-0 hidden md:flex items-end pb-10">
          <div className="max-w-7xl mx-auto px-6 w-full flex items-end gap-8">

            {/* POSTER (Desktop) */}
            <div className="relative shrink-0 group perspective-1000">
              {/* Reflection/Glow */}
              <div className="absolute -inset-1 bg-linear-to-t from-purple-500/20 to-transparent blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="w-56 aspect-2/3 rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/5 relative z-10 transition-transform duration-700 group-hover:rotate-y-6 group-hover:scale-100 bg-neutral-900">
                {movie.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                    alt={movie.title}
                    fill
                    sizes="342px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-neutral-500">
                    No Poster
                  </div>
                )}
              </div>
            </div>

            {/* TEXT INFO (Desktop) */}
            <div className="flex-1 mb-4 pl-6">
              {/* Top Meta Line */}
              <div className="flex items-center gap-3 text-purple-300/80 text-xs font-bold tracking-[0.2em] uppercase mb-3">
                <span>Movie</span>
                <span className="text-white/20">•</span>
                <span>{getYear(movie.release_date)}</span>
                <span className="text-white/20">•</span>
                <span>{formatRuntime(movie.runtime)}</span>
              </div>

              {/* Title */}
              <h1 className="text-5xl font-bold tracking-tighter drop-shadow-2xl mb-6 bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
                {movie.title}
              </h1>

              <div>
                <p className="text-neutral-300 mb-5 leading-relaxed text-base text-left bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
                  {movie.overview}
                </p>

                {/* ACTIONS (Desktop) */}
                <div className="mt-6 mb-6">
                  <MediaActions
                    tmdbId={id}
                    hasUserReview={userHasReviewed}
                    mediaType="movie"
                    title={movie.title}
                    posterPath={movie.poster_path} releaseDate={movie.release_date} />
                </div>
              </div>


              {/* Info Grid */}
              <div className="grid grid-cols-4 gap-12 border-t border-white/5 pt-6">
                <div>
                  <p className="text-neutral-500 text-[10px] uppercase tracking-widest mb-2">Directed By</p>
                  <p className="text-white font-medium text-base">{getDirector()}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-[10px] uppercase tracking-widest mb-2">Country</p>
                  <p className="text-white font-medium text-base">{getCountry()}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-[10px] uppercase tracking-widest mb-2">Language</p>
                  <p className="text-white font-medium text-base">{getLanguage()}</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
      <div className="max-w-[85%] hidden xl:block mx-auto pb-10 bg-black">
        {/* Keywords (Desktop) */}
        {movie.keywords?.keywords?.length > 0 && (
          <div className="mt-0 flex flex-wrap justify-evenly gap-2">
            {movie.keywords.keywords.slice(0, 10).map((keyword) => (
              <Badge
                key={keyword.id}
                variant="outline"
                className="bg-white/5 cursor-default border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors px-3 py-1.5 text-sm capitalize tracking-wide"
              >
                {keyword.name}
              </Badge>
            ))}
          </div>
        )}
      </div>


      {/* ----------------------------------------------------
          MOBILE CONTENT (Below Fold)
      ----------------------------------------------------- */}
      <div className="md:hidden px-6 relative z-10 pb-10 -mt-14">

        {/* Header Row: Poster + Info */}
        <div className="flex gap-5 mb-8 items-end">
          {/* Poster (Left) */}
          <div className="w-32 shrink-0 aspect-2/3 rounded-lg overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 relative">
            {movie.poster_path && (
              <Image
                src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                alt={movie.title}
                fill
                sizes="342px"
                className="object-cover"
              />
            )}
          </div>

          {/* Title & Metadata (Right) */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 text-purple-300/80 text-[10px] font-bold tracking-wider uppercase mb-2">
              <span>Movie</span>
              <span className="text-white/20">•</span>
              <span>{getYear(movie.release_date)}</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent font-sans drop-shadow-md leading-tight mb-2">
              {movie.title}
            </h1>

            <div className="text-neutral-400 text-xs font-medium">
              {formatRuntime(movie.runtime)}
            </div>

            {/* ACTIONS (Mobile) */}
            <div className="mt-3">
              <MediaActions
                tmdbId={id}
                mediaType="movie"
                title={movie.title}
                posterPath={movie.poster_path}
                releaseDate={movie.release_date}
              />
            </div>
          </div>
        </div>

        {/* Info Grid (Minified) */}
        <div className="grid grid-cols-3 gap-4 border-y border-white/5 py-4 mb-6">
          <div>
            <p className="text-neutral-500 text-[10px] uppercase tracking-widest mb-1">Director</p>
            <p className="text-white font-medium text-sm truncate">{getDirector()}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-[10px] uppercase tracking-widest mb-1">Country</p>
            <p className="text-white font-medium text-sm truncate">{getCountry()}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-[10px] uppercase tracking-widest mb-1">Language</p>
            <p className="text-white font-medium text-sm truncate">{getLanguage()}</p>
          </div>
        </div>

        {/* Overview */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-white mb-2 text-left">Overview</h3>
          <p className="text-neutral-300 leading-relaxed text-sm text-left">
            {movie.overview}
          </p>
        </div>

        {/* Keywords/Genres (Pills) */}
        <div className="flex flex-wrap justify-left  w-full gap-2">
          {movie.keywords?.keywords?.slice(0, 8).map((keyword) => (
            <Badge
              key={keyword.id}
              variant="outline"
              className="bg-white/5 border-white/10 text-neutral-400 px-2.5 py-1 text-[12px] capitalize tracking-wide"
            >
              {keyword.name}
            </Badge>
          ))}
        </div>

        {/* Streaming Sources (Mobile) */}
        {/* Removed */}
      </div>

      {/* ----------------------------------------------------
          CAST & CREW SECTION (Shared)
      ----------------------------------------------------- */}
      <div className="max-w-7xl mx-auto px-6 pb-20 pt-1">
        {/* Cast */}
        {movie.credits?.cast?.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              Top Cast
            </h2>
            <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-7 gap-4 md:gap-6">
              {movie.credits.cast
                .filter(person => person.profile_path) // Filter only with images
                .slice(0, 7)
                .map((person) => (
                  <div key={person.id} className="group relative">
                    <div className="aspect-[1] max-h-34 xl:max-h-44 relative rounded-full overflow-hidden bg-neutral-900 mb-3 border-1 border-white/5 transition-all shadow-lg">
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${person.profile_path}`}
                        alt={person.name}
                        sizes="150px"
                        fill
                        className="object-cover group-hover:scale-100 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <h3 className="text-xs md:text-sm text-center font-bold text-white leading-tight mb-0.5 group-hover:text-purple-400 transition-colors">{person.name}</h3>
                    <p className="text-[10px] md:text-xs text-center text-neutral-500 truncate">{person.character}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Crew (Key People) */}
        {movie.credits?.crew?.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              Key Crew
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {movie.credits.crew
                .filter(p => ["Director", "Screenplay", "Writer", "Producer", "Director of Photography", "Original Music Composer"].includes(p.job))
                .reduce((acc, current) => {
                  const x = acc.find(item => item.id === current.id);
                  if (!x) {
                    return acc.concat([current]);
                  }
                  return acc;
                }, [])
                .slice(0, 6)
                .map((person) => (
                  <div key={`${person.id}-${person.job}`} className="p-2 flex flex-col items-center justify-center md:p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group cursor-default">
                    <h3 className="text-xs md:text-sm font-bold text-white mb-1 text-center group-hover:text-purple-300 transition-colors">{person.name}</h3>
                    <p className="text-[10px] text-neutral-400 text-center uppercase tracking-wider font-medium">{person.job}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Streaming Sources (Shared) */}
        <div className="mt-5 flex justify-start">
          <div className="w-full max-w-xl">
            <StreamingCard tmdbId={movie.id} type="movie" />
          </div>
        </div>

        {/* Review Section */}
        {!userHasReviewed && (
          <div className="mt-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              Your Verdict
            </h2>

            {!session ? (
              <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-8 text-center">
                <p className="text-neutral-400 mb-4">Sign in to leave a review.</p>
                <Button onClick={() => window.location.href = "/login"} variant="outline">Sign In</Button>
              </div>
            ) : !watched?.some(i => i.tmdbId === Number(id) && i.mediaType === "movie") ? (
              <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-8 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-500">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="text-white font-bold mb-2">Haven't watched this yet?</h3>
                <p className="text-neutral-400 text-sm mb-6 max-w-md mx-auto">
                  You need to mark this movie as "Watched" before you can leave a review.
                </p>
              </div>
            ) : (
              <ReviewCard
                user={session?.user}
                onSubmit={handleReviewSubmit}
                isSubmitting={isSubmittingReview}
              />
            )}
          </div>
        )}

        <div className="mt-4">
          <h2 className="text-xl mb-6 md:text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-1  h-6 bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            TBC Rating
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


            {/* LEFT — Overall Verdict */}
            <VerdictRadialChart stats={stats} voteAvg={movie.vote_average} voteCount={movie.vote_count} />

            {/* RIGHT — Why people feel that way */}
            <CommunityBreakdown stats={stats} />

          </div>
        </div>


        {/* Community Reviews */}
        <div className="mt-12">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            Community Reviews
          </h2>
          <ReviewFeed
            reviews={reviews}
            media={movie}
            onReviewUpdated={fetchReviews}
            currentSort={sortBy}
            onSortChange={setSortBy}
            currentPage={currentPage}
            totalPages={Math.ceil(totalReviews / 10)}
            onPageChange={setCurrentPage}
          />
        </div>

      </div>

    </div>
  );
}
