"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Settings,
  Star,
  List,
  Film,
  Clock,
  Heart,
  Sparkles,
  Plus,
  LogOut,
  Search,
  MessageCircle,
  Eye,
  MoreVertical,
  MoreHorizontal,
  ChevronRight
} from "lucide-react";

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaStore } from "@/hooks/useMediaStore";
import EditProfileDialog from "@/components/EditProfileDialog";
import { GradientBackground } from "@/components/ui/gradient-background";
import ReviewFeed from "@/components/ReviewFeed";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("reviews");
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userReviews, setUserReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [sort, setSort] = useState("recent");

  const sortedReviews = [...userReviews].sort((a, b) => {
    if (sort === "recent") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === "liked") return (b.likes?.length || 0) - (a.likes?.length || 0);
    return 0;
  });

  const {
    userProfile, setUserProfile,
    watched, watchlist, collections, interested,
    setWatched, setWatchlist, setCollections, setInterested
  } = useMediaStore();

  // Get latest watched movie for header background
  const latestWatched = watched && watched.length > 0 ? watched[watched.length - 1] : null;
  const headerImage = latestWatched?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${latestWatched.backdrop_path}`
    : null;

  // Handle responsive tab switching: Reset "more_menu" to "reviews" on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && activeTab === "more_menu") {
        setActiveTab("reviews");
      }
    };

    window.addEventListener('resize', handleResize);
    // Check immediately in case of initial load on desktop with persisted state (future proofing)
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && activeTab === "more_menu") {
      setActiveTab("reviews");
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Fetch data on mount
  useEffect(() => {
    if (status !== "authenticated") return;

    // Fetch full profile to get bio and latest avatar
    // We don't need a loading state here because we use the cached userProfile immediately
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUserProfile(data.user);
      })
      .catch(err => console.error("Failed to fetch profile", err))
      .finally(() => setIsProfileLoading(false));

    const fetchData = async () => {
      // Always fetch fresh data in background to update store (Stale-While-Revalidate)
      fetch('/api/watched').then(res => res.json()).then(data => setWatched(data.items || []));
      fetch('/api/watchlist').then(res => res.json()).then(data => setWatchlist(data.items || []));
      fetch('/api/collections').then(res => res.json()).then(data => setCollections(data.collections || []));
      fetch('/api/interested').then(res => res.json()).then(data => setInterested(data.items || []));
    };

    fetchData();
  }, [status, setUserProfile, setWatched, setWatchlist, setCollections, setInterested]);

  // Fetch user's reviews
  const fetchUserReviews = useCallback(() => {
    if (!session?.user?.id) return;
    setReviewsLoading(true);
    fetch(`/api/reviews/user?userId=${session.user.id}`)
      .then(res => res.json())
      .then(data => setUserReviews(data.reviews || []))
      .catch(() => setUserReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserReviews();
    }
  }, [status, fetchUserReviews]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Merge session user with fetched user data to ensure we have the latest avatar/bio
  // but fallback to session image if avatar is missing in DB (e.g. Google login)
  // Priority: Cached Profile -> Session -> null
  const user = userProfile || session?.user;
  // Set document title to user name
  useEffect(() => {
    if (user && (user.name || user.username)) {
      document.title = `${user.name || user.username} | The Binary Critic`;
    }
  }, [user]);
  // If we have a cached profile, we merge session data just in case, but profile takes precedence for bio/avatar
  // If loading and no cached profile, we force null to show skeletons instead of stale session data
  const displayUser = (isProfileLoading && !userProfile) ? null : (userProfile ? { ...session?.user, ...userProfile } : session?.user);

  if (status !== "authenticated") {
    return (
      <div className="relative min-h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden">
        {/* Subtle Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none" />

        <Navbar />

        <div className="relative z-10 max-w-lg w-full px-6 text-center">
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md rotate-3">
              <Film className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white">
            Track. Rate. <span className="text-purple-400">Share.</span>
          </h1>

          <p className="text-neutral-400 text-lg mb-10 leading-relaxed max-w-sm mx-auto">
            Your personal space to log movies, build lists, and connect with other film lovers.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full">
            <Button
              className="w-48 sm:w-auto min-w-[140px] bg-white text-black hover:bg-neutral-200 h-10 md:h-12 rounded-full font-bold tracking-wide transition-all text-sm md:text-base"
              onClick={() => router.push('/login')}
            >
              Log In
            </Button>
            <Button
              className="w-48 sm:w-auto min-w-[140px] bg-transparent hover:bg-white/5 text-white border border-white/20 h-10 md:h-12 rounded-full font-bold tracking-wide transition-all text-sm md:text-base"
              onClick={() => router.push('/signup')}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Count user reviews for stats
  const userReviewsCount = userReviews.length;

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 relative">
      <Navbar />

      {/* ---------------------------------------------------------
          CINEMATIC HEADER (Sleek & Dynamic)
      --------------------------------------------------------- */}
      <div className="relative w-full">
        {/* Dynamic Background */}
        <div className="relative h-32 md:h-[45vh] w-full overflow-hidden">
          <div className="absolute inset-0 bg-neutral-900">
            {headerImage ? (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                src={headerImage}
                className="w-full h-full object-cover object-top opacity-60"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-purple-900/20 via-black to-blue-900/20" />
            )}

            {/* Gradient Overlays for Readability */}
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-linear-to-r from-black/80 via-transparent to-black/80" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
          </div>
        </div>

        {/* Content Container */}
        <div className="relative px-6 pb-4 z-10 -mt-12 md:absolute md:bottom-0 md:left-0 md:w-full md:px-12 md:pb-8 md:mt-0">
          <div className="max-w-7xl mx-auto flex flex-nowrap items-end gap-4 md:gap-8">

            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="size-24 md:size-40 border-4 border-black shadow-2xl rounded-full">
                {!displayUser ? (
                  <Skeleton className="w-full h-full rounded-full bg-neutral-800" />
                ) : (
                  <>
                    <AvatarImage src={displayUser?.avatar || displayUser?.image || "/default-avatar.png"} className="object-cover" />
                    <AvatarFallback className="bg-neutral-800 text-3xl font-bold text-purple-400">
                      {displayUser?.name?.[0]}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
            </div>

            {/* User Info */}
            <div className="flex-1 text-left space-y-1 w-full min-w-0 pb-5 md:pb-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl md:text-5xl font-bold tracking-tight bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-lg mb-0.5">
                    {displayUser?.name || <Skeleton className="h-8 w-40 bg-neutral-800" />}
                  </h1>
                  <div className="text-purple-400 font-medium text-xs md:text-lg">
                    {displayUser?.name ? `@${displayUser.name.replace(/\s+/g, '').toLowerCase()}` : <Skeleton className="h-3 w-24 mt-1 bg-neutral-800" />}
                  </div>
                </div>

                {/* Mobile Menu Trigger */}
                <div className="relative md:hidden">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50">
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsEditProfileOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                        Edit Profile
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-neutral-800"
                        onClick={() => {
                          setIsMenuOpen(false);
                          signOut({ callbackUrl: '/' });
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/*               
              {/* Bio 
              <div className="pt-2">
                {displayUser?.bio ? (
                  <p className="bg-gradient-to-r from-neutral-100 via-neutral-500 to-neutral-200 bg-clip-text text-transparent animate-gradient-wave text-xs md:text-base max-w-xl leading-relaxed line-clamp-3 font-medium">
                    {displayUser.bio}
                  </p>
                ) : !displayUser && (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full max-w-md bg-neutral-800" />
                    <Skeleton className="h-3 w-2/3 bg-neutral-800" />
                  </div>
                )}
              </div> */}

              {/* Desktop Stats Row */}
              <div className="hidden md:flex items-center gap-6 pt-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-lg">{userReviewsCount}</span>
                  <span className="text-neutral-400 text-sm">Reviews</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-lg">{collections?.length || 0}</span>
                  <span className="text-neutral-400 text-sm">Lists</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-lg">{watchlist?.length || 0}</span>
                  <span className="text-neutral-400 text-sm">Watchlist</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-lg">{interested?.length || 0}</span>
                  <span className="text-neutral-400 text-sm">Interested</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-lg">{watched?.length || 0}</span>
                  <span className="text-neutral-400 text-sm">Watched</span>
                </div>
              </div>
            </div>

            {/* Desktop Actions (Hidden on Mobile) */}
            <div className="hidden md:flex shrink-0 gap-3">
              <Button
                variant="outline"
                className="bg-white/10 border-white/10 hover:bg-white/20 text-white backdrop-blur-md rounded-full px-6 h-10 text-xs font-bold uppercase tracking-wider"
                onClick={() => setIsEditProfileOpen(true)}
              >
                <Settings className="w-3.5 h-3.5 mr-1" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400 backdrop-blur-md rounded-full px-6 h-10 text-xs font-bold uppercase tracking-wider"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Log Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Stats Row (Below Header) */}
      <div className="md:hidden bg-black/20">
        <div className="grid grid-cols-3">
          <div className="flex flex-col items-center justify-center py-2">
            <span className="font-bold text-white text-lg leading-none">{userReviewsCount}</span>
            <span className="text-neutral-500 uppercase text-[10px] tracking-wider font-bold mt-1">Reviews</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <span className="font-bold text-white text-lg leading-none">{collections?.length || 0}</span>
            <span className="text-neutral-500 uppercase text-[10px] tracking-wider font-bold mt-1">Lists</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <span className="font-bold text-white text-lg leading-none">{watchlist?.length || 0}</span>
            <span className="text-neutral-500 uppercase text-[10px] tracking-wider font-bold mt-1">Watchlist</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-2 pb-8">

        {/* ---------------------------------------------------------
            TABS & CONTENT
        --------------------------------------------------------- */}
        <div className="space-y-8">
          {/* Tabs Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 mb-8 px-2 pb-0">

            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center gap-10 overflow-x-auto no-scrollbar">
              <TabButton active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} label="Reviews" icon={MessageCircle} />
              <TabButton active={activeTab === "collections"} onClick={() => setActiveTab("collections")} label="Lists" icon={List} />
              <TabButton active={activeTab === "watchlist"} onClick={() => setActiveTab("watchlist")} label="Watchlist" icon={Clock} />
              <TabButton active={activeTab === "interested"} onClick={() => setActiveTab("interested")} label="Interested" icon={Heart} />
              <TabButton active={activeTab === "watched"} onClick={() => setActiveTab("watched")} label="Watched" icon={Eye} />
            </div>

            {/* Mobile Tabs (3 Items) */}
            <div className="flex md:hidden w-full border-b border-neutral-800">
              <TabButton
                className="flex-1 justify-center"
                active={activeTab === "reviews"}
                onClick={() => setActiveTab("reviews")}
                label={null}
                icon={MessageCircle}
              />
              <TabButton
                className="flex-1 justify-center"
                active={activeTab === "watchlist"}
                onClick={() => setActiveTab("watchlist")}
                label={null}
                icon={Clock}
              />
              <TabButton
                className="flex-1 justify-center"
                active={["collections", "interested", "watched", "more_menu"].includes(activeTab)}
                onClick={() => setActiveTab("more_menu")}
                label={null}
                icon={MoreHorizontal}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">

            {activeTab === "more_menu" && (
              <div className="grid grid-cols-1 gap-3 md:hidden">
                <button
                  onClick={() => setActiveTab("collections")}
                  className="flex items-center justify-between p-3 bg-neutral-900/30 border border-white/5 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98] group backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 group-hover:text-purple-300 transition-colors">
                      <List className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-white text-sm">Lists</h3>
                      <p className="text-xs text-neutral-500">Your curated collections</p>
                    </div>
                  </div>
                  <div className="text-neutral-700 group-hover:text-white transition-colors pr-1">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("interested")}
                  className="flex items-center justify-between p-3 bg-neutral-900/30 border border-white/5 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98] group backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-pink-500/10 rounded-xl text-pink-400 group-hover:text-pink-300 transition-colors">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-white text-sm">Interested</h3>
                      <p className="text-xs text-neutral-500">Movies you want to see</p>
                    </div>
                  </div>
                  <div className="text-neutral-700 group-hover:text-white transition-colors pr-1">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("watched")}
                  className="flex items-center justify-between p-3 bg-neutral-900/30 border border-white/5 rounded-2xl hover:bg-white/5 transition-all active:scale-[0.98] group backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 group-hover:text-blue-300 transition-colors">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-white text-sm">Watched</h3>
                      <p className="text-xs text-neutral-500">Your viewing history</p>
                    </div>
                  </div>
                  <div className="text-neutral-700 group-hover:text-white transition-colors pr-1">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-4">
                {reviewsLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : userReviews.length > 0 ? (
                  <ReviewFeed
                    reviews={sortedReviews}
                    variant="profile"
                    currentSort={sort}
                    onSortChange={setSort}
                  />
                ) : (
                  <EmptyState
                    icon={MessageCircle}
                    title="No Reviews Yet"
                    desc="Share your thoughts on movies you've watched. Coming soon!"
                    actionLabel={null}
                    onAction={() => { }}
                  />
                )}
              </div>
            )}

            {activeTab === "collections" && (
              <div className="space-y-6">
                {!collections ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="aspect-video rounded-xl bg-neutral-900" />
                    ))}
                  </div>
                ) : collections.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {collections.map(col => (
                      <CollectionCard
                        key={col._id}
                        collection={col}
                        onClick={() => setSelectedCollection(col)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={List}
                    title="Time to curate"
                    desc="Visit any movie or TV show page to create a list."
                    actionLabel={null}
                    onAction={() => { }}
                  />
                )}
              </div>
            )}

            {activeTab === "watchlist" && (
              <div className="space-y-6">
                {!watchlist ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="aspect-2/3 rounded-md bg-neutral-900" />
                    ))}
                  </div>
                ) : watchlist.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {watchlist.map(item => (
                      <MovieCard key={item.tmdbId} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Clock}
                    title="Your Watchlist is Empty"
                    desc="Save movies you want to watch later. They'll appear here."
                    actionLabel="Discover Movies"
                    onAction={() => router.push('/')}
                  />
                )}
              </div>
            )}

            {activeTab === "interested" && (
              <div className="space-y-6">
                {!interested ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="aspect-2/3 rounded-md bg-neutral-900" />
                    ))}
                  </div>
                ) : interested.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {interested.slice(0, 10).map(item => (
                      <MovieCard key={item.tmdbId} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Heart}
                    title="No Interests Yet"
                    desc="Mark upcoming movies you're hyped for."
                    actionLabel="See Upcoming"
                    onAction={() => router.push('/')}
                  />
                )}
              </div>
            )}

            {activeTab === "watched" && (
              <div className="space-y-4">
                {!watched ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="aspect-2/3 rounded-md bg-neutral-900" />
                    ))}
                  </div>
                ) : watched.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {watched.slice().reverse().slice(0, 10).map(item => (
                      <MovieCard key={item.tmdbId} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Eye}
                    title="No Movies Watched"
                    desc="Track movies you've watched to build your history."
                    actionLabel="Browse Movies"
                    onAction={() => router.push('/')}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedCollection} onOpenChange={(open) => !open && setSelectedCollection(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white w-[90%] md:w-full md:max-w-4xl max-h-[80vh] overflow-y-auto p-4 md:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold">{selectedCollection?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 mt-4">
            {selectedCollection?.items?.map((item) => (
              <MovieCard key={item.tmdbId} item={item} />
            ))}
          </div>
          {(!selectedCollection?.items || selectedCollection.items.length === 0) && (
            <div className="text-center text-neutral-500 py-10">
              No items in this collection.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditProfileDialog
        user={displayUser}
        open={isEditProfileOpen}
        onOpenChange={setIsEditProfileOpen}
        onProfileUpdate={(updatedUser) => setUserProfile(updatedUser)}
      />
    </div>
  );
}

// ---------------------------------------------------------
// SUB-COMPONENTS
// ---------------------------------------------------------

function TabButton({ active, onClick, label, icon: Icon, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`
        group flex items-center gap-2 px-1 py-4 text-sm font-bold transition-colors relative
        ${active ? "text-white" : "text-neutral-400 hover:text-neutral-200"}
        ${className}
      `}
    >
      {Icon && <Icon className={`w-5 h-5 transition-colors ${active ? "text-purple-400" : "text-neutral-500 group-hover:text-neutral-300"}`} />}
      {label && <span>{label}</span>}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

function MovieCard({ item, showRating }) {
  const router = useRouter();
  const title = item.title || item.name || "Untitled";

  return (
    <div
      className="group relative aspect-2/3 bg-neutral-900 rounded-md overflow-hidden border border-white/5 hover:border-white/20 transition-all cursor-pointer"
      onClick={() => router.push(`/${item.mediaType || 'movie'}/${item.tmdbId}`)}
    >
      {item.poster_path ? (
        <img
          src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
          alt={title}
          className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-800 p-2 text-center">
          <Film className="w-8 h-8 text-neutral-600 mb-2" />
          <span className="text-xs text-neutral-400 line-clamp-3">{title}</span>
        </div>
      )}

      {/* Title Overlay - Visible on Hover */}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-3 text-center">
        <span className="text-xs font-bold text-white drop-shadow-md line-clamp-2">
          {title}
        </span>
      </div>

      {showRating && item.rating && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400 flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          {item.rating}
        </div>
      )}
    </div>
  );
}

function CollectionCard({ collection, onClick }) {
  return (
    <div
      className="group relative aspect-video bg-neutral-900 rounded-xl overflow-hidden border border-white/5 hover:border-purple-500/50 transition-all cursor-pointer shadow-lg"
      onClick={onClick}
    >
      {/* Background Image with Zoom Effect */}
      {collection.coverImage ? (
        <img
          src={`https://image.tmdb.org/t/p/w500${collection.coverImage}`}
          alt={collection.name}
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <List className="w-10 h-10 text-neutral-700 group-hover:text-purple-500 transition-colors" />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-3 md:p-5 z-10">
        <h3 className="text-white font-bold text-sm md:text-lg leading-tight mb-1 md:mb-2 drop-shadow-md group-hover:text-purple-400 transition-colors capitalize line-clamp-1 md:line-clamp-2">
          {collection.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white/90 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
            {collection.items?.length || 0} Items
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
      <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
        <Icon className="w-6 h-6 text-neutral-600" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-neutral-400 text-sm max-w-xs mx-auto mb-6 leading-relaxed">{desc}</p>

      {actionLabel && (
        <Button
          variant="outline"
          className="bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2"
          onClick={onAction}
        >
          {actionLabel === "Create List" ? <Plus className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
