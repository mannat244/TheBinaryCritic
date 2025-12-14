import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// We use Zustand for a lightweight global store
// It's better than Context for frequent updates and avoids re-renders
export const useMediaStore = create(
  persist(
    (set, get) => ({
      userProfile: null,  // Cached user profile (name, bio, avatar)
      watched: null,      // Array of watched items or null (not fetched yet)
      watchlist: null,    // Array of watchlist items or null
      collections: null,  // Array of collections or null
      interested: null,   // Array of interested items or null

      // Actions
      setUserProfile: (profile) => set({ userProfile: profile }),
      setWatched: (items) => set({ watched: items }),
      setWatchlist: (items) => set({ watchlist: items }),
      setCollections: (cols) => set({ collections: cols }),
      setInterested: (items) => set({ interested: items }),
      resetStore: () => set({ userProfile: null, watched: null, watchlist: null, collections: null, interested: null }),

      // Optimistic Updates
      addWatched: (item) => set((state) => {
        if (!state.watched) return { watched: [item] };
        if (state.watched.some(i => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType)) return state;
        return { watched: [...state.watched, item] };
      }),
      
      removeWatched: (tmdbId, mediaType) => set((state) => ({
        watched: state.watched 
          ? state.watched.filter(i => !(i.tmdbId === tmdbId && i.mediaType === mediaType))
          : []
      })),

      addWatchlist: (item) => set((state) => {
        if (!state.watchlist) return { watchlist: [item] };
        if (state.watchlist.some(i => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType)) return state;
        return { watchlist: [...state.watchlist, item] };
      }),

      removeWatchlist: (tmdbId, mediaType) => set((state) => ({
        watchlist: state.watchlist
          ? state.watchlist.filter(i => !(i.tmdbId === tmdbId && i.mediaType === mediaType))
          : []
      })),

      addInterested: (item) => set((state) => {
        if (!state.interested) return { interested: [item] };
        if (state.interested.some(i => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType)) return state;
        return { interested: [...state.interested, item] };
      }),

      removeInterested: (tmdbId, mediaType) => set((state) => ({
        interested: state.interested
          ? state.interested.filter(i => !(i.tmdbId === tmdbId && i.mediaType === mediaType))
          : []
      })),

      addCollectionItem: (collectionId, item) => set((state) => ({
        collections: state.collections?.map(col => {
          if (col._id === collectionId) {
            // Prevent duplicates
            if (col.items.some(i => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType)) return col;
            return { ...col, items: [...col.items, item] };
          }
          return col;
        })
      })),

      removeCollectionItem: (collectionId, tmdbId, mediaType) => set((state) => ({
        collections: state.collections?.map(col => 
          col._id === collectionId 
            ? { ...col, items: col.items.filter(i => !(i.tmdbId === tmdbId && i.mediaType === mediaType)) }
            : col
        )
      })),

      addCollection: (newCol) => set((state) => ({
        collections: state.collections ? [newCol, ...state.collections] : [newCol]
      })),

      deleteCollection: (collectionId) => set((state) => ({
        collections: state.collections ? state.collections.filter(c => c._id !== collectionId) : []
      })),

      updateCollectionDetails: (collectionId, updates) => set((state) => ({
        collections: state.collections?.map(col => 
          col._id === collectionId ? { ...col, ...updates } : col
        )
      }))
    }),
    {
      name: 'tbc-media-storage', // unique name for localStorage key
      skipHydration: true, // We'll handle hydration manually if needed, or let it auto-hydrate. 
                           // Actually, default is false (auto-hydrate). 
                           // Let's use default behavior but be aware of hydration mismatch in Next.js.
    }
  )
);
