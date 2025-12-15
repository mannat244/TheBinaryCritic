function mapQ1ToRegionLanguage(q1Selections) {
  const languages = [];
  const regions = new Set();
  let indiaFirst = true;

  // Bollywood = Hindi only
  if (q1Selections.includes("Bollywood / Hindi films")) {
    languages.push("hi");
    regions.add("IN");
  }

  // South Indian cinema
  if (q1Selections.includes("South Indian cinema")) {
    languages.push("ta", "te", "ml", "kn");
    regions.add("IN");
  }

  // Hollywood
  if (q1Selections.includes("Hollywood films")) {
    languages.push("en");
    regions.add("US");
    // remove GB if you want strictly US-only
    regions.add("GB");
  }

  // International cinema
  if (q1Selections.includes("International cinema")) {
    languages.push("ko", "es", "fr", "ja");
    regions.add("KR");
    regions.add("ES");
    regions.add("FR");
    regions.add("JP");
  }

  // Anything = add all relevant languages
  if (q1Selections.includes("I watch anything interesting")) {
    languages.push(
      "hi", "en",
      "ta", "te", "ml", "kn",
      "ko", "es", "fr", "ja"
    );
  }

  // Blockbuster flag
  const blockbusterMode = q1Selections.includes("Big mainstream blockbusters");

  // Fallback for empty selection
  if (languages.length === 0) {
    languages.push("hi", "en");
    regions.add("IN");
  }

  return {
    preferred_languages: Array.from(new Set(languages)),
    preferred_regions: Array.from(regions),
    india_priority: indiaFirst,
    blockbuster_mode: blockbusterMode
  };
}

function mapQ2(q2Answer, userLanguages) {
  switch (q2Answer) {
    case "Original audio with subtitles":
    case "Either works for me":
      // Language is NOT a restriction
      return {
        restrict_languages: false,
        require_dub: false,
        user_languages: userLanguages
      };

    case "Dubbed when available":
    case "I stick to languages I understand":
      // Language IS a restriction, but dub solves it
      return {
        restrict_languages: true,
        require_dub: true,
        user_languages: userLanguages
      };
  }
}

const Q3_GENRE_MAP = {
  "Action-packed": [28, 12],
  "Thrillers": [53],
  "Comedy": [35],
  "Romance": [10749],
  "Emotional drama": [18, 10749],
  "Mind-bending": [878, 9648, 53],
  "Horror": [27],
  "Crime stories": [80, 53, 9648],
  "Sci-fi": [878],
  "Family-friendly": [10751, 16, 35],
  "Dark storytelling": [80, 53, 18],
  "Mass entertainers": [28, 18, 35, 12]
};

function mapQ4(selectedMovieIds) {
  // Map of your sample grid movies → actual TMDB IDs
 const MOVIE_TO_TMDB = {
    1: 157336,   // Interstellar
    2: 24428,    // The Avengers (2012)
    3: 155,      // The Dark Knight
    4: 550,      // Fight Club
    5: 475557,   // Joker (2019)
    6: 781732,   // Animal (2023, Hindi) [CORRECTED]
    7: 770906,   // Salaar: Part 1 – Ceasefire [CORRECTED]
    8: 801688,   // Kalki 2898 AD
    9: 626392,   // Master (2021, Tamil)
    10: 19404,   // Dilwale Dulhania Le Jayenge
    11: 348892,  // Bajrangi Bhaijaan [Previously verified]
    12: 20453,   // 3 Idiots [Previously verified]
    13: 360814,  // Dangal [Previously verified]
    14: 894803,  // Sita Ramam [Previously verified]
    15: 587412,  // K.G.F: Chapter 2 [Previously verified]
    16: 350312,  // Baahubali 2: The Conclusion [Previously verified]
    17: 412862,  // Ratsasan [Previously verified]
    19: 671      // Harry Potter and the Philosopher's Stone
  };

  // Map selected local IDs to TMDB IDs
  const chosenMovies = selectedMovieIds
    .map(id => MOVIE_TO_TMDB[id])
    .filter(Boolean);

  return {
    chosen_tmdb_movies: chosenMovies
  };
}

function mapQ5(selectedOptions) {
  const avoidGenres = new Set();
  const avoidKeywords = new Set();
  const avoidStyles = new Set();
  const textParts = [];

  selectedOptions.forEach(opt => {
    switch (opt) {
      case "Slow-paced films":
        avoidStyles.add("slow-paced");
        textParts.push("I avoid slow-paced movies or films with very slow storytelling.");
        break;

      case "Horror":
        avoidGenres.add(27);
        textParts.push("I don't like horror movies.");
        break;

      case "Gore / brutality":
        avoidKeywords.add("gore");
        avoidKeywords.add("brutal");
        avoidKeywords.add("violence");
        textParts.push("I dislike gore, brutal scenes, and strong violence.");
        break;

      case "Heavy emotional stories":
        avoidGenres.add(18);
        textParts.push("I avoid heavy emotional dramas.");
        break;

      case "Too many songs":
        avoidStyles.add("song-heavy");
        textParts.push("I don't enjoy movies with too many songs.");
        break;

      case "Over-the-top comedy":
        avoidGenres.add(35);
        textParts.push("I avoid over-the-top or loud comedy movies.");
        break;

      case "Romance-heavy films":
        avoidGenres.add(10749);
        textParts.push("I don't enjoy romance-heavy films.");
        break;

      case "Confusing plots":
        avoidKeywords.add("nonlinear");
        avoidKeywords.add("mind-bending");
        avoidKeywords.add("complex");
        avoidKeywords.add("twist");
        textParts.push("I don't like confusing or complex plots.");
        break;

      case "Supernatural themes":
        avoidGenres.add(14);
        textParts.push("I avoid supernatural or fantasy-themed movies.");
        break;

      case "Jump scares":
        avoidKeywords.add("jump scare");
        textParts.push("I dislike jump scares.");
        break;
    }
  });

  const avoidText =
    textParts.length > 0
      ? textParts.join(" ")
      : "I do not have any strong dislikes in movies.";

  return {
    avoid_genres: Array.from(avoidGenres),
    avoid_keywords: Array.from(avoidKeywords),
    avoid_styles: Array.from(avoidStyles),
    avoid_text: avoidText
  };
}

export {
  mapQ1ToRegionLanguage,
  mapQ2,
  Q3_GENRE_MAP,
  mapQ4,
  mapQ5
};
