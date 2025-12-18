export const ROW_CONFIG = {
  action: {
    label: "Action for You",
    genres: {
      movie: [28, 12, 53, 80, 10752],
      tv: [10759, 80, 10768],
    },
    freshnessWeight: 0.2,
    indiaBoost: true,
  },

  comedy: {
    label: "Comedy Picks",
    genres: {
      movie: [35],
      tv: [35],
    },
    freshnessWeight: 0.1,
  },

  family: {
    label: "Family & Kids",
    genres: {
      movie: [16, 10751],
      tv: [16, 10751, 10762],
    },
    safe: true,
  },

  fantasy: {
    label: "Fantasy & Sci-Fi",
    genres: {
      movie: [14, 878],
      tv: [10765],
    },
  },

  indian: {
    label: "Indian Picks",
    genres: null,
    forceIndia: true,
  },

  fresh: {
    label: "New & Trending",
    genres: null,
    freshnessOnly: true,
  },
};
