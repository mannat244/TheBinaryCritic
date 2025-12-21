
import { getMovieData } from "@/lib/getMovieData";
import MovieClient from "./MovieClient";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const movie = await getMovieData(id);
    return {
      title: movie.title,
      description: movie.overview || `Check out ${movie.title} on The Binary Critic.`,
      openGraph: {
        title: `${movie.title} | The Binary Critic`,
        description: movie.overview,
        url: `https://thebinarycritic.in/movie/${id}`,
        siteName: "The Binary Critic",
        images: movie.backdrop_path
          ? [`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`]
          : movie.poster_path
            ? [`https://image.tmdb.org/t/p/w780${movie.poster_path}`]
            : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${movie.title} | The Binary Critic`,
        description: movie.overview,
        images: movie.backdrop_path
          ? [`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`]
          : [],
      },
    };
  } catch (error) {
    console.error("Metadata fetch failed", error);
    return {
      title: "Movie Not Found | The Binary Critic",
    };
  }
}

export default async function MoviePage({ params }) {
  const { id } = await params;
  let movieData = null;

  try {
    movieData = await getMovieData(id);
  } catch (e) {
    console.error("Failed to fetch movie data on server", e);
  }

  return <MovieClient initialData={movieData} />;
}
