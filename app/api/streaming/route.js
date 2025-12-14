import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MovieCache from "@/models/MovieCache";
import TvCache from "@/models/TvCache";
import { WatchmodeClient } from "@watchmode/api-client";

const wmClient = new WatchmodeClient({
  apiKey: process.env.WATCHMODE_KEY,
});

export async function POST(req) {
  try {
    const { tmdbId, type } = await req.json(); // type: 'movie' or 'tv'

    if (!tmdbId) {
      return NextResponse.json({ error: "TMDB ID is required" }, { status: 400 });
    }

    await connectDB();

    const CacheModel = type === "tv" ? TvCache : MovieCache;
    const idField = type === "tv" ? "tvId" : "movieId";

    // ----------------------------------------------------------------
    // 1. Check Cache
    // ----------------------------------------------------------------
    const cached = await CacheModel.findOne({ [idField]: tmdbId });
    
    if (cached && cached.data?.streaming_sources) {
      const cachedSources = cached.data.streaming_sources;
      
      // Validate Cache Integrity
      const isArray = Array.isArray(cachedSources);
      const isNotEmpty = isArray && cachedSources.length > 0;
      const isRawObject = !isArray && cachedSources && typeof cachedSources === 'object' && 'data' in cachedSources;

      if (isArray && isNotEmpty && !isRawObject) {
        console.log(`📦 [Cache] Found streaming sources for ${tmdbId}`);
        return NextResponse.json({ sources: cachedSources });
      }
      
      console.log(`⚠️ [Cache] Invalid or empty for ${tmdbId}. Refreshing...`);
    }

    console.log(`🔍 [API] Fetching streaming sources for ${tmdbId} (${type})`);

    // ----------------------------------------------------------------
    // 2. Try TMDB Providers First (Cost Saving)
    // ----------------------------------------------------------------
    try {
        // Fetch details for Homepage
        const detailsUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        
        // Fetch Providers
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}/watch/providers?api_key=${process.env.TMDB_API_KEY}`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();

        const mappedSources = [];

        // A. Check Homepage
        if (detailsData.homepage && detailsData.homepage.trim() !== "") {
             mappedSources.push({
                 source_id: 'homepage',
                 name: 'Official Site',
                 type: 'sub',
                 region: 'Global',
                 web_url: detailsData.homepage
             });
        }

        // B. Check TMDB India Providers
        if (tmdbData.results && tmdbData.results.IN) {
            const inProviders = tmdbData.results.IN;
            const types = ['flatrate', 'rent', 'buy', 'free'];
            const typeMap = { 'flatrate': 'sub', 'rent': 'rent', 'buy': 'buy', 'free': 'free' };

            types.forEach(t => {
                if (inProviders[t]) {
                    inProviders[t].forEach(p => {
                        mappedSources.push({
                            source_id: p.provider_id,
                            name: p.provider_name,
                            type: typeMap[t],
                            region: 'IN',
                            web_url: inProviders.link 
                        });
                    });
                }
            });
        }

        // If TMDB gave us data, save and return immediately
        if (mappedSources.length > 0) {
            console.log(`✅ [TMDB] Found ${mappedSources.length} sources`);
            await updateCache(CacheModel, idField, tmdbId, mappedSources, cached);
            return NextResponse.json({ sources: mappedSources });
        }

    } catch (e) {
        console.error("Error fetching TMDB providers:", e);
    }

    // ----------------------------------------------------------------
    // 3. Fallback to Watchmode (Costly)
    // ----------------------------------------------------------------
    let wmId = null;
    
    try {
        const searchType = type === 'tv' ? 'tmdb_tv_id' : 'tmdb_movie_id';
        const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${process.env.WATCHMODE_KEY}&search_field=${searchType}&search_value=${tmdbId}`;
        
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.title_results && searchData.title_results.length > 0) {
            wmId = searchData.title_results[0].id;
        }
    } catch (e) {
        console.error("Error searching Watchmode:", e);
    }

    if (!wmId) {
        console.log("❌ [Watchmode] ID not found");
        return NextResponse.json({ sources: [] });
    }

    console.log(`📡 [Watchmode] Fetching sources for ID: ${wmId}`);
    let response = await wmClient.title.getSources(wmId, {
      regions: 'US,GB,CA,IN'
    });
    
    let sources = [];
    if (Array.isArray(response)) {
        sources = response;
    } else if (response && Array.isArray(response.data)) {
        sources = response.data;
    } else {
        console.warn("⚠️ [Watchmode] Unexpected format:", response);
    }

    // ----------------------------------------------------------------
    // 4. Update Cache & Return
    // ----------------------------------------------------------------
    await updateCache(CacheModel, idField, tmdbId, sources, cached);
    
    console.log(`💾 [Cache] Saved ${sources.length} sources`);
    return NextResponse.json({ sources });

  } catch (error) {
    console.error("Streaming API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Helper to update cache
async function updateCache(Model, idField, id, data, existingDoc) {
    if (existingDoc) {
        await Model.updateOne(
            { [idField]: id },
            { $set: { "data.streaming_sources": data } }
        );
    } else {
        await Model.create({
            [idField]: id,
            data: { streaming_sources: data }
        });
    }
}
