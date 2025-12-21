
import { getTvData } from "@/lib/getTvData";
import TvClient from "./TvClient";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const tv = await getTvData(id);
    return {
      title: tv.name,
      description: tv.overview || `Check out ${tv.name} on The Binary Critic.`,
      openGraph: {
        title: `${tv.name} | The Binary Critic`,
        description: tv.overview,
        url: `https://thebinarycritic.in/tv/${id}`,
        siteName: "The Binary Critic",
        images: tv.backdrop_path
          ? [`https://image.tmdb.org/t/p/w780${tv.backdrop_path}`]
          : tv.poster_path
            ? [`https://image.tmdb.org/t/p/w780${tv.poster_path}`]
            : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `${tv.name} | The Binary Critic`,
        description: tv.overview,
        images: tv.backdrop_path
          ? [`https://image.tmdb.org/t/p/w780${tv.backdrop_path}`]
          : [],
      },
    };
  } catch (error) {
    console.error("Metadata fetch failed", error);
    return {
      title: "TV Show Not Found | The Binary Critic",
    };
  }
}

export default async function TvPage({ params }) {
  const { id } = await params;
  let tvData = null;

  try {
    tvData = await getTvData(id);
  } catch (e) {
    console.error("Failed to fetch tv data on server", e);
  }

  return <TvClient initialData={tvData} />;
}
