import movieGenres from "@/public/movie_genre.json";
import tvGenres from "@/public/tv_genre.json";

// Human-readable language names for embedding clarity
const LANG_MAP = {
  hi: "Hindi",
  en: "English",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  ja: "Japanese"
};

const REGION_MAP = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  KR: "South Korea",
  ES: "Spain",
  FR: "France",
  JP: "Japan"
};


// Build unified Genre Map
const GENRE_MAP = {};
[...movieGenres.genres, ...tvGenres.genres].forEach(g => {
  GENRE_MAP[g.id] = g.name;
});



/**
 * Generate a dynamic behavioral summary based on actual preferences.
 */
export function generateBehaviorSummary(vector) {
  const likedGenres = vector.q3_preferred_genres || [];
  const avoidStyles = vector.q5_avoid_styles || [];
  const avoidGenres = vector.q5_avoid_genres || [];
  const avoidKeywords = vector.q5_avoid_keywords || [];

  let parts = [];

  // Fast-paced preference only if user avoids slow-paced or likes action/thriller
  if (
    avoidStyles.includes("slow-paced") ||
    likedGenres.includes(28) || // Action
    likedGenres.includes(53)    // Thriller
  ) {
    parts.push("They prefer fast-paced and engaging narratives.");
  }

  // Intellectually stimulating
  if (
    likedGenres.includes(878) || // Sci-Fi
    likedGenres.includes(9648)   // Mystery / Mind-bending
  ) {
    parts.push("They enjoy intellectually stimulating or thought-provoking stories.");
  }

  // Emotional depth
  if (likedGenres.includes(18) && !avoidGenres.includes(18)) {
    parts.push("They appreciate emotional storytelling when done well.");
  }

  // Blockbuster preference
  if (vector.q1?.blockbuster_mode) {
    parts.push("They enjoy high-budget, mass-appeal films with spectacle, action, and large-scale production.");
  }

  // Narrative clarity preference
  if (
    avoidKeywords.includes("complex") ||
    avoidKeywords.includes("nonlinear")
  ) {
    parts.push("They prefer clear, easy-to-follow narratives instead of overly complex plots.");
  }

  if (parts.length === 0) return "";
  return parts.join(" ");
}

/**
 * Convert user vector + dislike text into a rich semantic text for embeddings.
 */
export function userVectorToText(vector, dislikeText = "") {
  let parts = [];

  // ============================================================
  // Q1 — Regions & Languages
  // ============================================================
  if (vector.q1) {
    const langs = vector.q1.preferred_languages || [];
    const regions = vector.q1.preferred_regions || [];

    if (langs.length > 0) {
    const prettyLangs = langs.map(code => LANG_MAP[code] || code);
    parts.push(`The user prefers watching movies primarily in: ${prettyLangs.join(", ")}.`);
    }

    if (regions.length > 0) {
  const prettyRegions = regions.map(r => REGION_MAP[r] || r);
  parts.push(
    `Their preferred production regions include: ${prettyRegions.join(", ")}.`
  );
}

    if (vector.q1.india_priority)
      parts.push("They prioritize Indian content when available.");

    if (vector.q1.blockbuster_mode)
      parts.push("They enjoy big mainstream blockbusters and large commercial releases.");
  }

  // ============================================================
  // Q2 — Language Restriction + Dub/Sub Preference
  // ============================================================
  if (vector.q2) {
    if (!vector.q2.restrict_languages) {
      parts.push("They are flexible with audio languages and are comfortable with subtitles.");
    } else {
      parts.push("They prefer watching content in languages they understand.");
    }

    if (vector.q2.require_dub && vector.q2.user_languages.length > 0) {
      parts.push(
        `They prefer dubbed versions when available in: ${vector.q2.user_languages.join(", ")}.`
      );
    }
  }

  // ============================================================
  // Q3 — Preferred Genres
  // ============================================================
  if (vector.q3_preferred_genres?.length > 0) {
    const genreNames = vector.q3_preferred_genres
      .map(id => GENRE_MAP[id])
      .filter(Boolean)
      .join(", ");

    parts.push(`They enjoy genres such as: ${genreNames}.`);
  }

  // ============================================================
  // Q4 — Loved Movies
  // ============================================================
  if (vector.q4_chosen_movies?.length > 0) {
    parts.push(
      `Some movies the user has genuinely loved include TMDB IDs: ${vector.q4_chosen_movies.join(", ")}. These indicate their taste in tone, style, storytelling, and cinematic preferences.`
    );
  }

  // ============================================================
  // Q5 — Dislikes (Genres, Keywords, Styles)
  // ============================================================
  if (vector.q5_avoid_genres?.length > 0) {
    const avoidNames = vector.q5_avoid_genres
      .map(id => GENRE_MAP[id])
      .filter(Boolean)
      .join(", ");

    parts.push(`Genres they generally dislike: ${avoidNames}.`);
  }

  if (vector.q5_avoid_keywords?.length > 0) {
    parts.push(`They avoid themes such as: ${vector.q5_avoid_keywords.join(", ")}.`);
  }

  if (vector.q5_avoid_styles?.length > 0) {
    parts.push(`They tend to avoid stylistic elements like: ${vector.q5_avoid_styles.join(", ")}.`);
  }

  if (dislikeText && dislikeText.trim()) {
    parts.push(`Avoidance summary: ${dislikeText}.`);
  }

  // ============================================================
  // High-Level Behavior Summary (Derived)
  // ============================================================
  const behaviorSummary = generateBehaviorSummary(vector);
  if (behaviorSummary) {
    parts.push(behaviorSummary);
  }

  // Return final unified semantic preference text
  return parts.join(" ");
}
