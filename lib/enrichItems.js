import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";

export async function enrichItems(items) {
  if (!items || items.length === 0) return [];

  const movieIds = items
    .filter(i => i.mediaType === "movie" || !i.mediaType)
    .map(i => i.tmdbId.toString());
    
  const tvIds = items
    .filter(i => i.mediaType === "tv")
    .map(i => i.tmdbId.toString());

  const [movieDocs, tvDocs] = await Promise.all([
    movieIds.length > 0 ? MovieCache.find({ movieId: { $in: movieIds } }) : [],
    tvIds.length > 0 ? TvCache.find({ tvId: { $in: tvIds } }) : []
  ]);

  const movieMap = new Map(movieDocs.map(d => [d.movieId, d.data]));
  const tvMap = new Map(tvDocs.map(d => [d.tvId, d.data]));

  // Identify missing items
  const missingMovies = movieIds.filter(id => !movieMap.has(id));
  const missingTv = tvIds.filter(id => !tvMap.has(id));

  // Fetch missing items from TMDB
  if (missingMovies.length > 0 || missingTv.length > 0) {
    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (token) {
      const fetchAndCache = async (id, type) => {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?append_to_response=videos,credits,keywords,similar,recommendations,images,external_ids,release_dates,content_ratings`, {
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${token}`
            }
          });
          
          if (res.ok) {
            const data = await res.json();
            // Cache it safely
            if (type === 'movie') {
              await MovieCache.findOneAndUpdate(
                { movieId: id },
                { movieId: id, data, cachedAt: new Date() },
                { upsert: true, new: true }
              );
              movieMap.set(id, data);
            } else {
              await TvCache.findOneAndUpdate(
                { tvId: id },
                { tvId: id, data, cachedAt: new Date() },
                { upsert: true, new: true }
              );
              tvMap.set(id, data);
            }
          }
        } catch (e) {
          console.error(`Failed to fetch/cache ${type} ${id}`, e);
        }
      };

      // Run in parallel
      await Promise.all([
        ...missingMovies.map(id => fetchAndCache(id, 'movie')),
        ...missingTv.map(id => fetchAndCache(id, 'tv'))
      ]);
    }
  }

  return items.map(item => {
    const idStr = item.tmdbId.toString();
    const details = item.mediaType === "tv" ? tvMap.get(idStr) : movieMap.get(idStr);

    if (!details) return item; // Return original if no details found

    return {
      ...item, // Keep original fields (rating, watchedAt, etc.)
      title: details.title || details.name,
      name: details.name || details.title,
      poster_path: details.poster_path,
      backdrop_path: details.backdrop_path,
      release_date: details.release_date || details.first_air_date,
      overview: details.overview,
      vote_average: details.vote_average
    };
  });
}
