import CommunityCard from "./CommunityCard";

export default function CommunityGrid({ communities, initialJoinedIds }) {
    const joinedSet = new Set(initialJoinedIds);

    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-5 px-1">
            {communities.map((community) => (
                <CommunityCard
                    key={community._id}
                    community={community}
                    isJoined={joinedSet.has(community._id.toString())}
                />
            ))}
        </div>
    );
}
