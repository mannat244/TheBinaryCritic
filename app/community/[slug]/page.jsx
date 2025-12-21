
import { getCommunityData } from "@/lib/getCommunityData";
import CommunityClient from "./CommunityClient";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const community = await getCommunityData(slug);

    if (!community) {
        return {
            title: "Community Not Found | The Binary Critic",
        };
    }

    return {
        title: community.name,
        description: community.description || `Join the conversation in ${community.name} on The Binary Critic.`,
        openGraph: {
            title: `${community.name} | The Binary Critic`,
            description: community.description,
            images: community.image ? [community.image] : [],
        },
        twitter: {
            card: community.image ? "summary_large_image" : "summary",
            title: `${community.name} | The Binary Critic`,
            description: community.description,
            images: community.image ? [community.image] : [],
        }
    };
}

export default async function CommunityPage({ params }) {
    const { slug } = await params;

    let community = null;
    try {
        community = await getCommunityData(slug);
    } catch (e) {
        console.error("Server fetch community error", e);
    }

    if (!community) {
        return notFound();
    }

    return <CommunityClient initialCommunity={community} />;
}
