// /lib/browserCache.js
import { getDB } from "./idb";

export async function browserCacheFetch(
  key,
  fetcher,
  ttlSeconds = 3600,
  {
    retries = 3,
    retryDelay = 300,
    forceRefresh = false,
    staleWhileRevalidate = true,
  } = {}
) {
  try {
    const db = await getDB();

    // ---------------------------------------------------
    // 1️⃣ READ FROM INDEXEDDB
    // ---------------------------------------------------
    let cached = await db.get("cache", key);

    const isExpired =
      !cached ||
      Date.now() - cached.timestamp > ttlSeconds * 1000 ||
      forceRefresh;

    // VALID CACHE → return instantly
    if (!isExpired && cached?.data && !cached.data.error) {
      console.log("🔥 [IDB] Using cached data:", key);
      return cached.data;
    }

    // STALE cache → return it now + refresh in background
    if (
      staleWhileRevalidate &&
      cached?.data &&
      !cached.data.error &&
      isExpired &&
      !forceRefresh
    ) {
      console.log("🌙 [IDB] Returning stale + refreshing:", key);

      fetcher().then(async (fresh) => {
        if (fresh && !fresh.error) {
          await db.put("cache", {
            key,
            data: fresh,
            timestamp: Date.now(),
          });
          console.log("🔄 [IDB] Background refreshed:", key);
        }
      });

      return cached.data;
    }

    // ---------------------------------------------------
    // 2️⃣ FETCH WITH AUTO RETRY (exponential backoff)
    // ---------------------------------------------------
    let attempt = 0;
    let fresh;

    while (attempt < retries) {
      try {
        fresh = await fetcher();

        if (fresh && !fresh.error) break; // SUCCESS
        console.warn(`❌ Fetch attempt ${attempt + 1}`, fresh);
      } catch (err) {
        console.warn(`❌ Network error attempt ${attempt + 1}`, err);
      }

      attempt++;
      await new Promise((res) => setTimeout(res, retryDelay * attempt));
    }

    // after all retries → FAIL → return error (do not cache)
    if (!fresh || fresh.error) {
      console.warn("❌ Final failure, not caching:", fresh);
      return fresh;
    }

    // ---------------------------------------------------
    // 3️⃣ SAVE TO INDEXEDDB
    // ---------------------------------------------------
    await db.put("cache", {
      key,
      data: fresh,
      timestamp: Date.now(),
    });

    console.log("⚡ [IDB] Cached fresh data:", key);

    return fresh;
  } catch (err) {
    console.error("💥 IndexedDB cache fatal error:", err);
    return null;
  }
}
